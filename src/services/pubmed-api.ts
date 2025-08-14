import axios from 'axios';

export interface BasicMetadata {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
}

export interface AbstractData {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
  abstract: string;
}

export class PubMedApiService {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  private apiKey?: string;
  private cache = new Map<string, AbstractData>();
  private rateLimitDelay = 350; // 350ms between requests (allows max 3 requests/second)

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch basic metadata for sorting and display
   */
  async fetchBasicMetadata(pubmedIds: string[]): Promise<BasicMetadata[]> {
    if (pubmedIds.length === 0) return [];

    try {
      const uniqueIds = Array.from(new Set(pubmedIds));
      const results: BasicMetadata[] = [];

      // Process in smaller batches to respect rate limits
      for (let i = 0; i < uniqueIds.length; i += 10) {
        const batch = uniqueIds.slice(i, i + 10);
        const batchResults = await this.fetchBatchMetadata(batch);
        results.push(...batchResults);
        
        // Rate limiting
        if (i + 10 < uniqueIds.length) {
          await this.delay(this.rateLimitDelay);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching basic metadata:', error);
      throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch full abstracts with all required fields
   */
  async fetchAbstracts(pubmedIds: string[]): Promise<AbstractData[]> {
    if (pubmedIds.length === 0) return [];

    try {
      const uniqueIds = Array.from(new Set(pubmedIds));
      const results: AbstractData[] = [];

      // Process in smaller batches to respect rate limits
      for (let i = 0; i < uniqueIds.length; i += 10) {
        const batch = uniqueIds.slice(i, i + 10);
        const batchResults = await this.fetchBatchAbstracts(batch);
        results.push(...batchResults);
        
        // Rate limiting
        if (i + 10 < uniqueIds.length) {
          await this.delay(this.rateLimitDelay);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching abstracts:', error);
      throw new Error(`Failed to fetch abstracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch top N most recent abstracts
   */
  async fetchTopRecentAbstracts(pubmedIds: string[], limit: number = 3): Promise<AbstractData[]> {
    try {
      // 1. Fetch basic metadata for all publications
      const allMetadata = await this.fetchBasicMetadata(pubmedIds);
      
      // 2. Sort by publication date (most recent first)
      const sortedMetadata = allMetadata.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
      
      // 3. Take top N most recent
      const topRecent = sortedMetadata.slice(0, limit);
      
      // 4. Fetch full abstracts for the top N
      const topRecentIds = topRecent.map(m => m.pubmedId);
      const abstracts = await this.fetchAbstracts(topRecentIds);
      
      return abstracts;
    } catch (error) {
      console.error('Error fetching top recent abstracts:', error);
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
   * Fetch metadata for a batch of PubMed IDs
   */
  private async fetchBatchMetadata(pubmedIds: string[]): Promise<BasicMetadata[]> {
    try {
      const idList = pubmedIds.join(',');
      const params = new URLSearchParams({
        db: 'pubmed',
        id: idList,
        retmode: 'xml',
        rettype: 'abstract',
        tool: 'llmTesterUI',
        email: 'user@example.com' // Required by NCBI
      });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}esummary.fcgi?${params}`);
      
      if (response.status !== 200) {
        if (response.status === 429) {
          throw new Error('PubMed API rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`PubMed API error: ${response.status}`);
      }

      return this.parseMetadataFromXML(response.data, pubmedIds);
    } catch (error) {
      console.error('Error fetching batch metadata:', error);
      return [];
    }
  }

  /**
   * Fetch abstracts for a batch of PubMed IDs
   */
  private async fetchBatchAbstracts(pubmedIds: string[]): Promise<AbstractData[]> {
    try {
      const idList = pubmedIds.join(',');
      const params = new URLSearchParams({
        db: 'pubmed',
        id: idList,
        retmode: 'xml',
        rettype: 'abstract',
        tool: 'llmTesterUI',
        email: 'user@example.com' // Required by NCBI
      });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}efetch.fcgi?${params}`);
      
      if (response.status !== 200) {
        if (response.status === 429) {
          throw new Error('PubMed API rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`PubMed API error: ${response.status}`);
      }

      return this.parseAbstractsFromXML(response.data, pubmedIds);
    } catch (error) {
      console.error('Error fetching batch abstracts:', error);
      return [];
    }
  }

  /**
   * Parse metadata from PubMed XML response
   */
  private parseMetadataFromXML(xmlData: string, pubmedIds: string[]): BasicMetadata[] {
    const results: BasicMetadata[] = [];
    
    // Simple XML parsing (in production, use a proper XML parser)
    const docSumRegex = /<DocSum>([\s\S]*?)<\/DocSum>/g;
    let match;
    
    while ((match = docSumRegex.exec(xmlData)) !== null) {
      const docSum = match[1];
      
      // Extract ID
      const idMatch = docSum.match(/<Id>(\d+)<\/Id>/);
      if (!idMatch) continue;
      
      const pubmedId = idMatch[1];
      
      // Extract title
      const titleMatch = docSum.match(/<Item Name="Title" Type="String">([^<]+)<\/Item>/);
      const title = titleMatch ? titleMatch[1] : 'Unknown Title';
      
      // Extract journal
      const journalMatch = docSum.match(/<Item Name="FullJournalName" Type="String">([^<]+)<\/Item>/);
      const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
      
      // Extract publication date
      const dateMatch = docSum.match(/<Item Name="PubDate" Type="String">([^<]+)<\/Item>/);
      const publicationDate = dateMatch ? dateMatch[1] : new Date().toISOString();
      
      results.push({
        pubmedId,
        title,
        journal,
        publicationDate
      });
    }
    
    return results;
  }

  /**
   * Parse abstracts from PubMed XML response
   */
  private parseAbstractsFromXML(xmlData: string, pubmedIds: string[]): AbstractData[] {
    const results: AbstractData[] = [];
    
    // Simple XML parsing (in production, use a proper XML parser)
    const pubmedArticleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match;
    
    while ((match = pubmedArticleRegex.exec(xmlData)) !== null) {
      const article = match[1];
      
      // Extract PMID
      const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      if (!pmidMatch) continue;
      
      const pubmedId = pmidMatch[1];
      
      // Extract title
      const titleMatch = article.match(/<ArticleTitle[^>]*>([^<]+)<\/ArticleTitle>/);
      const title = titleMatch ? titleMatch[1] : 'Unknown Title';
      
      // Extract journal
      const journalMatch = article.match(/<Journal>[\s\S]*?<Title>([^<]+)<\/Title>/);
      const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
      
      // Extract publication date
      const yearMatch = article.match(/<PubDate>[\s\S]*?<Year>(\d+)<\/Year>/);
      const monthMatch = article.match(/<PubDate>[\s\S]*?<Month>(\d+)<\/Month>/);
      const dayMatch = article.match(/<PubDate>[\s\S]*?<Day>(\d+)<\/Day>/);
      
      let publicationDate = new Date().toISOString();
      if (yearMatch) {
        const year = yearMatch[1];
        const month = monthMatch ? monthMatch[1] : '01';
        const day = dayMatch ? dayMatch[1] : '01';
        publicationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
      }
      
      // Extract abstract
      const abstractMatch = article.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
      const abstract = abstractMatch ? abstractMatch[1] : 'No abstract available';
      
      results.push({
        pubmedId,
        title,
        journal,
        publicationDate,
        abstract
      });
    }
    
    return results;
  }

  /**
   * Utility function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
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
