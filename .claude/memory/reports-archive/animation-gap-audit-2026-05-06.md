# Animation Gap Audit — 2026-05-06

Bidirectional coverage check between SGS blocks/theme animations and the interactive-design skill references.

---

## Headline numbers

- Animations in interactive-design refs: 32
- Animations in SGS blocks/theme: 47
- Gap A → B (in docs but not in blocks): 7
- Gap B → A (in blocks but not in docs): 22
- Two-way coverage: 25

---

## Inventory basis

### Source A — interactive-design refs (32 effects catalogued)

Extracted from six reference files plus SKILL.md:

| # | Name | Category | Platform | Source file |
|---|------|----------|----------|-------------|
| 1 | fade-in (opacity 0→1 + translateY 10px) | entrance | CSS | css-patterns.md |
| 2 | pulse (opacity loop) | emphasis | CSS | css-patterns.md |
| 3 | card-lift-on-hover (translateY -4px + box-shadow) | hover | CSS | css-patterns.md |
| 4 | prefers-reduced-motion global reset | accessibility | CSS | css-patterns.md |
| 5 | button hover (scale 1.02 / tap 0.98) | micro-interaction | Framer Motion | framer-motion-patterns.md |
| 6 | toggle slide | micro-interaction | Framer Motion | framer-motion-patterns.md |
| 7 | page crossfade transition (opacity + translateY) | page-transition | Framer Motion | framer-motion-patterns.md |
| 8 | ripple-on-click | micro-interaction | Framer Motion | framer-motion-patterns.md |
| 9 | swipe-to-dismiss (drag x with threshold) | gesture | Framer Motion | framer-motion-patterns.md |
| 10 | loading skeleton (animate-pulse shimmer) | loading | Framer Motion | framer-motion-patterns.md |
| 11 | progress bar (width 0→%) | loading | Framer Motion | framer-motion-patterns.md |
| 12 | GSAP timeline (hero fade + card stagger) | entrance | GSAP | gsap-patterns.md |
| 13 | GSAP ScrollTrigger (section fade on scroll) | scroll-trigger | GSAP | gsap-patterns.md |
| 14 | SVG path drawing on scroll | scroll-trigger | GSAP | gsap-patterns.md |
| 15 | SVG morph (MorphSVGPlugin) | emphasis | GSAP | gsap-patterns.md |
| 16 | View Transition crossfade (::view-transition-old/new) | page-transition | View Transitions API | view-transitions-patterns.md |
| 17 | Named element transition (view-transition-name) | page-transition | View Transitions API | view-transitions-patterns.md |
| 18 | Web Animations API basic fade + translateY | entrance | Web Animations API | web-animations-api.md |
| 19 | Web Animations API playback control (pause/play/reverse) | micro-interaction | Web Animations API | web-animations-api.md |
| 20 | Staggered entrance (forEach + delay index * 100) | entrance | Web Animations API | web-animations-api.md |
| 21 | Scroll-triggered via IntersectionObserver (WAAPI) | scroll-trigger | Web Animations API | web-animations-api.md |
| 22 | SGS extension: fade-up / fade-down | scroll-trigger | WP Interactivity API | wp-block-animations.md |
| 23 | SGS extension: fade-in / fade-left / fade-right | scroll-trigger | WP Interactivity API | wp-block-animations.md |
| 24 | SGS extension: slide-up / slide-down / slide-left / slide-right | scroll-trigger | WP Interactivity API | wp-block-animations.md |
| 25 | SGS extension: scale-in / scale-out | scroll-trigger | WP Interactivity API | wp-block-animations.md |
| 26 | SGS extension: rotate-in / flip-in / blur-in | scroll-trigger | WP Interactivity API | wp-block-animations.md |
| 27 | Accordion expand/collapse (grid-template-rows 0fr/1fr) | micro-interaction | WP Interactivity API | wp-block-animations.md |
| 28 | Staggered grid entrance (--stagger-delay CSS var + IntersectionObserver class toggle) | entrance | WP Interactivity API | wp-block-animations.md |
| 29 | SKILL.md: button click scale-down (0.95→1) | micro-interaction | CSS | SKILL.md |
| 30 | SKILL.md: form input focus border/glow | micro-interaction | CSS | SKILL.md |
| 31 | SKILL.md: form shake on error | micro-interaction | CSS | SKILL.md |
| 32 | SKILL.md: empty state floating illustration | delight | CSS | SKILL.md |

### Source B — SGS blocks/theme (47 effects catalogued)

Includes all `@keyframes`, named transitions, hover classes, and extension attributes. Effects that are mere `transition: none` reduced-motion overrides are excluded.

**Scroll-reveal extension (extensions.css + animation.js) — 16 types:**

| Name | Category | Block scope |
|------|----------|-------------|
| fade-up | scroll-trigger | all sgs/* + core/group, core/columns, core/cover, core/image |
| fade-down | scroll-trigger | same |
| fade-in | scroll-trigger | same |
| fade-left | scroll-trigger | same |
| fade-right | scroll-trigger | same |
| slide-up | scroll-trigger | same |
| slide-down | scroll-trigger | same |
| slide-left | scroll-trigger | same |
| slide-right | scroll-trigger | same |
| scale-in | scroll-trigger | same |
| scale-out | scroll-trigger | same |
| rotate-in | scroll-trigger | same |
| flip-in | scroll-trigger | same |
| blur-in | scroll-trigger | same |
| bounce-in (overshoot cubic-bezier) | scroll-trigger | same |
| reveal-up (clip-path inset 100%→0%) | scroll-trigger | same |

**Hover effects extension (extensions.css + hover-effects.js) — 11 controls:**

| Name | Category | Block scope |
|------|----------|-------------|
| sgs-has-hover: bg/text/border colour shift | hover | all blocks |
| sgs-has-hover: scale preset (1.02 / 1.05 / 1.1) | hover | all blocks |
| sgs-has-hover: scale fine-grained (RangeControl 0–120) | hover | all blocks |
| sgs-has-hover: shadow elevation (sm/md/lg/glow) | hover | all blocks |
| hover image zoom (overflow:hidden + scale 1.1 on img) | hover | all blocks |
| grayscale-to-colour (filter: grayscale 100%→0) | hover | all blocks |
| border accent line (::before scaleX 0→1) | hover | all blocks |
| 3D tilt (transform-style preserve-3d, JS-driven) | hover | all blocks |
| transition duration tokens (instant/fast/medium/slow/extra-slow) | meta | all blocks |
| transition easing tokens (default/ease-out/ease-in/spring/linear) | meta | all blocks |
| underline slide-in on links (::after scaleX 0→1) | micro-interaction | global: nav links, sgs-text-link, content links |

**Parallax extension (extensions.css + parallax.js) — 2 types:**

| Name | Category | Block scope |
|------|----------|-------------|
| sgs-parallax-background (background-attachment:fixed + CSS SDA animation-timeline:scroll()) | scroll-trigger | all blocks |
| sgs-parallax-element (translateY via CSS SDA animation-timeline:scroll()) | scroll-trigger | all blocks |

**Block-specific keyframe animations — 13 effects:**

| Name | @keyframes / block | Category |
|------|-------------------|----------|
| sgs-brand-scroll (infinite horizontal scroll) | brand-strip | loading / continuous |
| sgs-card-enter (CSS SDA animation-timeline:view()) | card-grid | scroll-trigger |
| sgs-flip-digit (transform + opacity flip) | countdown-timer | micro-interaction |
| sgs-counter-reveal (CSS SDA animation-timeline:view()) | counter | scroll-trigger |
| sgs-step-enter (translateY 10px + opacity 0→1 on form step transition) | form | entrance |
| sgs-ken-burns (scale 1→1.05 infinite alternate) | hero | loading / continuous |
| sgs-tab-fade (opacity 0→1 on tab panel reveal) | mega-menu | micro-interaction |
| sgs-post-card-enter (CSS SDA animation-timeline:view()) | post-grid | scroll-trigger |
| sgs-shimmer (background-position sweep for skeleton) | post-grid | loading |
| sgs-svg-pulse (opacity loop) | svg-background | emphasis / continuous |
| sgs-svg-float (translateY loop) | svg-background | delight / continuous |
| sgs-svg-wave (transform wave loop) | svg-background | delight / continuous |
| sgs-trust-bar-item-reveal (CSS SDA animation-timeline:view()) | trust-bar | scroll-trigger |

**Other block-level transitions (no separate keyframe) — 5 notable effects:**

| Name | Block | Category |
|------|-------|----------|
| Accordion expand/collapse (grid-template-rows 0fr→1fr via block-size transition) | accordion | micro-interaction |
| Modal open/close (opacity + transform via spring easing) | modal | micro-interaction |
| Mobile nav clip-path reveal (clip-path inset 0 100%→0%) | mobile-nav | micro-interaction |
| Reading progress bar (width linear transition) | reading-progress | loading |
| Form progress bar (width transition) | form | loading |

**animation_tokens DB rows (7) — not directly used as editor attributes but inform keyframe library:**

| Token name | Category |
|-----------|----------|
| fade-in | entrance |
| fade-out | exit |
| slide-up | entrance |
| zoom-in | entrance |
| bounce | emphasis |
| pulse | emphasis |
| spin | loading |

---

## Section 1 — Docs → Blocks gap (in docs but not in blocks)

Effects documented in the interactive-design references that have no equivalent SGS attribute or block-level implementation.

| Animation / effect | Category | Source ref file | Recommended SGS attribute spec | Candidate blocks |
|---|---|---|---|---|
| Ripple on click (radial scale from click point) | micro-interaction | framer-motion-patterns.md | `sgsRippleOnClick: boolean` — CSS `::after` radial animation triggered by JS click co-ordinates | sgs/button (if added), sgs/whatsapp-cta, sgs/cta-section CTAs |
| Swipe to dismiss (drag x with snap-back threshold) | gesture | framer-motion-patterns.md | Not a block attribute — pattern is gesture-only. Recommend adding to wp-block-animations.md as a "not-covered-by-extension" pattern using Interactivity API `data-wp-on--pointerdown` | sgs/testimonial-slider, sgs/gallery lightbox |
| SVG path drawing on scroll | scroll-trigger | gsap-patterns.md | `sgsSvgDrawOnScroll: boolean` — requires GSAP ScrollTrigger or CSS SDA `stroke-dashoffset` animation on `animation-timeline:view()`. Add to wp-block-animations.md as an advanced pattern note | sgs/decorative-image, sgs/svg-background |
| SVG morph | emphasis | gsap-patterns.md | Out of scope for SGS extension (requires MorphSVGPlugin, GSAP paid). Document as "not buildable without GSAP Pro" in gsap-patterns.md | — |
| View Transitions API page crossfade | page-transition | view-transitions-patterns.md | No SGS block attribute — applies to theme navigation, not blocks. Recommend adding a note in wp-block-animations.md under "Patterns NOT covered" pointing to view-transitions-patterns.md for Next.js / theme-level use | theme template parts |
| Form input focus border/glow (dedicated animated ring) | micro-interaction | SKILL.md | SGS forms have `transition: border-color 0.2s, box-shadow 0.2s` but no editor-controllable focus-glow colour or intensity. Recommend `sgsFormFocusGlow: string` palette picker on sgs/form block | sgs/form |
| Empty state floating illustration animation | delight | SKILL.md | No SGS block handles empty state illustration animations. No attribute spec recommended yet — candidate for a future `sgs/empty-state` block | future block |

**Note on Framer Motion and GSAP gaps:** All Framer Motion and GSAP patterns are documented for React / non-WP contexts. The skill correctly says "do not use in WP blocks." These gaps are therefore expected and correct — no action needed in blocks. The only gap requiring action is the ripple pattern (achievable in CSS/JS) and the scroll-triggered SVG draw (achievable via CSS SDA).

---

## Section 2 — Blocks → Docs gap (in blocks but not in docs)

SGS-implemented effects with no matching pattern in any interactive-design reference file.

| Animation / effect | Category | Where it lives in SGS | Recommended doc location | Notes |
|---|---|---|---|---|
| bounce-in (overshoot cubic-bezier 0.175, 0.885, 0.32, 1.275) | scroll-trigger | extensions.css, animation.js | css-patterns.md — add "Controlled overshoot entrance" section | SKILL.md explicitly bans "bounce, elastic, spring overshoot" but SGS ships bounce-in as a user option. The docs and the implementation contradict each other. Needs resolution — either remove the type or add a bounded-overshoot exception to SKILL.md. |
| reveal-up (clip-path inset 100%→0%) | scroll-trigger | extensions.css | css-patterns.md — add "Clip-path wipe entrance" section | Not in any reference. This is a GPU-composited, compositor-thread technique that outperforms opacity/transform on some mobile GPUs. Worth documenting as a preferred alternative for text headline reveals. |
| Parallax background (CSS SDA animation-timeline:scroll() + background-attachment:fixed fallback) | scroll-trigger | extensions.css | wp-block-animations.md — add Pattern 3 "Parallax background" | Currently undocumented. The CSS SDA path is Baseline 2024 — documenting it with the fallback chain (SDA → fixed-attachment → no effect) would be genuinely useful. |
| Parallax element (translateY via animation-timeline:scroll()) | scroll-trigger | extensions.css | wp-block-animations.md — add Pattern 4 "Parallax element" | Same as above. |
| Ken Burns (scale 1→1.05 infinite alternate on hero background) | continuous / emphasis | hero/style.css @keyframes sgs-ken-burns | css-patterns.md — add "Ken Burns" under "Continuous / ambient animations" section | No continuous / ambient animation section exists in css-patterns.md. |
| Continuous brand logo scroll (infinite marquee via animation-play-state) | continuous / loading | brand-strip/style.css @keyframes sgs-brand-scroll | css-patterns.md — add "Infinite marquee / ticker scroll" section | A very common pattern entirely absent from the docs. |
| CSS Scroll-Driven Animations via animation-timeline:view() (card-enter, counter-reveal, post-card-enter, trust-bar-item-reveal) | scroll-trigger | card-grid, counter, post-grid, trust-bar style.css | css-patterns.md — add "CSS Scroll-Driven Animations (Baseline 2024)" section | The entire CSS SDA API is unrepresented in any reference file. The skill falls back to IntersectionObserver via GSAP or Web Animations API — but SGS already uses the native CSS path. This is a significant doc lag. |
| Shimmer skeleton loading (background-position sweep) | loading | post-grid/style.css @keyframes sgs-shimmer | css-patterns.md — expand "Skeleton loading" beyond Framer Motion's animate-pulse | Framer Motion's `animate-pulse` (opacity) is documented; the CSS gradient-sweep shimmer technique is not. |
| Form step entrance (translateY + opacity on multi-step transition) | entrance | form/style.css @keyframes sgs-step-enter | wp-block-animations.md — add "Form multi-step transition" under "Patterns NOT Covered by the Extension" | Specific to multi-step form UX; worth capturing as a reusable pattern. |
| Modal open/close with spring easing (backdrop opacity + content transform via --sgs-modal-transition) | micro-interaction | modal/style.css | wp-block-animations.md — add "Modal / drawer entry" pattern | SKILL.md mentions "Modal/drawer entry: smooth slide + fade, backdrop fade, focus management" but no WP-specific implementation pattern exists. |
| Mobile nav clip-path reveal (clip-path: inset 0 100%→0%) | micro-interaction | mobile-nav/style.css | wp-block-animations.md — add "Off-canvas nav reveal" pattern | Clip-path based open/close is more performant than width/height animation. Not documented anywhere. |
| Reading progress bar (width linear transition tracking scroll) | scroll-trigger | reading-progress/style.css | css-patterns.md — add "Reading / scroll progress indicator" | A complete SGS block exists; no doc pattern exists. The CSS SDA-native equivalent (`animation-timeline:scroll()` on a `scaleX` transform) is also worth documenting as the zero-JS alternative. |
| SVG background pulse / float / wave (infinite CSS loops on decorative backgrounds) | delight / continuous | svg-background/style.css | css-patterns.md — add "Ambient decorative / delight animations" section | Three distinct loop patterns with no reference. The float pattern (sinusoidal translateY) is a common delight mechanic in landing pages. |
| Grayscale-to-colour on hover (filter: grayscale 100%→0) | hover | extensions.css .sgs-hover-grayscale | css-patterns.md — add to "Hover families" section | A named SGS class with no reference. The zoom + grayscale + scale combo (implemented in card-grid and team-member) is also undocumented as a combined pattern. |
| Border accent line (::before scaleX 0→1 on hover) | hover | extensions.css .sgs-has-border-accent | css-patterns.md — add "Border accent reveal" to hover section | Elegant underline-replacement technique — not documented. |
| 3D tilt on hover (transform-style preserve-3d, JS mousemove-driven) | hover | extensions.css .sgs-has-tilt-3d | css-patterns.md — add "3D tilt" to hover section | The CSS skeleton is there but the JS driver (mousemove angle calculation) is presumably in parallax.js or hover-effects.php. Either way, no doc pattern exists. |
| Button fill animation (::before scaleX 0→1 on wp-block-button__link) | hover | extensions.css .sgs-button-fill | css-patterns.md — add "Button fill sweep" | Implemented globally on all WP core buttons. Not in docs. |
| Icon slide-right on button hover (translateX 4px on SVG inside CTA) | micro-interaction | extensions.css | css-patterns.md — add to "Button microinteractions" section | Complements button fill; both are applied globally but neither is documented. |
| Countdown timer flip-digit (transform + opacity sequenced) | micro-interaction | countdown-timer/style.css @keyframes sgs-flip-digit | css-patterns.md — add "Flip digit / ticker" to micro-interactions | A specific UI pattern not covered anywhere in the refs. |
| Accordion expand/collapse via block-size transition (not grid-template-rows) | micro-interaction | accordion/style.css | wp-block-animations.md — update Pattern 1 | wp-block-animations.md Pattern 1 documents `grid-template-rows: 0fr/1fr`. SGS accordion uses `block-size` transition instead. The reference is out of sync with the implementation. |
| Form multi-step progress bar (width transition on .sgs-form__progress-bar) | loading | form/style.css | wp-block-animations.md — add "Form progress indicator" | Covered partially in Framer Motion docs (`<ProgressBar>`), but the CSS-only WP equivalent is absent. |

---

## Section 3 — Two-way coverage (existing and documented — no action needed)

These effects are both implemented in SGS blocks and covered by at least one interactive-design reference file.

1. fade-in (basic opacity entrance) — css-patterns.md + extensions.css
2. fade-up, fade-down, fade-left, fade-right — wp-block-animations.md + extensions.css
3. slide-up, slide-down, slide-left, slide-right — wp-block-animations.md + extensions.css
4. scale-in, scale-out — wp-block-animations.md + extensions.css
5. rotate-in, flip-in, blur-in — wp-block-animations.md + extensions.css
6. Accordion expand/collapse (grid-template-rows pattern) — wp-block-animations.md Pattern 1 (partial mismatch noted above in Section 2)
7. Staggered entrance (--stagger-delay CSS var) — wp-block-animations.md Pattern 2 + extensions.css stagger child delay
8. Card lift on hover (translateY + box-shadow) — css-patterns.md + extensions.css hover scale/shadow
9. hover bg/text/border colour shift — css-patterns.md (transition example) + extensions.css sgs-has-hover
10. Hover image zoom — css-patterns.md (implicit in card example) + extensions.css sgs-hover-image-zoom
11. prefers-reduced-motion global reset — css-patterns.md + extensions.css (all blocks)
12. Loading skeleton shimmer (Framer Motion animate-pulse) — framer-motion-patterns.md + post-grid shimmer (CSS gradient sweep; technique differs but same UX)
13. Progress bar animation (Framer Motion width) — framer-motion-patterns.md + form/reading-progress CSS width transition
14. Button hover scale (Framer Motion 1.02) — framer-motion-patterns.md + extensions.css scale preset 1.02
15. Toggle smooth slide — framer-motion-patterns.md (concept) + mobile-nav toggle transition
16. Scroll-triggered IntersectionObserver — web-animations-api.md + animation-observer.js
17. Staggered card entrance with delay — web-animations-api.md stagger + extensions.css stagger delay
18. GSAP ScrollTrigger section fade — gsap-patterns.md + animation-observer.js (equivalent IntersectionObserver path)
19. GSAP timeline hero fade + card stagger — gsap-patterns.md (non-WP) + sgs-ken-burns + scroll-reveal extension (WP equivalent)
20. animation_tokens DB: fade-in, fade-out, slide-up, zoom-in, pulse — sgs-framework.db + extensions.css (fade-in, slide-up) + css-patterns.md (pulse) — partial DB mismatch: zoom-in maps to scale-in in the extension; fade-out and bounce are in DB but not in extension CSS; spin is in DB but not in extension CSS
21. Page crossfade concept — framer-motion-patterns.md + view-transitions-patterns.md (both cover it)
22. Underline slide on hover — SKILL.md (described) + extensions.css sgs-underline-slide
23. Form focus ring border/glow — SKILL.md (described) + form/style.css (implemented, but not a controllable editor attribute)
24. Social icon hover (colour + translateX) — css-patterns.md hover pattern + social-icons/style.css
25. pulse (opacity loop) — css-patterns.md + animation_tokens DB row 6 + svg-background sgs-svg-pulse

---

## Section 4 — Recommendations summary

### Top gaps to close in `add-attributes` subagent dispatch (Section 1, prioritised by usefulness)

1. **Resolve the bounce-in contradiction (immediate).** SKILL.md bans spring/overshoot easing; extensions.css ships `bounce-in` with exactly that easing. Either remove `bounce-in` from the extension options or add a bounded-overshoot exception paragraph to SKILL.md. This is a principle violation in the current codebase. Priority: high.

2. **Document CSS Scroll-Driven Animations in css-patterns.md (high value, no code change).** The entire `animation-timeline:view()` and `animation-timeline:scroll()` API is used in four blocks (card-grid, counter, post-grid, trust-bar) and the parallax extension but appears nowhere in the reference files. A single new section covering the native CSS path, browser support, `@supports` progressive enhancement, and the SDA vs IntersectionObserver trade-off would make the skill meaningfully more useful for future blocks.

3. **Add parallax patterns to wp-block-animations.md (no code change).** The parallax extension (CSS SDA + fixed-attachment fallback) is a complete, production-shipped system with zero documentation in the reference files. Add as Patterns 3 and 4.

4. **Add clip-path wipe (reveal-up) and Ken Burns to css-patterns.md (no code change).** Both are production-shipped, GPU-composited techniques missing from the CSS reference.

5. **Add the hover family gaps to css-patterns.md (no code change).** Six missing hover patterns — grayscale-to-colour, border accent reveal, 3D tilt, button fill sweep, icon slide, and infinite marquee — each need a code example added to the CSS reference.

6. **Add ripple-on-click as a CSS/JS pattern (small code addition).** Framer Motion's ripple is documented but the pure CSS/JS equivalent for WP blocks is not. A new `sgsRippleOnClick` attribute on button-type elements (sgs/cta-section, sgs/whatsapp-cta) would close this gap with ~20 lines of CSS and ~15 lines of vanilla JS.

7. **Add accordion implementation note to wp-block-animations.md Pattern 1.** The reference documents `grid-template-rows: 0fr/1fr`; the SGS accordion uses `block-size` transition. The reference should note both techniques and when each applies.

### Top doc additions for the next interactive-design rev (Section 2, by impact)

| Priority | Addition | File |
|---|---|---|
| 1 | CSS Scroll-Driven Animations section (animation-timeline:view() + :scroll()) | css-patterns.md |
| 2 | Parallax patterns (background + element, CSS SDA + fallback chain) | wp-block-animations.md |
| 3 | Continuous / ambient animations section (Ken Burns, infinite marquee, SVG float/wave/pulse) | css-patterns.md |
| 4 | Hover family extensions (grayscale, border accent, 3D tilt, button fill, icon slide) | css-patterns.md |
| 5 | Modal / off-canvas drawer entry patterns for WP blocks | wp-block-animations.md |
| 6 | Shimmer skeleton (CSS gradient sweep technique) vs animate-pulse distinction | css-patterns.md |
| 7 | Reading progress indicator (CSS-only SDA alternative) | css-patterns.md |

### Consolidation candidates

- **animation_tokens DB vs extension CSS:** The DB has 7 rows (fade-in, fade-out, slide-up, zoom-in, bounce, pulse, spin). Of these, `fade-out`, `bounce`, `spin`, and `zoom-in` are not in the extension's 16 animation types. Either the DB rows are orphaned (they pre-date the extension, dated 2026-04-13), or they describe block-local keyframes with no editor attribute. Worth a single clean-up pass to either wire them into the extension or mark them deprecated in the DB.

- **Stagger delay: two systems.** The scroll-reveal extension has `sgsAnimationDelay` (per-block stagger in ms). The hover-effects extension has `sgsStaggerDelay` (children stagger). Both serve related purposes and should be cross-referenced in wp-block-animations.md Pattern 2 to avoid confusion when specifying new blocks.

---

*Audit conducted against codebase state as of 2026-05-06. No files were modified.*
