
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const downloadTimers = useRef<Record<DownloadMethodId, ReturnType<typeof setInterval> | null>>({
    sftp: null,
    ssh: null,
    cpanel: null,
  });

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

  const triggerDownload = useCallback((methodId: DownloadMethodId) => {
    if (typeof document === 'undefined') return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${methodId}-backup-${timestamp}.txt`;
    const contents = `Backup Method: ${methodId.toUpperCase()}\nTimestamp: ${new Date().toLocaleString()}\nStatus: Complete\n`;
    try {
      const blob = new Blob([contents], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download trigger failed:', error);
    }
  }, []);

  const clearDownloadTimer = useCallback((methodId: DownloadMethodId) => {
    const timer = downloadTimers.current[methodId];
    if (timer) {
      clearInterval(timer);
      downloadTimers.current[methodId] = null;
    }
  }, []);

  const handleStartDownload = useCallback((methodId: DownloadMethodId) => {
    setDownloadMethods(prev =>
      prev.map(method =>
        method.id === methodId
          ? { ...method, isRunning: true, progress: 0, lastResult: 'Initializing transfer...' }
          : method
      )
    );

    addLog(`[${methodId.toUpperCase()}] Starting download sequence.`);

    let progress = 0;
    clearDownloadTimer(methodId);

    const timer = setInterval(() => {
      progress = Math.min(100, progress + 10);
      setDownloadMethods(prev =>
        prev.map(method =>
          method.id === methodId
            ? { ...method, progress, lastResult: `Downloading... ${progress}%` }
            : method
        )
      );
      addLog(`[${methodId.toUpperCase()}] Downloading... ${progress}%`);

      if (progress >= 100) {
        clearDownloadTimer(methodId);
        setDownloadMethods(prev =>
          prev.map(method =>
            method.id === methodId
              ? { ...method, isRunning: false, progress: 100, lastResult: 'Download complete.' }
              : method
          )
        );
        addLog(`[${methodId.toUpperCase()}] Download complete.`);
        triggerDownload(methodId);
      }
    }, 600);

    downloadTimers.current[methodId] = timer;
  }, [addLog, clearDownloadTimer, triggerDownload]);

  const handleStopDownload = useCallback((methodId: DownloadMethodId) => {
    clearDownloadTimer(methodId);
    setDownloadMethods(prev =>
      prev.map(method =>
        method.id === methodId
          ? { ...method, isRunning: false, progress: 0, lastResult: 'Stopped by user.' }
          : method
      )
    );
    addLog(`[${methodId.toUpperCase()}] Download stopped by user.`);
  }, [addLog, clearDownloadTimer]);

  const stopAllDownloads = useCallback(() => {
    (Object.keys(downloadTimers.current) as DownloadMethodId[]).forEach(methodId => {
      clearDownloadTimer(methodId);
    });
    setDownloadMethods(prev =>
      prev.map(method => ({ ...method, isRunning: false, progress: 0, lastResult: 'Idle' }))
    );
  }, [clearDownloadTimer]);

  // Initialize logs on authentication
  useEffect(() => {
    if (isAuthenticated && logs.length < 2) {
      addLog('[SYSTEM] Connection established.');
      addLog('[INFO] Monitoring for scheduled jobs.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);


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

  // Effect to continuously update CPU data in the background after login
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setCpuData(prevData => {
        const lastUsage = prevData.length > 0 ? prevData[prevData.length - 1].usage : 50;
        const change = (Math.random() - 0.5) * 15; // More gradual change
        let newUsage = lastUsage + change;
        newUsage = Math.max(5, Math.min(95, newUsage)); // Keep it within a realistic bound
        // Occasional random spike
        if (Math.random() > 0.95) {
            newUsage = Math.random() * 50 + 50;
        }

        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          usage: Math.round(newUsage),
        };
        const newData = [...prevData, newPoint];
        // Keep a history of the last 100 data points
        return newData.length > 100 ? newData.slice(newData.length - 100) : newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleRunBackup = () => {
    if (isBackupRunning) return;
    setIsBackupRunning(true);
    addLog('[ACTION] Manual backup process initiated by user.');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      addLog(`[SFTP_JOB_1] Downloading files... ${progress}%`);
      if (progress >= 100) {
        clearInterval(interval);
        addLog('[SFTP_JOB_1] Download complete.');
        addLog('[ARCHIVER] Compressing backup file: backup_20240726_1400.tar.gz');
        setTimeout(() => {
            addLog('[SUCCESS] Backup completed successfully.');
            setIsBackupRunning(false);
        }, 1000);
      }
    }, 500);
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
    stopAllDownloads();
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
