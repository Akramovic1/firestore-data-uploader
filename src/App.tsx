import React, { useState, useCallback } from 'react';
import { Upload, Database, FileText, AlertCircle, Bot, BookOpen, Eye, X } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { CollectionInput } from './components/CollectionInput';
import { ProgressBar } from './components/ProgressBar';
import { LogViewer } from './components/LogViewer';
import { SchemaSelector } from './components/SchemaSelector';
import { SchemaViewer } from './components/SchemaViewer';
import { AIGenerationForm } from './components/AIGenerationForm';
import { DocumentationViewer } from './components/DocumentationViewer';
import { useFirebaseUpload } from './hooks/useFirebaseUpload';
import { parseCredentialsFile, parseJsonlFile, validateCollectionName } from './utils/fileProcessing';
import { UploadCredentials, DocumentData, DocumentSchema, AIProvider } from './types';
import { predefinedSchemas } from './schemas/predefinedSchemas';
import { AIService } from './services/aiService';
import { SchemaStorage } from './utils/schemaStorage';
import { SchemaManager } from './components/SchemaManager';
import { CredentialManager } from './components/CredentialManager';
import { CredentialStorage } from './utils/credentialStorage';
import { SavedCredentials } from './components/SavedCredentials';
import { DataViewer } from './components/DataViewer';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'docs'>('upload');
  const [collectionName, setCollectionName] = useState('');
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<DocumentSchema | null>(null);
  const [customSchemas, setCustomSchemas] = useState<DocumentSchema[]>([]);
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<DocumentData[]>([]);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [showSchemaManager, setShowSchemaManager] = useState(false);
  const [showCredentialManager, setShowCredentialManager] = useState(false);
  const [schemaStorage] = useState(() => SchemaStorage.getInstance());
  const [credentialStorage] = useState(() => CredentialStorage.getInstance());
  const [errors, setErrors] = useState<{
    collection?: string;
    credentials?: string;
    data?: string;
    upload?: string;
    generation?: string;
  }>({});

  const { isUploading, progress, logs, uploadDocuments, clearLogs, resetProgress } = useFirebaseUpload();
  const [aiService, setAiService] = useState<AIService | null>(null);

  // Load custom schemas from local storage on app start
  React.useEffect(() => {
    const savedSchemas = schemaStorage.getAllSchemas();
    setCustomSchemas(savedSchemas);
    
    // Load saved AI providers
    const savedProviders = credentialStorage.getAIProviders();
    setAiProviders(savedProviders);
  }, [schemaStorage, credentialStorage]);

  // Initialize AI service when providers change
  React.useEffect(() => {
    if (aiProviders.length > 0) {
      setAiService(new AIService(aiProviders));
    } else {
      setAiService(null);
    }
  }, [aiProviders]);

  const clearError = useCallback((field: string) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handleCollectionChange = useCallback((value: string) => {
    setCollectionName(value);
    clearError('collection');
  }, [clearError]);

  const handleCredentialsFileSelect = useCallback((file: File) => {
    setCredentialsFile(file);
    clearError('credentials');
  }, [clearError]);

  const handleDataFileSelect = useCallback((file: File) => {
    setDataFile(file);
    clearError('data');
    // Clear generated data when user manually selects a file
    if (generatedData.length > 0) {
      setGeneratedData([]);
      setShowDataViewer(false);
    }
  }, [clearError, generatedData.length]);

  const handleCustomSchemaAdded = useCallback((schema: DocumentSchema) => {
    // Save to storage and update state
    schemaStorage.saveSchema(schema);
    setCustomSchemas(prev => {
      // Check if schema already exists to avoid duplicates
      const exists = prev.some(s => s.id === schema.id);
      return exists ? prev.map(s => s.id === schema.id ? schema : s) : [...prev, schema];
    });
  }, [schemaStorage]);

  const handleSchemaUpdated = useCallback((updatedSchema: DocumentSchema) => {
    // Update in storage
    schemaStorage.updateSchema(updatedSchema);
    
    // Update custom schemas state
    setCustomSchemas(prev => prev.map(schema => 
      schema.id === updatedSchema.id ? updatedSchema : schema
    ));
    
    // Update selected schema if it's the one being edited
    if (selectedSchema?.id === updatedSchema.id) {
      setSelectedSchema(updatedSchema);
    }
  }, [selectedSchema, schemaStorage]);

  const handleSchemasChange = useCallback((schemas: DocumentSchema[]) => {
    setCustomSchemas(schemas);
  }, []);

  const handleAIGeneration = useCallback(async (
    count: number,
    provider: 'openai' | 'claude',
    customPrompt?: string
  ) => {
    if (!selectedSchema || !aiService) return;

    setIsGenerating(true);
    setErrors(prev => ({ ...prev, generation: undefined }));

    try {
      // Get default custom instruction
      const defaultInstruction = credentialStorage.getDefaultCustomInstruction();
      
      const documents = await aiService.generateDocuments(
        selectedSchema,
        count,
        provider,
        customPrompt,
        defaultInstruction?.instruction
      );

      // Store generated data and show viewer
      setGeneratedData(documents);
      setShowDataViewer(true);
      clearError('data');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI generation failed';
      setErrors(prev => ({ ...prev, generation: errorMessage }));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedSchema, aiService, clearError]);

  const handleDataUpdate = useCallback((updatedData: DocumentData[]) => {
    setGeneratedData(updatedData);
    
    // Update the JSONL file in real-time as data is modified
    if (updatedData.length > 0 && selectedSchema) {
      const jsonlContent = updatedData.map(doc => JSON.stringify(doc)).join('\n');
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const file = new File([blob], `${selectedSchema.id}-generated-${updatedData.length}-docs.jsonl`, {
        type: 'application/jsonl'
      });
      setDataFile(file);
      clearError('data');
    }
  }, [selectedSchema, clearError]);

  const handleDataViewerClose = useCallback(() => {
    setShowDataViewer(false);
    
    // Convert the final data to a file for upload
    if (generatedData.length > 0 && selectedSchema) {
      const jsonlContent = generatedData.map(doc => JSON.stringify(doc)).join('\n');
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const file = new File([blob], `${selectedSchema.id}-generated-${generatedData.length}-docs.jsonl`, {
        type: 'application/jsonl'
      });
      setDataFile(file);
      clearError('data');
    }
  }, [generatedData, selectedSchema, clearError]);

  const handleRegenerateData = useCallback(() => {
    // Close the viewer and allow user to generate again
    setShowDataViewer(false);
    setGeneratedData([]);
  }, []);

  const handleReopenDataViewer = useCallback(() => {
    if (generatedData.length > 0) {
      setShowDataViewer(true);
    }
  }, [generatedData.length]);

  const handleClearGeneratedData = useCallback(() => {
    setGeneratedData([]);
    setDataFile(null);
    setShowDataViewer(false);
    clearError('data');
  }, [clearError]);

  const handleUpload = useCallback(async () => {
    // Reset previous errors
    setErrors({});

    // Validation
    const collectionError = validateCollectionName(collectionName);
    if (collectionError) {
      setErrors(prev => ({ ...prev, collection: collectionError }));
      return;
    }

    if (!credentialsFile) {
      setErrors(prev => ({ ...prev, credentials: 'Please select a credentials file' }));
      return;
    }

    if (!dataFile) {
      setErrors(prev => ({ ...prev, data: 'Please select a JSONL data file' }));
      return;
    }

    try {
      // Parse credentials
      const credentials: UploadCredentials = await parseCredentialsFile(credentialsFile);
      
      // Parse data
      const documents: DocumentData[] = await parseJsonlFile(dataFile);
      
      // Start upload
      await uploadDocuments(collectionName, documents, credentials);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors(prev => ({ ...prev, upload: errorMessage }));
    }
  }, [collectionName, credentialsFile, dataFile, uploadDocuments]);

  const canUpload = collectionName.trim() && credentialsFile && dataFile && !isUploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-primary-400/20 to-secondary-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-gradient-to-br from-secondary-400/20 to-primary-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-gradient-to-br from-primary-300/20 to-secondary-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl relative">
        {/* Header */}
        <div className="text-center mb-16 animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient bg-[length:400%_400%]"></div>
              <div className="relative p-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-glass-lg border border-white/20">
                {activeTab === 'upload' && <Database className="h-10 w-10 text-primary-600 animate-pulse-slow" />}
                {activeTab === 'generate' && <Bot className="h-10 w-10 text-secondary-600 animate-bounce-slow" />}
                {activeTab === 'docs' && <BookOpen className="h-10 w-10 text-primary-700 animate-wiggle" />}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-primary-700 via-secondary-600 to-primary-800 bg-clip-text text-transparent leading-tight">
              Firestore Data Uploader
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full mx-auto animate-shimmer"></div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-6 leading-relaxed">
            {activeTab === 'upload' && 'Transform your Firestore workflow with seamless document uploads. Advanced batch processing meets intuitive design for effortless data management.'}
            {activeTab === 'generate' && 'Harness the power of AI to generate realistic, structured documents. Create sophisticated test data with predefined schemas and intelligent templates.'}
            {activeTab === 'docs' && 'Explore comprehensive documentation with interactive examples. Your complete guide to schemas, patterns, and best practices for modern development.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12 animate-slideUp">
          <div className="relative p-1 bg-white/40 backdrop-blur-xl rounded-2xl shadow-glass border border-white/20">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`relative flex items-center space-x-3 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                }`}
              >
                {activeTab === 'upload' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                )}
                <Upload className={`h-5 w-5 relative z-10 ${activeTab === 'upload' ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
                <span className="relative z-10 font-semibold">Upload Data</span>
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`relative flex items-center space-x-3 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  activeTab === 'generate'
                    ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                }`}
              >
                {activeTab === 'generate' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary-400 to-secondary-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                )}
                <Bot className={`h-5 w-5 relative z-10 ${activeTab === 'generate' ? 'animate-spin' : 'group-hover:animate-wiggle'}`} />
                <span className="relative z-10 font-semibold">AI Generate</span>
              </button>
              <button
                onClick={() => setShowSchemaManager(true)}
                className="relative flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 group text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102"
              >
                <Database className="h-5 w-5 relative z-10 group-hover:animate-pulse" />
                <span className="relative z-10 font-semibold">Schemas ({customSchemas.length})</span>
              </button>
              <button
                onClick={() => setShowCredentialManager(true)}
                className="relative flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 group text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102"
              >
                <Database className="h-5 w-5 relative z-10 group-hover:animate-pulse" />
                <span className="relative z-10 font-semibold">Credentials</span>
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`relative flex items-center space-x-3 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  activeTab === 'docs'
                    ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                }`}
              >
                {activeTab === 'docs' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                )}
                <BookOpen className={`h-5 w-5 relative z-10 ${activeTab === 'docs' ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
                <span className="relative z-10 font-semibold">Documentation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-scaleIn">
          {/* Upload Form */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-glass-lg border border-white/30 p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent">
                    Upload Configuration
                  </h2>
                </div>
                
                <div className="space-y-8">
                  <CollectionInput
                    value={collectionName}
                    onChange={handleCollectionChange}
                    error={errors.collection}
                  />

                  <div className="space-y-4">
                    <FileUpload
                      onFileSelect={handleCredentialsFileSelect}
                      accept=".json"
                      label="Firebase Service Account Credentials"
                      description="JSON file with your Firebase service account credentials"
                      selectedFile={credentialsFile}
                      error={errors.credentials}
                      allowSaving={true}
                    />
                    <SavedCredentials
                      onCredentialSelect={handleCredentialsFileSelect}
                      selectedCredentialId={credentialsFile?.name}
                    />
                  </div>

                  <FileUpload
                    onFileSelect={handleDataFileSelect}
                    accept=".jsonl"
                    label="Data File (JSONL)"
                    description="JSONL file with documents to upload (one JSON object per line)"
                    selectedFile={dataFile}
                    error={errors.data}
                  />

                  {/* Generated Data Indicator */}
                  {generatedData.length > 0 && !showDataViewer && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Bot className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900">AI Generated Data Ready</h4>
                            <p className="text-sm text-green-700">
                              {generatedData.length} documents generated for "{selectedSchema?.name}" schema
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleReopenDataViewer}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View & Edit</span>
                          </button>
                          <button
                            onClick={handleClearGeneratedData}
                            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            <X className="h-4 w-4" />
                            <span>Clear</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.upload && (
                    <div className="relative p-6 bg-gradient-to-r from-danger-50 to-danger-100 border-l-4 border-danger-400 rounded-xl shadow-lg animate-slideIn">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-danger-100 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-danger-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-danger-800 mb-2">Upload Error</h4>
                          <p className="text-danger-700 leading-relaxed whitespace-pre-line">
                            {errors.upload}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className={`
                      relative w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-3 group overflow-hidden
                      ${canUpload
                        ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-glow hover:shadow-glow-lg transform hover:-translate-y-1 hover:scale-105'
                        : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed'
                      }
                    `}
                  >
                    {canUpload && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span className="relative z-10">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-6 w-6 relative z-10" />
                        <span className="relative z-10">Start Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress & Logs */}
          <div className="space-y-6">
            <ProgressBar progress={progress} isUploading={isUploading} />
            <LogViewer logs={logs} onClearLogs={clearLogs} />
            
            {/* Instructions */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-300 to-primary-400 rounded-2xl opacity-50 blur"></div>
              <div className="relative bg-gradient-to-br from-primary-50 via-white to-primary-100 border border-primary-200 rounded-2xl p-8 shadow-glass">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-900">
                    Quick Start Guide
                  </h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Download your Firebase service account credentials JSON file from the Firebase Console',
                    'Prepare your data in JSONL format (one JSON object per line)',
                    'Enter your target collection name',
                    'Upload both files and click "Start Upload"'
                  ].map((text, index) => (
                    <li key={index} className="flex items-start group cursor-default">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-sm font-bold rounded-full flex items-center justify-center mr-4 mt-0.5 group-hover:scale-110 transition-transform duration-200">
                        {index + 1}
                      </div>
                      <p className="text-primary-800 leading-relaxed group-hover:text-primary-900 transition-colors duration-200">
                        {text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* AI Generation Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-scaleIn">
            {/* Schema Selection & AI Generation */}
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-secondary-400 to-primary-400 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-glass-lg border border-white/30 p-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-secondary-700 to-primary-600 bg-clip-text text-transparent">
                      Schema Selection
                    </h2>
                  </div>
                  <SchemaSelector
                    selectedSchema={selectedSchema}
                    onSchemaSelect={setSelectedSchema}
                    customSchemas={customSchemas}
                    onCustomSchemaAdded={handleCustomSchemaAdded}
                    onSchemaUpdated={handleSchemaUpdated}
                    aiService={aiService || undefined}
                  />
                </div>
              </div>

              {selectedSchema && (
                <div className="animate-slideUp">
                  <AIGenerationForm
                    schema={selectedSchema}
                    onGenerate={handleAIGeneration}
                    isGenerating={isGenerating}
                    providers={aiProviders}
                    onProvidersChange={setAiProviders}
                  />
                </div>
              )}

              {errors.generation && (
                <div className="relative p-6 bg-gradient-to-r from-danger-50 to-danger-100 border-l-4 border-danger-400 rounded-xl shadow-lg animate-slideIn">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-danger-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-danger-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-danger-800 mb-2">Generation Error</h4>
                      <p className="text-danger-700 leading-relaxed whitespace-pre-line">
                        {errors.generation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schema Documentation & Preview */}
            <div className="space-y-6">
              {selectedSchema && (
                <div className="animate-fadeIn">
                  <SchemaViewer schema={selectedSchema} />
                </div>
              )}
              
              {dataFile && (
                <div className="relative group animate-slideUp">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-success-300 to-success-400 rounded-2xl opacity-50 blur"></div>
                  <div className="relative bg-gradient-to-br from-success-50 via-white to-success-100 border border-success-200 rounded-2xl p-8 shadow-glass">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-success-100 rounded-lg">
                        <FileText className="h-6 w-6 text-success-600" />
                      </div>
                      <h3 className="text-xl font-bold text-success-900">Generated Data Ready</h3>
                    </div>
                    <div className="relative p-6 bg-white/80 backdrop-blur-sm border border-success-300 rounded-xl shadow-inner-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-r from-success-500 to-success-600 rounded-xl shadow-lg">
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-success-800">{dataFile.name}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="inline-flex items-center px-3 py-1 bg-success-100 text-success-800 text-sm font-medium rounded-full">
                              {(dataFile.size / 1024).toFixed(2)} KB
                            </span>
                            <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">
                              Ready for Upload
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-primary-50/50 rounded-lg border border-primary-200">
                      <p className="text-primary-700 text-center leading-relaxed">
                        Switch to the <span className="font-semibold text-primary-800">"Upload Data"</span> tab to configure your Firestore credentials and upload the generated documents.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="max-w-5xl mx-auto animate-scaleIn">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 rounded-3xl opacity-30 blur-lg"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-glass-lg border border-white/30 p-2">
                <DocumentationViewer schemas={predefinedSchemas} />
              </div>
            </div>
          </div>
        )}
        
        {/* Schema Manager Modal */}
        {showSchemaManager && (
          <SchemaManager
            onClose={() => setShowSchemaManager(false)}
            onSchemaSelect={(schema) => {
              setSelectedSchema(schema);
              setActiveTab('generate');
            }}
            customSchemas={customSchemas}
            onSchemasChange={handleSchemasChange}
            aiService={aiService || undefined}
          />
        )}
        
        {/* Credential Manager Modal */}
        {showCredentialManager && (
          <CredentialManager
            onClose={() => setShowCredentialManager(false)}
            onCredentialsChange={() => {
              // Reload AI providers when credentials change
              const savedProviders = credentialStorage.getAIProviders();
              setAiProviders(savedProviders);
            }}
          />
        )}

        {/* Data Viewer Modal */}
        {showDataViewer && selectedSchema && (
          <DataViewer
            data={generatedData}
            schema={selectedSchema}
            onDataUpdate={handleDataUpdate}
            onClose={handleDataViewerClose}
            onRegenerate={handleRegenerateData}
            isRegenerating={isGenerating}
          />
        )}
      </div>
    </div>
  );
}

export default App;