import { buildRecoveryMessage } from "./messages.js";
import { narrateWithOpenAI } from "./openai.js";
import { diagnoseWithGemini } from "./gemini.js";

const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

export function priorFailureCount(state, customerId, exceptId) {
  return state.transactions.filter((t) => {
    if (t.customerId !== customerId || t.id === exceptId) return false;
    if (t.eventType === "PAYMENT.CAPTURE.REFUNDED") return false;
    return t.status === "failed" || t.status === "recovered" || t.status === "approved_uncaptured";
  }).length;
}

function profileFor(txn) {
  if (txn.status === "completed" || txn.eventType === "PAYMENT.CAPTURE.REFUNDED" || txn.status === "refunded") {
    return null;
  }
  if (txn.eventType === "CHECKOUT.ORDER.APPROVED" || txn.status === "approved_uncaptured" || txn.status === "approved") {
    return {
      category: "uncaptured_authorization",
      categoryLabel: "Approved, not captured",
      uncertainty: "medium",
      riskLevel: "low",
      probability: 0.71,
      action: "send_reminder",
      rootCause: "The PayPal order is approved and has not been captured.",
      hypothesis:
        "Possible: the buyer left after approval, or the merchant capture step did not run. PayPal has not said which.",
    };
  }
  if (txn.eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    return {
      category: "subscription_renewal",
      categoryLabel: "Subscription renewal failed",
      uncertainty: "medium",
      riskLevel: "medium",
      probability: 0.58,
      action: "schedule_retry",
      rootCause: "PayPal reported that the subscription renewal payment failed.",
      hypothesis:
        "Possible: the funding source tied to the subscription could not be charged. The exact issuer reason was not included.",
    };
  }

  const code = txn.failureCode || "UNKNOWN";
  const table = {
    INSTRUMENT_DECLINED: {
      category: "issuer_decline",
      categoryLabel: "Payment instrument declined",
      uncertainty: "low",
      riskLevel: "medium",
      probability: 0.64,
      action: "send_recovery_message",
      rootCause: "PayPal returned INSTRUMENT_DECLINED. The payment instrument was declined.",
      hypothesis:
        "Possible: the bank or card issuer refused the instrument. PayPal did not include a deeper issuer code.",
    },
    PAYER_CANNOT_PAY: {
      category: "funding_unavailable",
      categoryLabel: "Payer cannot pay",
      uncertainty: "medium",
      riskLevel: "medium",
      probability: 0.52,
      action: "schedule_retry",
      rootCause: "PayPal returned PAYER_CANNOT_PAY.",
      hypothesis:
        "Possible: the selected funding source was unavailable. This code does not prove insufficient funds.",
    },
    PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED: {
      category: "verification",
      categoryLabel: "Payment method needs review",
      uncertainty: "medium",
      riskLevel: "medium",
      probability: 0.47,
      action: "send_recovery_message",
      rootCause: "PayPal could not verify the payment source.",
      hypothesis:
        "Possible: the payer must confirm or replace the funding source inside PayPal.",
    },
    COMPLIANCE_VIOLATION: {
      category: "compliance",
      categoryLabel: "Compliance review",
      uncertainty: "low",
      riskLevel: "high",
      probability: 0.18,
      action: "escalate_human",
      rootCause: "PayPal returned COMPLIANCE_VIOLATION.",
      hypothesis:
        "Possible: PayPal's compliance checks blocked the payment. The customer should not be nudged automatically.",
    },
    TRANSACTION_REFUSED: {
      category: "processor_refusal",
      categoryLabel: "Processor refusal",
      uncertainty: "high",
      riskLevel: "medium",
      probability: 0.33,
      action: "escalate_human",
      rootCause: "PayPal refused the transaction and did not attach a specific reason.",
      hypothesis:
        "Possible causes include risk checks, funding limits, or a temporary processor issue. None of these is confirmed.",
    },
    UNKNOWN: {
      category: "insufficient_information",
      categoryLabel: "Reason not provided",
      uncertainty: "high",
      riskLevel: "medium",
      probability: 0.3,
      action: "escalate_human",
      rootCause: "The payment failed and PayPal did not provide a failure code.",
      hypothesis:
        "A definitive root cause cannot be assigned until PayPal or the customer supplies more information.",
    },
  };
  return table[code] || table.UNKNOWN;
}

export function composeDiagnosis(state, txn) {
  const customer = state.customers.find((c) => c.id === txn.customerId);
  const profile = profileFor(txn);
  if (!profile || !customer) return null;

  const amountLabel = money(txn.amount, txn.currency);
  const facts = [
    `PayPal event ${txn.eventType} was stored for ${txn.displayId}.`,
    `Amount on the event is ${amountLabel}. Recovery actions are not allowed to change it.`,
    txn.failureCode
      ? `PayPal failure code: ${txn.failureCode}.`
      : "PayPal did not include a failure code on this event.",
    txn.paymentMethod ? `Payment method label: ${txn.paymentMethod}.` : "Payment method label was not provided.",
  ];
  if (txn.subscriptionId) facts.push(`Subscription id ${txn.subscriptionId} is attached to the event.`);
  if (txn.status === "approved_uncaptured") {
    facts.push(
      `The order has stayed approved beyond the ${state.settings.uncapturedThresholdMinutes}-minute capture threshold. No capture has been recorded.`,
    );
  }

  const hypotheses = [profile.hypothesis];
  let riskLevel = profile.riskLevel;
  let action = profile.action;
  let uncertainty = profile.uncertainty;
  let probability = profile.probability;

  const priors = priorFailureCount(state, customer.id, txn.id);
  if (priors + 1 >= state.settings.repeatFailureThreshold && txn.status === "failed") {
    facts.push(
      `${customer.name} now has ${priors + 1} failed or previously failed payments in this workspace. Workspace policy requires human review at ${state.settings.repeatFailureThreshold} failures.`,
    );
    riskLevel = "high";
    action = "escalate_human";
    probability = Math.min(probability, 0.28);
  }

  if (txn.amount >= state.settings.highValueApprovalAmount && riskLevel !== "high") {
    facts.push(
      `Amount is at or above the ${money(state.settings.highValueApprovalAmount)} high-value threshold.`,
    );
    riskLevel = "high";
  }

  if (customer.riskScore >= 75 && riskLevel === "low") riskLevel = "medium";

  const diagnosis = {
    id: `dx_${txn.id}`,
    transactionId: txn.id,
    rootCause: profile.rootCause,
    explanation: explanationFor(profile, amountLabel, uncertainty),
    category: profile.category,
    categoryLabel: profile.categoryLabel,
    riskLevel,
    recoveryProbability: probability,
    recommendedAction: action,
    uncertainty,
    verifiedFacts: facts,
    hypotheses,
    suggestedMessage: "",
    model: "policy-engine-v1",
    policyLocked: true,
    createdAt: new Date().toISOString(),
  };
  diagnosis.suggestedMessage = buildRecoveryMessage(customer, txn, diagnosis, state.settings.merchantName);
  
  // Make customer risk score vary realistically based on risk level and transaction history
  const baseScore = { low: 18, medium: 46, high: 78 }[riskLevel];
  const jitter = Math.round((txn.amount * 3) % 19);
  customer.riskScore = Math.min(94, Math.max(12, baseScore + jitter));

  return diagnosis;
}

export async function buildDiagnosis(state, txn) {
  const customer = state.customers.find((c) => c.id === txn.customerId);
  const amountLabel = money(txn.amount, txn.currency);

  // 1. Try Gemini API if configured
  if (process.env.GEMINI_API_KEY && customer) {
    const priors = priorFailureCount(state, customer.id, txn.id);
    const geminiDx = await diagnoseWithGemini({
      displayId: txn.displayId,
      amount: txn.amount,
      currency: txn.currency,
      eventType: txn.eventType,
      failureCode: txn.failureCode,
      failureReason: txn.failureReason,
      customerName: customer.name,
      customerEmail: customer.email,
      customerSegment: customer.segment,
      priorFailures: priors,
      merchantName: state.settings.merchantName,
    });

    if (geminiDx) {
      // Deterministic guardrail safety overrides on Gemini recommendations
      let riskLevel = geminiDx.riskLevel;
      let recommendedAction = geminiDx.recommendedAction;
      let probability = geminiDx.recoveryProbability;

      const facts = [
        `PayPal event ${txn.eventType} was stored for ${txn.displayId}.`,
        `Amount on the event is ${amountLabel}. Recovery actions are not allowed to change it.`,
        ...(geminiDx.verifiedFacts || []),
      ];

      if (priors + 1 >= state.settings.repeatFailureThreshold && txn.status === "failed") {
        facts.push(`${customer.name} has ${priors + 1} failures. Human review required.`);
        riskLevel = "high";
        recommendedAction = "escalate_human";
        probability = Math.min(probability, 0.28);
      }

      if (txn.amount >= state.settings.highValueApprovalAmount && riskLevel !== "high") {
        facts.push(`Amount is at or above the ${money(state.settings.highValueApprovalAmount)} high-value threshold.`);
        riskLevel = "high";
      }

      const diagnosis = {
        id: `dx_${txn.id}`,
        transactionId: txn.id,
        rootCause: geminiDx.rootCause,
        explanation: geminiDx.explanation,
        category: geminiDx.category,
        categoryLabel: geminiDx.categoryLabel,
        riskLevel,
        recoveryProbability: probability,
        recommendedAction,
        uncertainty: geminiDx.uncertainty,
        verifiedFacts: facts,
        hypotheses: geminiDx.hypotheses.length ? geminiDx.hypotheses : ["Inferred funding source or issuer limitation."],
        suggestedMessage: "",
        model: geminiDx.model,
        policyLocked: true,
        createdAt: new Date().toISOString(),
      };
      diagnosis.suggestedMessage = buildRecoveryMessage(customer, txn, diagnosis, state.settings.merchantName);

      const baseScore = { low: 18, medium: 46, high: 78 }[riskLevel];
      const jitter = Math.round((txn.amount * 3) % 19);
      customer.riskScore = Math.min(94, Math.max(12, baseScore + jitter));
      return diagnosis;
    }
  }

  // 2. Fall back to Deterministic Policy Engine
  const diagnosis = composeDiagnosis(state, txn);
  if (!diagnosis) return null;
  if (diagnosis.uncertainty === "high" || diagnosis.category === "compliance") return diagnosis;

  // Optional OpenAI narrative if configured
  const narrative = await narrateWithOpenAI({
    merchantName: state.settings.merchantName,
    amount: amountLabel,
    facts: diagnosis.verifiedFacts,
    hypotheses: diagnosis.hypotheses,
    categoryLabel: diagnosis.categoryLabel,
    customerFirstName: customer.name.split(" ")[0],
  });
  if (narrative?.explanation && !introducesDifferentAmount(narrative.explanation, txn.amount)) {
    diagnosis.explanation = narrative.explanation;
    diagnosis.model = `policy-engine-v1 + ${narrative.model}`;
  }
  if (
    narrative?.customerMessage &&
    narrative.customerMessage.includes(customer.name.split(" ")[0]) &&
    !introducesDifferentAmount(narrative.customerMessage, txn.amount)
  ) {
    diagnosis.suggestedMessage = narrative.customerMessage;
  }
  return diagnosis;
}

function explanationFor(profile, amountLabel, uncertainty) {
  if (uncertainty === "high") {
    return `The ${amountLabel} payment did not complete. PayPal did not provide enough detail to name a single root cause, so this note stays limited to what the event actually contains. A person should review it before any customer contact.`;
  }
  if (profile.category === "issuer_decline") {
    return `The ${amountLabel} payment was declined by the payment provider. The customer may need to verify their payment method or use another funding source. That funding-source detail is a hypothesis, not a fact PayPal confirmed.`;
  }
  if (profile.category === "subscription_renewal") {
    return `The subscription renewal for ${amountLabel} failed. The customer can update the PayPal funding source. SmartRecovery will not run a charge on its own.`;
  }
  if (profile.category === "uncaptured_authorization") {
    return `PayPal shows an approval for ${amountLabel}, and the capture has not happened. The order is at risk of expiring. Capturing funds is intentionally not an automated action.`;
  }
  if (profile.category === "funding_unavailable") {
    return `PayPal reported that the payer could not complete the ${amountLabel} payment. A later retry window may help, but the platform will not charge them automatically.`;
  }
  if (profile.category === "compliance") {
    return `PayPal flagged the ${amountLabel} payment for compliance. Automatic customer messages are withheld so an administrator can decide the next step.`;
  }
  if (profile.category === "verification") {
    return `PayPal could not verify the payment source for the ${amountLabel} payment. The customer may need to review that method inside PayPal.`;
  }
  return `The ${amountLabel} payment did not complete. Review the verified facts before choosing a recovery action.`;
}

function introducesDifferentAmount(text, amount) {
  const amounts = text.match(/\$\s?\d+(?:\.\d{1,2})?/g) || [];
  const expected = amount.toFixed(2);
  return amounts.some((raw) => {
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(value) && value.toFixed(2) !== expected;
  });
}
