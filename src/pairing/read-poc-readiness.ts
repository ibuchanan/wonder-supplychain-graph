import { evaluatePocReadiness, type PocReadiness } from "./poc-readiness";

export interface PocReadinessDependencies {
  readonly getIdentity: () => {
    readonly environmentAri?: string;
    readonly environmentType?: string;
    readonly installationAri?: string;
    readonly siteAri?: string;
  };
  readonly getSecret: () => string | undefined;
  readonly readDurableState: () => Promise<unknown>;
}

export async function readPocReadiness(
  dependencies: PocReadinessDependencies,
): Promise<PocReadiness> {
  try {
    await dependencies.readDurableState();
    const secret = dependencies.getSecret();

    return evaluatePocReadiness({
      durableStateAvailable: true,
      ...dependencies.getIdentity(),
      ...(secret ? { secret } : {}),
    });
  } catch {
    return { status: "blocked" };
  }
}
