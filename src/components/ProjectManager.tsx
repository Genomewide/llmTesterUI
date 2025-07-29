import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { Project, Interaction } from '../types';

interface ProjectManagerProps {
  projects: Project[];
  currentProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onProjectCreate: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'interactions'>) => void;
  onProjectDelete: (projectId: string) => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  currentProject,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectUpdate
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onProjectCreate({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setCreateDialogOpen(false);
    }
  };

  const handleEditProject = () => {
    if (editingProject && newProjectName.trim()) {
      onProjectUpdate(editingProject.id, {
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        updatedAt: new Date()
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setEditingProject(null);
      setEditDialogOpen(false);
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description);
    setEditDialogOpen(true);
  };

  const getLatestInteraction = (project: Project): Interaction | null => {
    if (project.interactions.length === 0) return null;
    return project.interactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          size="small"
        >
          New Project
        </Button>
      </Box>

      <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
        <List>
          {projects.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No projects yet"
                secondary="Create your first project to get started"
              />
            </ListItem>
          ) : (
            projects.map((project) => {
              const latestInteraction = getLatestInteraction(project);
              const isSelected = currentProject?.id === project.id;
              
              return (
                <React.Fragment key={project.id}>
                  <ListItem
                    button
                    selected={isSelected}
                    onClick={() => onProjectSelect(project)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        '&:hover': {
                          bgcolor: 'primary.light'
                        }
                      }
                    }}
                  >
                    <ListItemText
                      primary={project.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {project.description || 'No description'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={`${project.interactions.length} tests`} 
                              size="small" 
                              variant="outlined"
                            />
                            {latestInteraction && (
                              <Chip 
                                label={`Last: ${new Date(latestInteraction.timestamp).toLocaleDateString()}`} 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(project);
                        }}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectDelete(project.id);
                        }}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })
          )}
        </List>
      </Paper>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditProject} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManager; 