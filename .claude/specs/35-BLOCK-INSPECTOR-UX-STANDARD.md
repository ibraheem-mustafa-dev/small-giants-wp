# Spec 35 — SGS Block Inspector UX, Control-Completeness & Capability Standard

```
doc_type: spec
spec_id: 35
spec_version: 2.0
status: ACTIVE (v1 2026-07-18; v2 same day — expanded with a 6-stream research sweep:
        WP component capabilities, competitor parity, inspector UX/a11y, uncovered
        components, newer WP platform capabilities, interaction/effects/content)
owner: framework
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

> **Sibling spec (Bean decision, 2026-07-28): Spec 35 and Spec 32 stay SEPARATE, not merged.** Spec 35 (this doc) owns the block INSPECTOR-UX standard (editor-facing controls). Spec 32 owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Both gate every block build — read them together.

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
- **A3. TARGET — SGS owns a three-tab bar (Content · Style · Advanced)** *(Bean-decided 2026-08-08)*.
  Kadence, Spectra and Stackable each ship their own tab bar rather than the native Settings/Styles
  split, and core has **no** semantic rule for that split anyway — verified in the Gutenberg source,
  the Styles tab is a hard-coded list of native block-support categories and Settings is simply the
  `default` group.
  ⛔ **Sequencing: the tab bar lands AFTER native-supports retirement**, or the client sees our three
  tabs plus core's Styles tab. **Interim state** (not the target, do not extend it): element panels in
  Settings, native supports in core's Styles tab, CSS-class/anchor in Advanced.
  ⛔ **A3 previously read "Behaviour/content → Settings; appearance → Styles".** That rule splits an
  element's appearance from the content it modifies; 8 blocks were sorted on it on 2026-08-08 and
  rejected. Full rule: `.claude/plans/spec-35-control-type-contract.md` §"THE PLACEMENT RULE".
  ⭐ **COLOUR SETTLED 2026-08-15 (D621 + D622) — it is no longer an open exception to A3/A4.** ⚠
  **The ruling and the code were two separate events, same day:** `SgsColourPanel.js` had no `group`
  prop at all until commit `a5b74bd1` (2026-08-15) — a prior status summary had already called D621
  "shipped" before that fix landed. Genuinely shipped as of `a5b74bd1`; see Part M's dated entry for
  the same date for the lesson this earned. The
  Colour panel renders in the **Styles** tab (Styles = root CSS + visuals; the framework uses NO
  native colour supports, only their look). **Placement of an individual colour follows A4 and the
  D533/D537 resolver like every other property family** — element-scoped colour sits in its element's
  panel, unclaimed colour falls to its property-family panel. ⛔ There is no bespoke colour-placement
  rule; D609's amendment clause proposing one grouped Colour panel is superseded. Prior art agrees for
  composites (Kadence `infobox`, Spectra `testimonial` both bundle an element's colour + typography +
  spacing); core's property-keyed slots exist as an **extensibility contract** (Gutenberg #67814), a
  requirement SGS's own blocks do not have.
- **A4. Element-first grouping** for composite blocks (panels by block PART, not property type) —
  **derived from `supports.sgs.elements`, never hand-sorted.** One element = one panel titled by its
  `label`, holding that element's content (`contentAttrs`) + style clusters + its states **inline
  beside each base value**. Hover is never its own panel. Unresolved element → the control does not
  move. Kadence, Spectra, Stackable, Otter and Essential Blocks all converge on this grouping
  independently. Canonical statement: contract §CO-2 + §"THE ELEMENT MANIFEST".
  ⛔ **TWO TIERS (Bean-locked, D537, 2026-08-09).** A4 is TIER 1 only. **TIER 2** governs WITHIN a
  panel, and for every control that scopes to no element: group by **property-family**
  (text/fill/layout/position/motion/animation — already defined in
  `scripts/consistency/cluster-member-sets.json`, not invented per-block), resolved via each
  element's declared `clusters` and honouring `appliesToLayers`. This **replaces** the earlier
  framing that block-root/no-element controls needed a single catch-all "block-level panel" still
  to be designed. A control that styles **nothing** (`variant`, `templateMode`, `tagName`, `layout`,
  `autoplay`, `showDots`, `required`) takes **one `Settings` panel, pinned first.** Full rule:
  `.claude/plans/spec-35-control-type-contract.md` §"THE PLACEMENT RULE".
- **A5. Progressive disclosure with `ToolsPanel`/`ToolsPanelItem`** once a panel hits ~6+ controls:
  optional controls behind the "+" menu, 1–3 `isShownByDefault`, `resetAll`. THE anti-clutter tool.
  - ⛔ **NAMED EXCEPTION — COLOUR IS NEVER OPTIONAL (Bean-ruled 2026-08-13).** A colour control must
    not sit behind the "+" menu and must not be hideable per instance. Bean: *"Never should be set up
    like that with optional hide or show."* A client hunting a disclosure menu to find a colour is the
    very clutter defect A5 exists to prevent, arriving via A5's own mechanism. Colour's states
    (normal/hover/active) are reached **inside** the control's popover, never as sibling controls or a
    second panel — which is what removes the density pressure A5 would otherwise be solving for.
    Full control shape + the three binding clauses: `plans/spec-35-control-type-contract.md` §1 field 9.
  - ⚠ **A5 is also the mechanism behind a defect measured 2026-08-13**, recorded so the next reader
    does not repeat the diagnosis: 22 panels tree-wide nest a `ToolsPanel` inside a `PanelBody`, and 17
    of those repeat the same title twice to the client. ⛔ The obvious fix — delete the outer
    `PanelBody` — is **not** safe: 11 of them carry `initialOpen={false}`, and `ToolsPanel` has no
    collapse, so deleting the wrapper turns 11 deliberately-tidy collapsed sections into permanently
    open ones. Removing the INNER label is not available either: core's `ToolsPanelHeader` returns
    `null` when `label` is falsy (verified in core source at the SHA WP 7.0.4 pins), which would take
    the "+" menu and Reset all with it. Only 6 of the 22 are safely deletable (no `initialOpen`, no
    other children). The remaining 11 want their `isShownByDefault` set reviewed so the outer collapse
    stops being necessary — a well-configured `ToolsPanel` is already short.
- **A6. Never duplicate a native `supports` panel** (inspector-UX form of R-31-9).
- **A7. Per-block universal-extension gating — TWO models (D551/D579, 2026-08-11).** Most
  extensions (`animation`, `clickEffects`, `parallax`) stay **opt-OUT**: universal unless a block
  declares `supports.sgs.hideExtensions: [...]`. `hover` and `blockLink` are **opt-IN**: attached to
  NO block unless it declares `supports.sgs.enabledExtensions: [...]` — flipped because their panel
  had a real targeting defect (painted the block root, not the element a client wanted), not merely
  because they were unused. Both declarative + read by `hide-extensions.js`
  (`isExtensionHidden()` / `isExtensionEnabled()`). Full reasoning: `decisions.md` D551 + D579.
- **A8. Panel order — OPEN, do not build a rule from this line** *(Bean, 2026-08-08)*. "Frequency-first,
  escape-hatches last + collapsed" is one candidate; "the element's declared `order`" (contract §THE
  PLACEMENT RULE) is another, and they do not agree. **CO-28's design gate still stands: Bean picks
  the canonical order.** Research 2026-08-08 found NO competitor centralises panel order — Kadence,
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
| Shadow | real X/Y/blur/spread/inset builder (shape only) **+ colour/alpha as a split sibling attribute routed through `SgsColourPanel`** (not embedded in the builder — D632, 2026-08-16), presets on top; multi-layer ideal | **None/Small/Medium only** |
| Selection | `ToggleGroupControl` (2–5 short); `ComboboxControl` (>~10, searchable); `FormTokenField` (multi-value) | comma-text; giant Select |
| Media/gallery | `multiple="add"` + `gallery` + array attr + `MediaUploadCheck` + drag-drop | scalar attr + single MediaUpload |
| Link/CTA | **`SgsLinkControl`** (wraps `LinkControl` — internal search + new-tab + rel nofollow/sponsored via `settings`) | raw URL `TextControl` |
| Typography | full set: `FontSizePicker` (presets+fluid) + `FontAppearanceControl` + line-height via `ResponsiveControl`+`UnitControl` (contract §4.1) + letter-spacing/transform/decoration | fontSize only |
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

**PLACEMENT — the LINK control is a POPOVER, never an inline inspector mount (Bean-ruled
2026-08-13, live review of `sgs/button`'s pilot; canonical component +full rationale:
`plans/spec-35-control-type-contract.md` §2 LINK).** Mount `LinkPopoverField`
(`src/components/LinkPopoverControl.js`) for a single trigger, or its `LinkPopoverContent` primitive
when a block needs more than one trigger (e.g. a toolbar button AND a sidebar row) opening the same
popover instance. Root cause this fixes: core `LinkControl` floors at `min-width:350px` (cancelled
only inside `.components-popover__content`) and STAGES its `settings` toggles with no blur/close
commit — both defects an inline inspector mount cannot avoid. Do not build a new LINK field as an
inline `<PanelBody>` mount, even via the (superseded) `SgsLinkControl` wrapper.

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

**A11y/SEO as controls:** alt-text field (N) T · ~~**decorative-image toggle** (empty alt +
`aria-hidden`) — gap, cheap, WCAG~~ ✅ **BUILT — corrected 2026-08-17**: `imageIsDecorative`
(`media/block.json:293`) is declared and genuinely wired to render — `media/render.php:606` sets
`aria-hidden="true"` from it. Scoped to `sgs/media`; `sgs/decorative-image` needs no toggle because it
hardcodes `aria-hidden="true"` on every image it emits (`render.php:180,250`), i.e. the whole block is
decorative by construction. ⚠ **Residual is real but narrower than "gap": 13 other image-rendering
blocks still have no decorative/ARIA attribute** (`inspector-scan` rule 18, advisory) · heading-level (N) T · ~~**general ARIA-label control** for icon-only
buttons — gap~~ ✅ **PARTLY BUILT — corrected 2026-08-17**: `ariaLabel` is declared on both
`button/block.json:395` and `icon/block.json:175` — the two blocks that actually render icon-only
triggers. Also added to `sgs/container`, `sgs/cta-section` and `sgs/trust-bar` at D647 as a landmark
label for `nav`/`aside`. **Not verified as universal across every block that could render icon-only** —
that narrower question is the real residual, not "no control exists" · schema → leave to `seo-schema` skill, don't duplicate in blocks.

## PART D — Responsive UX

- **D1.** Two patterns, never conflated: editor device-preview (viewport only) vs per-block responsive
  attributes (SGS `ResponsiveControl` + `paddingTablet`/`Mobile`).
- **D2.** Breakpoints = locked **768 / 1024** device standard; never a bespoke third value (device-tier
  vs arbitrary-visual-breakpoint rule).
- **D3.** Mobile inherits from desktop unless overridden — blank tiers fall back safely.
- **D4. Per-device CONTENT cascade (added 2026-07-21, re-homed from Spec 37 FR-37-24).** D3's
  inheritance applies to content **presence**, not only to property values. Desktop is the base;
  tablet inherits desktop; mobile inherits tablet. Hiding a block at a tier applies to that tier
  **and every tier below**, never above; a tier that is explicitly edited stops inheriting.
  - **HIDE, never REMOVE.** The cascade hides via CSS and never forks the block tree per tier.
    `includes/device-visibility.php:10,15` already generates `display:none` media queries and
    states *"Content remains in the DOM for SEO (display:none only hides visually)"*. A
    structural remove would break crawlability (memory `degrade-to-more-content-never-less`) and
    would need per-device cache fragments the page-cache model has no key for.
  - **`inherit` resolves at render, never copies down at save.** Copying a parent's value into a
    child tier at save time makes an inherited value indistinguishable from an explicit
    override, so a later desktop edit can no longer cascade.
  - **⚠ SCOPE AMENDED (D400, Bean-ruled 2026-07-28): general block VISIBILITY is EXCLUDED from
    this cascade.** `sgsHideOnMobile`/`Tablet`/`Desktop`
    (`src/blocks/extensions/responsive-visibility.js`) KEEP their three independent per-device
    toggles — no reshape, no inheritance. Bean's reasoning (the rule): per-device hiding's
    dominant use is a device-SPECIFIC block — hidden on desktop precisely because it exists for
    mobile/tablet; inheritance would make a desktop-hide cascade everywhere and the block could
    never render. The earlier plan to reshape the visibility extension onto the cascade (D358
    re-homing) is REVERSED on this point. **D4's down-cascade model now applies ONLY to
    header/footer CONTENT curation (Spec 37 §3.8's item-level trimming — Bean re-confirmed its
    down-cascade 2026-07-28)** and the cascade mechanism itself applies to BEHAVIOURS and
    RESPONSIVE VALUES (FR-37-14 / FR-37-16 families).
  - **Reuse the one cascade (for behaviours/values/§3.8 content).** Resolve via the same
    `resolveTier()` shape P1 DP1 defines — do not introduce a second inheritance mechanism.
    Approved contract: `plans/archive/2026-07-28-resolveTier-cascade-design-gate.md` (D400).
  - **Consumer:** Spec 37 §3.8 depends on this; that spec owns the requirement, this spec owns
    the build.
  - **✅ BUILD STATUS: BUILT + LIVE-PROVEN (2026-07-28, same day as the D400 approval).** The
    canonical `resolveTier()` shipped in JS (`src/utils/responsive.js`, with `resolveResponsiveTier`
    now a thin alias) + PHP (`sgs_resolve_tier()`, `helpers-responsive.php`) with ONE shared 16-case
    golden fixture set passing 16/16 in BOTH runtimes (`b9c5f6d1`); the scoped per-tier emission
    helper (`sgs_emit_tier_rules`, 9/9 goldens) + `ResponsiveTriStateControl` followed (`ac0c30eb`);
    FR-37-14's site-header reshape consumed it and was proven live at 3 viewports incl. explicit-off
    override + sticky+transparent coexistence (`e4bd72ef`→`eb255f06`); rows unified onto the same
    vocabulary (legacy `sgs_resolve_tier_booleans` DELETED). Per D400/D405, general block VISIBILITY
    remains EXCLUDED (see the amended scope note above) — the §3.8 header-CONTENT cascade feature
    is a separate, still-open consumer owned by Spec 37.
    `src/blocks/extensions/responsive-visibility.js:68-70` is still three
    INDEPENDENT flat booleans (`sgsHideOnMobile`/`Tablet`/`Desktop`, `default:false`) with no
    inheritance — deliberately (D400 scope amendment, general block visibility keeps its own
    per-device toggles).
    **✅ RESOLVED (verified 2026-07-30): `headerSticky`/`headerTransparent`/`headerShrink`/
    `headerHideOnScroll` are no longer flat `boolean`s.** They are now `{"type":"object",
    "default":{}}` at `site-header/block.json:142-157` (line numbers shifted since this passage
    was written). **Spec 37 FR-37-14** (behaviour tri-state) consumed the canonical
    `resolveTier()` cascade and is built and live-proven — see the BUILD STATUS block below and
    Part M, which already record this as shipped. The former blocking relationship ("Spec 37
    Group-B items cannot be built until this ships") is historical: the cascade shipped same-day
    (2026-07-28) and FR-37-14 now depends on it successfully, it is not still waiting on it.

- **D5. Per-device MEDIA SOURCE (art direction) — the canonical pattern (added 2026-08-07, D521).**
  A client must be able to choose a different CROP per device wherever media appears, not only where
  the cloning pipeline wrote the values. Shipped across every media-bearing block; treat this as the
  standard for any NEW block with a media source.

  - **Attr shape:** `{base}` / `{base}Tablet` / `{base}Mobile`. An empty tier falls back UP
    (mobile → tablet → desktop), per D3. **Match the base attr's TYPE** — an object-typed base
    (`avatarMedia`, `thumbnail`) takes object-typed tiers, because WP silently coerces a flat value
    on an object-typed attr to its default and drops the whole thing.
  - **Control:** exactly ONE `<ResponsiveControl>`-wrapped picker, **gated on the base media
    existing**. A per-device override for media that is not there is a dead control.
  - **Alt text is NOT tiered.** A different crop of the same subject describes the same thing; a
    per-device alt is a second place for the description to drift.

  - **⛔ "Falls back UP" means the next WIDEST tier that HAS a value — NOT the base (D595,
    2026-08-13).** Emitting each tier's toggle rules INDEPENDENTLY gets one of the four combinations
    wrong: with a TABLET tier set and MOBILE empty it hides `--tablet` below 768px and leaves
    `--desktop` visible, so mobile falls back to DESKTOP and skips the tablet value it should
    inherit. That contradicts `sgs_resolve_tier()` (`helpers-responsive.php:685-694`), whose mobile
    branch recurses to tablet. **This shipped in `sgs/media`'s image tiers and in a third copy in
    `includes/helpers-tier-media.php`, whose docblock described the defect as intended.** COMPUTE
    band ownership; never enumerate the rules by hand:

    | tiers set | ≤767px | 768-1023px | ≥1024px |
    |---|---|---|---|
    | none | desktop | desktop | desktop |
    | mobile | mobile | desktop | desktop |
    | tablet | **tablet** | tablet | desktop |
    | both | mobile | tablet | desktop |

    Proven, not asserted: the old rules fail exactly 1 of 12 assertion cases, the computed form
    passes 12/12, and fixture B in `reports/visual-diff/media-2026-08-13.md` confirms it live.

  - **⛔ Tier hide rules must be COMPOUND — `.{uid} .base.base--tier` (0,3,0), not
    `.{uid} .base--tier` (0,2,0).** Block stylesheets set `display:block` on these BEM bases at
    (0,2,0), so a bare modifier rule TIES and the winner is decided by source order — which is not
    ours to guarantee once block CSS is lifted into `uploads/sgs-css/`.

  - **SVG tiers by MARKUP, same as images (D595).** `svgContent`/`Tablet`/`Mobile`, string-typed to
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
    + classes) for zero security gain. Verified 2026-08-13: 0 of 1332 live posts use it either way.

  - **IMAGES tier by MARKUP.** Emit all tiers as sibling elements carrying a BEM tier modifier and
    toggle them with breakpoint rules in the block's own scoped `<style>`. Three `<img>`s cost
    nothing meaningful, it needs no JS, and the BEM modifier is the vocabulary the cloning pipeline
    reads — one convention on both ends is what makes a clone round-trip.
    - ⛔ Build tier selectors from the **BARE scope token**, never from a multi-member selector LIST:
      a descendant appended to a list binds to its LAST member only (this hid every image at every
      width on `sgs/media` before it was caught live).
    - ⛔ **Naked-mode blocks** (the media element IS the block root, e.g. `sgs/decorative-image`)
      have no ancestor to descend from: each tier sibling must carry the uid class ITSELF and the
      toggles are COMPOUND selectors (`.{uid}.{block}--mobile`), not descendant.
    - ⛔ Append tier CSS **before** the block assembles its `<style>` string. Appending it next to
      the element emit compiles cleanly and emits nothing (hit on `sgs/image-sequence`).

  - **VIDEO tiers by RUNTIME SWAP — deliberately NOT the markup pattern.** Three `<video>` elements
    each begin fetching and three embeds each load a player, so siblings are not free here. Use
    sgs/hero's established `data-src-desktop`/`-tablet`/`-mobile` contract and swap in `view.js`.
    The DESKTOP source still renders as real server markup so a no-JS visitor gets a working video.
    Bean accepted the cost for embeds (D521): crossing a breakpoint mid-watch rebuilds the iframe
    and loses playback position, so the swap fires ONLY when the resolved source actually differs.
    - ⛔ **Any node the swap REBUILDS must carry the tier `data-*` forward**, or the swap is
      one-way and can never return — it will look correct in the one direction anyone tests first.

  - **Verification bar:** computed visibility (or, for video, an ADVANCING `currentTime`) at FIRST
    PAINT per width — viewport set, then a fresh navigation, never a resize-after-load. Markup
    presence scores a false pass. Assert on the MEASURED `window.innerWidth`, not the requested
    viewport size; a requested 800px measured 727px and would have tested mobile while labelled
    tablet. Include a positive control: prove the effect CAN fire in that browser, or "nothing
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
hover split from resting · everything in the Settings group · **raw URL field instead of `SgsLinkControl`** ·
**hand-rolling duotone/aspect-ratio/lightbox/sticky/dynamic-content when a native support exists** ·
animation with no reduced-motion gate · raw-px spacing instead of the token scale.

**⚠ EXEMPTION (added 2026-07-30, resolves a cross-spec conflict): `sgsCustomCss` is NOT the
bespoke "Custom CSS" field this fail-list bans.** Spec 32 FR-32-4 names `sgsCustomCss` as **the
only permitted non-attr, non-scoped-`<style>` styling output** framework-wide, and Spec 31
FR-31-5.2 makes it **load-bearing** — it is the built D3 passthrough channel that carries arbitrary
non-device-tier draft breakpoints (`ResidualBand`) onto a clone; removing it breaks clone fidelity.
It is registered on all 81 blocks (`src/blocks/extensions/custom-css.js:25`) and tracked as a
deliberate, framework-wide exception in `decisions.md` D401 ("flagged, NOT fixed"). The Part-F
anti-pattern still stands for any OTHER bespoke per-block custom-CSS field — this exemption is not
a licence to add a second, block-specific one.

**✅ RESOLVED instance (2026-08-16, D632): `sgs/post-grid`'s "incomplete option sets" violation.**
Its shadow control was a preset-only `SelectControl` (banned by this fail-list's first named
example) — migrated onto the universal `ShadowControl` shape alongside 10 other blocks. See Part I
"Shadow builder" for the full block list and the `sgs/quote` residual.

### F.1 — A composite's `selectors.typography` targets its own ROOT, never a child's dead BEM class (added 2026-08-15, D624/D625)

When a composite's text moved from a scalar attribute into an InnerBlocks child (FR-22-6), its old
`.sgs-<block>__<element>` class and CSS go with it — but the block's `block.json`
`selectors.typography` can be left pointing at that now-unrendered class. Every native typography
control then produces a rule that lands on nothing: the client picks a font size, it saves, nothing
moves. Found live on `sgs/cta-section`, `sgs/notice-banner`, `sgs/info-box` (all FR-22-6 survivors) —
see `decisions.md` D625.

**The fix shape, settled and verified live (not a per-block judgement call):**
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
  proof the property emits — `sgs/info-box` had a correct-after-fix selector pointing at a block that
  emitted typography via a wholesale `style.typography` passthrough to `wp_style_engine_get_styles()`
  which silently drops `textAlign` (not a style-engine key). Verify the specific property actually
  reaches the DOM, not just that the selector is well-formed. See `mistakes.md` (2026-08-15 entries).

**This mechanism generalises into a `typography` wrapper capability (D626, 2026-08-15).** The
shared-wrapper decomposition (`~/.claude/plans/go-track-1b-playful-hamster.md` §1.4) locked
`typography` as a 6th opt-in extension alongside background/width/layout/gridItems/shapeDividers —
a root-level default for InnerBlocks children reusing this exact inheritance mechanism, Styles tab.
Only colour and typography qualify for this pattern framework-wide: it depends on native CSS
inheritance, which background/border/shadow/padding don't have. A separate, framework-wide
typography placement/completeness audit (parallel to the live colour-panel rollout) is queued as
the next initiative after colour's own two tracks close — not this spec's open item to build yet.

### F.2 — Shared-wrapper capability preconditions: `gridItems requires layout`, `gridAreas` flag completion, `ScaleAxisControl` — ✅ **BUILT 2026-08-16 (D639)**, designed 2026-08-16 (D637)

> ⛔ **BUILD STATUS, and two premises this subsection asserted that turned out FALSE (D639).**
> Read this box before building anything from the text below — the design text is left intact as
> the record, but two of its factual claims did not survive contact with the code.
>
> | Piece | Status | Note |
> |---|---|---|
> | **F.2.1** precondition gate | ✅ **BUILT** as specced; **WIRED at D643, not at build time** | `scripts/check-wrapper-capability-preconditions.js`, fail-closed, no baseline, `--self-test` 11/11. ⚠ **THREE** blocks declare `gridItems`+`layout` (`container`, `cta-section`, `trust-bar`) — F.2.1's text names two. ⚠ **The build-day claim that it was wired into `prebuild` was FALSE** — zero `package.json` references until D643 (2026-08-16), so it ran nowhere while three docs said it ran every build. Now in `prebuild` + `npm run check:wrapper-capability`. |
> | **F.2.2** whole subsection | ⛔ **RETIRED — `supports.sgs.gridAreas` DELETED, not built** | Neither reader was needed. See premise 2 AND premise 3 below. The DB column/writer/migration were built then **reverted in the same session** once premise 3 surfaced. |
> | **F.2.3** scale control | ✅ **BUILT** | `src/components/ScaleAxisControl.js` + storage replace across 6 blocks + SVG-`<pattern>` X tiling. |
>
> ⛔ **PREMISE 1 FALSIFIED — "same repeat mechanism the shape already uses".** F.2.3's render text
> below says X-tiling reuses an existing repeat. There is none: the divider is a single `<path>`
> in a `preserveAspectRatio="none"` SVG stretched edge-to-edge. Tiling is NEW. Built as an SVG
> `<pattern>` (Bean-picked over a CSS mask) which keeps the markup, `currentColor` and flip/invert,
> and is **not entered at all at x=100**, so the default renders byte-identically to before.
>
> ⛔ **PREMISE 3 FALSIFIED (found last, decided everything) — "the converter … one comment-only
> reference explicitly noting the step is a no-op for this reason".** `assembly.py:250` says the
> OPPOSITE: *"no gridAreas lookup is needed"*. the LIVE route is `assembly.py` step 3d, which derives each area
> name from the **DRAFT's own BEM element token** (`parse_sgs_bem(cls).element` —
> `sgs-hero__content` → `content`) and routes via `db.attr_for_area_property(block, area, prop)`,
> gated on the block declaring `<area>+<Suffix>` attrs — not on any block flag. (⚠ mechanism
> corrected by /qc-council: `resolvers/grid_area.py` and `fold_helpers.grid_item_areas()` are BOTH
> dead in production — zero callers, and `ctx.area_name` is set only in test files.) The converter was built not to need it. **So the flag had no consumer and needed
> none, and was redundant by construction:** "hero has areas content and media" is fully derivable
> from hero declaring `contentPadding`/`mediaPadding`. `supports.sgs.gridAreas` is **RETIRED**;
> `check-wrapper-capability-preconditions.js` rule 2 now FAILS the build on any declaration of it
> (including an empty array, which would otherwise silence the gate).
>
> ⛔ **PREMISE 2 FALSIFIED — "`GridAreaPanel`'s own gate is already correct and needs no change,
> it's simply never called".** It writes the FLAT per-side schema (`contentPaddingTop`/`…Tablet`/
> `…Mobile`) — 13 of 14 attrs per area — which **stopped existing on 2026-08-11** when D580
> migrated that storage to box OBJECTS. It was never swept precisely because it has zero mounts.
> Mounting it as specced would ship a padding control that **silently deletes the value on every
> use**, which is the standard-level defect Part M already records. It is also SUPERSEDED: hero
> re-grew its own object-shaped controls (`hero/edit.js:965` "Content padding", `:1336` "Media
> padding") — and per D626's mount table `gridItems` "absorbs `GridAreaPanel`", while `hero` does
> not declare `gridItems`, so it would render nothing today even if wired. **Do not mount it
> without first rebuilding it onto the object storage, or deleting it as superseded** — that
> decision is open (D639 residual).
>
> **Y semantics, ruled by Bean 2026-08-16 (D639):** the addendum below says both "anchors its top
> edge" and "extends outward only", which describe opposite results. The ruling is **grows INTO
> the section** — today's behaviour, what `top:-1px`/`bottom:-1px` already produce, and the
> industry convention. Nothing repositions. Consequence: a new divider is 120px (100% of natural
> viewBox height) where the old attribute default was 80px.

Design-only spec addition feeding the shared-wrapper decomposition's step 7 (`~/.claude/plans/go-track-1b-playful-hamster.md` §1.4; the D626 grouping locked six opt-in wrapper extensions —
`background`/`width`/`layout`/`gridItems`/`shapeDividers`/`typography`). D626 named two cross-extension
preconditions and one control redesign as "needs a real design, not a note" and left them unbuilt;
this subsection is that design, council-reviewed (D637 — see decisions.md for the full review record).

**F.2.1 — `gridItems requires layout` precondition.** A block declaring `gridItems` in
`supports.sgs.enabledExtensions` without also declaring `layout` would let a client style
non-existent grid items — `GridItemDefaultsPanel`'s own `if (layout !== 'grid') return null` is a
render-time bail, not a build-time guarantee the wrong combination can't be declared in the first
place. Gate: a **build-time static script**, not a `/sgs-update` DB-seed check — `enabledExtensions`
is a flat block.json array with no DB table home and no consumer that would justify creating one
(unlike `boxFamilies`/`variantAttr`, which genuinely feed the cloning converter and are legitimate
R-31-1 DB-first cases). New script `plugins/sgs-blocks/scripts/check-wrapper-capability-preconditions.js`,
same family as `check-shared-panel-schema.js` / `check-box-family-guard.py`
(`--survey`/`--check`/`--json`/`--self-test`, wired into `prebuild`), holding a small declared table:

```js
const CAPABILITY_PRECONDITIONS = {
  gridItems: [ 'layout' ],
};
```

For every block.json, read `supports.sgs.enabledExtensions`; for each key present that also appears
in `CAPABILITY_PRECONDITIONS`, assert every listed precondition is also present, exit 1 on any miss
under `--check`. No `--fix` mode — a codemod silently injecting `layout` into a block's declared
extensions is exactly the kind of scope creep step 6 Phase B forbids for per-block migration commits.

**F.2.2 — `supports.sgs.gridAreas` flag: completing an existing declaration, not inventing one.**
Verified live (correcting D633, which reported "0 hits"): `sgs/hero/block.json` already declares
`supports.sgs.gridAreas: ["content","media"]` (present since the 2026-06-11 per-area-grid-layer
commit) — real, correctly-shaped data. The gap is that it has **zero readers anywhere**: not
`GridAreaPanel` (D633's zero-live-mounts finding re-confirmed — no `edit.js` in the plugin renders
it, and its only wiring point, the aggregator's `kind='section'` branch, has zero callers), not
`/sgs-update`, not the converter (one comment-only reference, `converter/services/assembly.py:250`,
explicitly noting the step is a no-op for this reason). Fix is two readers, mirroring the
already-live `boxFamilies`/`variantAttr` pattern declared on the same block.json `supports.sgs`
object:

1. **DB layer** — add `block_composition.grid_areas` as a new JSON column, on the same table as
   `container_kind` but NOT the same shape — `container_kind` is a scalar `TEXT CHECK` enum, while
   `grid_areas` stores a JSON array (`["content","media"]`) with no DB-level `CHECK` constraint on
   its shape. **The accurate sibling is `accepts_allowed_blocks`** (`seed-composition-roles.py:334-336`,
   already a JSON-array TEXT column on this same table, no enum guard) — corrected 2026-08-16 after
   an independent review lens caught the weaker analogy. Not a new table — `variant_slots` earned its
   own table because it stores genuinely relational per-variant discriminating slots, this is a flat
   per-block array. Populated declaratively by `/sgs-update` Stage 1, same route `boxFamilies` already
   uses — no hardcoded per-block dict.
2. **Editor layer** — a direct-panel block's `edit.js` imports its own `./block.json` (the pattern
   every block's `index.js` already uses for `registerBlockType`) and, when its
   `enabledExtensions` includes `gridItems`, maps `metadata.supports.sgs.gridAreas ?? []` to one
   `<GridAreaPanel>` per entry — identical to the aggregator's existing `section`-kind branch.
   `GridAreaPanel`'s own gate (`Array.isArray(props.gridAreas) && props.gridAreas.map(...)`) is
   already correct; it has simply never been called by any direct-panel block.

**Which blocks should declare the flag:** only blocks with a FIXED set of semantically-named
sub-regions each needing independent per-region padding/background — today, only `sgs/hero`'s split
variant (`content` + `media`). `container`/`cta-section`/`trust-bar`'s grid children are repeatable,
unnamed InnerBlocks items with no fixed roles and do **not** qualify; do not pre-declare the flag on
them. Note this is not literal CSS `grid-template-areas` — no block's `style.css` uses that property
anywhere in the plugin; despite the name, this flag configures named-region box styling, not a CSS
Grid template feature. **Out of scope here:** whether `hero` should also gain `layout`+`gridItems`
in its own `enabledExtensions` (a composite-mirror expansion question D633 explicitly deferred) —
this subsection specifies only how the wiring behaves once/if that happens.

**Regression guard (extends F.2.1's script):** a second rule in the same
`check-wrapper-capability-preconditions.js` — any block declaring a non-empty
`supports.sgs.gridAreas` must have at least one live reader (a Stage-1 DB write or a live
`<GridAreaPanel>` mount) — so a future orphaned declaration (exactly this bug) fails the build
instead of sitting undetected, per Part N's N-1/N-2 rule ("a built mechanism is not a reached one").
⛔ **This guard's `--check` mode only makes sense against the POST-migration architecture** (each
direct-panel block importing its own `./block.json` and mounting `<GridAreaPanel>` per-entry, per the
Editor layer step above) — found by an independent review lens, 2026-08-16. Under the CURRENT
aggregator architecture, `<GridAreaPanel>` is reached generically through `KIND_PANELS.section`, not
per-block, so a naive per-block-scoped grep would false-negative against today's tree (`hero` doesn't
import `GridAreaPanel` and never will under the current shape). Ship this guard scoped to run only
after F.2.2's editor-layer change lands — enabling it earlier will either false-negative or need to
be disabled for the gap window; do not enable it blind.

**F.2.3 — `shapeDividers` linked/unlinked X/Y scale control. ✅ FULLY LOCKED (2026-08-16) — render
behaviour, control shape, and storage fork all decided. Safe to build as specced.**

**X/Y render behaviour — RULED by Bean, 2026-08-16.** 100% is the shape's natural, undistorted size
on both axes (the default). **Y anchors to the edge the divider is attached to** (top divider anchors
its top edge, bottom divider anchors its bottom edge) and extends OUTWARD ONLY as Y increases — it
never grows back into the section it decorates. **X anchors from the horizontal CENTRE of the block**
it's attached to, scaling symmetrically left/right from the middle — not from either edge. Values
below 100% on X make the shape narrower, so the pattern **tiles/repeats** to fill the block's width
(same repeat mechanism the shape already uses today, just at a smaller per-tile width); values above
100% make the shape wider than the block, so the excess is simply **not rendered/visible** — clipped
at the block's own width, same as any other CSS `overflow:hidden` element wider than its container.
This closes the "X-axis render behaviour is undefined" gap the second review lens flagged — resolves
to plain, ordinary CSS overflow/repeat semantics, nothing bespoke needed. **Migration:** confirmed
directly with Bean — "there is nothing to preserve" on the live canary; the D635-style content-check
this entry's addendum flagged as a due-diligence gap is closed by this ruling, not deferred.

**Control shape — RULED by Bean, 2026-08-16, keep the link/unlink toggle. The earlier reasoning
against it (framed here as "4 equal box sides vs 2 unrelated axes") was WRONG, corrected directly by
Bean:** X and Y are not unrelated axes needing independent controls by default — for scaling any
shape or image, keeping proportions uniform via ONE overall-size control is the primary interaction
people expect, with per-axis tweaking as the secondary, occasional override. That is exactly what
link/unlink already provides, and it has a stronger real-world precedent than `BoxControl`'s 4-side
pattern: proportional-scale-by-default with a lock/unlock toggle is the standard shape-resize
convention in every design tool (Figma, Photoshop, Canva) — closer prior art than the 4-side-padding
analogy this doc originally leaned on, and it didn't need the D636-style competitor council the
earlier finding asked for; the corrected reasoning stands on its own. **Default state stays LINKED**
(computed as `value.x === value.y` on mount, per the interface below — every fresh instance starts at
`{x:100,y:100}`, so it opens linked; an instance already unlinked to different X/Y values correctly
reopens unlinked). No interface change needed — the component spec below was already correct; only
the reasoning for choosing it was wrong and is now fixed. New component
`plugins/sgs-blocks/src/components/ScaleAxisControl.js` — the 2-axis analogue of WP core
`BoxControl`'s 4-side link pattern (D626: "architecturally the same linked/unlinked pattern
BoxControl's 4-side link already uses, applied to 2 axes"). Interface:

```
Props:
  label            string
  value            { x: number, y: number }   // shared unit — see fork below
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

**Fork, decided: replace, not add-alongside.** `ShapeDividersPanel` today has a per-edge px `Height`
`RangeControl` (20–300) and no horizontal-scale control at all. Two candidate shapes were considered:
**(A, decided)** replace `shapeDivider{Top,Bottom}Height` outright with
`shapeDivider{Top,Bottom}Scale:{x,y}` (%, default `{x:100,y:100}`, where `y:100` is the SVG's natural
height, translated to px via its own viewBox at render); **(B, rejected)** add a new
`shapeDivider{Top,Bottom}ScaleX` attribute alongside the unchanged px `Height` attribute. Reasoning
for A: this project's "no version bumps, no deprecations pre-production" policy (D293/D270) exists
precisely to license a clean attribute replace over an add-alongside when there is no live client
content to preserve; B would also leave two controls (px Height, % ScaleY) with overlapping visual
effect on the same block — a worse client-facing shape than one clean linked pair. No responsive
tiers proposed — shape dividers carry no existing per-breakpoint variant and D626 does not ask for
one; a deliberate scope boundary for this design, not an oversight.

**Review status (updated 2026-08-16).** Both council lenses have now run. Mechanism-fidelity +
DB-first compliance returned PASS on all three subsections (the `assembly.py:250` correction folded
in above). The universality/client-UX lens — hung on its first dispatch, re-run successfully — found
**F.2.1 and F.2.2 sound** (two citation corrections folded in above: the precedent-shape note in
F.2.1, the `accepts_allowed_blocks`/regression-guard-scoping corrections in F.2.2) and flagged F.2.3's
render behaviour and control-shape reasoning as unresolved. An independent adversarial confirmation
pass re-derived every factual claim in F.2.2 from source (not from this doc or either lens) and
confirmed all of them, catching one further correction (the DB-column analogy) along the way. Bean
then ruled directly on both F.2.3 open items (`decisions.md` D637's second addendum, 2026-08-16): the
X/Y render behaviour (edge-anchored Y extending outward, centre-anchored X with tile-below/clip-above
100% semantics) and the control shape (keep link/unlink — the earlier "unrelated axes" framing was
wrong; proportional-scale-by-default is the standard shape/image-resize convention, a stronger
precedent than the original `BoxControl` analogy). Full record: `decisions.md` D637 + both addenda.
**Net: all three of F.2.1/F.2.2/F.2.3 are locked and buildable as specced — step 7 has no remaining
design blocker.**

## PART G — Prefer native, don't hand-roll (adopt these WP mechanisms)

**⚠ Part G AMENDED by D402 (T0.4/T0.5 design gates, Bean-approved 2026-07-28) — the blanket
"adopt native" guidance is replaced by a per-support VERDICT table. Nothing adopts a support
without the Spec-32 skip-serialisation + scoped-emission pattern.**

| Support | VERDICT (D402) | Reasoning |
|---|---|---|
| `filter.duotone` | **ADOPT** (T3.5 imageControls wave) | Nothing hand-rolled exists; free client value on image blocks |
| `dimensions.aspectRatio` | **ADOPT** (T3.5) | Replaces 4 inconsistent per-block attrs |
| `shadow` | **KEEP SGS** | ShadowControl + `sgs_shadow_value()` exceeds the native preset picker |
| `dimensions.minHeight` | **KEEP SGS** | Per-breakpoint attr families beat native's single value; adopting = Part-F duplicate panel |
| `position.sticky` | **KEEP SGS** | Collides with the D400 behaviour cascade |
| `lightbox` | **KEEP SGS** (gallery) | Bespoke has more features; native considered only for `sgs/media` in T3.5 |
| `templateLock:"contentOnly"` | **PER-CLIENT OPT-IN ONLY** | Hides children's inspector settings (contradicts the inspector standard; D377/D378 rejection stands; D393 template-reapply risk). Build-time lock for a specific client with a real breakage problem — never framework patterns |

| Native mechanism | Use instead of | Priority |
|---|---|---|
| theme.json v3 `styles.blocks.<name>.css` + `appearanceTools` | per-block bespoke CSS plumbing | **HIGH** — fits per-client `theme-snapshot.json` |
| **Block Bindings API** (`register_block_bindings_source`) | any bespoke dynamic-content attr system | **HIGH** — WP's own direction |
| `LinkControl` | raw URL text fields | **HIGH** — internal search + rel + new-tab free |
| Native duotone / aspect-ratio / lightbox / sticky | hand-rolled filter/box/JS/position | **HIGH** — check before building any of these |
| Block style variations w/ inner-element styles ("Section Styles", 6.6) | bespoke variant switching where it's "same structure, different look" | Med — maps onto `variant_slots` |
| Fluid typography + spacing presets (theme.json) | hand-written type breakpoints | Med (complements device-tier, doesn't replace) |
| `register_block_pattern` + categories/blockTypes | uncategorised patterns | Med — audit existing `patterns/*.php` |
| Interactivity API (`@wordpress/interactivity`) | hand-rolled view.js DOM code | Med — real rewrite cost |
| Copy/paste styles (WP 6.2, free) | — | works IF styling is in native `supports` attrs (Spec 32 direction) |
| Save-as-default (locked 4-channel model) | a custom defaults store | — already the right call |
| Block Hooks | — | LOW — template-context only; SGS clones to Pages |

## PART H — Component quick-reference (which component for which job)

> ⛔ **THIS LIST IS THE CORE-COMPONENT REFERENCE, NOT THE CANONICAL CONTROL SET. Where it names a raw
> core component that SGS has since wrapped, the wrapper wins — and two of them are enforced by live
> build gates.** Corrected 2026-08-09 after the conflict was measured.
>
> | Job | Part H named | **Canonical (governing)** | What the gate ACTUALLY catches |
> |---|---|---|---|
> | colour | `ColorPalette` / `ColorGradientControl` | **`DesignTokenPicker`** (contract §1) | rule `04-colour-alpha` (`gate`) flags a raw colour picker **only when `enableAlpha` is absent** (`rules/04-colour-alpha.js:92`). `<ColorPalette enableAlpha>` passes clean |
> | link / CTA | `LinkControl` | **`SgsLinkControl`** (contract §2) | **nothing.** Rule `08-raw-url-link` matches `<TextControl type="url">` only (`rules/08-raw-url-link.js:99-101`) — it has no knowledge of `LinkControl` |
>
> ⛔ **Neither raw component is gated out of a block's `edit.js`.** An earlier draft of this box
> claimed "writing either raw component fails `prebuild`" — **false, and verified false by reading
> both rule bodies**. The contract's ban is a *contract*, not an enforced one; closing that gap is
> real outstanding work, not a documentation fix. Do not treat a green build as evidence of
> conformance here.
>
> Governing document: `.claude/plans/spec-35-control-type-contract.md` (AUTHORITATIVE 2026-08-08),
> which lists both raw components as **banned lookalikes**. **PART I of this same spec already
> records `DesignTokenPicker` and `SgsLinkControl` as BUILT + ROLLED OUT** — Part H was simply never
> swept when they landed, so the spec contradicted itself. Measured in `src/` at `a09226e8`: raw
> `<ColorPalette>` and `<LinkControl>` are rendered in exactly two files,
> `src/components/DesignTokenPicker.js:87` and `src/components/SgsLinkControl.js:154` — i.e. only
> *inside* the canonical wrappers. (Repo-wide they also appear in `scripts/inspector-scan/fixtures/**`
> and in `rules/04-colour-alpha.js`'s own matcher list, which is expected.)
>
> ⚠ **Part H sweep DONE, 2026-08-12** — narrower than the line list this box used to carry (those
> cached line numbers had already drifted; re-derived by reading every bare `LinkControl` mention in
> this file). Two genuine instruction-to-a-developer sites fixed: Part B's completeness-parity table
> (was "Link/CTA | `LinkControl`", now "**`SgsLinkControl`** (wraps `LinkControl`)") and Part F's
> anti-pattern list (was "raw URL field instead of `LinkControl`", now "instead of `SgsLinkControl`").
> The REMAINING bare `LinkControl` mentions in this file (Part C's "N: LinkControl" feature-parity
> annotations, the "Native mechanism" table's `LinkControl | raw URL text fields` row, this box's own
> comparison table, Part I's "wraps `LinkControl`" note) are deliberately unchanged — they correctly
> name the underlying WP-NATIVE primitive SGS's own `SgsLinkControl` wraps, not an instruction to
> reach for it directly. Conflating "names the native mechanism" with "tells you what to build with"
> was the actual defect; fixing every bare mention indiscriminately would have made those rows
> factually wrong (there is no WP-native "SgsLinkControl" mechanism to point to).
>
> ⚠ **The remaining ~23 assignments below were SWEPT 2026-08-14 (G4).** Border and line-height were
> already swept 2026-08-13 (below). One real mismatch found in this pass: **4-side box** was stated
> as bare `BoxControl` — the contract's §5 canonical is `ResponsiveBoxControl` (raw `BoxControl` is a
> named banned lookalike, §5 field 3 / contract line 1098, because it bypasses the tier wrapper).
> Fixed inline below. Every other assignment checked against its contract section (colour §1,
> length/unit §4.1, ENUM-family `ComboboxControl`/`FormTokenField`/`ToggleGroupControl` §3, media
> `FocalPointPicker` §7) matches what the contract already names canonical — no other correction
> needed. Native WP primitives with no dedicated contract clause (`AnglePickerControl`,
> `DateTimePicker`, `FontSizePicker`, `FontAppearanceControl`, `HStack`/`VStack`/`Flex`/`Spacer`/
> `Divider`, `ColorIndicator`, `Tip`/`Notice`, `Disabled`, `Dropdown`/`DropdownMenu`, `Modal`,
> `registerFormatType`, `__experimentalSpacingSizesControl`) are unconflicting native mechanisms, not
> lookalikes — left as-is. **Border and line-height WERE swept, 2026-08-13** — this box used to say
> core's grouped border-box component "agrees with contract §14", which D566 (2026-08-11) had already
> made false. Canonical is now stated inline below for both. **Do not reinstate either core component
> name in this file** — a `grep -c` for each is the commit gate, and the rejection rationale lives at
> contract §14.1 where it belongs.

Numeric+unit → `UnitControl` · bounded numeric → `RangeControl` (+input+reset) · 4-side box →
**`ResponsiveBoxControl`** (contract §5 — bare `BoxControl` is a banned lookalike, it bypasses the
tier wrapper) · colour → **`DesignTokenPicker`** (wraps `ColorPalette`; `enableAlpha`+`clearable`
default true — ⚠ **as of 2026-08-15 (`aaa91c3e`) `ColorPalette`/`ColorPicker`/`CircularOptionPicker`
are SGS-OWNED forks** at `src/components/colour-picker/`, forked verbatim-behaviour from
`WordPress/gutenberg` at pinned SHA `28c0dedc4eaf001a24237a1fbba4b0887698b000` (WP 7.0.4), TS→plain
JS, `@emotion/styled`→SCSS, new MIT deps `react-colorful`/`colord`/`clsx`; `DesignTokenPicker`
remains the canonical colour component unchanged — only the dependency it wraps is now local, not
`@wordpress/components`) · gradient → `GradientPicker` · angle/direction → `AnglePickerControl` · border →
a **composed builder** (width `UnitControl` + style `SelectControl` + token-aware colour picker) ·
radius → **`ResponsiveBorderRadiusControl`** *(both per contract §14.1 as amended by D566 — core's
grouped border-box component was deliberately NOT adopted, rationale at §14.1 field 1)* ·
spacing token → `__experimentalSpacingSizesControl` · segmented
choice → `ToggleGroupControl` · long/searchable list → `ComboboxControl` · multi-value tags →
`FormTokenField` · link/CTA → **`SgsLinkControl`** (wraps `LinkControl`) · font size → `FontSizePicker` · weight+style →
`FontAppearanceControl` · line-height → **`ResponsiveControl` wrapping `UnitControl`** (contract §4.1;
core's dedicated line-height component is NOT canonical here and has 0 usages tree-wide — retired
2026-08-13, and a `grep -c` for its name is the commit gate) ·
focal point → `FocalPointPicker` ·
**object-position → `FocalPointPicker`** (same component; responsive tiers required — added
2026-08-11, previously absent despite Parts B and C both listing object-fit/position as table
stakes) · **object-fit → `SelectControl`** (closed enum: cover/contain/fill/none/scale-down) ·
date → `DateTimePicker` · optional-controls group → `ToolsPanel`/`ToolsPanelItem` · in-row layout →
`HStack`/`VStack`/`Flex`/`Spacer`/`Divider` · swatch preview → `ColorIndicator` · inline hint →
`Tip`/`Notice` · greyed prerequisite → `Disabled` · compact secondary → `Dropdown`/`DropdownMenu` ·
destructive confirm → `Modal` · inline mark → `registerFormatType`. Free-from-supports: anchor,
className, align, aspectRatio, background, position, shadow, filter/duotone.

## PART I — SGS component action layer (exists vs build)

| Capability | SGS status | Action |
|---|---|---|
| Responsive per-breakpoint | `ResponsiveControl`, `ResponsiveBoxControl` EXIST | audit coverage; use everywhere responsive-worthy |
| Typography per element | `TypographyControls` EXISTS (R-22-13) | extend to appearance/letter-spacing where missing |
| Colour | `DesignTokenPicker` EXISTS — `enableAlpha` + `clearable` BUILT (both default true; verified 2026-07-28, `DesignTokenPicker.js:51-58,:87-94`). ⭐ **`SgsColourPanel` (the shared per-element colour panel that groups `DesignTokenPicker` instances under D621/D622's Styles-tab placement) — Track A rollout COMPLETE 2026-08-15** (`f6f3c033`, wave 2, on top of wave 1 + the `sgs/icon` pilot): most colour-bearing blocks now route colour through the shared panel — re-derive the exact split via `git log --oneline -- 'plugins/sgs-blocks/src/blocks/*/edit.js'` grepped for `SgsColourPanel`, do not trust a cached count here. **Track B has NOT started** — `container`, `cta-section`, `hero`, `trust-bar`, `site-header`, `site-footer` keep colour inside the shared `ContainerWrapperControls.js` (Bean-ruled separate session). Seven blocks (`notice-banner`, `quote`, `testimonial-slider`, `testimonial`, `option-picker`, `process-steps`, `product-card`) deliberately KEPT native `supports.color` sub-flags `true` alongside the panel — those flags are load-bearing for a root-level `style.color.*` mechanism the migration does not replace, so native colour UI may still appear alongside `SgsColourPanel` for those blocks specifically. `sgs/social-icons` was surveyed and found NOT a Track-A candidate (no custom colour attrs, only native supports) — needs its own design pass, not a migration. | DONE (Wave 1.1); Track A DONE 2026-08-15, Track B OPEN |
| Normal/Hover state | `StateToggleControl` EXISTS (2026-07-18) | roll out to stateful blocks |
| Extension gating | `hideExtensions` (opt-out, most extensions) + `enabledExtensions` (opt-in, hover/blockLink only, D579 2026-08-11) EXIST | — |
| **Shadow builder** | ⛔ **UPDATED 2026-08-16 (D632) — colour split out of the builder.** `ShadowControl` (`src/components/ShadowControl.js`) now stores SHAPE only (X/Y/blur/spread/inset); colour is a split sibling `{name}Colour` attribute that appears as a normal row in the per-block `SgsColourPanel`, matching D621/D622's placement model, composed at render/preview via `sgs_shadow_value_composed()` (PHP)/`resolveShadowPreviewComposed()` (JS). Onto this shape: `cta-section`, `trust-bar` (`iconCircleShadow`/`badgeImageShadow` only — its own root shadow renders inside the shared container wrapper, deliberately out of scope), `card-grid`, `team-member`, `brand-strip`, `testimonial`, `info-box`, `post-grid` (off a banned preset-only picker), `before-after`, `media` (off a raw CSS `TextControl`), `button` (off a hand-rolled object attribute). ~~**Residual: `sgs/quote`'s `boxShadow`/`boxShadowHover` still on the raw CSS `TextControl`**~~ — ✅ **CLOSED 2026-08-16 (D634), this row was stale until the 2026-08-17 completion audit.** `sgs/quote` was migrated onto the same shape as the other 11 blocks: `ShadowControl` for shape + flat sibling `boxShadowColour`/`boxShadowHoverColour` surfaced in `SgsColourPanel`, composed via `sgs_shadow_value_composed()`, with `card-grid` used as the reference implementation exactly as this row predicted. Verified live: `quote/block.json` declares both colour attrs and `quote/edit.js` mounts `ShadowControl`. | ✅ DONE (Wave 1 + D634 residual closed) |
| **Link/CTA** | `SgsLinkControl` **BUILT + ROLLED OUT** (`src/components/SgsLinkControl.js`) — card-grid, media (4 fields), product-card (3 CTAs), trust-bar item links migrated (`ac0c30eb`, 2026-07-28); raw-url-link WARNs 40→0 (2 reasoned EXC exemptions remain) | DONE (Wave 1) |
| **Bulk media/gallery** | **BUILT** — `MediaGalleryPicker` extracted from `gallery/edit.js`, both call sites swapped (`07c67642`, 2026-07-28) | DONE (Wave 2) |
| **Focal point / image size / aspect-ratio** | ✅ **FIXED 2026-08-11, later session (D585).** The 2026-08-11 correction below (kept for the record) found the control functionally reached 2 of 15 declaring blocks via a guessed-root injection. Census + fix shipped same day: 7 blocks had the dead/redundant declaration REMOVED (`info-box`/`decorative-image`/`responsive-logo`/`timeline` — no crop-box scenario applies; `brand-strip`/`trust-bar`/`hero` — already had a working bespoke mechanism, this was dead weight on top); 6 blocks CONVERTED to an explicit mechanism (`before-after`/`team-member`/`testimonial-slider`/`gallery`/`card-grid`/`product-card`) — each block calls a new shared helper (`includes/helpers-media-position.php`) with its OWN known selector instead of the old guessing filter. Live-verified on the canary via a throwaway REST-injected test page, not just code review. `testimonial`/`image-sequence` still declare the capability with a real crop scenario but were deliberately not converted — each needs its own per-item design decision (testimonial has 4 simultaneous media roles; image-sequence's target is a canvas, not an `<img>`). Full record: `decisions.md` D585, `plans/spec-35-capability-routing-doctrine.md` Part 9. ⛔ **2026-08-11, earlier same day — the correction that found this:** this row previously read "BUILT … DONE (Wave 2)" and was FALSE — the extension injected `sgs-has-image-controls` on the block ROOT and the CSS then guessed where the image was (`> img`, `figure > img`), matching only by accident. Original false claim: (`07c67642`) | ✅ **DONE (D585)** |
| **Gradient / bg overlay** | ⛔ **CORRECTED 2026-08-11 — this row undercounted AND overclaimed.** `BackgroundPanel` covers **4** blocks, not 3 (`trust-bar` was missing from this row). And "DONE" was premature: same day, the panel was found broken (hero's render.php never read the gradient attrs at all, plus a CSS specificity collision, plus a live conflict with native `supports.color` — all fixed, D579-D582) and redesigned (swatch+popover UI, tab-strip fix, opacity-control cleanup — `background-panel-redesign.md` D1-D6). Separately, whether colour/gradient should reach ANY block (not just these 4) was explored and closed same day: single-element blocks (text/button/heading/etc.) already had this via native WP colour support on a different mechanism — completed via a 17-block gap fix + a new effect-verification gate (`survey-background-colour-support.py`), not via `BackgroundPanel`. Full record: `go-track-1b-playful-hamster.md` Phase 4 "Background, part 2". | ✅ **DONE (D579-D582, Track A/B closure)** |
| **Spacing token control** | raw units | still open — not part of the 2026-07-28 waves; not gated by Part K |
| ToolsPanel disclosure | **BUILT + ROLLED OUT** — 23 panels converted across 19 blocks, 8 skip-reasoned in-code (`07c67642`+`f5fac495`) | DONE (Wave 2) |
| **Client-safe editing** | `templateLock:"contentOnly"` resolved **PER-CLIENT OPT-IN ONLY** (D402 design gate, Part G) | Not a framework rollout — deliberate, not a gap |
| **Dynamic content** | ~~check for bespoke~~ | ✅ **BUILT — this row was WRONG, corrected 2026-08-17.** `includes/class-sgs-block-bindings-support.php` (`Sgs_Block_Bindings_Support`) is live and wired at `sgs-blocks.php:296`, widening the native Block Bindings API for `sgs/text`, `sgs/heading` and `sgs/button`. Two further binding SOURCES are registered: `class-sgs-site-info-binding.php` and `class-product-bindings.php` (with a PHPUnit test). This is the native mechanism Part G mandates, not a bespoke one. **Residual: confirm the 3-block scope is the intended coverage, or extend it** — not "still open, nothing built" |
| **Reduced-motion gate** | verify on animation ext | **RESOLVED 2026-07-30 — the "gap" was a measurement bug, not missing gates.** A DB roster regeneration briefly flagged 18 blocks (14× `form-field-*`, `form-review`, `form-step`, `accordion-item`, `tab`) as lacking `prefers-reduced-motion`. All 18 were FALSE POSITIVES: `build-roster.py` substring-matched `"animation"` against the raw `supports.sgs` JSON, so `hideExtensions:["animation"]` — an opt-**OUT** list — was read as *having* animation. None of the 18 even has a `style.css`. Fixed by stripping `hideExtensions` before matching (`animation` 36→18; gate PASS; the 18 retained are the genuinely-animating blocks, all passing). **A genuine framework-wide gate already covers every block:** `theme/sgs-theme/assets/css/core-blocks-critical.css:69-78` (`*`/`*::before`/`*::after` + `!important`), enqueued unconditionally (`functions.php:233`) — it explicitly "replaces piecemeal per-block reduced-motion rules". **RESOLVED 2026-08-01: rule 5 now sees the global gate.** ⚠ The mechanism described below LIVES ON, but it moved: `audit-inspector-conformance.js` was retired 2026-08-06 (Task D, `4e07ab6c`) and this detector now sits in `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js`, which additionally resolves the theme directory via `ctx.themeDir` rather than a hardcoded path (so a fixture can simulate "global gate absent"). Historically, `audit-inspector-conformance.js` gained `findUnconditionallyEnqueuedThemeCssPaths()` + `cssHasUniversalReducedMotionGate()`: it reads `theme/sgs-theme/functions.php` live each run, follows the `add_action( 'wp_enqueue_scripts', ... )` hook to the enqueuing function, keeps only `wp_enqueue_style()` calls at brace-depth 0 (genuinely unconditional, not inside an `if`/`foreach`), resolves each enqueued CSS file, and checks it for a `@media (prefers-reduced-motion: reduce)` block that targets `*, *::before, *::after` with `!important`. A block whose own `style.css`/`view.js` has no `prefers-reduced-motion` string is no longer flagged when that live-detected global gate is present. Nothing is hardcoded as "the gate exists" — if the CSS rule or its unconditional enqueue is ever removed, the detector returns false on its next read and rule 5 goes back to flagging every genuinely-ungated animating block (proven via a negative-control run against a temporarily gate-blinded copy of the theme files, then confirmed byte-identical via md5 after restore). |
| **Whole-card link** | **BUILT** — stretched-link overlay (sibling overlay + aria-label + focus ring; nested-`<a>` impossible by construction) replaces the old whole-block `sgsBlockLink` wrap; team-member + info-box dead attrs deleted (`07c67642`) | DONE (Wave 2) |
| Native duotone/aspectRatio/sticky | duotone + aspectRatio **ADOPTED native** on media/gallery (D402 verdict table, `ac0c30eb`); shadow/minHeight/sticky/gallery-lightbox **KEPT SGS** (deliberate) | DONE (Wave 3) |

## PART J — Prioritised upgrade roadmap (sequenced)

**Wave 1 — framework-wide, high-impact, low cost (do first):**
1. `DesignTokenPicker`: add `enableAlpha` + `clearable` (fixes transparent everywhere) — ~small.
2. Audit every link/URL field → `LinkControl` wrapper (`SgsLinkControl`) — high client impact.
3. Build shared `ShadowControl` (real X/Y/blur/spread/colour+alpha) → replace None/Small/Medium selects.
4. `templateLock:"contentOnly"` in client patterns — client-safe editing, near-zero cost.

**Wave 2 — high-impact, medium cost:**
5. `MediaGalleryPicker` (bulk multi-upload) → brand-strip logos + any repeater-media block.
6. Extend `imageControls` = size dropdown + aspectRatio + object-fit + FocalPointPicker.
7. Whole-card clickable-link pattern for card-grid/team/product/testimonial.
8. Adopt `ToolsPanel` progressive disclosure on control-dense panels.
9. Ensure every animation is `prefers-reduced-motion`-gated (WCAG).

**Wave 3 — architectural / adopt-native:**
10. Migrate bespoke dynamic content → Block Bindings; verify native duotone/aspect-ratio/sticky
    used over hand-rolled; adopt Section Styles for "same structure, different look" variants;
    audit patterns' categories/blockTypes; consider Interactivity API for hand-rolled view.js.

## PART K — Rollout mechanism

Bean is QC-only long-term (CLAUDE.md SUCCESS). This standard must be enforced structurally, not by
memory: (a) fold Part L into `block-migration-DONE-checklist.md`; (b) a lint/gate that flags a
colour control without `enableAlpha`, a URL field not using LinkControl, a preset-only "shadow",
an animation without a reduced-motion gate; (c) `/doc-audit` cites this spec per block.

**Gates enforcing THIS spec (added 2026-08-16, D639) — both wired into `prebuild` in the same
commit that built them.** Full per-gate rationale: `plugins/sgs-blocks/CLAUDE.md` §prebuild gates.

| Gate | Enforces | Why it had to exist |
|---|---|---|
| `scripts/check-empty-inspector-containers.js` | **Part F** — an inspector container rendered with NO children is a dead control. An empty `<ToolsPanelItem>` still shows in the "+" menu and in `resetAll`, then displays nothing when opened; an empty `<PanelBody>` opens onto blank space. | The ~50-gate stack had **zero** coverage for this class, and one shipped through it to prove the point. `check-dead-controls.js` checks the INVERSE (an attribute whose control nothing renders) — a container whose children were deleted still has valid wiring, so it reads clean. ⛔ AST walk, never a regex: two regexes answered the same question with **0** and **471**. |
| `scripts/check-wrapper-capability-preconditions.js` | **§F.2.1** (`gridItems` requires `layout`) and **§F.2.2** (`supports.sgs.gridAreas` is RETIRED — any declaration fails the build). | `GridItemDefaultsPanel`'s `layout !== 'grid'` bail is render-time, not a declaration guarantee. Rule 2 began as an orphan guard ("must have ≥1 live reader", Part N's N-2) and became a retirement guard when building that reader proved none was ever needed — the converter derives area names from the draft's CSS. No baseline (zero violations existed) and no `--fix` (a codemod adding `layout` would change a block's capability set as a lint side effect). |

## PART L — Per-block inspector definition-of-done (checklist)

[ ] Settings/Styles/Advanced split via `group` · [ ] element-first panels · [ ] control-dense panels
use ToolsPanel · [ ] every colour has `enableAlpha`+clearable · [ ] every CSS-length uses UnitControl
(real units) or the spacing token scale · [ ] every 4-value prop per-side via box_family · [ ] compound
values (shadow/border) use real builders · [ ] links use LinkControl (new-tab + rel) · [ ] images have
size + aspect-ratio + object-fit + focal point where relevant · [ ] multi-item data is array-shaped
with gallery/repeater · [ ] responsive props expose the 768/1024 device switcher · [ ] states use
`StateToggleControl` · [ ] irrelevant universal panels hidden via `hideExtensions` · [ ] `MediaUploadCheck`
on every MediaUpload · [ ] no native-supports panel duplicated · [ ] native supports used over hand-rolled
(aspectRatio/duotone/sticky/lightbox) · [ ] animation `prefers-reduced-motion`-gated · [ ] decorative-image
+ ARIA-label where needed · [ ] keyboard + contrast + `aria-describedby` a11y pass · [ ] client patterns
use `templateLock:"contentOnly"` · [ ] no Part-F anti-patterns.

## PART M — Implementation status (living; updated 2026-08-11)

> ### Flat-to-object migration — COMPLETE 2026-08-11 (D580)
>
> `gap` (D563, `fa638cea`+`0cd1c314`), `maxWidth`+`contentWidth` (D568), `gridTemplateColumns`+
> `gridTemplateRows` (D569/D570), `columns` (D578) — all four properties that route through
> `class-sgs-container-wrapper.php`. ⛔ **"Passes 5-6 = font-size families + long tail" was FALSE**
> — every font-size family was already object-shaped, verified directly against `block.json`. The
> real remaining work turned out to be a 5th SHAPE this migration's tooling didn't classify
> correctly — 4 BOX-per-tier properties (`contentBandPadding` [7 blocks, shared wrapper],
> `contentPadding`, `pillPadding`, `padding`) — closed same-session (D580). Per-block evidence in
> `reports/visual-diff/*-2026-08-11.md`. Post-close survey re-run found exactly 1 unrelated
> residual (`sgs/team-member.photo`, a media art-direction tier — different shape, not scheduled).
> Full detail: `.claude/LEDGER.md` + `decisions.md` D580. Do not duplicate that content here.
>
> **One rule from that pass is a STANDARD-level rule and belongs in this document, not only in the
> plans:** a responsive family's **control primitive must match its STORAGE SHAPE**, and the two
> change together in one commit — `ResponsiveControl` for flat sibling attrs, `ResponsiveOverride`
> for an object-typed base. Governing text with the measured incident:
> `plans/spec-35-control-type-contract.md` §12 field 3.
>
> **Why it earned a place here:** the mismatch is silent and destructive in both directions.
> WordPress discards an attribute a block no longer declares, and coerces a flat value on an
> object-typed attr to its default. Migrating `gap`'s storage without its control left **19 of 21
> blocks with an inspector that deleted the setting when used** — through a green build, every static
> gate, and a deploy. **Only opening the editor finds this class**, which is the same conclusion D567
> reached independently the same day from the other track.

**The STANDARD (Parts A–L) is COMPLETE as a written spec (v2.0). The BUILD SURFACE against it is
now SUBSTANTIALLY COMPLETE (`07c67642` → `64f5080e`, late 2026-07-28, ~18 delegate-routed packages
across waves A+B + the Bean-eye/QC fix chain — see the dated completion block below); the component
layer and the Part-K gate ARE complete and genuinely wired fail-closed (`51ff7c27`). ⚠ Reconciled
2026-07-30: Spec 35 does still carry three named open items — Part I's own table lists them as
"still open" in the same document — so "no remaining build items" (an earlier claim in this
section) was a self-contradiction. The three: (1) **Spacing token control** — still raw units, not
part of the 2026-07-28 waves; (2) **Dynamic content** (Block Bindings migration) — still open, not
part of the 2026-07-28 waves. **(3) Reduced-motion gate — RESOLVED 2026-07-30, not a gap:** an
18-block flag proved to be a `build-roster.py` opt-out-list substring bug, and a framework-wide
gate already covers every block (see Part I). Its residual — the audit rule couldn't SEE that
global gate — was itself closed 2026-08-01: rule 5 now detects the gate live by reading
`theme/sgs-theme/functions.php` + its enqueued CSS each run (see Part I "Reduced-motion gate" row
for the mechanism), so it no longer false-flags a block that genuinely relies on the global rule.
Neither of the two genuinely-open items blocks the Part-K structural gate or the shipped
component layer.**

**Measurement & enablement layer (makes Part L enforceable) — SUBSTANTIALLY BUILT:**
- **Element-manifest conformance linter** (`plugins/sgs-blocks/scripts/check-element-manifest-
  conformance.js`): per-block OK/GAP/ORPHAN + a states axis. **67 of 80 blocks manifested, 13
  skipped; resting-state defect class CLOSED.** GAP is a queryable catalogue, not a backlog.
- **Code-derived control classification** (`extract-signatures.py`, committed `20ea88fe`
  2026-07-21): each attribute now carries which CSS property it drives (`css_property`), on
  which **element / state / tier** — all derived from code, never names. Routing-determinism
  ambiguity is **0 in the data** (was 106). Two-layer override architecture
  (`attr-classification-overrides.json` applied after the derived layer).
- **`inspector_control_type` made edit.js-AUTHORITATIVE** and wired into `/sgs-update` (reseeds
  every run); **93 wrong control types corrected** (2 independent audits, 0 stored-correct;
  incl. the nested `MediaUpload>Button` trap). This is the machine signal Part B (control
  completeness) and Part L (per-block DoD) need: you can now query, per block, which control
  each attribute actually renders — the prerequisite for the Part-K structural gate.

**New findings that shape the approach (2026-07-21):**
- **`role` (value-type) and `css_property`+element/state/tier (delivery) are PERPENDICULAR
  axes**, not competing — a control's completeness needs BOTH (what the value IS + how it is
  delivered). `role` measured **~99% accurate** on its measurable overlap; do NOT replace it.
  (parking `P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES`.)
- ~~Confirmed Part-B failure live in the wrapper: `sgs/container` band-width "custom"~~ **RESOLVED
  2026-07-23** — not reproduced (Playwright 20/20); already fixed at `d5416ae8`; Bean's report was a
  stale cached editor bundle. Parking entry archived (`memory/parking-archive.md`).

⛔ **PARTIALLY WITHDRAWN 2026-08-11 — see Part I's focal-point row.** "COMPLETE" holds for
`MediaGalleryPicker`, `ShadowControl` and `SgsLinkControl` (all three verified in live use). It does
**NOT** hold for the `imageControls` extension: built and attached, but functionally reaching 2 of
the 15 blocks that declare it. Built ≠ reaching. See `plans/spec-35-capability-routing-doctrine.md`.

**Roadmap (Part J) — BUILD status: COMPLETE (2026-07-28, `07c67642` → `64f5080e`).** All three
waves shipped same day; the plan referenced in earlier revisions
(`~/.claude/plans/please-read-through-all-hashed-wreath.md`) executed in full:
- **Wave 1 (rollout) — DONE.** `SgsLinkControl` migrated across all raw-URL fields (card-grid
  item links, media 4-field, product-card 3 CTAs, trust-bar item links, brand-strip — `ac0c30eb`);
  raw-url-link WARNs 40→0 (2 reasoned config-URL exemptions remain, tagged EXC). `ShadowControl`
  rolled out (testimonial `shadowHover`, trust-bar `iconCircleShadow`/`badgeImageShadow` —
  `b9c5f6d1`). `templateLock:"contentOnly"` resolved as **PER-CLIENT OPT-IN ONLY** (D402 design
  gate, Part G table) — not a framework-pattern rollout; not a gap.
- **Wave 2 — DONE (`07c67642`).** `MediaGalleryPicker` extracted from `gallery/edit.js` (both
  call sites swapped). `imageControls` extended: FocalPointPicker `{x,y}`, object-fit via scoped
  var, image-size dropdown ruled **NOT-FORCIBLE at extension level** (no universal attachment ID —
  documented, not a gap). Whole-card link rebuilt as a **stretched-link overlay** (sibling overlay
  + aria-label + focus ring; nested-`<a>` impossible by construction — replaces the old
  whole-block-wrap risk; team-member + info-box dead `blockLink` attrs deleted,
  `.sgs-block-link-wrapper` now 0 occurrences repo-wide). ToolsPanel rollout: 23 panels converted
  across 19 blocks, 8 skip-reasoned in-code (mode wizards/repeaters/variant-gated — product-card
  ×3, card-grid, testimonial-rating, trustpilot-repeater, hero-image wizard). Shared
  `GradientOverlayControl` built (one `BackgroundPanel` covers container/cta-section/hero/
  trust-bar — corrected 2026-08-11, see the Part K row for the fuller correction + the panel's
  subsequent redesign and Track A/B universal-extension closure).
  Decorative-image toggle + button aria-label chain fixed.
- **Wave 3 (native-adopt) — DONE per the D402 per-support verdict table** (`ac0c30eb`, Part G):
  duotone + aspectRatio **ADOPTED native** on media/gallery (skip-serialised + scoped;
  `dimensions.aspectRatio` verdict evidenced from core source — core inlines unconditionally,
  hence skip-serialise); shadow/minHeight/sticky/gallery-lightbox **KEPT SGS** (deliberate, not a
  gap — SGS exceeds the native equivalent in each case).
- **Part K structural gate: PROMOTED fail-closed (`51ff7c27`); the gate was REPLACED by
  `plugins/sgs-blocks/scripts/inspector-scan/run.js` on 2026-08-06 (Task D, `4e07ab6c`) and the old script deleted.**
  `audit-inspector-conformance.js`
  gained `--check` mode (exits 1 on any non-exempt WARN; missing roster also fails) and is wired
  as the final prebuild step. Promotion condition was measured, not asserted: 0 WARN-severity
  findings after the Wave-1 link/shadow migrations. Negative-control proven live: an injected
  raw-url `TextControl` killed `npm run build` (exit 1) with remediation guidance, then reverted
  clean.
- **Per-device CONTENT cascade (D4) + canonical shared `resolveTier()` — BUILT (`b9c5f6d1`,
  T1.1, then `ac0c30eb`/`e4bd72ef`/`eb255f06`, T1.2–T1.4).** Canonical `resolveTier()` now exists
  in both runtimes (JS `src/utils/responsive.js`, PHP `sgs_resolve_tier()`), one shared 16-case
  golden fixture, 16/16 both runtimes; `resolveResponsiveTier` is now a thin alias (no fork).
  `ResponsiveTriStateControl` + `sgs_emit_tier_rules()`/`emitTierRules()` (single-writer scoped
  per-tier `@media` emission, 9/9 golden both runtimes) consume it. Spec 37 **FR-37-14** (behaviour
  tri-state) is built and live-proven on this exact mechanism — **Spec 37 Group B is UNBLOCKED**.
  `responsive-visibility.js`'s three independent flat booleans are **deliberately excluded** from
  this cascade (D400 scope amendment, Bean-ruled 2026-07-28 — general block visibility keeps its
  own per-device toggles; see Part D4 above). `sgs_resolve_tier_booleans()` (the old boolean-only
  PHP resolver) was **DELETED** — 0 consumers once the rows migrated onto the canonical resolver.

**Also outstanding across the board:** editor-CANVAS verification — everything to date verified
by frontend render + REST attribute registration, never by opening the block editor
(`ShadowControl` precedent: crashed on first live render despite 180 passing unit tests, R-31-13).
**OPEN (parked, none blocking Spec 35):** `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` (Track 2, not
this spec) · `P-NO-INLINE-GATE-COVERAGE-GAPS` (gate canary page for var-driven features; see the
Spec 32 amendment below) · `sgs-758` lifted-CSS MIME error (one-off, unchased) ·
`HeaderBehavioursTest.php` needs a composer/PHPUnit env to execute · Shrink+Hide legacy-transition
overlap on pre-animation-timeline browsers (documented, not speculatively fixed).

**2026-08-09 (D537–D540) — THE PLACEMENT RULE itself changed shape; several rows above are now
superseded, not merely extended.** Full text: `decisions.md` D537–D540; canonical rule text: A3/A4
above + `.claude/plans/spec-35-control-type-contract.md` §THE PLACEMENT RULE.
- **A4's "block-level panel" is retired.** Every root-scoped control now resolves to a TIER 2
  property-family panel via `cluster-member-sets.json`, not a catch-all — see A4 above. The Task 3
  vocabulary gap this exposed (background-media + shape-divider families had no cluster member to
  resolve to) is now closed: `check-cluster-coverage.py`'s typo guard was widened to validate
  member keys against every registry row (not just `css:*`/`anim:*`), gaining a 7-case
  `--self-test` in the same change (`ab9cb5c7`).
- **A new advisory gate, rule 22 (`inspector-scan/rules/22-placement-rule-surfaces.js` +
  `placement-rule-surfaces.json`), asserts every doc surface stating the placement rule states the
  CURRENT one** (`dc332ba1`). Re-run: `node plugins/sgs-blocks/scripts/inspector-scan/run.js` —
  currently **0 flagged, 0 baselined** (re-derived 2026-08-09).
- **Measured, library-wide** (`python plugins/sgs-blocks/scripts/placement-reach.py`, re-derived
  2026-08-09): element-scoped 1,702/2,595 (65.6%), tier-2 893/2,595 (34.4%); `sgs/hero`'s tier-2
  count closed 61 → 30. Contested placements (the tie-break-instead-of-report defect the earlier
  46.1% figure hid) are **0 library-wide** — the last 9 were all `sgs/nav-menu`, resolved by its
  wrapper exit below. `inspector-scan` rule 21 (`render-without-control`) fell 243 → 130 in the
  same work (re-derived: `node plugins/sgs-blocks/scripts/inspector-scan/run.js`, at the time
  **130 flagged, 12 baselined**). ⛔ **RE-MEASURED 2026-08-09 at `a09226e8`: 129 flagged, 12
  baselined.** 130 was correct when written; `0fb1507d` (the `sgs/physics-canvas` `tagName` wiring)
  cleared its last finding. ⚠ Count `status:"FLAGGED"` — `core/report.js:96-101` puts BASELINED
  entries in the `--json` array too, so a raw array length reads 141.
- **The composite-mirror rule (root `CLAUDE.md` §"Composite-mirror rule") gained a fourth,
  measured exit condition (D538/D539): a block whose wrapper contributes ZERO live arrangement CSS
  to its own children may exit `SGS_Container_Wrapper` and render block-private — this is
  DIFFERENT from D294's KIND-based test and stands on its own measured evidence, not on D294's
  authority.** `sgs/nav-menu` exited on this test (24 of ~107 wrapper keys declared, 3 reachable,
  wrapper contributed no live CSS) — attrs 77 → 57, `render-without-control` findings for this
  block 17 → 0, contested placements 9 → 0. Two live bugs fixed in the same change: the "item gap"
  control moved from the wrapper root (where its flex sibling had already been `display:none`d,
  so it painted nothing) to `.sgs-nav-menu__bar`; the accessible name's double-`esc_attr()` was
  fixed to single. `sgs/site-header-row`/`sgs/site-footer-row` took the OPPOSITE fix — they KEEP
  the wrapper and had their ~7 real missing controls wired, because `responsive_model=>'object'`
  forces their InnerBlocks to be direct children of the element the wrapper's arrangement CSS
  targets (genuine containers, not specialised). `sgs/physics-canvas` SPLIT: ~18 box/width attrs
  were a real gap (`minHeight` had no control at all) and are now wired; ~61 were inert or
  colliding with a hardcoded selector in `style.css` and were deleted.
- **`contentWidth` is now a NAMED contract (D540): it may exist only on a block that renders a
  genuine inner band.** Five block-private composites (`quote`, `testimonial`, `notice-banner`,
  `team-member`, `product-faq`) were emitting `max-width` (from `maxWidth`) AND `width` (from
  `contentWidth`) on the SAME root selector — two competing widths under one name promising a
  second layer that did not exist. `contentWidth` was deleted from all five; `sgs/nav-menu` also
  lost `maxWidth` (redundant with its parent row's own width control, wired above).
- **The gate IS now built (2026-08-10): `inspector-scan` rule 23
  (`23-content-width-needs-inner-band.js`, ADVISORY).** Building it falsified D540's own census,
  which had grouped 33 blocks on "routes through `SGS_Container_Wrapper`" without reading each
  render path. Three more blocks were carrying the drift: `product-card` (suppresses the band
  unconditionally via `wrap_inner => false` and reads the attr nowhere — inert control, DELETED) and
  `info-box` + `option-picker` (never wrapper-routed at all; they dropped it under D294 and the
  census matched their COMMENTS saying so — both RENAMED `contentWidth` → `width`, behaviour
  identical, 6 canary rows migrated). `sgs/hero` split does NOT flag: it suppresses the `__inner`
  div but bands the content with centred `padding-inline` on the grid, which is a real band and the
  right mechanism for a grid item (Bean-ruled 2026-08-10). Re-run:
  `node plugins/sgs-blocks/scripts/inspector-scan/run.js` — currently **0 flagged**. Full record:
  `decisions.md` D540 §"CLOSED + CORRECTED 2026-08-10".

**2026-08-10 (session 2) — the shared wrapper became generically responsive; the tier axis is now
universal, not per-block.** Full amendment (the two-axis model, the six-row prop_map, the Stage-2
custom-property split, the four measurement controls): **`plans/spec-35-control-type-contract.md`
§12 (THE RESPONSIVE WRAPPER FAMILY)** — do not duplicate that text here, it drifts. Summary only:
- `inspector-scan` gained **rule 26** (a new detector; see the rule file for its exact contract) and
  `sgs_emit_responsive_css()`'s `WidthPanel` had its two duplicate "… by viewport" controls merged
  into the shared tier mechanism.
- The unreachable min-height panel was deleted (0 mount sites passed `'section'`, per D550).
- Dead image-control CSS was un-gated (per-property hover gating now applies).
- `sgs/gallery` migrated to the FR-37-16 object model — see its Block Build Status row in
  `plugins/sgs-blocks/CLAUDE.md`; `ResponsiveSpacingPanel` is now DELETED (D548).
- `sgs/hero`'s three mobile-only orphan attrs were promoted to full responsive triples.
- **The shared wrapper itself is now fully responsive (D549)**: 14 properties are tier-capable — 6
  shipped as data-driven `prop_map` rows (layout set), 8 named as Stage 2 (the `gridItem*` custom-
  property set plus `shadow`/`contentBandBackground`, STILL OPEN per D549's STOP-29 flag — do not
  treat these as shipped).
  ⚠ **AMENDED 2026-08-12 (D589): Stage 2 is now SEVEN properties, not eight.**
  `contentBandBackground` left the list permanently — the **capability is RETIRED, not pending**.
  Bean-ruled: a background colour or media fills the max-width of its CONTAINER and is never clipped
  to the inner content layer, so a band-scoped background was a design error rather than a
  tier-plumbing task. The attribute, its 5 editor controls, its element-manifest mappings and all
  four wrapper emission sites are deleted (0 stored instances anywhere on the canary, verified by DB
  query first). Do not re-derive the old 8-property list from D549's prose.
- A live `max-width:Array` bug in `sgs_responsive_normalise_object()` was fixed (an un-normalised
  object leaking into a scalar-only code path).

**2026-08-15 — `SgsColourPanel` Track A rollout complete + D621's Styles-tab placement genuinely
shipped (was ruled, not built, until today).** Three commits: `f6f3c033` (Track A wave 2, 33 more
blocks onto `SgsColourPanel` — see Part I's Colour row for the full split + Track B residual +
the seven blocks that deliberately keep native `supports.color`), `aaa91c3e` (the colour PICKER
itself forked from `WordPress/gutenberg` into `src/components/colour-picker/` — see Part H's
colour row), and `a5b74bd1` (the actual D621 fix: `SgsColourPanel.js` had **no `group` prop at
all** — Styles-tab placement was a one-line miss).
⭐ **The general lesson: a design ruling plus a status doc summarising it as "shipped" is not
evidence the code changed.** D621 was ruled and A3 above (line 48) was updated to say "COLOUR
SETTLED", and a prior session's status summary called it shipped — but the component itself was
never touched until a direct file read + a live editor check caught the missing `group` prop
today. Treat "ruled" and "summarised as done elsewhere" as two separate claims from "verified in
the component's own source" — this spec has now carried this exact failure mode more than once
(see the `ShadowControl` precedent at Part M's "Also outstanding across the board" note above:
crashed on first live render despite 180 passing unit tests).

## PART N — Role data layer + enforcement rules for Task F (added 2026-08-06)

**Why this Part exists.** Parts A–L specify the CONTROL SURFACE. This Part specifies the DATA
LAYER underneath it — the `role` on every `block_attributes` row, which says what the value IS.
The two are perpendicular and both are needed: `role` (what the value is) + `css_property`/element/
state/tier (how it is delivered). A control cannot be judged complete without both.

⛔ **NO CACHED COUNTS IN THIS PART.** Every number below names the command that regenerates it.
This is not pedantry: the live status doc carried "pool 69 / D4-review 20 / report-only 13" into a
session where the true figures were 23 / 10 / 5, and four separate task descriptions were written
against the stale ones. Read the number, do not quote this file's memory of it.

```
cd plugins/sgs-blocks/scripts/content-role-detect && python fingerprint_content_roles.py
```

**Pool reached 0 on 2026-08-06 (Spec 35 "Track 1b").** Every role in the pool was assigned BY
MECHANISM — hand-assignment stayed banned throughout (D497). `ASSIGNABLE 0` at `pool=0` is now the
TERMINAL STEADY STATE for this data layer: a future non-zero reading is a regression (a new
attribute landed unrouted), not a backlog to clear by hand. The command above still regenerates
the true figure every time — the "never cache a count" discipline does not relax just because the
count is currently zero; it is exactly the number a stale cache would get wrong first.

### N.1 — The mechanism map (what may LEGALLY seed each role)

Hand-assigning a role is BANNED (D497). A role may be written only by the mechanism that owns it:

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

### N.2 — Rules Task F must enforce (each earned by a live defect)

- **N-1. "Referenced" is not "used".** An attribute read into a variable that is then never used
  passes every consumption check that greps for the attribute NAME. `sgs/form.formName` shipped a
  live editor control and two variations seeding translatable copy while rendering NOTHING, and
  `check-dead-controls.js` reported `OK — 0 net-new dead controls`. **CHECK 5 (dead assignment)
  now covers this; 18 findings on first run.** A control that needs code to mean anything is not
  done (Part B).
- **N-2. A built mechanism is not a reached one.** The `link-content` role, its extractor and its
  reader were all built, tested and threaded — and the whole chain was INERT because nothing
  assigned the role and the writer was never invoked (`/sgs-update` runs `extract-signatures
  --task-b-only`). A built-but-unreachable mechanism reads exactly like a missing one. Gate on the
  OBSERVED end state, never on the code existing.
- **N-3. A detector's negative result describes the detector.** Three separate tasks were blocked
  by one gap — a detector that will not cross a function boundary. D4's own comment names it; D7
  is single-file; D1's symbol table is file-scoped. Before recording "no evidence", establish
  whether the evidence is merely unreachable.
- **N-4. Declare the expected population BEFORE the run.** A number below expectation is a claim
  requiring evidence. A number ABOVE it needs per-row justification, not a silent accept.
- **N-5. A zero from a search you wrote requires a positive control.** A dead-assignment probe
  returned "0 findings" and was wholly vacuous — a broken regex, not a clean codebase. It became
  trustworthy only once proven to CATCH a known-bad row.
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
- **N-10. A dead ASSIGNMENT is dead CODE, not automatically a dead CONTROL.** CHECK 5 (N-1) returned
  18 findings; triage showed 13 were unused local variables whose FEATURE STILL WORKS (the shared
  helper reads the raw `$attributes` directly, bypassing the dead local), 2 were abandoned attrs,
  and only 3 were genuine dead controls. The raw count was misread by its own author within
  minutes of the run. A severity split is owed before any finding is treated as a defect count.
- **N-11. A conservative gate refusing a provably-safe change is CORRECT, not a blocker to work
  around.** `check-markup-neutral.py` refuses ANY deletion of a non-comment line, so even a
  provably-dead variable deletion still needs real visual verification before it lands. Do not
  weaken a gate to land your own commit faster.

### N.3 — Enforcement status

**Governed by the CONTROL-TYPE CONTRACT (`.claude/plans/spec-35-control-type-contract.md`) since
2026-08-08, D522/D523.** The 27-condition DONE checklist it replaced is a tombstone; every one of its
30 items is ABSORBED into a control-type contract or CARRIED into that document's §CARRIED
OBLIGATIONS, proven by its ABSORPTION MAP. ⚠ **The former "0 of 24 end conditions" figure carried
here was dead and has been removed** — it was one of the doc claims the 2026-08-07 council flagged as
asserting more than the gates proved.

The bar for "enforced" is `STOP-CATALOGUE.md` §E6 (10 points) — **"has a script" is not the bar**,
and neither is "the gate reads green": a gate keyed to a component NAME has a blind spot by
construction, which is why the contract requires each rule to enumerate its banned lookalikes.
⛔ Task F builds no enforcement for a rule scoped against `block_capabilities` or icon `role` until
those two Tier 0 columns are corrected.

## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin. Full URL list
in the six 2026-07-18 research transcripts.
```
