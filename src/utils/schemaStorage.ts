import { DocumentSchema } from '../types';

const STORAGE_KEY = 'firestore_custom_schemas';
const STORAGE_VERSION = '1.0';

interface StoredSchemaData {
  version: string;
  schemas: DocumentSchema[];
  lastModified: number;
}

export class SchemaStorage {
  private static instance: SchemaStorage;
  private schemas: Map<string, DocumentSchema> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): SchemaStorage {
    if (!SchemaStorage.instance) {
      SchemaStorage.instance = new SchemaStorage();
    }
    return SchemaStorage.instance;
  }

  /**
   * Load schemas from local storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredSchemaData = JSON.parse(stored);
        
        // Version compatibility check
        if (data.version === STORAGE_VERSION && Array.isArray(data.schemas)) {
          data.schemas.forEach(schema => {
            if (this.validateStoredSchema(schema)) {
              this.schemas.set(schema.id, schema);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load schemas from storage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Save schemas to local storage
   */
  private saveToStorage(): void {
    try {
      const data: StoredSchemaData = {
        version: STORAGE_VERSION,
        schemas: Array.from(this.schemas.values()),
        lastModified: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save schemas to storage:', error);
      throw new Error('Failed to save schema to local storage. Storage may be full.');
    }
  }

  /**
   * Validate a schema object from storage
   */
  private validateStoredSchema(schema: any): boolean {
    return (
      schema &&
      typeof schema === 'object' &&
      typeof schema.id === 'string' &&
      typeof schema.name === 'string' &&
      typeof schema.description === 'string' &&
      typeof schema.category === 'string' &&
      Array.isArray(schema.fields) &&
      Array.isArray(schema.examples)
    );
  }

  /**
   * Get all stored schemas
   */
  getAllSchemas(): DocumentSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get a schema by ID
   */
  getSchemaById(id: string): DocumentSchema | undefined {
    return this.schemas.get(id);
  }

  /**
   * Save a schema
   */
  saveSchema(schema: DocumentSchema): void {
    // Ensure unique ID
    let uniqueId = schema.id;
    let counter = 1;
    
    while (this.schemas.has(uniqueId) && this.schemas.get(uniqueId)?.name !== schema.name) {
      uniqueId = `${schema.id}-${counter}`;
      counter++;
    }

    const schemaToSave = { ...schema, id: uniqueId };
    this.schemas.set(uniqueId, schemaToSave);
    this.saveToStorage();
  }

  /**
   * Update an existing schema
   */
  updateSchema(schema: DocumentSchema): boolean {
    if (!this.schemas.has(schema.id)) {
      return false;
    }
    
    this.schemas.set(schema.id, schema);
    this.saveToStorage();
    return true;
  }

  /**
   * Delete a schema
   */
  deleteSchema(id: string): boolean {
    const deleted = this.schemas.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Check if a schema exists
   */
  hasSchema(id: string): boolean {
    return this.schemas.has(id);
  }

  /**
   * Get schemas by category
   */
  getSchemasByCategory(category: string): DocumentSchema[] {
    return Array.from(this.schemas.values()).filter(schema => schema.category === category);
  }

  /**
   * Get all custom categories
   */
  getCustomCategories(): string[] {
    const categories = new Set<string>();
    this.schemas.forEach(schema => categories.add(schema.category));
    return Array.from(categories).sort();
  }

  /**
   * Export a schema as JSON file
   */
  exportSchema(schema: DocumentSchema): void {
    try {
      const exportData = {
        ...schema,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Firestore Data Uploader'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${schema.id}-schema.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export schema:', error);
      throw new Error('Failed to export schema file');
    }
  }

  /**
   * Export all schemas as a single JSON file
   */
  exportAllSchemas(): void {
    try {
      const exportData = {
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Firestore Data Uploader',
        schemas: Array.from(this.schemas.values())
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firestore-custom-schemas-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export all schemas:', error);
      throw new Error('Failed to export schemas file');
    }
  }

  /**
   * Import schemas from a file
   */
  async importSchemas(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          let imported = 0;
          let skipped = 0;
          const errors: string[] = [];

          // Handle single schema import
          if (data.id && data.name && data.fields) {
            if (this.validateStoredSchema(data)) {
              this.saveSchema(data);
              imported = 1;
            } else {
              errors.push('Invalid schema format');
            }
          }
          // Handle multiple schemas import
          else if (data.schemas && Array.isArray(data.schemas)) {
            data.schemas.forEach((schema: any, index: number) => {
              if (this.validateStoredSchema(schema)) {
                if (this.schemas.has(schema.id)) {
                  skipped++;
                } else {
                  this.saveSchema(schema);
                  imported++;
                }
              } else {
                errors.push(`Schema ${index + 1}: Invalid format`);
              }
            });
          }
          // Handle export format
          else if (data.exportedBy === 'Firestore Data Uploader') {
            // This is an exported file, extract the schema data
            const schemaData = { ...data };
            delete schemaData.exportedAt;
            delete schemaData.exportedBy;
            
            if (this.validateStoredSchema(schemaData)) {
              if (this.schemas.has(schemaData.id)) {
                skipped = 1;
              } else {
                this.saveSchema(schemaData);
                imported = 1;
              }
            } else {
              errors.push('Invalid exported schema format');
            }
          } else {
            errors.push('Unrecognized file format. Expected schema JSON file.');
          }

          resolve({ imported, skipped, errors });
        } catch (error) {
          reject(new Error(`Failed to parse schema file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read schema file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Clear all stored schemas (with confirmation)
   */
  clearAllSchemas(): void {
    this.schemas.clear();
    this.saveToStorage();
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { count: number; sizeKB: number; lastModified?: Date } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const sizeKB = stored ? Math.round(stored.length / 1024 * 100) / 100 : 0;
      
      let lastModified: Date | undefined;
      if (stored) {
        const data: StoredSchemaData = JSON.parse(stored);
        lastModified = new Date(data.lastModified);
      }

      return {
        count: this.schemas.size,
        sizeKB,
        lastModified
      };
    } catch (error) {
      return {
        count: 0,
        sizeKB: 0
      };
    }
  }

  /**
   * Backup schemas to download
   */
  createBackup(): void {
    this.exportAllSchemas();
  }
}