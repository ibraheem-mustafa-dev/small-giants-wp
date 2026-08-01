# Council Review — D453 pin-scrub keyboard-hold fix (read-only, no edits made)

**Reviewed:** `plugins/sgs-blocks/src/shared/effects/gsap/fx-pin-scrub.js` (uncommitted, D453) against `.claude/decisions.md` D453, `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3.1/§10, and the three sibling effect modules (`fx-scrub.js`, `fx-split-reveal.js`, `fx-horizontal-panel.js`). GSAP source verified against the installed package: `node_modules/gsap` v3.15.0 (matches D453's cited version).

Format: severity — angle — file:line — confirmed/inferred — predicted measurement (for anything actionable).

---

## Critical

### C1 — The fix is confined to one file; three sibling effects share the exact defect shape, unfixed
**Angle 4 (spec compliance / R-31-9).** **CONFIRMED in code.**

- `fx-scrub.js:98-114` — scroll-branch builds `gsap.fromTo(el, {opacity:0, y:40}, {opacity:1, y:0, scrollTrigger:{..., scrub: resolveScrub(el)}})`. `fromTo` defaults `immediateRender: true` (undocumented anywhere as overridden here — no `immediateRender` key in the vars object), so the element's opacity is 0 the instant the tween is built, before any scroll. `resolveScrub()` (`provider.js:342-347`) returns a **number by default** whenever no `data-sgs-fx-scrub` is set — the exact framework default D453 names as the vulnerable configuration for pin-scrub. There is **no `focusin`/`focusout` handling anywhere in this file** (verified: zero matches for `focus` in `fx-scrub.js`). Any focusable descendant of a `data-sgs-fx="scrub"` element is exposed to the identical race D453 fixed for pin-scrub: a keyboard user tabbing into it before the scrub reaches the relevant scroll position lands on an invisible, focusable control, and — because `resolveScrub()`'s default is a number, not `true` — ScrollTrigger builds the same internal `scrubTween` with the same per-frame `resetTo` (confirmed below), so even a one-shot `progress(1)` would lose the identical race D453 already measured losing on pin-scrub.
- `fx-split-reveal.js:184-191, 193-204` — scroll branch: `gsap.from(targets, {opacity:0, y:'0.6em', ..., scrollTrigger:{trigger:el, start:...}})`. **No `scrub` key at all** — this is a one-shot toggle-triggered play, not a continuously re-driven scrub. This is a *materially different* failure shape from pin-scrub/fx-scrub: there is no `resetTo` fighting a one-shot fix here (inferred from GSAP's documented toggle-vs-scrub distinction — not independently re-measured on a live page this session), so the *simpler* D453-v1 fix (`tween.progress(1)` on focusin, no ticker) would plausibly be sufficient for this file — but that is a hypothesis, not something this review measured. What IS confirmed is that the same starting condition exists: split text fragments start at `opacity:0` on page load/split and stay that way until the ScrollTrigger fires, with no focus handling at all.
- `fx-horizontal-panel.js` — does **not** hide content (translate-only, no opacity change), so it is not exposed to the *same* defect. It has a related but distinct risk noted as C2 below.

**Why this is Critical, not Major:** R-31-9 (this project's own binding rule) requires every fix to "apply to every qualifying case" before being treated as closed. D453's own text frames the fix as resolving "the top open item of the wave" for pin-scrub specifically, but the underlying defect — a `fromTo`/`from` reveal tween with default `immediateRender: true` sitting behind a scroll trigger, with no keyboard-focus contract — is a **class**, not an instance. Shipping this fix as-is closes one instance and leaves at least one (`fx-scrub.js`) confirmed still exposed to the literal WCAG 2.4.11 defect D453 exists to fix, using the framework's own default configuration.

**Predicted measurement to settle it:** repeat D453's own live probe (canary page with a focusable link/field/button inside a `data-sgs-fx="scrub"` element and no `data-sgs-fx-scrub` attribute set) — trace effective opacity (element × ancestor chain) at 50ms for 2.6s while focusing the control mid-scrub. Prediction: opacity traces flat at whatever the scroll position had reached, i.e. the same defect, because `resolveScrub()`'s default (a number) drives the identical `scrubTween`/`resetTo` mechanism proven below.

---

## Major

### M1 — `ScrollTrigger.js` line citation in D453 does not match the installed source
**Angle 1 (correctness) / meta.** **CONFIRMED.**

D453 (`.claude/decisions.md`) and the code comment at `fx-pin-scrub.js:386` both cite `ScrollTrigger.js:1149` for `self.update`'s `resetTo` call. In the actually-installed `node_modules/gsap/dist/ScrollTrigger.js` (v3.15.0, matching the version both docs claim to have verified):

- `self.update = function (reset, recordVelocity, forceFake) {` is at **line 2258**, not 1149.
- The `scrubTween.resetTo("totalProgress", clipped, ...)` call this whole fix is built on is at **line 2316-2323**, not 1149.
- Line 1149 in the installed file is unrelated (`_queueRefreshAll`/scroll-restoration code).

The underlying *mechanism* claim — "every scroll update calls `resetTo` on the scrub tween" — **is independently confirmed correct** (see M2 below); this is a citation error, not a wrong conclusion. But D453 explicitly documents this exact session catching two prior self-inflicted citation/verification errors (the closure-local `scrubTween` claim, later retracted) as "worth carrying forward" — a third uncaught citation slip in the same document, on the same file, the same day, is the load-bearing pattern the doc itself calls out as a recurring risk. This should be corrected in the decision log and the code comment so a future reader who tries to jump to `:1149` to re-verify lands on the wrong code and either wastes time or (worse) fails to re-verify and takes the claim on faith — precisely the failure mode `prove-the-cause-before-fix.md` exists to prevent.

**Predicted verification:** `grep -n "self.update = function (reset" node_modules/gsap/dist/ScrollTrigger.js` → returns 2258, not 1149, on any environment with the same installed version.

### M2 — Ordering guarantee the whole fix depends on is real, but undocumented and unenforced
**Angle 1/2 (correctness + performance).** **CONFIRMED, with one caveat.**

The fix's core claim — "a ticker callback added here runs after gsap's own root update... and cannot be undone by the scrub's write in that same frame" (`fx-pin-scrub.js:411-415`) — is verified against the installed source:

- `gsap.js:1212` — the ticker's `_listeners` is a plain array.
- `gsap.js:1296-1305` — `add(callback, once, prioritize)` does `_listeners[prioritize ? "unshift" : "push"](func)`. `gsap.ticker.add(holdComplete)` in `fx-pin-scrub.js:452` passes no `prioritize` arg, so it is **appended** (`push`).
- `gsap.js:1243-1244` — `_tick` iterates `for (_i = 0; _i < _listeners.length; _i++) _listeners[_i](...)` — strict insertion order.
- `gsap.js:4025` — `_ticker.add(Timeline.updateRoot)` registers GSAP's own root update at **module-load time**, i.e. before any runtime `focusin` can fire.

So on the current codebase, `holdComplete` genuinely always executes after `Timeline.updateRoot` in the same tick, because it is always added later and the array is never re-sorted. **This is a real, correct, load-bearing ordering guarantee — but it is an *implicit* one.** Nothing prevents a future effect module (or a third-party GSAP plugin) from calling `gsap.ticker.add(fn, false, true)` (`prioritize: true`, `unshift`) and landing ahead of `Timeline.updateRoot`, or ahead of `holdComplete` specifically, silently invalidating the "writes last" guarantee this fix depends on. There is no assertion, comment-only convention elsewhere, or test that would catch this regressing.

**Predicted measurement that would prove/disprove drift over time:** a repeatable unit-style check — register a probe ticker callback with `prioritize: true` after `fx-pin-scrub` boots and assert `holdComplete` still runs after it fails; conversely, confirm no other Tier G module in the codebase currently calls `.add(..., true)` (`grep -rn "ticker.add(" plugins/sgs-blocks/src` — checked this session, zero `prioritize: true` calls exist today, so the guarantee currently holds by absence of counter-examples, not by enforcement).

### M3 — `fx-horizontal-panel.js`: a distinct, unaddressed keyboard-reachability question for translated (not hidden) content
**Angle 3 (accessibility).** **INFERRED, not measured live this session** — flagged because it sits in the same defect family (pinned content + keyboard focus) as D453 but was not covered by D453's fix or by the "LIVE-VERIFIED 2026-07-31" spec note.

`fx-horizontal-panel.js` translates a `track` element horizontally via `x: () => -getTravelDistance()`; panels after the first start positioned to the right of the visible host, and at ≥768px the container CSS sets `overflow-x: clip` (per the file's own comment at `:183`, describing the oversized-panel guard). Spec 38 §3.1's live-verified keyboard note (`38-SGS-MOTION-SYSTEM.md:146-167`) covers **vertical** pin-scrub and horizontal-panel's **native scroll-snap fallback** (<768px / reduced motion), relying on "the browser's native scroll-the-newly-focused-element-into-view" affordance. That native affordance works for *vertical* scroll unpinning (confirmed by the spec's own live verification) and for horizontal *scrollable* overflow (`overflow-x: auto`). It is not obviously true for the ≥768px desktop branch, where the horizontal offset is driven by a GSAP `transform: translateX()` inside a `overflow-x: clip` container rather than by native scroll — `clip` is explicitly non-scrollable, so there is no scrollbar for `scrollIntoView`/native focus-scroll to operate on in the horizontal axis. If a keyboard user tabs into a link inside panel 3 before the vertical scroll position has driven the track's translateX far enough, panel 3 may be clipped out of view with no native mechanism to bring it into the viewport (vertical scroll can un-pin the section, but that only affects the vertical axis, not the horizontal clip).

This is explicitly **out of scope for the D453 diff under review** (D453 never touches this file), but it is the same class of "pinned/scroll-choreographed content can hold focus off-screen" problem, and the project's own §3.1 note frames the keyboard contract as "measured and holds" for *both* pinning effects without this horizontal-clip case having been probed. Recommend it be logged as a follow-up investigation (not blocking this commit), since C1 already establishes that "fixing one instance does not immunise the class" applies broadly here.

**Predicted measurement:** on the horizontal-panel canary, focus a link inside panel 3+ via Tab before scrolling that far, and trace `getBoundingClientRect()` of the focused element relative to the host's clip rect. Prediction: the element's rect falls outside the host's visible bounds with no automatic remediation, for at least part of the pin.

---

## Minor

### m1 — `focusout`'s `relatedTarget` guard is correct for the documented cases, unverified for window-blur
**Angle 1 (correctness).** **CONFIRMED for the common case; INFERRED for the edge case.**

`releaseForKeyboard` (`fx-pin-scrub.js:458-466`) only releases when `event.relatedTarget` is falsy or outside `el`. This is correct for: focus moving between sibling controls inside the section (guarded, does not release — confirmed by reading the condition), and focus moving to `null` via a click on non-focusable space or moving to a genuinely separate element outside `el` (`relatedTarget` present but `el.contains()` false → releases — confirmed). Not independently tested this session: when the **window** loses focus (alt-tab, devtools), most browsers do **not** fire `blur`/`focusout` on the previously-focused element at all (the element visually retains `:focus` but no event fires), so `keyboardHeld` would stay `true` and the ticker callback would keep running while the tab is backgrounded. Given the guard `if (timeline.progress() < 1) { timeline.progress(1); }`, once progress is already 1 this is a near-zero-cost no-op per frame, not a functional bug — but it is a real (if cheap) "ticker keeps running longer than the visible focus-hold implies" case worth naming rather than assuming away.

**Predicted measurement:** focus a control inside the pinned section, then blur the browser window (not the page) without moving focus elsewhere in the DOM; poll whether `focusout` fired (it should not, per spec) and whether the ticker callback is still registered (`gsap.ticker` has no public introspection API for this — would need a wrapped/instrumented build to observe directly).

### m2 — Two verification traps in D453 are self-reported, not this-review's discovery
Noted for completeness, not re-litigated: D453 already documents (a) a `cleanups`-array `ReferenceError` caught only by brace-depth analysis after `node --check` and ESLint both passed vacuously, and (b) a factually wrong claim about `scrubTween` being unreachable, later corrected same-day. Both are already carried in the decision log per this project's own transparency norm; flagged here only to confirm they were read and are not silently missing from this review's picture.

---

## Angle-by-angle summary (no new findings beyond the above)

1. **Correctness/lifecycle** — Ticker leak: confirmed absent in the normal case (M2's ordering claim is sound; cleanup removes both listeners + ticker unconditionally, `fx-pin-scrub.js:519-522`). Reduced-motion mid-session switch: confirmed handled correctly — `withMotionAllowed`'s `gsap.matchMedia().add(query, callback)` (`provider.js:349-355`) means GSAP itself invokes fx-pin-scrub's returned cleanup automatically when `(prefers-reduced-motion: no-preference)` stops matching, which removes the `focusin`/`focusout` listeners and the ticker callback — this is real GSAP `MatchMedia` behaviour, not an assumption, and is exactly what the code's own comment at `:508-518` describes. Element removed from DOM while focus is inside: plausible-safe (browsers generally fire `focusout` with `relatedTarget: null` before/during removal, which releases correctly per the guard) but not independently reproduced live this session — inferred. Two pinned sections on one page: confirmed safe, each `initPinScrub(el)` call creates its own closure-scoped `holdComplete`/`keyboardHeld`, no shared state (M2's finding). Rapid focus in/out: confirmed safe by the `keyboardHeld` boolean guard preventing duplicate `ticker.add` calls.
2. **Performance** — Confirmed zero ticker cost when nothing is focused (ticker callback only exists between `revealForKeyboard`/`releaseForKeyboard`). Confirmed the per-frame cost while held is a cheap getter-then-skip once `progress() === 1` (M2). No evidence found of visible stutter for a scrolling+focused keyboard user — not independently load-tested, but the mechanism (single property read most frames) does not suggest one.
3. **Accessibility** — Anchor-link/`autofocus`/find-in-page: plausible-covered (both fire real `focus`/`focusin` events on the target which bubble to `el`) — inferred, not measured live. Screen-reader virtual cursor: bounded correctly for the *interactive-element* case D453 targets (activating a link/button via virtual cursor does move real DOM focus, triggering `focusin`); the reveal's inapplicability to *non-interactive* text under a virtual cursor is arguably outside WCAG 2.4.11's scope (which is a focus criterion), so not treated as a gap here. Coverage gap: **C1** (siblings) and **M3** (horizontal-panel) are the substantive findings.
4. **Spec/rule compliance** — **C1** is the dispositive finding: R-31-9 requires universal fixes; this one is not yet universal. Spec 38 §3.1's "LIVE-VERIFIED... holds" language pre-dates D453's own discovery that it did NOT hold for pin-scrub with focusable content, and has not yet been amended to reflect either the corrected mechanism or the open sibling-file exposure — a documentation follow-up, separate from the code fix itself.

---

## Verdict: **GO-WITH-FIXES**

The `fx-pin-scrub.js` mechanism itself is sound and well-verified — M1/M2 are documentation-quality and hardening notes, not reasons to block this specific file. The reason this is not a clean GO is **C1**: `fx-scrub.js` is confirmed, by direct source reading, to carry the identical WCAG 2.4.11 defect D453 was opened to fix, using the framework's own default scrub configuration, with zero focus handling. Shipping the pin-scrub fix alone, without at minimum opening a tracked item (or better, applying the equivalent fix) for `fx-scrub.js`, repeats the exact failure pattern this project's own memory index names explicitly: `fixing-one-instance-does-not-immunise-the-class`.

**Recommended before/alongside commit (not gating the pin-scrub fix's own correctness):**
1. Apply the same `focusin`/ticker-hold pattern to `fx-scrub.js`'s scroll branch (predicted to need the full ticker approach, not a one-shot, because `resolveScrub()`'s default is a number).
2. Investigate `fx-split-reveal.js`'s scroll branch — likely needs a *simpler* one-shot fix given it has no `scrub` config (hypothesis, not measured).
3. Correct the `ScrollTrigger.js:1149` citation in D453 and in `fx-pin-scrub.js:386,400-402` to the verified line numbers (2258 / 2316-2323).
4. Log `fx-horizontal-panel.js`'s horizontal-clip keyboard-reachability question (M3) as a follow-up investigation.
5. Amend Spec 38 §3.1's keyboard-contract note to reflect the corrected mechanism and the open sibling-file status, rather than leaving it reading as a closed, universally-verified claim.
