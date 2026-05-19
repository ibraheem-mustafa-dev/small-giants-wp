---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: post-RC-fix-cleanup-shipped-cloning-pipeline-structurally-sound
current_subphase: "13 commits on main 79196c52 → 6119b93f (2026-05-19 session). 5 RCs in cv2 universal-extraction silent-drop closure (RC-1 D3 Mode 2 breakpoint coverage, RC-2 _SUPPORTS_HANDLED_PROPS over-exclusion, RC-3 slot_synonyms DB gaps, RC-4 grouped CSS selector bug, RC-5 universal section-wrapper className guarantee). Container advanced backgrounds (4 modes — image/video/parallax+ken-burns/gradient-overlay; 15 new attrs; build green). ALL 10 static SGS blocks → dynamic (each with deprecated.js shim + render.php verified faithful). Hero block.json dual-cascade fix (removed primary-dark / text-inverse defaults — Section H6 anti-pattern). B1 cv2 chrome-skip leakage fix + Spec 20 structured pipeline log surfacing (Stage 9c writes summary.log always + per-severity sidecar logs). Lint 77 → 0 violations + WP-core allow-list (135 hooks). DB enrichment: 1755 equivalent_implementations = 100% Rosetta Stone; 811 inspector_control_type; 89 slot_synonyms; 8 style_variations; 39 design_tokens; 13 hooks. wp-* CLI wiring (/wp-blocks emit-time validate at convert.py:760+764; /wp-blocks match Stage 2 cross-check; /wp-hook-graph audit at /sgs-update post-flight; wp-pre-merge-gate.py wrapper). library-docs CLI repaired. /sgs-db default schema dump. /wp-blocks dump subcommand covers all 3 DBs. Binding rule #4 in CLAUDE.md (schema-enumeration discipline, blub.db row 272). Data Sources & Block-Equivalent Layers section in flow doc + flow doc TOC. Stage 9c placement regression caught by /qc-inline against live pipeline and fixed in commit d2be3d6e."
current_subphase_step: "Implementation work COMPLETE. Page 144 (rc-fix-verification-mamas-munches on sandybrown) carries cv2 output with all 4 issue classes from Bean's editor inspection resolved. Next session priority: /deploy to palestine-lives.org (build → tar → SCP → SSH → cache clear → OPcache reset); investigate untracked plugins/sgs-blocks/src/blocks/footer/ collateral; align WP global chrome (theme template parts) with mockup so Phase 3 pixel-diff closes."
last_updated: 2026-05-19
latest_commit: "6119b93f on main — docs(spec): renumber 18 → 20 (Structured pipeline log surfacing)"
session_2026_05_19_summary: "13 commits. 5 RCs + container backgrounds + 10 static→dynamic blocks + B1 chrome-skip + Spec 20 (renamed from 18 due to collision with 18-SGS-FLOATING-UI) + lint 77→0 + DB enrichment (full Rosetta Stone) + wp-* CLI wiring + library-docs CLI fix + sgs-db default schema dump + Data Sources flow-doc section + binding rule #4 (blub.db row 272) + lesson #273 (qc-inline on live pipeline). Two new feedback files: feedback_schema_enumeration_before_gap_claims.md + qc-inline-on-live-pipeline-catches-placement-bugs.md."
prior_session_2026_05_21_summary: "Option A cleanup sprint — 4 commits to main. Wave 0 safety scan → universal-extraction-no-per-block-legacy rule. Waves 1-3 shipped pipeline structural cleanup. Wave 3 verification surfaced the 4 RCs that today's session closed."
blockers:
  - "Phase 3 pixel-diff residual visual differences come from WP global chrome (header/footer template parts + nav menu showing test pages) — not converter-side. Separate session needed."
  - "Static→dynamic conversions + container backgrounds NOT YET DEPLOYED to palestine-lives.org. /deploy is the first next-session priority — without it, live sites still serve the old static save outputs."
  - "Header/footer-as-blocks 3rd recurrence (blub.db row 274, CRITICAL): a parallel subagent silently created src/blocks/header/ + src/blocks/footer/ as collateral. Removed. Header + footer are TEMPLATE PARTS per Spec 17 §S1-2 + Spec 19 §4.6. Next session Task 2: build .claude/hooks/no-header-footer-block.py PostToolUse to hard-reject Write/Edit on src/blocks/(header|footer|nav)/ — 3-time recurrence proves prompt-discipline alone is insufficient."
---

# small-giants-wp — State Snapshot

Cloning pipeline end-to-end structurally sound after today's session. All 4 issue classes Bean spotted on page 144 (invalid blocks, hero dual-cascade, picker collisions, dark-pink default) root-caused + fixed at source. Rosetta Stone complete (1755 equivalent_implementations rows = 100%).

## Live wirings as of `6119b93f`

- **cv2 converter:** every section root carries `sgs-{section_id}` className; chrome-skip returns None (no block_markup leak); `_STILL_STATIC_SGS_BLOCKS = frozenset()`; /wp-blocks validate fires after every emit
- **Stage 9c:** writes `summary.log` always + per-severity sidecar logs when bucket has ≥1 entry; placement-bug regression caught + fixed
- **DB enrichment:** 1755 block_attributes carry equivalent_implementations JSON (sgs_wp ↔ html_css Rosetta Stone); 811 inspector_control_type; slot_synonyms covers all 26 anomaly attrs + 15 container attrs
- **wp-* CLI wiring:** /wp-blocks emit-time validate, Stage 2 match cross-check, /wp-hook-graph audit, wp-pre-merge-gate.py
- **Schema-enumeration discipline:** `python ~/.claude/hooks/wp-blocks.py dump` covers all 3 DBs (~1500 tokens); bound by project CLAUDE.md rule #4
- **/deploy skill:** project-level at `.claude/skills/deploy/SKILL.md` (NOT user-level); covers build → tar → SCP → SSH extract → cache clear → OPcache reset
