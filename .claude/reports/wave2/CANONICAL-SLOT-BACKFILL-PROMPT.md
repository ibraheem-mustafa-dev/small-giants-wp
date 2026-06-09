# Fresh-session cold prompt — canonical_slot backfill (clone-fix Commit 0a prerequisite)

Paste below the line into a fresh session (Sonnet is fine — this is focused, DB + small-design). Self-contained. This is **Stage-0 Commit 0a** of the clone-fix build (`.claude/reports/wave2/STAGE1-DESIGN.md`) — it unblocks the cross-node CSS routing (Commit 2). Low-risk (data + a small slot-vocabulary decision), no converter behaviour change.

---

**Invoke `/autopilot` first.**

## What this is (plain English)
The cloning converter decides "where does this drafted element's CSS go?" by reading a column called **`canonical_slot`** on the `block_attributes` table — it maps each block attribute to the semantic **slot** it owns (heading / text / media / etc.). The converter's upcoming **cross-node routing** (Commit 2) needs to send a wrapper's box-CSS to the parent block's per-slot box attributes — e.g. `.sgs-hero__content`'s padding → hero's `contentPadding*`; `.sgs-trust-bar__inner`'s `max-width` → the container's `contentWidth`. But **~41 of those per-slot box attributes have `canonical_slot = NULL`** (untagged), so the dispatch can't find them. Your job: tag them — correctly + consistently with how the converter resolves the matching DOM element.

## The exact rows to fix (verified 2026-06-09)
- **`contentWidth`** — NULL on **28 blocks** (accordion, accordion-item, card-grid, container, content-collection, cta-section, feature-grid, form, form-field-tiles, form-step, gallery, google-reviews, hero, … — query for the full list).
- **`contentPadding*`** (Top/Right/Bottom/Left + Tablet/Mobile variants) — NULL on `sgs/hero` (~15 rows).
- **`mediaPadding*`** is ALREADY tagged `media` (`sgs/hero`) — **this is the working pattern to mirror**: `__media` resolves to the `media` slot, so `mediaPadding*` is tagged `media`, and the dispatch round-trips. Do the same for the content rows.
Total ~41 rows. Confirm the live count: `SELECT count(*) FROM block_attributes WHERE canonical_slot IS NULL AND (attr_name LIKE 'contentPadding%' OR attr_name LIKE 'contentWidth%')`.

## The decision you MUST make first (don't blind-fill) — the slot vocabulary
There is currently **NO `content` slot** in the `slots` table (run `SELECT slot_name, scope, aliases FROM slots WHERE scope='element'` — you'll see label/text/media/inner/badge/items/icon/price/number, but no `content`). So before tagging, decide + implement the slot the content-box attrs map to, AND make the DOM-element side resolve to the SAME slot (or the round-trip fails):
1. **What does `.sgs-X__content` resolve to today?** Check `db.resolve_slug_from_bem` / the `slots` aliases for `content`. What does `.sgs-X__inner` resolve to? (`inner` exists, `standalone_block=None` — the fold wrapper.)
2. **Decide the canonical slot name(s)** for: (a) the content-cap (`contentWidth`, from `__inner`'s `max-width`); (b) the content-column padding (`contentPadding*`, from `__content`). Options: add a `content` element-slot (scope='element', `standalone_block=None`, aliases like `["content","copy","content-wrap","inner-content"]`) and tag `contentPadding*` + `contentWidth` → `content`; OR map them to `inner` if `__content`/`__inner` both resolve there. **Pick the scheme where the BEM element the draft uses resolves (via the `slots` table) to the SAME `canonical_slot` you tag the attr with** — that's the whole correctness condition (mirror how `__media`→`media`→`mediaPadding*` already round-trips).
3. This is small but it's a **schema-vocabulary decision** — if you add a `slots` row, do it via the seed mechanism (`seed-slot-synonyms.py` pattern — writes BOTH DBs), NOT a direct one-off (memory `feedback_db_rows_via_sgs_update_not_direct_seed`).

## How to write it (R-22-1, DB-first, both DBs)
- `/sgs-update` does **NOT** write `canonical_slot` (its Stage 5 only auto-fills missing `standalone_block`). Build/extend a **`scripts/seed-canonical-slots.py`** that writes the values to **BOTH** the uimax DB and `sgs-framework.db` (the `seed-slot-synonyms.py` pattern), then verify each row independently in both DBs.
- Tag the ~41 content rows; leave the already-correct `mediaPadding*='media'` alone.

## Verification (the gate)
1. `SELECT count(*) FROM block_attributes WHERE canonical_slot IS NULL AND (attr_name LIKE 'contentPadding%' OR attr_name LIKE 'contentWidth%')` → **0** in BOTH DBs.
2. **Round-trip check (the real test):** confirm the converter's element-resolution maps `.sgs-hero__content` → the slot you tagged `contentPadding*` with, and `.sgs-trust-bar__inner` → the slot you tagged `contentWidth` with — i.e. `db.canonical_slot_for('content')` (or your chosen alias) returns the same value as the attr's `canonical_slot`. If they don't match, the cross-node dispatch (Commit 2) will still find nothing — the fill is useless. Prove the match.
3. `/verify-loop` the round-trip claim with 2 evidence sources (the attr's stored `canonical_slot` + the element-resolution result).

## Tooling
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` (DB query/verify) + `block sgs/hero` / `sgs/container`.
- `python ~/.claude/hooks/wp-blocks.py dump` (schema cross-check).
- `/sgs-wp-engine` (framework DB context); `/sgs-update` (re-register after, to confirm the seed survives — assign-canonical only touches NULL rows, so your values persist).
- `/verify-loop` (the round-trip attestation).

## Constraints
- DB-only + a possible `slots` row + the seed script. **No converter logic, no block code.** (The cross-node routing that USES these tags is Commit 2 — a separate gated build; do not build it here.)
- Path-scoped commit on shared `main` (`git commit -- <paths>`); no `Co-Authored-By`; UK English.
- This is the cloning thread's Stage-0 prerequisite — it does not touch the sgs-theme thread or the Spec27-28 wave plan.

## Done-when
All ~41 content-box `canonical_slot` rows tagged consistently in BOTH DBs; the chosen slot vocabulary added to `slots` if needed (via seed); the round-trip proven (element resolves to the same slot the attr is tagged with); `/sgs-update` re-run confirms the values survive; the seed script committed; `/handoff`. Report: the slot-vocabulary decision made (+ why), the row count fixed, and the round-trip evidence. Update `.claude/reports/wave2/SIGN-OFF-LEDGER.md` Commit-0a prerequisite → DONE.
