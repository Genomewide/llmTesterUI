import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { DataProcessor } from '../services/data-processor';

interface DataFetcherProps {
  onDataProcessed?: (data: any) => void;
  onFileGenerated?: (filePath: string) => void;
}

const DataFetcher: React.FC<DataFetcherProps> = ({
  onDataProcessed,
  onFileGenerated
}) => {
  const [pk, setPk] = useState('b724bec6-e952-4c0e-bd14-e6330a9b8ef3');
  const [environment, setEnvironment] = useState('prod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<any | null>(null);

  const handleFetchData = async () => {
    if (!pk.trim()) {
      setError('Please enter a primary key');
      return;
    }

    setLoading(true);
    setError(null);
    setProcessedData(null);

    try {
      console.log('Calling fetchArsData with:', { pk, environment });
      
      const response = await window.electronAPI.fetchArsData(pk, environment);
      
      console.log('Response received:', response);
      
      if (response.success) {
        // Process the data using our DataProcessor
        const processor = new DataProcessor();
        const processed = processor.processKnowledgeGraph(response.data, pk, environment);
        
        setProcessedData(processed);
        
        if (onDataProcessed) {
          onDataProcessed(processed);
        }
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error in handleFetchData:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a primary key to fetch and process data from the ARS API
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Primary Key"
        value={pk}
        onChange={(e) => setPk(e.target.value)}
        fullWidth
        margin="normal"
        placeholder="Enter primary key (e.g., b724bec6-e952-4c0e-bd14-e6330a9b8ef3)"
        disabled={loading}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Environment</InputLabel>
        <Select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          disabled={loading}
          label="Environment"
        >
          <MenuItem value="test">Test</MenuItem>
          <MenuItem value="CI">CI</MenuItem>
          <MenuItem value="dev">Dev</MenuItem>
          <MenuItem value="prod">Production</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleFetchData}
        disabled={loading || !pk.trim()}
        startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
        sx={{ mt: 2 }}
        fullWidth
      >
        {loading ? 'Processing...' : 'Fetch & Process Data'}
      </Button>

      {processedData && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Processed Data (First 5 Results)
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total rows processed: {processedData.flattenedRows.length}
          </Typography>
          
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
            <pre>
              {JSON.stringify(processedData.flattenedRows.slice(0, 5), null, 2)}
            </pre>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DataFetcher; 