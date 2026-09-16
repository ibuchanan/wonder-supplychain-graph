import { describe, expect, it } from "vitest";

import {
  type ConfirmationRequest,
  receivePeerCxConfirmation,
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

const approvedNomination = {
  correlationId: "correlation-001",
  counterpartSiteAri: blueIdentity.siteAri,
  decidedAt: "2026-09-14T19:00:00.000Z",
  idempotencyKey: "nominate-001",
  invitationReference: "reference-001",
  nominatedIdentity: blueIdentity,
  receiverEndpointStatus: "configured",
  peerCxId: "peer-cx-001",
  role: "green",
  status: "awaiting-blue-confirmation",
  terms,
} as const;

const greenState = (
  status: NominationStatus = "awaiting-blue-confirmation",
): PeerCxSetupState => ({
  nominations: [{ ...approvedNomination, status }],
  processedIdempotencyKeys: ["nominate-001"],
  peerCxs: [],
});

const confirmation: ConfirmationRequest = {
  confirmedIdentity: blueIdentity,
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:10:00.000Z",
  idempotencyKey: "correlation-001:confirm",
  intendedReceiverSiteAri: greenIdentity.siteAri,
  leaseEndsAt: terms.expiresAt,
  operation: "peer-cx.confirm",
  protocolVersion: "v1",
  peerCxId: "peer-cx-001",
  requestId: "confirm-request-001",
  termsVersion: "v1",
};

const context = {
  localIdentity: greenIdentity,
  now: "2026-09-14T19:10:01.000Z",
};

describe("receivePeerCxConfirmation", () => {
  it("activates Green's local PeerCX for a matching confirmation", () => {
    const result = receivePeerCxConfirmation(
      greenState(),
      confirmation,
      context,
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected a matching confirmation to activate");
    }
    expect(result.value.nextState).toEqual({
      nominations: [
        {
          ...approvedNomination,
          confirmedAt: "2026-09-14T19:10:01.000Z",
          status: "active",
        },
      ],
      processedIdempotencyKeys: ["nominate-001", "correlation-001:confirm"],
      peerCxs: [
        {
          counterpartSiteAri: blueIdentity.siteAri,
          leaseEndsAt: terms.expiresAt,
          peerCxId: "peer-cx-001",
          status: "active",
          termsVersion: "v1",
        },
      ],
    });
    expect(result.value.receipt).toEqual({
      correlationId: "correlation-001",
      outcome: "active",
      peerCxId: "peer-cx-001",
    });
  });

  it.each([
    {
      code: "activation-receiver-mismatch",
      override: { intendedReceiverSiteAri: "ari:cloud:jira::site/other" },
      reason: "the confirmation is addressed to another receiver",
    },
    {
      code: "pending-nomination-not-found",
      override: { correlationId: "correlation-002" },
      reason: "no nomination carries the confirmed correlation",
    },
    {
      code: "confirmation-mismatch",
      override: { peerCxId: "peer-cx-002" },
      reason: "the confirmed PeerCX ID is not the approved one",
    },
    {
      code: "confirmation-mismatch",
      override: {
        confirmedIdentity: {
          ...blueIdentity,
          siteAri: "ari:cloud:jira::site/other",
        },
      },
      reason: "the confirming site is not the approved counterpart",
    },
    {
      code: "confirmation-mismatch",
      override: { termsVersion: "v2" },
      reason: "the immutable terms version differs",
    },
    {
      code: "confirmation-mismatch",
      override: { leaseEndsAt: "2027-09-21T12:00:00.000Z" },
      reason: "the agreed end instant differs",
    },
  ] as const)("activates nothing when $reason", ({ code, override }) => {
    const state = greenState();

    const result = receivePeerCxConfirmation(
      state,
      { ...confirmation, ...override },
      context,
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unmatched confirmation to be denied");
    }
    expect(result.error).toEqual({ code });
    expect(state).toEqual(greenState());
  });

  it.each(["awaiting-green-approval", "invalidated", "rejected"] as const)(
    "refuses to activate a %s nomination, so a partial confirmation fails closed",
    (status) => {
      const result = receivePeerCxConfirmation(
        greenState(status),
        confirmation,
        context,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected an unapproved confirmation to be denied");
      }
      expect(result.error).toEqual({ code: "approval-not-recorded" });
    },
  );

  it("refuses to activate after the agreed end instant", () => {
    const result = receivePeerCxConfirmation(greenState(), confirmation, {
      ...context,
      now: terms.expiresAt,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an expired lease to block activation");
    }
    expect(result.error).toEqual({ code: "lease-expired" });
  });

  it("replays the recorded activation when the confirmation is delivered twice", () => {
    const first = receivePeerCxConfirmation(
      greenState(),
      confirmation,
      context,
    );
    if (first.isErr()) {
      expect.unreachable("Expected the first confirmation to activate");
    }

    const second = receivePeerCxConfirmation(
      first.value.nextState,
      { ...confirmation, requestId: "confirm-request-002" },
      { ...context, now: "2026-09-14T19:11:00.000Z" },
    );

    expect(second.isOk()).toBe(true);
    if (second.isErr()) {
      expect.unreachable("Expected a duplicate confirmation to replay safely");
    }
    expect(second.value.nextState).toEqual(first.value.nextState);
    expect(second.value.receipt).toEqual(first.value.receipt);
  });
});
