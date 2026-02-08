
import React, { useState } from 'react';
import LogViewer from './LogViewer';
import CpuChart from './CpuChart';
import { getGeminiLogSummary } from '../services/geminiService';
import type { CpuData, DownloadMethod, DownloadMethodId } from '../types';

const StatusCard: React.FC<{ title: string; value: string; statusColor?: string }> = ({ title, value, statusColor = 'text-green-400' }) => (
  <div className="bg-gray-950/30 p-4 border border-green-500/20 backdrop-blur-sm">
    <h3 className="text-sm text-gray-400 uppercase tracking-wider">{title}</h3>
    <p className={`text-2xl font-bold ${statusColor}`}>{value}</p>
  </div>
);

interface DashboardProps {
  cpuData: CpuData[];
  isBackupRunning: boolean;
  logs: string[];
  handleRunBackup: () => void;
  downloadMethods: DownloadMethod[];
  onStartDownload: (methodId: DownloadMethodId) => void;
  onStopDownload: (methodId: DownloadMethodId) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  cpuData,
  isBackupRunning,
  logs,
  handleRunBackup,
  downloadMethods,
  onStartDownload,
  onStopDownload,
}) => {
  const [summary, setSummary] = useState('Awaiting log data...');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const handleAnalyzeLogs = async () => {
    setIsSummaryLoading(true);
    setSummary('Analyzing with Gemini...');
    try {
      const logText = logs.join('\n');
      const result = await getGeminiLogSummary(logText);
      setSummary(result);
    } catch (error) {
      console.error("Gemini API error:", error);
      setSummary("Error analyzing logs. Check console for details.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard title="System Status" value="Operational" />
        <StatusCard title="Active Jobs" value={isBackupRunning ? '1' : '0'} statusColor={isBackupRunning ? 'text-yellow-400' : 'text-green-400'}/>
        <StatusCard title="Last Backup" value="2h ago" />
        <StatusCard title="Disk Space" value="75% Free" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white font-orbitron">Live Terminal</h2>
                  <div>
                    <button
                        onClick={handleRunBackup}
                        disabled={isBackupRunning}
                        className="bg-green-900/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white disabled:bg-gray-700/50 disabled:text-gray-400 disabled:border-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isBackupRunning ? 'Backup in Progress...' : 'Run Backup Now'}
                    </button>
                  </div>
                </div>
                <LogViewer logs={logs} />
            </div>
            <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white font-orbitron">Download Control Center</h2>
                    <span className="text-xs text-gray-400">Start/stop and verify all download methods.</span>
                </div>
                <div className="space-y-4">
                    {downloadMethods.map(method => (
                      <div key={method.id} className="border border-green-500/20 rounded-lg p-4 bg-gray-900/40">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{method.label}</p>
                            <p className="text-xs text-gray-400">{method.description}</p>
                            <p className="text-xs text-green-300 mt-1">{method.lastResult}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onStartDownload(method.id)}
                              disabled={method.isRunning}
                              className="px-3 py-1 text-xs border border-green-500 text-green-300 hover:bg-green-700/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => onStopDownload(method.id)}
                              disabled={!method.isRunning}
                              className="px-3 py-1 text-xs border border-red-500 text-red-300 hover:bg-red-700/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Stop
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${method.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="space-y-6">
           <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white font-orbitron">CPU Load</h2>
                </div>
                <div className="h-48">
                    <CpuChart data={cpuData} />
                </div>
            </div>
            <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white font-orbitron">Gemini Log Analysis</h2>
                     <button
                        onClick={handleAnalyzeLogs}
                        disabled={isSummaryLoading}
                        className="bg-purple-900/50 text-purple-300 border border-purple-500 px-3 py-1 text-xs hover:bg-purple-700/50 hover:text-white disabled:bg-gray-700/50 disabled:text-gray-400 disabled:border-gray-600 transition-all duration-300"
                    >
                        {isSummaryLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </div>
                <p className="text-sm text-gray-300 h-24 overflow-y-auto">{summary}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
