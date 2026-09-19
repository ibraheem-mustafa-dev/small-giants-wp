# Spec 35 — SGS Block Inspector UX, Control-Completeness & Capability Standard

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** A census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What decides the outcome is whether the TARGET SHAPE is settled first (THE-MIGRATION-METHOD.md Step 3).

```
doc_type: spec
spec_id: 35
spec_version: 3.0
status: ACTIVE
last_verified: 2026-09-19
owner: framework
sub_specs: 35A (.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md)
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

> **Sibling spec:** Spec 35 (this doc) owns the block INSPECTOR-UX standard (editor-facing controls). Spec 32 owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Both are separate documents and both gate every block build — read them together.

> **This spec is split across two files.** Spec 35 (this file) is the normative core: the layout, completeness, parity, responsive and accessibility standards (PART A–E) and the control-type contract (PART O). Spec 35A (`.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md`) holds the anti-pattern fail-list, the native-mechanism verdicts, the component reference and action layer, the rollout gates, the definition-of-done checklist, the implementation status, the role data layer, the enforcement layers and the carried obligations. PART letters, section numbers and IDs are unique across the pair. A citation that names no file resolves through this table.

| File | Holds |
|---|---|
| **Spec 35** (this file) | Why this exists · PART A (layout and grouping) · B (control completeness) · C (feature-parity checklist) · D (responsive UX, D1–D5) · E (accessibility) · PART O colour-control rules · PART O control-type contract: THE PLACEMENT RULE, THE ELEMENT MANIFEST, the scoping axes and the EXTENSION SURFACE axis, §1 COLOUR to §14 BORDER · Sources |
| **Spec 35A** | PART F (anti-patterns; F.1, F.2.1 to F.2.3) · G (prefer native) · H (component quick-reference) · I (component action layer) · J (upgrade roadmap) · K (rollout mechanism and gates) · L (per-block definition-of-done) · M (implementation status) · N (role data layer; N.1 to N.3, N-1 to N-11) · PART O enforcement layers O.15 and O.16 · CARRIED OBLIGATIONS (CO-2, CO-3, CO-9, CO-10, CO-11, CO-13, CO-15 to CO-21, CO-28; T1 to T3; rule-authoring discipline 22, 24, 25, 26) · Cross-cutting A and B |

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
  independently. Canonical statement: contract §CO-2 (Spec 35A) + §"THE ELEMENT MANIFEST".
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
| Link/CTA | **`LinkPopoverField` / `LinkPopoverContent`** (canonical). `SgsLinkControl` is not canonical; inspector-scan rule `27-superseded-link-control` flags any block mounting a control by that name. | raw URL `TextControl` |
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
order**; in every codebase checked it is authoring order, which is why CO-28 stays open (Spec 35A).

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
   trigger-row + popover in one component — the common single-trigger case). It avoids
   the two defects of an inline `LinkControl` mount (core `LinkControl`'s 350px floor overflowing
   a ~248px inline panel; staged `settings` toggles with no blur/close commit) by using
   core's own designed home for `LinkControl` — a popover with a real Submit
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
   `searchOnly`). No `SgsLinkControl` component exists and it has 0 JSX mounts tree-wide
   (`python plugins/sgs-blocks/scripts/surveys/survey-control-mounts.py .`;
   `git ls-files | grep SgsLinkControl` lists only inspector-scan fixtures); rule 27
   (`27-superseded-link-control.js`) is `mode: gate` at `openBacklog: 0`, with coverage from its
   self-test fixtures only.
7. **Detection** — `inspector-scan/rules/08-raw-url-link.js` flags `<TextControl type="url">`, and
   `27-superseded-link-control.js` flags any `<SgsLinkControl>` JSX usage (`mode: gate`).
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

1. **Canonical** — `src/components/IconPicker/IconPicker.js` (re-exported by `src/components/IconPicker/index.js`). No competitor exists.
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

## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin.
