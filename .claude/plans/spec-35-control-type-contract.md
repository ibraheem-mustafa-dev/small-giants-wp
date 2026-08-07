---
doc_type: reference
title: Spec 35 — the CONTROL-TYPE CONTRACT (intended to replace the 27 end conditions)
status: DRAFT — COUNCIL-CORRECTED, NOT YET AUTHORITATIVE
created: 2026-08-07
governs: the universal block-inspector control surface (Spec 35)
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
supersedes: NOTHING YET — see §COUNCIL VERDICT. The 27-condition checklist
  (.claude/plans/spec-35-inspector-DONE-checklist.md) REMAINS AUTHORITATIVE until the dropped
  conditions listed below are restored here.
---

## ⛔ COUNCIL VERDICT (qc-council, 4 raters, 2026-08-07) — READ BEFORE ACTING

**This document is NOT yet a replacement for the 27-condition checklist. Do not tombstone that
file. Do not build from this document's figures without checking the corrections below.**

A structural pre-gate verified all 24 `file:line` citations (24/24, zero phantoms), and the
council confirmed every STRUCTURAL finding: the 84-block denominator, all fifteen scoping axes,
every gate output (66/15/23/1/120), the ESLint total and breakdown, the shadow and box
reconciliations, and all four accessibility citations — each re-derived independently.

What failed was **derived arithmetic and completeness**:

### A. Ten conditions were silently dropped. Restoring them is a precondition to superseding.
17 (reduced-motion — WCAG 2.3.3 AA, one of only FOUR gate-mode rules) · 11 (the locked 768/1024
standard — measured to exist ONLY as per-file constants in 3 `view.js` files, so the written rule
was the sole thing holding it) · 2 (element-first panels) · 3 (ToolsPanel, downgraded to a
remediation count) · 9 (image controls / FocalPointPicker) · 10 (array/repeater — 25 blocks
declare 34 array attrs) · 7's BORDER half (BorderBoxControl, style + per-side + alpha) · 16
(native over hand-rolled — points at a Bean-approved D402 verdict table) · 13's per-BLOCK
obligation · 19's E1–E4 a11y content · T1/T2/T3 (the Bean-locked threaded standards — note
`audit-feature-parity.py` is a LIVE wired gate that would have had no governing doc) · 22/24/25/26.

### B. Three proposals contradict the record — do not act on them
1. **`customCss` opt-out — WITHDRAWN.** `sgsCustomCss` is load-bearing for clone fidelity (Spec 31
   FR-31-5.2 residual-band passthrough; Spec 35 Part F carries a deliberate framework-wide
   exemption; D401 records "flagged, NOT fixed"; `custom-css.js:21-23` says "never remove it").
   The contract also rebutted an argument nobody made — `check-universal-fit.js:38-49` defends the
   PANEL, not the attribute.
2. **`feature-grid` "leftover hardcode" — WITHDRAWN AND WRONG.** `render.php:131` sits inside
   `elseif ( $has_explicit_grid )`, one of three branches, with an adjacent comment: it is **D270**,
   a Bean-diagnosed composite-mirror fix, live-verified on sandybrown. Acting on the contract's
   §3.8 would REVERT it. (`feature-grid.layout` has no enum at all; the client control is
   `layoutMode`.)
3. **"17 stylesheets carry `:not([style*=`" — FALSE.** `check-stranded-guards.py` is wired into
   `prebuild` and passes: **0 stranded guards across 85 blocks**. The grep hits are REMOVAL
   COMMENTS documenting the guard's deletion. The doc conflict itself (root `CLAUDE.md:238` vs
   `plugins/sgs-blocks/CLAUDE.md:218`) is real and confirmed; the live-debt count was not.

### C. Eleven figures corrected
| Contract said | Actual |
|---|---|
| ~82 blocks get block-link | **67** (84 − 17 opt-outs). 82 is the `customCss` figure, transposed. |
| `ToggleControl` `__nextHasNoMarginBottom` 79/162 | **133/162** |
| `TextControl` `__next40pxDefaultSize` 1/162 | **2/199** (denominator carried from the row above) |
| `NumberControl` 0/8 | **1/8** |
| 9 blocks use `IconPicker` | **13** (so the DB under-count is 2-of-13 = 85%, not 78%) |
| 17 stylesheets with the guard | **16** files, 0 live |
| `RadioControl` 2-option: "ZERO instances" | **1** (`heading/edit.js:281`) — judgement survives, evidence was false |
| `SelectControl` de facto standard, 68 files | **82** |
| 32 unlabelled controls | **42** total / **30** inside responsive wrappers — **12 sit OUTSIDE any wrapper, so "5 shared-file fixes clear the lot" is FALSE** |
| `DesignTokenPicker` reach ~90 | **214 instances / 48 files / 43 blocks** — larger than stated |
| 14-slug denylist "inside a universal extension" | It is in **`scripts/check-universal-fit.js:146`**, NOT `animation.js` (whose denylist was removed 2026-07-19; it holds a 4-entry ALLOW-list). The contract inherited the gate's own stale comment about itself. |

### D. Scope errors
- **S1 (worst): no scoping axis can select the universal-extension surface, and FOUR contracts need
  one.** `hover-effects.js` registers **13 `sgsHover*` attrs onto 67 blocks** via a filter —
  invisible to `block_attributes` by construction. STATE's "23 blocks, 3 conform" is therefore a
  ~12× undercount of the very shape it bans. The contract makes this argument for LINK and fails
  to generalise it. Same file, four contracts.
- **S2:** `LayoutPanel` reaches **17** blocks, not 13 — five mount it directly, bypassing the
  `kind="layout"` scan. 14 of them declare no `layout` enum.
- **S3:** `IconPicker` is **13** blocks / 15 sites, not 9 — so "9/9 conform" asserts over a set
  4 blocks short.
- **S4:** the extension placement fix is **8 files / 9 mounts**, not 6. `responsive-visibility.js`
  owns NO panel (its toggles render from `conditional-visibility.js:343`), so an opt-out for it
  would remove no sidebar row — the stated rationale fails.
- **S5:** `inspector_control_type` is declared untrustworthy, then FOUR clauses depend on it
  unflagged (BOOLEAN §1/§6, FREE-TEXT §2/§6 — "recorded control" IS that column).
- **S6:** `check-simple-surface-cap.js` is a further unwired gate; and §10's reshape proposals
  would invalidate `lint-responsive-controls.py`, a WIRED prebuild gate naming `ResponsiveControl`
  + `ResponsiveOverride` as the two sanctioned primitives.
- **Condition 20 is carried in a form the spec FORBIDS.** Tier 4's "23 pattern templateLock"
  reinstates a framework-wide backlog D402 closed — `templateLock:"contentOnly"` is per-client
  opt-in, "never framework patterns". This is the one place the contract ADDS wrong scope.

### E. The fourth quadrant is REAL and LARGER — 53, not ~45
Proven by RUNNING `check-dead-controls.js` CHECK 4: it reports 3 dead attrs and sees **none** of
the 53. Composition differs from the summary rows — use the per-attribute audit, not the totals:
hover **31 across 9 blocks** (`sgs/gallery` is a missed 9th — `grayscaleHover`, `shadowHover`
stranded) · typography **10, not 12** (`sgs/text` already has working line-height tier controls at
`edit.js:352-353`) · `physics-canvas` **8, not 6** · `heading`/`text` shadow **4**, exact.
⚠ **Two traps for the Tier 3 rule, both walked into during the audit:** literal-name matching
MISSES `brand-strip` (tier keys built dynamically in PHP at `helpers-typography.php:90,98`) and
FALSE-POSITIVES on `fontSizeTablet` (built by computed key in JS) — nearly 54 false findings.

### F. Types that skip the eight-field shape are exactly where lookalikes went unenumerated
§10 carries 3/8 fields for ICON, 3/8 for SHADOW, **0/8** for RESPONSIVE WRAPPERS. Consequence: a
preset `SelectControl` on a shadow attr reaching 67 blocks via `hover-effects.js` is unlisted; a
preset `SelectControl` on `minHeight` (5 sites) fits no contract; raw `BoxControl` (5 sites),
`BorderRadiusControl`, `SpacingControl` (9 sites), `DeviceTabs`, `AnimationControl`,
`ComboboxControl`, `FormTokenField`, `FocalPointPicker` and the repeater editors have no home.

### G. Open question raised by Bean, 2026-08-07 — NOT yet assessed
**Should `sgsCustomCss` be retired in favour of WP 7.0's native per-block Additional CSS?** The
two write to DIFFERENT attributes (`attributes.style.css` vs `attributes.sgsCustomCss`, proven
live 2026-08-03), which is why the native support is currently DISABLED rather than adopted. A
migration is possible in principle — retarget `includes/custom-css.php` + the converter's
residual-band passthrough to read `style.css`, then delete the extension entirely — and it is
exactly what dropped **condition 16 (native over hand-rolled)** exists to prompt. Touches the
cloning pipeline, so it needs a Rule 7 design gate. Recorded here so it stops being invisible.

### H. Proposals needing a Rule 7 design gate that this contract failed to mark
6 extension `group` props (84 blocks) · `hover-effects.js` block-link removal (67 blocks, and it
removes a client capability) · `DesignTokenPicker` id (43 blocks) · `ResponsiveControl` +
`ResponsiveOverride` label change (both shared; the latter is Spec 37 FR-37-16's switcher) ·
renaming `ResponsiveBoxControls` (severs `check-dead-controls` prop-name bindings) · deleting
`ResponsiveControl`'s inherit API (**a Spec 35 T1.2 deliverable, shipped intentionally with zero
callers — not dead code**) · folding `showAlt` into `MediaPicker` (9 consumers) · `isCollectionKind`
(84 blocks) · wiring `lint:js` into `prebuild` against an 11,932-error backlog (**breaches E6
point 9: advisory first, fail-closed only at zero backlog**).

### I. Also refuted
- `ResponsiveTriStateControl` vs `BooleanResponsiveControl` are **not** an accidental fork — the
  latter's header states the shape incompatibility IS the reason both exist, and the promotion
  check the contract proposes "sharpening" was already performed and documented.
- `responsive-logo` is **not** an open question — D490 prescribed the direction and the block.json
  half already landed (`12931409`); only the editor half is outstanding.
- `check-dead-controls.js` has **five** checks, not four (CHECK 5 = dead assignment). The
  fourth-quadrant conclusion is unaffected.

---

# Spec 35 — the control-type contract

## Why this replaces the 27 end conditions

Bean's ruling, 2026-08-07: *"those bugs are exactly the things that need rules to protect against,
we should have a fixed shape for each control type… As long as the rule is very clear which
category it applies to then it's great."*

The 27 flat conditions failed structurally. Each condition described one desired property of one
control, so each rule got written against **the one component its author had in mind** — and every
defect that arrived under a different component name walked straight past it. Proven, not asserted:

| Gate | Matches | Walked past it |
|---|---|---|
| `04-colour-alpha` | `ColorPalette`/`ColorGradientControl`/`GradientPicker`/`PanelColorGradientSettings` | `sgs/star-rating`'s `<TextControl type="color">`; `GradientOverlayControl`'s raw `GradientPicker` reaching 4 blocks indirectly |
| `08-raw-url-link` | `<TextControl type="url">` | `sgs/button`'s `<URLInput>`; `extensions/hover-effects.js`'s raw URL field on ~82 blocks |
| `07-preset-only-shadow` | `SelectControl` with a shadow-ish label | `sgs/quote` + `sgs/media` asking clients to hand-type raw CSS |
| `20-pattern-template-lock` | theme pattern files | the BLOCK-side `templateLock` that silently deleted a stored child |

**The consequence that matters most:** rule 08 went 40→0, and Spec 35 Part M recorded
*"Wave 1 — DONE. `SgsLinkControl` migrated across all raw-URL fields."* The zero was true of what
the gate could see. The doc turned it into a claim about the world.

A contract fixes this by making **banned lookalikes an enumerated field**. You cannot write the
contract without answering "what else in this tree does this same job under another name?"

## How to read a contract

Every control type below declares the same eight fields. A block satisfies the contract for a type
when it is in that type's **scope** and uses the **canonical component** with the **required props**,
in the **correct tab**, and contains none of the **banned lookalikes**.

---

## The scoping axes (machine-readable — never a hardcoded block list, per R-31-1)

Denominator is always **84** (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`).

| Axis | Source | Split |
|---|---|---|
| `surfaces.colour` | roster.json | 64 |
| `surfaces.styling` | roster.json | 65 |
| `surfaces.media` | roster.json | 30 |
| `surfaces.animation` | roster.json | 21 — **the proven precedent**, used by rule 17 |
| `surfaces.link` | roster.json | 16 (over- AND under-inclusive — see LINK §5) |
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

**Bean's own suggested categories all map to real axes.** Three corrections:
- **"Section" is three distinct axes**, not one — `tier='class-section'` (4), `container_kind='section'`
  (6), `composition_role='section-root'` (8). Each contract must say which it means.
- **"Blocks with text" routes via `role`, not typography supports.** Both give 65, but they are
  *different sets* overlapping by only 49 — `sgs/decorative-image` holds client-editable alt/caption
  text with no typography support; `sgs/container` and `sgs/icon` have the support and no text.
- **Dynamic-vs-static is useless** — 84/0. Every SGS block is dynamic.

### ⛔ DB columns that are NOT trustworthy as gate inputs (all four measured 2026-08-07)

1. **`inspector_control_type`** — says `TextControl` for `sgs/icon.linkUrl` and `sgs/media.linkUrl`;
   both use `SgsLinkControl` (icon/edit.js:231, media/edit.js:734). Missed `sgs/button`'s `URLInput`
   entirely.
   **ROOT CAUSE (council, 2026-08-07): `_KNOWN_CONTROLS` at
   `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py:2436-2441` is a hardcoded
   16-name tuple containing ZERO custom SGS components** — no `SgsLinkControl`, `URLInput`,
   `IconPicker`, `ShadowControl`, `StateToggleControl`, `TypographyControls`, `ResponsiveBoxControl`,
   `ResponsiveOverride`. An unrecognised tag yields no candidate, so no disagreement, so no write —
   and the stale value (a fossil of the `enrich-db.py` heuristic deleted 2026-07-21) survives
   forever. The single writer is otherwise healthy: it UPDATEs on disagreement and re-runs every
   `/sgs-update`. **This is the SAME defect class as the gates it feeds** — matching controls by
   component NAME rather than by what they do — and it is an R-31-1 hardcoded-dict breach inside the
   data layer. Fix: extend the tuple, re-run Stage 1.
   ⚠ Measure this on the LIVE tree: `.claude/worktrees/` holds **10** stale copies of this file with
   identical paths and plausible contents.
2. **`box_family`** — **7** genuinely NULL *object*-typed attrs with live BoxControls:
   `card-grid.cardBorderWidth`, `mega-panel.panelPadding`, `nav-drawer.drawerPadding`,
   `site-header-row.padding`/`margin`, `site-footer-row.padding`/`margin`.
   ⛔ **`mega-panel.borderRadius` was a FALSE POSITIVE in the first draft of this contract** — it is
   `attr_type='string'`, a single scalar radius edited by a plain `UnitControl`. `box_family` scopes
   to 4-side/4-corner OBJECT attrs, so NULL is correct there, as it is for every other scalar radius
   (`card-grid.cardRadius`, `nav-menu.itemRadius`, `mega-aside.asideRadius`). Root cause of the
   error: the list was compiled by reading `edit.js` instead of checking `attr_type` in the DB.
   **Cause is class (d), not a broken mechanism** — `_collect_boxfamily_overrides()` reads
   `supports.sgs.boxFamilies` from block.json and is idempotent; VERIFIED that none of the 5 blocks
   declares that key. Fix is block.json edits, not a script change.
3. **`role LIKE 'icon-%'`** — tags 2 blocks; `IconPicker` is used by 9. A 78% under-count.
4. **`block_capabilities`** — TWO different problems under one table name (council, 2026-08-07):
   - **The 3 "lift" capabilities** (`scalar-content-lift`, `scalar-styling-lift`,
     `array-content-lift`) are class (d) — read declaratively from `supports.sgs.*` in block.json,
     written idempotently, mechanism healthy. `sgs/testimonial-slider` and `sgs/content-collection`
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

## 1. COLOUR

1. **Canonical** — `src/components/DesignTokenPicker.js`. No competitor exists.
2. **Required props** — `label`, `value`, `onChange`. `enableAlpha` and `clearable` already
   **default true** (lines 55, 57), so condition 4 was satisfied by construction, not by call sites.
   `linked` only when the value should track a theme slug (D288). **`id` is REQUIRED and missing** —
   line 86 passes `label` to `BaseControl` with no `id`, so every colour control in the framework is
   unnamed to a screen reader.
3. **Banned lookalikes** — `ColorPalette`/`ColorGradientControl`/`GradientPicker`/
   `PanelColorGradientSettings`; `<TextControl type="color">` (`star-rating/edit.js:155-168`);
   raw `GradientPicker` inside `GradientOverlayControl.js:191`, reaching `container`, `hero`,
   `trust-bar`, `cta-section` indirectly.
4. **Tab** — `group="color"` → Styles, mirroring native `supports.color`. Measured: 37/41 in
   Settings, 3 Styles, 1 explicit settings.
5. **Scope** — eligibility `surfaces.colour` (64); detection target `role='color'` (50 blocks,
   261 rows). The 14-block gap is a DB-completeness issue, not a control gap.
6. **Conformance** — 49/50 conform. `sgs/star-rating` violates.
7. **Detection** — extend `inspector-scan/core/components.js` with a `writesColour` flag derived
   from each component's own source, exactly as `wrapsImage` already works for rule 18. This
   resolves indirect/shared-component cases transitively and catches lookalikes by semantic.
8. **Open** — do gradient stops fall under this contract or their own? Settings vs native
   `group="color"`?

## 2. LINK

1. **Canonical** — `src/components/SgsLinkControl.js`. Two modes: object (url + newTab + rel) and
   `searchOnly` (bare string).
2. **Required props** — `label`, `value`, `onChange`, optional `searchOnly`. **`id` REQUIRED and
   missing** (line 153).
3. **Banned lookalikes** — `<TextControl type="url">`; **`<URLInput>`** (`button/edit.js:311`, plus
   a separate `SelectControl` for target and `TextControl` for rel — three raw controls doing one
   component's job); **`extensions/hover-effects.js:388` raw URL field injected into ~82 blocks**.
4. **Tab** — `settings`. Placement is already consistent; **component choice is the live problem.**
5. **Scope** — `surfaces.link` (16) is both over- and under-inclusive: 9 of the 16 match on a media
   URL or a colour token; 6 blocks with genuine repeater-item links are invisible because
   `build-roster.py` only scans top-level attr names. **True denominator: 14 blocks with a
   navigational link field, plus the ~82-block extension surface which no block-scoped axis can see.**
6. **Conformance** — 10 conform. Violators: `sgs/button`, ~82 via the extension, 2 baselined.
7. **Detection** — add `<URLInput>` to the matcher (one line), and **extend rule 08's file set beyond
   per-block `edit.js` to `src/blocks/extensions/*.js`**. That alone would have caught the 82.
8. **Open** — is `google-reviews.reviewRequestUrl` genuinely config, or a link a visitor follows?
   Does `whatsapp-cta.phoneNumber` deserve its own PHONE contract?

## 3. ENUM / MODE

1. **Canonical** — no shared component. `SelectControl` over a **declared `block.json` enum** is the
   de facto standard (68 files); `ToggleGroupControl` for short option sets (14 files) — **the
   threshold is nowhere written down, so it cannot yet be gated.**
2. **Required props** — `value` bound to the attr; `options` matching the declared `enum` **exactly**.
3. **Banned lookalikes** — (a) a shared aggregator offering options outside the consuming block's
   enum; (b) a PHP-enforced closed set with no `block.json` enum (free-text box, no validation).
4. **Tab** — `settings`, explicitly, not by relying on the default.
5. **Scope** — 284 rows with declared enums; 1,372 string rows are the search space, not the
   violator count.
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

## 4. LENGTH / UNIT

1. **Canonical** — `<ResponsiveControl>` wrapping `<UnitControl>` with a real `units` array
   (R-22-13). Object-cascade blocks use `<ResponsiveOverride>` instead. Do not blend the two.
2. **Required props** — real `units`, never px-only. Responsive wrapping REQUIRED when the attr
   family declares Tablet/Mobile siblings. **Label association REQUIRED and missing** — see §10.
3. **Banned lookalikes** — raw-px `RangeControl` (**0 live violations found** — the only hits are the
   shadow builder's sliders, which are correct); `SelectControl` writing a `*Unit` attr (already
   gated); a `TextControl` standing in for `UnitControl` — `sgs/card-grid.cardRadius`, help text
   *"e.g. 8px"*, accepts invalid CSS.
4. **Tab** — `typography` for font-size/line-height, `dimensions` for spacing, `layout` for grid
   geometry. All Styles.
5. **Scope** — `is_responsive=1 AND css_property IN (<length set>)` → 36 blocks.
6. **Conformance** — the `TypographyControls` consumers conform. Violators: `cardRadius`; 79 of 85
   blocks with no tab split; **12 attributes declared + rendered with no control** (below).
7. **Detection** — join `css_property` against a length allowlist, then assert the innermost control
   is a `UnitControl`.
8. **Open** — spacing-token scale is unbuilt; does the contract require it once it exists?

## 5. 4-VALUE BOX

1. **Canonical** — `ResponsiveBoxControl` (4 sides) / `ResponsiveBorderRadiusControl` (4 corners);
   `ResponsiveBoxControls` (plural) for object-cascade rows.
2. **Required props** — `values` per tier, `onChange(tier, next)`, real `units`.
3. **Banned lookalikes** — per-side scalars (**migration COMPLETE — 0 remaining**); regex side-token
   grouping in the converter (already gated, converter-side only — nothing guards editor code).
4. **Tab** — `dimensions` (padding/margin) / `border` (width, radius). Styles.
5. **Scope** — reconciled to **51 blocks** (46 DB-classified ∪ 48 grep-matched, 43 overlap). The
   discrepancy resolved: `before-after`/`media` use `ResponsiveBorderRadiusControl` (no "BoxControl"
   substring); 5 blocks have live box controls with `box_family` NULL.
6. **Conformance** — 43 conform. **`sgs/physics-canvas` declares 6 responsive box attrs, passes them
   to `SGS_Container_Wrapper`, which renders them — and its `edit.js` contains "padding" zero times.**
7. **Detection** — must NOT rely on `box_family` alone (it under-populates); add a code-derived
   cross-check on the attr's object shape.
8. **Open** — backfill the 6 orphan attrs? Rename the singular/plural pair?

## 6. STATE / HOVER

1. **Canonical** — `src/components/StateToggleControl.js`. **Verified adoptable today** — it already
   hosts a mixed group (colour + UnitControl + SelectControl) under one toggle in
   `nav-menu/edit.js:1407-1545`. No extension needed. `states` is a prop, not hardcoded.
2. **Required props** — one toggle per logical attr GROUP, not per attribute; the render-prop must
   cover **every** paired attr in both states.
3. **Banned lookalikes** — a separate "Hover" panel (7 blocks; `post-grid`'s is 145 lines from its
   base panel); adjacent "X" and "X (hover)" controls (3 blocks); **a `*Hover` attr with no control
   at all (8 blocks, ~27 attrs)**; preset-only reachability (`product-card`).
4. **Placement** — the state value sits **inside the same control group as its base value**. This is
   how `theme.json` nests pseudo-states under the element, and how the block's own PHP helpers
   already build `:hover` from the same `$prefix`.
5. **Scope** — `attr_name LIKE '%Hover%' OR css_state IN ('hover','selected')`, excluding
   `sgs/mega-panel.accent` (a colour-scheme picker, mistagged). **23 blocks; 3 conform, 20 do not.**
   ⚠ Use `%Hover%`, not `%Hover` — the suffix form misses `business-info.linkHoverColour`.
   ⚠ `trust-bar.autoScrollPauseOnHover` and `team-member.overlayHover` are **behavioural flags, not
   state pairs** — a name-only rule false-positives on both.
   ⚠ `table-of-contents.activeLinkColour` is a genuine `selected` state that **name-matching cannot
   find**. A new semantically-named state with `css_state` NULL would be invisible to every method here.
6. **Conformance** — conform: `brand-strip`, `button`, `nav-menu`.
7. **Detection** — three separate rules, not one: `state-attr-no-toggle`, `state-attr-unreachable`,
   `state-attr-preset-only` (park the third — one instance cannot prove the shape, per R-31-9).
8. **RESOLVED, not open — migration needs ZERO schema change.** Every attr already exists with its
   current type; `StateToggleControl` is a presentational wrapper reading/writing the same keys. No
   version bump, no deprecation. Consistent with D293/D270.

## 7. MEDIA

1. **Canonical** — `src/components/MediaPicker.js` (9 consumers) + `MediaGalleryPicker` for bulk.
   ⚠ `MediaPicker` is **not barrel-exported**; all 9 consumers import by path.
2. **Required props** — `MediaUpload` always inside `MediaUploadCheck` (**0 violations — keep the
   gate**); alt text; the D5 tier rules. **A reused picker sub-control renders an optional child only
   when that invocation supplies both `value` and `onChange`** (the `ImagePickerRow` lesson).
3. **Banned lookalikes** — per-tier duplicate pickers instead of one `ResponsiveControl`-wrapped
   picker: `sgs/responsive-logo/edit.js:281-305` renders **three always-visible** logo slots.
4. **Tab** — `settings`; `content` for collection/repeater media (0 SGS blocks currently use
   `group="content"`).
5. **Scope** — `surfaces.media` (30) is the eligible pool. The 15 blocks declaring
   `supports.sgs.imageControls` are a **conformance subset, not the pool**. Rule 18's own
   `wrapsImage` resolution is MORE precise than the DB proxy — do not regress it.
6. **Conformance — the D521 rollout landed cleanly on 6 of 7.** Tier types match base types
   everywhere; zero blocks tiered their alt text. `responsive-logo` is the exception (predates D521
   by two days).
7. **Detection** — two D5 clauses are checkable from `block.json` alone: **tier/base type mismatch**
   and **alt-role attr with a Tablet/Mobile suffix**. Neither exists as a rule. The video-swap
   return path and per-width paint need the live first-paint capture bar.
8. **Open** — retrofit `responsive-logo`? Fold `showAlt` into `MediaPicker` and retire the local copy?

## 8. BOOLEAN

1. **Canonical** — `ToggleControl` (160 of 163 controlled boolean rows) for enable/disable;
   `ToggleGroupControl` when the states are **named alternatives** (`overlayGradient` → "Solid /
   Gradient" is CORRECT, not a violation); `CheckboxControl` **only** for a boolean scoped to one
   item in a repeated list (all 8 uses verified correct).
2. **Required props** — `label`; `__nextHasNoMarginBottom` on only **79/162** instances.
3. **Banned lookalikes** — a 2-option `SelectControl` driving a boolean (3 DB rows); a
   `RadioControl` with two options (**checked — ZERO live instances**); literal "On/Off" toggle
   groups (**none found**).
4. **Tab** — behaviour → Settings; appearance → Styles. This discriminator is the contract.
5. **Scope** — 252 boolean rows.
6. **Conformance** — 89 boolean rows have no recorded control. **Not asserted as defects** — needs
   per-row triage.
7. **Detection** — classify the component bound to each boolean attr; `ToggleGroupControl` writing a
   literal boolean is a *candidate*, not a violation.
8. **Open** — whether a 2-option group reads as enable/disable or as alternatives is a label
   judgement, not an AST fact. Advisory only.

## 9. FREE TEXT / BARE NUMBER

1. **Canonical** — `TextControl` for short single-line config; `TextareaControl` for long-form;
   `NumberControl` for unbounded or precision-typed numbers; `RangeControl` for coarse bounded
   values. **A number with a CSS unit is a LENGTH, not a bare number.**
2. **Required props** — `__next40pxDefaultSize` is on **1 of 162** `TextControl`s and **0 of 8**
   `NumberControl`s.
3. **Banned lookalikes** — free text where a closed set exists (→ ENUM); free text driving a colour
   (`star-rating`) or typography (7 rows); `product-card.ctaFontSize` as a bare unitless
   `NumberControl` — a direct breach of the mandatory `TypographyControls` rule.
4. **Tab** — content/behaviour → Settings; appearance numbers → Styles.
5. **Scope** — 1,654 string rows, 432 number/integer rows.
6. **Conformance** — **the content split is SOUND**: body content lives in-canvas via `RichText`,
   sidebar text fields are genuinely short labels. Validated pattern, not a gap.
   ⚠ **317 number rows have no recorded control** — explicitly NOT asserted as defects; triage needed.
7. **Detection** — cross-reference each control's target attr against `role`/`css_property`.
8. **Open** — retype the string-typed font sizes to number?

## 10. ICON · SHADOW · THE RESPONSIVE WRAPPER FAMILY

**ICON** — canonical `IconPicker`; 9/9 live callers conform (no bespoke pickers). `id` REQUIRED and
missing (line 335). Scope by **live JSX usage, not the DB role** (2 tagged vs 9 real).

**SHADOW** — canonical `ShadowControl` (CSS-string shape). **Real footprint is 17 blocks; rule 07
reports 1.** Violations:
- **`sgs/quote:699` and `sgs/media:685` render a bare `TextControl` asking the client to hand-type
  raw CSS** — media's help text literally says *"A raw CSS box-shadow value, e.g. 0 6px 24px
  rgba(0,0,0,0.15)"*. Direct breach of the framework's own non-negotiable that no setting may
  require touching code. Rule 07 cannot see it — it only inspects `SelectControl`.
- `sgs/button` hand-rolls a genuine builder storing an **object** where the shared component stores
  a string — ~80 duplicated lines, incompatible shape.
- **`sgs/heading` and `sgs/text` declare `boxShadow`/`boxShadowHover`, render them, and have no
  control of any kind** — clone-pipeline-only attrs.
- 6 secondary shadow attrs unverified.
Detection: census `css_property LIKE '%shadow%'` from the DB, then classify each attr's control in
`edit.js` as compliant / raw-text / duplicate-builder / **no-control**. The fourth class is what
rule 07 cannot see by construction.

**RESPONSIVE WRAPPERS — the real finding is three incompatible STORAGE SHAPES, not seven components:**
1. flat per-tier attributes (`{prop}`/`{prop}Tablet`/`{prop}Mobile`) — dominant;
2. one nested `{desktop,tablet,mobile}` object (FR-37-16) — read by
   `sgs_responsive_normalise_object()`, which **has no concept of the `base` key** that
   `ResponsiveBoxControl` uses internally. No live call site crosses them; the landmine is unarmed,
   not disarmed;
3. flat boolean-or-null tiers.
The cascade resolver underneath is genuinely unified (`resolveTier()`, client + PHP). **Do not "fix"
that.** Real issues:
- `ResponsiveControl` ships a complete `isInherited`/`resolvedValue`/`onReset` API with **zero
  callers**, while `ResponsiveOverride` was built separately to solve the same problem and has 8.
- `ResponsiveTriStateControl` and `BooleanResponsiveControl` are the **same capability built twice**
  on incompatible shapes.
- **`ResponsiveOverride.js:78-83` has the same unassociated-label defect as `ResponsiveControl`** —
  previously unflagged. Both need the same fix: a `useInstanceId()` id on the label span plus
  `role="group" aria-labelledby` around the render-prop output (a group association, because the
  child control is caller-supplied and cannot be trusted to label itself).
- `ResponsiveBoxControl` vs `ResponsiveBoxControls` — one letter apart, zero shared code. **Rename
  the plural one.**
- **Sharpen the promotion trigger.** `BooleanResponsiveControl`'s header says "if a THIRD block needs
  this, promote the duplicate." It should say: *check whether an existing component already covers
  this need before promoting a third copy* — otherwise the trigger ships a permanent fork.

---

## Cross-cutting A — PLACEMENT

WordPress has **16 real group keys** (verified against Gutenberg source, not docs — this mapping is
not on developer.wordpress.org). `settings` is a hard alias of `default`. `advanced` renders as a
panel *inside* Settings, not its own tab. `content` and `list` map to their own tabs.

**The definitive tab assignment is the "Tab" field of each contract above.**

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

## Cross-cutting B — UNIVERSAL EXTENSION FIT

**Correction to an earlier claim in this investigation:** `noOptOutExtensions` is `[]` today.
Animation's opt-out landed 2026-07-19. The three remaining without one are self-classified
utilities. The script's own file header still describes the old state and is stale.

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

**Proposed fit rule (DB-derived, R-31-1 compliant):**
```
isCollectionKind(block) =
  capability IN ('array-content-lift','carousel','grid-layout','logo-strip')
  OR has a block_attributes row with attr_type='array' AND role='content'
```
Fire it for **Block Link** specifically. ⚠ **Prerequisite:** re-derive `block_capabilities` first —
`sgs/gallery` carries zero tags today, as do `testimonial-slider`, `post-grid`, `content-collection`.

⛔ **CORRECTED:** the hardcoded 14-slug denylist is **not** in `animation.js` — it is at
**`scripts/check-universal-fit.js:146`**, i.e. inside the AUDIT GATE, not the extension.
`animation.js:44` holds only `CORE_ANIMATION_BLOCKS`, a 4-entry ALLOW-list, and its docblock records
that the per-block denylist was **removed 2026-07-19** in favour of declarative `hideExtensions`.
The contract inherited the gate's own stale comment (line 143) about where the list lives. The count
14 is right; the file, the severity and the remediation target were all wrong. The R-31-1 concern
still stands — but against the gate, and alongside the 4-slug allow-list nobody has looked at.

---

## The defect register — what is broken right now

### The fourth quadrant: declared + rendered + NO CONTROL
`check-dead-controls.js` has FIVE checks (CHECK 5 = dead assignment), covering control-without-render
and neither-nor. **Render-without-control is unguarded — proven by RUNNING CHECK 4: it reports 3 dead
attrs and sees none of the 53 below.** 53 attributes the framework paints that no client can set:

| Where | Attrs |
|---|---|
| Hover values across **9** blocks (⚠ incl. `sgs/gallery` — `grayscaleHover`, `shadowHover`) | **31** |
| `lineHeight`/`letterSpacing` tiers (`button` 4, `brand-strip` 4, `text` 2) | **10** |
| `sgs/physics-canvas` box attrs (no base `padding`/`margin` declared at all) | **8** |
| `heading`/`text` boxShadow + boxShadowHover | 4 |

⚠ `card-grid.effectHover` was tested as a possible preset reaching the others — it is not; it only
emits a CSS class while `scaleHover`/`grayscaleHover` are read independently. Genuinely unreachable.

### Client-facing, worst first
1. `quote` + `media` ask a tech-illiterate client to hand-type raw CSS.
2. `testimonial-slider` + `post-grid` Layout controls silently revert on reload.
3. ~~`feature-grid` Layout control is discarded server-side.~~ **WITHDRAWN — this is D270, a
   live-verified fix, not a defect. See §B2.**
4. `responsive-logo` shows three always-visible upload buttons (⚠ not an open question — D490
   decided the direction; only the editor half is outstanding).
5. **67** blocks carry a "make this whole block one link" field.
6. **23** blocks open 2+ panels at once (21 under the stricter per-tab reading).

### Accessibility — 5 shared files cover 30 of 42; **12 need per-site fixes**
`DesignTokenPicker:86` · `SgsLinkControl:153` · `IconPicker:335` · `ShadowControl:126` (all
`BaseControl` + `label` + no `id`), plus `ResponsiveControl:150-170` and `ResponsiveOverride:78-83`
(unassociated label span → 32 unnamed controls).

### The lint layer that has never run
`.eslintrc.js` extends `@wordpress/eslint-plugin/recommended`; `lint:js` exists; `prebuild` never
calls it. **11,932 errors.** Net of formatting: 111 unsafe experimental API imports, the 4
`BaseControl` a11y defects, 20 `jsx-a11y` label issues, 23 i18n issues, one genuine conditional-hook
bug. Bumping 22.22.0 → 24.4.0 is a drop-in (do NOT go to 25.x — needs ESLint 9 + flat config).

### Gates built and wired to nothing
`check-universal-fit.js` · `check-duplicate-controls.js` · `audit-block-file-consistency.py` ·
`audit-block-uniformity.py` · `lint:js`. Zero references in `package.json` each.

### Docs that assert more than the gates proved
- Spec 35 Part M — *"Wave 1 DONE, migrated across all raw-URL fields"*. Two whole classes were never
  in the gate's scope.
- Spec 35 Part N.3 — still carries the dead *"0 of 24 end conditions"* figure.
- Root `CLAUDE.md:238` **mandates** `:not([style*="color"])`; `plugins/sgs-blocks/CLAUDE.md:218`
  **forbids** it with measured evidence of invisible text at 1:1 contrast. 17 stylesheets carry it.
- `inspector-scan/run.js:6-10` says "NOT wired into prebuild yet" — it IS wired, non-gating.
- `check-universal-fit.js:35-52` describes four extensions as lacking opt-outs — no longer true.

### Not in the 27, and never transcribed
- **Spec 35 Part N.2** — 11 rules (N-1…N-11) added 2026-08-06, addressed to Task F by name.
- **Spec 35 Part D5** — the art-direction pattern + 7 traps, added 2026-08-07.
- **Part D4** — "do not introduce a second inheritance mechanism".

---

## Enforcement plan

### ⛔ Tier 0 — FIX THE DATA LAYER FIRST (Bean-ruled 2026-08-07)

**Nothing in Tiers 1–4 may be built until the categorisation is accurate.** Every contract above
scopes its rule to a machine-readable axis, and four of those axes are measurably wrong (see "DB
columns that are NOT trustworthy"). A rule built on a wrong axis is worse than no rule: it reads
green while silently passing the very blocks it exists to catch.

The clearest case is Bean's own worked example. The fix for a gallery being offered a
"make the whole block one link" control is an `isCollectionKind()` test reading
`block_capabilities`. `sgs/gallery` carries **zero** capability rows. Build the rule first and it
passes gallery in silence — the exact failure this whole contract exists to end.

Work: repair the `/sgs-update` derivations for `inspector_control_type` (stale — never recomputed
after Wave 1), `box_family` (6 orphans), icon `role` (2 tagged vs 9 real), `block_capabilities`
(collections untagged). Each needs its root cause established first — wrong derivation vs
never-runs vs insert-only-never-updates vs missing source data are four different fixes.

⚠ **A shared-DB reseed is a cross-track action.** Back up first, diff the result, and check every
pruned row against its source before calling a drop damage — 33 pruned rows in a past session were
all legitimate.

### Tier 1 — shared-file fixes (one file, many blocks) — FIGURES COUNCIL-CORRECTED

⛔ Every item here is a shared-mechanism change and needs a **Rule 7 design gate** (see §H).

`hover-effects.js` block-link → **67** blocks (not 82) · `DesignTokenPicker` id → **214 instances
across 43 blocks** (not ~90) · `ResponsiveControl` + `ResponsiveOverride` labels → **30** of the 42
unlabelled controls (**12 more sit outside any wrapper and need per-site fixes — this tier does NOT
clear them all**) · `ContainerWrapperControls` layout options → **17** mount sites (not 13) ·
`typographyAttrKeys` tiers → **10** attrs (not 12; `sgs/text`'s line-height tiers already work) ·
**8** extension files / 9 mounts for `group` props (not 6) → all 84.

**Tier 2 — wire what exists.** `lint:js` into `prebuild` (after one `npm run format` + an allowlist
for intentional experimental APIs); the 4 dead gates, advisory first per `rules.json` policy.

**Tier 3 — new rules, advisory first, each with a `--self-test` that fails on a seeded break
(E6, 10 points).** Render-without-control (the fourth quadrant) · semantic colour/link/shadow
lookalike detection via `core/components.js` flags · D5 tier-type match + alt-not-tiered · enum ⊆
picker options, both directions · state-attr-no-toggle · default-open discipline.

**Tier 4 — per-block remediation.** 66 tab routing · 20 state migrations · 15 dense panels.
⛔ **"23 pattern templateLock" REMOVED** — D402 (Bean-approved) rules `templateLock:"contentOnly"`
**per-client opt-in only, "never framework patterns"**, which is why `rules.json` keeps rule 20 at
`advisory`. Listing it as a backlog reinstated scope the governing spec had closed.

*(The former "Tier 5 — data" was promoted to **Tier 0** above on Bean's ruling, 2026-08-07: the
categorisation must be accurate before anything is scoped against it.)*

**Acceptance is unchanged from Task F and still binds:** every contract clause either has a script
whose `--self-test` demonstrably fails on a seeded break, or is recorded as unenforceable with a
stated reason. A count of scripts written is not acceptance.
