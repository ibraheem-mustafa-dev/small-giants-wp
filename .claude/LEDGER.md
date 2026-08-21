---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-20
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FOUR TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **Tier W / motion** track owns
`## ▶ TIER W (MOTION) TRACK` at the bottom and is CLOSED — nothing is pending there.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4 shipped)

Shipped, deployed, canary-verified (D731/D732/D733/Phase 4): one shared corner-shorthand
helper + **109 vacuous `function_exists` guards** removed + **204 length call sites** migrated
from the crude to the hardened sanitiser. Standards + rationale are single-sourced — do not
restate them here: **Spec 32 §6.1 (a1)/(a2)** (shared shorthand builders; the sanitiser
contract) and **Spec 35 Part K** (the gate + two method rules). Enforcement:
`npm run check:vacuous-guards`, wired into `prebuild`.

**Phase 4 (the programme's only behaviour change) shipped 2026-08-22, commits `a2f6d5df` +
`bbf13cc2`.** `sgs_css_length_sanitise()` → `sgs_css_length_value()` across 56 files (204 call
sites), via new codemod `scripts/migrate-length-sanitiser.py` (survey/fix/check/self-test,
mutation-tested negative control). Two sites deliberately excluded (named in the script):
testimonial `quoteLineHeight` (unitless-legal) and google-reviews `gr_pct` (bare number +
caller-appended `%`). 5 stranded `function_exists('sgs_css_length_sanitise')` guards
retargeted to the new function name. Live-proven on a dedicated probe page
(`gate-length-sanitiser-probe`, since deleted): before-deploy CSS showed
`border-top-left-radius:calc20px1vw` (corrupted); after-deploy showed
`border-top-left-radius:calc(20px + 1vw)` (correct). Zero PHP fatals, zero new debug.log
entries, payload-verify + motion-QA both green on deploy. Visual-diff gate scoped-bypassed for
44 markup-touching-but-behaviour-identical blocks (logged, `bbf13cc2`) — real risk was
edge-case-only (negative/calc/multi-value/bare-integer inputs absent from live content), the
one edge case that IS live (`gr_pct`) was excluded from the migration, not shipped untested.
Prompt B is deleted — done. Nothing remains on this track.

**If you are the shop-archive track**, read, in this order:

1. `.claude/plans/phase-shop-container-remediation.md` — Phase 1 is COMPLETE. The live front
   is the container capability gap below.
2. `.claude/decisions.md` D725 + D726 — the width model, SETTLED. Read before any
   container work; they close what the research below merely optioned.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL if touching converter/walker.

## Task 1 — container width model: ✅ CLOSED 2026-08-21 (D725 / D726)

**Settled the OPPOSITE way to how this task was written, so read D725 before acting on any
older note about it.** The task assumed we would adopt core's cap-the-children model. Bean
ruled the other way: our `contentWidth` already caps content in the right place, so core's
duplicate `layout:{"type":"constrained"}` was DELETED from the last three templates
(`c984a676`). One cap per page, and it is ours.

⛔ **Three instructions that used to live here are now WRONG — do not act on them if you meet
them in an older doc, a branch or a stale summary:**
1. ~~"Prerequisite, non-negotiable: widen inspector-scan rule 23"~~ — that was only needed for
   the migration we did not do. The regex is correct for the model we kept.
2. ~~"Acceptance: a container with `contentWidth:normal` has a child with `align:full` spanning
   edge-to-edge"~~ — wrong test. A full-bleed section is a SIBLING, not a child; nothing needs
   to break out. `alignfull` is unnecessary here rather than broken.
3. ~~"`<main>` is `contentWidth:full` — a workaround; restore a constrained `<main>`"~~ — that
   is now CANONICAL. `<main>` is structure and passes width through. The
   `sgs/collapsible-text` wrapper is likewise a legitimate opt-IN to a band, not debt.

**Measured live 1440/768/390:** stacked caps 3 → 0; `<main>` 1425px unbanded; 26 sections
full-bleed outer + 1280px inner; `single.html` 0 uncapped. **Accepted consequence (D725):** a
block placed straight into a page is intentionally full-width — it keeps its own
padding/margin/alignment. Do not "fix" it.

## Task 2 — Two decisions the colour-golden track is waiting on

Sticky sidebar (their evidence says the accordion already solved it — RE-MEASURE before
building anything) and the band-replacement model, which is Task 1 by another name. See their
section below.

## ▶ LIVE STATUS — 2026-08-21 (shop-archive track)

**All pushed to `origin/main`. Build GREEN. Canary deployed and live-verified.**

**PHASE 1 IS COMPLETE.** Wave 1 + Wave 2 + R-3 all shipped; QC Gate 2 closed by the
colour-golden track against Bean's behavioural test (swatch picked in the editor, computed
style confirmed on the frontend at rest AND under a real pointer hover, with a negative
control). Per-step detail is single-sourced to the plan doc, not duplicated here.

### Shipped this session (2026-08-21)

- **Container/width session (same day).** One cap per page (`c984a676`); the EDITOR now renders
  the `.sgs-container__inner` band it had styled but never created, so band controls finally
  move the canvas (`921954fc`; 7 banded / 4 unbanded, exactly tracking `contentWidth`);
  archive-product's WC blocks made valid (`a47e76f2`, `426d3d42`); `build-deploy.py` purges BOTH
  cache layers — the OPcache reset both CLAUDE.md files claimed existed did not (`32315c37`);
  4 dead template-part slots deleted (`0413f76e`); P2-6 residual closed (`7636397d`).
  D719-D721, D725, D726.

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

`70c88348` ShadowControl crash · `e81ea92a` D338 corrected framework-wide · `20332725` rule 31
sees shared files · `1905257e` container background editable + 38 authorings · `2d291992`
contentWidth regression · `6bbd0c7c` `ebad91df` `0c44b0c6` resting border gradients + dead
colour cleanup. Detail: the commits + `.claude/reports/2026-08-20-colour-golden-scan-set.md`.

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

### ✅ Completed earlier on this track, 2026-08-21 (archived)

Container + shop work, the colour-surface text-colour landings (`sgs/container` `0f2c167f`,
`sgs/cta-section` `7b9357cc`), and QC Gate 2 closing on hero + trust-bar are all COMPLETE.
Sections moved VERBATIM to `memory/session-2026-08-21-colour-golden-completed.md` to keep this
file under its byte cap — nothing edited or dropped. Detail also in `decisions.md`, the commits,
and `.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md`.

### ✅ STEP 4 + hero convergence — SHIPPED, DEPLOYED, LIVE-VERIFIED 2026-08-21 (D717, D718)

`88d7cf14` `7dff615b` `bcb38d5f` `135b3284` `b64d40b0`. Evidence:
`reports/visual-diff/d717-overlay-opacity-2026-08-21.md`. Full reasoning: D717 + D718.

**D717 — `backgroundOverlayOpacity` (default 30) on the 8 blocks mounting `<BackgroundPanel>`,
one `RangeControl` reaching all 8; `linked` + `enableAlpha={false}` on the shared picker.**
Supersedes D581's D5: one transparency mechanism was right, alpha was the wrong one — it
silently unlinks the palette token. ⛔ **The brief blamed alpha; the larger half came from
reading source** — that mount was the ONLY colour row missing `linked` (against ~40), so it
stored a raw hex on EVERY pick. Negative control on pre-fix deployed code: "Primary" stored
`#e68a95`; same gesture post-fix stored `primary`. New shared owner `sgs_overlay_decls()`.

**D718 — hero's overlay converged with the wrapper.** Bean: *"why is the hero different anyway?"*
Removed the legacy `: 'text'` fallback (git shows it PREDATES the 2026-08-11 redesign — never a
decision) and the background-image-alone trigger. **All 8 blocks: no colour set = no overlay.**
⛔ **Why D717 didn't already fix it:** it unified the PAINT but left the POLICY hand-written at
both call sites. **A helper owning the value but not the CONDITION makes two implementations
LOOK converged without converging them.** Both now derive existence from the helper's return.

**Not chosen:** `accent`@30 as hero's default — light hero text over a mid photo: `text` 5.37:1,
`accent` **2.78:1**; more accent opacity is WORSE (1.72 at 80%). Convergence dissolved it.

⛔ **My corrections:** (a) I argued 30% would wash out plain backgrounds — Bean was right, all 8
render their own `backgroundColour`; my source was a wrapper comment stale since `1905257e`,
**corrected in place**. (b) "2 blocks" was 2 PAINT SITES; the control reaches 8. (c) I reported
D717's four review questions "answered empirically" when Q4 was only NAMED — Bean's questions
forced the measurement and it changed the finding. My call that a council added nothing was wrong.

⚠ **Visual-diff gate scoped-skipped** (logged) each time: capture needs the deployed build,
deploy refuses a dirty tree. The reports are **evidence records, not gate tokens** —
`source_sha` is `NOT-COMPUTABLE`, so none can wave through a future commit.

### ✅ D724 — shared wrapper renders a simple section background as a real `<img>` (2026-08-21)

**CLOSED — shipped, deployed, live-verified. Nothing pending.** Full section moved VERBATIM to
`memory/session-2026-08-21-colour-golden-completed.md` on 2026-08-21 to bring this file back under
its byte cap. Nothing was edited or dropped.

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

## ▶ DOC-DEBT / MOTION-REGISTER TRACK — 2026-08-21 (a THIRD track; all pushed)

**All on `origin/main`. Build GREEN. Canary deployed + live-verified.**

**⛔ Two live defects — read first:**
1. **`sgs/hero`'s overlay gradient was silently replaced by the flat colour** (`fc261fd3`).
   `$overlay_gradient` never existed — one reference, zero assignments, ever — so the null fell
   through to `background-color` and the overlay still painted, which is why it survived.
   Live-proven fixed with a negative control:
   `reports/visual-diff/hero-overlay-gradient-2026-08-21.md`. ⚠ Cause: an asymmetric pair,
   `backgroundOverlayColour` vs `overlayGradient`.
2. **I broke `main` for ~5 min** (`87d904a6`): a `'src/blocks/*/render.php'` GLOB satisfied the
   path-scoped-commit hook and swept the co-active track's half-done edit. **A glob over a
   shared directory is `git add -A` wearing a pathspec.** Enumerate exact filenames.

**⛔ THREE comments asserted the OPPOSITE of their own code** (nav-menu ×2, responsive-logo) —
this codebase's doc debt is confident wrongness, not verbosity.

**Shipped:** motion registers + Spec 38 swept · 121 sanitiser closures across 57 files onto 3
shared helpers already existing at 3% adoption · ~370 lines of narrative cut from 78 files ·
no-inline prose → one pointer per block · `R-22-14`→`R-31-14` ×14 · scroll-smoother → `tier='H'`.

**⛔ Detail, owed follow-ups, and the 11-gate-backed-vs-37-UNENFORCED split:
`.claude/reports/2026-08-21-unenforced-prohibition-register.md`. Read before continuing.**

## ▶ CLEANUP TRACK — comment-narrative trim, ~70 files (OPEN, unblocked)

Not parked; pick up any time. 20 densest files done (~370 lines), ~70 remain at ~9 each.
**Rules, tooling, owed items + a ready session prompt:
`.claude/plans/2026-08-21-comment-narrative-cleanup-track.md`.**

## ▶ TIER W (MOTION) TRACK — CLOSED 2026-08-21

**Nothing pending. Do not re-open this to "continue" it.** Shipped, merged, deployed,
live-verified: Spec 38's fourth tier (WebGL, D479) now exists, with FR-38-29 surface treatments
on 15 image-bearing blocks at 5,674 bytes gzip. D714-D716.

Full section — what shipped, the four things deliberately NOT done, and the FR-38-12 Flip
finding — moved VERBATIM to `memory/session-2026-08-21-tier-w-closed.md` on 2026-08-21 to bring
this file back under its byte cap. Nothing was edited or dropped. For motion work the open
register is `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`, not that archive.
