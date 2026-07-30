#!/usr/bin/env bash
# Publishes secretspec-managed vars to the configured Forge environment.

keys=$(sed -nE 's/^([A-Z_][A-Z0-9_]*)[[:space:]]*=.*/\1/p' secretspec.toml)

secretspec run -- bash -c '
for key; do
  case "$key" in
  FORGE*)
    # Skip vars that configure Forge commands.
    :
    ;;
  *SECRET*)
    # Encrypt vars that contain SECRET.
    echo npm -s run forge:variables:set-encrypted -- "$key" "****"
    npm -s run forge:variables:set-encrypted -- "$key" "${!key}"
    ;;
  *)
    echo npm -s run forge:variables:set -- "$key" "${!key}"
    npm run -s forge:variables:set -- "$key" "${!key}"
    ;;
  esac
done
' _ $keys
