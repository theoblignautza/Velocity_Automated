
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BackupJobs from './components/BackupJobs';
import FileManager from './components/FileManager';
import Scheduler from './components/Scheduler';
import Settings from './components/Settings';
import type { ViewType, CpuData, DownloadMethod, DownloadMethodId } from './types';
import GlobalBackupNotification from './components/GlobalBackupNotification';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [cpuData, setCpuData] = useState<CpuData[]>([]);

  // Lifted state for global access
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Initializing Sentinel Core...']);

  const [downloadMethods, setDownloadMethods] = useState<DownloadMethod[]>([
    {
      id: 'sftp',
      label: 'SFTP Pull',
      description: 'Securely download archives from SFTP endpoints.',
      isRunning: false,
      progress: 0,
      lastResult: 'Idle',
    },
    {
      id: 'ssh',
      label: 'SSH Sync',
      description: 'Pull backups via SSH with verification checksums.',
      isRunning: false,
      progress: 0,
      lastResult: 'Idle',
    },
    {
      id: 'cpanel',
      label: 'cPanel API',
      description: 'Request and download cPanel-generated archives.',
      isRunning: false,
      progress: 0,
      lastResult: 'Idle',
    },
  ]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]);
  }, []);

  const handleStartDownload = useCallback(async (methodId: DownloadMethodId) => {
    if (methodId !== 'sftp') {
      addLog(`[${methodId.toUpperCase()}] Download method not configured in backend.`);
      return;
    }
    try {
      await fetch('/api/run', { method: 'POST' });
    } catch (error) {
      console.error('Failed to start SFTP download:', error);
      addLog('[SFTP] Failed to start download. Check backend connectivity.');
    }
  }, [addLog]);

  const handleStopDownload = useCallback(async (methodId: DownloadMethodId) => {
    if (methodId !== 'sftp') {
      addLog(`[${methodId.toUpperCase()}] Stop action not supported.`);
      return;
    }
    try {
      await fetch('/api/stop', { method: 'POST' });
    } catch (error) {
      console.error('Failed to stop SFTP download:', error);
      addLog('[SFTP] Failed to stop download. Check backend connectivity.');
    }
  }, [addLog]);

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    const storedLogo = localStorage.getItem('appLogo');
    if (storedLogo) {
      setLogoSrc(storedLogo);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) return;
        const data = await response.json();
        if (!isMounted) return;
        if (Array.isArray(data.logs)) {
          setLogs(data.logs.length > 0 ? data.logs : ['[SYSTEM] Awaiting backup activity...']);
        }
        if (typeof data.running === 'boolean') {
          setIsBackupRunning(data.running);
          setDownloadMethods(prev =>
            prev.map(method =>
              method.id === 'sftp'
                ? {
                    ...method,
                    isRunning: data.running,
                    progress: data.running ? 50 : 0,
                    lastResult: data.running ? 'Downloading...' : 'Idle',
                  }
                : method
            )
          );
        }
        if (Array.isArray(data.cpu_history)) {
          setCpuData(
            data.cpu_history.map((point: { time: string; value: number }) => ({
              time: point.time,
              usage: point.value,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleRunBackup = () => {
    if (isBackupRunning) return;
    handleStartDownload('sftp');
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setCpuData([]); // Clear CPU data on logout
    setLogs(['[SYSTEM] Initializing Sentinel Core...']);
    setDownloadMethods(prev =>
      prev.map(method => ({ ...method, isRunning: false, progress: 0, lastResult: 'Idle' }))
    );
  };

  const handleLogoChange = (newLogo: string) => {
    localStorage.setItem('appLogo', newLogo);
    setLogoSrc(newLogo);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
                  cpuData={cpuData} 
                  isBackupRunning={isBackupRunning}
                  logs={logs}
                  handleRunBackup={handleRunBackup}
                  downloadMethods={downloadMethods}
                  onStartDownload={handleStartDownload}
                  onStopDownload={handleStopDownload}
                />;
      case 'jobs':
        return <BackupJobs />;
      case 'files':
        return <FileManager />;
      case 'scheduler':
        return <Scheduler />;
      case 'settings':
        return <Settings onLogoChange={handleLogoChange} />;
      default:
        return <Dashboard 
                  cpuData={cpuData} 
                  isBackupRunning={isBackupRunning}
                  logs={logs}
                  handleRunBackup={handleRunBackup}
                  downloadMethods={downloadMethods}
                  onStartDownload={handleStartDownload}
                  onStopDownload={handleStopDownload}
                />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} logoSrc={logoSrc} />;
  }

  return (
    <div className="bg-gray-900 text-green-400 min-h-screen flex selection:bg-green-900 selection:text-green-300">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} logoSrc={logoSrc} />
      <div className="flex-1 flex flex-col">
        <Header username="admin" onLogout={handleLogout} />
        <GlobalBackupNotification isBackupRunning={isBackupRunning} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
