import { TestConfig, Interaction, LLMModel } from '../types';

// Example Ollama API integration
export class OllamaAPIService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'Ollama',
        supportsStructuredOutput: this.supportsStructuredOutput(model.name),
        maxTokens: 4096, // Default, could be configurable
        temperature: 0.7
      }));
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw new Error('Failed to fetch models from Ollama');
    }
  }

  async testModel(config: TestConfig): Promise<Interaction> {
    const startTime = Date.now();
    
    try {
      const requestBody: any = {
        model: config.modelId,
        prompt: config.userInput,
        system: config.systemPrompt,
        stream: false
      };

      // Add structured output if requested
      if (config.structuredOutput && config.outputFormat) {
        requestBody.format = config.outputFormat;
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      const interaction: Interaction = {
        id: `interaction_${Date.now()}`,
        timestamp: new Date(),
        modelId: config.modelId,
        modelName: config.modelId,
        systemPrompt: config.systemPrompt,
        userInput: config.userInput,
        response: data.response,
        responseTime,
        structuredOutput: config.structuredOutput,
        outputFormat: config.outputFormat,
        metadata: {
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          tokensUsed: data.eval_count,
          evalDuration: data.eval_duration
        }
      };

      return interaction;
    } catch (error) {
      console.error('Error testing model with Ollama:', error);
      throw new Error('Failed to test model with Ollama');
    }
  }

  private supportsStructuredOutput(modelName: string): boolean {
    // Models that typically support structured output
    const structuredModels = [
      'llama3.2',
      'qwen2.5',
      'llama3.1',
      'mistral',
      'codellama'
    ];
    
    return structuredModels.some(name => modelName.toLowerCase().includes(name));
  }

  // Health check for Ollama service
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Example usage:
// const ollamaService = new OllamaAPIService();
// const models = await ollamaService.getAvailableModels();
// const result = await ollamaService.testModel(config); 