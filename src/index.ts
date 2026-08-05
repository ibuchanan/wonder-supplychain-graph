/**
 * Forge entry point.
 *
 * SCG keeps a pure collaboration core. Handlers here are thin adapters that
 * inject Forge-hosted ports into that core and perform no decision logic.
 */

import { graph } from "@forge/teamwork-graph";

import { publishWorkPackage as publishAutomationWorkPackage } from "./publication/forge-automation-action";
import type { PublishWorkPackageActionPayload } from "./publication/automation-action";

import {
  applyPackageConnectionChange,
  type PackageConnectionChangeRequest,
  type PackageConnectionChangeResponse,
} from "./projection/apply-connection-change";
import { kvsPackageConnectionStore } from "./projection/kvs-connection-store";

/**
 * Thin Forge entry point for the demo Jira Automation action.
 */
export async function publishWorkPackage(
  payload: PublishWorkPackageActionPayload,
) {
  return publishAutomationWorkPackage(payload);
}

export async function onPackageConnectionChange(
  request: PackageConnectionChangeRequest,
): Promise<PackageConnectionChangeResponse> {
  return applyPackageConnectionChange(
    { graph, store: kvsPackageConnectionStore },
    request,
  );
}
