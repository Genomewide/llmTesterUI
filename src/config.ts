export const CONFIG = {
  // Set to true to use real Ollama API, false for mock data
  USE_REAL_OLLAMA: false,
  
  // Ollama API endpoint
  OLLAMA_URL: 'http://localhost:11434',
  
  // Default model settings
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  
  // Available MedGemma models (if you want to add more)
  MEDGEMMA_MODELS: [
    'medgem-custom:latest',
    'medgemma:2b',
    'medgemma:7b',
    'medgemma:latest'
  ],
  
  // Models that support structured output
  STRUCTURED_OUTPUT_MODELS: [
    'llama3.2',
    'llama3.3',
    'qwen3',
    'mistral-large',
    'medgem-custom',
    'medgemma'
  ]
};

// Helper function to check if a model supports structured output
export const supportsStructuredOutput = (modelName: string): boolean => {
  return CONFIG.STRUCTURED_OUTPUT_MODELS.some(name => 
    modelName.toLowerCase().includes(name)
  );
}; 