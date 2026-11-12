import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { AppState, Transaction, ActionType, Settings } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { TransactionsView } from './components/TransactionsView';
import { AIDiagnosticsView } from './components/AIDiagnosticsView';
import { RecoveryActionsView } from './components/RecoveryActionsView';
import { CustomersView } from './components/CustomersView';
import { AnalyticsView } from './components/AnalyticsView';
import { HumanReviewView } from './components/HumanReviewView';
import { SettingsView } from './components/SettingsView';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { SimulateModal } from './components/SimulateModal';
import { MessageComposerModal } from './components/MessageComposerModal';
import { Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & search navigation
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [messageModalTxn, setMessageModalTxn] = useState<Transaction | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);

  // Async indicators
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Fetch initial state
  const loadState = useCallback(async () => {
    try {
      const data = await api.getState();
      setState(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to SmartRecovery API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Keep selectedTransaction in sync with state updates
  useEffect(() => {
    if (selectedTransaction && state) {
      const updated = state.transactions.find((t) => t.id === selectedTransaction.id);
      if (updated) setSelectedTransaction(updated);
    }
    if (messageModalTxn && state) {
      const updated = state.transactions.find((t) => t.id === messageModalTxn.id);
      if (updated) setMessageModalTxn(updated);
    }
  }, [state]);

  // Handler: Trigger Recovery Action
  const handleTriggerAction = async (txnId: string, type: ActionType, requestedAmount?: number) => {
    try {
      const newState = await api.triggerAction(txnId, type, requestedAmount);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  // Handler: Simulate Customer Paid (Instant Recovery Demo)
  const handleSimulateRecovered = async (txnId: string) => {
    try {
      const newState = await api.markRecovered(txnId);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to mark recovered');
    }
  };

  // Handler: Simulate PayPal Webhook Scenario
  const handleSimulateScenario = async (scenario: 'declined' | 'subscription' | 'uncaptured' | 'repeated') => {
    try {
      setIsSimulating(true);
      const newState = await api.simulateScenario(scenario);
      setState(newState);
      setIsSimulateOpen(false);
      // Auto switch to transactions tab or focus
      if (newState.notice?.focusId) {
        const found = newState.transactions.find((t) => t.id === newState.notice?.focusId);
        if (found) setSelectedTransaction(found);
      }
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Handler: Save Message Draft
  const handleSaveDraft = async (txnId: string, body: string) => {
    try {
      const newState = await api.saveDraft(txnId, body);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to save draft');
    }
  };

  // Handler: Send Message
  const handleSendMessage = async (msgId: string) => {
    try {
      const newState = await api.sendMessage(msgId);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  // Handler: Human Review Decision
  const handleSubmitReviewDecision = async (
    reviewId: string,
    decision: 'approve' | 'reject' | 'resolve',
    note?: string
  ) => {
    try {
      const newState = await api.submitReviewDecision(reviewId, decision, note);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Decision failed');
    }
  };

  // Handler: Add Review Note
  const handleAddReviewNote = async (reviewId: string, note: string) => {
    try {
      const newState = await api.addReviewNote(reviewId, note);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  // Handler: Save Settings
  const handleSaveSettings = async (settings: Partial<Settings>) => {
    try {
      setIsSavingSettings(true);
      const newState = await api.updateSettings(settings);
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handler: Reset Demo Ledger
  const handleResetDemo = async () => {
    if (!window.confirm('Reset the demo ledger back to the original seed state?')) return;
    try {
      setIsResetting(true);
      const newState = await api.resetDemo();
      setState(newState);
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo');
    } finally {
      setIsResetting(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Starting SmartRecovery AI...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to payment telemetry and autonomous agent pipeline</p>
      </div>
    );
  }

  // Error Screen
  if (error || !state) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold">Connection Error</h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">
          {error || 'Unable to load application state.'}
        </p>
        <button
          onClick={loadState}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs rounded-xl transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Page title mapping
  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Command Center',
      subtitle: `Autonomous revenue recovery dashboard for ${state.settings.merchantName}`,
    },
    transactions: {
      title: 'Payment Transactions',
      subtitle: 'Complete event log across captured, declined, uncaptured, and restored payments',
    },
    diagnostics: {
      title: 'AI Diagnostics Hub',
      subtitle: 'Root-cause analysis, probability forecasting, and verified vs hypothetical insights',
    },
    actions: {
      title: 'Recovery Actions',
      subtitle: 'Audit trail of autonomous invoices, schedules, emails, and idempotency guarantees',
    },
    customers: {
      title: 'Customers & Accounts',
      subtitle: 'Customer segment performance, reliability metrics, and risk assessment',
    },
    analytics: {
      title: 'Analytics & Revenue Reports',
      subtitle: 'Financial recovery tracking, win rates, and payment failure trends',
    },
    reviews: {
      title: 'Human Review Center',
      subtitle: 'High-risk case governance, operator sign-offs, and compliance escalations',
    },
    settings: {
      title: 'Settings & Integrations',
      subtitle: 'Fine-tune guardrail thresholds, merchant details, and PayPal sandbox configurations',
    },
  };

  const currentHeaderInfo = titles[currentTab] || titles.overview;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        state={state}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          title={currentHeaderInfo.title}
          subtitle={currentHeaderInfo.subtitle}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notice={state.notice}
          onDismissNotice={() => setState({ ...state, notice: null })}
          onOpenSimulate={() => setIsSimulateOpen(true)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-8">
          {currentTab === 'overview' && (
            <OverviewView
              state={state}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              onTriggerAction={handleTriggerAction}
              onSimulateRecovered={handleSimulateRecovered}
              onOpenSimulate={() => setIsSimulateOpen(true)}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              state={state}
              searchQuery={searchQuery}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onTriggerAction={handleTriggerAction}
              onSimulateRecovered={handleSimulateRecovered}
              onOpenMessageModal={(txn) => setMessageModalTxn(txn)}
            />
          )}

          {currentTab === 'diagnostics' && (
            <AIDiagnosticsView
              state={state}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onTriggerAction={handleTriggerAction}
            />
          )}

          {currentTab === 'actions' && (
            <RecoveryActionsView
              state={state}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onSimulateRecovered={handleSimulateRecovered}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              state={state}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'analytics' && <AnalyticsView state={state} />}

          {currentTab === 'reviews' && (
            <HumanReviewView
              state={state}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onSubmitDecision={handleSubmitReviewDecision}
              onAddNote={handleAddReviewNote}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              state={state}
              onSaveSettings={handleSaveSettings}
              onResetDemo={handleResetDemo}
              isSaving={isSavingSettings}
              isResetting={isResetting}
            />
          )}
        </main>
      </div>

      {/* Transaction Detail Modal / Drawer */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onTriggerAction={handleTriggerAction}
        onSimulateRecovered={handleSimulateRecovered}
        onOpenMessageModal={(txn) => setMessageModalTxn(txn)}
      />

      {/* Simulate Payment Failure Modal */}
      <SimulateModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulateScenario}
        isSimulating={isSimulating}
      />

      {/* Message Composer & Preview Modal */}
      <MessageComposerModal
        transaction={messageModalTxn}
        isOpen={Boolean(messageModalTxn)}
        onClose={() => setMessageModalTxn(null)}
        onSaveDraft={handleSaveDraft}
        onSendMessage={handleSendMessage}
        onTriggerMessageAction={(txnId) => handleTriggerAction(txnId, 'message')}
      />
    </div>
  );
};
export default App;

