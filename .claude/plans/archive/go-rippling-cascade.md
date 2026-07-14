# Plan — Shared FR-S9-6 `{desktop,tablet,mobile}` responsive-override engine

**Project:** small-giants-wp · **Target D-number:** D327 · **Branch:** `main` (verified D-ceiling D326, HEAD = D325 handoff commit)
**Governing spec:** `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 / **FR-S9-6** · design-gate `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` §8 · Spec 32 (no-inline) · R-31-9 composite-mirror.

---

## PROGRESS (D327, 2026-07-13) — 3 commits banked on main, build-green

- ✅ **Engine foundation** (`4b2e28f7`): `class-sgs-breakpoints.php` + object-model resolver/emitter in `helpers-responsive.php` + 34/34 tests. Inert until called.
- ✅ **qc-council** (3 cross-model raters) validated the wrapper approach — findings baked in below.
- ✅ **Wrapper opt-in branch** (`665b5b12`): `$opts['responsive_model']='object'` + is_array guards + columns gate + grid_on_inner/do_wrap force + container-type + wrapper-owned object-emit block. **Flag-off path byte-identical for 50+ blocks (verified via diff — every change is gated or an inert guard).** Inert until a block flips the flag.
- ✅ **Editor + first block** (`c3497724`): SGS-owned `ResponsiveOverride` (tablist/44px/inherited-icon+aria/reset) + JS breakpoint mirror + canonical-order `makeResponsive`. `site-header-row` gap → object model + flag wired. **`npm run build` GREEN** (dead-control guard + uniformity audit pass). Source-only — live canary NOT yet running this.

### ⏭ SINGLE NEXT ACTION (the STOP-21 proof — do NOT claim it works until this passes)
**Deploy + live-verify `site-header-row` gap per-tier.** Build is done; deploy `build/` + `includes/` to sandybrown → OPcache + `wp litespeed-purge all` + Hostinger `hosting_clearWebsiteCacheV1` → Playwright on the header at 320/768/1024/1440: confirm (a) the row renders a `.sgs-container__inner` with `display:flex` + the gap on it, (b) `container-type:inline-size` on the outer `.sgs-container-*`, (c) set a `gap.mobile` override on a live instance (editor/REST) and confirm it applies at 375 while desktop stays 16px, (d) no regression to the shipped header (WC blocks still gone, no overflow), (e) uid stable on re-save. If it passes → expand `site-header-row` to maxWidth/padding/margin/contentWidth objects, then reshape `site-footer-row` (grid columns) + `adaptive-nav` (flex + linkFontSize) identically. If it fails → the object-emit routing / __inner wiring is the place to look (all mapped in the EXECUTION SPEC below).

## Context — why this change

Today, when a client wants a header/footer/nav row to look different per device, each property is stored as **three separate flat fields** (`gap` / `gapTablet` / `gapMobile`, `maxWidth` / `maxWidthTablet` / `maxWidthMobile`, plus 8 flat `padding*`/`margin*` side-tier fields). This is duplicated, inconsistent (the wrapper already half-migrated box props to `{top,right,bottom,left}` objects while block.json still declares flat `paddingTopTablet` orphans), and has no inherit-from-tier-above semantics.

FR-S9-6 replaces this with **one per-device object model** per property — `{desktop:<val>, tablet:<val|null>, mobile:<val|null>}`, `null` = inherit the tier above, `desktop` always concrete — plus a shared engine that emits a tier's CSS rule **only where it diverges from the tier below**. All three target blocks (`sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav`) are identical flat-tier today, so the engine is built **once** and wired into all three (Bean's build-once intent, confirmed full-scope). **Ground-truth verified:** no block uses the object model yet (`object-model=0`); this is a fresh shared build, not a copy of any parallel track.

**Intended outcome:** all 3 blocks on ONE working per-device responsive model, live-verified per tier at 320/768/1024/1440, with existing (non-§S9) blocks' uids + CSS byte-unchanged.

---

## The one load-bearing risk — uid churn (STOP-NO-KSORT)

Each wrapper instance's scoped `<style>` is tagged by
`'sgs-container-' . substr( md5( wp_json_encode($attributes) . $anchor ), 0, 8 )`
(`class-sgs-container-wrapper.php:963-966`; docblock lines 17-24 **forbid** `ksort`/key-reorder — it churns every container block's uid → pixel drift).

**Resolution (spec §8 + parking + both agree):** guarantee key order **at write-time**, never by mutating the hash input.
- block.json `default` objects are authored in canonical key order (`desktop, tablet, mobile`; sides `top, right, bottom, left`).
- edit.js updates rebuild the object in canonical order (spread desktop→tablet→mobile), never insert keys ad-hoc.
- A **golden "re-save = same uid"** regression test proves stability.
- **Non-§S9 blocks are never touched** — the reshape only lands on the 3 target block.json + their editors. `sgs/container`, `sgs/hero`, etc. keep their exact attribute shapes → their uids are byte-identical by construction (regression grep/diff gate).

---

## Task 1 — Build the shared engine (inline, main/Opus)

Design-gate this data model with `/brainstorming` first (the prompt mandates it), then `/qc-council` the wrapper change **before** any dispatch (cross-block sensitive surface, blub.db 255). New/edited files:

1. **Shared breakpoint source** (R-31-1, one source, no per-block hardcode) — new `plugins/sgs-blocks/includes/sgs-breakpoints.php` (PHP constants: `TABLET_MAX=1023`, `MOBILE_MAX=767`) + JS mirror in `src/utils/responsive.js`. The wrapper, adaptive-nav's collapse logic (`render.php` min-width tiers), and the custom-px 4th tier all read it. Acceptance: **grep-clean** — no second hardcoded `1023`/`767` (or `768`/`1024`) pair specific to these 3 blocks.

2. **Shared resolver + emitter** — extend `plugins/sgs-blocks/includes/helpers-responsive.php` (already has `sgs_responsive_css_rule` / `sgs_responsive_box_shorthand_rule`) with:
   - `sgs_resolve_responsive($obj)` — null-coalesce cascade per property; **per-side** for box props (`mobile.top ?? tablet.top ?? desktop.top`, each side independently).
   - `sgs_emit_responsive_css($selector, $resolved)` — emit base (desktop) rule on `.$uid`, then a `@media` tier rule **only where that tier's resolved value differs from the tier below** (tier-diff — fixture with two identical tiers must emit no redundant rule). Mobile-first-up, fixed direction (not operator-reassignable).

3. **Data model on the wrapper** — `class-sgs-container-wrapper.php`: replace the hand-rolled flat readers (gap L135-136, maxWidth L248-249, contentWidth L331-332, columns L129-133, grid L366-367) with reads of the unified object attrs via the resolver. Box props (padding/margin/band) fold their already-object tiers into the same `{desktop,tablet,mobile}` shape. **Fix the latent flat/object padding mismatch** surfaced by exploration (block.json declares flat `paddingTopTablet` but wrapper reads object `paddingTablet`).

4. **Container queries (gated — no blast radius)** — add `container-type: inline-size` to the block's legitimate `.sgs-container-{uid}` wrapper **only when the caller opts in** (new `$opts['container_query']=true`, passed by the 3 §S9 render.php only — NOT wrapper-wide; 50+ other blocks must not gain containment). Emit tier rules as `@container` **alongside** a `@media` fallback. Acceptance: block renders correctly full-width AND nested in a narrow container (sidebar).

5. **SGS-owned device-switcher** — new `src/components/ResponsiveOverride.js` (do NOT depend on WP `__experimental`). `role="tablist"` + arrow-key nav, 44px targets, inherited value shown greyed **+ icon + `aria-label`** (never colour-alone, WCAG 1.4.1), keyboard-reachable **reset-to-inherited** (Tab + Enter/Space, not right-click). Writes/reads the object model in canonical key order. Supersedes the UI-only `ResponsiveControl.js` for these blocks.

**Tests (Task 1):** unit — uid-canonicalisation across key-order permutations (all → same hash) + tier-diff logic on fixtures; the null-coalesce per-side cascade.

**Checkpoint after Task 1** (Bean-visible): engine built + golden uid test green + `/qc-council` verdict, before wiring.

---

## Task 2 — Wire the 3 blocks to the engine

Reshape flat-tier attrs → unified object attrs on each block.json, wire edit.js to `ResponsiveOverride`, render.php to the resolver + `container_query` opt-in. Disjoint dirs → optionally 1 Sonnet subagent per block; **re-verify each live yourself** (STOP-16 — a subagent "it works" is a hypothesis).

- `plugins/sgs-blocks/src/blocks/site-header-row/{block.json,edit.js,render.php}`
- `plugins/sgs-blocks/src/blocks/site-footer-row/{block.json,edit.js,render.php}` (also `columns`/`gridTemplateColumns` tiers)
- `plugins/sgs-blocks/src/blocks/adaptive-nav/{block.json,edit.js,render.php}` (also `linkFontSize` tiers via `sgs_typography_css_rule`; its **own** `<ul>` gap consumer at render.php L141-169; **fix the missing `marginLeftMobile`** asymmetry vs the two rows)

Delete the now-truly-orphan flat `padding*Tablet`/`margin*Mobile` block.json attrs once the object model replaces them (verify nothing else consumes them; dead-control guard).

**Migration note:** these 3 blocks are new (D324-326), live only on the canary → reshaping their attrs is a one-time acceptable churn. **Re-save / re-clone the canary header + footer** after wiring so the live template parts carry the new shape. No migration/deprecation for existing blocks (D270/D293) — new-blocks-only, verified NOT retrofitted onto any existing block schema.

---

## Verification (end-to-end)

- **Build:** `cd plugins/sgs-blocks && npm run build` (via PowerShell — nvm shim broken in Git Bash, STOP-16).
- **Deploy + cache:** deploy `build/` + `includes/`; then OPcache reset + `wp litespeed-purge all` + Hostinger `hosting_clearWebsiteCacheV1` (CDN) **before any live measure** (STOP-VERIFY-CACHE-LAYER / STOP-21 — emit-green ≠ landed).
- **Live per-tier (all 3 blocks) at 320 / 768 / 1024 / 1440** via Playwright (standalone `node` script — MCP browser was locked last session): per-tier overrides apply; a blank tier inherits the tier above; per-side box inheritance (set `mobile.top` only → right/bottom/left still resolve from desktop); container-query nested-context render.
- **Golden:** save block → capture uid → re-save no change → uid unchanged.
- **Regression:** grep/diff non-§S9 block.json schemas byte-unchanged; audit existing container/hero instances' uids unchanged post-deploy (STOP-NO-KSORT).
- **a11y (device-switcher):** Playwright keyboard traversal (arrow-key tablist) + inherited-indicator `aria-label` assertion + reset-to-inherited click-and-verify; `/a11y-audit`.
- **No-inline:** wrapper carries no inline `style=""`; all values in the scoped `<style id="uid">` (Spec 32).
- **Gates:** `/qc` + `/visual-qa` + `/a11y-audit` after Task 2; `/gap-analysis` vs FR-S9-6 acceptance criteria; visual-diff report per block at `reports/visual-diff/<block>-<date>.md` (STOP-67, `verdict: PASS`).
- **DB:** `/sgs-update` (--stage 1 seed / --stage 10 prune) to register attr changes.

## Commit

Path-scoped (never `git add -A`, STOP-PARALLEL-TRACK-SWEEP). Re-verify D-ceiling + `git branch --show-current` = `main` immediately before commit. New D327 in `decisions.md` (D-ceiling check first). `/handoff` at close (updates state.md + handoff.md + next-session-prompt.md; move `P-ADAPTIVE-NAV-P2B` item 3 to parking-archive on completion).

## Dependency graph
```
Task 1 (inline Opus): /brainstorming data model → build engine → /qc-council wrapper change → golden uid test
  ↓ checkpoint (Bean-visible)
Task 2: reshape + wire 3 blocks (disjoint; verify each live)
  ↓ /qc + /visual-qa + /a11y-audit + /gap-analysis + per-block visual-diff
Commit D327 → main (path-scoped; verify D-ceiling + branch)
```

## qc-council verdict (2026-07-13, 3 cross-model Sonnet raters) — VALIDATED FIX-SHAPE

The council **rejected** my "block-private emission" drift and validated the wrapper-owned design (which the approved plan already specified). Binding corrections baked into the build:

1. **Wrapper-owned, additive opt-in branch (Rater C — NON-COMPLIANT verdict on block-private).** `SGS_Container_Wrapper::render()` gains `$opts['responsive_model']='object'`. Flag ABSENT → current scalar path, byte-identical (50+ blocks safe by construction). Flag PRESENT (only the 3 §S9 blocks pass it) → wrapper reads the object attrs and emits responsive CSS via `sgs_emit_responsive_css()` **called by the wrapper** (mirror + R-31-9 auto-propagation preserved). Block render.php does NOT emit responsive gap/width/padding itself.
2. **18 read sites, per-site defaults (Rater B — REFUTED uniform guard).** The migrated props enter at exactly 18 centralised reads (lines 128-136, 194, 196, 248-249, 331-332, 365-367). Under object mode, `columns`/`columnsTablet`/`columnsMobile` MUST keep their numeric defaults 2/2/1 — a blanket `?''` guard renders `repeat(0,1fr)`/`sgs-cols-0` (proven via `absint('')=0` at lines 532/746/748-752). uid computation (line 965, raw `$attributes`) is untouched; no `padding`/`margin` bare-key collision (object tiers are `paddingTablet` etc., different namespace).
3. **container-type on OUTER, @container targets INNER (Rater D — root-self-query is void).** `container-type:inline-size` on `.$uid` (outer); the flex/grid + responsive tier rules target the wrapper's existing `.sgs-container__inner` descendant (force `wrap_inner=true` for object-mode blocks — a genuine layout container, not a Spec-32 decorative div). Emit each tier as `@container` AND `@media` (identical decls, safe). This makes the "adapts to its own width when nested narrow" acceptance criterion actually pass, not just literally.

**Revised Task-1 wrapper work:** add the opt-in branch + the 18 per-site object-mode guards + route object-mode grid/gap/box to `.sgs-container__inner` with container-type on `.$uid`. The scalar path is untouched → 50+ blocks byte-identical. Validation: grep the diff touches only the opt-in branch + guarded reads; re-run 34 engine tests; byte-diff a flat-string block's wrapper output pre/post = identical.

## Wrapper-surgery EXECUTION SPEC (council-validated mechanics — ready to implement)

Concrete edit points in `includes/class-sgs-container-wrapper.php` for the opt-in branch. All gated on `$object_model = (($opts['responsive_model'] ?? '') === 'object')` — flag ABSENT = current code path, 50+ blocks byte-identical.

1. **Guard the ~5 base object reads** (the ones that become arrays under object mode; tier attrs like gapTablet are absent in the 3 blocks so safe): `columns` L128 (default **2**, numeric — NOT ''), `gridTemplateColumns` L131 (''), `gap` L134 (''), `maxWidth` L194 (''), `contentWidth` L196 (''). Guard shape: `is_array($v=$attributes['x']??$default) ? $default : $v`. The transform-reads at L248/L249/L331/L332 read tier attrs that are ABSENT under object mode → already safe; still add `is_array` before the `$sgs_css_length`/`$sgs_resolve_content_width` call as belt-and-braces.
2. **Gate the columns shorthand** so the object emitter owns grid: L533-534 base `grid-template-columns` fallback → add `&& ! $object_model`; the `sgs-cols-*` class emission L746/L749/L752 → add `&& ! $object_model`. Keep display:grid/flex + align + wrap + justify (structural, stay scalar).
3. **Two-layer container-query structure (Rater D):** the block sets `contentWidth` (object) so `$has_band_props` is true → `$grid_on_inner` (L463) true → flex/grid + gap route to `.$uid>.sgs-container__inner` (`$grid_sel`) naturally. Add `container-type:inline-size` to the OUTER `.$uid` under object mode (append to `$base_outer_decls` / a dedicated `.$uid{container-type:inline-size}` rule). Confirm live that the block passes NO `wrap_inner` opt (else L463 `null===$opt_wrap_inner` fails). If a block genuinely has no content band, override `$grid_on_inner=true` + `$do_wrap=true` under object mode instead — but prefer the natural contentWidth path.
4. **Object-emit block** (after `$uid` resolved, before the `<style>` assembly L1456): build the prop map from the object attrs and call `sgs_emit_responsive_css()` twice — inner props `['container'=>true]` routed to `$grid_sel`: **gap → 'gap', gridTemplateColumns → 'grid-template-columns'**; outer props `['container'=>false]` routed to `.$uid`: **maxWidth → 'max-width', padding → 'padding' (box), margin → 'margin' (box)**; contentWidth → band max-width on `$band_sel`. Append to `$responsive_css`.
5. **`$needs_uid`** (L952) → OR in `$object_model` so the uid + `<style>` always generate for these blocks.

**Static verification (here):** `php -l` + 34 engine tests green + confirm the wrapper diff is ONLY the gated additions (flag-off path untouched → 50+ blocks byte-identical). **Correctness verification (live only):** deploy + OPcache/LiteSpeed/CDN clear + Playwright at 320/768/1024/1440 on all 3 blocks — per-tier overrides apply, blank tier inherits, per-side box inherit, container-query nested-narrow adapts, uid stable on re-save. This is why the surgery + verify is a full deploy-cycle chunk.

## Out of scope (deferred — parking)
- Section wrappers `sgs/site-header` / `sgs/site-footer` (they delegate responsive props to their rows; migrate only if they carry own responsive props — follow-up).
- `P-ADAPTIVE-NAV-P2B` items 1 (drawer drill-down) + 2 (mega-menu disclosure).
- `P-DRAWER-MOVABLE-OVERFLOW-DROPZONE` (FR-S9-8 positional drop-zone).
