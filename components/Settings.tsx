import React, { useEffect, useRef, useState, ChangeEvent, ReactNode } from 'react';

interface SettingsProps {
  onLogoChange: (newLogo: string) => void;
  username: string;
}

const DisplayField: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-400">{label}</label>
    <p className="text-white font-mono bg-black/30 p-2 h-9 flex items-center">{value || <span className="text-gray-500">none</span>}</p>
  </div>
);

interface SettingsSectionProps {
  title: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, isEditing, onEdit, onSave, children, actions }) => {
  return (
    <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          {onEdit && onSave ? (
            isEditing ? (
              <button onClick={onSave} className="bg-green-900/50 text-green-300 border border-green-500 px-6 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300">
                Save
              </button>
            ) : (
              <button onClick={onEdit} className="bg-blue-900/50 text-blue-300 border border-blue-500 px-6 py-2 text-sm hover:bg-blue-700/50 hover:text-white transition-all duration-300">
                Edit
              </button>
            )
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ onLogoChange, username }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingSftp, setIsEditingSftp] = useState(false);
  const [isEditingSmtp, setIsEditingSmtp] = useState(false);
  const [isEditingSsh, setIsEditingSsh] = useState(false);
  const [isEditingCpanel, setIsEditingCpanel] = useState(false);

  const [sftpSettings, setSftpSettings] = useState({ host: '', port: 22, user: '', password: '', remote_path: '.' });
  const [smtpSettings, setSmtpSettings] = useState({ host: '', port: 587, user: '', pass: '', from: '', to: '' });
  const [sshSettings, setSshSettings] = useState({ host: '', port: 22, user: '', password: '', key: '', remote_path: '.' });
  const [cpanelSettings, setCpanelSettings] = useState({ host: '', port: 2083, user: '', token: '', password: '' });

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadSettings = async () => {
    try {
      const [sftpRes, smtpRes, sshRes, cpanelRes] = await Promise.all([
        fetch('/api/config/sftp'),
        fetch('/api/smtp'),
        fetch('/api/config/ssh'),
        fetch('/api/config/cpanel'),
      ]);
      if (sftpRes.ok) {
        const data = await sftpRes.json();
        setSftpSettings({
          host: data.host || '',
          port: data.port || 22,
          user: data.user || '',
          password: data.password || '',
          remote_path: data.remote_path || '.',
        });
      }
      if (smtpRes.ok) {
        const data = await smtpRes.json();
        setSmtpSettings({
          host: data.host || '',
          port: data.port || 587,
          user: data.user || '',
          pass: data.password || '',
          from: data.from_addr || '',
          to: data.to_addr || '',
        });
      }
      if (sshRes.ok) {
        const data = await sshRes.json();
        setSshSettings({
          host: data.host || '',
          port: data.port || 22,
          user: data.user || '',
          password: data.password || '',
          key: data.key || '',
          remote_path: data.remote_path || '.',
        });
      }
      if (cpanelRes.ok) {
        const data = await cpanelRes.json();
        setCpanelSettings({
          host: data.host || '',
          port: data.port || 2083,
          user: data.user || '',
          token: data.token || '',
          password: data.password || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('Unable to load settings. Check backend connectivity.');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSftp = async () => {
    setIsEditingSftp(false);
    try {
      const response = await fetch('/api/config/sftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sftpSettings),
      });
      if (!response.ok) {
        throw new Error('Failed');
      }
      showMessage('SFTP settings saved!');
    } catch (error) {
      console.error('Failed to save SFTP settings:', error);
      showMessage('Failed to save SFTP settings.');
    }
  };

  const handleSaveSmtp = async () => {
    setIsEditingSmtp(false);
    try {
      const response = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpSettings.host,
          port: smtpSettings.port,
          user: smtpSettings.user,
          password: smtpSettings.pass,
          from_addr: smtpSettings.from,
          to_addr: smtpSettings.to,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed');
      }
      showMessage('SMTP settings saved!');
    } catch (error) {
      console.error('Failed to save SMTP settings:', error);
      showMessage('Failed to save SMTP settings.');
    }
  };

  const handleSaveSsh = async () => {
    setIsEditingSsh(false);
    try {
      const response = await fetch('/api/config/ssh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sshSettings),
      });
      if (!response.ok) {
        throw new Error('Failed');
      }
      showMessage('SSH settings saved!');
    } catch (error) {
      console.error('Failed to save SSH settings:', error);
      showMessage('Failed to save SSH settings.');
    }
  };

  const handleSaveCpanel = async () => {
    setIsEditingCpanel(false);
    try {
      const response = await fetch('/api/config/cpanel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpanelSettings),
      });
      if (!response.ok) {
        throw new Error('Failed');
      }
      showMessage('cPanel settings saved!');
    } catch (error) {
      console.error('Failed to save cPanel settings:', error);
      showMessage('Failed to save cPanel settings.');
    }
  };

  const testConnection = async (endpoint: string, payload: Record<string, unknown>) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Connection failed');
      }
      showMessage('Connection test succeeded.');
    } catch (error) {
      console.error('Connection test failed:', error);
      showMessage(`Connection test failed: ${String(error)}`);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next) {
      showMessage('Please fill in all password fields.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      showMessage('New password and confirmation do not match.');
      return;
    }
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
        }),
      });
      if (!response.ok) {
        throw new Error('Password change failed');
      }
      setPasswordForm({ current: '', next: '', confirm: '' });
      showMessage('Password updated successfully.');
    } catch (error) {
      console.error('Failed to update password:', error);
      showMessage('Failed to update password.');
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onLogoChange(reader.result as string);
        showMessage('Logo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white font-orbitron">System Settings</h1>

      {message && <div className="p-3 bg-green-900/50 border border-green-500 text-green-300 text-center">{message}</div>}

      <SettingsSection
        title="SFTP Backup Settings"
        isEditing={isEditingSftp}
        onEdit={() => setIsEditingSftp(true)}
        onSave={handleSaveSftp}
        actions={
          <button
            onClick={() => testConnection('/api/sftp/test', sftpSettings)}
            className="bg-gray-800/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300"
          >
            Test Connection
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditingSftp ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Host</label>
                <input type="text" value={sftpSettings.host} onChange={e => setSftpSettings({ ...sftpSettings, host: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Port</label>
                <input type="number" value={sftpSettings.port} onChange={e => setSftpSettings({ ...sftpSettings, port: parseInt(e.target.value) })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Username</label>
                <input type="text" value={sftpSettings.user} onChange={e => setSftpSettings({ ...sftpSettings, user: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Password</label>
                <input type="password" value={sftpSettings.password} onChange={e => setSftpSettings({ ...sftpSettings, password: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">Remote Path</label>
                <input type="text" value={sftpSettings.remote_path} onChange={e => setSftpSettings({ ...sftpSettings, remote_path: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2 font-mono" />
              </div>
            </>
          ) : (
            <>
              <DisplayField label="Host" value={sftpSettings.host} />
              <DisplayField label="Port" value={sftpSettings.port} />
              <DisplayField label="Username" value={sftpSettings.user} />
              <DisplayField label="Password" value={sftpSettings.password ? '************' : ''} />
              <div className="md:col-span-2">
                <DisplayField label="Remote Path" value={sftpSettings.remote_path} />
              </div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="SMTP Notification Settings" isEditing={isEditingSmtp} onEdit={() => setIsEditingSmtp(true)} onSave={handleSaveSmtp}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditingSmtp ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">SMTP Host</label>
                <input type="text" value={smtpSettings.host} onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Port</label>
                <input type="number" value={smtpSettings.port} onChange={e => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Username</label>
                <input type="text" value={smtpSettings.user} onChange={e => setSmtpSettings({ ...smtpSettings, user: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Password</label>
                <input type="password" placeholder="Enter new password" onChange={e => setSmtpSettings({ ...smtpSettings, pass: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">From Email</label>
                <input type="email" value={smtpSettings.from} onChange={e => setSmtpSettings({ ...smtpSettings, from: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">To Email</label>
                <input type="email" value={smtpSettings.to} onChange={e => setSmtpSettings({ ...smtpSettings, to: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
            </>
          ) : (
            <>
              <DisplayField label="SMTP Host" value={smtpSettings.host} />
              <DisplayField label="Port" value={smtpSettings.port} />
              <DisplayField label="Username" value={smtpSettings.user} />
              <DisplayField label="Password" value={smtpSettings.pass ? '************' : ''} />
              <DisplayField label="From Email" value={smtpSettings.from} />
              <DisplayField label="To Email" value={smtpSettings.to} />
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Remote SSH Configuration"
        isEditing={isEditingSsh}
        onEdit={() => setIsEditingSsh(true)}
        onSave={handleSaveSsh}
        actions={
          <button
            onClick={() => testConnection('/api/ssh/test', sshSettings)}
            className="bg-gray-800/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300"
          >
            Test Connection
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditingSsh ? (
            <>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">SSH Host</label>
                <input type="text" value={sshSettings.host} onChange={e => setSshSettings({ ...sshSettings, host: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Port</label>
                <input type="number" value={sshSettings.port} onChange={e => setSshSettings({ ...sshSettings, port: parseInt(e.target.value) })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">SSH Username</label>
                <input type="text" value={sshSettings.user} onChange={e => setSshSettings({ ...sshSettings, user: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">SSH Password</label>
                <input type="password" value={sshSettings.password} onChange={e => setSshSettings({ ...sshSettings, password: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">SSH Private Key</label>
                <textarea value={sshSettings.key} onChange={e => setSshSettings({ ...sshSettings, key: e.target.value })} placeholder="Paste private key here..." rows={6} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2 font-mono text-xs"></textarea>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">Remote Path</label>
                <input type="text" value={sshSettings.remote_path} onChange={e => setSshSettings({ ...sshSettings, remote_path: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2 font-mono" />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2"><DisplayField label="SSH Host" value={sshSettings.host} /></div>
              <DisplayField label="Port" value={sshSettings.port} />
              <DisplayField label="SSH Username" value={sshSettings.user} />
              <div className="md:col-span-2"><DisplayField label="SSH Password" value={sshSettings.password ? '************' : ''} /></div>
              <div className="md:col-span-2"><DisplayField label="SSH Private Key" value={sshSettings.key ? '************' : ''} /></div>
              <div className="md:col-span-2"><DisplayField label="Remote Path" value={sshSettings.remote_path} /></div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="cPanel API Settings"
        isEditing={isEditingCpanel}
        onEdit={() => setIsEditingCpanel(true)}
        onSave={handleSaveCpanel}
        actions={
          <button
            onClick={() => testConnection('/api/cpanel/test', cpanelSettings)}
            className="bg-gray-800/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300"
          >
            Test Connection
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditingCpanel ? (
            <>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">cPanel Host</label>
                <input type="text" value={cpanelSettings.host} onChange={e => setCpanelSettings({ ...cpanelSettings, host: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Port</label>
                <input type="number" value={cpanelSettings.port} onChange={e => setCpanelSettings({ ...cpanelSettings, port: parseInt(e.target.value) })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Username</label>
                <input type="text" value={cpanelSettings.user} onChange={e => setCpanelSettings({ ...cpanelSettings, user: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">API Token</label>
                <input type="password" value={cpanelSettings.token} onChange={e => setCpanelSettings({ ...cpanelSettings, token: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2 font-mono" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">Password (if not using token)</label>
                <input type="password" value={cpanelSettings.password} onChange={e => setCpanelSettings({ ...cpanelSettings, password: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2"><DisplayField label="cPanel Host" value={cpanelSettings.host} /></div>
              <DisplayField label="Port" value={cpanelSettings.port} />
              <DisplayField label="Username" value={cpanelSettings.user} />
              <div className="md:col-span-2"><DisplayField label="API Token" value={cpanelSettings.token ? '************' : ''} /></div>
              <div className="md:col-span-2"><DisplayField label="Password" value={cpanelSettings.password ? '************' : ''} /></div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Change Login Password"
        actions={
          <button
            onClick={handleChangePassword}
            className="bg-green-900/50 text-green-300 border border-green-500 px-6 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300"
          >
            Update Password
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Current Password</label>
            <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">New Password</label>
            <input type="password" value={passwordForm.next} onChange={e => setPasswordForm({ ...passwordForm, next: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Confirm Password</label>
            <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
          </div>
        </div>
      </SettingsSection>

      <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white mb-4">Branding</h2>
        <p className="text-sm text-gray-400 mb-4">Upload a custom logo for the login screen and sidebar. Recommended format: PNG with transparent background.</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
        <button onClick={handleLogoClick} className="bg-blue-900/50 text-blue-300 border border-blue-500 px-4 py-2 text-sm hover:bg-blue-700/50 hover:text-white transition-all duration-300">
          Upload New Logo
        </button>
      </div>
    </div>
  );
};

export default Settings;
