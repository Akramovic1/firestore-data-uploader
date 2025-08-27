import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileText, AlertCircle, CheckCircle, X, Edit3, Plus } from 'lucide-react';
import { DocumentSchema, SchemaField } from '../types';
import { validateSchema } from '../utils/schemaValidation';
import { SchemaStorage } from '../utils/schemaStorage';

interface SchemaUploadProps {
  onSchemaCreated: (schema: DocumentSchema) => void;
  onClose?: () => void;
}

export const SchemaUpload: React.FC<SchemaUploadProps> = ({ onSchemaCreated, onClose }) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual'>('file');
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [manualSchema, setManualSchema] = useState<Partial<DocumentSchema>>({
    name: '',
    description: '',
    category: '',
    fields: [],
    examples: []
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [schemaStorage] = useState(() => SchemaStorage.getInstance());
  const [isProcessing, setIsProcessing] = useState(false);
  const [newField, setNewField] = useState<Partial<SchemaField>>({
    name: '',
    type: 'string',
    required: false,
    description: ''
  });
  const [showAddField, setShowAddField] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSchemaFile(file);
      setErrors([]);
    }
  }, []);

  const processSchemaFile = async (file: File): Promise<DocumentSchema> => {
    const content = await file.text();
    let parsedSchema: any;

    try {
      parsedSchema = JSON.parse(content);
    } catch (error) {
      throw new Error('Invalid JSON format. Please ensure your schema file is valid JSON.');
    }

    // Validate and transform the schema
    const validation = validateSchema(parsedSchema);
    if (!validation.isValid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate ID if not provided
    if (!parsedSchema.id) {
      parsedSchema.id = parsedSchema.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Ensure examples array exists
    if (!parsedSchema.examples) {
      parsedSchema.examples = [];
    }

    return parsedSchema as DocumentSchema;
  };

  const handleFileUpload = async () => {
    if (!schemaFile) {
      setErrors(['Please select a schema file']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    try {
      const schema = await processSchemaFile(schemaFile);
      
      // Save to local storage
      try {
        schemaStorage.saveSchema(schema);
      } catch (saveError) {
        setErrors([`Failed to save schema: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`]);
        return;
      }
      
      onSchemaCreated(schema);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to process schema file']);
    } finally {
      setIsProcessing(false);
    }
  };

  const addField = () => {
    if (!newField.name || !newField.description) {
      setErrors(['Field name and description are required']);
      return;
    }

    const field: SchemaField = {
      name: newField.name,
      type: newField.type || 'string',
      required: newField.required || false,
      description: newField.description,
      example: newField.example,
      validation: newField.validation
    };

    setManualSchema(prev => ({
      ...prev,
      fields: [...(prev.fields || []), field]
    }));

    setNewField({
      name: '',
      type: 'string',
      required: false,
      description: ''
    });
    setShowAddField(false);
    setErrors([]);
  };

  const removeField = (index: number) => {
    setManualSchema(prev => ({
      ...prev,
      fields: prev.fields?.filter((_, i) => i !== index) || []
    }));
  };

  const handleManualSchemaSubmit = () => {
    if (!manualSchema.name || !manualSchema.description || !manualSchema.category) {
      setErrors(['Schema name, description, and category are required']);
      return;
    }

    if (!manualSchema.fields || manualSchema.fields.length === 0) {
      setErrors(['At least one field is required']);
      return;
    }

    const schema: DocumentSchema = {
      id: manualSchema.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
      name: manualSchema.name,
      description: manualSchema.description,
      category: manualSchema.category,
      fields: manualSchema.fields,
      examples: manualSchema.examples || []
    };

    const validation = validateSchema(schema);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Save to local storage
    try {
      schemaStorage.saveSchema(schema);
    } catch (error) {
      setErrors([`Failed to save schema: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      return;
    }

    onSchemaCreated(schema);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Plus className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Custom Schema</h2>
                <p className="text-gray-600">Upload a JSON schema file or create one manually</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 160px)' }}>
          <div className="p-6">
            {/* Upload Method Selection */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setUploadMethod('file')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  uploadMethod === 'file'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Upload JSON File
              </button>
              <button
                onClick={() => setUploadMethod('manual')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  uploadMethod === 'manual'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="h-4 w-4 inline mr-2" />
                Create Manually
              </button>
            </div>
          </div>

          {/* File Upload Method */}
          {uploadMethod === 'file' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Schema JSON File
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">JSON files only</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".json"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
                {schemaFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">{schemaFile.name}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Expected JSON Format:</h4>
                <pre className="text-sm text-blue-800 bg-blue-100 p-3 rounded overflow-x-auto">
{`{
  "name": "Schema Name",
  "description": "Schema description",
  "category": "Category",
  "fields": [
    {
      "name": "fieldName",
      "type": "string",
      "required": true,
      "description": "Field description",
      "example": "Example value"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Manual Creation Method */}
          {uploadMethod === 'manual' && (
            <div className="space-y-6">
              {/* Basic Schema Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schema Name *
                  </label>
                  <input
                    type="text"
                    value={manualSchema.name || ''}
                    onChange={(e) => setManualSchema(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., User Profile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={manualSchema.category || ''}
                    onChange={(e) => setManualSchema(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Users"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={manualSchema.description || ''}
                  onChange={(e) => setManualSchema(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what this schema represents..."
                />
              </div>

              {/* Fields Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Schema Fields</h4>
                  <button
                    onClick={() => setShowAddField(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Field</span>
                  </button>
                </div>

                {/* Existing Fields */}
                <div className="space-y-3">
                  {manualSchema.fields?.map((field, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-medium text-gray-900">{field.name}</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{field.description}</p>
                          {field.example && (
                            <p className="text-xs text-gray-500 mt-1">
                              Example: {JSON.stringify(field.example)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Field Form */}
                {showAddField && (
                  <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h5 className="font-medium text-gray-900 mb-4">Add New Field</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={newField.name || ''}
                          onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., firstName"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Field Type
                        </label>
                        <select
                          value={newField.type || 'string'}
                          onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="array">Array</option>
                          <option value="object">Object</option>
                          <option value="timestamp">Timestamp</option>
                          <option value="email">Email</option>
                          <option value="url">URL</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={newField.description || ''}
                        onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={2}
                        placeholder="Describe this field..."
                      />
                    </div>

                    <div className="flex items-center space-x-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newField.required || false}
                          onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                          className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        Required Field
                      </label>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={addField}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add Field
                      </button>
                      <button
                        onClick={() => {
                          setShowAddField(false);
                          setNewField({
                            name: '',
                            type: 'string',
                            required: false,
                            description: ''
                          });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-medium">Validation Errors</h4>
                  <ul className="mt-2 text-sm text-red-700">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3 justify-end">
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={uploadMethod === 'file' ? handleFileUpload : handleManualSchemaSubmit}
              disabled={isProcessing || (uploadMethod === 'file' ? !schemaFile : !manualSchema.name)}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                  Processing...
                </>
              ) : (
                'Create Schema'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};