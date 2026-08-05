import {
  ingestPackageProjection,
  type PackageGraphPort,
} from "./projection/ingest-package-projection";
import type { SupplierReceiptState } from "./receipt/apply-command";

/**
 * Tenant-local storage of the supplier receipt state a connection projects.
 */
export interface PackageConnectionStore {
  readonly clearActiveConnectionId: (connectionId: string) => Promise<void>;
  readonly forget: (connectionId: string) => Promise<void>;
  readonly getActiveConnectionId: () => Promise<string | undefined>;
  readonly read: (connectionId: string) => Promise<SupplierReceiptState>;
  readonly setActiveConnectionId: (connectionId: string) => Promise<void>;
}

export interface ConnectionManagementDependencies {
  readonly graph: PackageGraphPort;
  readonly store: PackageConnectionStore;
}

export interface OnConfigChangeRequest {
  readonly action: "CREATED" | "DELETED" | "UPDATED";
  readonly configProperties: Record<string, unknown>;
  readonly connectionId: string;
  readonly name: string;
}

export interface OnConfigChangeResponse {
  readonly message: string;
  readonly success: boolean;
}

/**
 * Applies a Teamwork Graph connector configuration change.
 *
 * This module owns connection selection and its projection state. Forge entry
 * points own observability; domain projection code owns package eligibility.
 */
export async function onConfigChange(
  dependencies: ConnectionManagementDependencies,
  request: OnConfigChangeRequest,
): Promise<OnConfigChangeResponse> {
  switch (request.action) {
    case "CREATED":
    case "UPDATED":
      return activateAndProject(dependencies, request);
    case "DELETED":
      return removeConnection(dependencies, request.connectionId);
  }
}

async function activateAndProject(
  dependencies: ConnectionManagementDependencies,
  request: OnConfigChangeRequest,
): Promise<OnConfigChangeResponse> {
  await dependencies.store.setActiveConnectionId(request.connectionId);
  const state = await dependencies.store.read(request.connectionId);
  const outcome = await ingestPackageProjection(dependencies.graph, {
    connectionId: request.connectionId,
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
  dependencies: ConnectionManagementDependencies,
  connectionId: string,
): Promise<OnConfigChangeResponse> {
  await dependencies.store.clearActiveConnectionId(connectionId);
  await dependencies.store.forget(connectionId);

  return { message: "Forgot the connection.", success: true };
}
