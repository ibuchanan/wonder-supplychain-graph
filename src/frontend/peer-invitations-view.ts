/**
 * Which of the configuration page's two audiences is looking at it.
 *
 * A native page cannot read `window.location`, so the host page URL arrives
 * from product context. This keeps that URL's interpretation out of the
 * rendering code and under test.
 */
export type InvitationView =
  | { readonly kind: "configuration" }
  | { readonly kind: "recipient"; readonly reference: string };

export function chooseInvitationView(
  location: string | undefined,
): InvitationView {
  // Product context resolves asynchronously, so an absent or unreadable URL is
  // ordinary rather than exceptional. It cannot name a recipient, so the
  // administrator's own page is the only safe reading of it.
  try {
    const reference = new URL(location ?? "").searchParams.get("invitation");

    return reference
      ? { kind: "recipient", reference }
      : { kind: "configuration" };
  } catch {
    return { kind: "configuration" };
  }
}
