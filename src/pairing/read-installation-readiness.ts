import {
  evaluateInstallationReadiness,
  type InstallationReadiness,
} from "./installation-readiness";

export interface InstallationReadinessDependencies {
  readonly getIdentity: () => {
    readonly environmentAri?: string;
    readonly installationAri?: string;
    readonly siteAri?: string;
  };
  readonly getSecret: () => string | undefined;
  readonly readDurableState: () => Promise<unknown>;
}

export async function readInstallationReadiness(
  dependencies: InstallationReadinessDependencies,
): Promise<InstallationReadiness> {
  try {
    await dependencies.readDurableState();
    const secret = dependencies.getSecret();

    return evaluateInstallationReadiness({
      durableStateAvailable: true,
      ...dependencies.getIdentity(),
      ...(secret ? { secret } : {}),
    });
  } catch {
    return { status: "blocked" };
  }
}
