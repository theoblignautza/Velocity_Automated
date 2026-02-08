
import React, { useEffect, useState } from 'react';
import type { BackupFile } from '../types';

const FileManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/list_archives');
      if (!response.ok) {
        throw new Error('Failed to load archives');
      }
      const data = await response.json();
      const mappedFiles = (data as Array<{ filename: string; size: string; created: string }>).map(file => ({
        id: file.filename,
        filename: file.filename,
        size: file.size,
        created: file.created,
        job: 'SFTP Pull',
      }));
      setFiles(mappedFiles);
      if (mappedFiles.length === 0) {
        setStatusMessage('No backup archives available yet.');
      } else {
        setStatusMessage('');
      }
    } catch (error) {
      console.error('Failed to fetch archives:', error);
      setStatusMessage('Unable to load archives. Check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const filteredFiles = files.filter(file => 
      file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.job.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (fileId: string) => {
    setStatusMessage(`Delete request queued for ${fileId}. Backend delete is not configured.`);
  };

  const handleDownload = (file: BackupFile) => {
    setStatusMessage(`Starting download for ${file.filename}...`);
    window.open(`/download_archive/${encodeURIComponent(file.filename)}`, '_blank', 'noopener,noreferrer');
  };

  const handleRestore = (file: BackupFile) => {
    setStatusMessage(`Restore requested for ${file.filename}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white font-orbitron">File Manager</h1>
        <div className="w-1/3">
            <input 
                type="text"
                placeholder="Search archives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-950/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2"
            />
        </div>
      </div>

      <div className="bg-gray-950/30 border border-green-500/20 p-3 text-xs text-green-300 flex items-center justify-between gap-4">
        <span>{statusMessage || 'Select a file action to see status updates here.'}</span>
        <button
          onClick={loadFiles}
          className="text-xs text-green-300 border border-green-500 px-3 py-1 hover:bg-green-700/40"
        >
          Refresh
        </button>
      </div>

      <div className="bg-gray-950/30 border border-green-500/20">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Filename</th>
                        <th scope="col" className="px-6 py-3">Size</th>
                        <th scope="col" className="px-6 py-3">Created Date</th>
                        <th scope="col" className="px-6 py-3">Source Job</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredFiles.map(file => (
                        <tr key={file.id} className="border-b border-green-500/10 hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-medium text-white">{file.filename}</td>
                            <td className="px-6 py-4">{file.size}</td>
                            <td className="px-6 py-4">{file.created}</td>
                            <td className="px-6 py-4">{file.job}</td>
                            <td className="px-6 py-4 text-right space-x-4">
                                <button
                                  onClick={() => handleDownload(file)}
                                  className="font-medium text-green-400 hover:underline"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => handleRestore(file)}
                                  className="font-medium text-blue-400 hover:underline"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => handleDelete(file.id)}
                                  className="font-medium text-red-400 hover:underline"
                                >
                                  Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                     {!isLoading && filteredFiles.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8">No files found matching your search.</td>
                        </tr>
                    )}
                    {isLoading && (
                        <tr>
                            <td colSpan={5} className="text-center py-8">Loading archives...</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default FileManager;
