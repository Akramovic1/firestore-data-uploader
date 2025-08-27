import React, { useState } from 'react';
import { Book, Download, Copy, Check } from 'lucide-react';
import { DocumentSchema } from '../types';

interface DocumentationViewerProps {
  schemas: DocumentSchema[];
}

export const DocumentationViewer: React.FC<DocumentationViewerProps> = ({ schemas }) => {
  const [copiedSchema, setCopiedSchema] = useState<string | null>(null);

  const copyToClipboard = async (text: string, schemaId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSchema(schemaId);
      setTimeout(() => setCopiedSchema(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateMarkdownDoc = (schema: DocumentSchema) => {
    return `# ${schema.name} Schema

${schema.description}

**Category:** ${schema.category}

## Fields

| Field | Type | Required | Description | Example | Validation |
|-------|------|----------|-------------|---------|------------|
${schema.fields.map(field => {
  const validation = field.validation ? JSON.stringify(field.validation) : '-';
  const example = field.example !== undefined ? JSON.stringify(field.example) : '-';
  return `| \`${field.name}\` | ${field.type} | ${field.required ? '✓' : '✗'} | ${field.description} | ${example} | ${validation} |`;
}).join('\n')}

## Example Document

\`\`\`json
${JSON.stringify(schema.examples[0], null, 2)}
\`\`\`

## JSONL Format Example

\`\`\`
${schema.examples.map(example => JSON.stringify(example)).join('\n')}
\`\`\`
`;
  };

  const downloadDocumentation = (schema: DocumentSchema) => {
    const markdown = generateMarkdownDoc(schema);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.id}-schema-documentation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg">
          <Book className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Schema Documentation</h3>
          <p className="text-sm text-gray-600">Complete documentation for all available schemas</p>
        </div>
      </div>

      <div className="space-y-4">
        {schemas.map(schema => (
          <div key={schema.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{schema.name}</h4>
                  <p className="text-sm text-gray-600">{schema.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(generateMarkdownDoc(schema), schema.id)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  >
                    {copiedSchema === schema.id ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadDocumentation(schema)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Schema Overview</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Category: <span className="font-medium">{schema.category}</span></div>
                    <div>Total Fields: <span className="font-medium">{schema.fields.length}</span></div>
                    <div>Required Fields: <span className="font-medium">{schema.fields.filter(f => f.required).length}</span></div>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Field Types</h5>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(schema.fields.map(f => f.type))].map(type => (
                      <span
                        key={type}
                        className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Example JSONL Entry</h5>
                <div className="bg-gray-50 rounded p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-gray-800">
                    {JSON.stringify(schema.examples[0])}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Usage Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select a schema template that matches your data requirements</li>
          <li>• Use the AI generation feature to create realistic test data</li>
          <li>• Download documentation for reference and team sharing</li>
          <li>• Follow the field types and validation rules for consistent data</li>
          <li>• Use the JSONL format examples for manual data preparation</li>
        </ul>
      </div>
    </div>
  );
};