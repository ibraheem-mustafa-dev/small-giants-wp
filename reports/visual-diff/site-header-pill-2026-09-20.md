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
