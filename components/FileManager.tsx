
import React, { useState } from 'react';
import type { BackupFile } from '../types';

const initialFiles: BackupFile[] = [
  { id: 'f1', filename: 'backup_cpanel_20240726_1400.tar.gz', size: '1.2 GB', created: '2024-07-26 14:05', job: 'cPanel - Main Web' },
  { id: 'f2', filename: 'backup_cisco_20240725_2200.cfg', size: '12 KB', created: '2024-07-25 22:01', job: 'Office Cisco Router' },
  { id: 'f3', filename: 'backup_unifi_20240726_0100.unf', size: '250 MB', created: '2024-07-26 01:03', job: 'UniFi Controller' },
  { id: 'f4', filename: 'backup_sftp_20240723_1830.tar.gz', size: '450 MB', created: '2024-07-23 18:35', job: 'Dev Server SFTP' },
  { id: 'f5', filename: 'backup_cpanel_20240725_1400.tar.gz', size: '1.1 GB', created: '2024-07-25 14:05', job: 'cPanel - Main Web' },
];

const FileManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<BackupFile[]>(initialFiles);
  const [statusMessage, setStatusMessage] = useState('');

  const filteredFiles = files.filter(file => 
      file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.job.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    setStatusMessage('File entry removed.');
  };

  const handleDownload = (file: BackupFile) => {
    setStatusMessage(`Preparing download for ${file.filename}...`);
    try {
      const contents = `Backup file: ${file.filename}\nSource: ${file.job}\nCreated: ${file.created}\n`;
      const blob = new Blob([contents], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename.replace('.tar.gz', '.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(`Download started for ${file.filename}.`);
    } catch (error) {
      console.error('Download failed:', error);
      setStatusMessage('Download failed. Check console for details.');
    }
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

      <div className="bg-gray-950/30 border border-green-500/20 p-3 text-xs text-green-300">
        {statusMessage || 'Select a file action to see status updates here.'}
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
                     {filteredFiles.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8">No files found matching your search.</td>
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
