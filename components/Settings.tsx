
import React, { useState, ChangeEvent, useRef, ReactNode } from 'react';

interface SettingsProps {
    onLogoChange: (newLogo: string) => void;
}

const DisplayField: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div className="space-y-1">
        <label className="text-sm text-gray-400">{label}</label>
        <p className="text-white font-mono bg-black/30 p-2 h-9 flex items-center">{value || <span className="text-gray-500">none</span>}</p>
    </div>
);

interface SettingsSectionProps {
    title: string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    children: ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, isEditing, onEdit, onSave, children }) => {
    return (        
        <div className="bg-gray-950/30 p-6 border border-green-500/20 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <div>
                {isEditing ? (
                     <button onClick={onSave} className="bg-green-900/50 text-green-300 border border-green-500 px-6 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300">
                        Save
                    </button>
                ) : (
                    <button onClick={onEdit} className="bg-blue-900/50 text-blue-300 border border-blue-500 px-6 py-2 text-sm hover:bg-blue-700/50 hover:text-white transition-all duration-300">
                        Edit
                    </button>
                )}
                </div>
            </div>
            {children}
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ onLogoChange }) => {
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing states
    const [isEditingFtp, setIsEditingFtp] = useState(false);
    const [isEditingSmtp, setIsEditingSmtp] = useState(false);
    const [isEditingSsh, setIsEditingSsh] = useState(false);

    // States to hold the settings data
    const [ftpSettings, setFtpSettings] = useState({ host: 'cp71.domains.co.za', port: 22000, password: 'Superadmin@123' });
    const [smtpSettings, setSmtpSettings] = useState({ host: 'smtp.g-suite.com', port: 587, user: 'backups@velocity.tech', pass: '************', from: 'backups@velocity.tech', to: 'alerts@velocity.tech' });
    const [sshSettings, setSshSettings] = useState({ host: '192.168.1.10', user: 'svc_backup', key: '' });
    
    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    }

    const handleSaveFtp = () => {
        setIsEditingFtp(false);
        showMessage('Backup Protocol settings saved!');
    };
    const handleSaveSmtp = () => {
        setIsEditingSmtp(false);
        showMessage('SMTP settings saved!');
    };
    const handleSaveSsh = () => {
        setIsEditingSsh(false);
        showMessage('SSH settings saved!');
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
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white font-orbitron">System Settings</h1>

            {message && <div className="p-3 bg-green-900/50 border border-green-500 text-green-300 text-center">{message}</div>}

            <SettingsSection title="Default Backup Protocol Settings" isEditing={isEditingFtp} onEdit={() => setIsEditingFtp(true)} onSave={handleSaveFtp}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isEditingFtp ? (
                        <>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Default Host (FTP/SFTP)</label>
                            <input type="text" value={ftpSettings.host} onChange={e => setFtpSettings({...ftpSettings, host: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Default Port</label>
                            <input type="number" value={ftpSettings.port} onChange={e => setFtpSettings({...ftpSettings, port: parseInt(e.target.value)})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-gray-400">SFTP Password</label>
                            <input type="password" value={ftpSettings.password} onChange={e => setFtpSettings({...ftpSettings, password: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        </>
                    ) : (
                        <>
                        <DisplayField label="Default Host (FTP/SFTP)" value={ftpSettings.host} />
                        <DisplayField label="Default Port" value={ftpSettings.port} />
                        <div className="md:col-span-2">
                            <DisplayField label="SFTP Password" value={ftpSettings.password ? '************' : ''} />
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
                            <input type="text" value={smtpSettings.host} onChange={e => setSmtpSettings({...smtpSettings, host: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Port</label>
                            <input type="number" value={smtpSettings.port} onChange={e => setSmtpSettings({...smtpSettings, port: parseInt(e.target.value)})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Username</label>
                            <input type="text" value={smtpSettings.user} onChange={e => setSmtpSettings({...smtpSettings, user: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Password</label>
                            <input type="password" placeholder="Enter new password" onChange={e => setSmtpSettings({...smtpSettings, pass: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">From Email</label>
                            <input type="email" value={smtpSettings.from} onChange={e => setSmtpSettings({...smtpSettings, from: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">To Email</label>
                            <input type="email" value={smtpSettings.to} onChange={e => setSmtpSettings({...smtpSettings, to: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
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

            <SettingsSection title="Remote SSH Configuration (for Backend Service)" isEditing={isEditingSsh} onEdit={() => setIsEditingSsh(true)} onSave={handleSaveSsh}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isEditingSsh ? (
                        <>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-gray-400">SSH Host (Your Linux Server)</label>
                            <input type="text" value={sshSettings.host} onChange={e => setSshSettings({...sshSettings, host: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">SSH Username</label>
                            <input type="text" value={sshSettings.user} onChange={e => setSshSettings({...sshSettings, user: e.target.value})} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-gray-400">SSH Private Key</label>
                            <textarea value={sshSettings.key} onChange={e => setSshSettings({...sshSettings, key: e.target.value})} placeholder="Paste private key here..." rows={6} className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2 font-mono text-xs"></textarea>
                        </div>
                        </>
                    ) : (
                        <>
                        <div className="md:col-span-2"><DisplayField label="SSH Host (Your Linux Server)" value={sshSettings.host} /></div>
                        <DisplayField label="SSH Username" value={sshSettings.user} />
                        <div className="md:col-span-2"><DisplayField label="SSH Private Key" value={sshSettings.key ? '************' : ''} /></div>
                        </>
                    )}
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
