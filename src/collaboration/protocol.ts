export const V1_PEER_OPERATIONS = Object.freeze([
  "invitation.receive",
  "invitation.accept",
  "snapshot.candidate.receive",
  "candidate.cancel",
  "lifecycle.unavailable",
] as const);

export type PeerOperation = (typeof V1_PEER_OPERATIONS)[number];

export type ProtocolVersion = "v1";
