import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({
  fetch: vi.fn(),
  getAppContext: vi.fn(() => ({
    environmentAri: "ari:cloud:ecosystem::environment/green-development",
    environmentType: "DEVELOPMENT",
    installation: { contexts: [{ cloudId: "green-cloud-id" }] },
    installationAri: "ari:cloud:ecosystem::installation/green-installation",
  })),
}));
vi.mock("@forge/kvs", () => ({ kvs: { get: vi.fn(), set: vi.fn() } }));
vi.mock("../../src/logging", () => ({ logger: { info: vi.fn() } }));

import { receivePeerEvent } from "../../src/collaboration/forge-peer-event-receiver";
import { signPeerRequest } from "../../src/collaboration/peer-hmac-auth";
import { logger } from "../../src/logging";

const secret = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);
const timestamp = "2026-09-14T16:00:00.000Z";
const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
};

const validEvent = {
  data: { issueKey: "BLUE-101", pairingId: "pairing-001", updatedFields: [] },
  datacontenttype: "application/json",
  id: "event-001",
  source: blueIdentity.siteAri,
  specversion: "1.0",
  subject: "issue/BLUE-101",
  time: "2026-08-22T14:30:00.000Z",
  type: "scg:work-package:queued",
};

const validEnvelope = {
  createdAt: timestamp,
  direction: "source-to-destination",
  event: validEvent,
  idempotencyKey: "delivery-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-cloud-id",
  operation: "starter.delivery",
  pairingId: "pairing-001",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "request-001",
  senderIdentity: blueIdentity,
  termsVersion: "v1",
};

const relationship = {
  counterpartSiteAri: blueIdentity.siteAri,
  leaseEndsAt: "2027-09-14T16:00:00.000Z",
  relationshipId: "relationship-001",
  status: "active",
  termsVersion: "v1",
};

const pairing = {
  allowedOperations: ["starter.delivery"],
  automationWebhookUrl: "https://automation.example/webhook",
  connectionId: "connection-001",
  pairedEpicKey: "GREEN-42",
  pairingId: "pairing-001",
  relationshipId: "relationship-001",
  role: "destination",
  sourceEpicKey: "BLUE-101",
  status: "active",
};

function signedRequest(body = JSON.stringify(validEnvelope)) {
  const headers = signPeerRequest(secret, body, timestamp);
  return {
    body,
    headers: Object.fromEntries(
      Object.entries(headers ?? {}).map(([key, value]) => [key, [value]]),
    ),
  };
}

function mockStores(
  overrides: {
    readonly pairings?: readonly unknown[];
    readonly relationships?: readonly unknown[];
  } = {},
) {
  const claimed = new Set<string>();
  vi.mocked(kvs.get).mockImplementation(async (key: string) =>
    key === "peer-pairing-state"
      ? ({ pairings: overrides.pairings ?? [pairing] } as never)
      : key === "site-relationship-setup-state"
        ? ({
            nominations: [],
            processedIdempotencyKeys: [],
            relationships: overrides.relationships ?? [relationship],
          } as never)
        : ((claimed.has(key) ? { consumedAt: timestamp } : undefined) as never),
  );
  vi.mocked(kvs.set).mockImplementation(
    async (key: string, _value: unknown, options?: unknown) => {
      if ((options as { keyPolicy?: string } | undefined)?.keyPolicy) {
        if (claimed.has(key)) {
          throw new Error("key already exists");
        }
        claimed.add(key);
      }
    },
  );
}

const forbidden = {
  body: JSON.stringify({ error: "forbidden" }),
  headers: { "Content-Type": ["application/json"] },
  statusCode: 403,
};

describe("receivePeerEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    vi.stubEnv("SHARED_SECRET", secret);
    mockStores();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("forwards one authorized delivery and hands Automation only the lean event", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as never);

    await expect(receivePeerEvent(signedRequest())).resolves.toMatchObject({
      statusCode: 200,
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://automation.example/webhook",
      {
        body: JSON.stringify({
          ...validEvent,
          data: { ...validEvent.data, pairedEpicKey: "GREEN-42" },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
  });

  it("rejects missing or modified signatures before local reads or Automation delivery", async () => {
    await expect(
      receivePeerEvent({ body: JSON.stringify(validEnvelope) }),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "unauthorized" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 401,
    });
    await expect(
      receivePeerEvent({
        ...signedRequest(),
        body: JSON.stringify({ ...validEnvelope, requestId: "changed" }),
      }),
    ).resolves.toMatchObject({ statusCode: 401 });

    expect(kvs.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a bare lean event that carries no authorization envelope", async () => {
    await expect(
      receivePeerEvent(signedRequest(JSON.stringify(validEvent))),
    ).resolves.toMatchObject({ statusCode: 400 });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("denies a request addressed to another receiver", async () => {
    await expect(
      receivePeerEvent(
        signedRequest(
          JSON.stringify({
            ...validEnvelope,
            intendedReceiverSiteAri: "ari:cloud:jira::site/other-site",
          }),
        ),
      ),
    ).resolves.toEqual(forbidden);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("denies a secret holder whose relationship is absent, revoked, or out of lease", async () => {
    mockStores({ relationships: [] });
    await expect(receivePeerEvent(signedRequest())).resolves.toEqual(forbidden);

    mockStores({ relationships: [{ ...relationship, status: "revoked" }] });
    await expect(receivePeerEvent(signedRequest())).resolves.toEqual(forbidden);

    mockStores({
      relationships: [
        { ...relationship, leaseEndsAt: "2026-09-14T15:59:59.999Z" },
      ],
    });
    await expect(receivePeerEvent(signedRequest())).resolves.toEqual(forbidden);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("denies a sender identity the local relationship does not name", async () => {
    await expect(
      receivePeerEvent(
        signedRequest(
          JSON.stringify({
            ...validEnvelope,
            senderIdentity: {
              ...blueIdentity,
              siteAri: "ari:cloud:jira::site/impostor-site",
            },
          }),
        ),
      ),
    ).resolves.toEqual(forbidden);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("denies an operation absent from that pairing's allowlist", async () => {
    mockStores({ pairings: [{ ...pairing, allowedOperations: [] }] });

    await expect(receivePeerEvent(signedRequest())).resolves.toEqual(forbidden);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "operation-not-allowed",
        route: "peer-event",
      }),
      expect.any(String),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("delivers a captured request at most once", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as never);

    const first = await receivePeerEvent(signedRequest());
    const replayed = await receivePeerEvent(signedRequest());

    expect(first.statusCode).toBe(200);
    expect(replayed).toEqual(forbidden);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed without delivering when durable replay state is unavailable", async () => {
    vi.mocked(kvs.set).mockRejectedValue(new Error("kvs unavailable"));

    await expect(receivePeerEvent(signedRequest())).resolves.toEqual(forbidden);
    expect(fetch).not.toHaveBeenCalled();
  });
});
