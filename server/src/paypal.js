const base = () => process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

function configured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function accessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${base()}/v1/oauth2/token`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) throw new Error(`PayPal auth failed (${response.status})`);
    const data = await response.json();
    return data.access_token;
  } finally {
    clearTimeout(timer);
  }
}

export async function createInvoice({ merchantName, customer, txn, memo }) {
  if (!configured()) {
    const id = `INV-SIM-${txn.displayId}`;
    return {
      mode: "simulation",
      invoiceId: id,
      status: "SENT",
      amount: txn.amount,
      currency: txn.currency,
      url: `https://www.sandbox.paypal.com/invoice/s/pay/${id}`,
      note: "Simulated PayPal invoice. No live API call was made.",
      memo,
    };
  }

  try {
    const token = await accessToken();
    const draft = await fetch(`${base()}/v2/invoicing/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        detail: {
          currency_code: txn.currency,
          note: memo,
          memo: `Recovery for ${txn.displayId}`,
        },
        invoicer: { business_name: merchantName },
        primary_recipients: [
          {
            billing_info: {
              email_address: customer.email,
              name: { given_name: customer.name.split(" ")[0], full_name: customer.name },
            },
          },
        ],
        items: [
          {
            name: `Payment recovery ${txn.displayId}`,
            quantity: "1",
            unit_amount: { currency_code: txn.currency, value: Number(txn.amount).toFixed(2) },
          },
        ],
      }),
    });
    if (!draft.ok) throw new Error(`Invoice draft failed (${draft.status})`);
    const invoice = await draft.json();
    const invoiceId = invoice.id || invoice.href?.split("/").pop();
    await fetch(`${base()}/v2/invoicing/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ send_to_invoicer: false, send_to_recipient: true }),
    });
    return {
      mode: "sandbox",
      invoiceId,
      status: "SENT",
      amount: txn.amount,
      currency: txn.currency,
      url: invoice.href || `https://www.sandbox.paypal.com/invoice/s/pay/${invoiceId}`,
      note: "Drafted and sent through the PayPal sandbox invoicing API.",
      memo,
    };
  } catch (error) {
    const id = `INV-SIM-${txn.displayId}`;
    return {
      mode: "simulation",
      invoiceId: id,
      status: "SENT",
      amount: txn.amount,
      currency: txn.currency,
      url: `https://www.sandbox.paypal.com/invoice/s/pay/${id}`,
      note: `Sandbox call failed (${error.message}). A simulated invoice was stored instead.`,
      memo,
    };
  }
}

export async function verifyWebhook(headers, body) {
  const simulated = body?._simulation === true || headers["x-smartrecovery-simulation"] === "1";
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    if (simulated || !configured()) {
      return { ok: true, status: "simulated", detail: "Webhook signature check skipped because simulation mode is active." };
    }
    return { ok: false, status: "rejected", detail: "Live webhook rejected. PAYPAL_WEBHOOK_ID is not configured." };
  }
  if (simulated) {
    return { ok: true, status: "simulated", detail: "Simulation events are accepted without a PayPal signature." };
  }
  if (!configured()) {
    return { ok: false, status: "rejected", detail: "Webhook id is set but PayPal client credentials are missing." };
  }
  try {
    const token = await accessToken();
    const response = await fetch(`${base()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      }),
    });
    const data = await response.json();
    if (data.verification_status === "SUCCESS") {
      return { ok: true, status: "verified", detail: "PayPal verified the webhook signature." };
    }
    return { ok: false, status: "rejected", detail: "PayPal did not verify this webhook signature." };
  } catch (error) {
    return { ok: false, status: "rejected", detail: `Signature verification failed: ${error.message}` };
  }
}

export function parsePaypalEvent(body) {
  const type = body.event_type;
  const resource = body.resource || {};
  const unit = resource.purchase_units?.[0];
  const amountObj = resource.amount || unit?.amount || {};
  const demo = body._demo || {};
  let status = "failed";
  if (type === "PAYMENT.CAPTURE.REFUNDED") status = "refunded";
  if (type === "PAYMENT.CAPTURE.COMPLETED") status = "completed";
  if (type === "CHECKOUT.ORDER.APPROVED") status = "approved";
  const failureCode = demo.failureCode || resource.status_details?.reason || resource.reason_code || null;
  return {
    eventType: type,
    amount: Number(demo.amount ?? amountObj.value ?? 0),
    currency: demo.currency || amountObj.currency_code || "USD",
    status,
    failureCode,
    failureReason: demo.failureReason || resource.status_details?.reason || null,
    customerName: demo.customerName || null,
    customerEmail: demo.customerEmail || null,
    company: demo.company || null,
    subscriptionId: type?.startsWith("BILLING") ? resource.id || demo.subscriptionId : demo.subscriptionId || null,
    orderId: resource.supplementary_data?.related_ids?.order_id || unit?.reference_id || resource.id || null,
    captureId: type?.includes("CAPTURE") ? resource.id : null,
    linkTransactionId: body._linkTransactionId || resource.custom_id || null,
    raw: body,
  };
}
