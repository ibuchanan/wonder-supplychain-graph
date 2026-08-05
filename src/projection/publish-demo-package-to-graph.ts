import { err, ok, type Result } from "@forge-ahead/errors";

import {
  ingestPackageProjection,
  type PackageGraphPort,
} from "./ingest-package-projection";
import type { PackageProjectionSuppressionReason } from "./build-package-projection";
import {
  promoteDemoPackage,
  type DemoPackagePromotionRequest,
  type SupplierReceiptStateStore,
} from "./promote-demo-package";
import type { SupplierReceiptError } from "../receipt/apply-command";

export interface DemoPackageGraphDependencies {
  readonly graph: PackageGraphPort;
  readonly store: SupplierReceiptStateStore;
}

export type DemoPackageGraphResult =
  | {
      readonly ingested: number;
      readonly outcome: "indexed";
      readonly sourceEpicId: string;
      readonly version: string;
    }
  | {
      readonly outcome: "suppressed";
      readonly reason: PackageProjectionSuppressionReason;
      readonly sourceEpicId: string;
      readonly version: string;
    };

export async function publishDemoPackageToGraph(
  { graph, store }: DemoPackageGraphDependencies,
  request: DemoPackagePromotionRequest,
): Promise<Result<DemoPackageGraphResult, SupplierReceiptError>> {
  const promotion = await promoteDemoPackage({ store }, request);

  if (promotion.isErr()) {
    return err(promotion.error);
  }

  const state = await store.read(request.connectionId);
  const ingestion = await ingestPackageProjection(graph, {
    connectionId: request.connectionId,
    state,
  });

  if (ingestion.outcome === "suppressed") {
    return ok({
      outcome: "suppressed",
      reason: ingestion.reason,
      sourceEpicId: promotion.value.sourceEpicId,
      version: promotion.value.version,
    });
  }

  return ok({
    ingested: ingestion.ingested,
    outcome: "indexed",
    sourceEpicId: promotion.value.sourceEpicId,
    version: promotion.value.version,
  });
}
