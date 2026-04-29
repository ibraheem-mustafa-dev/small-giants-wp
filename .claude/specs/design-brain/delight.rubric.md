---
target_type: skill
target_path: ~/.claude/skills/delight/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: experience personality
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode delight)
---

# End-Goal Rubric — delight

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | brand_appropriate_personality | 1.5 | Delight choices match the brand personality and audience: playful for a consumer app, subtle and sophisticated for an enterprise or luxury context, warm for community tools. Shown to the target user, the delight feels "them," not "generic fun." | Generic delight applied — confetti on every action, loading messages that would suit a gaming app applied to a B2B dashboard, whimsical illustrations on a clinical tool. The delight reads as a template layer, not a brand expression. |
| 2 | usability_not_obstructed | 1.5 | Every delight element is under 1 second, non-blocking, and either skippable or invisible during task focus. A user completing a primary task encounters no delight that slows or confuses them. Core functionality is accessible even if all delight is stripped. | Loading animation delays task completion. Celebration modal requires dismissal before users can continue. Custom cursor makes interactive elements hard to identify. Delight is visible at the cost of function. |
| 3 | natural_moment_targeting | 1.2 | Delight is applied at natural emotional inflection points — success states, empty states (first-time experience), milestones, error softening. Routine interactions (typing, scrolling, hovering nav items) are not delighted; special moments are. | Delight applied uniformly across all interactions — every hover, every click, every scroll triggers an animation. What is supposed to feel special becomes noise. Users habituate and the delight disappears. |
| 4 | freshness_over_repeat_use | 1.0 | Success animations, loading messages, or hover surprises vary across interactions or compound over time — not the same response every time. At minimum, 2–3 variants exist for high-frequency moments. The 10th use still feels considered. | Identical confetti burst on every successful save. Same loading message every time. No variation. After 3 uses the "delight" is predicted and ignored. |
| 5 | accessibility_maintained | 1.2 | All animated delight respects `prefers-reduced-motion` — animations suppressed or replaced with instant transitions. Sound effects have a mute option and respect system audio settings. Illustrated empty states have descriptive alt text. Easter eggs accessible via keyboard, not just mouse. | Animations run regardless of motion preference. Sound plays without user consent. Illustrated states have empty or generic alt text. Delight features require mouse interaction with no keyboard equivalent. |
| 6 | context_appropriate_intensity | 1.0 | Delight intensity calibrated to the emotional moment — celebration on a major milestone, gentle warmth on a routine success, empathetic tone on an error. Not every moment treated as an achievement. Intensity does not embarrass the user in a professional context. | Full confetti celebration on saving a draft. Playful copy on a critical error that needs clear recovery instructions. Delight so intense on minor actions that users feel patronised after the first session. |
| 7 | performance_not_degraded | 1.0 | All delight assets optimised — Lottie animations under 50KB, particle effects hardware-accelerated, confetti library lazy-loaded and not in the critical path. No delight feature causes measurable CLS or LCP regression. | Page LCP increases by >500ms because of an animation library loaded in the critical path. Confetti particles cause layout shift. Animated background degrades to 30fps on mid-range devices. |

## Never Do (runtime / output anti-patterns)

- Delay core functionality for a delight moment — the task always comes first
- Force users through a celebration before they can continue (modal confetti with required dismiss)
- Use delight to mask poor UX — an unintuitive flow does not become good with a fun animation
- Apply the same delight response to every interaction of the same type — variation is non-negotiable for high-frequency moments
- Play sound without respecting system mute settings or providing a product-level mute control
- Add delight to a context where the emotional register is wrong (critical errors, data loss warnings, payment failures)
- Import delight libraries into the critical render path

## Lens 6 Anchors

Delight is the only mode where doing it wrong is actively worse than not doing it at all. Brand_appropriate_personality and usability_not_obstructed carry the highest weights because mismatched delight erodes trust and blocking delight breaks the product. A grader should ask: after the 20th use, does this still feel intentional — or does it feel like a UI that won't stop performing? Freshness_over_repeat_use exists because delight that becomes predictable is no longer delight.
