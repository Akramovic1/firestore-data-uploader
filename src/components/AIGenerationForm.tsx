import React, { useState, useEffect } from 'react';
import { Bot, Key, Zap, Settings } from 'lucide-react';
import { DocumentSchema, AIProvider } from '../types';
import { CredentialStorage } from '../utils/credentialStorage';

interface AIGenerationFormProps {
  schema: DocumentSchema;
  onGenerate: (count: number, provider: 'openai' | 'claude', customPrompt?: string) => void;
  isGenerating: boolean;
  providers: AIProvider[];
  onProvidersChange: (providers: AIProvider[]) => void;
}

export const AIGenerationForm: React.FC<AIGenerationFormProps> = ({
  schema,
  onGenerate,
  isGenerating,
  providers,
  onProvidersChange
}) => {
  const [count, setCount] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'claude'>('openai');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [credentialStorage] = useState(() => CredentialStorage.getInstance());

  const updateProvider = (id: 'openai' | 'claude', apiKey: string) => {
    const updatedProviders = providers.filter(p => p.id !== id);
    if (apiKey.trim()) {
      const provider: AIProvider = {
        id,
        name: id === 'openai' ? 'OpenAI GPT-5' : 'Claude 4 Sonnet',
        apiKey: apiKey.trim()
      };
      updatedProviders.push(provider);
      // Save to storage
      credentialStorage.updateAIProvider(provider);
    } else {
      // Remove from storage
      credentialStorage.removeAIProvider(id);
    }
    onProvidersChange(updatedProviders);
  };

  const getProviderApiKey = (id: 'openai' | 'claude') => {
    return providers.find(p => p.id === id)?.apiKey || '';
  };

  const isProviderConfigured = (id: 'openai' | 'claude') => {
    return providers.some(p => p.id === id && p.apiKey.trim());
  };

  const canGenerate = isProviderConfigured(selectedProvider) && count > 0 && !isGenerating;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Document Generation</h3>
          <p className="text-sm text-gray-600">Generate realistic documents using AI</p>
        </div>
      </div>

      {/* API Keys Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Key className="h-4 w-4 mr-2" />
          API Keys Configuration
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={getProviderApiKey('openai')}
              onChange={(e) => updateProvider('openai', e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isProviderConfigured('openai') && (
              <p className="text-xs text-green-600">✓ Configured</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Claude API Key
            </label>
            <input
              type="password"
              value={getProviderApiKey('claude')}
              onChange={(e) => updateProvider('claude', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isProviderConfigured('claude') && (
              <p className="text-xs text-green-600">✓ Configured</p>
            )}
          </div>
        </div>
      </div>

      {/* Generation Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Generation Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Number of Documents
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500">Maximum 100 documents per generation</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              AI Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as 'openai' | 'claude')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="openai" disabled={!isProviderConfigured('openai')}>
                OpenAI GPT-5 {!isProviderConfigured('openai') && '(Not configured)'}
              </option>
              <option value="claude" disabled={!isProviderConfigured('claude')}>
                Claude 4 Sonnet {!isProviderConfigured('claude') && '(Not configured)'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Advanced Settings</span>
        </button>
        
        {showAdvanced && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Custom Prompt (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add specific requirements or constraints for document generation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500">
              Provide additional context or requirements for the AI to follow
            </p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={() => onGenerate(count, selectedProvider, customPrompt || undefined)}
        disabled={!canGenerate}
        className={`
          w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2
          ${canGenerate
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generating Documents...</span>
          </>
        ) : (
          <>
            <Zap className="h-5 w-5" />
            <span>Generate {count} Documents</span>
          </>
        )}
      </button>

      {!isProviderConfigured(selectedProvider) && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Please configure your {selectedProvider === 'openai' ? 'OpenAI' : 'Claude'} API key to generate documents.
          </p>
        </div>
      )}
    </div>
  );
};