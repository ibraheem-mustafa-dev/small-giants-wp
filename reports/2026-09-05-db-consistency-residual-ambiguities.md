# db-consistency: the 3 residual routing ambiguities (2026-09-05)

Companion record for the six `[NEW]` findings left after the 2026-09-05 descriptor work took
`db-consistency` from **25 NEW violations to 6** and `check-hover-state-classification` from
**FAIL (2) to PASS** (commit `b4abced52`).

The baseline file (`plugins/sgs-blocks/scripts/db-consistency/db-consistency-baseline.json`) is a
flat list of keys with **no reason field**, so accepting a finding there is silent. This file is
that missing reason field, written *before* any baselining rather than after — because **two of
the three are real defects** and must not go quiet.

Each condition produces two keys: one from Check #1 (Routing Determinism) and one from Check #8
(Reseed-Survival).

---

## 1. `sgs/post-grid` — `background-color` on `card`, 2 attrs — RE-KEYED, ALREADY ACCEPTED

Keys:
- `amb:sgs/post-grid:background-color:typography:card:hover:None`
- `cssprop:ambiguous:sgs/post-grid:background-color::card:hover:`

`cardBgColour` and `backgroundColourHover` contend for the same routing slot.

**This condition was already baselined** as `amb:sgs/post-grid:background-color:typography:card:None:None`.
Authoring the hover states on 2026-09-05 moved the derived `css_state` from `NULL` to `hover`,
which changed the **key** without changing the **condition**. Accepting the new key is maintenance
of an already-accepted finding, not acceptance of a new one. The old key can be pruned once
confirmed dead.

**The defect underneath is real.** `post-grid/block.json` is ALREADY fully correct:

```json
"card": {
  "attrMap":  { "css:background-color": "cardBgColour" },
  "states":   { "hover": { "attrMap": { "css:background-color": "backgroundColourHover" } } }
}
```

The manifest states the resting/hover split exactly right and the classifier still derives **both**
at `state=hover`. Nothing in `block.json` can fix this.

Likely mechanism: `cardBgColour` is emitted through
`sgs_custom_property_gradient_decls( 'sgs-card-bg', … )` (`post-grid/render.php:189-193`) — a CSS
custom property rather than a direct `background-color` declaration — which may be what defeats
state attribution in the emission scan.

**Owner: `extract-signatures.py`.**

---

## 2. `sgs/responsive-logo` — `max-width` on `image`, 5 attrs — REAL DEFECT

Keys:
- `amb:sgs/responsive-logo:max-width:wrapper_css:image:None:None`
- `cssprop:ambiguous:sgs/responsive-logo:max-width::image::`

`width`, `alt`, `logoSwitchCustomPx`, `logoDecorative` and `maxWidth` all carry
`css_property='max-width'`.

**`alt` is a string and `logoDecorative` is a boolean — neither is CSS at all.**
`render.php:239-240` shows the real and only owner of `max-width` is the `maxWidth` tier object.

The block had **no `image` element in its manifest**, so every one of these attributes fell to the
heuristic path. An `image` element declaring `"css:max-width": "maxWidth"` was added on 2026-09-05
— and the finding went from **4 competing attrs to 5**.

That is the load-bearing constraint discovered here:

> Precedence is `css_property = manifest_css_property or emission_css_property`
> (`extract-signatures.py:2683`). **A manifest can only ADD the correct owner. It can never RETRACT
> a wrong heuristic assignment.**

`attr-classification-overrides.json` is not the venue either. Its own header reserves it for
genuine mis-derivations and value-type-vs-delivery mismatches — *"never to correct plain accuracy
bugs in the classifier, which should be fixed at the classifier itself."* A string attribute being
handed a CSS property is exactly a plain accuracy bug.

**Required fix, classifier-side:** never assign a CSS property to an attribute whose `attr_type` is
`string` or `boolean` and which has no manifest entry.

**This single guard closes #2 outright and is the durable fix for the whole class** — it prevents
the same shape recurring on every other block, which is the point.

**Owner: `extract-signatures.py`.**

---

## 3. `sgs/hero` — `max-width` on `split-media`, 2 attrs — GENUINE DESIGN AMBIGUITY, NOT A DEFECT

Keys:
- `amb:sgs/hero:max-width:wrapper_css:split-media:None:None`
- `cssprop:ambiguous:sgs/hero:max-width:GRID_AREA:split-media::`

`splitMediaMaxWidth` (a desktop-tier object, `render.php:777-789`) and `splitMediaMaxWidthPercent`
(a bare percentage, `render.php:791-797`) both legitimately emit `max-width` on
`.sgs-hero__split-media`.

This is **deliberate**. `render.php:792-793` states the percent rule is emitted second specifically
so it wins the cascade when an operator sets both.

Unlike 1 and 2 this is not a classifier bug — it is two real controls sharing one CSS property by
design. It still breaks **clone-time** routing, where the resolver must pick a single owner and
currently "silently picks the first by rowid order". Resolving it properly means either giving one
a distinguishing `css_tier` (`splitMediaMaxWidth` is desktop-only) or deciding the two should
collapse into one control.

**Owner: a design call on `sgs/hero`, not a mechanical fix.**

---

## Follow-up owed

| # | Condition | Nature | Owner |
|---|---|---|---|
| 1 | `post-grid` background-color | Real defect; manifest already correct | `extract-signatures.py` |
| 2 | `responsive-logo` max-width | Real defect; non-CSS attrs given a CSS property | `extract-signatures.py` |
| 3 | `hero` max-width | Legitimate design, breaks clone routing | `sgs/hero` design call |

None of the three is fixable from `block.json`. All three **predate** the 2026-09-05 descriptor
work and were surfaced, not caused, by it.

`extract-signatures.py` was modified-uncommitted in the shared tree when this was written. The
analysis was sent to the three live peer sessions rather than raced into their file; sessions
`small-giants-wp-78` and `small-giants-wp-90` both checked and confirmed the file is not theirs.
