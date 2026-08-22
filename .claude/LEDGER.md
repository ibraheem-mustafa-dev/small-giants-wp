---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-22
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FIVE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **Tier W / motion** track owns
`## ▶ TIER W (MOTION) TRACK` at the bottom and is CLOSED — nothing is pending there.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⭐ **If you are the colour-golden track, do NOT start from that section.** Read
`.claude/plans/phase-colour-conformance.md` — it is the executable front and carries 10
pre-answered decisions. It is marked **NOT-READY on purpose**: Wave 1's resolver premise was
measured and found blind to most of the tree. The ledger section is status; the plan is the work.

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

1. `.claude/plans/phase-shop-container-remediation.md` — **Phase 1 AND Phase 2 are BOTH
   COMPLETE (2026-08-22, D742).** P2-2/P2-4/P2-5/P2-7 (the four steps still open at the end
   of the fourth session) shipped, deployed to sandybrown, live-verified, and reseeded.
   Phase 3 (the per-template pass, P3-1 through P3-9) is the only work left in this plan
   and has not been started.
2. `.claude/decisions.md` D725 + D726 (width model) and **D742** (P2-2/P2-4/P2-5/P2-7
   close-out) — read before any further container work.
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

## ▶ LIVE STATUS — 2026-08-22 (shop-archive track — Phase 2 CLOSED)

**All pushed to `origin/main`. Build GREEN. Canary deployed and live-verified.**

**PHASE 1 AND PHASE 2 ARE BOTH COMPLETE.** Wave 1 + Wave 2 + R-3 all shipped; QC Gate 2
closed by the colour-golden track against Bean's behavioural test (swatch picked in the
editor, computed style confirmed on the frontend at rest AND under a real pointer hover,
with a negative control). Phase 2's four remaining steps (P2-2/P2-4/P2-5/P2-7) closed
2026-08-22 — see D742 for the full write-up. QC Gate 3 and QC Gate 4 both closed live.
Per-step detail is single-sourced to the plan doc, not duplicated here. **Phase 3 (the
per-template pass) is the only work left in this plan and has not been started.**

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

### ⛔ A container capability gap, still open — NOT the same thing as Phase 2 (which is closed)

**Distinct from P2-2/P2-4/P2-5/P2-7 (D742, closed) — this is a separate, still-unresolved
limitation, not the same work under a different name.** `sgs/container` injects `.sgs-container__inner` carrying `max-width` ON ITSELF. Core instead
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
| **D-2** | `layout` default → `flex`; `flexDirection` stays `""` → **`row`** (CSS default). **SHIPPED 2026-08-22 (D742).** |
| **D-4** | Orphan colour authorings get full `SgsColourPanel` standardisation — bg + text, normal + hover, gradient setup 1 for background / setup 2 for text. |
| **G2** | Container root colour routes through `SGS_Container_Wrapper`. Rule 7 satisfied. |
| **Colour** | White-on-pink is Bean's brand call. Per-client only; the framework default stays compliant. |
| **Grid** | Column floor exposed as `minColumnWidth`/`minColumnWidthUnit`, not hardcoded — **SHIPPED 2026-08-22 (D742)**. Framework default stays the prior `16rem` (≈256px) fallback when the client sets nothing. |
| **Filters** | Mobile = slide-up sheet, one DOM / two presentations. Scrollbar STYLED, not hidden — a filter panel has no other affordance, unlike the carousels. |
| **Canary** | Canary content is a test rig. A regressed test page gets deleted, not protected. |


## ▶ COLOUR-GOLDEN TRACK — LIVE STATUS 2026-08-22 (end of session)

**All pushed to `origin/main`. Build GREEN. Canary DEPLOYED and QA Gate C PASSED live.**
Executable front: `.claude/plans/go-colour-golden-track-flickering-wirth.md` — it carries
the measured status, the remaining steps and the protocol. Read it, not this block.

**MEASURED (re-run, never quote):** rule 31 = **355** (below-min-states 181 / missing-gradient
152 / native-colour-ui 22); ratchet **355**, zero slack; adoption surface **124 adoptable /
113 refused / 4 adopted** (`colour-codemod/adopt.js --survey`).

**SHIPPED:** R0 (the 11 handover findings — the plugin was uncommittable for EVERY session
until this landed) · R1 ratchet 388→355 with a two-way negative control · R2a `adopt.js`
(built, self-tested, **NOT applied**) · R2b borderRow passthrough · QA Gate C live.

**SHIPPED BUT NOT PLANNED — where the session actually went:**
- `sgs/nav-drawer` handed to that session: it had NO text-colour control at all, and the
  WCAG contrast value was the SOLE AUTHOR of its text colour. Now text colour + gradient,
  close hover, background gradient, background image, operator-settable accessible name.
- **Two exemption mechanisms rule 31 could not express.** Text-gradient exemption BY
  MECHANISM (element manifest, stated once, no roster — cleared 23 and let sgs/button's
  hand-written entry be deleted as a second owner). States exemption with a STRUCTURAL
  anti-downgrade guard: REFUSED whenever the block already declares `<attr>Hover`, so
  "cannot be hovered" is accepted and "hasn't wired hover yet" is not. Proven three ways.
- **Text-block background layer** (heading/text/label): a text gradient was OVERWRITING or
  CLIPPING the block's own background — both reachable with shipped controls. Background
  moved to a `::after` layer; `isolation:isolate` is load-bearing, not decoration.
- **Three broken editors fixed** — text/quote/testimonial threw ReferenceError.

**REMAINING:** R2c special cases · R2d the 124-row sweep · R2e PHP emitters (**still zero
callers**) · R3 hover shadow + GridItemDefaultsPanel · R4 folded into R2d · R5 editor-half
verification · R6 wire the 5 unwired scripts.

⛔ **STILL OWED LIVE** (QA Gate C proved the RENDER half only): slug-not-hex on save+reload
in the editor; hover repaint under a REAL pointer; nav-drawer's image/text/gradient with the
drawer OPEN. Evidence so far: `reports/visual-diff/colour-golden-qa-gate-c-2026-08-22.md`.

⛔ **THREE GATE GAPS EXPOSED, each earned by a defect that reached `main`:**
1. **Undefined JS references have NO gate** and broke three editors. The file is VALID
   JavaScript — it parses, `node --check` passes, it fails only at runtime in the editor.
   `check-undeclared-attrs.py` gates the INVERSE. A short `@babel/traverse` scope walk found
   all three in one pass; it belongs in `prebuild`.
2. **`extract-signatures.py` is NON-DETERMINISTIC** on `css_tier` for `columns` attrs — two
   runs on an unchanged tree flipped post-grid and card-grid in OPPOSITE directions.
3. **A `--fix` dry run can lie** — a prefix-trim diff printer reported a whole file changed.
   `git diff` the OUTPUT, never the dry run.

⛔ **METHOD TRAPS THAT COST TIME:** SGS block CSS is LIFTED to `uploads/sgs-css/<hash>.css`,
so a page-source grep proves NOTHING · in a negative control restore by RE-APPLYING, never
`git checkout --` (it deletes uncommitted work, not just the break) · never re-serialise a
config without matching its own indent (2,503-line diff for a 25-line change) · a flat
finding total hides a fix and a regression cancelling out — enumerate.

⚠ **CROSS-SESSION:** worktrees do NOT isolate the DB or the canary. `/sgs-update` is global —
main checkout, one at a time, announced here. Deploys: ONE session from the main checkout;
the ownership gate refused a deploy today because the canary carried another branch —
**MERGE, never `--takeover`**. `[gates-ok: …]` is NOT a real bypass and exists in neither
hook; the real ones are `SGS_VISUAL_GATE_SKIP=<block>[,<block>]` + reason and
`[batch-ok:<reason>]` for a merge. The visual gate is CHANGE-KEYED (`source_sha`).

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

## ▶ CLEANUP TRACK — comment-narrative trim: CLOSED 2026-08-22

Swept to `.claude/memory/session-2026-08-22-cleanup-track.md` (verbatim). Track is
closed; its plan and prompt were deleted at `fc8c9fb1`. Nothing pending.

## ▶ TIER W (MOTION) TRACK — CLOSED 2026-08-21

**Nothing pending. Do not re-open this to "continue" it.** Shipped, merged, deployed,
live-verified: Spec 38's fourth tier (WebGL, D479) now exists, with FR-38-29 surface treatments
on 15 image-bearing blocks at 5,674 bytes gzip. D714-D716.

Full section — what shipped and the four things deliberately NOT done — moved VERBATIM to
`memory/session-2026-08-21-tier-w-closed.md` on 2026-08-21 to bring this file back under its
byte cap. That archive's own FR-38-12 Flip finding is now STALE — see below, D741 supersedes
it. For motion work the open register is `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Drawer covered the fold in every template editor; several blocks errored. Three
unrelated causes, all closed. Detail in D743.

- **Drawer shell was exactly `100dvh`** (771px in a 771px canvas): `style.css`'s
  real-`<dialog>` sizing lands on the editor preview shell and `editor.css` never opposed
  it. Now a 46px strip, expanded by a **"Preview drawer open"** toggle (component state,
  never serialised). Capture: `reports/visual-diff/nav-drawer-2026-08-22.md`.
- **Six validation errors** — comments inside `sgs/container` / `sgs/tab` inner content;
  both have `render.php` AND a non-null `save()`: *dynamic ≠ unvalidated*. Also dropped the
  `woocommerce/single-product` wrapper (no `providesContext`). **0 bad / 20 surfaces**.
- **`check-undeclared-attrs.py`** — 17 findings, all false, all nav-drawer: it read JSX
  tags before stripping comments. Fixed on `main` (`1693918f`); it broke every build.

⚠ **Not ours:** the canary intermittently 500s (`Error establishing a database connection`)
under the ~12 concurrent block-renderer calls a template load fires, producing phantom
"Error loading block" banners that vanish on reload. Infrastructure — don't chase it.

## ▶ FR-38-12 FLIP — CLOSED 2026-08-22 (D741)

**Nothing pending.** Five prior sessions (D698, D699, D702, the 2026-08-21 report, the
2026-08-21 Tier W close above) left it genuinely inconclusive or dormant. Two real bugs, both
found and fixed same session: (1) `sgs/container` — the shop archive's own Product Collection
toolbar wrapper — tripped WooCommerce's client-nav kill-switch, same shape D702 already fixed
for `sgs/text` (`c01ed84a`); (2) `fx-flip.js`'s `settle()` called `MatchMedia#add(fn)` with a
bare function where the API requires `(conditions, func)`, so `Flip.from()` was registered but
never invoked — every upstream check looked healthy while GSAP never ticked (`da580d8e`). Live
on sandybrown, `animate_product_filtering` ON, Bean watched it animate. Full writeup:
`decisions.md` D741. Spec 38 §3.3 FR-38-12 updated to SHIPPED. Design-gate plan archived.
