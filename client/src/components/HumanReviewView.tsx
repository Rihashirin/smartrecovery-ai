import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Send,
  ExternalLink,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AppState, HumanReview, Transaction } from '../types';

interface HumanReviewViewProps {
  state: AppState;
  onSelectTransaction: (txn: Transaction) => void;
  onSubmitDecision: (reviewId: string, decision: 'approve' | 'reject' | 'resolve', note?: string) => void;
  onAddNote: (reviewId: string, note: string) => void;
}

export const HumanReviewView: React.FC<HumanReviewViewProps> = ({
  state,
  onSelectTransaction,
  onSubmitDecision,
  onAddNote,
}) => {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(
    state.reviews.length > 0 ? state.reviews[0].id : null
  );
  const [noteText, setNoteText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('open');

  const filteredReviews = state.reviews.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const activeReview = state.reviews.find((r) => r.id === selectedReviewId) || filteredReviews[0] || null;

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !activeReview) return;
    onAddNote(activeReview.id, noteText.trim());
    setNoteText('');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              Module 06
            </span>
            <span className="text-xs text-slate-400">Human-In-The-Loop Governance</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Human Review Center</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Deterministic escalation queue for high-value orders ($500+), repeated payment failures, low diagnostic confidence, or compliance flags.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-navy-900/80 p-3 rounded-xl border border-navy-700/80">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <div className="text-xs">
            <p className="font-bold text-white">
              {state.reviews.filter((r) => r.status === 'open').length} Open Review Cases
            </p>
            <p className="text-[11px] text-slate-400">Operator approval required</p>
          </div>
        </div>
      </div>

      {/* Main Review Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Review Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filter Pills */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm flex items-center gap-1.5">
            {['open', 'approved', 'rejected', 'resolved', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition flex-1 text-center ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredReviews.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 text-xs">
                No review items matching this filter.
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const isSelected = activeReview?.id === rev.id;
                const txn = rev.transaction;
                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedReviewId(rev.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-white border-indigo-600 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        {txn?.displayId || 'TXN'}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rev.status === 'open'
                            ? 'bg-amber-100 text-amber-800'
                            : rev.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">{txn?.customer?.name || 'Customer'}</span>
                      <span className="text-xs font-bold text-slate-900">${txn?.amount.toFixed(2)}</span>
                    </div>

                    <div className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50 p-2 rounded border border-amber-200/60">
                      Reason: {rev.reasonLabel}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>{new Date(rev.createdAt).toLocaleTimeString()}</span>
                      <span>{rev.notes.length} internal notes</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Details & Decision Workspace */}
        <div className="lg:col-span-7">
          {activeReview ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Review Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-slate-900">
                      {activeReview.transaction?.displayId}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeReview.status === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {activeReview.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Escalated {new Date(activeReview.createdAt).toLocaleString()}
                  </p>
                </div>

                {activeReview.transaction && (
                  <button
                    onClick={() => onSelectTransaction(activeReview.transaction!)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                  >
                    View Transaction Profile <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Escalation Trigger Info */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Escalation Rule Triggered</span>
                </div>
                <p className="text-xs text-amber-800 font-semibold">{activeReview.reasonLabel}</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  The autonomous engine paused execution in compliance with Deterministic Guardrail Rule 3: High-risk, repeat failure, or high-value actions ($500+) must obtain human sign-off before charging or sending.
                </p>
              </div>

              {/* Transaction Summary Info */}
              {activeReview.transaction && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400">Customer:</span>
                    <p className="font-bold text-slate-900 truncate">{activeReview.transaction.customer?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{activeReview.transaction.customer?.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Amount:</span>
                    <p className="font-bold text-slate-900 text-base">${activeReview.transaction.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">AI Recommendation:</span>
                    <p className="font-bold text-indigo-600 capitalize">
                      {activeReview.transaction.diagnosis?.recommendedAction.replace('_', ' ') || 'None'}
                    </p>
                  </div>
                </div>
              )}

              {/* Decision Action Buttons */}
              {activeReview.status === 'open' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-900">Administrator Governance Decision:</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSubmitDecision(activeReview.id, 'approve')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Execute Action
                    </button>
                    <button
                      onClick={() => onSubmitDecision(activeReview.id, 'reject')}
                      className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Action
                    </button>
                    <button
                      onClick={() => onSubmitDecision(activeReview.id, 'resolve')}
                      className="py-2 px-4 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  </div>
                </div>
              )}

              {/* Internal Notes Thread */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Internal Review Notes ({activeReview.notes.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeReview.notes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No notes added yet.</p>
                  ) : (
                    activeReview.notes.map((n) => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-800">{n.actor}</span>
                          <span className="text-slate-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-700">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleSendNote} className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an internal observation or audit note..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                  >
                    <Send className="w-3 h-3" /> Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select a review case from the left list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

