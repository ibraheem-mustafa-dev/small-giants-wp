---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: "CSS-TRANSFER FIDELITY (cloning thread) + THEME-BLOCKS (theme thread) — TWO active threads. FR-22-20 variant detection SHIPPED+verified (hero). Branch feat/fr22-4-1-universal-wrapper, NOT merged. Two next-session-prompts: .claude/next-session-prompt.md (cloning) + .claude/next-session-prompt-theme.md (theme). THEME 2026-06-01: mobile-nav full-fix DONE (D143, 1f985c9a, deployed+verified — full-screen overlay + core/page-list menu expansion + header-only inserter); product-card 6 decisions RATIFIED (D144 → Spec 24 §FR-24-11..17); product-card BUILD (Task 2) now unblocked + deferred to next theme session."
current_subphase: "2026-06-01 session (docs-only, NO code — by design): full read + code-level root-cause + 3-rater qc-council on the hero fix-shape. Council REJECTED H2 (block thin-shell — would retire the hero's 169-attr image pipeline + the render.php art-direction @media CSS onto sgs/media which can't replicate it → violates 'preserve full functionality'; blast radius 7 sections + 5 block files). Council CHOSE H-conv (converter routes the hero's content-column children → bare $content InnerBlocks; the __media images → scalar splitImage/splitImageMobile; render.php/edit.js/block.json UNCHANGED; 1-section blast radius; universal across the 4 wraps_block composites). Captured as Spec 22 §FR-22-19 (DESIGN, build pending). Trust-bar reframed as dual-mode (Spec 24 §FR-24-10: Typed curated repeater OR Bound echo $content via a Source-toggle mode attr — NOT a naive InnerBlocks migration that would gut the curated editor). Wave-2/A-1 already verified pre-session (run 223313, commit 0f52a3ba): 6/7 structural, hero RED. D125-D127."
current_subphase_step: "SHIPPED + LIVE-DOM VERIFIED (run mamas-munches-144-2026-06-01-035323). Hero: 1 .sgs-hero__content + media column + 2 art-directed split-images render live (double-wrapper FIXED). Trust-bar: Bound mode renders 4 cloned badges (−5.2 to −6.7pp). cta-section FR-22-6 full. testimonial-slider 3 testimonials intact. 3-rater qc-council: code rule-clean (R-22-1/2/3/9/14, FR-22-2.2); 2 gaps fixed (hero $is_split media + spec role-name). NEXT (see next-session-prompt.md): (1) real image sideload (media-map — biggest pixel-diff lever; images dry-run 404); (2) merge-prep (split d6358f32 per-block R-22-5 + Bean sign-off → main); (3) isEligible on hero/info-box deprecations; (4) Phase-2 scalar-attr extraction; (5) product-card + sgs/option-picker (pending Bean's 6 decisions)."
last_updated: 2026-06-02
current_subphase_step: "CLONING (2026-06-03): editor errors FULLY FIXED+verified (D141); is-style carry+tag-authoritative leaf routing (D145); sgs/button REPLACES core/button + multi-button grouping — P-9 COMPLETE (D146); button PRESETS via slots.standalone_block_default_attrs column + modifier path (D147, qc-council Finding-5 boolean-attr fix); video/iframe→sgs/media (D147); sgs/star-rating Trustpilot styles (D147); cart-block research→theme prompt. CSS-TRANSFER FIDELITY (4-gap D136) remains THE next priority (gap-4 brand premise corrected: draft brand grid=1fr 1fr, no brand bug). Branch shared w/ theme thread, NOT merged (R-22-5+R-22-13)."
current_subphase_step: "THEME-THREAD Wave 1 (2026-06-02, feat/theme-blocks-wave1, 13 commits, NOT yet merged): sgs/option-picker SHIPPED (Spec 24 FR-24-15/D144 Phase A — variation-set picker block); notice-banner FR-22-6 migration SHIPPED (first content block migrated to InnerBlocks pattern; mirrors info-box v4); mega-menu layout library SHIPPED (7 patterns + mega-menu-layouts category); 4 design fixes (incl. duplicate-animation-panel fix + contrast 11.86:1; theme version 1.3.5→1.3.6); sgs/icon enhancements (shape/link/hover); product-card Phase B SHIPPED (variation-sets meta + Gutenberg panel + sgs_product custom-fields fix); sgs/cart SHIPPED (WooCommerce badge count v1 — cart badge-increment E2E gated on canary having ≥1 WC product). D148 (wave summary) + D149 (product-card Phase C dual-source). FR-22-6 classification report written (.claude/reports/2026-06-01-fr22-6-migration-classification.md); Wave-2A (social-proof/featured-product/gift-section/footer/header) defined + GATED on P-FR226 null-save→InnerBlocks finding. Block count 66→68."
current_subphase_step: "CLONING (2026-06-02, branch feat/block-composition-container-kind off main @ 3c388195; theme merged via a8cb3ff9): container-bearing roster + 3-KIND model VALIDATED via 5 qc-council rounds (28 blocks: 4 section / 13 layout / 11 content); 4-block save-null gotcha-B4 fix SHIPPED (feature-grid/multi-button/tab/accordion-item; mobile-nav excluded) commits 0c1078cf+d5ebe439, NOT editor-/qc'd or merged. Workstream A (block_composition DB-table write — detector rewrite + container_kind column + composition_role fixes + populate) SPEC'D, NOT built. contentWidth (gaps 1+2 Option B) designed+validated+@1440-baseline-measured, NOT built. D150. Orchestration philosophy locked (Sonnet-subagent-first/parallel/QC — STOP #42). NEXT: per next-session-prompt.md 7-task orchestration plan (Task 1 editor /qc + merge B; Task 2 Workstream A; Task 3 contentWidth; Tasks 4-7 gap3/trust-bar/variant/image). Full specs in .claude/scratch/2026-06-02-container-roster-db-table-handoff.md + 2026-06-04-css-transfer-gaps-1-2-fix-shape.md."
current_subphase_step: "CLONING: CSS-transfer fidelity audit (D136) found 4 systemic gaps (imposed section max-width 1200 + hero gradient; dropped __inner wrappers via fold; mangled grid-template-columns). Priority = faithful transfer (theme-CSS-by-position + fold fix), NOT converter band-aids (2 rejected). FR-22-20 variant detection SHIPPED+verified; rollout needs modifier-class mechanism (D135); routing-vs-D0 criterion locked. Static-div editor bug fixed (committed). THEME: 3 editor-error blocks + animation panel fixed; 9 theme tasks captured (icon picker, product/photo pickers, notice-banner, mega-menu, cta-section, variant cleanup, hybrid migrations) each with gap+acceptance in next-session-prompt-theme.md."
latest_commit: "THEME thread 2026-06-02 HEAD: 65c0d354 (feat/theme-blocks-wave1, 13 commits — option-picker/notice-banner/mega-menu/cart/product-card-Phase-B/design-fixes + D148/D149). CLONING thread last: b83cd312 (hero \$is_split media + scalar-media role). Branches feat/theme-blocks-wave1 + feat/fr22-4-1-universal-wrapper both NOT merged (Bean times with cloning thread)."
working_tree: "Code + docs committed; lucide-icons.php auto-regen (never committed); stray src/blocks/trust-badges/ deletions still untracked-pending (clean up at merge-prep)"
github_branches: "feat/fr22-4-1-universal-wrapper (NOT merged to main) + main (clean)"
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
    slots_element_rows: 89
    slots_section_rows: 16
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
  phase_4_status: SHIPPED (commits 39d32799→99081252, 2026-05-22). POST-SHIPMENT UPDATE 2026-05-29 (D99): Stage 5 + Stage 7 queries updated to new slots table.
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

## State Snapshot

- **current_phase:** TWO ACTIVE THREADS. CLONING: spec-22-architectural-cleanup-batch-SHIPPED + converter advances (D145/D146/D147). THEME: Wave 1 SHIPPED on feat/theme-blocks-wave1 (13 commits, NOT merged — Bean times merge with cloning thread).
- **current_subphase:** CLONING: CSS-transfer fidelity (D136 4-gap) is next priority; branch NOT merged (R-22-5+R-22-13). THEME: Wave 1 complete; next = product-card Phase C (dual-source, D149) + cart badge-increment E2E + Wave-2A (gated on P-FR226).
- **current_step:** CLONING → see `.claude/next-session-prompt.md`. THEME → see `.claude/next-session-prompt-theme.md`. Block count 66→68 (sgs/option-picker + sgs/cart added this session).
- **latest_commit:** 65c0d354 (feat/theme-blocks-wave1 HEAD, 13 theme-thread commits); cloning thread last: b83cd312 (hero $is_split media + scalar-media role). Branch feat/theme-blocks-wave1 NOT merged; feat/fr22-4-1-universal-wrapper NOT merged.
- **working_tree:** Code committed on respective branches; lucide-icons.php auto-regen (never committed)
- **github_branches:** feat/theme-blocks-wave1 (NOT merged) + feat/fr22-4-1-universal-wrapper (NOT merged) + main (clean)
- **spec_22_status:** **ARCHITECTURAL_CLEANUP_BATCH_SHIPPED** — D93-D100 live on origin/main. FR-22-15 added (capability-aware tiebreaker); FR-22-2.2 amended (roles table); §4 data layer updated (slots + roles tables, slot_synonyms + legacy_role_lookup retired).
- **acceptance_gate_for_d93_d100:** Mean pixel-diff drops from post-Fix-1 baseline 58.6% on Mama's Munches canary AND no per-cell regression > 5pp. Empirical measurement pending next session.
- **empirical_baseline_post_fix_1:** **mean_mismatch_percent: 58.6%** (canonical baseline for D93-D100 validation)
- **session_commits_2026_05_29:** bcbafe09 (D93-D100 architectural batch, 99 files +5346/-2275) → e2df4eca (handoff docs)
- **blockers:** Stream A5 measurement pending; videoUrl canonical_slot backfill pending; seed-slot-synonyms.py needs porting. None block next session entry.

## What changed at the data layer (D99)

The biggest architectural change this session. Was:
- `slot_synonyms` (89 rows × 9 columns) + `legacy_role_lookup` (16 rows × 4 columns) — two tables, both slot→block mappings at different scopes
- `slot_synonyms.role_classification` populated by `_migrate_role_classification()` UPDATE-only migration — link-href missed because no slot_synonyms row had `role='link-href'` → walker gate returned 4 of 5 spec-defined content-bearing roles

Now:
- `slots` table — post-D111 (2026-05-30): 96 rows total (92 element + 4 section). 12 wrong/dead section-scope rows DELETED (ingredients-section, ingredients, gift-section, social-proof, testimonial section-scope, testimonial-slider section-scope, brand-story, featured-product, header, footer, site-header, site-footer); 2 rows re-inserted at element scope (testimonial → sgs/testimonial, testimonial-slider → sgs/testimonial-slider) plus `inner` passthrough element row added. Section keepers (4): core/group, hero, cta, cta-section.
- `blocks.tier` column (D107 2026-05-30) — populated from `supports.sgs.is_section_root` in block.json. Seeded rows: `sgs/hero`, `sgs/cta-section` (tier='class-section'). Voter at `per-section-convention-voter.py:295-305` queries this column to segregate section-root candidates from inner-div candidates.
- `block_composition` table (D108 2026-05-30, 188 rows) — block-shape catalogue (block_slug PK, wraps_block, composition_role enum [section-root|wrapper-shell|content-block|leaf], has_inner_blocks, accepts_allowed_blocks). Walker consumption of `composition_role` reverted at c76aa107; data layer remains valid + reusable. Refined-trigger work parked at P-XS-3-TRIGGER-REFINEMENT.
- `roles` table (20 rows, columns: role_name PK + classification + description) — per-role catalogue, seeded by `_migrate_roles_table()` via INSERT OR REPLACE from `_ROLE_CLASSIFICATION_MAP` Python dict; all 5 content-bearing roles correctly populated
- `property_suffixes.kind_override` column (17 rows populated) — replaces `_KIND_BY_SUFFIX` hardcoded dict
- `html_tag_to_core_block` seed migration switched INSERT OR IGNORE → INSERT OR REPLACE (prevents seed/DB divergence)

Walker now queries `slots WHERE scope='element'` for BEM-element resolution + `roles WHERE classification='content-bearing'` for the gate. `per-section-convention-voter.py` queries `slots WHERE scope='section'` for --legacy mode mockup recognition.

Empirical effect: `equivalent_block_for('sgs/media', 'videoUrl')` now returns `'sgs/media'` (was `None`); video URLs would route as child blocks when walker encounters them in mockup DOM. Caveat: depends on Subagent D's new video attrs in block_attributes getting canonical_slot backfilled — that's a Stream A task carried to next session.
