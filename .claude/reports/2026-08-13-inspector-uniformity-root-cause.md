---
doc_type: report
title: "Inspector uniformity — problem, root causes, spec vs enforcement gaps, and solutions"
date: 2026-08-13
status: FINDINGS — no code changed by this investigation
investigators: 5 parallel subagents + main-thread fact-check
governing_spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
governing_contract: .claude/plans/spec-35-control-type-contract.md
supersedes_nothing: this ADDS to the record; see PART 6 for its effect on the Track 1b plan
---

# Inspector uniformity — root-cause findings

> # ⛔ STOP — READ THIS BLOCK BEFORE ANY OTHER LINE
>
> A `/qc-council` validation pass (2026-08-13, after PARTS 9-11 were written) found that
> **this document would mislead a cold session in five specific ways.** All five verified in
> the main thread. The banner that used to sit at line ~508 was **below every solution**, so
> a top-down reader met "S1 — the single highest-leverage change" ~200 lines before the
> warning that kills it. That is why this block is here instead.
>
> **1. PARTS 1-8 CONTAIN 12 VERIFIED ERRORS (§9.3, E1-E12).** They were banner-ed, not
> rewritten. Overturned text still reads as instruction — e.g. `:369` still says *"One fix,
> 51 defects"* (impossible, E1) and all of S1 still reads as buildable (killed, §9.7).
> **Treat PARTS 1-8 as a historical record, not a work list.**
>
> **2. ⛔ TASK 1 (the converter bug, §9.8) IS ALREADY RULED AND MUST NOT BE RE-PROVEN.**
> `decisions.md` **D554 ruling C** states the converter **deliberately stays flat until the
> Spec 39 rework, and a shim was rejected by name**. **12 tests already carry
> `@pytest.mark.xfail(strict=True)`** citing D554 (e.g. `converter/tests/test_css_resolvers.py:48`
> asserts exactly this flat-vs-object `max-width` divergence), and
> `.claude/plans/2026-08-12-converter-db-drift.md` already documents it.
> **§9.8 is not an undiscovered bug — it is an accepted, already-encoded consequence.**
> Its correct status: **a REQUIREMENT for the Spec 39 rework**, not a fix. Re-proving it
> would spend a session duplicating an existing artefact.
>
> **3. ⛔ THE GIT STATE IN PART 11 IS WRONG.** It says the branch is *"pushed, NOT merged"*.
> **It IS merged** — `e5c027d6` on `main`. Two commits landed after it and this report is
> blind to both: `1e50e852` (hero object-fit cleanup) and **`b47bc24b` — a new structural
> guard for editor-canvas desync, shipping `plugins/sgs-blocks/scripts/check-editor-render-parity.js`.**
> That file is **directly adjacent to S1's problem space** and may already do part of the job
> S1 proposed. **Read it before designing any editor-canvas measurement.**
> **Work on `main` in the PRIMARY worktree.** The worktree `t1b-blocks-scripts` holds the old
> branch at `f99dfea9`, now behind `main`.
>
> **4. ⛔ Q1 AND Q2 ARE SUBSTANTIALLY ANSWERED BY THE REPO. Do not ask Bean cold.**
> `.claude/plans/2026-08-05-pipeline-rearchitecture-design.md` — front matter reads
> *"status: DESIGN v2 — shape approved by Bean (IR-centred, big-bang build,
> delete-don't-demote)… becomes a NEW spec (39). Open decisions in §12."*
> **Read it first**, then ask Bean only what its §12 leaves open. PART 10's preamble
> (*"Nothing below is answerable from the repo"*) is **FALSE** and is corrected in §10.0.
>
> **5. The reading gate in PART 11 is incomplete.** It omits `.claude/LEDGER.md` (the
> project's living-status doc, which currently points at hero work and never mentions this
> report), the pipeline re-architecture design above, `decisions.md` **D554** and **D566**,
> and — if TASK 1 is touched at all — Spec 31, whose full-read is Bean-locked for any
> cloning-pipeline session.
>
> **Amended reading order:** this block → §9.3 (the 12 errors) → PART 11 → PART 10 →
> `.claude/LEDGER.md` → `2026-08-05-pipeline-rearchitecture-design.md` → `decisions.md`
> D554 + D566 → then PARTS 1-8 **as history only**.

## PART 0 — How to read this, and what is trustworthy

Bean photographed a handful of inspector defects and asked for the **root causes and
systemic gaps**, not a patch list, explicitly: *"we need to be solving this universally
across all blocks, properties, settings and control types."*

Five investigations ran in parallel: native source-of-truth, defect root-cause, enforcement
audit, grouping-design research, and a universal divergence census.

⛔ **Two of the five contradicted each other on the single most load-bearing number, and one
was wrong.** Both were fact-checked against WordPress core source before anything below was
written. **Do not treat a subagent figure in this document as verified unless it is marked
so.** The corrections are recorded in PART 5, because the corrections are themselves
findings about method.

**Confidence key used throughout:**
- ✅ **VERIFIED** — checked in the main thread against source or a live measurement
- ◐ **REPORTED** — a single investigation's measurement, method stated, not independently re-checked
- ⚠ **UNPROVEN** — a hypothesis that still needs a measurement

---

## PART 1 — The problem, stated once

The inspector is not uniform. The same property is controlled different ways in different
blocks; the same control renders at different widths, with different icons, different label
casing, and sometimes with its label printed twice. Bean found all of it **by eye**, in a
tree carrying 43 prebuild gates and 15 scanner rules.

The observed defects are symptoms. The report's purpose is the layer beneath them.

---

## PART 2 — THE ROOT CAUSE

There is one, and everything else is downstream of it.

> ## Nothing in the apparatus measures the rendered inspector.

✅ **VERIFIED.** Every inspector check in the tree is a Babel AST walk over `edit.js` source.
Six scripts drive a real browser; five of them open only the **frontend**. Three open the
editor, and between them they assert: that one node is painted, that a store value changes,
that an iframe resizes, that no CSS warning fires, and that N panel bodies exist.

**No check reads a label's text. None reads a control's width. None compares two controls.
None looks at casing, ordering, or alignment.**

Every defect Bean photographed is a property of *painted output*. A static parser cannot
express those assertions, so no author ever wrote one. **The apparatus is not
under-enforcing its rules — it is enforcing a different object**: the source that *declares*
controls, never the sidebar that *renders* them.

### 2.1 The mechanism that guarantees it stays invisible

✅ **VERIFIED.** The only pixel-measuring gate in the commit path is the pre-commit
visual-diff gate. `.githooks/sgs-gates.sh` routes inspector changes to
`check-editor-only.py`, which **exempts them**. Its own docstring:

> *"Decides whether a staged change to a block is EDITOR-ONLY… Such a change cannot alter
> frontend first paint, so demanding a first-paint capture asks a question the change cannot
> answer."*
> *"This is a recurring class, not a one-off: **every future inspector-control change hits
> the identical wall**."*

The reasoning is correct on its own terms — a *frontend* capture genuinely cannot answer an
*inspector* question. The consequence is that **an inspector-only commit passes every gate
in the repository without any surface being looked at.**

⚠ **This is not hypothetical, and the author of this report walked into it the same day.**
A 724-site control codemod was committed hours before this investigation. The gate output
reads `⊙ accordion: editor-only (edit.js) — visual gate N/A`, repeated for **78 blocks**.
Every inspector in the plugin changed; nothing looked at one.

### 2.2 The conclusion was already written down, twice, and not acted on

✅ **VERIFIED.** Spec 35 Part M:

> *"**Also outstanding across the board:** editor-CANVAS verification — everything to date
> verified by frontend render + REST attribute registration, never by opening the block
> editor."*
> *"**Only opening the editor finds this class**, which is the same conclusion D567 reached
> independently the same day from the other track."*

So this is not a knowledge gap. The diagnosis existed, was recorded twice, and no gate was
built from it. **That is the real methodology failure: a correct diagnosis with no
structural consequence.** It is the same shape as the sibling failure in §3.4.

---

## PART 3 — SECONDARY ROOT CAUSES

Four independent causes, each sufficient on its own to produce divergence.

### 3.1 Our own wrapper components render a second visible label

✅ **VERIFIED against core source at the pinned SHA.**

`ResponsiveControl` (`:133-137`) and `ResponsiveOverride` (`:94-96`) each render their own
`<span>` label, *and* the child control renders its label too. Two labels paint. The wrapper
span is unstyled, so it shows sentence case; the child's goes through WP's own label styling,
which uppercases. That is Bean's `Line height` / `LINE HEIGHT`.

**The correct pattern already exists in this tree** — `ResponsiveBoxControls` and
`TypographyControls` pass `hideLabelFromVision` to their children. It was simply not applied
at the other call sites.

**Scale:** ◐ **51 genuine cases across 13 blocks** (`nav-menu` 12, `brand-strip` 6, `button`
6, `hero` 6, `media` 5 …), of which 5 are exact echoes.

### 3.2 Nothing constrains control width — and WordPress's default is 100%

✅ **VERIFIED at core source.** `input-control-styles.tsx:107`:

```ts
if ( ! __unstableInputWidth ) {
    return css( { width: '100%' } );      // ← the stretch, by default
}
```

✅ **VERIFIED in-tree:** `__unstableInputWidth` appears **0 times** in `src/`, against **72–75**
`UnitControl` call sites. `HStack` appears **once** in the entire tree. **No SGS CSS styles
the block inspector at all** — the 10 `.components-*` rules that exist are for canvas
previews and the device toggle.

Core never leaves width unset. It uses four strategies: `__unstableInputWidth="auto"`, a px
literal, `max-width: 90px` on a styled wrapper, or `flex: 0 0 auto` + a 40/60 basis split.

◐ **98.7% of controls (1,637 of 1,658) render as bare full-width stack items.** Only 21 are
inside any layout primitive.

### 3.3 One capability, many implementations — because the shared component is optional

◐ **REPORTED** (AST census, 353 files, 0 parse errors, 1,658 control instances):

| Family | Distinct implementations | Blocks with no control at all |
|---|---|---|
| Width / height | **11** | 28 |
| Typography | **8** | 4 |
| Border | **7** | 9 |
| Gap | **7** | 4 |
| Grid / flex | **6** | 28 |
| Colour | **5** | 51 |
| Padding / margin | **5** | 14 |
| Shadow | **3** (7 by another count — see PART 5) | 14 |

**Shared-component bypass ratio** — the actionable number:

| Capability | Canonical | Using | Bypassing | Ratio |
|---|---|---|---|---|
| Icon | `IconPicker` | 13 | 0 | 13:0 |
| Colour | `DesignTokenPicker` | 41 | 3 | 14:1 |
| Box | `ResponsiveBoxControl` | 47 | 7 | 7:1 |
| Shadow | `ShadowControl` | 9 | 5 | 1.8:1 |
| **Media** | `MediaPicker` | 8 | **11** | **0.7:1** |
| **Length** | `UnitControl` shape | 12 | **17** | **0.7:1** |

Two capabilities are **bypassed more often than used**. `MediaPicker` is also the only
shared control not exported from the barrel — 8 blocks deep-import it by path.

### 3.4 Fixing one instance without immunising the class

✅ **VERIFIED.** The nested-panel defect was diagnosed and fixed on `sgs/hero` on
**2026-08-08**. The code still carries the explanation:

> *"The ToolsPanel label deliberately does NOT repeat the PanelBody title above it. It did
> until 2026-08-08, which rendered the same words twice in a row… A nested ToolsPanel names
> the CLUSTER it resets, not its parent."*

The label repetition was fixed on that one block. The **double panel nesting was not**, and
the fix was never generalised. ◐ **16–18 nested same-label pairs remain across 15 files.**

Same shape: `check-duplicate-controls.js` is wired into `prebuild` **and hard-codes
`exit(0)`** (`:834-835` *"Always exit 0 — WARN-ONLY by design"*) while currently reporting
**9 live findings that ship**.

---

## PART 4 — SPEC GAPS vs ENFORCEMENT GAPS

**This is the most decision-relevant section.** "Fix the gates" closes only two of nine.

| # | Defect | Verdict | Why |
|---|---|---|---|
| 1 | Duplicate labels | **SPEC GAP** | Nothing in Spec 35 or the contract says a visible label must appear once |
| 2 | Full-width stretch | **SPEC GAP (mostly)** | A9 *does* require in-row layout primitives; **width is defined nowhere**, and A9 has no rule |
| 3 | Box controls inconsistent | ⚠ **SPEC MANDATES THE SPLIT** | See §4.1 — this one is not a bug |
| 4 | Nested same-label panels | **SPEC GAP** | A6 bans duplicating a *native supports* panel; A5 mandates `ToolsPanel` at ~6 controls — **the spec's own remedy generates the defect** |
| 5 | Label casing | **SPEC GAP** | Zero references to casing in either document |
| 6 | Line-height unit | **SPEC SELF-CONTRADICTION** | Part H says `LineHeightControl`; contract §4.1 says `ResponsiveControl`+`UnitControl`. `LineHeightControl` has **0 usages** — implementation follows the contract |
| 7 | `info-box` duplicate controls | **ENFORCEMENT GAP** | A6 + CO-15 require it; CO-15 states its own status: **"Enforced by UNENFORCED"** |
| 8 | Shadow divergence | **ENFORCEMENT GAP** | Contract §11.3 enumerates five banned lookalikes; §11.5 records *"Real footprint 17 blocks; rule 07 reports 1"* |
| 9 | Device-toggle overlap | **SPEC GAP + a reversed design decision** | Placement was a design gate Bean ruled on; the overlap is a consequence nobody specified against |

**Tally: 6 spec gaps · 2 enforcement gaps · 1 self-contradiction.**

Six of these cannot be enforced because **there is nothing to enforce yet** — no canonical
label vocabulary, no casing rule, no width standard, no nested-panel rule, no sidebar-chrome
rule. Those need Bean-level decisions *before* any gate is written. Writing a rule first
would enforce a standard nobody chose.

### 4.1 ⚠ The box-control finding that contradicts the complaint

✅ **VERIFIED by direct read.** Contract §14.1:

> *"Radius is a **separate** control from width and style — that separation is the condition,
> not an implementation detail."*
>
> *"⭐ **AMENDED 2026-08-11 (D566). This field used to name core's `BorderBoxControl`, which
> has never existed in this tree.** It was carried as permanent open debt for months.
> **Resolved by evidence rather than by building it.**"*

So the four box controls differ **because the contract requires it**, and core's grouped
`BorderBoxControl` was deliberately rejected **two days ago on evidence**.

That does not make the visual mess acceptable — the icons, input widths and slider alignment
are genuinely inconsistent and nothing in the spec sanctions *that*. But it means:

1. The fix is **not** "adopt `BorderBoxControl`" without first reopening D566.
2. Bean's request for grouped one-row border controls **reverses a 2-day-old decision**. That
   is his call to make, but it should be made knowingly, not absorbed into a tidy-up.

### 4.2 Governance findings

- ✅ `rules.json`'s spec anchor points at **a tombstone** — `spec-35-inspector-DONE-checklist.md`,
  whose own front-matter reads `status: SUPERSEDED` / `governs: nothing`. **Ten of fifteen
  rules cite it as their `GROUND-TRUTH: spec=`.**
- ◐ Live mode split: **6 gate rules report 0 findings between them; 9 advisory rules carry 201.**
- ◐ Two scripts are invoked with `--check` and hard-code `exit(0)`; `check-dead-controls.js`
  CHECK 4/5 are pinned advisory by two local constants only a source edit can flip.
- ◐ Baselining is **not** the problem — only 13 findings are baselined tree-wide.

---

## PART 5 — FACT-CHECK RECORD

Recorded because the corrections are findings about method, not housekeeping.

### 5.1 ⛔ CORRECTED — "189 duplicate labels" was a false positive

The enforcement audit reported **189 `ToolsPanelItem`→child same-label pairs** as defects.
The census reported the same pattern as **correct**. ✅ **Settled against core source at the
SHA WordPress 7.0.4 actually pins:**

`tools-panel-item/hook.ts` destructures `label` at `:31`, uses it only as a menu key
(`:118` — *"`label` is used as a key when building menu item state"*), and the return at
`:204-209` omits it. `component.tsx` renders `<View>{children}</View>`.

**`ToolsPanelItem`'s label is never rendered in the panel body.** Core deliberately passes
the same string twice. **The true count is 51**, all from SGS wrappers.

⚠ **Had this gone unchecked, the remedy would have "fixed" 189 correct call sites.**

### 5.2 ⛔ CORRECTED — shadow mechanism count

One investigation reported **7** shadow mechanisms, another **3** families. Both used sound
methods on different denominators (implementation mechanisms vs DB-joined property families).
◐ Neither was independently re-verified. **Treat "several, at least 3, plausibly 7" as the
claim** and re-measure before acting.

### 5.3 ⛔ CORRECTED — grep inflation, self-caught

The census agent's own note: `ResponsiveControl` 22→13 blocks, `TypographyControls` 17→16 —
`grep -rl` counted **import lines and docblock mentions**. It re-checked with AST. This
codebase's docblocks name components constantly; **a grep over this tree measures prose.**

### 5.4 ⛔ CORRECTED — my own hypothesis

I proposed `ToolsPanelItem` label-stacking as the duplicate-label cause. **Wrong**, per §5.1.

### 5.5 ⛔ CORRECTED — my own parity claim

Earlier the same day I reported **10/10 property parity** against a native control and
called control parity proven. The measurement was true and the conclusion was not: it
sampled computed properties of *one* control against *one* native control. It could not have
detected duplicate labels, full-width stretch, inconsistent icons or misaligned sliders —
none are properties of the element sampled. **A green result on a too-narrow assertion**,
which is the exact failure Bean had warned about in the preceding message.

### 5.6 ⚠ UNPROVEN — device-toggle overlap has two candidate causes

Both need one live measurement to separate, and **they want different fixes**:
- **(a)** Reserved `padding-bottom: 84px` vs a dock measuring **~90px** → ~6px covered, plus
  an ~8px `box-shadow` band.
- **(b)** The padding is applied to `.interface-complementary-area` while the host is pinned
  to the outer shell. If the element that actually scrolls is deeper, the reserve sits on a
  non-scrolling ancestor → the full ~90px is covered.

### 5.7 ⚠ UNPROVEN — the `__next40pxDefaultSize` rendering consequence

The census flags that Gutenberg *trunk* now discards the prop. ✅ Independently measured on
the canary (WP 7.0.4): the prop **does** change rendering today — absent 32px/8px/grey,
present 40px/13px/blue. Both are true: load-bearing now, a no-op from 7.1. ⚠ **A future
cleanup exists** — 724 props become removable once on 7.1.

---

## PART 6 — SOLUTIONS

Ordered by leverage. **S1 is the one that matters**; without it every other fix is
unverifiable and will regress.

### S1 — Build an editor-canvas measurement gate (closes the root cause)

**The single highest-leverage change in this document.** Nothing else in the repo does this.

Build a Playwright gate that opens the **block editor**, mounts each block, and asserts
**rendered** inspector properties:

| Assertion | Catches |
|---|---|
| No visible label text appears twice within one panel | Defect 1 |
| Every control's rendered width ≤ its panel width, and equal for same-type controls | Defect 2 |
| Same-type controls share icon, input width, slider extent | Defect 3 |
| No panel's visible title equals an ancestor panel's title | Defect 4 |
| Every visible label matches the agreed casing rule | Defect 5 |
| Sidebar scroll bottom is reachable — no element overlays the last control | Defect 9 |

Design constraints, learned from this investigation:
- **Differential, not snapshot.** Compare against a real native control on the same page. A
  snapshot would have locked in the wrong 32px/grey state as "correct".
- **Non-vacuity gate.** Refuse a verdict when an element was not found — comparing two
  nulls is vacuously equal.
- **Assert breadth, not one property.** The failure this replaces is precisely a narrow
  green assertion (§5.5).
- ⚠ **Do NOT wire into `prebuild`** — it runs offline with no credentials, which is
  load-bearing. Standalone command + pre-merge, matching `check-device-toggle.js`.

**And amend `check-editor-only.py`**: an editor-only change must not be exempt from *all*
visual verification — it should be routed to S1 instead of waved through.

### S2 — Decide the six spec gaps (Bean-level; blocks their enforcement)

No rule can be written until these exist. Each is small to decide, and each unblocks a gate:

1. **Label casing.** ⚠ Core has a documented convention (`copy-guide.md`): **control labels
   sentence case, panel titles Title Case**, zero ALL-CAPS. Bean asked for Title Case
   everywhere. **These conflict.** Title Case everywhere = a deliberate divergence from
   native while the stated goal is to match native. ◐ Current spread: 61.5% sentence case,
   6.5% Title Case — so "Title Case everywhere" is **1,316 labels to change**; matching core
   is far closer to where the tree already is.
2. **One visible label per control** — and where it lives (wrapper or child).
3. **Control width standard** — adopt core's four strategies, or define ours.
4. **Nested-panel rule** — a `ToolsPanel` already renders a titled header, so the enclosing
   `PanelBody` is redundant chrome in every one of the 16 cases.
5. **Sidebar chrome rule** — may the sidebar be overlaid at all? (Bean's answer: no.)
6. **Line-height contradiction** — Part H vs contract §4.1. Implementation follows the
   contract; **retire the Part H line**.

### S3 — Make the shared components unavoidable

The bypass ratios in §3.3 are the target. Two capabilities are bypassed more than used.

- Export `MediaPicker` from the barrel (it is the only shared control imported by path).
- Delete `DeviceTabs` — ◐ zero live call sites, still exported.
- De-duplicate `BooleanResponsiveControl.js` — ◐ exists twice, code-identical.
- Fix the wrappers at source: make `ResponsiveControl`/`ResponsiveOverride` inject
  `hideLabelFromVision` into their child rather than relying on 100+ call sites remembering.
  **One fix, 51 defects.**

### S4 — Adopt the native source of truth (removes the guessing)

✅ **VERIFIED capability.** WordPress pins the exact Gutenberg SHA it is built from:

```bash
curl -s .../wordpress-develop/refs/tags/7.0.4/package.json | jq -r .gutenberg.sha
# → 28c0dedc4eaf001a24237a1fbba4b0887698b000   (components 32.2.1, block-editor 15.13.2)
```

```bash
npm i -D @wordpress/components@32.2.1 @wordpress/block-editor@15.13.2
```

Ships the full `src/` tree locally and **does not change the bundle** — both are externalised
to `window.wp.*` by the dependency-extraction plugin regardless.

⛔ **Never read `trunk`.** Proven materially different: `border-control/hook.ts` has `size`
live at 7.0.4 and *"deprecated, no longer used"* in trunk.

### S5 — The two grouping systems

**System 1 — element-based one-row.** ✅ Core's `BorderControl` is the reference, and
`BorderControl`/`BorderBoxControl` are now **stable public exports**. ✅ `snow-monkey-blocks`
proves a third-party plugin can adopt it **over flat scalar attributes with zero migration**
— it unpacks core's object on change. So the grouped UI and the stored shape are
**independent decisions**.

⚠ **Blocked on reopening D566** (§4.1).

⚠ **Correction to the brief:** `hideLabelFromVision` renders a *visually hidden* label —
screen-reader only, **no hover text**. In core's row only the swatch and link *buttons* show
tooltips. To get names-on-hover across a row we must wrap each non-button control in the
public `Tooltip` **and** keep the hidden label, since a tooltip is not an accessible name.
A one-row group also needs `<fieldset>`/`<legend>`, not a div — that is what carries the
accessible name once per-control labels are hidden.

**System 2 — native Color panel replicated as SGS controls.**

⛔ **Cannot be mounted; must be rebuilt.** ✅ `Tabs`, `ColorPanel` and
`ColorGradientDropdownItem` are `lock()`ed into WordPress private APIs; `unlock` throws for
any module not on a hardcoded 44-name core allowlist. ~120 lines of JSX to reproduce.

Reusable public parts: `Dropdown`, `Button`, `ColorIndicator`, `ColorPalette`,
`GradientPicker`, `Tooltip`, `TabPanel`, `HStack`/`VStack`/`Spacer`,
`ToolsPanel(Item)`, `ColorGradientControl`.

⭐ **Core's `tabs[]` array is generic** — the same row shape drives Default/Hover on Link
*and* Text/Background/Gradient on every other element. **One SGS row component satisfies
both grouping systems.**

**States:** ⚠ **no core precedent for "current/selected".** Both pseudo-selector allowlists
are hardcoded with **no filter**, and none of five competitors has one. `[aria-current]` is
the honest hook for menu items.

**Storage:** ⭐ Use **flat suffixed scalars** (`X` / `XHover` / `XActive`). Four of five
competitors do; it maps one-to-one onto `block_attributes` rows with `css_property` /
`css_state` — the declarative routing the pipeline already has. Core's nested
`style.elements.link[':hover']` blob would be **less** visible to the converter, not more,
and buys no free rendering for `sgs/*` blocks because the allowlists exclude them.

### S6 — The two enforcement gaps (cheapest wins)

Both are fully specified already; only the gate is missing.
- **Shadow** — contract §11.3 enumerates the five banned lookalikes. Rule 07 is a label
  regex that sees one of them. Replace with a structural check.
- **`info-box`** — drop `supports.spacing` (the pattern `sgs/gallery` already adopted at
  D548) so the object-typed attrs are the single system. Then flip
  `check-duplicate-controls.js` off `exit(0)`.

---

## PART 7 — EFFECT ON THE TRACK 1b PLAN

Reviewing `~/.claude/plans/go-track-1b-playful-hamster.md` against these findings.

### 7.1 What is COMPLETED

- **A4 / rule 26** — the `sgsHeight` half shipped; the residual is a D6-style ruling.
- **G3 (`BorderBoxControl`)** — ✅ its "revisit the contract's naming of it as canonical"
  recommendation is now **resolved**: D566 amended §14.1 on 2026-08-11 and removed it. The
  row can close. ⚠ But Bean's new grouping request **reopens exactly that decision**.
- **The control-parity work** (detector, 724-site codemod, live gate) shipped today and is
  not in the plan at all — it is new scope this investigation generated.

### 7.2 What is EXPANDED

- **F1 (client-usability baseline)** — the plan frames this as instrumenting a metric. The
  real finding is bigger: **there is no editor-canvas measurement of any kind.** F1 should
  absorb S1 and become the programme's spine, not a 45-minute instrumentation task.
- **Group A ("gates built but not switched on")** — the plan treats this as promotion work.
  ◐ The audit found the class is larger: two scripts hard-code `exit(0)` while being invoked
  with `--check`, two checks are pinned advisory by local constants, and one runs without
  `--strict`. **"Advisory" understates it — several gates are structurally incapable of
  failing.**
- **B4 (generalised capability gate)** — expands from "declared but unimplemented" to
  "declared, implemented, but **rendered wrong**", which is the class that actually shipped.

### 7.3 What is SUPERSEDED or made POINTLESS

- ⛔ **Any plan row whose acceptance test is source-only.** This investigation's core finding
  is that source-only verification cannot see this defect class. Rows closed on AST evidence
  alone are **not** closed in the sense the plan intends.
- ⛔ **The plan's own §1.2 warning about cached counts** now has a sharper form: ◐ the plan's
  register has dissolved on re-measurement **nine** times (A2, A6, B2, E1's worklist, G3, G5,
  the two QC findings, and the 189-label false positive). **Treat every inherited row as a
  candidate, never a defect, until re-measured.**
- ⛔ **`rules.json`'s spec anchor** — ten rules cite a tombstone. Any plan row that reasons
  from "the rules enforce Spec 35" is reasoning from a broken link.

### 7.4 What is NEWLY EXPOSED that the plan never contemplated

1. **The `check-editor-only.py` exemption** — the plan has no row for it, and it is the
   mechanism by which this entire defect class ships. **This should be the plan's next item.**
2. **Six SPEC gaps.** The plan is overwhelmingly an *enforcement* plan. It has no row for
   "decide the casing rule", "decide the width standard", "decide the nested-panel rule".
   **Six of nine defects cannot be actioned by any existing plan row.**
3. **The shared-component bypass ratio** — two capabilities bypassed more often than used.
   No plan row addresses adoption, only conformance of existing adopters.
4. **Spec 35 Part M already recorded the root cause** and produced no gate. The plan has no
   mechanism that would catch a *recorded-but-unacted* diagnosis, which is precisely how this
   went unfixed.

### 7.5 The plan's biggest structural weakness

It is a **register of items**, and this defect class is not itemisable. Nine photographed
defects are 51 + 16 + 24 + 1,316 + 1,637 underlying instances. A per-row plan will fix rows
while the class regenerates — exactly what happened at 2026-08-08, when the nested-panel
defect was diagnosed, fixed on one block, and left standing on 16 others.

**Recommendation:** keep the register for genuine one-offs, and lift the uniformity work into
a separate track whose deliverable is **one measurement gate plus six decisions**, not a list
of fixes.

---

> ⛔ **PARTS 1-8 WERE WRITTEN BEFORE THE ADVERSARIAL COUNCIL AND BEFORE TWO BEAN
> CORRECTIONS. THEY CONTAIN VERIFIED ERRORS. Read PART 9 first — it lists every
> correction. Do not action PARTS 1-8 without checking PART 9 for that item.**

## PART 8 — WHAT WAS NOT DETERMINED

1. ⚠ Whether the device-toggle overlap is cause (a) or (b) — §5.6. One live check.
2. ⚠ Whether WP 7.0.4's *shipped* `color-panel.js` matches the trunk source read. The `tabs`
   mechanism and `:hover` path are long-standing; the Elements/Typography split is not.
3. ◐ 77 attributes whose control exists but the attr→control join missed (curried
   `onChange={ set('x') }` rather than inline `setAttributes`). Family variant counts may be
   **slightly understated**.
4. ◐ 33 labels are runtime-dynamic and cannot be casing-classified statically.
5. ⚠ Runtime-injected extension attributes are **structurally invisible** to any DB-keyed
   measurement — registered by a WP filter, absent from `block_attributes`.
6. ⚠ Whether the shadow count is 3 or 7 — §5.2.

---

# PART 9 — COUNCIL FINDINGS + CORRECTIONS TO PARTS 1-8

A 6-persona adversarial council ran against PARTS 1-8: the Cynic, the Ship-PM, the Client
in the Editor, the Spec-Lawyer, the Competitor, and the Pipeline Engineer. Blind, parallel.
Every correction below was then **re-verified in the main thread** — the council's own
figures were not taken on trust either.

## 9.1 ⛔ THE REFRAME THAT CHANGES EVERYTHING — Bean, at the close

> *"We're remodeling the pipeline. I asked for uniformity so that it was reliable enough to
> be used in the pipeline for routing, not that it matches the current routing setup."*

**This invalidates the framing of PART 2, the Competitor's verdict, and the Pipeline
Engineer's verdict — all three measured against the CURRENT converter, which is being
replaced.**

I tested *"does today's converter read the inspector?"* (0 references — true) and concluded
*"the pipeline justification is a rationalisation"* (**false**). Bean never claimed the
current converter reads `edit.js`. He asked for a schema **reliable enough to route from**.
That is a forward requirement on a system being rebuilt.

**There are therefore TWO programmes, and PARTS 1-8 merged them:**

| | Programme A — PRESENTATION | Programme B — SCHEMA |
|---|---|---|
| What | labels, casing, widths, nested panels, icons, slider alignment | one storage shape per property family, discriminated object semantics, one state model, one tier model |
| Serves | professionalism + client UX only | **the remodelled pipeline's routing** |
| Council verdict | valid — the kill list below applies in full | **never assessed — nobody put the storage question to the council** |
| Status | mostly killed or trivial | **this is what Bean actually asked for** |

**Programme B's evidence was in the census and PARTS 1-8 filed it as "cosmetic":**

| Schema divergence | Measured |
|---|---|
| Responsive **storage** shapes ⚠ see §9.10 | `survey-responsive-shape.py`, run directly: **flat_tiers 26 · both_shapes 20 · orphan_tier 94**, over **140 tier families**. ⭐ **`both_shapes 20` = 20 families storing one property in TWO shapes simultaneously** — the load-bearing figure, and it survived verification |
| `attr_type='object'` | **3 incompatible meanings** (side-keyed / tier-keyed / hybrid) |
| Object attrs with a `css_property` but **no discriminator column** | **165 of 204** |
| Hover mechanisms | 101 hand-rolled `*Hover` attrs / 24 blocks vs a shared extension at **live reach 0** |
| `css_state` populated | **97 of 2,767** rows; ~12 hover attrs unroutable |

The Pipeline Engineer said it plainly and PARTS 1-8 did not follow it:
> *"I do not consume implementations, I consume `(block_slug, css_property) → attr_name`
> rows. Eleven ways to RENDER a width picker costs me nothing. **What costs me is eleven
> ways to STORE it — and the census does not measure that.**"*

Its proposed **`shape_semantic` discriminator column** (answering *"what does
`attr_type='object'` mean, and which column says so?"*) is a **Programme B item**. PARTS 1-8
filed it under pipeline-irrelevant. That was wrong.

## 9.2 ⛔ BEAN'S SECOND CALIBRATION — scope of "uniform"

> *"The uniformity doesn't need to mean every detail is usable, just the expected ones."*

**Uniformity = the EXPECTED properties behave predictably and identically everywhere. It
does NOT mean every property is exposed on every block.**

Consequences:
- The census's **"115 styling attributes across 14 blocks have no inspector control"** is
  **NOT automatically a defect.** Most are probably correct. It becomes a defect only where
  an *expected* property is missing or behaves differently from the same property elsewhere.
- **"Expected" is undefined and nobody has defined it.** See PART 10 Q3 — this is now a
  blocking question for Programme B, because "which properties must be uniform" is the
  input to the whole schema target.

## 9.3 ⛔ VERIFIED ERRORS IN PARTS 1-8 — do not action these as written

Every one re-checked in the main thread.

| # | Claim in PARTS 1-8 | Truth | Impact |
|---|---|---|---|
| E1 | S3: **"One fix, 51 defects"** — inject `hideLabelFromVision` from the wrapper | **Impossible.** Both wrappers are **render-props**: `ResponsiveControl.js:146` `{ children( breakpoint ) }`, `ResponsiveOverride.js:115` `{ children( {...} ) }`. No child element to inject into | The doc's biggest ROI claim. It is a **51-site codemod** against **119 call sites**, not a 2-file edit |
| E2 | **"51 genuine cases across 13 blocks"** (`nav-menu` 12, `brand-strip` 6) | **`nav-menu` has 1 call site and it ALREADY carries `hideLabelFromVision`. Same for `brand-strip`.** 18 of the 51 (35%) are already-conformant blocks | Re-measure before any dispatch. Spec-Lawyer's independent sweep: **~34 across 14 files** |
| E3 | §4.2 **"Ten of fifteen rules cite a tombstone"** ✅ | **Seven** rule files (+ `rules.json._meta`) | A ✅ off by three |
| E4 | PART 2 **"Six scripts drive a browser; five open only the frontend; three open the editor"** ✅ | 5 + 3 > 6 — **arithmetically impossible**, and >6 browser-driving scripts exist | The ✅ sentence establishing the root cause |
| E5 | S6 **`info-box`: "drop `supports.spacing`" = cheapest win** | **Dangerous.** `info-box` declares ONLY `paddingTablet/paddingMobile/marginTablet/marginMobile`. Desktop comes from `supports.spacing` → `style.spacing.*`. **Dropping it DELETES the desktop control and orphans stored data on live canary pages** | Not a cheap win. A live-content migration |
| E6 | S1's home: **"standalone command + pre-merge"** | **There is NO CI in this repository.** No `.github/workflows`, no Travis/Circle/GitLab/Jenkins/Azure. The tracked hook says so: *"there is no CI. This is the ONLY git-level floor."* | S1 as specified has **nowhere to run** |
| E7 | PART 4 tally **"6 spec gaps · 2 enforcement · 1 contradiction"** | Table yields **5 · 2 · 1 · 1 non-defect**. Restated 3× as load-bearing | Inflates the decision batch |
| E8 | S2.6 **"retire the Part H line"** (singular) | `LineHeightControl` appears **twice** in Spec 35 — `:96` (Part B) and `:384` (Part H) | Retiring one leaves the other mandating it |
| E9 | PART 2 **"a static parser cannot express those assertions"** | **False for two of nine** — duplicate label AND nested same-label panel are both statically decidable. The doc itself counted the panels statically | The two defects the calibration ranks **highest** need no browser |
| E10 | §4.1 **"the contract requires the split, D566 settled it"** | **Partially executed.** Spec 35 still cites `BorderBoxControl` as canonical at **`:91`, `:374`, `:380`**. D566 amended the contract's §14.1 and left three live citations standing | The next person to touch borders will read one and rebuild what D566 rejected |
| E11 | S5 **"`BorderControl`/`BorderBoxControl` are stable public exports"** ✅ · **"44-name allowlist"** ✅ | Unreproducible from this tree (`@wordpress/components` not installed); installed `private-apis@1.39.0` has a **34-name** list. Conclusions survive; the ✅ marks do not | Downgrade to ◐ or land S4 first |
| E12 | ⛔ **My own `check-control-parity-live.js`, committed 2026-08-13** | **Requires `playwright`, which is NOT a declared dependency.** It sits in `node_modules` by accident of an MCP install. On `npm ci` / a fresh clone / any of the 4 worktrees it **throws and degrades to a pass** | I shipped the exact artefact this report calls most dangerous. **Fix or delete before relying on it** |

## 9.4 ⛔ THE FINDING THAT COLLAPSES D1

**D1 is largely invisible.** `assets/css/device-toggle.css:80-82` records it in this repo's
own words:

> *"WordPress's default control label **is uppercase** and light."*

WP's CSS uppercases control labels. So **changing 1,316 authored strings changes almost
nothing a client can see**, and the ALL-CAPS in Bean's screenshot is not a casing bug — it
is the wrapper `<span>` failing to inherit that styling.

**D1 collapses from a 1,316-label decision to panel titles only (~50 strings).**
⚠ Confirm with one live `getComputedStyle` on `.components-base-control__label` before acting.

## 9.5 THE COUNCIL'S DECISIONS

Convergence out of 6. **These are advisory — Bean decides.**

| | Council answer | Convergence |
|---|---|---|
| **D1** casing | **Match core** (control labels sentence case, panel titles Title Case, never ALL-CAPS). Kill Title-Case-everywhere | **6/6** — and see §9.4: mostly moot |
| **D2** one label | Yes. **Stop rendering the wrapper `<span>` when a labelled child is present** — NOT `cloneElement` into a render-prop (E1) | 5/5 outcome; split on mechanism |
| **D3** width | Adopt core's strategies, **scoped to input-type controls (~75)**, not 1,637. `RangeControl`/`Toggle`/`Select` are full-width in core too | 4/4 — the biggest scope reduction available |
| **D4** nested panels | **Remove.** The MVP: ~20 min, a deletion, cannot regress. Verify count first (16 vs 17) and check none relies on `initialOpen` | **6/6** |
| **D5** sidebar overlay | **Never.** But **measure first** — §5.6's two causes want different fixes | **6/6** |
| **D6** line-height | Retire — **both** Spec 35 `:96` and `:384` (E8) | 5/5 |
| **D566** | **Do NOT reopen. Build the grouped row anyway** — grouped UI and stored shape are independent; `snow-monkey-blocks` proves zero-migration adoption over flat scalars. First clear E10's three stale citations | **6/6** |

## 9.6 THE KILL LIST (Advanced-tab bar)

- **Title-Case-everywhere** (1,316 labels) — invisible under §9.4, and diverges from native
- **The 1,637-control width sweep** — wrong denominator; core is full-width too
- **S5 System 2** (rebuilding core's private Color panel) — *"the Advanced tab exactly"*
- **The census as a work programme** — it is a diagnostic, not a backlog
- **S1 as first move** — see §9.7
- **Re-measuring the shadow 3-vs-7 count** — nobody buys on shadow-mechanism cardinality

## 9.7 S1 — STRESS-TEST RESULT: DO NOT BUILD AS SPECIFIED

| Objection | Evidence |
|---|---|
| **No home** | No CI exists (E6) |
| **Undeclared dependency** | Playwright not in `devDependencies` — the gate self-disables on a fresh clone (E12 is the live proof) |
| **Depends on undecided rules** | 3 of its 6 assertions need S2 decisions; 2 of those should be "no" |
| **Untestable as written** | 4 of 6 assertions have no threshold ("equal to what tolerance?") |
| **Baseline dies in 6 days** | WP 7.1 (19 Aug) flips `__next40pxDefaultSize` → every differential shifts 32→40px → red-lines all 84 blocks |
| **Modelled on an unproven script** | `check-device-toggle.js` is 3 days old, one commit, never run in anger |
| **Wouldn't catch the real bug** | It would not have detected the converter data-loss below |

**Cheaper alternatives the council proposed:**
1. **Two AST rules** for the two statically-decidable defects (E9) — days, cannot go flaky,
   live in the apparatus that already runs 43 rules.
2. **A contact sheet** — insert all 84 blocks, screenshot each inspector, tile into one PNG.
   **No assertions, no thresholds, no flakiness — a screenshot cannot red-line a build.**
   ~150 lines vs ~900. Feeds Bean's eye, which found all nine defects and is co-authoritative
   under R-31-13.

## 9.8 ⛔ THE CONVERTER DATA-LOSS BUG — verified, and re-read under §9.1

Found by the Pipeline Engineer. **Mechanism verified in the main thread:**

| Check | Result |
|---|---|
| `tier_suffix.py:46` builds tier names by string concatenation | ✅ `return f"{base_attr}{tier}"` |
| `value_serialise.py` always returns a string | ✅ `return raw.strip()` — unconditional |
| Any object/tier handling in `scripts/converter/` | ✅ **zero** hits for `responsive_normalise_object`, `tier_object`, tier-key patterns |
| `sgs/container.maxWidth` | ✅ `type: 'object'`, default `{}` |
| Flat siblings `maxWidthTablet` / `maxWidthMobile` | ✅ **NONE — the converter's targets no longer exist** |

So the converter writes the string `"1200px"` into an object-typed attr; WP coerces a flat
value on an object attr to its default; **the converter reports success and the clone has no
max-width.** Tablet/mobile are gapped. **204 destinations** carry a `css_property`
(max-width 32, font-size 25, grid-template-columns 21, gap 21, padding 19, width 14,
border-width 13). No gate can see it.

⚠ **NOT independently proven end-to-end.** The mechanism is verified; a real clone was never
run. **The 15-minute falsifiable test is PART 11 Task 1.**

⭐ **Re-read under §9.1:** if the pipeline is being remodelled, this is less "urgent fire"
and more **a worked example of exactly what the new routing model must make impossible** — a
schema where the stored shape is declared nowhere machine-readable, so writer and reader
silently disagree and every gate stays green. **It is the strongest single argument for
Programme B.**

## 9.9 GRADES

| Persona | Dimension | Grade |
|---|---|---|
| Client in the Editor | professionalism | C+ |
| Spec-Lawyer | precision | C+ |
| Competitor | competitive threat | C+ |
| Ship-PM | shippability | C− |
| **Pipeline Engineer** | schema universality | **D** |
| **Cynic** | 2-year survival | **D+** |

Convergent headline, three personas independently: **the report diagnoses a real problem and
then commits the failure it diagnoses.** The Spec-Lawyer's pattern diagnosis is the sharpest:
*"rigorous about numbers it obtained from subagents and casual about numbers it obtained
itself"* — which §5.4/§5.5 had already named as this author's failure mode, in the same
document.

⚠ **Council scope limit:** all six were briefed on PRESENTATION uniformity. **None was asked
about schema uniformity for a remodelled pipeline (§9.1).** Their kill lists are valid for
Programme A and say nothing about Programme B.

## 9.10 LATE SELF-CORRECTION FROM THE CENSUS — arrived after PARTS 9-11 were written

The universal-census investigation returned a second time, unprompted, to correct its own
figures. Recorded in full because it changes two numbers used above and because its method
notes are the most reusable thing in this report.

**Stands (it re-verified directly):** hover extension live reach **0** · `blockLink` 3 blocks
· `clickEffects` 66 · `StateToggleControl` 3 blocks · **101 block-declared `*Hover` attrs
across 24 blocks, 5 blocks with no control** · Parts 1, 3 and 4 of its census (its own AST
work) unchanged.

**Corrected:**

| Reported earlier | Actual |
|---|---|
| "14 `sgsHover*` attrs" | **11** `sgsHover*` (19 `sgs*` total) — matches Spec 35's own figure |
| "15 deviating breakpoints / 12 CSS files" | **17 lines across 15 files** |
| "10× `599px`, 4× `600px`" | 10× `599px` · **3×** `600px` · 2× `max-width:768px` · 1× `max-width:1024px` · 1× `min-width:769px` |

**⛔ WITHDRAWN — cannot be substantiated. Do not cite:**
- the "3 via `StateToggleControl` / 10 flat always-visible / 3 partial" split of the 24 hover blocks
- the "`{desktop,tablet,mobile}` object shape = **28 blocks**" figure
- ⚠ consequently the "**4 distinct** responsive storage shapes" phrasing used in §9.1 is
  **unsupported**. The sourced replacement is in §9.1's table (`flat_tiers 26 · both_shapes
  20 · orphan_tier 94` over 140 families). **`both_shapes 20` — the figure Programme B
  actually rests on — survived.**

**Three method notes, all instances of this repo's own recorded failure modes:**

1. ⭐ **Its "correcting" grep was wrong and the original was right.** The correction pattern
   `\((max|min)-width:\s*[0-9]+px\)` required `(` immediately before `max`, so it missed
   `( max-width: 599px )` and **undercounted 599px by half**. *The blind spot was the shape
   of the grep, not the data.* A correction needs the same scepticism as the claim.
2. **The 599/600 breakpoints cannot be classified mechanically.** Device-tier bug vs
   legitimate design-driven one-off is a judgement the project's own rule reserves for a
   human. They are **13 candidates requiring per-rule reading, not 13 defects.**
3. **Root cause of its bad figures, in its own words:** *"I folded a subagent's reported
   numbers into the report without a completion notification ever arriving, so I had no
   output to check them against. The three figures that survived verification did so by
   luck, not method."*

⚠ **Note (3) is the same failure as E1-E12 and as §5.4/§5.5, now observed at a third level of
delegation.** Main thread → census agent → its own subagent, each folding an unverified
figure upward. **Treat every number in this report that is not marked ✅ as a candidate.**

---

# PART 10 — EVERYTHING STILL NEEDING CLARIFICATION

Nothing below is answerable from the repo. **Q1-Q3 are blocking.**

## BLOCKING — Programme B cannot start without these

**Q1. Is the remodelled pipeline's routing model already decided, or is defining it part of
the work?**
- If **decided** → the job is measuring today's schema against that target and producing a
  migration list.
- If **open** → this report's census becomes the requirements input, and the deliverable is
  the target schema itself.
These are different documents. Asked at the close of the session; not answered.

**Q2. What is the remodel's scope and timeline?** Does it replace `tier_suffix.py` /
`value_serialise.py` (which would make §9.8 moot as a fix and turn it into a requirement),
or wrap the existing converter? Does it change `block_attributes`, or read it as-is?

**Q3. What counts as an "EXPECTED" property?** (§9.2) Bean: *"uniformity doesn't need to mean
every detail is usable, just the expected ones."* Nobody has defined the expected set.
Candidate axes: per block category? per `supports.sgs.elements` cluster? a fixed list
(colour/spacing/typography/border/shadow)? **This is the input to Programme B's target
schema** — without it "uniform" has no denominator.

## HIGH — decisions Bean owes (council answers in §9.5, all advisory)

**Q4.** D1 casing — accept core's convention? ⚠ Confirm §9.4 first; it may be ~50 strings.
**Q5.** D2 — wrapper hides its label, or child does? (Council split; accessibility favours
keeping the child's, since `BaseControl` associates it with the input.)
**Q6.** D3 — scope width to ~75 input controls?
**Q7.** D4 — remove the nested panels? (6/6 yes. Verify 16 vs 17, check `initialOpen`.)
**Q8.** D5 — confirmed never overlay. Measure before fixing.
**Q9.** D6 — retire both Spec 35 `:96` and `:384`?
**Q10.** D566 — build the grouped row over flat storage without reopening? And clear E10's
three stale `BorderBoxControl` citations?
**Q11.** Which of Programme A survives at all, given the council killed most of it?

## MEDIUM — unresolved measurements

**Q12.** §5.6 device-toggle overlap: cause (a) 84px-vs-~90px, or (b) padding on a
non-scrolling ancestor? **They want different fixes.** One live check.
**Q13.** §9.4 — does `.components-base-control__label` compute to `text-transform: uppercase`
on WP 7.0.4? Collapses or restores D1.
**Q14.** §9.8 — does a real clone actually lose `max-width`? PART 11 Task 1.
**Q15.** §5.2 — shadow mechanisms: 3 or 7? Unresolved; two sound methods, different denominators.
**Q15b.** §9.10 — the 13 `599`/`600px` breakpoint candidates: which are device-tier bugs and
which are legitimate design-driven one-offs? **Cannot be decided mechanically** (project rule);
needs a human reading each rule. 13 candidates, not 13 defects.
**Q16.** The true duplicate-label population (E2): 51, ~34, or other?
**Q17.** Which of the 4 worktrees is authoritative for any census? All counts in PARTS 1-8
came from one of them.

## LOW — known and parked

**Q18.** 77 attributes whose control exists but the attr→control join missed (curried
`onChange={ set('x') }`). Family counts may be slightly understated.
**Q19.** 33 runtime-dynamic labels cannot be casing-classified statically.
**Q20.** Runtime-injected extension attrs are invisible to any DB-keyed measurement.
**Q21.** 724 `__next40pxDefaultSize` props become removable once on WP 7.1 (19 Aug).

---

# PART 11 — NEXT-SESSION PROMPT

Copy from here down.

---

**Invoke `/autopilot` before anything else.**

## MANDATORY READING GATE — in this order, in full

1. **`.claude/reports/2026-08-13-inspector-uniformity-root-cause.md`** — this file.
   ⛔ **PART 9 FIRST.** PARTS 1-8 contain 12 verified errors (§9.3). Do not action any
   PARTS 1-8 item without checking PART 9 for it.
2. `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — in full (project rule).
3. `.claude/plans/spec-35-control-type-contract.md` §14.1 (the D566 amendment).
4. `~/.claude/plans/go-track-1b-playful-hamster.md` PART 1 only — and read this report's
   PART 7 for what it supersedes.

## STATE AS OF SESSION END (2026-08-13)

⛔ **CORRECTED — the line below was wrong. See the STOP block at the top.**
**The branch IS MERGED into `main` at `e5c027d6`. Work on `main`, primary worktree.**
Two commits landed after the merge and are NOT reflected anywhere in this report:
`1e50e852` (hero object-fit cleanup) and **`b47bc24b` — `check-editor-render-parity.js`,
a structural guard for editor-canvas desync. READ IT before any S1-shaped work.**

~~Branch `fix/track-1b-length-and-panel-rule` — pushed, NOT merged, awaiting Bean.~~

| Commit | What |
|---|---|
| `2dc483de` | control-parity detector (triad, self-test) |
| `8478faaf` | merge main (10 hero commits) |
| `c5d2e9dc` | border-radius → any CSS unit + 2 visual-diff reports |
| `21b40503` | **724-site codemod** — every sized control on `__next40pxDefaultSize` |
| `f99dfea9` | live parity gate + last 3 Axis-A sites |

Deployed to the canary. Build green. Axis A: **762 OK / 0 missing / 0 ambiguous**.

⛔ **KNOWN DEFECT IN THE ABOVE (E12):** `scripts/surveys/check-control-parity-live.js`
requires `playwright`, which is **not a declared dependency**. On a fresh clone it throws and
**degrades to a pass**. Fix (`npm i -D playwright` pinned) or delete it. Do not trust a green
from it until then.

## TASKS, IN ORDER

**⛔ TASK 0 — ASK BEAN Q1, Q2, Q3 (PART 10) BEFORE ANY WORK.**
Q1/Q2 decide whether Programme B is "measure against a decided target" or "define the
target". Q3 defines what "expected" means, which is the denominator for the whole thing.
**Guessing here wastes the session.**

**TASK 1 — ⛔ REPLACED. DO NOT run a clone to "prove" §9.8.**
The original task (*"clone a draft with max-width + a tablet override, assert both land"*) was
**unbuildable and redundant**, for four reasons found by the qc-council pass:
- It named no mockup path, no page id, and no fixture. `sgs-clone-orchestrator.py` requires
  `--mockup <path>` AND `--page <id>`, both mandatory — this is a deploy-to-canary operation,
  not a 15-minute local test.
- The tablet half has **no target**: §9.8 itself proves `maxWidthTablet` no longer exists.
- `converter/tests/fixtures/` has no golden-fixture convention of that shape.
- ⛔ **It is already settled** — D554 ruling C + 12 `xfail(strict=True)` tests + the
  `2026-08-12-converter-db-drift.md` write-up.

**Do this instead (~20 min, reading only):** read `.claude/plans/2026-08-12-converter-db-drift.md`
and `decisions.md` D554. Confirm §9.8's 204 destinations are the **same population** D554
already ruled on. If they are — and they almost certainly are — **strike §9.8's "urgent bug"
framing and re-file it as a Spec 39 requirement**, then say so to Bean in one line. If they
are NOT the same population, that difference is the real finding and needs its own write-up.

**TASK 2 — The three cheap, non-regressing wins (~1 hr, no decisions needed):**
- Delete the redundant enclosing `PanelBody` (D4, 6/6). **Re-count first** (16 vs 17) and
  check none relies on `initialOpen`.
- Clear E10: sweep `BorderBoxControl` from Spec 35 `:91`, `:374`, `:380` so D566 stops being
  re-litigated.
- Retire `LineHeightControl` from Spec 35 **both** `:96` and `:384` (E8).
All three are deletions/doc edits. They cannot regress and need no gate.

**TASK 3 — Measure, don't guess (~30 min):** Q12 (device-toggle cause a vs b), Q13 (does WP
uppercase control labels — collapses or restores D1), Q16 (true duplicate-label count).

**TASK 4 — Programme B, gated on TASK 0.** If Q1 says the routing model is open, the
deliverable is the **target schema**: one storage shape per expected property family, a
`shape_semantic` discriminator column, one state model, one tier model. Inputs are in §9.1's
table.

## ⛔ DO NOT DO THESE

- **Do not build S1 as specified** (§9.7) — no CI, undeclared dependency, depends on
  undecided rules, baseline dies 19 Aug.
- **Do not run the Title-Case codemod** — invisible (§9.4), and diverges from native.
- **Do not sweep 1,637 control widths** — wrong denominator.
- **Do not rebuild core's Color panel** (S5 System 2) — the Advanced tab again.
- **Do not drop `info-box`'s `supports.spacing`** as a "cheap win" (E5) — it deletes the
  desktop control and orphans live data.
- **Do not act on any PARTS 1-8 number without re-measuring** — 12 verified errors.

## STANDING RULES THAT BIT THIS SESSION

- **A grep over this tree measures prose.** Docblocks name components constantly. Use AST.
- **Verify your own numbers as hard as a subagent's.** That asymmetry is the recorded failure
  mode and it recurred inside the document that named it.
- **An editor-only commit passes every gate unlooked-at** (`check-editor-only.py`, §2.1).
- **Prove the cause before the fix** — Q12 has two causes wanting different fixes.
- **`npm ci` / fresh clone / worktree**: undeclared deps make a gate pass by not running.

---

# PART 12 — /qc-COUNCIL VALIDATION GATE (run last, 2026-08-13)

Three raters: cold-session executor, citation/number verifier, fix-shape gate. Structural
pre-gate passed (all 9 cited paths resolve). **This part overrides PART 11 where they differ.**

## 12.1 ⛔ HEADLINE — ZERO of 24 proposals are dispatchable

**Not one proposal in this document carries all four gate elements** (predicted outcome ·
measured baseline · validation command · commit gate). **Not one states a validation command
or a commit gate at all** — including the proposals whose entire purpose is to BE a gate
(S1, S6a, the `check-duplicate-controls` flip, the AST rules).

Score: **0 SPEC · 19 HYPOTHESIS · 1 UNVERIFIABLE-by-design · 4 KILLED** (all four kills
re-verified and holding).

⚠ *A document about enforcement that specifies no enforcement threshold for its own fixes is
the failure it diagnoses, at a third level.*

## 12.2 ⭐ THE ENTIRE DISPATCHABLE SURFACE — 2 items, both one line from SPEC

Both baselines **independently verified**. Add the three missing elements and dispatch:

| Proposal | Baseline (verified) | Predicted | Validation command | Commit gate |
|---|---|---|---|---|
| **Retire `LineHeightControl`** (D6) | **exactly 2 hits**, Spec 35 `:96` + `:384` | 0 | `grep -c LineHeightControl .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` | do not commit if ≠ 0 |
| **Clear stale `BorderBoxControl`** (D566/E10) | **exactly 3 hits**, Spec 35 `:91`, `:374`, `:380` | 0 | `grep -c BorderBoxControl .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` | do not commit if ≠ 0 |

⚠ **`:91` and `:96` are table cells describing what NATIVE WordPress offers vs what SGS has.**
Deleting the component name there would make the table misdescribe core. **Supply replacement
text, do not blank-delete. Apply bottom-up (`:384` → `:380` → `:374` → `:96` → `:91`) so line
numbers do not shift under you.**

## 12.3 ⛔ FIVE MORE DANGEROUS PROPOSALS — cheap-framed, unbaselined, high blast radius

The doc caught two (E5 `info-box`, E1 wrapper). It stopped there. These five were not caught:

| # | Proposal | Why dangerous |
|---|---|---|
| 1 | **D2 — "stop rendering the wrapper `<span>` when a labelled child is present"** | ⛔ **The replacement has E1's defect.** The wrapper renders its label **before** `children()` is called — it cannot know whether the child renders one without calling the function early and introspecting the returned tree, which is the reflection E1 declared impossible. **D2 does not escape the 119-call-site codemod.** Recorded as "5/5 outcome; split on mechanism" — the split is *unresolved*, and the endorsed mechanism is not viable |
| 2 | **S3c de-dup `BooleanResponsiveControl.js`** | ⛔ **"code-identical" is FALSE** — diffed: labels, `help` text and docblocks differ. Merging silently changes `sgs/media`'s Autoplay label and drops its help text. A visible client-facing regression, and it serves **neither** programme |
| 3 | **D4 "~20 min, a deletion, cannot regress"** | Baseline contested three ways (16 / 17 / "16-18 across 15 files"), and removing a `PanelBody` changes `initialOpen` collapse state. **"Cannot regress" is exactly the cheap framing this gate exists to reject** |
| 4 | **S6a shadow structural check** | ⛔ **Self-blocked**: the fix needs the 3-vs-7 baseline, and §9.6 **kills the measurement**. Could red-line up to 17 blocks on flip |
| 5 | **S4 `npm i -D @wordpress/components`** | "does not change the bundle" is asserted with **zero bundle measurement**, across all 84 blocks |

## 12.4 ⛔ §9.8 IS AN UNDISCLOSED COLLISION — correct the framing

§9.8 presents the converter tier-object break as *"Found by the Pipeline Engineer… mechanism
verified in the main thread"*, citing no prior record. **It was documented three days earlier
with more file:line evidence:**

- **`.claude/plans/spec-39-seed-requirements.md` R1** (2026-08-10) — *"Object-shape tier
  emission (the load-bearing item)… the converter does lift per-device values and always has
  — in the flat shape… it lacks an object emitter"*, with evidence across `fold_helpers.py`,
  `extraction.py`, `grid.py`, `grid_area.py`, `styling_content.py`.
- **D552** already ruled the sequencing: *"the block standard leads, the cloning pipeline is
  reworked afterwards… the converter's inability to emit the new shape is **scheduled work,
  never a precondition**."*
- **D554 ruling C** + 12 `xfail(strict=True)` tests encode it.

**It is still worth doing one thing — R1 has no failing fixture.** Re-frame TASK 1 as
*"produce R1's missing falsifiable test"*, **not** a discovery. And §9.1's *"confirm with Bean
whether this is a fix or a requirement"* **is already answered by D552: requirement.**

## 12.5 THE PROGRAMME SPLIT IS LEAKY

§9.1 says *"Programme B is what Bean actually asked for."* The proposal list that follows is
**~80% Programme A.**

- **Programme B: 4 items** (S5-Storage, S6b-in-substance, TASK 1, TASK 4) — only TASK 4 is
  real work, and it is gated on TASK 0.
- **Programme A: ~18**, mostly killed by the council.
- **3 sit in NEITHER** — S3b (delete `DeviceTabs`), S3c, S4. Chores and tooling, present
  because they surfaced in the census, not because either programme needs them.
- ⛔ **S5-Storage — the ONLY Programme-B fix-shape in PART 6 — is filed as a sub-bullet of a
  grouping-UI section.** Structurally invisible.
- ⛔ **S6b (`info-box`) is Programme B in substance** (one storage system vs two) but filed
  under "cheapest enforcement wins". *Its B-ness is exactly why it touches live data* — which
  is what E5 caught.

*The reframe was written; the backlog was never rewritten to match. Same shape as §2.2's own
finding, committed by this document about itself, one section later.*

## 12.6 ⛔ PART 10's PREAMBLE IS FALSE — and it is doing the most damage

*"Nothing below is answerable from the repo"* is **false for 8 of 21 questions, including two
of the three marked BLOCKING.**

| Q | Verdict | Where the answer is |
|---|---|---|
| **Q1** | ⛔ **DO NOT ASK BEAN** | `2026-08-05-pipeline-rearchitecture-design.md` (*"shape approved by Bean… becomes Spec 39. Open decisions in §12"*) + `spec-39-seed-requirements.md` (*"inputs, not decisions"*). **Answer: OPEN → the deliverable IS the target schema** |
| **Q2** | ⛔ **DO NOT ASK BEAN** | Same design doc §7/§9/§10/§12 + **D552**. **Answer: big-bang replace, delete-don't-demote; the converter is scheduled work, not a precondition** |
| **Q3** | ✅ **THE ONE REAL BLOCKER** | Genuinely Bean's. It is Programme B's denominator |
| Q12, Q13, Q16 | 2-5 min each | TASK 3 |
| Q15, Q17, Q18-Q21 | answerable now | `git worktree list` settles Q17 in one command |

**TASK 0 hard-wires the false preamble** — it converts a 10-minute reading task into a gate
on Bean's attention.

## 12.7 ⭐ THE MISSING QUESTION THAT MAY RETIRE MOST OF THIS DOCUMENT

**Does Bean's D593 kill-reason generalise?** He killed the built-and-shipped Advanced tab
with: *"it doesn't actually add any functionality or bring us closer to our uniformity or
cloning goals."*

That is **a general acceptance criterion**, not a one-off. Applied as a rule it would retire
most of Programme A without anyone measuring anything. The document uses it only as a
*precedent* (§9.6) and never puts it to Bean as a **rule**.

**Ask this before the other five decisions. It may make them moot.**

## 12.8 ⛔ REVISED DISPATCH ORDER — replaces PART 11's

1. **E12 first** — `npm i -D playwright` pinned, or delete `check-control-parity-live.js`.
   It is the only verification standing behind a **merged** 724-site codemod, and it
   currently degrades to a pass.
2. **The two near-SPECs** (§12.2), with their grep gates added.
3. **TASK 3's three measurements** (Q12, Q13, Q16) — ~30 min, converts four hypotheses into
   scorable proposals and may collapse D1 entirely.
4. **Read** `spec-39-seed-requirements.md` + the re-architecture design §12 — answers Q1/Q2
   **without Bean**.
5. **Then ask Bean: Q3 + the D593-generalisation question (§12.7) only.**

**Do NOT dispatch** the five in §12.3 without a measured baseline. Three are currently
presented as cheap.
