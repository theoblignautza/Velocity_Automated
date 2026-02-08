
import React, { useState, FormEvent, useEffect } from 'react';
import { velocityLogo } from './assets/velocityLogo';

interface LoginProps {
  onLoginSuccess: () => void;
  logoSrc: string | null;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, logoSrc }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // A little effect to make the background lines move
    const canvas = document.getElementById('matrix-bg') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let ypos: number[] = Array(300).fill(0);

    const matrix = () => {
      ctx.fillStyle = 'rgba(0,0,0,.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0f0';
      ctx.font = '15pt monospace';
      ypos.forEach((y, ind) => {
        const text = String.fromCharCode(Math.random() * 128);
        const x = ind * 20;
        ctx.fillText(text, x, y);
        if (y > 100 + Math.random() * 10000) {
          ypos[ind] = 0;
        } else {
          ypos[ind] = y + 20;
        }
      });
    };

    const interval = setInterval(matrix, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (username === 'admin' && password === 'password') {
        onLoginSuccess();
      } else {
        setError('Access Denied: Invalid Credentials');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center font-mono">
      <canvas id="matrix-bg" className="absolute top-0 left-0 w-full h-full z-0"></canvas>
      <div className="relative z-10 w-full max-w-md mx-auto p-8 bg-gray-900/50 border border-green-500/50 backdrop-blur-sm shadow-2xl shadow-green-500/10">
        <div className="flex justify-center mb-6">
          {logoSrc ? (
            <img src={logoSrc} alt="Custom Logo" className="max-h-20" />
          ) : (
             <img src={velocityLogo} alt="Velocity Technology Group Logo" className="w-64" />
          )}
        </div>
        <h2 className="text-2xl text-center text-green-400 mb-2 font-orbitron">Backup Sentinel</h2>
        <p className="text-center text-green-500 mb-6">[System Authentication]</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-green-400 text-sm mb-2" htmlFor="username">
              &gt; USERNAME
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2"
              autoComplete="username"
            />
          </div>
          <div className="mb-6">
            <label className="block text-green-400 text-sm mb-2" htmlFor="password">
              &gt; PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-500 text-center text-xs mb-4 animate-pulse">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-900/50 text-green-300 border border-green-500 p-2 hover:bg-green-700/50 hover:text-white disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? 'Authenticating...' : 'Engage'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
