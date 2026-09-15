/**
 * `@forge/bridge` refuses to load unless the Custom UI host bridge is present
 * on `globalThis`, and `@forge/react` requires it eagerly. Standing up a stub
 * bridge is what lets a test import UI Kit components at all; no test relies on
 * it answering calls, so it never returns anything useful.
 */
globalThis.__bridge = {
  callBridge: () =>
    Promise.reject(
      new Error("No Atlassian host is available in tests. Pass data as props."),
    ),
};
