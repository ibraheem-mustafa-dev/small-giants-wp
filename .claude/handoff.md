# Session Handoff — 2026-06-04 (CLONING thread) — WS-4 composite-mirror EXECUTED: 25 composites mirror sgs/container + recipe canonical + reliable fan-out proven

> **CURRENT — this is the live handoff.** Earlier dated sections below are prior work, kept for history. Full orchestration plan: `.claude/next-session-prompt.md` (2026-06-04 opener). Decisions: D166. Theme thread shares the tree (D165) — commit by explicit path, verify `git log -1 --stat` (STOP #41/#45).

## Completed This Session
1. **WS-4 foundation (`64950efa`):** extracted the full wrapper-render from `container/render.php` into `includes/class-sgs-container-wrapper.php` (`SGS_Container_Wrapper::render($attributes,$block,$inner_html,$kind,$opts)`; KIND-gated section/layout/content; opts incl `extra_attrs` data-* passthrough + `no_overlay` C3 guard); refactored `sgs/container` to call it — **byte-identical proven (canary page diff=0)**; + `ContainerWrapperControls.js` editor component + the propagation writer + Stage-11 (report-only). Helper later hardened: self-requires render-helpers.php + shape-dividers.php (a composite requiring only the helper fataled on the gap path) + `fieldset` allowed-tag.
2. **25 composites migrated to mirror sgs/container (element route) — all live-validated + committed:** section (trust-bar `a18e6188`, cta-section `a0297c04` incl. the rename + double-emit pattern); content ×6 (`84a86b96`, `6634d2e2`); layout grids ×9 (`54032e86`); interactive ×8 (`0ad389b0` — incl. testimonial-slider with the preserved #8 work).
3. **Recipe canonical (`a4295130`):** Spec 22 §FR-22-21.1 (4-step migration recipe + KIND rules + the mandatory verification process) + §FR-22-21.2 (Stage-11 auto-propagation design) + pipeline-flow status.
4. **#3 heading + label textAlign parity (`5712c97e`):** block capability (R-22-9, matches sgs/text); the page-144 visible outcome needs converter-emit + re-clone (tracked).
5. **Reliable fan-out process proven** after the 2026-06-03 5-way-agent overload failure: small batches (2-3 agents) + mandatory undefined-var self-check + orchestrator live test-page verify per block. Caught 3 cut-off/500 agents + a helper-dependency fatal + an option-picker tag gap — all fixed before commit. Docs (`a524c241`): D166 + next-session-prompt 2026-06-04 opener + state.

## Current State
- **Branch:** `main` at `5712c97e` (+ this handoff commit pending). Theme thread co-active (D165).
- **Tests:** no suite; all 25 composites + heading/label `php -l` + `npm run build` clean; live `do_blocks()`/test-page render-verified (sgs-container mirror present, 0 fatals).
- **Build:** passes. **Uncommitted:** lucide-icons.php (auto-regen, never committed).

## Known Issues / Blockers
- **WS-4 NOT 100% done:** hero (inline w/ Bean — hardest), mobile-nav, product-card (coordinate theme thread) remain.
- **The composite mirror does NOT fix the cloned page** — the converter routes mockup classes to `sgs/container` (conf 0.10), not to the matching composite BLOCK. Page-144 fidelity needs the SEPARATE converter work (routing fix + converter-lift + image sideload), to be architected by the Phase-7 adversarial review.

## Next Priorities (in order)
1. **hero inline WITH Bean** (cta-section is the proven section pattern) + mobile-nav + product-card.
2. **/qc-council** all 25+ composites (gaps/weaknesses/missed interactivity).
3. **Upgrade /sgs-update Stage 11** to auto `--apply` the KIND-scoped mirror on a container version-bump → **run /sgs-update**.
4. **/systematic-debugging + /adversarial-council** — hole-poke the universal setup vs Spec 22 + plan; FIX the converter routing (`.sgs-hero`→`sgs/hero` block before the container fallback).
5. **/handoff.**

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` | NEW shared wrapper helper (+ extra_attrs, fieldset, self-requires deps) |
| `plugins/sgs-blocks/src/blocks/container/{render.php,components/ContainerWrapperControls.js}` | container delegates to helper (byte-identical) + editor-controls component |
| `plugins/sgs-blocks/src/blocks/<25 composites>/{render.php,block.json,edit.js}` | mirror sgs/container via the helper |
| `plugins/sgs-blocks/src/blocks/{heading,label}/*` | #3 textAlign parity capability |
| `plugins/sgs-blocks/scripts/{sync-container-wrapping-blocks.py,sgs-update-v2.py}` | propagation writer + Stage 11 (report-only) |
| `.claude/specs/22-...md`, `cloning-pipeline-flow.md`, `decisions.md` (D166), `state.md`, `next-session-prompt.md`, `parking.md`, the triage plan | recipe canonical + reconciliation |

## Notes for Next Session
- **Validate composites in the EDITOR / a test page, NOT a page re-clone** — the converter emits containers not composites (memory `composite-mirror-is-separate-from-cloning-fidelity`). REST `POST /wp/v2/pages` is NOT guard-blocked; use a `core/paragraph` child (NOT `sgs/text` — it renders empty), or a token-gated webroot `do_blocks()` probe.
- **The recipe is two committed reference blocks + Spec 22 §FR-22-21.1** — fan-out the rest in small verified batches; the undefined-var grep + orchestrator render-verify are MANDATORY (php -l misses undefined vars; agents repeatedly self-report "clean" while broken — STOP #34).
- **hero decisions for Bean:** LCP `<img>` stays bespoke vs moves to container bg-attr; split-grid via extra_styles vs container layout attrs. Same double-emit/rename pattern as cta-section.
- The converter-lift is NOT dead (memory `universal-lift-was-premature-not-falsified`) — it's queued post-WS-4 + folds into the adversarial review's converter architecture.

---

# Session Handoff — 2026-06-03 (CLONING thread, LATE PM) — Wave-1 block fixes + composite-diff scanner (uncommitted) · dedup audit (NO merges) · generic-lift FALSIFIED · WS-4 set up as the full-29 opener

> **SUPERSEDED by the 2026-06-04 section above.** Earlier dated sections below are prior work, kept for history. Full orchestration plan: `.claude/next-session-prompt.md`. Decisions: D163. A parallel THEME thread shares the tree (now at D162) — commit by explicit path, verify `git log -1 --stat` (STOP #41/#45).

## Completed This Session
1. **3 block-quality fixes BUILT (uncommitted; build-clean + diff-verified; NOT live-verified — the SGS visual-diff hook blocks committing visual block changes without a passing report).** #3 heading/label **text-parity** (textAlign + parity controls + label `attr()` fix; heading `:where()` guard); #8 **reviews-slider** rebuild (fill-width track + always-rotating nav + pause-in-controls — still needs the live 4-card verify); **WS-1c A3+A4** on `sgs/container` render.php (custom-width `margin-inline:auto` + raw-px gap helper). 3 parallel Sonnet subagents; diffs verified.
2. **Composite-diff SCANNER built** (uncommitted, read-only) — extended `sync-container-wrapping-blocks.py` to deterministic per-composite **MISSING / ADDED / ALTERED** vs `sgs/container` + an INDEX divergence roll-up. The WS-4 input. Surfaced a 29th container block (`sgs/content-collection`) to register.
3. **Block-roster DEDUP AUDIT (Bean-inserted): NO merges.** My own review of 69 blocks + a 4-rater cross-model `/qc-council` that **overturned 3 of my 4 merge guesses**. Overlap is plumbing-level → shared helpers + the container-mirror, NOT merges. content-collection = register (29th, layout); #6 = notice-banner option-a; bloat is a mirror problem not a merge problem.
4. **Generic converter-lift FALSIFIED by `/qc-council` (before any code shipped).** Wrong path (real min-height is hero composite-interior, not a container-path gap → 0-delta no-op); unsafe blind DB-suffix fingerprint (overloaded `sgs/container` suffixes); min-height `--has-min-height` flex-centre render-trap. A6 → WS-4 lift-only-gated sub-mechanism; A5 → curated `_root_lift_rules` extension + a separate hero-composite-interior fix.
5. **Docs committed + pushed:** D163 (decisions) + next-session-prompt PM opener + STOP #47-50 + parking updates + a memory lesson (`block-roster-overlap-is-plumbing-not-blocks`). Commit `a7d0e03e`.

## Current State
- **Branch:** `main` @ `a7d0e03e` (pushed; theme thread co-active, now at D162).
- **Tests:** no suite; converter imports clean; sgs-blocks `npm run build` PASS (per subagents).
- **Build:** n/a (no code committed; block `build/` regenerable + gitignored).
- **Uncommitted changes (safe on disk, for next session's Gate B):** `plugins/sgs-blocks/src/blocks/{heading,label,container,testimonial-slider}/*`, `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py`. Plus the always-untracked `lucide-icons.php` + pre-existing `reports/phase4-*.txt` + `theme-snapshot.json`.

## Known Issues / Blockers
- **3 block fixes + scanner UNCOMMITTED** — the SGS visual-diff gate blocks committing visual block changes without a passing `reports/visual-diff/<block>-<date>.md`. Next session: Gate B (deploy + Playwright visual-diff for heading/label/container/slider) → commit. #8 slider also carries its own "verify live on the real 4-card slider THEN commit" gate.
- **WS-4 (the core directive) NOT started** — programme-sized + sensitive; deferred to a fresh session (STOP #32). It gates the wrapper-dependent fixes (#4b product-card fill, #7).
- Concurrent theme thread shares the tree — commit by explicit path.

## Next Priorities (in order)
1. **WS-4 — composite-wrapper mirror across ALL ~29 composites, KIND-scoped (NOT 4).** Bean's core directive. Mechanism in `.claude/next-session-prompt.md` (D160): shared PHP helper + KIND-scoped block.json attr-mirror + sync writer; rename blockers first. Scanner output is the input.
2. **Gate B — commit the 3 block fixes** (deploy + visual-diff capture for heading/label/container/slider; live-verify the 4-card slider).
3. **Hero composite-interior min-height** extraction fix (the real, verifiable min-height bug the council surfaced — `minHeightTablet=520px`).
4. **content-collection register** (29th roster block, layout KIND) + **#6 notice-banner option-a** (mirror sgs/container, keep semantic identity).

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/src/blocks/heading/{block.json,edit.js,render.php,style.css}` | #3 textAlign + parity controls + `:where()` guard (UNCOMMITTED) |
| `plugins/sgs-blocks/src/blocks/label/{block.json,edit.js,render.php,style.css}` | #3 textAlign + fontStyle + scoped-`<style>` responsive font-size (UNCOMMITTED) |
| `plugins/sgs-blocks/src/blocks/container/render.php` | WS-1c A3 margin-inline:auto + A4 raw-px gap helper (UNCOMMITTED) |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/*` | #8 slider rebuild — fill-width + always-rotating nav (UNCOMMITTED, needs live verify) |
| `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` | scanner: + ADDED/ALTERED diff + INDEX roll-up (UNCOMMITTED) |
| `.claude/{decisions,parking,next-session-prompt}.md` | D163 + dedup verdict + falsification + WS-4 full-29 opener + STOP #47-50 (COMMITTED `a7d0e03e`) |

## Notes for Next Session
- **The council is the gate, and it works** — it falsified the generic lift before any code, and the dedup council overturned 3 of 4 merge guesses. Run the design-gate council BEFORE building sensitive converter/composite changes (STOP #32; blub.db 276/255).
- **WS-4 scope = ALL ~29 composites, KIND-scoped — NOT the 4 section blocks.** Bean corrected this twice. Don't collapse it.
- **`sgs/container` the BLOCK is already a complete mirror target** (has minHeight/gridItem*/contentWidth) — the "A5/A6 gaps" were converter-transfer gaps, not block-capability gaps.
- This session drifted into a converter-side generic-lift detour off the WS-4 directive; corrected. WS-4 is the opener.

---

# Session Handoff — 2026-06-03 (CLONING thread, PM) — WS-1 A1+A2 SHIPPED + #1-#8 triage GROUNDED (council) + WS-4 designed

> **SUPERSEDED by the LATE-PM section above.** Earlier dated sections below are prior work, kept for history.
> Cloning thread. A parallel THEME thread shares the tree — commit by explicit path, verify `git log -1 --stat` (STOP #41/#45). Full grounded spec: `.claude/plans/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md` (GROUNDED FINDINGS appendix) + decisions D159/D160.

## Completed This Session
1. **WS-1 A1+A2 SHIPPED + pushed (`2f86d9e6`).** sgs/container gained `contentWidth` (guarded `__inner` render wrapper) + the converter transfers each slug-None section's own max-width→widthMode (absent→full/alignfull→escapes WP's 1200 cap; present→custom) + lifts the folded `__inner` max-width→contentWidth. Live-DOM @1440: 4 target sections 1200/inner-dropped→1425 full-bleed/content 1040|960; brand 1000 unchanged. 3-rater /qc-council design-gate; visual-diff report PASS.
2. **#1-#8 page-triage GROUNDED** — 5 parallel `/systematic-debugging` investigations + a 2-rater `/qc-council` (Gate A). **The council CORRECTED 3 of 5 guessed fix-shapes** (R-22-9 violations / site-wide breaks). Full validated fix-shapes in the plan's GROUNDED FINDINGS + D160.
3. **WS-4 wrapper-mirror mechanism designed** (foundation audit): shared PHP helper + KIND-scoped block.json attr-mirror + propagation writer; modal excluded; cta-section `layout`-collision = must-fix-first blocker; **scope = ALL ~28 composites (Bean-directed), not just section**.
4. **#3 text-parity audit** — heading + label both lack `textAlign` (text has it); built-incomplete. Universal fix = match the sgs/text pattern.
5. **#8 slider rebuilt + deployed (uncommitted) but BUGGY** — Bean live-checked the 4-card slider: columns too thin (~half width) + nav must always-show+rotate. Fix-direction captured; needs rebuild + live verify next session.
6. **Docs:** plan written + grounded; decisions D159/D160; parking P-CLONE-PAGE-VISUAL-TRIAGE; state + next-session-prompt updated; all pushed.

## Current State
- **Branch:** `main` at `08d5f110` (+ this handoff/lesson commit pending). On main; theme thread co-active.
- **Tests:** no suite; converter imports clean; sgs-blocks `npm run build` PASS.
- **Build:** n/a (block changes built + deployed to canary).
- **Uncommitted changes:** `plugins/sgs-blocks/src/blocks/testimonial-slider/*` (the #8 slider WIP — deployed to canary but NOT committed, pending rebuild+verify); plus the always-untracked `lucide-icons.php` + pre-existing `sites/mamas-munches/theme-snapshot.json`.

## Known Issues / Blockers
- **#8 slider deployed-but-buggy + uncommitted** — the canary social-proof slider shows thin half-width columns; rebuild + always-rotate-nav + live-verify before committing.
- **WS-4 must come BEFORE wrapper-dependent fixes** (#4b product-card fill, #7) or they get overwritten (Bean-locked sequencing, D160).
- Concurrent theme thread shares the tree — commit by explicit path.

## Next Priorities (in order)
1. **WS-1c** — complete sgs/container (A3 custom-width centring / A4 raw-px gap / A5 min-height / A6 gridItem*; A7 MOOT — `_lift_core_block_style` dead code).
2. **WS-4 (FOUNDATIONAL)** — shared wrapper mirror across ALL ~28 composites (KIND-scoped); resolve cta-section `layout` rename first → helper → section batch → layout → content; modal excluded. Design-gate + /qc-council.
3. **Then wrapper-dependent:** #4b product-card fill; #7 announcement-bar (likely auto-resolves).
4. **In parallel (wrapper-independent):** #3 text-parity (heading+label textAlign); #6 notice-banner block.json + converter synthesis + showIcon; #4a grid-lift in `_emit_wrapper_container`; **#8 slider rebuild** (fill-width + always-rotate-nav) + commit.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/src/blocks/container/{block.json,render.php,style.css,editor.css,edit.js}` | WS-1 A1 contentWidth + `__inner` (committed `2f86d9e6`) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | WS-1 A2 widthMode transfer + fold→contentWidth (committed) |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/*` | #8 slider rebuild — UNCOMMITTED (buggy WIP) |
| `.claude/plans/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md` | NEW — grounded phase plan |
| `.claude/decisions.md`, `state.md`, `parking.md`, `next-session-prompt.md`, `reports/visual-diff/container-2026-06-03.md` | D159/D160 + triage register + grounded prompt |

## Notes for Next Session
- **Run investigation+council BEFORE building** — this session's council corrected 3 of 5 guessed fixes (R-22-9 / breaking). Don't build from investigation guesses (R-22-7).
- **Measurement-vs-eye recurred twice** — my "missing images" read was wrong (images present, mis-sized) and I nearly claimed the slider verified on a page that couldn't show its nav. Extend the measurement set / use the right content before claiming verified (STOP #46).
- **Several #1-#8 are block-QUALITY gaps**, not converter bugs (heading lacks alignment; product-card bad default; slider layout) — fix the block, not a per-client patch.

---

# Session Handoff — 2026-06-03 (CLONING thread, AM) — Workstream A shipped + container/wrapper standardisation programme + full doc reconciliation

> **SUPERSEDED by the PM section above.** The two dated sections further down (2026-06-02 roster snapshot; 2026-06-03 editor-fix work D141–D147) are EARLIER work, kept for history and marked SUPERSEDED.

> Cloning thread. A parallel THEME thread is **actively committing** to the shared tree (HEAD `c468af7a` is its commit). Shared docs (decisions/parking) carry both threads' entries — commit by explicit path, verify `git log -1 --stat`. Full programme spec: `.claude/plans/2026-06-02-container-wrapper-standardisation.md`.

## Completed This Session
1. **Task 1 — 4-block save-null fix editor-/qc'd LIVE (PASS).** feature-grid/multi-button/tab/accordion-item: 0 invalid blocks, InnerBlocks children survive save→reload (Playwright on canary 144). The D150 fix is confirmed working. (Branch already squash-merged to main pre-session — drift from the prompt, caught + verified.)
2. **Task 2 — Workstream A SHIPPED + pushed (`0d746073`).** Rewrote `sync-container-wrapping-blocks.py` (DB/source-detected roster, R-22-1 clean) + `block_composition.container_kind` migration + seed-composition-roles renames trust-badges→trust-bar + inserts option-picker + 3 role flips + trust-bar/modal `containerKind:"section"`. 4-rater qc-council (Gemini 403 + Cerebras 404 down) caught the UPDATE-only silent 26/28 undercount → fixed (fail-loud + rollback). `--apply` wrote all 28, verified 0 missing/malformed.
3. **Container/wrapper system deep-analysed.** Bean reframed: no composite evades R-22-9 (my "recognised block exempt" was the cheat); composites must MIRROR sgs/container via the block_composition propagation substrate. 4-branch code analysis + 6-step target/current compare + artefact-empirical proof.
4. **The empirical smoking gun:** the fold (`absorb_skipped_child`→`fold_into_container`) deletes the `__inner` + discards max-width → it STRANDS in variation-d0-d2.css targeting a now-deleted selector; leftover-buckets names it; composites get confidence 1.0 (tier=class-section) vs containers 0.0 (deferred-no-match). featured-product 91.9%@1440.
5. **5-workstream standardisation plan written + qc-council'd (`1d846667`).** Plan + Spec 22 §FR-22-21 (canonical wrapper-conversion procedure) + flow/stages + D152 + parking. 2-rater doc-council → DOCS-COMPLETE + 2 wrong claims fixed (D1 count, FR-22-21 roster).
6. **Mockup:** removed the has-halal trust-bar 5th-column rule (Bean — added manually, later dropped).
7. **`/sgs-update` ran clean** (9 stages) — DB current with Workstream A: 190 blocks (68 sgs + 122 core), +2 attrs, 02-SGS-BLOCKS-REFERENCE regenerated, 0 orphans.
8. **Full doc-walk — ALL stale docs in `.claude/` + specs/ + plans/ reconciled** (Bean caught that the first pass only touched a handful). ~16 docs updated: root+`.claude` CLAUDE.md (active focus + framework stats + composite-mirror rule), architecture/goals/plan/dev-setup/mistakes (+13 stubs archived), specs 02/00-naming/19/21/22, + SUPERSEDED banners on the 3 stale container plans (2026-05-31-container-* + converter-content-routing-fix → status superseded).
9. **2nd qc-council on the doc set + fixes applied.** Caught the doc-walk's incomplete Spec 22 sweep — fixed ~7 stale `188`→`189` (real count) + `4 blocks (…quote)`→`28-block roster` claims + added the `container_kind` row to the §FR-22-17 schema table; corrected the converter-content-routing-fix banner (it's a CONTENT-routing plan, not width — G4 shipped as Workstream A, residual G1/G3 → WS-2).
10. **Lesson-capture endpoint FIXED.** `/api/corrections` is dead (308→`/api/learning`, urllib doesn't follow → silent fail). Fixed the handoff command (`commands/handoff.md`) + the canonical `autopilot/references/correction-capture.md` (endpoint + payload: content field is `learning`, not `summary`/`lesson`) + all 8 operational refs (autopilot/skill-optimiser/pipeline-optimiser SKILL.md, end-goal-rubric, wal-protocol, mistakes template, sgs-skillscore regex, blub-db-unlock comment). capture-lesson skill was already correct. Real lesson `no-composite-evades-universal-rule` posted (blub.db id 301).
11. **Full handoff doc set re-reconciled holistically (4-branch audit + memory + learning DB).** Bean flagged the docs read shallow and misframed the fix as class-level. Aligned every handoff-referenced doc to ONE canonical picture: the universal scope (every wrapper / every `sgs/container` / every composite with a built-in container — not section-level) now stated verbatim across next-session-prompt, plan, parking, state, Spec 22 §FR-22-21, flow/stages, CLAUDE.md. Reconciled counts (roles 21, slots 92+4, block_composition 189, blocks 68/190, block_attributes 2077); fixed retired `slot_synonyms`→`slots`/`roles` references; corrected the D1-stranded count (63→~43); added the 2 missing finer gaps (A7 `_lift_core_block_style` dead-for-containers, B5 verbatim-CSS-fallback) to plan + parking.
12. **Raw 4-branch converter gap analysis saved** as the durable depth source — `.claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md` (every gap-ID's file:line evidence; the plan has the *what*, this has the *why*).
13. **/qc-inline on the doc set caught + fixed 4 issues** the fixers missed: a wrong branch SHA (the theme thread had moved HEAD to `c468af7a`), invalid `state.md` YAML (unquoted `phase_4_status` value), and 2 residual stale counts in flow. Re-verified PASS.

## Current State
- **Branch:** `main` @ `c468af7a` (the theme thread's FR-26-D2 commit is current HEAD — theme thread co-active). This thread's commits: `0d746073` (Workstream A code) + `1d846667` (standardisation docs); the holistic doc-reconciliation/update is this session's pending commit — **commit by explicit path** (theme thread shares the tree).
- **Tests:** no suite; converter imports clean; `--apply` verified all 28 rows written.
- **Build:** n/a (no block code changed this phase — build deferred per the plan).
- **Uncommitted changes:** `lucide-icons.php` (auto-regen, never committed).

## Known Issues / Blockers
- The container/wrapper standardisation BUILD is NOT started — programme-sized, deferred to fresh sessions. WS-1 (sgs/container 3-layer) gates WS-4 (composite mirror).
- Concurrent theme thread shares the tree — coordinate commits (explicit path; check `git log -1 --stat`).
- B1 (D1 written-not-consumed) needs a Bean decision (revive vs DB-replace) before WS-2 build.

## Next Priorities (in order)
1. **WS-1 — sgs/container 3-layer completion** (the build opener): content-width attr + inner-wrapper render (A1), outer max-width transfer + kill hardcoded widthMode:full (A2), custom-width centring (A3), raw-px gap (A4), min-height (A5), gridItem* (A6). Sensitive core-block change → design-gate + /qc-council.
2. **WS-3 — de-cheat** (parallel with WS-1): hardcoded lists → DB; trust-bar static grid → attr-driven.
3. **WS-2 — converter/router truth** (after B1 decision).
4. **WS-4 — composite standardisation + auto-propagation** (after WS-1): shared PHP helper + propagation writer + /sgs-update wiring.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` | rewrite + fail-loud --apply (Workstream A) |
| `plugins/sgs-blocks/scripts/seed-composition-roles.py` | rename/insert/flip rows (Workstream A) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | container_kind migration |
| `plugins/sgs-blocks/src/blocks/{trust-bar,modal}/block.json` | containerKind:"section" |
| `.claude/plans/2026-06-02-container-wrapper-standardisation.md` | NEW — 5-workstream plan |
| `.claude/specs/22-...md` | §FR-22-21 wrapper-conversion procedure |
| `.claude/cloning-pipeline-flow.md`, `-stages.md` | procedure + gap callouts |
| `.claude/decisions.md`, `parking.md`, `memory/parking-archive.md` | D152 + parking restructure |
| `sites/mamas-munches/mockups/homepage/index.html` | removed has-halal rule |

## Notes for Next Session
- **No composite evades R-22-9** — the standardisation makes composites mirror sgs/container; never exempt a "recognised block" (new STOP #43; memory `feedback_no_composite_evades_universal_rule`).
- **Verify subagent gap-claims against code** — I relayed an extraction subagent's hero "gaps" as fact; Bean made me verify (they were a mis-modelling). Treat subagent findings as hypotheses.
- **D-number collisions on the shared decisions.md** — theme thread took D151; I used D152. Re-read before editing shared living-docs.
- The contentWidth design CORRECTED this session: inner-WRAPPER model (not cap-each-child) — children keep their own CSS incl. label left-align (the earlier label-centring worry evaporates).

---


---

> Older handoff sections (2026-06-02 roster/DB-table; 2026-06-03 editor-fixes D141–D147) moved to `memory/handoff-archive.md` (also in decisions.md + git history).
