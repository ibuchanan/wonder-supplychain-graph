import type { Result } from "@forge-ahead/errors";

import {
  createQueuedWorkPackageEvent,
  validateQueuedWorkPackageEvent,
} from "../../src/collaboration/queued-work-package-event";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

const validEvent = {
  datacontenttype: "application/json",
  data: {
    issueKey: "BLUE-17",
    pairingId: "pairing-001",
    updatedFields: [],
  },
  id: "3465e6b3-75b1-4b84-a789-b8adab7d0cd4",
  source: "ari:cloud:jira::site/blue-site-id",
  specversion: "1.0",
  subject: "issue/BLUE-17",
  time: "2026-08-22T14:30:00.000Z",
  type: "scg:work-package:queued",
} as const;

describe("createQueuedWorkPackageEvent", () => {
  it("builds a deterministic lean CloudEvent from injected dependencies", () => {
    expect(
      createQueuedWorkPackageEvent({
        clock: () => "2026-08-22T14:30:00.000Z",
        issueKey: "BLUE-17",
        pairingId: "pairing-001",
        source: "ari:cloud:jira::site/blue-site-id",
        uuid: () => "3465e6b3-75b1-4b84-a789-b8adab7d0cd4",
      }),
    ).toEqual({
      datacontenttype: "application/json",
      data: {
        issueKey: "BLUE-17",
        pairingId: "pairing-001",
        updatedFields: [],
      },
      id: "3465e6b3-75b1-4b84-a789-b8adab7d0cd4",
      source: "ari:cloud:jira::site/blue-site-id",
      specversion: "1.0",
      subject: "issue/BLUE-17",
      time: "2026-08-22T14:30:00.000Z",
      type: "scg:work-package:queued",
    });
  });
});

describe("validateQueuedWorkPackageEvent", () => {
  it("accepts only lean fields from the canonical CloudEvent", () => {
    expect(
      expectOk(
        validateQueuedWorkPackageEvent({
          ...validEvent,
          data: { ...validEvent.data, summary: "not retained" },
          destinationIssueKey: "GREEN-42",
        }),
      ),
    ).toEqual(validEvent);
  });

  it.each([
    ["a non-object body", null],
    ["a missing id", { ...validEvent, id: undefined }],
    ["an unsupported type", { ...validEvent, type: "avi:jira:updated:issue" }],
    ["an invalid timestamp", { ...validEvent, time: "yesterday" }],
    [
      "an impossible ISO date",
      { ...validEvent, time: "2026-02-30T14:30:00.000Z" },
    ],
    ["a mismatched subject", { ...validEvent, subject: "issue/BLUE-18" }],
    [
      "a blank pairing ID",
      { ...validEvent, data: { ...validEvent.data, pairingId: "" } },
    ],
    [
      "a blank issue key",
      { ...validEvent, data: { ...validEvent.data, issueKey: "" } },
    ],
    [
      "a non-empty updated-fields array",
      {
        ...validEvent,
        data: { ...validEvent.data, updatedFields: ["status"] },
      },
    ],
  ])("rejects %s with a typed error", (_description, value) => {
    const result = validateQueuedWorkPackageEvent(value);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an invalid event to fail");
    }
    expect(result.error).toEqual({ code: "invalid-queued-work-package-event" });
  });
});
