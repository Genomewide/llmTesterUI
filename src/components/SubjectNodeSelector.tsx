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
  onSubjectSelect: (formattedData: string, selectedSubject?: string) => void;
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
    
    console.log('🎯 Subject selected:', selectedSubject);
    
    // Filter data for selected subject
    const filteredData = data.flattenedRows.filter(
      row => row.result_subjectNode_name === selectedSubject
    );
    
    console.log('📊 Filtered data has', filteredData.length, 'edges');
    
    // If abstracts are requested, fetch them for this specific subject
    if (includeAbstracts) {
      console.log('🔬 Abstract fetching enabled, limit:', abstractLimit || 'all');
      setAbstractFetching(true);
      try {
        const enrichedFilteredData = await fetchAbstractsForSubject(filteredData);
        const formattedData = formatDataForInput(enrichedFilteredData);
        onSubjectSelect(formattedData, selectedSubject);
      } catch (error) {
        console.error('❌ Error fetching abstracts:', error);
        // Fall back to data without abstracts
        const formattedData = formatDataForInput(filteredData);
        onSubjectSelect(formattedData, selectedSubject);
      } finally {
        setAbstractFetching(false);
      }
    } else {
      console.log('📝 No abstracts requested, formatting data directly');
      // Format data for user input without abstracts
      const formattedData = formatDataForInput(filteredData);
      onSubjectSelect(formattedData, selectedSubject);
    }
  };

  // Fetch abstracts for a specific subject's data
  const fetchAbstractsForSubject = async (filteredData: any[]): Promise<any[]> => {
    const pubmedApi = new PubMedApiService();
    const enrichedData = [...filteredData];
    
    console.log('🔍 Starting abstract fetching for subject with', filteredData.length, 'edges');
    
    // Helper function to add delay between API calls
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Process edges in smaller batches to avoid overwhelming the API
    const BATCH_SIZE = 3; // Process 3 edges at a time
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
    
    for (let i = 0; i < enrichedData.length; i += BATCH_SIZE) {
      const batch = enrichedData.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(enrichedData.length / BATCH_SIZE)} (${batch.length} edges)`);
      
      // Process each edge in the current batch
      for (const row of batch) {
        if (row.publications && row.publications !== 'N/A') {
          const pubmedIds = extractPubMedIds(row.publications);
          console.log('📄 Edge:', row.predicate, '| Publications:', row.publications, '| PubMed IDs:', pubmedIds);
          
          if (pubmedIds.length > 0) {
            try {
              // Add delay before API call to respect rate limit (3 requests/second = 0.33 seconds per request)
              console.log('⏳ Adding delay before API call to respect rate limit...');
              await delay(333); // 0.33 seconds = 333 milliseconds
              
              console.log('🔄 Fetching abstracts for edge:', row.predicate, '| Limit:', abstractLimit || 'all');
              // Apply limit per edge, not across all edges
              const abstracts = abstractLimit 
                ? await pubmedApi.fetchTopRecentAbstracts(pubmedIds, abstractLimit)
                : await pubmedApi.fetchAbstracts(pubmedIds);
              row.abstracts = abstracts;
              row.abstract_count = abstracts.length;
              console.log('✅ Edge completed:', row.predicate, '| Abstracts fetched:', abstracts.length);
            } catch (error) {
              console.error('❌ Error fetching abstracts for row:', error);
              row.abstracts = [];
              row.abstract_count = 0;
            }
          } else {
            console.log('⚠️ No PubMed IDs found for edge:', row.predicate);
          }
        } else {
          console.log('⚠️ No publications for edge:', row.predicate);
        }
      }
      
      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < enrichedData.length) {
        console.log(`⏳ Adding delay between batches...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    console.log('🎉 Abstract fetching completed for subject');
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
    if (filteredData.length === 0) {
      return 'No data available for the selected subject.';
    }

    const firstRow = filteredData[0];
    let output = '';

    // CLAIM SECTION
    output += 'Claim\n';
    output += '=====\n';
    
    // Create the claim using the selected subject node name
    if (firstRow.result_subjectNode_name && firstRow.result_objectNode_name && 
        firstRow.result_subjectNode_name !== 'N/A' && firstRow.result_objectNode_name !== 'N/A') {
      output += `${firstRow.result_subjectNode_name} treats ${firstRow.result_objectNode_name}\n`;
    } else {
      output += 'Treatment claim not available\n';
    }
    
    output += '\n';

    // 1. QUERY INFORMATION
    output += '1. Query Information\n';
    output += '===================\n';
    
    // Create the query question based on the overarching claim
    if (firstRow.overarching_claim && firstRow.overarching_claim !== 'N/A') {
      const [drug, treats, disease] = firstRow.overarching_claim.split(' ');
      output += `Question: What drugs may treat ${disease}?\n`;
    } else {
      output += `Question: What drugs may treat ${firstRow.result_objectNode_name}?\n`;
    }
    
    // Add disease description if available
    if (firstRow.disease_description && firstRow.disease_description !== 'N/A') {
      output += `Disease Description: ${firstRow.disease_description}\n`;
    }
    
    output += '\n';

    // 2. NODE/ENTITY INFORMATION
    output += '2. Node/Entity Information\n';
    output += '=========================\n';
    
    // Collect unique nodes from the data
    const uniqueNodes = new Map();
    
    filteredData.forEach(row => {
      // Add subject node
      if (row.result_subjectNode_id && row.result_subjectNode_id !== 'N/A') {
        uniqueNodes.set(row.result_subjectNode_id, {
          name: row.result_subjectNode_name,
          id: row.result_subjectNode_id,
          type: 'Drug/Chemical Entity'
        });
      }
      
      // Add object node (disease)
      if (row.result_objectNode_id && row.result_objectNode_id !== 'N/A') {
        uniqueNodes.set(row.result_objectNode_id, {
          name: row.result_objectNode_name,
          id: row.result_objectNode_id,
          type: 'Disease'
        });
      }
      
      // Add edge subject and object nodes
      if (row.edge_subject && row.edge_subject !== 'N/A') {
        uniqueNodes.set(row.edge_subject, {
          name: row.edge_subjectNode_name,
          id: row.edge_subject,
          type: 'Entity'
        });
      }
      
      if (row.edge_object && row.edge_object !== 'N/A') {
        uniqueNodes.set(row.edge_object, {
          name: row.edge_objectNode_name,
          id: row.edge_object,
          type: 'Entity'
        });
      }
    });
    
    // Format node information
    uniqueNodes.forEach((node, nodeId) => {
      output += `- ${node.name} (${nodeId}) [${node.type}]\n`;
    });
    
    output += '\n';

    // 3. EDGE/REASONING INFORMATION
    output += '3. Edge/Reasoning Information\n';
    output += '============================\n';
    
    // Group phrases and count occurrences
    const phraseCounts = new Map<string, { 
      count: number; 
      publications: Set<string>; 
      abstracts: any[];
      edge_id: string;
      predicate: string;
      sources: Set<string>; // Changed from primary_source to sources Set
    }>();
    
    filteredData.forEach((row) => {
      const phrase = row.phrase;
      const publication = row.publications && row.publications !== 'N/A' ? row.publications : null;
      const abstracts = row.abstracts || [];
      const source = row.primary_source && row.primary_source !== 'N/A' ? row.primary_source : null;
      
      if (phraseCounts.has(phrase)) {
        const existing = phraseCounts.get(phrase)!;
        existing.count += 1;
        if (publication) {
          existing.publications.add(publication);
        }
        if (source) {
          existing.sources.add(source);
        }
        existing.abstracts.push(...abstracts);
      } else {
        phraseCounts.set(phrase, {
          count: 1,
          publications: publication ? new Set([publication]) : new Set(),
          abstracts: [...abstracts],
          edge_id: row.edge_id,
          predicate: row.predicate,
          sources: source ? new Set([source]) : new Set()
        });
      }
    });
    
    // Format the edge information
    const uniquePhrases = Array.from(phraseCounts.entries());
    uniquePhrases.forEach(([phrase, data], index) => {
      // Add the edge with count
      if (data.count > 1) {
        output += `${phrase} (x${data.count})`;
      } else {
        output += phrase;
      }
      
      // Add publication count if there are publications
      if (data.publications.size > 0) {
        const publicationCount = data.publications.size;
        const publicationText = publicationCount === 1 ? 'publication' : 'publications';
        output += `: supported by ${publicationCount} ${publicationText}`;
      }
      
      // Add source information - show all unique sources
      if (data.sources.size > 0) {
        const sourcesArray = Array.from(data.sources);
        if (sourcesArray.length === 1) {
          output += ` [Source: ${sourcesArray[0]}]`;
        } else {
          output += ` [Sources: ${sourcesArray.join(', ')}]`;
        }
      }
      
      output += '\n';
    });

    // Add abstracts if requested
    if (includeAbstracts) {
      const allAbstracts = Array.from(phraseCounts.values()).flatMap(data => data.abstracts);
      
      if (allAbstracts.length > 0) {
        output += '\nSupporting Publications:\n';
        output += '======================\n';
        
        // Remove duplicates but preserve per-edge structure
        const uniqueAbstracts = allAbstracts.filter((abstract, index, self) => 
          index === self.findIndex(a => a.pubmedId === abstract.pubmedId)
        );
        
        // Sort by date (most recent first)
        const sortedAbstracts = uniqueAbstracts.sort((a, b) => 
          new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
        );
        
        // Apply limit if specified - but this should be per edge, not total
        // Since we already applied the limit per edge during fetching, 
        // we should include all abstracts that were fetched
        const abstractsToInclude = sortedAbstracts;
        
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
        <Box sx={{ mt: 1, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 'bold' }}>
            🔄 Fetching abstracts for selected subject...
          </Typography>
          <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
            This may take a moment due to PubMed API rate limits.
          </Typography>
          <Typography variant="caption" color="primary" sx={{ display: 'block', fontStyle: 'italic' }}>
            Check the console (Ctrl+Shift+I) for detailed progress.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SubjectNodeSelector; 