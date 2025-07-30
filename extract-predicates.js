const fs = require('fs-extra');

async function extractUniquePredicates() {
  try {
    // Load the processed data
    const data = await fs.readJson('data/exports/processed-simplified-data.json');
    
    // Extract unique predicates
    const uniquePredicates = [...new Set(data.map(row => row.predicate))];
    
    // Sort alphabetically
    uniquePredicates.sort();
    
    console.log('='.repeat(60));
    console.log('UNIQUE PREDICATES FOUND:');
    console.log('='.repeat(60));
    console.log(`Total unique predicates: ${uniquePredicates.length}`);
    console.log('');
    
    uniquePredicates.forEach((predicate, index) => {
      console.log(`${index + 1}. ${predicate}`);
    });
    
    // Count occurrences of each predicate
    console.log('\n' + '='.repeat(60));
    console.log('PREDICATE FREQUENCY:');
    console.log('='.repeat(60));
    
    const predicateCounts = {};
    data.forEach(row => {
      predicateCounts[row.predicate] = (predicateCounts[row.predicate] || 0) + 1;
    });
    
    // Sort by frequency (descending)
    const sortedPredicates = Object.entries(predicateCounts)
      .sort(([,a], [,b]) => b - a);
    
    sortedPredicates.forEach(([predicate, count]) => {
      console.log(`${predicate}: ${count} occurrences`);
    });
    
  } catch (error) {
    console.error('Error extracting predicates:', error);
  }
}

// Run the script
extractUniquePredicates(); 