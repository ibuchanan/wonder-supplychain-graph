import { describe, expect, it } from "vitest";

import {
  type NominatePeerCxCommand,
  nominatePeerCx,
  type PeerCxSetupState,
} from "../../src/pairing/peer-cx-nomination";

const emptyState = (): PeerCxSetupState => ({
  nominations: [],
  processedIdempotencyKeys: [],
  peerCxs: [],
});

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const terms = {
  allowedOperations: ["starter.delivery"] as const,
  expiresAt: "2026-09-21T12:00:00.000Z",
  termsVersion: "v1",
} as const;

const nominateCommand: NominatePeerCxCommand = {
  actor: "blue-administrator",
  consentedAt: "2026-09-14T18:00:00.000Z",
  correlationId: "correlation-001",
  idempotencyKey: "nominate-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  invitationReference: "reference-001",
  localIdentity: blueIdentity,
  localReadiness: "ready",
  operation: "peer-cx.nominate",
  direction: "blue-to-green",
  receiverEndpointStatus: "configured",
  peerCxId: "peer-cx-001",
  requestId: "request-001",
  terms,
};

describe("nominatePeerCx", () => {
  it("records Blue local consent as pending and builds an endpoint-free nomination request", () => {
    const result = nominatePeerCx(emptyState(), nominateCommand);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a ready Blue site to nominate itself");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          correlationId: "correlation-001",
          counterpartSiteAri: "ari:cloud:jira::site/green-site",
          idempotencyKey: "nominate-001",
          invitationReference: "reference-001",
          nominatedIdentity: blueIdentity,
          receiverEndpointStatus: "configured",
          peerCxId: "peer-cx-001",
          role: "blue",
          status: "awaiting-green-approval",
          terms,
        },
      ],
      processedIdempotencyKeys: ["nominate-001"],
      peerCxs: [],
    });
    expect(result.value.request).toEqual({
      correlationId: "correlation-001",
      createdAt: "2026-09-14T18:00:00.000Z",
      idempotencyKey: "nominate-001",
      intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
      invitationReference: "reference-001",
      nominatedIdentity: blueIdentity,
      operation: "peer-cx.nominate",
      direction: "blue-to-green",
      protocolVersion: "v1",
      receiverEndpointStatus: "configured",
      peerCxId: "peer-cx-001",
      requestId: "request-001",
      terms,
    });
  });

  it("refuses to nominate, and sends nothing, while local readiness is blocked", () => {
    const state = emptyState();

    const result = nominatePeerCx(state, {
      ...nominateCommand,
      localReadiness: "blocked",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected a blocked Blue site to refuse nomination");
    }
    expect(result.error).toEqual({ code: "local-readiness-blocked" });
    expect(state).toEqual(emptyState());
  });

  it("replays the recorded nomination when Blue resubmits the same consent", () => {
    const first = nominatePeerCx(emptyState(), nominateCommand);
    if (first.isErr()) {
      expect.unreachable("Expected the first nomination to be recorded");
    }

    const second = nominatePeerCx(first.value.nextState, nominateCommand);

    expect(second.isOk()).toBe(true);
    if (second.isErr()) {
      expect.unreachable("Expected a duplicate nomination to replay safely");
    }
    expect(second.value.nextState).toEqual(first.value.nextState);
    expect(second.value.request).toEqual(first.value.request);
  });
});
