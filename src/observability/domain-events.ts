export interface DomainEventLogger {
  readonly info: (fields: Record<string, unknown>, message: string) => void;
}

export interface PeerRequestDeniedEvent {
  readonly correlationId?: string;
  /** A safe reason code, never a signature, secret, endpoint, or Jira content. */
  readonly reason: string;
  readonly route: "bootstrap" | "peer-event";
}

/**
 * Records why a peer request was refused. The caller receives only an opaque
 * error, so this local, non-content evidence is the sole place an
 * administrator can tell a forged signature from an unauthorized relationship.
 */
export function logPeerRequestDenied(
  logger: DomainEventLogger,
  event: PeerRequestDeniedEvent,
): void {
  logger.info(
    {
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      event: "scg.peer.request.denied",
      outcome: "denied",
      reason: event.reason,
      route: event.route,
    },
    "Supplychain Graph peer request denied",
  );
}

export interface PeerEventFlowEvent {
  readonly correlationId: string;
  readonly outcome:
    | "application-failed"
    | "authenticated"
    | "authorized"
    | "forwarded"
    | "received"
    | "replay-checked";
  readonly route: "peer-event";
}

/** Records the safe milestones of one peer-event delivery attempt. */
export function logPeerEventFlow(
  logger: DomainEventLogger,
  event: PeerEventFlowEvent,
): void {
  logger.info(
    {
      correlationId: event.correlationId,
      event: "scg.peer.event.flow",
      outcome: event.outcome,
      route: event.route,
    },
    "Supplychain Graph peer event flow",
  );
}

export interface GraphConnectionChangedEvent {
  readonly action: "CREATED" | "DELETED" | "UPDATED";
  readonly connectionId: string;
  readonly connectionName: string;
}

export interface GraphConnectionResultEvent
  extends GraphConnectionChangedEvent {
  /** Correlates a projection outcome to the package publication that produced it. */
  readonly correlationId?: string;
  /** Present for an indexed projection so the sink identifies its published subject. */
  readonly ingested?: number;
  readonly message: string;
  /** A safe machine-readable explanation for a suppressed or failed projection. */
  readonly reason?: string;
  readonly sourceEpicId?: string;
  readonly status?: "failed" | "indexed" | "suppressed";
  readonly success: boolean;
}

export function logGraphConnectionChanged(
  logger: DomainEventLogger,
  event: GraphConnectionChangedEvent,
): void {
  logger.info(
    {
      action: event.action,
      connectionId: event.connectionId,
      connectionName: event.connectionName,
      event: "scg.graph.connection.changed",
    },
    "Supplychain Graph connection changed",
  );
}

export function logGraphConnectionResult(
  logger: DomainEventLogger,
  event: GraphConnectionResultEvent,
): void {
  logger.info(
    {
      action: event.action,
      connectionId: event.connectionId,
      connectionName: event.connectionName,
      correlationId: event.correlationId,
      event: "scg.graph.connection.completed",
      ingested: event.ingested,
      message: event.message,
      reason: event.reason,
      sourceEpicId: event.sourceEpicId,
      status: event.status,
      success: event.success,
    },
    "Supplychain Graph connection change completed",
  );
}

export interface GraphPublishResultEvent {
  readonly connectionId?: string;
  readonly correlationId: string;
  readonly ingested?: number;
  readonly reason?: string;
  readonly sourceEpicId: string;
  readonly status: "failed" | "indexed" | "suppressed";
  readonly version?: string;
}

export function logGraphPublishResult(
  logger: DomainEventLogger,
  event: GraphPublishResultEvent,
): void {
  logger.info(
    {
      ...(event.connectionId ? { connectionId: event.connectionId } : {}),
      correlationId: event.correlationId,
      event: "scg.graph.publish.completed",
      ingested: event.ingested,
      reason: event.reason,
      sourceEpicId: event.sourceEpicId,
      status: event.status,
      version: event.version,
    },
    "Supplychain Graph package publish completed",
  );
}

export interface RovoCommentResultEvent {
  readonly commentId?: string;
  readonly connectionId?: string;
  readonly reason?: string;
  readonly sourceEpicId?: string;
  readonly status: "commented" | "failed";
  readonly version?: string;
}

export function logRovoCommentResult(
  logger: DomainEventLogger,
  event: RovoCommentResultEvent,
): void {
  logger.info(
    {
      commentId: event.commentId,
      ...(event.connectionId ? { connectionId: event.connectionId } : {}),
      event: "scg.rovo.comment.completed",
      reason: event.reason,
      sourceEpicId: event.sourceEpicId,
      status: event.status,
      version: event.version,
    },
    "Supplychain Graph Rovo comment completed",
  );
}

export interface AppInstalledEvent {
  readonly appId: string;
  readonly appVersion: string;
  readonly environmentId?: string;
  readonly installationId: string;
  readonly installerAccountId?: string;
}

export function logAppInstalled(
  logger: DomainEventLogger,
  event: AppInstalledEvent,
): void {
  logger.info(
    {
      appId: event.appId,
      appVersion: event.appVersion,
      environmentId: event.environmentId,
      event: "scg.app.installed",
      installationId: event.installationId,
      installerAccountId: event.installerAccountId,
    },
    "Supplychain Graph app installed",
  );
}

export interface AppUpgradedEvent {
  readonly appId: string;
  readonly appVersion: string;
  readonly environmentId?: string;
  readonly installationId: string;
  readonly upgraderAccountId?: string;
}

export function logAppUpgraded(
  logger: DomainEventLogger,
  event: AppUpgradedEvent,
): void {
  logger.info(
    {
      appId: event.appId,
      appVersion: event.appVersion,
      environmentId: event.environmentId,
      event: "scg.app.upgraded",
      installationId: event.installationId,
      upgraderAccountId: event.upgraderAccountId,
    },
    "Supplychain Graph app upgraded",
  );
}
