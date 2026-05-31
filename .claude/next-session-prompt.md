> ## ⚠ BEFORE YOU DO ANYTHING — READ THESE FIRST (mandatory) ⚠ ##
>
> 1. **Read the recent git history** to see what just shipped: `git log --oneline -15` + read the messages of `1761eb35` (the squash-merge — G1+G2+FR-22-4.1+migrations) and `334ee8fa` (methodology). The repo state IS the ground truth; the docs describe it.
> 2. **Read these docs end-to-end** (not grep-skim): root `CLAUDE.md` — esp. the **"Root-cause methodology (MANDATORY)"** section + the 14 binding rules; `.claude/handoff.md` (2026-05-31); `.claude/decisions.md` D114-D118; `.claude/specs/22-...md` §FR-22-4.1 (the canonical container rule you implement) + §0/§FR-22-2/§FR-22-4 + §6 binding rules; `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` (the log/artefact map — read BEFORE conjecturing); `.claude/cloning-pipeline-flow.md` + `-stages.md`; `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`; `.claude/parking.md` (P-FR226-FIDELITY-AND-MERGE).
> 3. **Apply the root-cause methodology to ALL work this session** (it is now core, in CLAUDE.md): never assume / never reason from probability / never trust a claim or pixel-diff unverified. Dig to the root cause from ALL the logs+debug data; classify implementation-bug vs spec/plan-gap; verify EVERY dependency the theory rests on (DB table data via /sgs-db + /wp-blocks, the block's actual functionality e.g. sgs/container's grid engine, the pipeline spec's intent, the truth-spec for ALL relevant instances, and whether the pixel-diff is MISLEADING vs the live DOM); attest with ≥2 independent evidence sources (/verify-loop); roll back fast on regression (STOP #19). Tools: /systematic-debugging, /qc-council (multi-rater from the FULL logs+code), /verify-loop, /diagnostics, /lint, /subagent-driven-development, /dispatching-parallel-agents, /brainstorming, /library-docs, /wp-blocks, /sgs-db, /sgs-wp-engine, /sgs-clone, code-reviewer + wp-sgs-developer agents.
>
> ---------------------------------------------------------------------------
>
> ## 2026-06-01 (session close) UPDATE — READ FIRST (content+layout SHIPPED to main; next = FR-22-4.1 impl + fidelity) ##
>
> **SHIPPED to main (squash-merge `1761eb35`):** the pipeline now RENDERS content AND side-by-side card layout (live-DOM verified). The branch was merged + deleted. NEW TOP PRIORITY: **implement FR-22-4.1 fully** (Spec 22 §FR-22-4.1 — the canonical container rule): replace the depth-2 gate + `walk_passthrough` drop + `_absorb_transparent_wrappers` patchwork with the ONE coherent mechanism — direct descendants FOLD (grid→grid-item CSS), block-match→block, non-direct wrapper→own `sgs/container`, NEVER dropped, per-item CSS folding. The depth-2 gate is the WORKING INTERIM; don't re-derive the rule — it's written. Then the fidelity levers: **image sideload** (Stage 4i is dry-run → no product images; biggest pixel lever) + **migrate `sgs/info-box`** FR-22-6 hybrid (gift content sparse) → pixel-acceptance. NB blub.db dashboard is DOWN — restart it + re-POST this session's lessons (`~/.openclaw/workspace/memory/learning/2026-05-31-root-cause-methodology-and-false-pixel-diff.md`).
>
> ---------------------------------------------------------------------------
>
> ## 2026-06-01 (pm) UPDATE (G1+G2 SHIPPED — retained) ##
>
> **The converter content-routing fix LANDED (D117). The pipeline now RENDERS content AND side-by-side card layout — live-DOM verified.** G1 = leaf content-routing + the `attr_type` fallback-bug fix (all 7 sections render). G2 = FR-23-6 depth-2 grid-wrapper preservation (council-designed, trace-confirmed: featured-product + gift cards side-by-side, duplicate nesting fixed, mean −0.66pp).
>
> **NEW TOP PRIORITY: reach pixel-acceptance on the branch, then merge to main.** The branch renders CORRECTLY but isn't pixel-acceptance-passing (sections 60–83%). Levers, in order (P-FR226-FIDELITY-AND-MERGE): (1) **real image sideload** — Stage 4i is dry-run so NO product images render (likely the biggest pixel lever); (2) **migrate `sgs/info-box` FR-22-6 hybrid** — gift-section card content renders sparse (same pattern as product-card); (3) exact styling; (4) generate visual-diff reports for product-card/testimonial/testimonial-slider → **merge branch→main**.
>
> **NEW STOP entry #24:** Trusting a per-section pixel-diff change without live-DOM check works BOTH ways — an EMPTY section scores a false WIN, and a REFLOWED-to-correct section (cards side-by-side) scores a false LOSS. Pixel-diff mis-scores exactly the structural changes that matter. Verify Playwright `textLen` + element layout. (Extends STOP #20.)
>
> **Bean directives (parked):** P-UNIFY-CONTAINER-ABSORPTION (unify `_absorb_transparent_wrappers` merge-side + walker preserve-side into ONE structural rule); duplicate-nesting now fixed by the depth-2 gate. The FR-23-6 depth-2 gate is council-designed + trace-confirmed — DON'T re-litigate it.
>
> Everything below (the original 2026-06-01 + 2026-05-31 addenda + the full STOP catalogue / ritual / tiered reading) is PRESERVED per D101.
>
> ---------------------------------------------------------------------------
>
> ## 2026-06-01 ADDENDUM (G1-G4 framing — now largely SHIPPED via D117; retained) ##
>
> **TOP PRIORITY: the converter content-routing fix. THE plan is `.claude/plans/2026-05-31-converter-content-routing-fix.md` (G1-G4). Read it + D115 first.** The old "Tasks 1-5" further down are HISTORICAL (XS-3 is done — merged).
>
> **What happened 2026-05-31 (see `.claude/handoff.md`):** XS-3 reconciled + merged (D114, main `eeac99a1`) — the branch was a SUPERSET of main's XS-3, not a rival. The REAL blocker found (D115): featured-product + social-proof render EMPTY because the walker never runs the FR-22-2 content-routing layer — `sgs-product-card__body` mis-resolves to the `sgs/text` LEAF (slots table lists `body/intro/description` as `text` aliases) → leaf swallows children; leaf text never reaches the scalar `text` attr. Fix is CONVERTER-side (1-2 files), NOT a 61-block migration; leaf blocks STAY leaves (R-22-14). Container migrations (product-card/testimonial/testimonial-slider → echo $content) committed WIP on `feat/fr22-6-content-render` (c9c6544d) — correct but render empty until the converter fix. Spec 24 (query-driven cards) + sgs_product CPT drafted/built (D116). Work resumes on the branch; merge to main after the fix + passing visual diff + /qc-council.
>
> **NEW STOP entries (append to the catalogue below — count must only GROW):**
> | 20 | Trusting a per-section pixel-diff WIN without checking live DOM textLen | An EMPTY section scores a FALSE win on cropped pixel-diff (empty=shorter crop=more matching background). 2026-05-31: featured-product "−30.9pp" was an artefact; live textLen=0. Verify `el.innerText.trim().length` + element counts via Playwright (R-22-11) before believing any per-section drop. See memory `empty-section-false-pixel-diff-win`. |
> | 21 | Assuming the walker runs FR-22-2 content-routing | It does NOT — `convert.py` resolves nodes + recurses but never calls `equivalent_block_for()`/`array_item_slot_for()`/`lift_behavioural_attrs()`. That missing wiring is the root cause of leaf-content loss. |
> | 22 | Treating XS-3 as "done/closed" or expecting it to catch container mis-routing | XS-3's guard only fires on slug=None; it MISSES a wrapper that mis-resolves to a LEAF. It must be EXTENDED (fire when composition_role=='leaf' AND node has element children). |
> | 23 | Routing pack-size pills / option-pickers to `sgs/label` | `sgs/label` is an eyebrow/caption block. Pills are interactive selectors → `sgs/button` (via canonical_slot, not a hardcoded map). |
>
> **NEW pre-flight ritual addition (append as Q8):** Q8 — Before believing a measurement improvement, did I verify the LIVE DOM (textLen + expected elements via Playwright), not just the pixel-diff number? (STOP #20.)
>
> Full prior 2026-05-31 reconciliation context retained immediately below for traceability.
>
> ---------------------------------------------------------------------------
>
> ## 2026-05-31 ADDENDUM (superseded by the 2026-06-01 addendum above; retained) ##
>
> Two competing XS-3 implementations to RECONCILE: main `0a212e3c` = composition_role predicate (original Task 1); branch `feat/spec23-container-neutral-walker` `eced119b` = display:grid/flex `_is_layout_bearing_wrapper` (Spec 23 A1) + B2/B3 neutral-default container. Measure each on page 144, decide.
> social-proof +18.6 root cause (qc-council verified, NOT A1): `sgs/testimonial-slider` un-migrated FR-22-6 hybrid — render.php reads `$attributes['testimonials']` array but converter emits InnerBlocks → testimonials never render (pre-existing). Real fix = migrate the slider. featured-product −15.6pp (branch A1 grid-restoration WIN, reproduced). Header/footer PARKED.
> NEW lesson (operational guard): `feedback_read_ground_truth_before_concluding.md` — verify EVERY diagnostic claim (yours or a subagent's) against real markup/render.php/`wp-blocks schema`/computed-CSS before concluding OR acting. Never grep-skim / reason from probability / assume block structure. Distinguish debug-attr artefacts from rendered output. Subagent conclusions are HYPOTHESES.
> Full session detail: `.claude/handoff.md` (2026-05-31).
>
> ---------------------------------------------------------------------------
>
---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-31-xs3-refined-walker-plus-d6-retune-plus-deploy
generated: 2026-05-30
parent_session: small-giants-wp-2026-05-30-d107-d113-architectural-batch
primary_goal: "Re-enable XS-3 walker condition with refined trigger (immediate child of section-root only, not arbitrary nesting), broaden D6 sync-container-wrapping-blocks.py threshold from 4 → 20-30 blocks per Bean's container-wrapping roster, build+deploy D107-D113 source changes to live canary, grow XS-4 vocabulary toward 50% canonical_slot coverage, then /qc-council retrospective consistency check across the new docs."
---

# Next Session — Refined XS-3 Walker + D6 Threshold Re-Tune + Deploy + Vocab Growth

> ## ⚠ READ THIS BEFORE ANYTHING ELSE ⚠
>
> Last session (2026-05-30 D107-D113 batch) shipped 14 commits taking pixel-diff from 58.6% → 56.40% (-2.20pp aggregate). The big architectural moves landed: voter tier-driven recognition (D107), block_composition table data layer (D108), assign-canonical D99 port (D110), section-scope row retirement (D111), inheritance script (D112). HOWEVER: XS-3 walker code attempted but **REVERTED at c76aa107** after +13.07pp regression on featured-product + +10.40pp on social-proof — code rolled back but the `block_composition` table (188 rows) data layer remains LIVE and valid. D6 sync-container-wrapping-blocks.py only flagged 4 blocks vs Bean's expected 20-30+ — threshold too tight. ALSO: docs applier was over-conservative the first pass — treated the walker revert as if it reverted XS-2/4/5/6/D6 also, costing 51 deferred spec edits that should have shipped. The structural defences below are operational guards, not advisory notes. Read them; quote them back to yourself before any action.
>
> **Captured lesson:** `feedback_lessons_must_be_operationally_surfaced_not_just_archived.md` — captured lessons that aren't operationally surfaced at session start get violated again. Per-session anti-pattern STOP catalogue + pre-flight self-attestation ritual at the TOP of every next-session-prompt is the structural defence.

## Architectural primitive — quote this verbatim before any fix-shape proposal

Per Spec 22 §0 (canonical, plain English): **"Read each div's BEM class, look up which SGS block it equates to in the database, emit that block, recurse into its children. Three precisely-enumerated exceptions are permitted (atomic-tag swap, top-level chrome skip, top-level container wrap — see FR-22-3). No others. Same code for sgs/hero, sgs/product-card, sgs/quote, sgs/text, sgs/media, every BEM-class div in any mockup."**

Per R-22-9 (Bean P1 locked): **"Universal mechanisms, no per-block hyperfocus."**

Per R-22-14 (Bean P1 locked D92): **"FR-22-6 migrations never carry server-side legacy fallback hacks."**

Per blub.db 260 + R-22-1: **"DB-first, no hardcoded dicts."** (Exception per Subagent C/E: convention-ordering lists like `_BREAKPOINT_RULES` + `_CAPABILITY_PRIORITY` are runtime config not data; legitimately stay as Python constants. Static spec facts like `_ROLE_CLASSIFICATION_MAP` belong in proper DB tables — D99.)

## Anti-pattern STOP catalogue — if you find yourself doing X, STOP

| # | If you find yourself proposing | STOP — because |
|---|---|---|
| 1 | Grep-skimming Spec 22 instead of reading sections end-to-end | Last session's #1 failure mode. Spec 22 §FR-22-2 / 2.1 / 2.2 / 2.5 is the cornerstone that defines `equivalent_block_for()`. Missing it = recommending features that already exist. READ FULLY, not grep. |
| 2 | Referencing `slot_synonyms` or `legacy_role_lookup` as live tables | Both DROPPED 2026-05-29 D99. Live equivalent: `slots` table with composite PK `(slot_name, scope)`. 92 element + 4 section = 96 rows post-XS-5 (section count REDUCED 16→4 per D111). Walker queries `slots WHERE scope='element'`. |
| 3 | Referencing `slot_synonyms.role_classification` column | Retired D99. Live equivalent: `roles` table (20 rows). Walker queries `roles WHERE classification='content-bearing'`. |
| 4 | Treating `.claude/skills/sgs-wp-engine/sgs-framework.db` and `.agents/skills/sgs-wp-engine/sgs-framework.db` as two DBs | They share inode via NTFS junction = SAME PHYSICAL FILE. Prior "mirror-DB divergence" framing was structurally impossible. Real two DBs are sgs-framework.db + ui-ux-pro-max.db (different physical files). See `feedback_dbs_are_junction_not_mirror.md`. |
| 5 | Building a new bespoke SGS block per mockup section (`sgs/gift-section` etc.) | R-22-9 violation. Framework stays ~67 reusable primitives. Mockup-section variation comes via `slots WHERE scope='element'` rows + walker container default (FR-22-4), not new code. |
| 6 | Adding `if (empty($content) && !empty($legacy_attr)) { ...scalar render... }` to a migrated render.php | R-22-14 violation. FR-22-6 hybrid problem is exclusively SGS framework debt. Canonical backwards-compat = full roster migration + WP-CLI batch existing-post migration script. |
| 7 | Batching multiple DB row changes then measuring once | `row-by-row-measurement-gate-per-db-change` lesson. Ship one row + /sgs-clone Stage 11 measurement between each. |
| 8 | Routing a section-root BEM class (e.g. `social-proof`) to a content-block primitive (e.g. `sgs/testimonial-slider`) | `section-root-aliases-target-sgs-container-only` lesson. Section roots → `sgs/container` (or walker's FR-22-4 default). |
| 9 | Proposing a fix shape without reading the relevant Spec section + flow + stages + plan end-to-end | `read-full-spec-before-proposing-architectural-fix-shape` lesson. State the architectural primitive in plain English FIRST. |
| 10 | Acting on a load-bearing claim in a doc/handoff without grep-verifying against the codebase | `grep-verify-handoff-diagnostic-premises` + `grep-verify-spec-claims-finds-drift` lessons. 60s `find`/`grep`/`ls` BEFORE acting. |
| 11 | Using `sgs-db.py sql` for INSERT/UPDATE/DELETE | The wrapper is read-only — DELETE silently no-ops. Use direct `sqlite3` Python calls for writes. (Caught last session via Subagent 1 svg-merge.) |
| 12 | Shipping a fix-shape without first tracing the EXACT EMISSION PATH of the canary instance for that defect | XS-9.1 redundancy lesson 2026-05-30: subagent diagnosed hero `<br>` correctly but proposed extending sgs/heading rich-text — when Mama's hero H1 actually routes via core/heading (already covered by XS-9). Net result: zero canary impact. Before predicting impact, trace which slug RECEIVES the affected attr in the current pipeline, not which slug COULD receive it. |
| 13 | Treating the literal-slug-match path at `per-section-convention-voter.py:295-305` as live | RETIRED 2026-05-30 D107. The voter now queries `blocks WHERE tier='class-section'` for section-root candidates. Section-roots are declared via `supports.sgs.is_section_root: true` in block.json (current roster: sgs/hero, sgs/cta-section). Adding a new section-root WITHOUT flagging block.json = voter won't recognise it. |
| 14 | Re-enabling the XS-3 walker condition (commit f173b351) before refining the trigger | Walker code REVERTED at c76aa107 after +13.07pp regression on featured-product + +10.40pp on social-proof. `block_composition` table (188 rows) persists and is valid; only the walker consumption was rolled back. See P-XS-3-TRIGGER-REFINEMENT before re-enabling. |
| 15 | Batching multiple `block_composition` row changes or DB-row corrections then measuring once at the end | D113 methodology rule (sibling of blub.db 287). Ship ONE row at a time with /sgs-clone Stage 11 between each. XS-4 batched 600+ rows produced uninterpretable aggregate delta; future XS-4-shaped work splits per-block. |
| 16 | Hardcoding `__products`, `__cards`, or any generic BEM slot name to a specific block slug in Python | R-22-1 + R-22-9 violation. Future `sgs/products` block could conflict. Route via `block_composition` shape filter once the refined trigger lands; until then, fall through to `sgs/container` (FR-22-4 default). |
| 17 | Treating "code reverted" as "all related architectural updates deferred" when applying docs after a multi-task batch | Docs-applier over-conservatism lesson 2026-05-30: first applier pass treated XS-3 walker revert as if it reverted XS-2/4/5/6/D6 too — deferred 51 spec edits that should have shipped because the DB-layer / table / data-pipeline architecture WAS live. Before deferring any spec edit citing "revert", explicitly distinguish: (a) code reverted, (b) DB rows persisted, (c) related shipped tasks unaffected. Map the revert blast radius before, not after. |
| 18 | Accepting a subagent threshold-tuning result without sanity-checking against architectural intuition | D6 lesson 2026-05-30: sync-container-wrapping-blocks.py heuristic returned only 4 blocks; Bean's intent was 20-30+. If the count is wildly off from architectural intuition, the threshold is wrong — broaden it BEFORE accepting the artefact. Confirm count matches the expected roster (named candidates list in the cold prompt) before letting the row data into downstream consumers. |
| 19 | Iterating inline on a failing fix under context pressure when measurement already shows regression | XS-3 lesson 2026-05-30: walker showed +13.07pp regression on first /sgs-clone measurement. Correct action = git revert immediately, preserve work in history, re-tune in next session with empirical evidence baked into the cold prompt. Wrong action = keep iterating the predicate logic inline. Roll back fast on regression; refine empirically across a session boundary, not inline. |

## Pre-flight self-attestation ritual — answer ALL SEVEN inline before any agent dispatch or fix-shape proposal

Before dispatching any subagent OR proposing any fix shape, write these out in your response:

1. **What's the architectural primitive in plain English?** (Quote Spec 22 §0 above or rephrase.)
2. **Which binding rule(s) (R-22-N) govern this fix shape?** Name them explicitly.
3. **Which captured lessons (feedback_*) apply?** List by filename + cite the load-bearing claim.
4. **What's the proposed fix shape, in 1-3 sentences?**
5. **Does it match ANY entry in the Anti-pattern STOP catalogue above?** If yes, the fix shape is wrong; re-anchor on the primitive.
6. **What's the EXACT emission path of the canary instance for this defect?** Trace which slug RECEIVES the affected attr in the current pipeline (grep extract.json for the canary section's block_markup). If the path your fix touches is NOT the path the canary actually uses, the predicted impact is ZERO regardless of architectural correctness. (XS-9.1 lesson 2026-05-30: subagent extended sgs/heading rich-text when Mama's hero H1 actually routes via core/heading — already covered by XS-9. Fix was correct + zero canary impact.)
7. **What's the SHIPPED vs DEFERRED breakdown of this fix?** Be explicit about which parts of a multi-task implementation are LIVE in production vs queued for next session — docs MUST reflect that breakdown, not collapse "something deferred" into "everything deferred". (D107-D113 docs-applier lesson 2026-05-30: first pass treated XS-3 walker revert as if it reverted XS-2/4/5/6/D6 also; cost 51 deferred spec edits. Map the revert blast radius before, not after.)

Skipping this ritual is what caused 5+ prior sessions of repeat-failure (per the meta-lesson `feedback_lessons_must_be_operationally_surfaced_not_just_archived`).

---

## TL;DR

Last session shipped 14 commits taking Mama's Munches pixel-diff from 58.6% → 56.40% (-2.20pp aggregate). The architectural moves — voter tier-driven recognition (D107), block_composition table (D108 data layer), assign-canonical D99 port (D110), section-scope row retirement (D111), inheritance script (D112) — all LIVE in DB and code. XS-3 walker code was attempted but reverted at c76aa107 after measurable regression; refined trigger queued. D6 threshold-tuning under-flagged (4 vs 20-30 expected); re-tune queued. Source changes D107-D113 not yet deployed to canary (block.json supports flags, button render.php tighten, product-card featured variant). This session: refined XS-3 walker (HIGHEST PRIORITY), broaden D6 threshold, build+deploy, grow XS-4 vocabulary, /qc-council session-close consistency.

## MANDATORY reading (READ FULLY, not grep — last session's failure mode)

**Tier 1 — session context (read first):**

1. This file (you are reading it)
2. `.claude/handoff.md` — full last-session context with Known Issues list (Known Issues #1-#8)
3. `.claude/state.md` — current_phase + db_state_post_d99 block + blockers list
4. `.claude/decisions.md` D93-D100 entries — **read EACH ENTRY end-to-end, not just the D# headers.** D99 in particular contains the full slots/roles migration narrative.
5. `.claude/decisions.md` D107-D113 entries (THIS SESSION'S BATCH) — **read EACH ENTRY end-to-end.** D107 voter tier wiring + D108 block_composition table + D110 D99 port + D111 section-scope retirement + D112 inheritance script + D113 row-by-row methodology.
6. Last session's commits in `git log --oneline 8eaba520..HEAD` — 14 commits shipped 2026-05-30; read each commit message for the empirical pre/post delta.

**Tier 2 — Spec 22 sections (READ FULLY; grep-skimming is the failure mode from last session):**

7. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — read §0 (Purpose) + §2 (Architecture diagram) end-to-end. THEN read §FR-22-2 through §FR-22-2.5 END-TO-END (these define `equivalent_block_for()` — the cornerstone). THEN read §FR-22-15 (capability tiebreaker, D96). THEN read §4 (Data layer — post-D99 + post-D107-D113 table inventory). THEN read §6 (Binding rules R-22-1 through R-22-14). DO NOT just grep keywords.
8. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — read END-TO-END. Mandatory before conjecturing about any pipeline output gap. Last session never opened this.

**Tier 3 — pipeline reference docs (read fully — these explain HOW the code works):**

9. `.claude/cloning-pipeline-flow.md` — overview + cross-cutting principles. Note the D99 + D107-D113 architectural-batch summary boxes.
10. `.claude/cloning-pipeline-stages.md` — per-stage detail (DB tables touched, scripts run, skills dispatched per stage). Read the stages relevant to today's tasks (Stage 4/5/6/9/10/11 for /sgs-clone measurement; Stage 1 + Stage 10 for /sgs-update tasks).

**Tier 4 — block + DB reference (read on-demand per task):**

11. `.claude/specs/02-SGS-BLOCKS.md` — block-by-block reference. Read sgs/media + sgs/container + sgs/trust-badges sections (touched by D93-D100). Also Section 18 (svg-bg RETIRED) + Section 15 (cert-bar RETIRED) for retirement notice patterns. New post-D107: sgs/hero + sgs/cta-section section-root flag.
12. `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` — auto-generated per-block attribute reference (regenerated by /sgs-update Stage 7). Use as ground-truth for what attrs/supports each block currently has.

**Tier 5 — captured lessons (memory, READ FULLY):**

13. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dbs_are_junction_not_mirror.md` — CORRECTED 2026-05-29: mirror-DB divergence was structurally impossible; real two DBs are sgs-framework + ui-ux-pro-max
14. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_lessons_must_be_operationally_surfaced_not_just_archived.md` — META-LESSON; explains why the anti-pattern STOP catalogue above MUST be at the top of next-session-prompts
15. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_rows_via_sgs_update_not_direct_seed.md` — slot-row addition flow (now seed-slot-synonyms.py is broken post-D99; relevant to Task 2)
16. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_section_root_aliases_target_sgs_container_only.md` — section-roots route to sgs/container (relevant to Task 4 row corrections)
17. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks.md` — R-22-14 binding rule
18. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_grep_verify_handoff_diagnostic_premises.md` — grep-verify claims before acting
19. `feedback_row_by_row_measurement_gate_per_db_change.md` (project memory) — D113 methodology rule, sibling of blub.db 287
20. `feedback_qc_council_cross_family_triangulation_finds_bugs.md` (project memory) — /qc-council 4-rater multi-model gate caught 5 real bugs in Phase 1.4

**Tier 6 — task-specific code reads (per-task):**

For Task 1 (refined XS-3 walker):
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — locate the reverted XS-3 walker block (search for git log around c76aa107 + f173b351 for the predicate that fired too broadly)
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` — `block_composition` table query helpers; refined trigger reads `composition_role` + `wraps_block`
- `block_composition` table 188 rows — query first: `SELECT block_slug, wraps_block, composition_role, has_inner_blocks FROM block_composition`

For Task 2 (D6 threshold re-tune):
- `plugins/sgs-blocks/scripts/uimax-tools/sync-container-wrapping-blocks.py` — current heuristic flagged only 4 blocks; needs broadening
- Bean's expected roster (NAMED in cold prompt): feature-grid, info-box, form, announcement-bar, mega-menu, timeline, process-steps, product-card, icon-list, notice-banner, pricing-table, brand-strip, card-grid, accordion, tabs, post-grid, mobile-nav, table-of-contents, team-member, testimonial, testimonial-slider, trust-badges, google-reviews, trustpilot-reviews

For Task 3 (build + deploy D107-D113):
- `plugins/sgs-blocks/scripts/build-deploy.py` — the D3 single-command script shipped this session (commit a23ff53f)
- `plugins/sgs-blocks/src/blocks/*/block.json` files modified for `supports.sgs.is_section_root` — verify via `git diff 8eaba520..HEAD -- 'plugins/sgs-blocks/src/blocks/*/block.json'`
- `plugins/sgs-blocks/src/blocks/button/render.php` — wp_kses tightening
- `plugins/sgs-blocks/src/blocks/product-card/render.php` — featured variant render

For Task 4 (XS-4 vocab growth):
- `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` — runs Tier A/B/C/D classifier; re-run after vocab seed
- `slots` table 96 rows (92 element + 4 section) — query first: `SELECT slot_name, aliases FROM slots WHERE scope='element' ORDER BY slot_name`

## DB exploration pre-flight (not just count verification)

Last session demonstrated that querying tables ONCE without exploring values misses architecture. Do these exploration queries BEFORE any task:

```bash
# blocks table tier column (NEW D107) — confirm class-section blocks flagged
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT slug, tier FROM blocks WHERE tier IS NOT NULL ORDER BY tier, slug"

# block_composition table (NEW D108) — 188 rows; wraps_block populated for 4 blocks (D6 under-tuned)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, wraps_block, composition_role, has_inner_blocks FROM block_composition WHERE wraps_block IS NOT NULL ORDER BY block_slug"

# composition_role distribution — how blocks divide section-root / wrapper-shell / content-block / leaf
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT composition_role, COUNT(*) AS n FROM block_composition GROUP BY composition_role ORDER BY n DESC"

# slots table post-XS-5 — 92 element + 4 section = 96 rows (section count reduced 16→4 per D111)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT scope, COUNT(*) AS n FROM slots GROUP BY scope"

# Inner element row (XS-5 added) — passthrough slot
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT slot_name, scope, aliases, standalone_block FROM slots WHERE slot_name='inner'"

# canonical_slot coverage on block_attributes (XS-4 backfill: 33.4%)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT COUNT(*) AS total, SUM(CASE WHEN canonical_slot IS NOT NULL THEN 1 ELSE 0 END) AS with_slot, ROUND(100.0 * SUM(CASE WHEN canonical_slot IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct FROM block_attributes"

# role coverage (parallel to canonical_slot)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT COUNT(*) AS total, SUM(CASE WHEN role IS NOT NULL THEN 1 ELSE 0 END) AS with_role, ROUND(100.0 * SUM(CASE WHEN role IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct FROM block_attributes"

# Verify retired tables are STILL gone
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('slot_synonyms','legacy_role_lookup','slots','roles','block_composition','blocks')"
```

Expected output checkpoints:
- `blocks.tier`: at least sgs/hero + sgs/cta-section flagged as `class-section`
- `block_composition.wraps_block`: only 4 rows populated (D6 under-tuned — Task 2 broadens this)
- `composition_role` distribution: section-root / wrapper-shell / content-block / leaf populated across 188 rows
- `slots`: 92 element + 4 section = 96 rows
- `slots WHERE slot_name='inner'`: 1 row (XS-5 passthrough)
- `canonical_slot` coverage: ~33.4%
- `role` coverage: ~33.2%
- `sqlite_master`: returns `slots`, `roles`, `block_composition`, `blocks` (NOT `slot_synonyms` or `legacy_role_lookup`)

If any of these checks fails, something regressed since last session — investigate before proceeding to tasks.

## First action (under 5 min — ADHD Rule 2)

After reading Tier 1 + skimming Tier 2 headers + running the DB exploration above, run this single command to verify the post-D107-D113 state intact:

```bash
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT 'slots-element' AS what, COUNT(*) AS n FROM slots WHERE scope='element' UNION ALL SELECT 'slots-section', COUNT(*) FROM slots WHERE scope='section' UNION ALL SELECT 'roles', COUNT(*) FROM roles UNION ALL SELECT 'kind_override', COUNT(*) FROM property_suffixes WHERE kind_override IS NOT NULL UNION ALL SELECT 'block_composition', COUNT(*) FROM block_composition UNION ALL SELECT 'block_composition.wraps_block', COUNT(*) FROM block_composition WHERE wraps_block IS NOT NULL UNION ALL SELECT 'blocks.tier', COUNT(*) FROM blocks WHERE tier IS NOT NULL"
```

Expected:
- slots-element: 92
- slots-section: 4 (NOT 16 — reduced per D111)
- roles: 20
- kind_override: 17
- block_composition: 188
- block_composition.wraps_block: 4 (Task 2 broadens this)
- blocks.tier: 2 (sgs/hero + sgs/cta-section)

If any count is off, something regressed since the 2026-05-30 close — investigate before proceeding.

## Tasks (in priority order)

### Task 1 — Refined XS-3 walker condition (HIGHEST PRIORITY — biggest predicted pixel-diff lever)

**Why:** The XS-3 walker attempt last session was reverted at c76aa107 after +13.07pp regression on featured-product + +10.40pp on social-proof. The `block_composition` table (188 rows) data layer remains LIVE — only the walker consumption was rolled back. The refined trigger fires only when (a) the wrapper is IMMEDIATE child of a class-section block OR sgs/container, AND (b) it has CSS rules + element-children + no slot match. Skip arbitrary nested wrappers.

**Per pre-flight ritual (write out before dispatch):**
- Primitive: walker reads BEM class → slots lookup → emit block (Spec 22 §0); refined XS-3 adds container fallback for IMMEDIATE wrapper children of section-roots only
- Binding rules: R-22-3 (3 permitted exceptions; XS-3 is the top-level container wrap exception narrowed to immediate-child predicate), R-22-9 (universal mechanism — uses block_composition data not per-block code), R-22-4 (pixel-diff gates commit), R-22-11 (verify rendered output)
- Lessons: feedback_universal_extraction_no_per_block_legacy + feedback_council_predictions_need_empirical_validation + STOP #14 (refine before re-enabling) + STOP #19 (roll back fast on regression)
- Fix shape: re-enable XS-3 walker condition in convert.py, BUT predicate gates on `parent.composition_role IN ('section-root',) OR parent.slug='sgs/container'` AND `current_node has CSS rules` AND `current_node has element children` AND `current_node has no slot match`
- STOP catalogue match check: must avoid STOP #14 (refine trigger before re-enabling — this IS the refinement), STOP #16 (no hardcoded slug-to-block dicts), STOP #5 (no per-block hyperfocus)
- Emission path: trace Mama's featured-product + social-proof + gift-section + hero in extract.json — confirm parent class hierarchy before predicting impact
- Shipped vs deferred breakdown: code change = SHIPPED if measurement passes; block_composition data already shipped; no docs deferral

**Execution:**
- Pattern: `/subagent-driven-development` (implementer + spec reviewer + quality reviewer)
- Model: sonnet (architectural predicate logic)
- Cold prompt MUST include: the c76aa107 git diff (to show what was reverted), the empirical regression numbers (+13.07pp featured-product + +10.40pp social-proof at 56.40% baseline), the refined predicate (immediate child + CSS rules + element children + no slot match), explicit instruction to ship as ONE commit with /sgs-clone Stage 11 pre/post measurement in the commit message

**Acceptance:**
- Mama's featured-product + social-proof don't regress (≤ +1pp from 56.40% baseline at any section)
- Other sections move toward improvement (predicted -2 to -5pp aggregate)
- /qc-inline minimum; /qc-council if measurement shows mixed regression/improvement
- Per blub.db 287 + D113 row-by-row methodology: this is a SINGLE walker condition change so single-commit OK, but measurement is mandatory

**Deps:** none. Parallel-with: none (this is the lever).

**Estimated time:** 25 min subagent + 10 min measurement + 5 min /qc-inline = ~40 min.

### Task 2 — D6 threshold re-tune for block_composition.wraps_block population

**Why:** sync-container-wrapping-blocks.py heuristic flagged only 4 blocks; Bean's intent was 20-30+. The script's current strong-signal threshold requires has_inner_blocks=1 AND specific supports — too tight. Refined Task 1 walker reads block_composition.wraps_block for routing, so a broader population gives the walker more material to work with on subsequent measurements.

**Per pre-flight ritual (write out before dispatch):**
- Primitive: block_composition table is data layer for "which blocks wrap content in a structural container"; walker reads it to decide routing
- Binding rules: R-22-1 (DB-first — data drives walker), R-22-9 (universal mechanism)
- Lessons: STOP #18 (sanity-check threshold against architectural intuition before accepting)
- Fix shape: broaden the heuristic to include WP-native background+padding supports for content-blocks; remove the has_inner_blocks=1 requirement; flag the named Bean roster
- STOP catalogue match check: must avoid STOP #16 (no hardcoded slug list — use feature flags / capabilities)
- Emission path: query the 24 named blocks in Bean's roster + verify their composition_role + has_inner_blocks BEFORE proposing the broader heuristic
- Shipped vs deferred breakdown: DB rows SHIPPED if count lands in 20-30 range; if outside that range, ROLL BACK and iterate cold

**Bean's named roster (24 candidates — heuristic should flag this set ±5):**
feature-grid, info-box, form, announcement-bar, mega-menu, timeline, process-steps, quote (already), product-card, icon-list, notice-banner, pricing-table, brand-strip, card-grid, accordion, tabs, post-grid, mobile-nav, table-of-contents, team-member, testimonial, testimonial-slider, trust-badges, google-reviews, trustpilot-reviews

**Execution:**
- Pattern: single delegated subagent (sonnet)
- Model: sonnet
- Cold prompt MUST include: current heuristic listing (the 4 flagged), Bean's 24-block target roster, instruction to verify count is in [20, 30] BEFORE writing rows, instruction to ship as ONE commit citing pre/post count

**Acceptance:**
- ~20-30 blocks flagged wraps_block='sgs/container' (Bean roster ±5)
- Per-block diff Markdown shows real attribute gaps (not noise)
- /qc-inline check
- If count outside [15, 35] window, abort and iterate cold

**Deps:** Task 1 (refined XS-3 walker uses block_composition.wraps_block for routing). Run AFTER Task 1's measurement lands.

**Estimated time:** 15 min subagent + 5 min /qc-inline = ~20 min.

### Task 3 — Build + deploy D107-D113 source changes to live canary

**Why:** Pipeline /sgs-clone measurement last session reflected convert.py changes only — live page effects from block.json supports.sgs.is_section_root flag, button render.php wp_kses tightening, product-card featured variant render need actual deployment. Without this, Bean visual sign-off (R-22-13) can't be co-authoritative on the section-root architectural change.

**Per pre-flight ritual (write out before dispatch):**
- Primitive: source changes ship via npm build + scp deploy; D3 build-deploy.py wraps the sequence
- Binding rules: R-22-4 (pixel-diff gates after deploy), R-22-11 (verify rendered output on live DOM), R-22-13 (Bean visual sign-off)
- Lessons: feedback_verify_rendered_output_not_internal_metrics + feedback_wp7_live_verification_corrects_audit_assumptions
- Fix shape: run build-deploy.py to sandybrown canary, then /sgs-clone measurement, then Playwright DOM verify
- STOP catalogue match check: not applicable (deployment, not architecture)
- Emission path: live page is the canonical surface (R-22-11)
- Shipped vs deferred breakdown: SHIPPED on first /sgs-clone post-deploy + Bean visual confirmation

**Command (inline, single-command, no subagent needed):**
```bash
cd c:/Users/Bean/Projects/small-giants-wp
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

Then post-deploy verification:
```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --auto-section --converter-v2 --debug-trace --spec-22-acceptance \
  --deploy-target page:144
```

**Acceptance:**
- Live page shows updated behaviour (section-root flag honoured by editor; button wp_kses applied; product-card featured variant renders)
- Mojibake STILL clean (confirmed last session — verify still)
- /sgs-clone post-deploy measurement records the new baseline
- READ `pipeline-state/<latest>/leftover-buckets.json` FIRST before conjecturing (captured lesson feedback_read_leftover_buckets_before_conjecturing)

**Deps:** none. Parallel-with: Task 2 (different surfaces — Task 2 is DB, Task 3 is live deploy).

**Estimated time:** 10 min build + 10 min measurement + 5 min Playwright verify = ~25 min.

### Task 4 — XS-4 vocabulary growth (P-XS-4-SLOT-VOCAB-GAPS + P-XS-4-ROLE-REGEX-CAMELCASE follow-ups)

**Why:** XS-4 backfill covered 31.8% → 33.4% via this session's follow-ups; remainder needs vocabulary growth + Tier B regex extension. Seed more slot aliases (productName→title, split→media, trialTag→label/badge, more) into slots table. Extend role-detection regex for further camelCase patterns. Re-run assign-canonical.py + verify canonical_slot coverage rises from 33.4% toward 50%.

**Per pre-flight ritual (write out before dispatch):**
- Primitive: assign-canonical.py runs 4-tier classifier (A=direct slot match, B=regex camelCase, C=role-derived block, D=fallback); seed vocabulary grows Tier A hit rate
- Binding rules: R-22-1 (DB-first vocabulary), R-22-9 (universal mechanism — regex serves all blocks)
- Lessons: STOP #15 (row-by-row measurement), feedback_db_rows_via_sgs_update_not_direct_seed
- Fix shape: identify NULL-canonical-slot attrs that match obvious patterns (productName→title, split→media, trialTag→label, etc.); seed slots aliases; extend Tier B regex for camelCase priceLarge/textPrimary patterns; re-run assign-canonical.py
- STOP catalogue match check: avoid STOP #7 (row-by-row, not batched), STOP #15 (per-block measurement when relevant); since this is vocab + regex (not per-block routing), batched OK with single aggregate canonical_slot %% measurement
- Emission path: assign-canonical.py dry-run reveals which NULL rows the new vocab unlocks BEFORE writing
- Shipped vs deferred breakdown: SHIPPED if canonical_slot coverage > 45%; queued if 40-45% with explanation

**Execution:**
- Pattern: single delegated subagent (sonnet)
- Model: sonnet
- Cold prompt MUST include: current NULL canonical_slot attr roster (query result), specific vocabulary seeds to consider (productName/split/trialTag/etc.), instruction to use assign-canonical.py --dry-run first, instruction to ship as ONE commit citing coverage% pre/post

**Acceptance:**
- canonical_slot coverage > 45% (stretch: 50%)
- Smoke tests for additional attrs resolve (e.g. priceLarge if role re-classified)
- /qc-inline pass

**Deps:** none. Parallel-with: Task 1 (different surfaces — Task 1 is walker code, Task 4 is DB vocab).

**Estimated time:** 25 min subagent + 5 min /qc-inline = ~30 min.

### Task 5 — /qc-council retrospective on session close

**Why:** Run /qc-council across all Task 1-4 commits + documentation set for consistency / accuracy / clarity. Flag any inter-doc contradictions. Captures any final corrections before session close.

**Per pre-flight ritual (write out before dispatch):**
- Primitive: multi-rater consistency check across writing + spec accuracy + cross-doc coherence + R-22-rule compliance
- Binding rules: R-22-12 (QC gates are structural), blub.db 255 (multi-model /qc per converter commit)
- Lessons: feedback_qc_council_cross_family_triangulation_finds_bugs (cross-family diversity finds real bugs that same-family tests miss), feedback_qc_before_commit (panel gates the commit)
- Fix shape: /qc-council 4-rater (writing-clearly-and-concisely + spec-accuracy + cross-doc-coherence + R-22-rule-compliance) over the session's commits + updated docs
- STOP catalogue match check: not applicable (consistency review, not architecture)
- Emission path: docs files + commit list are the surface
- Shipped vs deferred breakdown: corrections triaged to parking or inline-applied based on severity

**Execution:**
- Pattern: `/qc-council` (4 raters)
- Model: cross-family — Sonnet + Haiku + Gemini Flash + inline Opus
- Acceptance: 0 critical contradictions; any flagged issues triaged to parking entry or inline-applied

**Deps:** Tasks 1-4 shipped + measured.

**Estimated time:** 15 min /qc-council + 5 min triage = ~20 min.

## Section 4 — Dependency graph

```
Task 3 (inline, build+deploy)         Task 2 (sonnet, broaden D6 threshold)
       ↓                                      ↓
       ↓                              Task 1 (sonnet, refined XS-3 walker — uses block_composition)
       ↓                                      ↓ /qc-inline + measurement
       ↓                              Task 4 (sonnet, vocab growth) — parallel with Task 1 post-measurement
       ↓                                      ↓
       └──────────────→ Task 5 (/qc-council, final consistency check) ←──────────┘
                                              ↓
                                       Commit + push (Gate 2)
                                              ↓
                                          /handoff
```

Task 3 is independent (inline build+deploy) and can run first or in parallel with Task 1 dispatch.
Task 2 gates on Task 1 measurement (Task 2's broader population only matters if refined walker consumes it).
Task 4 runs in parallel with Task 1 post-measurement (different surfaces).
Task 5 gates on Tasks 1-4 complete.

## Section 5 — Methodology guardrails

- **Verify routing path before predicting impact** (XS-9.1 lesson) — trace which slug receives the affected attr BEFORE estimating pixel-diff delta. Grep extract.json for the canary section's block_markup. If the path your fix touches is NOT the path the canary actually uses, predicted impact is zero regardless of architectural correctness.
- **Roll back fast on regression** (STOP #19) — XS-3 walker showed measurable regression at first measurement; git revert immediately rather than iterating inline under context pressure. Preserve work in history; re-tune in next session with empirical evidence baked into the cold prompt.
- **block_composition table is LIVE** — refined XS-3 walker reads composition_role + wraps_block; don't redesign the schema, just consume it. Task 2 broadens wraps_block population for Task 1 walker to consume on subsequent measurements.
- **Map revert blast radius BEFORE deferring docs** (STOP #17) — distinguish "code reverted" from "all related architectural updates deferred". DB-layer / table / data-pipeline architecture often stays live even when one code path reverts.
- **Sanity-check subagent threshold output against architectural intuition** (STOP #18) — if count is wildly off from expected roster, the threshold is wrong. Broaden BEFORE accepting the artefact.
- **Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit** (blub.db 255) — /qc-inline = self-check; /qc-council = dispatch gate. Cross-family diversity (Sonnet + Haiku + Gemini Flash + inline Opus) finds bugs same-family tests pass.
- **Per-section cropped pixel diff** (blub.db 256) — `pixel-diff.py --selector .sgs-{section}`, never full-page (30-45% noise floor). Per-section ≤1% × 3 viewports.
- **DB-first, no hardcoded dicts** (R-22-1, blub.db 260) — before adding any lookup dict, check sgs-framework.db tables. property_suffixes + kind_override (D99) replaces _KIND_BY_SUFFIX. slots + roles (D99) replaces slot_synonyms. blocks.tier + block_composition (D107-D108) replaces literal-slug-match in voter.

## Skills to Invoke

| Skill | When | NB |
|---|---|---|
| `/autopilot` | FIRST — every session start (HARD GATE) | Loads anti-pattern STOP catalogue + ADHD rules into context |
| `/sgs-wp-engine` | always for this project | SGS framework knowledge base |
| `/subagent-driven-development` | Task 1 walker refinement | Implementer + spec reviewer + quality reviewer triad |
| `/qc-inline` | per-task before commit | Single-file sanity check |
| `/qc` | retrospective audit if Task 1 measurement surfaces issues OR doc-state drift suspected | Full 7-stage |
| `/qc-council` | Task 5 + any non-trivial fix-shape proposal | Required for converter/walker/SGS-block commits per blub.db 255 |
| `/delegate` | per-subagent model selection | sonnet for Tasks 1/2/4; cross-family for Task 5 |
| `/verify-loop` | 2-attestation per load-bearing claim | Use on Task 1 measurement assertions |
| `/research-check` | if a row-routing decision is genuinely ambiguous | Two-rater parallel Sonnet ~2 min |
| `/handoff` | session close | Walks docs-registry per Gate 4.5 |
| `/capture-lesson` | any new corrective rule surfaced | Adds to MEMORY.md + project memory + blub.db |
| `/systematic-debugging` | if Task 1 regression returns | Root-cause investigation gate |

## Tool bindings

| Tool | Use for | Caveat |
|---|---|---|
| `sgs-db.py sql` | DB queries (READ-ONLY — wrapper silently no-ops DELETE/UPDATE/INSERT) | For writes: `python -c "import sqlite3; ..."` direct calls |
| `wp-blocks.py dump` | block schema verification per blub.db 272 | Schema enumeration BEFORE "missing X" claims |
| `sgs-update-v2.py` | DB refresh + prune + spec regen (10 stages) | Stage 10 v3 is aggressive-prune by default per D94/D100 |
| `build-deploy.py` (D3, new this session) | Task 3 build + deploy to sandybrown canary | `--target sandybrown` for the canary host |
| `sgs-clone-orchestrator.py` | THE measurement (Task 1 + Task 3) | `--deploy-target page:144` deploys to sandybrown canary |
| `pixel-diff.py --selector .sgs-{section}` | per-section diff per blub.db 256 | NEVER full-page (30-45% noise floor) |
| `assign-canonical.py` (Task 4) | 4-tier canonical_slot/role classifier | --dry-run first; verify counts pre/post |
| `sync-container-wrapping-blocks.py` (Task 2) | block_composition.wraps_block population | Current heuristic too tight (4 results); broaden per Bean's 24-block roster |
| Playwright MCP | live-page DOM verification per R-22-11 | Verify rendered output, not internal metrics |
| `git revert` | STOP #19 — fast rollback on regression | Preserve work in history; re-tune next session |

## MCP servers (relevant this session)

| Server | When |
|---|---|
| Playwright | Task 3 post-deploy live-page DOM verification |
| github MCP | If commits need cross-reference to PRs |
| sqlite (built into sgs-db.py) | All DB queries |

## Agents to delegate to

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 1 walker refinement (heavy WP/SGS architecture work) |
| `design-reviewer` | Task 3 post-deploy visual review against mockup |
| `performance-auditor` | Not this session (no perf work) |

## Hard constraints (carried forward — these are LOAD-BEARING)

- **R-22-1 — DB-first, no hardcoded dicts** (exception: convention-ordering lists like `_BREAKPOINT_RULES` + `_CAPABILITY_PRIORITY` are runtime config, not data; legitimately stay as Python constants. Static spec facts belong in DB tables — D99 + D107-D108 precedent.)
- **R-22-3 — Three permitted walker exceptions, no others** — XS-3 IS the top-level container wrap exception narrowed; adding a 4th requires spec amendment
- **R-22-4 — pixel-diff gates every commit** — Task 1's measurement IS the empirical gate for the refined walker
- **R-22-9 — universal mechanisms, no per-block hyperfocus** — applies to ANY slot routing or walker predicate decision
- **R-22-11 — verify rendered output, not internal metrics** — Task 3 Playwright DOM verify is canonical
- **R-22-13 — Bean visual sign-off co-authoritative** — script measurement + visual cropped-pair both consulted
- **R-22-14 — no server-side legacy fallback hacks in FR-22-6 migrations**
- **--no-verify only with Bean explicit approval per-commit** — default is normal commit through visual diff gate

## Out-of-scope this session

- Pre-existing test_phase_3_inner_blocks.py hero CTA failures (confirmed pre-existing via git stash; unrelated to recent batches)
- Phase 2 hybrid block migration FR-22-6.1 broader rollout (Stream A still active; Streams B/C/D deferred)
- Trust-badges + certification-bar live-deploy validation (parking entry P-TRUST-BADGES-MERGE-VALIDATION exists)
- sgs/media video extension live-deploy validation (parking entry P-MEDIA-VIDEO-VALIDATION exists)
- sgs/svg-background migration live-deploy validation (parking entry P-SVG-BACKGROUND-MIGRATION-VALIDATION exists)
- Phase 2.5 pixel-diff bridge to ≤1% (vertical-anchor + chrome cropping + font-load timing)
- block_capabilities wider wire-in beyond FR-22-15 tiebreaker
- /qc-council retrospective on D107-D113 batch beyond Task 5 (only if Task 5 surfaces issues)
- block_attributes 1316 NULL canonical_slot rows full backfill (Task 4 targets 45% stretch; remainder queued)
