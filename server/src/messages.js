const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

export function containsSensitive(text) {
  if (!text) return null;
  if (/\b(?:\d[ -]*?){13,19}\b/.test(text)) {
    return "The message appears to contain a payment card number.";
  }
  if (/\b(cvv|cvc|card security code|full card)\b/i.test(text)) {
    return "Messages cannot request or include card security codes.";
  }
  if (/\b(password|one-time passcode|otp|social security)\b/i.test(text)) {
    return "Messages cannot request passwords, passcodes, or government identifiers.";
  }
  return null;
}

export function buildRecoveryMessage(customer, txn, diagnosis, merchantName) {
  const first = customer.name.split(" ")[0];
  const amount = money(txn.amount, txn.currency);
  const brand = merchantName || "our store";

  if (diagnosis.category === "subscription_renewal") {
    return `Hi ${first}, the renewal for your ${brand} subscription (${amount}) did not go through. You can update your PayPal payment method and keep the subscription active from the secure link we include with this note. We will not retry a charge until you have had a chance to review it. Reply if you would like help.`;
  }
  if (diagnosis.category === "uncaptured_authorization") {
    return `Hi ${first}, your PayPal approval for ${amount} at ${brand} is still waiting to be completed. Nothing has been captured yet. If you still want the order, you can confirm it from the secure payment link. If you did not intend to continue, you can ignore this message.`;
  }
  if (diagnosis.category === "funding_unavailable") {
    return `Hi ${first}, PayPal could not complete your ${amount} payment to ${brand}. This sometimes happens when a funding source is temporarily unavailable. You can choose another way to pay from the secure link below whenever you are ready. No additional charge has been made.`;
  }
  if (diagnosis.category === "verification") {
    return `Hi ${first}, PayPal needs the payment method on your ${amount} order with ${brand} to be reviewed before it can complete. You can update it from the secure link below. We never ask you to send card numbers by email.`;
  }
  return `Hi ${first}, we noticed that your recent payment of ${amount} could not be completed. You can securely review your payment method and complete your purchase using the payment link below. Please let us know if you need assistance.`;
}

export function messageSubject(txn, merchantName) {
  const amount = money(txn.amount, txn.currency);
  return `${merchantName}: complete your ${amount} payment`;
}

export function recommendRetryAt(txn, diagnosis) {
  const when = new Date();
  if (diagnosis.category === "funding_unavailable") {
    const day = when.getDate();
    if (day < 14) when.setDate(15);
    else {
      when.setMonth(when.getMonth() + 1);
      when.setDate(1);
    }
    when.setHours(10, 0, 0, 0);
    return {
      retryAt: when.toISOString(),
      reason:
        "Funding-related declines often clear around a payday. This is a recommended window only. SmartRecovery will not charge the customer.",
    };
  }
  if (diagnosis.category === "subscription_renewal") {
    when.setDate(when.getDate() + 1);
    when.setHours(9, 30, 0, 0);
    return {
      retryAt: when.toISOString(),
      reason:
        "Subscription renewals are usually retried the next morning, after the customer can update a payment method. No charge is sent from this action.",
    };
  }
  when.setHours(when.getHours() + 6);
  return {
    retryAt: when.toISOString(),
    reason:
      "A short delay avoids retrying an issuer decline immediately. This records a recommendation only and does not create a payment.",
  };
}
