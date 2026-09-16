import { create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import {
  type AdministratorOverview,
  StatusPage,
} from "../../src/frontend/status-page";
import { loadManifest } from "../forge/manifest-helpers";

type Element = {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly Node[] | null;
};

type Node = Element | string;

const noPeerCxs: AdministratorOverview = {
  auditOutcomes: [],
  peerCxs: [],
};

const populated: AdministratorOverview = {
  auditOutcomes: [
    {
      eventId: "event-1",
      eventType: "peer-cx-activated",
      occurredAt: "2026-01-02T03:04:05.000Z",
      outcome: "recorded",
    },
  ],
  peerCxs: [
    {
      agreedOperations: ["publish-work-package"],
      agreementEndsAt: "2026-04-01T00:00:00.000Z",
      counterpartSiteAri: "ari:cloud:platform::site/counterpart",
      pairingCount: 1,
      peerCxId: "peer-cx-1",
      status: "active",
    },
  ],
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
function emptyViewsIn(node: Node): readonly Element[] {
  return elementsOfType(node, "DynamicTable").map((table) =>
    render(table.props.emptyView as React.ReactElement),
  );
}

function emptyStatesIn(node: Node): readonly string[] {
  return emptyViewsIn(node).map(textOf);
}

function linksIn(node: Node): readonly { href: string; text: string }[] {
  return elementsOfType(node, "Link").map((link) => ({
    href: link.props.href as string,
    text: textOf(link),
  }));
}

function manifestPageTitle(): string {
  const pages = (
    loadManifest().modules as unknown as {
      "jira:adminPage"?: Array<{ key: string; title: string }>;
    }
  )["jira:adminPage"];
  const page = pages?.find((entry) => entry.key === "scg-status");

  if (!page) {
    throw new Error("The manifest declares no scg-status admin page.");
  }

  return page.title;
}

describe("Status page", () => {
  it("leaves the only page heading to the title declared in the manifest", () => {
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
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

  it("separates PeerCXs from audit outcomes into two tabs", () => {
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
        readiness={{ status: "ready" }}
      />,
    );

    expect(elementsOfType(page, "Tab").map(textOf)).toEqual([
      "PeerCXs",
      "Recent audit outcomes",
    ]);
  });

  it("keeps readiness above the tabs, where either tab can see it", () => {
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
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
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
        readiness={{ status: "ready" }}
      />,
    );

    const [peerCxs, audit] = elementsOfType(page, "TabPanel");

    expect(textOf(peerCxs as Element)).toContain(
      "This tenant's own records only.",
    );
    expect(emptyStatesIn(peerCxs as Element)).toEqual([
      "No PeerCX is recorded on this site.",
    ]);
    expect(textOf(audit as Element)).toContain(
      "Non-content evidence retained by this site.",
    );
    expect(emptyStatesIn(audit as Element)).toEqual([
      "No audit evidence is recorded on this site yet.",
    ]);
  });

  it("sends an admin with no Site PeerCX to PeerCX setup by name", () => {
    const page = render(
      <StatusPage
        configurationUrls={{ "peer-cx": "/peer-cx-setup" }}
        onRevoke={() => undefined}
        overview={noPeerCxs}
        readiness={{ status: "ready" }}
      />,
    );

    const [peerCxs] = elementsOfType(page, "TabPanel");
    const [emptyState] = emptyViewsIn(peerCxs as Element);

    expect(linksIn(emptyState as Element)).toEqual([
      { href: "/peer-cx-setup", text: "Create a PeerCX" },
    ]);
  });

  it("sends an admin with no audit evidence to log sink setup by name", () => {
    const page = render(
      <StatusPage
        configurationUrls={{ "log-sink": "/log-sink-setup" }}
        onRevoke={() => undefined}
        overview={noPeerCxs}
        readiness={{ status: "ready" }}
      />,
    );

    const [, audit] = elementsOfType(page, "TabPanel");
    const [emptyState] = emptyViewsIn(audit as Element);

    expect(linksIn(emptyState as Element)).toEqual([
      { href: "/log-sink-setup", text: "Set up a log sink" },
    ]);
  });

  it("keeps the setup links out of a populated page, which needs no setup", () => {
    const page = render(
      <StatusPage
        configurationUrls={{
          "log-sink": "/log-sink-setup",
          "peer-cx": "/peer-cx-setup",
        }}
        onRevoke={() => undefined}
        overview={populated}
        readiness={{ status: "ready" }}
      />,
    );

    // Both tables have rows, so neither shows its empty view. A populated
    // table renders its cells as children, so a setup link that leaked into a
    // row would be reachable here.
    expect(linksIn(page)).toEqual([]);
  });

  it("pairs every tab with a panel inside one tab list, as tab semantics require", () => {
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
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
