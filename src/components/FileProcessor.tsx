import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Preview as PreviewIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { APIService } from '../services/api';
import { UploadedFile, DataSubset, DataFilter } from '../types';

interface FileProcessorProps {
  projectId: string;
  onFileUploaded: (file: UploadedFile) => void;
  onSubsetCreated: (subset: DataSubset) => void;
}

const FileProcessor: React.FC<FileProcessorProps> = ({
  projectId,
  onFileUploaded,
  onSubsetCreated
}) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<any[] | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [subsetDialogOpen, setSubsetDialogOpen] = useState(false);
  const [subsetName, setSubsetName] = useState('');
  const [subsetDescription, setSubsetDescription] = useState('');
  const [filters, setFilters] = useState<DataFilter[]>([]);
  const [filterField, setFilterField] = useState('');
  const [filterOperator, setFilterOperator] = useState<'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'>('equals');
  const [filterValue, setFilterValue] = useState('');

  const handleFileSelect = async () => {
    try {
      setError(null);
      const result = await APIService.selectFile();
      
      if (result.success && result.filePath) {
        setSelectedFile(result.filePath);
        
        // Get file preview
        const preview = await APIService.getFilePreview(result.filePath, 5);
        if (preview.success && preview.data) {
          setFilePreview(preview.data);
        }
      } else if (!result.canceled) {
        setError(result.error || 'Failed to select file');
      }
    } catch (error) {
      setError('Error selecting file');
      console.error('Error selecting file:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const result = await APIService.processLargeFile(selectedFile, projectId);
      
      if (result.success && result.metadata) {
        const uploadedFile: UploadedFile = APIService.createUploadedFileRecord(
          result.metadata.fileName,
          result.metadata.uploadPath,
          result.metadata.fileSize,
          getFileType(selectedFile),
          result.recordCount || 0,
          result.metadata
        );

        onFileUploaded(uploadedFile);
        setSelectedFile(null);
        setFilePreview(null);
      } else {
        setError(result.error || 'Failed to process file');
      }
    } catch (error) {
      setError('Error processing file');
      console.error('Error processing file:', error);
    } finally {
      setUploading(false);
    }
  };

  const getFileType = (filePath: string): 'json' | 'csv' | 'yaml' | 'xml' => {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'yml':
      case 'yaml': return 'yaml';
      case 'xml': return 'xml';
      default: return 'json';
    }
  };

  const handleCreateSubset = () => {
    if (!filePreview || !subsetName.trim()) return;

    try {
      // Apply filters to create subset
      let filteredData = [...filePreview];
      
      filters.forEach(filter => {
        filteredData = filteredData.filter(item => {
          const fieldValue = item[filter.field];
          
          switch (filter.operator) {
            case 'equals':
              return fieldValue === filter.value;
            case 'contains':
              return String(fieldValue).includes(String(filter.value));
            case 'greater_than':
              return Number(fieldValue) > Number(filter.value);
            case 'less_than':
              return Number(fieldValue) < Number(filter.value);
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(fieldValue);
            case 'not_in':
              return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
            default:
              return true;
          }
        });
      });

      const subset: DataSubset = APIService.createDataSubset(
        subsetName,
        subsetDescription,
        'source-file-id', // This would be the actual file ID
        filters,
        filteredData
      );

      onSubsetCreated(subset);
      setSubsetDialogOpen(false);
      setSubsetName('');
      setSubsetDescription('');
      setFilters([]);
    } catch (error) {
      setError('Error creating data subset');
      console.error('Error creating subset:', error);
    }
  };

  const addFilter = () => {
    if (filterField && filterValue) {
      setFilters([...filters, {
        field: filterField,
        operator: filterOperator,
        value: filterValue
      }]);
      setFilterField('');
      setFilterValue('');
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        File Processing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Upload Large Data File
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select and process large JSON, CSV, YAML, or XML files (up to 100MB)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleFileSelect}
                disabled={uploading}
              >
                Select File
              </Button>
              
              {selectedFile && (
                <Button
                  variant="contained"
                  onClick={handleFileUpload}
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                >
                  {uploading ? 'Processing...' : 'Process File'}
                </Button>
              )}
            </Box>
          </Grid>

          {selectedFile && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected File
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {selectedFile.split('/').pop()}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={getFileType(selectedFile).toUpperCase()} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    {filePreview && (
                      <Chip 
                        label={`${filePreview.length} preview records`} 
                        size="small" 
                        color="info" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      startIcon={<PreviewIcon />}
                      onClick={() => setPreviewDialogOpen(true)}
                      disabled={!filePreview}
                    >
                      Preview Data
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* File Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          File Preview
          <Button
            sx={{ float: 'right' }}
            startIcon={<FilterIcon />}
            onClick={() => {
              setPreviewDialogOpen(false);
              setSubsetDialogOpen(true);
            }}
          >
            Create Subset
          </Button>
        </DialogTitle>
        <DialogContent>
          {filePreview && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(filePreview[0] || {}).map(key => (
                      <TableCell key={key}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filePreview.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, i) => (
                        <TableCell key={i}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Subset Dialog */}
      <Dialog
        open={subsetDialogOpen}
        onClose={() => setSubsetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Data Subset</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subset Name"
                value={subsetName}
                onChange={(e) => setSubsetName(e.target.value)}
                placeholder="Enter a name for this data subset"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={subsetDescription}
                onChange={(e) => setSubsetDescription(e.target.value)}
                placeholder="Describe what this subset contains"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Filters
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Field"
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  placeholder="Enter field name"
                  size="small"
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={filterOperator}
                    label="Operator"
                    onChange={(e) => setFilterOperator(e.target.value as any)}
                  >
                    <MenuItem value="equals">Equals</MenuItem>
                    <MenuItem value="contains">Contains</MenuItem>
                    <MenuItem value="greater_than">Greater Than</MenuItem>
                    <MenuItem value="less_than">Less Than</MenuItem>
                    <MenuItem value="in">In</MenuItem>
                    <MenuItem value="not_in">Not In</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter filter value"
                  size="small"
                />
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addFilter}
                  disabled={!filterField || !filterValue}
                >
                  Add Filter
                </Button>
              </Box>

              {filters.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {filters.map((filter, index) => (
                    <Chip
                      key={index}
                      label={`${filter.field} ${filter.operator} ${filter.value}`}
                      onDelete={() => removeFilter(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubsetDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubset}
            disabled={!subsetName.trim()}
          >
            Create Subset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileProcessor; 