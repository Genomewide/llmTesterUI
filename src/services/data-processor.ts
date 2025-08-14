import { ARSNode, ARSEdge, ARSResult, ProcessedData } from '../types';
import { PubMedApiService } from './pubmed-api';

export class DataProcessor {
  private allRows: any[] = [];
  private edges: Record<string, ARSEdge> = {};
  private nodes: Record<string, ARSNode> = {};
  private auxiliary_graphs: Record<string, any> = {};
  private results: ARSResult[] = [];
  private supportGraphCount: number = 0;

  /**
   * Process the raw ARS API response into flattened data
   */
  async processKnowledgeGraph(data: any, pk: string, environment: string): Promise<ProcessedData> {
    return this.processWithAbstracts(data, pk, environment, false);
  }

  /**
   * Process the raw ARS API response into flattened data with optional abstract enrichment
   */
  async processWithAbstracts(
    data: any, 
    pk: string, 
    environment: string, 
    includeAbstracts: boolean = false, 
    abstractLimit?: number
  ): Promise<ProcessedData> {
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
      this.auxiliary_graphs = message.auxiliary_graphs || {};
      this.supportGraphCount = 0;

      console.log(`Processing ${this.results.length} results, ${Object.keys(this.nodes).length} nodes, ${Object.keys(this.edges).length} edges`);

      // Process each result
      this.results.forEach((result: ARSResult, resultIndex: number) => {
        this.processResult(result, resultIndex + 1);
      });

      // Enrich with abstracts if requested
      if (includeAbstracts) {
        await this.enrichWithAbstracts(this.allRows, abstractLimit);
      }

      const metadata = {
        pk,
        environment,
        timestamp: new Date().toISOString(),
        resultsCount: this.results.length,
        nodesCount: Object.keys(this.nodes).length,
        edgesCount: Object.keys(this.edges).length,
        supportGraphCount: this.supportGraphCount,
        totalProcessedRows: this.allRows.length
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
      console.log("Running processEdge");
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

  /**
   * Process support graphs for an edge
   */
  private processSupportGraphs(resultData: any, edge: ARSEdge, edgeId: string): void {
    console.log("Running processSupportGraphs");
    const attributes = edge.attributes || [];
    let supportGraphsFound = 0;
    let totalSupportEdges = 0;
    
    attributes.forEach((attribute: any) => {
      if (attribute.attribute_type_id === 'biolink:support_graphs') {
        this.supportGraphCount++;
        supportGraphsFound++;
        
        const supportGraphIds = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
        
        supportGraphIds.forEach((graphId: string) => {
          const supportGraph = this.auxiliary_graphs[graphId];
          if (supportGraph && supportGraph.edges) {
            totalSupportEdges += supportGraph.edges.length;
            
            supportGraph.edges.forEach((supportEdgeId: string) => {
              this.processSupportEdge(resultData, supportEdgeId, graphId);
            });
          }
        });
      }
    });
    
    if (supportGraphsFound > 0) {
      console.log(`Edge ${edgeId}: Found ${supportGraphsFound} support graphs, processed ${totalSupportEdges} support edges`);
    }
  }

  /**
   * Process a single edge from a support graph
   */
  private processSupportEdge(resultData: any, supportEdgeId: string, graphId: string): void {
    try {
      // Try to find the actual edge data in the auxiliary graph
      const supportGraph = this.auxiliary_graphs[graphId];
      if (!supportGraph || !supportGraph.edges) {
        console.log(`❌ Support graph ${graphId} not found or has no edges`);
        return;
      }
      
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
        return;
      }
      
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
          const primarySource = edgeData.sources.find((source: any) => source.resource_role === 'primary_knowledge_source');
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
      
      // Get node names from the nodes object
      const subjectNode = this.nodes[subject];
      const objectNode = this.nodes[object];
      
      // Extract publications from edge attributes (following Python pattern)
      let publications: string[] = [];
      let publications_count = 0;
      
      if (edgeData.attributes && Array.isArray(edgeData.attributes)) {
        const publicationAttribute = edgeData.attributes.find(
          (attr: any) => attr.attribute_type_id === 'biolink:publications'
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
    } catch (error) {
      console.error(`❌ Error processing support edge ${supportEdgeId}:`, error);
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

  /**
   * Generate a human-readable phrase from edge data
   */
  private generatePhrase(edgeData: any): string {
    const { subjectName, objectName, predicate } = edgeData;
    
    if (!subjectName || !predicate || !objectName) {
      return 'N/A';
    }
    
    // Clean up the predicate for display
    const cleanPredicate = this.cleanPredicate(predicate);
    
    return `${subjectName} ${cleanPredicate} ${objectName}`;
  }

  /**
   * Clean up predicate for display
   */
  private cleanPredicate(predicate: string): string {
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

  /**
   * Enrich flattened rows with abstracts
   */
  private async enrichWithAbstracts(flattenedRows: any[], abstractLimit?: number): Promise<void> {
    const pubmedApi = new PubMedApiService();
    
    for (const row of flattenedRows) {
      if (row.publications && row.publications !== 'N/A') {
        const pubmedIds = this.extractPubMedIds(row.publications);
        
        if (pubmedIds.length > 0) {
          try {
            // Fetch abstracts based on limit preference
            const abstracts = abstractLimit 
              ? await pubmedApi.fetchTopRecentAbstracts(pubmedIds, abstractLimit)
              : await pubmedApi.fetchAbstracts(pubmedIds);
            
            row.abstracts = abstracts;
            row.abstract_count = abstracts.length;
          } catch (error) {
            console.warn(`Failed to fetch abstracts for row: ${row.edge_id}`, error);
            row.abstracts = [];
            row.abstract_count = 0;
          }
        }
      }
    }
  }

  /**
   * Extract PubMed IDs from publication strings
   */
  private extractPubMedIds(publications: string): string[] {
    if (!publications || publications === 'N/A') return [];

    // Split by common delimiters
    const parts = publications.split(/[;,\s]+/);
    
    return parts
      .map(part => part.trim())
      .filter(part => {
        // Extract PubMed ID from various formats
        const pubmedMatch = part.match(/pubmed:?(\d+)/i);
        if (pubmedMatch) {
          return pubmedMatch[1];
        }
        
        // Check if it's just a number (assume it's a PubMed ID)
        if (/^\d+$/.test(part)) {
          return part;
        }
        
        return null;
      })
      .filter(Boolean) as string[];
  }
} 