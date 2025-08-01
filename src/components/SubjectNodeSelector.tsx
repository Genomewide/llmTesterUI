import React, { useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress
} from '@mui/material';
import { ProcessedData } from '../types';

interface SubjectNodeSelectorProps {
  data: ProcessedData | null;
  onSubjectSelect: (formattedData: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

const SubjectNodeSelector: React.FC<SubjectNodeSelectorProps> = ({
  data,
  onSubjectSelect,
  disabled = false,
  placeholder = "Type to search subject nodes...",
  label = "Select Subject Node"
}) => {
  // Extract unique subject nodes from data
  const uniqueSubjects = useMemo(() => {
    if (!data?.flattenedRows) return [];
    
    const subjectNames = data.flattenedRows.map(row => row.result_subjectNode_name);
    const uniqueSet = new Set(subjectNames);
    return Array.from(uniqueSet).sort();
  }, [data]);

  // Handle subject selection
  const handleSubjectSelect = (selectedSubject: string | null) => {
    if (!selectedSubject || !data?.flattenedRows) return;
    
    // Filter data for selected subject
    const filteredData = data.flattenedRows.filter(
      row => row.result_subjectNode_name === selectedSubject
    );
    
    // Format data for user input
    const formattedData = formatDataForInput(filteredData);
    onSubjectSelect(formattedData);
  };

  // Format filtered data for user input
  const formatDataForInput = (filteredData: any[]): string => {
    let output = '';
    
    // Group phrases and count occurrences
    const phraseCounts = new Map<string, { count: number; publications: Set<string> }>();
    
    filteredData.forEach((row) => {
      const phrase = row.phrase;
      const publication = row.publications && row.publications !== 'N/A' ? row.publications : null;
      
      if (phraseCounts.has(phrase)) {
        const existing = phraseCounts.get(phrase)!;
        existing.count += 1;
        if (publication) {
          existing.publications.add(publication);
        }
      } else {
        phraseCounts.set(phrase, {
          count: 1,
          publications: publication ? new Set([publication]) : new Set()
        });
      }
    });
    
    // Format the grouped data
    const uniquePhrases = Array.from(phraseCounts.entries());
    uniquePhrases.forEach(([phrase, data], index) => {
      // Add line space before each phrase (except the first one)
      if (index > 0) {
        output += '\n';
      }
      
      // Add the phrase with count
      if (data.count > 1) {
        output += `${phrase} (x${data.count})`;
      } else {
        output += phrase;
      }
      
      // Add publication count if there are publications
      if (data.publications.size > 0) {
        const publicationCount = data.publications.size;
        const publicationText = publicationCount === 1 ? 'publication' : 'publications';
        output += ` supported by ${publicationCount} ${publicationText}`;
      }
    });
    
    return output;
  };

  // Get statistics for selected subject
  const getSubjectStats = (subject: string) => {
    if (!data?.flattenedRows) return null;
    
    const filteredData = data.flattenedRows.filter(
      row => row.result_subjectNode_name === subject
    );
    
    const phraseCount = filteredData.length;
    const publicationCount = filteredData.filter(
      row => row.publications && row.publications !== 'N/A'
    ).length;
    
    return { phraseCount, publicationCount };
  };

  if (!data?.flattenedRows || data.flattenedRows.length === 0) {
    return null; // Don't render if no data
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      
      <Autocomplete
        options={uniqueSubjects}
        onChange={(_, value) => handleSubjectSelect(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            variant="outlined"
            size="small"
            disabled={disabled}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {disabled && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const stats = getSubjectStats(option);
          return (
            <li {...props}>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="body2">
                  {option}
                </Typography>
                {stats && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip 
                      label={`${stats.phraseCount} phrases`} 
                      size="small" 
                      variant="outlined"
                    />
                    {stats.publicationCount > 0 && (
                      <Chip 
                        label={`${stats.publicationCount} articles`} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </Box>
                )}
              </Box>
            </li>
          );
        }}
        filterOptions={(options, { inputValue }) => {
          return options.filter(option =>
            option.toLowerCase().includes(inputValue.toLowerCase())
          );
        }}
        noOptionsText="No subject nodes found"
        loading={disabled}
        loadingText="Loading..."
        clearOnBlur={false}
        selectOnFocus
        clearOnEscape
        sx={{
          '& .MuiAutocomplete-input': {
            fontSize: '14px',
          },
        }}
      />
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {uniqueSubjects.length} unique subject nodes available
      </Typography>
    </Box>
  );
};

export default SubjectNodeSelector; 