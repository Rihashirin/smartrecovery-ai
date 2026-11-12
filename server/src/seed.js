import { audit, uid } from "./ids.js";
import { composeDiagnosis } from "./diagnose.js";
import { evaluateGuardrail } from "./guardrails.js";

const iso = (monthsAgo, day, hour = 11, minute = 20) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(Math.min(day, 28));
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const daysAgo = (days, hour = 10, minute = 15) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

export function buildSeed() {
  const state = {
    seq: 10040,
    currentUser: {
      id: "usr_avery",
      name: "Avery Quinn",
      email: "avery@northwind.demo",
      role: "admin",
    },
    settings: {
      merchantName: "Northwind Commerce",
      supportEmail: "recover@northwind.demo",
      uncapturedThresholdMinutes: 30,
      highValueApprovalAmount: 500,
      repeatFailureThreshold: 3,
      autoExecuteSafeActions: true,
    },
    customers: [
      customer("cus_alex", "Alex Rivera", "alex.rivera@northwind.io", "Rivera Studio", "PAYER-ALEX", 24, "Retail"),
      customer("cus_priya", "Priya Shah", "priya.shah@lumenlabs.com", "Lumen Labs", "PAYER-PRIYA", 46, "SaaS"),
      customer("cus_jordan", "Jordan Blake", "jordan@atlasretail.co", "Atlas Retail", "PAYER-JORDAN", 58, "Retail"),
      customer("cus_mei", "Mei Chen", "mei.chen@harborgoods.com", "Harbor Goods", "PAYER-MEI", 16, "Wholesale"),
      customer("cus_sam", "Sam Okonkwo", "sam@brightpath.app", "Brightpath", "PAYER-SAM", 64, "Subscription"),
      customer("cus_elena", "Elena Rossi", "elena@verdehome.eu", "Verde Home", "PAYER-ELENA", 18, "Retail"),
      customer("cus_noah", "Noah Patel", "noah@kitecommerce.com", "Kite Commerce", "PAYER-NOAH", 70, "Marketplace"),
      customer("cus_harper", "Harper Quinn", "harper@studioform.co", "Studio Form", "PAYER-HARPER", 32, "Retail"),
      customer("cus_owen", "Owen Brooks", "owen@fieldnote.shop", "Fieldnote", "PAYER-OWEN", 12, "Retail"),
      customer("cus_lena", "Lena Ortiz", "lena.ortiz@paperandpine.co", "Paper & Pine", "PAYER-LENA", 40, "Wholesale"),
    ],
    transactions: [],
    paymentEvents: [],
    diagnoses: [],
    actions: [],
    messages: [],
    reviews: [],
    auditLogs: [],
  };

  const heroes = [
    spec("TXN-10011", "cus_sam", 80, "failed", "PAYMENT.CAPTURE.DENIED", "INSTRUMENT_DECLINED", iso(1, 9, 14), { attempt: "Failure 1 of 3" }),
    spec("TXN-10016", "cus_sam", 80, "failed", "PAYMENT.CAPTURE.DENIED", "PAYER_CANNOT_PAY", iso(0, 22, 16), { attempt: "Failure 2 of 3" }),
    spec("TXN-10021", "cus_alex", 89, "completed", "PAYMENT.CAPTURE.COMPLETED", null, daysAgo(2, 11, 5)),
    spec("TXN-10026", "cus_elena", 75, "recovered", "PAYMENT.CAPTURE.DENIED", "INSTRUMENT_DECLINED", daysAgo(6, 13, 40), { recoveredAt: daysAgo(4, 9, 10) }),
    spec("TXN-10029", "cus_alex", 18, "refunded", "PAYMENT.CAPTURE.REFUNDED", null, daysAgo(3, 15, 45), { reason: "Customer requested a refund" }),
    spec("TXN-10032", "cus_owen", 64, "completed", "PAYMENT.CAPTURE.COMPLETED", null, daysAgo(1, 17, 25)),
    spec("TXN-10022", "cus_priya", 120, "failed", "PAYMENT.CAPTURE.DENIED", "INSTRUMENT_DECLINED", daysAgo(0, 9, 40)),
    spec("TXN-10023", "cus_jordan", 49, "failed", "BILLING.SUBSCRIPTION.PAYMENT.FAILED", "PAYER_CANNOT_PAY", daysAgo(1, 8, 10), { subscriptionId: "I-ATLAS49" }),
    spec("TXN-10024", "cus_mei", 240, "approved_uncaptured", "CHECKOUT.ORDER.APPROVED", null, daysAgo(0, 8, 5), { approvedAt: minutesAgo(190) }),
    spec("TXN-10025", "cus_sam", 310, "failed", "PAYMENT.CAPTURE.DENIED", "PAYER_CANNOT_PAY", daysAgo(0, 11, 20), { attempt: "Failure 3 of 3" }),
    spec("TXN-10027", "cus_noah", 560, "failed", "PAYMENT.CAPTURE.DENIED", "COMPLIANCE_VIOLATION", daysAgo(0, 7, 50)),
    spec("TXN-10028", "cus_harper", 42, "failed", "PAYMENT.CAPTURE.DENIED", "INSTRUMENT_DECLINED", daysAgo(1, 18, 5)),
    spec("TXN-10030", "cus_priya", 95, "failed", "PAYMENT.CAPTURE.DENIED", "PAYER_CANNOT_PAY", daysAgo(0, 6, 30)),
    spec("TXN-10031", "cus_jordan", 890, "failed", "PAYMENT.CAPTURE.DENIED", null, daysAgo(2, 19, 15), { reason: "PayPal refused the payment without a reason code" }),
    spec("TXN-10035", "cus_lena", 640, "failed", "PAYMENT.CAPTURE.DENIED", "INSTRUMENT_DECLINED", daysAgo(0, 10, 5)),
    spec("TXN-10036", "cus_owen", 150, "approved", "CHECKOUT.ORDER.APPROVED", null, minutesAgo(8), { approvedAt: minutesAgo(8), pipelineRan: false }),
  ];

  heroes.forEach((item) => state.transactions.push(item));

  const historicalCustomers = ["cus_alex", "cus_mei", "cus_elena", "cus_owen"];
  const recovered = [
    [5, 4, 220], [5, 18, 180], [4, 2, 410], [4, 21, 95], [3, 5, 640], [3, 19, 150],
    [3, 26, 740], [2, 1, 88], [2, 14, 320], [2, 28, 275], [1, 4, 190], [1, 12, 510],
    [1, 20, 130], [1, 27, 260],
  ];
  const stillFailed = [
    [5, 12, 340, "INSTRUMENT_DECLINED"],
    [4, 9, 125, "PAYER_CANNOT_PAY"],
    [3, 11, 480, "INSTRUMENT_DECLINED"],
    [2, 9, 210, "PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED"],
    [1, 8, 390, "INSTRUMENT_DECLINED"],
    [0, 2, 295, "PAYER_CANNOT_PAY"],
  ];
  const successes = [
    [5, 8, 54], [4, 15, 128], [3, 9, 76], [2, 18, 210], [1, 16, 96], [0, 4, 44],
  ];

  recovered.forEach(([months, day, amount], index) => {
    state.transactions.push(spec(
      `TXN-80${String(index + 1).padStart(2, "0")}`,
      historicalCustomers[index % historicalCustomers.length],
      amount,
      "recovered",
      "PAYMENT.CAPTURE.DENIED",
      index % 2 === 0 ? "INSTRUMENT_DECLINED" : "PAYER_CANNOT_PAY",
      iso(months, day, 12, 10),
      { recoveredAt: iso(months, Math.min(day + 2, 28), 15, 0) },
    ));
  });
  stillFailed.forEach(([months, day, amount, code], index) => {
    state.transactions.push(spec(
      `TXN-70${index + 1}`,
      historicalCustomers[index % historicalCustomers.length],
      amount,
      "failed",
      "PAYMENT.CAPTURE.DENIED",
      code,
      iso(months, day, 9, 45),
    ));
  });
  successes.forEach(([months, day, amount], index) => {
    state.transactions.push(spec(
      `TXN-60${index + 1}`,
      historicalCustomers[(index + 1) % historicalCustomers.length],
      amount,
      "completed",
      "PAYMENT.CAPTURE.COMPLETED",
      null,
      iso(months, day, 15, 5),
    ));
  });

  const diagnosable = state.transactions
    .filter((t) => ["failed", "recovered", "approved_uncaptured"].includes(t.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  for (const txn of diagnosable) {
    const diagnosis = composeDiagnosis(state, txn);
    if (diagnosis) {
      diagnosis.createdAt = txn.createdAt;
      state.diagnoses.push(diagnosis);
    }
  }

  storyActions(state);
  state.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.diagnoses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.auditLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return state;
}

function storyActions(state) {
  const byDisplay = Object.fromEntries(state.transactions.map((t) => [t.displayId, t]));
  const dx = (txn) => state.diagnoses.find((d) => d.transactionId === txn.id);

  const priya = byDisplay["TXN-10022"];
  recordExecuted(state, priya, "send_recovery_message", {
    result: { channel: "email" },
    message: true,
  });

  const jordanSub = byDisplay["TXN-10023"];
  const retry = new Date();
  retry.setDate(retry.getDate() + 1);
  retry.setHours(9, 30, 0, 0);
  jordanSub.retryAt = retry.toISOString();
  recordExecuted(state, jordanSub, "schedule_retry", {
    result: {
      retryAt: jordanSub.retryAt,
      reason: "Subscription renewals are usually retried the next morning. No charge was created.",
    },
  });

  const mei = byDisplay["TXN-10024"];
  recordExecuted(state, mei, "send_reminder", { message: true });
  recordExecuted(state, mei, "recommend_capture", {
    result: {
      captureCalled: false,
      orderId: mei.orderId,
      amount: mei.amount,
      note: "Capture was not executed. An operator can capture the existing authorization in PayPal for the original amount.",
    },
  });

  const sam = byDisplay["TXN-10025"];
  recordEscalation(state, sam, "repeated_failure", "Repeated payment failure");
  const noah = byDisplay["TXN-10027"];
  recordEscalation(state, noah, "suspicious", "Compliance-sensitive payment");
  const jordanHigh = byDisplay["TXN-10031"];
  recordEscalation(state, jordanHigh, "uncertain_diagnosis", "Uncertain AI diagnosis");

  const lena = byDisplay["TXN-10035"];
  const lenaDecision = evaluateGuardrail(state, lena, dx(lena), "send_recovery_message");
  pushAction(state, lena, {
    type: "send_recovery_message",
    status: "pending_approval",
    requiresApproval: true,
    checks: lenaDecision.checks,
    idempotencyKey: lenaDecision.idempotencyKey,
  });
  pushReview(state, lena, "high_risk", "High-value transaction");

  const harper = byDisplay["TXN-10028"];
  const harperDecision = evaluateGuardrail(state, harper, dx(harper), "send_recovery_message");
  pushAction(state, harper, {
    type: "send_recovery_message",
    status: "failed",
    checks: harperDecision.checks,
    idempotencyKey: harperDecision.idempotencyKey,
    error: "Mailbox provider timed out (simulated).",
    result: null,
  });
  state.messages.unshift(message(harper, dx(harper), "failed", "Mailbox provider timed out (simulated)."));
  pushReview(state, harper, "failed_recovery", "Failed recovery attempt");

  const elena = byDisplay["TXN-10026"];
  recordExecuted(state, elena, "generate_invoice", {
    result: {
      mode: "simulation",
      invoiceId: "INV-SIM-TXN-10026",
      status: "PAID",
      amount: elena.amount,
      currency: "USD",
      url: "https://www.sandbox.paypal.com/invoice/s/pay/INV-SIM-TXN-10026",
      note: "Customer paid the simulated invoice for the original amount.",
    },
  });
  elena.invoice = {
    mode: "simulation",
    invoiceId: "INV-SIM-TXN-10026",
    status: "PAID",
    amount: elena.amount,
    currency: "USD",
    url: "https://www.sandbox.paypal.com/invoice/s/pay/INV-SIM-TXN-10026",
  };

  const priyaRetry = byDisplay["TXN-10030"];
  const payday = new Date();
  if (payday.getDate() < 14) payday.setDate(15);
  else {
    payday.setMonth(payday.getMonth() + 1);
    payday.setDate(1);
  }
  payday.setHours(10, 0, 0, 0);
  priyaRetry.retryAt = payday.toISOString();
  recordExecuted(state, priyaRetry, "schedule_retry", {
    result: {
      retryAt: priyaRetry.retryAt,
      reason: "Funding-related declines are often retried around a payday. No payment was attempted.",
    },
  });

  for (const txn of state.transactions) {
    if (!txn.displayId.startsWith("TXN-80") && !txn.displayId.startsWith("TXN-70")) continue;
    const diagnosis = dx(txn);
    if (!diagnosis) continue;
    if (txn.status === "recovered") {
      recordExecuted(state, txn, diagnosis.recommendedAction === "escalate_human" ? "generate_invoice" : diagnosis.recommendedAction, {
        result: { note: "Historical recovery completed for the original amount." },
        quiet: true,
      });
    } else if (txn.amount > 300) {
      recordExecuted(state, txn, "send_recovery_message", { message: true, quiet: true });
    }
  }

  for (const txn of state.transactions) {
    if (!state.paymentEvents.some((item) => item.transactionId === txn.id)) {
      state.paymentEvents.unshift(event(txn, txn.eventType));
    }
  }

  audit(state, {
    actor: "Monitoring Agent",
    action: "workspace_ready",
    entityType: "settings",
    entityId: "workspace",
    decision: "info",
    details: "Demo ledger loaded. PayPal webhooks are simulated until sandbox credentials are added. Refunds are excluded from failure totals.",
  });
}

function recordExecuted(state, txn, type, extras) {
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  const decision = evaluateGuardrail(state, txn, diagnosis, type);
  if (decision.blocked || decision.requiresApproval) return;
  const action = pushAction(state, txn, {
    type,
    status: "completed",
    checks: decision.checks,
    idempotencyKey: decision.idempotencyKey,
    result: extras.result || { ok: true },
  });
  if (extras.message) state.messages.unshift(message(txn, diagnosis, "sent", "Delivered by the simulated email channel."));
  if (!extras.quiet) {
    audit(state, {
      actor: "Recovery Agent",
      action: "action_completed",
      entityType: "recovery_action",
      entityId: action.id,
      decision: "allow",
      details: `${type} completed for ${txn.displayId}. Amount stayed ${txn.amount} ${txn.currency}.`,
    });
  }
  state.paymentEvents.unshift(event(txn, txn.eventType));
}

function recordEscalation(state, txn, reason, reasonLabel) {
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  const decision = evaluateGuardrail(state, txn, diagnosis, "escalate_human");
  const action = pushAction(state, txn, {
    type: "escalate_human",
    status: "escalated",
    checks: decision.checks,
    idempotencyKey: decision.idempotencyKey,
    result: { customerContacted: false },
  });
  pushReview(state, txn, reason, reasonLabel, action.id);
  audit(state, {
    actor: "Guardrail Engine",
    action: "escalated_for_review",
    entityType: "human_review",
    entityId: txn.id,
    decision: "hold",
    details: `${txn.displayId} is in human review (${reasonLabel}). No customer charge was created.`,
  });
  state.paymentEvents.unshift(event(txn, txn.eventType));
}

function pushAction(state, txn, partial) {
  const now = txn.updatedAt || txn.createdAt;
  const action = {
    id: uid("act"),
    transactionId: txn.id,
    type: partial.type,
    status: partial.status,
    idempotencyKey: partial.idempotencyKey,
    requiresApproval: Boolean(partial.requiresApproval),
    checks: partial.checks,
    result: partial.result || null,
    error: partial.error || null,
    actor: partial.status === "pending_approval" ? "Guardrail Engine" : "Recovery Agent",
    automatic: true,
    createdAt: now,
    updatedAt: now,
    completedAt: ["completed", "failed", "escalated"].includes(partial.status) ? now : null,
  };
  state.actions.unshift(action);
  return action;
}

function pushReview(state, txn, reason, reasonLabel, actionId) {
  const action = actionId || state.actions.find((a) => a.transactionId === txn.id)?.id;
  state.reviews.unshift({
    id: uid("rev"),
    transactionId: txn.id,
    actionId: action,
    reason,
    reasonLabel,
    status: "open",
    notes: [],
    createdAt: txn.createdAt,
    resolvedAt: null,
  });
}

function message(txn, diagnosis, status, detail) {
  return {
    id: uid("msg"),
    transactionId: txn.id,
    customerId: txn.customerId,
    actionId: null,
    channel: "email",
    subject: `Northwind Commerce: complete your $${Number(txn.amount).toFixed(2)} payment`,
    body: diagnosis?.suggestedMessage || "Please review your payment.",
    status,
    deliveryDetail: detail,
    aiGenerated: true,
    createdAt: txn.createdAt,
    sentAt: status === "sent" ? txn.createdAt : null,
  };
}

function event(txn, eventType) {
  return {
    id: uid("evt"),
    transactionId: txn.id,
    eventType,
    payload: { event_type: eventType, simulation: true, displayId: txn.displayId },
    signatureStatus: "simulated",
    receivedAt: txn.createdAt,
  };
}

function customer(id, name, email, company, paypalPayerId, riskScore, segment) {
  return { id, name, email, company, paypalPayerId, riskScore, segment, createdAt: iso(8, 2, 9, 0) };
}

function spec(displayId, customerId, amount, status, eventType, failureCode, createdAt, extra = {}) {
  return {
    id: `txn_${displayId.toLowerCase().replace("-", "_")}`,
    displayId,
    customerId,
    amount,
    currency: "USD",
    status,
    eventType,
    failureCode,
    failureReason: extra.reason || failureCode,
    paymentMethod: eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ? "PayPal subscription" : "PayPal",
    subscriptionId: extra.subscriptionId || null,
    orderId: `ORDER-${displayId}`,
    captureId: eventType.includes("CAPTURE") ? `CAP-${displayId}` : null,
    recoveredAmount: status === "recovered" ? amount : 0,
    recoveredAt: extra.recoveredAt || null,
    approvedAt: extra.approvedAt || null,
    retryAt: null,
    pipelineRan: extra.pipelineRan !== undefined ? extra.pipelineRan : status !== "approved",
    invoice: null,
    attemptLabel: extra.attempt || null,
    createdAt,
    updatedAt: extra.recoveredAt || createdAt,
  };
}
