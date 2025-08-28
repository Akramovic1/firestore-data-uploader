import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  label: string;
  description: string;
  selectedFile?: File | null;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  label,
  description,
  selectedFile,
  error
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const removeFile = useCallback(() => {
    onFileSelect(null as any);
  }, [onFileSelect]);

  return (
    <div className="space-y-3">
      <label className="block text-base font-semibold text-gray-800">{label}</label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 group cursor-pointer backdrop-blur-sm
          ${isDragOver 
            ? 'border-primary-400 bg-primary-50/80 shadow-glow scale-102' 
            : error 
              ? 'border-danger-400 bg-danger-50/80 shadow-lg' 
              : selectedFile 
                ? 'border-success-400 bg-success-50/80 shadow-lg' 
                : 'border-gray-300 bg-white/50 hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-lg hover:scale-101'
          }
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Animated background overlay */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
          ${isDragOver ? 'opacity-100 bg-gradient-to-r from-primary-400/20 to-secondary-400/20' : ''}
        `} />
        
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="text-center relative z-5">
          {selectedFile ? (
            <div className="space-y-4 animate-scaleIn">
              <div className="relative group">
                <div className="p-4 bg-gradient-to-r from-success-500 to-success-600 rounded-2xl shadow-lg mx-auto w-fit">
                  <File className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="p-2 bg-danger-500 hover:bg-danger-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-lg font-semibold text-success-800">{selectedFile.name}</p>
                <div className="flex justify-center items-center space-x-3">
                  <span className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-success-300 rounded-full text-sm font-medium text-success-700 shadow-inner-lg">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {allowSaving && accept === '.json' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveCredentials();
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm shadow-lg"
                      title="Save credentials for future use"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                  )}
                </div>
                {saveMessage && (
                  <div className={`p-3 rounded-lg flex items-center justify-center space-x-2 text-sm transition-all duration-300 ${
                    saveMessage.type === 'success' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {saveMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>{saveMessage.text}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className={`
                p-4 rounded-2xl shadow-lg mx-auto w-fit transition-all duration-300 
                ${isDragOver 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 scale-110' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-500 group-hover:from-primary-500 group-hover:to-primary-600 group-hover:scale-110'
                }
              `}>
                <Upload className={`h-10 w-10 text-white transition-transform duration-300 ${isDragOver ? 'animate-bounce' : 'group-hover:animate-pulse'}`} />
              </div>
              <div className="space-y-2">
                <p className="text-lg text-gray-700">
                  <span className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Click to upload</span>
                  {' '}or drag and drop
                </p>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{description}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-danger-50 border-l-4 border-danger-400 rounded-lg animate-slideIn">
          <AlertCircle className="h-4 w-4 text-danger-600 flex-shrink-0" />
          <p className="text-sm font-medium text-danger-700">{error}</p>
        </div>
      )}
    </div>
  );
};