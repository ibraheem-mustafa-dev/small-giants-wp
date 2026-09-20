# Visual diff — `sgs/site-header` — 2026-09-20 (W2-p: floating header "pill" mode)

```
verdict: PASS
first_paint_capture_passed: true
blocks: site-header
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-09-20
commit: main @ 245e6a07e ("feat(site-header): floating header pill mode")
        + 1fa7fb583 ("fix(site-header): name the float attributes at the editor preview call site")
```

Live verification of the deployed pill feature against the ACTIVE header (`sgs_header`
post **3648**, `Mamas Munches Header`, `wp sgs header list` → Active=yes) rendering
site-wide on the canary homepage. Every fetch carried a unique `?qacb=` cache-buster and
returned `x-hcdn-cache-status: MISS`; every state change was followed by
`wp litespeed-purge all`. No source file was edited, built or deployed in this dispatch.

**Deploy confirmed before measuring:** `includes/sgs-header-float-css.php` is present on
the server, and the deployed `build/header-behaviours/view.js` carries the new publisher
(`parseFloat(window.getComputedStyle(t).top) … Math.max(0,e)+s`), i.e. the bottom-edge
value, not the bare height.

---

## State touched, and its restore proof

Everything below was done by rewriting post 3648's `post_content` with `$wpdb->update()`
from a byte snapshot taken first, then restoring from that snapshot (`post_modified`
written back in the same statement, so WordPress never bumped it). **No option, theme mod,
page, post or revision was created or altered.**

| Thing | Value | Proof |
|---|---|---|
| Post 3648 `post_content` BEFORE | md5 `b6b19d932b8a3c7a7b52621e1d00b246` (raw, PHP) / `79f62b4b6e269a8b7864c711ab4eb6af` (`wp post get \| md5sum`), 880 bytes | recorded before the first write |
| `post_modified` BEFORE | `2026-09-18 21:29:45` (gmt identical) | `wp post get 3648 --field=post_modified` |
| AFTER restore | md5 `b6b19d932b8a3c7a7b52621e1d00b246` / `79f62b4b6e269a8b7864c711ab4eb6af`, 880 bytes, `post_modified 2026-09-18 21:29:45` | **identical**; attribute JSON re-read and matches character-for-character |
| Header element UID | `sgs-sh-facd3ef0` before **and** after the whole run | uid is attribute-hash derived, so its return proves the attribute set round-tripped exactly |
| Lifted CSS file | `sgs-3852-33fb433c6340d4b4654ef9016d9e628b.css` before **and** after | same content hash ⇒ byte-identical instance CSS |
| Rendered geometry | full computed snapshot at 1440 and 390 identical before vs after (`rect`, `position`, `top`, `padding`, `border-radius`, `box-shadow`, `backdrop-filter`, `background-color`, `border`, `transform`, `data-*`) — 0 differing properties | `FINAL-restore-{1440,390}.json` vs `A-baseline-{1440,390}.json` |
| Revisions / autosaves | max revision id `3713` (2026-09-20 00:45, pre-existing — this session ran from 03:0x UTC) before and after, including after the editor session | `SELECT MAX(ID) … post_parent=3648 AND post_type='revision'` |
| Pages/posts created | **none** (no `[QA]` page was needed — the active header carried the work) | `wp post list --s="[QA] pill" --format=count` → `0` |
| Server-side helpers | `~/qa-header.php`, `~/qa-nav.php`, `~/qa-header-3648.orig`, `~/qa-header-3648.modified` deleted | `ls ~/qa-*` → "No such file or directory" |

---

## Checks

| # | Check | Measured evidence | Verdict |
|---|---|---|---|
| **A1** | **REGRESSION — emitted instance CSS unchanged across the pill deploy** | The pre-pill baseline (`reports/visual-diff/site-header-2026-09-20.md`, taken at `737d205ba`, an ancestor of the pill commit) recorded **5 rules** on the header selector: background-color; position/top/z-index; reduced-motion `transition:none`; border-style/width; border-color. Live now: the **same 5 rules, same declarations, same order**, and `position:sticky !important;top:0 !important;z-index:100 !important` verbatim (no `var(--sgs-header-float-inset-top…)`). Whole 81,809-byte lifted stylesheet: **0** occurrences of `float-inset`, **0** of `backdrop-filter`. | PASS |
| **A2** | `--sgs-header-height` unchanged | **90px** on `:root` and on `body` at 1440 **and** 390 — exactly the value recorded pre-deploy. `html { scroll-padding-top }` resolves to 90px. | PASS |
| **A3** | `position` / `top` / `padding` / `box-shadow` unchanged | 1440 and 390: `sticky`, `0px`, `10px 20px 10px 20px`, `none`; rect `{top:0,left:0,width:<vw>,height:89.58}`; border `0/1px solid rgb(232,213,192)`. | PASS |
| **A4** | Sticky/hide-on-scroll header at `top:0` publishes offset 0 + height at rest, at scrollY 600 and while hidden | `headerHideOnScroll` on all tiers, float OFF: **90px at scrollY 0, 90px at 600, 90px at 1400 while fully hidden**, 90px back at 0. Hidden transform `matrix(1,0,0,1,0,-89.5781)` = exactly the header height; `rect.bottom` = **0**. | PASS |
| **A5** | **NEGATIVE CONTROL** — float ON must differ by exactly the inset | Same header, `headerFloat` on: `--sgs-header-height` = **106px** vs 90px float-off. Δ = **16px = the 1rem inset**, and `106 ≈ rect.bottom 105.58`. The A2 assertion can therefore genuinely fail. | PASS |
| **B1** | Pill `position`/`top` | 1440, 390 **and** 320: `position: sticky`, computed `top: 16px` (from `top: var(--sgs-header-float-inset-top, 0px)` with the published value `max(1rem, env(safe-area-inset-top))`). | PASS |
| **B2** | Side insets at 390 and 320 | 390: `rect.left` **16**, `innerWidth − rect.right` **16**, width **358** (= 390 − 2×16). 320: left **16**, right gap **16**, width **288** (= 320 − 2×16). | PASS |
| **B3** | Centred with equal gaps at 1440 under the 1120px cap | `rect.left` **160**, right gap **160**, width **1120**, computed `max-width: 1120px`, `margin-inline: auto`. | PASS |
| **B4** | `backdropFilter` | `blur(4px)` at 1440, 390 and 320 (paired `-webkit-` emitted). | PASS |
| **B5** | No horizontal page scroll | `document.documentElement.scrollWidth === clientWidth`: 1440/1440, 390/390, **320/320**. | PASS |
| **B6** | `--sgs-header-height` equals `rect.bottom` when pinned | 1440 & 390: **106px** vs `rect.bottom` **105.58** (Δ 0.42, rounding). 320: **97px** vs **96.77** (Δ 0.23). | PASS |
| **B7** | Overflow not clipped (focus-ring rule, design §3.7) | computed `overflow: visible` on the pill at every width. | PASS |
| **C1** | Blur survives scrolling | Real scroll, `window.scrollY` asserted to have changed 0 → 600 → 1400: `backdrop-filter: blur(4px)` at every step. | PASS |
| **C2** | `shadowScrolled` appears once scrolled, inset unchanged | `shadowScrolled:"floating"`: rest `box-shadow: none`; at 600 and 1400 `rgba(0,0,0,0.12) 0px 8px 30px 0px` (the `floating` preset) with `is-header-scrolled` present; back at 0 → `none`. `rect.top` stayed **16** and `rect.left` **160** throughout. | PASS |
| **C3** | **Hide-on-scroll fully clears — no 16px sliver** | Pill + `headerHideOnScroll` on all tiers, 1440 **and** 390: at scrollY 600 and 1400 the transform is `matrix(1,0,0,1,0,-105.578)` = height 89.578 **+ inset 16**, giving `rect.top −89.58` and **`rect.bottom = 0`**. Restores to `rect.bottom 105.58` back at the top. | PASS |
| **C4** | **NEGATIVE CONTROL for C3** | The same header with float OFF travels `-89.5781` (= its own height) and also reaches `rect.bottom 0`. Under float that same `-100%`-only travel would have stopped at `rect.bottom = +16` — a visible sliver. **Both numbers were measured**, so C3 is falsifiable, not a tautology. | PASS |
| **D1** | Collapse at 390 | `headerFloatCollapse {"enabled":true,"breakpoint":768}`: `rect.left` **0**, width **390**, `border-radius` **0px 0px 0px 0px**, computed `top` **0px**, `--sgs-header-height` back to **90px**. | PASS |
| **D2** | Still a pill at 1440 with collapse on | left **160**, width **1120**, right gap **160**, radius **8px**, top **16px**. | PASS |
| **D3** | Breakpoint boundary is exclusive ("below 768") | 768px viewport: still a pill (left 16, width 736, radius 8px). 767px: collapsed (left 0, width 767, radius 0px, top 0px). | PASS |
| **D4** | **NEGATIVE CONTROL** — pill persists at 390 with collapse disabled | Same attributes minus `headerFloatCollapse`: 390 → left **16**, width **358**, radius **8px**, top **16px**. So D1 measures the toggle, not the viewport. | PASS |
| **E1** | Mega panel matches the pill's width and left | Header temporarily given a mega bar (`sgs/nav-bar-menu` ref 100, the "Brands" mega). 1440, cap 1120: panel `left 160.02 / right 1280.02 / width 1120` vs pill `160 / 1280 / 1120` — **ratio 1.000**, Δ 0.02px. 900px viewport: panel `16 / 884 / 868` vs pill `16 / 884 / 868` — ratio 1.000. 390: panel `16.02 / 374.02 / 358` vs pill `16 / 374 / 358` — ratio 1.000. Narrow 620px pill: panel `410 / 1030 / 620` = pill exactly. | PASS |
| **E2** | `panel.top − pill.bottom ≈ 0` | 1440: 133 − 133 = **0**. 900: 185/185 → **0** (620 pill) and 133/133 → **0**. 390: 289 − 289 = **0**. | PASS |
| **E3** | Plain dropdown keeps its own width and stays inside `[pill.left, pill.right]` | 1440, pill `[510, 930]`: the rightmost dropdown's item starts at 733.27 so its natural box would be `[733.27, 933.27]` — **3.27px past the pill**. Measured: the JS wrote `left: -3.27px` and the panel rendered `[730.00, 930.00]`, **right edge exactly the pill's**, width still **200px**. At 390, pill `[16, 374]`: dropdown `[174, 374]`, width 200, inside. Leftmost dropdown ("Recipes") unclamped at `[593.81, 793.81]`, inside the box. | PASS |
| **E4** | **NEGATIVE CONTROL for E3** | Identical nav, float OFF (header full width, same 420px cap): the same dropdown rendered `[223.27, 423.27]` with `left: 0px` — i.e. **3.27px past the header's own right edge and NOT clamped**, because the bounding box is the viewport. The float-off mega likewise measured 1120 wide against a 420-wide header (page-derived, the pre-existing behaviour). Both surfaces therefore change only under float. | PASS |
| **F1** | Editor controls exist | `wp-admin/post.php?post=3648` → block selected via `core/block-editor`. "Header behaviour" ToolsPanel ⋮ menu lists **Float as a pill**; with float on it also lists **Gap around the pill**, **Background blur**, **Full width on small screens**. All four render in the panel once enabled. The float item carries the plain-English help text from `FloatControls.js`, a checkbox and a "Customise per device →" disclosure (no new device switcher). | PASS |
| **F2** | Toggling float changes the canvas | Canvas block wrapper BEFORE `left 24, width 1112, margin-top 0px` → AFTER `left 40, width 1080, margin-top 16px`. Exactly the inset applied on three sides. | PASS |
| **F3** | Attributes written by the control | `headerFloat {"desktop":"on"}`, with defaults present: `headerFloatInset {"desktop":{"top":"1rem","right":"1rem","left":"1rem"}}`, `headerFloatCollapse {"enabled":false,"breakpoint":768}`, `backdropBlur ""` — matching `block.json`. | PASS |
| **F4** | Editor console + not saved | **0** console errors and 0 page errors across the whole editor session. Post never saved: md5 and `post_modified` unchanged afterwards, no new revision or autosave row. | PASS |
| **G** | Zero front-end JS errors | **0** console errors and 0 `pageerror`s in every front-end run: baseline (1440/390), pill (1440/390/320), hide-on-scroll (1440/390), scrolled-shadow, collapse (1440/768/767/390), all panel probes (1440/900/390) and the screenshot runs. | PASS |

---

## Attribute JSON used (for reproduction)

```jsonc
// B / C1 canonical pill
{"headerFloat":{"desktop":"on","tablet":"on","mobile":"on"},
 "maxWidth":{"desktop":"1120px"},
 "borderRadius":{"desktop":{"topLeft":"8px","topRight":"8px","bottomLeft":"8px","bottomRight":"8px"}},
 "backdropBlur":"4px","backgroundColour":""}
// C2 adds "shadowScrolled":"floating"
// C3 adds "headerHideOnScroll":{"desktop":"on","tablet":"on","mobile":"on"}
// D  adds "headerFloatCollapse":{"enabled":true,"breakpoint":768}
```

---

## Observations (no defect; recorded so the next session does not re-derive them)

1. **The header's uid changed for every existing header at this deploy.** Pre-pill the
   canary header was `sgs-sh-686e3e7c`; it is now `sgs-sh-facd3ef0`. The uid is
   `md5( wp_json_encode( $attributes ) )`, and `block.json` gained three attributes with
   non-empty defaults (`headerFloatInset`, `headerFloatCollapse`, `backdropBlur`), so the
   hash moved. **The emitted rules and every computed value are identical** — only the
   selector name and the lifted-CSS filename changed. Effect: one-off cache-file churn in
   `uploads/sgs-css/`, and any hardcoded uid in an old report or fixture is stale.
2. **`--sgs-header-height` does not drop to 0 while a floating header is hidden by
   hide-on-scroll** (measured: stays 106px at scrollY 600/1400 with `rect.bottom` 0). The
   shipped publisher computes *declared `top` + height* rather than the design doc §3.2's
   proposed `Math.max(0, rect.bottom)`; `view.js`'s docblock states this choice explicitly
   ("Computed from the declared offset, not from where the header is on screen"). For
   every `top:0` header the two formulas agree, which is what A2/A4 measured (90px,
   unchanged). Flagged as a **deliberate deviation from the design document**, not a
   defect — but the design doc's §3.2 snippet and test row P1 describe the other formula
   and should be reconciled.
3. **`maxWidth` must be the tier object the editor writes** — `{"desktop":"1120px"}`. A
   hand-authored scalar `"maxWidth":"1120px"` silently produces **no** `max-width` at all
   (block.json declares the attribute as `object`, so WordPress replaces the wrong-typed
   value with the `{}` default before render). Measured both ways: tier object → `max-width:
   1120px`, left 160, right gap 160; scalar string → no rule emitted, header 1408px wide.
   `style.dimensions.maxWidth` is a third, equivalent path. This is pre-existing
   attribute-schema behaviour (D338 class), not introduced by this commit, and the client's
   "Header width" control writes the correct shape — but it will bite any hand-written
   fixture or converter emit.

## Not run

| Item | Reason |
|---|---|
| 200% zoom (design doc P9) and axe re-run (P10) | Outside the seven checks in this dispatch's brief. The `1rem` (not px) inset that P9 exists to protect was verified present in the emitted custom-property value: `max(1rem,env(safe-area-inset-top))`. |
| Pre-JS / JS-disabled fallback (design doc P11) | Outside this brief. |
| Drawer `header` anchor under a pill (design doc P7) | Outside this brief; the canary header's drawer was not exercised. |
| Float + `headerTransparent` shadow-suppression path (`sgs_header_float_css()`'s third block) | Outside this brief's check list; not measured, so not claimed either way. |

## Screenshots

`reports/visual-diff/site-header-pill-2026-09-20/`

- `pill-rest-{1440,390}.png` — the pill at rest (inset 16, 1120 cap centred at 1440)
- `pill-scrolled-{1440,390}.png` — scrolled 600px, `shadowScrolled` painted, inset unchanged
- `pill-mega-open-{1440,390}.png` — mega panel matching the pill's box (taken during the
  temporary two-nav E-check fixture, hence the taller bar)
- `editor-float-controls.png` — "Float as a pill" toggled on in the Header behaviour panel
- `editor-float-controls-recheck.png` — the same panel after the QC fixes, with all four
  float items enabled (re-verification run below)

---

# Re-verification after QC fixes (commit 526784068)

```
verdict: PASS
date:    2026-09-20 (second pass)
commit:  526784068 ("fix(site-header): QC fixes for the floating pill")
target:  sandybrown-nightingale-600381.hostingersite.com
```

No source file was edited, built or deployed in this dispatch. Every fetch carried a unique
`?qacb=` cache-buster (all `x-hcdn-cache-status: MISS`, HTTP 200); every state change was
followed by `wp litespeed-purge all`.

**Deploy of 526784068 confirmed on the server before measuring** — not assumed from the
commit: `includes/sgs-header-float-css.php` md5 `c533f6a5c04578281e438d3924ecfd85` matches
the local working tree byte-for-byte; `build/blocks/site-header/render.php` carries the new
four-argument call `sgs_header_float_css( $root_sel, $attributes, $sh_transparent_effective,
$sh_solid_first )`; the minified `build/header-behaviours/view.js` carries the clamped SUM
`Math.max(0,(Number.isFinite(e)?e:0)+s)` (not the old clamp-then-add); and
`build/blocks/nav-bar-menu/view.js` carries
`s=!o&&r.floating&&null!==r.bottom?r.bottom:n.top` feeding `--sgs-mm-panel-max-h`.

## State touched, and its restore proof

Same discipline as the first pass. A throwaway `[QA]` page could not carry this work — the
header is site chrome rendered from the active `sgs_header` post, not from page content — so
post **3648** was rewritten with `$wpdb->update()` (which takes unslashed data directly, so no
`wp_slash()`/`wp_unslash()` round-trip can mangle a byte) from a snapshot taken first, with
`post_modified` written back in the same statement. **No option, theme mod, page, post or
revision was created or altered.**

| Thing | BEFORE | AFTER | Proof |
|---|---|---|---|
| Post 3648 `post_content` | md5 `b6b19d932b8a3c7a7b52621e1d00b246`, 880 bytes | **identical** | `wp eval-file qa-header.php show`, run before the first write and after the last |
| `post_modified` | `2026-09-18 21:29:45` | **identical** | same command |
| Attribute JSON | `{"align":"full","backgroundColour":"surface","contentWidth":{"desktop":"normal"},"headerSticky":{"desktop":"on"},"borderWidth":{"bottom":"1px"},"borderStyle":"solid","borderColour":"border","padding":{...}}` | **identical, character-for-character** | same command |
| Header element uid | `sgs-sh-facd3ef0` | `sgs-sh-facd3ef0` | attribute-hash derived, so its return proves the attribute set round-tripped exactly |
| Lifted CSS content hash | `33fb433c6340d4b4654ef9016d9e628b` | `33fb433c6340d4b4654ef9016d9e628b` | byte-identical instance CSS (only the filename's render-counter prefix differs, `sgs-3852-` → `sgs-3854-`) |
| Rendered geometry | `A-baseline-{1440,390}.json` (first pass) | `R4-final-{1440,390}.json` | **0 differing properties** across all four scroll phases (rest / 600 / 1400 / back-to-top) at both viewports |
| Max revision id (post 3648) | `3713` | `3713` (7 rows total) | `SELECT MAX(ID) … post_parent=3648 AND post_type='revision'` — including after the editor session |
| `[QA]` pages created | 0 | 0 | `wp post list --s="[QA] pill" --format=count` |
| Server-side helpers | uploaded `~/qa-header.php`, `~/qa-nav.php` | deleted | `ls ~/qa-*` → "No such file or directory" |

## Checks

| # | Check | Measured value | Control (would fail if the fix were absent) | Verdict |
|---|---|---|---|---|
| **1a** | Float + Transparent, `transparent-first`: shadow suppressed at rest, returns on scroll | `headerFloat` all tiers, `headerTransparent` all tiers, `shadow:"floating"`. 1440 **and** 390: rest `box-shadow: none`, bg `rgba(0,0,0,0)`; scrollY 600 (`is-header-scrolled` present) `rgba(0,0,0,0.12) 0px 8px 30px 0px`; back at top `none` again. | Check 1b — the identical attribute set with `headerTransparentDirection:"solid-first"` measures the exact inverse. | PASS |
| **1b** | `solid-first` inverts it | Same attributes + `"headerTransparentDirection":"solid-first"`. 1440 **and** 390: rest `rgba(0,0,0,0.12) 0px 8px 30px 0px` with bg `rgb(251,243,220)` (solid); at 600 `box-shadow: none` with bg `rgba(0,0,0,0)`; back at top shadow returns. Background and shadow invert together, i.e. the suppression follows the see-through STATE. | Check 1a (same attrs, opposite direction). | PASS |
| **1c** | `contrastSafe: force-solid` at mobile keeps the mobile shadow | `contrastSafe:{"mobile":"force-solid"}` added to 1a. Rest `box-shadow`: 1440 **none**, 800 **none**, 390 **`rgba(0,0,0,0.12) 0px 8px 30px 0px`**. | Check 1a at 390 (same attrs minus `contrastSafe`) measured `none`. Force-solid is therefore the variable. | PASS |
| **1d** | Transparent on desktop only — tablet/mobile keep their shadow | `headerTransparent:{"desktop":"on","tablet":"off","mobile":"off"}`, float on all tiers. Rest `box-shadow`: 1440 **none**, 800 **shadow**, 390 **shadow**. This is the "restate" arm working: without it the tier-minimisation would leave 800/390 inheriting desktop's `box-shadow:none`. | 1440 in the same run (suppressed) vs 800/390 (not) — one render, one attribute set, three tiers. | PASS |
| **2** | Hostile `headerFloatInset` and `backdropBlur` fall back; width stays valid | Stored `headerFloatInset.desktop` = `"1rem 2rem"` on all three sides, `backdropBlur:"10px 5px"`. Emitted custom properties are the **defaults**: `max(1rem,env(safe-area-inset-*))` (computed `max(1rem,0px)`); computed `top: 16px`; computed `width: 1120px` at 1440 and `358px` at 390 — **not `auto`**; rect 1440 `{top:16,left:160,width:1120}`, 390 `{top:16,left:16,width:358}`, right gap 16. `backdrop-filter: none` — no invalid declaration emitted. | Same attrs with legal values (`2rem` / `6px`): computed `top: 32px`, `backdrop-filter: blur(6px)`, `--sgs-header-height` 122px. The probe can see a valid value, so the fallback reading is not a blind null. | PASS |
| **3** | `backdropBlur` applies WITHOUT float | No `headerFloat` at all, `backdropBlur:"6px"`: `backdrop-filter: blur(6px)` at 1440 **and** 390, and still `blur(6px)` at scrollY 600. Geometry untouched: `position: sticky`, `top: 0px`, full-width rect, radius 0, `--sgs-header-height` 90px, `data-sgs-header-float` absent. | The untouched baseline (blur unset) measures `backdrop-filter: none` — so blur is not ambient. | PASS |
| **4** | Mega panel `max-height` under a pill keeps it inside the viewport | Floating pill + mega bar (`sgs/nav-bar-menu` ref 100). **1440×900:** pill bottom 133, panel `top 133 / bottom 618.98`, `--sgs-mm-panel-max-h` **751.00px** = 900 − 133 − 16. **768×900:** pill bottom 185, panel `top 185 / bottom 884`, max-h **699.00px** = 900 − 185 − 16, and here the panel IS clamped (`scrollHeight 969 > height 699`), so the assertion is load-bearing. `panel.rect.bottom <= innerHeight` holds at both: 618.98 ≤ 900, 884 ≤ 900. | **Empirical, not arithmetic:** at 768×900 the pre-fix value was re-derived from the panel's own `top:100%` origin (menu-item bottom **70**) → `900 − 70 − 16 = 814px`, written back onto the live panel: bottom became **999**, i.e. **99px past the viewport**. | PASS |
| **4b** | Dropdowns unaffected (they must keep measuring from their own top) | Both dropdown panels at 1440×900: wrap top 70, `--sgs-mm-panel-max-h` **814.00px** = 900 − 70 − 16 — the naive/unchanged expression, as intended. | The mega panel in the same header measures 751, not 814. | PASS |
| **5** | `--sgs-header-height` = top offset + height, clamped as a SUM | Floating pinned pill, computed `top: 16px`, height 89.58 → published **106px** (`rect.bottom` 105.58). With inset `2rem`: `top: 32px` → **122px**. Forcing a **negative** offset on the live header: `top:-20px` → published **70px** (= max(0, −20 + 89.58)); `top:-200px` (entirely above the viewport) → published **0px**; restoring `top:16px` republishes **106px**. | The old clamp-then-add formula was computed in the same evaluation from the same live values: it gives **90px** for `top:-20px` and **90px** for `top:-200px`. Measured ≠ old formula in both cases. | PASS |
| **6** | Float-off tier emits no redundant desktop width cancel | `headerFloat:{"desktop":"off","tablet":"on","mobile":"on"}` — emitted instance CSS for the uid contains **no** unqualified inset-0/`width:100%` rule; the only pill geometry is inside `@media (max-width:1023px)`. Visual result at 1440 unchanged: `position: sticky`, `top: 0px`, no inset custom property, `--sgs-header-height` 90px; tablet 800 floats correctly (`top 16`, left 16, width 768). | `headerFloat:{"desktop":"on","tablet":"on","mobile":"off"}` **does** emit the cancel — `@media (max-width:767px){…--sgs-header-float-inset-*:0px;width:100%;}` — so the grep can see a cancel rule when one exists. | PASS |
| **R1** | **REGRESSION — untouched header renders exactly as before** | Active header, no float/blur attribute: computed snapshot at 1440 and 390 (`rect`, `position`, `top`, `padding`, `border-radius`, `box-shadow`, `backdrop-filter`, `background-color`, `border`, `transform`, `max-width`, `margin-inline`, `--sgs-header-height`, `scroll-padding-top`, doc scroll widths, `data-*`) across all four scroll phases — **0 differing properties** vs the first pass's `A-baseline-{1440,390}.json`. `--sgs-header-height` **90px** at 1440, at 390, at scrollY 600 and at 1400. **0** console errors, **0** page errors. | The same probe reports `106px`/`122px`/`70px`/`0px` under the float states above, so the 90px reading is a measurement, not a constant. | PASS |
| **R2** | **REGRESSION — first-pass pill geometry still holds** | Canonical pill re-measured: `position: sticky`, `top: 16px` at 1440/390/320; 390 left **16**, right gap **16**, width **358**; 320 left **16**, right gap **16**, width **288**; 1440 left **160**, right gap **160**, width **1120**, `max-width: 1120px`, `margin-inline: 160px/160px`; `backdrop-filter: blur(4px)` at all three; radius `8px`; `overflow: visible`; no horizontal scroll (`scrollWidth === clientWidth`: 1440/1440, 390/390, 320/320). Byte-identical to the first pass's `Bfinal-*` snapshots apart from the viewport height I passed. | — (this IS the regression control for the pill) | PASS |
| **R3** | **REGRESSION — collapse boundary unmoved** | `headerFloatCollapse {"enabled":true,"breakpoint":768}`: **768** → still a pill (`top 16`, left 16, width 736, radius 8px, var 129px); **767** → collapsed (`top 0`, left 0, width 767, radius 0px, var 90px); **390** → collapsed. | 768 vs 767 in the same run is the boundary control. | PASS |
| **E1** | Editor — the four float controls still render | `wp-admin/post.php?post=3648`, block selected via `core/block-editor`. Header behaviour ⋮ menu with float OFF lists 5 items + Reset all (no float sub-items). With `headerFloat` on it lists **Gap around the pill**, **Background blur**, **Full width on small screens** as well, and once enabled all four render as real ToolsPanelItems with controls: `Float as a pill` (2), `Gap around the pill` (5), `Background blur` (1), `Full width on small screens` (1). Canvas preview applied the inset (`left 24→40`, `margin-top 16px`). **0** console errors, **0** page errors. | The float-OFF menu listing (5 items, no sub-items) is the negative control for the conditional render. | PASS |
| **E2** | Editor — Reset all writes the block.json defaults | Attributes dirtied first to `headerFloatInset {"desktop":{"top":"3rem","right":"3rem","left":"3rem"}}`, `backdropBlur "9px"`, `headerFloatCollapse {"enabled":true,"breakpoint":1024}` and read back. After **Reset all** on the Header behaviour panel: `headerFloatInset` = **`{"desktop":{"top":"1rem","right":"1rem","left":"1rem"}}`** (= `block.json` default), `headerFloatCollapse` = **`{"enabled":false,"breakpoint":768}`**, `backdropBlur` = **`""`**, `headerFloat` = **`{}`**. | The dirtied values were measured immediately before the reset, so "equals the default" is a transition, not a starting state. | PASS |
| **E3** | Editor — post never saved | Post left dirty and abandoned; afterwards md5 `b6b19d932b8a3c7a7b52621e1d00b246`, `post_modified 2026-09-18 21:29:45`, max revision id still `3713`. | — | PASS |

## Observations (no defect attributable to this commit)

1. **`contrastSafe: force-solid` suppresses the shadow correctly but does NOT make the
   background solid.** At 390 with `headerTransparent` on and `contrastSafe:{"mobile":
   "force-solid"}` the resting background measured `rgba(0,0,0,0)`. **This is pre-existing
   and unrelated to float** — proven by re-measuring with `headerFloat` removed entirely:
   the background is still `rgba(0,0,0,0)` at 390. The same shape appears with an explicit
   `headerTransparent:{"tablet":"off","mobile":"off"}` (check 1d): the shadow restates per
   tier, the background does not. The cause is the transparent merge's cancel path (a
   narrower tier resolved `off` emits no `background` cancel against the desktop rule's
   `background:transparent !important`), i.e. `sgs_merge_tri_state_declarations`, not
   `sgs_header_float_css()`. The QC fix's own subject — the SHADOW following the effective
   transparent state — is correct at every tier measured. Worth its own ticket.
2. `--sgs-header-height` is published rounded to the integer px (`Math.round`), so a pill at
   `top:16px` with an 89.58px height publishes `106px` against a `rect.bottom` of 105.58.
   Unchanged behaviour, recorded so the 0.42 delta is not re-investigated.

## Not run

| Item | Reason |
|---|---|
| 200% zoom (design doc P9), axe re-run (P10), JS-disabled fallback (P11), drawer `header` anchor under a pill (P7) | Outside this dispatch's brief, as in the first pass. The `1rem` (not px) inset P9 protects was re-confirmed present in the emitted value `max(1rem,env(safe-area-inset-top))`. |
| A NEGATIVE `headerFloatInset` reaching the stylesheet | Not reachable through the attribute: `sgs_header_float_single_length()` rejects negatives, and `max(…, env(…))` would clamp one to 0 anyway. Check 5's negative-offset case was therefore driven by overriding the computed `top` on the live header, which is what the publisher actually reads. |
| Pixel/screenshot diff of the shadow states | Computed `box-shadow` was read directly at each state; no pixel sampling was done, so nothing is claimed about the painted result beyond the computed value. |
