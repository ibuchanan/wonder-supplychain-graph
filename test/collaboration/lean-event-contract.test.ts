import { describe, expect, it } from "vitest";

import {
  enrichLeanEventForAutomation,
  type LeanEvent,
  parseLeanEvent,
} from "../../src/collaboration/lean-event-contract";

const validEvent = (): LeanEvent => ({
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
});

describe("lean event contract", () => {
  it("accepts the lean CloudEvent and enriches only the Automation copy", () => {
    const event = validEvent();

    expect(parseLeanEvent(JSON.stringify(event))).toEqual(event);
    expect(enrichLeanEventForAutomation(event, "GREEN-42")).toEqual({
      ...event,
      data: { ...event.data, pairedEpicKey: "GREEN-42" },
    });
    expect(event.data).not.toHaveProperty("pairedEpicKey");
  });

  it("rejects untrusted payloads that violate the identifier-only contract", () => {
    const event = validEvent();

    for (const payload of [
      "not JSON",
      JSON.stringify({ ...event, subject: "issue/OTHER-1" }),
      JSON.stringify({ ...event, time: "not-a-time" }),
      JSON.stringify({
        ...event,
        data: { ...event.data, updatedFields: ["summary"] },
      }),
      JSON.stringify({
        ...event,
        data: { ...event.data, pairedEpicKey: "GREEN-42" },
      }),
    ]) {
      expect(parseLeanEvent(payload)).toBeUndefined();
    }
  });
});
