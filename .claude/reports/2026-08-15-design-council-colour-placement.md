# Design council — where does an ELEMENT-scoped colour control live?

```
doc_type: report
date: 2026-08-15
council_type: design (4 seats, distinct perspectives, all Sonnet via /delegate)
seats: client-advocate · competitor-conventions · framework-consistency · build-cost
question: does an element-scoped colour row live in the grouped Colour panel, or in that
          element's own panel alongside its other controls?
status: RECOMMENDATION READY — one input still owed by Bean (see §6)
```

## 1. Recommendation

**Hybrid, DECLARED not inferred.**

- **Default:** colour rows render in the grouped **Colour** panel, in the **Styles** tab (D621),
  rendered first.
- **Exception:** an element whose manifest declares `localColour: true` renders its colour row in
  **its own panel**, beside its other controls.
- **Headings inside the grouped panel** are derived from `css_element`, and are applied **only when a
  block has 2+ element groups with 2+ rows each** — below that, descriptive row labels are enough
  (this is what WordPress core itself does; see §4).

One boolean turns the client seat's line into data. It costs what the cheapest option costs, keeps
headings derivable, and makes the rule statically checkable. Without it the same line needs ~45
hand-judgements that no detector can verify.

## 1b. ⭐ POST-COUNCIL: no new flag is needed — the rule is already in the data

**Supersedes the `localColour: true` proposal in §1 and the "not statically decidable" finding in §7.**

Bean confirmed his three examples were illustrative, not exhaustive, and that the rule they express is
*"elements that are essentially real concrete blocks just nested in"*. That is the same question the
cloning pipeline already asks of every DOM node — and the answer is already stored:
**`slots.standalone_block`**, the framework's own map from an element slot to the standalone block it
is equivalent to.

Measured, filtered to `scope='element'`:

| Metric | Value |
|---|---|
| Colour attrs deriving as LOCAL | **43** |
| Blocks affected | **23** |
| Distinct elements | **13** |

And the mapping lands on Bean's own examples without being told to: `icon` → `sgs/icon`,
`label` → `sgs/label`, `link` → `sgs/button`, `text`/`caption`/`price`/`date` → `sgs/text`,
`number` → `sgs/counter`, `tab` → `sgs/tab`, `panel` → `sgs/info-box`, `separator` → `sgs/divider`.
`wrapper` (46 colour attrs — the largest single element) correctly has **no** standalone block, so
block-level colours stay grouped by construction.

⚠ **Two gaps to seed, both real:**
1. **`cta` is registered at `scope='section'` only** (→ `sgs/cta-section`). So `sgs/product-card`'s
   CTA *button* — Bean's headline example — is **not** caught, and a naive unscoped join would
   mis-map it to `sgs/cta-section`. Needs an element-scope `cta` → `sgs/button` row.
2. **`title`, `description`, `submit-button` have no mapping at all**, though they are "separate text
   elements" by the rule.

**Consequence:** no schema change, no new boolean, no parallel concept. The gaps are seeded in the
**same repair pass** already required for the `css_element` drift (§5), after which the rule derives
itself and is trivially checkable — a rule asserts that a colour row renders locally if and only if
its `css_element` resolves to an element-scope slot carrying a `standalone_block`.

This is strictly better than a hand-set flag: it reuses the concept the framework already uses to
decide "is this thing a block?", so the two answers cannot drift apart.

## 2. Why not simply "always grouped"

The framework's own placement model is element-first. **D537 (Tier 1 = element, Tier 2 =
property-family) has never been superseded on the record**, and Spec 35 A4 restates it as current.
The contract's §1 field 4 explicitly subordinates colour's Tab field to it: *"An element-scoped
control goes in its element's panel (TIER 1) regardless of this field."*

⭐ **And "colour" is not a property family at all.** `cluster-member-sets.json` declares six —
`text`, `fill`, `layout`, `position`, `motion`, `animation` — and colour-bearing members are spread
across **three** of them:

| Family | Colour member |
|---|---|
| `text` | `css:color` (text colour) |
| `fill` | `css:background-color`, `css:background-image` (overlay), `css:fill` (SVG / shape dividers) |
| `layout` | `css:border-color` |

So a grouped Colour panel is not a tidier version of the existing model — it is a **different axis
through it**: organise by *what kind of value it is*, versus organise by *what it affects*. Both are
coherent; the data model, the placement resolver and the consistency gates are all built for the
second. That is real architectural debt on the grouped option, and it should be taken knowingly.

## 3. Why not simply "always local"

- Bean rejected scattered per-panel colour rows on sight during the D609 build — *"those icon colour
  controls in the icon panel are ugly."*
- It is the only option whose cost scales with block count: ~45 element-scoped blocks each needing
  colour rows re-homed into N separate panels, versus a one-time component change.
- It loses the comparative case (§4).

## 4. What the market does — and the temporal split

The market is genuinely split, and **the split is generational, not philosophical**:

| Product | Grouped or local | Evidence | Tier |
|---|---|---|---|
| **WP core** (`core/navigation`) | **Grouped** — one `group="color"` panel listing Text / Background / **Submenu text / Submenu background** as four labelled rows | `block-library/src/navigation/edit/index.js:115-232, 931-950` | source |
| **Spectra** | **Grouped** — code comment: *"Element Sub-settings: Settings that are injected into Core's Color panel"* | `src/blocks/button/settings.js:512-595` | source |
| **Kadence** | **Local** — icon colour sits inside "Icon Settings" next to icon size; separate panel per region | `src/blocks/singlebtn/edit.js:698-2360` | source |
| **Elementor** | **Local** — "Title" section bundles typography + text colour (Normal/Hover/Active) | official docs | docs |

Core and Spectra are actively maintained against current WP APIs and both group. Kadence and
Elementor predate WP's native colour tab (~6.3, 2023) and both keep colour local. **Grouped is the
emerging platform-native convention; local is the legacy-dominant one** that trained most existing
page-builder users (Elementor alone ~15M installs).

⭐ **Direct precedent for Bean's own nav example:** core solves menu-vs-submenu **grouped, with
descriptive row labels** ("Submenu text", "Submenu background") — **not** with sub-headings. That is
why the recommendation gates headings behind a size threshold rather than applying them everywhere.

⚠ Spectra's stated rationale is *platform consistency*, not that grouping is inherently better.
Worth knowing: it is a conformance argument, not a UX one.

## 5. The blocking data problem — Bean's worked example cannot be built today

Headings derive from `css_element`. Spot-checked 3 of 45 element-scoped blocks; **1 clean, 2 drifted**:

| Block | State |
|---|---|
| `sgs/product-card` | ✅ clean — `cta`/`title`/`price`/`desc`/`priceNote`/`tag` map 1:1 to declared elements |
| `sgs/nav-menu` | ⛔ **the proposed "Menu · Submenu" grouping does not exist in the data.** `navBg`, `navColour`, `submenuBg`, `submenuColour` all carry `css_element = NULL` — verified directly. The declared elements are `bar`/`item`/`underline`/`featured`/`burger`/`indicator` |
| `sgs/hero` | ⛔ two `css_element` values (`overlay`, `media-overlay`) exist in the DB but **not** in the block's own element manifest |

**Required before any heading work:** a repair pass diffing `css_element` against each block's
`supports.sgs.elements` across all 45 element-scoped blocks. Mechanical, ~5 min to script, and it
must precede the rollout or headings will be hand-written per block — exactly the cost the derivation
was meant to avoid.

Population: **297 `role='color'` attributes across 61 blocks; 191 element-scoped across 45 blocks.**

## 6. Owed by Bean

**Was "CTA buttons, icons, separate text elements" exhaustive or illustrative?**
- *Exhaustive* → `localColour` can largely be derived from what each element already declares.
- *Illustrative* → it is a per-element judgement as each block migrates. Still workable, but a call
  made ~45 times instead of once.

## 7. Enforcement (the reason the flag matters)

With the flag, one new `inspector-scan` rule can assert: every `SgsColourPanel` row either sits under
a heading matching a declared element in that block's `supports.sgs.elements`, or belongs to an
element declaring `localColour: true`. Same AST shape as the existing rule 24. **Without the flag the
hybrid is not statically decidable at all** — nothing in the element schema encodes "is this a
concrete nested block", and `clusters` does not separate them (`product-card`'s `cta` and `title`
carry the same cluster shapes, but only `cta` fits the description).

An unenforced placement rule regresses — the existing placement rule
(`22-placement-rule-surfaces`) is still `advisory`, which is precisely why the record drifted into
contradiction in the first place.
