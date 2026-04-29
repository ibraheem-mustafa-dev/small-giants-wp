---
target_type: skill
target_path: ~/.claude/skills/bolder/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: visual impact
phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode bolder)
---

# End-Goal Rubric — bolder

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|------------------|------------------|
| 1 | distinctiveness | 1.5 | The output looks like a specific, intentional creative decision for this brand. A viewer shown this cannot immediately guess it was AI-amplified. Typography, colour, and spatial choices feel owned, not borrowed from a trend catalogue. | The output looks like a textbook "AI made this bolder" result with default purple-blue gradient as the bold lever. Distinctive in the wrong direction — generically bold. |
| 2 | focal_point_clarity | 1.3 | One clear hero moment exists. The focal point is 3–5× more visually dominant than surrounding elements. Everything else supports it rather than competing. | Amplification applied uniformly — everything got bigger, heavier, or more saturated simultaneously. No hierarchy; multiple elements compete for primary attention. |
| 3 | personality_lane_coherence | 1.2 | A single personality direction was chosen (maximalist chaos, elegant drama, playful energy, dark moody, etc.) and sustained across typography, colour, spatial, and motion choices. The output feels like one voice. | Multiple personality directions mixed — heavy serif headlines paired with glassmorphism cards paired with neon motion. The output feels like a committee of trends rather than a design decision. |
| 4 | usability_preserved | 1.2 | Body text remains readable. Core user flows are unobstructed. WCAG AA contrast still met. Interactive affordances are unambiguous. The amplification is in presentation, not at the cost of function. | Body text illegible against bold backgrounds. Primary CTAs buried under decorative elements. Contrast fails. Animation distracts from task completion. |
| 5 | brand_context_respected | 1.0 | The boldness level is calibrated to the brand permission — a marketing page for a creative agency pushed further than a financial dashboard. The audience and purpose were confirmed before amplification choices were made. | Maximum boldness applied without contextual calibration. An enterprise SaaS dashboard treated like a festival landing page. Client context ignored. |
| 6 | ai_signature_density_judged | 1.3 | Purple-blue gradient avoided unless brand actively justifies it (it's the most-recognised AI tell). Cumulative AI-pattern density considered: stacking purple-blue + glassmorphism + neon-on-dark + gradient text simultaneously pushes the design into AI-slop territory even if each individual element has merit. Each AI-pattern element justified individually AND in combination. | Purple-blue gradient applied as the default "bold" direction. Or all of (purple-blue + glassmorphism + neon + gradient text) stacked without context justification — cumulative AI-slop signature density. |
| 7 | ui_ux_pro_max_sourced | 1.0 | ui-ux-pro-max DB queried with `--domain style` before recommending bold direction. Top 3 rows applied; Provenance cited in output. | Bold direction chosen from model priors alone. No DB query, no provenance citations. |
| 8 | motion_design_intentional | 1.0 | Animations match the chosen personality lane. Duration calibrated to element weight (heavy elements 350–500ms, light elements 150–250ms). Easing chosen for character: ease-out-quint for elegant drama, ease-out-back for playful energy, gentler ease-out-quart for sophisticated lanes. Bounce/elastic used deliberately when maximalist or playful personality calls for them. | Default linear or default ease applied uniformly. Durations inverted (UI elements 800ms, decorative content 100ms). Bounce/elastic on every transition regardless of personality. |

## Never Do (runtime / output anti-patterns)

- Apply amplification uniformly to every element — bold contrast requires quiet counterparts
- Sacrifice body text readability for visual drama
- Mix personality lanes (maximalist + minimal + dark moody all at once)
- Stack purple-blue gradient + glassmorphism + neon-on-dark + gradient text simultaneously without context justification — cumulative AI-slop signature density
- Apply bounce or elastic easing outside maximalist or playful personality lanes — those easings cheapen the effect in elegant or sophisticated contexts
- Proceed without confirming brand permission level and audience context

## Lens 6 Anchors

The acid test for bolder: if you told someone "an AI made this bolder," would they believe it instantly? If yes, the output failed. Distinctiveness and ai_signature_density_judged carry the highest weights because they capture the specific failure mode of this skill — AI amplification defaults to a recognisable generic aesthetic. Individual aesthetic choices (glassmorphism, neon-on-dark, gradient text, bounce easing) are legitimate when context-justified; the failure mode is purple-blue gradient as default + cumulative density without justification. The motion_design_intentional criterion ensures animation choices match the chosen personality lane rather than being applied uniformly.
