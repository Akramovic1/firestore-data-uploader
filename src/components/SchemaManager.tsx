import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  FileText, 
  Folder, 
  Save, 
  HardDrive,
  AlertCircle,
  CheckCircle,
  X,
  Settings
} from 'lucide-react';
import { DocumentSchema } from '../types';
import { SchemaStorage } from '../utils/schemaStorage';
import { AIService } from '../services/aiService';
import { SchemaEditor } from './SchemaEditor';

interface SchemaManagerProps {
  onClose: () => void;
  onSchemaSelect?: (schema: DocumentSchema) => void;
  customSchemas: DocumentSchema[];
  onSchemasChange: (schemas: DocumentSchema[]) => void;
  aiService?: AIService;
}

export const SchemaManager: React.FC<SchemaManagerProps> = ({
  onClose,
  onSchemaSelect,
  customSchemas,
  onSchemasChange,
  aiService
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'import' | 'settings'>('browse');
  const [schemaStorage] = useState(() => SchemaStorage.getInstance());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingSchema, setEditingSchema] = useState<DocumentSchema | null>(null);
  const [storageInfo, setStorageInfo] = useState(schemaStorage.getStorageInfo());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Update storage info when schemas change
    setStorageInfo(schemaStorage.getStorageInfo());
  }, [customSchemas, schemaStorage]);

  const categories = ['all', ...schemaStorage.getCustomCategories()];
  
  const filteredSchemas = customSchemas.filter(schema => {
    const matchesCategory = selectedCategory === 'all' || schema.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schema.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schema.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleExportSchema = (schema: DocumentSchema) => {
    try {
      schemaStorage.exportSchema(schema);
      setMessage({ type: 'success', text: `Schema "${schema.name}" exported successfully` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to export schema: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleDeleteSchema = (schemaId: string) => {
    try {
      const deleted = schemaStorage.deleteSchema(schemaId);
      if (deleted) {
        const updatedSchemas = customSchemas.filter(s => s.id !== schemaId);
        onSchemasChange(updatedSchemas);
        setMessage({ type: 'success', text: 'Schema deleted successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete schema' });
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to delete schema: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleImportFile = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await schemaStorage.importSchemas(importFile);
      setImportResult(result);
      
      if (result.imported > 0) {
        // Refresh schemas list
        const allSchemas = schemaStorage.getAllSchemas();
        onSchemasChange(allSchemas);
        setMessage({ type: 'success', text: `${result.imported} schema(s) imported successfully` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportAll = () => {
    try {
      schemaStorage.exportAllSchemas();
      setMessage({ type: 'success', text: 'All schemas exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to export schemas: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL custom schemas? This action cannot be undone.')) {
      schemaStorage.clearAllSchemas();
      onSchemasChange([]);
      setMessage({ type: 'success', text: 'All schemas cleared' });
    }
  };

  const handleSchemaUpdated = (updatedSchema: DocumentSchema) => {
    const updated = schemaStorage.updateSchema(updatedSchema);
    if (updated) {
      const updatedSchemas = customSchemas.map(s => s.id === updatedSchema.id ? updatedSchema : s);
      onSchemasChange(updatedSchemas);
      setMessage({ type: 'success', text: 'Schema updated successfully' });
    }
    setEditingSchema(null);
  };

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1300] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Schema Manager</h2>
                <p className="text-gray-600">Manage your custom schemas</p>
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
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Browse Schemas ({customSchemas.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Import/Export
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Settings
            </button>
          </nav>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 250px)' }}>
          <div className="p-6">
            {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search schemas..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schema Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchemas.map(schema => (
                  <div
                    key={schema.id}
                    className="relative group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {schema.category}
                        </span>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onSchemaSelect && (
                          <button
                            onClick={() => {
                              onSchemaSelect(schema);
                              onClose();
                            }}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Select schema"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingSchema(schema)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit schema"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExportSchema(schema)}
                          className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                          title="Download schema"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(schema.id)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete schema"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2">{schema.name}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{schema.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{schema.fields.length} fields</span>
                      <span>{schema.fields.filter(f => f.required).length} required</span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSchemas.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Schemas Found</h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first custom schema to get started.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import' && (
            <div className="space-y-8">
              {/* Export Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Schemas</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Download All Schemas</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Export all your custom schemas as a single JSON file for backup or sharing.
                      </p>
                    </div>
                    <button
                      onClick={handleExportAll}
                      disabled={customSchemas.length === 0}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Schemas</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Schema File
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleImportFile}
                          disabled={!importFile || isImporting}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    </div>

                    {importResult && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Import Results</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Imported:</span>
                            <span className="font-medium text-green-600">{importResult.imported}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Skipped (duplicates):</span>
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

                    <div className="text-xs text-gray-500">
                      <p className="mb-1">Supported formats:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Single schema JSON files</li>
                        <li>Multiple schemas export files</li>
                        <li>Exported schema files from this application</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
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
                      <div className="text-2xl font-bold text-blue-600">{storageInfo.count}</div>
                      <div className="text-sm text-gray-600">Custom Schemas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{storageInfo.sizeKB} KB</div>
                      <div className="text-sm text-gray-600">Storage Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {storageInfo.lastModified 
                          ? storageInfo.lastModified.toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-gray-600">Last Modified</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backup & Maintenance */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Maintenance</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Create Backup</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Download all your schemas as a backup file.
                        </p>
                      </div>
                      <button
                        onClick={() => schemaStorage.createBackup()}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        <span>Backup Now</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-900">Clear All Schemas</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Permanently delete all custom schemas. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={handleClearAll}
                        disabled={customSchemas.length === 0}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1400]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">Delete Schema</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this schema? This action cannot be undone.
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSchema(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schema Editor Modal */}
        {editingSchema && aiService && (
          <SchemaEditor
            schema={editingSchema}
            onSchemaUpdate={handleSchemaUpdated}
            onClose={() => setEditingSchema(null)}
            aiService={aiService}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};