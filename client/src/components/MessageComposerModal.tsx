import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Transaction } from '../types';

interface MessageComposerModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: (txnId: string, body: string) => void;
  onSendMessage: (msgId: string) => void;
  onTriggerMessageAction: (txnId: string) => void;
}

export const MessageComposerModal: React.FC<MessageComposerModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSaveDraft,
  onSendMessage,
  onTriggerMessageAction,
}) => {
  if (!isOpen || !transaction) return null;

  const existingMsg = transaction.messages[0];
  const defaultBody =
    existingMsg?.body ||
    transaction.diagnosis?.suggestedMessage ||
    `Hi ${transaction.customer?.name || 'Customer'},\n\nWe noticed that your recent PayPal payment of $${transaction.amount.toFixed(
      2
    )} could not be completed. You can securely review your payment method and complete your purchase using the link below:\n\nhttps://paypal.com/invoice/p2p/preview\n\nPlease let us know if you have any questions or need assistance.\n\nWarm regards,\nSupport Team`;

  const [body, setBody] = useState(defaultBody);
  const [sensitiveWarning, setSensitiveWarning] = useState<string | null>(null);

  useEffect(() => {
    // Client-side guardrail preview check
    const cardPattern = /\b(?:\d[ -]*?){13,16}\b/;
    const cvvPattern = /\b\d{3,4}\b/;
    if (cardPattern.test(body) && body.toLowerCase().includes('card')) {
      setSensitiveWarning('Guardrail Violation Alert: Detected card numbers. Never expose sensitive card numbers in recovery messages.');
    } else {
      setSensitiveWarning(null);
    }
  }, [body]);

  const handleSend = () => {
    if (existingMsg) {
      onSendMessage(existingMsg.id);
      onClose();
    } else {
      onTriggerMessageAction(transaction.id);
      onClose();
    }
  };

  const handleSave = () => {
    onSaveDraft(transaction.id, body);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Customer Communication Agent</h3>
                <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  AI Generated
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Personalized win-back email for {transaction.displayId} (${transaction.amount.toFixed(2)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 flex-1">
          {/* Recipient Details */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400">Recipient:</span>
              <p className="font-bold text-slate-800">{transaction.customer?.name}</p>
              <p className="text-slate-500 text-[11px]">{transaction.customer?.email}</p>
            </div>
            <div>
              <span className="text-slate-400">Subject:</span>
              <p className="font-bold text-slate-800 truncate">
                {existingMsg?.subject || `Action Required: Resolving your payment for $${transaction.amount.toFixed(2)}`}
              </p>
              <p className="text-[11px] text-indigo-600 font-semibold">Delivery channel: Email (Simulated)</p>
            </div>
          </div>

          {/* Sensitive Data Guardrail Alert if triggered */}
          {sensitiveWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{sensitiveWarning}</span>
            </div>
          )}

          {/* Editable Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Message Content:
              </label>
              <span className="text-[11px] text-slate-400">Editable before dispatch</span>
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 leading-relaxed outline-none focus:border-purple-500 font-sans"
            />
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Deterministic Guardrail 5: Card PANs, CVVs, and passwords are unconditionally stripped.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition"
            >
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={Boolean(sensitiveWarning)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Recovery Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

