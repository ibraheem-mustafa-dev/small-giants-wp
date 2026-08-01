# :user-valid overrides the focus ring — reproduce, diagnose, fix

**Date:** 2026-08-01
**Scope:** `plugins/sgs-blocks/src/blocks/form/style.css` only. Not deployed — canary/production still run the pre-fix CSS until the next `build-deploy.py` pass.

## 1. The problem

A field that has been blurred once (so `:user-valid` fires) permanently lost its focus-ring border colour: re-focusing that field showed the valid-green border instead of the D454/D457 focus indicator. This undoes both fixes shipped earlier today for every field a visitor has already visited.

## 2. Reproduction

Reproduced on a local fixture, NOT the live canary — see method note below.

- Fixture: `C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\d00d6015-9a9c-4ea9-87f9-ad46aebf99ed\scratchpad\user-valid-repro.html`, served over `http://127.0.0.1:8935/…` (not `file://`, which Playwright MCP blocks) with a `<link>` to the real `style.css` at its real repo path, cache-busted with `?v=repro1`. `window.location.href` reasserted before each measurement per the shared-session rule.
- Sequence: real keystrokes (`browser_type`, `slowly: true`, not `.value =` — `:user-valid` requires genuine user interaction) into a `required` text input → real blur (moved focus to a second field with a real click) → confirmed `:user-valid` true and border green while unfocused → refocused the field → measured.

**Pre-fix measurement** (before editing `style.css`):

| State | `:focus-visible` | `:user-valid` | `border-color` (computed) | Expected |
|---|---|---|---|---|
| Unfocused, after 1 blur | — | true | `rgb(46,125,79)` (`#2e7d4f`, green) | green — correct |
| Re-focused | true | true | `rgb(46,125,79)` (`#2e7d4f`, **green**) | `#0a5a5c` (focus colour) — **wrong** |

The outline ring itself rendered correctly (`color(srgb 0.039 0.353 0.361)` ≈ `#0a5a5c`, `2px solid`) — only `border-color` was wrong. Confirms the defect report exactly: the ring exists, the border colour is what's suppressed.

## 3. Root cause — specificity, not source order

Three rules compete for `border-color` on `.sgs-form-field__input`, all in the same file:

| Selector | File:line | Specificity |
|---|---|---|
| `.sgs-form-field__input:focus-visible` | `style.css:193` | (0,2,0) |
| `.sgs-form-field__input:focus:not(:focus-visible)` | `style.css:206` | (0,3,0) |
| `.sgs-form-field__input:user-valid:not(:placeholder-shown)` (pre-fix) | `style.css:744` | (0,3,0) |

`:user-valid:not(:placeholder-shown)` carries **two** pseudo-classes (`:user-valid` + the argument of `:not()`) against `:focus-visible`'s one, so it outranks the primary focus rule on specificity alone — source order is irrelevant there. Against the `:focus:not(:focus-visible)` fallback it's a specificity tie, so cascade order decides, and the `:user-valid` rule sits later in the file (line 744 vs 206) and wins that too. Net effect: **any field that has ever been `:user-valid` shows green on every subsequent focus**, both in browsers using `:focus-visible` and in the no-`:focus-visible` fallback path.

Confirmed by reading the matched CSSOM rules directly in the browser (`document.styleSheets` walk), not by inference — both competing rules showed up as literal matches on the focused, user-valid element before the fix.

## 4. Fix

Changed only the `:user-valid` rule (did not touch the D454/D457 focus block, per the brief):

```css
/* style.css, "15. :user-invalid / :user-valid" section */
.sgs-form-field__input:user-valid:not(:placeholder-shown):not(:focus) {
    border-color: var(--sgs-success-text, #2e7d4f);
    …
}
```

Adding `:not(:focus)` excludes the validation-state rule from matching whenever the field has focus at all — which covers both the `:focus-visible` case and the `:focus:not(:focus-visible)` fallback in one exclusion, since both require `:focus` to be true. This is the least-force fix available: no `!important` (rejected by the project's cheat-gate on a render surface anyway), no touching the focus rules, no reordering. A docblock was added above the changed rule explaining the specificity mechanics so a future edit doesn't quietly reintroduce the collision.

## 5. Post-fix measurement (same fixture, same sequence, cache-busted `style.css` reload confirmed via `document.styleSheets` selector text)

| State | `:focus-visible` | Selector match (`:user-valid:not(:placeholder-shown):not(:focus)`) | `border-color` (computed) | Result |
|---|---|---|---|---|
| Unfocused, after 1 blur | — | true | `rgb(46,125,79)` (`#2e7d4f`, green) | Correct — unchanged |
| Re-focused | true | **false** (excluded by `:not(:focus)`) | `rgb(10,90,92)` (`#0a5a5c`, focus colour) | **Fixed** |
| Blurred again | — | true | `rgb(46,125,79)` (`#2e7d4f`, green) | Correct — reverts cleanly |

Outline ring on refocus: `2px solid`, colour `color(srgb 0.0392 0.3529 0.3608)` = `#0a5a5c` — unchanged from before the fix, confirming the D454/D457 ring mechanism itself was never touched.

**Contrast check (WCAG 2.4.11, ≥3:1):** `#0a5a5c` against the fixture's white field background (`--wp--preset--color--surface: #fff`) computes to **7.99:1** — well clear of the 3:1 minimum. This is a fresh calculation on this fixture's tokens, consistent with the D457 docblock's own figures (3.32–19.8:1 across the 8 client palettes) — not a re-litigation of that decision.

**Valid-green-when-unfocused requirement:** confirmed still renders (table above, rows 1 and 3) — the fix only excludes the focused instant, nothing else.

## 6. What's unverified — needs a post-deploy check

I cannot deploy from this dispatch. The following need confirming once this ships to the sandybrown canary:

1. **Real form on a real page** — this was a synthetic fixture (bare `<input required>`), not a live `sgs/form` instance with the block's full markup (`.sgs-form-field__error`, `aria-describedby`, `view.js` validation JS). Confirm the same sequence (type → blur → Tab back) on an actual canary form page.
2. **Contrast against the REAL surrounding colour** — the fixture used `#fff`/`#f0f0f0` stand-ins. The ring's actual surrounding colour on a live page depends on the section background behind the field (could be `surface-alt`, a coloured section, etc.) — the D457 docblock's 3.32–19.8:1 range already covers this across all 8 client palettes, but re-confirm on whichever client's form is checked first.
3. **`:focus:not(:focus-visible)` fallback branch** — confirmed via CSSOM matching logic (the `:not(:focus)` exclusion applies identically to both focus rules), but not independently exercised with a real non-`:focus-visible` focus event (e.g. a mouse-only browser context) in this session. Low risk since the fix is selector-level and both branches share the same `:focus` gate, but flagging for completeness.
4. **Radio/checkbox `:user-invalid` outline rule** (`style.css:753-757`) was not touched and was not in scope of this defect (it targets `outline`, not `border-color`, on a different element type) — not re-verified, no reason to expect it's affected.

## Files touched

- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\form\style.css` — one selector changed (line ~744, `:not(:focus)` added), one explanatory docblock added above it.
- `c:\Users\Bean\Projects\small-giants-wp\reports\visual-diff\user-valid-ring-2026-08-01.md` — this report.

No other files were modified. No git commands were run. No deploy was performed.
