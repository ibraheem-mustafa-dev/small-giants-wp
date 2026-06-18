---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
title: "Exact-match width model — literal outer max-width on a NEW attr, via the shared container wrapper"
created: 2026-06-17
revised: 2026-06-18
version: 0.3 (Bean-locked — name-match maxWidth, no new attr; +contentWidth fix folded in; ground-truth: keyword maxWidth is vestigial)
status: DESIGN v0.3 — Bean-approved, BUILDING (orchestrated; council must-fixes folded in)
council_register: inline §9 (this doc)
binding_rules: R-22-1, R-22-8, R-22-9, R-22-11, R-22-13, R-22-15
related_memory: clean-up-superseded-controls-on-block-changes, dual-key-fallback-beats-shared-default-flip, wrapper-hardcoded-defaults-are-cheats-to-remove-not-blockers, duplicated-calculation-drifts, converter-attr-must-match-the-attr-render-reads, device-tier-vs-visual-breakpoints-are-distinct
blast_radius: SHARED — class-sgs-container-wrapper.php (30 composites + every sgs/container) + container block.json + edit.js + ContainerWrapperControls.js + deprecated.js + converter width path
---

# Exact-match width model (v0.2)

## 0. Plain English (what + why)

**What.** A cloned section's OUTER width should render the **exact** `max-width` the draft specified — `max-width:800px` in the draft paints at 800px on the live page, at every screen size, not rounded to the theme's nearest preset.

**Why.** Today the converter snaps any width within 5% of a theme preset to that preset and renders the theme's value, not the draft's — the measurement-vs-eye rule in code form. Bean's directive (2026-06-17): "use max-width exactly like the draft; CSS should be an exact match." Bean's architectural steer (2026-06-18): **the outer `max-width` is a literal; the named-token presets (content/wide/full) belong conceptually to the content-width band, not the outer box.**

## 0a. What changed from v0.1 (why this revision exists)

v0.1 was sent to a 6-persona adversarial council (cynic / spec-lawyer / ship-PM / WP-render-correctness / support-realist / converter-DB-integrity). **Verdict: NO-GO as written**, on a convergent (5/6) keystone finding: v0.1 assumed the existing `maxWidth` attr was free to reuse. **It is not** — `maxWidth` is a LIVE attr holding keyword values (`content`/`wide`/`full`) that drive the CSS class `sgs-container--width-<value>` (wrapper:575-577, edit.js:142, deprecated.js:283, style.css:59-73). Repurposing it to a literal length would emit `sgs-container--width-800px` (no matching CSS → width silently vanishes + centring lost) and invalidate every saved block carrying `maxWidth:"wide"` in the editor. v0.2 uses a NEW attr and folds in all 7 must-fixes (§9).

## 0b. v0.3 LOCKED DECISIONS (Bean, 2026-06-18 — supersede v0.2 where they conflict)

v0.2 proposed a NEW `outerMaxWidth` attr to avoid the occupied `maxWidth`. Bean overruled: **use `maxWidth` directly, name-matched to the draft's `max-width` — no new attr.** Ground-truth re-check VALIDATES this and downgrades the council's MF-1 from "fatal migration" to "small deprecation":
- `maxWidth` block.json default is **`''`** (empty), not a keyword (the council read an OLD deprecated.js default of `'wide'`).
- **No inspector control writes `maxWidth`** (`ContainerWrapperControls.js` never touches it; `edit.js` only reads it to build a class). The converter never emits it for containers.
- The keyword classes `.sgs-container--width-content/wide/full` (style.css:59-73) render the **same theme tokens** that `widthMode:default/wide/full` already render — so the keyword `maxWidth` system is **redundant, vestigial leftover**, not a live width control.

**Therefore (v0.3):**
1. **`maxWidth` (existing string attr) → the literal outer max-width**, name-matched to draft `max-width`. No new attr. Add `maxWidthTablet`/`maxWidthMobile` for responsive (scope IN, via 767/1023 selectors).
2. **Retire the vestigial keyword class system** (`sgs-container--width-content/wide/full` emission at edit.js:142 / save / deprecated.js:283 + the style.css rules). `widthMode` already owns presets. = the "one control per setting, no orphans" rule.
3. **Migration (the council's surviving point, now small):** a `deprecated.js` entry maps any genuinely-old saved `maxWidth:"content"/"wide"/"full"` → `widthMode:"default"/"wide"/"full"` (identical render) + `maxWidth:""`. Exact mapping, zero visible change, no editor invalidation.
4. **contentWidth folded in (Bean: "do it now, fit the current setup").** contentWidth is ALREADY exact: the converter (`_lift_content_band_max_width`, convert.py:5814) writes the band max-width **verbatim** (resolves `var()`, no snap, no truncation); the wrapper renders it as a literal. The ONLY fix: the **base** sanitiser (`preg_replace('/[^A-Za-z0-9.%]/','')`, wrapper:196) mangles `calc()`/`clamp()` and differs from the **tablet/mobile** sanitiser `$sgs_css_length()` (wrapper:274-275) → **unify base onto `$sgs_css_length()`** so all three tiers are consistent. No converter change for contentWidth.

Everywhere below that v0.2 says `outerMaxWidth`, read `maxWidth` (the literal lives on the existing attr per v0.3 §0b.1).

## 0c. v0.3 SIMPLIFICATIONS (Bean, 2026-06-18 — theme NOT live)

- **No deprecation, no dual-key fallback (theme isn't live → no saved content to protect).** Council MF-4 dissolves. **DELETE outright:** the vestigial keyword-class system (`sgs-container--width-content/wide/full` in style.css + the class build at edit.js:142 / save.js / deprecated.js:283) AND the `customWidth`/`customWidthUnit` attrs+controls+render (converter already stopped writing them in Unit 1). No migration, no `?? customWidth` fallback. The wrapper resolves width as `maxWidth (literal) | widthMode-token` only.
- **WP best-practice check (`/library-docs`, WordPress Gutenberg docs):** WP has NO native `max-width` support (`supports.dimensions` covers width/minWidth/height/minHeight/aspectRatio, not max-width) → a custom `maxWidth` string attr rendering inline `max-width` is necessary + correct. The token presets (content/wide) duplicate WP-native `layout:constrained` + `align:wide/full`, but re-platforming `widthMode` onto native layout is a separate, out-of-scope job. Verdict: this change is good practice; the custom literal attr is the right tool.

BUILD STATUS: Unit 1 SHIPPED (uncommitted) — block.json `maxWidthTablet`/`Mobile` attrs + convert.py exact-snap (≤1px) + verbatim-literal `maxWidth` emit on section + R1 paths; both conformance suites green; no golden re-baselines. Responsive EMISSION flagged (converter doesn't read per-breakpoint max-width yet — a later unit).

## 0d. v0.4 MODEL — widthMode RETIRED; two independent layers (Bean-locked 2026-06-18)

The v0.3 build wired `widthMode` onto the OUTER box — WRONG. Bean's corrected model: `widthMode` is retired entirely; the two width layers are fully independent.

**Two settings, no overlap:**
| Setting | Layer | Values |
|---|---|---|
| `maxWidth` | OUTER box edge | a **literal** CSS length (e.g. `800px`) or empty → full-width outer. NOTHING else (no token). |
| `contentWidth` | INNER content band | a **token-name** OR a **literal** CSS length. |

**Content-band tokens (RENAMED — Bean):**
| New token | Renders | Old name | Note |
|---|---|---|---|
| `narrow` | `var(--wp--style--global--content-size)` (~780px) | `default` | rarely-useful blog width |
| `default` | `var(--wp--style--global--wide-size)` (~1200px) | `wide` | **the new default value** |
| `full` | no inner cap | `full` | unchanged |
| *(literal)* | the exact value | — | overrides the token |

- **`contentWidth` default value = `default`** (= wide-size ~1200px), NEVER narrow.
- The token rename is SGS-facing labels only — `narrow`/`default` still map to the existing theme.json `content-size`/`wide-size` globals; theme.json values unchanged.

**Converter (v0.4):** outer max-width → `maxWidth` literal (NO theme-snap — the outer is always literal or absent); content band → `contentWidth` exact literal (fidelity). Tokens are authoring presets; the converter emits literals. NO `widthMode` emitted.

**Editor UX (Bean):** the literal inputs are **`UnitControl`-style** (number field + unit dropdown px/rem/em/%/vw — like the gap/font-size controls), NOT a raw text box. Stored value stays a CSS-length string; the control splits/composes number+unit for display. The `maxWidth` control = a `UnitControl`. The `contentWidth` control = a preset selector (`narrow`/`default`/`full`/`custom`) where `custom` reveals a `UnitControl`. Plus responsive tiers.

**Rework scope (nothing committed):** block.json (delete widthMode* attrs; contentWidth enum+literal default `default`; keep maxWidth), wrapper (delete widthMode render; contentWidth token-or-literal on band; maxWidth outer literal), converter (outer→maxWidth literal no-snap; band→contentWidth literal; no widthMode), editor (UnitControl UX, remove widthMode dropdown). The v0.3 maxWidth-literal OUTER layer + the responsive specificity fix REMAIN CORRECT and are kept.

## 0e. v0.4 BREAKOUT resolution + scope grounding (Bean-locked 2026-06-18)

**widthMode did TWO jobs:** outer width value (→ `maxWidth`/`contentWidth`) AND breakout alignment (the `alignwide`/`alignfull` classes). Breakout moves to **WP-native `align`** — the container already declares `supports.align:['wide','full']`. So the 3-layer model:
- **`align`** (WP-native, supports.align — toolbar control, no custom UI needed): breakout `full`/`wide`/none.
- **`maxWidth`** (literal): outer box cap.
- **`contentWidth`** (token `narrow`/`default`/`full` or literal): inner band.

**Grounding (verified, de-risks the rework):** the 8 composite `render.php` that "reference widthMode" do so ONLY in comments/docblocks — all delegate to `SGS_Container_Wrapper`, none have bespoke widthMode logic. The 30 block.json widthMode declarations are vestigial mirror-decls. **Real change surface = converter + shared wrapper + shared editor control + container block.json.** The 30 vestigial block.json decls + 8 stale comments = a DEFERRED cosmetic sweep (harmless: declared-but-never-read/set).

**Converter v0.4:** no outer max-width → `align:"full"` (breakout, replaces the old `widthMode:"full"`); outer max-width present → `maxWidth` literal (constrained, no align); content band → `contentWidth` literal (existing `_lift_content_band_max_width`). NO `widthMode` emitted. The old `_match_theme_width` snap is dropped for the outer entirely.

**Wrapper v0.4:** remove widthMode reads + widthMode→max-width branches + widthMode→align classes. ADD: read WP-native `align` attr → emit `alignwide`/`alignfull`. OUTER = `maxWidth` literal only (keep the responsive-deferral fix). CONTENT band = `contentWidth` resolved as token-or-literal (`narrow`→content-size var, `default`→wide-size var, `full`→none, literal→sanitised value), default `default`.

## 1. The three exact-match losses (ground-truth, verified against code)

1. **5% snap (converter).** `_WIDTH_MATCH_TOLERANCE_PCT = 5.0` (`convert.py:60`). `_match_theme_width` (`convert.py:1483-1497`) collapses any draft `max-width` within 5% of theme contentSize (780px) / wideSize (1200px) to `widthMode:default`/`wide`. Called at **THREE** sites: `:1546` (`_lift_core_block_style`), `:4553` (slug-None section path), `:4658` (R1 path).
2. **Theme-var indirection (wrapper).** `class-sgs-container-wrapper.php:907-916`: `default`/`wide` render `var(--wp--style--global--content-size/wide-size)` — the theme's value, never the draft's.
3. **Decimal truncation.** Converter `int(float(...))` at **TWO** sites (`:4560` AND `:4665` — duplicated; memory `duplicated-calculation-drifts`) + PHP `absint(customWidth)` (`:298`).

## 2. Schema ground-truth (DB-enumerated + USAGE-enumerated, R-22-8)

`sgs/container` width attrs TODAY, with how each is actually consumed (the usage column is what v0.1 missed):

| attr | type | slot | **how it's used in render today** |
|------|------|------|-----------------------------------|
| `widthMode` (+Mobile/Tablet/Desktop) | string | width | enum full/default/wide/custom; full→`max-width:none`, default/wide→theme var, custom→`customWidth` (wrapper:905-919) |
| `customWidth` | number | None | the value for `widthMode:custom`; `absint()` truncates (wrapper:298,584,915) |
| `customWidthUnit` | string | None | unit companion for customWidth |
| `maxWidth` | string | max | **OCCUPIED — keyword `content`/`wide`/`full` → CSS class `sgs-container--width-<value>` (wrapper:575, edit.js:142, deprecated.js:283, style.css:59-73). NOT free.** |
| `style.dimensions.maxWidth` | string | (WP-native) | a SEPARATE inline `max-width:` literal path (wrapper:589-592) — a 4th width source |
| `contentWidth` (+Mobile/Tablet) | string | content | L2 inner band — token-preset behaviour conceptually lives here (Bean) — **OUT OF SCOPE this change** |

**Decision (Q1, Bean):** introduce a NEW string attr **`outerMaxWidth`** (+ `outerMaxWidthTablet`, `outerMaxWidthMobile`) for the literal outer width. Leave the keyword `maxWidth` system untouched. `contentWidth` (the named-token home) stays out of scope.

## 3. The model (v0.2)

1. **`outerMaxWidth` (new string attr) = the literal outer width.** Exact, decimal-safe, unit-preserving. Plus `outerMaxWidthTablet`/`outerMaxWidthMobile` for responsive (Q2 — scope IN).
2. **`widthMode` stays as the editor preset layer (theme tokens kept — useful):** `full`→`max-width:none`; `default`/`wide`→theme tokens (clients who want theme-linked widths); `custom`→renders the resolved literal.
3. **ONE dedicated container width writer (MF-3 — no double-emit).** The slug-None section path (`convert.py:4545-4561`) is rewritten to a single width resolver that:
   - `max-width` absent → `widthMode:full`
   - `max-width` **exactly** equals theme contentSize/wideSize (**absolute |draft_px − theme_px| ≤ 1px**, both already in px; cross-unit comparison out of scope → falls to custom) → `widthMode:default`/`wide`
   - else → `widthMode:custom` + `outerMaxWidth=<verbatim value+unit string, decimals preserved>`
   - writes the literal to `outerMaxWidth` ONLY; does NOT also write `customWidth`. `max-width` STAYS in `_LIFT_EXCLUDED_PROPS` so the generic lift never double-handles it (DB-Integrity MF-A/MF-B). `allow_max_width` remains text-leaf-only (it's `number`-typed on sgs/text & sgs/media — never flip it globally).
   - The 5% tolerance + both `int(float())` truncations are retired at all 3 converter sites (1546/4553/4658) coherently.
4. **Wrapper render — dual-key fallback wired at ALL emit sites (MF-2, MF-5; memory `dual-key-fallback-beats-shared-default-flip`).** A single resolved value used at the base emit (`:580-587`), the responsive helper (`:905-919`), AND reconciled with the `style.dimensions.maxWidth` path (`:589-592`):
   - resolution order, `widthMode:full` short-circuits FIRST (DB-Integrity MF-C): `full → max-width:none`; `custom → outerMaxWidth ?? (customWidth+customWidthUnit) ?? '' `; `default/wide → theme token`.
   - **non-empty (falsy) test, not null-only** (Spec-Lawyer MF-3): emit only when the resolved string is non-empty.
   - **empty-custom guard (MF-5):** `custom` + empty resolved width → `max-width:none` (preserve visibility), never `max-width:` .
   - **sanitise** the literal through `$sgs_css_length()` (wrapper:211) before it enters a declaration — `outerMaxWidth` is draft-sourced untrusted text (CSS-injection hole, WP-Render/Spec-Lawyer).
5. **Responsive literal (Q2 — scope IN).** `outerMaxWidthTablet`/`outerMaxWidthMobile` route through the wrapper's EXISTING device-tier selectors at **767/1023** (`:921-938`) — same device standard, no new breakpoints (memory `device-tier-vs-visual-breakpoints-are-distinct`). Converter maps draft `@media` device-tier thresholds to these tiers.
6. **`customWidth` retirement DEFERRED (MF-4, scope — Ship-PM/Cynic/Spec-Lawyer converge).** Keep `customWidth`+`customWidthUnit` in `block.json` `attributes` (NOT deleted), remove only their inspector control, render-side fallback reads them for old content. Add a `deprecated.js` entry reproducing the current save shape so old markup doesn't invalidate. Actually deleting `customWidth` is a later cleanup pass — not this change.
7. **Inspector reads via the fallback (MF-6).** `edit.js` + `ContainerWrapperControls.js`: the custom-width field DISPLAYS `outerMaxWidth || (customWidth+customWidthUnit)` so old blocks show their real width, not an empty ghost field. (These two files ARE in the blast radius — v0.1 missed them.)

## 4. Universality + the no-hardcoding stance (R-22-9, R-22-1)

One shared wrapper + one dedicated converter resolver, zero per-block branches; the 30 composites inherit via `SGS_Container_Wrapper`. The retired 5% snap is a hardcoded approximation default — removing it is a no-hardcoding fix (memory `wrapper-hardcoded-defaults-are-cheats-to-remove-not-blockers`), not a blocker.

## 5. Trade-offs to record (council SHOULD-FIX, so the next dev doesn't "fix" them back)

- **Exact-literal sections opt out of per-client width re-theming.** A literal `max-width:781px` no longer follows a client's theme.json contentSize change (WP-Render SF-2). Correct for exact-match; documented here so it's a known, intentional trade-off against the per-client theming model.
- **Box-sizing.** Outer `max-width` reproduces the draft only if box-sizing matches; WP blocks default `border-box`. Closing gate asserts `getComputedStyle(el).boxSizing==='border-box'` and the draft matches (WP-Render SF-1).
- **Retiring the snap surfaces "true" widths.** A sloppy draft `max-width:820px` previously snapped to 780; now renders 820 (Support SF-3 / Spec-Lawyer). Per measurement-vs-eye, faithful-to-draft is correct; the ≤1px exact token-match keeps genuine 780/1200 drafts bound to the token. Recorded as a decision; visual-scan the canary for previously-snapped sections after deploy.
- **Re-clone clobbers client width edits** (Support M-4) — pre-existing behaviour, noted: clients must not re-clone after editing.

## 6. Blast radius + verification

- **Files:** `class-sgs-container-wrapper.php` (resolver + 3 emit sites + sanitiser), `sgs/container` block.json (add `outerMaxWidth*`, hide customWidth control, deprecation), `edit.js` + `ContainerWrapperControls.js` (control + display), `deprecated.js` (preserve old save), converter (`convert.py` resolver at 4545-4561 + retire snap at 1546/4553/4658 + dedup truncation 4560/4665).
- **Conformance fixture (Gate A):** a section `max-width:800px` (non-theme) asserting emit = `widthMode:custom` + `outerMaxWidth:"800px"` + NO `customWidth`; a responsive fixture asserting `outerMaxWidthMobile`.
- **Closing gate (R-22-11 + R-22-13):** live computed-style on the canary at 375/768/1440 — (a) a custom-width section: computed `max-width` == exact draft value; (b) the brand section (`full`): still `max-width:none`; (c) a `default` section: computed == theme token; (d) **an EXISTING `customWidth`-authored block: record computed `max-width` pre-deploy, redeploy, confirm unchanged** (the back-compat proof — Support MF-4) — plus Bean's eye on a cropped pair.

## 7. Sequencing

Bean-decided: build NOW (council-gated), before the Phase F foundation; verify by live computed-style on the canary. Phase F's render-oracle (canary-only) comes after and retro-covers this as a regression test.

## 8. Build orchestration (memory `main-agent-orchestrates-subagents-implement`)

Opus orchestrates (plan/delegate/QC/live-test/commit); subagents implement (no commit authority, no shared-file writes, return uncommitted). Per-commit: BOTH conformance suites (Gate A `tests/test_converter_conformance.py` + `converter_v2/tests/` — they diverge, run both), path-scoped commit, a passing `reports/visual-diff/<block>-<date>.md`, D-ceiling check (→ D229, next is D230). `/qc-council` before the converter/wrapper commit (blub 255).

## 9. Council must-fix register (6-persona panel, 2026-06-18) — all folded in above

| MF | Convergence | Resolution in v0.2 |
|----|-------------|--------------------|
| MF-1 `maxWidth` is occupied (keyword + class) | 5/6 (cynic, spec-lawyer, ship-PM, wp-render, db-integrity) | NEW `outerMaxWidth` attr; keyword `maxWidth` untouched (§2, §3.1) |
| MF-2 edit surface undercounted (3-4 converter + 3 wrapper + edit.js) | all 6 | all sites enumerated (§1, §6); edit.js + controls in blast radius (§3.7) |
| MF-3 double-emit if max-width un-excluded | db-integrity, ship-PM | ONE dedicated resolver; max-width stays excluded on containers; allow_max_width text-leaf-only (§3.3) |
| MF-4 deprecated.js mandatory | all 6 | keep customWidth in schema, hide control, add deprecation, defer deletion (§3.6) |
| MF-5 empty-custom → invalid CSS + injection | spec-lawyer, wp-render, support, cynic | empty guard → `max-width:none`; `$sgs_css_length()` sanitise (§3.4) |
| MF-6 ghost inspector field on old blocks | support, cynic, spec-lawyer | inspector displays via fallback priority (§3.7) |
| MF-7 responsive literal gap | all 6 | `outerMaxWidthTablet/Mobile` via 767/1023 selectors — scope IN (§3.5) |
| (proven safe) max-width→contentWidth mis-route | db-integrity | NO `Content` suffix for max-width — impossible; confirmed |
| (dormant) ContentSize/WideSize rowid collision | db-integrity | harden: ensure `MaxWidth` suffix tried first for max-width; assert single-valued routing pre-build |
| customWidth retirement = gold-plating | ship-PM, cynic, spec-lawyer | DEFERRED (§3.6) |

Grades (v0.1): cynic D+ · spec-lawyer D+ · ship-PM C- · wp-render C+ · support C+ · db-integrity C+. v0.2 targets the convergent fixes that move every grade up.
