import { describe, expect, it } from "vitest";

import { permittedSinkHosts } from "../../src/observability/log-sink-configuration";
import { loadManifest } from "./manifest-helpers";

function declaredBackendAddresses(): readonly string[] {
  const manifest = loadManifest() as unknown as {
    permissions: {
      external?: {
        fetch?: { backend?: readonly { readonly address: string }[] };
      };
    };
  };

  return (manifest.permissions.external?.fetch?.backend ?? []).map(
    (entry) => entry.address,
  );
}

describe("CloudEvent log sink egress", () => {
  it("declares every permitted sink host, so an admin-supplied URL still reaches validated egress", () => {
    const declared = declaredBackendAddresses();

    for (const host of permittedSinkHosts) {
      expect(declared).toContain(host);
    }
  });

  it("declares no bare wildcard, which is what makes the sink allowlist worth enforcing", () => {
    for (const address of declaredBackendAddresses()) {
      expect(address).not.toBe("*");
      expect(address).not.toBe("*.*");
    }
  });
});
