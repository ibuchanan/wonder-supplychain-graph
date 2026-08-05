import { err, ok, type Result } from "@forge-ahead/errors";

import {
  applySupplierReceiptCommand,
  type SupplierPairing,
  type SupplierReceiptError,
  type SupplierReceiptState,
} from "../receipt/apply-command";

export interface SupplierReceiptStateStore {
  readonly read: (connectionId: string) => Promise<SupplierReceiptState>;
  readonly write: (
    connectionId: string,
    state: SupplierReceiptState,
  ) => Promise<void>;
}

export interface DemoPackagePromotionDependencies {
  readonly store: SupplierReceiptStateStore;
}

export interface DemoPackagePromotionRequest {
  readonly connectionId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly publishedAt: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
}

export interface DemoPackagePromotionResult {
  readonly connectionId: string;
  readonly outcome: "published";
  readonly sourceEpicId: string;
  readonly version: string;
}

function demoPairing(request: DemoPackagePromotionRequest): SupplierPairing {
  return {
    expectedPeerInstallationId: "demo:manufacturer",
    pairedEpicId: `demo-paired:${request.sourceEpicId}`,
    pairingId: `demo-pairing:${request.sourceEpicId}`,
    sourceEpicId: request.sourceEpicId,
    status: "active",
  };
}

function withDemoPairing(
  state: SupplierReceiptState,
  pairing: SupplierPairing,
): SupplierReceiptState {
  const isPresent = state.pairings.some(
    (candidate) =>
      candidate.pairingId === pairing.pairingId &&
      candidate.sourceEpicId === pairing.sourceEpicId &&
      candidate.pairedEpicId === pairing.pairedEpicId,
  );

  if (isPresent) {
    return state;
  }

  return { ...state, pairings: [...state.pairings, pairing] };
}

function nextVersion(
  state: SupplierReceiptState,
  sourceEpicId: string,
): string {
  if (state.currentPackage?.sourceEpicId !== sourceEpicId) {
    return "1";
  }

  const current = Number(state.currentPackage.version);
  return Number.isSafeInteger(current) && current >= 1
    ? String(current + 1)
    : "1";
}

export async function promoteDemoPackage(
  { store }: DemoPackagePromotionDependencies,
  request: DemoPackagePromotionRequest,
): Promise<Result<DemoPackagePromotionResult, SupplierReceiptError>> {
  const storedState = await store.read(request.connectionId);
  const pairing = demoPairing(request);
  const state = withDemoPairing(storedState, pairing);

  const receipt = applySupplierReceiptCommand(state, {
    authorization: "granted",
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    operation: "snapshot.candidate.receive",
    peerInstallationId: pairing.expectedPeerInstallationId,
    protocolVersion: "v1",
    snapshot: {
      content: {
        children: [
          {
            description:
              "Confirm the component interface and material requirements.",
            issueType: "Task",
            key: `${request.sourceEpicId}-scope`,
            priority: "High",
            statusCategory: "To Do",
            summary: "Confirm package scope",
          },
          {
            description:
              "Prepare supplier delivery evidence for the published scope.",
            issueType: "Task",
            key: `${request.sourceEpicId}-evidence`,
            priority: "Medium",
            statusCategory: "In Progress",
            summary: "Prepare delivery evidence",
          },
        ],
        epic: {
          description: `Current published Supplychain Graph package for ${request.sourceEpicId}.`,
          issueType: "Epic",
          key: request.sourceEpicId,
          priority: "High",
          statusCategory: "In Progress",
          summary: `Published work package for ${request.sourceEpicId}`,
        },
      },
      pairedEpicId: pairing.pairedEpicId,
      pairingId: pairing.pairingId,
      publishedAt: request.publishedAt,
      publisherId: request.publisherId,
      sourceEpicId: request.sourceEpicId,
      sourceSiteId: "demo:manufacturer",
      version: nextVersion(state, request.sourceEpicId),
    },
  });

  if (receipt.isErr()) {
    return err(receipt.error);
  }

  if (receipt.value.decision.idempotency === "applied") {
    await store.write(request.connectionId, receipt.value.nextState);
  }

  return ok({
    connectionId: request.connectionId,
    outcome: "published",
    sourceEpicId: request.sourceEpicId,
    version: receipt.value.decision.version,
  });
}
