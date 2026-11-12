import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { load, persist, resetState } from "./store.js";
import { buildView } from "./view.js";
import {
  decideReview,
  addNote,
  handleWebhook,
  openAction,
  promoteUncaptured,
  saveDraft,
  sendDraft,
  simulateCustomerPaid,
  simulateScenario,
  updateSettings,
} from "./pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", wrap(async (_req, res) => {
  res.json({ ok: true, product: "SmartRecovery AI" });
}));

app.get("/api/state", wrap(async (_req, res) => {
  const state = load();
  const changed = await promoteUncaptured(state);
  if (changed) persist();
  res.json(buildView(state));
}));

app.post("/api/simulate", wrap(async (req, res) => {
  const state = load();
  const result = await simulateScenario(state, req.body.scenario);
  persist();
  res.json(buildView(state, {
    tone: "success",
    message: `${result.displayId} entered the recovery pipeline.`,
    focusId: result.transactionId,
  }));
}));

app.post("/api/transactions/:id/actions", wrap(async (req, res) => {
  const state = load();
  const result = await openAction(state, req.params.id, null, req.body.type, {
    actor: state.currentUser.name,
    automatic: false,
    extras: req.body.requestedAmount != null ? { requestedAmount: req.body.requestedAmount } : {},
  });
  persist();
  const tone = result.duplicate || result.decision?.blocked ? "error" : result.decision?.requiresApproval ? "warning" : "success";
  const message = result.duplicate
    ? "Duplicate action blocked by the idempotency key."
    : result.decision?.blocked
      ? result.action?.error || "Guardrail blocked that action."
      : result.decision?.requiresApproval || result.action?.status === "escalated" || result.action?.status === "pending_approval"
        ? "Action parked for human review. Nothing was charged."
        : "Recovery action completed. The original amount was unchanged.";
  res.json(buildView(state, { tone, message, focusId: req.params.id }));
}));

app.post("/api/transactions/:id/recover", wrap(async (req, res) => {
  const state = load();
  const result = await simulateCustomerPaid(state, req.params.id);
  persist();
  res.json(buildView(state, {
    tone: "success",
    message: `${result.displayId} was recovered at the original amount.`,
    focusId: result.transactionId,
  }));
}));

app.post("/api/transactions/:id/draft", wrap(async (req, res) => {
  const state = load();
  await saveDraft(state, req.params.id, req.body.body || "");
  persist();
  res.json(buildView(state, { tone: "success", message: "Draft saved.", focusId: req.params.id }));
}));

app.post("/api/messages/:id/send", wrap(async (req, res) => {
  const state = load();
  const result = await sendDraft(state, req.params.id, state.currentUser.name);
  persist();
  res.json(buildView(state, {
    tone: result.held ? "warning" : "success",
    message: result.held ? "Message held for human approval." : "Recovery message sent.",
  }));
}));

app.post("/api/reviews/:id/decision", wrap(async (req, res) => {
  const state = load();
  if (req.body.note) addNote(state, req.params.id, req.body.note, state.currentUser.name);
  await decideReview(state, req.params.id, req.body.decision, state.currentUser.name);
  persist();
  const labels = { approve: "Action approved.", reject: "Action rejected.", resolve: "Case marked resolved." };
  res.json(buildView(state, { tone: "success", message: labels[req.body.decision] || "Review updated." }));
}));

app.post("/api/reviews/:id/notes", wrap(async (req, res) => {
  const state = load();
  addNote(state, req.params.id, req.body.note, state.currentUser.name);
  persist();
  res.json(buildView(state, { tone: "success", message: "Note added." }));
}));

app.put("/api/settings", wrap(async (req, res) => {
  const state = load();
  updateSettings(state, req.body || {});
  const changed = await promoteUncaptured(state);
  persist();
  res.json(buildView(state, {
    tone: "success",
    message: changed ? "Settings saved. Newly expired approvals entered diagnosis." : "Settings saved.",
  }));
}));

app.post("/api/demo/reset", wrap(async (_req, res) => {
  const state = resetState();
  res.json(buildView(state, { tone: "success", message: "Demo ledger restored." }));
}));

app.get("/api/webhooks/paypal", (_req, res) => {
  res.json({
    ok: true,
    service: "SmartRecovery AI",
    endpoint: "PayPal Webhook Listener",
    status: "Active & Listening",
    method: "POST",
    supportedEvents: [
      "PAYMENT.CAPTURE.DENIED",
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      "CHECKOUT.ORDER.APPROVED",
      "PAYMENT.CAPTURE.REFUNDED",
      "PAYMENT.CAPTURE.COMPLETED",
    ],
  });
});

app.post("/api/webhooks/paypal", wrap(async (req, res) => {
  const state = load();
  const result = await handleWebhook(state, req.body || {}, req.headers);
  if (result.error) {
    persist();
    res.status(result.statusCode || 401).json({ error: result.error });
    return;
  }
  persist();
  res.json({ ok: true, ...result });
}));

const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({ error: error.message || "Unexpected error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`SmartRecovery API listening on http://localhost:${port}`);
});
