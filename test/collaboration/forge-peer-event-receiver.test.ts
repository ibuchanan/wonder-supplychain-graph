import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({ fetch: vi.fn() }));
vi.mock("@forge/kvs", () => ({ kvs: { get: vi.fn() } }));

import { receivePeerEvent } from "../../src/collaboration/forge-peer-event-receiver";
import { signPeerRequest } from "../../src/collaboration/peer-hmac-auth";

const secret = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);
const timestamp = "2026-09-14T16:00:00.000Z";
const validEvent = {
  data: { issueKey: "BLUE-101", pairingId: "pairing-001", updatedFields: [] },
  datacontenttype: "application/json",
  id: "event-001",
  source: "ari:cloud:jira::site/blue-site",
  specversion: "1.0",
  subject: "issue/BLUE-101",
  time: "2026-08-22T14:30:00.000Z",
  type: "scg:work-package:queued",
};

function signedRequest(body = JSON.stringify(validEvent)) {
  const headers = signPeerRequest(secret, body, timestamp);
  return {
    body,
    headers: Object.fromEntries(
      Object.entries(headers ?? {}).map(([key, value]) => [key, [value]]),
    ),
  };
}

describe("receivePeerEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    vi.stubEnv("SHARED_SECRET", secret);
    vi.mocked(kvs.get).mockResolvedValue({
      pairings: [
        {
          automationWebhookUrl: "https://automation.example/webhook",
          connectionId: "connection-001",
          pairedEpicKey: "GREEN-42",
          pairingId: "pairing-001",
          role: "destination",
          sourceEpicKey: "BLUE-101",
          status: "active",
        },
      ],
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("forwards one signed CloudEvent after validating its active local Pairing", async () => {
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
      receivePeerEvent({ body: JSON.stringify(validEvent) }),
    ).resolves.toEqual({
      body: JSON.stringify({ error: "invalid-hmac-timestamp" }),
      headers: { "Content-Type": ["application/json"] },
      statusCode: 401,
    });
    await expect(
      receivePeerEvent({
        ...signedRequest(),
        body: JSON.stringify({ ...validEvent, id: "changed" }),
      }),
    ).resolves.toMatchObject({ statusCode: 401 });

    expect(kvs.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
