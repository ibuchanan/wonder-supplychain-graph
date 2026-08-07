/**
 * Forge entry point.
 *
 * SCG keeps a pure collaboration core. Handlers here are thin adapters that
 * inject Forge-hosted ports into that core and perform no decision logic.
 */

import { graph } from "@forge/teamwork-graph";

import { logger } from "./logging";
import {
  logAppInstalled,
  logAppUpgraded,
  logGraphConnectionChanged,
  logGraphConnectionResult,
} from "./observability/domain-events";

// Re-exported for repository-wide Forge handler contract tests; the manifest
// resolves this value from resolvers/index.handler.
export { handler } from "./resolvers";

import type { RovoCommentActionPayload } from "./collaboration/forge-rovo-comment-action";
import { commentOnOriginatingEpicFromRovo } from "./collaboration/forge-rovo-comment-action";
import {
  onConfigChange,
  type OnConfigChangeRequest,
  type OnConfigChangeResponse,
} from "./cx-management";
import {
  type PublishPackageToGraphInput,
  publishPackageToGraph as publishDemoPackageToGraph,
} from "./projection/forge-demo-projection-action";
import {
  seedDestinationPairing,
  seedSourcePairing,
} from "./pairing/forge-demo-pairing-seed";
import { kvsPackageConnectionStore } from "./projection/kvs-connection-store";
import {
  type PublishWorkPackageActionInput,
  publishWorkPackage as publishAutomationWorkPackage,
} from "./publication/forge-automation-action";

/**
 * Thin Forge entry point for the Supplychain Graph Rovo comment action.
 */
export async function commentOnOriginEpic(payload: RovoCommentActionPayload) {
  return commentOnOriginatingEpicFromRovo(payload);
}

/**
 * Thin Forge entry point for the demo Jira Automation action.
 */
export async function publishWorkPackage(
  payload: PublishWorkPackageActionInput,
) {
  return publishAutomationWorkPackage(payload);
}

/**
 * Thin Forge entry point for the Rovo graph-discovery demo action.
 */
export async function publishPackageToGraph(
  payload: PublishPackageToGraphInput,
) {
  return publishDemoPackageToGraph(payload);
}

export { seedDestinationPairing, seedSourcePairing };

interface ForgeLifecycleEvent {
  readonly app: {
    readonly id: string;
    readonly version: string;
  };
  readonly environment?: {
    readonly id: string;
  };
  readonly id: string;
  readonly installerAccountId?: string;
  readonly upgraderAccountId?: string;
}

/** Logs installation only; initialization must remain eventually-consistent safe. */
export async function onInstalled(event: ForgeLifecycleEvent): Promise<void> {
  logAppInstalled(logger, {
    appId: event.app.id,
    appVersion: event.app.version,
    installationId: event.id,
    ...(event.environment ? { environmentId: event.environment.id } : {}),
    ...(event.installerAccountId
      ? { installerAccountId: event.installerAccountId }
      : {}),
  });
}

/** Logs major app upgrades only; no migration side effects are performed. */
export async function onUpgraded(event: ForgeLifecycleEvent): Promise<void> {
  logAppUpgraded(logger, {
    appId: event.app.id,
    appVersion: event.app.version,
    installationId: event.id,
    ...(event.environment ? { environmentId: event.environment.id } : {}),
    ...(event.upgraderAccountId
      ? { upgraderAccountId: event.upgraderAccountId }
      : {}),
  });
}

export async function onPackageConnectionChange(
  request: OnConfigChangeRequest,
): Promise<OnConfigChangeResponse> {
  logGraphConnectionChanged(logger, {
    action: request.action,
    connectionId: request.connectionId,
    connectionName: request.name,
  });
  const response = await onConfigChange(
    { graph, store: kvsPackageConnectionStore },
    request,
  );
  logGraphConnectionResult(logger, {
    action: request.action,
    connectionId: request.connectionId,
    connectionName: request.name,
    ...response,
  });

  return response;
}
