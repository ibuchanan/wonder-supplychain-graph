import { kvs } from "@forge/kvs";
import { graph } from "@forge/teamwork-graph";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/kvs", () => ({
  kvs: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@forge/teamwork-graph", () => ({
  graph: { setObjects: vi.fn() },
}));

import { receiveStarterDelivery } from "../../src/collaboration/forge-starter-peer-delivery";

describe("receiveStarterDelivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(kvs.get).mockImplementation(async (key) => {
      if (key === "active-graph-connection-id") {
        return "connection-001" as never;
      }

      if (key === "demo-pairing-state") {
        return {
          pairings: [
            {
              connectionId: "connection-001",
              pairedEpicKey: "SUP-42",
              pairingId: "pairing-001",
              role: "destination",
              sourceEpicKey: "MFG-17",
              status: "active",
            },
          ],
        } as never;
      }

      return undefined;
    });
    vi.mocked(graph.setObjects).mockResolvedValue({ success: true });
  });

  it("indexes one workspace-visible document from a valid terminal delivery", async () => {
    await expect(
      receiveStarterDelivery({
        body: JSON.stringify({
          correlationId: "corr-001",
          pairingId: "pairing-001",
          protocolVersion: "v1",
          sourceEpic: {
            createdAt: "2026-08-01T12:00:00.000Z",
            id: "10017",
            key: "MFG-17",
            summary: "Approve material source",
            updatedAt: "2026-08-07T19:00:00.000Z",
            url: "https://manufacturer.example/browse/MFG-17",
          },
        }),
      }),
    ).resolves.toEqual({
      body: JSON.stringify({
        connectionId: "connection-001",
        correlationId: "corr-001",
        documentId: "pairing-001:10017",
        objectCount: 1,
        outcome: "accepted",
        updateSequence: Date.parse("2026-08-07T19:00:00.000Z"),
      }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 200,
    });

    expect(graph.setObjects).toHaveBeenCalledExactlyOnceWith({
      connectionId: "connection-001",
      objects: [
        {
          "atlassian:document": {
            content: {
              mimeType: "text/plain",
              text: "MFG-17: Approve material source",
            },
            type: { category: "DOCUMENT" },
          },
          createdAt: "2026-08-01T12:00:00.000Z",
          displayName: "MFG-17: Approve material source",
          id: "pairing-001:10017",
          lastUpdatedAt: "2026-08-07T19:00:00.000Z",
          permissions: [
            {
              accessControls: [
                { principals: [{ type: "ATLASSIAN_WORKSPACE" }] },
              ],
            },
          ],
          schemaVersion: "1.0",
          updateSequenceNumber: Date.parse("2026-08-07T19:00:00.000Z"),
          url: "https://manufacturer.example/browse/MFG-17",
        },
      ],
    });
    expect(kvs.set).not.toHaveBeenCalled();
  });

  it("returns a stable error when graph rejects the document", async () => {
    vi.mocked(graph.setObjects).mockResolvedValue({
      error: "document validation failed",
      results: {
        rejected: [
          {
            errors: [
              { key: "atlassian:document.type.category", message: "invalid" },
            ],
            key: {
              entityId: { id: "pairing-001:10017" },
              entityType: "atlassian:document",
            },
          },
        ],
      },
      success: false,
    });

    await expect(
      receiveStarterDelivery({
        body: JSON.stringify({
          correlationId: "corr-001",
          pairingId: "pairing-001",
          protocolVersion: "v1",
          sourceEpic: {
            id: "10017",
            key: "MFG-17",
            summary: "Approve material source",
            updatedAt: "2026-08-07T19:00:00.000Z",
            url: "https://manufacturer.example/browse/MFG-17",
          },
        }),
      }),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "graph-document-upsert-failed" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 502,
    });
  });

  it("rejects malformed terminal input before reading or writing local state", async () => {
    await expect(receiveStarterDelivery({ body: "not JSON" })).resolves.toEqual(
      {
        body: JSON.stringify({ error: "invalid-starter-delivery" }),
        headers: { "Content-Type": ["application/json"] },
        statusCode: 400,
      },
    );

    expect(kvs.get).not.toHaveBeenCalled();
    expect(kvs.set).not.toHaveBeenCalled();
    expect(graph.setObjects).not.toHaveBeenCalled();
  });

  it("rejects a delivery whose active local Pairing does not match its source Epic", async () => {
    vi.mocked(kvs.get).mockImplementation(async (key) => {
      if (key === "active-graph-connection-id") {
        return "connection-001" as never;
      }

      if (key === "demo-pairing-state") {
        return {
          pairings: [
            {
              connectionId: "connection-001",
              pairedEpicKey: "SUP-42",
              pairingId: "pairing-001",
              role: "destination",
              sourceEpicKey: "MFG-99",
              status: "active",
            },
          ],
        } as never;
      }

      return undefined;
    });

    await expect(
      receiveStarterDelivery({
        body: JSON.stringify({
          correlationId: "corr-001",
          pairingId: "pairing-001",
          protocolVersion: "v1",
          sourceEpic: {
            id: "10017",
            key: "MFG-17",
            summary: "Approve material source",
            updatedAt: "2026-08-07T19:00:00.000Z",
            url: "https://manufacturer.example/browse/MFG-17",
          },
        }),
      }),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "destination-pairing-unavailable" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 409,
    });

    expect(kvs.set).not.toHaveBeenCalled();
    expect(graph.setObjects).not.toHaveBeenCalled();
  });
});
