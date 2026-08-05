import { graph } from "@forge/teamwork-graph";

import { kvsPackageConnectionStore } from "./kvs-connection-store";
import {
  publishDemoPackageToGraph,
  type DemoPackageGraphResult,
} from "./publish-demo-package-to-graph";
import type { DemoPackagePromotionRequest } from "./promote-demo-package";

export type PublishPackageToGraphResult =
  | {
      readonly ingested: number;
      readonly sourceEpicId: string;
      readonly status: "indexed";
      readonly version: string;
    }
  | {
      readonly reason: string;
      readonly sourceEpicId: string;
      readonly status: "suppressed" | "failed";
      readonly version?: string;
    };

function toActionResult(
  result: DemoPackageGraphResult,
): PublishPackageToGraphResult {
  if (result.outcome === "suppressed") {
    return {
      reason: result.reason,
      sourceEpicId: result.sourceEpicId,
      status: "suppressed",
      version: result.version,
    };
  }

  return {
    ingested: result.ingested,
    sourceEpicId: result.sourceEpicId,
    status: "indexed",
    version: result.version,
  };
}

/**
 * Jira Automation entry point for the visual graph-discovery demo. It promotes
 * a deterministic current package and indexes it through the Teamwork Graph
 * connector; real peer delivery remains outside this demo-only adapter.
 */
export async function publishPackageToGraph(
  payload: DemoPackagePromotionRequest,
): Promise<PublishPackageToGraphResult> {
  const outcome = await publishDemoPackageToGraph(
    { graph, store: kvsPackageConnectionStore },
    payload,
  );

  if (outcome.isErr()) {
    return {
      reason: outcome.error.code,
      sourceEpicId: payload.sourceEpicId,
      status: "failed",
    };
  }

  return toActionResult(outcome.value);
}
