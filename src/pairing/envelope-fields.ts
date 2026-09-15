/**
 * Field predicates shared by every peer setup envelope parser. Parsing is
 * strict by design: an envelope is either exactly the versioned shape the
 * receiver accepts, or it is nothing.
 */

import type { NominatedIdentity } from "./site-relationship-nomination";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function readIdentity(value: unknown): NominatedIdentity | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { environmentAri, installationAri, siteAri } = value;
  return isNonEmptyString(environmentAri) &&
    isNonEmptyString(installationAri) &&
    isNonEmptyString(siteAri)
    ? { environmentAri, installationAri, siteAri }
    : undefined;
}
