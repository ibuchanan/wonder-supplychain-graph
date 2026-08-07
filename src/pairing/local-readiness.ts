import type { DemoPairing } from "./apply-demo-pairing-seed";

export type LocalRole = "destination" | "source";

export type LocalReadinessStatus =
  | "failed"
  | "ready"
  | "unconfigured"
  | "waiting-for-pairing";

export interface LocalReadiness {
  readonly status: LocalReadinessStatus;
}

export interface LocalReadinessInput {
  readonly activeConnectionId?: string;
  readonly failure?: { readonly code: string };
  readonly pairings: readonly DemoPairing[];
  readonly role?: LocalRole;
}

export function determineLocalReadiness(
  input: LocalReadinessInput,
): LocalReadiness {
  if (input.failure) {
    return { status: "failed" };
  }

  if (!input.role) {
    return { status: "unconfigured" };
  }

  if (input.role === "source") {
    return input.pairings.some(
      (pairing) =>
        pairing.role === "source" &&
        pairing.status === "active" &&
        Boolean(pairing.peerDeliveryUrl),
    )
      ? { status: "ready" }
      : { status: "waiting-for-pairing" };
  }

  return input.pairings.some(
    (pairing) =>
      pairing.role === "destination" &&
      pairing.status === "active" &&
      pairing.connectionId === input.activeConnectionId,
  )
    ? { status: "ready" }
    : { status: "waiting-for-pairing" };
}
