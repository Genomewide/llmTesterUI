import React, { useState, useEffect } from 'react';
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
  createTheme
} from '@mui/material';
import { PlayArrow as PlayIcon, Save as SaveIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { LLMModel, Project, Interaction, TestConfig } from './types';
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
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful AI assistant.');
  const [userInput, setUserInput] = useState<string>('');
  const [structuredOutput, setStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('json');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null);
  
  // Project management
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Load models and projects on component mount
  useEffect(() => {
    loadModels();
    loadProjects();
  }, []);

  // Set first model as selected when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const loadModels = async () => {
    try {
      const availableModels = await APIService.getAvailableModels();
      setModels(availableModels);
    } catch (error) {
      setError('Failed to load models');
      console.error('Error loading models:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const savedProjects = await APIService.loadProjects();
      setProjects(savedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

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
    setError(null);

    try {
      const config: TestConfig = {
        modelId: selectedModel,
        systemPrompt,
        userInput,
        structuredOutput,
        outputFormat: structuredOutput ? outputFormat : undefined
      };

      const interaction = await APIService.testModel(config);
      setCurrentInteraction(interaction);

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
      console.error('Error testing model:', error);
    } finally {
      setLoading(false);
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
    APIService.saveProject(newProject);
    
    setSnackbarMessage('Project created successfully!');
    setSnackbarOpen(true);
  };

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
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
            {/* Left Sidebar - Projects */}
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <ProjectManager
                  projects={projects}
                  currentProject={currentProject}
                  onProjectSelect={handleProjectSelect}
                  onProjectCreate={handleProjectCreate}
                  onProjectDelete={handleProjectDelete}
                  onProjectUpdate={handleProjectUpdate}
                />
              </Paper>
            </Grid>

            {/* Main Content */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                  LLM Model Tester
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  {/* Model Selection */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Model Selection
                    </Typography>
                    <ModelSelector
                      models={models}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      loading={loading}
                    />
                  </Grid>

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
                      loading={loading}
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
                        {loading ? 'Testing...' : 'Run Test'}
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
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Data Fetcher Section */}
              <Paper sx={{ p: 3, mt: 3 }}>
                <DataFetcher
                  onDataProcessed={(data) => {
                    console.log('Data processed:', data);
                    // TODO: Integrate with project system
                  }}
                  onFileGenerated={(filePath) => {
                    console.log('File generated:', filePath);
                    // TODO: Add to project files
                  }}
                />
              </Paper>
            </Grid>

            {/* Right Sidebar - History */}
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <HistoryViewer
                  interactions={currentProject?.interactions || []}
                  onDeleteInteraction={handleDeleteInteraction}
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