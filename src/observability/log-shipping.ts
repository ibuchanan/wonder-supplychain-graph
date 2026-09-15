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
  readonly headers: Readonly<Record<string, string>>;
  readonly url: string;
}

export interface CloudEventsWebhookValidation {
  readonly headers: { readonly "WebHook-Request-Origin": string };
  readonly method: "OPTIONS";
  readonly url: string;
}

export interface LogSinkDeliverer {
  readonly deliver: (
    request: LogSinkDelivery | CloudEventsWebhookValidation,
  ) => Promise<{
    readonly headers?: Readonly<Record<string, string>>;
    readonly ok: boolean;
  }>;
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

export interface ValidateCloudEventsWebhookCommand extends LogSinkDeliverer {
  readonly configuration: LogSinkConfiguration;
  readonly installationId: string;
}

export type CloudEventsWebhookValidationResult =
  | { readonly status: "validated" }
  | {
      readonly reason:
        | "webhook-origin-not-allowed"
        | "webhook-validation-failed";
      readonly status: "rejected";
    };

const permittedDataFields = new Set([
  "action",
  "actorAccountId",
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
  "sourceEpicId",
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

function webhookHeaders(installationId: string): {
  readonly "WebHook-Request-Origin": string;
} {
  return { "WebHook-Request-Origin": installationId };
}

function header(
  headers: Readonly<Record<string, string>> | undefined,
  name: string,
): string | undefined {
  return Object.entries(headers ?? {}).find(
    ([candidate]) => candidate.toLowerCase() === name.toLowerCase(),
  )?.[1];
}

/** Performs the CloudEvents HTTP Webhook abuse-protection handshake. */
export async function validateCloudEventsWebhook(
  command: ValidateCloudEventsWebhookCommand,
): Promise<CloudEventsWebhookValidationResult> {
  if (command.configuration.authMethod !== "cloudevents-webhook") {
    return { status: "validated" };
  }

  try {
    const response = await command.deliver({
      headers: webhookHeaders(command.installationId),
      method: "OPTIONS",
      url: command.configuration.targetUrl,
    });
    if (!response.ok) {
      return { reason: "webhook-validation-failed", status: "rejected" };
    }

    const allowedOrigins = header(response.headers, "WebHook-Allowed-Origin")
      ?.split(",")
      .map((origin) => origin.trim());

    return allowedOrigins?.includes(command.installationId) ||
      allowedOrigins?.includes("*")
      ? { status: "validated" }
      : { reason: "webhook-origin-not-allowed", status: "rejected" };
  } catch {
    return { reason: "webhook-validation-failed", status: "rejected" };
  }
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
      headers:
        command.configuration.authMethod === "cloudevents-webhook"
          ? webhookHeaders(command.installationId)
          : { Authorization: `Bearer ${command.secret}` },
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
