#!/usr/bin/env bash
# Creates or retrieves the development webtrigger URLs and prints the local
# SecretSpec assignments as a ready-to-paste dotenv block.

set -euo pipefail

require_value() {
  local name=$1

  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required configuration: %s\n' "$name" >&2
    exit 1
  fi
}

webtrigger_url() {
  local function_key=$1
  local site=$2
  local output
  local url

  if ! output=$(forge webtrigger create \
    --functionKey "$function_key" \
    --site "$site" \
    --product "$FORGE_PRODUCT" \
    --environment "$FORGE_ENVIRONMENT" 2>&1); then
    printf 'Unable to create or retrieve webtrigger %s for %s.\n' \
      "$function_key" "$site" >&2
    printf '%s\n' "$output" >&2
    exit 1
  fi

  url=$(printf '%s\n' "$output" | grep -Eo 'https://[^[:space:]<>()]+' | tail -n 1)
  if [[ -z "$url" ]]; then
    printf 'Forge did not return a webtrigger URL for %s on %s.\n' \
      "$function_key" "$site" >&2
    printf '%s\n' "$output" >&2
    exit 1
  fi

  printf '%s' "$url"
}

require_value FORGE_PRODUCT
require_value FORGE_ENVIRONMENT
require_value SCG_SOURCE_SITE
require_value SCG_DESTINATION_SITE

destination_seed_url=$(webtrigger_url scg-seed-destination "$SCG_DESTINATION_SITE")
destination_delivery_url=$(webtrigger_url scg-receive-starter "$SCG_DESTINATION_SITE")
destination_event_url=$(webtrigger_url scg-receive-lean-event "$SCG_DESTINATION_SITE")
source_seed_url=$(webtrigger_url scg-seed-source "$SCG_SOURCE_SITE")
source_publication_url=$(webtrigger_url scg-publish-starter "$SCG_SOURCE_SITE")

cat <<EOF
# Paste these existing SecretSpec assignments into your local .env.
# Webtrigger URLs are development capabilities: do not commit or share them.
SCG_DESTINATION_SEED_URL=$destination_seed_url
SCG_DESTINATION_DELIVERY_URL=$destination_delivery_url
SCG_DESTINATION_EVENT_URL=$destination_event_url
SCG_SOURCE_SEED_URL=$source_seed_url
SCG_SOURCE_PUBLICATION_URL=$source_publication_url
EOF
