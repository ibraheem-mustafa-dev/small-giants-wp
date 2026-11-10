# Task 2 council: the round 12 commits (Spec 49 brief, 2026-11-10)

**Commits reviewed:** `f791e433b`, `ecb9f697e`, `4b3c5d95d`, `7f108546d`, `cc6f5ca3a`, `b74c498fb`, `24095ea4f`, `17f2b7115` (adds `theme/sgs-theme/inc/type-scale-ranges.php`). None had been reviewed before.

**Raters (Sonnet):**
- A ran the changed behaviour in real Chrome on local-sandybrown (`A-findings.md`).
- B reviewed the code line by line and ran the tests (`B-findings.md`).
- C checked claims, specs, gates, generated files and the DB (`C-findings.md`).

**Scope rule (brief Task 2):** fix only what Spec 49 does not replace; code it replaces gets no patchwork.

## Verdicts (main thread, each checked against code, a browser run or a PHP run)

| Finding | Raters | Verdict | Evidence | Outcome |
|---|---|---|---|---|
| Marquee overflow mode never reads the resting gaps and padding, because the ready gate marks the root first | B, C | Falsified in behaviour | `marquee-gate-check.mjs`: five overflow bars on page 5957, fresh load against resize at 29 widths from 1440 to 320; the decisions agree at every width, with the gate present | No change |
| A fitting overflow bar paints its running layout, then jumps | B | Unverified | `marquee-shift-check.mjs`: CLS 0 at 1440 and 768; the 375 shift is attributed to the footer | No change; watch on a slow connection |
| Choice flow Fit to screen does nothing without a form block on the page | A | Validated | The step computed `display:block`; about 767px of content in a 580px pane | Fixed: the fit rule makes the step a grid; after, 458 against 458, no overflow |
| `sgs_resolved_css_value` passes an unterminated quote | B | Validated | `baselines.php`: `var(--a, ')` came back unchanged | Fixed in PHP and JS; `''` after |
| An upper-case `VAR()` is wrapped as a colour slug | A | Validated | `baselines.php`: `var(--wp--preset--color--var--x, currentColor)` | Fixed in the colour and shadow helpers; returns `VAR(--x)` after |
| Type-scale lets `/*` through; fluid `vw`, `min()` and `calc()` sizes are still stepped down | A, C | Validated | `regex-check.php` | Fixed: comment markers refused; fluid sizes kept; any `clamp()` still kept as written |
| No negative-control tests for the choice-flow render wiring or the type-scale inline style | C | Valid | The tests matched stylesheet text only | Added, each with a negative control |
| Spec 01 did not record the zoom trade-off or name the type-scale code | C | Valid | `grep type-scale-ranges .claude/specs` was empty | Spec 01 updated |
| Mis-indented `var(` branch in `sgs_font_family_sanitise` | B | Valid | | Fixed |
| `sgs/media` gives the hidden tablet image eager loading and high priority; 16 eager images | A, B, C | Valid, replaced by Spec 49 | | No patch; Spec 49 AC-4 and AC-10 cover it |
| The editor shows neither choice-flow setting (wiring baseline in `7f108546d`) | C | Valid | The edit wrapper has no fit class | Logged: adding the class alone can show a clipped step, because the fit guard does not run in the editor |
| The trust bar editor previews overflow mode as always running; `fx-marquee.js` is 453 lines; `optionColumnsWide` has no `block.json` range | B, C | Valid, minor | | Logged for the motion track |
| `&` parity between the PHP and JS value checks | B | Wrong | Both refuse `&` outside a call and accept it inside | No change |

## Fix commits

All made in a worktree, rebased onto `main`, and verified in real Chrome or PHP:
- choice flow fit (`4f122f4aa`)
- quotes (`582ce1824`)
- case-insensitive `var()` (`40590e465`)
- type-scale (`176b231a4`, `e8330f6fb`)
- tests and indent (`cc1041282`)
- Spec 01 (`b98fe264f`).

The hashes change when they are cherry-picked onto `main`.

## Also fixed this session from the effects run (T12)

The gallery carousel's tablet and phone item widths (`f76f8692c`), and surface treatment on an `<img>` host (`f5d0e9810`). Both are live on sandybrown.
