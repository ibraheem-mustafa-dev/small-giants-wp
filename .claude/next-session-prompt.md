---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
session_tag: small-giants-wp-2026-06-03-ws1-shipped-triage-and-ws4
generated: 2026-06-03
primary_goal: "CLONING-PIPELINE THREAD. ORCHESTRATION-FIRST (Sonnet-subagent over Opus-inline; parallel where disjoint; /qc after every considerable change). WS-1 A1+A2 SHIPPED 2026-06-03 (commit 2f86d9e6, D159) — sgs/container gained contentWidth (guarded __inner render wrapper) + the converter now transfers each slug-None section's own max-width→widthMode (absent→full/alignfull, present→custom) + lifts the folded __inner max-width→contentWidth; live-DOM verified @1440 (4 target sections 1200/dropped→1425 full-bleed/content 1040|960; brand 1000 unchanged). OPEN WITH (pick with Bean): (a) the PAGE-TRIAGE register P-CLONE-PAGE-VISUAL-TRIAGE #1-#8 (Bean's full-page QA — none an A1/A2 regression; #3/#4 verified pre-existing; root-cause each via /systematic-debugging on run artefacts + draft-vs-clone live-DOM), and/or (b) WS-4 composite-remodel (Bean SHARPENED directive D159.2: composites' built-in wrappers DRIFTED from sgs/container — remove each, replace with an EXACT sgs/container mirror, then an /sgs-update step walks block_composition + re-mirrors on container version-bump; hero/trust-bar #1/#2 are drift symptoms), and/or (c) WS-1c (A3 custom-width centring / A4 raw-px gap / A5 min-height / A6 gridItem*; A7 likely MOOT — _lift_core_block_style is dead code). Sensitive composite/converter work → design-gate + /qc-council BEFORE coding. Work on main; a parallel THEME thread shares the tree — commit by explicit path, verify git log -1 --stat (STOP #41/#45)."
---

# Next Session — CLONING thread (container/wrapper standardisation programme)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**. The predecessor session (2026-06-02) deep-analysed the container/wrapper system (4-branch code review + 6-step target/current compare + artefact-empirical proof) and scoped the fix as a 5-workstream programme — do NOT re-derive it, READ the plan (`.claude/plans/2026-06-02-container-wrapper-standardisation.md`) + Spec 22 §FR-22-21 + decisions D152. Quote the STOP catalogue + the pre-flight ritual back to yourself before acting. A SEPARATE theme/blocks thread shares this working tree — see `.claude/next-session-prompt-theme.md` (do not do theme work here; coordinate commits, explicit path, check `git log -1 --stat`).

## Branch + state
- **Branch:** `main` @ `c468af7a` (pushed; a parallel THEME thread is co-active on this tree — commit by explicit path, verify `git log -1 --stat`). No long-lived branch — commit fidelity work to main or a fresh SHORT-LIVED branch.
- **Canary page 144** (`/rc-fix-verification-mamas-munches/` on sandybrown) reflects the last re-clone (run `mamas-munches-144-2026-06-02-224706`). Pixel-diff informational per FR-22-18 — never cite a single number as a gate; the systemic transfer gaps are WHY (wrong widths, dropped `__inner` wrappers, imposed gradient).
- **Mockup baseline server:** `python -m http.server 8137 --bind 127.0.0.1` from `sites/mamas-munches/` (restart for re-measure). Draft: `http://127.0.0.1:8137/mockups/homepage/index.html`.

## ✅ SHIPPED 2026-06-03 (WS-1 A1+A2) — DO NOT re-derive
- **WS-1 A1+A2 SHIPPED + pushed (`2f86d9e6`, D159).** A1 (block): `contentWidth` attr on sgs/container → render.php emits a guarded `<div class="sgs-container__inner" style="max-width:..;margin-inline:auto">` (guard `'' === $layout` — never collapses a direct grid/flex) + style.css/editor.css rule + edit.js control; additive attr on a dynamic block (no deprecated.js). A2 (`convert.py`): slug-None section path sets widthMode from the section's OWN max-width (absent→`full`/alignfull escapes WP's per-container `:not(.alignfull)` 1200 cap; present→`custom`+customWidth); fold lifts the folded `__inner` max-width→`contentWidth`.
- **Live-DOM verified @1440 (R-22-11):** featured-product 1200/inner-dropped→1425 full-bleed/content 1040; ingredients/gift/social→1425/960; brand 1000 unchanged (custom, not full); hero/trust-bar unchanged. 768/375 regression-clean (the one overflow = testimonial-slider's own track, pre-existing). Visual-diff `reports/visual-diff/container-2026-06-03.md` PASS.
- **Design-gate:** 3-rater /qc-council validated pre-build (inner-wrapper model over `:where`; `layout!=''` guard; `_match_theme_width` custom case; A1+A2 atomic; refuted the `style.dimensions.maxWidth` shortcut). Cap source pinned: `.wp-container-…-is-layout > :where(:not(.alignfull)){max-width:1200px}` (0,2,0).
- **REMAINING WS-1c (NOT built):** A3 custom-width centring, A4 raw-px gap (`render.php:150`), A5 min-height, A6 gridItem*. **A7 likely MOOT** — `_lift_core_block_style` has ZERO call sites (dead code); A2 inlined its own max-width→widthMode logic.
- **Page-triage register (P-CLONE-PAGE-VISUAL-TRIAGE, #1-#8)** captured in parking + D159.3. Bean's eye caught 8 issues width-measurement missed (measurement-vs-eye). **NONE is an A1/A2 regression** — #3 (Zookies heading centred) verified origin `.wp-block-sgs-heading`; #4 (product-cards 380/380 not filling 640/384 cells) verified product-card-internal; both PRE-EXISTING. #1/#2 (hero/trust-bar) = composite-wrapper DRIFT → WS-4.

## ✅ SHIPPED + DONE EARLIER SESSION (2026-06-02) — DO NOT re-derive
- **Task 1 — 4-block save-null fix editor-/qc'd LIVE (PASS).** feature-grid/multi-button/tab/accordion-item: 0 invalid blocks, InnerBlocks children survive save→reload (Playwright canary 144). D150 fix confirmed.
- **Workstream A SHIPPED (`0d746073`).** `sync-container-wrapping-blocks.py` rewritten (DB/source-detected roster, R-22-1 clean) + `block_composition.container_kind` migration + seed renames trust-badges→trust-bar + inserts option-picker + 3 role flips + trust-bar/modal `containerKind:"section"`. 4-rater qc-council caught the UPDATE-only silent 26/28 undercount → fixed (fail-loud + rollback). `--apply` wrote all 28, verified.
- **Container/wrapper deep-analysis + 5-workstream plan + docs (`1d846667`).** Plan + Spec 22 §FR-22-21 (canonical wrapper-conversion procedure) + flow/stages + D152 + parking (P-CONTAINER-WRAPPER-STANDARDISATION). 2-rater doc-council → DOCS-COMPLETE (2 wrong claims fixed).
- **Bean reframe (architectural):** NO composite evades R-22-9 — exempting a "recognised block" is the per-block cheat. Composites must MIRROR sgs/container via the block_composition propagation substrate. (memory `feedback_no_composite_evades_universal_rule`; STOP #43.)
- **contentWidth design CORRECTED:** the inner-WRAPPER model (container renders `sgs-container__inner` that caps content as a group; children keep their own CSS incl. label left-align) — supersedes the old "cap-each-child via :where()" Option B. The label-centring worry evaporates.
- **Mockup:** removed the has-halal trust-bar 5th-column rule (Bean — added manually, later dropped).

## ⚡ OPEN WITH THIS — pick with Bean: PAGE-TRIAGE (#1-#8) and/or WS-4 composite-remodel and/or WS-1c

> **WS-1 A1+A2 DONE (`2f86d9e6`). The #1-#8 triage is now GROUNDED** (5 investigations + qc-council + WS-4/#3 audits — see **D160** + the **GROUNDED FINDINGS** appendix of `.claude/plans/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md`; do NOT re-investigate). **LOCKED sequence (Bean-directed, WS-4-FIRST — wrapper fixes done before WS-4 get overwritten):**
> 1. **WS-1c** — complete sgs/container (A3 custom-width centring / A4 raw-px gap / A5 min-height / A6 gridItem*; A7 MOOT — `_lift_core_block_style` is dead code).
> 2. **WS-4 (FOUNDATIONAL) — applies to ALL ~28 composites in the `block_composition` roster, KIND-scoped (Bean-directed), NOT just the 4 section blocks.** Shared PHP wrapper helper (`includes/class-container-wrapper.php`) + KIND-scoped block.json attr-mirror (section=full / layout=grid+width / content=width+spacing) + `sync-container-wrapping-blocks.py` report-only→WRITER iterating the whole roster (/sgs-update Stage 11). **MODAL excluded.** **BLOCKER FIRST:** rename cta-section `layout`→`contentLayout` (+deprecated.js); hero `overlayColour`→`backgroundOverlayColour` (+deprecated.js); trust-bar additive. Build order: cta rename→helper→SECTION batch (trust-bar→cta→hero, the visible #1/#2)→LAYOUT batch→CONTENT batch (product-card is here — #4b depends on it)→writer. Sensitive → design-gate + /qc-council. WS-1c lands before the helper.
> 3. **THEN wrapper-dependent fixes:** #4b product-card FILLS its cell (via its mirrored wrapper, NOT a cardMaxWidth hack); #7 announcement-bar (likely auto-resolves under WS-4 — PARK till then).
> **In PARALLEL throughout (wrapper-independent):** **#3** text-parity (add `textAlign` attr+control+render to heading+label per the sgs/text pattern — they were built incomplete; + heading edit.js control gaps + label fontStyle/`attr()` bug); **#6** notice-banner block.json source-fix (so /sgs-update re-derives content-block/1) + converter sgs/text-child synthesis + showIcon-from-draft; **#4a** lift the named responsive grid onto NATIVE attrs in `_emit_wrapper_container` (converter, independent); **#8** slider — BUILT+deployed (uncommitted) but BUGGY (Bean live-checked the 4-card slider): (1) columns far too thin — card group spans only ~half the section width → rebuild the `__stage` flex + slide flex-basis so cards FILL the full `__inner` width (~960/3 each); (2) nav must ALWAYS show + ROTATE even at total≤slidesVisible (remove the hide-when-≤ gate; 3 cards rotate 1→2→3→1); + tidy the floating pause-btn. Verify live on the real 4-card slider, then commit. Serve the mockup on localhost + diff vs page 144 (STOP #35) before any fix. The original WS-1 build detail below is retained for WS-1c reference.

### (retained for WS-1c) WS-1: sgs/container 3-layer completion

> **Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The class-section width bug was the symptom that surfaced it — not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).

The analysis + plan are DONE. The next session BUILDS, starting with **WS-1 — complete sgs/container's 3 layers** (the canonical wrapper; WS-1 gates WS-4 composite-mirror). Per the plan §WS-1:
- **A1 (High)** content-width layer: add a `contentWidth` attr + render.php emits an inner `sgs-container__inner` div (max-width + margin:auto) when set + edit.js control. The fold lifts `__inner`'s max-width into it. (convert.py:498-516,2776-2804 currently DROP it.)
- **A2 (High)** outer max-width transfer: slug-None section path sets no widthMode; kill the hardcoded `{"widthMode":"full"}` band-aid (db_lookup.py:2461). max-width ABSENT→full, PRESENT→custom+customWidth.
- **A3** custom-width centring (margin:auto for custom widthMode). **A4** raw-px gap (render.php:150 forces spacing-token). **A5** min-height (dropped). **A6** gridItem* (never written).

**Sensitive core-block change → design via `/brainstorming` + `/qc-council` BEFORE coding** (STOP #32). Serve the mockup on localhost + diff computed styles vs page 144 (STOP #35) to re-establish the baseline first. Build → deploy → re-measure live DOM (R-22-11, NOT pixel-diff) → Bean sign-off (R-22-13). Full gap register + sequencing + ROAM: the plan.

## ⚡ ORCHESTRATION PHILOSOPHY (Bean-locked 2026-06-02 — apply to EVERY task)
**Prefer a single Sonnet subagent over doing it Opus-inline** — Sonnet is faster, far more token-efficient, and keeps the orchestrator's context free so this session achieves more before a fresh one is needed. Even a coordinated single-file task is usually better as one Sonnet subagent than inline-Opus. **Run subagents in PARALLEL wherever the work is disjoint.** Use Opus-inline ONLY when (a) Bean's decision is needed mid-task, or (b) inline is genuinely more efficient (trivial 1-2 tool-call change). **Run /qc (qc-inline for small, qc / qc-council for converter/block/DB) after EVERY considerable change, removal, or new implementation** — before commit (blub.db 255).

## ORCHESTRATION PLAN (the 5-workstream programme — full detail in the plan doc)

### WS-1 — sgs/container 3-layer completion (OPEN HERE; gates WS-4)
**What:** A1 content-width attr + inner-wrapper render; A2 outer max-width transfer + kill hardcoded widthMode:full; A3 custom-width centring; A4 raw-px gap; A5 min-height; A6 gridItem*. **Why:** the canonical wrapper must hold all 3 layers before composites can mirror it. **Time:** ~2 hr.
**Orchestration:** design-gate (`/brainstorming` + `/qc-council`) FIRST → Sonnet subagent builds → main-thread deploys + re-measures live DOM → Bean R-22-13. **/qc gate after:** YES /qc-council. **Acceptance:** the 4 slug-None sections render full-bleed + content capped (featured 1040, others 960) centred; brand 1000; live-DOM verified. Note: the 4 sections are the measurement gate for WS-1 — composite blocks (hero/trust-bar) mirror sgs/container via WS-4 once the canonical wrapper is complete.

### WS-2 — converter/router truth (after a B1 decision)
**What:** B1 the D1 typed-attr layer is written-not-consumed (`seed_d1_sidecar` stub convert.py:167) — DECIDE revive vs DB-replace; B2 multi-child `__inner`/grid → attrs; B3 grid on recognised section → attr; B4 D3 dual-write anti-pattern. **/qc gate:** YES. **Depends on:** B1 decision (present options to Bean first).

### WS-3 — de-cheat (R-22-1 DB-first) — parallel with WS-1
**What:** C2 trust-bar static-grid CSS → attr-driven (P-TRUSTBAR-BOUND-GRID root cause); C3 `_CAPABILITY_PRIORITY`, C4 the two breakpoint systems, C5 `_infer_role`, C6 `_GLOBAL_BARE_TAGS` → DB; C7 de-Mama's the deploy script (MOCKUP_ROOT + page-144 default); C8 cta-section `layout` enum collision. **/qc gate:** YES per commit.

### WS-4 — composite standardisation + auto-propagation (after WS-1 — the largest)
**What:** extract container render logic into a SHARED PHP helper composites call + a propagation WRITER (current sync is report-only) + /sgs-update wiring, so updating sgs/container mirrors into every composite of its KIND. Resolve the divergent re-implementations (trust-bar/hero/cta-section). **Orchestration:** `/dispatching-parallel-agents` across the 28 blocks once the helper + writer exist. **/qc gate:** YES. **Acceptance:** add a dummy capability to sgs/container → /sgs-update → all KIND-matching composites gain it; live-verified; Bean sign-off.

### WS-5 — docs (throughout)
Update Spec 22 §FR-22-21 + flow/stages + decisions/parking as each WS lands; the procedure is canonical.

## Dependency graph
```
WS-1 (design-gate → Sonnet build → deploy → re-measure)  ║  WS-3 de-cheat (parallel)
        ↓ (WS-1 complete)                                    B1 decision → WS-2
WS-4 composite mirror + auto-propagation (/dispatching-parallel-agents)
        ↓
WS-5 docs throughout · then real image sideload (biggest pixel lever once structure faithful)
```

## VARIANT-ROUTING CRITERION (LOCKED — the answer to "which blocks need the special matching")
**A block needs ROUTING iff the variant makes specific content/structure/terms APPEAR that plain CSS extraction won't reproduce. Everything else is a CSS setting that transfers via the D0 layer — no routing.** (Bean: "I couldn't care less what we call them.") Full 66-block categorisation + the two "variant" mechanisms (the in-block `variant` attr AND `registerBlockVariation` inserter presets) in `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md`. NEEDS ROUTING: hero, product-card, business-info, announcement-bar(countdown), whatsapp-cta, testimonial-slider(split), trust-bar(badge), team-member(Compact/Detailed), card-grid, mega-menu + carousel/badge VALUES only. D0-TRANSFERABLE (no routing): heading, text, label, quote, mobile-nav, divider, all cardStyle/style presets, grid/masonry/list layout values, button primary/secondary/outline.

## MANDATORY READING LIST (read FULLY before any work)
1. This file.
2. `.claude/handoff.md` (cloning thread, 2026-06-02 — Workstream A shipped + the standardisation programme).
3. **`.claude/plans/2026-06-02-container-wrapper-standardisation.md` — the 5-workstream programme + full A1-D3 gap register + ROAM + sequencing. THE build map (the *what*).**
3a. **`.claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md` — the DEPTH SOURCE (the *why*): every gap-ID's file:line evidence from the 4-branch converter analysis. Read this so you understand the gaps deeply, not shallowly — the plan lists gap-IDs; this report proves each one.**
4. `.claude/decisions.md` newest: **D152 (Workstream A shipped + container/wrapper analysis + programme)**, then D136 (CSS-transfer 4-gap audit), D135/D134 (variant detection), D130-D133.
5. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
6. `.claude/state.md` — current_phase + blockers.
7. `git log --oneline -14` + read the recent commit messages (each carries root-cause + verification).
8. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — **§FR-22-21 (the canonical wrapper-conversion procedure + 3-layer model + composite-mirror rule)**, §FR-22-19 (scalar-media), §FR-22-20 (variant detection), §FR-22-4/4.1 (the FOLD), §6 (R-22-1..14).
9. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
10. `.claude/cloning-pipeline-flow.md` + `-stages.md` — esp. the D0/D1/D2/D3 CSS router (the procedure + gap callouts are now here).
11. `sites/mamas-munches/mockups/homepage/index.html` — THE draft truth. Pattern: full-bleed sections (no max-width) + `__inner` wrappers (max-width:960/1040).
12. `.claude/parking.md` — P-CONTAINER-WRAPPER-STANDARDISATION (the programme), P-TRUSTBAR-BOUND-GRID, P-FR2220-VARIANT-DETECTION.
13. memory `feedback_no_composite_evades_universal_rule` (NEW — the reframe), `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`, `feedback_read_ground_truth_before_concluding`, `feedback_concurrent_commit_race_shared_tree`, `feedback_empty_section_false_pixel_diff_win`.
14. The converter: `convert.py` walk() ~2031-2090 (slug-None section path + fold), `_root_lift_rules` ~498 (no max-width — A1/A2), `_fold_layout_into_attrs` ~2776, `db_lookup.py` `emit_sgs_container_wrapping` ~2389-2461 (hardcoded widthMode:full — A2/C1), `seed_d1_sidecar` ~167 (stub — B1), `_collect_css_decls_for_element`.
15. `theme/sgs-theme/theme.json` (contentSize 780 / wideSize 1200) + `container/render.php` (widthMode + gap:150) + `container/style.css` width classes.
16. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — product-card/trust-bar dual-mode (FR-24-10 shipped).

## Anti-pattern STOP catalogue — carried forward + EXTENDED (D101; if you find yourself doing X, STOP)

| # | If you find yourself | STOP — because |
|---|---|---|
| 1 | Grep-skimming Spec 22 instead of reading sections end-to-end | Cornerstone §FR-22-2/2.1/2.2/2.5 defines `equivalent_block_for()`. READ FULLY. |
| 2 | Referencing `slot_synonyms`/`legacy_role_lookup` as live tables | DROPPED D99. Live = `slots` (PK `(slot_name,scope)`, 92 element + 4 section) + `roles` (21). |
| 3 | Referencing `slot_synonyms.role_classification` column | Retired D99 → `roles` table. |
| 4 | Treating `.claude/` + `.agents/` sgs-framework.db as two DBs | Same physical file (NTFS junction). Real two DBs = sgs-framework.db + ui-ux-pro-max.db. |
| 5 | Building a bespoke SGS block per mockup section | R-22-9 violation. ~67 reusable primitives; section variation via slots + FR-22-4 default. |
| 6 | Adding `if(empty($content)&&!empty($legacy_attr)){scalar render}` to a migrated render.php | R-22-14 violation. Backwards-compat = roster migration + WP-CLI batch, never per-block fallback. |
| 7 | Batching multiple DB row changes then measuring once | Row-by-row gate: ship one + measure between each. |
| 8 | Routing a section-root BEM class to a content-block primitive | Section roots → sgs/container (or FR-22-4 default). |
| 9 | Proposing a fix-shape without reading the relevant Spec section + flow + stages end-to-end | State the architectural primitive in plain English FIRST. |
| 10 | Acting on a doc/handoff claim without grep-verifying against the codebase | 60s find/grep/ls BEFORE acting. (This session: the branch was already merged — the prompt was stale.) |
| 11 | Using `sgs-db.py sql` for INSERT/UPDATE/DELETE | Wrapper is read-only (silently no-ops). Use direct `sqlite3` for writes. |
| 12 | Shipping a fix without tracing the EXACT emission path of the canary instance | Trace which slug RECEIVES the affected attr now, not which COULD. |
| 13 | Treating the literal-slug-match voter path as live | Retired D107. Voter queries `blocks.tier='class-section'`. |
| 14 | Re-enabling the reverted XS-3 walker condition | Resolved by FR-22-4.1 fold. Don't re-derive the old predicate. |
| 15 | Batching `block_composition`/DB-row changes then measuring once | Ship one row at a time with measurement between. |
| 16 | Hardcoding `__products`/`__cards`/generic BEM slot → specific block slug in Python | R-22-1 violation. Route via DB; fall through to sgs/container default. |
| 17 | Treating "code reverted" as "all related updates deferred" when applying docs | Distinguish: (a) code reverted, (b) DB rows persisted, (c) shipped tasks unaffected. |
| 18 | Accepting a subagent threshold/result without sanity-checking vs architectural intuition | If count is wildly off the expected roster, the threshold is wrong — fix before accepting. |
| 19 | Iterating inline on a failing fix under context pressure when measurement shows regression | Roll back fast; re-tune across a session boundary with evidence baked in. |
| 20 | Trusting a per-section pixel-diff WIN without checking live-DOM textLen | An EMPTY section scores a FALSE win. Verify `el.innerText.trim().length` + element counts (R-22-11). |
| 21 | Assuming the walker runs FR-22-2 content-routing automatically | Confirm leaf content-routing + the fold actually fire; verify emitted markup. |
| 22 | Treating a renamed/migrated block as "done" without verifying its render mode | trust-bar reads scalar `items` (HYBRID) — renders DEFAULTS not cloned content unless §FR-24-10 dual-mode. |
| 23 | Routing pack-size/option pills to `sgs/label` (or `sgs/button`) | Pills → a FUTURE dedicated atomic pill block, NOT label/button. |
| 24 | Trusting a per-section pixel-diff change (either direction) over live DOM | Pixel-diff mis-scores structural change BOTH ways. FR-22-18: structural parity from rendered HTML is the gate. |
| 25 | Shipping a self-labelled "Phase 1" / "simpler-than-spec" shortcut | Implement the spec's ACTUAL mechanism. |
| 26 | Asserting what ANY block can/can't do from a partial attr dump | READ block.json + edit.js + render.php + `/wp-blocks` before asserting capability. |
| 27 | Giving up after one shortcut fails; not using the toolkit | For EVERY gap: root-cause from trace+live-DOM, find why same-class peers PASSED, ONE unified systemic fix. |
| 28 | Using pixel-diff during structural work | Measure from RENDERED HTML for layout/wrapper/logic. Pixel-diff informational-only (FR-22-18). |
| 29 | Over-checkpointing (burning Bean's context with questions) | If evidence is clear, DECIDE + execute. Only ask when a decision genuinely changes direction AND can't be resolved from evidence. |
| 30 | Proposing a block become a "thin shell" without reading its render.php's FULL pipeline | The hero render.php already had a working 169-attr image pipeline + art-direction @media CSS. Read the FULL render.php before deciding the fix LAYER. |
| 31 | Deciding the fix is block-side because "the block looks wrong" | When a render.php "already works" for one input model, the fix may be CONVERTER-side. Verify which layer emits the wrong shape. |
| 32 | Ramming a sensitive/high-blast-radius walker change at a context-heavy session tail | Design + `/qc-council` validate the fix-shape + focused build (extends STOP #19). |
| 33 | **Bolting a converter-side detect-property-then-set-mode conditional for something that should just TRANSFER** | Bean rejected this twice (detect max-width → set widthMode). The pipeline's whole job is faithful CSS transfer; a per-element/per-section walker conditional is the wrong LAYER. Fix the transfer (D0/D1/D2 + per-element lift) or a container capability. Memory `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`. |
| 34 | **Trusting a subagent's "fix all instances" sweep / finding without verifying each instance** | A subagent swept `items:{type:object}` onto 19 blocks; 5 were arrays of integers/strings → would CREATE errors. Verify every swept instance / claimed gap against ground truth (file:line) before keeping. |
| 35 | **Claiming a fix "complete/verified" from a NARROW live-DOM check** | The widthMode fix was "live-DOM verified" on the hero's internal structure but MISSED section-nesting + backgrounds Bean's eye caught. For width/layout fixes, check the FULL section: width vs viewport, max-width, background fill, AND diff the draft's computed styles (serve mockup + diff). |
| 36 | **Conflating a "variant" with a CSS "setting/style"** | A variant needs ROUTING only if it makes distinct content/structure/terms APPEAR. A font-size/animation-direction preset is a SETTING that transfers via D0. The dropdown being named `variant` does NOT make its values true variants. |
| 37 | **Gating a converter rule on "block HAS attr X" without checking the attr's TYPE** | A shared attr NAME can differ in type across blocks: `inheritStyle` is a string enum on sgs/button but BOOLEAN on sgs/text/heading/quote. Gate on `block_attrs(slug)[X].attr_type` (DB-driven), not just presence. (memory `shared-attr-name-can-differ-in-type-across-blocks`.) |
| 38 | **Adding a slot alias in camelCase to match a BEM element class** | BEM is lowercase-hyphens (Spec 00) — `parse_sgs_bem('sgs-x__buttonSecondary')` returns None. Write slot aliases lowercase-hyphenated (`button-secondary`); verify with parse_sgs_bem + a resolve test on the REAL class. (memory `bem-aliases-must-be-hyphenated-not-camelcase`.) |
| 39 | **Running /qc-council on a criterion framed around the wrong signal** | A council validates whatever criterion it's GIVEN — framing around a proxy ("does the block have a layout/section ATTR?") instead of the real signal ("does it WRAP CHILDREN?") produced 2 confidently-wrong rounds. Frame the council question around the signal that actually answers it. (D150.) |
| 40 | **Classifying a block from its block.json ATTRS instead of its structure** | FR-22-6 InnerBlocks migrations move content from scalar attrs INTO an InnerBlocks child-template — an attr-light block (info-box) can be a full container. Detect container-ness from STRUCTURE (InnerBlocks.Content / useInnerBlocksProps / array-of-objects / layout attr). (D150.) |
| 41 | **Creating a branch / committing / editing shared living-docs without checking the parallel-session state** | `git branch --show-current` first. A parallel theme session shares this tree; re-read shared docs (decisions/parking/state) before editing; commit by explicit path; verify `git log -1 --stat` after. (memory `feedback_concurrent_commit_race_shared_tree`.) |
| 42 | **Doing coordinated/mechanical work Opus-inline when a Sonnet subagent would do** | Bean-locked: prefer a single Sonnet subagent over Opus-inline (faster, far more token-efficient, conserves context). Opus-inline only when Bean's decision is needed mid-task or inline is genuinely more efficient (trivial 1-2 calls). Parallelise disjoint work. /qc after every considerable change. |
| 43 | **NEW 2026-06-02. Exempting a "recognised composite block" from the universal rule** | "Block X is a recognised composite with its own render, so the universal rule doesn't apply to it" IS the per-block cheat (R-22-9). Every composite with a built-in wrapper must MIRROR sgs/container's capabilities for its KIND (propagated via block_composition + /sgs-update), not diverge. Bean: "All recognised composites do not evade the rule. Catering to it would cheat." (memory `feedback_no_composite_evades_universal_rule`; D152.) |
| 44 | **NEW 2026-06-02. Relaying a subagent's gap/finding as fact without verifying it applies** | An extraction subagent "found gaps" in hero by wrongly forcing the generic-container model onto a recognised composite; I relayed them. Bean made me verify — they were a mis-modelling. Subagent findings are HYPOTHESES; verify the claim AND that it even applies to the target (file:line) before presenting. (Extends STOP #34; memory `feedback_read_ground_truth_before_concluding`.) |
| 45 | **NEW 2026-06-02. Editing the shared decisions.md/parking.md/state.md with a stale D-number / without re-read** | A parallel theme thread took D151 while this thread was mid-write. Re-read the shared doc immediately before editing, use the next FREE D-number, and commit shared docs by explicit path (never `git add -A`). (memory `feedback_concurrent_commit_race_shared_tree`; D152.) |
| 46 | **NEW 2026-06-03. Declaring a fix "verified" from a NARROW measurement set (e.g. width-only) and asking Bean to sign off** | WS-1 A1+A2 passed every width prediction @1440/768/375, but Bean's full-page eye immediately caught 8 issues the width-measurement was blind to (heading-align, card-fill, image-fit, content-routing, composite drift). The measurement-vs-eye rule: when Bean disputes a "match", the measurement set is INCOMPLETE — extend it (full-page draft-vs-clone computed-style diff, not just the one dimension you fixed) BEFORE claiming verified. A width fix being correct does NOT mean the section is correct. (`~/.claude/rules/measurement-vs-eye.md`; D159.3.) |

## Pre-flight self-attestation ritual (answer ALL inline before any fix-shape or dispatch)
1. Architectural primitive in plain English (Spec 22 §0 / §FR-22-21)?
2. Which R-22-N binding rule(s) govern this? (esp. R-22-1 DB-first, R-22-3 no-4th-branch, R-22-9 universal, R-22-14 no-fallback)
3. **Is this a CSS-TRANSFER problem (faithfully copy the draft's value / stop imposing a framework default) or a genuine STRUCTURE/CONTENT-routing problem? If transfer — fix the transfer layer / a container capability, NOT a walker conditional (STOP #33).**
4. Did I READ the draft's actual CSS for this element (serve the mockup + computed styles) AND the clone's, and diff them — not guess? (STOP #35)
5. Is this the spec's ACTUAL mechanism, or a shortcut/band-aid Bean would reject? (STOP #25/#33)
6. Which LAYER emits the wrong shape — converter, block, theme-CSS, or the fold? Did I read BOTH the converter output AND the block/theme expected input? (STOP #31)
7. Root cause from trace + live DOM — why did same-class peers PASS? (STOP #27)
8. Unified systemic + DB/transfer-driven fix (helps all same-class cases, no per-block conditional)? (STOP #16/#33)
9. Measuring from rendered HTML + live-DOM + draft-diff, not pixel-diff alone? (STOP #28/#35)
10. Sensitive/high-blast-radius change at a context-heavy tail → design + qc-council + focused build? (STOP #32)
11. **Can this be a single Sonnet subagent instead of Opus-inline? Can it run in PARALLEL with other tasks? (STOP #42)**
12. **If running a council/analysis — is the question framed around the signal that ACTUALLY answers it, not a proxy? (STOP #39)**
13. **Is this a generic container OR a recognised composite — and if composite, does my fix MIRROR sgs/container (not exempt the block)? (STOP #43)**
14. **Am I about to edit a SHARED living-doc (decisions/parking/state) — re-read it first, use the next free D-number, commit by explicit path? (STOP #45)**

## Tooling
`/autopilot` (first) · `/sgs-wp-engine` · `/wordpress-router` · `/sgs-clone` · `/wp-blocks` · `/sgs-db` (read) + direct `sqlite3` (writes) · `/brainstorming` (WS-1 design-gate) · `/systematic-debugging` · `/qc-council` (per converter/block commit — MANDATORY) · `/verify-loop` · `/dispatching-parallel-agents` + `/subagent-driven-development` · `/delegate` · Playwright MCP (serve the mockup locally for draft-vs-clone computed-style diff — `file://` blocked) · `build-deploy.py --target sandybrown --blocks-only --allow-dirty` · `sgs-clone-orchestrator.py` (path `plugins/sgs-blocks/scripts/`) · `/handoff`.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design the WS-1 transfer-layer fix before coding (sensitive — render.php inner wrapper + fold + theme interaction) |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | If a transfer/propagation approach needs the gold-standard (auto-routes tier) |
| `/strategic-plan` / `/phase-planner` | Break each workstream into executable steps (the plan hands off per-WS) |
| `/systematic-debugging` | Root-cause each transfer gap from artefacts + draft-diff |
| `/qc-council` | MANDATORY before every converter/block commit (blub.db 255) |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | Draft-vs-clone computed-style diff (serve mockup on localhost; `file://` blocked); live-DOM verification |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema enumeration before any "missing X" |
| `/sgs-db` (read) + `sqlite3` (writes) | DB ground truth |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy converter/theme-CSS/fold/render.php build (WS-1, WS-4) |
| `design-reviewer` | Visual parity draft-vs-clone after the transfer fix |

## Guardrails
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset BEFORE any pixel-diff/browser test.
- **Faithful transfer, not detection hacks** (STOP #33) — fix the transfer layer or a container capability; never a per-section walker conditional.
- **No composite evades R-22-9** (STOP #43) — composites mirror sgs/container; never exempt a "recognised block".
- **Draft-diff, not pixel-diff** for layout — serve the mockup locally, compare computed styles (STOP #35).
- **--converter-v2 required** on orchestrator runs. **WP_DEBUG_DISPLAY false** on staging.
- **/qc-council before every converter/block commit** (blub.db 255). **Verify subagent sweeps + findings** (STOP #34/#44).
- **Work on `main`** or a fresh SHORT-LIVED branch — a parallel theme thread shares the tree; re-read shared docs before editing, commit by explicit path, verify `git log -1 --stat` (STOP #41/#45). Bean visual sign-off per fidelity milestone (R-22-13).
