import { describe, expect, it } from "vitest";

import { createActionExecutionMetadata } from "../../src/publication/action-execution-metadata";

describe("createActionExecutionMetadata", () => {
  it("creates correlation, idempotency, and publication time internally from one execution ID", () => {
    expect(
      createActionExecutionMetadata("MFG-17", {
        now: () => new Date("2026-08-05T14:30:00.000Z"),
        randomUUID: () => "execution-001",
      }),
    ).toEqual({
      correlationId: "scg:execution-001",
      idempotencyKey: "scg:MFG-17:execution-001",
      publishedAt: "2026-08-05T14:30:00.000Z",
    });
  });
});
