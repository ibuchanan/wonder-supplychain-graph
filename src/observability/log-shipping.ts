import type { LogSinkConfiguration } from "./log-sink-configuration";

export interface ShippedLogEvent {
  readonly correlationId?: string;
  readonly fields: Record<string, unknown>;
  readonly id: string;
  readonly occurredAt: string;
}

export interface LogSinkDelivery {
  readonly body: {
    readonly data: Record<string, unknown>;
    readonly datacontenttype: "application/json";
    readonly id: string;
    readonly source: string;
    readonly specversion: "1.0";
    readonly time: string;
    readonly type: string;
  };
  readonly headers: { readonly Authorization: string };
  readonly url: string;
}

export interface LogSinkDeliverer {
  readonly deliver: (
    request: LogSinkDelivery,
  ) => Promise<{ readonly ok: boolean }>;
}

export interface LogShippingFailure {
  readonly eventId: string;
  readonly reason: "delivery-error" | "non-success-response";
  readonly type: string;
}

export interface ShipLogEventCommand extends LogSinkDeliverer {
  readonly configuration?: LogSinkConfiguration;
  readonly event: ShippedLogEvent;
  readonly installationId: string;
  readonly logFailure?: (failure: LogShippingFailure) => void;
  readonly secret?: string;
}

const permittedDataFields = new Set([
  "action",
  "appId",
  "appVersion",
  "commentId",
  "connectionId",
  "event",
  "eventType",
  "ingested",
  "installationId",
  "outcome",
  "reason",
  "relationshipId",
  "route",
  "status",
  "version",
]);

function safeFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([field, value]) =>
        permittedDataFields.has(field) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    ),
  );
}

function cloudEventType(fields: Record<string, unknown>): string {
  if (typeof fields["event"] === "string") {
    return fields["event"];
  }

  return `scg.audit.${String(fields["eventType"])}`;
}

export async function shipLogEvent(
  command: ShipLogEventCommand,
): Promise<void> {
  if (!command.configuration || !command.secret) {
    return;
  }

  const { event } = command;
  const type = cloudEventType(event.fields);

  try {
    const response = await command.deliver({
      body: {
        data: {
          ...(event.correlationId
            ? { correlationId: event.correlationId }
            : {}),
          ...safeFields(event.fields),
        },
        datacontenttype: "application/json",
        id: event.id,
        source: command.installationId,
        specversion: "1.0",
        time: event.occurredAt,
        type,
      },
      headers: { Authorization: `Bearer ${command.secret}` },
      url: command.configuration.targetUrl,
    });

    if (!response.ok) {
      command.logFailure?.({
        eventId: event.id,
        reason: "non-success-response",
        type,
      });
    }
  } catch {
    command.logFailure?.({
      eventId: event.id,
      reason: "delivery-error",
      type,
    });
  }
}
