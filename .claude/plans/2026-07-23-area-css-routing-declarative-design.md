---
doc_type: design
plan_id: area-css-routing-declarative
project: small-giants-wp
thread: cloning-pipeline (Track 1)
created: 2026-07-23
status: design-gate-pending
governing_spec: specs/31-UNIVERSAL-CLONING-PIPELINE.md (§3.A step 2/3, §4 declarative routing columns, §2.9 Axis 1 L4)
goal: Replace the fuzzy name-building in the per-area CSS resolver with purely declarative routing, and settle what `css_element` actually means.
---

# Per-area CSS routing — declarative redesign

**Status: DESIGN GATE PENDING. Do not build without Bean's approval.** This is a
shared resolver on the converter's highest-blast-radius surface.

## Plain English

When the pipeline clones a section, it has to decide *which block setting* each
piece of the draft's CSS belongs to. For CSS attached to a NAMED sub-area of a
block — a card's body, a hero's media column — that decision is made by
`db_lookup.attr_for_area_property()`.

Today that function **guesses the setting's name**: it glues the draft's element
token onto a suffix (`body` + `Padding` → `bodyPadding`) and checks whether a
setting with that name exists. If the block happens to have named its setting
something else, the guess misses and the draft's styling is dropped.

The proposal is to stop guessing and instead **read what each setting declares
about itself** — the `css_property` / `css_element` / `css_tier` / `css_state`
columns already on `block_attributes`.

## Why — measured, not asserted (2026-07-23 differential)

A differential over all 336 real `(block, css_element, css_property)`
combinations in the DB, comparing today's name-build against a purely
declarative lookup:

| Outcome | Count | What it means |
|---|---|---|
| Agree | 114 | both find the same attr |
| **Declarative finds it, name-build MISSES** | **206** | routes silently lost today |
| "Name-build only" | 13 | **wrong routes** — see below |
| **Conflict — different attr** | 3 | name-build picks a different attr than declared |

**The 13 are not losses — they are wrong routes.** Every one is
`sgs/option-picker`'s pill family, whose attrs are seeded `css_state='hover'`
or `'selected'`. The name-build is **blind to `css_state` and `css_tier`**, so a
draft's RESTING `.sgs-option-picker__pill { background-color: X }` resolves onto
`pillBgColour` — a HOVER attribute. The resting colour would only appear on
hover. The declarative path correctly returns nothing (there is no base-state
pill background attr), producing an honest gap.

**The name-build also has a documented false-positive class.** `property_suffixes`
carries `BandPaddingTop/Right/Bottom/Left` rows, so `area='content'` builds
`contentBandPaddingTop`, which EXISTS on cta-section — routing a nested column's
padding onto the OUTER container band. `attr_for_area_property` carries a
hand-written `Band`-skip specifically to suppress this. That guard becomes
unnecessary once routing is declarative.

**Worked miss:** `sgs/hero.imagePadding` is seeded `css_element='split-image'`.
The name-build from area token `split-image` produces `splitImagePadding`, which
does not exist → miss. The declarative lookup matches directly.

## The proposed shape

`attr_for_area_property(block_slug, area, css_property)` becomes:

1. Match `block_attributes` on `css_property` + `css_element = area`, restricted
   to the BASE RESOLVER DOMAIN (`css_tier IN (NULL,'desktop')`, `css_state IS
   NULL`) — the same domain contract Front 1 established (Spec 31 §4).
2. Exactly one match → return it.
3. Two or more → **raise** `AmbiguousAreaAttrError`, mirroring the existing
   `AmbiguousCssPropAttrError` (MF-4 fail-loud). Never rowid-pick.
4. Zero → `None` → honest gap, now VISIBLE via the trace wiring landed in
   `a0a7d6aa`.
5. **DELETE** the `property_suffixes` name-build and its `Band`-skip from this
   resolver. `property_suffixes` keeps its real job in the main CSS branch; it
   is only the name-GUESSING here that goes.

### Why no fallback is needed (Bean, 2026-07-23)

90 attrs carry a `css_property` but a NULL `css_element`. These are not
"unseeded" — they are **root-level** attrs (`scaleHover`→transform,
`columns`→grid-template-columns, `fontSizeTablet`, `backgroundMedia`), and
Spec 31 §4 already treats `css_element IN ('','root','self')` as the base
domain. An AREA resolver only ever serves NAMED sub-areas, so root attrs are
correctly out of its scope and belong to the base resolver. There is therefore
no population the name-build uniquely serves.

## Rejected approaches (both were hardcodes — Bean, 2026-07-23)

- **Re-seed `sgs/product-card.innerPadding` to `css_element='body'`.** Fixes one
  row for one draft's element token. The next draft calls it `__content` or
  `__inner` and it breaks again. If the seed IS wrong, the fix belongs in the
  seeder's DERIVATION (FR-31-2.1a: ownership comes from the code or an explicit
  declaration, never from parsing the identifier name), not in the row.
- **A synonym layer mapping `body`/`inner`/`content`/`box` as equivalent.** A
  fixed list of equivalent tokens is the same hardcode wearing a different hat,
  and it papers over mis-seeds rather than correcting them.

## OPEN QUESTION 1 — what does `css_element='box'` actually mean?

**Bean's hypothesis (2026-07-23), to be tested first thing next session.**

`box` does not look like a real element token the way `content`, `media`,
`caption` or `pill` do. It reads as a **clustering term** — a grouping for the
CSS that shapes the box CONTAINING the internal elements, closer to a naming-by-
cluster convention than to a named DOM area.

If that is right, `box` should not be matched as if it were an element name at
all. It may instead be a signal that triggers DIFFERENT behaviour, e.g.:

- the owner is the MAIN BLOCK itself (not a named sub-area), or
- an AUTO-MATCH when the draft's element cannot resolve to any real block or
  element in the DB — i.e. both sides are **invisible structural layers**, and
  matching them to each other is exactly right.

That second reading is attractive because it is symmetric: a draft wrapper with
no block identity (`__body`, `__inner`) meeting a block attr whose element is a
non-DOM cluster (`box`) is two structural layers recognising each other.

**Do not build the resolver until this is settled** — it determines whether
`box` is a match target, a wildcard, or a separate dispatch arm.

## OPEN QUESTION 2 — full DB survey before building

Bean's instruction: survey ALL columns that could differentiate CSS attrs, and
decide what `css_element` should legitimately be matched against. Known so far:

| Column | Seeded | Notes |
|---|---|---|
| `css_property` | 511 | the primary key for this lookup |
| `css_element` | 421 of 511 | vocabulary incl. `label`, `item`, `title`, `text`, `caption`, `heading`, `pill`, `button`, `media`, `cta`, `content`, `wrapper`, `split-image`, `icon`, `image`, `box`, `grid`, `featured` |
| `css_state` | — | `hover`, `selected`; the axis the name-build ignores |
| `css_tier` | — | `desktop`/`tablet`/`mobile`; also ignored by the name-build |
| `css_layer` | **6 of 511** | effectively UNSEEDED — cannot be a disambiguator today |
| `role` | — | the type-of-attribute column that routes to different extraction leaves (FR-31-2.2); the existing precedent for "route by declared type" |
| `box_family` | — | 4-side/4-corner object grouping (FR-31-22) |

Also confirm: are the 3 CONFLICT cases (`sgs/cart.badge` colour,
`sgs/hero.overlay` opacity, `sgs/trust-bar.label` colour) name-build errors, or
genuinely mis-seeded declarative columns? Each needs an individual read of the
block's own CSS — do not assume the declared value is right.

## Not caused by this — recorded so it is not re-litigated

The `body → sgs/text` slot alias was REMOVED on principle
(`migrations/2026-07-23-remove-body-from-text-slot-aliases.py`), because `body`
names a content REGION, not copy. But it was **never a cause** of the product-card
padding drop: `attr_for_area_property` does not consult the slots table at all.
Verified by reading the function — it name-builds `area + suffix` and checks
`block_attrs`, with zero slot/alias involvement.
