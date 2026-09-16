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
  logGraphCxChanged,
  logGraphCxResult,
} from "./observability/domain-events";

// Re-exported for repository-wide Forge handler contract tests; the manifest
// resolves this value from resolvers/index.handler.
export { handler } from "./resolvers";

import type { RovoCommentActionPayload } from "./collaboration/forge-rovo-comment-action";
import { commentOnOriginatingEpicFromRovo } from "./collaboration/forge-rovo-comment-action";

export { receivePeerEvent } from "./collaboration/forge-peer-event-receiver";
export { receiveBootstrapRequest } from "./pairing/forge-bootstrap-receiver";

import {
  applyGraphCxChange,
  type GraphCxChangeResponse,
} from "./graph-cx-management";
import {
  type PublishPackageToGraphInput,
  publishPackageToGraph as publishDemoPackageToGraph,
} from "./projection/forge-demo-projection-action";
import { kvsGraphCxStore } from "./projection/kvs-graph-cx-store";
import { readGraphCxChangeRequest } from "./projection/read-graph-cx-change-request";
import {
  type PublishWorkPackageActionInput,
  publishWorkPackage as publishAutomationWorkPackage,
} from "./publication/forge-automation-action";

/**
 * Thin Forge entry point for the Supplychain Graph Rovo comment action.
 */
export async function commentOriginEpic(payload: RovoCommentActionPayload) {
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

export async function onGraphCxChange(
  event: unknown,
): Promise<GraphCxChangeResponse> {
  const request = readGraphCxChangeRequest(event);
  if (request.isErr()) {
    logger.info(
      {
        event: "scg.graph-cx.rejected",
        reason: request.error.code,
      },
      "Supplychain Graph connection change rejected",
    );
    return {
      message: "Invalid graph connector connection-change request.",
      success: false,
    };
  }

  logGraphCxChanged(logger, {
    action: request.value.action,
    graphCxId: request.value.graphCxId,
    graphCxName: request.value.name,
  });
  let response: GraphCxChangeResponse;
  try {
    response = await applyGraphCxChange(
      { graph, store: kvsGraphCxStore },
      request.value,
    );
  } catch {
    logGraphCxResult(logger, {
      action: request.value.action,
      graphCxId: request.value.graphCxId,
      graphCxName: request.value.name,
      message: "Graph projection failed.",
      reason: "graph-write-failed",
      status: "failed",
      success: false,
    });
    return { message: "Graph projection failed.", success: false };
  }
  const currentPackage = (await kvsGraphCxStore.read(request.value.graphCxId))
    .currentPackage;
  const ingested = /^Indexed (\d+) current package object/.exec(
    response.message,
  )?.[1];
  const suppressed = /^Suppressed discovery: (.+)\.$/.exec(
    response.message,
  )?.[1];

  logGraphCxResult(logger, {
    action: request.value.action,
    graphCxId: request.value.graphCxId,
    graphCxName: request.value.name,
    ...(currentPackage
      ? {
          correlationId: currentPackage.correlationId,
          sourceEpicId: currentPackage.sourceEpicId,
        }
      : {}),
    ...(ingested
      ? { ingested: Number(ingested), status: "indexed" as const }
      : suppressed
        ? { reason: suppressed, status: "suppressed" as const }
        : { status: "failed" as const }),
    ...response,
  });

  return response;
}
