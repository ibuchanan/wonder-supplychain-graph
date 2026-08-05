export interface ActionExecutionMetadata {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly publishedAt: string;
}

export interface ActionExecutionMetadataDependencies {
  readonly now: () => Date;
  readonly randomUUID: () => string;
}

const runtimeDependencies: ActionExecutionMetadataDependencies = {
  now: () => new Date(),
  randomUUID: () => globalThis.crypto.randomUUID(),
};

/**
 * Creates server-controlled execution metadata. Rule authors configure domain
 * inputs only; correlation, deduplication, and publication time are not part
 * of the Automation action surface.
 */
export function createActionExecutionMetadata(
  sourceEpicId: string,
  dependencies: ActionExecutionMetadataDependencies = runtimeDependencies,
): ActionExecutionMetadata {
  const executionId = dependencies.randomUUID();

  return {
    correlationId: `scg:${executionId}`,
    idempotencyKey: `scg:${sourceEpicId}:${executionId}`,
    publishedAt: dependencies.now().toISOString(),
  };
}
