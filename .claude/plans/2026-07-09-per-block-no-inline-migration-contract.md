---
doc_type: reference
title: LOCKED per-block no-inline migration contract (rollout — every block builds against this verbatim)
status: ACTIVE
created: 2026-07-09
references:
  - .claude/plans/2026-07-09-box-object-interface-contract.md
  - .claude/plans/2026-07-09-no-inline-styling-design-gate.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
---

# LOCKED per-block no-inline migration contract

Every block in the universal rollout is migrated to THIS bar, in ONE pass, verified
LANDED. Do not deviate; if a block can't meet a clause, STOP and report to the
orchestrator. Bean-set bar (2026-07-09): **100% no-inline + 100% box-group + Spec 31/32.**

## A. 100% NO-INLINE (the primary deliverable)
The rendered block subtree — the block root AND every descendant — must carry ZERO
inline CSS **property declarations**. A `--custom-property: value` VALUE on an element
is allowed (it is a value, not a declaration); a real property declaration
(`padding:`, `color:`, `background:`, `border-*:`, `box-shadow:`, `width:`,
`font-*:`, `text-align:` …) is NOT.
- Flip EVERY WP styling support the block declares (`spacing` / `color` /
  `__experimentalBorder` / `typography` / `shadow`) to `__experimentalSkipSerialization:
  true` so WordPress's `get_block_wrapper_attributes()` stops auto-inlining it.
- In render.php, read the value from `$attributes['style'][...]` (still populated by WP)
  and emit it into the block's OWN scoped `#{uid}` `<style>` via the stable core API
  `wp_style_engine_get_styles($style, ['selector' => "#{$uid}"])['css']` — exactly how WP
  core outputs `layout` support. Responsive tiers → scoped `@media` rules on the same
  `#{uid}` selector. Custom SGS attrs (colours-as-vars, box objects, shadows, width) also
  emit scoped, never inline.
- The wrapper element must end with NO `style="…property:…"`. (A `style="--x:y"` var-only
  is fine.)

## B. 100% BOX-GROUP CONVERSION (all qualifying families → objects, INCLUDING tiers)
- 4-side families (`padding`, `margin`, `borderWidth`, + per-area `contentPadding` /
  `mediaPadding` / `imagePadding` / `contentBandPadding` / `imageBorderWidth`) → ONE object
  `{top,right,bottom,left}` per tier. 4-corner (`borderRadius`, `imageBorderRadius`) →
  `{topLeft,topRight,bottomLeft,bottomRight}` per tier.
- **Base** root padding/margin/border-radius → the WP-native object (`style.spacing.padding`,
  `style.spacing.margin`, `style.border.radius`) — already object-shaped.
- **Tiers** → SGS object attrs `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`/
  `borderRadiusTablet`/`borderRadiusMobile` (each `{"type":"object","default":{}}`).
- **borderWidth** (custom, no WP width support) → SGS object `borderWidth` (+ tiers if the
  block has them). Per-area families → SGS object attrs + tiers.
- REMOVE every flat per-side/per-corner attr (`paddingTopTablet`, `borderRadiusTL`,
  `borderWidthTop`, …) AND every `{family}Unit` companion (the unit is carried in each
  value string, e.g. `"20px"`).
- The `box_family` DB seed for each new object attr is added centrally in
  `sgs-update-v2.py` by the orchestrator — do NOT edit that file.

## B2. DEVICE-TIER BREAKPOINTS ONLY — no stray breakpoints at block level (Bean-locked 2026-07-09)
- A block's render emits EXACTLY TWO responsive tiers and no others: **Tablet =
  `@media (max-width:1023px)`, Mobile = `@media (max-width:767px)`** (the 768/1024
  standard — `~/.claude/rules/visual-standards.md`). These are the `*Tablet`/`*Mobile`
  box-object tier attrs (as button + container already do). Nothing else.
- **A block NEVER hardcodes any other/custom breakpoint** (`600`/`640`/`781`/`1280`/…).
  Custom breakpoints do not exist "at a block level" — they are authored PURELY through
  the block's **SGS Additional CSS attribute (`sgsCustomCss`)** (Spec 31 FR-31-5.2). So a
  block's render.php contains only the two device-tier `@media` rules; if you find yourself
  wanting to emit any other breakpoint in block code, STOP — it belongs in `sgsCustomCss`.
- (A stray `599`/`1024` for a DEVICE tier is a bug — button carried a stray `1024`→`1023`;
  container was already correct.)

## B3. NO USELESS WRAPPER DIV — semantic element is the block root (Bean-locked 2026-07-09)
- A block that renders a SINGLE semantic element (heading→`<h2>`, text→`<p>`, button→`<a>`,
  quote→`<blockquote>`, label→`<span>`, media→`<img>`/`<figure>`) must render THAT element
  as the block root — NO wrapper `<div>` around it. All controls, `get_block_wrapper_attributes()`
  output, and the scoped `<style>` go ON the semantic element (the button D288 pattern:
  `<style>#uid…</style><a class="… uid">`). Delete the pointless nesting layer.
- A GENUINE COMPOSITE (wraps multiple children / is a layout box — container, hero,
  card-grid, accordion, cta-section, …) KEEPS its wrapper. Do NOT remove a load-bearing
  wrapper. If unsure whether a wrapper is useless, STOP and ask.
- **Not purely mechanical — VERIFY per block (recognition-critical):** these single-element
  blocks are atomic cloning targets (`p→sgs/text`, `h2→sgs/heading`). Collapsing the wrapper
  changes the rendered DOM the pipeline's `block_selectors`/`derived_selector` lift onto, so
  after removal RE-CLONE and confirm (a) recognition still fires, (b) the block's own CSS +
  the converter's typography/box lift still land on the now-root element, (c) a11y intact —
  heading LEVEL preserved and the anchor/ToC `id` still emitted. Because the anchor uses the
  element `id`, the scoped uid on these blocks must be a **class** (`.uid`, container-style),
  never an `id`, to avoid colliding with the anchor.

## C. SPEC 31 / 32 COMPLIANCE
- Object shapes exactly per Spec 32 §6.1(a). Categorisation is the DB `box_family` column
  (Spec 31 §4 / FR-31-22), never a name regex. Keep-scalar families (single-side margins,
  `shapeDivider*`) stay scalar per Spec 32 §6.1(c) — do NOT objectify them.
- Every merged family keeps a client-facing editor **BoxControl** (Spec 32 (d); CLAUDE.md
  "every property must have an inspector control"). No dead controls (HC2).
- Per-instance override = a CSS custom-property VALUE, never an inline declaration
  (Spec 32 §6.1(e)). The ONLY permitted non-attr output is a genuinely non-device-tier
  breakpoint routed to `sgsCustomCss` (Spec 31 FR-31-5.2, see §B2).
- **Do NOT bump the block version and do NOT add deprecations** (Bean-locked 2026-07-09:
  pre-production, version management + deprecations are a waste of time/tokens — this
  OVERRIDES STOP-57's "bump version on CSS change" for the whole pre-launch phase).

## D. SECURITY (mandatory, mirrors the button fix)
- Any free-text attr concatenated into the scoped CSS (`borderStyle`, `fontStyle`,
  `textTransform`, `textDecoration`, `objectFit`, …) MUST pass a CSS-keyword sanitiser
  `preg_replace('/[^a-zA-Z-]/', '', $v)` before concatenation. Length/number values pass
  `preg_replace('/[^A-Za-z0-9.%]/', '', $v)`.
- Emit the final `<style>` blob via `wp_strip_all_tags($css)` (NOT `esc_html` — it breaks
  `>` combinators), matching the SGS_Container_Wrapper reference.

## E. EDITOR (edit.js)
- Import `ResponsiveBoxControl` / `ResponsiveBorderRadiusControl` from `../../components`.
  Bind each box family: base → `style.spacing.*` / `style.border.radius`, tiers → the object
  attrs, via the container/button `onChange(tier,next)` split. Every non-box support keeps a
  friendly control that writes to attrs/`style`, never inline.
- The editor canvas preview must match the frontend scoped output (read the objects into the
  preview style).

## E2. DRAIN THE BLOCK'S F3 HARDCODE (Bean-locked 2026-07-09 — "F3 hardcoding does not need to exist")
- If the block has an entry in `scripts/hardcoded-render-defaults-baseline.json` (the "accepted"
  F3 debt — NONE of them are genuinely acceptable; all carry the same boilerplate "pre-existing
  debt, fix separately"), FIX it as part of this block's migration: replace the hardcoded literal
  in style.css/render.php with the block's declared attr read (or `var(--sgs-x, <default>)`), then
  DELETE the block's baseline entry. A migrated block must leave zero F3 baseline rows. (D228: a
  hardcoded default for a property the block exposes a control for is a cheat — the control is dead
  by override.) Current F3 blocks: content-collection, form, hero, mega-menu, mobile-nav,
  pricing-table, product-card.

## F. REFERENCE IMPLS (copy these — proven LANDED)
- `sgs/button` (9f281337) — block-private render, ID selector `#sgs-btn-{uid}`, all 6 A-tests
  LANDED. THE pattern for block-private blocks.
- `sgs/container` (D292) — shared-wrapper, class selector `.uid`, base + tier objects.

## G. VERIFY (the LANDED bar — orchestrator runs this)
Per block: `audit-inline-styling.js` reports 0 inline for the block; build gates green
(dead-controls, hardcoded-defaults, box-family AST); then a crafted asymmetric instance
(4 distinct side values + asymmetric corners) rendered live → `getAttribute('style')` has
NO property declaration on the subtree, and `getComputedStyle` for all box families at
375/768/1440 == the set values. Emit ≠ LANDED.
