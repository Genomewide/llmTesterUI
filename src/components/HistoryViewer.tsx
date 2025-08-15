import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Compare as CompareIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { Interaction } from '../types';
import ResponseViewer from './ResponseViewer';

interface HistoryViewerProps {
  interactions: Interaction[];
  onDeleteInteraction: (interactionId: string) => void;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({
  interactions,
  onDeleteInteraction
}) => {
  const [selectedInteractions, setSelectedInteractions] = useState<Interaction[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  const handleInteractionSelect = (interaction: Interaction) => {
    if (selectedInteractions.find(i => i.id === interaction.id)) {
      setSelectedInteractions(selectedInteractions.filter(i => i.id !== interaction.id));
    } else {
      setSelectedInteractions([...selectedInteractions, interaction]);
    }
  };

  const handleCompare = () => {
    if (selectedInteractions.length === 2) {
      setCompareDialogOpen(true);
    }
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        {selectedInteractions.length === 2 && (
          <Button
            variant="contained"
            startIcon={<CompareIcon />}
            onClick={handleCompare}
            size="small"
          >
            Compare Selected
          </Button>
        )}
      </Box>

      {selectedInteractions.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
          <Typography variant="body2" color="primary.contrastText">
            {selectedInteractions.length} interaction(s) selected for comparison
          </Typography>
        </Paper>
      )}

      <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
        {sortedInteractions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No test history yet
            </Typography>
          </Box>
        ) : (
          sortedInteractions.map((interaction) => {
            const isSelected = selectedInteractions.find(i => i.id === interaction.id);
            
            return (
              <Accordion key={interaction.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">
                        {interaction.modelName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={new Date(interaction.timestamp).toLocaleString()} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${interaction.responseTime}ms`} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${interaction.response.length} chars`} 
                          size="small" 
                          variant="outlined"
                        />
                        {interaction.structuredOutput && (
                          <Chip 
                            label={interaction.outputFormat?.toUpperCase() || 'STRUCTURED'} 
                            size="small" 
                            color="success"
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInteractionSelect(interaction);
                        }}
                        color={isSelected ? 'primary' : 'default'}
                      >
                        <CompareIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteInteraction(interaction.id);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                      System Prompt
                    </Typography>
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {interaction.systemPrompt}
                      </Typography>
                    </Paper>
                    
                    <Typography variant="h6" gutterBottom>
                      User Input
                    </Typography>
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">
                        {interaction.userInput}
                      </Typography>
                    </Paper>
                    
                    <ResponseViewer
                      interaction={interaction}
                      loading={false}
                      error={null}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>

      {/* Comparison Dialog */}
      <Dialog 
        open={compareDialogOpen} 
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Compare Interactions</DialogTitle>
        <DialogContent>
          {selectedInteractions.length === 2 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedInteractions[0].modelName}
                </Typography>
                <ResponseViewer
                  interaction={selectedInteractions[0]}
                  loading={false}
                  error={null}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedInteractions[1].modelName}
                </Typography>
                <ResponseViewer
                  interaction={selectedInteractions[1]}
                  loading={false}
                  error={null}
                />
              </Box>
            </Box>
          )}
          
          {selectedInteractions.length === 2 && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Comparison Metrics
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip 
                  label={`Response Time Diff: ${Math.abs(selectedInteractions[0].responseTime - selectedInteractions[1].responseTime)}ms`} 
                  color="secondary"
                />
                <Chip 
                  label={`Length Diff: ${Math.abs(selectedInteractions[0].response.length - selectedInteractions[1].response.length)} chars`} 
                  color="info"
                />
                <Chip 
                  label={`Similarity: ${(calculateSimilarity(selectedInteractions[0].response, selectedInteractions[1].response) * 100).toFixed(1)}%`} 
                  color="primary"
                />
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryViewer; 