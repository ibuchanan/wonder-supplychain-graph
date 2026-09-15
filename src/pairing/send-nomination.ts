import { err, ok, type Result } from "@forge-ahead/errors";

import { signPeerRequest } from "../collaboration/peer-hmac-auth";
import type { NominationRequest } from "./site-relationship-nomination";

export interface NominationTransportDependencies {
  readonly fetch: (
    url: string,
    init: {
      readonly body: string;
      readonly headers: Readonly<Record<string, string>>;
      readonly method: "POST";
    },
  ) => Promise<{ readonly ok: boolean }>;
  readonly secret: string | undefined;
}

export type SendNominationError = {
  readonly code: "nomination-delivery-failed" | "nomination-signing-failed";
};

/**
 * Delivers one signed nomination to Green's bootstrap route. The signature
 * covers `<timestamp>.<body>`, matching the RFC-141 wire shape the receiver
 * verifies before parsing.
 */
export async function sendNomination(
  greenBootstrapUrl: string,
  request: NominationRequest,
  dependencies: NominationTransportDependencies,
): Promise<Result<{ readonly delivered: true }, SendNominationError>> {
  const body = JSON.stringify(request);
  const headers = signPeerRequest(dependencies.secret, body);
  if (!headers) {
    return err({ code: "nomination-signing-failed" });
  }

  try {
    const response = await dependencies.fetch(greenBootstrapUrl, {
      body,
      headers: { ...headers, "Content-Type": "application/json" },
      method: "POST",
    });

    return response.ok
      ? ok({ delivered: true })
      : err({ code: "nomination-delivery-failed" });
  } catch {
    return err({ code: "nomination-delivery-failed" });
  }
}
