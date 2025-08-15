import React, { useState } from 'react';
import {
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  Alert,
  IconButton,
  Collapse
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import SubjectNodeSelector from './SubjectNodeSelector';
import { ProcessedData } from '../types';

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
  importedData?: ProcessedData | null;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  onAbstractOptionsChange?: (include: boolean, limit?: number) => void;
  onSubjectSelected?: (subject: string) => void;
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
  loading = false,
  importedData = null,
  includeAbstracts = false,
  abstractLimit,
  onAbstractOptionsChange,
  onSubjectSelected
}) => {
  const [abstractSelection, setAbstractSelection] = useState<'none' | 'all' | 'recent'>('none');
  const [systemPromptExpanded, setSystemPromptExpanded] = useState<boolean>(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            System Prompt
          </Typography>
          <IconButton
            size="small"
            onClick={() => setSystemPromptExpanded(!systemPromptExpanded)}
            sx={{ 
              transform: systemPromptExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
        <Box sx={{ position: 'relative' }}>
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Enter the system prompt that defines the AI's behavior..."
            disabled={loading}
            rows={systemPromptExpanded ? 16 : 8}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '16.5px 14px',
              border: '1px solid rgba(0, 0, 0, 0.23)',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '1rem',
              resize: 'both',
              overflow: 'auto',
              transition: 'all 0.3s ease-in-out',
              backgroundColor: loading ? 'rgba(0, 0, 0, 0.12)' : 'transparent',
              color: loading ? 'rgba(0, 0, 0, 0.38)' : 'inherit'
            }}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          User Input
        </Typography>
        
        {/* Data Selector - only show when data is available */}
        {importedData && (
          <>
            <SubjectNodeSelector
              data={importedData}
              onSubjectSelect={(formattedData, selectedSubject) => {
                onUserInputChange(formattedData);
                // Track the selected subject for auto-refresh functionality
                if (selectedSubject && onSubjectSelected) {
                  onSubjectSelected(selectedSubject);
                }
              }}
              disabled={loading}
              includeAbstracts={includeAbstracts}
              abstractLimit={abstractLimit}
              placeholder="Select a subject node to populate input..."
              label="Data Selector"
            />
            
            {/* Abstract Options */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Abstract Options
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup 
                  value={abstractSelection} 
                  onChange={(e) => {
                    const value = e.target.value as 'none' | 'all' | 'recent';
                    setAbstractSelection(value);
                    if (onAbstractOptionsChange) {
                      const shouldInclude = value !== 'none';
                      const limit = value === 'recent' ? (abstractLimit || 3) : undefined;
                      onAbstractOptionsChange(shouldInclude, limit);
                    }
                  }}
                >
                  <FormControlLabel value="none" control={<Radio />} label="No Abstracts" />
                  <FormControlLabel value="all" control={<Radio />} label="All Abstracts" />
                  <FormControlLabel value="recent" control={<Radio />} label="Top 3 Most Recent" />
                </RadioGroup>
                {abstractSelection !== 'none' && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Note: PubMed API has a rate limit of 3 requests per second. Abstracts will be fetched when you select a subject.
                  </Alert>
                )}
              </FormControl>
            </Box>
          </>
        )}
        
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