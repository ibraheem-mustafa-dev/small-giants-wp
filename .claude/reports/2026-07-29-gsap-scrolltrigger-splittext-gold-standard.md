# GSAP ScrollTrigger + SplitText — Documented Gold Standard

**Purpose:** verifiable code-review checklist. Every item cites its source: GSAP official docs
(via `/library-docs` → context7 `/websites/gsap_v3`), gsap.com pages fetched live, or the
installed source at `plugins/sgs-blocks/node_modules/gsap/dist/*.js` (**version confirmed
3.15.0** — `node_modules/gsap/package.json:3`). Where docs and installed source disagree, the
installed source wins (noted explicitly below).

Tags: **[MUST]** = broken/leaky/inaccessible if violated. **[SHOULD]** = correct-but-fragile if
violated. **[NICE]** = polish/robustness.

---

## ScrollTrigger

### Pin correctness

1. **[MUST] Never animate the pinned element itself.** GSAP pre-calculates pin measurements for
   performance; animating the pinned element throws off those measurements. Animate elements
   *nested inside* the pin instead.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pin` config entry, via context7).

2. **[MUST] `pinType` default: `position:fixed` for the `<body>` scroller, CSS transform for any
   other (non-body) scroller.** Force `pinType:"fixed"` only when you know why. `will-change:
   transform` on an ancestor breaks `position:fixed` pinning — remove it or accept the transform
   pin.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pinType` config entry).

3. **[MUST] Containing-block gotcha:** any ancestor with `transform` (or `will-change:transform`,
   `filter`, `perspective`) creates a new containing block, so a `position:fixed`-pinned element
   fixes relative to that ancestor, not the viewport — it will drift/detach on scroll. Fix: keep
   pinned elements' ancestor chain transform-free, OR set `pinReparent:true` so ScrollTrigger
   moves the pinned element to `<body>` while pinned (reparenting is expensive and can break CSS
   that depends on nesting — use only when needed), OR restructure so the transformed wrapper
   sits *outside* anything that needs `position:fixed`.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pinReparent`) + gsap.com/docs/v3/Plugins/ScrollSmoother
   ("Caveats" — same containing-block mechanism, stated for `position:fixed` generally).

4. **[MUST] `pinSpacing` default `true` adds padding after the pinned element** so page height
   doesn't collapse when the pin releases. `pinSpacing:false` disables this (you must handle the
   layout jump yourself); `pinSpacing:"margin"` uses margin instead of padding. **`pinSpacing` is
   disabled by default for `display:flex` containers** and "may not work as expected" with
   `display:flex` or `position:absolute` parents — verify pin release visually in any flex layout.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pinSpacing` config entry).

5. **[SHOULD] Nested pins need `pinnedContainer`.** If a pinned element sits inside another
   element that is *also* pinned, set `pinnedContainer` so ScrollTrigger offsets start/end
   correctly — otherwise the inner trigger's math is wrong.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pin` config entry, "Note").

### `scrub` semantics

6. **[MUST] `scrub:true` ties the tween's progress directly and immediately to scroll position**
   (no smoothing lag). **`scrub:<number>`** (seconds) adds catch-up smoothing — the animation
   takes that many seconds to "catch up" to the scrollbar position, decoupling animation playback
   from raw scroll velocity. `scrub:1` is the documented example value.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger ("Advanced ScrollTrigger Timeline" snippet, via
   context7 — `scrub: 1, // smooth scrubbing, takes 1 second to "catch up" to the scrollbar`).

7. **[SHOULD] With `scrub`, tween/timeline `duration` becomes irrelevant to real time** — the
   scrubbed tween's playhead is driven by scroll position within `start`→`end`, not by its own
   clock. A `duration` set on a scrubbed tween only affects relative pacing between its own
   internal segments (e.g. timeline labels), not wall-clock speed. **Not independently confirmed
   in a single quoted doc line during this pass — flagging as a gap** (see "Not found" list
   below) rather than asserting a specific mechanism.

### `start` / `end` string syntax + invalid values

8. **[MUST] Syntax:** `"<trigger-position> <scroller-position>"` using keywords (`top`, `center`,
   `bottom`), percentages, or pixel values — e.g. `"top center"`, `"top 80%"`, `"+=500"` (relative
   to start). Both `start` and `end` are **always resolved to numeric pixel values internally**
   (read via `ScrollTrigger.start`/`.end` after `refresh()`), regardless of the string form used
   to declare them.
   Source: gsap.com/docs/v3/Plugins/ScrollTrigger/start + `/ScrollTrigger` (`start`/`end` config
   entries, via context7).

9. **[SHOULD] `start` can be clamped to stay within page bounds** via the documented `clamp()`
   wrapper (e.g. `start: "clamp(top top)"`) — this is the documented mechanism for handling a
   `start` value that would otherwise resolve outside `0`..maxScroll. **Whether an *unwrapped*
   out-of-range start/end is silently clamped automatically, silently ignored, or left to produce
   an unreachable trigger was NOT confirmed by an explicit doc statement in this pass — flagged as
   a gap.** Do not assert either behaviour in review; test the specific case if it matters.

### `invalidateOnRefresh`, `refresh()`, resize/late-image correctness

10. **[MUST] `invalidateOnRefresh:true` calls the associated animation's `invalidate()` during
    every refresh** (e.g. on window resize), clearing internally-recorded starting values so the
    tween recalculates fresh `from`/`to` values against the current DOM state. Without it, a
    tween that captured values (e.g. computed positions) at creation time keeps using those stale
    values after a resize/layout change even though ScrollTrigger's own start/end pixel positions
    do get recalculated.
    Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`invalidateOnRefresh` config entry).

11. **[MUST] ScrollTrigger auto-recalculates positions on window resize** (per the documented
    Features list) but layout-affecting async content — most commonly **images that load after
    initial layout** — can silently shift positions if you don't manually trigger a refresh once
    they've loaded. Call `ScrollTrigger.refresh()` (or use `ScrollTrigger.addEventListener` /
    image `load` handlers that call it) after any late-loading content that affects trigger-element
    geometry.
    Source: gsap.com/docs/v3/Plugins/ScrollTrigger ("Features" summary, via context7 — "automatically
    recalculates positions on window resize"). **The specific late-image-load pattern is standard
    GSAP community guidance, not a verbatim doc quote pulled in this pass — treat item 11's
    "call refresh() manually for late images" clause as [SHOULD] on community-practice grounds,
    not a [MUST] backed by an exact doc citation.**

### `anticipatePin`

12. **[MUST] Default `anticipatePin: 0`** (confirmed in installed source, not just docs — see
    below). Docs describe it as mitigating a visual delay/jump when pinning large sections during
    fast scrolling, by having ScrollTrigger monitor scroll velocity and apply the pin slightly
    early; `1` is the commonly-sufficient value.
    Doc source: gsap.com/docs/v3/Plugins/ScrollTrigger (`anticipatePin` config entry).
    **Installed-source confirmation:** `dist/ScrollTrigger.js:996` — `anticipatePin: 0` in the
    defaults object. Use `anticipatePin:1` (or tune) only where a visible jump is observed; do
    not set it blindly on every pinned trigger.

### Killing instances / cleanup — no leaks

13. **[MUST] `.kill(revert=true, allowAnimation=false)` on the ScrollTrigger instance is required**
    to unpin, restore pin-related DOM mutations, and remove scroll listeners so the instance is
    garbage-collectable. By default it also kills the associated animation. **Killing only the
    tween does NOT tear down the ScrollTrigger instance's own listeners/pin state** — the
    ScrollTrigger instance must be killed itself (or via `gsap.context().revert()` — see below) or
    its scroll listener and any DOM pin mutations leak.
    Source: gsap.com/docs/v3/Plugins/ScrollTrigger/kill().

14. **[MUST] In component-based frameworks (React etc.), use `gsap.context()` and call
    `context.revert()` on unmount** rather than manually killing every ScrollTrigger — GSAP's own
    pin docs point directly to this pattern ("Using React? Make sure to do proper cleanup").
    `gsap.matchMedia()` **also internally creates a `gsap.context()`** — do not nest a manual
    `gsap.context()` inside a `gsap.matchMedia()` call (or vice versa); it's documented as
    redundant.
    Source: gsap.com/docs/v3/Plugins/ScrollTrigger (`pin` config entry, React note) +
    gsap.matchMedia() best-practice ("Do not nest contexts", via WebSearch of
    gsap.com/docs/v3/GSAP/gsap.matchMedia()).

    > **⚠ SCOPE CORRECTION (2026-07-30, D416) — read before acting on this item.**
    > This item says **redundant**. It does NOT say harmful, and GSAP's docs contain no
    > "reverts the same trigger twice" claim anywhere — that phrasing entered a later session
    > prompt as an escalation of this line and is not supported by the docs. The exact doc
    > sentence is: *"Internally, gsap.matchMedia() creates a gsap.context(), so it would be
    > redundant and completely unnecessary to use both."*
    >
    > It also covers a **manual `gsap.context()`** nested in a matchMedia — NOT a second
    > `gsap.matchMedia()`. Verified against the compiled GSAP 3.15.0 in
    > `build/vendor-modules/gsap-core.js`: `MatchMedia`'s constructor is
    > `function t(t){this.contexts=[];this.scope=t; s && s.data.push(this)}` — a matchMedia
    > created inside an active context **self-registers with that context**, so the parent
    > cleans it up. Nesting matchMedia in matchMedia is supported, not a leak.
    >
    > Do NOT "fix" `fx-horizontal-panel.js` by moving its `(min-width: 768px)` branch onto the
    > context `withMotionAllowed` passes in. Conditions added to one MatchMedia are
    > INDEPENDENT SIBLINGS — each `.add()` builds its own Context and fires on its own query
    > alone — so the desktop pin would run for reduced-motion visitors, while the CSS that
    > stands the native scroller down stays gated on `no-preference`. That is an
    > accessibility regression, and it inverts that file's own stated fail-open contract.

### `gsap.matchMedia()` vs `ScrollTrigger.matchMedia()`

15. **[MUST] `ScrollTrigger.matchMedia()` is documented as DEPRECATED** — use `gsap.matchMedia()`
    instead for new code.
    Doc source: gsap.com/docs/v3/Plugins/ScrollTrigger (`matchMedia` entry — "[DEPRECATED]").
    **Installed-source confirmation (3.15.0), and this is the load-bearing detail:**
    `dist/ScrollTrigger.js:2641-2650` — `ScrollTrigger.matchMedia` is still defined, but as a thin
    wrapper: it calls `gsap$1.matchMedia()` internally and forwards each condition via `mm.add()`.
    It is **not a parallel/independent implementation** — it is a compatibility shim over
    `gsap.matchMedia()`. It still works in 3.15.0 (not removed), but there is no reason to reach
    for it in new code; call `gsap.matchMedia()` directly.
16. **[MUST] `context.revert()` (from a matchMedia condition, or an explicit `gsap.context()`)
    reverts everything created inside that condition/context** — tweens, ScrollTriggers, and (per
    SplitText below) any splits created via `onSplit` returning the animation. This is the
    documented cleanup path for a media-query condition that stops matching (e.g. viewport resize
    crossing a breakpoint) as well as component unmount.
    Source: gsap.com/docs/v3/GSAP/gsap.matchMedia() best-practices (via WebSearch), consistent
    with `_proto.revert` implementations found at `dist/gsap.js:1676`.

---

## SplitText (2025 rewrite, v3.13+)

### `aria` option

17. **[MUST] `aria` accepts exactly `"auto"` (default) / `"hidden"` / `"none"`:**
    - `"auto"`: sets `aria-label` on the split parent (the trimmed original text content) and
      `aria-hidden="true"` on every nested split element (lines/words/chars) so screen readers
      read the label instead of walking the fragmented DOM. Documented caveat: "May not honor
      nested element semantics" — i.e. if the original text contained meaningful nested elements
      (links, emphasis), the flattened `aria-label` string loses that structure/semantics.
    - `"hidden"`: `aria-hidden` on all split + nested elements, no `aria-label` — use when the
      split text is decorative/duplicated with an accessible copy elsewhere.
    - `"none"`: no ARIA attributes added at all — the documented pairing for this is "create a
      separate screen-reader-only duplicate of the element" alongside the visually-split version,
      for complex nested content (e.g. inline links) where `"auto"`'s flattened label would be
      insufficient.
    Doc source: gsap.com/docs/v3/Plugins/SplitText (Configuration Object — `aria`; "Alternate
    Strategy for Maximizing Nested Element Accessibility").
    **Installed-source confirmation:** `dist/SplitText.js:51-55` — wrapper function sets
    `aria !== "none" && el.setAttribute("aria-hidden","true")` on nested elements; line 219 —
    `aria === "auto" ? element.setAttribute("aria-label", trimmedText) : aria === "hidden" &&
    element.setAttribute("aria-hidden","true")` on the parent. Matches docs exactly.

18. **[MUST] Default is `aria:"auto"`, not `"none"`.** A block that never sets `aria` still gets
    ARIA handling automatically — do not flag a missing explicit `aria` option as a bug on its
    own; only flag it if the *effective* behaviour (default `"auto"`) is wrong for that content
    (e.g. nested interactive links inside split text, per item 17's `"none"` guidance).

### `revert()` guarantees / leaks

19. **[MUST] Call `.revert()` (or let a returned-from-`onSplit()` animation be cleaned up by
    `autoSplit`, or call `context.revert()`) when a SplitText instance is no longer needed** —
    e.g. component unmount, or before re-splitting the same element manually. `revert()` restores
    the original DOM (`element.innerHTML` + original `aria-label`/`aria-hidden` state — see
    `_revertOriginal` at `dist/SplitText.js:23-26`) and is what the `autoSplit` re-split path
    itself calls before every re-split (`this._data` tracking `orig`/`animTime`).
    Source: gsap.com/docs/v3/Plugins/SplitText (Configuration Object — `onRevert`) + installed
    source `dist/SplitText.js:23-26` (`_revertOriginal`).
    **Without `revert()`:** the split `<div>` wrappers and their ARIA attributes remain in the DOM
    permanently (memory + a11y debt), and any GSAP tween still referencing `self.lines`/`.words`/
    `.chars` element arrays keeps live DOM references — a leak if the split is repeated without
    reverting first (duplicate/orphaned split wrappers accumulate).

### `mask` option — silent no-op risk (CONFIRMED in source)

20. **[MUST] `mask` accepts `"lines"` / `"words"` / `"chars"` — only ONE at a time.** It wraps
    each element of that granularity in an extra element with `overflow:clip` (`style.overflow =
    "clip"` — confirmed `dist/SplitText.js:284`, NOT the docs' stated `visibility:clip`, see
    correction below) for reveal-style animations (e.g. `yPercent` slide-up under a clipping mask).
    If the target class has a CSS class set, `"-mask"` is appended for the wrapper's class name.
    Doc source: gsap.com/docs/v3/Plugins/SplitText (Configuration Object — `mask`).

    **Doc/source discrepancy — installed source wins:** the context7-sourced doc text says the
    mask wrapper uses `visibility: clip`; the installed 3.15.0 source at
    `dist/SplitText.js:284` sets `maskEl.style.overflow = "clip"` (`overflow`, not `visibility` —
    `visibility:clip` is not even a valid CSS value; this is a doc wording error). Trust
    `overflow:clip` when reviewing code that inspects/relies on the mask wrapper's computed style.

    **[MUST] Setting `mask` to a granularity you did NOT include in `type` is a silent no-op.**
    Confirmed at `dist/SplitText.js:279`: `mask && this[mask] && this.masks.push(...)` — `this
    [mask]` (e.g. `this.words`) is **always an array** (empty `[]` if that granularity wasn't
    split), and an empty array is truthy in JS, so the guard passes, `.map()` runs over zero
    elements, and **no error, no warning, no masks are created.** E.g. `type:"lines"` combined with
    `mask:"words"` produces zero mask wrappers with no signal that anything went wrong. **Review
    rule: `mask`'s value MUST be a granularity string that also appears in `type` (comma-checked),
    or it does nothing.**

### Re-splitting on resize / font-load — `autoSplit`, `onSplit`, and the known static-`lines` bug

21. **[MUST] A static split (no `autoSplit`) of `type` including `"lines"`, performed before
    webfonts finish loading, produces WRONG line boundaries** — this is exactly the documented
    problem, not a hypothetical: "SplitText will revert and re-split when fonts load or if the
    element's width changes while splitting lines. **A warning is logged if splitting occurs
    before fonts load without `autoSplit:true`**." I.e. GSAP itself detects and warns about this
    exact failure mode.
    Source: gsap.com/docs/v3/Plugins/SplitText (Configuration Object — `autoSplit`, via context7).

22. **[MUST] `autoSplit:true` is the fix**, and it triggers a re-split on (a) font `loadingdone`
    (confirmed `dist/SplitText.js:289` — `_fonts && splitLines && autoSplit &&
    _fonts.addEventListener("loadingdone", this._split)`) and (b) element width changes, but
    **only when `type` includes `"lines"`** (`splitLines && autoSplit` gates the font-load
    listener). `autoSplit` on a `chars`/`words`-only split has no font-load re-split behaviour to
    speak of, since only line boundaries are width/font-dependent.

23. **[MUST] With `autoSplit:true`, the animation MUST be created inside the `onSplit()` callback
    and returned from it** — not created once outside and pointed at `self.lines` at split time.
    Reason: `autoSplit` reverts and rebuilds the split elements on every re-split (new DOM nodes),
    so an animation built against the first split's element references is animating detached/stale
    nodes after a re-split. Returning the animation from `onSplit()` lets SplitText manage
    cleanup/sync automatically (confirmed `dist/SplitText.js:290-291`: `onSplitResult = onSplit &&
    onSplit(this)` then wired into `this._data.anim`).
    Source: gsap.com/docs/v3/Plugins/SplitText (`autoSplit` "Caution" note + code examples, via
    context7) + installed source.

24. **[MUST] Review rule: any block/component using `SplitText` with `type` including `"lines"`
    and NOT setting `autoSplit:true` is presumptively broken for real-world webfont loading** (the
    exact scenario GSAP's own warning targets) unless there is a documented reason lines are
    guaranteed post-font-load (e.g. `document.fonts.ready` already awaited before the split call).

### `SplitText.create()` vs `new SplitText()`

25. **[SHOULD] `SplitText.create()` is the documented/recommended entry point** in all current
    context7-sourced examples (static-create examples, `autoSplit`/`onSplit` examples all use
    `SplitText.create(...)`, never `new SplitText(...)`). **No explicit doc statement was found in
    this pass asserting a functional difference between `SplitText.create()` and `new
    SplitText()`, nor ruling one out** — flagged as a gap; do not assert they are functionally
    identical or different without checking `dist/SplitText.js`'s `create` static method
    definition directly if this distinction becomes load-bearing for a specific review.

---

## Plugin registration + module builds

26. **[MUST] `gsap.registerPlugin(ScrollTrigger)` / `gsap.registerPlugin(SplitText)` must be
    called before use** — this is the universally-documented registration call.
    Source: gsap.com/docs/v3/Plugins/SplitText ("Register SplitText Plugin", via context7).

27. **[MUST — installed-source-confirmed] An unregistered plugin FAILS SILENTLY-ISH, not loudly.**
    Confirmed at `dist/gsap.js:99`: when a property is set that GSAP doesn't recognise (which is
    what happens when you pass plugin-specific vars like `scrollTrigger:{...}` to `gsap.to()`
    without having registered ScrollTrigger), the internal `_emptyFunc`-style handler runs
    `console.warn("Invalid property", property, "set to", value, "Missing plugin?
    gsap.registerPlugin()")`. This is a **console warning, not a thrown error** — in an ES-module
    build with no `window.gsap` global (so no fallback auto-registration path), a missed
    `registerPlugin()` call will NOT crash the build or the animation call; it will silently drop
    the unrecognised property and continue, which in an SGS block context means: **the tween
    still runs, minus whatever the missing plugin was supposed to do, with only a console.warn as
    evidence** — easy to miss in production, especially if console output isn't monitored.
    **Review rule: grep every file that imports `ScrollTrigger` or `SplitText` from `gsap/*` for a
    matching `gsap.registerPlugin(...)` call in the same module (or a shared bootstrap module
    guaranteed to run first) — a missing pairing is a [MUST]-fix, silent-failure bug, not a lint
    nicety.**

28. **[SHOULD] Tree-shaking / import guidance:** import each plugin from its own subpath —
    `import { ScrollTrigger } from "gsap/ScrollTrigger"`, `import { SplitText } from
    "gsap/SplitText"` — rather than a monolithic bundle import, so unused plugins aren't bundled.
    This is standard GSAP module-import practice reflected throughout the context7-sourced docs
    (all code examples import plugins from their own named export/subpath). **No single doc
    sentence was pulled in this pass that states the tree-shaking rationale explicitly — this
    item rests on consistent example-code convention across all fetched snippets, not a quoted
    doc statement, so it is graded [SHOULD] rather than [MUST].**

---

## Accessibility + reduced motion

29. **[MUST] GSAP's official documented position: respect `prefers-reduced-motion`** because
    animation can trigger nausea/vestibular symptoms for some users — serve minimal or no
    animation to users who've expressed that preference.
    Source: gsap.com/docs/v3/GSAP/gsap.matchMedia() (via WebSearch of gsap.com/docs).

30. **[MUST] The documented, GSAP-native pattern is `gsap.matchMedia()` with a
    `"(prefers-reduced-motion: reduce)"` condition** in the conditions object — e.g.
    `mm.add("(prefers-reduced-motion: reduce)", () => { /* build reduced/no animation here */
    })` alongside the full-motion condition. Inside the reduced-motion branch, either skip the
    animation entirely or use `duration:0` (documented best-practice: "Use `duration: 0` or skip
    the animation when reduceMotion is true").
    Source: gsap.com/docs/v3/GSAP/gsap.matchMedia() (via WebSearch — "Key Best Practices").

31. **[SHOULD] `gsap.matchMediaRefresh()`** is the documented call for immediately reverting all
    active matchMedia conditions and re-running whichever currently match — the stated use case is
    a UI toggle that lets a user flip a reduced-motion preference at runtime (e.g. a manual
    in-page toggle, not just the OS-level media query) without a page reload.
    Source: gsap.com/docs/v3/GSAP/gsap.matchMedia() (via WebSearch — "Key Best Practices").

32. **[MUST] No dedicated SplitText or ScrollTrigger source hook for reduced motion was found** —
    `grep -n "prefers-reduced-motion\|reducedMotion" dist/gsap.js dist/ScrollTrigger.js
    dist/SplitText.js` returned zero matches. **GSAP core does not auto-detect or auto-honour
    `prefers-reduced-motion` on its own** — every animation (ScrollTrigger-driven or not) that
    should respect the preference must be explicitly wrapped in the `gsap.matchMedia()` pattern
    above by the implementer. Do not assume a bare `ScrollTrigger`/`SplitText` call is
    reduced-motion-safe by default.

---

## Explicit gaps — items NOT found / NOT confirmed in this pass

Per instruction: these are flagged rather than invented.

- **Exact mechanism of `scrub` + tween `duration` interaction** (item 7) — general GSAP behaviour
  is well-known (scrub decouples wall-clock duration from scroll-driven progress) but no single
  quoted doc sentence pinning this down precisely was retrieved in this pass.
- **Whether an out-of-range `start`/`end` (not wrapped in `clamp()`) is silently clamped, silently
  ignored, or left unreachable** (item 9) — only the *existence* of the `clamp()` wrapper as the
  documented fix was confirmed, not the default unwrapped behaviour.
- **Late-image-load refresh as an explicit named doc pattern** (item 11) — confirmed general
  resize-recalculation behaviour; the specific "call `ScrollTrigger.refresh()` after late images"
  guidance is standard community practice, graded [SHOULD] rather than [MUST] for that reason.
- **`SplitText.create()` vs `new SplitText()` functional equivalence** (item 25) — no explicit
  doc statement found either way in this pass.
- **Tree-shaking rationale as an explicit doc sentence** (item 28) — inferred from consistent
  example-code convention, not a quoted statement.

Do not treat any of the five gaps above as resolved; if they become load-bearing for a specific
code-review finding, read `dist/ScrollTrigger.js` / `dist/SplitText.js` directly for the exact
mechanism before asserting a rule.

---

## Source index

- context7 library used: `/websites/gsap_v3` (GSAP v3 docs mirror, via `/library-docs` → 
  `python ~/.claude/hooks/context7.py`).
- gsap.com pages fetched live via WebSearch: `gsap.com/docs/v3/GSAP/gsap.matchMedia()`.
- Installed source (version 3.15.0, confirmed `node_modules/gsap/package.json:3`):
  - `plugins/sgs-blocks/node_modules/gsap/dist/gsap.js` (core — registerPlugin warning at line 99,
    context/revert machinery ~lines 930-1530).
  - `plugins/sgs-blocks/node_modules/gsap/dist/ScrollTrigger.js` (pinType lines 1028/1628,
    anticipatePin default line 996, `ScrollTrigger.matchMedia` shim lines 2641-2650).
  - `plugins/sgs-blocks/node_modules/gsap/dist/SplitText.js` (aria lines 51-55/210-219, mask lines
    279-285, autoSplit/onSplit lines 210/289-293, revert lines 23-26).
