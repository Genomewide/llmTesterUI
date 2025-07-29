export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  supportsStructuredOutput: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  interactions: Interaction[];
  uploadedFiles?: UploadedFile[];
  dataSubsets?: DataSubset[];
}

export interface Interaction {
  id: string;
  timestamp: Date;
  modelId: string;
  modelName: string;
  systemPrompt: string;
  userInput: string;
  response: string;
  responseTime: number;
  structuredOutput?: boolean;
  outputFormat?: string;
  metadata?: Record<string, any>;
}

export interface TestConfig {
  modelId: string;
  systemPrompt: string;
  userInput: string;
  structuredOutput: boolean;
  outputFormat?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ComparisonResult {
  interaction1: Interaction;
  interaction2: Interaction;
  differences: {
    responseLength: number;
    responseTime: number;
    contentSimilarity: number;
  };
}

// New types for file processing
export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadDate: Date;
  fileType: 'json' | 'csv' | 'yaml' | 'xml';
  recordCount: number;
  metadata: FileMetadata;
  processedData?: any[];
}

export interface FileMetadata {
  columns?: string[];
  sampleData?: any[];
  fileFormat: string;
  encoding?: string;
  lastModified?: Date;
}

export interface DataSubset {
  id: string;
  name: string;
  description: string;
  sourceFileId: string;
  filters: DataFilter[];
  data: any[];
  createdAt: Date;
  recordCount: number;
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface FileProcessingResult {
  success: boolean;
  data?: any[];
  metadata?: FileMetadata;
  recordCount?: number;
  error?: string;
}

export interface FilePreviewResult {
  success: boolean;
  data?: any[];
  error?: string;
}

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      loadProjects: () => Promise<Project[]>;
      saveProject: (project: Project) => Promise<{ success: boolean; error?: string }>;
      deleteProject: (projectId: string) => Promise<{ success: boolean; error?: string }>;
      selectFile: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      processLargeFile: (filePath: string, projectId: string) => Promise<FileProcessingResult>;
      getFilePreview: (filePath: string, maxRecords?: number) => Promise<FilePreviewResult>;
      exportProject: (project: Project, format?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      fetchArsData: (pk: string, environment?: string) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
        pk?: string;
        environment?: string;
        timestamp?: string;
      }>;
      getAppVersion: () => string;
      getNodeVersion: () => string;
      getChromeVersion: () => string;
      getElectronVersion: () => string;
      platform: string;
      arch: string;
    };
  }
} 