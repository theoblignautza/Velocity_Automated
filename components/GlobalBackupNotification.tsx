
import React from 'react';

interface GlobalBackupNotificationProps {
    isBackupRunning: boolean;
}

const GlobalBackupNotification: React.FC<GlobalBackupNotificationProps> = ({ isBackupRunning }) => {
    if (!isBackupRunning) {
        return null;
    }

    return (
        <div 
            className="bg-yellow-900/50 border-b border-t border-yellow-500/50 text-yellow-300 px-4 py-2 flex items-center justify-center text-sm animate-pulse"
            role="alert"
            aria-live="assertive"
        >
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Backup in progress... System performance may be affected.</span>
        </div>
    );
};

export default GlobalBackupNotification;
