---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 36+37 (merged navigation, header and footer track); 18 (floating UI, for G8)
status: ACTIVE
supersedes: plans/archive/2026-07-29-merged-spec36-37-track-strategic-plan.md, plans/archive/2026-09-21-wave-3c-implementation-plan.md, plans/archive/2026-09-27-reference-capture-method-plan.md, plans/archive/2026-09-27-g8-screen-corner-pin-plan.md
---

# The header and nav thread: everything still open

The one plan for the Spec 36-37 thread: the nav bar menu, the drawer menu, the drawer, mega panels, the site
header and footer, and the clone waves that prove them. The three earlier plans are archived; their build history
(every unit's design, residue and live report) stays readable there.

## 1. Where it stands (2026-10-01)

- Waves 1, 2, 3A, 3B and 3C are built. Gate 3C items 1, 2, 3 and 5 pass.
- **Gate 3C item 4** (the Indus and lamalama copies are 100% visual copies) is in its final pass. Every framework
  gap the walker found is built as a real control (the Indus and lamalama sessions, 2026-09-28 to 2026-10-01). The
  last walk's open rows are recorded in §2.3, each as accepted, a violation, or a foundational gap.
- The foundation is closed for client work: Eye Care's header, drawer, menus and mega panels build on it now. What
  remains of item 4 is the last mile in §2.4, done when Bean wants Gate 3C closed formally (it blocks Wave 4, nothing
  else).
- **Resume at:** §2.4 for Gate 3C, or §4 to start Wave 4.

## 2. Gate 3C item 4: close-out

### 2.1 The definition (the only one; Spec 36, Spec 37 and the verify doc carry the same words)

Gate 3C passes when:

1. Every family in the signed list is covered: its exit cells reachable and at least one reproduced live. Twelve
   families are covered and in no unit: M-01, M-02, M-05, M-06, M-12, M-23, M-26, M-29, M-41, M-42, M-50, M-51. No
   family closes the gate as parked. **PASS** (M-08's lamalama corner card is accepted as DEC-18, Bean 2026-09-27).
2. Each unit row cites its live report with `verdict: PASS`. **PASS.**
3. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 and
   `python plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` passes against a reachable canary. **PASS.**
4. Two composed headers are 100% visual copies of their references at 375, 768 and 1440: a copy of lamalama's
   floating pill and a copy of the Indus Foods Mega Menu draft. Every panel's position and width match the
   reference's measured cells (the Indus draft centres each panel on the page: mega 1080px, About and Trade 620px,
   More 300px; Bean 2026-09-26), and the header's left and right gaps are equal at 1440px. Bean's eye is
   co-authoritative (R-31-13). **Final pass (§2.3, §2.4).**
5. Spec 36, Spec 37, the verify doc and `LEDGER.md` state the model. **PASS.**

### 2.2 How a row closes

Each open walker row ends as one of:
- **Accepted** with a date and reason: a walker blind spot (it cannot read the property), or same paint with a
  different structure and nothing hardcoded (an outline on an inner layer, a border style on a 0px border, a
  transition on a property that never changes). The walker's position, text-inset, painted-ground and hover checks
  still guard the look.
- **Violation**: a real visual difference, closed by a tree setting or a real per-device inspector control (check
  the block library first; most "gaps" already have a control). Never a hardcode.
- **Foundational gap**: a framework capability missing for every client; flagged to Bean before moving on.
- **Jitter** (a sample that moves between runs on the same reference): shown to Bean, never silently accepted.

### 2.3 The record from the 2026-10-01 walk

Walked after the deploy of every cloud-session fix and a rebuild of the five changed trees (4456, 4426, 4430, 4461,
4428). Full row-by-row classification: `reports/visual-diff/gate3c-copies-walk-2026-10-01.md`.

| Copy | Open (unique) | Accepted, blind spot | Accepted, same paint | Violation | Foundational gap | Jitter |
|---|---|---|---|---|---|---|
| Indus | 380 (112) | 18 | 81 | 10 | 0 | 3 |
| lamalama | 253 (89) | 28 | 53 | 7 | 1 (G8, parked, §7) | 0 |

**Foundational gaps to resolve before moving on: none.** The one lamalama gap ("This is Us", a block pinned to a
screen position) is G8, parked by Bean on 2026-09-27.

**Violations** (each closes with a tree setting unless marked):
- Indus CTA cards in Sectors: the draft lifts on hover (transform 0.25s, shadow 0.3s); the copy transitions colour
  only. `sgs/container::shadowLiftOnHover` on the four cards in `indus-mega-sectors.tree.json` gives the shadow; a pixel
  lift on `sgs/container` has no setting (check `sgs/mega-panel::panelCardLift` first).
- Indus logo fades to 0.75 on hover; the draft does not fade: drop the logo's hover opacity in `indus-header.tree.json`.
- Indus About tag sits 5px lower than the draft (y 180 vs 175): its top margin in `indus-mega-about.tree.json`.
- Indus drawer accordion rows: 16px gap against the draft's 14px: `sgs/container::gap` (tablet and mobile) on the row
  containers in `indus-mega-about.tree.json`.
- Indus drawer LinkedIn disc: 4px down and 6px across. Check the painted disc before changing anything; the 44px hit
  box may account for it (then it is same paint).
- lamalama pill logo: the reference draws an animated pixel "L" on a canvas; the copy shows a still PNG. Needs an
  animated asset (`sgs/responsive-logo` Lottie or SVG animation source); same paint if the canvas proves static.
- lamalama drawer rows: the reference paints a hover ground; the copy paints the marker only.
  `sgs/nav-drawer-menu::itemBgHover` is set but does not show: check `itemBorderColourHover` and the 650ms motion.
- lamalama Pitch Deck CTA hover text ends dark (#1a1c1c) where the reference ends cream: `sgs/button::colourTextHover`
  #f9f4eb.
- lamalama CTAs: the reference grows a hover ground and scales an inner part; the copy shows neither on Call.
  `sgs/button::colourBackgroundHover` and `scaleHover` (target `face`) to the reference's values.

**Jitter, for Bean:** the About, Sectors and Brands panels' opacity 30ms into opening reads 0.27/0.15/0.27 in one run
and 0.39/0.28/0.28 in the next, against the draft's 1 (the draft opens instantly); plus the About link hover fade
noted in the cloud handover.

**Walker blind spots worth closing** (tooling, not the copies): the walker reads `transform` but not the independent
`translate`/`scale` properties, so `sgs/button`'s hover lift reads as missing; and it cannot read script-driven motion
on either side.

### 2.4 The last mile (deferred by Bean, 2026-10-01; do when Gate 3C is closed formally)

1. Write the dated accepts into `plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-indus.mjs` and
   `parity-lamalama.mjs` (`accept: []`) for every row §2.3 marks accepted.
2. Show Bean the jitter rows: the About link hover fade, and the 30ms timeline samples (blur, drawer growth) that
   move by up to 0.2 between runs on the same reference. Bean decides accept or fix.
3. Close every §2.3 violation with a tree setting or a real control; rebuild the trees with `scripts/wp-build-page.js`.
4. The final walk without `--no-review` (every state x width screenshot carries a review note), then Bean's eye.
   Done when `draft-live-walk.mjs` exits 0 for both copies.
5. Bean's hPanel action: allow-list or switch off the canary's "Checking your browser" page for the test site, so
   walker states and console errors reflect the copies only (decided 2026-09-28; lamalama's own bot check passes
   after a reload in a real browser).
6. Close Gate 3C in this plan, Spec 36/37's track note, `.claude/verify/merged-spec36-37-track.md` and `LEDGER.md`.

### 2.5 Framework items still open from the copies (verify each against current code before building)

- `widthType: fit` and a label's `fullWidth: false` do not hold inside a stretching flex column.
- `sgs/mega-aside` has no alignment control (worked around with flex-row wrappers).
- No block draws the Indus draft's flat white Google G, so the drawer's fourth social is Twitter.
- lamalama's drawer menu: no hairline under the pill's top row, and no trailing glyph for a plain item.
- D-5: `itemTextIndent` on drawer rows is a paragraph indent and cannot move a menu row.
- Does the reference-capture method (`scripts/parity/draft-live-walk.mjs` with its header mode) generalise to the
  cloning pipeline (`/sgs-clone`), so every future copy is captured this way? Shared with the Eye Care track.

## 3. Owed from Waves 1 to 3

| Item | What is owed | Who |
|---|---|---|
| Wave 1 | Bean's eye on the mega motion (R-31-13); the cart and search screenshot set (numeric probes only so far) | Bean / session |
| U-1, U-2, U-5, U-9+U-11, U-3+U-8 | Bean's eye: dark-surface shadow and ring strength, scrim screenshots, shapes, gallery arrows, three patterns with imagery | Bean |
| W2-f | FR-37-42 column-shape picker (site-header row writes `gridTemplateColumns`, incl. `1fr auto 1fr`): live and eye verification | session + Bean |
| W2-i | `labels-<site>.json` for Away, ButcherBox and rabbit.tech (after Step 0c); must precede any Wave 4 evidence | session |
| W3-b | Simplicity finding 2: canvas-click selection | session, 1h |
| W3-c | FR-37-6: prove every live site renders header and footer from its own CPTs (sandybrown, indus-test) | session, 45m |
| W3-d | FR-37-26 blind-tester arm: a screen-recorded non-coder session, the authoritative half of the FAIL verdict | Bean |
| W3-e | FR-37-18 inspector conformance (Spec 35A Part L): triage the raw gap counts before acting | session, 1h |

## 4. Wave 4 preconditions (all closed before W4-b starts)

- Gate 3C passed, and the W2-i..u checkpoint set plus W2-f verified live.
- **W4-a2:** Bean signs the substitution policy: a licensed font maps to a named nearest match recorded in the DP5
  homes table; copyrighted imagery becomes a same-crop placeholder; neither counts as a capability gap.
- **Step 0c:** the headed capture pass re-captures ButcherBox and rabbit.tech at 768, rabbit's open dropdown and both
  footers, and re-reads Away on the UK storefront (DEC-03, DEC-04). It replaces rows in
  `.claude/reports/reference-requirements/{butcherbox,rabbit,away}.json`. Optional Step 0e: a 1000px tablet capture
  of the two drafts (blocks nothing).
- resn re-judged at family level from the headed capture.
- The three accepted divergences (DEC-01, DEC-02, DEC-07) written into the clone report template, so none reaches
  Wave 4 as an unexplained difference. Divergences are recorded at clone time, one line each under a "Recorded
  divergences" heading in the clone's `reports/visual-diff/<clone>` report.
- The Bean session booked with the evidence pack pre-built and an external ping (an in-session reminder dies).

## 5. Wave 4: the reference clones (the proof gate)

**Clone roster (Gate 5 counts against this): 12 clones** = studionamma (first), buck, dogstudio, fantasy, lamalama,
lusion, wearecollins, Away (UK storefront), ButcherBox, rabbit.tech, and Bean's two Claude Design drafts: Halcyon
Mega Menu (`sites/Mega-menu design/Mega Menu.dc.html`) and Indus Foods Mega Menu
(`sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html`). **resn** (WebGL) is the 13th unless its
teardown finds an effect no Spec 38 tier (V, G, H, W) can express. Warm is not on the roster.

| ID | Unit | Output | CP |
|---|---|---|---|
| W4-a2 | Substitution policy (§4) | Bean's signature | yes |
| W4-b | studionamma 100% clone: header, drawer, footer; content, imagery, colours, type, motion, positioning, mobile | per-property DP5 homes table; DP7-clean harness evidence; Bean's eye (R-31-13). Expect one loop-back | yes |
| W4-c | The remaining roster clones, only after W4-b is accepted | accepted clones; every capability gap is a defect filed against waves 1-3, never a trimmed reference. **Termination rule:** an effect a Spec 38 tier can express is built with the Spec 38 effects; an effect the built effect does not yet match is a defect against that FR; an effect no tier can express comes back to Bean as a trim or exclude decision, never a silent loop-back | yes |
| W4-d | Preset extraction | each accepted clone gives a header preset, a footer preset and a drawer starter; invented fills: Utility commerce, Overlay hero-contrast, Directory footer | no |
| W4-e | Starter-set narrowing | drop `centred`/`minimal`/`full`; keep `scratch` plus 3 search variants | no |
| W4-f | Contrast on all 8 client palettes per preset, automated: extend the DP7 contrast sweep to iterate every `theme-snapshot.json` palette | the palette sweep passes | no |

**Test.** Happy: computed parity against the reference plus Bean's eye per clone. Edge: mobile drawer parity;
content-role migrations. Fail: a DP7 harness mismatch fails the build. Integration: presets restyle under each
client's theme-snapshot tokens. W4-b's evidence pack is fixed in advance: computed-parity JSON, DP7 captures, the
homes table and the labels fidelity output; Bean judges from the pack and the live URL.

## 6. Wave 5: the header and footer clone walker (Spec 33 Part 2)

| ID | Unit | Output | CP |
|---|---|---|---|
| W5-a | FR-37-22 emittable by construction, plus the header/footer clone walker | the pipeline clones header and footer through the walker; the roster clones become regression fixtures. Includes writing and reviewing Spec 33 Part 2 first (Spec 33 holds Part 1 only). `section_passes.py::SKIP_TOP_LEVEL_TAGS` still skips header, footer and nav | yes |
| W5-b | FR-37-23 final acceptance | live FRs, never-overflow on every live site, no inline styles, Bean's eye | yes |
| W5-c | 36-18 Indus branded-header cutover through the pipeline, plus 36-25 structured data emitted once and 36-26a discoverability | the branded Indus header from the Indus Foods Mega Menu design (its inline-style source has no SGS-BEM classes, so W5-a's input contract decides how it enters the pipeline); one client feedback round | no |

**Order:** W4-a2 → W4-b → Bean's eye (Gate 4) → W4-c (clones parallelise only after W4-b is accepted) → W4-d/e/f →
W5-a → W5-b; W5-c after W5-a.

**Gate 4 (studionamma accepted, THE go/no-go):** Bean's eye, the DP5 homes table reviewed and DP7-clean evidence;
capability gaps loop back to waves 1-3 and re-present only with DP7 evidence. **Gate 5 (track acceptance):**
FR-37-23 in full; 13/13 clones accepted (12/12 if resn is excluded); presets extracted; starter set narrowed; walker
regression fixtures green. Readiness for either gate is computed at the time, never pre-asserted. Stop-loss: a gate
scoring under 50 surfaces park-or-pivot with two ranked paths.

## 7. G8: pin an authored block to a screen corner (parked)

Parked (Bean, 2026-09-27). lamalama's "GET IN TOUCH" card is an accepted difference (DEC-18 in
`.claude/reports/reference-requirements/families-master.json::decisions`), so M-08 counts as covered and this build
does not block Gate 3C. lamalama's "This is Us" button (G-8) is parked with it.

**Reopen when** the lamalama copy is rebuilt on the reference-capture method, or a client build needs a card pinned
to a screen corner.

**Why the first attempt stopped.** It lifted an in-page `sgs/container` out of the block tree and printed it at
`wp_footer`; two reviewers returned NO GO on 2026-09-27: the container wrapper has no editor branch, so
`position: fixed` covers the canvas, and a pinned container's output can carry three or more `<style>` tags that a
single front-split strands away from the CSS collector. Full verdicts and what a rebuild needs:
`.claude/reports/2026-09-27-u18-g6-g8-design.md` §3, §8, §9.

**The task**, run as a fresh design gate:
1. Read the design report §3, §8, §9; `.claude/specs/18-SGS-FLOATING-UI.md`;
   `plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` (`Sgs_Floating_UI_Renderer::register()` /
   `::render()`: back-to-top and reading progress).
2. Research first with `/research-check`.
3. Design from the floating UI renderer, which already prints floating UI at `wp_footer`: content authored for the
   floating layer, not an in-page `sgs/container` lifted out of the tree. It must answer U-14's cautions (the
   renderer's container is `aria-hidden`, so a card with a real link cannot sit inside it as is; FR-36-8's
   priority-plus-More text contradicts reusing it unchanged) and the report's §9: (a) every `<style>` tag reaches
   the CSS collector; (b) the editor shows the card without covering the canvas; (c) behaviour inside
   `sgs/nav-drawer` and `sgs/modal`; (d) its own z-index token, clear of `sgs/whatsapp-cta` (200) and
   `sgs/notice-banner` (1000); (e) a portal-conformance detector across the six `wp_footer` adopters.
4. Exit-cell table, two-model `/qc-council`, Bean's go, then build with `/sgs-wp-engine`, one Sonnet implementer
   per disjoint file set.

**Exit.** lamalama's card is 160x326 at top 16 / right 16 at 1440 and absent at 375 and 768, measured by
`plugins/sgs-blocks/scripts/nav-qa/u18-copy-probe.mjs` (its `card` cell) and the walker; then DEC-18 closes as built
and M-08's note says so.

## 8. Outside this thread

Spec 36 Phase 3 (block-menu support, Nav Health, AI-builds-nav, conditional menus, WooCommerce category mega, RTL,
import/export), the optional FR-37-36 custom React picker, and the mega "heading-less panel notice", which waits on
the mega CPT editor surface. wearecollins' `m` hotkey and resn's history-back closer are alternative routes to a
dismissal U-9 already builds; each becomes a unit only if Bean asks.

## 9. Reference

**Decisions.** Full text: `.claude/reports/reference-requirements/families-master.json::decisions` and
`::engineering_notes`. The ones that shape remaining work: DEC-02 (SGS's accessible default stays on every block;
one carve-out, lamalama's close-on-scroll); DEC-03 (Away is the UK storefront, copy not cloned verbatim); DEC-09
(the drawer closes when the viewport crosses `collapsePoint` while open); DEC-10 (clone what the drafts intend, not
what their runtime does wrong); DEC-14 (`sgs/nav-bar-menu::triggerSurface` is its own attribute); DEC-01, DEC-02,
DEC-07 (the three accepted divergences); DEC-18 (§7).

**Standing decisions.** Drawer fixes land on the CPT path. A per-burger drawer picker beats the site-wide Active
drawer; an empty picker means Active, no third state. A partial-width or floating header holds the logo, nav and
actions as one centred surface and its panels follow it; reference behaviour comes from the requirements table,
never a guess.

**The copies on sandybrown.** lamalama: page 4446 `/qa-copy-lamalama/`, `sgs_header` 4435, `sgs_drawer` 4428, menus
130/131, logo 4415, Sometype Mono 4411. Indus: page 4465 `/qa-copy-indus/`, `sgs_header` 4461, `sgs_drawer` 4456,
menu 132, `sgs_mega_menu` 4426 About, 4430 Trade, 4433 More, 4443 Sectors, 4440 Brands, logo 4509, Plus Jakarta Sans
4414 (faces 4484/4485). Trees: `plugins/sgs-blocks/scripts/nav-qa/gate3c/*.tree.json`, applied only with
`scripts/wp-build-page.js`. Pages 4465 and 4446 also carry an in-page header copy (`*-page.tree.json`), kept in step
but never measured. Header fixtures: pages 3723 plain, 3733 capped width, 3734 floating pill, 3735 drawer with
submenus, 3763 hover parity (`nav-qa/build-header-fixtures.py`, slug prefix `qa-hdr-`); rebuild them after any
nav-block schema change. Loose-block pages 3692 to 3699 are not evidence.

**Walk a copy** (only while it is the ACTIVE header; always put 3777 back):

```powershell
$wp = "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html"
$restore = "$wp && wp sgs header set-active 3777 --user=Claude && wp eval-file /tmp/qa-item-markup-fixture.php two-bar --user=Claude && wp litespeed-purge all"
try {
  ssh hd "$wp && wp sgs header set-active 4461 --user=Claude && wp litespeed-purge all"
  node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-indus.mjs --out "$env:TEMP\walk-indus" --no-review
  ssh hd "$wp && wp sgs header set-active 4435 --user=Claude && wp litespeed-purge all"
  node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-lamalama.mjs --out "$env:TEMP\walk-lamalama" --no-review
} finally { ssh hd $restore }
```

**Data.** `families-master.json` holds `families`, `units`, `decisions`, `engineering_notes`, `lanes`,
`verification` and `meta`; FAMILIES-MASTER.md is the readable form. Each `<ref>.json` holds `rows[]` (`surface`,
`tier`, `presence`, `cells`; each cell `value`, `method`, `evidence`).

**Gotchas that already cost time.**
- The site caches phone and tablet page variants separately and Hostinger's CDN can serve week-old HTML: purge,
  reload, measure twice.
- A tier-object attribute given a scalar string emits nothing, and a `{}` default drops old scalar defaults: ship
  the migration and the fallthrough check together.
- `header-behaviours/view.js` wires every header on a page; fixture pages have two `<header>` elements, so probes
  select `.entry-content header.sgs-site-header`.
- Headless distorts timing, WebGL, scrollbars and pointer input: real headed Chrome, one window, wait for the load.
- Test nav blocks inside a real header; loose blocks show defects that do not exist in a header and hide real ones.
- After any walker change, `--self draft` must read 0; never weaken a check.
- Every block name used in editor code must be registered: `createBlock` does not check the slug, and an
  unregistered one inserts a dead `core/missing` placeholder.

**History.** Every unit's design, residue and live report: `plans/archive/2026-09-21-wave-3c-implementation-plan.md`
§4; the reference-capture method, the G-1 to G-14 gap table and Bean's 2026-09-28 decisions:
`plans/archive/2026-09-27-reference-capture-method-plan.md`; the track's waves 1-3B, risk register and checkpoint
protocol: `plans/archive/2026-07-29-merged-spec36-37-track-strategic-plan.md`.
