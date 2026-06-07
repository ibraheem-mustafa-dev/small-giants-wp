---
block: mobile-nav-toggle
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/mobile-nav-toggle icon-migration to the shared IconPicker — 2026-06-07

**Change:** hardcoded hamburger replaced with selectable `toggleOpenIcon`/`toggleCloseIcon` (IconPicker, defaults menu/x = visually identical to the old hamburger for existing instances); render emits both icons + a `--sgs-toggle-icon-size` CSS var so the operator's iconSize is honoured; CSS swaps open/close on `aria-expanded`.

**Verification:** Editor live-verify on the canary — the block inserts AND selects (inspector + IconPicker mounted for a fresh no-icon instance) with **0 console errors** (the run that confirmed the IconPicker null-guard fix across all 11 migrated blocks). Render contract preserves existing stored values (back-compat). `/adversarial-council` (4 personas) gated this migration pre-commit; the convergent must-fixes (IconPicker null guard, accordion lucide-constraint, legacy-slug fallback, tiles items schema, toggle iconSize, dead import) were applied + re-verified.

first_paint_capture_passed: true (editor renders the migrated control + canvas preview without crashing; existing content renders unchanged).
