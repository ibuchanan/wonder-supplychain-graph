import { getAppContext } from "@forge/api";
import type Resolver from "@forge/resolver";

import {
  determineLocalReadiness,
  type LocalRole,
} from "../pairing/local-readiness";
import { readInstallationReadiness } from "../pairing/read-installation-readiness";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { kvsGraphCxStore } from "../projection/kvs-graph-cx-store";

export function registerReadinessResolvers(resolver: Resolver): void {
  resolver.define("getInstallationReadiness", () =>
    readInstallationReadiness({
      getIdentity: () => {
        const context = getAppContext();
        const cloudId = context.installation?.contexts.find(
          (installationContext) => installationContext.cloudId,
        )?.cloudId;

        return {
          environmentAri: context.environmentAri.toString(),
          installationAri: context.installationAri.toString(),
          ...(cloudId ? { siteAri: `ari:cloud:jira::site/${cloudId}` } : {}),
        };
      },
      getSecret: () => process.env["SHARED_SECRET"],
      readDurableState: async () => {
        await Promise.all([
          kvsPeerPairingStore.read(),
          kvsGraphCxStore.getActiveGraphCxId(),
        ]);
      },
    }),
  );

  resolver.define("getLocalReadiness", async () => {
    const configuredRole = process.env["DEMO_LOCAL_ROLE"];
    const role: LocalRole | undefined =
      configuredRole === "source" || configuredRole === "destination"
        ? configuredRole
        : undefined;
    const [pairingState, activeGraphCxId] = await Promise.all([
      kvsPeerPairingStore.read(),
      kvsGraphCxStore.getActiveGraphCxId(),
    ]);

    return determineLocalReadiness({
      ...(activeGraphCxId ? { activeGraphCxId } : {}),
      pairings: pairingState.pairings,
      ...(role ? { role } : {}),
    });
  });
}
