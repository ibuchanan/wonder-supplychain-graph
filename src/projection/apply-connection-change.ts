import type { SupplierReceiptState } from "../receipt/apply-command";
import {
  ingestPackageProjection,
  type PackageGraphPort,
} from "./ingest-package-projection";

/**
 * Tenant-local storage of the supplier receipt state a connection projects.
 */
export interface PackageConnectionStore {
  readonly forget: (connectionId: string) => Promise<void>;
  readonly read: (connectionId: string) => Promise<SupplierReceiptState>;
}

export interface PackageConnectionDependencies {
  readonly graph: PackageGraphPort;
  readonly store: PackageConnectionStore;
}

export interface PackageConnectionChangeRequest {
  readonly action: "CREATED" | "DELETED" | "UPDATED";
  readonly configProperties: Record<string, unknown>;
  readonly connectionId: string;
  readonly name: string;
}

export interface PackageConnectionChangeResponse {
  readonly message: string;
  readonly success: boolean;
}

export async function applyPackageConnectionChange(
  dependencies: PackageConnectionDependencies,
  request: PackageConnectionChangeRequest,
): Promise<PackageConnectionChangeResponse> {
  // Teamwork Graph removes a deleted connection's own objects, so the app only
  // has to drop the tenant-local state it kept for that connection.
  if (request.action === "DELETED") {
    await dependencies.store.forget(request.connectionId);

    return { message: "Forgot the connection.", success: true };
  }

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
