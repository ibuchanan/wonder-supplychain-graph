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

import { signPeerRequest } from "../../src/collaboration/peer-hmac-auth";
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
      body: JSON.stringify({ error: "invalid-hmac-timestamp" }),
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

  it("records one authenticated nomination as awaiting approval and returns no endpoint", async () => {
    const response = await receiveBootstrapRequest(signedRequest());

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(String(response.body))).toMatchObject({
      correlationId: "correlation-001",
      outcome: "awaiting-green-approval",
    });
    expect(String(response.body)).not.toContain("webtrigger");
    expect(kvs.set).toHaveBeenCalledExactlyOnceWith(
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
    );
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
      body: JSON.stringify({ error: "invitation-not-found" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 409,
    });

    expect(kvs.set).not.toHaveBeenCalled();
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
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-cloud-id",
  nominatedIdentity: blueIdentity,
  operation: "site-relationship.poll",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "poll-request-001",
} as const;

const confirmationRequest = {
  confirmedIdentity: blueIdentity,
  correlationId: "correlation-001",
  createdAt: timestamp,
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
    expect(kvs.set).not.toHaveBeenCalled();
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
    expect(kvs.set).toHaveBeenCalledExactlyOnceWith(
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
      body: JSON.stringify({ error: "confirmation-mismatch" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 409,
    });
    expect(kvs.set).not.toHaveBeenCalled();
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
