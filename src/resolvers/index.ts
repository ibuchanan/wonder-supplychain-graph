import { getAppContext } from "@forge/api";
import Resolver from "@forge/resolver";

import {
  determineLocalReadiness,
  type LocalRole,
} from "../pairing/local-readiness";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { readPocReadiness } from "../pairing/read-poc-readiness";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";

const resolver = new Resolver();

resolver.define("getActionConfigStatus", () => ({ ready: true }));

resolver.define("getPocReadiness", () =>
  readPocReadiness({
    getIdentity: () => {
      const context = getAppContext();
      const cloudId = context.installation?.contexts.find(
        (installationContext) => installationContext.cloudId,
      )?.cloudId;

      return {
        environmentAri: context.environmentAri.toString(),
        environmentType: context.environmentType,
        installationAri: context.installationAri.toString(),
        ...(cloudId ? { siteAri: `ari:cloud:jira::site/${cloudId}` } : {}),
      };
    },
    getSecret: () => process.env["SHARED_SECRET"],
    readDurableState: async () => {
      await Promise.all([
        kvsPeerPairingStore.read(),
        kvsPackageConnectionStore.getActiveConnectionId(),
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
  const [pairingState, activeConnectionId] = await Promise.all([
    kvsPeerPairingStore.read(),
    kvsPackageConnectionStore.getActiveConnectionId(),
  ]);

  return determineLocalReadiness({
    ...(activeConnectionId ? { activeConnectionId } : {}),
    pairings: pairingState.pairings,
    ...(role ? { role } : {}),
  });
});

export const handler = resolver.getDefinitions();
