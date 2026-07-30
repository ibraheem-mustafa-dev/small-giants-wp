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
| DrawSVG | **G** (scrubbed) — scroll-scrubbed draw needs ScrollTrigger; **load-triggered simple draw stays covered by Tier V `data-sgs-path-draw`** (not retired) | element (SVG-bearing) | Inspector on `sgs/responsive-logo`, `sgs/icon`, `sgs/separator`, `sgs/decorative-image` | Retires **Vivus** (§3.4, D408); trigger = load OR scroll-scrub | off | Logo/icons/dividers → any SVG-bearing block |
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
- **FR-38-9 Scroll-scrubbed image sequence — NET-NEW block `sgs/image-sequence`.** Canvas-drawn
  frame sequence scrubbed by scroll. **Explicit sub-scope with its own tooling task:** the
  asset pipeline (frame export from video, compression, resolution ladder, lazy chunked
  fetch) is a named Wave C work item — the block is NOT done when the canvas draws; it is done
  when a client can produce usable frames with the documented tooling. Editor shows the poster
  frame only.

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
- **FR-38-14 Physics easings as flavours.** Physics2D / PhysicsProps / CustomBounce /
  CustomWiggle appear ONLY as easing/motion-flavour options inside other G effects' controls
  (e.g. a "spring (physics)" easing choice on a scrub or draggable release). Never standalone
  toggles; each bundles into the chunk of the effect that offers it.

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

### 3.5 Site level

- **FR-38-18 Site-level smooth scrolling — Tier H, Lenis (D422; was GSAP ScrollSmoother).**
  SITE setting on the **SGS → Motion** page, default OFF. Lenis eases the REAL document scroll
  rather than transforming a wrapper, so there is no `#smooth-wrapper`/`#smooth-content` markup,
  no template change, and no interaction with the Spec 37 header (§4.2, superseded).
  **Mandatory conditions:** (a) disabled in the editor and all of wp-admin — server-side by the
  enqueue (`is_admin()`), plus a runtime gate for the editor's iframed canvas; (b) disabled under
  `prefers-reduced-motion`, checked LIVE and **reactively** — a mid-session OS change tears the
  instance down and a change back rebuilds it, without a reload; (c) anchor links + `:target` +
  "skip to content" resolve to correct positions, honouring the published `--sgs-header-height`
  scroll-padding (Spec 37 D391) — Lenis's own `anchors` option stays OFF so there is exactly one
  driver on an anchor click; (d) **touch scrolling stays native** (`syncTouch: false`) — phone
  momentum is what a visitor's muscle memory expects, and this must be set EXPLICITLY, never left
  to the vendor default; (e) keyboard/programmatic scrolling (find-in-page, focus scrolling)
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
- **FR-38-19 Page transitions — Tier V, cross-document View Transitions API.** SITE setting +
  per-template overrides. CSS-first (`@view-transition`), progressive enhancement, **no GSAP,
  no router**. **Fallback where unsupported:** navigation behaves exactly as today (hard
  navigation, no transition) — the feature is presentation-only, so absence of support is the
  fallback, with zero JS shipped for it. Reduced motion suppresses the transition. Named
  transition styles (fade / slide / none) per template via `view-transition-name` conventions.

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
| ~~ScrollSmoother~~ → **Lenis** (Tier H, D422) | **5.7 KB — MEASURED, not an estimate** (`shared/effects/smooth-scroll.js`, gzip, includes the bundled library) | site setting ON |
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

FR-38-6 … FR-38-19 are defined in §3 (roster). The infrastructure FRs:

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
| MotionPath | **Suppress:** resting position (matches existing decorative-image reduced-motion arm) |
| Smooth scrolling (Lenis, Tier H) | **Suppress:** native scroll. Live AND reactive — the instance is destroyed on a mid-session change to `reduce`, and rebuilt on a change back (FR-38-18 condition b) |
| Page transitions | **Suppress:** instant navigation |

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
```

One effect per element in v1 (a draft needing two composes wrapper elements). Attr-per-property
(NOT a JSON blob) because: the Spec 31 suffix grammar clones it (base attr + suffix — the same
`{base}{Param}` shape as tiers/states, §3.A steps 4/4a); the registry's render-time sniff is a
cheap prefix scan; pattern authors can hand-write it.

### 11.3 Converter mapping (defined now, lifted later)

Each `data-sgs-fx*` attr maps 1:1 to a block fx attr (`fx`, `fxTrigger`, `fxStart`, `fxEnd`,
`fxHold`, `fxScrub`, `fxStagger`, `fxDuration`, `fxEase` — seeded in `block_attributes` under
`fx:*`, §6.2).

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
