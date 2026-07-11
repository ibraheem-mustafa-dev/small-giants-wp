---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-11
session: D309 — page-8 Fix 5 (universal hover) LANDED + Part F editor controls + team-member duplicate-control cleanup
---

# Session Handoff — 2026-07-11 (D309)

## Completed This Session

1. **Fix 5 — universal hover, LANDED + live-verified.** A cloned draft `:hover` declaration now transfers to the block's `{attr}Hover` companion. Cause proven on the REAL node (the CSS collector silently dropped every `:hover` rule). Reshaped twice by Bean mid-design (both improvements).
2. **Fix 5a — hover-attr naming standardisation (`254f5b97`).** 70 hover-attr declarations across 17 blocks moved prefix→suffix (`hoverX`→`Xhover`) to match button + the tier grammar. Scripted (`scripts/rename-hover-attrs.py`), build green (dead-control 0 net-new), DB reseeded, icon legacy fallback removed. `--no-verify` (logic-only, Bean-authorised).
3. **Fix 5b — converter mechanism (`018a8276`, D309).** Hover is a MODIFIER APPEND like a tier — `collect_state_decls_for_element` reuses the base matcher on a per-state pseudo-STRIPPED rules copy (state cannot leak into base by construction); `Decl.state` + `typography.resolve` appends the suffix; both CSS families; `text-decoration`/`text-transform` brought into the typed-lift scope. NO `property_suffixes` migration. Suite 448 pass. qc-council (3 raters) caught the fall-through trap + WCAG focus-visible risk pre-build.
4. **Fix 5 — LANDED.** Deploy + reclone page 8 + CDN clear + OPcache. Live: announcement "Find out more" = `text-decoration:none` at rest, `underline` on hover+focus-visible. Emitted `"textDecorationHover":"underline"`.
5. **Fix 5 docs (`cb1a782e`).** D309 in decisions.md + Spec 31 §3.A.4a (state re-append) + §3.B B2 framing correction + repo-root visual-diff report.
6. **Part F — editor controls (`27e0f517`).** `TypographyControls` gained opt-in text-decoration / text-transform / letter-spacing controls (enabled on sgs/text) + an opt-in hover section (default off = gate-safe). Button NOT wired to the helper (Bean-confirmed).
7. **team-member duplicate-control cleanup (`27e0f517`).** Removed 8 redundant `sgsHover*` declarations from team-member/block.json — the central `hover-effects.js` extension injects them into every block; team-member was the only one that also hardcoded them. DB reseed: 0 drift.

## Current State
- **Branch:** `main` at `27e0f517` (D-ceiling **D309**).
- **Tests:** converter suite 448 pass, 1 skip (445 + 3 new `test_hover_state_lift.py`).
- **Build:** green (dead-control 0 net-new, control-ux clean, F5/F6 + cheat-gate 0 NEW, webpack OK).
- **Uncommitted:** doc updates (this handoff + state + next-session-prompt) — committed at close.
- **Deploy:** sandybrown page 8 = fresh reclone with Fix 5 LANDED; CDN + OPcache cleared.

## Known Issues / Blockers
- None block next session. DB has orphaned old prefix-hover property rows + team-member's removed attrs — a `/sgs-update --stage 10` prune cleans them (non-blocking; converter looks up by exact name).

## Next Priorities (in order)
1. **Fix 2 — product-card CTA = full button capability** (composite-mirror; converter lifts `ctaPreset`+raw hex; purge the private `--sgs-product-card-btn-text` divergence).
2. **Fix 4 — labels attribute-driven pill** (Option B, research-settled: ungate padding/bg/radius so they paint when set; keep "plain" via empty defaults).
3. **Fix 9 — inline-styles / Spec-32 investigation** (Bean-raised; read-only first).

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/{17 blocks}/{block.json,render.php,edit.js}` | hover-attr prefix→suffix rename |
| `plugins/sgs-blocks/scripts/rename-hover-attrs.py` (new) | scripted rename tool |
| `plugins/sgs-blocks/scripts/converter/{context.py,services/styling_helpers.py,services/css_pass.py,resolvers/typography.py,resolvers/styling_content.py,db/db_lookup.py}` | hover state axis + text-decoration/transform lift-scope |
| `plugins/sgs-blocks/scripts/converter/tests/test_hover_state_lift.py` (new) | headline + fall-through-trap regression |
| `plugins/sgs-blocks/src/components/TypographyControls.js` | opt-in decoration/transform/letter-spacing + hover controls |
| `plugins/sgs-blocks/src/blocks/text/edit.js` | enable the 3 base controls |
| `plugins/sgs-blocks/src/blocks/team-member/block.json` | remove 8 redundant sgsHover* |
| `.claude/decisions.md`, `.claude/specs/31-…md`, `reports/visual-diff/universal-hover-2026-07-11.md` | D309 + Spec 31 §3.A.4a + report |

## Notes for Next Session
- **Computed-parity % is NOT a fidelity measure (Bean-corrected).** Never cite the aggregate parity number as an outcome — use direct per-element computed-style matched by content + Bean's eye.
- **Register/handoff mechanisms are unreliable** — prove every cause on the live DOM / a real-node converter trace before building (held again this session — the collector cause was code+draft-verified, not assumed).
- **Hover = modifier append (like a tier), no property_suffixes derivation.** Standardise a naming convention BEFORE building the mechanism that depends on it (the 17-block rename unlocked the universal converter routing).
- Fix 5 Part E/G (wire button to the shared typography helper) is DELIBERATELY skipped — the button hover is already correct and deferral preserves the combined `:hover,:focus-visible` WCAG rule.

## Next Session Prompt
See `.claude/next-session-prompt.md`.
