export interface PeerCx {
  readonly counterpartSiteAri: string;
  readonly leaseEndsAt: string;
  readonly peerCxId: string;
  readonly status: "active" | "expired" | "failed" | "pending" | "revoked";
  readonly termsVersion: string;
}

export interface PeerCxAuthorizationRequest {
  readonly counterpartSiteAri: string;
  readonly now: string;
  readonly peerCxId: string;
}

function isIsoInstant(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

export function evaluatePeerCxAuthorization(
  peerCx: PeerCx | undefined,
  request: PeerCxAuthorizationRequest,
): { readonly authorized: boolean } {
  return {
    authorized:
      peerCx !== undefined &&
      peerCx.status === "active" &&
      peerCx.peerCxId === request.peerCxId &&
      peerCx.counterpartSiteAri === request.counterpartSiteAri &&
      isIsoInstant(peerCx.leaseEndsAt) &&
      isIsoInstant(request.now) &&
      peerCx.leaseEndsAt > request.now,
  };
}
