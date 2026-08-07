import { V1_PEER_OPERATIONS } from "../../src/collaboration/protocol";

describe("V1 peer protocol", () => {
  it("defines invitation, acceptance, starter delivery, candidate, cancellation, and lifecycle operations", () => {
    expect(V1_PEER_OPERATIONS).toEqual([
      "invitation.receive",
      "invitation.accept",
      "starter.delivery",
      "snapshot.candidate.receive",
      "candidate.cancel",
      "lifecycle.unavailable",
    ]);
    expect(Object.isFrozen(V1_PEER_OPERATIONS)).toBe(true);
  });
});
