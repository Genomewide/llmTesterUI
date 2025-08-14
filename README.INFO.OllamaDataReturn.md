# 🔄 Ollama Data Flow Documentation

## 📋 **Overview**

This document describes the complete data flow from the LLM Tester UI to the local Ollama instance and back, including all technical details, configuration points, and data transformations.

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    HTTP Request    ┌─────────────────┐    Local Process    ┌─────────────────┐
│   React UI      │ ──────────────────► │   API Service   │ ──────────────────► │   Ollama        │
│   (Electron)    │                    │   (api.ts)      │                    │   (localhost)   │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
         ▲                                       │                                       │
         │                                       │                                       │
         │                              HTTP Response                              Model Output
         │                                       │                                       │
         │                                       ▼                                       ▼
         │                              ┌─────────────────┐                    ┌─────────────────┐
         │                              │  Stream Reader  │                    │  27B Model      │
         │                              │  (Chunk Proc.)  │                    │  (MedGemma)     │
         │                              └─────────────────┘                    └─────────────────┘
         │                                       │
         │                                       │
         └───────────────────────────────────────┘
                    UI State Update
```

## 📊 **Step-by-Step Data Flow**

### **Step 1: User Interface (App.tsx)**

#### **1.1 User Action**
```typescript
// User clicks "Run Test" button
const handleTestModel = async () => {
  // Validation checks
  if (!selectedModel || !userInput.trim()) {
    setError('Please select a model and enter some input text');
    return;
  }
```

#### **1.2 Configuration Object Creation**
```typescript
const config: TestConfig = {
  modelId: selectedModel,        // e.g., 'jwang580/medgemma_27b_text_it:latest'
  systemPrompt,                  // User's system prompt or default
  userInput,                     // User's input text
  structuredOutput,              // Boolean flag
  outputFormat: structuredOutput ? outputFormat : undefined
};
```

#### **1.3 API Service Call**
```typescript
const interaction = await APIService.testModel(config);
```

### **Step 2: API Service Layer (api.ts)**

#### **2.1 Configuration Check**
```typescript
// In APIService.testModel()
if (CONFIG.USE_REAL_OLLAMA) {  // Currently set to true
  const ollamaResponse = await this.callOllamaAPI(config);
  response = ollamaResponse;
  modelName = config.modelId;
}
```

#### **2.2 Ollama API Request Construction**
```typescript
// In callOllamaAPI()
const requestBody = {
  model: config.modelId,                    // 'jwang580/medgemma_27b_text_it:latest'
  prompt: config.userInput,                 // User's input text
  system: config.systemPrompt,              // System prompt
  stream: true,                             // Enable streaming
  options: {
    temperature: config.temperature || CONFIG.DEFAULT_TEMPERATURE,  // 0.2
    num_predict: config.maxTokens || CONFIG.DEFAULT_MAX_TOKENS     // 4096
  }
};
```

#### **2.3 HTTP Request to Ollama**
```typescript
const response = await fetch(`${CONFIG.OLLAMA_URL}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
// CONFIG.OLLAMA_URL = 'http://localhost:11434'
```

### **Step 3: Local Ollama Instance**

#### **3.1 Request Reception**
- **Endpoint:** `http://localhost:11434/api/generate`
- **Method:** POST
- **Content-Type:** application/json
- **Model:** `jwang580/medgemma_27b_text_it:latest`

#### **3.2 Model Processing**
- **Model Loading:** Ollama loads the 27B model into memory (if not already loaded)
- **Input Processing:** Combines system prompt + user input
- **Token Generation:** Processes through the MedGemma model
- **Response Streaming:** Sends tokens back as they're generated

#### **3.3 Ollama Response Format**
Each streaming chunk from Ollama:
```json
{"response": "partial text", "done": false}
{"response": "more text", "done": false}
...
{"response": "final text", "done": true}
```

### **Step 4: Streaming Response Processing**

#### **4.1 Stream Reader Setup**
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let fullResponse = '';
```

#### **4.2 Chunk Processing Loop**
```typescript
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.response) {
        fullResponse += data.response;  // Accumulate response text
      }
      if (data.done) {
        return fullResponse;  // Return complete response
      }
    } catch (e) {
      // Skip malformed JSON lines
      continue;
    }
  }
}
```

### **Step 5: Response Processing Back to UI**

#### **5.1 Interaction Object Creation**
```typescript
const interaction: Interaction = {
  id: `interaction_${Date.now()}`,
  timestamp: new Date(),
  modelId: config.modelId,
  modelName: modelName,
  systemPrompt: config.systemPrompt,
  userInput: config.userInput,
  response: response,              // Full accumulated response
  responseTime,                    // Time taken (Date.now() - startTime)
  structuredOutput: config.structuredOutput,
  outputFormat: config.outputFormat,
  metadata: {
    temperature: config.temperature,
    maxTokens: config.maxTokens
  }
};
```

#### **5.2 UI State Updates**
```typescript
// Back in App.tsx
setCurrentInteraction(interaction);  // Display response

// Add to project history
const updatedProject = {
  ...currentProject,
  interactions: [...currentProject.interactions, interaction],
  updatedAt: new Date()
};

setCurrentProject(updatedProject);
setProjects(projects.map(p => 
  p.id === currentProject.id ? updatedProject : p
));

// Save to storage
await APIService.saveProject(updatedProject);
```

### **Step 6: UI Display**

#### **6.1 Response Viewer Component**
- **Component:** `ResponseViewer.tsx`
- **Props:** `interaction`, `loading`, `error`
- **Display:** Formatted response with syntax highlighting
- **Features:** JSON formatting, error display, loading states

#### **6.2 History Viewer Component**
- **Component:** `HistoryViewer.tsx`
- **Props:** `interactions` (array of all interactions)
- **Display:** List of all previous tests with metadata
- **Features:** Timestamp, model name, response time, delete functionality

## 🔧 **Configuration Points**

### **Main Configuration (config.ts)**
```typescript
export const CONFIG = {
  // API Configuration
  USE_REAL_OLLAMA: true,                    // Use real Ollama API
  OLLAMA_URL: 'http://localhost:11434',     // Local Ollama endpoint
  
  // Model Settings
  DEFAULT_TEMPERATURE: 0.2,                 // Model temperature
  DEFAULT_MAX_TOKENS: 4096,                 // Max response length
  
  // Model Detection
  MEDGEMMA_MODELS: [
    'jwang580/medgemma_27b_text_it',
    'medgem-custom:latest',
    'medgemma:2b',
    'medgemma:7b',
    'medgemma:latest'
  ],
  
  // Structured Output Support
  STRUCTURED_OUTPUT_MODELS: [
    'llama3.2',
    'llama3.3',
    'qwen3',
    'mistral-large',
    'medgem-custom',
    'medgemma'
  ]
};
```

### **Model Detection Logic**
```typescript
// Automatically detects available models from Ollama
static async getAvailableModels(): Promise<LLMModel[]> {
  if (CONFIG.USE_REAL_OLLAMA) {
    const response = await fetch(`${CONFIG.OLLAMA_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'Ollama',
        supportsStructuredOutput: supportsStructuredOutput(model.name),
        maxTokens: CONFIG.DEFAULT_MAX_TOKENS,
        temperature: CONFIG.DEFAULT_TEMPERATURE
      }));
    }
  }
  return Promise.resolve(MOCK_MODELS);  // Fallback
}
```

### **Structured Output Detection**
```typescript
export const supportsStructuredOutput = (modelName: string): boolean => {
  return CONFIG.STRUCTURED_OUTPUT_MODELS.some(name => 
    modelName.toLowerCase().includes(name)
  );
};
```

## 📊 **Data Types and Interfaces**

### **TestConfig Interface**
```typescript
interface TestConfig {
  modelId: string;
  systemPrompt: string;
  userInput: string;
  structuredOutput: boolean;
  outputFormat?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### **Interaction Interface**
```typescript
interface Interaction {
  id: string;
  timestamp: Date;
  modelId: string;
  modelName: string;
  systemPrompt: string;
  userInput: string;
  response: string;
  responseTime: number;
  structuredOutput: boolean;
  outputFormat?: string;
  metadata: {
    temperature?: number;
    maxTokens?: number;
  };
}
```

### **LLMModel Interface**
```typescript
interface LLMModel {
  id: string;
  name: string;
  provider: string;
  supportsStructuredOutput: boolean;
  maxTokens: number;
  temperature: number;
}
```

## ⚡ **Performance Characteristics**

### **Network Performance**
- **Protocol:** HTTP/1.1
- **Latency:** Local network (~1-5ms)
- **Bandwidth:** Limited by model generation speed
- **Connection:** Persistent (reused for multiple requests)

### **Model Performance**
- **Loading Time:** ~30-60 seconds for 27B models (first time)
- **Memory Usage:** ~40-60GB RAM for 27B models
- **Generation Speed:** ~10-50 tokens/second (depending on hardware)
- **Context Window:** 131,072 tokens (MedGemma 27B)

### **Application Performance**
- **Response Time:** Model generation time + ~100ms overhead
- **Memory Usage:** Minimal (just stores text responses)
- **Storage:** Local file system (Electron) or localStorage (web)
- **UI Updates:** Real-time (after full response received)

## 🔍 **Error Handling**

### **Network Errors**
```typescript
if (!response.ok) {
  throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
}
```

### **Streaming Errors**
```typescript
const reader = response.body?.getReader();
if (!reader) {
  throw new Error('No response body reader available');
}
```

### **JSON Parsing Errors**
```typescript
try {
  const data = JSON.parse(line);
  // Process data
} catch (e) {
  // Skip malformed JSON lines
  continue;
}
```

### **Model Loading Errors**
- **Model Not Found:** 404 error from Ollama
- **Out of Memory:** 500 error from Ollama
- **Invalid Parameters:** 400 error from Ollama

## 🚀 **Optimization Opportunities**

### **Current Implementation**
- ✅ **Streaming Support:** Enabled but not real-time UI updates
- ✅ **Error Handling:** Comprehensive error catching
- ✅ **Model Detection:** Automatic from Ollama
- ✅ **Configuration:** Centralized in config.ts

### **Potential Improvements**
- 🔄 **Real-time Streaming:** Update UI as tokens arrive
- 📊 **Progress Indicators:** Show generation progress
- 🚫 **Cancel Functionality:** Stop generation mid-stream
- 💾 **Response Caching:** Cache similar queries
- 🔍 **Request Logging:** Log all API calls for debugging

## 🛠️ **Debugging and Troubleshooting**

### **Common Issues**
1. **Ollama Not Running:** Check `http://localhost:11434/api/tags`
2. **Model Not Found:** Verify model is installed with `ollama list`
3. **Out of Memory:** Reduce model size or increase system RAM
4. **Network Errors:** Check firewall and Ollama service status

### **Debug Commands**
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Check model details
ollama show jwang580/medgemma_27b_text_it:latest

# Test model directly
ollama run jwang580/medgemma_27b_text_it:latest "Hello"
```

### **Logging**
- **API Calls:** Logged in browser console
- **Errors:** Displayed in UI and logged to console
- **Performance:** Response times tracked in interaction metadata

---

**Note:** This architecture provides a clean separation between the UI and the LLM service, with the API service layer handling all the complexity of communicating with Ollama. The streaming implementation allows for efficient handling of large responses while maintaining a responsive user interface.
