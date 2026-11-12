import { audit, uid } from "./ids.js";
import { findCustomer, findTxn } from "./store.js";
import { buildDiagnosis } from "./diagnose.js";
import { evaluateGuardrail, labelFor, reviewReason } from "./guardrails.js";
import { buildRecoveryMessage, messageSubject, recommendRetryAt, containsSensitive } from "./messages.js";
import { createInvoice, parsePaypalEvent, verifyWebhook } from "./paypal.js";

const NAMES = [
  ["Nina", "Vasquez", "Fieldnote"],
  ["Leo", "Martinez", "Kite Supply"],
  ["Aisha", "Khan", "Northline"],
  ["Jonah", "Adler", "Paper & Pine"],
  ["Sofia", "Nguyen", "Lumen Goods"],
  ["Mateo", "Silva", "Harbor Lane"],
  ["Amelia", "Brooks", "Studio North"],
  ["Priyanka", "Das", "Brightpath"],
];

export async function promoteUncaptured(state) {
  const minutes = state.settings.uncapturedThresholdMinutes;
  let changed = false;
  for (const txn of state.transactions) {
    if (txn.status !== "approved" || !txn.approvedAt || txn.pipelineRan) continue;
    const age = (Date.now() - new Date(txn.approvedAt).getTime()) / 60000;
    if (age < minutes) continue;
    txn.status = "approved_uncaptured";
    txn.updatedAt = new Date().toISOString();
    txn.failureReason = `Approved order was not captured within ${minutes} minutes.`;
    changed = true;
    audit(state, {
      actor: "Monitoring Agent",
      action: "uncaptured_threshold_crossed",
      entityType: "transaction",
      entityId: txn.id,
      decision: "info",
      details: `${txn.displayId} stayed approved for more than ${minutes} minutes. Diagnosis pipeline started. No capture was sent.`,
    });
    await runPipeline(state, txn.id);
  }
  return changed;
}

export async function runPipeline(state, txnId) {
  const txn = findTxn(state, txnId);
  if (!txn || txn.pipelineRan) return { skipped: true };
  txn.updatedAt = new Date().toISOString();

  audit(state, {
    actor: "Monitoring Agent",
    action: "event_classified",
    entityType: "transaction",
    entityId: txn.id,
    decision: "info",
    details: `${txn.displayId} classified as ${txn.eventType} · ${txn.status}.`,
  });

  if (txn.status === "approved") return { routed: "watching" };
  txn.pipelineRan = true;

  if (txn.status === "completed") return { routed: "completed" };
  if (txn.status === "refunded") {
    audit(state, {
      actor: "Monitoring Agent",
      action: "refund_excluded",
      entityType: "transaction",
      entityId: txn.id,
      decision: "info",
      details: `${txn.displayId} is a refund. Refunds are shown separately and are not treated as failed payments.`,
    });
    return { routed: "refund" };
  }

  const diagnosis = await buildDiagnosis(state, txn);
  if (!diagnosis) return { routed: "none" };
  state.diagnoses = state.diagnoses.filter((d) => d.transactionId !== txn.id);
  state.diagnoses.unshift(diagnosis);
  audit(state, {
    actor: "Diagnosis Agent",
    action: "diagnosis_created",
    entityType: "diagnosis",
    entityId: diagnosis.id,
    decision: "info",
    details: `${txn.displayId}: ${diagnosis.categoryLabel}. Risk ${diagnosis.riskLevel}. Uncertainty ${diagnosis.uncertainty}. Recommended ${labelFor(diagnosis.recommendedAction)}.`,
  });
  return openAction(state, txn, diagnosis, diagnosis.recommendedAction, { actor: "Recovery Agent", automatic: true });
}

export async function openAction(state, txnIdOrTxn, diagnosis, actionType, options = {}) {
  const txn = typeof txnIdOrTxn === "string" ? findTxn(state, txnIdOrTxn) : txnIdOrTxn;
  const dx = diagnosis || state.diagnoses.find((d) => d.transactionId === txn.id);
  const decision = evaluateGuardrail(state, txn, dx, actionType, options.extras || {});
  const action = {
    id: uid("act"),
    transactionId: txn.id,
    type: decision.actionType || actionType,
    status: "pending",
    idempotencyKey: decision.idempotencyKey,
    requiresApproval: decision.requiresApproval,
    checks: decision.checks,
    result: null,
    error: null,
    actor: options.actor || "Recovery Agent",
    automatic: Boolean(options.automatic),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  if (decision.blocked) {
    const idempotent = decision.checks.some((c) => c.id === "idempotency" && c.outcome === "block");
    if (idempotent) {
      const existing = state.actions.find((a) => a.idempotencyKey === decision.idempotencyKey);
      audit(state, {
        actor: "Guardrail Engine",
        action: "duplicate_blocked",
        entityType: "recovery_action",
        entityId: existing?.id || txn.id,
        decision: "block",
        details: `Duplicate ${labelFor(actionType)} blocked for ${txn.displayId}.`,
      });
      return { action: existing || null, decision, duplicate: true };
    }
    action.status = "rejected";
    action.error = decision.checks.find((c) => c.outcome === "block")?.detail || "Blocked by guardrails.";
    state.actions.unshift(action);
    audit(state, {
      actor: "Guardrail Engine",
      action: "action_blocked",
      entityType: "recovery_action",
      entityId: action.id,
      decision: "block",
      details: action.error,
    });
    ensureReview(state, txn, action, dx, { reason: "failed_recovery", reasonLabel: "Guardrail blocked an action" });
    return { action, decision };
  }

  state.actions.unshift(action);
  audit(state, {
    actor: "Guardrail Engine",
    action: "action_validated",
    entityType: "recovery_action",
    entityId: action.id,
    decision: decision.requiresApproval ? "hold" : "allow",
    details: decision.checks.map((c) => `${c.outcome.toUpperCase()} ${c.title}`).join(" · "),
  });

  if (decision.requiresApproval || actionType === "escalate_human") {
    if (actionType === "escalate_human" && !decision.requiresApproval) {
      action.status = "escalated";
      action.completedAt = new Date().toISOString();
    } else {
      action.status = "pending_approval";
    }
    action.updatedAt = new Date().toISOString();
    const reason = reviewReason(txn, dx, decision);
    ensureReview(state, txn, action, dx, reason);
    audit(state, {
      actor: "Recovery Agent",
      action: "escalated_for_review",
      entityType: "human_review",
      entityId: txn.id,
      decision: "hold",
      details: `${txn.displayId} moved to human review (${reason.reasonLabel}). ${labelFor(actionType)} was not executed.`,
    });
    return { action, decision };
  }

  if (state.settings.autoExecuteSafeActions || options.force) {
    await executeAction(state, action.id);
  }
  return { action, decision };
}

export async function executeAction(state, actionId) {
  const action = state.actions.find((a) => a.id === actionId);
  if (!action) throw httpError(404, "Action not found.");
  if (["completed", "escalated", "rejected"].includes(action.status)) return action;
  const txn = findTxn(state, action.transactionId);
  const customer = findCustomer(state, txn.customerId);
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  const recheck = evaluateGuardrail(state, txn, diagnosis, action.type, {
    idempotencyKey: action.idempotencyKey,
    exceptActionId: action.id,
    messageBody: action.draftBody || "",
  });
  const hard = recheck.checks.filter((c) => c.id !== "idempotency" && c.outcome === "block");
  if (hard.length) {
    action.status = "rejected";
    action.error = hard[0].detail;
    action.updatedAt = new Date().toISOString();
    audit(state, {
      actor: "Guardrail Engine",
      action: "execution_blocked",
      entityType: "recovery_action",
      entityId: action.id,
      decision: "block",
      details: action.error,
    });
    return action;
  }
  if (action.status === "pending_approval") {
    throw httpError(409, "This action is waiting for human approval.");
  }

  action.status = "processing";
  action.updatedAt = new Date().toISOString();

  try {
    if (action.type === "generate_invoice") {
      const invoice = await createInvoice({
        merchantName: state.settings.merchantName,
        customer,
        txn,
        memo: `Please complete your ${txn.currency} ${Number(txn.amount).toFixed(2)} payment for ${txn.displayId}.`,
      });
      if (Number(invoice.amount).toFixed(2) !== Number(txn.amount).toFixed(2)) {
        throw httpError(400, "Invoice amount did not match the original payment.");
      }
      txn.invoice = invoice;
      action.result = invoice;
      action.status = "completed";
    } else if (action.type === "send_recovery_message" || action.type === "send_reminder") {
      const message = await deliverMessage(state, txn, customer, diagnosis, action);
      action.result = { messageId: message.id, status: message.status };
      action.status = message.status === "sent" ? "completed" : "failed";
      if (message.status === "failed") action.error = message.deliveryDetail;
    } else if (action.type === "schedule_retry") {
      const plan = recommendRetryAt(txn, diagnosis || { category: "issuer_decline" });
      txn.retryAt = plan.retryAt;
      action.result = plan;
      action.status = "completed";
    } else if (action.type === "recommend_capture") {
      action.result = {
        captureCalled: false,
        orderId: txn.orderId,
        amount: txn.amount,
        note: "Capture was not executed. An operator can capture the existing authorization in PayPal for the original amount.",
      };
      action.status = "completed";
    } else if (action.type === "escalate_human") {
      action.status = "escalated";
      ensureReview(state, txn, action, diagnosis, reviewReason(txn, diagnosis, recheck));
    } else {
      throw httpError(400, "Unsupported action.");
    }
  } catch (error) {
    action.status = "failed";
    action.error = error.message || "Action failed.";
    ensureReview(state, txn, action, diagnosis, { reason: "failed_recovery", reasonLabel: "Failed recovery attempt" });
  }

  action.updatedAt = new Date().toISOString();
  if (["completed", "failed", "escalated"].includes(action.status)) action.completedAt = new Date().toISOString();
  audit(state, {
    actor: action.actor || "Recovery Agent",
    action: `action_${action.status}`,
    entityType: "recovery_action",
    entityId: action.id,
    decision: action.status === "failed" ? "block" : "allow",
    details: `${labelFor(action.type)} on ${txn.displayId} is ${action.status}. ${action.error || action.result?.note || action.result?.reason || ""}`.trim(),
  });
  return action;
}

async function deliverMessage(state, txn, customer, diagnosis, action) {
  const body = action.draftBody || diagnosis?.suggestedMessage || buildRecoveryMessage(customer, txn, diagnosis || { category: "issuer_decline" }, state.settings.merchantName);
  const sensitive = containsSensitive(body);
  const message = {
    id: uid("msg"),
    transactionId: txn.id,
    customerId: customer.id,
    actionId: action.id,
    channel: "email",
    subject: messageSubject(txn, state.settings.merchantName),
    body,
    status: "sent",
    deliveryDetail: "Delivered by the simulated email channel.",
    aiGenerated: !action.draftBody,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  };
  if (sensitive) {
    message.status = "failed";
    message.sentAt = null;
    message.deliveryDetail = sensitive;
  } else if (customer.email.endsWith("@bounce.invalid")) {
    message.status = "failed";
    message.deliveryDetail = "Mailbox provider timed out (simulated).";
  }
  state.messages.unshift(message);
  audit(state, {
    actor: "Communication Agent",
    action: message.status === "sent" ? "message_sent" : "message_failed",
    entityType: "customer_message",
    entityId: message.id,
    decision: message.status === "sent" ? "allow" : "block",
    details: `${message.status === "sent" ? "Sent" : "Blocked"} a recovery email to ${customer.email} for ${txn.displayId}.`,
  });
  return message;
}

function ensureReview(state, txn, action, diagnosis, reason) {
  const open = state.reviews.find((r) => r.transactionId === txn.id && r.status === "open");
  if (open) {
    if (action && !open.actionId) open.actionId = action.id;
    return open;
  }
  const review = {
    id: uid("rev"),
    transactionId: txn.id,
    actionId: action?.id || null,
    reason: reason.reason,
    reasonLabel: reason.reasonLabel,
    status: "open",
    notes: [],
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  state.reviews.unshift(review);
  return review;
}

export async function handleWebhook(state, body, headers = {}) {
  const verification = await verifyWebhook(headers, body);
  if (!verification.ok) {
    const event = {
      id: uid("evt"),
      transactionId: null,
      eventType: body.event_type || "UNKNOWN",
      payload: body,
      signatureStatus: "rejected",
      receivedAt: new Date().toISOString(),
    };
    state.paymentEvents.unshift(event);
    audit(state, {
      actor: "Monitoring Agent",
      action: "webhook_rejected",
      entityType: "payment_event",
      entityId: event.id,
      decision: "block",
      details: verification.detail,
    });
    return { error: verification.detail, statusCode: 401 };
  }

  const parsed = parsePaypalEvent(body);
  if (parsed.eventType === "PAYMENT.CAPTURE.COMPLETED") {
    return completeExisting(state, parsed, verification);
  }

  const customer = upsertCustomer(state, parsed);
  const seq = ++state.seq;
  const txn = {
    id: uid("txn"),
    displayId: `TXN-${seq}`,
    customerId: customer.id,
    amount: roundMoney(parsed.amount || 0),
    currency: parsed.currency || "USD",
    status: parsed.status === "approved" ? "approved" : parsed.status,
    eventType: parsed.eventType,
    failureCode: parsed.failureCode,
    failureReason: parsed.failureReason,
    paymentMethod: parsed.eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ? "PayPal subscription" : "PayPal",
    subscriptionId: parsed.subscriptionId,
    orderId: parsed.orderId,
    captureId: parsed.captureId,
    recoveredAmount: 0,
    recoveredAt: null,
    approvedAt: parsed.status === "approved" ? new Date().toISOString() : null,
    retryAt: null,
    pipelineRan: false,
    invoice: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (txn.amount <= 0) throw httpError(400, "Webhook amount is missing.");
  state.transactions.unshift(txn);
  state.paymentEvents.unshift({
    id: uid("evt"),
    transactionId: txn.id,
    eventType: parsed.eventType,
    payload: parsed.raw,
    signatureStatus: verification.status,
    receivedAt: new Date().toISOString(),
  });
  audit(state, {
    actor: "Monitoring Agent",
    action: "webhook_received",
    entityType: "transaction",
    entityId: txn.id,
    decision: "allow",
    details: `${parsed.eventType} stored as ${txn.displayId}. Signature: ${verification.status}. ${verification.detail}`,
  });

  if (txn.status === "approved") {
    const ageThreshold = state.settings.uncapturedThresholdMinutes;
    const backdate = body._demo?.approvedMinutesAgo;
    if (backdate && backdate > ageThreshold) {
      txn.approvedAt = new Date(Date.now() - backdate * 60000).toISOString();
      txn.status = "approved_uncaptured";
      txn.failureReason = `Approved order was not captured within ${ageThreshold} minutes.`;
    }
  }
  await runPipeline(state, txn.id);
  return { transactionId: txn.id, displayId: txn.displayId };
}

function completeExisting(state, parsed, verification) {
  const txn =
    findTxn(state, parsed.linkTransactionId) ||
    state.transactions.find((t) => t.orderId && t.orderId === parsed.orderId);
  if (!txn) throw httpError(404, "Completed capture did not match a watched transaction.");
  if (Number(parsed.amount).toFixed(2) !== Number(txn.amount).toFixed(2)) {
    audit(state, {
      actor: "Guardrail Engine",
      action: "recovery_amount_mismatch",
      entityType: "transaction",
      entityId: txn.id,
      decision: "block",
      details: `Completion amount ${parsed.amount} does not match original ${txn.amount}. Status was left unchanged.`,
    });
    throw httpError(400, "Completion amount does not match the original transaction.");
  }
  if (txn.status === "recovered" || txn.status === "completed") {
    return { transactionId: txn.id, displayId: txn.displayId, already: true };
  }
  txn.status = txn.eventType === "PAYMENT.CAPTURE.COMPLETED" && txn.status === "completed" ? "completed" : "recovered";
  if (txn.eventType !== "PAYMENT.CAPTURE.COMPLETED") txn.status = "recovered";
  txn.recoveredAmount = txn.amount;
  txn.recoveredAt = new Date().toISOString();
  txn.updatedAt = txn.recoveredAt;
  state.paymentEvents.unshift({
    id: uid("evt"),
    transactionId: txn.id,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    payload: parsed.raw,
    signatureStatus: verification.status,
    receivedAt: new Date().toISOString(),
  });
  const review = state.reviews.find((r) => r.transactionId === txn.id && r.status === "open");
  if (review) {
    review.status = "resolved";
    review.resolvedAt = txn.recoveredAt;
    review.notes.push({
      id: uid("note"),
      author: "Monitoring Agent",
      body: "PayPal reported the original amount as captured. Case resolved.",
      createdAt: txn.recoveredAt,
    });
  }
  audit(state, {
    actor: "Monitoring Agent",
    action: "revenue_recovered",
    entityType: "transaction",
    entityId: txn.id,
    decision: "allow",
    details: `${txn.displayId} recovered at the original amount of ${txn.amount} ${txn.currency}.`,
  });
  return { transactionId: txn.id, displayId: txn.displayId };
}

function upsertCustomer(state, parsed) {
  if (parsed.customerEmail) {
    const existing = state.customers.find((c) => c.email.toLowerCase() === parsed.customerEmail.toLowerCase());
    if (existing) return existing;
  }
  const customer = {
    id: uid("cus"),
    name: parsed.customerName || "PayPal customer",
    email: parsed.customerEmail || `payer.${state.seq}@customers.smartrecovery.demo`,
    company: parsed.company || "Independent",
    paypalPayerId: `PAYER-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    riskScore: 20,
    segment: "New",
    createdAt: new Date().toISOString(),
  };
  state.customers.unshift(customer);
  return customer;
}

export async function simulateScenario(state, scenario) {
  const stamp = state.seq + 1;
  const person = NAMES[stamp % NAMES.length];
  const email = `${person[0].toLowerCase()}.${person[1].toLowerCase()}${stamp}@customers.smartrecovery.demo`;
  const scenarios = {
    declined: {
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: {
        id: `CAP-SIM-${stamp}`,
        status: "DECLINED",
        status_details: { reason: "INSTRUMENT_DECLINED" },
        amount: { currency_code: "USD", value: "120.00" },
      },
      _demo: {
        customerName: `${person[0]} ${person[1]}`,
        customerEmail: email,
        company: person[2],
        failureCode: "INSTRUMENT_DECLINED",
        failureReason: "INSTRUMENT_DECLINED",
        amount: 120,
      },
    },
    subscription: {
      event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      resource: {
        id: `I-SIM${stamp}`,
        status: "FAILED",
        amount: { currency_code: "USD", value: "49.00" },
      },
      _demo: {
        customerName: `${person[0]} ${person[1]}`,
        customerEmail: email,
        company: person[2],
        failureCode: "PAYER_CANNOT_PAY",
        failureReason: "Subscription renewal failed",
        amount: 49,
        subscriptionId: `I-SIM${stamp}`,
      },
    },
    uncaptured: {
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: {
        id: `ORDER-SIM-${stamp}`,
        status: "APPROVED",
        purchase_units: [{ amount: { currency_code: "USD", value: "240.00" }, reference_id: `ORDER-SIM-${stamp}` }],
      },
      _demo: {
        customerName: `${person[0]} ${person[1]}`,
        customerEmail: email,
        company: person[2],
        amount: 240,
        approvedMinutesAgo: state.settings.uncapturedThresholdMinutes + 50,
      },
    },
    repeated: null,
  };

  if (scenario === "repeated") return simulateRepeated(state, person, email, stamp);
  const body = scenarios[scenario];
  if (!body) throw httpError(400, "Unknown scenario.");
  body._simulation = true;
  return handleWebhook(state, body, { "x-smartrecovery-simulation": "1" });
}

async function simulateRepeated(state, person, email, stamp) {
  const customer = {
    id: uid("cus"),
    name: `${person[0]} ${person[1]}`,
    email,
    company: person[2],
    paypalPayerId: `PAYER-R${stamp}`,
    riskScore: 62,
    segment: "Returning",
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  };
  state.customers.unshift(customer);
  for (const days of [28, 12]) {
    const priorId = uid("txn");
    const display = `TXN-${++state.seq}`;
    state.transactions.push({
      id: priorId,
      displayId: display,
      customerId: customer.id,
      amount: 45,
      currency: "USD",
      status: "failed",
      eventType: "PAYMENT.CAPTURE.DENIED",
      failureCode: "INSTRUMENT_DECLINED",
      failureReason: "INSTRUMENT_DECLINED",
      paymentMethod: "PayPal",
      subscriptionId: null,
      orderId: `ORDER-${display}`,
      captureId: `CAP-${display}`,
      recoveredAmount: 0,
      recoveredAt: null,
      approvedAt: null,
      retryAt: null,
      pipelineRan: true,
      invoice: null,
      createdAt: new Date(Date.now() - days * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - days * 86400000).toISOString(),
    });
  }
  const body = {
    _simulation: true,
    event_type: "PAYMENT.CAPTURE.DENIED",
    resource: {
      id: `CAP-SIM-${stamp}`,
      status: "DECLINED",
      status_details: { reason: "PAYER_CANNOT_PAY" },
      amount: { currency_code: "USD", value: "310.00" },
    },
    _demo: {
      customerName: customer.name,
      customerEmail: customer.email,
      company: customer.company,
      failureCode: "PAYER_CANNOT_PAY",
      failureReason: "PAYER_CANNOT_PAY",
      amount: 310,
    },
  };
  return handleWebhook(state, body, { "x-smartrecovery-simulation": "1" });
}

export async function simulateCustomerPaid(state, txnId) {
  const txn = findTxn(state, txnId);
  if (!txn) throw httpError(404, "Transaction not found.");
  if (!["failed", "approved", "approved_uncaptured"].includes(txn.status)) {
    throw httpError(400, "Only open payment failures or uncaptured approvals can be marked recovered.");
  }
  if (!txn.orderId) txn.orderId = `ORDER-${txn.displayId}`;
  const body = {
    _simulation: true,
    _linkTransactionId: txn.id,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: `CAP-${txn.displayId}-PAID`,
      custom_id: txn.id,
      status: "COMPLETED",
      amount: { currency_code: txn.currency, value: Number(txn.amount).toFixed(2) },
      supplementary_data: { related_ids: { order_id: txn.orderId } },
    },
  };
  return handleWebhook(state, body, { "x-smartrecovery-simulation": "1" });
}

export async function saveDraft(state, txnId, body) {
  const txn = findTxn(state, txnId);
  if (!txn) throw httpError(404, "Transaction not found.");
  const sensitive = containsSensitive(body);
  if (sensitive) throw httpError(400, sensitive);
  const existing = state.messages.find((m) => m.transactionId === txn.id && m.status === "draft");
  if (existing) {
    existing.body = body;
    existing.aiGenerated = false;
    return existing;
  }
  const message = {
    id: uid("msg"),
    transactionId: txn.id,
    customerId: txn.customerId,
    actionId: null,
    channel: "email",
    subject: messageSubject(txn, state.settings.merchantName),
    body,
    status: "draft",
    deliveryDetail: "Draft saved. Not sent.",
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  state.messages.unshift(message);
  return message;
}

export async function sendDraft(state, messageId, actor) {
  const message = state.messages.find((m) => m.id === messageId);
  if (!message) throw httpError(404, "Message not found.");
  const txn = findTxn(state, message.transactionId);
  const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
  const decision = evaluateGuardrail(state, txn, diagnosis, "send_recovery_message", {
    messageBody: message.body,
    idempotencyKey: `msg:${message.id}`,
  });
  if (decision.blocked) throw httpError(400, decision.checks.find((c) => c.outcome === "block").detail);
  if (decision.requiresApproval) {
    const action = {
      id: uid("act"),
      transactionId: txn.id,
      type: "send_recovery_message",
      status: "pending_approval",
      idempotencyKey: decision.idempotencyKey,
      requiresApproval: true,
      checks: decision.checks,
      result: null,
      error: null,
      actor,
      automatic: false,
      draftBody: message.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    state.actions.unshift(action);
    ensureReview(state, txn, action, diagnosis, reviewReason(txn, diagnosis, decision));
    audit(state, {
      actor: "Guardrail Engine",
      action: "message_held",
      entityType: "customer_message",
      entityId: message.id,
      decision: "hold",
      details: `Edited message for ${txn.displayId} needs human approval before it can send.`,
    });
    return { held: true, action };
  }
  message.status = "sent";
  message.sentAt = new Date().toISOString();
  message.deliveryDetail = "Sent by an operator through the simulated email channel.";
  audit(state, {
    actor,
    action: "message_sent",
    entityType: "customer_message",
    entityId: message.id,
    decision: "allow",
    details: `Operator sent a recovery email for ${txn.displayId}.`,
  });
  return { held: false, message };
}

export function addNote(state, reviewId, note, author) {
  const review = state.reviews.find((r) => r.id === reviewId);
  if (!review) throw httpError(404, "Review not found.");
  review.notes.push({ id: uid("note"), author, body: note, createdAt: new Date().toISOString() });
  audit(state, {
    actor: author,
    action: "review_note",
    entityType: "human_review",
    entityId: review.id,
    decision: "info",
    details: note,
  });
  return review;
}

export async function decideReview(state, reviewId, decision, author) {
  const review = state.reviews.find((r) => r.id === reviewId);
  if (!review) throw httpError(404, "Review not found.");
  if (review.status !== "open") throw httpError(400, "This case is already closed.");
  const action = state.actions.find((a) => a.id === review.actionId);

  if (decision === "resolve") {
    review.status = "resolved";
    review.resolvedAt = new Date().toISOString();
    audit(state, {
      actor: author,
      action: "review_resolved",
      entityType: "human_review",
      entityId: review.id,
      decision: "allow",
      details: "Administrator marked the case resolved without a new charge.",
    });
    return review;
  }

  if (decision === "reject") {
    review.status = "rejected";
    review.resolvedAt = new Date().toISOString();
    if (action && action.status === "pending_approval") {
      action.status = "rejected";
      action.error = "Rejected by an administrator.";
      action.updatedAt = new Date().toISOString();
    }
    audit(state, {
      actor: author,
      action: "review_rejected",
      entityType: "human_review",
      entityId: review.id,
      decision: "block",
      details: "Administrator rejected the proposed recovery action.",
    });
    return review;
  }

  if (decision === "approve") {
    review.status = "approved";
    review.resolvedAt = new Date().toISOString();
    if (action && action.status === "pending_approval") {
      action.status = "pending";
      action.requiresApproval = false;
      action.actor = author;
      await executeAction(state, action.id);
    } else if (action && action.status === "failed") {
      const txn = findTxn(state, review.transactionId);
      const diagnosis = state.diagnoses.find((d) => d.transactionId === txn.id);
      const opened = await openAction(state, txn, diagnosis, action.type, {
        actor: author,
        force: true,
        extras: { idempotencyKey: `retry:${action.id}:${Date.now()}` },
      });
      if (opened.action?.status === "pending") await executeAction(state, opened.action.id);
    }
    audit(state, {
      actor: author,
      action: "review_approved",
      entityType: "human_review",
      entityId: review.id,
      decision: "allow",
      details: "Administrator approved the recovery action. Amount was not changed.",
    });
    return review;
  }
  throw httpError(400, "Unknown review decision.");
}

export function updateSettings(state, patch) {
  const next = { ...state.settings };
  if (patch.merchantName) next.merchantName = String(patch.merchantName).slice(0, 80);
  if (patch.supportEmail) next.supportEmail = String(patch.supportEmail).slice(0, 120);
  if (patch.uncapturedThresholdMinutes != null) {
    const value = Number(patch.uncapturedThresholdMinutes);
    if (!Number.isFinite(value) || value < 5 || value > 1440) throw httpError(400, "Threshold must be between 5 and 1440 minutes.");
    next.uncapturedThresholdMinutes = value;
  }
  if (patch.highValueApprovalAmount != null) {
    const value = Number(patch.highValueApprovalAmount);
    if (!Number.isFinite(value) || value < 50) throw httpError(400, "High-value threshold must be at least 50.");
    next.highValueApprovalAmount = value;
  }
  if (patch.repeatFailureThreshold != null) {
    const value = Number(patch.repeatFailureThreshold);
    if (!Number.isFinite(value) || value < 2 || value > 10) throw httpError(400, "Repeat threshold must be between 2 and 10.");
    next.repeatFailureThreshold = value;
  }
  if (patch.autoExecuteSafeActions != null) next.autoExecuteSafeActions = Boolean(patch.autoExecuteSafeActions);
  state.settings = next;
  audit(state, {
    actor: state.currentUser.name,
    action: "settings_updated",
    entityType: "settings",
    entityId: "workspace",
    decision: "info",
    details: `Updated workspace settings for ${next.merchantName}.`,
  });
  return next;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
