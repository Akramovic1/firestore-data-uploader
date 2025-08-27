import React from 'react';
import { CheckCircle, XCircle, Info, Trash2 } from 'lucide-react';
import { UploadLog } from '../types';

interface LogViewerProps {
  logs: UploadLog[];
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  if (logs.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="relative group animate-slideIn">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-glass-lg border border-white/30 p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg">
              <Info className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Upload Logs
            </h3>
          </div>
          <button
            onClick={onClearLogs}
            className="group/btn relative flex items-center space-x-2 px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-danger-400 to-danger-600 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"></div>
            <Trash2 size={16} className="relative z-10 group-hover/btn:animate-wiggle" />
            <span className="relative z-10">Clear Logs</span>
          </button>
        </div>
        
        <div className="max-h-80 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className={`group/log relative flex items-start space-x-4 p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-102 animate-slideIn`}
              style={{ 
                animationDelay: `${index * 50}ms`,
                backgroundColor: log.type === 'success' 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : log.type === 'error' 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(59, 130, 246, 0.1)',
                borderColor: log.type === 'success' 
                  ? 'rgba(34, 197, 94, 0.3)' 
                  : log.type === 'error' 
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)'
              }}
            >
              {/* Icon with enhanced styling */}
              <div className={`flex-shrink-0 p-2 rounded-lg shadow-lg ${
                log.type === 'success' 
                  ? 'bg-gradient-to-r from-success-500 to-success-600' 
                  : log.type === 'error' 
                    ? 'bg-gradient-to-r from-danger-500 to-danger-600'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600'
              }`}>
                {getIcon(log.type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className={`text-base font-semibold leading-relaxed ${getTextColor(log.type)}`}>
                    {log.message}
                  </p>
                  <div className="flex-shrink-0 ml-4">
                    <span className="inline-flex items-center px-3 py-1 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-full text-xs font-medium text-gray-600 shadow-inner-lg">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {log.details && (
                  <div className="mt-2 p-3 bg-white/40 backdrop-blur-sm border border-white/40 rounded-lg">
                    <p className="text-sm text-gray-700 leading-relaxed font-mono break-all">
                      {log.details}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover/log:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className={`absolute inset-0 rounded-xl blur opacity-30 ${
                  log.type === 'success' 
                    ? 'bg-gradient-to-r from-success-300 to-success-400' 
                    : log.type === 'error' 
                      ? 'bg-gradient-to-r from-danger-300 to-danger-400'
                      : 'bg-gradient-to-r from-primary-300 to-primary-400'
                }`}></div>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-2xl shadow-inner-lg mx-auto w-fit mb-4">
                <Info className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No logs yet</p>
              <p className="text-gray-400 text-sm mt-1">Upload activity will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};