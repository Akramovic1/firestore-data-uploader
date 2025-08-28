import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Save,
  Plus
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { AIProvider } from '../types';
import { CredentialStorage, CustomInstruction } from '../utils/credentialStorage';

interface CredentialManagerProps {
  onClose: () => void;
  onCredentialsChange?: () => void;
}

interface StoredServiceAccount {
  id: string;
  name: string;
  projectId: string;
  clientEmail: string;
  credentials: any;
  createdAt: number;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({ 
  onClose, 
  onCredentialsChange 
}) => {
  const [credentialStorage] = useState(() => CredentialStorage.getInstance());
  const [activeTab, setActiveTab] = useState<'service-accounts' | 'ai-providers' | 'custom-instructions' | 'settings'>('service-accounts');
  const [serviceAccounts, setServiceAccounts] = useState<StoredServiceAccount[]>([]);
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([]);
  const [customInstructions, setCustomInstructions] = useState<CustomInstruction[]>([]);
  const [storageInfo, setStorageInfo] = useState(credentialStorage.getStorageInfo());
  
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [newAiProvider, setNewAiProvider] = useState<{ id: 'openai' | 'claude'; apiKey: string } | null>(null);
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadingServiceAccount, setUploadingServiceAccount] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [editingInstruction, setEditingInstruction] = useState<CustomInstruction | null>(null);
  const [newInstruction, setNewInstruction] = useState<{ name: string; instruction: string }>({ name: '', instruction: '' });
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'account' | 'provider' | 'all'; id?: string } | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [credentialStorage]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadCredentials = () => {
    setServiceAccounts(credentialStorage.getServiceAccounts());
    setAiProviders(credentialStorage.getAIProviders());
    setCustomInstructions(credentialStorage.getCustomInstructions());
    setStorageInfo(credentialStorage.getStorageInfo());
  };

  const handleDeleteServiceAccount = (id: string) => {
    try {
      const success = credentialStorage.deleteServiceAccount(id);
      if (success) {
        loadCredentials();
        onCredentialsChange?.();
        setMessage({ type: 'success', text: 'Service account deleted successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete service account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
    setShowDeleteConfirm(null);
  };

  const handleEditServiceAccount = (id: string, currentName: string) => {
    setEditingAccount(id);
    setEditingName(currentName);
  };

  const handleSaveServiceAccountName = () => {
    if (editingAccount && editingName.trim()) {
      try {
        const success = credentialStorage.updateServiceAccountName(editingAccount, editingName.trim());
        if (success) {
          loadCredentials();
          setMessage({ type: 'success', text: 'Service account name updated' });
        } else {
          setMessage({ type: 'error', text: 'Failed to update service account name' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    }
    setEditingAccount(null);
    setEditingName('');
  };

  const handleDeleteAIProvider = (id: 'openai' | 'claude') => {
    try {
      credentialStorage.removeAIProvider(id);
      loadCredentials();
      onCredentialsChange?.();
      setMessage({ type: 'success', text: 'AI provider deleted successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
    setShowDeleteConfirm(null);
  };

  const handleSaveAIProvider = () => {
    if (newAiProvider && newAiProvider.apiKey.trim()) {
      try {
        const provider: AIProvider = {
          id: newAiProvider.id,
          name: newAiProvider.id === 'openai' ? 'OpenAI' : 'Claude',
          apiKey: newAiProvider.apiKey.trim()
        };
        
        credentialStorage.updateAIProvider(provider);
        loadCredentials();
        onCredentialsChange?.();
        setMessage({ type: 'success', text: 'API key saved successfully' });
        setNewAiProvider(null);
      } catch (error) {
        setMessage({ type: 'error', text: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    }
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportCredentials = () => {
    try {
      credentialStorage.exportCredentials();
      setMessage({ type: 'success', text: 'Credentials exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleImportCredentials = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await credentialStorage.importCredentials(importFile);
      setImportResult(result);
      
      if (result.imported > 0) {
        loadCredentials();
        onCredentialsChange?.();
        setMessage({ type: 'success', text: `${result.imported} credential(s) imported successfully` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsImporting(false);
    }
  };

  const handleServiceAccountUpload = async (file: File) => {
    setUploadError('');
    try {
      // Parse the service account file
      const text = await file.text();
      const credentials = JSON.parse(text);
      
      // Validate required fields
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('Invalid service account file: missing or incorrect type');
      }
      if (!credentials.project_id) {
        throw new Error('Invalid service account file: missing project_id');
      }
      if (!credentials.client_email) {
        throw new Error('Invalid service account file: missing client_email');
      }
      if (!credentials.private_key) {
        throw new Error('Invalid service account file: missing private_key');
      }
      
      // Save the service account
      const success = credentialStorage.saveServiceAccount(credentials, file.name.replace('.json', ''));
      
      if (success) {
        loadCredentials();
        onCredentialsChange?.();
        setUploadingServiceAccount(null);
        setMessage({ type: 'success', text: 'Service account added successfully' });
      } else {
        throw new Error('Failed to save service account');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadError(errorMessage);
      setMessage({ type: 'error', text: `Upload failed: ${errorMessage}` });
    }
  };

  const handleClearAll = () => {
    try {
      credentialStorage.clearAllCredentials();
      loadCredentials();
      onCredentialsChange?.();
      setMessage({ type: 'success', text: 'All credentials cleared' });
    } catch (error) {
      setMessage({ type: 'error', text: `Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
    setShowDeleteConfirm(null);
  };

  // Custom Instruction Handlers
  const handleSaveCustomInstruction = () => {
    if (!newInstruction.name.trim() || !newInstruction.instruction.trim()) {
      setMessage({ type: 'error', text: 'Name and instruction are required' });
      return;
    }

    try {
      const success = credentialStorage.saveCustomInstruction({
        name: newInstruction.name.trim(),
        instruction: newInstruction.instruction.trim(),
        isDefault: false
      });

      if (success) {
        loadCredentials();
        setNewInstruction({ name: '', instruction: '' });
        setMessage({ type: 'success', text: 'Custom instruction saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save custom instruction' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleUpdateCustomInstruction = () => {
    if (!editingInstruction) return;

    try {
      const success = credentialStorage.updateCustomInstruction(editingInstruction.id, {
        name: editingInstruction.name.trim(),
        instruction: editingInstruction.instruction.trim()
      });

      if (success) {
        loadCredentials();
        setEditingInstruction(null);
        setMessage({ type: 'success', text: 'Custom instruction updated successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update custom instruction' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleDeleteCustomInstruction = (id: string) => {
    try {
      const success = credentialStorage.deleteCustomInstruction(id);
      if (success) {
        loadCredentials();
        setMessage({ type: 'success', text: 'Custom instruction deleted successfully' });
      } else {
        setMessage({ type: 'error', text: 'Cannot delete default instruction' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleSetDefaultInstruction = (id: string) => {
    try {
      const success = credentialStorage.setDefaultCustomInstruction(id);
      if (success) {
        loadCredentials();
        setMessage({ type: 'success', text: 'Default instruction updated' });
      } else {
        setMessage({ type: 'error', text: 'Failed to set default instruction' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1500] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Credential Manager</h2>
                <p className="text-gray-600">Manage your stored credentials and API keys</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-auto p-1 hover:bg-black hover:bg-opacity-10 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('service-accounts')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'service-accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              Service Accounts ({serviceAccounts.length})
            </button>
            <button
              onClick={() => setActiveTab('ai-providers')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'ai-providers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              AI Providers ({aiProviders.length})
            </button>
            <button
              onClick={() => setActiveTab('custom-instructions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'custom-instructions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Edit3 className="h-4 w-4 inline mr-2" />
              Custom Instructions ({customInstructions.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 250px)' }}>
          <div className="p-6">
            {/* Service Accounts Tab */}
            {activeTab === 'service-accounts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Firebase Service Accounts</h3>
                  <button
                    onClick={() => document.getElementById('service-account-upload')?.click()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Service Account</span>
                  </button>
                </div>

                {/* Service Account Upload */}
                <input
                  id="service-account-upload"
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleServiceAccountUpload(file);
                      e.target.value = ''; // Reset input
                    }
                  }}
                  className="hidden"
                />

                {uploadError && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-700">{uploadError}</p>
                  </div>
                )}

                {serviceAccounts.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Service Accounts</h4>
                    <p className="text-gray-600">Upload a service account file to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceAccounts.map(account => (
                      <div key={account.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {editingAccount === account.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  onKeyPress={(e) => e.key === 'Enter' && handleSaveServiceAccountName()}
                                />
                                <button
                                  onClick={handleSaveServiceAccountName}
                                  className="p-1 text-green-600 hover:text-green-800"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingAccount(null)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <h4 className="font-medium text-gray-900">{account.name}</h4>
                            )}
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <button
                              onClick={() => handleEditServiceAccount(account.id, account.name)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit name"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'account', id: account.id })}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Project:</span>
                            <span className="font-medium">{account.projectId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span className="font-mono text-xs">
                              {credentialStorage.getMaskedEmail(account.clientEmail)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Created:</span>
                            <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Providers Tab */}
            {activeTab === 'ai-providers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">AI API Keys</h3>
                  <div className="flex space-x-2">
                    <select
                      value={newAiProvider?.id || ''}
                      onChange={(e) => setNewAiProvider(
                        e.target.value ? { id: e.target.value as 'openai' | 'claude', apiKey: '' } : null
                      )}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Add API Key...</option>
                      {!aiProviders.some(p => p.id === 'openai') && (
                        <option value="openai">OpenAI</option>
                      )}
                      {!aiProviders.some(p => p.id === 'claude') && (
                        <option value="claude">Claude</option>
                      )}
                    </select>
                  </div>
                </div>

                {newAiProvider && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-3">
                      Add {newAiProvider.id === 'openai' ? 'OpenAI' : 'Claude'} API Key
                    </h4>
                    <div className="flex space-x-3">
                      <input
                        type="password"
                        value={newAiProvider.apiKey}
                        onChange={(e) => setNewAiProvider({ ...newAiProvider, apiKey: e.target.value })}
                        placeholder={`Enter your ${newAiProvider.id === 'openai' ? 'OpenAI' : 'Claude'} API key`}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSaveAIProvider}
                        disabled={!newAiProvider.apiKey.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setNewAiProvider(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {aiProviders.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No AI Providers</h4>
                    <p className="text-gray-600">Add your OpenAI or Claude API keys to enable AI features.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiProviders.map(provider => (
                      <div key={provider.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              provider.id === 'openai' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-purple-100 text-purple-600'
                            }`}>
                              <Key className="h-4 w-4" />
                            </div>
                            <h4 className="font-medium text-gray-900">{provider.name}</h4>
                          </div>
                          
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'provider', id: provider.id })}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete API key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">API Key:</span>
                          <span className="font-mono text-xs flex-1">
                            {showApiKeys[provider.id] 
                              ? provider.apiKey 
                              : credentialStorage.getMaskedApiKey(provider.apiKey)
                            }
                          </span>
                          <button
                            onClick={() => toggleApiKeyVisibility(provider.id)}
                            className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            {showApiKeys[provider.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom Instructions Tab */}
            {activeTab === 'custom-instructions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">AI Custom Instructions</h3>
                </div>

                {/* Add New Instruction */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Create New Instruction</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newInstruction.name}
                        onChange={(e) => setNewInstruction(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., E-commerce Product Data, Financial Records, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                      <textarea
                        value={newInstruction.instruction}
                        onChange={(e) => setNewInstruction(prev => ({ ...prev, instruction: e.target.value }))}
                        placeholder="Enter detailed instructions for AI data generation..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCustomInstruction}
                        disabled={!newInstruction.name.trim() || !newInstruction.instruction.trim()}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Save Instruction</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instructions List */}
                {customInstructions.length === 0 ? (
                  <div className="text-center py-12">
                    <Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Custom Instructions</h4>
                    <p className="text-gray-600">Create custom instructions to guide AI data generation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customInstructions.map(instruction => (
                      <div key={instruction.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        {editingInstruction?.id === instruction.id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={editingInstruction.name}
                                onChange={(e) => setEditingInstruction(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                              <textarea
                                value={editingInstruction.instruction}
                                onChange={(e) => setEditingInstruction(prev => prev ? { ...prev, instruction: e.target.value } : null)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingInstruction(null)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleUpdateCustomInstruction}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="text-lg font-medium text-gray-900">{instruction.name}</h4>
                                  {instruction.isDefault && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm whitespace-pre-wrap">{instruction.instruction}</p>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                {!instruction.isDefault && (
                                  <button
                                    onClick={() => handleSetDefaultInstruction(instruction.id)}
                                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                    title="Set as default"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingInstruction(instruction)}
                                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Edit instruction"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                {!instruction.isDefault && (
                                  <button
                                    onClick={() => handleDeleteCustomInstruction(instruction.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete instruction"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Created: {new Date(instruction.createdAt).toLocaleDateString()} • 
                              Last modified: {new Date(instruction.lastModified).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Storage Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Information</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{storageInfo.serviceAccountCount}</div>
                        <div className="text-sm text-gray-600">Service Accounts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{storageInfo.aiProviderCount}</div>
                        <div className="text-sm text-gray-600">AI Providers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{storageInfo.sizeKB} KB</div>
                        <div className="text-sm text-gray-600">Storage Used</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import/Export */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-900">Export Credentials</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Download all your credentials as a backup file.
                          </p>
                        </div>
                        <button
                          onClick={handleExportCredentials}
                          disabled={!credentialStorage.hasStoredCredentials()}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-green-900">Import Credentials</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Restore credentials from a backup file.
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="flex-1 px-3 py-2 border border-green-300 rounded-lg"
                          />
                          <button
                            onClick={handleImportCredentials}
                            disabled={!importFile || isImporting}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isImporting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                <span>Import</span>
                              </>
                            )}
                          </button>
                        </div>

                        {importResult && (
                          <div className="bg-white border border-green-200 rounded-lg p-4">
                            <h5 className="font-medium text-green-900 mb-2">Import Results</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Imported:</span>
                                <span className="font-medium text-green-600">{importResult.imported}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Skipped:</span>
                                <span className="font-medium text-yellow-600">{importResult.skipped}</span>
                              </div>
                              {importResult.errors.length > 0 && (
                                <div>
                                  <span className="text-red-600 font-medium">Errors:</span>
                                  <ul className="mt-1 text-red-600">
                                    {importResult.errors.map((error, index) => (
                                      <li key={index}>• {error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-red-900">Clear All Credentials</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Permanently delete all stored credentials. This cannot be undone.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm({ type: 'all' })}
                          disabled={!credentialStorage.hasStoredCredentials()}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Clear All</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1600]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  {showDeleteConfirm.type === 'all' ? 'Clear All Credentials' : 'Delete Credential'}
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                {showDeleteConfirm.type === 'all' 
                  ? 'Are you sure you want to delete ALL stored credentials? This action cannot be undone.'
                  : 'Are you sure you want to delete this credential? This action cannot be undone.'
                }
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm.type === 'all') {
                      handleClearAll();
                    } else if (showDeleteConfirm.type === 'account' && showDeleteConfirm.id) {
                      handleDeleteServiceAccount(showDeleteConfirm.id);
                    } else if (showDeleteConfirm.type === 'provider' && showDeleteConfirm.id) {
                      handleDeleteAIProvider(showDeleteConfirm.id as 'openai' | 'claude');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};