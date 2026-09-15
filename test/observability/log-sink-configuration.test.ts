import { describe, expect, it } from "vitest";

import {
  clearLogSink,
  configureLogSink,
  describeLogSink,
} from "../../src/observability/log-sink-configuration";

const permittedSinkHosts = ["*.execute-api.us-east-1.amazonaws.com"] as const;

describe("configureLogSink", () => {
  it("accepts an HTTPS sink on a permitted host with an auth method and a secret", () => {
    const result = configureLogSink({
      actorAccountId: "ada-blue-account",
      authMethod: "bearer-token",
      occurredAt: "2026-09-15T12:00:00.000Z",
      permittedSinkHosts,
      secret: "sink-bearer-token",
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a permitted HTTPS sink to be accepted");
    }
    expect(result.value.configuration).toEqual({
      authMethod: "bearer-token",
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
    });
    expect(result.value.secret).toBe("sink-bearer-token");
  });

  it("rejects a sink that is not an absolute HTTPS URL, and says why without echoing the secret", () => {
    for (const [targetUrl, code] of [
      ["/v1/events", "log-sink-url-not-absolute"],
      ["not a URL", "log-sink-url-not-absolute"],
      [
        "http://ingest.execute-api.us-east-1.amazonaws.com/v1",
        "log-sink-url-not-https",
      ],
    ] as const) {
      const result = configureLogSink({
        authMethod: "bearer-token",
        occurredAt: "2026-09-15T12:00:00.000Z",
        permittedSinkHosts,
        secret: "sink-bearer-token",
        targetUrl,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable(`Expected ${targetUrl} to be rejected`);
      }
      expect(result.error).toEqual({ code });
      expect(JSON.stringify(result.error)).not.toContain("sink-bearer-token");
    }
  });

  it("rejects a host outside the declared egress allowlist, so no sink URL escapes validated egress", () => {
    for (const targetUrl of [
      "https://logs.attacker.example/v1/events",
      // A permitted suffix is not a permitted host: the wildcard matches a
      // subdomain of the allowlisted domain, not a domain that merely ends in
      // its text.
      "https://execute-api.us-east-1.amazonaws.com.attacker.example/v1",
      "https://execute-api.us-east-1.amazonaws.com/v1",
    ]) {
      const result = configureLogSink({
        authMethod: "bearer-token",
        occurredAt: "2026-09-15T12:00:00.000Z",
        permittedSinkHosts,
        secret: "sink-bearer-token",
        targetUrl,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable(`Expected ${targetUrl} to be rejected`);
      }
      expect(result.error).toEqual({ code: "log-sink-host-not-permitted" });
    }
  });

  it("rejects a URL carrying credentials, so no secret can be smuggled into stored configuration", () => {
    const result = configureLogSink({
      authMethod: "bearer-token",
      occurredAt: "2026-09-15T12:00:00.000Z",
      permittedSinkHosts,
      secret: "sink-bearer-token",
      targetUrl:
        "https://svc:hunter2@ingest.execute-api.us-east-1.amazonaws.com/v1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a URL with embedded credentials to fail");
    }
    expect(result.error).toEqual({ code: "log-sink-url-carries-credentials" });
    expect(JSON.stringify(result.error)).not.toContain("hunter2");
  });

  it("rejects an unrecognised auth method and an absent secret", () => {
    const base = {
      occurredAt: "2026-09-15T12:00:00.000Z",
      permittedSinkHosts,
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
    };

    expect(
      configureLogSink({
        ...base,
        authMethod: "basic-auth",
        secret: "sink-bearer-token",
      }).isErr(),
    ).toBe(true);
    expect(
      configureLogSink({
        ...base,
        authMethod: "cloudevents-webhook",
        secret: "   ",
      }).isErr(),
    ).toBe(true);
  });
});

describe("describeLogSink", () => {
  it("reports the configured sink and that a secret is on record, never the secret itself", () => {
    const status = describeLogSink(
      {
        authMethod: "cloudevents-webhook",
        targetUrl:
          "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
      },
      true,
    );

    expect(status).toEqual({
      authMethod: "cloudevents-webhook",
      hasSecret: true,
      isConfigured: true,
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
    });
    expect(Object.keys(status)).not.toContain("secret");
  });

  it("reports an unconfigured app when no sink is stored", () => {
    expect(describeLogSink(undefined, false)).toEqual({
      hasSecret: false,
      isConfigured: false,
    });
  });

  it("reports a half-written configuration as configured without a secret, so the administrator can see what is missing", () => {
    expect(
      describeLogSink(
        {
          authMethod: "bearer-token",
          targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1",
        },
        false,
      ),
    ).toEqual({
      authMethod: "bearer-token",
      hasSecret: false,
      isConfigured: true,
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1",
    });
  });
});

describe("log sink audit evidence", () => {
  it("names the actor and the outcome of a save, and carries no sink URL or secret", () => {
    const result = configureLogSink({
      actorAccountId: "ada-blue-account",
      authMethod: "bearer-token",
      occurredAt: "2026-09-15T12:00:00.000Z",
      permittedSinkHosts,
      secret: "sink-bearer-token",
      targetUrl:
        "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events?token=leak",
    });

    if (result.isErr()) {
      expect.unreachable("Expected a permitted HTTPS sink to be accepted");
    }
    expect(result.value.auditEvent).toEqual({
      actorAccountId: "ada-blue-account",
      eventId: "audit:log-sink:configured:2026-09-15T12:00:00.000Z",
      eventType: "logging.sink-configured",
      occurredAt: "2026-09-15T12:00:00.000Z",
      outcome: "recorded",
      reason: "bearer-token",
    });
    const evidence = JSON.stringify(result.value.auditEvent);
    expect(evidence).not.toContain("sink-bearer-token");
    expect(evidence).not.toContain("amazonaws.com");
    expect(evidence).not.toContain("leak");
  });

  it("names the actor and the outcome of a reset", () => {
    expect(
      clearLogSink({
        actorAccountId: "ada-blue-account",
        occurredAt: "2026-09-15T13:00:00.000Z",
      }).auditEvent,
    ).toEqual({
      actorAccountId: "ada-blue-account",
      eventId: "audit:log-sink:cleared:2026-09-15T13:00:00.000Z",
      eventType: "logging.sink-cleared",
      occurredAt: "2026-09-15T13:00:00.000Z",
      outcome: "recorded",
    });
  });

  it("records evidence even when the acting account is unknown to the tenant", () => {
    expect(
      clearLogSink({ occurredAt: "2026-09-15T13:00:00.000Z" }).auditEvent,
    ).not.toHaveProperty("actorAccountId");
  });
});
