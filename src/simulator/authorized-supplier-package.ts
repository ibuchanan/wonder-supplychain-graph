import type { CurrentPackage, SnapshotIssue } from "../receipt/apply-command";

export interface AuthorizedSupplierScenario {
  readonly currentPackage: CurrentPackage;
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

const authorizedSupplierPackage: CurrentPackage = Object.freeze({
  content: Object.freeze({
    children: Object.freeze([
      Object.freeze({
        description: "Approve the material specification.",
        issueType: "Task",
        key: "MFG-18",
        priority: "High",
        statusCategory: "To Do",
        summary: "Source material approval",
      }),
      Object.freeze({
        description: "Prepare the manufacturing line for release.",
        issueType: "Task",
        key: "MFG-19",
        priority: "Medium",
        statusCategory: "In Progress",
        summary: "Manufacturing readiness",
      }),
    ]),
    epic: Object.freeze({
      description: "Approved supplier release package.",
      issueType: "Epic",
      key: "MFG-17",
      priority: "High",
      statusCategory: "In Progress",
      summary: "Supplier release package",
    }),
  }),
  correlationId: "corr-supplier-package-002",
  pairedEpicId: "SUP-42",
  pairingId: "pairing-001",
  publishedAt: "2026-08-04T16:00:00.000Z",
  publisherId: "account:manufacturer-automation",
  sourceEpicId: "MFG-17",
  sourceSiteId: "site:manufacturer",
  version: "2",
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
  return { currentPackage: authorizedSupplierPackage };
}

export function toSupplierPackageView(
  scenario: AuthorizedSupplierScenario,
): SupplierPackageView {
  const { currentPackage } = scenario;

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
