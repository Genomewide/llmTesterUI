const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { pipeline } = require('stream');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const csv = require('csv-parser');
const yaml = require('js-yaml');
const xml2js = require('xml2js');
const axios = require('axios');

// PubMed API configuration
const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const RATE_LIMIT_DELAY = 350; // 350ms between requests (allows max 3 requests/second)

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'favicon.ico')
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(startUrl);

  // Always open DevTools for debugging (remove this line in production)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Data storage directory
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(PROJECTS_DIR);
fs.ensureDirSync(UPLOADS_DIR);

// IPC Handlers for file operations

// Load projects from file system
ipcMain.handle('load-projects', async () => {
  try {
    const projectsFile = path.join(PROJECTS_DIR, 'projects.json');
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile);
      return data.map(project => ({
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        interactions: project.interactions.map(interaction => ({
          ...interaction,
          timestamp: new Date(interaction.timestamp)
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
});

// Save project to file system
ipcMain.handle('save-project', async (event, project) => {
  try {
    const projectsFile = path.join(PROJECTS_DIR, 'projects.json');
    let projects = [];
    
    if (await fs.pathExists(projectsFile)) {
      projects = await fs.readJson(projectsFile);
    }
    
    // Update or add project
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    await fs.writeJson(projectsFile, projects, { spaces: 2 });
    return { success: true };
  } catch (error) {
    console.error('Error saving project:', error);
    return { success: false, error: error.message };
  }
});

// Delete project
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    const projectsFile = path.join(PROJECTS_DIR, 'projects.json');
    let projects = await fs.readJson(projectsFile);
    projects = projects.filter(p => p.id !== projectId);
    await fs.writeJson(projectsFile, projects, { spaces: 2 });
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
});

// File upload and processing
ipcMain.handle('select-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'YAML Files', extensions: ['yml', 'yaml'] },
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePath: result.filePaths[0] };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Process large JSON file in chunks
ipcMain.handle('process-large-file', async (event, filePath, projectId) => {
  try {
    const fileName = path.basename(filePath);
    const uploadPath = path.join(UPLOADS_DIR, `${projectId}_${fileName}`);
    
    // Copy file to uploads directory
    await fs.copy(filePath, uploadPath);
    
    // Get file info
    const stats = await fs.stat(uploadPath);
    const fileSize = stats.size;
    
    // Process based on file type
    const ext = path.extname(filePath).toLowerCase();
    let data = null;
    let metadata = { fileSize, fileName, uploadPath };
    
    switch (ext) {
      case '.json':
        data = await processJsonFile(uploadPath);
        break;
      case '.csv':
        data = await processCsvFile(uploadPath);
        break;
      case '.yml':
      case '.yaml':
        data = await processYamlFile(uploadPath);
        break;
      case '.xml':
        data = await processXmlFile(uploadPath);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
    
    return {
      success: true,
      data,
      metadata,
      recordCount: Array.isArray(data) ? data.length : 1
    };
  } catch (error) {
    console.error('Error processing file:', error);
    return { success: false, error: error.message };
  }
});

// Process JSON file with streaming for large files
async function processJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const pipeline = require('stream').pipeline;
    
    pipeline(
      fs.createReadStream(filePath),
      parser(),
      streamArray(),
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    ).on('data', (data) => {
      results.push(data.value);
    });
  });
}

// Process CSV file
async function processCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Process YAML file
async function processYamlFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return yaml.load(content);
}

// Process XML file
async function processXmlFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const parser = new xml2js.Parser();
  return parser.parseStringPromise(content);
}

// Get file preview (first few records)
ipcMain.handle('get-file-preview', async (event, filePath, maxRecords = 10) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let data = null;
    
    switch (ext) {
      case '.json':
        data = await getJsonPreview(filePath, maxRecords);
        break;
      case '.csv':
        data = await getCsvPreview(filePath, maxRecords);
        break;
      default:
        throw new Error(`Preview not supported for: ${ext}`);
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function getJsonPreview(filePath, maxRecords) {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    
    fs.createReadStream(filePath)
      .pipe(parser())
      .pipe(streamArray())
      .on('data', (data) => {
        if (count < maxRecords) {
          results.push(data.value);
          count++;
        } else {
          this.destroy(); // Stop reading
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function getCsvPreview(filePath, maxRecords) {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (count < maxRecords) {
          results.push(data);
          count++;
        } else {
          this.destroy(); // Stop reading
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Export project data
ipcMain.handle('export-project', async (event, project, format = 'json') => {
  try {
    const fileName = `${project.name}_${new Date().toISOString().split('T')[0]}.${format}`;
    const exportPath = path.join(DATA_DIR, 'exports', fileName);
    
    await fs.ensureDir(path.dirname(exportPath));
    
    switch (format) {
      case 'json':
        await fs.writeJson(exportPath, project, { spaces: 2 });
        break;
      case 'csv':
        // Convert interactions to CSV
        const csvData = project.interactions.map(i => ({
          timestamp: i.timestamp,
          modelName: i.modelName,
          responseTime: i.responseTime,
          responseLength: i.response.length
        }));
        // Implementation for CSV export
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return { success: true, filePath: exportPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ARS API handlers
ipcMain.handle('fetch-ars-data', async (event, pk, environment = 'prod') => {
  try {
    console.log(`Fetching ARS data for PK: ${pk}, Environment: ${environment}`);
    
    // Environment URL mapping
    const ARS_ENVIRONMENTS = {
      test: 'https://ars.test.transltr.io',
      CI: 'https://ars.ci.transltr.io',
      dev: 'https://ars-dev.transltr.io',
      prod: 'https://ars-prod.transltr.io'
    };
    
    const baseUrl = ARS_ENVIRONMENTS[environment] || ARS_ENVIRONMENTS.prod;
    
    // Fetch initial message
    const response = await axios.get(`${baseUrl}/ars/api/messages/${pk}?trace=y`);
    const data = response.data;
    
    console.log('Initial API response received:', {
      status: response.status,
      hasFields: !!data.fields,
      hasData: !!data.fields?.data
    });
    
    // Get merged version if available
    let mergedData = null;
    if (data.merged_version) {
      console.log(`Fetching merged version: ${data.merged_version}`);
      const mergedResponse = await axios.get(`${baseUrl}/ars/api/messages/${data.merged_version}`);
      mergedData = mergedResponse.data;
      
      console.log('Merged API response received:', {
        status: mergedResponse.status,
        hasFields: !!mergedData.fields,
        hasData: !!mergedData.fields?.data
      });
    }
    
    return {
      success: true,
      data: mergedData || data,
      pk: pk,
      environment: environment,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in fetch-ars-data:', error);
    return {
      success: false,
      error: error.message,
      pk: pk,
      environment: environment
    };
  }
});

// File export handlers
ipcMain.handle('save-csv-file', async (event, filePath, content) => {
  try {
    console.log(`Saving CSV file: ${filePath}`);
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    // Write the CSV content
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`CSV file saved successfully: ${filePath}`);
    
    return {
      success: true,
      filePath: filePath
    };
  } catch (error) {
    console.error('Error saving CSV file:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('save-json-file', async (event, filePath, content) => {
  try {
    console.log(`Saving JSON file: ${filePath}`);
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    // Write the JSON content
    await fs.writeJson(filePath, content, { spaces: 2 });
    
    console.log(`JSON file saved successfully: ${filePath}`);
    
    return {
      success: true,
      filePath: filePath
    };
  } catch (error) {
    console.error('Error saving JSON file:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// PubMed API handlers
ipcMain.handle('fetch-pubmed-metadata', async (event, pubmedIds) => {
  try {
    console.log('🔬 Fetching PubMed metadata for', pubmedIds.length, 'IDs:', pubmedIds);
    
    const results = [];
    
    // Process in batches of 10 to respect rate limits
    for (let i = 0; i < pubmedIds.length; i += 10) {
      const batch = pubmedIds.slice(i, i + 10);
      console.log('🌐 API Call: Fetching metadata for batch:', batch);
      
      const idList = batch.join(',');
      const params = new URLSearchParams({
        db: 'pubmed',
        id: idList,
        retmode: 'xml',
        rettype: 'abstract',
        tool: 'llmTesterUI',
        email: 'user@example.com'
      });

      const response = await axios.get(`${PUBMED_BASE_URL}esummary.fcgi?${params}`);
      
      if (response.status !== 200) {
        if (response.status === 429) {
          throw new Error('PubMed API rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`PubMed API error: ${response.status}`);
      }

      const batchResults = parseMetadataFromXML(response.data, batch);
      results.push(...batchResults);
      
      console.log('📊 Metadata batch completed, parsed', batchResults.length, 'results');
      
      // Rate limiting
      if (i + 10 < pubmedIds.length) {
        console.log('⏳ Rate limiting delay...');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }
    
    console.log('✅ PubMed metadata fetching completed, total results:', results.length);
    return { success: true, data: results };
  } catch (error) {
    console.error('❌ Error fetching PubMed metadata:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fetch-pubmed-abstracts', async (event, pubmedIds) => {
  try {
    console.log('📄 Fetching PubMed abstracts for', pubmedIds.length, 'IDs:', pubmedIds);
    
    const results = [];
    
    // Process in batches of 10 to respect rate limits
    for (let i = 0; i < pubmedIds.length; i += 10) {
      const batch = pubmedIds.slice(i, i + 10);
      console.log('🌐 API Call: Fetching abstracts for batch:', batch);
      
      const idList = batch.join(',');
      const params = new URLSearchParams({
        db: 'pubmed',
        id: idList,
        retmode: 'xml',
        rettype: 'abstract',
        tool: 'llmTesterUI',
        email: 'user@example.com'
      });

      const response = await axios.get(`${PUBMED_BASE_URL}efetch.fcgi?${params}`);
      
      if (response.status !== 200) {
        if (response.status === 429) {
          throw new Error('PubMed API rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`PubMed API error: ${response.status}`);
      }

      const batchResults = parseAbstractsFromXML(response.data, batch);
      results.push(...batchResults);
      
      console.log('📊 Abstracts batch completed, parsed', batchResults.length, 'results');
      
      // Rate limiting
      if (i + 10 < pubmedIds.length) {
        console.log('⏳ Rate limiting delay...');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }
    
    console.log('✅ PubMed abstracts fetching completed, total results:', results.length);
    return { success: true, data: results };
  } catch (error) {
    console.error('❌ Error fetching PubMed abstracts:', error);
    return { success: false, error: error.message };
  }
});

// Helper functions for parsing PubMed XML responses
function parseMetadataFromXML(xmlData, pubmedIds) {
  const results = [];
  
  // Simple XML parsing (in production, use a proper XML parser)
  const docSumRegex = /<DocSum>([\s\S]*?)<\/DocSum>/g;
  let match;
  
  while ((match = docSumRegex.exec(xmlData)) !== null) {
    const docSum = match[1];
    
    // Extract ID
    const idMatch = docSum.match(/<Id>(\d+)<\/Id>/);
    if (!idMatch) continue;
    
    const pubmedId = idMatch[1];
    
    // Extract title
    const titleMatch = docSum.match(/<Item Name="Title" Type="String">([^<]+)<\/Item>/);
    const title = titleMatch ? titleMatch[1] : 'Unknown Title';
    
    // Extract journal
    const journalMatch = docSum.match(/<Item Name="FullJournalName" Type="String">([^<]+)<\/Item>/);
    const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
    
    // Extract publication date
    const dateMatch = docSum.match(/<Item Name="PubDate" Type="String">([^<]+)<\/Item>/);
    const publicationDate = dateMatch ? dateMatch[1] : new Date().toISOString();
    
    results.push({
      pubmedId,
      title,
      journal,
      publicationDate
    });
  }
  
  return results;
}

function parseAbstractsFromXML(xmlData, pubmedIds) {
  const results = [];
  
  // Simple XML parsing (in production, use a proper XML parser)
  const pubmedArticleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;
  
  while ((match = pubmedArticleRegex.exec(xmlData)) !== null) {
    const article = match[1];
    
    // Extract PMID
    const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    
    const pubmedId = pmidMatch[1];
    
    // Extract title
    const titleMatch = article.match(/<ArticleTitle[^>]*>([^<]+)<\/ArticleTitle>/);
    const title = titleMatch ? titleMatch[1] : 'Unknown Title';
    
    // Extract journal
    const journalMatch = article.match(/<Journal>[\s\S]*?<Title>([^<]+)<\/Title>/);
    const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
    
    // Extract publication date
    const yearMatch = article.match(/<PubDate>[\s\S]*?<Year>(\d+)<\/Year>/);
    const monthMatch = article.match(/<PubDate>[\s\S]*?<Month>(\d+)<\/Month>/);
    const dayMatch = article.match(/<PubDate>[\s\S]*?<Day>(\d+)<\/Day>/);
    
    let publicationDate = new Date().toISOString();
    if (yearMatch) {
      const year = yearMatch[1];
      const month = monthMatch ? monthMatch[1] : '01';
      const day = dayMatch ? dayMatch[1] : '01';
      publicationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
    }
    
    // Extract abstract
    const abstractMatch = article.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
    const abstract = abstractMatch ? abstractMatch[1] : 'No abstract available';
    
    results.push({
      pubmedId,
      title,
      journal,
      publicationDate,
      abstract
    });
  }
  
  return results;
}