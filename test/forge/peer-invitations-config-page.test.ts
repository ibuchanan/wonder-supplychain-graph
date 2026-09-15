import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadManifest } from "./manifest-helpers";

function loadPageSource() {
  return readFileSync(
    join(process.cwd(), "src/frontend/peer-invitations.tsx"),
    "utf8",
  );
}

interface AdminPageModule {
  readonly key: string;
  readonly render?: string;
  readonly resolver?: { readonly function: string };
  readonly resource: string;
  readonly title: string;
  readonly useAsConfig?: boolean;
}

interface Resource {
  readonly key: string;
  readonly path: string;
}

function loadSurfaces() {
  const manifest = loadManifest() as unknown as {
    modules: { "jira:adminPage"?: readonly AdminPageModule[] };
    resources: readonly Resource[];
  };

  return {
    page: manifest.modules["jira:adminPage"]?.find(
      (entry) => entry.key === "scg-peer-invitations",
    ),
    resources: manifest.resources,
  };
}

describe("Peer invitations configuration page", () => {
  it("is the app's configuration page, rendered natively like every other surface", () => {
    const { page, resources } = loadSurfaces();

    expect(page).toMatchObject({
      render: "native",
      resolver: { function: "getActionConfig" },
      resource: "peer-invitations",
      title: "Supplychain Graph Peer invitations",
      useAsConfig: true,
    });
    expect(resources).toContainEqual({
      key: "peer-invitations",
      path: "src/frontend/peer-invitations.tsx",
    });
  });

  it("carries invitation creation as one section of the configuration page", () => {
    const page = loadPageSource();

    expect(page).toContain("ForgeReconciler.render");
    expect(page).toContain("chooseInvitationView");
    expect(page).toContain("useProductContext");
    expect(page).toContain('"createInvitation"');
    expect(page).toContain("Invite a peer administrator");
    expect(page).toContain(
      "Send this URL through an existing business channel",
    );
  });

  it("serves the recipient reached from an invitation reference", () => {
    const page = loadPageSource();

    expect(page).toContain('"readInvitation"');
    expect(page).toContain("Invitation unavailable");
    expect(page).toContain(
      "This invitation is unavailable or you are not its recipient.",
    );
  });

  it("renders through UI Kit alone, with no hand-written DOM and no secret", () => {
    const page = loadPageSource();

    expect(page).not.toContain("innerHTML");
    expect(page).not.toContain("document.");
    expect(page).not.toContain("window.");
    expect(page).not.toContain("SHARED_SECRET");
  });

  it("needs no generated static bundle, so a clean checkout deploys as-is", () => {
    const root = process.cwd();
    const scripts = (
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      }
    ).scripts;

    expect(existsSync(join(root, "src/frontend/peer-invitations-ui"))).toBe(
      false,
    );
    expect(existsSync(join(root, "vite.peer-invitations.config.mjs"))).toBe(
      false,
    );
    expect(scripts).not.toHaveProperty("build:peer-invitations");
    expect(scripts.build).not.toContain("vite");
    expect(scripts.clean).not.toContain("static/peer-invitations");
  });
});
