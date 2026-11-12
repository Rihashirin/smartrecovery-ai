import test from "node:test";
import assert from "node:assert/strict";
import { buildSeed } from "../src/seed.js";
import { evaluateGuardrail } from "../src/guardrails.js";
import { containsSensitive } from "../src/messages.js";
import { handleWebhook, openAction, simulateCustomerPaid, simulateScenario } from "../src/pipeline.js";

test("seed keeps refunds out of the failure diagnoses", () => {
  const state = buildSeed();
  const refund = state.transactions.find((t) => t.displayId === "TXN-10029");
  assert.equal(refund.status, "refunded");
  assert.equal(state.diagnoses.some((d) => d.transactionId === refund.id), false);
  const showcase = state.transactions.find((t) => t.displayId === "TXN-10022");
  const diagnosis = state.diagnoses.find((d) => d.transactionId === showcase.id);
  assert.equal(diagnosis.category, "issuer_decline");
  assert.ok(diagnosis.verifiedFacts.length > 0);
  assert.ok(diagnosis.hypotheses.length > 0);
});

test("high-value recommendation is held instead of sent", () => {
  const state = buildSeed();
  const lena = state.transactions.find((t) => t.displayId === "TXN-10035");
  const action = state.actions.find((a) => a.transactionId === lena.id);
  assert.equal(action.status, "pending_approval");
  assert.equal(action.type, "send_recovery_message");
  assert.ok(state.reviews.some((r) => r.transactionId === lena.id && r.status === "open"));
});

test("declined simulation diagnoses and sends a safe message", async () => {
  const state = buildSeed();
  const result = await simulateScenario(state, "declined");
  const txn = state.transactions.find((t) => t.id === result.transactionId);
  assert.equal(txn.amount, 120);
  assert.equal(txn.status, "failed");
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  assert.equal(diagnosis.recommendedAction, "send_recovery_message");
  assert.equal(diagnosis.uncertainty, "low");
  const action = state.actions.find((a) => a.transactionId === txn.id && a.type === "send_recovery_message");
  assert.equal(action.status, "completed");
  assert.equal(state.messages.some((m) => m.transactionId === txn.id && m.status === "sent"), true);
});

test("idempotency blocks a second invoice", async () => {
  const state = buildSeed();
  const elena = state.transactions.find((t) => t.displayId === "TXN-10026");
  const result = await openAction(state, elena, null, "generate_invoice", { actor: "Avery Quinn" });
  assert.equal(result.duplicate, true);
});

test("guardrail rejects a mutated amount and card data", () => {
  const state = buildSeed();
  const txn = state.transactions.find((t) => t.displayId === "TXN-10022");
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  const decision = evaluateGuardrail(state, txn, diagnosis, "generate_invoice", { requestedAmount: 20 });
  assert.equal(decision.blocked, true);
  assert.match(containsSensitive("my card is 4242424242424242"), /card number/i);
});

test("repeated failures are escalated and never charged", async () => {
  const state = buildSeed();
  const result = await simulateScenario(state, "repeated");
  const txn = state.transactions.find((t) => t.id === result.transactionId);
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  assert.equal(diagnosis.recommendedAction, "escalate_human");
  assert.equal(diagnosis.riskLevel, "high");
  const action = state.actions.find((a) => a.transactionId === txn.id && a.type === "escalate_human");
  assert.equal(action.status, "escalated");
  assert.equal(state.messages.some((m) => m.transactionId === txn.id), false);
});

test("recovery webhook refuses a different amount", async () => {
  const state = buildSeed();
  const txn = state.transactions.find((t) => t.displayId === "TXN-10022");
  await assert.rejects(
    () => handleWebhook(state, {
      _simulation: true,
      _linkTransactionId: txn.id,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAP-BAD", custom_id: txn.id, amount: { currency_code: "USD", value: "10.00" } },
    }, { "x-smartrecovery-simulation": "1" }),
    /does not match/,
  );
  assert.equal(txn.status, "failed");
  assert.equal(txn.amount, 120);
});

test("matching capture marks the original amount recovered", async () => {
  const state = buildSeed();
  const txn = state.transactions.find((t) => t.displayId === "TXN-10022");
  await simulateCustomerPaid(state, txn.id);
  assert.equal(txn.status, "recovered");
  assert.equal(txn.recoveredAmount, 120);
});
