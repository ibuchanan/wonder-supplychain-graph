/**
 * Which concern sent the administrator to the configuration page. The readiness
 * page has two dead ends, and each one has its own next step.
 */
export type ConfigurationConcern = "log-sink" | "site-relationship";

export interface ConfigurationLocation {
  readonly moduleKey: string;
  readonly path: string;
  readonly target: "module";
}

/**
 * Where the configuration page is, addressed the only way that survives a site
 * or environment change: by the module key the manifest declares. The concern
 * rides along as a query parameter because that is the only part of its
 * arriving location a native page can read.
 */
export function configurationLocation(
  concern: ConfigurationConcern,
): ConfigurationLocation {
  return {
    moduleKey: "scg-peer-invitations",
    path: `?setup=${concern}`,
    target: "module",
  };
}
