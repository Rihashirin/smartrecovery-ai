import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CreditCard,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Receipt,
  Mail,
  UserCheck,
  Zap,
} from 'lucide-react';
import { AppState, Transaction, TransactionStatus, ActionType } from '../types';

interface TransactionsViewProps {
  state: AppState;
  searchQuery: string;
  onSelectTransaction: (txn: Transaction) => void;
  onTriggerAction: (txnId: string, type: ActionType) => void;
  onSimulateRecovered: (txnId: string) => void;
  onOpenMessageModal: (txn: Transaction) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  state,
  searchQuery,
  onSelectTransaction,
  onTriggerAction,
  onSimulateRecovered,
  onOpenMessageModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter((txn) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed_only') {
          if (txn.status !== 'failed' && txn.status !== 'approved_uncaptured') return false;
        } else if (txn.status !== statusFilter) {
          return false;
        }
      }

      // Event type filter
      if (eventTypeFilter !== 'all' && txn.eventType !== eventTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = txn.displayId.toLowerCase().includes(q) || txn.id.toLowerCase().includes(q);
        const matchCustomer = txn.customer?.name.toLowerCase().includes(q) || txn.customer?.email.toLowerCase().includes(q);
        const matchReason = txn.failureReason?.toLowerCase().includes(q) || txn.failureCode?.toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchReason) return false;
      }

      return true;
    });
  }, [state.transactions, statusFilter, eventTypeFilter, searchQuery]);

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Recovered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Failed
          </span>
        );
      case 'approved_uncaptured':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Uncaptured
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Approved
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <RotateCcw className="w-3 h-3 text-slate-500" />
            Refunded (Excluded)
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Completed
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'failed_only', label: 'All At Risk' },
            { id: 'failed', label: 'Denied' },
            { id: 'approved_uncaptured', label: 'Uncaptured Orders' },
            { id: 'recovered', label: 'Recovered' },
            { id: 'completed', label: 'Completed' },
            { id: 'refunded', label: 'Refunds' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Event Type Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">PayPal Event:</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="all">All Events</option>
            <option value="PAYMENT.CAPTURE.DENIED">PAYMENT.CAPTURE.DENIED</option>
            <option value="BILLING.SUBSCRIPTION.PAYMENT.FAILED">BILLING.SUBSCRIPTION.PAYMENT.FAILED</option>
            <option value="CHECKOUT.ORDER.APPROVED">CHECKOUT.ORDER.APPROVED</option>
            <option value="PAYMENT.CAPTURE.REFUNDED">PAYMENT.CAPTURE.REFUNDED</option>
            <option value="PAYMENT.CAPTURE.COMPLETED">PAYMENT.CAPTURE.COMPLETED</option>
          </select>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Transaction</th>
                <th className="py-3 px-4">Customer & Segment</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Event & Failure Reason</th>
                <th className="py-3 px-4">AI Diagnosis</th>
                <th className="py-3 px-4">Action Status</th>
                <th className="py-3 px-5 text-right">Autonomous Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const dx = txn.diagnosis;
                  const latestAction = txn.actions[0];
                  const isRecoverable = txn.status === 'failed' || txn.status === 'approved_uncaptured';

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => onSelectTransaction(txn)}
                      className="hover:bg-slate-50/80 cursor-pointer transition group"
                    >
                      {/* Transaction ID & Date */}
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-indigo-600 group-hover:text-indigo-800 transition">
                          {txn.displayId}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(txn.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{txn.customer?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{txn.customer?.email}</span>
                          {txn.customer?.segment && (
                            <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">
                              {txn.customer.segment}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ${txn.amount.toFixed(2)}
                        {txn.status === 'recovered' && (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            +${txn.recoveredAmount.toFixed(2)} back
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(txn.status)}
                      </td>

                      {/* Event & Failure Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono text-[10px] text-slate-500 truncate" title={txn.eventType}>
                          {txn.eventType.replace('PAYMENT.', '').replace('BILLING.', '')}
                        </div>
                        <div className="text-slate-700 font-medium truncate" title={txn.failureReason || txn.failureCode || ''}>
                          {txn.failureReason || txn.failureCode || '—'}
                        </div>
                      </td>

                      {/* AI Diagnosis */}
                      <td className="py-3.5 px-4">
                        {dx ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-semibold text-slate-800">
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              <span className="truncate max-w-[130px]" title={dx.categoryLabel}>
                                {dx.categoryLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                  dx.riskLevel === 'high'
                                    ? 'bg-rose-100 text-rose-800'
                                    : dx.riskLevel === 'medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {dx.riskLevel}
                              </span>
                              <span className="text-slate-400">· {Math.round(dx.recoveryProbability * 100)}% prob</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {txn.status === 'refunded' ? 'Refund Excluded' : 'No diagnosis required'}
                          </span>
                        )}
                      </td>

                      {/* Action Status */}
                      <td className="py-3.5 px-4">
                        {latestAction ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                latestAction.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : latestAction.status === 'pending_approval' || latestAction.status === 'escalated'
                                  ? 'bg-amber-100 text-amber-800'
                                  : latestAction.status === 'failed' || latestAction.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {latestAction.status.replace('_', ' ')}
                            </span>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {latestAction.type.replace('_', ' ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isRecoverable ? (
                            <>
                              <button
                                onClick={() => onTriggerAction(txn.id, 'invoice')}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded border border-indigo-200 transition flex items-center gap-1"
                                title="Generate PayPal Invoice"
                              >
                                <Receipt className="w-3 h-3" />
                                Invoice
                              </button>
                              <button
                                onClick={() => onOpenMessageModal(txn)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold rounded border border-purple-200 transition flex items-center gap-1"
                                title="Open Message Composer"
                              >
                                <Mail className="w-3 h-3" />
                                Msg
                              </button>
                              <button
                                onClick={() => onSimulateRecovered(txn.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded border border-emerald-200 transition flex items-center gap-1"
                                title="Simulate Customer Payment"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onSelectTransaction(txn)}
                              className="px-2.5 py-1 text-slate-500 hover:text-indigo-600 text-[11px] font-medium flex items-center gap-1"
                            >
                              Details <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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

