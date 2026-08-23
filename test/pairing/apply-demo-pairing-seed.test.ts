import type { Result } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";

import {
  applyDemoPairingSeed,
  type DemoPairingState,
} from "../../src/pairing/apply-demo-pairing-seed";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);
  if (result.isErr()) {
    throw new Error(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

describe("applyDemoPairingSeed", () => {
  it("creates the active source Pairing with its peer delivery endpoint", () => {
    const state: DemoPairingState = { pairings: [] };

    const result = expectOk(
      applyDemoPairingSeed(state, {
        pairingId: "demo-pairing-001",
        peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
        peerEventUrl: "https://supplier.example/forge/webtrigger/receive-event",
        role: "source",
        sourceEpicKey: "MFG-17",
        sourceSiteAri: "ari:cloud:jira::site/source-001",
        sourceSiteUrl: "https://source-example.atlassian.net/",
      }),
    );

    expect(result.nextState).toEqual({
      pairings: [
        {
          pairingId: "demo-pairing-001",
          peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
          peerEventUrl:
            "https://supplier.example/forge/webtrigger/receive-event",
          role: "source",
          sourceEpicKey: "MFG-17",
          sourceSiteAri: "ari:cloud:jira::site/source-001",
          sourceSiteUrl: "https://source-example.atlassian.net",
          status: "active",
        },
      ],
    });
  });

  it("rejects a source seed with an invalid peer event URL", () => {
    const result = applyDemoPairingSeed(
      { pairings: [] },
      {
        pairingId: "demo-pairing-001",
        peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
        peerEventUrl: "not-a-url",
        role: "source",
        sourceEpicKey: "MFG-17",
        sourceSiteAri: "ari:cloud:jira::site/source-001",
        sourceSiteUrl: "https://source-example.atlassian.net",
      },
    );

    expect(result).toMatchObject({ error: { code: "invalid-peer-event-url" } });
  });

  it("idempotently replaces the matching source Pairing", () => {
    const result = expectOk(
      applyDemoPairingSeed(
        {
          pairings: [
            {
              pairingId: "demo-pairing-001",
              peerDeliveryUrl:
                "https://old-supplier.example/forge/webtrigger/deliver",
              peerEventUrl:
                "https://old-supplier.example/forge/webtrigger/receive-event",
              role: "source",
              sourceEpicKey: "MFG-16",
              sourceSiteAri: "ari:cloud:jira::site/source-001",
              sourceSiteUrl: "https://old-source-example.atlassian.net",
              status: "active",
            },
          ],
        },
        {
          pairingId: "demo-pairing-001",
          peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
          peerEventUrl:
            "https://supplier.example/forge/webtrigger/receive-event",
          role: "source",
          sourceEpicKey: "MFG-17",
          sourceSiteAri: "ari:cloud:jira::site/source-001",
          sourceSiteUrl: "https://source-example.atlassian.net",
        },
      ),
    );

    expect(result.nextState.pairings).toEqual([
      {
        pairingId: "demo-pairing-001",
        peerDeliveryUrl: "https://supplier.example/forge/webtrigger/deliver",
        peerEventUrl: "https://supplier.example/forge/webtrigger/receive-event",
        role: "source",
        sourceEpicKey: "MFG-17",
        sourceSiteAri: "ari:cloud:jira::site/source-001",
        sourceSiteUrl: "https://source-example.atlassian.net",
        status: "active",
      },
    ]);
  });

  it("rejects a destination seed when no active graph connection exists", () => {
    const result = applyDemoPairingSeed(
      { pairings: [] },
      {
        automationWebhookUrl: "https://automation.example/webhook/green-001",
        pairedEpicKey: "SUP-42",
        pairingId: "demo-pairing-001",
        role: "destination",
        sourceEpicKey: "MFG-17",
      },
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable(
        "Expected a destination without a graph connection to fail",
      );
    }
    expect(result.error).toEqual({
      code: "destination-connection-unavailable",
    });
  });

  it("rejects a destination seed with an invalid Automation webhook URL", () => {
    const result = applyDemoPairingSeed(
      { activeConnectionId: "connection-001", pairings: [] },
      {
        automationWebhookUrl: "not-a-url",
        pairedEpicKey: "SUP-42",
        pairingId: "demo-pairing-001",
        role: "destination",
        sourceEpicKey: "MFG-17",
      },
    );

    expect(result).toMatchObject({
      error: { code: "invalid-automation-webhook-url" },
    });
  });

  it("binds the active destination Pairing to the active graph connection", () => {
    const result = expectOk(
      applyDemoPairingSeed(
        { activeConnectionId: "connection-001", pairings: [] },
        {
          automationWebhookUrl: "https://automation.example/webhook/green-001",
          pairedEpicKey: "SUP-42",
          pairingId: "demo-pairing-001",
          role: "destination",
          sourceEpicKey: "MFG-17",
        },
      ),
    );

    expect(result.nextState.pairings).toEqual([
      {
        automationWebhookUrl: "https://automation.example/webhook/green-001",
        connectionId: "connection-001",
        pairedEpicKey: "SUP-42",
        pairingId: "demo-pairing-001",
        role: "destination",
        sourceEpicKey: "MFG-17",
        status: "active",
      },
    ]);
  });
});
