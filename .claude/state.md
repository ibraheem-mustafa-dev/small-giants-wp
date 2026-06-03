---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: "CONTAINER/WRAPPER STANDARDISATION PROGRAMME (cloning thread) + THEME-BLOCKS (theme thread) — TWO active threads converging on main. CLONING: DB substrate (Workstream A) SHIPPED (0d746073); container_kind populated for 28-block roster; WS-1 A1+A2 SHIPPED (D159); WS-1c A3+A4 BUILT-uncommitted (D163, pending Gate B); OPEN WITH WS-4 (composite-wrapper mirror, ALL ~29 composites KIND-scoped — Bean's core directive, FOUNDATIONAL). Generic converter-lift FALSIFIED by /qc-council (D163). Dedup audit: NO block merges. Plan: .claude/plans/2026-06-02-container-wrapper-standardisation.md + 2026-06-03-cloning-fidelity-triage-and-composite-remodel.md; canonical procedure Spec 22 §FR-22-21; cloning D-number ceiling D163. Two next-session-prompts: .claude/next-session-prompt.md (cloning) + .claude/next-session-prompt-theme.md (theme)."
current_subphase: "CLONING: CSS-transfer fidelity (4-gap D136 audit) is the next build priority. Scope — universal, not section-level: this fix applies to every wrapper element in the draft HTML at any nesting depth, every sgs/container instance at any depth, and every composite block with a built-in sgs/container wrapper (all three KINDs: section/layout/content). The class-section width bug was the symptom that surfaced it — not the scope. Faithful transfer also covers a property's absence (no max-width → full-width, overriding the theme default). THEME: Spec 26 (SGS Global Styles & Per-Client Theming) designed + committed (D158, 15a2b183); build deferred except FR-26-D2 (REST-write extension)."
last_updated: 2026-06-04
current_subphase_step_0_ws4_pm: "CLONING (2026-06-03 LATE-PM, D163): NEXT OPENER = WS-4 composite-wrapper mirror across ALL ~29 composites, KIND-scoped (NOT 4) — Bean's core directive, FOUNDATIONAL. 3 block fixes BUILT-uncommitted (need Gate-B visual-diff): #3 heading/label text-parity, #8 reviews-slider, WS-1c A3+A4 container; + composite-diff scanner extension. DEDUP AUDIT (Bean-inserted; 4-rater council overturned 3 of 4 merge guesses): NO block merges — overlap is plumbing-level → shared helpers + container-mirror; content-collection=register (29th, layout); #6=notice-banner option-a; bloat is a mirror problem not a merge problem. GENERIC CONVERTER-LIFT FALSIFIED by /qc-council (wrong path — real min-height is hero composite-interior; unsafe blind fingerprint; --has-min-height render-trap) — A6→WS-4 lift-only-gated, A5→curated _root_lift_rules + hero-composite-interior fix. Full orchestration plan (Opus-orchestrator role + skills/QC/subagent tables + per-task WS-4 blocks) in next-session-prompt.md. STOP #47-50 added."
current_subphase_step_0_ws1: "CLONING (2026-06-03, D159): WS-1 A1+A2 SHIPPED (commit 2f86d9e6, pushed) — the container/wrapper standardisation BUILD has begun. sgs/container gained `contentWidth` (guarded `__inner` render wrapper) + the converter now transfers each slug-None section's own max-width→widthMode (absent→full/alignfull→escapes the WP 1200 cap; present→custom) + lifts the folded `__inner` max-width→contentWidth. Live-DOM verified @1440 (R-22-11): the 4 target sections 1200/dropped→1425 full-bleed/content 1040|960; brand 1000 unchanged. 3-rater /qc-council design-gate. Visual-diff report PASS. REMAINING WS-1c: A3 custom-width centring, A4 raw-px gap, A5 min-height, A6 gridItem*. NEXT: page-level triage register #1-#8 (D159.3 — NONE an A1/A2 regression; #3/#4 root-cause-verified pre-existing) + WS-4 composite-remodel (Bean's sharpened directive D159.2: remove each composite's drifted wrapper, replace with exact sgs/container mirror, /sgs-update auto-propagates on version bump)."
current_subphase_step_1: "CLONING (2026-06-02, D152): Task 1 4-block save-null editor-/qc'd LIVE (PASS); Workstream A SHIPPED (0d746073 — sync-container-wrapping-blocks.py rewrite + container_kind migration + roster --apply all 28; 4-rater qc-council fixed the UPDATE-only silent undercount). Container/wrapper system deep-analysed (4-branch + 6-step target/current compare + artefact-empirical: the fold deletes __inner + strands its max-width). Bean reframe: NO composite evades R-22-9 — composites must MIRROR sgs/container (block_composition propagation). 5-workstream standardisation plan + Spec 22 §FR-22-21 + flow/stages + parking written + 2-rater doc-council (1d846667). On main @ c468af7a (theme thread co-active)."
current_subphase_step_2: "CLONING (2026-06-03): editor errors FULLY FIXED+verified (D141); is-style carry+tag-authoritative leaf routing (D145); sgs/button REPLACES core/button + multi-button grouping — P-9 COMPLETE (D146); button PRESETS via slots.standalone_block_default_attrs column + modifier path (D147, qc-council Finding-5 boolean-attr fix); video/iframe→sgs/media (D147); sgs/star-rating Trustpilot styles (D147). CSS-TRANSFER FIDELITY (4-gap D136) remains THE next priority. Branch merged to main (Bean-directed); feat/fr22-4-1-universal-wrapper deleted."
current_subphase_step_3: "THEME-THREAD Wave 1 (2026-06-02): sgs/option-picker SHIPPED (D144); notice-banner FR-22-6 migration SHIPPED; mega-menu layout library SHIPPED (7 patterns); 4 design fixes; sgs/icon enhancements; product-card Phase B SHIPPED; sgs/cart SHIPPED (WooCommerce badge count v1). D148/D149. Block count 66→68. Wave merged to main (a8cb3ff9)."
current_subphase_step_4: "THEME (2026-06-04, session 10, D164): Spec 27 Phase-1 PILL-SWAP QUARTET SHIPPED + LIVE-VERIFIED on page 589/fixture 540 — the sell-loop is real, Mama's can sell a variant. U3 (manifest+SSR seed, 7f096976: Product_Manifest::build + 48-combo per-instance context ≤24KB + 2 pickers, M-C1/3/5/7/9) → U4 (multi-axis pill-swap store, 6b4af10a: price/sale/stock swap, 0 XHR on change; fixed a latent Phase-C colon-event wiring bug via data-wp-init bridge) → U7 (secure add-to-cart, c903e760: posts selected variation + display-name variation[] + nonce to /sgs/v1/cart/add-item, cart holds variation 565 @ £24.49) → U5 (availability, 3bbb21b6: both-directions grey-out + GET /sgs/v1/cart/availability endpoint; all 4 a11y gates PASS axe-core0/keyboard/SR/44px). 5 bugs caught by orchestrator live-testing; cross-model councils per unit; GATE 2 Bean-signed-off. NEXT (theme): the REST of Phase 1 to the single whole ship gate — U9 (WCAG sprint + evidence sheet + the <a>→<button> fix) → U10 (perf/INP≤200) → U8 (cache+tax staleness guard) → U11 (WC<9.8 degradation) → U1 (per-site capability flag) → U12 (cloning-compat tests). Opus=orchestrator + Sonnet build. See next-session-prompt-theme.md."
latest_commit: "823c85b7 (cloning D163 docs: handoff + next-session-prompt full gap register + spec/plan reconciliation; theme thread co-active — verify HEAD before committing)"
working_tree: "Code + docs committed; lucide-icons.php auto-regen (never committed)"
github_branches: "main (clean — no feature branches; two agent worktrees local-only)"
spec_22_implementation:
  status: ARCHITECTURAL_CLEANUP_BATCH_SHIPPED_STREAM_A_MEASUREMENT_PENDING
  spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  spec_version: "0.5+FR-22-15+FR-22-16+FR-22-19 (FR-22-19 added + SHIPPED 2026-06-01 D128-D132 — composite scalar-media routing: hero + testimonial-slider; new scalar-media role; gate has_scalar_media_attrs. FR-22-15 added 2026-05-29 D96; FR-22-2.2 amended D99; §4 data layer slots + roles tables, slot_synonyms + legacy_role_lookup retired D99)"
  phase_plan_active: .claude/plans/2026-05-28-phase-2-hybrid-block-migration.md
  phase_1_5_close_note: "Phase 1.5 CLOSED with just Fix 1 shipped (5731dc36 walker FR-22-3 #3 ordering). Diagnostic value complete."
  phase_plan_archived: .claude/plans/archive/2026-05-26-phase-1-spec-22-implementation-closed-2026-05-27.md (Phase 1.5 closed 2026-05-27 per D90)
  d_decisions_2026_05_29: "D93 svg-merge | D94 /sgs-update Stage 1 UPDATE-on-drift + Stage 10 v2 | D95 trust+cert merge | D96 block_capabilities FR-22-15 tiebreaker | D97 sgs/media video extension | D98 container ship-blockers | D99 slots/roles unification + INSERT OR REPLACE + kind_override (link-href bug closed) | D100 Stage 10 v3 retired-blocks delete + phpunit stub"
  docscore: "100% Grade A (last verified pre-D99; re-verify post-architectural changes)"
  acceptance_gate_phase_1: per-section ≤5% × 3 viewports for all 7 body sections + Bean visual sign-off (R-22-13 co-authoritative)
  acceptance_gate_phase_1_5: per-section ≤1% × 3 viewports (stretch — bridges via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing)
  empirical_baseline_post_fix_1: "mean_mismatch_percent: 58.6% (pipeline-state/mamas-munches-homepage-2026-05-27-193804/stage-11-pixel-diff.json) — canonical baseline for D93-D100 batch validation; NEXT SESSION runs the new measurement to compare"
  walker_loc: "convert.py NEW = 1873 LoC; retired _retired/convert_pre_spec22.py = 4803 LoC; 61% reduction"
  hero_clone_poc: "/hero-clone-poc/ (page 29) — visual parity proof; 54.5% pixel-diff is 60px chrome-bleed alignment artefact, not visual divergence"
  retired_in_session_2026_05_29: ["slot_synonyms table (D99)", "legacy_role_lookup table (D99)", "sgs/svg-background block (D93)", "sgs/certification-bar block (D95)", "sgs/back-to-top + sgs/data-display + sgs/icon-block + sgs/reading-progress (D100 Stage 10 v3)"]
  db_state_post_d99:
    slots_element_rows: 92  # post-D111: 89 base + inner passthrough + testimonial/testimonial-slider re-inserted at element scope (12 dead section rows deleted)
    slots_section_rows: 4   # post-D111: keepers are core/group, hero, cta, cta-section
    roles_rows: 21  # D99 base 20 + scalar-media added 2026-06-01 D128 (§FR-22-19)
    property_suffixes_kind_override_populated: 17
    blocks_table_after_d100_cleanup: 66  # +2 added theme-thread 2026-06-02 (sgs/option-picker D144 Phase A + sgs/cart D149-adjacent) = 68 total post-wave-1
db_architecture_2026_05_29:
  hard_link_finding: ".claude/skills/sgs-wp-engine/sgs-framework.db and .agents/skills/sgs-wp-engine/sgs-framework.db share inode (NTFS junction point); same physical file. Prior 'mirror-DB divergence' framing structurally impossible. See memory/feedback_dbs_are_junction_not_mirror.md."
  real_two_dbs: "sgs-framework.db (~/.agents/skills/sgs-wp-engine/) + ui-ux-pro-max.db (~/.agents/skills/ui-ux-pro-max/scripts/) — different physical files. Cross-skill sync via /sgs-update Stage 8."
session_b_records:
  qc_council_report: .claude/reports/2026-05-22-session-B-qc-council.md
  session_summary: .claude/memory/session-summary-2026-05-22-session-B.md
  property_coverage_audit: .claude/reports/phase-5b-button-property-coverage.md
architecture_programme:
  staging_doc: .claude/plans/2026-05-21-architecture-staging.md
  phase_0_status: SHIPPED (commit aec54882, 2026-05-21)
  phase_0_5_status: SHIPPED (commit 6eaadbc2, 2026-05-21)
  phase_1_status: SHIPPED (commit 8c56ab6 in ~/.agents/skills repo, 2026-05-22)
  phase_1.5_status: SHIPPED (commit cc541e94, 2026-05-22)
  phase_2_status: SHIPPED (commit aca7c98 in skills repo, 2026-05-22)
  phase_3_status: SHIPPED (commit 79158da5, 2026-05-22)
  phase_4_status: "SHIPPED (commits 39d32799→99081252, 2026-05-22). POST-SHIPMENT UPDATE 2026-05-29 (D99): Stage 5 + Stage 7 queries updated to new slots table."
  phase_5a_status: SHIPPED-IN-SESSION-B (commit 43a93df9, 2026-05-21)
  phase_5b_status: SHIPPED-IN-SESSION-B (commit 60220b13, 2026-05-21)
  phase_5b_paint_fix_status: SHIPPED-IN-SESSION-B (commit 0ef032fe, 2026-05-22)
  phase_6_status: "SHIPPED-IN-SESSION-B (commit d307c8b0, 2026-05-22) with two non-blocking partials parked"
  phase_7_status: SHIPPED (commits da19374c + b26abf56, 2026-05-22)
wp_7_0_upgrade_status: "SHIPPED 2026-05-22 (Session B Hostinger op). sandybrown core 6.9.4 → 7.0."
blockers:
  - "Stream A5 canary measurement PENDING — empirical gate for D93-D100 work. Highest-priority next-session task."
  - "sgs/media.videoUrl canonical_slot NULL — gate fixed (D99) but data missing; Subagent D's new video attrs need canonical_slot backfill before link-href routing is user-visible. Highest-priority Stream A item."
  - "seed-slot-synonyms.py stale — references dropped slot_synonyms table. Will fail on next invocation. Needs porting to slots-table architecture OR retirement + replacement."
  - "Pre-existing 3 hero CTA test failures in test_phase_3_inner_blocks.py — confirmed pre-existing via git stash baseline; out of scope for D93-D100 batch."
  - "5 PRE-EXISTING duplicate parking slugs from prior sessions. Not introduced this session. Future parking cleanup pass."
  - "P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION (OPEN, SEO bucket) — team-member's pre-1.3b Schema.org JSON-LD sameAs array lost in InnerBlocks refactor."
---

# small-giants-wp — State Snapshot

## Human Summary

Two threads converging on `main`. **Cloning thread:** DB substrate (Workstream A) shipped — `block_composition.container_kind` populated for the 28-block container roster. The 5-workstream standardisation programme is **planned, not built**; WS-1 (sgs/container 3-layer completion) is the build opener; WS-4 (composite mirror + auto-propagation) follows. **Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The class-section width bug was the symptom that surfaced it — not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default). **Theme thread:** Wave 1 shipped + merged; Spec 26 (SGS Global Styles & Per-Client Theming, D158) designed — build deferred except FR-26-D2. See `next-session-prompt.md` (cloning) + `next-session-prompt-theme.md` (theme) for per-thread entry points.

## State Snapshot

- **current_phase:** TWO THREADS ON MAIN. CLONING: DB substrate (Workstream A) SHIPPED; 5-workstream standardisation PLANNED-NOT-BUILT; WS-1 is the build opener. THEME: Wave 1 merged; Spec 26 designed (D158, build deferred except FR-26-D2).
- **current_subphase:** CLONING: CSS-transfer fidelity (D136 4-gap) is next build priority — scope is universal (all wrapper depths + all KINDs), not section-level. THEME: FR-26-D2 (REST-write extension) is the concrete next theme task.
- **current_step:** CLONING → see `.claude/next-session-prompt.md`. THEME → see `.claude/next-session-prompt-theme.md`. Block count: 68 sgs / 190 total.
- **latest_commit:** c468af7a (main HEAD — theme FR-26-D2; this thread's doc-reconciliation pending; theme thread co-active).
- **working_tree:** Code + docs committed; lucide-icons.php auto-regen (never committed).
- **github_branches:** main (clean — no feature branches; two agent worktrees local-only, not on GitHub).
- **spec_22_status:** **ARCHITECTURAL_CLEANUP_BATCH_SHIPPED** — D93-D100 + D141/D145/D146/D147/D152 live on origin/main. FR-22-15 added (capability-aware tiebreaker); FR-22-2.2 amended (roles table); §4 data layer updated (slots 96 rows / roles 21 rows); slot_synonyms + legacy_role_lookup retired.
- **empirical_baseline:** pixel-diff is informational per FR-22-18 — latest canary run `mamas-munches-144-2026-06-02-224706`; cite run id + date, never a bare percentage as a gate.
- **session_commits_2026_05_29:** bcbafe09 (D93-D100 architectural batch, 99 files +5346/-2275) → e2df4eca (handoff docs).
- **blockers:** CSS-transfer fidelity (4-gap D136) is the next build priority; B1 decision (D1 sidecar revive vs DB-replace) needed before WS-2; WS-1 must complete before WS-4. None block session entry.

## What changed at the data layer (D99)

The biggest architectural change this session. Was:
- `slot_synonyms` (89 rows × 9 columns) + `legacy_role_lookup` (16 rows × 4 columns) — two tables, both slot→block mappings at different scopes
- `slot_synonyms.role_classification` populated by `_migrate_role_classification()` UPDATE-only migration — link-href missed because no slot_synonyms row had `role='link-href'` → walker gate returned 4 of 5 spec-defined content-bearing roles

Now:
- `slots` table — post-D111 (2026-05-30): 96 rows total (92 element + 4 section). 12 wrong/dead section-scope rows DELETED (ingredients-section, ingredients, gift-section, social-proof, testimonial section-scope, testimonial-slider section-scope, brand-story, featured-product, header, footer, site-header, site-footer); 2 rows re-inserted at element scope (testimonial → sgs/testimonial, testimonial-slider → sgs/testimonial-slider) plus `inner` passthrough element row added. Section keepers (4): core/group, hero, cta, cta-section.
- `blocks.tier` column (D107 2026-05-30) — populated from `supports.sgs.is_section_root` in block.json. Seeded rows: `sgs/hero`, `sgs/cta-section` (tier='class-section'). Voter at `per-section-convention-voter.py:295-305` queries this column to segregate section-root candidates from inner-div candidates.
- `block_composition` table (D108 2026-05-30, 189 rows) — block-shape catalogue (block_slug PK, wraps_block, composition_role enum [section-root|wrapper-shell|content-block|leaf], has_inner_blocks, accepts_allowed_blocks, container_kind). Walker consumption of `composition_role` + `container_kind` deferred (WS-3); data layer valid. Refined-trigger work parked at P-XS-3-TRIGGER-REFINEMENT.
- `roles` table (20 rows, columns: role_name PK + classification + description) — per-role catalogue, seeded by `_migrate_roles_table()` via INSERT OR REPLACE from `_ROLE_CLASSIFICATION_MAP` Python dict; all 5 content-bearing roles correctly populated
- `property_suffixes.kind_override` column (17 rows populated) — replaces `_KIND_BY_SUFFIX` hardcoded dict
- `html_tag_to_core_block` seed migration switched INSERT OR IGNORE → INSERT OR REPLACE (prevents seed/DB divergence)

Walker now queries `slots WHERE scope='element'` for BEM-element resolution + `roles WHERE classification='content-bearing'` for the gate. `per-section-convention-voter.py` queries `slots WHERE scope='section'` for --legacy mode mockup recognition.

Empirical effect: `equivalent_block_for('sgs/media', 'videoUrl')` now returns `'sgs/media'` (was `None`); video URLs would route as child blocks when walker encounters them in mockup DOM. Caveat: depends on Subagent D's new video attrs in block_attributes getting canonical_slot backfilled — that's a Stream A task carried to next session.
