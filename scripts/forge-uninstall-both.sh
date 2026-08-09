#!/usr/bin/env bash
# Uninstalls the Forge app from both demo sites without treating an absent
# installation as an error. Other failures are reported after both sites run.

set -u

uninstall_site() {
  local label=$1
  local site=$2
  local output
  local status

  if output=$(forge uninstall --site "$site" --product "$FORGE_PRODUCT" --environment "$FORGE_ENVIRONMENT" 2>&1); then
    if [[ -n "$output" ]]; then
      printf '%s\n' "$output"
    fi
    return 0
  else
    status=$?
  fi

  if [[ "$output" == *"Could not find an installation for the provided Atlassian app"* ]]; then
    printf 'No Forge installation on %s site (%s); continuing.\n' "$label" "$site"
    return 0
  fi

  printf '%s\n' "$output" >&2
  return "$status"
}

source_status=0
uninstall_site source "$SCG_SOURCE_SITE" || source_status=$?

destination_status=0
uninstall_site destination "$SCG_DESTINATION_SITE" || destination_status=$?

if [[ "$source_status" -ne 0 || "$destination_status" -ne 0 ]]; then
  printf 'Forge uninstall failures: source=%s destination=%s\n' \
    "$source_status" "$destination_status" >&2
fi

if [[ "$source_status" -ne 0 ]]; then
  exit "$source_status"
fi

exit "$destination_status"
