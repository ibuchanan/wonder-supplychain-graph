import { err, ok, type Result } from "@forge-ahead/errors";

import { signPeerRequest } from "../collaboration/peer-hmac-auth";
import {
  type ActivationPollResponse,
  parseActivationPollResponse,
} from "./parse-activation-envelopes";
import type {
  ActivationPollRequest,
  ConfirmationReceipt,
  ConfirmationRequest,
} from "./site-relationship-activation";

export interface ActivationTransportDependencies {
  readonly fetch: (
    url: string,
    init: {
      readonly body: string;
      readonly headers: Readonly<Record<string, string>>;
      readonly method: "POST";
    },
  ) => Promise<{ readonly ok: boolean; readonly text: () => Promise<string> }>;
  readonly secret: string | undefined;
}

export type PollActivationError = {
  readonly code:
    | "activation-poll-failed"
    | "activation-signing-failed"
    | "invalid-activation-proposal";
};

export type SendConfirmationError = {
  readonly code:
    | "confirmation-delivery-failed"
    | "confirmation-signing-failed"
    | "invalid-confirmation-receipt";
};

type SignedPost =
  | { readonly kind: "answered"; readonly body: string }
  | { readonly kind: "failed" }
  | { readonly kind: "unsigned" };

/** One signed POST to the peer's bootstrap route. Never throws. */
async function postSigned(
  url: string,
  body: string,
  dependencies: ActivationTransportDependencies,
): Promise<SignedPost> {
  const headers = signPeerRequest(dependencies.secret, body);
  if (!headers) {
    return { kind: "unsigned" };
  }

  try {
    const response = await dependencies.fetch(url, {
      body,
      headers: { ...headers, "Content-Type": "application/json" },
      method: "POST",
    });

    return response.ok
      ? { body: await response.text(), kind: "answered" }
      : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

/**
 * Asks Green once whether the nomination is approved. This is one bounded
 * request: nothing here keeps a browser session or a long-running request
 * open, and Green's answer is parsed before Blue believes any of it.
 */
export async function pollGreenForActivation(
  greenBootstrapUrl: string,
  request: ActivationPollRequest,
  dependencies: ActivationTransportDependencies,
): Promise<Result<ActivationPollResponse, PollActivationError>> {
  const posted = await postSigned(
    greenBootstrapUrl,
    JSON.stringify(request),
    dependencies,
  );
  if (posted.kind === "unsigned") {
    return err({ code: "activation-signing-failed" });
  }
  if (posted.kind === "failed") {
    return err({ code: "activation-poll-failed" });
  }

  const parsed = parseActivationPollResponse(posted.body);
  return parsed ? ok(parsed) : err({ code: "invalid-activation-proposal" });
}

function readReceipt(body: string): ConfirmationReceipt | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (typeof value !== "object" || value === null) {
      return undefined;
    }

    const { correlationId, outcome, relationshipId } = value as {
      correlationId?: unknown;
      outcome?: unknown;
      relationshipId?: unknown;
    };

    return outcome === "active" &&
      typeof correlationId === "string" &&
      correlationId.trim() &&
      typeof relationshipId === "string" &&
      relationshipId.trim()
      ? { correlationId, outcome, relationshipId }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Delivers one signed confirmation to Green's bootstrap route and returns the
 * activation receipt. Blue activates locally only on this authenticated
 * success, never on its own acceptance.
 */
export async function sendConfirmation(
  greenBootstrapUrl: string,
  request: ConfirmationRequest,
  dependencies: ActivationTransportDependencies,
): Promise<Result<ConfirmationReceipt, SendConfirmationError>> {
  const posted = await postSigned(
    greenBootstrapUrl,
    JSON.stringify(request),
    dependencies,
  );
  if (posted.kind === "unsigned") {
    return err({ code: "confirmation-signing-failed" });
  }
  if (posted.kind === "failed") {
    return err({ code: "confirmation-delivery-failed" });
  }

  const receipt = readReceipt(posted.body);
  return receipt ? ok(receipt) : err({ code: "invalid-confirmation-receipt" });
}
