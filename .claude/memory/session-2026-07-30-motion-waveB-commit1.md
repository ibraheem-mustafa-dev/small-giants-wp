---
doc_type: session-record
date: 2026-07-30
track: Spec 38 motion — Wave B, commit 1
commits: 4776b73f · 4b317b75 · f9d2c213 · 659ff6f7 · 6c204981
decision: D422
status: Wave B PARTIAL — smooth scrolling CLOSED; page transitions (FR-38-19) NOT STARTED
---

# Motion Wave B, commit 1 — site-level smooth scrolling (D422)

## Outcome assessment (Gate 3.5 — honest)

**CODE SHIPPED, OUTCOME NOT YET HIT for Wave B as a whole.** Wave B's spec'd scope is
FR-38-18 (smooth scrolling) **and** FR-38-19 (page transitions). FR-38-18 is
**OUTCOME ACHIEVED** — shipped, live-verified, owner-tuned, owner-tested. FR-38-19 is
**NOT STARTED** and is the named remaining stage; Wave B does not close until it lands.
This is mapped to a spec stage, not "out of scope" (STOP-29).

## What changed, and why it is not what the wave prompt said

The wave prompt and Spec 38 §4.2 (D407) both assumed **GSAP ScrollSmoother**. That route
required wrapping page content in `#smooth-wrapper > #smooth-content` and TRANSFORMING the
content — and a transformed ancestor silently stops `position: sticky` pinning, which is the
shipped Spec 37 header. The workaround needed an output filter to insert that wrapper on a
BLOCK theme, and research found **no block-theme precedent anywhere** (~15 real WordPress
ScrollSmoother integrations, ~830 code-search hits — all CLASSIC themes editing
`header.php`/`footer.php`). WordPress core closes the clean route:
`get_the_block_template_html()` is **private, core-only**, with no filter to wrap the balanced
header+main+footer output.

**Lenis** eases the REAL document scroll instead — no wrapper, no transform, no template
change. Bean chose it, and chose a third doctrine tier (**Tier H, helper/utility**) over
widening Tier G, because filing a non-GSAP library under "Tier G" would make that tier mean
"any library".

**D407 is SUPERSEDED and its build items CANCELLED, not deferred:** the header relocation,
the wrapper filter, the per-tier edge rule and the `findStickyBreakingAncestor()` tripwire
extension all existed solely to work around the transform. The shipped warn-only guard is
untouched. **Spec 37 FR-37-40 is not modified by this work in any way.**

## Evidence (measured on sandybrown, not inferred)

- OFF: zero `smooth-scroll` / `lenis` / `@sgs/gsap` refs on the page.
- ON: module + CSS each enqueued exactly once; data blob `{"strength":3,...}`.
- Smoothing real: wheel input drove 1 → 660 → 931 → 1321px; a 1400px request sat at 100px
  after 120ms (native would teleport).
- **Header untouched:** `top: 0.00` at every position INCLUDING mid-flight; `position: sticky`;
  `--sgs-header-height` steady 93px; all header/row state classes identical to baseline;
  `document.scrollHeight` unchanged; no inline body height. Ancestor chain `transform: none`.
- **Row collapse (the FR-37-40 leg that was owed):** row 67.78px → 0, `transform: none`
  throughout (collapse path won by specificity), header drop 67.79 vs row removed 67.78,
  **gap 0.01px**, `--sgs-header-height` re-published 93px → 26px. Canary header restored to `{}`.
- Editor + wp-admin: module and CSS tags **0** on `/wp-admin/`, `post-new.php`, `site-editor.php`
  (authenticated, with a positive control asserting the pages really were admin pages).
- Reduced motion reactive: never starts under reduce; starts on clear; full teardown on
  re-enable; restarts again; exactly 1 listener.
- Anchors land at 93.38px = exactly header height; `scroll-padding-top: 93px`.
- At 390px the header is `absolute` and `--sgs-header-height` publishes explicit `0px` — the
  D391 measured pinned-gate behaving correctly under Lenis.

Full record: `reports/2026-07-30-motion-waveB-commit1-live-verification.md`.

## Owner decisions this session

1. **Tier H** = helper/utility, a CLOSED list (Lenis alone), four-part admission test, one
   D-number per member.
2. **Strength 4 → 3.** Bean judged 4 sluggish on desktop.
3. **Touch smoothing: built, then REJECTED on a real device.** Bean asked for a touch toggle +
   its own strength beside the scroll controls, greyed out when off. Built (default OFF /
   strength 1), Bean tried it on an actual phone at strength 1 and called it **"abrupt and
   janky" — worse than off**. Turned off; the control is retained deliberately but is now
   labelled tested-and-rejected in the settings UI and FR-38-18(d). **Do not re-propose touch
   smoothing without new real-device evidence.**
4. Page transitions deferred to next session to close Wave B.

## Defects the QC council caught before they shipped

- **BLOCKER — `smoothTouch` is not an option in Lenis 1.3.25** (zero occurrences in
  `lenis.mjs` AND `lenis.d.ts`). Unknown keys are destructured past in silence, so the
  "touch stays native" guarantee was delivered entirely by the vendor default and would have
  flipped if upstream changed it. Real name `syncTouch`.
- **MAJOR — the iframe dead-zone rule was not shipped.** Without
  `.lenis.lenis-smooth iframe { pointer-events: none }`, wheel events over a cross-origin
  iframe are swallowed and the page stops scrolling over any `sgs/media` /
  `sgs/business-info` embed. Now enqueued on the same conditional terms. Scope verified at
  `lenis.mjs:1027`: the class applies ONLY during an active smooth scroll, so embeds stay
  interactive at rest — widening to `.lenis iframe` would make every embed permanently
  unclickable.
- **Gate blindness:** `check-motion-bundle-budget.py` globbed only `vendor-modules` and
  `shared/effects/gsap`, so the new module at `shared/effects/smooth-scroll.js` built, shipped
  and enqueued while the gate reported PASS **having never measured it**.

**Two rater claims were REJECTED on fact-check:** "Rule 7 violation in progress" (Bean approved
the swap explicitly in session) and "first SGS submenu to deviate on capability"
(`class-css-output-settings.php:75` already uses `manage_options`, and is the exemplar).

## My own errors this session (both caught, both instructive)

1. **A "missing settings blob" that was present** — my grep pattern broke on the tag structure.
2. **"The header has 5 rows"** — Bean caught it. The regex counted `wp:sgs/site-header-row`
   occurrences, which match BOTH opening and closing block delimiters (2 paired rows = 4
   matches, 1 self-closing empty row = 1 → 5). The header has **3** rows and is
   `templateLock: 'all'` (Spec 37:266). Had 5 been true it would have meant the lock was
   breached — a phantom bug someone could have chased.

Same root cause both times: treating a grep count as a measurement without checking what it
matched. Also nearly "corrected" a correct comment by reading Lenis's `lerp` default off the
wrong interface (the `.d.ts` declares `lerp` on three; compiled default is `.1`).

## Still owed on this track

- **FR-38-19 page transitions** — the remaining Wave B stage.
- Two qc-council sub-cases: sticky+transparent same-tier coexistence; nav-drawer
  `<dialog>`-in-header offset.
- A long-distance anchor test (the canary homepage's only anchor target is the skip link, so
  the offset is proven over 24px but not a long smoothed journey).
- Reduced motion was proven via a STUBBED media query — the harness cannot emulate
  `prefers-reduced-motion`. Proves our branch logic, not Chrome's matching.
