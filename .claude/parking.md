---
doc_type: parking
project: small-giants-wp
last_updated: 2026-07-29
note: "OPEN deferred work ONLY. Four permitted Status values (OPEN | PARTIAL | BLOCKED | DEFERRED) and six buckets. The moment an entry is finished it moves VERBATIM to memory/parking-archive.md under a dated pass heading - enforced mechanically by .claude/hooks/handoff-preflight.py, not by prose. Normalised 2026-07-29: 296KB -> this, one layout, one Status syntax, shipped history stripped to residual scope. Pre-normalise copy: memory/archived-2026-07-28-parking-pre-normalise.md."
---

# parking.md - parked work

**Every entry has the same shape**, and new entries must match it:

```markdown
### P-SLUG - short title
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-29

What is deferred and why it matters. Residual scope only - no history of attempts,
no PROGRESS blocks, no shipped sub-clauses. Those live in decisions.md and git.

**Trigger:** the condition or session that should pick this up.
```

**Rules.** `**Status:**` is exactly one of OPEN / PARTIAL / BLOCKED / DEFERRED - a finished
entry does not belong here. `**Bucket:**` is one of the six section names below. Anything
marked SHIPPED / LANDED / FIXED inside an entry is history: strip it, keep the residual.
`python .claude/hooks/handoff-preflight.py --check` enforces the first two mechanically.

A `**Verify:**` line means the entry may already be complete - check it cheaply before working it.


---

## Cloning pipeline + converter

*53 open entries.*

### P-A1-PHASE2-SLOT-RESPONSIVE-TYPOGRAPHY — Slot-level responsive typography still dropped
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** unknown

Descendant-combinator + hero H1 responsive typography shipped (`642cad61`). Slot-level responsive
typography (per-slot font-size/colour at breakpoints, e.g. `headlineFontSizeTablet`) is still
dropped to variation-CSS-only — confirmed absent from `styling_helpers.py`/`gap_writer.py`
(2026-07-27). Needs the slot-prefix path wired into the universal walker.

**Trigger:** After Wave-2 + trust-bar migration.

### P-ARRAY-RECOGNITION-SCORING — array item-group detection should score candidates, not just pick the largest
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-30

`_find_item_nodes` picks the largest repeating group by size; it should score candidate groups against the block's declared item-field role signature instead, for robustness on ambiguous multi-group sections. Detection works today for the cases actually hit.

**Trigger:** array hardening pass.

### P-BADGE-SLOT-ROUTE-TO-LABEL — bare `badge` BEM slot routes nowhere; overlaps the `pill` alias
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-04

Cosmetic-badge aliases (discount-label, sale-badge, etc.) already route to `sgs/label`. A separate `badge` slot exists with no `standalone_block` and an alias `pill` that also lives on the `label` slot — so a bare `__badge` element routes nowhere, and `pill` is ambiguous across two slots. This is a recognition-routing change, not a pure additive alias, so it needs the cloning thread's per-row measurement gate plus a multi-DB audit before commit, not a quick fix in the theme thread.

**Trigger:** a cloning-thread session — set the `badge` slot's `standalone_block` (or merge it into `label`), resolve the `pill` ownership, re-measure against two clients before committing.

### P-BLOCK-CAPABILITY-NOTES-IN-REFERENCE — Per-block CSS-mechanism notes missing
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-05-31

`02-SGS-BLOCKS-REFERENCE.md` carries no per-block CSS-mechanism note, so a block's real
capability (e.g. `sgs/container`'s per-grid-item override) can't be checked without reading
`edit.js`. Confirmed still absent 2026-07-27. Fix belongs in the generator,
`plugins/sgs-blocks/scripts/generate-block-reference.py` — never the generated doc.

**Trigger:** Opportunistic, next `/sgs-update` generator touch.

### P-BLOCKJSON-SELECTOR-AUTOSEED — per-attr styling selectors should be block-owned, not centrally hardcoded
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-14

Selectors mapping draft BEM classes to a styling attr are currently centralised in an override dict (moved from Python to `attr-classification-overrides.json` on 2026-07-21 — a location move, not a structural fix). The structural problem is unchanged: selectors are still centralised rather than declared per-block in `block.json` alongside the other auto-seeded capabilities (`scalarStylingLift`/`variants`/`containerKind`), so `/sgs-update` cannot seed `derived_selector` from the block's own declaration.

**Trigger:** a dedicated design session — this is Spec-31 seeding-pipeline blast radius (Rule 7: design-gate + adversarial-council before build, full reseed + both conformance suites on verify).

### P-CLONE-FIDELITY-FULL-ALIGNMENT — clone-vs-draft defect families beyond the 55-issue ledger
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-14

The original premise (converter still routes named sections to `sgs/container` instead of composite blocks) is now FALSE — verified 2026-07-27, the current engine resolves any `.sgs-<x>` BEM root directly to `sgs/<x>` before any container fallback, by construction since the D274 rewrite. Do not carry that framing forward.

**What remains genuinely open, needing fresh live triage:** product-card CSS, brand-section button + image styling, ingredients text-align, grid items-per-row, disclaimer block styling, gift-card label styling, button padding, announcement-bar button styling, testimonial-slider double-nested container, plus the older carried-over wrong-layer and CTA-stretch items.

**Trigger:** a fresh live triage session against the current converter engine — the old root-cause framing is dead, but the visual defect list may still be real.

### P-CLONE-PAGE-VISUAL-TRIAGE — Ingredients-band disclaimer content-loss on clone
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-03

Visual triage register of clone page 144 fidelity issues. Six of the original eight issues have
shipped or resolved; #7 is moot (`sgs/announcement-bar` was retired into `sgs/notice-banner`).
Only #6 remains live: the ingredients `__disclaimer` element converts to an empty
`sgs/notice-banner` that loses all its text (and gains an icon the draft never had). The fix-shape
on file references the deleted converter engine and needs re-scoping to the current
`converter/` tree.

**Trigger:** Next pipeline session addressing notice-banner content-synthesis.

### P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER — Dedicated header/footer template-part stage
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

The pipeline treats header/footer markup like page body content. It needs a dedicated stage to
detect header/footer sections, extract once per site (not per page), and emit to template-part
shape with correct wrapper classes. A full 12-step build plan with 5 locked KJCs is preserved at
`plans/archive/2026-05-24-phase-2-header-footer-cloner.md` — reuse it rather than re-deciding.

**Trigger:** Before the next multi-page clone run.

### P-CLONE-TEAM-MEMBER-ITEM-HEIGHT-DIVERGENCE — the height gap is an environment artefact, not a fidelity gap
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-22

The "244px vs 327px height gap" is an ENVIRONMENT ARTEFACT: the oracle renders the DRAFT as a bare `file://` fragment (no WP theme) and the CLONE as a full themed WP page, and `oracle/batch_runner.py:221` hardcodes `_HEIGHT_COMPARABLE = False`, so guard 4 returns passed+measured=False by design and can never pass. The once-parked box-model theory is physically wrong — info-box transfers the draft's padding/background/radius faithfully, and its diverging defaults (`cardStyle:elevated`, `effectHover:lift`) change no RESTING height.

**⚠ Its trigger has FIRED (verified 2026-07-27):** the entry defers to "once the preset fix lands", and the preset-absence mechanism has SHIPPED (`converter/resolvers/preset_absence.py`, wired at `css_pass.py:42/253`). The owed action is now simply the computed-parity Stage 11.6 re-check on team-member — **verify via Stage 11.6 content-keyed parity, NOT the cross-environment height number.** Remove this entry if the box-layout tier matches.

**Trigger:** a clone-fidelity session. See `P-INFOBOX-PRESET-ABSENCE-TRANSFER`.

### P-CONTAINER-WRAPPER-STANDARDISATION — container/wrapper standardisation programme: converter Method-2 residual
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-02

The block-side mirror (every composite/wrapper block mirroring `sgs/container`'s capabilities) is complete across the 29-block roster. What remains is the converter-side Method-2 work: the routing fix so named sections resolve to their composite block before any container fallback (this specific claim was later proven true by construction at the D274 rewrite — verify current status before re-scoping), the converter-lift to transfer mockup CSS onto the now-mirrored attrs, notice-banner content-synthesis, grid-lift, image sideload, and a slider live-4-card residual verify. Also outstanding: `/sgs-update` Stage-11 auto-apply (currently report-only) and residual de-cheat debt from the earlier work-streams.

**Trigger:** the next converter Method-2 session — the block-side half is done; this is the remaining pipeline-fidelity half.

## framework

### P-CSSLAYER-DROPPED-ON-AN-UNASKED-QUESTION — `css_layer` was descoped on a number nobody interrogated
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-21

`css_layer` was descoped on the basis that it was populated on only 6 of 2,817 rows, all with the same value — i.e. that it distinguished nothing. **That reasoning was wrong in the same way the tier bug was wrong: the number was accepted without asking what it SHOULD be.** The L1–L4 OUTER/CONTENT-WIDTH/PER-GRID-ITEM cascade is exactly what separates container attrs that legitimately share a property. The axis question is now settled (Front 1, `7a6a7586`): layer stays on its own axis, and `css_element`/`css_state`/`css_tier` are the separate declarative routing keys — not folded into one element key. Residual = seed `css_layer` more fully.

**⚠ Its own numbers are materially stale (re-measured 2026-07-27):** `css_layer` is now populated on **323 rows across 4 distinct values** (`OUTER`/`GRID`/`GRID_AREA`/`CONTENT`), not "6 of 2,817, all one value". The cited example is also resolved — `sgs/hero`'s 9 `padding` attrs each carry a distinct `css_element`, so that collision group is closed. **RE-MEASURE before treating the "small tail" framing as current.**

**Trigger:** a converter session that needs the layer tail (padding-family collisions).

### P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED — css_property resolver still 2-argument-keyed; 312 attrs ambiguous
**Status:** OPEN (fix shipped, verify live) · **Bucket:** pipeline · **Parked:** 2026-07-21

The converter's `attr_for_property(block_slug, css_property)` resolver was widened (`_base_domain_attrs_for_css_property`, `db_lookup.py:782`) to key on element/state/tier and fail loud (`AmbiguousCssPropAttrError`) on a genuine tie instead of rowid-first. Converter unit suite is green (449 pass). The residual keeping this open is that the widening was never verified against a live clone — whether the keyed data actually IMPROVES cloning fidelity is an R-31-11/R-31-13 claim that was deferred.

**Trigger:** a dedicated converter session; gates any claim that the keyed data improves cloning. Pair with `P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL`'s live-verify residual (same converter surface, same verification run).

### P-DB-PARTIAL-RESEED-RESIDUE — sgs-framework.db partial-reseed regression; 26 converter tests still red
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-16

A prior partial `/sgs-update` run left the DB starved of tag-identity/icon-source/emit_shape rows, causing silent content drops (zero-h1 clones, dropped emoji). The immediate cause was repaired (overrides re-applied, emit_shape reseeded, a genuine duplicate-key bug in `ATTR_CLASSIFICATION_OVERRIDES` fixed) and verified against the real Mama's draft.

**Residue still open:** (a) 26 converter tests remain red, including `test_variant_detect.py` and the hero child-block content-attr test; (b) `sgs/hero` still drops its whole `__content` column on the real draft (h1/label/sub-headline/CTAs absent) even after the seed fix — `emit_shape` for those attrs is correctly `child` now, so the break is downstream in the variant/grid-item path, not the seed; (c) `emit_shape` populated count (121) is still short of the ~139 walk.py expects.

**Trigger:** next converter session — this blocks clone fidelity on every client until closed. Run a full `/sgs-update` (all 10 stages) and re-measure.

### P-DRAFT-CSSVAR-COLOUR-RESOLUTION / P-DRAFT-CSSVAR-SEED-READD — draft CSS-variable colours resolve, but the button-colour seed re-add is unproven live
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06
**Also known as:** P-DRAFT-CSSVAR-SEED-READD

The var-resolution fix (a draft `var(--X)` colour resolving against the draft `:root` map and snapping to the theme token) is done. What is NOT done: re-adding the button-colour SEED (lifting `border-color`/`background-color`/`color` onto `colourBorder`/`colourBackground`/`colourText` via `css_property` overrides) — this was trialled and reverted previously precisely because the var didn't resolve, and now that it does, the seed can go back in. On re-add, verify the value is actually lifted onto the attr, the render reads and paints it, and it lands on the live page (not just unit-verified). Consume the now-built `token_map.build_draft_root_token_map(css)` service rather than re-parsing `:root`.

**Trigger:** button-colour seed re-add session — a converter colour-lift task, distinct from any button-structure work.

### P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE — draft global-styles extractor: Phase 5-6 continuation
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-11

The header/footer setup pipeline's opening step mechanically extracts a draft's design tokens (`:root` custom-props, base typography) into the site's theme so every block inherits the correct base by construction. Part 1 Pass A is BUILT and live-proven on Mama's (the extractor renders the draft, measures computed values, generates theme globals; the historical h1 line-height and arbitrary letter-spacing drift are dead on Mama's).

**Remaining (Phase 5-6):** (a) FR-33-12 orchestrator fail-closed freshness gate (run the extractor before any block clone); (b) FR-33-5 Pass B advisory derivation + FR-33-6 dark-theme safety; (c) FR-33-13 header/footer namespace reserve, and re-point `P-DRAFT-CSSVAR-COLOUR-RESOLUTION` at the new `build_draft_root_token_map()` service instead of re-parsing `:root`; (d) migrate the transitional component CSS (buttons/hero-CTA/focus-ring) out of the Mama's snapshot into theme/block CSS proper; (e) roll out the extractor to the other 5 client snapshots, each behind its own reclone + parity check; (f) Part 2 = the actual header/footer clone (Spec 17 successor).


**⚠ One listed item is ALREADY SHIPPED (verified 2026-07-29): strike the FR-33-12 fail-closed freshness gate from the remaining list.** It is built and wired live — `_freshness_gate()` is defined at `sgs-clone-orchestrator.py:2183` and called unconditionally from `main()` at `:2398`. The other listed items were not contradicted.
**Trigger:** the Phase 5-6 continuation session — needs a design-gate + `/qc-council` on the shared theming surface.

### P-FR-31-2.1A-CLOSURE — converter role-seeding still derives role from the attr NAME, not the declaration
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-16

`assign-canonical.py::detect_role_from_block_json` derives `role` from an attr-NAME regex — the exact name-parsing FR-31-2.1a forbids — but currently produces correct roles (9/9 danger attrs correctly upgraded). A naive "read the declaration first" fix would regress 9 load-bearing attrs, because block.json's `"role":"content"` is WP 7.0's own `contentOnly` pattern-editability marker, not the converter vocabulary — it must stay `content` or the attr becomes non-editable in client patterns.

**Sequenced closure needed:** (1) add an SGS-owned per-attr role channel (`supports.sgs.attrRoles`) parallel to the existing array-item role channel, declaring the specific converter role without touching WP's own `"role":"content"`; (2) seeder reads that channel column-first-else-name-regex-fallback, wire the audit script to prebuild; (3) once every derived role is declared there and the audit proves parity, flip the seeder to channel-first and delete the name-regex rules, verify live. The apiVersion-3 sub-item is already done (all 82 block.json files confirmed apiVersion 3); the theme.json breakpoints sub-item is blocked on WP 7.1 (19 Aug 2026).

**Trigger:** a dedicated design-gated session — this is Spec-31-surface, shared-mechanism territory (Rule 7).

### P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION — Re-diagnose against the single-call-site architecture
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

The original premise (two call sites for `_lift_root_supports_to_style` causing a double-lift) is
dead — the function now has exactly one production call site
(`converter/services/css_pass.py:151`). Any residual double-lift risk must be re-diagnosed against
the current single-call-site architecture before building a regression test.

**Trigger:** Before shipping any further changes to that lift function.

### P-FR2220-VARIANT-DETECTION — Confirm variant_slots populated for stylistic blocks
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-01 (D133)

Hero slot-fingerprint variant detection shipped and is live-DOM verified. The complementary
modifier-class variant detection needed for the stylistic-block majority (gallery layout,
heading/label/text `variantStyle`, divider/mobile-nav) is now built at
`converter/services/variant_detect.py:42`, superseding rather than complementing the
slot-fingerprint approach. The one open question is whether `variant_slots` is actually
populated for those named stylistic blocks.

**Verify:** possibly already complete — the detection mechanism itself is confirmed live; only the
DB population for gallery/divider/heading-label-text is unconfirmed.

**Trigger:** Next pipeline session — confirm `variant_slots` population for the named blocks.

### P-FR226-NULL-SAVE-MIGRATION — Old-post scalar content silently drops on FR-22-6 blocks
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-06-01

An FR-22-6 block whose `save()` is InnerBlocks-only can validate against a null-save-era post's
empty stored markup, so WordPress never walks the deprecation chain and old scalar content
(text/heading/etc.) silently drops on the frontend. The only viable fix is a WP-CLI batch
migration of existing posts — adding an `isEligible` to a deprecation entry is no longer possible,
since `deprecated.js` is banned pre-production (D270/D271). Migration targets must be re-derived
from the live block roster; check whether the "gated on converter close" precondition has cleared
now the Method-2 rewrite (D276) is done.

**Trigger:** When a real production SGS site exists with old-shape posts to migrate.

### P-FR3152-RESIDUAL-FAITHFULNESS — 3 latent responsive-cascade faithfulness gaps, none hit by current mockups
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-30

Three real-but-latent gaps in the device-tier CSS cascade, none currently triggered by any live Mama's clone: (a) a property that appears only inside a `min-width` media rule with no base declaration makes a narrower tier wrongly inherit the desktop value (no "unset at a narrower tier" representation exists yet) — confirmed by full code trace, caused by `all()` over an empty iterator reading vacuously true and a residual-capture guard that then also skips the block entirely; (b) the media-cascade path drops selector-specificity and cross min/max source-order information, so two rules under one breakpoint can let a generic selector wrongly win over a specific one; (c) minor: the width regex is unit-blind (`37.5em` reads as `37`), and a `@media` declaration currently wrongly overrides an inline style on the same property.

**Trigger:** a responsive-faithfulness hardening pass — low priority, no current mockup triggers any of the three.

### P-GAP-CONSOLIDATION-FOLLOWUPS — Container-wrapper gap-control residuals
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-07 (D184)

Five residuals from the D184 gap-consolidation council. (1) `kind="layout"`
`ContainerWrapperControls` still collides with post-grid/gallery/feature-grid's own layout+columns
attrs — needs a gap-only control variant or a namespaced wrapper attr. (2) card-grid/gallery DO
declare `gapTablet`/`gapMobile` (corrected from the original claim) — the real gap is that
`render.php` doesn't consume them responsively yet. (3) container `blockGap` value migration for
pre-existing pages is still open (low-risk). (4) MOOT — `BlockDeprecationsTest.php` doesn't exist
and won't return under the no-deprecations policy. (5) a `calc()`/`clamp()` gap-value whitelist is
still unbuilt (the limitation is now at least documented).

**Trigger:** Framework/shop-layer session touching container-wrapper controls.

### P-GATE-A-CARD-RESIDUALS — product-card option-picker pills deferred to option-picker design discussion
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-04

Of the original Gate-A residuals, `ctaText`/`ctaUrl` and `imageAlt` are resolved and landed. Only the pack-size "pills" equivalent (now `sgs/option-picker`) remains, deliberately deferred by Bean to the option-picker design discussion rather than fixed ad hoc.

**Trigger:** option-picker design discussion.

### P-HERO-SUB-MAXWIDTH-NESTED-CHILD — a per-element max-width on a nested text child inside a composite is dropped
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06

Root cause traced precisely: a nested leaf is built with `is_root=False`, so `layer_detect.py` can never classify it as OUTER (OUTER requires `ctx.is_root`); it lands as CONTENT, which routes `max-width` through the width-equivalence to `contentWidth` — but `sgs/text` has no `contentWidth`-family attr, so the lookup returns None and the value is silently dropped. Two candidate fixes: (a) reclassify CONTENT→OUTER for text-leaf children with no content-width attr, or (b) extend the attr-resolve fallback to CONTENT when the block lacks a `contentWidth` family but has `maxWidth`. Destination is confirmed live (`sgs/text.maxWidth`, `css_property=max-width`).

**Trigger:** the container L1-L4 cascade session.

### P-INFOBOX-PRESET-ABSENCE-TRANSFER — a shared-mechanism converter change shipped without its design gate
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-24

A cloned `sgs/info-box` always inherited its block.json defaults `cardStyle=elevated` (injecting a box-shadow) and `effectHover=lift` regardless of the draft, because those preset selectors are deliberately un-routed. So the clone showed a shadow and hover the draft never had, and double-injected when a shadow WAS present. "Absence" is not representable in the Decl stream. The pattern spans ~8 blocks, so any fix must be universal (R-31-9). Three options went to a design gate, with **Option A recommended**.

**⚠ The critical part, and it is a process question, not a doc-hygiene fix (verified 2026-07-27): a mechanism has already SHIPPED, and it is Option B, not the recommended Option A. The design gate this entry is waiting on appears never to have happened.** `converter/resolvers/preset_absence.py` exists, its own header names "Build #3 Option B: preset-absence transfer (AUTO-DERIVE)", it is wired live (`css_pass.py:42` import, called at `:253`), commit `5807205c` is an ancestor of `main`, and its 22 tests pass. A grep of `decisions.md` finds NO gate decision or sign-off recorded. This is a shared-mechanism converter change — exactly the class Rule 7 requires a pre-build design gate and Bean's approval for. Two things follow: (1) the process question is Bean's to settle; (2) the technical residual is no longer "build a mechanism" but "verify the shipped Option B on a live clone via computed-parity Stage 11.6", plus decide whether Option B is the shape Bean actually wants.

**Trigger:** Bean reviews the shipped Option B. Do NOT rebuild.

### P-INFOBOX-STAR-EMOJI-LANDED — info-box emoji + trust-bar star fill: LANDED proof owed
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-30

Both the info-box emoji-icon lift and the trust-bar star-fill fix are built and merged into main; only the LANDED proof (rendered correctly on the live re-cloned page 8) remains outstanding.

**Trigger:** the Task-4 re-clone.

### P-L4-PER-ELEMENT-EXTRACTION-FOLLOWUPS — duplicate residual marker pairs weaken idempotent re-clone
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-10

When a block emits both a root residual (D289) and a per-area residual (D290), `sgsCustomCss` carries two `SGS-CONVERTER-RESIDUAL` marker pairs. Harmless in output (`custom-css.php` emits verbatim) but it weakens the "idempotent re-clone replace" claim, because no consumer does marker-delimited replacement yet — `converter/services/assembly.py:243` still documents append-after-existing behaviour.

**⚠ The entry's other item is MOOT (verified 2026-07-27):** the claimed `notice-banner textFontSize` dead-write does not exist — `textFontSize` is absent from that block's `block.json` AND `render.php`. Do not go looking for it.

**Trigger:** a per-element-extraction refinement pass. Low priority.

### P-LEGACY-GAP-CANDIDATES-MIGRATION — Re-establish the legacy gap-candidates table state
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** unknown

Before planning any migration of legacy `sgs-framework.db.attribute_gap_candidates` rows,
re-measure the actual state: live count is 2,814 (not the previously stated 1,480/91 split), and
the table has no `confidence`/`provenance` columns. The originally described source and target
schemas don't match reality.

**Trigger:** Post-pipeline-close, when legacy data surfaces get a cleanup pass.

### P-MEDIA-BRAND-GOLDEN-RESEED — brand golden fixture needs re-seeding, but the diff hides possible regressions
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06

The `mamas-munches-homepage__brand` conformance golden is stale from an intended media-attr rename, but the live diff is bigger than that alone: the heading has LOST its `style.color`, and the button now emits border attrs the golden has no trace of, accompanied by ~30 currently un-routed `[fold-gap]` warnings. Re-seeding now would silently bake a possible regression in as "correct".

**Do not re-seed until the heading colour loss and the CTA border divergence are root-caused.**

**Trigger:** a deliberate golden-reseed pass, gated on root-causing the two live divergences first.

### P-MEGA-BLOCKS-MISSING-FROM-CONTAINER-ROSTER — three mega blocks absent from the container-wrapping roster
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

`/sgs-update` Stage 11 (`sync-container-wrapping-blocks.py`) WARNS: detection finds `sgs/mega-panel` (section-kind) plus `sgs/mega-aside` and `sgs/mega-group` (content-kind) as container-wrapping blocks, but they are absent from the script's expected ground-truth roster, so the sync fails closed before `--apply` (correct behaviour; diffs at `pipeline-state/container-inheritance-sync/2026-07-28/`). Declaring them is a composite-mirror scope statement (D152 lineage), not a mechanical edit — which is why it is parked rather than patched.

**Trigger:** next Spec-36 session or the next full `/sgs-update` — confirm each mega block's KIND, add to the expected roster, re-run Stage 11 clean. Owned by Track 2.

### P-MULTIBUTTON-768-WRAP — hero CTAs still wrap onto separate lines at 768px
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06

At 768px the hero's two CTAs wrap because the rendered buttons are slightly wider than the draft's equivalents — a button-sizing issue, flex-direction itself is already correct. Needs a browser check (button was rebuilt since this was parked — may already be fixed, per the LIVE-BROWSER-GATED index).

**Verify:** possibly already resolved — the button component has been rebuilt since this entry was written; needs a live measurement, not a static read.

**Trigger:** button-sizing pass or the next visual QC batch.

### P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS — nav-drawer's 7 variantPresets have empty structural discriminators
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

D403 shipped 7 nav-drawer `variantPreset` variations, but the `supports.sgs.variants` set-difference leaves 6 of 7 variants (anchored-card-stack / centred-statement / editorial-ghost-list / solid-brand-light / two-column-editorial / split-zone-serif) with an EMPTY discriminator signature — `detect_variant` cannot tell them apart from extracted CSS. This is the same class as `P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL` (the universal F6 ambiguity rule built from the trust-bar case). The `variantPreset` enum itself was added (mechanical transcription from variations.js) and this finding was consciously BASELINED (`db-consistency-baseline.json`) to unblock main's prebuild — that is not a fix.

**To close:** give each variant structural/styling discriminators per the F6 fix pattern (only ONE variant may keep the empty fallback), then remove the baseline key. `detect_variant` is blind on nav-drawer until this lands.

**Status reasoning:** assigned OPEN rather than DEFERRED because it names a concrete next-session trigger and blocks a live capability (drawer-variant cloning), not a speculative future want.

**Trigger:** next nav/Spec-36 session — before any drawer-variant cloning is attempted.

### P-NO-INLINE-GATE-COVERAGE-GAPS — the inline-zero gate can pass vacuously
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

Two structural gaps in inline-zero enforcement, both proven live. (1) **`check-no-inline.py`'s CANARY_URLS never exercise hover/animation-attributed instances** — the team-member inline-var class passed the gate vacuously for weeks because no gate-covered page carried the attrs; it surfaced only via a QC draft page. Fix: a permanent published gate-canary page seeded with one instance of each var-driven feature (hover scale, animation, parallax, image-controls, block-link), added to CANARY_URLS. (2) **Three NON-injector inline-style writers remain un-triaged** by the injector sweep — `class-sgs-container-wrapper.php`, `class-post-grid-rest.php`, `shape-dividers.php`. They build markup render-side rather than via `render_block` injectors; the wrapper is known D345-fixed for `extra_styles`, but no per-file classification (inline property declarations vs scoped/lifted) has been done.

**Trigger:** next Spec-32/gate session. Item (1) is cheap and high-value — it converts a vacuous pass into a real one.

### P-NO-INLINE-LAND-ROSTER — no-inline rollout: full-roster per-block LANDED accounting still owed
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-10

The split-edit/serial-land integration merged ~35 blocks' no-inline work (code-complete, build-green, DB reseeded) but only spot-verified a subset. The prebuild gates (`audit-inline-styling.js --check`, `check-box-family-guard.py --check`) are already wired into `package.json` (confirmed done — do not re-add). What remains: run the full-roster verify script across the remaining blocks and write a `reports/visual-diff/<block>-<date>.md` per block with `verdict: PASS` + `first_paint_capture_passed: true` for every block, not just the ones already spot-checked.

**Trigger:** the LAND-completion session — the main remaining work of the no-inline rollout.

### P-PAGE8-DISCREPANCY-REGISTER / P-PAGE8-QC-BATCH-9 — page-8 clone-fidelity visual defect registers
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-06 / 2026-07-11
**Also known as:** P-PAGE8-QC-BATCH-9

Two overlapping Bean-reported visual-QC defect registers against the live page-8 clone, several defects already fixed and landed in each. Bean's standing instruction for both: root-cause each defect to a small number of UNIVERSAL causes (most trace back to the "hardcoded default overriding a faithfully-absent draft value" class), fix as a batch grouped by shared cause, never piecemeal.

**Remaining defects (deduplicated across both registers):** black borders (partially fixed — safecss/border-colour transfer), card equal-height (partially fixed), button preset/width/hover divergences (ghost-button underline-on-hover, ghost-button colour resolution — tracked separately at `P-DRAFT-CSSVAR-COLOUR-RESOLUTION`), component-injected defaults (option-picker tick mark and pill width, label-highlight width, info-box margins, disclaimer box styling, emoji size, trustpilot bar height), brand-section spacing/line-height (verify it isn't a separate injected margin before attributing to the theme base), and the inline-styles-architecture question (distinguish legitimate scoped `<style>` from genuine inline `style=""` before changing anything). Precondition: page 8 needs re-cloning first, since its current baseline pre-dates several fixes already landed.

**Trigger:** needs the LIVE-BROWSER-GATED treatment (a live QC session, not a static re-audit) — re-clone page 8 first, then re-triage what's actually still visible against the current engine.

### P-PHASE8-6 — Nested `<nav>` mapping to sgs/nav-menu
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

Nested `<nav>` inside non-header sections currently passes through as bare paragraph links.
Route it to `sgs/nav-menu` — not `core/navigation` (banned), nor `sgs/mega-menu` (deleted at
FR-37-21/D362) — via a child-link lifting helper.

**Trigger:** Phase 8 work hits a section with nested nav, or a new client mockup needs
section-internal navigation.

### P-PHASE8-9 — Slot-synonym expansion: tile / module / item
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

`card`/`panel` already seed to `sgs/info-box`. `feature` exists with `standalone_block` NULL;
`tile`, `module`, `item` are absent. Remaining work: set `feature`'s `standalone_block`, and add
`tile` + `module` (+ `item` if wanted) as `slots` rows — not `slot_synonyms`, which was retired.

**Trigger:** Next client mockup that surfaces one of these names as an unmatched gap in
`leftover-buckets.json`.

### P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES — Snapshot pull round-trip + pre-deploy guard missing
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-03

`push-theme-snapshot.py` now writes both `theme.json` and the live `wp_global_styles` post
(shipped D161) — the original silent-fail bug is closed. Still missing: the pull round-trip
(reading live edits back into the snapshot) and a pre-deploy guard that warns when a user has
edited live styles that a push would overwrite.

**Trigger:** Next theme-snapshot tooling session.

### P-QUOTE-PATH2-SELF-NESTING — golden re-seed residual only; the code fix is merged
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-25

The Path-2 self-nesting bug (an unrecognised child element resolving to its own parent block's slug, letting a block self-nest) is **CODE RESOLVED and merged into `main`** — do not go looking for an unmerged branch. Three universal defences shipped: a recognition self-nest guard (FR-31-11), a transparent-wrapper dissolve that fixed a silent content-drop class on tab/feature-grid/form-step/modal, and a `content_band` fill-width fix.

**Residual:** 4 conformance goldens (tab / feature-grid / form-step / modal) are FOSSILS encoding the old dropped/self-nested content and now correctly fail. They need a LANDED-proof full-corpus re-seed — `tests/seed_conformance_goldens.py` re-seeds all 40 from local emit and its provenance gate mandates a canary deploy + computed-parity proof FIRST, never a bare local emit. **This is the SAME task as `P-CONFORMANCE-GOLDEN-DRIFT`** (one 27-failure re-baseline; these 4 are a subset, not extra work).

**Trigger:** the next LANDED-deploy / oracle re-seed session.

### P-RAWSVG-FILLED-VS-OUTLINE — trust-bar per-icon fill-style control: LANDED verification owed
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-02

The per-icon "outline vs filled" control (`fillStyle`/`fillColour` + `is_filled_glyph` converter auto-set) is built. What's left is confirming it renders correctly (star filled, not outline) on the live re-cloned page — this needs a browser pass, per the LIVE-BROWSER-GATED index.

**Trigger:** the Task-4 re-clone verification pass.

### P-RECOGNISER-HEADER-BEHAVIOUR-MULTIFLAG — cloning recogniser's header-behaviour detector predates the multi-flag block-attr model
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-07-14

`tools/recogniser/section_detector.py` detects a single `sgs-header-behaviour-{slug}` body class and writes one `sgs_header_rules` WP-option rule. This is stale: header behaviour is now independent multi-flags (sticky+transparent+shrink+contrast can co-exist) sourced from `sgs/site-header` block attributes — the plugin no longer reads the option for behaviour. The recogniser needs to detect the multi-flag classes and write block attrs instead (or be dropped).

**Trigger:** Spec 33 Part 2 build (the header/footer clone pipeline) — this belongs there, not to a standalone fix.

### P-RESPONSIVE-ROUTER-ROBUSTNESS — a no-width media condition is silently folded into the screen base
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-10

A media condition with NO width component (`@media print`, `prefers-color-scheme`, `orientation`, `prefers-reduced-motion`) whose selector matches a converted element folds into the SCREEN base for all tiers and is never captured as a residual. It should be a passthrough residual — the router needs media-type awareness. The sibling item (inverted-threshold `min-width` pairs resolving by threshold rather than source order) is largely subsumed by the D303 tier-confinement bounding; only two residuals landing in the SAME tier can still collide, resolved by ascending emission order.

**⚠ Root cause CONFIRMED by full code trace (2026-07-27), and it is subtler than "not handled" — it is swallowed twice over.** (a) `_media_condition_applies_at` (`styling_helpers.py:48-64`) tests `all(...)` over an empty match iterator, and **`all()` over an empty iterable is vacuously True** — so a no-width condition reads as matching at EVERY sampled width and folds into `tier_effective` for all three tiers. (b) The residual-capture guard (`:817`) builds `thresholds` from a width regex then tests `any(t not in device_thresholds ...)`; with `thresholds == []` that is False, so the residual block is skipped entirely. `bound_residual_media_conds` DOES have a documented no-width passthrough (`:94-95`) but is never reached, because the caller filters the condition out first.

**Trigger:** a router-hardening pass. Low priority — no current mockup triggers either item.

### P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES — `role` and `css_property` answer different questions; do not merge them
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-21

**A standing finding that REVERSES an earlier assumption — read this before any proposal to "fix" or retire `role`.** `role` = what the value IS (a colour → the client needs a colour picker). `css_property` + element/state/tier = how it is DELIVERED. They are perpendicular, and neither replaces the other. Proof: `sgs/cta-section shadow`, `sgs/card-grid cardShadow` and `sgs/team-member cardShadow` all carry `role='color'` + `css_property='box-shadow'` — not disagreements but the same value-type-vs-delivery distinction. Measured on the 290 rows where both are populated: exactly 2 genuine disagreements (0.7%). Caveat that must travel with that number: 290 is only 30% of `role`'s 977 populated rows, so it is 99% on the measurable third, not a clean bill of health. `canonical_slot` / `derived_selector` are not replaceable at all — they answer recognition, a third axis. **Do NOT pursue replacement: it would delete a working semantic axis to install a mechanical one.**

**Residual work:** `sgs/product-card`'s `pickerPillBorderRadius` / `pickerPillSelectedBorderRadius` still carry the wrong `role: typography` (the `pill*` name-collision) in `attr-classification-overrides.json` — the same one-line `visual` fix already shipped for `sgs/option-picker` at D-source `7a6a7586`. Left for Bean's call.

**Trigger:** the pickerPill\* fix is a cheap 2-row edit in any converter session; the finding itself gates any future "fix role" proposal.

### P-S16-4 — Pre-emit JSON serialisation validation
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

Source text with newlines/unescaped quotes/control chars could break JSON serialisation in block
markup — no pre-emit validator exists. Original anchor (`convert.py`) is deleted; re-anchor the
check to the current `converter/` tree rather than assuming it's still missing or already fixed.

**Trigger:** Next converter pass touching text emission (batch with any Spec-16-descended work).

### P-S16-6 — Second-client converter validation (rewrite the trigger first)
**Status:** OPEN · **Bucket:** pipeline · **Parked:** unknown

Closure criterion: run the converter unmodified on a second client (Indus Foods / helping-doctors
mockups already exist). The original trigger ("≤1% per-section pixel-diff") is dead — Stage-11
pixel-diff was purged and replaced by Stage 11.6 computed-parity.

**Trigger:** Rewrite the trigger as a computed-parity threshold, then run (~30 min once rewritten).

### P-SCALAR-LIFT-RESIDUAL-DRIFT — scalar-styling-lift residual: product-card pill/CTA styling ownership needs settling
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-06

Most render-verified selector-drift fixes shipped (card-grid, quote, product-card, option-picker). Remaining, deliberately not guessed: product-card's `pill*`/`pickerLabel*` attrs are legacy-dead (the pills are now the embedded child `sgs/option-picker`) while `cta*` styling is owned by a different mechanism — leave until the product-card/option-picker area settles, then retire or re-home. (The mobile-nav half of this entry is moot — that block was deleted.)

**Trigger:** the product-card/option-picker area settling.

### P-SINGLE-ITEM-ARRAYS — a single-item array never triggers the array lift
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-30

Structural item detection needs ≥2 repeating siblings; a 1-item "array" (e.g. one testimonial where the block supports many) won't lift at all. Needs a decision: accept the gap, or add a schema-signature single-item fallback.

**Trigger:** next array-handling design decision.

### P-SPEC22-DESIGN-GATE-PHASES — three retired-Spec-22 gaps need re-deriving against Spec 31's FR numbering before any build
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-06-14

Three design-gate-shaped follow-ons from the old Spec 22 (array→child wiring, draft-driven responsive breakpoints, a layout-CSS sidecar mechanism) were scoped out as needing their own design session each. All of the entry's original file:line citations are now dead (the files were deleted or rewritten in the D274 engine rewrite), and array-item machinery may already substantially exist under different names.

**Trigger:** re-derive each of the three items against Spec 31's current FR-31-* numbering before scoping any work — the old coordinates are unusable.

### P-SUBHEADING-ROUTING-TO-SGS-HEADING — Walker needs to set headingRole on subheading emit
**Status:** BLOCKED · **Bucket:** pipeline · **Parked:** 2026-05-28/29 (D99)

Routing mockup subheadings to `sgs/heading{headingRole:'subheading'}` instead of `sgs/text` needs
the walker to set `headingRole` at emission time — confirmed still missing (only a docstring note
exists at `db_lookup.py:3026`, no code sets it). Flipping the `slots` row alone (still `sgs/text`)
would mis-render subheadings as headings. Options: (a) a walker derive rule from canonical_slot
identity, or (b) a new `slots.standalone_block_default_attrs` JSON column.

**Trigger:** Phase 1.4 walker rewrite — pick mechanism (a) or (b) at that point.

### P-TESTIMONIAL-CONVERTER-FR2220 — testimonial content-lift: only quote/name/stars routed, other typed fields aren't
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-11

The core empty-slide bug (a stale composition flag causing the converter to emit child blocks the typed render.php ignores) is fixed and live-verified; quote/author/star-rating now lift correctly via a universal scalar-lift mechanism. Re-scoped 2026-07-27: of the remaining unrouted typed fields, only `__summary`/`__org`/`__date` are genuinely unwired for content-lift (styling-role only); the avatar/logo/work-image fields already carry a live generic image-content-lift role, so they may not need separate work — pending a live render check.


**⚠ Residual is NARROWER than stated (re-measured 2026-07-29):** `reviewDate` is now wired (`role='text-content'` in `block_attributes`). Only `summaryPhrase` and `orgName` remain unwired (both `role=NULL`).
**Trigger:** the cloning Stage-2 routing wave; also the broader FR-22-20 variant-detection generalisation past hero+testimonial.

### P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL — nav-drawer/trust-bar variant discrimination must be BEM-structural, not styling-attr-based
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-21

Design-gated and Bean-approved 2026-07-21; ready to build, deliberately deferred. `sgs/trust-bar`'s `icon-circle` variant is discriminated by FIVE **styling** attrs (`iconCircleSize`, `iconCircleBackground`, `iconColour`, `iconCircleBorderRadius`, `iconCircleShadow`) while `text-only` and `image-badge` have **zero** discriminators. Styling attrs are exactly what the CSS lift populates, so once `css_property` exists they become lift-producible and `detect_variant` can mis-score — every trust-bar risks reading as `icon-circle`. `css_element` cannot fix this: an attr is lift-producible merely by HAVING a `css_property`, so this is lift-producibility, not ambiguity.

**THE FIX, concrete and already evidenced — discriminate on BEM STRUCTURE, per R-31-2 ("BEM is the only recognition signal"), which the current styling-attr model sits outside.** The lift can fabricate attribute VALUES; it cannot fabricate an ELEMENT absent from the draft. `trust-bar/render.php` already emits structurally distinct markup per variant: **`image-badge`** → `<img class="sgs-trust-bar__badge-img">`; **`text-only`** → `.sgs-trust-bar__badge-label` only, no image and no icon; **`icon-circle`** → `.sgs-trust-bar__badge` + icon `<span>` + `.sgs-trust-bar__label`. Bean's framing: *"shouldn't trust-bar be able to tell between image-badge and text-only because text-only has no image?"* — yes, and that is why the two currently have no discriminators at all: what separates them is structural. **Scope is UNIVERSAL (R-31-9), not trust-bar-only** — styling attrs are unsafe discriminators for EVERY block with variants; audit all `variant_slots` rows, not just this one.

**Residual after D362/Front-2 shipped work:** trust-bar's own case is fixed (structural image controls double as its recogniser; the F6 gate is now a universal ambiguity rule — 2+ variants sharing an identical/empty signature = violation, one zero-signature fallback allowed) and unit-verified, but **live-clone verification was never done**.

**Trigger:** live-verify alongside `P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED` (same converter surface, same verification run); the universal audit of other blocks' `variant_slots` rows is still to be done (see also `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS`, which is the same defect class recurring on nav-drawer).

### P-VERIFY-WAVE2-A1 — Re-diagnose hero duplicate-wrapper claim if still observed
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-05-31

Wave-2/A1 structural migration verified (~6/7 sections correct); trust-bar-hybrid half is closed.
The remaining "hero duplicate-wrapper" root cause no longer exists in the current engine —
`hero/render.php` emits exactly one wrapper by design, and the converter's dual-emission was
pre-D274 behaviour. If a duplicate wrapper is still visible on a rendered page, it needs
re-diagnosing from scratch rather than carrying this stale root cause forward.

**Trigger:** Only if a duplicate hero wrapper is actually observed live.

### P-W3-ARCHIVE-RESIDUALS — Plans-archive sweep residuals (3 items)
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-04

Three residuals from the 2026-07-04 plans-archive sweep. (1) `!important` render-surface sweep:
burn the 30 baselined Check #3 findings toward 0 over time, never add new ones. (2) FP-P
(product-card CTA not flex-stretched on the clone path): the "clone emits an sgs/button child"
premise is now historical — post-purge clones emit zero children — so this resolves once Phase 2
lands `ctaText` into the typed attr; verify on the first Phase-2 re-clone. (3) BR-B (brand image
sideload) and IN-E (info-box text-align) both look likely already closed per a live check (images
all HTTP 200; textAlign fold shipped) — flip both rows with computed-style evidence on the next
full ledger walk.

**Verify:** possibly already complete — items (3) BR-B/IN-E look closed per the entry's own live
check; confirm with computed-style evidence rather than assuming.

**Trigger:** Next full ledger walk / Phase-2 product-card landing.

## framework


### P-ARRAY-LIFT-LEAF-COLLISION — two blocks can misassign leaf text, and neither has a golden
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-08

The L1d leaf-text array lift is safe and universal, but `sgs/process-steps` and `sgs/hero.badges`
each declare 2-3 colliding `text-content` fields AND have no conformance golden. If a draft ever
authored a truly markup-free LEAF item for those blocks, L1d's first-declared field would claim the
text — a MISASSIGN, not an over-lift, and strictly better than the pre-L1d behaviour which lifted
nothing. Not a regression; a latent edge with no test covering it.

**Trigger:** next converter-test pass — add golden fixtures for a process-steps draft and a
hero-badges draft.

### P-INTERIOR-CHROME-FOLD — render.php-built interior chrome does not fold on clone
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-06-14

Interior chrome built by render.php must fold when a draft is cloned: 5 blocks are fold-only
(testimonial-slider arrows/dots, gallery and post-grid chrome) and 2 are fold+extract
(tabs `__nav` to `sgs/tab.label`, form `__steps` labels). Deliberately parked, not neglected: no
active client draft contains tabs or accordions; a name-keyed `chrome_elements` column is the
D85/DEC-2 trap and conflates fold with extract; and interior fold is 4th-walker-exception territory
needing an FR amendment. Gate A goldens deliberately lock the CURRENT (known-wrong) accordion/tabs
emits so drift stays visible.

**Verify:** re-verified accurate 2026-07-27 — a grep of `converter/services/*.py` for
`chrome_elements|testimonial-slider|__nav|__dots|__arrow` returns zero non-test hits, so no
chrome-fold mechanism exists in the post-D274 engine, and Spec 31 §13.2 still permits exactly 3
walker exceptions with no 4th added.

**Trigger:** ships with or after the Stage-1 Commit 4 work, never before Commit 2.

### P-PACKSIZE-ACTIVE-DEFAULT — cloned option-picker has no pre-selected pill
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-07-08

A cloned `sgs/option-picker` renders with NO pre-selected pill: the draft's `--active` pill (e.g.
12-pack) is not lifted as `defaultSelected`. The array lifter (`array_content.py`) lifts only the
pill's text (`label`); marking the active default means reading the `--active` CSS **modifier** — a
boolean-from-modifier mechanism the array resolver does not have. Low value (selectable-only).

**Trigger:** fold into the named-pickers work.

---

## Framework: blocks, theme, specs

*57 open entries.*

### P-19 — Migrate remaining blocks off the saved-defaults system
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-05-08

The audit step as originally written presumes per-block opt-in consumers of `withSaveAsDefault` —
in live code it's a single blanket filter (`block-defaults.js:108-112`) applied to every block, so
there's nothing to enumerate; re-scope the audit before running. Remaining goal stands: migrate
every block toward native WP mechanisms (visual styling → Global Styles, structural
starting-state → block patterns, per-operator memory → sessionStorage, per-instance → inspector).
`sgs/icon-list` already migrated as the pilot; `<BlockDefaultsPanel>` direct usage is already 0.

**Trigger:** Framework polish pass; not blocking active work.

### P-9 — Remaining bucket-2 blocks + timeline rework
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-05-07

`sgs/button` grouping shipped (`270cd995`/D146). `sgs/testimonial-slider` is also already shipped
(strike it from the original gap-candidate table). Genuinely open: `sgs/empty-state` block,
`sgs/toggle` block (neither directory exists), plus the `sgs/timeline` rework — tracked separately
as `P-TIMELINE-ADVANCED-VISUAL-EFFECTS`.

**Trigger:** After cloning pipeline Method-2 lands.

### P-ARCHIVE-PRODUCT-WC-VALIDATION — archive-product template shows editor block-validation errors (frontend renders fine)
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

The `archive-product` theme template shows "Block validation failed" in the editor on 4 `sgs/container` instances plus the WooCommerce product-filters subtree. Confirmed NOT caused by the stale-wrapper fix — the cause is that the stored WC-filter markup doesn't match the installed WooCommerce version's block save output (a WC-core version-drift problem). The frontend renders correctly (dynamic blocks regenerate regardless of editor validity), so this is editor-cosmetic, not a live break, but needs a dedicated WooCommerce-reconciliation fix rather than a blind "Attempt Block Recovery".

**Trigger:** a session owning the WC shop layer (Spec 30); verify against the installed WC version first.

### P-AUTO-CONTRAST-LIGHT-PRIMARIES — Universal auto-contrast for light brand primaries
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-03

Framework default white button/pill text fails contrast against light-pastel brand primaries
(e.g. Mama's Munches pink). True universal auto-contrast — correct for any primary with zero
per-client override — needs CSS `contrast-color()` (browser support not yet safe for production)
or a build-time luminance calculation step. Current workaround: per-client override in
`theme-snapshot.json`.

**Trigger:** Bean feature decision, or once `contrast-color()` browser support matures.

### P-BLOCK-DESIGN-POLISH — cta-section + notice-banner design upgrades
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-02

Two design upgrades from Bean's brain-dump: cta-section needs rich template patterns
(stats/social-proof filler like the hero presets, not just alignment variants); notice-banner
needs per-type icon+CSS bundles as ideal defaults. Also a pending decision on the dormant
heading `hero` variant.

**Trigger:** Framework design-polish pass.

### P-CONTAINER-TIER-COUNT-VS-BASE-TEMPLATE — container per-tier column-count control is inert when a base template is set (unreachable in practice)
**Status:** OPEN (optional UX polish) · **Bucket:** framework · **Parked:** 2026-07-02

Confirmed unreachable by both converter engines and every shipped pattern — only reachable by manual inspector editing, and the inspector help text was already updated so it's no longer misleading. Optional residual: hide the per-tier count control entirely when a base template is set, matching how the desktop count control is already hidden in that case.

**Trigger:** a container-inspector UX pass — genuinely optional, not blocking anything.

## tooling

### P-DEAD-NULL-ROLE-CONTROLS — trust-bar shape-divider controls are declared-but-unbuilt dead render paths
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-12

`shapeDividerTopColour`/`shapeDividerBottomColour` are declared in `sgs/trust-bar`'s block.json but consumed nowhere in its render.php or style.css — the whole shape-divider feature is declared but never built, confirmed still true on re-check. (The paired mobile-nav attrs this entry originally covered are moot — that block was deleted.) Because the controls are genuinely dead, seeding a `role` for them would create a phantom lift with no render effect. The decision is: wire the divider feature properly, or remove the two dead controls.

**Trigger:** a trust-bar block-quality pass; also worth extending the dead-control gate to follow an attr through its CSS-variable indirection, which is the blind spot that let this stay hidden.

### P-DRAWER-MOVABLE-OVERFLOW-DROPZONE — freely-positionable overflow/menu drop-zone inside the nav drawer
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-13

Bean's design requirement: the drawer's contents currently render in a fixed zone order; instead the operator should be able to drag a placeholder element anywhere in the drawer's editable content, and the nav menu (plus anything moved into the drawer) renders at that position — fully positional, not a fixed "contact → menu → rest" order. Desktop-bar overflow keeps its existing "More" dropdown; this only governs the mobile drawer's menu placement. Implementation sketch: a marker InnerBlock (e.g. `sgs/nav-menu-slot`) the operator places in the drawer; the drawer renderer emits the resolved menu at the marker's position instead of a fixed zone.

**Trigger:** a drawer-composition pass — this now belongs to `sgs/nav-drawer` (Spec 36); the blocks it was originally scoped against have since been deleted.

### P-FLOATING-UI-BOTTOM-BARS — extend Spec 18 Floating UI to persistent bottom bars
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-26

Research-backed conclusion: persistent bottom CTA/cart/sale bars belong in the existing Spec 18 Floating UI layer (which today only holds back-to-top + reading-progress), not as sticky footer rows. Key build constraints for whoever picks this up: build one shared `position:fixed` bottom stacking container first rather than per-component z-index; treat a cart bar and a promotional bar as different classes (navigation/one-transaction bars are legitimate persistent chrome, promo bars must be small and dismissible); use `env(safe-area-inset-bottom)` (note `dvh` does not fix iOS bar occlusion, it's a different problem); and add the bottom-edge equivalent of SGS's existing top `scroll-padding` guard (WCAG 2.4.11).

**Trigger:** needs its own design gate before any build; not a blocker for the Spec-37 sticky-header work.

### P-FP-COUNCIL — non-blocking residuals from the FP-H/FP-E commerce-layer adversarial council
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-10

The security leak, customer-facing deleted-product message, double-query, and doc-staleness this council found were all fixed at the time. Residuals: namespace two global product-card helper functions into `SGS\Blocks` (collision risk); extract duplicated CTA-label/visibleAxes-sanitise logic into shared helpers; the non-variable product branch has no disabled/"out of stock" button state; no editor-side go-live checklist or draft/unavailable notice for non-coders; option-picker keyboard focus passes through every pill before reaching the CTA (own gated round, purchase-critical); a widthMode wide/full precedence question shared with another block is BLOCKED on a Rule-7 design gate (shared-wrapper change).

**Trigger:** each item is its own small deferred round; the widthMode item specifically needs a Bean design-gate before any work.

### P-HEADER-FOOTER-SITE-SUFFIX-NAMING-CONVENTION — Stage-9 drift rule for header/footer naming
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-05-24

Clone-produced headers/footers must use `sgs/header-<client-slug>` / `sgs/footer-<client-slug>`
naming (Spec 37 §3.9). The previously-cited misnamed mamas-munches pattern pair can no longer be
found (verified 2026-07-27) — that sub-task has no target. The only remaining piece is a
`/sgs-update` Stage 9 drift rule failing on non-canonical ordering, and whether it exists is
unverified.

**Trigger:** Phase 2 header/footer cloner work, or the next `/sgs-update` touch.

### P-HEADER-SIMPLICITY-FINDINGS — operator-simplicity test failed; 2 findings + the blind-tester arm still owed
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

The FR-37-26 automated-proxy simplicity test failed on drawer content (since addressed — `sgs/nav-menu` now warns and one-click-fixes a burger with no panel to open) plus two still-open friction findings: (1) selecting the header block in the canvas by clicking is a hidden blocker — it only selects via List View; canvas-click should select it; (2) the header Settings tab shows ~7 default-visible controls against the target roster's 2 — reconsider ordering (move extras to Advanced) rather than hiding anything a client relies on. The test's authoritative half — a real non-coder, screen-recorded — has never been run.

**Trigger:** a dedicated header-simplicity pass, including the blind-tester arm; not a blocker for the Spec-37 per-row build.

### P-INDUS-BRANDSTRIP-OVERFLOW-9PX — pre-existing 9px horizontal overflow on Indus, width-independent
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-16

Live-verified on both canary and production: a 9px horizontal overflow at both 1000px and 1440px viewports, confirmed unrelated to the nav/logo work that surfaced it. Source is the decorative `sgs-brand-strip` marquee, which is already `overflow:hidden` on its own rule — the 9px is escaping some other property (likely a child's negative margin or an untransformed marquee-clone width), not yet root-caused.

**Trigger:** the Indus header/footer work.

### P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS — 94 attrs where the derived inspector-control-type disagrees with the stored value
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-21

Of 18 hand-traced disagreements, 15 showed the pre-existing STORED value was wrong (e.g. a media-poster attr stored as `Button` when it actually binds to a `<MediaUpload>`); 3 are genuinely dual-bound. 76 remain unaudited. Bean's standing instruction: finish the audit before overwriting any of the 94 rows — `inspector_control_type` is what tells a non-coder client which control they get, so a wrong value is a wrong sidebar; this is closer to the actual end-goal than pure routing work.

**Trigger:** a dedicated audit session — a strong candidate for the next framework-quality front.

### P-MAMAS-PRIMARY-CONTRAST — Mama's brand-primary token fails text contrast site-wide
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-23

The Mama's Munches theme primary token (`#e68a95`, a mid-luminance pink) measures 2.24:1 on the cream background — below WCAG for both normal and large/heading text. It's the theme's `--wp--preset--color--primary`, so it affects any link/heading using it, not just the block where it was first spotted. Must be fixed at the draft/theme source (never a per-block carve-out) — a mid-luminance accent fails as text on a light ground; either flip the element's ground to the accent colour, or darken the text token. Applies wherever the token is used, so needs a site-wide audit, not a single-instance fix.

**Trigger:** a Mama's palette/theme-snapshot pass; not a blocker for whatever surfaced it.

### P-MEGA-CONTRAST-DEFERRED — mega-menu drafts fail contrast against some client palettes, by design decision not defect
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-21

A contrast sweep across every draft × every client palette found 35 distinct failing CSS rules across 10 of 11 drafts. Bean ruled: change nothing in the drafts or palettes — the drafts are not defective, they measure well against their OWN palette; failures track the CLIENT's ground luminance (a design assuming a dark ground fails on a client with no dark-ground token). Both flagged clients already own a suitable colour under a different name — the gap is semantic naming, not colour availability.

**Trigger:** when a mega panel is actually built for one of the affected clients — run the sweep then and decide per case; speculative until then.

### P-MEGA-FOLLOWON-DEFERRALS — mega-menu follow-on features declared and sequenced after the core ships
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-24

The mega-menu shipped a deliberately smallest CORE first after a 7-persona adversarial council. Declared follow-ons, sequenced not cut: 5 motion effects (staggered reveal, sliding indicator, cursor spotlight, magnet label, card hover-lift); `media-cards` and `brands` structural variations; a night/day dark colour set with its selector cascade; aside `feature`/`preview` formats; full manifest GAP/ORPHAN-0 conformance; the standalone `sgs/mega-panel` drift-guard golden test; and the competitive gaps the council named (conditional/role menus, WooCommerce category mega, RTL, import/export).

**Trigger:** once the core lands and passes its live-a11y gate, build the follow-ons onto the proven spine — canonical detail in the BUILD-SPEC.

### P-MODAL-SCROLLBAR-GUTTER — sgs/modal scroll-lock causes a scrollbar-vanish viewport bounce (latent, block not yet deployed)
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-15

`body.sgs-modal-scroll-locked { position: fixed }` collapses the document scrollbar on classic-scrollbar desktops, widening the viewport ~15px mid-open and shifting a centred modal + the page behind it. Latent (the modal block isn't deployed on any page yet), so not live-verifiable. There is no longer a working precedent to copy — the block this fix pattern was proven on (`adaptive-nav`) has since been deleted, so the fix (gate on `innerWidth - clientWidth`, add a scrollbar-gutter-compensating class to `<html>`) must be derived fresh, not lifted.

**Trigger:** sgs/modal's first deploy, or the next drawer-family scroll-lock rework.

### P-NAV-FEATURED-HOVER-DRAFT-PARITY — featured nav item hover: two of three parts done, the inset accent bar is deliberately unfixed
**Status:** BLOCKED (on header cloning being built) · **Bucket:** framework · **Parked:** 2026-07-20

The generic-underline clash and the featured-item hover controls are both built and shipped. What remains is the draft's inset accent bar (`box-shadow: inset 0 -2px 0 var(--accent)` on hover) — the block has no attribute able to carry a box-shadow there, the same missing-attribute class as other known cases. Bean explicitly declined the obvious fix (adding an attribute): this divergence is DELIBERATELY preserved as the test case for header cloning — the draft carries a value the block cannot express, which is exactly the condition the header-clone pipeline must prove it can detect and handle. Adding the attribute now would delete the test fixture before the pipeline is proven against it.

**Do not fix this as a bug** — it is a planted, documented control.

**Trigger:** header-clone pipeline exists and has been run against this item.

### P-NAV-INDUS-CUTOVER — Indus header re-authoring onto sgs/nav-menu + sgs/nav-drawer: branded content remains
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-22

The cutover MECHANISM is proven (a generic proof header on the new blocks passes all gates) and the framework de-client work is done, including the deletion of `sgs/adaptive-nav`. What remains is authoring the actual BRANDED Indus header content — which is a Spec 33 Part 2 cloning job, not a manual re-author, so this now depends on that pipeline rather than being independently actionable.

**Trigger:** after `P-SPEC37-PER-SITE-DECLIENT` closes, and once Spec 33 Part 2 (header/footer cloning) exists.

### P-NAV-ITEM-SEPARATORS — nav-menu has no divider/separator capability between items
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-20

Across the whole framework only `sgs/breadcrumbs` has a separator attribute; nav-menu has none. This is a real gap (vertical dividers between links are standard in utility bars/footer navs/editorial headers). Deliberately scoped out of the hover-state rework because a separator is a distinct ELEMENT under the element-first model, not a state of the link. Proposed shape: a `separator` element (style: none/line/dot, colour, thickness, height) rendered as a `::before` on adjacent items, suppressed on the featured item and inside the drawer's stacked layout, with no reflexive hover state (the item reacts to hover, the separator normally stays static).

**Trigger:** next nav/framework session, or the first client draft that uses a separated nav.

### P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED — Bean-reported nav-menu Styles-tab sidebar blanking, not reproduced
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-20

Bean reported the Styles column blanking the settings sidebar with no way back. A careful reproduction attempt (all 3 nav block instances, every panel force-expanded) found zero console errors and no blanking. Two untested variables remain: the plugin had been redeployed shortly before the attempt, and only the Site-Editor surface was tried, not the page editor. Do not act on a cause — none is proven. Bean deprioritised this ("ignore that now").

**Trigger:** Bean reproducing it with a browser console capture, or the next nav inspector session — needs the LIVE-BROWSER-GATED treatment, not a static re-audit.

### P-NO-GLOBAL-BUTTON-COMPONENT — no global .btn component; button styling only lives scoped to product-card
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-06-11

Surfaced when a shop-filter toggle was given `btn btn-primary` classes that matched nothing outside a product card, worked around with raw design tokens instead. True fix needs the button definitions extracted to an unscoped theme utility (or a genuine global `.btn` component) so any element can reuse the primary button look. Low priority — token-level reuse already gives an accessible result today.

**Trigger:** a framework button-componentisation pass.

### P-P3-ADMIN-POLISH — Spec 28 admin-UI non-blocking polish residuals
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-09

All blockers and WCAG failures from the original visual pass were fixed. Remaining, explicitly non-blocking: refactor the hand-rolled two-column admin UI onto WooCommerce's native radio/options-group idiom (statically confirmed still open); the 44px-touch-target, emoji-indicator-as-secondary-signal, and comma-string-to-chip-input items need a live check (LIVE-BROWSER-GATED).

**Verify:** the WC two-column refactor is confirmed still open by static read; the touch-target/emoji/chip-input items need a browser pass to confirm they're still outstanding.

**Trigger:** pending Bean's go/no-go on the original screenshots; a dedicated admin-polish pass.

### P-PALETTE-TOKEN-VOCABULARY-SPLIT — client theme-snapshot palettes use two incompatible colour-token naming vocabularies
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-21

The 3 real clients use one naming vocabulary (`text`, `text-muted`, `text-inverse`); 5 template/placeholder palettes use another (`text-primary`, `text-secondary`, ...). Drafts declare `--text`, so on the 5 vocabulary-B clients that token never resolves and the panel keeps the draft's colour instead of rebranding. Do NOT "fix" this by adding a `text` alias to the B palettes — every client already has a body-text colour under a different name, so that would create a second name for an existing colour. The fix is a naming decision (standardise one vocabulary, or resolve aliases in the mapping layer), not a data addition.

**Trigger:** when starter templates are actually wired to consume these tokens — until then the split is inert.

### P-PATTERNS-USE-CORE-BLOCKS — SGS theme patterns/parts use core WP blocks instead of SGS blocks
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-10

The no-inline block contract is fully met at the block level, but the footer (and ~40+ other pattern/part files) use core `wp:heading`/`wp:paragraph`/`wp:list` blocks, which WordPress core inlines its own styling supports onto — leaking inline styling into SGS pages even though no SGS block is at fault. Bean's directive: SGS patterns must be built from SGS blocks. Each core heading/paragraph must be mapped onto the equivalent SGS block's attribute schema (not a find-replace), then each pattern re-verified live at three breakpoints.

**Trigger:** a dedicated SGS-pattern-modernisation session — deliberately kept separate from other no-inline work to avoid scope-creeping that session.

### P-PER-ITEM-CSS-DIVERGENT — per-item element styling divergent from siblings has no destination on array blocks
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-06-30

When one item in an array block (e.g. one card in a grid) has CSS that genuinely differs from its siblings, there is no per-item style destination, so the value folds to the block default. Fix: add a per-item style field where this recurs, then wire the styling-content lift per matched item element.

**Trigger:** capability-gap work on array blocks.

### P-PHASE2-VISUAL-DIFF-REPORTS-DEFERRED — responsive-logo visual-diff report owed
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-16

The responsive-logo `custom` logo-switch mode shipped and was live-verified project-wide, but without its per-block visual-diff report (STOP-67 discipline). A later-dated report exists (`responsive-logo-2026-07-18.md`) that may already cover this work — check before re-running. The paired adaptive-nav report is moot (that block has since been deleted).

**Verify:** possibly already satisfied — check whether `reports/visual-diff/responsive-logo-2026-07-18.md` already covers this work before redoing it.

**Trigger:** next visual-diff/reporting pass, or before the block is touched again.

### P-PRODUCT-CARD-BOUND-CTA-LANDED — product-card bound-mode CTA editability needs a real live exercise
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-06

The bound-mode CTA editability (preset-as-seed styling) is code-reviewed and gate-green, but only applies to WooCommerce-BOUND product cards and has never been exercised on a real one live — the page-8 cards are typed-mode and confirmed unregressed. Needs a real bound card set up, a preset applied, and the restyle confirmed live. Also worth extending the shared button-style helper to the other built-in-button blocks (buybox/whatsapp-cta).

**Trigger:** next bound-product session — needs a browser + a real WooCommerce product, per the LIVE-BROWSER-GATED index.

### P-PRODUCT-CARD-FULL-DUAL-MODE — Full product-card build (pill block + variation sets + dual-mode)
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-05-31

Three-part build: (1) a separate atomic "pill" selector block (not `sgs/button` — no link,
different behaviour); (2) variation-sets logic reading a product's declared variations +
content-impact map from the `sgs_product` CPT — a new Spec 24 requirement, write it into the spec
first; (3) Spec 24 dual-mode (typed clone InnerBlocks / bound CPT block-bindings).


**Verify:** likely STALE (flagged 2026-07-29). All three sub-tasks appear to have shipped separately under different names since this was parked on 2026-05-31 — the pill selector as `sgs/option-picker`, variation-sets as `read_variation_sets()` reading `_sgs_variation_sets` (`includes/class-product-bindings.php:244-338`), and Typed/Bound dual-mode per the block's own CLAUDE.md. Re-read against current code before doing any work here.
**Trigger:** Plan next session, after the atomic pill block exists and Spec 24 is amended.

### P-PRODUCT-CARD-NAMED-PICKERS — product-card: named + multiple option-pickers per card
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-06

Deferred until the cloning pipeline is complete (Bean-gated): (a) an optional name field per picker (the draft doesn't use one so it was dropped for the simplest setup); (b) multiple named option-pickers per card (flavour/topping/dietary, not just pack size) via a repeater.

**Trigger:** post-cloning-pipeline-complete; not currently a priority.

### P-ROW-COLLAPSE-RESIDUALS — collapse-when-pinned: two unverified residuals
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

The collapse-when-pinned feature is complete and live-verified; two things could not be closed: (1) `prefers-reduced-motion` was never live-verified (correct by construction — reasoning, not measurement — needs one check on a machine with the OS setting enabled, per the LIVE-BROWSER-GATED index); (2) a collapsed row's contents remain keyboard-focusable at height 0 — this is PARITY with the existing hide-on-scroll behaviour (not a regression), so the real decision is whether a hidden header row should be pulled out of the tab order (`inert`) generally, not just for this path.

**Trigger:** any accessibility pass on the header behaviour layer.

### P-S16-1 — sgs/label selector breadth (trigger has fired)
**Status:** OPEN · **Bucket:** framework · **Parked:** unknown

`sgs/label`'s `source:"html"` binds both root and typography to `.wp-block-sgs-label`
(`block.json:74-75`) — if `save.js` ever wraps content in a child element, the round-trip breaks.
The original trigger ("revisit when adding sgs/heading") has fired: `sgs/heading` now exists and
is deployed, so this is actionable now rather than waiting.

**Trigger:** Next `sgs/label` or `sgs/heading` touch.

### P-S17-E — Public browseable pattern-library marketing page
**Status:** DEFERRED · **Bucket:** framework · **Parked:** unknown

A static marketing page listing every header/footer/section pattern with screenshots, for sales
conversations ("here are 12 header shapes that work with this framework").

**Trigger:** When SGS has 20+ client-facing patterns, or a sales lead explicitly asks to see header
options.

### P-S17-F — Deeper PII export safety beyond GDPR exporter
**Status:** OPEN · **Bucket:** framework · **Parked:** unknown

v1 ships the basic `wp_privacy_personal_data_exporters` integration. Remaining: per-key
sensitivity flags (public/business-internal/restricted), export-policy controls, and audit
logging of who exported what.

**Trigger:** When SGS hosts a client with regulated data (medical, legal, financial), or a GDPR
audit requirement surfaces.

### P-S17-FONT-COLLECTION-NOTICE — Font-collection registration fires _doing_it_wrong on WP-CLI
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-05-20

`wp_register_font_collection` triggers a `WP_Font_Collection` validator notice on every WP-CLI
invocation (harmless — `WP_DEBUG_DISPLAY` is off on staging, fonts work fine in the editor). Fix:
move registration from `init` to a block-editor-only hook (`enqueue_block_editor_assets` /
`current_screen`) so it only fires in editor context.

**Trigger:** Opportunistic, next touch of `includes/class-font-collection.php`.

### P-S17-W2-ADMIN-SPLIT — Further split class-sgs-site-info-admin.php
**Status:** OPEN · **Bucket:** framework · **Parked:** unknown

A prior extraction already happened (`class-sgs-site-info-admin-notices.php` exists); the file is
now 444 lines (not the 502 originally logged), still 48% over the 300-line cap. Extract remaining
notice/dismiss-handling logic to bring it closer.

**Trigger:** Next time anything is added to this file, or Wave 3 starts.

### P-SPEC35-PARTIAL-BOX-MEMBERS — No vocabulary for a partially-modelled box member
**Status:** OPEN · **Bucket:** framework · **Parked:** unknown

Attributes like `headlineMarginBottom` are one side of a box member, not the full
`{top,right,bottom,left}` object `layout.css:margin` expects. Confirmed still true 2026-07-27 —
`box_family` is NULL on all 5 named attrs, no partial flag exists anywhere.

**Trigger:** If partial-box attrs proliferate beyond the current handful.

### P-SPEC37-OPEN-RESIDUALS — Spec 37 coverage-matrix residuals
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-21

Five smaller open items from the Spec 37 coverage matrix: (a) the skip-link regression contract needs a successor statement in the FR-37-31 retirement; (b) the 3 layout starter variants fold into FR-37-8; (c) FR-S5-3's non-carried WP-CLI commands need a decision on what happens to the rest of the set; (d) the FR-37-12 responsive width set is missing the 320–374px band; (e) Spec 17's prose-only REST capability-gating content needs restating under the FR-37-14 "attribute shape frozen" guardrail.

**Trigger:** alongside the FR-37-31 retirement work.

### P-SPEC37-PER-SITE-DECLIENT — per-site header/footer content authoring (framework de-client complete; real branded content pending)
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-22

The framework carries no client data any more (the client-named pattern file was deleted) and the mechanism for authoring each site's header/footer as CPT posts is proven on both live sites with generic proof content. What's left is authoring the REAL branded per-site content, which is deferred to the Spec 33 Part 2 cloning pipeline rather than being hand-built.

**Trigger:** next session Task 1; blocks full FR-37-6 closure and the Indus deploy.

### P-SPEC37-S3-CARRIED — Spec 37 §3 conformance: one spec self-contradiction to settle, two clauses already done
**Status:** OPEN (reduced to: settle the FR-37-35 spec contradiction) · **Bucket:** framework · **Parked:** 2026-07-22

Two of the three original clauses (layoutMode as a first-class inspector control; row-inserter promotion of common elements) are already built and live-verified — strike them. The third, FR-37-35 (container-query row reflow), is genuinely unresolved but the SPEC ITSELF disagrees with its own summary table about whether it's built. Settle that contradiction with one live check and fix the losing line before scoping any actual build work.

**Trigger:** the next session touching Spec 37 §3 — check the live behaviour first, then correct whichever spec line is wrong.

### P-THEME-SCROLL-PADDING-SECOND-INSTANCE — the theme carries its own copy of the scroll-padding defect the plugin already fixed
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

Two findings in `theme/sgs-theme/assets/css/utilities.css`: (1) `:root { --sgs-header-height: 80px }` makes the plugin's `0px` fallback unreachable — with JavaScript disabled, every page reserves 80px regardless of whether the header is actually pinned; (2) an admin-bar-aware selector (`body.admin-bar html`) can never match, since `html` is not a descendant of `body` — that rule has never applied on any page. Do not blind-fix (1) to `0px`: there's a genuine trade-off between a crude-but-working no-JS guard and correctness on non-sticky pages. A cause-agnostic fix is a CSS-only conditional default (0 at root, fallback height only under the sticky-behaviour class).

**Trigger:** any theme-side scroll/anchor work, or the next behaviour-layer doc-audit.

### P-TIMELINE-ADVANCED-VISUAL-EFFECTS — Textured connector + progressive fill for sgs/timeline
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-05-20

`sgs/timeline` needs a textured/themed connector line (pulse, vine, tree, bricks-falling-into-place,
gradient fill) plus per-entry progressive background fill on scroll. MIC (Muslims in Construction)
specifically wants the bricks variant for their journey/process page. A full attribute +
`view.js` implementation sketch already exists — do not build speculatively.

**Trigger:** MIC or another client specifically requests the textured-timeline effect.

### P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING — transparent header does not flip to a solid background on scroll
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-28

With Transparent ON + Sticky ON at desktop, the `is-header-scrolled` class IS applied on scroll (the JS works) but the computed `background-color` stays transparent instead of flipping to the theme surface colour — the scrolled-state background rule is either not emitted by the merged tri-state CSS or loses to another rule. Cosmetic, not blocking. Evidence: the `t14fix-header-cascade-1440` screenshot + the T1.4 re-QC note.

**Trigger:** next header/Spec-37 session — inspect the SCROLLED state in `sgs_merge_tri_state_declarations()` (`site-header/render.php`), confirm a per-tier `.is-header-scrolled` background declaration exists and wins, live-verify the flip at 1440. Same files as the Site Editor panel fix, so cheap to fold in.

### P-UIMAX-DRAWER-LOGO-AUTODERIVE — auto-derive drawer-head logo colours from the header row
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-15

Research-backed enhancement: when a client turns the drawer logo on, auto-derive the head strip's background/foreground from the client's own existing header row (publish `--sgs-header-bg`/`--sgs-header-fg` alongside the existing header-height publisher) so the drawer logo is legible by construction. No competitor does this; full design already written up.

**Trigger:** a client flags an illegible drawer logo, or the drawer rework touches the head row for another reason.

### P-VAT-ZERO-RATED-PRECISION — VAT-label gate is store-level, not per-product-tax-rate precise
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-12

The FR-30-9 VAT-suffix gate checks only whether the store has tax calculation enabled, not the individual product's effective tax rate — so a VAT-registered seller of zero-rated goods would still show "(inc. VAT)" incorrectly. Bean chose the simple store-level gate deliberately; per-product precision (checking `WC_Tax::get_rates()`) is the more accurate but unbuilt option.

**Trigger:** add as a go-live verification item (confirm the client's VAT-registration state matches the label) rather than building the precise version speculatively.

### P-WP-UNIQUE-ID-CACHE-COLLISION — Fragment-cache scoped-ID collision (theoretical)
**Status:** DEFERRED · **Bucket:** framework · **Parked:** unknown

`wp_unique_id()` is per-request sequential; fragment cache combining requests could mismatch a
scoped `<style>` ID with its rendered element. Fix would be a content-derived hash (e.g. md5 of
block JSON) instead of a sequential counter.

**Trigger:** Only if a production collision is actually observed — currently theoretical.

### P-WP7-PLATFORM-ALIGNMENT — WordPress 7.0/7.1 platform-update action items
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-15

Full register at `~/.claude/skills/sgs-wp-engine/references/wp-updates-2026.md`. Priority-ordered residual actions: (1) audit every block.json's content-bearing attrs for `"role":"content"` (WP 7.0 makes contentOnly the pattern default; missing it silently locks client editing); (2) apiVersion 3 audit — CONFIRMED DONE 2026-07-27, all 82 block.json files already declare it, strike from future work; (3) declare SGS's device-tier breakpoints (767/1023) in theme.json once WP 7.1's configurable-breakpoints schema lands — genuinely blocked on the WP 7.1 release (19 Aug 2026); (4) decide adopt-or-document-the-split between `sgsCustomCss` and core's native per-instance Additional CSS; (5) new core blocks (Breadcrumbs, Icons, Tabs, Table of Contents) need pairing-map rows — smaller than it reads, since most already exist as SGS blocks; only Playlist is absent.

**Trigger:** items 1 = next block-quality pass; item 3 = WP 7.1 release; items 4-5 = next cloning/pairing session.

### P-WP70-REGISTER-BLOCK-VARIATION-MISSING — Keep the block-variation filter polyfill
**Status:** BLOCKED · **Bucket:** framework · **Parked:** unknown

`register_block_variation()` does not exist as a top-level PHP function in WP 7.0; all 13 SGS
variation files were migrated to the `get_block_type_variations` filter. That polyfill is
load-bearing and must not be removed by a future "WP 7.0 cleanup" refactor.

**Trigger:** Watch WP 7.1+ release notes for a native `register_block_variation()` function; retire
the polyfill only then.

## tooling

### P-WRAPPER-BORDER-EMIT — SGS_Container_Wrapper has no style.border emission
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-14

Blocks declaring `__experimentalBorder` with skip-serialization (site-header-row, site-footer-row, and ~30 others) never render their border, because the shared wrapper has zero `style.border` emission code — WP populates `style.border` internally but does not auto-inline it, and the wrapper doesn't pick it up the way it does for colour/padding. Re-verified 2026-07-27: the wrapper's only border-related code is the unrelated per-grid-item custom-property path; there is still no actual `style.border` emitter. Fix: add a scoped border emitter mirroring the padding/colour path, or drop skip-serialization on border for blocks that don't need scoped border.

**Trigger:** a block-quality pass, or when a client build needs a visible header/footer divider.


### P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES — the 7 drawer POC fixtures are not exact clones and their reference captures are unreliable
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-29

Bean rejected the Task-5 exit gate on sight (R-31-13): *"the difference between our version and
theirs is night and day"*. Four verified defects. (1) **Content is not an exact clone** despite the
§6 POC rule mandating it — `centred-statement` renders 3 menu items where the extraction recorded 7.
(2) **Alignment is wrong on several variants**; `centred-statement` renders LEFT-aligned, and its
three link arrows float detached mid-panel with no labels. (3) **`solid-brand-light` has no reference
capture at all.** (4) **`two-column-editorial`'s "reference" is the closed homepage with a cookie
banner** — the menu was never opened.

**Root cause of the false green:** the capture script never asserted the panel was OPEN before
shooting (the same vacuous-capture class the axe harness fixed on 2026-07-29 but the screenshot
harness did not), and nothing compared fixture link counts against the extraction JSON. The exit
report then presented 21/21 axe/geometry/focus cells as though they evidenced visual fidelity.

**To close:** rebuild every fixture to genuinely exact reference content, verifying link COUNT and
label TEXT against `reports/2026-07-28-drawer-code-extraction/*.json` per variant and failing the
build on mismatch; fix per-variant alignment; add an openness assertion to the screenshot capture
so a closed-panel shot is reported VACUOUS rather than saved; capture real menu-open references for
`two-column-editorial`, `solid-brand-light` and `buck.co`.

**Trigger:** before Spec 36 Task 5 is re-presented to Bean — it must not be re-reviewed until all four are fixed.

### P-DRAWER-BURGER-MORPH-SYNC — true burger-to-X morph needs cross-block state
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-28

`closeStyle: 'burger-morph'` currently draws a static x-reading icon on the drawer's own close
chrome. A TRUE morph — the HEADER burger animating into an x when the drawer opens — needs state
wiring between two independent block instances via `store('sgs/nav')`. **Not a GSAP or
animation-library job** (Bean asked, 2026-07-28): the motion is cheap CSS on the button spans; the
missing piece is cross-block state. Documented in the shipped code comments + design doc.

**Trigger:** next nav-drawer/Spec-36 session that touches `store('sgs/nav')` — piggyback the
cross-block wiring rather than opening a dedicated session for it.

### P-DRAWER-TRIGGER-ANCHOR-JS — trigger anchor is a CSS approximation, not a measured position
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-28

The `trigger` anchor is a CSS top-right-corner approximation. The proper version measures the
burger's real rect at open time and pins the panel to it — the `--sgs-drawer-header-offset`
measure-and-write pattern shipped at D404 is the template. Pure geometry, no animation.

**Trigger:** next nav-drawer session working on the `trigger` variant specifically, or when a
client build surfaces a visible misalignment on a real header layout.

### P-NAV-MENU-LISTCOLUMNS-READING-ORDER — 2-column drawer list interleaves the menu order
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-29

`nav-menu`'s in-drawer `listColumns` grid uses `grid-auto-flow: row`, so a 7-item menu lays out
ACROSS the columns instead of down them. Measured live on fixture page 1922 at 1440: menu order is
Home · Work · Services · Approach · Studio · Plans · News, but column 1 reads Home · Services ·
Studio · News and column 2 reads Work · Approach · Plans. Keyboard and screen-reader order are
correct (they follow the DOM) — it is the VISUAL reading order that diverges, and the reference
design (studionamma) splits sequentially 4+3.

Fix shape: `grid-auto-flow: column` plus an explicit row count derived from the item count in
`nav-menu/render.php`. That changes rendering semantics of a shared block, so it needs Bean's
sign-off (project rule 7) rather than an inline change. Recommended: change it — a menu whose
visual order differs from its real order is a usability defect as well as a fidelity gap.

**Trigger:** Bean's decision on finding F1 of
`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.

### P-NAV-DRAWER-DUPLICATE-DEFAULT-REF — two default drawers on one page share a DOM id
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-29

`sgs/nav-drawer` and `sgs/nav-menu` both default `drawerRef` to `sgs-nav-drawer`, so two drawers
left on defaults render duplicate element ids and two burgers whose `aria-controls` point at the
same id. Measured 2026-07-29: behaviour is NOT broken — each burger still opened its own panel
(proven by their differing link sets) — and a whole-page axe 4.11 run at 1440 reported 0
violations. So this is an HTML-validity wrinkle that no current gate flags, not a live defect.

Candidate fix: derive the default ref from the block's uid when more than one drawer is present,
or surface an editor notice. Low severity; do not spend a session on it alone.

**Trigger:** next nav-drawer session, or the first time a real client build puts two drawers on one
page.

### P-PRODUCT-PAGE-REDESIGN — product page design does not line up with the cloned draft
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-14

Bean's observation (D226): the product page design does not line up with cloning the draft product
page. Specifics — the Trustpilot review block renders "stupidly large", and the content width is
"really really tight unnecessarily" (ties to the Spec 01 contentSize 780 finding). Bean-sequenced:
AFTER clone-fidelity closes.

**Trigger:** a post-fidelity design pass.

### P-SPEC35-STATE-RESPONSIVE — responsive x state combinations in the inspector manifest
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-19

FR-35-5 deliberately scopes the `states` axis to base-tier only. A third dimension (responsive x
state x member) was considered and excluded as speculative. If it ever surfaces, extend `states`
with the existing device-tier suffix convention rather than adding a new axis. ~30 min.

**Verify:** trigger re-verified UNMET 2026-07-27 — a DB sweep for responsive-x-state attrs
(`attr_name LIKE '%HoverTablet%' OR '%HoverMobile%' OR '%TabletHover%' OR '%MobileHover%'`) returns
**0 rows**. No block ships the shape that would justify the axis. A proven negative, not an
unchecked assumption.

**Trigger:** only if a real block ships a `hoverColourTablet`-shaped attribute.

### P-S17-G — migration framework is one-way, with no rollback
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-05-20

The migration framework is one-way. If a future migration breaks something and is rolled back,
attribute data may be left unrecoverable. Top WP plugins (WooCommerce, Yoast) ship down-migration
support. Fix shape: each migration callable in `plugins/sgs-blocks/includes/migrations/{version}.php`
gains an optional `down()` method, and the CLI gains
`wp sgs migrations rollback --to=<version>`. ~4-6 hrs.

**⚠ ORPHANED ANCHOR (flagged 2026-07-27, NOT closed):** the FR it cites (`FR-S7-2`) exists in no
live spec — Spec 17 was deleted and the repoint missed parking.md. The framework it describes DOES
exist (`includes/migrations/0001-baseline.php` + `0002-spec-17-foundation.php`), so the work is real
and still one-way; only the anchor is dead. **Re-anchor to Spec 37 when picked up — this is not
evidence of completion.**

**Trigger:** before the first data-destructive migration is added. Build rollback then, not
speculatively now.

---

## Tooling, scripts, skills + docs

*21 open entries.*

### P-2 — Phase 2.5 / G2.5 deferred work (false blocker)
**Status:** OPEN · **Bucket:** tooling · **Parked:** unknown

Bundle: 4 skill optimiser passes (`/extract`, `/harden`, `/ethics-gate`,
`/interactivity-capture`), structural-debt content fixes on 3 agents (design-reviewer,
seo-auditor, sgs-extraction), 3 seo-technical content fixes, and 9 deletion-bound migration notes.
The stated blocker is false — the referenced plan was archived, not deleted, and is readable at
`.claude/plans/archive/master-plan/phase-2-rubrics-universe.md`. Read that file's G2 section to
settle the real gate status.

**Trigger:** Verify G2 gate status in the archived plan, then proceed or re-block with real
evidence.

## content

### P-6-LUCIDE-REST-ENTRY-POINT — Find WP 7.0's real icon-collection registration API
**Status:** BLOCKED · **Bucket:** tooling · **Parked:** unknown

`class-sgs-lucide-icons-rest.php` checks for `wp_register_icon_collection`, which doesn't exist in
WP 7.0 even though `WP_REST_Icons_Controller` does. Need to find the real registration entry point
(candidate: a method on `WP_REST_Icons_Controller`) from WP 7.0 core source
(`wp-includes/rest-api/endpoints/class-wp-rest-icons-controller.php`), wire the SGS Lucide
collection through it, then retire the `sgs_get_lucide_icon()` shim.

**Trigger:** Research WP 7.0's icon-collection registration API.

### P-AUDIT-COLOUR-ROLE-KEYED — block-uniformity audit's colour check is name-keyed, not manifest-keyed
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-20

The audit flags any block whose attribute NAME contains "colour" and lacks `supports.color` — but WP's `supports.color` only ever styles the block ROOT, so a legitimate per-element colour (a featured nav item's fill, an inner link) can never satisfy it and gets permanently exempted, filling the exemption list until real violations are indistinguishable from legitimate exemptions. The exemption list has already grown from 2 to 3 entries since this was first flagged, confirming the predicted pattern. Fix: re-key the check on the Spec 35 element manifest (which already carries wrapper/non-wrapper classification) rather than the attribute name, falling back to the name test only for blocks not yet manifested.

**Trigger:** the Spec 35 manifest rollout reaching meaningful coverage, or the next block that trips this check.

### P-BATCH-GA-14-SKILLS — Batch gap-analysis on 14 WP/SGS skills
**Status:** OPEN · **Bucket:** tooling · **Parked:** unknown

Run `/batch-gap-analysis` on the 14 WP/SGS skills revised in Phase 7. The stated trigger ("after
P-11-M9 ships") cannot fire — `P-11-M9` was archived as superseded by Spec 22, itself now folded
into Spec 31 §13, and G1-G5 are already closed. A decision is needed on whether Spec 31's
production status satisfies the trigger's intent, or the trigger should be re-anchored to a live
status signal — do not run before that decision, and do not wait forever on the dead milestone
name either.

**Trigger:** Bean decision on re-anchoring the gate, then run.

### P-CANARY-PAGE-WEIGHT-BUDGET — canary homepage is 3.6× over the CSS budget and 1.7× over the JS budget (nav is not the cause)
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-20

Measured live: CSS 371KB vs a 100KB budget, JS 84KB vs a 50KB budget; CLS itself passes comfortably. Nav is a minor contributor. WooCommerce's own CSS alone (118KB across 3 files) exceeds the entire CSS budget by itself; the theme's WooCommerce overrides add another 46.5KB; jQuery (brought in by WooCommerce, not SGS) is nearly a third of the JS budget. One cheap real win: `mega-menu-panels.css` (13KB) loads on the homepage even though no mega menu exists there yet — conditionally enqueue it. The larger question is whether the 100KB/50KB budget is realistic at all for a WooCommerce site, given WC loads its CSS globally by default — as currently worded the budget is close to unachievable and risks being ignored as permanently-failing.

**Trigger:** a performance session; do not block anything on this — nav is not the cause and CLS passes.

### P-CONFORMANCE-GOLDEN-DRIFT — 27 conformance goldens are stale, not a code regression
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-26

Proven pre-existing and unrelated to recent work (identical failure count with the relevant feature flag on or off) — the goldens simply never got re-seeded as the converter evolved. The test's own docstring forbids a blind re-seed: it's only valid after a fresh landed-deploy proof per block, otherwise a blind re-seed would bake a real hiding regression in as "correct". Overlaps other stale-golden entries in this file — same discipline, same underlying 27-failure set.

**Trigger:** the Spec-31 completion track reaching its landed-deploy-proof + `check_landed()` wiring — the golden re-baseline lands with it.

### P-CONVERTER-UNIVERSALITY-FIXTURE — a dogfood CSS-case fixture exists but is wired into zero tests
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-06-10

A synthetic fixture exercising CSS cases the real Mama's draft doesn't (full-bleed, capped, inner-grid, clamp/calc/var, logical properties, unsupported props, etc.) was built as a permanent universality regression surface, but is referenced by zero tests — currently decorative. Wiring it into the test suite is the entire remaining task.

**Trigger:** the next converter-hardening session that wants a real regression surface for these CSS cases.

### P-DB-SEED-REGRESSION-GUARD — no structural gate catches a silent DB-seed regression (cause-agnostic mitigation for P-DB-PARTIAL-RESEED-RESIDUE)
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-16

`_apply_attr_classification_overrides`'s docstring claims the overrides survive every `/sgs-update` — empirically they did not, and nothing failed loudly. One of the three planned tests is now done: `test_tag_identity_attrs.py` carries 13 real assertions including a wiring check that reads `assembly.py` source, no longer the vacuous `assert == {}` shape.

**Still to build:** (1) a `/sgs-update` post-condition gate that hard-fails the build if any `ATTR_CLASSIFICATION_OVERRIDES` pair is missing from `block_attributes`, or `emit_shape` non-NULL count / icon-role count / tag-identity-role count fall below their expected floors; (2) a duplicate-key check on `ATTR_CLASSIFICATION_OVERRIDES` — needs re-scoping since it now loads from an external JSON truth file, not a Python dict.

**Trigger:** pairs with `P-DB-PARTIAL-RESEED-RESIDUE`.

### P-DECISIONS-BACKTAG — back-tag historical decisions.md headings with [INCIDENT]/[ROUTINE]
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-17

The `[INCIDENT]`/`[ROUTINE]` tagging convention was established and applied to recent entries; older headings remain untagged and need a read-to-classify judgement. New entries get tagged going forward via handoff, so the untagged set only shrinks.

**⚠ This entry previously claimed "only 10 headings — D216, D229-D237 — remain untagged out of 54". That is WRONG and was corrected 2026-07-29** (the same false figure also appeared in `P-DOC-SIZE-AND-DOCSCORE-RESIDUALS`; both fixed). The old count measured a nested `### D…` subset, not the `## ` entry headings. Measured 2026-07-29: roughly **200 `## ` headings with only ~75 tagged, so ~125+ untagged** — an order of magnitude more work than recorded. **The exact figure drifts as entries are added: re-count before scoping, do not trust this line.**

```bash
grep -c '^## ' .claude/decisions.md          # total entry headings
grep -c '\[INCIDENT\]\|\[ROUTINE\]' .claude/decisions.md   # tagged
```

**Trigger:** a doc-hygiene session — but re-scope first; this is not the small bounded task it was recorded as.

### P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC / P-CANARY-SHARED-DEPLOY-RACE — deploy verify can pass on a deploy that never persisted
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-20

Two related gaps proven live via a real incident: a deploy that was correctly verified and reported PASS was silently overwritten minutes later by a co-active session's deploy on the shared canary, and the deploy tool's own verify leg could not have caught it — it only asserts generic markers (HTTP 200 + a couple of block-class strings) that pass on ANY working SGS page, including one running last week's code. Fixes: (1) have the deploy script checksum a few deployed files against their local counterparts post-extract, and/or support an `--assert-contains <file>:<needle>` check; (2) some form of deploy-ownership marker on the shared canary naming the last deployer + commit SHA, so a stale deploy is visible, or re-assert the key measurement at handoff time.

**Trigger:** next canary deploy, or any session where two tracks are co-active on the shared worktree.

### P-DOC-SIZE-AND-DOCSCORE-RESIDUALS — doc-hygiene: LEDGER/decisions size caps + memory compaction + the 12-canonical-doc drift audit
**Status:** PARTIAL · **Bucket:** tooling · **Parked:** 2026-07-20
**Also known as:** P-DECISIONS-ROTATION, P-MEMORY-MD-COMPACT, P-DOC-ALIGNMENT-12-DOCS

Four merged doc-hygiene threads, most of their original scope now substantially discharged:

- **LEDGER.md size cap** — repeatedly swept back under the 24,576-byte cap across multiple sessions; this is now a recurring maintenance action (re-sweep whenever it grows again), not a one-off task.
- **decisions.md rotation** — the archive-to-`memory/decisions-archive.md` remedy has been RUN: the file was swept 877KB→714KB and a `handoff-preflight.py` gate now mechanically enforces the size discipline going forward. The back-tagging of historical `[INCIDENT]`/`[ROUTINE]` headings is tracked separately (see `P-DECISIONS-BACKTAG`). **⚠ This entry previously claimed that back-tag was "much smaller than originally scoped — only 10 headings out of 54"; that is FALSE and was corrected 2026-07-29 in both places it appeared. Measured: 201 `## ` headings, 77 tagged, so ~124 untagged.**
- **MEMORY.md compaction** — recurring trim-when-near-cap maintenance; last measured well under the cap with headroom.
- **12-canonical-doc drift audit** — the original 2026-06-14 audit register is stale; the doc landscape has changed significantly since (specs renumbered, several docs archived). A fresh drift check would need to be re-run against the current doc set rather than the original register.

**Note on docscore results that must NOT be "fixed":** decisions.md's `Organization` hits are the Schema.org type identifier (breaking it would break emitted JSON-LD), and its TODO/TBD hits are historical narrative inside an append-only log, not stub markers. Multiple independent checks have confirmed both are correctly flagged as false positives — do not let a future pass "fix" them.

**Recorded deferral (Gate 4.6, 2026-07-29) — two docs sit below the A- threshold for reasons that are correct, not defects:**
- `decisions.md` **67.3% (C)** — the sole structural fail is "2,421 lines exceeds cap of 600". It is an append-only architectural log of 200+ entries; the generic 600-line cap does not apply to that doc type. It was already swept 877KB→714KB this session, and cutting further would mean archiving load-bearing `[INCIDENT]` entries, which the convention explicitly forbids ("NEVER truncate an INCIDENT to a stub").
- `parking.md` **80% (B)** — the sole fail is "4 hedging phrases (soft fail)". Those are the deliberate `**Verify:**` uncertainty markers added by the 2026-07-29 cull to flag entries that may already be complete. Removing the hedging would remove honest uncertainty signalling and make the register *less* true.
Both are accepted as-is rather than fixed. Re-raise only if the doc-type caps themselves are revised.

**Trigger:** LEDGER/MEMORY — recurring, re-trim when either approaches its cap. decisions.md back-tagging — a low-priority doc-hygiene session (10 headings). Doc-drift audit — a fresh `/doc-audit` run, not a re-read of the 2026-06-14 register.

### P-JSONLD-HEX-FLAG-GUARD — structural prebuild gate for JSON-LD script-tag breakout still unbuilt (emitters already fixed)
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-06-12

All 8 emitters that were bypassing the project's safe JSON-LD encoder have since been fixed and proven safe against 5 hostile payloads — only the structural prebuild gate itself remains to be built. The gate must encode the precise rule (measured, not assumed): the actual defect class is `JSON_UNESCAPED_SLASHES` WITHOUT `JSON_HEX_TAG` — zero flags is incidentally safe, so a naive "missing HEX_TAG" check would false-positive. It should also catch inline flag-set copies (one emitter inlines its own flag set with a different order rather than calling the shared encoder) as well as literally-missing flags.

**Trigger:** next security/gates-hygiene session — this is the one remaining piece of an otherwise-closed vulnerability class.

## content

### P-LOG-ACCURACY-DOUBT — pipeline input-side drop logs are not a fidelity signal (narrowed)
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-03

Bean's original doubt is correct: `attribute_gap_candidates` is a cumulative ledger across all runs, and the input-side logs measure converter non-routing, not rendered fidelity. The underlying need — a dependable per-clone fidelity signal — has since been met by `computed-parity.js` (Stage 11.6), and project rule 4a now explicitly forbids using the drop-logs as a fidelity signal, so this entry's original trigger has already fired.

**Trigger:** either close this entry, or narrow it to the much smaller open question — is a debug-only, per-run, input-side drop log still worth building at all.

### P-OLDSHAPE-AUDIT-EXTENSION-ATTRS — post-content audit doesn't know about universal-extension-registered attrs
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-28

`audit-post-content-blocks.py` reads only block.json, so attributes registered by JS-side universal extensions (`sgsBlockLink*`, `sgsHoverScalePreset`, etc.) raise false "stranded content" findings and can abort deploys — this already happened once, blocking a real deploy. Fix: teach the audit the extension-registered attribute list (parse the extension source files, or maintain a declared allowlist with provenance), then remove the baseline entries this false positive forced in.

**Trigger:** next audit/gate-hygiene session.

### P-SGS-ENGINE-ENFORCE-GATE — sgs-wp-engine skill's ground-truth enforcement is advisory, not a real gate
**Status:** DEFERRED · **Bucket:** tooling · **Parked:** 2026-07-15

The skill's enforcement hook is a no-op stub while its docs previously overclaimed a hard gate; the claim has been honestly corrected to advisory, but the real structural gate (a PreToolUse hook blocking framework-code edits without a GROUND-TRUTH line, wired into settings.json) still needs building.

**Trigger:** next hooks/enforcement session — Bean chose fix-the-claim-now, implement-later.

### P-SKILL-UPDATE-DB-SEEDS-RETIRED-TABLES — a skill-side DB update script still seeds two retired tables
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-15

`sgs-wp-engine`'s `update-db.py` still creates and seeds `slot_synonyms`/`legacy_role_lookup`, both replaced by `slots`/`roles` in the current schema. Not blind-removed because the script is genuinely live (invoked by the orchestrator's register tail, and a sibling function it imports is cited elsewhere in the converter) — "it seeds dead tables" isn't proof that nothing reads them. Needs: a grep for any live consumer of the two old tables, then strip the seeders if genuinely unread, and a decision on whether the orchestrator should call the project's own `/sgs-update` instead of this skill-side legacy script at all (the two DB-reseed paths risk drifting apart).

**Trigger:** next `/sgs-update` or converter-DB session.

### P-SPEC35-STATE-AUTOSUGGEST — Suggestion helper for suffix-shaped state attrs
**Status:** OPEN · **Bucket:** tooling · **Parked:** unknown

92 of 113 state attrs are suffix-shaped (`backgroundColourHover`); a suggestion-only CLI could
offer `{baseAttr}+Hover` candidate mappings for human/agent review — never decide automatically
(watch for false positives like `pauseOnHover`/`effectHover`, which aren't style properties).
FR-35-5 is approved but not built (D354), and only one block declares a `states` key today —
nowhere near the scale that would justify this.


**⚠ Its own count is WRONG (re-measured 2026-07-29): 16 block.json files carry a `states` key, not one.** Whether those 16 are the same mechanism this entry means (vs FR-35-5's suffix-shaped attrs) needs disambiguating — but on the entry's own stated terms the at-scale trigger has likely fired.
**Trigger:** After FR-35-5 ships and the roster starts declaring `states` at scale.

### P-SPEC35-UPSTREAM-REGISTRY-DRIFT — Upstream Phase-1 artefacts still un-reclassified
**Status:** PARTIAL · **Bucket:** tooling · **Parked:** unknown

A regeneration guard (`check-reclassified-keys.py`) now exists and is wired into
`run-consistency-gates.py` (informational), protecting the golden master's reclassified keys.
Actually affects 4 rulings across 8 references (`css:stroke`, `css:background-image`,
`css:background-position`, `css:font-family`) — `css:percentage` was never a Bean ruling, only a
prose note, so that part of the original scope was wrong. The upstream artefacts
(`setting-types.json`, `setting-registry-css.json`) are still un-reclassified, but it's now safe
to defer since the tripwire will catch a regeneration attempt.

**Trigger:** Before anyone regenerates `setting-registry.json` from Phase-1 data.

### P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT — subagent-driven-development skill below threshold
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-05-23

Skill scores 84% (below the 90% threshold). `scripts/` dir now exists (fixed). Still missing:
`hooks/` dir, an invoked-skills declaration in frontmatter. Body length has got worse, not better —
now 414 lines against a 300-line budget (was 317 when first logged).

**Trigger:** skill-optimiser session, bundled with the `/batch-gap-analysis` pass.

### P-TOKEN-LINT-INERT — token-lint gate: unused-token weighting still not built
**Status:** PARTIAL · **Bucket:** tooling · **Parked:** 2026-07-21

The tool's root defect (it never parsed inline `<style>` blocks, only `style=""` attributes, so it passed every draft vacuously) is fixed, and unresolved `var()` references are now a hard fail. What remains genuinely open is unused-token weighting (flagging a declared-but-unused brand token, weighted louder than spacing tokens) — deliberately descoped from the original fix pass. Cross-palette contrast checking was deliberately rehomed to a separate tool (`palette-contrast-sweep.mjs`) rather than added here.

**Trigger:** when unused-token detection is actually wanted; the inert-gate defect that made this urgent is already closed.

### P-VISUAL-GATE-ORDERING — the visual-diff commit gate has a circular ordering problem for live-verified changes
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-20

The pre-commit visual-diff gate requires a PASS report before a visual change can commit, but proving PASS for a live-canary change requires a deploy, and deploying requires a commit first (the deploy tool correctly hard-blocks on an uncommitted tree) — so commit needs proof, proof needs deploy, deploy needs commit. Today's only exits are both bad: skip the gate with a truthful "pending" verdict, or write PASS before it's actually true. Strongest proposed fix: split the gate into a pre-commit check (report exists + BEFORE captured) and a separate post-deploy check wired into the deploy tool's own verify leg, since that's where the AFTER evidence naturally exists.

**Trigger:** next visual block change, or a dedicated gates-hygiene session.


---

## Client content + copy

*5 open entries.*

### P-4 — Render captured Trustpilot reviews on the Mama's Munches homepage
**Status:** OPEN · **Bucket:** content · **Parked:** unknown

The 4-review capture is already done
(`sites/mamas-munches/research/trustpilot-reviews.json`, full fields + timestamp). Remaining:
render as static `sgs/testimonial` cards matching the mockup design, plus the free Trustpilot Mini
widget for live star count — or use the placeholder testimonials already in
`reports/mamas-munches-page-content.html`.

**Trigger:** Mid-clone session, when the testimonials section is reached top-down.

## research

### P-COLLAPSIBLE-TEXT-DEFAULT-COPY — shop-archive SEO copy slots ship intentionally empty; confirm onboarding covers this
**Status:** OPEN (by design) · **Bucket:** content · **Parked:** 2026-06-11

The framework's `archive-product.html` ships its two collapsible-text SEO slots empty by design, so no client copy is hardcoded into the shared template — per-client shop copy is meant to be added via the Site Editor. What remains: confirm the per-client onboarding flow actually documents seeding this copy, and consider a sector-neutral default pattern operators can clone from.

**Trigger:** next onboarding-documentation pass.

## ops

### P-DRAWER-VARIANT-CONTENT-GENERICISE — nav-drawer POC fixture copy must be genericised before production use
**Status:** DEFERRED (blocks production, not POC) · **Bucket:** content · **Parked:** 2026-07-28

The nav-drawer variant POC fixtures and seeded variation copy are exact clones of reference-site content, deliberately, so visual differences are attributable to the block rather than the copy. Before any client or production use, the seeded copy must be genericised and any reference-site wording stripped out. A named pre-production step — must not be lost or skipped.

**Trigger:** before any client/production deployment of the nav-drawer variants.

### P-MM-2 — Decide on sgs/section-heading block
**Status:** OPEN · **Bucket:** content · **Parked:** unknown

Mama's mockup has cross-section utility classes (`.sgs-section-heading__label/__intro/__sub`)
appearing across 4 sections, currently a CSS-only convention. Decide whether to formalise as a
dedicated `sgs/section-heading` block.

**Trigger:** Phase 8, if the recogniser flags these classes as orphan elements during Stage 6
(CSS classify) — otherwise leave as utility.

### P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM — Migrate product mockup to SGS-BEM
**Status:** OPEN · **Bucket:** content · **Parked:** 2026-06-03

`sites/mamas-munches/mockups/product/index.html` uses bare (non-`sgs-`-prefixed) BEM classes,
which Stage 0 hard-rejects on production runs. Must be migrated to SGS-BEM before the product page
can clone to `sgs/option-picker` blocks. HTML-only edit, no code change required.

**Trigger:** Before the next product-page clone run.


---

## Deploy + infrastructure

*2 open entries.*

### P-DEPLOY-TAR-SHIPS-PER-CLIENT-CSS — deploy tarball ships one client's gitignored CSS to every target
**Status:** OPEN · **Bucket:** ops · **Parked:** 2026-07-16

The deploy exclude list correctly skips per-client `.json` theme-style files but not `.css` ones, so a gitignored per-client stylesheet physically lands on every deployed target including other clients' servers. Confirmed harmless today (nothing enqueues it and WP block themes only read `.json` from that folder), but the exclude list contradicts its own stated intent. One-character fix, but decide first whether per-client `.css` belongs in that folder at all versus the documented `theme-overrides.css` home.

**Trigger:** next deploy-script or per-client-theming session.

### P-PARKING-SWEEP-CLOSEOUT — periodically drive the parking backlog toward zero
**Status:** OPEN · **Bucket:** ops · **Parked:** 2026-06-10

A standing housekeeping intent from an earlier phase plan: periodically re-count and actively work down the open parking backlog. Largely superseded in practice by the `/handoff` archive-on-resolve discipline (and this very normalisation pass), but kept so the original intent isn't lost entirely.

**Trigger:** ongoing — no specific trigger, a background process-hygiene reminder.

## Uncategorised / needs main-session merge decision


---

## Research + speculative

*4 open entries.*

### P-10 — svg-morph animation gap candidate (deferred until motion Wave C)
**Status:** DEFERRED · **Bucket:** research · **Parked:** 2026-05-07

⚠ Original premise DEAD (2026-07-29): MorphSVG (with all GSAP plugins) became 100% free for
commercial use at the April 2025 Webflow acquisition. Revival is spec'd as **Spec 38 FR-38-16**
(asset-gated MorphSVG, Tier G) — Bean signed Spec 38 off 2026-07-29 post qc-council. The old
Anime.js/SMIL alternative paths are superseded.

**Trigger:** motion Wave C runs (`plans/2026-07-29-motion-wave-C-session-prompt.md`); archive
this entry when FR-38-16 ships.

### P-CP-1 — /sgs-emit cross-platform component emitter (dead gate)
**Status:** DEFERRED · **Bucket:** research · **Parked:** unknown

Emit `/sgs-clone` results as equivalent React/React Native/Flutter/SwiftUI/Web Components code.
Genuinely unbuilt. The stated gate ("M9 production-stable") references a dead milestone name —
`P-11-M9` was archived as superseded — so it needs re-anchoring to a live production-status signal
before starting. This is not evidence to start now.

**Trigger:** Re-anchor the gate, then a named client cross-platform request (Bean & Tub RN app,
Indus Foods RN/Flutter reskin).

### P-CP-2 — Style translation (design tokens → cross-platform)
**Status:** DEFERRED · **Bucket:** research · **Parked:** unknown

Translate `theme.json`/design-token values into React/Flutter/SwiftUI/Web Components style
objects. Shares P-CP-1's dead-gate caveat — do not start before that's resolved.

**Trigger:** P-CP-1 in flight, or a client style-only-port request (e.g. HelpingDoctors EHR
web-to-mobile theme port).

### P-CP-3 — Animation translation (uimax animations → cross-platform)
**Status:** DEFERRED · **Bucket:** research · **Parked:** unknown

Translate uimax `animations` table entries into React-spring/Flutter/SwiftUI equivalents. Shares
P-CP-1's dead-gate caveat. The `animations` table's row count/mapping coverage could not be
verified from this repo (it lives in a separate uimax DB) — reported as unverified, not refuted.

**Trigger:** P-CP-1 + P-CP-2 in flight and an animation-rich app port is requested.

