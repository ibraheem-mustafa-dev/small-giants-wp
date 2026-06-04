---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
session_tag: small-giants-wp-2026-06-04-PM3-method2-investigated-design-council-validated-BUILD-next
generated: 2026-06-04
primary_goal: "CLONING-PIPELINE THREAD. **WS-4 composite-wrapper mirror is BLOCK-SIDE COMPLETE (D167)** — hero + product-card MIRRORED (live-verified, configurator preserved), mobile-nav EXCLUDED (containerMirror:false, like modal), content-collection REGISTERED (29th roster block), cta-section conforming; roster validates 29 (4/14/11); /sgs-update reconciled (block_attributes 2110→2739, 0 orphans). Architecture DEFINITIVELY resolved via a 4-agent doc audit: ONE unified procedure converts containers + composites IDENTICALLY (§FR-22-21), the DOCS (not the unbuilt converter code) are truth, KIND-scoped FULL mirror REQUIRED — NO per-block trim (blub.db 312). **OPEN WITH METHOD 2 — the converter investigation (Bean's plan).** The mirror does NOT fix page-clone fidelity: the converter routes mockup classes to sgs/container (conf 0.10), NOT the composite BLOCK (memory composite-mirror-is-separate-from-cloning-fidelity). Run /sgs-clone on Mama's page 144, READ the debug artefacts FIRST (leftover-buckets.json → trace.jsonl → stage-2.json/extract.json — Spec 21), diff draft-vs-clone rendered HTML via /browsing (serve the mockup on localhost), and use /dispatching-parallel-agents + /brainstorming + /qc-council to ARCHITECT the converter work as ONE coherent design: (i) routing fix (.sgs-hero→sgs/hero BLOCK before the sgs/container fallback); (ii) the converter-lift (transfer the draft's CSS onto the now-mirrored composite wrapper attrs — universal-lift-was-premature-not-falsified, lands post-WS-4, curated canonical_slot precision NOT a blind suffix fingerprint per STOP #48); (iii) #6 notice-banner content-synthesis; (iv) #4a grid-lift; (v) image sideload (#5). THEN: /sgs-update Stage-11 auto-apply upgrade (§FR-22-21.2, report-only→auto on container version-bump); the FULL doc reconciliation (spec/flow/stages mark WS-4 block-side complete + concise rewrite + correct outdated points). DON'T trim the composite mirror or cite the unbuilt converter as truth (blub.db 312). Work on main; THEME thread shares the tree (interleaving spec27 commits) — commit by explicit path, verify git log -1 --stat (STOP #41/#45)."
---

# Next Session — CLONING thread (container/wrapper standardisation programme)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**. The predecessor session (2026-06-02) deep-analysed the container/wrapper system (4-branch code review + 6-step target/current compare + artefact-empirical proof) and scoped the fix as a 5-workstream programme — do NOT re-derive it, READ the plan (`.claude/plans/2026-06-02-container-wrapper-standardisation.md`) + Spec 22 §FR-22-21 + decisions D152. Quote the STOP catalogue + the pre-flight ritual back to yourself before acting. A SEPARATE theme/blocks thread shares this working tree — see `.claude/next-session-prompt-theme.md` (do not do theme work here; coordinate commits, explicit path, check `git log -1 --stat`).

## First action (smallest, zero-dependency entry point)

1. `/autopilot` is auto-injected — let it run.
2. Read the 2026-06-04 PM opener below + the **MANDATORY READING LIST** end-to-end (not grep-skim), and quote the STOP catalogue + pre-flight ritual back to yourself.
3. Run `/sgs-clone` on Mama's page 144 (the smallest first action that grounds Method 2), then read the debug artefacts in artefact-order (leftover-buckets.json → trace.jsonl → stage-2.json/extract.json — Spec 21) BEFORE conjecturing.
4. THEN dispatch the Method-2 read-only investigation agents (Task 1 below). You ORCHESTRATE — do NOT build inline (see §ORCHESTRATION MODEL).

## ⚡⚡⚡⚡⚡ 2026-06-04 PM4 — METHOD 2 BUILD: Phase A CORE + FS-4 SHIPPED → FINISH FS-5/A5/A4/D5/fixture/gate [READ THIS FIRST — supersedes ALL openers below; the structural-defence sections (STOP catalogue, pre-flight ritual, mandatory reading list, orchestration model) further down REMAIN BINDING and carry forward]

**You are Opus = the ORCHESTRATOR (see §ORCHESTRATION MODEL below).** The Method-2 converter-lift CORE is built + live-verified. This session FINISHES the remaining 5 items.

**State recap (plain English):** The converter-lift's universal mechanism is BUILT + live-verified (D172): **A1** the DB-driven lift helper (`e9eaf013`), **A2+MF-B** composite-path lift + min-height centre-gate — hero renders `minHeight:520`, no regression (`0564d1f3`), **A3** slug-None section lift — 203 attrs, brand grid lifted (`f4fa389b`), **FS-4** sgs/media grid-child 0×0 CSS fix — 2/3 images render (`0cbe3daf`). Earlier: routing solved (hero `sgs/hero`@1.0; trust-bar fix `c3443e03`); design (D169) → qc-council → phase plan → adversarial-council → universality must-fixes (D170). **REMAINING (this session):**
1. **FS-5 image sideload (MUST)** — dry-run→real WP upload + page patch. The brand/hero/product images are currently **404** (un-uploaded mockup paths); FS-4 fixed the CSS but they stay invisible until FS-5 uploads them. Auth-complicated — use the token-gated webroot runner (memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`). This realises FS-4's payoff. Stage 4i in the orchestrator.
2. **A5** — D6/D7: testimonial `--Array` variant-class bug (trace it to a file:line first) + dropped `--send-to-ward` modifier + arbitrary-BEM-modifier className carry (FR-22-1 row 3, NOT FR-22-4.1). convert.py — SERIAL.
3. **D5** — product-card fills its grid cell: the grid-template lift already lands on the container; scope the Spec-27 `380px` cap to standalone-only (block CSS).
4. **A4** — sidecar delete (cleanup): `seed_d1_sidecar` stub + the `css-d1-assignments.json` write + dead test/comment across convert.py + sgs-clone-orchestrator.py + css_router.py. Zero visual. `seed_d1_sidecar` is already a no-op (B1 consume-inline is live via A1/A2/A3) — verified the file IS written (Cynic's "not written" claim was false).
5. **Universality fixture (MANDATORY, R-22-9)** `sites/_dogfood/converter-lift-mockups/` (value-syntax axis: units/functions/shorthands/pseudo-elements/logical-props/unsupported-prop-for-FLAG) → **QA Gate 2 + Bean R-22-13** (incl. the hero `align-items:center` hero-block-default question — pre-existing, mockup grid-stretches; a block-default decision, NOT a converter gap).

**Carried-forward findings (do NOT re-derive):** gradient is OUT of converter scope (hero/style.css default, render-layer); A2 lands on the inner composite (§FR-22-21 composite-mirror); STOP #34 + #50 caught both — always live-verify subagent work, never trust the report. FS-4+FS-5 coupled for the brand-image visible win.

### READ FIRST (the deliverables — in order)
1. **`.claude/reports/2026-06-04-method2-converter-lift-EXPLAINED.md`** — plain-English: every failing stage + what it causes, the 6 decisions, the universal solution, the A/B rule-compliance table. START HERE.
2. **`.claude/plans/2026-06-04-method2-converter-lift-PHASE-PLAN.md` — the "⚡ FINAL PLAN" section IS the build map (SUPERSEDES the step bodies below it); the "BUILD EXECUTION PLAYBOOK" sub-section gives per-step skills/commands/tools/dispatch — follow it fly-through.** ONE session (Opus orchestrator + Sonnet subagents). **Phase A (SERIAL on convert.py+db_lookup.py)** = A1 MF-A DB-driven lift map (`property_suffixes` + CSS-function passthrough + FLAG-not-drop + responsive `bp_decls`) → A2 composite path **hero-first** (MF-C: compute attrs once, pass into `emit_sgs_container_wrapping` as a param — do NOT make `db_lookup.py:2461` read CSS) → A3 slug-None lift → A4 sidecar delete → **A5 D6/D7 variant+modifier+className (ALSO convert.py → serial, NOT Phase B)**. QA Gate 1. **Phase B (PARALLEL disjoint files)** = MF-B min-height block-layer (`class-sgs-container-wrapper.php:431` gate `--has-min-height` on `verticalAlign`; min-height lifts ALWAYS when the draft sets it, verticalAlign only if the draft sets centring else top-aligned) ∥ FS-4 sgs/media grid-child CSS ∥ **FS-5 image sideload (MUST ship — real images either way; webroot-runner if auth fights)** ; then D5 product-card fill (grid container owns the lifted template, card fills its cell, 380px standalone-only) ; **synthetic universality fixture (MANDATORY — R-22-9) built LAST**. QA Gate 2 + Bean R-22-13.
3. **`.claude/plans/2026-06-04-method2-converter-lift-design.md` (D169)** — the fix-shape detail + the qc-council Stage-5 path-split verdict.
4. **`.claude/decisions.md` D170 (council outcome + must-fixes) + D169 (grounded design).**

### The universality bar (Bean-directed — DO NOT regress to a Mama's patch)
The MECHANISM must clone ANY draft / ANY block / ANY nesting / ANY CSS (the §FR-22-21 6-step procedure + the DB-driven map). "1% pixel-diff on Mama's" is necessary but NOT sufficient — the synthetic universality fixture (Step 0, built LAST) is what proves universal. Every fix is A (spec-says) or B (clean upgrade) — never a per-section/per-block conditional (R-22-9). MF-A (DB-driven map) is THE universality fix — if you find yourself hand-listing properties, STOP.

### Build discipline (per step)
`/qc-council` pre-build (STOP #50 — confirm the target CSS reaches the targeted code path on THIS canary; the trace `convert-trace-b*.jsonl` in run `mamas-munches-homepage-2026-06-04-134425` shows which path each section emits through) → Sonnet cold subagent builds (edit-only-named-files, return uncommitted, no git stash, self-test) → Opus verifies diff + live-DOM (R-22-11) → re-clone where converter-touching → commit by explicit path (theme thread shares the tree — `git log -1 --stat`, STOP #41/#45) → Bean R-22-13. Context checkpoint: if >70% before Session-A QA gate, STOP #19 + handoff.

> The "2026-06-04 PM — Method 2 investigation" opener below is now DONE (investigation complete) — do NOT re-run the investigation; BUILD the FINAL plan. The structural-defence sections (STOP catalogue, pre-flight ritual, reading list, orchestration model) below REMAIN BINDING.

## ⚡⚡⚡ 2026-06-04 PM — WS-4 BLOCK-SIDE COMPLETE → OPEN WITH METHOD 2 (the converter investigation) [DONE 2026-06-04 PM3 — investigation complete, design council-validated, BUILD is the live entry point above; kept for history. The structural-defence sections further down REMAIN BINDING]

**You are Opus = the ORCHESTRATOR (see §ORCHESTRATION MODEL below).** WS-4 is BLOCK-SIDE DONE (D167); this session investigates + architects the CONVERTER work.

**State recap (plain English):** Every composite block now mirrors `sgs/container` per its KIND — hero + product-card live-verified (product-card's `sourceMode='wc'` configurator preserved), mobile-nav EXCLUDED (`containerMirror:false`, like modal), content-collection REGISTERED (29th roster block), cta-section conforming; the 25 earlier composites already shipped. DB reconciled (29 roster, 2739 attrs, 0 orphans). Architecture is settled: ONE unified procedure converts containers + composites identically (§FR-22-21), the DOCS are truth (not the unbuilt converter code), KIND-scoped FULL mirror is required (NO per-block trim — blub.db 312). **BUT the cloned page (Mama's 144) still looks wrong** because the mirror is BLOCK-SIDE ONLY — the CONVERTER routes every mockup section to a plain `sgs/container` (conf 0.10), never to the matching composite BLOCK, and never lifts the draft's CSS onto the mirrored wrapper attrs. Method 2 grounds + architects that converter work.

### Task 1 — Method 2: investigate the converter (read-only, parallel)
**What:** Run `/sgs-clone` on Mama's page 144, then fan out read-only agents to (a) read the debug artefacts in artefact-order (leftover-buckets.json → trace.jsonl → stage-1/2.json → extract.json), (b) diff the draft vs the live clone's rendered HTML via `/browsing` (serve the mockup on localhost — `file://` blocked), (c) pinpoint every converter drop/mis-route (the `.sgs-hero`→`sgs/container` fallback; the un-lifted draft CSS) at file:line.
**Why:** Ground-truth what the converter ACTUALLY does before designing any fix (R-22-7: fix-shapes are hypotheses until measured; STOP #34 verify subagent findings).
**Orchestration:** `/sgs-clone` inline → `/dispatching-parallel-agents` (3–4 read-only Sonnet/Haiku agents, one per artefact surface + one for the draft-vs-clone DOM diff). **/qc gate after:** `/qc-council` on the findings.
**Depends on:** none. **Acceptance:** a file:line map of every converter drop/mis-route + a draft-vs-clone structural diff, council-validated.

### Task 2 — Architect the converter work (ONE coherent design)
**What:** With Task-1 ground truth, `/brainstorming` + `/qc-council` to design the converter changes as ONE coherent design (do NOT patch piecemeal): (i) routing fix (`.sgs-hero`→`sgs/hero` block BEFORE the `sgs/container` fallback); (ii) the converter-lift (draft CSS → the now-mirrored composite wrapper attrs — curated `canonical_slot` precision per STOP #48, NOT a blind suffix fingerprint; `universal-lift-was-premature-not-falsified`); (iii) #6 notice-banner `sgs/text`-child synthesis; (iv) #4a grid-lift in `_emit_wrapper_container`; (v) image sideload (#5).
**Why:** These are interconnected converter concerns; designing them together avoids the per-section-patch anti-pattern (STOP #27/#33).
**Orchestration:** inline (Opus) + `/brainstorming` + `/qc-council` (the design-gate — the council IS the gate, ≥70 certainty). **Depends on:** Task 1.
**Acceptance:** a council-validated file:line fix-shape set with falsifiable predicted outcomes per change.

### Task 3 — `/sgs-update` Stage-11 auto-apply upgrade
**What:** Upgrade Stage 11 (`sync-container-wrapping-blocks.py`) report-only → auto-`--apply` the KIND-scoped mirror to every `wraps_block='sgs/container'` composite when `sgs/container` version-bumps (§FR-22-21.2). Idempotent, operator-gated, respects `containerMirror:false`.
**Orchestration:** Sonnet subagent. **/qc gate:** yes (DB-touching). **Depends on:** none (parallel with Task 1/2). **Acceptance:** add a dummy attr to container → `/sgs-update` → all KIND-matching composites gain it; revert the dummy.

### Task 4 — Full doc reconciliation
**What:** Mark WS-4 block-side complete + the converter work scoped across Spec 22 §FR-22-21 / `cloning-pipeline-flow.md` / `-stages.md` / the standardisation plan; concise rewrite of drifted/outdated points; registry-walk.
**Orchestration:** inline or Sonnet. **/qc gate:** docscore on changed docs. **Depends on:** Task 2 (converter scope settled). **Acceptance:** flow/stages reference §FR-22-21.1/.2; no stale WS-4 "pending"/"product-card parked" claims remain.

### Dependency graph
```
/sgs-clone (inline) → Task 1 (parallel read-only agents) → /qc-council
                                                              ↓
                                              Task 2 (design, inline + council)
Task 3 (Stage-11, Sonnet — parallel)                          ↓
                                       [execute the designed converter work — likely next session]
                                                              ↓
                                              Task 4 (doc reconciliation) → /handoff
```

> The dated openers below (2026-06-04 WS-4 HERO+TAIL, 2026-06-03 PM, WS-1 detail) are PRIOR-WORK reference. **WS-4 block-side is now DONE — do NOT re-run the WS-4 fan-out.** This PM opener is the live entry point. The STOP catalogue + pre-flight ritual + mandatory reading list + orchestration model below REMAIN BINDING.

## ⚡⚡⚡ 2026-06-04 — WS-4 HERO + TAIL (SUPERSEDED by the PM opener above — WS-4 block-side complete; kept for history. Structural-defence sections further down REMAIN BINDING)

**WS-4 composite-mirror is ~90% DONE. The fan-out is COMPLETE. This session = hero (inline WITH Bean) + 2 complex blocks + 5 tail phases.**

### What's SHIPPED (25 composites + foundation — all committed + live-validated, DO NOT redo)
- **Foundation `64950efa`:** shared helper `includes/class-sgs-container-wrapper.php` (`SGS_Container_Wrapper::render($attributes,$block,$inner_html,$kind,$opts)`; opts `tag`/`block_class`/`extra_classes`/`extra_styles`/`extra_attrs`(data-*/aria)/`no_overlay`/`wrap_inner`) + byte-identical `sgs/container` refactor (proven diff=0) + `container/components/ContainerWrapperControls.js` + the propagation writer (`sync-container-wrapping-blocks.py --write-block-json`) + `/sgs-update` Stage 11 (report-only — Phase 5 makes it auto-apply). Helper later gained `extra_attrs`, `fieldset` allowed-tag, and **self-requires render-helpers.php + shape-dividers.php** (a composite requiring only the helper fataled on the gap path otherwise).
- **Section `a18e6188`/`a0297c04`:** trust-bar, cta-section. **Content `84a86b96`/`6634d2e2`:** info-box, quote, testimonial, team-member, notice-banner, accordion-item. **Layout grids `54032e86`:** card-grid, feature-grid, gallery, post-grid, pricing-table, form-field-tiles, trustpilot-reviews, google-reviews, content-collection. **Interactive `0ad389b0`:** accordion, tabs, multi-button, form, testimonial-slider (incl. the preserved #8 slider work), option-picker, form-step, tab.
- **Recipe docs `a4295130`:** Spec 22 **§FR-22-21.1** (the canonical 4-step migration recipe + KIND rules) + **§FR-22-21.2** (the Stage-11 auto-propagation design) + pipeline-flow status. READ §FR-22-21.1 — it IS the recipe.

### THE PROVEN RECIPE (element route — Bean-confirmed): a composite's OWN outer element BECOMES an sgs/container (carries `sgs-container` + the container's capabilities), keeping ONLY its unique interior. 4 steps per block: (1) render.php → `require_once .../class-sgs-container-wrapper.php`; own classes→`extra_classes`, styles→`extra_styles`, **ALL data-*/aria/view.js-queried attrs→`extra_attrs`**; interior→`$inner_html`; `echo SGS_Container_Wrapper::render($attributes,$block,$inner_html,'<KIND>',[...])`. (2) block.json → mirror KIND-scoped container attrs IF MISSING (never clobber own); bump version. (3) edit.js → import + `<ContainerWrapperControls attributes setAttributes kind="<KIND>"/>` in InspectorControls. (4) deprecated.js → NONE for additive; for renames use a render+edit `newName ?? legacyName` fallback (dynamic blocks, no save-markup deprecation). **KINDs:** content=width-only (simplest, no double-emit); layout=grid+width+gap; section=full (DOUBLE-EMIT guard + renames). **MANDATORY verify (the failure-fix):** small batches (2-3 agents, 3-4 blocks), each agent self-checks build+php-l+**undefined-var grep** (`\$wrapper_attributes|\$styles|\$classes` — php-l misses these), and **the orchestrator verifies EACH block on a live test page** (REST `POST /wp/v2/pages` NOT guard-blocked; use a `core/paragraph` child not `sgs/text`; or a token-gated webroot `do_blocks()` probe) — sgs-container present + 0 fatals — before commit. Reference blocks: trust-bar (section+data-attrs), cta-section (section+rename+double-emit), info-box (content), accordion-item (interactive content), feature-grid/gallery (layout+interactivity).

> ✅ DONE 2026-06-04 D167 — hero + product-card MIRRORED, mobile-nav EXCLUDED. This list is HISTORY; do NOT re-do. See the PM opener at the top.

### THIS SESSION'S WORK (in order)
1. **hero — INLINE WITH BEAN (the hardest, 827 lines).** Same pattern as cta-section (the proven section example): kind='section'. **Double-emit guard (C3):** hero builds its OWN overlay (`overlayColour`) + an LCP `<img fetchpriority=high>` background — keep BOTH as bespoke (overlay in `$inner_html` OR rename `overlayColour`→`backgroundOverlayColour` and let the helper own it; LCP `<img>` stays FIRST in `$inner_html` + null the helper's `backgroundImage` so no double-bg). **Rename (C4):** `overlayColour`→`backgroundOverlayColour` (+`overlayOpacity`→`backgroundOverlayOpacity`) with `?? legacy` fallback. **Split variant:** hero's `splitColumnRatio` is just the container's native `layout='grid'` + `gridTemplateColumns` — adopting the mirror REPLACES the bespoke split (pass via extra_styles or set the container layout attrs). **Bean decides** at 2 points: (a) LCP-img-stays vs moves-to-container-bg-attr; (b) split-grid-via-extra_styles vs container-layout-attrs. Keep hero's responsive `<style id=uid>` (headline/subheadline font CSS) as-is.
2. **mobile-nav** — popover/drawer shell; the earlier agent flagged it does NOT fit the helper cleanly (Popover API + complex data-*). Either content-kind width-only with extra_attrs carrying ALL the popover/drawer/data-* (careful), OR leave it manual (width applied directly) — decide with Bean. Low priority.
3. **product-card** — CONTENT kind. **COORDINATE with the THEME thread** (it owns product-card — D164 configurator; check `git log`/uncommitted state first). Likely safe now (theme committed `c903e760`/`cf252ee8`); mirror the content-scope width attrs + controls. Verify the Bound-mode configurator + Store-API still work.
4. **Phase 4 — /qc-council** on all 25+ migrated composites: gaps/weaknesses, no missed interactivity, no double-emit, controls actually appear.
5. **Phase 5 — upgrade `/sgs-update` Stage 11** (`sgs-update-v2.py` + `sync-container-wrapping-blocks.py`): detect a `sgs/container` version-bump / attr-set change since composites last mirrored, then auto `--apply` the KIND-scoped mirror to every `wraps_block='sgs/container'` composite (NOT modal/`containerMirror:false`). Spec'd in §FR-22-21.2. Idempotent; operator-gated.
6. **Phase 6 — run `/sgs-update`** (on Bean approval) — verify it propagates + the DB reconciles.
7. **Phase 7 — /systematic-debugging + /adversarial-council** — hole-poke the universal setup vs Spec 22 + the standardisation plan. **Bean's KEY finding to FIX:** the converter routes EVERY wrapper class to `sgs/container` as a fallback (stage-2 conf 0.10, all 9 sections → containers — see memory `composite-mirror-is-separate-from-cloning-fidelity`), BUT a mockup class `.sgs-hero` should be RECOGNISED + routed to the `sgs/hero` BLOCK (it exists in the DB) BEFORE defaulting to sgs/container. Have subagents poke holes in every area the universal setup missed/did-poorly vs the spec/plan. (This connects to the SEPARATE converter-lift task — `universal-lift-was-premature-not-falsified`.)
8. **Phase 8 — /handoff.**

### Memories to honour this session
`composite-mirror-is-separate-from-cloning-fidelity` (validate composites in EDITOR/test-page NOT a page re-clone — converter emits containers not composites), `universal-lift-was-premature-not-falsified` (the converter-lift is queued post-WS-4, not dead), `dont-fan-out-many-heavy-agents-at-once` (small batches + per-block verify + revert-on-half-fail), `feedback_concurrent_commit_race_shared_tree` (theme thread shares the tree — commit by explicit path, verify `git log -1 --stat`).

---

## ⚡⚡ 2026-06-03 PM — (PRIOR opener — SUPERSEDED by the 2026-06-04 section above; kept for history)

**OPEN WITH WS-4 — the composite-wrapper mirror. This is Bean's core directive and it is FOUNDATIONAL.** Replace each composite's DRIFTED built-in wrapper with an EXACT `sgs/container` mirror; then auto-propagate via `/sgs-update` whenever `sgs/container` version-bumps.

- **SCOPE = ALL ~29 composites in the `block_composition` roster, KIND-scoped — NOT just the 4 section blocks.** (Bean corrected this twice; do not collapse WS-4 to hero/cta/trust-bar/modal.) section=full surface / layout=grid+width / content=width+spacing. SECTION(3: hero, cta-section, trust-bar; **modal EXCLUDED**) + LAYOUT(~14: card-grid, feature-grid, gallery, post-grid, pricing-table, trustpilot-reviews, google-reviews, tabs, accordion, form, multi-button, testimonial-slider, form-field-tiles, **content-collection**) + CONTENT(~11: info-box, product-card, testimonial, quote, notice-banner, option-picker, team-member, mobile-nav, tab, accordion-item, form-step).
- **INPUT IS READY:** the composite-diff scanner (`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py`, extended this session, read-only) now emits per-composite **MISSING / ADDED / ALTERED** vs `sgs/container`, KIND-scoped, + an INDEX **divergence roll-up**. RUN it (`python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py`), read `pipeline-state/container-inheritance-sync/<date>/INDEX.md` FIRST. It quantifies the drift (modal 72 / cta-section 71 / trust-bar 70 / hero 68 missing; named drifts like hero's old `overlayColour`/`backgroundVideo`). **NB the scanner currently VALIDATION-FAILs on `sgs/content-collection` (29th block, not in the EXPECTED roster) — fix = add it to the layout EXPECTED set (register-not-merge, see dedup verdict below).**
- **Mechanism (D160):** (a) shared PHP wrapper class `includes/class-container-wrapper.php` — composite render.php calls it for the wrapper + keeps its OWN interior between open/close; (b) KIND-scoped block.json attr-mirror; (c) `sync-container-wrapping-blocks.py` report-only→WRITER, wired as `/sgs-update` Stage 11. **BLOCKER FIRST:** cta-section `layout`→`contentLayout` (+deprecated.js); hero `overlayColour`→`backgroundOverlayColour` (+deprecated.js); trust-bar additive (low risk). **Build order:** rename blockers → helper (container output byte-identical) → SECTION batch (trust-bar→cta→hero, the visible #1/#2) → LAYOUT batch → CONTENT batch (product-card=#4b, notice-banner=#6) → writer → proof-of-propagation gate (dummy attr on container → /sgs-update → all KIND-matching composites gain it). Sensitive multi-block build → design-gate + /qc-council + per-composite live-editor + deprecated.js verify (R-22-13). `sgs/container` the BLOCK is ALREADY a complete mirror target (has minHeight/gridItem*/contentWidth).

**DONE-but-UNCOMMITTED this session (lock in via a Gate-B visual-diff capture — the SGS visual-diff hook BLOCKS committing visual block changes without a passing `reports/visual-diff/<block>-<date>.md`):**
- #3 heading/label **text-parity** (textAlign + parity controls + label `attr()` fix; heading `:where()` guard); #8 **reviews-slider** rebuild (fill-width track + always-rotating nav + pause-in-controls — STILL needs the "verify live on the real 4-card slider THEN commit" gate); WS-1c **A3+A4** container (custom-width `margin-inline:auto` + raw-px gap helper); the **scanner** extension. Files in §Files-uncommitted at the bottom. All build-clean + diff-verified; NOT live-verified.

**DEDUP AUDIT verdict (Bean-inserted emergency audit — my own review + a 4-rater cross-model /qc-council; the council OVERTURNED 3 of my 4 merge guesses):**
- **NO block merges.** trustpilot+google-reviews, content-collection↔post-grid, process-steps+timeline, feature-grid↔card-grid all stay separate (data-model / routing `has_inner_blocks` / client-UX / domain reasons). The overlap is real but lives in the **plumbing** (duplicated WP_Query / carousel / animation / wrapper code) → fix via **shared helpers + the container-mirror (WS-4)**, NOT block merges. All 3 keep-separate pairs (info-box/notice-banner, quote/testimonial, hero/cta-section) confirmed.
- **content-collection = REGISTER (29th roster block, layout KIND), not merge.** Its only real issue is it's missing from `block_composition`.
- **#6 = notice-banner option-a:** upgrade its wrapper to mirror sgs/container, KEEP its semantic identity (role=note/alert + per-type icon/border). Not redundant with info-box.
- **Bloat is a MIRROR problem, not a merge problem:** hero's 169 attrs = 74 imageControls (shared extension) + 40 typography (hero-owned) + 23 CTA (hero-only) + only ~7 container-wrapper attrs → the mirror sheds ~7/composite; merging fixes nothing.

**⚠ CORRECTION (Bean, 2026-06-03 PM): the section below is MIS-FRAMED. The universal/generic converter-lift was NOT falsified — it was built in the WRONG ORDER.** The council's "0-delta no-op" was a SEQUENCING symptom: the lift transfers draft CSS onto the wrapper's LAYER attributes, which only exist on composites AFTER WS-4 mirrors them on. WS-4 FIRST → then the universal lift lands. The lift is REINSTATED as a post-WS-4 task (rebuild with canonical_slot precision + min-height align-gate — those are the only carry-overs). See memory `feedback_universal_lift_was_premature_not_falsified`. (The text below is retained for the build-safety HOW notes only.)

**~~⛔ GENERIC CONVERTER-LIFT was FALSIFIED by /qc-council — DO NOT rebuild as scoped (3 raters converged):~~ (disposition corrected above — premature, not falsified)**
- It targets the WRONG PATH: the only section-root min-height in the Mama's mockup is `.sgs-hero{min-height:520px}` @768px, but hero routes via the **composite-interior** path, NOT the slug-None container paths → the fix is a **0-delta no-op on the canary** (un-falsifiable here). The real bug = **hero composite-interior minHeight/minHeightTablet extraction failure** (a different, verifiable fix).
- The "generic DB-suffix fingerprint" is UNSAFE: `sgs/container`'s attr names are overloaded (`gridItemTextColour`/`backgroundOverlayColour`/`bgSvgMinHeight`/…) so a suffix match mis-maps `color`→overlay/gridItem, `max-width`→maxWidth (clobbers widthMode), `background-image`→overlayGradient (boolean). A safe "generic" lift needs `canonical_slot` precision = a CURATED map (extend `_root_lift_rules`), not a blind fingerprint.
- min-height has a render-trap: render.php's `--has-min-height` class forces `display:flex;align-items:center` → regression unless align-gated.
- **A5/A6 disposition:** A6 (per-grid-item) is the 3rd layer of the FR-22-21 wireframe → folds into WS-4 as a **lift-only, layout=grid-gated** sub-mechanism with its OWN council (the gift-section trial-card has a modifier — uniform-detection must NOT clobber it). A5 (min-height) → the curated-map extension + the separate hero-composite-interior fix.

> The dated sections below (SHIPPED 2026-06-03 AM, OPEN WITH …, WS-1 detail) are PRIOR-WORK reference, kept for history. This PM opener is the live entry point. The STOP catalogue + pre-flight ritual + mandatory reading list below remain binding — read them.

## ⚙ ORCHESTRATION MODEL — you are OPUS = the ORCHESTRATOR (read before dispatching anything)

**Your role (main inline agent, Opus):** orchestration · documentation · QC + fact-checking · supporting Bean (plain-English, non-technical explanations + decision framing + progress updates — Bean is a non-coder business owner). **Do NOT do the heavy technical building inline.** Per the Bean-locked orchestration philosophy (STOP #42): a single Sonnet subagent beats Opus-inline — faster, far more token-efficient, conserves your context so the session achieves more. **Dispatch the build; you verify, fact-check, document, and translate for Bean.**

**Dispatch rules:**
- **Disjoint work** (different files/blocks) → PARALLEL Sonnet subagents in ONE message via `/dispatching-parallel-agents`.
- **Shared-file work** (e.g. multiple edits to one `convert.py`) → SERIALISE (one agent, or sequential).
- **Implementer + spec-reviewer + quality-reviewer** pattern → `/subagent-driven-development`.
- **Cold prompts** → `/subagent-prompt` — self-contained, embed the validated fix-shape + the contract: *edit ONLY the named files · return UNCOMMITTED · NO `git stash`/`reset`/`restore`/`checkout` · run a self-test (`npm run build` / `php -l` / `python -c import`)*.
- **Model pick per task** → `/delegate` (Sonnet = build/design; Haiku = mechanical trace; Opus-inline ONLY when a Bean decision is needed mid-task or it's a trivial 1-2 tool-call change).
- **VERIFY every subagent diff + finding against ground truth before trusting it** — subagent findings are HYPOTHESES (STOP #34/#44). ⚠ The `wp-sgs-developer` agent is NOT registered in this environment → dispatch with `subagent_type: general-purpose`, `model: sonnet`.
- **`/qc-council` before EVERY converter/block/DB commit** (blub.db 255) — and as the design-gate BEFORE building any sensitive/high-blast-radius change (STOP #32). The council is the structural gate: this session it FALSIFIED the generic-lift pre-build and overturned 3 of 4 merge guesses. Trust it.

### Skills + commands — WHICH to use WHEN

| Category | Skill / command | Use it for |
|----------|-----------------|-----------|
| **First** | `/autopilot` | Auto-injected at SessionStart — live skill routing + ADHD support. |
| **Domain (WP/SGS)** | `/sgs-wp-engine` | SGS framework block dev, QA pipeline, client/site work — the umbrella SGS skill. |
| | `/wp-block-development` | block.json / attributes / supports / render.php / deprecations (the WS-4 composite + helper work). |
| | `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema enumeration BEFORE any "missing X / block can't do Y" claim (STOP #8/#26). |
| | `/sgs-db` (read) + direct `sqlite3` via `python` (writes; the CLI is NOT installed) | DB ground truth — `blocks`, `block_attributes`, `block_composition` (container_kind), `slots`, `roles`, `property_suffixes`. |
| | `/sgs-clone` | Run the 9-stage clone pipeline + `--debug-trace` for artefacts; register results via `/sgs-update`. |
| **QC (gates)** | `/qc-council` | MANDATORY before every converter/block/DB commit (blub.db 255) + as the pre-build design-gate for sensitive changes (STOP #32). Multi-rater, cross-model. |
| | `/qc-inline` | Small single-artefact end-to-end check inline (no pipeline). |
| | `/qc` | Larger end-to-end test pipeline with durable artefacts. |
| | `/verify-loop` | 2-attestation on each load-bearing claim (open the live page yourself; don't delegate the proof). |
| **Process** | `/brainstorming` | Design-gate sensitive changes BEFORE coding (pairs with `/qc-council`). |
| | `/systematic-debugging` | Root-cause from artefacts + live DOM BEFORE proposing a fix (the hero-min-height composite-interior bug needs this). |
| | `/strategic-plan` + `/phase-planner` | Break WS-4 into an executable per-step plan if it needs it. |
| | `/dispatching-parallel-agents` · `/subagent-driven-development` · `/subagent-prompt` · `/delegate` | Orchestration (see Dispatch rules above). |
| | `/gap-analysis` | Grade an output before delivery. |
| **Close** | `/handoff` | Session close — walks docs-registry, updates state/handoff/next-session-prompt, runs gates. |
| | `/capture-lesson` | Capture any new behavioural rule to all three persistence layers. |

### MCP servers + tools

| Tool | For |
|------|-----|
| **Playwright MCP** | Live-DOM verification (R-22-11) at 1440/768/375 + draft-vs-clone computed-style diff (serve the mockup on localhost — `python -m http.server 8137` from `sites/mamas-munches/`; `file://` is blocked). The visual-diff capture for Gate B runs here. |
| `/library-docs` | Up-to-date library/WP-core docs + examples (e.g. WP block render best-practice for the shared helper). |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema dump across the DBs before any "missing X" claim. |
| `build-deploy.py --target sandybrown --blocks-only --allow-dirty` | Deploy compiled blocks to the canary (no Node on server — build locally). OPcache reset after. |
| `sgs-clone-orchestrator.py` (`plugins/sgs-blocks/scripts/`) | Re-clone page 144 to see CONVERTER changes (block-only fixes only need deploy; converter fixes need a re-clone). |

### Agents to delegate to

| Agent (subagent_type) | When | Model |
|------------------------|------|-------|
| `general-purpose` | ALL heavy WP build/converter/composite work (the `wp-sgs-developer` agent is NOT registered here) | `sonnet` |
| `Explore` | Fast read-only codebase search across many files | (haiku) |
| `code-reviewer` (feature-dev) | Independent review of a built change before commit | sonnet |

### WS-4 orchestration plan (the opener) — per-task blocks

## Task 1 — WS-4 design-gate: lock the shared-wrapper mechanism
**What:** Settle the shared PHP wrapper helper signature + the KIND-scoped block.json attr-mirror rule (section=full / layout=grid+width / content=width+spacing), pressure-tested against hero (split variant), trust-bar (bound grid), cta-section (layout enum collision), modal (excluded).
**Why:** A max-blast-radius multi-block change — design must be locked + council-validated before any composite is touched (STOP #32).
**Estimated time:** ~30 min.
**Orchestration:** inline (Opus) + `/brainstorming` + `/qc-council`. Read the scanner's INDEX roll-up first (run `python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py`). **/qc gate after:** the council IS the gate.
**Depends on:** none. **Acceptance:** a locked helper signature + mirror rule that handles all 3 KINDs without per-block special-casing; council ≥70 certainty.

## Task 2 — Build the shared helper + the propagation writer
**What:** `includes/class-container-wrapper.php` (`SGS_Container_Wrapper::render(...)` → {open,close,uid}); rewrite `sync-container-wrapping-blocks.py` report-only → WRITER (mirrors KIND-scoped container attrs into each composite block.json, idempotent, dry-run default, `--apply` gated); wire `/sgs-update` Stage 11.
**Why:** single source of truth for wrapper render + auto-propagation on container version-bump.
**Estimated time:** ~45 min.
**Orchestration:** delegated → Sonnet subagent (`general-purpose`), cold prompt via `/subagent-prompt` embedding the Task-1 locked spec. Container render must stay byte-identical after extraction. **/qc gate after:** YES `/qc-council`. **Depends on:** Task 1. **Acceptance:** container renders byte-identical pre/post; dry-run writer reports the per-composite diff; `/sgs-update` runs it clean.

## Task 3 — Remodel the composites (parallel by KIND batch)
**What:** Replace each composite's drifted wrapper with the shared-helper call + mirrored block.json attrs, keeping each block's OWN interior. **ALL ~29 composites, KIND-scoped (NOT 4):** SECTION (trust-bar→cta-section→hero; modal EXCLUDED) → LAYOUT (~14 incl content-collection) → CONTENT (~11 incl product-card=#4b, notice-banner=#6). **Rename blockers FIRST:** cta-section `layout`→`contentLayout` (+deprecated.js); hero `overlayColour`→`backgroundOverlayColour` (+deprecated.js); trust-bar additive.
**Why:** Bean's core directive — fixes #1 hero, #2 trust-bar; foundational for the wrapper-dependent fixes.
**Estimated time:** ~90 min across batches.
**Orchestration:** `/subagent-driven-development` (implementer + 2 reviewers) per batch; parallel Sonnet agents per disjoint block (one block = one agent; NO shared-file edits). deprecated.js where save() changes. **/qc gate after:** YES per batch + live-editor (old post migrates, new persists). **Depends on:** Task 2. **Acceptance:** hero no longer left-half collapses; trust-bar badges = grid items; re-clone page 144 renders #1/#2 correct; per-composite live-editor clean; Bean sign-off (R-22-13).

## Task 4 — Gate B: commit this session's block fixes
**What:** Deploy + Playwright visual-diff capture for heading/label/container/slider → generate passing `reports/visual-diff/<block>-<date>.md` → commit the 3 fixes + scanner (closing the slider's verify-then-commit gate). Live-verify the real 4-card slider.
**Estimated time:** ~20 min. **Orchestration:** inline (Opus) + Playwright MCP. **/qc gate after:** the visual-diff reports ARE the gate. **Depends on:** none (parallel with Task 1). **Acceptance:** 4 passing visual-diff reports; commit lands by explicit path; slider rotates correctly live.

## Task 5 (parallel, independent) — register content-collection + the real hero min-height fix + #6
**What:** (a) add `sgs/content-collection` to the scanner's EXPECTED layout roster (register, not merge — the 29th); (b) fix the hero composite-interior `minHeight`/`minHeightTablet=520px` extraction (the real, verifiable min-height bug — `/systematic-debugging` from the run artefacts); (c) #6 notice-banner option-a (mirror sgs/container wrapper + universal converter `sgs/text`-child synthesis + showIcon-from-draft).
**Estimated time:** ~40 min. **Orchestration:** Sonnet subagents; convert.py edits SERIALISE. **/qc gate after:** YES `/qc-council` on the converter changes. **Depends on:** none (b/c parallel; #6's wrapper part depends on Task 3's content-KIND mirror). **Acceptance:** scanner validation passes (29); hero min-height live-verified @768; disclaimer text present + correct.

### Dependency graph
```
Task 4 (Gate B, inline)  ║  Task 1 (WS-4 design-gate, inline + council)
                                   ↓
                          Task 2 (helper + writer, Sonnet)  →  /qc-council
                                   ↓
                          Task 3 (composites by KIND batch, parallel Sonnet)  →  /qc-council + live-editor + Bean sign-off
                                   ↓
Task 5 (#6 wrapper part depends on Task 3 content-KIND; hero-min-height + content-collection register run anytime)
```

### Methodology guardrails (do not skip)
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset BEFORE any live test; re-clone for converter changes.
- **`/qc-council` before every converter/block/DB commit** (blub.db 255) + as the design-gate for sensitive changes (STOP #32).
- **Verify rendered output, not internal metrics** (R-22-11) — live Playwright DOM is canonical; pixel-diff informational (FR-22-18).
- **Faithful transfer, not detection hacks** (STOP #33) — fix the transfer layer / a container capability, never a per-section walker conditional.
- **No composite evades R-22-9** (STOP #43) — composites MIRROR sgs/container; never exempt a "recognised block".
- **Verify subagent sweeps + findings** against ground truth (STOP #34/#44) — they're hypotheses.
- **Work on `main`** by explicit path; theme thread shares the tree — verify `git log -1 --stat` after every commit (STOP #41/#45).
- **Outcome ≠ code shipped** — don't mark a task done until the OUTCOME lands (R-22-13 Bean sign-off on fidelity milestones).

## 📋 FULL REMAINING GAP REGISTER — the generic/universal de-cheat scope (nothing lost)

> WS-4 (above) is the FOUNDATIONAL opener, but it is NOT the whole programme. The complete 5-workstream gap register lives in `.claude/plans/2026-06-02-container-wrapper-standardisation.md` Appendix B + the depth source `.claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md`. Every item below is **DB-first (R-22-1): the point is to REPLACE the cheating/hardcoding with DB-driven, universal mechanisms** — no per-block code, no hardcoded dicts. Done ✅: A1, A2, C1 (D159); A3/A4 block-side + scanner (this session, uncommitted). MOOT: A7.

### WS-3 — DE-CHEAT (R-22-1) — this IS "replace the cheating + hardcoding in the pipeline"
- **C2** trust-bar grid is STATIC CSS + `data-columns` selectors, not attr-driven (`trust-bar/style.css:43–101`) — P-TRUSTBAR-BOUND-GRID root cause. Folds into WS-4 (trust-bar mirrors sgs/container's grid attrs).
- **C3** `_CAPABILITY_PRIORITY` hardcoded Python list (`db_lookup.py:660–701`) → a DB column. Grep must return 0 matches for the constant name after.
- **C4** TWO independent breakpoint systems (`db_lookup.py:1046–1052` + `convert.py:2322–2323`) → ONE DB breakpoint table.
- **C5** `_infer_role()` uses keyword substring-match (`css_router.py:573–588`) → query `property_suffixes.kind_override` (D99 already built that column).
- **C6** `_GLOBAL_BARE_TAGS` + `_CHROME_TOP_ELEMENTS` hardcoded frozensets (`css_router.py:54–71`) — R-22-1 violation → DB-drive OR document as a permitted constant exception (like `SKIP_TOP_LEVEL_TAGS`) with a justification comment.
- **C7** `MOCKUP_ROOT` + page-144 hardcoded to Mama's in a "universal" deploy script (`upload_and_patch.py:36,86`) → `--client`/`--page` args (de-Mama's it).
- **C8** cta-section `layout` enum collision + hero `splitColumnRatio`/`overlayColour` drift (`cta-section/block.json`, `hero/block.json`) — RESOLVED AS the WS-4 rename blockers (cta-section `layout`→`contentLayout`; hero `overlayColour`→`backgroundOverlayColour`).
- Gate: `grep -r "_CAPABILITY_PRIORITY\|BREAKPOINTS\|infer_role.*substring\|MOCKUP_ROOT\|_GLOBAL_BARE_TAGS" plugins/sgs-blocks/scripts/` returns 0 production-script matches. Mostly mechanical DB inserts + find-replace → Sonnet subagents; C5/C7 need a `/sgs-clone --debug-trace` regression check after.

### WS-2 — converter/router truth (stop dropping/degrading transferred values)
- **B1** the D1 typed-attr layer is written-not-consumed (`seed_d1_sidecar` retired no-op stub, `convert.py:167`; ~43 assignments historically stranded). **The council showed a BLIND fingerprint is unsafe → the safe path is a CURATED `canonical_slot` map (extend `_root_lift_rules`), not a blind one.** DECIDE: revive-as-curated vs DB-replace (Bean decision; present options).
- **B2** `_fold_eligible` sole-child gate (`convert.py:2830`) drops ALL fold attrs for multi-child sections, not just max-width.
- **B3** `grid-template-columns` on a recognised section → scoped CSS, not a typed attr (`convert.py:498` missing entry). (The #4a exploration touched this — carries an align-items regression risk; reconsider under WS-4.)
- **B4** D3 gap-candidates DUAL-WRITE to production CSS (`css_router.py:531`) — debug surface leaking into the production path; D3 should go ONLY to the gap register.
- **B5** verbatim-CSS-fallback: on css_router import failure ALL CSS is dumped unscoped/page-wide, operator-invisible (`css_router.py:433–437`) — must fail LOUD, never silently dump global styles.

### WS-1c residuals
- **A5** `min-height` not lifted (`convert.py:498` not in `_root_lift_rules`) → the CURATED `_root_lift_rules` extension (align-gated per STOP #49) + the separate **hero composite-interior min-height fix** (the real verifiable bug — `minHeightTablet=520px` extraction_failed, NOT a container-path gap). **A6** `gridItem*` never written (`convert.py` zero refs) → WS-4 lift-only-gated sub-mechanism (own council; gift trial-card preservation test). A7 MOOT.

### Wave 3 — image sideload (biggest pixel lever once structure is faithful)
- Wire Stage 4i media-sideload dry-run → real WP media upload + patch. Fixes triage **#5** (brand image) + hero/product images (currently 404). Independent of WS-4 — schedule anytime.

### Triage residuals map (#1–#8)
#1 hero / #2 trust-bar → WS-4. #3 → ✅ done (uncommitted). #4a grid-lift → reconsider under WS-4 (align-items risk, B3). #4b product-card fill → WS-4 content-KIND. #5 brand image → image sideload. #6 disclaimer → Task 5c. #7 announcement-bar → likely auto-resolves under WS-4 (parked till then). #8 slider → ✅ done (uncommitted, needs live verify).

## Branch + state
- **Branch:** `main` (a parallel THEME thread is co-active on this tree — now at D162; commit by explicit path, verify `git log -1 --stat`). No long-lived branch — commit fidelity work to main or a fresh SHORT-LIVED branch.
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

> ✅ WS-4 SHIPPED D166/D167 (block-side complete) — do NOT execute this; kept for history.

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
2. `.claude/handoff.md` (read the TOP 2026-06-04 PM section — WS-4 block-side complete, Method 2 next).
3. **`.claude/plans/2026-06-02-container-wrapper-standardisation.md` — the 5-workstream programme + full A1-D3 gap register + ROAM + sequencing. THE build map (the *what*).**
3a. **`.claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md` — the DEPTH SOURCE (the *why*): every gap-ID's file:line evidence from the 4-branch converter analysis. Read this so you understand the gaps deeply, not shallowly — the plan lists gap-IDs; this report proves each one.**
4. `.claude/decisions.md` newest: **D167 (WS-4 block-side complete + architecture resolved), D166 (25 composites mirrored + shared helper recipe canonical),** then D152 (Workstream A shipped + container/wrapper analysis + programme), D136 (CSS-transfer 4-gap audit), D135/D134 (variant detection), D130-D133.
5. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
6. `.claude/state.md` — current_phase + blockers.
7. `git log --oneline -14` + read the recent commit messages (each carries root-cause + verification).
8. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — **§FR-22-21 (the canonical wrapper-conversion procedure + 3-layer model + composite-mirror rule)**, §FR-22-19 (scalar-media), §FR-22-20 (variant detection), §FR-22-4/4.1 (the FOLD), §6 (R-22-1..14).
9. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
10. `.claude/cloning-pipeline-flow.md` + `-stages.md` — esp. the D0/D1/D2/D3 CSS router (the procedure + gap callouts are now here).
11. `sites/mamas-munches/mockups/homepage/index.html` — THE draft truth. Pattern: full-bleed sections (no max-width) + `__inner` wrappers (max-width:960/1040).
12. `.claude/parking.md` — P-CONTAINER-WRAPPER-STANDARDISATION (the programme), P-TRUSTBAR-BOUND-GRID, P-FR2220-VARIANT-DETECTION.
13. memory `feedback_no_composite_evades_universal_rule` (NEW — the reframe), `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`, `feedback_read_ground_truth_before_concluding`, `feedback_concurrent_commit_race_shared_tree`, `feedback_empty_section_false_pixel_diff_win`.
13a. **CRITICAL for Method 2:** memory `composite-mirror-is-separate-from-cloning-fidelity` (blub.db 312) — when you re-run `/sgs-clone`, the stage-2 converter will emit `sgs/container` (conf 0.10) across ALL sections, NOT the composite blocks. This is EXPECTED — the converter routes by BEM class to sgs/container as a fallback; it does NOT yet recognise `.sgs-hero` → `sgs/hero`. This is the PROBLEM Method 2 is diagnosing, not a WS-4 failure. Do NOT re-run WS-4 work to "fix" this. Validate composite BLOCKS in the EDITOR (fresh block on a test page), never via a page re-clone.
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
| 47 | **NEW 2026-06-03 PM. Proposing a block-roster MERGE from surface/name overlap without checking capability + routing + client-UX + architecture** | A 4-rater cross-model /qc-council OVERTURNED 3 of 4 merge guesses (reviews / content-collection↔post-grid / feature-grid↔card-grid). Surface overlap (carousel/grid/query) is almost always PLUMBING-level (duplicated WP_Query/carousel/animation/wrapper code), not block-level — fix via shared helpers + the container-mirror, NOT a block merge. `has_inner_blocks` 1-vs-0 is a HARD routing-incompatibility gate. Run my-own-review THEN a cross-model council before any merge. (Dedup audit 2026-06-03 PM; mirrors `ground-triage-with-council-before-building`.) |
| 48 | **NEW 2026-06-03 PM. Building a "generic CSS→attr transfer" via a BLIND DB-suffix fingerprint on sgs/container** | sgs/container's attr namespace is OVERLOADED — `gridItemTextColour`/`backgroundOverlayColour`/`bgSvgMinHeight`/`gridItemBackground`/`overlayOpacity`/`shapeDivider*Colour` all end in generic suffixes (Colour/Background/Height/Opacity/Shadow/Padding/Width). A suffix-endswith match mis-maps `color`→overlay/gridItem, `background-color`→gridItemBackground, `max-width`→maxWidth (clobbers the widthMode enum), `background-image`→overlayGradient (a boolean). A safe "generic" lift needs `canonical_slot` precision = a CURATED map (extend `_root_lift_rules`), NOT a blind fingerprint. (/qc-council falsification 2026-06-03 PM.) |
| 49 | **NEW 2026-06-03 PM. Lifting min-height onto a container without gating on the draft's vertical-align intent** | container render.php's `--has-min-height` class UNCONDITIONALLY forces `display:flex;flex-direction:column;align-items:center;justify-content:center` (style.css). Lifting min-height onto a section whose content is NOT meant to be centred = visible regression (content snaps to vertical-centre). Gate the lift on the draft also carrying `align-items:center`/`justify-content:center`, else route to a gap-candidate. (R2 council finding 2026-06-03 PM.) |
| 50 | **NEW 2026-06-03 PM. Building a "transfer X generically" converter fix without first confirming X appears on the TARGETED path on the canary** | The generic-lift was scoped to the slug-None container paths, but the only real min-height (hero 520px) is on the COMPOSITE-INTERIOR path — so the fix would have been a 0-delta no-op on the canary, un-falsifiable. ALWAYS establish the empirical baseline (does the target CSS reach the targeted code path on the real mockup?) BEFORE building. The council's Stage-5 empirical gate caught this. (blub.db 276; /qc-council falsification 2026-06-03 PM.) |

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
| `wp-sgs-developer` (NOT registered here — dispatch with subagent_type: general-purpose, model: sonnet) | Heavy converter/theme-CSS/fold/render.php build |
| `design-reviewer` | Visual parity draft-vs-clone after the transfer fix |

## Guardrails
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset BEFORE any pixel-diff/browser test.
- **Faithful transfer, not detection hacks** (STOP #33) — fix the transfer layer or a container capability; never a per-section walker conditional.
- **No composite evades R-22-9** (STOP #43) — composites mirror sgs/container; never exempt a "recognised block".
- **Draft-diff, not pixel-diff** for layout — serve the mockup locally, compare computed styles (STOP #35).
- **--converter-v2 required** on orchestrator runs. **WP_DEBUG_DISPLAY false** on staging.
- **/qc-council before every converter/block commit** (blub.db 255). **Verify subagent sweeps + findings** (STOP #34/#44).
- **Work on `main`** or a fresh SHORT-LIVED branch — a parallel theme thread shares the tree; re-read shared docs before editing, commit by explicit path, verify `git log -1 --stat` (STOP #41/#45). Bean visual sign-off per fidelity milestone (R-22-13).
