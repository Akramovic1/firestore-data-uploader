import React from 'react';
import { Database } from 'lucide-react';

interface CollectionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const CollectionInput: React.FC<CollectionInputProps> = ({
  value,
  onChange,
  error
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-base font-semibold text-gray-800">
        Collection Name
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <Database className={`h-6 w-6 transition-all duration-200 ${
            value ? 'text-primary-500' : 'text-gray-400 group-focus-within:text-primary-500'
          }`} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full pl-14 pr-4 py-4 text-lg bg-white/80 backdrop-blur-sm border-2 rounded-2xl focus:outline-none focus:ring-0 transition-all duration-300 shadow-inner-lg
            ${error 
              ? 'border-danger-400 focus:border-danger-500 bg-danger-50/80 text-danger-900' 
              : value
                ? 'border-success-400 focus:border-success-500 bg-success-50/80 text-success-900'
                : 'border-gray-300 focus:border-primary-500 text-gray-900 hover:border-primary-300 focus:shadow-glow'
            }
          `}
          placeholder="Enter collection name (e.g., users, products, orders)"
        />
        
        {/* Animated border glow */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none
          ${!error && 'group-focus-within:opacity-100'}
        `}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-400 to-secondary-400 blur opacity-50"></div>
        </div>
        
        {/* Success indicator */}
        {value && !error && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="h-3 w-3 bg-success-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-danger-50 border-l-4 border-danger-400 rounded-lg animate-slideIn">
          <Database className="h-4 w-4 text-danger-600 flex-shrink-0" />
          <p className="text-sm font-medium text-danger-700">{error}</p>
        </div>
      )}
      
      <div className="flex items-center space-x-2 p-3 bg-primary-50/50 rounded-lg border border-primary-200">
        <div className="h-2 w-2 bg-primary-500 rounded-full animate-pulse"></div>
        <p className="text-sm text-primary-700">
          The collection will be created automatically if it doesn't exist
        </p>
      </div>
    </div>
  );
};