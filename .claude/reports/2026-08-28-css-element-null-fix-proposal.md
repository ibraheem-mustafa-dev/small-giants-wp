# NULL css_element fix proposal — validated, pre-implementation

**Status:** VALIDATED by `/qc-council` (3 independent adversarial fact-checkers, each
re-deriving claims from live code/DB rather than trusting this document). Compiled
from 8 investigation passes (6 original + 2 reinvestigation + 1 inline) + 3 council
verification passes. Every proposed FIX held up; two REASONING corrections applied
below (marked `[COUNCIL CORRECTION]`) — neither changes what should be implemented.
Ready for implementation.

**Scope:** every non-fx NULL `css_element` row found in `sgs-framework.db` this
session (~64 rows), plus the fx-marker family (~20 rows) which resolved to "not a
bug" during investigation, plus two real production bugs found as a side effect.

---

## 0. Governing decision — the NULL/exemption sentinel

Bean's instruction: NULL must mean one thing only. Two currently-conflated cases:
1. Genuinely unresolved (real gap, real CSS, classifier found nothing) — stays NULL.
2. Not applicable (not real CSS at all) — needs an explicit, self-documenting value.

**Recommendation (from investigation, not invented on the spot):** reuse
`css_element='behaviour'`, mirroring the ALREADY-established `role='behaviour'`
value (TIER 3.17 in `assign-canonical.py`, D607) rather than introducing a second
vocabulary word for the same concept. Codify as a new TIER in `assign-canonical.py`
(sibling to 3.17), gated on `css_property LIKE 'fx:%' AND css_element IS NULL` —
NOT a one-time override seed, so the next `fx:*` attribute anyone adds is covered
automatically.

`[COUNCIL CORRECTION]` **Safety of this sentinel is now a CHECKED fact, not an
assumption.** `css_element IS NULL` is NOT semantically inert everywhere in this
codebase — `converter/db/db_lookup.py`'s root-domain resolver
(`_base_domain_attrs_for_css_property`, ~lines 1696-1783 + twin queries at
1840/3710/3720) treats `(css_element IS NULL OR css_element IN ('','root','self'))`
as an active routing condition. Flipping the 20 `fx:*` rows to `'behaviour'` is
confirmed safe ONLY because those rows are never routed through that resolver —
verified by grepping the entire `converter/` tree for the literal string `"fx:"`:
zero hits. If a future change ever starts feeding `fx:*` properties through that
resolver, this safety check must be re-run.

**Three buckets, not one — do not conflate:**

| Bucket | Shape | Treatment |
|---|---|---|
| A — not applicable | `css_property` is a symbolic `fx:*` marker, JS-driven, never painted | New `css_element='behaviour'` |
| B — applicable but element-less | Real CSS (`@media` threshold etc.), no single owning element | Own named override, NOT the sentinel |
| C — genuinely unresolved | Real CSS, classifier found nothing (or found 3+ competing owners) | Stays NULL |

**Bucket A — 20 rows**, all confirmed `role='behaviour'` already, all `fx:*`-namespace:
`sgs/buybox.dragMomentum/dragToScroll/loopCarousel`, `sgs/gallery` (same 3),
`sgs/google-reviews` (same 3), `sgs/post-grid` (same 3), `sgs/trustpilot-reviews`
(same 3), `sgs/testimonial-slider.dragToScroll`, `sgs/image-sequence.fxStart/fxEnd/
fxScrub/fxPin`, `sgs/before-after.fxDraggable` (⚠ this one's `role` is currently
`boolean-visibility`, not `behaviour` — fix that column too, in the same pass, or
the two columns will disagree).

**Bucket B — 1 row:** `sgs/nav-menu.collapsePoint` — an `@media` breakpoint
threshold controlling two OTHER elements' visibility, not a property it paints
itself. Its own `css_property`/`role` fields are also mislabelled (a hand-seeded
override, not derived) — flagged for a human decision, not auto-fixed here.

**Bucket C — stays NULL, no action:** `sgs/card-grid.transitionDuration`/
`transitionEasing` (3 real competing BEM-element owners, correctly ambiguous),
`sgs/post-grid.textColourHover` (4 competing descendant targets via a loop
variable, re-confirmed twice today), `sgs/testimonial.scaleHover` and siblings
(genuine root-hover blocks per this project's own D808 doctrine), and everything
else the investigations below tag "genuine Cause C, correctly NULL."

---

## 1. Universal hover-effects family

Split into three genuinely different causes — do not fix as one group.

**Genuine Cause C, correctly stays NULL (11):** `button/heading/quote/text/
info-box/team-member/testimonial.scaleHover`, `testimonial.transitionDuration/
transitionEasing/shadowHover/shadowHoverColour` (all one root-scoped site),
`card-grid.transitionDuration/transitionEasing` (genuinely 3-way ambiguous).

**Real classifier gap — nesting inside `scale()` breaks `_top_level_vars()`,
confirmed general not block-specific (proven via `post-grid`, which escapes it
only via an explicit attrMap fix landed 2026-07-24):**
- `card-grid.scaleHover` → `css_element='item'`
- `gallery.scaleHover` → `css_element='item'`
- `icon.scaleHover` → `css_element='icon'` — **the "deliberately unclaimed" note
  is stale**, proven false by git history (written 2026-07-21, falsified 3 days
  later when `css:transform` became a real vocabulary member, never revisited).
  Safe to fix.

**A different, structural coverage gap — no CSS custom property at all, value
hardcoded in style.css behind a class toggle (invisible to every classifier
shape):**
- `card-grid.grayscaleHover` → `css_element='image'`
- `team-member.grayscaleHover` → `css_element='photo'`
- `gallery.grayscaleHover` → `css_element='image'` (confirmed exact key, was
  flagged unconfirmed, now resolved)
- `info-box.grayscaleHover` → selector is a bare `img` tag, no BEM class at all —
  **stays NULL**, genuine Cause C despite `info-box` having an `image` element
  elsewhere for other attrs.

**Unresolved, reported honestly, not guessed:** why `post-grid.scaleHover`
resolves is now fully explained (explicit attrMap, not magic) — no longer a
mystery.

---

## 2. `bgKenBurns` background-motion family (6 rows)

Single shared mechanism (`SGS_Container_Wrapper::render()`), genuine Cause C
(bare `sgs-container--ken-burns` modifier class, no BEM element token). All 6
blocks (`container/cta-section/hero/site-footer/site-header/trust-bar`) already
have an override-file entry for `role`/`css_property` — just missing
`css_element`. **Fix: add `"css_element": "wrapper"` to each existing entry.**

⚠ **Separate, unrelated flag, not investigated further:** possible live bug where
Ken Burns without parallax/fixed-attachment renders the background as a real
`<img>` rather than CSS `background-image`, leaving the animation rule nothing to
animate. Worth a look sometime, not part of this fix.

---

## 3. Cross-block colour-hover pairs

**Clean Cause C fixes (5, one attrMap line each):** `cta-section.
backgroundColourHover/borderColourHover`, `hero.borderColourHover`,
`testimonial.borderColourHover`, `quote.textColourHover`.

**`product-search.focusRingColour`** → same documented one-to-many custom-property
limitation as its already-fixed sibling `inputBorderColour`. Fix: add to
`elements.input.attrMap`: `"css:outline-color": "focusRingColour"`.

**Two REAL PRODUCTION BUGS, not classifier gaps — need a render.php fix, not a
manifest change:**
- `testimonial.quoteColourHover` — painted onto the whole card instead of the
  quote text, AND only renders at all if `borderColourHover` also happens to be
  set (broken conditional gate).
- `process-steps.numberBackgroundHover` — same shape: painted onto the whole
  step card instead of the number badge.

**`google-reviews.starColour`** — the classifier's own derived value is WRONG,
not just incomplete. Reinvestigated fully:
- Real primary visual effect: star icon `fill`, via an enum-modifier-class
  mechanism the classifier never traced.
- What the classifier found (`background-color`) is a secondary, low-visibility
  consumer (rating-distribution bars, hidden by default; a slider pagination dot).
- **Also a real, separate client-facing bug:** the control was upgraded to a full
  open palette (D619) but the star-fill CSS still hardcodes only 2 legacy enum
  values — every other palette choice, including the DEFAULT, silently fails to
  recolour the stars.
- Fix: correct `css_property` to `fill`, add a new `star` manifest element. The
  palette-coverage bug is separate follow-up work (unify both consumers onto the
  working custom-property mechanism).
- Also flagged: a genuine schema question — one attribute driving two unrelated
  CSS properties on two unrelated elements doesn't fit the one-row-per-attribute
  model cleanly. Worth a design conversation, not fixed here.

**`mega-panel.accentBackground/accentBorderColour/accentTextColour`** — see §5,
combined with the rename.

---

## 4. Nav-menu residual (already applied earlier this session, documented here for completeness)

`navColour`/`navBgHover` — recommendation was to consolidate into the wrapper's
existing `attrMap` rather than more override entries (cleaner single source of
truth, matches the precedence rule). **Not yet applied — still queued.**
`collapsePoint` — Bucket B above, needs a human decision, not auto-fixed.

---

## 5. Mega-panel `accent*` — rename + classification, combined

**Confirmed:** the "accent" naming is a standing request from Bean, not new.
Current state: fully open `DesignTokenPicker` already (no control change needed),
default is the literal token slug `"accent"`. The established codebase convention:
attribute name = generic `<element><Property>Colour`, default = bare token slug,
never bake the token name into the attribute name. `accent*` are the only
outliers. `[COUNCIL CORRECTION]` this was independently re-verified against
`cta-section`/`pricing-table` (both confirm the FULL two-part pattern: generic
name AND token-slug default) and `button` (confirms only the naming half —
`colourText`/`colourBackground`/`colourBorder` default to `""`, not a token
slug). The convention is real; the "confirmed across 3 blocks" framing overstated
the sample slightly. Doesn't change the recommendation.

**Proposed rename (defaults unchanged, still `"accent"`):**

| Old | New | Element (also fixes the classification gap) |
|---|---|---|
| `accentBackground` | `iconBackground` | new `icon` element, `css:background-color` |
| `accentTextColour` | `iconColour` | same `icon` element, `css:color` |
| `accentBorderColour` | `groupBorderColour` | new `group` element, hover/focus-within `css:border-color` |
| `accentBorderColourGradient` | `groupBorderColourGradient` | same `group` element, gradient override |

**Sequencing: rename and classify in ONE commit**, not two — the new attrMap
entries should target the final names directly. Migration risk assessed as low
(this project's no-deprecation, pre-production policy already absorbed comparable
renames; an old undeclared key just goes inert, new attribute falls back to its
own default which is also `"accent"` — behaviour-neutral for anyone who never
customised it away from default). **One cheap pre-deploy check recommended:**
query live `sgs_mega_menu` posts for any non-default stored value before shipping,
so a genuinely customised instance doesn't silently revert.

---

## 6. Misc structural/layout one-offs

**Genuine Cause C (bare root, clean attrMap or override fix):**
- `brand-strip.columnsDesktop/columnsTablet/columnsMobile/fadeWidth/maxHeight`
  (all one `$root_sel`, confirmed inline this session)
- `container.textAlign`, `icon.backgroundPadding/textAlign` (confirmed inline)
- `nav-drawer.drawerBgGradient` → attrMap on existing `dialog` element
- `heading.textWrap` → attrMap on existing `heading` element (one missing entry
  among many siblings already there)
- `hero.verticalAlignment` (align-items half only — the justify-content half at
  `.sgs-hero__content` looks like it should already resolve; **verify against the
  live DB before assuming it needs a fix**)
- `cta-section.backgroundMedia` (Cause C confirmed; exact wrapper element key
  not confirmed within budget — confirm before writing the override)

**Fallback-mechanism only (doesn't fit a clean 1:1 attrMap shape):**
- `nav-drawer.surfaceOpacity` (modifies a sibling attr's value via `color-mix()`,
  can't share that attr's attrMap key)
- `nav-drawer.anchor` (enum driving a multi-property geometry function)
- `quote.attributionFontFamily` (should resolve via the existing prefix
  convention and doesn't — narrow resolver gap, worked around via override rather
  than debugged further)
- `hero.splitMediaObjectPositionTablet` (desktop sibling already claims the
  attrMap key on this element; tablet-tier falls through — worked around via
  override rather than debugged further)

**Flagged as design questions, NOT classifier fixes — do not touch mechanically:**
- `decorative-image.positionX/positionY` — render.php emits `left`/`top`, but the
  manifest's own note claims `top`/`bottom` were deliberately excluded. Code and
  documented intent disagree. Needs a decision.
- `team-member.photoMobile/photoTablet` — traced fully; there is no CSS
  declaration behind these two rows at all. The DB's `css_property='max-width'`
  expectation looks like a mislabelled seed, not a classifier gap. The seeding
  logic needs re-checking, not render.php.

`[COUNCIL CORRECTION]` **The two items below were originally framed as "a
different case entirely — no selector text exists at all." That framing is
WRONG and has been struck.** Independent re-derivation traced `card-grid.columns`
end-to-end through `SGS_Container_Wrapper::render()` and found it genuinely IS
emitted via a real `<style>`-block rule (`class-sgs-container-wrapper.php:2097`:
`$responsive_css .= '.' . $uid . '{' . implode(';', $styles) . ';}'`, printed into
a real `<style>` tag at line 3374) — a scoped `.{uid}{...}` rule with no BEM
element suffix. That is the SAME Cause C shape as `bgKenBurns` in §2, not a novel
unfixable mechanism. The corrected classification:

- `card-grid.columns` — genuine Cause C (bare `.{uid}` root selector, no BEM
  element token — same shape as every other root-scoped attribute in this
  document). Fix unchanged: override-file entry, `css_element='wrapper'`.
- `media.order` — uses a non-standard, per-instance MD5-hash scope class
  (`sgs-media-{hash}`) rather than the usual `$uid` pattern — worth noting as a
  genuine oddity in this codebase, but the classification is the same: Cause C,
  bare root selector, no BEM suffix. Fix unchanged: override-file entry,
  `css_element='wrapper'`.

---

## Summary counts

- **Confirmed real production bugs found (not part of this DB fix):** 2
  (`testimonial.quoteColourHover`, `process-steps.numberBackgroundHover`) + 1
  design-inconsistency flag (`google-reviews.starColour` palette coverage)
- **Clean attrMap fixes ready to apply:** ~15
- **Override-file fixes ready to apply:** ~15
- **Design decisions needed before any fix:** `collapsePoint`,
  `decorative-image.positionX/positionY`, `team-member.photoMobile/Tablet`
  (needs re-seeding investigation, not a manifest fix), mega-panel rename
  (proposal ready, needs sign-off)
- **New classifier rule needed (not a data fix):** the `css_element='behaviour'`
  sentinel for the `fx:*` family, as a new TIER in `assign-canonical.py`
- **Stays NULL, correctly:** ~15 (genuine Cause C or genuine multi-owner
  ambiguity)
