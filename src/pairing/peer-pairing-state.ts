import type { PeerOperation } from "../collaboration/protocol";

/**
 * Operations this Pairing authorizes, and the Site relationship it was
 * authorized under. A Pairing never inherits authority from an active
 * relationship: an empty or absent allowlist authorizes nothing.
 */
interface PairingAuthorization {
  readonly allowedOperations: readonly PeerOperation[];
  readonly relationshipId: string;
}

export interface SourcePeerPairing extends PairingAuthorization {
  readonly peerEventUrl: string;
  readonly pairingId: string;
  readonly role: "source";
  readonly sourceEpicKey: string;
  readonly sourceSiteAri: string;
  readonly sourceSiteUrl: string;
  readonly status: "active" | "inactive";
}

export interface DestinationPeerPairing extends PairingAuthorization {
  readonly automationWebhookUrl: string;
  readonly connectionId: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly role: "destination";
  readonly sourceEpicKey: string;
  readonly status: "active" | "inactive";
}

export type PeerPairing = DestinationPeerPairing | SourcePeerPairing;

export interface PeerPairingState {
  readonly pairings: readonly PeerPairing[];
}
