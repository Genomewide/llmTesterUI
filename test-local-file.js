const fs = require('fs-extra');
const path = require('path');

// Simplified DataProcessor for testing
class SimpleDataProcessor {
  constructor() {
    this.allRows = [];
    this.edges = {};
    this.nodes = {};
    this.results = [];
    this.auxiliary_graphs = {};
  }

  processKnowledgeGraph(data, pk, environment) {
    console.log('Starting simplified data processing...');
    
    // Reset state
    this.allRows = [];
    this.edges = {};
    this.nodes = {};
    this.results = [];
    this.supportGraphCount = 0;

    try {
      // Extract data from API response - handle fields.data.message structure
      const message = data.fields?.data?.message;
      if (!message) {
        throw new Error('Invalid API response structure - missing fields.data.message');
      }

      this.results = message.results || [];
      this.edges = message.knowledge_graph?.edges || {};
      this.nodes = message.knowledge_graph?.nodes || {};
      this.auxiliary_graphs = message.auxiliary_graphs || {};

      console.log(`Processing ${this.results.length} results, ${Object.keys(this.nodes).length} nodes, ${Object.keys(this.edges).length} edges, ${Object.keys(this.auxiliary_graphs).length} auxiliary graphs`);
      console.log(`Available auxiliary graphs:`, Object.keys(this.auxiliary_graphs));
      
      // Debug: Check auxiliary graph keys and support graph attribute values
      console.log(`Auxiliary graph keys:`, Object.keys(this.auxiliary_graphs));
      
      // Check first few edges for support graph attributes
      let edgeCount = 0;
      for (const [edgeId, edge] of Object.entries(this.edges)) {
        if (edgeCount >= 3) break; // Only check first 3 edges
        const attributes = edge.attributes || [];
        attributes.forEach(attribute => {
          if (attribute.attribute_type_id === 'biolink:support_graphs') {
            console.log(`Edge ${edgeId} has support graph attribute:`, attribute.value);
          }
        });
        edgeCount++;
      }

      // Process all results
      this.results.forEach((result, index) => {
        console.log(`\n--- Processing Result ${index + 1} ---`);
        this.processResult(result, index + 1);
      });

      console.log(`\n=== FINAL SUMMARY ===`);
      console.log(`Total edges with support graph attributes: ${this.supportGraphCount}`);
      console.log(`Total processed rows: ${this.allRows.length}`);
      console.log(`Original edges: ${Object.keys(this.edges).length}`);
      console.log(`Support graph edges added: ${this.allRows.length - Object.keys(this.edges).length}`);
      
      return {
        flattenedRows: this.allRows,
        metadata: {
          pk,
          environment,
          timestamp: new Date().toISOString(),
          resultsCount: this.results.length,
          nodesCount: Object.keys(this.nodes).length,
          edgesCount: Object.keys(this.edges).length,
          supportGraphCount: this.supportGraphCount,
          totalProcessedRows: this.allRows.length
        }
      };
    } catch (error) {
      console.error('Error processing knowledge graph:', error);
      throw error;
    }
  }

  processResult(result, resultCounter) {
    // Extract basic result data
    const resultData = this.extractResultData(result, resultCounter);
    
    // Process each analysis and its edge bindings
    result.analyses?.forEach(analysis => {
      const edgeBindings = analysis.edge_bindings || {};
      
      Object.keys(edgeBindings).forEach(edgeBindingKey => {
        const edgeObjects = edgeBindings[edgeBindingKey];
        
        edgeObjects.forEach(edgeObject => {
          const edgeId = edgeObject.id;
          this.processEdge(resultData, edgeId);
        });
      });
    });
  }

  extractResultData(result, resultCounter) {
    // Get node information
    const nodeBindings = result.node_bindings || {};
    const nodeBindingKeys = Object.keys(nodeBindings);
    
    console.log('Node binding keys:', nodeBindingKeys);
    
    let result_subjectNode_name = 'N/A';
    let result_subjectNode_id = 'N/A';
    let result_objectNode_name = 'N/A';
    let result_objectNode_id = 'N/A';

    // Extract node data - handle specific node binding keys like 'on' and 'sn'
    nodeBindingKeys.forEach((key) => {
      const nodeGroupArray = nodeBindings[key];
      if (nodeGroupArray && nodeGroupArray.length > 0) {
        const nodeId = nodeGroupArray[0].id;
        const node = this.nodes[nodeId];
        
        console.log(`Processing key: ${key}, nodeId: ${nodeId}, nodeName: ${node?.name}`);
        
        // Handle specific node binding keys
        if (key === 'on' || key === 'object_node') {
          result_objectNode_id = nodeId;
          result_objectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as object node: ${node?.name}`);
        } else if (key === 'sn' || key === 'subject_node') {
          result_subjectNode_id = nodeId;
          result_subjectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as subject node: ${node?.name}`);
        }
        // Handle traditional n0/n1 patterns
        else if (key === 'n0' || key === 'n00') {
          result_objectNode_id = nodeId;
          result_objectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as object node: ${node?.name}`);
        } else if (key === 'n1' || key === 'n01') {
          result_subjectNode_id = nodeId;
          result_subjectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as subject node: ${node?.name}`);
        }
        // Handle other possible key patterns
        else if (key.includes('0') || key.includes('object')) {
          result_objectNode_id = nodeId;
          result_objectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as object node (fallback): ${node?.name}`);
        } else if (key.includes('1') || key.includes('subject')) {
          result_subjectNode_id = nodeId;
          result_subjectNode_name = node?.name || 'N/A';
          console.log(`✓ Assigned ${key} (${nodeId}) as subject node (fallback): ${node?.name}`);
        }
      }
    });

    console.log('Extracted result data:', {
      result_subjectNode_name,
      result_subjectNode_id,
      result_objectNode_name,
      result_objectNode_id
    });

    return {
      pk: 'pk-placeholder',
      result_subjectNode_name,
      result_subjectNode_id,
      result_objectNode_name,
      result_objectNode_id,
      result_counter: resultCounter
    };
  }

  processEdge(resultData, edgeId) {
    try {
      const edge = this.edges[edgeId];
      if (!edge) {
        console.warn(`Edge ${edgeId} not found in knowledge graph`);
        return;
      }

      // Process the main edge
      const edgeData = this.extractEdgeData(edge, edgeId);
      const combinedData = { ...resultData, ...edgeData };
      this.allRows.push(combinedData);

      // Process support graphs if they exist
      this.processSupportGraphs(resultData, edge, edgeId);
    } catch (error) {
      console.error(`Error processing edge ${edgeId}:`, error);
    }
  }

  processSupportGraphs(resultData, edge, edgeId) {
    console.log("Running processSupportGraphs");
    const attributes = edge.attributes || [];
    let supportGraphsFound = 0;
    let totalSupportEdges = 0;
    
    attributes.forEach(attribute => {
      console.log("attribute", attribute);
      if (attribute.attribute_type_id === 'biolink:support_graphs') {
        console.log("Found support graph");
        this.supportGraphCount++;
        supportGraphsFound++;
        
        const supportGraphIds = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
        
        supportGraphIds.forEach(graphId => {
          console.log("Processing support graph");
          const supportGraph = this.auxiliary_graphs[graphId];
          if (supportGraph && supportGraph.edges) {
            totalSupportEdges += supportGraph.edges.length;
            
            supportGraph.edges.forEach(supportEdgeId => {
              this.processSupportEdge(resultData, supportEdgeId, graphId);
            });
          } else {
            console.log(`❌ Support graph ${graphId} not found in auxiliary_graphs`);
          }
        });
      }
    });
    
    if (supportGraphsFound > 0) {
      console.log(`Edge ${edgeId}: Found ${supportGraphsFound} support graphs, processed ${totalSupportEdges} support edges`);
    }
  }

  processSupportEdge(resultData, supportEdgeId, graphId) {
    try {
      console.log(`\n🔍 DEBUG: Processing support edge ID: "${supportEdgeId}" from graph: ${graphId}`);
      
      // Try to find the actual edge data in the auxiliary graph
      const supportGraph = this.auxiliary_graphs[graphId];
      if (!supportGraph || !supportGraph.edges) {
        console.log(`❌ Support graph ${graphId} not found or has no edges`);
        return;
      }
      
      console.log(`🔍 DEBUG: Support graph ${graphId} structure:`, {
        hasEdges: !!supportGraph.edges,
        edgesType: typeof supportGraph.edges,
        edgesKeys: Array.isArray(supportGraph.edges) ? 'Array' : Object.keys(supportGraph.edges),
        edgesLength: Array.isArray(supportGraph.edges) ? supportGraph.edges.length : Object.keys(supportGraph.edges).length
      });
      
      // Look for the edge data in the support graph
      let edgeData = null;
      
      if (Array.isArray(supportGraph.edges)) {
        // If edges is an array, check if the support edge ID exists in the array
        if (supportGraph.edges.includes(supportEdgeId)) {
          // The support edge ID exists in the auxiliary graph, now look up the actual edge data
          // in the main knowledge graph's edges object
          edgeData = this.edges[supportEdgeId];
          if (!edgeData) {
            console.log(`❌ Edge ${supportEdgeId} found in auxiliary graph but not in main edges object`);
            return;
          }
        }
      } else {
        // If edges is an object, try direct lookup using the support edge ID as key
        edgeData = supportGraph.edges[supportEdgeId];
      }
      
      if (!edgeData) {
        console.log(`❌ Edge ${supportEdgeId} not found in support graph ${graphId}`);
        if (Array.isArray(supportGraph.edges)) {
          console.log(`🔍 DEBUG: Available edges (first 3):`, supportGraph.edges.slice(0, 3));
        } else {
          console.log(`🔍 DEBUG: Available edge keys:`, Object.keys(supportGraph.edges).slice(0, 5));
        }
        return;
      }
      
      console.log(`🔍 DEBUG: Found edge data:`, edgeData);
      
      // Extract edge information from the edge data
      let subject = 'Unknown';
      let object = 'Unknown';
      let predicate = 'Unknown';
      let primary_source = 'N/A';
      
      if (typeof edgeData === 'object' && edgeData !== null) {
        // edgeData is an edge object with subject, object, predicate properties
        subject = edgeData.subject || 'Unknown';
        object = edgeData.object || 'Unknown';
        predicate = edgeData.predicate || 'Unknown';
        
        // Extract primary source from sources array
        if (edgeData.sources && Array.isArray(edgeData.sources)) {
          const primarySource = edgeData.sources.find(source => source.resource_role === 'primary_knowledge_source');
          if (primarySource) {
            primary_source = primarySource.resource_id;
          }
        }
      } else if (typeof edgeData === 'string') {
        // Handle different edge ID formats for string-based edge data
        if (edgeData.includes('--')) {
          // Format: "infores:source:subject--predicate--object--infores:source"
          const parts = edgeData.split('--');
          if (parts.length >= 3) {
            subject = parts[0].split(':').slice(-1)[0]; // Get last part after last colon
            predicate = parts[1];
            object = parts[2].split(':').slice(-1)[0]; // Get last part after last colon
            primary_source = parts.length > 3 ? parts[3] : 'N/A';
          }
        } else if (edgeData.includes('-')) {
          // Format: "expanded-MONDO:0018479-subclass_of-MONDO:0015129"
          const parts = edgeData.split('-');
          if (parts.length >= 3) {
            subject = parts[1]; // MONDO:0018479
            predicate = parts[2]; // subclass_of
            object = parts[3]; // MONDO:0015129
          }
        } else if (edgeData.startsWith('medik:edge#')) {
          // Format: "medik:edge#6" - this is a simple reference
          subject = 'medik_edge';
          predicate = 'reference';
          object = edgeData;
        } else {
          // For hash-based IDs, we can't extract much info
          subject = 'hash_edge';
          predicate = 'reference';
          object = edgeData;
        }
      }
      
      console.log(`🔍 DEBUG: Extracted - Subject: "${subject}", Predicate: "${predicate}", Object: "${object}"`);
      
      // Get node names from the nodes object
      const subjectNode = this.nodes[subject];
      const objectNode = this.nodes[object];
      
      console.log(`🔍 DEBUG: Subject node lookup for "${subject}":`, subjectNode ? `Found: ${subjectNode.name}` : 'NOT FOUND');
      console.log(`🔍 DEBUG: Object node lookup for "${object}":`, objectNode ? `Found: ${objectNode.name}` : 'NOT FOUND');
      
      // Extract publications from edge attributes (following Python pattern)
      let publications = [];
      let publications_count = 0;
      
      if (edgeData.attributes && Array.isArray(edgeData.attributes)) {
        const publicationAttribute = edgeData.attributes.find(
          attr => attr.attribute_type_id === 'biolink:publications'
        );
        if (publicationAttribute) {
          publications = Array.isArray(publicationAttribute.value) ? publicationAttribute.value : [publicationAttribute.value];
          publications_count = publications.length;
        }
      }
      
      const supportEdgeData = {
        edge_id: supportEdgeId,
        edge_object: object,
        edge_subject: subject,
        edge_subjectNode_name: subjectNode?.name || 'Unknown',
        edge_objectNode_name: objectNode?.name || 'Unknown',
        predicate: predicate,
        phrase: `${subjectNode?.name || subject} ${this.cleanPredicate(predicate)} ${objectNode?.name || object}`,
        primary_source: primary_source,
        publications: publications.length > 0 ? publications.join(';') : 'N/A',
        publications_count: publications_count,
        support_graph_id: graphId,
        edge_type: 'support'
      };
      
      const combinedData = { ...resultData, ...supportEdgeData };
      this.allRows.push(combinedData);
      
      console.log(`✅ Added support edge: ${subject} ${predicate} ${object} from graph ${graphId}`);
      console.log(`✅ Support edge data:`, supportEdgeData);
    } catch (error) {
      console.error(`❌ Error processing support edge ${supportEdgeId}:`, error);
    }
  }

  extractEdgeData(edge, edgeId) {
    // Extract basic edge data
    const subjectNode = this.nodes[edge.subject];
    const objectNode = this.nodes[edge.object];
    
    // Extract sources to find primary source
    const sources = edge.sources || [];
    let primary_source = 'N/A';
    
    sources.forEach(source => {
      if (source.resource_role === 'primary_knowledge_source') {
        primary_source = source.resource_id;
      }
    });
    
    // Extract publications from attributes
    const attributes = edge.attributes || [];
    let publications = [];
    
    attributes.forEach(attribute => {
      if (attribute.attribute_type_id === 'biolink:publications') {
        publications = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
      }
    });
    
    // Generate phrase
    const phrase = this.generatePhrase({
      subjectName: subjectNode?.name || 'Unknown',
      objectName: objectNode?.name || 'Unknown',
      predicate: edge.predicate
    });

    return {
      edge_id: edgeId,
      edge_object: edge.object,
      edge_subject: edge.subject,
      edge_subjectNode_name: subjectNode?.name || 'Unknown',
      edge_objectNode_name: objectNode?.name || 'Unknown',
      predicate: edge.predicate,
      phrase: phrase || 'N/A',
      primary_source: primary_source || 'N/A',
      publications: publications.length > 0 ? publications.join(';') : 'N/A',
      publications_count: publications.length,
      edge_type: 'primary'
    };
  }

  generatePhrase(edgeData) {
    const { subjectName, objectName, predicate } = edgeData;
    
    if (!subjectName || !predicate || !objectName) {
      return 'N/A';
    }
    
    // Clean up the predicate for display
    const cleanPredicate = this.cleanPredicate(predicate);
    
    return `${subjectName} ${cleanPredicate} ${objectName}`;
  }

  cleanPredicate(predicate) {
    // Remove biolink: prefix
    let cleanPred = predicate.replace(/^biolink:/, '');
    
    // Replace specific complex predicate
    if (cleanPred === 'treats_or_applied_or_studied_to_treat') {
      return 'studied to treat';
    }
    
    // Replace all underscores with spaces
    cleanPred = cleanPred.replace(/_/g, ' ');
    
    return cleanPred;
  }
}

async function testLocalFile() {
  const filePath = 'data/examplefiles/Addison Disease_b724bec6-e952-4c0e-bd14-e6330a9b8ef3_2025_7_29_19_18.json';
  const pk = 'b724bec6-e952-4c0e-bd14-e6330a9b8ef3';
  const environment = 'prod';
  
  console.log(`Testing simplified data processing with local file: ${filePath}`);
  console.log('='.repeat(60));
  
  try {
    // Load the JSON file
    console.log('Loading JSON file...');
    const data = await fs.readJson(filePath);
    
    console.log('File loaded successfully!');
    console.log('Data structure:', {
      hasFields: !!data.fields,
      hasData: !!data.fields?.data,
      hasMessage: !!data.fields?.data?.message,
      hasResults: !!data.fields?.data?.message?.results,
      hasKnowledgeGraph: !!data.fields?.data?.message?.knowledge_graph,
      resultsCount: data.fields?.data?.message?.results?.length || 0,
      nodesCount: Object.keys(data.fields?.data?.message?.knowledge_graph?.nodes || {}).length,
      edgesCount: Object.keys(data.fields?.data?.message?.knowledge_graph?.edges || {}).length
    });
    
    // Process the data
    console.log('\nProcessing data...');
    const processor = new SimpleDataProcessor();
    const processedData = processor.processKnowledgeGraph(data, pk, environment);
    
    console.log('\n' + '='.repeat(60));
    console.log('TOP 10 ROWS OF SIMPLIFIED DATA:');
    console.log('='.repeat(60));
    
    // Show top 10 rows with key fields
    const top10Rows = processedData.flattenedRows.slice(0, 10);
    top10Rows.forEach((row, index) => {
      console.log(`\n--- Row ${index + 1} ---`);
      console.log(`Result Subject: ${row.result_subjectNode_name} (ID: ${row.result_subjectNode_id})`);
      console.log(`Result Object: ${row.result_objectNode_name} (ID: ${row.result_objectNode_id})`);
      console.log(`Edge: ${row.edge_subject} -> ${row.edge_object}`);
      console.log(`Predicate: ${row.predicate}`);
      console.log(`Phrase: ${row.phrase}`);
      console.log(`Primary Source: ${row.primary_source}`);
      console.log(`Publications: ${row.publications_count} found`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total rows processed: ${processedData.flattenedRows.length}`);
    console.log(`Results count: ${processedData.metadata.resultsCount}`);
    console.log(`Nodes count: ${processedData.metadata.nodesCount}`);
    console.log(`Edges count: ${processedData.metadata.edgesCount}`);
    
    // Show unique node binding keys found
    const allNodeBindingKeys = new Set();
    processedData.flattenedRows.forEach(row => {
      if (row.result_subjectNode_id !== 'N/A') allNodeBindingKeys.add('subject');
      if (row.result_objectNode_id !== 'N/A') allNodeBindingKeys.add('object');
    });
    console.log(`Node types found: ${Array.from(allNodeBindingKeys).join(', ')}`);
    
    // Save the processed data to a new file for inspection
    const outputPath = 'data/exports/processed-simplified-data.json';
    await fs.writeJson(outputPath, processedData.flattenedRows, { spaces: 2 });
    console.log(`\nProcessed data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testLocalFile(); 