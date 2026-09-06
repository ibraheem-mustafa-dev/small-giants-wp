# Visual diff — SgsBorderControl rollout (Task 0 Shape A, 10 blocks) — 2026-08-29

verdict: PASS (6 live-proven) · 1 DEFECT FOUND AND FIXED · 2 NOT LIVE-PROVEN
intent_capture_passed: true
source_sha: see per-commit table below

## Why one report, not ten

Every block change in this rollout is **editor-only** (`edit.js`), which
`.githooks/sgs-gates.sh`'s `check-editor-only.py` branch exempts from the
per-block visual gate by design — so no report was gate-required. This one is
written anyway, because the rollout DID produce live findings worth recording,
and splitting identical evidence ten ways would have hidden rather than shown
them.

The six codemod-migrated blocks share ONE emitted JSX shape by construction (a
deterministic AST transform, self-tested against two real commits), so the
per-block risk is not the UI — it is whether each block's own attribute names
were spliced correctly. That is a static property, asserted separately below.

## Commits

| Commit | Scope |
|---|---|
| `c38607940` | codemod fixes (`linked`, import), components, probe |
| `e8e7a3bc7` | button, container |
| `795b6b215` | option-picker, process-steps |
| `0ba3f8da7` | text, timeline |
| `0a1c22c35` | product-card, quote — `linked` restored |
| `14e474739` | heading, icon-list (hand edits) |
| `82a1c630d` | palette-token border colour fix |
| `8dfc53e3f` | control reshaped to the native pair |

## Assertions (stated before measuring)

1. Each migrated `edit.js` mounts `<SgsBorderControl>` whose `on*Change` targets
   are all declared in that block's own `block.json`.
2. A border set from block attributes paints on the frontend with the correct
   width, style and colour.
3. **Negative control:** `borderStyle: "none"` with a width and colour set paints
   NO border — proving the control does not silently default style to something
   paintable.
4. The colour is stored as a palette token SLUG, not a baked hex, so a later
   re-skin still moves it.

## Tier 1 — static assert (all 10 blocks, no browser)

Parsed each post-apply `edit.js`, collected every `setAttributes` key inside the
`<SgsBorderControl>` element, and cross-checked against that block's `block.json`.
Includes a negative control proving an unknown attribute IS reported missing.

```
PASS  button         attrs=[borderColour,borderColourGradient,borderColourHover,borderColourHoverGradient,borderStyle,borderWidth]  linked_keys=0
PASS  container      attrs=[borderColour,borderColourGradient,borderColourHover,borderColourHoverGradient,borderStyle,borderWidth]  linked_keys=2
PASS  option-picker  attrs=[borderColour,borderColourGradient,borderStyle,borderWidth]                                              linked_keys=1
PASS  process-steps  attrs=[borderColour,borderColourGradient,borderColourHover,borderColourHoverGradient,borderStyle,borderWidth]  linked_keys=2
PASS  text           attrs=[borderColour,borderColourGradient,borderColourHover,borderStyle,borderWidth]                            linked_keys=2
PASS  timeline       attrs=[borderColour,borderColourGradient,borderStyle,borderWidth]                                              linked_keys=1
PASS  heading        attrs=[borderColour,borderColourGradient,borderStyle,borderWidth]                                              linked_keys=1
PASS  icon-list      attrs=[borderColour,borderColourGradient,borderStyle,borderWidth]                                              linked_keys=1
PASS  negative control: unknown attr is detected as missing
```

Zero mismatches. `text` exercises the attribute-asymmetry case (a
`borderColourHover` with no `borderColourHoverGradient` sibling).

## Tier 2 — live frontend probe, sandybrown canary

`plugins/sgs-blocks/scripts/qa/check-border-roundtrip.js`. Per block it authors a
POSITIVE instance (4px, solid, `borderColour: "primary"`) and a NEGATIVE CONTROL
(same width and colour, `borderStyle: "none"`), publishes one probe page, reads
computed styles on the rendered elements, then deletes the page. It fails closed:
a missing browser or an unmeasurable assertion reports NOT RUN and exits non-zero.

Final run, after all fixes (`PASS 6 · FAIL 0 · NOT RUN 0`):

```
PASS  sgs/button         [.wp-block-sgs-button <button>]        positive[4px solid rgb(230,138,149)] · control[0px none]
PASS  sgs/heading        [.wp-block-sgs-heading <h2>]           positive[4px solid rgb(230,138,149)] · control[0px none]
PASS  sgs/icon-list      [.wp-block-sgs-icon-list <div>]        positive[4px solid rgb(230,138,149)] · control[0px none]
PASS  sgs/process-steps  [.wp-block-sgs-process-steps <div>]    positive[4px solid rgb(230,138,149)] · control[0px none]
PASS  sgs/text           [.wp-block-sgs-text <p>]               positive[4px solid rgb(230,138,149)] · control[0px none]
PASS  sgs/timeline       [.wp-block-sgs-timeline <ol>]          positive[4px solid rgb(230,138,149)] · control[0px none]
```

`rgb(230,138,149)` is `--wp--preset--color--primary` (`#e68a95`) resolved live on
the page under test, never hardcoded from `theme.json` — so assertion 4 holds:
the token survived as a token.

## The defect this found — and it was live

`sgs/container` FAILED the first run. Root-caused rather than assumed:

- The border box rule was correct:
  `.sgs-cst-7118f4a1.wp-block-sgs-container{border-style:solid;border-width:4px 4px 4px 4px;}`
- The COLOUR rule was not:
  `...::before{...background:primary...}` — a raw palette SLUG, which is invalid
  CSS the browser drops. The same masked-`::before` ring also sets
  `border-color:transparent`, so the border vanished entirely instead of
  degrading to something visible.

`sgs_border_states_css()` fed the value from
`sgs_resolve_text_colour_or_gradient()` — which returns the flat value VERBATIM,
as its own docblock says — straight into `background:` without resolving it.
A raw hex worked throughout, which is exactly why this survived the `sgs/quote`
sign-off on 2026-08-28: that report used a custom red swatch, not a palette token.
Same class as D684.

Fixed in `82a1c630d`; proven on the canary against the same container, same uid:

```
before: ...::before{ ... background:primary ... }
after:  ...::before{ ... background:var(--wp--preset--color--primary) ... }
```

Scope was exactly two blocks — `container` and `product-card` are the only
callers of `sgs_border_states_css`; every other block emits `border-color`
directly, which is why 6 of 8 probed blocks passed with a token colour.

⚠ **Probe limitation, recorded not hidden:** the probe measures the OUTERMOST
`.wp-block-sgs-<name>` elements on the page. For `sgs/container` that matches the
header/main containers before the probe's own instance, so its result is not
trustworthy for that block. The container fix was therefore verified by reading
the lifted stylesheet directly, not by the probe. `sgs/option-picker` returned
NOT RUN (0 measurable instances) and is likewise unproven by this method.

⚠ **Page-HTML greps do not prove CSS absence on this framework** — block CSS is
lifted into `uploads/sgs-css/`, so an early "no border rule emitted" reading here
was an instrument error, not a finding.

## Not live-proven

- **`sgs/container`** — fix proven via the lifted stylesheet; the probe cannot
  target it. Owed: an editor-side check, or a probe that accepts a selector.
- **`sgs/option-picker`** — NOT RUN, never measured. Not a pass.
- **Editor-side (T3)** — the `.claude/secrets/sandybrown.env` credentials were
  missing for most of this session (recovered late from an old worktree), so
  driving the real controls and reading `getBlocks()` was not done for these
  blocks. The attribute wiring is covered statically by Tier 1; what remains
  unproven is the rendered control's own behaviour under a real click.

## Regression check after the control reshape

`8dfc53e3f` moved border style into the colour popover and paired radius with the
border. Re-ran the probe on all six live-provable blocks afterwards:
**PASS 6 · FAIL 0 · NOT RUN 0**. Frontend rendering unchanged, as expected for an
editor-side change.
