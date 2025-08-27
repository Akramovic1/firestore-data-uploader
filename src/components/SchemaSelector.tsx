import React, { useState } from 'react';
import { FileText, Plus, Edit3, Upload, Download } from 'lucide-react';
import { DocumentSchema } from '../types';
import { predefinedSchemas, getAllCategories } from '../schemas/predefinedSchemas';
import { SchemaUpload } from './SchemaUpload';
import { SchemaEditor } from './SchemaEditor';
import { AIService } from '../services/aiService';
import { SchemaStorage } from '../utils/schemaStorage';

interface SchemaSelectorProps {
  selectedSchema: DocumentSchema | null;
  onSchemaSelect: (schema: DocumentSchema) => void;
  customSchemas?: DocumentSchema[];
  onCustomSchemaAdded?: (schema: DocumentSchema) => void;
  onSchemaUpdated?: (schema: DocumentSchema) => void;
  aiService?: AIService;
}

export const SchemaSelector: React.FC<SchemaSelectorProps> = ({
  selectedSchema,
  onSchemaSelect,
  customSchemas = [],
  onCustomSchemaAdded,
  onSchemaUpdated,
  aiService
}) => {
  const [showSchemaUpload, setShowSchemaUpload] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [schemaToEdit, setSchemaToEdit] = useState<DocumentSchema | null>(null);
  const [schemaStorage] = useState(() => SchemaStorage.getInstance());
  
  // Combine predefined and custom schemas
  const allSchemas = [...predefinedSchemas, ...customSchemas];
  const categories = [...new Set(allSchemas.map(schema => schema.category))];
  
  const handleCustomSchemaCreated = (schema: DocumentSchema) => {
    onCustomSchemaAdded?.(schema);
    onSchemaSelect(schema);
    setShowSchemaUpload(false);
  };

  const handleEditSchema = (schema: DocumentSchema) => {
    setSchemaToEdit(schema);
    setShowSchemaEditor(true);
  };

  const handleSchemaUpdated = (updatedSchema: DocumentSchema) => {
    onSchemaUpdated?.(updatedSchema);
    onSchemaSelect(updatedSchema);
    setShowSchemaEditor(false);
    setSchemaToEdit(null);
  };

  const handleDownloadSchema = (schema: DocumentSchema, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      schemaStorage.exportSchema(schema);
    } catch (error) {
      console.error('Failed to download schema:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Document Schema Template
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSchemaUpload(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Custom Schema</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {categories.map(category => {
          const categorySchemas = allSchemas.filter(s => s.category === category);
          const isCustomCategory = !getAllCategories().includes(category);
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  {category}
                  {isCustomCategory && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                      Custom
                    </span>
                  )}
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {categorySchemas.map(schema => (
                  <div
                    key={schema.id}
                    className={`
                      relative group p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                      ${selectedSchema?.id === schema.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <button
                      onClick={() => onSchemaSelect(schema)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start space-x-3">
                        <FileText className={`h-5 w-5 mt-0.5 ${
                          selectedSchema?.id === schema.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-medium ${
                            selectedSchema?.id === schema.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {schema.name}
                          </h5>
                          <p className={`text-sm mt-1 ${
                            selectedSchema?.id === schema.id ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {schema.description}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <span>{schema.fields.length} fields</span>
                            <span className="mx-2">•</span>
                            <span>{schema.fields.filter(f => f.required).length} required</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={(e) => handleDownloadSchema(schema, e)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download schema"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {isCustomCategory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSchema(schema);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Edit schema"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Schema Upload Modal */}
      {showSchemaUpload && (
        <SchemaUpload
          onSchemaCreated={handleCustomSchemaCreated}
          onClose={() => setShowSchemaUpload(false)}
        />
      )}
      
      {/* Schema Editor Modal */}
      {showSchemaEditor && schemaToEdit && (
        <SchemaEditor
          schema={schemaToEdit}
          onSchemaUpdate={handleSchemaUpdated}
          onClose={() => {
            setShowSchemaEditor(false);
            setSchemaToEdit(null);
          }}
          aiService={aiService}
        />
      )}
    </div>
  );
};