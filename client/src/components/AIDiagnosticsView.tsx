import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Layers,
  Cpu,
  Zap,
} from 'lucide-react';
import { AppState, Transaction } from '../types';

interface AIDiagnosticsViewProps {
  state: AppState;
  onSelectTransaction: (txn: Transaction) => void;
  onTriggerAction: (txnId: string, actionType: any) => void;
}

export const AIDiagnosticsView: React.FC<AIDiagnosticsViewProps> = ({
  state,
  onSelectTransaction,
  onTriggerAction,
}) => {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const diagnosedTransactions = state.transactions.filter((t) => t.diagnosis != null);

  const filtered = diagnosedTransactions.filter((txn) => {
    const dx = txn.diagnosis;
    if (!dx) return false;
    if (riskFilter !== 'all' && dx.riskLevel !== riskFilter) return false;
    if (categoryFilter !== 'all' && dx.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(diagnosedTransactions.map((t) => t.diagnosis?.category).filter(Boolean)));

  const avgRecoveryProb = diagnosedTransactions.length > 0
    ? (diagnosedTransactions.reduce((sum, t) => sum + (t.diagnosis?.recoveryProbability || 0), 0) / diagnosedTransactions.length * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              Module 02
            </span>
            <span className="text-xs text-slate-400">Autonomous Diagnostic Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Payment Diagnosis Agent</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Parses raw PayPal error events, segregates verified API facts from probabilistic hypotheses, and recommends deterministic recovery paths with risk scoring.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-navy-900/80 p-3.5 rounded-xl border border-navy-700/80 shrink-0">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Model Pipeline</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>{state.integration.openai ? state.integration.model : 'Deterministic Policy Engine'}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-navy-700"></div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Avg Recovery Rate</span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">{avgRecoveryProb}% Expected</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filter by Risk:</span>
          {['all', 'low', 'medium', 'high'].map((level) => (
            <button
              key={level}
              onClick={() => setRiskFilter(level)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                riskFilter === level
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories ({diagnosedTransactions.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat?.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Diagnosis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((txn) => {
          const dx = txn.diagnosis!;
          return (
            <div
              key={txn.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 text-sm">{txn.displayId}</span>
                      <span className="text-xs font-semibold text-slate-400">•</span>
                      <span className="font-semibold text-slate-800 text-xs">{txn.customer?.name}</span>
                      <span className="text-xs font-bold text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded">
                        ${txn.amount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{dx.categoryLabel}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        dx.riskLevel === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : dx.riskLevel === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dx.riskLevel} Risk
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {Math.round(dx.recoveryProbability * 100)}% Prob
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnosis Body */}
              <div className="p-5 space-y-4 flex-1">
                {/* Root Cause & Explanation */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Simple Language AI Explanation
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {dx.explanation}
                  </p>
                </div>

                {/* Facts vs Hypotheses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Facts
                    </span>
                    <ul className="text-[11px] text-slate-600 space-y-0.5">
                      {dx.verifiedFacts.slice(0, 2).map((fact, i) => (
                        <li key={i} className="truncate" title={fact}>
                          • {fact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Inferred Hypotheses
                    </span>
                    <ul className="text-[11px] text-slate-600 space-y-0.5">
                      {dx.hypotheses.slice(0, 2).map((hypo, i) => (
                        <li key={i} className="truncate" title={hypo}>
                          • {hypo}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400">Next Action: </span>
                  <span className="font-bold text-indigo-700 capitalize">
                    {dx.recommendedAction.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTriggerAction(txn.id, dx.recommendedAction)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => onSelectTransaction(txn)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-0.5"
                  >
                    Details <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

