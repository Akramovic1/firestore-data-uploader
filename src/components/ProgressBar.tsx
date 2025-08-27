import React from 'react';
import { UploadProgress } from '../types';

interface ProgressBarProps {
  progress: UploadProgress;
  isUploading: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, isUploading }) => {
  if (!isUploading && progress.total === 0) {
    return null;
  }

  return (
    <div className="relative group animate-slideIn">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-300 to-secondary-300 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-glass-lg border border-white/30 p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent">
              Upload Progress
            </h3>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              {progress.percentage}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200/50 backdrop-blur-sm rounded-full h-4 shadow-inner-lg overflow-hidden">
            <div
              className="relative bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress.percentage}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          {/* Glow effect */}
          {progress.percentage > 0 && (
            <div 
              className="absolute top-0 left-0 h-4 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full blur opacity-50 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          )}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="relative group/stat">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-300 to-gray-400 rounded-xl opacity-0 group-hover/stat:opacity-100 transition duration-200 blur"></div>
            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-inner-lg">
              <div className="text-3xl font-bold text-gray-900 mb-1">{progress.total}</div>
              <div className="text-sm font-medium text-gray-600">Total</div>
              <div className="mt-2 h-1 w-full bg-gray-300 rounded-full">
                <div className="h-1 w-full bg-gradient-to-r from-gray-500 to-gray-600 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="relative group/stat">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-success-300 to-success-400 rounded-xl opacity-0 group-hover/stat:opacity-100 transition duration-200 blur"></div>
            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-inner-lg">
              <div className="text-3xl font-bold text-success-700 mb-1">{progress.completed}</div>
              <div className="text-sm font-medium text-success-600">Completed</div>
              <div className="mt-2 h-1 w-full bg-success-200 rounded-full">
                <div 
                  className="h-1 bg-gradient-to-r from-success-500 to-success-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="relative group/stat">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-danger-300 to-danger-400 rounded-xl opacity-0 group-hover/stat:opacity-100 transition duration-200 blur"></div>
            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-inner-lg">
              <div className="text-3xl font-bold text-danger-700 mb-1">{progress.failed}</div>
              <div className="text-sm font-medium text-danger-600">Failed</div>
              <div className="mt-2 h-1 w-full bg-danger-200 rounded-full">
                <div 
                  className="h-1 bg-gradient-to-r from-danger-500 to-danger-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.failed / progress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pulse indicator when uploading */}
        {isUploading && (
          <div className="flex items-center justify-center space-x-2 pt-2">
            <div className="h-2 w-2 bg-primary-500 rounded-full animate-pulse"></div>
            <div className="h-2 w-2 bg-secondary-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-sm text-gray-600 ml-3 font-medium">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};