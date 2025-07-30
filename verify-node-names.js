const fs = require('fs-extra');

async function verifyNodeNames() {
  try {
    // Load the processed data
    const data = await fs.readJson('data/exports/processed-simplified-data.json');
    
    console.log('='.repeat(60));
    console.log('VERIFYING NODE NAME FIELDS:');
    console.log('='.repeat(60));
    
    // Check if fields exist
    const hasSubjectNodeName = data.every(row => 'edge_subjectNode_name' in row);
    const hasObjectNodeName = data.every(row => 'edge_objectNode_name' in row);
    
    console.log(`✅ edge_subjectNode_name field present: ${hasSubjectNodeName}`);
    console.log(`✅ edge_objectNode_name field present: ${hasObjectNodeName}`);
    
    // Show examples
    console.log('\n📋 EXAMPLES:');
    console.log('='.repeat(60));
    
    // Primary edge example
    const primaryEdge = data.find(row => row.edge_type === 'primary');
    if (primaryEdge) {
      console.log('🔵 PRIMARY EDGE EXAMPLE:');
      console.log(`  Subject ID: ${primaryEdge.edge_subject}`);
      console.log(`  Subject Name: ${primaryEdge.edge_subjectNode_name}`);
      console.log(`  Object ID: ${primaryEdge.edge_object}`);
      console.log(`  Object Name: ${primaryEdge.edge_objectNode_name}`);
      console.log(`  Predicate: ${primaryEdge.predicate}`);
    }
    
    // Support edge example
    const supportEdge = data.find(row => row.edge_type === 'support');
    if (supportEdge) {
      console.log('\n🟡 SUPPORT EDGE EXAMPLE:');
      console.log(`  Subject ID: ${supportEdge.edge_subject}`);
      console.log(`  Subject Name: ${supportEdge.edge_subjectNode_name}`);
      console.log(`  Object ID: ${supportEdge.edge_object}`);
      console.log(`  Object Name: ${supportEdge.edge_objectNode_name}`);
      console.log(`  Predicate: ${supportEdge.predicate}`);
      console.log(`  Support Graph: ${supportEdge.support_graph_id}`);
    }
    
    // Count non-unknown values
    const nonUnknownSubjectNames = data.filter(row => row.edge_subjectNode_name !== 'Unknown').length;
    const nonUnknownObjectNames = data.filter(row => row.edge_objectNode_name !== 'Unknown').length;
    
    console.log('\n📊 STATISTICS:');
    console.log('='.repeat(60));
    console.log(`Total rows: ${data.length}`);
    console.log(`Rows with valid subject names: ${nonUnknownSubjectNames}`);
    console.log(`Rows with valid object names: ${nonUnknownObjectNames}`);
    console.log(`Success rate: ${((nonUnknownSubjectNames / data.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error verifying node names:', error);
  }
}

// Run the script
verifyNodeNames(); 