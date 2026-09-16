import { describe, expect, it } from "vitest";

import { readGraphCxChangeRequest } from "../../src/projection/read-graph-cx-change-request";

/** What the graph-connector platform sends, using its own field names. */
const platformPayload = {
  action: "CREATED",
  configProperties: {},
  connectionId: "graph-cx-001",
  name: "Supplychain Graph Package",
} as const;

/** What the domain expects to read out of it. */
const graphCxChange = {
  action: "CREATED",
  configProperties: {},
  graphCxId: "graph-cx-001",
  name: "Supplychain Graph Package",
} as const;

describe("readGraphCxChangeRequest", () => {
  it("accepts the direct connection-change payload", () => {
    const result = readGraphCxChangeRequest(platformPayload);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error("Expected the direct connection-change payload to parse");
    }

    expect(result.value).toEqual(graphCxChange);
  });

  it("accepts the Forge event wrapper around a connection-change payload", () => {
    const result = readGraphCxChangeRequest({ body: platformPayload });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(
        "Expected the wrapped connection-change payload to parse",
      );
    }

    expect(result.value).toEqual(graphCxChange);
  });

  it("rejects a connection-change payload without a recognized action", () => {
    const result = readGraphCxChangeRequest({
      body: { ...platformPayload, action: "CONNECTED" },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown action to be rejected");
    }

    expect(result.error).toEqual({ code: "invalid-graph-cx-change-request" });
  });
});
