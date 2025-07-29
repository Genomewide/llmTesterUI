const axios = require('axios');

// Simplified DataProcessor for testing
class SimpleDataProcessor {
  constructor() {
    this.allRows = [];
    this.edges = {};
    this.nodes = {};
    this.results = [];
  }

  processKnowledgeGraph(data, pk, environment) {
    console.log('Starting simplified data processing...');
    
    // Reset state
    this.allRows = [];
    this.edges = {};
    this.nodes = {};
    this.results = [];

    try {
      // Extract data from API response
      let message;
      if (data.message) {
        if (typeof data.message === 'string') {
          try {
            message = JSON.parse(data.message);
          } catch (parseError) {
            message = data.message;
          }
        } else {
          message = data.message;
        }
        
        if (Array.isArray(message)) {
          const messageWithResults = message.find(m => m.results && m.results.length > 0);
          if (messageWithResults) {
            message = messageWithResults;
          } else {
            message = message[0] || {};
          }
        }
      } else if (data.fields?.data?.message) {
        message = data.fields.data.message;
      } else {
        throw new Error('Invalid API response structure');
      }

      this.results = message.results || [];
      this.edges = message.knowledge_graph?.edges || {};
      this.nodes = message.knowledge_graph?.nodes || {};

      console.log(`Processing ${this.results.length} results, ${Object.keys(this.nodes).length} nodes, ${Object.keys(this.edges).length} edges`);

      // Process each result
      this.results.forEach((result, index) => {
        console.log(`\n--- Processing Result ${index + 1} ---`);
        this.processResult(result, index + 1);
      });

      return {
        flattenedRows: this.allRows,
        metadata: {
          pk,
          environment,
          timestamp: new Date().toISOString(),
          resultsCount: this.results.length,
          nodesCount: Object.keys(this.nodes).length,
          edgesCount: Object.keys(this.edges).length
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

      const edgeData = this.extractEdgeData(edge, edgeId);
      const combinedData = { ...resultData, ...edgeData };
      this.allRows.push(combinedData);
    } catch (error) {
      console.error(`Error processing edge ${edgeId}:`, error);
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
      predicate: edge.predicate,
      phrase: phrase || 'N/A',
      primary_source: primary_source || 'N/A',
      publications: publications.length > 0 ? publications.join(';') : 'N/A',
      publications_count: publications.length
    };
  }

  generatePhrase(edgeData) {
    const { subjectName, objectName, predicate } = edgeData;
    
    if (!subjectName || !predicate || !objectName) {
      return 'N/A';
    }
    
    return `${subjectName} ${predicate} ${objectName}`;
  }
}

// ARS API Service
class ARSApiService {
  constructor(environment = 'prod') {
    this.environment = environment;
    this.baseUrl = this.getEnvironmentUrl(environment);
  }

  getEnvironmentUrl(environment) {
    const environments = {
      'test': 'https://ars.test.transltr.io',
      'CI': 'https://ars.ci.transltr.io',
      'dev': 'https://ars-dev.transltr.io',
      'prod': 'https://ars-prod.transltr.io'
    };
    return environments[environment] || environments['prod'];
  }

  async fetchMessage(pk) {
    try {
      console.log(`Fetching message with PK: ${pk}`);
      console.log(`API URL: ${this.baseUrl}/ars/api/messages/${pk}?trace=y`);
      
      const response = await axios.get(`${this.baseUrl}/ars/api/messages/${pk}?trace=y`);
      
      console.log('API Response received:', {
        status: response.status,
        dataKeys: Object.keys(response.data),
        hasMessage: !!response.data.message
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching message:', error.message);
      throw error;
    }
  }
}

async function testSimpleProcessing() {
  const pk = 'b724bec6-e952-4c0e-bd14-e6330a9b8ef3';
  const environment = 'prod';
  
  console.log(`Testing simplified data processing with PK: ${pk} in environment: ${environment}`);
  console.log('='.repeat(60));
  
  try {
    // Fetch data from ARS API
    const arsService = new ARSApiService(environment);
    console.log('Fetching data from ARS API...');
    let data = await arsService.fetchMessage(pk);
    
    console.log('Data fetched successfully!');
    console.log('Message type:', typeof data.message);
    console.log('Message value:', data.message);
    console.log('Merged version:', data.message?.merged_version);
    
    // Check if we need to fetch merged version
    if (data.message?.merged_version) {
      console.log(`Found merged version: ${data.message.merged_version}`);
      console.log('Fetching merged data...');
      const mergedData = await arsService.fetchMessage(data.message.merged_version);
      data = mergedData;
    } else if (typeof data.message === 'string' && data.message.includes('-') && data.message !== pk) {
      console.log(`Message is a UUID: ${data.message}`);
      console.log('Fetching actual message data...');
      const messageData = await arsService.fetchMessage(data.message);
      data = messageData;
    }
    
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
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testSimpleProcessing(); 