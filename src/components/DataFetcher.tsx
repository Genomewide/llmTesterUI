import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { DataProcessor } from '../services/data-processor';
import { ExportService } from '../services/export-service';

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
  const [result, setResult] = useState<any | null>(null);
  const [processedData, setProcessedData] = useState<any | null>(null);
  const [processingData, setProcessingData] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);

  const handleFetchData = async () => {
    if (!pk.trim()) {
      setError('Please enter a primary key');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Calling fetchArsData with:', { pk, environment });
      
      const response = await window.electronAPI.fetchArsData(pk, environment);
      
      console.log('Response received:', response);
      
      if (response.success) {
        setResult(response);
        if (onDataProcessed) {
          onDataProcessed(response.data);
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

  const handleProcessData = async () => {
    if (!result?.data) {
      setError('No data to process. Please fetch data first.');
      return;
    }

    setProcessingData(true);
    setError(null);

    try {
      console.log('Starting data processing...');
      
      const processor = new DataProcessor();
      const processed = processor.processKnowledgeGraph(result.data, pk, environment);
      
      console.log('Data processing complete:', {
        flattenedRows: processed.flattenedRows.length,
        metadata: processed.metadata
      });
      
      setProcessedData(processed);
      
      if (onDataProcessed) {
        onDataProcessed(processed);
      }
      
    } catch (error) {
      console.error('Error processing data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred during processing');
    } finally {
      setProcessingData(false);
    }
  };

  const handleExportCSV = async () => {
    if (!processedData) {
      setError('No processed data to export. Please process data first.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      console.log('Starting CSV export...');
      
      const exportService = new ExportService();
      const result = await exportService.exportToCSV(processedData, 'data/exports');
      
      if (result.success) {
        setExportResult(result);
        console.log('CSV export successful:', result.filePath);
      } else {
        setError(result.error || 'Failed to export CSV');
      }
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred during export');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!processedData) {
      setError('No processed data to export. Please process data first.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      console.log('Starting JSON export...');
      
      const exportService = new ExportService();
      const result = await exportService.exportToJSON(processedData, 'data/exports');
      
      if (result.success) {
        setExportResult(result);
        console.log('JSON export successful:', result.filePath);
      } else {
        setError(result.error || 'Failed to export JSON');
      }
      
    } catch (error) {
      console.error('Error exporting JSON:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred during export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ARS Data Fetcher
      </Typography>
      
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter a primary key to fetch data from the ARS API
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
          placeholder="Enter primary key (e.g., 992cc304-b1cd-4e9d-b317-f65effe150e1)"
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
          {loading ? 'Fetching...' : 'Fetch Data'}
        </Button>

        {result && (
          <Button
            variant="outlined"
            onClick={handleProcessData}
            disabled={processingData}
            startIcon={processingData ? <CircularProgress size={20} /> : <DownloadIcon />}
            sx={{ mt: 2 }}
            fullWidth
          >
            {processingData ? 'Processing...' : 'Process Data'}
          </Button>
        )}
      </Paper>

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`PK: ${result.pk}`} color="primary" variant="outlined" />
            <Chip label={`Environment: ${result.environment}`} color="secondary" variant="outlined" />
            <Chip label={`Status: Success`} color="success" variant="outlined" />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Data Structure:
          </Typography>
          
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '12px' }}>
            <pre>
              {JSON.stringify({
                hasFields: !!result.data.fields,
                hasData: !!result.data.fields?.data,
                hasMessage: !!result.data.fields?.data?.message,
                hasResults: !!result.data.fields?.data?.message?.results,
                hasKnowledgeGraph: !!result.data.fields?.data?.message?.knowledge_graph,
                resultsCount: result.data.fields?.data?.message?.results?.length || 0,
                nodesCount: result.data.fields?.data?.message?.knowledge_graph?.nodes ? 
                  Object.keys(result.data.fields.data.message.knowledge_graph.nodes).length : 0,
                edgesCount: result.data.fields?.data?.message?.knowledge_graph?.edges ? 
                  Object.keys(result.data.fields.data.message.knowledge_graph.edges).length : 0
              }, null, 2)}
            </pre>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Timestamp: {result.timestamp}
          </Typography>
        </Paper>
      )}

      {processedData && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Processed Data
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`Flattened Rows: ${processedData.flattenedRows.length}`} color="primary" variant="outlined" />
            <Chip label={`Results: ${processedData.metadata.resultsCount}`} color="secondary" variant="outlined" />
            <Chip label={`Nodes: ${processedData.metadata.nodesCount}`} color="info" variant="outlined" />
            <Chip label={`Edges: ${processedData.metadata.edgesCount}`} color="warning" variant="outlined" />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sample Data (first 3 rows):
          </Typography>
          
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
            <pre>
              {JSON.stringify(processedData.flattenedRows.slice(0, 3), null, 2)}
            </pre>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Processing completed at: {processedData.metadata.timestamp}
          </Typography>

          {/* Export Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExportCSV}
              disabled={exporting}
              startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              onClick={handleExportJSON}
              disabled={exporting}
              startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </Button>
          </Box>

          {exportResult && (
            <Alert severity="success" sx={{ mt: 2 }}>
              File exported successfully! 
              <br />
              <strong>Path:</strong> {exportResult.filePath}
              <br />
              <strong>Rows:</strong> {exportResult.rowCount}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default DataFetcher; 