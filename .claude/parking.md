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

### P-MAMAS-PRODUCT-DRAFT-NOT-BEM
**Status:** OPEN
`sites/mamas-munches/mockups/product/index.html` contains **zero `sgs-` classes**; all 4 of its
sections fail recognition as `unrecognised` and never reach the converter. Needs a decision: is this
draft meant to convert yet, or is it pre-SGS-BEM by design? Unlike the homepage folder it has no
TRUTH-SPEC.md. Relevant to the Phase-5 section-annihilation bug, which fires on non-BEM markup.


*52 open entries (re-derived 2026-07-31 from a `**Bucket:** pipeline` count across the whole file — entries with this bucket value are not all physically grouped under this heading).*

### P-DECISIONS-MD-OVER-LINE-CAP — decisions.md is 3,604 lines against a 600 cap
**Status:** OPEN · **Bucket:** tooling · **Parked:** 2026-07-30

`docscore` grades `decisions.md` at 67.3% (C), and the only genuine failure is length: 3,604 lines
against the 600-line cap for the doc type (2,634 when parked 2026-07-30; 3,097 after D424; 3,604
after D432 — it is still growing, ~1 doc-grade point lost per session). The project already has the remedy — archive-on-resolve
into `memory/decisions-archive.md` for retired/superseded/non-load-bearing entries — it just has
not been run recently enough to keep pace.

**The other three docscore failures on this file are SCORER FALSE POSITIVES — do not "fix" them:**
- `organization` ×10 flagged as US spelling. These are Schema.org type identifiers
  (`Organization`, `LocalBusiness`) inside JSON-LD discussion. `~/.claude/rules/uk-english.md`
  exempts third-party/fixed identifiers, and renaming them would break the emitted schema.
- `TBD` flagged as a stub. It appears in a historical note recording that a bug's cause *was* TBD
  at the time of writing — prose in a dated record, not an unfilled placeholder.
- `Maybe` flagged as hedging. It is part of an article title: Roselli, *"Maybe Don't Name That
  Landmark"* (2024).

Same class applies to `parking.md`'s own 80% (B): its `TODO`/`TBD` markers are quoted inside
parked-work descriptions, which is what a parking file is for.

**Trigger:** next decisions.md sweep, or when the D-range index is next rebuilt. Archive by
D-range; do not delete.

### P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT — a page-embedded nav's dropdown is overlapped

**Status:** OPEN · **Bucket:** blocks · **Parked:** 2026-07-31

An `sgs/nav-menu` placed inside PAGE CONTENT has its open dropdown painted over by the sticky header
and by the footer. Measured on canary 2091, five sample points, every one returning a rival element.

**⚠ CAUSE CORRECTED 2026-08-01 — the entry previously blamed "the theme's
`.entry-content{position:relative;z-index:1}`". THAT SELECTOR DOES NOT EXIST** anywhere in
`theme/sgs-theme/` (grepped the whole tree, zero hits). The same wrong cause is repeated in
`decisions.md` and in a `nav-menu/render.php` comment — do not act on it.

**The real mechanism is in the PLUGIN, not the theme.** `plugins/sgs-blocks/src/blocks/container/
style.css:47-50` applies, unconditionally, to every `sgs/container`:
`.sgs-container > *:not(.sgs-container__overlay){position:relative;z-index:1}`. It has been there
since the block's first commit (`9d38e5b8`) and is LOAD-BEARING — it guarantees content paints above
the container's own background layers (`__overlay`, `__video-bg`, `__svg-bg`), any of which an
operator can switch on at any time.

It reaches `.entry-content` because `theme/sgs-theme/templates/page.html` wraps the page body in
`sgs/container[tagName=main]` with WP's `post-content` (which renders `<div class="entry-content">`)
as a DIRECT child — and no band props are set on that container, so `$has_band_props` is false,
`.sgs-container__inner` never renders, and `.entry-content` matches the `>` selector directly.
The header is unaffected because `site-header/style.css:28-29` gives it `z-index:100` deliberately.

Lifting every level the block owns (item / bar / block root at `z-index:101`) does not help, because
the cap sits above all of them.

**The normal HEADER placement is UNAFFECTED and verified correct** — all five points return the panel
as topmost there, because the header itself outranks page content. This bites only the unusual
placement.

Not fixable from the block: raising `.entry-content` would put ALL page content above the sticky
header. Evidence: `reports/visual-diff/nav-menu-2026-07-31.md`.

**Three options, assessed 2026-08-01 — NONE is a 1-2 line fix, so this stays parked:**
1. Bump the in-block `:has()` z-index above 100 — REJECTED: bodges from the block, and promotes the
   whole page-content region above the sticky header while a dropdown is open.
2. **Portal the panel out via `position:fixed` / the CSS Popover API / top layer**, positioned from
   `getBoundingClientRect()` — the architecturally correct fix (the Radix / Floating UI technique);
   removes the panel from the stacking context so no z-index war is needed. **Recommended, but it
   needs a design gate + re-verification against the 18-scenario header suite.**
3. Accept as a documented limitation — header placement (the supported usage) is verified correct.

**Do NOT "fix" `container/style.css:47-50`** — removing or narrowing it is a shared-mechanism change
with site-wide blast radius (Rule 7 design gate), and it would break background-layer stacking on
every container on both live sites.

**Trigger:** a session that can take the option-2 design gate. Investigation was static-source only —
the live re-check on canary 2091 was not possible (browser instance held by another agent), so the
CURRENT paint has not been re-observed since 2026-07-31.

*(Two motion-track entries — the canary-fixtures-invalid-in-editor one and the fx-panel-unguarded-by-
every-control-gate one — were REMOVED from parking on 2026-08-01 and moved into
`plans/2026-07-31-motion-wave-D-client-readiness.md` as Steps K and L, which carry their full text.
Bean-ruled: parking is strictly for BLOCKED or POSTPONED work, and both are planned work with a named
next action. Do not re-park motion-track items — the Wave D plan IS the register.)*

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

### P-CONVERTER-LIVE-CLONE-VERIFY-BATCH — four converter changes are code-complete/merged but share one unmet closure condition: a real live-clone verification run
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-31 (merged)

**Why merged.** Four separately-parked entries all reduce to the same residual — the code shipped
and unit tests pass, but nobody has run the converter against a real client draft/clone and read
the live result. Merging them into one entry means the eventual verification session opens ONE
item, not four, and can knock all four residuals out in the same pass since they sit on
overlapping converter surfaces (css_pass.py / variant detection / conformance goldens). Named
`P-CONVERTER-LIVE-CLONE-VERIFY-BATCH` rather than after any one sub-case, since no single original
slug should read as more important than the others — this is an index, not a rename.

**Original entries folded in (verbatim residual scope, nothing dropped):**

1. **P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED** — the converter's `attr_for_property(block_slug,
   css_property)` resolver was widened (`_base_domain_attrs_for_css_property`, `db_lookup.py:782`)
   to key on element/state/tier and fail loud (`AmbiguousCssPropAttrError`) on a genuine tie
   instead of rowid-first. Converter unit suite is green (449 pass). Residual: the widening was
   never verified against a live clone — whether the keyed data actually IMPROVES cloning fidelity
   is an R-31-11/R-31-13 claim that was deferred.

2. **P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL** — nav-drawer/trust-bar variant discrimination
   must be BEM-structural, not styling-attr-based (design-gated + Bean-approved 2026-07-21).
   Trust-bar's own case is fixed (structural image controls double as its recogniser; the F6 gate
   is now a universal ambiguity rule — 2+ variants sharing an identical/empty signature =
   violation, one zero-signature fallback allowed) and unit-verified, but live-clone verification
   was never done. The universal audit of other blocks' `variant_slots` rows for the same
   styling-attr-discriminator defect is also still owed (see `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS`,
   the same defect class recurring on nav-drawer).

3. **P-QUOTE-PATH2-SELF-NESTING** — the Path-2 self-nesting bug (an unrecognised child element
   resolving to its own parent block's slug, letting a block self-nest) is CODE RESOLVED and
   merged into `main`. Three universal defences shipped: a recognition self-nest guard (FR-31-11),
   a transparent-wrapper dissolve fixing a silent content-drop class on tab/feature-grid/form-step/
   modal, and a `content_band` fill-width fix. Residual: 4 conformance goldens (tab / feature-grid /
   form-step / modal) are FOSSILS encoding the old dropped/self-nested content and now correctly
   fail. They need a LANDED-proof full-corpus re-seed — `tests/seed_conformance_goldens.py`
   re-seeds all 40 from local emit and its provenance gate mandates a canary deploy + computed-parity
   proof FIRST, never a bare local emit. This is the SAME task as `P-CONFORMANCE-GOLDEN-DRIFT`
   (one 27-failure re-baseline; these 4 are a subset, not extra work).

4. **P-CLONE-TEAM-MEMBER-ITEM-HEIGHT-DIVERGENCE** — the "244px vs 327px height gap" is an
   ENVIRONMENT ARTEFACT: the oracle renders the DRAFT as a bare `file://` fragment (no WP theme)
   and the CLONE as a full themed WP page, and `oracle/batch_runner.py:221` hardcodes
   `_HEIGHT_COMPARABLE = False`, so guard 4 returns passed+measured=False by design and can never
   pass. The once-parked box-model theory is physically wrong — info-box transfers the draft's
   padding/background/radius faithfully, and its diverging defaults (`cardStyle:elevated`,
   `effectHover:lift`) change no RESTING height. Its trigger fired (verified 2026-07-27): the
   preset-absence mechanism it deferred to has SHIPPED (`converter/resolvers/preset_absence.py`,
   wired at `css_pass.py:42/253`). Residual: the computed-parity Stage 11.6 re-check on
   team-member — verify via Stage 11.6 content-keyed parity, NOT the cross-environment height
   number. Remove this residual once the box-layout tier matches.

**Trigger:** one dedicated converter live-clone-verification session covering all four: (1) run
the keyed css_property resolver against a real draft and confirm it improves fidelity; (2) same run,
confirm trust-bar/nav-drawer variant detection resolves correctly and audit the remaining
`variant_slots` rows; (3) after a canary deploy, re-seed the 4 self-nesting goldens per
`P-CONFORMANCE-GOLDEN-DRIFT`'s discipline; (4) check team-member's Stage 11.6 content-keyed parity
and strike that residual if it matches.

### P-CONTAINER-WRAPPER-STANDARDISATION — converter Method-2 residual: cross-node COLOUR fold + Stage-11 auto-apply
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-02 · **Re-scoped:** 2026-08-06

**Re-scoped 2026-08-06 from a 8-item bundle to the 2 items that are actually open.** Five sub-items were
verified CLOSED or resolved and have been struck, per "an entry holds RESIDUAL SCOPE only":
named-section-before-container routing (true by construction — `recognition.py:181-266` returns a
`blocks.tier='class-section'` match verbatim and only reaches `container_default_slug()` after every
named branch fails), grid-lift (emits `gridTemplateColumns`/`*Mobile` matching the golden), image
sideload (`scripts/orchestrator/media-sideload.py`, wired unconditionally at stage-4i; a real run
manifest shows 12 uploads / 0 errors), plus notice-banner content-synthesis and the slider residual —
both of which were never about synthesis at all: they were the *declaration* question below.

**The declaration question is SETTLED for notice-banner (Bean, 2026-08-06).** Only 3 blocks declared
`supports.sgs.is_section_root`, so every other composite was demoted to `sgs/container` by the
capability gate. `sgs/notice-banner` now declares it (4 declarers: cta-section, hero, notice-banner,
trust-bar) — this is a declaration responsibility, exactly as `recognition.py:269-282` states, and is
independent of `containerKind`. Takes effect on the next `/sgs-update` (tier is derived at
`sgs-update-v2.py:717-718`). `sgs/testimonial-slider` is still demoted and is NOT covered by that
decision — raise it separately if a cloned slider should emit the slider block.

**RESIDUAL — the two genuinely open items:**

1. **Cross-node COLOUR fold (`no_area_attr`).** Box/grid/typography lift correctly; what fails is
   per-element *colour* on cross-node children. Measured on the brand golden: `color` on
   `.sgs-brand__headline` and `color`/`border-color`/`background` on `.sgs-brand__cta` are folded onto
   the owning `sgs/container`, which has no area attr for them, and are dropped rather than routed to
   the child `sgs/heading`/`sgs/button`. 30 `[fold-gap] cross_node_gap_candidate … reason='no_area_attr'`
   warnings on that one section. Anchor: `converter/services/assembly.py:63` (`_fold_trace`) ←
   `converter/services/fold_helpers.py` `route_area_css_to_block_attrs`.
2. **`/sgs-update` Stage-11 auto-apply.** Still report-only by design — `sgs-update-v2.py:5049-5104`
   runs `sync-container-wrapping-blocks.py --write-block-json` with no `--apply`, and the header
   stage-map at `:29-32` repeats "report-only; NO --apply — operator-gated". Deciding whether it should
   auto-apply is the open question, not a bug.

**Trigger:** the next converter Method-2 session. Item 1 is the fidelity-blocking half.

## framework

### P-CSSLAYER-DROPPED-ON-AN-UNASKED-QUESTION — `css_layer` was descoped on a number nobody interrogated
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-21

`css_layer` was descoped on the basis that it was populated on only 6 of 2,817 rows, all with the same value — i.e. that it distinguished nothing. **That reasoning was wrong in the same way the tier bug was wrong: the number was accepted without asking what it SHOULD be.** The L1–L4 OUTER/CONTENT-WIDTH/PER-GRID-ITEM cascade is exactly what separates container attrs that legitimately share a property. The axis question is now settled (Front 1, `7a6a7586`): layer stays on its own axis, and `css_element`/`css_state`/`css_tier` are the separate declarative routing keys — not folded into one element key. Residual = seed `css_layer` more fully.

**⚠ Its own numbers are materially stale (re-measured 2026-07-27):** `css_layer` is now populated on **323 rows across 4 distinct values** (`OUTER`/`GRID`/`GRID_AREA`/`CONTENT`), not "6 of 2,817, all one value". The cited example is also resolved — `sgs/hero`'s 9 `padding` attrs each carry a distinct `css_element`, so that collision group is closed. **RE-MEASURE before treating the "small tail" framing as current.**

**Trigger:** a converter session that needs the layer tail (padding-family collisions).

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

**Re-confirmed 2026-07-31:** `grep -rn "lift_root_supports_to_style(" converter/ --include="*.py"`
(excluding its own `def`) still returns exactly one production call site — `services/css_pass.py:151`
— against 15 non-production hits, all inside `tests/test_root_supports.py`. Premise stays dead;
nothing to re-diagnose until a second production call site actually appears.

**Trigger:** Before shipping any further changes to that lift function.

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
and won't return under the no-deprecations policy. (5) RESOLVED 2026-08-02 (D461/D462) — the
`calc()`/`clamp()` whitelist is BUILT. `sgs_css_length_value()`
(`includes/helpers-css-safety.php`) accepts `var|calc|min|max|minmax|clamp|repeat` via WordPress
core's own recursive balanced-paren grammar, checks the raw input for breakout characters BEFORE
consuming functions, and fails CLOSED. BOTH length paths delegate to it —
`sgs_container_gap_value()` (flat scalar) and `sgs_responsive_sanitise_css_value()` (object model,
which was the more exposed of the two: it permitted `/` and `*` so never blocked the `/*` comment
opener, and stripped rather than rejecting). Live-verified.

**Trigger:** Framework/shop-layer session touching container-wrapper controls.

### P-GATE-A-CARD-RESIDUALS — product-card option-picker pills deferred to option-picker design discussion
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-04

Of the original Gate-A residuals, `ctaText`/`ctaUrl` and `imageAlt` are resolved and landed. Only the pack-size "pills" equivalent (now `sgs/option-picker`) remains, deliberately deferred by Bean to the option-picker design discussion rather than fixed ad hoc.

**Trigger:** option-picker design discussion.

### P-HERO-SUB-MAXWIDTH-NESTED-CHILD — a per-element max-width on a nested text child inside a composite is dropped
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06

Root cause traced precisely: a nested leaf is built with `is_root=False`, so `layer_detect.py` can never classify it as OUTER (OUTER requires `ctx.is_root`); it lands as CONTENT, which routes `max-width` through the width-equivalence to `contentWidth` — but `sgs/text` has no `contentWidth`-family attr, so the lookup returns None and the value is silently dropped. Two candidate fixes: (a) reclassify CONTENT→OUTER for text-leaf children with no content-width attr, or (b) extend the attr-resolve fallback to CONTENT when the block lacks a `contentWidth` family but has `maxWidth`. Destination is confirmed live (`sgs/text.maxWidth`, `css_property=max-width`).

**Trigger:** the container L1-L4 cascade session.

### P-L4-PER-ELEMENT-EXTRACTION-FOLLOWUPS — duplicate residual marker pairs weaken idempotent re-clone
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-10

When a block emits both a root residual (D289) and a per-area residual (D290), `sgsCustomCss` carries two `SGS-CONVERTER-RESIDUAL` marker pairs. Harmless in output (`custom-css.php` emits verbatim) but it weakens the "idempotent re-clone replace" claim, because no consumer does marker-delimited replacement yet — `converter/services/assembly.py:243` still documents append-after-existing behaviour.

**⚠ The entry's other item is MOOT (verified 2026-07-27):** the claimed `notice-banner textFontSize` dead-write does not exist — `textFontSize` is absent from that block's `block.json` AND `render.php`. Do not go looking for it.

**Trigger:** a per-element-extraction refinement pass. Low priority.

### P-MEDIA-BRAND-GOLDEN-RESEED — brand golden fixture needs re-seeding, but the diff hides possible regressions
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-06

The `mamas-munches-homepage__brand` conformance golden is stale from an intended media-attr rename, but the live diff is bigger than that alone: the heading has LOST its `style.color`, and the button now emits border attrs the golden has no trace of, accompanied by ~30 currently un-routed `[fold-gap]` warnings. Re-seeding now would silently bake a possible regression in as "correct".

**Do not re-seed until the heading colour loss and the CTA border divergence are root-caused.**

**Trigger:** a deliberate golden-reseed pass, gated on root-causing the two live divergences first.

### P-MEGA-BLOCKS-MISSING-FROM-CONTAINER-ROSTER — three mega blocks absent from the container-wrapping roster
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

`/sgs-update` Stage 11 (`sync-container-wrapping-blocks.py`) WARNS: detection finds `sgs/mega-panel` (section-kind) plus `sgs/mega-aside` and `sgs/mega-group` (content-kind) as container-wrapping blocks, but they are absent from the script's expected ground-truth roster, so the sync fails closed before `--apply` (correct behaviour; diffs at `pipeline-state/container-inheritance-sync/2026-07-28/`). Declaring them is a composite-mirror scope statement (D152 lineage), not a mechanical edit — which is why it is parked rather than patched.

**Trigger:** next Spec-36 session or the next full `/sgs-update` — confirm each mega block's KIND, add to the expected roster, re-run Stage 11 clean. Owned by Track 2.

### P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS — nav-drawer's 7 variantPresets have empty structural discriminators
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

D403 shipped 7 nav-drawer `variantPreset` variations, but the `supports.sgs.variants` set-difference leaves 6 of 7 variants (anchored-card-stack / centred-statement / editorial-ghost-list / solid-brand-light / two-column-editorial / split-zone-serif) with an EMPTY discriminator signature — `detect_variant` cannot tell them apart from extracted CSS. This is the same class as `P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL` (the universal F6 ambiguity rule built from the trust-bar case). The `variantPreset` enum itself was added (mechanical transcription from variations.js) and this finding was consciously BASELINED (`db-consistency-baseline.json`) to unblock main's prebuild — that is not a fix.

**To close:** give each variant structural/styling discriminators per the F6 fix pattern (only ONE variant may keep the empty fallback), then remove the baseline key. `detect_variant` is blind on nav-drawer until this lands.

**Status reasoning:** assigned OPEN rather than DEFERRED because it names a concrete next-session trigger and blocks a live capability (drawer-variant cloning), not a speculative future want.

**Trigger:** next nav/Spec-36 session — before any drawer-variant cloning is attempted.

### P-NO-INLINE-GATE-COVERAGE-GAPS — the inline-zero gate can pass vacuously
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-28 · **Advanced:** 2026-07-30 (D425)

**Item (2) CLOSED 2026-07-30** — all three non-injector writers were triaged AND fixed
(`class-sgs-container-wrapper.php` SVG-background opacity, `class-post-grid-rest.php` card vars,
`shape-dividers.php` inline `height`/`color` — the last being real PROPERTY declarations, the more
serious breach). Commit `4d3b598e`.

**Item (1) PARTIAL.** Two gate-canary pages are now seeded and wired into `CANARY_URLS`
(`sgs-gate-canary` 2064, `sgs-gate-canary-2` 2071), which converted a genuinely vacuous pass into a
real one: before them the deep scan reported *"PASS — 0 inline styles across 0 sgs block type(s)"* —
it saw NO blocks at all.

**RESIDUAL SCOPE — what those pages still do NOT carry.** They cover var-driven RENDER features
(per-item stagger + fill, SVG opacity, shape dividers, post-grid card vars, countdown colours,
gallery aspect, form progress, review breakdown, plan ribbon, badge fg). They do NOT carry the
EXTENSION-driven instances this entry originally named: **hover scale, animation, parallax,
image-controls, block-link** — which is the exact class that let the team-member inline-var pass
vacuously for weeks. Until one instance of each is seeded, that class is still unexercised.

**Trigger:** next Spec-32/gate session. ⚠ If the seeded pages are ever deleted the gate silently
returns to proving nothing — re-seed rather than drop (a warning to that effect is in
`check-no-inline.py`'s `CANARY_URLS` comment).

### P-NO-INLINE-LAND-ROSTER — no-inline rollout: full-roster per-block LANDED accounting still owed
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-10

The split-edit/serial-land integration merged ~35 blocks' no-inline work (code-complete, build-green, DB reseeded) but only spot-verified a subset. The prebuild gates (`audit-inline-styling.js --check`, `check-box-family-guard.py --check`) are already wired into `package.json` (confirmed done — do not re-add). What remains: run the full-roster verify script across the remaining blocks and write a `reports/visual-diff/<block>-<date>.md` per block with `verdict: PASS` + `first_paint_capture_passed: true` for every block, not just the ones already spot-checked.

**ADVANCED 2026-07-30 (D425), NOT closed.** Ten blocks gained genuine reports with real Playwright
captures against canary pages 2064/2071 — `card-grid`, `countdown-timer`, `cta-section`, `form`,
`gallery`, `google-reviews`, `post-grid`, `pricing-table`, `product-card`, `trust-bar` (commit
`4d3b598e`). Six of those needed canary content authored before they could be evidenced at all —
the conditional markup each fix touches (background overlay, multi-step progress, gallery items,
rating breakdown, plan ribbon, discount badge) existed on no page. Residual = the rest of the
roster; also still owed are `product-faq` and `product-faq-item` (audit finding 1a-7).

**Trigger:** the LAND-completion session — the main remaining work of the no-inline rollout.

### P-PAGE8-DISCREPANCY-REGISTER / P-PAGE8-QC-BATCH-9 — page-8 clone-fidelity visual defect registers
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-06 / 2026-07-11
**Also known as:** P-PAGE8-QC-BATCH-9

Two overlapping Bean-reported visual-QC defect registers against the live page-8 clone, several defects already fixed and landed in each. Bean's standing instruction for both: root-cause each defect to a small number of UNIVERSAL causes (most trace back to the "hardcoded default overriding a faithfully-absent draft value" class), fix as a batch grouped by shared cause, never piecemeal.

**Remaining defects (deduplicated across both registers):** black borders (partially fixed — safecss/border-colour transfer), card equal-height (partially fixed), button preset/width/hover divergences (ghost-button underline-on-hover, ghost-button colour resolution — tracked separately at `P-DRAFT-CSSVAR-COLOUR-RESOLUTION`), component-injected defaults (option-picker tick mark and pill width, label-highlight width, info-box margins, disclaimer box styling, emoji size, trustpilot bar height), brand-section spacing/line-height (verify it isn't a separate injected margin before attributing to the theme base), and the inline-styles-architecture question (distinguish legitimate scoped `<style>` from genuine inline `style=""` before changing anything). Precondition: page 8 needs re-cloning first, since its current baseline pre-dates several fixes already landed.

**Trigger:** needs the LIVE-BROWSER-GATED treatment (a live QC session, not a static re-audit) — re-clone page 8 first, then re-triage what's actually still visible against the current engine.

### P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES — Snapshot pull round-trip + pre-deploy guard missing
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-06-03

`push-theme-snapshot.py` now writes both `theme.json` and the live `wp_global_styles` post
(shipped D161) — the original silent-fail bug is closed. Still missing: the pull round-trip
(reading live edits back into the snapshot) and a pre-deploy guard that warns when a user has
edited live styles that a push would overwrite.

**Trigger:** Next theme-snapshot tooling session.

### P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES — `role` and `css_property` answer different questions; do not merge them
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-21

**A standing finding that REVERSES an earlier assumption — read this before any proposal to "fix" or retire `role`.** `role` = what the value IS (a colour → the client needs a colour picker). `css_property` + element/state/tier = how it is DELIVERED. They are perpendicular, and neither replaces the other. Proof: `sgs/cta-section shadow`, `sgs/card-grid cardShadow` and `sgs/team-member cardShadow` all carry `role='color'` + `css_property='box-shadow'` — not disagreements but the same value-type-vs-delivery distinction. Measured on the 290 rows where both are populated: exactly 2 genuine disagreements (0.7%). Caveat that must travel with that number: 290 is only 30% of `role`'s 977 populated rows, so it is 99% on the measurable third, not a clean bill of health. `canonical_slot` / `derived_selector` are not replaceable at all — they answer recognition, a third axis. **Do NOT pursue replacement: it would delete a working semantic axis to install a mechanical one.**

**⚠ The supporting numbers above are STALE — re-measured 2026-08-06: 1,053 rows have both `role` and
`css_property` populated (not 290), against 2,728 `role`-populated rows (not 977). Re-derive the
"30% of the population / 0.7% disagreement" framing before quoting it again.** The finding's thesis is
unaffected and still holds: `role='color'` maps to 16 distinct `css_property` values including
`box-shadow` and `stroke`, which is precisely the value-type-vs-delivery perpendicularity it defends.

**Residual work: NONE — the pickerPill\* item is CLOSED (verified 2026-08-06).** There is nothing to
edit: both `sgs/product-card` override entries in `attr-classification-overrides.json` declare only
`derived_selector` and carry no `role` field at all, and the DB reports `role='visual'` for both —
matching their `sgs/option-picker` siblings. The `pill*` name-collision producing `role: typography`
is not reproducible in current data. (When it was fixed is untraced; no D-number found.)

**This entry is now a STANDING GUARD with no work attached.** It is retained deliberately — not as a
task, but so that any future proposal to "fix", merge or retire `role` meets the measured refutation
first. Do not archive it as resolved; it has no residual scope BY DESIGN.

**Trigger:** none. It fires defensively, when someone proposes replacing `role`.

### P-SINGLE-ITEM-ARRAYS — a single-item array never triggers the array lift
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-06-30

Structural item detection needs ≥2 repeating siblings; a 1-item "array" (e.g. one testimonial where the block supports many) won't lift at all. Needs a decision: accept the gap, or add a schema-signature single-item fallback.

**Trigger:** next array-handling design decision.

### P-SUBHEADING-ROUTING-TO-SGS-HEADING — Walker needs to set headingRole on subheading emit
**Status:** BLOCKED · **Bucket:** pipeline · **Parked:** 2026-05-28/29 (D99)

Routing mockup subheadings to `sgs/heading{headingRole:'subheading'}` instead of `sgs/text` needs
the walker to set `headingRole` at emission time — confirmed still missing (only a docstring note
exists at `db_lookup.py:3026`, no code sets it). Flipping the `slots` row alone (still `sgs/text`)
would mis-render subheadings as headings. Options: (a) a walker derive rule from canonical_slot
identity, or (b) a new `slots.standalone_block_default_attrs` JSON column.

**Trigger:** Phase 1.4 walker rewrite — pick mechanism (a) or (b) at that point.

### P-PACKSIZE-ACTIVE-DEFAULT — cloned option-picker has no pre-selected pill
**Status:** DEFERRED · **Bucket:** pipeline · **Parked:** 2026-07-08

A cloned `sgs/option-picker` renders with NO pre-selected pill: the draft's `--active` pill (e.g.
12-pack) is not lifted as `defaultSelected`. The array lifter (`array_content.py`) lifts only the
pill's text (`label`); marking the active default means reading the `--active` CSS **modifier** — a
boolean-from-modifier mechanism the array resolver does not have. Low value (selectable-only).

**Trigger:** fold into the named-pickers work.

---

## Framework: blocks, theme, specs

*61 open entries (re-derived 2026-07-31 from a `**Bucket:** framework` count across the whole file — entries with this bucket value are not all physically grouped under this heading).*

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

### P-BLOCK-DESIGN-POLISH — cta-section + notice-banner design upgrades
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-02

Two design upgrades from Bean's brain-dump: cta-section needs rich template patterns
(stats/social-proof filler like the hero presets, not just alignment variants); notice-banner
needs per-type icon+CSS bundles as ideal defaults. Also a pending decision on the dormant
heading `hero` variant.

**Trigger:** Framework design-polish pass.

### P-FLOATING-UI-BOTTOM-BARS — extend Spec 18 Floating UI to persistent bottom bars
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-26

Research-backed conclusion: persistent bottom CTA/cart/sale bars belong in the existing Spec 18 Floating UI layer (which today only holds back-to-top + reading-progress), not as sticky footer rows. Key build constraints for whoever picks this up: build one shared `position:fixed` bottom stacking container first rather than per-component z-index; treat a cart bar and a promotional bar as different classes (navigation/one-transaction bars are legitimate persistent chrome, promo bars must be small and dismissible); use `env(safe-area-inset-bottom)` (note `dvh` does not fix iOS bar occlusion, it's a different problem); and add the bottom-edge equivalent of SGS's existing top `scroll-padding` guard (WCAG 2.4.11).

**Trigger:** needs its own design gate before any build; not a blocker for the Spec-37 sticky-header work.

### P-FP-COUNCIL — non-blocking residuals from the FP-H/FP-E commerce-layer adversarial council
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-10

The security leak, customer-facing deleted-product message, double-query, and doc-staleness this council found were all fixed at the time. Residuals: namespace two global product-card helper functions into `SGS\Blocks` (collision risk); extract duplicated CTA-label/visibleAxes-sanitise logic into shared helpers; the non-variable product branch has no disabled/"out of stock" button state; no editor-side go-live checklist or draft/unavailable notice for non-coders; option-picker keyboard focus passes through every pill before reaching the CTA (own gated round, purchase-critical); a widthMode wide/full precedence question shared with another block is BLOCKED on a Rule-7 design gate (shared-wrapper change).

**Trigger:** each item is its own small deferred round; the widthMode item specifically needs a Bean design-gate before any work.

### P-HEADER-SIMPLICITY-FINDINGS — operator-simplicity test failed; 2 findings + the blind-tester arm still owed
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

The FR-37-26 automated-proxy simplicity test failed on drawer content (since addressed — `sgs/nav-menu` now warns and one-click-fixes a burger with no panel to open) plus two still-open friction findings: (1) selecting the header block in the canvas by clicking is a hidden blocker — it only selects via List View; canvas-click should select it; (2) the header Settings tab shows ~7 default-visible controls against the target roster's 2 — reconsider ordering (move extras to Advanced) rather than hiding anything a client relies on. The test's authoritative half — a real non-coder, screen-recorded — has never been run.

**Trigger:** a dedicated header-simplicity pass, including the blind-tester arm; not a blocker for the Spec-37 per-row build.

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

### P-PRODUCT-CARD-NAMED-PICKERS — product-card: named + multiple option-pickers per card
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-06

Deferred until the cloning pipeline is complete (Bean-gated): (a) an optional name field per picker (the draft doesn't use one so it was dropped for the simplest setup); (b) multiple named option-pickers per card (flavour/topping/dietary, not just pack size) via a repeater.

**Trigger:** post-cloning-pipeline-complete; not currently a priority.

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

### P-S17-W2-ADMIN-SPLIT — Further split class-sgs-site-info-admin.php
**Status:** OPEN · **Bucket:** framework · **Parked:** unknown

A prior extraction already happened (`class-sgs-site-info-admin-notices.php` exists); the file is
now 444 lines (not the 502 originally logged), still 48% over the 300-line cap. Extract remaining
notice/dismiss-handling logic to bring it closer.

**Trigger:** Next time anything is added to this file, or Wave 3 starts.

### P-SPEC37-OPEN-RESIDUALS — Spec 37 coverage-matrix residuals
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-21

Five smaller open items from the Spec 37 coverage matrix: (a) the skip-link regression contract needs a successor statement in the FR-37-31 retirement; (b) the 3 layout starter variants fold into FR-37-8; (c) FR-S5-3's non-carried WP-CLI commands need a decision on what happens to the rest of the set; (d) the FR-37-12 responsive width set is missing the 320–374px band; (e) Spec 17's prose-only REST capability-gating content needs restating under the FR-37-14 "attribute shape frozen" guardrail.

**Trigger:** alongside the FR-37-31 retirement work.

### P-SPEC37-PER-SITE-DECLIENT — per-site header/footer content authoring (framework de-client complete; real branded content pending)
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-22

The framework carries no client data any more (the client-named pattern file was deleted) and the mechanism for authoring each site's header/footer as CPT posts is proven on both live sites with generic proof content. What's left is authoring the REAL branded per-site content, which is deferred to the Spec 33 Part 2 cloning pipeline rather than being hand-built.

**Trigger:** next session Task 1; blocks full FR-37-6 closure and the Indus deploy.

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

### P-UIMAX-DRAWER-LOGO-AUTODERIVE — auto-derive drawer-head logo colours from the header row
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-15

Research-backed enhancement: when a client turns the drawer logo on, auto-derive the head strip's background/foreground from the client's own existing header row (publish `--sgs-header-bg`/`--sgs-header-fg` alongside the existing header-height publisher) so the drawer logo is legible by construction. No competitor does this; full design already written up.

**Trigger:** a client flags an illegible drawer logo, or the drawer rework touches the head row for another reason.

### P-VAT-ZERO-RATED-PRECISION — VAT-label gate is store-level, not per-product-tax-rate precise
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-12

The FR-30-9 VAT-suffix gate checks only whether the store has tax calculation enabled, not the individual product's effective tax rate — so a VAT-registered seller of zero-rated goods would still show "(inc. VAT)" incorrectly. Bean chose the simple store-level gate deliberately; per-product precision (checking `WC_Tax::get_rates()`) is the more accurate but unbuilt option.

**Trigger:** add as a go-live verification item (confirm the client's VAT-registration state matches the label) rather than building the precise version speculatively.

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
theirs is night and day"*. Verified defects. (1) **Content is not an exact clone** despite the §6
POC rule mandating it — the gap is DESIGN fidelity (text/border/symbol/button styling, cycling
background imagery + its motion, the animated secondary media), **not item count**.
⚠ **An earlier version of this entry claimed `centred-statement` "renders 3 menu items where the
extraction recorded 7" — that is FALSE and is struck (D411).** The 7-item site is studionamma
(`two-column-editorial`); `centred-statement` clones fantasy.co, which genuinely has 3 primary links
(`labels-fantasy.json` `counts.primary = 3`, matching the independent extraction count). Acting on
it would ADD four items that should not exist.
(2) **Alignment is wrong on several variants**; `centred-statement` renders LEFT-aligned — root
cause proven, see `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. Its link arrows are **not** label-less:
the labels are present and laid out but painted at **1:1 contrast** — see
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` for the measured cause. (3) **`solid-brand-light` has no
reference capture at all.** (4) **`two-column-editorial`'s "reference" is the closed homepage with a
cookie banner** — the menu was never opened.

**Root cause of the false green:** the capture script never asserted the panel was OPEN before
shooting (the same vacuous-capture class the axe harness fixed on 2026-07-29 but the screenshot
harness did not), and nothing compared fixture link counts against the extraction JSON. The exit
report then presented 21/21 axe/geometry/focus cells as though they evidenced visual fidelity.

**To close:** rebuild every fixture to genuinely exact reference content, verifying link COUNT and
label TEXT against `reports/2026-07-28-drawer-code-extraction/*.json` per variant and failing the
build on mismatch; fix per-variant alignment; add an openness assertion to the screenshot capture
so a closed-panel shot is reported VACUOUS rather than saved; capture real menu-open references for
`two-column-editorial`, `solid-brand-light` and `buck.co`.

**Trigger:** the merged 36/37 track's FINAL proof gate. Bean signed the architecture gate on
2026-07-29 and **re-sequenced the clone to the END** — a faithful clone depends on FR-37-42
(asymmetric 3-col grids), the DP4 burger-trigger controls and the drawer CPT, all unbuilt, so
clone-first would only reproduce the rejected half-clone with more steps. This entry is therefore
NOT queued work; it is the standard the clone must meet when the system is complete. Task 5 must
not be re-presented to Bean until every defect above is fixed.

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

### P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU — the centred drawerAlign value leaves nav links flush left
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-29

The drawer emits no align class (`drawerAlignAttrPresent: false` on the live element).
`drawerAlign` centres the drawer's direct children as BOXES; the nav-menu then stretches to full
width (1376px at 1440) with `text-align: start`, so its links stay at x=32 while the narrower
secondary blocks do centre — the panel reads half-centred. Affects `centred-statement`, the variant
whose name IS its alignment.

Fix shape: propagate `drawerAlign` into the nav-menu's own item alignment (bar `align-items` +
link `text-align`), not just the drawer body's box alignment. Shared-block change → design gate.

**Trigger:** the block-vs-CPT architecture decision; do not patch before that lands.

### P-NAV-MENU-LISTCOLUMNS-READING-ORDER — 2-column drawer list interleaves the menu order
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-29

`nav-menu`'s in-drawer `listColumns` grid uses `grid-auto-flow: row`, so a 7-item menu lays out
ACROSS the columns instead of down them. Measured live on fixture page 1922 at 1440: menu order is
Home · Work · Services · Approach · Studio · Plans · News, but column 1 reads Home · Services ·
Studio · News and column 2 reads Work · Approach · Plans. Keyboard and screen-reader order are
correct (they follow the DOM) — it is the VISUAL reading order that diverges, and the reference
design (studionamma) splits sequentially 4+3.

⚠ **DOWNGRADED TO UNDECIDED (2026-07-29, D411) — this is NOT a live recommendation to change a
shared block.** The finding assumed readers scan DOWN columns. **Bean's counter stands:** with a
row-wise grid, reading ACROSS rows already yields the menu order, and authoring the menu as rows of
2 gives a correct pattern either way. There is also **no ground truth** — the reference capture for
this exact variant (studionamma) failed, so what the reference actually does is unverified.

Fix shape IF it is ever confirmed wrong: `grid-auto-flow: column` plus an explicit row count derived
from the item count in `nav-menu/render.php`. That changes rendering semantics of a shared block, so
it needs Bean's sign-off (project rule 7) rather than an inline change.

**Trigger:** a verified menu-OPEN capture of the studionamma reference showing which reading model
it actually uses — then Bean's decision on finding F1 of
`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`. Do not change the block before
that capture exists.

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


## Tooling, scripts, skills + docs

*22 open entries (re-derived 2026-07-31 from a `**Bucket:** tooling` count across the whole file — entries with this bucket value are not all physically grouped under this heading).*

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

## content

### P-SGS-ENGINE-ENFORCE-GATE — sgs-wp-engine skill's ground-truth enforcement is advisory, not a real gate
**Status:** DEFERRED · **Bucket:** tooling · **Parked:** 2026-07-15

The skill's enforcement hook is a no-op stub while its docs previously overclaimed a hard gate; the claim has been honestly corrected to advisory, but the real structural gate (a PreToolUse hook blocking framework-code edits without a GROUND-TRUTH line, wired into settings.json) still needs building.

**Trigger:** next hooks/enforcement session — Bean chose fix-the-claim-now, implement-later.


### P-SPEC35-STATE-AUTOSUGGEST — Suggestion helper for suffix-shaped state attrs
**Status:** OPEN · **Bucket:** tooling · **Parked:** unknown

92 of 113 state attrs are suffix-shaped (`backgroundColourHover`); a suggestion-only CLI could
offer `{baseAttr}+Hover` candidate mappings for human/agent review — never decide automatically
(watch for false positives like `pauseOnHover`/`effectHover`, which aren't style properties).
FR-35-5 is approved but not built (D354), and only one block declares a `states` key today —
nowhere near the scale that would justify this.


**⚠ Its own count is WRONG (re-measured 2026-07-29): 16 block.json files carry a `states` key, not one.** Whether those 16 are the same mechanism this entry means (vs FR-35-5's suffix-shaped attrs) needs disambiguating — but on the entry's own stated terms the at-scale trigger has likely fired.
**Trigger:** After FR-35-5 ships and the roster starts declaring `states` at scale.

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

### P-COLLAPSIBLE-TEXT-DEFAULT-COPY — shop-archive SEO copy slots ship intentionally empty; confirm onboarding covers this
**Status:** OPEN (by design) · **Bucket:** content · **Parked:** 2026-06-11

The framework's `archive-product.html` ships its two collapsible-text SEO slots empty by design, so no client copy is hardcoded into the shared template — per-client shop copy is meant to be added via the Site Editor. What remains: confirm the per-client onboarding flow actually documents seeding this copy, and consider a sector-neutral default pattern operators can clone from.

**Trigger:** next onboarding-documentation pass.

## ops

### P-DRAWER-VARIANT-CONTENT-GENERICISE — nav-drawer POC fixture copy must be genericised before production use
**Status:** DEFERRED (blocks production, not POC) · **Bucket:** content · **Parked:** 2026-07-28

The nav-drawer variant POC fixtures and seeded variation copy are exact clones of reference-site content, deliberately, so visual differences are attributable to the block rather than the copy. Before any client or production use, the seeded copy must be genericised and any reference-site wording stripped out. A named pre-production step — must not be lost or skipped.

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

*3 open entries.*

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

