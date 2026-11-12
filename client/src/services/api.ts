import { AppState, ActionType } from '../types';

export const api = {
  async getState(): Promise<AppState> {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('Failed to load state');
    return res.json();
  },

  async simulateScenario(scenario: 'declined' | 'subscription' | 'uncaptured' | 'repeated'): Promise<AppState> {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to simulate scenario' }));
      throw new Error(err.error || 'Failed to simulate scenario');
    }
    return res.json();
  },

  async triggerAction(
    transactionId: string,
    type: ActionType,
    requestedAmount?: number
  ): Promise<AppState> {
    const res = await fetch(`/api/transactions/${transactionId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, requestedAmount }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      throw new Error(err.error || 'Action failed');
    }
    return res.json();
  },

  async markRecovered(transactionId: string): Promise<AppState> {
    const res = await fetch(`/api/transactions/${transactionId}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Recovery failed' }));
      throw new Error(err.error || 'Recovery failed');
    }
    return res.json();
  },

  async saveDraft(transactionId: string, body: string): Promise<AppState> {
    const res = await fetch(`/api/transactions/${transactionId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error('Failed to save message draft');
    return res.json();
  },

  async sendMessage(messageId: string): Promise<AppState> {
    const res = await fetch(`/api/messages/${messageId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async submitReviewDecision(
    reviewId: string,
    decision: 'approve' | 'reject' | 'resolve',
    note?: string
  ): Promise<AppState> {
    const res = await fetch(`/api/reviews/${reviewId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    });
    if (!res.ok) throw new Error('Failed to submit review decision');
    return res.json();
  },

  async addReviewNote(reviewId: string, note: string): Promise<AppState> {
    const res = await fetch(`/api/reviews/${reviewId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  async updateSettings(settings: Partial<AppState['settings']>): Promise<AppState> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async resetDemo(): Promise<AppState> {
    const res = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to reset demo');
    return res.json();
  },
};

