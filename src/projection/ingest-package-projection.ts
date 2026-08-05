import type { types } from "@forge/teamwork-graph";

import type { SupplierReceiptState } from "../receipt/apply-command";
import {
  buildPackageProjection,
  type PackageProjectionObject,
  type PackageProjectionSuppressionReason,
} from "./build-package-projection";

export const PACKAGE_OBJECT_TYPE = "atlassian:work-item";

/**
 * The narrow slice of the Teamwork Graph client this app depends on, so the
 * projection can be exercised without the Forge runtime.
 */
export interface PackageGraphPort {
  readonly deleteObjectsByProperties: (
    request: types.DeleteObjectsByPropertiesRequest,
  ) => Promise<types.DeleteObjectsByPropertiesResponse>;
  readonly setObjects: (
    request: types.SetObjectsRequest,
  ) => Promise<types.BulkObjectResponse>;
}

export type PackageProjectionVisibility = "container" | "everyone";

export interface PackageIngestionRequest {
  readonly connectionId: string;
  readonly state: SupplierReceiptState;
  /** Defaults to paired-container visibility for normal connector ingestion. */
  readonly visibility?: PackageProjectionVisibility;
}

export type PackageIngestionOutcome =
  | { readonly ingested: number; readonly outcome: "indexed" }
  | {
      readonly outcome: "suppressed";
      readonly reason: PackageProjectionSuppressionReason;
    };

/**
 * The Teamwork Graph subtypes SCG publishes. Anything outside the fixed V1
 * vocabulary is ingested as a generic work item rather than guessed at.
 */
type WorkItemSubtype = types.WorkItemObject["atlassian:work-item"]["subtype"];

const workItemSubtypes: Record<string, WorkItemSubtype> = {
  Bug: "bug",
  Epic: "epic",
  Story: "story",
  Subtask: "task",
  Task: "task",
};

function toRovoDescription(object: PackageProjectionObject): string {
  return `${object.description}\n\nSupplychain Graph package provenance\nSource Epic: ${object.provenance.sourceEpicId}\nPackage version: ${object.version}\nPublished: ${object.publishedAt}\nPublisher: ${object.provenance.publisherId}\nSource site: ${object.provenance.sourceSiteId}\nPackage role: ${object.role}`;
}

function toWorkItemObject(
  object: PackageProjectionObject,
  visibility: PackageProjectionVisibility,
): types.WorkItemObject {
  return {
    "atlassian:work-item": {
      status: object.statusCategory,
      subtype: workItemSubtypes[object.issueType] ?? "work_item",
    },
    createdAt: object.publishedAt,
    description: toRovoDescription(object),
    displayName: object.summary,
    id: object.id,
    lastUpdatedAt: object.publishedAt,
    permissions:
      visibility === "everyone"
        ? { accessControls: [{ principals: [{ type: "EVERYONE" }] }] }
        : {
            // Normal connector ingestion remains bounded to the paired Epic.
            accessControls: [
              { principals: [{ id: object.pairedEpicId, type: "CONTAINER" }] },
            ],
          },
    schemaVersion: "1",
    // The Published version doubles as the update sequence, so a superseded
    // package can never overwrite a newer one.
    updateSequenceNumber: Number(object.version),
    url: `${object.provenance.sourceSiteId}/browse/${object.issueKey}`,
  };
}

export async function ingestPackageProjection(
  graph: PackageGraphPort,
  request: PackageIngestionRequest,
): Promise<PackageIngestionOutcome> {
  const projection = buildPackageProjection(request.state);
  const { currentPackage } = request.state;

  if (projection.decision === "suppress") {
    // Suppression must remove what an earlier authorized state indexed.
    if (currentPackage) {
      await graph.deleteObjectsByProperties({
        connectionId: request.connectionId,
        objectType: PACKAGE_OBJECT_TYPE,
        properties: { pairingId: currentPackage.pairingId },
      });
    }

    return { outcome: "suppressed", reason: projection.reason };
  }

  // An indexed projection always comes from a current package.
  const { pairingId } = currentPackage as NonNullable<typeof currentPackage>;

  await graph.setObjects({
    connectionId: request.connectionId,
    objects: projection.objects.map((object) =>
      toWorkItemObject(object, request.visibility ?? "container"),
    ),
    properties: { pairingId },
  });

  return { ingested: projection.objects.length, outcome: "indexed" };
}
