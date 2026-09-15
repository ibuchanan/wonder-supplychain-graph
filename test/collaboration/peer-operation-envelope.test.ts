import { describe, expect, it } from "vitest";

import {
  buildPeerOperationEnvelope,
  parsePeerOperationEnvelope,
} from "../../src/collaboration/peer-operation-envelope";

const senderIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/green-development",
  installationAri: "ari:cloud:ecosystem::installation/green-installation",
  siteAri: "ari:cloud:jira::site/green-site",
};

const event = {
  data: { issueKey: "GREEN-1", pairingId: "pairing-001", updatedFields: [] },
  datacontenttype: "application/json",
  id: "event-001",
  source: senderIdentity.siteAri,
  specversion: "1.0",
  subject: "issue/GREEN-1",
  time: "2026-09-15T12:00:00.000Z",
  type: "scg:work-package:queued",
};

const envelope = {
  createdAt: "2026-09-15T12:00:00.000Z",
  direction: "source-to-destination",
  event,
  idempotencyKey: "publish-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/blue-site",
  operation: "starter.delivery",
  pairingId: "pairing-001",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "request-001",
  senderIdentity,
  termsVersion: "v1",
};

describe("buildPeerOperationEnvelope", () => {
  const operation = {
    event,
    idempotencyKey: "publish-001",
    intendedReceiverSiteAri: "ari:cloud:jira::site/blue-site",
    operation: "starter.delivery",
    pairingId: "pairing-001",
    relationshipId: "relationship-001",
    senderIdentity,
    termsVersion: "v1",
  } as const;

  it("builds an envelope its own receiver accepts", () => {
    const built = buildPeerOperationEnvelope({
      ...operation,
      createdAt: "2026-09-15T12:00:00.000Z",
      requestId: "request-001",
    });

    expect(parsePeerOperationEnvelope(JSON.stringify(built))).toEqual(built);
    expect(built).toMatchObject({
      direction: "source-to-destination",
      protocolVersion: "v1",
    });
  });

  it("keeps a retry's business identity while its signing evidence is fresh", () => {
    // These two fields are the whole separation AC5 asks for: the request ID
    // and instant make one delivery attempt unrepeatable, and the idempotency
    // key keeps both attempts the same business operation.
    const first = buildPeerOperationEnvelope({
      ...operation,
      createdAt: "2026-09-15T12:00:00.000Z",
      requestId: "request-001",
    });
    const retry = buildPeerOperationEnvelope({
      ...operation,
      createdAt: "2026-09-15T12:04:00.000Z",
      requestId: "request-002",
    });

    expect(retry.requestId).not.toBe(first.requestId);
    expect(retry.createdAt).not.toBe(first.createdAt);
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect({ ...retry, createdAt: "", requestId: "" }).toEqual({
      ...first,
      createdAt: "",
      requestId: "",
    });
  });
});

describe("parsePeerOperationEnvelope", () => {
  it("accepts the exact versioned envelope and its lean event", () => {
    expect(parsePeerOperationEnvelope(JSON.stringify(envelope))).toEqual(
      envelope,
    );
  });

  it("rejects an envelope missing any required field", () => {
    for (const field of Object.keys(envelope)) {
      const { [field]: _omitted, ...incomplete } = envelope as Record<
        string,
        unknown
      >;

      expect(parsePeerOperationEnvelope(JSON.stringify(incomplete))).toBe(
        undefined,
      );
    }
  });

  it("rejects an unknown protocol version, operation, or direction", () => {
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({ ...envelope, protocolVersion: "v2" }),
      ),
    ).toBe(undefined);
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({ ...envelope, operation: "site-relationship.confirm" }),
      ),
    ).toBe(undefined);
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({ ...envelope, direction: "any" }),
      ),
    ).toBe(undefined);
  });

  it("rejects an envelope whose pairing disagrees with its own event", () => {
    // The route authorizes one pairing ID. An event naming a different one
    // would otherwise be delivered under the wrong Pairing's authority.
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({ ...envelope, pairingId: "pairing-002" }),
      ),
    ).toBe(undefined);
  });

  it("rejects a malformed body, a non-object, or a malformed sender identity", () => {
    expect(parsePeerOperationEnvelope("not json")).toBe(undefined);
    expect(parsePeerOperationEnvelope("[]")).toBe(undefined);
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({
          ...envelope,
          senderIdentity: { siteAri: senderIdentity.siteAri },
        }),
      ),
    ).toBe(undefined);
  });

  it("rejects a non-RFC-3339 created-at instant", () => {
    expect(
      parsePeerOperationEnvelope(
        JSON.stringify({ ...envelope, createdAt: "2026-09-15" }),
      ),
    ).toBe(undefined);
  });
});
