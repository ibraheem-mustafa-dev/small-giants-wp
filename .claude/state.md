---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: pipeline-cleanup-option-A-shipped-rc-fixes-pending
current_subphase: "Option-A cleanup sprint 2026-05-21 shipped: 4 waves on main (62ee8b87 foundation + ee8db653 cv2-only + 7d713ba0 documented gates + e60fe58e universal extraction). Cloning pipeline is now structurally sound — cv2 is the only converter path, legacy fallback removed, Stage 8 stub no longer silent-passes, CSS D3 destination wired (every unlifted CSS rule emits attribute_gap_candidate), Stage 3 calls DB canonical_slot, LEGACY_ROLE_LOOKUP migrated to DB, 7 Indus heritage-strip files migrated to brand. Mama's homepage measurements: 989 attribute_gap_candidate rows (14 new from latest run), 153/188 (81.4%) Stage 3 slots DB-canonical."
current_subphase_step: "NEXT SESSION — fix 4 root-cause gaps surfacing in Wave 3 verification (reports/2026-05-21-wave-3-verification.md). RC-3 slot_synonyms DB gaps, RC-2 _SUPPORTS_HANDLED_PROPS over-exclusion, RC-1 D3 Mode 2 breakpoint coverage, RC-4 grouped-selector bug in _collect_css_decls_for_element. Then end-to-end pipeline re-run + council audit + /systematic-debugging on remaining gaps. Deferred from 2026-05-21: Wave 4 truth-doc consolidation (agent hit context-limit), Spec 15 → Spec 16 absorption."
last_updated: 2026-05-21
latest_commit: "e60fe58e on main — wave 3(pipeline cleanup): universal extraction completeness"
session_2026_05_21_summary: "Option A cleanup sprint. 4 commits to main. Rounds 1+2 audits (11 reports). Wave 0 safety scan: DEFER-DELETION (hero attrs treated as universal-extraction gap, not porting target — captured rule at memory/feedback_universal_extraction_no_per_block_legacy.md). Wave 1: cv2-only path + Stage 8 stub fix. Wave 2: 4 documented gates enforced (per-section pixel-diff via --selector, unresolved_slots deploy gate, licensing reject, confidence ≥0.7, require_schema default-True). Wave 3: CSS D3 + Stage 3 DB + LEGACY_ROLE_LOOKUP→DB + Indus heritage-strip migration. Wave 3 verification: PARTIAL-PASS with 4 specific RCs identified."
prior_session_2026_05_20_summary: "Phase 2A massive — 8 parallel Sonnet subagents shipped 3 new blocks (responsive-logo, icon multi-source, timeline) + header behaviour layer (body_class strategy) + Spec 18 floating-UI cleanup. Live verified on sandybrown + palestine-lives.org."
blockers:
  - "None blocking. 4 RCs identified by Wave 3 verification are the next session's primary work — clear evidence-cited fixes."
---

# small-giants-wp — State Snapshot

Option-A cleanup sprint complete on `main` at `e60fe58e` (2026-05-21). 4 waves of cv2 pipeline cleanup shipped + Wave 3 verification surfaced 4 concrete root-cause gaps for next session.

Cloning pipeline post-cleanup:
- cv2 is the ONLY converter path (legacy fallback removed; non-BEM input halts-with-clear-error)
- Stage 8 pixel-diff stub no longer silently passes (returns explicit skip sentinel when --clone-url not supplied)
- Per-section pixel-diff wired via `--selector .sgs-{section}` (replaces full-page default)
- `unresolved_slots == 0` deploy gate enforced (Hard Rule 8)
- Confidence threshold `STAGE_2_CONFIDENCE_THRESHOLD = 0.7` named constant
- `require_schema=True` default at Stage 6 (production bypass closed)
- Licensing-keyword reject in `uimax-write-validator.py` (Hard Rule 1)
- CSS D3 destination wired in `convert.py walk()` — every unlifted CSS property emits `attribute_gap_candidate` row (universal-extraction safety net)
- Stage 3 calls DB `canonical_slot_for()` instead of `auto-derived`
- `LEGACY_ROLE_LOOKUP` migrated to `legacy_role_lookup` DB table (17 entries); idempotent seed at every `/sgs-update`
- `RETIRED_BLOCK_REMAP` soft-emptied
- 7 Indus Foods files migrated `heritage-strip → brand`

Next session focus: 4 RC fixes (RC-3 slot_synonyms / RC-2 SUPPORTS_HANDLED_PROPS / RC-1 D3 breakpoint coverage / RC-4 grouped-selector bug) → end-to-end pipeline re-run → council audit + `/systematic-debugging`. Deferred: Wave 4 truth-doc consolidation + Spec 15→16 absorption.

For full session detail see `.claude/handoff.md` and `.claude/next-session-prompt.md`.
