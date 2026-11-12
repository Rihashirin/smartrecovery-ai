import React, { useState } from 'react';
import {
  Zap,
  Receipt,
  Mail,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AppState, RecoveryAction, Transaction } from '../types';

interface RecoveryActionsViewProps {
  state: AppState;
  onSelectTransaction: (txn: Transaction) => void;
  onSimulateRecovered: (txnId: string) => void;
}

export const RecoveryActionsView: React.FC<RecoveryActionsViewProps> = ({
  state,
  onSelectTransaction,
  onSimulateRecovered,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Collect all actions with their transactions
  const allActions = state.transactions.flatMap((txn) =>
    txn.actions.map((act) => ({
      ...act,
      transaction: txn,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = allActions.filter((act) => {
    if (statusFilter !== 'all' && act.status !== statusFilter) return false;
    if (typeFilter !== 'all' && act.type !== typeFilter) return false;
    return true;
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Receipt className="w-4 h-4 text-indigo-600" />;
      case 'message':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'schedule_retry':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'escalate_human':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      default:
        return <Zap className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'pending_approval':
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {status === 'escalated' ? 'Escalated to Human' : 'Pending Approval'}
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Module 3 Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              Module 03
            </span>
            <span className="text-xs text-slate-400">Autonomous Execution Layer</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Autonomous Recovery Agent</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Executes AI-selected recovery plays: simulated PayPal invoices, smart retry scheduling, customer notification emails, and deterministic human escalations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-navy-900/80 p-3 rounded-xl border border-navy-700/80">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div className="text-xs">
            <p className="font-bold text-white">Idempotency Protected</p>
            <p className="text-[11px] text-slate-400">Zero double-billing risk</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          {['all', 'completed', 'pending_approval', 'escalated', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Action Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="all">All Action Types</option>
            <option value="invoice">Generate Invoice</option>
            <option value="message">Personalized Message</option>
            <option value="schedule_retry">Schedule Retry</option>
            <option value="escalate_human">Escalate to Human</option>
          </select>
        </div>
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Action Type</th>
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Idempotency Key</th>
                <th className="py-3 px-4">Result / Link</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No recovery actions match the filters.
                  </td>
                </tr>
              ) : (
                filtered.map((act) => {
                  const txn = act.transaction;
                  return (
                    <tr
                      key={act.id}
                      onClick={() => onSelectTransaction(txn)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2 font-semibold text-slate-900 capitalize">
                          {getActionIcon(act.type)}
                          <span>{act.type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(act.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-600">{txn.displayId}</span>
                        <div className="font-bold text-slate-800 text-[11px]">${txn.amount.toFixed(2)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{txn.customer?.name}</div>
                        <div className="text-[10px] text-slate-400">{txn.customer?.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(act.status)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 truncate max-w-[150px]" title={act.idempotencyKey}>
                        {act.idempotencyKey}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {act.result?.invoiceUrl ? (
                          <a
                            href={act.result.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-[11px] font-medium"
                          >
                            PayPal Invoice Link <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : act.result?.recommendedRetryAt ? (
                          <span className="text-slate-600 font-mono text-[11px]">
                            Retry: {new Date(act.result.recommendedRetryAt).toLocaleDateString()}
                          </span>
                        ) : act.error ? (
                          <span className="text-rose-600 font-medium truncate block" title={act.error}>
                            {act.error}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Validated</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                          {act.actor}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        {txn.status === 'failed' || txn.status === 'approved_uncaptured' ? (
                          <button
                            onClick={() => onSimulateRecovered(txn.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded border border-emerald-200 transition"
                          >
                            Simulate Paid
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

