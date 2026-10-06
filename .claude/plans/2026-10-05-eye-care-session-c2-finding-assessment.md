---
title: "Eye Care Session C2: assess every finding against the fix register, then fix what Bean approves"
project: small-giants-wp
created: 2026-10-05
status: COMPLETE 2026-10-06 — every approved fix shipped, deployed and verified
governs: the assessment and framework-fix stage after Session C
references:
  - .claude/plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/reports/2026-10-05-session-b/b2/
---

# Eye Care Session C2: assess every finding, then fix what Bean approves

✅ **COMPLETE 2026-10-06. The assessment ran, every approved fix shipped, and the host tail is done: reseeded, deployed to eye-care-test and verified on both surfaces. Nothing is owed from this plan.**

**What ran, with its evidence:** `.claude/reports/2026-10-06-session-c2/` — `PREDICTION.md` (committed before
measuring), `BRIEF.md` and `lane-*.tsv` (the five fact-check lanes), `FACT-CHECK-RESULTS.md`,
`STEP3-RESWEEP.md` (the re-sweep and its addendum), `BEAN-LIST.md` (Bean's answers) and
`QC-ROUTE-FIXES.md` (the QC of the four route-defect proposals).

**Result: raw F 193 at block code `94122e326`, and the judged rows reduce to 5 approved block fixes.**

The arithmetic, stated so it sums: **of the 192 F rows on the baseline sweep, 14 `sgs/google-reviews` rows
were excluded** (the parallel track's, and all accepted differences), leaving **178 judged across five
lanes**. Those 178 are **30 `real` + 22 already settable or an accepted divergence + 11 wrong block
(Session D's tree work) + 90 measuring artefacts + 25 register-decided = 178.** The **30 real rows yield 7
candidate fixes**, of which Bean approved **5** (A4 withdrawn, A7 downgraded to an investigation). Every
`real` verdict was re-checked in the main thread and 17% of the rest spot-checked.

**Two figures the original text got wrong. Both are sweep-dependent, so always name the sweep:**

| | baseline sweep (raw F 192, `7f375f765`) | re-sweep (raw F 193, `94122e326`) |
|---|---|---|
| `W/canvas-settable` | **193** (the text said 161) | **209** |
| `W/content` | **50** — 38 presence, 12 text (the text said 45) | **45** — 33 presence, 12 text |

So 161 was wrong on both sweeps. The content figure of 45 was wrong for the baseline the brief described
and happens to be right for the re-sweep: **5 presence rows left the content class between the two
sweeps.** A bare "45" or "50" is ambiguous without the sweep attached.

**Two documented causes were REFUTED and must not be built on:**
- The footer `margin-top` "inline WP-native base margin" cause is false.
  `class-sgs-container-wrapper.php` passes `'selector' => '.' . $uid` to `wp_style_engine_get_styles()` and
  its own comment says the result is "just scoped to `.$uid` instead" of inlined. The "lands INLINE"
  comment the diagnosis rested on is **stale** and sits in the tablet padding block. The cause is unproven.
- Edit-target shift #1 names the right target and the wrong mechanism: `sgs/accordion` only **provides
  context**; the **child** emits the custom property (`accordion-item/render.php` writes
  `--sgs-accordion-header-pad`). `headerGap` was built on exactly that shape in `776a93639`.

**Route defects found while judging are NOT in this plan.** They are in Spec 47 §5 Residual and owned by
`plans/2026-10-06-spec47-route-cleanup.md`, including two write hazards, a forced-hover false green, the
stale-report failure mode and the `canvasSettable` masking.

**The number this session consumes is raw F = 192**, in `sites/eye-care-ward-end/build/qa/triage/*.json` (17 files, rewritten 2026-10-06). It is a **raw machine classification** and is **not** comparable to Session B's audited 163: Session B audited 338 raw rows down to 163, so an audited equivalent of 192 is this session's own judgement to produce. Per surface: lens 28, help 36, home 49, footer 20, contact 17, product 17, mega-brands 8, shop 4, mobile-menu 4, mega-lenses 4, mega-help 3, mega-sunglasses 1, contact-form 1, and 0 on about, lenses, header and size-guide. There are also **29 U rows** that nothing explains.

**Four things to absorb before judging any row.**
1. **193 rows carry `W/canvas-settable` on the baseline sweep, 209 on the re-sweep** (the figure of 161 in the original brief was wrong on both),, each citing a block and attribute that could hold the value. That citation is a **claim to test live, never a closure**, and task 2 tests it.

   **OUTCOME, 2026-10-06 (`29f2e30c1`, `7b65419f2`, `84c818fe1`; full detail in
   `reports/2026-10-06-session-c2/CANVAS-SETTABLE-CONFIRMATION.md`).** After R1 the population is **168 claims
   across 63 families** of (cited block, cited setting, row property) — the unit the claim is made in, since a
   family spans surfaces and 20 of them do. **17 families (82 claims) were confirmed against the live DOM and ALL
   17 were REFUTED**, by value-independent CSSOM rule enumeration rather than computed styles (which cannot
   separate "the cited rule loses" from "the setting is unset"). **Root cause MEASURED, one mechanism not 17:**
   `lib/triage.mjs::reachesElement` **fails open** — `emissionOf` returned null for **17 of 17**, so each row was
   classed W on a citation that was never tested, which is what R-47-12 requires be tested. `reachabilityVerified`
   now records which citations were actually assessed; **no row was reclassified.** The real repair is to supply
   `ctx.emissionFor`, read in `emissionOf` but set by no caller.

   **STILL OWED: the remaining 46 families need the REMOTE site**, because the local WSL mirror carries no
   `cr-ref` instrumentation for `header`, `mega-*`, `shop`, `product`, `lens` or `size-guide` (its header layout
   and WooCommerce templates predate the instrumented ones) — measured, with all 46 failing as "ref missing
   entirely" and **zero** as state-gated. The **W-to-F reclassification is deliberately NOT applied** until all 63
   are read, so the F figure keeps one meaning rather than two in one document. The canvas roster is 12 of the 17 surfaces, and it is load-bearing: stripping its flags takes F to 345 (measured; the 338 first recorded was the Gate 2 figure carried forward), so a wrong roster would mask genuine page gaps.
2. **The count was measured at block code `7f375f765`, which is NOT current.** eye-care-test now runs `94122e326`. Every register row fixed between those commits still reads open in this triage — including 87's breadcrumb weight (`9776e7d86`) and 15's drawer column (`31aa51090`). **Those are fixed in code; do not re-investigate them as regressions.** Re-sweeping at current code is the honest way to clear them.
3. **45 content rows** (13 text, 32 presence) are classed `W/content` and are not framework gaps.
4. **Session C's own Gate 3 council corrected 12 of its claims.** In particular the 338 → 192 headline is NOT a clean before/after: only **338 → 176** is a single-variable result (the route code on identical reports). The step to 192 mixes new walker code, new live block code and newly walked states and is not separable. Treat 192 as the current measured state, not as a measure of the route's improvement.

**Goal:** every walker finding on the post-Session-C sweep is matched to the fix register where one fits,
fact-checked against how the framework really works, and live-tested; Bean approves or rejects each one; and only
the approved items become framework fixes.

**Status: not started. Blocked on Session C** (`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`), which
repairs the measuring route first. **This session runs on the post-C sweep (raw F 192), never on Session B's audited 163 rows.**

## The rule this session exists to enforce

**The fix register is the source of truth.** `.claude/plans/2026-10-02-eye-care-fix-register.md` holds the issues
Bean decided and the fixes Bean agreed. A walker finding is a *measurement*, and a measurement never creates a new
fix. Where a finding matches a register item, **the register's fix stands** and the finding is at most a detail of
it. Where a finding matches nothing, it is accepted as-is unless a live test shows it visibly wrong.

Do not edit the register's content. It is correct.

## The unit of work is one item, not a group

The findings were once filed as eight mechanism groups, G1 to G8. A group is a filing label for review and never a
unit of work, and the evidence is in the groups themselves:

- `SGS_Container_Wrapper` must not be applied as a blanket fix: it brings far more than a layout panel, and only
  **5 of G2's 25 rows** actually name it. 6 more want a single alignment member on one inner element; the other
  **14 are a changed default or a one-line opt-in with no wrapper at all**.
- "the framework's only hover-decoration control" was false. `sgs/button::textDecorationHover` and
  `sgs/nav-drawer-menu` exist; the animated underline exists as `.sgs-hover-underline-slide` and `-fade` in the
  theme's `utilities.css` and `.sgs-underline-slide` in the plugin's `extensions.css`. Register items **S2 and
  S12 already decide link behaviour**.
- G1's 72 rows are 17 items of four different kinds (6 missing box families, 6 hardcoded gaps, 3 hardcoded margins,
  2 wrappers with no margin family), 16 of them the contested mega-menu rows. **Only 2 of G6's 8 rows are a
  control.** G3 mixes typed-in timings with a hardcoded hover scale.

So the groups survive only as **filing labels for review**, never as a unit of dispatch or a single fix shape.
The unit of work is **one item, one owner block**.

## Scope

**In scope:** every row on the post-C sweep that is not already closed, decided or owned elsewhere; every register
item marked "still open" or "partly measured"; and the framework fixes for whatever Bean approves.

**Out of scope, with where each lives instead:**

| Left out | Where it goes |
|---|---|
| Any Spec 47 route or logic work | Session C |
| The 447 **T** rows and the 28 **U** rows | Session D, `plans/2026-10-04-spec47-full-coverage.md` "Progress" |
| The register items the parallel repairs track already built (`sgs/button` hover timing, `sgs/business-info` day-label weight, `sgs/site-footer-row` full width, the nav drawer body height, the cart cooldown, the colour tile padding, and whatever else that track records as done) | `plans/2026-10-05-eye-care-register-proven-repairs.md`. Judge the remaining findings against the repaired code, never against today's |
| `sgs/google-reviews`: its F rows, 8 deferred icon combos, all attribution work | the parallel Google reviews track. Its colours and sizes follow Google's UI (40px pills and arrows), an **accepted difference** from the theme and the 44px target (Bean, 2026-10-05): never flag them as gaps |
| Writing page-tree or Site Info values | Session D |

## Step 1: MATCH every remaining row to a register Ref

**Start from the matching already done in the Gate B doc** (https://claude.ai/code/artifact/d3b24008-a0bc-403f-83ae-a8788dd7501f,
tab "Tool rows (not reconciled)", section "Matched to the confirmed register"; its other tab, "Fix register
(confirmed)", is the register itself). It splits Session B's 163 rows three ways. **Correct it against the post-C sweep's 192 raw F rows and show
what changed**, row by row, with a reason per change.

The matching below is the starting point. It is one reading of both lists, not a re-test, so correct it rather than
trust it:

### A. Already in the register (32 rows). The register's fix stands

| Register Ref | Tool rows | What the tool saw | Does the tool's fix agree? |
|---|---|---|---|
| 39-43 social icons | 3.1 (6 rows) | icons scale up on hover | yes: no scale-up |
| 39-43 social icons | 5.2 (3 rows) | no hover ring | yes: a 1px ring in the network's colour |
| 39-43 social icons | 6.1 (3 rows) | 44px not 40px | yes: stays 44px, recorded as decided |
| 39-43 social icons | 4.1 (12 rows) | border shows the brand colour, not the light border | **different route.** Register: a glyph-only brand variant, box stays white with a light border. Tool: patch brand mode per property. **Use the register's** |
| 94 gallery photo hover | 3.8 (1), 5.3 (2) | no zoom, no brighten | zoom yes; brighten: the tool wants new filter settings, the register says join the shared hover zoom. **Use the register's**, and check brighten is covered |
| 77 chosen colour frame | 5.1 (5 rows) | option tile has no border width | partly: the register adds a selected-tile width, the tool wants width and style at rest too |

### B. Under a register item, but a detail it never mentions (42 rows)

**Default: no extra work.** Each is judged when that register item's own fix is done and the result is looked at.

| Register Ref | Tool rows | The detail the tool flagged |
|---|---|---|
| S5 accordions | 1.4 (6), 2.8 (2), 6.2 (2) | FAQ header gap, header alignment, header height 56 against 44 |
| N45, N45b contact form | 1.7 (1), 2.1 (4), 3.2 (5) | label-to-input gap, input display, input 0.2s transition |
| 39-43 social icons | 1.5 (12), 2.9 (2) | icon box padding, row alignment and wrap |
| 38 hours | 1.6 (3) | the gap inside the hours row |
| 48 space above the footer | 4.2 (1) | footer top margin not painting at desktop |
| N20 shapes section width | 4.3 (2) | content band side margins at 1920 |
| 68 colour tiles | 1.17 (1) | option chip bottom margin |
| 73 main photo fade | 3.7 (1) | gallery fade timing |

### C. Not in the register at all (89 rows)

**Default: accepted, no work, unless a live test shows it visibly wrong.** Bean has already said the lens flow
looks right and has challenged the mega-menu rows.

| Screen | Tool rows | Rows | What they are |
|---|---|---|---|
| Lens pop-up | 1.2, 1.3, 1.10 to 1.14, 2.3, 2.4, 2.14, 3.6, 5.4, 5.5 | 35 | small gaps, margins, a border and one extra shadow transition inside the flow. The register's lens items (96, N37, N38) are about behaviour, not these |
| Mega menus | 1.1, 3.3, 1.9, 2.6 | 22 | group padding and transition (**contested: CPT canvas**), brand grid margin, brand tile stacking |
| Product page | 1.15, 1.16, 2.10, 2.13, 7.2, 7.3, 8.2 | 12 | add-to-bag padding, gap and line height, option row alignment and ground, tab hover underline |
| Home | 1.8, 2.2, 2.12, 3.5, 8.1 | 9 | glyph margin, step title growth, logo strip alignment, image transition, dark mat behind a photo |
| Shop | 7.1, 6.3, 6.4 | 5 | product title hover underline (also on Home), two WooCommerce width rows |
| Header and footer | 2.5, 2.7, 2.11 | 3 | three alignment details |
| Google reviews | 3.4 | 3 | the other session's |

**Done when:** every post-C row carries either a register Ref or an explicit "not in the register", and every
change against the table above is listed with its reason.

⚠️ **The count was measured at block code `7f375f765`; eye-care-test now runs `94122e326`.** The sweep deliberately
ran before that deploy so the figure stayed attributable to the route. **Consequence: every register row fixed between
those two commits still reads OPEN in this triage** — including 87's breadcrumb weight (`9776e7d86`) and 15's drawer
column (`31aa51090`), and the `sgs/button`, `sgs/business-info`, `sgs/site-footer-row`, nav-drawer, cart-proxy and
colour-tile rows the register-proven repairs track closed. **Those are fixed in code: do not re-judge them as
findings.** A fresh measure-only sweep at current code is the honest way to clear them, and it is cheap —
`solve.mjs --rounds 0` per surface, then `sweep.mjs`.

**The C table did shrink, and here is by how much** (figures as Session C recorded them; the canvas total is 193 on the baseline sweep, not 161 — see the corrections at the top of this plan). Session C's canvas-awareness rule (FR-47-8) moved **161 rows**
from F to **W** / `canvas-settable`, and the roster covers 12 of the 17 surfaces. Per surface it took footer 76 to 21,
product 42 to 5, mega-lenses 24 to 4, header 15 to 0, contact-form 10 to 0, mega-brands 14 to 8, mobile-menu 12 to 4,
shop 7 to 2, lens 38 to 34 and mega-sunglasses 2 to 1, with **zero change on any non-canvas page**. Every one of those
rows carries a cited block and attribute, and **that citation is a claim to test live, never a closure**: step 2 tests
it rather than taking it. The roster is load-bearing: stripping its flags takes F back to 338, so a wrong roster would
mask genuine page gaps.

## Step 2: FACT-CHECK every row before it counts

A row counts only once it has survived a check against how the framework really works. Each row gets one verdict,
with a cited `file::symbol` or a tree node:

| Verdict | Means |
|---|---|
| **real** | no setting on the block, its canvas, its ancestors by context, its extensions or the utilities can produce the draft value; or a hardcode beats one that can |
| **not a gap (already settable)** | a setting exists and can hold it. Name the block, the attribute and where it already works |
| **wrong block** | the value belongs on a different block (usually a parent that emits the custom property the child consumes) |
| **measuring artefact** | the walker or the route produced it, not the site |
| **decided** | Bean already decided this difference. Name the register item |

**What must be checked, every time:**

1. **Canvas surfaces.** mega menu, modal, drawer, choice flow: a block already in the canvas, or one the author
   would add, may hold the value. Session C's FR-47-8 marks these; verify the citation.
2. **Parent settings by block context.** `providesContext` / `usesContext`. `accordion-item/render.php` reads
   `$block->context['sgs/accordionHeaderPadding']`; `sgs/container` carries 13 typography attributes that inherit
   into every descendant declaring none.
3. **Existing controls and utilities**, including the ones the Gate B doc got wrong:
   `sgs/button::textDecorationHover`, `sgs/nav-drawer-menu`, `.sgs-hover-underline-slide`, `-fade`,
   `.sgs-underline-slide`, `sgs/button::minHeight`, `sgs/nav-drawer::chromeRowHeight`,
   `sgs/card-grid::imageFallbackColour`, `includes/helpers-shadow-hover.php`, `includes/helpers-border-style.php`,
   `includes/image-controls.php`, `includes/helpers-box.php::sgs_label_box_css_rule`.
4. **Decided register items**, which are not gaps: 39-43, S1, S2, S5, S12, N45, N45b, 77, 94, 68, 73, 38, 48, N20,
   and every item in the register's "Decisions" section.
5. **The four known edit-target shifts**, where the fix edits a different block from the one the row is filed
   under:

| Rows filed under | The fix actually edits | Why |
|---|---|---|
| `sgs/accordion-item` gap, justify-content | **`sgs/accordion`** | `headerGap` went on the parent, emitted as `--sgs-accordion-header-gap` beside the header-padding tiers (built, `776a93639`) |
| `sgs/buybox` border, margin, layout on the picker | **`sgs/option-picker`** | the pill is option-picker's own element; buybox only embeds it (`buybox/block.json::supports.sgs.elements.wrapper._note`) |
| `sgs/mega-group` padding, transition | **`sgs/mega-panel`** | `mega-group/block.json` states it carries no styling attributes by design (parent-paints-child); the duration pair sits beside `mega-panel::panelCardLift` |
| `sgs/form-field-textarea` label gap | **`sgs/form`** | `fieldLabelGap` belongs to the Field style group on the parent |

**The citation gate.** Every verdict names an exact DB row (with its values) or a `file::symbol`, and quotes it.
A verdict with neither is rejected and re-run. This is the gate that cut Session B's candidate gaps from 338 to
163, and it is why the surviving ones are worth Bean's time. Session C's own Gate 3 council applied the same gate to
Session C and corrected 12 of its claims, so expect it to bite here too.

**Dispatch:** parallel read-only Opus agents, grouped by **mechanism** for review value, under the merge gate
`lib/register-sweep.mjs::checkStatuses`. The main thread re-checks **every** `real` verdict and a sample of the
others. One shared brief, as in Session B (`.claude/reports/2026-10-05-session-b/b2/BRIEF.md` is the template).

## Step 3: LIVE TEST with Playwright

At **375, 768, 1440 and 1920**, with a screenshot and computed values as the evidence for every claim. One headed
Chrome, one host job at a time.

**3a. Every row that matches no register Ref.** Two questions: is it **visibly wrong** on the live site, and can an
**existing setting in the tree** fix it? A row that is not visibly wrong is accepted and closed with that evidence.
A row an existing setting fixes is Session D's tree work, not a framework fix.

**3b. Every register item marked "still open" or "partly measured" that the walker findings do NOT cover.** Is it
actually resolved live, or is it open and the route failed to see it? **Each one the route missed is a Spec 47
gap**, and it is listed against the spec section that should have caught it:

| If the route missed it because | List it against |
|---|---|
| the element was never paired | §3.3 pairing; `lib/pairs.mjs` |
| the state was never walked | FR-47-7 (flows), or FR-47-6 items 2 to 5 (focus, active, 1920, line counts) |
| the words or presence were never read | FR-47-2's presence, text and link reads |
| the row kind never reached a register check | §5 R6a, `lib/sweep.mjs` |
| the gap was typed wrongly | §5 R5, gap typing |
| a canvas or parent setting was not checked | FR-47-8, canvas awareness |

Session C builds all six of those. A miss that survives Session C is a **new** Spec 47 gap and goes into §5
Residual with its section, not into this session's fix list.

**One extra read, one minute:** the class list on `.sgs-container__inner`'s parent, for the three spacing rows.
See "The three spacing rows" below: their causes are proven in the source, and this read is the one thing the
source cannot answer.

**Measurement discipline** (from `live-probe-measurement-traps` and `compare-draft-vs-live-at-all-three-device-widths`):
read computed styles with the winning rule's origin, not just the value; let transitions settle; account for Lenis
and scroll variables; never reason from a screenshot alone, and never from one width.

## THE OWED WORK: SHIPPED AND VERIFIED 2026-10-06. Nothing outstanding

**Done. The code shipped, the host tail ran, and both surfaces were checked live.** The route cleanup
signalled its Wave 4 sweep complete (F 193 -> 173, banked at `bfe410a71`) before anything of this work
was deployed, so its measurement stayed single-variable as intended.

**The order that actually works, learned by getting it wrong** (now in `dev-setup.md`, `445159275`):
**reseed FIRST**, because `check-wiring-fingerprint` fails the build when a committed `block.json`
attribute is missing from the framework DB; **then commit the regenerated `css-property-classifications.json`**,
because `build-deploy.py` builds from an isolated worktree AT HEAD, so leaving it uncommitted makes the
deploy's own build fail the F6 Reseed-Survival gate with all four new CSS-property attributes flagged as
rogue seeds; **then deploy**. A local `npm run build` passes in between, which is the confusing part.
Both gates were right.

**Live verification, both surfaces, 1440 and 375 identical:**

| Fix | Measured on eye-care-test |
|---|---|
| A7 icon | glyph computes `rgb(250,248,245)`, was `rgb(20,20,20)` |
| A7 card text | title and subline weight 400, line-height 21px; were 600 and a crammed 1.0 |
| A1 gap | `12px` default holds with the control unset |
| A3 min-height | `44px` default holds with the control unset |
| A2 leading | header line-height 24px from the block's own typography, not the deleted 1.4 |
| A6 tabs | no `text-decoration` rule for `.sgs-tabs__tab:hover` in any loaded stylesheet |

**Editor surface**, in the real runtime: all six attributes registered, both `providesContext` entries
present, `sgs/accordion-item` carrying the matching `usesContext`, and the "Header, answer & icon" panel
rendering HEADER GAP (PX) and HEADER MINIMUM HEIGHT (PX) with their help text beside the pre-existing
controls. One scratch page was created for the check and trashed.

*A probe trap worth remembering: those labels are CSS-uppercased, and `innerText` returns the transformed
text, so a case-sensitive `includes('Header gap')` reports absent while `HEADER GAP (PX)` is on screen. The
sanity control caught it — a pre-existing control read as missing too, which is what said "probe", not "bug".*

| Commit | Carries |
|---|---|
| `776a93639` | A1, A2, A3, A5, A6 — the five Bean approved |
| `12c0a0bb6` | A7 symptoms 1 and 2, cause proven live |
| `21e65249a` | The `/qc-council` revision: reverts a hardcode `12c0a0bb6` introduced |
| `9c21b9dff` | Register S4 finished: the card text stops inheriting the button's leading too |
| `74b99ccff` | The reseeded classifier, required before the deploy could pass gate F6 |

### What `/qc-council` changed, 2026-10-06

Bean challenged the set with: *"we don't want to accidentally hard code or force a
design/choice on one website to the whole theme's sites."* Re-reading the diff against that
found one real defect of mine and one capability gap. Two shapes went to council; **one was
built, one was deliberately dropped.**

**SHAPE 1, BUILT (`21e65249a`) — `12c0a0bb6` had hardcoded two font weights.** It declared
`font-weight: 600` on `.sgs-whatsapp-cta__card-title` and `400` on `__card-subline`. 600 was
chosen to preserve what the canary paints, which this project forbids reasoning from, and 400 was
an assumption about the theme body weight — so a client on 300 or 500 would have been given mine.
The real cause: `font-weight: 600` sat on `.sgs-whatsapp-cta__btn`, a class the card variant's
root `<a>` also carries, and the card renders **no label at all**. The weight now sits on
`.sgs-whatsapp-cta__label`, the element it was always for. Paint-identical for inline, banner and
floating — verified in `render.php`: inside the `<a>` those variants render the SVG plus exactly
one of `__label`, that span with `--floating`, or a clipped `.sgs-sr-only`. `labelFontWeight`
still wins at `(0,2,0)` over the base rule's `(0,1,0)`. **Consequence to carry into Session D:**
Eye Care's card title now paints the theme weight, not 600. If its draft wants heavier, that is
`cardTitleFontWeight` per site, not a framework default.

**SHAPE 2, DROPPED — a `tabs` hover indicator colour.** A6 deleted the hardcoded hover
underline, and Bean said the replacement route is "border-bottom width and colour". **That route
does not exist**: the `tab` element's hover state maps only `css:background-color` ->
`tabHoverBgColour`. Costing it showed why it should not be built on spec: the indicator is a
box-shadow scoped to `.sgs-tabs--style-underline`, so a hover member is **inert on the boxed and
pills styles** — a control that cannot paint on two of the three styles unless the editor control
is style-gated. It also needs a vertical-axis twin and a third twin inside the 767px collapse, and
its gradient sibling is unbuildable (`helpers-tokens.php::sgs_border_gradient_css` returns `''`
when the resting paint is empty, and paints a perimeter ring, not a bottom bar). Hover already
carries a text-colour change plus optional `tabHoverBgColour`, and **no draft asks for a hover
underline** — the register's own S2/S12 decisions scope underlines to text links, off buttons. The
deletion removed a forced design choice; adding speculative surface would not improve on that.
`tabs/style.css` now records what exists and what building it would take.

**One rater finding checked and REJECTED.** A sweep flagged `button/style.css::.sgs-button`'s
literal `line-height: 1.2` as the same defect as A2. It is not. `sgs/button` emits its typography
to `.{uid}.sgs-button` `(0,2,0)`, which beats the base rule `(0,1,0)`, so the control already
wins and the literal is a legitimate overridable default. A2 differed because the control painted
the accordion **wrapper** while the hardcode sat on the **header child**, where specificity never
came into it. Acting on the rater would have broken a working default.

⚠️ **Two of three raters cited this session's own commits as independent prior art**, one
misattributing A6's deletion to an older SHA and quoting my own commit message back as a
"deliberate design decision". Recorded in auto memory under `agent-verdicts-need-a-citation-gate`.

### Verifying the deploy: attribute by PROPERTY, not by row count

Live `eye-care-test` now runs **`74b99ccff`** (deploy marker, 2026-10-06 21:35), this session's own deploy.
It was `578a8830b` when the attribution below was worked out; of the 28 commits between them only **4 touched
rendering**: the three block commits above plus the route
cleanup's `809d30f8d`, which changes only `helpers-tokens.php`'s duration sanitiser — a stripped `"0.25s"`
that emitted 25ms is now refused to the 300ms default, so it moves **`transition-duration` and nothing else**.

That property does not overlap the `gap`, `min-height`, `line-height`, `text-decoration`, `font-size`,
`font-weight` and svg `color` this work changes. **So the proof is a direct computed-style read per control,
and a row-count delta is corroboration only** — any transition-duration row that moves belongs to
`809d30f8d`, not here. Do not claim a row count as evidence for these fixes without excluding that property.

**Gates green**, each run individually: `audit-inline-styling.js --check`, `check-dead-controls.js --check`,
`check-editor-render-parity.js --check`, `check-no-client-names.py --check`, and the full 139-gate deploy.
**Both surfaces since PROVEN live** — see the verification table below. A green gate proved neither, which
is why the live check was done rather than inferred.

### Three things the build found this plan had wrong

1. **A1 and A3 could not follow `sgs/tabs::tabMinHeight`.** That attribute is a flat string emitted as
   an inline custom-property *value* on the block's own wrapper. The accordion header lives in the
   CHILD block, so the value has to travel parent -> `providesContext` -> child `usesContext` -> a
   scoped custom property on the item root. The real precedent is `headerPadding` and `iconSize`;
   `tabMinHeight` survives only as the precedent for the `var( --x, 44px )` fallback idiom. Both new
   attributes took `object`/`{}` per-device tiers, matching the siblings in their own inspector panel.
2. **The A1/A3 file list here was short by three files.** It also needed `accordion-item/block.json`
   (`usesContext`), `accordion/edit.js` (the control) and `accordion-item/edit.js` (the canvas mirror).
3. **`accordion-item/render.php`'s inline `iconSize` tier loop became a shared `$sgs_ai_px_tiers`
   closure** used by all three scalar properties. Gap and minimum height pass `allow_zero`: no gap and
   no height floor are both real client choices. A 0px icon is not, so `iconSize` keeps its `>0` guard.

### A7, resolved: two real causes and one non-defect

**Symptom 1, the glyph rendering `rgb(20,20,20)` on the green badge.** Proven, not inferred. The
winning rule, read off the live product page with every stylesheet walked:
`.sgs-wac-46cc31f2.wp-block-sgs-whatsapp-cta .sgs-whatsapp-cta__icon { color: var(--wp--preset--color--text, currentColor) }`.
It is this block's own scoped rule from `whatsapp-cta/render.php`'s icon-follows-label emission,
firing with no authoring at all because `block.json::labelColour` defaults to `"text"`, which the
client palette resolves to `#141414`. It declares `color` directly on the `<svg>`, so the badge's
`text-inverse` — which paints the parent span correctly — can never reach the glyph: an inherited
value loses to a direct declaration at any specificity. Never a specificity problem. Fixed by skipping
the emission for the `card` variant only, verified per variant (card emits neither the flat nor the
hover rule; the other three still emit exactly as before). No new control — the badge default was
already right, so a colour control would have been dead on arrival.

The editor canvas was already correct: `preview-style.js` applies `labelColour` to the root element,
not the svg. The two surfaces disagreed and the front end was the outlier; they now agree.

**Symptom 2, the card text too heavy.** Measured live: root `<a>` 600, title 600, subline 600, body
root 400. `.sgs-whatsapp-cta__btn` carries the button-label weight and neither card text element
declared one, so both inherited it. First fixed by declaring a weight on each, which `21e65249a` then
reverted as a hardcode: the weight moved onto `.sgs-whatsapp-cta__label` instead, so the card text follows
the theme. `cardTitleFontWeight` /
`cardSublineFontWeight` already existed to override them. The title keeps the weight it paints today,
so only the subline moves — the part that measured wrong.

**Symptom 3, the hover underline: NOT a defect, and nothing was changed.** No `:hover`
text-decoration rule reaches this block from anywhere in `plugins/` or `theme/`. The only underline
sources are WP core's global styles on `:focus` and `:focus-visible`, plus a `prefers-contrast: more`
rule — correct, intentional accessibility behaviour. This is Spec 47's known forced-hover false
green, owned by the route cleanup. Patching it would have removed a genuine focus affordance.

**A measuring trap worth carrying forward.** That winning rule is absent from the served HTML: the
host's CSS optimiser extracts per-instance inline `<style>` into a combined stylesheet
(`sgs-1551-*.css`). Zero scoped `.sgs-*-uid` rules appear in 377KB of HTML for *every* SGS block on
that page, with `x-hcdn-cache-status: BYPASS` ruling out staleness and the deployed `render.php`
confirmed present and printing on the server. **Any check that reads page source to decide whether a
block emitted a scoped rule reports a false negative on this host.** A stylesheet walk or a
computed-style read finds it; a grep does not. Recorded in auto memory under
`live-probe-measurement-traps`.

Full reasoning per item in `.claude/reports/2026-10-06-session-c2/BEAN-LIST.md`.

| Ref | Fix | Files | Rows |
|---|---|---|---|
| **A1** | `sgs/accordion` gains `headerGap` + a `providesContext` entry; `sgs/accordion-item` gains `usesContext` and emits `--sgs-accordion-header-gap`; `accordion/style.css` reads it with 12px as fallback. **The only one that changes visible paint** (draft wants 20px on Help, 16px on the product template) | `accordion/block.json`, `accordion/style.css`, `accordion-item/block.json`, `accordion-item/render.php` | 9 |
| **A2** | **Delete** `line-height: 1.4` from `accordion/style.css::.sgs-accordion-item__header` so the block's existing `lineHeight` reaches the title. No new control. The same repair S5 already did for font-size | `accordion/style.css` | 2 |
| **A3** | `sgs/accordion` gains `headerMinHeight`, **default 44px**, replacing the hardcoded `min-height: 44px`. Precedent `sgs/tabs::tabMinHeight` | `accordion/block.json`, `accordion/style.css`, `accordion-item/render.php` | 3 |
| **A5** | `sgs/buybox` selected-value gains a typography call beside the existing `pickerLabel` one; it inherits 16px where the draft wants 13px, and line-height should follow at 1.5x | `buybox/render.php`, `buybox/block.json` | 2 |
| **A6** | **Delete** `text-decoration: underline` from `tabs/style.css::.sgs-tabs__tab:hover`. If a tab underline is ever wanted it is done with border-bottom width and colour, not a text-decoration hardcode (Bean, 2026-10-06) | `tabs/style.css` | 4 |

**A4 was WITHDRAWN by Bean:** `sgs/card-grid`'s `noImageLabelLineHeight` is not needed. "Photo to come" is a
**draft placeholder**, not content — it ceases to exist once the client uploads images, so it is not
required to clone.

**A7 is an INVESTIGATION, not a fix.** `sgs/whatsapp-cta` shows three symptoms, and the cause of the first
is unproven: the icon is black (`rgb(20,20,20)`) where the CSS says the badge should be `text-inverse` =
`#FAF8F5`, which that CSS cannot produce, and the block is unchanged since `94122e326`; the text carries
more weight than the draft; and there is an underline hover effect the draft does not have. **One live
reading of the winning rule's origin on `.sgs-whatsapp-cta__icon-badge` and its `svg` settles the first.**

### Bean's standing principle, which governs how these are built (2026-10-06)

> Our main objective is to make these blocks as modular and mouldable as possible so that our draft sites,
> no matter how they're coded, are able to be cloned with little to no effort. The padding setup is a
> workaround that wastes valuable time and tokens.

Where a draft needs a value, the answer is **a real control with a sensible default**, never a workaround
reaching the same pixels another way. A 44px default satisfies the touch-target rule by default; a client
choosing otherwise in context is their call and not a reason to withhold the control. This overrode a
recommendation to refuse A3 on accessibility grounds. **Do not re-argue it per block.**

## Step 4 (DONE 2026-10-06): one list to Bean, then only the approved fixes

**Only after steps 1 to 3.** Bean gets one list, one line per item: what it is in plain English, which register Ref
it sits under (or none), the verdict with its citation, whether it is visibly wrong live, the proposed fix, and the
effort. **Yes or no per item.** Nothing is built before that.

Then, for approved items only, the framework fixes: **W1**, the shared files, and **W2**, one owner per block. Their
gates are **Gate W1**, **Gate W2** and **Gate TAIL** below; the three assessment gates are **C2-1**, **C2-2** and
**C2-3**.

### W1: the shared files, main thread, one at a time

Each with a cross-client check, because these reach clients that are not Eye Care:

| Shared file | Blocks affected |
|---|---|
| `plugins/sgs-blocks/src/blocks/form/style.css::.sgs-form-field__input` | all five `form-field-*` blocks |
| `theme/sgs-theme/assets/css/woocommerce.css` | `woocommerce/catalog-sorting`, `woocommerce/product-template` (Spec 47 §2: WooCommerce blocks hold no SGS setting, so this is the only channel) |
| `plugins/sgs-blocks/includes/image-controls.php` | `sgs/buybox`'s gallery filter |
| `plugins/sgs-blocks/assets/css/media-element.css::.sgs-media-el` | every image in the framework carries this class |

**`choice-flow/style.css` also declares `.sgs-form-field__input`.** Read both files together and state the cascade
before either lands, or a `form/style.css` default is silently overridden on the choice-flow surfaces.

### W2: one owner per block, in parallel

**The parallel axis is the block, not the mechanism group.** Measured on Session B's catalogue, every group shared
at least one block with another and two blocks were hubs (`sgs/social-icons` in six groups, `sgs/buybox` in six).
Group-per-agent would have put six concurrent editors on one `block.json`. **A queue owns every block its fixes
edit, not only the block the row is filed under** (see the four shifts in step 2).

One `wp-sgs-developer` agent per queue, `isolation: "worktree"`, phase 1 read-only diagnosis, main-thread check,
phase 2 implementation. **No build, commit, deploy or reseed inside an agent.**

**Rebuild the queues from the approved list**, not from Session B's. Session B's partition is the starting shape
and its collision checker still applies:
`node .claude/reports/2026-10-05-session-b/check-queue-collisions.mjs` (exits 1 on a collision or an unowned edit
target). Re-run it before dispatch and after any agent changes its chosen fix shape, because several shapes offer a
choice of target block and the choice decides the collision set.

**Tie-break when a fix shape offers a choice:** take the shape that keeps the edit inside the queue's own blocks;
if both do, the one whose precedent block is closest in kind; if still tied, the one that adds the control where a
client would look for it. Record the choice in the phase-1 deliverable.

### What each W2 agent delivers in phase 1, before writing anything

Per row it will fix:

1. The **attribute name** and its **type** (`string` for a single CSS length, `object` for a box or a per-device
   tier set). The precedents differ — `mega-panel::drawerCardPadding` is a string,
   `google-reviews::headerGap` an object, `icon-list::itemPaddingBlock` a string — so the type is chosen and
   stated, never assumed.
2. Whether it is **responsive** (a per-device tier object plus `ResponsiveOverride`, or a flat value).
3. Its **default**, and what that default changes for existing instances on other clients.
4. **Where the declaration goes**: `block.json` `attributes`, a `supports.sgs.boxFamilies` entry, or
   `supports.sgs.elements.<el>.attrMap` — and the `css_element` it routes to.
5. The **editor side**: the control component (`SgsBoxControl`, `SgsLengthControl`, `ResponsiveOverride`), the
   translated label (`__()` with the `sgs-blocks` text domain), and the editor preview path if the block has one.
   `social-icons/edit.js` already imports `tierBoxShorthand` and `usePreviewTier`, so its canvas preview is a
   separate code path that must be updated too, or the control works on the front end and not in the editor.
6. Whether `plugins/sgs-blocks/scripts/add-control.js` scaffolds this shape — it does not cover box, and its
   typography mode is unusable for the current surface (it predates the 2026-09-07 full-set rule: legacy flat
   attribute shapes, five members missing, and it emits the hover trio the helper cannot read). So this is
   hand-written across `block.json`, `edit.js` and `render.php` — the three hand-kept copies that script
   exists to stop drifting.
7. The **chosen fix shape** where the verdict offered a choice, with the tie-break reason.

**File-size rule.** `social-icons/edit.js` is 786 lines and `render.php` 673, already past the 400 and 500
guidelines. Its queue extracts new inspector panels into a sibling module and new CSS emission into a helper under
`includes/`, rather than growing either file. One responsibility per file is the rule; the line count is the
signal it has been broken.

**No deprecations.** `.claude/rules/block-authoring.md` is explicit: no `deprecated.js`, none wired into
`registerBlockType`, no version bumps pre-production. Several candidate blocks (`accordion-item`, `tabs`, `buybox`,
`mega-group`, `choice-flow`) have a `save.js` returning `InnerBlocks.Content`, so adding an attribute does not
change saved markup at all and only `render.php` changes. Adding an attribute is safe; do not write a deprecation
for it.

**Changed defaults are not a risk worth mitigating.** The framework is pre-production with no content to protect,
so a default is chosen on merit and recorded in the commit, not patched around.

## Known candidates to settle in step 3

These were medium or low confidence in Session B, and each cheap check comes **before** its fix. Session C may
retire some of them outright.

| Candidate | Confidence | What settles it |
|---|---|---|
| `sgs/choice-flow` `border-radius` | medium | read which live node `cr-ref-lens-0` path `""` resolves to: `.sgs-choice-flow`, or a focused inner control with its own 4px radius |
| `sgs/buybox` option `margin-bottom` | medium | a live computed-style read with the winning rule's origin on the product page |
| `sgs/choice-flow-question` option-button `align-items` | medium | re-measure at the exact path; the 0-row DB query carries the verdict alone |
| `sgs/brand-strip` `__track > __set` `align-items` | medium | the open diff sits at the parent path; confirm it is its own combo, not a knock-on |
| `sgs/choice-flow` `__summary-summary` `justify-content` | **low** | no open diff at that exact path in the walk; re-measure before touching it, and drop it if it does not reproduce |
| `woocommerce/product-template` `max-width` ×2 | medium | Session C's L2.7 guard (dropping rows from unmatched refs) is expected to retire both. Confirm after the post-C sweep |
| `sgs/site-footer-row` per-device `gap` and `contentWidth` at 768 | unproven | Session C's L5.5 proves or refutes it read-only; if real it arrives here as a finding |

## The three spacing rows: two causes, both proven in the source

They are **two separate causes on two separate elements**, both proven in the framework's own code. Neither needs
a reading on another client.

### Cause 1: core's constrained-layout rule beats the band (2 rows)

`sgs/container::margin-left` and `::margin-right` on `.sgs-container__inner`.

WordPress core's global styles ship
`.is-layout-constrained > :where(:not(.alignfull)) { margin: auto !important }`. The wrapper writes the band's
side margins as a plain class rule — `class-sgs-container-wrapper.php` builds
`.<uid> > .sgs-container__inner { max-width:…; margin-inline:auto; …; margin-left:<v> }` with **no `!important`**,
and the explicit side is deliberately emitted *after* `margin-inline:auto` so it wins on declaration order inside
SGS's own rule. Against `!important` from another origin, declaration order is irrelevant.

**The framework already has the fix for this exact rule, and it is not a specificity escalation.**
`sgs/hero/render.php` adds `alignfull` unconditionally and says why in the source: core's rule "matches the hero
(its selector EXCLUDES `.alignfull`) and beats our non-important negative-margin full-bleed — producing the
asymmetric outer margin regression. Adding alignfull removes the hero from that selector's match set." So the fix
is to take the band out of the match set, which is a class change on one element, not an `!important` war across
every `SGS_Container_Wrapper` block.

**What is left to confirm is one class-list read on Eye Care's own page**, about a minute: does
`.sgs-container__inner`'s parent carry `is-layout-constrained`? `sgs/container` declares `supports.layout: null`,
so SGS never adds that class itself and it can only arrive from an ancestor core container. If the parent does not
carry it, core's rule never matches and cause 1 is wrong, so the read is the gate on the fix rather than a
formality. Note also that `sgs/container` declares `supports.align: null`, so it can never take `align: full` from
the toolbar and therefore never gets `alignfull` the way the hero does: the fix has to add it, or scope the
ancestor, rather than rely on an operator setting it.

### Cause 2: an inline WP-native base margin beats a class rule (1 row)

`sgs/site-footer::margin-top`. Different element, different mechanism, and nothing to do with core's constrained
layout.

The block's base (desktop) spacing goes through `wp_style_engine_get_styles()` from
`$attributes['style']['spacing']` and **lands inline on the wrapper**. The SGS `margin` desktop tier emits a plain
class rule, and no class rule beats an inline declaration. The wrapper's own comment states the mechanism:
"the base padding is WP-native (style engine) and lands INLINE on the wrapper — a plain @media class rule can never
beat it." Its tablet and mobile tiers already solve it by emitting `!important`; the desktop base does not, which is
the whole defect.

**So the fix is to make the base consistent with the tiers the same block already ships**, or to suppress the
competing WP-native base spacing for blocks that own `margin`. Either way it is decidable from the source, needs no
browser, and its blast radius is `SGS_Container_Wrapper`'s desktop margin path alone.

### The blast radius

Neither fix is an `!important` escalation across every `SGS_Container_Wrapper` block: cause 1 is a scoped class
change on one element and cause 2 is an internal consistency fix on the desktop margin path. **Both go on Bean's
step-4 list like any other finding**, each carrying its cause and its precedent. The cross-client check at Gate W1
still applies, because `SGS_Container_Wrapper` reaches other clients: proving a change is safe is a different
question from knowing its cause.

## The "defect that is not a finding" was REFUTED (2026-10-06)

This section claimed `sgs/social-icons`'s `iconBorderColour` / `iconBorderColourHover` were "a colour control that
can never paint" for want of a border width. **Not true, and no width default is owed.**
`social-icons/render.php` feeds both into `--sgs-social-border` / `--sgs-social-border-hover`
(`sgs_custom_property_gradient_decls`), and `social-icons/style.css` consumes them in
`border: 1px solid var(--sgs-social-border)` on `.sgs-social-icons--outlined .sgs-social-icons__item` and on the
`--boxed` twin, with `border-color: var(--sgs-social-border-hover)` for each hover. The width and style are
already there.

What is true is narrower and is not a defect: the colour paints on the **outlined** and **boxed** styles and not
on **filled** or the plain default, which carry no border. That is a style-conditional control, the same shape as
`sgs/tabs`'s indicator members, and it is correct. Nothing to build.

## One cheap win just outside the findings

`theme/sgs-theme/assets/css/core-blocks-critical.css` declares
`h1, h2, h3, h4, h5, h6, .wp-block-heading { text-wrap: balance }` with no `:where()`, framework-wide for every
client. **The comment directly above that rule records that a framework-wide heading `letter-spacing: -0.01em`
default was removed for exactly this reason** — it "tightened EVERY client's headings and made clones drift from
their reference sites" — and then declares a framework-wide heading default immediately below it.

**NOT WORTH BUILDING. Measured 2026-10-06 and dropped, on Bean's challenge:** “where do we use core blocks
where this would be useful? The vast majority of core blocks have a direct sgs block that replaces them.” He was
right, and the original framing of this item was wrong twice over.

First, “nothing allowing a block to override it” is false: **19 blocks declare a `textWrap` attribute**,
`sgs/heading` among them, each emitting a scoped `.{uid}` rule that beats `h1…h6` (0,0,1) and `.wp-block-heading`
(0,1,0) comfortably.

Second, the core-block exposure it rested on is close to empty:

| The claim | What the code and the live page show |
|---|---|
| core blocks cannot override it | `core/heading` has **0 uses** across every client tree and theme pattern, and `scripts/migrate-core-blocks/pairings/heading_pairing.py` actively transforms it to `sgs/heading` |
| a `core/query-title` finding depends on it | `core/query-title` appears in exactly 2 template sites — `templates/home.html` (the blog index) and `parts/sgs-archive-toolbar.html`. **Eye Care's 17 surfaces contain no archive or blog page**, and that part's own comment notes the title returns empty unless `is_archive()` |
| `.wp-block-heading` is caught by the rule | **0 occurrences** on the live product page. SGS headings render `wp-block-sgs-heading`, so that half of the selector is dead in an SGS site |

**The rule's real reach is SGS blocks' own sub-element headings**, not core blocks. Of 35 heading elements on the
live product page, 22 are `sgs/heading` (already overridable) and 13 are component headings —
`sgs-product-card__title`, `sgs-choice-flow-question__title`, `sgs-choice-flow-result__heading`,
`sgs-cart__panel-heading`. None of `product-card`, `choice-flow-question`, `choice-flow` or `cart` declares a
`textWrap` attribute, so those 13 take `balance` with no per-element opt-out.

**Decision: do nothing here.** A `:where()` would be a framework-wide change bought for a core-block problem this
framework does not have. If a draft ever needs an unbalanced component heading, the answer is a `textWrap` control
on that component — a real control with a sensible default, per Bean's standing principle — not a specificity
change to a shared theme rule. No current finding asks for one.

## Gates

```
GATE C2-1: the matching and the fact-check are sound
AFTER: steps 1 and 2
PASS: every post-C row carries a register Ref or an explicit "not in the register";
      every change against the Gate B doc's A/B/C tables is listed with its reason;
      every verdict cites an exact DB row with its values, or a file::symbol, and quotes it;
      the main thread has re-checked EVERY "real" verdict and a sample of the others;
      no verdict rests on a group label
FAIL: a verdict cites neither a DB row nor a file::symbol
TYPE: auto-gate (the merge gate), then a main-thread re-check
```

```
GATE C2-2: the live evidence is real
AFTER: step 3
PASS: every 3a row has a screenshot and computed values at 375, 768, 1440 and 1920, with the winning rule's
      origin recorded;
      every 3b register item has a live verdict: resolved, or open with the Spec 47 section that should have
      caught it;
      the one class-list read on .sgs-container__inner's parent is done, so cause 1 of the three spacing rows
      is confirmed or refuted before any fix is chosen
FAIL: a claim rests on one width, or on a screenshot with no computed value
TYPE: review-gate (Bean sees the before and after)
```

```
GATE C2-3: Bean's list
AFTER: step 3, before any code
PASS: one line per item, in plain English, with its Ref, verdict, live result, proposed fix and effort;
      Bean has answered yes or no on each
FAIL: anything is built before the answer
TYPE: go/no-go (Bean)
```

```
GATE W1: the shared files are safe for other clients
AFTER: W1
PASS: for each shared file, sandybrown's motion-QA fixture pages (2103, 2109, 2113, 2603, 2740, 3037) show no
      computed-style change at 375/768/1440 against a before-capture, or the rule is scoped so it cannot reach a
      non-Eye-Care client;
      python plugins/sgs-blocks/scripts/run-gates.py --tier full passes;
      the form/style.css and choice-flow/style.css cascade on .sgs-form-field__input is read together and stated
FAIL: a change alters a non-Eye-Care client's paint. Scope it per block instead
TYPE: review-gate (Bean sees the before and after)
```

```
GATE W2: every block's controls work on both surfaces
AFTER: W2, before the deploy
PASS: each new setting appears in the block inspector AND paints on the front end, checked separately on the real
      editor and the real front end (a green build proves neither);
      node plugins/sgs-blocks/scripts/check-editor-render-parity.js passes;
      node plugins/sgs-blocks/scripts/check-dead-controls.js passes;
      node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js passes;
      python plugins/sgs-blocks/scripts/check-box-family-guard.py passes;
      node plugins/sgs-blocks/scripts/audit-inline-styling.js --check exits 0 (Spec 32);
      python scripts/check-no-client-names.py --check passes;
      every diff read in the main thread
FAIL: a control exists but does not paint, or paints only in the editor preview, or only on the front end
TYPE: review-gate
```

```
GATE TAIL: the rows actually closed
AFTER: the serial tail (merge, build, gates, one reseed, deploy, recalibrate, measure-only sweep)
PASS: the approved rows are closed on a fresh measure-only sweep, run with the SAME command, flags and surface
      list as the post-C baseline, from clean HEAD, with the surfaces measured stated beside the result;
      new rows are capped, not forbidden: at most 1 new row per 10 closed, EVERY new row classed with its proof
      in the same commit, and none left unexplained;
      NO divergences.json entry was added to close a row;
      every touched block recalibrates with no new dead or noMarker outcome for the settings added;
      each row closed because its new attribute is present and painting, not because a reclassification moved it
SCOPE, stated honestly: this gate measures Eye Care's 17 surfaces only. Other clients are covered by GATE W1's
      before-and-after on sandybrown's fixture pages and by run-gates.py, not by a re-sweep. A shared-file
      regression on a third client would not be caught here, which is why GATE W1 covers the shared files separately
FAIL: revert the failing QUEUE's merge (the revert unit is the queue, not the group) and re-sweep
TYPE: auto-gate
```

**Why new rows are capped rather than forbidden.** A zero would be both unreachable and gameable. Unreachable
because an empty-tier fall-through can genuinely open one row while closing another: a write to an inherited value
changes every descendant that inherits it. Gameable three ways: register the new row as a divergence, leave the
fix uncalibrated so the resolver reports `uncalibrated` instead of writing, or narrow the sweep's surface list. The
cap, plus "every new row classed with proof in the same commit", plus the no-new-ledger-entries rule, plus the
stated-scope rule, closes all four holes.

**Partial failure.** If one queue fails **Gate W2**, the others merge and deploy without it; its items stay open
on this plan with the queue named. The exception is W1: a shared file failing **Gate W1** blocks every queue whose
rows depend on that file.

## Guardrails that carry into the fix stage

- **Never add a `divergences.json` entry to close a row.** After Session B's B4 the ledger is Solve's write target
  (`judgeDivergence` sets `decided`, `draftValues` reads it), so a wrongly-added entry freezes a wrong value
  permanently and turns no check red.
- **Never route `css_property` onto a row whose `enum_values` is non-NULL.** 633 rows work through calibration
  discovery precisely because that column is empty.
- **Pair every new control family with its `style.css` or `render.php` reader in the same commit**, or the control
  exists, paints nothing, and `check-dead-controls.js` goes red.
- **Test the empty `{}` tier default per family.** An empty mobile tier inherits the nearest wider tier, so one
  desktop write silently changes 375px. Sweep at all widths, never 1440 alone.
- **Add the attribute and confirm `calibrate.mjs` plans a hover instance for it**, or a new hover attribute stays
  `uncalibrated` and closes nothing.
- **One reseed, main thread, from clean HEAD, after messaging peer sessions.** Queue agents never reseed.
- **Never `--skip-oldshape-audit`, never `--allow-dirty`, never `--skip-verify`.** `build-deploy.py`'s oldshape
  audit fails on the *deploy target's* stored content, so `eye-care-test` can pass while `sandybrown` fails: run
  both.

## Do not stage another session's work

Two or more sessions share this worktree, so the commit discipline is part of the plan, not a detail.

- **Commit straight to `main` with an explicit pathspec** (`git commit -- <paths>`), checking
  `git branch --show-current` in the same command. **Never `git add -A`, never a glob, never `git stash`**: on a shared
  worktree a stash sweeps another session's uncommitted files and a glob sweeps a half-done edit into your commit.
- **Read `git diff --cached --name-only` before every commit.**
- **Never stage** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, any path containing `Bean Points` (Bean's
  private notes), or another session's `plugins/sgs-blocks/tests/php/*` edits.
- **Agents never commit at all.** The main thread commits each lane after reading its diff.
- A gate bypass is allowed only for violations that are genuinely not this session's work, and it is disclosed in
  the commit message as `[gates-ok:<reason>]`. **Never `--no-verify`.**

## Effort

Headline figures are the optimistic ones. Steps 1 to 3 are the session's real work; step 4's size is unknown until
Bean has answered, because the approved list may be a fraction of the findings.

| Unit | Headline | Band |
|---|---|---|
| Step 1 matching, against the post-C sweep | 25 min | Block |
| Step 2 fact-check, parallel Opus agents under the citation gate | 40 min | Session |
| Step 2 main-thread re-check of every `real` verdict | 25 min | Block |
| Step 3a live tests, 4 widths, one host job at a time | 45 min | Session |
| Step 3b the register items the findings do not cover | 30 min | Block |
| Step 4 Bean's list | 15 min | Quick |
| W1 the shared files | 15 min | Quick |
| W2 per approved item | **unknown until step 4** | — |
| The serial tail (build, gates, reseed, deploy, recalibrate, sweep) | 60 min | Session |

**Steps 1 to 4 are about 3 hours and produce no code.** That is the point. Writing controls before the findings are
checked would spend about four hours, including 38 controls on one block, on rows that may not be gaps.

## First action (under 5 minutes, no dependencies)

Read Session C's **C3.8 table** (the new F count and what moved, per lane) at the end of
`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`, and list every row that is still open after the
repaired route measured it. That list, not Session B's 163, is this session's input.
