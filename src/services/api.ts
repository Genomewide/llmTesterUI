import { LLMModel, TestConfig, Interaction, Project, UploadedFile, DataSubset } from '../types';
import { CONFIG, supportsStructuredOutput } from '../config';
import { v4 as uuidv4 } from 'uuid';

// Mock data for development - replace with actual API calls
const MOCK_MODELS: LLMModel[] = [
  {
    id: 'medgem-custom:latest',
    name: 'MedGem Custom (3.2B)',
    provider: 'Ollama',
    supportsStructuredOutput: true,
    maxTokens: 131072,
    temperature: 0.7
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

  static async testModel(config: TestConfig): Promise<Interaction> {
    try {
      const startTime = Date.now();
      
      // In production, this would be an actual API call to your LLM service
      // const response = await fetch('/api/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config)
      // });
      // const result = await response.json();
      
      // Mock response for development
      const mockResponse = await this.mockLLMResponse(config);
      const responseTime = Date.now() - startTime;
      
      const interaction: Interaction = {
        id: `interaction_${Date.now()}`,
        timestamp: new Date(),
        modelId: config.modelId,
        modelName: MOCK_MODELS.find(m => m.id === config.modelId)?.name || config.modelId,
        systemPrompt: config.systemPrompt,
        userInput: config.userInput,
        response: mockResponse,
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
} 