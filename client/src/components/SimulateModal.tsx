import React, { useState } from 'react';
import {
  X,
  Zap,
  CreditCard,
  RefreshCw,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface SimulateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (scenario: 'declined' | 'subscription' | 'uncaptured' | 'repeated') => void;
  isSimulating: boolean;
}

export const SimulateModal: React.FC<SimulateModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
  isSimulating,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'declined' as const,
      title: '1. Card / Instrument Declined',
      event: 'PAYMENT.CAPTURE.DENIED',
      amount: '$120.00',
      description:
        'Customer credit card payment is declined by the issuer. AI detects INSTRUMENT_DECLINED, verifies facts, and issues a one-click backup PayPal invoice.',
      badge: 'Auto Recovery',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: CreditCard,
    },
    {
      id: 'subscription' as const,
      title: '2. Subscription Renewal Failed',
      event: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      amount: '$49.00 / mo',
      description:
        'Recurring SaaS subscription payment fails. AI analyzes renewal cycle and recommends scheduling an optimal retry on upcoming payday.',
      badge: 'Smart Retry',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: RefreshCw,
    },
    {
      id: 'uncaptured' as const,
      title: '3. Approved but Uncaptured Order',
      event: 'CHECKOUT.ORDER.APPROVED',
      amount: '$240.00',
      description:
        'Checkout was authorized by the customer, but merchant backend failed to capture within 30 minutes. AI alerts merchant to capture before authorization expires.',
      badge: 'Authorization Guard',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
    {
      id: 'repeated' as const,
      title: '4. Repeated Payment Failure (Escalation)',
      event: 'REPEATED_DENIAL (3x)',
      amount: '$310.00',
      description:
        'A customer encounters 3 consecutive payment failures. Deterministic Guardrail Rule 3 halts automated billing and routes the case directly to Human Review.',
      badge: 'Human Escalation',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Simulate Payment Failure Event</h3>
              <p className="text-xs text-slate-500">
                Trigger real-time PayPal webhook payloads into the SmartRecovery pipeline
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
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                onClick={() => !isSimulating && onSimulate(sc.id)}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-slate-50/80 cursor-pointer transition flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{sc.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sc.badgeColor}`}
                    >
                      {sc.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {sc.event}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{sc.amount}</span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{sc.description}</p>
                </div>

                <div className="self-center">
                  <button
                    disabled={isSimulating}
                    className="p-2 bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-500 rounded-lg transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Clicking any scenario sends a simulated PayPal webhook payload.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

