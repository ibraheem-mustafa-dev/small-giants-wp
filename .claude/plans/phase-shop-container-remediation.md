---
plan_id: phase-shop-container-remediation
phase_name: Shop archive + container remediation
project: small-giants-wp
created: 2026-08-20
revised: 2026-08-20 (post Hidden-Decisions pass — 8 defects fixed, see CHANGELOG)
cost_estimate: Phase 1 ~0.9M tokens / 9 steps · Phase 2 ~1.1M tokens / 10 steps
docscore_grade: pending
---

# Shop archive + container remediation

**USP:** Fixes the one bug blocking instant filtering *and* the already-built Flip animation,
then closes the container defect that silently caps every background on every client site.

**Plan label:** `[PLAN: opus]` — two Rule 7 shared-wrapper gates, a 43-file blast radius.

**Spec (single source of truth):** `.claude/plans/2026-08-20-shop-archive-remediation-design.md`
(693 lines, every claim live-verified). Its "BEAN'S DECISIONS" section is BINDING.

**Branch:** `main` for all framework work (`plugins/sgs-blocks/`, `theme/sgs-theme/`).
⚠ Step P2-6 also touches `sites/indus-foods/` — that portion goes on `feat/indus-foods-colour-rename`
per CLAUDE.md's branch routing. Verify with `git branch --show-current` **in the same command
as every commit**.

---

## ⚠ CHANGELOG — 8 defects found by the Hidden Decisions pass and fixed

Two cold reviewers independently reviewed the first draft. Every finding below was verified
against real files before acting; all were real.

1. **Pattern rename ran BEFORE container declared its attrs** — would have stripped the
   background from ~280 authorings and failed QC by construction. **Moved to Phase 2, after
   the container spine.**
2. **Step 2 would have redded the build for the whole phase.** `check-dead-pattern-attrs.py
   --check` is in the build-FAILING chain unwrapped; `--check` exits 1 on all kinds except
   `native-style-undeclared` (`:303-318`). **Now specifies a new advisory finding-kind.**
3. **Template-fix example would have corrupted a valid block.** `product-filter-price` is
   already open+close (`:57-59`); the self-closing ones are the **leaves**. **Count corrected
   13 → 7, all named.**
4. **Chip `nowrap` "fix" would have deleted a working feature.** `:648-660` is a deliberate
   horizontal-scroll pattern (`overflow-x:auto`, `-webkit-overflow-scrolling`, hidden
   scrollbar, comment). **Change dropped.**
5. **Steps said "verify live" and "do not deploy" simultaneously.** **Deploys now granted
   explicitly at wave boundaries, owned by the orchestrator.**
6. **Wave 1 ran three agents in parallel while one ran `npm run build`** over files the other
   two were editing. **Build moved out of the parallel group.**
7. **G2 was filed against the band-width step; it governs colour.** **Re-attached to P2-3.**
8. **Editor-parity gate measured a tree another step was concurrently changing.**
   **Sequenced after it.**

---

## ⛔ BLOCKERS — answer BEFORE Phase 2 starts

Rule 7 gates. No subagent can take these.

| # | Gate | Blocks | Recommendation |
|---|---|---|---|
| ~~G1~~ | `flexDirection` default | ~~P2-2~~ | ✅ **CLOSED — Bean ruled `row`** (CSS default). Council CONFIRMED it correct on two grounds the recommendation missed: `stack` is already flex-column, and `row` is LESS retroactive than `column`. See "G1 design council" below. |
| ~~G2~~ | `sgs/container` root colour routing | ~~P2-3~~ | ✅ **CLOSED — Bean ruled `SGS_Container_Wrapper`.** Rule 7 gate satisfied. |

**Both gates are now CLOSED.** ⚠ ONE NEW question was raised by the council and is NOT yet
answered — see "THIRD OPTION" below: whether to change the `layout` default at ALL, versus
having the editor write `layout:"flex"` explicitly on newly-inserted containers (zero
retroactivity). Bean's ruling settled DIRECTION, not whether to change the default.
Phase 1 does not depend on it and can start immediately.

---

## Entry context

- `.claude/plans/2026-08-20-shop-archive-remediation-design.md` — the spec
- `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php:424-425, 836-842, 1628, 2344-2354, 2689` — band bug chain
- `plugins/sgs-blocks/src/blocks/button/edit.js:381-470` — colour-panel reference
- `plugins/sgs-blocks/src/blocks/site-header-row/render.php:78-107` — `sgs_colour_value()` pattern
- `.claude/secrets/sandybrown.env` — canary creds (gitignored, always available)

## References
D683 (native-colour retirement breaks patterns silently) · D684 (raw token → style engine emits
invalid slug) · D336 (hand-rolled deploy = 2.5h outage) · D613 (parity gate advisory + cross-file
blind) · R-31-11 (live DOM is canonical) · R-31-13 (Bean's eye co-authoritative)

## Tooling Index
| Type | Name | Used in |
|---|---|---|
| skill | /delegate | every dispatched step |
| skill | /systematic-debugging | P1-1 |
| cli | build-deploy.py --target sandybrown | all deploy steps |
| mcp | chrome-devtools | P1-1, all QC gates |
| cli | ssh hd + wp-cli | P1-1, QC gates |
| cli | /sgs-update | P2-7 |

---

# PHASE 1 — unblock filtering + independent fixes

**Ships alone. Needs no Rule 7 gate. Delivers the entire USP.**
Orchestrator does: dispatch, deploy, verify, QC, docs. It writes no implementation code.

## WAVE 1 — 3 PARALLEL (verified file-disjoint, none runs a build)

### P1-1 — Root-cause + fix `sgs/text` killing client-side navigation
- **Model:** sonnet — cross-system architectural trace
- **Files:** `plugins/sgs-blocks/src/blocks/text/render.php` (+ helpers it calls)
- **Exec:** PARALLEL with P1-2, P1-3 · **Marker:** SESSION-START · **Time:** 25 min
- **Outcome:** the exact line is named, and fixed
- **On-Fail:** revert; report the mechanism. **No speculative fix.**
- **Cold-Entry:** spec §2; `theme/sgs-theme/templates/archive-product.html:105-107`
- **Prompt:** "In c:\Users\Bean\Projects\small-giants-wp, root-cause and fix why `sgs/text`
  disables WordPress client-side navigation when rendered inside
  `woocommerce/product-collection-no-results`. ALREADY PROVEN — do not re-derive: swapping
  ONLY `sgs/text` for `wp:paragraph` in the real template flips `clientNavigationDisabled`
  from true to absent (three consistent variants). WP core sets that flag when an enhanced
  query is marked dirty. FIND THE EXACT LINE: read `src/blocks/text/render.php` and every
  helper it calls; compare against what `wp:paragraph` does NOT do. Suspects: global
  `$post`/`$wp_query` mutation, `setup_postdata()` without `wp_reset_postdata()`, a secondary
  WP_Query, a `render_block` filter side-effect. PROVE the cause before fixing — this project
  forbids fixing an unproven cause. Then fix minimally. ⛔ Do NOT deploy and do NOT run
  `npm run build` — another agent is editing build-chain files concurrently. Report: the exact
  file:line, the mechanism, the fix, and a falsifiable prediction of what the live check will
  show. The orchestrator deploys and verifies."
- **Test:** Happy: cause named with file:line · Edge: `sgs/text` still renders correctly
  outside a query loop · Fail: cause not found → report and stop · Integration: unblocks FR-38-12

### P1-2 — Fix `check-dead-pattern-attrs.py` allowlist
- **Model:** sonnet — needs correct WP supports-resolution semantics
- **Files:** `plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`
- **Exec:** PARALLEL with P1-1, P1-3 · **Time:** 25 min
- **Prompt:** "Fix `plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`. BUG: lines 55-58
  put `backgroundColor`, `textColor`, `gradient` on an UNCONDITIONAL allowlist (`NATIVE`),
  tested at `:222`, so the gate never asks whether the block enables them — ~60 orphaned
  authorings go unreported. The SAME FILE already solves this correctly for `style.*` in
  `_native_style_family_declared()` (`:170-186`); reuse that resolver. FIX: map each native
  attr to its registering supports path (`backgroundColor`→`color.background`,
  `textColor`→`color.text`, `gradient`→`color.gradients`, `fontSize`→`typography.fontSize`,
  `fontFamily`→`typography.__experimentalFontFamily`, `borderColor`→`__experimentalBorder.color`)
  and resolve truthiness: `supports.color === false` or `{background:false}` = not registered;
  `=== true` = all on; a dict = WP per-sub-key defaults (background/text true, gradients
  false). Keep `className`/`style`/`lock`/`metadata` unconditional. ⛔ CRITICAL — THE BUILD
  WILL BREAK IF YOU GET THIS WRONG: this script runs as `python
  scripts/check-dead-pattern-attrs.py --check` inside package.json's build-FAILING `&&`
  prebuild chain, UNWRAPPED. Per `:290-318`, `--check` exits 1 for the `undeclared` and
  `shape-mismatch` kinds and exits 0 for `native-style-undeclared`. Therefore emit your ~60
  new findings under a NEW, THIRD finding-kind (e.g. `native-preset-undeclared`) that is
  ADVISORY — exits 0 — following the exact precedent at `:303-318` including its explanatory
  print. Do NOT put them in `undeclared`. Add a self-test proving (a) it flags a
  declared-all-false case, (b) it does NOT flag a genuinely enabled one, (c) `--check` still
  exits 0 with only the new kind present. ⛔ Do NOT run `npm run build` — another agent is
  editing files in that chain. Run the script standalone only. Report the finding count and
  the exit code."
- **Test:** Happy: ~60 findings, exit 0 · Edge: `supports.color:true` not flagged · Fail:
  self-test proves it can fail · Integration: prebuild stays green

### P1-3 — Trace `brand-strip` colour ownership (READ-ONLY)
- **Model:** haiku — mechanical read
- **Files:** none written
- **Exec:** PARALLEL with P1-1, P1-2 · **Time:** 10 min
- **Prompt:** "READ-ONLY, edit nothing. In
  `plugins/sgs-blocks/src/blocks/brand-strip/`, determine which DOM element
  `backgroundColourHover` and `textColourHover` currently paint. Read `block.json` (declared
  attrs + `supports.sgs.elements` attrMap), `render.php` (which selector consumes them),
  `edit.js` (which panel row writes them). THE QUESTION: if we add ROOT-level
  `backgroundColour`/`textColour` with hover states, would the hover names COLLIDE with these
  existing tile-scoped attrs and silently drive tile CSS instead of the root? Answer
  definitively with file:line and recommend either (a) reuse — they are already root-scoped,
  or (b) the exact distinct names the root rows must use. If genuinely ambiguous, say so
  rather than guessing."
- **Test:** Happy: unambiguous answer with file:line · Fail: says "cannot determine" rather
  than guessing · Integration: feeds P1-6

---

## QC GATE 1 — build integrity + cause proven
- **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** P1-1..P1-3 · **Marker:** QA
- **Check:** orchestrator runs, in this order (nothing else touching the tree):
  ```bash
  cd plugins/sgs-blocks && npm run build          # exit 0 — proves P1-2 didn't red the chain
  python scripts/check-dead-pattern-attrs.py      # ~60 findings under the new advisory kind
  ```
  Plus: P1-1 reports an exact file:line cause + a falsifiable prediction.
- **Pass:** build green, findings surface, cause named
- **Fail:** build red → revert P1-2 immediately (it gates everything). Cause unproven → STOP
  the phase; P1-1 is the entire USP.
- **📝 DOCS (mandatory):** D-entry for the `sgs/text` root cause with evidence; update spec §2's
  "Not yet done" line; update `.claude/LEDGER.md`.

### P1-4 — Deploy + live-verify the `sgs/text` fix  ← ORCHESTRATOR
- **Model:** inline · **Deps:** QC-1 · **Time:** 10 min
- **Action:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
  Then on `/shop/`: confirm `clientNavigationDisabled` ABSENT, and a filter click issues a
  `fetch` with no document navigation (network log, not the emit — R-31-11).
- **On-Fail:** `.bak` rollback via the script. Never `--allow-dirty`/`--skip-verify`.
- **Test:** Happy: fetch, no doc nav · Edge: filters still return correct products · Fail:
  rollback · Integration: **first chance to confirm FR-38-12 Flip animates** — check it

---

## WAVE 2 — 6 PARALLEL (file-disjoint; none builds or deploys)

### P1-5 — Template validity fixes
- **Model:** haiku · **Files:** `theme/sgs-theme/templates/archive-product.html` · **Time:** 15 min
- **Prompt:** "Fix `theme/sgs-theme/templates/archive-product.html` — blocks failing WordPress
  validation, in two classes. CLASS 1 — 4 × `sgs/container`: hand-authored HTML comments (e.g.
  `<!-- Archive toolbar: breadcrumb + title + sort controls -->`) sit INSIDE container
  inner-content. The container's `save.js` emits `<InnerBlocks.Content/>` which produces no
  comments, so WP reports 'Expected end of content, instead saw [comment]'. FIX: move each
  such comment OUTSIDE its block, immediately ABOVE the opening `<!-- wp:sgs/container -->`.
  Keep the wording. CLASS 2 — exactly these SEVEN self-closing WooCommerce filter LEAF blocks,
  at these lines: `:52` product-filter-removable-chips, `:53` product-filter-clear-button,
  `:58` product-filter-price-slider, `:64` product-filter-chips, `:70` product-filter-chips,
  `:75` product-filter-checkbox-list, `:80` product-filter-checkbox-list. Each is authored
  self-closing (`/-->`) but its `save()` emits a div, so WP reports 'Expected <div…>, instead
  saw end of content'. FIX each to open+close with its div, e.g.
  `<!-- wp:woocommerce/product-filter-removable-chips --><div class=\"wp-block-woocommerce-product-filter-removable-chips wc-block-product-filter-removable-chips\"></div><!-- /wp:woocommerce/product-filter-removable-chips -->`.
  ⛔ Get the class list right per block — check the live rendered page or WooCommerce's own
  block registration; some carry BOTH a `wp-block-…` and a `wc-block-…` class and some carry
  only one. If you cannot determine a block's exact save markup, STOP and report which one
  rather than inventing a class. ⛔ Do NOT touch `product-filter-active`, `-price`,
  `-attribute`, `-status`, `-rating` or `product-filters` — those are ALREADY correctly
  open+close with children; editing them would double-wrap valid blocks. ⛔ Change no block
  attributes and no structure. Verify by re-reading: zero comments inside container
  inner-content, and exactly those 7 leaves converted."
- **Test:** Happy: re-read shows 7 converted, 0 stray comments · Edge: the 6 already-correct
  blocks untouched · Fail: reports rather than inventing a class · Integration: QC-2 confirms
  0 invalid blocks in the Site Editor

### P1-6 — Colour: 4 non-container blocks (4 SUB-AGENTS IN PARALLEL)
- **Model:** sonnet ×4 — one per block, 4 disjoint directories
- **Files:** `src/blocks/{hero,trust-bar,brand-strip,testimonial-slider}/**`
- **Deps:** P1-3 (brand-strip only) · **Time:** 30 min each
- **Prompt:** *(per block)* "Add root-element colour to `sgs/<BLOCK>` following the PROVEN
  recipe from `sgs/site-header-row` (commit `0b62caf9`). ⚠ CORRECTION TO A COMMON ASSUMPTION:
  this block ALREADY mounts `SgsColourPanel` — the gap is that it has no ROOT background/text
  colour attributes. (1) block.json: add `backgroundColour`, `backgroundColourGradient`,
  `backgroundColourHover`, `backgroundColourHoverGradient`, `textColour`, `textColourGradient`,
  `textColourHover`, `textColourHoverGradient` — all `{\"type\":\"string\",\"default\":\"\"}` —
  SKIPPING any that already exist. Normalise `supports.color` to every sub-flag false +
  `__experimentalSkipSerialization:true`; KEEP the key, the uniformity gate reads it. ⚠ The
  prebuild chain contains `python scripts/surveys/survey-background-colour-support.py --check`
  — run it standalone after your change and confirm it still passes; if it objects, report
  rather than working around it. (2) edit.js: add two `SgsColourPanel` rows — background using
  GRADIENT SETUP 1 (in-row per-state: each state carries `gradientValue`/`onGradientChange`,
  sibling attr `{attr}Gradient`), text using GRADIENT SETUP 2 (row `gradientCapable: true`).
  Each row has TWO states, normal + hover (golden contract `states.minimum: 2`). ⛔ Do NOT use
  GRADIENT SETUP 3 (`GradientOverlayControl`) for these — it is single-state by construction
  and cannot do hover; it is already mounted for the background-image overlay and they STACK,
  they do not compete. COPY THE SHAPE VERBATIM from `src/blocks/button/edit.js:381-470`.
  (3) render.php: consume the new attrs onto the block's ROOT element. ⛔ D684 — never pass a
  `DesignTokenPicker` value RAW to `wp_style_engine_get_styles()`: it emits the literal
  `background-color:primary;`, which the browser silently drops. Route EVERY value through
  `sgs_colour_value()` (`includes/helpers-tokens.php:580`). Canonical pattern:
  `site-header-row/render.php:78-107`. ⛔ Do NOT run `npm run build`, do NOT deploy, do NOT run
  `/sgs-update`, do NOT touch any other block, do NOT edit theme patterns — the orchestrator
  sequences those. Report every file changed and any gate that objected."
- **Test:** Happy: attrs declared, panel rows render, render.php routes via `sgs_colour_value()` ·
  Edge: unset attrs emit no rule · Fail: reports gate objection rather than working around ·
  Integration: QC-2 verifies live

### P1-7 — Theme CSS: panel visibility + fallbacks + search width
- **Model:** sonnet · **Files:** `theme/sgs-theme/assets/css/woocommerce.css`,
  `plugins/sgs-blocks/src/blocks/product-search/style.css` · **Time:** 25 min
- **Prompt:** "THREE changes. (1) `theme/sgs-theme/assets/css/woocommerce.css:460-467` —
  `.sgs-shop-filters` is invisible because `background: var(--wp--preset--color--surface)`
  resolves to `#fbf3dc`, IDENTICAL to the live body background, and its border uses
  `surface-alt` (`#fff9f0`) at 1.06:1. This is a FRAMEWORK-DEFAULT bug (theme.json's own
  defaults are 1.08:1), not client-specific. FIX: add two derived tokens —
  `--sgs-elevation-1: color-mix(in oklab, var(--wp--preset--color--surface) 92%,
  var(--wp--preset--color--text) 8%)` and `--sgs-elevation-line: color-mix(in oklab,
  var(--wp--preset--color--surface) 78%, var(--wp--preset--color--text) 22%)` — mixing toward
  `text` NOT black, so a dark palette gets a LIGHTER panel automatically. Use elevation-1 as
  the panel background; add `box-shadow: 0 1px 3px rgb(0 0 0/.08), 0 0 0 1px
  var(--sgs-elevation-line)` so separation survives ANY palette. Switch the border to the real
  `border` token, not `surface-alt`. (2) Same file — delete the teal fallback VALUES inside
  `var()` calls: `#0f7e80` and `#0b6668` (~47 occurrences). They match neither this client's
  palette NOR theme.json's own primary (`#1F7A7A`), so they can never be correct; a fallback
  must equal the theme default or be absent. Where removing leaves a bare `var()` on a focus
  outline, use `currentColor`. ⚠ Leave `#e0e0e0` alone — it is a neutral, not a brand colour,
  and is out of scope. (3) `plugins/sgs-blocks/src/blocks/product-search/style.css` — the
  `inline` display mode has NO width cap while its input is `flex:1`, so it eats the full
  1200px band. Add `max-width: min(680px, 100%)` to the INLINE mode only; its siblings already
  have caps (`min(320px,90vw)`, `min(480px,92vw)`, `min(600px,92vw)`) — match that style. ⛔ Do
  NOT touch the chip row at `:648-660`: `flex-wrap:nowrap` there is a DELIBERATE horizontal
  scroll pattern (`overflow-x:auto`, `-webkit-overflow-scrolling:touch`, hidden scrollbar,
  documented by its own comment). An earlier draft of this plan wrongly called it a bug. ⛔ Do
  NOT build or deploy. Report every rule changed."
- **Test:** Happy: tokens present, fallbacks gone, search capped · Edge: focus outlines still
  visible · Fail: revert · Integration: QC-2 verifies at 3 widths

### P1-8 — Mobile filter sheet + a11y
- **Model:** sonnet · **Files:** `theme/sgs-theme/assets/js/sgs-shop-filters.js`,
  `theme/sgs-theme/assets/css/woocommerce.css`
- **Exec:** ⚠ **SEQUENTIAL after P1-7** — shares `woocommerce.css` · **Time:** 35 min
- **Prompt:** "Rebuild the mobile filter drawer as a native `<dialog>` bottom sheet. WHY:
  `plugins/sgs-blocks/src/blocks/container/style.css:63` has `.sgs-container > *:not(…)×6
  {position:relative;z-index:1}` at specificity (0,7,0), which DEFEATS the drawer's
  `position:fixed;z-index:9999` (0,2,1) — confirmed live, the panel computes
  `position:relative;z-index:1`. `.sgs-shop-layout` also creates a stacking context, so a
  z-index bump CANNOT work. `<dialog>.showModal()` renders in the TOP LAYER, above every
  stacking context — sidestepping the fight and giving focus trap, Escape, focus restoration
  and inert background for free. ⛔ Do NOT edit `container/style.css`; that is a separate gated
  workstream. CURRENT STATE: `assets/js/sgs-shop-filters.js` (172 lines) is correct in intent —
  DELETE its hand-rolled backdrop (use `::backdrop`) and hand-rolled focus trap (native).
  CRITICAL BUG: the closed drawer has 26 keyboard-tabbable controls because it is hidden by
  `transform` alone — no `hidden`, no `inert`, no `display:none`. A `<dialog>` without `open`
  is `display:none` by UA stylesheet, fixing this structurally. A11Y (WAI-ARIA APG Dialog
  Modal): trigger gets `aria-expanded`/`aria-controls`/`aria-haspopup=\"dialog\"`, ≥44px;
  dialog gets `aria-labelledby` → the existing visible `<h2 class=\"sgs-shop-filters__heading\">`
  (NOT aria-label); on open move focus to that heading (`tabindex=\"-1\"`), not the close
  button; keep the body scroll lock and the reduced-motion suppression at `woocommerce.css:704`.
  PRESENTATION: bottom sheet, full viewport width, ~85vh, sticky footer with a full-width
  primary action and a lighter-weight 'Clear all'. Sticky trigger (`position:sticky;bottom:0`)
  with an active-filter count, appearing after ~1 viewport of scroll, its height reserved so
  the last product row is not occluded. Above 782px the SAME element must present as today's
  in-flow sidebar — one DOM, two presentations. ⛔ Do NOT build or deploy — report a
  falsifiable prediction of what the orchestrator's live check at 390px will show."
- **Test:** Happy: sheet opens, Escape closes, focus restored · Edge: ≥782px still an in-flow
  sidebar · Fail: `document.querySelectorAll('#sgs-shop-filters :is(a,button,input,select,textarea,[tabindex]):not([tabindex="-1"])').length === 0`
  while closed · Integration: header/nav dialogs unaffected

---

## QC GATE 2 — Phase 1 close  ← ORCHESTRATOR
- **Model:** inline · **Deps:** P1-5..P1-8 · **Marker:** QA + HANDOFF
- **Check:** `npm run build` → deploy → on the canary at **1440 / 768 / 390**:
  - 0 invalid blocks in the Site Editor
  - filter panel visibly distinct from the page background
  - search bar ≤680px
  - drawer opens as a sheet; Escape closes; focus returns to trigger
  - closed-drawer tabbable count `=== 0`
  - 4 colour blocks: pick a swatch in the editor → computed style resolves on the frontend
  - ⚠ gradients have NEVER been observed working here — if a gradient toggle does nothing,
    record it as a finding, do not call it a pass
- **Fail:** revert the single offending step (one concern per deploy)
- **📝 DOCS:** D-entries for the colour migrations + drawer rebuild; spec status; LEDGER;
  then `/handoff`.

---

# PHASE 2 — container spine + rename + gates

**Do not start until G1 and G2 are answered.** All of P2-1..P2-4 touch `sgs/container` and
run **strictly sequentially**.

| Step | Model | Action | Deps |
|---|---|---|---|
| **P2-1** | sonnet | Band max-width off the outer element: make `$has_band_props` object-aware so `$do_wrap` flips and `.sgs-container__inner` renders; give `contentWidth` its own band selector; add the unhandled `narrow` token | — |
| **P2-2** | haiku | `layout` default per **G1**; align block.json `""` with `LayoutPanel.js`'s `'stack'` so untouched blocks stop emitting `sgs-container--` | P2-1, G1 |
| **P2-3** | sonnet | Container root colour, routed per **G2**; delete dead `textColor`/`backgroundColor` reads at `render.php:88-99`; fix `elements.wrapper.attrMap` off `native:*` | P2-2, G2 |
| **P2-4** | sonnet | Editor preview parity — mirror `render.php`'s scoped-CSS emission in `edit.js`. ⛔ `ServerSideRender` NOT viable (`useInnerBlocksProps` host) | P2-3 |
| **P2-5** | sonnet | Responsive grid: `repeat(auto-fill, minmax(max(var(--min-col,250px), computed), 1fr))` + `minColumnWidth` as an editor-settable attr | none (PARALLEL with P2-1..4) |
| **P2-6** | sonnet | **Pattern rename — MOVED HERE.** ~280 `wp:sgs/*` authorings American→British. ⚠ Must run AFTER P2-3 or container patterns lose their background | **P2-3** |
| **P2-7** | inline | `/sgs-update` reseed. ⚠ Cross-track — breaks other worktrees' DB gate until their classifier lands. Announce first | P2-6 |
| ~~P2-8~~ | — | **MOVED TO PHASE 1 as P1-1b** per D542 ("if an item touches more than ~3 blocks, the first deliverable is the detector, not the edit" — this touches 71). Building it first means it FLAGS the container, then P2-4 fixes it, then the count drops by one — a real before/after instead of an eyeball. | — |
| **P2-9** | haiku | `<main>` landmark — re-admit `main` to the tagName enum or wrap the template, whichever P2-1's outcome makes cleaner. **Orchestrator decides which; do not hand this choice to the agent** | P2-1 |

**QC GATE 3** (after P2-4): container behaviour — background paints edge-to-edge with NO
`align:"full"`; inspector controls move the canvas; every wrapper-mirroring composite (hero,
cta-section, card-grid) re-checked live. **📝 DOCS.**

**QC GATE 4** (after P2-9): full close — grid reflows 3→2→1, `minColumnWidth` effective;
patterns still paint (3 samples + a client page); `<main>` present once; build green with all
gates; **Bean's eye (R-31-13)**. **📝 DOCS + `/handoff`.**

---

## Key Judgement Calls

- **G1 — `flexDirection` default.** Options: `flex`+`column` / `flex`+row / keep `stack`.
  **Recommend `flex`+`column`.** Row inverts every container's layout on every client site.
  **Bean decides.**
- **G2 — container colour routing.** Options: `SGS_Container_Wrapper` / block-private.
  **Recommend the wrapper** — container IS the canonical wrapper; block-private forks the
  mechanism permanently. **Bean decides (Rule 7).**
- **Scope of the `container/style.css:63` rewrite.** This plan ships only the `<dialog>`
  route-around. The rule rewrite needs an offsetParent census across 43 files plus a negative
  control — **its own phase.** Bean already leaned "both, sequenced"; this is the sequencing.

## Pre-emptive Decisions (Hidden Decisions pass — both reviewers)

- **Advisory finding-kind for P1-2** — must be a NEW third kind exiting 0, not `undeclared`.
  Pre-answered in the prompt. *(both reviewers)*
- **Which WC filter blocks are self-closing** — exactly 7, named with line numbers.
  *(reviewer B)*
- **Chip `nowrap` is deliberate** — change dropped. *(reviewer B)*
- **Deploys are orchestrator-owned** — no implementation step deploys or builds. *(both)*
- **P2-9's landmark route is an orchestrator decision**, not a haiku agent's. *(reviewer A)*
- **Branch discipline** — `main` for framework; `sites/indus-foods/` portion of P2-6 on its own
  branch; verify branch in the same command as every commit. *(reviewer B)*

---

# G1 + G2 CLOSED — Bean's rulings, 2026-08-20

## G2 — container root colour routing: **SGS_Container_Wrapper** ✅ DECIDED

Bean chose the shared wrapper. Container IS the canonical wrapper; a block-private path would
fork the colour mechanism permanently, which the composite-mirror rule exists to prevent.
Rule 7 gate is hereby SATISFIED for P2-3.

## G1 — flex direction default: **`row`** ✅ DECIDED (Bean overruled the recommendation)

Bean's ruling, verbatim intent: *leave the default direction as the CSS default, which is
`row`, and allow this setting to be changed based on what a person wants.*

**This overrules the earlier `column` recommendation.** Do not re-litigate in implementation.
A design council was commissioned to stress-test it — findings appended below when they land;
they inform mitigation, they do not reopen the decision.

### Measured blast radius (nesting-aware parse of the real repo, supersedes an earlier crude grep)

| Figure | Value |
|---|---|
| `sgs/container` instances in `theme/sgs-theme/{patterns,templates,parts}` | **138** |
| ...inheriting the layout default (no explicit `layout` key) | **113** |
| ...of those, 0 or 1 direct child → direction visually irrelevant | **37** |
| ...of those, **2+ direct children → would visibly flip to side-by-side** | **76** |
| breakdown of the 76 | 35×2 children · 17×3 · 11×4 · 13×5+ |
| client-site containers in `sites/` | **additional, uncounted** |
| containers stored in the WP database (live/edited pages) | **not measurable from the repo** |

⚠ An earlier figure of "276 authorings / 251 inheriting" was a crude grep that double-counted
closing tags. **138 / 113 is the accurate, nesting-aware count.** Use these numbers.

**Mechanism (the load-bearing fact):** WordPress only writes an attribute into block markup
when it differs from the default. An unset `layout` means no `layout` key exists, so
block.json's default applies at render — every time. A default change is therefore
**retroactive across every instance that never set it**, including content in the database
that no repo grep can see.

### Implementation consequence

`layout` default → `"flex"`; `flexDirection` default stays `""` (→ CSS `row`).
**76 known theme sections will need a visual triage pass**, plus an unknown number on client
sites and in the DB. That triage is a required, scheduled step — not a "watch and see".

## Settled flex decisions (full set)

| Item | Decision |
|---|---|
| `layout` default | **`flex`** |
| `flexDirection` default | **`row`** (CSS default) — Bean, overruling `column` |
| `flex-wrap` | **unchanged** — keep SGS's forced `wrap` override |
| `align-content` in flex mode | **ADD** — currently grid-only (control gated at `LayoutPanel.js:207`, emission in the grid branch only). Per the CSS-Tricks guide it is valid on multi-line flex containers, and since SGS forces `wrap` every flex container IS multi-line. Real missing capability. |
| child `flex` grow/shrink/basis controls | **DROPPED** — Bean correctly identified this as duplicating the existing `columns` (`{desktop:2,tablet:2,mobile:1}`) and `gridTemplateColumns` attributes. Division of labour: **grid** = explicit tracks/controlled widths; **flex** = items size to content and wrap. |
| margin-collapsing | flex does not collapse margins; expect small vertical shifts. Folded into the same triage pass. |

**Parked (not building):** one child absorbing leftover space while siblings stay
content-sized (e.g. fixed logo + filling nav). Genuinely not expressible via `columns`, but
niche — revisit only if a real build needs it.

## G1 design council — 3 seats, findings

Commissioned because Bean overruled the `column` recommendation. **Outcome: Bean's `row`
choice is CORRECT, confirmed on two independent grounds neither the recommendation nor the
column seat had identified.**

### Vindication 1 — `stack` is ALREADY flex-column (verified live)

`plugins/sgs-blocks/src/blocks/container/style.css:75-78`:
```css
.sgs-container--stack { display: flex; flex-direction: column; }
```
Class emitted as `sgs-container--{layout}` (`class-sgs-container-wrapper.php:1104`).

**So `flex` defaulting to `column` would render IDENTICALLY to `stack`** — two names, one
behaviour, unreadable authoring intent. Bean's vocabulary is the coherent one:
`stack` = column · `flex` = row · `grid` = tracks. Orthogonal and self-documenting.

⚠ **CORRECTION TO THIS DOC'S OWN EARLIER CLAIM:** it stated (repeatedly, from an agent report)
that `stack` = "plain block flow, no display emitted". **That is FALSE.** `stack` has always
been flex-column via the class. That error is precisely what made `column` look sensible.

### Vindication 2 — `row` is LESS retroactive than `column`, not more

`class-sgs-container-wrapper.php:1003-1015` emits `display:flex` + `flex-wrap:wrap`
unconditionally, but `flex-direction` **only when `'' !== $flex_direction`**.

- **`row`** → leave `flexDirection` default at `""`. **ONE** retroactive change (`layout`).
- **`column`** → requires a **SECOND** retroactive change (`flexDirection` `""` → `"column"`),
  which additionally flips **every existing explicit `layout:flex` container that never set a
  direction — 7 of 9 in the theme** — plus every converter-emitted one. `row` leaves those
  entirely alone.

Column was the *more* dangerous option. Both the recommendation and the column seat had this
backwards.

### The real risk is NOT the repo — it is the database

| Surface | Count | In repo? |
|---|---|---|
| `theme/sgs-theme/` container instances | 138 (22 with explicit `layout`) | yes |
| `sites/` client instances | **2** — negligible | yes |
| **Canary DB posts containing `wp:sgs/container`** | **32 of 171 posts** | **NO** |
| Canary DB posts containing `sgs/hero` / `sgs/feature-grid` | **37** | **NO** |

One canary alone carries DB-resident authorings comparable to the entire theme count. Every
client site multiplies it. Per-instance counts could not be extracted cleanly (Hostinger's
`wp db query` swallowed the aggregate) — **deliberately not estimated.**

### The composite-mirror rule widens the blast radius

Also declare `"layout": {"default": ""}` and are therefore pulled in by R-31-9:
**`sgs/hero`, `sgs/feature-grid`, `sgs/form`**.
Immune (non-empty defaults): `trust-bar` (`grid`), `site-header-row` (`flex`),
`site-footer-row` (`grid`), `testimonial-slider` (`full`).

### ⚠ This is NOT a one-time migration — the converter makes it permanent

`plugins/sgs-blocks/scripts/orchestrator/converter/services/arrangement.py:82-91` returns `{}`
for any node that is not an arrangement layer. **Every future clone of a plain block-flow draft
section emits no `layout` attribute and silently inherits the new default.** This is a
permanent behaviour change in the core cloning product, not a migration with an end date.

### THIRD OPTION the framing excluded — "bump the attribute, not the default"

Keep `layout` default `""`; have the **editor insert `"layout":"flex"` explicitly on
newly-inserted containers**. New authorings get flex; every stored instance (repo AND
database) keeps its current rendering; the converter path is untouched. **Achieves the stated
goal with zero retroactivity.**
→ **NEEDS BEAN'S RULING — his `row` decision answered direction, not whether to change the
default at all.**

Other options assessed and rejected on evidence: `containerKind`-aware default (container
itself has no kind, so the discriminator never reaches the 138); per-client
`theme-snapshot.json` opt-in (violates R-31-3/R-31-9, two behaviours forever).

### Required before shipping ANY default change

1. **DB census across every live install**, not just the canary — total and
   default-inheriting counts. Ship nothing until that number exists.
2. `arrangement.py` explicitly emits `layout` for non-arrangement nodes, or the default change
   is refused.
3. Before/after `computed-parity.json` at 375 / 768 / 1440.
4. **Rollback trigger:** any container whose children's `getBoundingClientRect().top` values
   become equal where they previously differed. One instance = revert.
