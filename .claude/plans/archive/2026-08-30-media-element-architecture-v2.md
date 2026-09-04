---
doc_type: design
title: The SGS Media Element — architecture v2 (post-council)
date: 2026-08-30
last_updated: 2026-09-01
status: APPROVED and MOSTLY BUILT — waves 1-5 deployed, live-verified and MERGED TO MAIN (PR #36, `13286fc69`); sgs/media fully converted to the atom system (16 atoms, not 10); before-after wired for object-fit/focal-point + its own independence bug fixed; wave 6 (gate rules) and wave 7 (remaining 4 surfaces) not started
owner: client-controls track
supersedes: 2026-08-30-media-element-architecture.md (v1, graded C/C+/D by a 7-seat council)
live_plan: ~/.claude/plans/media-element-zippy-boole.md
next_session_prompt: .claude/prompts/2026-09-01-media-element-waves-6-7.md
---

> **Status.** Waves 1-5 deployed, live-verified, and merged to `main`. `sgs/media` is now the
> fully-realised reference block: every one of its media controls — 16 atoms in total, not the
> 10/11 named earlier in this doc — comes from the shared, portable atom system, with the old
> block-private code deleted. `before-after`'s object-fit/focal-point are wired and independently
> scoped per photo (its own pre-existing shared-value bug is fixed). The falsification test in §10
> passed cleanly. Full build-out, the bugs found and fixed (including two genuine regressions an
> independent code review caught before merge), and exact atom-by-atom status: §17.
> **Next session: `.claude/prompts/2026-09-01-media-element-waves-6-7.md`.**
> Live status: `.claude/LEDGER.md`. Decisions: D909, D910.

# The SGS Media Element — architecture v2

v1 went to a 7-seat adversarial council. No seat graded it above C+. **The shape survived every
seat; every mechanism chosen from repo habit was overturned.** This is the rewrite. Each council
finding is marked ✅ ONBOARDED at the point it changed the design, so nothing sits unresolved.

---

## 0. Bean's question: is codegen made redundant by the helper architecture?

**Mostly yes — and the one gap it does not close has a better answer than codegen.**

Bean's reason for codegen was explicitly *not* convenience: *"not having to manually build every
single control over and over again and then sort out uniformity as an afterthought."* Taking the
three layers codegen would have covered:

| Layer | Covered by | Codegen needed? |
|---|---|---|
| **Control UI** | the panel registry (§3) — a panel is written once, mounted by name | **No** |
| **CSS** | one shared stylesheet + custom-property values (§5) | **No** |
| **Attribute DECLARATION** | ⚠ WordPress must know the attributes exist | **This was the real gap** |

**The gap, and why codegen is still the wrong tool for it.** WP silently discards an attribute a
block does not declare (D338), so the keys must be registered. The typography helper's own docstring
already names this: *"Use in a block's block.json generator or to register attrs — exported so a
block can spread the canonical set rather than hand-declaring each key."*

**The framework already solves this without generating anything.** Every `sgs*` extension injects its
attributes at runtime via `addFilter( 'blocks.registerBlockType', … )`
(`src/blocks/extensions/conditional-visibility.js:125`). No hand-declaration, no generated file.

**So: a block opts in declaratively and the attributes arrive.**

```jsonc
// block.json — the ONLY media-related thing a block writes
"supports": { "sgs": { "mediaElements": [
    { "prefix": "before", "context": "element" },
    { "prefix": "after",  "context": "element" }
] } }
```

A filter reads that and injects the full key set for each entry. **Uniformity is not sorted out
afterwards — it is a precondition of the injection**, because the keys come from one function.

**One narrow generator remains, and it is media's own.** The server needs the same attributes
registered so `ServerSideRender` validates (12 blocks use it). Two mechanisms do that job, and they
read the SAME `supports.sgs.mediaElements` declaration the JS filter reads, so there is still
exactly one source of truth:

- `includes/media-element-attrs-register.php` — a filter on `register_block_type_args` that injects
  the key set per declared entry.
- `scripts/generate-media-attributes.mjs` — emits the base→type map from `MediaElementControls.js`
  into `includes/media-element-attributes.generated.php`. Gated by its own `--check` in
  `gates.json`, so the server schema cannot drift from the editor's.

⛔ **Media cannot ride `generate-extension-attributes.js`, and never will.** That generator collects
keys with `/((?:sgs|fx)[A-Za-z0-9]*)\s*:\s*\{([^}]*)\}/g` — `sgs*`/`fx*` prefixes only. Media keeps
its existing names because v1 renames nothing, so **0 of 11** representative names match
(`imageUrl`, `beforeImageUrl`, `splitImage`, `bgVideo`, `mediaType`, `objectFit`, `videoAutoplay`
and the rest). Positive control: the same pattern matches `fxDisableMobile`, and the generated PHP
contains no non-`sgs`/`fx` key, so the regex works and simply cannot reach these names. Widening it
would touch a generator every `sgs*` extension depends on. Do not propose it again.

✅ ONBOARDED — Cynic MF-2 (do not build a second source of truth beside
`check-control-helper-parity.py`), Ship-PM M5, Competitor (codegen is cost, not proof of need).

---

## 1. What must be true when this is done

1. A media element is declared **once** and works on any block, at any insertion point.
2. Adding a control reaches **every** surface with **no per-block edit**.
3. Attributes, editor UI, canvas preview and front-end render **cannot drift**.
4. Emitted markup is **recognisable to the cloning pipeline**, using the vocabulary it already reads.
5. A block that hand-rolls media controls **is caught by a gate**.
6. **A client can set a different mobile image, in the editor, in under 30 seconds, on any block
   with media.** ← the only user-visible criterion, and the one Bean can QC.
7. **The RANGE of controls is identical across surfaces, not just their look.** A client who learns
   a control on one block finds the same control, doing the same thing, on every other block that
   can use it — and finds it in the same place.

### ⛔ SCOPE — SIX blocks, and what they are in scope FOR

**The six.** `sgs/media` · `sgs/before-after` · `sgs/hero` · `sgs/container` ·
`sgs/decorative-image` · `sgs/product-card`.

**A BACKGROUND IS NOT A MEDIA ELEMENT.** This is the line that defines the set, and
getting it wrong doubles it. A block with a background image, video, SVG or overlay gets
all of that from the shared `BackgroundPanel` and the container wrapper — a genuine shared
container concern, already standardised. **Nine blocks mount that panel** (container,
cta-section, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header,
trust-bar) and none of them joins this work on that basis. `site-header` and `site-footer`
have nothing to do with a media-element migration.

The media-ELEMENT work is a block with a **nested element that IS media** — an `<img>`,
`<video>` or inline `<svg>` rendered as content.

`sgs/container` is in scope for the opposite reason: it **owns** the background mechanism
the other eight inherit, which is why the atoms carry a `backdrop` scope. Fixing the shared
wrapper here is what later lets `hero`'s `BackgroundPanel` be updated, and then every other
panel host.

**Excluded, each with a reason recorded in the census:**

| Block | Why |
|---|---|
| `sgs/responsive-logo` | already better than the shared shape — native `<picture><source media>`, zero JS, genuinely per-tier with inherit-up |
| `sgs/info-box` | not a media surface: `mediaType`/`image`/`icon` are DEAD legacy attrs from before its FR-22-6 InnerBlocks migration; the real media is in `sgs/icon` and `sgs/media` CHILDREN. **The dead attrs are being deleted.** |
| `sgs/image-sequence` | `inserter: false`, so no client can add it, and setup needs a Python/ffmpeg CLI. Its "media" is a scroll-scrubbed canvas frame sequence with a fail-open thumbnail, not a displayed image |

### ⚠ `sgs/trust-bar` and `sgs/brand-strip` — real, but LIMITED

Both DO have a nested media element separate from their background: `trust-bar` renders
`<img class="sgs-trust-bar__badge-img">` driven by `badgeImageObjectFit`/`badgeImageSize`,
and `brand-strip` renders a `logos` repeater driven by `logoFit`. Architecture §11b already
recorded both as a standing correction to the census's population.

⛔ **They are not general media surfaces and must not be treated as one.** A badge and a
logo are small, fixed-purpose images. Decide per control whether it is genuinely USEFUL in
that context before offering it — a per-device art-directed video poster on a trust badge
is not standardisation, it is clutter. Take the context into account and do not overdo it.

### ⭐ AFTER this work: upgrade the shared BackgroundPanel to match

Not part of the six, and deliberately sequenced after — but it is where the value compounds,
and it is why `sgs/container` is in scope now.

Once the media-element controls exist, go through `BackgroundPanel` for **each of the three
media types** and decide:

1. **Which of our new controls belong on a background at all**, given the background sits on
   the ROOT rather than on a foreground element. Some are irrelevant there; some are only
   meaningful there. That judgement is the work — not a copy-paste of the element set.
2. **Where the picking control differs, bring the panel up to ours** — the same enums, and
   the same help text for the responsive override / art-direction behaviour, so an operator
   meets one vocabulary rather than two.

Order: fix the shared wrapper via `sgs/container` → `hero`'s `BackgroundPanel` follows →
then every other panel host.

### ⛔ Absence is a GAP, not a decision

The nine media surfaces were built one at a time, ad hoc, and were never standardised against each
other. **A name missing from a surface is therefore evidence of an accidental gap, not of a
deliberate exclusion**, and must never be read as one.

This governs how the census is used. It is a **gap analysis**, not a wiring manifest: the target is
the full standardised set on every surface that can carry it, and the work is the DELTA between
that and what each surface has today. Counting only what exists would standardise the look of the
controls while leaving the range of them as uneven as it is now.

**The one legitimate exclusion is a genuinely different concept wearing a similar name.**
`sgs/decorative-image`'s `positionX`/`positionY` place the decoration absolutely on the page; they
are not the position of an object within its container, and they never join the focal-point atom. An
exclusion must be justified at that level — a different concept — never by "this surface does not
have it today".

✅ ONBOARDED — Competitor MISSING 5 / Ship-PM MISSING 2: v1's success criteria were all internal
engineering invariants with nothing Bean could look at.

### The diagnosis: partial adoption, caused by a signature mismatch

`sgs_tier_media_toggle_css()` is called at `helpers-tier-media.php:267` from
`sgs_tier_media_render()`, which hero (`render.php:1265`) and timeline (`render.php:748`) both use.

**2 adopters of ~9 surfaces, with one holdout.** `sgs/media` hand-rolls past the helper because the
same cascade has two incompatible signatures — shared `($present, $base_class, $uid)` versus a
closure taking `($modifier_base, $tiers_present)`.

**The failure mode is PARTIAL adoption, and the signature mismatch is its cause.** That is why this
is a three-day change rather than a three-week one.

⚠ A search covering only direct block-level calls will report this helper as having zero callers.
Follow the call graph.

---

## 2. The four layers

| Layer | Owns | Mirrors |
|---|---|---|
| **L1 Controls** | attribute NAMING | `sgs_typography_attr()` / `typographyAttrName()` — proven, gated |
| **L2 Panels** | GROUPING | `SgsColourPanel` — 65 adopters, the framework's most-adopted shared component (see the correction below) |
| **L3 Element** | DISPATCH + RENDER | `ContainerWrapperControls` + `SGS_Container_Wrapper` |
| **L4 Styling** | CSS | `before-after`'s custom-property pattern |

### L1 — naming, with a prefix

```js
mediaAttrName( prefix, base )   // 'before' + 'ImageUrl' -> 'beforeImageUrl'; '' -> 'imageUrl'
mediaAttrKeys( prefix )         // the canonical key set
```
```php
sgs_media_element_attr( $prefix, $base )                       // NOT sgs_media_attr — see below
sgs_media_element_stored_attr( $block_slug, $prefix, $base )
sgs_media_element_value( array $attributes, $name, $want )
```

⛔ **The PHP names carry `media_element`, not `media`, and that is load-bearing.** The parity gate
derives a slug from the JS component (`MediaElementControls` → `media_element`) and looks for a
`sgs_*` function under `includes/` containing it. `sgs_media_attr()` — the name this section
would read as **ABSENT**, and Media would silently never register as the
fourth family.

⛔ **`src/components/`, not `src/media/controls/`** (Bean's decision, taken). The same gate discovers
helper families from disk by convention: a `*AttrName`/`*AttrKeys` export in `src/components/`, plus
the PHP twin. The originally-proposed `src/media/controls/` sits outside that scan.

Identical shape to typography, which `check-control-helper-parity.py` already measures
(*"3 name-keyed; of those 3, 3 complete"*). **Media becomes the fourth.**

⭐ **Measured while building it (Wave 2): the naming risk was small; the SHAPE risk was large.**
Across 128 real media attributes on six surfaces, `prefix + Base` reproduces every stored name except
**FOUR**, in two intentional cases — `before-after`'s block-level shared `videoAutoplay` (+2 tiers),
and `decorative-image`'s legacy composite `decorMedia`. So `STORED_AS` is tiny. But there are **TEN
distinct storage shapes** for one concept, and a name-only `storedAs` map — what this section
could only ever read one of them. Hence `sgs_media_element_value()`,
which reads across all ten (`media-object`, `attachment-id`, `attachment-id-union`, `url-string`,
`svg-markup`, `alt-string`, `tri-state-inherit`, `boolean`, `number`, `string`).

⛔ **`storedAs`: ZERO attribute renames in v1.** A rename is a stored-`post_content` migration,
because WP discards undeclared attributes — the client's image vanishes with every gate green. Each
descriptor carries the surface's EXISTING name (`beforeImageUrlTablet` stays as it is). Determinism
for the pipeline comes from the descriptor map, not from the string.
✅ ONBOARDED — Ship-PM M1.

### L2 — panels, and L2b — atoms between them

**Three levels, not two.** Names group into ATOMS; atoms group into PANELS; panels are selected by
CONTEXT. That middle level is what makes the range of controls uniform: a surface adopts an atom,
not a list of attribute names, so it cannot adopt half of one.

```js
// L2b — an atom owns a coherent group of names, its disclosure rule and its validator.
// L2  — a panel composes atoms into caller-composed rows.
MediaElementControls( { attributes, setAttributes, prefix, context, insertion, atoms } )
```

Rows are composed by the caller and falsy entries dropped, so a condition inlines directly in the
array literal. Show/hide is driven by media type and by the other settings an atom declares it
depends on — never by which attributes a surface happens to have.

**The exemplar is `SgsColourPanel`** — 65 adopters, the framework's most-adopted shared component,
and the one whose shape fits. Measured adoption (`grep -l "<Component" src/blocks/*/edit.js`):

```
65  SgsColourPanel
51  ResponsiveBoxControl
45  SgsBorderControl
23  ContainerWrapperControls
18  TypographyControls
```

Its shape is **caller-composed rows, not a hardcoded registry**: the component owns the row SHAPE
and the panel chrome; the caller passes `rows: [{ key, label, states, gradientCapable }]`, and falsy
entries are dropped. That fits media, whose disclosure rules are per-attribute and per-type rather
than per-context — a `backdrop` surface is not "the `element` list minus two".

⚠ `ContainerWrapperControls` (which owns `KIND_PANELS`) is the wrong model here on both counts: it
has 23 mounts, not the most, and it lives at `src/blocks/container/components/`, so
`check-control-helper-parity.py` never sees it. `KIND_PANELS` itself appears in one file, is
module-private, and no live mount passes `kind: 'section'`.

⚠ **Inherit `SgsColourPanel`'s shape; not its two flaws.**

1. **It hardcodes `group="styles"`** (`SgsColourPanel.js:116`, D621) — the cause of the C14 tab-split
   across all 65 adopters. `MediaElementControls` takes its group from `insertion`.
2. **Its disclosure rule is the opposite of ours.** Its docblock: *"an entry that doesn't apply is
   omitted from the `rows` array by the calling block."* Media needs both states: **omit when a
   control structurally cannot apply; render it disabled with a `hiddenReason` when it merely does
   not apply yet.** A silently-absent control is the "where did my setting go?" defect this work
   exists to fix.

✅ ONBOARDED — the "insert different sets" model Bean described from the colour helpers.

### L3 — dispatch, and the one place we do NOT copy the wrapper

⛔ **STATUS (2026-08-31, measured): NOT BUILT. This section describes Wave 5a's deliverable, not
something in the tree.** Neither signature below exists — `grep -rn "SGS_Media_Element"` returns
nothing, and `MediaElementControls.js` is a naming module with zero JSX (§17). Read this as a spec.

⚠ **The component takes a NEW filename.** `src/components/MediaElementControls.js` is already the
L1 naming module, so the component ships as **`src/components/MediaElementPanel.js`** with
**`includes/class-sgs-media-element.php`** as its PHP twin. Reusing the old name collides.

```js
// TO BUILD — src/components/MediaElementPanel.js
MediaElementPanel( { attributes, setAttributes, context, prefix, blockSlug, insertion, atoms, scope } )
```
```php
// TO BUILD — includes/class-sgs-media-element.php
SGS_Media_Element::render( array $attributes, $block, string $prefix, string $context, array $opts )
```

⚠ **`disclosure()` has TWO legal return shapes** and the dispatcher must handle both or one throw
kills the whole inspector (D910): `{ state, hiddenReason }`, or a MAP of base → that same object.
`video-behaviour` needs the map — it owns ten toggles where autoplay locks two.

⛔ **`ContainerWrapperControls` opens its own `<InspectorControls>`, so it always creates top-level
panels.** Correct for a block-level wrapper; wrong for element-level media, which by C14 must sit
inside its element's panel. So:

- `insertion: 'root'` → returns its own `<InspectorControls>`, like the wrapper.
- `insertion: 'element'` → returns bare rows for a parent element panel to absorb.

**This is also what fixes the Video/SVG panels drifting below Visibility Conditions in Bean's
screenshots** — they stop being free-floating top-level panels at all.

⚠ The wrapper mentions "prefix" **once** in the whole class; it reads bare `maxWidth`/`gap`. It gets
away with that because a block has exactly one wrapper. **Media cannot** — `before-after` has two,
`hero` has split + background. Prefix runs through all four layers.

### L4 — styling: rules in ONE stylesheet, values as custom properties

**This is the fix for the wrapper's real weakness, which Bean named.** `container/edit.js:217`
hand-builds a `style` object for the canvas while `class-sgs-container-wrapper.php:476-580` builds
the front-end CSS separately — two implementations, and its own comments record the bill twice
(*"a bare destructure was a real live bug for maxWidth's editor"*).

`before-after` already solves it: PHP emits only **custom-property values**
(`--sgs-before-after-divider-width`, `render.php:235`), while `style.css` holds the rules,
referencing them **17 times**. Its `block.json` declares `style: file:./style-index.css` — which
WordPress loads in **both** the canvas and the front end.

**So the styling logic exists once, in a stylesheet both sides load.** Each side only sets values.
Duplication shrinks from "all the CSS" to "read attribute → set variable" — small enough to be
covered by a shared fixture test.

### ⛔ SCOPE PER ELEMENT, NOT PER BLOCK — the constraint that makes L4 work

The atoms emit fixed custom-property names — `--sgs-media-object-fit`, never
`--sgs-media-before-object-fit` — because the shared stylesheet is static CSS and cannot know a
surface's prefix. **That is only safe when each media element carries its own scope class.**

Without it, a block with two media elements sets the same property twice on one scope and the second
wins: a client sets `before=contain` and `after=fill`, and both render fill. `sgs/before-after` is
the falsifying surface precisely because it has two, so this was the defect that would have made
Wave 5 look like an abstraction failure when it was a scoping omission.

```php
sgs_media_element_scope_class( $uid, $prefix )   // -> {uid} or {uid}--{prefix}
sgs_media_element_style( $attributes, $prefix, $block_slug, $scope_class, $atoms )
```

⭐ **`sgs/hero` already had this answer from the other direction** — it scopes its object-fit
selector to `.{uid} .sgs-hero__split-media--image` rather than to the block root. Reading a surface
where the control ALREADY works, and diffing, is how this was found; see §12's method note.
Gated by the scope assertions in `test-media-atom-parity.mjs`.

### ⛔ ONE MARKER CLASS CANNOT CARRY ALL TEN ATOMS (added 2026-08-31)

Every rule keys on the single marker `.sgs-media-el` (`_base.css`). Measured against what the atoms
actually do, **the ten need TWO different DOM nodes**, and two of them are currently pointed at the
wrong one:

| Atom | Attaches to | Why |
|---|---|---|
| `object-fit`, `focal-point` | the **replaced element** (`<img>`/`<video>`) | replaced-element properties; inert on a wrapper, and a LIE on an SVG `<div>`/`<span>` |
| `box-shape`, `intrinsic` | either | height/width/max-*/aspect-ratio/clip-path are valid on any element |
| `overlay` | a **container** | `overlay.css` paints via `.sgs-media-el::after`, and **a replaced element generates no pseudo-element** |
| `source` | a **container** | paints `background-image`; its own docblock says element-scope surfaces "never rely on this rule" |

⚠ `overlay.css`'s docblock reasons correctly that a background-colour would sit BEHIND an `<img>`'s
painted pixels — then concludes `::after` paints on top, never addressing that `<img>::after` does
not render at all. **A rule that cannot reach its subject**: green in every gate, invisible on the
page. The repo's own two working overlays both paint onto a REAL node, never a pseudo-element on
the media — `hero/style.css:285` `.sgs-hero__media-overlay` and `:144` `.sgs-hero__overlay`, plus
`SGS_Container_Wrapper`. That is E19's method applied to the shared layer itself.

**The fix (Wave 5a, design-gated):** an explicit **`attachesTo: 'element' | 'box'`** field per atom
in `registry.js`, and the renderer emits two markers — `.sgs-media-el` (the replaced element) and
`.sgs-media-box` (its container).

⛔ **Do NOT overload the existing `scope` field.** `scope` (`element|backdrop|both`) already selects
a VOCABULARY — object-fit's element enum is `cover contain fill none scale-down`, its backdrop enum
is `cover contain auto`. Attachment is a different axis (which DOM node). Two orthogonal axes in one
enum is a recorded failure mode; keep them as two fields.

✅ **PROVEN IN A BROWSER, 2026-08-31.** Chromium via Playwright, `about:blank`,
`.probe::after{content:'';position:absolute;inset:0;background-color:rgb(255,0,0)}` applied to a
100x100 `<div>` and a 100x100 `<img>`, both painted blue underneath, both confirmed non-zero area
(`getBoundingClientRect` 100x100 each, so the zero-area failure mode is excluded). Screenshot
pixel-sampled with PIL:

| Element | Centre pixel | Reading |
|---|---|---|
| `<div>` at (50,50) | `(255, 0, 0)` **red** | ::after PAINTED — **positive control passed** |
| `<img>` at (200,50) | `(0, 0, 255)` **blue** | ::after did NOT paint |
| page background | `(255,255,255)` | probe isolated |

⛔ **THE COMPUTED-STYLE CHECK LIES HERE.** `getComputedStyle( el, '::after' )
.backgroundColor` returned `rgb(255, 0, 0)` for **BOTH** elements — the cascade resolves regardless
of whether a pseudo-element is generated. Anyone verifying this the obvious way concludes the
overlay works on an `<img>`. Only the pixel sample discriminates. (One weak tell in the computed
values: the div's `::after` resolved `width: 100px`, the img's resolved `width: auto`.)

This is the same class as the three instruments in D910 and as
STOP-A-COMPUTED-STYLE-CHECK-CANNOT-SEE-A-ZERO-AREA-ELEMENT: **the check could not reach its
subject.** Record it as the reason overlay must attach to a box.

⚠ **Second-order: a surface may have no container at all.** `sgs/media`'s naked mode renders the
`<img>` AS the block root (`media/render.php:1307`), so there is nowhere to put `.sgs-media-box`.
Add "no overlay set" to that gate rather than shipping a dead overlay control.

### ⛔ A SHARED FALLBACK MUST BE THE MEASURED DEFAULT, NEVER `initial`

The atom rules sit at `(0,1,0)` on `.sgs-media-el` and fire unconditionally, so a
`var( --x, initial )` fallback beats a block's own `:where()` default at `(0,0,0)`. `sgs/media`
defaults object-fit to `cover` exactly that way, and an `initial` fallback would silently replace it
with `fill` — no attribute changed, nothing to grep for, every gate green.

Fallbacks are the values the census MEASURED: `cover` for object-fit and background-size (all four
surfaces), `center center` for the position pair, `no-repeat`, `scroll`. `initial` / `unset` /
`revert` are banned outright by `check-media-atom-purity.js`.

**A rule that LOSES is indistinguishable from one that is ABSENT. A rule that silently WINS is
worse** — the old default simply stops applying and the change looks like it came from nowhere.

⛔ **v1 claimed the canvas and server run "literally the same function". They cannot** — one is JS,
one is PHP. v2 claims what is achievable and testable: **one stylesheet, one descriptor, two thin
value-setters, and a fixture asserting both emit identical custom-property declarations for a fixed
attribute set.**

⭐ **The stylesheet's home, named (2026-08-30).** `before-after` solves this per-block via its own
`block.json` `style:` entry, which WordPress loads in both realms — but a SHARED layer has no block
to hang that on. The framework's existing answer is **`assets/css/extensions.css`**, enqueued twice
by design: `class-sgs-blocks.php:332-345` into the editor canvas (handle `sgs-extensions-editor`)
and `:419-428` on the front end (handle `sgs-extensions`). Media takes the same pattern with its own
file, **`assets/css/media-element.css`**.

⛔ **Breakpoints come from `SGS_BREAKPOINTS` (JS) / `SGS_Breakpoints` (PHP), never a literal — and
never a copy of `extensions.css`'s own pair, which is off by one.** Measured: its Image Controls
block uses tablet `min-width:769px` / mobile `max-width:768px` against the project's 768/1024
device-tier standard. That is a real bug in the device-tier system (not an arbitrary visual
breakpoint), recorded separately; the media stylesheet must not inherit it.

✅ ONBOARDED — Cynic MF-3, Ship-PM, Platform S2, Platform M2 (the one breakpoint source).

---

## 3. Attributes, breakpoints and the platform

### ⛔ Block Supports — corrected rejection

**Two grounds, and they are sufficient:**
1. **Singleton per block** — no instancing or prefixing. `before-after` genuinely cannot be expressed.
2. **No per-tier vocabulary** — *today*. See below.

**Where a support genuinely fits an atom (border, shadow), use the native support with
`__experimentalSkipSerialization` + `selectors` rather than wrapping it** — strictly less code.
✅ ONBOARDED — Platform M1.

### ⭐ Core is landing per-viewport breakpoints in WP 7.1 — the canary's own version

[Gutenberg #75707](https://github.com/WordPress/gutenberg/issues/75707) ("WordPress 7.1: configurable
breakpoints and theme.json integration") is **closed, Done**; PR #73994 implements per-breakpoint
behaviour through the Style Engine.

⛔ **Therefore: never hardcode 768/1024 in a media module.** Breakpoints resolve from ONE exported
source that can later point at `theme.json`'s viewport definitions. Otherwise SGS ships a second
breakpoint vocabulary beside core's on the same version, and inherits a migration that cannot be
done mechanically.
✅ ONBOARDED — Platform M2.

---

## 4. Markup — keep what the pipeline reads, add what the renderer needs

⛔ **v1's `<picture>` swap is DROPPED.** `media/render.php:686` records the current shape as a
deliberate decision: *"deliberately matching hero rather than `<picture>`/`<source>`, because the
draft vocabulary the cloning pipeline reads IS the BEM modifier. One convention on both ends means
the clone round-trips."* v1 reversed that with zero pipeline budget, against binding rule R-31-2.

**v2: the type stays in the BEM class AND gains a data attribute.**

```html
<figure class="sgs-media sgs-media--image" data-sgs-media="image">
  <img class="sgs-media__image" …>          <!-- __video / __svg for other types -->
```

- **Fixes the real defect** — `before-after` currently gives video and SVG the base class `__img`,
  so a BEM reader misclassifies them.
- **Costs the walker nothing** — it keeps reading the vocabulary it already reads.
- `data-sgs-media` is for output-side checks only, never the walker's input.

✅ ONBOARDED — Competitor MF2, Cynic MF-7, Ship-PM M3.

### Generate, then amend — not "build with the Tag Processor"

⛔ **v1 named the wrong class.** `WP_HTML_Tag_Processor` modifies attributes on matching tags; it
cannot pair open/close tags, set inner content, or create nodes, and the composable-templating work
did not ship in 6.9.

**v2: emit with `wp_get_attachment_image()`, then amend with `WP_HTML_Tag_Processor`**, using
`WP_HTML_Processor::create_fragment()` where structural work is genuinely needed.

**This also puts core's image pipeline underneath us instead of throwing it away** — `srcset`,
`sizes` (incl. `sizes="auto"` from 6.7), `loading`, `decoding`, `fetchpriority`, and the
`wp_get_attachment_image_attributes` filter chain. `hero/render.php:315` already depends on
`fetchpriority` for its LCP strategy; v1 would have regressed it.

⚠ **Four other mechanisms already amend block markup with the Tag Processor**
(`fx-surface-treatment.js`, `webgl/renderer.js`, `device-visibility.php`,
`animation-attributes.php`). Ordering must be declared — one writer per artefact.
✅ ONBOARDED — Platform M3, M4, N1–N4; Cynic MISSING M-F.

---

## 5. The atoms

**Common presentation** (image · video · svg): box-shape · **aspect-ratio** · object-fit ·
focal-point · padding · border+radius · opacity · shadow · alignment · max-width ·
**overlay** (colour, gradient, opacity ×3 tiers, blend mode).

**Meaning:** alt-text · decorative · caption · link.

**Image:** lazy-load · **priority/LCP** · ken-burns · parallax.
**Video:** autoplay · loop · muted · controls · playsinline · poster · preload · **`<track>` captions**.
**SVG:** svg-source · animation-source · path-draw.

### ⭐ SHIPPED: SIXTEEN ATOMS, NOT THIRTY, NOT TEN EITHER (updated 2026-09-01)

⚠ **This section originally shipped ten atoms and named the other ~20 concepts below as deferred
to v2. Six of those "v2" concepts have since shipped: `motion` (§18.4, ken-burns/parallax) landed
in Wave 5a; `opacity`, `shadow`, `media-padding`, `caption` and `link` landed in Wave 5c after Bean
challenged why `sgs/media`'s panel still had hand-rolled code for them once the atom system
existed — see §17's Wave 5 record. The roster below is what actually exists in `registry.js`
today, not the original ten-atom plan.**

The list further below is what's still genuinely left for later (lazy-load, LCP priority,
path-draw, alignment, max-width, border as a concept separate from `box-shape`'s own border). Read
this section as "what shipped", not "what was planned".

Ten rather than a smaller cut for two reasons. Meaning, video behaviour, SVG presentation and
intrinsic dimensions account for **36 of the census's 103 names**, and the cross-attribute rule
below (autoplay ⇒ muted + playsinline) governs video behaviour, so any cut excluding it leaves that
rule without an owner. Nothing is wired to a block until step 4, so completeness costs about an hour.

**The roster:**

| # | Atom | Manifest |
|---|---|---|
| 1 | `source` | census (58 pairs) |
| 2 | `media-type` | census (8) |
| 3 | `video-behaviour` | census (22) — owns the `requires` rule |
| 4 | `meaning` (alt / decorative) | census (7) |
| 5 | `intrinsic` (width / height) | census (3) — no control; written from the chosen media |
| 6 | `svg-presentation` | census (8) |
| 7 | `object-fit` | ⚠ presentation half — see §9 |
| 8 | `focal-point` | ⚠ presentation half |
| 9 | `box-shape` | ⚠ presentation half — also absorbed border (width/style/colour/gradient, tiered radius) via the standard `SgsBorderControl`, and `aspect-ratio`/`max-width`/`max-height` |
| 10 | `overlay` | ⚠ presentation half |
| 11 | `motion` (ken-burns / parallax) | added Wave 5a (§18.4) — harvested from hero + container's working implementations |
| 12 | `opacity` | added Wave 5c (2026-09-01) |
| 13 | `shadow` | added Wave 5c — wraps the existing shared `ShadowControl`, no new UI |
| 14 | `media-padding` | added Wave 5c — wraps the existing shared `ResponsiveBoxControl`, no new UI |
| 15 | `caption` | added Wave 5c |
| 16 | `link` | added Wave 5c — wraps the existing shared `LinkPopoverField`, no new UI |

The remaining concepts still genuinely deferred: lazy-load, LCP priority, ken-burns/parallax's
SVG-type gating question (§18.4's open item), path-draw, and plain `alignment` as its own control.
`alignment` was found this session to be duplicated ad hoc in a few unrelated non-media blocks
too (`multi-button`, `feature-grid`, `separator`) — a smaller, separate framework-wide
unification, not part of this track's scope, but worth knowing before treating its absence here
as a gap unique to media.

⭐ **A control becomes the standard by BEING a shared helper, not by being described (Bean, 2026-08-30).**
Every control an atom needs that does not already exist ships as ONE component in
`src/components/media/controls/`, mountable anywhere — so divergence is impossible rather than
merely detectable. The alternative considered and rejected was registering each control's recipe in
`scripts/consistency/golden-controls.json`; measured, that file encodes 14 control types but exactly
**one** (`colour`) has a rule that reads it, so a `media` or `enum` recipe would be a row nothing
enforces. Spec 35 PART O remains the reference for what good looks like; the shared component is
what makes it universal.

✅ ONBOARDED — Ship-PM (the atom list was a wish-list, not a plan) — **finding upheld, cut line
revised from six to ten on measured coverage.** Plus Bean's shared-helper ruling, 2026-08-30.

### ⭐ object-fit across three enums — resolved inline (Bean, 2026-08-30)

Three rival vocabularies exist, and this was briefly planned as a design gate. Measured, it is not:

| Source | Values |
|---|---|
| canonical — `MediaSizingPanel`, `sgs/media`, `helpers-media-position.php`, `before-after/render.php` | `cover, contain, fill, none, scale-down` |
| `extensions/image-controls.js` | the same 5 **plus `""` = "Inherit (no override)"** |
| `hero/edit.js` `IMAGE_FIT_OPTIONS` | `cover, contain, fill,` **`custom`** — and hero declares NO enum, so `custom` round-trips |

⛔ **`custom` is not a fit value and not a media-type adaptation — it is a SIZING MODE.** Its label is
literally `'Custom (explicit width/height)'` (`hero/edit.js:68`), and `hero/render.php:625` gates
object-fit **off** so `splitMediaWidth`/`splitMediaHeight` take over. It behaves identically for
image, video and SVG. It is the same concept `sgs/media` already models properly as
`mediaSizing: auto|height|ratio`.

**Resolution: `custom` belongs to atom 9 (`box-shape`), not atom 7.** Atom 7's enum is the canonical
five; it *reads* hero's `custom` as "sizing mode = explicit" via its `reads` field. No rename, no
design gate.

⭐ **Hero already holds the correct answer for video and SVG, and the atoms adopt it.**
`hero/render.php:618-624` scopes the fit selector to `--image, --video` only, deliberately excluding
the SVG tier's `<span>` wrapper, with the reason stated in the code: *"these are replaced-element
properties and do nothing on the SVG tier's `<span>` wrapper, so emitting them there would be a lie
about what the property actually affects."* So SVG gets a genuinely separate implementation
(`preserveAspectRatio` or a sized wrapper), **never a third selector pretending the property
applies.**

⚠ The universal `image-controls` extension (`sgsObjectFit`/`sgsObjectPosition`, **21 blocks opted
in**) stays as it is for the blocks outside this population. The media atoms READ both vocabularies
and emit one; reworking the extension itself is out of scope and would be its own design gate.

### Cross-attribute constraints — a `requires` field, not just a `gate`

`autoplay` without `muted` + `playsinline` is silently blocked on every mobile browser. So a
descriptor carries `requires`, enforced in **both** the control UI and the renderer.

⛔ **This is not hypothetical — there is a live defect, measured 2026-08-30.** The coupling exists in
exactly ONE place and it is client-side only: `src/blocks/media/view.js:148-152` forces
`video.muted = true` when autoplay is on. `src/blocks/media/render.php:1076-1080` builds the three
flags **independently, with no guard at all**:

```php
$autoplay_attr = $video_autoplay ? ' autoplay' : '';
$muted_attr    = $video_muted    ? ' muted'    : '';
$inline_attr   = $video_inline   ? ' playsinline' : '';
```

So a client setting autoplay-on + muted-off gets server markup the browser refuses to play, and
`view.js` silently repairs it on hydration — **no-JS visitors keep the broken state**. `playsinline`
is not coupled anywhere. Every other surface hardcodes the trio together, so the rule holds there by
construction; `sgs/media` is the only surface where a client can unmute, which is also why it is the
only one with `<track>` captions.

**Atom 3 (`video-behaviour`) owns this**, and fixing `render.php` — not merely mirroring `view.js` —
is its acceptance criterion.
✅ ONBOARDED — Platform M6.
✅ **CLOSED, live-verified 2026-09-01.** PHP-level fix shipped and verified (D909,
`reports/visual-diff/media-2026-08-30.md`); the no-JS browser check that report explicitly owed
(the case above, its negative control, at desktop AND tablet) ran with Playwright's
`javaScriptEnabled: false` — genuinely disabled, since `view.js`'s hydration repair would mask a
broken server fix if JS ran. All 4 assertions held; both viewport widths render identical
correctly-coupled desktop-tier markup, confirming render.php's own comment that tier overrides
are JS-time only. No longer an open defect.

### Accessibility — three items that are compliance, not preference

- **`<track>` captions.** `grep -rn "<track"` returned **zero** across the framework, confirmed with
  a positive control (the identical command shape returns 68 matches for `<video>`, so the zero was
  real and not a filter artefact). WCAG 1.2.2 is **Level A**, below the stated AA baseline.
  ✅ **SHIPPED 2026-08-30** (`3b17d96a5`) on `sgs/media` — the only surface where a client can unmute,
  hence the only one where the requirement bites. Live-verified 6/6 with a negative control.
- **`prefers-reduced-motion`** on ken-burns and parallax — ⛔ **ALREADY IMPLEMENTED. Do not build
  it.** `hero/style.css` (476, 519, 558, 567-577) guards split-media twice, with a `no-preference`
  gate plus an explicit `reduce` override; `container/style.css` (235, 280) guards both Ken Burns
  paths; `assets/js/parallax.js:28` bails on `matchMedia('(prefers-reduced-motion: reduce)')` before
  any work. **Adding another guard produces a duplicate, which is its own defect class.** A NEW
  motion atom carries its own guard; the existing two are covered.
- **Decorative/alt** stays per-instance (the same logo is meaningful in a header, decorative in a
  footer strip). Now **atom 4 (`meaning`)** rather than an unowned principle.
✅ ONBOARDED — Platform M5, N8, N9 (N-whichever covered reduced motion is satisfied by construction,
not by new code).

---

## 5b. ⭐ THE SOURCE AXIS — static vs bound (a gap in my own onboarding, caught on re-audit)

**I accepted the Competitor's MF4 and then failed to represent it. Closing it here.**

Client sites need media that comes from **somewhere else**: a post's featured image, a WooCommerce
product image, a query-loop item, a meta field. WordPress ships the Block Bindings API for exactly
this. Kadence and Spectra both put dynamic-content pickers on image fields — it is what an agency
actually sells.

**Bean's own product-card ruling already requires it.** He ruled that bound mode must stop offering
a lone "Override image" boolean and instead *"open up the same panels that exist on the typed side
with the exact same functionality."* That IS the binding case, and v2 had no axis to express it.

**So `source` is a descriptor field, designed now and shipped later:**

```js
source: 'static' | 'binding'
```

- `static` — an attachment the client picked. Today's behaviour.
- `binding` — the value resolves from a source (product image, featured image, meta) **server-side,
  before the delivery/render step**. Everything downstream — presentation atoms, tiers, overlay,
  disclosure — is identical, because they operate on the RESOLVED media, not on where it came from.

**Why it must be designed now even if built later:** retrofitting a source axis after nine surfaces
are wired means every consumer needing bound media becomes a per-block fork — precisely the failure
this whole architecture exists to prevent, reintroduced through the one door left open.

⚠ **Interaction with Bean's variation ruling (already settled, do not re-open):** variation photos
are a *separate opt-in mechanism*, not a competing precedence layer. A variation swaps WHICH asset
displays; the tier machinery styles whatever is displayed; a binding resolves where the default came
from. Three independent choices, no conflict-resolution layer.

✅ ONBOARDED — Competitor MF4, and Bean's product-card bound-mode ruling of 2026-08-30.

---

## 6. Disclosure — and the affordance v1 was missing

1. Nothing that styles media appears before media exists.
2. Type-specific controls appear only for that type.
3. Every attribute that exists has a control.
4. ⛔ **Gate on the CONTENT, never on a sibling.** Hero's live bug is a content gate keyed to the
   wrong attribute — the media-type enum is gated on `splitImage?.url`, so video is unreachable
   without first uploading an unwanted image, while `render.php` supports image-free video fine.

### ⭐ `hiddenReason` — or we rebuild the bug we are fixing

v1's `gate: 'hasSource'` is **the same shape as the defect it was written to fix**. A hidden control
is a control the client cannot find, and *"where did my setting go?"* is the commonest support call.

**Every gated control carries a `hiddenReason`.** Where the gate depends on a value the client has
not set yet, the row renders **disabled with that reason**, not absent. Where it structurally cannot
apply, it is omitted. Two different states, deliberately.
✅ ONBOARDED — Support MUST-FIX 1, SHOULD-FIX 7/8.

### Day-two edits

Switching media type **never deletes another type's stored attributes** — switch and switch back is
non-destructive. Every picker is hard-restricted to its descriptor's `types`
(`MediaPicker` currently defaults to `['image','video']` unrestricted, so a video can land in an
image attribute and render as a broken `<img src="….mp4">`).
✅ ONBOARDED — Support MUST-FIX 2, SHOULD-FIX 6.

### Error states

`SGS_Media_Element::render()` declares behaviour for: deleted attachment, unreachable URL,
unsupported file, SVG failing sanitisation. Editor shows a placeholder naming the cause; the front
end's behaviour is documented rather than accidental.
✅ ONBOARDED — Support MUST-FIX 4.

---

## 7. Security

| Item | Position |
|---|---|
| **Editor SVG XSS** | ✅ **CLOSED 2026-08-30, fully verified 2026-09-01.** The population was **six** unsanitised editor mounts (hero, media, timeline, IconPicker ×2, IconPreview) and **six** server allowlists — two byte-identical copies, two genuinely diverging, plus two in `button/render.php`. Shipped: allowlists unified 6→1 into `sgs_allowed_svg_tags()` (`ad414bfee`, `89f1aefdf`), the JS sanitiser generated from that PHP and applied at all six mounts (`52e232692`, `51591f936`), misleading help text corrected (`c86938f2a`). Live-verified: `window.SGS_PWNED` undefined in both realms. **`button/render.php`'s two local allowlists (2026-09-01):** diffed element-by-element against the shared helper (not "two allowlists" vs a vague count — there are 4 real `wp_kses()` calls in that file, not the previously-cited 7; two are the SVG allowlists). Confirmed deliberate: icon SVGs are static Lucide glyphs needing none of the shared helper's gradients/filters/masks/`<use>`/`<animate>`/`<a>` tags. Left narrow, now documented in code at both declarations (`464eca073`). **SMIL bypass (2026-09-01): EXECUTED, no longer reasoned-only.** `<a><animate attributeName="href" to="javascript:…">` fired against the real sanitiser on a canary page, gated by a positive control (a raw unsanitised `javascript:` href, clicked, proves the harness can observe real execution) that ran first and passed. Result: bypass BLOCKED, control FIRED — the sanitised `<a>` never gains a live `href` for SMIL to rewrite. `1a1f291dd`, `reports/visual-diff/smil-bypass-2026-09-01.md`. |
| **Attachment capability** | IDs come from attributes; any role that can edit a post can name any integer. Picker restricted to media the operator can manage; renderer treats an inaccessible attachment as "no media". |
| **Cloning pipeline = untrusted input** | It ingests third-party drafts and writes straight into attributes. **Sanitise on READ, not only on save** — never assume a value came from the inspector. |
| **CSS injection** | Every atom's `css()` declares a validator with **reject-to-default**, because the Style Engine's vocabulary does not cover `object-fit`/`object-position`/`mix-blend-mode` and those stay hand-composed. Each validator ships a **negative control** proving an out-of-vocabulary value is rejected rather than passed through. ⚠ `media/render.php:303` already guards `objectPosition` with `preg_match('/^[a-zA-Z0-9%\s.,\-]+$/')`, which excludes `;{}` — the existing guard is sound; the rule generalises it. |
| **Sanitise on READ** | The cloning pipeline ingests third-party drafts and writes straight into attributes, so a value must never be assumed to have come from the inspector. Validation happens on read, not only on save. |
| **SVG upload policy** | Inline only after allowlist sanitisation; `path-draw`/`animation-source` gated on `unfiltered_html`. |
✅ ONBOARDED — Abuse MUST-FIX 1/3/4 (2 refuted, principle retained), Platform M7, Competitor MF5.

---

## 8. Gates — ratcheted, not binary

⛔ **A binary `--check` on a 20-block backlog is red on day one for 18 blocks, and the only compliant
move becomes "make the rule advisory" — which is how 17 of `inspector-scan`'s rules ended up
advisory.**

| Gate | Mode | Fails when |
|---|---|---|
| `media-no-handroll` | **ratchet + `openBacklog`** | a block declares a media attribute or media CSS outside the registry |
| `media-attr-parity` | binary | server-registered schema ≠ JS keys |
| `media-css-parity` | binary | the JS and PHP value-setters disagree on a fixture attribute set |
| `media-control-coverage` | binary | a declared attribute has no control, or a control shows for a type it does not apply to |
| `media-svg-sanitised` | binary | an SVG mount path is not provably passed through the shared sanitiser |
| `media-disclosure-coverage` | binary | a gated control has no `hiddenReason` |

Each ships a **negative control proving it does not overmatch**, and a fixture proving it can fail.
Gate 1 must state its relationship to the four existing control gates (`check-dead-controls`,
`check-duplicate-controls`, `check-control-ux`, `check-inert-controls`) or it will duplicate one.

⛔ **`media-markup-parity` is DROPPED as specified in v1** — it compared rendered DOM, which needs a
live canary, and the repo's existing live-canary gate WARNS-and-PASSES when unreachable. Replaced by
`media-css-parity`, a static fixture comparison.
✅ ONBOARDED — Ship-PM M7, Cynic MF-6 / SF-1 / SF-2, Spec-Lawyer MUST-FIX 2/3.

### The escape hatch — specified, because an abstraction without one gets nine undocumented ones

A surface that genuinely cannot be expressed declares `mediaUnsupported: [ 'reason' ]` in an
allowlist file the gate reads. **An entry is a backlog item with an owner and a removal criterion**,
not a permanent exemption.
✅ ONBOARDED — Cynic MISSING M-A.

### The debug trail — because an agent, not a human, will diagnose this

Every emitted element carries `data-sgs-media-src="<descriptor-key>@<prefix>"` so "which descriptor
produced this rule?" is answerable from the page. Without it the diagnosis chain is descriptor →
injection filter → PHP schema → renderer → stylesheet → custom property, with no provenance.
✅ ONBOARDED — Cynic MISSING M-B.

---

## 9. Migration, rollback and in-flight content

1. **Census first** — one JSON artefact in `reports/migrations/`, **before any edit**.
   THE-MIGRATION-METHOD requires the detector as the first deliverable past 3 files.
   ✅ `reports/migrations/media-element-census.json`, in two halves:

   - **Source side** (`9b67c3885`) — 128 media attributes across 6 surfaces, 3 excluded with
     reasons, **10 storage shapes**, a `STORED_AS` of four. Covers the source, type, meaning and
     behaviour families, which is what atoms 1-6 need.
   - **Presentation side** (`presentation` key) — **37 distinct names / 54 surface-attribute pairs**
     (hero 25 · container 13 · media 9 · before-after 4 · decorative-image 2 · product-card 1),
     which is what atoms 7-10 need. Generated by
     `plugins/sgs-blocks/scripts/surveys/census-media-presentation.py --write`, with 3 recorded
     traps, 5 measured disagreements, and a `gaps` matrix.

   ⛔ **Read it as a GAP ANALYSIS, not a wiring manifest.** What a surface stores today is what it
   happened to be built with, not what it should have (§1). The `gaps` matrix is the operative
   output: per atom, which surfaces can carry it and which are missing it. **The work is the gaps.**

   ⛔ The roster is **ENUMERATED** per surface per atom, never pattern-matched. A regex sweep is
   wrong in both directions: it over-matches `boxShadow`/`opacity`/`alignment` (v2 atoms) and misses
   `splitMediaHeight`, `splitMediaWidth`, `imageHeight` and `decorative-image`'s `width`. Enumeration
   is the only form that can be checked, and `--self-test` plants a bogus roster name to prove
   staleness is detected.

   ⛔ §5's atom list is a wish-list of concepts, not a census. Do not read it as one.

2. **No renames in v1** (§2 `storedAs`), so no content migration is required to adopt the standard.
3. **`product-card.image`** (bare URL string, no attachment ID, no tiers) ships **separately, after
   the abstraction is proven**, and keeps the old attribute alongside the new for one deploy cycle
   with the renderer falling back to it. WP-CLI batch with `--user=1` (KSES strips CSS otherwise),
   dry-run against a DB snapshot reporting a diff count before `--execute`, and a
   `_sgs_media_legacy_backup` postmeta so the original is recoverable.
4. **Codemod**: isolated worktree, **one surface per commit**, path-scoped, re-runnable idempotently.
   ⛔ Five tracks share `main`.
5. **In-flight content**: because v1 renames nothing, a post saved between deploys round-trips
   unchanged. This is the main reason `storedAs` is non-negotiable.
✅ ONBOARDED — Spec-Lawyer MUST-FIX 8/9, Support MUST-FIX 3, Competitor MF6, Cynic SF-3/SF-6, Ship-PM M6.

---

## 10. Build order — two surfaces on day one

⛔ **v1 put the first consumer at step 6 of 8. Stop halfway and the tree has a registry, a codegen
step and gates that nothing calls — strictly worse than today's two-adopter helper.**

| # | Step | Safe to stop after? |
|---|---|---|
| 1 | Census artefact | yes — pure information |
| 2 | L1 helper pair + attribute injection filter | yes — additive, nothing consumes it |
| 3 | The six v1 atoms + L2 panel registry + L3 dispatch | yes |
| 4 | ⭐ **Wire `sgs/media` AND `before-after` together** | **yes — and this is the payoff point** |
| 5 | Bean's eye on both, live (R-31-13) | — |
| 6 | Gates, scoped to the two wired surfaces | yes |
| 7 | Remaining surfaces via codemod, one commit each | yes, per surface |
| 8 | `product-card` content migration | separate |

⛔ **The second surface is `before-after`, NOT hero.** Hero already shares `sgs_tier_media_render()`
with timeline, so it would pass and prove nothing. `before-after` has two independent instances,
video sync, and its own scoped-selector machinery — **it is the falsifying case.**

**The falsification test:** wiring the second surface must require **no edit to the shared layer**.
The surface's own files — `block.json`, `edit.js`, `render.php`, `media-render.php` — change by
definition, so the test measures the shared layer alone:

> **PASS** = `git diff --name-only` after wiring `before-after` touches **no** path under
> `src/components/media/`, `src/components/MediaElementControls.js`,
> `src/components/MediaElementPanel.js`, `includes/helpers-media-element.php`,
> `includes/class-sgs-media-element.php`, `includes/media/atoms/`, `assets/css/media-atoms/`,
> `src/blocks/extensions/media-elements.js`, or `includes/media-element-attrs-register.php`.
>
> The five files under `src/blocks/before-after/` are **expected** to change.

⚠ A FAILED falsification test is a real result, not a setback to hide: record what the shared layer
was missing and why, then decide. That record is worth more than a pass obtained by quietly
patching the layer to suit the second surface — which is exactly why the two surfaces are wired
serially and never in parallel (§15).

⛔ **The path is load-bearing, not cosmetic.** `check-control-helper-parity.py` discovers helper
families from disk by convention — a `*AttrName`/`*AttrKeys` export in **`src/components/`** plus a
PHP twin whose slug matches. A layer under `src/media/controls/` sits outside that scan, so Media
would silently never register as the fourth family.

⚠ `before-after` is currently BEST-IN-CLASS on two axes measured by the census — one parameterised
picker driving both slots with zero drift, and the narrowest per-type gating of any surface. **A
unification that downgrades it has failed.** Absorb those patterns; do not flatten them.
✅ ONBOARDED — Ship-PM M2, Competitor SHOULD-FIX 1, Spec-Lawyer MUST-FIX 4, Cynic MISSING M-C.

### Acceptance — the gates are all static, so they cannot close this

⛔ Every gate is build-time. None proves a page renders correctly. **Closing requires:** the six
original defects from Bean's report re-run live in the editor and on the front end, plus Spec 20
computed-parity across the wired surfaces, plus **Bean's visual sign-off (R-31-13)**. Numbers alone
do not close; the eye alone does not close.
✅ ONBOARDED — Spec-Lawyer MISSING, Support MUST-FIX 5, Competitor MISSING 5, Cynic MISSING M-G.

---

## 11. Effort — smallest plausible

**Revised 2026-08-30 against measured actuals from waves 1-2.**

| Step | Estimate | Actual |
|---|---|---|
| Census | 2h | ✅ shipped, with the two security items and 7 new gates, in one session |
| L1 helpers + injection filter | 4h | ✅ shipped same session (`cce7427bd`, `ea5f7ed09`) |
| Census — presentation half | +45m | write-up of measurements already taken |
| Architecture doc realignment | +1h | this rewrite |
| **10** atoms + shared helpers + selective injection | 6h → **~5.5h** | 4 parallel branches; 6 of ~8 controls already exist |
| Panel registry + dispatch | — | ✅ built in Wave 5a as `MediaElementPanel.js` + `MediaPanelLayout.js` |
| Wire both surfaces + close the atom roster to 16 + fix 2 real regressions + 1 security gap found by review | 4h | ✅ shipped, merged (`13286fc69`) |
| Gates + negative controls | 6h | Wave 6, not started |
| Remaining surfaces (codemod) | 2-3 days, separately | Wave 7, not started |
| `product-card` content migration | separate, after proof | not started — the proof now exists |

⚠ Waves 1-2 came in materially faster than this table's originals. Treat the remaining figures as
upper bounds, not targets.

---

## 11b. Method — diff against a surface where it already works (Bean-locked 2026-08-31)

⛔ **When a control "does not mesh", do not design a fix from first principles.** Ask which blocks
already have the attribute, then read the working one and compare:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql   "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes
     WHERE css_property='object-fit'"
```

Measured: every "the atoms don't mesh" problem in Waves 3-5 resolved this way in minutes. The same
query also surfaced `sgs/brand-strip` (`logoFit`) and `sgs/trust-bar` (`badgeImageObjectFit`) —
two blocks a hand-written survey of "media surfaces" had missed outright, which is a standing
correction to the census's population.

⚠ **BUT THE DB QUERY IS NOT ITSELF A COMPLETE CENSUS — measured 2026-08-31.** The query above
returns eight rows and **`sgs/before-after` is not among them**, yet that block demonstrably emits
`--sgs-object-fit` (`before-after/render.php:256-277`) and consumes it (`style.css:63-64,346`). Its
fit arrives through `supports.sgs.imageControls`, not a declared attribute, so `block_attributes`
cannot see it.

**Scope of this limitation, stated precisely.** It bites on ONE thing: using the DB to answer
*"which blocks already carry this capability?"* — the population question E19's method opens with.
An extension-provided capability is invisible there, so the DB under-counts the population.

⛔ **It has NO bearing on §10's falsification test.** That test is a `git diff --name-only` over
source files — a coding-implementation question the DB plays no part in. Do not connect the two.

The census's `gaps` matrix DOES catch the extension case, recording `before-after` and
`product-card` under `carries_via_extension`. **So, for the POPULATION question only: DB query
first, census as the backstop. Neither alone is complete.**

⛔ **Never weigh "this changes what the canary currently renders."** The framework is
PRE-PRODUCTION; there is no content to protect and a default changing costs nothing. Whether a
default is RIGHT is a separate question, decided on what the other surfaces measure.

---

## 12. Dropped from v1, with reasons

| Dropped | Why |
|---|---|
| **Codegen** | The injection filter covers declaration; the existing generator covers server registration. No second source of truth (Cynic MF-2). |
| **Interactivity API rewrite** | Orthogonal to a controls goal; rewrites working runtimes; already in ~13 blocks so the "learning cost" risk was backwards; and `data-wp-bind--` sets attributes while video `currentTime` is a property, so sync still needs imperative code. |
| **`<picture>` swap** | Breaks the pipeline's recognition contract (R-31-2); discards core's image pipeline; and the `display:none` download justification was overstated — a lazy hidden image generally is not fetched. |
| **`media-markup-parity` as specified** | Needed a live canary; the repo's live-canary gate passes when unreachable. |
| **~20 of the 30 atoms** | v1 ships **ten** (§5); the rest follow once the mechanism is proven. |
| **A golden-controls recipe per media control** | Considered and rejected 2026-08-30. `golden-controls.json` encodes 14 control types but exactly ONE (`colour`) has a rule that reads it, so the row would enforce nothing. A shared component enforces by construction. One `canonical.component` pointer line is still added per helper as a hook for Wave 6's `media-no-handroll` rule — **inert until that rule exists.** |

---

## 13. The five "open" items — resolved, after Bean challenged them (2026-08-30)

Bean: *"Why are those 5 left open? We can exclude responsive logo if that helps speed things up."*
Three were open out of caution rather than necessity. Resolved:

| Item | Verdict |
|---|---|
| **`responsive-logo`** | ⛔ **EXCLUDED from scope — Bean's call, taken.** It is already good: native `<picture><source media>`, zero JS, every attribute controlled, genuinely per-tier with inherit-up. Forcing it onto the shared shape would be a DOWNGRADE, and it is the only surface using that mechanism — excluding it removes a whole mechanism variant from v1. Revisit only if it develops a defect. |
| **Editor-canvas iframe breakpoints** | ✅ **NOT open — it is a v1 constraint, and L4 already answers it.** The canvas is an iframe whose width ≠ viewport, so media queries resolve against the iframe. That is exactly what the device-preview switcher WANTS. Because L4 puts the rules in a stylesheet both sides load and passes only custom-property VALUES, the canvas resolves the correct tier by construction. **The thing to avoid is a JS-computed preview tier** — which is precisely what `container/edit.js:351` does today and what L4 removes. Leaving this "open" was my error. |
| **AVIF / WebP** | ✅ **Partly free, and the rest is not blocked on us.** Using `wp_get_attachment_image()` (§4, generate-then-amend) inherits whatever modern-format handling core and the site's image pipeline provide, at the attachment level. Full `<picture type="image/avif">` negotiation needs the `<picture>` element, which v1 drops — so it travels with that decision, not separately. No action in v1; no gap either. |
| **Container queries** | ✅ **Genuinely additive later, and nothing needs it today.** A media element inside a 3-column grid would want container-relative art direction, and no `media`-attribute mechanism can express it. But adding it later is a NEW `mechanism` value, not a change to the four layers — the axis exists precisely so a new mechanism can be added without touching controls, panels or dispatch. Recorded as a known ceiling so it is not re-discovered as a surprise. |
| **`object-view-box`** | ✅ **Deferred on BROWSER SUPPORT, not on architecture.** It would art-direct one file instead of shipping three — attractive for the common "same image, tighter mobile crop" case. ⚠ Support is uneven and must be **verified at build time, not asserted** before anything depends on it. Like container queries, it lands later as a `mechanism` value. |

**Net effect: zero items remain open that could block or reshape v1.** One is excluded, one was never
open, three are additive extensions the `mechanism` axis exists to absorb.

---

## 14. Bean's frontloading model — right, with one ordering correction

Bean: *"once the first 2 surfaces have been wired up, then the rest are super easy — we can just use
a script to gut the current functionality we're going to replace and then use a script to insert our
set of helpers."*

**That is exactly THE-MIGRATION-METHOD's shape, and it is why the second surface choice matters.**

### Why the first two surfaces make the rest mechanical

`sgs/media` and `before-after` between them exercise **every hard case in the population**:

| Case | Covered by |
|---|---|
| root insertion, no prefix | `sgs/media` |
| element insertion, prefixed | `before-after` (`before`/`after`) |
| **two independent instances on one block** | `before-after` |
| all three media types | both |
| per-tier image sources | both |
| video behaviour + two-`<video>` sync | `before-after` |
| existing stored attribute names (`storedAs`) | both |

Once those are wired, the remaining surfaces are **combinations of cases already solved**, which is
what makes the codemod mechanical rather than exploratory. That is the whole argument for choosing
`before-after` over hero as surface two — hero would have passed easily and taught nothing.

### ⛔ The one correction: INSERT before GUT, per surface

The instinct to script both halves is right. The **order** matters, and gut-then-insert is the risky
version — it leaves a window where a surface has neither implementation, and if the insert step
fails on surface 4 of 7 the tree is half-migrated with live blocks rendering nothing.

**Per surface, in one commit:**

1. **INSERT** — add the opt-in to `block.json`, mount `MediaElementControls`, call
   `SGS_Media_Element::render()`.
2. **VERIFY** — the surface renders correctly with the new path.
3. **GUT** — delete the old attributes, panels and render code.

Both halves are still scripted; they are just sequenced so no surface is ever without a working
implementation. **A surface either has the old code or the new code, never neither.** This also makes
the rollback trivial — revert one commit, one surface.

### What the script genuinely cannot decide

Honest limits, so nobody discovers them mid-batch:

- **`prefix` / `context` / `insertion` per surface** — a judgement call, but only three values and
  one line per surface. Decide all of them in the census (step 1), before any edit.
- **`storedAs` mapping** where a surface's existing attribute names differ — mapped once per surface,
  from the census.
- **Genuinely unique behaviour** — `decorative-image`'s naked mode. Hand it back rather than
  improvise; that is what the escape hatch is for.

Everything else is mechanical.

---

## 15. Execution — the dependency chain, and what actually parallelises

Bean asked whether this can be built via `/dispatching-parallel-agents` + `/delegate`. **Yes, but
only the leaves fan out.** The foundation is a dependency chain and parallelising it would multiply a
wrong decision rather than divide the work.

| Wave | Work | Parallel? | Model | Why |
|---|---|---|---|---|
| **1** | **Census artefact** — per-surface `prefix` / `context` / `insertion` / `storedAs` | ❌ **inline** | strategic | `/delegate` REFUSES `synthesis` shapes — they stay in the main thread |
| **2** | **L1 helper pair + attribute injection filter** | ❌ **inline, serial** | strategic | the contract every later wave inherits |
| **3** | **The six v1 atoms** | ✅ **4 branches** | Sonnet | disjoint files, contract already fixed by wave 2 |
| **4** | Panel registry + dispatch layer | ❌ serial | Sonnet | composes the atoms |
| **5** | Wire `sgs/media`, **then** `before-after` | ❌ **deliberately serial** | Sonnet | see below |
| **6** | Six gates + negative controls | ✅ **4 branches** | Sonnet | disjoint |
| **7** | Remaining surfaces — insert → verify → gut, one commit each | ✅ one per surface | Sonnet | cases already solved in wave 5 |

`/delegate` routes mechanical branches to **Sonnet, fallback Haiku, capped at 4 parallel**.

### ⛔ Waves 1-2 stay inline — this is a routing rule, not a preference

`/delegate` carries a **strategic-work refusal**: `synthesis`, `spec_rewrite`, `gap_analysis` and
`research_decision` shapes are refused by the router and stay in the main thread. Wave 1 is a
synthesis of five survey reports plus Bean's rulings; wave 2 is the decision every later wave
inherits. **Dispatching either means four parallel agents building four wrong atoms in parallel.**

### ⛔ The two surfaces MUST be wired sequentially — parallelising destroys the design's only test

The falsification test is: *wiring the second surface must require no edit outside
`src/media/controls/`.* If `sgs/media` and `before-after` are built concurrently, **both agents can
quietly patch the shared layer to suit themselves**, and the signal is gone.

- `sgs/media` first → proves the layer works.
- `before-after` second → tests whether it works for something it was **not shaped around**.

Run them together and you get two wired surfaces and **no evidence**.

### Why waves 3-7 are genuinely mechanical (Bean's frontloading model, validated)

Bean: *"once the first 2 surfaces have been wired up, then the rest are super easy."* Correct — and
§14 records why: `sgs/media` + `before-after` between them exercise root insertion, element
insertion, two independent instances on one block, all three media types, per-tier sources, video
sync and `storedAs`. **Every later surface is a combination of cases already solved**, which is what
makes a codemod mechanical rather than exploratory.

⛔ **Per surface the order is INSERT → VERIFY → GUT in one commit**, never gut-then-insert. A surface
always has either the old code or the new code, never neither, and rollback is one revert.

---

## 16. Status of every open question

| Was open | Now |
|---|---|
| `responsive-logo` | ⛔ **EXCLUDED** — Bean's call. Already good (native `<picture>`, zero JS, per-tier); forcing it onto the shared shape is a downgrade, and excluding it removes a mechanism variant from v1 |
| Editor-canvas iframe breakpoints | ✅ **Not open** — a v1 constraint that L4 answers by construction. My error to list it |
| AVIF / WebP | ✅ Partly free via `wp_get_attachment_image()`; full negotiation travels with the dropped `<picture>` decision |
| Container queries | ✅ Additive later as a new `mechanism` value — the axis exists for this |
| `object-view-box` | ✅ Deferred on **browser support**, to be VERIFIED at build time, never asserted |
| Codegen | ✅ Redundant for UI and CSS; the attribute gap is closed by runtime injection plus media's own narrow generator (§0) |
| Bound / dynamic media | ✅ `source: 'static' \| 'binding'` — §5b, designed now, built later. Carried as a descriptor field so a bound source never becomes a per-block fork |

**Nothing remains open that could block or reshape v1.**

---

## 17. Where this stands, and what is next

### Built and deployed (waves 1-2)

Census (`9b67c3885`), the L1 naming pair and declarative injection (`cce7427bd`, `ea5f7ed09`), the
SVG allowlist unification and editor sanitiser, `<track>` captions. Live-verified on the canary —
`reports/visual-diff/svg-sanitiser-captions-2026-08-30.md`, probe page **3143**.

### Built, gated, NOT deployed (waves 3-4)

`96a696130`..`9859be65c`. 82/82 build gates in the fast tier, **nine** media gates in `gates.json`.

| Piece | State |
|---|---|
| Atom registry — ten atoms, data only | `src/components/media/atoms/registry.js` |
| Presentation census + `gaps` matrix | `reports/migrations/media-element-census.json` |
| Selective injection, both sides | 109 keys → 49 for two atoms |
| L4 stylesheet, generated from partials | `assets/css/media-atoms/*.css` → `media-element.css` |
| The ten atoms | logic + control + PHP twin + CSS partial each |
| Per-element scoping | `sgs_media_element_scope_class()` / `_style()` |
| **L2/L3 panel registry + dispatch** | ⛔ **NOT BUILT — Wave 5a deliverable, see below** |

⛔ **WAVE 4 IS NOT BUILT.** §11 and §15 specify it as *"panel registry + dispatch"*. The atoms
exist; the layer that composes them does not. Measured 2026-08-31:

- `src/components/MediaElementControls.js` contains **zero JSX and zero React imports**. Its only
  exports are `mediaAttrName`, `MEDIA_BASES`, `MEDIA_TIERED_BASES`, `MEDIA_TIERS`,
  `MEDIA_ATTR_TYPES`, `mediaAttrType`, `STORED_AS`, `mediaAttrKeys`, `mediaStoredAttrName`
  (`grep -n "^export"`). It is a **naming module**, not the component §2 L3 describes.
- `grep -rn "SGS_Media_Element" includes/ src/ scripts/` returns **no matches**. The PHP renderer
  class in §2 L3 does not exist.
- Every atom's `.control.js` returns **bare rows** and mounts no `InspectorControls`, deferring
  assembly to a caller nobody wrote.

**No gate can catch this.** Nothing consumes atom `control()` output, so nothing notices the
assembler is missing. Same shape as D910's three instruments: *the artefact that would have failed
was never able to run.*

⚠ **The component takes a new name.** `MediaElementControls` belongs to the naming module, so the
component lands as `src/components/MediaElementPanel.js` with `includes/class-sgs-media-element.php`
as its PHP twin. **L3 is Wave 5a's first build deliverable.**

⛔ **Nothing here paints yet.** Wave 3 closes on parity, validators and purity. **Wave 5 closes on
paint** — atoms are wired to no surface until then, so no DOM check is possible and none is claimed.

### Wave 5 — DONE, merged to main (2026-09-01)

**`sgs/media` first, `before-after` second, exactly as §10/§15 specified — the falsification test
passed.** `git diff --name-only` while wiring `before-after`'s object-fit/focal-point touched only
the 5 files under `src/blocks/before-after/`, zero shared-layer paths. The shared layer genuinely
did not need to change for the second surface.

**What shipped, beyond the original Wave 5 scope:**

- `sgs/media` is now driven entirely by the atom system — all 16 atoms (§5), not the original 10.
  §18's panel design (type tabs, "Image Styling" sub-panel, bottom-mounted overlay) was built as
  `src/components/media/MediaPanelLayout.js`, the first concrete `MediaElementPanel` layout
  component (Wave 7's remaining surfaces can reuse it or build their own from the same pattern).
- `before-after` had a real, pre-existing bug surfaced during this work: its before/after photos
  shared ONE `sgsObjectFit`/`sgsObjectPosition` pair, so they could never be cropped
  independently — exactly the scoping defect §2 L4's "scope per element, not per block" section
  warned this exact block would hit. Fixed as its own step, with a read-time fallback so any
  pre-existing `post_content` with the old shared value still renders correctly on both slots.
- The box-wrapper decision (`SGS_Media_Element::requires_box()`) originally decided whether a
  block needed its media wrapped in a `<figure>` by checking whether an atom was merely
  *declared* — not whether it actually produced anything to paint. Fixed to be value-aware: a
  plain image with no overlay set now correctly renders as a bare `<img>` again.
- The editor canvas never reflected atom changes live (the canvas element never carried the
  marker class the shared stylesheet keys on) — fixed with a new reusable JS module
  (`src/components/media/canvasStyle.js`) mirroring the PHP render logic, so Wave 7 surfaces
  inherit working live preview by construction rather than re-discovering this gap per block.
- **An independent code review (8-angle pass) caught two genuine regressions before merge, plus a
  security gap, plus six smaller correctness issues — all fixed and re-verified live before
  merging:** external video (YouTube/Vimeo/direct URL) had become unreachable in the editor (the
  new picker only offered the WP media library); before-after's legacy crop attributes were
  silently dropped with no migration path; border-radius/width values weren't routed through this
  project's own established CSS-injection sanitiser; plus a caption that kept painting on the
  frontend after switching media type to SVG, a validation bypass on the padding control, a
  tablet/mobile autoplay lock that LOOKED locked but didn't actually block the click (the same
  `ToggleGroupControl` `disabled`-prop trap this project already has one memory entry for — now
  two), an opacity JS/PHP parity gap, a shared method's signature widened with no safety net for
  old-style callers, and a hand-edited generated file (turned out already correct, verified
  against a real regeneration).
- **Merged:** PR #36, squash-merged to `main` as `13286fc69`, 2026-09-01.

### Wave 6 — DONE, verified, NOT yet committed (2026-09-02)

Built via `/dispatching-parallel-agents` (3 in parallel: gates 3/4/5), each reviewed and re-verified
independently in the main tree (not trusted from subagent-reported output) before integration. Full
build order + review process: `.claude/plans/media-element-tingly-stallman.md`.

| Gate | What shipped | vs the original brief |
|---|---|---|
| 1 — `media-attr-parity` | New rule `38-media-attr-parity.js`. Flags an unknown atom id in `mediaElements`, or a block's own declared attribute silently shadowing an atom-injected one at the WRONG TYPE (D328 silent-coercion class) | As planned |
| 2 — `media-css-parity` | **No new file.** `scripts/tests/test-media-atom-parity.mjs` already covers it — confirmed by full read, its fixture already exercises non-default values for all 16 atoms | Brief asked for a new rule module; this one didn't need one |
| 3 — `media-control-coverage` | New rule `39-media-control-coverage.js`. Both parts (declared-without-control, type-coverage-gap) initially false-positived on BOTH reference blocks — root cause: `MediaElementPanel` is a runtime dispatcher no static resolver can see through. Fixed by exempting any block that mounts `<MediaElementPanel` (with a barrel-import follower, verified against `sgs/media`'s real indirection) | As planned, but needed real investigation before the detection logic could be written at all |
| 4 — `media-svg-sanitised` | New rule `40-media-svg-sanitised.js`. Attribute-name heuristic had to be widened mid-build — `sgs/hero`'s `splitSvg*` carries raw markup with no "Content" substring, so the naive "Svg + Content" heuristic missed it | As planned |
| 5 — `media-disclosure-coverage` | **Standalone script** `scripts/check-media-disclosure-coverage.js` (registered in `gates.json`, not `rules.json`) — `MediaElementPanel` never calls `disclosure()` itself, so there is no per-block artefact for a per-block rule to inspect; this is atom-level, matching `check-media-atom-purity.js`'s own shape. Discovered two disclosure return shapes the brief didn't anticipate: `box-shape`'s alt `heightState`/`ratioState` fields (a `visible`/`hidden` vocabulary, not `state`/`hiddenReason`), and `video-behaviour`'s inverted `requires` shape (key = driver, values = governed bases, the reverse of every other atom) | Brief asked for a rule module; this one is structurally a different shape and was placed accordingly |

Two real bugs in the NEW gates themselves, found during independent re-verification, both fixed before
integration: rule 38's `phpResolve()` embedded its request JSON inline in a `php -r` argument, which hit
Windows' command-line length limit the moment a real multi-entry adopter (`sgs/hero`, three
`mediaElements` entries) was scanned — `spawnSync php ENAMETOOLONG` — fixed by routing the payload
through a temp file. Rule 38 also false-positived on `sgs/media`'s own legacy `thumbnail` fields until
the exemption mechanism (registry.js's `reads` map) was taught to the rule — the SAME class of
divergence `reads` already documents for other blocks, just never yet flagged because no per-block gate
had existed to notice it.

### Wave 7 — DONE, verified, NOT yet committed (2026-09-02)

All four remaining surfaces plus `product-card`'s data migration. Order actually used —
**decorative-image → hero → container's `BackgroundPanel` → product-card (styling) → product-card
(data)** — reordered from the brief's `hero, container, decorative-image, product-card` after checking
with Bean: safest-first, so `container` (shared by 8 blocks, this work's highest blast radius) got the
most rehearsal before it was touched, per this project's design-gate rule (Bean's explicit sign-off
obtained before any `container` code was written).

**decorative-image** — clean adoption of `object-fit`/`focal-point`/`overlay` (unprefixed, one media
slot). `box-shape` deliberately NOT adopted — border-radius/sizing is a genuinely NEW capability this
block never had, out of scope for a preserve-behaviour migration. One real bug caught in review: the
editor canvas applied object-fit/focal-point custom properties to the video preview, but the frontend
(`sgs_render_media()`, a shared helper with no marker-class parameter) could never apply them to
`<video>` — an editor/frontend visual divergence, fixed by excluding those two atoms from the video
preview's style object to match the frontend's real capability.

**hero** — the largest, highest-judgement single surface. Adopted `media-type`+`source` (closing the
`splitImage?.url`-gated type-picker bug described in §18.7, as predicted, by construction), `object-fit`
+`focal-point`, `overlay` (deleted the hand-rolled `$media_overlay_html` span entirely, routed through
the shared atom — opacity/blend-mode/hover now exist for the first time), and `motion`'s EDITOR control
only (the CSS-emission path stayed hero-private — a judgement call, not forced: hero's existing
ken-burns/parallax CSS has a clip/specificity interaction with its hover-zoom rule too risky to
reproduce without a live canary check). Needed THREE prefixes on one physical element (`split`,
`splitMedia`, `media`) because hero's own legacy naming already used three different conventions and
none may be renamed (D338).

⛔ **A genuine, Bean-adjudicated conflict surfaced mid-build.** The original plan called for a
read-time-only legacy fallback (new attribute wins, falls back to the old shape when unset — the exact
pattern already shipped for `sgs/media`'s `thumbnail` and `sgs/before-after`'s `sgsObjectFit`). But
hero's own `render.php` already carried a 2026-08-13 comment recording that Bean had explicitly BANNED
this shape on this exact block once before (R-31-14: "no legacy elements as fallbacks; the framework is
pre-production, so there is nothing to migrate"), after an earlier, differently-motivated attempt at the
same pattern (a bidirectional `splitMedia` unified-slot sync bridge) was deleted for contradicting it.
Asked Bean directly rather than resolve it inline; the strict reading won — no fallback, at all, for
this migration either. Consequence, worked through fully rather than left half-done: the legacy
`splitImage`/`splitVideo`/`splitSvg`(+Tablet/Mobile) attributes became genuinely dead code and were
DELETED from block.json (not merely retired) — except `splitImage`/`splitImageMobile` specifically,
which stayed declared (unread by the editor, but load-bearing for the CLONING PIPELINE's scalar-media
role assignment, `scripts/data/scalar-media-roles.json`, tied to a real 2026-08-02 incident). That in
turn meant a future `/sgs-clone` run against a new hero draft would populate the now-dead composite
shape and silently render nothing — a real gap in a genuinely different, active subsystem. Asked Bean
again; chosen to fix properly rather than park it: `scripts/converter/services/assembly.py`'s
`ScalarLift` handling now consults a new, small, explicit `emit_as` field on the scalar-media-roles
roster (`db_lookup.scalar_media_emit_as()`) and expands the composite `{id,url,alt}` lift into the
atom system's own `splitImageId`/`Url`/`Alt`(+Mobile) triple at write time — the LIFT logic itself
(`run_mechanism_b` branch A, `scalar_media_from_img()`) is completely unchanged, only the final write
shape adapts. Verified against the full 727-test converter suite, unrelated pre-existing tests
untouched, all passing.

**CORRECTED (2026-09-02, D919 — Wave 7b, one day after this Wave 6 account).** The "kept declared...
load-bearing for the CLONING PIPELINE's scalar-media role assignment" framing above is now stale as
current state (it remains accurate as history of what Wave 6 did and why). The `emit_as` triple-write
onto `splitImageId`/`Url`/`Alt`(+Mobile) fixed the CONTENT shape but left a real bug: the type-selector
attribute (`splitMediaType`) was never written alongside it, so a video/SVG split-media source would
have stored its content correctly but rendered nothing (schema default `"image"`, strict resolver, no
image URL → empty). Caught and fixed the next day: the `scalar-media` role anchor moved off
`splitImage`/`splitImageMobile` onto `splitMediaType` (the real, rendered type-selector), routing was
extended from image-only/2-tier to all 3 device tiers and all 3 media types, and — the anchor no longer
needing them — `splitImage`/`splitImageMobile` were DELETED from `hero/block.json` in the same commit
(`dcd9940d2`). Live-reverified 2026-09-02: `SELECT block_slug, attr_name, role FROM block_attributes
WHERE role='scalar-media'` now returns exactly one row, `('sgs/hero', 'splitMediaType', 'scalar-media')`.
Full account: `.claude/decisions.md` D919.

**`container`'s `BackgroundPanel`** — the highest-blast-radius piece, confirmed live via
`grep -rl "BackgroundPanel" src/blocks/*/edit.js` at **8 real consumers** (container, cta-section,
hero, multi-button, physics-canvas, site-footer, site-header, trust-bar — one more than the plan's
estimated 7; `nav-drawer` correctly excluded, it only mirrors the control options in comments). Closed
the Video-tab gap by routing `object-fit`+`focal-point` (backdrop scope) into the SAME
`backgroundSize`/`backgroundPosition` attributes the Image tab already writes (`prefix="background"`
derives the exact existing names with zero `reads` bridging needed — confirmed, not assumed). Diverged
from the brief in two deliberate, evidenced ways: did NOT declare `supports.sgs.mediaElements` on any
of the 8 blocks (would have auto-injected 6 dead `backgroundObjectFit*`/`backgroundObjectPosition*`
attributes per block — the injection filter operates at base-granularity, not scope-granularity, with
no way to declare "backdrop-scope bases only"); did NOT call `SGS_Media_Element::style()` server-side
(that emitter unconditionally also computes `Repeat`/`Attachment`, which happen to alias onto
`backgroundRepeat`/`backgroundAttachment` under this prefix — using it would have silently pulled two
explicitly-out-of-scope bases into the emitter). Hand-extended the wrapper's existing `$bg_size`/
`$bg_position` → CSS pattern instead, for 7 of the 8 blocks via `class-sgs-container-wrapper.php`; hero
gets its own copy in `hero/render.php` because it hand-rolls its own `<video>` markup rather than
delegating to the wrapper (a pre-existing composite-mirror divergence, unrelated to this work). Image
tab's four existing controls untouched byte-for-byte — confirmed via `git diff` showing zero deletions
across all 8 blocks, pure insertion only. One real bug caught in review before integration: the
worktree this was built in predated the hero fix above, so its hero-specific object-position sanitiser
called a closure (`$sgs_css_object_position`) that no longer exists in the current tree — would have
fataled the moment a hero instance with a background video rendered. Fixed to call the current
replacement (`sgs_media_atom_focal_point_validate()`, the same validator hero's split-media object-
position already uses) before integrating.

**`product-card`** (styling) — single unprefixed entry (`object-fit`, `focal-point`), mirroring the
block's existing "one value applied uniformly across every image role" contract rather than introducing
before-after's per-role-prefix independence (a scope expansion nobody asked for, flagged as a possible
future ask). One real bug caught and removed before integration: the first draft declared `box-shape`
in `mediaElements.atoms` "for the schema" while never mounting its control — since `imageHeight`
already exists as the block's own attribute (existing-wins), that declaration's only real effect would
have been injecting a dozen brand-new, uncontrolled, unconsumed attributes (`imageShape`,
`imageBorderRadius`, `imageMaxWidth`, …) into the schema for zero client benefit — removed, matching
`decorative-image`'s precedent for a deliberately-deferred capability.

**`product-card`** (data migration) — `imageId` (real attachment ID) added alongside the pre-existing
bare-URL `image` attribute, which stays a PERMANENT fallback, not a transition window. All 5 write
sites in `edit.js` updated (4 pickers + the "Remove image" reset, the latter not explicitly named in
the brief but a real correctness gap left otherwise — a cleared image with a stale `imageId` would
resolve to the wrong attachment). Batch backfill script
(`scripts/migrate-product-card-image-id.py`) follows this repo's `--survey`/`--fix`/`--fix --apply`/
`--check`/`--self-test` convention, resolves via a real `wp eval-file` SSH round-trip against the
sandybrown canary (URLs travel as JSON over stdin, never shell-interpolated), with an explicit
UNREACHABLE status distinct from NO-MATCH so a down connection can never be read as "nothing to
migrate." A newly-added attribute needed the framework DB's own role classifier + element-manifest
role-map regenerated twice (`/sgs-update`, then `generate-attr-role-map.py` again — the first run's
snapshot raced ahead of the DB write) before the build's own `check-element-manifest-conformance`
gate went green; `imageId` now classifies `BY-DESIGN`, matching every other `*ImageId` attribute
across the whole atom system (`sgs/media`, `sgs/before-after`, `sgs/decorative-image`, `sgs/hero` all
carry the identical classifier fallback role, `enum-class-probe` — confirmed a systemic, pre-existing
gap, not something this migration introduced).

**Whole-body final state (independently re-verified in the main tree, not subagent-reported):** full
`npm run build` 83/83 gates green; `inspector-scan --check` exit 0, full self-test suite green; media
atom JS/PHP parity green across all 16 atoms; atom-purity 16/16 import-clean; disclosure-coverage
green; cloning-pipeline `check_value_identity.py --check` clean (4/4 assertions hold); full converter
test suite green (727 passed, 1 skipped, 11 xfailed, unrelated). **Nothing committed** — the working
tree holds the finished, verified state.

### Still to do

| Wave | Work |
|---|---|
| — | **Commit the working tree.** Waves 6-7 are built and verified but not yet in git history. |
| — | The `hero` motion CSS-emission path (ken-burns/parallax) stays hero-private, not atom-driven — a deliberate deferral pending a live-canary check of a clip/specificity interaction, not forced by the design |
| — | `container/BackgroundPanel`'s Image tab still hand-rolls its own Size/Position controls (untouched by design, to keep the diff minimal on a shared component) — a future pass could route both tabs through one shared control if the duplication becomes a maintenance cost |
| — | `product-card`'s `box-shape` adoption (border-radius/sizing for the image) remains deferred — the `.sgs-media-el` marker class's fallback values (`height:auto`) genuinely conflict with this block's own hardcoded fallback (`height:220px`) at equal CSS specificity, unverifiable without a live canary check |
| — | Run `scripts/migrate-product-card-image-id.py --survey` against real sandybrown content and review the no-match bucket before ever running `--fix --apply` against a client site |
| — | Not required, but flagged: `alignment` as a shared control (see §5's atom-roster note) — a smaller, separate framework-wide unification |

**Session record:** `.claude/plans/media-element-tingly-stallman.md` (the approved plan) — build order,
per-piece review notes, and the full verification trail for Waves 6-7 live there in more detail than
duplicated here.

### What changed in the plan while building it (Waves 1-5)

Recorded so a reader does not mistake the current shape for the original one.

| Changed | From → to |
|---|---|
| Atom count | six → **ten** (§5) — the original six left 36 of 103 census names uncovered and the `requires` rule unowned |
| How a control becomes standard | a `golden-controls.json` recipe → **being a shared helper** (§5); that file encodes 14 types and exactly one has a rule reading it |
| Atom module shape | one module → **two** (`<id>.js` pure, `<id>.control.js` JSX), because the parity gate cannot import JSX or a webpack external |
| Injection | total → **selective**, driven by the atoms an entry names |
| Census scope | source-side only → plus a **presentation half** and a `gaps` matrix (§9) |
| `object-fit`'s `custom` | treated as a fit value → **a sizing mode**, reassigned to `box-shape` (§5) |
| Scoping | implicit → **per ELEMENT**, `{uid}--{prefix}` (§2 L4) |
| `prefers-reduced-motion` | "absent in v1" → already implemented; **do not rebuild** (§5) |
| Falsification-test path | `src/media/controls/*` → `src/components/Media*` (§10) |

### What changed in the plan while building Waves 6-7

| Changed | From → to |
|---|---|
| Gate 2 (`media-css-parity`) | a new rule module → **an existing test file already covers it**; nothing built |
| Gate 5 (`media-disclosure-coverage`) | a new `inspector-scan` rule → **a standalone atom-level script** (`gates.json`), because there is no per-block artefact for a per-block rule to inspect |
| Wave 7 build order | `hero, container, decorative-image, product-card` → **`decorative-image, hero, container, product-card`**, safest-first, checked with Bean |
| Legacy-fallback pattern for hero's split-media | read-time-only fallback (the `sgs/media`/`before-after` precedent) → **no fallback at all**, Bean's explicit strict-R-31-14 call, after the plan's own assumption collided with a rule this exact block was already hardened against |
| `container`'s attribute-injection mechanism | `supports.sgs.mediaElements` declaration (as every other surface uses) → **hand-extension of the existing wrapper CSS**, because the standard injection path would have created dead attributes at this block's scope-granularity |
| `product-card`'s adopted atom set | `object-fit`, `focal-point`, `box-shape` (per the approved plan) → **`object-fit`, `focal-point` only** — `box-shape` removed after review found it would inject a dozen dead attributes with no mounted control |

---

### The three instruments that read green while proving nothing

Full detail in **D910**. Named here because a later session will meet the same shapes:

1. A **ratchet** asserting ten atoms had verified parity while the gate could not execute at all.
2. A **fixture** carrying only presentation keys, so five atoms "passed" by comparing two empty arrays.
3. A **self-test** whose positive and negative control both passed, because its string-stripper meant
   neither could read a value.

A check that cannot reach its own subject is indistinguishable from a check that passed. Only a
control designed to go red separates them.

---

## 18. Wave 5a panel design — resolved (Bean, 2026-09-01)

Grounded in a control-by-control comparison of the six blocks against `BackgroundPanel` and the
`imageControls` extension (`.claude/reports/2026-09-01-media-control-comparison.md`). This is
the design input for Wave 5a's `MediaElementPanel` / `SGS_Media_Element` build — the layer §17
records as not yet built.

### 18.1 Type selection — a real `MediaType` attribute, non-destructive switching (corrected 2026-09-02)

⚠ **This section originally specified WP's `TabPanel` with no stored attribute, clearing the
sibling type's source data on switch, "so two sources can never coexist." Superseded — the
already-built `media-type`/`source` atoms (`src/components/media/atoms/media-type.control.js`,
`source.control.js`) use a better design, kept as final rather than rebuilt to match this section:
a real `MediaType` attribute (button-group control, `ToggleGroupControl`, matching Bean's
preference for buttons over a dropdown) plus NON-DESTRUCTIVE switching — the other type's stored
media is never cleared, so a client toggling image↔video to compare never loses their upload.**
This still closes the "video silently beats image, no warning" gap named in §1, but by a different
mechanism than "clear the loser": because this atom stores a REAL `MediaType` attribute (unlike
container, which infers type from which source field happens to be populated), render always
knows unambiguously which type is active regardless of what else is stored — there is no
"whichever source is present wins" ambiguity left to resolve by deleting data. `source.control.js`
also auto-fills `ImageAlt`/`VideoAlt` from the picked attachment's own alt text on selection
(§18.3), never overwriting a client's own typed wording on re-pick.

### 18.2 Panel structure — "Media" panel, "Image Styling" sub-panel

```
Media (top-level PanelBody)
├── Type tabs (Image / Video / SVG) — upload control + type-exclusive atoms live IN the tab
│     Image tab: source · meaning (see 18.3)
│     Video tab: source · video-behaviour (6 toggles + captions) · meaning
│     SVG tab:   source · svg-presentation (5 controls)
├── Image Styling (sub-section, applies to whichever type is active, per atom's `types` list)
│     object-fit · focal-point · box-shape (sizing mode, width, ratio) · border-radius
│     — see 18.2a, this is where box-shape's `shape` enum and border-radius reconcile
└── Overlay (bottom, box-scoped, applies regardless of type — see 18.5)
```

This is an upgrade over `BackgroundPanel` as it exists today, not a copy of it: container
currently only renders `backgroundSize`/`backgroundPosition` inside the Image tab, so a video
background gets no size/position control at all. Moving object-fit/focal-point out of the tabs
and into "Image Styling" (gated on the atom's own `types` list, not on which tab is open) fixes
that as a side effect — video gets object-fit/focal-point, SVG correctly does not (per §5's
"NOT svg" note on atom 7).

#### 18.2a Box-shape's `shape` enum and border-radius reconcile into one control

`box-shape` already declares `shape: none|rounded|circle|square`. Separately, every block has
its own `SgsBorderControl` for manual radius, usually in its own "Border" panel. Two mechanisms
answering the same question. Resolution: `shape` becomes the quick preset (rounded/circle/square
map to fixed radius values); the real, editable radius input lives once, inside Image Styling,
serving both the preset and a manual override — no separate media "Border" panel, no two
controls competing for one visual property.

### 18.3 `meaning` — auto-fill, optional override, not a required field

⛔ **Corrects a real risk raised and rejected in the same conversation, not a silent design
call.** Bean's instinct (typing alt text twice — once on the attachment, once per block instance
— is redundant data entry) is right for the common case, but full removal was rejected:
`source`'s own `reads` field already documents *why* alt text is per-instance by design ("the
same logo is meaningful in a header and decorative in a footer strip"), several sources have no
WP attachment to inherit from at all (product-card's bare-URL `image`, direct-URL video), and WP
core has no field for "decorative in this one use" — that's structurally a per-instance concept.
**Resolution:** auto-fill `ImageAlt`/`VideoAlt` from the attachment's own alt on select (every
block that has this control already does it) and render the `TextControl` as a low-emphasis
override, not a required field — zero extra typing for the common case, the escape hatch stays
for the case that needs it. The decorative toggle is unaffected — it has no attachment-level
equivalent to defer to.

### 18.4 New atom: `motion` (ken-burns / parallax) — supersedes §5's "stay v2" line

⚠ **§5 listed ken-burns/parallax among the ~20 concepts deferred to v2. Superseded — pulled into
v1 now (Bean, 2026-09-01): "you literally already have the perfect implementation of both right
now... just do it."** No new design needed — harvest directly from the two working
implementations: container's `bgParallax`/`bgKenBurns` (backdrop scope) and hero's
`mediaParallax`/`mediaKenBurns`/`mediaAnimationDuration` (split-media, element scope), a
mutually-exclusive pair in both. Lands as the 11th atom in `registry.js`, mounted inside "Image
Styling" (18.2) next to sizing, since it's a presentation property of the same element. **Open,
to verify at build time, not to guess now:** whether ken-burns is gated to `types: ['image']`
only (a slow zoom/pan reads as static-photo-only; video already moves, SVG is unclear) — check
hero's actual gating condition rather than assuming.

### 18.5 `overlay` — bottom of panel, hover-capable, hero's bypass fixed

Position: bottom of "Media", box-scoped (`attachesTo: 'box'`), applies regardless of which type
tab is active — this is the one placement criticism of `BackgroundPanel` today (overlay
currently renders ABOVE the media tabs there; move it below). Keep container's Normal/Hover tab
shape (hero's split-media overlay currently has no hover state — adopt container's, not hero's).
⛔ **Fix, not just relocate:** hero's split-media overlay hand-builds its CSS inline and bypasses
the shared `sgs_overlay_decls()` emitter — no opacity, no blend mode, no hover as a result. Route
it through the shared emitter like container does, as part of this work, not a follow-up.

### 18.6 `imageControls` extension — MediaElementPanel supersedes it for the six blocks

⚠ **§5 said explicitly "reworking the extension itself is out of scope and would be its own
design gate." Superseded (Bean, 2026-09-01):** "we'll be replacing everything the image controls
extension did in its controls now anyway since this is the new universal extension/helper." For
`before-after` and `product-card` — the two of the six blocks currently on the extension —
`MediaElementPanel` replaces it outright rather than reading its vocabulary alongside the atoms'
own (§5's "atoms READ both vocabularies and emit one" plan for object-fit is now moot for these
two specifically, since there's only one panel left to read from). **Scope stays the six blocks.**
The other ~19 blocks currently on the extension are NOT touched by this work — a wider
extension-retirement is a separately-scoped, separately-gated migration, not silently folded in
here.

### 18.7 Known bugs closed as a side effect of this shape, not by separate patches

- **Hero's split-media type toggle is gated on `splitImage?.url` existing** — invisible until an
  image is uploaded, even when the client wants to start with a video. Tabs (18.1) don't need a
  populated slot to render, so this goes away by construction, not a patch to hero's current gate.
- **Before-after's tiers gap** (image slot gets art-direction tiers, video/SVG slots don't) —
  once the tiered upload control is a property of the shared type-tab (18.1/18.2) rather than
  something before-after hand-built per type, this stops being a per-block gap.

### 18.8 Confirmed unaffected by 18.1–18.7

Object-fit, focal-point, box-shape, overlay and svg-presentation stay independent, individually
selectable atoms exactly as §5/`registry.js` define them — 18.2 changes where their controls sit
in the panel, not what they are or how a block opts in/out via its `atoms: [...]` list.