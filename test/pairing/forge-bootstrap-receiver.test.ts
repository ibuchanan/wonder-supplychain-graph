import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({
  getAppContext: vi.fn(() => ({
    environmentAri: "ari:cloud:ecosystem::environment/green-development",
    environmentType: "DEVELOPMENT",
    installation: { contexts: [{ cloudId: "green-cloud-id" }] },
    installationAri: "ari:cloud:ecosystem::installation/green-installation",
  })),
}));
vi.mock("@forge/kvs", () => ({ kvs: { get: vi.fn(), set: vi.fn() } }));
vi.mock("../../src/logging", () => ({ logger: { info: vi.fn() } }));

import { signPeerRequest } from "../../src/collaboration/peer-hmac-auth";
import { logger } from "../../src/logging";
import { receiveBootstrapRequest } from "../../src/pairing/forge-bootstrap-receiver";

const secret = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);
const timestamp = "2026-09-14T18:00:00.000Z";

const invitation = {
  allowedOperations: ["starter.delivery"],
  correlationId: "correlation-001",
  createdAt: "2026-09-14T12:00:00.000Z",
  expiresAt: "2026-09-21T12:00:00.000Z",
  invitationId: "invitation-001",
  purpose: "Coordinate supplier delivery",
  recipientAccountId: "tina-green-account",
  reference: "reference-001",
  status: "invited",
  termsVersion: "v1",
} as const;

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const nominationRequest = {
  correlationId: "correlation-001",
  createdAt: timestamp,
  direction: "blue-to-green",
  idempotencyKey: "nominate-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-cloud-id",
  invitationReference: "reference-001",
  nominatedIdentity: blueIdentity,
  operation: "site-relationship.nominate",
  protocolVersion: "v1",
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  requestId: "request-001",
  terms: {
    allowedOperations: ["starter.delivery"],
    expiresAt: "2026-09-21T12:00:00.000Z",
    termsVersion: "v1",
  },
} as const;

/**
 * Every authenticated request also claims its request ID, so a bare
 * `kvs.set` count no longer isolates the business effect.
 */
function stateWrites(): unknown[][] {
  return vi
    .mocked(kvs.set)
    .mock.calls.filter(([key]) => key === "site-relationship-setup-state");
}

function signedRequest(body = JSON.stringify(nominationRequest)) {
  const headers = signPeerRequest(secret, body, timestamp);
  return {
    body,
    headers: Object.fromEntries(
      Object.entries(headers ?? {}).map(([key, value]) => [key, [value]]),
    ),
  };
}

describe("receiveBootstrapRequest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    vi.stubEnv("SHARED_SECRET", secret);
    vi.mocked(kvs.get).mockImplementation(async (key: string) =>
      key === "invitation-workflow-state"
        ? ({ invitations: [invitation] } as never)
        : ({
            nominations: [],
            processedIdempotencyKeys: [],
            relationships: [],
          } as never),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects missing or modified signatures before parsing or reading local state", async () => {
    await expect(
      receiveBootstrapRequest({ body: JSON.stringify(nominationRequest) }),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "unauthorized" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 401,
    });
    await expect(
      receiveBootstrapRequest({
        ...signedRequest(),
        body: JSON.stringify({ ...nominationRequest, requestId: "changed" }),
      }),
    ).resolves.toMatchObject({ statusCode: 401 });

    expect(kvs.get).not.toHaveBeenCalled();
    expect(kvs.set).not.toHaveBeenCalled();
  });

  it("discloses no failed check to the caller while logging the safe reason", async () => {
    // Every denial looks alike on the wire: a caller cannot use the response
    // to learn whether the signature, the timestamp, the envelope, or the
    // local invitation state was what refused it. The specific reason stays in
    // the tenant's own non-content log.
    const unauthenticated = await receiveBootstrapRequest({
      body: JSON.stringify(nominationRequest),
    });
    const unknownInvitation = await receiveBootstrapRequest(
      signedRequest(
        JSON.stringify({
          ...nominationRequest,
          invitationReference: "unknown-reference",
        }),
      ),
    );

    expect(unauthenticated).toEqual({
      body: JSON.stringify({ error: "unauthorized" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 401,
    });
    expect(unknownInvitation).toEqual({
      body: JSON.stringify({ error: "forbidden" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 403,
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "scg.peer.request.denied",
        outcome: "denied",
        reason: "invalid-hmac-timestamp",
        route: "bootstrap",
      }),
      expect.any(String),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "scg.peer.request.denied",
        reason: "invitation-not-found",
      }),
      expect.any(String),
    );
  });

  it("records one authenticated nomination as awaiting approval and returns no endpoint", async () => {
    const response = await receiveBootstrapRequest(signedRequest());

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(String(response.body))).toMatchObject({
      correlationId: "correlation-001",
      outcome: "awaiting-green-approval",
    });
    expect(String(response.body)).not.toContain("webtrigger");
    expect(stateWrites()).toEqual([
      [
        "site-relationship-setup-state",
        {
          nominations: [
            {
              correlationId: "correlation-001",
              counterpartSiteAri: blueIdentity.siteAri,
              idempotencyKey: "nominate-001",
              invitationReference: "reference-001",
              nominatedIdentity: blueIdentity,
              receiverEndpointStatus: "configured",
              relationshipId: "relationship-001",
              role: "green",
              status: "awaiting-green-approval",
              terms: nominationRequest.terms,
            },
          ],
          processedIdempotencyKeys: ["nominate-001"],
          relationships: [],
        },
      ],
    ]);
  });

  it("rejects a signed request whose envelope or invitation state is invalid, storing nothing", async () => {
    await expect(
      receiveBootstrapRequest(signedRequest("{}")),
    ).resolves.toMatchObject({ statusCode: 400 });

    await expect(
      receiveBootstrapRequest(
        signedRequest(
          JSON.stringify({
            ...nominationRequest,
            invitationReference: "unknown-reference",
          }),
        ),
      ),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "forbidden" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 403,
    });

    expect(stateWrites()).toHaveLength(0);
  });
});

const approvedNomination = {
  correlationId: "correlation-001",
  counterpartSiteAri: blueIdentity.siteAri,
  decidedAt: "2026-09-14T17:00:00.000Z",
  idempotencyKey: "nominate-001",
  invitationReference: "reference-001",
  nominatedIdentity: blueIdentity,
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  role: "green",
  status: "awaiting-blue-confirmation",
  terms: nominationRequest.terms,
} as const;

const pollRequest = {
  correlationId: "correlation-001",
  createdAt: timestamp,
  direction: "blue-to-green",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-cloud-id",
  nominatedIdentity: blueIdentity,
  operation: "site-relationship.poll",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "poll-request-001",
  termsVersion: "v1",
} as const;

const confirmationRequest = {
  confirmedIdentity: blueIdentity,
  correlationId: "correlation-001",
  createdAt: timestamp,
  direction: "blue-to-green",
  idempotencyKey: "correlation-001:confirm",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-cloud-id",
  leaseEndsAt: nominationRequest.terms.expiresAt,
  operation: "site-relationship.confirm",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "confirm-request-001",
  termsVersion: "v1",
} as const;

describe("receiveBootstrapRequest bilateral confirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    vi.stubEnv("SHARED_SECRET", secret);
    vi.mocked(kvs.get).mockImplementation(async (key: string) =>
      key === "invitation-workflow-state"
        ? ({ invitations: [invitation] } as never)
        : ({
            nominations: [approvedNomination],
            processedIdempotencyKeys: ["nominate-001"],
            relationships: [],
          } as never),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("answers an authenticated poll with the approved proposal and writes nothing", async () => {
    const response = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(pollRequest)),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(String(response.body))).toMatchObject({
      approvedIdentity: blueIdentity,
      correlationId: "correlation-001",
      counterpartSiteAri: "ari:cloud:jira::site/green-cloud-id",
      leaseEndsAt: nominationRequest.terms.expiresAt,
      operation: "site-relationship.activation-proposal",
      outcome: "awaiting-blue-confirmation",
      relationshipId: "relationship-001",
      termsVersion: "v1",
    });
    expect(String(response.body)).not.toContain("webtrigger");
    expect(stateWrites()).toHaveLength(0);
  });

  it("activates the local relationship on an authenticated confirmation", async () => {
    const response = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(confirmationRequest)),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(String(response.body))).toMatchObject({
      correlationId: "correlation-001",
      outcome: "active",
      relationshipId: "relationship-001",
    });
    expect(stateWrites()).toEqual([
      [
        "site-relationship-setup-state",
        {
          nominations: [
            {
              ...approvedNomination,
              confirmedAt: timestamp,
              status: "active",
            },
          ],
          processedIdempotencyKeys: ["nominate-001", "correlation-001:confirm"],
          relationships: [
            {
              counterpartSiteAri: blueIdentity.siteAri,
              leaseEndsAt: nominationRequest.terms.expiresAt,
              relationshipId: "relationship-001",
              status: "active",
              termsVersion: "v1",
            },
          ],
        },
      ],
    ]);
  });

  it("consumes the signed request ID once, so a captured request cannot repeat its effect", async () => {
    // A valid captured request stays verifiable for the whole timestamp
    // window, so the signature alone cannot be what makes it single-use.
    const consumed = new Set<string>();
    const readState = vi.mocked(kvs.get).getMockImplementation();
    vi.mocked(kvs.set).mockImplementation(
      async (key: string, _value: unknown, options?: unknown) => {
        if ((options as { keyPolicy?: string } | undefined)?.keyPolicy) {
          if (consumed.has(key)) {
            throw new Error("key already exists");
          }
          consumed.add(key);
        }
      },
    );
    vi.mocked(kvs.get).mockImplementation(async (key: string) =>
      consumed.has(key)
        ? ({ consumedAt: timestamp } as never)
        : ((await readState?.(key)) as never),
    );

    const first = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(confirmationRequest)),
    );
    const replayed = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(confirmationRequest)),
    );

    expect(first.statusCode).toBe(200);
    expect(replayed).toEqual({
      body: JSON.stringify({ error: "forbidden" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 403,
    });
    expect(
      vi
        .mocked(kvs.set)
        .mock.calls.filter(([key]) => key === "site-relationship-setup-state"),
    ).toHaveLength(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "request-replayed" }),
      expect.any(String),
    );
  });

  it("lets a retry with fresh signing evidence reach the same recorded outcome once", async () => {
    // Replay prevention must not defeat reliable delivery: a lost response is
    // retried with a new request ID and timestamp but the same business
    // operation, and must converge on one activation rather than a second one.
    let stored: unknown = {
      nominations: [approvedNomination],
      processedIdempotencyKeys: ["nominate-001"],
      relationships: [],
    };
    const claimed = new Set<string>();
    vi.mocked(kvs.get).mockImplementation(async (key: string) =>
      key === "invitation-workflow-state"
        ? ({ invitations: [invitation] } as never)
        : key === "site-relationship-setup-state"
          ? (stored as never)
          : ((claimed.has(key)
              ? { consumedAt: timestamp }
              : undefined) as never),
    );
    vi.mocked(kvs.set).mockImplementation(
      async (key: string, value: unknown, options?: unknown) => {
        if ((options as { keyPolicy?: string } | undefined)?.keyPolicy) {
          if (claimed.has(key)) {
            throw new Error("key already exists");
          }
          claimed.add(key);
          return;
        }
        stored = value;
      },
    );

    const first = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(confirmationRequest)),
    );
    const retry = await receiveBootstrapRequest(
      signedRequest(
        JSON.stringify({
          ...confirmationRequest,
          createdAt: timestamp,
          requestId: "confirm-request-002",
        }),
      ),
    );

    expect(JSON.parse(String(first.body))).toMatchObject({ outcome: "active" });
    expect(JSON.parse(String(retry.body))).toMatchObject({ outcome: "active" });
    expect(
      (stored as { relationships: readonly unknown[] }).relationships,
    ).toHaveLength(1);
    expect(
      (stored as { processedIdempotencyKeys: readonly string[] })
        .processedIdempotencyKeys,
    ).toEqual(["nominate-001", "correlation-001:confirm"]);
  });

  it("fails closed when durable replay state is unavailable", async () => {
    vi.mocked(kvs.set).mockRejectedValue(new Error("kvs unavailable"));
    vi.mocked(kvs.get).mockRejectedValue(new Error("kvs unavailable"));

    const response = await receiveBootstrapRequest(
      signedRequest(JSON.stringify(confirmationRequest)),
    );

    expect(response.statusCode).toBe(403);
    expect(
      vi
        .mocked(kvs.set)
        .mock.calls.filter(([key]) => key === "site-relationship-setup-state"),
    ).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "replay-state-unavailable" }),
      expect.any(String),
    );
  });

  it("denies a confirmation for an unknown relationship without activating", async () => {
    const response = await receiveBootstrapRequest(
      signedRequest(
        JSON.stringify({
          ...confirmationRequest,
          relationshipId: "relationship-002",
        }),
      ),
    );

    expect(response).toEqual({
      body: JSON.stringify({ error: "forbidden" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 403,
    });
    expect(stateWrites()).toHaveLength(0);
  });

  it("rejects a signed body that is not a bootstrap operation", async () => {
    const response = await receiveBootstrapRequest(
      signedRequest(
        JSON.stringify({ ...pollRequest, operation: "starter.delivery" }),
      ),
    );

    expect(response.statusCode).toBe(400);
    expect(kvs.set).not.toHaveBeenCalled();
  });
});
