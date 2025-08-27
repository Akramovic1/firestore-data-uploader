import { useState, useCallback } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Firestore } from 'firebase/firestore';
import { UploadCredentials, UploadProgress, UploadLog, DocumentData } from '../types';

export const useFirebaseUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0,
  });
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);

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

  const initializeFirebase = useCallback((credentials: UploadCredentials) => {
    try {
      const firebaseConfig = {
        apiKey: credentials.private_key_id,
        authDomain: `${credentials.project_id}.firebaseapp.com`,
        projectId: credentials.project_id,
        storageBucket: `${credentials.project_id}.appspot.com`,
        messagingSenderId: credentials.client_id,
        appId: `1:${credentials.client_id}:web:${credentials.private_key_id}`,
      };

      const app = initializeApp(firebaseConfig, `upload-app-${Date.now()}`);
      const db = getFirestore(app);
      
      setFirebaseApp(app);
      setFirestore(db);
      addLog('success', 'Firebase initialized successfully');
      
      return { app, db };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', 'Failed to initialize Firebase', errorMessage);
      throw error;
    }
  }, [addLog]);

  const uploadDocuments = useCallback(async (
    collectionName: string,
    documents: DocumentData[],
    credentials: UploadCredentials
  ) => {
    setIsUploading(true);
    setProgress({ total: documents.length, completed: 0, failed: 0, percentage: 0 });
    
    try {
      const { db } = initializeFirebase(credentials);
      const collectionRef = collection(db, collectionName);
      
      addLog('info', `Starting upload of ${documents.length} documents to collection: ${collectionName}`);
      
      let completed = 0;
      let failed = 0;
      
      // Process documents in batches to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const promises = batch.map(async (doc, index) => {
          try {
            await addDoc(collectionRef, doc);
            completed++;
            addLog('success', `Document ${i + index + 1} uploaded successfully`);
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog('error', `Failed to upload document ${i + index + 1}`, errorMessage);
          }
          
          setProgress(prev => ({
            ...prev,
            completed: completed,
            failed: failed,
            percentage: Math.round(((completed + failed) / documents.length) * 100),
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
  }, [initializeFirebase, addLog]);

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
    firebaseApp,
    firestore,
    uploadDocuments,
    clearLogs,
    resetProgress,
  };
};