const fs = require('fs-extra');

async function showCleanedPredicates() {
  try {
    // Load the processed data
    const data = await fs.readJson('data/exports/processed-simplified-data.json');
    
    // Extract unique cleaned predicates from phrases
    const uniqueCleanedPredicates = [...new Set(data.map(row => {
      const phrase = row.phrase;
      const parts = phrase.split(' ');
      // Find the predicate part (usually the middle part)
      if (parts.length >= 3) {
        // Remove the first part (subject) and last part (object) to get predicate
        return parts.slice(1, -1).join(' ');
      }
      return 'unknown';
    }))];
    
    // Sort alphabetically
    uniqueCleanedPredicates.sort();
    
    console.log('='.repeat(60));
    console.log('CLEANED PREDICATES USED IN PHRASES:');
    console.log('='.repeat(60));
    console.log(`Total unique cleaned predicates: ${uniqueCleanedPredicates.length}`);
    console.log('');
    
    uniqueCleanedPredicates.forEach((predicate, index) => {
      console.log(`${index + 1}. "${predicate}"`);
    });
    
    // Count occurrences of each cleaned predicate
    console.log('\n' + '='.repeat(60));
    console.log('CLEANED PREDICATE FREQUENCY:');
    console.log('='.repeat(60));
    
    const cleanedPredicateCounts = {};
    data.forEach(row => {
      const phrase = row.phrase;
      const parts = phrase.split(' ');
      if (parts.length >= 3) {
        const cleanedPred = parts.slice(1, -1).join(' ');
        cleanedPredicateCounts[cleanedPred] = (cleanedPredicateCounts[cleanedPred] || 0) + 1;
      }
    });
    
    // Sort by frequency (descending)
    const sortedCleanedPredicates = Object.entries(cleanedPredicateCounts)
      .sort(([,a], [,b]) => b - a);
    
    sortedCleanedPredicates.forEach(([predicate, count]) => {
      console.log(`"${predicate}": ${count} occurrences`);
    });
    
    // Show some example phrases
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE PHRASES:');
    console.log('='.repeat(60));
    
    const examples = data.slice(0, 10);
    examples.forEach((row, index) => {
      console.log(`${index + 1}. ${row.phrase}`);
    });
    
  } catch (error) {
    console.error('Error showing cleaned predicates:', error);
  }
}

// Run the script
showCleanedPredicates(); 