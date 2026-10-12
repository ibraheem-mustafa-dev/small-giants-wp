---
doc_type: plan
title: "Clone coverage foundation: every framework capability recognised and cloned, proved by a failing test"
spec: .claude/specs/48-CLONING-SYSTEM.md (§10 value matrix, FR-48-47, FR-48-48, FR-48-77) and .claude/specs/38-SGS-MOTION-SYSTEM.md
created: 2026-10-12
status: approved (Bean, 2026-10-12: option A), not started
---

# Clone coverage foundation

**Purpose.** Bean's requirement is that Spec 48 recognises and clones everything a draft can hold and every piece of functionality the SGS framework offers. Spec 48 was written in one direction only, from the draft in: its §10 value matrix lists the kinds of value a draft holds, and its Motion (row 11) and Behaviour (row 12) rows name "presets" and "SGS features" without a list. No document ever enumerated the framework's capabilities and asked how each is recognised and cloned, so every step closed on done-whens that could not fail for an unlisted capability. This plan makes coverage a machine check instead of a memory: a generated capability inventory, a coverage map, and a test that fails while any capability has no clone path or approved exclusion.

**Evidence (five coverage audits, session C, 2026-10-12).**
- Block settings: 13,304 attributes on 219 blocks; on the 97 `sgs/*` blocks, 5,746 are styling (covered by calibration and Fill) and 7,051 are not. Uncovered families: carousel behaviour (autoplay, speed, dots), accordion open state, layout and variant modes without a CSS property, media (background video, Lottie, Ken Burns), icons, product and collection data, parallax, click effects, conditional display. 6,524 of the 7,051 have no description in the framework DB, so no tool can know what a mode means.
- Effects and motion: entrances are covered; entrance stagger is always `null` in the inventory, the entrance trigger has no path, 16 of 22 `fx_effects` have no recogniser even under FR-48-77, and no writer sets an effect's own parameters. Hover tilt, border accent, whole-card links and responsive hide toggles have no path.
- Behaviours: intake records mechanisms (handler, timer, observer) and names surfaces by regex on state and component names, but has no behaviour-identification layer: a draft's timer advancing an index over an `sc-for` is never identified as "carousel, autoplay 5 s, loop, dots". Tabs, counters, countdowns, sticky header, notice banners, table of contents, filters, cart and modal triggers get their block with default options.
- Surfaces and site: no path for search, SEO meta, cookie consent, dark mode, popups and floating CTAs, booking, map embeds (two on Indus), newsletter signup, the 404, search and blog templates, or form conditional fields, file upload, spam protection and consent; the site-build script (FR-48-55) is not built.
- What a draft can hold: video and third-party embeds, `<picture>`, container queries (their conditions are dropped by `lib/intake-inventory-css.mjs::cssBlocks`), native `dialog`/`details`/popover, uncommon input types, scroll-driven CSS animation, dark mode, canvas and WebGL and animated SVG are not seen at all; 11 of 19 construct-registry kinds have no reader.

## Phases

### Phase 0. Standardised motion system (setup before the motion parts of this plan)
- [x] **0.1 Review** (done 2026-10-12, session C): a QC council of the current hover, entrance and fx implementations found fixed presets hiding the real variables, whole-block targeting only, about six reveal and stagger systems and seven hover systems with three incompatible data shapes, no per-device motion values, no usable token layer, flat-order stagger, and a resolver that cannot write a measured duration. Research (research council, gap-analysis C 3.25 with every C+ fix applied): `.claude/reports/2026-10-12-motion-system-research.md`.
- [ ] **0.2 Design** (brainstorming, research council, GitHub research): Bean's target is one standardised panel per motion type (hover, entrance and reveal, motion fx) on every compatible block; an effect type per element, each element customised on its own; picking a type reveals modular controls for every variable a draft can hold (for a fade: direction, distance, duration, delay, easing curve, optional presets); the same controls define site-wide motion tokens; container-level orchestration sets children's motion with an optional stagger and an order (for example row first, left to right). The current preset-heavy model is the problem: it is close to the banned hard-coded setup. Scope (Bean, 2026-10-12, confirmed against the DB): colour and shadow hover VALUES are already compliant (per-element `<slot>ColourHover` and per-element hover shadow settings with a `css_property` and `css_state='hover'`, set through the shared colour and shadow controls' hover state, calibrated and clone-writable) and stay as they are. The redesign owns hover effects (transform, filter, opacity, lift, tilt, zoom), entrance and reveal, motion fx, and the transition timing of every hover, which today is one duration and easing pair per block. `shadowLiftOnHover` (22 blocks) and the hover extension's `sgsHoverShadow` (8 blocks) are lift effects with no CSS property that overlap the compliant hover shadow, so they fold into the redesign; `shadowHoverColour` vs `shadowColourHover` naming is tidied in the same sweep.
- [ ] **0.3 Spec and build:** a Spec 38 rewrite and its plan, then the build. Phase 1 may run beside it, with every motion family in the coverage map marked as waiting on Phase 0 instead of mapped to controls that will be replaced.

### Phase 1. Capability inventory and the failing test (one session)
- [ ] **1.1 Framework inventory.** `scripts/computed-route/capabilities.mjs` generates `data/capabilities.json` from the framework DB (read-only) and code: every block setting grouped into capability families (by role, type, enum and extension source, never a hand-written list), every extension and `supports.sgs` key, every `fx_effects` row and animation preset, every post type, template and template part, every plugin's client-facing feature, every theme-snapshot key.
- [ ] **1.2 Draft inventory.** The same command lists what a draft can hold: every HTML element, CSS at-rule and property family, and runtime construct kind, from the Claude Design handoff method and the web platform; intake raises a review row for anything it sees that is not covered ("seen but unsupported"), so nothing is dropped silently.
- [ ] **1.3 Coverage map.** `data/clone-coverage.json`: per capability, how it is recognised (construct kind or recogniser ID), written (writer), checked (check ID), or an exclusion Bean signed off (reason and date).
- [ ] **1.4 The gate.** `tests/clone-coverage.test.mjs` fails while any inventory entry has no coverage entry, and when a coverage entry names a recogniser, writer or check that does not exist. MUST FAIL cases: a planted new block setting, a planted draft tag.
- [ ] **1.5 First run is the definitive gap list.** Commit it; Bean signs the exclusion list once (candidates: the client-notes and accessibility plugins, conditional display by login or date, patterns and style variations).

### Phase 2. Spec 48 in both directions (one session, needs Phase 1)
- [ ] Rewrite §10 so the value matrix has the framework-out direction; replace rows 11 and 12 with the generated coverage map; fold FR-48-77 into a recogniser FR family; add an FR per uncovered family with a done-when, all sequenced in this plan.

### Phase 3. Behaviour semantics in the framework DB (framework lane, needs Phase 1)
- [ ] Every behaviour and content setting gets a machine-readable meaning (what it does, its trigger, its parameters) seeded from `block.json` by `sgs-update-v2.py`, so recognisers map by query, never by a hand-written list (R-31-1).

### Phase 4. Recognisers in waves (needs Phases 1 to 3)
- [ ] One recogniser framework: a mechanism signature, read from the re-derived inventory and sampled styles, identifies a behaviour and its options and maps it to an SGS setting by DB query, or raises a named gap. Waves follow the gap list, Indus needs first. Motion and effect recognisers target the standardised motion system from Phase 0, so they wait for it rather than map onto today's presets.

## Sequencing with Indus
- The Indus build (`.claude/plans/2026-10-11-spec48-indus-build.md`) continues through step 20 (the header slice needs mostly styling and navigation).
- Step 20b (FR-48-77) is absorbed into Phase 4 of this plan. Steps 21 onwards wait for the Phase 4 waves that the Indus gap list names. Mama's Munches waits for the shop and behaviour waves.
