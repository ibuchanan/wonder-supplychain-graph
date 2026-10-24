/**
 * Forge handler wiring tests
 *
 * Validates that manifest-declared handlers resolve to real exported symbols in code.
 * This protects the contract between `manifest.yml` and the implementation files that
 * Forge loads at runtime.
 *
 * @see {@link https://developer.atlassian.com/platform/forge/manifest-reference/|Manifest reference}
 * @see {@link https://developer.atlassian.com/platform/forge/function-reference/|Function reference}
 */

import path from "node:path";
import { describe, expect, it } from "vitest";
import { findExportedNames, parseSourceFile } from "./ast-helpers";
import { getManifestHandlerReferences, loadManifest } from "./manifest-helpers";

function parseHandlerReference(handler: string): {
  filePath: string;
  exportName: string;
} {
  if (handler.includes("#")) {
    const parts = handler.split("#");
    const filePath = parts[0];
    const exportName = parts[1];
    if (!filePath || !exportName) {
      throw new Error(`Invalid handler reference: ${handler}`);
    }
    return { filePath, exportName };
  }

  const parts = handler.split(".");
  const modulePath = parts[0];
  const exportName = parts[1];
  if (!modulePath || !exportName) {
    throw new Error(`Invalid handler reference: ${handler}`);
  }
  return { filePath: `src/${modulePath}.ts`, exportName };
}

describe("Forge handler wiring", () => {
  it("should resolve all manifest handler references to real exported symbols", () => {
    const manifest = loadManifest();
    const refs = getManifestHandlerReferences(manifest);

    const violations: string[] = [];

    for (const ref of refs) {
      const { filePath, exportName } = parseHandlerReference(ref.handler);
      const absolutePath = path.join(process.cwd(), filePath);
      const sourceFile = parseSourceFile(absolutePath);
      const exportedNames = findExportedNames(sourceFile);

      if (!exportedNames.has(exportName)) {
        violations.push(
          `${ref.moduleType} '${ref.key}' references missing export '${exportName}' in ${filePath}`,
        );
      }
    }

    expect(
      violations,
      violations.length
        ? `Found manifest handler references that do not resolve to exported symbols:\n${violations.join("\n")}`
        : undefined,
    ).toEqual([]);
  });
});
