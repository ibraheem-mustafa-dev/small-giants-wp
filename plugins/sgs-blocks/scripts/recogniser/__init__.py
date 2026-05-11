"""SGS clone-pipeline recogniser modules.

Four dispatcher scripts called by sgs-clone-orchestrator.py:

  per-section-convention-voter.py  -- Stage 1 boundary + convention voting
  confidence-matrix.py             -- Stage 2 ranked block candidates (importable)
  leftover-bucket-router.py        -- Stage 9 leftover routing into 5 buckets
  simple_html_review_report.py     -- Stage 9 operator-review HTML render

Built 2026-05-11 for Phase 7 of the SGS naming-convention rollout.
See .claude/specs/12-DRAFT-TO-SGS-PIPELINE.md and 13-DRAFT-NAMING-CONVENTION.md.
"""
