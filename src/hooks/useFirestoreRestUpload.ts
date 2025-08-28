import { useState, useCallback } from 'react';
import { UploadCredentials, UploadProgress, UploadLog, DocumentData } from '../types';

export const useFirestoreRestUpload = () => {
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
    setLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  // Create a signed JWT using Web Crypto API (browser compatible)
  const createSignedJWT = async (credentials: UploadCredentials): Promise<string> => {
    try {
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      };

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      };

      const encoder = new TextEncoder();
      const headerEncoded = btoa(JSON.stringify(header)).replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadEncoded = btoa(JSON.stringify(payload)).replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const data = encoder.encode(`${headerEncoded}.${payloadEncoded}`);
      
      // Import the private key - handle various formatting issues
      let privateKeyPem = credentials.private_key;
      
      // Handle escaped newlines
      if (privateKeyPem.includes('\\n')) {
        privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
      }
      
      // Ensure proper PEM formatting
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      
      // Extract just the base64 content between headers
      let pemContents = privateKeyPem;
      if (pemContents.includes(pemHeader)) {
        const startIndex = pemContents.indexOf(pemHeader) + pemHeader.length;
        const endIndex = pemContents.indexOf(pemFooter);
        if (endIndex === -1) {
          throw new Error('Invalid private key format: missing footer');
        }
        pemContents = pemContents.substring(startIndex, endIndex);
      }
      
      // Clean up the base64 content - remove whitespace and newlines
      pemContents = pemContents.replace(/[\s\n\r]/g, '');
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(pemContents)) {
        throw new Error('Invalid private key format: not valid base64');
      }
      
      let binaryDer;
      try {
        binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      } catch (error) {
        throw new Error(`Failed to decode private key: ${error}`);
      }

      const key = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
      const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
    } catch (error) {
      throw new Error(`Failed to create JWT: ${error}`);
    }
  };

  // Get OAuth access token using service account
  const getAccessToken = async (credentials: UploadCredentials): Promise<string> => {
    try {
      addLog('info', 'Creating JWT for service account authentication...');
      const jwt = await createSignedJWT(credentials);
      
      addLog('info', 'Requesting access token from Google OAuth...');
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      addLog('success', 'Access token obtained successfully');
      return data.access_token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', 'Failed to get access token', errorMessage);
      throw error;
    }
  };

  // Convert document data to Firestore format
  const convertToFirestoreFormat = (doc: DocumentData): any => {
    const convertValue = (value: any): any => {
      if (value === null) {
        return { nullValue: null };
      }
      if (typeof value === 'string') {
        if (value === 'Timestamp') {
          return { timestampValue: new Date().toISOString() };
        }
        // Handle GeoPoint format: "GeoPoint(lat, lng)"
        if (value.startsWith('GeoPoint(') && value.endsWith(')')) {
          const geoPointContent = value.slice(9, -1); // Remove "GeoPoint(" and ")"
          const coords = geoPointContent.split(',').map(coord => parseFloat(coord.trim()));
          
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            return {
              geoPointValue: {
                latitude: coords[0],
                longitude: coords[1]
              }
            };
          } else {
            throw new Error(`Invalid GeoPoint format: ${value}. Expected: GeoPoint(latitude, longitude)`);
          }
        }
        return { stringValue: value };
      }
      if (typeof value === 'number') {
        return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
      }
      if (typeof value === 'boolean') {
        return { booleanValue: value };
      }
      if (Array.isArray(value)) {
        return {
          arrayValue: {
            values: value.map(convertValue)
          }
        };
      }
      if (typeof value === 'object') {
        const fields: any = {};
        for (const [key, val] of Object.entries(value)) {
          fields[key] = convertValue(val);
        }
        return {
          mapValue: { fields }
        };
      }
      return { stringValue: String(value) };
    };

    const fields: any = {};
    for (const [key, value] of Object.entries(doc)) {
      fields[key] = convertValue(value);
    }

    return { fields };
  };

  // Upload single document via REST API
  const uploadDocument = async (
    projectId: string,
    collectionName: string,
    doc: DocumentData,
    accessToken: string
  ): Promise<void> => {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;
    
    const firestoreDoc = convertToFirestoreFormat(doc);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
  };

  const uploadDocuments = useCallback(async (
    collectionName: string,
    documents: DocumentData[],
    credentials: UploadCredentials
  ) => {
    setIsUploading(true);
    setProgress({ total: documents.length, completed: 0, failed: 0, percentage: 0 });
    
    try {
      addLog('info', `Getting access token for project: ${credentials.project_id}`);
      const token = await getAccessToken(credentials);
      
      addLog('info', `Starting upload of ${documents.length} documents to collection: ${collectionName}`);
      
      let completed = 0;
      let failed = 0;
      
      // Process documents in batches
      const batchSize = 5;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const promises = batch.map(async (doc, index) => {
          try {
            await uploadDocument(credentials.project_id, collectionName, doc, token);
            completed++;
            addLog('success', `Document ${i + index + 1} uploaded successfully`);
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog('error', `Failed to upload document ${i + index + 1}`, errorMessage);
          }
          
          setProgress(prev => ({
            ...prev,
            completed,
            failed,
            percentage: Math.round(((completed + failed) / documents.length) * 100),
          }));
        });
        
        await Promise.all(promises);
        
        // Small delay between batches
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
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
  }, [addLog]);

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