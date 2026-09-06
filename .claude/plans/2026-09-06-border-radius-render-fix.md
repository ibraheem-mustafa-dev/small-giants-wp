---
doc_type: plan
title: Border-radius stale-flat-attr fix (tier-object migration, Priority 5)
date: 2026-09-06
status: ready for execution
---

# Border-radius stale-flat-attr fix

## Context

Same bug shape as tonight's already-shipped padding/margin fix (D976/D977): a handful of
blocks had their root `borderRadius` attribute migrated to the tier-object shape
(`{desktop,tablet,mobile}`, each tier a `{topLeft,topRight,bottomLeft,bottomRight}` corner
object) in `block.json`, but their `render.php` was never updated and still reads the
pre-migration flat siblings `borderRadiusTablet`/`borderRadiusMobile` directly. Since those
two attribute names are no longer declared, the reads are dead: tablet/mobile border-radius
overrides are silently dropped on affected blocks.

**Ground truth verified this session (do not re-derive from memory):**

```
python3 -c "
import json
for b in ('accordion','container','product-card','icon-list','whatsapp-cta'):
    d = json.load(open(f'src/blocks/{b}/block.json', encoding='utf-8'))
    print(b, d.get('attributes',{}).get('borderRadius'))
"
```
returned tier-object shape (`{'type':'object','default':{'desktop':{}}}`) for **accordion,
container, product-card, icon-list** — confirming the bug is real and in-scope for these 4.
**whatsapp-cta returned `None`** — it declares no `borderRadius` attribute at all, only
`borderRadiusTablet`/`borderRadiusMobile` as genuinely-standalone attributes with no tier-object
counterpart. That is a DIFFERENT, unrelated situation (border-radius was never migrated there at
all) — **whatsapp-cta is explicitly OUT OF SCOPE for this plan.**

**Also verified and explicitly OUT OF SCOPE:** the shared media-atom system
(`includes/media/atoms/box-shape.php` + `src/components/media/atoms/box-shape.control.js`,
serving `container`/`cta-section`/`gallery`/`hero`/`media`/`physics-canvas`/`site-footer`/
`site-header`/`text`/`trust-bar`) and `mediaPadding`
(`includes/media/atoms/media-padding.php` + `.js`, serving `hero`/`media`). Checked directly:
`hero`'s `splitMediaBorderRadius`/`splitMediaPadding` are `{'type':'object','default':{}}` (no
`desktop` key) with genuinely-declared `...Tablet`/`...Mobile` sibling attrs still present —
these were **never migrated to the tier-object shape at all**, so there is no stale reader to
fix. This corrects an earlier same-session claim ("already tier-object, don't re-migrate") that
was wrong — verified false by reading the actual schema. Folding these into tier-object is a
separate, larger migration (Step 3 of THE-MIGRATION-METHOD.md — settle the shape first) and is
tracked as follow-up work, not part of this plan.

## Global Constraints

- Fix ONLY `accordion`, `container`, `product-card`, `icon-list` render.php files. Do not touch
  `whatsapp-cta` or any media-atom file — those are out of scope per the Context section above.
- The safe pattern is proven: read `$attributes['borderRadius'] ?? null` through
  `sgs_responsive_normalise_object()` (already used safely elsewhere in every touched file's
  surrounding codebase; confirmed no load-order risk since `helpers-responsive.php`/
  `render-helpers.php` is always required near the top of each render.php, well before any
  border-radius code runs) — NEVER write the tier results back into `$attributes[...]` (this
  exact mistake was made and reverted twice earlier tonight on the padding/margin fix; see
  D976's commit history for why it fails two different gates).
- `sgs_responsive_normalise_object()` is `is_box`-shaped for a 4-side box (top/right/bottom/left)
  — border-radius corners are a DIFFERENT shape (`topLeft/topRight/bottomLeft/bottomRight`).
  Call it WITHOUT the `is_box` flag (`sgs_responsive_normalise_object($raw)`, default
  `is_box=false`) since a corner object is not a box side object; verify this is correct by
  reading `helpers-responsive.php`'s docblock again before assuming — do not copy the padding/
  margin call signature verbatim without checking this.
- Do not touch `sgs_border_radius_tiers()` in `helpers-box.php` — it is a DIFFERENT, already-safe
  helper used by OTHER blocks (verified this session via `render_block()` live behaviour); this
  plan's 4 blocks do not call it and should not be changed to call it (that would be a second,
  larger refactor outside this plan's scope — stick to the same normalise-and-substitute pattern
  already proven for padding/margin).
- Extend `plugins/sgs-blocks/scripts/check-render-tier-object-spacing.py` (the D976/D977 guard)
  to ALSO check for the border-radius dead-flat-attr pattern
  (`borderRadiusTablet`/`borderRadiusMobile`) alongside the existing padding/margin checks — do
  not write a second, separate detector script (Step 1 of THE-MIGRATION-METHOD.md: a tool for
  this subject already exists, extend it).
- SGS-BEM: this task touches no CSS class names, so the naming-convention gate is N/A.
- Every commit: `git branch --show-current` immediately before committing, path-scoped `git add`
  (never `-A`), and `[gates-ok:<reason>]` on any pre-commit bypass, only for a verified
  pre-existing/unrelated finding (never fabricated).

## Task 1 — Fix the 4 blocks + extend the guard gate

**Files:**
- `plugins/sgs-blocks/src/blocks/accordion/render.php`
- `plugins/sgs-blocks/src/blocks/container/render.php`
- `plugins/sgs-blocks/src/blocks/product-card/render.php`
- `plugins/sgs-blocks/src/blocks/icon-list/render.php`
- `plugins/sgs-blocks/scripts/check-render-tier-object-spacing.py`

**Do:**

1. For each of the 4 render.php files, locate the border-radius base-extraction code (reads
   `$attributes['borderRadius']` as a plain string or flat corner object — grep
   `isset( $attributes['borderRadius'] )` in each file to find it) and the tablet/mobile
   extraction (`$attributes['borderRadiusTablet']`/`['borderRadiusMobile']` — already located
   this session, one hit each, plus a downstream `sgs_corner_object_shorthand()` consumer call).
2. Insert (or reuse an existing nearby call if `sgs_responsive_normalise_object` is already
   called for a different attribute in the same file — check first) one normalise call:
   `$sgs_radius_tiers = sgs_responsive_normalise_object( $attributes['borderRadius'] ?? null );`
   placed after the file's existing `require_once .../render-helpers.php` (or
   `helpers-responsive.php`) line — verify by line number, the same way D976's fix did, do not
   assume.
3. Redirect the base extraction to read `$sgs_radius_tiers['desktop']` instead of
   `$attributes['borderRadius']` directly (preserving the existing string-vs-corner-object
   branching logic already in each file — only the SOURCE changes, not the branching).
4. Redirect `$border_radius_tablet_obj`/`$border_radius_mobile_obj` (or each file's equivalent
   variable name — they differ slightly per file, e.g. `$sgs_container_radius_tablet_obj` in
   container, `$sgs_pc_radius_tablet_obj` in product-card) to read
   `$sgs_radius_tiers['tablet']`/`['mobile']` instead of the dead flat attrs — do NOT write back
   into `$attributes['borderRadiusTablet']` (see Global Constraints).
5. `php -l` every touched file.
6. Extend `check-render-tier-object-spacing.py`: add `borderRadiusTablet`/`borderRadiusMobile`
   to the dead-flat-attr name list it already checks (currently
   `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`) — the existing per-block
   declared-attrs cross-check (via each block's own `block.json`) already correctly exempts
   `whatsapp-cta` (which genuinely still declares these two names) without any special-casing,
   since the check is declaration-based, not a hardcoded roster. Verify this by running
   `--check` and confirming zero findings for `whatsapp-cta` specifically.
7. Add one self-test fixture pair (positive: dead border-radius read flagged when undeclared;
   negative: exempt when genuinely declared) mirroring the existing padding fixtures 4-5.
8. Run `--self-test` (must pass, including all pre-existing fixtures — do not regress them) and
   `--check` (must report 0 findings across the whole tree once Task 1's fix lands).

**Test:**
- `php -l` clean on all 4 files.
- `python scripts/check-render-tier-object-spacing.py --self-test` — all fixtures (old + new)
  pass.
- `python scripts/check-render-tier-object-spacing.py --check` — 0 findings tree-wide.
- `python scripts/run-gates.py --tier fast` — must stay green (92/92 or whatever the current
  count is at execution time — check `npm run gate:list` first, do not hardcode 92).
- `python scripts/audit-block-file-consistency.py --check` — 0 net-new.

**Report:** commit SHA, `--check` output before and after, gate:fast pass/fail, any block where
the base-extraction branching needed more than a source-swap (name it explicitly, do not
silently smooth over a shape difference).

## Task 2 — Live verify + deploy

**Depends on:** Task 1 merged to `main`.

**Do:**
1. Pick ONE of the 4 blocks (recommend `container`, since it already has a proven isolated-test
   harness pattern from D977 to reuse) and live-verify via the SAME method D977 used: a
   REST-created throwaway page (or `render_block()`/`do_blocks()` via `wp eval-file` against the
   live canary), confirming border-radius base + tablet + mobile all emit correctly in the
   lifted external CSS file (`wp-content/uploads/sgs-css/...` — NOT an inline `<style>` tag; see
   D977's decisions.md entry for why checking for an inline tag gives a false negative).
2. Build, run `gate:fast`, deploy via `build-deploy.py --target sandybrown` (use `--skip-gate-full`
   only if the pre-existing, already-documented converter pytest failure — `sgs/button` padding
   collision, proven pre-existing via git-stash test in D976/D977 — is the ONLY gate:full
   failure; otherwise investigate first).
3. Repeat the live check against the REAL deployed code (not an isolated test harness) for at
   least the one chosen block.
4. Delete all test pages/artifacts created during verification (server and local).
5. Confirm site health (`curl` the homepage, expect 200) before and after deploy.

**Test:** the live spot-check itself IS the test — report the exact CSS rule observed for base,
tablet, and mobile border-radius on the chosen block, quoted verbatim from the lifted CSS file.

**Report:** deploy log summary (verify step result), live CSS quote, cleanup confirmation, site
health check result.

## Out of scope (tracked separately, not part of this plan)

- `whatsapp-cta`'s border-radius (never migrated to tier-object at all — a schema-fold decision,
  Step 3 territory, needs Bean's eye on the target shape before any code changes).
- The shared media-atom border-radius (`box-shape.php`/`.control.js`, 10 consuming blocks) and
  `mediaPadding` (`media-padding.php`/`.js`, hero + media) — both confirmed NEVER migrated to
  tier-object shape (verified via block.json this session, correcting an earlier wrong claim).
  This is a full attribute migration (schema fold + control rewiring + render fix), not a
  same-shape stale-reader fix, and needs its own settled-shape-first plan.
