---
target_type: skill
target_path: ~/.claude/skills/quieter/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: visual refinement
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode quieter)
---

# End-Goal Rubric — quieter

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | sophistication_not_blandness | 1.5 | The output feels refined and premium — like restraint was a conscious choice. Character and personality are preserved through subtle cues (tinted neutrals, precise weights, generous spacing). It could be described as "luxury," not "stripped." | The output is now generic. All colour removed, all weight reduced uniformly, all personality eliminated. It reads as a blank canvas rather than a refined one — quieter has become emptier. |
| 2 | intensity_sources_addressed | 1.2 | The specific intensity sources identified before refinement (over-saturation, contrast extremes, animation excess, visual weight competition, excessive decoration) are measurably reduced. The pre/post delta is legible. | Refinement applied uniformly to everything rather than targeting the actual sources of intensity. The loud elements remain; peripheral elements were weakened unnecessarily. |
| 3 | hierarchy_preserved | 1.3 | After quieting, clear primary/secondary/tertiary hierarchy still exists. The most important element still commands attention — just through subtlety (weight, space, position) rather than saturation or scale. | Everything reduced to the same visual weight. No anchor points. Users can no longer tell what to look at first. Quieter destroyed usability by flattening all hierarchy. |
| 4 | motion_appropriately_reduced | 1.0 | Decorative animations removed. Functional motion retained with: ease-out-quart or ease-out-quint easing only, durations 200–300ms (quieter cadence than default), travel distances 10–20px, only `transform` and `opacity` animated. No bounce or elastic. Each animation has a clear UX purpose. | Decorative animations left intact. Or all motion removed including functional feedback (button clicks, state changes, loading indicators). Default easing or bounce/elastic still in use. Durations >400ms feel laboured. Layout properties animated. |
| 5 | tinted_neutrals_used | 1.0 | Pure grays replaced with warm- or cool-tinted grays (0.01–0.02 chroma in OKLCH). No pure `#808080` or `#f5f5f5` in the output. The neutral palette adds sophistication rather than clinical flatness. | Pure grays used throughout. Or colour removed so completely that backgrounds are pure white `#ffffff` and text is pure black `#000000` — technically quiet but visually crude. |
| 6 | wcag_compliance_maintained | 1.2 | All contrast ratios still pass WCAG AA after desaturation. Reducing saturation can drop contrast — this was verified, not assumed. Focus indicators remain visible. | Desaturation caused text contrast to fail. Subtlety prioritised over accessibility. Light gray text on light background introduced during the "refinement." |
| 7 | context_informed_refinement | 1.0 | What to preserve and what to reduce was determined by the purpose and audience — a reading experience quieted differently from a dashboard, a consumer app differently from an enterprise tool. The refinement is purposeful, not mechanical. | Uniform desaturation and weight reduction applied without considering what the interface actually needs to communicate and to whom. |

## Never Do (runtime / output anti-patterns)

- Remove all colour — quiet does not mean grayscale
- Flatten hierarchy by reducing everything to the same visual weight
- Remove functional motion (state feedback, loading states) alongside decorative motion
- Use bounce or elastic easing even for the remaining subtle animations
- Place gray text on a coloured background — use a shade of that colour or a transparent variant
- Reduce saturation without verifying the resulting contrast ratios still pass WCAG AA

## Lens 6 Anchors

Quieter is the hardest of the seven modes because restraint requires precision. A grader should ask: does this feel like a confident design choice or like the designer ran out of ideas? Sophistication_not_blandness carries the highest weight because it captures the specific failure mode — quieter misapplied produces generic, not refined. Hierarchy_preserved ensures the mode doesn't strip usability in the name of calm. The motion criterion specifies preferred easing and durations because "less motion" without specifics tends to produce mechanical-feeling interfaces rather than refined ones.
