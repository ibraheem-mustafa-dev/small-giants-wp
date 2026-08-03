---
doc_type: report
title: Bidirectional control↔capability parity — coverage, computable definition, detector rules
status: ACTIVE
created: 2026-08-03
governs: proposed end condition 22 on .claude/plans/spec-35-inspector-DONE-checklist.md
scope: plugins/sgs-blocks — 84 blocks with a block.json + 12 extension files
---

# Bidirectional control↔capability parity

**The proposed rule.** Every element and CSS property the block genuinely has must be
client-editable, AND every control shown must map to something the block genuinely does.

**Headline.** The two directions are not close to symmetric. Direction A (control with no
capability) is enforced as a **hard, zero-tolerance prebuild gate** and is measurably sound.
Direction B (capability with no control) is **structurally unenforceable by the tool
currently assumed to cover it** — `check-element-manifest-conformance.js` verifies that an
attribute *exists*, never that a *control* exists, and it is provably green on attributes no
client can reach.

---

## 1. Current true coverage, per direction

### 1.1 Direction A — control with no capability: COVERED, hard gate, green

`check-dead-controls.js` runs with `--check` in both `prebuild` and `prestart`
(`package.json` `prebuild` / `prestart`), so `npm run build` fails on a net-new finding.

Live run (2026-08-03):

```
[check-dead-controls] OK — 0 net-new dead controls across 84 blocks + 12 extension file(s).
```

`scripts/dead-controls-baseline.json` holds **0** accepted entries — genuine zero tolerance,
not a green reading bought with baselined debt.

**What it catches.** Three checks: per-block controls (`check-dead-controls.js:431`), shared
`ContainerWrapperControls` (`:511`), extension-registered controls (`:652`). An attribute is
a finding when it is written by a control but its name appears in none of the block's `.php`
files / `save.js` / `*view*.js` / the shared `includes/` corpus (`:494–503`).

**Verification of its main theoretical weakness.** Its consumption test `isConsumed`
(`check-dead-controls.js:268`) is a bare word-boundary match against a corpus that includes
**every** `.php` file under `includes/` (`:232`, `:443`) — measured at **1,969,618
characters**. That is large enough that generic attribute names could be cleared by
coincidence, producing false negatives. I measured it rather than asserting it:

| Measure | Value |
|---|---|
| Controlled attrs the gate clears as consumed | 1,039 |
| …that also survive a STRICT key-form test (`$attributes['x']` / `'x' =>` / `attributes.x`) | 1,019 |
| …cleared **only** by a loose word match in the shared corpus, never a key anywhere | **0** |

*(probe: scratchpad `probe-a.js`.)* The 20 that fail the strict test all match inside their
**own** block's render files, i.e. legitimately dynamic key construction — the case
`PREFIXED_HELPER_SUFFIXES` (`check-dead-controls.js:365`) already exists to resolve. **The
shared-corpus collision risk is real in principle and empirically zero today.** Direction A
does not need re-engineering.

**What Direction A still misses** (three residual variations, section 4):
inert-consumption (name present, value never emitted), never-true control gating, and
tier-asymmetric consumption.

### 1.2 Direction B — capability with no control: NOT COVERED

**Manifest adoption is high; manifest *coverage of capability* is not.**

| Measure | Value | Source |
|---|---|---|
| Block dirs with a `block.json` | 84 (85 dirs; `extensions` has none) | filesystem parse |
| Blocks declaring `supports.sgs.elements` | **79** | JSON parse **and** `check-element-manifest-conformance.js --json` `manifested_count: 79` |
| Blocks with no manifest | **5** — `image-sequence`, `site-footer`, `site-footer-row`, `site-header`, `site-header-row` | same two sources |

**Blocks without a manifest pass silently.** `analyseBlock` returns `false` at
`check-element-manifest-conformance.js:502` (`// no manifest — skip`); the caller only
increments `skipped_count` (`:683–685`); `main()` ends with `process.exitCode = 0` (`:738`,
WARN-ONLY). No warning is emitted per skipped block. So 5 blocks are invisible, and the
other 79 are advisory-only.

**The decisive finding: the manifest cannot detect Direction B at all.**

`sgs/business-info` declares an `icon` element whose `attrMap` maps `css:color` →
`iconColour` (`src/blocks/business-info/block.json:242`). The conformance script reports:

```
ok text  css:color -> textColour  via default-attr
ok label css:color -> labelColour via default-attr
ok icon  css:color -> iconColour  via attrMap-attr
```

All three attributes are consumed at render (`business-info/render.php:55`, `:57`). And
`grep -c iconColour src/blocks/business-info/edit.js` returns **0** — there is no editor
control for any of them. **Three green `[OK]`s for three colours no client can change.**

This is structural, not a bug: `resolveMember` (`:177–227`) resolves a member against
`blockJson.attributes` and `blockJson.supports` only. It never opens `edit.js`. Its ORPHAN
scan (`:426–494`) is likewise attribute-vs-attribute. **The element manifest measures
attribute existence. Direction B is about control existence. They are different questions
and no current tool asks the second one.**

The one partial exception: `check-duplicate-controls.js` CHECK 1 emits severity `shadow` /
`scoped-shadow` for an attribute "declared in block.json and consumed in render.php but has
NO editor control of its own" — **37 findings**. That is a genuine Direction-B detector, but
scoped exclusively to the hover-effects family.

**Measured Direction-B surface** (probes `probe-b.js` → `probe-c.js`; every candidate
re-tested with a strict key-form consumption test, then checked for the attribute name
appearing *anywhere* in the block's editor sources):

| Bucket | Count |
|---|---|
| Raw candidates (declared, not written by a recognised control shape) | 313 |
| − discarded: generic-token collision, not strictly consumed | 28 |
| − discarded: name present in editor sources → wiring shape the extractor missed (probe artefact, **not** a defect) | 142 |
| **Attributes declared + strictly consumed + absent from all editor sources** | **143** |
| − already reported by `check-duplicate-controls.js` (hover family) | 27 |
| **NET-NEW, caught by no script in the repo** | **116** |

And the element axis:

| Measure | Value |
|---|---|
| Distinct BEM base elements emitted across the 79 manifested blocks (render/save/view + `style.css`, `--modifier` folded into base) | 496 |
| Element keys declared across all 79 manifests | 267 |
| **Emitted but not declared in any manifest** | **407 (82%)** |

Only **17.9%** of the elements these blocks actually render are visible to the
cluster-coherence rule. Four blocks declare exactly one element while emitting many:
`sgs/google-reviews` (declares 1, emits 35), `sgs/trustpilot-reviews` (1 / 27),
`sgs/product-search` (1 / 16), `sgs/buybox` (1 / 15).

**Coverage summary.** Direction A: ~100% of the detectable surface, hard-gated, zero
baseline. Direction B: roughly **19%** — 37 hover findings from `check-duplicate-controls.js`
against a measured 143-attribute surface, plus zero coverage of the element axis. The manifest's
"79 of 84 blocks" is coverage of *blocks*, not of *capability*.

---

## 2. What "capability" means computably

Four candidate sources, assessed against the evidence:

| Source | Answers | Verdict |
|---|---|---|
| `block.json` `attributes` + `supports` | "what data does this block store / what native panels does WP mount?" | **Authoritative for the attribute axis.** Machine-readable, versioned with the code, and the same file the control layer is written against. It is what `check-dead-controls.js` and the manifest already trust. |
| `supports.sgs.elements` manifest | "which parts has an author *declared*?" | **Not authoritative** — hand-authored, unverified against render, and 82% incomplete on the element axis. It is a *declaration of intent*, useful as a labelling layer, never as ground truth. |
| `render.php` / `save.js` / `view.js` | "which elements are emitted, which attributes are read?" | **Authoritative for the element axis.** It is the only artefact that knows what the block actually paints. BEM classes `sgs-<block>__<element>` are a reliable, project-mandated extraction key (Spec 00 §3.1). |
| `style.css` | "which CSS properties are honoured?" | **Supporting, not primary.** Already mined by `check-hardcoded-render-defaults.js` for the *literal-value* case. Useful to confirm an element is styleable at all. |
| DB `block_attributes.css_property` / `css_element` / `css_tier`, `block_capabilities`, `block_composition` | "which CSS property does this attribute drive?" | **Authoritative for the property *label*, not for capability presence.** See below. |

**On the DB.** The project rule is DB-first, no hardcoded dictionaries — and the right
reading of that rule here is *use the DB for the vocabulary, not for the population*.
Measured (2026-08-03, `sgs-db.py`):

| Column | Rows populated / 2,972 |
|---|---|
| `css_property` | 863 (29%) |
| `css_element` | 760 (26%) |
| `css_tier` | 154 (5%) |
| `role` | 1,006 (34%) |

`block_capabilities` holds only 96 rows across 50 blocks, and its vocabulary is semantic
(`form-input`, `social-proof`, `carousel`) — a taxonomy for the cloning pipeline, not a
control-surface inventory. Critically, `css_property` is a **derived** column, generated by
`scripts/behavioural-analyser/extract-signatures.py` from render.php's custom-property
wiring into style.css, and `sgs-update-v2.py:547–553` warns that a direct write "WILL be
wiped by the next `/sgs-update` run". A detector that treated a NULL `css_property` as
"this attribute drives no CSS" would report snapshot staleness as capability absence — the
exact failure mode `check-element-manifest-conformance.js:122–142` already documents for its
own role map (`orphan_role_map_stale`, currently **5**).

**Recommendation — authoritative source per direction:**

- **Direction A (control → capability): `block.json` + the block's own render files + the
  shared `includes/` corpus.** Unchanged. Already correct, already hard-gated, empirically
  free of the shared-corpus false negative.
- **Direction B (capability → control): the block's own render files (element axis) +
  `block.json` `attributes` (attribute axis), with the DB and the manifest as *labelling*
  layers only.** The DB supplies the property name and role for triage — exactly how
  `classifyOrphan` already uses `attr-role-map.json` — and must never be the presence test.
  A missing DB row means "unclassified", never "no capability".

---

## 3. Variation taxonomy with detector rules

Severities: **DEFECT** (client cannot reach a real capability), **GAP** (detection surface,
needs triage), **INFO**.

### Direction A variations

**A1 — Control writes an attribute nothing consumes.** *Covered.*
Signature: attr in `collectControlledAttrs(edit.js)` ∩ `block.json.attributes`, absent from
own render corpus + shared corpus. Scale: **0 net-new** live. Owner:
`check-dead-controls.js:494`. FP risk: LOW — measured zero shared-corpus false clears.

**A2 — Shared-component control nothing consumes.** *Covered.* `check-dead-controls.js:511`.

**A3 — Extension-panel control nothing consumes.** *Covered.* `check-dead-controls.js:652`,
with `fxPreset` as the one documented exemption (`:95–106`).

**A4 — Inert consumption: attribute read but never emitted.** *NOT covered.* `isConsumed`
matches a name, so `$x = $attributes['foo'];` with `$x` never printed reads as consumed.
Signature: attr appears in a `$var = $attributes['x']` assignment whose `$var` never reaches
an `echo`/`printf`/`esc_*`/interpolation. Scale: unmeasured. Owner: extend
`check-dead-controls.js` (it already builds `_build_var_map`-style analysis in
`extract-signatures.py:167`). FP risk: **HIGH** — PHP dataflow is genuinely hard; ship
WARN-only.

**A5 — Control gated behind a never-true condition.** *NOT covered.* Signature: a JSX control
inside `{ cond && ... }` where `cond` resolves to an attribute compared against a value
outside its `block.json` `enum`. Scale: unmeasured. Owner: new rule in
`audit-inspector-conformance.js` (it already runs `@babel/parser`, so the AST is in hand).
FP risk: **HIGH** — most conditions are legitimately runtime-variable. Restrict to the
enum-mismatch case only, where the condition is *statically* unsatisfiable.

**A6 — Control for one tier, consumption for all three.** *NOT covered* (the inverse, B4, is
the common shape). FP risk: MEDIUM.

### Direction B variations

**B1 — Rendered element with no controls at all.** *NOT covered. Biggest blind spot.*
Signature: a BEM class `sgs-<block>__<element>` (modifiers folded to base) present in the
block's render/save/view/`style.css`, whose normalised name matches no key in
`supports.sgs.elements`. Scale: **407 of 496 emitted base elements (82%), across 52 blocks**.
Examples:
- `src/blocks/google-reviews/block.json` declares exactly one element (`wrapper`), while
  `google-reviews/render.php:425` emits `sgs-google-reviews__aggregate`, `:427`
  `__aggregate-text`, `:430` `__count`, `:437` `__google-logo` — 35 emitted, 1 declared.
- `sgs/buybox` declares 1, emits 15 (`notify`, `notify-heading`, `notify-form`, …).
- `sgs/product-search` declares 1, emits 16 (`form`, `field-wrap`, `input`, `submit`, …).
Owner: **new rule inside `check-element-manifest-conformance.js`** — it already owns the
manifest and the element vocabulary; this is the missing *backwards* check on the element
axis, exactly parallel to what its ORPHAN scan (`:426`) does on the attribute axis. Report as
`ELEMENT_UNDECLARED`. FP risk: **MEDIUM** — many emitted classes are structural
(`inner`, `track`, `viewport`), state (`live-region`, `status`) or icon-internal (`arc`,
`ring`, `glow`) and correctly carry no controls. Mitigation: report as GAP requiring an
explicit manifest entry **or** an exception line — force the judgement to be recorded, do
not guess it.

**B2 — Attribute consumed by render with no inspector control.** *Covered only for hover.*
Signature: attr ∈ `block.json.attributes`, strictly consumed (`$attributes['x']` key form),
and absent from every editor-side `.js` in the block dir + shared components + extensions.
Scale: **143 total; 116 net-new** after subtracting `check-duplicate-controls.js`'s 37.
Examples:
- `conditionalField` / `conditionalOperator` / `conditionalValue` on **all 14**
  `form-field-*` blocks (e.g. `src/blocks/form-field-email/block.json:90`, `:94`, `:98`),
  consumed at `includes/forms/field-render-helpers.php:30` and `:54–55` where they become
  `data-conditional-*` attributes. Zero occurrences in any `form-field-*/edit.js`. **42
  attributes = conditional form logic that is entirely unreachable.**
- `src/blocks/business-info/block.json:54` `iconColour`, `:62` `labelColour`, consumed at
  `business-info/render.php:55`, `:57`; zero occurrences in `business-info/edit.js` — while
  the manifest reports all three as `[OK]`.
- `src/blocks/buybox/block.json:104` `showLadder`, `:109` `framingMode`, consumed at
  `buybox/render.php:507` and `:151`; no control.
Owner: **`check-dead-controls.js`, as a mirrored CHECK 4.** It already holds both corpora and
the mature control-shape extractor; splitting the two directions across two scripts would
guarantee the extractors drift. FP risk: **HIGH by default** — see the polarity warning in
§3.1 below; mitigated to LOW by the two-stage test (strict consumption, then
name-absent-from-editor-sources), which cut 313 raw candidates to 143.

**B3 — CSS property honoured in `style.css` with no attribute behind it.** *Partly covered,
inverted.* `check-hardcoded-render-defaults.js` catches a hardcoded literal for a property an
attribute *does* own (F3). The uncovered half: a property styled with a literal where **no**
attribute exists at all. Signature: a declaration in `style.css` whose property is in the
cluster-member vocabulary (`cluster-member-sets.json`, 58 members) and whose value is a
literal, on a selector whose BEM element resolves to no attribute via `css_property` +
`css_element`. Owner: extend `check-hardcoded-render-defaults.js` (it already parses
`style.css` declaration-by-declaration). FP risk: **HIGH** — most literals are legitimate
component constants under the Bean-locked default-vs-hardcode test. Ship INFO-only, and use
the DB `css_property`/`css_element` pair only to *label*, never to decide presence.

**B4 — Control for desktop only where render honours all three tiers.** *NOT covered.*
Signature: `{base}Tablet` / `{base}Mobile` declared and strictly consumed, `{base}` has a
control, tiers have none — after resolving responsive descriptor objects. Scale: 49 raw
candidates, but spot-checking showed the overwhelming majority are probe artefacts
(`before-after/edit.js:547–549` wires `{desktop:'height', tablet:'heightTablet',
mobile:'heightMobile'}`; `media/edit.js:320–321` passes `borderRadiusTablet: {}` into a
component). Confirmed genuine: `sgs/option-picker` `borderRadiusTablet` / `borderRadiusMobile`,
`sgs/physics-canvas` `contentBandPaddingTablet` / `…Mobile`. Owner: `check-control-ux.js` —
it already owns responsive-family analysis, including the documented dynamic-key blind spot.
FP risk: **HIGH** unless descriptor-object resolution lands first.

**B5 — Native `supports` capability with no reachable panel.** *NOT covered.* Signature:
`supports.color` / `spacing` / `typography` declared with
`__experimentalSkipSerialization`, but the block emits no scoped rule for it. INFO-only.

### 3.1 The polarity warning — why Direction B cannot reuse Direction A's extractor as-is

`collectControlledAttrs` is **deliberately conservative in Direction A's favour**. Every
control shape it fails to recognise makes the *controlled* set smaller, which in Direction A
means fewer dead-control findings — a safe false negative. Point the same set at Direction B
and the identical miss becomes a **false positive**: the attribute looks uncontrolled.

Three mechanisms measured, all of which must be fixed before B2/B4 can be anything but noise:

1. **Curried setter factory.** `src/blocks/gallery/edit.js:188` —
   `const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );` then
   `onChange={ set( 'aspectRatio' ) }`. Also `src/blocks/post-grid/edit.js:298`. The
   extractor knows `update( 'x' )` (`check-dead-controls.js:207`) but not this. **41 false
   positives across 2 blocks.**
2. **Bespoke responsive descriptor object.** `src/blocks/button/edit.js:146–148`
   (`WIDTH_BREAKPOINTS`), `src/blocks/before-after/edit.js:547–549`. The existing regex only
   matches a literal named `attrMap` / `ATTR_MAP` (`check-dead-controls.js:192–193`).
   Generalise to any object literal whose keys are a subset of
   `{desktop, tablet, mobile, base}` with string-literal values (or nested objects with
   string-literal values). Dominant source of B4 noise.
3. **`KEY_NOISE`.** `check-dead-controls.js:112` drops `id`, `url`, `alt` from the controlled
   set. Correct for Direction A; in Direction B it falsely orphans `src/blocks/button/edit.js:299–300`,
   which genuinely writes `url`. Direction B must use a `KEY_NOISE`-free controlled set.
4. **`prefix=""`.** `src/blocks/text/edit.js:327–330` mounts `TypographyControls prefix=""`,
   claiming the bare attrs `fontSize` / `lineHeight` / …. Direction B must honour the
   empty-prefix case — the same trap `check-element-manifest-conformance.js:197–203`
   documents having already shipped once.

**Structural recommendation.** Extract the control-shape parser into one shared module
consumed by both directions, with a per-direction polarity flag. Two copies will drift, and
drift in Direction B's copy manufactures false defects.

---

## 4. Exception model

The captured lesson `extension-registered-attrs-invisible-to-blockjson-audits` — JS-filter
attrs raising false HIGHs in `block.json` audits — is precisely this rule's failure mode.
Six exception classes, each with a *mechanical* discriminator so the rule never hand-judges:

| # | Class | Discriminator (mechanical) | Must not be flagged in |
|---|---|---|---|
| E1 | **WP-injected from `supports`** — `backgroundColor`, `textColor`, `style`, `fontSize`, `gradient`, `borderColor`, `anchor`, `className`, `lock`, `metadata` | Attribute name is in WP core's supports-injected set **and** the block declares the matching `supports` key. Derived from `block.json` `supports`, not a name list. | B2 |
| E2 | **Extension-registered** (`sgs*`) | Name present in `includes/extension-attributes.generated.php` — the identical test `check-dead-controls.js:134–145` already uses. Never the `sgs` prefix alone (`:126`). | A1, B2 |
| E3 | **Cloning-pipeline / converter-only** | Attribute is written by the converter but has no client-facing purpose. **No mechanical discriminator exists today** — this is the one class needing a new declaration. Recommend a `block.json` marker: `"sgsAudience": "pipeline"` on the attribute, so the exception lives beside the attribute and versions with it. | B2 |
| E4 | **InnerBlocks-template / pattern-fed** | Attribute name appears as a key in an `InnerBlocks` `template` literal in the block's own `edit.js` (e.g. `src/blocks/cta-section/edit.js:39` seeds `sgs/heading` with `className: 'sgs-cta-section__headline'`, while the parent's own `headline` attr is legacy). | B2 |
| E5 | **Canvas-editable, not inspector-editable** | Attribute is bound to a `RichText`, `MediaPlaceholder`, `InnerBlocks` or `PlainText` `value` prop in `edit.js`. Client-editable in the canvas is *reachable* — the rule is control↔capability parity, not sidebar parity. | B2 |
| E6 | **Internal state / non-visual** | DB `block_attributes.role` ∈ the non-style set — the same `STYLE_ROLES` split `check-element-manifest-conformance.js:101–111` already applies. Report as `by-design`, never as a defect. Where the DB has no row, report `unclassified` and surface staleness separately (`orphan_role_map_stale`), never silently as by-design. | B1, B2, B3 |
| E7 | **Structural / state-only element** | An emitted BEM element carrying no styleable declaration in `style.css` beyond layout plumbing (`inner`, `track`, `viewport`, `live-region`, `honeypot`). Requires an explicit manifest entry or exception line — a judgement, so it must be *recorded*, not inferred. | B1 |

**Exception file shape.** Follow the established `dead-controls-baseline.json` contract
(reason-per-entry, empty = zero tolerance) rather than inventing a new format —
`scripts/control-capability-parity-exceptions.json`:

```json
{
  "_meta": {
    "purpose": "Bidirectional control<->capability parity: accepted non-defects.",
    "rule": "Every entry carries a reason and an exceptionClass from E1-E7. An entry with no reason is invalid and fails the gate's --self-test.",
    "regenerate": "never auto-generated; each line is a recorded human judgement"
  },
  "accepted": [
    {
      "direction": "B",
      "rule": "B1-element-undeclared",
      "block": "sgs/post-grid",
      "target": "live-region",
      "exceptionClass": "E7",
      "reason": "ARIA live region — announces filter results to screen readers; carries no styleable surface a client would set."
    },
    {
      "direction": "B",
      "rule": "B2-capability-no-control",
      "block": "sgs/cta-section",
      "target": "headline",
      "exceptionClass": "E4",
      "reason": "Legacy scalar; the client edits this through the sgs/heading child seeded by the InnerBlocks template at edit.js:39."
    }
  ]
}
```

Three properties this shape must keep, all lifted from gates that already earned them:
`--self-test` proving each rule can still fail (`check-dead-controls.js:857`); a reason
mandatory per entry; and a **stale-vs-absent** distinction on any DB-derived classification
(`check-element-manifest-conformance.js:122–142`) so a stale snapshot can never read as
"by design".

---

## 5. Proposed checklist item

To be appended to `.claude/plans/spec-35-inspector-DONE-checklist.md` as item 22, in the
house style (bold lead, plain-English body, spec cite, `**[enforced by]**` tag naming the
real state of enforcement — the existing items are scrupulous about saying UNENFORCED where
that is true, and this one must be too):

```markdown
- [ ] **22. Bidirectional control↔capability parity.** Every element the block renders and
  every CSS property it honours is reachable by the client from the inspector (or the
  canvas), AND every control shown maps to something the block genuinely does. No orphans in
  either direction. Exceptions are recorded per-entry in
  `scripts/control-capability-parity-exceptions.json` with an E1–E7 class and a reason —
  never silently skipped (STOP-29). *(Spec 35 A6, F; extends R-31-9 to the control surface.)*
  **[enforced by]** **Direction A** (control→capability) — `check-dead-controls.js`, a HARD
  prebuild gate, 0 baselined entries, green across 84 blocks + 12 extension files.
  **Direction B** (capability→control) — PARTIAL: `check-duplicate-controls.js` covers the
  hover family only (37 findings). The element axis (B1) and the general attribute axis (B2)
  are UNENFORCED pending the new rules specified in
  `.claude/reports/2026-08-03-spec35-scanner/05-control-capability-parity.md` §3.
  `check-element-manifest-conformance.js` does NOT cover Direction B — it resolves attribute
  EXISTENCE, never control existence, and is verifiably green on attributes with no control
  (`sgs/business-info` `iconColour`/`labelColour`/`textColour`, all `[OK]`, all absent from
  `edit.js`).
```

**Ownership summary for implementation:**

| Rule | Owner | Posture |
|---|---|---|
| A1–A3 | `check-dead-controls.js` | already hard gate — no change |
| A4, A5, A6 | `check-dead-controls.js` (A4) / `audit-inspector-conformance.js` (A5, A6) | new, WARN-only |
| **B1 element-undeclared** | `check-element-manifest-conformance.js` (new backwards element scan) | new, WARN-only → gate at Spec close |
| **B2 capability-no-control** | `check-dead-controls.js` as CHECK 4, sharing one extractor with CHECK 1 | new, WARN-only → gate at Spec close |
| B3 property-no-attribute | `check-hardcoded-render-defaults.js` | new, INFO-only |
| B4 tier-asymmetry | `check-control-ux.js` | new, blocked on descriptor-object resolution |

**Sequencing.** B2 must not ship before the shared control-shape extractor lands with the
four fixes in §3.1 — 313 raw candidates reduce to 143 with strict consumption plus the
name-absence test, and the residual noise is dominated by exactly those four shapes. A
Direction-B gate that ships on today's extractor would flag ~170 non-defects on its first
run and be baselined into uselessness within a session.

---

## Evidence log

Every load-bearing claim has two independent sources.

| Claim | Source 1 | Source 2 |
|---|---|---|
| 79 blocks manifested / 5 not | JSON parse of all 84 `block.json` | `check-element-manifest-conformance.js --json` → `manifested_count: 79`, `skipped_count: 5` |
| Unmanifested blocks pass silently | `check-element-manifest-conformance.js:502` `return false` | `:738` `process.exitCode = 0` |
| Direction A is a hard, zero-baseline gate | `package.json` `prebuild`/`prestart` run `--check` | `dead-controls-baseline.json` `accepted: []`; live run "0 net-new … 84 blocks + 12 extension file(s)" |
| Shared-corpus false clearing is empirically zero | `probe-a.js`: 1,039 cleared, 1,019 strict-consumed, 0 shared-only | corpus size measured at 1,969,618 chars — the risk is real, the incidence is not |
| Manifest is green on uncontrolled attrs | `check-element-manifest-conformance.js --json` → 3× `ok` for `sgs/business-info` | `grep -c iconColour business-info/edit.js` = 0; consumed at `render.php:55`,`:57` |
| Conditional form logic unreachable | `form-field-email/block.json:90,94,98` + 13 sibling blocks | consumed `includes/forms/field-render-helpers.php:30`,`:54–55`; 0 hits in all 14 `edit.js` |
| 407/496 elements undeclared | `probe-b.js` BEM extraction, modifiers folded | spot-verified: `google-reviews/render.php:425,427,430,437` vs `block.json` declaring `['wrapper']` |
| DB columns are sparse | `sgs-db.py` counts: 863/760/154/1006 of 2,972 | `sgs-update-v2.py:547–553` — derived columns, wiped on reseed |
| FP polarity mechanisms | `gallery/edit.js:188`, `post-grid/edit.js:298`, `button/edit.js:146–148`, `before-after/edit.js:547–549`, `text/edit.js:327–330` | `probe-c.js` split: 142 of 313 candidates have the name present in editor sources |

**Probe integrity note.** The first version of the Direction-B probe returned 0 findings
across 2,478 attributes. That was a probe defect, not a clean codebase: a shell heredoc
stripped one backslash, so `'\\b' + attr + '\\b'` became the string `\x08attr\x08` (backspace
characters) and the regex could never match. Caught by a negative control asserting a
known-consumed attribute (`sgs/hero` `headline`, present 28× in `render.php`) must test true.
All probes were subsequently written via the Write tool with the word boundary built as
`String.fromCharCode(92) + 'b'`, and carry a `SELFTEST=1` mode asserting both a true positive
and a true negative. This is the `a-probe-that-never-reaches-the-effect-measures-the-probe`
failure mode, and the reason every number above was re-derived after the fix.
