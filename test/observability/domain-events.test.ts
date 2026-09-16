import { describe, expect, it } from "vitest";

import {
  logAppInstalled,
  logAppUpgraded,
  logGraphCxChanged,
  logGraphCxResult,
  logGraphPublishResult,
  logRovoCommentResult,
} from "../../src/observability/domain-events";

describe("Supplychain Graph domain events", () => {
  it("records a graph connection ID and its resulting discovery outcome", () => {
    const records: Record<string, unknown>[] = [];
    const logger = {
      info: (fields: Record<string, unknown>, message: string) => {
        records.push({ ...fields, logMessage: message });
      },
    };

    logGraphCxChanged(logger, {
      action: "CREATED",
      graphCxId: "graph-cx-001",
      graphCxName: "Demo manufacturer connection",
    });
    logGraphCxResult(logger, {
      action: "CREATED",
      graphCxId: "graph-cx-001",
      graphCxName: "Demo manufacturer connection",
      correlationId: "scg:execution-001",
      ingested: 3,
      message: "Indexed 3 current package objects.",
      sourceEpicId: "MFG-17",
      status: "indexed",
      success: true,
    });

    logGraphPublishResult(logger, {
      graphCxId: "graph-cx-001",
      correlationId: "scg:execution-001",
      ingested: 3,
      sourceEpicId: "MFG-17",
      status: "indexed",
      version: "1",
    });
    logRovoCommentResult(logger, {
      commentId: "10001",
      graphCxId: "graph-cx-001",
      sourceEpicId: "MFG-17",
      status: "commented",
      version: "1",
    });
    logAppInstalled(logger, {
      appId: "app-001",
      appVersion: "4.4.0",
      environmentId: "environment-001",
      installationId: "installation-001",
      installerAccountId: "account-installer",
    });
    logAppUpgraded(logger, {
      appId: "app-001",
      appVersion: "5.0.0",
      environmentId: "environment-001",
      installationId: "installation-001",
      upgraderAccountId: "account-upgrader",
    });

    expect(records).toEqual([
      expect.objectContaining({
        action: "CREATED",
        graphCxId: "graph-cx-001",
        graphCxName: "Demo manufacturer connection",
        event: "scg.graph-cx.changed",
      }),
      expect.objectContaining({
        action: "CREATED",
        graphCxId: "graph-cx-001",
        graphCxName: "Demo manufacturer connection",
        correlationId: "scg:execution-001",
        event: "scg.graph-cx.completed",
        ingested: 3,
        message: "Indexed 3 current package objects.",
        sourceEpicId: "MFG-17",
        status: "indexed",
        success: true,
      }),
      expect.objectContaining({
        graphCxId: "graph-cx-001",
        correlationId: "scg:execution-001",
        event: "scg.graph.publish.completed",
        ingested: 3,
        sourceEpicId: "MFG-17",
        status: "indexed",
        version: "1",
      }),
      expect.objectContaining({
        commentId: "10001",
        graphCxId: "graph-cx-001",
        event: "scg.rovo.comment.completed",
        sourceEpicId: "MFG-17",
        status: "commented",
        version: "1",
      }),
      expect.objectContaining({
        appId: "app-001",
        appVersion: "4.4.0",
        environmentId: "environment-001",
        event: "scg.app.installed",
        installationId: "installation-001",
        installerAccountId: "account-installer",
      }),
      expect.objectContaining({
        appId: "app-001",
        appVersion: "5.0.0",
        environmentId: "environment-001",
        event: "scg.app.upgraded",
        installationId: "installation-001",
        upgraderAccountId: "account-upgrader",
      }),
    ]);
  });
});
