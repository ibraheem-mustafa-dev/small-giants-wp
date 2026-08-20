---
doc_type: report
project: small-giants-wp
created: 2026-08-20
subject: R3-b — why the two unwired detectors were NOT wired, and the 4 real defects they found
---

# R3-b is BLOCKED — deliberately, on evidence

The R-3 register's R3-b says: *"Add to `prebuild`: `check:inert-controls`, `check:undeclared-attrs`,
`check:device-toggle:gate`. Mechanical. May fail the build on day one → land with a recorded baseline."*

**Measured, like-for-like, with the `--check` flag they would actually be wired with:**

| Script | `--check` exit | Findings |
|---|---|---|
| `check-inert-controls.py` | **1** | 1 inert control (0 unconditional, 1 conditional) |
| `check-undeclared-attrs.py` | **1** | 3 undeclared attributes |

⚠ Measurement note: run WITHOUT `--check` both exit 0. The exit codes only diverge under the flag —
comparing the two invocations would manufacture a false "safe to wire" reading.

Wiring them today therefore **reds the build immediately.**

## Why they were NOT baselined instead

The register's fallback is "land with a recorded baseline". **Refused here, deliberately.** All four
findings are REAL, live defects with client-visible consequences — not historical noise. Baselining
four genuine bugs to turn a build green is how a gate becomes decoration. Fix the defects, then wire
the gates; the gates then start life green and meaningful.

## The 4 defects (fix these, then wire)

| # | Block | Defect | Consequence |
|---|---|---|---|
| 1 | `sgs/text` | `fontSizeMobile` destructured in `edit.js`, **not declared in `block.json`** | The EDITOR drops it, so the value can never be stored — **a client setting a mobile font size gets nothing.** ⚠ See the mechanism correction below. |
| 2 | `sgs/text` | `fontSizeTablet` — same | Same, for tablet. |
| 3 | `sgs/quote` | `backgroundColourHoverGradient` — same | The hover-gradient control does nothing. |

## ⚠ MECHANISM CORRECTION (2026-08-20, same day — commit `e81ea92a`, parallel session)

An earlier version of this report said WordPress "silently discards" an undeclared attribute,
citing D338. **That rule is only half true, and the half this report leaned on was the false half.**

Per WP core `WP_Block_Type::prepare_attributes_for_render()`, an undeclared attribute is skipped over,
not `unset()` — so it reaches `$attributes` in `render.php` VERBATIM. It is the **editor** that drops
it, because `getBlockAttributes()` builds its result by iterating the registered schema, so an
undeclared key cannot appear there.

**The four defects above still stand**, because the editor is the surface that matters here: the
control writes a value the editor cannot carry, so nothing is ever persisted for `render.php` to
receive. But the reason is "the editor cannot hold it", NOT "WordPress discards it at render". Do not
repeat the discarded-at-render wording — it will send someone hunting in the wrong file.
| 4 | `sgs/feature-grid` | `layout` is a CONDITIONAL inert control (`feature-grid/render.php:156`) | A control that cannot always affect output. Note this block's *separate* misleading "Layout type" dropdown was already removed at D700 — check whether these are the same root cause before fixing. |

⚠ **Do NOT "fix" 1-3 by declaring the attributes and stopping there.** Declaring an attribute only
stops WordPress discarding it; it does not make `render.php` consume it. Verify the render side
consumes each one — that is exactly the edge the new R3-e rule was built to check. A declare-only fix
would move the defect from "silently discarded" to "declared and still ignored", which is worse
because it then looks correct.

## `check-device-toggle:gate` — also not wired, different reason

It is a LIVE editor test (it drives a real block-editor canvas and resizes the iframe). Per the
register's own "explicitly NOT doing" list, gating on a check that warns-and-passes when the canary is
unreachable proves nothing. It PASSES today — see
`.claude/reports/2026-08-20-r3g-unwired-detectors-first-run.md`.
