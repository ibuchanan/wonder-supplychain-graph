import { describe, expect, it } from "vitest";

import type { Result } from "@forge-ahead/errors";

import {
  applyDeterministicSupplierReceipt,
  createAuthorizedSupplierScenario,
  createSupplierPackageScenario,
  toSupplierPackageView,
} from "../../src/simulator/authorized-supplier-package";

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected deterministic simulator receipt to succeed, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

describe("authorized supplier simulator scenario", () => {
  it("projects a deterministic current package for exploratory review", () => {
    const scenario = createAuthorizedSupplierScenario();

    expect(toSupplierPackageView(scenario)).toEqual({
      children: [
        {
          description: "Approve the material specification.",
          issueType: "Task",
          key: "MFG-18",
          priority: "High",
          statusCategory: "To Do",
          summary: "Source material approval",
        },
        {
          description: "Prepare the manufacturing line for release.",
          issueType: "Task",
          key: "MFG-19",
          priority: "Medium",
          statusCategory: "In Progress",
          summary: "Manufacturing readiness",
        },
      ],
      current: {
        publishedAt: "2026-08-03T16:00:00.000Z",
        sourceEpic: {
          key: "MFG-17",
          priority: "High",
          statusCategory: "In Progress",
          summary: "Supplier release package",
        },
        version: "1",
      },
      provenance: {
        publisherId: "account:manufacturer-automation",
        sourceSiteId: "site:manufacturer",
      },
    });
  });

  it("promotes a deterministic supplier receipt and makes local audit evidence inspectable", () => {
    const delivery = expectOk(
      applyDeterministicSupplierReceipt(createAuthorizedSupplierScenario()),
    );

    expect(delivery.decision).toEqual({
      idempotency: "applied",
      state: "published",
      version: "2",
    });
    expect(toSupplierPackageView(delivery.nextScenario)).toMatchObject({
      current: {
        sourceEpic: {
          key: "MFG-17",
          summary: "Supplier release package",
        },
        version: "2",
      },
    });
    expect(delivery.auditEvents).toEqual([
      {
        correlationId: "corr-supplier-package-002",
        eventId: "audit:supplier-receipt-002",
        eventType: "snapshot.received-and-promoted",
        idempotencyKey: "supplier-receipt-002",
        occurredAt: "2026-08-04T16:00:00.000Z",
        pairingId: "pairing-001",
        protocolVersion: "v1",
      },
    ]);
  });

  it("replays the same delivery without another promotion or audit event", () => {
    const promoted = expectOk(
      applyDeterministicSupplierReceipt(createAuthorizedSupplierScenario()),
    );
    const replayed = expectOk(
      applyDeterministicSupplierReceipt(promoted.nextScenario),
    );

    expect(replayed.decision).toEqual({
      idempotency: "replayed",
      state: "published",
      version: "2",
    });
    expect(replayed.auditEvents).toEqual([]);
    expect(replayed.nextScenario).toEqual(promoted.nextScenario);
  });

  it.each([
    {
      scenario: "empty",
      status: "No current authorized package exists.",
    },
    {
      scenario: "pending-candidate",
      status:
        "A candidate is pending; no current authorized package is available.",
    },
    {
      scenario: "authorization-denied",
      status:
        "Peer authorization was denied; no current authorized package is available.",
    },
    {
      scenario: "malformed",
      status:
        "The received candidate is malformed; no current authorized package is available.",
    },
    {
      scenario: "unavailable",
      status:
        "The supplier relationship is unavailable; no current authorized package is available.",
    },
  ] as const)(
    "keeps source package content hidden for the $scenario scenario",
    ({ scenario, status }) => {
      const packageView = toSupplierPackageView(
        createSupplierPackageScenario(scenario),
      );

      expect(packageView).toEqual({ status });
      expect(packageView).not.toHaveProperty("children");
      expect(packageView).not.toHaveProperty("current");
      expect(packageView).not.toHaveProperty("provenance");
    },
  );
});
