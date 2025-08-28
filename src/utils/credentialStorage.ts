import { UploadCredentials, AIProvider } from '../types';

const STORAGE_KEYS = {
  SERVICE_ACCOUNTS: 'firestore_service_accounts',
  AI_PROVIDERS: 'firestore_ai_providers',
  VERSION: '1.0'
};

interface StoredCredentials {
  version: string;
  serviceAccounts: StoredServiceAccount[];
  aiProviders: AIProvider[];
  lastModified: number;
}

interface StoredServiceAccount {
  id: string;
  name: string;
  projectId: string;
  clientEmail: string;
  credentials: UploadCredentials;
  createdAt: number;
}

export class CredentialStorage {
  private static instance: CredentialStorage;

  private constructor() {}

  static getInstance(): CredentialStorage {
    if (!CredentialStorage.instance) {
      CredentialStorage.instance = new CredentialStorage();
    }
    return CredentialStorage.instance;
  }

  /**
   * Get all stored credentials
   */
  private getStoredData(): StoredCredentials {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVICE_ACCOUNTS);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.version === STORAGE_KEYS.VERSION) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to load stored credentials:', error);
    }

    return {
      version: STORAGE_KEYS.VERSION,
      serviceAccounts: [],
      aiProviders: [],
      lastModified: Date.now()
    };
  }

  /**
   * Save credentials to storage
   */
  private saveData(data: StoredCredentials): void {
    try {
      data.lastModified = Date.now();
      localStorage.setItem(STORAGE_KEYS.SERVICE_ACCOUNTS, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw new Error('Failed to save credentials. Storage may be full.');
    }
  }

  /**
   * Generate a display name from service account
   */
  private generateServiceAccountName(credentials: UploadCredentials): string {
    const projectName = credentials.project_id || 'Unknown Project';
    const emailPart = credentials.client_email ? 
      credentials.client_email.split('@')[0].replace('firebase-adminsdk-', '') : 
      'unknown';
    return `${projectName} (${emailPart})`;
  }

  /**
   * Save service account credentials
   */
  saveServiceAccount(credentials: UploadCredentials, customName?: string): string {
    const data = this.getStoredData();
    
    // Check if already exists
    const existingIndex = data.serviceAccounts.findIndex(
      sa => sa.credentials.client_email === credentials.client_email &&
            sa.credentials.project_id === credentials.project_id
    );

    const id = existingIndex >= 0 ? 
      data.serviceAccounts[existingIndex].id : 
      `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const serviceAccount: StoredServiceAccount = {
      id,
      name: customName || this.generateServiceAccountName(credentials),
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      credentials,
      createdAt: existingIndex >= 0 ? data.serviceAccounts[existingIndex].createdAt : Date.now()
    };

    if (existingIndex >= 0) {
      data.serviceAccounts[existingIndex] = serviceAccount;
    } else {
      data.serviceAccounts.push(serviceAccount);
    }

    this.saveData(data);
    return id;
  }

  /**
   * Get all stored service accounts
   */
  getServiceAccounts(): StoredServiceAccount[] {
    return this.getStoredData().serviceAccounts;
  }

  /**
   * Get service account by ID
   */
  getServiceAccountById(id: string): StoredServiceAccount | undefined {
    return this.getStoredData().serviceAccounts.find(sa => sa.id === id);
  }

  /**
   * Delete service account
   */
  deleteServiceAccount(id: string): boolean {
    const data = this.getStoredData();
    const initialLength = data.serviceAccounts.length;
    data.serviceAccounts = data.serviceAccounts.filter(sa => sa.id !== id);
    
    if (data.serviceAccounts.length < initialLength) {
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * Update service account name
   */
  updateServiceAccountName(id: string, name: string): boolean {
    const data = this.getStoredData();
    const account = data.serviceAccounts.find(sa => sa.id === id);
    
    if (account) {
      account.name = name;
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * Save AI providers
   */
  saveAIProviders(providers: AIProvider[]): void {
    const data = this.getStoredData();
    data.aiProviders = providers;
    this.saveData(data);
  }

  /**
   * Get stored AI providers
   */
  getAIProviders(): AIProvider[] {
    return this.getStoredData().aiProviders;
  }

  /**
   * Update specific AI provider
   */
  updateAIProvider(provider: AIProvider): void {
    const data = this.getStoredData();
    const existingIndex = data.aiProviders.findIndex(p => p.id === provider.id);
    
    if (existingIndex >= 0) {
      data.aiProviders[existingIndex] = provider;
    } else {
      data.aiProviders.push(provider);
    }
    
    this.saveData(data);
  }

  /**
   * Remove AI provider
   */
  removeAIProvider(providerId: 'openai' | 'claude'): void {
    const data = this.getStoredData();
    data.aiProviders = data.aiProviders.filter(p => p.id !== providerId);
    this.saveData(data);
  }

  /**
   * Check if credentials are stored
   */
  hasStoredCredentials(): boolean {
    const data = this.getStoredData();
    return data.serviceAccounts.length > 0 || data.aiProviders.length > 0;
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { 
    serviceAccountCount: number; 
    aiProviderCount: number; 
    sizeKB: number; 
    lastModified?: Date 
  } {
    const data = this.getStoredData();
    const stored = localStorage.getItem(STORAGE_KEYS.SERVICE_ACCOUNTS);
    const sizeKB = stored ? Math.round(stored.length / 1024 * 100) / 100 : 0;

    return {
      serviceAccountCount: data.serviceAccounts.length,
      aiProviderCount: data.aiProviders.length,
      sizeKB,
      lastModified: data.lastModified ? new Date(data.lastModified) : undefined
    };
  }

  /**
   * Export all credentials (for backup)
   */
  exportCredentials(): void {
    try {
      const data = this.getStoredData();
      const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Firestore Data Uploader'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firestore-credentials-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export credentials:', error);
      throw new Error('Failed to export credentials');
    }
  }

  /**
   * Import credentials from backup file
   */
  async importCredentials(file: File): Promise<{ 
    imported: number; 
    skipped: number; 
    errors: string[] 
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          let imported = 0;
          let skipped = 0;
          const errors: string[] = [];
          
          const currentData = this.getStoredData();

          // Import service accounts
          if (importData.serviceAccounts && Array.isArray(importData.serviceAccounts)) {
            importData.serviceAccounts.forEach((sa: any, index: number) => {
              try {
                if (this.validateServiceAccount(sa)) {
                  const exists = currentData.serviceAccounts.some(
                    existing => existing.clientEmail === sa.clientEmail && 
                               existing.projectId === sa.projectId
                  );
                  
                  if (exists) {
                    skipped++;
                  } else {
                    currentData.serviceAccounts.push(sa);
                    imported++;
                  }
                } else {
                  errors.push(`Service account ${index + 1}: Invalid format`);
                }
              } catch (error) {
                errors.push(`Service account ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            });
          }

          // Import AI providers
          if (importData.aiProviders && Array.isArray(importData.aiProviders)) {
            importData.aiProviders.forEach((provider: any, index: number) => {
              try {
                if (this.validateAIProvider(provider)) {
                  const existingIndex = currentData.aiProviders.findIndex(p => p.id === provider.id);
                  if (existingIndex >= 0) {
                    currentData.aiProviders[existingIndex] = provider;
                    skipped++;
                  } else {
                    currentData.aiProviders.push(provider);
                    imported++;
                  }
                } else {
                  errors.push(`AI provider ${index + 1}: Invalid format`);
                }
              } catch (error) {
                errors.push(`AI provider ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            });
          }

          if (imported > 0) {
            this.saveData(currentData);
          }

          resolve({ imported, skipped, errors });
        } catch (error) {
          reject(new Error(`Failed to parse credential backup: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read credential backup file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate service account structure
   */
  private validateServiceAccount(sa: any): boolean {
    return (
      sa &&
      typeof sa === 'object' &&
      typeof sa.id === 'string' &&
      typeof sa.name === 'string' &&
      typeof sa.projectId === 'string' &&
      typeof sa.clientEmail === 'string' &&
      sa.credentials &&
      typeof sa.credentials === 'object' &&
      typeof sa.credentials.project_id === 'string' &&
      typeof sa.credentials.client_email === 'string' &&
      typeof sa.credentials.private_key === 'string'
    );
  }

  /**
   * Validate AI provider structure
   */
  private validateAIProvider(provider: any): boolean {
    return (
      provider &&
      typeof provider === 'object' &&
      (provider.id === 'openai' || provider.id === 'claude') &&
      typeof provider.name === 'string' &&
      typeof provider.apiKey === 'string' &&
      provider.apiKey.trim() !== ''
    );
  }

  /**
   * Clear all stored credentials
   */
  clearAllCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.SERVICE_ACCOUNTS);
  }

  /**
   * Get masked API key for display
   */
  getMaskedApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '••••••••';
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}${'•'.repeat(Math.min(12, apiKey.length - 8))}${end}`;
  }

  /**
   * Get masked email for display
   */
  getMaskedEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '••••@••••.com';
    }
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 4 ? 
      `${local.substring(0, 2)}${'•'.repeat(local.length - 4)}${local.substring(local.length - 2)}` :
      local;
    
    return `${maskedLocal}@${domain}`;
  }
}