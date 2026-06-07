---
block: form-field-tiles
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/form-field-tiles icon-migration to the shared IconPicker — 2026-06-07

**Change:** per-tile `icon` TextControl migrated to IconPicker (lucide + emoji); render.php gained the same legacy-safe `iconSource` branch; block.json `tiles` now declares an items schema incl `iconSource`. Existing tile icons render unchanged.

**Verification:** Editor live-verify on the canary — the block inserts AND selects (inspector + IconPicker mounted for a fresh no-icon instance) with **0 console errors** (the run that confirmed the IconPicker null-guard fix across all 11 migrated blocks). Render contract preserves existing stored values (back-compat). `/adversarial-council` (4 personas) gated this migration pre-commit; the convergent must-fixes (IconPicker null guard, accordion lucide-constraint, legacy-slug fallback, tiles items schema, toggle iconSize, dead import) were applied + re-verified.

first_paint_capture_passed: true (editor renders the migrated control + canvas preview without crashing; existing content renders unchanged).
