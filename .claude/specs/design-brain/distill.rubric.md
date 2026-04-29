---
target_type: skill
target_path: ~/.claude/skills/distill/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: simplification
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode distill)
---

# End-Goal Rubric — distill

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | primary_user_goal_unobstructed | 1.5 | There is one obvious primary action. The path to it is unambiguous. Users can accomplish the core task in fewer steps than before the distillation. Secondary actions exist but do not compete visually with the primary. | Multiple competing CTAs at the same visual weight. Users must parse 4–6 actions to find the primary. The simplification added progressive disclosure but the entry points themselves are confusing. |
| 2 | necessary_information_preserved | 1.3 | All information a user needs to make decisions or complete tasks remains accessible — either visible or one deliberate step away (accordion, modal, tooltip). Nothing required was removed; only clutter was removed. | Features or information needed for task completion were removed during simplification. Users hit "I can't do X anymore" moments. Simplicity achieved by hiding necessary functionality rather than genuinely reducing complexity. |
| 3 | visual_complexity_reduced | 1.2 | Colour palette reduced to 1–2 colours plus neutrals. Typography limited to one family, 3–4 sizes, 2–3 weights. Unnecessary borders, shadows, and decorative elements removed. Cards removed where spacing and alignment suffice. | Visual elements reduced in count but complexity remains — 3 font families instead of 5, but still 5 colour accents. Or decorative elements swapped for other decorative elements rather than genuinely removed. |
| 4 | information_hierarchy_clearer | 1.2 | After distillation, there is an unambiguous reading order. The most important information is most prominent. Secondary information is visually subordinate. Users know immediately what the page/component is for and what to do next. | Hierarchy flatter after distillation than before. Simplification removed the visual anchors (large headlines, prominent CTAs) that created hierarchy, leaving everything at medium visual weight. |
| 5 | no_necessary_feature_removed | 1.3 | A pre-distillation feature audit was performed. Every removed element has an explicit reason (redundant, rarely used, replaceable by progressive disclosure). Nothing was removed on aesthetic grounds alone without confirming it served no user need. | Features removed that users needed, with no alternative access path. Distillation was based on what looked cluttered, not what users actually use. Complaints require adding things back. |
| 6 | copy_distilled_too | 1.0 | Copy shortened alongside visual simplification. Active voice used throughout. Jargon removed. Headers do not restate what follows them. Each sentence earns its place. | Visual simplification thorough but copy untouched. Long paragraph introductions remain. Redundant headers. Marketing fluff not removed. The interface looks simpler but reads as complex as before. |
| 7 | code_cleaned_with_design | 1.0 | Unused CSS, dead components, and orphaned files corresponding to removed UI elements are deleted. Component tree nesting reduced where removed wrappers allowed it. The simplification is reflected in code size, not just visual output. | UI visually simplified but corresponding CSS and component code left in place. Codebase grows larger or stays the same size while the UI shrinks — dead weight remains. |

## Never Do (runtime / output anti-patterns)

- Remove necessary functionality — distill is not about feature-cutting, it is about removing obstacles
- Sacrifice WCAG-required labels and ARIA attributes for visual simplicity
- Make things so simple they become unclear — mystery is not minimalism
- Eliminate all hierarchy — some elements must stand out or users have no wayfinding
- Nest cards inside cards under any circumstance
- Remove copy without verifying the remaining copy still gives users enough information to act

## Lens 6 Anchors

Distill succeeds when the user's path to their goal is shorter and clearer, and the code reflects that reduction. Primary_user_goal_unobstructed and no_necessary_feature_removed carry the highest weights because distillation's failure modes are opposite: either the primary goal gets buried under remaining complexity, or necessary functionality gets removed in the name of simplicity. Both are failures. A grader should check: can a new user identify the primary action in under 3 seconds?
