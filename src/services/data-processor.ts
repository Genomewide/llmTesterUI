import { ARSNode, ARSEdge, ARSResult, ProcessedData } from '../types';

export class DataProcessor {
  private allRows: any[] = [];
  private edges: Record<string, ARSEdge> = {};
  private nodes: Record<string, ARSNode> = {};
  private auxiliary_graphs: Record<string, any> = {};
  private results: ARSResult[] = [];

  /**
   * Process the raw ARS API response into flattened data
   */
  processKnowledgeGraph(data: any, pk: string, environment: string): ProcessedData {
    console.log('Starting data processing...');
    
    // Reset state
    this.allRows = [];
    this.edges = {};
    this.nodes = {};
    this.auxiliary_graphs = {};

    try {
      // Extract data from API response - handle both direct message and fields.data.message structures
      let message;
      if (data.message) {
        // Check if message is a string that needs to be parsed
        if (typeof data.message === 'string') {
          try {
            message = JSON.parse(data.message);
            console.log('Parsed message from string, keys:', Object.keys(message));
          } catch (parseError) {
            console.error('Failed to parse message string:', parseError);
            message = data.message;
          }
        } else {
          message = data.message;
        }
        
        // Check if message is an array (different structure)
        if (Array.isArray(message)) {
          console.log('Message is an array with', message.length, 'items');
          console.log('First message item keys:', Object.keys(message[0] || {}));
          // Use the first message item that has results
          const messageWithResults = message.find(m => m.results && m.results.length > 0);
          if (messageWithResults) {
            message = messageWithResults;
            console.log('Found message with results:', Object.keys(message));
          } else {
            console.log('No message with results found, using first message');
            message = message[0] || {};
          }
        }
      } else if (data.fields?.data?.message) {
        message = data.fields.data.message;
      } else {
        console.log('Available data keys:', Object.keys(data));
        console.log('Message structure:', JSON.stringify(data.message, null, 2));
        throw new Error('Invalid API response structure - missing message data');
      }

      this.results = message.results || [];
      this.edges = message.knowledge_graph?.edges || {};
      this.nodes = message.knowledge_graph?.nodes || {};
      this.auxiliary_graphs = message.knowledge_graph?.auxiliary_graphs || {};

      console.log(`Processing ${this.results.length} results, ${Object.keys(this.nodes).length} nodes, ${Object.keys(this.edges).length} edges`);

      // Process each result
      this.results.forEach((result: ARSResult, resultIndex: number) => {
        this.processResult(result, resultIndex + 1);
      });

      const metadata = {
        pk,
        environment,
        timestamp: new Date().toISOString(),
        resultsCount: this.results.length,
        nodesCount: Object.keys(this.nodes).length,
        edgesCount: Object.keys(this.edges).length
      };

      console.log(`Processing complete. Generated ${this.allRows.length} flattened rows`);

      return {
        results: this.results,
        edges: this.edges,
        nodes: this.nodes,
        auxiliary_graphs: this.auxiliary_graphs,
        flattenedRows: this.allRows,
        metadata
      };

    } catch (error) {
      console.error('Error processing knowledge graph:', error);
      throw error;
    }
  }

  /**
   * Process a single result and extract all edge data
   */
  private processResult(result: ARSResult, resultCounter: number): void {
    // Extract basic result data
    const resultData = this.extractResultData(result, resultCounter);
    
    // Process each analysis and its edge bindings
    result.analyses?.forEach((analysis: any) => {
      const edgeBindings = analysis.edge_bindings || {};
      
      Object.keys(edgeBindings).forEach(edgeBindingKey => {
        const edgeObjects = edgeBindings[edgeBindingKey];
        
        edgeObjects.forEach((edgeObject: any) => {
          const edgeId = edgeObject.id;
          this.processEdge(resultData, edgeId);
        });
      });
    });
  }

  /**
   * Extract basic result data from a result - simplified to only essential fields
   */
  private extractResultData(result: ARSResult, resultCounter: number): any {
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
      pk: 'pk-placeholder', // Will be set by caller
      result_subjectNode_name,
      result_subjectNode_id,
      result_objectNode_name,
      result_objectNode_id,
      result_counter: resultCounter
    };
  }

  /**
   * Process an edge and extract all its data - simplified to only essential fields
   */
  private processEdge(resultData: any, edgeId: string): void {
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

  /**
   * Extract edge data - simplified to only essential fields
   */
  private extractEdgeData(edge: ARSEdge, edgeId: string): any {
    // Extract basic edge data
    const subjectNode = this.nodes[edge.subject];
    const objectNode = this.nodes[edge.object];
    
    // Extract sources to find primary source
    const sources = edge.sources || [];
    let primary_source = 'N/A';
    
    sources.forEach((source: any) => {
      if (source.resource_role === 'primary_knowledge_source') {
        primary_source = source.resource_id;
      }
    });
    
    // Extract publications from attributes
    const attributes = edge.attributes || [];
    let publications: string[] = [];
    
    attributes.forEach((attribute: any) => {
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

  /**
   * Generate a human-readable phrase from edge data
   */
  private generatePhrase(edgeData: any): string {
    const { subjectName, objectName, predicate } = edgeData;
    
    if (!subjectName || !predicate || !objectName) {
      return 'N/A';
    }
    
    return `${subjectName} ${predicate} ${objectName}`;
  }
} 