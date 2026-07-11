---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-11
session: D310 — page-8 Fix 2 (product-card CTA) mirror sgs/button style + colour, LANDED + hover-verified
---

# Session Handoff — 2026-07-11 (D310)

## Completed This Session

1. **Fix 2 — product-card CTA now mirrors how a standalone `sgs/button` clones. LANDED + live-verified (rest AND hover).** The cloned trial CTA rendered `--primary` (draft wants `--secondary`) and the featured CTA had near-white text on pink (WCAG fail). Both fixed; every colour (rest + hover, both buttons) now exact-matches the draft.
2. **Design-gate (qc-council 2 raters + live-DOM baseline).** The gate overturned the register + my first design: editing `style.css:246` would NOT have landed (that rule loses by source order); the typed clone render already honoured `ctaStyle`; the 5 hardcoded `--primary` sites are bound-mode only. The real gap was converter-side.
3. **Converter mirror (`walk.py` + `db_lookup` + `assembly` refactor).** The nested CTA's BEM `--modifier` lifts onto `ctaStyle` via the SAME preset-modifier mechanism as `sgs/button` `inheritStyle` — new shared `db_lookup.preset_style_for_element` (factored out of assembly step 5) + `style_preset_attrs_for_identity` (surfaces the behaviour-role style attr `content_attrs_for_identity` excludes per FR-31-2.2). Universal, DB-driven, no attr/slug literal (Spec 31 §13.5). +1 regression test; suite 448 pass.
4. **Colour composite-mirror (block.json + style.css).** Emptied all 6 `ctaColour*` preset defaults AND removed the product-card's OWN divergent `.product-card .sgs-button--primary/secondary` rest+`:hover` `style.css` rules — so the CTA inherits the shared button-preset channel entirely (the client's `buttonPresets` are faithful to the draft). Removed `ctaPreset` + merged the editor to one `ctaStyle` picker + a "Reset colours to preset" button; dropped dead `data-cta-preset`.
5. **Two-pass verification (Bean caught the first miss).** First pass was resting-contrast-only → shipped a wrong hover + secondary border (`#C56A7A` not `#E68A95`, hover text stayed dark). Root cause = the divergent `style.css` rules (item 4). Fixed + verified live with Playwright `.hover()`: trial rest border `#E68A95`, both hovers dark bg + white text + dark border.
6. **Cache-bust:** bumped product-card version 1.16.11→1.16.12 — a `style.css`-only change can't reach a cached browser without a `?ver` change (the CSS is version-pinned via `register_block_type`). Render-side (block.json default) changes land fresh via inline `<style>`; file-CSS changes do not.
7. **Docs + DB:** decisions.md D310 (+ correction note); `/sgs-update --stage 1` synced the 7 changed attr rows; lesson captured (`feedback_verify_button_colour_hover_and_border_vs_draft_not_contrast_only`).

## Current State
- **Branch:** `main` at `ab8c2a64` (D-ceiling **D310**).
- **Tests:** converter suite 448 pass, 1 skip.
- **Build:** green (dead-control 0 net-new, hardcoded-render 0 net-new, webpack OK).
- **Deploy:** sandybrown page 8 = plugin redeployed with Fix 2; CDN + OPcache cleared; live-verified.
- **Uncommitted:** only pre-existing session-start dirt (HTML_Insert.html deletion, inline-styling-audit reports, lucide-icons.php, package-lock.json, phase4 reports, untracked `*.db`) — NOT this session's work, which is fully committed.

## Known Issues / Blockers
- **Cache-bust policy question for Bean:** a `style.css`-only fix needs a block version bump (or filemtime-based `?ver`) to reach cached browsers. I bumped the patch this session. Open: switch the framework to filemtime `?ver` for block styles so redeploys auto-bust without version bumps.
- MEMORY.md is ~24.7KB (marginally over the 24.4KB autoload limit) — compact at next opportunity (move oldest entries to MEMORY-archive.md).

## Next Priorities (in order)
1. **Fix 4 — labels attribute-driven pill + `fullWidth` + THE MIRROR (Bean-flagged).** The label appears TWO ways that must be functionally identical: the standalone `sgs/label` block (gift section, 2 hug-content capsules) AND a nested element baked into the trial product card ("New? Start here", full-width). The nested version must be an EXACT FUNCTIONAL MIRROR of the block — same mirror pattern as Fix 2's CTA↔`sgs/button`. Plus: ungate render padding/bg to value-presence; empty defaults; add `fullWidth` (detect via effective computed width, parent-flex aware).
2. **Fix 9 — inline-styles / Spec-32 investigation (read-only).** Enumerate live inline `style="…"` on page 8, classify vs Spec 32 §6.1, map each to source, present a register — Bean picks scope.

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/converter/db/db_lookup.py` | `preset_style_for_element` + `style_preset_attrs_for_identity` helpers |
| `plugins/sgs-blocks/scripts/converter/services/assembly.py` | step-5 refactored to the shared helper |
| `plugins/sgs-blocks/scripts/converter/walk.py` | foreign-identity arm lifts the style-preset modifier → `ctaStyle` |
| `plugins/sgs-blocks/scripts/converter/tests/test_foreign_identity_lift.py` | +ctaStyle mirror regression test |
| `plugins/sgs-blocks/src/blocks/product-card/{block.json,edit.js,render.php,style.css}` | ctaStyle enum + empty ctaColour* defaults + editor merge (remove ctaPreset) + remove divergent CSS + version bump |
| `.claude/decisions.md`, `reports/visual-diff/product-card-2026-07-11.md` | D310 + visual-diff report |

## Notes for Next Session
- **Fix 4 = the SAME mirror architecture as Fix 2.** A nested built-in element (product-card trial tag) that must reproduce a standalone block (`sgs/label`) exactly — reuse the shared-mechanism approach (composite-mirror R-31-9), don't build a bespoke path.
- **The client `buttonPresets` (and by analogy any preset channel) may be perfectly faithful to the draft** — check that BEFORE assuming the converter must lift explicit values; the fix is often "remove the per-block divergence so the shared channel governs", not "lift more".
- **VERIFY COLOUR: rest + hover, every value vs the draft — never resting-contrast-only** (this session's captured lesson; Bean caught the miss).
- **`style.css`-only change → bump `?ver` (version) or it serves stale to cached browsers.** Render-side (block.json default → inline `<style>`) changes land fresh; file-CSS does not.

## Next Session Prompt
See `.claude/next-session-prompt.md`.
