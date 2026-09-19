# Spec 35 — SGS Block Inspector UX, Control-Completeness & Capability Standard

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** A census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What decides the outcome is whether the TARGET SHAPE is settled first (THE-MIGRATION-METHOD.md Step 3).

```
doc_type: spec
spec_id: 35
spec_version: 2.2
status: ACTIVE
last_verified: 2026-09-19
owner: framework
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

> **Sibling spec:** Spec 35 (this doc) owns the block INSPECTOR-UX standard (editor-facing controls). Spec 32 owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Both are separate documents and both gate every block build — read them together.

> **Implementation status.** This spec is **substantially but not completely implemented**. Never
> quote an inspector-scan finding count from this document — re-derive it with
> `node plugins/sgs-blocks/scripts/inspector-scan/run.js` (`--json` for a machine-readable form).
> Rules that gate parts of this spec (each in `plugins/sgs-blocks/scripts/inspector-scan/rules/`):
> `03-dense-panel-candidate` (PART A5 `ToolsPanel`), `18-decorative-image-aria` (CO-18),
> `31-golden-colour-control` (a >2-state requirement derived from `supports.sgs.elements`,
> `mechanism-mismatch` and the shared-owner scan — the editor-side gap the colour-completeness census
> cannot see), `41-co2-element-grouping-order` (PART A4 / CO-2 element grouping — the static check for
> element-first panels), `42-no-op-reset-controls`, `43-colour-only-state-indicator` (WCAG 1.4.1) and
> `44-help-text-not-described` (help text must be `aria-describedby`-linked). Rules 03, 18, 31 and 41–44
> run in advisory mode with self-tests; the link and raw-lookalike rules (04, 08, 24, 27) are gates. Two PART F anti-patterns are deliberately NOT gated: "essential
> control only in sidebar" (still needs a human call on every hit even at its narrowest candidate
> list) and "sidebar as the home for every option" (a survey cannot separate correct-by-design zeros
> from real gaps); neither is worth a standing cost.
>
> **Rule 41 semantics.** Only a bound WRITE control counts toward "which panel holds the control" (a
> merely-READ attribute, e.g. handed to another component as a prop, is ignored — per-occurrence AST
> write/read classification). A panel whose JSX is returned by a SEPARATELY-DECLARED helper component
> (defined early, invoked late in the render tree — e.g. `sgs/product-card`'s `ContentOverridesPanel`)
> is excluded from the position comparison entirely, because file position is not DOM position for an
> indirect sub-component (safe-default false-absence, not a guess). The COLOUR-ROW EXEMPTION —
> a `colour-row + one-other-panel` split is not scattering — covers axis A and axis C
> (dom-order-vs-declared-order): an element whose only matched attribute is a colour row in the
> shared, early-mounted `SgsColourPanel` is excluded from axis C's comparison set. Positive + negative
> control fixtures are named in the rule's own header comment
> (`plugins/sgs-blocks/scripts/inspector-scan/rules/41-co2-element-grouping-order.js`).

## Why this exists

Every SGS block builds its inspector ad hoc. Clients are non-technical and live in the block
editor (CLAUDE.md "Client experience is primary"). Symptoms this fixes: cluttered/duplicated
sidebars, **half-built controls** (colour picker with no transparency; "shadow" = only Small/Medium;
logos added one-at-a-time), missing table-stakes features every WP power-user expects (hover states,
responsive-everywhere, alpha+gradient, real shadow/border builders, link controls), and
**re-inventing things WordPress core already ships** (duotone, aspect-ratio, lightbox, sticky,
dynamic content, client-safe editing).

This is the standard + fail-list + upgrade roadmap. It becomes an enforceable per-block
definition-of-done (Part L → fold into `block-migration-DONE-checklist.md` + a structural gate).

---

## PART A — Layout & grouping

- **A1. Placement hierarchy:** on-canvas → Block Toolbar (frequent/primary) → Inspector (secondary).
  Never put a control the block can't function without ONLY in the sidebar. [WP Block Design]
- **A2.** Sidebar is not the home for every option — every attribute has a sensible default. [10up]
- **A3. TARGET — SGS owns a three-tab bar (Content · Style · Advanced).**
  Kadence, Spectra and Stackable each ship their own tab bar rather than the native Settings/Styles
  split, and core has **no** semantic rule for that split anyway — verified in the Gutenberg source,
  the Styles tab is a hard-coded list of native block-support categories and Settings is simply the
  `default` group.
  ⛔ **Sequencing: the tab bar lands AFTER native-supports retirement**, or the client sees our three
  tabs plus core's Styles tab. **Interim state** (not the target, do not extend it): element panels in
  Settings, native supports in core's Styles tab, CSS-class/anchor in Advanced.
  ⛔ **The tab bar does not split an element's appearance from the content it modifies** (a Settings/Styles split on appearance-vs-content is not the rule).
  Full rule: **PART O** (this spec) §"THE PLACEMENT RULE".
  ⭐ **COLOUR is settled.** `SgsColourPanel.js` carries a `group` prop, and the
  Colour panel renders in the **Styles** tab (Styles = root CSS + visuals; the framework uses NO
  native colour supports, only their look). **Every fill/text/link colour on a block lives in the ONE
  shared `SgsColourPanel`** (one mount per block; a row that does not apply is omitted, never
  disabled); only border, overlay and shadow colour stay in their own composite controls. Full rule:
  **PART O** (this spec) §1 fields 4, 9e and 9f. Prior art agrees for
  composites (Kadence `infobox`, Spectra `testimonial` both bundle an element's colour + typography +
  spacing); core's property-keyed slots exist as an **extensibility contract** (Gutenberg #67814), a
  requirement SGS's own blocks do not have.
- **A4. Element-first grouping** for composite blocks (panels by block PART, not property type) —
 **derived from `supports.sgs.elements`, never hand-sorted.** One element = one panel titled by its
  `label`, holding that element's content (`contentAttrs`) + style clusters + its states **inline
  beside each base value**. Hover is never its own panel. Unresolved element → the control does not
  move. Kadence, Spectra, Stackable, Otter and Essential Blocks all converge on this grouping
  independently. Canonical statement: contract §CO-2 + §"THE ELEMENT MANIFEST".
  ⛔ **TWO TIERS.** A4 is TIER 1 only. **TIER 2** governs WITHIN a
  panel, and for every control that scopes to no element: group by **property-family**
  (text/fill/layout/position/motion/animation — already defined in
  `scripts/consistency/cluster-member-sets.json`, not invented per-block), resolved via each
  element's declared `clusters` and honouring `appliesToLayers`. There is no single catch-all
  "block-level panel" for block-root/no-element controls. A control that styles **nothing** (`variant`, `templateMode`, `tagName`, `layout`,
  `autoplay`, `showDots`, `required`) takes **one `Settings` panel, pinned first.** Full rule:
 **PART O** (this spec) §"THE PLACEMENT RULE".
- **A5. Progressive disclosure with `ToolsPanel`/`ToolsPanelItem`** once a panel hits ~6+ controls:
  optional controls behind the "+" menu, 1–3 `isShownByDefault`, `resetAll`. THE anti-clutter tool.
  - ⛔ **NAMED EXCEPTION — COLOUR IS NEVER OPTIONAL.** A colour control must
    not sit behind the "+" menu and must not be hideable per instance. A client hunting a disclosure
    menu to find a colour is the very clutter defect A5 exists to prevent, arriving via A5's own
    mechanism. Colour's states (normal/hover/active) are reached **inside** the control's popover,
    never as sibling controls or a second panel — which is what removes the density pressure A5 would
    otherwise be solving for. Full control shape + the three binding clauses: **PART O** (this spec) §1 field 9.
  - ⛔ **A `ToolsPanel` nested inside a `PanelBody` must not repeat the same title twice to the client.**
    Deleting the outer `PanelBody` is not safe where it carries `initialOpen={false}`, because
    `ToolsPanel` has no collapse (the deletion turns a deliberately-tidy collapsed section into a
    permanently open one). Removing the INNER label is not available either: core's `ToolsPanelHeader`
    returns `null` when `label` is falsy, which would take the "+" menu and Reset all with it. Delete the
    outer wrapper only where it has no `initialOpen` and no other children; otherwise review the
    `isShownByDefault` set so the outer collapse stops being necessary — a well-configured
    `ToolsPanel` is already short.
- **A6. Never duplicate a native `supports` panel** (inspector-UX form of R-31-9).
- **A7. Per-block universal-extension gating — TWO models.** Most
  extensions (`animation`, `clickEffects`, `parallax`) stay **opt-OUT**: universal unless a block
  declares `supports.sgs.hideExtensions: [...]`. `hover` and `blockLink` are **opt-IN**: attached to
  NO block unless it declares `supports.sgs.enabledExtensions: [...]`, because their panel would
  otherwise paint the block root, not the element a client wanted. Both declarative + read by
  `hide-extensions.js` (`isExtensionHidden()` / `isExtensionEnabled()`).
- **A8. Panel order — OPEN, do not build a rule from this line.** "Frequency-first,
  escape-hatches last + collapsed" is one candidate; "the element's declared `order`" (contract §THE
  PLACEMENT RULE) is another, and they do not agree. **CO-28's design gate stands: Bean picks
  the canonical order.** No competitor centralises panel order — Kadence,
  Spectra, Stackable, Otter and Essential Blocks all use authoring order — so this is genuinely new
  ground rather than a solved problem to copy.
- **A9. In-row layout primitives** (`HStack`/`VStack`/`Flex`/`Grid`/`Spacer`/`Divider`) — lay related
  controls in a row, not one full-width field per line (density for non-technical clients).

## PART B — Control completeness (no half-built controls)

| Control | Complete means | Incomplete smell |
|---|---|---|
| `RangeControl` | `min`/`max`/`step` real; `withInputField`; `allowReset`+`resetFallbackValue`; unit shown | slider only, no input/reset, arbitrary 0–100 |
| `UnitControl` | `units` covering every meaningful unit; `isResetValueOnUnitChange` | px-only |
| `BoxControl` | 4 sides + link/unlink; `units`; `allowReset`; `splitOnAxis` | one linked number |
| Colour | **`enableAlpha`** (≈always) + `clearable` (alpha-0 ≠ unset); `disableCustomColors` false | no alpha (can't pick transparent — reported bug) |
| `GradientPicker` | custom builder + alpha stops + `clearable` | preset-only |
| Border (composed builder, contract §14.1) | width `UnitControl` (real `units`) + style `SelectControl` + token-aware colour picker with alpha; radius as a **separate** 4-corner `ResponsiveBorderRadiusControl` | one colour+width, no style; radius folded into the width control; a raw CSS-shorthand `TextControl` |
| Shadow | real X/Y/blur/spread/inset builder (shape only) **+ colour/alpha as a split sibling attribute routed through `SgsColourPanel`** (not embedded in the builder), presets on top; multi-layer ideal | **None/Small/Medium only** |
| Selection | `ToggleGroupControl` (2–5 short); `ComboboxControl` (>~10, searchable); `FormTokenField` (multi-value) | comma-text; giant Select |
| Media/gallery | `multiple="add"` + `gallery` + array attr + `MediaUploadCheck` + drag-drop | scalar attr + single MediaUpload |
| Link/CTA | **`LinkPopoverField` / `LinkPopoverContent`** (canonical). `SgsLinkControl` is not canonical; blocks still mounting it are listed by inspector-scan rule `27-superseded-link-control`. | raw URL `TextControl` |
| Typography | full set: `FontSizePicker` (presets; NOT fluid) + `FontAppearanceControl` + line-height via `ResponsiveControl`+`UnitControl` (contract §4.1) + letter-spacing/transform/decoration | fontSize only |
| Image | size dropdown (attachment `sizes`) + aspectRatio + object-fit/`FocalPointPicker` | hardcoded full-size `src`, centre-crop only |
| Spacing | token-based `__experimentalSpacingSizesControl` (S/M/L, theme.json) OR UnitControl | raw px RangeControl (breaks token system) |

**Universal completeness features:** reset path · `enableAlpha`+clearable · per-side/per-corner ·
real units · ToolsPanel disclosure · device-tier responsive · real builders (not presets alone) ·
array attrs for multi-item · correct `group` · `MediaUploadCheck` · Combobox for long lists.

## PART C — Feature parity checklist (T=table-stakes · P=premium · N=native WP mechanism exists)

**Links/CTAs:** internal-content search (N: LinkControl) T · new-tab + auto-rel-noopener (N) T ·
rel nofollow/sponsored (N: LinkControl `settings`) T · **whole-card/block clickable link** (no
native — hand-rolled overlay `<a>`) T — *high-impact gap for card-grid/team/product/testimonial* ·
download attr P.

**PLACEMENT — the LINK control is a POPOVER, never an inline inspector mount (canonical component + full rationale:
**PART O** (this spec) §2 LINK).** Mount `LinkPopoverField`
(`src/components/LinkPopoverControl.js`) for a single trigger, or its `LinkPopoverContent` primitive
when a block needs more than one trigger (e.g. a toolbar button AND a sidebar row) opening the same
popover instance. Why: core `LinkControl` floors at `min-width:350px` (cancelled
only inside `.components-popover__content`) and STAGES its `settings` toggles with no blur/close
commit — both defects an inline inspector mount cannot avoid. Do not build a new LINK field as an
inline `<PanelBody>` mount, even via the `SgsLinkControl` wrapper.

**Media:** focal point (N: FocalPointPicker) T · aspect-ratio (N: `dimensions.aspectRatio`) T ·
object-fit/position T · native lightbox (N: `settings.lightbox`, image only, no swipe/keyboard nav) T ·
srcset/lazy-load (N, automatic) T · video poster/autoplay/loop/mute (N: core video attrs) T ·
background video (N: Cover) T · SVG sanitise-on-upload (security — never raw) T.

**Effects/filters:** opacity T · duotone (N: `filter.duotone` — prefer over hand-rolled) T · CSS
filters blur/brightness/etc P · backdrop-filter/mix-blend-mode P · clip-path/mask P.

**Motion/animation:** entrance P · scroll-triggered P · hover transforms (scale/rotate/translate) T ·
parallax P · sticky-on-scroll (N: `position.sticky`) T · **`prefers-reduced-motion` gating on ALL
animation (WCAG 2.3.3) — from day one, never bolted on** T.

**Position/layout:** sticky (N: position support) T · z-index P · min/max height (N: `dimensions.minHeight`) T ·
vertical align (N) T · responsive column ordering P · flex/grid gap (N: `layout.spacing.blockGap`) T ·
full-bleed align (N: `align`) T.

**Conditional/display:** by device T · by login/role (server-side capability check) T · by date/schedule P ·
by query/context P · **content-only editing (N: `templateLock:"contentOnly"`)** T — *native, unused, high-value*.

**Content:** dynamic data binding (N: **Block Bindings API**, WP 6.5+ — build on this, not a bespoke
system) T · repeaters/loops (N: `core/query`) T · counters/ratings/icons P.

**A11y/SEO as controls:** alt-text field (N) T · **Decorative-image toggle** (empty alt + `aria-hidden`) — BUILT: `imageDecorative`
(`plugins/sgs-blocks/src/blocks/media/block.json::attributes.imageDecorative`) is declared and wired to render — `media/render.php`
sets `aria-hidden="true"` from it. Scoped to `sgs/media`; `sgs/decorative-image` needs no toggle because it
hardcodes `aria-hidden="true"` on every image it emits, i.e. the whole block is
decorative by construction. Other image-rendering blocks with no decorative/ARIA attribute are listed by
`inspector-scan` rule 18 (advisory) · heading-level (N) T · **General ARIA-label control** for icon-only buttons — PARTLY BUILT: `ariaLabel` is declared
on both `button/block.json` and `icon/block.json` — the two blocks that actually render
icon-only triggers. It is also on `sgs/container`, `sgs/cta-section` and `sgs/trust-bar` as a landmark
label for `nav`/`aside`. **Not verified as universal across every block that could render icon-only** —
that narrower question is the residual, not "no control exists" · schema → leave to `seo-schema` skill, don't duplicate in blocks.

## PART D — Responsive UX

- **D1.** Two patterns, never conflated: editor device-preview (viewport only) vs per-block responsive
  attributes (SGS `ResponsiveControl` + `paddingTablet`/`Mobile`).
- **D2.** Breakpoints = locked **768 / 1024** device standard; never a bespoke third value (device-tier
  vs arbitrary-visual-breakpoint rule).
- **D3.** Mobile inherits from desktop unless overridden — blank tiers fall back safely.
- **D4. Per-device CONTENT cascade (Spec 37 FR-37-24).** D3's
  inheritance applies to content **presence**, not only to property values. Desktop is the base;
  tablet inherits desktop; mobile inherits tablet. Hiding a block at a tier applies to that tier
 **and every tier below**, never above; a tier that is explicitly edited stops inheriting.
  - **HIDE, never REMOVE.** The cascade hides via CSS and never forks the block tree per tier.
    `includes/device-visibility.php` already generates `display:none` media queries and
    states *"Content remains in the DOM for SEO (display:none only hides visually)"*. A
    structural remove would break crawlability (memory `degrade-to-more-content-never-less`) and
    would need per-device cache fragments the page-cache model has no key for.
  - **`inherit` resolves at render, never copies down at save.** Copying a parent's value into a
    child tier at save time makes an inherited value indistinguishable from an explicit
    override, so a later desktop edit can no longer cascade.
  - **⚠ SCOPE: general block VISIBILITY is EXCLUDED from this cascade.**
    `sgsHideOnMobile`/`Tablet`/`Desktop` (`src/blocks/extensions/responsive-visibility.js`) KEEP
    their three independent per-device toggles — no reshape, no inheritance. The rule's reasoning:
    per-device hiding's dominant use is a device-SPECIFIC block — hidden on desktop precisely because
    it exists for mobile/tablet; inheritance would make a desktop-hide cascade everywhere and the
    block could never render. **D4's down-cascade model applies ONLY to header/footer CONTENT
    curation (Spec 37 §3.8's item-level trimming)**, and the cascade mechanism itself applies to
    BEHAVIOURS and RESPONSIVE VALUES (FR-37-14 / FR-37-16 families).
  - **Reuse the one cascade (for behaviours/values/§3.8 content).** Resolve via the same
    `resolveTier()` shape P1 DP1 defines — do not introduce a second inheritance mechanism.
    Approved contract: `plans/archive/2026-07-28-resolveTier-cascade-design-gate.md`.
  - **Consumer:** Spec 37 §3.8 depends on this; that spec owns the requirement, this spec owns
    the build.
  - **✅ BUILD STATUS: BUILT.** The canonical `resolveTier()` ships in JS (`src/utils/responsive.js`;
    `resolveResponsiveTier` is a thin alias) + PHP (`sgs_resolve_tier()`, `helpers-responsive.php`) with
    ONE shared golden fixture set passing in BOTH runtimes. The scoped per-tier emission helper
    (`sgs_emit_tier_rules`) and `ResponsiveTriStateControl` consume it, and FR-37-14's site-header
    behaviours are built on it (explicit-off override and sticky+transparent coexistence included).
    General block VISIBILITY remains EXCLUDED (scope note above): `responsive-visibility.js` is three
    INDEPENDENT flat booleans (`sgsHideOnMobile`/`Tablet`/`Desktop`, `default:false`) with no
    inheritance — deliberately. The §3.8 header-CONTENT cascade feature is a separate consumer owned
    by Spec 37. `headerSticky`/`headerTransparent`/`headerShrink`/`headerHideOnScroll` are
    `{"type":"object","default":{}}` (`site-header/block.json`). Spec 37 FR-37-14 (behaviour
    tri-state) consumes the canonical `resolveTier()` cascade — see Part M.

- **D5. Per-device MEDIA SOURCE (art direction) — the canonical pattern.**
  A client must be able to choose a different CROP per device wherever media appears, not only where
  the cloning pipeline wrote the values. This is the standard for every media-bearing block and any
  NEW block with a media source.

  - **Attr shape:** `{base}` / `{base}Tablet` / `{base}Mobile`. An empty tier falls back UP
    (mobile → tablet → desktop), per D3. **Match the base attr's TYPE** — an object-typed base
    (`avatarMedia`, `thumbnail`) takes object-typed tiers, because WP silently coerces a flat value
    on an object-typed attr to its default and drops the whole thing.
  - **Control:** exactly ONE `<ResponsiveControl>`-wrapped picker, **gated on the base media
    existing**. A per-device override for media that is not there is a dead control.
  - **Alt text is NOT tiered.** A different crop of the same subject describes the same thing; a
    per-device alt is a second place for the description to drift.

  - **⛔ "Falls back UP" means the next WIDEST tier that HAS a value — NOT the base.** Emitting each tier's toggle rules INDEPENDENTLY gets one of the four combinations
    wrong: with a TABLET tier set and MOBILE empty it hides `--tablet` below 768px and leaves
    `--desktop` visible, so mobile falls back to DESKTOP and skips the tablet value it should
    inherit. That contradicts `sgs_resolve_tier()` (`plugins/sgs-blocks/includes/helpers-responsive.php::sgs_resolve_tier`), whose mobile
    branch recurses to tablet. COMPUTE band ownership; never enumerate the rules by hand:

    | tiers set | ≤767px | 768-1023px | ≥1024px |
    |---|---|---|---|
    | none | desktop | desktop | desktop |
    | mobile | mobile | desktop | desktop |
    | tablet | **tablet** | tablet | desktop |
    | both | mobile | tablet | desktop |

  - **⛔ Tier hide rules must be COMPOUND — `.{uid} .base.base--tier` (0,3,0), not
    `.{uid} .base--tier` (0,2,0).** Block stylesheets set `display:block` on these BEM bases at
    (0,2,0), so a bare modifier rule TIES and the winner is decided by source order — which is not
    ours to guarantee once block CSS is lifted into `uploads/sgs-css/`.

  - **SVG tiers by MARKUP, same as images.** `svgContent`/`Tablet`/`Mobile`, string-typed to
    match the base. Inline SVG costs no extra fetch, so it takes the sibling pattern, NOT the video
    runtime swap. **Every tier MUST pass the same `wp_kses()` allowlist as the base** — the allowlist
    is the whole defence and cannot apply to one of three sources. A tier the allowlist strips to
    nothing must be DROPPED, not emitted, or it blanks that width behind an empty box.
    ⚠ `style` is allowlisted and `wp_kses()` does not filter an allowed `<style>`'s text content, so
    operator CSS is unfiltered and a nested `<style>` applies document-wide regardless of
    `display:none` on its wrapper. **This is NOT an escalation and must not be "fixed" by stripping
    the tag** — `sgsCustomCss` already gives every block a sanctioned raw-CSS `<style>` channel
    (load-bearing, Spec 31 FR-31-5.2, undeletable), so the same actor already has the same
    capability. Removing `style` would break design-tool SVG exports (which routinely carry `<style>`
    + classes) for zero security gain.

  - **IMAGES tier by MARKUP.** Emit all tiers as sibling elements carrying a BEM tier modifier and
    toggle them with breakpoint rules in the block's own scoped `<style>`. Three `<img>`s cost
    nothing meaningful, it needs no JS, and the BEM modifier is the vocabulary the cloning pipeline
    reads — one convention on both ends is what makes a clone round-trip.
    - ⛔ Build tier selectors from the **BARE scope token**, never from a multi-member selector LIST:
      a descendant appended to a list binds to its LAST member only.
    - ⛔ **Naked-mode blocks** (the media element IS the block root, e.g. `sgs/decorative-image`)
      have no ancestor to descend from: each tier sibling must carry the uid class ITSELF and the
      toggles are COMPOUND selectors (`.{uid}.{block}--mobile`), not descendant.
    - ⛔ Append tier CSS **before** the block assembles its `<style>` string. Appending it next to
      the element emit compiles cleanly and emits nothing.

  - **VIDEO tiers by RUNTIME SWAP — deliberately NOT the markup pattern.** Three `<video>` elements
    each begin fetching and three embeds each load a player, so siblings are not free here. Use
    sgs/hero's established `data-src-desktop`/`-tablet`/`-mobile` contract and swap in `view.js`.
    The DESKTOP source still renders as real server markup so a no-JS visitor gets a working video.
    The cost is accepted for embeds: crossing a breakpoint mid-watch rebuilds the iframe
    and loses playback position, so the swap fires ONLY when the resolved source actually differs.
    - ⛔ **Any node the swap REBUILDS must carry the tier `data-*` forward**, or the swap is
      one-way and can never return — it will look correct in the one direction anyone tests first.

  - **Verification bar:** computed visibility (or, for video, an ADVANCING `currentTime`) at FIRST
    PAINT per width — viewport set, then a fresh navigation, never a resize-after-load. Markup
    presence scores a false pass. Assert on the MEASURED `window.innerWidth`, not the requested
    viewport size (a browser can render narrower than requested and test the wrong tier). Include a positive control: prove the effect CAN fire in that browser, or "nothing
    happened" is indistinguishable from a dead feature.

## PART E — Accessibility (WCAG 2.1/2.2 AA)

- **E1.** 4.5:1 contrast on the block's OWN control UI.
- **E2.** `ToggleGroupControl`: selected/focus visible under High-Contrast (not colour alone); `help`
  via `aria-describedby`. [Gutenberg #50785, #76740]
- **E3.** Keyboard-operate everything (inherited free from native components).
- **E4.** No extra unlabelled `role="region"` around InspectorControls.
- **E5.** `prefers-reduced-motion` gate on every animation/transition (WCAG 2.3.3 AA).
- **E6.** Decorative-image toggle + ARIA-label control where markup needs them.

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
> Governing document: **PART O** (this spec), which lists both raw components as **banned lookalikes**.
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
"shadow", an animation without a reduced-motion gate; (c) `/doc-audit` cites this spec per block.

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
      (see the implementation-status box at the top of this spec)

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
for an object-typed base. Governing text: **PART O** (this spec) §12 field 3. The mismatch is silent
and destructive in both directions: WordPress discards an attribute a block no longer declares, and
coerces a flat value on an object-typed attr to its default, so migrating a storage shape without its
control leaves an inspector that deletes the setting when used — through a green build, every static
gate, and a deploy. **Only opening the editor finds this class.**

**Roadmap (Part J) build state:** see Part J's status table. Per-device CONTENT cascade (D4) and the
canonical shared `resolveTier()` are BUILT (D4 above); Spec 37 FR-37-14 (behaviour tri-state) is built
on that mechanism. `responsive-visibility.js`'s three independent flat booleans are deliberately
excluded from the cascade (D4 scope note).

**Editor-canvas verification.** Verify controls by opening the block editor: frontend render, REST
attribute registration and unit tests do not exercise the editor canvas (R-31-13; `ShadowControl`
crashed on first live render despite passing unit tests).

**OPEN (parked, none blocking Spec 35):** `P-NO-INLINE-GATE-COVERAGE-GAPS` (gate canary page for
var-driven features; see Spec 32 §6.2(a)) · `HeaderBehavioursTest.php` needs a composer/PHPUnit env
to execute · Shrink+Hide legacy-transition overlap on pre-animation-timeline browsers (documented,
not speculatively fixed).

**THE PLACEMENT RULE, as built.** Canonical rule text: A3/A4 above + **PART O** (this spec) §THE
PLACEMENT RULE.
- **A4's "block-level panel" does not exist.** Every root-scoped control resolves to a TIER 2
  property-family panel via `cluster-member-sets.json`, not a catch-all — see A4 above.
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
  **PART O** (this spec) §12 (THE RESPONSIVE WRAPPER FAMILY) — do not duplicate it here, it drifts.
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

**Governed by the CONTROL-TYPE CONTRACT (**PART O** (this spec)).** Every item of the
DONE checklist is ABSORBED into a control-type contract or CARRIED into that document's §CARRIED
OBLIGATIONS.

The bar for "enforced" is `STOP-CATALOGUE.md` §E6 (10 points) — **"has a script" is not the bar**,
and neither is "the gate reads green": a gate keyed to a component NAME has a blind spot by
construction, which is why the contract requires each rule to enumerate its banned lookalikes.
⛔ No enforcement is built for a rule scoped against `block_capabilities` or icon `role` until
those two Tier 0 columns are corrected.


---

## PART O — Colour-control rules (addenda to contract §1)

Four rules for colour controls. The machine-readable contract is
`plugins/sgs-blocks/scripts/consistency/golden-controls.json` `controls.colour`; this section records
the rules and why, so the two do not drift.

1. **A colour row's HOVER state is a TAB inside one popover, never a second row.**
   `DesignTokenPicker` renders a tab strip whenever `states.length > 1`, with a per-state
   Solid/Gradient toggle inside each tab. `GradientOverlayControl` is a thin adapter over that and
   takes an optional `solidHover`/`gradientHover` pair in `attrNames`.
   ⛔ **Build a `states` array as LITERAL entries, never a computed `.map()` over a spec list.**
   `inspector-scan` rule 31 resolves the state count STATICALLY and cannot evaluate a runtime
   predicate: a `.filter().map()` renders both states correctly while the rule reports "carries 1
   state" — the code improves while the detector goes blind.

2. **The overlay's responsive tier axis lives on OPACITY, not colour.** Per-device overlay
   need is scrim WEIGHT, not hue: `backgroundOverlayOpacity{Tablet,Mobile}` exist and there are no
   responsive colour attributes. Only the opacity declaration is re-emitted per tier —
   restating colour/gradient/blend inside a `@media` block would make the tier rule a second owner
   that silently outranks a later desktop edit.

3. **Overlay is a SIBLING control, not an `SgsColourPanel` row.** Its opacity and
   blend-mode extras stay on the sibling control. `SgsColourPanel`'s row contract has no field for
   either, and growing it would be a Rule 7 change affecting every mounting block. A sibling control
   is still fully enforced: rule 31 reaches shared components through `reachedComponents()` over
   `src/components/`, independent of panel rows.

4. **Every colour picker that can store a palette token MUST pass `linked`.** Without it
   `makeChangeHandler()` stores the raw CSS colour on every pick and never a slug, silently
   unlinking the client's brand token (`ShadowControl` passes it).
   ⚠ **Before adding `linked` anywhere, verify the CONSUMER resolves slugs** — a bare slug reaching
   CSS is invalid and the browser drops it silently. `ShadowControl` is safe because
   `sgs_shadow_value_composed()` passes through `sgs_colour_value()`.
   ⚠ `enableAlpha` is a SEPARATE decision from `linked`. Turn it off only where a dedicated opacity
   attribute carries transparency instead (the overlay). **Shadows KEEP alpha** — a
   translucent shadow is the normal case and there is no shadow-opacity attribute, so removing it
   would delete a capability. Consequence, stated: lowering alpha still stores a raw colour.

⛔ **Shadow rows have NO gradient recipe** — `box-shadow` takes a colour and a gradient there is
invalid CSS. That exemption belongs in the DETECTOR, stated once, not as a per-block
`colourExemptions` entry: the reason is a universal CSS fact, and N copies of one sentence is the
boilerplate the exemption contract's own rule calls a finding. Open work: encode the exemption in the
detector.

## PART O — THE CONTROL-TYPE CONTRACT

> ⚠ **Section numbering is stable.** A citation of the form "contract §1 field 9" or "§14 BORDER"
> resolves as "Part O §1 field 9". Sub-headings are nested one level below Part O.

### How to read a contract

Every control type below declares the same eight fields. A block satisfies the contract for a type
when it is in that type's **scope** and uses the **canonical component** with the **required props**,
in the **correct tab**, and contains none of the **banned lookalikes**.

---

### ⛔ THE PLACEMENT RULE

> **TIER 1 — the element.** One panel per element, holding that element's content, its styling and
> its hover together. Panel title = the element's `label`. Panel order = the element's `order`.
> Hover renders inline beside the value it modifies — never as its own panel.
>
> **TIER 2 — the property-family.** WITHIN a panel — and for every control that scopes to no
> element — controls group by property family: text / fill / layout / position / motion /
> animation. These families are **not invented for this rule**; they are the families already
> defined in `scripts/consistency/cluster-member-sets.json`, with labels and owning components
> already declared there. Which families an element HAS is its own `clusters` key. Resolution
> honours `appliesToLayers`.
>
> **A control that styles NOTHING** (`variant`, `templateMode`, `tagName`, `layout`, `autoplay`,
> `showDots`, `required` — no CSS property behind it) takes **one `Settings` panel, pinned first.**

That is the whole rule. There is **no behaviour-vs-appearance question** anywhere in it.

Two resolver rules ship with tier 2, both derived from declarations, neither a manufactured
tie-break: (a) an explicit `attrMap` entry is AUTHORITATIVE — another element's cluster reaching
the same attribute name is not ambiguity; (b) an element that explicitly claims a cluster member
owns that member's WHOLE SUFFIX FAMILY (`grid` maps `css:grid-template-columns`, so a block's
separate `columns` attribute — the same member under another name — is `grid`'s too).

⚠ **"Panel order = the element's `order`" is PROVISIONAL.** It gives a per-block
order, which is not the same thing as **CO-28**'s cross-block canonical order — and CO-28's own gate
("Bean picks the canonical panel order — a Rule 7 design gate") **still stands, unreleased.** No competitor
centralises panel order; in Kadence, Spectra,
Stackable, Otter and Essential Blocks alike it is authoring order. Do NOT build an ordering rule from
this line. Spec 35 **A8** ("panel order = frequency-first") is the other side of the same open
question.

**Derived, never hand-sorted.** The source is `supports.sgs.elements` in each `block.json` — every
block declares it (`python scripts/surveys/survey-control-mounts.py .`). Where an element cannot be
resolved, the control **stays exactly where it is today**
and the ambiguity is reported — no-worse-than-today is the floor.

**Applies to every state, not just hover.** `states.hover`, `states.current` and
`states.scrolled` all render inline beside their base value
(`python scripts/surveys/survey-control-mounts.py .` lists which elements declare each state).
`scrolled` is in `golden-controls.json`'s real state vocabulary on the same basis `current` is: a
class toggled at RUNTIME (`.is-header-scrolled`, by `header-behaviours/view.js`) and painted by CSS
in `sgs/site-header/render.php`. It lets the header background be ONE two-swatch colour row (at rest /
once scrolled) rather than two single-state rows. The third state's DB name is `current`, not
`selected`: `block_attributes.css_state` reads `current` and `hover`, and the `block.json` element
`states` keys use `current` (`option-picker`, `table-of-contents`, `tabs`, `breadcrumbs`).
`css_state` is a derived column (`extract-signatures.py` → `css-property-classifications.json` →
`/sgs-update`). The canonical vocabulary lives in `golden-controls.json`'s `_meta.stateVocabulary`,
not `cluster-member-sets.json` (that file's own `states` block has zero readers and is documentation,
not a source of truth).

**Controls with no element** — anything injected by a universal extension in
`src/blocks/extensions/`, and any block-wide setting — belong to no element by construction. They do
**not** collect in one catch-all "block-level panel": each one resolves
to its **TIER 2 property-family panel** (text/fill/layout/position/motion/animation) via
`cluster-member-sets.json`, exactly as an element's own controls do. Only a control that styles
**nothing** — no CSS property behind it (`variant`, `templateMode`, `tagName`, `layout`,
`autoplay`, `showDots`, `required`) — takes the single pinned-first `Settings` panel. The
per-control-type `Tab` field below is subordinate to this resolution: it picks the
WordPress *group* only for a "styles-nothing" control landing in the pinned `Settings` panel, not
for any control that has a real property family.

#### Where the tabs go

**SGS owns a three-tab bar (Content · Style · Advanced), as Kadence, Spectra and Stackable all do.**
The native Settings/Styles split is not a standard: core has **no** semantic rule for it. Verified in
the Gutenberg source — the Styles tab is a hard-coded list of native block-support categories
(`typography`/`color`/`background`/`border`/`dimensions`/`layout`/`position`/`filter`/`elements`) and
the Settings tab is simply the `default` group, i.e. everything else. There is no principle to apply,
which is exactly why every attempt to apply one produced a different answer.

⛔ **SEQUENCING — the tab bar lands AFTER native-supports retirement, not before.** While blocks still
declare native `color` or an ACTIVE `__experimentalBorder`, core renders its own Styles tab regardless
of what we do. Shipping our tab bar first gives the client THREE SGS tabs plus core's Styles tab —
strictly worse than the interim state. Native retirement is itself blocked on the background
capability.

**Until the tab bar ships**, element panels stay in Settings and native supports stay in core's Styles
tab. That is the interim state, not the target, and it is not a rule anyone should extend.

#### Why the rule sorts by element, not by behaviour

A discriminator of "behaviour → Settings; appearance → Styles" sorts by what a control DOES and says
nothing about what it BELONGS TO, so every element's appearance control gets pulled out of that
element's panel and piled into Styles. The rule sorts by the element instead.

**Prior art this is modelled on** (primary sources): Kadence, Spectra and
Stackable each group a composite block's controls by PART, one named panel per visible element;
Otter (`review`) and Essential Blocks (`team-member`) converge on the same shape independently in
hand-written source. Hover as a per-control state switch beside the base value is unanimous —
Kadence, Stackable (4 states), Otter, and core's own `state-control.js`. **Nobody centralises panel
order**; in every codebase checked it is authoring order, which is why CO-28 stays open (below).

**Design of record:** `.claude/plans/archive/2026-08-08-element-driven-inspector-design.md` §2.1, §2.2,
§10.1–10.2.

---

### THE ELEMENT MANIFEST — schema of record

`supports.sgs.elements` in each `block.json` is what THE PLACEMENT RULE and CO-2 derive from, so its
schema is normative. **This section is the schema**; the conformance gate is
`scripts/check-element-manifest-conformance.js`.

**Manifest census:** `python scripts/surveys/survey-control-mounts.py .` reports how many `block.json`
files declare `supports.sgs.elements`, the element count, and how many elements declare each state
(`hover`, `current`, `scrolled`). `scrolled` is a real state name and must be included wherever this
document enumerates the state vocabulary. ⚠ Counts drift — re-derive from the manifests rather than
quoting one.

```jsonc
"supports": { "sgs": { "elements": {
  "<elementKey>": {
    "label": "Headline",              // REQUIRED — the panel title the client reads
    "order": 7,                       // REQUIRED — panel position; ties break by reading order
    "clusters": [ "text", "fill" ],   // REQUIRED — which of text/fill/layout this element HAS (F4 flag)
    "prefix": "headline",             // OPTIONAL — attr-name prefix for the default convention
    "isWrapper": true,                // OPTIONAL — ONLY the element representing the block ROOT.
                                      //   Gates the native-supports fallback, AND selects TIER 2
                                      //   of THE PLACEMENT RULE (block-root controls
                                      //   resolve by property-family, not to a catch-all panel).
    "layer": "OUTER",                 // OPTIONAL — OUTER | GRID | CONTENT | GRID_AREA (wrapper layer)
    "attrMap": {                      // OPTIONAL — explicit STYLE overrides, always tried first
      "css:font-size": "headlineFontSize",
      "css:padding":   "native:spacing.padding"
    },
    "contentAttrs": [ "headline", "headlineTag" ],   // OPTIONAL — see below
    "states": {                       // OPTIONAL — hover/current values, nested INSIDE the element
      "hover": { "attrMap": { "css:color": "colourTextHover" } }
    }
  }
} } }
```

#### `contentAttrs`

**Problem it solves, in plain English.** The manifest records which *styling* properties an element
owns ("the headline owns its font size and its colour"). It records nothing about which *content*
field belongs to that element ("the headline's words live in the attribute called `headline`"). CO-2
requires an element's panel to hold its content **and** its styling. The styling half is in data; the
content half is today knowable only by reading each block's `edit.js` by hand — which is exactly the
hand-authoring this model exists to remove.

**Definition.** `contentAttrs` is an ordered list of `block.json` attribute names naming the content
fields that element owns (its text, its media source, its link, its heading tag). Additive,
machine-checkable, and read by the inspector to gather an element's content controls into its panel.

**Binding conditions ("generate and review"):**

1. **Generated, then reviewed — never hand-written across every element.** The generator derives
   ownership from what `render.php` actually prints inside each element, matching how `attrMap`'s
   `native:` entries are produced.
2. **Its output is a PROPOSAL until reviewed.** Bean reads a block's generated output before it is
   applied to a further block.
3. **It must REPORT what it cannot determine**, per element — never emit a confident guess. An
   unresolved element gets **no `contentAttrs`**, and states why.
4. **Absence means no move.** Until an element declares `contentAttrs`, its content controls stay
   exactly where they are. That is the no-worse-than-today floor.
5. **Ships with `--check`** so drift fails the build rather than waiting to be noticed, and is
 **re-runnable and idempotent** — a block changing shape must not need hand-repair.

⚠ **Named risk:** inference from `render.php` is weakest exactly where render is variant-driven
(`hero`, `testimonial`, `product-card`). Condition 3 is what keeps that from becoming silent damage —
those elements surface as *unresolved*, not as a wrong answer that moves a client's control into the
wrong panel.

#### Attr→element resolution order (implemented in `resolveMember()`)

1. **Explicit `attrMap[member.key]`** — authoritative. A `native:<dot-path>` value checks
   `block.json.supports` at that path; any other value is checked as a literal attribute name
   (case-insensitive fallback).
2. **Default convention** — `{element.prefix}{member.suffix}`, suffixes in the order
   `scripts/consistency/cluster-member-sets.json` declares them.
3. **Native-supports fallback** — ONLY when `isWrapper === true` and the member declares a
   `nativeSupportsPath`. Gated to the wrapper because native `supports` apply to the block ROOT only;
   ungated, every element sharing the `layout` cluster falsely inherits the wrapper's margin/border.

A member resolving via none of the three is a **GAP** — reported, never silently dropped, never
hand-excluded. A block with no `supports.sgs.elements` key is **skipped**, not flagged.

⚠ **GAP and "stays where it is" are the SAME outcome seen from two sides, not two rules.** A declared
cluster member that resolves to nothing is *reported* as a GAP (the conformance view) and the control
*does not move* (the placement view). Nothing is relocated on a guess in either case.

⚠ **`states` has a second, currently-unused form the code supports:** `resolveStateMember()`
(`plugins/sgs-blocks/scripts/check-element-manifest-conformance.js::resolveStateMember`) also accepts `suffix` + `members` alongside
`attrMap`. No block uses it today. It is live and reachable — document it before relying on the
`attrMap` form being the only one.

**There is one block denominator.** All sources agree on it — `SELECT COUNT(*) FROM blocks WHERE slug
LIKE 'sgs/%'`, `ls src/blocks/*/block.json`, `ls src/blocks/*/edit.js`, and `inspector-scan`
`_meta.denominator` (roster / disk / union). `ls -d src/blocks/*/` returns one more directory —
`extensions/`, which holds no `block.json` and is not a block.

⚠ **Every figure derived from the denominator must be re-derived by running its own query**, not
decremented — silently shifting a derived number by one is the unmeasured-relay trap this document
exists to prevent. Quote the denominator, and how it was measured, with any figure derived from it.

---

### The scoping axes (machine-readable — never a hardcoded block list, per R-31-1)

Denominator is always the live block count (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`).
Per-axis splits are not cached here: re-run each axis (`python scripts/surveys/survey-control-mounts.py .`)
before quoting it.

| Axis | Source | Note |
|---|---|---|
| `surfaces.colour` | roster.json | blocks that paint a colour |
| `surfaces.styling` | roster.json | |
| `surfaces.media` | roster.json | |
| `surfaces.animation` | roster.json | **the proven precedent**, used by rule 17 |
| `surfaces.link` | roster.json | over- AND under-inclusive — see LINK §5. `build-roster.py` derives this axis from a haystack INCLUDING `inspector_control_type`. Regenerate `roster.json` after ANY DB write to that column |
| `category` | roster.json | content / forms / interactive / layout |
| `blocks.tier` | DB | block · class-section |
| `block_composition.container_kind` | DB | content · layout · section (scoped to built SGS blocks) |
| `block_composition.composition_role` | DB | content-block · leaf · section-root · wrapper-shell |
| `blocks.parent_block` | DB | child-restricted blocks |
| `blocks.replaces` | DB | blocks that replace a core block |
| `blocks.variant_attr` | DB | variant-bearing blocks |
| `block_attributes.is_responsive` | DB | |
| `block_attributes.box_family` | DB | |
| `block_attributes.css_state` | DB | |
| **`extensions/*` REACH** | **the extension source itself** | **NOT a DB axis — see below** |

#### ⛔ The EXTENSION SURFACE axis

**No block-scoped axis above can select a control injected by a universal extension**, because a
`blocks.registerBlockType` filter writes attributes at runtime and `block_attributes` only ever sees
what a `block.json` declares.

**Extension reach is opt-in per slug.** `hover` and `blockLink` are opt-IN (`enabledExtensions`):
`isExtensionEnabled()` returns true only when a `block.json` explicitly lists the slug. Derive the
reach with `grep -A3 enabledExtensions src/blocks/*/block.json`, never from a cached number. STATE's
scope (§6 field 5) is a name-matched DB count, independent of this extension's live reach.

⚠ **Reach must be derived PER SLUG from whichever mechanism currently governs that slug, never
copied from one extension to another** (`grep -c` per `enabledExtensions` listing). A reach figure
attached to any OTHER slug in this document (LINK's block-link surface, SHADOW's preset reach) must be
independently re-verified against this same allowlist.

**What is true:** `run.js` `buildCtx()` supplies `extensionsDir` AND `componentsDir` on `ctx`,
alongside `blocksDir`/`patternsDir`/`themeDir` (`git grep -n componentsDir -- plugins/sgs-blocks/scripts/inspector-scan/run.js`).
`core/components.js` exports `resolveComponentFiles()`, indexing `src/components/`, every
`src/blocks/*/components/`, AND `src/blocks/extensions/`. Rule 26 reads that corpus. LINK / STATE /
SHADOW / COLOUR are not undetectable by construction — read each contract's own Scope/Detection fields.

The argument binds on
**four** contracts, all reachable through `src/blocks/extensions/`: **LINK** (raw URL field), **STATE**
(hover attrs), **SHADOW** (a preset `SelectControl` on a shadow attr), **COLOUR** (hover colour
fields). Therefore:

> **Every contract's `Scope` field must state its extension reach explicitly, and every detection
> rule must read `src/blocks/extensions/*.js` as well as per-block `edit.js`.** A rule scanning only
> per-block `edit.js` has a blind spot the exact size of the extension roster — closed by
> `resolveComponentFiles()` for rules that use it.

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

### 1. COLOUR

1. **Canonical** — `src/components/DesignTokenPicker.js`. No competitor exists.
   `src/components/SgsColourPanel.js` is the grouped panel that mounts `DesignTokenPicker`
   rows (`rows={[{ key, label, states, gradientCapable }]}`) with Styles-tab placement — the vehicle
   for the rule this whole section states, and the adoption route. Adoption:
   `git grep -l "<SgsColourPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js' | wc -l` — derive it,
   do not cite a number. See
   `plugins/sgs-blocks/scripts/consistency/golden-controls.json` for its machine-readable shape, and
   field 9e/9f below for the placement + omission rule this component enforces.
2. **Required props** — `label`, `value`, `onChange`. `enableAlpha` and `clearable`
   **default true** in `DesignTokenPicker.js`, so the alpha/clearable requirement is satisfied by
   construction, not by call sites. `linked` only when the value should track a theme slug. `id`:
   `useInstanceId` generates one, passed to both `BaseControl id={ id }` and the inner control, so every
   colour control is named. ⚠ The IDENTICAL `id` defect is still TRUE for `IconPicker` (§10) and
   `ShadowControl` (§11) — verified separately per component; do not assume the colour fix propagated
   to either.
3. **Banned lookalikes** — `ColorPalette`/`ColorGradientControl`/`GradientPicker`/
   `PanelColorGradientSettings`; `<TextControl type="color">`.
   `GradientOverlayControl.js` imports `SgsGradientPicker` (the SGS fork,
   `src/components/gradient-picker/`), not core's `GradientPicker`. The 4
   wrapper blocks (`container`, `hero`, `trust-bar`, `cta-section`) reach the fork, not the lookalike.
4. **Tab — SETTLED. Do not re-derive.**

 **(a) WHICH TAB — Styles.** The Colour panel renders in the **Styles** tab, first, above
   Background. The framework **never uses native colour supports** — it
   replicates the native control's look and sets `supports.color` sub-flags `false` — so the real rule
   is that **Styles holds root CSS and visuals**, which is why the Background panel (media uploads
   included) lives there. A colour is a visual.

 **(b) WHICH PANEL — the shared panel.**
   Every colour lives in the one shared `SgsColourPanel` (the gradient-colour helper set —
   `fillRow`/`textRow`, the `gradientCapable` row shape, `sgs_resolve_text_colour_or_gradient()` and
   friends — lets every fill/text/link colour live in ONE shared panel without losing gradient/hover
   capability per row).

   **THE RULE: every fill/text/link colour on a block lives in the shared
   `SgsColourPanel`.** The only exemptions are border colour, media/section overlay colour, and
   shadow colour — those stay in their own dedicated composite controls (`SgsBorderControl`, the
   overlay controls inside a background/media panel, `ShadowControl`) because each pairs a colour
   with a genuinely non-colour sibling control (style/width, opacity/blend-mode, blur/spread) that
   `SgsColourPanel` has no slot for. A colour with no such pairing — including one a caller might
   be tempted to leave "scoped to its own element panel" for tidiness — belongs in the shared
   panel. Do not add "element-scoped colour belongs in its own TIER 1 panel" placement language.
   Canonical statement: `SgsColourPanel.js`'s own
   docblock (`plugins/sgs-blocks/src/components/SgsColourPanel.js`), the file to re-read if this rule
   is disputed. `placement-reach.py` resolves the TIER-2/property-family split for every OTHER property
   family; colour is the one family it does not decide placement for.

   ⭐ **Leaf blocks group by construction, not by exception.** `sgs/button`'s `colourText`,
   `colourBackground` and `colourBorder` all sit on the same element (`wrapper`), so they render side
   by side in one panel — the compare-and-contrast case — while `iconColour` sits
   with the `icon` element, which is genuinely a different thing.

 *(Placement and SHAPE stay independent axes — see field 9a. Moving a colour must never change what
 the control looks like.)*
5. **Scope** — eligibility `surfaces.colour` (see the scoping axes table); detection target
   `role='color'`. Re-run the `role='color'` count (via `/sgs-db`) before quoting a gap size.
6. **Conformance** — `sgs/star-rating` mounts `SgsColourPanel`. Conformance against the single-state
   shape is not conformance to field 9's state+shape rule — see field 9's note on rollout.
7. **Detection** — extend `inspector-scan/core/components.js` with a `writesColour` flag derived
   from each component's own source, exactly as `wrapsImage` already works for rule 18. This
   resolves indirect/shared-component cases transitively and catches lookalikes by semantic.
8. **Gradient stops are palette-linked.** Native `GradientPicker` is REPLACED, not kept —
   `SgsGradientPicker` (`plugins/sgs-blocks/src/components/gradient-picker/`), forked from the same
   pinned Gutenberg SHA the colour-picker fork uses, mounts the SGS `ColorPalette` above the raw picker
   in each stop's popover (SGS composes its own colour popover — `DesignTokenPicker` = `Dropdown` +
   native `ColorPalette`, not WP's sealed `GradientPicker` — which makes a palette-capable stop editor
   cheap). A stop picked from the palette stores `var(--wp--preset--color--<slug>)`. Tab placement:
   Styles (same as every other colour). Storage: ONE string attribute per gradient holding the
   complete CSS value, not this contract's per-scalar `DesignTokenPicker` shape — gradient stays its
   OWN control type. Shipped on the overlay blocks; the universal rollout across all colour-capable
   blocks is tracked as `P-GRADIENT-UNIVERSAL-ROLLOUT` (`LEDGER.md`/`parking.md`), not yet done.

8a. ⭐ **Gradient is THREE mechanisms, element-dependent, not one.** Which mechanism is correct depends on
   what the row PAINTS:

   - **Per-state toggle inside `DesignTokenPicker`** — background / border / icon gradients, via a
     sibling `{attr}Gradient` string attribute carried on the state entry (`gradientValue` +
     `onGradientChange`). This is field 9's row shape with its Solid/Gradient toggle.
   - **`GradientCapableColourControl`** — TEXT gradients specifically. Text needs
     `background-clip:text`, a genuinely different CSS mechanism from a painted background/border, so
     it cannot reuse the state-toggle path above. Reached only via a `SgsColourPanel` row declaring
     `gradientCapable: true` — never mounted directly.
   - **`GradientOverlayControl`** — whole-block background overlay, SINGLE-STATE BY CONSTRUCTION (it
     has no states concept at all). A row that needs hover cannot use this one.

 **Enforcement must therefore be mechanism-aware, not binary.** Checking merely "does a gradient
   path exist somewhere for this row" would pass a TEXT row wired to the background mechanism, which
   renders nothing — the row would show green while the client's gradient never appears. This is a
   required refinement to rule `31-golden-colour-control`'s `row-missing-gradient` finding kind, not
   yet built into it. Source: `golden-controls.json`'s `controls.colour.canonical` block, which
   already separates these three by name.

9. ⭐ **THE STATE + SHAPE RULE. This is the load-bearing addition to this
   section and it binds every colour in the framework, wherever it lives.**

   Three binding clauses:

   - **9a. ONE CONTROL SHAPE, EVERYWHERE.** Every colour renders as the same thin row: a compact
     rectangular control carrying its swatch(es), showing **how many states are pickable for that
     setting**, with the picker itself in a **popover**. This holds regardless of where the control
     sits — an element-scoped colour that stays in its element's own panel (only the
     border/overlay/shadow exemption class — see field 4b) uses the identical row. Placement
     and shape are independent axes; moving a colour must never change what it looks like.
   - **9b. STATES LIVE INSIDE THE CONTROL, NEVER BESIDE IT.** Normal / hover / active are reached by a
     tab toggle **within the popover**, not by separate sibling controls and not by a second panel.
     ⛔ A distinct `*Hover` colour control mounted next to its resting
     twin is not permitted. It also means a compound property's colour half (shadow colour being the named case) is set
 **in the colour row**, where the state toggle already handles hover — not as a lone field on the
     shadow builder.
   - **9c. ⛔ A COLOUR IS NEVER AN OPTIONAL `ToolsPanelItem`.** It must not sit behind the "+"
     disclosure menu, and it must not be hideable per instance. This is a deliberate, named exception to A5's
     progressive-disclosure guidance — A5 governs control density in general; colour is carved out of
     it. A client hunting a "+" menu to find a colour is the defect A5 was meant to prevent, arriving
     by A5's own mechanism.


 **Why it is a contract clause and not a tidy-up.** "The same property behaves identically
   everywhere" is what this clause makes checkable: colour is squarely inside the EXPECTED uniformity
   set.

   ✅ **BUILT.** `src/components/DesignTokenPicker.js` has the state axis (`hasStates =
   states.length > 1`), a `TabPanel` across states when `hasStates`, and a per-state Solid/Gradient
   `ToggleGroupControl` for any state carrying `onGradientChange`. All three elements 9a names — the
   thin swatch row, the in-popover state tab toggle, the popover itself — are live in the component.
   What remains open is the ROLLOUT, not the component: a colour row that calls the component with no
   `states` prop still renders the single-state shape, which the same file serves byte-identically from
   one default export. The machine-checkable form of this clause is field 9d below.

9d. **Machine-checkable form.** `plugins/sgs-blocks/scripts/consistency/golden-controls.json`
   encodes this field's colour contract as DATA — canonical components, banned lookalikes, minimum
   states, gradient-with-declared-exemptions, scope predicate, plus a native-core-colour fingerprint —
   so enforcement measures against data rather than prose. Enforced by `inspector-scan` rule
   `31-golden-colour-control` (advisory; re-derive findings with
   `node scripts/inspector-scan/run.js --check`). Read the JSON for the exact figures; do not
   transcribe them here.

9e. ⭐ **THE PANEL-SCOPE RULE — one `SgsColourPanel` per block; a row that doesn't apply is OMITTED,
   never disabled.**

   Every block that mounts `SgsColourPanel` mounts it **exactly once**
   (`for f in $(git grep -l "<SgsColourPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'); do grep -c "<SgsColourPanel" "$f"; done | sort | uniq -c`
   returns a single count of 1). Field 4b's "an element-scoped colour belongs in its element's
   TIER 1 panel" therefore does NOT mean a separate literal panel per element — it is satisfied by
   which ROW a block declares and how that row is grouped/labelled inside the one panel instance, not
   by multiple `SgsColourPanel` mounts. `SgsColourPanel.js`'s own docblock states this directly: every
   call site mounts this component exactly once per block, so that placement question belongs to each
   caller's `rows` array, not to that file.

   A colour row that applies only to some variants or configurations of the block (e.g. an icon
   colour when the marker doesn't render an icon/emoji glyph; a border colour when no border style is
   selected) is **omitted from the `rows` array**, never rendered-and-disabled and never hidden by
   CSS. `SgsColourPanel` filters `rows.filter(Boolean)` (`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel`) so a
   falsy array entry silently drops before render — this is the mechanical form of 9c's disclosure ban,
   extended from "never behind a '+' menu" to "never present-but-inapplicable at all". Reference
   implementation: `sgs/icon-list` (`plugins/sgs-blocks/src/blocks/icon-list/edit.js`), whose own
   inline comment says both the icon-colour and border-colour rows are OMITTED (not disabled) when they
   don't apply.

9f. ⭐ **THE ELEMENT-PANEL EXCEPTION — `SgsBorderControl` is the one purpose-built case; no general
   mechanism exists.**

   9e's "one panel, all rows" holds everywhere except one control. `SgsBorderControl` (§14) pairs a
   border colour with its non-colour siblings — width, style, radius — on shared popover lines, and
   renders inside the consuming element's OWN panel rather than the shared `SgsColourPanel`. This
   works because `SgsBorderControl` is a self-contained composite that renders its colour swatch
   internally; it does not reuse `SgsColourPanel` or its `rows` shape, so it does not compete with or
   fragment the single-panel rule above.

   **A general element-panel colour mechanism — so a second composite besides
   `SgsBorderControl` could pair colour with non-colour controls on shared lines — is NOT built and
   requires a design gate before any block adopts it.** `SgsColourPanel` hardcodes its own
   `InspectorControls group="styles"` + `PanelBody title="Colour"`, and no block renders a colour
   control directly inside an element panel outside `SgsBorderControl`. Do not build a second one ad
   hoc per block on the strength of `SgsBorderControl` existing as precedent — get the design gate
   first.

### 2. LINK

The canonical LINK control is the popover-based `LinkPopoverControl` (as on `sgs/button`), applied
everywhere a hyperlink option exists — including the block-link extension's link input.
`SgsLinkControl`'s INLINE mount is not canonical.

1. **Canonical** — `src/components/LinkPopoverControl.js`. Two exports: `LinkPopoverContent` (the
   `<Popover>` primitive — mount when a block needs MULTIPLE triggers sharing one popover instance,
   e.g. `sgs/button`'s toolbar button + sidebar row) and `LinkPopoverField` (self-contained
   trigger-row + popover in one component — the common single-trigger case). Root-caused the same
   two defects `SgsLinkControl`'s docblock already named (core `LinkControl`'s 350px floor overflowing
   a ~248px inline panel; staged `settings` toggles with no blur/close commit) by moving off the
   inline mount onto core's own designed home for `LinkControl` — a popover with a real Submit
   interaction, matching `core/button`. Neither Kadence nor Otter mount `LinkControl` inline in a
   sidebar panel either.
2. **Required props** — `LinkPopoverField`: `label`, `value`, `onChange`. Two value shapes: object
   `{ url, linkId, linkKind, linkTarget, rel, download }` (default) or bare string (`searchOnly`).
   `targetMode` ('enum' 4-value _self/_blank/_parent/_top, or 'boolean' open-in-new-tab) selects which
   target shape a consumer's schema actually declares — **do not default to 'enum' for a boolean-typed
   schema attr**, that's exactly the "flat value on an object attr" coercion-trap class of bug.
   `enableInternalResolution` opts a consumer INTO `linkId`/`linkKind` render-time ID resolution — off
   by default (only `sgs/button`'s `render.php` resolves them today).
3. **Banned lookalikes** — `<TextControl type="url">`; `<URLInput>`; `SgsLinkControl`'s inline mount
   for any NEW consumer.
4. **Tab** — unchanged: `settings` when the control styles nothing and lands in the pinned `Settings`
   panel; an element-scoped link (e.g. `sgs/icon`'s own Link panel) stays in that element's TIER 1
   panel regardless.
5. **Scope** — the blocks with a navigational link field, plus the `blockLink` extension surface
   (`grep -A3 enabledExtensions src/blocks/*/block.json`). Reach must be re-derived per slug from
   whichever mechanism currently governs that slug — see the EXTENSION SURFACE axis above.
6. **Conformance** — Migrated to `LinkPopoverControl`: `sgs/button` (dual-trigger,
   `LinkPopoverContent` direct), the `blockLink` extension (`LinkPopoverField` + `renderExtraFields`
   for its bespoke accessible-label field), `sgs/icon`, `sgs/media`, `sgs/product-card` (3 fields,
   `searchOnly`). `SgsLinkControl` has 0 JSX mounts tree-wide
   (`python scripts/surveys/survey-control-mounts.py .`); rule 27 (`27-superseded-link-control.js`) is
   `mode: gate` at `openBacklog: 0`.
7. **Detection** — `inspector-scan/rules/08-raw-url-link.js` flags `<TextControl type="url">` and
   `SgsLinkControl` JSX elements, and `27-superseded-link-control.js` flags any NEW
   `<SgsLinkControl>` JSX usage (`mode: gate`).
8. **Open** — is `google-reviews.reviewRequestUrl` genuinely config, or a link a visitor follows?
   Does `whatsapp-cta.phoneNumber` deserve its own PHONE contract?

### 3. ENUM / MODE

1. **Canonical** — no shared component. `SelectControl` over a **declared `block.json` enum** is the
   de facto standard; `ToggleGroupControl` for short option sets.

   ⭐ **THE THRESHOLD** — **derived from the corpus, not chosen**:

   | options | longest label | shape | why |
   |---|---|---|---|
   | 2–4 | ≤ 12 chars | **`ToggleGroupControl`** | every option visible at once; one tap, no menu |
   | 2–4 | > 12 chars | `SelectControl` | TGC does not wrap, so long labels overflow the row |
   | **5** | any | **either — neutral** | both shapes correct; the gate records no opinion |
   | 6–10 | any | `SelectControl` | past ~6 TGC cannot fit a single row at all |
   | > 10 | any | `ComboboxControl` | searchable; scanning a 12-item menu is the anti-pattern |
   | multi-value | any | `FormTokenField` | unchanged from §125 |

   ⚠ **The enforced band is 2–4, and FIVE is neutral.** Five short options is
   the one genuine judgement call in this table: it is the width at
   which a segmented row starts to crowd a narrow inspector sidebar, and where a dropdown stops
   feeling heavy-handed. Both shapes are defensible there, so enforcing either produces churn
   without improving the client's experience. The rule declines to have an opinion rather than
   booking the difference as debt. The 6-option ceiling below is derived, not chosen — the
   neutral five narrows the *enforced* band, it does not move the evidence-backed bound (see
   `check-enum-control-shape-baseline.json` `_meta.bandAmended`).

   **Where each bound comes from — none of it is taste:**
   - The **6-option ceiling** is not a preference: `ToggleGroupControl` **does not wrap**, which is
     precisely why core itself falls back to `Button isPressed` past 6 options. Already recorded in
     `decisions.md`; this table only applies it.
   - The **>10 Combobox** bound is §125's existing guidance, unchanged.
   - ⭐ **The 12-character figure is EMPIRICAL.** It is the longest label among the
     `ToggleGroupControl` mounts that already ship and demonstrably work — `nav-drawer.closeStyle`,
     whose longest option is `burger-morph` at exactly 12. The number was not picked and then
     justified; it was read off what fits.

   **Measured corpus:** `python scripts/surveys/survey-enum-control-shape.py` reports the declared enum
   attributes, how many carry 2–5 options, and how many render as `SelectControl` vs
   `ToggleGroupControl` — §125's "giant Select" anti-pattern is the norm rather than the exception.
   Do not quote a cached figure.

   ⚠ **TWO LIMITS, stated so the gate is not built on them unexamined:**
   - The survey resolves fewer than half of the declared enums; the rest are dynamically keyed,
     mounted through a shared component, or ambiguous. Those are the instrument's blind spot — **not**
     findings, and never to be counted as compliant.
   - It measures the enum **SLUG**, whereas the rendered **LABEL** is what actually constrains the
     row width. Validated on the binding case (`burger-morph` → "Morphed icon", both 12 chars), but
     that is n=1. ⛔ **The gate that enforces this table MUST measure the rendered label, not the
     slug.** The census may use the proxy; an enforcing gate may not.

   ⭐ **THE GATE: `scripts/check-enum-control-shape.py`.** It is a SEPARATE instrument from the
   census, not a wrapper around it, precisely because the census's slug proxy is
   forbidden here: it reads the actual rendered JSX text (`ToggleGroupControlOption label={ __(
   '...' ) }`, and `SelectControl`'s `options={[...]}` inline array or `options={IDENTIFIER}`
   resolved to its module-level `const` definition) for every 2–5-option enum, and classifies the
   6–10/>10 bands by count alone (label extraction isn't load-bearing there). Cases the census cannot
   resolve are carried as explicit `skip` entries with a machine-readable reason (`unresolved-binding` /
   `shared-component` / `ambiguous-binding` / `label-extraction-failed`) — never silently counted as
   compliant.

   ⚠ **Reading rendered labels instead of slugs finds FEWER violations than the census's slug proxy
   predicts:** many `SelectControl`s in the 2–5 band have a rendered label genuinely longer than 12
   characters despite a short slug — `SelectControl` is the CORRECT shape for those. The real
   violations are baselined (`scripts/check-enum-control-shape-baseline.json`) and ratcheted —
   `--check` fails only on a NEW violation.
2. **Required props** — `value` bound to the attr; `options` matching the declared `enum` **exactly**.
3. **Banned lookalikes** — (a) a shared aggregator offering options outside the consuming block's
   enum; (b) a PHP-enforced closed set with no `block.json` enum (free-text box, no validation).
4. **Tab** — `settings`, explicitly, not by relying on the default.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — rows with declared enums (`python scripts/surveys/survey-control-mounts.py .`); string
   rows are the search space, not the violator count.
6. **Conformance — the failure class on ONE shared control (`LayoutPanel`'s `kind="layout"`):** a
   shared control offering hardcoded options outside a consuming block's declared enum leaves the
   picker permanently broken or inert (an enum `full|split` against a picker `stack|flex|grid` has
   **zero overlap**); a PHP-enforced closed set with no `block.json` enum enforces nothing in the
   editor; a block that hardcodes `$attributes['layout'] = 'grid'` before calling the wrapper leaves
   the control live, visible and inert. `sgs/gallery` fixes this for itself via `showLayout={false}`.
   Enumerate live instances with the field 7 detection; do not cite a cached list.
7. **Detection** — diff a shared control's hardcoded option values against each consuming block's
   declared enum. Generalises to any future aggregator; needs no per-block knowledge.
8. **Open** — should `LayoutPanel` build its options **from the consuming block's own enum** instead
   of a fixed list? That makes the class of bug structurally impossible. Shared-mechanism → Rule 7
   design gate.

### 4. LENGTH / UNIT

1. **Canonical** — `<ResponsiveControl>` wrapping `<UnitControl>` with a real `units` array
   (R-22-13). Object-cascade blocks use `<ResponsiveOverride>` instead. Do not blend the two.
2. **Required props** — real `units`, never px-only. Responsive wrapping REQUIRED when the attr
   family declares Tablet/Mobile siblings. **Label association REQUIRED** — see §10.
3. **Banned lookalikes** — raw-px `RangeControl` (the only hits are the
   shadow builder's sliders, which are correct); `SelectControl` writing a `*Unit` attr (already
   gated); a `TextControl` standing in for `UnitControl` — see §14 field 6 for the raw-text census (0 remaining); `cardRadius` is not a violation.
4. **Tab** — `typography` for font-size/line-height, `dimensions` for spacing, `layout` for grid
   geometry. All Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `is_responsive=1 AND css_property IN (<length set>)`.
6. **Conformance** — the `TypographyControls` consumers conform. Re-derive violators (blocks with no tab
   split; attributes declared + rendered with no control) via `inspector-scan` rules 01 and 21.
7. **Detection** — join `css_property` against a length allowlist, then assert the innermost control
   is a `UnitControl`.
8. **Open** — spacing-token scale is unbuilt; does the contract require it once it exists?

### 5. 4-VALUE BOX

1. **Canonical** — `ResponsiveBoxControl` (4 sides) / `ResponsiveBorderRadiusControl` (4 corners);
   `ResponsiveBoxControls` (plural) for object-cascade rows.
2. **Required props** — `values` per tier, `onChange(tier, next)`, real `units`.
3. **Banned lookalikes** — per-side scalars (none remain); regex side-token
   grouping in the converter (already gated, converter-side only — nothing guards editor code).
4. **Tab** — `dimensions` (padding/margin) / `border` (width, radius). Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — DB-classified `box_family` blocks ∪ grep-matched `BoxControl` blocks; run both, the two
   sets differ: `before-after`/`media` use `ResponsiveBorderRadiusControl` (no "BoxControl"
   substring), and some blocks have live box controls with `box_family` NULL.
6. **Conformance** — the failure to look for: a block that declares responsive box attrs, passes them
   to `SGS_Container_Wrapper` (which renders them), and whose `edit.js` exposes no control for them.
   `inspector-scan` rule 21 (`render-without-control`) finds it.
7. **Detection** — must NOT rely on `box_family` alone (it under-populates); add a code-derived
   cross-check on the attr's object shape.
8. **Open** — renaming the singular/plural pair (`ResponsiveBoxControl`/`ResponsiveBoxControls`)
   severs `check-dead-controls`' prop-name bindings; a gate is needed first.

### 6. STATE / HOVER

1. **Canonical** — the `states`-prop route: `SgsColourPanel` rows → `DesignTokenPicker`'s `states` prop (e.g. `button/edit.js`). There is no separate state-toggle component (Part I).
2. **Required props** — one toggle per logical attr GROUP, not per attribute; the render-prop must
   cover **every** paired attr in both states.
3. **Banned lookalikes** — a separate "Hover" panel; adjacent "X" and "X (hover)" controls; **a `*Hover` attr with no
   control at all**; preset-only reachability (`product-card`).
4. **Placement** — the state value sits **inside the same control group as its base value**. This is
   how `theme.json` nests pseudo-states under the element, and how the block's own PHP helpers
   already build `:hover` from the same `$prefix`.
5. **Scope** — `attr_name LIKE '%Hover%' OR css_state IN ('hover','current','scrolled')`, excluding
   `sgs/mega-panel.accent` (a colour-scheme picker, mistagged).
   ⚠ Use `%Hover%`, not `%Hover` — the suffix form misses `business-info.linkHoverColour`.
   ⚠ `trust-bar.autoScrollPauseOnHover` and `team-member.overlayHover` are **behavioural flags, not
   state pairs** — a name-only rule false-positives on both.
   ⚠ `table-of-contents.activeLinkColour` is a genuine `current` state that **name-matching cannot find**. A new semantically-named state with `css_state`
   NULL would be invisible to every method here.
6. **Conformance** — examples that use the `states`-prop route: `brand-strip`, `button`, `nav-bar-menu`.
7. **Detection** — three separate rules, not one: `state-attr-no-toggle`, `state-attr-unreachable`,
   `state-attr-preset-only` (park the third — one instance cannot prove the shape, per R-31-9).
8. **Migration needs ZERO schema change.** Every attr already exists with its
   current type; the `states`-prop route reads/writes the same keys. No
   version bump, no deprecation (pre-production).

### 7. MEDIA

1. **Canonical** — `src/components/MediaPicker.js` + `MediaGalleryPicker` for bulk.
   ⚠ `MediaPicker` is **not barrel-exported**; consumers import by path.
2. **Required props** — `MediaUpload` always inside `MediaUploadCheck` (keep the gate); alt text; the D5 tier rules. **A reused picker sub-control renders an optional child only
   when that invocation supplies both `value` and `onChange`**.
3. **Banned lookalikes** — per-tier duplicate pickers instead of one `ResponsiveControl`-wrapped
   picker: `sgs/responsive-logo` renders **three always-visible** logo slots (retrofit open — field 8).
4. **Tab** — `settings`; `content` for collection/repeater media.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `surfaces.media` (see the scoping axes table) is the eligible pool. The blocks declaring
   `supports.sgs.imageControls` are a **conformance subset, not the pool**. Rule 18's own
   `wrapsImage` resolution is MORE precise than the DB proxy — do not regress it.
6. **Conformance** — tier types match base types and no block tiers its alt text;
   `responsive-logo` is the exception (it predates the D5 pattern).
7. **Detection** — two D5 clauses are checkable from `block.json` alone: **tier/base type mismatch**
   and **alt-role attr with a Tablet/Mobile suffix**. Neither exists as a rule. The video-swap
   return path and per-width paint need the live first-paint capture bar.
8. **Open** — retrofit `responsive-logo`? Fold `showAlt` into `MediaPicker` and retire the local copy?

### 8. BOOLEAN

1. **Canonical** — `ToggleControl` for enable/disable;
   `ToggleGroupControl` when the states are **named alternatives** (`overlayGradient` → "Solid /
   Gradient" is CORRECT, not a violation); `CheckboxControl` **only** for a boolean scoped to one
   item in a repeated list.
2. **Required props** — `label`; `__nextHasNoMarginBottom`.
3. **Banned lookalikes** — a 2-option `SelectControl` driving a boolean; a `RadioControl` with two options; literal "On/Off" toggle groups.
4. **Tab** — **element-scoped → that element's panel in Settings (THE PLACEMENT RULE, TIER 1).**
   Root-scoped (no element): resolves to its TIER 2 property-family panel via
   `cluster-member-sets.json`, UNLESS the boolean styles nothing — e.g. `autoplay`,
   `showDots`, `required` — in which case it takes the pinned-first `Settings` panel. A
   "behaviour → Settings; appearance → Styles" root-scope split is not the rule and must not be read
   as one.
5. **Scope** — boolean rows in `block_attributes`.
6. **Conformance** — boolean rows with no recorded control are **not asserted as defects**; they need
   per-row triage.
7. **Detection** — classify the component bound to each boolean attr; `ToggleGroupControl` writing a
   literal boolean is a *candidate*, not a violation.
8. **Open** — whether a 2-option group reads as enable/disable or as alternatives is a label
   judgement, not an AST fact. Advisory only.

### 9. FREE TEXT / BARE NUMBER

1. **Canonical** — `TextControl` for short single-line config; `TextareaControl` for long-form;
   `NumberControl` for unbounded or precision-typed numbers; `RangeControl` for coarse bounded
   values. **A number with a CSS unit is a LENGTH, not a bare number.**
2. **Required props** — `__next40pxDefaultSize` on `TextControl` and `NumberControl` (44px targets).
3. **Banned lookalikes** — free text where a closed set exists (→ ENUM); free text driving a colour
   (`star-rating`) or typography; a bare unitless `NumberControl` for a font size — a direct breach of the
   mandatory `TypographyControls` rule.
4. **Tab** — **element-scoped → that element's panel in Settings (THE PLACEMENT RULE, TIER 1)** — an
   element's text content and its appearance numbers sit in the SAME panel, not opposite tabs.
   Root-scoped (no element): resolves to its TIER 2 property-family panel via
   `cluster-member-sets.json`, UNLESS the field styles nothing (e.g. `tagName`), in which
   case it takes the pinned-first `Settings` panel. A "content/behaviour → Settings;
   appearance numbers → Styles" root-scope split is not the rule.
5. **Scope** — string rows and number/integer rows in `block_attributes`.
6. **Conformance** — **the content split is SOUND**: body content lives in-canvas via `RichText`,
   sidebar text fields are genuinely short labels. Validated pattern, not a gap.
   ⚠ Number rows with no recorded control are NOT asserted as defects; triage needed.
7. **Detection** — cross-reference each control's target attr against `role`/`css_property`.
8. **Open** — retype the string-typed font sizes to number?

### 10. ICON

1. **Canonical** — `src/components/IconPicker.js`. No competitor exists.
2. **Required props** — `label`, `value`, `onChange`. **`id` REQUIRED** —
   the same `BaseControl`-without-`id` defect as COLOUR and LINK applies.
3. **Banned lookalikes** — a `SelectControl` over a hardcoded icon-name list; a `TextControl` taking
   a raw icon slug; an emoji/character field standing in for an icon; a per-item icon picker inside a
   repeater that is not this component (`form-field-tiles`, `pricing-table` both mount the real one —
   listed so a future repeater cannot claim novelty).
4. **Tab** — `settings` when the icon carries meaning (a list marker, a nav affordance);
   `styles` when it is decoration on an already-labelled control. *(Subordinate to THE PLACEMENT
   RULE: this Tab field only governs a control that STYLES NOTHING and lands in the pinned
   `Settings` panel. A control with a real property family resolves to its TIER 2 family
   panel via `cluster-member-sets.json` instead. An element-scoped control goes in its element's
   panel (TIER 1) regardless of this field.)*
5. **Scope — `block_capabilities` capability `icon-picker`, declared via
   `supports.sgs.iconPicker`.** ⛔ **Never scope this contract by `role LIKE 'icon-%'`** — that role
   family is the converter's icon-SOURCE discriminator, a different question; widening the role would
   break the converter's arm.
   ⚠ The census must scan **past `edit.js`** — `sgs/cart` mounts the picker from
   `TriggerSettingsControls.js`, so a per-block `edit.js` scan under-reports. See the EXTENSION
   SURFACE axis.
6. **Conformance** — census by field 7; the `id` requirement is the axis to check.
7. **Detection** — census `<IconPicker` across `src/blocks/**/edit.js` **and `src/blocks/extensions/*.js`**;
   assert every mount passes `id`. Lookalike detection via a `writesIcon` flag on
   `inspector-scan/core/components.js`, derived from the component's own source (the `writesColour`
   pattern), so an indirect mount through a shared wrapper resolves transitively.
8. **Open** — does the `icon-*` role widen, or does a new declarative flag carry "uses IconPicker"?
 **This is Tier 0 (d) and it is a design gate, not a backfill.**

### 11. SHADOW

1. **Canonical** — `src/components/ShadowControl.js`, storing a **CSS string**
   (X/Y/blur/spread/colour+alpha/inset).
2. **Required props** — `label`, `value`, `onChange`. **`id` REQUIRED.**
3. **Banned lookalikes — this type's list is the whole point, because rule 07 sees exactly one of
   them:**
   - a **preset `SelectControl`** (None/Small/Medium) writing a shadow attr — *the only shape rule 07
     inspects*;
   - a preset `SelectControl` on a shadow attr via `extensions/hover-effects.js`'s `hover`
     extension (opt-in via `enabledExtensions`; derive its reach with
     `grep -A3 enabledExtensions src/blocks/*/block.json`). The shape itself — a preset select standing
     in for `ShadowControl` — is banned wherever it occurs block-locally;
   - **a bare `TextControl` asking for raw CSS** — a direct breach of the framework's own
     non-negotiable that no setting may require touching code;
   - **a hand-rolled builder storing an object** where the shared component stores a string —
     duplicated lines, incompatible shape;
   - **no control at all** — a block that declares and renders `boxShadow`/`boxShadowHover` and
     exposes nothing. Rule 07 cannot see this class by construction.
4. **Tab** — `styles` (it is appearance), inside the border/effects grouping.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `css_property LIKE '%shadow%'` across `block_attributes`, **plus** the extension
   surface. Rule 07 sees only preset selects, so its count under-reports; re-run the query for the
   footprint.
6. **Conformance** — classify per field 7's five buckets; `ShadowControl` is the compliant shape
   (Part I lists the blocks on it).
7. **Detection** — census from the DB, then classify each attr's control in `edit.js` as
   *compliant / preset-select / raw-text / duplicate-builder / **no-control***. Five buckets, not a
   boolean. The fifth is the fourth quadrant and needs the render-without-control rule.
8. **Open** — any object-storage mode for `ShadowControl` is a shared-mechanism change → **Rule 7
   design gate.**

### 12. THE RESPONSIVE WRAPPER FAMILY

> ### ⭐ The wrapper is responsive GENERICALLY — read before acting on this section
>
> **The shared wrapper is responsive GENERICALLY**: fix the wrapper once so every block that uses it
> needs no individual fixes that require forking. Six layout properties (`alignContent`,
> `justifyContent`, `justifyItems`, `flexDirection`, `flexWrap`, `gridAutoRows`) are tier-capable as
> **six array rows**, not new code: `sgs_emit_responsive_css()` is generic (atoms → tier cascade →
> tier-diff). Adding another property is one row.
>
> **No conflict with this spec's purpose.** "Make every property responsive" does not contradict
> Spec 35's goal of shrinking the control surface, **because of the one global device toggle**: a
> `<ResponsiveControl>` renders ONE control at a time, so a tier adds **zero** visible controls. The
> surface only grows if tiers render side by side — the banned lookalike in field 3 below. ⛔ Do not
> re-litigate this as a cost/benefit.
>
> **TWO INDEPENDENT AXES:**
>
> | Axis | Shape | Applies to |
> |---|---|---|
> | **TIER** | `{desktop, tablet, mobile}` | **ANY** property, including text colour |
> | **BOX** | `{top, right, bottom, left}` | ONLY genuinely per-side props (padding, margin, border-width, border-radius) |
>
> A property may have one, both or neither. Text colour cannot be a per-side box but CAN have
> tiers. Field 6's "three incompatible STORAGE shapes" are being collapsed onto the TIER object;
> the BOX axis is orthogonal and stays.
>
> **Census, not guesswork:** `npm run survey:responsive-shape` separates real migration candidates
> from families that are CORRECT as-is: `asset_like` (a per-tier ASSET is a different resource per
> device, not a cascade — `sgs/media`'s tiers are a deliberate runtime swap) and `flag_like`
> (conjunctive per-device flags the operator must see together).
>
> ⛔ **Not yet tier-capable:** the six `gridItem*` properties plus `shadow` emit as CSS CUSTOM
> PROPERTIES on a different selector and need their own tier plumbing. There is no
> `contentBandBackground` attribute: a background fills its CONTAINER and is never clipped to the
> inner band.
>
> ⚠ **Landmine:** a tier object reaching a LEGACY scalar read causes a PHP "Array to string
> conversion" on every render. `gridAutoRows` is guarded; its siblings are safe via strict
> `in_array()` allowlists. **Check the legacy read before making any further property tier-capable.**

1. **Canonical** — **`ResponsiveControl`** (flat per-tier attrs) and **`ResponsiveOverride`**
   (object-cascade rows). ⛔ These two are the **only** sanctioned primitives, and that is not this
   document's opinion — **`lint-responsive-controls.py` is a WIRED prebuild gate naming exactly these
   two**. Any reshape proposal that renames or removes either must change that gate in
   the same commit or it will fail the build.
2. **Required props** — a per-tier `value`/`onChange(tier, next)` pair; the wrapped control supplies
   its own `units`. **Label association REQUIRED on BOTH** — `ResponsiveControl` and
   `ResponsiveOverride` must associate their label: a `useInstanceId()` id on the label span plus
   `role="group" aria-labelledby` around the render-prop output — a GROUP association, because the child
   control is caller-supplied and cannot be trusted to label itself.
3. **Banned lookalikes** — per-tier duplicate controls rendered side by side instead of one wrapped
   control (`responsive-logo` renders three always-visible logo slots); a bespoke
   `DeviceTabs`; a third breakpoint of any value (**the 768/1024 lock — carried obligation 11**);
   blending `ResponsiveControl` with `ResponsiveOverride` on one attr family.

   ⛔ **THE PAIRING IS BINDING.** The primitive
   must match the STORAGE SHAPE of the family it writes, and the two are chosen together or not at
   all:

   | Storage in `block.json` | The only correct primitive |
   |---|---|
   | scalar base **with** `Tablet`/`Mobile` sibling attrs | `ResponsiveControl` |
   | `"type": "object"` base, **no** siblings | `ResponsiveOverride` |

   A mismatch is not a style question, it is **destructive and silent in both directions**. If a
   shared control still writes `gap`/`gapTablet`/`gapMobile` through `ResponsiveControl` after `gap`
   migrated to the object shape, the two sibling attrs no longer exist, so WordPress discards them
   without error; and the desktop branch writes a STRING into an object-typed attr, which coerces to
   the default and **destroys the whole setting**. Nothing fails, nothing warns.

 **Therefore, whenever a family's storage shape changes, every control writing it changes in the
   SAME commit, and the result is proven in the LIVE EDITOR** — register, render, write, assert the
   stored shape, assert no flat siblings, assert zero console errors. A frontend check cannot find
   this, because a programmatically-set value is already the right shape and never exercises the
   inspector. Search every writer across `edit.js`, `components/` and `extensions/` — a shared
   component is the high-risk case precisely because one file serves many blocks.
4. **Tab** — inherits the tab of whatever it wraps. The wrapper never changes placement.
5. **Scope** — `block_attributes.is_responsive=1`, **plus** any attr family declaring
   `Tablet`/`Mobile` siblings that the column has not caught.
   ⚠ **Two traps:** literal-name matching MISSES `brand-strip`
   (tier keys built dynamically in PHP in `helpers-typography.php`) and FALSE-POSITIVES on
   `fontSizeTablet` (built by computed key in JS).
6. **Conformance** — the cascade resolver underneath is genuinely unified (`resolveTier()`, client +
   PHP). **Do not "fix" that.** What is real: three incompatible STORAGE shapes (flat per-tier attrs,
   dominant; one nested `{desktop,tablet,mobile}` object per FR-37-16, read by
   `sgs_responsive_normalise_object()` which **has no concept of the `base` key** `ResponsiveBoxControl`
   uses internally — no live call site crosses them, so the landmine is unarmed, not disarmed; and
   flat boolean-or-null tiers).
7. **Detection** — assert every attr family with `Tablet`/`Mobile` siblings mounts one of the two
   canonical wrappers; assert no third breakpoint constant appears. ⚠ Must tolerate computed keys in
   both directions — see the two traps in field 5.
8. **Open (all Rule 7 design gates, none to be built from this document):**
   - `ResponsiveControl` ships a complete `isInherited`/`resolvedValue`/`onReset` API with **zero
     callers**, while `ResponsiveOverride` solves the same problem with 8. ⛔ **That API is
     intentional (a Spec 35 deliverable) — it is NOT dead code, and deleting it needs a gate.**
   - `ResponsiveTriStateControl` vs `BooleanResponsiveControl` are **not** an accidental fork —
     the latter's header states the shape incompatibility IS the reason both exist.
   - `ResponsiveBoxControl` vs `ResponsiveBoxControls` — one letter apart, zero shared code.
     ⛔ Renaming the plural severs `check-dead-controls`' prop-name bindings.

### 13. CONTROLS WITH NO CONTRACT YET (enumerated so none is "homeless")

Every shape below is live and fits none of contracts 1–12. **A rule may not silently ignore these;
each is either given a contract or recorded as deliberately uncontracted with a reason.** Listing
them here is what stops the next enforcement pass repeating a blind spot.

| Shape | Live footprint | Nearest contract | Verdict |
|---|---|---|---|
| preset `SelectControl` on `minHeight` | live | LENGTH (§4) | **Needs a contract** — a length behind a preset picker breaks the token system |
| raw `BoxControl` (not the Responsive wrapper) | live | 4-VALUE BOX (§5) | **Needs a contract** — bypasses the tier wrapper |
| `BorderRadiusControl` (singular, non-responsive) | live | BORDER (§14) | **Absorbed by §14** |
| `SpacingControl` | live | LENGTH (§4) | **Needs a contract** — is it a length, or its own token-scale type? |
| `DeviceTabs` | **0 callers** | RESPONSIVE (§12) | **Banned lookalike — verdict binds if reintroduced.** The tier is chosen once, in the global toggle (`src/blocks/extensions/responsive-device-toggle.js`); `inspector-scan` rule 25 flags any block that reintroduces a `<DeviceTabs>`. The component file remains exported from `components/index.js`. |
| `AnimationControl` | live | — | **Needs a contract**, and it is where carried obligation 17 (reduced-motion) binds |
| `ComboboxControl` | live | ENUM (§3) | Absorbed by §3 as a permitted large-option-set variant |
| `FormTokenField` | live | ENUM (§3) | Multi-select enum — **needs an explicit clause in §3** |
| `FocalPointPicker` | live | MEDIA (§7) | **Absorbed by §7** — and it is carried obligation 9's evidence |
| repeater item editors | `plans`, `icons`, `tiles` | — | **Needs a contract.** ⚠ A per-item control must never be recorded as the array's control. ⛔ **The repeater guard is FRAGILE — see below.** |

⛔ **Known fragility in the repeater guard.** `_repeater_item_spans()`
matches `<attr>.map(` where the identifier resolves to the attribute being written. Three limits:
1. **`pricing-table::plans` fires by NAME COINCIDENCE, not by design.** `edit.js` destructures
   `plans: plansRaw`, then creates a **shadowing local** `const plans = (plansRaw||[]).map(…)`.
   The span matches only because that local happens to be spelled like the DB attr. **Rename it and
   the guard silently stops firing**, reintroducing the exact bug it was built to fix.
2. **`gallery::mediaItems` is preserved by upstream failure, not by the guard.** `edit.js` does
   `const items = mediaItems || [];` — a plain assignment `_build_js_destructure_map` cannot see — so
   candidate resolution yields nothing and the row is simply left alone. Harmless here, but it means
   the guard's real coverage is narrower than "3 tags" implies.
3. **Blind by construction to** `.forEach(` / `for…of` iteration, and to any repeater whose items are
   rendered by a component in another file (the scan is single-file per block's `edit.js`).
A rule scoped on `inspector_control_type` for an ARRAY attr must therefore carry its own AST
cross-check — do not treat this guard as complete.

### 14. BORDER

> The border UI is a shared composite, `SgsBorderControl`
> (`plugins/sgs-blocks/src/components/SgsBorderControl.js`). Mount count:
> `git grep -l '<SgsBorderControl' -- 'plugins/sgs-blocks/src/blocks/*/edit.js' | wc -l` — derive it,
> never cite a cached figure. `sgs/media` and `sgs/whatsapp-cta` are radius-private-only and correctly
> don't mount it. A few blocks (`card-grid`, `media`, `multi-button`, `trust-bar`) can still carry an
> active native `__experimentalBorder` (width/colour/style) — codemod `--survey` refuses them
> `ambiguous-anchor`. `plugins/sgs-blocks/CLAUDE.md`'s "Border controls" section states the same —
> keep the two in sync. Census + ratcheted gate:
> `plugins/sgs-blocks/scripts/survey-border-control-migration.py` (`PRIVATE_NEEDS_SWAP` must stay 0).
>
> 1. **Radius is the second control of a pair** inside `SgsBorderControl`, rendered when the caller
>    wires `onRadiusChange`.
> 2. **Style renders INSIDE the colour popover**, so one swatch opens colour and style together —
>    matching core's grouped border-box layout visually. The STORAGE stays SGS's own typed attrs:
>    core's `__experimentalBorderBoxControl` works in a `{color, style, width}` OBJECT while the
>    attribute stores a CSS shorthand STRING, so adopting it would force a stored-content migration
>    for no user-visible gain.
> 3. **Width IS a 4-side box object**, on `ResponsiveBoxControl` with the device switcher OFF.
>
> ⛔ **There is no per-device border width.** It was specified, built, and dropped as having no real
> use case: supporting it would cost `borderWidth{Tablet,Mobile}` attrs plus `@media` emission in
> every block for a control nobody would reach for. Do not build it. The switcher is off precisely so
> no block offers a tier it cannot store (a dead control).
>
> ⚠ **`linked` is load-bearing on any border colour row** — `GradientCapableColourControl` reads it to
> choose between storing the palette token SLUG and a baked hex. Hand migrations and the codemod must
> not drop it. Single-state callers use the `colourLinked` prop.
>
> ⚠ **A palette SLUG is not a paintable value where a path feeds it to `background:`** (a masked
> `::before` ring that also sets `border-color:transparent` paints NOTHING for a token-coloured
> border while width and style are correct). A raw hex works, so a hex-valued sign-off can certify a
> broken token path as working. Where a path resolves tokens, the TEST VALUE must be a token.

1. **Canonical** — `SgsBorderControl`: a **composed builder** (width as a 4-side box object, style
   inside the colour popover, token-aware colour picker) with radius as its paired second control;
   `ResponsiveBorderRadiusControl` for a 4-corner radius on its own. The only live demand for a
   shorthand border was `gridItemBorder` (a raw `TextControl` taking a CSS shorthand — §14.3's own
   banned lookalike), which is the composed builder.
2. **Required props** — per-side values, a real `units` array, alpha on the colour, and a `label`.
3. **Banned lookalikes** — a None/Thin/Thick **preset `SelectControl`** standing in for a real
   builder (the exact shape banned for shadow); per-side scalar attrs instead of an object (none
   remain, keep the gate); a `TextControl` taking a raw CSS `border` shorthand (none remain).
4. **Tab** — `border`. Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel. A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `box_family IN ('borderWidth', …)` ∪ `css_property LIKE 'border%'`. ⚠ `box_family`
   scopes only to 4-side/4-corner OBJECT attrs — a scalar radius
   (`card-grid.cardRadius`, `mega-aside.asideRadius`) is correctly NULL there
   and must be picked up by the `css_property` leg, or the rule will miss every one of them.
6. **Conformance** — measured by `npm run survey:box`. Canonical per leg: 4-corner radius objects →
   `ResponsiveBorderRadiusControl`; scalar radius and scalar border-width → `UnitControl` /
   `ResponsiveControl` (§4.1 + §14.5) with an explicit `units` array **including `%`** wherever the
   default is a percentage (a px-only array silently removes a block's own circle — e.g.
   `iconCircleBorderRadius` defaults to `'50%'`); no raw-CSS `TextControl` (a `type: string` attr whose
   `render.php` reads a plain string keeps its value domain when moved onto `UnitControl`).

   ⛔ **The survey is a candidate list requiring a read, never a defect list. Do not dispatch a codemod
   at its raw output.** It attributes an attribute NAME found in a nearby **comment** — or a nearby
   `borderRadius*` attribute name — to the closest control it sees (for example a Margin
   `ResponsiveBoxControl` whose `values={{ base: style?.spacing?.margin … }}`), and it cannot tell a
   side-effect write (a style-preset `SelectControl`'s `onChange` that reseeds `ctaBorderRadius` from
   `BUTTON_PRESETS`) from a control mount. **When a survey leg is shown to mis-attribute, re-check
   EVERY bucket in that leg, not just the one that prompted the suspicion.** A leg that can only ever
   report non-conformance is not a measurement: the scalar legs must declare
   `UnitControl`/`ResponsiveControl` canonical.
7. **Detection** — as §11 SHADOW: classify each border attr's control into compliant /
   preset-select / raw-text / no-control.
8. **Answered — border splits in two.**
   - **RADIUS is already responsive.** Blocks declare `…borderRadius{Tablet,Mobile}` (before-after,
     brand-strip, button, countdown-timer, counter, hero, icon-list, media, option-picker,
     table-of-contents, timeline, whatsapp-cta); the wrapper is `ResponsiveBorderRadiusControl`
     (`src/components/ResponsiveBoxControl.js`). No build owed.
   - **WIDTH / STYLE / COLOUR are desktop-only in practice.** No `block.json` declares
     `borderWidth{Tablet,Mobile}` (`git grep -l 'borderWidthTablet' -- 'plugins/sgs-blocks/src/blocks/*/block.json'`
     returns nothing) or `border{Style,Colour,Color}{Tablet,Mobile}`. The one apparent counter-example,
     `sgs/separator.thickness`, is a **scalar** `border-width` whose 3 tiers are a flat→object
     migration candidate, not a per-side border builder.
   - **Ruling: leave width/style/colour desktop-only.** ⚠ This is a **demand** ruling, not a
     capability ruling. The generic principle (any property may take the TIER axis) stands, and
     `SGS_Container_Wrapper` is *already* tier-plumbed for border
     (`class-sgs-container-wrapper.php`), so reversing costs block-side attributes and control mounts
     only, never wrapper work. That is what makes it cheap to reverse, and why building on principle
     ahead of demand is rejected. There is no promotion trigger (see the box above).

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
`supports.sgs.elements`, never hand-sorted.** This is THE PLACEMENT RULE above; CO-2 adds only the
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

> **This is a separate question from THE PLACEMENT RULE above.** THE PLACEMENT RULE decides
> *which panel a control belongs to* (TIER 1 element, TIER 2 property-family). This convention
> decides *what order the panels/controls that placement produces appear in*. Neither implies the
> other, and this section does not restate the placement rule — read it above if you need it.

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
`ResponsiveOverride` is an E1–E4 failure, which is why those clauses appear in six contracts above.

#### CO-20. Client patterns use templateLock
⛔ **`templateLock:"contentOnly"` is per-client opt-in — "never framework patterns".** The obligation:
a **client-facing** pattern using a block sets `templateLock:"contentOnly"`. **Enforced by** pattern
audit; `rules.json` keeps rule 20 ADVISORY.

#### CO-21. No Part-F anti-patterns
None of the Spec 35 Part F fail-list is present: essential control sidebar-only · incomplete option
sets · no reset · colour-only focus · bespoke Custom-CSS field · raw-px spacing. **Enforced by** the
contracts above, collectively.

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

The definitive tab assignment is **THE PLACEMENT RULE** at the top of this document: TIER 1
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
  residual-band passthrough), carries a deliberate framework-wide exemption in Spec 35 Part F, and
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

---


## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin.
