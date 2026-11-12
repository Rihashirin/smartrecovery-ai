import React from 'react';
import {
  Search,
  Bell,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Shield,
  Activity,
} from 'lucide-react';
import { AppState } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notice: AppState['notice'] | null;
  onDismissNotice: () => void;
  onOpenSimulate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchQuery,
  setSearchQuery,
  notice,
  onDismissNotice,
  onOpenSimulate,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="px-8 py-4 flex items-center justify-between gap-4">
        {/* Title area */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TXN, customer, or email..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 border border-transparent focus:border-indigo-500 rounded-lg outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Monitoring Active indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Agent Active</span>
          </div>

          {/* Quick Simulate Button */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden sm:inline">Simulate Event</span>
          </button>
        </div>
      </div>

      {/* Global State Notice Alert Banner */}
      {notice && (
        <div
          className={`px-8 py-2.5 text-xs font-medium flex items-center justify-between border-t transition-all ${
            notice.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notice.tone === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.tone === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notice.tone === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {notice.tone === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{notice.message}</span>
            {notice.focusId && (
              <span className="font-mono text-[11px] bg-white/70 px-1.5 py-0.5 rounded border border-black/10">
                {notice.focusId}
              </span>
            )}
          </div>
          <button
            onClick={onDismissNotice}
            className="text-slate-500 hover:text-slate-800 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};

