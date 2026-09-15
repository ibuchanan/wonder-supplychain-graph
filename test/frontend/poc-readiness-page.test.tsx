import { create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import {
  type AdministratorOverview,
  PocReadinessPage,
} from "../../src/frontend/poc-readiness-page";
import { loadManifest } from "../forge/manifest-helpers";

type Element = {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly Node[] | null;
};

type Node = Element | string;

const noRelationships: AdministratorOverview = {
  auditOutcomes: [],
  relationships: [],
};

function render(element: React.ReactElement): Element {
  return create(element).toJSON() as unknown as Element;
}

function isElement(node: Node): node is Element {
  return typeof node !== "string";
}

function elementsOfType(node: Node, type: string): readonly Element[] {
  if (!isElement(node)) {
    return [];
  }

  const descendants = (node.children ?? []).flatMap((child) =>
    elementsOfType(child, type),
  );

  return node.type === type ? [node, ...descendants] : descendants;
}

function textOf(node: Node): string {
  return isElement(node)
    ? (node.children ?? []).map(textOf).join("")
    : (node as string);
}

/**
 * A `DynamicTable` carries its empty state in a prop rather than in its
 * children, so it is reachable only by rendering that prop on its own.
 */
function emptyStatesIn(node: Node): readonly string[] {
  return elementsOfType(node, "DynamicTable").map((table) =>
    textOf(render(table.props.emptyView as React.ReactElement)),
  );
}

function manifestPageTitle(): string {
  const pages = (
    loadManifest().modules as unknown as {
      "jira:adminPage"?: Array<{ key: string; title: string }>;
    }
  )["jira:adminPage"];
  const page = pages?.find((entry) => entry.key === "scg-poc-readiness");

  if (!page) {
    throw new Error("The manifest declares no scg-poc-readiness admin page.");
  }

  return page.title;
}

describe("Peer POC readiness page", () => {
  it("leaves the only page heading to the title declared in the manifest", () => {
    const page = render(
      <PocReadinessPage
        onRevoke={() => undefined}
        overview={noRelationships}
        readiness={{ status: "ready" }}
      />,
    );

    // The admin already sees the manifest title above the page, so any heading
    // the page contributes that the title also says is the duplicate one.
    const title = manifestPageTitle();
    const duplicated = elementsOfType(page, "Heading")
      .map(textOf)
      .filter((heading) => title.includes(heading));

    expect(duplicated).toEqual([]);
  });

  it("separates site relationships from audit outcomes into two tabs", () => {
    const page = render(
      <PocReadinessPage
        onRevoke={() => undefined}
        overview={noRelationships}
        readiness={{ status: "ready" }}
      />,
    );

    expect(elementsOfType(page, "Tab").map(textOf)).toEqual([
      "Site relationships",
      "Recent audit outcomes",
    ]);
  });

  it("keeps readiness above the tabs, where either tab can see it", () => {
    const page = render(
      <PocReadinessPage
        onRevoke={() => undefined}
        overview={noRelationships}
        readiness={{ status: "blocked" }}
      />,
    );

    const children = page.children ?? [];
    const aboveTabs = children
      .slice(
        0,
        children.findIndex(
          (child) => isElement(child) && child.type === "Tabs",
        ),
      )
      .map(textOf)
      .join(" ");

    expect(aboveTabs).toContain("Blocked");
    expect(aboveTabs).toContain(
      "Blocked. A local POC prerequisite is unavailable.",
    );
  });

  it("gives each tab its own description and its own empty state", () => {
    const page = render(
      <PocReadinessPage
        onRevoke={() => undefined}
        overview={noRelationships}
        readiness={{ status: "ready" }}
      />,
    );

    const [relationships, audit] = elementsOfType(page, "TabPanel");

    expect(textOf(relationships as Element)).toContain(
      "This tenant's own records only.",
    );
    expect(emptyStatesIn(relationships as Element)).toEqual([
      "No Site relationship is recorded on this site.",
    ]);
    expect(textOf(audit as Element)).toContain(
      "Non-content evidence retained by this site.",
    );
    expect(emptyStatesIn(audit as Element)).toEqual([
      "No audit evidence is recorded on this site yet.",
    ]);
  });

  it("pairs every tab with a panel inside one tab list, as tab semantics require", () => {
    const page = render(
      <PocReadinessPage
        onRevoke={() => undefined}
        overview={noRelationships}
        readiness={{ status: "ready" }}
      />,
    );

    // Keyboard traversal and the selected-tab announcement come from UI Kit's
    // own tab semantics. What the page owes them is this shape: one tab list,
    // and one panel for every tab in it.
    const [tabs] = elementsOfType(page, "Tabs");
    const [tabList] = elementsOfType(tabs as Element, "TabList");

    expect(elementsOfType(page, "TabList")).toHaveLength(1);
    expect(elementsOfType(page, "TabPanel")).toHaveLength(
      elementsOfType(tabList as Element, "Tab").length,
    );
  });
});
