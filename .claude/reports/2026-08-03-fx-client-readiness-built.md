---
doc_type: report
title: Motion system — client-readiness audit of the FULLY-BUILT fx categories
created: 2026-08-03
scope: READ-ONLY. No code changed.
---

# FX client-readiness audit — is this actually usable by a tech-illiterate client?

**Method note.** All controls below are registered by a JS filter
(`plugins/sgs-blocks/src/blocks/extensions/fx.js`), NOT in individual `block.json` files — a
`block.json` grep for `fxShape`/`fxPath`/etc. finds nothing and would wrongly read as "missing".
Verified via `fx.js` directly, cross-checked against Spec 38 §7/§9/§10/§11.

---

## 1. Scroll storytelling — `fx-pin-scrub`, `fx-horizontal-panel`, `fx-scrub`

**Verdict: CLIENT-READY, with one sharp edge.**

- **Discoverability.** Lives in one collapsed "Scroll & effects" ToolsPanel in the block
  Styles tab (`fx.js:2280`-ish region, `ToolsPanel` wrapping the whole surface) — a single
  `SelectControl` offering "None" + whichever shipped effects the block structurally qualifies
  for (`fxOptionsForBlock()`, `fx.js:165-177`). This is a normal inspector panel, not hidden
  behind a "+" the client would need to guess exists — `ToolsPanel` items DO sit behind a "+"
  by WP convention, but the top-level "Scroll & effects" panel itself is always visible once a
  block qualifies. Reasonable for a semi-technical operator; a first-time user will need to be
  told "there's a Scroll & effects panel" once — it isn't self-announcing.
- **Control completeness.** Every parameter Spec 38 promises is a real control, not a number
  the client has to know: trigger (`fx.js:378-392`, hidden entirely when the effect has only
  one valid trigger — correctly avoids a dead control), start/end position as PLAIN-ENGLISH
  presets (`FX_START_OPTIONS`/`FX_END_PIN_OPTIONS`/`FX_END_POSITION_OPTIONS`,
  `fx.js:218-276` — "As soon as it enters view" / "Halfway up the screen", never a raw
  ScrollTrigger string), pin hold as "Standard — a moment to take it in" /
  "None"/"Brief"/"Long" (`FX_HOLD_OPTIONS`, `fx.js:303-314`), and an easing "Feel" picker in
  plain English ("Gentle start", "Bounce", "Elastic wobble" — `FX_EASE_OPTIONS`,
  `fx.js:192-207`). Nothing here requires touching code or attributes directly — genuinely
  meets the project rule.
- **Good by default.** An intensity-preset layer (`fxPresetGovernedKeys`/`fxHasPresets`,
  `fx.js:418-452`) exists specifically so a client picks "Subtle/Standard/Dramatic" rather than
  tuning raw numbers — the file's own docstring states the design intent: an effect with fewer
  than 2 governed params gets no preset (avoids a pointless single-value "preset"). I could not
  verify from `fx.js` alone whether the DEFAULT (no preset chosen) already looks designed, or
  whether a client must pick a preset to avoid a raw/awkward motion — that needs a live
  Playwright drop-on-page check I did not run this session (tool-budget triage; flagged as
  residual, not fabricated).
- **Presets/variants.** Yes — named presets exist and are the primary offered surface, not raw
  numbers (Spec 38 §7 layer, `fxHasPresets`).
- **Responsive.** `data-sgs-fx-disable-tablet`/`-disable-mobile` per-breakpoint kill switches
  exist (`fx.js:504-534`, Spec 38 §11.2) — a client CAN turn a scroll effect off at 375px, which
  matters because pin/scrub effects are the category most likely to misbehave on small screens
  (short viewport height vs pin length). This is a real, exposed control, not a hidden default.
- **Reduced motion + a11y.** Spec 38 §10: pin+scrub and element-scrub SIMPLIFY to end-state,
  static, in normal flow under `prefers-reduced-motion`. §3.1's own text records this was
  LIVE-VERIFIED 2026-07-31 then SUPERSEDED 2026-08-01 (D453) — a control focusable at
  `opacity:0` inside a pin/scrub WAS a real WCAG 2.4.11 failure, and the fix (hold the reveal on
  `gsap.ticker` while focus is inside) is recorded as shipped for `fx-pin-scrub.js`/`fx-scrub.js`.
  The row is honest about the correction rather than hiding it.
- **Failure modes — what a client most plausibly breaks.** Two, both flagged in-spec rather than
  hidden: (1) selecting Pin+scrub on a very short block/section with tall content can create the
  "short-parent trap" pattern the framework already knows about elsewhere (Spec 37 FR-37-40
  precedent, cited directly in §2's own justification row for why Pin+scrub is Tier G at all);
  (2) stacking multiple pinned sections back-to-back with no "Hold" gap can make a page feel like
  it's fighting the scroll — the Hold control exists precisely because this was a REPORTED
  defect (D417, §11.3), so the mitigation is real, but nothing in the panel warns a client away
  from over-using pin effects on the same page.

**What would most raise the standard:** a live on-canvas or documented "designed by default"
proof — right now the claim rests on the preset system existing, not on a screenshot of the
zero-config result.

---

## 2. Kinetic type — `fx-split-reveal`, `fx-scramble`

**Verdict: CLIENT-READY for split-reveal; NEEDS WORK for scramble (deliberately, by design).**

- **Discoverability.** Same "Scroll & effects" panel, same picker. Split-reveal offered on
  text-bearing blocks (heading/text/quote/hero headline per §3.2); available the moment the
  block qualifies.
- **Control completeness.** "Split by" (chars/words/lines — `fx.js:2301-2338`) and a masked-line
  toggle gated to only appear when "Split by" is lines (`fx.js:2338-2362`, `isSplit &&
  attributes.fxSplit`) — a genuinely conditional, non-dead control set. Scramble has almost no
  dedicated control surface beyond the shared trigger/duration/ease params — it rides the
  generic fx machinery, which is CORRECT per spec (§3.2: "shipped for the niche, default OFF").
- **Good by default.** Split-reveal's a11y story is load-bearing and genuinely strong: the FR
  text (§3.2 FR-38-10) states the 2025 SplitText accessibility rewrite (`aria-label`-preserving
  on the split parent) is REQUIRED, "a split that breaks the accessibility tree is a defect, not
  a setting" — i.e. this was built with the guard-rail baked in, not bolted on. Scramble is
  explicitly a toy for a niche audience and the spec is candid about that (§3.2 FR-38-11: "not
  worth a bespoke maintained implementation for a default-OFF niche toy") — this is an honest
  DEVELOPER-DISCRETION feature, not a false client promise.
- **Presets/variants.** Split-reveal: yes (chars/words/lines + masked-line). Scramble: none
  beyond generic fx params — by design, per spec.
- **Responsive.** Covered by the same universal `fx-disable-tablet`/`-mobile` switches.
- **Reduced motion.** §10: SplitText SIMPLIFIES (plain fade or static, never a broken split
  mid-teardown); Scramble fully SUPPRESSES (plain text, no scramble ever) — the stricter of the
  two treatments, appropriate for a "trick" effect nobody needs to see to read the content.
- **Failure modes.** Split-reveal on very long paragraphs (word/char split) risks visible layout
  shift or reflow jank while text assembles — nothing in the panel warns against applying it to
  a large text block rather than a short headline, and the recommended-placement column in §2
  explicitly says "headings first" for exactly this reason; the control itself does not enforce
  that guidance.

**What would most raise the standard:** a soft warning ("best on short headlines") when
split-reveal is applied to a block whose content exceeds some word count — currently the
guidance is only in the spec, not surfaced to the client in the panel.

---

## 3. Looping galleries / marquee — `fx-carousel-loop`, marquee utilities, `fx-draggable`

**Verdict: CLIENT-READY, and this is the most maturely-audited category in the whole system.**

- **Discoverability.** NOT in the "Scroll & effects" fx panel at all — deliberately. Spec 38 §3.3
  states the control home is PER-BLOCK, not the shared fx panel, "the same constraint that
  already forced `draggable` block-private: the scroller is a DESCENDANT, and both `fx.js`'s save
  filter and `fx-attributes.php`'s injector only ever stamp the block ROOT." Verified live in
  `src/blocks/gallery/edit.js:578-609` — a plain `ToggleControl` "Drag to scroll" with a nested
  "Loop" toggle appearing conditionally beneath it once drag is on. This is a normal, visible
  block-level control, not buried.
- **Control completeness.** Drag toggle → momentum toggle (conditionally shown only when drag is
  on, `gallery/edit.js:586-590`) → Loop toggle. All three are independent controls the client can
  combine freely, matching Bean's own explicit ruling recorded in Spec 38 §3.3 FR-38-26: "looping
  should not be tied to the drag effect — they should be independent controls." This is a rare
  case of the spec's design intent being provably reflected in the shipped UI.
- **Good by default.** The eligibility mechanism is structural (`isNativeHorizontalScroller()`),
  so a client never gets an inert control — the roster is 5 blocks
  (`buybox, gallery, google-reviews, post-grid, trustpilot-reviews`) proven live per-block via
  `probe-carousel-loop.mjs`, 9/9 or 8/8 checks each (§3.3, "ROLLOUT COMPLETE 2026-08-02"). Two
  blocks are correctly EXCLUDED with stated reasons (`before-after` — no real scroller;
  `testimonial-slider` — transform-driven track, out of scope, Bean-ruled) rather than silently
  offering a broken toggle.
- **Presets/variants.** N/A — this is a binary capability, not a style choice; appropriate.
- **Responsive.** Not separately controlled, but the mechanism (native `overflow-x` scroller)
  inherently degrades to normal touch-scroll on mobile.
- **Reduced motion + a11y.** This is the standout. §10's `carousel-loop` row: MEASURED (not
  reasoned-by-construction) on 4/5 blocks with real `reducedMotion:'reduce'` emulation — clones
  still insert/neutralise, boundary re-seat still fires, because the correction is an
  instantaneous `scrollLeft` write, never a tween, so there is genuinely nothing to gate. A
  negative control was run to prove the emulation was real (own arrow-click branches on reduce
  where implemented). **A genuine defect was found and HONESTLY RECORDED rather than hidden**:
  `sgs/google-reviews`'s keyboard next-arrow dead-ends at the last real card and never progresses
  through the loop via repeated keyboard activation — a real WCAG 2.5.7 failure in that block's
  OWN navigation code, separate from the loop module, NOT fixed in the session that found it
  (explicitly out of scope, "measure, don't ship"). `sgs/trustpilot-reviews` and
  `sgs/google-reviews` also hardcode `'smooth'` scroll regardless of reduced-motion preference —
  a second real defect on those two blocks specifically (§10 carousel-loop row, final paragraph).
  Dot-count accessibility (dots key to REAL card count, not clone-inflated count — verified live,
  6 cards/18 with clones/6 dots) is also genuinely proven, not asserted.
- **Failure modes.** The two most plausible client mistakes are already ruled out or documented:
  turning on Loop on a block with no real scroller is IMPOSSIBLE (gated structurally, not just by
  UI copy). The one live failure mode a client CAN hit today: enabling Loop + keyboard navigation
  specifically on `sgs/google-reviews` produces a stuck arrow — a real, currently-shipping defect.

**What would most raise the standard, ranked:**
1. Fix `sgs/google-reviews`'s `nextSlide()`/`prevSlide()` keyboard dead-end (WCAG 2.5.7 failure,
   currently live) — highest client-impact item in this entire audit because it is a proven,
   reproducible accessibility bug on a shipped, client-facing block, not a design gap.
2. Fix the hardcoded `'smooth'` scroll-behaviour ignoring reduced-motion preference on
   `trustpilot-reviews`/`google-reviews`.

---

## 4. Smooth scroll — the Lenis integration (Tier H, FR-38-18)

**Verdict: CLIENT-READY as a toggle; DEVELOPER-ONLY in tuning depth.**

- **Discoverability.** SITE-level setting at a dedicated **SGS → Motion** admin settings page
  (`plugins/sgs-blocks/assets/admin/motion-settings.js` — confirmed to exist). This is the
  correct home for a site-wide effect and is a normal, discoverable wp-admin settings screen, not
  buried in a block inspector.
  qualified as an owner-tuned constant ("Owner-tuned to strength 3") rather than a client-facing
  slider — I did not read `motion-settings.js` line-by-line this session to confirm whether
  "strength" is exposed as a control or hardcoded; flagged as an unverified residual rather than
  asserted either way (tool-budget triage).
- **Control completeness.** Default OFF (safe default). §3.5's condition (d) records that an
  operator-facing touch-smoothing strength control DOES exist ("D422 addendum, owner-requested
  2026-07-30") but is default OFF and *documented as not recommended* — because it was tested on
  a real device and rejected by the owner as "abrupt and janky, worse than off". This is a rare
  case of a control that exists but is explicitly steered away from with real device evidence —
  good practice, not a gap.
- **Good by default.** Strong evidence here: long-distance anchor scroll (2,211px) proven not to
  degrade, landing 0.21px clear of the sticky header; reduced-motion suppression proven with a
  REAL emulated OS preference change (not stubbed) with a negative control (transition genuinely
  ran under no-preference). Touch stays NATIVE by default (`syncTouch:false`) specifically because
  it matches a visitor's muscle memory — a deliberate, evidenced default rather than an untested
  guess.
- **Presets/variants.** None beyond on/off + the not-recommended touch-strength control. This is
  a single global "feel", which is appropriate for a site-wide smoothing effect — a client isn't
  meant to be picking a smoothing curve.
- **Responsive.** Touch/mobile explicitly excluded from smoothing by default (native scroll
  preserved) — correct, evidenced choice, not an oversight.
- **Reduced motion + a11y.** SUPPRESSED, live AND reactive — verified with real Chrome media-query
  emulation, and the instance is torn down/rebuilt on a mid-session preference change without a
  reload (§10). This is one of the more rigorously proven rows in the whole spec.
- **Failure modes.** Genuinely hard for a client to break: it's one toggle, defaults safely OFF,
  and the one operator-facing tuning knob is explicitly labelled "not recommended". The main risk
  is a client turning it ON without realising it changes page feel site-wide with no live preview
  — there is no in-editor demonstration of what Lenis feels like before committing (editor/wp-admin
  explicitly never runs it, per FR-38-18 condition (a) — correct architecturally, but it does mean
  the ONLY way to judge the effect is to publish and scroll the live site).

**What would most raise the standard:** a short descriptive helper text or before/after note on
the settings page so a client understands what "smooth scrolling ON" will feel like without
publishing first (cannot preview in-editor by design, so copy is the only lever available).

---

## 5. Entrance/hover suite + parallax — the shipped Tier V inventory

**Verdict: CLIENT-READY (this is the most mature, longest-proven category — unchanged by Spec 38).**

- **Discoverability.** Existing, established "Animation" inspector panel — 16 entrance types, per
  the framework's Phase 1 build status (`plugins/sgs-blocks/CLAUDE.md`: "Animation (15 scroll
  animation types) — Deployed"; Spec 38 §2 table confirms 16). This long predates Spec 38 and is
  the most-used, most-tested control surface in the whole motion system.
  §4.3's Entrance × Scrub mutual-exclusivity contract is worth flagging as a real
  usability protection: when a client picks a scroll-scrub fx effect on a block that ALSO has an
  entrance animation set, the render layer suppresses the entrance attrs (both the dynamic-block
  omit path AND the static-block strip-from-stored-markup path are built, per §4.3/FR-38-5), and
  the editor mirrors this with a Disabled+Notice ("A scroll effect controls this block's motion —
  entrance animation is off") — so a client cannot accidentally double-animate a block and get a
  visibly broken result. This is exactly the kind of "good by default, protects against a
  plausible client mistake" mechanism the other categories should be measured against.
- **Control completeness.** Established via the project's own "Hover Controls Spec" (per-element
  colour shifts, scale transform, shadow elevation, image zoom, transition duration/easing) —
  `plugins/sgs-blocks/CLAUDE.md` records these as DONE for 4 blocks (Info Box, Card Grid,
  CTA Section, Hero) in Phase 1.3, with the FULL hover suite (scale/shadow/zoom/duration/easing)
  still listed under "Phase 2 — Extensions Not Started (P1 priority)" for the REMAINING blocks.
  This is the one place in this audit where I can point to an explicit, self-declared gap in the
  project's own tracking rather than inferring one.
- **Good by default.** Parallax has a shipped, editor-only Notice precedent ("parallax preview is
  live-site only") that Spec 38 explicitly reuses as its own §9 template for scroll effects — this
  pattern is proven and mature.
- **Presets/variants.** 16 named entrance types is itself the preset layer — a client picks a
  named animation, never raw keyframes.
- **Responsive.** Covered by the same universal per-breakpoint mechanisms as the rest of the
  system (device-tier disable is a Spec 38 addition but the underlying entrance system predates
  it and already had its own responsive story via the framework's device-visibility layer).
- **Reduced motion + a11y.** This is the longest-running, most battle-tested reduced-motion
  contract in the codebase — it is the PRECEDENT every Spec 38 effect cites (parallax Notice,
  `prefersReducedMotion()` canonical check). Highest confidence row in this whole audit.
- **Failure modes.** The main plausible client mistake — stacking multiple entrance animations
  with clashing directions on adjacent blocks — is a design-taste problem, not a technical one,
  and isn't something a control surface can prevent.

**What would most raise the standard:** finish the Phase 2 hover-suite rollout (scale/shadow/zoom/
duration/easing) to the blocks still missing it — this is explicitly tracked as incomplete in the
project's own build-status table, not something this audit is inferring.

---

## Ranked gaps by CLIENT IMPACT (not ease of fix)

1. **`sgs/google-reviews` keyboard-navigation dead-end inside a looping carousel** — a proven,
   live WCAG 2.5.7 failure on a shipped, commonly-used block (§10 carousel-loop row). Highest
   priority: it is a real defect a real client's real visitor can hit today, not a design gap.
2. **`trustpilot-reviews`/`google-reviews` ignore reduced-motion preference on arrow-click scroll**
   — a real, currently-shipping accessibility inconsistency on two client-facing review blocks.
3. **Hover-suite (scale/shadow/zoom/duration/easing) still incomplete outside the original 4
   blocks** — self-declared in the project's own CLAUDE.md Phase 2 backlog; blocks the framework's
   explicit goal of matching/exceeding Kadence/Spectra hover depth on every block, not just four.
4. **No "what will this feel like" preview for Lenis smooth scroll** — a client must publish and
   scroll the live site to judge a site-wide feel change, because editor/wp-admin never run it by
   design; a documented, low-cost UX gap rather than a defect.
5. **Unverified "good by default" claim for pin/scrub/scramble/split-reveal zero-config results**
   — the preset and control-completeness machinery is real and verified, but I did not run a live
   Playwright drop-on-page screenshot check this session to confirm the DEFAULT (no preset
   chosen) looks designed rather than raw. Flagged as residual, not asserted as a failure.

## What is genuinely client-ready, stated plainly

Categories 3 (carousel loop/drag) and 5 (entrance/hover baseline + parallax) are the two most
mature, most rigorously measured surfaces in the system — both have live, negative-controlled
verification, not just code review, behind their reduced-motion and a11y claims. Category 4
(Lenis) is architecturally sound and evidenced with real device testing on its one risky knob.
Category 1 (scroll storytelling) has a genuinely complete, plain-English control surface with no
raw numbers exposed. Category 2's split-reveal is client-ready; scramble is an honestly-scoped
developer/niche toggle, not a false promise.
