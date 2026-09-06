---
doc_type: report
project: small-giants-wp
created: 2026-08-20
revised: 2026-08-20 (same day — the four "defects" were re-diagnosed properly; only ONE was real)
subject: R3-b — why the two unwired detectors were NOT wired, and what their findings actually were
---

# R3-b — the detectors are honest; my first reading of their findings was not

## ⚠ READ THIS FIRST — this report's original conclusion was WRONG

The first version of this report claimed all four findings were "REAL, live defects with
client-visible consequences" and refused to baseline them on that basis. **Re-diagnosed against
source: only ONE of the four is a real defect.** The refusal to wire was still right, but for a
weaker reason than originally stated.

The error was the classic one this project has a rule against: I read a detector's output and
described it as a defect **without opening the code it pointed at**. The detectors were correct in
every case — they reported exactly what they claim to report ("declared/destructured here, not
declared there"). The false step was mine, in translating each finding into a client-facing
consequence I had not verified.

## The four findings, properly diagnosed

| # | Finding | Verdict | Reality |
|---|---|---|---|
| 1 | `sgs/text` :: `fontSizeMobile` | **NOT a defect — dead code** | `fontSize` on this block is a **TIER OBJECT** (`{"type":"object"}`, `{desktop,tablet,mobile}`) per the Spec 35 tier-object migration. `TypographyControls`' tiered branch (`TypographyControls.js:335-340`) writes the tier object and **never** writes the flat legacy pair. The two names were destructured at `text/edit.js:332-333` and used **nowhere** in the file (grep: 3 hits total, 2 being the destructure itself and 1 a comment). Responsive font size WORKS. |
| 2 | `sgs/text` :: `fontSizeTablet` | **NOT a defect — dead code** | Same. |
| 3 | `sgs/quote` :: `backgroundColourHoverGradient` | ✅ **REAL DEFECT** | `edit.js:431-433` writes it via `setAttributes`; `render.php:155` reads it; `block.json:45` maps it as the hover state's `css:background-image`. But it was **absent from `attributes`**, while all three siblings (`backgroundColour`, `backgroundColourGradient`, `backgroundColourHover`) were declared `{"type":"string","default":""}`. The editor cannot carry an undeclared key, so the value never persisted and the hover gradient did nothing. |
| 4 | `sgs/feature-grid` :: `layout` (conditional) | **NOT a defect — deliberate** | `render.php:156` does `$attributes['layout'] = 'grid';` inside a branch, with a comment explaining why: it forces the shared wrapper's grid engine to run for the explicit-template case. The gate correctly classifies it CONDITIONAL/MEDIUM. It is a documented override, not an inert control. |

**Fixed:** #1 and #2 — the two dead destructure lines deleted, and the misleading comment at
`text/edit.js:482` rewritten to state that `fontSize` is a tier object here and the flat pair must
not be re-added. #3 — declared, matching its siblings. #4 — no change; it is correct as written.

## The mechanism, stated correctly (this was also wrong first time)

The original report said WordPress "silently discards" an undeclared attribute, citing D338.
**Half true, and it leaned on the false half.** Per the parallel session's `e81ea92a`, verified in WP
core: `WP_Block_Type::prepare_attributes_for_render()` *skips over* an unregistered key rather than
`unset()`-ing it, so an undeclared attribute reaches `$attributes` in `render.php` verbatim. It is
the **editor** that drops it, because `getBlockAttributes()` builds its result by iterating the
registered schema.

For finding #3 the outcome is the same — the editor can never hold the value, so `render.php` never
receives one — but the reason is "the editor cannot carry it", NOT "WordPress discards it at render".
Do not repeat the discarded-at-render wording; it sends people hunting in the wrong file.

## Is R3-b still blocked?

**Yes, but re-check before assuming.** The refusal to wire was originally justified by "these are four
real defects". That justification is now down to one, and it has been fixed. Re-measure both scripts'
`--check` exit codes: if they are now 0, wire them; if they still exit 1, read what remains and
diagnose it **by opening the code**, not by paraphrasing the finding text.

⚠ Measurement note that caused a separate error today: run WITHOUT `--check` these scripts exit 0;
only under `--check` do they exit 1. Two subagents reported "exit 0 → 0" having measured without the
flag, and one of those changes redded the build. **Always measure with the flag the gate is actually
wired with.**

## `check-device-toggle:gate` — still not wired, unchanged reason

It is a LIVE editor test (it drives a real block-editor canvas and resizes the iframe). Per the R-3
register's own "explicitly NOT doing" list, gating on a check that warns-and-passes when the canary is
unreachable proves nothing. It PASSES today — see
`.claude/reports/2026-08-20-r3g-unwired-detectors-first-run.md`.

## The lesson worth keeping

A detector's finding is a **pointer**, not a diagnosis. "Declared here, not declared there" is a fact
about two files; what it MEANS for a client requires opening both. Three of four findings here were
true facts and false defects. Baselining them would have been wrong; so was calling them bugs.
