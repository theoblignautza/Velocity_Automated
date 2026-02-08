import React, { useEffect, useMemo, useState } from 'react';
import type { Schedule } from '../types';

const dayOptions = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const jobLabels: Record<Schedule['jobType'], string> = {
  sftp: 'SFTP Pull',
  ssh: 'SSH Sync',
  cpanel: 'cPanel API',
};

const Scheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formJobType, setFormJobType] = useState<Schedule['jobType']>('sftp');
  const [formTime, setFormTime] = useState('02:00');
  const [formDays, setFormDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

  const timeParts = useMemo(() => {
    const [hour, minute] = formTime.split(':').map(Number);
    return { hour, minute };
  }, [formTime]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/schedules');
      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }
      const data = await response.json();
      const mapped = (data as Array<{ id: number; job_type: Schedule['jobType']; hour: number; minute: number; days: string[]; next_run: string }>).map(
        schedule => ({
          id: schedule.id,
          jobType: schedule.job_type,
          hour: schedule.hour,
          minute: schedule.minute,
          days: schedule.days,
          nextRun: schedule.next_run,
        })
      );
      setSchedules(mapped);
      setStatusMessage(mapped.length === 0 ? 'No schedules configured yet.' : '');
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setStatusMessage('Unable to load schedules. Check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const resetForm = () => {
    setFormJobType('sftp');
    setFormTime('02:00');
    setFormDays(['mon', 'tue', 'wed', 'thu', 'fri']);
  };

  const openNewSchedule = () => {
    resetForm();
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const openEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormJobType(schedule.jobType);
    const hour = String(schedule.hour).padStart(2, '0');
    const minute = String(schedule.minute).padStart(2, '0');
    setFormTime(`${hour}:${minute}`);
    setFormDays(schedule.days);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        job_type: formJobType,
        hour: timeParts.hour,
        minute: timeParts.minute,
        days: formDays,
      };
      if (editingSchedule) {
        const response = await fetch(`/api/schedules/${editingSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Failed to update schedule');
        }
        setStatusMessage('Schedule updated.');
      } else {
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Failed to create schedule');
        }
        setStatusMessage('Schedule created.');
      }
      setIsModalOpen(false);
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setStatusMessage('Unable to save schedule. Check backend connectivity.');
    }
  };

  const handleDelete = async (scheduleId: number) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
      setStatusMessage('Schedule deleted.');
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      setStatusMessage('Unable to delete schedule. Check backend connectivity.');
    }
  };

  const toggleDay = (day: string) => {
    setFormDays(prev =>
      prev.includes(day) ? prev.filter(item => item !== day) : [...prev, day]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white font-orbitron">Job Scheduler</h1>
        <button
          onClick={openNewSchedule}
          className="bg-green-900/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300"
        >
          + Create New Schedule
        </button>
      </div>

      <div className="bg-gray-950/30 border border-green-500/20 p-3 text-xs text-green-300 flex items-center justify-between gap-4">
        <span>{statusMessage || 'Manage schedules for SFTP, SSH, and cPanel backups.'}</span>
        <button
          onClick={fetchSchedules}
          className="text-xs text-green-300 border border-green-500 px-3 py-1 hover:bg-green-700/40"
        >
          Refresh
        </button>
      </div>

      <div className="bg-gray-950/30 border border-green-500/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-900/50">
              <tr>
                <th scope="col" className="px-6 py-3">Scheduled Job</th>
                <th scope="col" className="px-6 py-3">Days</th>
                <th scope="col" className="px-6 py-3">Time</th>
                <th scope="col" className="px-6 py-3">Next Run Time</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <tr key={schedule.id} className="border-b border-green-500/10 hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-white">{jobLabels[schedule.jobType]}</td>
                  <td className="px-6 py-4">{schedule.days.map(day => dayOptions.find(opt => opt.value === day)?.label).join(', ') || 'Every day'}</td>
                  <td className="px-6 py-4">{`${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`}</td>
                  <td className="px-6 py-4">{schedule.nextRun || 'Calculating...'}</td>
                  <td className="px-6 py-4 text-right space-x-4">
                    <button onClick={() => openEditSchedule(schedule)} className="font-medium text-blue-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(schedule.id)} className="font-medium text-red-400 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {!isLoading && schedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8">No schedules created yet.</td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8">Loading schedules...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-green-500/30 p-8 rounded-lg w-full max-w-lg space-y-6">
            <h2 className="text-xl font-bold text-white mb-2 font-orbitron">
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Backup Type</label>
                <select
                  value={formJobType}
                  onChange={e => setFormJobType(e.target.value as Schedule['jobType'])}
                  className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2"
                >
                  <option value="sftp">SFTP Pull</option>
                  <option value="ssh">SSH Sync</option>
                  <option value="cpanel">cPanel API</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Time (24h)</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full bg-black/50 border border-green-700 text-green-400 focus:border-green-400 focus:outline-none p-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Days of the Week</label>
                <div className="grid grid-cols-4 gap-2">
                  {dayOptions.map(day => (
                    <label key={day.value} className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formDays.includes(day.value)}
                        onChange={() => toggleDay(day.value)}
                        className="accent-green-500"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-300 bg-gray-700/50 hover:bg-gray-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-white bg-green-800/50 hover:bg-green-700/50"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
