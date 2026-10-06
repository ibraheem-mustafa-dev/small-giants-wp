# The canvas-settable claims, live-confirmed by family

Status: **17 of 63 families measured, all 17 refuted. 46 families are host-gated** and cannot be read on the
local mirror at all (see "Why the local mirror only covers 17").

Tool: `scripts/computed-route/confirm-canvas.mjs` (read-only; writes no tree, setting, page or stylesheet).

```
cd plugins/sgs-blocks
node ../../scripts/computed-route/confirm-canvas.mjs ../../sites/eye-care-ward-end/build/qa/triage out.json http://localhost:8081
```

## What the claim is

`lib/triage.mjs::canvasSettable` and the resolver-hop citation beside it class a row **W** (explained, not a
framework gap) when some OTHER block — an ancestor of the row, or a sibling in the same canvas — declares a
setting whose `css_property` covers the row's property, and the route's reachability gate (`citeReaches` /
`reachesElement`) judges its emission to reach the row's element. On a canvas that citation reclassifies the
row; off a canvas it is evidence only.

Every one of the 168 claims rests on `via: declared` — a DB declaration plus a source-level reachability
argument. **None had ever been confirmed against a rendered page.**

### The 168 claims are two mechanisms, not one

`triage.mjs` states the design intent: the resolver hop's citation and the canvas-roster citation "are the same
claim reached from two directions; the first that holds wins". They leave different evidence, so they are
counted apart here:

| Mechanism | Claims | Distinguishing field | Top cited block |
|---|---|---|---|
| Resolver-hop citation | 122 | no `where` key | `sgs/container` ×94 |
| Canvas-roster scan (`canvasSettable`) | 46 | `where`: `ancestor` or `sibling` | `sgs/container` ×13, `sgs/text` ×9 |

Both gate on a reachability check, so one instrument tests both; a defect in one gate would say nothing about
the other, which is why the split is recorded rather than averaged away.

## The instrument, and why computed styles were the wrong one

Neither computed styles nor CDP `CSS.getMatchedStylesForNode` can decide this claim, because both answer "what
paints right now" and so cannot separate **the cited setting loses** from **the cited setting is simply unset**.
An earlier pass using matched-styles produced 2 CONFIRMED and 7 REFUTED-LOSES; every one of those nine was an
artefact and was withdrawn (see "Two corrections" below).

What decides it is CSSOM rule enumeration: **every rule in every loaded stylesheet that declares the property
and whose selector matches the row element** (`row.matches(selectorText)`). That set is value-independent — it
is every rule that could *ever* govern that property on that element. The claim holds only if one of those
rules belongs to the cited block, by naming one of its classes or by reading a custom property the framework
sets on the cited block's selector.

The walk deliberately recurses into `@media` blocks **without** checking whether they currently apply, so a
cited-owned rule hiding in any media query, at any value, still counts. The test is therefore generous to the
claim, and a refutation is conservative: it means no rule anywhere, under any media query, at any value, could
carry that setting to that element.

### Verdicts

| Verdict | Meaning |
|---|---|
| `CONFIRMED` | A matching rule is the cited block's own emission. |
| `VAR-CHANNEL` | A matching rule reads a custom property the framework sets on the cited block's selector. |
| `REFUTED` | Rules do govern this property on this row, but none is the cited block's. No value on the cited setting would move it. |
| `NO-RULE` | Nothing anywhere declares this property for this element, so the cited setting cannot paint it either. A stronger refutation. |
| `ABSENT` | The row element is not in the DOM on this page. |

### The harness is not vacuous

A 17-of-17 refutation rate is the signature of a broken instrument, so the CONFIRMED branch was proved
reachable with positive controls whose claim is true by construction. A container's own `contentWidth` → `width`
on its `.sgs-container__inner` returns **CONFIRMED**. (Two further controls return `NO-RULE` legitimately: that
container instance sets no `padding-top` or `align-items` at all.)

`VAR-CHANNEL` never fired, and **zero** of the matching rules across all 17 measured families read a custom
property, so the branch is inapplicable here rather than silently swallowing confirmations. It is therefore
unexercised code: treat it as unproven until a family hits it.

**And the walk is accounted for, not assumed.** A hand-rolled `document.styleSheets` walk silently skips any
sheet whose `cssRules` throws (cross-origin or blocked), and a skipped sheet makes a `NO-RULE` verdict a false
negative rather than a finding — the trap is on record in auto-memory as having once reported zero matches on
an element that demonstrably computed the value. So the tool counts every sheet and returns the tally with each
verdict. Measured: **956 of 956 sheets read, 0 skipped**, across 52-58 sheets per page, on every one of the 17
runs. A verdict is trustworthy only at `skipped === 0`; a future run against a CDN-served or blocked sheet will
now say so instead of refuting silently.

## Result: 17 measured, 17 refuted (82 of 168 claims)

| | Families | Claims |
|---|---|---|
| `REFUTED` | 9 | 50 |
| `NO-RULE` | 8 | 32 |
| **Refuted subtotal** | **17** | **82** |
| `ABSENT` (host-gated) | 46 | 86 |

Depth of the row below the cited block: 8 families at depth 3, 4 at depth 4, 2 at depth 2, and **3 at depth −1
— the cited block is not an ancestor of the row at all** (those are `where: sibling` citations).

The refuted families, with the rule that actually governs each row:

| Cited block :: setting | Property | Claims | Depth | What actually governs the row |
|---|---|---|---|---|
| `sgs/container::lineHeight` | `line-height` | 17 | 4 | `.sgs-form__button {1.5}` |
| `sgs/container::gridItemPadding` | `padding-top` | 6 | 3 | `.sgs-social-icons--boxed .sgs-social-icons__item {8px}` |
| `sgs/container::gridItemPadding` | `padding-bottom` | 6 | 3 | as above |
| `sgs/container::gridItemPadding` | `padding-right` | 5 | 3 | as above |
| `sgs/container::gridItemPadding` | `padding-left` | 5 | 3 | as above |
| `sgs/container::contentWidth` | `width` | 4 | 3 | `.sgs-soc-f5ab8ca7 .sgs-social-icons__item {44px}` |
| `sgs/container::alignItems` | `align-items` | 3 | 2 | `.sgs-social-icons {center}` |
| `sgs/heading::transitionDuration` | `transition-duration` | 3 | −1 | `.sgs-social-icons__item {0s}` |
| `sgs/container::flexWrap` | `flex-wrap` | 1 | 2 | `.sgs-social-icons {wrap}` |
| `sgs/container::fontSize` | `font-size` | 8 | 4 | nothing (`NO-RULE`) |
| `sgs/container::gridItemShadow` | `box-shadow` | 6 | 4 | nothing |
| `sgs/form::sgsHideOnDesktop` | `display` | 4 | 3 | nothing |
| `sgs/form::prevColourBackgroundGradient` | `background-image` | 4 | 3 | nothing |
| `sgs/container::sgsHoverLift` | `transform` | 4 | 3 | nothing |
| `sgs/heading::boxShadowHover` | `box-shadow` | 3 | −1 | nothing |
| `sgs/social-icons::iconBorderColourHover` | `border-top-color` | 2 | −1 | nothing |
| `sgs/container::contentBandMargin` | `margin-top` | 1 | 4 | nothing |

### The mechanism behind the refutations

The clearest case is `gridItemPadding` → `.sgs-social-icons__item`. The row sits at **depth 3** from the cited
container, and `gridItemPadding`'s consumer rule targets the container's **grid items** (depth 1). Exactly one
rule in the whole stylesheet set matches the row and declares `padding-top`, and it belongs to
`sgs/social-icons`. The container sets no custom properties at all, and `--sgs-gi-padding` is unset on both
elements. So no value the client could choose on that setting would move this row: the reachability gate
credited a setting that stops two levels above the row.

The same shape explains the rest: a container-level setting cited for a property that a child block's own
stylesheet owns on a deep descendant.

## What this does NOT yet license

**The reclassification is not applied.** These 82 claims are currently W on the strength of a citation the live
DOM refutes, and refuted rows belong in F. That is a large move (F is 173), and it should be applied once, over
the whole population, not in two halves — the 46 host-gated families must be read first so every family is
judged by the same instrument. Applying half now would make the F figure mean two different things.

## Why the local mirror only covers 17

The brief expected this task to run on the local mirror. It cannot: **46 of 63 families are not readable there
at all.** All 46 fail as "ref missing entirely", never "path not found", and the cause is which pages carry the
route's `cr-ref-*` instrumentation:

| Page | `cr-ref` prefixes on the local mirror | On the remote site |
|---|---|---|
| `/` | `home`, `footer` | `home`, `footer`, `header`, `mobile-menu`, `mega-brands`, `mega-sunglasses`, `mega-help`, `mega-lenses`, `size-guide` |
| `/shop/` | `footer` only | `shop` |
| `/product/…` | `footer` only | `product`, `lens` |
| `/help/`, `/contact/`, `/prescription-lenses/` | `help`, `contact` + `contact-form`, `lenses` | same |

The mirror's **header layout and WooCommerce templates are at an older state** than the instrumented ones, so
`header`, `mobile-menu`, `mega-*`, `shop`, `product`, `lens` and `size-guide` have no refs locally. `footer`
works everywhere because its refs live in page content.

The 46 owed families are on `product` (14), `header` (9), `shop` (9), `lens` (6), `mega-lenses` (5),
`mobile-menu` (2) and `size-guide` (1). They need the remote site:

```
node ../../scripts/computed-route/confirm-canvas.mjs ../../sites/eye-care-ward-end/build/qa/triage out.json https://darkcyan-grouse-898606.hostingersite.com
```

Some will still read `ABSENT` there because their row only exists with a walker state open (`filters-open`,
`tab-description`, `drawer-open`, the mega panels). Those need the state driven before the read, which this
tool does not yet do — it is the one piece of the instrument still missing.

## Two corrections made during this measurement

Both were caught by re-reading the tool's own output, and both would have shipped a confident wrong finding.

1. **Ancestor rules were counted for non-inheriting properties.** CDP returns an `inherited[]` entry per
   ancestor whatever the property is. Without gating on whether the property actually inherits, an ancestor's
   `display` or `padding-top` read as the winning declaration for a descendant, which no cascade would ever do.
   This produced `sgs/form::sgsHideOnDesktop → display` as CONFIRMED from a depth-2 rule, and
   `sgs/heading::boxShadowHover → box-shadow` from depth 3. Fixing it collapsed all 9 CONFIRMED and
   REFUTED-LOSES verdicts, which is what prompted replacing the instrument entirely.
2. **"The cited block emits this property" was matched too loosely.** `.sgs-container-932c86c9 {padding-top:104px}`
   was counted as the container emitting padding to the row, when it is the container's own padding from a
   different setting and cannot reach a depth-3 descendant. A resting value-read cannot tell a losing
   declaration from an unset one; only value-independent rule enumeration can.
