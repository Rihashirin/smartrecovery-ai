import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  BrainCircuit,
  Zap,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AppState } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  state: AppState | null;
  onOpenSimulate: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  state,
  onOpenSimulate,
  onResetDemo,
  isResetting,
}) => {
  const openReviewsCount = state?.reviews.filter((r) => r.status === 'open').length || 0;
  const failedTxnsCount = state?.transactions.filter((t) => t.status === 'failed' || t.status === 'approved_uncaptured').length || 0;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: CreditCard, badge: failedTxnsCount > 0 ? failedTxnsCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'diagnostics', label: 'AI Diagnostics', icon: BrainCircuit },
    { id: 'actions', label: 'Recovery Actions', icon: Zap },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reviews', label: 'Human Review', icon: ShieldAlert, badge: openReviewsCount > 0 ? openReviewsCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-950 text-slate-300 flex flex-col h-screen border-r border-navy-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-navy-850">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">SmartRecovery</span>
              <span className="text-[10px] uppercase font-extrabold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">AI</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Autonomous PayPal Defense</p>
          </div>
        </div>

        {/* Integration Status Pill */}
        <div className="mt-4 pt-3 border-t border-navy-850/80 flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PayPal Engine
            </span>
            <span className="text-slate-300 font-mono text-[10px] bg-navy-850 px-1.5 py-0.5 rounded">
              {state?.integration.paypalSandbox ? 'Sandbox Live' : 'Simulated'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              AI Diagnosis
            </span>
            <span className="text-slate-300 font-mono text-[10px] bg-navy-850 px-1.5 py-0.5 rounded truncate max-w-[90px]" title={state?.integration.model}>
              {state?.integration.openai ? state.integration.model : 'Policy Engine'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-navy-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${item.badgeColor || 'bg-slate-700'}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action Simulation Section */}
      <div className="p-3 border-t border-navy-850 space-y-2">
        <button
          onClick={onOpenSimulate}
          className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 fill-white text-white" />
          Simulate Payment Failure
        </button>

        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="w-full py-1.5 px-3 rounded-lg bg-navy-900 hover:bg-navy-850 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 border border-navy-800 transition disabled:opacity-50"
        >
          <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
          {isResetting ? 'Resetting...' : 'Reset Demo Ledger'}
        </button>
      </div>

      {/* User Footer */}
      <div className="p-3 bg-navy-900 border-t border-navy-850 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center ring-1 ring-slate-600">
          {state?.currentUser?.name?.slice(0, 2).toUpperCase() || 'AQ'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{state?.currentUser?.name || 'Avery Quinn'}</p>
          <p className="text-[11px] text-slate-400 capitalize truncate">{state?.currentUser?.role || 'Admin'} · {state?.settings?.merchantName || 'Northwind'}</p>
        </div>
      </div>
    </aside>
  );
};

