import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton
} from '@mui/material';
import { 
  PlayArrow as PlayIcon, 
  Save as SaveIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { LLMModel, Project, Interaction, TestConfig, ProcessedData } from './types';
import { APIService } from './services/api';
import ModelSelector from './components/ModelSelector';
import PromptEditor from './components/PromptEditor';
import ResponseViewer from './components/ResponseViewer';
import ProjectManager from './components/ProjectManager';
import HistoryViewer from './components/HistoryViewer';
import DataFetcher from './components/DataFetcher';


const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  // State management
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>(`You are an expert at reading, analyzing, and summarizing biomedical information. 

Your goal is to analyze data that presents certain claims about
treatments for a disease and to create a brief, readable summary of all
the data presented. The audience for the summary are highly informed
readers--professionals, researchers, and graduate students from all
aspects of biomedicine.

The structure of a summary should be 2-4 paragraphs long, depending on the
amount of data present. It should never exceed 5 paragraphs even for very large
data sets. It must use compact prose containing appropriate technical terms.
Do not create tables; use bullets sparingly and only if essential.

A successful summary will be one that identifies patterns and commonalities in
the proposed treatment(s). Provide opinions based on the information provided and
from the available tools as to whether the proposals are strong and plausible,
or more speculative and unproven. Assume a technical audience; do not over-
explain fundamental concepts. Rely on your own knowledge when it will add
value but do not augment to the point that you are bringing in too much that
is not in the presented material--your job is primarily to summarize what is
presented.

There will be three main sections in each data set that you will analyze.
Note that the ontology being used for nodes and edges in the reasoning are
drawn from the Biolink model.

1. Query information

This section will briefly present the question being asked, which will be of
the form "What drugs may treat X" where X is a disease or a disease-like
entity. A brief description of the disease may be provided.

2. Node/Entity information

This section will provide an index of all the nodes mentioned in the data
along with their primary categories (using the Biolink model). Typically,
a CURIE will also be provided, which is a canonical identifier for that
biological entity. 

3. Edge/Reasoning information

This section will be a list of edges expressed as a triple (subject-predicate-object), 
each of which represents a specific claim in a knowledge graph. The totality of
that knowledge graph (all the edges in it) represents the reasoning that supports
the claim that drug or molecule X is a direct or indirect agent in a type of treatment
or treatment approach for the disease referenced in the first section.

The predicates in the edges are also taken from the Biolink ontology.
Note that these edges will not be in any particular order--you must
carefully analyze the totality of the graph (i.e. all edges) for each result
and determine the transitive relationships between them to fully understand
the proposed mechanism of treatment.

You will either be provide with the 3 most recent publication abstracts or all of the abstracts for an edge. 
Don't assume that the presence of those IDs means they are all relevant.
In particular, if your knowledge tells you that the claim seems suspect, you MUST investigate the abstracts.
**DO NOT RELY ON YOUR INTERNAL KNOWLEDGE, IF PRESENT, OF THE CONTENTS OF
PAPERS BASED ON PUBLICATION IDS** Always consult the abstract if you
are going to reference the paper.

In conclusion: work hard to identify patterns and exceptions. Think of your
summary as the opening to a literature review, where you are providing a guide
to the most important and interesting aspects of a large amount of information
on a focused topic. Use all the tools provided and work very hard to explore
and explain all of the various patterns and mechanisms within that result.
Provide references to the consulted abstracts wherever possible.`);
  const [userInput, setUserInput] = useState<string>('');
  const [structuredOutput, setStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('json');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null);
  
  // Project management
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Data import state
  const [importedData, setImportedData] = useState<ProcessedData | null>(null);
  
  // Abstract state
  const [includeAbstracts, setIncludeAbstracts] = useState<boolean>(false);
  const [abstractLimit, setAbstractLimit] = useState<number | null>(null);
  // const [abstractFetching, setAbstractFetching] = useState<boolean>(false);
  
  // Track currently selected subject for auto-refresh
  const [selectedSubjectNode, setSelectedSubjectNode] = useState<string | null>(null);
  
  // Streaming state
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  

  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  
  // Collapsible sidebar state
  const [projectsCollapsed, setProjectsCollapsed] = useState<boolean>(false);
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  const [modelSelectionVisible, setModelSelectionVisible] = useState<boolean>(false);

  const loadModels = async () => {
    try {
      const availableModels = await APIService.getAvailableModels();
      setModels(availableModels);
    } catch (error) {
      setError('Failed to load models');
      console.error('Error loading models:', error);
    }
  };

  const loadProjects = useCallback(async () => {
    try {
      const savedProjects = await APIService.loadProjects();
      setProjects(savedProjects);
      
      // Auto-select the first project if no current project is selected
      if (savedProjects.length > 0 && !currentProject) {
        setCurrentProject(savedProjects[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, [currentProject]);

  // Load models and projects on component mount
  useEffect(() => {
    loadModels();
    loadProjects();
  }, [loadProjects]);

  // Set first model as selected when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  // Set first project as selected when projects load
  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject]);

  const handleTestModel = async () => {
    if (!selectedModel || !userInput.trim()) {
      setError('Please select a model and enter some input text');
      return;
    }

    if (!currentProject) {
      setError('Please select or create a project first');
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setStreamingResponse('');
    setStreamingError(null);
    setError(null);

    try {
      const config: TestConfig = {
        modelId: selectedModel,
        systemPrompt,
        userInput,
        structuredOutput,
        outputFormat: structuredOutput ? outputFormat : undefined
      };

      // Pass progress callback for streaming
      const interaction = await APIService.testModel(config, (chunk: string) => {
        setStreamingResponse(prev => prev + chunk);
      });
      
      setCurrentInteraction(interaction);
      setIsStreaming(false);
      setStreamingResponse('');

      // Add interaction to current project
      const updatedProject = {
        ...currentProject,
        interactions: [...currentProject.interactions, interaction],
        updatedAt: new Date()
      };
      
      setCurrentProject(updatedProject);
      setProjects(projects.map(p => 
        p.id === currentProject.id ? updatedProject : p
      ));

      // Save updated project
      await APIService.saveProject(updatedProject);

      setSnackbarMessage('Test completed successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      setError('Failed to test model. Please try again.');
      setStreamingError('Streaming failed. Please try again.');
      console.error('Error testing model:', error);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleProjectCreate = (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'interactions'>) => {
    const newProject: Project = {
      id: uuidv4(),
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date(),
      interactions: []
    };

    setProjects([...projects, newProject]);
    setCurrentProject(newProject);
    // Clear user input when creating new project, but keep imported data
    setUserInput('');
    // Reset streaming state when creating new project
    setIsStreaming(false);
    setStreamingResponse('');
    setStreamingError(null);
    APIService.saveProject(newProject);
    
    setSnackbarMessage('Project created successfully!');
    setSnackbarOpen(true);
  };

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    // Clear user input when switching projects, but keep imported data
    setUserInput('');
    // Reset streaming state when switching projects
    setIsStreaming(false);
    setStreamingResponse('');
    setStreamingError(null);
  };

  const handleProjectDelete = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
    }
    
    // In production, this would delete from backend
    localStorage.setItem('llmTesterProjects', JSON.stringify(updatedProjects));
    
    setSnackbarMessage('Project deleted successfully!');
    setSnackbarOpen(true);
  };

  const handleProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    );
    setProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject({ ...currentProject, ...updates });
    }
    
    // In production, this would update in backend
    localStorage.setItem('llmTesterProjects', JSON.stringify(updatedProjects));
    
    setSnackbarMessage('Project updated successfully!');
    setSnackbarOpen(true);
  };

  const handleDeleteInteraction = (interactionId: string) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      interactions: currentProject.interactions.filter(i => i.id !== interactionId),
      updatedAt: new Date()
    };

    setCurrentProject(updatedProject);
    setProjects(projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ));

    // In production, this would delete from backend
    localStorage.setItem('llmTesterProjects', JSON.stringify(projects));
    
    setSnackbarMessage('Interaction deleted successfully!');
    setSnackbarOpen(true);
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              LLM Tester UI
            </Typography>
            {currentProject && (
              <Typography variant="body2" sx={{ mr: 2 }}>
                Project: {currentProject.name}
              </Typography>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Left Sidebar - Projects and History */}
            <Grid item xs={12} md={sidebarCollapsed ? 1 : 4}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                transition: 'all 0.3s ease-in-out',
                width: sidebarCollapsed ? 60 : '100%'
              }}>
                {/* Sidebar Toggle Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    sx={{ 
                      transition: 'transform 0.2s',
                      bgcolor: 'background.paper',
                      boxShadow: 1
                    }}
                  >
                    {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                </Box>

                {/* Projects Section */}
                <Paper sx={{ 
                  p: sidebarCollapsed ? 1 : 2, 
                  height: 'fit-content',
                  minHeight: sidebarCollapsed ? 200 : 'auto'
                }}>
                  {!sidebarCollapsed && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Projects
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setProjectsCollapsed(!projectsCollapsed)}
                        sx={{ transform: projectsCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  )}
                  
                  {sidebarCollapsed ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="large"
                        onClick={() => setSidebarCollapsed(false)}
                        title="Projects"
                        sx={{ color: 'primary.main' }}
                      >
                        <FolderIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                        Projects
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      maxHeight: projectsCollapsed ? 0 : 'none',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease-in-out'
                    }}>
                      <ProjectManager
                        projects={projects}
                        currentProject={currentProject}
                        onProjectSelect={handleProjectSelect}
                        onProjectCreate={handleProjectCreate}
                        onProjectDelete={handleProjectDelete}
                        onProjectUpdate={handleProjectUpdate}
                      />
                    </Box>
                  )}
                </Paper>
                
                {/* History Section */}
                <Paper sx={{ 
                  p: sidebarCollapsed ? 1 : 2, 
                  height: 'fit-content',
                  minHeight: sidebarCollapsed ? 200 : 'auto'
                }}>
                  {!sidebarCollapsed && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Test History
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setHistoryCollapsed(!historyCollapsed)}
                        sx={{ transform: historyCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  )}
                  
                  {sidebarCollapsed ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="large"
                        onClick={() => setSidebarCollapsed(false)}
                        title="Test History"
                        sx={{ color: 'primary.main' }}
                      >
                        <HistoryIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                        History
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      maxHeight: historyCollapsed ? 0 : 600,
                      overflow: 'auto',
                      transition: 'max-height 0.3s ease-in-out'
                    }}>
                      <HistoryViewer
                        interactions={currentProject?.interactions || []}
                        onDeleteInteraction={handleDeleteInteraction}
                      />
                    </Box>
                  )}
                </Paper>
              </Box>
            </Grid>

            {/* Main Content */}
            <Grid item xs={12} md={sidebarCollapsed ? 11 : 8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h4">
                    LLM Model Tester
                  </Typography>
                  <IconButton
                    onClick={() => setModelSelectionVisible(!modelSelectionVisible)}
                    sx={{ 
                      color: modelSelectionVisible ? 'primary.main' : 'text.secondary',
                      transition: 'color 0.2s'
                    }}
                    title="Model Settings"
                  >
                    <SettingsIcon />
                  </IconButton>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  {/* Model Selection */}
                  {modelSelectionVisible && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Model Selection
                      </Typography>
                      <ModelSelector
                        models={models}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        loading={loading || isStreaming}
                      />
                    </Grid>
                  )}

                  {/* Prompt Editor */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Test Configuration
                    </Typography>
                    <PromptEditor
                      systemPrompt={systemPrompt}
                      userInput={userInput}
                      structuredOutput={structuredOutput}
                      outputFormat={outputFormat}
                      onSystemPromptChange={setSystemPrompt}
                      onUserInputChange={setUserInput}
                      onStructuredOutputChange={setStructuredOutput}
                      onOutputFormatChange={setOutputFormat}
                      supportsStructuredOutput={selectedModelData?.supportsStructuredOutput || false}
                      loading={loading || isStreaming}
                      importedData={importedData}
                      includeAbstracts={includeAbstracts}
                      abstractLimit={abstractLimit || undefined}
                      onAbstractOptionsChange={(include, limit) => {
                        setIncludeAbstracts(include);
                        setAbstractLimit(limit || null);
                        
                        // Auto-refresh data formatting if a subject is currently selected
                        if (selectedSubjectNode && importedData) {
                          console.log('🔄 Auto-refreshing data with new abstract settings:', { include, limit });
                          
                          // Filter data for the currently selected subject
                          const filteredData = importedData.flattenedRows.filter(
                            row => row.result_subjectNode_name === selectedSubjectNode
                          );
                          
                          if (filteredData.length > 0) {
                            // If abstracts are requested, we need to fetch them
                            if (include) {
                              // For now, just re-format without abstracts since fetching would require async operation
                              // In a full implementation, this would trigger abstract fetching
                              console.log('📝 Re-formatting data with abstract settings (abstracts will be fetched on next selection)');
                              setSnackbarMessage(`Abstract settings updated. Select the subject again to fetch ${limit ? `top ${limit} recent` : 'all'} abstracts.`);
                            } else {
                              // No abstracts requested, just re-format
                              console.log('📝 Re-formatting data without abstracts');
                              setSnackbarMessage('Data refreshed without abstracts!');
                            }
                            setSnackbarOpen(true);
                          }
                        }
                      }}
                      onSubjectSelected={(subject) => {
                        setSelectedSubjectNode(subject);
                        console.log('Subject node selected:', subject);
                      }}
                    />
                  </Grid>

                  {/* Test Button */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<PlayIcon />}
                        onClick={handleTestModel}
                        disabled={loading || !selectedModel || !userInput.trim() || !currentProject}
                      >
                        {loading ? (isStreaming ? 'Generating...' : 'Testing...') : 'Run Test'}
                      </Button>
                      
                      {currentProject && (
                        <Button
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          disabled={!currentInteraction}
                        >
                          Save to Project
                        </Button>
                      )}
                    </Box>
                  </Grid>

                  {/* Response Viewer */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Response
                    </Typography>
                    <ResponseViewer
                      interaction={currentInteraction}
                      loading={loading}
                      error={error}
                      streamingResponse={streamingResponse}
                      isStreaming={isStreaming}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Data Fetcher Section */}
              <Paper sx={{ p: 3, mt: 3 }}>
                <DataFetcher
                  onDataProcessed={(data) => {
                    console.log('Data processed:', data);
                    setImportedData(data);
                    setSnackbarMessage('Data imported successfully!');
                    setSnackbarOpen(true);
                  }}
                  onFileGenerated={(filePath) => {
                    console.log('File generated:', filePath);
                    // TODO: Add to project files
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App; 