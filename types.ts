
export type ViewType = 'dashboard' | 'files' | 'scheduler' | 'settings';

export enum JobType {
  SFTP = 'SFTP',
  CPANEL = 'cPanel',
  CISCO = 'Cisco Router',
  UBIQUITI = 'Ubiquiti UniFi',
}

export interface BackupJob {
  id: string;
  name: string;
  type: JobType;
  host: string;
  port: number;
  lastBackup: string;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface BackupFile {
  id: string;
  filename: string;
  size: string;
  created: string;
  job: string;
}

export interface Schedule {
  id: number;
  jobType: 'sftp' | 'ssh' | 'cpanel';
  hour: number;
  minute: number;
  days: string[];
  nextRun: string;
}

export interface CpuData {
  time: string;
  usage: number;
}

export type DownloadMethodId = 'sftp' | 'ssh' | 'cpanel';

export interface DownloadMethod {
  id: DownloadMethodId;
  label: string;
  description: string;
  isRunning: boolean;
  progress: number;
  lastResult: string;
}
