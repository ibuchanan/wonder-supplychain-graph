/**
 * Whether this installation is provisioned to exchange work packages at all:
 * it knows who it is, its durable state answers, and it holds a usable secret.
 * This is about the installation, not about any PeerCX or pairing — see
 * `local-readiness.ts` for the readiness of a role under a pairing.
 */
export type InstallationReadinessStatus = "blocked" | "ready";

export interface InstallationReadiness {
  readonly status: InstallationReadinessStatus;
}

export interface InstallationReadinessInput {
  readonly durableStateAvailable: boolean;
  readonly environmentAri?: string;
  readonly installationAri?: string;
  readonly secret?: string;
  readonly siteAri?: string;
}

function hasValidSecret(secret: string | undefined): boolean {
  if (!secret || !/^[A-Za-z0-9+/]+={0,2}$/.test(secret)) {
    return false;
  }

  const decoded = Buffer.from(secret, "base64");
  return (
    decoded.toString("base64") === secret &&
    decoded.length >= 32 &&
    decoded.length <= 64
  );
}

export function evaluateInstallationReadiness(
  input: InstallationReadinessInput,
): InstallationReadiness {
  if (
    !input.environmentAri ||
    !input.installationAri ||
    !input.siteAri ||
    !input.durableStateAvailable ||
    !hasValidSecret(input.secret)
  ) {
    return { status: "blocked" };
  }

  return { status: "ready" };
}
