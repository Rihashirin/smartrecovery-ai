export type TransactionStatus =
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'approved'
  | 'approved_uncaptured'
  | 'recovered';

export type RiskLevel = 'low' | 'medium' | 'high';
export type Uncertainty = 'low' | 'medium' | 'high';

export type ActionType =
  | 'invoice'
  | 'message'
  | 'schedule_retry'
  | 'escalate_human'
  | 'reminder';

export type ActionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'escalated'
  | 'pending_approval'
  | 'rejected';

export interface GuardrailCheck {
  id: string;
  title: string;
  outcome: 'allow' | 'hold' | 'block';
  detail: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  paypalPayerId?: string;
  riskScore: number;
  segment?: string;
  transactionCount?: number;
  failedCount?: number;
  recoveredRevenue?: number;
  openAmount?: number;
  createdAt: string;
}

export interface AIDiagnosis {
  id: string;
  transactionId: string;
  rootCause: string;
  explanation: string;
  category: string;
  categoryLabel: string;
  riskLevel: RiskLevel;
  recoveryProbability: number;
  recommendedAction: ActionType;
  uncertainty: Uncertainty;
  verifiedFacts: string[];
  hypotheses: string[];
  suggestedMessage?: string;
  model: string;
  policyLocked: boolean;
  createdAt: string;
}

export interface RecoveryAction {
  id: string;
  transactionId: string;
  type: ActionType;
  status: ActionStatus;
  idempotencyKey: string;
  requiresApproval: boolean;
  checks: GuardrailCheck[];
  result?: {
    paypalInvoiceId?: string;
    invoiceUrl?: string;
    targetAmount?: number;
    recommendedRetryAt?: string;
    reason?: string;
    message?: string;
  } | null;
  error?: string | null;
  actor: string;
  automatic: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export interface CustomerMessage {
  id: string;
  transactionId: string;
  customerId: string;
  actionId?: string;
  channel: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'failed';
  deliveryDetail?: string;
  aiGenerated: boolean;
  createdAt: string;
  sentAt?: string | null;
}

export interface ReviewNote {
  id: string;
  actor: string;
  text: string;
  createdAt: string;
}

export interface HumanReview {
  id: string;
  transactionId: string;
  actionId?: string;
  reason: string;
  reasonLabel: string;
  status: 'open' | 'approved' | 'rejected' | 'resolved';
  notes: ReviewNote[];
  createdAt: string;
  resolvedAt?: string | null;
  transaction?: Transaction | null;
}

export interface PaymentEventItem {
  id: string;
  eventType: string;
  signatureStatus: 'verified' | 'simulated' | 'rejected';
  receivedAt: string;
}

export interface Transaction {
  id: string;
  displayId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  eventType: string;
  failureCode?: string | null;
  failureReason?: string | null;
  paymentMethod?: string | null;
  subscriptionId?: string | null;
  orderId?: string | null;
  captureId?: string | null;
  recoveredAmount: number;
  approvedAt?: string | null;
  recoveredAt?: string | null;
  retryAt?: string | null;
  pipelineRan: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
  diagnosis?: AIDiagnosis | null;
  actions: RecoveryAction[];
  messages: CustomerMessage[];
  reviews: HumanReview[];
  events: PaymentEventItem[];
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  decision: 'allow' | 'block' | 'hold' | 'info';
  details: string;
  createdAt: string;
}

export interface Settings {
  merchantName: string;
  supportEmail: string;
  uncapturedThresholdMinutes: number;
  highValueApprovalAmount: number;
  repeatFailureThreshold: number;
  autoExecuteSafeActions: boolean;
}

export interface IntegrationFlags {
  gemini?: boolean;
  openai: boolean;
  paypal?: boolean;
  paypalSandbox: boolean;
  model: string;
  webhookVerified: boolean;
  paypalMode?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RuleInfo {
  id: string;
  title: string;
  detail: string;
}

export interface AppState {
  notice?: {
    tone: 'success' | 'warning' | 'error';
    message: string;
    focusId?: string;
  } | null;
  generatedAt: string;
  integration: IntegrationFlags;
  settings: Settings;
  currentUser: CurrentUser;
  rules: RuleInfo[];
  transactions: Transaction[];
  customers: Customer[];
  reviews: HumanReview[];
  auditLogs: AuditLog[];
  webhookUrl: string;
}

