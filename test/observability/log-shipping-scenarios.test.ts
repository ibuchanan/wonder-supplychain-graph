import { describe, expect, it } from "vitest";

import {
  type LogSinkDelivery,
  shipLogEvent,
} from "../../src/observability/log-shipping";

const configuration = {
  authMethod: "bearer-token" as const,
  targetUrl: "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events",
};
const sentinels = {
  endpoint: "https://peer.example/events/sentinel-endpoint",
  jiraContent: "sentinel Jira issue description",
  secret: "sentinel-shared-secret",
  signature: "sha256=sentinel-signature",
};
const emittedEventTypes = [
  "scg.app.installed",
  "scg.app.upgraded",
  "scg.graph.connection.changed",
  "scg.graph.connection.completed",
  "scg.graph.connection.rejected",
  "scg.graph.publish.completed",
  "scg.peer.request.denied",
  "scg.peer.event.flow",
  "scg.rovo.comment.completed",
  "scg.audit.relationship.revoked",
] as const;

async function ship(
  fields: Record<string, unknown>,
  correlationId = "correlation-001",
): Promise<LogSinkDelivery[]> {
  const deliveries: LogSinkDelivery[] = [];
  await shipLogEvent({
    configuration,
    deliver: async (request) => {
      if ("body" in request) deliveries.push(request);
      return { ok: true };
    },
    event: {
      correlationId,
      fields,
      id: "event-001",
      occurredAt: "2026-09-15T12:00:00.000Z",
    },
    installationId: "installation-001",
    secret: "sink-secret",
  });
  return deliveries;
}

describe("log-shipping scenarios", () => {
  it("serves the audit reader: ships a revoked relationship's actor, subject, time, outcome, reason, and correlation", async () => {
    const deliveries = await ship({
      actorAccountId: "account-001",
      eventType: "relationship.revoked",
      outcome: "recorded",
      reason: "administrator-revoked",
      relationshipId: "relationship-001",
    });

    expect(deliveries[0]?.body).toMatchObject({
      data: {
        actorAccountId: "account-001",
        correlationId: "correlation-001",
        eventType: "relationship.revoked",
        outcome: "recorded",
        reason: "administrator-revoked",
        relationshipId: "relationship-001",
      },
      time: "2026-09-15T12:00:00.000Z",
      type: "scg.audit.relationship.revoked",
    });
  });

  it("serves the audit reader: preserves a recorded package publication's subject and correlation", async () => {
    const deliveries = await ship({
      event: "scg.graph.publish.completed",
      ingested: 3,
      reason: "published",
      sourceEpicId: "MFG-17",
      status: "indexed",
    });

    expect(deliveries[0]?.body.data).toMatchObject({
      correlationId: "correlation-001",
      ingested: 3,
      reason: "published",
      sourceEpicId: "MFG-17",
      status: "indexed",
    });
  });

  it("serves the audit reader: ships a denied peer request's actor, subject, time, outcome, reason, and correlation", async () => {
    const deliveries = await ship({
      actorAccountId: "account-001",
      event: "scg.peer.request.denied",
      outcome: "denied",
      reason: "relationship-unauthorized",
      route: "peer-event",
    });

    expect(deliveries[0]?.body).toMatchObject({
      data: {
        actorAccountId: "account-001",
        correlationId: "correlation-001",
        event: "scg.peer.request.denied",
        outcome: "denied",
        reason: "relationship-unauthorized",
        route: "peer-event",
      },
      time: "2026-09-15T12:00:00.000Z",
      type: "scg.peer.request.denied",
    });
  });

  it("serves the operator reader: distinguishes sink failure, suppression, and signature rejection", async () => {
    const failures: unknown[] = [];
    await shipLogEvent({
      configuration,
      deliver: async () => ({ ok: false }),
      event: {
        fields: { event: "scg.graph.publish.completed" },
        id: "failed-delivery",
        occurredAt: "2026-09-15T12:00:00.000Z",
      },
      installationId: "installation-001",
      logFailure: (failure) => failures.push(failure),
      secret: "sink-secret",
    });
    const [suppressed] = await ship({
      event: "scg.graph.publish.completed",
      reason: "already-current",
      sourceEpicId: "MFG-17",
      status: "suppressed",
    });
    const [rejected] = await ship({
      event: "scg.peer.request.denied",
      outcome: "denied",
      reason: "signature-mismatch",
      route: "peer-event",
    });

    expect(failures).toEqual([
      {
        eventId: "failed-delivery",
        reason: "non-success-response",
        type: "scg.graph.publish.completed",
      },
    ]);
    expect(suppressed?.body.data).toMatchObject({
      reason: "already-current",
      status: "suppressed",
    });
    expect(rejected?.body.data).toMatchObject({
      reason: "signature-mismatch",
      route: "peer-event",
    });
  });

  it.each(emittedEventTypes)(
    "redacts sentinels for every emitted event type: %s",
    async (event) => {
      const deliveries = await ship({
        endpointUrl: sentinels.endpoint,
        event,
        issueDescription: sentinels.jiraContent,
        peerDeliveryEndpoint: sentinels.endpoint,
        secret: sentinels.secret,
        signature: sentinels.signature,
      });

      const shipped = JSON.stringify(deliveries);
      for (const sentinel of Object.values(sentinels))
        expect(shipped).not.toContain(sentinel);
    },
  );
});
