---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-10
session: D303 — universal residual render-precedence (bound + class-match + source-order, no ID) + M2 theme-side letter-spacing fix
---

# Session Handoff — 2026-07-10 (D303: pipeline typography-fidelity — both mechanisms fixed + LANDED)

## Completed This Session (both next-session-prompt Tasks DONE + verified live)

1. **Task 1 / Mechanism 1 — universal residual render-precedence (D303). LANDED + pushed (`83d133aa`).**
   The hero H1 now renders the draft's **58px @≥1280** (was 52px). Root-caused LIVE (matched-rule
   trace), research-backed (WP 6.6 `:root :where()` + Kadence/Spectra/GenerateBlocks all use
   equal-low-specificity + source-order, never ID/`!important`), Bean design-gated. Four-part universal
   architecture:
   - **BOUND** — each `sgsCustomCss` residual confined to the device tier its threshold falls inside
     (`styling_helpers.bound_residual_media_conds`), symmetric min/max, so `min-width:600` → `600–767`
     (can't bleed into tablet/desktop) and `min-width:1280` stays open-ended (top tier).
   - **MATCH+ORDER** — residual scoped `.uid.uid` (0,2,0) matches the block's class rule + wins by source
     order (appended last), no ID (`custom-css.php`).
   - **NORMALISE** — the 7 blocks that self-rolled at `#uid` (button, text, feature-grid, multi-button,
     mega-menu, mobile-nav, collapsible-text) moved to class-level + `$uid` added to their class list.
   - **F3 gate** — `check-hardcoded-render-defaults.js` E8 now recognises `.uid` class-scoped overrides.
   - Spec 31 FR-31-5.2/22.3 + Spec 32 §6.1(b) amended; decision D303.
   - **Live-verified** 375/768/1440: H1 34/52/58 (residual wins only ≥1280); 7 blocks render correctly;
     bounded residuals dormant outside their band. Per-block visual-diff reports written.

2. **Task 2 — option-picker pills. RESOLVED** (already fixed by D301/D302 + the re-clone): selected pill
   = 10% pink tint, resting = cream/beige/muted, font-size 14px, text-align left. Verified live.

3. **Task 1 / Mechanism 2 — section-heading letter-spacing. Fixed THEME-SIDE (`da58ea48`).** Root cause:
   the Mama's snapshot imposed arbitrary `h1 -0.022em`/`h2 -0.015em` (copied identically into all 6 client
   snapshots, not from any draft). Removed them → section h2s render **`normal`** (matching the draft);
   hero h1 keeps its **−1px** (from the block lift). Pushed to sandybrown `wp_global_styles`; verified live.

## Current State
- **Branch:** `main` — pushed through `83d133aa` (D303 core). Local commit `da58ea48` (mamas snapshot M2)
  + this handoff's doc commits NOT yet pushed — push at session end.
- **Tests:** 440 converter tests pass. **Build:** green (all prebuild gates incl. cheat-gate 0-new, F5/F6,
  visual-diff). **Deploy:** sandybrown plugin + page-8 re-clone + snapshot all deployed; OPcache reset.

## Known Issues / Follow-ups (parked precisely)
- **`P-EFFECTIVE-VALUE-TYPOGRAPHY-LIFT`** (Bean-directed "we should have a mechanism that can deal with it if
  necessary") — the GENERAL robustness mechanism: the converter should lift the draft's EFFECTIVE
  (inherited/initial) letter-spacing + line-height so a clone overrides ANY theme default, not just the
  arbitrary one removed this session. Spec 31 FR-31-5.1 extended from text-align → letter-spacing/line-height.
  Fresh-session build (changes conformance goldens — STOP-60 care). The theme-side fix holds the current
  clone meanwhile.
- **`P-SNAPSHOT-ARBITRARY-LETTER-SPACING`** — the other 5 client snapshots carry the same arbitrary heading
  letter-spacing; batch-remove when each is next built.
- **MEMORY.md at 22KB** — compact to <17KB (one line per entry) next housekeeping pass.

## Files Modified (D303)
| File | What |
|---|---|
| `plugins/sgs-blocks/scripts/converter/services/styling_helpers.py` | `bound_residual_media_conds` (tier-confined bounding) + F-ii wiring |
| `plugins/sgs-blocks/includes/custom-css.php` | residual scoped `.uid.uid` (class-match) |
| `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` | E8 recognises `.uid` class-scoped overrides |
| `plugins/sgs-blocks/src/blocks/{button,text,feature-grid,multi-button,mega-menu,mobile-nav,collapsible-text}/render.php` | `#uid`→`.uid.block` + `$uid` added to class list |
| `sites/mamas-munches/theme-snapshot.json` | removed arbitrary h1/h2 letterSpacing (M2) |
| `.claude/specs/31-*.md`, `32-*.md`, `decisions.md` (D303), `parking.md` | architecture + follow-ups |
| `reports/visual-diff/{feature-grid,multi-button,text}-2026-07-10.md` | LANDED reports |

## Key Lesson (captured)
- **`normalise-scope-needs-uid-as-class-not-just-selector`** — moving per-instance scope `#uid`→`.uid`
  needs the uid ALSO as a CLASS on the element; several blocks apply it as an id only, so a selector-only
  change is a silent render no-op (build GREEN, multi-button rendered `display:block`) — caught only by the
  live 375/768/1440 check. STOP-21 reinforced (emit-green ≠ LANDED).

## Next Session Prompt
See `.claude/next-session-prompt.md` — the effective-value typography-lift MECHANISM (`P-EFFECTIVE-VALUE-TYPOGRAPHY-LIFT`).
