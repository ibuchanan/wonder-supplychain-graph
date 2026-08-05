/**
 * Forge entry point.
 *
 * SCG keeps a pure collaboration core. Handlers here are thin adapters that
 * inject Forge-hosted ports into that core and perform no decision logic.
 */

import { graph } from "@forge/teamwork-graph";

import {
  applyPackageConnectionChange,
  type PackageConnectionChangeRequest,
  type PackageConnectionChangeResponse,
} from "./projection/apply-connection-change";
import { kvsPackageConnectionStore } from "./projection/kvs-connection-store";

export async function onPackageConnectionChange(
  request: PackageConnectionChangeRequest,
): Promise<PackageConnectionChangeResponse> {
  return applyPackageConnectionChange(
    { graph, store: kvsPackageConnectionStore },
    request,
  );
}
