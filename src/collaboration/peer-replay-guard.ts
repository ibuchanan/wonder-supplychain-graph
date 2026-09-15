import { kvs } from "@forge/kvs";

/**
 * Single-use consumption of a signed request ID. A verified HMAC signature
 * stays verifiable for the whole timestamp window, so the signature cannot be
 * what makes a request single-use: the receiver has to consume its request ID.
 */

export type ReplayConsumption =
  | "consumed"
  | "replayed"
  | "replay-state-unavailable";

/**
 * Retention must cover every instant at which a request could still verify:
 * the five-minute maximum age plus the thirty-second future skew allowance,
 * rounded up so evidence never expires inside its own acceptance window.
 */
const retention = Object.freeze({ unit: "MINUTES" as const, value: 10 });

export interface ReplayScope {
  /** Scoped to the receiver so one peer's request IDs cannot block another's. */
  readonly receiverSiteAri: string;
  readonly relationshipId: string;
  readonly requestId: string;
}

function replayKey(scope: ReplayScope): string {
  return `peer-replay:${scope.receiverSiteAri}:${scope.relationshipId}:${scope.requestId}`;
}

/**
 * Atomically claims one request ID before any business side effect. The
 * conditional write is the claim: there is no read-then-write window for two
 * concurrent Forge invocations to race through.
 *
 * Every failure denies the request. Only the reason is resolved afterwards, by
 * re-reading the key: evidence that it is already on record means a replay,
 * and anything else means the durable state cannot be trusted. Distinguishing
 * the two by the platform's rejection code would depend on an error shape the
 * POC has not verified, and an uncertain claim must fail closed either way.
 */
export async function consumeRequestId(
  scope: ReplayScope,
  now: string,
): Promise<ReplayConsumption> {
  const key = replayKey(scope);

  try {
    await kvs.set(
      key,
      { consumedAt: now },
      { keyPolicy: "FAIL_IF_EXISTS", ttl: retention },
    );

    return "consumed";
  } catch {
    try {
      return (await kvs.get(key)) ? "replayed" : "replay-state-unavailable";
    } catch {
      return "replay-state-unavailable";
    }
  }
}
