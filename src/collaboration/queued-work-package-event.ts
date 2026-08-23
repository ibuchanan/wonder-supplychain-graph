import { err, ok, type Result } from "@forge-ahead/errors";

export interface CreateQueuedWorkPackageEventInput {
  readonly clock: () => string;
  readonly issueKey: string;
  readonly pairingId: string;
  readonly source: string;
  readonly uuid: () => string;
}

export interface QueuedWorkPackageEvent {
  readonly specversion: "1.0";
  readonly id: string;
  readonly type: "scg:work-package:queued";
  readonly source: string;
  readonly subject: string;
  readonly time: string;
  readonly datacontenttype: "application/json";
  readonly data: {
    readonly pairingId: string;
    readonly issueKey: string;
    readonly updatedFields: readonly [];
  };
}

export interface InvalidQueuedWorkPackageEventError {
  readonly code: "invalid-queued-work-package-event";
}

export function validateQueuedWorkPackageEvent(
  value: unknown,
): Result<QueuedWorkPackageEvent, InvalidQueuedWorkPackageEventError> {
  if (!isRecord(value) || !isRecord(value["data"])) {
    return err({ code: "invalid-queued-work-package-event" });
  }

  const data = value["data"];
  if (
    value["specversion"] !== "1.0" ||
    !isNonEmptyString(value["id"]) ||
    value["type"] !== "scg:work-package:queued" ||
    !isNonEmptyString(value["source"]) ||
    !isNonEmptyString(value["subject"]) ||
    !isIsoTimestamp(value["time"]) ||
    value["datacontenttype"] !== "application/json" ||
    !isNonEmptyString(data["pairingId"]) ||
    !isNonEmptyString(data["issueKey"]) ||
    !Array.isArray(data["updatedFields"]) ||
    data["updatedFields"].length !== 0 ||
    value["subject"] !== `issue/${data["issueKey"]}`
  ) {
    return err({ code: "invalid-queued-work-package-event" });
  }

  return ok({
    specversion: value["specversion"],
    id: value["id"],
    type: value["type"],
    source: value["source"],
    subject: value["subject"],
    time: value["time"],
    datacontenttype: value["datacontenttype"],
    data: {
      pairingId: data["pairingId"],
      issueKey: data["issueKey"],
      updatedFields: [],
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!parts || Number.isNaN(Date.parse(value))) {
    return false;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function createQueuedWorkPackageEvent({
  clock,
  issueKey,
  pairingId,
  source,
  uuid,
}: CreateQueuedWorkPackageEventInput): QueuedWorkPackageEvent {
  return {
    specversion: "1.0",
    id: uuid(),
    type: "scg:work-package:queued",
    source,
    subject: `issue/${issueKey}`,
    time: clock(),
    datacontenttype: "application/json",
    data: { pairingId, issueKey, updatedFields: [] },
  };
}
