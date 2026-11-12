export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function audit(stateRef, entry) {
  stateRef.auditLogs.unshift({
    id: uid("aud"),
    createdAt: new Date().toISOString(),
    actor: entry.actor || "System",
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId || null,
    decision: entry.decision || "info",
    details: entry.details,
  });
  if (stateRef.auditLogs.length > 400) stateRef.auditLogs.length = 400;
}
