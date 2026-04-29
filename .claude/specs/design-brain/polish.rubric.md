---
target_type: skill
target_path: ~/.claude/skills/polish/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: pre-ship quality
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode polish)
---

# End-Goal Rubric — polish

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | all_interactive_states_present | 1.5 | Every interactive element has all 8 states implemented: default, hover, focus, active, disabled, loading, error, success. No state is missing or obviously placeholder. Keyboard navigation works through the full flow. | Multiple interactive elements missing 2+ states. Focus styles removed without replacement. Loading spinner but no error state. Success state shows nothing. The feature feels unfinished under real usage. |
| 2 | spacing_and_alignment_systematic | 1.3 | All spacing uses the design token scale — no arbitrary `13px`, `27px`, or `calc()` approximations. Elements align to grid. Optical alignment applied where mechanical alignment creates visual off-ness (icons centred by eye, not pixel). | Mix of token-based and arbitrary spacing throughout. Grid misalignment visible at 1× zoom. Optical quirks left uncorrected (icon visually higher than adjacent text). |
| 3 | typography_detail_correct | 1.0 | Hierarchy consistent — same elements use same size/weight throughout. Line lengths 45–75 chars for body. No widows (single words on last line). Font loading handled without FOUT/FOIT. Letter spacing adjusted on headlines where needed. | Multiple elements at similar visual weights creating flat hierarchy. Body text 90 characters wide. Single orphan words on multiple paragraph endings. Fonts flash unstyled on load. |
| 4 | motion_quality | 1.2 | All transitions use ease-out-quart, ease-out-quint, or ease-out-expo. Durations 150–300ms. Only `transform` and `opacity` animated (no layout thrash). `prefers-reduced-motion` respected — animations suppressed or replaced with instant transitions. | Bounce or elastic easing on state transitions. Layout properties (width, height, top) animated causing reflow jank. No reduced-motion handling. Animations run at 60fps only on developer's machine. |
| 5 | copy_and_content_consistent | 1.0 | Consistent terminology throughout (one name for each concept). Capitalisation style applied uniformly (Title Case vs Sentence case). No typos. Punctuation consistent (periods on sentences, not on labels). No placeholder or lorem ipsum text. | Same concept called by different names on different screens. Title Case and Sentence case mixed. Obvious typos. Label text ends with periods inconsistently. |
| 6 | edge_cases_handled | 1.2 | Empty states are welcoming and informative (not blank). Long content handled gracefully (truncation or wrap, not overflow). Error states have recovery paths. Offline state handled if applicable. No layout shift on load. | Blank white space where empty state should be. Long names overflow their containers. Error states show raw error messages with no recovery guidance. Page jumps as images load (CLS). |
| 7 | ui_ux_pro_max_sourced | 1.0 | ui-ux-pro-max DB queried with `--domain ux` before prioritising polish areas. Top 3 rows inform the pass order. Provenance cited. | Polish order based on model priors alone. No DB query, no provenance citation. |

## Never Do (runtime / output anti-patterns)

- Begin a polish pass on a feature that is not functionally complete
- Introduce bugs while polishing — every change tested before moving to the next
- Use bounce or elastic easing on any transition
- Remove focus indicators without providing a replacement that passes WCAG 2.2 focus-visible requirements
- Apply "consistent quality level" by polishing one section to a high standard while leaving another rough
- Animate layout properties (width, height, padding) — only transform and opacity

## Lens 6 Anchors

Polish is the final pass before ship — it should make the feature feel effortless, not just correct. All_interactive_states_present carries the highest weight because missing states are the most common cause of "the feature works but feels unfinished." Edge_cases_handled prevents the polish from being purely cosmetic — a feature that crashes on empty state or overflows on long content is not polished regardless of how good the default happy-path looks.
