import { DocumentData, UploadCredentials } from '../types';

export const parseCredentialsFile = (file: File): Promise<UploadCredentials> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const credentials = JSON.parse(content) as UploadCredentials;
        
        // Validate required fields
        const requiredFields = [
          'type', 'project_id', 'private_key_id', 'private_key',
          'client_email', 'client_id', 'auth_uri', 'token_uri'
        ];
        
        const missingFields = requiredFields.filter(field => !credentials[field as keyof UploadCredentials]);
        
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
          return;
        }
        
        if (credentials.type !== 'service_account') {
          reject(new Error('Invalid credentials file. Expected service account credentials.'));
          return;
        }
        
        resolve(credentials);
      } catch (error) {
        reject(new Error('Invalid JSON file. Please check your credentials file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

export const parseJsonFile = (file: File): Promise<DocumentData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Handle both single object and array of objects
        let documents: DocumentData[];
        
        if (Array.isArray(data)) {
          documents = data.filter(item => typeof item === 'object' && item !== null);
          
          if (documents.length !== data.length) {
            reject(new Error('JSON file contains invalid items. All items must be objects.'));
            return;
          }
        } else if (typeof data === 'object' && data !== null) {
          documents = [data];
        } else {
          reject(new Error('JSON file must contain an object or array of objects'));
          return;
        }
        
        if (documents.length === 0) {
          reject(new Error('No valid documents found in JSON file'));
          return;
        }
        
        resolve(documents);
      } catch (error) {
        reject(new Error('Invalid JSON file. Please check your file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

export const parseJsonlFile = (file: File): Promise<DocumentData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('Empty JSONL file'));
          return;
        }
        
        const documents: DocumentData[] = [];
        const errors: string[] = [];
        
        lines.forEach((line, index) => {
          try {
            const doc = JSON.parse(line);
            if (typeof doc === 'object' && doc !== null) {
              documents.push(doc);
            } else {
              errors.push(`Line ${index + 1}: Expected JSON object`);
            }
          } catch (error) {
            errors.push(`Line ${index + 1}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
        if (errors.length > 0) {
          reject(new Error(`JSONL parsing errors:\n${errors.join('\n')}`));
          return;
        }
        
        if (documents.length === 0) {
          reject(new Error('No valid documents found in JSONL file'));
          return;
        }
        
        resolve(documents);
      } catch (error) {
        reject(new Error('Failed to process JSONL file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

export const validateCollectionName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Collection name is required';
  }
  
  if (name.length > 1500) {
    return 'Collection name must be less than 1500 characters';
  }
  
  // Firestore collection naming rules
  const invalidChars = /[\/\\]/;
  if (invalidChars.test(name)) {
    return 'Collection name cannot contain forward slashes (/) or backslashes (\\)';
  }
  
  if (name.startsWith('.') || name.endsWith('.')) {
    return 'Collection name cannot start or end with a period';
  }
  
  if (name === '__.*__') {
    return 'Collection name cannot match the regular expression __.*__';
  }
  
  return null;
};

export const parseDataFiles = async (files: File[]): Promise<DocumentData[]> => {
  const allDocuments: DocumentData[] = [];
  
  for (const file of files) {
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    try {
      let documents: DocumentData[];
      
      if (fileExtension === 'json') {
        documents = await parseJsonFile(file);
      } else if (fileExtension === 'jsonl') {
        documents = await parseJsonlFile(file);
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}. Only JSON and JSONL files are supported.`);
      }
      
      allDocuments.push(...documents);
    } catch (error) {
      throw new Error(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return allDocuments;
};