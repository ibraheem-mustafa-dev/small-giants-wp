---
doc_type: spec
spec_id: 38
spec_version: 1.0
status: active
title: SGS Motion System — the two-tier motion doctrine + the GSAP (Tier G) effects layer
created: 2026-07-29
depends_on: [31, 32, 35, 37, "02 §Animation", "src/shared/effects/ house runtime"]
decision_refs: [D406, D407, D408, D409]
---

# Spec 38 — SGS Motion System: the two-tier motion doctrine + the GSAP (Tier G) effects layer

> **Design-gate status: SIGNED OFF — Bean approved 2026-07-29, conditional on a `/qc-council`
> pass. The council ran same day (3 code-grounded raters: WP-mechanics / header-forensics /
> spec-lawyer): zero architectural refutations; 9 precision amendments applied in-text, each
> marked "(qc-council 2026-07-29)" at its site — headline ones: entrance×scrub needs STRIP not
> just omit on the static-save path; webpack externals + the template wrapper-insertion are
> NAMED Wave build tasks, not established patterns; the sticky edge rule now handles the
> per-tier tri-state (outside if sticky on ANY tier); `smooth-scroll.js` suppressed under the
> smoother; Wave B regression list gained row collapse + 2 sub-cases. Waves A/B/C are
> unblocked; each wave prompt still runs its own plan-mode + Bean R-31-13 close.**

## 0. Plain English (what this is, why it exists)

SGS animates today with hand-written vanilla JavaScript and CSS — entrances, hovers, parallax,
marquees. That layer is fast and light, but a whole class of premium motion is genuinely beyond
it: sections that pin while a timeline plays as you scroll, headlines that reveal word-by-word,
grids that fluidly re-arrange when filtered, buttery smoothed scrolling, SVG logos that draw or
morph. Competitors reach these with GSAP — the industry-standard animation engine — which became
**100% free for commercial use (including every premium plugin) when Webflow acquired it in
April 2025**. The licensing objection that parked SVG morphing (`parking.md` P-10) is dead.

This spec adopts GSAP **without overthrowing the vanilla-first house rule**. It BOUNDS that rule
into a two-tier doctrine: everything shipped today stays vanilla (**Tier V**); GSAP (**Tier G**)
is reserved for what vanilla genuinely cannot do, loads only on pages that actually use it, and
follows the same house contracts (reduced-motion, init→cleanup, fail-open no-JS rendering) as
the existing `src/shared/effects/` runtime. A page using zero Tier G effects ships **zero GSAP
bytes** — the framework's performance posture is unchanged for every existing site.

Everything here is placed deliberately: each effect has a **recommended home** (the level and
control surface where it belongs) and a **technically permitted range** (so unusual uses are a
documented choice, not an impossibility) — Bean's containment principle: contained where they
apply, never completely walled off from areas of potential.

## 1. The two-tier motion doctrine (constitutional)

> **This section is the written home of the SGS motion principle.** The one-line "vanilla JS
> only / no external libraries" statements in root `CLAUDE.md`, `plugins/sgs-blocks/CLAUDE.md`,
> `theme/sgs-theme/CLAUDE.md`, Spec 01 and Spec 02 now point here. Decision: **D406**.

1. **Tier V (default) — vanilla/CSS.** Every effect is assigned to the **cheapest tier that can
   achieve it**. Entrances, stagger, hovers, parallax (CSS scroll-driven first), marquees,
   simple keyframe motion, menu/drawer reveals, single-property scroll fades — all remain
   Tier V, exactly as built today. **Nothing currently shipped migrates to GSAP.** The Spec 36
   nav follow-ons (`P-DRAWER-BURGER-MORPH-SYNC` — store state-wiring; `P-DRAWER-TRIGGER-ANCHOR-JS`
   — geometry) are Bean-ruled NOT motion-system scope (D404) and stay the house way, untouched.
2. **Tier G (capability) — GSAP.** Reserved for what Tier V genuinely cannot reach:
   scroll-scrubbed pinned timelines, SplitText, Flip layout transitions, Draggable/physics,
   DrawSVG scrubbing, MorphSVG. **Conditionally loaded** (§4.4): a page using
   zero Tier G effects ships zero GSAP bytes. GSAP + plugins are **npm-bundled, never CDN** —
   the rule the codebase already obeys (Vivus is bundled the same way; a CDN reference is still
   banned).
2a. **Tier H (helper/utility) — a single-purpose library that is neither vanilla nor GSAP.**
   Added **2026-07-30 (D422)**, Bean-decided, when site-level smoothing moved from GSAP
   ScrollSmoother to **Lenis**. The doctrine was two-tier because GSAP was the only library in
   the bounded set; filing a non-GSAP library under "Tier G" would have made that tier mean
   "any library", which is precisely the unbounded state §1 exists to prevent. A third tier
   states the exception instead of blurring the second one.
   **Admission test — all four must hold, or it is not Tier H:** (i) the capability is real and
   Tier V genuinely cannot reach it; (ii) GSAP either cannot do it, or can only do it by a
   mechanism that damages a shipped SGS system — *the Lenis case: ScrollSmoother transforms a
   wrapper around page content, and a transformed ancestor silently stops `position: sticky`
   pinning, which is the shipped Spec 37 header*; (iii) it is single-purpose, npm-bundled, never
   CDN, and conditionally loaded on the same registry as Tier G, so a site not using it ships
   zero bytes of it; (iv) its admission is recorded as a D-numbered decision naming what it
   replaces. Tier H is a named list, not a category anyone may extend by analogy — **current
   membership: Lenis (site-level smooth scrolling) and nothing else.**
   Tier H carries the identical house contracts as Tier V and G (§1.6): live reduced-motion,
   `init → cleanup`, fail-open no-JS, bfcache teardown, Spec 32 no-inline styling.
3. **The tier assignment is an engineering judgment recorded in the §2 taxonomy** — every G
   assignment carries a "why the lower tier can't do it" justification, and a G capability whose
   V equivalent later becomes universally supported in CSS is a candidate to DEMOTE to V (the
   doctrine is a ratchet toward cheap, not toward GSAP).
4. **Answers to the three failure modes this doctrine kills:** "GSAP isn't in the stack" is now
   false — it is in the stack, bounded to Tier G. "Everything should use GSAP" is also false —
   Tier V is the default and nothing shipped migrates. **"Tier H means we can add libraries
   freely" is false** — Tier H is a closed list with a four-part admission test (§1.2a) and a
   D-numbered decision per member. Any track claiming any of the three is misquoting this
   section.
5. **Naming.** The tiers are deliberately **V/G/H**, not 1/2/3 — "Tier 1/Tier 2" already mean the
   `blocks.replaces` reverse-walk in Spec 31 Appendix B, and "tier" alone also means the
   Mobile/Tablet/Desktop device system. In prose always write "Tier V" / "Tier G" / "Tier H".
   H is for **helper** (Bean's framing, D422): a single-purpose utility admitted for one
   capability, not a general-purpose engine like GSAP.
6. **House contracts bind Tier G identically** (§5 FR-38-2): live-checked reduced motion,
   `init(el) → cleanup()`, one shared frame budget, fail-open no-JS rendering (SSR markup is the
   finished state; JS applies hidden/offset initial states only after it is confirmed running —
   the `sgs-js` gate), bfcache teardown/re-init, Spec 32 no-inline styling.

## 2. Placement taxonomy — the spine of this spec

Axes: **Tier** (V/G + why the lower tier can't) · **Level** (site / template / region /
container / block / element) · **Exposure surface** (theme settings vs inspector panel vs block
variation) · **Conditions + conflicts** · **Default** · **Recommended vs technically permitted
placement**. Nothing from the roster is dropped; §3 carries the per-capability detail.

| Effect | Tier — why not lower | Level | Exposure surface | Conditions + conflicts | Default | Recommended → permitted |
|---|---|---|---|---|---|---|
| Pin + scrub section timeline | **G** — CSS cannot pin; a sticky-based pin substitute is exactly the short-parent trap Spec 37 FR-37-40 rejected; multi-tween sequencing needs a timeline | container/section | Inspector panel on `sgs/container` + section-KIND composites | Excludes Tier V entrance on same block (§4.3); needs ScrollTrigger; editor = static end-state (§9) | off | Section-level containers → any container-equivalent (documented choice) |
| Scroll-scrubbed element timeline (multi-keyframe/staggered) | **G** — cross-browser scrub consistency; Safari stable still lacks CSS scroll-driven animations (assumption stated §3.1) | block/element | Inspector panel (fx ToolsPanel) | §4.3 exclusivity; single-property scrub stays Tier V (parallax/`--sgs-scroll-progress` pattern) | off | Any block → any element with the fx panel exposed |
| Horizontal scroll panel | **G** — needs pinning + vertical→horizontal progress mapping; no CSS mechanism | section | Block variation of `sgs/container` (+ inspector tuning) | Pins (ScrollTrigger); keyboard/a11y scroll fallback mandatory; mobile falls back to native horizontal scroll-snap | off | Top-level section → nested container (permitted, documented) |
| Scroll-scrubbed image sequence | **G** — canvas frame scrubbing; CSS cannot drive canvas | block (dedicated, NET-NEW) | New block `sgs/image-sequence` inspector | Asset-pipeline sub-scope (frame export/compression tooling — §3.1); heavy-asset warning in UI; editor = poster frame | n/a (new block) | Hero/feature sections → anywhere the block is inserted |
| SplitText reveal (char/word/line, masked) | **G** — DOM splitting with the 2025 a11y rewrite (aria-preserving); hand-rolled splitting breaks screen readers/kerning | block (text-bearing) | Inspector panel on heading/text/quote (+ hero headline) | a11y baked in (plugin rewrite); §4.3 exclusivity vs entrance; reduced-motion = plain fade or nothing (§10) | off | Headings first → any text-bearing block |
| ScrambleText | **G** — vanilla-plausible but not worth a bespoke maintained implementation for a default-OFF niche toy | block (headings) | Inspector (fx ToolsPanel, behind "+") | Default OFF, shipped for the niche; reduced-motion = suppress (§10) | off | Headings → labels/countdown digits (permitted) |
| Flip on filtered grids | **G** — same-document View Transitions snapshot the whole page (UI freeze on rapid re-filter) and give no per-item stagger/interrupt; Flip does | PAIRED block contract | Paired setting surfaced on BOTH `sgs/filter-search` and the filterable block (§3.3) | Pairing contract, not a one-off; VT crossfade is the no-GSAP fallback; Flip loads only when the pair opts in | off | filter-search × card-grid → any future filterable block implementing the contract |
| Draggable + Inertia | **G** — pointer physics + momentum; CSS scroll-snap remains the Tier V default for carousels | block (curated roster) | Inspector toggle on roster blocks (§3.3 opt-in mechanism) | Roster-gated (`supports.sgs.fx.draggable`); touch-action discipline; keyboard alternative mandatory | off | gallery/testimonial-slider/before-after/hero decorations → any block that declares the support |
| Physics2D / PhysicsProps / CustomBounce / CustomWiggle | **G** — no CSS equivalent for physics easings | N/A (flavour — inherits its host effect's level) | N/A (flavour — appears as easing/motion options inside other G effects' controls, never its own surface) | Never a standalone toggle; bundled into the consuming effect's chunk | n/a | Easing dropdown of G effects only |
| Physics canvas (throwable decorative bodies) | **G** — pointer physics + post-release momentum; no CSS equivalent (FR-38-27) | container (dedicated block, NET-NEW) | `sgs/physics-canvas` inspector | **NICHE ARTISTIC CANVAS (Bean, 2026-08-02) — deliberately NOT built for accessibility, structure, or cloning.** Operator-discretion surface; the ONE named exception to FR-38-14's never-a-standalone-toggle rule; reduced motion disables the physics while children still render static; inherits the composite-mirror rule at render time | off | Hero/section decorative layers → any container-equivalent placement |
| DrawSVG | **G** (scrubbed) — scroll-scrubbed draw needs ScrollTrigger; **load-triggered simple draw stays covered by Tier V `data-sgs-path-draw`** (not retired) | element (SVG-bearing) | Inspector on `sgs/responsive-logo`, `sgs/icon`, `sgs/separator` — each verified to render inline SVG shape geometry (`sgs/separator` conditionally, via the same `sgs_get_wp_icon()`/`sgs_get_lucide_icon()` helpers `sgs/icon` uses, when `contentMode === 'icon'`). **`sgs/decorative-image` REMOVED 2026-07-31 (D434):** it renders a raster `<img>`/video only, so no drawable geometry exists. An `<img src="*.svg">` is not drawable or morphable either — the file is an opaque image resource with no DOM access to its paths, which is precisely why `sgs/responsive-logo` inlines via `wp_kses` instead. | Retires **Vivus** (§3.4, D408); trigger = load OR scroll-scrub | off | Logo/icons/dividers → any SVG-bearing block (`decorative-image` excluded — raster/video only) |
| MorphSVG | **G** — CSS `d:path()` needs identical point counts; point-matching IS the plugin | element | Inspector, ASSET-GATED (§3.4) | Requires prepared matched path pairs + authoring guidance; revives parking P-10 | off | Icons/logos → decorative SVG anywhere (asset-gated) |
| MotionPath | **V default / G when scrubbed** — CSS `offset-path` handles autonomous path-follow cross-browser; the plugin is needed only for scroll-scrubbed path progress | element | Inspector on `sgs/decorative-image` | V variant ships without GSAP; G variant needs ScrollTrigger + MotionPathPlugin | off | decorative-image → other media blocks (permitted) |
| Smooth scrolling (**Lenis** — was ScrollSmoother, D422) | **H** — no CSS mechanism for smoothed/lagged scroll, and the Tier G option (ScrollSmoother) can only achieve it by transforming a wrapper around page content, which silently breaks the shipped Spec 37 sticky header (§4.2) | **SITE** | SGS → Motion settings page | Default OFF; disabled in editor + wp-admin; disabled under reduced-motion (live + reactive); touch left native; **no wrapper, no template change — §4.2 resolution SUPERSEDED, nothing to resolve** | OFF | Site setting only (never per-block) |
| Page transitions | **V** — cross-document View Transitions API is CSS-first, no GSAP, no router | SITE + per-template | Theme settings + per-template override | Progressive enhancement; unsupported browsers = normal navigation (defined fallback §3.5); reduced-motion = suppress | OFF | Site-wide → per-template variants |
| *Existing Tier V inventory* (entrance ×16, hover suite, parallax 3-tier, path-draw, scroll-progress, marquee, float utilities) | **V** — shipped, proven, cheap | block/element | Existing inspector panels (unchanged) | §4.3 exclusivity when a G scrub is present on the same block | as today | Unchanged |

## 3. The capability roster (nothing cut; curated defaults)

### 3.1 Scroll core

- **FR-38-6 Pin + scrub section timelines.** A section-level container (or section-KIND
  composite) pins for N × viewport-height while its children's tweens play mapped to scroll
  progress. Controls: pin length, scrub smoothing, per-child timeline position (simple
  from/to presets — full timeline authoring is NOT exposed to clients; curated presets only).
- **FR-38-7 Scroll-scrubbed element timelines.** Opacity/transform keyframes along the
  element's own viewport progress. **Boundary with Tier V:** a SINGLE-property fade/translate
  scrub remains Tier V (the existing CSS scroll-driven parallax pattern + `--sgs-scroll-progress`);
  Tier G owns multi-keyframe, staggered, or sequenced scrubs. **Stated assumption (verify at
  Wave A build):** Safari stable still lacks CSS Scroll-Driven Animations (Chromium 115+ and
  Firefox have them), so cross-browser-critical scrубs are G; if Safari ships them, the boundary
  moves in V's favour (doctrine §1.3).
- **FR-38-8 Horizontal scroll panel.** A `sgs/container` **block variation** ("Horizontal scroll
  section"): vertical scroll maps to horizontal travel of a pinned row. Mobile (<768) falls back
  to native horizontal scroll-snap (the Tier V carousel pattern); keyboard users get normal
  sequential focus (no scroll-jacking of focus order).

> **Keyboard focus contract (FR-38-6, FR-38-8) — LIVE-VERIFIED 2026-07-31 (D434).** Until this
> date §2's "keyboard users get normal sequential focus" was an assertion with no test anywhere.
> It is now measured, and it holds.
>
> Neither pinning effect intercepts `tabindex`, DOM order, or focus events; both rely entirely on
> the browser's native "scroll the newly-focused element into view". When Tab reaches a focusable
> element positioned after an active pin, that native focus-scroll carries the viewport past the
> pinned section — which correctly un-pins as it goes — and settles with the focused element
> visible. **Measurement caveat that produced a false failure first time round:** the site sets
> `scroll-behavior: smooth`, so this settle takes several hundred milliseconds. A probe sampling at
> a fixed short delay reads the element as off-viewport mid-flight and reports a spurious WCAG
> 2.4.11 failure. Poll `scrollY` until it stops changing before measuring. This is not
> scroll-jacking; it is the standard browser affordance working as intended.
>
> **Reduced motion:** `pin-scrub` creates no pin at all — no timeline, no `ScrollTrigger` — so
> sequential focus is simply normal document flow. `horizontal-panel` falls back to native
> `overflow-x: auto; scroll-snap-type: x mandatory`, and the panel `<section>` elements are
> themselves valid Tab stops for keyboard-driven scrolling.
>
> ⚠ **SUPERSEDED 2026-08-01 (D453) — this was proven FALSE the moment a fixture with real
> interactive content existed** (the very re-verification this block records as owed). A control
> inside a `pin-scrub`/`scrub`/`split-reveal` section is focusable while at `opacity: 0`, because
> `fromTo` immediate-renders the hidden FROM state before any scroll. That is a WCAG 2.4.11
> failure and it DOES need additional wiring: `fx-pin-scrub.js` and `fx-scrub.js` now hold the
> reveal on `gsap.ticker` while focus is inside; `fx-split-reveal.js` uses a one-shot (no scrub,
> so no per-frame race). The horizontal panel is the ONLY one where native reachability suffices,
> and even there by accident — see D458.
>
> **Content restriction: none required.** *(Original text, retained for the record.)* A block
> author placing links, buttons or form fields inside a `pin-scrub` section or a horizontal panel
> needs no additional wiring — reachability is inherited from the browser's native focus-scroll.
>
> **Owed:** the canary fixtures contain no focusable element INSIDE a pin, so the case the
> accessibility audit actually worried about — Tab landing on a control within an active pin — is
> proven by mechanism rather than by observation. Re-verify once a pinned composite with real
> interactive content exists.

- **FR-38-9 Scroll-scrubbed image sequence — NET-NEW block `sgs/image-sequence`.** Canvas-drawn
  frame sequence scrubbed by scroll. **Explicit sub-scope with its own tooling task:** the
  asset pipeline (frame export from video, compression, resolution ladder, lazy chunked
  fetch) is a named Wave C work item — the block is NOT done when the canvas draws; it is done
  when a client can produce usable frames with the documented tooling. Editor shows the poster
  frame only. **The block itself exists** (`src/blocks/image-sequence/`, agency-only, hidden
  from the inserter) — `scripts/generate-fx-qualifying-blocks.py`'s `EXACT_MATCH_BLOCKS` table
  carried a stale comment claiming the directory didn't exist yet; corrected 2026-08-02
  (register item 4) to the real roster `{"sgs/image-sequence"}`.

### 3.2 Text

- **FR-38-10 SplitText reveals.** Char/word/line reveals incl. masked lines, on text-bearing
  blocks (`sgs/heading`, `sgs/text`, `sgs/quote`, hero headline). The 2025 SplitText rewrite's
  accessibility mode (screen-reader-preserving `aria-label` on the split parent) is REQUIRED —
  a split that breaks the accessibility tree is a defect, not a setting.
- **FR-38-11 ScrambleText.** Headings only by default, default OFF, shipped for the niche
  use-case (tech/creative clients). Reduced motion: suppressed entirely (text renders plain).

### 3.3 Layout + interaction

- **FR-38-12 Flip on filtered grids — a PAIRING CONTRACT, not a one-off.** Defined as: a
  filter-emitting block (`sgs/filter-search`, and any future filter UI) fires the existing
  filter event; a filterable-grid block (`sgs/card-grid`, future filterables) declares
  `supports.sgs.fx.flip`; when BOTH sides are present on a page and the pair setting is ON,
  re-filters run through `Flip.from()` (captured state → re-layout → animated inversion with
  stagger + interrupt handling). The contract (event name, capture timing, opt-in key) is the
  spec'd surface; card-grid is merely its first implementation. No-GSAP fallback: instant
  re-layout (today's behaviour); same-document View Transitions crossfade MAY be offered as a
  Tier V "lite" option where supported.
- **FR-38-13 Draggable + Inertia — curated roster + opt-in mechanism.** Roster v1:
  `sgs/gallery` (drag-to-scroll carousel upgrade), `sgs/testimonial-slider` (same),
  **`sgs/before-after` (NET-NEW block — DB-verified absent, Wave C)**, `sgs/hero` decorative
  layers (draggable ornaments, desktop fine-pointer only). **Opt-in mechanism:** a block joins
  the roster by declaring `supports.sgs.fx.draggable` in its block.json — `/sgs-update` seeds it
  to `block_capabilities` (§6); the runtime + registry read the DB, never a hardcoded roster
  (R-31-1). CSS scroll-snap remains the default; Draggable is the upgrade. Touch: native scroll
  is never hijacked (`touch-action` discipline); keyboard: arrow-key equivalents mandatory.
- **FR-38-26 Looping carousels — an INDEPENDENT control, Tier V.** Added 2026-08-02 (D460).
  Bean's ask: *"for the dragging physics feel the option to make the carousels looping is
  important so it doesn't get abruptly stopped by the end of the list and just loops round."*
  A native horizontal scroller with looping ON clones leading/trailing items and re-seats
  `scrollLeft` at the boundary within one frame, so the track never dead-stops at the last card.

  **NOT a drag setting, and this is the load-bearing part of the requirement.** Bean's ruling:
  *"looping should not be tied to the drag effect — they should be independent controls"*, and
  *"we're not setting the default behaviour in all carousels, just making the functionality
  available to those who want it."* So looping has its **own grammar** (`data-sgs-loop="1"`),
  never a `data-sgs-fx` value, and an element may carry BOTH `data-sgs-fx="draggable"` and
  `data-sgs-loop="1"` at once — a single-valued `fx` slot could not express that pair.
  **Default OFF, opt-in per instance.**

  **Why a separate module rather than an addition to `fx-draggable.js`.** That file's own docblock
  records a prior decision rejecting exactly it — *"re-deriving such a block's own wrap-around
  maths inside a block-agnostic module is exactly the per-block hyperfocus R-31-9 forbids"* —
  alongside a contract that it never creates a wrapper, never transforms, and never reorders DOM,
  all three of which looping a native scroller requires. `src/shared/effects/fx-carousel-loop.js`
  owns the DOM work as its explicit job; **`fx-draggable.js` is not modified at all**, so that
  contract is honoured rather than overturned.

  **Eligibility** is the same STRUCTURAL question the drag module already answers — a genuine
  native horizontal scroller (`isNativeHorizontalScroller`, extracted to `motion-utils.js` as a
  deliberate documented duplicate, because sharing it would have required adding an `export` to
  the frozen file, itself a modification). Never a block name (R-31-9).

  **Accessibility is part of the requirement, not a follow-up.** A loop has no last item, so
  "next" never disables and the dot count has no natural end. Clones are `inert` + `aria-hidden`
  with focusables neutralised and are excluded from the block's item selection, so **the dot count
  keys to the REAL card count** and the active dot tracks modulo position. Verified live: 6 real
  cards, 18 with clones, **6 dots**.

  **Control home is PER-BLOCK, not the shared fx panel** — the same constraint that already forced
  `draggable` block-private: the scroller is a DESCENDANT, and both `fx.js`'s save filter (static
  blocks only) and `fx-attributes.php`'s injector only ever stamp the block ROOT.
  `fx_effects.creates_panel = 0` records that decision rather than driving it.

  **STATUS — ROLLOUT COMPLETE, 2026-08-02.** Five blocks now carry `loopCarousel`, each proven live
  by `scripts/motion-qa/probe-carousel-loop.mjs` against its own fixture with drag AND loop both on:
  `sgs/gallery` (exemplar, 9/9), `sgs/post-grid` (9/9), `sgs/trustpilot-reviews` (9/9),
  `sgs/google-reviews` (9/9), `sgs/buybox` (8/8 + 1 not-exercised). Per-block evidence in
  `reports/visual-diff/<block>-2026-08-02.md`. The load-bearing dots assertion was genuinely
  exercised on four of the five — 9 real cards / 27 with clones / **9 dots** on post-grid, and the
  same shape on the rest.

  **⚠ THE ROSTER PREDICATE IN THIS SPEC WAS WRONG, and is corrected here.** This section previously
  said to re-derive the roster from `supports.sgs.fx.draggable`. That predicate returns
  `{ before-after, gallery }` — two blocks, one of which has no scroller at all. **The correct
  predicate is "owns a native horizontal scroller"**, which is precisely what
  `isNativeHorizontalScroller()` gates on at runtime. Measured, that is `buybox`, `gallery`,
  `google-reviews`, `post-grid`, `trustpilot-reviews`.

  Two blocks are deliberately EXCLUDED, with reasons, so neither is re-proposed cold:
  - **`sgs/before-after`** declares `fx.draggable` but has no `overflow-x` anywhere — its drag is a
    divider handle, not a scroller. Looping would no-op.
  - **`sgs/testimonial-slider`** has a `dragToScroll` attr but its track is `overflow:hidden` +
    transform-driven, so `isNativeHorizontalScroller()` rejects it (as `fx-draggable.js` already
    did — `render.php` records that removal as inert). Giving it looping means converting the track
    to a native scroller and moving its arrows/dots/autoplay onto `scrollLeft`: a behavioural change
    to that block, not a rollout step. **Bean ruled it out of scope 2026-08-02.**
  - `sgs/timeline` is a genuine horizontal scroller with no fx declaration at all — an unclaimed
    candidate needing a new control surface, not a rollout.

  **`sgs/buybox` was the non-mechanical one** (thumbnail strip + the product-card Interactivity
  store) and drove a UNIVERSAL hardening of `neutraliseClone()` in `fx-carousel-loop.js`: clones now
  have `data-wp-*` directives plus `data-index`/`aria-current` stripped, on the clone root and every
  descendant. `inert` + `aria-hidden` stop a human reaching a clone; they do NOT stop a framework
  hydrating it. Proven live: **0 live attributes across 20 clone subtrees**, with a negative control
  confirming the assertion fails when one is re-planted.
  2. **CLOSED 2026-08-02 (register item M2).** Reduced motion for the LOOP is now measured, not
     assumed — see §10's new `Carousel loop (FR-38-26)` row. Confirmed on 4 of 5 rollout blocks
     with a real `reducedMotion:'reduce'` browser context: clones, neutralisation, and boundary
     re-seat all behave identically under reduce, because the correction is an instantaneous
     `scrollLeft` write, never a tween — there is genuinely nothing for `prefers-reduced-motion`
     to gate in this module. A negative control (each block's OWN arrow-click, a separate code
     path) proved the emulated context was real: `sgs/gallery`/`sgs/post-grid` correctly branch
     `auto`/`smooth`; `sgs/trustpilot-reviews` and `sgs/google-reviews` hardcoded `'smooth'`
     regardless of preference — a genuine defect in those two blocks' own arrow-click code,
     separate from the loop module. ✅ **BOTH FIXED 2026-08-02 (`5c45f879`, `ba28ab92`).** Each now
     reads the media query FRESH per call rather than caching it at module load, so toggling the OS
     setting takes effect during a visit. The sweep also caught a THIRD instance the measurement had
     not: `sgs/post-grid` had a SECOND `scrollIntoView` still passing the British spelling
     `behaviour`, which the browser silently discards — one of two occurrences had been fixed and
     the other missed. Only one hardcoded `'smooth'` survives, in `google-reviews`' autoplay, which
     early-returns under reduce (WCAG 2.3.3) and is therefore correctly gated, not a defect.
  3. **CLOSED 2026-08-02 (register item M2), with ONE genuine defect found.** Keyboard arrow-wrap
     was exercised live (`scripts/motion-qa/probe-carousel-loop.mjs`, Arm 2 — focus the next-arrow,
     press Enter repeatedly past the boundary) on all 4 arrow-bearing blocks (`sgs/buybox` has no
     arrows to test). `sgs/gallery`, `sgs/post-grid`, `sgs/trustpilot-reviews` all wrap correctly —
     the arrow never disables AND the active position genuinely returns to its starting point
     (gallery/post-grid in exactly N presses via their internal counted `currentIndex`; trustpilot
     in N+1, because its dot-sync is nearest-scroll-position rather than a counter, and spends one
     press "inside" the clone region before the loop module's own correction re-seats it — a real
     mechanism difference, not a defect). `sgs/google-reviews` WAS genuinely broken: its
     `nextSlide()` computed an absolute scroll target by scanning only REAL (non-clone) items for
     one past the current position; once `scrollLeft` moved into clone territory it had no further
     real item to target and dead-ended at the last real card forever — the arrow never disabled
     (satisfying the letter of "must never disable") but functionally could not progress past the
     last real card via repeated keyboard activation, failing WCAG 2.5.7's actual requirement that
     the alternative WORK. Satisfying a rule's wording while defeating its purpose is the failure
     shape worth remembering here.
     ✅ **FIXED 2026-08-02 (`ba28ab92`) and PROVEN LIVE.** Both directions now treat "no real item
     that way" as the WRAP POINT instead of clamping to a card already on screen. `prevSlide()` had
     the SAME defect mirrored — its fallback re-scrolled to the first real card from inside the
     LEADING clone region — and was NOT in the original finding; it was caught by reading the pair
     rather than only the function the report named. Verified on the live canary with the committed
     probe: **google-reviews 17/17, trustpilot-reviews 17/17, post-grid 17/17**, the decisive
     assertion being "keyboard-driven wrap lands back at the SAME index within 5 activations —
     start index=0 → back to 0 after 3 presses".
     ⚠ This block passed the looping rollout's own "dots == real cards" check (3 == 3) while its
     keyboard path was already broken. A dot that moves is not a dot that WORKS.
     NOT fixed this session — a behavioural change to that block's navigation, not a measurement
     task, and outside this session's "measure, don't ship" scope.

- **FR-38-14 Physics easings as flavours.** Physics2D / PhysicsProps / CustomBounce /
  CustomWiggle appear ONLY as easing/motion-flavour options inside other G effects' controls
  (e.g. a "spring (physics)" easing choice on a scrub or draggable release). Never standalone
  toggles; each bundles into the chunk of the effect that offers it.
- **FR-38-25 Cursor-reactive FIELD — Tier V, EMITTER + PARTICIPANT, PLUGGABLE FIELD TYPES.**
  Bean-signed 2026-08-01 (D440) as a single radial glow; **WIDENED the same day (D459)** to a
  field-type system on Bean's ruling: *"we're building this to be able to compete with and replicate
  those comp websites and clone incredible designs from Claude Design where usually the effect isn't
  limited to a glow/colour, it could be a pattern, move floating objects etc."*

  A block's background carries a field that follows the pointer. **Tier V, not G:** the shipped
  mega-menu implementation (`src/shared/effects/spotlight.js`, consumed by `sgs/mega-panel`) already
  does this in vanilla with an rAF-throttled custom-property write and a live reduced-motion gate —
  GSAP adds nothing the doctrine's §1.3 ratchet would accept. **Measured at build: 982 bytes gzip,
  no GSAP dependency**, so a page using this effect and no Tier G effect ships zero GSAP bytes.

  **THE PAINTER IS SWAPPABLE; THE MECHANISM IS NOT.** Everything below about coordinates and
  `background-attachment` is load-bearing and unchanged by the widening. What changed is that the
  thing painted at the published position is selected rather than hard-coded. A field type sets ONE
  custom property on the emitter — `--sgs-cursor-field-layer` (the image), optionally
  `--sgs-cursor-field-mask` — and every downstream rule (the emitter's `::before`, every
  participant) reads those two and **never names a type**. A new type is therefore a CSS rule plus a
  descriptor: no new selector, no new JS, no new wiring.

  | Type | Paints via | Status |
  |---|---|---|
  | `glow` | `radial-gradient` — a soft pool of light at the pointer | SHIPPED (FR-38-25 as originally signed; the default, so instances saved before types existed are unchanged) |
  | `spotlight-mask` | the same gradient as a `mask-image`, revealing a pattern beneath rather than adding light | SHIPPED — deliberately paints by a DIFFERENT CSS property, so the extensibility seam is demonstrated rather than asserted |
  | `floating-objects` | individual `transform: translate()` per marked object, reading the SAME viewport-space `--sgs-cursor-x`/`--sgs-cursor-y` custom properties the emitter already publishes | **TIER V ARGUED (2026-08-02), STILL NOT BUILT.** See below — the tier question is answered but the opt-in surface is a separate, design-gated decision this residual work deliberately did not make. |

  **`floating-objects` — resolved to Tier V, but deliberately still not built (2026-08-02).**
  The FR's own open question — *"it is the first type needing per-object JS rather than a
  single custom-property write"* — turns out to be avoidable. A pure-CSS design clears the same
  bar `glow`/`spotlight-mask` clear, with **zero new JS runtime**: a floating object reads the
  emitter's existing `--sgs-cursor-x`/`--sgs-cursor-y` (viewport px, published on every move)
  directly in a `transform: translate(calc(...))` rule — no lerp, no per-object rAF loop, no
  inertia maths; per-object variance (so objects don't all move identically) is a CSS-only
  `--sgs-float-factor` custom property, settable via `:nth-of-type()`. This is the same
  982-bytes-gzip publish already measured for `glow`, read by a different CSS consumer — exactly
  the same relationship `spotlight-mask` already has to it. §1.3 test (i) capability real, Tier V
  reaches it — yes, by the above; (ii)-(iv) are the Tier H test, not applicable here.

  **Why it still isn't built despite the tier question closing.** `floating-objects` breaks the
  load-bearing sentence *"THE PAINTER IS SWAPPABLE; THE MECHANISM IS NOT"* — every other field
  type is a shared BACKGROUND LAYER (`background-image`/`mask-image`, painted identically by
  emitter and participants via `background-attachment: fixed`). `floating-objects` paints
  nothing; it MOVES DISCRETE ELEMENTS — a structurally different consumer of the two coordinate
  properties. That is fine in itself, but it needs an answer this residual task should not
  invent alone: **which children become floating objects?** Participants are detected at RUNTIME
  by computed background (a fact about the rendered page). A floating object is the opposite —
  an author's DECISION that a specific decorative child should move — which needs its own opt-in
  marker crossing block boundaries the same way `imageControls`/`containerKind` do: a genuine new
  capability surface, which project CLAUDE.md rule 7 requires design-gating (shared-mechanism,
  high blast radius) BEFORE building, not after. Shipping it without that decision risks exactly
  the "13 panels where none makes sense" containment failure `creates_panel` was built to catch
  for `cursor-field` itself, arriving by a new route. **Recommendation for the design-gate, when
  it happens:** host the opt-in as a per-instance flag on whatever block already renders inside
  an emitter as a decorative child (icon, decorative-image), gated the same way `imageControls`
  is — declared in `block.json` `supports.sgs`, never hand-listed. Do not default it on for any
  existing block.

  **Eligibility is DERIVED FROM CAPABILITY, never hand-listed** (R-31-1\R-31-9). Two roles:

  **Eligibility is DERIVED FROM CAPABILITY, never hand-listed** (R-31-1/R-31-9). Two roles:
  - **EMITTER** — publishes the pointer coordinates and paints the base field. Eligible: any
    block with `supports.sgs.containerKind` set, or declaring a background-image attribute.
  - **PARTICIPANT** — paints its own share of the SAME field so the glow reads as continuous
    across an opaque child. Eligible: any block with a background-colour capability.

  **Why two roles rather than one.** Bean's ruling, verbatim: *"it'd look a bit janky for the
  effect to either be covered behind a button or just completely turn off when I hover on a
  button so it should be able to go over any surface seamlessly."* Investigation established
  that the second half does not occur — `mousemove` bubbles from descendants, and `mouseleave`
  does not fire on entering a child, so tracking never stops (`spotlight.js:101-107`). **The
  first half does occur**: the field paints on a `::before` while every direct child is forced
  to `z-index: 1` (`mega-panel/style.css:193-211`), so an opaque child occludes its slice. A
  participant role fixes the occlusion without a blend layer over the client's own colours.

  **Mechanism — viewport-space coordinates + `background-attachment: fixed`.** The emitter
  publishes the pointer position in VIEWPORT pixels; custom properties inherit, so every
  descendant reads the same pair with no ancestry wiring. Each participant paints the identical
  gradient with `background-attachment: fixed`, which resolves a background against the viewport
  rather than the element — so the field aligns across separately-painted boxes with **zero
  per-element geometry maths**. This is why the emitter must publish viewport-space values and
  NOT the element-relative percentages the mega-menu uses: `initSpotlight` therefore gains an
  optional coordinate-space option rather than a second module (its export contract stays
  backwards-compatible for the existing consumer).

  **Gated to fine pointers** — `@media (hover: hover) and (pointer: fine)`. A cursor effect has
  no meaning on touch, and this also sidesteps `background-attachment: fixed` being ignored on
  iOS Safari.

  **⚠ TWO RISKS THAT MUST BE MEASURED BEFORE WIDENING, NOT REASONED ABOUT:**
  1. **Paint cost.** A `radial-gradient` background repaints every frame the pointer moves, and
     N participants means N repaints. The house rule ("transition only `transform`/`opacity`")
     does not name `background-image`, but the cost class is the same. Measure frame cost on a
     canary with a realistic participant count.
  2. **Legibility.** A moving field under text changes contrast continuously. Measure at the
     field's BRIGHTEST position, never at rest — an effect recomputes every contrast above it.
     Bean's own standing finding applies: a mid-luminance brand accent fails as an indicator
     against both grounds.

  **Unlike the mega-menu's version this is NOT always-on** — that one has no control at all
  (`mega-panel/view.js` applies `data-spotlight` unconditionally). This ships with an inspector
  control, per the framework rule that a capability without an editor control is not done.
  Three controls on the EMITTER: field style, field colour (`DesignTokenPicker`, storing a palette
  SLUG so re-theming re-colours the field), field size. **Participants carry NO control** — an
  opaque child paints its own share automatically, and a per-child opt-out would add a setting to
  ~51 blocks that almost nobody would open.

  **`fx_effects.creates_panel` — a THIRD class of effect, added by this FR (D459).** The
  qualifying-blocks generator previously had two: `requires='none'` (permissive — offered wherever
  a panel already exists, never creates one, which is what stops all ~80 blocks acquiring a panel
  from `scrub` alone) and `requires=<specific>` (creates the panel on any block providing that
  token). `cursor-field` fits neither: it is genuinely inert on a block with no paintable
  background, so it cannot be `none`.

  **This was MEASURED before the code was written, and the measurement is why the column exists.**
  Letting `cursor-field` create panels puts a brand-new fx panel on **11 blocks** — `nav-menu`,
  `site-header`, `site-header-row`, `site-footer`, `site-footer-row`, `form`, `modal`, `nav-drawer`,
  `mega-panel`, `feature-grid`, `testimonial-slider` — and because `offered = specific + permissive`,
  every one of those would ALSO silently inherit `motion-path` and `scrub`. That is the "13 panels
  where none makes sense" containment failure arriving by a new route. With `creates_panel=0` the
  measured roster diff is **28 panels before, 28 after**, and `cursor-field` is offered on exactly
  the 7 blocks with a paintable background. The column defaults to 1, so all 13 pre-existing effects
  are behaviourally unchanged.

  The emitter's `requires` token is **`surface`**, derived in
  `scripts/generate-fx-qualifying-blocks.py` as `containerKind` being set (ANY value — layout and
  content containers paint backgrounds too) OR a `backgroundImage*` attribute being declared.
  Deliberately NOT the existing `section` token, which is `containerKind == 'section'` only and
  would miss `sgs/info-box`, `sgs/testimonial` and friends. The PARTICIPANT half needs no token:
  participants are detected at RUNTIME from computed background — the fact that actually decides
  occlusion — never from a declared capability.

  **KNOWN RESIDUALS (recorded, not assumed away).** Tracked as Step R-residual of
  `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`.

  1. **THE MULTI-LIST DRIFT — the single most expensive defect class this spec has produced.**
     ✅ **GATED 2026-08-02** by `plugins/sgs-blocks/scripts/check-fx-list-drift.py`, wired into
     `prebuild` immediately after the motion-fx generator chain. Six invariants, each traced to a
     real defect it would have caught; `--self-test` breaks all six in turn plus a vacuity case and
     proves each is caught. Deleting `'cursor-field'` from any one of the three lists now fails the
     build — verified by doing it, three times, and restoring. The gate reads NO database (committed
     source + generated artefacts only), so a clean checkout still builds. `fx_effects` gained an
     **`in_picker`** column (same shape as `creates_panel`, D459) because nothing else distinguished
     a picker effect from a block-private one — `creates_panel` does not (`cursor-field` is 0 and IS
     in the picker). The paragraph below describes the situation that existed BEFORE that gate.

     An fx effect must join THREE hand-maintained lists to work at all, and **no gate cross-checks
     any of them**: `SHIPPED_EFFECTS` (`fx.js`, gates the editor picker), `FX_ATTR_MAP`
     (`fx-attributes.php`, attr → data-attribute for DYNAMIC blocks), and
     `sgs_fx_effect_param_scope()` (`fx-attributes.php`, per-effect param allowlist).
     **Two of the three were missed on `cursor-field` in one session, and neither failed a build.**
     Missing the first made the entire feature unreachable from the editor while every other layer
     was correctly wired; missing the third rendered a page that looked completely healthy —
     emitter marked, stylesheet and module enqueued — while the client's chosen colour and radius
     were silently dropped. The third only surfaced by LIVE verification, after the other fixes had
     already shipped.
     A FOURTH list of the same shape governs field types: `FX_FIELD_TYPE_OPTIONS` (`fx.js`) ×
     `SGS_FX_CURSOR_FIELD_TYPES` (`fx-cursor-field.php`) × the painting rules in
     `fx-cursor-field.css`. A type in the picker with no CSS rule silently paints nothing.
     ✅ That triad is invariant **I6** of the same gate, checked all three ways.
     Two hand-maintained lists diverging silently is a failure this codebase has met before (see
     the `TRANSITION_STYLES` note in `class-sgs-motion-registry.php`) — this is now four.
  2. **`floating-objects` is spec'd, not built** (see the field-type table above).
  3. **A participant carrying its own `background-image` is deliberately not marked**, because our
     layer would replace it; that child keeps a visible seam. Clobbering a client's chosen image is
     plainly worse. A `::before` fallback for that narrow case is possible if the seam is reported.
  4. ~~The participant walk runs at init only~~ **FIXED 2026-08-02.** `cursor-field.js` gained a
     bounded `MutationObserver` on the emitter (`childList` + `subtree` +
     `attributeFilter: ['style', 'class']`) that re-runs the SAME `isParticipant()` test against
     added nodes and mutated existing nodes, debounced to one pass per animation frame regardless
     of mutation-burst size, so a large subtree churn cannot fire a computed-style read once per
     mutation record. Bounded to the emitter's own subtree only — created and disconnected inside
     the same `init`/`cleanup` pair as everything else in this module, no page-wide observer.
     Verified present: `src/shared/effects/cursor-field.js`.

- **FR-38-27 Physics canvas — a container-equivalent block whose children are throwable
  DECORATIVE bodies. Tier G.** Bean-signed 2026-08-01 (D447); **SCOPE RE-RULED by Bean 2026-08-02
  after a QC council** (see the box below). BUILT 2026-08-02.

  ⛔ **SCOPE RULING — Bean, 2026-08-02, do not re-litigate.** This block is a **NICHE ARTISTIC
  CANVAS**. It is **deliberately NOT built for accessibility, NOT built for structure, and NOT
  expected to be clonable.** It is an operator-discretion surface for decorative flourish, and it is
  the one place in the framework where those guarantees are knowingly waived. Renamed
  `sandbox` → `canvas` at the same ruling.

  **What the council established, kept here because the earlier text asserted the opposite.** This
  FR originally justified itself by claiming the block *dissolves* WCAG 2.5.7 — a thrown object has
  no discrete single-pointer alternative, so the argument ran that restricting bodies to
  non-interactive decorative content means nothing operable is ever throwable and no alternative is
  owed. **A QC council measured that guarantee and it does not hold.** `allowedBlocks` filters by
  block NAME, not by CAPABILITY: `sgs/media` carries `linkUrl` and `videoControls` (default `true`,
  giving a focusable native `<video controls>`), `sgs/icon` carries `linkUrl`, and `core/image`
  carries WP's own `linkTo`. An operator can place operable content inside with no code. The
  `aria-hidden="true"` on the arena does not compensate — it removes content from the accessibility
  tree while leaving it in the tab order.
  **That was a category error in this FR, not a build defect: "decorative" was written as a property
  of a block TYPE when it is a property of a block's CONFIGURATION.** Bean's ruling above accepts
  the consequence for this surface rather than requiring the guarantee. **Do NOT cite this FR as
  evidence that any other SGS surface clears 2.5.7** — every other drag effect earns that separately
  via a genuine discrete alternative (range input, arrows, dots), and that reasoning is untouched.
  Residual, unbuilt, offered not owed: `tabindex="-1"` on focusable descendants would keep children
  throwable by pointer while removing the keyboard trap. ⛔ `inert` is the WRONG primitive — it
  blocks pointer interaction on the whole subtree and would disable the block.

  **This is the ONE named exception to FR-38-14**, which says physics are easing FLAVOURS and
  *never standalone toggles*. FR-38-14 continues to govern every other use; this canvas is the single
  surface where physics is the point rather than the easing. Do not read this as reopening
  FR-38-14 generally.

  **Capability was never the objection** — Physics2DPlugin and InertiaPlugin are already bundled
  and free.

  **Autonomous motion.** An object still moving *after release* is autonomous, so the
  "drag survives reduced motion" reasoning behind `fx-draggable`'s SIMPLIFY contract does not
  carry here. Reduced motion disables the physics outright — see the contract below.

  **KNOWN CEILING (council, 2026-08-02) — it is a throwable layer, not a physics engine.**
  Physics2DPlugin has no collision detection; bodies bounce off the arena's edges only and pass
  straight through each other. There is also no rotation (`type: 'x,y'`) and no resize handling
  (bodies take fixed pixel `left/top/width/height` at init). Award-tier "physics playground" sections
  use Matter.js/Rapier for pile-up and stacking. Accepted for a decorative canvas; do NOT describe
  this block as a physics engine to a client.

  **Shape (Bean's call, asked and answered in-session): a dedicated container-equivalent block
  whose children become bodies — NOT a physics toggle bolted onto existing blocks with preset
  shapes.** A preset-shape toggle locks operators into whatever shapes we happened to imagine; a
  container-kind block gives them anything they can put in a container. It therefore inherits the
  **composite-mirror rule** (project CLAUDE.md, D152) and MUST mirror `sgs/container`'s wrapper
  capabilities rather than diverging — its `container_kind` follows from that, and any missing
  capability is a gap to add to the block, never a converter workaround.

  **Reduced-motion contract — degrade to MORE content, never less.** Under
  `prefers-reduced-motion: reduce` the physics are disabled and **the children still render, static,
  in their authored positions**. The surface does not vanish. "Disables the surface outright" in
  D447 means *disables the motion*, not *removes the content*: hiding decorative children would be
  the `degrade-to-more-content-never-less` failure, and a client who placed an ornament deliberately
  should still see it. ⚠ **Flagged for Bean's confirmation at the design gate** — D447 recorded the
  ruling in one phrase that admits both readings, and this FR picks the one consistent with the
  captured rule. It is the cheaper error to correct in either direction.

  ⚠ **§10 row OWED, not dropped** (STOP-29 — mapped, not silently deferred). The per-effect
  reduced-motion table needs a `physics-canvas` row carrying the contract above. It is not added
  in this edit because §10 is being edited concurrently by another track adding the `cursor-field`
  and `carousel-loop` rows, and a same-file collision would clobber one of them. Add it with the
  block's build session.

  **Nearest existing anchor:** FR-38-13's still-unbuilt *"hero decorative layers (draggable
  ornaments)"* roster entry — a sandbox is that idea generalised to a container.

### 3.4 SVG

- **FR-38-15 DrawSVG + the Vivus retirement (D408).** Element-level stroke-draw on SVG-bearing
  blocks (`sgs/responsive-logo`, `sgs/icon`, `sgs/separator`, `sgs/decorative-image`);
  load-triggered OR scroll-scrubbed. **Retires Vivus** — single consumer is
  `sgs/responsive-logo` (`animationStyle: draw-on-load | hover-redraw | scroll-trigger`); the
  same enum values re-back onto DrawSVG, `vivus` leaves `package.json`, the webpack chunk
  disappears. **Migration note: per D270 there is NO deprecated.js** — the attr surface is
  unchanged (same enum), only the runtime swaps, so stored instances render identically; the
  reduced-motion arm upgrades from Vivus's non-canonical 1ms draw to the house live-check
  (§10). Vivus is also the cited evidence (D406) that "no external libraries" was already an
  approximation — the real rule was "bundle it, no CDN". **The Tier V `data-sgs-path-draw` IIFE
  is NOT retired** — simple load-draw on arbitrary SVG paths stays vanilla; DrawSVG owns the
  scrubbed + block-integrated cases.
- **FR-38-16 MorphSVG — ASSET-GATED.** Element-level morph between prepared path pairs. The
  control does not appear until the block instance carries BOTH assets, and the inspector links
  authoring guidance (how to produce matched-topology path pairs; what fails). Ships with that
  guidance, not a bare toggle. Revives parking **P-10** (its "paid Club GSAP" deferral premise
  is dead).
- **FR-38-17 MotionPath.** Decorative-image float/travel along a path. **Tier V by default**:
  CSS `offset-path`/`offset-distance` (well-supported) drives autonomous looping travel with no
  GSAP. **Tier G only when scroll-scrubbed** (path progress mapped to scroll → MotionPathPlugin
  + ScrollTrigger). The inspector exposes one control surface; the tier fork is an
  implementation detail invisible to the client.
  **Resting position (D441, 2026-08-01, owner-approved design amendment).** Measured live on
  the canary: the "arc" route's route-box sizing defect (documented in `fx-motion-path.css`)
  produced a locked end-of-scrub transform that carried the traveller through the sticky
  header's screen band and off the top of the viewport before the tween settled — the designed
  payoff position was never visible. `scroll-padding-top`/`scroll-margin-top` cannot fix this
  (neither ever fires for a GSAP transform, only a real scroll operation); a runtime
  `getBoundingClientRect()` clamp was considered and rejected as the wrong layer (ad hoc pixel
  maths against a value the CSS layer can resolve declaratively, per-frame layout reads for a
  static value, and a second reduced-motion code path). The shipped fix is a client-facing
  **"Resting position" control** — four named presets (`below-header` / `middle` / `lower-third`
  / `custom`, DEFAULT `middle` — industry convention for "settle and read": viewport centre,
  never `top top`, which is for pinning mechanics) plus a 5vh-stepped fine-tune slider for
  `custom`. Values resolve **declaratively in CSS** via `calc()`/`max()` against the existing
  published `--sgs-header-height` custom property (`assets/css/fx-motion-path.css`); the
  `max()` floor (`header-height + 16px`) guarantees the traveller can never rest under the
  header regardless of preset or unusually tall/wrapped content. The runtime
  (`fx-motion-path.js`) does not compute or measure this position itself — `ScrollTrigger`'s
  own `onLeave`/`onEnterBack` callbacks (fire once per boundary crossing, never per-frame) hand
  off between the GSAP-driven transform (mid-scrub) and a plain CSS `position: sticky` rule
  (once settled), clearing the transform on handoff so the CSS rule is never fighting a stale
  `translate`. Reduced motion (§10) reads the identical `--sgs-fx-motion-path-rest-y` custom
  property unconditionally, so the resting position holds even when no tween is ever created —
  one CSS source of truth for both branches, not two code paths that could drift apart.
  Universal per R-31-9: the mechanism works whether the traveller is an `<img>`
  (`sgs/decorative-image`) or any other element, because it never needs to nest anything inside
  the traveller (the void-element blocker that ruled out an earlier considered approach — see
  `fx-motion-path.css`'s docblock).

### 3.5 Site level

- **FR-38-18 Site-level smooth scrolling — Tier H, Lenis (D422; was GSAP ScrollSmoother).**
  `✅ BUILT + LIVE-VERIFIED 2026-07-30` (`4776b73f` + `4b317b75` + `f9d2c213` + `659ff6f7` +
  `6c204981` — the last closed the row-collapse verification leg).
  Evidence: `reports/2026-07-30-motion-waveB-commit1-live-verification.md`; narrative:
  `memory/session-2026-07-30-motion-waveB-commit1.md`. Owner-tuned to strength 3.
  **Both previously-owed gaps on this FR are now CLOSED (2026-07-30, D424):**
  · **Long-distance anchor — CLOSED.** Proven over **2,211px**, not the skip link's 24px: the
  journey eased (269 → 1295 → 2009 → 2190, not a teleport), was **not** clamped at the document
  end, and the target landed **0.21px clear** of the sticky header — the same offset the 24px
  test produced, so distance does not degrade it.
  · **Reduced motion — CLOSED with REAL emulation, superseding the stubbed-media-query caveat.**
  Chrome's own media matching was emulated (not stubbed) and the browser's verdict read directly
  from `pagereveal`'s `viewTransition`. Critically this carried a **negative control**: under
  `no-preference` a transition genuinely RAN, so the suppression under `reduce` is a real result
  rather than a test that could never fire either way. (The same harness capability applies to
  the smoother; its own reduced-motion arm remains verified by the earlier branch-logic method.)
  SITE setting on the **SGS → Motion** page, default OFF. Lenis eases the REAL document scroll
  rather than transforming a wrapper, so there is no `#smooth-wrapper`/`#smooth-content` markup,
  no template change, and no interaction with the Spec 37 header (§4.2, superseded).
  **Mandatory conditions:** (a) disabled in the editor and all of wp-admin — server-side by the
  enqueue (`is_admin()`), plus a runtime gate for the editor's iframed canvas; (b) disabled under
  `prefers-reduced-motion`, checked LIVE and **reactively** — a mid-session OS change tears the
  instance down and a change back rebuilds it, without a reload; (c) anchor links + `:target` +
  "skip to content" resolve to correct positions, honouring the published `--sgs-header-height`
  scroll-padding (Spec 37 D391) — Lenis's own `anchors` option stays OFF so there is exactly one
  driver on an anchor click; (d) **touch scrolling stays native by DEFAULT** (`syncTouch: false`) — phone
  momentum is what a visitor's muscle memory expects, and this must be set EXPLICITLY, never left
  to the vendor default. An operator-facing opt-in with its own strength exists (D422 addendum,
  owner-requested 2026-07-30) but is **default OFF and documented as not recommended**:
  **tested on a real phone at the lightest setting (touch strength 1) and rejected by the owner as
  "abrupt and janky" — worse than off, not better.** That is a measured device result, not a
  preference; do not re-propose touch smoothing as an improvement without new evidence from a
  real device; (e) keyboard/programmatic scrolling (find-in-page, focus scrolling)
  remains functional — smoothing never intercepts input-driven scroll correctness, only
  presentation; (f) the companion stylesheet ships on the SAME conditional terms as the script —
  without its `.lenis.lenis-smooth iframe { pointer-events: none }` rule, wheel events over a
  cross-origin iframe are swallowed and the page stops scrolling wherever the pointer sits over
  an `sgs/media` or `sgs/business-info` embed.

  > **Condition (c)'s former clause about the theme's `smooth-scroll.js` is STRUCK (D422).** It
  > required suppressing a file that **no longer exists in the enqueue path** —
  > `theme/sgs-theme/functions.php` retired it ("Smooth scroll now handled by CSS… The JS file is
  > no longer needed"), and nothing in the repo enqueues it. The live competing driver is instead
  > `html { scroll-behavior: smooth }` (`core-blocks-critical.css`), and **that conflict did not
  > reproduce when measured** on the canary with Lenis running: a long smooth scroll eased
  > cleanly to target with zero reversals, and an anchor click landed exactly clear of the sticky
  > header. No suppression is therefore specified — per `prove-the-cause-before-fix.md`, a fix for
  > a cause that does not reproduce is not shipped. Re-open only with a reproduction.
- **FR-38-19 Page transitions — Tier V, cross-document View Transitions API.**
  `✅ BUILT + LIVE-VERIFIED 2026-07-30` (`984f2944`, D424). Evidence:
  `reports/2026-07-30-motion-waveB-page-transitions-verification.md`.
  SITE setting + per-template overrides on the **SGS → Motion** page, default OFF, sharing the
  existing `sgs_motion_settings` option. CSS-first (`@view-transition`), progressive enhancement,
  **no GSAP, no router, and zero frontend JS** (verified: the feature ships one stylesheet and
  nothing else). **Fallback where unsupported:** navigation behaves exactly as today — the
  feature is presentation-only, so absence of support IS the fallback, with nothing to build.
  Named transition styles (fade / slide / none), site-wide and per template.
  **Mandatory conditions, all live-verified:**
  (a) OFF ships zero bytes, and this holds **per template** — a template set to `none` enqueues
  no stylesheet and no rule, not a stylesheet that animates nothing;
  (b) reduced motion SUPPRESSES by gating the **opt-in itself** inside
  `@media (prefers-reduced-motion: no-preference)`, never by cancelling the animation afterwards
  — so the browser never does the snapshot work for those visitors. This also fails in the safe
  direction: a UA that cannot evaluate the media feature gets no transition;
  (c) never active in the editor or wp-admin (`wp_enqueue_scripts` + `is_admin()`);
  (d) the per-template list is enumerated from the theme via `get_block_templates()`, never a
  hardcoded roster — on the canary it produced 15 templates including WooCommerce's, which the
  theme directory does not contain.

  > **Two implementation decisions recorded so they are not re-litigated (D424):**
  >
  > · **The transition targets the `root` snapshot pair, not per-element
  > `view-transition-name`s.** This clause previously read "via `view-transition-name`
  > conventions", which describes a *different capability* — element continuity across a
  > navigation (a thumbnail growing into a hero). FR-38-19's actual scope is whole-page
  > navigation styling, and `root` is the correct minimal mechanism for it. Per-element
  > continuity is not built and is not claimed; it would be a new FR, not a bug in this one.
  >
  > · **`mix-blend-mode: normal` is set explicitly** on the old/new root snapshots. The UA
  > animates them with a second, blend-mode animation (`plus-lighter`), which the `animation`
  > shorthand happens to drop. `plus-lighter` sums colours additively and only looks right while
  > the snapshots overlap exactly — which the slide style deliberately breaks, producing visible
  > banding. The safety was therefore *accidental*; it is now stated, so restoring the "platform
  > default" later cannot silently reintroduce the artefact.

  **Independent corroboration of the reduced-motion shape:** WordPress 7.0.2 core ships the same
  construction in its own admin CSS (`wp-view-transitions-admin-inline-css`:
  `@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}…}`), observed
  on this canary. The pattern is core's, not an invention of this spec.

## 4. Named conflict resolutions (all seven; none deferred)

### 4.1 Conflict 0 — house vanilla-first principle × GSAP adoption (D406)

**Located written homes** (grep-verified 2026-07-28; there is NO literal "no GSAP" rule):
root `CLAUDE.md` Non-negotiables ("No jQuery — vanilla JS only frontend");
`plugins/sgs-blocks/CLAUDE.md` Key Rules ("Frontend JS: vanilla only, no jQuery, no external
libraries"); `theme/sgs-theme/CLAUDE.md` Performance Budget ("No jQuery, no external CDN");
Spec 01 ("no heavy animation libraries"); Spec 02 ("No external JS libraries — vanilla JS for
frontend interactivity"). Partly it also lived in session heads (D404, LEDGER, parking) — this
spec §1 is now its first consolidated written home.

**Resolution:** each home is amended IN PLACE with a one-line pointer to §1 (the doctrine),
keeping its performance intent ("no jQuery, no CDN" stay absolute). The amendment is the D406
decision. (The home amendments are documentation-only and landed ahead of the code gate — the
gate governs IMPLEMENTATION; the doctrine text itself is what Bean's sign-off ratifies.) After this session no track can truthfully say "GSAP isn't in the stack" (it is —
Tier G) or "everything should use GSAP" (it must not — Tier V is the default and nothing
shipped migrates). **In-flight track work is UNAFFECTED:** Spec 36's burger-morph state wiring
and trigger-anchor geometry are logic/geometry, not motion-system scope (Bean D404), and stay
the house way.

### 4.2 ScrollSmoother × Spec 37 header sticky (D407) — ⛔ SUPERSEDED BY D422 (2026-07-30)

> **⛔ THIS CONFLICT NO LONGER EXISTS. DO NOT BUILD ANYTHING IN THIS SECTION.**
>
> D407 resolved a conflict created *entirely* by ScrollSmoother's mechanism: it wraps page
> content in `#smooth-wrapper > #smooth-content` and **transforms** the content element, and a
> transformed ancestor silently stops `position: sticky` from pinning. Every artefact below —
> the header relocation, the output filter that was to insert the wrapper, the per-tier edge
> rule, the `findStickyBreakingAncestor()` tripwire — exists only to work around that.
>
> **D422 replaced the smoother with Lenis (Tier H), which eases the real document scroll and
> creates no wrapper and no transform.** There is nothing to sit outside of, nothing to trap the
> header in, and no template to restructure. **Measured on the canary before the swap**, with
> Lenis running: no wrapper element created; the header's entire ancestor chain
> (`div.wp-site-blocks` → `body`) reported `transform: none`; the header held
> `getBoundingClientRect().top === 0.00` at every scroll position **including mid-flight**;
> `--sgs-header-height` unchanged at 93px; every header and row state class toggled identically
> to baseline; `document.scrollHeight` unchanged; no inline height forced onto `<body>`.
>
> **Consequences, stated so they are not silently dropped (STOP-29):**
> · The Wave B "output filter / wrapper insertion" build item is **CANCELLED**, not deferred.
> · The `findStickyBreakingAncestor()` tripwire extension is **CANCELLED** — the existing
>   warn-only guard in `src/header-behaviours/view.js` stays exactly as shipped, untouched.
> · FR-38-18's former condition (d) (the sticky-header resolution) is **struck**; the header
>   verification survives as a *regression check*, not an engineering task (§8 Wave B).
> · Spec 37 FR-37-40 is **not modified by this spec in any way.**
>
> The text below is retained as the historical record of why the ScrollSmoother route was
> rejected. It is not an instruction.

**Ground truth correction:** Spec 37's per-row sticky was REJECTED (FR-37-40 short-parent
trap); what shipped is HEADER-level `position:sticky` + row COLLAPSE, a measured pinned-gate
(`getComputedStyle(header).position`), and `findStickyBreakingAncestor()` — which already
detects exactly what ScrollSmoother creates (a transformed ancestor → "computes sticky but
never pins").

**Resolution — (c) the header sits OUTSIDE the smoothed wrapper**, chosen over (a) reimplement
via ScrollTrigger pinning and (b) blanket mutual exclusion:

- ScrollSmoother keeps NATIVE document scroll (it counter-transforms `#smooth-content`; the
  document retains its real scroll height), so a sticky header placed as a SIBLING of the
  wrapper — containing block still `<body>`, the exact FR-37-40 model — pins natively with
  **zero rework** of the shipped system. This is also GSAP's own documented guidance (fixed/
  pinned elements outside the wrapper). In the block theme the FACT is verified: all 9
  templates share one flat top-level shape (header part / `<main>` container / footer part —
  siblings, uniformly). **The insertion mechanism is a named Wave B build item** (qc-council
  2026-07-29 — no shared wrapper filter exists today): ONE output filter that wraps everything
  between the header and the end of the footer in `#smooth-wrapper > #smooth-content` when the
  smoother setting is ON (the natural fit is a template-output buffer keyed on the
  header/footer template-part boundaries, consistent with the house `render_block` chokepoint
  style) — never 9 hand-edited template forks; setting OFF must leave templates byte-identical.
- Under (c): `headerSticky` pins natively and the measured gate stays truthful;
  `headerShrink`/`headerHideOnScroll` keep working unchanged (their listeners fire on the
  still-native window scroll); `headerTransparent` unchanged (header z-index sits above the
  wrapper; `--sgs-header-height` publication already handles content offset); row COLLAPSE is
  height-based, not sticky-based — unaffected.
- Why not (a): it reimplements a BUILT + LIVE-VERIFIED system inside ScrollTrigger and forks
  every future header behaviour into two code paths — maximum rework, permanent double
  maintenance. Why not (b) alone: it forces clients to choose between the two most-requested
  premium features when they compose cleanly under (c).
- **(b) survives as the runtime tripwire, not the primary:** if a custom template puts the
  header inside the wrapper anyway, the smoother is DISABLED for that page and a warning
  names the element — never sticky. **Build note (qc-council 2026-07-29): the existing
  `findStickyBreakingAncestor()` (`src/header-behaviours/view.js:127-152`) currently only
  `console.warn`s ("advisory, never a gate") — Wave B EXTENDS it with the disable action;
  the detection half exists, the enforcement half is new.** Failure degrades toward Tier V
  (R-31-9: the universal thing wins).
- **Edge rule (amended post qc-council — `headerSticky` is a per-tier TRI-STATE, not a
  boolean, and the header's DOM position cannot flip per breakpoint):** the header sits
  OUTSIDE the smoothed wrapper whenever `headerSticky` is truthy on **ANY tier**; on tiers
  where sticky is off, the header then scrolls at native (unsmoothed) speed — a documented,
  accepted trade-off, visually minor because an unpinned header leaves the viewport within
  the first scroll. Only when sticky is off on EVERY tier does the header stay INSIDE
  `#smooth-content` (outside it would tear against the smoothed content for the whole page).

### 4.3 Entrance (Tier V `sgsAnimation`) × scroll-scrub on the same block

**Resolution — mutual exclusivity; scrub wins; enforced at RENDER time.** A scrub timeline owns
the element's transform/opacity for its whole scroll range; an IntersectionObserver entrance
fighting it produces double-animation and broken initial states — precedence ordering cannot
fix a shared-property conflict, only hide it. Rule: when a `data-sgs-fx` scrub effect is
present on a block, the render layer suppresses the `data-sgs-animation*` attributes for that
block — **two code paths, because the entrance attrs reach the frontend two ways** (qc-council
2026-07-29): for DYNAMIC blocks the `animation-attributes.php` render_block injection simply
**omits** them; for STATIC blocks they are already BAKED into stored `post_content` at save
time (`animation.js` `blocks.getSaveContent.extraProps`, L209–233), so the render layer must
actively **STRIP** them via `WP_HTML_Tag_Processor` (the same leading-`<style>`-skip technique
`animation-attributes.php:95-111` already uses). Deterministic, content-independent.
Enforcement is render-time because stored attributes bypass the editor constantly (converter
clones, patterns, direct inserts — the D338 lesson: WP silently keeps whatever attrs are
stored; an editor-only guard is a suggestion, not a gate).
The editor mirrors it as UX: the Animation panel renders `Disabled` with a Notice ("A scroll
effect controls this block's motion — entrance animation is off") when an fx scrub attr is set
— consistent with Spec 35 Part A and the existing parallax live-site-only Notice. Non-scrub fx
(e.g. DrawSVG on load, ScrambleText) do NOT exclude entrances — only effects that own
transform/opacity across a scroll range do; the exclusion list is part of each effect's
registry row (§6), not a hardcoded pair.

### 4.4 Conditional-loading contract (D409)

**Resolution — a page-level motion registry at `render_block` priority 99 enqueuing WP script
modules; per-plugin webpack chunks with `gsap`/`gsap/*` as shared externals.**

- **Why this mechanism:** Tier G effects arrive TWO ways — dedicated blocks (which could
  self-serve via `viewScriptModule`) and **extension attributes on any block** (which have no
  per-block view module, so `viewScriptModule`-per-block cannot see them). `has_block()` has
  the known template-part blind spot. The `render_block` p99 chokepoint is the proven house
  pattern (`class-sgs-css-registry.php:134` — reuse its editor-parity predicate
  `sgs_is_frontend_render()`, which covers `is_admin()` + `wp_is_serving_rest_request()` +
  the `REST_REQUEST` fallback). Mid-render `wp_enqueue_script_module()` is proven live by the
  buybox proxy-enqueue (`buybox/render.php:328-346`).
- **Mechanism:** `SGS_Motion_Registry` inspects each rendered block (attrs + `data-sgs-fx`
  presence in markup), maps effect → plugin set (from the DB effect registry, §6), and calls
  `wp_enqueue_script_module()` for exactly the needed bundles (the buybox
  `view_script_module_ids` proxy precedent). Site-level settings (ScrollSmoother) enqueue from
  the settings check, same registry. WP's module registry dedups — ten blocks needing
  ScrollTrigger cost one enqueue.
- **Bundling:** GSAP core + each plugin is a separately REGISTERED script module built from npm
  (no CDN — D406). Webpack marks `gsap` and `gsap/*` as **externals** (`externalsType:
  'module'`) resolving to those module IDs via the script-modules import map, so no block or
  effect module ever bundles its own copy. **⚠ This externals wiring is a NAMED WAVE-A BUILD
  TASK, not an established pattern** (qc-council 2026-07-29): the current
  `webpack.config.js` only adds entry points, and `DependencyExtractionWebpackPlugin` handles
  `@wordpress/*` globals only — nothing in the repo resolves a bare `gsap` specifier today
  (the Vivus precedent is a per-block bundled chunk, the opposite shape). Wave A's done-check:
  a canary page proves `gsap` resolves via the browser's native import map and appears in NO
  consuming chunk's bundle.
- **Size budget (min+gzip, ESTIMATES from GSAP 3.12/3.13 — verified + recorded at Wave A
  build; the build fails if a bundle exceeds its budget by >20%):**

| Module | Est. gz | Loads when |
|---|---|---|
| gsap core | ~26 KB | any Tier G effect on the page |
| ScrollTrigger | ~14 KB | any scroll-driven G effect |
| ~~ScrollSmoother~~ → **Lenis** (Tier H, D422) | **5,777 bytes gzip (~5.6 KiB) — MEASURED, not an estimate** (`shared/effects/smooth-scroll.js`, includes the bundled library; the figure is the budget baseline in `scripts/motion-bundle-baseline.json`) | site setting ON |
| SplitText | ~9 KB | text reveals present |
| Flip | ~7 KB | filtered-grid pairing ON |
| Draggable + Inertia | ~15 + 6 KB | drag roster block opted in |
| DrawSVG | ~3 KB | draw effect present |
| MorphSVG | ~11 KB | morph present (asset-gated) |
| MotionPath | ~6 KB | scrubbed path present |
| ScrambleText | ~3 KB | scramble present |
| Physics/Custom easings | ~2–3 KB each | bundled inside the offering effect's chunk |

  Worst realistic page ≈ core + ScrollTrigger + SplitText ≈ **49 KB gz**; typical scroll-only
  page ≈ **40 KB gz**; page with zero Tier G ≈ **0 KB**. (These sit OUTSIDE the Tier V <10KB
  CSS + <4KB JS extension budget in Spec 02, which is unchanged.)
- **The existing anti-pattern is named:** today's Tier V motion assets enqueue unconditionally
  on every page (6 assets, runtime self-gating — `class-sgs-blocks.php`
  `enqueue_frontend_assets()`). Tier G MUST NOT repeat this; migrating Tier V assets onto the
  same registry is a Wave C stretch item (FR-38-24), not a precondition.

### 4.5 Reduced motion (per effect — §10 table)

Every effect defines **suppress vs simplify** individually, consistent with the house pattern:
the canonical check is `prefersReducedMotion()` (LIVE per call — `motion-utils.js`), plus
`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` as the Tier G registration gate so
a mid-session OS change reverts/kills active tweens. CSS-side kill switches follow the existing
`@media (prefers-reduced-motion: reduce)` blocks. Spec 35 Part C/E5/L: gated from day one,
never bolted on; the FAIL-CLOSED prebuild inspector-conformance gate applies to every new fx
control surface.

### 4.6 Editor canvas story (per effect — §9 table)

Scroll effects cannot preview in a static canvas (Spec 37 precedent; the parallax Notice
precedent). §9 defines per effect: static end-state, a preview toggle, or a labelled
no-preview. No effect ships without its editor story implemented — a canvas that silently
shows nothing is a defect (Spec 35 Part A1: the client must be able to function).

### 4.7 Cloning contract (§11)

Every effect maps to the **`data-sgs-fx-*`** draft grammar (first claimed by this spec — no
prior reservation exists anywhere; verified repo-wide 2026-07-28). `data-sgs-scroll-*` is
deliberately left UNCLAIMED (§11.1). Unrecognised fx values → **skip-with-reason** per class
(Rule 4) — never silent, never a guess. Tier 2 cloning (the converter lift) is DEFINED now,
ships later; the grammar is stable from day one so drafts authored today clone tomorrow.

## 5. Functional requirements (with done-criteria)

The ROSTER FRs are defined in §3, not here — FR-38-6 … FR-38-19, plus the later additions
FR-38-25 (cursor field, §3.3), FR-38-26 (looping carousels, §3.3) and FR-38-27 (physics canvas,
§3.3). Each carries its own done-criteria inline. **A new capability FR belongs in §3 + the §2
taxonomy table, not in this list** — this section is infrastructure only:

- **FR-38-1 — the two-tier doctrine is written, homed, and cross-linked.**
  *Done when:* §1 exists; all five written homes carry the one-line amendment; D406 logged;
  Spec 36 unaffected-statement present.
- **FR-38-2 — Tier G runtime provider conforms to the house contract.**
  `src/shared/effects/gsap/provider.js`: registers plugins, sets `gsap.defaults`, wires the
  global `matchMedia` reduced-motion gate + bfcache `pageshow`(`persisted`) teardown; every
  effect module exports `initX( el, opts ) → cleanup()` (cleanup kills its tweens/triggers);
  fail-open no-JS (SSR markup = finished state; initial hidden/offset states applied only by
  JS behind the `sgs-js` gate); JS writes custom-property VALUES or gsap-managed inline
  transforms only — never inline `style` in SSR markup (Spec 32).
  *Done when:* provider + ≥1 effect module pass a no-JS render check (content fully visible
  with JS blocked), a reduced-motion live-toggle check, and a bfcache back-nav check.
- **FR-38-3 — the conditional-loading registry (§4.4).**
  *Done when:* a page with zero Tier G effects serves zero gsap bytes (network-verified); a
  page with one scrub serves exactly core+ScrollTrigger; ten same-effect blocks produce one
  enqueue; the editor-parity predicate keeps ServerSideRender previews unaffected.
- **FR-38-4 — the `data-sgs-fx-*` grammar (§11).**
  *Done when:* the grammar table exists; no collision with the in-use namespaces
  (`data-sgs-animation*`, `data-sgs-path-draw*`, `data-sgs-parallax`, `data-magnet`,
  `data-spotlight`, `data-stagger`, `data-animation`); attrs are attr-per-property (suffix
  grammar); the DB rows (§6) exist.
- **FR-38-5 — entrance × scrub exclusivity (§4.3).**
  *Done when:* render-time suppression verified on **both paths** — one DYNAMIC-block instance
  (omit path) AND one STATIC-block instance with the attrs baked into stored markup (strip
  path) — each carrying both attr families; editor Disabled+Notice mirror present; exclusion
  driven by the registry flag, not a hardcoded effect list.
- **FR-38-20 — per-effect reduced-motion contract (§10).**
  *Done when:* every roster effect has a row; each is live-verified with OS emulation where
  the harness allows, and reasoned-by-construction rows are explicitly flagged (the
  P-ROW-COLLAPSE-RESIDUALS honesty pattern).
- **FR-38-21 — per-effect editor-canvas story (§9).**
  *Done when:* every roster effect has a row and its implemented story matches it.
- **FR-38-22 — cloning contract defined (§11).**
  *Done when:* grammar + skip-with-reason rule are in-spec; converter work is explicitly
  MAPPED to a later stage (Spec 31 attr-routing extension), not silently dropped (STOP-29).
- **FR-38-23 — DB seeding (§6).**
  *Done when:* the seeder + reseed-guard exist and a full `/sgs-update` rebuild reproduces the
  seed byte-identically.
- **FR-38-24 — verification canaries + budget gates.**
  Tier G adds gate canary pages exercising each effect family (the
  P-NO-INLINE-GATE-COVERAGE-GAPS obligation: today's canaries never exercise
  animation-attributed instances); bundle-size budget check wired to prebuild; Wave C stretch:
  migrate Tier V motion assets onto the conditional registry.
  *Done when:* each shipped wave's effects have a canary URL the gates exercise; prebuild
  fails on budget breach — breach = **>20% over the §4.4 figures as verified + recorded at the
  Wave A build** (the §4.4 numbers are estimates until then; the gate compares against the
  recorded actuals, not the estimates).

## 6. DB seeding plan (R-31-8 — real tables, enumerated 2026-07-28)

**Verified existing:** `animation_tokens` (7 rows, `used_by` all NULL — an unwired registry to
EXTEND, not duplicate); `roles` already has `motion`; ~64 `block_attributes` rows carry
`role='motion'`; `css_property` already uses the `anim:*` pseudo-namespace
(`anim:duration|easing|preset|parallax|stagger|trigger`); `preset_implications`
(`effectHover`, 6 values + implied properties) is the registry-shape precedent. **Verified
genuine gaps:** no motion capability in `block_capabilities` (39-value vocabulary);
no motion `modifier_suffixes`; `design_tokens.token_type` CHECK (`colour|font|spacing|size|shadow`)
blocks motion tokens without a migration. **Out of scope:** the uimax `animations` table lives
in a DIFFERENT DB (not `sgs-framework.db`) — never cited as seedable here (P-CP-3 caveat).

Seeding (all via an idempotent editorial seeder `scripts/seed-motion-fx-registry.py`, modelled
on `seed-composition-roles.py` — [ok]/[skip]/[set] passes, docstring changelog, plus a
`db-consistency/check_motion_fx_reseed.py` guard so the seed survives `/sgs-update` rebuilds):

1. **Effect registry** — new table `fx_effects` (`effect` PK e.g. `pin-scrub`, `tier` V|G,
   `plugin_set` JSON, `owns_scroll_transform` 0|1 → drives §4.3 exclusion, `reduced_motion`
   suppress|simplify, `editor_story` end-state|toggle|no-preview). Proposed NEW table —
   justified because no existing table keys by effect; `animation_tokens` keys by keyframe
   preset and stays the Tier V preset store.

   > ⚠ **DEAD ROW — confirmed 2026-08-02 (register item 3), NOT YET REMOVED (DB writes are
   > out of scope for the session that found this).** `fx_effects` still carries an
   > `effect='scroll-smoother', tier='G', plugin_set=["ScrollSmoother"]` row from before D422
   > (2026-07-30) moved site-level smoothing to Lenis (Tier H). No Lenis/`smooth-scroll` row
   > exists in this table at all — correctly, since Lenis is a SITE setting, never reached via
   > the `data-sgs-fx` grammar, so it was never meant to gain a `fx_effects` row (this table is
   > specifically the per-element fx grammar registry). The `scroll-smoother` row is therefore
   > pure leftover, not a placeholder for something that should replace it.
   >
   > **Verified zero references:** `generate-fx-qualifying-blocks.py`'s structural roster,
   > `fx.js`'s `SHIPPED_EFFECTS`, and `fx-attributes.php`'s `FX_ATTR_MAP` all key on the current
   > 15-row live set (`pin-scrub`, `scrub`, `horizontal-panel`, `split-reveal`, `scramble`,
   > `flip`, `draggable`, `draw`, `morph`, `motion-path`, `image-sequence`, `page-transitions`,
   > `cursor-field`, `carousel-loop`) — `scroll-smoother` appears in none of them, so deleting
   > the row cannot break a live consumer.
   >
   > **SQL to run (Bean/DB-write owner only):**
   > `DELETE FROM fx_effects WHERE effect = 'scroll-smoother';`
2. **`block_attributes`** — fx param attrs seeded with `css_property` under a new **`fx:*`**
   pseudo-namespace (sibling of `anim:*`; aligns with the approved-unbuilt FR-35-6 `anim:*`
   settings-cluster — recorded in **decisions.md D354**, not in Spec 35's own text — the `fx`
   cluster registers alongside it, never replacing it).
3. **`block_capabilities`** — new capability values `fx-scrub`, `fx-draggable`, `fx-flip`,
   `fx-svg` seeded from `supports.sgs.fx.*` declarations by `/sgs-update` (source-derived, so
   this part lives in the update populator, not the editorial seeder).
4. **`modifier_suffixes`** — no new rows in v1 (fx params are base-tier; a per-tier fx value is
   a v2 candidate and would use the EXISTING breakpoint suffixes — never a new vocabulary).
5. **`animation_tokens`** — reconcile the store: add the missing `fade-up` row (used as a
   default by 10 blocks but absent), wire `used_by`, and record that Tier G does NOT read this
   table (it is the Tier V preset store).
6. **`design_tokens.token_type` migration** — widen the CHECK to admit `motion`
   (duration/easing tokens) via `migrations/YYYY-MM-DD-motion-token-type.py`; deferred to the
   wave that first needs a seeded motion token (Wave A ships without it — theme.json
   `--wp--custom--duration/easing--*` already serve).

> ⚠ **`sgs_get_fx_qualifying_blocks()` is DEAD CODE — verified 2026-08-02 (register item 5),
> recommendation: DELETE (not executed this session — see below).**
>
> **Evidence.** `includes/generated-fx-qualifying-blocks.php` defines this function, but a
> repo-wide grep for its name finds only its own definition — zero callers in any `.php` or
> `.js` file. The file that defines it is also never `require`'d by `class-sgs-blocks.php` (the
> plugin's central includes loader) or anywhere else, so the function does not even exist at
> WordPress runtime today. The docstring's implicit claim that this feeds "the render layer"
> is false: `class-sgs-motion-registry.php` (the actual FR-38-3 conditional-loading registry,
> §4.4) detects effects by regex-scanning rendered markup for `data-sgs-fx="…"` directly
> (`/data-sgs-fx="([a-z0-9-]+)"/i`), never by consulting a per-block structural-qualification
> map. That is also the MORE correct mechanism for that job — the registry needs "does this
> rendered instance actually carry the effect", not "could this block type ever carry it".
>
> The JS twin (`src/blocks/extensions/generated-fx-qualifying-blocks.json`) is NOT dead — `fx.js`
> imports and uses it to gate which effects appear in a given block's editor picker (`§7`). Only
> the PHP twin is orphaned.
>
> **Recommendation: DELETE**, not WIRE — there is no unmet need for a PHP-side structural map;
> the render layer's markup-sniff already covers the equivalent job more accurately, and the
> editor-side need is already served by the JSON file. Full removal is a 4-file change
> (`generate-fx-qualifying-blocks.py`'s `_render_php`/`PHP_OUTPUT` writer, the generated
> `.php` file itself, `check_fx_qualifying_blocks_stale.py`'s PHP-side check, and a docstring
> line in `sgs-update-v2.py`'s Stage 12 description) — **not executed in this session**
> deliberately: `run-motion-fx-generators.js` re-runs this generator on every `npm run build`
> (wired into `prebuild`), so touching the generator mid-session on a shared worktree with two
> other active tracks risks regenerating shared artefacts (`generated-fx-qualifying-blocks.json`
> included) out from under them. Recorded here as an owed follow-up rather than actioned.

## 7. Inspector surface (Spec 35-compliant sketches)

Binding: ToolsPanel once ~6+ controls (Part A5); never duplicate a native supports panel (A6);
`hideExtensions` opt-out honoured (A7); 768/1024 tiers only where responsive (D2);
reduced-motion gate day-one (E5/Part C/L); the FAIL-CLOSED `audit-inspector-conformance.js`
prebuild gate covers every new panel automatically.

- **Block-level fx panel ("Scroll & effects")** — ONE collapsed panel in the Styles tab,
  ToolsPanel-based: effect picker (`ToggleGroupControl`/`ComboboxControl` per §35 Part H),
  then per-effect params as `ToolsPanelItem`s (1–3 `isShownByDefault`, rest behind "+"),
  each with reset. Scrub params: start/end (`UnitControl` viewport %), scrub smoothing
  (`RangeControl` with input+reset), stagger (`UnitControl` ms). The §4.3 Notice renders here.
- **SplitText** — on text-bearing blocks inside the same fx panel: split-by
  (`ToggleGroupControl` char/word/line), mask toggle, stagger, delay.
- **Draggable** — roster blocks only (capability-gated): enable toggle, inertia toggle, axis
  (`ToggleGroupControl` x/y/both), bounds preset.
- **Flip pairing** — surfaced on BOTH paired blocks as one toggle each ("Animate re-filtering")
  + duration/easing on the grid side; a Notice names the paired partner when only one side is
  present.
- **Site level (ScrollSmoother + page transitions)** — SGS settings surface (theme settings
  page / Site Editor panel), NOT block inspectors: smoother on/off + strength
  (`RangeControl`), transitions on/off + style per template. Both carry inline help naming
  their §4 conditions (sticky, reduced-motion, editor-off).
- **MorphSVG** — asset-gated: the panel renders `Disabled` with guidance-linked help text
  until both path assets are present.

## 8. Implementation waves + blast radius

Grouping is by SHARED INFRASTRUCTURE, not size. B and C both depend only on A; B ∥ C possible.

- **Wave A — shared infrastructure + scroll core + SplitText.**
  The registry/loader (FR-38-3), gsap module registration + webpack externals, the
  `src/shared/effects/gsap/` provider (FR-38-2), the `data-sgs-fx` grammar + DB seeding
  (FR-38-4/23), the entrance-exclusivity rule (FR-38-5 — it governs scrub, so it lands with
  scrub), pin+scrub (FR-38-6), element timelines (FR-38-7), horizontal panel (FR-38-8),
  SplitText (FR-38-10 — validates plugin-splitting with a non-scroll plugin), canaries for all
  of the above (FR-38-24).
  **Blast radius: ADDITIVE ONLY** — no existing Tier V system, shipped block, or template is
  modified; the only shared-file touches are the new registry include + webpack externals.
- **Wave B — site level: smooth scrolling (Tier H) + page transitions.**
  FR-38-18 (Lenis, D422), FR-38-19 (cross-document View Transitions).
  **Blast radius REDUCED BY D422 — this wave no longer touches the Spec 37 header system or any
  theme template.** The wrapper-insertion filter and the header relocation were the entire
  reason this wave was "the highest-risk surface, deliberately quarantined"; with a smoother
  that creates no wrapper, both are cancelled (§4.2). What remains is additive: one script
  module + one stylesheet + one settings page, plus template-level `@view-transition` CSS for
  FR-38-19.
  **The FR-37-40 regression gate is RETAINED, deliberately, and reduced in scope.** It is now a
  *regression check* rather than a verification of engineering this wave performed: smoothing
  changes scroll TIMING, and shrink / hide-on-scroll / row-collapse / the transparent flip are
  all driven by scroll listeners, so they must still be observed with the setting OFF **and**
  ON — pinned-gate, shrink, hide-on-scroll, transparent, **row collapse** (it rides the same
  `isHeaderPinned()` gate), scroll-padding, plus the two named sub-cases (qc-council
  2026-07-29): sticky+transparent same-tier coexistence (a proven-live past regression class)
  and the nav-drawer `<dialog>`-in-header offset. **Do not drop this gate on the grounds that
  "nothing touches the header now" — that is the argument, not the evidence.**
  Additional Wave B checks introduced by D422: iframe interactivity at rest and mid-scroll on a
  page carrying an `sgs/media` embed (§3.5 condition f), and touch scrolling verified native on
  a real narrow viewport (condition d).

  > **Wave B regression gate — RUN AND CLOSED 2026-07-30 (D424).** Both named sub-cases were
  > executed with smoothing ON, on the canary:
  > · **sticky + transparent on the SAME tier — PASS.** The live header is `position: sticky`
  > *and* carries `is-row-transparent-active` at 1440, so the combination occurs without
  > reconfiguration. Across 17 samples the header held `top: 0.00` and `sticky` — **including
  > mid-flight** — while the transparent row's background ramped `alpha 0 → 0.408 → 0.847 → 1`
  > and returned cleanly to transparent at the top. `--sgs-header-height` steady at 93px.
  > Non-vacuous: `lenis-smooth` was confirmed active throughout.
  > · **nav-drawer `<dialog>` × transformed ancestor — PASS, and the risk note was wrong about
  > the DOM.** `header-behaviours.css` describes the drawer as opening *inside* a transformed
  > `header.sgs-site-header`. On this build the drawer's parent chain is `BODY → HTML` — it is
  > **not a header descendant at all**, so a header transform could never reach it, and a test
  > using one is vacuous by construction. Re-run against a genuine ancestor (`body`) with a
  > negative control: an ordinary `position: fixed` probe moved **−80px**, proving the detector
  > works, while the open `<dialog>` moved **0**. Top-layer resolution against the viewport is
  > therefore CONFIRMED empirically, not merely cited. **Caveat kept honest:** the transform was
  > applied directly rather than by enabling hide-on-scroll, so the *setting* path is still
  > unexercised end-to-end; and if a future build nests the drawer inside the header, the
  > ancestry premise changes and this should be re-read (though the top-layer result would still
  > hold). The `header-behaviours.css` comment should be corrected to match the real DOM.
- **Wave C — interaction + SVG + toys.**
  Draggable roster (FR-38-13) incl. **NET-NEW `sgs/before-after`** (needs Draggable — cannot
  come earlier), Flip pairing (FR-38-12 — the one place Wave C edits shipped blocks:
  filter-search + card-grid), DrawSVG + **Vivus retirement** (FR-38-15), MorphSVG (FR-38-16,
  P-10 revival), MotionPath scrubbed mode (FR-38-17 — its Tier V `offset-path` variant may ship
  any time, no GSAP needed), ScrambleText (FR-38-11), `sgs/image-sequence` + asset-pipeline
  tooling (FR-38-9). Stretch: Tier V asset migration onto the registry (FR-38-24).
  **Blast radius: per-block.** The two shipped-block touches (pairing contract; responsive-logo
  runtime swap) each get a before/after live check; everything else is new blocks/modules.
  If C needs splitting, cut along the pairing seam: C1 = Flip + Draggable + before-after;
  C2 = SVG + text toys + image sequence.

## 9. Editor canvas story (per effect)

| Effect | Canvas shows |
|---|---|
| Pin+scrub, element scrub, horizontal panel | **Static end-state** (timeline at progress=1) + panel Notice "Scroll effects preview on the live site" (parallax-Notice precedent) |
| Image sequence | Poster frame + Notice |
| SplitText / ScrambleText | Plain (unsplit) text; optional **preview toggle** replays the reveal once in-canvas (no scroll needed — time-based preview) |
| Flip | Labelled no-preview (filter interaction doesn't exist in-canvas); Notice names the pairing |
| Draggable | Static; Notice "Drag interactions are live-site only" |
| DrawSVG / MorphSVG / MotionPath | End-state (fully drawn / final shape / resting position); optional replay toggle for load-triggered draw |
| Physics/Custom easings | No standalone canvas story — a flavour; inherits its host effect's row |
| Smooth scrolling (Lenis) / page transitions | **Never active in editor or wp-admin** (FR-38-18/19 condition) — settings-surface help text states it |

## 10. Reduced-motion contract (per effect)

Canonical check: `prefersReducedMotion()` LIVE per call + `gsap.matchMedia` registration gate
(mid-session change kills/reverts tweens). CSS kill-switches per the existing house pattern.

| Effect | Behaviour under reduce |
|---|---|
| Pin+scrub section timeline | **Simplify:** no pin, no scrub; content renders at end-state in normal flow |
| Element scrub timelines | **Simplify:** end-state, static |
| Horizontal scroll panel | **Simplify:** falls back to native horizontal scroll-snap (content reachable, nothing moves by itself) |
| Image sequence | **Simplify:** poster/final frame only |
| SplitText | **Simplify:** no split/mask; whole-element plain fade at most, else static |
| ScrambleText | **Suppress:** plain text, no scramble ever |
| Flip | **Suppress:** instant re-layout (today's behaviour) |
| Draggable/Inertia | **Simplify:** drag still works (it is user-driven input, not autonomous motion) but momentum/physics release is off; snap is instant |
| Physics easings | Follow their host effect's row |
| DrawSVG | **Simplify:** rendered fully drawn (no animated stroke) — upgrades Vivus's non-canonical 1ms-draw arm |
| MorphSVG | **Suppress:** final shape only |
| MotionPath | **Suppress:** rests at the client-chosen resting position (D441, 2026-08-01 — CSS applies `--sgs-fx-motion-path-rest-y` unconditionally under `prefers-reduced-motion: reduce`, the same custom property the normal-motion handoff uses; superseded the earlier "matches existing decorative-image reduced-motion arm" wording, which predated the resting-position control and meant "wherever the server rendered it") |
| Smooth scrolling (Lenis, Tier H) | **Suppress:** native scroll. Live AND reactive — the instance is destroyed on a mid-session change to `reduce`, and rebuilt on a change back (FR-38-18 condition b) |
| Page transitions | **Suppress:** instant navigation |
| Cursor-reactive field (FR-38-25) | **Simplify:** the emitted field itself has no per-frame animated motion to gate — it is an rAF-throttled custom-property WRITE tracking the pointer, not a tween — so the participant CSS renders identically; the only thing genuinely gated is whatever CSS transition a field TYPE's own implementation attaches, unchanged by this FR |
| Cursor-reactive field — `floating-objects` type (FR-38-25, once built) | **Simplify to a fixed resting transform, never suppress the object.** Differs from the `glow`/`spotlight-mask` SIMPLIFY case above: those rest as a static PAINT (a legitimate finished state); an autonomously-moving OBJECT has no equivalent "just stop tracking" answer, because the object is content an operator placed deliberately (`degrade-to-more-content-never-less`). Under `prefers-reduced-motion: reduce` the object renders at its AUTHORED static position (`transform: none`), identical to the fail-open no-JS state — the reduced-motion state and the no-JS state are the SAME state, needing no separate code path. |
| Carousel loop (FR-38-26) | **Measured 2026-08-02 (register item M2).** Unstated in this spec until now — the module's own docblock only argued by analogy that it should be a no-op. **Confirmed identical under reduce**, by direct measurement on 4 of 5 rollout blocks with a real `reducedMotion:'reduce'` browser context (`scripts/motion-qa/probe-carousel-loop.mjs`, Arm 1): clones still insert, still neutralise (`inert`+`aria-hidden`), and the boundary `scrollLeft` re-seat still fires — because the correction is an instantaneous position WRITE, never a tween, so there is no animation for `prefers-reduced-motion` to gate either way. Negative control (proves the emulated context is real, not self-reported): each block's own arrow-click DOES branch on reduce where implemented — `sgs/gallery`/`sgs/post-grid` pass `auto` vs `smooth` to `scrollIntoView` correctly (post-grid's `behavior` was misspelled `behaviour`, a silent no-op discovered and fixed live this session, `plugins/sgs-blocks/src/blocks/post-grid/view.js`); `sgs/trustpilot-reviews` and `sgs/google-reviews` passed a HARDCODED `'smooth'` regardless of `prefers-reduced-motion` — a real defect in those two blocks' own arrow-click code, NOT in the loop module. ✅ BOTH FIXED same day (`5c45f879`, `ba28ab92`): each now reads the media query fresh per call. The sweep caught a third instance the measurement missed — a SECOND `scrollIntoView` in post-grid still spelled `behaviour`. The one remaining hardcoded `'smooth'` (google-reviews autoplay) is correctly gated by an early return under reduce. |

## 11. Cloning contract — the `data-sgs-fx-*` draft grammar (first home)

### 11.1 Namespace claim

This spec claims **`data-sgs-fx-*`** (verified unclaimed repo-wide, 2026-07-28) and
deliberately leaves **`data-sgs-scroll-*` unclaimed**: scroll params are just fx params, and a
second namespace would invent a V-vs-G boundary in markup that does not exist in the model.
In-use namespaces this must not collide with (verified none prefix-overlap):
`data-sgs-animation*`, `data-sgs-path-draw*`, `data-sgs-parallax`, `data-magnet`,
`data-spotlight`, `data-stagger`, `data-animation` (responsive-logo), and the global CSS
custom property `--sgs-scroll-progress` (set by `assets/js/scroll-progress.js` — there is no
`sgsScrollProgress` block attribute; corrected post qc-council).

### 11.2 Grammar (attr-per-property — converter-suffix-compatible)

```
data-sgs-fx="<effect>"            e.g. pin-scrub | scrub | horizontal-panel | split-reveal |
                                       scramble | flip | draggable | draw | morph | motion-path |
                                       image-sequence
data-sgs-fx-trigger="<value>"     load | scroll | hover (per-effect enum)
data-sgs-fx-start / -end          scroll range (viewport-relative, e.g. "top 80%")
data-sgs-fx-hold="<value>"        none | short | standard | long — PINNING effects only:
                                  how much of the pin is spent holding the finished
                                  state before releasing (fraction of the pin, not px)
data-sgs-fx-scrub                 true | <smoothing number>
data-sgs-fx-stagger               ms | s
data-sgs-fx-duration / -ease      token or literal (easing may name a physics flavour)
data-sgs-fx-momentum="false"      DRAGGABLE only — opt-out of Inertia's release-momentum
                                  coast (`dragMomentum` block attr → `fx:momentum`, seeded
                                  in `block_attributes`; live on buybox/gallery/
                                  google-reviews/post-grid/trustpilot-reviews render.php,
                                  read by `fx-draggable.js`'s `momentumRequested()`).
                                  Attribute PRESENT AT ALL is the "off" signal — no
                                  attribute (the default) means momentum is ON; this is
                                  the inverse of every other boolean fx flag in this
                                  grammar, and is unusual enough to flag explicitly for
                                  a future converter mapping. Corrected into this table
                                  2026-08-02 — the attr shipped and was seeded in the DB
                                  without ever being added here (register item 1).
data-sgs-fx-shape="<preset|custom>"     MORPH only — which shape pair to morph between
data-sgs-fx-path="<preset|custom>"      MOTION-PATH only — which route to travel along
data-sgs-fx-motion-path-rest="<preset>"     MOTION-PATH only — below-header | middle |
                                             lower-third | custom (D441; unset = middle)
data-sgs-fx-motion-path-rest-vh="<0-100>"   MOTION-PATH only — 5vh-stepped fine-tune, CUSTOM
                                             preset only (D441)
data-sgs-fx-morph-target="<selector>"       resolved TARGET element (render-layer output)
data-sgs-fx-motion-path-target="<selector>" resolved TARGET element (render-layer output)
data-sgs-fx-pin="true"            IMAGE-SEQUENCE only — holds the block in place for the
                                   whole scrub instead of letting it scroll normally
data-sgs-fx-disable-tablet="true" / data-sgs-fx-disable-mobile="true"
                                   ANY fx effect — per-breakpoint kill switch (D446 Task 15,
                                   2026-08-01), named with the existing device-tier suffix
                                   vocabulary. Boolean-shaped: presence means disabled, so
                                   `fx-attributes.php` and `fx.js` both special-case these
                                   two outside the generic value-or-absent FX_ATTR_MAP loop.
                                   Added to this table 2026-08-02 (register item 6) — the
                                   block attrs (`fxDisableTablet`/`fxDisableMobile`) and
                                   `block_attributes` rows already existed but this grammar
                                   table never listed them.
```

> **`fxPreset` is deliberately NOT part of this grammar.** It is a real, seeded `block_attributes`
> row (`fx:preset`) and a real client-facing control (the §7 intensity-preset layer) — but a
> preset only WRITES the params above into the block's stored attributes at authoring time; no
> runtime ever reads a `data-sgs-fx-preset` markup attribute, so emitting one would put an inert
> attribute in the DOM. Noted here so its absence from the grammar table above is never mistaken
> for a gap (register item 6 cross-check).

> **AMENDMENT 2026-08-01 (D435) — `data-sgs-fx-pin` / `fxPin` added, and `sgs/image-sequence`'s
> default scrub window redefined as "fully visible only".** Two owner rulings on
> `sgs/image-sequence`:
>
> 1. **Scrub only while the canvas is fully on screen, by default.** The 2026-07-31 `top 80%` /
>    `+=150%` fixed-pixel window (see the amendment immediately above FR-38-9 in §3.1) still let
>    the block scrub while only partially visible. `fx-image-sequence.js` now anchors `start`/`end`
>    to live-measured element-edge-vs-viewport-edge positions (block bottom vs viewport bottom;
>    block top vs the header-cleared viewport top) rather than any fixed percentage or distance —
>    see `computeVisibilityWindow()` in that file for the derivation, including the documented
>    rejection of a same-anchor shorter window (it reproduces the exact "mirror" defect this
>    replaces) and the taller-than-viewport fallback (the window during which the viewport is
>    fully contained in the block, since true full-visibility is geometrically impossible there).
>    `data-sgs-fx-start`/`-end` still override this per instance, unchanged.
> 2. **Pinning is now a first-class inspector toggle**, not a composition workaround. The owner
>    rejected the "nest inside `sgs/container` with `pin-scrub` composed around it" guidance as
>    "janky", "useless without pinning" and "patchwork". `fxPin` (block attribute, boolean,
>    default `false`) emits `data-sgs-fx-pin="true"` on the canvas; `fx-image-sequence.js` reads
>    it and pins its own trigger element (no extra wrapper markup) for the resolved scroll
>    distance, so pin ON behaves like the old ad-hoc composition but needs no client-built
>    structure. Pin OFF leaves no pin-spacer or repositioning behind (`ScrollTrigger.kill(true,
>    false)` on cleanup/teardown).
>
> `fxPin` is seeded in `block_attributes` under `fx:*` alongside the other `fx*` attrs (§11.3).

> **AMENDMENT 2026-07-31 (D427) — the morph / motion-path CONTROL SURFACE, Bean-signed.**
>
> ⚠ **CORRECTED 2026-08-01 (D452) — the claim below was FALSE WHEN WRITTEN.** Morph had NEVER
> animated on any block: `fx-shape-routes.php` emitted `data-sgs-fx="morph"` on the injected
> `<svg>` wrapper, and MorphSVGPlugin refuses an `<svg>` container outright. Measured: the `d`
> attribute unchanged across 148 animation frames. Read "both engines working" below as "both
> engines SHIPPED" — motion-path worked, morph did not.
>
> **The problem this closes.** Wave C shipped both engines working, but with no way for a
> client to reach them. `fx-morph.js` and `fx-motion-path.js` each resolve a CSS SELECTOR
> (`data-sgs-fx-morph-target` / `-motion-path-target`) to an element and read its geometry —
> attributes that existed in **no §11.2 grammar, no `block_attributes` row and no control**.
> A CSS-selector textbox is also unusable by a tech-illiterate client, which is why §7 already
> required an ASSET-GATED picker with authoring guidance rather than a bare toggle.
>
> **Signed shape: PRESETS FIRST, CUSTOM ASSET BEHIND "ADVANCED".**
> - `data-sgs-fx-shape` / `data-sgs-fx-path` name a CURATED PRESET (morph pairs:
>   circle↔square, plus↔cross, play↔pause, logo↔icon; paths: arc, S-curve, orbit, figure-8).
>   The client picks a THUMBNAIL. Zero asset preparation, works on day one.
> - The value `custom` switches the control to a media-library SVG picker (the
>   `sgs/responsive-logo` `svgAnimationSource` precedent — media library only, never inline
>   SVG paste, which is an XSS vector).
> - The panel stays DISABLED with guidance-linked help text until a preset or asset is
>   chosen — §7's asset gate, satisfied by a state a client can actually reach.
>
> **Why this needs NO runtime change.** Both modules already accept "an element in the DOM
> whose geometry is the target". The preset layer therefore sits ABOVE that contract rather
> than replacing it: the RENDER LAYER expands a preset key (or an uploaded asset) into a
> hidden `<svg>` carrying the path, and emits the existing `-target` selector pointing at it.
> `fx-morph.js` and `fx-motion-path.js` are untouched. The two `-target` attributes are
> therefore documented above as **render-layer OUTPUT, not an authoring surface** — a draft
> never hand-writes them, and the cloning contract (§11.3) maps `-shape`/`-path`, never the
> resolved selector.
>
> **Rejected, with reasons, so they are not re-proposed:** a media-library picker ALONE (works
> only for someone who already has matched-topology SVGs — in practice the framework author
> and nobody else); presets ALONE (impossible to misuse, but a framework meant to clone
> arbitrary drafts cannot have a fixed shape ceiling); a CSS-selector textbox (what the Wave C
> agents implicitly assumed — fails §7 outright).
>
> **Status: BUILT + SHIPPED — CORRECTED 2026-08-02 (register item 2).** The line above ("DESIGN
> SIGNED, NOT YET BUILT") is stale and was false when re-checked this session. All five owed
> items exist: the preset data files (`includes/fx-path-routes.json`,
> `includes/fx-shape-routes.json`), the render-layer expansion (`includes/fx-path-routes.php`,
> `includes/fx-shape-routes.php`), the `block_attributes` rows under `fx:*` (`fxPath`,
> `fxPathAsset`, `fxPathRotate`, `fxPathRest`, `fxPathRestVh`, `fxShape`, `fxShapeAssetFrom`,
> `fxShapeAssetTo` — all seeded in `scripts/seed-motion-fx-registry.py`), the thumbnail pickers
> in the fx panel (`fx.js` — `ToolsPanelItem` + `ToggleGroupControl` + `RouteOption` thumbnails
> for both routes and shape pairs, asset-gated media-library pickers for `custom`), and both
> `motion-path` and `morph` are present in `SHIPPED_EFFECTS`.
>
> These attrs are registered via the block-editor `registerBlockType` filter in
> `src/blocks/extensions/fx.js`, not declared per-block in any `block.json` — a `grep` for
> `fxShape`/`fxPath` across `block.json` files finds nothing and looks like an absence; it is
> the known extension-registered-attrs blind spot (memory:
> `feedback_extension_registered_attrs_invisible_to_blockjson_audits`), not a missing build.
>
> **One genuine caveat carries forward, and is NOT resolved by the above:** D452 (2026-08-01)
> found morph had never actually animated on any block — `fx-shape-routes.php` was emitting the
> `data-sgs-fx="morph"` marker on the `<svg>` wrapper instead of the inner `<path>`, and
> MorphSVGPlugin refuses an `<svg>` container outright. The fix (move the marker onto the
> `<path>`) is committed but, per D452's own text, still UNVERIFIED live — no one has yet
> watched an element morph post-fix. So: the CONTROL SURFACE (what this amendment is about) is
> genuinely built and reachable; the MORPH EFFECT ITSELF is fixed-on-paper only. Motion-path has
> no equivalent caveat — it was never reported broken.

One effect per element in v1 (a draft needing two composes wrapper elements). Attr-per-property
(NOT a JSON blob) because: the Spec 31 suffix grammar clones it (base attr + suffix — the same
`{base}{Param}` shape as tiers/states, §3.A steps 4/4a); the registry's render-time sniff is a
cheap prefix scan; pattern authors can hand-write it.

### 11.3 Converter mapping (defined now, lifted later)

Each `data-sgs-fx*` attr maps 1:1 to a block fx attr (`fx`, `fxTrigger`, `fxStart`, `fxEnd`,
`fxHold`, `fxScrub`, `fxStagger`, `fxDuration`, `fxEase`, `fxPin` — seeded in `block_attributes`
under `fx:*`, §6.2). `fxPin` is IMAGE-SEQUENCE-only (D435, 2026-08-01).

> **AMENDMENT 2026-07-30 (D417) — `data-sgs-fx-hold` / `fxHold` added to §11.2 and to the list
> above.** Owner-reported against FR-38-6: a pinned section released the instant its last child
> finished animating, so the assembled composition was only visible for ~100px of scrolling
> (measured on the canary: last child settled at 89% of a 900px pin). GSAP provides no dwell — a
> pin lasts exactly as long as `end` and `scrub` stretches the timeline across all of it — so a
> hold exists only where the timeline deliberately leaves room. Implemented as trailing dead time
> on the timeline rather than a longer `end`, because lengthening the pin would also slow every
> child's entrance, changing the choreography's feel in order to fix its ending. Default
> `standard` = 33% of the pin. Applies to PINNING effects only (`fx_effects.pins = 1`); a
> non-pinning effect has no "afterwards" to hold. The lift is an extension of the Spec 31 §3.A dispatch (a routing-unit class alongside
CSS decls + content), mapped to a named later stage — NOT built in Wave A (STOP-29: deferral
mapped, not dropped). **Skip-with-reason (Rule 4):** an unrecognised `data-sgs-fx` value, an
fx on an element whose resolved block declares no fx attrs, or a param outside its enum is
reported per class in the conversion report (`skipped: fx <value> — <reason>`) — never silent,
never coerced.

### 11.4 Draft-authoring note

`/uimax` draft vocabulary gains the fx grammar so Bean-controlled drafts can declare motion
intent from day one; live-scrape ingestion NEVER emits fx attrs (motion intent cannot be
reliably inferred from scraped JS — an inferred effect is a guess, and guesses are banned).

## 12. Dependencies + related docs

- **Runtime dependency:** `src/shared/effects/` house contracts (motion-utils LIVE
  reduced-motion check, shared rAF budget, init→cleanup, fail-open). The mega-menu effects are
  live-proven; the one open motion residual is P-ROW-COLLAPSE-RESIDUALS (reduced-motion arm of
  the Spec 37 row collapse — unproven, honesty-flagged). Stated dependency, not a blocker.
- **Spec 31** — cloning contract extension point (§11.3); "Tier 1/2" naming collision avoided
  (§1.5). **Spec 32** — no-inline contract binds all fx CSS output. **Spec 35** — inspector
  standard (§7); `fx` settings-cluster registers alongside the approved-unbuilt FR-35-6
  `anim:*` cluster (recorded in decisions.md D354, not Spec 35 text). **Spec 37** — §4.2 is
  SUPERSEDED (D422): this spec no longer proposes any change to the header system, and Spec 37
  FR-37-40 is untouched. The FR-37-40 live verification is retained in Wave B purely as a
  regression check against changed scroll timing.
- **npm dependencies introduced by this spec:** `gsap` (Tier G) and `lenis` (Tier H, D422).
  Both npm-bundled, never CDN, both conditionally loaded so a page using neither ships zero
  bytes of either.
  **Spec 02 §Animation** — the Tier V baseline this spec bounds (its performance budget
  unchanged; its "sgsParallax pending" line is stale — parallax shipped).
- **Parking:** P-10 (revived by FR-38-16), P-TIMELINE-ADVANCED-VISUAL-EFFECTS (first
  ScrollTrigger-scrub client use-case — the `sgs/timeline` progressive fill lands as an
  FR-38-7 consumer), P-NO-INLINE-GATE-COVERAGE-GAPS (FR-38-24 canary obligation),
  P-DRAWER-BURGER-MORPH-SYNC + P-DRAWER-TRIGGER-ANCHOR-JS (explicitly out of scope, Tier V).
- **Policy:** D270 — no block version bumps, no `deprecated.js` pre-production (binds the
  Vivus swap, FR-38-15).
- **Wave session prompts:** `.claude/plans/2026-07-29-motion-wave-{A,B,C}-session-prompt.md`.
