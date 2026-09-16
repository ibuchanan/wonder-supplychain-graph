import { describe, expect, it } from "vitest";

import { evaluateInstallationReadiness } from "../../src/pairing/installation-readiness";

const readyInput = {
  durableStateAvailable: true,
  environmentAri: "ari:cloud:ecosystem::environment/scg/development",
  installationAri: "ari:cloud:ecosystem::installation/green-installation",
  secret: Buffer.alloc(32).toString("base64"),
  siteAri: "ari:cloud:jira::site/green-site",
} as const;

describe("evaluateInstallationReadiness", () => {
  it("reports Ready for an installation with every local prerequisite", () => {
    expect(evaluateInstallationReadiness(readyInput)).toEqual({
      status: "ready",
    });
  });

  it.each([
    [{ secret: undefined }, "the encrypted secret is unavailable"],
    [{ siteAri: undefined }, "the site identity is unavailable"],
    [
      { installationAri: undefined },
      "the installation identity is unavailable",
    ],
    [{ environmentAri: undefined }, "the environment identity is unavailable"],
    [{ durableStateAvailable: false }, "durable state is unavailable"],
  ] as const)("blocks readiness when %s", (override) => {
    expect(
      evaluateInstallationReadiness({ ...readyInput, ...override }),
    ).toEqual({
      status: "blocked",
    });
  });

  it("blocks a non-canonical base64 secret even when its decoded length is allowed", () => {
    expect(
      evaluateInstallationReadiness({
        ...readyInput,
        secret: `${Buffer.alloc(33).toString("base64")}A`,
      }),
    ).toEqual({ status: "blocked" });
  });
});
