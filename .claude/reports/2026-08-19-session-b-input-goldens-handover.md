---
doc_type: report
project: small-giants-wp
session: B (input goldens)
date: 2026-08-19
status: merged to main
---

# Session B handover — INPUT-CONTROL goldens

## What this session was

One of three parallel sessions finalising the SGS inspector-control goldens (the
canonical-shape contract per inspector control type). Session B owned 7 types:
**enum (+segmented, merged), boolean, free-text, link, icon, multi-select, date**.
Sessions A (styling primitives) and C (behaviour/structure) owned the rest.

**Branch:** `feat/goldens-input` — 7 commits + a merge of `origin/main`, merged to `main`
2026-08-19. Every commit passed the full commit-gate chain (gitleaks, cheat-gate, F5/F6,
inspector-scan, dead-controls). The merged tree was rebuilt (`npm run build`, exit 0, all
postbuild gates green) before the merge out.

## Deliverable

`plugins/sgs-blocks/scripts/consistency/goldens/input.json` — 7 rows, same shape as
`golden-controls.json`'s `controls` object. Sibling file to `goldens/behaviour.json`
(Session C) and `goldens/styling.json` (Session A); **not** merged into
`golden-controls.json` itself.

**Composer note:** verified 2026-08-19 that input.json and behaviour.json have **zero key
overlap** (7 + 7 = 14 distinct types). 5 of input.json's 7 keys (`enum`, `boolean`,
`free-text`, `link`, `icon`) also exist in `golden-controls.json` as TEMP rows from an
earlier same-day session — input.json's versions are the finalised replacements, so the
composer must **prefer input.json over golden-controls.json** for those 5, not merge both.
`multi-select` and `date` are new keys with no predecessor.

## Canonical decisions

Bean's standing requirement all session: decide from the **live editor**, not from a
description, and never treat "most adopted" as automatically correct.

| Type | Canonical | Why |
|---|---|---|
| **enum** | `SelectControl` / `ToggleGroupControl` by measured rule | See the selection rule below — the real deliverable for this type |
| **boolean** | `ToggleControl` (plain) + **new `SgsBooleanField`** for the compound case | A plain toggle needs no wrapper; a toggle that REVEALS a second control does — see below |
| **free-text** | `TextControl`/`Textarea`/`Number`/`Range` + **new `SgsFreeTextField`** (available, not required) | No live defect found; wrapper is organisational only |
| **link** | `LinkPopoverField` / `LinkPopoverContent` | Already correct — wraps core's own `LinkControl` in a popover, the same pattern core uses |
| **icon** | `IconPicker` | No core equivalent exists; core's nearest (Social Icons) is a fixed social set, not a browsable library |
| **multi-select** | **new `SgsMultiSelectField`** (wraps `FormTokenField`) | Fixes a real silent-rejection UX gap — see below |
| **date** | **new `DateTimePickerField`** (wraps core `DateTimePicker`) | All 5 existing date fields were plain text boxes; core's real picker had never been adopted |

### The enum selection rule (the type's main deliverable)

Spec 35 §3.1 states the dropdown-vs-segmented threshold is "nowhere written down, so it
cannot yet be gated". This session wrote it, and got it **wrong twice** before Bean's live
review produced the correct version. Final rule — all three must hold for segmented:

- **(a)** at most 5 options
- **(b)** NO label renders on 3+ lines in its segment (**vertical** overflow)
- **(c)** NO label's rendered line is wider than its segment (**horizontal** overflow)

⛔ **(b) and (c) are different defects and a detector checking only one misses half the
violations.** Both known violations fail on opposite axes:

| Block | Label | Lines | Failure |
|---|---|---|---|
| `sgs/container` | `Full (no cap)` (13 ch, 3 words) | 3 | **vertical** — 43px text in a 38px box, crosses both borders |
| `sgs/icon-list` | `Numbered` (8 ch, 1 word) | 1 | **horizontal** — 62px text in a 47px segment, spills 15px sideways |

A single unbreakable word never wraps, so it spills sideways instead of stacking — which
is why the line-count check alone would clear `icon-list` as healthy.

**Counter-intuitive consequence, worth keeping:** a LONGER label can be safe while a
shorter one fails. `Custom…` (7 ch) passes; `Numbered` (8 ch) fails. What matters is the
longest unbreakable run and how many break-points exist — never total character count.

**How to detect (not built — measured by hand this session):**
`Range.selectNodeContents(textNode).getClientRects()` returns one rect per rendered line.
`rects.length >= 3` is the vertical violation; `max(r.width) > segment.width` is the
horizontal one. ⚠ Element height/width are useless — the span always reports the full
segment box regardless of content, which is exactly what made an earlier "two lines"
reading wrong. **This needs a real browser; a static source scan cannot do it.**

Both violations are recorded as OPEN findings, deliberately not fixed — each needs a copy
decision (shorten the label) rather than a mechanical control swap.

## New shared components (4)

| Component | Status | Required? |
|---|---|---|
| `DateTimePickerField.js` (+`.css`) | new, 0 adopters | canonical for `date`; 5 existing text-box date fields are migration targets |
| `SgsBooleanField.js` (+`.css`) | new, 3 adopters (post-grid) | **required** for the toggle-reveals-a-control shape only |
| `SgsMultiSelectField.js` | new, 2 adopters (post-grid) | **required** — replaces raw `FormTokenField`; whole population migrated |
| `SgsFreeTextField.js` | new, 0 adopters | **available, not required** — no live defect found |

⚠ `SgsBooleanField` is deliberately **not** the primary canonical for `boolean` — plain
toggles (~155 of 158 mounts) stay on raw `ToggleControl`. Making the wrapper primary would
false-flag every one of them. The census's canonical axis checks one component per type,
so the compound-case requirement lives in a `compoundRevealCanonical` sub-field and is
**not currently machine-checkable** — recorded as a real detector gap.

## Bugs found and fixed (all live-verified on the canary)

1. **Every icon in 12 blocks rendered solid instead of outlined.** WP core's
   `.components-button svg { fill: currentColor }` beats the icon's own `fill="none"`.
   ⚠ First fix was a blanket CSS `fill:none` — **wrong**: a full scan of all 1,930 icons
   found `star-filled` is deliberately the opposite convention, and the blanket rule would
   have made it invisible. Real fix reads each icon's own fill/stroke and re-declares them
   inline (`withInlineFillStroke` in `IconPreview.js`, also applied to `IconPicker.js`'s
   grid — a second code path the first fix missed entirely).
2. **Boolean-reveal spacing (0px gap).** ⚠ First fix assumed flipping
   `__nextHasNoMarginBottom` to `false` restores a default margin. **It does not** for
   `ToggleControl` in this WP version — proven by React fiber inspection on the deployed
   page (prop correct, margin still 0px), while sibling `RangeControl`/`SelectControl` DO
   get 16px from the equivalent flag. Real fix is an explicit own CSS margin
   (`.sgs-boolean-field__reveal`), which depends on no WordPress internal. Measured 16px
   after redeploy.
3. **`SgsFreeTextField` imported `NumberControl` bare** — that export does not exist at
   runtime (only `__experimentalNumberControl`). Routed through the enforced compat
   barrel `src/components/primitives`.
4. **Two `control-parity` build-gate findings** — one genuine (props hidden inside a
   `{...spread}` the static gate can't trace), one a false positive (a JSX-shaped example
   inside a JSDoc comment read as a real mount).

## Corrections to existing docs

- **`golden-controls.json`'s `link.knownStaleTrap_link_backlog` is RESOLVED.** Spec 35 §2.6
  claims 7 blocks still use `SgsLinkControl`'s inline mount. They do not — all 8 files
  referencing it contain only migration *comments*; every live mount is
  `<LinkPopoverField>`. Confirmed by reading each file.
- **`SgsLinkControl` is dead but still barrel-exported** from `components/index.js:36` and
  name-referenced in 8 render.php comments. Cleanup opportunity, deliberately not actioned.

## Open findings (none blocking)

| Finding | Notes |
|---|---|
| 2 enum violations (`container.contentWidth`, `icon-list.markerType`) | Need a copy decision, not a swap |
| No detector for the enum rule | Needs a real browser; measured by hand this session |
| No detector for the boolean compound-reveal requirement | Census checks one component per type |
| `multi-select` near-miss entry silently clears | Mitigated via `__experimentalAutoSelectFirstMatch`; **behaviour change not re-tested live after the fix** |
| 5 date fields + 0 free-text fields not migrated to the new wrappers | Deliberate — per-block work with its own review |
| `SgsLinkControl` dead export + stale render.php comments | Small cleanup |

## Measurement discipline — what this session actually cost

Recorded because it recurred four times and Bean caught **every** instance:

> **Every wrong claim this session came from reporting a visual impression instead of
> running a measurement.** The icon fix ("checked 3 samples" → the 4th broke it), the enum
> threshold (twice — a character formula, then an eyeballed line count), and the boolean
> spacing ("looks fixed in the screenshot" → measured 0px). In every case the measurement
> took under a minute and was unambiguous.

Concrete rules earned:
- **Element height/width lie about text.** Use `Range.getClientRects()` for real line boxes.
- **Sample ≠ population.** Run the check against all 1,930 items, not 3.
- **A React prop arriving correctly ≠ the effect landing.** Verify the computed CSS.
- **Run the actual build/gate**, not a patched copy of one gate script.

## Verification state at handover

- `npm run build` exit 0 on the **merged** tree (post-`origin/main` merge), all postbuild
  gates green
- `survey-golden-conformance.js --self-test` PASS
- `survey-control-parity.py --check` PASS
- `survey-experimental-imports.js --check` PASS (+1 new reasoned exemption)
- Deployed to sandybrown twice; icon fix, boolean spacing (16px measured) and multi-select
  chip all confirmed live
- `handoff-preflight.py --check` — 1 pre-existing unrelated failure
  (`02-SGS-BLOCKS-REFERENCE.md` dangling link, a known fresh-worktree gitignore artefact)

⚠ **`DateTimePickerField` and `SgsFreeTextField` have never been rendered** — they have no
adopters yet by construction. Built, parse-checked, compiled, but not visually verified.
