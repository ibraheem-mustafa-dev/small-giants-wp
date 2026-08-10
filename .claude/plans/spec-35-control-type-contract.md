---
doc_type: reference
title: Spec 35 — the CONTROL-TYPE CONTRACT (replaces the 27 end conditions)
status: AUTHORITATIVE (2026-08-08) — council findings A/B/C/D/F discharged; G/H open by design
created: 2026-08-07
updated: 2026-08-08
amended: |
  2026-08-08 (Phase 0 of the element-driven inspector design) — PLACEMENT amended from
  "behaviour → Settings; appearance → Styles" to the element-scoped model. New §"THE PLACEMENT
  RULE" governs every `Tab` field; §"THE ELEMENT MANIFEST" is now the schema of record (adds
  `contentAttrs`); CO-2 rewritten; §8/§9 field 4, CO-28's hard-dependency box and Cross-cutting A
  updated; the "§6 field 4" miscitation corrected to §8. Sibling edits: spec 35 A3/A4,
  check-element-manifest-conformance.js docblock.
  2026-08-09 (D537, Bean-locked) — PLACEMENT is now explicitly TWO TIERS. Tier 1 (unchanged):
  one panel per declared element. Tier 2 (new): WITHIN a panel, and for every control that scopes
  to no element, controls group by PROPERTY-FAMILY (text / fill / layout / position / motion /
  animation — the families already defined in `scripts/consistency/cluster-member-sets.json`, not
  invented here), resolved via each element's declared `clusters` and honouring `appliesToLayers`.
  A control that styles NOTHING (`variant`, `templateMode`, `tagName`, `layout`, `autoplay`,
  `showDots`, `required` — no CSS property behind it) takes one `Settings` panel, pinned first.
  This retires the earlier framing that block-root/no-element controls needed a single
  catch-all "block-level panel" still to be designed — they resolve to a property-family panel by
  declaration, same as element panels do. §8/§9 field 4 and Cross-cutting A's "Tab field picks the
  WordPress group" language are corrected below; the per-contract `Tab` field is now subordinate
  to BOTH tiers, not just tier 1.
governs: the universal block-inspector control surface (Spec 35)
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
supersedes: .claude/plans/spec-35-inspector-DONE-checklist.md (the 27 end conditions + T1/T2/T3) —
  superseded 2026-08-08 once every one of the 30 was ABSORBED into a control-type contract or
  CARRIED verbatim into §CARRIED OBLIGATIONS. The ABSORPTION MAP is the proof; nothing was dropped.
---

## ⛔ COUNCIL VERDICT (qc-council, 4 raters, 2026-08-07) — READ BEFORE ACTING

> ### ✅ DISCHARGE RECORD — 2026-08-08
> The verdict below is **kept in full and unedited**. It is the record of what this document got
> wrong and must not be tidied away; a corrected figure with its correction deleted is just another
> unsourced number. What has since been done:
>
> | Finding | Status |
> |---|---|
> | **A** — 10 conditions + T1/T2/T3 silently dropped | ✅ **DISCHARGED** — restored in §CARRIED OBLIGATIONS; §14 BORDER created for condition 7's dropped half; the ABSORPTION MAP accounts for all 30 |
> | **B** — 3 proposals contradict the record | ✅ **DISCHARGED** — all three withdrawn in the body (`customCss`, `feature-grid`/D270, the 17-stylesheet claim) |
> | **C** — 11 figures wrong | ✅ **DISCHARGED** — corrected at each body site, not only in this table |
> | **D/S1** — no axis sees the universal-extension surface | ✅ **DISCHARGED** — EXTENSION SURFACE axis added and generalised to all four contracts that need it |
> | **D/S2, S3, S4** — undercounted scopes | ✅ **DISCHARGED** in body (17 LayoutPanel · 13 IconPicker · 8 files/9 mounts) |
> | **D/S5** — 4 clauses depend on an untrustworthy column | ✅ **DISCHARGED** by **D523** — `inspector_control_type` is now trustworthy; the façade residual is stated |
> | **D/S6** — reshape would invalidate a wired gate | ✅ **DISCHARGED** — §12 field 1 names `lint-responsive-controls.py` as binding |
> | **D** — condition 20 carried in a form the spec forbids | ✅ **DISCHARGED** — CO-20 carries the D402 per-client form; Tier 4 entry removed |
> | **E** — fourth quadrant is 53, not ~45 | ✅ Figures already correct in body; the two matching traps are recorded in §12 field 5 |
> | **F** — types skipping the eight-field shape | ✅ **DISCHARGED** — ICON/SHADOW/RESPONSIVE now carry 8/8 as §10/§11/§12; §13 enumerates every remaining homeless shape |
> | **G** — Bean's `sgsCustomCss` question | ⏳ **OPEN by design** — a Rule 7 design gate, and CO-16 is what keeps raising it |
> | **H** — proposals needing a design gate | ⏳ **OPEN** — marked in place; none may be built from this document |
> | **I** — refuted claims | ✅ Recorded in the affected contracts |
>
> ⛔ **Still true and still binding: NOTHING in Tiers 1–4 may be built for a rule scoped against
> `block_capabilities` or icon `role`.** Those two Tier 0 columns remain wrong. See §Tier 0.

~~**This document is NOT yet a replacement for the 27-condition checklist. Do not tombstone that
file.**~~ **Superseded 2026-08-08 — see the discharge record above.** *Do not build from this
document's figures without checking the corrections below.*

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
  one.** `hover-effects.js` registers **11 literal `sgsHover*` attrs (19 `sgs*` attrs in total) onto 67 blocks** via a filter —
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

### G. ✅ ANSWERED 2026-08-08 (D526) — NO. Keep `sgsCustomCss`. Do not re-open.

**WP 7.0's native per-block CSS cannot do this job. Two independent blockers, both read from
`wp-includes/` on the live canary — not inferred:**

1. **Specificity.** `WP_Theme_JSON::process_blocks_custom_css()` wraps EVERY branch — root-level and
   nested — as `:root :where(<selector>)`. `:where()` contributes zero, so every native rule lands at
   **0,1,0**. An SGS block paints its own per-instance styling at **0,2,0**
   (`.uid.block-class`), and the residual band exists precisely to OVERRIDE that. 0,1,0 can never
   beat 0,2,0, and there is no branch in that function that escapes the `:where()` wrapper.
   Weakness is the design intent of the native feature.
2. **No `@media` support at all.** The processor splits on `&` and emits flat `selector{decls}`
   rules; there is no media-query branch. The residual band is BY DEFINITION `@media`-bounded — that
   is its whole purpose. A residual like
   `@media (min-width: 600px){&selector .sgs-trust-bar__inner{…}}` cannot survive
   `explode('{', str_replace('}','',$part))`, and is dropped **silently**.

⚠ Evidence class: a **source read** of WP 7.0 on the canary, NOT an execution — the `wp eval` guard
blocks read-only evals on the command name alone. The function is short and every branch was read.

**Also measured live (348 registered block types, canary editor, 2026-08-08):** the native control is
already disabled everywhere (`supports.customCSS: false`, **0/348** with it enabled) and
`sgsCustomCss` is present on **348/348** — SGS and core alike. There is no block that "lost" the
control, and no per-block opt-out for it exists. `ece1487b` (2026-08-03) **only ADDED** the native
disable; it deleted nothing. The one thing ever written to the native field is `color: red;` on
untitled draft page **2145** — the throwaway proof from that same session. No client work stranded.

⛔ Condition **CO-16** ("check native BEFORE building your own") is therefore SATISFIED for this
control, with the answer recorded. Bean 2026-08-08: keep the box, leave its placement as-is.

### G-original. The question as first raised, 2026-08-07
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
| `08-raw-url-link` | `<TextControl type="url">` | `sgs/button`'s `<URLInput>`; `extensions/hover-effects.js`'s raw URL field on **67** blocks |
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

## ⛔ THE PLACEMENT RULE *(amended 2026-08-08, Bean-locked — replaces "behaviour → Settings"; TWO-TIER structure added 2026-08-09, D537)*

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

**Derived, never hand-sorted.** The source is `supports.sgs.elements` in each `block.json` (**82 of
83** files declare it; 283 elements — 83 is the FILE count, not the declaring count).
Where an element cannot be resolved, the control **stays exactly where it is today**
and the ambiguity is reported — no-worse-than-today is the floor.

**Applies to every state, not just hover.** `states.hover` and `states.selected` both render inline
beside their base value (18 elements declare `hover`, 4 declare `selected`).

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

### Where the tabs go — Bean-decided 2026-08-08

**SGS owns a three-tab bar (Content · Style · Advanced), as Kadence, Spectra and Stackable all do.**
The native Settings/Styles split is not a standard: core has **no** semantic rule for it. Verified in
the Gutenberg source — the Styles tab is a hard-coded list of native block-support categories
(`typography`/`color`/`background`/`border`/`dimensions`/`layout`/`position`/`filter`/`elements`) and
the Settings tab is simply the `default` group, i.e. everything else. There is no principle to apply,
which is exactly why every attempt to apply one produced a different answer.

⛔ **SEQUENCING — the tab bar lands AFTER native-supports retirement (design §5), not before.** While
27 blocks still declare native `color` and 48 declare `__experimentalBorder`, core renders its own
Styles tab regardless of what we do. Shipping our tab bar first gives the client THREE SGS tabs plus
core's Styles tab — strictly worse than today. Native retirement is itself blocked on the background
capability (design §3 / Phase 1). **Phase 1 remains the first build.**

**Until the tab bar ships**, element panels stay in Settings and native supports stay in core's Styles
tab. That is the interim state, not the target, and it is not a rule anyone should extend.

### Why this replaces the old rule

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

**Design of record:** `.claude/plans/2026-08-08-element-driven-inspector-design.md` §2.1, §2.2,
§10.1–10.2.

---

## THE ELEMENT MANIFEST — schema of record *(rehomed here 2026-08-08)*

`supports.sgs.elements` in each `block.json` is what THE PLACEMENT RULE and CO-2 derive from, so its
schema is normative and lives in a **living** doc. It previously lived only in
`.claude/plans/archive/spec-35-compound-control-sets-design.md` §"The element manifest" — an
**archived** doc that a live gate (`scripts/check-element-manifest-conformance.js`) still cited.
Archive is git-blame-only by project convention; a load-bearing schema cannot live there. That
document remains the historical derivation; **this section is the schema.**

**Measured against the tree, 2026-08-08** (not transcribed): **82 of 83 `block.json` files declare
`supports.sgs.elements`; 283 elements.** ⚠ Not "83 of 83" — that figure was inherited from the
design doc and is wrong; 83 is the FILE count, 82 the DECLARING count. Quote the predicate. Key
frequencies — `label` 283 · `order` 283 · `clusters` 283 · `attrMap` 149 · `prefix` 102 ·
`isWrapper` 69 · `layer` 57 · `states` 20 (18 `hover`, 4 `selected`, 2 elements carry both).

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
    "states": {                       // OPTIONAL — hover/selected values, nested INSIDE the element
      "hover": { "attrMap": { "css:color": "colourTextHover" } }
    }
  }
} } }
```

### `contentAttrs` — the field added by this amendment

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

### Attr→element resolution order (unchanged — implemented in `resolveMember()`)

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

⛔ **CORRECTED 2026-08-09 — the 83-vs-84 distinction below was REAL when written and is now GONE.
There is one denominator: 83.**

~~⚠ **83 vs 84 — both figures are correct and they count different things.** The scoping axes above use
**84** (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`). This section uses **83**: the blocks
with a `src/blocks/*/block.json` on disk declaring `supports.sgs.elements`.~~ Measured at `a09226e8`,
all three sources now agree:

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

## The scoping axes (machine-readable — never a hardcoded block list, per R-31-1)

Denominator is always **83** (`SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'`) — ⛔ **corrected
2026-08-09 from 84; that query returns 83 today.** The per-axis splits in the table below were
measured against the older roster and are NOT re-derived here: re-run each axis before quoting it.
Full reconciliation in the ELEMENT MANIFEST section's denominator box.

| Axis | Source | Split |
|---|---|---|
| `surfaces.colour` | roster.json | 64 |
| `surfaces.styling` | roster.json | 65 |
| `surfaces.media` | roster.json | 30 |
| `surfaces.animation` | roster.json | 21 — **the proven precedent**, used by rule 17 |
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

### ⛔ The EXTENSION SURFACE axis (council S1 — added 2026-08-08, restores the generalisation)

**No block-scoped axis above can select a control injected by a universal extension**, because a
`blocks.registerBlockType` filter writes attributes at runtime and `block_attributes` only ever sees
what a `block.json` declares. `extensions/hover-effects.js` registers **11 literal `sgsHover*` attrs
(19 `sgs*` attrs in total) onto 67 blocks** this way — invisible to every DB column by construction.
STATE's "23 blocks, 3 conform" is therefore a large undercount **of the very shape STATE bans**.
*(The "13" first written here was corrected by QC council 2026-08-08 — count the literals before
quoting a reach figure.)*

⛔ **THIS AXIS IS AN UNBUILT PREREQUISITE, not just a rule to remember.** Measured 2026-08-08: the
existing engine **cannot see** `src/blocks/extensions/` at all. `inspector-scan/core/roster.js:58-70`
only admits directories under `src/blocks/` that contain a `block.json`, and `extensions/` has none;
`run.js`'s `buildCtx` supplies `blocksDir` / `patternsDir` / `themeDir` and **no `extensionsDir`**;
`core/components.js:34` discovers only `src/components/`, so the proposed transitive
`writesColour`/`writesIcon` resolution will not reach the extension HOCs either. **Any rule whose
scope includes the extension surface is blocked until that plumbing lands.** Per-block reach is NOT
available from `generate-extension-attributes.js` (names only) — derive it from `hideExtensions`.

The contract originally made this argument for LINK alone and failed to generalise it. It binds on
**four** contracts, all reached through the same file: **LINK** (raw URL field), **STATE** (11 literal
`sgsHover*` attrs, 19 `sgs*` total), **SHADOW** (a preset `SelectControl` on a shadow attr), **COLOUR** (hover colour
fields). Therefore:

> **Every contract's `Scope` field must state its extension reach explicitly, and every detection
> rule must read `src/blocks/extensions/*.js` as well as per-block `edit.js`.** A rule scanning only
> per-block `edit.js` has a blind spot the exact size of the extension roster, and that blind spot is
> where the largest single violation set in this document lives.

Reach is derived, not hardcoded: a block is in an extension's surface when it does not opt out via
`supports.sgs.hideExtensions`. `noOptOutExtensions` is `[]` today.

**Bean's own suggested categories all map to real axes.** Three corrections:
- **"Section" is three distinct axes**, not one — `tier='class-section'` (4), `container_kind='section'`
  (6), `composition_role='section-root'` (8). Each contract must say which it means.
- **"Blocks with text" routes via `role`, not typography supports.** Both give 65, but they are
  *different sets* overlapping by only 49 — `sgs/decorative-image` holds client-editable alt/caption
  text with no typography support; `sgs/container` and `sgs/icon` have the support and no text.
- **Dynamic-vs-static is useless** — 84/0. Every SGS block is dynamic.

### ⛔ DB columns that are NOT trustworthy as gate inputs (all four measured 2026-08-07)

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

1. ~~**`inspector_control_type`**~~ **— FIXED (D523).** Was: says `TextControl` for `sgs/icon.linkUrl` and `sgs/media.linkUrl`;
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
2. ~~**`box_family`**~~ **— FIXED (D523).** Was: **7** genuinely NULL *object*-typed attrs with live BoxControls:
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
3. **`role LIKE 'icon-%'`** — tags 2 blocks; `IconPicker` is used by **13** (15 sites). An **85%**
   under-count, not 78%. ⚠ The `icon-*` family is the converter's SOURCE-disambiguation key, not a
   "uses IconPicker" tag, so the promotion pass is self-limiting and never admits a new member —
   widening it is a design choice, not a backfill. **OPEN.**
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
   Settings, 3 Styles, 1 explicit settings. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
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
   component's job); **`extensions/hover-effects.js:388` raw URL field injected into 67 blocks**
   (84 − 17 opt-outs; the "~82" this doc first carried is the `customCss` figure, transposed).
4. **Tab** — `settings`. Placement is already consistent; **component choice is the live problem.** *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `surfaces.link` (16) is both over- and under-inclusive: 9 of the 16 match on a media
   URL or a colour token; 6 blocks with genuine repeater-item links are invisible because
   `build-roster.py` only scans top-level attr names. **True denominator: 14 blocks with a
   navigational link field, plus the 67-block extension surface which no block-scoped axis can see
   — see the EXTENSION SURFACE axis added to the scoping table above (council S1).**
6. **Conformance** — 10 conform. Violators: `sgs/button`, 67 via the extension, 2 baselined.
7. **Detection** — add `<URLInput>` to the matcher (one line), and **extend rule 08's file set beyond
   per-block `edit.js` to `src/blocks/extensions/*.js`**. That alone would have caught the 67.
8. **Open** — is `google-reviews.reviewRequestUrl` genuinely config, or a link a visitor follows?
   Does `whatsapp-cta.phoneNumber` deserve its own PHONE contract?

## 3. ENUM / MODE

1. **Canonical** — no shared component. `SelectControl` over a **declared `block.json` enum** is the
   de facto standard (**82** files); `ToggleGroupControl` for short option sets (14 files) — **the
   threshold is nowhere written down, so it cannot yet be gated.**
2. **Required props** — `value` bound to the attr; `options` matching the declared `enum` **exactly**.
3. **Banned lookalikes** — (a) a shared aggregator offering options outside the consuming block's
   enum; (b) a PHP-enforced closed set with no `block.json` enum (free-text box, no validation).
4. **Tab** — `settings`, explicitly, not by relying on the default. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
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
   geometry. All Styles. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
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
4. **Tab** — `dimensions` (padding/margin) / `border` (width, radius). Styles. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
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
   `group="content"`). *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
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
2. **Required props** — `label`; `__nextHasNoMarginBottom` on **133/162** instances.
3. **Banned lookalikes** — a 2-option `SelectControl` driving a boolean (3 DB rows); a
   `RadioControl` with two options (**1 live instance — `heading/edit.js:281`**; the earlier "ZERO"
   was false, the judgement it supported survives); literal "On/Off" toggle groups (**none found**).
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

## 9. FREE TEXT / BARE NUMBER

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

## 10. ICON

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
6. **Conformance** — 13/13 mount the canonical component; **0/13 pass the `id` requirement**, so the
   real conformance figure is 0, not the "9/9" this doc first carried over a set four blocks short.
7. **Detection** — census `<IconPicker` across `src/blocks/**/edit.js` **and `src/blocks/extensions/*.js`**;
   assert every mount passes `id`. Lookalike detection via a `writesIcon` flag on
   `inspector-scan/core/components.js`, derived from the component's own source (the `writesColour`
   pattern), so an indirect mount through a shared wrapper resolves transitively.
8. **Open** — does the `icon-*` role widen, or does a new declarative flag carry "uses IconPicker"?
   **This is Tier 0 (d) and it is a design gate, not a backfill.**

## 11. SHADOW

1. **Canonical** — `src/components/ShadowControl.js`, storing a **CSS string**
   (X/Y/blur/spread/colour+alpha/inset).
2. **Required props** — `label`, `value`, `onChange`. **`id` REQUIRED and missing** (line 126).
3. **Banned lookalikes — this type's list is the whole point, because rule 07 sees exactly one of
   them:**
   - a **preset `SelectControl`** (None/Small/Medium) writing a shadow attr — *the only shape rule 07
     inspects*;
   - **a preset `SelectControl` on a shadow attr reaching 67 blocks through
     `extensions/hover-effects.js`** — same shape, invisible to every per-block scan (see the
     EXTENSION SURFACE axis);
   - **a bare `TextControl` asking for raw CSS** — `sgs/quote:699` and `sgs/media:685`; media's help
     text literally reads *"A raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)"*. A direct
     breach of the framework's own non-negotiable that no setting may require touching code;
   - **a hand-rolled builder storing an object** where the shared component stores a string —
     `sgs/button`, ~80 duplicated lines, incompatible shape;
   - **no control at all** — `sgs/heading` and `sgs/text` declare `boxShadow`/`boxShadowHover`,
     render them, and expose nothing. Rule 07 cannot see this class by construction.
4. **Tab** — `styles` (it is appearance), inside the border/effects grouping. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `css_property LIKE '%shadow%'` across `block_attributes`, **plus** the extension
   surface. Real footprint **17 blocks**; rule 07 reports 1.
6. **Conformance** — 4 exact defects confirmed (`heading`/`text` × `boxShadow`/`boxShadowHover`),
   2 raw-CSS text fields, 1 duplicate builder, 6 secondary shadow attrs unverified.
7. **Detection** — census from the DB, then classify each attr's control in `edit.js` as
   *compliant / preset-select / raw-text / duplicate-builder / **no-control***. Five buckets, not a
   boolean. The fifth is the fourth quadrant and needs the render-without-control rule.
8. **Open** — does `sgs/button`'s object shape migrate to the string shape, or does `ShadowControl`
   gain an object mode? Either is a shared-mechanism change → **Rule 7 design gate.**

## 12. THE RESPONSIVE WRAPPER FAMILY

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

## 13. CONTROLS WITH NO CONTRACT YET (council F — enumerated so none is "homeless")

Every shape below is live and fits none of contracts 1–12. **A rule may not silently ignore these;
each is either given a contract or recorded as deliberately uncontracted with a reason.** Listing
them here is what stops the next enforcement pass repeating the 27's blind spot.

| Shape | Live footprint | Nearest contract | Verdict |
|---|---|---|---|
| preset `SelectControl` on `minHeight` | 5 sites | LENGTH (§4) | **Needs a contract** — a length behind a preset picker breaks the token system |
| raw `BoxControl` (not the Responsive wrapper) | 5 sites | 4-VALUE BOX (§5) | **Needs a contract** — bypasses the tier wrapper |
| `BorderRadiusControl` (singular, non-responsive) | live | BORDER (§14) | **Absorbed by §14** |
| `SpacingControl` | 9 sites | LENGTH (§4) | **Needs a contract** — is it a length, or its own token-scale type? |
| `DeviceTabs` | ⚑ **DEAD — 0 callers** (Spec 35 Phase 1.2/1.3, 2026-08-10) | RESPONSIVE (§12) | **Banned lookalike — verdict still binds if reintroduced.** The component file still exists and is still exported from `components/index.js`, but every `<DeviceTabs>` render was deleted: the tier is now chosen once, in the global toggle (`src/blocks/extensions/responsive-device-toggle.js`). `inspector-scan` rule 25 flags any block that reintroduces one. This cell read `live` until the QC council caught it. |
| `AnimationControl` | 1 site | — | **Needs a contract**, and it is where carried obligation 17 (reduced-motion) binds |
| `ComboboxControl` | 2 sites | ENUM (§3) | Absorbed by §3 as a permitted large-option-set variant |
| `FormTokenField` | live | ENUM (§3) | Multi-select enum — **needs an explicit clause in §3** |
| `FocalPointPicker` | 1 site | MEDIA (§7) | **Absorbed by §7** — and it is carried obligation 9's evidence |
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

## 14. BORDER (restores condition 7's dropped half)

1. **Canonical** — `BorderBoxControl` for style + per-side width + colour + alpha;
   `ResponsiveBorderRadiusControl` for the 4 corners. Radius is a **separate** control from width and
   style — that separation is the condition, not an implementation detail.
2. **Required props** — per-side values, a real `units` array, alpha on the colour, and a `label`.
3. **Banned lookalikes** — a None/Thin/Thick **preset `SelectControl`** standing in for a real
   builder (the exact shape condition 7 banned for shadow, and it was dropped for border); per-side
   scalar attrs instead of an object (**migration COMPLETE — 0 remaining**, keep the gate);
   a `TextControl` taking a raw CSS `border` shorthand; radius folded into the width control.
4. **Tab** — `border`. Styles. *(Subordinate to THE PLACEMENT RULE: this Tab field only governs a control that STYLES NOTHING and
lands in the pinned `Settings` panel (D537). A control that has a real property family resolves to
its TIER 2 family panel via `cluster-member-sets.json` instead. An element-scoped control goes in
its element's panel (TIER 1) regardless of this field.)*
5. **Scope** — `box_family IN ('borderWidth', …)` ∪ `css_property LIKE 'border%'`. ⚠ `box_family` is
   now trustworthy (D523) but still scopes only to 4-side/4-corner OBJECT attrs — a scalar radius
   (`card-grid.cardRadius`, `nav-menu.itemRadius`, `mega-aside.asideRadius`) is correctly NULL there
   and must be picked up by the `css_property` leg, or the rule will miss every one of them.
6. **Conformance** — **not yet measured.** This contract was absent from the draft, so no census
   exists. ⛔ Recorded as unmeasured rather than assumed conformant.
7. **Detection** — as §11 SHADOW: classify each border attr's control into compliant / preset-select
   / raw-text / no-control. `sgs/card-grid.cardRadius` is a known raw-text violation (help text
   *"e.g. 8px"*, accepts invalid CSS) — already named under LENGTH §4, and it belongs to both.
8. **Open** — does `BorderBoxControl` need a responsive wrapper, or is border width a desktop-only
   property in practice? Measure before deciding.

---

---

## CARRIED OBLIGATIONS — the conditions no single control type owns

**These are RESTORED verbatim in force from the 27-condition checklist (council finding A).** A
control-type contract answers *"which component, which props, which tab"*. It cannot answer *"is
this panel grouped by block part"* or *"is this animation reduced-motion gated"* — those bind across
every type or across none. **Dropping them was the draft's most serious failure**, because two are
accessibility requirements and one was the only written record of a locked standard.

Each carries the same eight-field discipline where it can, and states its enforcement honestly.

### CO-17. Reduced-motion gate on all animation *(was condition 17 — WCAG 2.3.3 AA)*
Every animation and transition is `prefers-reduced-motion`-gated, from day one, never bolted on.
**Enforced by** `inspector-scan/rules/17-reduced-motion-gate.js` — **GATE mode, one of only four**.
⚠ **This is a WCAG conformance requirement, not a preference.** It binds on §13's `AnimationControl`,
on `extensions/animation.js` (84 blocks), and on `fx.js`. Losing it would have silently dropped an
accessibility gate that is currently live and passing.

### CO-11. The 768/1024 device-tier lock *(was condition 11)*
Responsive props expose the locked 768/1024 tiers via `ResponsiveControl`; **no bespoke third
breakpoint.** ⚠ **Measured: these values exist ONLY as per-file constants in 3 `view.js` files** —
there is no shared constant, no schema, no gate. **The written rule was the sole thing holding the
standard**, so deleting it would have left 768/1024 enforced by nothing at all. Binds with §12 field 3
and with the device-tier-vs-visual-breakpoint distinction (a design-driven `min-width:600px` is
legitimate and must NOT be swept). **Enforced by** UNENFORCED — and now visibly so.

### CO-2. Element-first panels *(was condition 2 — REWRITTEN 2026-08-08 to the derived model)*

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

### CO-28. Consistent ORDER of panels, clusters and controls *(NEW — Bean-raised 2026-08-08, not a carried item)*
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

⚠ **CORRECTION — this entry is a PROMOTION, not a discovery.** It was first written here claiming
panel order "existed nowhere in the contract". That was **wrong**, and wrong by the classic
truncated-grep failure: the search that produced the claim was capped at its first 20 hits and the
relevant line sits at ~980. **Cross-cutting A already carried it**: *"Panel order — three competitors
converged on ordering being deliberate. Stackable achieves it by convention repeated per block, not a
shared assembler; GenerateBlocks centralises the Styles tab only — Advanced stays per-block even
there."* What was genuinely missing is that this sat as a **competitor-research note with no
obligation, no canonical order and no enforcement**. CO-28 promotes it to a binding obligation and
inherits that research as its starting evidence — it does not replace or re-derive it.

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

#### ⛔ HARD DEPENDENCY — PLACEMENT before ORDER *(Bean-approved sequencing, 2026-08-08)*

**CO-28 does not start until Cross-cutting A's placement backlog is worked.** This is a dependency,
not a preference, and the measurement is what makes it one: **65 of 83 blocks have 2+ inspector
panels and no `group` prop at all** (`inspector-scan` rule `01-tab-group`, the single largest backlog
in the scanner). No group prop means every panel lands in Settings. **You cannot standardise the
order of panels across Settings and Styles while most blocks never split into two tabs.** Ordering an
unsorted pile is not a smaller version of this job — it is a different job that cannot begin yet.

Placement, unlike order, needs **no design gate**: it is decided — but ⚠ **not by what this paragraph
originally said.** It first read: *"12 of the 14 control contracts carry an explicit `Tab` field, §6
field 4 supplies the discriminator — 'behaviour → Settings; appearance → Styles. This discriminator
is the contract.' — and Cross-cutting A states 'the definitive tab assignment is the `Tab` field of
each contract above'."* Two defects in that sentence, both corrected 2026-08-08:

- **The citation was wrong.** That sentence lives in **§8 BOOLEAN field 4**, not §6 (STATE / HOVER).
- **The rule was wrong**, and it is the rule that produced the rejected 8-block sort. Placement is now
  governed by **THE PLACEMENT RULE** (top of this document, TWO-TIER since D537 2026-08-09): TIER 1
  element scope decides the panel first; TIER 2 property-family (`cluster-member-sets.json`) decides
  placement for everything scoped to no element; a contract's `Tab` field is authoritative only for a
  control that styles nothing, and there only picks the WordPress *group* inside the pinned
  `Settings` panel.

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

### CO-3. ToolsPanel on dense panels *(was condition 3 — downgraded to a bare remediation count)*
Any panel with ~6+ controls uses `ToolsPanel`/`ToolsPanelItem` progressive disclosure (1–3
`isShownByDefault`, `resetAll`). **Enforced by** `inspector-scan/rules/03-dense-panel-candidate.js`,
ADVISORY. ⚠ A remediation count ("15 dense panels") is a backlog, not a rule — the obligation is
restored here so the backlog has something to be a backlog *of*.

### CO-9. Full image controls *(was condition 9)*
Image-rendering blocks expose size dropdown (attachment `sizes`) + aspect-ratio + object-fit +
`FocalPointPicker` where relevant. **Enforced by** `audit-feature-parity.py` (vs `core/image`).
Binds with §7 MEDIA and gives §13's lone `FocalPointPicker` its home.

### CO-10. Multi-item data is array-shaped *(was condition 10)*
Any repeated/multi-item media or content uses an array attr with `gallery`/`multiple="add"`
(`MediaGalleryPicker`) or a repeater — never a scalar attr added one at a time. **Scope: 25 blocks
declare 34 array attrs.** **Enforced by** `audit-feature-parity.py`. ⚠ **D523 clarifies the control
question this raises:** the control for an array attr is the REPEATER UI, never the per-item control
inside it — a rule reading `inspector_control_type` for an array attr is asking the wrong question.

### CO-13. hideExtensions is a per-BLOCK obligation *(was condition 13)*
Irrelevant universal-extension panels are hidden per block via `supports.sgs.hideExtensions`
(declarative). ⚠ The draft kept the mechanism and dropped the **per-block obligation** — which is
the part that makes it anyone's job. **Enforced by** UNENFORCED. (Corrected 2026-08-06: the retired
`audit-inspector-conformance.js` never carried a hideExtensions rule — a phantom-tool claim.)

### CO-15. No duplicated native-supports panel *(was condition 15 — RESTORED 2026-08-08)*
No bespoke panel re-implements a control a native `supports` panel already provides. This is the
inspector-UX form of **R-31-9**. **Enforced by** UNENFORCED — `check-duplicate-controls.js` exists
and is **wired to nothing** (0 refs in `package.json`).
⛔ **Restored after a QC-council audit, 2026-08-08.** This document's own ABSORPTION MAP claimed it
was absorbed into Cross-cutting B. It was not: Cross-cutting B is about universal-EXTENSION opt-out
fit, a different question, and the requirement appeared nowhere in this file. The map cited a target
that did not contain the rule — the exact failure mode this contract exists to end, committed by the
contract about itself. (Corrected 2026-08-06: the retired `audit-inspector-conformance.js` never
carried a duplicate-native-panel rule either — that was a phantom-tool claim.)

### CO-18. Decorative-image toggle + ARIA-label *(was condition 18 — RESTORED 2026-08-08)*
A decorative-image toggle (**empty alt + `aria-hidden`**) and a general **ARIA-label** control are
present wherever the block's rendered markup needs them. *(Spec 35 C, E6.)* **Enforced by**
UNENFORCED — no automated gate exists.
⛔ **Restored after the same audit.** The map claimed §7 MEDIA field 2 + CO-19. Neither holds: §7
field 2 says only "alt text", and CO-19 governs the accessibility of the **editor control UI itself**
(keyboard, contrast, `aria-describedby`) — a different target from the **rendered output's**
accessibility, which is what this condition is about. ⚠ Do not re-merge these two: an accessible
control that writes an inaccessible output satisfies CO-19 and fails CO-18.

### CO-16. Native over hand-rolled *(was condition 16)*
Native `supports` are used over hand-rolled equivalents for aspect-ratio / duotone / sticky /
lightbox — **check native BEFORE building any of these.** Points at a Bean-approved D402 verdict
table. **Enforced by** feature-parity + Wave-3 native-migration audit. ⚠ This is the condition that
**prompts §G's open question** (retire `sgsCustomCss` for WP 7.0 native per-block CSS) — dropping it
would have removed the standing instruction that raises that question at all.

### CO-19. Accessibility pass, E1–E4 *(was condition 19)*
Keyboard-operable · 4.5:1 contrast on the block's own control UI · `help` linked via
`aria-describedby` · every control has an accessible name. **Enforced by** manual pass —
**informational, never a gate** (`a11y-validation-feedback-informational-not-gate`). ⚠ The missing
`id` on `DesignTokenPicker`, `SgsLinkControl`, `IconPicker`, `ShadowControl`, `ResponsiveControl` and
`ResponsiveOverride` is an E1–E4 failure, which is why those clauses appear in six contracts above.

### CO-20. Client patterns use templateLock *(was condition 20 — carried in a form the spec FORBIDS)*
⛔ **`templateLock:"contentOnly"` is per-client opt-in — "never framework patterns" (D402,
Bean-approved).** The draft's Tier 4 "23 pattern templateLock" reinstated a framework-wide backlog
D402 had closed; that entry is REMOVED. The obligation as it correctly stands: a **client-facing**
pattern using a block sets `templateLock:"contentOnly"`. **Enforced by** pattern audit; `rules.json`
correctly keeps rule 20 ADVISORY.

### CO-21. No Part-F anti-patterns *(was condition 21)*
None of the Spec 35 Part F fail-list is present: essential control sidebar-only · incomplete option
sets · no reset · colour-only focus · bespoke Custom-CSS field · raw-px spacing. **Enforced by** the
contracts above, collectively.

### T1 / T2 / T3 — the Bean-locked threaded standards *(dropped entirely)*
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

### Rule-authoring discipline 22 / 24 / 25 / 26 *(dropped; these govern how every rule above is WRITTEN)*
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

## ABSORPTION MAP — where each of the 27 + T1–T3 now lives

**Acceptance for Task 2: every condition is ABSORBED, CARRIED, or DROPPED-WITH-A-REASON. No silent
losses.** This table is the check.

| # | Condition | Disposition |
|---|---|---|
| 1 | Tab split via `group` | **ABSORBED** — the `Tab` field of every contract + Cross-cutting A |
| 2 | Element-first panels | **CARRIED** — CO-2 |
| 3 | ToolsPanel on dense panels | **CARRIED** — CO-3 |
| 4 | Alpha + clearable colour | **ABSORBED** — §1 COLOUR fields 2–3 |
| 5 | Real units / token scale | **ABSORBED** — §4 LENGTH fields 2–3 |
| 6 | 4-value props are box-families | **ABSORBED** — §5 4-VALUE BOX (+ §14 for the border half) |
| 7 | Real builders for compound values | **ABSORBED** — shadow half → §11; **BORDER half → §14 (restored)** |
| 8 | LinkControl for links | **ABSORBED** — §2 LINK + the EXTENSION SURFACE axis |
| 9 | Full image controls | **CARRIED** — CO-9 (binds §7) |
| 10 | Multi-item data is array-shaped | **CARRIED** — CO-10 |
| 11 | 768/1024 device switcher | **CARRIED** — CO-11 (binds §12) |
| 12 | StateToggleControl for states | **ABSORBED** — §6 STATE / HOVER |
| 13 | hideExtensions | **CARRIED** — CO-13 (per-block obligation restored) |
| 14 | MediaUploadCheck on every MediaUpload | **ABSORBED** — §7 MEDIA field 2 (0 violations; keep the gate) |
| 15 | No duplicated native-supports panel | **CARRIED** — CO-15 ⚠ was mis-mapped to Cross-cutting B; corrected 2026-08-08 by QC council |
| 16 | Native over hand-rolled | **CARRIED** — CO-16 (raises §G) |
| 17 | Reduced-motion gate | **CARRIED** — CO-17 ⚠ WCAG, GATE mode |
| 18 | Decorative-image + ARIA-label | **CARRIED** — CO-18 ⚠ was mis-mapped to §7 + CO-19; corrected 2026-08-08 by QC council |
| 19 | A11y pass E1–E4 | **CARRIED** — CO-19 |
| 20 | Client patterns use templateLock | **CARRIED** — CO-20, in the D402-correct per-client form |
| 21 | No Part-F anti-patterns | **CARRIED** — CO-21 |
| 22 | Silence is not rejection | **CARRIED** — rule-authoring discipline ⚠ **NO DESTINATION NAMED** (see note below) |
| 23 | Recall measured against the eligible POOL | **ABSORBED** — every contract's `Scope` field states its denominator; §13 exists so nothing is measured against a self-referential union |
| 24 | Named artefacts must exist on disk | **CARRIED** ⚠ **NO DESTINATION NAMED** |
| 25 | Name the CONSUMER before measuring | **CARRIED** ⚠ **NO DESTINATION NAMED** |
| 26 | A zero needs a positive control | **CARRIED** ⚠ **NO DESTINATION NAMED** — the nearest live home is `rules.json._meta.zeroIsAClaim`, which states it; confirm and cite, or give it a CO |
| 27 | DB statistics declare their denominator + scope to `sgs/%` | **ABSORBED** — the scoping table's denominator is stated as 84 = `WHERE slug LIKE 'sgs/%'`, and every contract's `Scope` field carries its own |

⚠ **FOUR ROWS SAY "CARRIED" AND NAME NOWHERE (22, 24, 25, 26 — flagged 2026-08-08).** Every other
row names a checkable destination (a CO number or a §section+field). These four do not, so **"30/30"
is not verifiable for them** — a reader cannot confirm the requirement still exists anywhere. This is
the same failure mode the QC council caught twice in this very table (15 mis-mapped to Cross-cutting
B, 18 mis-mapped to §7 + CO-19): *the map cited a target that did not contain the rule.* It is
recorded here rather than quietly fixed, because the fix requires knowing where each one actually
went, and guessing a destination would recreate the defect.

All four are **rule-authoring / measurement discipline**, not control contracts, so a CO entry may
genuinely be the wrong home — but "wrong home" and "no home" are different, and only one of them is
acceptable. Resolve by either citing the live artefact that carries each (26's likely home is
`rules.json._meta.zeroIsAClaim`) or giving each its own CO. Until then, treat these four as
**UNVERIFIED, not discharged**.
| T1 | Feature-parity | **CARRIED** — governs the live `audit-feature-parity.py` |
| T2 | Shrink-to-fit | **CARRIED** |
| T3 | Media-controls competitor comparison | **CARRIED** |

**DROPPED: none — but this map was WRONG for two items until 2026-08-08.** A 4-rater QC council
re-traced all 30 against their claimed targets and found **15** and **18** marked ABSORBED into
sections that did not contain their requirement. Both are now CARRIED as CO-15 / CO-18.
**Verified count: 28/30 held on first pass, 30/30 after correction.**
⚠ The lesson is about THIS TABLE: a disposition is only true if the named target actually states
the requirement. Citing a section is not absorbing a rule. Re-read the target before trusting a row.

---

## Cross-cutting A — PLACEMENT

WordPress has **16 real group keys** (verified against Gutenberg source, not docs — this mapping is
not on developer.wordpress.org). `settings` is a hard alias of `default`. `advanced` renders as a
panel *inside* Settings, not its own tab. `content` and `list` map to their own tabs.

⚠ **AMENDED 2026-08-08 — this line used to read "The definitive tab assignment is the 'Tab' field of
each contract above." It is no longer true and must not be quoted.** The definitive tab assignment is
**THE PLACEMENT RULE** at the top of this document: TIER 1 element scope decides the panel first.

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

⛔ **SUPERSEDED 2026-08-08 (D525).** The rule first proposed here —
`capability IN ('array-content-lift','carousel','grid-layout','logo-strip') OR attr_type='array' AND
role='content'` — **cannot be built as written.** Three of those four capabilities are FOSSILS with
no writer and no reader (see §Tier 0). And the array-attr fallback leg was measured: it selects 10
blocks and **misses `sgs/gallery`**, the very block this section is about, because `mediaItems`
carries no role.

**The shipped rule is a DECLARATION:**
```
isCollectionKind(block) = block_capabilities row (slug, 'collection')
                          ← supports.sgs.collection in the block's own block.json
```
15 blocks declare it. Fire it for **Block Link** specifically. No prerequisite remains — the data
exists, has a live writer, and a block states the fact about itself.

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
  **forbids** it with measured evidence of invisible text at 1:1 contrast. **The doc conflict is
  real and confirmed. The live-debt count was NOT** — `check-stranded-guards.py` is wired into
  `prebuild` and passes: **0 stranded guards across 85 blocks.** The "17 stylesheets" figure counted
  **removal comments** documenting the guard's deletion; the true figure is 16 files, 0 live. A grep
  count is not a measurement.
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

Work: repair the `/sgs-update` derivations for four columns. Each needed its root cause established
first — wrong derivation vs never-runs vs insert-only-never-updates vs missing source data are four
different fixes, and they were four different fixes.

- ✅ **`inspector_control_type` — DONE (D523, `e73bacde`).** Root cause was a hardcoded 16-name
  tuple with zero SGS components; widened, **41 rows corrected**, repeater guard added.
- ✅ **`box_family` — DONE (D523, `e73bacde`).** Mechanism was healthy; the five blocks simply never
  declared `supports.sgs.boxFamilies`. **7 values**, block.json edits only.
- ✅ **icon `role` — DONE (D525, `dd946aa9`), by SEPARATION not widening.** The `icon-*` role stays
  exactly as it is: it is the converter's icon-SOURCE discriminator (lucide / emoji / dashicon /
  wp-icon) and answers a different question, which is why it tags 2 blocks where the picker is
  mounted by 13. Widening it would have broken the converter's arm. The control-surface fact is now
  its own declaration: **`supports.sgs.iconPicker` → capability `icon-picker`, 13 blocks**.
- ✅ **`block_capabilities` — DONE (D525, `dd946aa9`), and the premise was wrong.** The table held
  TWO unrelated things: 3 declarative lift flags (healthy, converter-read) and ~36 semantic tags with
  **no in-repo writer, and no reader IN THE PIPELINE** — the capability-aware tiebreaker that consumed
  them was RETIRED at D278, and every live `capabilities_for()` call site reads only the lift flags.
  ⚠ **CORRECTED 2026-08-08 by QC council: "no reader" full stop was FALSE.** Two live readers of the
  FULL capability table exist outside the pipeline, in
  `~/.claude/skills/sgs-wp-engine/mcp/server.py`: `search_blocks()` (line ~90) and `match()`
  (line ~580) both score blocks by keyword overlap against **every** capability tag. That is the
  tooling CLAUDE.md tells sessions to query before claiming "missing X". Pruning the 36 semantic tags
  therefore **degraded block-discovery/semantic-match quality** — a real consequence that the D525
  reasoning missed. The DECISION still stands (the tags had no writer, so they were frozen and
  already absent from 34 blocks), but it was a trade-off, not a free removal. **OPEN: whether to
  reinstate discovery keywords as a declarative `supports.sgs` field. Bean's call.** **The proposed `isCollectionKind()` scoped to `carousel`/`grid-layout`/`logo-strip` would
  have built a new rule on three dead values** — the Tier 0 failure mode arriving inside the fix for
  it. 73 fossil rows pruned, and the prune re-runs every Stage 1 so `populate-db.py` cannot silently
  reintroduce them.

**`isCollectionKind()` is now buildable and its definition changed.** Do NOT use the capability list
in Cross-cutting B below. Use the declaration:

```
isCollectionKind(block) = block_capabilities row (slug, 'collection')
                          ← supports.sgs.collection in the block's own block.json
```

15 blocks declare it. The fact is **architectural, not taxonomic**: the block renders a repeated set
whose children are interactive, so a block-link cannot wrap it (HTML forbids nesting interactive
elements). That is precisely why the old `category === 'sgs-forms' && !surfaces.styling` heuristic
could never flag `sgs/gallery`. Roster derived per block from `render.php`: `accordion` qualifies
through its item's `<summary>`, `card-grid` and `content-collection` through `render_block()`
children. ⛔ `timeline` and `process-steps` repeat but their children are **inert** — a block-link
there is valid, and they are deliberately excluded.

⚠ **Still open, and NOT part of this:** whether `arrayContentLift` should be added to
`testimonial-slider` + `content-collection`. That flag is converter-read, so it is a **Rule 7 change**
— not folded in here. (⛔ NOT `post-grid`: its arrays are config filters, `WP_Query` owns its
content. ⚠ verify `gallery.mediaItems` is authored content before declaring it.)
⚠ `block_selectors` still has the fossil disease, PARTIALLY ported — two writers, last-one-wins.
**Do not run `populate-db.py`**: it would clobber selectors and reintroduce pruned capabilities.

### All four Tier 0 columns are correct. "Tiers 1–4 UNBLOCKED" was an OVERCLAIM — the honest scope

⛔ **Corrected 2026-08-08 by QC council (rater D).** The columns are fixed and independently
re-measured, but that does not unblock every tier. Per tier:

| Tier | Status | Why |
|---|---|---|
| **Tier 3 (new rules)** | ✅ **UNBLOCKED** — for rules scoping on the verified DB axes | Engine, fixtures, baselines and a real `--self-test` harness all exist (`run.js --self-test` passes 9/9 **plus** a meta-check that deliberately breaks a rule and confirms it fails). It IS wired into `prebuild` — the `run.js:6-10` header saying otherwise is stale. |
| **Tier 3 crossing the EXTENSION SURFACE** | ⛔ **BLOCKED** | `inspector-scan` cannot see `src/blocks/extensions/` at all — no `extensionsDir`, and `roster.js` admits only dirs containing a `block.json`. Plumbing must land first. |
| **§14 BORDER** | ⛔ **BLOCKED on a census** | Its own field 6 says "not yet measured", and `rules.json._meta.zeroIsAClaim` (Bean-locked) requires an independently-derived expected population before a live run is trusted. Blocked on measurement, not data. |
| **Tier 1 (shared-file fixes)** | ⛔ **BLOCKED on Bean** | Every item is a shared-mechanism change needing a **Rule 7 design gate** — §H lists nine. A fixed database does not unblock a design gate. |
| **Tier 2 (wire what exists)** | ⚠ **HALF** | The 4–5 dead gates can be wired ADVISORY today (all confirmed 0 refs in `package.json`). `lint:js` cannot, per E6 point 9 — advisory first, fail-closed only at zero backlog. ⚠ the 11,932 figure is UNVERIFIED; nobody has re-run the linter. |
| **Tier 4** | ✅ unblocked, but it is hand remediation, not enforcement | |

⛔ **DO THIS FIRST, before writing any rule: regenerate `roster.json` and diff all five `surfaces.*`
axes.** D523 wrote `SgsLinkControl` into `inspector_control_type`, and `build-roster.py:91` derives
`surfaces.*` from a haystack that includes that column — so `sgs/form` flipped `link` false→true and
the committed artefact went stale **with nobody noticing**. Verified 2026-08-08 after the fix:
`styling=65 colour=64 link=17 media=30 animation=21`. **`animation` is UNMOVED**, which matters
because it scopes `17-reduced-motion-gate`, a live GATE-mode WCAG rule — and `build-roster.py:71-76`
records a 2026-07-30 precedent where a roster regeneration flipped 18 blocks and fired 18
false-positive WARNs on a fail-closed gate. That reassurance is now MEASURED, not assumed.

⚠ Two wired gates have **no `--self-test`**: `check-universal-fit.js` and `check-control-ux.js` — and
the latter is in `prebuild`. A wired gate with no proof it can fail.

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
