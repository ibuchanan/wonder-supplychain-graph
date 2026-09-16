import { err, ok, type Result } from "@forge-ahead/errors";

import type { GraphCxChangeRequest } from "../graph-cx-management";

export interface InvalidGraphCxChangeRequestError {
  readonly code: "invalid-graph-cx-change-request";
}

type GraphCxChangeAction = GraphCxChangeRequest["action"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAction(value: unknown): value is GraphCxChangeAction {
  return value === "CREATED" || value === "DELETED" || value === "UPDATED";
}

function asGraphCxChangeRequest(
  value: unknown,
): GraphCxChangeRequest | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  // `connectionId` is the platform's field name on the graph-connector payload,
  // not ours, so it is read as sent and renamed to the domain's term here. This
  // parser is the only place the platform's spelling appears.
  return isAction(value["action"]) &&
    typeof value["connectionId"] === "string" &&
    typeof value["name"] === "string" &&
    isRecord(value["configProperties"])
    ? {
        action: value["action"],
        configProperties: value["configProperties"],
        graphCxId: value["connectionId"],
        name: value["name"],
      }
    : undefined;
}

/**
 * Reads the direct connector payload and the Forge event wrapper documented for
 * graph-connector connection changes.
 */
export function readGraphCxChangeRequest(
  event: unknown,
): Result<GraphCxChangeRequest, InvalidGraphCxChangeRequestError> {
  const direct = asGraphCxChangeRequest(event);
  if (direct) {
    return ok(direct);
  }

  const wrapped = isRecord(event)
    ? asGraphCxChangeRequest(event["body"])
    : undefined;

  return wrapped
    ? ok(wrapped)
    : err({ code: "invalid-graph-cx-change-request" });
}
