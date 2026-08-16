# Stage 1 — Colour-gap closure, parallel orchestration plan

```
doc_type: plan
status: EXECUTED — all 4 streams shipped, deployed, live-verified 2026-08-16
created: 2026-08-16
governing_decision: .claude/decisions.md D640 (6-seat council — READ IN FULL before building)
outcome_record: .claude/decisions.md D641 — what actually shipped, 2 production bugs found via
  live QC and fixed (not caught by any of this plan's own build/merge gates), full incident record
blocks: Stage 2 (the universal gradient rollout, D636) — now unblocked, see LEDGER.md
branch: feat/gradient-palette-stops (existing, PR #29) — do NOT branch fresh off main
archived: this file is historical — read D641 for what actually happened, not this plan alone
```

## Pre-conditions

Check all five before dispatching any stream:

1. **Branch is `feat/gradient-palette-stops`** (`git branch --show-current`) — this work continues
   PR #29, it does NOT branch fresh off `main`.
2. **`git status` checked for the concurrent session.** Another session has been actively editing
   `ContainerWrapperControls.js` on this shared checkout. If Stream A determines multi-button
   routes through `SGS_Container_Wrapper`, coordinate before touching that file — two writers on
   it is the known failure mode.
3. **D640 read in full** (`.claude/decisions.md`) — it carries the mechanism rulings and the
   evidence behind them. Building from this plan's summary alone loses the "why".
4. **`npm run build` exits 0 on a clean tree** before any stream starts, so a later failure is
   attributable to this work rather than inherited.
5. **One git worktree provisioned per stream** — not one shared directory (recorded lesson).

## Why this order (Bean-ruled, reasoning verified)

Every colour attribute added in Stage 1 lands in the background-family bucket and receives
gradient **automatically** in Stage 2's universal pass. Added after Stage 2, each would need its
own separate gradient retrofit. The dependency is real, not cosmetic.

## Why parallel

The four streams touch **disjoint file sets**. The only shared-file contact is Stream A's
one-line addition to `button/style.css`'s existing `var()` fallback chain — no other stream
touches `sgs/button`. Streams mount `SgsColourPanel`/`DesignTokenPicker` but never edit them, so
the collision risk that forced worktree isolation in Stage 2 does not apply here.

⚠ **Still give each stream its own git worktree.** Recorded lesson
(`parallel-agent-dispatch-needs-one-directory-each`, 2026-08-16): a shared directory means shared
`node_modules`/`build/` output, and concurrent `npm run build` runs clobber each other even when
source files are disjoint.

---

## Stream A — `sgs/multi-button` (TWO halves, one stream, sequential within itself)

**Why one stream:** both halves edit `multi-button/block.json` + `edit.js` + `render.php`. Two
agents on those files would collide. One agent does A1 then A2.

### A1 — multi-button's OWN container-style controls ⭐ DO NOT SKIP

The block currently has only `backgroundColour`/`textColour` (added this session's migration,
`render.php:158-186`). It needs full container parity — treat `sgs/container` as the reference:

- **Background colour** — already exists (`backgroundColour`), verify it's wired to `SgsColourPanel`
- **Border controls** — colour, width, style, radius (per-side where the contract requires it)
- **Padding controls** — the `ResponsiveBoxControl` box-object shape, per Spec 32's `box_family`
  pattern; NOT flat per-side scalars (D496 migrated other blocks off that shape — match it)
- **Background media** — image/video/SVG background, matching `BackgroundPanel`'s capability set

⛔ **Check first whether `sgs/multi-button` should route through `SGS_Container_Wrapper` or stay
block-private.** Per D294 (settled, do not re-litigate): content-KIND composites using only
box+width render block-private; section/layout-KIND composites keep the wrapper. Determine which
multi-button is via `block_composition.container_kind` in the DB (`/sgs-db`), then follow that
branch — do not invent a third pattern.

**Acceptance:** a client can give a button group its own background colour, border, padding and
background media, from the block's own inspector, and each paints on the real frontend.

### A2 — child-button group defaults (~6-8 core visual properties)

**Scope (Bean-ruled): core visual set only, NOT all ~35 of `sgs/button`'s style attrs.**
Suggested set — confirm against what a client actually reaches for: button background colour,
text colour, border colour, border radius, font size, font weight.

**Mechanism (settled, D640 §4 — do not re-derive): CSS custom-property fallback chain.**
- `sgs/button` already never hardcodes its background — it emits `--sgs-btn-bg` only when its own
  attr is set, and reads `var(--sgs-btn-bg, …)` (`button/render.php:329-353`)
- multi-button emits `--sgs-mb-btn-<prop>-default` on its own wrapper (it already composes scoped
  CSS there, `render.php:111-118`)
- `button/style.css` gains ONE more fallback tier per property:
  `var(--sgs-btn-bg, var(--sgs-mb-btn-bg-default, <existing-fallback>))`
- Custom properties inherit through the DOM, so child buttons receive it automatically — this is
  why the mechanism works where plain `background-color` inheritance cannot (that property is not
  inherited in CSS)

⛔ **NOT the Context API. NOT editor-time copy-on-insert.** Both were considered and rejected with
evidence (D640 §4) — Context only exposes a value without filling the attribute; copy-on-insert
means later changes to the group default silently stop affecting existing children, which no real
tool does (Kadence/GenerateBlocks/Figma all use live fallback).

⛔ **"Apply to all buttons" already exists** (`multi-button/edit.js:96-112`,
`applyPresetToAllButtons`) and is a **different mechanism** — a one-time bulk-fill that writes
into each child's own attributes. Extend it if wanted, but never conflate it with A2's live
fallback, and never rebuild it.

⚠ **Inherit is IMPLICIT (empty = inherit), no visual indicator — Bean's explicit call.** The
council flagged the tradeoff (change the group default, a child with its own value shows no
change and no explanation); Bean accepted it knowingly (D640 §5). Do not add an indicator unless
Bean asks. Do not re-raise it.

**Acceptance:** set a group default → a child button with no explicit value of its own picks it
up live; a child WITH its own value keeps it; change the group default again → unset children
follow, set children don't.

---

## Stream B — `sgs/product-search` (the biggest single piece)

Two layers: a genuine colour gap, and an S-tier UX upgrade.

**Colour:** one genuinely hardcoded grey at `index.css:22` (bare `#757575`, no token). Everything
else already reads `var(--wp--preset--color--*, …)`, so the gap is a **per-block override**, not
"not brandable". Add colour attrs via `SgsColourPanel`: input border, focus ring, listbox
background, result-hover background, match-highlight (`<mark>`).

**UX upgrade — ⌘K overlay display mode** (keep the existing inline-bar mode; add a second):
centred modal, max-width ~600px, backdrop blur+dim, opens on click or Ctrl/Cmd+K.

**Rich result cards** — image + title + price, bolded matched substring, skeleton loading rows
(not a spinner), and hide the dropdown entirely on zero results rather than showing a dead panel
(Shopify's own predictive-search guidance).

**REST work required** — `class-product-search-rest.php:430-436` currently returns
`{id, title, permalink, thumbnail}` only. Add `price_html` (via `wc_get_price_html()` — already
currency/locale-formatted, never a raw number), `on_sale` (bool), `in_stock` (bool/label).
`view.js:328-340` already has a **dead `result.price` branch waiting for this**. Keep the existing
`RESULT_CAP` and the fail-closed visibility filter — do not weaken either.

⛔ **RESTYLE around the existing ARIA skeleton — do NOT rebuild the DOM.** `render.php:283-288` +
`view.js:135-154` implement a real `role="combobox"` + `aria-expanded`/`aria-activedescendant` +
`role="status"` live region, and it already works live-as-you-type (it is NOT submit-and-redirect).
Command-palette redesigns routinely break that wiring. The popular reference implementation
(`cmdk`) deliberately omits focus-trap and live-region — those stay ours to own. The existing
full-screen-overlay mode already reparents its `<dialog>` to `<body>` with an `isInsideComponent()`
guard (`view.js:99-114`) — EXTEND that guard, don't add a second containment mechanism.

**Motion: Tier V (vanilla CSS) only** — overlay fade/scale ~120-160ms, result stagger via
per-`<li>` `animation-delay`. No GSAP; results are appended per fetch, never reordered in place,
so there is no FLIP/shared-element transition to justify Tier G.

**Acceptance:** ⌘K opens a focus-trapped overlay; typing shows image+price+title rows with the
match bolded; screen reader announces the result count; keyboard-only operation works end to end;
every colour is client-controllable.

---

## Stream C — `sgs/filter-search` (small)

**No new display mode.** The council confirmed it's already correctly architected as a nested
type-to-narrow input under `woocommerce/product-filter-attribute` — the gap is purely visual.

- Fix the one genuinely hardcoded grey (`style.css:40`, bare `#757575`)
- Add per-block colour attrs via `SgsColourPanel` (input border, focus ring, text)
- Visual polish to match Stream B's search field: focus-ring transition, 8px-grid spacing

**Acceptance:** every colour client-controllable, visually consistent with product-search's field.

---

## Stream D — `sgs/buybox` optional card surface (smallest, do only if time allows)

Residual gap from D640 §1: `.sgs-buybox`'s root is a bare 2-col grid
(`style.css:10-14`, zero paint) with `supports.color.background/text:false` (`block.json:20-31`),
so there is no way to give the whole configurator a "card" look. One `block.json` supports change
+ a scoped background/border rule, same pattern as any other block.

⛔ **`sgs/mega-group` needs NOTHING** — confirmed no gap (D640 §1). Do not touch it.

---

## Orchestration

| Stream | Parallel with | Depends on | Suggested shape |
|---|---|---|---|
| A (multi-button) | B, C, D | none | 1 agent, A1 then A2 sequentially |
| B (product-search) | A, C, D | none | 1 agent — biggest piece, most design judgement |
| C (filter-search) | A, B, D | none | 1 agent, small |
| D (buybox) | A, B, C | none | 1 agent, smallest — or fold into C if under-loaded |

**Run `/delegate` per stream to pick the model — do not hardcode.** Rough shape: B carries the
most design + a11y judgement; A2 is architectural (new mechanism); A1/C/D are pattern-following.

**Worktree isolation: one per stream** (see "Why parallel" above).

## QC gates

1. **Per-stream, before that stream's agent reports done:** `/qc-inline` on its own work.
2. **After all streams land, before merge:** `/qc` multi-rater across the combined diff — this is
   the gate that catches cross-stream inconsistency (e.g. three streams inventing three different
   colour-attr naming conventions).
3. **`npm run build` must exit 0** on the merged result, all ~50 prebuild gates on their own
   merit. Expect the visual-diff gate to fire for every touched block — that is correct, these
   ARE visual changes; produce real before/after captures rather than bypassing.
4. **Live canary verification** on at least multi-button + product-search: a real click-through,
   not DOM assertions alone (recorded lesson: a swatch that opens is not a swatch that applies).

## Doc checkpoints

- **After each stream merges:** update `LEDGER.md`'s shipped table + numbers.
- **After all streams merge:** one `decisions.md` entry recording what actually shipped vs D640's
  plan, including any ruling that turned out wrong in practice. Then `/handoff`.
- **If a stream discovers D640 was wrong about something** — record it as a correction in
  `decisions.md` immediately, don't let it live only in a commit message.

## Then Stage 2

The universal gradient rollout (D636 + addendum) — 4 builders, background/text/border/icon-SVG.
Run `/sgs-update` to reseed the DB first: Stage 1's new attrs won't be in it, and Stage 2's
builders scope their per-block attribute lists from it.

## Parking lot

Deliberately OUT of scope for Stage 1 — do not let a stream pull these in:

- **The inherit-vs-overridden visual indicator** for A2. Bean ruled implicit-inherit with no
  indicator (D640 §5), knowingly accepting the tradeoff. Revisit only if it causes real client
  confusion in use — not on a builder's initiative.
- **The other ~27 of `sgs/button`'s style attributes.** A2 is scoped to ~6-8 core visual
  properties. Expanding the set is a fresh scope decision, not a judgement call mid-build.
- **Extending "Apply to all buttons"** to cover more properties. Legitimate future work, but it is
  a DIFFERENT mechanism from A2 — keep them separate or the distinction rots.
- **Category chips / faceted filter UI** on product-search. The council raised it; it needs a
  per-result term lookup the current REST shape doesn't do, and it wasn't part of Bean's ask.
- **`sgs/mega-group`** — confirmed no gap (D640 §1). Not a deferral; there is nothing to do.
- **Gradient on any of Stage 1's new attributes.** That is Stage 2's job, universally, in one
  pass — the whole reason Stage 1 runs first. Do not hand-add gradient to a new attr here.
