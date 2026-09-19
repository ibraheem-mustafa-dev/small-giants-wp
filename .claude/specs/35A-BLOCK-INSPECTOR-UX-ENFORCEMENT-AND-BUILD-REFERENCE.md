# Spec 35A — SGS Block Inspector UX: Enforcement, Build Reference & Obligations

```
doc_type: spec
spec_id: 35A
spec_version: 1.0
parent_spec: 35 (.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md)
status: ACTIVE
last_verified: 2026-09-19
owner: framework
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

> **Parent spec.** Spec 35A is the sub-spec of Spec 35 (`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`). Spec 35's header carries the migration-method gate, the implementation-status box and the table that maps every PART letter, section number and ID to its file — read it first. In this file a bare "PART A" to "PART E", "D1" to "D5", "PART O §N", "§N field M" or "contract §N" citation is Spec 35; "Part F" to "Part N", "CO-n", "O.15", "O.16" and "Cross-cutting A/B" are here.

## PART F — Anti-patterns (fail-list)

Essential control only in sidebar · sidebar as home for every option · no headers past a handful ·
**incomplete option sets (Small/Medium, no Custom)** · bespoke panel duplicating a native supports
panel · no reset · colour-only focus/selected · help not `aria-describedby`-linked · bespoke
"Custom CSS" field on the block · re-implementing box-side unlink per block · duplicate hover panels /
hover split from resting · everything in the Settings group · **raw URL field instead of `LinkPopoverField`** ·
**hand-rolling duotone/aspect-ratio/lightbox/sticky/dynamic-content when a native support exists** ·
animation with no reduced-motion gate · raw-px spacing instead of the token scale.

**⚠ EXEMPTION: `sgsCustomCss` is NOT the
bespoke "Custom CSS" field this fail-list bans.** Spec 32 FR-32-4 names `sgsCustomCss` as **the
only permitted non-attr, non-scoped-`<style>` styling output** framework-wide, and Spec 31
FR-31-5.2 makes it **load-bearing** — it is the D3 passthrough channel that carries arbitrary
non-device-tier draft breakpoints (`ResidualBand`) onto a clone; removing it breaks clone fidelity.
It is registered on every block (`src/blocks/extensions/custom-css.js`) as a
deliberate, framework-wide exception. The Part-F
anti-pattern still stands for any OTHER bespoke per-block custom-CSS field — this exemption is not
a licence to add a second, block-specific one.

### F.1 — A composite's `selectors.typography` targets its own ROOT, never a child's dead BEM class

When a composite's text lives in an InnerBlocks child (FR-22-6) rather than a scalar attribute, the
`.sgs-<block>__<element>` class and CSS do not exist — but the block's `block.json`
`selectors.typography` can be left pointing at that unrendered class. Every native typography
control then produces a rule that lands on nothing: the client picks a font size, it saves, nothing
moves.

**The fix shape (not a per-block judgement call):**
- Point `selectors.typography` at the block **ROOT**, not into the child. This is what core does —
  `core/group`, `core/cover`, `core/columns` all declare typography supports with no child selector,
  relying on plain CSS inheritance to reach InnerBlocks children.
- **Why a root declaration is safe and won't fight the child's own styling:** a CSS **declaration
  always beats an inherited value regardless of specificity**. The container's rule sets an
  UNSET child's default; a child with its own explicit value keeps it. Reaching into the child with
  a descendant selector instead turns this into a specificity fight — the documented cause of core's
  own "impossible to override nested block CSS" complaints (gutenberg#36135, #12563).
- **Measured limit — this does not reach every property.** `font-size` does NOT reach a heading
  child when theme.json declares `styles.elements.h2.typography.fontSize` — a declaration beats
  inheritance, and theme.json's is the declaration in that case. Inheritance only carries what
  theme.json leaves undeclared on the element. Do not "fix" this by out-declaring theme.json from
  the container; that reopens the same specificity fight this rule exists to avoid.
- **Check the selector actually maps to an emitter before trusting it.** A correct selector is not
  proof the property emits — a block that emits typography via a wholesale `style.typography`
  passthrough to `wp_style_engine_get_styles()` silently drops `textAlign` (not a style-engine key).
  Verify the specific property actually reaches the DOM, not just that the selector is well-formed.

**This mechanism generalises into a `typography` wrapper capability.** `typography` is a 6th opt-in
shared-wrapper extension alongside background/width/layout/gridItems/shapeDividers — a root-level
default for InnerBlocks children reusing this exact inheritance mechanism, Styles tab. Only colour and
typography qualify for this pattern framework-wide: it depends on native CSS inheritance, which
background/border/shadow/padding don't have.

### F.2 — Shared-wrapper capability preconditions: `gridItems requires layout`, and the shape-divider `ScaleAxisControl`

**F.2.1 — `gridItems requires layout` precondition. ✅ BUILT.** A block declaring `gridItems` in
`supports.sgs.enabledExtensions` without also declaring `layout` would let a client style
non-existent grid items — `GridItemDefaultsPanel`'s own `if (layout !== 'grid') return null` is a
render-time bail, not a build-time guarantee the wrong combination can't be declared in the first
place. Gate: a **build-time static script**, not a `/sgs-update` DB-seed check — `enabledExtensions`
is a flat block.json array with no DB table home and no consumer that would justify creating one
(unlike `boxFamilies`/`variantAttr`, which genuinely feed the cloning converter and are legitimate
R-31-1 DB-first cases). `plugins/sgs-blocks/scripts/check-wrapper-capability-preconditions.js`,
same family as `check-shared-panel-schema.js` / `check-box-family-guard.py`
(`--survey`/`--check`/`--json`/`--self-test`), fail-closed, no baseline, registered in
`scripts/gates.json` and runnable as `npm run check:wrapper-capability`, holding a small declared table:

```js
const CAPABILITY_PRECONDITIONS = {
  gridItems: [ 'layout' ],
};
```

For every block.json, read `supports.sgs.enabledExtensions`; for each key present that also appears
in `CAPABILITY_PRECONDITIONS`, assert every listed precondition is also present, exit 1 on any miss
under `--check`. No `--fix` mode — a codemod silently injecting `layout` into a block's declared
extensions would change a block's capability set as a lint side effect.

**F.2.2 — there is no `supports.sgs.gridAreas` flag.** The converter derives area names directly
from the draft's BEM element token (`assembly.py` step 3d: `parse_sgs_bem(cls).element` —
`sgs-hero__content` → `content`) and routes via `db.attr_for_area_property(block, area, prop)`, gated
on the block declaring `<area>+<Suffix>` attrs, not on any block flag. "hero has areas content and
media" is fully derivable from hero declaring `contentPadding`/`mediaPadding`.
`check-wrapper-capability-preconditions.js` rule 2 FAILS the build on any declaration of
`gridAreas` (including an empty array, which would otherwise silence the gate).

**F.2.3 — `shapeDividers` linked/unlinked X/Y scale control. ✅ BUILT** (`src/components/ScaleAxisControl.js`).

**X/Y render behaviour.** 100% is the shape's natural, undistorted size on both axes (the default).
**Y anchors to the edge the divider is attached to** (top divider anchors its top edge, bottom divider
its bottom edge) and grows INTO the section as Y increases — what `top:-1px`/`bottom:-1px` produce;
nothing repositions. **X anchors from the horizontal CENTRE of the block** it's attached to, scaling
symmetrically left/right from the middle — not from either edge. Values below 100% on X make the
shape narrower, so the pattern **tiles/repeats** to fill the block's width (an SVG `<pattern>`, which
keeps the markup, `currentColor` and flip/invert, and is not entered at all at x=100 so the default
renders identically to an untiled shape); values above 100% make the shape wider than the block, so
the excess is simply **not rendered/visible** — clipped at the block's own width, same as any other
CSS `overflow:hidden` element wider than its container.

**Control shape: keep the link/unlink toggle.** Proportional-scale-by-default
with a lock/unlock toggle is the standard shape-resize convention (Figma/Photoshop/Canva) — a
stronger precedent than treating X/Y as unrelated axes needing independent controls. Default state
LINKED (computed as `value.x === value.y` on mount; a fresh instance starts at `{x:100,y:100}`, so it
opens linked; an already-unlinked instance reopens unlinked). Component
`plugins/sgs-blocks/src/components/ScaleAxisControl.js` — the 2-axis analogue of WP core
`BoxControl`'s 4-side link pattern. Interface:

```
Props:
  label            string
  value            { x: number, y: number }   // shared unit — see storage below
  onChange( next: { x, y } )
  min / max / step  (RangeControl passthrough)
  unit             string (display suffix, e.g. '%')

Internal state:
  isLinked = useState(() => value.x === value.y)
    // Mirrors core BoxControl's own isValuesMixed-on-mount check — computed
    // from the incoming value, NOT a persisted attribute.

Render:
  - a link/unlink icon button (@wordpress/icons `link` / `linkOff` — the same
    pair core BoxControl itself renders internally; no new icon dependency)
  - linked:   ONE control labelled `label`; onChange writes { x: v, y: v }
  - unlinked: TWO controls, "Horizontal (X)" / "Vertical (Y)"; onChange
    writes only the changed axis
  - re-linking while x !== y: sync y ← x (X is visually primary — same
    "collapse to one value" behaviour core BoxControl exhibits on re-link)
```

Storage: an object attr `{x,y}`, matching this plugin's established box-family object contract
(`gridItemPadding`, `mediaPadding`, and every other paired/multi-axis attr in this codebase are
object-shaped, never independent scalar pairs) — not a new storage convention.

**Storage replaces the px `Height`, it does not sit alongside it:**
`shapeDivider{Top,Bottom}Scale:{x,y}` (%, default `{x:100,y:100}`, where `y:100` is the SVG's natural
height, translated to px via its own viewBox at render) is the only scale attribute —
there is no `shapeDivider{Top,Bottom}Height`. Reasoning: this project's "no version bumps, no
deprecations pre-production" policy licenses a clean attribute replace over an add-alongside when
there is no live client content to preserve; an add-alongside would leave two controls (px Height,
% ScaleY) with overlapping visual effect on the same block — a worse client-facing shape than one
clean linked pair. No responsive tiers — shape dividers carry no per-breakpoint variant; a
deliberate scope boundary.

## PART G — Prefer native, don't hand-roll (adopt these WP mechanisms)

**Part G is a per-support VERDICT table, not a blanket "adopt native". Nothing adopts a support
without the Spec-32 skip-serialisation + scoped-emission pattern.**

| Support | VERDICT | Reasoning |
|---|---|---|
| `filter.duotone` | **ADOPT** (`imageControls`) | Nothing hand-rolled exists; free client value on image blocks |
| `dimensions.aspectRatio` | **ADOPT** | Replaces 4 inconsistent per-block attrs |
| `shadow` | **KEEP SGS** | ShadowControl + `sgs_shadow_value()` exceeds the native preset picker |
| `dimensions.minHeight` | **KEEP SGS** | Per-breakpoint attr families beat native's single value; adopting = Part-F duplicate panel |
| `position.sticky` | **KEEP SGS** | Collides with the behaviour cascade |
| `lightbox` | **KEEP SGS** (gallery) | Bespoke has more features; native considered only for `sgs/media` |
| `templateLock:"contentOnly"` | **PER-CLIENT OPT-IN ONLY** | Hides children's inspector settings (contradicts the inspector standard; template-reapply risk). Build-time lock for a specific client with a real breakage problem — never framework patterns |

| Native mechanism | Use instead of | Priority |
|---|---|---|
| theme.json v3 `styles.blocks.<name>.css` + `appearanceTools` | per-block bespoke CSS plumbing | **HIGH** — fits per-client `theme-snapshot.json` |
| **Block Bindings API** (`register_block_bindings_source`) | any bespoke dynamic-content attr system | **HIGH** — WP's own direction |
| `LinkControl` | raw URL text fields | **HIGH** — internal search + rel + new-tab free |
| Native duotone / aspect-ratio / lightbox / sticky | hand-rolled filter/box/JS/position | **HIGH** — check before building any of these |
| Block style variations w/ inner-element styles ("Section Styles", 6.6) | bespoke variant switching where it's "same structure, different look" | Med — maps onto `variant_slots` |
| Spacing presets (theme.json) | hand-written spacing values | Med — spacing presets are unaffected by the typography rule below |
| — (fluid typography: NOT adopted) | — | ⛔ SGS uses EXPLICIT per-device typography values via the tier system + `assets/css/type-scale.css`. `clamp()` on `vw` can fail WCAG 1.4.4 because viewport units ignore browser zoom (GOV.UK never adopted `clamp()`; Designsystemet Norway shipped and reversed it). |
| `register_block_pattern` + categories/blockTypes | uncategorised patterns | Med — audit existing `patterns/*.php` |
| Interactivity API (`@wordpress/interactivity`) | hand-rolled view.js DOM code | Med — real rewrite cost |
| Copy/paste styles (WP 6.2, free) | — | works IF styling is in native `supports` attrs (Spec 32 direction) |
| Save-as-default (locked 4-channel model) | a custom defaults store | — already the right call |
| Block Hooks | — | LOW — template-context only; SGS clones to Pages |

## PART H — Component quick-reference (which component for which job)

> ⛔ **THIS LIST IS THE CORE-COMPONENT REFERENCE, NOT THE CANONICAL CONTROL SET. Where it names a raw
> core component that SGS has wrapped, the wrapper wins — and the raw lookalikes are enforced by live
> build gates.**
>
> | Job | Part H names | **Canonical (governing)** | Gate |
> |---|---|---|---|
> | colour | `ColorPalette` / `ColorGradientControl` | **`DesignTokenPicker`** (contract §1) | rule `24-raw-canonical-component` (`gate`) bans the raw components outright; rule `04-colour-alpha` (`gate`) flags a raw colour picker **only when `enableAlpha` is absent** (`<ColorPalette enableAlpha>` passes rule 04 clean) |
> | link / CTA | `LinkControl` | **`LinkPopoverField`** (contract §2; `SgsLinkControl` is not canonical) | rule `24` bans raw `URLInput`/`LinkControl`; rule `08-raw-url-link` matches `<TextControl type="url">` only; rule `27-superseded-link-control` gates `SgsLinkControl` |
>
> Governing document: **PART O** (Spec 35), which lists both raw components as **banned lookalikes**.
> Raw `<ColorPalette>` and `<LinkControl>` are rendered only *inside* the canonical wrappers under
> `src/components/`, never in a block's `edit.js`
> (`git grep -n "<ColorPalette\|<LinkControl" -- plugins/sgs-blocks/src/blocks` → 0).
>
> Where Part H states a bare `LinkControl`, it names the WP-NATIVE primitive the SGS wrapper wraps, not
> an instruction to reach for it directly (Part C's "N: LinkControl" annotations, the "Native
> mechanism" table's `LinkControl` row, this box's comparison table). Conflating "names the native
> mechanism" with "tells you what to build with" is the defect to avoid.
>
> **Border, line-height and 4-side box assignments below follow the contract, not core.** 4-side box is
> `ResponsiveBoxControl` (contract §5 — raw `BoxControl` is a named banned lookalike, §5 field 3,
> because it bypasses the tier wrapper). Core's grouped border-box component does NOT agree with
> contract §14; canonical is stated inline below. **Do not reinstate either core component name in
> this file** — a `grep -c` for each is the commit gate, and the rejection rationale lives at
> contract §14.1. Native WP primitives with no dedicated contract clause (`AnglePickerControl`,
> `DateTimePicker`, `FontSizePicker`, `FontAppearanceControl`, `HStack`/`VStack`/`Flex`/`Spacer`/
> `Divider`, `ColorIndicator`, `Tip`/`Notice`, `Disabled`, `Dropdown`/`DropdownMenu`, `Modal`,
> `registerFormatType`, `__experimentalSpacingSizesControl`) are unconflicting native mechanisms, not
> lookalikes.

Numeric+unit → `UnitControl` · bounded numeric → `RangeControl` (+input+reset) · 4-side box →
**`ResponsiveBoxControl`** (contract §5 — bare `BoxControl` is a banned lookalike, it bypasses the
tier wrapper) · colour → **`DesignTokenPicker`** (wraps `ColorPalette`; `enableAlpha`+`clearable`
default true — `ColorPalette`/`ColorPicker`/`CircularOptionPicker` are **SGS-OWNED forks** at
`src/components/colour-picker/`, forked verbatim-behaviour from `WordPress/gutenberg` at pinned SHA
`28c0dedc4eaf001a24237a1fbba4b0887698b000` (WP 7.0.4), TS→plain JS, `@emotion/styled`→SCSS, MIT deps
`react-colorful`/`colord`/`clsx`; the dependency `DesignTokenPicker` wraps is local, not
`@wordpress/components`) · gradient → `GradientPicker` · angle/direction → `AnglePickerControl` · border →
a **composed builder** (width `UnitControl` + style `SelectControl` + token-aware colour picker) ·
radius → **`ResponsiveBorderRadiusControl`** *(both per contract §14.1 — core's
grouped border-box component is deliberately NOT adopted, rationale at §14.1 field 1)* ·
spacing token → `__experimentalSpacingSizesControl` · segmented
choice → `ToggleGroupControl` · long/searchable list → `ComboboxControl` · multi-value tags →
`FormTokenField` · link/CTA → **`LinkPopoverField`** (wraps `LinkControl`) · font size → `FontSizePicker` · weight+style →
`FontAppearanceControl` · line-height → **`ResponsiveControl` wrapping `UnitControl`** (contract §4.1;
core's dedicated line-height component is NOT canonical here — a `grep -c` for its name is the commit gate) ·
focal point → `FocalPointPicker` ·
**object-position → `FocalPointPicker`** (same component; responsive tiers required) · **object-fit → `SelectControl`** (closed enum: cover/contain/fill/none/scale-down) ·
date → `DateTimePicker` · optional-controls group → `ToolsPanel`/`ToolsPanelItem` · in-row layout →
`HStack`/`VStack`/`Flex`/`Spacer`/`Divider` · swatch preview → `ColorIndicator` · inline hint →
`Tip`/`Notice` · greyed prerequisite → `Disabled` · compact secondary → `Dropdown`/`DropdownMenu` ·
destructive confirm → `Modal` · inline mark → `registerFormatType`. Free-from-supports: anchor,
className, align, aspectRatio, background, position, shadow, filter/duotone.

## PART I — SGS component action layer (exists vs build)

| Capability | SGS status | Action |
|---|---|---|
| Responsive per-breakpoint | `ResponsiveControl`, `ResponsiveBoxControl` EXIST | audit coverage; use everywhere responsive-worthy |
| Typography per element | `TypographyControls` EXISTS (R-22-13). ✅ **DONE — architecture is "no curation": every text surface gets the full control set by default**, not a curated per-element subset. Two-state link colour ships via `sgs_link_colour_css()`. `audit-typography-attr-declarations.js` guards against attributes the controls write that are undeclared in block.json. | — |
| Colour | `DesignTokenPicker` EXISTS — `enableAlpha` + `clearable` BUILT (both default true; `DesignTokenPicker.js`). ⭐ **`SgsColourPanel`** (the shared per-element colour panel that groups `DesignTokenPicker` instances, Styles-tab placement): most colour-bearing blocks route colour through the shared panel — re-derive the split via `git grep -l SgsColourPanel -- 'plugins/sgs-blocks/src/blocks/*/edit.js'`, do not trust a cached count here. Seven blocks (`notice-banner`, `quote`, `testimonial-slider`, `testimonial`, `option-picker`, `process-steps`, `product-card`) deliberately KEEP native `supports.color` sub-flags `true` alongside the panel — those flags are load-bearing for a root-level `style.color.*` mechanism the panel does not replace, so native colour UI may still appear alongside `SgsColourPanel` for those blocks specifically. `sgs/social-icons` has no custom colour attrs, only native supports — not a migration candidate; it needs its own design pass. | DONE |
| Normal/Hover state | `StateToggleControl` is not part of the codebase (`git grep -n "StateToggleControl" -- plugins/sgs-blocks/src` finds only comments; 0 imports, 0 mounts). | Hover/state colour is delivered by `SgsColourPanel`'s `rows[].states` array, passed through to `DesignTokenPicker`'s own `states` prop (e.g. `button/edit.js`). Normal/Hover lives INSIDE the colour popover. Do not wire a separate toggle component. |
| Extension gating | `hideExtensions` (opt-out, most extensions) + `enabledExtensions` (opt-in, hover/blockLink only) EXIST | — |
| **Shadow builder** | `ShadowControl` (`src/components/ShadowControl.js`) stores SHAPE only (X/Y/blur/spread/inset); colour is a split sibling `{name}Colour` attribute that appears as a normal row in the per-block `SgsColourPanel`, composed at render/preview via `sgs_shadow_value_composed()` (PHP) / `resolveShadowPreviewComposed()` (JS). Blocks on this shape: `cta-section`, `trust-bar` (`iconCircleShadow`/`badgeImageShadow` only — its own root shadow renders inside the shared container wrapper), `card-grid` (reference implementation), `team-member`, `brand-strip`, `testimonial`, `info-box`, `post-grid`, `before-after`, `media`, `button`, and `quote` (`ShadowControl` for shape + flat sibling `boxShadowColour`/`boxShadowHoverColour` surfaced in `SgsColourPanel`). | ✅ DONE |
| **Link/CTA** | `LinkPopoverField` is canonical (PART O §2). `SgsLinkControl` (`src/components/SgsLinkControl.js`) is not canonical; rule `27-superseded-link-control` gates new consumers. card-grid, media (4 fields), product-card (3 CTAs) and trust-bar item links use the shared link controls; rule 08 (raw-url-link) has 0 WARNs and 2 reasoned EXC exemptions | DONE |
| **Bulk media/gallery** | **BUILT** — `MediaGalleryPicker` (extracted from `gallery/edit.js`) | DONE |
| **Focal point / image size / aspect-ratio** | Blocks whose focal-point/image-size/aspect-ratio declaration had no effect carry no such declaration (`info-box`/`decorative-image`/`responsive-logo`/`timeline`/`brand-strip`/`trust-bar`/`hero`); blocks with a real crop scenario use an explicit mechanism (`before-after`/`team-member`/`testimonial-slider`/`gallery`/`card-grid`/`product-card`), each calling `includes/helpers-media-position.php` with its own known selector rather than a guessing filter. `testimonial`/`image-sequence` still declare the capability with a real crop scenario but are not converted — each needs its own per-item design decision. Design record: `plans/spec-35-capability-routing-doctrine.md` Part 9. | ✅ **DONE** |
| **Gradient / bg overlay** | `BackgroundPanel` covers 4 blocks (`container`, `cta-section`, `hero`, `trust-bar`): swatch+popover UI. Single-element blocks (text/button/heading/etc.) get colour/gradient via native WP colour support on a different mechanism (effect-verified by `survey-background-colour-support.py`), not via `BackgroundPanel`. | ✅ **DONE** |
| **Spacing token control** | raw units | still open — not gated by Part K |
| ToolsPanel disclosure | **BUILT + ROLLED OUT** — panels that are mode wizards, repeaters or variant-gated are skip-reasoned in-code | DONE |
| **Client-safe editing** | `templateLock:"contentOnly"` is **PER-CLIENT OPT-IN ONLY** (Part G) | Not a framework rollout — deliberate, not a gap |
| **Dynamic content** | BUILT: `includes/class-sgs-block-bindings-support.php` (`Sgs_Block_Bindings_Support`) is live and wired at `sgs-blocks.php`, widening the native Block Bindings API across the blocks listed in its `$supported_block_attributes` map. Two further binding SOURCES are registered: `class-sgs-site-info-binding.php` and `class-product-bindings.php` (with a PHPUnit test). This is the native mechanism Part G mandates, not a bespoke one. **Residual: confirm the block coverage in `$supported_block_attributes` is the intended scope, or extend it.** | DONE |
| **Reduced-motion gate** | Every block is covered by one framework-wide gate, `theme/sgs-theme/assets/css/core-blocks-critical.css` (unconditionally enqueued by `theme/sgs-theme/functions.php`), detected live each run by `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js` (reads `functions.php`'s enqueue chain + the CSS itself for a universal `prefers-reduced-motion` block — nothing hardcoded, so removing the gate re-flags every ungated block). A name-substring match on `supports.sgs` JSON is blind to negation: `build-roster.py` strips `hideExtensions` before matching, because `hideExtensions:["animation"]` is an opt-OUT. | DONE |
| **Whole-card link** | **BUILT** — stretched-link overlay (sibling overlay + aria-label + focus ring; nested-`<a>` impossible by construction) rather than a whole-block `sgsBlockLink` wrap; `.sgs-block-link-wrapper` has 0 occurrences repo-wide | DONE |
| Native duotone/aspectRatio/sticky | duotone + aspectRatio **ADOPTED native** on media/gallery (Part G verdict table); shadow/minHeight/sticky/gallery-lightbox **KEPT SGS** (deliberate) | DONE |

## PART J — Upgrade roadmap (priority-ordered, with build status)

| # | Upgrade | Status |
|---|---|---|
| 1 | `DesignTokenPicker`: `enableAlpha` + `clearable` (fixes transparent everywhere) | BUILT |
| 2 | Every link/URL field → the shared link control (`LinkPopoverField`) | BUILT |
| 3 | Shared `ShadowControl` (real X/Y/blur/spread/colour+alpha) replacing None/Small/Medium selects | BUILT |
| 4 | `templateLock:"contentOnly"` in client patterns | PER-CLIENT OPT-IN ONLY (Part G) — not a framework rollout |
| 5 | `MediaGalleryPicker` (bulk multi-upload) → `brand-strip` logos + any repeater-media block | `MediaGalleryPicker` BUILT; `brand-strip/edit.js` still imports the single-slot `MediaPicker` — NOT BUILT for brand-strip (`grep -n "import.*Media" plugins/sgs-blocks/src/blocks/brand-strip/edit.js`) |
| 6 | Extend `imageControls`: FocalPointPicker `{x,y}`, object-fit via scoped var; the image-size dropdown is NOT forcible at extension level (no universal attachment ID) | BUILT |
| 7 | Whole-card clickable-link pattern for card-grid/team/product/testimonial | BUILT (stretched-link overlay) |
| 8 | `ToolsPanel` progressive disclosure on control-dense panels | BUILT |
| 9 | Every animation `prefers-reduced-motion`-gated (WCAG) | BUILT (framework-wide gate) |
| 10 | Adopt native: Block Bindings for dynamic content, native duotone/aspect-ratio | BUILT (Part G verdict table). Section Styles (block style variations with inner-element styles, WP 6.6) — NOT BUILT (`git grep -n -i "SectionStyles\|Section Styles" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes theme` → 0); pattern categories/blockTypes audit and Interactivity API for hand-rolled view.js remain considerations |

## PART K — Rollout mechanism

Bean is QC-only long-term (CLAUDE.md SUCCESS). This standard must be enforced structurally, not by
memory: (a) fold Part L into `block-migration-DONE-checklist.md`; (b) a lint/gate that flags a
colour control without `enableAlpha`, a URL field not using the canonical link control, a preset-only
"shadow", an animation without a reduced-motion gate; (c) `/doc-audit` cites Spec 35 per block.

The Part K structural gate is `plugins/sgs-blocks/scripts/inspector-scan/run.js`: fail-closed for
`gate`-mode rules (`rules.json`), wired into `prebuild`; each rule ships a self-test proving it can
fail. Full per-gate rationale: `plugins/sgs-blocks/CLAUDE.md` §prebuild gates.

**Gates enforcing THIS spec.**

| Gate | Enforces | Why it exists |
|---|---|---|
| `scripts/check-empty-inspector-containers.js` | **Part F** — an inspector container rendered with NO children is a dead control. An empty `<ToolsPanelItem>` still shows in the "+" menu and in `resetAll`, then displays nothing when opened; an empty `<PanelBody>` opens onto blank space. | No other gate covers this class. `check-dead-controls.js` checks the INVERSE (an attribute whose control nothing renders) — a container whose children were deleted still has valid wiring, so it reads clean. ⛔ AST walk, never a regex: regexes gave inconsistent answers to the same question. |
| `scripts/check-wrapper-capability-preconditions.js` | **§F.2.1** (`gridItems` requires `layout`) and **§F.2.2** (`supports.sgs.gridAreas` — any declaration fails the build). | `GridItemDefaultsPanel`'s `layout !== 'grid'` bail is render-time, not a declaration guarantee. Rule 2 is a retirement guard: the converter derives area names from the draft's CSS, so no reader is needed. No baseline (zero violations) and no `--fix` (a codemod adding `layout` would change a block's capability set as a lint side effect). |

**Gate enforcing the RENDER-side consolidation standard** — `scripts/remove-vacuous-style-engine-guard.py --check`,
registered as a gate (with a `check:vacuous-guards` alias). This one guards Spec 32's contract rather
than the inspector surface, but it is listed here because it is the same triad mechanism and the same
enforcement stack.

| Gate | Enforces | Why it exists |
|---|---|---|
| `scripts/remove-vacuous-style-engine-guard.py --check` | A `function_exists()` check on a CORE WP function is only meaningful when that function landed AFTER the plugin's declared floor. Below it the false branch is unreachable — dead code wearing the costume of a safety check. | ⛔ The floor is **PARSED** from the plugin header (`Requires at least`), never hardcoded: a LOWERED floor makes a family load-bearing again, and a hardcoded constant would both assert a stale claim AND fail the build for reintroducing a *correct* guard. It **fails closed** when the header is unreadable, **exempts polyfill definitions** (`if ( ! function_exists('x') ) { function x(){…} }` is correct code that makes a file runnable outside WP), and scans `src/` + `includes/` + **the theme**. |

**Two method rules, both generalisable:**

- **Verify a version floor against core LOAD ORDER, not the version number alone.**
  `wp-settings.php` `require`s style-engine/script-modules/interactivity-api before mu-plugins and
  plugins, and core never wraps those definitions, so no bootstrap window exists. The same check proves
  the rule DISCRIMINATES rather than being blanket: `pluggable.php` loads AFTER plugins, so
  `wp_get_current_user` guards are REAL, and the `wp_*connector*` family is `@since 7.0`, above the
  floor. Both are correctly kept.
- **A count from a convenient subset is not an enumeration.** A `src/blocks/*/render.php`-only grep
  misses matches in `includes/`. Run `--check`; never quote a hand-scoped grep.

## PART L — Per-block inspector definition-of-done (checklist)

> ⛔ **A "0 findings" result is only evidence if a rule actually looks.** Confirm a rule has a positive
> control before ticking an item on a zero.

**DONE — gate-enforced:**

- [x] **links use the popover link control (new-tab + rel)** — rule 08 `gate` (2 baselined non-content
      config URLs). Live control is `LinkPopoverField`; the popover placement rule holds
- [x] **responsive props expose the 768/1024 device switcher** — rule 25 `gate`; `DeviceTabs` has zero
      callers, so no per-control switcher survives anywhere
- [x] **`MediaUploadCheck` on every MediaUpload** — rule 14 `gate`; holds beyond the rule's
      `edit.js`-only corpus into `components/` + `extensions/`
- [x] **animation `prefers-reduced-motion`-gated** — rule 17 `gate`; JS checks in the motion
      extensions **plus** an unconditional framework-wide CSS gate
- [x] **control-dense panels use ToolsPanel** — rule `03-dense-panel-candidate` (advisory)
- [x] **State capability via `SgsColourPanel`'s tab-toggle mechanism** — blocks pass `states:` to the
      colour control (`DesignTokenPicker.js`). There is no separate state-toggle component (Part I)
- [x] **decorative-image + ARIA-label where needed** — rule `18-decorative-image-aria` (advisory).
      `sgs/cta-section`, `sgs/nav-drawer` and `sgs/social-icons` carry real toggles + ARIA wiring;
      `sgs/media`'s `imageDecorative` and `sgs/decorative-image`'s hardcoded `aria-hidden` complete it
- [x] **help text linked via `aria-describedby`** (Part F) — rule `44-help-text-not-described`
      (advisory, whole-tree scope — its candidates are shared `src/components/*.js` files, not one
      block's edit.js). Scoped to a raw `<BaseControl help={...}>` mount wrapping a non-self-wiring
      child with no `aria-describedby` in its subtree, because WordPress self-wires it for its own
      native `useBaseControlProps` controls. Single-trigger components (`LinkPopoverControl`,
      `DateTimePickerField`) pass `id` to `BaseControl` and wire that id's `${id}__help` onto the
      trigger `Button`'s `aria-describedby`; a multi-swatch mount (`DesignTokenPicker.js`'s
      `ColorPalette`) wraps in `role="group"` + `aria-describedby`
- [x] **element-first panels** — a static rule checks this (`41-co2-element-grouping-order.js`,
      advisory; spans TIER-1 element grouping, DOM-order-vs-declared-order and root
      Colour-before-Typography sequencing). It does NOT check CO-28's cross-block canonical panel order
      (a separate, larger question — Bean has not picked the canonical order)

**MOSTLY DONE, one unaudited edge:**

- [~] **every colour has `enableAlpha` + clearable** — rule 04 `gate`, and no raw colour pickers exist
      (all route through `DesignTokenPicker`, which defaults both true). ⚠ Rule 04 scans only
      `*/edit.js`; `colour-picker/color-palette/index.js` defaults `enableAlpha = false` and its
      callers are not audited. Close that, then tick

**PARTIAL:**

- [~] **keyboard + contrast a11y pass** — no static detector; needs a repeat live pass, not a one-off
- [~] Settings/Styles/Advanced split via `group` — rule 01 (advisory)
- [~] every CSS-length uses UnitControl or the token scale — `UnitControl`/`BoxControl` dominate, but a
      `RangeControl` raw-px residue and statically-unresolved attrs remain
- [~] every 4-value prop per-side via box_family — most are canonical; `check-box-flat.py` lists the rest
- [~] compound values use real builders — shadow: `ShadowControl`; border: `SgsBorderControl` is the
      builder (`git grep -l '<SgsBorderControl' -- 'plugins/sgs-blocks/src/blocks/*/edit.js' | wc -l`;
      §14's box has the detail)
- [~] images have size + aspect-ratio + object-fit + focal point — the shared `imageControls`
      extension covers the opting-in blocks; not every upload block has all four
- [~] **no no-op reset controls (Part F)** — rule `42-no-op-reset-controls` (advisory, AST walk over
      each block's own edit.js): a `ToolsPanelItem`'s `hasValue` arrow whose body references zero
      identifiers, or `onDeselect` arrow whose body calls zero functions. Self-test fixtures prove the
      rule CAN flag real code
- [~] **no colour-only persisted state indicators (Part F / WCAG 1.4.1)** — rule
      `43-colour-only-state-indicator` (advisory): a persisted UI state selector
      (aria-current/aria-selected/aria-checked/aria-expanded=true, `.is-active`, `.is-selected`,
      `.is-current`, `[open]`, a BEM `--active`/`--current`/`--selected` modifier — never a bare
      `:hover`) whose unioned declared properties are colour-only. Triage by eye: a finding is a false
      positive where the state gains a real shape/texture change (e.g. a border-left going from
      `3px solid transparent` to a visible bar — invisible→visible is structural even though the
      property name is colour-family), or where a SIBLING rule for the same state already provides a
      non-colour signal the per-selector detector cannot see (an icon display-swap, a chevron rotation,
      a font-weight set by the non-`:where()` sibling rule)

**NOT BUILDABLE as a gate:**

- [ ] **no native-supports panel duplicated** — **no gate, and it cannot be one without reproducing the
      ~600-false-positive class that got `scattered-element-controls.js` deleted**: it can't distinguish
      a real duplicate from a deliberate KEEP-SGS choice (Part G's verdict table). A genuine, checked
      exception, not neglect — do not re-investigate without new information

**NOT ACHIEVABLE AS WORDED — this checklist contradicts Part G:**

- ⛔ **native supports used over hand-rolled (aspectRatio/duotone/sticky/lightbox)** — Part G's verdict
      table rules **`position.sticky` = KEEP SGS** and **`lightbox` = KEEP SGS (gallery)**. Zero native
      adoption of those two is the *intended* architecture, not a gap. `aspectRatio` and `duotone`
      (native key) ARE the adopt-cases. **Word this item to name only aspectRatio + duotone**
- ⛔ **client patterns use `templateLock:"contentOnly"`** — Part G rules it **PER-CLIENT OPT-IN ONLY …
      never framework patterns**, and Part I labels it "not a framework rollout — deliberate, not a
      gap". Zero framework patterns using it is correct by design. **Reword or drop**

**PARTIAL, aggregate:**

- [~] **no Part-F anti-patterns** — gated by the inspector-scan rules
      (`node plugins/sgs-blocks/scripts/inspector-scan/run.js`). Still open: rule
      `31-golden-colour-control` (colour-completeness) and rule `41-co2-element-grouping-order` — both
      advisory; re-run for the current count. Two named Part F anti-patterns are deliberately ungated
      (see the implementation-status box at the top of Spec 35)

**Multi-item data is array-shaped** and **`hideExtensions`** are treated as met; neither has an
independently derivable "should" denominator.

## PART M — Implementation status (living)

**The STANDARD (Parts A–L) is complete as a written spec. The BUILD SURFACE against it is
substantially complete: the component layer and the Part-K gate are complete and wired fail-closed.**
Named open items:
1. **Spacing token control** — still raw units (Part I).
2. **Block Bindings coverage** — built (Part I "Dynamic content"); the residual is confirming the
   `$supported_block_attributes` scope.
3. **Part J step 5 (brand-strip logos on `MediaGalleryPicker`)** and **step 10's Section Styles** —
   NOT BUILT (Part J).

**Measurement & enablement layer (makes Part L enforceable):**
- **Element-manifest conformance linter** (`plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`):
  per-block OK/GAP/ORPHAN + a states axis. GAP is a queryable catalogue, not a backlog.
- **Code-derived control classification** (`extract-signatures.py`): each attribute carries which CSS
  property it drives (`css_property`), on which **element / state / tier** — all derived from code,
  never names. Two-layer override architecture (`attr-classification-overrides.json` applied after
  the derived layer).
- **`inspector_control_type` is edit.js-AUTHORITATIVE** and reseeded on every `/sgs-update` run: you
  can query, per block, which control each attribute actually renders — the prerequisite for the
  Part-K structural gate.
- **`role` (value-type) and `css_property`+element/state/tier (delivery) are PERPENDICULAR axes**, not
  competing — a control's completeness needs BOTH (what the value IS + how it is delivered). Do NOT
  replace `role`.

**Flat-to-object migration is COMPLETE.** `gap`, `maxWidth`+`contentWidth`,
`gridTemplateColumns`+`gridTemplateRows` and `columns` — all the properties that route through
`class-sgs-container-wrapper.php` — are object-shaped, as are the 4 BOX-per-tier properties
(`contentBandPadding`, `contentPadding`, `pillPadding`, `padding`). One rule from that migration is a
STANDARD-level rule: a responsive family's **control primitive must match its STORAGE SHAPE**, and the
two change together in one commit — `ResponsiveControl` for flat sibling attrs, `ResponsiveOverride`
for an object-typed base. Governing text: **PART O** (Spec 35) §12 field 3. The mismatch is silent
and destructive in both directions: WordPress discards an attribute a block no longer declares, and
coerces a flat value on an object-typed attr to its default, so migrating a storage shape without its
control leaves an inspector that deletes the setting when used — through a green build, every static
gate, and a deploy. **Only opening the editor finds this class.**

**Roadmap (Part J) build state:** see Part J's status table. Per-device CONTENT cascade (D4) and the
canonical shared `resolveTier()` are BUILT (Spec 35 D4); Spec 37 FR-37-14 (behaviour tri-state) is built
on that mechanism. `responsive-visibility.js`'s three independent flat booleans are deliberately
excluded from the cascade (Spec 35 D4 scope note).

**Editor-canvas verification.** Verify controls by opening the block editor: frontend render, REST
attribute registration and unit tests do not exercise the editor canvas (R-31-13; `ShadowControl`
crashed on first live render despite passing unit tests).

**OPEN (parked, none blocking Spec 35):** `P-NO-INLINE-GATE-COVERAGE-GAPS` (gate canary page for
var-driven features; see Spec 32 §6.2(a)) · `HeaderBehavioursTest.php` needs a composer/PHPUnit env
to execute · Shrink+Hide legacy-transition overlap on pre-animation-timeline browsers (documented,
not speculatively fixed).

**THE PLACEMENT RULE, as built.** Canonical rule text: Spec 35 A3/A4 + **PART O** (Spec 35) §THE
PLACEMENT RULE.
- **A4's "block-level panel" does not exist.** Every root-scoped control resolves to a TIER 2
  property-family panel via `cluster-member-sets.json`, not a catch-all — see Spec 35 A4.
  `check-cluster-coverage.py`'s typo guard validates member keys against every registry row (not just
  `css:*`/`anim:*`) and carries a 7-case `--self-test`.
- **Rule 22** (`inspector-scan/rules/22-placement-rule-surfaces.js` +
  `placement-rule-surfaces.json`, advisory) asserts every doc surface stating the placement rule
  states the CURRENT one. Re-run: `node plugins/sgs-blocks/scripts/inspector-scan/run.js`.
- **Library-wide reach:** `python plugins/sgs-blocks/scripts/placement-reach.py` (element-scoped vs
  tier-2 split; contested placements — the tie-break-instead-of-report defect — must be 0).
  `inspector-scan` rule 21 (`render-without-control`): re-run for the current count. ⚠ Count
  `status:"FLAGGED"` — `core/report.js` puts BASELINED entries in the `--json` array too, so a raw
  array length over-counts.
- **The composite-mirror rule (root `CLAUDE.md` §"Composite-mirror rule") has a fourth,
  measured exit condition: a block whose wrapper contributes ZERO live arrangement CSS
  to its own children may exit `SGS_Container_Wrapper` and render block-private — this is
  DIFFERENT from the KIND-based test and stands on its own measured evidence.**
  `sgs/nav-bar-menu` is such a block (block-private root; its item-gap control targets
  `.sgs-nav-bar-menu__bar`, not the wrapper root). `sgs/site-header-row`/`sgs/site-footer-row` take the
  OPPOSITE route — they KEEP the wrapper, because `responsive_model=>'object'`
  forces their InnerBlocks to be direct children of the element the wrapper's arrangement CSS
  targets (genuine containers, not specialised). On `sgs/physics-canvas`, box/width attrs are wired
  where they have a live consumer and absent where they would be inert or collide with a hardcoded
  selector in `style.css`.
- **`contentWidth` is a NAMED contract: it may exist only on a block that renders a genuine inner
  band.** Block-private composites (`quote`, `testimonial`, `notice-banner`, `team-member`,
  `product-faq`) emit `max-width` (from `maxWidth`) only — two competing widths under one name would
  promise a second layer that does not exist. `sgs/nav-bar-menu` carries no `maxWidth` (its parent
  row's own width control governs); `product-card` reads no `contentWidth` (it suppresses the band
  unconditionally via `wrap_inner => false`); `info-box` and `option-picker` use `width`.
  `sgs/hero` split does NOT need `contentWidth`: it suppresses the `__inner` div but bands the
  content with centred `padding-inline` on the grid, which is a real band and the right mechanism for
  a grid item. Gate: `inspector-scan` rule 23 (`23-content-width-needs-inner-band.js`, advisory).
- **The shared wrapper is generically responsive; the tier axis is universal, not per-block.** Full
  text (the two-axis model, the prop_map rows, the custom-property split, the measurement controls):
  **PART O** (Spec 35) §12 (THE RESPONSIVE WRAPPER FAMILY) — do not duplicate it here, it drifts.
  Summary: `inspector-scan` rule 26 is the detector; `WidthPanel`'s duplicate "… by viewport" controls
  are one shared tier mechanism; `sgs/gallery` uses the FR-37-16 object model (its Block Build Status
  row is in `plugins/sgs-blocks/CLAUDE.md`); `sgs/hero`'s responsive attrs are full triples. 14
  properties are tier-capable — 6 as data-driven `prop_map` rows (layout set); the remaining SEVEN
  (the `gridItem*` custom-property set plus `shadow`) are NOT yet tier-capable — do not treat them as
  shipped. There is no `contentBandBackground` attribute: a background always fills its container's
  max-width and is never clipped to the inner band.
- **`SgsColourPanel` placement.** `SgsColourPanel.js` carries a `group` prop (Styles-tab placement);
  the colour picker (`ColorPalette`/`ColorPicker`/`CircularOptionPicker`) is an SGS-owned fork at
  `src/components/colour-picker/` (Part H). Lesson: a design ruling plus a status doc calling it
  "shipped" is not evidence the code changed — verify against the component's own source.

## PART N — Role data layer + enforcement rules

**Why this Part exists.** Parts A–L specify the CONTROL SURFACE. This Part specifies the DATA
LAYER underneath it — the `role` on every `block_attributes` row, which says what the value IS.
The two are perpendicular and both are needed: `role` (what the value is) + `css_property`/element/
state/tier (how it is delivered). A control cannot be judged complete without both.

⛔ **NO CACHED COUNTS IN THIS PART.** Every number below names the command that regenerates it. Read the number, do not quote this file's memory of it.

```
cd plugins/sgs-blocks/scripts/content-role-detect && python fingerprint_content_roles.py
```

**The pool is not a fixed number — it re-fills as attributes land and drains as they're
routed by mechanism.** `ASSIGNABLE 0` is the health signal (every attribute in the pool IS reached by
a detector); the pool count itself is not. Never quote a pool figure from this section — run
`fingerprint_content_roles.py` (command above).

### N.1 — The mechanism map (what may LEGALLY seed each role)

Hand-assigning a role is BANNED. A role may be written only by the mechanism that owns it:

| Role | The ONLY legal route |
|---|---|
| `technical` | A Detector-1 VETO — D1 walked EVERY usage site and found none content-bearing. Qualifying verdicts are `NOT-content` **or `value-fragment`**; `value-fragment` has never been a disqualifier |
| `styling` | A non-NULL `css_property`, OR a wrapper-only consumer (TIER 2.4) |
| `color` | A proven paint site (D7 / TIER 3.15) |
| `enum-mode` | TIER 3.5 reading `enum_values`, which `/sgs-update` Stage 1 fills from block.json `enum` |
| `link-content` | TIER 3.45 reading `output_signature.link_template` with EXACTLY ONE `{value}` |
| `layout` and other families | `property_suffixes` provisioning, or D6's per-key native-support map |
| `image-alt` | `alt_companion_attr`, declared per row — never name-guessed |
| `icon-*` family | TIER 3.16 (correction pass), guarded `role NOT LIKE 'icon-%'` so it only ever
  fixes a wrongly-classified icon-source attr — it cannot invent a new icon-* row |
| `technical` (second route) | The token-sanitiser veto (D1) — a value passed through
  `sanitize_key()` / `sanitize_html_class()` / `wp_validate_redirect()` before use, which proves it
  is a machine token regardless of what a naive content read would suggest |
| `a11y-text` | D-series accessibility-text detection — routed alongside the other content roles,
  never hand-assigned |

**Detector inventory** (`plugins/sgs-blocks/scripts/content-role-detect/`). D1/D3 are trusted alone;
D2 reports and never assigns (66% precise); D8 reports a SCHEMA gap, never a role.

### N.2 — Enforcement rules

- **N-1. "Referenced" is not "used".** An attribute read into a variable that is then never used
  passes every consumption check that greps for the attribute NAME: a control can ship with an
  editor control and translatable copy while rendering NOTHING, and `check-dead-controls.js` still
  reports `OK — 0 net-new dead controls`. **CHECK 5 (dead assignment) covers this.** A control that
  needs code to mean anything is not done (Part B).
- **N-2. A built mechanism is not a reached one.** A `link-content` role, its extractor and its
  reader can all be built, tested and threaded while the whole chain is INERT because nothing assigns
  the role and the writer is never invoked (`/sgs-update` runs `extract-signatures --task-b-only`). A
  built-but-unreachable mechanism reads exactly like a missing one. Gate on the OBSERVED end state,
  never on the code existing.
- **N-3. A detector's negative result describes the detector.** A detector that will not cross a
  function boundary (D4's own comment names it; D7 is single-file; D1's symbol table is file-scoped)
  cannot report evidence that lives across one. Before recording "no evidence", establish whether the
  evidence is merely unreachable.
- **N-4. Declare the expected population BEFORE the run.** A number below expectation is a claim
  requiring evidence. A number ABOVE it needs per-row justification, not a silent accept.
- **N-5. A zero from a search you wrote requires a positive control.** A probe with a broken regex
  returns "0 findings" and is wholly vacuous. It is trustworthy only once proven to CATCH a
  known-bad row.
- **N-6. Negative controls should be REAL ROWS, not fixtures, wherever one exists.** The fragment
  rule's controls are `sgs/whatsapp-cta.phoneNumber` and `sgs/counter.prefix`; the colour-upgrade
  sweep's is `gridItemBorder`. A real row cannot drift away from the thing it guards.
- **N-7. A guard whose safety is INCIDENTAL is not a guard.** `gridItemBorder` survives D7 only
  because D7 cannot reach the file it is painted in — its documented "it is a shorthand" reasoning
  has never actually been exercised. Prefer a shape where the guard holds BY CONSTRUCTION.
- **N-8. The visual-diff gate applies to a block.json `enum` declaration.** Adding an `enum` can
  change render: WP coerces an out-of-enum stored value back to the default. Never fabricate
  `first_paint_capture_passed` to clear it.
- **N-9. A gate can be DATE-keyed instead of CHANGE-keyed.** The visual-diff gate is satisfied by
  `reports/visual-diff/<block>-<DATE>.md` carrying `verdict: PASS`. A concurrent track's same-day
  report for a DIFFERENT change to the same block would satisfy it for yours too. Evidence must
  bind to the diff it is meant to certify, not merely to the block and the date.
- **N-10. A dead ASSIGNMENT is dead CODE, not automatically a dead CONTROL.** CHECK 5 (N-1) findings
  split into unused local variables whose FEATURE STILL WORKS (the shared helper reads the raw
  `$attributes` directly, bypassing the dead local), abandoned attrs, and genuine dead controls. A
  severity split is owed before any finding is treated as a defect count.
- **N-11. A conservative gate refusing a provably-safe change is CORRECT, not a blocker to work
  around.** `check-markup-neutral.py` refuses ANY deletion of a non-comment line, so even a
  provably-dead variable deletion still needs real visual verification before it lands. Do not
  weaken a gate to land your own commit faster.

### N.3 — Enforcement status

**Governed by the CONTROL-TYPE CONTRACT (**PART O** (Spec 35)).** Every item of the
DONE checklist is ABSORBED into a control-type contract or CARRIED into that document's §CARRIED
OBLIGATIONS.

The bar for "enforced" is `STOP-CATALOGUE.md` §E6 (10 points) — **"has a script" is not the bar**,
and neither is "the gate reads green": a gate keyed to a component NAME has a blind spot by
construction, which is why the contract requires each rule to enumerate its banned lookalikes.
⛔ No enforcement is built for a rule scoped against `block_capabilities` or icon `role` until
those two Tier 0 columns are corrected.

---

## PART O — THE CONTROL-TYPE CONTRACT: enforcement layers, carried obligations and cross-cutting rules

The contract itself (THE PLACEMENT RULE, THE ELEMENT MANIFEST, the scoping axes and §1 COLOUR to §14 BORDER) is Spec 35 PART O. This part holds the enforcement layers that read it (O.15, O.16), the obligations no single control type owns, and the two cross-cutting sections.

### O.15 — The three layers, and the two traps between them

Enforcing this contract is not one job. It is **three layers**, and detector bugs sit at a layer
boundary rather than inside one:

| Layer | Answers | Lives in |
|---|---|---|
| **1. Contract** | *what shape* must a control have? | `scripts/consistency/golden-controls.json` — 14 control types |
| **2. Corpus + attribution** | *which files* hold controls, *which blocks* own each finding | `inspector-scan/core/components.js` `resolveComponentFiles()` |
| **3. Enforcer** | reads (1) over (2) | one rule/survey per concern; shared helpers in `core/golden.js` |

⛔ **A rule that hardcodes layer 1 is not generic, however generic its docblock claims to be.**
`survey-golden-conformance.js`'s native-UI axis must not check `supports.color` for EVERY control
type: that reports one colour answer under thirteen wrong headings. Axes read
the support key from each type's own `nativeUi.detectVia`. Only 4 declare one: colour →
`supports.color`, `length-unit` and `box-4value` → `supports.spacing`, `typography` →
`supports.typography`.

⛔ **AXIS SCOPE IS NOT UNIFORM.** `canonical` adoption needs the one-hop view THROUGH shared
components (a block reaches `DesignTokenPicker` via `SgsColourPanel`). `bannedLookalikes` needs
that view **minus** the canonical components, because the canonical row component legitimately
wraps the raw primitive — `<ColorPalette>` lives inside `DesignTokenPicker.js` and
`GradientCapableColourControl.js`. Flagging it there flags the *conformant* shape. **Every axis added must be asked which scope it wants, and
pinned by a fixture in both directions.**

⛔ **Resolution depth and that exclusion must move TOGETHER.** One hop under-reports
shared components. But `ColorPalette` is banned and most blocks that reach it do so legitimately via
the canonical wrappers, so raising depth alone trades under-reporting for false positives. Reproduce before changing either:
`python scripts/surveys/compare-reach-depth.py .`

⚠ **A tag scan cannot see a runtime-selected component.** `SgsColourPanel` picks its row via
`const Control = row.gradientCapable ? A : B`, so neither name appears as a literal JSX tag and
`GradientCapableColourControl` reads as dead code while being live.

### O.16 — Qualification: *should* this block have the control?

A conformance census can only report a **missing** control if it knows the block should have one.
⛔ **`roster.json` `surfaces.*` cannot answer this.** `build-roster.py` computes
`colour = "color" in supports or attr_hit("colour","color")` — DESCRIPTIVE, true exactly when the
block ALREADY has colour. Used as a scope predicate it is **self-fulfilling**: it excludes exactly
the blocks that are missing a panel.

Each control type therefore declares its own `qualifiesWhen` predicate in `golden-controls.json`.
**The engine is generic; the evidence is per family** — colour qualifies on painted surfaces,
typography on rendered text, spacing on a box element, link on an `<a>` or URL attribute. Adding a
control type is a predicate, not a new check.

Verdicts split **MISSING** (qualifies, has none — real
work) versus **NOT-APPLICABLE** (the control cannot apply — never a backlog item).

⚠ **Qualifying does not always mean the control belongs on THIS block.** Every `sgs/form-field-*`
declares its elements and paints none of them; `sgs/form` paints them all. They qualify **collectively**, and the control's home is the
ancestor with children inheriting — the group-default pattern `sgs/multi-button` proves.
The verdict carries `home: 'ancestor'` so this is not lost.

⚠ **Feature parity is a resolver, not a qualifier.** A `replaces` entry says which core block is
superseded, NOT that the core block has the family. `block_supports` holds supports for core
blocks, so it is evaluable: `core/site-logo`'s colour is `{background:false, text:false,
gradients:null}` — no colour UI — which is why `sgs/responsive-logo` is NOT-APPLICABLE rather than
missing a panel it should never have.

Reach is derived, not hardcoded: a block is in an extension's surface when it opts IN via
`supports.sgs.enabledExtensions` (for `hover` and `blockLink`; other extensions use the
`hideExtensions` denylist). `noOptOutExtensions` is `[]`.

**The categories map to real axes; three clarifications:**
- **"Section" is three distinct axes**, not one — `tier='class-section'`, `container_kind='section'`,
  `composition_role='section-root'`. Each contract must say which it means.
- **"Blocks with text" routes via `role`, not typography supports.** They are
  *different sets* — `sgs/decorative-image` holds client-editable alt/caption
  text with no typography support; `sgs/container` and `sgs/icon` have the support and no text.
- **Dynamic-vs-static is useless** — every SGS block is dynamic.

#### ⛔ DB columns that are NOT trustworthy as gate inputs

> `inspector_control_type` and `box_family` are usable as gate inputs — ⚠ **but `inspector_control_type`
> is largely NULL** (`SELECT COUNT(*), SUM(inspector_control_type IS NULL) FROM block_attributes WHERE
> block_slug LIKE 'sgs/%'` — scope every figure to SGS blocks; the unscoped all-blocks figure is not the
> one that governs). A rule may TRUST a non-NULL value; it must NOT read NULL as "no control".
> `_KNOWN_CONTROLS` includes this framework's own single-attribute components. A **repeater guard**
> applies: a control inside an iteration over the attribute's OWN value is a per-item control and must
> not be credited to the array attr — otherwise `sgs/pricing-table::plans` would read `SgsLinkControl`.
> The four clauses depending on `inspector_control_type` (BOOLEAN §1/§6, FREE-TEXT §2/§6) may rely on
> it — but only for attrs whose control is a single named component. **Residual:
> `site-{header,footer}-row` `padding`/`margin` read NULL**, being edited through
> `ContainerWrapperControls`, a multi-attribute façade that names no single attr. A multi-attribute
> façade cannot be recorded in a single-value column; **that is a contract question, not a data bug**,
> and no rule may treat those NULLs as "no control". The analysis below names the defect CLASS every
> rule must avoid: **3 and 4 remain OPEN.**

1. **`inspector_control_type`** — derived from edit.js by `extract-signatures.py`, with `_KNOWN_CONTROLS`
   extended to this framework's own components (`SgsLinkControl`, `URLInput`, `IconPicker`,
   `ShadowControl`, `TypographyControls`, `ResponsiveBoxControl`, `ResponsiveOverride`). The failure
   class is matching by component NAME: an unrecognised tag never disagrees with the stored value, so
   stale values persist forever. Measure on the live tree — `.claude/worktrees/` may hold stale
   copies of the script.
2. **`box_family`** — declared via `supports.sgs.boxFamilies` in block.json (read by
   `_collect_boxfamily_overrides()`); a NULL on an object-typed attr with a live BoxControl means the
   block did not declare it — the fix is a block.json edit, not a script change. Note:
   `mega-panel.borderRadius` is correctly NULL (a scalar radius, not an object box-family attr) —
   check `attr_type` in the DB rather than compiling the list from `edit.js`.
3. **`role LIKE 'icon-%'`** — tags far fewer blocks than use `IconPicker`. ⚠ The `icon-*` family is the
   converter's SOURCE-disambiguation key, not a "uses IconPicker" tag, so the promotion pass is
   self-limiting and never admits a new member — widening it is a design choice, not a backfill.
   **OPEN.**
4. **`block_capabilities`** — TWO different problems under one table name:
   - **The 3 "lift" capabilities** (`scalar-content-lift`, `scalar-styling-lift`,
     `array-content-lift`) are class (d) — read declaratively from `supports.sgs.*` in block.json,
     written idempotently, mechanism healthy. `sgs/testimonial-slider` and `sgs/card-grid` (collection mode)
     have real content arrays and are genuine omissions. ⛔ **`sgs/post-grid` is NOT one** — its
     arrays (`categories`, `tags`) are config filters, its content comes from `WP_Query`, and the
     capability's own docstring excludes exactly this case. Adding it would be actively wrong.
     ⚠ `sgs/gallery` — verify `mediaItems` is authored content, not config, BEFORE declaring it.
   - **The other capability values** (`grid-layout`, `carousel`, `logo-strip`, …) have **no
     writer on the live path at all.** Their sole writer is a hardcoded `CAPABILITY_RULES` dict in
     `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` — outside this repo, dead on the live
     path. That is why `sgs/post-grid` has zero capability rows of ANY kind. This is class (b) plus
     a second R-31-1 breach. **`isCollectionKind()` therefore cannot be delivered by a backfill** —
     it needs a declarative block.json source designed and ported into Stage 1.
   - ⚠ Sibling: `block_selectors` has the identical disease and is only PARTIALLY ported —
     two writers exist, last-one-wins. Running `populate-db.py` to patch capabilities would silently
     clobber selectors. Treat retiring that script as ONE job.
   - ⚠ `PARENT_CHILD` in the same file is a third hardcoded dict, untraced.

Regenerate before building any gate on them.

---

### CARRIED OBLIGATIONS — the conditions no single control type owns

A control-type contract answers *"which component, which props, which tab"*. It cannot answer *"is
this panel grouped by block part"* or *"is this animation reduced-motion gated"* — those bind across
every type or across none. Two are accessibility requirements and one is the only written record of a
locked standard.

Each carries the same eight-field discipline where it can, and states its enforcement honestly.

#### CO-17. Reduced-motion gate on all animation *(WCAG 2.3.3 AA)*
Every animation and transition is `prefers-reduced-motion`-gated, from day one, never bolted on.
**Enforced by** `inspector-scan/rules/17-reduced-motion-gate.js` — **GATE mode**.
⚠ **This is a WCAG conformance requirement, not a preference.** It binds on §13's `AnimationControl`,
on `extensions/animation.js`, and on `fx.js`. Losing it would silently drop a live accessibility gate.

#### CO-11. The 768/1024 device-tier lock
Responsive props expose the locked 768/1024 tiers via `ResponsiveControl`; **no bespoke third
breakpoint.** ⚠ These values exist only as per-file constants in `view.js` files — there is no shared
constant, no schema, no gate. **The written rule is the sole thing holding the standard.** Binds with §12 field 3
and with the device-tier-vs-visual-breakpoint distinction (a design-driven `min-width:600px` is
legitimate and must NOT be swept). **Enforced by** UNENFORCED.

#### CO-2. Element-first panels

Composite blocks group inspector panels by block PART, not by property type — **derived from
`supports.sgs.elements`, never hand-sorted.** This is THE PLACEMENT RULE (Spec 35 PART O); CO-2 adds only the
two clauses that rule leaves implicit:

1. **A panel holds its element's WHOLE surface** — content (`contentAttrs`), then style clusters in
   declared `clusters` order, then its states inline beside the values they modify.
2. **A "Hover" panel is a banned lookalike** (§6 field 3), not a placement choice. So is splitting one
   element's controls across two panels.

CO-2 binds *what goes together*; **CO-28** binds *sequence*. Separate obligations; neither implies
the other.

**Enforced by** `inspector-scan/rules/41-co2-element-grouping-order.js` (advisory).

#### CO-28. Consistent ORDER of panels, clusters and controls
The same thing sits in the same place in every block. Three levels, all binding:
1. **Panel / tab order** — the sequence of inspector panels follows one canonical order across every
   block that has those panels. A client who learns one block has learned the shelf layout of all of
   them.
2. **Cluster order within a panel** — related controls form the same cluster in the same position
   (e.g. colour before spacing before border, base value immediately before its state value per
   CO-2's sibling rule in §6 field 4).
3. **Control order within a cluster** — a fixed sequence per control TYPE, not per author.

CO-28 promotes an existing competitor-research finding (Cross-cutting A's panel-order convergence:
Stackable via per-block convention, GenerateBlocks centralising only the Styles tab) to a binding
obligation with enforcement.

**Distinct from CO-2, which it sits next to.** CO-2 binds *grouping* — "panels grouped by block PART,
not by property type". It is silent on sequence: a block can satisfy CO-2 completely and still present
its parts in a different order from every other block. Grouping says what goes together; this says
where it goes.

**Why it belongs to the client, not to tidiness.** Spec 35 exists because Bean's clients are
tech-illiterate and live in the block editor. Inconsistent order costs them the one thing that makes
an unfamiliar block usable — transfer of learning from the block they already know. It is the same
class of harm as a missing control (the setting is reachable, but not *findable*), which is why it is
an obligation and not a style note.

##### THE ORDER CONVENTION

> **This is a separate question from THE PLACEMENT RULE (Spec 35 PART O).** THE PLACEMENT RULE decides
> *which panel a control belongs to* (TIER 1 element, TIER 2 property-family). This convention
> decides *what order the panels/controls that placement produces appear in*. Neither implies the
> other, and this section does not restate the placement rule — read it in Spec 35 PART O if you need it.

1. **Controls and panels follow the DOM order of the elements they configure** — top to bottom;
   where two elements sit at the same level, left to right.
2. **At the root level, follow WordPress-native ordering** — Styles, then Colour, then Typography.
3. **Two pinned positions, independent of everything else on the page:** *Advanced* is ALWAYS last
   in Settings. *Visibility conditions* is ALWAYS second-from-last.

**Enforcement.** Placement must be worked before order can be standardised: sorting an unrouted pile
of panels is not decidable until every block has split into tabs (`inspector-scan` rule `01-tab-group`
measures that backlog). Rules 1 and 2 are checked per block, against that block's OWN manifest, by
`inspector-scan/rules/41-co2-element-grouping-order.js` (advisory; axis C = DOM-order-vs-declared-order,
axis D = root `<SgsColourPanel>` before `<TypographyControls>`). Full JSX DOM-order inference is not
reliably static-analysable in general (regex approaches to one ordering question returned 0 and 471 in
opposite directions from the same file), which is why the rule reads the manifest and AST rather than
inferring order from text. No rule checks the cross-block canonical sequence itself.

**Rule 3 is different: it is a structural guarantee two specific names already hold for every block**,
via one shared mechanism (`src/blocks/extensions/conditional-visibility.js`, registered last in
`extensions/index.js`, so its "Visibility conditions" panel lands immediately above core's own
structurally-last `InspectorAdvancedControls` — "Advanced" — slot). It can only be broken by a
per-block `edit.js` authoring its own panel that steals one of the two pinned names. **Enforced by**
`inspector-scan/rules/35-pinned-panel-position.js` (advisory): it asserts only that no block-authored
panel carries the literal title "Advanced" or "Visibility conditions" outside the shared mechanism
that owns those positions.

**Default-open discipline** — only the first panel per tab defaults open. Same findability harm as
order.

#### CO-3. ToolsPanel on dense panels
Any panel with ~6+ controls uses `ToolsPanel`/`ToolsPanelItem` progressive disclosure (1–3
`isShownByDefault`, `resetAll`). **Enforced by** `inspector-scan/rules/03-dense-panel-candidate.js`,
ADVISORY. ⚠ A remediation count is a backlog, not a rule — this obligation is what the backlog is a backlog
*of*.

#### CO-9. Full image controls
Image-rendering blocks expose size dropdown (attachment `sizes`) + aspect-ratio + object-fit +
`FocalPointPicker` where relevant. **Enforced by** `audit-feature-parity.py` (vs `core/image`).
Binds with §7 MEDIA and gives §13's lone `FocalPointPicker` its home.

#### CO-10. Multi-item data is array-shaped
Any repeated/multi-item media or content uses an array attr with `gallery`/`multiple="add"`
(`MediaGalleryPicker`) or a repeater — never a scalar attr added one at a time. **Enforced by**
`audit-feature-parity.py`. ⚠ **Control question:** the control for an array attr is the REPEATER UI, never the per-item control
inside it — a rule reading `inspector_control_type` for an array attr is asking the wrong question.

#### CO-13. hideExtensions is a per-BLOCK obligation
Irrelevant universal-extension panels are hidden per block via `supports.sgs.hideExtensions`
(declarative). ⚠ The **per-block obligation** — not the mechanism alone — is the part that makes it anyone's job. **Enforced by** UNENFORCED.

#### CO-15. No duplicated native-supports panel
No bespoke panel re-implements a control a native `supports` panel already provides. This is the
inspector-UX form of **R-31-9**.

⛔ **Enforced by: nothing, for the general rule.** `check-duplicate-controls.js` is wired into
`prebuild`, but it does NOT enforce this condition — it targets a different bug class: (1) universal
`sgsHover*` panel vs a block's own private `*Hover` attrs, (2) two JSX controls in one `edit.js`
writing the same attr, (3) a composite's own control duplicating a child InnerBlocks control. Read
its own docblock — nowhere does it compare an SGS bespoke panel against a native WordPress
`supports` panel (colour/typography/spacing/border/etc). Do not cite it as this condition's gate.
See Part L's own entry for what to do about it (the general rule is not gateable — Part G's
verdict table shows most "duplicates" are the deliberate, correct choice; only the two named
ADOPT cases — `aspectRatio`, `duotone` — are a well-specified subset, and even that is a
migration-completion problem for the already-enumerated blocks, not a lint-gate problem — see
`.claude/reports/2026-09-04-c5-native-supports-duplicate-panel-scoping.md`).

This rule is NOT absorbed into Cross-cutting B — that governs a different question (universal-extension
opt-out fit). CO-15 stands on its own.

#### CO-18. Decorative-image toggle + ARIA-label
A decorative-image toggle (**empty alt + `aria-hidden`**) and a general **ARIA-label** control are
present wherever the block's rendered markup needs them. *(Spec 35 C, E6.)* **Enforced by** `inspector-scan/rules/18-decorative-image-aria.js`, ADVISORY (`openBacklog` in
`plugins/sgs-blocks/scripts/inspector-scan/rules.json`).
⛔ **This is NOT covered by §7 MEDIA field 2 or CO-19.** §7 field 2 says only "alt text", and CO-19
governs the accessibility of the **editor control UI itself** (keyboard, contrast,
`aria-describedby`) — a different target from the **rendered output's**
accessibility, which is what this condition is about. ⚠ Do not re-merge these two: an accessible
control that writes an inaccessible output satisfies CO-19 and fails CO-18.

#### CO-16. Native over hand-rolled
Native `supports` are used over hand-rolled equivalents for aspect-ratio / duotone / sticky /
lightbox — **check native BEFORE building any of these.** Points at Part G's verdict table.
**Enforced by** feature-parity (`audit-feature-parity.py`). ⚠ This condition **prompts §G's open
question** (retire `sgsCustomCss` for WP 7.0 native per-block CSS) — keep it; it is the standing
instruction that raises that question at all.

#### CO-19. Accessibility pass, E1–E4
Keyboard-operable · 4.5:1 contrast on the block's own control UI · `help` linked via
`aria-describedby` · every control has an accessible name. **Enforced by** manual pass —
**informational, never a gate** (`a11y-validation-feedback-informational-not-gate`). ⚠ The missing
`id` on `DesignTokenPicker`, `SgsLinkControl`, `IconPicker`, `ShadowControl`, `ResponsiveControl` and
`ResponsiveOverride` is an E1–E4 failure, which is why those clauses appear in six contracts in Spec 35 PART O.

#### CO-20. Client patterns use templateLock
⛔ **`templateLock:"contentOnly"` is per-client opt-in — "never framework patterns".** The obligation:
a **client-facing** pattern using a block sets `templateLock:"contentOnly"`. **Enforced by** pattern
audit; `rules.json` keeps rule 20 ADVISORY.

#### CO-21. No Part-F anti-patterns
None of the Spec 35A Part F fail-list is present: essential control sidebar-only · incomplete option
sets · no reset · colour-only focus · bespoke Custom-CSS field · raw-px spacing. **Enforced by** the
PART O contracts (Spec 35), collectively.

#### T1 / T2 / T3 — the threaded standards
⚠ **`audit-feature-parity.py` is a LIVE WIRED GATE; these three standards are its governing document.**
- **T1. Feature-parity** — the block exposes AT LEAST the full capability of the core block(s) it
  replaces (`block-replacements.json`), unless a named exception in `feature-parity-exceptions.json`
  is mapped. *(memory `sgs-block-feature-parity-with-replaced-core`.)*
- **T2. Shrink-to-fit** — intrinsically responsive: root/section min-content ≤ resolved container
  width at every tier, 0 forced horizontal overflow, **measured with the UNIT-C `min-width:0`
  backstop DISABLED** (proves intrinsic, not backstop-rescued). *(memory
  `blocks-must-shrink-to-fit-container`.)*
- **T3. Media-controls** — for media blocks, the control SET is decided against a competitor
  comparison (Kadence / Spectra / GenerateBlocks + core) and every candidate is built or mapped.

#### Rule-authoring discipline 22 / 24 / 25 / 26 *(these govern how every rule above is WRITTEN)*
- **22. Silence is not rejection — and never resolve a conflict by POSITION.** A detector's absence
  from a supporting list and its presence-with-a-negative-verdict are different facts. Whenever a script merges evidence from more than one source,
 **the tie-break must be STATED in the script's own logic or comments** — never left to whatever the
  data structure's default ordering produces. Correctness by accident of iteration order breaks the
  moment input order changes.
- **24. A report's named artefact must exist on disk** — mechanically checkable, not asserted.
- **25. Name the CONSUMER before measuring a value, then prove it by reading that consumer.**
  E.g. `derived_selector` is a DRAFT-side matcher: measured against what a block RENDERS it reports
  phantoms. Only reading the consuming code proves the consumer.
- **26. A zero from a search you wrote requires a positive control.** Find something you KNOW is
  present first. A zero is often a broken search, not an empty world.

---

### Cross-cutting A — PLACEMENT

WordPress has **16 real group keys** (verified against Gutenberg source, not docs — this mapping is
not on developer.wordpress.org). `settings` is a hard alias of `default`. `advanced` renders as a
panel *inside* Settings, not its own tab. `content` and `list` map to their own tabs.

The definitive tab assignment is **THE PLACEMENT RULE** in Spec 35 PART O: TIER 1
element scope decides the panel first. Controls scoping to no element are NOT all "Tab field"
territory: TIER 2 property-family (`cluster-member-sets.json`) is authoritative for any such
control that styles something. A contract's `Tab` field is authoritative only for a control that
styles **nothing** — no CSS property behind it — and there only for choosing *which group inside
the pinned-first `Settings` panel* it lands in.

**The highest-leverage placement lever is the universal extension files.** They inject panels into
every block, so an extension's `group` prop corrects (or breaks) placement on every block at once:

| File | Group | Verdict |
|---|---|---|
| `animation.js` | `styles` | correct — motion is Styles |
| `hover-effects.js` | `styles` (Hover + Click Effects); bare (Block Link) | Block Link bare is defensible |
| `image-controls.js` | `styles` | correct — sizing/position is Styles |
| `conditional-visibility.js` | bare | defensible (utility); owns the pinned "Visibility conditions" position |
| `fx.js` | `styles` | correct |
| `parallax.js` | `styles` | correct — background parallax and element parallax in one tab |
| `custom-css.js` / `block-defaults.js` | `InspectorAdvancedControls` | correct |

Check any change to an extension's `group` prop against every block, since it moves all of them.

**Default-open discipline** — only the first panel per tab defaults open.

**Panel order** — three competitors converged on ordering being deliberate: Stackable achieves it by
**convention repeated per block, not a shared assembler**; GenerateBlocks centralises the **Styles tab
only** — Advanced stays per-block even there.

**On `<SgsInspectorControls>`** — proposal only, Rule 7 design gate required. Honest assessment: it
would dissolve the per-block placement backlog by construction, but it **does not reach the extension
files**, which are HOCs, not components a block author calls — and that is the bigger leverage point.
Revisit the assembler only if placement drifts again.

### Cross-cutting B — UNIVERSAL EXTENSION FIT

`noOptOutExtensions` is `[]`; animation has an opt-out, and the extensions without one are
self-classified utilities.

⛔ **No opt-out for these extensions:**
- **`customCss`** — `sgsCustomCss` is load-bearing for clone fidelity (Spec 31 FR-31-5.2
  residual-band passthrough), carries a deliberate framework-wide exemption in Spec 35A Part F, and
  its own file header says "never remove it". The utility defence protects the attribute AND the
  panel (`check-universal-fit.js` argues explicitly about the PANEL — "an unused panel is inert").
  Hiding the control makes a converter-written `ResidualBand` invisible and uneditable to the client.
  **See §G for the genuine alternative** — adopt WP 7.0's native per-block CSS and delete the
  extension, rather than hiding ours.
- **`responsiveVisibility`** — it owns **no panel at all**; its toggles render from
  `conditional-visibility.js`. An opt-out would remove zero sidebar rows. Its three independent
  per-device toggles are KEPT, no reshape.
- **`conditionalVisibility`** keeps none — kept deliberately.

**Why `sgs/gallery` is never flagged** — `isInappropriateFitKind()` is exactly:
```js
return block.category === 'sgs-forms' && block.surfaces.styling === false;
```
Gallery is `sgs-content` with `styling: true`. It fails both, always.

**Root cause: the heuristic asks a product-taxonomy question when the real one is architectural.**
Wrapping a gallery in one link is broken because HTML forbids nesting interactive elements — the
gallery's own images are interactive. Nothing to do with styling or category.

A capability-name rule (`capability IN ('array-content-lift','carousel','grid-layout','logo-strip')
OR attr_type='array' AND role='content'`) was rejected: three of those four capabilities have no
writer/reader, and the array-attr fallback leg misses `sgs/gallery` (its `mediaItems` carries no
role) — the very block this section is about. The rule is instead
`isCollectionKind(block) = block_capabilities row (slug,'collection') ← supports.sgs.collection` in
the block's own block.json; it fires for Block Link specifically.

The hardcoded slug denylist lives in `scripts/check-universal-fit.js` (the audit gate), not in
`animation.js`, which holds only `CORE_ANIMATION_BLOCKS`, a small allow-list (the per-block opt-out is
declarative `hideExtensions`). The R-31-1 concern stands against the gate's denylist, alongside the
unreviewed allow-list.
