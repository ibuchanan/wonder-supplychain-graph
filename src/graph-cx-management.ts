import {
  ingestPackageProjection,
  type PackageGraphPort,
} from "./projection/ingest-package-projection";
import type { SupplierReceiptState } from "./receipt/apply-command";

/**
 * Tenant-local storage of the supplier receipt state a connection projects.
 */
export interface GraphCxStore {
  readonly clearActiveGraphCxId: (graphCxId: string) => Promise<void>;
  readonly forget: (graphCxId: string) => Promise<void>;
  readonly getActiveGraphCxId: () => Promise<string | undefined>;
  readonly read: (graphCxId: string) => Promise<SupplierReceiptState>;
  readonly setActiveGraphCxId: (graphCxId: string) => Promise<void>;
}

export interface GraphCxManagementDependencies {
  readonly graph: PackageGraphPort;
  readonly store: GraphCxStore;
}

export interface GraphCxChangeRequest {
  readonly action: "CREATED" | "DELETED" | "UPDATED";
  readonly configProperties: Record<string, unknown>;
  readonly graphCxId: string;
  readonly name: string;
}

export interface GraphCxChangeResponse {
  readonly message: string;
  readonly success: boolean;
}

/**
 * Applies a Teamwork Graph connector configuration change.
 *
 * This module owns connection selection and its projection state. Forge entry
 * points own observability; domain projection code owns package eligibility.
 */
export async function applyGraphCxChange(
  dependencies: GraphCxManagementDependencies,
  request: GraphCxChangeRequest,
): Promise<GraphCxChangeResponse> {
  switch (request.action) {
    case "CREATED":
    case "UPDATED":
      return activateAndProject(dependencies, request);
    case "DELETED":
      return removeConnection(dependencies, request.graphCxId);
  }
}

async function activateAndProject(
  dependencies: GraphCxManagementDependencies,
  request: GraphCxChangeRequest,
): Promise<GraphCxChangeResponse> {
  await dependencies.store.setActiveGraphCxId(request.graphCxId);
  const state = await dependencies.store.read(request.graphCxId);
  const outcome = await ingestPackageProjection(dependencies.graph, {
    graphCxId: request.graphCxId,
    state,
  });

  if (outcome.outcome === "suppressed") {
    return {
      message: `Suppressed discovery: ${outcome.reason}.`,
      success: true,
    };
  }

  return {
    message: `Indexed ${outcome.ingested} current package object${outcome.ingested === 1 ? "" : "s"}.`,
    success: true,
  };
}

async function removeConnection(
  dependencies: GraphCxManagementDependencies,
  graphCxId: string,
): Promise<GraphCxChangeResponse> {
  await dependencies.store.clearActiveGraphCxId(graphCxId);
  await dependencies.store.forget(graphCxId);

  return { message: "Forgot the connection.", success: true };
}
