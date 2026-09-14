import Resolver from "@forge/resolver";

import {
  determineLocalReadiness,
  type LocalRole,
} from "../pairing/local-readiness";
import { kvsPeerPairingStore } from "../pairing/kvs-peer-pairing-store";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";

const resolver = new Resolver();

resolver.define("getActionConfigStatus", () => ({ ready: true }));

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
