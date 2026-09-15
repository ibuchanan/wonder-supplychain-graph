/**
 * The resolver seam for log sink configuration. It stands a fake Forge host in
 * for `@forge/kvs` so the tests can see which of the two stores each value
 * landed in: plain app storage, or the encrypted secret store the frontend can
 * never read back.
 */

import { fetch } from "@forge/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const plainStorage = new Map<string, unknown>();
const secretStorage = new Map<string, unknown>();

vi.mock("@forge/kvs", () => ({
  kvs: {
    delete: vi.fn(async (key: string) => {
      plainStorage.delete(key);
    }),
    deleteSecret: vi.fn(async (key: string) => {
      secretStorage.delete(key);
    }),
    get: vi.fn(async (key: string) => plainStorage.get(key)),
    getSecret: vi.fn(async (key: string) => secretStorage.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      plainStorage.set(key, value);
    }),
    setSecret: vi.fn(async (key: string, value: unknown) => {
      secretStorage.set(key, value);
    }),
  },
}));

vi.mock("@forge/api", () => ({
  fetch: vi.fn(),
  getAppContext: vi.fn(() => ({
    environmentAri: "ari:cloud:ecosystem::environment/test",
    environmentType: "DEVELOPMENT",
    installationAri: "ari:cloud:ecosystem::installation/test",
  })),
  webTrigger: { getUrl: vi.fn() },
}));

const { handler } = await import("../../src/resolvers/index");

/**
 * The acting account reaches a resolver through the host's runtime payload, not
 * through anything the browser can set, which is why the actor in the audit
 * evidence below is trustworthy.
 */
function invoke(functionKey: string, payload?: unknown) {
  return handler(
    { call: { functionKey, ...(payload ? { payload } : {}) } } as never,
    {
      principal: { accountId: "ada-blue-account" },
    },
  );
}

const permittedSink =
  "https://ingest.execute-api.us-east-1.amazonaws.com/v1/events";

describe("log sink configuration resolvers", () => {
  beforeEach(() => {
    plainStorage.clear();
    secretStorage.clear();
  });

  it("reports an unconfigured app before an administrator has saved anything", async () => {
    await expect(invoke("getLogSink")).resolves.toEqual({
      hasSecret: false,
      isConfigured: false,
    });
  });

  it("saves the URL and method in app storage and the secret in encrypted storage", async () => {
    await expect(
      invoke("saveLogSink", {
        authMethod: "bearer-token",
        secret: "sink-bearer-token",
        targetUrl: permittedSink,
      }),
    ).resolves.toEqual({ status: "saved" });

    expect([...plainStorage.keys()]).toContain("log-sink-configuration");
    expect(plainStorage.get("log-sink-configuration")).toEqual({
      authMethod: "bearer-token",
      targetUrl: permittedSink,
    });
    expect(secretStorage.get("log-sink-secret")).toBe("sink-bearer-token");
    expect(JSON.stringify([...plainStorage.values()])).not.toContain(
      "sink-bearer-token",
    );
  });

  it("validates a CloudEvents webhook before persisting it", async () => {
    vi.mocked(fetch).mockResolvedValue({
      headers: new Headers({
        "WebHook-Allowed-Origin": "ari:cloud:ecosystem::installation/test",
      }),
      ok: true,
    } as never);

    await expect(
      invoke("saveLogSink", {
        authMethod: "cloudevents-webhook",
        secret: "unchanged-secret",
        targetUrl: permittedSink,
      }),
    ).resolves.toEqual({ status: "saved" });

    expect(fetch).toHaveBeenCalledWith(permittedSink, {
      headers: {
        "WebHook-Request-Origin": "ari:cloud:ecosystem::installation/test",
      },
      method: "OPTIONS",
    });
    expect(plainStorage.get("log-sink-configuration")).toEqual({
      authMethod: "cloudevents-webhook",
      targetUrl: permittedSink,
    });
  });

  it("reuses the encrypted secret when an administrator switches auth methods", async () => {
    await invoke("saveLogSink", {
      authMethod: "bearer-token",
      secret: "saved-secret",
      targetUrl: permittedSink,
    });
    vi.mocked(fetch).mockResolvedValue({
      headers: new Headers({
        "WebHook-Allowed-Origin": "ari:cloud:ecosystem::installation/test",
      }),
      ok: true,
    } as never);

    await expect(
      invoke("saveLogSink", {
        authMethod: "cloudevents-webhook",
        secret: "",
        targetUrl: permittedSink,
      }),
    ).resolves.toEqual({ status: "saved" });

    expect(secretStorage.get("log-sink-secret")).toBe("saved-secret");
    expect(plainStorage.get("log-sink-configuration")).toEqual({
      authMethod: "cloudevents-webhook",
      targetUrl: permittedSink,
    });
  });

  it("rejects an unapproved webhook without storing it or exposing its secret", async () => {
    vi.mocked(fetch).mockResolvedValue({
      headers: new Headers(),
      ok: true,
    } as never);

    const rejected = await invoke("saveLogSink", {
      authMethod: "cloudevents-webhook",
      secret: "unchanged-secret",
      targetUrl: permittedSink,
    });

    expect(rejected).toEqual({
      reason: "webhook-origin-not-allowed",
      status: "rejected",
    });
    expect(plainStorage.has("log-sink-configuration")).toBe(false);
    expect(secretStorage.size).toBe(0);
    expect(JSON.stringify(rejected)).not.toContain("unchanged-secret");
  });

  it("reflects the saved state on reload without ever returning the secret", async () => {
    vi.mocked(fetch).mockResolvedValue({
      headers: new Headers({
        "WebHook-Allowed-Origin": "ari:cloud:ecosystem::installation/test",
      }),
      ok: true,
    } as never);

    await invoke("saveLogSink", {
      authMethod: "cloudevents-webhook",
      secret: "sink-bearer-token",
      targetUrl: permittedSink,
    });

    const status = await invoke("getLogSink");

    expect(status).toEqual({
      authMethod: "cloudevents-webhook",
      hasSecret: true,
      isConfigured: true,
      targetUrl: permittedSink,
    });
    expect(JSON.stringify(status)).not.toContain("sink-bearer-token");
  });

  it("refuses a sink outside validated egress and reports why without echoing the secret", async () => {
    const rejected = await invoke("saveLogSink", {
      authMethod: "bearer-token",
      secret: "sink-bearer-token",
      targetUrl: "https://logs.attacker.example/v1/events",
    });

    expect(rejected).toEqual({
      reason: "log-sink-host-not-permitted",
      status: "rejected",
    });
    expect(JSON.stringify(rejected)).not.toContain("sink-bearer-token");
    expect(plainStorage.has("log-sink-configuration")).toBe(false);
    expect(secretStorage.size).toBe(0);
  });

  it("returns the app to an unconfigured state on reset, clearing the URL, method, and secret", async () => {
    await invoke("saveLogSink", {
      authMethod: "bearer-token",
      secret: "sink-bearer-token",
      targetUrl: permittedSink,
    });

    await expect(invoke("resetLogSink")).resolves.toEqual({ status: "reset" });

    expect(plainStorage.has("log-sink-configuration")).toBe(false);
    expect(secretStorage.has("log-sink-secret")).toBe(false);
    await expect(invoke("getLogSink")).resolves.toEqual({
      hasSecret: false,
      isConfigured: false,
    });
  });

  it("stores one sink per tenant installation, under a key naming no connection or relationship", async () => {
    await invoke("saveLogSink", {
      authMethod: "bearer-token",
      secret: "sink-bearer-token",
      targetUrl: permittedSink,
    });
    await invoke("saveLogSink", {
      authMethod: "cloudevents-webhook",
      secret: "second-token",
      targetUrl: permittedSink,
    });

    const sinkKeys = [...plainStorage.keys()].filter((key) =>
      key.includes("log-sink"),
    );

    expect(sinkKeys).toEqual(["log-sink-configuration"]);
    expect([...secretStorage.keys()]).toEqual(["log-sink-secret"]);
    for (const key of [...sinkKeys, ...secretStorage.keys()]) {
      expect(key).not.toMatch(/connection|relationship|pairing/);
    }
  });

  it("keeps audit evidence of a save and a reset, naming the actor but never the secret or the sink URL", async () => {
    await invoke("saveLogSink", {
      authMethod: "bearer-token",
      secret: "sink-bearer-token",
      targetUrl: permittedSink,
    });
    await invoke("resetLogSink");

    const journal = plainStorage.get("lifecycle-audit-journal") as {
      readonly events: readonly {
        readonly actorAccountId?: string;
        readonly eventType: string;
        readonly outcome: string;
      }[];
    };

    expect(
      journal.events.map((event) => [
        event.eventType,
        event.outcome,
        event.actorAccountId,
      ]),
    ).toEqual([
      ["logging.sink-configured", "recorded", "ada-blue-account"],
      ["logging.sink-cleared", "recorded", "ada-blue-account"],
    ]);
    const evidence = JSON.stringify(journal);
    expect(evidence).not.toContain("sink-bearer-token");
    expect(evidence).not.toContain("amazonaws.com");
  });
});
