export async function narrateWithOpenAI(input) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write cautious payment-operations copy. Never invent a definitive bank reason. Never change the amount. Never suggest charging the customer, capturing funds, or collecting card numbers. Use the amount exactly as given. Return JSON with keys explanation (2 sentences) and customerMessage (a short email).",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    if (!parsed.explanation) return null;
    return { explanation: String(parsed.explanation), customerMessage: parsed.customerMessage ? String(parsed.customerMessage) : "", model };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function integrationFlags() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenai = Boolean(process.env.OPENAI_API_KEY);
  const hasPaypal = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  return {
    gemini: hasGemini,
    openai: hasOpenai,
    paypal: hasPaypal,
    paypalSandbox: hasPaypal,
    webhookVerified: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    model: hasGemini ? "Gemini 1.5 Flash" : hasOpenai ? (process.env.OPENAI_MODEL || "gpt-4o-mini") : "Policy Engine",
    paypalMode: process.env.PAYPAL_MODE || (hasPaypal ? "sandbox" : "simulated"),
  };
}
