import { err, ok, type Result } from "@forge-ahead/errors";

import type { LifecycleAuditEvent } from "../audit/lifecycle-journal";

/**
 * How the app authenticates itself to the administrator's CloudEvent sink.
 * Configuration records the choice; no method delivers anything yet.
 */
export type LogSinkAuthMethod = "bearer-token" | "cloudevents-webhook";

/**
 * The egress allowlist an administrator's sink URL must fall inside.
 *
 * An admin-supplied URL cannot be reached under a statically declared egress
 * address, and a wildcard backend fetch address counts as unvalidated egress in
 * app review. The decision recorded on SCG-45 is to constrain the
 * administrator's choice instead: the region-pinned AWS API Gateway ingest
 * stacks from `specs/event-streaming.md`, and nothing else. These entries must
 * stay identical to `permissions.external.fetch.backend` in `manifest.yml`.
 */
export const permittedSinkHosts: readonly string[] = [
  "*.execute-api.ap-southeast-2.amazonaws.com",
  "*.execute-api.eu-central-1.amazonaws.com",
  "*.execute-api.us-east-1.amazonaws.com",
];

/** The non-secret half of the sink configuration, safe to read back. */
export interface LogSinkConfiguration {
  readonly authMethod: LogSinkAuthMethod;
  readonly targetUrl: string;
}

/**
 * What the frontend is allowed to learn. It carries whether a secret is on
 * record, never the secret, because an administrator page is a place a
 * credential would leak from permanently.
 */
export interface LogSinkStatus {
  readonly authMethod?: LogSinkAuthMethod;
  readonly hasSecret: boolean;
  readonly isConfigured: boolean;
  readonly targetUrl?: string;
}

export function describeLogSink(
  configuration: LogSinkConfiguration | undefined,
  hasSecret: boolean,
): LogSinkStatus {
  return configuration
    ? {
        authMethod: configuration.authMethod,
        hasSecret,
        isConfigured: true,
        targetUrl: configuration.targetUrl,
      }
    : { hasSecret, isConfigured: false };
}

export interface ConfigureLogSinkCommand {
  readonly actorAccountId?: string;
  readonly authMethod: string;
  readonly occurredAt: string;
  /** The egress hosts this app is allowed to reach, mirroring the manifest. */
  readonly permittedSinkHosts: readonly string[];
  readonly secret: string;
  readonly targetUrl: string;
}

export interface ConfiguredLogSink {
  readonly auditEvent: LifecycleAuditEvent;
  readonly configuration: LogSinkConfiguration;
  readonly secret: string;
}

export interface ClearLogSinkCommand {
  readonly actorAccountId?: string;
  readonly occurredAt: string;
}

/**
 * The evidence half of a reset. Clearing storage is the adapter's job; what
 * this decides is what the tenant keeps as proof of who cleared it and when.
 */
export function clearLogSink(command: ClearLogSinkCommand): {
  readonly auditEvent: LifecycleAuditEvent;
} {
  return {
    auditEvent: {
      ...(command.actorAccountId
        ? { actorAccountId: command.actorAccountId }
        : {}),
      eventId: `audit:log-sink:cleared:${command.occurredAt}`,
      eventType: "logging.sink-cleared",
      occurredAt: command.occurredAt,
      outcome: "recorded",
    },
  };
}

/** Safe reason codes. Each names a field, never a field's value. */
export type ConfigureLogSinkError = {
  readonly code:
    | "log-sink-auth-method-unknown"
    | "log-sink-host-not-permitted"
    | "log-sink-secret-missing"
    | "log-sink-url-carries-credentials"
    | "log-sink-url-not-absolute"
    | "log-sink-url-not-https";
};

const authMethods: readonly LogSinkAuthMethod[] = [
  "bearer-token",
  "cloudevents-webhook",
];

function isAuthMethod(value: string): value is LogSinkAuthMethod {
  return (authMethods as readonly string[]).includes(value);
}

/**
 * Matches one allowlist entry. A `*.` entry matches a subdomain of the named
 * domain, never the bare domain and never a host that merely ends in its text,
 * which is how `evil.example.com.attacker.test` would otherwise slip through.
 */
function hostMatches(host: string, permitted: string): boolean {
  if (!permitted.startsWith("*.")) {
    return host === permitted;
  }

  const domain = permitted.slice(2);

  return host.endsWith(`.${domain}`);
}

/**
 * Validates an administrator's sink configuration. The secret travels through
 * this function but is never part of an error, so a rejection can be shown to
 * the administrator verbatim.
 */
export function configureLogSink(
  command: ConfigureLogSinkCommand,
): Result<ConfiguredLogSink, ConfigureLogSinkError> {
  let parsed: URL;
  try {
    parsed = new URL(command.targetUrl);
  } catch {
    return err({ code: "log-sink-url-not-absolute" });
  }

  if (parsed.protocol !== "https:") {
    return err({ code: "log-sink-url-not-https" });
  }

  if (
    !command.permittedSinkHosts.some((permitted) =>
      hostMatches(parsed.hostname, permitted),
    )
  ) {
    return err({ code: "log-sink-host-not-permitted" });
  }

  // Credentials in a URL would be persisted in plain app storage and repeated
  // in every delivery log line, so the app refuses them outright rather than
  // silently stripping what the administrator meant to authenticate with.
  if (parsed.username || parsed.password) {
    return err({ code: "log-sink-url-carries-credentials" });
  }

  if (!isAuthMethod(command.authMethod)) {
    return err({ code: "log-sink-auth-method-unknown" });
  }

  if (!command.secret.trim()) {
    return err({ code: "log-sink-secret-missing" });
  }

  return ok({
    // The sink URL is deliberately absent from the evidence: a query string is
    // a common place to carry a delivery token, so the journal keeps only the
    // method that was chosen.
    auditEvent: {
      ...(command.actorAccountId
        ? { actorAccountId: command.actorAccountId }
        : {}),
      eventId: `audit:log-sink:configured:${command.occurredAt}`,
      eventType: "logging.sink-configured",
      occurredAt: command.occurredAt,
      outcome: "recorded",
      reason: command.authMethod,
    },
    configuration: {
      authMethod: command.authMethod,
      targetUrl: command.targetUrl,
    },
    secret: command.secret,
  });
}
