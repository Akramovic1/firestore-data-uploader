import React, { useState, useEffect } from 'react';
import { Key, ChevronDown, ChevronRight, Trash2, CheckCircle } from 'lucide-react';
import { CredentialStorage } from '../utils/credentialStorage';

interface SavedCredentialsProps {
  onCredentialSelect: (credentials: any) => void;
  selectedCredentialId?: string;
}

interface StoredServiceAccount {
  id: string;
  name: string;
  projectId: string;
  clientEmail: string;
  credentials: any;
  createdAt: number;
}

export const SavedCredentials: React.FC<SavedCredentialsProps> = ({
  onCredentialSelect,
  selectedCredentialId
}) => {
  const [credentialStorage] = useState(() => CredentialStorage.getInstance());
  const [serviceAccounts, setServiceAccounts] = useState<StoredServiceAccount[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadServiceAccounts();
  }, [credentialStorage]);

  const loadServiceAccounts = () => {
    const accounts = credentialStorage.getServiceAccounts();
    setServiceAccounts(accounts);
    
    // Auto-expand if there are saved accounts and none selected
    if (accounts.length > 0 && !selectedCredentialId) {
      setIsExpanded(true);
    }
  };

  const handleSelectAccount = (account: StoredServiceAccount) => {
    // Create a file-like object from the stored credentials
    const credentialsJson = JSON.stringify(account.credentials, null, 2);
    const blob = new Blob([credentialsJson], { type: 'application/json' });
    const file = new File([blob], `${account.name}.json`, { type: 'application/json' });
    onCredentialSelect(file);
  };

  const handleDeleteAccount = (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved credential?')) {
      credentialStorage.deleteServiceAccount(accountId);
      loadServiceAccounts();
    }
  };

  if (serviceAccounts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Key className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">
            Saved Credentials ({serviceAccounts.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="max-h-48 overflow-y-auto">
            {serviceAccounts.map((account) => (
              <div
                key={account.id}
                className={`group relative p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer ${
                  selectedCredentialId === account.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => handleSelectAccount(account)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">{account.name}</h4>
                      {selectedCredentialId === account.id && (
                        <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Project:</span>
                        <span className="font-mono text-xs">{account.projectId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="font-mono text-xs truncate ml-2">
                          {credentialStorage.getMaskedEmail(account.clientEmail)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saved:</span>
                        <span className="text-xs">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteAccount(account.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete saved credential"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Click on a credential to use it, or upload a new one above
            </p>
          </div>
        </div>
      )}
    </div>
  );
};