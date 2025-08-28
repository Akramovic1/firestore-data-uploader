import React, { useState } from 'react';
import { Eye, Edit3, Download, RefreshCw, AlertCircle, CheckCircle, Copy, Trash2, Plus, Save } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DocumentSchema, DocumentData } from '../types';
import { validateFieldValue } from '../utils/schemaValidation';

interface DataViewerProps {
  data: DocumentData[];
  schema: DocumentSchema;
  onDataUpdate: (updatedData: DocumentData[]) => void;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const DataViewer: React.FC<DataViewerProps> = ({
  data,
  schema,
  onDataUpdate,
  onClose,
  onRegenerate,
  isRegenerating = false
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<DocumentData>({});
  const [editingErrors, setEditingErrors] = useState<Record<string, string>>({});
  const [jsonView, setJsonView] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Filter data based on search query
  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      const allIndices = filteredData.map((_, index) => data.indexOf(_));
      setSelectedItems(new Set(allIndices));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return;
    
    const newData = data.filter((_, index) => !selectedItems.has(index));
    onDataUpdate(newData);
    setSelectedItems(new Set());
  };

  const handleAddItem = () => {
    // Create a new empty item based on schema
    const newItem: DocumentData = {};
    schema.fields.forEach(field => {
      if (field.required) {
        switch (field.type) {
          case 'string':
          case 'email':
          case 'url':
            newItem[field.name] = '';
            break;
          case 'number':
            newItem[field.name] = 0;
            break;
          case 'boolean':
            newItem[field.name] = false;
            break;
          case 'array':
            newItem[field.name] = [];
            break;
          case 'object':
            newItem[field.name] = {};
            break;
          case 'timestamp':
            newItem[field.name] = new Date().toISOString();
            break;
          default:
            newItem[field.name] = '';
        }
      }
    });
    
    const newData = [...data, newItem];
    onDataUpdate(newData);
    setEditingItem(newData.length - 1);
  };

  const handleCopyToClipboard = () => {
    const jsonData = JSON.stringify(filteredData, null, 2);
    navigator.clipboard.writeText(jsonData);
  };

  const handleDownloadData = () => {
    const jsonlContent = filteredData.map(item => JSON.stringify(item)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.id}-modified-data.jsonl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEditItem = (index: number) => {
    setEditingItem(index);
    setEditingData({ ...data[index] });
    setEditingErrors({});
  };

  const handleSaveEdit = () => {
    if (editingItem === null) return;
    
    // Validate the edited data against schema
    const errors: Record<string, string> = {};
    schema.fields.forEach(field => {
      if (field.required && (!editingData[field.name] || editingData[field.name] === '')) {
        errors[field.name] = 'This field is required';
      } else if (editingData[field.name]) {
        const validation = validateFieldValue(editingData[field.name], field);
        if (!validation.valid) {
          errors[field.name] = validation.error || 'Invalid value';
        }
      }
    });
    
    setEditingErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      // Save the changes
      const newData = [...data];
      newData[editingItem] = { ...editingData };
      onDataUpdate(newData);
      setEditingItem(null);
      setEditingData({});
      setEditingErrors({});
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingData({});
    setEditingErrors({});
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error for this field if it exists
    if (editingErrors[fieldName]) {
      setEditingErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const renderTableView = () => {
    if (filteredData.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'No items match your search query.' : 'No data to display.'}
          </p>
        </div>
      );
    }

    const visibleFields = schema.fields.slice(0, 5); // Show first 5 fields in table
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </th>
              {visibleFields.map(field => (
                <th key={field.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span>{field.name}</span>
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-xs text-gray-400 normal-case">{field.type}</div>
                </th>
              ))}
              {schema.fields.length > 5 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  +{schema.fields.length - 5} more
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item, index) => {
              const originalIndex = data.indexOf(item);
              return (
                <tr key={originalIndex} className={`hover:bg-gray-50 ${selectedItems.has(originalIndex) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(originalIndex)}
                      onChange={() => handleSelectItem(originalIndex)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </td>
                  {visibleFields.map(field => (
                    <td key={field.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-32 truncate" title={String(item[field.name] || '')}>
                        {field.type === 'boolean' 
                          ? (item[field.name] ? '✓' : '✗')
                          : field.type === 'object' || field.type === 'array'
                          ? `${field.type} (${Array.isArray(item[field.name]) ? item[field.name].length : Object.keys(item[field.name] || {}).length})`
                          : String(item[field.name] || '')
                        }
                      </div>
                    </td>
                  ))}
                  {schema.fields.length > 5 && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        View all →
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditItem(originalIndex)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                      title="Edit this item"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderJsonView = () => {
    React.useEffect(() => {
      if (jsonView === '') {
        setJsonView(JSON.stringify(filteredData, null, 2));
      }
    }, [filteredData, jsonView]);
    
    const handleJsonSave = () => {
      try {
        const parsedData = JSON.parse(jsonView);
        
        // Validate that it's an array
        if (!Array.isArray(parsedData)) {
          throw new Error('JSON must be an array of objects');
        }
        
        // Validate each item against schema
        const errors: string[] = [];
        parsedData.forEach((item, index) => {
          if (typeof item !== 'object' || item === null) {
            errors.push(`Item ${index + 1}: Must be an object`);
            return;
          }
          
          schema.fields.forEach(field => {
            if (field.required && (!item[field.name] || item[field.name] === '')) {
              errors.push(`Item ${index + 1}: ${field.name} is required`);
            } else if (item[field.name]) {
              const validation = validateFieldValue(item[field.name], field);
              if (!validation.valid) {
                errors.push(`Item ${index + 1}: ${field.name} - ${validation.error}`);
              }
            }
          });
        });
        
        if (errors.length > 0) {
          setJsonError(errors.join('\\n'));
          return;
        }
        
        // Update the data
        onDataUpdate(parsedData);
        setJsonError('');
        
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
      }
    };
    
    const handleJsonReset = () => {
      setJsonView(JSON.stringify(filteredData, null, 2));
      setJsonError('');
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">JSON Data ({filteredData.length} items)</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleJsonReset}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleJsonSave}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Apply Changes</span>
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </button>
          </div>
        </div>
        
        {jsonError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">JSON Validation Error:</p>
              <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{jsonError}</pre>
            </div>
          </div>
        )}
        
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <textarea
            value={jsonView}
            onChange={(e) => setJsonView(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-green-400 border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Edit your JSON data here..."
            spellCheck={false}
          />
        </div>
        
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-800 mb-1">JSON Editing Tips:</p>
          <ul className="space-y-1 text-blue-700">
            <li>• Data must be a valid JSON array of objects</li>
            <li>• Each object will be validated against the selected schema</li>
            <li>• Required fields must be present and non-empty</li>
            <li>• Click "Apply Changes" to save your edits</li>
            <li>• Use "Reset" to revert to the original data</li>
          </ul>
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1400] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Generated Data Viewer</h2>
                <p className="text-gray-600">
                  Review and modify your AI-generated data ({data.length} items)
                </p>
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

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-primary-600 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'json'
                      ? 'bg-primary-600 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  JSON View
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedItems.size} selected
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={handleAddItem}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                </button>
              )}

              <button
                onClick={handleDownloadData}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 300px)' }}>
          <div className="p-6">
            {viewMode === 'table' ? renderTableView() : renderJsonView()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {data.length} items</span>
              {searchQuery && (
                <span>Filtered: {filteredData.length} items</span>
              )}
              <span>Schema: {schema.name}</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  // The data has already been updated through onDataUpdate calls
                }}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Use This Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFieldEditor = (field: any, value: any) => {
    const hasError = !!editingErrors[field.name];
    const errorMessage = editingErrors[field.name];

    const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`;

    switch (field.type) {
      case 'boolean':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                {field.required && <span className="text-red-500 mr-1">*</span>}
                {field.name}
              </span>
            </div>
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.required && <span className="text-red-500 mr-1">*</span>}
              {field.name}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
              className={baseInputClass}
              placeholder={`Enter ${field.name}`}
            />
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
      
      case 'array':
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.required && <span className="text-red-500 mr-1">*</span>}
              {field.name} (comma-separated)
            </label>
            <input
              type="text"
              value={Array.isArray(value) ? value.join(', ') : ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value.split(',').map(v => v.trim()).filter(v => v))}
              className={baseInputClass}
              placeholder={`Enter ${field.name} separated by commas`}
            />
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
      
      case 'object':
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.required && <span className="text-red-500 mr-1">*</span>}
              {field.name} (JSON)
            </label>
            <textarea
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || '{}');
                  handleFieldChange(field.name, parsed);
                } catch {
                  handleFieldChange(field.name, e.target.value);
                }
              }}
              className={baseInputClass}
              rows={3}
              placeholder={`Enter ${field.name} as JSON`}
            />
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
      
      case 'timestamp':
        const dateValue = value ? (typeof value === 'string' ? value.split('T')[0] : new Date(value).toISOString().split('T')[0]) : '';
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.required && <span className="text-red-500 mr-1">*</span>}
              {field.name}
            </label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => handleFieldChange(field.name, new Date(e.target.value).toISOString())}
              className={baseInputClass}
            />
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
      
      default: // string, email, url
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.required && <span className="text-red-500 mr-1">*</span>}
              {field.name}
            </label>
            <input
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={baseInputClass}
              placeholder={`Enter ${field.name}`}
            />
            {hasError && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>
        );
    }
  };

  const editorModal = editingItem !== null && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1500] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Item</h3>
                <p className="text-gray-600">Modify the fields below</p>
              </div>
            </div>
            <button
              onClick={handleCancelEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {schema.fields.map(field => (
            <div key={field.name}>
              {renderFieldEditor(field, editingData[field.name])}
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancelEdit}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {editorModal && createPortal(editorModal, document.body)}
    </>
  );
};