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

// ARS API related types
export interface ARSNode {
  name?: string;
  categories?: string[];
  [key: string]: any;
}

export interface ARSEdge {
  subject: string;
  object: string;
  predicate: string;
  sources: Array<{
    resource_role: string;
    resource_id: string;
  }>;
  attributes?: Array<{
    attribute_type_id: string;
    value: any;
  }>;
  qualifiers?: Array<{
    qualifier_type_id: string;
    qualifier_value: string;
  }>;
  [key: string]: any;
}

export interface ARSResult {
  rank: number;
  sugeno: number;
  weighted_mean: number;
  normalized_score: number;
  ordering_components?: {
    novelty: number;
    confidence: number;
    clinical_evidence: number;
  };
  node_bindings: Record<string, Array<{ id: string }>>;
  analyses: Array<{
    resource_id: string;
    score: number;
    edge_bindings: Record<string, Array<{ id: string }>>;
  }>;
  [key: string]: any;
}

export interface BasicMetadata {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
}

export interface AbstractData {
  pubmedId: string;
  title: string;
  journal: string;
  publicationDate: string;
  abstract: string;
}

export interface ProcessedData {
  results: ARSResult[];
  edges: Record<string, ARSEdge>;
  nodes: Record<string, ARSNode>;
  auxiliary_graphs: Record<string, any>;
  flattenedRows: Array<{
    result_counter: number;
    edge_id: string;
    edge_subject: string;
    edge_subjectNode_name: string;
    edge_object: string;
    edge_objectNode_name: string;
    predicate: string;
    edge_type: string;
    primary_source: string;
    result_subjectNode_name: string;
    result_objectNode_name: string;
    result_subjectNode_id: string;
    result_objectNode_id: string;
    overarching_claim: string;
    disease_description: string;
    publications: string;
    publications_count: number;
    abstracts?: AbstractData[];
    abstract_count?: number;
  }>;
  metadata: {
    pk: string;
    environment: string;
    timestamp: string;
    resultsCount: number;
    nodesCount: number;
    edgesCount: number;
    supportGraphCount: number;
    totalProcessedRows: number;
  };
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
      fetchPubMedMetadata: (pubmedIds: string[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      fetchPubMedAbstracts: (pubmedIds: string[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      saveCSVFile: (filePath: string, content: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      saveJSONFile: (filePath: string, content: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getAppVersion: () => string;
      getNodeVersion: () => string;
      getChromeVersion: () => string;
      getElectronVersion: () => string;
      platform: string;
      arch: string;
    };
  }
} 