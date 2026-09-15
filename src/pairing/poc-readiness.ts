export type PocReadinessStatus = "blocked" | "ready";

export interface PocReadiness {
  readonly status: PocReadinessStatus;
}

export interface PocReadinessInput {
  readonly durableStateAvailable: boolean;
  readonly environmentAri?: string;
  readonly environmentType?: string;
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

export function evaluatePocReadiness(input: PocReadinessInput): PocReadiness {
  if (
    input.environmentType !== "DEVELOPMENT" ||
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
