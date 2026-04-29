---
target_type: skill
target_path: ~/.claude/skills/colourise/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: colour design
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode colourise)
---

# End-Goal Rubric — colourise

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | strategic_colour_purpose | 1.5 | Every colour applied has a named purpose: semantic meaning, hierarchy signal, categorisation, emotional tone, wayfinding, or delight. A reviewer can point at each colour and state exactly why it is there. | Colours scattered across the interface without semantic grounding — green used decoratively, blue applied to random cards, warm tones inconsistent. No colour earns its place. |
| 2 | brand_palette_fidelity | 1.2 | Output uses existing brand colours as the base. New colours introduced are harmonious extensions (OKLCH-derived), not arbitrary additions. Provenance is cited from ui-ux-pro-max DB or the codebase itself. | Generic purple-blue palette applied with no reference to brand colours. Arbitrary choices that clash with or ignore the established system. |
| 3 | 60_30_10_balance | 1.2 | Dominant colour owns ~60% of coloured elements, supporting colour ~30%, high-contrast accent ~10%. Neutrals carry structure. The interface feels unified, not rainbow. | Every colour gets roughly equal screen time, or one colour appears once while another dominates everything. Interface feels busy or incoherent. |
| 4 | wcag_contrast_compliance | 1.5 | All text/background combinations pass WCAG AA (4.5:1 body text, 3:1 large text and UI components). No colour used as the sole state differentiator — icons, labels, or patterns accompany every colour-coded state. | Text on coloured backgrounds fails contrast. Red/green used as the only state indicator with no accompanying label or icon. |
| 5 | ai_slop_avoidance | 1.3 | No generic purple-to-blue gradients, no arbitrary neon accents, no pure grays. Tinted neutrals used instead of `#f5f5f5`. Colour choices feel specific to this brand, not interchangeable with every other AI-generated UI. | Purple-blue gradient background, neon accents on dark surface, generic startup blue — output indistinguishable from default AI colour generation. |
| 6 | context_confirmed_before_applying | 1.0 | Target audience, brand personality, and existing brand colours were confirmed from the codebase or via user clarification before any colour was applied. The output is tailored, not assumed. | Colour applied without confirming brand context. Warm palette on a clinical tool, playful hues on an enterprise dashboard, or a wholly new palette on a brand with established colours. |
| 7 | ui_ux_pro_max_sourced | 1.0 | ui-ux-pro-max DB queried with `--domain color` before recommending palettes. At least top 3 rows applied; Provenance fields cited in output. | Colour recommendations drawn entirely from model priors, no DB query, no provenance citations. |

## Never Do (runtime / output anti-patterns)
- Apply colour to every element — when everything is coloured, nothing is emphasised
- Use pure `#000000` or `#ffffff` for large background or text areas
- Place gray text on a coloured background — use a shade of the background colour or a transparent variant instead
- Default to purple-blue gradient as the "bold" choice — this is the AI slop baseline
- Use colour as the sole indicator of state (accessibility violation)
- Introduce more than 4 colours beyond neutrals in a single pass
- Proceed without confirming that brand colours are not already established in the codebase

## Lens 6 Anchors
The end-goal is an interface that feels warmer and more meaningful — not just more colourful. A grader should check: does each colour addition make the hierarchy clearer or the emotional tone richer? If the answer for any colour is "it just looks nice," that's a miss. Brand palette fidelity and WCAG compliance carry the highest weights because they govern whether the output compounds with the existing system or fights it.
