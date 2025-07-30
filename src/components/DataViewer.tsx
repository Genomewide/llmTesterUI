import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { ProcessedData } from '../types';

interface DataViewerProps {
  data: ProcessedData;
  onExport?: (format: 'json' | 'csv') => void;
}

export const DataViewer: React.FC<DataViewerProps> = ({ data, onExport }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string>('all');
  const [predicateFilter, setPredicateFilter] = useState<string>('all');

  // Get unique predicates for filter
  const uniquePredicates = useMemo(() => {
    const predicates = new Set(data.flattenedRows.map(row => row.predicate));
    return Array.from(predicates).sort();
  }, [data.flattenedRows]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return data.flattenedRows.filter(row => {
      const matchesSearch = searchTerm === '' || 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesEdgeType = edgeTypeFilter === 'all' || row.edge_type === edgeTypeFilter;
      const matchesPredicate = predicateFilter === 'all' || row.predicate === predicateFilter;
      
      return matchesSearch && matchesEdgeType && matchesPredicate;
    });
  }, [data.flattenedRows, searchTerm, edgeTypeFilter, predicateFilter]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getPredicateColor = (predicate: string) => {
    if (predicate.includes('treats')) return 'success';
    if (predicate.includes('associated')) return 'info';
    if (predicate.includes('affects')) return 'warning';
    if (predicate.includes('subclass')) return 'secondary';
    return 'default';
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Rows
              </Typography>
              <Typography variant="h4">
                {data.metadata.totalProcessedRows.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Results
              </Typography>
              <Typography variant="h4">
                {data.metadata.resultsCount.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Support Graphs
              </Typography>
              <Typography variant="h4">
                {data.metadata.supportGraphCount.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unique Predicates
              </Typography>
              <Typography variant="h4">
                {uniquePredicates.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in all fields..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Edge Type</InputLabel>
              <Select
                value={edgeTypeFilter}
                label="Edge Type"
                onChange={(e) => setEdgeTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="primary">Primary</MenuItem>
                <MenuItem value="support">Support</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Predicate</InputLabel>
              <Select
                value={predicateFilter}
                label="Predicate"
                onChange={(e) => setPredicateFilter(e.target.value)}
              >
                <MenuItem value="all">All Predicates</MenuItem>
                {uniquePredicates.map(predicate => (
                  <MenuItem key={predicate} value={predicate}>
                    {predicate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Export JSON">
                <IconButton onClick={() => onExport?.('json')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export CSV">
                <IconButton onClick={() => onExport?.('csv')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Showing {filteredData.length.toLocaleString()} of {data.flattenedRows.length.toLocaleString()} rows
      </Typography>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Result #</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Predicate</TableCell>
              <TableCell>Object</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Publications</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={`${row.edge_id}-${index}`}>
                <TableCell>{row.result_counter}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {row.edge_subjectNode_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {row.edge_subject}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.predicate}
                    size="small"
                    color={getPredicateColor(row.predicate) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {row.edge_objectNode_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {row.edge_object}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.edge_type}
                    size="small"
                    color={row.edge_type === 'primary' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {row.primary_source}
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.publications_count > 0 ? (
                    <Chip
                      label={`${row.publications_count} pubs`}
                      size="small"
                      color="info"
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      None
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Metadata Accordion */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Processing Metadata</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Processing Information
              </Typography>
              <Typography variant="body2">
                <strong>Timestamp:</strong> {new Date(data.metadata.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Environment:</strong> {data.metadata.environment}
              </Typography>
              <Typography variant="body2">
                <strong>PK:</strong> {data.metadata.pk}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Data Statistics
              </Typography>
              <Typography variant="body2">
                <strong>Results:</strong> {data.metadata.resultsCount}
              </Typography>
              <Typography variant="body2">
                <strong>Nodes:</strong> {data.metadata.nodesCount}
              </Typography>
              <Typography variant="body2">
                <strong>Edges:</strong> {data.metadata.edgesCount}
              </Typography>
              <Typography variant="body2">
                <strong>Support Graphs:</strong> {data.metadata.supportGraphCount}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}; 