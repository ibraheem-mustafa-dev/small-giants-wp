---
doc_type: session
project: small-giants-wp
date: 2026-07-30
track: "Track 3 — Spec 38 motion system"
outcome: "Wave A CLOSED — 5 close-out items + 2 owner-reported defects, all live-verified"
decisions: [D416, D417]
---

# Spec 38 motion — Wave A close-out session

Wave A is **CLOSED**. Five close-out items shipped, plus two defects Bean's eye caught that no
mechanical check had. Wave B ∥ C are the next motion fronts and their session prompts are unchanged.

## Commits

| SHA | What |
|---|---|
| `810a15f9` | Panel travel — land the last panel where the first began |
| `f3303c85` | D416 — keep the nested matchMedia; clear the reduced-motion arm |
| `c164368e` | `fxEnd` + `fxTrigger` controls, DB-driven |
| `ffc9d581` | Close-out records + 2 parked findings |
| `4ae10dd9` | Pin-scrub children actually animate (Bean-reported) |
| `1e08f96a` | Pin-scrub records |
| `48f34e9e` | D417 — hold the finished state before a pinned section releases (Bean-reported) |

Full evidence: `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md`.

## The five close-out items

1. **Panel travel** — real error was **100px, not the 264px on record**. The recorded figures were
   stale *and* arithmetically impossible under the shipped CSS (`flex-basis 1100` × `flex-shrink 0`
   floors a 4-panel row at 4400; the note said 4189). The `-111` start offset was an artefact of
   probing a page with `scroll-behavior: smooth` still in flight. Travel now derives from where the
   last panel must LAND. Verified 100px → **0px**, with the pre-fix run as negative control.
2. **matchMedia — REVERSED, not applied.** The brief's justification does not exist: gold-standard
   item 14 says nesting is *redundant*, never harmful, and refers to a manual `gsap.context()`, not
   a nested `matchMedia`. Sibling conditions on one MatchMedia fire independently, so the change
   would have run the desktop pin **under reduced motion** while the CSS that disables the native
   scroller stayed gated on `no-preference`. Item 14 + `provider.js` amended.
3. **`fxEnd` + `fxTrigger` controls**, driven by two new `fx_effects` columns (`pins`, `triggers`)
   rather than more hand-kept arrays in `fx.js`. `fxTrigger` was **not** deleted — Spec 38 §11.2
   defines it as `load|scroll|hover`.
4. **Reduced-motion arm — the "unreachable panel" report was FALSE.** It measured the
   motion-ALLOWED branch. Chrome normalises the specified `overflow-x: clip` to `hidden` when the
   other axis is non-visible, so the reported readings cannot distinguish the two branches at all.
5. **Bean's eye — 6 of 7 canaries passed**, then two rounds of real defects below.

## Bean's two catches (R-31-13 earning its place)

**Pin-scrub animated nothing.** Two independent faults, either alone fatal:
`data-sgs-fx-child` was required on every participant and **written by nothing anywhere in the
codebase**; and it read DIRECT children when `sgs/container` puts content a level deeper. Both
yield an empty participant list — and an empty timeline still pins perfectly, so the effect looked
wired. Participants 0 → 3 after the fix.

**No hold before release.** The pin released the instant the last child landed (~100px of
scrolling with everything assembled — one wheel notch). GSAP has no dwell concept: a pin lasts
exactly as long as `end` and `scrub` stretches the timeline across all of it, so a hold exists only
where the timeline leaves room. Added as trailing dead time (NOT a longer `end`, which would also
slow every entrance), default 33% of the pin, exposed as **"Pause after the animation"**.
Spec §11.2 + §11.3 amended in the same commit.

## Carry-forward rules earned here

- **An effect that ENGAGES is not an effect that WORKS.** Assert on the thing that should MOVE.
- **A read with no writer fails silently and no gate catches it.** `fxTrigger` and
  `data-sgs-fx-child` were both consumed by code and produced by nothing. Grep for the WRITER.
- **Identifying the right element ≠ being at the right DEPTH.** Three defects this session came
  from reading one DOM level above the content. Resolve by framework-owned class, never position.
- **A measurement that contradicts the code it describes is stale until proven otherwise.**
- **`scroll-behavior: smooth` invalidates scroll-and-sample probes** — force `auto` for the run.
- **A pinning effect does not begin at translate 0** (the chrome offset moves the start), so
  anchor "the start position" by finding translate `x === 0`, not by taking the first sample.

## Open, parked, not mine to fix here

- `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` — every `sgs/container` on the canary pages is
  invalid in the EDITOR (stored markup carries a wrapper div `save.js` never emits). Frontend fine
  and measured green. Confirmed pre-existing: `container/save.js` last changed at `e1459e6d`.
- `P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE` — `check-dead-controls.js:514`,
  `check-control-ux.js:455`, `audit-inspector-conformance.js:270` all exclude
  `src/blocks/extensions/`. Spec 38 §7's "covers every new panel automatically" is FALSE for it.
- **`/sgs-update` Stage 11 WARNS (exit 1), nothing applied** — detects `sgs/mega-panel` as section
  and `sgs/mega-aside`/`sgs/mega-group` as content, none in its expected roster. Those are the
  nav/header track's blocks; left alone deliberately rather than editing another track's ground
  truth. Whoever owns mega- should reconcile the roster.
- Motion bundle baseline re-recorded 3× this session, each behind a real behaviour change
  (`fx-horizontal-panel` 555→691, `fx-scrub` 418→616, `fx-pin-scrub` 644→927). **The recorded
  figure is not current:** `48f34e9e` (the hold) added ~81 lines to `fx-pin-scrub` without a
  re-baseline, so it now measures 1033 built against 927 recorded — **+11.4%, gate PASSES** at the
  20% threshold, which is why no re-baseline was needed. Deliberate, not an oversight: re-recording
  a baseline that is still inside budget is the reflex that hollows this class of gate out. Only
  re-baseline when the gate actually fails and a real behaviour change is behind it.

## Next motion front

**Waves B ∥ C**, prompts unchanged at `plans/2026-07-29-motion-wave-B-session-prompt.md` and
`…-wave-C-session-prompt.md`. Both Wave A plan files were deleted at Bean's instruction
(git history retains them; no live doc referenced them).

Before Wave B builds any new effect, note that **two of Wave A's defects were attribute contracts
with no writer**. A new effect that reads `data-sgs-fx-*` should have its writer proven on a live
page before the effect is called done.
