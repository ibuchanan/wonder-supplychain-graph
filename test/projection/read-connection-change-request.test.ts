import { describe, expect, it } from "vitest";

import { readConnectionChangeRequest } from "../../src/projection/read-connection-change-request";

const request = {
  action: "CREATED",
  configProperties: {},
  connectionId: "connection-001",
  name: "Supplychain Graph Package",
} as const;

describe("readConnectionChangeRequest", () => {
  it("accepts the direct connection-change payload", () => {
    const result = readConnectionChangeRequest(request);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error("Expected the direct connection-change payload to parse");
    }

    expect(result.value).toEqual(request);
  });

  it("accepts the Forge event wrapper around a connection-change payload", () => {
    const result = readConnectionChangeRequest({ body: request });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(
        "Expected the wrapped connection-change payload to parse",
      );
    }

    expect(result.value).toEqual(request);
  });

  it("rejects a connection-change payload without a recognized action", () => {
    const result = readConnectionChangeRequest({
      body: { ...request, action: "CONNECTED" },
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.unreachable("Expected an unknown action to be rejected");
    }

    expect(result.error).toEqual({ code: "invalid-connection-change-request" });
  });
});
