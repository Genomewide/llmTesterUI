import React, { useMemo, useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { ProcessedData, ProcessingMethod } from '../types';
import { PubMedApiService } from '../services/pubmed-api';

interface SubjectNodeSelectorProps {
  data: ProcessedData | null;
  onSubjectSelect: (formattedData: string, selectedSubject?: string) => void;
  disabled?: boolean;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  placeholder?: string;
  label?: string;
  processingMethod?: ProcessingMethod;
  onProcessingMethodChange?: (method: ProcessingMethod) => void;
}

const SubjectNodeSelector: React.FC<SubjectNodeSelectorProps> = ({
  data,
  onSubjectSelect,
  disabled = false,
  includeAbstracts = false,
  abstractLimit,
  placeholder = "Type to search subject nodes...",
  label = "Select Subject Node",
  processingMethod = 'new-method',
  onProcessingMethodChange
}) => {
  const [abstractFetching, setAbstractFetching] = useState(false);
  
  // Handle processing method change
  const handleProcessingMethodChange = (
    event: React.MouseEvent<HTMLElement>,
    newMethod: ProcessingMethod | null,
  ) => {
    if (newMethod !== null && onProcessingMethodChange) {
      onProcessingMethodChange(newMethod);
    }
  };
  
  // Extract unique subject nodes from data
  const uniqueSubjects = useMemo(() => {
    if (!data?.flattenedRows) return [];
    
    const subjectNames = data.flattenedRows.map(row => row.result_subjectNode_name);
    const uniqueSet = new Set(subjectNames);
    return Array.from(uniqueSet).sort();
  }, [data]);
  
  // Auto-select first subject when data is loaded
  useEffect(() => {
    if (data?.flattenedRows && uniqueSubjects.length > 0) {
      const firstSubject = uniqueSubjects[0];
      console.log('🚀 Auto-selecting first subject:', firstSubject);
      handleSubjectSelect(firstSubject);
    }
  }, [data, uniqueSubjects]);

  // Handle subject selection
  const handleSubjectSelect = async (selectedSubject: string | null) => {
    if (!selectedSubject || !data?.flattenedRows) return;
    
    console.log('🎯 Subject selected:', selectedSubject);
    console.log('🔧 Processing method:', processingMethod);
    
    // Filter data for selected subject
    const filteredData = data.flattenedRows.filter(
      row => row.result_subjectNode_name === selectedSubject
    );
    
    console.log('📊 Filtered data has', filteredData.length, 'edges');
    
    let formattedData: string;
    
    // Choose processing method
    if (processingMethod === 'biomedical') {
      formattedData = await processBiomedicalData(filteredData, includeAbstracts, abstractLimit);
    } else {
      formattedData = await processNewMethodData(filteredData, includeAbstracts, abstractLimit);
    }
    
    onSubjectSelect(formattedData, selectedSubject);
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

  // Process data using biomedical method (current logic)
  const processBiomedicalData = async (
    filteredData: any[], 
    includeAbstracts: boolean, 
    abstractLimit?: number
  ): Promise<string> => {
    if (includeAbstracts) {
      console.log('🔬 Abstract fetching enabled, limit:', abstractLimit || 'all');
      setAbstractFetching(true);
      try {
        const enrichedFilteredData = await fetchAbstractsForSubject(filteredData);
        const formattedData = formatBiomedicalDataForInput(enrichedFilteredData);
        return formattedData;
      } catch (error) {
        console.error('❌ Error fetching abstracts:', error);
        // Fall back to data without abstracts
        const formattedData = formatBiomedicalDataForInput(filteredData);
        return formattedData;
      } finally {
        setAbstractFetching(false);
      }
    } else {
      console.log('📝 No abstracts requested, formatting data directly');
      return formatBiomedicalDataForInput(filteredData);
    }
  };

  // Process data using new method
  const processNewMethodData = async (
    filteredData: any[], 
    includeAbstracts: boolean, 
    abstractLimit?: number
  ): Promise<string> => {
    console.log('🆕 Using new processing method');
    
    // TODO: Implement your new processing logic here
    // This is where you'll add your different data formatting
    
    return formatNewMethodDataForInput(filteredData);
  };

  // Format data for new method - Path Analysis
  const formatNewMethodDataForInput = (filteredData: any[]): string => {
    console.log('🔍 formatNewMethodDataForInput called with', filteredData.length, 'rows');
    
    if (filteredData.length === 0) {
      return 'No data available for the selected subject.';
    }

    const firstRow = filteredData[0];
    const resultSubject = firstRow.result_subjectNode_name;
    const resultObject = firstRow.result_objectNode_name;
    
    console.log(`🎯 Processing paths for: ${resultSubject} → ${resultObject}`);
    
    // Log sample data to see what we're working with
    console.log('📋 Sample row data:');
    console.log('  Subject:', firstRow.edge_subjectNode_name);
    console.log('  Predicate:', firstRow.predicate);
    console.log('  Object:', firstRow.edge_objectNode_name);
    console.log('  Publications:', firstRow.publications);
    console.log('  Publications count:', firstRow.publications_count);
    console.log('  Clinical trials:', firstRow.clinical_trials);
    console.log('  Clinical trials count:', firstRow.clinical_trials_count);
    
    // Check for clinical trials in all rows
    const rowsWithTrials = filteredData.filter(row => row.clinical_trials && row.clinical_trials.length > 0);
    console.log(`🏥 Found ${rowsWithTrials.length} rows with clinical trials out of ${filteredData.length} total rows`);
    
    if (rowsWithTrials.length > 0) {
      console.log('📋 Rows with clinical trials:');
      rowsWithTrials.slice(0, 3).forEach((row, index) => {
        console.log(`  Row ${index + 1}: ${row.edge_subjectNode_name} → ${row.predicate} → ${row.edge_objectNode_name}`);
        console.log(`    Clinical trials: ${row.clinical_trials.map((t: any) => t.description).join(', ')}`);
      });
    }
    
    let output = '';
    output += 'PATH ANALYSIS FORMAT\n';
    output += '===================\n\n';
    
    // Header with the main claim
    output += `Main Claim: ${resultSubject} treats ${resultObject}\n\n`;
    
    // Find all paths between result subject and result object
    const rawPaths = findPathsBetweenNodes(filteredData, resultSubject, resultObject);
    
    // Add debugging info to output
    output += `DEBUG INFO:\n`;
    output += `Raw paths found: ${rawPaths.length}\n`;
    const hopCounts = rawPaths.reduce((acc, path) => {
      const hopCount = path.length;
      acc[hopCount] = (acc[hopCount] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    output += `Paths by hop count: ${Object.entries(hopCounts).map(([hops, count]) => `${hops}-hop: ${count}`).join(', ')}\n`;
    output += `Graph structure analysis completed.\n\n`;
    
    // Deduplicate paths by combining identical node/predicate combinations
    const deduplicatedPaths = deduplicatePaths(rawPaths);
    
    output += `Found ${deduplicatedPaths.length} distinct paths between ${resultSubject} and ${resultObject}:\n\n`;
    
    // Display each deduplicated path
    deduplicatedPaths.forEach((path, pathIndex) => {
      output += `Path ${pathIndex + 1}:\n`;
      output += `${path.map((step, stepIndex) => {
        const stepStr = `${stepIndex + 1}. ${step.from} → ${step.predicate} → ${step.to}`;
        const sourceStr = step.source ? ` [Source: ${step.source}]` : '';
        const pubStr = step.publications && step.publications !== 'N/A' ? ` (${step.publications})` : '';
        const trialStr = step.clinical_trials && step.clinical_trials.length > 0 
          ? ` [Clinical Trials: ${step.clinical_trials.map((t: any) => t.description).join(', ')}]` 
          : '';
        return `${stepStr}${sourceStr}${pubStr}${trialStr}`;
      }).join('\n')}\n\n`;
    });
    
    // Node participation analysis (bottleneck identification)
    const nodeParticipation = analyzeNodeParticipation(deduplicatedPaths);
    
    // Summary statistics
    output += `Path Analysis Summary:\n`;
    output += `- Total edges in paths: ${deduplicatedPaths.reduce((sum: number, path: any[]) => sum + path.length, 0)}\n`;
    output += `- Unique nodes involved: ${getUniqueNodesInPaths(deduplicatedPaths).length}\n`;
    output += `- Path lengths: ${deduplicatedPaths.map((p: any[]) => p.length).join(', ')}\n\n`;
    
    // Node participation/bottleneck analysis
    output += `Node Participation Analysis (Bottleneck Identification):\n`;
    output += `===================================================\n`;
    
    // Sort nodes by participation count (highest first)
    const sortedNodes = Array.from(nodeParticipation.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    sortedNodes.forEach(([nodeName, data]) => {
      const percentage = ((data.count / deduplicatedPaths.length) * 100).toFixed(1);
      output += `- ${nodeName}: appears in ${data.count}/${deduplicatedPaths.length} paths (${percentage}%)\n`;
      
      // Show which paths this node appears in
      if (data.paths.length > 0) {
        output += `  Paths: ${data.paths.map(p => p + 1).join(', ')}\n`;
      }
      
      // Show roles (start, end, intermediate)
      const roles = [];
      if (data.roles.includes('start')) roles.push('start node');
      if (data.roles.includes('end')) roles.push('end node');
      if (data.roles.includes('intermediate')) roles.push('intermediate');
      output += `  Roles: ${roles.join(', ')}\n`;
    });
    
    // Identify potential bottlenecks
    const bottlenecks = sortedNodes.filter(([nodeName, data]) => {
      const percentage = (data.count / deduplicatedPaths.length) * 100;
      return percentage > 50; // Node appears in more than 50% of paths
    });
    
    if (bottlenecks.length > 0) {
      output += `\nPotential Bottlenecks (nodes in >50% of paths):\n`;
      output += `=============================================\n`;
      bottlenecks.forEach(([nodeName, data]) => {
        const percentage = ((data.count / deduplicatedPaths.length) * 100).toFixed(1);
        output += `- ${nodeName} (${percentage}% participation)\n`;
      });
    }
    
    return output;
  };

  // Helper function to find all paths between two nodes (max 4 hops)
  const findPathsBetweenNodes = (filteredData: any[], startNode: string, endNode: string): any[][] => {
    console.log(`🔍 findPathsBetweenNodes called: ${startNode} → ${endNode}`);
    console.log(`  Input data: ${filteredData.length} rows`);
    
    // Create a graph representation
    const graph = new Map<string, Array<{to: string, predicate: string, source: string, publications: string, clinicalTrials: any[]}>>();
    
    // Build the graph from filtered data
    let edgesWithTrials = 0;
    filteredData.forEach((row, index) => {
      const from = row.edge_subjectNode_name;
      const to = row.edge_objectNode_name;
      const predicate = row.predicate;
      const source = row.primary_source;
      const publications = row.publications;
      const clinicalTrials = row.clinical_trials || [];
      
      if (clinicalTrials.length > 0) {
        edgesWithTrials++;
        console.log(`  🏥 Edge ${index}: ${from} → ${to} has ${clinicalTrials.length} clinical trials`);
        clinicalTrials.forEach((trial: any) => {
          console.log(`    Trial: ${trial.description}`);
        });
      }
      
      if (!graph.has(from)) {
        graph.set(from, []);
      }
      graph.get(from)!.push({
        to,
        predicate,
        source,
        publications,
        clinicalTrials
      });
    });
    
    console.log(`  📊 Built graph with ${graph.size} nodes, ${edgesWithTrials} edges have clinical trials`);
    
    const paths: any[][] = [];
    
    console.log(`  🔍 Starting path search from ${startNode} to ${endNode}`);
    
    // Debug: Show what nodes are connected to startNode
    const startNodeNeighbors = graph.get(startNode) || [];
    console.log(`  📋 Start node (${startNode}) has ${startNodeNeighbors.length} neighbors:`);
    startNodeNeighbors.forEach((neighbor, index) => {
      console.log(`    ${index + 1}. ${startNode} → ${neighbor.predicate} → ${neighbor.to}`);
    });
    
    // Debug: Show what nodes connect to endNode
    const nodesToEnd = Array.from(graph.entries()).filter(([from, neighbors]) => 
      neighbors.some(n => n.to === endNode)
    );
    console.log(`  📋 End node (${endNode}) has ${nodesToEnd.length} incoming connections:`);
    nodesToEnd.forEach(([from, neighbors], index) => {
      const relevantNeighbors = neighbors.filter(n => n.to === endNode);
      relevantNeighbors.forEach(neighbor => {
        console.log(`    ${index + 1}. ${from} → ${neighbor.predicate} → ${endNode}`);
      });
    });
    
    // Find all paths using BFS
    const queue: Array<{node: string, path: any[], visited: Set<string>, hops: number}> = [
      {node: startNode, path: [], visited: new Set([startNode]), hops: 0}
    ];
    
    while (queue.length > 0) {
      const {node, path, visited, hops} = queue.shift()!;
      
      console.log(`  🔍 Exploring node: ${node} (hops: ${hops}, path length: ${path.length})`);
      
      // If we reached the end node, save this path
      if (node === endNode && path.length > 0) {
        console.log(`  🎯 Found path with ${path.length} hops: ${path.map(step => `${step.from} → ${step.predicate} → ${step.to}`).join(' → ')}`);
        paths.push([...path]);
      }
      
      // Stop if we've reached 4 hops
      if (hops >= 4) {
        console.log(`  ⏹️ Stopping at ${hops} hops for node ${node}`);
        continue;
      }
      
      // Get all neighbors
      const neighbors = graph.get(node) || [];
      console.log(`  📋 Node ${node} has ${neighbors.length} neighbors`);
      
      for (const neighbor of neighbors) {
        console.log(`    → ${node} → ${neighbor.predicate} → ${neighbor.to}`);
        
        // Allow revisiting nodes for longer paths, but avoid infinite loops
        const newVisited = new Set(visited);
        newVisited.add(neighbor.to);
        
        const newPath = [...path, {
          from: node,
          to: neighbor.to,
          predicate: neighbor.predicate,
          source: neighbor.source,
          publications: neighbor.publications,
          clinical_trials: neighbor.clinicalTrials
        }];
        
        queue.push({
          node: neighbor.to,
          path: newPath,
          visited: newVisited,
          hops: hops + 1
        });
      }
    }
    
    console.log(`  ✅ Found ${paths.length} total paths`);
    paths.forEach((path, index) => {
      console.log(`    Path ${index + 1}: ${path.length} hops`);
      path.forEach((step, stepIndex) => {
        console.log(`      Step ${stepIndex + 1}: ${step.from} → ${step.predicate} → ${step.to}`);
      });
    });
    
    return paths;
  };

  // Helper function to deduplicate paths by combining identical node/predicate combinations
  const deduplicatePaths = (paths: any[][]): any[][] => {
    // For now, return the original paths without deduplication
    // This preserves the multi-hop paths as they were found
    return paths;
  };

  // Helper function to get unique nodes in all paths
  const getUniqueNodesInPaths = (paths: any[][]): string[] => {
    const uniqueNodes = new Set<string>();
    
    paths.forEach(path => {
      path.forEach(step => {
        uniqueNodes.add(step.from);
        uniqueNodes.add(step.to);
      });
    });
    
    return Array.from(uniqueNodes);
  };

  // Helper function to analyze node participation in paths
  const analyzeNodeParticipation = (paths: any[][]): Map<string, {count: number, paths: number[], roles: string[]}> => {
    const nodeParticipation = new Map<string, {count: number, paths: number[], roles: string[]}>();
    
    paths.forEach((path, pathIndex) => {
      const pathNodes = new Set<string>();
      
      path.forEach(step => {
        pathNodes.add(step.from);
        pathNodes.add(step.to);
      });
      
      // Count participation for each node in this path
      pathNodes.forEach(nodeName => {
        if (!nodeParticipation.has(nodeName)) {
          nodeParticipation.set(nodeName, {
            count: 0,
            paths: [],
            roles: []
          });
        }
        
        const nodeData = nodeParticipation.get(nodeName)!;
        nodeData.count += 1;
        nodeData.paths.push(pathIndex);
        
        // Determine role in this path
        if (path.length > 0) {
          if (path[0].from === nodeName) {
            if (!nodeData.roles.includes('start')) nodeData.roles.push('start');
          } else if (path[path.length - 1].to === nodeName) {
            if (!nodeData.roles.includes('end')) nodeData.roles.push('end');
          } else {
            if (!nodeData.roles.includes('intermediate')) nodeData.roles.push('intermediate');
          }
        }
      });
    });
    
    return nodeParticipation;
  };

  // Format data using biomedical method (renamed from formatDataForInput)
  const formatBiomedicalDataForInput = (filteredData: any[]): string => {
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
      {/* Processing Method Toggle */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Processing Method
        </Typography>
        <ToggleButtonGroup
          value={processingMethod}
          exclusive
          onChange={handleProcessingMethodChange}
          size="small"
          disabled={disabled}
        >
          <ToggleButton value="biomedical">
            Biomedical
          </ToggleButton>
          <ToggleButton value="new-method">
            New Method
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

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