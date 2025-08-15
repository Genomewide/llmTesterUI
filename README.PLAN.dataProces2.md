# Data Processing Method 2 - Implementation Plan

## Overview

This plan outlines the implementation of a second data processing method alongside the existing biomedical processing method. The implementation will add a simple toggle switch to the current UI that allows users to switch between processing methods without major structural changes.

## Current State

### Existing Processing Method (Biomedical)
- **File**: `src/components/SubjectNodeSelector.tsx`
- **Method**: `formatDataForInput()` function
- **Output Format**: Structured biomedical format with sections for Claim, Query Information, Node/Entity Information, Edge/Reasoning Information, and Supporting Publications
- **Features**: PubMed abstract integration, rate limiting, batching

### Current Data Flow
1. ARS API data → `src/services/data-processor.ts` → Flattened structure
2. `SubjectNodeSelector.tsx` → Filter by subject node → Format data → Send to LLM
3. LLM processes formatted data and returns summary

## Implementation Plan

### Phase 1: Add Processing Method Toggle UI

#### 1.1 Update SubjectNodeSelector.tsx Interface

Add new props to the component interface:

```typescript
interface SubjectNodeSelectorProps {
  data: ProcessedData | null;
  onSubjectSelect: (formattedData: string, selectedSubject?: string) => void;
  disabled?: boolean;
  includeAbstracts?: boolean;
  abstractLimit?: number;
  placeholder?: string;
  label?: string;
  // NEW PROPS
  processingMethod?: 'biomedical' | 'new-method';
  onProcessingMethodChange?: (method: 'biomedical' | 'new-method') => void;
}
```

#### 1.2 Add Toggle Button Component

Add Material-UI toggle buttons above the existing subject selector:

```typescript
import {
  // ... existing imports ...
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';

// Inside component return statement, before existing Autocomplete:
<Box sx={{ mb: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    Processing Method
  </Typography>
  <ToggleButtonGroup
    value={processingMethod}
    exclusive
    onChange={handleProcessingMethodChange}
    size="small"
    disabled={disabled}
  >
    <ToggleButton value="biomedical">
      Biomedical
    </ToggleButton>
    <ToggleButton value="new-method">
      New Method
    </ToggleButton>
  </ToggleButtonGroup>
</Box>
```

#### 1.3 Add Processing Method State Handler

```typescript
const handleProcessingMethodChange = (
  event: React.MouseEvent<HTMLElement>,
  newMethod: 'biomedical' | 'new-method' | null,
) => {
  if (newMethod !== null && onProcessingMethodChange) {
    onProcessingMethodChange(newMethod);
  }
};
```

### Phase 2: Refactor Data Processing Logic

#### 2.1 Update handleSubjectSelect Function

Modify the existing function to route to different processing methods:

```typescript
const handleSubjectSelect = async (selectedSubject: string | null) => {
  if (!selectedSubject || !data?.flattenedRows) return;
  
  console.log('🎯 Subject selected:', selectedSubject);
  console.log('🔧 Processing method:', processingMethod);
  
  // Filter data for selected subject
  const filteredData = data.flattenedRows.filter(
    row => row.result_subjectNode_name === selectedSubject
  );
  
  console.log('📊 Filtered data has', filteredData.length, 'edges');
  
  let formattedData: string;
  
  // Choose processing method
  if (processingMethod === 'biomedical') {
    formattedData = await processBiomedicalData(filteredData, includeAbstracts, abstractLimit);
  } else {
    formattedData = await processNewMethodData(filteredData, includeAbstracts, abstractLimit);
  }
  
  onSubjectSelect(formattedData, selectedSubject);
};
```

#### 2.2 Extract Biomedical Processing Logic

Rename and extract the current formatting logic:

```typescript
// Rename current formatDataForInput to formatBiomedicalDataForInput
const formatBiomedicalDataForInput = (filteredData: any[]): string => {
  // Move all existing formatDataForInput logic here
  // This includes the Claim, Query Information, Node/Entity Information, 
  // Edge/Reasoning Information, and Supporting Publications sections
};

// Create wrapper function for biomedical processing
const processBiomedicalData = async (
  filteredData: any[], 
  includeAbstracts: boolean, 
  abstractLimit?: number
): Promise<string> => {
  if (includeAbstracts) {
    console.log('🔬 Abstract fetching enabled, limit:', abstractLimit || 'all');
    setAbstractFetching(true);
    try {
      const enrichedFilteredData = await fetchAbstractsForSubject(filteredData);
      const formattedData = formatBiomedicalDataForInput(enrichedFilteredData);
      return formattedData;
    } catch (error) {
      console.error('❌ Error fetching abstracts:', error);
      // Fall back to data without abstracts
      const formattedData = formatBiomedicalDataForInput(filteredData);
      return formattedData;
    } finally {
      setAbstractFetching(false);
    }
  } else {
    console.log('📝 No abstracts requested, formatting data directly');
    return formatBiomedicalDataForInput(filteredData);
  }
};
```

#### 2.3 Implement New Processing Method

Create the new processing function:

```typescript
const processNewMethodData = async (
  filteredData: any[], 
  includeAbstracts: boolean, 
  abstractLimit?: number
): Promise<string> => {
  console.log('🆕 Using new processing method');
  
  // Your new processing logic here
  // This is where you'd implement your different data formatting
  
  return formatNewMethodDataForInput(filteredData);
};

const formatNewMethodDataForInput = (filteredData: any[]): string => {
  // Your new formatting logic here
  // This would be completely different from the biomedical format
  
  let output = '';
  output += 'NEW METHOD FORMAT\n';
  output += '=================\n\n';
  
  // Example of different structure:
  filteredData.forEach((row, index) => {
    output += `${index + 1}. ${row.edge_subjectNode_name} → ${row.predicate} → ${row.edge_objectNode_name}\n`;
    if (row.publications && row.publications !== 'N/A') {
      output += `   Publications: ${row.publications}\n`;
    }
    output += '\n';
  });
  
  return output;
};
```

### Phase 3: Update App.tsx Integration

#### 3.1 Add Processing Method State

```typescript
// In App.tsx, add new state
const [processingMethod, setProcessingMethod] = useState<'biomedical' | 'new-method'>('biomedical');
```

#### 3.2 Update SubjectNodeSelector Props

```typescript
// Update the SubjectNodeSelector component call
<SubjectNodeSelector
  data={processedData}
  onSubjectSelect={handleSubjectSelect}
  disabled={!processedData}
  includeAbstracts={includeAbstracts}
  abstractLimit={abstractLimit}
  processingMethod={processingMethod}
  onProcessingMethodChange={setProcessingMethod}
/>
```

### Phase 4: Add Type Definitions

#### 4.1 Update Types

Add to `src/types/index.ts`:

```typescript
export type ProcessingMethod = 'biomedical' | 'new-method';

// Update existing interfaces if needed
export interface SubjectNodeSelectorProps {
  // ... existing props ...
  processingMethod?: ProcessingMethod;
  onProcessingMethodChange?: (method: ProcessingMethod) => void;
}
```

## Implementation Details

### File Changes Required

1. **`src/components/SubjectNodeSelector.tsx`**
   - Add new props to interface
   - Add toggle button UI
   - Refactor data processing logic
   - Add new processing method functions

2. **`src/App.tsx`**
   - Add processing method state
   - Update SubjectNodeSelector props

3. **`src/types/index.ts`**
   - Add ProcessingMethod type
   - Update SubjectNodeSelectorProps interface

### New Functions to Implement

1. **`handleProcessingMethodChange`** - Handle toggle button changes
2. **`processBiomedicalData`** - Wrapper for existing biomedical processing
3. **`processNewMethodData`** - New processing method implementation
4. **`formatBiomedicalDataForInput`** - Renamed existing formatting function
5. **`formatNewMethodDataForInput`** - New formatting function

### UI Changes

1. **Toggle Button Group** - Above subject selector
2. **Processing Method Label** - "Processing Method" text
3. **Disabled State** - Toggle disabled when component is disabled

### Data Flow Changes

1. **Method Selection** - User selects processing method via toggle
2. **Data Routing** - `handleSubjectSelect` routes to appropriate processing method
3. **Formatting** - Each method has its own formatting function
4. **Output** - Formatted data sent to LLM via existing `onSubjectSelect` callback

## Testing Strategy

### Unit Tests
1. Test toggle button functionality
2. Test biomedical processing (existing functionality)
3. Test new method processing
4. Test method switching
5. Test disabled states

### Integration Tests
1. Test complete data flow with both methods
2. Test abstract fetching with both methods
3. Test error handling for both methods

### UI Tests
1. Test toggle button appearance and behavior
2. Test method switching updates UI correctly
3. Test disabled states work properly

## Benefits of This Approach

1. **Minimal Changes** - Keep existing structure and just add toggle
2. **Easy to Implement** - No major refactoring required
3. **User-Friendly** - Simple toggle button in existing UI
4. **Maintainable** - Both methods coexist in same component
5. **Extensible** - Easy to add more processing methods later
6. **Backward Compatible** - Existing functionality unchanged

## Future Extensibility

This approach makes it easy to add more processing methods:

1. **Add new toggle button** for additional method
2. **Extend ProcessingMethod type** to include new method
3. **Add new processing function** following same pattern
4. **Update routing logic** in handleSubjectSelect

## Implementation Checklist

- [ ] Add ProcessingMethod type to types/index.ts
- [ ] Update SubjectNodeSelectorProps interface
- [ ] Add toggle button UI to SubjectNodeSelector.tsx
- [ ] Add handleProcessingMethodChange function
- [ ] Refactor existing formatDataForInput to formatBiomedicalDataForInput
- [ ] Create processBiomedicalData wrapper function
- [ ] Create processNewMethodData function
- [ ] Create formatNewMethodDataForInput function
- [ ] Update handleSubjectSelect to route to appropriate method
- [ ] Add processingMethod state to App.tsx
- [ ] Update SubjectNodeSelector props in App.tsx
- [ ] Test both processing methods
- [ ] Test toggle functionality
- [ ] Test error handling
- [ ] Update documentation

## Notes

- The existing biomedical processing method remains unchanged
- The new processing method can have completely different formatting
- Both methods use the same input data structure
- Abstract fetching can be enabled/disabled for both methods
- The toggle is disabled when the component is disabled
- Console logging helps with debugging method selection
