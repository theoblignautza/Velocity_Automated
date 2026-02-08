
import React, { useState } from 'react';
import { JobType } from '../types';
import type { BackupJob } from '../types';

const initialJobs: BackupJob[] = [
  { id: 'job1', name: 'cPanel - Main Web', type: JobType.CPANEL, host: 'cp71.domains.co.za', port: 22000, lastBackup: '2024-07-26 14:00', status: 'Success' },
  { id: 'job2', name: 'Office Cisco Router', type: JobType.CISCO, host: '192.168.1.1', port: 22, lastBackup: '2024-07-25 22:00', status: 'Success' },
  { id: 'job3', name: 'UniFi Controller', type: JobType.UBIQUITI, host: '10.0.0.5', port: 22, lastBackup: '2024-07-26 01:00', status: 'Success' },
  { id: 'job4', name: 'Dev Server SFTP', type: JobType.SFTP, host: 'dev.labverse.net', port: 22, lastBackup: '2024-07-24 18:30', status: 'Failed' },
];

const StatusBadge: React.FC<{ status: 'Success' | 'Failed' | 'Pending' }> = ({ status }) => {
  const baseClasses = "px-2 py-1 text-xs font-bold rounded-full";
  const statusClasses = {
    Success: "bg-green-900/50 text-green-300",
    Failed: "bg-red-900/50 text-red-300",
    Pending: "bg-yellow-900/50 text-yellow-300",
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const BackupJobs: React.FC = () => {
  const [jobs, setJobs] = useState<BackupJob[]>(initialJobs);
  const [showModal, setShowModal] = useState(false);

  const handleAddJob = () => {
    // In a real app, this would handle form data
    setShowModal(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white font-orbitron">Backup Job Configurations</h1>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-green-900/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300">
            + Add New Job
        </button>
      </div>

      <div className="bg-gray-950/30 border border-green-500/20">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Job Name</th>
                        <th scope="col" className="px-6 py-3">Type</th>
                        <th scope="col" className="px-6 py-3">Host</th>
                        <th scope="col" className="px-6 py-3">Last Backup</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => (
                        <tr key={job.id} className="border-b border-green-500/10 hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-medium text-white">{job.name}</td>
                            <td className="px-6 py-4">{job.type}</td>
                            <td className="px-6 py-4 font-mono">{job.host}:{job.port}</td>
                            <td className="px-6 py-4">{job.lastBackup}</td>
                            <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                            <td className="px-6 py-4 text-right">
                                <button className="font-medium text-blue-400 hover:underline mr-4">Edit</button>
                                <button className="font-medium text-red-400 hover:underline">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-green-500/30 p-8 rounded-lg w-full max-w-lg">
                <h2 className="text-xl font-bold text-white mb-4 font-orbitron">Add New Backup Job</h2>
                {/* Form would go here */}
                <p className="text-gray-400">Job configuration form fields for type, name, host, port, credentials, etc. would be implemented here.</p>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600/50">Cancel</button>
                    <button onClick={handleAddJob} className="px-4 py-2 text-white bg-green-800/50 hover:bg-green-700/50">Save Job</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BackupJobs;
