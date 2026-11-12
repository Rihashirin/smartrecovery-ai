export async function diagnoseWithGemini(input) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  const prompt = `You are an expert autonomous payment recovery diagnostics agent for online merchants using PayPal.
Analyze the following payment event and customer context:
- Transaction Display ID: ${input.displayId}
- Amount: ${input.amount} ${input.currency}
- PayPal Event Type: ${input.eventType}
- Failure Reason / Code: ${input.failureCode || input.failureReason || "Not provided by PayPal"}
- Customer: ${input.customerName} (${input.customerEmail}, Segment: ${input.customerSegment || "Standard"}, Prior Failures: ${input.priorFailures})
- Merchant: ${input.merchantName}

Return a STRICT JSON object (no markdown, no backticks, no prose) with these exact keys:
{
  "root_cause": "Concise statement of what failed technically",
  "explanation": "Clear 2-sentence explanation for the merchant in simple language",
  "verified_facts": ["2 to 3 verified facts received from PayPal payload"],
  "hypotheses": ["1 to 2 plausible hypotheses on why the payment failed without definitive proof"],
  "category": "issuer_decline" | "funding_unavailable" | "subscription_renewal" | "uncaptured_authorization" | "compliance" | "insufficient_information",
  "category_label": "Payment instrument declined" | "Payer cannot pay" | "Subscription renewal failed" | "Approved, not captured" | "Compliance review" | "Reason not provided",
  "risk_level": "low" | "medium" | "high",
  "recovery_probability": number between 0.1 and 0.95,
  "recommended_action": "generate_invoice" | "send_recovery_message" | "schedule_retry" | "escalate_human",
  "uncertainty": "low" | "medium" | "high"
}

Security & Compliance Rules:
1. Never invent a definitive bank reason when PayPal does not provide one.
2. The recommended_action must ONLY be one of: generate_invoice, send_recovery_message, schedule_retry, escalate_human.
3. For compliance violations or repeat failures >= 3, always set risk_level to 'high' and recommended_action to 'escalate_human'.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    if (!parsed.root_cause || !parsed.recommended_action) return null;

    return {
      rootCause: parsed.root_cause,
      explanation: parsed.explanation,
      verifiedFacts: Array.isArray(parsed.verified_facts) ? parsed.verified_facts : [],
      hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses : [],
      category: parsed.category || "issuer_decline",
      categoryLabel: parsed.category_label || "Payment instrument declined",
      riskLevel: ["low", "medium", "high"].includes(parsed.risk_level) ? parsed.risk_level : "medium",
      recoveryProbability: typeof parsed.recovery_probability === "number" ? parsed.recovery_probability : 0.65,
      recommendedAction: ["generate_invoice", "send_recovery_message", "schedule_retry", "escalate_human"].includes(
        parsed.recommended_action
      )
        ? parsed.recommended_action
        : "generate_invoice",
      uncertainty: ["low", "medium", "high"].includes(parsed.uncertainty) ? parsed.uncertainty : "medium",
      model: `Gemini (${model})`,
    };
  } catch (err) {
    console.warn("Gemini diagnosis failed or timed out, falling back to policy engine:", err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
