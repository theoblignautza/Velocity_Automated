
import React, { useRef, useEffect } from 'react';

interface LogViewerProps {
  logs: string[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={logContainerRef}
      className="h-80 bg-black/50 p-4 font-mono text-sm overflow-y-auto border border-green-900"
    >
      {logs.map((log, index) => {
        let colorClass = 'text-green-400';
        if (log.includes('[ERROR]') || log.includes('[FAILURE]')) colorClass = 'text-red-500';
        if (log.includes('[WARNING]')) colorClass = 'text-yellow-400';
        if (log.includes('[SUCCESS]')) colorClass = 'text-cyan-400';
        
        return <p key={index} className={colorClass}>
          <span className="text-gray-500 mr-2 select-none">&gt;</span>{log}
        </p>
      })}
      <div className="animate-pulse">_</div>
    </div>
  );
};

export default LogViewer;
