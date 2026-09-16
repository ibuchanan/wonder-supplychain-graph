import { describe, expect, it } from "vitest";

import {
  type ActivationPollRequest,
  proposePeerCxActivation,
} from "../../src/pairing/peer-cx-activation";
import type {
  NominationStatus,
  PeerCxSetupState,
} from "../../src/pairing/peer-cx-nomination";

const greenIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/green-development",
  installationAri: "ari:cloud:ecosystem::installation/green-installation",
  siteAri: "ari:cloud:jira::site/green-site",
} as const;

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

const greenState = (status: NominationStatus): PeerCxSetupState => ({
  nominations: [
    {
      correlationId: "correlation-001",
      counterpartSiteAri: blueIdentity.siteAri,
      idempotencyKey: "nominate-001",
      invitationReference: "reference-001",
      nominatedIdentity: blueIdentity,
      receiverEndpointStatus: "configured",
      peerCxId: "peer-cx-001",
      role: "green",
      status,
      terms,
    },
  ],
  processedIdempotencyKeys: ["nominate-001"],
  peerCxs: [],
});

const pollRequest: ActivationPollRequest = {
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:05:00.000Z",
  intendedReceiverSiteAri: greenIdentity.siteAri,
  nominatedIdentity: blueIdentity,
  operation: "peer-cx.poll",
  direction: "blue-to-green",
  protocolVersion: "v1",
  peerCxId: "peer-cx-001",
  requestId: "poll-request-001",
  termsVersion: "v1",
};

const context = {
  localIdentity: greenIdentity,
  now: "2026-09-14T19:05:01.000Z",
};

describe("proposePeerCxActivation", () => {
  it("returns no activation proposal while Green approval is still outstanding", () => {
    const result = proposePeerCxActivation(
      greenState("awaiting-green-approval"),
      pollRequest,
      context,
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a bounded poll before approval to succeed");
    }
    expect(result.value).toEqual({ outcome: "awaiting-green-approval" });
  });

  it("returns the approved activation proposal, naming Green as the counterpart", () => {
    const result = proposePeerCxActivation(
      greenState("awaiting-blue-confirmation"),
      pollRequest,
      context,
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected an approved nomination to be proposed");
    }
    expect(result.value).toEqual({
      outcome: "awaiting-blue-confirmation",
      proposal: {
        approvedIdentity: blueIdentity,
        correlationId: "correlation-001",
        counterpartSiteAri: greenIdentity.siteAri,
        leaseEndsAt: terms.expiresAt,
        operation: "peer-cx.activation-proposal",
        direction: "green-to-blue",
        protocolVersion: "v1",
        peerCxId: "peer-cx-001",
        termsVersion: "v1",
      },
    });
  });

  it.each([
    {
      code: "activation-receiver-mismatch",
      override: { intendedReceiverSiteAri: "ari:cloud:jira::site/other" },
      reason: "the poll is addressed to another receiver",
    },
    {
      code: "nomination-not-found",
      override: { correlationId: "guessed-correlation" },
      reason: "no nomination carries the polled correlation",
    },
    {
      code: "peer-cx-id-mismatch",
      override: { peerCxId: "peer-cx-002" },
      reason: "the polled PeerCX ID is not the approved one",
    },
    {
      code: "nomination-identity-mismatch",
      override: {
        nominatedIdentity: {
          ...blueIdentity,
          installationAri: "ari:cloud:ecosystem::installation/other",
        },
      },
      reason: "the polling site is not the approved counterpart",
    },
    {
      code: "nomination-terms-mismatch",
      override: { termsVersion: "v2" },
      reason: "the poll names terms Green never approved",
    },
  ] as const)(
    "denies a poll and proposes nothing when $reason",
    ({ code, override }) => {
      const result = proposePeerCxActivation(
        greenState("awaiting-blue-confirmation"),
        { ...pollRequest, ...override },
        context,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected an unmatched poll to be denied");
      }
      expect(result.error).toEqual({ code });
    },
  );

  it.each(["invalidated", "rejected"] as const)(
    "reveals a %s nomination as its recorded outcome with no proposal",
    (status) => {
      const result = proposePeerCxActivation(
        greenState(status),
        pollRequest,
        context,
      );

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        expect.unreachable("Expected a decided nomination to report safely");
      }
      expect(result.value).toEqual({ outcome: status });
    },
  );

  it("still returns the proposal once Green is active, so a lost confirmation response can be recovered", () => {
    const result = proposePeerCxActivation(
      greenState("active"),
      pollRequest,
      context,
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected an active PeerCX to replay safely");
    }
    expect(result.value).toEqual({
      outcome: "active",
      proposal: {
        approvedIdentity: blueIdentity,
        correlationId: "correlation-001",
        counterpartSiteAri: greenIdentity.siteAri,
        leaseEndsAt: terms.expiresAt,
        operation: "peer-cx.activation-proposal",
        direction: "green-to-blue",
        protocolVersion: "v1",
        peerCxId: "peer-cx-001",
        termsVersion: "v1",
      },
    });
  });

  it("proposes nothing once the agreed end instant has passed", () => {
    const result = proposePeerCxActivation(
      greenState("awaiting-blue-confirmation"),
      pollRequest,
      { ...context, now: terms.expiresAt },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an expired lease to propose nothing");
    }
    expect(result.error).toEqual({ code: "lease-expired" });
  });
});
