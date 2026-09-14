import { createHmac, timingSafeEqual } from "node:crypto";

const signatureHeaderName = "x-webtrigger-signature";
const timestampHeaderName = "x-webtrigger-timestamp";
const signaturePrefix = "sha256=";
const maxAgeMilliseconds = 5 * 60 * 1000;
const maxFutureSkewMilliseconds = 30 * 1000;

export interface HmacHeaders {
  readonly "x-webtrigger-signature": string;
  readonly "x-webtrigger-timestamp": string;
}

export type HmacVerificationError =
  | "invalid-hmac-secret"
  | "invalid-hmac-signature"
  | "invalid-hmac-timestamp";

function decodeSecret(secret: string | undefined): Buffer | undefined {
  if (!secret || !/^[A-Za-z0-9+/]+={0,2}$/.test(secret)) {
    return undefined;
  }

  const decoded = Buffer.from(secret, "base64");
  return decoded.length >= 32 && decoded.length <= 64 ? decoded : undefined;
}

function signatureInput(timestamp: string, body: string): string {
  return `${timestamp}.${body}`;
}

function readSingleHeader(
  headers: Readonly<Record<string, readonly string[]>> | undefined,
  name: string,
): string | undefined {
  const values = Object.entries(headers ?? {}).find(
    ([headerName]) => headerName.toLowerCase() === name,
  )?.[1];
  return values?.length === 1 ? values[0] : undefined;
}

function signature(secret: Buffer, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(signatureInput(timestamp, body))
    .digest("hex");
}

export function signPeerRequest(
  secret: string | undefined,
  body: string,
  timestamp = new Date().toISOString(),
): HmacHeaders | undefined {
  const key = decodeSecret(secret);
  if (!key) {
    return undefined;
  }

  return {
    [signatureHeaderName]: `${signaturePrefix}${signature(key, timestamp, body)}`,
    [timestampHeaderName]: timestamp,
  };
}

export function verifyPeerRequest(
  request: {
    readonly body?: string;
    readonly headers?: Readonly<Record<string, readonly string[]>>;
  },
  secret: string | undefined,
  now = Date.now(),
): HmacVerificationError | undefined {
  const key = decodeSecret(secret);
  if (!key) {
    return "invalid-hmac-secret";
  }

  const timestamp = readSingleHeader(request.headers, timestampHeaderName);
  const supplied = readSingleHeader(request.headers, signatureHeaderName);
  const timestampMilliseconds = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (
    !timestamp ||
    Number.isNaN(timestampMilliseconds) ||
    timestampMilliseconds < now - maxAgeMilliseconds ||
    timestampMilliseconds > now + maxFutureSkewMilliseconds
  ) {
    return "invalid-hmac-timestamp";
  }

  if (!supplied?.startsWith(signaturePrefix)) {
    return "invalid-hmac-signature";
  }

  const expected = Buffer.from(
    signature(key, timestamp, request.body ?? ""),
    "hex",
  );
  const received = Buffer.from(supplied.slice(signaturePrefix.length), "hex");
  return expected.length === received.length &&
    timingSafeEqual(expected, received)
    ? undefined
    : "invalid-hmac-signature";
}
