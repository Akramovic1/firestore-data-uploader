import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept: string;
  label: string;
  description: string;
  selectedFiles?: File[];
  error?: string;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  label,
  description,
  selectedFiles = [],
  error,
  multiple = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple) {
        onFileSelect([...selectedFiles, ...files]);
      } else {
        onFileSelect([files[0]]);
      }
    }
  }, [onFileSelect, multiple, selectedFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      if (multiple) {
        onFileSelect([...selectedFiles, ...fileArray]);
      } else {
        onFileSelect([fileArray[0]]);
      }
    }
  }, [onFileSelect, multiple, selectedFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFileSelect(newFiles);
  }, [onFileSelect, selectedFiles]);

  const removeAllFiles = useCallback(() => {
    onFileSelect([]);
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
              : selectedFiles.length > 0 
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
          multiple={multiple}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="text-center relative z-5">
          {selectedFiles.length > 0 ? (
            <div className="space-y-4 animate-scaleIn">
              {multiple && selectedFiles.length > 1 && (
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedFiles.length} files selected
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAllFiles();
                    }}
                    className="text-sm text-danger-600 hover:text-danger-700 font-medium"
                  >
                    Remove all
                  </button>
                </div>
              )}
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative group bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-success-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-success-500 to-success-600 rounded-lg shadow">
                        <File className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-success-800 truncate">{file.name}</p>
                        <p className="text-xs text-success-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1.5 bg-danger-500 hover:bg-danger-600 text-white rounded-full shadow hover:shadow-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedFiles.length === 1 && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-success-300 rounded-full text-sm font-medium text-success-700 shadow-inner-lg">
                    {selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024 < 0.01 
                      ? `${(selectedFiles.reduce((total, file) => total + file.size, 0) / 1024).toFixed(2)} KB`
                      : `${(selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB`
                    } total
                  </span>
                </div>
              )}
              
              {multiple && selectedFiles.length > 1 && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-success-300 rounded-full text-sm font-medium text-success-700 shadow-inner-lg">
                    {(selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB total
                  </span>
                </div>
              )}
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
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {description}
                  {multiple && <span className="block mt-1 text-xs text-gray-500">You can select multiple files</span>}
                </p>
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