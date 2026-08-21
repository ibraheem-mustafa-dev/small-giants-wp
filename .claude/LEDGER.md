---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-20
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **THREE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **Tier W / motion** track owns
`## ▶ TIER W (MOTION) TRACK` at the bottom and is CLOSED — nothing is pending there.

**If you are the shop-archive track**, read, in this order:

1. `.claude/plans/phase-shop-container-remediation.md` — Phase 1 is COMPLETE. The live front
   is the container capability gap below.
2. `~/.claude/memory/research/2026-08-21-wp-block-theme-main-width-and-full-bleed-bands.md`
   — the research that reframes Phase 2. Read this BEFORE touching the container.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL if touching converter/walker.

## Task 1 — Rule on the container's width model (Bean, then build)

**What:** `sgs/container` caps content by INJECTING `.sgs-container__inner` with a `max-width`
on it. WordPress core instead caps a container's CHILDREN with a selector that excludes
`.alignfull`, so a child can opt out. Ours has no opt-out: a full-bleed child of a constrained
parent is INEXPRESSIBLE, which is why `<main>` had to be unconstrained on the shop template.
**Why:** every full-bleed band on every client build hits this. It is the same work the
colour-golden track scoped as their §4b.
**Orchestration:** inline (Opus) for the ruling — it is a Rule 7 shared-mechanism change and
needs Bean's sign-off. Build afterwards: sonnet, scoped to `container_kind='content'` only.
**Guardrail:** three capabilities structurally need the real node and must keep it —
`@container` queries, `data-sgs-fx-track` (GSAP), grid-on-inner. Not a blanket swap.
**Prerequisite, non-negotiable:** widen
`scripts/inspector-scan/rules/23-content-width-needs-inner-band.js` FIRST — its regex expects a
dot-class after `>`, so core's `:where(...)` shape makes it report "no band" for every correctly
migrated block. It goes silently wrong, not red.
**Acceptance:** a container with `contentWidth:normal` has a child with `align:full` spanning
edge-to-edge, measured live. Not "the CSS looks right".

**THE SHOP PAGE IS THE SECOND HALF OF THIS TASK.** Two things there exist ONLY as workarounds
for the gap and should be reverted once it closes, in `templates/archive-product.html`:
1. `<main>` is `contentWidth:"full"`. Canonical is a CONSTRAINED `<main>` whose constraint caps
   children — restore that once a child can opt out with `align:full`.
2. The wrapper around `sgs/collapsible-text` exists only because an unconstrained `<main>` would
   let that operator copy span the viewport. In core's model it is unnecessary — TT5 puts
   `query-title`/`term-description` straight into `<main>` with no wrapper. Delete it then.
Bean ruled on keeping both for now; they are deliberate debt with a named trigger, not drift.

## Task 2 — Two decisions the colour-golden track is waiting on

Sticky sidebar (their evidence says the accordion already solved it — RE-MEASURE before
building anything) and the band-replacement model, which is Task 1 by another name. See their
section below.

## Task 3 — PR #35 (Indus Foods colour renames) needs review or merge

Two commits, static-verified only; Indus is not deployed anywhere to look at.

## ▶ LIVE STATUS — 2026-08-21 (shop-archive track)

**All pushed to `origin/main`. Build GREEN. Canary deployed and live-verified.**

**PHASE 1 IS COMPLETE.** Wave 1 + Wave 2 + R-3 all shipped; QC Gate 2 closed by the
colour-golden track against Bean's behavioural test (swatch picked in the editor, computed
style confirmed on the frontend at rest AND under a real pointer hover, with a negative
control). Per-step detail is single-sourced to the plan doc, not duplicated here.

### Shipped this session (2026-08-21)

- **Shop filter UI rebuilt.** Accordion (`<details>`/`<summary>`) collapses the filter groups:
  panel 1154px → 505px, which is what finally made `position:sticky` work — held at its 24px
  offset through a 300px scroll. ⚠ Both figures are LIVE-DOM measurements with no repo
  artefact: 1154 is the colour-golden track's pre-accordion reading, 505 is this session's
  post-accordion one. Re-measure rather than cite them if they matter. The height-cap approach the other track measured as
  inert stayed inert; shortening the CONTENT was the load-bearing fix.
- **Ten review defects fixed** — nine enumerated in `4da95b46`'s own message, plus the
  heading band (`451aae75` + `9a0347aa`), which Bean raised separately. Verified live at
  1440 and 390. (Stated as 9+1 because the commit enumerates nine; the tenth is its own
  commit pair.)
- **`<main>` landmark restored sitewide.** ALL NINE templates authored `tagName:"main"` and
  ZERO pages rendered one — `main` was absent from both the block.json enum and the wrapper
  allowlist, so every page silently fell back to `section`. Now allowed with a per-request
  singleton guard: first claim wins, any later one falls back. Reverses an earlier deliberate
  removal without reopening the footgun it closed (a client duplicating a container).
- **`sgs/site-footer` migrated off WordPress's native colour path** — the last block on it —
  atomically with its 7 theme authorings, so no window existed where a pattern was half-migrated.
- **`sgs/cta-section` colour attrs renamed to British** + its 11 client authorings (PR #35).
- **THEME ASSETS WERE BEING SERVED STALE** to any warm browser cache, and had been for a long
  time: every theme CSS/JS URL carried the theme version, which is never bumped, so an asset
  deployed between releases kept an identical URL. Same URL returned 10,199 fresh bytes vs
  5,079 cached. Now versioned by `filemtime` (`d3e98700`). A server cache purge does NOT fix
  it. ⚠ Re-test anything theme-side you judged before that commit.

### ⛔ THE LIVE FRONT — a container capability gap, now researched

`sgs/container` injects `.sgs-container__inner` carrying `max-width` ON ITSELF. Core instead
emits `.is-layout-constrained > :where(:not(.alignfull)) { max-width: … }` — capping CHILDREN,
excluding `.alignfull` by name, at zero specificity. Ours therefore cannot express "full-bleed
child of a constrained parent" at all; unconstraining `<main>` was a workaround, not the answer.
Confirmed independently by three research legs against fetched theme markup and core's own
PHPUnit stylesheet assertions. Full findings + ruled-out options in the research file.
⚠ `sgs/container` emits NO `.is-layout-constrained` class, so `useRootPaddingAwareAlignments`
cannot help for free — that option is weaker than it first appears, not stronger.

### P2-6 rename — status corrected

The other track's note below says `sgs/site-footer` (7) and `sgs/site-header-row` (3) must NOT
be renamed until those blocks leave the native colour path. That was right, and this session
satisfied it: site-footer was MIGRATED and renamed in one commit; site-header-row was renamed
because it already declared only the British name and its 3 authorings were writing an
attribute WP discards. Their warning is met, not violated.

### Corrections made to my own claims this session

1. **D338 is only half true** (their D704): WP drops undeclared attrs from the EDITOR schema
   but PHP does NOT drop them before `render.php`. Several blocks read
   `$attributes['backgroundColor']` anyway to re-add `has-*` classes. So of 21 authorings
   renamed, 16 were genuinely dead and **5 were already painting**. The renames still stand
   (canonical `sgs_colour_value()` path) but were not all fixes.
2. **"cta-section backgrounds are dead" — WRONG.** It declares those attrs explicitly, so WP
   registers them regardless of `supports.color.background`. Consistency work, not a repair.
3. **"The client's tokens are inconsistent" — WRONG, retracted.** `primary` is the brand
   colour, `primary-text` is the text that sits on it. Nothing to fix in the snapshot.
4. **A rule that loses is indistinguishable from a rule that is absent.** Two deploys "did
   nothing" because my selector was (0,1,0) against an existing (0,2,0). Fix the rule that
   already OWNS the element; never add a competing one.

### Methodology guardrails (do not skip)

- **Deploy before measure.** A test against a live URL before deploying measures stale output.
- **A cached page is not a measurement.** Always cache-bust.
- **Measure with the flag the gate is actually wired with** — several scripts exit 0 without
  `--check` and 1 with it.
- **Enumerate, don't reason.** Every figure reasoned to was wrong; every figure derived by
  listing the items was right.
- **Never regenerate `attr-role-map.json` on a shared worktree** without `/sgs-update` first.
- **/qc multi-rater before any commit** touching converter / pipeline / SGS block logic.
- **A dead selector fails silently.** Five times this session, CSS targeted markup WooCommerce
  had changed; an unmatched selector looks exactly like a missing one. Verify against the LIVE
  DOM, never the stylesheet.
- **Two owners for one element is the defect** — correct the owning rule, delete the challenger.
- **Shared worktree:** commit path-scoped (a repo hook enforces it) and never trust a
  subagent's "not my block" attribution while another session is committing.

## Decisions taken (BINDING — do not re-litigate)

| # | Decision |
|---|---|
| **D-1** | A background fills its container's own box and must NEVER be capped by content width. |
| **D-2** | `layout` default → `flex`; `flexDirection` stays `""` → **`row`** (CSS default). |
| **D-4** | Orphan colour authorings get full `SgsColourPanel` standardisation — bg + text, normal + hover, gradient setup 1 for background / setup 2 for text. |
| **G2** | Container root colour routes through `SGS_Container_Wrapper`. Rule 7 satisfied. |
| **Colour** | White-on-pink is Bean's brand call. Per-client only; the framework default stays compliant. |
| **Grid** | Column floor 250px, exposed as `minColumnWidth`, not hardcoded. |
| **Filters** | Mobile = slide-up sheet, one DOM / two presentations. Scrollbar STYLED, not hidden — a filter panel has no other affordance, unlike the carousels. |
| **Canary** | Canary content is a test rig. A regressed test page gets deleted, not protected. |


## ▶ COLOUR-GOLDEN TRACK — LIVE STATUS 2026-08-21 (this is the OTHER track; shop-archive is above)

**16 commits, all on `origin/main`, all gate-verified. Deployed `--blocks-only` x3.**
`0c44b0c6` `ed517135` `70c88348` `e81ea92a` `6bbd0c7c` `ebad91df` `20332725` `1905257e`
`231df3be` `52b96e68` `f9f4368b` `79969443` `2d291992`

### Shipped earlier on this track

`70c88348` ShadowControl crash (5 mounts) · `e81ea92a` D338 corrected framework-wide (PHP keeps / JS drops) · `20332725` rule 31 sees shared files (409→418) · `1905257e` container background editable + 38 authorings migrated · `2d291992` contentWidth regression · `6bbd0c7c` `ebad91df` `0c44b0c6` resting border gradients + dead colour cleanup. Full detail in the commits and in the colour-golden scan-set report.


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

### ✅ COLOUR SURFACE — text colour landed on the two blocks that needed it (2026-08-21)

- **`sgs/container`** (`0f2c167f`) — had NO reachable text control at all: its manifest mapped
  `css:color` to `native:color.text` while `supports.color` is FALSE, a binding pointing at a
  mechanism that cannot exist. Four owned attrs via the shared emitters + a panel row.
  **DEPLOYED + VERIFIED**: resting and hover both paint as TOKENS, child `sgs/text` inherits.
- **`sgs/cta-section`** (`7b9357cc`) — `textColour`/`textColourHover` were rendered but
  EDITOR-UNREACHABLE (zero refs in edit.js). Now exposed + gradients; `supports.color.text`
  off (0 authorings affected) so native UI doesn't compete (rule 31). **DEPLOYED + VERIFIED.**
- **`sgs/site-header`** — correctly NOT changed. Its `colourExemptions.text` gradient exemption
  is gate-enforced and names the real reason: `background-clip:text` would hijack the wrapper's
  background box and destroy the header background this same block paints.
- **Help text fix** — the shipped wording told clients to LOWER THE ALPHA, which is the exact
  token-corrupting step 4 exists to fix. Rewritten. ⛔ The RENAME half of step 3 was CANCELLED:
  it came from D2b, which the design doc marks superseded.
- **D714–D716 pasted** for the Tier-W session, renumbered against the ceiling at paste time.

### ✅ QC GATE 2 — CLOSED on all three blocks (2026-08-21)

`sgs/hero` and `sgs/trust-bar` verified in the EDITOR with a real login, then on the
frontend: colour panel present, swatch picked, attribute stored as a **slug** (token
survives), resting colour paints, and a **real pointer hover** repaints
(hero primary→accent, trust-bar success→cookie-brown). Zero console errors, `isValid:true`.
Fixture page 2588 — safe to delete.

### 🔵 NEXT SESSION'S FIRST TASK — step 4, APPROVED BY BEAN 2026-08-21

**`backgroundOverlayOpacity`.** ⚠ It is a DECISION REVERSAL, not a gap-fill. The bug is real
and reachable: `DesignTokenPicker.js:139-140` stores a palette SLUG only on exact string
equality, and `enableAlpha` defaults to `true` (`:468`) — so lowering alpha stores a RAW HEX
and silently unlinks the client's brand token. ⛔ But `class-sgs-container-wrapper.php` carries
an explicit in-code prohibition from D581 (2026-08-11): *"`backgroundOverlayOpacity` no longer
exists as an attribute … do not reintroduce it here."* Scope is NOT the 40 min the plan says:
8 block.json + the shared wrapper (Rule 7 gate) + removing that prohibition + a new D-number
superseding D581's D5 + a ruling on whether `enableAlpha` stays true. Full brief in
`.claude/plans/2026-08-20-unified-colour-panel-DESIGN.md` § "STEP 4 — APPROVED".
⭐ Frame the supersede as "D581 was right about simplicity, wrong about which mechanism" — the
alpha side effect was not known when it was made.

### 🔵 STILL WAITING ON BEAN

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
3. ~~Gate 2 on hero + trust-bar~~ — ✅ **CLOSED 2026-08-21.** Verified with a real editor
   login: colour picked, stored as a SLUG, resting paints, REAL POINTER HOVER repaints
   (hero primary→accent, trust-bar success→cookie-brown). Zero console errors.
4. ~~`textColour` parent/child ruling~~ — ✅ **SETTLED 2026-08-21, D713.** A section-class
   block parents any non-section block with no forced parent, so a parent-level textColour is
   the INHERITABLE cascade default; the child's control overrides one instance. Keep both.
   Applied to all 8 baseline entries. ⛔ `sgs/modal` is EXCLUDED (a UI shell, not a page
   section) — built, then reverted in full on Bean's call.
5. **Theme-snapshot slug-valued palette entries** — `sites/mamas-munches/theme-snapshot.json`
   has 2 (`client-surface-pink: "surface-pink"`, `client-text: "text"`). Confirmed, not fixed.
6. **`css:box-shadow-color` canonical shape** — registry says a `DesignTokenPicker` row inside
   `SgsColourPanel`, not a lone field on the shadow builder. Rule 31's widened scan
   independently flagged the same thing.

### Method note (colour track)

**Resolve every match back to its owner before concluding.** Every measurement error across
this track's sessions was the same bug — matching a pattern without checking what produced it:
greps hitting comments; a specificity computed from a `selectorText` sliced to 70 chars; a
16-class list read through `head -6` and reported as a missing class. Full write-ups in
`memory/feedback_resolve_every_match_back_to_its_owner.md` and the visual-diff reports.

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

---

## ▶ TIER W (MOTION) TRACK — CLOSED 2026-08-21

**Status: SHIPPED, merged to `main`, deployed, live-verified. Nothing pending.**
Do not re-open this section to "continue" it — if you are here for motion work, the open
register is `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`, not this.

**What shipped.** Spec 38's fourth tier (Tier W / WebGL, D479) had **zero code** for
eighteen days while the spec, `specs/README.md`, the gap register and fourteen memory files
all described it as part of the system. It now exists, with one effect on its closed list:
**FR-38-29 surface treatments** — grain / halftone / duotone, GPU shaders applied to the
image a block already renders, offered on 15 image-bearing blocks.

- Substrate: `src/shared/effects/webgl/` — zero-dependency WebGL2 behind D479's
  `init / setUniform / destroy` interface. A Gate-A grep enforces that nothing outside that
  directory imports `renderer.js`, so "swappable in one file" is a CHECKED invariant.
- Motion: the treatment DEVELOPS IN on scroll (`uResolve` 1 → 0). Client toggle
  "Reveal on scroll", default ON.
- Colour: every treatment has a client colour, defaulted to the site palette and stored as
  palette slugs, so re-theming re-colours every treated image.
- **5,674 bytes gzip — 4.6% of the named 120KB Tier W allowance.**
- Canary `/tier-w-surface-canary/` (page 2594); probe
  `scripts/motion-qa/probe-tier-w-surface.mjs` → **23/23**, 1 honestly SKIPPED.
- Evidence: `reports/visual-diff/tier-w-surface-2026-08-21.md`.

**Owed, and deliberately not done** (all recorded in Spec 38 §3 FR-38-29, none silently
dropped):
- **Naked-`<img>`-root blocks no-op.** `sgs/decorative-image` renders its `<img>` AS the
  block root; the boot module looks for a nested one. 13 of 15 offered blocks nest theirs.
  Fixing needs a re-parent or wrapper, and that block's responsive tiers use compound
  selectors on the `<img>` — a design decision, not a patch.
- **`sgs/media` is not offered at all** — no fx panel, and `creates_panel=0` correctly will
  not create one. Escape hatch is `supports.sgs.fx.motionSurface: true` on that block.
- **`sgs/media` + `sgs/decorative-image` both violate a standing project rule**: they render
  an `<img>` and neither declares `imageControls`. Pre-existing.
- **Probe arm 7's GPU-tally assertion is unverifiable on a live page** and reports SKIPPED,
  never PASS.

**D-entries: LANDED as D714 / D715 / D716.** They were staged in a scratch file during the
build rather than written straight into `decisions.md`, because that file was carrying 91
uncommitted lines from the colour-golden track all session and committing it by path would
have swept their work into this branch. The colour-golden track merged them in on
2026-08-21; verified present and complete, and the scratch file is deleted.

**FR numbering:** FR-38-29, not 28 — `FR-38-28` is reserved by the Bean-signed but unbuilt
pointer-reactive-backgrounds design gate (`plans/2026-07-31-step7-cursor-follow-background-design-gate.md`).

### Separately answered this session: does FR-38-12 Flip animate? NO.

Not a bug in `fx-flip.js` — **do not let anyone "fix" it.** The site setting had never been
switched on, and with it on the effect still cannot animate because WooCommerce performs a
FULL PAGE NAVIGATION on a filter change (proven: a stamped `window` variable did not survive,
2 main-frame navigations, products 5 → 3). There is no client-side re-layout for
`Flip.from()` to animate — D426 recurring at the redirected target. The next question is a
WooCommerce one. Evidence + three candidate causes:
`reports/2026-08-21-flip-does-it-animate.md`. Setting restored to its found state.
