import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Save, X, Plus, Trash2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentSchema, SchemaField } from '../types';
import { validateSchema, validateSchemaField } from '../utils/schemaValidation';
import { AIService } from '../services/aiService';

interface SchemaEditorProps {
  schema: DocumentSchema;
  onSchemaUpdate: (schema: DocumentSchema) => void;
  onClose: () => void;
  aiService?: AIService;
}

interface FieldEditState {
  field: SchemaField;
  isEditing: boolean;
  hasChanges: boolean;
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({ 
  schema, 
  onSchemaUpdate, 
  onClose,
  aiService 
}) => {
  const [editedSchema, setEditedSchema] = useState<DocumentSchema>({ ...schema });
  const [fieldStates, setFieldStates] = useState<FieldEditState[]>([]);
  const [newField, setNewField] = useState<Partial<SchemaField>>({
    name: '',
    type: 'string',
    required: false,
    description: ''
  });
  const [showAddField, setShowAddField] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiField, setShowAiField] = useState(false);

  useEffect(() => {
    // Initialize field states
    const states = editedSchema.fields.map(field => ({
      field: { ...field },
      isEditing: false,
      hasChanges: false
    }));
    setFieldStates(states);
  }, [editedSchema.fields]);

  useEffect(() => {
    // Validate schema on changes
    const validation = validateSchema(editedSchema);
    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [editedSchema]);

  const updateSchemaProperty = (property: keyof DocumentSchema, value: any) => {
    setEditedSchema(prev => ({ ...prev, [property]: value }));
  };

  const updateFieldState = (index: number, updates: Partial<FieldEditState>) => {
    setFieldStates(prev => prev.map((state, i) => 
      i === index ? { ...state, ...updates } : state
    ));
  };

  const updateFieldProperty = (index: number, property: keyof SchemaField, value: any) => {
    const newField = { ...fieldStates[index].field, [property]: value };
    updateFieldState(index, { 
      field: newField, 
      hasChanges: true 
    });
  };

  const saveField = (index: number) => {
    const fieldState = fieldStates[index];
    const fieldErrors = validateSchemaField(fieldState.field);
    
    if (fieldErrors.length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const newFields = [...editedSchema.fields];
    newFields[index] = fieldState.field;
    
    setEditedSchema(prev => ({ ...prev, fields: newFields }));
    updateFieldState(index, { isEditing: false, hasChanges: false });
  };

  const cancelFieldEdit = (index: number) => {
    const originalField = editedSchema.fields[index];
    updateFieldState(index, {
      field: { ...originalField },
      isEditing: false,
      hasChanges: false
    });
  };

  const removeField = (index: number) => {
    const newFields = editedSchema.fields.filter((_, i) => i !== index);
    setEditedSchema(prev => ({ ...prev, fields: newFields }));
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

    const fieldErrors = validateSchemaField(field);
    if (fieldErrors.length > 0) {
      setErrors(fieldErrors);
      return;
    }

    // Check for duplicate field names
    const existingNames = editedSchema.fields.map(f => f.name.toLowerCase());
    if (existingNames.includes(field.name.toLowerCase())) {
      setErrors([`Field name '${field.name}' already exists`]);
      return;
    }

    setEditedSchema(prev => ({
      ...prev,
      fields: [...prev.fields, field]
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

  const generateFieldsWithAI = async () => {
    if (!aiService || !aiPrompt.trim()) {
      setErrors(['Please enter a description for the fields to generate']);
      return;
    }

    setIsGenerating(true);
    setErrors([]);

    try {
      // Use the enhanced AI field generation method
      const newFields = await aiService.generateSchemaFields(
        editedSchema,
        aiPrompt,
        'openai' // Default provider
      );

      if (newFields.length > 0) {
        setEditedSchema(prev => ({
          ...prev,
          fields: [...prev.fields, ...newFields]
        }));
        setAiPrompt('');
        setShowAiField(false);
      } else {
        setErrors(['No valid fields could be generated from the AI response']);
      }
    } catch (error) {
      setErrors([`AI field generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSchema = () => {
    const validation = validateSchema(editedSchema);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setShowValidation(true);
      return;
    }

    onSchemaUpdate(editedSchema);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Edit3 className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Schema</h2>
                <p className="text-gray-600">Modify schema properties and fields</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowValidation(!showValidation)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  errors.length > 0 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {showValidation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-sm">
                  {errors.length > 0 ? `${errors.length} errors` : 'Valid'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          <div className="p-6">
            {/* Validation Messages */}
          {showValidation && (errors.length > 0 || warnings.length > 0) && (
            <div className="mb-6 space-y-3">
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-red-800 font-medium">Errors</h4>
                      <ul className="mt-2 text-sm text-red-700">
                        {errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-yellow-800 font-medium">Warnings</h4>
                      <ul className="mt-2 text-sm text-yellow-700">
                        {warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schema Basic Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schema Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schema Name
                </label>
                <input
                  type="text"
                  value={editedSchema.name}
                  onChange={(e) => updateSchemaProperty('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={editedSchema.category}
                  onChange={(e) => updateSchemaProperty('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editedSchema.description}
                onChange={(e) => updateSchemaProperty('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fields Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Schema Fields</h3>
              <div className="flex space-x-2">
                {aiService && (
                  <button
                    onClick={() => setShowAiField(!showAiField)}
                    className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>AI Generate</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddField(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Field</span>
                </button>
              </div>
            </div>

            {/* AI Field Generation */}
            {showAiField && aiService && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-3">AI Field Generation</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what fields you need (e.g., 'add social media fields', 'include address information')"
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isGenerating && aiPrompt.trim()) {
                        generateFieldsWithAI();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-purple-700">
                      <span className="font-medium">Examples:</span> "user profile fields", "e-commerce product details", "blog post metadata"
                    </div>
                    <button
                      onClick={generateFieldsWithAI}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate Fields'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Fields */}
            <div className="space-y-4">
              {fieldStates.map((fieldState, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  {fieldState.isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Name
                          </label>
                          <input
                            type="text"
                            value={fieldState.field.name}
                            onChange={(e) => updateFieldProperty(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={fieldState.field.type}
                            onChange={(e) => updateFieldProperty(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                        <div className="flex items-center">
                          <label className="flex items-center mt-6">
                            <input
                              type="checkbox"
                              checked={fieldState.field.required}
                              onChange={(e) => updateFieldProperty(index, 'required', e.target.checked)}
                              className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={fieldState.field.description}
                          onChange={(e) => updateFieldProperty(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveField(index)}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => cancelFieldEdit(index)}
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{fieldState.field.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {fieldState.field.type}
                          </span>
                          {fieldState.field.required && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{fieldState.field.description}</p>
                        {fieldState.field.example && (
                          <p className="text-xs text-gray-500 mt-1">
                            Example: {JSON.stringify(fieldState.field.example)}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => updateFieldState(index, { isEditing: true })}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit field"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Field */}
            {showAddField && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Add New Field</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={newField.name || ''}
                      onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., firstName"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={newField.type || 'string'}
                      onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <div className="flex items-center">
                    <label className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        checked={newField.required || false}
                        onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                        className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      Required
                    </label>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newField.description || ''}
                    onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Describe this field..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={addField}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Field</span>
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
                      setErrors([]);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {errors.length === 0 ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Schema is valid</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{errors.length} validation errors</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSchema}
                disabled={errors.length > 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );

  const enhancerModal = showEnhancer && aiService && (
    <SchemaEnhancer
      baseSchema={editedSchema}
      onSchemaEnhanced={(enhanced) => {
        setEditedSchema(enhanced);
        setShowEnhancer(false);
      }}
      onClose={() => setShowEnhancer(false)}
      aiService={aiService}
    />
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {enhancerModal}
    </>
  );
};