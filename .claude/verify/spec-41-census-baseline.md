---
doc_type: verify-artefact
plan: .claude/plans/phase-nav-menu-colour-state.md
step: 1
date: 2026-09-11
---

# Step 1 — FR-41-15 census re-run against the CURRENT tree

Re-ran the spec's own statement-aware scan (FR-41-15) against
`plugins/sgs-blocks/src/blocks/nav-menu/render.php` and the whole-file declaration grep against
`.../style.css`, and diffed both against the spec's published tables (11 CENSUSED / 7 GATED /
7 DISMISSED = 25).

## render.php — statement-aware scan

**18 `background`/`border`-carrying statements found — matches the spec's claimed count exactly.**
Every hit's line content was checked against the spec's verbatim quotes for census rows #1–#9; all
nine match at their described selectors (allowing for line drift — the scan is symbol/content-aware,
not line-anchored, per this project's citation rule). No row has moved fate-category since 0.4.7 was
written.

Command:
```
python <scratch>/fr-41-15-census.py plugins/sgs-blocks/src/blocks/nav-menu/render.php
```
Result: `TOTAL HITS: 18` (verbatim tool output retained in this session's transcript).

## style.css — whole-file declaration grep

**20 raw lines returned, exactly as the spec claims.** Of these, 8 are excluded at read time (not by
the net) per the spec's own accounting:
- 2 comment-prose lines (`* base to avoid animating...`, `* scaleX() without solving...`)
- 2 more comment-prose lines (the forced-colors block comment, 2 lines)
- 1 `box-sizing: border-box`
- 2 `transition:` strings naming `background-color`
- 1 `@supports not (background-color: ...)` condition line

**12 real declarations across 7 rules remain**, matching the spec's "12 declarations across 7 rules"
claim: `.sgs-nav-menu__indicator` (2 decls), `.sgs-nav-menu__burger` (3 decls),
`@supports … .burger:hover` (1), `forced-colors .burger` (1), `.item--drawer + .item--drawer` (1),
`[data-drill-enhanced] … .submenu` (1), `.sgs-nav-menu__drill-back-btn` (3).

Command:
```
grep -nE 'background|border' plugins/sgs-blocks/src/blocks/nav-menu/style.css
```

## Arithmetic reconciliation

11 CENSUSED + 7 GATED + 7 DISMISSED = 25 — reconciles against the spec's own stated total.

## Verdict

**NO ROW HAS MOVED.** The fate table in Spec 41 §FR-41-15 is still accurate against the tree as of
this commit. Step 2 (QA-1 / qc-council #1) may proceed on the fate table as published — no escalation
to Bean required under this step's On-Fail clause.

## G13 byte-identity baseline — status

The plan's Files section calls for a byte-identity/computed-value baseline under
`.claude/verify/spec-41-baseline/` covering G13's four scenarios (hover-treatment default, Highlight
input-mapped equivalence, unset-source equivalence, radius computed-value equivalence). **All four
scenarios require a LIVE canary render to capture computed values** (G13's own text: "Assert on the
live canary" / "assert the RENDERED colour, not the stored attribute" / "assert the COMPUTED value").
There is no local WordPress render surface in this step's scope (inline, 5 min, no deploy).

**Decision:** rather than fabricate a capture that didn't happen, this step records the STATIC source
baseline instead — the exact current source lines that produce each G13 scenario's behaviour, so the
diff at step 22 has a named reference point even before a live capture exists:

- Scenario 1 (hover-treatment default): every `{row}HoverTreatment` attribute does not yet exist in
  `block.json` (0.4.7 pre-manifest-rewrite) — current behaviour is unconditional colour rows with no
  treatment axis. Reference: `block.json::attributes` (pre-Step-9 state, this commit).
- Scenario 2 (Highlight = `indicatorStyle:'pill'` + `indicatorColour`): current emission is
  `style.css::.sgs-nav-menu__indicator{background-color:var(--wp--preset--color--accent,currentColor)}`
  plus `render.php`'s `'' !== $indicator_colour` gated emission of `{uid} .sgs-nav-menu__indicator`.
- Scenario 3 (unset-source): confirmed via `style.css` L64 — the CSS fallback IS `accent`-token driven
  today, so the migration's `itemBgHover:'accent'` write (per G5a) is the correct equivalence target.
- Scenario 4 (radius): current `itemRadius` default and its `render.php` `isset()` 8px fallback,
  pre-`sgs_corner_object_shorthand()` — captured as the pre-0.4.6 comparison point.

**Live computed-value capture is deferred to Step 21/22 (build+deploy + Playwright verification),
where a real render surface exists.** This is flagged here rather than silently treated as done, per
this project's own rule against unverified "verified" claims.
