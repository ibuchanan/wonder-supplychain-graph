import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scripts: Record<string, string> = JSON.parse(
  readFileSync("package.json", "utf8"),
).scripts;
const directories: string[] = [];
const syntheticSecret = "synthetic-runtime-value";

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(overrides: Record<string, string> = {}) {
  const directory = mkdtempSync(join(process.cwd(), "tmp_rovo_fence-"));
  directories.push(directory);
  const callsPath = join(directory, "calls.jsonl");
  const values = {
    FORGE_ENVIRONMENT: "staging",
    FORGE_PRODUCT: "jira",
    SCG_SOURCE_SITE: "source.example.atlassian.net",
    SCG_DESTINATION_SITE: "destination.example.atlassian.net",
    SHARED_SECRET: syntheticSecret,
    ...overrides,
  };
  const valuesPath = join(directory, "values.json");
  writeFileSync(valuesPath, JSON.stringify(values));
  const executable = (name: string, contents: string) => {
    const path = join(directory, name);
    writeFileSync(path, contents);
    chmodSync(path, 0o755);
  };
  executable(
    "fence-rider",
    '#!/bin/sh\nif [ -n "$TEST_GENERATION_FAILURE" ]; then exit 23; fi\nexec bun "$FENCE_RIDER_ENTRY" "$@"\n',
  );
  // No real provider or Forge executable can be reached by these fake tools.
  executable(
    "secretspec",
    `#!/usr/bin/env bun
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
if (!process.env.SECRETSPEC_REASON) process.exit(98);
const values = JSON.parse(readFileSync(process.env.TEST_VALUES, "utf8"));
if (args[0] === "run") {
  const child = Bun.spawnSync(args.slice(args.indexOf("--") + 1), {
    env: { ...process.env, ...values }, stdin: "inherit", stdout: "inherit", stderr: "inherit",
  });
  process.exit(child.exitCode);
}
if (args[0] === "schema") {
  console.log(JSON.stringify({ type: "object", properties: Object.fromEntries(Object.keys(values).map(key => [key, { type: "string" }])), required: Object.keys(values) }));
} else if (args[0] === "export") {
  console.log(JSON.stringify(values));
} else if (args[0] === "check") {
  const scope = args[args.indexOf("--scope") + 1];
  console.log(JSON.stringify({ secrets: scope === "runtime" ? [{ name: "SHARED_SECRET" }] : [] }));
} else {
  process.exit(99);
}
`,
  );
  executable(
    "forge",
    `#!/usr/bin/env bun
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.TEST_CALLS, JSON.stringify(args) + "\\n");
if (process.env.TEST_FAIL_SOURCE && args.includes("source.example.atlassian.net")) {
  if (process.env.TEST_ABSENT_SOURCE) console.error("Could not find an installation for the provided Atlassian app");
  process.exit(7);
}
`,
  );
  const env = {
    ...process.env,
    PATH: `${directory}${delimiter}${process.env["PATH"] ?? ""}`,
    FENCE_RIDER_ENTRY: resolve("node_modules/fence-rider/src/index.ts"),
    TEST_VALUES: valuesPath,
    TEST_CALLS: callsPath,
  };
  return {
    run(
      name: string,
      args: string[] = [],
      extraEnv: Record<string, string> = {},
    ) {
      const script = scripts[name];
      if (!script) throw new Error(`Unknown test script: ${name}`);
      return spawnSync("sh", ["-c", `${script} "$@"`, "sh", ...args], {
        cwd: process.cwd(),
        env: { ...env, ...extraEnv },
        encoding: "utf8",
        timeout: 20_000,
      });
    },
    calls(): string[][] {
      return existsSync(callsPath)
        ? readFileSync(callsPath, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [];
    },
  };
}

describe("Fence Rider package workflows", () => {
  it.each(["forge:install", "forge:upgrade"])(
    "%s targets both sites and preserves policy and argument boundaries",
    (name) => {
      const test = fixture();
      const result = test.run(name, [
        "--license",
        "test license; not shell code",
      ]);
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(test.calls()).toEqual(
        ["source", "destination"].map((site) => [
          "install",
          "--environment",
          "staging",
          "--site",
          `${site}.example.atlassian.net`,
          "--product",
          "jira",
          ...(name === "forge:upgrade" ? ["--upgrade"] : []),
          "--non-interactive",
          "--license",
          "test license; not shell code",
        ]),
      );
    },
  );

  it.each(["", "--wrong-option"])(
    "rejects invalid destination %j before either install",
    (site) => {
      const test = fixture({ SCG_DESTINATION_SITE: site });
      expect(test.run("forge:install").status).not.toBe(0);
      expect(test.calls()).toEqual([]);
    },
  );

  it("stops before the destination when source installation fails", () => {
    const test = fixture();
    expect(
      test.run("forge:install", [], { TEST_FAIL_SOURCE: "1" }).status,
    ).toBe(7);
    expect(test.calls()).toHaveLength(1);
  });

  it.each(["forge:deploy", "forge:install", "forge:upgrade", "lint:forge"])(
    "%s propagates generation refusal without executing Forge",
    (name) => {
      const test = fixture();
      expect(test.run(name, [], { TEST_GENERATION_FAILURE: "1" }).status).toBe(
        23,
      );
      expect(test.calls()).toEqual([]);
    },
  );

  it.each(["forge:deploy", "lint:forge"])(
    "%s executes the generated workflow",
    (name) => {
      const test = fixture();
      expect(test.run(name, ["--verbose"]).status).toBe(0);
      expect(test.calls()).toEqual([
        name === "forge:deploy"
          ? ["deploy", "--environment", "staging", "--verbose"]
          : ["lint", "--verbose"],
      ]);
    },
  );

  it.each([
    "forge:variables:set",
    "forge:variables:set-encrypted",
    "forge:variables:set:secretspec",
  ])(
    "%s uploads only the runtime allowlist, encrypted and without printing values",
    (name) => {
      const test = fixture();
      const result = test.run(name, ["--environment", "development"]);
      expect(result.status).toBe(0);
      expect(test.calls()).toEqual([
        [
          "variables",
          "set",
          "--encrypt",
          "--environment",
          "development",
          "SHARED_SECRET",
          syntheticSecret,
        ],
      ]);
      expect(result.stdout + result.stderr).not.toContain(syntheticSecret);
    },
  );

  it("rejects the old arbitrary KEY VALUE upload interface", () => {
    const test = fixture();
    expect(
      test.run("forge:variables:set", ["LOCAL_CONTROL", "must-not-upload"])
        .status,
    ).not.toBe(0);
    expect(test.calls()).toEqual([]);
  });

  it.each([false, true])(
    "uninstall attempts both sites and handles absent source=%s",
    (absent) => {
      const test = fixture();
      const result = test.run("forge:uninstall", [], {
        TEST_FAIL_SOURCE: "1",
        ...(absent ? { TEST_ABSENT_SOURCE: "1" } : {}),
      });
      expect(result.status).toBe(absent ? 0 : 7);
      expect(test.calls()).toHaveLength(2);
      expect(
        test.calls().map((args) => args[args.indexOf("--site") + 1]),
      ).toEqual([
        "source.example.atlassian.net",
        "destination.example.atlassian.net",
      ]);
    },
  );

  it("declares only SHARED_SECRET in the real runtime scope", () => {
    const configuration = readFileSync("secretspec.toml", "utf8");
    expect(configuration).toMatch(
      /\[scopes\.runtime\]\s+secrets = \["SHARED_SECRET"\]/,
    );
    expect(configuration).not.toMatch(/^FORGE_SITE\s*=/m);
  });
});
