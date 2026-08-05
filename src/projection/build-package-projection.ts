import type {
  CurrentPackage,
  SnapshotIssue,
  SupplierReceiptState,
} from "../receipt/apply-command";

/**
 * Provenance carried by every projected object so an authorized reader can see
 * which manufacturer tenant, Source Epic, and publisher the content came from.
 */
export interface PackageProjectionProvenance {
  readonly pairingId: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
  readonly sourceSiteId: string;
}

export interface PackageProjectionObject {
  readonly description: string;
  /** Stable across versions so a newer Published package updates in place. */
  readonly id: string;
  readonly issueKey: string;
  readonly issueType: string;
  readonly pairedEpicId: string;
  readonly priority: string;
  readonly provenance: PackageProjectionProvenance;
  readonly publishedAt: string;
  readonly role: "direct-child" | "source-epic";
  readonly statusCategory: string;
  readonly summary: string;
  readonly version: string;
}

export interface IndexPackageProjection {
  readonly decision: "index";
  readonly objects: readonly PackageProjectionObject[];
}

export type PackageProjectionSuppressionReason =
  | "no-current-package"
  | "pairing-unavailable";

export interface SuppressPackageProjection {
  readonly decision: "suppress";
  readonly reason: PackageProjectionSuppressionReason;
}

export type PackageProjection =
  | IndexPackageProjection
  | SuppressPackageProjection;

function toProjectionObject(
  currentPackage: CurrentPackage,
  issue: SnapshotIssue,
  role: PackageProjectionObject["role"],
): PackageProjectionObject {
  return {
    description: issue.description,
    id: `${currentPackage.pairingId}:${issue.key}`,
    issueKey: issue.key,
    issueType: issue.issueType,
    pairedEpicId: currentPackage.pairedEpicId,
    priority: issue.priority,
    provenance: {
      pairingId: currentPackage.pairingId,
      publisherId: currentPackage.publisherId,
      sourceEpicId: currentPackage.sourceEpicId,
      sourceSiteId: currentPackage.sourceSiteId,
    },
    publishedAt: currentPackage.publishedAt,
    role,
    statusCategory: issue.statusCategory,
    summary: issue.summary,
    version: currentPackage.version,
  };
}

export function buildPackageProjection(
  state: SupplierReceiptState,
): PackageProjection {
  const { currentPackage } = state;

  // A received candidate never reaches `currentPackage`, so it is never indexed.
  if (!currentPackage) {
    return { decision: "suppress", reason: "no-current-package" };
  }

  // Discovery follows the supplier Paired Epic boundary: without a local active
  // pairing there is no authorized surface to index against.
  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === currentPackage.pairingId &&
      candidate.sourceEpicId === currentPackage.sourceEpicId &&
      candidate.pairedEpicId === currentPackage.pairedEpicId,
  );

  if (!pairing) {
    return { decision: "suppress", reason: "pairing-unavailable" };
  }

  return {
    decision: "index",
    objects: [
      toProjectionObject(
        currentPackage,
        currentPackage.content.epic,
        "source-epic",
      ),
      ...currentPackage.content.children.map((child) =>
        toProjectionObject(currentPackage, child, "direct-child"),
      ),
    ],
  };
}
