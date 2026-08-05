import { describe, expect, it } from "vitest";

import {
  createAuthorizedSupplierScenario,
  toSupplierPackageView,
} from "../../src/simulator/authorized-supplier-package";

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
        publishedAt: "2026-08-04T16:00:00.000Z",
        sourceEpic: {
          key: "MFG-17",
          priority: "High",
          statusCategory: "In Progress",
          summary: "Supplier release package",
        },
        version: "2",
      },
      provenance: {
        publisherId: "account:manufacturer-automation",
        sourceSiteId: "site:manufacturer",
      },
    });
  });
});
