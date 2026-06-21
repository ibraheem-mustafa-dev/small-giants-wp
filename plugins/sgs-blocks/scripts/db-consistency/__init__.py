"""db-consistency — F6 DB-as-code consistency suite.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md
Three checks:
  check_routing    (#1) — routing determinism (forward-looking guard)
  check_composition (#2) — has_inner_blocks ↔ save.js/render.php (ported from check-composition-sync.py)
  check_variants   (#3) — variant discriminator collision on the lift surface
"""
