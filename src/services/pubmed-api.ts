import { AbstractData, BasicMetadata } from '../types';

export class PubMedApiService {
  private cache = new Map<string, AbstractData>();

  constructor(apiKey?: string) {
    // API key not used in Electron version, but kept for compatibility
  }

  /**
   * Fetch basic metadata for PubMed IDs
   */
  async fetchBasicMetadata(pubmedIds: string[]): Promise<BasicMetadata[]> {
    if (pubmedIds.length === 0) return [];

    try {
      const uniqueIds = Array.from(new Set(pubmedIds));
      console.log('🔬 fetchBasicMetadata called with', uniqueIds.length, 'unique IDs');
      
      // Use Electron IPC to fetch metadata
      const response = await window.electronAPI.fetchPubMedMetadata(uniqueIds);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch metadata');
      }
      
      console.log('✅ fetchBasicMetadata completed, returning', response.data.length, 'results');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching basic metadata:', error);
      throw new Error(`Failed to fetch basic metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch full abstracts with all required fields
   */
  async fetchAbstracts(pubmedIds: string[]): Promise<AbstractData[]> {
    if (pubmedIds.length === 0) return [];

    try {
      const uniqueIds = Array.from(new Set(pubmedIds));
      console.log('📄 fetchAbstracts called with', uniqueIds.length, 'unique IDs');
      
      // Use Electron IPC to fetch abstracts
      const response = await window.electronAPI.fetchPubMedAbstracts(uniqueIds);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch abstracts');
      }
      
      console.log('✅ fetchAbstracts completed, returning', response.data.length, 'results');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching abstracts:', error);
      throw new Error(`Failed to fetch abstracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch top N most recent abstracts
   */
  async fetchTopRecentAbstracts(pubmedIds: string[], limit: number = 3): Promise<AbstractData[]> {
    try {
      console.log('🔬 fetchTopRecentAbstracts called with', pubmedIds.length, 'IDs, limit:', limit);
      // 1. Fetch basic metadata for all publications
      const allMetadata = await this.fetchBasicMetadata(pubmedIds);
      
      // 2. Sort by publication date (most recent first)
      const sortedMetadata = allMetadata.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
      
      console.log('📅 Sorted metadata by date, found', sortedMetadata.length, 'publications');
      
      // 3. Take top N most recent
      const topRecent = sortedMetadata.slice(0, limit);
      console.log('🏆 Selected top', limit, 'most recent publications:', topRecent.map(m => m.pubmedId));
      
      // 4. Fetch full abstracts for the top N
      const topRecentIds = topRecent.map(m => m.pubmedId);
      const abstracts = await this.fetchAbstracts(topRecentIds);
      
      console.log('✅ fetchTopRecentAbstracts completed, returning', abstracts.length, 'abstracts');
      return abstracts;
    } catch (error) {
      console.error('❌ Error fetching top recent abstracts:', error);
      throw new Error(`Failed to fetch top recent abstracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse PubMed IDs from various formats
   */
  parsePubMedIds(publications: string): string[] {
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

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
