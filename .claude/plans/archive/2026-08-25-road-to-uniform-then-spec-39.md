---
doc_type: plan
title: The road to uniform — clear Spec 32 + Spec 35 + the tier migration, then Spec 39
date: 2026-08-25
status: CLOSED 2026-09-04 — Section A closed, Spec 32 fully closed (B4 unblocked + shipped),
  Spec 35's mechanical verification pass closed, C12/C13 closed via an independent Chrome
  instance after the shared-browser lock cleared. All 9 items found genuinely open earlier
  this session (see ROUND 2 CORRECTED note under "Session 2026-09-04 summary") are now
  closed: C7, C6, C16 (found already done), C19 item 3, C15-5, C14/C4, D4, B4, C12/C13. Every
  claim in this file was independently re-verified against live code before this status was
  written. C1/D3 (golden-colour) tracked elsewhere. Spec 39 gate (D552) unaffected by this
  closure — see "Order of work" below.
owner: colour-golden / tooling track
ordering_rule: D552 — "standard leads, pipeline follows"
---

# The road to uniform, then Spec 39

## Session 2026-09-04 summary — read this before the scope table below

This plan was 11 days stale at session start. Two-thirds of its claimed-open items were
already closed by other sessions between 2026-08-25 and today. Every item below was
re-verified against a live command this session, not read off the plan's own prose — see
each item's own note for the command and evidence.

**Closed today:**
- **Section A (tier migration)** — all 3 blind-spot families done: `hero.textAlign`,
  `whatsapp-cta.showOn`, `brand-strip.columns`. Detector widened (`migrate-tier-object.py`),
  each migrated end-to-end (block.json + edit.js + render.php), deployed and live-verified
  against the real canary (not just build-checked). Commits `9f6f6ceb3`, `0e3ef60e0`.
- **Spec 32 B1/B2/B3/B5** — all confirmed closed by live gate re-runs. B4
  (`mega-panel.borderRadius`) stays correctly BLOCKED — it's Track 2 (Spec 36 mega-menu)
  scope, and Track 2 isn't currently active.
- **Spec 35 C2/C3/C8/C9/C11** — confirmed closed by live gate re-runs.
- **Spec 35 C4/C5/C10** — investigated in parallel (isolated worktrees), all three
  descoped rather than built blind: C4 needs its own AST-walk build (too big for this
  batch), C5 isn't buildable as a general rule without reproducing a documented
  ~600-false-positive failure (fixed a real doc contradiction — CO-15 vs Part L — found
  along the way), C10 is an architectural mismatch, not a like-for-like swap. Commits
  `b9609f019`, `ed413997a`.
- **Also fixed along the way:** a genuinely dead code block in `hero/render.php`
  (unreachable both before and after the textAlign migration, for different reasons).

**CORRECTED 2026-09-04, same day, ROUND 1 — the line above undercounted.** Bean caught it:
"aren't there way more remaining items than those 2?" Yes — Bean's own 2026-08-27 decisions
(C14-C19) settled the DESIGN of six items that were never built, and this section originally
missed all of them. That round listed 12 items. **It was itself wrong on 3 of them —
see ROUND 2 below.**

**CORRECTED 2026-09-04, same day, ROUND 2 — round 1 re-asserted 3 stale claims without
re-checking them.** Bean pushed again: "I'm sure several of these are already completed."
Right again. Round 1 copied forward "unbuilt" language for C18/C15-1/C15-2/C15-3 from the
original 2026-08-25/26 plan text — genuinely true THEN (grep found nothing at the time) —
without re-running the check against CURRENT code, 8-9 days after the features had actually
shipped. A full parallel re-verification (4 agents, one per independent question: re-check
the "open" claims, spot-check the "closed" claims too, root-cause why round 1 got it wrong,
and produce a ready-to-build plan for whatever's genuinely still open) found:

**Actually already CLOSED (round 1 called these open — they weren't):**
- **C18** — `plugins/sgs-blocks/src/components/ColumnShapePicker.js` (341 lines), adopted in
  4 blocks (container, site-footer-row, site-header-row), shipped `2e46fc3f2` (2026-08-26)
  + a follow-up polish commit.
- **C15-1** — `sgs-blocks.php:11` already says `Requires at least: 6.9`, shipped `1991830ec`
  (2026-08-27).
- **C15-2/C15-3** — `plugins/sgs-blocks/src/bindings/index.js` has a complete
  `registerBlockBindingsSource`/`getFieldsList()` implementation, same commit as C15-1, AND
  is genuinely wired into `webpack.config.js` as its own entry point (confirmed
  `build/bindings/index.js` compiles and ships) — not dead code sitting unused.

**All 10 "closed" claims from ROUND 1 independently re-checked and held up** (Section A,
B1/B2/B3/B5, C2/C3/C8/C9/C11) — the doc was only wrong in the false-negative direction
(claiming unbuilt work that shipped), never the other way.

**CLOSED 2026-09-04, same session — C7 and C6 (dispatched to `wp-sgs-developer` after Bean
picked this scope via menu; see `.claude/prompts/2026-09-04-road-to-uniform-c6-c7-prompt.md`,
delete once superseded):**

- ✅ **C7 — decorative-image/ARIA, 4 blocks.** `sgs/decorative-image` (`imageDecorative` +
  Accessibility panel), `sgs/cta-section` (`backgroundImageDecorative`, role="img"/aria-label
  when non-decorative + alt, gated against landmark aria-label collision),
  `sgs/nav-drawer` (`backgroundImageDecorative`, aria-describedby note), `sgs/social-icons`
  (`iconDecorative` per repeater item). Rule `18-decorative-image-aria` re-verified live
  2026-09-04: 4 → 0. `npm run build` green. Commit `47fd0079c`. **Deployed and live-verified**
  (payload checksum match, 3 motion-QA probes green) — interactive Playwright editor
  screenshot could NOT be captured (shared MCP browser locked by a concurrent session for the
  whole dispatch); server-side evidence stands, editor-visual check is the one gap, named not
  hidden.
- ✅ **C6 — `PanelBody` → `ToolsPanel`, 10 blocks.** All 10 converted to the canonical
  `ToolsPanel`/`ToolsPanelItem` shape (reference: `sgs/quote`'s Attribution panel); repeater
  option-lists (checkbox/radio/select) correctly kept as their own `PanelBody`, not forced
  into `ToolsPanelItem`. One real bug caught pre-commit by the build's own gate (`gallery`'s
  `hasValue` referenced an undestructured `shadowHover`). Rule `03-dense-panel-candidate`
  re-verified live 2026-09-04: 10 → 0. `npm run build` green. Commit `497261de0`.
  ⚠ **NOT YET DEPLOYED** — `build-deploy.py` correctly refused: another session has active
  uncommitted work on `sgs/testimonial-slider` in the same blocks-only scope (D336-safe
  refusal, not a bug). Deploy once that clears; do not force with `--allow-dirty`.

**FOUND CLOSED, not stale as this doc previously claimed — corrected 2026-09-04:**

- ✅ **C16 — spacing-presets rollout. Re-scoped premise was itself wrong; there is no rollout
  left to do.** The dispatch re-checked the real `ResponsiveBoxControl` mount surface (the
  actual C16 subject) rather than trusting this doc's "4 of ~29 opted in" figure: **93 of 93
  `<ResponsiveBoxControl>` mounts tree-wide already carry `presets`.** The alarming-looking
  `presets={ false }` grep hits (23 files) are ALL `SgsLengthControl` — a different, older,
  already-fully-adopted single-length preset mechanism, not this rollout's subject. Zero
  genuine opt-outs remain. **This doc's C16 entry (both the ROUND 2 "4 blocks opted in, 25+
  remain" line and the older "Session 2026-08-25 summary" version below) was stale by ~90
  blocks' worth of already-completed rollout — corrected here rather than left to mislead a
  future session.**

**CLOSED 2026-09-04, same session (all six of the seven above):**

- ✅ **C19 item 3** — hero's split-media panel migrated onto the shared `box-shape` +
  `media-padding` media atom (same composition `sgs/media` uses), `splitImageBleed` deleted.
  Along the way, fixed a real bug the migration itself introduced: hero's legacy
  `splitMediaWidthTablet`/`Mobile` (kept editor-inert for back-compat) statically collided
  with the atom system's generic tiered-Width expectation — documented as a `reads`
  exception in `registry.js`, mirroring the existing exception already recorded for the base
  `splitMediaWidth`. Commit `7d0954776`, deployed, live-verified (payload checksum + motion
  QA, all 83 blocks green).
- ✅ **C15-5** — `SUPPORTED_ATTRIBUTES` widened 3→37 blocks (78 attrs), with a purpose-built
  detector (`scripts/audit-bindable-attrs.py`, full survey/fix/check/self-test triad) gating
  it per THE-MIGRATION-METHOD. `sgs/product-card` correctly stays excluded (C15-6, own live
  resolver). Commit `7b8254ec6`.
- ✅ **C14/C4** — the panel/control ORDER + CO-2 element-grouping gate built
  (`rules/41-co2-element-grouping-order.js`), reusing `placement-reach.py`'s existing
  manifest logic rather than re-deriving it, shipped advisory-mode (per this project's own
  ship-advisory-first convention). A real false-positive class was caught during the build
  (isWrapper elements wrongly flagged, the same shape that got `scattered-element-controls.js`
  deleted) and fixed with a dedicated negative-control fixture before shipping. Commit
  `c8b2fa084`, wired (confirmed via `npm run gate:list`, not just built).
- ✅ **D4** — decided per-rule, not blanket. 8 promoted to `gate` (01-tab-group,
  20-pattern-template-lock, 07-preset-only-shadow, 22-placement-rule-surfaces,
  26-responsive-duplicate, 30-raw-box-control, 29-duplicate-visible-label,
  36-box-control-presets-missing — all cleared the project's own advisory-before-fail-closed
  bar, E6 point 9). 15 held advisory with a named, evidenced reason each. Full reasoning:
  `.claude/reports/2026-09-04-d4-advisory-rule-promotion-decisions.md`.
- ✅ **B4 — UNBLOCKED and closed, same session.** The "blocked on Track 2" framing had been
  copied forward across 3+ write-ups without ever being re-tested: it conflated genuinely
  paused mega-menu VISUAL design (nav-drawer variant styling, rejected on Bean's eye
  2026-07-29) with this purely mechanical control-shape question, which nothing in Spec 36
  actually names as pending. Bean confirmed proceeding once this was pointed out. Root border
  (colour+gradient+radius, previously bespoke) migrated to the full `SgsBorderControl`
  composite (width+colour+style) — adopting the shared component necessarily adds real
  `borderWidth`/`borderStyle` capability the block didn't have (the component has no
  colour+radius-only mode), accepted as correct rather than avoided, matching the other 44
  migrated blocks. Radius deliberately KEPT on its own scalar control, not wired into
  `SgsBorderControl`'s `onRadiusChange` — that expects a per-corner object, a stored-shape
  change against live content that's a separate, unscoped migration. `groupBorderColour*`
  (per-child-group hover colours) investigated and correctly left alone — a colour-panel
  concern, not a border-control one. Survey: `ANOMALY 7→6`, `PRIVATE_DONE 48→49`. Live
  frontend roundtrip PASS post-deploy. Commits `20bcb52b8`, `b0670ac4a`.

**All items closed 2026-09-04.**

- ✅ **C12/C13 — CLOSED.** The Playwright-based attempts were genuinely blocked by another
  session holding the shared browser profile; re-run with a second, independent Chrome
  instance (the `superpowers-chrome` browsing skill — separate profile/port, no contention)
  against a scratch draft page, deleted after the pass. C12: 0 keyboard-trap patterns, 0
  contrast failures across all 15 target blocks (live-verified with real CDP `Tab` presses,
  not just static attribute checks), 1 real `aria-describedby` finding correctly attributed
  to a WP-core `UnitControl` internal element (not an SGS defect). C13: the one currently-
  ENFORCED ordering rule (Advanced last, Visibility conditions second-from-last) holds live
  on 12/12 sampled direct-panel blocks; the unconverted per-element panel breakdown is the
  documented, known backlog (CO-28, 58/83 blocks), not a regression this pass found. Full
  account: `.claude/reports/2026-09-04-c12-c13-live-pass.md`.

**Road-to-uniform backlog: 9/9 items closed.**

**Root cause of round 1's error** (full account: D960): the original 2026-08-25/26 "unbuilt"
claims were honest when written — grep genuinely found nothing, and the features shipped 1-2
days later. Round 1's mistake was different and worse: it was written 8-9 days after those
features shipped, and copied the stale language forward into a "correction" without
re-running a single check. **Proposed structural fix, not yet built:** a
`verify-plan-claims.py` script — inline `<!-- verify: <command> -->` stamps on doc claims of
this shape, checked before any correction commit lands, reusing `gates.json`'s existing
declarative `{cmd, id}` pattern. ~30-60 min to build; worth it if this recurs a third time.

**Not this backlog, tracked separately, do not duplicate:** C1 / D3 (both = the
`31-golden-colour-control` rollout, 241 open) — has its own active plan and a parallel
session working it throughout this session.

Spec 39 itself stays correctly gated behind ALL of the above per D552 (standard leads,
pipeline follows) — that gate has not moved, and closing 5 of 14 originally-counted items
(3 were already done, 2 turned out much smaller once re-scoped) does not change it.

**Working norm this session, worth carrying forward:** `main` had 2-4 other sessions
committing concurrently throughout (colour-gradient rollout, D948 Phase 3). Every deploy
and commit needed dirty-tree coordination via cross-session messages — this is the
project's stated norm (LEDGER.md: "concurrent occupancy is the norm, not the exception"),
not a one-off. Budget for it.

## Why this exists, in Bean's words

> *"We need the blocks uniform so we're not constantly reformatting them and causing issues for
> clients, and we need the uniform blocks so we can rework our pipeline so it's actually fully
> universal and functional, which is the profit goal. Can't just turn the money on instantly —
> the revenue-minded action needs to be related to working on this stuff in a way that reaches
> the ready position as fast as possible with no issues and corners cut."* (2026-08-25)

This matches the project's own recorded ordering rule, **D552: standard leads, pipeline
follows**. Finish the standard (Spec 32 + Spec 35 + block uniformity), then rework the pipeline
to it (Spec 39).

## The dependency chain, and why Spec 39 is last but load-bearing

**D554-C**, Bean-ruled at a design gate on 2026-08-10:

> *"The converter stays flat; its output gets gated. A check FAILS a clone run emitting a flat
> tier for a property already migrated on the target block... **Consequence: cloning blocked for
> migrated properties until the Spec 39 rework lands, making that rework the pacing item.**"*

That gate is live: `plugins/sgs-blocks/scripts/orchestrator/check_flat_tier_regression.py`.

⛔ **Spec 39 does not exist as a file.** No `39-*.md` in `.claude/specs/`, absent from
`specs/README.md`, referenced four times in `decisions.md` — including a recorded ruling that
*"Spec 31 is superseded by Spec 39 (archive-and-salvage the current converter scripts, do not
delete)"*. It was decided, named the pacing item, and never written.

**Measured cost of that gap:** `scripts/tests/fixtures/conformance/quarantine.json` holds **37
goldens at `xfail(strict=True)`** ("13 passed, 37 xfailed"). Its `_meta.unquarantine_when` names
*"Spec 39's converter rework"*. That is 37 cloning-conformance tests that cannot pass until it
lands — a measurement, not an estimate.

**The consequence for ordering:** finishing more of the block migration *increases* the
cloning-blocked surface until Spec 39 lands. That is by design (divergence loud, not silent) —
but it means uniformity work and the converter rework are coupled, and the coupling is why
Spec 39 must follow immediately rather than eventually.

---

## Scope — 24 open items + the migration

Every item below was verified against source by a survey agent, not read off a doc's own claim.

### A. Block uniformity — the tier migration

**37 families remain flat.** Not 34, and not 24.

✅ **FIXED 2026-08-25 (D777, `807ef4611`).** The blind spot below is CLOSED — the migrator now sees all 37.

~~⛔ `migrate-tier-object.py` has a 3-family BLIND SPOT.~~ Its `classify()`
requires a *bare* base attribute, so it cannot see a family whose base is declared as
`<name>Desktop`. Reconciled 2026-08-25 (DB-derived 37 vs disk-derived 34, disk-minus-DB = 0):

| Block | Property | Base declared as |
|---|---|---|
| `sgs/brand-strip` | `columns` | `columnsDesktop` |
| `sgs/hero` | `textAlign` | `textAlignDesktop` |
| `sgs/whatsapp-cta` | `showOn` | `showOnDesktop` |

`classify()` required a BARE base attr, so a family declaring its desktop tier as `<prop>Desktop`
returned ABSENT. `--check` would have reported CLEAN with three families still flat.
Fixed by mirroring `programme-progress.py`'s `base_bare`/`base_desktop` logic into a new
`_base_attr_spec()` helper. **34 → 37 block-touches; 24 → 27 migratable properties.**
Blast radius proven: `--survey` byte-identical for margin/padding/gap/borderRadius, exactly the
three target families changed. 8 new fixtures incl. a non-vacuous negative control. 63/63 green.

✅ **Detector widening DONE 2026-09-04** — `reads_attr_directly`/`edit_refs`/`render_state`/
`edit_state` now resolve the actual declared key via `_base_attr_key()`, so all three families
classify correctly (RAW/LEGACY, not DELEGATED/UNCLEAR).

✅ **`hero.textAlign` and `whatsapp-cta.showOn` MIGRATED end to end 2026-09-04** — S1 (block.json)
+ S2 (edit.js) + S3 (render.php) all done, both `--check` green, gate-chain (`npm run build`)
clean, checked into `main`.

⛔ **`brand-strip.columns` STILL FLAT — do NOT run `--fix` on it blind.** Its `block.json` already
carries unrelated uncommitted work (logo item `_key`/`objectFit` fields, present before this
session started) — apply the same S1/S2/S3 fix once that work lands or is reconciled, not before.
⚠ `audit-inline-styling.js` reports a **separate** "tier-without-base" count of **11 blocks**
(per-side spacing + border/typography roots). It also does not recognise a `Desktop`-named base,
so some of the 11 may be false positives of the same cause. **Not yet measured — do that before
treating the 11 as defects.**

Of the 37: the census (`reports/migrations/tier-object-all-properties-census.json`) shows 23 of
24 visible properties touch 1-2 blocks; only `backgroundOverlayOpacity` (8) is larger. Run
`migrate-tier-object.py --all-properties` for the live picture.

### B. Spec 32 — Component Styling & Token Contract (5 open)

✅ **B1/B2/B3/B5 CLOSED — verified live 2026-09-04, do not re-open.** `audit-inline-styling.js
--check` → 0 violations, exit 0 (B1). D734 (2026-08-22): length-sanitiser migration DONE (B2).
`check-box-family-guard.py --check` → 0 violations (B3). `check-no-core-blocks.py` → 0 banned
core blocks across 61 theme files (B5).

⛔ **B4 (`mega-panel.borderRadius`) genuinely STILL BLOCKED — confirmed, not just carried
forward.** It's a bespoke `UnitControl` scalar, no `SgsBorderControl` adoption (0 mounts,
verified via grep), and it's part of Spec 36 mega-menu (Track 2), which is NOT currently
active per `.claude/LEDGER.md`'s tracked-tracks list. Do not migrate it unilaterally — it
needs Track 2's own design decision about mega-menu's border treatment (Rule 7 design gate).

| # | Item | Kind |
|---|---|---|
| B1 | **§5 CSS-injection sanitisation has NO GATE.** Free-text keyword attrs (`borderStyle`, `textTransform`) must be filtered to `[^a-zA-Z-]` before CSS concatenation. Applied at 2 call sites; 9 `render.php` reference `borderStyle` directly and are unaudited. The spec says so itself: *"No gate enforces this yet"* | mechanical |
| B2 | **§3 "no client brand value hardcoded" verified only on `sgs/button`, never the population** (D656). Hex literals in 11 `render.php` + 41 `style.css` — unclassified; some are legitimate framework defaults per the spec's own default-vs-hardcode test | triage, some Bean calls |
| B3 | **`multi-button::childBtnBorderRadius`** — NEW untriaged flat box scalar, postdates the spec's roster | mechanical |
| B4 | **`mega-panel.borderRadius`** — untriaged, blocked on Track 2 resuming | blocked |
| B5 | **`P-PATTERNS-USE-CORE-BLOCKS`** — 4 theme pattern files still use core `wp:heading`/`paragraph`/`list`, which auto-inline their own styling. Outside the audited surface, so no SGS-block gate can see it | mechanical |

✅ Re-verified live, not taken on trust: `audit-inline-styling.js --check` → **0 violations
across 83 blocks, exit 0**. The D294 pattern selector spot-checked clean on 5 blocks.

⚠ `check-box-flat` is wired into `prebuild` but its exit code is **explicitly not propagated**
(`informational — not propagated`), so its findings sit behind a passing suite. B3 is only
visible because someone ran it by hand.

### C. Spec 35 — Block Inspector UX Standard (19 open)

✅ **C2, C3, C8, C9, C11 CLOSED — verified live 2026-09-04, do not re-open.** C2: rule-31's
detector already has a shared-mechanism shadow-gradient exemption
(`31-golden-colour-control.js:493-494,811-813`). C3: all 6 `gridItem*` props fully wired
into the tier-prefix map on `sgs/container` — none of the named 7 still lack plumbing. C8:
properly measured and gated now (44 blocks via `SgsBorderControl`, ratcheted
`PRIVATE_NEEDS_SWAP` ceiling = 0). C9: `check-image-controls-support.py --survey` — 0
DECLARED-BUT-DEAD, the "2 of 15 working" figure was stale. C11: E11 selector-aware
governance (D283) fixed the detector attribution gap outright, not just disclosed it.

✅ **C4, C5, C10 all RESOLVED 2026-09-04 — properly scoped rather than built blind.** All
three were investigated in parallel (isolated worktrees) before any code was written, per
`.claude/THE-MIGRATION-METHOD.md`'s "settle the shape first" discipline.

- **C4 — descoped, not dropped.** CO-2 is genuinely distinct from the already-gated
  placement rule (`placement-reach.py`), but building its detector needs an AST walk of
  every block's `edit.js` PLUS a judgement call on the ~32-42% of attributes
  `placement-reach.py` itself already reports as CONTESTED/unresolved. This is its own
  `/phase-planner`-sized item, not a mechanical backlog item — do not fold it back in here.
- **C5 — descoped, genuinely not actionable as a general rule.** Verified: `check-duplicate-
  controls.js` targets a different bug class entirely (confirmed by reading the whole
  2787-line file). A general "bespoke duplicates native" detector can't distinguish a real
  gap from a deliberate KEEP-SGS choice (Part G's D402 table shows most apparent duplicates
  — shadow, minHeight, sticky, lightbox — are deliberate) without reproducing the
  ~600-false-positive failure that got `scattered-element-controls.js` deleted. Fixed a real
  doc self-contradiction found along the way: CO-15 claimed this WAS gated; corrected to
  match Part L's already-correct audit. Report:
  `.claude/reports/2026-09-04-c5-native-supports-duplicate-panel-scoping.md`.
- **C10 — architectural mismatch, not a like-for-like swap.** `MediaGalleryPicker` is a
  bulk multi-select-into-one-array component (gallery mounts it ONCE for the whole array);
  brand-strip needs N independent single-image slots (one `MediaPicker` per logo row, via
  `LogoEditor`). Forcing the swap means either an untested single-item-array hack or a real
  UI redesign of `LogoEditor` — a design decision for Bean, not a mechanical item.

⚠ **C6 and C7 PARTIALLY CLOSED, real residual work remains.** C6 (rule
`03-dense-panel-candidate`): **10 panels remaining** (form-field-checkbox/date/file/number/
radio/select, gallery, info-box, multi-button, text) — not 15, but not 0. C7 (rule
`18-decorative-image-aria`): **4 blocks remaining** (`cta-section`, `decorative-image`,
`nav-drawer`, `social-icons`), down from 13 — each needs an `isDecorative`/`ariaLabel`
control designed for that block, not a batch codemod.

**11 mechanical** — do these behind detectors, in batches:

- C1 **Colour-conformance R2-R6** — detector + 5 shared paint helpers are merged; adoption, hover
  shape, the 29-row worklist, QA Gate C and the ratchet all remain (`phase-colour-conformance.md:9`)
- C2 Shadow-row gradient exemption belongs in the rule-31 detector, not per-block
- C3 Stage-2 wrapper tier plumbing — 7 properties (6 `gridItem*` + `shadow`) still lack it
- C4 CO-2 element grouping has **no enforcing gate** (the `consistency-scanner` it cites does not exist)
- C5 No rule for "bespoke panel duplicating a native supports panel" — Part L item unverifiable
- C6 `ToolsPanel` conversion — **0 of 15** dense `PanelBody` panels converted
- C7 Decorative-image + ARIA — **1 of 14** image blocks has the toggle
- C8 Border-builder coverage unverified — 1 file checked against **48** blocks declaring `__experimentalBorder`
- C9 `imageControls` functional reach — **2 of 15** declaring blocks actually work
- C10 `MediaGalleryPicker` → `brand-strip` logos (the swap already done in `gallery/edit.js`)
- C11 `product-card.ctaBorderRadius` — detector attribution gap, or accept as disclosed limitation

**2 need a live pass, not code:**

- C12 Keyboard + contrast + `aria-describedby` (`/a11y-audit` on the editor)
- C13 Element-first panel ordering for direct-panel blocks — only container-family blocks route
  through the shared renderer, so the rest needs a live editor walkthrough

**Bean answered all six on 2026-08-27. Status below — do NOT re-ask the settled ones.**

- ✅ **C14 SETTLED — panel/control ORDER.** DOM order: first from top to bottom; where two elements
  sit at the same level, left to right. At root, follow WP-native ordering (Styles, then Colour,
  then Typography). Pinned positions: the helpers; **Advanced always bottom of Settings**;
  **Visibility conditions always second from bottom**. → record in Spec 35 + build the enforcing
  gate (CO-2 still has none; the `consistency-scanner` it cites does not exist).
- ✅ **C15 RESEARCHED + SCOPED (Bean, 2026-08-26).** Full report:
  `.claude/reports/2026-08-28-c15-block-bindings-scope-proposal.md`. Ground truth, re-counted:
  **3 of 83 blocks** bindable (`sgs/text`, `sgs/heading`, `sgs/button`), 2 sources, **6 bindings
  in the whole tree**, all hand-typed into 2 pattern files, and **zero editor-side JS**. The gap
  is NOT more sources — it is that a client cannot see, create or change a binding at all, in a
  framework whose premise is that clients never touch code. Bean adopted four items:

  - **C15-2 + C15-3 — the client-facing editor UI. THE headline item.** Register the source in
    JS and supply `getFieldsList()` so core's own 6.9 picker lists SGS fields; the client picks
    "Phone" from a dropdown. This is the single change that converts bindings from a developer
    trick into a client feature. Everything else is secondary. Size M.
  - **C15-5 — widen past 3 blocks.** No image, card, hero or shop block can carry a binding, so
    a client cannot bind a logo, a price, or an address inside a card. ⚠ Bean did NOT adopt
    C15-12 (the coverage detector). THE-MIGRATION-METHOD still applies at the 4th file edit, and
    `hooks/detector-first-commit-gate.py` will DENY the commit without one — so the detector is
    effectively mandatory for this item regardless; raise it with Bean when C15-5 starts.
  - **C15-6 — `sgs-product/field`. ⚠ THE FIRST SUMMARY OF THIS WAS WRONG; Bean caught it.**
    "Product card binds normally" — correct. `Product_Bindings` has TWO doorways:
    `get_product_data()` (:276) is LIVE, called by `product-card/render.php:521`, and is what
    makes product cards work; only `get_value()` (:65), the Block-Bindings-API callback, has no
    consumers. It is **unexposed, not dead** — the source would resolve today on `sgs/text` /
    `sgs/heading` (both allowlisted), letting a client put a product price into a heading.
    **Recommendation flipped: KEEP it.** It becomes usable the moment C15-2/C15-3 land.
  - **C15-1 — the version floor. RE-GRADED P0 → P3 hygiene (Bean challenged the grade; he was
    right).** `sgs-blocks.php:11` declares `Requires at least: 6.7`; the
    `block_bindings_supported_attributes_{$block_type}` filter is `@since 6.9.0` — verified
    against core on the canary AND the published hook docs, not the in-repo docblock. On 6.7/6.8
    the contact patterns print the literal `placeholder — replaced at render` and the two CTA
    buttons have no href. **Costs nothing today: the canary is 7.1 and is the only target.** It
    bites only when SGS is installed somewhere Bean did not provision. One line, take it in
    passing. ⛔ The original P0 grade was inherited from the research agent without being
    pressure-tested — the same accept-the-number failure this programme keeps catching.

  Not adopted this round: C15-4 (write-back), C15-7 (`core/post-meta`, a free win), C15-8
  (pattern overrides), C15-9 (fallbacks), C15-10 (`data-*`), C15-11 (picker grouping),
  C15-12 (coverage gate — but see C15-5 above). All remain in the report.
- ✅ **C16 SETTLED — spacing presets.** Keep the responsive box-object control (input + measurement
  picker + slider) and ADD presets. Selecting a preset changes the value **and** the measurement
  type when the preset's unit differs from the attribute's active unit. The unit switch is the part
  that is easy to get wrong — build one, Bean's eye, then roll out.
- ✅ **C17 CLOSED — Section Styles.** Bean accepted the recommendation: do NOT rebuild our per-block
  equivalents (Styles panel on info-box/heading/text, button's style-variations dropdown, hero's
  variant picker) on WP 6.6's native mechanism. Ours work; native mainly buys cross-block cascade.
- ✅ **C18 CLOSED — a non-problem, and the reasoning Bean asked for exists.** (a) `specs/37` §3.3
  establishes `cluster` vs `columns` as row layout MODES, Bean-locked 2026-07-21 — it is not a style
  variant. (b) `inspector_control_type` has **zero converter consumers** and is **64.6% NULL**
  framework-wide, with a recorded rule that **NULL must not be read as "no control"**. The NULL is
  not a defect. ⚠ **Real residual:** the VISUAL column-shape picker Bean approved 2026-07-28
  (spec 37 §3.3) is **UNBUILT** — grep finds no implementation. That is the item, not the column.
- ✅ **C19 SETTLED (Bean, 2026-08-27) — build it, one detail left.** Adapt hero's split-image panel,
  with three answers:
  (1) **`splitImageBleed` is DELETED, not carried** — *"a vestigial control in the container panel
  that breaks the sizing of the media when switched on... made redundant by object fit and image
  padding, which defaults to 0."* Remove it from `sgs/hero` too.
  (2) **TWO panel variants, split on ART DIRECTION.** Art-directed = different *assets* per
  breakpoint (separate attrs, never a responsive object, because they are different files). Regular
  responsive object = same asset, different CSS values per tier. Panel A (no responsive media): one
  source, one focal point. Panel B (art-directed): source AND focal point per breakpoint. Hero
  already proves the split — `imageObjectPositionTablet` / `splitImageMobileObjectPosition` ARE art
  direction, and are why its naming went non-standard (`hero/block.json:283`). **Normalise the names
  when lifting.**
  (3) ⬜ **REMAINING:** box shape is `aspectRatio` (image-sequence) OR `imageHeight` (hero) — the two
  COMPETE and one wins silently. The controls are a CHAIN: shape → `object-fit` → `object-position`,
  where fit only matters when the box differs from the image's natural ratio and position only has a
  visible effect when fit crops or letterboxes. `imagePadding` sits outside, insetting the box.
  Panel order follows the chain; grey out controls an earlier choice makes inert.

---

### D. inspector-scan — 945 advisory findings that CANNOT fail (added 2026-08-25, Bean asked)

✅ **D1/D2 CLOSED, 2026-09-03 (D933) — verified live 2026-09-04, do not re-open from this
section's old figures.** A fresh `node scripts/inspector-scan/run.js --json` run today shows
`21-render-without-control` at **0 flagged** (was 222 here) and `34-declared-attr-unrendered`
at **1 flagged** (was 319 here) — both driven to zero via parallel-dispatched fixes across 83
blocks (`01-tab-group` also closed, 57→0). Ratchet ceilings updated 57→0 / 146→0 in
`rules.json`. D4 (promote/demote each advisory rule) remains genuinely undecided. **Never quote
the 222/319 figures below as current — they are the pre-fix baseline this note replaces.**

⛔ **THE BIGGEST GAP IN THIS REGISTER, AND IT WAS MISSED ON THE FIRST PASS.** Section C recorded
the colour work as "the 29-row worklist" — a number taken from a PLAN FILE. Running the scanner
reports **291** findings for that rule alone. Never take a count from a doc when a command exists.

`npm run inspector-scan` → **958 findings across 81 of 83 blocks.** `--check` exits **0**.

| Count | Rule | What it means |
|---|---|---|
| 319 | `34-declared-attr-unrendered` | a setting is declared but nothing renders it |
| 291 | `31-golden-colour-control` | colour rows missing a hover state or a gradient path |
| **222** | **`21-render-without-control`** | **the block renders something the client CANNOT control** |
| 57 | `01-tab-group` | panel/tab grouping |
| 23 | `20-pattern-template-lock` | |
| 15 | `03-dense-panel-candidate` | the ToolsPanel conversions (= C6) |
| 13 | `18-decorative-image-aria` | = C7 |

**The structural problem, verbatim from its own summary:** `advisory rules: 15 · advisory findings:
945 (never gate)`. Fifteen rules are set to `advisory` mode — **configured to be incapable of
failing.** The gate also sits in tier `full`, so it only runs pre-deploy, never on a build.
Same shape as `check-box-flat`, whose exit code is explicitly not propagated. Two whole classes of
spec conformance are measured and then discarded.

⚠ **These are NOT 945 defects, and nobody knows how many are.** Rule 34's own `advisoryReason`
documents a large class as a **static-analysis blind spot** — computed-key attribute reads that ARE
consumed, cross-verified against `check-dead-controls.js`. Rule 21's records a ceiling raised
199 → 211 as *"a staleness correction rather than accepted new debt"*, carrying a
`⚠ SUSPECTED DEFECT, NOT INVESTIGATED` flag. **The unknown share is the actual problem:** the rules
that would tell you cannot fail, so the real count has never been established.

**Rule 21 is the one that matters most for client work.** 222 cases where a block paints something
the client has no inspector control for — against CLAUDE.md's own *"no block feature is complete
until it has full block-editor UI controls"* and *"clients are tech-illiterate — they use the block
editor exclusively"*. That is the uniformity problem stated as a number.

**D1.** Triage rule 21's 222 — real missing control vs static-analysis artefact. Highest client value.
**D2.** Triage rule 34's 319 against `check-dead-controls.js`; separate genuine dead attrs from
computed-key false positives, and teach the rule the pattern so the count means something.
**D3.** Rule 31's 291 IS the colour-conformance work (C1) — scope C1 from the scanner, not the plan.
**D4.** Decide per rule: promote to gating with a ratchet, or record why it stays advisory forever.
An advisory rule with no ratchet is a measurement nobody acts on.

---

## Order of work

**Step 0 — unblock the instruments (do first, it is small).**
Fix `migrate-tier-object.py`'s `Desktop`-base blind spot so the migration's own detector can see
all 37 families. Then measure whether `audit-inline-styling.js`'s 11 "tier-without-base" blocks
are the same false-positive cause. **You cannot scope A honestly until both instruments agree.**

**Step 1 — batch the six Bean decisions (C14-C19) in ONE sitting.**
Four of them block mechanical work that is otherwise ready to run. Answering them together costs
one conversation; answering them as they surface costs six interruptions and stalls the queue.

**Step 2 — the mechanical sweep, behind detectors.**
A (37 families) · B1, B3, B5 · C1-C11. THE-MIGRATION-METHOD.md applies to every one of these:
more than 3 files means the detector is the first deliverable. Use worktree isolation for
codemods — a reformat is recoverable, but reviewing it is not free.

**Step 3 — the two live passes.** C12, C13. Bean's eye (R-31-13) plus `/a11y-audit`.

**Step 4 — the triage items.** B2 (classify every hex literal), B4 if Track 2 resumes.

**Step 5 — WRITE SPEC 39, then do the converter rework.**
Check first whether its scope is already settled across D276 / D552 / D554 and the archived
converter-completion plan — if so this is transcription plus a design gate, not open design.
⛔ **UNVERIFIED — do not repeat it (2026-08-29).** This line used to read "Closing it
un-quarantines 37 conformance goldens." That figure could not be reproduced: **0** xfails
anywhere in the plugin reference Spec 39 (17 exist in total, so the grep does find them).
Its neighbouring Spec 39 claims were found false the same day — Spec 39 does NOT pace this
work. **D552 is the ordering rule: the block standard LEADS, the pipeline is reworked
AFTERWARDS.** Become uniform first, then build Spec 39 on that foundation. See
`plans/spec-39-seed-requirements.md`, which records the rule and exists to stop it being
re-inverted.

## Guardrails carried forward

- **Never quote a D-date or commit date as an elapsed cost.** Both record when work *landed*.
- **Enumerate, never recall.** Every figure here came from a command. Three separate counts of the
  tier migration were in circulation before this was written, and only the enumerated one was right.
- **A green gate is not fidelity**, and an informational check that never propagates its exit code
  is not a gate at all (`check-box-flat`).
- **A red gate may be asserting a contract we deleted** — check before "fixing" it. On 2026-08-25
  the obvious fix to one would have reintroduced 32 deliberately-removed attributes.
- **Five tracks share `main`.** Path-scoped commits, branch re-checked in the same command.
