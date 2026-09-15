import { describe, expect, it } from "vitest";

import { evaluatePocReadiness } from "../../src/pairing/poc-readiness";

const readyInput = {
  durableStateAvailable: true,
  environmentAri: "ari:cloud:ecosystem::environment/scg/development",
  environmentType: "DEVELOPMENT",
  installationAri: "ari:cloud:ecosystem::installation/green-installation",
  secret: Buffer.alloc(32).toString("base64"),
  siteAri: "ari:cloud:jira::site/green-site",
} as const;

describe("evaluatePocReadiness", () => {
  it("reports Ready for any development installation with every local prerequisite", () => {
    expect(evaluatePocReadiness(readyInput)).toEqual({ status: "ready" });
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
    [{ environmentType: "PRODUCTION" }, "the environment is not development"],
  ] as const)("blocks readiness when %s", (override) => {
    expect(evaluatePocReadiness({ ...readyInput, ...override })).toEqual({
      status: "blocked",
    });
  });

  it("blocks a non-canonical base64 secret even when its decoded length is allowed", () => {
    expect(
      evaluatePocReadiness({
        ...readyInput,
        secret: `${Buffer.alloc(33).toString("base64")}A`,
      }),
    ).toEqual({ status: "blocked" });
  });
});
