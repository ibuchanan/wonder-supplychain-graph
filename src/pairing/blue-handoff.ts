export interface BlueHandoffBundle {
  readonly correlationId: string;
  readonly greenBootstrapUrl: string;
}

export interface BlueHandoffConfiguration {
  readonly approvedBlueOrigins: readonly string[];
  readonly blueNavigationUrl?: string;
}

export type BlueHandoff =
  | { readonly kind: "external-navigation"; readonly url: string }
  | { readonly bundle: BlueHandoffBundle; readonly kind: "manual-copy" };

export function buildBlueHandoff(
  bundle: BlueHandoffBundle,
  configuration: BlueHandoffConfiguration,
): BlueHandoff {
  const fallback: BlueHandoff = { bundle, kind: "manual-copy" };

  if (!configuration.blueNavigationUrl) {
    return fallback;
  }

  try {
    const blueNavigationUrl = new URL(configuration.blueNavigationUrl);
    const approvedOrigins = new Set(configuration.approvedBlueOrigins);

    if (
      blueNavigationUrl.protocol !== "https:" ||
      !approvedOrigins.has(blueNavigationUrl.origin) ||
      blueNavigationUrl.search ||
      blueNavigationUrl.hash
    ) {
      return fallback;
    }

    blueNavigationUrl.searchParams.set(
      "bootstrapUrl",
      bundle.greenBootstrapUrl,
    );
    blueNavigationUrl.searchParams.set("correlation", bundle.correlationId);

    return { kind: "external-navigation", url: blueNavigationUrl.toString() };
  } catch {
    return fallback;
  }
}
