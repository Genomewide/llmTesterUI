import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { LLMModel } from '../types';

interface ModelSelectorProps {
  models: LLMModel[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  loading?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  loading = false
}) => {
  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <Box>
      <FormControl fullWidth disabled={loading}>
        <InputLabel id="model-select-label">Select Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={selectedModel}
          label="Select Model"
          onChange={(e) => onModelChange(e.target.value)}
        >
          {models.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body1">{model.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={model.provider} 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                  />
                  {model.supportsStructuredOutput && (
                    <Chip 
                      label="Structured Output" 
                      size="small" 
                      variant="outlined" 
                      color="success"
                    />
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedModelData && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Model Details
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`Provider: ${selectedModelData.provider}`} size="small" />
            <Chip label={`Max Tokens: ${selectedModelData.maxTokens || 'N/A'}`} size="small" />
            <Chip label={`Temperature: ${selectedModelData.temperature || 'N/A'}`} size="small" />
            <Chip 
              label={selectedModelData.supportsStructuredOutput ? 'Supports JSON' : 'Text Only'} 
              size="small" 
              color={selectedModelData.supportsStructuredOutput ? 'success' : 'default'}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ModelSelector; 