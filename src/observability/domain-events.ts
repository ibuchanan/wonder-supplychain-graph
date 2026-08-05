export interface DomainEventLogger {
  readonly info: (fields: Record<string, unknown>, message: string) => void;
}

export interface GraphConnectionChangedEvent {
  readonly action: "CREATED" | "DELETED" | "UPDATED";
  readonly connectionId: string;
  readonly connectionName: string;
}

export interface GraphConnectionResultEvent
  extends GraphConnectionChangedEvent {
  readonly message: string;
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
      event: "scg.graph.connection.completed",
      message: event.message,
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
