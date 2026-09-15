import { graph } from "@forge/teamwork-graph";

import { logger } from "../logging";
import { logGraphPublishResult } from "../observability/domain-events";
import { createActionExecutionMetadata } from "../publication/action-execution-metadata";
import { kvsPackageConnectionStore } from "./kvs-connection-store";
import type { DemoPackagePromotionRequest } from "./promote-demo-package";
import {
  type DemoPackageGraphResult,
  publishDemoPackageToGraph,
} from "./publish-demo-package-to-graph";

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
export interface PublishPackageToGraphInput {
  readonly publisherId: string;
  readonly sourceEpicId: string;
}

export async function publishPackageToGraph(
  payload: PublishPackageToGraphInput,
): Promise<PublishPackageToGraphResult> {
  const metadata = createActionExecutionMetadata(payload.sourceEpicId);
  const connectionId = await kvsPackageConnectionStore.getActiveConnectionId();

  if (!connectionId) {
    logGraphPublishResult(logger, {
      correlationId: metadata.correlationId,
      reason: "no-active-connection",
      sourceEpicId: payload.sourceEpicId,
      status: "failed",
    });

    return {
      reason: "no-active-connection",
      sourceEpicId: payload.sourceEpicId,
      status: "failed",
    };
  }

  const actionRequest: DemoPackagePromotionRequest = {
    ...payload,
    ...metadata,
    connectionId,
  };
  const outcome = await publishDemoPackageToGraph(
    { graph, store: kvsPackageConnectionStore },
    actionRequest,
  );

  if (outcome.isErr()) {
    logGraphPublishResult(logger, {
      connectionId,
      correlationId: actionRequest.correlationId,
      reason: outcome.error.code,
      sourceEpicId: payload.sourceEpicId,
      status: "failed",
    });

    return {
      reason: outcome.error.code,
      sourceEpicId: payload.sourceEpicId,
      status: "failed",
    };
  }

  const result = toActionResult(outcome.value);
  logGraphPublishResult(logger, {
    connectionId,
    correlationId: actionRequest.correlationId,
    ...(result.status === "indexed"
      ? { ingested: result.ingested }
      : { reason: result.reason }),
    sourceEpicId: result.sourceEpicId,
    status: result.status,
    ...(result.version ? { version: result.version } : {}),
  });

  return result;
}
