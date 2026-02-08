import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CpuData } from '../types';

const getUsageColor = (usage: number): string => {
  if (usage > 70) return '#ef4444'; // red-500
  if (usage > 40) return '#f59e0b'; // amber-500
  return '#34d399'; // green-400
};

const getUsageColorClass = (usage: number): string => {
  if (usage > 70) return 'text-red-400';
  if (usage > 40) return 'text-orange-400';
  return 'text-green-400';
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const usage = payload[0].value;
    const colorClass = getUsageColorClass(usage);
    return (
      <div className="bg-gray-900/80 border border-green-500/30 p-2 text-sm text-gray-300 backdrop-blur-sm">
        <p className="label">{`Time : ${label}`}</p>
        <p className={`intro font-bold ${colorClass}`}>{`Usage : ${usage}%`}</p>
      </div>
    );
  }
  return null;
};

// Fix: Define CpuChartProps interface to resolve TypeScript error.
interface CpuChartProps {
  data: CpuData[];
}

const CpuChart: React.FC<CpuChartProps> = ({ data }) => {
  const latestUsage = data.length > 0 ? data[data.length - 1].usage : 0;
  const strokeColor = getUsageColor(latestUsage);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 5, right: 20, left: -10, bottom: 5,
        }}
      >
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
            {data.map((entry, index) => (
               <stop
                key={`grad-stop-${index}`}
                offset={`${(index / (data.length > 1 ? data.length - 1 : 1)) * 100}%`}
                stopColor={getUsageColor(entry.usage)}
              />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(52, 211, 153, 0.2)" />
        <XAxis dataKey="time" tick={false} tickLine={false} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} unit="%" domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="usage" 
          stroke={strokeColor} 
          strokeWidth={2}
          fillOpacity={0.6}
          fill="url(#colorGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default CpuChart;