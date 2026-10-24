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

  it.each(["secret", "siteAri", "installationAri", "environmentAri"] as const)(
    "blocks readiness when %s is unavailable",
    (key) => {
      const { [key]: _missing, ...input } = readyInput;
      expect(evaluateInstallationReadiness(input)).toEqual({
        status: "blocked",
      });
    },
  );

  it("blocks readiness when durable state is unavailable", () => {
    expect(
      evaluateInstallationReadiness({
        ...readyInput,
        durableStateAvailable: false,
      }),
    ).toEqual({ status: "blocked" });
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
