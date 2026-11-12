import { integrationFlags } from "./openai.js";

export const RULES = [
  { id: "amount", title: "Amounts are immutable", detail: "A recovery action can never change the PayPal amount." },
  { id: "charge", title: "No unauthorized charges", detail: "The agent cannot capture, refund, or create a surprise payment." },
  { id: "risk", title: "High-risk work needs a person", detail: "High risk, high uncertainty, or a high-value amount is parked for review." },
  { id: "idempotency", title: "Duplicate actions are blocked", detail: "Each action type runs once per transaction unless the earlier attempt failed." },
  { id: "secrets", title: "Customer messages stay safe", detail: "Card numbers, security codes, and passwords are rejected." },
  { id: "webhook", title: "Webhook signatures are checked", detail: "Live PayPal webhooks are verified. Simulation events are labeled as simulated." },
];

export function buildView(state, notice = null) {
  const customers = state.customers.map((customer) => {
    const txns = state.transactions.filter((t) => t.customerId === customer.id);
    return {
      ...customer,
      transactionCount: txns.length,
      failedCount: txns.filter((t) => t.status === "failed").length,
      recoveredRevenue: txns.filter((t) => t.status === "recovered").reduce((sum, t) => sum + t.recoveredAmount, 0),
      openAmount: txns.filter((t) => t.status === "failed" || t.status === "approved_uncaptured").reduce((sum, t) => sum + t.amount, 0),
    };
  });
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const transactions = [...state.transactions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((txn) => ({
      ...txn,
      customer: customerMap[txn.customerId] || null,
      diagnosis: state.diagnoses.find((d) => d.transactionId === txn.id) || null,
      actions: state.actions.filter((a) => a.transactionId === txn.id),
      messages: state.messages.filter((m) => m.transactionId === txn.id),
      reviews: state.reviews.filter((r) => r.transactionId === txn.id),
      events: state.paymentEvents
        .filter((e) => e.transactionId === txn.id)
        .map((e) => ({ id: e.id, eventType: e.eventType, signatureStatus: e.signatureStatus, receivedAt: e.receivedAt })),
    }));

  return {
    notice,
    generatedAt: new Date().toISOString(),
    integration: integrationFlags(),
    settings: state.settings,
    currentUser: state.currentUser,
    rules: RULES,
    transactions,
    customers: customers.sort((a, b) => b.openAmount - a.openAmount),
    reviews: [...state.reviews]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((review) => ({
        ...review,
        transaction: transactions.find((t) => t.id === review.transactionId) || null,
      })),
    auditLogs: state.auditLogs.slice(0, 100),
    webhookUrl: "http://localhost:4000/api/webhooks/paypal",
  };
}
