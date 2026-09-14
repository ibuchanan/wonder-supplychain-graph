import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/set-shared-secret.sh", "utf8");

describe("set-shared-secret", () => {
  it("generates exactly 32 random bytes with OpenSSL 3 and stores them encrypted without printing the secret", () => {
    expect(script).toContain("brew --prefix openssl@3");
    expect(script).toContain("env -u OPENSSL_CONF");
    expect(script).toContain("rand -base64 32");
    expect(script).toContain("^[A-Za-z0-9+/]{43}=$");
    expect(script).toContain("forge variables set --encrypt");
    expect(script).toContain("SHARED_SECRET");
    expect(script).not.toContain("printf '%s\\n' \"$secret\"");
  });
});
