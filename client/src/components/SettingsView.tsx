import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AppState, Settings } from '../types';

interface SettingsViewProps {
  state: AppState;
  onSaveSettings: (settings: Partial<Settings>) => void;
  onResetDemo: () => void;
  isSaving: boolean;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onSaveSettings,
  onResetDemo,
  isSaving,
  isResetting,
}) => {
  const [formData, setFormData] = useState<Settings>({ ...state.settings });
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(state.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              Module 08
            </span>
            <span className="text-xs text-slate-400">Policy & Engine Parameters</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">System & Guardrail Settings</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Configure recovery thresholds, merchant branding, human escalation parameters, and PayPal API sandbox connections.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Merchant & Support Settings */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Merchant Identity & Communication
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Merchant Business Name</label>
              <input
                type="text"
                value={formData.merchantName}
                onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Used in customer recovery messages and invoices.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Support Email Address</label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Reply-to destination for customer inquiries.</span>
            </div>
          </div>
        </div>

        {/* Guardrail & Autonomous Policy Engine Settings */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Deterministic Guardrail Policies & Escalation Thresholds
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Uncaptured Timeout (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                value={formData.uncapturedThresholdMinutes}
                onChange={(e) => setFormData({ ...formData, uncapturedThresholdMinutes: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Orders staying approved beyond this enter recovery diagnosis.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                High-Value Approval Limit ($)
              </label>
              <input
                type="number"
                min="50"
                max="10000"
                value={formData.highValueApprovalAmount}
                onChange={(e) => setFormData({ ...formData, highValueApprovalAmount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Amounts at or above this are parked for human approval.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Repeat Failure Limit
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.repeatFailureThreshold}
                onChange={(e) => setFormData({ ...formData, repeatFailureThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Consecutive failures before automatic human escalation.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={formData.autoExecuteSafeActions}
                onChange={(e) => setFormData({ ...formData, autoExecuteSafeActions: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Automatically Execute Low-Risk Safe Actions
                </p>
                <p className="text-[11px] text-slate-500">
                  When enabled, verified low-risk recoveries (e.g. generating one-click PayPal invoices or scheduling retries) run autonomously without waiting for human clicks.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Integration Status & Webhook URL */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            Integration Connections
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  {state.integration.paypalSandbox ? "PayPal Developer Sandbox: Connected" : "PayPal Developer Sandbox"}
                </span>
                <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                  state.integration.paypalSandbox ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}>
                  {state.integration.paypalSandbox ? "Connected" : "Simulated Mode"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {state.integration.paypalSandbox
                  ? "Live sandbox Invoicing API v2 and webhook signature verification active."
                  : "Simulated mode creates realistic PayPal invoices and webhooks without requiring active API keys."}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  {state.integration.gemini ? "AI Engine: Gemini" : state.integration.openai ? "AI Engine: OpenAI" : "AI Engine: Policy Engine"}
                </span>
                <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                  state.integration.gemini || state.integration.openai ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700"
                }`}>
                  {state.integration.model}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {state.integration.gemini
                  ? "Connected to Google Gemini API for structured payment root-cause diagnosis."
                  : state.integration.openai
                  ? "Connected to OpenAI for live contextual message copywriting."
                  : "Zero external API latency; running on-device deterministic payment diagnosis logic."}
              </p>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">
              PayPal Webhook Listener URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={state.webhookUrl}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy URL
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-300 transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Ledger to Default Demo Data
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

