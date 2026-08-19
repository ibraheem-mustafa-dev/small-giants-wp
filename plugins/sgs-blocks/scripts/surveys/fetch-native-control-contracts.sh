#!/usr/bin/env bash
# Fetch the CANONICAL prop contract for each WordPress core control primitive
# straight from the Gutenberg source, so a golden describes the real component
# rather than our recollection of it.
#
# ⚠ VERSION CAVEAT, load-bearing. @wordpress/components is NOT an npm dependency
# of this plugin — WordPress provides it at runtime. So the governing version is
# whatever WP ships (7.0.2 on the canary), not anything in package.json. This
# script reads Gutenberg TRUNK. Required props and the __next* opt-ins are stable
# across recent versions, but any figure taken from here must be re-verified
# against the live editor before it gates anything.
#
# Usage: bash scripts/surveys/fetch-native-control-contracts.sh [outdir]
set -uo pipefail

OUT="${1:-.claude-native-contracts}"
mkdir -p "$OUT"

COMPONENTS="
select-control
toggle-group-control
toggle-control
text-control
textarea-control
range-control
number-control
unit-control
box-control
color-palette
color-picker
gradient-picker
focal-point-picker
date-time
form-token-field
combobox-control
border-box-control
font-size-picker
base-control
"

echo "component,status,bytes"
for c in $COMPONENTS; do
  path="packages/components/src/${c}/README.md"
  if gh api "repos/WordPress/gutenberg/contents/${path}" \
        --jq '.content' 2>/dev/null | base64 -d > "$OUT/${c}.md" 2>/dev/null \
     && [ -s "$OUT/${c}.md" ]; then
    echo "${c},ok,$(wc -c < "$OUT/${c}.md")"
  else
    rm -f "$OUT/${c}.md"
    # No README (toggle-group-control, border-box-control as of 2026-08 trunk) —
    # fall back to the component's own types.ts, the authoritative TS contract.
    tspath="packages/components/src/${c}/types.ts"
    if gh api "repos/WordPress/gutenberg/contents/${tspath}" \
          --jq '.content' 2>/dev/null | base64 -d > "$OUT/${c}.types.ts" 2>/dev/null \
       && [ -s "$OUT/${c}.types.ts" ]; then
      echo "${c},ok-types-ts-fallback,$(wc -c < "$OUT/${c}.types.ts")"
    else
      rm -f "$OUT/${c}.types.ts"
      echo "${c},MISSING,0"
    fi
  fi
done
