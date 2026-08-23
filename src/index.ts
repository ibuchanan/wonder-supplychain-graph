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
export { receiveLeanEvent } from "./collaboration/forge-lean-event-receiver";
export { receiveStarterDelivery } from "./collaboration/forge-starter-peer-delivery";
export { publishStarterDelivery } from "./collaboration/forge-source-starter-publication";
import { type OnConfigChangeResponse, onConfigChange } from "./cx-management";
import {
  seedDestinationPairing,
  seedSourcePairing,
} from "./pairing/forge-demo-pairing-seed";
import {
  type PublishPackageToGraphInput,
  publishPackageToGraph as publishDemoPackageToGraph,
} from "./projection/forge-demo-projection-action";
import { kvsPackageConnectionStore } from "./projection/kvs-connection-store";
import { readConnectionChangeRequest } from "./projection/read-connection-change-request";
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
  event: unknown,
): Promise<OnConfigChangeResponse> {
  const request = readConnectionChangeRequest(event);
  if (request.isErr()) {
    logger.info(
      {
        event: "scg.graph.connection.rejected",
        reason: request.error.code,
      },
      "Supplychain Graph connection change rejected",
    );
    return {
      message: "Invalid graph connector connection-change request.",
      success: false,
    };
  }

  logGraphConnectionChanged(logger, {
    action: request.value.action,
    connectionId: request.value.connectionId,
    connectionName: request.value.name,
  });
  const response = await onConfigChange(
    { graph, store: kvsPackageConnectionStore },
    request.value,
  );
  logGraphConnectionResult(logger, {
    action: request.value.action,
    connectionId: request.value.connectionId,
    connectionName: request.value.name,
    ...response,
  });

  return response;
}
