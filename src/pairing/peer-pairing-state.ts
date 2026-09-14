export interface SourcePeerPairing {
  readonly peerEventUrl: string;
  readonly pairingId: string;
  readonly role: "source";
  readonly sourceEpicKey: string;
  readonly sourceSiteAri: string;
  readonly sourceSiteUrl: string;
  readonly status: "active" | "inactive";
}

export interface DestinationPeerPairing {
  readonly automationWebhookUrl: string;
  readonly connectionId: string;
  readonly pairedEpicKey: string;
  readonly pairingId: string;
  readonly role: "destination";
  readonly sourceEpicKey: string;
  readonly status: "active" | "inactive";
}

export interface PeerPairingState {
  readonly pairings: readonly (SourcePeerPairing | DestinationPeerPairing)[];
}
