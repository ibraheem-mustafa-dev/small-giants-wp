# Post-deploy verification — 3 keyboard-a11y fixes + placeholder contrast

**Date:** 2026-08-01
**Canary:** sandybrown-nightingale-600381.hostingersite.com
**Commits under test:** `686b9ec4` (fx-pin-scrub, D453), `16579194` (fx-scrub + fx-split-reveal), `7193b4ae` (placeholder colour)
**Confirmed shipped:** all three effect JS bundles on the canary are byte-identical (md5) to the local `build/` output, and the local build source-maps to the exact edited `src/` files above. The form CSS bundle carries the colour-only placeholder rule with no `opacity`. This is not an assumption — see "Shipped-file confirmation" below.

## Why this run is different from the D453/D454 sessions

Every prior PASS for these three fixes came from injecting a hand-copied candidate into the live gsap singleton (proves the *mechanism*), or from local build inspection (proves the *bundle contains the code*). Neither proves the shipped, wired-up effect module actually behaves that way when `bootEffect()` runs it for real. This run closes that gap directly: for `fx-scrub.js` and `fx-split-reveal.js` I imported the **literal deployed file, by absolute URL**, into a fresh fixture and let the real `bootEffect()`/`initScrub`/`initSplitReveal` wire it up — no copied logic anywhere in that path. For `fx-pin-scrub.js`, the existing `probe-step13-pin-focus.mjs` already tests the real page's own live pin (page 2114) driven by the real deployed module, so no extension was needed there.

## Shipped-file confirmation

```
md5(local build/fx-pin-scrub.js)   = 0acb2ead01b702f9067d7e331a60c494  == live
md5(local build/fx-scrub.js)       = 1a2cde280081b9398ffbe69210204f16  == live
md5(local build/fx-split-reveal.js)= e28e6ebcaa3862207823ca10b0c262d5  == live
```
Fetched live via cache-busted `curl` against `wp-content/plugins/sgs-blocks/build/shared/effects/gsap/`. All three match the local build exactly. Local build's source contains `keyboardHeld`/`revealForKeyboard`/`focusin`/`focusout` in all three files (grep-confirmed). Form CSS: live `style-index.css` shows `.sgs-form-field__input::placeholder{color:var(--wp--preset--color--text-muted,#555)}` with no `opacity` property anywhere in that rule — matches the commit.

## 1. fx-pin-scrub.js (D453) — PASS

Ran `scripts/motion-qa/probe-step13-pin-focus.mjs` unmodified against page 2114 (`/motion-canary-step22-pin-focus/`).

- **Real-focus fixture** (`REAL_FOCUS_URL`, page 2114) has 4 genuine focusables inside the pin (link, hidden honeypot, text field, submit button). Activation confirmed genuine mid-tween (`opacityChanged: true`).
- **STEP22b — the failing case, exercised on purpose**: settled scroll to mid-tween, then **nudged scroll and pressed Tab with no settle at all** (the shape that made the pre-fix one-shot lose). Traced effective opacity (own × ancestor chain to the pin root) every 50ms for 2.6s: held at 1 throughout. **Re-nudged scroll while focus was still held**: stayed at 1 for a further 2s. Walked through the remaining controls (text field, submit button) with a fresh nudge before each Tab: all held at 1.
- **Negative control fired correctly**: a synthetic off-screen scroll-jack target was correctly flagged as out-of-viewport (`wouldFailGate: true`) — the check itself is not vacuous.
- **Mouse control (choreography must be unchanged)**: with nothing ever focused, a pinned participant's opacity swept 0 → 1 across 11 distinct values (`0.448, 0.871, 0.993, 1…`) tracking scroll normally — no permanent hold, no cost to a mouse user.
- **Reduced motion**: real-focus reduced arm reported no pin engagement issue (SIMPLIFY contract holds — no `realFocusIssues` entry for the reduce arm).
- **Old dead fixtures** (`PIN_URL`/`HP_URL`, the pre-2114 canaries): both still 404, as this file's own header already documents — reported as **INCONCLUSIVE**, not a fail, and not part of this task's scope.

**Verdict: exit 2 (inconclusive only on the two known-dead legacy fixtures), zero FAILs.**

### Separate finding, not this effect (already flagged by the probe, now root-caused)

`pinScrubRealFocus_noPreference step 2` and `STEP22b C/walk step 1`: the real text-field input's own opacity reads `0.4` while the pin's timeline is complete and every ancestor is at `1` — the probe correctly attributes this as "authored/static, not caused by fx-pin-scrub.js." I traced it to source this session (see §4 below) — it is the same `--sgs-focus-ring-opacity` defect that also degrades the placeholder contrast check.

## 2. fx-scrub.js — PASS (both evidence tiers)

**Tier 1 — in-situ synthetic harness** (`probe-step14-scrub-focus.mjs`, unmodified logic): unfixed mechanism correctly failed the negative control (never converges); fixed mechanism held effective opacity ≥0.99 through the race and a re-nudge while focused, released cleanly, ticker count returned to baseline; mouse-only sweep showed opacity tracking scroll across 20 distinct values 0→0.99.

**Tier 2 — real shipped module** (new, added this session — see "Extension to the probe" below): built a fixture with `data-sgs-fx="scrub"` (no explicit `data-sgs-fx-scrub`, i.e. the framework's numeric-scrub **default**) and a real focusable link, then dynamically `import()`'d the literal deployed `fx-scrub.js` by URL so the real `bootEffect('scrub', initScrub)` wired it up.

- `no-preference`: activation sweep confirmed genuine mid-tween (`opacityChanged: true`, trigger `start:3951 end:4356`). Forced the race (nudge scroll + focus with zero settle): opacity trace stayed at `1` for the full 2.6s window; re-nudged while held: stayed at `1` for a further 2s; released focus and scrolled back to the low-opacity position: opacity dropped to `0.186` — the hold released and normal scrub tracking resumed. Mouse-only sweep (measured before any focus occurred, same fixture) showed opacity tracking 0→0.99 across distinct values.
- `reduce`: **no ScrollTrigger was created at all** (`triggerCreated: false`) and the element rendered at `opacity: 1, transform: none` — the SIMPLIFY contract (§10) holds on the real module, not just the synthetic copy.

**Verdict: exit 0, zero FAILs, real deployed file confirmed.**

## 3. fx-split-reveal.js — PASS (both evidence tiers)

**Tier 1 — in-situ synthetic harness** (unmodified): unfixed mechanism correctly left the link invisible before the trigger fired (negative control fired); fixed mechanism revealed on focus before any scroll, survived the real `onEnter` firing later, survived scrolling back up past `start`.

**Tier 2 — real shipped module** (new). Host page: `fx-preset-comparison` (a published canary already using split-reveal elsewhere on the page, so its own `<script type="importmap">` already carries the `@sgs/gsap-splittext` entry the real module needs — confirmed live before relying on it; `motion-canary-step22-pin-focus` does **not** carry that entry and a direct import there throws `Failed to resolve module specifier`). Built a fixture `<p>` with `data-sgs-fx="split-reveal"` wrapping a real `<a>`, then `import()`'d the literal deployed `fx-split-reveal.js` by URL.

- `no-preference`: `beforeFocus: 0` (correctly hidden pre-split/pre-focus) → focused the link before any scroll → `afterFocusPreScroll: 1` (one-shot reveal lands) → scrolled down to cross the real trigger point → `afterCrossingTrigger: 1` (native `onEnter`'s `.play()` on an already-finished tween is a forward no-op, does not disturb the hold) → scrolled back up past `start` → `afterScrollingBackUp: 1` (default `toggleActions` has no reverse leg, confirmed on the real module). Separate unattended fixture, nothing ever focused: min fragment opacity converged from `0` to `1` as scroll crossed the real trigger (mouse-only reveal intact — this took a properly *settled* poll, not a fixed wait; a first attempt at 500ms mid-stagger read `0` and would have been a false fail, corrected before it went in the verdict — see "Measurement bug caught" below).
- `reduce`: **zero `aria-hidden="true"` fragments were created** (SplitText's own `aria:'auto'` marks every generated fragment `aria-hidden="true"`; the pre-existing literal `<a>` in the fixture's own markup is not one of them — confirmed by inspecting the already-split fixture's children before trusting this signal) and the element's own opacity read `1` — SplitText never ran, plain readable text, matching the SIMPLIFY contract on the real module.

**Verdict: exit 0, zero FAILs, real deployed file confirmed.**

### Measurement bug caught and fixed mid-run (reported per the honesty rule, not swept past)

My first cut of the reduced-motion split-reveal check asserted `el.querySelectorAll('*').length === 0`. It **false-failed**: `childCount: 1` — but that one child was the fixture's own pre-existing `<a>`, present regardless of whether SplitText ever ran, not a split fragment. Root-caused by inspecting the already-split (no-preference) fixture's children directly: every genuine SplitText fragment carries `aria-hidden="true"`; the literal `<a>` never does. Fixed the assertion to count `[aria-hidden="true"]` descendants instead (`0` under reduce, correct). This is exactly the "prove the cause before the fix" pattern this project's rules ask for — I did not report the false fail as a real one.

### Extension to the probe (per rule 1)

Both real-module checks above, plus the reduced-motion arms for `fx-scrub`/`fx-split-reveal` (which the file did not test at all before this session), were added to `plugins/sgs-blocks/scripts/motion-qa/probe-step14-scrub-focus.mjs` as new functions `runRealScrubModule()` / `runRealSplitRevealModule()` plus their own verdict block, run with the rest of the file (`node scripts/motion-qa/probe-step14-scrub-focus.mjs`, exit 0). The file's own stale header claim ("the live canary still serves the PRE-FIX bundles") is now corrected by the new verdict banner printed alongside it — the header docblock itself was left untouched (out of scope for a report-only + probe-extension session) but the printed verdict now states both evidence tiers honestly.

## 4. sgs/form placeholder contrast — mixed: source fix correct, rendered value degraded by an unrelated pre-existing defect

**Static/source check — matches the claim exactly.** Live CSS: `.sgs-form-field__input::placeholder{color:var(--wp--preset--color--text-muted,#555)}`, no opacity anywhere in that rule. On this canary (client: **mamas-munches**, confirmed via page title "…– Mama's Munches"), `--wp--preset--color--text-muted` computes to `#6b5c50` against a field background of `#fbf3dc` (cream, matching the commit's own note "mamas-munches 5.79, on cream not white"). Computed contrast: **5.79:1** — I independently recomputed this from the two rendered RGB values using the standard WCAG relative-luminance formula and got exactly 5.79, matching the commit message's own figure.

**Rendered check — degraded to ~1.79:1 by a separate, pre-existing bug, not by this fix.** `getComputedStyle(input, '::placeholder')` only resolves correctly when read in the same synchronous call as the JS `.focus()` (a separate later call reports the pre-focus transparent state — a probe-timing trap, not a real defect; recorded so it isn't mistaken for one). Reading it correctly gave `color: rgb(107, 92, 80)`, `opacity: 1` — the fix is applied as intended in isolation.

But a **screenshot pixel-sample** of the focused field (per the measurement-vs-eye rule — computed style alone was not trusted) showed the placeholder rendering as `rgb(194, 183, 164)`, not `rgb(107, 92, 80)`. Traced to source: this field's `<input>` matches `.sgs-form-field__input:focus-visible { opacity: var(--sgs-focus-ring-opacity, 1) }`, and this instance carries `--sgs-focus-ring-opacity: 0.4` set at the `.wp-block-sgs-form` container level. `0.4 × #6b5c50 + 0.6 × #fbf3dc ≈ rgb(193, 183, 164)` — matches the pixel sample almost exactly, confirming the mechanism. **Recomputed contrast of the actually-rendered colour: 1.79:1** — a real WCAG 1.4.3 failure, but caused by a rule that dims the *entire input element* (not a ring/outline) whenever it is keyboard-focused, unrelated to the placeholder-colour commit under test.

This is the same root cause the pin-scrub probe (§1) already flagged as "authored/static, not caused by fx-pin-scrub.js, owned elsewhere" for the same input on a different page — I have now traced that flag to its actual source.

**This is a real finding to report, not to fix (read-only rule):**
- **File:** `sgs/form`'s block CSS, rule `.sgs-form-field__input:focus-visible { opacity: var(--sgs-focus-ring-opacity, 1) }`.
- **Effect:** whenever `--sgs-focus-ring-opacity` is set below ~0.9 on a form instance, the *entire* focused input (border, text, and placeholder) dims toward the background — the opposite of what a focus indicator should do, and it independently fails contrast for the placeholder text regardless of how correct the placeholder-colour token is.
- **This instance's value (`0.4`)** is set at the `sgs/form` block/container level (a CSS custom property, consistent with "per-instance overrides = block attributes"), not in this session's commits.
- **Suggested fix shape (not applied):** the intent named by the variable ("focus ring opacity") should scope to an outline/box-shadow/ring pseudo-element, not the input's own `opacity`. That is a design decision for whoever owns `sgs/form`, not something to patch inline here.

## Mouse-user regression — all three, PASS

| Effect | Evidence |
|---|---|
| fx-pin-scrub | `mouseChoreography` sweep: 11 distinct opacity values 0→1 tracking scroll, nothing focused during the sweep |
| fx-scrub | Original `mouseControl`: ticker listener count unchanged pre/post fixture build (no callback added without focus); opacity swept 0→0.99 across 20 distinct values. Real-module run repeated the same sweep with identical result |
| fx-split-reveal | Real-module unattended fixture: reveal fires normally on scroll with nothing ever focused, converged 0→1 (needed a genuine settle-poll, not a fixed wait — see measurement note above) |

## Reduced motion — all three, PASS (Playwright context `reducedMotion`, not DevTools MCP)

| Effect | Result |
|---|---|
| fx-pin-scrub | Real-focus reduced arm: no pin-engagement failure reported (SIMPLIFY holds) |
| fx-scrub | Real module: no ScrollTrigger created, `opacity:1`, `transform:none` |
| fx-split-reveal | Real module: zero `aria-hidden` fragments (SplitText never ran), `opacity:1`, full original text present |

## What I could not fully verify

- The two **legacy canary fixtures** `motion-canary-pin-scrub` / `motion-canary-horizontal-panel` are still 404 (documented pre-existing state, not something this session touched) — the probe reports this as INCONCLUSIVE rather than a false pass, which is correct.
- I did **not** re-verify `fx-horizontal-panel.js` — it was explicitly out of scope for the D453/D454 fix commits ("deliberately untouched") and out of scope for this dispatch's three named fixes.
- The `--sgs-focus-ring-opacity: 0.4` finding is reported, not fixed, per the read-only rule — closing it needs a decision from whoever owns `sgs/form`'s focus-ring architecture (ring vs whole-element opacity), which is a source change outside this session's remit.

## Files touched this session

- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\motion-qa\probe-step14-scrub-focus.mjs` — extended with `runRealScrubModule()`, `runRealSplitRevealModule()`, and their verdict block (real shipped-module + reduced-motion closure for fx-scrub/fx-split-reveal). No other source files were modified.
- `C:\Users\Bean\Projects\small-giants-wp\reports\visual-diff\a11y-postdeploy-2026-08-01.md` — this report.

No git commands were run beyond read-only `git log`/`git show`/`git status`. Nothing was deployed.
