import { err, ok, type Result } from "@forge-ahead/errors";

import type { OnConfigChangeRequest } from "../cx-management";

export interface InvalidConnectionChangeRequestError {
  readonly code: "invalid-connection-change-request";
}

type ConnectionChangeAction = OnConfigChangeRequest["action"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAction(value: unknown): value is ConnectionChangeAction {
  return value === "CREATED" || value === "DELETED" || value === "UPDATED";
}

function asConnectionChangeRequest(
  value: unknown,
): OnConfigChangeRequest | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return isAction(value["action"]) &&
    typeof value["connectionId"] === "string" &&
    typeof value["name"] === "string" &&
    isRecord(value["configProperties"])
    ? {
        action: value["action"],
        configProperties: value["configProperties"],
        connectionId: value["connectionId"],
        name: value["name"],
      }
    : undefined;
}

/**
 * Reads the direct connector payload and the Forge event wrapper documented for
 * graph-connector connection changes.
 */
export function readConnectionChangeRequest(
  event: unknown,
): Result<OnConfigChangeRequest, InvalidConnectionChangeRequestError> {
  const direct = asConnectionChangeRequest(event);
  if (direct) {
    return ok(direct);
  }

  const wrapped = isRecord(event)
    ? asConnectionChangeRequest(event["body"])
    : undefined;

  return wrapped
    ? ok(wrapped)
    : err({ code: "invalid-connection-change-request" });
}
