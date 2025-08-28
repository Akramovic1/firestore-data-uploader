import { useState, useCallback } from 'react';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { UploadCredentials, UploadProgress, UploadLog, DocumentData } from '../types';

export const useFirebaseAdminUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0,
  });
  const [logs, setLogs] = useState<UploadLog[]>([]);

  const addLog = useCallback((type: 'success' | 'error' | 'info', message: string, details?: string) => {
    const log: UploadLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      details,
    };
    setLogs(prev => [log, ...prev].slice(0, 100)); // Keep only last 100 logs
  }, []);

  const initializeFirebaseAdmin = useCallback((credentials: UploadCredentials) => {
    try {
      // Check if an app with the same project ID already exists
      const existingApp = getApps().find(app => app?.options?.projectId === credentials.project_id);
      if (existingApp) {
        const db = getFirestore(existingApp);
        addLog('info', 'Using existing Firebase Admin app');
        return { app: existingApp, db };
      }

      // Initialize new Firebase Admin app
      const serviceAccount = {
        type: credentials.type,
        project_id: credentials.project_id,
        private_key_id: credentials.private_key_id,
        private_key: credentials.private_key.replace(/\\n/g, '\n'), // Handle escaped newlines
        client_email: credentials.client_email,
        client_id: credentials.client_id,
        auth_uri: credentials.auth_uri,
        token_uri: credentials.token_uri,
        auth_provider_x509_cert_url: credentials.auth_provider_x509_cert_url,
        client_x509_cert_url: credentials.client_x509_cert_url,
      };

      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: credentials.project_id,
      }, `admin-app-${credentials.project_id}-${Date.now()}`);

      const db = getFirestore(app);
      
      addLog('success', 'Firebase Admin initialized successfully');
      
      return { app, db };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', 'Failed to initialize Firebase Admin', errorMessage);
      throw error;
    }
  }, [addLog]);

  // Helper function to process document data and handle Firestore-specific types
  const processDocumentData = (doc: DocumentData): DocumentData => {
    const processValue = (value: any): any => {
      if (value === "Timestamp") {
        // Use Firestore server timestamp
        return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
      }
      if (Array.isArray(value)) {
        return value.map(processValue);
      }
      if (value && typeof value === 'object') {
        const processed: any = {};
        for (const [key, val] of Object.entries(value)) {
          processed[key] = processValue(val);
        }
        return processed;
      }
      return value;
    };

    const processed: DocumentData = {};
    for (const [key, value] of Object.entries(doc)) {
      processed[key] = processValue(value);
    }
    return processed;
  };

  const uploadDocuments = useCallback(async (
    collectionName: string,
    documents: DocumentData[],
    credentials: UploadCredentials
  ) => {
    setIsUploading(true);
    setProgress({ total: documents.length, completed: 0, failed: 0, percentage: 0 });
    
    try {
      const { db } = initializeFirebaseAdmin(credentials);
      const collectionRef = db.collection(collectionName);
      
      addLog('info', `Starting upload of ${documents.length} documents to collection: ${collectionName}`);
      
      let completed = 0;
      let failed = 0;
      
      // Process documents in batches to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const promises = batch.map(async (doc, index) => {
          try {
            const processedDoc = processDocumentData(doc);
            await collectionRef.add(processedDoc);
            completed++;
            addLog('success', `Document ${i + index + 1} uploaded successfully`);
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog('error', `Failed to upload document ${i + index + 1}`, errorMessage);
          }
          
          const currentCompleted = completed;
          const currentFailed = failed;
          setProgress(prev => ({
            ...prev,
            completed: currentCompleted,
            failed: currentFailed,
            percentage: Math.round(((currentCompleted + currentFailed) / documents.length) * 100),
          }));
        });
        
        await Promise.all(promises);
        
        // Small delay between batches to prevent rate limiting
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      addLog('success', `Upload completed: ${completed} successful, ${failed} failed`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', 'Upload failed', errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [initializeFirebaseAdmin, addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ total: 0, completed: 0, failed: 0, percentage: 0 });
  }, []);

  return {
    isUploading,
    progress,
    logs,
    uploadDocuments,
    clearLogs,
    resetProgress,
  };
};