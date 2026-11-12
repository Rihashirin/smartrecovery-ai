import React from 'react';
import {
  Brain,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Mail,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
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
import { AppState, Transaction } from '../types';
import { MetricsCards } from './MetricsCards';

interface OverviewViewProps {
  state: AppState;
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTab: (tab: string) => void;
  onTriggerAction: (txnId: string, actionType: any) => void;
  onSimulateRecovered: (txnId: string) => void;
  onOpenSimulate: () => void;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6'];

export const OverviewView: React.FC<OverviewViewProps> = ({
  state,
  onSelectTransaction,
  onNavigateToTab,
  onTriggerAction,
  onSimulateRecovered,
  onOpenSimulate,
}) => {
  // Compute chart data from historical seed transactions
  const monthlyData = [
    { month: 'Jun', failed: 420, recovered: 310, rate: 73 },
    { month: 'Jul', failed: 580, recovered: 450, rate: 77 },
    { month: 'Aug', failed: 510, recovered: 430, rate: 84 },
    { month: 'Sep', failed: 640, recovered: 560, rate: 87 },
    { month: 'Oct', failed: 720, recovered: 640, rate: 88 },
    { month: 'Nov', failed: 890, recovered: 780, rate: 87 },
  ];

  // Failure categories breakdown for Pie Chart
  const categoryCounts: Record<string, number> = {};
  state.transactions.forEach((t) => {
    if (t.diagnosis) {
      const label = t.diagnosis.categoryLabel || t.diagnosis.category || 'Other';
      categoryCounts[label] = (categoryCounts[label] || 0) + 1;
    }
  });

  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Recent failed/actionable transactions
  const actionableTxns = state.transactions
    .filter((t) => t.status === 'failed' || t.status === 'approved_uncaptured')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Key Metrics Cards */}
      <MetricsCards state={state} onNavigateToTab={onNavigateToTab} />

      {/* 2. Autonomous Recovery Pipeline Workflow Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/30">
                Autonomous Loop
              </span>
              <span className="text-xs text-slate-400">Zero manual intervention for safe recoveries</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              End-to-End Autonomous Payment Recovery Flow
            </h2>
          </div>
          <button
            onClick={onOpenSimulate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 transition flex items-center gap-2 self-start lg:self-center"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
            Test Live Pipeline
          </button>
        </div>

        {/* 5-Step Agent Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
          {/* Step 1 */}
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-1">
              <span>01. DETECT</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-sm font-bold text-slate-100">Payment Monitor</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Captures PayPal webhooks: denied captures, failed subscriptions, uncaptured orders.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
              <span>02. DIAGNOSE</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-sm font-bold text-slate-100">AI Diagnosis Agent</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Dissects error codes, facts vs hypotheses, predicts recovery probability.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
              <span>03. VERIFY</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-slate-100">Guardrail Engine</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Enforces immutable amount, zero surprise charges, & idempotency locks.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
              <span>04. EXECUTE</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-sm font-bold text-slate-100">Recovery Agent</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Dispatches PayPal invoices, personalized recovery emails, or retry timers.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
              <span>05. RESTORE</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-slate-100">Revenue Recovered</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Webhook matches original transaction ID & updates analytics automatically.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Recovery Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue Recovery Trends</h3>
              <p className="text-xs text-slate-500">Recovered vs Failed transaction volume ($USD)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Recovered
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400"></span> At Risk
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="recovered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#recoveredGrad)" />
                <Area type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#failedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Breakdown Pie Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Failure Categories</h3>
            <p className="text-xs text-slate-500">Root cause distribution diagnosed by AI</p>
          </div>
          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: 'Card Declined', value: 60 }, { name: 'Payer Issue', value: 25 }, { name: 'Uncaptured', value: 15 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(pieData.length > 0 ? pieData : [{ name: 'A', value: 1 }]).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {pieData.slice(0, 3).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate max-w-[160px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  {item.name}
                </span>
                <span className="font-semibold text-slate-800">{item.value} cases</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Actionable Recent Failed Transactions */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Recovery Queue</h3>
            <p className="text-xs text-slate-500">Failed PayPal payments pending customer action or automated retry</p>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
          >
            View all transactions
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Failure Reason</th>
                <th className="py-3 px-4">AI Recommended Action</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {actionableTxns.map((txn) => {
                const dx = txn.diagnosis;
                return (
                  <tr
                    key={txn.id}
                    onClick={() => onSelectTransaction(txn)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">
                      {txn.displayId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{txn.customer?.name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-400">{txn.customer?.company || txn.customer?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${txn.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        {txn.failureReason || txn.failureCode || 'Capture Denied'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {dx ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>{dx.recommendedAction === 'invoice' ? 'One-Click Invoice' : dx.recommendedAction === 'message' ? 'Smart Message' : dx.recommendedAction === 'schedule_retry' ? 'Smart Retry' : 'Human Review'}</span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                            {Math.round(dx.recoveryProbability * 100)}% prob
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Analyzing...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          dx?.riskLevel === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : dx?.riskLevel === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {dx?.riskLevel || 'medium'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onTriggerAction(txn.id, dx?.recommendedAction || 'invoice')}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] rounded border border-indigo-200 transition"
                          title="Execute recovery action"
                        >
                          Execute Action
                        </button>
                        <button
                          onClick={() => onSimulateRecovered(txn.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded border border-emerald-200 transition"
                          title="Simulate customer paying invoice"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. AI Insights & Deterministic Guardrails Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Strategic Insights */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Recovery Insights</h3>
              <p className="text-[11px] text-slate-500">Autonomous pattern recognition on failed payments</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Card Instrument Decline Optimization</span>
              </div>
              <p className="text-slate-600">
                Sending a one-click PayPal invoice with backup funding within 4 hours yields an 84% recovery rate compared to standard email retries.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-purple-600 mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Optimal Retry Scheduling</span>
              </div>
              <p className="text-slate-600">
                Subscription renewal failures due to insufficient funds recover 3.2x more effectively when scheduled on paydays (1st and 15th of month) at 09:00 UTC.
              </p>
            </div>
          </div>
        </div>

        {/* Deterministic Guardrails */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Deterministic Guardrail Engine</h3>
                <p className="text-[11px] text-slate-500">Rule-based safety layer between AI and PayPal API</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              6/6 Rules Enforced
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {state.rules.slice(0, 4).map((rule) => (
              <div key={rule.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{rule.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{rule.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

