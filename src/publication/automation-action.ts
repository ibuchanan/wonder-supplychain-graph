import type { LeanEvent } from "../collaboration/lean-event-contract";
import type { SourcePeerPairing } from "../pairing/peer-pairing-state";
import {
  applyPublicationCommand,
  type PublicationCommand,
  type PublicationState,
} from "./apply-command";

export interface PublishWorkPackageActionPayload {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
}

export interface PublicationStateStore {
  readonly load: (
    sourceEpicId: string,
  ) => Promise<PublicationState | undefined>;
  readonly save: (
    sourceEpicId: string,
    state: PublicationState,
  ) => Promise<void>;
}

export interface LeanEventEmitter {
  readonly emitLeanEvent: (
    pairing: SourcePeerPairing,
    event: LeanEvent,
  ) => Promise<void>;
}

export interface SourcePairingResolver {
  readonly resolveSourcePairing: (
    payload: PublishWorkPackageActionPayload,
  ) => Promise<SourcePeerPairing | undefined>;
}

export interface DemoPublishWorkPackageActionDependencies {
  readonly emitLeanEvent?: LeanEventEmitter["emitLeanEvent"];
  readonly initialState?: (
    payload: PublishWorkPackageActionPayload,
  ) => PublicationState;
  readonly resolveSourcePairing?: SourcePairingResolver["resolveSourcePairing"];
  readonly store: PublicationStateStore;
}

export type PublishWorkPackageActionResult =
  | {
      readonly candidateId: string;
      readonly correlationId: string;
      readonly status: "queued";
    }
  | {
      readonly candidateId: string;
      readonly correlationId: string;
      readonly reason: string;
      readonly status: "preflight-failed";
    };

function toPublicationCommand(
  payload: PublishWorkPackageActionPayload,
  state: PublicationState,
): PublicationCommand {
  const pairing = state.pairings.find(
    (candidate) => candidate.sourceEpicId === payload.sourceEpicId,
  );

  return {
    correlationId: payload.correlationId,
    idempotencyKey: payload.idempotencyKey,
    occurredAt: new Date().toISOString(),
    operation: "snapshot.candidate.create",
    pairingId: pairing?.pairingId ?? "missing-pairing",
    preflight: {
      publishingAuthority: "granted",
      schema: "valid",
      sourceAccess: "granted",
    },
    protocolVersion: "v1",
    publisherId: payload.publisherId,
    sourceEpicId: payload.sourceEpicId,
  };
}

function toLeanEvent(
  payload: PublishWorkPackageActionPayload,
  pairing: SourcePeerPairing,
): LeanEvent {
  return {
    data: {
      issueKey: payload.sourceEpicId,
      pairingId: pairing.pairingId,
      updatedFields: [],
    },
    datacontenttype: "application/json",
    id: crypto.randomUUID(),
    source: pairing.sourceSiteAri,
    specversion: "1.0",
    subject: `issue/${payload.sourceEpicId}`,
    time: new Date().toISOString(),
    type: "scg:work-package:queued",
  };
}

export function createDemoPublishWorkPackageAction({
  emitLeanEvent,
  initialState,
  resolveSourcePairing,
  store,
}: DemoPublishWorkPackageActionDependencies) {
  return async function publishWorkPackage(
    payload: PublishWorkPackageActionPayload,
  ): Promise<PublishWorkPackageActionResult> {
    const storedState = await store.load(payload.sourceEpicId);
    const state = storedState ?? initialState?.(payload);

    if (!state) {
      throw new Error(
        `Unable to publish work package: no publication state for ${payload.sourceEpicId}`,
      );
    }

    const outcome = applyPublicationCommand(
      state,
      toPublicationCommand(payload, state),
    );

    if (outcome.isErr()) {
      throw new Error(`Unable to publish work package: ${outcome.error.code}`);
    }

    if (outcome.value.decision.state === "preflight-failed") {
      return {
        candidateId: outcome.value.decision.candidateId,
        correlationId: payload.correlationId,
        reason: outcome.value.decision.reason,
        status: "preflight-failed",
      };
    }

    if (outcome.value.decision.idempotency === "applied") {
      await store.save(payload.sourceEpicId, outcome.value.nextState);
    }

    if (emitLeanEvent && resolveSourcePairing) {
      const sourcePairing = await resolveSourcePairing(payload);
      if (!sourcePairing) {
        throw new Error(
          "Unable to emit lean event: source pairing unavailable",
        );
      }
      // ponytail: at-most-once delivery; add an outbox with retry and receipts if reliability matters.
      await emitLeanEvent(sourcePairing, toLeanEvent(payload, sourcePairing));
    }

    return {
      candidateId: outcome.value.decision.candidateId,
      correlationId: payload.correlationId,
      status: "queued",
    };
  };
}
