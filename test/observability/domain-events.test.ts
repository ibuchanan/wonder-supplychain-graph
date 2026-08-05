import { describe, expect, it } from "vitest";

import {
  logGraphConnectionChanged,
  logGraphConnectionResult,
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

    logGraphConnectionChanged(logger, {
      action: "CREATED",
      connectionId: "connection-001",
      connectionName: "Demo manufacturer connection",
    });
    logGraphConnectionResult(logger, {
      action: "CREATED",
      connectionId: "connection-001",
      message: "Suppressed discovery: no-current-package.",
      connectionName: "Demo manufacturer connection",
      success: true,
    });

    logGraphPublishResult(logger, {
      connectionId: "connection-001",
      correlationId: "scg:execution-001",
      ingested: 3,
      sourceEpicId: "MFG-17",
      status: "indexed",
      version: "1",
    });
    logRovoCommentResult(logger, {
      commentId: "10001",
      connectionId: "connection-001",
      sourceEpicId: "MFG-17",
      status: "commented",
      version: "1",
    });

    expect(records).toEqual([
      expect.objectContaining({
        action: "CREATED",
        connectionId: "connection-001",
        connectionName: "Demo manufacturer connection",
        event: "scg.graph.connection.changed",
      }),
      expect.objectContaining({
        action: "CREATED",
        connectionId: "connection-001",
        connectionName: "Demo manufacturer connection",
        event: "scg.graph.connection.completed",
        message: "Suppressed discovery: no-current-package.",
        success: true,
      }),
      expect.objectContaining({
        connectionId: "connection-001",
        correlationId: "scg:execution-001",
        event: "scg.graph.publish.completed",
        ingested: 3,
        sourceEpicId: "MFG-17",
        status: "indexed",
        version: "1",
      }),
      expect.objectContaining({
        commentId: "10001",
        connectionId: "connection-001",
        event: "scg.rovo.comment.completed",
        sourceEpicId: "MFG-17",
        status: "commented",
        version: "1",
      }),
    ]);
  });
});
