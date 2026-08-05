/**
 * Teamwork Graph connector wiring tests
 *
 * Validates the manifest contract for the `graph:connector` module that projects
 * the current authorized supplier package into Teamwork Graph. Handler symbol
 * resolution is covered by the shared handler-wiring test.
 *
 * @see {@link https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/|Teamwork Graph connector reference}
 */

import { describe, expect, it } from "vitest";
import { getManifestScopes, loadManifest } from "./manifest-helpers";

describe("Teamwork Graph connector wiring", () => {
  it("declares a connector that can ingest and remove tenant-local package objects", () => {
    const manifest = loadManifest();
    const connectors = manifest.modules["graph:connector"] ?? [];

    expect(connectors).toHaveLength(1);

    const [connector] = connectors;

    expect(connector.key).toBe("scg-package-connector");
    expect(connector.name).toBeTruthy();
    expect(connector.icons?.light).toBeTruthy();
    expect(connector.icons?.dark).toBeTruthy();
    expect(connector.objectTypes).toEqual(["atlassian:work-item"]);
    // The datasource block is mandatory, and onConnectionChange within it is
    // required so suppression runs when the relationship becomes unavailable.
    expect(connector.datasource?.onConnectionChange?.function).toBeTruthy();

    const scopes = new Set(getManifestScopes(manifest));

    for (const scope of [
      "delete:object:jira",
      "read:object:jira",
      "write:object:jira",
    ]) {
      expect(scopes.has(scope), `The manifest must declare ${scope}`).toBe(
        true,
      );
    }
  });
});
