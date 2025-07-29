# 🎯 Translator Data Download Integration Plan

## 📋 **Project Overview**

Convert the Python-based ARS (Automated Reasoning System) data processing script into a Node.js/Electron application that integrates with the existing LLM Tester UI. This will allow users to fetch, process, and analyze large datasets from the Translator network directly within the desktop application.

## 🏗️ **Architecture Overview**

### **Current Python Script Functionality:**
- Fetches data from ARS API using primary keys
- Processes knowledge graph data (nodes, edges, results)
- Transforms complex JSON to flattened CSV format
- Generates CSV files and optional JSON files
- Creates PDF histograms of scores
- Uses Jupyter widgets for user input

### **Target Electron Integration:**
- Native desktop application with integrated UI
- Direct file system access for data storage
- Seamless integration with existing LLM testing workflow
- Real-time data processing and visualization
- Cross-platform compatibility

## 📊 **Phase 1: Core Data Processing (Node.js)**

### **1.1 API Service Module** ⏳
- [ ] Create `src/services/ars-api.ts`
- [ ] Implement `ARSApiService` class
- [ ] Add `fetchMessage(pk: string, environment: string)` method
- [ ] Add `fetchMergedMessage(mergedVersion: string, environment: string)` method
- [ ] Add error handling and retry logic
- [ ] Add environment URL mapping (test, CI, dev, prod)

**Dependencies:**
```bash
npm install axios
```

**Files to Create:**
- `src/services/ars-api.ts`

### **1.2 Data Processing Engine** ⏳
- [ ] Create `src/services/data-processor.ts`
- [ ] Implement `DataProcessor` class
- [ ] Convert Python `get_edge()` function to TypeScript
- [ ] Convert Python `recombobulation()` function to TypeScript
- [ ] Implement `processKnowledgeGraph(data: any)` method
- [ ] Implement `extractEdges(edges: any, nodes: any)` method
- [ ] Implement `extractResults(results: any, nodes: any)` method
- [ ] Implement `createFlattenedRows(results: any, edges: any, nodes: any)` method
- [ ] Add TypeScript interfaces for data structures

**Files to Create:**
- `src/services/data-processor.ts`
- `src/types/ars-data.ts`

### **1.3 File Export Service** ⏳
- [ ] Create `src/services/export-service.ts`
- [ ] Implement `ExportService` class
- [ ] Add `exportToCSV(data: any[], filename: string)` method
- [ ] Add `exportToJSON(data: any, filename: string)` method
- [ ] Add `generateHistograms(data: any[], filename: string)` method
- [ ] Implement file naming convention (timestamp + PK)
- [ ] Add progress tracking for large exports

**Dependencies:**
```bash
npm install json2csv csv-writer
```

**Files to Create:**
- `src/services/export-service.ts`

## 🖥️ **Phase 2: Electron Integration**

### **2.1 Electron IPC Handlers** ⏳
- [ ] Add new IPC handlers to `public/electron.js`
- [ ] Implement `fetch-ars-data` handler
- [ ] Implement `export-processed-data` handler
- [ ] Implement `generate-histograms` handler
- [ ] Add error handling and progress reporting
- [ ] Add file system integration for data storage

**Files to Modify:**
- `public/electron.js`

### **2.2 Preload Script Updates** ⏳
- [ ] Add new API methods to `public/preload.js`
- [ ] Expose `fetchArsData(pk, environment)` method
- [ ] Expose `exportProcessedData(data, format)` method
- [ ] Expose `generateHistograms(data, filename)` method
- [ ] Add proper error handling and type safety

**Files to Modify:**
- `public/preload.js`

## 🎨 **Phase 3: UI Integration**

### **3.1 Data Fetcher Component** ⏳
- [ ] Create `src/components/DataFetcher.tsx`
- [ ] Implement primary key input field
- [ ] Add environment selector (test, CI, dev, prod)
- [ ] Add download options (CSV, JSON, PDF)
- [ ] Implement progress indicators
- [ ] Add results preview functionality
- [ ] Add error handling and user feedback

**Files to Create:**
- `src/components/DataFetcher.tsx`

### **3.2 Main App Integration** ⏳
- [ ] Import DataFetcher component in `src/App.tsx`
- [ ] Add DataFetcher to the main layout
- [ ] Implement `handleDataProcessed` callback
- [ ] Implement `handleFileGenerated` callback
- [ ] Connect to existing project management system
- [ ] Add data to project's uploaded files list

**Files to Modify:**
- `src/App.tsx`

### **3.3 Type Definitions** ⏳
- [ ] Add ARS data types to `src/types/index.ts`
- [ ] Define `ProcessedData` interface
- [ ] Define `ResultData` interface
- [ ] Define `EdgeData` interface
- [ ] Define `NodeData` interface
- [ ] Update existing types to support ARS data

**Files to Modify:**
- `src/types/index.ts`

## 📈 **Phase 4: Data Visualization (Optional)**

### **4.1 Histogram Generation** ⏳
- [ ] Research Chart.js integration with Electron
- [ ] Implement histogram generation using Chart.js
- [ ] Add PDF export functionality
- [ ] Create visualization component
- [ ] Add score distribution analysis

**Dependencies:**
```bash
npm install chart.js canvas pdfkit
```

**Files to Create:**
- `src/components/DataVisualizer.tsx`
- `src/services/visualization-service.ts`

## 🔧 **Phase 5: Testing & Optimization**

### **5.1 Unit Testing** ⏳
- [ ] Write tests for ARS API service
- [ ] Write tests for data processor
- [ ] Write tests for export service
- [ ] Write tests for UI components
- [ ] Add integration tests

**Files to Create:**
- `src/__tests__/ars-api.test.ts`
- `src/__tests__/data-processor.test.ts`
- `src/__tests__/export-service.test.ts`

### **5.2 Performance Optimization** ⏳
- [ ] Implement streaming for large datasets
- [ ] Add memory management for large files
- [ ] Optimize data processing algorithms
- [ ] Add caching for API responses
- [ ] Implement background processing

### **5.3 Error Handling** ⏳
- [ ] Add comprehensive error handling
- [ ] Implement retry logic for API calls
- [ ] Add user-friendly error messages
- [ ] Add logging and debugging tools
- [ ] Implement data validation

## 📚 **Phase 6: Documentation & Deployment**

### **6.1 Documentation** ⏳
- [ ] Update main README.md with new features
- [ ] Add API documentation
- [ ] Create user guide for data fetching
- [ ] Add developer documentation
- [ ] Create troubleshooting guide

### **6.2 Deployment** ⏳
- [ ] Update build scripts
- [ ] Test Electron packaging
- [ ] Create distribution packages
- [ ] Add auto-update functionality
- [ ] Test cross-platform compatibility

## 🎯 **Key Implementation Details**

### **Data Flow:**
```
User Input (PK + Environment) 
    ↓
ARS API Call
    ↓
Data Processing (Nodes/Edges/Results)
    ↓
Flattened Data Structure
    ↓
File Export (CSV/JSON)
    ↓
Project Integration
    ↓
LLM Processing Ready
```

### **File Structure:**
```
src/
├── services/
│   ├── ars-api.ts          # API calls to ARS
│   ├── data-processor.ts   # Data transformation logic
│   └── export-service.ts   # File export functionality
├── components/
│   └── DataFetcher.tsx     # UI component for data fetching
├── types/
│   └── ars-data.ts         # TypeScript interfaces
└── App.tsx                 # Main app integration

public/
├── electron.js             # IPC handlers for ARS functionality
└── preload.js              # Exposed APIs for renderer
```

### **Environment Configuration:**
```typescript
const ARS_ENVIRONMENTS = {
  test: 'https://ars.test.transltr.io',
  CI: 'https://ars.ci.transltr.io',
  dev: 'https://ars-dev.transltr.io',
  prod: 'https://ars-prod.transltr.io'
};
```

## 🚀 **Getting Started**

### **Prerequisites:**
- Node.js 16+ installed
- Existing LLM Tester UI project
- Access to ARS API endpoints

### **Initial Setup:**
```bash
# Install new dependencies
npm install axios json2csv csv-writer chart.js canvas pdfkit

# Start development
npm run electron-dev
```

### **Testing:**
```bash
# Run tests
npm test

# Build for production
npm run electron-pack
```

## 📝 **Progress Tracking**

Use this checklist to track implementation progress:

- [ ] **Phase 1 Complete**: Core data processing functionality
- [ ] **Phase 2 Complete**: Electron integration
- [ ] **Phase 3 Complete**: UI integration
- [ ] **Phase 4 Complete**: Data visualization (optional)
- [ ] **Phase 5 Complete**: Testing and optimization
- [ ] **Phase 6 Complete**: Documentation and deployment

## 🎯 **Success Criteria**

- [ ] Users can input a primary key and fetch ARS data
- [ ] Data is processed and converted to usable format
- [ ] Files are exported to local file system
- [ ] Data integrates with existing project system
- [ ] UI is intuitive and responsive
- [ ] Application handles large datasets efficiently
- [ ] Error handling is robust and user-friendly
- [ ] Documentation is complete and up-to-date

---

**Last Updated:** [Current Date]
**Status:** Planning Phase
**Next Milestone:** Phase 1 - Core Data Processing 