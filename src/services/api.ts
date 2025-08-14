import { LLMModel, TestConfig, Interaction, Project, UploadedFile, DataSubset } from '../types';
import { CONFIG, supportsStructuredOutput } from '../config';
import { v4 as uuidv4 } from 'uuid';

// Mock data for development - replace with actual API calls
const MOCK_MODELS: LLMModel[] = [
  {
    id: 'jwang580/medgemma_27b_text_it:latest',
    name: 'MedGemma 27B Text (Medical)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 131072,
    temperature: 0.2
  },
  {
    id: 'medgem-custom:latest',
    name: 'MedGem Custom (3.2B)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 131072,
    temperature: 0.2
  },
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    id: 'llama3.3:latest',
    name: 'Llama 3.3 (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 8192,
    temperature: 0.7
  },
  {
    id: 'qwen3:latest',
    name: 'Qwen 3 (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 8192,
    temperature: 0.7
  },
  {
    id: 'mistral:latest',
    name: 'Mistral (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: false,
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    id: 'mistral-large:latest',
    name: 'Mistral Large (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 32768,
    temperature: 0.7
  },
  {
    id: 'mistral-small:latest',
    name: 'Mistral Small (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: false,
    maxTokens: 32768,
    temperature: 0.7
  },
  {
    id: 'phi4-mini:latest',
    name: 'Phi-4 Mini (Latest)',
    provider: 'Ollama',
    supportsStructuredOutput: false,
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    id: 'knoopx/hermes-2-pro-mistral:7b-q8_0',
    name: 'Hermes 2 Pro Mistral (7B)',
    provider: 'Ollama',
    supportsStructuredOutput: false,
    maxTokens: 4096,
    temperature: 0.7
  }
];

export class APIService {
  
  static async getAvailableModels(): Promise<LLMModel[]> {
    try {
      if (CONFIG.USE_REAL_OLLAMA) {
        // Try to get real models from Ollama
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
      
      // Fallback to mock data
      return Promise.resolve(MOCK_MODELS);
    } catch (error) {
      console.error('Error fetching models:', error);
      return MOCK_MODELS; // Fallback to mock data
    }
  }

  static async testModel(config: TestConfig, onProgress?: (chunk: string) => void): Promise<Interaction> {
    try {
      const startTime = Date.now();
      
      let response: string;
      let modelName: string;
      
      if (CONFIG.USE_REAL_OLLAMA) {
        // Real Ollama API call with streaming
        const ollamaResponse = await this.callOllamaAPI(config, onProgress);
        response = ollamaResponse;
        modelName = config.modelId;
      } else {
        // Mock response for development
        response = await this.mockLLMResponse(config);
        modelName = MOCK_MODELS.find(m => m.id === config.modelId)?.name || config.modelId;
      }
      
      const responseTime = Date.now() - startTime;
      
      const interaction: Interaction = {
        id: `interaction_${Date.now()}`,
        timestamp: new Date(),
        modelId: config.modelId,
        modelName: modelName,
        systemPrompt: config.systemPrompt,
        userInput: config.userInput,
        response: response,
        responseTime,
        structuredOutput: config.structuredOutput,
        outputFormat: config.outputFormat,
        metadata: {
          temperature: config.temperature,
          maxTokens: config.maxTokens
        }
      };
      
      return interaction;
    } catch (error) {
      console.error('Error testing model:', error);
      throw new Error('Failed to test model');
    }
  }

  private static async callOllamaAPI(config: TestConfig, onProgress?: (chunk: string) => void): Promise<string> {
    try {
      const requestBody = {
        model: config.modelId,
        prompt: config.userInput,
        system: config.systemPrompt,
        stream: true, // Enable streaming
        options: {
          temperature: config.temperature || CONFIG.DEFAULT_TEMPERATURE,
          num_predict: config.maxTokens || CONFIG.DEFAULT_MAX_TOKENS
        }
      };

      const response = await fetch(`${CONFIG.OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              // Emit progress event for real-time updates
              if (onProgress) {
                onProgress(data.response);
              }
            }
            if (data.done) {
              return fullResponse;
            }
          } catch (e) {
            // Skip malformed JSON lines
            continue;
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw new Error(`Failed to call Ollama API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async mockLLMResponse(config: TestConfig): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const model = MOCK_MODELS.find(m => m.id === config.modelId);
    
    // Special response for MedGem model
    if (config.modelId === 'medgem-custom:latest') {
      if (config.structuredOutput && config.outputFormat === 'json') {
        return JSON.stringify({
          medical_assessment: "Based on the provided information, this appears to be a mock medical query.",
          key_findings: [
            "This is a simulated medical response",
            "Always consult healthcare professionals for actual medical decisions",
            "MedGem is designed for educational and research purposes"
          ],
          confidence: 0.85,
          recommendations: [
            "Consult with a qualified healthcare provider",
            "This response is for educational purposes only"
          ],
          model_used: "medgem-custom:latest"
        }, null, 2);
      }
      
      return `As MedGem, a medical language model, I would provide evidence-based medical information for: "${config.userInput}"

System Context: "${config.systemPrompt}"

IMPORTANT: This is a mock response for demonstration purposes. In a real scenario, I would:
- Analyze the medical query carefully
- Provide evidence-based information
- Always recommend consultation with healthcare professionals
- Maintain appropriate medical disclaimers

For actual medical decisions, please consult with qualified healthcare providers.`;
    }
    
    if (config.structuredOutput && config.outputFormat === 'json') {
      return JSON.stringify({
        summary: `Mock structured response for ${model?.name}`,
        key_points: [
          "This is a mock response",
          "Replace with actual LLM API integration",
          "Supports JSON structured output"
        ],
        confidence: 0.85,
        model_used: config.modelId
      }, null, 2);
    }
    
    return `This is a mock response from ${model?.name || config.modelId}.\n\nInput: "${config.userInput}"\n\nSystem Prompt: "${config.systemPrompt}"\n\nThis would be the actual response from the LLM model. In production, this would be replaced with a real API call to your local LLM service (Ollama, etc.).`;
  }

  // File system based project management
  static async saveProject(project: Project): Promise<{ success: boolean; error?: string }> {
    try {
      if (window.electronAPI) {
        // Use Electron API for file system operations
        return await window.electronAPI.saveProject(project);
      } else {
        // Fallback to localStorage for web version
      const projects = JSON.parse(localStorage.getItem('llmTesterProjects') || '[]');
        const existingIndex = projects.findIndex((p: any) => p.id === project.id);
        if (existingIndex >= 0) {
          projects[existingIndex] = project;
        } else {
      projects.push(project);
        }
      localStorage.setItem('llmTesterProjects', JSON.stringify(projects));
        return { success: true };
      }
    } catch (error) {
      console.error('Error saving project:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async loadProjects(): Promise<Project[]> {
    try {
      if (window.electronAPI) {
        // Use Electron API for file system operations
        return await window.electronAPI.loadProjects();
      } else {
        // Fallback to localStorage for web version
      const projects = JSON.parse(localStorage.getItem('llmTesterProjects') || '[]');
      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        interactions: p.interactions.map((i: any) => ({
          ...i,
          timestamp: new Date(i.timestamp)
        }))
      }));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.deleteProject(projectId);
      } else {
        // Fallback to localStorage for web version
        const projects = JSON.parse(localStorage.getItem('llmTesterProjects') || '[]');
        const updatedProjects = projects.filter((p: any) => p.id !== projectId);
        localStorage.setItem('llmTesterProjects', JSON.stringify(updatedProjects));
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // File processing methods
  static async selectFile(): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.selectFile();
      } else {
        // Web fallback - would need to implement file input
        return { success: false, error: 'File selection not supported in web version' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async processLargeFile(filePath: string, projectId: string): Promise<{
    success: boolean;
    data?: any[];
    metadata?: any;
    recordCount?: number;
    error?: string;
  }> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.processLargeFile(filePath, projectId);
      } else {
        return { success: false, error: 'File processing not supported in web version' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getFilePreview(filePath: string, maxRecords: number = 10): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.getFilePreview(filePath, maxRecords);
      } else {
        return { success: false, error: 'File preview not supported in web version' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async exportProject(project: Project, format: string = 'json'): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.exportProject(project, format);
      } else {
        // Web fallback - download as blob
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to create uploaded file record
  static createUploadedFileRecord(
    fileName: string,
    filePath: string,
    fileSize: number,
    fileType: 'json' | 'csv' | 'yaml' | 'xml',
    recordCount: number,
    metadata: any
  ): UploadedFile {
    return {
      id: uuidv4(),
      fileName,
      filePath,
      fileSize,
      uploadDate: new Date(),
      fileType,
      recordCount,
      metadata
    };
  }

  // Helper method to create data subset
  static createDataSubset(
    name: string,
    description: string,
    sourceFileId: string,
    filters: any[],
    data: any[]
  ): DataSubset {
    return {
      id: uuidv4(),
      name,
      description,
      sourceFileId,
      filters,
      data,
      createdAt: new Date(),
      recordCount: data.length
    };
  }

  static async fetchArsData(pk: string, environment: string = 'prod'): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    pk?: string;
    environment?: string;
    timestamp?: string;
  }> {
    try {
      // Check if we're in Electron environment
      if (window.electronAPI && window.electronAPI.fetchArsData) {
        return await window.electronAPI.fetchArsData(pk, environment);
      }
      
      // Fallback for web environment - you would implement actual API call here
      // For now, return an error indicating this is only available in Electron
      return {
        success: false,
        error: 'ARS data fetching is only available in Electron mode. Please use the desktop application.',
        pk,
        environment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ARS data',
        pk,
        environment,
        timestamp: new Date().toISOString()
      };
    }
  }
} 