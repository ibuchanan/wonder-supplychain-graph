import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({
  fetch: vi.fn(),
  getAppContext: vi.fn(() => ({
    environmentAri: "ari:cloud:ecosystem::environment/blue-development",
    environmentType: "DEVELOPMENT",
    installation: { contexts: [{ cloudId: "blue-cloud-id" }] },
    installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  })),
}));
vi.mock("@forge/kvs", () => ({
  kvs: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { publishWorkPackage } from "../../src/publication/forge-automation-action";

const sourcePairing = {
  allowedOperations: ["starter.delivery"],
  pairingId: "pairing-001",
  peerEventUrl: "https://green.example/forge/webtrigger/receive-peer-event",
  relationshipId: "relationship-001",
  role: "source",
  sourceEpicKey: "MFG-17",
  sourceSiteAri: "ari:cloud:jira::site/blue-cloud-id",
  sourceSiteUrl: "https://blue.example",
  status: "active",
};

const relationship = {
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2027-08-05T14:30:00.000Z",
  relationshipId: "relationship-001",
  status: "active",
  termsVersion: "v1",
};

function mockStores(
  overrides: {
    readonly pairings?: readonly unknown[];
    readonly relationships?: readonly unknown[];
  } = {},
) {
  vi.mocked(kvs.get).mockImplementation(async (key) =>
    key === "peer-pairing-state"
      ? ({ pairings: overrides.pairings ?? [sourcePairing] } as never)
      : key === "site-relationship-setup-state"
        ? ({
            nominations: [],
            processedIdempotencyKeys: [],
            relationships: overrides.relationships ?? [relationship],
          } as never)
        : undefined,
  );
}

describe("publishWorkPackage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T14:30:00.000Z"));
    vi.stubGlobal("crypto", { randomUUID: () => "execution-003" });
    vi.stubEnv(
      "SHARED_SECRET",
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64"),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("persists the queued candidate but fails visibly when no source pairing is configured", async () => {
    vi.mocked(kvs.get).mockResolvedValue(undefined);

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: source pairing unavailable");

    expect(kvs.set).toHaveBeenCalledWith("demo-publication-state:MFG-17", {
      candidates: [
        {
          candidateId: "candidate:scg:MFG-17:execution-003",
          correlationId: "scg:execution-003",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          publisherId: "account:automation-001",
          sourceEpicId: "MFG-17",
          state: "queued",
        },
      ],
      pairings: [
        {
          automationConnectionUserId: "account:automation-001",
          pairedEpicId: "demo-paired:MFG-17",
          pairingId: "demo-pairing:MFG-17",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
      processedIdempotencyKeys: ["scg:MFG-17:execution-003"],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts one signed operation envelope to the active source pairing after queueing", async () => {
    mockStores();
    vi.mocked(fetch).mockResolvedValue({ ok: true } as never);

    await publishWorkPackage({
      publisherId: "account:automation-001",
      sourceEpicId: "MFG-17",
    });

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://green.example/forge/webtrigger/receive-peer-event",
      {
        body: JSON.stringify({
          createdAt: "2026-08-05T14:30:00.000Z",
          direction: "source-to-destination",
          event: {
            data: {
              issueKey: "MFG-17",
              pairingId: "pairing-001",
              updatedFields: [],
            },
            datacontenttype: "application/json",
            id: "execution-003",
            source: "ari:cloud:jira::site/blue-cloud-id",
            specversion: "1.0",
            subject: "issue/MFG-17",
            time: "2026-08-05T14:30:00.000Z",
            type: "scg:work-package:queued",
          },
          idempotencyKey: "scg:MFG-17:execution-003",
          intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
          operation: "starter.delivery",
          pairingId: "pairing-001",
          protocolVersion: "v1",
          relationshipId: "relationship-001",
          requestId: "execution-003",
          senderIdentity: {
            environmentAri: "ari:cloud:ecosystem::environment/blue-development",
            installationAri:
              "ari:cloud:ecosystem::installation/blue-installation",
            siteAri: "ari:cloud:jira::site/blue-cloud-id",
          },
          termsVersion: "v1",
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-webtrigger-signature": expect.stringMatching(
            /^sha256=[a-f0-9]{64}$/,
          ),
          "x-webtrigger-timestamp": "2026-08-05T14:30:00.000Z",
        }),
        method: "POST",
      },
    );
  });

  it("refuses to send once the local relationship is revoked or out of lease", async () => {
    // Revocation blocks this tenant's send authorization immediately; it does
    // not wait for the peer to reject the delivery.
    mockStores({ relationships: [{ ...relationship, status: "revoked" }] });

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: relationship-unauthorized");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to send an operation absent from the pairing's allowlist", async () => {
    mockStores({ pairings: [{ ...sourcePairing, allowedOperations: [] }] });

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: operation-not-allowed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces a Green rejection after queueing locally", async () => {
    mockStores();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as never);

    await expect(
      publishWorkPackage({
        publisherId: "account:automation-001",
        sourceEpicId: "MFG-17",
      }),
    ).rejects.toThrow("Unable to emit lean event: peer rejected delivery");
    expect(kvs.set).toHaveBeenCalledOnce();
  });
});
