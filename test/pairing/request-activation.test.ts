import { describe, expect, it, vi } from "vitest";

import { verifyPeerRequest } from "../../src/collaboration/peer-hmac-auth";
import {
  pollGreenForActivation,
  sendConfirmation,
} from "../../src/pairing/request-activation";
import type {
  ActivationPollRequest,
  ConfirmationRequest,
} from "../../src/pairing/site-relationship-activation";

const secret = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);
const bootstrapUrl = "https://green.webtrigger.atlassian.app/bootstrap";

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const pollRequest: ActivationPollRequest = {
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:05:00.000Z",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  nominatedIdentity: blueIdentity,
  operation: "site-relationship.poll",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "poll-request-001",
};

const proposal = {
  approvedIdentity: blueIdentity,
  correlationId: "correlation-001",
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2026-09-21T12:00:00.000Z",
  operation: "site-relationship.activation-proposal",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  termsVersion: "v1",
} as const;

const confirmationRequest: ConfirmationRequest = {
  confirmedIdentity: blueIdentity,
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:10:00.000Z",
  idempotencyKey: "correlation-001:confirm",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2026-09-21T12:00:00.000Z",
  operation: "site-relationship.confirm",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "confirm-request-001",
  termsVersion: "v1",
};

function respondWith(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, text: async () => JSON.stringify(body) }));
}

describe("pollGreenForActivation", () => {
  it("posts one signed poll envelope and returns the parsed proposal", async () => {
    const fetch = respondWith({
      ...proposal,
      outcome: "awaiting-blue-confirmation",
    });

    const result = await pollGreenForActivation(bootstrapUrl, pollRequest, {
      fetch,
      secret,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected an authenticated poll to succeed");
    }
    expect(result.value).toEqual({
      outcome: "awaiting-blue-confirmation",
      proposal,
    });

    const [url, init] = fetch.mock.calls[0] as unknown as [
      string,
      {
        body: string;
        headers: Record<string, string>;
        method: string;
      },
    ];
    expect(url).toBe(bootstrapUrl);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(pollRequest);
    expect(
      verifyPeerRequest(
        {
          body: init.body,
          headers: Object.fromEntries(
            Object.entries(init.headers).map(([key, value]) => [key, [value]]),
          ),
        },
        secret,
      ),
    ).toBeUndefined();
  });

  it("returns a signing failure and sends nothing without a usable secret", async () => {
    const fetch = respondWith({ outcome: "awaiting-green-approval" });

    const result = await pollGreenForActivation(bootstrapUrl, pollRequest, {
      fetch,
      secret: undefined,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unsigned poll to be refused");
    }
    expect(result.error).toEqual({ code: "activation-signing-failed" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      code: "activation-poll-failed",
      reason: "Green refuses the poll",
      response: () => respondWith({ error: "nomination-not-found" }, false),
    },
    {
      code: "invalid-activation-proposal",
      reason: "the returned proposal is not the versioned envelope",
      response: () => respondWith({ outcome: "awaiting-blue-confirmation" }),
    },
    {
      code: "activation-poll-failed",
      reason: "the request never reaches Green",
      response: () =>
        vi.fn(async () => {
          throw new Error("network down");
        }),
    },
  ] as const)(
    "reports $reason as a typed failure",
    async ({ code, response }) => {
      const result = await pollGreenForActivation(bootstrapUrl, pollRequest, {
        fetch: response() as never,
        secret,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected a failed poll to be reported");
      }
      expect(result.error).toEqual({ code });
    },
  );
});

describe("sendConfirmation", () => {
  it("posts one signed confirmation and returns Green's activation receipt", async () => {
    const receipt = {
      correlationId: "correlation-001",
      outcome: "active",
      relationshipId: "relationship-001",
    };
    const fetch = respondWith(receipt);

    const result = await sendConfirmation(bootstrapUrl, confirmationRequest, {
      fetch,
      secret,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.unreachable("Expected an authenticated confirmation to succeed");
    }
    expect(result.value).toEqual(receipt);

    const [, init] = fetch.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Record<string, string> },
    ];
    expect(JSON.parse(init.body)).toEqual(confirmationRequest);
    expect(
      verifyPeerRequest(
        {
          body: init.body,
          headers: Object.fromEntries(
            Object.entries(init.headers).map(([key, value]) => [key, [value]]),
          ),
        },
        secret,
      ),
    ).toBeUndefined();
  });

  it.each([
    {
      code: "confirmation-signing-failed",
      reason: "no usable secret is configured",
      response: () => respondWith({ outcome: "active" }),
      secret: undefined,
    },
    {
      code: "confirmation-delivery-failed",
      reason: "Green refuses the confirmation",
      response: () => respondWith({ error: "approval-not-recorded" }, false),
      secret,
    },
    {
      code: "invalid-confirmation-receipt",
      reason: "Green returns something other than an activation receipt",
      response: () => respondWith({ outcome: "awaiting-green-approval" }),
      secret,
    },
  ] as const)(
    "reports $reason as a typed failure",
    async ({ code, response, secret: configuredSecret }) => {
      const result = await sendConfirmation(bootstrapUrl, confirmationRequest, {
        fetch: response() as never,
        secret: configuredSecret,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        expect.unreachable("Expected a failed confirmation to be reported");
      }
      expect(result.error).toEqual({ code });
    },
  );
});
