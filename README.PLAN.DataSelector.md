# 🎯 Data Selector Integration Plan

## 📋 **Project Overview**

Add a data selector component to the LLM Tester UI that allows users to choose from unique subject node names in imported data and automatically populate the user input field with formatted data. This will bridge the gap between data import and LLM testing workflows.

## 🎯 **Feature Requirements**

### **Core Functionality**
- Dropdown/autocomplete to select from unique `result_subjectNode_name` values
- Type-as-you-go filtering for better user experience
- Automatic population of user input field when subject is selected
- Format output to include all `phrase` values for selected subject
- Include `publications` data as "Supporting articles" if available

### **Data Format Output**
When a subject node is selected, the user input should be populated with:
```
[phrase1]
[phrase2]
[phrase3]
...

Supporting articles:
[pubmed_id1]
[pubmed_id2]
[pubmed_id3]
```

## 🏗️ **Technical Architecture**

### **Component Structure**
```
SubjectNodeSelector
├── Autocomplete (Material-UI)
├── Data filtering logic
├── Format conversion
└── Integration with PromptEditor
```

### **Data Flow**
1. **Import Data** → DataFetcher/FileProcessor
2. **Process Data** → Extract unique subject nodes
3. **User Selection** → Autocomplete component
4. **Filter Data** → Get rows for selected subject
5. **Format Data** → Convert to text format
6. **Populate Input** → Update user input field

## 📊 **Phase 1: Core Component Development**

### **1.1 Subject Node Selector Component** ⏳
- [ ] Create `src/components/SubjectNodeSelector.tsx`
- [ ] Implement Material-UI Autocomplete component
- [ ] Add type-as-you-go filtering functionality
- [ ] Extract unique subject nodes from data
- [ ] Add proper TypeScript interfaces

**Files to Create:**
- `src/components/SubjectNodeSelector.tsx`

**Dependencies:**
```bash
# Already included in Material-UI
@mui/material
@mui/icons-material
```

### **1.2 Data Processing Logic** ⏳
- [ ] Implement `extractUniqueSubjectNodes(data: ProcessedData)` function
- [ ] Implement `filterDataBySubject(data: any[], subject: string)` function
- [ ] Implement `formatDataForInput(filteredData: any[])` function
- [ ] Add publication handling logic
- [ ] Add duplicate removal for publications

**Core Functions:**
```typescript
// Extract unique subject node names
const extractUniqueSubjectNodes = (data: ProcessedData): string[] => {
  return [...new Set(
    data.flattenedRows.map(row => row.result_subjectNode_name)
  )].sort();
};

// Filter data for selected subject
const filterDataBySubject = (data: any[], subject: string): any[] => {
  return data.filter(row => row.result_subjectNode_name === subject);
};

// Format filtered data for user input
const formatDataForInput = (filteredData: any[]): string => {
  let output = '';
  
  // Add all phrases
  const phrases = filteredData.map(row => row.phrase);
  output += phrases.join('\n');
  
  // Add publications if they exist
  const publications = filteredData
    .filter(row => row.publications && row.publications !== 'N/A')
    .map(row => row.publications)
    .filter((pub, index, arr) => arr.indexOf(pub) === index);
    
  if (publications.length > 0) {
    output += '\n\nSupporting articles:\n';
    output += publications.join('\n');
  }
  
  return output;
};
```

### **1.3 Component Interface** ⏳
- [ ] Define `SubjectNodeSelectorProps` interface
- [ ] Add `data: ProcessedData` prop
- [ ] Add `onSubjectSelect: (formattedData: string) => void` callback
- [ ] Add `disabled?: boolean` prop for loading states
- [ ] Add `placeholder?: string` prop for customization

**Interface Definition:**
```typescript
interface SubjectNodeSelectorProps {
  data: ProcessedData | null;
  onSubjectSelect: (formattedData: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}
```

## 🎨 **Phase 2: UI Integration**

### **2.1 PromptEditor Integration** ⏳
- [ ] Import SubjectNodeSelector in `src/components/PromptEditor.tsx`
- [ ] Add SubjectNodeSelector above user input field
- [ ] Connect `onSubjectSelect` to `onUserInputChange`
- [ ] Add conditional rendering (only show when data is available)
- [ ] Add proper spacing and layout

**Integration Points:**
```typescript
// In PromptEditor.tsx
<Box>
  <Typography variant="h6" gutterBottom>
    User Input
  </Typography>
  
  {/* Data Selector - only show when data is available */}
  {importedData && (
    <SubjectNodeSelector
      data={importedData}
      onSubjectSelect={onUserInputChange}
      disabled={loading}
      placeholder="Select a subject node to populate input..."
      label="Data Selector"
    />
  )}
  
  <TextField
    fullWidth
    multiline
    rows={6}
    value={userInput}
    onChange={(e) => onUserInputChange(e.target.value)}
    placeholder="Enter the text you want to process..."
    disabled={loading}
    variant="outlined"
  />
</Box>
```

### **2.2 App.tsx Integration** ⏳
- [ ] Add `importedData` state to `App.tsx`
- [ ] Pass `importedData` to `PromptEditor`
- [ ] Update DataFetcher callback to set `importedData`
- [ ] Add data clearing functionality
- [ ] Handle data persistence across project changes

**State Management:**
```typescript
// In App.tsx
const [importedData, setImportedData] = useState<ProcessedData | null>(null);

// Update DataFetcher callback
const handleDataProcessed = (data: ProcessedData) => {
  setImportedData(data);
  setSnackbarMessage('Data imported successfully!');
  setSnackbarOpen(true);
};
```

### **2.3 Styling and Layout** ⏳
- [ ] Add proper spacing between components
- [ ] Style Autocomplete component to match existing UI
- [ ] Add loading states and disabled states
- [ ] Add clear button functionality
- [ ] Add responsive design considerations

## 🔧 **Phase 3: Enhanced Features**

### **3.1 Advanced Filtering** ⏳
- [ ] Add fuzzy search capabilities
- [ ] Add category-based grouping (drugs, diseases, etc.)
- [ ] Add search highlighting
- [ ] Add keyboard navigation improvements
- [ ] Add search result count display

### **3.2 Data Preview** ⏳
- [ ] Add preview of selected data before populating
- [ ] Show count of phrases and publications
- [ ] Add option to customize output format
- [ ] Add option to include/exclude publications
- [ ] Add option to limit number of phrases

### **3.3 Performance Optimization** ⏳
- [ ] Add debounced search for large datasets
- [ ] Add virtualized options for very large lists
- [ ] Add memoization for expensive operations
- [ ] Add loading states for data processing
- [ ] Add error handling for malformed data

## 📊 **Phase 4: Data Format Handling**

### **4.1 Publication Processing** ⏳
- [ ] Handle different publication formats
- [ ] Extract PubMed IDs from various formats
- [ ] Add publication deduplication
- [ ] Add publication count display
- [ ] Add option to include publication metadata

### **4.2 Output Format Options** ⏳
- [ ] Add format selection (plain text, JSON, CSV)
- [ ] Add custom delimiter options
- [ ] Add option to include metadata
- [ ] Add option to include source information
- [ ] Add template-based formatting

## 🧪 **Phase 5: Testing & Validation**

### **5.1 Unit Testing** ⏳
- [ ] Test data extraction functions
- [ ] Test filtering logic
- [ ] Test formatting functions
- [ ] Test component rendering
- [ ] Test user interactions

### **5.2 Integration Testing** ⏳
- [ ] Test with real ARS data
- [ ] Test with large datasets
- [ ] Test with various data formats
- [ ] Test error handling
- [ ] Test performance with large lists

### **5.3 User Testing** ⏳
- [ ] Test usability with different user types
- [ ] Test accessibility features
- [ ] Test keyboard navigation
- [ ] Test mobile responsiveness
- [ ] Test with various screen sizes

## 📚 **Phase 6: Documentation & Deployment**

### **6.1 User Documentation** ⏳
- [ ] Add usage instructions to README
- [ ] Add screenshots and examples
- [ ] Add troubleshooting guide
- [ ] Add FAQ section
- [ ] Add video tutorials

### **6.2 Developer Documentation** ⏳
- [ ] Add component API documentation
- [ ] Add code comments
- [ ] Add TypeScript interfaces
- [ ] Add integration examples
- [ ] Add customization guide

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Users can select from unique subject node names
- [ ] Type-as-you-go filtering works smoothly
- [ ] User input is populated with formatted data
- [ ] Publications are included when available
- [ ] Component integrates seamlessly with existing UI

### **Performance Requirements**
- [ ] Component loads quickly with large datasets
- [ ] Search filtering is responsive
- [ ] No memory leaks with repeated use
- [ ] Works well with existing data processing

### **User Experience Requirements**
- [ ] Intuitive interface design
- [ ] Clear visual feedback
- [ ] Accessible to all users
- [ ] Consistent with existing UI patterns
- [ ] Helpful error messages

## 🔄 **Future Enhancements**

### **Advanced Features**
- [ ] Multi-select capabilities
- [ ] Saved selections/favorites
- [ ] Export selected data
- [ ] Custom formatting templates
- [ ] Integration with other data sources

### **Analytics & Insights**
- [ ] Track most selected subjects
- [ ] Usage analytics
- [ ] Performance metrics
- [ ] User behavior insights
- [ ] Data quality indicators

---

**Note**: This plan focuses on creating a seamless bridge between data import and LLM testing workflows, making it easy for users to leverage imported data in their AI model testing without manual data formatting. 