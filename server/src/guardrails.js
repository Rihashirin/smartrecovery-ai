import { containsSensitive } from "./messages.js";

export const ACTION_TYPES = [
  "generate_invoice",
  "send_recovery_message",
  "schedule_retry",
  "send_reminder",
  "escalate_human",
  "recommend_capture",
];

const CHARGE_TYPES = new Set(["capture", "charge", "sale", "refund", "update_amount", "create_order"]);

export function evaluateGuardrail(state, txn, diagnosis, actionType, extras = {}) {
  const checks = [];
  const block = (title, detail) => checks.push({ id: title.toLowerCase().replace(/\s+/g, "_"), title, outcome: "block", detail });
  const hold = (title, detail) => checks.push({ id: title.toLowerCase().replace(/\s+/g, "_"), title, outcome: "hold", detail });
  const pass = (title, detail) => checks.push({ id: title.toLowerCase().replace(/\s+/g, "_"), title, outcome: "pass", detail });

  if (!ACTION_TYPES.includes(actionType) || CHARGE_TYPES.has(actionType)) {
    block("Allowed actions only", `${actionType || "empty"} is not an action this agent is allowed to run.`);
  } else {
    pass("Allowed actions only", `${labelFor(actionType)} is on the recovery whitelist.`);
  }

  if (CHARGE_TYPES.has(actionType) || actionType === "capture_payment") {
    block("No unauthorized charges", "The agent cannot capture, charge, refund, or create a new PayPal order.");
  } else if (actionType === "recommend_capture") {
    pass("No unauthorized charges", "This only recommends a capture. The PayPal capture API is not called.");
  } else if (actionType === "generate_invoice") {
    pass("No unauthorized charges", "An invoice lets the customer pay the original amount. It does not capture the failed payment.");
  } else if (actionType === "schedule_retry") {
    pass("No unauthorized charges", "A retry time is recorded as a recommendation. No payment attempt is created.");
  } else {
    pass("No unauthorized charges", "This action does not create or modify a PayPal charge.");
  }

  const requested = extras.requestedAmount;
  if (requested != null && Number(requested).toFixed(2) !== Number(txn.amount).toFixed(2)) {
    block(
      "Amount is immutable",
      `Requested ${Number(requested).toFixed(2)} but the PayPal amount is ${Number(txn.amount).toFixed(2)}. The change was rejected.`,
    );
  } else {
    pass("Amount is immutable", `Amount stays ${Number(txn.amount).toFixed(2)} ${txn.currency}.`);
  }

  const sensitive = containsSensitive(extras.messageBody || "");
  if (sensitive) block("No sensitive payment data", sensitive);
  else pass("No sensitive payment data", "The payload does not contain card numbers, security codes, or secrets.");

  const key = extras.idempotencyKey || `act:${txn.id}:${actionType}`;
  const duplicate = state.actions.find(
    (a) =>
      a.idempotencyKey === key &&
      a.id !== extras.exceptActionId &&
      !["failed", "rejected"].includes(a.status),
  );
  if (duplicate) {
    block("Idempotency", `Key ${key} is already used by ${duplicate.id} (${duplicate.status}).`);
  } else {
    pass("Idempotency", `Key ${key} has not been used.`);
  }

  const highRisk = diagnosis?.riskLevel === "high";
  const uncertain = diagnosis?.uncertainty === "high";
  const highValue = txn.amount >= state.settings.highValueApprovalAmount;
  const needsHuman = highRisk || uncertain || highValue;

  if (actionType === "escalate_human") {
    pass("Human approval policy", "Escalation is the required path for sensitive cases. The customer is not contacted.");
  } else if (needsHuman) {
    const reasons = [
      highRisk ? "risk level is high" : null,
      uncertain ? "the diagnosis is uncertain" : null,
      highValue ? `amount is at or above ${state.settings.highValueApprovalAmount}` : null,
    ].filter(Boolean);
    hold("Human approval policy", `Autonomous execution is paused because ${reasons.join(" and ")}.`);
  } else {
    pass("Human approval policy", "Risk, uncertainty, and amount are inside the autonomous range.");
  }

  const blocked = checks.some((c) => c.outcome === "block");
  const held = checks.some((c) => c.outcome === "hold");
  return {
    permitted: !blocked && !held,
    blocked,
    requiresApproval: !blocked && held,
    checks,
    idempotencyKey: key,
  };
}

export function labelFor(type) {
  return {
    generate_invoice: "Generate invoice",
    send_recovery_message: "Send recovery message",
    schedule_retry: "Schedule retry",
    send_reminder: "Send reminder",
    escalate_human: "Escalate to human",
    recommend_capture: "Recommend capture",
  }[type] || type;
}

export function reviewReason(txn, diagnosis, decision) {
  const priorsNote = (diagnosis?.verifiedFacts || []).some((f) => f.includes("requires human review"));
  if (priorsNote) return { reason: "repeated_failure", reasonLabel: "Repeated payment failure" };
  if (diagnosis?.category === "compliance") {
    return { reason: "suspicious", reasonLabel: "Compliance-sensitive payment" };
  }
  if (diagnosis?.riskLevel === "high" && txn.amount >= 800) {
    return { reason: "suspicious", reasonLabel: "Suspicious payment activity" };
  }
  if (diagnosis?.uncertainty === "high") return { reason: "uncertain_diagnosis", reasonLabel: "Uncertain AI diagnosis" };
  if (diagnosis?.riskLevel === "high" || txn.amount >= 500) return { reason: "high_risk", reasonLabel: "High-risk transaction" };
  if (!decision.permitted && decision.requiresApproval) return { reason: "high_risk", reasonLabel: "Needs human approval" };
  return { reason: "failed_recovery", reasonLabel: "Needs human review" };
}
