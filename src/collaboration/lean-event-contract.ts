export interface LeanEventData {
  readonly issueKey: string;
  readonly pairingId: string;
  readonly updatedFields: readonly [];
}

export interface LeanEvent {
  readonly data: LeanEventData;
  readonly datacontenttype: "application/json";
  readonly id: string;
  readonly source: string;
  readonly specversion: "1.0";
  readonly subject: string;
  readonly time: string;
  readonly type: "scg:work-package:queued";
}

export interface AutomationLeanEvent extends LeanEvent {
  readonly data: LeanEventData & { readonly pairedEpicKey: string };
}

const prohibitedKeys = new Set([
  "accountId",
  "assignee",
  "comments",
  "description",
  "email",
  "pairedEpicKey",
  "reporter",
  "summary",
  "webhookUrl",
]);

interface UntrustedLeanEvent {
  readonly data?: unknown;
  readonly datacontenttype?: unknown;
  readonly id?: unknown;
  readonly source?: unknown;
  readonly specversion?: unknown;
  readonly subject?: unknown;
  readonly time?: unknown;
  readonly type?: unknown;
}

interface UntrustedLeanEventData {
  readonly issueKey?: unknown;
  readonly pairingId?: unknown;
  readonly updatedFields?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

function containsProhibitedKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsProhibitedKey);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(
    ([key, nested]) => prohibitedKeys.has(key) || containsProhibitedKey(nested),
  );
}

/** Parses only the identifier-only CloudEvent accepted from Blue. */
export function parseLeanEvent(body: string): LeanEvent | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value) || containsProhibitedKey(value)) {
      return undefined;
    }

    const event = value as UntrustedLeanEvent;
    if (!isRecord(event.data)) {
      return undefined;
    }

    const data = event.data as UntrustedLeanEventData;
    const { datacontenttype, id, source, specversion, subject, time, type } =
      event;
    const { issueKey, pairingId, updatedFields } = data;
    if (
      specversion !== "1.0" ||
      !isNonEmptyString(id) ||
      type !== "scg:work-package:queued" ||
      !isNonEmptyString(source) ||
      !isNonEmptyString(subject) ||
      !isIsoTimestamp(time) ||
      datacontenttype !== "application/json" ||
      !isNonEmptyString(pairingId) ||
      !isNonEmptyString(issueKey) ||
      subject !== `issue/${issueKey}` ||
      !Array.isArray(updatedFields) ||
      updatedFields.length !== 0
    ) {
      return undefined;
    }

    return {
      data: { issueKey, pairingId, updatedFields: [] },
      datacontenttype,
      id,
      source,
      specversion,
      subject,
      time,
      type,
    };
  } catch {
    return undefined;
  }
}

/** Builds the Green-local payload only after pairing validation. */
export function enrichLeanEventForAutomation(
  event: LeanEvent,
  pairedEpicKey: string,
): AutomationLeanEvent {
  return { ...event, data: { ...event.data, pairedEpicKey } };
}
