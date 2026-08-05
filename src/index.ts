/**
 * Forge entry point.
 *
 * SCG keeps a pure collaboration core. Handlers here are thin adapters that
 * inject Forge-hosted ports into that core and perform no decision logic.
 */

import { graph } from "@forge/teamwork-graph";

// Re-exported for repository-wide Forge handler contract tests; the manifest
// resolves this value from resolvers/index.handler.
export { handler } from "./resolvers";

import { commentOnOriginatingEpicFromRovo } from "./collaboration/forge-rovo-comment-action";
import type { RovoCommentActionPayload } from "./collaboration/forge-rovo-comment-action";
import { publishWorkPackage as publishAutomationWorkPackage } from "./publication/forge-automation-action";
import type { PublishWorkPackageActionPayload } from "./publication/automation-action";
import { publishPackageToGraph as publishDemoPackageToGraph } from "./projection/forge-demo-projection-action";
import type { DemoPackagePromotionRequest } from "./projection/promote-demo-package";

import {
  applyPackageConnectionChange,
  type PackageConnectionChangeRequest,
  type PackageConnectionChangeResponse,
} from "./projection/apply-connection-change";
import { kvsPackageConnectionStore } from "./projection/kvs-connection-store";

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
  payload: PublishWorkPackageActionPayload,
) {
  return publishAutomationWorkPackage(payload);
}

/**
 * Thin Forge entry point for the Rovo graph-discovery demo action.
 */
export async function publishPackageToGraph(
  payload: DemoPackagePromotionRequest,
) {
  return publishDemoPackageToGraph(payload);
}

export async function onPackageConnectionChange(
  request: PackageConnectionChangeRequest,
): Promise<PackageConnectionChangeResponse> {
  return applyPackageConnectionChange(
    { graph, store: kvsPackageConnectionStore },
    request,
  );
}
