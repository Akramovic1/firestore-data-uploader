import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, Upload, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { DocumentSchema, DocumentData } from '../types';
import { AIService } from '../services/aiService';
import { validateSchema } from '../utils/schemaValidation';

interface SchemaEnhancerProps {
  baseSchema: DocumentSchema;
  onSchemaEnhanced: (enhancedSchema: DocumentSchema) => void;
  onClose: () => void;
  aiService: AIService;
}

export const SchemaEnhancer: React.FC<SchemaEnhancerProps> = ({
  baseSchema,
  onSchemaEnhanced,
  onClose,
  aiService
}) => {
  const [exampleData, setExampleData] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewSchema, setPreviewSchema] = useState<DocumentSchema | null>(null);

  const parseExampleData = (): DocumentData | null => {
    try {
      const parsed = JSON.parse(exampleData);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setErrors(['Example data must be a valid JSON object']);
        return null;
      }
      return parsed;
    } catch (error) {
      setErrors(['Invalid JSON format. Please check your example data.']);
      return null;
    }
  };

  const generatePreview = async () => {
    const example = parseExampleData();
    if (!example) return;

    setIsEnhancing(true);
    setErrors([]);

    try {
      const enhancedSchema = await aiService.enhanceSchemaFromExample(
        baseSchema,
        example,
        'openai'
      );
      
      const validation = validateSchema(enhancedSchema);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      setPreviewSchema(enhancedSchema);
    } catch (error) {
      setErrors([`Schema enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancement = () => {
    if (previewSchema) {
      onSchemaEnhanced(previewSchema);
      onClose();
    }
  };

  const newFields = previewSchema 
    ? previewSchema.fields.filter(field => 
        !baseSchema.fields.some(baseField => baseField.name === field.name)
      )
    : [];

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Lightbulb className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Schema Enhancer</h2>
                <p className="text-gray-600">Enhance your schema by learning from example data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Example Data Input
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      JSON Example Data
                    </label>
                    <textarea
                      value={exampleData}
                      onChange={(e) => setExampleData(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                      placeholder={`{
  "userId": "user_123",
  "profile": {
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Software developer",
    "socialMedia": {
      "twitter": "@username",
      "github": "username"
    }
  },
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": false
    }
  },
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "isVerified": true
}`}
                    />
                  </div>
                  
                  <button
                    onClick={generatePreview}
                    disabled={isEnhancing || !exampleData.trim()}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {isEnhancing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Analyzing & Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-5 w-5" />
                        <span>Generate Enhancement Preview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Schema Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Current Schema</h4>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">{baseSchema.name}</p>
                  <p className="text-blue-600 mb-2">{baseSchema.description}</p>
                  <div className="flex items-center space-x-4 text-xs">
                    <span>{baseSchema.fields.length} fields</span>
                    <span>{baseSchema.fields.filter(f => f.required).length} required</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Enhancement Preview
                </h3>
                
                {errors.length > 0 && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="text-red-800 font-medium">Enhancement Errors</h4>
                        <ul className="mt-2 text-sm text-red-700">
                          {errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {previewSchema && newFields.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-900">
                          {newFields.length} New Fields Detected
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        {newFields.map((field, index) => (
                          <div key={index} className="bg-white border border-green-200 rounded p-3">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium text-gray-900">{field.name}</span>
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
                        ))}
                      </div>
                    </div>

                    {/* Schema Comparison */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Schema Comparison</h4>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">{baseSchema.fields.length}</div>
                          <div className="text-gray-600">Current Fields</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                        <div className="text-center">
                          <div className="font-medium text-green-600">{previewSchema.fields.length}</div>
                          <div className="text-gray-600">Enhanced Fields</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {previewSchema && newFields.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="font-medium text-yellow-800">No New Fields Detected</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The example data doesn't contain any new fields that aren't already in your schema.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!previewSchema && !isEnhancing && !errors.length && (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">No Preview Yet</h4>
                    <p className="text-sm text-gray-600">
                      Enter example JSON data and click "Generate Enhancement Preview" to see potential schema improvements.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              AI will analyze your example data and suggest relevant fields with appropriate types and validation.
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyEnhancement}
                disabled={!previewSchema || newFields.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply Enhancement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};