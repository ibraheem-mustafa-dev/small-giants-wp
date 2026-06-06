---
doc_type: phase-plan
project: small-giants-wp
phase: "Spec 28 — P1 Value ladder (comparative per-unit display, MVP)"
spec: .claude/specs/28-SGS-SMART-BULK-PRICING.md
created: 2026-06-04
status: ready-to-execute
plan_label: "[PLAN: sonnet]"
---

# Phase Spec 28-P1 — Comparative value ladder (display-only)

**USP:** Turns "bigger pack = cheaper" from a hidden fact into an explicit, loss-framed buying cue on every product card — the conversion-lift half of Spec 28, shippable NOW with zero pricing engine and zero risk (it only READS prices WooCommerce already serves). This is the cheapest, highest-leverage step in the whole shop layer.

**Plan label:** [PLAN: sonnet] — settled design (B3 already shipped), implementation-heavy, clear requirements. No architectural ambiguity once the anchor KJC below is locked.

**Docscore:** B+ (self-scored against phase-plan template; all step blocks 4-layer-tested, QA checks commandable).

**Aggregate cost estimate:** ~0.5 session. 8 steps. Sonnet-subagent + inline. ~120–180k tokens total (mostly Step 4 render.php refactor + Step 7 Playwright QA). No paid external APIs.

**Phase success criteria (done when):**
- [ ] Product card shows a comparative ladder: per-unit price at EVERY pack size, smallest-anchored, with a saving label per row.
- [ ] Saving framed correctly: Rule of 100 (pence under £1/item, % at ≥£1/item); loss-aversion default for sub-£ items ("save Xp each vs …").
- [ ] Badge target = largest pack by default; the 2nd-largest when `decoyEnabled` (FR-28-9a) is on for that product.
- [ ] Monotonicity guard: any row whose per-unit does NOT strictly decrease vs the smaller pack has its saving + badge SUPPRESSED (FR-28-7).
- [ ] Sale-aware: ladder reads the ACTIVE WC price; when a `sale_price` is live the label reads "vs sale price" (FR-28-7/11).
- [ ] Claim-suppression honoured: where the anchor is not a genuine single price, no "vs buying singly" claim is emitted (FR-28-16 carry-in).
- [ ] All saving strings `esc_html`-escaped, plain text only (FR-28-8 / XSS).
- [ ] axe = 0 violations; 44px targets; 4.5:1 contrast; renders correctly at 375/768/1440; no-JS SSR renders the full ladder.
- [ ] Live-verified on canary; product-card version bumped; registered via `/sgs-update`; committed past a `/qc-council` gate.

**Entry context (read before starting):**
- `.claude/specs/28-SGS-SMART-BULK-PRICING.md` — §"Functional requirements" FR-28-7/8/9/9a/16, §"Build order" P1 row, §Principles 3/5.
- `plugins/sgs-blocks/src/blocks/product-card/render.php` — B3 lives at lines 231–507; per-unit SSR seed line ~320; ladder integrates here.
- `plugins/sgs-blocks/includes/render-helpers.php` — `sgs_configurator_per_unit_display()` lines 707–716 (the per-unit formula to reuse); new helpers land here.
- `plugins/sgs-blocks/includes/class-product-manifest.php` — per-combo fields (priceMinor / exMinor / saleMinor / unitDivisor / unitLabel / discountLabel / pctOff) lines ~400–426; manifest cache key `sgs_manifest_v6_`.
- `plugins/sgs-blocks/src/blocks/product-card/view.js` — store `sgs/product-card`; `applyPillSelection()` 427–541; B3 update 513–524; `perUnitDisplay()` 403–414.
- `plugins/sgs-blocks/CLAUDE.md` — Block Build Status table (version lives here, not a per-block CLAUDE.md).

**References:**
- FR-27-B3 (shipped `ceb4e04a`) — per-unit + sgs/label badge + auto-contrast; the mechanism P1 extends.
- Memory `deploy-asset-php-with-viewscriptmodule` — a view.js change has NO effect until `build/blocks/product-card/view.asset.php` is ALSO deployed (the ?ver carrier). scp the whole block set.
- Memory `wp-reads-block-style-css-not-style-index` — WP enqueues each block's `style.css`, NOT `style-index.css`; deploy `style.css` for any CSS change.
- Memory `interactivity-no-bind-on-injected-nodes` + `wp-interactivity-data-wp-on-rejects-colon-event-names` — do not bind `data-wp-on` on injected nodes / colon event names; the ladder is SSR'd, so this is avoided by design (see KJC-B).
- Canary: sandybrown-nightingale-600381.hostingersite.com; product page with a bound multi-pack product; creds `.claude/secrets/sandybrown.env`.

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /qc-council | Step 8 (pre-commit gate, per blub.db 255) |
| skill | /sgs-update | Step 8 (register block) |
| skill | /sgs-clone --debug-trace | Step 7 (per-section pixel-diff is NOT needed — display-only; Playwright DOM is the gate) |
| skill | /a11y-audit | Step 7 |
| mcp | playwright | Step 7 (375/768/1440 + axe) |
| cli | npm run build | Step 8 (--webpack-copy-php) |
| cli | php -l | Steps 2,4 QA |
| cli | scp / ssh hd | Step 8 deploy |
| agent | wp-sgs-developer | Steps 2,4,5,6 (heavy block work) |

---

## Steps

### Step 0 — Capture the lean-seed baseline + name the canary test product
  Model:       inline (read-only)
  Action:      On the canary, open a bound multi-pack product page in DevTools. Record: (a) the test product ID + its variation pack sizes (e.g. "product 2104 — 6/12/24-pack"); (b) the `<div data-wp-context="…">` byte length for the product-card (the lean-seed baseline). Write both into this plan's References block so every later QA run compares against the same numbers. Grep the repo for `.value-ladder__` / `.product-card__value-ladder` to confirm no class-name collision (PD-15 / collision check).
  Files:       (none — read-only; records numbers into this plan)
  Inputs:      Canary creds `.claude/secrets/sandybrown.env`.
  Outcome:     Baseline context byte-size + canary product ID recorded; class names confirmed free.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        3 min
  Tooling:     playwright MCP (or browser DevTools); Grep
  On-Fail:     If no suitable multi-pack bound product exists on the canary, create one via the webroot one-shot fixture runner (memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`) before proceeding.
  Cold-Entry:  This plan doc + `.claude/secrets/sandybrown.env` + canary URL (sandybrown-nightingale-600381.hostingersite.com).
  Test:
    Happy:       baseline byte-length recorded; product ID noted.
    Edge:        product with exactly 1 variation → not suitable; pick/create a ≥2-pack product.
    Fail:        canary unreachable → check creds + host; do not proceed without a baseline.
    Integration: the recorded number is what Step 3's integration test diffs against.

### Step 1 — Add attributes + register the reference-price read path
  Model:       inline (tiny schema edit + a decision lock)
  Action:      In `product-card/block.json` add two attributes: `framingMode` (string enum "savings|loss-aversion|neutral", default "loss-aversion") and `decoyEnabled` (boolean, default false). In `class-configurator-meta.php` register a NEW product-level meta `_sgs_base_price_pence` (integer, `absint` sanitiser, `show_in_rest` true) — READ path only this phase; its authoring UI is P3. Add a per-product boolean meta `_sgs_decoy_enabled` mirroring the attribute for bound mode.
  Files:       plugins/sgs-blocks/src/blocks/product-card/block.json; plugins/sgs-blocks/includes/class-configurator-meta.php
  Inputs:      FR-28-8 (framingMode enum), FR-28-9a (decoy), FR-28-16 (base price semantics), KJC-A decision below.
  Outcome:     Block exposes framingMode + decoyEnabled; `_sgs_base_price_pence` resolvable via REST + PHP; no behaviour change yet.
  Exec:        SEQUENTIAL
  Deps:        Step 0
  Marker:      (none)
  Time:        5 min
  Tooling:     Edit; php -l
  On-Fail:     Revert the two files (git checkout); attributes are additive so no data migration risk.
  Note:        `_sgs_base_price_pence` is PRODUCT-level meta, read ONCE per card (PD-14), never per-variation.
  Test:
    Happy:       `php -l class-configurator-meta.php` → "No syntax errors"; new attrs appear in editor Inspector after build.
    Edge:        `_sgs_base_price_pence` set to "abc" → `absint` yields 0 → treated as "no reference" (claim suppressed, KJC-A).
    Fail:        Duplicate meta registration → WP notice; guard with `register_post_meta` single call.
    Integration: REST `GET /wp/v2/product?_fields=meta` returns `_sgs_base_price_pence` (CPT must support custom-fields — already true for configurator meta).

### Step 2 — Add the pure display helpers to render-helpers.php
  Model:       sonnet (wp-sgs-developer) — pure-PHP, well-scoped
  Action:      Add `sgs_saving_display( int $anchor_per_unit_pence, int $pack_per_unit_pence, string $framing_mode, bool $anchor_is_genuine_single, bool $is_active_sale ): string` and `sgs_value_ladder( array $combos, ?int $base_pence, string $framing_mode, bool $decoy_enabled, string $tax_mode, int $decimals ): array`. **(PD-8/PD-9: signatures mirror the REAL `sgs_configurator_per_unit_display($combo,$mode,$decimals,$template)` + `sgs_configurator_format_minor($minor,$decimals)` — thread `$tax_mode`+`$decimals`; the unit label stays in a SEPARATE span, NOT embedded in the saving string.)** `sgs_saving_display`: saving_each = anchor − pack per-unit (clamp ≥0); Rule of 100 (FLOOR the "%" when anchor ≥ 100p, else pence rounded — never overstate, PD-4); loss-aversion verb for sub-£ → tail is "vs sale price" when `$is_active_sale` else "vs buying singly" (PD-9); neutral = "" ; if `!$anchor_is_genuine_single` → "" (FR-28-16). PLAIN TEXT only. `sgs_value_ladder`: collapse to one row per DISTINCT `unitDivisor` (PD-2), sort asc; anchor = `$base_pence` if >0 else smallest row per-unit (KJC-A); per-unit computed in ONE basis via the same `exMinor`-if-`ex-plus-vat`-else-`priceMinor` branch as `sgs_configurator_per_unit_display` (PD-3), formatted with `$decimals`; `is_target` = largest NON-suppressed positive-saving row (2nd-largest if `$decoy_enabled`), `suppressed` = per-unit not strictly < previous row's (PD-5). Return ordered `{pack, per_unit_pence, per_unit_display, saving_display, is_target, suppressed, is_active_sale, row_label}` (row_label per PD-1).
  Files:       plugins/sgs-blocks/includes/render-helpers.php
  Inputs:      Step 1; existing `sgs_configurator_per_unit_display()` 707–716 + `sgs_configurator_format_minor()`; FR-28-7/8/9a/16.
  Outcome:     Two pure helpers exist, callable, no WP-state side effects; saving strings escaped at the caller (these return plain text).
  Exec:        SEQUENTIAL
  Deps:        Step 1
  Marker:      (none)
  Time:        15 min
  Tooling:     wp-sgs-developer agent; Edit; php -l
  On-Fail:     Helpers are additive; revert the function block. No callers yet, so zero blast radius.
  Prompt:      "In c:\\Users\\Bean\\Projects\\small-giants-wp\\plugins\\sgs-blocks\\includes\\render-helpers.php add two pure PHP functions (WordPress, UK English, escape NOTHING inside — return plain text, the caller escapes). FIRST read sgs_configurator_per_unit_display (~line 707; signature ($combo,$mode,$decimals,$template)) AND sgs_configurator_format_minor (signature ($minor,$decimals)) to copy their EXACT conventions. (1) sgs_saving_display(int \$anchor_per_unit_pence, int \$pack_per_unit_pence, string \$framing_mode, bool \$anchor_is_genuine_single, bool \$is_active_sale): string — if !\$anchor_is_genuine_single return ''. saving_each = max(0, \$anchor − \$pack). framing 'neutral' → ''. Rule of 100: if \$anchor_per_unit_pence >= 100 → whole-percent saving, FLOORED via (int) floor(...) so it never overstates ('save 12%'); else pence ('save 8p each'). For sub-£ anchors framing 'loss-aversion' appends the tail: ' vs sale price' when \$is_active_sale else ' vs buying singly'; framing 'savings' omits the tail. Use __() translatable strings, text domain 'sgs-blocks'. NO unit label inside the string (the caller renders it separately). Plain text. (2) sgs_value_ladder(array \$combos, ?int \$base_pence, string \$framing_mode, bool \$decoy_enabled, string \$tax_mode, int \$decimals): array — collapse to ONE row per distinct unitDivisor (within a size group keep the lowest-priced combo), sort by unitDivisor ascending. per_unit for a row = round(base/unitDivisor) where base = (\$tax_mode==='ex-plus-vat' && isset exMinor) ? exMinor : priceMinor — IDENTICAL branch to sgs_configurator_per_unit_display; per_unit_display = sgs_configurator_format_minor(per_unit, \$decimals). anchor_per_unit = \$base_pence>0 ? \$base_pence : first(smallest) row per_unit; anchor_is_genuine_single = (\$base_pence>0). is_active_sale row-level = (saleMinor !== null). suppressed = (index>0 && per_unit >= previous row per_unit). is_target = the LARGEST non-suppressed row with positive saving (or the 2nd-largest such row when \$decoy_enabled); if none qualifies, no target. row_label = the combo's size attribute term label if present else (string)(int)round(unitDivisor). saving_display = sgs_saving_display(anchor_per_unit, per_unit, \$framing_mode, anchor_is_genuine_single, is_active_sale). Return ordered list of {pack:(int)round(unitDivisor), per_unit_pence, per_unit_display, saving_display, is_target, suppressed, is_active_sale, row_label}. Null-guard every combo field (skip a row missing unitDivisor/priceMinor; no PHP warnings). Do NOT touch any other function. php -l after. Return the diff only; do not commit."
  Test:
    Happy:       ladder([6→£4.99,12→£8.99,24→£16.99], base=100) → per-unit 83/75/71p, savings "17%/25%/29%", target=24-pack.
    Edge:        base=null → anchor=smallest per-unit (83p); 6-pack row saving = "" (anchor == itself); claim still honest.
    Fail:        a 12-pack priced so per-unit ≥ 6-pack per-unit → that row `suppressed=true`, saving_display ignored downstream.
    Integration: `sgs_saving_display(100, 83, 'loss-aversion', true)` returns a string containing "17%" (Rule of 100, ≥£1 anchor) — assert via a throwaway `php -r`.

### QA Gate — helpers behave (Rule of 100 + monotonicity + suppression)
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 1–2
  Check:   Run via `ssh hd "wp eval-file <uploaded-test.php>"` OR a token-gated webroot one-shot (memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`) — NOT bare `php -r` (PD-13: `sgs_configurator_format_minor` calls `wc_price()`, needs WC loaded). Test body asserts: `sgs_saving_display(100,83,"loss-aversion",true,false)`, `(100,83,"neutral",true,false)`, `(80,60,"loss-aversion",true,false)`, `(80,60,"loss-aversion",true,true)`, `(100,83,"loss-aversion",false,false)`.
  Pass:    #1 contains "17%" (floored); #2 is ""; #3 contains "20p" + "vs buying singly"; #4 contains "vs sale price" (is_active_sale); #5 is "" (no genuine single → suppressed).
  Fail:    Wrong Rule-of-100 branch → fix the ≥100p threshold in Step 2; re-run.
  Marker:  QA

### Step 3 — Build the ladder context server-side in render.php
  Model:       sonnet (wp-sgs-developer) — multi-file aware, must respect lean-seed
  Action:      In `product-card/render.php` (bound mode, near the B3 block ~231–335) call `sgs_value_ladder()` with the card's combos + resolved `_sgs_base_price_pence` + `framingMode` attr (fall back to `_sgs_decoy_enabled` meta in bound mode) and store the resulting ladder array under a `valueLadder` context key for SSR ONLY. Do NOT add the full ladder to the client-seeded manifest (lean-seed: the rows are SSR-rendered; view.js re-highlights from the existing combo data it already has). Set `valueLadderHidden` when fewer than 2 packs.
  Files:       plugins/sgs-blocks/src/blocks/product-card/render.php
  Inputs:      Steps 1–2; manifest combos; KJC-B (SSR ladder, not seeded).
  Outcome:     `$context['valueLadder']` is an ordered PHP array ready to render; client seed size unchanged (verify).
  Exec:        SEQUENTIAL
  Deps:        Step 2
  Marker:      (none)
  Time:        15 min
  Tooling:     wp-sgs-developer agent; Edit; php -l
  On-Fail:     Wrap the ladder build in `if (count($combos) >= 2)`; on any null combo field, skip that row, never fatal. Revert render.php to restore B3-only.
  Prompt:      "[Cold] In c:\\Users\\Bean\\Projects\\small-giants-wp\\plugins\\sgs-blocks\\src\\blocks\\product-card\\render.php, bound-mode branch around lines 231–335 (the B3 per-unit seed). After the existing B3 context is built, compute a value ladder: read the product-level meta _sgs_base_price_pence (absint, may be 0), the block attribute framingMode (default 'loss-aversion') and decoy flag (attribute decoyEnabled OR meta _sgs_decoy_enabled in bound mode). Call sgs_value_ladder($combos, $base_pence ?: null, $framing_mode, $decoy_enabled) where $combos is the same per-combo array B3 already iterates. Store the result as $context['valueLadder'] (SSR only — do NOT add it to the client-seeded manifest/context that view.js hydrates; the lean-seed 24KB cap must not regress). Add $context['valueLadderHidden'] = count < 2. Do not render markup in this step. Keep all existing B3 behaviour intact. Run php -l. Return the diff; do not commit."
  Test:
    Happy:       a 3-pack bound product → `$context['valueLadder']` has 3 ordered rows with per-unit + saving.
    Edge:        single-pack product → `valueLadderHidden=true`, no ladder array consumed.
    Fail:        a combo missing `unitDivisor` → that row skipped, no PHP warning (null-safe).
    Integration: confirm the client-seeded JSON byte size is unchanged vs pre-step (lean-seed guard): compare `data-wp-context` length before/after on the canary in Step 7.

### Step 4 — Render the ladder markup (accessible, SSR)
  Model:       sonnet (wp-sgs-developer)
  Action:      In render.php output (after the price-note block ~503–507) emit the ladder as a semantic list/table: one row per pack — pack label, per-unit price, saving text (only if non-empty AND not suppressed), and the `sgs/label` "Best value" badge on the `is_target` row (reuse the exact pill-wrap markup at 496–501 + auto-contrast vars). Mark the active/selected pack row with `aria-current="true"` and a `data-pack` attribute so view.js can re-highlight. When `valueLadderHidden`, render nothing. ALL strings via `esc_html()`. No `data-wp-on` on these rows (KJC-B — re-highlight is a class toggle in view.js via a stable container query, not per-row binding).
  Files:       plugins/sgs-blocks/src/blocks/product-card/render.php
  Inputs:      Step 3 context; B3 badge markup 496–501; FR-28-7/8/9; memory interactivity-no-bind-on-injected-nodes.
  Outcome:     SSR ladder visible with no JS; badge on target; suppressed rows show per-unit only (no false saving).
  Exec:        SEQUENTIAL
  Deps:        Step 3
  Marker:      (none)
  Time:        15 min
  Tooling:     wp-sgs-developer agent; Edit; php -l
  On-Fail:     Revert render.php; ladder is additive markup below the existing price note.
  Prompt:      "[Cold] In product-card/render.php, after the per-unit price-note (~lines 503–507), render $context['valueLadder'] as an accessible <ul class=\"product-card__value-ladder\"> (one <li class=\"value-ladder__row\" data-pack=\"<?php echo (int) round($row['pack']); ?>\"> per row — PD-11 int-normalise). Each row: <span class=\"value-ladder__pack\"> (esc_html row_label), <span class=\"value-ladder__per-unit\"> (esc_html per_unit_display), and IF saving_display !== '' AND !suppressed a <span class=\"value-ladder__saving\"> (esc_html saving_display). On the is_target row also render a Best-value badge: copy ONLY the class + auto-contrast inline style from the B3 badge at lines 496–501 (span.wp-block-sgs-label.is-style-pill-wrap) — CRITICAL (PD-10): do NOT copy its data-wp-bind--hidden / data-wp-text attributes; the label is a STATIC esc_html(__('Best value','sgs-blocks')) string, no data-wp-* at all (else hydration wipes it). Set aria-current=\"true\" on the row whose pack matches $def['unitDivisor'] (the default-selected combo, PD-12 — NOT the is_target row). If valueLadderHidden, render nothing. esc_html/esc_attr every dynamic value. No data-wp-* on any ladder node. Keep B3 markup intact. php -l. Return diff; do not commit."
  Test:
    Happy:       3 rows render server-side (curl the page with JS disabled) — all per-unit + savings present, badge on largest.
    Edge:        decoyEnabled=true → badge on 2nd-largest row, largest row shows saving but no badge.
    Fail:        suppressed row → renders per-unit only, NO saving span, NO badge.
    Integration: SSR HTML (view-source) contains the full ladder before any JS runs (no-JS accessibility).

### Step 5 — Ladder CSS (responsive, WCAG)
  Model:       sonnet (wp-sgs-developer) — or haiku if purely additive
  Action:      In `product-card/style.css` (near the B3 block 403–450) add `.product-card__value-ladder` styles: stacked rows mobile-first, per-unit + saving alignment, the active row (`[aria-current="true"]`) visually distinct, badge inherits the existing pill style, 44px min touch height where the row is interactive, ≥4.5:1 contrast, saving text uses an accessible accent (not colour-only — pair with a "▼"/"save" text token). Respect `prefers-reduced-motion` (no transitions beyond opacity).
  Files:       plugins/sgs-blocks/src/blocks/product-card/style.css
  Inputs:      Step 4 markup classes; SGS perf budget (<100KB CSS); WCAG 2.2 AA.
  Outcome:     Ladder is legible and aligned at 375/768/1440; active row clear; no colour-only signalling.
  Exec:        PARALLEL with Step 6 (different files)
  Deps:        Step 4
  Marker:      (none)
  Time:        10 min
  Tooling:     wp-sgs-developer agent; Edit
  On-Fail:     CSS is additive + namespaced under `.product-card__value-ladder`; delete the block to revert.
  Prompt:      "[Cold] In product-card/style.css near the B3 styles (lines ~403–450) add styles for .product-card__value-ladder (a <ul>) and .value-ladder__row / __pack / __per-unit / __saving produced by render.php. Mobile-first stacked rows; align per-unit right of pack on ≥480px; .value-ladder__row[aria-current=\"true\"] gets a subtle surface/border emphasis (not colour-only — it already carries aria-current); .value-ladder__saving uses --wp--preset--color--primary text but MUST remain ≥4.5:1 on surface (fallback #000); min-height 44px when a row is a button/link; honour prefers-reduced-motion. Keep within the SGS <100KB CSS budget — these are a handful of rules. Return diff; do not commit."
  Test:
    Happy:       at 375px rows stack and read cleanly; at 1440px per-unit aligns; active row distinct.
    Edge:        long unit labels ("per 100g sachet") wrap without overflow.
    Fail:        primary == surface colour → saving text falls back to #000 (contrast preserved).
    Integration: axe contrast check passes in Step 7.

### Step 6 — view.js: re-highlight active ladder row on pill-swap
  Model:       sonnet (wp-sgs-developer)
  Action:      In `view.js applyPillSelection()` (427–541, after the B3 update 513–524) add: toggle `aria-current` on the SSR ladder rows by matching `[data-pack]` to the selected combo's pack — via a query on the stable card container (event delegation pattern), NOT per-row `data-wp-*` binding (memory: no-bind-on-injected-nodes; and these rows are SSR but the rule still favours a single container update). No new context keys; no manifest growth.
  Files:       plugins/sgs-blocks/src/blocks/product-card/view.js
  Inputs:      Step 4 `data-pack` attrs; store `sgs/product-card`; KJC-B.
  Outcome:     Selecting a pack pill moves the `aria-current` highlight to the matching ladder row; works without seeding ladder data.
  Exec:        PARALLEL with Step 5 (different files)
  Deps:        Step 4
  Marker:      (none)
  Time:        10 min
  Tooling:     wp-sgs-developer agent; Edit
  On-Fail:     The ladder is fully functional SSR without this; revert view.js to ship a static (non-re-highlighting) ladder if it misbehaves.
  Prompt:      "[Cold] In product-card/view.js, inside applyPillSelection() after the existing B3 per-unit/badge update (~lines 513–524), add code to move the active highlight on the SSR value ladder: from the card root element (the closest stable ancestor already referenced in this function), querySelectorAll('.value-ladder__row'), remove aria-current from all, and set aria-current=\"true\" on the row whose data-pack === String(Math.round(combo.unitDivisor)) (PD-11 — int-normalise BOTH sides; data-pack was written as (int)round in SSR). Use plain DOM (rows are server-rendered; do NOT rely on data-wp-* binding on them). No context keys, no manifest seeding. Keep all existing behaviour. Return diff; do not commit."
  Test:
    Happy:       click 24-pack pill → 24-pack ladder row gets aria-current, others lose it.
    Edge:        product with packs not in the ladder (single) → no-op, no JS error.
    Fail:        ladder absent (hidden) → querySelectorAll returns empty → silent no-op.
    Integration: screen-reader announces the current row on selection (aria-current); verify in Step 7 snapshot.

### QA Gate — pre-deploy static + build
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 3–6
  Check:   `cd plugins/sgs-blocks && npm run build` exits 0 AND `php -l src/blocks/product-card/render.php` AND `php -l includes/render-helpers.php` both report no errors AND `git diff --stat` shows ONLY product-card/{block.json,render.php,view.js,style.css} + render-helpers.php + class-configurator-meta.php.
  Pass:    build succeeds, both php -l clean, no stray files touched (R-22-9 universal-not-per-block sanity: confirm no other block was edited).
  Fail:    build error → read the webpack output, fix the offending file, re-run; never deploy a failed build.
  Marker:  QA

### Step 7 — Live QA on canary (Playwright @ 3 breakpoints + axe + sale + no-JS)
  Model:       inline (architectural judgment on visual + a11y)
  Action:      Deploy to canary (Step 8 deploy mechanics, but QA before committing). Open a bound multi-pack product on sandybrown. Verify: ladder renders all packs (375/768/1440 screenshots); per-unit strictly decreases or the non-decreasing row is suppressed; badge on largest (toggle decoy → 2nd-largest); set a `sale_price` on one variation → ladder reads sale price + "vs sale price" label; disable JS → SSR ladder still present; `data-wp-context` byte size unchanged vs baseline (lean-seed guard); axe = 0. Self-review with /ui-ux-pro-max lens before declaring done (memory: ship-gate-needs-human-eye).
  Files:       (none — verification)
  Inputs:      Steps 1–6 deployed; canary creds `.claude/secrets/sandybrown.env`.
  Outcome:     Evidence captured (screenshots + axe report + context-size delta) proving every success criterion on the live DOM (R-22-11).
  Exec:        SEQUENTIAL
  Deps:        prior QA gate
  Marker:      (none)
  Time:        15 min
  Tooling:     playwright MCP; /a11y-audit; /ui-ux-pro-max self-review
  On-Fail:     Any criterion fails → STOP, fix the owning step, redeploy, re-verify. Do not commit on a failed live check.
  Test:
    Happy:       ladder visible + correct per-unit + badge at all 3 breakpoints; axe 0.
    Edge:        sale active → "vs sale price"; decoy on → badge moves; no-JS → ladder present.
    Fail:        non-monotonic product → offending row shows per-unit only, no saving/badge.
    Integration: cart still charges the real WC price (P1 changed nothing about price — confirm add-to-cart total unchanged).

### Step 8 — Deploy, register, version-bump, /qc-council, commit
  Model:       inline (commit authority + gate)
  Action:      Run `/qc-council` (Sonnet+Haiku+Gemini-Flash+inline) on the full diff (per blub.db 255). On GO: build (done), deploy the WHOLE product-card build set via tar/scp (MUST include `build/blocks/product-card/view.asset.php` — memory deploy-asset-php + style.css — memory wp-reads-block-style-css), OPcache reset. Bump product-card version in block.json (1.12.1 → 1.13.0) + `plugins/sgs-blocks/CLAUDE.md` Block Build Status table. Run `/sgs-update` to register. Commit on `main` (core framework) citing FR-28-7/8/9/9a + "Spec 28 P1 value ladder; display-only, no engine, reads active WC price". Update `.claude/state.md` + `.claude/decisions.md` (new D-number: Spec 28 P1 shipped) + flip the spec's build-order P1 row to ✓.
  Files:       block.json (version); plugins/sgs-blocks/CLAUDE.md; .claude/state.md; .claude/decisions.md; .claude/specs/28-SGS-SMART-BULK-PRICING.md
  Inputs:      Step 7 evidence; /qc-council verdict.
  Outcome:     P1 live on canary, registered, versioned, committed past the council gate; docs reflect shipped state.
  Exec:        SEQUENTIAL
  Deps:        Step 7
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /qc-council; npm run build; tar/scp; /sgs-update; git
  On-Fail:     /qc-council NO-GO → address the blocking finding (re-enter the owning step), re-council. Never commit on NO-GO. Deploy fail → re-scp the full block set, re-OPcache.
  Test:
    Happy:       canary shows the ladder post-deploy; `/sgs-update` registers v1.13.0; commit pushed to main.
    Edge:        view.js change visible (proves view.asset.php deployed — not a stale ES module).
    Fail:        council flags an XSS/escaping miss → fix Step 2/4 escaping, re-council.
    Integration: full round-trip — editor (typed mode still works) + bound mode ladder + cart unaffected.

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **KJC-A — What is the saving anchor in P1, before the engine exists?**
  - **Options:** (A) anchor on the smallest pack's per-unit and frame "vs the smallest pack"; (B) use an owner-set `_sgs_base_price_pence` single-item reference if present, else fall back to the smallest pack's per-unit; (C) require the reference price (block P1 until P3 authoring ships).
  - **Recommendation:** **B.**
  - **Why:** B is honest in both worlds. If the owner has set a genuine single price, savings are framed "vs buying singly" (the spec's intent, FR-28-16). If not, the anchor is the smallest *real, sellable* pack per-unit and the claim is reframed/suppressed — never a comparison to an unsellable reference (DMCC/CPUT, FR-28-16). C needlessly blocks the MVP; A loses the stronger single-item framing where it's legitimately available.
  - **Cost of wrong choice:** picking A drops a legitimate conversion lever; picking C stalls the whole point of P1 (ship now). B has no downside — it degrades gracefully.
  - **Who decides:** joint (recommend B; locked unless Bean objects).

- **KJC-B — SSR the ladder, or seed it into the client manifest?**
  - **Options:** (A) render the full ladder server-side, client only re-highlights the active row; (B) seed the ladder rows into `data-wp-context` and render client-side.
  - **Recommendation:** **A (SSR).**
  - **Why:** The lean-seed 24KB context cap already bit once (memory `manifest-growth-can-trip-capped-client-seed`) — seeding N ladder rows × M cards risks tripping it again and dropping the configurator to a static card. SSR also gives no-JS accessibility for free and sidesteps the WP-Interactivity no-bind-on-injected-nodes / colon-event traps. The combos needed for re-highlight are ALREADY seeded for pill-swap, so the client needs no new data.
  - **Cost of wrong choice:** B re-opens the exact context-cap regression that cost a session on 2026-06-05.
  - **Who decides:** architect (locked — A).

### Pre-emptive decisions (Hidden Decisions pass)

_Tooling note: the two zero-cost cold reviewers were unavailable this run (gemini CLI not on the Bash PATH after a pnpm update; cerebras model ID returned 404). Pass run inline against the fully-grounded code map instead. These are the concrete mid-step pauses a cold executor would hit._

- **PD-1 — What IS "pack size"? `unitDivisor` is the proxy, but it can be fractional (100g).**
  - **Recommendation:** Key/sort the ladder on `unitDivisor` ascending. The row LABEL is the variation's own size/attribute term name (from the combo), NOT a synthesised "Pack of N" — fall back to `unitDivisor` only when no term label exists. This keeps weight-based products ("100g / 250g / 1kg") honest; the ladder is "per-unit across sizes", not "per-pack-count".
  - **Why:** the configurator already carries pack/size as a WC attribute; inventing "Pack of 6" breaks weight-based catalogues.

- **PD-2 — Two combos with the SAME `unitDivisor` (e.g. flavour variants of a 6-pack).**
  - **Recommendation:** One ladder row per DISTINCT `unitDivisor`. Within a size, use the currently-selected combo's price (so the ladder tracks the active flavour), falling back to the lowest price in that size group at first paint.
  - **Why:** the ladder communicates size-vs-per-unit, not flavour; N rows per size is noise.

- **PD-3 — Tax basis must be consistent across the whole ladder.**
  - **Recommendation:** Build the entire ladder (anchor + every row) in ONE basis — the resolved display basis (`exMinor` only if `taxDisplayMode === 'ex-plus-vat'`, else `priceMinor`), mirroring `sgs_configurator_per_unit_display()`. Never mix an ex-VAT anchor with inc-VAT rows.
  - **Why:** mixing bases silently inflates/deflates the saving — a CPUT-grade accuracy bug.

- **PD-4 — Percentage rounding direction.**
  - **Recommendation:** FLOOR the displayed percentage (and round pence to nearest, never up). Showing "17%" when the real saving is 17.8% understates — legally safe; rounding up overstates — CPUT exposure.
  - **Why:** the engine half (P2) charm-rounds; the DISPLAY half must never overstate a saving.

- **PD-5 — Badge target when the intended target row is suppressed (monotonicity).**
  - **Recommendation:** `is_target` = the largest NON-suppressed pack with a genuine positive saving. If decoy is on, target the 2nd-largest non-suppressed row. If every row is suppressed, render NO badge.
  - **Why:** otherwise the badge can land on a row whose saving was just suppressed — the badge would contradict the (absent) saving.

- **PD-6 — framingMode (attribute) vs decoy (meta) precedence in bound mode.**
  - **Recommendation:** `framingMode` is a per-placement block attribute (one card block renders many products → placement-level framing is correct). Decoy is product-specific → per-product meta `_sgs_decoy_enabled` WINS over the block attribute in bound mode; the attribute is only the typed-mode/default.
  - **Why:** decoy is a per-product commercial choice; framing is a placement style choice.

- **PD-7 — Scheduled-sale cache lag (known limitation, not a P1 blocker).**
  - **Recommendation:** Accept that a SCHEDULED sale start/end may lag up to the manifest TTL (`DAY_IN_SECONDS`) because the freshness probe keys on `post_modified`, which a scheduled transition does not always bump. Document it; the real fix (cache-bust on `woocommerce_scheduled_sales`) belongs with the engine work (P3/P4), not display-only P1.
  - **Why:** chasing it now expands P1 beyond display-only scope for a ≤24h edge.

### Pre-emptive decisions (cold review — haiku + sonnet subagents, 2026-06-04)

_Two cold reviewers ran against the plan + the real code. These are NEW gaps beyond PD-1..PD-7; several are corrections folded back into the step prompts (marked ✎ FIXED IN STEP)._

- **PD-8 — ✎ FIXED IN STEP 2 — helper signatures must mirror the REAL `sgs_configurator_per_unit_display( $combo, $mode, $decimals, $template )` (4 args) and `sgs_configurator_format_minor( $minor, $decimals )`.** The pure helpers MUST thread `$tax_mode` + `$decimals` from render.php scope. `sgs_value_ladder()` gains `string $tax_mode, int $decimals` params; without `$decimals` every format call fatals or prints integer pounds.
- **PD-9 — ✎ FIXED IN STEP 2 — `sgs_saving_display()` needs `bool $is_active_sale`** so it emits "vs sale price" (FR-28-7/11 success criterion) instead of "vs buying singly" when a sale is live. The unit label is NOT embedded in the saving string — it stays in a separate span (matches B3); the % and pence forms are therefore label-free and consistent.
- **PD-10 — ✎ FIXED IN STEP 4 — the reused B3 badge span (render.php 496–501) carries `data-wp-bind--hidden` + `data-wp-text`.** Copying it verbatim onto SSR ladder rows would WIPE the badge text on hydration (the documented SSR-wipe trap, memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`). Copy the CLASS + auto-contrast STYLE only; the "Best value" label is a plain static `esc_html()` string with NO `data-wp-*` attributes.
- **PD-11 — ✎ FIXED IN STEP 4/6 — `data-pack` must be int-normalised.** `unitDivisor` may be a float (`100.0` in PHP vs `100` in JS) → `querySelector` miss. Write `data-pack="<?php echo (int) round( $row['pack'] ); ?>"` in SSR and compare `Math.round(combo.unitDivisor)` in view.js. (Weight-based fractional sizes that don't round-trip use the variation's size-attribute term slug from `axes` instead — see PD-1.)
- **PD-12 — ✎ FIXED IN STEP 4 — initial `aria-current` goes on the row matching `$def['unitDivisor']` (the default-selected combo), NOT the `is_target` row.** Otherwise the aria state contradicts the highlighted pill on first paint.
- **PD-13 — ✎ FIXED IN STEP 2 QA GATE — the QA gate cannot use bare `php -r`** because `sgs_configurator_format_minor()` calls `wc_price()` which needs WooCommerce loaded. Run the assertion via WP-CLI on the dev site (`wp eval` / a token-gated webroot one-shot per memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`), OR shim `wc_price()` + `__()` before the require in the throwaway script.
- **PD-14 — `_sgs_base_price_pence` is a PRODUCT-level meta, read ONCE per card** (single anchor for the whole ladder), never per-variation. render.php resolves it at the top of the bound branch and passes one value to `sgs_value_ladder()`.
- **PD-15 — added as Step 0 — capture the lean-seed baseline BEFORE editing,** and name the canary test product. There is no point measuring "context size unchanged" (Step 3 integration test) without a recorded baseline. Step 0 records the `data-wp-context` byte length + the product ID/variation pack-sizes used for every later QA run.

**Also threaded in:** version-bump convention — confirm against `plugins/sgs-blocks/CLAUDE.md` Block Build Status table whether per-block versions are SemVer or global-synced before bumping (Step 8); grep `.value-ladder__` + `.product-card__value-ladder` for class-name collisions before Step 5 (none expected — new names).
