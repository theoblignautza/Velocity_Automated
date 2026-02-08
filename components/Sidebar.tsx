
import React from 'react';
import type { ViewType } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import FilesIcon from './icons/FilesIcon';
import SchedulerIcon from './icons/SchedulerIcon';
import SettingsIcon from './icons/SettingsIcon';
import { velocityLogo } from './assets/velocityLogo';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  logoSrc: string | null;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-left transition-all duration-200 ease-in-out font-medium
        ${isActive
          ? 'bg-green-900/50 text-white shadow-[inset_0_0_10px_rgba(52,211,153,0.3),0_0_5px_rgba(52,211,153,0.3)] border-r-4 border-green-400'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-green-300'
        }`}
    >
      {icon}
      <span className="ml-4">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, logoSrc }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
    { id: 'files', label: 'File Manager', icon: <FilesIcon className="w-5 h-5" /> },
    { id: 'scheduler', label: 'Scheduler', icon: <SchedulerIcon className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-gray-950/50 border-r border-green-500/20 flex flex-col">
      <div className="h-20 flex items-center justify-center p-4 border-b border-green-500/20">
         {logoSrc ? (
            <img src={logoSrc} alt="Custom Logo" className="max-h-16" />
          ) : (
            <img src={velocityLogo} alt="Velocity Technology Group Logo" className="w-48" />
          )}
      </div>
      <nav className="flex-1 mt-4">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={currentView === item.id}
            onClick={() => setCurrentView(item.id as ViewType)}
          />
        ))}
      </nav>
      <div className="p-4 border-t border-green-500/20 text-center text-xs text-gray-500">
        <p>Velocity Technologies</p>
        <p>&copy; {new Date().getFullYear()} Theo Blignaut</p>
      </div>
    </aside>
  );
};

export default Sidebar;
