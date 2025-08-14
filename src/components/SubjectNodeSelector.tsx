import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress
} from '@mui/material';
import { ProcessedData } from '../types';
import { PubMedApiService } from '../services/pubmed-api';

interface SubjectNodeSelectorProps {
  data: ProcessedData | null;
  onSubjectSelect: (formattedData: string) => void;
  disabled?: boolean;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  placeholder?: string;
  label?: string;
}

const SubjectNodeSelector: React.FC<SubjectNodeSelectorProps> = ({
  data,
  onSubjectSelect,
  disabled = false,
  includeAbstracts = false,
  abstractLimit,
  placeholder = "Type to search subject nodes...",
  label = "Select Subject Node"
}) => {
  const [abstractFetching, setAbstractFetching] = useState(false);
  // Extract unique subject nodes from data
  const uniqueSubjects = useMemo(() => {
    if (!data?.flattenedRows) return [];
    
    const subjectNames = data.flattenedRows.map(row => row.result_subjectNode_name);
    const uniqueSet = new Set(subjectNames);
    return Array.from(uniqueSet).sort();
  }, [data]);

  // Handle subject selection
  const handleSubjectSelect = async (selectedSubject: string | null) => {
    if (!selectedSubject || !data?.flattenedRows) return;
    
    // Filter data for selected subject
    const filteredData = data.flattenedRows.filter(
      row => row.result_subjectNode_name === selectedSubject
    );
    
    // If abstracts are requested, fetch them for this specific subject
    if (includeAbstracts) {
      setAbstractFetching(true);
      try {
        const enrichedFilteredData = await fetchAbstractsForSubject(filteredData);
        const formattedData = formatDataForInput(enrichedFilteredData);
        onSubjectSelect(formattedData);
      } catch (error) {
        console.error('Error fetching abstracts:', error);
        // Fall back to data without abstracts
        const formattedData = formatDataForInput(filteredData);
        onSubjectSelect(formattedData);
      } finally {
        setAbstractFetching(false);
      }
    } else {
      // Format data for user input without abstracts
      const formattedData = formatDataForInput(filteredData);
      onSubjectSelect(formattedData);
    }
  };

  // Fetch abstracts for a specific subject's data
  const fetchAbstractsForSubject = async (filteredData: any[]): Promise<any[]> => {
    const pubmedApi = new PubMedApiService();
    const enrichedData = [...filteredData];
    
    for (const row of enrichedData) {
      if (row.publications && row.publications !== 'N/A') {
        const pubmedIds = extractPubMedIds(row.publications);
        if (pubmedIds.length > 0) {
          try {
            const abstracts = abstractLimit 
              ? await pubmedApi.fetchTopRecentAbstracts(pubmedIds, abstractLimit)
              : await pubmedApi.fetchAbstracts(pubmedIds);
            row.abstracts = abstracts;
            row.abstract_count = abstracts.length;
          } catch (error) {
            console.error('Error fetching abstracts for row:', error);
            row.abstracts = [];
            row.abstract_count = 0;
          }
        }
      }
    }
    
    return enrichedData;
  };

  // Extract PubMed IDs from publications string
  const extractPubMedIds = (publications: string): string[] => {
    if (!publications || publications === 'N/A') return [];
    
    // Split by common delimiters and extract IDs
    const parts = publications.split(/[,;\s]+/).filter(part => part.trim());
    const pubmedIds: string[] = [];
    
    parts.forEach(part => {
      const trimmed = part.trim();
      // Handle different formats: "pubmed:12345", "12345", "PMID:12345"
      const match = trimmed.match(/(?:pubmed|pmid):?(\d+)/i) || trimmed.match(/^(\d+)$/);
      if (match) {
        pubmedIds.push(match[1]);
      }
    });
    
    return pubmedIds;
  };

  // Format filtered data for user input
  const formatDataForInput = (filteredData: any[]): string => {
    let output = '';
    
    // Group phrases and count occurrences
    const phraseCounts = new Map<string, { count: number; publications: Set<string>; abstracts: any[] }>();
    
    filteredData.forEach((row) => {
      const phrase = row.phrase;
      const publication = row.publications && row.publications !== 'N/A' ? row.publications : null;
      const abstracts = row.abstracts || [];
      
      if (phraseCounts.has(phrase)) {
        const existing = phraseCounts.get(phrase)!;
        existing.count += 1;
        if (publication) {
          existing.publications.add(publication);
        }
        existing.abstracts.push(...abstracts);
      } else {
        phraseCounts.set(phrase, {
          count: 1,
          publications: publication ? new Set([publication]) : new Set(),
          abstracts: [...abstracts]
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

    // Add abstracts if requested
    if (includeAbstracts) {
      const allAbstracts = Array.from(phraseCounts.values()).flatMap(data => data.abstracts);
      
      if (allAbstracts.length > 0) {
        output += '\n\nSupporting Publications:\n';
        
        // Remove duplicates and sort by date
        const uniqueAbstracts = allAbstracts.filter((abstract, index, self) => 
          index === self.findIndex(a => a.pubmedId === abstract.pubmedId)
        ).sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
        
        // Apply limit if specified
        const abstractsToInclude = abstractLimit 
          ? uniqueAbstracts.slice(0, abstractLimit)
          : uniqueAbstracts;
        
        abstractsToInclude.forEach((abstract, index) => {
          output += `\n${abstract.title}\n`;
          output += `${abstract.journal} (${new Date(abstract.publicationDate).getFullYear()})\n`;
          output += `Abstract: ${abstract.abstract}\n`;
          output += `---\n`;
        });
      }
    }
    
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
                  {(disabled || abstractFetching) && <CircularProgress color="inherit" size={20} />}
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
        loading={disabled || abstractFetching}
        loadingText={abstractFetching ? "Fetching abstracts..." : "Loading..."}
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
      
      {abstractFetching && (
        <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
          Fetching abstracts for selected subject... This may take a moment due to PubMed API rate limits.
        </Typography>
      )}
    </Box>
  );
};

export default SubjectNodeSelector; 