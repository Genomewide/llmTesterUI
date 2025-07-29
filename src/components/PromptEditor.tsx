import React from 'react';
import {
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

interface PromptEditorProps {
  systemPrompt: string;
  userInput: string;
  structuredOutput: boolean;
  outputFormat: string;
  onSystemPromptChange: (prompt: string) => void;
  onUserInputChange: (input: string) => void;
  onStructuredOutputChange: (enabled: boolean) => void;
  onOutputFormatChange: (format: string) => void;
  supportsStructuredOutput: boolean;
  loading?: boolean;
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  systemPrompt,
  userInput,
  structuredOutput,
  outputFormat,
  onSystemPromptChange,
  onUserInputChange,
  onStructuredOutputChange,
  onOutputFormatChange,
  supportsStructuredOutput,
  loading = false
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" gutterBottom>
          System Prompt
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="Enter the system prompt that defines the AI's behavior..."
          disabled={loading}
          variant="outlined"
        />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          User Input
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          value={userInput}
          onChange={(e) => onUserInputChange(e.target.value)}
          placeholder="Enter the text you want to process..."
          disabled={loading}
          variant="outlined"
        />
      </Box>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={structuredOutput}
              onChange={(e) => onStructuredOutputChange(e.target.checked)}
              disabled={!supportsStructuredOutput || loading}
            />
          }
          label="Request Structured Output"
        />
        
        {structuredOutput && supportsStructuredOutput && (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Output Format</InputLabel>
              <Select
                value={outputFormat}
                label="Output Format"
                onChange={(e) => onOutputFormatChange(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="xml">XML</MenuItem>
                <MenuItem value="yaml">YAML</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
        
        {!supportsStructuredOutput && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This model doesn't support structured output
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PromptEditor; 