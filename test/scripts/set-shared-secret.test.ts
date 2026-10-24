import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join } from "node:path";

import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/set-shared-secret.sh", "utf8");

describe("set-shared-secret", () => {
  it.each([
    { providerStatus: "0", uploadStatus: "0", expected: 0 },
    { providerStatus: "8", uploadStatus: "0", expected: 8 },
    { providerStatus: "0", uploadStatus: "9", expected: 9 },
  ])(
    "stores before upload and propagates failure: $expected",
    ({ providerStatus, uploadStatus, expected }) => {
      const directory = mkdtempSync(join(process.cwd(), "tmp_rovo_secret-"));
      const secret = Buffer.alloc(32).toString("base64");
      const stored = join(directory, "stored");
      const uploaded = join(directory, "uploaded");
      const tool = (name: string, contents: string) => {
        const path = join(directory, name);
        writeFileSync(path, contents);
        chmodSync(path, 0o755);
        return path;
      };
      try {
        const openssl = tool(
          "openssl",
          `#!/bin/sh
if [ "$1" = version ]; then printf 'OpenSSL 3.6.0\\n'; else printf '%s\\n' '${secret}'; fi
`,
        );
        tool(
          "secretspec",
          `#!/bin/sh
[ "$1" = set ] && [ "$2" = SHARED_SECRET ] && [ "$3" = --from-file ] && [ "$4" = - ] || exit 99
printf '%s\\n' "$@" > "$TEST_ARGUMENTS"
if [ "$TEST_PROVIDER_STATUS" != 0 ]; then exit "$TEST_PROVIDER_STATUS"; fi
tee "$TEST_STORED" >/dev/null
`,
        );
        tool(
          "fence-rider",
          `#!/bin/sh
[ -s "$TEST_STORED" ] && [ -n "$SECRETSPEC_REASON" ] || exit 99
printf '%s\\n' "$@" > "$TEST_UPLOADED"
exit "$TEST_UPLOAD_STATUS"
`,
        );
        const argumentsPath = join(directory, "arguments");
        const result = spawnSync("bash", ["scripts/set-shared-secret.sh"], {
          env: {
            ...process.env,
            PATH: `${directory}${delimiter}${process.env["PATH"] ?? ""}`,
            OPENSSL_BIN: openssl,
            FORGE_ENVIRONMENT: "staging",
            TEST_STORED: stored,
            TEST_UPLOADED: uploaded,
            TEST_ARGUMENTS: argumentsPath,
            TEST_PROVIDER_STATUS: providerStatus,
            TEST_UPLOAD_STATUS: uploadStatus,
          },
          encoding: "utf8",
          timeout: 10_000,
        });
        expect(result.status).toBe(expected);
        expect(result.stdout + result.stderr).not.toContain(secret);
        expect(readFileSync(argumentsPath, "utf8")).not.toContain(secret);
        if (providerStatus === "0") {
          expect(readFileSync(stored, "utf8")).toBe(secret);
          expect(readFileSync(uploaded, "utf8")).toBe(
            "variables\n--environment\nstaging\n",
          );
        } else {
          expect(existsSync(uploaded)).toBe(false);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it("generates exactly 32 random bytes with OpenSSL 3 and stores them encrypted without printing the secret", () => {
    expect(script).toContain("brew --prefix openssl@3");
    expect(script).toContain("env -u OPENSSL_CONF");
    expect(script).toContain("rand -base64 32");
    expect(script).toContain("^[A-Za-z0-9+/]{43}=$");
    expect(script).toContain("secretspec set SHARED_SECRET --from-file -");
    expect(script).toContain(
      'fence-rider variables --environment "$forge_environment"',
    );
    expect(script).not.toContain("forge variables set");
    expect(script).toContain("SHARED_SECRET");
    expect(script).not.toContain("printf '%s\\n' \"$secret\"");
  });
});
