export const V1_PEER_OPERATIONS = Object.freeze([
  "invitation.receive",
  "invitation.accept",
  "starter.delivery",
  "snapshot.candidate.receive",
  "candidate.cancel",
  "lifecycle.unavailable",
] as const);

export type PeerOperation = (typeof V1_PEER_OPERATIONS)[number];

export type ProtocolVersion = "v1";

/**
 * The one direction a setup message is permitted to travel. Blue initiates
 * every bootstrap request and Green answers only on those requests, so a
 * message arriving in the reverse direction is not this route's to apply even
 * when it is validly signed with the shared secret.
 */
export type SetupDirection = "blue-to-green" | "green-to-blue";
