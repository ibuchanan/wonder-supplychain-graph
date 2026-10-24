#!/usr/bin/env bash
# Generates the development-only peer HMAC secret and stores it in Forge.

set -euo pipefail

forge_environment=${FORGE_ENVIRONMENT:-development}

if [[ -n ${OPENSSL_BIN:-} ]]; then
  openssl_bin=$OPENSSL_BIN
elif command -v brew >/dev/null 2>&1 && [[ -x "$(brew --prefix openssl@3)/bin/openssl" ]]; then
  openssl_bin="$(brew --prefix openssl@3)/bin/openssl"
elif command -v openssl >/dev/null 2>&1; then
  openssl_bin=$(command -v openssl)
else
  printf 'OpenSSL 3 is required; install openssl@3 with Homebrew or set OPENSSL_BIN.\n' >&2
  exit 1
fi

if ! env -u OPENSSL_CONF "$openssl_bin" version | grep -q '^OpenSSL 3\.'; then
  printf 'OpenSSL 3 is required; selected: %s\n' \
    "$(env -u OPENSSL_CONF "$openssl_bin" version)" >&2
  exit 1
fi

secret=$(env -u OPENSSL_CONF "$openssl_bin" rand -base64 32 | tr -d '\n')
if [[ ! $secret =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  printf 'OpenSSL did not generate a base64-encoded 32-byte secret.\n' >&2
  exit 1
fi

# Store in the configured provider first so future allowlist uploads use the
# same value. stdin keeps the generated secret out of command arguments.
printf '%s' "$secret" | secretspec set SHARED_SECRET --from-file - \
  --reason 'Generate development peer HMAC secret'
unset secret
SECRETSPEC_REASON='Upload generated development peer HMAC secret' \
  fence-rider variables --environment "$forge_environment"
printf 'Set encrypted SHARED_SECRET for Forge environment %s.\n' "$forge_environment"
