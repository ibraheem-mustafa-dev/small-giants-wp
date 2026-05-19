---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: framework-deployed-pipeline-root-gap-council-next
current_subphase: "Session 2026-05-19 closed. 17 commits on main 79196c52 → a9083ca9. Framework deployed to palestine-lives.org via /wp-sgs-deploy both — HTTP 200 verified, all 10 dynamic block render.php present, vendor intact. /deploy skill consolidated /deploy-check as Phase 1 + renamed to /wp-sgs-deploy + scored 96%. Stage 10 wired into /sgs-clone (--deploy-target page:<id>). 5 RCs closed in cv2 universal-extraction. 1755 equivalent_implementations rows = 100% Rosetta Stone. Lint 77→0. Two CRITICAL lessons captured: header/footer-are-template-parts-not-blocks (blub.db row 274, 3rd recurrence) + tar-exclude-specific-path (blub.db row 275, documented-but-recurring). Page 144 on sandybrown carries clean cv2 output with hero pink + zero invalid blocks."
current_subphase_step: "Next session: pipeline root-gap council. Phase 3 pixel-diff still >24% every section after 5 RCs + container backgrounds + section-wrapper className. The framework is structurally sound but consistent ≤1% pixel-diff isn't being hit. Goal: dispatch 5-rater gap-analysis council on full pipeline run + per-section pixel-diff matrix + sidecar logs, identify root gaps that compound across patterns/blocks/nesting/attribute-slot diversity, /systematic-debugging on top 3, ship surgical fixes. Detailed orchestration in next-session-prompt.md."
last_updated: 2026-05-19
latest_commit: "a9083ca9 on main — fix(skill): wp-sgs-deploy tar exclude must be path-anchored"
session_2026_05_19_summary: "17 commits. 5 RCs in cv2 universal-extraction silent-drop closure + container advanced backgrounds (4 modes / 15 new attrs) + ALL 10 static SGS blocks → dynamic + hero block.json dual-cascade fix + B1 cv2 chrome-skip leakage + Spec 20 structured pipeline log surfacing (Stage 9c) + lint 77→0 + DB enrichment (1755 equiv_impl = full Rosetta Stone) + wp-* CLI wiring + library-docs CLI repaired + /sgs-db + /wp-blocks dump default schema + binding rule #4 (schema-enumeration discipline) + Data Sources flow-doc section + flow doc TOC + Spec 18→20 renumber + /deploy → /wp-sgs-deploy rename + /deploy-check absorbed as Phase 1 + Stage 10 wiring (/sgs-clone --deploy-target page:<id>) + skillscore 96%. Framework deployed clean to palestine-lives.org (HTTP 200, vendor intact, all 10 dynamic block render.php present). 4 new feedback files captured + 4 blub.db corrections rows (272-275)."
prior_session_2026_05_21_summary: "Option A cleanup sprint — 4 commits to main. Waves 1-3 shipped pipeline structural cleanup. Wave 3 verification surfaced the 4 RCs that today's session closed."
blockers:
  - "Pipeline doesn't consistently hit ≤1% pixel-diff per section. Phase 3 yesterday showed every section >24% mismatch after 5 RCs + container backgrounds + section-wrapper className. Framework is structurally sound (cv2 universal-extraction complete, Rosetta Stone 100%, dynamic blocks deployed) — residual gap is somewhere else (theme template parts, CSS cascade conflicts, font loading, measurement methodology, or pipeline orchestration). Next session's primary investigation."
  - "Header/footer-as-blocks 3rd recurrence (blub.db row 274, CRITICAL): a parallel subagent silently created src/blocks/header/ + src/blocks/footer/ as collateral. Removed. Next session Task 2 (optional): build .claude/hooks/no-header-footer-block.py PostToolUse to hard-reject Write/Edit on src/blocks/(header|footer|nav)/."
  - "tar --exclude='src' gotcha (blub.db row 275, CRITICAL): documented in CLAUDE.md but skill SKILL.md had wrong form — site returned HTTP 500 after deploy until re-tarred. Fixed in commit a9083ca9. Pattern: rules captured in CLAUDE.md must also live in the canonical skill source — drift between the two is the failure mode."
---

# small-giants-wp — State Snapshot

Framework deployed clean to palestine-lives.org as of `a9083ca9`. Cloning pipeline is structurally sound but residual pixel-diff gap remains. Next session is the root-gap council.

## Live wirings as of `a9083ca9`

- **cv2 converter:** every section root carries `sgs-{section_id}` className; chrome-skip returns None (no block_markup leak); `_STILL_STATIC_SGS_BLOCKS = frozenset()`; /wp-blocks validate fires after every emit; Stage 9c writes summary.log + per-severity sidecar logs; Stage 10 deploys to a target page via --deploy-target
- **DB enrichment:** 1755 block_attributes carry equivalent_implementations JSON (sgs_wp ↔ html_css Rosetta Stone); 811 inspector_control_type; slot_synonyms covers all 26 anomaly attrs + 15 container attrs; 39 design_tokens; 8 style_variations; 13 hooks
- **wp-* CLI wiring:** /wp-blocks emit-time validate, Stage 2 match cross-check, /wp-hook-graph audit, wp-pre-merge-gate.py
- **Schema-enumeration discipline:** `python ~/.claude/hooks/wp-blocks.py dump` covers all 3 DBs (~1500 tokens); bound by project CLAUDE.md rule #4
- **/wp-sgs-deploy skill:** project-scoped at `.claude/skills/wp-sgs-deploy/SKILL.md` (renamed from /deploy 2026-05-19); absorbed /deploy-check as Phase 1; scored 96%
- **Framework on palestine-lives.org:** 10 dynamic block render.php present, container backgrounds + hero block.json fix deployed, vendor composer autoload intact, HTTP 200

## Captured lessons this session (blub.db)

| Row | Pattern key | Category | Priority |
|-----|-------------|----------|----------|
| 272 | schema-enumeration-before-gap-claims | behaviour | high |
| 273 | qc-inline-runs-the-real-pipeline-not-isolated-units | behaviour | medium |
| 274 | header-footer-are-template-parts-not-blocks | architecture | critical (3rd recurrence) |
| 275 | tar-exclude-specific-path | deploy | critical (documented-but-recurring) |
