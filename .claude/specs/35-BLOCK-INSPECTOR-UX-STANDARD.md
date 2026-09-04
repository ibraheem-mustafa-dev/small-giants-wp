# Spec 35 — SGS Block Inspector UX, Control-Completeness & Capability Standard

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What separated them was not the census — the slow rollout had one on day 2 —
but whether the TARGET SHAPE was settled first. See THE-MIGRATION-METHOD.md Step 3.

```
doc_type: spec
spec_id: 35
spec_version: 2.1
status: ACTIVE (v1 2026-07-18; v2 same day — expanded with a 6-stream research sweep:
        WP component capabilities, competitor parity, inspector UX/a11y, uncovered
        components, newer WP platform capabilities, interaction/effects/content;
        v2.1 2026-09-04 — /qc-council audit + 5-anti-pattern buildability investigation,
        PART L corrections, see the update box below the header)
owner: framework
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

> **Sibling spec (Bean decision, 2026-07-28): Spec 35 and Spec 32 stay SEPARATE, not merged.** Spec 35 (this doc) owns the block INSPECTOR-UX standard (editor-facing controls). Spec 32 owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Both gate every block build — read them together.

> **2026-09-04 update (`/qc-council` audit + 5-parallel-investigation pass).** This spec is
> **substantially but not completely implemented**. Confirmed CLOSED this session: rule
> `03-dense-panel-candidate` (C6, 10 blocks → `ToolsPanel`), rule `18-decorative-image-aria`
> (C7, 4 blocks), block-bindings widened 3→37 blocks (C15-5). **Newly built, advisory:** rule
> `41-co2-element-grouping-order.js` — found **61 live violations** the moment it ran (PART A4
> / CO-2 element grouping); PART L's "element-first panels — UNVERIFIABLE STATICALLY" line
> (below) is now FALSE, this rule is exactly that static check. **Genuinely still open:** rule
> `31-golden-colour-control`'s colour-completeness backlog (**195 live findings** at audit
> time — actively worked by `.claude/plans/phase-colour-conformance.md` +
> `.claude/plans/2026-09-03-golden-colour-staged-rollout.md`, re-run the survey for the
> current count, do not trust this number); the 61 element-grouping findings above; and,
> per a 5-agent investigation into PART F's ungated anti-patterns, **4 of 5 turned out
> genuinely buildable** ("no reset", "colour-only focus/selected", "help text not
> `aria-describedby`-linked" — none of these hit the false-positive wall that killed
> `scattered-element-controls.js` — plus "essential control only in sidebar" as a narrow
> candidate-list slice), and one ("sidebar as home for every option") only as a
> human-reviewed survey, never a pass/fail gate. **Bean then ruled on cost vs value (2026-09-04):
> build 3 as gates (no-reset, colour-only-state, aria-describedby); skip the other two
> outright** — the sidebar-only-control slice still needs a human call on every hit even at
> its narrowest, and the sidebar-as-home survey can't separate correct-by-design zeros from
> real gaps. Neither is worth the standing cost. Build shapes + dispatch:
> `.claude/prompts/2026-09-04-spec32-35-closure-prompt.md`.
>
> **Same-day follow-up (2026-09-04, closing this prompt's dispatch):** all 3 approved rules
> SHIPPED — `42-no-op-reset-controls` (0 live findings), `43-colour-only-state-indicator`
> (22 findings/12 blocks), `44-help-text-not-described` (3 findings, since **CLOSED — 0 live
> findings**, see below), all advisory mode with self-tests, PART L entries added below. The
> rule-41 backlog moved **61 → 55** (8 blocks fixed, 6 net findings closed — see PART L for the
> full breakdown; colour-completeness (rule 31) was explicitly left to the concurrent
> colour-track session, not touched here).
>
> **`44-help-text-not-described` CLOSED same day (2026-09-04, follow-up dispatch):** all 3 live
> findings fixed — `LinkPopoverControl.js:267` and `DateTimePickerField.js:101` (single trigger
> `Button`, `id` added to `BaseControl` so its native `help` paragraph gets `${id}__help`, that
> id wired via `aria-describedby` onto the trigger `Button`, matching `GradientCapableColourControl.js`'s
> established pattern) and `DesignTokenPicker.js:583` (`ColorPalette` renders multiple swatch
> buttons, not one focusable control, so the wrapper uses `role="group"` +
> `aria-describedby={helpId}` — the same ARIA-group pattern `CircularOptionPicker`/`IconPicker`
> already use elsewhere in this codebase). Re-run `run.js --json`: **0 live findings.**

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
  ⛔ **A3's old Settings/Styles split rule is retired** — it split an element's appearance from
  the content it modifies; 8 blocks were hand-sorted on it on 2026-08-08 and Bean rejected the result.
  Full rule: **PART O** (this spec) §"THE PLACEMENT RULE".
  ⭐ **COLOUR SETTLED 2026-08-15 (D621 + D622) — it is no longer an open exception to A3/A4.** ⚠
 **Genuinely shipped as of `a5b74bd1` (2026-08-15)** — `SgsColourPanel.js` had no `group` prop
  until that commit. See Part M's dated entry for the same date for the lesson this earned. The
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
 **PART O** (this spec) §"THE PLACEMENT RULE".
- **A5. Progressive disclosure with `ToolsPanel`/`ToolsPanelItem`** once a panel hits ~6+ controls:
  optional controls behind the "+" menu, 1–3 `isShownByDefault`, `resetAll`. THE anti-clutter tool.
  - ⛔ **NAMED EXCEPTION — COLOUR IS NEVER OPTIONAL (Bean-ruled 2026-08-13).** A colour control must
    not sit behind the "+" menu and must not be hideable per instance. Bean: *"Never should be set up
    like that with optional hide or show."* A client hunting a disclosure menu to find a colour is the
    very clutter defect A5 exists to prevent, arriving via A5's own mechanism. Colour's states
    (normal/hover/active) are reached **inside** the control's popover, never as sibling controls or a
    second panel — which is what removes the density pressure A5 would otherwise be solving for.
    Full control shape + the three binding clauses: **PART O** (this spec) §1 field 9.
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
| Link/CTA | **`LinkPopoverField` / `LinkPopoverContent`** (canonical). **8 blocks still mount the superseded `SgsLinkControl`** — migration outstanding. | raw URL `TextControl` |
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
**PART O** (this spec) §2 LINK).** Mount `LinkPopoverField`
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

**A11y/SEO as controls:** alt-text field (N) T · **Decorative-image toggle** (empty alt + `aria-hidden`) — BUILT: `imageIsDecorative`
(`media/block.json:293`) is declared and wired to render — `media/render.php:606` sets
`aria-hidden="true"` from it. Scoped to `sgs/media`; `sgs/decorative-image` needs no toggle because it
hardcodes `aria-hidden="true"` on every image it emits (`render.php:180,250`), i.e. the whole block is
decorative by construction. ⚠ **Residual is real but narrower than "gap": 13 other image-rendering
blocks still have no decorative/ARIA attribute** (`inspector-scan` rule 18, advisory) · heading-level (N) T · **General ARIA-label control** for icon-only buttons — PARTLY BUILT: `ariaLabel` is declared
on both `button/block.json:395` and `icon/block.json:175` — the two blocks that actually render
icon-only triggers. Also added to `sgs/container`, `sgs/cta-section` and `sgs/trust-bar` at D647 as a landmark
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
    `headerSticky`/`headerTransparent`/`headerShrink`/`headerHideOnScroll` are
`{"type":"object","default":{}}` (`site-header/block.json:142-157`). Spec 37 FR-37-14 (behaviour
tri-state) consumed the canonical `resolveTier()` cascade and is built and live-proven — see Part M.

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

**F.2.2 — `supports.sgs.gridAreas`: RETIRED, not built (D639).** The flag was real
(`sgs/hero/block.json` declared `["content","media"]`) but had zero readers, and building one turned
out unnecessary: the converter derives area names directly from the draft's BEM element token
(`assembly.py` step 3d), gated on the block declaring `<area>+<Suffix>` attrs, not on this flag.
`check-wrapper-capability-preconditions.js` rule 2 now FAILS the build on any declaration of
`gridAreas` (including an empty array). See `decisions.md` D639 for the full falsification chain.

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

**Control shape (D637, 2026-08-16): keep the link/unlink toggle.** Proportional-scale-by-default
with a lock/unlock toggle is the standard shape-resize convention (Figma/Photoshop/Canva) — a
stronger precedent than treating X/Y as unrelated axes needing independent controls. Default state
LINKED (computed as `value.x === value.y` on mount; a fresh instance starts at `{x:100,y:100}`, so it
opens linked; an already-unlinked instance reopens unlinked). New component
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
**Net: F.2.1 and F.2.3 shipped as specced (D639); F.2.2 (`gridAreas`) was retired instead of
built — see the BUILD STATUS box above (line 397).**

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
> Governing document: **PART O** (this spec) (AUTHORITATIVE 2026-08-08),
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
| Normal/Hover state | ⛔ **`StateToggleControl` is DEAD CODE — corrected 2026-08-17.** It exists and is exported (`components/index.js:45`) but has **0 imports and 0 JSX mounts** anywhere. Every apparent usage is a comment recording where it *used to* live (`brand-strip/edit.js:316`, `nav-menu/edit.js:463`) | ⚠ **"roll out to stateful blocks" never happened — and may not need to.** Hover/state colour is already delivered by a DIFFERENT, working mechanism: `SgsColourPanel`'s `rows[].states` array, passed through to `DesignTokenPicker`'s own `states` prop (e.g. `button/edit.js:395-397`). ✅ **RESOLVED 2026-08-24 (D765) — DELETED.** Bean's call: the `states`-prop route IS canonical. `StateToggleControl.js` has been removed from `src/components/` and un-exported from `components/index.js`; Normal/Hover lives INSIDE the colour popover via `DesignTokenPicker`'s `states` prop. Verified 0 mounts at any depth by two independent methods before deletion, and the plugin builds clean. Do not re-propose wiring it — the component no longer exists. |
| Extension gating | `hideExtensions` (opt-out, most extensions) + `enabledExtensions` (opt-in, hover/blockLink only, D579 2026-08-11) EXIST | — |
| **Shadow builder** | ⛔ **UPDATED 2026-08-16 (D632) — colour split out of the builder.** `ShadowControl` (`src/components/ShadowControl.js`) now stores SHAPE only (X/Y/blur/spread/inset); colour is a split sibling `{name}Colour` attribute that appears as a normal row in the per-block `SgsColourPanel`, matching D621/D622's placement model, composed at render/preview via `sgs_shadow_value_composed()` (PHP)/`resolveShadowPreviewComposed()` (JS). Onto this shape: `cta-section`, `trust-bar` (`iconCircleShadow`/`badgeImageShadow` only — its own root shadow renders inside the shared container wrapper, deliberately out of scope), `card-grid`, `team-member`, `brand-strip`, `testimonial`, `info-box`, `post-grid` (off a banned preset-only picker), `before-after`, `media` (off a raw CSS `TextControl`), `button` (off a hand-rolled object attribute). `sgs/quote` migrated onto the same shape as the other 11 blocks (D634): `ShadowControl` for
shape + flat sibling `boxShadowColour`/`boxShadowHoverColour` surfaced in `SgsColourPanel`, composed
via `sgs_shadow_value_composed()`, `card-grid` as the reference implementation. Verified live:
`quote/block.json` declares both colour attrs, `quote/edit.js` mounts `ShadowControl`. | ✅ DONE (Wave 1 + D634 residual closed) |
| **Link/CTA** | `SgsLinkControl` **BUILT + ROLLED OUT** (`src/components/SgsLinkControl.js`) — card-grid, media (4 fields), product-card (3 CTAs), trust-bar item links migrated (`ac0c30eb`, 2026-07-28); raw-url-link WARNs 40→0 (2 reasoned EXC exemptions remain) | DONE (Wave 1) |
| **Bulk media/gallery** | **BUILT** — `MediaGalleryPicker` extracted from `gallery/edit.js`, both call sites swapped (`07c67642`, 2026-07-28) | DONE (Wave 2) |
| **Focal point / image size / aspect-ratio** | **FIXED 2026-08-11 (D585).** 7 blocks had the dead/redundant declaration removed (`info-box`/`decorative-image`/`responsive-logo`/`timeline`/`brand-strip`/`trust-bar`/`hero`); 6 blocks converted to an explicit mechanism (`before-after`/`team-member`/`testimonial-slider`/`gallery`/`card-grid`/`product-card`), each calling `includes/helpers-media-position.php` with its own known selector instead of the old guessing filter (which had matched `> img`/`figure > img` only by accident). Live-verified via a throwaway REST-injected test page. `testimonial`/`image-sequence` still declare the capability with a real crop scenario but weren't converted — each needs its own per-item design decision. Full record: `decisions.md` D585, `plans/spec-35-capability-routing-doctrine.md` Part 9. | ✅ **DONE (D585)** |
| **Gradient / bg overlay** | `BackgroundPanel` covers 4 blocks (`container`, `cta-section`, `hero`, `trust-bar`).
Redesigned 2026-08-11 (D579-D582) after 3 defects were found same-day: `hero/render.php` never read
the gradient attrs, a CSS specificity collision, and a live conflict with native `supports.color`.
Fix: swatch+popover UI, tab-strip fix, opacity-control cleanup
(`.claude/plans/archive/background-panel-redesign.md` D1-D6). Separately, whether colour/gradient should reach ANY block (not just these 4) was explored and closed same day: single-element blocks (text/button/heading/etc.) already had this via native WP colour support on a different mechanism — completed via a 17-block gap fix + a new effect-verification gate (`survey-background-colour-support.py`), not via `BackgroundPanel`. Full record: `go-track-1b-playful-hamster.md` Phase 4 "Background, part 2". | ✅ **DONE (D579-D582, Track A/B closure)** |
| **Spacing token control** | raw units | still open — not part of the 2026-07-28 waves; not gated by Part K |
| ToolsPanel disclosure | **BUILT + ROLLED OUT** — 23 panels converted across 19 blocks, 8 skip-reasoned in-code (`07c67642`+`f5fac495`) | DONE (Wave 2) |
| **Client-safe editing** | `templateLock:"contentOnly"` resolved **PER-CLIENT OPT-IN ONLY** (D402 design gate, Part G) | Not a framework rollout — deliberate, not a gap |
| **Dynamic content** | BUILT: `includes/class-sgs-block-bindings-support.php` (`Sgs_Block_Bindings_Support`) is live
and wired at `sgs-blocks.php:296`, widening the native Block Bindings API for `sgs/text`,
`sgs/heading` and `sgs/button`. Two further binding sources registered: `class-sgs-site-info-binding.php`,
`class-product-bindings.php` (with a PHPUnit test). Residual: confirm the 3-block scope is intended,
or extend it. Two further binding SOURCES are registered: `class-sgs-site-info-binding.php` and `class-product-bindings.php` (with a PHPUnit test). This is the native mechanism Part G mandates, not a bespoke one. **Residual: confirm the 3-block scope is the intended coverage, or extend it** — not "still open, nothing built" |
| **Reduced-motion gate** | verify on animation ext | **Lesson (2026-07-30): a name-substring match on `supports.sgs` JSON is blind to negation** — `build-roster.py` read `hideExtensions:["animation"]` (an opt-OUT) as *having* animation, false-flagging 18 blocks with no `style.css` at all. Fixed by stripping `hideExtensions` before matching. **Current state:** every block is covered by one framework-wide gate, `theme/sgs-theme/assets/css/core-blocks-critical.css:69-78` (unconditionally enqueued, `functions.php:233`), detected live each run by `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js` (reads `theme/sgs-theme/functions.php`'s enqueue chain + the CSS itself for a universal `prefers-reduced-motion` block — nothing hardcoded, so removing the gate re-flags every ungated block). |
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

**Gate enforcing the RENDER-side consolidation standard (added 2026-08-21, D732/D733) — wired into
`prebuild` plus a `check:vacuous-guards` alias in the same commit that widened it.** This one guards
Spec 32's contract rather than the inspector surface, but it is listed here because it is the same
triad mechanism and the same enforcement stack.

| Gate | Enforces | Why it had to exist |
|---|---|---|
| `scripts/remove-vacuous-style-engine-guard.py --check` | A `function_exists()` check on a CORE WP function is only meaningful when that function landed AFTER the plugin's declared floor. Below it the false branch is unreachable — dead code wearing the costume of a safety check. | **109 such guards** existed across ~16 core functions against a `Requires at least: 6.7` floor. ⛔ The floor is **PARSED** from the plugin header, never hardcoded: a LOWERED floor makes a family load-bearing again, and a hardcoded constant would both assert a stale claim AND fail the build for reintroducing a *correct* guard. It **fails closed** when the header is unreadable, **exempts polyfill definitions** (`if ( ! function_exists('x') ) { function x(){…} }` is correct code that makes a file runnable outside WP — one such site would have silently broken a 60-assertion CLI self-test), and scans `src/` + `includes/` + **the theme**. |

**Two method rules this gate earned, both generalisable:**

- **Verify a version floor against core LOAD ORDER, not the version number alone.**
  `wp-settings.php` `require`s style-engine/script-modules/interactivity-api at lines 437/450/453 —
  before mu-plugins (508) and plugins (582) — and core never wraps those definitions, so no
  bootstrap window exists. The same check proves the rule DISCRIMINATES rather than being blanket:
  `pluggable.php` loads at **612, AFTER plugins**, so `wp_get_current_user` guards are REAL, and the
  `wp_*connector*` family is `@since 7.0`, above the floor. Both are correctly still in the tree.
- **A count from a convenient subset is not an enumeration.** Two figures were reported wrong the
  same way — a `src/blocks/*/render.php`-only grep put 74 at "73" and 5-and-5 at "4 and 3". Every
  miss lived in `includes/`. Run `--check`; never quote a hand-scoped grep.

## PART L — Per-block inspector definition-of-done (checklist)

> ✅ **VERIFIED PER-ITEM AGAINST CODE, 2026-08-17** — 4 parallel agents + an adversarial refutation
> pass. Previously all 21 boxes were unticked, which **understated** the position: several items are
> genuinely done and provable from gate output. Two items are unachievable **as worded** because they
> contradict Part G of this same spec. Full evidence:
> `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md`.
>
> ⛔ **A "0 findings" result is only evidence if a rule actually looks.** L15 below is the worked
> example: it was first recorded as satisfied on a zero that no rule produces.

**DONE — verified, gate-enforced (4):**

- [x] **links use LinkControl (new-tab + rel)** — rule 08 `gate`, 0 flagged (2 baselined non-content
      config URLs). Live control is `LinkPopoverField` (11 mounts); the popover placement rule holds
- [x] **responsive props expose the 768/1024 device switcher** — rule 25 `gate`, 0 flagged;
      `DeviceTabs` has zero callers, so no per-control switcher survives anywhere
- [x] **`MediaUploadCheck` on every MediaUpload** — rule 14 `gate`, 0 flagged; verified beyond the
      rule's `edit.js`-only corpus into `components/` + `extensions/`, all compliant
- [x] **animation `prefers-reduced-motion`-gated** — rule 17 `gate`, 0 flagged; JS checks in the motion
      extensions **plus** an unconditional framework-wide CSS gate

**MOSTLY DONE, one unaudited edge (1):**

- [~] **every colour has `enableAlpha` + clearable** — rule 04 `gate`, 0 flagged, and no raw colour
      pickers exist (all route through `DesignTokenPicker`, which defaults both true). ⚠ Rule 04 scans
      only `*/edit.js`; `colour-picker/color-palette/index.js` defaults `enableAlpha = false` and its
      callers were never audited. Close that, then tick

**NOT DONE — verified (4, stale — see corrections):**

- [x] **CLOSED 2026-09-04 (C6).** control-dense panels use ToolsPanel — rule
      `03-dense-panel-candidate` re-run live: **0 flagged.** All 10 named blocks converted
      (`form-field-checkbox/-date/-file/-number/-radio/-select`, `gallery`, `info-box`,
      `multi-button`, `text`). Commit `497261de0`.
- [x] **State capability is DONE via `SgsColourPanel`'s D609 tab-toggle mechanism, not
      `StateToggleControl`** — 60 blocks pass `states:` to the colour control (`DesignTokenPicker.js:27-34`).
      `StateToggleControl` is an orphan of the pre-D609 design, exported from `components/index.js:45` with
      0 mounts. Actions: (a) reword this checklist item to name the D609 mechanism; (b) delete the orphan
      component. Neither is a capability gap.
- [x] **CLOSED 2026-09-04 (C7).** decorative-image + ARIA-label where needed — rule
      `18-decorative-image-aria` re-run live: **0 flagged.** `sgs/cta-section`, `sgs/nav-drawer`,
      `sgs/social-icons` gained real toggles + ARIA wiring; `sgs/media`'s `imageIsDecorative`
      and `sgs/decorative-image`'s hardcoded `aria-hidden` unchanged (already correct).
      Commit `47fd0079c`.
- [~] **keyboard + contrast + `aria-describedby` a11y pass** — a ONE-TIME manual live pass
      (2026-09-04, `.claude/reports/2026-09-04-c12-c13-live-pass.md`) spot-checked 15 blocks:
      0 keyboard-trap patterns, 0 contrast failures, 1 real `aria-describedby` finding
      (attributed to a WP-core `UnitControl` internal element, not an SGS defect). **The
      `aria-describedby` slice now HAS a standing gate** (rule `44-help-text-not-described`,
      built 2026-09-04, advisory mode — see PART F below): a raw `<BaseControl help={...}>`
      mount wrapping a non-self-wiring child with no `aria-describedby` anywhere in its
      subtree. Precondition verified live first (WordPress DOES self-wire it for its own
      native `useBaseControlProps` controls — TextControl/ToggleControl/etc. — so the gate is
      correctly scoped to what self-wiring cannot reach). 3 live findings:
      `LinkPopoverControl.js:267`, `DesignTokenPicker.js:583`, `DateTimePickerField.js:101` —
      **all 3 CLOSED same day (2026-09-04 follow-up): 0 live findings**, see PART L below.
      Keyboard + contrast still have no static detector and need a repeat live pass, not a
      one-off.

**PARTIAL — measured (5):**

- [~] Settings/Styles/Advanced split via `group` — **25/83** (rule 01, advisory)
- [~] every CSS-length uses UnitControl or the token scale — `UnitControl`/`BoxControl` dominate 465
      instances, but a `RangeControl` raw-px residue and 117 statically-unresolved attrs remain
- [~] every 4-value prop per-side via box_family — **184/203** canonical
- [~] compound values use real builders — shadow confirmed (`ShadowControl`, 16–20 mounts); border
      builder now VERIFIED — `SgsBorderControl` mounted on 44/83 blocks (2026-08-30 grep; §14's
      box has the correction), against only 4 blocks left with an active native
      `__experimentalBorder`, not the 48 this line originally measured
- [~] images have size + aspect-ratio + object-fit + focal point — **6/11** upload blocks; 22 opt into
      the shared `imageControls` extension
- [~] **no no-op reset controls (Part F)** — rule `42-no-op-reset-controls` (built 2026-09-04,
      advisory mode, AST walk over each block's own edit.js): a `ToolsPanelItem`'s `hasValue`
      arrow whose body references zero identifiers, or `onDeselect` arrow whose body calls
      zero functions. 0 live findings (`node run.js --json`), independently corroborated by a
      plain-text grep for the two most obvious no-op shapes (also 0 hits) — a genuine clean
      result, not a claim the anti-pattern can never occur (self-test fixtures prove the rule
      CAN flag real code).
- [~] **no colour-only persisted state indicators (Part F / WCAG 1.4.1)** — rule
      `43-colour-only-state-indicator` (built 2026-09-04, advisory mode): a persisted UI state
      selector (aria-current/aria-selected/aria-checked/aria-expanded=true, `.is-active`,
      `.is-selected`, `.is-current`, `[open]`, a BEM `--active`/`--current`/`--selected`
      modifier — never a bare `:hover`) whose unioned declared properties are colour-only.
      **22 live findings** across 12 blocks, including all 3 candidates named to verify
      against: `sgs/post-grid`'s pagination current-page indicator, `sgs/product-card`'s
      active thumbnail, `sgs/buybox`'s current value-ladder row.
- [x] **CLOSED 2026-09-04 (same-day follow-up).** help text linked via `aria-describedby`
      (Part F) — rule `44-help-text-not-described` (built 2026-09-04, advisory mode,
      whole-tree scope — both real candidates are shared `src/components/*.js` files, not any
      one block's edit.js). Precondition verified live first: WordPress self-wires
      `aria-describedby` for its own native `useBaseControlProps` controls, so the gate is
      scoped to a raw `<BaseControl help={...}>` mount wrapping a non-self-wiring child with no
      `aria-describedby` in its subtree. 3 live findings on introduction —
      `LinkPopoverControl.js:267`, `DesignTokenPicker.js:583`, `DateTimePickerField.js:101` —
      all fixed same day: the two single-trigger-`Button` components (`LinkPopoverControl`,
      `DateTimePickerField`) now pass `id` to `BaseControl` and wire that id's `${id}__help`
      onto the trigger `Button`'s `aria-describedby`, matching `GradientCapableColourControl.js`'s
      established pattern; `DesignTokenPicker.js`'s `ColorPalette` mount (multiple swatch
      buttons, no single focusable child) wraps in `role="group"` + `aria-describedby`, the same
      ARIA-group pattern `CircularOptionPicker`/`IconPicker` already use elsewhere in this
      codebase. Re-run `run.js --json`: **0 live findings.**

**UNVERIFIED — investigated 2026-09-04, confirmed genuinely not buildable (1):**

- [ ] **no native-supports panel duplicated** — **still no gate, and now confirmed it can't be
one without reproducing a known failure.** A dedicated investigation (C5, 2026-09-04,
`.claude/plans/archive/2026-08-25-road-to-uniform-then-spec-39.md`) found this isn't buildable
as a general rule without reproducing the ~600-false-positive class that got
`scattered-element-controls.js` deleted (2026-09-02) — it can't distinguish a real duplicate
from a deliberate KEEP-SGS choice (Part G's D402 table). This is a genuine, checked exception,
not neglect — do not re-investigate without new information.

**NOT ACHIEVABLE AS WORDED — this checklist contradicts Part G (2):**

- ⛔ **native supports used over hand-rolled (aspectRatio/duotone/sticky/lightbox)** — Part G's D402
      verdict table rules **`position.sticky` = KEEP SGS** ("collides with the D400 behaviour cascade")
      and **`lightbox` = KEEP SGS (gallery)** ("bespoke has more features"). So 0/83 native adoption for
      those two is the *intended* architecture, not a gap. `aspectRatio` (5 blocks) and `duotone`
      (2 blocks, native key) ARE the adopt-cases. **Reword this item to name only aspectRatio + duotone**
- ⛔ **client patterns use `templateLock:"contentOnly"`** — Part G rules it **PER-CLIENT OPT-IN ONLY …
      never framework patterns**, and Part M already re-labels it "not a framework rollout — deliberate,
      not a gap". 0/46 framework patterns is therefore correct-by-design. **Reword or drop**

**PARTIAL, aggregate (1) — corrected 2026-09-04, this line was stale:**

- [~] **no Part-F anti-patterns** — 15 rules now gate (up from 7; D4, 2026-09-04 promoted 8
      more that cleared the project's own advisory-before-fail-closed bar), 0 gating findings.
      tab-group/dense-panels/decorative-image/responsive-duplicate are all now at 0 (closed or
      promoted to gate this session). **Still genuinely open**: rule `31-golden-colour-control`
      (colour-completeness, actively worked, re-run `survey.js` for the current count) and rule
      `41-co2-element-grouping-order` (built 2026-09-04, 61 live findings on introduction,
      **55 as of the same day's follow-up batch — 6 closed across 8 blocks** (accordion,
      before-after, star-rating, timeline, business-info, nav-drawer, text) — see below;
      re-run `run.js --json` for the current count). 5 named-but-ungated Part F anti-patterns investigated 2026-09-04: 4 confirmed
      buildable (essential-control-in-sidebar narrow slice, no-reset, colour-only
      focus/selected, help-not-aria-describedby-linked), 1 buildable only as a survey
      (sidebar-as-home-for-every-option), 1 confirmed genuinely not buildable (native-supports
      duplication, see above). **Bean then ruled on cost vs value: 3 approved as build tasks
      (no-reset, colour-only focus/selected, help-not-aria-describedby-linked); 2 rejected
      outright — essential-control-in-sidebar (even the narrow slice still needs a human call
      on every hit) and sidebar-as-home-for-every-option (can't separate correct-by-design
      zeros from real gaps, not worth building even as a survey).** Build shapes:
      `.claude/prompts/2026-09-04-spec32-35-closure-prompt.md`. **All 3 approved build tasks now
      SHIPPED (2026-09-04, advisory mode, see PART L's new entries below and rules.json):
      `42-no-op-reset-controls` (0 live findings), `43-colour-only-state-indicator`
      (22 live findings), `44-help-text-not-described` (3 live findings on introduction,
      **CLOSED same day — 0 live findings**, see the entry above).**

**NO LONGER UNVERIFIABLE (1) — a rule now exists:**

- [x] **element-first panels — a static rule now checks this** (`41-co2-element-grouping-order.js`,
      built 2026-09-04, advisory mode). It found **61 live violations** on its first run,
      spanning TIER-1 element grouping, DOM-order-vs-declared-order, and root
      Colour-before-Typography sequencing — the "unverifiable statically" framing this line
      previously carried is now FALSE. It does NOT check CO-28's still-open cross-block
      canonical panel order (that stays a separate, larger, not-yet-started question — Bean
      hasn't picked the canonical order yet). **Triage started same day: 61 → 55** (43
      `co2-scattered-element` + 12 `dom-order-vs-declared-order`; the dom-order count rose from
      10 to 12 as a documented, accepted side-effect — 3 blocks whose fixed element's panel
      sits in a different InspectorControls tab-group converted from scattered to dom-order
      findings, since cross-group source order doesn't map to visual order; net still a real
      reduction). 8 blocks fixed this session (accordion, before-after, star-rating, timeline,
      business-info, nav-drawer, text); ~22 blocks remain open (brand-strip, button, card-grid,
      form, gallery, mega-panel, modal, option-picker, post-grid, process-steps, quote,
      separator, tabs, hero, trustpilot-reviews, plus icon-list/notice-banner/pricing-table/
      product-card/team-member/testimonial, deliberately skipped this session — a concurrent
      colour-track session had already modified their render.php/block.json/edit.js). One real
      manifest bug found + fixed en route: `sgs/business-info`'s `text` element had no explicit
      `attrMap` entry for `textColour`, so DB cluster-fallback misrouted it once Icon got its
      own panel — added `"css:color": "textColour"` to the `text` element's `attrMap`. Static
      gates verified clean (parser + dead-controls) after each batch; **live Playwright/canary
      verification of the 8 fixed blocks was NOT reached this session — do that before trusting
      this beyond the static gate.** Re-run `run.js --json` for the current count.

**Multi-item data is array-shaped** (24 blocks, no counter-example found across spot-checked
repeater blocks) and **`hideExtensions`** (26 blocks, mechanism live) are treated as met; neither has
an independently derivable "should" denominator.

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
> **PART O** (this spec) §12 field 3.
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
- `sgs/container` band-width "custom" — RESOLVED 2026-07-23: not reproduced (Playwright 20/20),
already fixed at `d5416ae8`; the original report was a stale cached editor bundle. Parking entry
archived (`memory/parking-archive.md`).

⛔ **PARTIALLY WITHDRAWN 2026-08-11 — see Part I's focal-point row.** "COMPLETE" holds for
`MediaGalleryPicker`, `ShadowControl` and `SgsLinkControl` (all three verified in live use). It does
**NOT** hold for the `imageControls` extension: built and attached, but functionally reaching 2 of
the 15 blocks that declare it. Built ≠ reaching. See `plans/spec-35-capability-routing-doctrine.md`.

⛔ **CORRECTED 2026-08-17 — "COMPLETE" does not hold. 3 of Part J's 10 steps have no code behind
them**, verified independently (agents + an adversarial refutation pass), each confirmed as a real
named deliverable rather than a misreading:
- **Step 4 — `templateLock:"contentOnly"` in client patterns:** `contentOnly` returns **0 hits** outside
  test fixtures. ⚠ But see Part G / Part L: this is now ruled per-client-opt-in and Part M's own table
  already re-labels it "not a framework rollout — deliberate, not a gap". **Step 4's wording is stale,
  not merely undone — reword it rather than scheduling the work.**
- **Step 5 — `MediaGalleryPicker` → `brand-strip` logos:** untouched. `brand-strip/edit.js:24` imports
  the single-slot `MediaPicker`, not `MediaGalleryPicker`. **Genuinely unbuilt.**
- **Step 10 — "Section Styles" (block style variations with inner-element styles, WP 6.6):** **0 hits**
  for `Section Styles`/`SectionStyles` anywhere in the codebase. A real deliverable, quoted from Part
  G's own native-mechanism table. **Genuinely unbuilt**, and never surfaced by this section's own
  self-audit, which flags only spacing-token + dynamic-content.

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
above + **PART O** (this spec) §THE PLACEMENT RULE.
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
custom-property split, the four measurement controls): ****PART O** (this spec)
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
 **Stage 2 is SEVEN properties** (D589, 2026-08-12): `contentBandBackground` is RETIRED, not
pending — a background always fills its container's max-width and is never clipped to the inner
band, so this was a design error, not a plumbing gap. The attribute, its 5 editor controls, its
element-manifest mappings and all four wrapper emission sites are deleted (0 stored instances on the
canary, verified by DB query first).
- A live `max-width:Array` bug in `sgs_responsive_normalise_object()` was fixed (an un-normalised
  object leaking into a scalar-only code path).

**2026-08-15 — `SgsColourPanel` Track A rollout complete + D621's Styles-tab placement genuinely
shipped (was ruled, not built, until today).** Three commits: `f6f3c033` (Track A wave 2, 33 more
blocks onto `SgsColourPanel` — see Part I's Colour row for the full split + Track B residual +
the seven blocks that deliberately keep native `supports.color`), `aaa91c3e` (the colour PICKER
itself forked from `WordPress/gutenberg` into `src/components/colour-picker/` — see Part H's
colour row), and `a5b74bd1` (the actual D621 fix: `SgsColourPanel.js` had **no `group` prop at
all** — Styles-tab placement was a one-line miss).
**Lesson:** a design ruling plus a status doc calling it "shipped" is not evidence the code
changed — verify against the component's own source. Recurred twice in this spec: D621's
`SgsColourPanel` missing `group` prop, and `ShadowControl` crashing on first live render despite 180
passing unit tests.

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

**The pool is not a fixed number — it re-fills as attributes land and drains as they're
routed by mechanism.** `ASSIGNABLE 0` is the health signal (every attribute in the pool IS reached by
a detector); the pool count itself is not. Never quote a pool figure from this section — run
`fingerprint_content_roles.py` (command above).

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

**Governed by the CONTROL-TYPE CONTRACT (**PART O** (this spec)) since
2026-08-08, D522/D523.** The 27-condition DONE checklist it replaced is a tombstone; every one of its
30 items is ABSORBED into a control-type contract or CARRIED into that document's §CARRIED
OBLIGATIONS, proven by its ABSORPTION MAP. 

The bar for "enforced" is `STOP-CATALOGUE.md` §E6 (10 points) — **"has a script" is not the bar**,
and neither is "the gate reads green": a gate keyed to a component NAME has a blind spot by
construction, which is why the contract requires each rule to enumerate its banned lookalikes.
⛔ Task F builds no enforcement for a rule scoped against `block_capabilities` or icon `role` until
those two Tier 0 columns are corrected.


---

## PART O — AMENDMENTS 2026-08-22 (colour controls: D738 / D739 / D740)

Four amendments to the colour-control contract, all shipped and live-verified. The machine-readable
contract is `plugins/sgs-blocks/scripts/consistency/golden-controls.json` `controls.colour`; this
section records what changed and why, so the two do not drift.

1. **A colour row's HOVER state is a TAB inside one popover, never a second row (D738).**
   `DesignTokenPicker` renders a tab strip whenever `states.length > 1`, with a per-state
   Solid/Gradient toggle inside each tab. `GradientOverlayControl` is a thin adapter over that and
   takes an optional `solidHover`/`gradientHover` pair in `attrNames`.
   ⛔ **Build a `states` array as LITERAL entries, never a computed `.map()` over a spec list.**
   `inspector-scan` rule 31 resolves the state count STATICALLY and cannot evaluate a runtime
   predicate. A first fix used `.filter().map()`: it rendered both states correctly and the rule
   reported "carries 1 state". The code improved while the detector went blind.

2. **The overlay's responsive tier axis lives on OPACITY, not colour (D739).** Per-device overlay
   need is scrim WEIGHT, not hue. `backgroundOverlayColour{Tablet,Mobile}` were the framework's ONLY
   responsive colour attributes and are DELETED; `backgroundOverlayOpacity{Tablet,Mobile}` replace
   them. Only the opacity declaration is re-emitted per tier — restating colour/gradient/blend inside
   a `@media` block would make the tier rule a second owner that silently outranks a later desktop
   edit.

3. **Overlay is a SIBLING control, not an `SgsColourPanel` row (Bean 2026-08-22).** Its opacity and
   blend-mode extras stay on the sibling control. `SgsColourPanel`'s row contract is UNCHANGED — it
   has no field for either, and growing it would be a Rule 7 change affecting 64 mounting blocks.
   A sibling control is still fully enforced: rule 31 reaches shared components through
   `reachedComponents()` over `src/components/`, independent of panel rows.

4. **Every colour picker that can store a palette token MUST pass `linked` (D740).** Without it
   `makeChangeHandler()` stores the raw CSS colour on every pick and never a slug, silently
   unlinking the client's brand token. `ShadowControl` had this defect across 15 blocks.
   ⚠ **Before adding `linked` anywhere, verify the CONSUMER resolves slugs** — a bare slug reaching
   CSS is invalid and the browser drops it silently (D684). `ShadowControl` was safe because
   `sgs_shadow_value_composed()` passes through `sgs_colour_value()`.
   ⚠ `enableAlpha` is a SEPARATE decision from `linked`. Turn it off only where a dedicated opacity
   attribute carries transparency instead (the overlay, D717/D739). **Shadows KEEP alpha** — a
   translucent shadow is the normal case and there is no shadow-opacity attribute, so removing it
   would delete a capability. Consequence, stated: lowering alpha still stores a raw colour.

⛔ **Shadow rows have NO gradient recipe** — `box-shadow` takes a colour and a gradient there is
invalid CSS. That exemption belongs in the DETECTOR, stated once, not as a per-block
`colourExemptions` entry: the reason is a universal CSS fact, and N copies of one sentence is the
boilerplate the exemption contract's own rule calls a finding. Open work, tracked in
`.claude/plans/phase-colour-conformance.md`.

## PART O — THE CONTROL-TYPE CONTRACT *(folded in from **PART O** (this spec), 2026-08-17, Bean-approved)*

> **Why this is here.** This content was `status: AUTHORITATIVE (2026-08-08)` but lived as a 143 KB
> `doc_type: reference` file in `.claude/plans/`, which this spec then deferred to at nine separate
> line sites. An authoritative contract outranking its own numbered spec, from the plans folder, is a
> doc-architecture defect: `plans/` is working material, `specs/` is the standard. Folded here so
> Spec 35 is self-contained and there is one governing document, not two.
>
> **What folded:** every binding clause — the placement rule, the element manifest, the scoping axes,
> all 14 numbered control-type contracts, the carried obligations, and both cross-cutting sections.
>
> **What did NOT fold, deliberately:** the 2026-08-07 council verdict, the 27-condition absorption
> map, the point-in-time defect register and the enforcement plan. Those are historical records of
> how this contract was arrived at, not rules to follow. They remain in git history at
> **PART O** (this spec) (now a tombstone).
>
> ⚠ **Section numbering is preserved.** A citation of the form "contract §1 field 9" or "§14 BORDER"
> still resolves — read it as "Part O §1 field 9". Sub-headings were demoted one level to nest here.

### How to read a contract

Every control type below declares the same eight fields. A block satisfies the contract for a type
when it is in that type's **scope** and uses the **canonical component** with the **required props**,
in the **correct tab**, and contains none of the **banned lookalikes**.

---

### ⛔ THE PLACEMENT RULE *(amended 2026-08-08, Bean-locked — replaces "behaviour → Settings"; TWO-TIER structure added 2026-08-09, D537)*

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

⚠ **"Panel order = the element's `order`" is PROVISIONAL (Bean, 2026-08-08).** It gives a per-block
order, which is not the same thing as **CO-28**'s cross-block canonical order — and CO-28's own gate
("Bean picks the canonical panel order — a Rule 7 design gate") **still stands, unreleased.** Research
2026-08-08 supports leaving it open: no competitor centralises panel order; in Kadence, Spectra,
Stackable, Otter and Essential Blocks alike it is authoring order. Do NOT build an ordering rule from
this line. Spec 35 **A8** ("panel order = frequency-first") is the other side of the same open
question.

**Derived, never hand-sorted.** The source is `supports.sgs.elements` in each `block.json` —
**83 of 83** files declare it as of 2026-08-19 (`survey-control-mounts.py .`); 307 elements. Where an element cannot be
resolved, the control **stays exactly where it is today**
and the ambiguity is reported — no-worse-than-today is the floor.

**Applies to every state, not just hover.** `states.hover`, `states.current` and
`states.scrolled` all render inline beside their base value. **Measured 2026-08-19**
(`python scripts/surveys/survey-control-mounts.py .`): 22 elements declare `hover`, 3 `current`, 1
`scrolled` (25 elements declare a state; 1 carries two).
⚠ **`scrolled` ADDED 2026-08-19 (D682)** — admitted to `golden-controls.json`'s REAL state vocabulary
on the same basis `current` was: a class toggled at RUNTIME (`.is-header-scrolled`, by
`header-behaviours/view.js`) and painted by CSS in `sgs/site-header/render.php`. It is not notional —
the mechanism shipped long before the state was named. It lets the header background be ONE two-swatch
colour row (at rest / once scrolled) rather than two single-state rows. ⚠ **Corrected 2026-08-19
(D676/D678) — the third state's DB name is `current`, not `selected`.** Bean asked to rename it;
`css_state` is a derived column (`extract-signatures.py` → `css-property-classifications.json` →
`/sgs-update`), so the rename was a 9-step migration, applied via `/sgs-update --stage 1` and
verified live: `block_attributes.css_state` now reads `current` (13 rows), `hover` (115 rows), no
`selected` remains anywhere. `block.json` element `states` keys were migrated too (`option-picker`,
`table-of-contents`, `tabs`, `breadcrumbs`). The canonical vocabulary now lives in
`golden-controls.json`'s `_meta.stateVocabulary`, not `cluster-member-sets.json` (D673 — that file's
own `states` block has zero readers and is documentation, not a source of truth).

**Controls with no element** — anything injected by a universal extension in
`src/blocks/extensions/`, and any block-wide setting — belong to no element by construction. Under
D537 (2026-08-09) they do **not** collect in one catch-all "block-level panel": each one resolves
to its **TIER 2 property-family panel** (text/fill/layout/position/motion/animation) via
`cluster-member-sets.json`, exactly as an element's own controls do. Only a control that styles
**nothing** — no CSS property behind it (`variant`, `templateMode`, `tagName`, `layout`,
`autoplay`, `showDots`, `required`) — takes the single pinned-first `Settings` panel. The
per-control-type `Tab` field below is now subordinate to this resolution too: it picks the
WordPress *group* only for a "styles-nothing" control landing in the pinned `Settings` panel, not
for any control that has a real property family.

#### Where the tabs go — Bean-decided 2026-08-08

**SGS owns a three-tab bar (Content · Style · Advanced), as Kadence, Spectra and Stackable all do.**
The native Settings/Styles split is not a standard: core has **no** semantic rule for it. Verified in
the Gutenberg source — the Styles tab is a hard-coded list of native block-support categories
(`typography`/`color`/`background`/`border`/`dimensions`/`layout`/`position`/`filter`/`elements`) and
the Settings tab is simply the `default` group, i.e. everything else. There is no principle to apply,
which is exactly why every attempt to apply one produced a different answer.

⛔ **SEQUENCING — the tab bar lands AFTER native-supports retirement (design §5), not before.** While
27 blocks still declare native `color` (unverified this pass — re-check before relying on it) and,
as of 2026-08-30, only **4** declare an ACTIVE `__experimentalBorder` (down from the 48 this line
originally measured — the Shape-B border migration retired it from the other 44; see §14's
correction box), core renders its own Styles tab regardless of what we do. Shipping our tab bar
first gives the client THREE SGS tabs plus core's Styles tab — strictly worse than today. Native
retirement is itself blocked on the background capability (design §3 / Phase 1), and the border
half of that retirement is now nearly done — **re-assess whether Phase 1's border-blocking
premise still holds before treating "Phase 1 remains the first build" as settled.**

**Until the tab bar ships**, element panels stay in Settings and native supports stay in core's Styles
tab. That is the interim state, not the target, and it is not a rule anyone should extend.

#### Why this replaces the old rule

The retired rule was *"behaviour → Settings; appearance → Styles. This discriminator is the
contract"* (**§8 BOOLEAN field 4** — both CO-28 and Cross-cutting A mis-cited it as "§6 field 4"; §6
is STATE / HOVER). It sorts by what a control DOES and says nothing about what it BELONGS TO, so every
element's appearance control got pulled out of that element's panel and piled into Styles. Eight
blocks were hand-sorted on it on 2026-08-08 and Bean rejected the result. **The doc was the defect,
not only the pass that followed it.** Those 8 blocks (`dfba396b`) are **superseded, not reverted** —
re-derived by this rule like any other block.

**Prior art this is modelled on** (researched 2026-08-08, primary sources): Kadence, Spectra and
Stackable each group a composite block's controls by PART, one named panel per visible element;
Otter (`review`) and Essential Blocks (`team-member`) converge on the same shape independently in
hand-written source. Hover as a per-control state switch beside the base value is unanimous —
Kadence, Stackable (4 states), Otter, and core's own `state-control.js`. **Nobody centralises panel
order**; in every codebase checked it is authoring order, which is why CO-28 stays open (below).

**Design of record:** `.claude/plans/archive/2026-08-08-element-driven-inspector-design.md` §2.1, §2.2,
§10.1–10.2.

---

### THE ELEMENT MANIFEST — schema of record *(rehomed here 2026-08-08)*

`supports.sgs.elements` in each `block.json` is what THE PLACEMENT RULE and CO-2 derive from, so its
schema is normative and lives in a **living** doc. It previously lived only in
`.claude/plans/archive/spec-35-compound-control-sets-design.md` §"The element manifest" — an
**archived** doc that a live gate (`scripts/check-element-manifest-conformance.js`) still cited.
Archive is git-blame-only by project convention; a load-bearing schema cannot live there. That
document remains the historical derivation; **this section is the schema.**

**Measured 2026-08-19** (`python scripts/surveys/survey-control-mounts.py .`): **83 of 83
`block.json` files declare `supports.sgs.elements`; 307 elements. 25 elements declare a state —
`hover` 22 · `current` 3 · `scrolled` 1 (on `sgs/site-header.wrapper`) · 1 element carries two.**
`scrolled` is a real state name (renamed from `selected` → `current` at D676/D678; `scrolled` added
separately at D682) and must be included wherever this document enumerates the state vocabulary. ⚠
Counts drift — re-derive from the manifests rather than quoting this line.



```jsonc
"supports": { "sgs": { "elements": {
  "<elementKey>": {
    "label": "Headline",              // REQUIRED — the panel title the client reads
    "order": 7,                       // REQUIRED — panel position; ties break by reading order
    "clusters": [ "text", "fill" ],   // REQUIRED — which of text/fill/layout this element HAS (F4 flag)
    "prefix": "headline",             // OPTIONAL — attr-name prefix for the default convention
    "isWrapper": true,                // OPTIONAL — ONLY the element representing the block ROOT.
                                      //   Gates the native-supports fallback, AND selects TIER 2
                                      //   of THE PLACEMENT RULE (D537 — block-root controls
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

#### `contentAttrs` — the field added by this amendment

**Problem it solves, in plain English.** The manifest records which *styling* properties an element
owns ("the headline owns its font size and its colour"). It records nothing about which *content*
field belongs to that element ("the headline's words live in the attribute called `headline`"). CO-2
requires an element's panel to hold its content **and** its styling. The styling half is in data; the
content half is today knowable only by reading each block's `edit.js` by hand — which is exactly the
hand-authoring this model exists to remove.

**Definition.** `contentAttrs` is an ordered list of `block.json` attribute names naming the content
fields that element owns (its text, its media source, its link, its heading tag). Additive,
machine-checkable, and read by the inspector to gather an element's content controls into its panel.

**Binding conditions (Bean-decided 2026-08-08 — "generate and review"):**

1. **Generated, then reviewed — never hand-written across 283 elements.** The generator derives
   ownership from what `render.php` actually prints inside each element, matching how `attrMap`'s own
   403 `native:` entries were produced.
2. **Its output is a PROPOSAL until reviewed.** `sgs/hero` first; Bean reads it before a second block
   is touched.
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

#### Attr→element resolution order (unchanged — implemented in `resolveMember()`)

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
(`check-element-manifest-conformance.js:305-330`) also accepts `suffix` + `members` alongside
`attrMap`. No block uses it today. It is live and reachable — document it before relying on the
`attrMap` form being the only one.

**There is one denominator: 83.** Measured at `a09226e8`, all three sources agree:

| Source | Count |
|---|---|
| `SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'` | **83** |
| `ls src/blocks/*/block.json` | **83** |
| `ls src/blocks/*/edit.js` | **83** |
| `inspector-scan` `_meta.denominator` (roster / disk / union) | **83 / 83 / 83** |

`ls -d src/blocks/*/` returns 84 — the extra directory is `extensions/`, which holds no `block.json`
and is not a block. That is the whole of the old discrepancy.

⚠ **Do NOT mechanically rewrite every "84" in this document to 83.** Most downstream 84s are inputs
to a *derived* figure measured at the time (e.g. LINK §3's "67 = 84 − 17 opt-outs"). Each such figure
must be **re-derived by running its own query**, not decremented — silently shifting a derived number
by one is exactly the unmeasured-relay trap this document exists to prevent. Quote the denominator,
and its measurement date, with any figure derived from it.

---

### The scoping axes (machine-readable — never a hardcoded block list, per R-31-1)

Denominator is always **83** (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`) — ⛔ **corrected
2026-08-09 from 84; that query returns 83 today.** The per-axis splits in the table below were
measured against the older roster and are NOT re-derived here: re-run each axis before quoting it.
Full reconciliation in the ELEMENT MANIFEST section's denominator box.

| Axis | Source | Split |
|---|---|---|
| `surfaces.colour` | roster.json | **65** (measured 2026-08-19, `survey-control-mounts.py .`) |
| `surfaces.styling` | roster.json | **64** (measured 2026-08-19) |
| `surfaces.media` | roster.json | **33** (measured 2026-08-19) |
| `surfaces.animation` | roster.json | **22** (measured 2026-08-19) — **the proven precedent**, used by rule 17 |
| `surfaces.link` | roster.json | **17** (over- AND under-inclusive — see LINK §5). ⚠ Was 16; D523 flipped `sgs/form` when `successRedirect` became `SgsLinkControl`, because `build-roster.py:91` derives this axis from a haystack INCLUDING `inspector_control_type`. Regenerate `roster.json` after ANY DB write to that column. |
| `category` | roster.json | content 46 · forms 17 · interactive 13 · layout 8 |
| `blocks.tier` | DB | block 80 · class-section 4 |
| `block_composition.container_kind` | DB | content 12 · layout 16 · section 6 (scoped to built SGS blocks) |
| `block_composition.composition_role` | DB | content-block 65 · leaf 10 · section-root 8 · wrapper-shell 1 |
| `blocks.parent_block` | DB | 23 child-restricted blocks |
| `blocks.replaces` | DB | 23 replace a core block |
| `blocks.variant_attr` | DB | 5 variant-bearing blocks |
| `block_attributes.is_responsive` | DB | 45 blocks |
| `block_attributes.box_family` | DB | 46 blocks |
| `block_attributes.css_state` | DB | 23 blocks (after excluding one mistag) |
| **`extensions/*` REACH** | **the extension source itself** | **NOT a DB axis — see below** |

#### ⛔ The EXTENSION SURFACE axis (council S1 — added 2026-08-08, restores the generalisation)

**No block-scoped axis above can select a control injected by a universal extension**, because a
`blocks.registerBlockType` filter writes attributes at runtime and `block_attributes` only ever sees
what a `block.json` declares. That generalisation still holds. The specific reach figure attached to
it does not — see the correction immediately below.

**The `hover` extension's reach is 0 blocks.** D551 flipped `hover` (and `blockLink`) from
`hideExtensions` (opt-out denylist) to `enabledExtensions` (opt-in allowlist); `isExtensionEnabled()`
now returns true only when a block.json explicitly lists the slug, and verified 2026-08-19
(`grep -A3 enabledExtensions src/blocks/*/block.json`): no block.json lists `hover`. STATE's "23 blocks, 3
conform" (§6 field 5) is a name-matched DB count, independent of this extension's live reach, and
still stands on its own terms.

⚠ **Reach must be derived PER SLUG from whichever mechanism currently governs that slug, never
copied from one extension to another.** Live tallies measured 2026-08-19 (`grep -c` per
`enabledExtensions` listing): `background` 7 · `width` 5 · `shapeDividers` 4 · `layout` 3 ·
`gridItems` 3 · `blockLink` 3 · `hover` 0. A "67-block reach" figure attached to any OTHER slug in
this document (LINK's block-link surface, SHADOW's preset reach) must be independently re-verified
against this same allowlist — see those sections' own corrections.

**What is true today (verified 2026-08-19):** `run.js` `buildCtx()` supplies `extensionsDir`
AND `componentsDir` on `ctx`, alongside `blocksDir`/`patternsDir`/`themeDir`. `core/components.js`
exports `resolveComponentFiles()`, indexing `src/components/`, every `src/blocks/*/components/`, AND
`src/blocks/extensions/`. Rule 26 already reads that corpus. LINK / STATE / SHADOW / COLOUR are no
longer undetectable by construction — each contract's own Scope/Detection fields should be read
against their 2026-08-19 corrections, not against this stale blocker.

The contract originally made this argument for LINK alone and failed to generalise it. It binds on
**four** contracts, all reachable through `src/blocks/extensions/`: **LINK** (raw URL field), **STATE**
(hover attrs), **SHADOW** (a preset `SelectControl` on a shadow attr), **COLOUR** (hover colour
fields). Therefore:

> **Every contract's `Scope` field must state its extension reach explicitly, and every detection
> rule must read `src/blocks/extensions/*.js` as well as per-block `edit.js`.** A rule scanning only
> per-block `edit.js` has a blind spot the exact size of the extension roster — now closed by
> `resolveComponentFiles()`, but only for rules that actually use it.

### O.15 — The three layers, and the two traps between them *(2026-08-19)*

Enforcing this contract is not one job. It is **three layers**, and every detector bug this
programme has produced sat at a layer boundary rather than inside one:

| Layer | Answers | Lives in |
|---|---|---|
| **1. Contract** | *what shape* must a control have? | `scripts/consistency/golden-controls.json` — 14 control types |
| **2. Corpus + attribution** | *which files* hold controls, *which blocks* own each finding | `inspector-scan/core/components.js` `resolveComponentFiles()` |
| **3. Enforcer** | reads (1) over (2) | one rule/survey per concern; shared helpers in `core/golden.js` |

⛔ **A rule that hardcodes layer 1 is not generic, however generic its docblock claims to be.**
`survey-golden-conformance.js`'s native-UI axis checked `supports.color` for EVERY control type
because it was written when colour was the only encoded row. With 14 types it reported **350**
violations — 25 blocks × 14 types, one colour answer under thirteen wrong headings. Axes now read
the support key from each type's own `nativeUi.detectVia`. Only 4 declare one: colour →
`supports.color`, `length-unit` and `box-4value` → `supports.spacing`, `typography` →
`supports.typography`.

⛔ **AXIS SCOPE IS NOT UNIFORM.** `canonical` adoption needs the one-hop view THROUGH shared
components (a block reaches `DesignTokenPicker` via `SgsColourPanel`). `bannedLookalikes` needs
that view **minus** the canonical components, because the canonical row component legitimately
wraps the raw primitive — `<ColorPalette>` lives inside `DesignTokenPicker.js` and
`GradientCapableColourControl.js`. Flagging it there flags the *conformant* shape; it produced 5
false positives before being scoped. **Every axis added must be asked which scope it wants, and
pinned by a fixture in both directions.**

⛔ **Resolution depth and that exclusion must move TOGETHER.** One hop under-reports 9 of 17
shared components (`ColorPalette` 3 → 64 at full depth, `DesignTokenPicker` 18 → 64). But
`ColorPalette` is banned and ~61 of those 64 reach it legitimately, so raising depth alone trades
under-reporting for ~61 false positives. Reproduce before changing either:
`python scripts/surveys/compare-reach-depth.py .`

⚠ **A tag scan cannot see a runtime-selected component.** `SgsColourPanel` picks its row via
`const Control = row.gradientCapable ? A : B`, so neither name appears as a literal JSX tag and
`GradientCapableColourControl` reads as dead code while being live in 6 blocks.

### O.16 — Qualification: *should* this block have the control? *(2026-08-19)*

A conformance census can only report a **missing** control if it knows the block should have one.
⛔ **`roster.json` `surfaces.*` cannot answer this.** `build-roster.py:106` computes
`colour = "color" in supports or attr_hit("colour","color")` — DESCRIPTIVE, true exactly when the
block ALREADY has colour. Used as a scope predicate it is **self-fulfilling**: it excludes exactly
the blocks that are missing a panel.

Each control type therefore declares its own `qualifiesWhen` predicate in `golden-controls.json`.
**The engine is generic; the evidence is per family** — colour qualifies on painted surfaces,
typography on rendered text, spacing on a box element, link on an `<a>` or URL attribute. Adding a
control type is a predicate, not a new check.

Verdicts split what a single "not eligible" used to hide: **MISSING** (qualifies, has none — real
work) versus **NOT-APPLICABLE** (the control cannot apply — never a backlog item).

⚠ **Qualifying does not always mean the control belongs on THIS block.** Every `sgs/form-field-*`
declares its elements and paints none of them; `sgs/form` paints all 52 (`.sgs-form-field__input`
appears in `form/style.css` 36 times). They qualify **collectively**, and the control's home is the
ancestor with children inheriting — the group-default pattern `sgs/multi-button` proves at D640.
The verdict carries `home: 'ancestor'` so this is not lost.

⚠ **Feature parity is a resolver, not a qualifier.** A `replaces` entry says which core block is
superseded, NOT that the core block has the family. `block_supports` holds supports for 122 core
blocks, so it is evaluable: `core/site-logo`'s colour is `{background:false, text:false,
gradients:null}` — no colour UI — which is why `sgs/responsive-logo` is NOT-APPLICABLE rather than
missing a panel it should never have.

Reach is derived, not hardcoded: a block is in an extension's surface when it opts IN via
`supports.sgs.enabledExtensions` (D551 — was an opt-out `hideExtensions` denylist for `hover` and
`blockLink` specifically; other extensions may still use the older denylist form). `noOptOutExtensions`
is `[]` today.

**Bean's own suggested categories all map to real axes.** Three corrections:
- **"Section" is three distinct axes**, not one — `tier='class-section'` (4), `container_kind='section'`
  (6), `composition_role='section-root'` (8). Each contract must say which it means.
- **"Blocks with text" routes via `role`, not typography supports.** Both give 65, but they are
  *different sets* overlapping by only 49 — `sgs/decorative-image` holds client-editable alt/caption
  text with no typography support; `sgs/container` and `sgs/icon` have the support and no text.
- **Dynamic-vs-static is useless** — 84/0. Every SGS block is dynamic.

#### ⛔ DB columns that are NOT trustworthy as gate inputs (all four measured 2026-08-07)

> ✅ **1 and 2 were FIXED 2026-08-08 — D523 `e73bacde`, extended after QC council.** Both are now
> usable as gate inputs — ⚠ **but `inspector_control_type` is 64.6% NULL — 1,753 of 2,712 rows `WHERE block_slug LIKE 'sgs/%'`.**
> (Scope stated per carried condition 27: the unscoped all-blocks figure is 70.2% and is NOT the one that governs.)
> A rule may TRUST a non-NULL value; it must NOT read NULL as "no control". "Trustworthy" was an
> overclaim in the first draft of this box; the analysis below is retained because it names the defect CLASS every remaining rule must
> avoid. **3 and 4 remain OPEN.** What actually landed: 7 `box_family` values declared in block.json
> (⛔ not `mega-panel.borderRadius` — scalar, NULL is correct); `_KNOWN_CONTROLS` widened with this
> framework's own single-attribute components, correcting **41** `inspector_control_type` rows (10
> previously NULL, 31 previously wrong), measured on a sandbox DB copy first and idempotent on
> re-run. A **repeater guard** was added in the same pass: a control inside an iteration over the
> attribute's OWN value is a per-item control and must not be credited to the array attr — otherwise
> widening the roster would have made `sgs/pricing-table::plans` read `SgsLinkControl`.
> ⚠ **Council S5 is therefore DISCHARGED**: the four clauses depending on `inspector_control_type`
> (BOOLEAN §1/§6, FREE-TEXT §2/§6) may now rely on it — but only for attrs whose control is a single
> named component. **Residual: `site-{header,footer}-row` `padding`/`margin` still read NULL**, being
> edited through `ContainerWrapperControls`, a multi-attribute façade that names no single attr. A
> multi-attribute façade cannot be recorded in a single-value column; **that is a contract question,
> not a data bug**, and no rule may treat those NULLs as "no control".

1. **`inspector_control_type`** — FIXED (D523). Root cause: `_KNOWN_CONTROLS`
(`extract-signatures.py:2436-2441`) was a hardcoded 16-name tuple with zero custom SGS components
(`SgsLinkControl`, `URLInput`, `IconPicker`, `ShadowControl`, `StateToggleControl`,
`TypographyControls`, `ResponsiveBoxControl`, `ResponsiveOverride`), so an unrecognised tag never
disagreed with the stored value and stale values (fossils of the deleted `enrich-db.py` heuristic)
persisted forever — same defect class as the gates it feeds (matching by component NAME). Fix:
extend the tuple, re-run Stage 1. Measure on the live tree — `.claude/worktrees/` holds 10 stale
copies of this file.
2. **`box_family`** — FIXED (D523): 7 genuinely NULL object-typed attrs had live BoxControls
(`card-grid.cardBorderWidth`, `mega-panel.panelPadding`, `nav-drawer.drawerPadding`,
`site-header-row.padding`/`margin`, `site-footer-row.padding`/`margin`) — root cause:
`_collect_boxfamily_overrides()` reads `supports.sgs.boxFamilies` from block.json and none of the 5
blocks declared it; fix is block.json edits, not a script change. Note: `mega-panel.borderRadius` is
correctly NULL (a scalar radius, not an object box-family attr) — a false positive in the first
draft, caused by compiling the list from `edit.js` instead of checking `attr_type` in the DB.
3. **`role LIKE 'icon-%'`** — tags 2 blocks; `IconPicker` is used by **13** (15 sites). An **85%**
   under-count, not 78%. ⚠ The `icon-*` family is the converter's SOURCE-disambiguation key, not a
   "uses IconPicker" tag, so the promotion pass is self-limiting and never admits a new member —
   widening it is a design choice, not a backfill. **OPEN.**
4. **`block_capabilities`** — TWO different problems under one table name (council, 2026-08-07):
   - **The 3 "lift" capabilities** (`scalar-content-lift`, `scalar-styling-lift`,
     `array-content-lift`) are class (d) — read declaratively from `supports.sgs.*` in block.json,
     written idempotently, mechanism healthy. `sgs/testimonial-slider` and `sgs/card-grid` (collection mode)
     have real content arrays and are genuine omissions. ⛔ **`sgs/post-grid` is NOT one** — its
     arrays (`categories`, `tags`) are config filters, its content comes from `WP_Query`, and the
     capability's own docstring excludes exactly this case. Adding it would be actively wrong.
     ⚠ `sgs/gallery` — verify `mediaItems` is authored content, not config, BEFORE declaring it.
   - **The other ~35 capability values** (`grid-layout`, `carousel`, `logo-strip`, …) have **no
     writer on the live path at all.** Their sole writer is a hardcoded `CAPABILITY_RULES` dict in
     `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` — outside this repo, dead on the live
     path. That is why `sgs/post-grid` has zero capability rows of ANY kind. This is class (b) plus
     a second R-31-1 breach. **`isCollectionKind()` therefore cannot be delivered by a backfill** —
     it needs a declarative block.json source designed and ported into Stage 1.
   - ⚠ Sibling: `block_selectors` had the identical disease and was only PARTIALLY ported
     (2026-08-01) — two writers now exist, last-one-wins. Running `populate-db.py` to patch
     capabilities would silently clobber selectors. Treat retiring that script as ONE job.
   - ⚠ `PARENT_CHILD` in the same file is a third hardcoded dict, untraced.

Regenerate before building any gate on them.

---

### 1. COLOUR

1. **Canonical** — `src/components/DesignTokenPicker.js`. No competitor exists. **Added 2026-08-19:**
   `src/components/SgsColourPanel.js` is the grouped panel that mounts `DesignTokenPicker`
   rows (`rows={[{ key, label, states, gradientCapable }]}`) under D621/D622's Styles-tab placement —
   the vehicle for the rule this whole section states, and the adoption route (D665's
   Track A). It was never named here despite carrying the rule; named now. **Adoption
   RE-VERIFIED 2026-08-30 — the "60-of-83" figure above was stale; re-measured with
   `grep -l "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l` → 65 of 83.** See
   `plugins/sgs-blocks/scripts/consistency/golden-controls.json` for its machine-readable shape, and
   field 9e/9f below for the placement + omission rule this component enforces.
2. **Required props** — `label`, `value`, `onChange`. `enableAlpha` and `clearable` already
 **default true** (lines 55, 57), so condition 4 was satisfied by construction, not by call sites.
   `linked` only when the value should track a theme slug (D288). ✅ **`id` defect FIXED** — corrected
   2026-08-19. Verified against `DesignTokenPicker.js`: `useInstanceId` (`:456`) generates one, passed
   to both `BaseControl id={ id }` (`:482`) and the inner control (`:465`), so every colour control is
   now named. ⚠ The IDENTICAL defect is still TRUE for `IconPicker` (§10) and `ShadowControl` (§11) —
   verified separately per component; do not assume this fix propagated to either.
3. **Banned lookalikes** — `ColorPalette`/`ColorGradientControl`/`GradientPicker`/
   `PanelColorGradientSettings`; `<TextControl type="color">` (`star-rating/edit.js:155-168`).
   `GradientOverlayControl.js:60` imports `SgsGradientPicker` (the SGS fork,
`src/components/gradient-picker/`), not core's `GradientPicker`, and mounts it at `:144`. The 4
wrapper blocks (`container`, `hero`, `trust-bar`, `cta-section`) reach the fork, not the lookalike.
4. **Tab — SETTLED 2026-08-15 (D621 + D622). Do not re-derive; both halves are now ruled.**

 **(a) WHICH TAB — Styles (D621).** The Colour panel renders in the **Styles** tab, first, above
   Background. ⛔ D618's earlier "Settings" placement is superseded: it reasoned that Styles is
   reserved for genuine native supports, but the framework **never uses native colour supports** — it
   replicates the native control's look and sets `supports.color` sub-flags `false`. The real rule is
   that **Styles holds root CSS and visuals**, which is why the Background panel (media uploads
   included) lives there. A colour is a visual.

 **(b) WHICH PANEL — the D533/D537 resolver, exactly like every other property family (D622).**
   An element-scoped colour goes in **its element's panel**; a colour no element claims falls to its
 **property-family panel**. ⛔ There is no bespoke colour-placement rule, and one must not be
   invented — colour was the last family still placed by hand, and any separate rule would build a
   second placement system beside the working one. `placement-reach.py` resolves all 2,262 declared
   attributes with zero human judgement; `check-element-manifest-conformance.js --check` gates it in
   `prebuild`.

   ⭐ **Leaf blocks group by construction, not by exception.** `sgs/button`'s `colourText`,
   `colourBackground` and `colourBorder` all sit on the same element (`wrapper`), so they render side
   by side in one panel — the compare-and-contrast case Bean asked about — while `iconColour` sits
   with the `icon` element, which is genuinely a different thing.

 *(Placement and SHAPE stay independent axes — see field 9a. Moving a colour must never change what
 the control looks like.)*
5. **Scope** — eligibility `surfaces.colour` (**65** as of 2026-08-19 — see the scoping axes
table); detection target `role='color'` (50 blocks, 261 rows). ⚠ The "14-block gap"
   below was derived from the old 64 figure and is NOT re-derived here — re-run the `role='color'`
   count before quoting a gap size.
6. **Conformance** — `sgs/star-rating` mounts `SgsColourPanel` (`star-rating/edit.js:134`) —
50/50 against the legacy single-state shape. This figure measures the legacy shape only, not field
9's state+shape rule — see field 9's note on rollout.
7. **Detection** — extend `inspector-scan/core/components.js` with a `writesColour` flag derived
   from each component's own source, exactly as `wrapsImage` already works for rule 18. This
   resolves indirect/shared-component cases transitively and catches lookalikes by semantic.
8. **RESOLVED 2026-08-16 (D636), supersedes the 2026-08-11 ruling below.** The "not worth the
   time" ruling on a bespoke per-stop palette editor was re-opened once SGS composed its own
   colour popover (`DesignTokenPicker` = `Dropdown` + native `ColorPalette`, not WP's sealed
   `GradientPicker`), which made a palette-capable stop editor cheap rather than expensive. Native
   `GradientPicker` is REPLACED, not kept — `SgsGradientPicker`
   (`plugins/sgs-blocks/src/components/gradient-picker/`), forked from the same pinned Gutenberg
   SHA the colour-picker fork uses, mounts the SGS `ColorPalette` above the raw picker in each
   stop's popover. A stop picked from the palette stores `var(--wp--preset--color--<slug>)`. Tab
   placement: Styles (D621, same as every other colour). Storage: ONE string attribute per
   gradient holding the complete CSS value (D636), not this contract's per-scalar
   `DesignTokenPicker` shape — gradient stays its OWN control type, this field's original question
   answered "no" on the routing half, "yes, palette-linked" on the capability half. Shipped so far
   on the 6 legacy overlay blocks; the universal rollout across all colour-capable blocks is
   tracked in `LEDGER.md`/`parking.md` `P-GRADIENT-UNIVERSAL-ROLLOUT`, not yet done.
   

8a. ⭐ **Added 2026-08-19 — gradient is THREE mechanisms, element-dependent, not one.** Prior text in
   this field can read as a single gradient story; it is not. Which mechanism is correct depends on
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

9. ⭐ **THE STATE + SHAPE RULE — Bean-ruled 2026-08-13. This is the load-bearing addition to this
   section and it binds every colour in the framework, wherever it lives.**

   Bean, from a manual inspector review: *"Shadow Colour should be set in the colour section and that
   way both hover effects are dealt with, the other viable way is a tab toggle in pop up colour picker
   between states. Never should be set up like that with optional hide or show."* And: *"any element
   specific colour that ends up staying in its element … should still use the same thin rectangular
   control that shows the number of states pickable per setting that has its colour picker pop out."*

   Three binding clauses:

   - **9a. ONE CONTROL SHAPE, EVERYWHERE.** Every colour renders as the same thin row: a compact
     rectangular control carrying its swatch(es), showing **how many states are pickable for that
     setting**, with the picker itself in a **popover**. This holds regardless of where the control
     sits — an element-scoped colour that stays in its element's TIER 1 panel (per THE PLACEMENT RULE)
     uses the identical row. Placement and shape are independent axes; moving a colour must never
     change what it looks like.
   - **9b. STATES LIVE INSIDE THE CONTROL, NEVER BESIDE IT.** Normal / hover / active are reached by a
     tab toggle **within the popover**, not by separate sibling controls and not by a second panel.
     ⛔ This RETIRES the pattern of a distinct `*Hover` colour control mounted next to its resting
     twin. It also means a compound property's colour half (shadow colour being the named case) is set
 **in the colour row**, where the state toggle already handles hover — not as a lone field on the
     shadow builder.
   - **9c. ⛔ A COLOUR IS NEVER AN OPTIONAL `ToolsPanelItem`.** It must not sit behind the "+"
     disclosure menu, and it must not be hideable per instance. Bean, verbatim: *"Never should be set
     up like that with optional hide or show."* This is a deliberate, named exception to A5's
     progressive-disclosure guidance — A5 governs control density in general; colour is carved out of
     it. A client hunting a "+" menu to find a colour is the defect A5 was meant to prevent, arriving
     by A5's own mechanism.

 **Why it is a contract clause and not a tidy-up.** The framework currently ships several different
   colour controls and 101 hand-rolled `*Hover` attributes across 24 blocks against a shared state
   extension with live reach 0 (measured 2026-08-13; ⚠ a competing count of 93/20 exists and the
   population must be re-measured before any migration — see §9.9-N4 of
   `reports/2026-08-13-inspector-uniformity-root-cause.md`). Under D602 colour is squarely inside the
   EXPECTED set, so "the same property behaves identically everywhere" is exactly what this clause
   makes checkable.

   ✅ **BUILT, as of 2026-08-19 — corrected; do not re-read this as "not yet built".** Verified
   directly against `src/components/DesignTokenPicker.js`: the state axis exists (`hasStates =
   states.length > 1`, `:205`), a `TabPanel` renders across states when `hasStates` (`:400-416`),
   and a per-state Solid/Gradient `ToggleGroupControl` renders for any state carrying
   `onGradientChange` (`:289-317`). All three elements 9a names — the thin swatch row, the in-popover
   state tab toggle, the popover itself — are live in the component. What remains open is the
   ROLLOUT, not the component: only 17% of colour rows carry 2+ states (see field 6's corrected
   figure) — the other 83% still call the component with no `states` prop and render the single-state
   legacy shape, which this same file continues to serve byte-identically from one default export.
   The machine-checkable form of this clause now also exists — see field 9d below.
   ✅ Field 2's missing `id` defect is FIXED — see field 2.

9d. **Machine-checkable form.** `plugins/sgs-blocks/scripts/consistency/golden-controls.json`
   (built 2026-08-19, D671) encodes this field's colour contract as DATA — canonical components,
   banned lookalikes, minimum states, gradient-with-declared-exemptions, scope predicate, plus a
   native-core-colour fingerprint — so enforcement measures against data rather than prose.
   Enforced by `inspector-scan` rule `31-golden-colour-control` (advisory; 408 findings as of 2026-08-19 — was 409 before that day's merges; re-derive with `node scripts/inspector-scan/run.js --check` rather than quoting this line across 64
   blocks at introduction, D674). Read the JSON for the exact figures; do not transcribe them here,
   they will drift the same way this field's own numbers did.

9e. ⭐ **THE PANEL-SCOPE RULE — one `SgsColourPanel` per block; a row that doesn't apply is OMITTED,
   never disabled. Recorded 2026-08-30, closing a gap: this component's own docblock has carried the
   rule since 2026-08-19; the spec never named it.**

   Every block that mounts `SgsColourPanel` mounts it **exactly once** — verified 2026-08-30 across
   all 65 adopting blocks (`for f in $(grep -l "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js);
   do grep -c "<SgsColourPanel" "$f"; done | sort | uniq -c` returns a single count of 1 for every
   file, no block with 0 extra mounts and none with 2+). Field 4b's "an element-scoped colour belongs
   in its element's TIER 1 panel" therefore does NOT mean a separate literal panel per element — it is
   satisfied by which ROW a block declares and how that row is grouped/labelled inside the one panel
   instance, not by multiple `SgsColourPanel` mounts. `SgsColourPanel.js`'s own 2026-08-14 correction
   states this directly: *"every call site today mounts this component exactly once per block, so
   that placement question belongs to each caller's `rows` array, not to this file."*

   A colour row that applies only to some variants or configurations of the block (e.g. an icon
   colour when the marker doesn't render an icon/emoji glyph; a border colour when no border style is
   selected) is **omitted from the `rows` array**, never rendered-and-disabled and never hidden by
   CSS. `SgsColourPanel` filters `rows.filter(Boolean)` (`SgsColourPanel.js:109`) so a falsy array
   entry silently drops before render — this is the mechanical form of 9c's disclosure ban, extended
   from "never behind a '+' menu" to "never present-but-inapplicable at all". Reference
   implementation: `sgs/icon-list` (`edit.js:328`), whose own inline comment reads: *"icon colour only
   applies when the marker renders an icon/emoji glyph; border colour only applies when a border
   style is selected — both rows are OMITTED (not disabled) when they don't apply, per D609 9c."*

9f. ⭐ **THE ELEMENT-PANEL EXCEPTION — `SgsBorderControl` is the one purpose-built case; no general
   mechanism exists. Recorded 2026-08-30.**

   9e's "one panel, all rows" holds everywhere except one control. `SgsBorderControl` (§14) pairs a
   border colour with its non-colour siblings — width, style, radius — on shared popover lines, and
   renders inside the consuming element's OWN panel rather than the shared `SgsColourPanel`. This
   works because `SgsBorderControl` is a self-contained composite that renders its colour swatch
   internally; it does not reuse `SgsColourPanel` or its `rows` shape, so it does not compete with or
   fragment the single-panel rule above.

   **Building a general element-panel colour mechanism — so a second composite besides
   `SgsBorderControl` could pair colour with non-colour controls on shared lines — is NOT built and
   requires a design gate before any block adopts it.** `SgsColourPanel` hardcodes its own
   `InspectorControls group="styles"` + `PanelBody title="Colour"` (`SgsColourPanel.js:116-121`), and
   zero blocks today render a colour control directly inside an element panel outside
   `SgsBorderControl`. Do not build a second one ad hoc per block on the strength of `SgsBorderControl`
   existing as precedent — get the design gate first.

### 2. LINK

⚑ **SUPERSEDED 2026-08-13 — Canonical control changed.** Bean reviewed `sgs/button`'s popover-based
LINK control live and ruled: *"That link control looks perfect. Set this as the standard and look
for everywhere there is a hyperlink option — then replace it. Also, we should replace the current
raw link input box in the block link extension with this link setup."* `SgsLinkControl`'s INLINE
mount is retired as the canonical shape (kept only as a legacy shim for the 7 repeater-item
consumers not yet migrated — see field 6). Fields below are rewritten to match; the original
`SgsLinkControl`-as-canonical text is struck through in spirit, not preserved, per this doc's own
"replace, don't append" convention for a superseded ruling.

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
   for any NEW consumer (existing repeater-item consumers are a migration backlog, not a new
   violation — see field 6).
4. **Tab** — unchanged: `settings` when the control styles nothing and lands in the pinned `Settings`
   panel; an element-scoped link (e.g. `sgs/icon`'s own Link panel) stays in that element's TIER 1
   panel regardless.
5. **Scope** — 14 blocks with a navigational link field, plus the `blockLink` extension
surface — 3 blocks (measured 2026-08-19, `grep -A3 enabledExtensions src/blocks/*/block.json`).
Reach must be re-derived per slug from whichever mechanism currently governs that slug — see the
EXTENSION SURFACE axis correction above.
6. **Conformance (re-measured 2026-08-19, post-migration)** — Migrated to `LinkPopoverControl`:
   `sgs/button` (dual-trigger, `LinkPopoverContent` direct), the `blockLink` extension (**3-block
   reach**, superseded from 67 — see field 5, `LinkPopoverField` + `renderExtraFields` for its bespoke
   accessible-label field), `sgs/icon`, `sgs/media`, `sgs/product-card` (3 fields, `searchOnly`).
 **`SgsLinkControl`'s inline-mount backlog is DISCHARGED — 0 blocks.** Measured 2026-08-19
(`survey-control-mounts.py .`): `SgsLinkControl` has 0 JSX mounts tree-wide. Rule 27
(`27-superseded-link-control.js`) was promoted from advisory to `mode: gate` at `openBacklog: 0` on
2026-08-14 — the last of the 7 (`social-icons`) migrated 2026-08-14, commit `f6b26866`.
7. **Detection** — `inspector-scan/rules/08-raw-url-link.js` extended 2026-08-13 to also flag
   `SgsLinkControl` JSX elements (not just `<TextControl type="url">`), and
   `27-superseded-link-control.js` flags any NEW `<SgsLinkControl>` JSX usage. **The promotion trigger
   named in earlier text has already fired** — rule 27 is `mode: gate` as of 2026-08-14, not advisory
   awaiting a backlog clear.
8. **Open** — is `google-reviews.reviewRequestUrl` genuinely config, or a link a visitor follows?
   Does `whatsapp-cta.phoneNumber` deserve its own PHONE contract? The former 7-block
   `SgsLinkControl` repeater-item migration question is CLOSED (field 6) — the repeater-ITEM trigger
   shape question it raised (inline vs popover-per-row) was resolved in practice by the migration
   itself; no residual decision remains open here.

### 3. ENUM / MODE

1. **Canonical** — no shared component. `SelectControl` over a **declared `block.json` enum** is the
   de facto standard; `ToggleGroupControl` for short option sets.

   ⭐ **THE THRESHOLD, WRITTEN DOWN AT LAST (2026-08-26, D810).** This line previously read *"the
   threshold is nowhere written down, so it cannot yet be gated"*. It is now written, and it was
   **derived from the corpus, not chosen**:

   | options | longest label | shape | why |
   |---|---|---|---|
   | 2–5 | ≤ 12 chars | **`ToggleGroupControl`** | every option visible at once; one tap, no menu |
   | 2–5 | > 12 chars | `SelectControl` | TGC does not wrap, so long labels overflow the row |
   | 6–10 | any | `SelectControl` | past ~6 TGC cannot fit a single row at all |
   | > 10 | any | `ComboboxControl` | searchable; scanning a 12-item menu is the anti-pattern |
   | multi-value | any | `FormTokenField` | unchanged from §125 |

   **Where each bound comes from — none of it is taste:**
   - The **6-option ceiling** is not a preference: `ToggleGroupControl` **does not wrap**, which is
     precisely why core itself falls back to `Button isPressed` past 6 options. Already recorded in
     `decisions.md`; this table only applies it.
   - The **>10 Combobox** bound is §125's existing guidance, unchanged.
   - ⭐ **The 12-character figure is EMPIRICAL.** It is the longest label among the
     `ToggleGroupControl` mounts that already ship and demonstrably work — `nav-drawer.closeStyle`,
     whose longest option is `burger-morph` at exactly 12. The number was not picked and then
     justified; it was read off what fits. Independent corroboration: applying it to the corpus
     yields **85** conversion candidates, matching the census's own count exactly.

   **Measured corpus (2026-08-26, `scripts/surveys/survey-enum-control-shape.py`):** **282 declared
   enum attributes across 55 blocks** — Spec 35's cached "272 rows / 82 files / 14 files" figures had
   already drifted and are superseded. Of those, **216 (77%) carry 2–5 options.** Of the 129 the
   static instrument can resolve to a primitive, **124 render as `SelectControl` and 5 as
   `ToggleGroupControl`** — so **85 confirmed enums are 2–5 short options rendered as a dropdown**,
   which makes §125's "giant Select" anti-pattern the norm rather than the exception.

   ⚠ **TWO LIMITS, stated so the gate is not built on them unexamined:**
   - The survey resolves **129 of 282 (45%)**. The rest are dynamically keyed, mounted through a
     shared component, or ambiguous. Those are the instrument's blind spot — **not** findings, and
     never to be counted as compliant.
   - It measures the enum **SLUG**, whereas the rendered **LABEL** is what actually constrains the
     row width. Validated on the binding case (`burger-morph` → "Morphed icon", both 12 chars), but
     that is n=1. ⛔ **The gate that enforces this table MUST measure the rendered label, not the
     slug.** The census may use the proxy; an enforcing gate may not.

   ⭐ **THE GATE NOW EXISTS (2026-08-27, `scripts/check-enum-control-shape.py`).** This line
   previously said the threshold was written "deliberately no gate". It is a SEPARATE instrument
   from the census, not a wrapper around it, precisely because the census's slug proxy is
   forbidden here: it reads the actual rendered JSX text (`ToggleGroupControlOption label={ __(
   '...' ) }`, and `SelectControl`'s `options={[...]}` inline array or `options={IDENTIFIER}`
   resolved to its module-level `const` definition) for every 2–5-option enum, and classifies the
   6–10/>10 bands by count alone (label extraction isn't load-bearing there). The 153/282
   blind-spot cases the census couldn't resolve are carried forward as explicit `skip` entries
   with a machine-readable reason (`unresolved-binding` / `shared-component` / `ambiguous-binding`
   / `label-extraction-failed`) — never silently counted as compliant.

   ⚠ **Reading rendered labels instead of slugs found FEWER violations than the census predicted,
   not more.** The census's slug-derived estimate was 85; the gate's own re-derived count is
   **45**. Of the 92 label-judged `SelectControl`-in-2–5-band cases, 47 (51%) have a rendered
   label genuinely longer than 12 characters despite a short slug — `SelectControl` is the
   CORRECT shape for those, and the slug proxy was wrong to flag them. This is exactly the failure
   mode the n=1 validation above warned it hadn't ruled out. The 45 real violations are baselined
   (`scripts/check-enum-control-shape-baseline.json`) and ratcheted — `--check` fails only on a
   NEW violation, never on the seeded 45.
2. **Required props** — `value` bound to the attr; `options` matching the declared `enum` **exactly**.
3. **Banned lookalikes** — (a) a shared aggregator offering options outside the consuming block's
   enum; (b) a PHP-enforced closed set with no `block.json` enum (free-text box, no validation).
4. **Tab** — `settings`, explicitly, not by relying on the default.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — **272 rows with declared enums** (measured 2026-08-19,
`survey-control-mounts.py .`); 1,372 string rows are the search space, not the violator count.
6. **Conformance — three distinct live defects on ONE shared control:**
   - `sgs/testimonial-slider` — enum `full|split` vs picker `stack|flex|grid`. **Zero overlap.** Its
     only Layout control is permanently broken.
   - `sgs/post-grid` — enum `grid|list|masonry|carousel`. Only `grid` overlaps.
   - `sgs/feature-grid` — `render.php:131` hardcodes `$attributes['layout'] = 'grid'` before calling
     the wrapper. The control is live, visible and inert.
   - 9 further blocks mount `kind="layout"` with **no enum at all** — PHP enforces 3 values,
     `block.json` enforces nothing.
   - 13 attrs across 8 blocks: PHP-enforced closed set, no declared enum. **Floor, not ceiling.**
   - ⚠ `sgs/gallery` already fixed this **for itself** via `showLayout={false}`, with a comment
     naming the exact bug. A local fix while the shared component kept shipping it to twelve others.
7. **Detection** — diff a shared control's hardcoded option values against each consuming block's
   declared enum. Generalises to any future aggregator; needs no per-block knowledge.
8. **Open** — should `LayoutPanel` build its options **from the consuming block's own enum** instead
   of a fixed list? That makes the class of bug structurally impossible. Shared-mechanism → Rule 7
   design gate. Is `feature-grid` deliberately grid-only (remove the control) or is the hardcode a
   leftover?

### 4. LENGTH / UNIT

1. **Canonical** — `<ResponsiveControl>` wrapping `<UnitControl>` with a real `units` array
   (R-22-13). Object-cascade blocks use `<ResponsiveOverride>` instead. Do not blend the two.
2. **Required props** — real `units`, never px-only. Responsive wrapping REQUIRED when the attr
   family declares Tablet/Mobile siblings. **Label association REQUIRED and missing** — see §10.
3. **Banned lookalikes** — raw-px `RangeControl` (**0 live violations found** — the only hits are the
   shadow builder's sliders, which are correct); `SelectControl` writing a `*Unit` attr (already
   gated); a `TextControl` standing in for `UnitControl` — ✅ **FIXED 2026-08-11 (D561)**; see §14 field 6 for the full
   raw-text census (3 found, 3 fixed, 0 remaining). **Phase 3.2a must not re-list `cardRadius`.**
4. **Tab** — `typography` for font-size/line-height, `dimensions` for spacing, `layout` for grid
   geometry. All Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `is_responsive=1 AND css_property IN (<length set>)` → 36 blocks.
6. **Conformance** — the `TypographyControls` consumers conform. Violators: (fixed 2026-08-11, D561); 79 of 85 blocks with no tab split; **12 attributes declared + rendered
   with no control** (below).
7. **Detection** — join `css_property` against a length allowlist, then assert the innermost control
   is a `UnitControl`.
8. **Open** — spacing-token scale is unbuilt; does the contract require it once it exists?

### 5. 4-VALUE BOX

1. **Canonical** — `ResponsiveBoxControl` (4 sides) / `ResponsiveBorderRadiusControl` (4 corners);
   `ResponsiveBoxControls` (plural) for object-cascade rows.
2. **Required props** — `values` per tier, `onChange(tier, next)`, real `units`.
3. **Banned lookalikes** — per-side scalars (**migration COMPLETE — 0 remaining**); regex side-token
   grouping in the converter (already gated, converter-side only — nothing guards editor code).
4. **Tab** — `dimensions` (padding/margin) / `border` (width, radius). Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — reconciled to **51 blocks** (46 DB-classified ∪ 48 grep-matched, 43 overlap). The
   discrepancy resolved: `before-after`/`media` use `ResponsiveBorderRadiusControl` (no "BoxControl"
   substring); 5 blocks have live box controls with `box_family` NULL.
6. **Conformance** — 43 conform. **`sgs/physics-canvas` declares 6 responsive box attrs, passes them
   to `SGS_Container_Wrapper`, which renders them — and its `edit.js` contains "padding" zero times.**
7. **Detection** — must NOT rely on `box_family` alone (it under-populates); add a code-derived
   cross-check on the attr's object shape.
8. **Open** — backfill the 6 orphan attrs? Rename the singular/plural pair?

### 6. STATE / HOVER

1. **Canonical (CLOSED 2026-08-24, D765 — was open at D673)** — `StateToggleControl` was unadopted, never canonical, and is now DELETED. It
exists and is exported (`components/index.js:45`) but has 0 JSX mounts across `src/blocks` — the
only references are 2 comments recording where it used to live (`brand-strip/edit.js:316`,
`nav-menu/edit.js:463`). **The WORKING mechanism is `SgsColourPanel` rows → `DesignTokenPicker`'s
`states` prop** (e.g. `button/edit.js:395-397`). RESOLVED 2026-08-24 (D765): DELETED — the `states`-prop route is canonical. The superseded text below is kept for provenance. Originally: decide whether to wire `StateToggleControl`, or delete it and
make the `states`-prop route canonical.
2. **Required props** — one toggle per logical attr GROUP, not per attribute; the render-prop must
   cover **every** paired attr in both states.
3. **Banned lookalikes** — a separate "Hover" panel (7 blocks; `post-grid`'s is 145 lines from its
   base panel); adjacent "X" and "X (hover)" controls (3 blocks); **a `*Hover` attr with no control
   at all (8 blocks, ~27 attrs)**; preset-only reachability (`product-card`).
4. **Placement** — the state value sits **inside the same control group as its base value**. This is
   how `theme.json` nests pseudo-states under the element, and how the block's own PHP helpers
   already build `:hover` from the same `$prefix`.
5. **Scope** — `attr_name LIKE '%Hover%' OR css_state IN ('hover','current','scrolled')`, excluding
   `sgs/mega-panel.accent` (a colour-scheme picker, mistagged). **23 blocks; 3 conform, 20 do not.**
   ⚠ Use `%Hover%`, not `%Hover` — the suffix form misses `business-info.linkHoverColour`.
   ⚠ `trust-bar.autoScrollPauseOnHover` and `team-member.overlayHover` are **behavioural flags, not
   state pairs** — a name-only rule false-positives on both.
   ⚠ `table-of-contents.activeLinkColour` is a genuine `current` state (renamed from `selected`
   2026-08-19) that **name-matching cannot find**. A new semantically-named state with `css_state`
   NULL would be invisible to every method here.
6. **Conformance** — conform: `brand-strip`, `button`, `nav-menu`.
7. **Detection** — three separate rules, not one: `state-attr-no-toggle`, `state-attr-unreachable`,
   `state-attr-preset-only` (park the third — one instance cannot prove the shape, per R-31-9).
8. **RESOLVED, not open — migration needs ZERO schema change.** Every attr already exists with its
   current type; `StateToggleControl` is a presentational wrapper reading/writing the same keys. No
   version bump, no deprecation. Consistent with D293/D270.

### 7. MEDIA

1. **Canonical** — `src/components/MediaPicker.js` (9 consumers) + `MediaGalleryPicker` for bulk.
   ⚠ `MediaPicker` is **not barrel-exported**; all 9 consumers import by path.
2. **Required props** — `MediaUpload` always inside `MediaUploadCheck` (**0 violations — keep the
   gate**); alt text; the D5 tier rules. **A reused picker sub-control renders an optional child only
   when that invocation supplies both `value` and `onChange`** (the `ImagePickerRow` lesson).
3. **Banned lookalikes** — per-tier duplicate pickers instead of one `ResponsiveControl`-wrapped
   picker: `sgs/responsive-logo/edit.js:281-305` renders **three always-visible** logo slots.
4. **Tab** — `settings`; `content` for collection/repeater media (0 SGS blocks currently use
   `group="content"`).
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `surfaces.media` (**33** as of 2026-08-19 — see the scoping axes table; superseded
   from 30) is the eligible pool. The 15 blocks declaring
   `supports.sgs.imageControls` are a **conformance subset, not the pool**. Rule 18's own
   `wrapsImage` resolution is MORE precise than the DB proxy — do not regress it.
6. **Conformance — the D521 rollout landed cleanly on 6 of 7.** Tier types match base types
   everywhere; zero blocks tiered their alt text. `responsive-logo` is the exception (predates D521
   by two days).
7. **Detection** — two D5 clauses are checkable from `block.json` alone: **tier/base type mismatch**
   and **alt-role attr with a Tablet/Mobile suffix**. Neither exists as a rule. The video-swap
   return path and per-width paint need the live first-paint capture bar.
8. **Open** — retrofit `responsive-logo`? Fold `showAlt` into `MediaPicker` and retire the local copy?

### 8. BOOLEAN

1. **Canonical** — `ToggleControl` (160 of 163 controlled boolean rows) for enable/disable;
   `ToggleGroupControl` when the states are **named alternatives** (`overlayGradient` → "Solid /
   Gradient" is CORRECT, not a violation); `CheckboxControl` **only** for a boolean scoped to one
   item in a repeated list (all 8 uses verified correct).
2. **Required props** — `label`; `__nextHasNoMarginBottom` on **133/162** instances.
3. **Banned lookalikes** — a 2-option `SelectControl` driving a boolean (3 DB rows); a `RadioControl` with two options (1 live instance — `heading/edit.js:281`); literal "On/Off" toggle groups (**none found**).
4. **Tab** — **element-scoped → that element's panel in Settings (THE PLACEMENT RULE, TIER 1).**
   Root-scoped (no element): resolves to its TIER 2 property-family panel via
   `cluster-member-sets.json` (D537), UNLESS the boolean styles nothing — e.g. `autoplay`,
   `showDots`, `required` — in which case it takes the pinned-first `Settings` panel. The old
   "behaviour → Settings; appearance → Styles" root-scope split is retired; it was never a
   whole-inspector rule and must not be read as one again.
5. **Scope** — 252 boolean rows.
6. **Conformance** — 89 boolean rows have no recorded control. **Not asserted as defects** — needs
   per-row triage.
7. **Detection** — classify the component bound to each boolean attr; `ToggleGroupControl` writing a
   literal boolean is a *candidate*, not a violation.
8. **Open** — whether a 2-option group reads as enable/disable or as alternatives is a label
   judgement, not an AST fact. Advisory only.

### 9. FREE TEXT / BARE NUMBER

1. **Canonical** — `TextControl` for short single-line config; `TextareaControl` for long-form;
   `NumberControl` for unbounded or precision-typed numbers; `RangeControl` for coarse bounded
   values. **A number with a CSS unit is a LENGTH, not a bare number.**
2. **Required props** — `__next40pxDefaultSize` is on **2 of 199** `TextControl`s and **1 of 8**
   `NumberControl`s.
3. **Banned lookalikes** — free text where a closed set exists (→ ENUM); free text driving a colour
   (`star-rating`) or typography (7 rows); `product-card.ctaFontSize` as a bare unitless
   `NumberControl` — a direct breach of the mandatory `TypographyControls` rule.
4. **Tab** — **element-scoped → that element's panel in Settings (THE PLACEMENT RULE, TIER 1)** — an
   element's text content and its appearance numbers sit in the SAME panel, not opposite tabs.
   Root-scoped (no element): resolves to its TIER 2 property-family panel via
   `cluster-member-sets.json` (D537), UNLESS the field styles nothing (e.g. `tagName`), in which
   case it takes the pinned-first `Settings` panel. The old "content/behaviour → Settings;
   appearance numbers → Styles" root-scope split is retired.
5. **Scope** — 1,654 string rows, 432 number/integer rows.
6. **Conformance** — **the content split is SOUND**: body content lives in-canvas via `RichText`,
   sidebar text fields are genuinely short labels. Validated pattern, not a gap.
   ⚠ **317 number rows have no recorded control** — explicitly NOT asserted as defects; triage needed.
7. **Detection** — cross-reference each control's target attr against `role`/`css_property`.
8. **Open** — retype the string-typed font sizes to number?

### 10. ICON

1. **Canonical** — `src/components/IconPicker.js`. No competitor exists.
2. **Required props** — `label`, `value`, `onChange`. **`id` REQUIRED and missing** (line 335) —
   the same `BaseControl`-without-`id` defect as COLOUR and LINK.
3. **Banned lookalikes** — a `SelectControl` over a hardcoded icon-name list; a `TextControl` taking
   a raw icon slug; an emoji/character field standing in for an icon; a per-item icon picker inside a
   repeater that is not this component (`form-field-tiles`, `pricing-table` both mount the real one —
   listed so a future repeater cannot claim novelty).
4. **Tab** — `settings` when the icon carries meaning (a list marker, a nav affordance);
   `styles` when it is decoration on an already-labelled control. *(Subordinate to THE PLACEMENT
   RULE: this Tab field only governs a control that STYLES NOTHING and lands in the pinned
   `Settings` panel (D537). A control with a real property family resolves to its TIER 2 family
   panel via `cluster-member-sets.json` instead. An element-scoped control goes in its element's
   panel (TIER 1) regardless of this field.)*
5. **Scope — `block_capabilities` capability `icon-picker` (13 blocks / 15 sites), declared via
   `supports.sgs.iconPicker`.** ⛔ **Never scope this contract by `role LIKE 'icon-%'`** — that role
   family is the converter's icon-SOURCE discriminator and tags 2 blocks, an 85% under-count of a
   different question (D525 separated the two rather than widening the role, which would have broken
   the converter's arm).
   ⚠ The census is 13 blocks only because it scanned **past `edit.js`** — `sgs/cart` mounts the
   picker from `TriggerSettingsControls.js`. A per-block `edit.js` scan reports 12 and looks
   complete. See the EXTENSION SURFACE axis.
6. **Conformance** — 13/13 mount the canonical component; 0/13 pass the `id` requirement, so
the real conformance figure is 0.
7. **Detection** — census `<IconPicker` across `src/blocks/**/edit.js` **and `src/blocks/extensions/*.js`**;
   assert every mount passes `id`. Lookalike detection via a `writesIcon` flag on
   `inspector-scan/core/components.js`, derived from the component's own source (the `writesColour`
   pattern), so an indirect mount through a shared wrapper resolves transitively.
8. **Open** — does the `icon-*` role widen, or does a new declarative flag carry "uses IconPicker"?
 **This is Tier 0 (d) and it is a design gate, not a backfill.**

### 11. SHADOW

1. **Canonical** — `src/components/ShadowControl.js`, storing a **CSS string**
   (X/Y/blur/spread/colour+alpha/inset).
2. **Required props** — `label`, `value`, `onChange`. **`id` REQUIRED and missing** (line 126).
3. **Banned lookalikes — this type's list is the whole point, because rule 07 sees exactly one of
   them:**
   - a **preset `SelectControl`** (None/Small/Medium) writing a shadow attr — *the only shape rule 07
     inspects*;
   - a preset `SelectControl` on a shadow attr via `extensions/hover-effects.js`'s `hover`
extension reaches **0 blocks** (D551 flipped `hover` to an opt-in `enabledExtensions` allowlist and
no block.json lists it — verified `grep -A3 enabledExtensions src/blocks/*/block.json`). The shape
itself (a preset select standing in for `ShadowControl`) is still real wherever it DOES occur
block-locally — this correction is to the extension-reach figure only, not to whether the lookalike
is banned;
   - **a bare `TextControl` asking for raw CSS** — `sgs/quote:699` and `sgs/media:685`; media's help
     text literally reads *"A raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)"*. A direct
     breach of the framework's own non-negotiable that no setting may require touching code;
   - **a hand-rolled builder storing an object** where the shared component stores a string —
     `sgs/button`, ~80 duplicated lines, incompatible shape;
   - **no control at all** — `sgs/heading` and `sgs/text` declare `boxShadow`/`boxShadowHover`,
     render them, and expose nothing. Rule 07 cannot see this class by construction.
4. **Tab** — `styles` (it is appearance), inside the border/effects grouping.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `css_property LIKE '%shadow%'` across `block_attributes`, **plus** the extension
   surface. Real footprint **17 blocks**; rule 07 reports 1. ⚠ Not re-derived today — this figure was
   computed when the extension surface's `hover` reach was believed to be 67 (now corrected to 0
   above); re-run the `css_property LIKE '%shadow%'` query before quoting 17 rather than assuming it
   still holds.
6. **Conformance** — 4 exact defects confirmed (`heading`/`text` × `boxShadow`/`boxShadowHover`),
   2 raw-CSS text fields, 1 duplicate builder, 6 secondary shadow attrs unverified.
7. **Detection** — census from the DB, then classify each attr's control in `edit.js` as
   *compliant / preset-select / raw-text / duplicate-builder / **no-control***. Five buckets, not a
   boolean. The fifth is the fourth quadrant and needs the render-without-control rule.
8. **Open** — does `sgs/button`'s object shape migrate to the string shape, or does `ShadowControl`
   gain an object mode? Either is a shared-mechanism change → **Rule 7 design gate.**

### 12. THE RESPONSIVE WRAPPER FAMILY

> ### ⭐ AMENDED 2026-08-10 (D548 / D549 / D550) — read before acting on this section
>
> **The shared wrapper is now responsive GENERICALLY.** Bean-directed: fix the wrapper once so
> "every block that uses it doesn't need individual fixes that require forking". Six layout
> properties (`alignContent`, `justifyContent`, `justifyItems`, `flexDirection`, `flexWrap`,
> `gridAutoRows`) are tier-capable as of `2056af6a` — as **six array rows**, not new code:
> `sgs_emit_responsive_css()` was already generic (atoms → tier cascade → tier-diff). Adding
> property #7 is one row.
>
> **The apparent conflict with this spec's purpose is RESOLVED, not a trade-off.** "Make every
> property responsive" looked like it contradicted Spec 35's goal of shrinking the control
> surface. It does not, **because of the one global device toggle (D546)**: a `<ResponsiveControl>`
> renders ONE control at a time, so a tier adds **zero** visible controls. The surface only grows
> if tiers render side by side — the banned lookalike in field 3 below. ⛔ Do not re-litigate this
> as a cost/benefit; it was one only before the toggle existed.
>
> **TWO INDEPENDENT AXES (Bean-clarified — this was blurred and is now settled):**
>
> | Axis | Shape | Applies to |
> |---|---|---|
> | **TIER** | `{desktop, tablet, mobile}` | **ANY** property, including text colour |
> | **BOX** | `{top, right, bottom, left}` | ONLY genuinely per-side props (padding, margin, border-width, border-radius) |
>
> A property may have one, both or neither. Text colour cannot be a per-side box but CAN have
> tiers. Field 6's "three incompatible STORAGE shapes" is being collapsed onto the TIER object;
> the BOX axis is orthogonal and stays.
>
> **Census, not guesswork:** `npm run survey:responsive-shape` — 83 blocks, 311 tier families
> (185 flat, 32 declaring BOTH shapes, 94 orphans). **173 are real migration candidates.** It
> separates them from families that are CORRECT as-is: 36 `asset_like` (a per-tier ASSET is a
> different resource per device, not a cascade — `sgs/media`'s tiers are a deliberate runtime
> swap, D521) and 7 `flag_like` (conjunctive per-device flags the operator must see together).
>
> ⛔ **STAGE 2 still open:** the six `gridItem*` properties plus `shadow` emit as CSS CUSTOM
> PROPERTIES on a different selector and need their own tier plumbing.
> ⚠ **AMENDED 2026-08-12 (D589):** `contentBandBackground` was in this list and is now **RETIRED,
> not pending** — Bean ruled a background fills its CONTAINER and is never clipped to the inner
> band, so the whole capability is deleted rather than made tier-capable. Seven properties remain.
>
> ⚠ **Landmine, guarded once, will recur:** a tier object reaching a LEGACY scalar read causes a
> PHP "Array to string conversion" on every render. `gridAutoRows` is guarded; five siblings were
> already safe via strict `in_array()` allowlists. **Check the legacy read before making any
> further property tier-capable.**

1. **Canonical** — **`ResponsiveControl`** (flat per-tier attrs) and **`ResponsiveOverride`**
   (object-cascade rows). ⛔ These two are the **only** sanctioned primitives, and that is not this
   document's opinion — **`lint-responsive-controls.py` is a WIRED prebuild gate naming exactly these
   two** (council S6). Any reshape proposal that renames or removes either must change that gate in
   the same commit or it will fail the build.
2. **Required props** — a per-tier `value`/`onChange(tier, next)` pair; the wrapped control supplies
   its own `units`. **Label association REQUIRED and missing on BOTH** — `ResponsiveControl:150-170`
   and `ResponsiveOverride:78-83` render an unassociated label span. The fix is the same for each: a
   `useInstanceId()` id on the span plus `role="group" aria-labelledby` around the render-prop output
   — a GROUP association, because the child control is caller-supplied and cannot be trusted to label
   itself. These two account for **30 of the 42** unnamed controls.
3. **Banned lookalikes** — per-tier duplicate controls rendered side by side instead of one wrapped
   control (`responsive-logo/edit.js:281-305` renders three always-visible logo slots); a bespoke
   `DeviceTabs`; a third breakpoint of any value (**the 768/1024 lock — carried obligation 11**);
   blending `ResponsiveControl` with `ResponsiveOverride` on one attr family.

   ⛔ **THE PAIRING IS BINDING, AND IT BROKE LIVE ON 19 BLOCKS (D563, 2026-08-11).** The primitive
   must match the STORAGE SHAPE of the family it writes, and the two are chosen together or not at
   all:

   | Storage in `block.json` | The only correct primitive |
   |---|---|
   | scalar base **with** `Tablet`/`Mobile` sibling attrs | `ResponsiveControl` |
   | `"type": "object"` base, **no** siblings | `ResponsiveOverride` |

   A mismatch is not a style question, it is **destructive and silent in both directions**. Measured:
   after `gap` migrated to the object shape, `ContainerWrapperControls.js` — ONE shared file feeding
   19 blocks — still wrote `gap`/`gapTablet`/`gapMobile` through `ResponsiveControl`. The two sibling
   attrs no longer existed, so WordPress discarded them without error (D338); and the desktop branch
   wrote a STRING into an object-typed attr, which coerces to the default and **destroys the whole
   setting**. Nothing failed, nothing warned, and it shipped to the canary.

 **Therefore, whenever a family's storage shape changes, every control writing it changes in the
   SAME commit, and the result is proven in the LIVE EDITOR** — register, render, write, assert the
   stored shape, assert no flat siblings, assert zero console errors. A frontend check cannot find
   this, because a programmatically-set value is already the right shape and never exercises the
   inspector. Search every writer across `edit.js`, `components/` and `extensions/` — a shared
   component is the high-risk case precisely because one file serves many blocks.
4. **Tab** — inherits the tab of whatever it wraps. The wrapper never changes placement.
5. **Scope** — `block_attributes.is_responsive=1` → 45 blocks, **plus** any attr family declaring
   `Tablet`/`Mobile` siblings that the column has not caught.
   ⚠ **Two traps, both walked into during the audit:** literal-name matching MISSES `brand-strip`
   (tier keys built dynamically in PHP at `helpers-typography.php:90,98`) and FALSE-POSITIVES on
   `fontSizeTablet` (built by computed key in JS) — nearly 54 false findings between them.
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
     callers**, while `ResponsiveOverride` solves the same problem with 8. ⛔ **That API is a Spec 35
     T1.2 deliverable, shipped intentionally — it is NOT dead code, and deleting it needs a gate.**
   - `ResponsiveTriStateControl` vs `BooleanResponsiveControl` are **not** an accidental fork —
     the latter's header states the shape incompatibility IS the reason both exist, and the promotion
     check this document proposed "sharpening" was already performed and documented.
   - `ResponsiveBoxControl` vs `ResponsiveBoxControls` — one letter apart, zero shared code.
     ⛔ Renaming the plural severs `check-dead-controls`' prop-name bindings.

### 13. CONTROLS WITH NO CONTRACT YET (council F — enumerated so none is "homeless")

Every shape below is live and fits none of contracts 1–12. **A rule may not silently ignore these;
each is either given a contract or recorded as deliberately uncontracted with a reason.** Listing
them here is what stops the next enforcement pass repeating the 27's blind spot.

| Shape | Live footprint | Nearest contract | Verdict |
|---|---|---|---|
| preset `SelectControl` on `minHeight` | 5 sites | LENGTH (§4) | **Needs a contract** — a length behind a preset picker breaks the token system |
| raw `BoxControl` (not the Responsive wrapper) | 5 sites | 4-VALUE BOX (§5) | **Needs a contract** — bypasses the tier wrapper |
| `BorderRadiusControl` (singular, non-responsive) | live | BORDER (§14) | **Absorbed by §14** |
| `SpacingControl` | 9 sites | LENGTH (§4) | **Needs a contract** — is it a length, or its own token-scale type? |
| `DeviceTabs` | ⚑ **DEAD — 0 callers** (Spec 35 Phase 1.2/1.3, 2026-08-10) | RESPONSIVE (§12) | **Banned lookalike — verdict still binds if reintroduced.** The component file still exists and is still exported from `components/index.js`, but every `<DeviceTabs>` render was deleted: the tier is now chosen once, in the global toggle (`src/blocks/extensions/responsive-device-toggle.js`). `inspector-scan` rule 25 flags any block that reintroduces one. |
| `AnimationControl` | 1 site | — | **Needs a contract**, and it is where carried obligation 17 (reduced-motion) binds |
| `ComboboxControl` | 2 sites | ENUM (§3) | Absorbed by §3 as a permitted large-option-set variant |
| `FormTokenField` | live | ENUM (§3) | Multi-select enum — **needs an explicit clause in §3** |
| `FocalPointPicker` | 7 sites (2026-08-11, D585 — was 1 when this row was written; `imageControls` census + fix shipped: before-after + 6 newly-converted blocks) | MEDIA (§7) | **Absorbed by §7** — and it is carried obligation 9's evidence |
| repeater item editors | `plans`, `icons`, `tiles` | — | **Needs a contract.** ⚠ D523 proved a per-item control must never be recorded as the array's control. ⛔ **The D523 guard is FRAGILE — see below.** |

⛔ **Known fragility in the D523 repeater guard (QC council, 2026-08-08).** `_repeater_item_spans()`
matches `<attr>.map(` where the identifier resolves to the attribute being written. Three limits,
all confirmed against live code:
1. **`pricing-table::plans` fires by NAME COINCIDENCE, not by design.** `edit.js:97` destructures
   `plans: plansRaw`, then `:116` creates a **shadowing local** `const plans = (plansRaw||[]).map(…)`.
   The span matches only because that local happens to be spelled like the DB attr. **Rename it and
   the guard silently stops firing**, reintroducing the exact bug it was built to fix.
2. **`gallery::mediaItems` is preserved by upstream failure, not by the guard.** `edit.js:202` does
   `const items = mediaItems || [];` — a plain assignment `_build_js_destructure_map` cannot see — so
   candidate resolution yields nothing and the row is simply left alone. Harmless here, but it means
   the guard's real coverage is narrower than "3 tags" implies.
3. **Blind by construction to** `.forEach(` / `for…of` iteration, and to any repeater whose items are
   rendered by a component in another file (the scan is single-file per block's `edit.js`).
A rule scoped on `inspector_control_type` for an ARRAY attr must therefore carry its own AST
cross-check — do not treat this guard as complete.

### 14. BORDER (restores condition 7's dropped half)

> ⚠ **AMENDED 2026-08-29 (D881) — fields 1, 3 and the tier ruling below are SUPERSEDED. Read this
> box before acting on anything in §14.**
>
> The border UI shipped as a shared composite, `SgsBorderControl`
> (`plugins/sgs-blocks/src/components/SgsBorderControl.js`). **CORRECTED 2026-08-30 — "10
> blocks" drifted 4.4x; re-verified by grep, not cache: 44 blocks now mount it**, the Shape-B
> rollout's full extent. Two blocks (`sgs/media`, `sgs/whatsapp-cta`) are radius-private-only and
> correctly don't mount it. Four (`card-grid`, `media`, `multi-button`, `trust-bar`) still carry an
> active native `__experimentalBorder` (width/colour/style) — codemod `--survey` refuses them
> `ambiguous-anchor`, open not regressed. `plugins/sgs-blocks/CLAUDE.md`'s "Border controls"
> section carries the same correction — don't let the two drift apart again.
> Census + ratcheted gate: `plugins/sgs-blocks/scripts/survey-border-control-migration.py`
> (`PRIVATE_NEEDS_SWAP` must stay 0). Three of §14's statements are now false:
>
> 1. **Radius is NO LONGER separate — it is the second control of a pair** inside
>    `SgsBorderControl`, rendered when the caller wires `onRadiusChange`. Field 1 calls that
>    separation "the condition, not an implementation detail"; Bean reversed it on 2026-08-29. §14.3
>    correspondingly still bans "radius folded into the width control" as a lookalike — that ban no
>    longer describes a defect here.
> 2. **Style is no longer a sibling `SelectControl`.** It renders INSIDE the colour popover, so one
>    swatch opens colour and style together — deliberately matching core's grouped border-box
>    layout, which field 1's D566 rationale had rejected on stored-shape grounds. That rationale
>    still holds for the STORAGE (SGS keeps its own typed attrs); only the visual grouping changed.
>    §14.3's ban on a preset style `SelectControl` now has no live subject.
> 3. **Width IS a 4-side box object**, on `ResponsiveBoxControl` with the device switcher OFF.
>    Field 1's "per-side border width has no demand at all" and the D560 line beneath it are
>    superseded by 10 shipped blocks.
>
> ⛔ **THE PROMOTION TRIGGER AT THE END OF THIS SECTION IS CANCELLED, NOT PENDING.** It says a
> per-device border width appearing anywhere fires a build. One DID appear on 2026-08-29 — it was
> specified, built, and then **dropped by Bean the same day** as having no real use case. Supporting
> it would cost `borderWidth{Tablet,Mobile}` attrs plus `@media` emission in every block for a
> control nobody would reach for. **Do not rebuild it, and do not cite that trigger as authority to.**
> The switcher is off precisely so no block offers a tier it cannot store (a dead control).
>
> ⚠ **`linked` is load-bearing on any border colour row** — see §"linked" note elsewhere in this
> spec. `GradientCapableColourControl` reads it to choose between storing the palette token SLUG and
> a baked hex. Both 2026-08-28 hand migrations AND the codemod dropped it, through 14 green
> assertions. Single-state callers use the `colourLinked` prop.
>
> ⚠ **A palette SLUG is not a paintable value.** `sgs_border_states_css()` fed one into `background:`
> inside a masked `::before` ring that also sets `border-color:transparent`, so a token-coloured
> border painted NOTHING while width and style were correct. **A raw hex works, which is why a
> hex-valued sign-off certified the broken path as working.** Where a path resolves tokens, the TEST
> VALUE must be a token.

1. **Canonical** — `ResponsiveBorderRadiusControl` for the 4 corners, and for style + width +
   colour a **composed builder** (width `UnitControl` with a real units array + style
   `SelectControl` + token-aware colour picker). Radius is a **separate** control from width and
   style — that separation is the condition, not an implementation detail.

 **Resolved by evidence, not by building it (D566, 2026-08-11):**
   - The only live demand was `gridItemBorder` (container / cta-section / hero / trust-bar, one
     control in `ContainerWrapperControls.js` serving all four) — a raw `TextControl` taking a CSS
     shorthand, i.e. §14.3's own banned lookalike. That is now the composed builder above.
   - ⛔ **Core's `__experimentalBorderBoxControl` was deliberately NOT adopted.** It works in a
     `{color, style, width}` OBJECT, while the attribute stores a CSS shorthand STRING. Adopting it
     would force a stored-content migration on every live instance **for no user-visible gain** —
     the operator gets the same three inputs either way. The composed builder writes the identical
     string, so the change shipped with zero migration.
   - Per-side border width has **no demand at all** (D560: 0 tier attrs, and no block asks for
     per-side widths), so a per-side builder would be capability manufactured against zero evidence.
     If a client ever asks, this field is the place to revisit — with that request as the evidence.
2. **Required props** — per-side values, a real `units` array, alpha on the colour, and a `label`.
3. **Banned lookalikes** — a None/Thin/Thick **preset `SelectControl`** standing in for a real
   builder (the exact shape condition 7 banned for shadow, and it was dropped for border); per-side
   scalar attrs instead of an object (**migration COMPLETE — 0 remaining**, keep the gate);
   a `TextControl` taking a raw CSS `border` shorthand (**0 remaining as of 2026-08-11** — the last
   one was `gridItemBorder`, see field 1); radius folded into the width control.
4. **Tab** — `border`. Styles.
 *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `box_family IN ('borderWidth', …)` ∪ `css_property LIKE 'border%'`. ⚠ `box_family` is
   now trustworthy (D523) but still scopes only to 4-side/4-corner OBJECT attrs — a scalar radius
   (`card-grid.cardRadius`, `nav-menu.itemRadius`, `mega-aside.asideRadius`) is correctly NULL there
   and must be picked up by the `css_property` leg, or the rule will miss every one of them.
6. **Conformance** — ✅ **MEASURED 2026-08-11 (Phase 0 item 0a, D561).** Source:
   `npm run survey:box`, re-run after the three fixes below. Cite these, not the pre-fix figures.

   | Leg | In scope | Canonical | Non-canonical |
   |---|---|---|---|
   | **4-CORNER** (radius objects) | 30 | `ResponsiveBorderRadiusControl` **30 — 100%** | **0** wrong-shape · **0** preset-select · **0** with no control |
   | **Scalar radius** | 13 | `UnitControl` **11** *(was 8; +3 this session)* | `RangeControl` 2 |
   | **Scalar border-width** | 7 | `UnitControl` **3** (the new grid-item builder) | `RangeControl` 1, remainder resolved to panel wrappers. **0 raw-CSS `TextControl`** |

   ⭐ **RE-MEASURED 2026-08-11 with a FIXED instrument (D566).** The figures above are the
   post-fix run, not the original. `survey-box-controls.py` had two compounding defects, both now
   fixed with regression guards (self-test 5 → 7 cases, and `--self-test-demonstrate-failure` still
   proves the harness is not hard-wired green):
   - **It counted matches inside COMMENTS.** `sgs/counter/edit.js:216` is the JSX comment
     `{/* … the borderRadiusTablet/borderRadiusMobile object attrs. */}`.
   - **It had no ELEMENT BOUNDARY.** `_nearest_preceding_jsx_tag` walked back 60 lines for any
     capitalised tag, so an occurrence *after* an element closed was still blamed on it — the
     Margin `<ResponsiveBoxControl>` opened at `:196` and closed `/>` at `:210`.

   Together those manufactured **every** non-canonical hit in the 4-CORNER leg. Post-fix the leg is
   clean and — the check that matters — **the 24 real canonical mounts are unchanged**, so the
   false positives were cleared without going blind. A third leg defect is also fixed: the scalar
   legs passed an EMPTY canonical set, so 11 correct `UnitControl` mounts printed
   `[non-canonical/raw]`; a leg that can only ever report non-conformance is not a measurement.
   `UnitControl`/`ResponsiveControl` are canonical there per §4.1 + §14.5.

   ⚠ One residual row, correctly reported and NOT a defect: `product-card.ctaBorderRadius` also
   appears at `edit.js:1421` inside the style-preset `SelectControl`'s `onChange`, which *reseeds*
   it from `BUTTON_PRESETS`. That is a side-effect write, not a control mount — its real canonical
   mount is detected at `:1664`. Attributing a side-effect write to the writing control is a known
   remaining limitation of static attribution, disclosed rather than silently counted.
   | **Per-side scalars** (§14.3 migration) | — | — | **0 — §14.3's "migration COMPLETE" claim reproduces independently** |

 **Fixed this session (raw `TextControl` taking free CSS → `UnitControl`, §14.3 → §14.1/§14.2):**
   `sgs/card-grid.cardRadius`, `sgs/trust-bar.iconCircleBorderRadius`,
   `sgs/trust-bar.badgeImageBorderRadius`. All three are `type: string` and their `render.php` reads
   a plain string, so the value domain is unchanged; the canary carried **0** stored instances
   (positive controls: 295 posts with `wp:sgs/` blocks, 33 with some radius). Each got an explicit
   `units` array **including `%`** per field 2 — load-bearing, since `iconCircleBorderRadius`
   *defaults* to `'50%'` and a px-only array would have silently removed the block's own circle.

   ⛔ **THE SURVEY'S FALSE-POSITIVE RATE IN THIS LEG IS 7 OF 7 — every non-canonical hit it named
   was wrong. Do not dispatch a codemod at its raw output.**

   ⚠ **CORRECTED 2026-08-11 by a QC council (D566), and the way it was wrong is the lesson.** This
   entry first recorded only the 2 `SelectControl` hits as false positives and passed the 5
   `ResponsiveBoxControl` hits through as real, under "Recorded, NOT fixed — Phase 3". A rater read
   the code; **all 5 are the same defect class as the 2 already caught.** `sgs/counter:196`,
   `sgs/timeline:390` and `sgs/whatsapp-cta:204` are each the **Margin** `ResponsiveBoxControl`
   (`values={{ base: style?.spacing?.margin … }}`) — the scanner attributed a nearby `borderRadius*`
   attribute NAME to the closest `ResponsiveBoxControl`, which controls margin. **Real count: 0.**

   The failure was not the scanner — it was applying the read-the-code check to one bucket of a
   table and not the bucket beside it. **When a survey leg is shown to mis-attribute, re-check EVERY
   bucket in that leg, not just the one that prompted the suspicion.**

   The 2 `SelectControl` hits, for the record:
   - `sgs/button` — the flagged `SelectControl` is `textDecorationHover`; `borderRadiusTablet/Mobile`
     actually feed `ResponsiveBorderRadiusControl` (`edit.js:772-773`). **Canonical.**
   - `sgs/product-card` — the flagged `SelectControl` is `ctaStyle`; `ctaBorderRadius` feeds
     `ResponsiveBorderRadiusControl` (`edit.js:1670`). **Canonical.**

   So the *real* §14.3 banned-lookalike population was **3, not 5**, and all 3 are now fixed. This is
   the same defect class already recorded against the LENGTH survey — the scanner attributes an
   attribute name found in a nearby **comment** to the next control it sees. Treat every survey leg
   as a candidate list requiring a read, never a defect list.

   ✅ **ALL §14 RESIDUALS DISCHARGED 2026-08-11 (D566).** There is no remaining border backlog and
   no parking entry — `P-SPEC35-BORDER-RESIDUALS` was opened to un-orphan these and closed the same
   day once each was actually resolved:
   - the 6 "no control" radius attrs → **0**. Four (`gridItemBorderRadius`) always had a control in
     a shared panel the survey could not see; the two real ones (`option-picker.borderRadiusTablet`
     /`Mobile`, declared AND rendered at `render.php:250-251`) now have one.
   - the "5 corner attrs fed to a 4-SIDE control" → **withdrawn, false positives**.
   - the raw-CSS `TextControl` border → **replaced** (field 1).
   - the missing `units` arrays → **fixed**; the real gap was **2**, not the 8 recorded.

   ✅ **Instrument defects — FIXED 2026-08-11 (D566), not merely recorded.** (a) the scalar legs now
   declare `UnitControl`/`ResponsiveControl` canonical; (b) comment matches and out-of-element
   attributions are both eliminated, with regression guards. Remaining owed work is in
   `P-SPEC35-BORDER-RESIDUALS`: the 8 scalar mounts still passing **no `units` array** (field 2).
7. **Detection** — as §11 SHADOW: classify each border attr's control into compliant /
preset-select / raw-text / no-control. FIXED 2026-08-11 (D561): `sgs/card-grid.cardRadius`,
`sgs/trust-bar.iconCircleBorderRadius`, `.badgeImageBorderRadius` were raw-text violations; the
raw-text population was 3, now 0. `cardRadius` is also discharged under LENGTH §4.
8. **Answered (D560, 2026-08-11). Border splits in two, and the measurement is unambiguous.**
   - **RADIUS is already responsive, and already built.** **12** blocks declare
     `…borderRadius{Tablet,Mobile}` — before-after, brand-strip, button, countdown-timer, counter,
     hero, icon-list, media, option-picker, table-of-contents, timeline, whatsapp-cta. The wrapper
     is `ResponsiveBorderRadiusControl` (`src/components/ResponsiveBoxControl.js:162-196`), in
     production at 17 mounts. **No build owed** — the responsive wrapper question was answered by
     someone shipping one.
   - **WIDTH / STYLE / COLOUR are desktop-only in practice.** `borderWidth{Tablet,Mobile}` matches
 **0 of 83** `block.json` files; `border{Style,Colour,Color}{Tablet,Mobile}` likewise **0**. The
     11 `borderWidth` object attrs and 31 `border-color` attrs carry no tier sibling anywhere. The
     one apparent counter-example, `sgs/separator.thickness`, is a **scalar** `border-width` whose
     3 tiers are a flat→object migration candidate (Phase 1.6), not a per-side border builder.
   - **Ruling: leave width/style/colour desktop-only.** ⚠ This is a **demand** ruling, not a
     capability ruling. D549's generic principle (any property may take the TIER axis) still stands,
     and `SGS_Container_Wrapper` is *already* tier-plumbed for border since D549 Stage 2
     (`class-sgs-container-wrapper.php:2125-2172`) — so reversing this costs block-side attributes
     and control mounts only, never wrapper work. That is what makes it cheap to reverse, and why
     building on principle ahead of demand was rejected.
   - **Promotion trigger, if wanted later:** the first block, stored instance, or draft clone that
     actually carries a per-device border width. Until one exists there is nothing to verify a
     build against.
   

---

---

### CARRIED OBLIGATIONS — the conditions no single control type owns

**These are RESTORED verbatim in force from the 27-condition checklist (council finding A).** A
control-type contract answers *"which component, which props, which tab"*. It cannot answer *"is
this panel grouped by block part"* or *"is this animation reduced-motion gated"* — those bind across
every type or across none. **Dropping them was the draft's most serious failure**, because two are
accessibility requirements and one was the only written record of a locked standard.

Each carries the same eight-field discipline where it can, and states its enforcement honestly.

#### CO-17. Reduced-motion gate on all animation *(was condition 17 — WCAG 2.3.3 AA)*
Every animation and transition is `prefers-reduced-motion`-gated, from day one, never bolted on.
**Enforced by** `inspector-scan/rules/17-reduced-motion-gate.js` — **GATE mode, one of only four**.
⚠ **This is a WCAG conformance requirement, not a preference.** It binds on §13's `AnimationControl`,
on `extensions/animation.js` (84 blocks), and on `fx.js`. Losing it would have silently dropped an
accessibility gate that is currently live and passing.

#### CO-11. The 768/1024 device-tier lock *(was condition 11)*
Responsive props expose the locked 768/1024 tiers via `ResponsiveControl`; **no bespoke third
breakpoint.** ⚠ **Measured: these values exist ONLY as per-file constants in 3 `view.js` files** —
there is no shared constant, no schema, no gate. **The written rule was the sole thing holding the
standard**, so deleting it would have left 768/1024 enforced by nothing at all. Binds with §12 field 3
and with the device-tier-vs-visual-breakpoint distinction (a design-driven `min-width:600px` is
legitimate and must NOT be swept). **Enforced by** UNENFORCED — and now visibly so.

#### CO-2. Element-first panels *(was condition 2 — REWRITTEN 2026-08-08 to the derived model)*

Composite blocks group inspector panels by block PART, not by property type — **derived from
`supports.sgs.elements`, never hand-sorted.** This is THE PLACEMENT RULE above; CO-2 adds only the
two clauses that rule leaves implicit:

1. **A panel holds its element's WHOLE surface** — content (`contentAttrs`), then style clusters in
   declared `clusters` order, then its states inline beside the values they modify.
2. **A "Hover" panel is a banned lookalike** (§6 field 3), not a placement choice. So is splitting one
   element's controls across two panels.

CO-2 binds *what goes together*; **CO-28** binds *sequence*. Separate obligations; neither implies
the other.

**Enforced by** UNENFORCED — the `consistency-scanner` this was once attributed to does not exist
anywhere in the codebase. `element-panel-conformance` (design §6) will enforce it, advisory-first with
a must-flag / must-not-flag fixture pair. **Not built yet — do not cite CO-2 as gated.**

#### CO-28. Consistent ORDER of panels, clusters and controls *(NEW — Bean-raised 2026-08-08, not a carried item)*
*(Numbered 28, above the 27-condition space, precisely BECAUSE CO-numbers mirror old condition
numbers. It was first drafted as "CO-22" — which would have collided with condition 22, "silence is
not rejection", a live map row still awaiting a proper destination. A new obligation must never
squat on a carried item's number.)*
The same thing sits in the same place in every block. Three levels, all binding:
1. **Panel / tab order** — the sequence of inspector panels follows one canonical order across every
   block that has those panels. A client who learns one block has learned the shelf layout of all of
   them.
2. **Cluster order within a panel** — related controls form the same cluster in the same position
   (e.g. colour before spacing before border, base value immediately before its state value per
   CO-2's sibling rule in §6 field 4).
3. **Control order within a cluster** — a fixed sequence per control TYPE, not per author.

**Enforced by** UNENFORCED — no rule, gate or linter in the tree checks order at any of the three
levels (verified 2026-08-08 by grepping every `.js`/`.py` under `plugins/sgs-blocks/scripts/` for
`panel.?order` / `control.?order` / `canonical.?order` / `expectedOrder`: **zero hits** — every
"ordering" match in the codebase is converter *execution* order, not inspector layout).

**Note:** this obligation PROMOTES an existing competitor-research note (Cross-cutting A's
panel-order convergence findings: Stackable via per-block convention, GenerateBlocks centralising
only the Styles tab) to a binding obligation with enforcement — it is not a fresh discovery. Lesson:
an earlier claim that panel order "existed nowhere in the contract" was itself wrong, caused by a
grep capped at 20 hits missing the relevant line at ~980 — always check whether a `head`/first-N-hits
search silently truncated before asserting an absence.

**Distinct from CO-2, which it sits next to.** CO-2 binds *grouping* — "panels grouped by block PART,
not by property type". It is silent on sequence: a block can satisfy CO-2 completely and still present
its parts in a different order from every other block. Grouping says what goes together; this says
where it goes.

**Why it belongs to the client, not to tidiness.** Spec 35 exists because Bean's clients are
tech-illiterate and live in the block editor. Inconsistent order costs them the one thing that makes
an unfamiliar block usable — transfer of learning from the block they already know. It is the same
class of harm as a missing control (the setting is reachable, but not *findable*), which is why it is
an obligation and not a style note.

⛔ **Do NOT build a rule from this entry yet.** No canonical order has been *decided*, and
`rules.json._meta.zeroIsAClaim` forbids trusting a live run before an independently-derived expected
population exists. Two prerequisites, in order: (a) Bean picks the canonical panel order — a **Rule 7
design gate**, since it binds every block; (b) the current per-block order is censused so the backlog
is known before anything is scoped against it. A rule written before (a) would be enforcing an order
nobody chose.

##### ⛔ HARD DEPENDENCY — PLACEMENT before ORDER *(Bean-approved sequencing, 2026-08-08)*

**CO-28 does not start until Cross-cutting A's placement backlog is worked.** This is a dependency,
not a preference, and the measurement is what makes it one: **65 of 83 blocks have 2+ inspector
panels and no `group` prop at all** (`inspector-scan` rule `01-tab-group`, the single largest backlog
in the scanner). No group prop means every panel lands in Settings. **You cannot standardise the
order of panels across Settings and Styles while most blocks never split into two tabs.** Ordering an
unsorted pile is not a smaller version of this job — it is a different job that cannot begin yet.

Placement, unlike order, needs no design gate: it is decided. Placement is governed by **THE
PLACEMENT RULE** (top of this document, TWO-TIER since D537 2026-08-09): TIER 1 element scope
decides the panel first; TIER 2 property-family (`cluster-member-sets.json`) decides placement for
everything scoped to no element; a contract's `Tab` field is authoritative only for a control that
styles nothing, and there only picks the WordPress *group* inside the pinned `Settings` panel.

Still nothing to choose, only to apply — but apply the amended rule, and derive it from
`supports.sgs.elements` rather than sorting by hand.

**The agreed sequence (Cross-cutting A's own recommendation, endorsed unchanged):**
1. **Fix the 6 extension files.** They inject panels into **all 84 blocks**, mostly via a bare
   `<InspectorControls>` — `animation.js:138` (motion is Styles), `hover-effects.js:279`,
   `image-controls.js:157` (sizing/position is Styles) are WRONG; `fx.js`, `custom-css.js`,
   `block-defaults.js` are already correct. Three files correct placement on every block at once.
   Also `parallax.js` splits ONE feature across two tabs **by accident** (background → `group="color"`
   at :144, element → bare at :182).
2. **Work the 65 down** by hand.
3. **Promote `01-tab-group` to gate** once that backlog is zero — never before (advisory-first rule).
4. **THEN CO-28**, whose own two prerequisites above still apply on top.

⚠ **The step-1 fix is currently UNGUARDED.** No rule scans `src/blocks/extensions/` — rule 01 only
ever reads per-block `edit.js`, and `inspector-scan` has no `extensionsDir` at all (the documented
BLOCKED extension surface). The 6 files can be fixed and then silently regress. Wiring that
visibility belongs with step 1, not after it.

**Fold in with step 2 — default-open discipline.** Only the first panel per tab defaults open;
**23 blocks violate** (`decorative-image` opens 5 of 7). Same findability harm as order, same files,
same pass — doing it separately means touching all of them twice.

##### THE ORDER CONVENTION — Bean-decided 2026-08-27 (answers CO-28 prerequisite (a) — RECORDED, not built)

> **This is a separate question from THE PLACEMENT RULE above.** THE PLACEMENT RULE decides
> *which panel a control belongs to* (TIER 1 element, TIER 2 property-family). This convention
> decides *what order the panels/controls that placement produces appear in*. Neither implies the
> other, and this section does not restate the placement rule — read it above if you need it.

CO-28 named panel/cluster/control order as a binding obligation but explicitly refused to let
anyone build a rule for it: *"Do NOT build a rule from this entry yet... (a) Bean picks the
canonical panel order — a Rule 7 design gate."* Bean has now done exactly that. The convention:

1. **Controls and panels follow the DOM order of the elements they configure** — top to bottom;
   where two elements sit at the same level, left to right.
2. **At the root level, follow WordPress-native ordering** — Styles, then Colour, then Typography.
3. **Two pinned positions, independent of everything else on the page:** *Advanced* is ALWAYS last
   in Settings. *Visibility conditions* is ALWAYS second-from-last.

**This satisfies CO-28's prerequisite (a). Prerequisite (b) is untouched and still blocks a full
order rule.** CO-28's hard dependency stands exactly as written above: *"CO-28 does not start until
Cross-cutting A's placement backlog is worked"* — 65 (measured 2026-08-09: 58) of 83 blocks still
have 2+ inspector panels with no `group` prop, i.e. most blocks have not even split into tabs yet.
Sorting an unrouted pile into rule 1 or rule 2's sequence is not decidable until that backlog closes,
and building a rule against it now would be enforcing an order most blocks cannot yet express.

**Rules 1 and 2 are therefore recorded here but deliberately UNENFORCED** — the same "recorded,
not gated" state every other part of CO-28 is already in, for the same stated reason. Do not build a
detector for DOM-order or the root Styles→Colour→Typography sequence before the placement backlog
closes; full JSX DOM-order inference is not reliably static-analysable in any case (see the README's
own warning under "Adding a rule" — two regexes for one earlier ordering question returned 0 and 471
in opposite directions from the same file).

**Rule 3 is different: it does NOT depend on the placement backlog**, because it is not about
sorting an unsorted pile — it is a guarantee two specific names already hold, structurally, for
every block, via one shared mechanism (`src/blocks/extensions/conditional-visibility.js`, registered
last in `extensions/index.js`, so its "Visibility conditions" panel lands immediately above core's
own structurally-last `InspectorAdvancedControls` — "Advanced" — slot). That guarantee cannot be
broken by the placement backlog; it can only be broken by a per-block `edit.js` authoring its own
panel that steals one of the two pinned names. **Enforced by**
`inspector-scan/rules/35-pinned-panel-position.js`, ADVISORY, `openBacklog: 1` — the one block that
does this today is `sgs/heading` (`edit.js:542`, a bare `<PanelBody title="Advanced">` inside the
default Settings group, holding an inherit-style toggle, nowhere near
`InspectorAdvancedControls`). The rule is deliberately narrow: it asserts only that no block-authored
panel carries the literal title "Advanced" or "Visibility conditions" outside the shared mechanism
that owns those positions — it does not attempt DOM-order or root-sequence inference (that is
rule 1/2's job, above, and stays unenforced until the placement backlog closes).

#### CO-3. ToolsPanel on dense panels *(was condition 3 — downgraded to a bare remediation count)*
Any panel with ~6+ controls uses `ToolsPanel`/`ToolsPanelItem` progressive disclosure (1–3
`isShownByDefault`, `resetAll`). **Enforced by** `inspector-scan/rules/03-dense-panel-candidate.js`,
ADVISORY. ⚠ A remediation count ("15 dense panels") is a backlog, not a rule — the obligation is
restored here so the backlog has something to be a backlog *of*.

#### CO-9. Full image controls *(was condition 9)*
Image-rendering blocks expose size dropdown (attachment `sizes`) + aspect-ratio + object-fit +
`FocalPointPicker` where relevant. **Enforced by** `audit-feature-parity.py` (vs `core/image`).
Binds with §7 MEDIA and gives §13's lone `FocalPointPicker` its home.

#### CO-10. Multi-item data is array-shaped *(was condition 10)*
Any repeated/multi-item media or content uses an array attr with `gallery`/`multiple="add"`
(`MediaGalleryPicker`) or a repeater — never a scalar attr added one at a time. **Scope: 25 blocks
declare 34 array attrs.** **Enforced by** `audit-feature-parity.py`. ⚠ **D523 clarifies the control
question this raises:** the control for an array attr is the REPEATER UI, never the per-item control
inside it — a rule reading `inspector_control_type` for an array attr is asking the wrong question.

#### CO-13. hideExtensions is a per-BLOCK obligation *(was condition 13)*
Irrelevant universal-extension panels are hidden per block via `supports.sgs.hideExtensions`
(declarative). ⚠ The draft kept the mechanism and dropped the **per-block obligation** — which is
the part that makes it anyone's job. **Enforced by** UNENFORCED.

#### CO-15. No duplicated native-supports panel *(was condition 15 — RESTORED 2026-08-08)*
No bespoke panel re-implements a control a native `supports` panel already provides. This is the
inspector-UX form of **R-31-9**.

⛔ **CORRECTED 2026-09-04 (item C5 reconciliation) — the "Enforced by `check-duplicate-controls.js`"
claim two paragraphs below is WRONG, and this box previously said otherwise.** `check-duplicate-
controls.js` is wired into `prebuild` (that part is true), but it targets a completely different
bug class: (1) universal `sgsHover*` panel vs a block's own private `*Hover` attrs, (2) two JSX
controls in one `edit.js` writing the same attr, (3) a composite's own control duplicating a child
InnerBlocks control. Read its own docblock — nowhere does it compare an SGS bespoke panel against
a native WordPress `supports` panel (colour/typography/spacing/border/etc). **Part L's own verified
audit (2026-08-17, below in this same file) already found this: "no gate exists… `check-duplicate-
controls.js`… target[s] a different bug class."** This box and Part L directly contradicted each
other from 2026-08-19 to 2026-09-04; Part L was right. **Enforced by: nothing, for the general
rule.** See Part L's own entry for what to do about it (the general rule is not gateable — Part G's
D402 verdict table shows most "duplicates" are the deliberate, correct choice; only the two named
ADOPT cases — `aspectRatio`, `duotone` — are a well-specified subset, and even that is a
migration-completion problem for 7 already-enumerated blocks, not a lint-gate problem — see
`.claude/reports/2026-09-04-c5-native-supports-duplicate-panel-scoping.md`).

Restored 2026-08-08 (QC-council audit): this document's ABSORPTION MAP had wrongly claimed
this rule was absorbed into Cross-cutting B (a different question — universal-extension opt-out fit).
The rule appeared nowhere in this file until restored here.

#### CO-18. Decorative-image toggle + ARIA-label *(was condition 18 — RESTORED 2026-08-08)*
A decorative-image toggle (**empty alt + `aria-hidden`**) and a general **ARIA-label** control are
present wherever the block's rendered markup needs them. *(Spec 35 C, E6.)* **Enforced by** `inspector-scan/rules/18-decorative-image-aria.js`, ADVISORY,
`openBacklog: 13` (verified 2026-08-19 against
`plugins/sgs-blocks/scripts/inspector-scan/rules.json`). Live since 2026-08-03.
⛔ **Restored after the same audit.** The map claimed §7 MEDIA field 2 + CO-19. Neither holds: §7
field 2 says only "alt text", and CO-19 governs the accessibility of the **editor control UI itself**
(keyboard, contrast, `aria-describedby`) — a different target from the **rendered output's**
accessibility, which is what this condition is about. ⚠ Do not re-merge these two: an accessible
control that writes an inaccessible output satisfies CO-19 and fails CO-18.

#### CO-16. Native over hand-rolled *(was condition 16)*
Native `supports` are used over hand-rolled equivalents for aspect-ratio / duotone / sticky /
lightbox — **check native BEFORE building any of these.** Points at a Bean-approved D402 verdict
table. **Enforced by** feature-parity + Wave-3 native-migration audit. ⚠ This is the condition that
**prompts §G's open question** (retire `sgsCustomCss` for WP 7.0 native per-block CSS) — dropping it
would have removed the standing instruction that raises that question at all.

#### CO-19. Accessibility pass, E1–E4 *(was condition 19)*
Keyboard-operable · 4.5:1 contrast on the block's own control UI · `help` linked via
`aria-describedby` · every control has an accessible name. **Enforced by** manual pass —
**informational, never a gate** (`a11y-validation-feedback-informational-not-gate`). ⚠ The missing
`id` on `DesignTokenPicker`, `SgsLinkControl`, `IconPicker`, `ShadowControl`, `ResponsiveControl` and
`ResponsiveOverride` is an E1–E4 failure, which is why those clauses appear in six contracts above.

#### CO-20. Client patterns use templateLock *(was condition 20 — carried in a form the spec FORBIDS)*
⛔ **`templateLock:"contentOnly"` is per-client opt-in — "never framework patterns" (D402,
Bean-approved).** The draft's Tier 4 "23 pattern templateLock" reinstated a framework-wide backlog
D402 had closed; that entry is REMOVED. The obligation as it correctly stands: a **client-facing**
pattern using a block sets `templateLock:"contentOnly"`. **Enforced by** pattern audit; `rules.json`
correctly keeps rule 20 ADVISORY.

#### CO-21. No Part-F anti-patterns *(was condition 21)*
None of the Spec 35 Part F fail-list is present: essential control sidebar-only · incomplete option
sets · no reset · colour-only focus · bespoke Custom-CSS field · raw-px spacing. **Enforced by** the
contracts above, collectively.

#### T1 / T2 / T3 — the Bean-locked threaded standards *(dropped entirely)*
⚠ **`audit-feature-parity.py` is a LIVE WIRED GATE. Dropping these left a running gate with no
governing document** — the precise inversion of the failure this contract exists to end.
- **T1. Feature-parity** — the block exposes AT LEAST the full capability of the core block(s) it
  replaces (`block-replacements.json`), unless a named exception in `feature-parity-exceptions.json`
  mapped to a Wave. *(memory `sgs-block-feature-parity-with-replaced-core`.)*
- **T2. Shrink-to-fit** — intrinsically responsive: root/section min-content ≤ resolved container
  width at every tier, 0 forced horizontal overflow, **measured with the UNIT-C `min-width:0`
  backstop DISABLED** (proves intrinsic, not backstop-rescued). *(memory
  `blocks-must-shrink-to-fit-container`.)*
- **T3. Media-controls** — for media blocks, the control SET was decided against a competitor
  comparison (Kadence / Spectra / GenerateBlocks + core) and every candidate is built or Wave-mapped.

#### Rule-authoring discipline 22 / 24 / 25 / 26 *(dropped; these govern how every rule above is WRITTEN)*
- **22. Silence is not rejection — and never resolve a conflict by POSITION.** A detector's absence
  from a supporting list and its presence-with-a-negative-verdict are different facts. Generalised
  after three independent recurrences: whenever a script merges evidence from more than one source,
 **the tie-break must be STATED in the script's own logic or comments** — never left to whatever the
  data structure's default ordering produces. Correctness by accident of iteration order breaks the
  moment input order changes.
- **24. A report's named artefact must exist on disk** — mechanically checkable, not asserted. (Two
  claimed "durable regression fixtures" were transient and gone.)
- **25. Name the CONSUMER before measuring a value, then prove it by reading that consumer.**
  `derived_selector` was measured against what a block RENDERS and 593 of 889 reported as phantom —
  it is a DRAFT-side matcher. Reading the prior decision did not prevent the repeat; only reading the
  consuming code would have.
- **26. A zero from a search you wrote requires a positive control.** Find something you KNOW is
  present first. Three zero results in one session were broken searches, not empty worlds.
- *(23 and 27 are absorbed, not carried — see the absorption map.)*

---


### Cross-cutting A — PLACEMENT

WordPress has **16 real group keys** (verified against Gutenberg source, not docs — this mapping is
not on developer.wordpress.org). `settings` is a hard alias of `default`. `advanced` renders as a
panel *inside* Settings, not its own tab. `content` and `list` map to their own tabs.

The definitive tab assignment is **THE PLACEMENT RULE** at the top of this document: TIER 1
element scope decides the panel first.

⚠ **FURTHER AMENDED 2026-08-09, D537 — controls scoping to no element are NOT all "Tab field"
territory.** TIER 2 property-family (`cluster-member-sets.json`) is authoritative for any such
control that styles something. A contract's `Tab` field is authoritative only for a control that
styles **nothing** — no CSS property behind it — and there only for choosing *which group inside
the pinned-first `Settings` panel* it lands in.

**The highest-leverage placement fix is NOT the 66-block backlog — it is 6 files.** The universal
extensions inject panels into all 84 blocks and mostly use a bare `<InspectorControls>`:

| File | Group | Verdict |
|---|---|---|
| `animation.js:138` | bare | wrong — motion is Styles |
| `hover-effects.js:279` | bare | Hover + Click Effects wrong; Block Link defensible |
| `image-controls.js:157` | bare | wrong — sizing/position is Styles |
| `conditional-visibility.js:302` | bare | defensible (utility) |
| `fx.js:1230` | `styles` | correct |
| `custom-css.js:66` / `block-defaults.js:88` | `InspectorAdvancedControls` | correct |

Fixing the group prop on those files corrects placement on every block at once. **No rule scans
`extensions/` — rule 01 only ever reads per-block `edit.js`.**

Also: `parallax.js` splits ONE feature across two tabs — background parallax uses `group="color"`
(line 144), element parallax is bare (line 182). Same feature, two tabs, by accident.

**Default-open discipline** — only the first panel per tab defaults open. **23 blocks violate**;
`decorative-image` opens 5 of 7.

**Panel order** — three competitors converged on ordering being deliberate. Corrections to the
earlier claim: Stackable achieves it by **convention repeated per block, not a shared assembler**;
GenerateBlocks centralises the **Styles tab only** — Advanced stays per-block even there.

**On `<SgsInspectorControls>`** — proposal only, Rule 7 design gate required. Honest assessment: it
would dissolve the 66-block backlog by construction, but it **does not reach the extension files**,
which are HOCs, not components a block author calls — and that is the bigger leverage point.
Recommended sequence instead: fix the 6 extension files (cheap, universal), work the 66 down by
hand, promote `01-tab-group` to gate, and revisit the assembler only if it drifts again.

### Cross-cutting B — UNIVERSAL EXTENSION FIT

`noOptOutExtensions` is `[]` today — animation's opt-out landed 2026-07-19; the three
remaining without one are self-classified utilities. Note: `check-universal-fit.js`'s own file
header still describes the old state and needs updating.

⛔ **BOTH OPT-OUT RECOMMENDATIONS WITHDRAWN BY THE COUNCIL (2026-08-07).**
- **`customCss`** — `sgsCustomCss` is load-bearing for clone fidelity (Spec 31 FR-31-5.2
  residual-band passthrough), carries a deliberate framework-wide exemption in Spec 35 Part F, and
  its own file header says "never remove it". The contract's argument that "the utility defence
  protects the attribute, not the sidebar space" **misread the source** —
  `check-universal-fit.js:38-49` argues explicitly about the PANEL ("an unused panel is inert").
  Second-order harm the contract missed: hiding the control makes a converter-written `ResidualBand`
  invisible and uneditable to the client. **See §G for the genuine alternative** — adopt WP 7.0's
  native per-block CSS and delete the extension, rather than hiding ours.
- **`responsiveVisibility`** — it owns **no panel at all**; its toggles render from
  `conditional-visibility.js:343`. An opt-out would remove zero sidebar rows, so the stated
  rationale does not apply. D400 additionally ruled its three independent per-device toggles are
  KEPT, no reshape.
- **`conditionalVisibility`** keeps none — CONFIRMED by D401 ("kept deliberately").

**Why `sgs/gallery` is never flagged** — `isInappropriateFitKind()` is exactly:
```js
return block.category === 'sgs-forms' && block.surfaces.styling === false;
```
Gallery is `sgs-content` with `styling: true`. It fails both, always.

**Root cause: the heuristic asks a product-taxonomy question when the real one is architectural.**
Wrapping a gallery in one link is broken because HTML forbids nesting interactive elements — the
gallery's own images are interactive. Nothing to do with styling or category.

The naive rule `capability IN ('array-content-lift','carousel','grid-layout','logo-strip')
OR attr_type='array' AND role='content'` was rejected (D525): three of those four capabilities are
fossils with no writer/reader, and the array-attr fallback leg misses `sgs/gallery` (its
`mediaItems` carries no role) — the very block this section is about. **Shipped instead:**
`isCollectionKind(block) = block_capabilities row (slug,'collection') ← supports.sgs.collection` in
the block's own block.json. 15 blocks declare it; fires for Block Link specifically.

The hardcoded 14-slug denylist lives at `scripts/check-universal-fit.js:146` (the audit
gate), not in `animation.js`. `animation.js:44` holds only `CORE_ANIMATION_BLOCKS`, a 4-entry
allow-list; its docblock records the per-block denylist was removed 2026-07-19 in favour of
declarative `hideExtensions`. The R-31-1 concern stands against the gate's denylist, alongside the
unreviewed 4-slug allow-list.

---


## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin. Full URL list
in the six 2026-07-18 research transcripts.
```
