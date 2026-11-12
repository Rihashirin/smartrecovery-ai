import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Mail,
  Clock,
  ExternalLink,
  Lock,
  UserCheck,
  Zap,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Transaction, ActionType } from '../types';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onTriggerAction: (txnId: string, type: ActionType, requestedAmount?: number) => void;
  onSimulateRecovered: (txnId: string) => void;
  onOpenMessageModal: (txn: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onTriggerAction,
  onSimulateRecovered,
  onOpenMessageModal,
}) => {
  if (!transaction) return null;

  const [copied, setCopied] = useState(false);
  const [testAmountMutation, setTestAmountMutation] = useState(false);

  const dx = transaction.diagnosis;
  const isRecoverable = transaction.status === 'failed' || transaction.status === 'approved_uncaptured';

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-slate-900">{transaction.displayId}</span>
                <button
                  onClick={handleCopyId}
                  className="text-slate-400 hover:text-slate-600 transition"
                  title="Copy internal UUID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    transaction.status === 'recovered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : transaction.status === 'failed'
                      ? 'bg-rose-100 text-rose-800'
                      : transaction.status === 'approved_uncaptured'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {transaction.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {transaction.eventType} · {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRecoverable && (
              <button
                onClick={() => onSimulateRecovered(transaction.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simulate Customer Paid
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Amount</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                ${transaction.amount.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">{transaction.currency}</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Customer</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{transaction.customer?.name}</p>
              <p className="text-xs text-slate-500 truncate">{transaction.customer?.email}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Risk Score</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {transaction.customer?.riskScore || 0}/100{' '}
                <span className="text-xs font-normal text-slate-500">({transaction.customer?.segment || 'Standard'})</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Failure Code</span>
              <p className="text-sm font-mono font-bold text-rose-600 mt-0.5 truncate">
                {transaction.failureCode || transaction.failureReason || 'None'}
              </p>
            </div>
          </div>

          {/* AI Diagnosis Agent Section */}
          {dx ? (
            <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white rounded-xl p-5 border border-indigo-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">AI Payment Diagnosis Agent</h3>
                    <p className="text-[11px] text-slate-500">
                      Engine: {dx.model} · Policy-Locked: {dx.policyLocked ? 'True' : 'False'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      dx.riskLevel === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : dx.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {dx.riskLevel} Risk
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    {Math.round(dx.recoveryProbability * 100)}% Recovery Chance
                  </span>
                </div>
              </div>

              {/* Explanation in Plain Language */}
              <div className="p-3 bg-white/80 rounded-lg border border-indigo-100 text-xs">
                <p className="font-semibold text-slate-900 mb-1">Root Cause Explanation:</p>
                <p className="text-slate-700 leading-relaxed">{dx.explanation}</p>
              </div>

              {/* Verified Facts vs AI Hypotheses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Facts (From PayPal API)</span>
                  </div>
                  <ul className="space-y-1 text-slate-700">
                    {dx.verifiedFacts?.map((fact, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-800 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Inferred Hypotheses</span>
                  </div>
                  <ul className="space-y-1 text-slate-700">
                    {dx.hypotheses?.map((hypo, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{hypo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 text-xs">
                <div>
                  <span className="text-slate-500">Autonomous Recommendation: </span>
                  <span className="font-bold text-indigo-700 capitalize">
                    {dx.recommendedAction.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => onTriggerAction(transaction.id, dx.recommendedAction)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs transition"
                >
                  Execute Recommendation
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              No AI diagnosis required for this transaction type ({transaction.status}).
            </div>
          )}

          {/* Module 4: Deterministic Guardrail Engine Evaluation */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">Deterministic Guardrail Engine Verification</h4>
              </div>
              <span className="text-[11px] text-slate-500">Pre-execution validation rules</span>
            </div>

            {/* List latest guardrail checks if actions exist */}
            {transaction.actions.length > 0 && transaction.actions[0].checks ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {transaction.actions[0].checks.map((check) => (
                  <div
                    key={check.id}
                    className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                      check.outcome === 'allow'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : check.outcome === 'hold'
                        ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                        : 'bg-rose-50/50 border-rose-200 text-rose-950'
                    }`}
                  >
                    {check.outcome === 'allow' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {check.outcome === 'hold' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                    {check.outcome === 'block' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-xs">{check.title}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-200">
                Guardrail checks run automatically when an action is opened or executed.
              </div>
            )}

            {/* Guardrail Violation Demonstration Button (for Hackathon showcase) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Try modifying transaction amount to test Guardrail Rule 1:
              </span>
              <button
                onClick={() => {
                  onTriggerAction(transaction.id, 'invoice', transaction.amount + 50);
                }}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded border border-rose-200 transition text-[11px]"
                title="Attempts to mutate amount by +$50; Guardrail will instantly block it!"
              >
                Test Amount Tampering (Expect Block)
              </button>
            </div>
          </div>

          {/* Module 3: Recovery Actions History & Dispatch Buttons */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Recovery Actions & Execution History</h4>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onTriggerAction(transaction.id, 'invoice')}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs border border-indigo-200 flex items-center gap-1"
                >
                  <Receipt className="w-3 h-3" />
                  Generate Invoice
                </button>
                <button
                  onClick={() => onOpenMessageModal(transaction)}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded text-xs border border-purple-200 flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  Compose Message
                </button>
                <button
                  onClick={() => onTriggerAction(transaction.id, 'schedule_retry')}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-xs border border-blue-200 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  Schedule Retry
                </button>
                <button
                  onClick={() => onTriggerAction(transaction.id, 'escalate_human')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded text-xs border border-amber-200 flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3" />
                  Escalate
                </button>
              </div>
            </div>

            {/* List of actions taken */}
            {transaction.actions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No recovery actions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {transaction.actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 capitalize">
                          {act.type.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            act.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : act.status === 'pending_approval' || act.status === 'escalated'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {act.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">Actor: {act.actor}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Idempotency Key: {act.idempotencyKey}
                      </p>
                      {act.result?.invoiceUrl && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-emerald-700 font-medium">Invoice link ready:</span>
                          <a
                            href={act.result.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            {act.result.invoiceUrl} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {act.error && (
                        <p className="text-rose-600 font-medium mt-1">Error: {act.error}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Messages History */}
          {transaction.messages.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Dispatched Customer Communications</h4>
              <div className="space-y-2">
                {transaction.messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{msg.subject}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {msg.channel}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Status: {msg.status}
                      </span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap text-[11px] bg-white p-2.5 rounded border border-slate-200 mt-2">
                      {msg.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

