
import React, { useState } from 'react';
import type { Schedule } from '../types';

const initialSchedules: Schedule[] = [
    { id: 'sched1', jobId: 'job1', nextRun: '2024-07-27 02:00' },
    { id: 'sched2', jobId: 'job2', nextRun: '2024-07-26 22:00' },
    { id: 'sched3', jobId: 'job3', nextRun: '2024-07-28 01:00' },
];

const jobNames: { [key: string]: string } = {
    'job1': 'cPanel - Main Web',
    'job2': 'Office Cisco Router',
    'job3': 'UniFi Controller',
    'job4': 'Dev Server SFTP',
};


const Scheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white font-orbitron">Job Scheduler</h1>
        <button className="bg-green-900/50 text-green-300 border border-green-500 px-4 py-2 text-sm hover:bg-green-700/50 hover:text-white transition-all duration-300">
            + Create New Schedule
        </button>
      </div>

       <div className="bg-gray-950/30 border border-green-500/20">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Scheduled Job</th>
                        <th scope="col" className="px-6 py-3">Next Run Time</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {schedules.map(schedule => (
                        <tr key={schedule.id} className="border-b border-green-500/10 hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-medium text-white">{jobNames[schedule.jobId] || 'Unknown Job'}</td>
                            <td className="px-6 py-4">{schedule.nextRun}</td>
                            <td className="px-6 py-4 text-right space-x-4">
                                <button className="font-medium text-blue-400 hover:underline">Edit</button>
                                <button className="font-medium text-red-400 hover:underline">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
