
import React, { useState } from 'react';

interface HeaderProps {
  username: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ username, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-20 bg-gray-900/50 border-b border-green-500/20 flex items-center justify-between px-8">
      <div>
        <h1 className="text-xl font-bold text-white font-orbitron">SYSTEM DASHBOARD</h1>
        <p className="text-xs text-green-400">Real-time Backup Monitoring</p>
      </div>
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-3"
        >
          <span className="text-white">Welcome, {username}</span>
          <div className="w-10 h-10 rounded-full bg-green-900 border-2 border-green-500 flex items-center justify-center">
            <span className="text-lg font-bold text-green-300">A</span>
          </div>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-green-500/30 rounded-md shadow-lg py-1 z-20">
            <button
              onClick={onLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-green-900/50 hover:text-white"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
