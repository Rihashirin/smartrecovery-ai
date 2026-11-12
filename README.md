# SmartRecovery AI — Autonomous Payment Diagnostics & Revenue Recovery Agent

SmartRecovery AI is a modern, enterprise-grade SaaS platform designed for merchants using PayPal. It autonomously detects failed payments, identifies root causes using AI, validates actions against a deterministic guardrail engine, and executes automated recovery workflows (one-click PayPal invoices, smart retry scheduling, and customer communications) while escalating risky or high-value cases to human review.

---

## ⚡ Quick Start for Your Presentation

The application is completely built, preloaded with realistic demo data, and ready to demonstrate.

### 1. Start the Full-Stack Application
From the project root:

```bash
# Option A: Start production mode (API + Single Page App on port 4000)
npm start

# Option B: Run concurrent dev mode (Vite on :5173 + API on :4000)
npm run dev
```

Open your browser at:
👉 **[http://localhost:4000](http://localhost:4000)** (or `http://localhost:5173` for Vite)

---

## 🎤 Presentation & Hackathon Demo Walkthrough (3 Minutes)

Follow this step-by-step script for your live demo:

### Step 1: High-Level Overview & Metrics (30s)
1. **Showcase the Dashboard**: Point out the dark navy and crisp white SaaS interface, live PayPal telemetry indicator, and key KPI cards:
   - **Total Transactions**: 40+ transactions monitored across PayPal webhooks
   - **Revenue at Risk**: Open failed payment volume
   - **Revenue Recovered**: Total money won back into the merchant's account
   - **Recovery Success Rate**: Autonomous win rate (87%+)
   - **Autonomous Loop**: Highlight the 5-step visual pipeline (Detect → Diagnose → Verify → Execute → Restore).

### Step 2: Trigger Real-Time Payment Failure Simulation (45s)
1. Click the glowing **"Simulate Payment Failure"** button in the header or sidebar.
2. Select **Scenario 1: Card / Instrument Declined ($120.00)**.
3. Observe real-time response:
   - Green banner announces: `TXN-10041 entered the recovery pipeline.`
   - Notice the AI Diagnosis Agent instantly identifies `INSTRUMENT_DECLINED` and calculates recovery probability.
   - The Guardrail Engine verifies amount immutability and generates a simulated one-click PayPal invoice link.
4. Click **"Simulate Customer Paid"** on that transaction:
   - Watch the transaction status immediately shift to **Recovered**.
   - Watch **Revenue Recovered** increase by $120.00 on the live dashboard!

### Step 3: Showcase Deterministic Guardrails (45s)
1. Click on any failed transaction to open the **Transaction Detail Modal**.
2. Scroll to the **Deterministic Guardrail Engine Verification** section:
   - Rule 1: Amounts are immutable (never modifies amount)
   - Rule 2: No unauthorized charges (zero surprise card rebills)
   - Rule 3: High-risk & repeated failures require human sign-off
   - Rule 4: Idempotency keys block duplicate billing
   - Rule 5: Card numbers/CVVs are stripped from customer communications
   - Rule 6: Webhook signatures are cryptographically verified
3. **Live Security Demonstration**: Click the **"Test Amount Tampering (Expect Block)"** button.
   - Show how the Guardrail Engine instantly catches the mutation and blocks execution with an audit log record!

### Step 4: Human-in-the-Loop Governance (40s)
1. Navigate to **"Human Review"** on the sidebar.
2. Select an escalated case (e.g. high-value $560 order or repeated 3x decline).
3. Demonstrate administrator actions:
   - Review AI hypotheses vs verified PayPal API facts.
   - Add internal notes in the collaboration thread.
   - Click **"Approve & Execute Action"** or **"Mark Resolved"**.

### Step 5: Analytics & Customer Intelligence (20s)
1. Click **"Analytics"**: Show the Monthly Recovery Trends area chart, Failure Reason distribution donut chart, and Recovery Channel effectiveness matrix.
2. Click **"Customers"**: Show customer risk scores, segments, and lifetime revenue protected.

---

## 🏗️ Architecture & Modules

### 1. Payment Monitoring Agent
- Captures and normalizes PayPal events:
  - `PAYMENT.CAPTURE.DENIED`
  - `PAYMENT.CAPTURE.REFUNDED` (displayed separately; never treated as failed payments)
  - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
  - `CHECKOUT.ORDER.APPROVED` (detects orders uncaptured past configurable threshold)

### 2. AI Payment Diagnosis Agent
- Ingests PayPal status codes, metadata, customer transaction history, and risk scores.
- Clearly separates **Verified API Facts** from **Inferred AI Hypotheses**.
- Produces plain-language explanations, recovery probabilities, and recommended recovery strategies.

### 3. Autonomous Recovery Agent
- Dispatches one-click simulated PayPal invoices with direct recovery links.
- Schedules optimal retry windows (e.g. payday alignment).
- Enforces unique idempotency keys to prevent double-invoicing or duplicate runs.

### 4. Deterministic Guardrail Engine
- Rule-based safety boundary between AI recommendations and the PayPal API.
- Rejects amount alterations, unapproved card debits, and sensitive data leakage.

### 5. Customer Communication Agent
- Drafts personalized win-back emails tailored to specific failure categories.
- Features in-browser message composer with real-time card data redaction warnings.

### 6. Human Review Center
- Dedicated interface for compliance flags, repeated failures, and transactions exceeding approval limits (default $500).
- Full audit log and internal notes thread.

### 7. Analytics & Reporting
- Recharts-powered telemetry tracking recovered revenue, lost volume, and channel conversion.

---

## 💾 Database Schema (`schema.sql`)

The application ledger mirrors a production Supabase / PostgreSQL schema:

1. `users` — Administrator and operator credentials
2. `customers` — PayPal payer IDs, segments, risk scores
3. `transactions` — Display IDs, amounts, currencies, event types, statuses
4. `payment_events` — Raw webhook payloads and signature verification statuses
5. `ai_diagnoses` — Root causes, verified facts, hypotheses, recovery probabilities
6. `recovery_actions` — Action types, idempotency keys, guardrail checks, results
7. `customer_messages` — AI drafts, delivery channels, dispatch statuses
8. `human_reviews` — Escalation reasons, operator notes, review statuses
9. `audit_logs` — Immutable actor decision logs (`allow`, `block`, `hold`, `info`)

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vite
- **Backend**: Node.js, Express.js, ES Modules, REST APIs
- **Database / Ledger**: In-memory state with persistence to `.state.json` + `schema.sql` for PostgreSQL / Supabase
- **AI Engine**: Contextual AI diagnosis with built-in fallback on-device policy engine (no API key required for full demo functionality)
- **Payment Sandbox**: PayPal Sandbox / Simulation Engine with live webhook endpoints

