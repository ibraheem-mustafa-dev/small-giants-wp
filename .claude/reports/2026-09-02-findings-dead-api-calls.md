# Detector findings — dead-api-calls — ✅ RESOLVED 2026-09-02

**Script:** `check-dead-api-calls.py` (`plugins/sgs-blocks/scripts/check-dead-api-calls.py`)
**Status:** **Closed.** Fixed in commit `06497afac`. Kept as the record of what was done and why.

## What it was

253 baselined findings across 96 unique function names. Every one was a **real** WordPress core
or WooCommerce function that had simply never been promoted into the hand-curated allowlist —
zero hallucinated calls. It was an allowlist-maintenance backlog masquerading as a bug backlog.

The checker exists because a subagent once invented `wc_get_price_html()` (a function that does
not exist) and it shipped clean through every other gate.

## What was done

- All 96 names promoted into `wp-wc-function-allowlist.json` — **321 → 417 entries**.
- Baseline regenerated: **305 → 0 entries** (`{"hash": "e3b0c44…b855", "keys": []}`, where that
  hash is the SHA-256 of the empty string — the correct value for an empty key list).
- `--check` now returns **0 findings**.
- `--self-test` still passes 5/5, including the one that matters: it still catches the original
  `wc_get_price_html()` incident call. The gate kept its teeth.

One entry worth remembering: `wp_get_connector` / `wp_get_connectors` /
`wp_is_connector_registered` looked hallucination-shaped on first read but are genuine WP 7.0
Connectors API calls, `function_exists()`-guarded in `includes/class-sgs-ai-connector.php` and
cited there with `developer.wordpress.org` links.

## Follow-up — ✅ RESOLVED 2026-09-02

Promoted to a hard gate the same day. `scripts/gates.json`'s `check-dead-api-calls` entry moved
from `tier: "full"` (pre-deploy only) to `tier: "fast"` (every `prebuild`) — it was already
hard-blocking on `npm start` via `prestart`'s direct `&&` chain, so this closes the one remaining
gap (a plain `npm run build` with no `start`/deploy could still ship a hallucinated call). The
script's own docstring, which had stated "NOT wired into prebuild/prestart" since the day it was
built, was corrected to match. Verified: `npm run gate:fast` (all 85 fast-tier gates) passes clean
with the promoted gate included; `--self-test` still 5/5.

- [x] Promote `check-dead-api-calls` to a hard gate
