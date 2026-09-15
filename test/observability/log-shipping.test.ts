import { describe, expect, it } from "vitest";

import {
  shipLogEvent,
  validateCloudEventsWebhook,
} from "../../src/observability/log-shipping";

describe("log shipping port", () => {
  it("renders a domain event as a redacted CloudEvent and sends it with bearer authentication", async () => {
    const deliveries: unknown[] = [];

    await shipLogEvent({
      configuration: {
        authMethod: "bearer-token",
        targetUrl:
          "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
      },
      deliver: async (request) => {
        deliveries.push(request);
        return { ok: true };
      },
      event: {
        correlationId: "corr-001",
        fields: {
          event: "scg.peer.request.denied",
          outcome: "denied",
          reason: "signature-mismatch",
          route: "peer-event",
          secret: "must-not-ship",
          signature: "sha256=must-not-ship",
          peerDeliveryEndpoint: "https://peer.example/events",
          issueDescription: "must-not-ship",
          metadata: {
            issue: { description: "must-not-ship" },
            secret: "must-not-ship",
          },
        },
        id: "event-001",
        occurredAt: "2026-09-15T12:00:00.000Z",
      },
      installationId: "ari:cloud:ecosystem::installation/tenant-001",
      secret: "sink-bearer-token",
    });

    expect(deliveries).toEqual([
      {
        body: {
          data: {
            correlationId: "corr-001",
            event: "scg.peer.request.denied",
            outcome: "denied",
            reason: "signature-mismatch",
            route: "peer-event",
          },
          datacontenttype: "application/json",
          id: "event-001",
          source: "ari:cloud:ecosystem::installation/tenant-001",
          specversion: "1.0",
          time: "2026-09-15T12:00:00.000Z",
          type: "scg.peer.request.denied",
        },
        headers: { Authorization: "Bearer sink-bearer-token" },
        url: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
      },
    ]);
  });

  it("renders an audit event with a stable CloudEvent type", async () => {
    const deliveries: unknown[] = [];

    await shipLogEvent({
      configuration: {
        authMethod: "bearer-token",
        targetUrl:
          "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
      },
      deliver: async (request) => {
        deliveries.push(request);
        return { ok: true };
      },
      event: {
        correlationId: "corr-002",
        fields: {
          eventType: "relationship.revoked",
          outcome: "recorded",
          reason: "administrator-revoked",
          relationshipId: "relationship-001",
        },
        id: "audit-001",
        occurredAt: "2026-09-15T12:08:00.000Z",
      },
      installationId: "ari:cloud:ecosystem::installation/tenant-001",
      secret: "sink-bearer-token",
    });

    expect(deliveries).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({
          data: expect.objectContaining({ correlationId: "corr-002" }),
          type: "scg.audit.relationship.revoked",
        }),
      }),
    ]);
  });

  it("logs delivery failures without changing the originating operation outcome", async () => {
    const failures: unknown[] = [];

    await expect(
      shipLogEvent({
        configuration: {
          authMethod: "bearer-token",
          targetUrl:
            "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
        },
        deliver: async () => ({ ok: false }),
        event: {
          fields: { event: "scg.app.installed" },
          id: "event-003",
          occurredAt: "2026-09-15T12:10:00.000Z",
        },
        installationId: "ari:cloud:ecosystem::installation/tenant-001",
        logFailure: (failure) => failures.push(failure),
        secret: "sink-bearer-token",
      }),
    ).resolves.toBeUndefined();

    expect(failures).toEqual([
      {
        eventId: "event-003",
        reason: "non-success-response",
        type: "scg.app.installed",
      },
    ]);
  });

  it("does not attempt delivery when no sink is configured", async () => {
    const deliver = async () => {
      throw new Error("delivery must not be attempted");
    };

    await expect(
      shipLogEvent({
        deliver,
        event: {
          fields: { event: "scg.app.installed" },
          id: "event-002",
          occurredAt: "2026-09-15T12:05:00.000Z",
        },
        installationId: "ari:cloud:ecosystem::installation/tenant-001",
      }),
    ).resolves.toBeUndefined();
  });

  it("validates a CloudEvents webhook before shipping an identical event with webhook semantics", async () => {
    const requests: unknown[] = [];
    const configuration = {
      authMethod: "cloudevents-webhook" as const,
      targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
    };
    const deliver = async (request: unknown) => {
      requests.push(request);
      return {
        headers: {
          "webhook-allowed-origin":
            "ari:cloud:ecosystem::installation/tenant-001",
        },
        ok: true,
      };
    };

    await expect(
      validateCloudEventsWebhook({
        configuration,
        deliver,
        installationId: "ari:cloud:ecosystem::installation/tenant-001",
      }),
    ).resolves.toEqual({ status: "validated" });

    await shipLogEvent({
      configuration,
      deliver,
      event: {
        correlationId: "corr-001",
        fields: { event: "scg.peer.request.denied", outcome: "denied" },
        id: "event-001",
        occurredAt: "2026-09-15T12:00:00.000Z",
      },
      installationId: "ari:cloud:ecosystem::installation/tenant-001",
      secret: "unchanged-secret",
    });

    expect(requests).toEqual([
      {
        headers: {
          "WebHook-Request-Origin":
            "ari:cloud:ecosystem::installation/tenant-001",
        },
        method: "OPTIONS",
        url: configuration.targetUrl,
      },
      {
        body: {
          data: {
            correlationId: "corr-001",
            event: "scg.peer.request.denied",
            outcome: "denied",
          },
          datacontenttype: "application/json",
          id: "event-001",
          source: "ari:cloud:ecosystem::installation/tenant-001",
          specversion: "1.0",
          time: "2026-09-15T12:00:00.000Z",
          type: "scg.peer.request.denied",
        },
        headers: {
          "WebHook-Request-Origin":
            "ari:cloud:ecosystem::installation/tenant-001",
        },
        url: configuration.targetUrl,
      },
    ]);
    expect(JSON.stringify(requests)).not.toContain("unchanged-secret");
  });

  it("refuses a webhook that does not authorize this installation", async () => {
    await expect(
      validateCloudEventsWebhook({
        configuration: {
          authMethod: "cloudevents-webhook",
          targetUrl:
            "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
        },
        deliver: async () => ({
          headers: {
            "WebHook-Allowed-Origin": "ari:cloud:ecosystem::installation/other",
          },
          ok: true,
        }),
        installationId: "ari:cloud:ecosystem::installation/tenant-001",
      }),
    ).resolves.toEqual({
      reason: "webhook-origin-not-allowed",
      status: "rejected",
    });
  });
});
