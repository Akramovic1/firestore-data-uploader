export interface UploadCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

export interface UploadLog {
  id: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

export interface DocumentData {
  [key: string]: any;
}

export interface AIProvider {
  id: 'openai' | 'claude';
  name: string;
  apiKey: string;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp' | 'email' | 'url';
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface DocumentSchema {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: SchemaField[];
  examples: DocumentData[];
}

export interface GenerationConfig {
  schema: DocumentSchema;
  count: number;
  provider: AIProvider;
  customPrompt?: string;
}

export interface AIProvider {
  id: 'openai' | 'claude';
  name: string;
  apiKey: string;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp' | 'email' | 'url';
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface DocumentSchema {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: SchemaField[];
  examples: DocumentData[];
}

export interface GenerationConfig {
  schema: DocumentSchema;
  count: number;
  provider: AIProvider;
  customPrompt?: string;
}