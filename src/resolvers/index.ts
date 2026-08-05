import Resolver from "@forge/resolver";

/**
 * Read-only resolver for Automation Action configuration resources. Keeping it
 * separate from action handlers ensures config surfaces never acquire write
 * capabilities merely to render a form.
 */
const resolver = new Resolver();

resolver.define("getActionConfigStatus", () => ({ ready: true }));

export const handler = resolver.getDefinitions();
