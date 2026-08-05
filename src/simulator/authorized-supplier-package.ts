import { err, ok, type Result } from "@forge-ahead/errors";

import {
  applySupplierReceiptCommand,
  type CurrentPackage,
  type SnapshotIssue,
  type SupplierReceiptAuditEvent,
  type SupplierReceiptError,
  type SupplierReceiptResult,
  type SupplierReceiptState,
} from "../receipt/apply-command";

export interface AuthorizedSupplierScenario {
  readonly receiptState: SupplierReceiptState;
}

export interface SupplierReceiptDelivery {
  readonly auditEvents: readonly SupplierReceiptAuditEvent[];
  readonly decision: SupplierReceiptResult["decision"];
  readonly nextScenario: AuthorizedSupplierScenario;
}

export interface SupplierPackageView {
  readonly children: readonly Pick<
    SnapshotIssue,
    | "description"
    | "issueType"
    | "key"
    | "priority"
    | "statusCategory"
    | "summary"
  >[];
  readonly current: {
    readonly publishedAt: string;
    readonly sourceEpic: Pick<
      SnapshotIssue,
      "key" | "priority" | "statusCategory" | "summary"
    >;
    readonly version: string;
  };
  readonly provenance: {
    readonly publisherId: string;
    readonly sourceSiteId: string;
  };
}

const supplierReleaseContent = Object.freeze({
  children: Object.freeze([
    Object.freeze({
      description: "Approve the material specification.",
      issueType: "Task" as const,
      key: "MFG-18",
      priority: "High",
      statusCategory: "To Do",
      summary: "Source material approval",
    }),
    Object.freeze({
      description: "Prepare the manufacturing line for release.",
      issueType: "Task" as const,
      key: "MFG-19",
      priority: "Medium",
      statusCategory: "In Progress",
      summary: "Manufacturing readiness",
    }),
  ]),
  epic: Object.freeze({
    description: "Approved supplier release package.",
    issueType: "Epic" as const,
    key: "MFG-17",
    priority: "High",
    statusCategory: "In Progress",
    summary: "Supplier release package",
  }),
});

const previousSupplierPackage: CurrentPackage = Object.freeze({
  content: supplierReleaseContent,
  correlationId: "corr-supplier-package-001",
  pairedEpicId: "SUP-42",
  pairingId: "pairing-001",
  publishedAt: "2026-08-03T16:00:00.000Z",
  publisherId: "account:manufacturer-automation",
  sourceEpicId: "MFG-17",
  sourceSiteId: "site:manufacturer",
  version: "1",
});

const deterministicSupplierReceipt = Object.freeze({
  authorization: "granted" as const,
  correlationId: "corr-supplier-package-002",
  idempotencyKey: "supplier-receipt-002",
  operation: "snapshot.candidate.receive" as const,
  peerInstallationId: "installation:manufacturer",
  protocolVersion: "v1" as const,
  snapshot: Object.freeze({
    content: supplierReleaseContent,
    pairedEpicId: "SUP-42",
    pairingId: "pairing-001",
    publishedAt: "2026-08-04T16:00:00.000Z",
    publisherId: "account:manufacturer-automation",
    sourceEpicId: "MFG-17",
    sourceSiteId: "site:manufacturer",
    version: "2",
  }),
});

function toIssueView(
  issue: SnapshotIssue,
): Pick<
  SnapshotIssue,
  | "description"
  | "issueType"
  | "key"
  | "priority"
  | "statusCategory"
  | "summary"
> {
  return {
    description: issue.description,
    issueType: issue.issueType,
    key: issue.key,
    priority: issue.priority,
    statusCategory: issue.statusCategory,
    summary: issue.summary,
  };
}

export function createAuthorizedSupplierScenario(): AuthorizedSupplierScenario {
  return {
    receiptState: {
      currentPackage: previousSupplierPackage,
      pairings: [
        {
          expectedPeerInstallationId: "installation:manufacturer",
          pairedEpicId: "SUP-42",
          pairingId: "pairing-001",
          sourceEpicId: "MFG-17",
          status: "active",
        },
      ],
      processedIdempotencyKeys: [],
    },
  };
}

export function applyDeterministicSupplierReceipt(
  scenario: AuthorizedSupplierScenario,
): Result<SupplierReceiptDelivery, SupplierReceiptError> {
  const result = applySupplierReceiptCommand(
    scenario.receiptState,
    deterministicSupplierReceipt,
  );

  if (result.isErr()) {
    return err(result.error);
  }

  return ok({
    auditEvents: result.value.auditEvents,
    decision: result.value.decision,
    nextScenario: { receiptState: result.value.nextState },
  });
}

export function toSupplierPackageView(
  scenario: AuthorizedSupplierScenario,
): SupplierPackageView {
  const { currentPackage } = scenario.receiptState;

  if (!currentPackage) {
    throw new Error("Simulator scenario must contain a current package");
  }

  return {
    children: currentPackage.content.children.map(toIssueView),
    current: {
      publishedAt: currentPackage.publishedAt,
      sourceEpic: {
        key: currentPackage.content.epic.key,
        priority: currentPackage.content.epic.priority,
        statusCategory: currentPackage.content.epic.statusCategory,
        summary: currentPackage.content.epic.summary,
      },
      version: currentPackage.version,
    },
    provenance: {
      publisherId: currentPackage.publisherId,
      sourceSiteId: currentPackage.sourceSiteId,
    },
  };
}
