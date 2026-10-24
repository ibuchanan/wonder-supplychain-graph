#!/bin/sh
# Execute the value-free Fence Rider script for both configured demo sites.
set -eu

command=$1
shift

# Validate both selectors before allowing either installation to change.
for site in "${SCG_SOURCE_SITE-}" "${SCG_DESTINATION_SITE-}"; do
  case "$site" in
    ''|-*)
      printf 'SCG_SOURCE_SITE and SCG_DESTINATION_SITE must be non-empty site hostnames, not options.\n' >&2
      exit 1
      ;;
  esac
done

# FORGE_SITE is an adapter input, not a SecretSpec declaration: each generated
# script inherits this selector while resolving the rest of the active profile.
FORGE_SITE=$SCG_SOURCE_SITE sh -c "$command" sh "$@"
FORGE_SITE=$SCG_DESTINATION_SITE sh -c "$command" sh "$@"
