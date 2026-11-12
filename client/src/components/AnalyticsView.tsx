import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AppState } from '../types';

interface AnalyticsViewProps {
  state: AppState;
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state }) => {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '180d'>('90d');

  const txns = state.transactions;
  const failed = txns.filter((t) => t.status === 'failed' || t.status === 'approved_uncaptured');
  const recovered = txns.filter((t) => t.status === 'recovered');

  const totalAtRisk = failed.reduce((sum, t) => sum + t.amount, 0);
  const totalRecovered = recovered.reduce((sum, t) => sum + (t.recoveredAmount || t.amount), 0);
  const recoveryPct = (recovered.length + failed.length) > 0
    ? ((recovered.length / (recovered.length + failed.length)) * 100).toFixed(1)
    : '0';

  // Monthly trends data
  const monthlyTrends = [
    { month: 'Jun', totalVolume: 12400, recovered: 3200, atRisk: 1100, recoveryRate: 74 },
    { month: 'Jul', totalVolume: 14800, recovered: 4100, atRisk: 1300, recoveryRate: 76 },
    { month: 'Aug', totalVolume: 16200, recovered: 5200, atRisk: 1050, recoveryRate: 83 },
    { month: 'Sep', totalVolume: 18900, recovered: 6400, atRisk: 950, recoveryRate: 87 },
    { month: 'Oct', totalVolume: 21500, recovered: 7800, atRisk: 1200, recoveryRate: 86 },
    { month: 'Nov', totalVolume: 24100, recovered: 9200, atRisk: 1400, recoveryRate: 87 },
  ];

  // Recovery Channels effectiveness
  const channelData = [
    { channel: 'One-Click Invoices', count: 18, recovered: 4850, rate: 88 },
    { channel: 'Smart Retry Timing', count: 12, recovered: 2640, rate: 82 },
    { channel: 'Customer Notifications', count: 9, recovered: 1420, rate: 71 },
    { channel: 'Human Review Escalations', count: 5, recovered: 1150, rate: 65 },
  ];

  // Failure reasons breakdown
  const reasonsMap: Record<string, number> = {};
  txns.forEach((t) => {
    if (t.failureReason || t.failureCode) {
      const reason = t.failureReason || t.failureCode || 'Unknown';
      reasonsMap[reason] = (reasonsMap[reason] || 0) + 1;
    }
  });

  const failureReasonData = Object.entries(reasonsMap)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              Module 07
            </span>
            <span className="text-xs text-slate-400">Financial Intelligence & Benchmarks</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Recovery Analytics & Reporting</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time telemetry measuring autonomous PayPal revenue capture, customer win-back ratios, and root cause distributions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-navy-900/90 p-1.5 rounded-xl border border-navy-700">
          {(['30d', '90d', '180d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition ${
                timeRange === r
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Recovered Revenue</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600">
              ${totalRecovered.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +28%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{recovered.length} restored transactions</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Revenue at Risk</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-rose-600">
              ${totalAtRisk.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs font-semibold text-rose-500">Unrecovered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{failed.length} open failed orders</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Autonomous Win Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600">{recoveryPct}%</span>
            <span className="text-xs font-semibold text-indigo-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Industry benchmark: 32%</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Guardrail Integrity</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">100%</span>
            <span className="text-xs font-semibold text-emerald-600">Deterministic</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">0 unauthorized API calls</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery Volume Trends */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Restored Revenue vs Lost</h3>
              <p className="text-xs text-slate-500">Cumulative recovery performance ($ USD)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Recovered
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-medium">
                <span className="w-2.5 h-2.5 bg-rose-400 rounded-sm"></span> Lost
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="recovered" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="atRisk" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Failure Reasons */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top Payment Failure Reasons</h3>
            <p className="text-xs text-slate-500">Diagnosed across PayPal capture responses</p>
          </div>
          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={failureReasonData.length > 0 ? failureReasonData : [{ name: 'Card Declined', value: 10 }]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {failureReasonData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
            {failureReasonData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="text-slate-600 truncate" title={item.name}>{item.name}</span>
                <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recovery Playbook Channels Effectiveness Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Recovery Playbook Channel Effectiveness</h3>
        <p className="text-xs text-slate-500 mb-4">Comparison of autonomous recovery tactics</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {channelData.map((ch, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">{ch.channel}</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-bold text-indigo-600">${ch.recovered}</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {ch.rate}% Success
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{ch.count} recovery actions executed</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

