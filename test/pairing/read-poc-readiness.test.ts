import { describe, expect, it } from "vitest";

import { readPocReadiness } from "../../src/pairing/read-poc-readiness";

const dependencies = {
  getIdentity: () => ({
    environmentAri: "ari:cloud:ecosystem::environment/scg/development",
    environmentType: "DEVELOPMENT",
    installationAri: "ari:cloud:ecosystem::installation/green-installation",
    siteAri: "ari:cloud:jira::site/green-site",
  }),
  getSecret: () => Buffer.alloc(32).toString("base64"),
} as const;

describe("readPocReadiness", () => {
  it("returns readiness from trusted local identity and durable state", async () => {
    await expect(
      readPocReadiness({
        ...dependencies,
        readDurableState: async () => undefined,
      }),
    ).resolves.toEqual({ status: "ready" });
  });

  it("fails closed when durable state cannot be read", async () => {
    await expect(
      readPocReadiness({
        ...dependencies,
        readDurableState: async () => Promise.reject(new Error("unavailable")),
      }),
    ).resolves.toEqual({ status: "blocked" });
  });
});
