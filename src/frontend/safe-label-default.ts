/**
 * A suggested UI safe label for a new invitation.
 *
 * The safe label is the only part of an invitation a peer administrator sees
 * before authorizing it, so it has to be recognizable without disclosing
 * anything. Naming it after a connection rather than after either site keeps
 * it safe by construction, and offering a default means an administrator who
 * leaves the field alone still gets one.
 */

const DESCRIPTIVE_ADJECTIVES: readonly string[] = [
  "brisk",
  "candid",
  "deft",
  "keen",
  "quiet",
  "steady",
  "swift",
  "tidy",
];

const CONNECTION_NOUNS: readonly string[] = [
  "bridge",
  "channel",
  "circuit",
  "conduit",
  "connection",
  "crossing",
  "link",
  "relay",
];

/**
 * Builds a `[descriptive adjective]-[connection noun]` label, for example
 * `swift-connection` or `steady-bridge`. The `choose` seam keeps the pattern
 * under test without reaching for a seeded random number generator.
 */
export function defaultSafeLabel(
  choose: (upperBound: number) => number = (upperBound) =>
    Math.floor(Math.random() * upperBound),
): string {
  const adjective =
    DESCRIPTIVE_ADJECTIVES[choose(DESCRIPTIVE_ADJECTIVES.length)];
  const noun = CONNECTION_NOUNS[choose(CONNECTION_NOUNS.length)];

  return `${adjective}-${noun}`;
}
