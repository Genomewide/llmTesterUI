# 🎯 PubMed Abstract Integration Plan

## 📋 **Project Overview**

Add PubMed abstract fetching functionality to the LLM Tester UI to enhance biomedical data analysis. This will allow users to fetch publication abstracts (title, journal, date, and abstract text) from PubMed IDs found in ARS knowledge graph data, providing richer evidence for LLM analysis.

## 🎯 **Feature Requirements**

### **Core Functionality**
- Fetch abstracts from PubMed API using PubMed IDs extracted from ARS data
- Support two modes: "All Abstracts" and "Top N Most Recent"
- Include only essential fields: title, journal, publication date, and abstract
- Integrate abstract data into the LLM input formatting
- Handle API rate limits and errors gracefully
- Cache abstract data to avoid repeated API calls

### **User Experience Goals**
- **Simple Selection**: Easy toggle between abstract options
- **Progress Feedback**: Clear indication of abstract fetching progress
- **Performance**: Fast fetching with smart caching
- **Error Handling**: Graceful degradation when abstracts unavailable
- **Data Quality**: Only include relevant, recent evidence

## 🏗️ **Technical Architecture**

### **Component Updates Required**
```
App.tsx
├── Add abstract selection state management
├── Pass abstract options to DataFetcher
└── Handle abstract-enriched data

DataFetcher.tsx
├── Add abstract selection UI controls
├── Pass abstract options to data processing
└── Show abstract fetching progress

DataProcessor.ts
├── Add abstract enrichment functionality
├── Integrate PubMed API calls
└── Handle abstract data formatting

SubjectNodeSelector.tsx
├── Add abstract formatting logic
├── Include abstracts in LLM input
└── Handle abstract display options

New: PubMedApiService
├── Handle PubMed API communication
├── Manage rate limiting and caching
└── Provide abstract fetching methods
```

### **Data Flow Changes**
```
Current: ARS API → DataProcessor → Flattened Rows → UI Components
New:     ARS API → DataProcessor → Extract PubMed IDs → PubMed API → Enriched Data → UI Components
```

## 📊 **Phase 1: Core PubMed API Service**

### **1.1 Create PubMed API Service** ⏳
- [ ] **Create `src/services/pubmed-api.ts`**
  - [ ] Implement `PubMedApiService` class
  - [ ] Add PubMed API endpoint configuration
  - [ ] Add rate limiting and error handling
  - [ ] Add caching mechanism for abstracts

- [ ] **Implement core methods**
  - [ ] `fetchBasicMetadata(pubmedIds: string[]): Promise<BasicMetadata[]>`
  - [ ] `fetchAbstracts(pubmedIds: string[]): Promise<AbstractData[]>`
  - [ ] `fetchTopRecentAbstracts(pubmedIds: string[], limit: number): Promise<AbstractData[]>`
  - [ ] `parsePubMedIds(publications: string): string[]`

**Files to Create:**
- `src/services/pubmed-api.ts`

**Dependencies:**
```bash
npm install axios
```

**Code Structure:**
```typescript
interface BasicMetadata {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
}

interface AbstractData {
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

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetchBasicMetadata(pubmedIds: string[]): Promise<BasicMetadata[]> {
    // Fetch minimal data needed for sorting and display
  }

  async fetchAbstracts(pubmedIds: string[]): Promise<AbstractData[]> {
    // Fetch full abstracts with all required fields
  }

  async fetchTopRecentAbstracts(pubmedIds: string[], limit: number = 3): Promise<AbstractData[]> {
    // 1. Fetch basic metadata for all publications
    // 2. Sort by publication date (most recent first)
    // 3. Take top N most recent
    // 4. Fetch full abstracts for the top N
  }

  private parsePubMedIds(publications: string): string[] {
    // Extract PubMed IDs from various formats
  }
}
```

### **1.2 Add Type Definitions** ⏳
- [ ] **Update `src/types/index.ts`**
  - [ ] Add `AbstractData` interface
  - [ ] Add `BasicMetadata` interface
  - [ ] Update `ProcessedData` interface to include abstracts
  - [ ] Add abstract-related props to component interfaces

**Type Updates:**
```typescript
export interface AbstractData {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
  abstract: string;
}

export interface ProcessedData {
  // ... existing fields
  flattenedRows: Array<{
    // ... existing fields
    publications: string;
    publications_count: number;
    abstracts?: AbstractData[];
    abstract_count?: number;
  }>;
}
```

## 🔧 **Phase 2: Enhanced Data Processing**

### **2.1 Update DataProcessor** ⏳
- [ ] **Enhance `src/services/data-processor.ts`**
  - [ ] Add `processWithAbstracts` method
  - [ ] Add `enrichWithAbstracts` method
  - [ ] Add `extractPubMedIds` method
  - [ ] Integrate PubMed API service

- [ ] **Add abstract processing logic**
  - [ ] Extract PubMed IDs from publication strings
  - [ ] Fetch abstracts based on user preferences
  - [ ] Handle API errors gracefully
  - [ ] Add progress tracking

**Method Signatures:**
```typescript
class DataProcessor {
  async processWithAbstracts(
    data: any, 
    pk: string, 
    environment: string, 
    includeAbstracts: boolean = false, 
    abstractLimit?: number
  ): Promise<ProcessedData>

  private async enrichWithAbstracts(
    flattenedRows: any[], 
    abstractLimit?: number
  ): Promise<void>

  private extractPubMedIds(publications: string): string[]
}
```

### **2.2 Abstract Enrichment Logic** ⏳
- [ ] **Implement enrichment workflow**
  - [ ] Process each flattened row
  - [ ] Extract PubMed IDs from publications field
  - [ ] Fetch abstracts using PubMed API
  - [ ] Add abstracts to row data
  - [ ] Handle missing or invalid PubMed IDs

**Implementation:**
```typescript
private async enrichWithAbstracts(flattenedRows: any[], abstractLimit?: number): Promise<void> {
  const pubmedApi = new PubMedApiService();
  
  for (const row of flattenedRows) {
    if (row.publications && row.publications !== 'N/A') {
      const pubmedIds = this.extractPubMedIds(row.publications);
      
      if (pubmedIds.length > 0) {
        try {
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
```

## 🎨 **Phase 3: UI Integration**

### **3.1 Update DataFetcher Component** ⏳
- [ ] **Enhance `src/components/DataFetcher.tsx`**
  - [ ] Add abstract selection UI controls
  - [ ] Add abstract options state management
  - [ ] Pass abstract options to data processing
  - [ ] Show abstract fetching progress

- [ ] **Add UI controls**
  - [ ] Radio buttons for abstract selection (None, All, Top 3 Recent)
  - [ ] Progress indicator for abstract fetching
  - [ ] Error handling for failed abstract fetching
  - [ ] Preview of abstract-enriched data

**Interface Updates:**
```typescript
interface DataFetcherProps {
  onDataProcessed?: (data: any) => void;
  onFileGenerated?: (filePath: string) => void;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  onAbstractOptionsChange?: (include: boolean, limit?: number) => void;
}
```

**UI Components:**
```typescript
<FormControl component="fieldset" sx={{ mt: 2 }}>
  <FormLabel component="legend">Abstract Options</FormLabel>
  <RadioGroup value={abstractSelection} onChange={handleAbstractSelectionChange}>
    <FormControlLabel value="none" control={<Radio />} label="No Abstracts" />
    <FormControlLabel value="all" control={<Radio />} label="All Abstracts" />
    <FormControlLabel value="recent" control={<Radio />} label="Top 3 Most Recent" />
  </RadioGroup>
</FormControl>

{abstractFetching && (
  <Alert severity="info" sx={{ mt: 2 }}>
    Fetching abstracts... This may take a moment.
  </Alert>
)}
```

### **3.2 Update SubjectNodeSelector Component** ⏳
- [ ] **Enhance `src/components/SubjectNodeSelector.tsx`**
  - [ ] Add abstract formatting logic
  - [ ] Include abstracts in LLM input formatting
  - [ ] Handle abstract display options
  - [ ] Add abstract preview functionality

- [ ] **Add abstract formatting**
  - [ ] Format abstracts for LLM input
  - [ ] Include title, journal, date, and abstract
  - [ ] Handle multiple abstracts per subject
  - [ ] Sort abstracts by date when needed

**Interface Updates:**
```typescript
interface SubjectNodeSelectorProps {
  data: ProcessedData;
  onSubjectSelect: (formattedData: string) => void;
  disabled?: boolean;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  placeholder?: string;
  label?: string;
}
```

**Formatting Logic:**
```typescript
const formatDataWithAbstracts = (
  data: ProcessedData, 
  subjectNode: string, 
  includeAbstracts: boolean, 
  abstractLimit?: number
): string => {
  const rows = data.flattenedRows.filter(row => row.result_subjectNode_name === subjectNode);
  
  let output = '';
  
  // Add phrases
  rows.forEach(row => {
    output += `${row.phrase}\n`;
  });
  
  // Add abstracts if requested
  if (includeAbstracts) {
    output += '\nSupporting Publications:\n';
    
    const allAbstracts = rows.flatMap(row => row.abstracts || []);
    
    // If limit is specified, take most recent across all rows
    const abstractsToInclude = abstractLimit 
      ? allAbstracts
          .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
          .slice(0, abstractLimit)
      : allAbstracts;
    
    abstractsToInclude.forEach(abstract => {
      output += `\n${abstract.title}\n`;
      output += `${abstract.journal} (${new Date(abstract.publicationDate).getFullYear()})\n`;
      output += `Abstract: ${abstract.abstract}\n`;
      output += `---\n`;
    });
  }
  
  return output;
};
```

### **3.3 Update App.tsx** ⏳
- [ ] **Enhance `src/App.tsx`**
  - [ ] Add abstract selection state management
  - [ ] Pass abstract options to DataFetcher
  - [ ] Handle abstract-enriched data
  - [ ] Update data processing workflow

- [ ] **Add state variables**
  - [ ] `includeAbstracts: boolean`
  - [ ] `abstractLimit: number | null`
  - [ ] `abstractFetching: boolean`

**State Management:**
```typescript
const [includeAbstracts, setIncludeAbstracts] = useState<boolean>(false);
const [abstractLimit, setAbstractLimit] = useState<number | null>(null);
const [abstractFetching, setAbstractFetching] = useState<boolean>(false);

const handleAbstractOptionsChange = (include: boolean, limit?: number) => {
  setIncludeAbstracts(include);
  setAbstractLimit(limit || null);
};
```

## 🔧 **Phase 4: Advanced Features**

### **4.1 Caching and Performance** ⏳
- [ ] **Implement abstract caching**
  - [ ] Cache abstracts in memory
  - [ ] Cache abstracts in localStorage
  - [ ] Implement cache expiration
  - [ ] Add cache invalidation logic

- [ ] **Add performance optimizations**
  - [ ] Batch PubMed API calls
  - [ ] Implement request throttling
  - [ ] Add progress tracking
  - [ ] Optimize data processing

### **4.2 Error Handling** ⏳
- [ ] **Comprehensive error handling**
  - [ ] Handle PubMed API errors
  - [ ] Handle network timeouts
  - [ ] Handle invalid PubMed IDs
  - [ ] Provide user-friendly error messages

- [ ] **Graceful degradation**
  - [ ] Continue processing without abstracts
  - [ ] Show partial results when possible
  - [ ] Provide retry mechanisms
  - [ ] Log errors for debugging

### **4.3 User Experience Enhancements** ⏳
- [ ] **Add abstract preview**
  - [ ] Show abstract count in UI
  - [ ] Preview abstract content
  - [ ] Allow abstract selection
  - [ ] Show abstract metadata

- [ ] **Add configuration options**
  - [ ] PubMed API key configuration
  - [ ] Cache settings
  - [ ] Rate limiting settings
  - [ ] Abstract format options

## 🧪 **Phase 5: Testing & Validation**

### **5.1 Unit Testing** ⏳
- [ ] **Test PubMed API service**
  - [ ] Test abstract fetching methods
  - [ ] Test error handling
  - [ ] Test caching functionality
  - [ ] Test rate limiting

- [ ] **Test data processing**
  - [ ] Test abstract enrichment
  - [ ] Test PubMed ID extraction
  - [ ] Test data formatting
  - [ ] Test error scenarios

### **5.2 Integration Testing** ⏳
- [ ] **Test with real data**
  - [ ] Test with actual PubMed IDs
  - [ ] Test with large datasets
  - [ ] Test with various publication formats
  - [ ] Test performance with many abstracts

### **5.3 User Testing** ⏳
- [ ] **Test user workflows**
  - [ ] Test abstract selection
  - [ ] Test data formatting
  - [ ] Test error handling
  - [ ] Test performance

## 📚 **Phase 6: Documentation & Deployment**

### **6.1 User Documentation** ⏳
- [ ] **Update README.md**
  - [ ] Document abstract functionality
  - [ ] Add usage examples
  - [ ] Add configuration instructions
  - [ ] Add troubleshooting guide

### **6.2 Developer Documentation** ⏳
- [ ] **Code documentation**
  - [ ] Document PubMed API service
  - [ ] Document data processing changes
  - [ ] Document UI component updates
  - [ ] Document configuration options

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Abstracts are fetched correctly from PubMed API
- [ ] "All Abstracts" mode works for all publications
- [ ] "Top N Recent" mode correctly sorts by date
- [ ] Abstracts are formatted correctly for LLM input
- [ ] Error handling works gracefully

### **Performance Requirements**
- [ ] Abstract fetching completes within reasonable time
- [ ] Caching reduces repeated API calls
- [ ] UI remains responsive during fetching
- [ ] Memory usage remains reasonable

### **User Experience Requirements**
- [ ] Abstract selection is intuitive
- [ ] Progress feedback is clear
- [ ] Error messages are helpful
- [ ] Data formatting is readable

## 🔄 **Implementation Order**

### **Priority 1 (Core Functionality)**
1. Create PubMed API service
2. Update type definitions
3. Enhance data processor
4. Basic UI integration

### **Priority 2 (Enhanced UX)**
1. Add abstract selection UI
2. Implement data formatting
3. Add progress indicators
4. Error handling

### **Priority 3 (Advanced Features)**
1. Caching implementation
2. Performance optimizations
3. Configuration options
4. Comprehensive testing

## 📦 **Dependencies**

### **New Dependencies Required**
```bash
npm install axios
```

### **Optional Enhancements**
- Consider adding `node-cache` for advanced caching
- Consider adding `p-limit` for request throttling
- Consider adding `date-fns` for date manipulation

---

**Note:** This implementation plan provides a comprehensive roadmap for adding PubMed abstract functionality to the LLM Tester UI. The plan is designed to be implemented incrementally, with each phase building upon the previous one to ensure a smooth development process and robust final implementation.
