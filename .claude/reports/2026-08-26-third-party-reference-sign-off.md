# Third-party reference sign-off — 2026-08-26

**Source:** `.claude/reports/2026-08-26-third-party-reference-audit.md` (Step 1 audit).
**Decision:** Bean approved the full set as drafted, via `AskUserQuestion`, both questions answered
"Recommended" — no counter-proposals. Nothing rejected.

This file is the ready-to-apply list for Step 4. Apply exactly as written below — no
re-interpretation. ⚠ Some of these lines sit in `wave-gradient.js`'s docblock, the same file Step
4's bug fixes (context-loss, `hexToRgb`, capability gate) also touch — apply these reference edits
and the bug fixes in the SAME commit, same agent, per the plan's serialisation constraint (PD-6).

## (a) MIT ATTRIBUTION — NO ACTION (2 lines)

Do not touch. Licence-required.

| File:line | Text |
|---|---|
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:59` | `* is "based on the original vertex shader used by stripe for their gradient".` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:62` | `* what this block is for) and must stay; it is not a claim about stripe.com now.` |

## (b) RESTATE — apply exactly (9 lines)

| File:line | Replace with |
|---|---|
| `plugins/sgs-blocks/assets/css/fx-cursor-field.css:226-227` | `* three. This is a documented mesh-gradient technique, not an` / `* invention.` |
| `plugins/sgs-blocks/includes/fx-wave-gradient.php:33-36` | `* THREE IS NOT ARBITRARY — it matches the layer count used by the MIT-licensed` / `* reference implementation this technique is modelled on (a base colour plus an` / `* array of wave layers, each with its own colour and noise field). The` / `` * shader's `WAVE_LAYERS` constant must match this count.`` |
| `plugins/sgs-blocks/src/shared/effects/fx-wave-gradient.js:10-11` | `* Bean's ruling (2026-08-25): animate autonomously rather than following a` / `* pointer. That choice fixes the mobile problem — a` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:8-9` | `* ⛔ THIS IS NOT A MODEL OF ANY LIVE COMMERCIAL SITE'S CURRENT TECHNIQUE.` / `* Corrected 2026-08-25 — an earlier version of this docblock claimed it matched` / `* a specific landing-page's technique; that claim was false and actively` / `* misleading.` — **CONFIRMED: genericise (Bean's call, "Recommended" both questions) — do not keep Stripe-specific wording here despite it being a correction of a prior claim.** |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:12-13` | `* The noise-displaced-plane technique matches a well-known reference` / `* implementation circulated widely from roughly 2020-21 (see the licence-` / `* provenance note below). Every tutorial and port describing this technique` / `* documents that older version — it is not what modern production sites of` / `* this kind use today...` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:21` | `* not read this file as a faithful model of any current commercial` / `* implementation.` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:122` | `/** Number of colour layers blended on top of the base — matches the reference implementation's layer count (see licence-provenance note above). */` |

## (c) DELETE (1 line)

| File:line | Action |
|---|---|
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:22` | Delete the line entirely: `` * Anatomy of the real one: `.claude/reports/2026-08-25-stripe-hero-anatomy.md`. `` — no replacement needed. |

## Verification after applying

Run `python .claude/hooks/check-no-thirdparty-attribution.py` — must exit 0 (all 10 references
resolved; the 2 MIT lines remain and are correctly excluded).
