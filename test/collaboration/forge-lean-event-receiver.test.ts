import { fetch } from "@forge/api";
import { kvs } from "@forge/kvs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@forge/api", () => ({ fetch: vi.fn() }));
vi.mock("@forge/kvs", () => ({ kvs: { get: vi.fn() } }));

import { receiveLeanEvent } from "../../src/collaboration/forge-lean-event-receiver";

const validEvent = {
  data: {
    issueKey: "BLUE-101",
    pairingId: "pairing-001",
    updatedFields: [],
  },
  datacontenttype: "application/json",
  id: "event-001",
  source: "ari:cloud:jira::site/blue-site",
  specversion: "1.0",
  subject: "issue/BLUE-101",
  time: "2026-08-22T14:30:00.000Z",
  type: "scg:work-package:queued",
};

describe("receiveLeanEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it("forwards one enriched identifier-only event after validating its active local pairing", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as never);

    await expect(
      receiveLeanEvent({ body: JSON.stringify(validEvent) }),
    ).resolves.toMatchObject({ statusCode: 200 });

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

  it("rejects invalid or mismatched events without calling Automation", async () => {
    await expect(receiveLeanEvent({ body: "not JSON" })).resolves.toMatchObject(
      {
        statusCode: 400,
      },
    );
    await expect(
      receiveLeanEvent({
        body: JSON.stringify({
          ...validEvent,
          data: { ...validEvent.data, issueKey: "BLUE-999" },
          subject: "issue/BLUE-999",
        }),
      }),
    ).resolves.toMatchObject({ statusCode: 409 });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a gateway error when Automation rejects the accepted event", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as never);

    await expect(
      receiveLeanEvent({ body: JSON.stringify(validEvent) }),
    ).resolves.toMatchObject({ statusCode: 502 });
  });
});
