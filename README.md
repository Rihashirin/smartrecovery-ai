# SmartRecovery AI — Autonomous Payment Diagnostics & Revenue Recovery Agent

SmartRecovery AI is a modern, enterprise-grade SaaS platform designed for merchants using PayPal. It autonomously detects failed payments, identifies root causes using Google Gemini AI, validates actions against a deterministic guardrail engine, and executes automated recovery workflows (one-click PayPal invoices, smart retry scheduling, and customer communications) while escalating risky or high-value cases to human review.

---

## ⚡ Quick Start & Setup

The application is deployed live on Render and is also fully functional locally.

### 1. Live Cloud Prototype
Access the live prototype instantly on Render:
👉 **[https://smart-recovery-ai.onrender.com](https://smart-recovery-ai.onrender.com)**

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/Rihashirin/smartrecovery-ai.git
cd smartrecovery-ai

# Install all dependencies (root, server, and client)
npm run setup

# Build client
npm run build

# Start the full-stack server (serves API + React frontend on port 4000)
npm start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser.

---

## 🔑 Environment Variables (`.env`)

SmartRecovery AI features a **dual-mode architecture**: it operates with live PayPal Sandbox and Google Gemini when API keys are configured, and gracefully falls back to an on-device deterministic policy engine and simulation mode if credentials are unset.

| Variable | Description | Mode |
|---|---|---|
| `PORT` | Server listening port (default: `4000`, dynamic on Render) | Both |
| `GEMINI_API_KEY` | Google Gemini API key for structured root-cause payment diagnostics | Live AI Mode |
| `GEMINI_MODEL` | Gemini model variant (default: `gemini-1.5-flash`) | Live AI Mode |
| `PAYPAL_CLIENT_ID` | PayPal Developer Sandbox App Client ID | Live PayPal Mode |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer Sandbox App Secret | Live PayPal Mode |
| `PAYPAL_MODE` | `sandbox` or `simulated` (default: `sandbox`) | Both |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID for cryptographic signature verification | Live PayPal Mode |
| `PAYPAL_API_BASE` | PayPal API Endpoint (`https://api-m.sandbox.paypal.com`) | Live PayPal Mode |

---

## 🤖 How Google Gemini & PayPal Sandbox Are Used

### 1. Google Gemini AI Diagnostics
When a PayPal payment failure or decline occurs:
- The system calls the **Gemini 1.5 Flash API** with the PayPal error code, failure reason, and customer transaction history.
- Gemini returns a structured JSON payload identifying the technical `root_cause`, plain-language `explanation`, `verified_facts`, `hypotheses`, `risk_level`, `recovery_probability`, and `recommended_action`.
- **Deterministic Guardrail Override:** The AI output is treated strictly as an untrusted advisory recommendation. The deterministic guardrail engine checks amount immutability, allowed action whitelists, and idempotency locks before any recovery action can execute.

### 2. PayPal Developer Sandbox Integration
- **OAuth 2.0 Token Generation:** Authenticates securely via `https://api-m.sandbox.paypal.com/v1/oauth2/token`.
- **Invoicing API v2:** Automatically drafts and sends real PayPal sandbox invoices (`/v2/invoicing/invoices` and `/send`) preserving the exact transaction amount.
- **Webhook Verification:** Ingests live `PAYMENT.CAPTURE.DENIED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, and `CHECKOUT.ORDER.APPROVED` events at `/api/webhooks/paypal` and verifies transmission signatures using PayPal's `/v1/notifications/verify-webhook-signature` endpoint.

---

## ☁️ Hosted on Render

SmartRecovery AI is hosted on **Render** as a unified Node.js web service. The Express backend statically serves the compiled React 18 production bundle while handling real-time REST API queries and PayPal webhooks.

Live URL: **[https://smart-recovery-ai.onrender.com](https://smart-recovery-ai.onrender.com)**

---

## 🎯 3-Minute Hackathon Demo Flow

1. **Dashboard & Metrics:** View monitored PayPal transactions, revenue at risk, and recovered volume.
2. **Payment Failure Simulation:** Trigger a simulated or live `INSTRUMENT_DECLINED` event.
3. **AI Diagnosis & Verified Facts:** Inspect the Gemini root cause diagnosis and observe clear separation of verified facts from hypotheses.
4. **Deterministic Guardrails:** Demonstrate amount immutability and click "Test Amount Tampering" to see real-time blocking with audit logs.
5. **Recovery & Win-Back:** Dispatch a PayPal invoice and simulate customer payment to watch recovered revenue update live.
6. **Human Review Center:** Inspect high-value ($500+) or repeated failure cases requiring operator governance.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vite
- **Backend:** Node.js, Express.js (REST APIs, Webhook Handlers)
- **AI Engine:** Google Gemini 1.5 Flash API (with on-device policy engine fallback)
- **Payments:** PayPal Sandbox APIs (OAuth2, Invoicing v2, Webhook Verification)
- **Database:** PostgreSQL / Supabase Schema (`schema.sql`) + In-Memory Ledger
- **Hosting:** Render Cloud Platform

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
