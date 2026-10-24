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
      status: "active" as const,
      termsVersion: "v1",
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
    render(table.props["emptyView"] as React.ReactElement),
  );
}

function emptyStatesIn(node: Node): readonly string[] {
  return emptyViewsIn(node).map(textOf);
}

function linksIn(node: Node): readonly { href: string; text: string }[] {
  return elementsOfType(node, "Link").map((link) => ({
    href: link.props["href"] as string,
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

  it("separates connections from audit outcomes into two tabs", () => {
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={noPeerCxs}
        readiness={{ status: "ready" }}
      />,
    );

    // "Connections" is what an administrator calls these. PeerCX is the
    // precise domain term, not admin-facing vocabulary.
    expect(elementsOfType(page, "Tab").map(textOf)).toEqual([
      "Connections",
      "Recent audit outcomes",
    ]);
  });

  it("gives every derived status a lozenge appearance", () => {
    // A status with no appearance renders an undefined prop, so the admin sees
    // an unstyled lozenge rather than being told what state the PeerCX is in.
    const statuses = [
      "active",
      "confirming",
      "declined",
      "expired",
      "invalidated",
      "invited",
      "proposed",
      "revoked",
    ] as const;

    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={{
          auditOutcomes: [],
          peerCxs: statuses.map((status) => ({
            agreedOperations: [],
            pairingCount: 0,
            peerCxId: `peer-cx-${status}`,
            status,
            termsVersion: "v1",
          })),
        }}
        readiness={{ status: "ready" }}
      />,
    );

    const appearances = elementsOfType(page, "Lozenge")
      .filter((lozenge) => statuses.includes(textOf(lozenge) as never))
      .map((lozenge) => lozenge.props["appearance"]);

    expect(appearances).toHaveLength(statuses.length);
    expect(appearances).not.toContain(undefined);
  });

  it("renders an invited PeerCX that has no counterpart or agreement end", () => {
    // An Invitation names a recipient rather than a site, so those cells have
    // nothing to show and must read as absent instead of blank.
    const page = render(
      <StatusPage
        configurationUrls={{}}
        onRevoke={() => undefined}
        overview={{
          auditOutcomes: [],
          peerCxs: [
            {
              agreedOperations: ["starter.delivery"],
              pairingCount: 0,
              peerCxId: "invitation-002",
              safeLabel: "swift-connection",
              status: "invited",
              termsVersion: "v1",
            },
          ],
        }}
        readiness={{ status: "ready" }}
      />,
    );

    const [peerCxTable] = elementsOfType(page, "DynamicTable");
    const rendered = textOf(peerCxTable as Element);

    // The safe label stands in for the counterpart that is not yet known, and
    // the absent agreement end reads as an em dash rather than as blank.
    expect(rendered).toContain("swift-connection");
    expect(rendered).toContain("—");
    expect(rendered).not.toContain("undefined");
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
      "No connection is recorded on this site.",
    ]);
    expect(textOf(audit as Element)).toContain(
      "Non-content evidence retained by this site.",
    );
    expect(emptyStatesIn(audit as Element)).toEqual([
      "No audit evidence is recorded on this site yet.",
    ]);
  });

  it("sends an admin with no PeerCX to PeerCX setup by name", () => {
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
      { href: "/peer-cx-setup", text: "Create a connection" },
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
