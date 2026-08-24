-- 2026-08-24 — design_tokens shadow token_type correction
--
-- Context: QC of a bug report on design_tokens shadow-% rows. Verified against the live
-- schema (`SELECT sql FROM sqlite_master WHERE name='design_tokens'`) and live rows
-- (`SELECT slug, token_type, default_value FROM design_tokens WHERE slug LIKE 'shadow-%'`)
-- on 2026-08-24. The CHECK constraint is:
--   token_type TEXT NOT NULL CHECK(token_type IN ('colour', 'font', 'spacing', 'size', 'shadow'))
-- i.e. 'shadow' IS a valid token_type and has been since before this audit.
--
-- Root cause: two writers disagree.
--   - plugins/sgs-blocks/scripts/sgs-update-v2.py `_extract_shadow_tokens` (walks
--     sites/*/theme-snapshot.json) writes token_type='shadow' — correct, matches the
--     schema's intent. This is what inserted shadow-subtle/shadow-raised/shadow-floating
--     fresh (no prior row existed for those slugs).
--   - plugins/sgs-blocks/scripts/uimax-tools/enrich-db.py `target_27_design_tokens`
--     (scans theme/sgs-theme/theme.json directly) wrote token_type='size' for ALL shadow
--     presets, based on a comment claiming the CHECK constraint had no 'shadow' member —
--     that comment was factually wrong (fixed in the same commit as this file). This is
--     what inserted/holds shadow-sm, shadow-md, shadow-lg, shadow-glow as token_type='size'.
--     shadow-glow's value happens to match the current theme.json 'glow' preset exactly,
--     so when sgs-update-v2.py later tried to write shadow-glow with the same value, its
--     "exact match -> idempotent skip" path left the row's token_type untouched at 'size'.
--
-- The ONLY live reader (plugins/sgs-blocks/scripts/converter/resolvers/outer_box.py
-- `_shadow_token_snap`, now updated to query token_type='shadow') would silently see ZERO
-- rows for any shadow-% preset still typed 'size' — i.e. shadow-sm/md/lg/glow were
-- invisible to the cloning pipeline's box-shadow token-snap before this fix.
--
-- Orphan note: theme/sgs-theme/theme.json currently declares slugs subtle/raised/floating/glow
-- ONLY — there is no 'sm', 'md', or 'lg' shadow preset in the live theme.json. So
-- shadow-sm and shadow-lg (and shadow-md) are dead rows from an older naming scheme;
-- shadow-glow is NOT an orphan (it is a live, current theme.json preset), it was simply
-- mistyped. This statement corrects token_type for all four rows for consistency (a wrong
-- type is a defect regardless of whether the slug is currently referenced) but does NOT
-- delete the orphaned sm/md/lg rows — that's a separate decision for Bean, out of scope here.
--
-- Effect: standardises every shadow-% row on token_type='shadow', matching the CHECK
-- constraint and the corrected reader/writer code shipped alongside this file.

UPDATE design_tokens
SET token_type = 'shadow'
WHERE slug LIKE 'shadow-%'
  AND token_type = 'size';

-- Expected rows affected: 4 (shadow-sm, shadow-md, shadow-lg, shadow-glow).
-- Verify after running:
--   SELECT slug, token_type FROM design_tokens WHERE slug LIKE 'shadow-%' ORDER BY slug;
-- should show all 7 rows with token_type='shadow' and no remaining 'size' rows for shadow-%.
