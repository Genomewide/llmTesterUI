const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { pipeline } = require('stream');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const csv = require('csv-parser');
const yaml = require('js-yaml');
const xml2js = require('xml2js');

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

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