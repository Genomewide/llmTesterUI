import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Interaction } from '../types';

interface ResponseViewerProps {
  interaction: Interaction | null;
  loading: boolean;
  error: string | null;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({
  interaction,
  loading,
  error
}) => {
  const isJsonResponse = interaction?.response && (
    interaction.response.trim().startsWith('{') || 
    interaction.response.trim().startsWith('[')
  );

  const isStructuredOutput = interaction?.structuredOutput;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!interaction) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography variant="body1" color="text.secondary">
          Run a test to see the response here
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip 
          label={`Model: ${interaction.modelName}`} 
          color="primary" 
          variant="outlined"
        />
        <Chip 
          label={`Response Time: ${interaction.responseTime}ms`} 
          color="secondary" 
          variant="outlined"
        />
        <Chip 
          label={`Length: ${interaction.response.length} chars`} 
          color="info" 
          variant="outlined"
        />
        {interaction.structuredOutput && (
          <Chip 
            label={`Format: ${interaction.outputFormat?.toUpperCase()}`} 
            color="success" 
            variant="outlined"
          />
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Response
        </Typography>
        
        {isJsonResponse || isStructuredOutput ? (
          <SyntaxHighlighter
            language="json"
            style={tomorrow}
            customStyle={{
              margin: 0,
              borderRadius: 4,
              fontSize: '14px'
            }}
          >
            {interaction.response}
          </SyntaxHighlighter>
        ) : (
          <Box
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: 1.5,
              bgcolor: 'grey.50',
              p: 2,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300'
            }}
          >
            {interaction.response}
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Metadata
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Timestamp:</strong> {interaction.timestamp.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>Model ID:</strong> {interaction.modelId}
            </Typography>
            {interaction.metadata?.temperature && (
              <Typography variant="body2">
                <strong>Temperature:</strong> {interaction.metadata.temperature}
              </Typography>
            )}
            {interaction.metadata?.maxTokens && (
              <Typography variant="body2">
                <strong>Max Tokens:</strong> {interaction.metadata.maxTokens}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ResponseViewer; 