---
doc_type: parking
project: small-giants-wp
last_updated: 2026-09-03
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
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-08-01
`sites/mamas-munches/mockups/product/index.html` contains **zero `sgs-` classes**; all 4 of its
sections fail recognition as `unrecognised` and never reach the converter — Stage 0 hard-rejects
non-`sgs-`-prefixed BEM on production runs. Needs a decision: is this draft meant to convert yet, or
is it pre-SGS-BEM by design? Unlike the homepage folder it has no TRUTH-SPEC.md. Relevant to the
Phase-5 section-annihilation bug (now FIXED, 2026-09-04, D954/D956 — see decisions.md) —
that fix scopes an unexpected exception to the failing column rather than nulling the whole
section, but does not change Stage 0's hard-reject of non-BEM markup, so this entry's core
decision is unaffected. Once resolved, migration is an HTML-only edit (no code change) so the
page can clone to `sgs/option-picker` blocks.

*(Merged 2026-08-12 with the duplicate `P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM`, parked 2026-06-03 —
same file, same underlying issue. Superseded entry archived to `memory/parking-archive.md`.)*

*Entry count is deliberately NOT cached here — it drifted to three different figures (58 here, 61 below, 62 raw) before this line was cut on 2026-08-22. Measure it: `grep -c "^### P-" .claude/parking.md` minus the fenced template example, or read `handoff-preflight.py --check`.*

### P-MEDIA-ATOM-CALLER-SUPPLIED-SELECTOR — overlay atom can't paint onto a caller's own marker

**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-09-03

Every media atom paints via one of two hardcoded marker classes (`sgs-media-box`/`sgs-media-el`,
`SGS_Media_Element::box_classes()`/`element_classes()`) — there is no way for an existing shared
component with its OWN marker (`class-sgs-container-wrapper.php`'s `.sgs-container__overlay`
sibling span, used by 28 blocks) to consume an atom's custom-property values without adopting the
atom's marker scheme wholesale. This is what blocks `class-sgs-container-wrapper.php`'s overlay
CSS from ever routing through the shared `overlay` atom (7 blocks' `backgroundOverlay*` findings
stay documented debt on rule `37-media-no-handroll` until this is solved — see D922).

Needs a genuinely new atom capability: paint via the atom's custom properties on a
caller-supplied selector, not just the two fixed marker classes. Investigated but not designed
2026-09-03 — confirmed zero precedent anywhere in the atom system (16 atoms, all element/box
scoped). A real design task, not a quick fix; the wrapper's own overlay CSS is currently MORE
capable than the atom (has tiering the atom didn't, until D922's tiering fix), so this is not
urgent — the wrapper works fine as-is, this is purely a dedup opportunity.

### P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT — a page-embedded nav's dropdown is overlapped

**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-31

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
`plans/2026-07-31-motion-wave-D-client-readiness.md` (CLOSED 2026-09-04, now `plans/archive/`) as
Steps K and L. Neither step's text survives
there any more: Step K was marked CLOSED and pruned in commit `ea12f5e7`; Step L was deleted in
commit `0cb69514`, whose message states only closed bodies were deleted. Step L appears resolved —
Spec 38 §7 names `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js`
(built 2026-08-06) as the fail-closed gate now covering every new fx panel — but that is INFERRED,
not proven, and is recorded here as inference only. Bean-ruled: parking is strictly for BLOCKED or
POSTPONED work; do not re-park motion-track items.)*

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
   was never done. **Nav-drawer's own defect (the sub-item this residual pointed at) is NOW
   ACTUALLY RESOLVED (D974, 2026-09-06) — correcting this entry's earlier premature claim.**
   D969's composition-tiebreaker signal (2026-09-05) alone did NOT close this — the worktree's own
   honest exit report confirmed `two-column-editorial` still returned `None` afterwards, because
   its two candidate discriminators were both unusable from a real clone (`itemFontSize` seeded
   flat against a tiered schema; `listColumns` had zero CSS routing). D974 fixed both for real
   (tiered `itemFontSize` in `variations.js` + a DB-driven grid column-count route in
   `converter/resolvers/grid.py`) and confirmed live via `detect_variant()` returning
   `"two-column-editorial"` for a real-clone-shaped fixture, with a negative control proving the
   old broken shape still fails closed. **The universal audit is also now substantively covered**,
   not by a manual walkthrough but by the automated F6 gate itself running clean (0 violations)
   across every block with `variant_attr` set, plus two proactive checks — "Check #10 — Dead
   Composition Discriminator" and "Check #12 — order-dependent role-resolution guard" (D974; 15
   pre-existing findings fully closed, not re-baselined) — that catch this defect class and its
   sibling (silent role-resolution guessing) the moment any future block introduces either.
   Residual scope narrows to just: trust-bar's own live-clone verification, never done.

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
confirm TRUST-BAR variant detection resolves correctly against a real draft (nav-drawer's own
resolution — code + F6 gate + live editor-canvas proof — is done, see item 2 above; only
trust-bar's live-clone leg remains open here); (3) after a canary deploy, re-seed the 4
self-nesting goldens per `P-CONFORMANCE-GOLDEN-DRIFT`'s discipline; (4) check team-member's
Stage 11.6 content-keyed parity and strike that residual if it matches.

## framework

### P-COLOUR-NAV-MENU-BURGER-GRADIENT — nav-menu's burger icon needs the SVG-gradient mechanism, not the text-gradient one
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-09-04

`nav-menu.burgerColour` was one of D936's 9 background-collision rows and was found (D942) to be
a miscategorisation, not a same-recipe fix: the burger's visible glyph is an inline SVG icon
coloured via `currentColor`, not rendered text, so `background-clip:text` (the mechanism every
other row in that batch used) has no defined effect on it. A working precedent already exists —
`sgs_svg_stroke_gradient()` (`includes/helpers-svg-gradient.php`), which `sgs/icon` already uses
for exactly this shape (an SVG `<linearGradient>` + `stroke:url(#id)`). Needs a new colour-gradient
attribute wired onto `nav-menu`'s burger icon through that existing function — not built.

**Trigger:** the colour track resuming general gradient rollout work, or an operator request for
a gradient burger icon specifically.

### P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL — two decisions the consolidation track was waiting on
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-08-30

The consolidation track (Phase 4, closed) flagged two decisions as owed by the client-controls
track: (1) whether the sticky-sidebar pattern is already solved by the accordion (their own
evidence said so — RE-MEASURE before building anything new, don't trust the old claim); (2) the
band-replacement model, described as "Task 1 by another name" (Task 1 = the container
width/`contentWidth` model, D725/D726, already closed). Neither decision was touched by the
2026-08-30 colour-standard residuals close-out (D898) — that work was border controls, deploy,
and the scatter-detector, unrelated to either question. Full prior context:
`memory/session-2026-08-30-5.md` (archived client-controls track section).

**Trigger:** whoever picks up sticky-sidebar or band-layout work next.

### P-BOX-SHAPE-WIDTH-GATING — Width/MaxWidth/MaxHeight/MaxWidthPercent have no disclosure rule
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-09-02

`box-shape` atom's `requires` field gates `Height`/`AspectRatio` on `MediaSizing`, but the newly
wired `Width`/`MaxWidth`/`MaxHeight`/`MaxWidthPercent` bases have no gating rule at all — they
always render regardless of sizing mode. Not a bug (nothing currently reads a "should be hidden"
signal for them), but worth a decision once a real block adopts this atom and an operator can
judge whether e.g. `MaxWidth` genuinely makes sense alongside `MediaSizing:ratio`. Flagged by the
implementing agent rather than guessed at. `box-shape.control.js` / `MediaBoxShapeControls.js`.

**Trigger:** whoever wires `box-shape` into a real block (Wave 5-7) and can judge the combination
against a live control. ⚠ **NOW ACTIONABLE (2026-09-04)** — `sgs/hero` adopted the atom this
session (C19 item 3, commit `7d0954776`) but the wiring pass didn't add width-gating rules; the
judgment call this entry asks for is still unmade. Hero is a live control to judge it against.

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

### P-L4-PER-ELEMENT-EXTRACTION-FOLLOWUPS — duplicate residual marker pairs weaken idempotent re-clone
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-10

When a block emits both a root residual (D289) and a per-area residual (D290), `sgsCustomCss` carries two `SGS-CONVERTER-RESIDUAL` marker pairs. Harmless in output (`custom-css.php` emits verbatim) but it weakens the "idempotent re-clone replace" claim, because no consumer does marker-delimited replacement yet — `converter/services/assembly.py:243` still documents append-after-existing behaviour.

**⚠ The entry's other item is MOOT (verified 2026-07-27):** the claimed `notice-banner textFontSize` dead-write does not exist — `textFontSize` is absent from that block's `block.json` AND `render.php`. Do not go looking for it.

**Trigger:** a per-element-extraction refinement pass. Low priority.

### P-MEGA-BLOCKS-MISSING-FROM-CONTAINER-ROSTER — three mega blocks absent from the container-wrapping roster
**Status:** OPEN · **Bucket:** pipeline · **Parked:** 2026-07-28

`/sgs-update` Stage 11 (`sync-container-wrapping-blocks.py`) WARNS: detection finds `sgs/mega-panel` (section-kind) plus `sgs/mega-aside` and `sgs/mega-group` (content-kind) as container-wrapping blocks, but they are absent from the script's expected ground-truth roster, so the sync fails closed before `--apply` (correct behaviour; diffs at `pipeline-state/container-inheritance-sync/2026-07-28/`). Declaring them is a composite-mirror scope statement (D152 lineage), not a mechanical edit — which is why it is parked rather than patched.

**Trigger:** next Spec-36 session or the next full `/sgs-update` — confirm each mega block's KIND, add to the expected roster, re-run Stage 11 clean. Owned by Track 2.

### P-PAGE8-DISCREPANCY-REGISTER / P-PAGE8-QC-BATCH-9 — page-8 clone-fidelity visual defect registers
**Status:** PARTIAL · **Bucket:** pipeline · **Parked:** 2026-07-06 / 2026-07-11
**Also known as:** P-PAGE8-QC-BATCH-9

Two overlapping Bean-reported visual-QC defect registers against the live page-8 clone, several defects already fixed and landed in each. Bean's standing instruction for both: root-cause each defect to a small number of UNIVERSAL causes (most trace back to the "hardcoded default overriding a faithfully-absent draft value" class), fix as a batch grouped by shared cause, never piecemeal.

**Remaining defects (deduplicated across both registers):** black borders (partially fixed — safecss/border-colour transfer), card equal-height (partially fixed), button preset/width/hover divergences (ghost-button underline-on-hover, ghost-button colour resolution — tracked separately at `P-DRAFT-CSSVAR-COLOUR-RESOLUTION`), component-injected defaults (option-picker tick mark and pill width, label-highlight width, info-box margins, disclaimer box styling, emoji size, trustpilot bar height), brand-section spacing/line-height (verify it isn't a separate injected margin before attributing to the theme base), and the inline-styles-architecture question (distinguish legitimate scoped `<style>` from genuine inline `style=""` before changing anything). Precondition: page 8 needs re-cloning first, since its current baseline pre-dates several fixes already landed.

**Trigger:** needs the LIVE-BROWSER-GATED treatment (a live QC session, not a static re-audit) — re-clone page 8 first, then re-triage what's actually still visible against the current engine.

## Framework: blocks, theme, specs

### P-MEDIA-ALIGNMENT-SHARED-CONTROL — `alignment` duplicated ad hoc across unrelated blocks
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-09-01

Found while auditing whether `sgs/media`'s remaining controls all came from shared/atom sources
(D914): `alignment` is hand-rolled separately in `sgs/media`, `sgs/multi-button`,
`sgs/feature-grid`, and `sgs/separator` — same control, four copies, never standardised. Not part
of the media-atom system (it isn't a media-specific concern), and not in scope for the
client-controls track. A smaller, separate unification: one shared `alignment` control,
4 adopters to migrate.

### P-DETECTOR-FIRST-COMMIT-GATE-THRESHOLD-HOLE - a component rollout sharing 0 lines is invisible
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-08-30

`detector-first-commit-gate.py`'s `MIN_SHARED_LINES = 3` threshold does not catch every
component rollout — verified against C19's real rollout commit `1612c7b1e`: gate 1 (6 files
touched) passes, gate 2 (1 shared line vs 3 required) stops it. A rollout that shares ZERO lines
would be equally invisible, so raising or lowering the threshold treats the symptom, not the
cause. Not fixed because it is a shared PreToolUse hook, nobody has priced the false-positive
cost of a stricter gate, and a gate that fires on every multi-file commit gets bypassed
reflexively and then protects nothing. Needs a design gate from Bean, not a patch — whoever
builds it should add a fixture from `1612c7b1e` to `--self-test` (the current self-test proves
the gate CAN fail, not that it can see this specific case).

**Trigger:** Bean design-gate session on shared-hook enforcement, or the next rollout this gate
should have caught and didn't.

### P-PARTICLE-TRAIL-VARIATIONS - two further trail looks, post-launch
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-08-27

Owner asked for two more FR-38-32 trail looks after seeing the effect working live for the first
time. Neither is a current task — he set the timing himself: **feature extension AFTER the theme
launches.**

1. **Sparkler** — sparks thrown off a burning point, emitted radially/scattered, rather than
   trailing behind the pointer along its path. Distinct from the existing `sparks` preset.
2. **Continuous connected trail** — a snail-like ribbon that still FADES like the current trail but
   stays visually CONNECTED to the pointer at all times, instead of resolving into discrete dying
   particles. ⚠ Likely NOT a fourth preset of the current engine: `particles.js` is a pool of
   short-lived sprites, and a continuous stroke is a different primitive. Settle that at its design
   gate rather than assuming the engine stretches.

Recorded verbatim because an ask held only in conversation drifts — `floating-objects` spent seven
weeks blocked behind a design gate for an effect the owner never asked for (D839).

**Trigger:** theme launch complete, and the owner raises trail variations again.

### P-OVERLAY-MASK-SHAPE - a mask/shape for the background overlay
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-08-22

Let the overlay be MASKED to a shape (`mask-image` / `clip-path`) rather than always
filling its element as a rectangle. Bean's idea, 2026-08-22, explicitly POST-LAUNCH.

Cheaper than it sounds, and the reasons are structural rather than optimistic:
- The overlay already renders as its OWN scrim element with its own declaration set,
  built in ONE place (`sgs_overlay_decls()` / `sgs_overlay_decls_for()`). A mask is one
  more declaration on an element that already exists - no new DOM, no new selector, no
  new state plumbing.
- `clip-path` / `mask-image` are ALREADY used in this tree (before-after,
  google-reviews, mega-panel render.php; audio, before-after style.css), so the
  technique is not novel here.
- It composes free with what already exists: masked gradient overlays, masked hover
  states, per-device masks all fall out of the existing overlay contract.

⚠ THE COST IS THE SHAPE LIBRARY, NOT THE CSS. `ShapeDividersPanel.js` exists but a scan
found NO reusable preset list inside it, so shapes must be sourced or authored, plus a
picker UI. Size this from the preset work, never from the CSS plumbing - the plumbing is
the small half.

⛔ Do NOT fold this into the five-variant colour-helper rollout. That work makes existing
capability installable; this ADDS a capability. Mixing them makes a regression in either
one unattributable.

**Trigger:** post-launch, once the five colour variants are adopted across the block
roster and the inspector surface is stable.


*61 open entries (re-derived 2026-07-31 from a `**Bucket:** framework` count across the whole file — entries with this bucket value are not all physically grouped under this heading).*

### P-9 — Remaining bucket-2 blocks + timeline rework
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-05-07

`sgs/button` grouping shipped (`270cd995`/D146). `sgs/testimonial-slider` is also already shipped
(strike it from the original gap-candidate table). Genuinely open: `sgs/empty-state` block,
`sgs/toggle` block (neither directory exists), plus the `sgs/timeline` rework — UNPARKED
2026-08-27 (`19c52bc7c`, "unpark the timeline connector"); it is no longer a parking entry, so
this line no longer cites one.

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

### P-COLOUR-PANEL-TRACK-B-SHARED-WRAPPER — migrate the shared-wrapper-owned colours onto SgsColourPanel
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-08-15

Track A (33 blocks' own custom colour attrs migrated onto `SgsColourPanel`) is COMPLETE (commit
`f6f3c033`, wave 2 colour-panel rollout). Track B is the remaining slice: the colours owned by the
shared `ContainerWrapperControls.js` rather than by each block's own attrs — `container`,
`cta-section`, `hero`, `trust-bar`, `site-header`, `site-footer`.

⚠ **Re-scoped 2026-08-16 (D626/D633) — NOT a standalone session any more.** Track B merges into the
shared-wrapper decomposition initiative's step 6 (same file, same 6 blocks, Bean-ruled to avoid two
sessions editing `ContainerWrapperControls.js` independently). Do not schedule this as its own
session — it ships as part of that initiative's step 6, which also needs a design gate first (which
blocks expand toward full composite-mirror compliance) and a hard-dependency PHP wrapper refactor in
the same commit. See `LEDGER.md` "Stream 1 — Wrapper decomposition" and
`~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 step 6.

**Trigger:** superseded — triggers alongside wrapper-decomposition step 6, not independently.


### P-DRIFT-AUDIT-BLIND-TO-DECLARED-BUT-WRONG-ELEMENTS — the audit only catches UNDECLARED names, not wrong ones
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-08-15

**Residual scope only — the hero instance that exposed this is FIXED** (2026-08-16, same session:
all three `object-position` attrs traced in `render.php` to one node `.sgs-hero__split-image`, the
two false element claims removed; Bean's call was "get rid of the fake names and keep the real one").

What remains is the systemic hole that let it hide: `audit-css-element-drift.py` only detects
*undeclared* element names. A value that is **declared but wrong** passes clean — which is why one
CSS property carrying three different `css_element` names across its own tier variants survived
until it was found by hand in review. **"Zero orphans" is a floor, not a census.**

**Trigger:** extend the audit to cross-check each `attrMap` claim against the selector its attribute
actually emits to in `render.php`, rather than only checking that the name is declared somewhere.
Would have caught the hero case automatically.

### P-FLOATING-UI-BOTTOM-BARS — extend Spec 18 Floating UI to persistent bottom bars
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-07-26

Research-backed conclusion: persistent bottom CTA/cart/sale bars belong in the existing Spec 18 Floating UI layer (which today only holds back-to-top + reading-progress), not as sticky footer rows. Key build constraints for whoever picks this up: build one shared `position:fixed` bottom stacking container first rather than per-component z-index; treat a cart bar and a promotional bar as different classes (navigation/one-transaction bars are legitimate persistent chrome, promo bars must be small and dismissible); use `env(safe-area-inset-bottom)` (note `dvh` does not fix iOS bar occlusion, it's a different problem); and add the bottom-edge equivalent of SGS's existing top `scroll-padding` guard (WCAG 2.4.11).

**Trigger:** needs its own design gate before any build; not a blocker for the Spec-37 sticky-header work.

### P-HEADER-SIMPLICITY-FINDINGS — operator-simplicity test failed; 2 findings + the blind-tester arm still owed
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-07-26

The FR-37-26 automated-proxy simplicity test failed on drawer content (since addressed — `sgs/nav-menu` now warns and one-click-fixes a burger with no panel to open). RESIDUAL SCOPE, after the 2026-08-19 header-completeness session:

1. **Canvas-click selection — STILL OPEN.** Selecting the header block by clicking in the canvas is a hidden blocker; it only selects via List View. Untouched by that session.
2. **The blind-tester arm — STILL OPEN, and it is the authoritative half.** A real non-coder, screen-recorded, has never been run. The automated proxy is not a substitute.
3. ~~The Settings tab shows ~7 default-visible controls against a roster of 2~~ — **SETTLED 2026-08-19, not by reordering.** The "~7" was measured by a detector that counted a composite mount as ONE row without opening it; once that was fixed (Task 4, `6c3ec1b0`) the real figure is **4**, and Bean ruled the re-measured set IS the ruling: header 4, footer 2, header-row 8, footer-row 8. The ≤3 is a DEFAULT, not a ceiling (P2 §5), the detector is advisory, and `SgsColourPanel` is correctly not counted (it is the standardised colour panel; its picker is a popover, not a settings control the cap governs). Nothing to reorder on the header — do not re-open this from the old number.

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

The no-inline block contract is fully met at the block level, but **4 pattern files** still use core `wp:heading`/`wp:paragraph`/`wp:list` blocks (MEASURED 2026-08-07: `footer-columns.php`, `footer-informational.php`, `framework-footer-default.php`, `pricing-columns.php` — this entry previously said "the footer and ~40+ other pattern/part files", which was ~10x the real remaining scope). WordPress core inlines its own styling supports onto those blocks — leaking inline styling into SGS pages even though no SGS block is at fault. Bean's directive: SGS patterns must be built from SGS blocks. Each core heading/paragraph must be mapped onto the equivalent SGS block's attribute schema (not a find-replace), then each pattern re-verified live at three breakpoints.

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

### P-SITE-FOOTER-ROW-ALIGNITEMS-DEFAULT-MISMATCH — block.json default isn't a valid control option
**Status:** OPEN · **Bucket:** framework · **Parked:** 2026-09-03

`sgs/site-footer-row`'s `alignItems` attribute declares `"default": "top"` in block.json, but its
own `VERTICAL_ALIGN_OPTIONS` control list only has values `start`/`center`/`end`/`stretch` — `top`
isn't valid CSS for `align-items` and isn't one of the control's own options. Found during a
`/qc-council` pass on unrelated work (2026-09-03), confirmed pre-existing. `alignItems` isn't read
by literal name in this block's own render.php — it goes through the shared
`SGS_Container_Wrapper`, same pattern as hero's grid/flex attrs — so the practical effect on an
untouched/reset instance hasn't been measured.

**Trigger:** Next time this block's Alignment & grid panel is touched. Fix: align the block.json
default to `'start'`, or add a `top` option to `VERTICAL_ALIGN_OPTIONS` — whichever matches the
block's actual intended default visually.

### P-SPEC37-OPEN-RESIDUALS — Spec 37 coverage-matrix residuals
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-21

Five smaller open items from the Spec 37 coverage matrix: (a) the skip-link regression contract needs a successor statement in the FR-37-31 retirement; (b) the 3 layout starter variants fold into FR-37-8; (c) FR-S5-3's non-carried WP-CLI commands need a decision on what happens to the rest of the set; (d) the FR-37-12 responsive width set is missing the 320–374px band; (e) Spec 17's prose-only REST capability-gating content needs restating under the FR-37-14 "attribute shape frozen" guardrail.

**Trigger:** alongside the FR-37-31 retirement work.

### P-SPEC37-PER-SITE-DECLIENT — per-site header/footer content authoring (framework de-client complete; real branded content pending)
**Status:** PARTIAL · **Bucket:** framework · **Parked:** 2026-07-22

The framework carries no client data any more (the client-named pattern file was deleted) and the mechanism for authoring each site's header/footer as CPT posts is proven on both live sites with generic proof content. What's left is authoring the REAL branded per-site content, which is deferred to the Spec 33 Part 2 cloning pipeline rather than being hand-built.

**Trigger:** next session Task 1; blocks full FR-37-6 closure and the Indus deploy.

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

### P-PRODUCT-PAGE-REDESIGN — product page design does not line up with the cloned draft
**Status:** DEFERRED · **Bucket:** framework · **Parked:** 2026-06-14

Bean's observation (D226): the product page design does not line up with cloning the draft product
page. Specifics — the Trustpilot review block renders "stupidly large", and the content width is
"really really tight unnecessarily" (ties to the Spec 01 contentSize 780 finding). Bean-sequenced:
AFTER clone-fidelity closes.

**Trigger:** a post-fidelity design pass.

## Tooling, scripts, skills + docs

*22 open entries (re-derived 2026-07-31 from a `**Bucket:** tooling` count across the whole file — entries with this bucket value are not all physically grouped under this heading).*

### P-BATCH-GA-14-SKILLS — Batch gap-analysis on 14 WP/SGS skills
**Status:** OPEN · **Bucket:** tooling · **Parked:** unknown

Run `/batch-gap-analysis` on the 14 WP/SGS skills revised in Phase 7. The stated trigger ("after
P-11-M9 ships") cannot fire — `P-11-M9` was archived as superseded by Spec 22, itself now folded
into Spec 31 §13, and G1-G5 are already closed. A decision is needed on whether Spec 31's
production status satisfies the trigger's intent, or the trigger should be re-anchored to a live
status signal — do not run before that decision, and do not wait forever on the dead milestone
name either.

**Trigger:** Bean decision on re-anchoring the gate, then run.

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
