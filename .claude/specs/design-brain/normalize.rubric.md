---
target_type: skill
target_path: ~/.claude/skills/normalize/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: design system consistency
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode normalize)
---

# End-Goal Rubric — normalize

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | design_system_discovered_first | 1.3 | The design system, style guide, or token file was found and read before any changes were made. The normalisation targets are derived from the actual system, not from model assumptions about what a good design system looks like. | Changes made before looking for a design system. Custom styles invented rather than design tokens applied. Output reflects generic best practices rather than the project's actual system. |
| 2 | token_substitution_complete | 1.5 | All hard-coded colour, spacing, and typography values in the target feature are replaced with design tokens or design system classes. No `#1a2b3c`, no `px-[13px]`, no `font-size: 17px` remains where a token or scale value exists. | Some hard-coded values replaced, others left. The feature is partially normalised — a mix of token usage and arbitrary values remains, which compounds inconsistency for the next developer. |
| 3 | component_replacements_made | 1.2 | Custom one-off implementations replaced with design system equivalents where they exist. Props and variants match the established component API. No new bespoke component created when a system component covers the use case. | Custom implementations left in place. Or new bespoke components created that duplicate existing system components. Design system library grows in the wrong direction. |
| 4 | ux_pattern_alignment | 1.0 | Interaction patterns, responsive behaviour, and information hierarchy match established patterns used elsewhere in the product. A user moving between the normalised feature and adjacent pages encounters a coherent mental model. | Visual tokens normalised but UX patterns diverge. Correct colours and spacing, but the feature behaves differently — different modal patterns, different nav behaviour, different error handling. |
| 5 | orphaned_code_removed | 1.0 | Unused styles, orphaned components, and dead imports made obsolete by the normalisation are deleted. The codebase is smaller after the normalisation, not the same size with added tokens. | Old one-off styles left in place alongside the new token-based implementations. Dead code accumulates. The feature now has two style systems running in parallel. |
| 6 | no_new_divergences_introduced | 1.2 | The normalisation pass introduces zero new departures from the design system. No new one-off patterns invented to solve edge cases — if the design system has a gap, it's flagged rather than papered over with a custom solution. | The normalisation fixed existing divergences but introduced new ones. A new component pattern, a new spacing approach, or a new colour not in the token set was added during the pass. |
| 7 | ui_ux_pro_max_sourced | 1.0 | ui-ux-pro-max DB queried with `--domain typography` (or relevant domain) before recommending font pairings, scale, or typographic choices. Provenance cited. | Typography recommendations from model priors only. No DB query, no provenance citation. |

## Never Do (runtime / output anti-patterns)

- Create a new one-off component when a design system equivalent exists
- Hard-code values that should use design tokens, even if the token "looks the same" as the hard-coded value
- Introduce new patterns that diverge from the design system — flag the gap instead
- Compromise accessibility for visual consistency (contrast ratios take priority over matching the design system exactly)
- Leave orphaned styles and components that were superseded by the normalisation

## Lens 6 Anchors

Normalise is the only mode whose quality compounds into future work — every token substitution makes the next developer's job easier and every orphaned component left in place makes it harder. Token_substitution_complete and no_new_divergences_introduced carry the highest weights because a normalisation that introduces new divergences is net negative. Design_system_discovered_first gates all other criteria — without it, the "normalisation" is just guessing.
