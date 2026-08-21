---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-20
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **TWO TRACKS ARE LIVE ON `main`. Establish which one you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden track**
owns `## ▶ COLOUR-GOLDEN TRACK — LIVE STATUS 2026-08-21` further down, and that section
SUPERSEDES two claims in the shop track's status (gradients, and the container gutter) — both
are marked inline. A count taken while both tracks are running has a timestamp, not a value:
re-measure before acting on any number here.

**If you are continuing the COLOUR-GOLDEN track**: the container/shop work is DONE and
QC Gate 2 is CLOSED on all three blocks. Read
`.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md` first — it carries
two decisions waiting on Bean (the sticky sidebar, and the cap-the-children model) and
seven still-open colour items. ⛔ The old "move the padding default to the CONTENT-BAND
layer" instruction is REFUTED: each container has exactly one band, so band-padding stacks
identically. Do not build it.

**If you are continuing the SHOP-ARCHIVE track**, read, in this order:

1. `.claude/plans/phase-shop-container-remediation.md` — **the executable plan. Start at
   Phase 1, Wave 1.**
2. `.claude/plans/2026-08-20-shop-archive-remediation-design.md` — the 693-line spec behind it.
   Its "BEAN'S DECISIONS" section is BINDING.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — read IN FULL if touching the
   converter/walker/pipeline surface (session rule).

## ▶ LIVE STATUS — 2026-08-20 (shop-archive + R-3 track)

**All pushed to `origin/main`. Working tree clean. `npm run build` GREEN, all gates.**
Commits: `3224db10` `03fd4247` `b562c6d2` `631e97a3` `44d03825` `21131a98` `25cc0188` `a7026181`.

Per-step plan status is single-sourced to
`.claude/plans/phase-shop-container-remediation.md` § "EXECUTION PROGRESS". Not duplicated here.

### Where the plan stands

- **Phase 1 Wave 1: SHIPPED, DEPLOYED, LIVE-VERIFIED.** Instant filtering works on the canary
  `/shop/` — proven behaviourally (a stamped `window` var survived a filter click, so no reload;
  URL updated client-side; products 5→4; 2 `fetch` requests). **D702**
- **R-3 workstream: COMPLETE** (all 7 items).
- **Phase 1 Wave 2: COMPLETE ON THE FRONTEND, DEPLOYED, LIVE-VERIFIED.** P1-5/6/7/8 all
  shipped. The mobile filter sheet works end to end: filters apply (products 5 → 1), the
  sheet animates in and out, opens with 0px page jump, scrolls internally, Escape closes,
  focus returns, and the closed drawer exposes 0 focusable controls (was 26 — a real WCAG
  fix).
- ✅ **QC GATE 2: CLOSED — PHASE 1 IS COMPLETE.** Closed by the colour-golden track on
  2026-08-21 against Bean's behavioural test, not "attrs declared": in the editor they picked
  a swatch on each block and confirmed the computed style changed on the frontend at rest AND
  under a REAL pointer hover. `sgs/hero` primary → accent-dark (`rgb(245,208,80)` on hover),
  `sgs/trust-bar` success → cookie-brown (`rgb(139,111,78)`), `sgs/brand-strip` verified
  earlier. The round-trip stored a token SLUG not a hex, so the token survives. Hero returned
  to its resting colour when unhovered — a negative control. Fixture page 2588 is deletable.
- ✅ **P2-1 CLOSED, and it was one bug not four.** The content band's `max-width` +
  `margin-inline:auto` were painting on the container's OUTER box. That single fault produced
  the capped background, a 340px grid track collapsing to 48px, a stranded centring margin,
  and gutters compounding to 72px over three nesting levels — which is why they looked
  unrelated. Shop archive repaired with it (products 260px → 940px at desktop).
- ⛔ **Framework-wide defect found and fixed (`d3e98700`): theme assets were served STALE to
  any warm browser cache.** Every theme CSS/JS URL carried the theme version, which is never
  bumped, so an asset deployed between releases kept an identical URL. Same URL returned
  10,199 fresh bytes vs 5,079 cached. This silently affected EVERY theme asset deploy ever
  made, and a server cache purge does NOT fix it. Now versioned by `filemtime`.
  **If you concluded a theme-side change "didn't work" before this commit, re-test it.**
- ⚠ **The site now carries TWO mobile filter drawers.** WooCommerce ships its own (we hide
  its trigger and run ours). Ours is better on accessibility — native top layer, real focus
  trap, hidden-by-construction when closed. **This is a decision to make, not a bug to patch.**
- **Phase 2: P2-3 DONE by the other session** (`1905257e`, `52b96e68`). **P2-6 PARTIAL —
  enumerated: 38 renames done, 39 remain** (10 SGS authorings in `theme/` footer patterns, 29
  in `sites/`; the raw string also appears in extraction artefacts which are NOT authorings).
  **P2-1, P2-2, P2-4, P2-5, P2-7, P2-9 NOT STARTED.** QC Gates 3 and 4 not reached.
- ✅ **Both container defects handed over are now CLOSED** (background capped at content
  width = P2-1, and the gutter). Root cause was band CSS painted on the OUTER box — not the
  padding default, and not that evening's container work. Fixed, deployed and live-verified
  2026-08-21; see the colour-golden section below and
  `.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md`.
- ⚠ **Rule carried forward from the shop track:** "not declared" does NOT mean "does
  nothing" — PHP keeps undeclared attrs, so several blocks still read
  `$attributes['backgroundColor']` to re-add `has-*` preset classes. Check whether
  render.php reads an attr before calling it dead. (The HANDOVER-4 file the earlier
  entry linked was never written — the link was dangling.)
- **Handover 3** → `.claude/reports/2026-08-20-HANDOVER-3-shop-wave-2-to-colour-golden-track.md`

### ✅ Wave 2 + QC GATE 2 — both closed

P1-5/6/7/8 shipped by the shop track; **QC Gate 2 closed 2026-08-21** on all three blocks
(hero, trust-bar, brand-strip) against Bean's behavioural acceptance test — colour picked in
the editor, computed style changes on the frontend at rest AND on a real pointer hover.

### ⛔ THREE PLAN CLAIMS REFUTED — do not work from the old plan text

1. `sgs/text`'s root cause is a block-REGISTRY check on `supports.interactivity`
   (`ProductCollection/Controller.php:125-134`), **not** a namespace check. `sgs/product-card` sits
   in the same collection and never tripped it — that counter-example killed the namespace theory.
2. **P1-6 is wrong for 3 of its 4 blocks.** `sgs/testimonial-slider` was ALREADY correct — **drop
   it**. `sgs/site-header-row`, named as the "proven recipe", has **no hover pair at all**. Copy
   `sgs/testimonial-slider` instead (explicit `attrMap` + `states.hover.attrMap` bound to its root).
3. "~60 orphaned colour authorings" → the enumerated figure is **42**.

### ⚠ Open, unresolved — FR-38-12 Flip does NOT animate

Root-caused, fixed, opus-reviewed (two Critical findings fixed, incl. a per-frame layout read that
would have breached the CWV budget), deployed. On a VALID test (3-column grid, filter removes the
middle product, two products genuinely reflow) it produced **zero** Flip frames. Eliminated:
attribute present · module + GSAP loaded · reduced-motion off · list resolved correctly · `<ul>` same
object and morphing in place · arm listeners in the shipped bundle. Cause unfound.
`animate_product_filtering` left **OFF**.
⚠ Two earlier negative readings were INVALID setups (a cached page; then a single-column layout where
nothing moves). Re-test only on a multi-column grid where a MIDDLE item is removed.

### Off-plan work completed (Bean-directed)

- **Element-manifest style-defect 12 → 0**; baseline dropped to zero, now the FLOOR. Two
  shared-model gaps caused nearly all of it: `css:box-shadow-color` did not exist (a member claims
  exactly ONE attribute, so the shadow VALUE always won) and no `css:outline-*` member existed.
- **`STATE_WITHOUT_BASE` 4 → 2.** `sgs/post-grid` gained a resting shadow control (built, not
  exempted); `scaleHover` reclassified via a new `noBaseByDesign` mechanism.
- **WP 7.1** — canary upgraded; three stale doc references corrected.
- **DB reseeded** via `/sgs-update`; role map regenerated AFTER it (order is load-bearing).

### Handed to the colour-golden track (Bean copies these across)

1. `.claude/reports/2026-08-20-HANDOVER-to-colour-golden-track.md`
2. `.claude/reports/2026-08-20-HANDOVER-2-to-colour-golden-track.md`
3. `.claude/reports/2026-08-20-HANDOVER-3-R3-complete.md`

⛔ **Read twice** (handover 2 §3): a subagent cleared a finding by remapping `formFocusRingWidth`
from `css:outline-width` to `css:box-shadow`. The gate went green and the manifest became a lie.
"Make the finding go away" and "make the manifest correct" are different instructions.

### Methodology guardrails (do not skip)

- **Deploy before measure.** A test against a live URL before deploying measures stale output.
- **A cached page is not a measurement.** Always cache-bust; two false readings this session.
- **Measure with the flag the gate is actually wired with** — several scripts exit 0 without
  `--check` and 1 with it. Two agents reported "0 → 0" having measured the wrong invocation.
- **Enumerate, don't reason.** Every figure reasoned to this session was wrong; every figure derived
  by listing the items was right.
- **Never regenerate `attr-role-map.json` on a shared worktree** without `/sgs-update` first or a
  row-count diff — it reads the DB, not the tree, and silently drops rows.
- **/qc multi-rater before any commit** touching converter / pipeline / SGS block logic.

---
**The rest of this file is the previous session's handoff, still valid for Phase 2.**

The plan is fly-through ready: every step has a model, exact files, a pre-written cold prompt,
and a four-layer test block.

## The shape of the work

Main agent orchestrates, QCs, deploys and tests — **it writes no implementation code.**

```
WAVE 1 (4 parallel)  → QC-1 → WAVE 2 (parallel) → QC-2   ← Phase 1 ends here
  investigate + gates         independent fixes
                                    ↓
                            CONTAINER SPINE (sequential) → QC-3/4   ← Phase 2
```

`sgs/container` is the bottleneck — four steps touch its files and must run in sequence.
Everything else parallelises around it. Phase 1 needs no design gate and can start cold.

## ✅ Phase 2's design gates (G1/G2) are closed — superseded note: Phase 1 Wave 2 IS blocked

⚠ The heading below was written before Wave 1 ran. It refers to the PHASE 2 gates only. Phase 1
Wave 2 has a live open question (brand-strip colour naming) — see LIVE STATUS at the top.

The G1 council's "third option" was **superseded by Bean's own better answer (R-1)**: the
shared wrapper stays blank (→ CSS `row`), and individual blocks declare their own defaults in
their own `block.json` where their semantics require it. Sharing a render mechanism does not
mean sharing defaults.

**Bean's decisive argument, which no council seat raised:** matching CSS defaults keeps the
cloning pipeline's mapping honest both ways — a draft silent on direction maps to a container
silent on direction, and a draft that stacks must *say* `flex-direction: column`, because
column is not the language default either. Deviating would bake a permanent translation error
into every clone.

**Verification ceremony was CUT (R-2, Bean's call):** no DB census, no formal before/after
capture, no rollback triggers, no blocking triage queue. Pre-production, nothing to preserve.
Kept only what saves time: `npm run build`, one live look after deploy, the one-line
closed-drawer tabbable assertion, and `build-deploy.py` with no bypass flags.

**NEW Phase 1 workstream (R-3): batch enforcement-script fix.** Full register at the end of
`phase-shop-container-remediation.md`. ~60 gates audited. Headline: **the fix already exists
in-tree** — `inspector-scan/core/components.js` `resolveComponentFiles()` already resolves
shared components, and only 4 call sites use it. Every blind script is a missing adopter, not
a missing mechanism. Biggest hole found: **nothing asserts a declared attr is consumed by
`render.php` or the wrapper** — that is the edge that would have caught the `contentWidth`
defect. Also: `editor-render-parity-baseline.json` holds 783 accepted findings that are all
**inert**, because the gate reading them is hardcoded to never fail.

---

## Shipped this session (docs only — no code)

| What | Where |
|---|---|
| **Root-caused the client-side-navigation failure** | `sgs/text` inside `product-collection-no-results` sets `clientNavigationDisabled`. Proved by single-variable swap; 3 consistent variants. **Unblocks instant filtering AND the built-but-dormant FR-38-12 Flip.** Exact line NOT yet found — that is Phase 1 step 1. |
| **Closed D451 + D452** | Both motion fixes live-verified on the canary; outstanding items closed after sitting open since 2026-08-01/06. |
| **Full shop-archive diagnosis** | ~20 reported defects root-caused + 2 found by us (26 keyboard-reachable controls in the closed drawer; no `<main>` landmark). |
| **60 orphaned colour authorings found** | 7 block types, framework + `sites/indus-foods/`. The gate that should catch them runs on every build but has the 3 preset attrs on an unconditional allowlist. |
| **Design doc + phase plan** | `2026-08-20-shop-archive-remediation-design.md` (693 lines) · `phase-shop-container-remediation.md` |

## Decisions taken (all BINDING — do not re-litigate)

| # | Decision |
|---|---|
| **D-1** | A background fills its container's own box and must **NEVER** be capped by content width. `align:"full"` was rejected as patchwork; the fix is the wrapper. |
| **D-2** | `layout` default → `flex`; `flexDirection` stays `""` → **`row`** (CSS default). Bean overruled a `column` recommendation and the council confirmed him right. |
| **D-3** | Gate allowlist fix + template comment/save-markup fixes approved. |
| **D-4** | The 60 orphans get full `SgsColourPanel` standardisation — bg + text, normal + hover, gradient setup 1 for background / setup 2 for text. |
| **D-5** | Editor/frontend parity to be fixed; the parity gate moved to **Phase 1** per D542 (detector first when >3 blocks — this touches 71). |
| **G2** | Container root colour routes through `SGS_Container_Wrapper`. Rule 7 gate satisfied. |
| **Colour** | White-on-pink is Bean's brand call, accepted with the contrast tradeoff. **Per-client only** — the framework default stays compliant; snapshot push WARNS, never gates. |
| **Grid** | Column floor 250px, exposed as an editor setting (`minColumnWidth`), not hardcoded. |
| **Filters** | Mobile = slide-up sheet, one DOM / two presentations. |
| **Dropped** | Child `flex` grow/shrink/basis controls — Bean correctly identified they duplicate `columns`/`gridTemplateColumns`. |

## Corrections made to my own claims (read before trusting older notes)

Five claims stated confidently this session turned out **wrong** and were retracted on evidence:

1. **`stack` is NOT plain block flow.** `.sgs-container--stack` has always been
   `display:flex; flex-direction:column` (`container/style.css:75-78`). Repeating that error
   is what made the `column` recommendation look sensible.
2. **`backgroundColor` is not "silently discarded".** It renders — verified live via
   `has-surface-alt-background-color` + computed style.
3. **The editor "invalid content" error is not the colour attribute.** It is 17 blocks with two
   template authoring bugs (stray comments; self-closing WC leaves).
4. **The Apply button is not a WCAG breach.** That CSS targets selectors that never mount; the
   real button passes at 8.77:1.
5. **The wrapper split did not break the container.** Verified mechanically — a pure move.

**Method note that earned its keep:** every figure derived by *running* something was right;
several derived by *reasoning* were wrong. The Hidden-Decisions pass alone caught 8 real
defects in the first plan draft, including one that would have broken ~280 patterns.

---

## ▶ COLOUR-GOLDEN TRACK — LIVE STATUS 2026-08-21 (this is the OTHER track; shop-archive is above)

**16 commits, all on `origin/main`, all gate-verified. Deployed `--blocks-only` x3.**
`0c44b0c6` `ed517135` `70c88348` `e81ea92a` `6bbd0c7c` `ebad91df` `20332725` `1905257e`
`231df3be` `52b96e68` `f9f4368b` `79969443` `2d291992`

### Shipped, with the two that were verified in a REAL BROWSER marked

| What | Evidence |
|---|---|
| **`ShadowControl` crash on 5 mounts** — picking a shadow colour threw `onColourChange is not a function` and blanked the inspector | `70c88348`. Wrapper now consumes `shadowColour`/`gridItemShadowColour` or it would have been 4 dead controls |
| **D338 CORRECTED framework-wide** — PHP KEEPS undeclared attrs (`prepare_attributes_for_render()` `continue`s past them), JS DROPS them (`getBlockAttributes()` iterates the registered schema) | `e81ea92a`. 5 scripts + `plugins/sgs-blocks/CLAUDE.md` reworded. The gate said "the value never reaches render at all" — it does |
| **Rule 31 sees shared files** — one finding per (owner file, rowKey) with a machine-readable `mountedBy` array | `20332725`. 409 → 420 → **418** |
| **Container background finally editable** + 38 theme authorings migrated by script | `1905257e`. **LIVE-VERIFIED**: paints via `sgs-cst-` uid, 0 ghost classes |
| **`contentWidth` regression fixed** — the band never rendered | `2d291992`. **LIVE-VERIFIED**: `.sgs-container__inner` 0 → **15** on `/shop/` |
| **Gate 2 behavioural PASS on `sgs/brand-strip`** | **LIVE**: colour picked in editor → frontend paints resting colour, hover state AND gradient |
| resting border gradient x2 (`STATE_WITHOUT_BASE` 2→0) · 3 unreachable hover-extension colours deleted · colour declares own `cssProperties` | `6bbd0c7c` `ebad91df` `0c44b0c6` |

### ⛔ CORRECTIONS TO STALE CLAIMS ABOVE — the shop track's section is out of date on these

1. **"Gradients have never been observed working on these blocks" — REFUTED.** Gate 2 run
   behaviourally on `sgs/brand-strip`: a `linear-gradient` hover rule paints, paired
   `:hover, :focus-within`. That was an untested assumption, not a measured failure.
2. **"`sgs/container` now gives NO horizontal gutter … looks like a regression from this
   evening's container work" — NOT MINE, and now fixed.** Neither container commit contained a
   padding line. Root cause: `163f9fa7` migrated 96 `core/group` instances to `sgs/container`,
   correctly translating `layout:{"type":"constrained"}` (WordPress's own gutter) into
   `contentWidth:"normal"` — and `class-sgs-container-wrapper.php:431` discarded it. Fixed in
   `f9f4368b` + `2d291992`.
3. **P2-6 is PARTIAL BY DESIGN, not incomplete.** 39 container authorings renamed. The
   remaining `sgs/site-footer` (7) and `sgs/site-header-row` (3) MUST NOT be renamed until
   those blocks migrate off native colour — renaming now makes WP discard them and the
   footer loses its background silently. The 152 `fontSize` authorings are WP-native
   typography and out of scope entirely.

### ✅ CONTAINER + SHOP WORK — COMPLETE 2026-08-21

Full detail: `.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md`.
Commits `0843567d` `669bc1e5` `40411532` `f5e184d5` `38fa1324` `1a127c06`, all deployed
and live-verified.

Four defects were ONE bug: band CSS (`max-width` + `margin-inline:auto`) painted on the
container's OUTER box. Fixed by routing band properties to a dedicated band selector.
- **P2-1 CLOSED** — container background no longer capped (`max-width: 1280px` → `none`).
- Product cards 165px → **261px**; shop grid restored (was stacked, cards crushed to 73px).
- Footer column 48px → **400px**; header icon cluster padding 24px → **0**.
- Filter box now level with the cards (was 24px low).
- **Results count + sort control BUILT** and behaviourally verified (5 → 3 on filter;
  prices sort ascending).

⛔ The shop-grid break was NOT from this track's work — it came from `2d291992`, which made
the band render for the first time (0 → 15). Its own note warned only `/shop/` was checked;
`/shop/` at DESKTOP was the unchecked case.

### ✅ QC GATE 2 — CLOSED on all three blocks (2026-08-21)

`sgs/hero` and `sgs/trust-bar` verified in the EDITOR with a real login, then on the
frontend: colour panel present, swatch picked, attribute stored as a **slug** (token
survives), resting colour paints, and a **real pointer hover** repaints
(hero primary→accent, trust-bar success→cookie-brown). Zero console errors, `isValid:true`.
Fixture page 2588 — safe to delete.

### 🔵 TWO DECISIONS WAITING ON BEAN

1. **Sticky filter sidebar** — `position:sticky` applies but does nothing (no travel room:
   panel 1154px is the tallest grid item AND taller than the viewport). ⛔ The obvious
   `max-height + overflow-y` fix was MEASURED INERT — capped to 852px it still exceeds the
   829px product column. Three specialists: don't build sticky yet; accordion-collapse the
   filter groups instead. Sticky earns its place at ~50 products.
2. **Cap-the-children vs the injected band** — council says adopt-with-changes, scoped
   narrowly. A blanket swap deletes `@container`, the GSAP fx track, and grid-on-inner.
   Fix `inspector-scan` rule 23's regex FIRST — it goes silently wrong, not red.

### Still open on this track (not started)

1. **Gradient mechanism-awareness** — `row-missing-gradient` (193) checks "does *a* gradient
   path exist", not "is it mechanism-correct". A text row wired to the background mechanism
   passes clean while rendering nothing. 3-mechanism model specified in the report's ADDENDUM.
2. **Defect-level matching** rule 31 ↔ colour-coverage. Both sides compute `attrName` and
   both DISCARD it — that is the join key.
3. **Gate 2 on `sgs/hero` + `sgs/trust-bar`** — only brand-strip was tested.
4. **`textColour` parent/child ruling** — HC2's carve-out PERMITS a root-scoped inheritable
   default (hero's paints the root, verified); needs the full parent list enumerated, not two
   examples.
5. **Theme-snapshot slug-valued palette entries** — `sites/mamas-munches/theme-snapshot.json`
   has 2 (`client-surface-pink: "surface-pink"`, `client-text: "text"`). Confirmed, not fixed.
6. **`css:box-shadow-color` canonical shape** — registry says a `DesignTokenPicker` row inside
   `SgsColourPanel`, not a lone field on the shadow builder. Rule 31's widened scan
   independently flagged the same thing.

### Method note that earned its keep this session

**Every one of my three measurement errors was the same bug: matching a pattern without
checking what produced it.** A grep that hit comments; a `render.php` bracket-style mismatch
(`['x']` vs `[ 'x' ]`) that produced a false "not consumed"; an `innerHTML` regex that caught a
WordPress *core* search button and made me wrongly announce my own commit wasn't deployed. The
fix is structural, not care: **resolve every match back to its owner before concluding.** That
is exactly what `mountedBy` does in the rule-31 work, which is why it is the one number here
worth trusting.

---

## Pointers

| For | Read |
|---|---|
| Executable plan | `.claude/plans/phase-shop-container-remediation.md` |
| Full evidence + decisions | `.claude/plans/2026-08-20-shop-archive-remediation-design.md` |
| Colour-golden master table + status | `.claude/reports/2026-08-20-colour-golden-scan-set.md` |
| Colour-golden raw evidence (8 scanners) | `.claude/reports/2026-08-20-colour-golden-raw/` |
| Structural defences / STOP catalogue | `.claude/STOP-CATALOGUE.md` |
| D-numbered log | `.claude/decisions.md` (ceiling verified via the `^## D[0-9]+` anchored grep) |
| Parked work | `.claude/parking.md` |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — never `--allow-dirty`, never `--skip-verify` (D336) |
