import React, { useState } from 'react';
import { Eye, Code, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { DocumentSchema } from '../types';
import { SchemaStorage } from '../utils/schemaStorage';

interface SchemaViewerProps {
  schema: DocumentSchema;
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'example'>('fields');
  const [schemaStorage] = useState(() => SchemaStorage.getInstance());

  const getTypeColor = (type: string) => {
    const colors = {
      string: 'text-green-600 bg-green-100',
      number: 'text-blue-600 bg-blue-100',
      boolean: 'text-purple-600 bg-purple-100',
      array: 'text-orange-600 bg-orange-100',
      object: 'text-red-600 bg-red-100',
      timestamp: 'text-indigo-600 bg-indigo-100',
      email: 'text-pink-600 bg-pink-100',
      url: 'text-teal-600 bg-teal-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const handleDownloadSchema = (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      schemaStorage.exportSchema(schema);
    } catch (error) {
      console.error('Failed to download schema:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">{schema.name} Schema</h3>
              <p className="text-sm text-gray-600">{schema.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadSchema}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Download schema"
            >
              <Download className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'fields'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fields ({schema.fields.length})
            </button>
            <button
              onClick={() => setActiveTab('example')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'example'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Example
            </button>
          </div>

          {activeTab === 'fields' && (
            <div className="space-y-3">
              {schema.fields.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {field.name}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(field.type)}`}>
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                          required
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                  {field.example !== undefined && (
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-xs text-gray-500">Example: </span>
                      <code className="text-xs font-mono text-gray-800">
                        {JSON.stringify(field.example)}
                      </code>
                    </div>
                  )}
                  {field.validation && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Validation: </span>
                      <code className="font-mono">{JSON.stringify(field.validation)}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'example' && (
            <div className="space-y-3">
              {schema.examples.map((example, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Example Document {index + 1}
                    </span>
                    <Code className="h-4 w-4 text-gray-400" />
                  </div>
                  <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                    {JSON.stringify(example, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};