# Motion track — `sgs/timeline` connector, Stage A (2026-08-29)

**Invoke `/autopilot` before anything else.**

You are building the foundation of a scroll-driven connector for `sgs/timeline`, then fanning two
independent driver implementations out to parallel agents. The foundation is yours and must not be
delegated — it defines the contract both agents write to.

---

## State recap

MIC (Muslims in Construction) want a journey page where the connector line fills progressively as
you scroll, with four themed variants later: pulse, vine, tree, falling bricks.

Nothing of this is built. What exists is a **plan that has already been through a QC pass** at
`~/.claude/plans/motion-track-happy-lamport.md`, carrying ten numbered corrections (C1-C10). That
QC **refuted one load-bearing assumption outright** — read C1 before writing a line of CSS.

The previous session closed the grid-dots rework (deployed, live-verified) and is not related to
this work beyond both being motion track.

---

## ⛔ Read these three before starting, in this order

1. `~/.claude/plans/motion-track-happy-lamport.md` — the plan, and especially the **QC corrections
   C1-C10**. They override anything else that contradicts them.
2. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — **in full**, per the standing rule. §1 (tier doctrine)
   and §1.6 (JS house contracts: init→cleanup, bfcache teardown, frame budget) are load-bearing here.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — the governing spec, read in full at session
   start per the Bean-locked 2026-07-01 rule.

---

## Two findings from the last session that change the build

### 1. Firefox has ZERO support for `animation-timeline` today

Measured 2026-08-28, not recalled:

| Browser | `animation-timeline` |
|---|---|
| Chrome / Edge | 115+ ✅ |
| Safari | **26.0+** ✅ (landed Sept 2025) |
| **Firefox** | **157** — current stable is **153.0.4** (11 Aug 2026) ❌ |

Global 85.43%. MDN: *"This feature is not Baseline because it does not work in some of the most
widely-used browsers."*

⛔ **Two docs are wrong about this and must not be trusted.** **Spec 38 lines 223-224** say *"Safari
stable still lacks CSS Scroll-Driven Animations (Chromium 115+ and Firefox have them)"* — that is
wrong in BOTH directions: Safari has had it for eleven months, and Firefox does not have it at all.
A prior research pass claimed *"Firefox 132+, Safari 18+"* — also wrong on both numbers.
**The blocker is Firefox, not Safari — exactly inverted from what the spec says.** Correcting those
two lines in Spec 38 is part of this work, not optional tidying: a spec that names the wrong browser
will send the next person to build the wrong fallback.

**Consequence:** the JS path is not a "fallback", it is the primary path for every Firefox user.
Build it as a first-class implementation, not an afterthought.

`@property` by contrast is safe: **94.21%**, Chrome/Edge 85+, Firefox 128+, Safari 16.4+. C1's fix
carries no support risk.

### 2. C9 is resolved for Stage A — the existing connector is a STRAIGHT bar

`style.scss` renders the connector as a plain rectangle (`position:absolute; top:0; bottom:0;
left:50%; width:var(--sgs-connector-width)`), with left/right-align variants, and a horizontal
sibling at `:229-237`. There is no curve.

So the QC worry that a fixed-coordinate SVG path cannot track content-driven height **does not
apply to Stage A**: a straight path in a `viewBox` with `preserveAspectRatio="none"` scales
perfectly at any height. Curves only arrive with vine/tree in Stage B, by which point the contract
is frozen. Bean's SVG choice stands and its main risk is gone.

---

## THE CONTRACT — build this first, do not delegate it

Every downstream piece depends on these exact names. Both agents are told to assume them.

```css
@property --sgs-timeline-fill-progress {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}
```

⛔ **C1, the fatal one.** An *unregistered* custom property has computed type "token stream" and
**cannot be animated** — CSS interpolates it as a discrete 0→100% jump in every browser. Without
this `@property` block the fill silently is not progressive, the property still resolves, and every
gate passes. This is not optional polish.

**Markup** (`render.php`): an SVG `<path>` with `pathLength="1"` and `aria-hidden="true"`, emitted
only when `connectorProgressFill` is on, plus a `sgs-timeline--connector-progress` class following
the existing class pattern at `render.php:325`.

⛔ **C2** — `pathLength="1"` normalises any geometry to unit length. Without it someone reaches for
`getTotalLength()`, which is JS, and the zero-JS path is dead on arrival.

**Consumption** (both drivers, identical):
```css
stroke-dashoffset: calc(1 - var(--sgs-timeline-fill-progress));
```

**Suppression** (`style.scss`): hide the existing `::before` when the SVG renders, keyed on the
**attribute/class**, never on `@supports`.

⛔ **C3** — gating suppression on `@supports` leaves a **doubled line** for every visitor on the JS
path, which today is all of Firefox.

**Attributes** (`block.json`): `connectorProgressFill` (boolean) and `connectorFillColour`, with
inspector controls placed beside the existing `connectorStyle`/`connectorColour`.

⛔ **C10** — read how `connectorColour` builds its control and match it. A raw hex field breaks the
token contract. **Then run `/sgs-update` to reseed `block_attributes`** (announce first — it is a
shared-DB write that has blocked other sessions' gates), and check whether these two want DB rows
at all: measured 2026-08-28, only 5 of 103 extension attrs have rows, and each is block-declared.
These are block-declared, so they probably DO.

---

## Task 1 — Build the foundation (INLINE, do not delegate)

**What:** the `@property` registration, `block.json` attributes + inspector controls, the
`render.php` SVG markup, and the `::before` suppression.
**Why:** two agents in one block directory clobber each other and invent two different contracts.
Settling the shape first is what makes the fan-out safe.
**Estimated time:** 30-40 min.

**Orchestration:**
- Execution: **inline (main thread)**
- Depends on: none
- Parallel with: none
- /qc gate after: yes — `/qc-inline`
- **Acceptance:** the two controls appear in the editor and write real values; the SVG renders with
  `pathLength="1"`; exactly ONE line is visible in every combination of on/off × vertical/horizontal.

---

## Tasks 2 + 3 — The two drivers (PARALLEL, one response, disjoint files)

Routed via `/delegate` on 2026-08-28: **sonnet**, fallback haiku, for both. (Note: routing with
`--high-complexity` returns *inline*; the judgement that these are ordinary implementation rests
entirely on Task 1 having fixed the contract first. If you skip Task 1, dispatch is wrong.)

Dispatch **both in the same response** — that is what makes them concurrent.

### Task 2 — Native CSS scroll-driven path

**Owns:** `src/blocks/timeline/style.scss` **only**.
**Brief:** behind `@supports (animation-timeline: scroll())`, drive
`--sgs-timeline-fill-progress` from 0→1 with a `@keyframes` bound to the scroll timeline, so the
`stroke-dashoffset` calc above fills the connector as the timeline scrolls through the viewport.
Must not touch `view.js`, `render.php` or `block.json`.
**Context it will not have:** the `@property` block already exists (Task 1); the `::before`
suppression is already keyed on the class, so do not add an `@supports`-keyed hide; Spec 38 treats
a single-property scrub as Tier V, so no library.

### Task 3 — Vanilla JS rAF path

**Owns:** `src/blocks/timeline/view.js` **only**.
**Brief:** an rAF-throttled scroll listener computing progress from `getBoundingClientRect()`
against viewport height and writing the same custom property. This is the ONLY path Firefox users
get, so it is primary, not a fallback.
**Context it will not have:**
- Reduced motion must use `prefersReducedMotion()` from
  `src/shared/effects/motion-utils.js:19-25` — the LIVE-checking one. `view.js:23-25` caches its
  own at module load and must not be reused.
- **C7** — reduced motion shows the line **FULLY FILLED**, not empty. The block's own convention
  (`view.js` reveals all entries) is "show the end state, skip the animation", and an empty line
  would misrepresent a journey as not yet begun.
- Spec 38 §1.6 house contracts apply: init→cleanup, bfcache `pageshow` teardown, frame budget.
  Register through the shared effects registry rather than a bespoke listener.
- **C8** — reuse `gsap/fx-draw.js:117` (`initDraw`) rather than hand-rolling a second stroke-reveal
  if the fallback tier ends up needing one.
- The existing one-shot IntersectionObserver reveal (threshold 0.15, `obs.unobserve` at line 69)
  stays as-is. This is new, continuous, additional tracking — do not convert the existing observer.

---

## Dependency graph

```
Task 1 — foundation (inline, main thread)
  ↓ /qc-inline gate
Task 2 (sonnet, style.scss) + Task 3 (sonnet, view.js)   ← same response, concurrent
  ↓ /qc multi-rater
Verify both drivers live, then commit + STOP-67 report
```

⛔ **Do NOT start Stage B** (pulse / vine / tree / falling bricks). Fan out only after Stage A's
contract is verified live, and after settling the tier question below.

---

## Open questions to settle before Stage B

1. **Stage B's tier is unresolved.** Spec 38 draws Tier V/G on *single-property vs
   multi-keyframe/staggered* — not vanilla-vs-GSAP. Stage A is Tier V. Staggered falling bricks and
   multi-keyframe vine/tree read as **Tier G**. Settle this before the fan-out, with the page's real
   effect list in hand.
2. **GSAP cost, measured 2026-08-28:** core 26,976 B + ScrollTrigger 17,368 B gzip ≈ **45 KB cold**,
   against a **50 KB per-page motion budget** — 90% of it for one line. But if the page already
   loads GSAP for another effect the marginal cost is ~18 KB, or ~700 B if ScrollTrigger is already
   in. The decision turns on what else MIC's journey page runs.
3. **C4 — the contract is one progress number driving THREE rendering primitives, not one shared
   path.** Pulse (`offset-distance`) and vine/tree (staged `stroke-dashoffset`) share the `<path>`.
   **Bricks does not** — it is a `mask-image` tile wipe and never touches the SVG. Say this plainly
   in the Stage B briefs or one of four agents builds against the wrong primitive.
4. **Brick geometry is reusable, with a caveat.** `assets/css/fx-cursor-field.css:358-409` holds the
   brick mask (84×68 tile, 3px mortar) via `--sgs-cursor-field-brick`; its JS driver only writes
   custom properties and knows nothing about bricks, so a scroll driver can swap the second mask
   layer from a radial pool to a linear wipe. **But it is a wholesale reveal — individual bricks are
   not addressable**, so a per-brick drop/settle stagger is still bespoke.

---

## Acceptance for Stage A

- Fill tracks scroll **smoothly, not as a jump-cut** — this is the C1 regression test.
- **Both** drivers exercised, including forcing the `@supports` negative branch.
- Reduced motion shows a fully-filled static line.
- Vertical and horizontal orientations both correct, including across the 767px re-layout
  (`style.scss:444-459`).
- Only ONE line renders in every combination (the C3 double-render check).
- Verified at 375 / 768 / 1440.

---

## Guardrails (carried forward — never subtract, only add)

- **`main` is shared by five or more tracks.** Commit by exact path. Never `git add -A`, never a
  glob pathspec. **Check `git diff --cached --name-only` immediately before every commit** — on
  2026-08-28 the shared index held 24 files from another session.
- ⛔ **Never run `git stash`, `git checkout -- .`, `git restore .` or `git clean` in the shared
  tree.** This happened AGAIN on 2026-08-28 and destroyed a session's uncommitted work — two edited
  files and six untracked fixtures — with no warning. Recoverable only because the stash was found.
  If you must recover from a stash, extract your own paths with
  `git checkout "stash@{0}" -- <paths>` and **leave the stash in place** for other tracks.
- **`git commit -- <path>` commits the WORKING TREE state of those paths and ignores the index.**
  Safe only when index and worktree match for those paths — check with `git diff --name-only -- <paths>`.
- **`git commit --amend` ignores the pathspec and flushes the WHOLE index.** Only amend when the
  index is empty.
- **The `[gates-ok:<reason>]` bypass token must be LITERALLY IN THE COMMAND STRING.** The hook is a
  PreToolUse check reading the Bash `command` parameter — `-F file` and `-m "$(cat file)"` both fail
  silently because the token never appears literally. Learned the hard way 2026-08-28.
- **Deploy before you measure.** A test against undeployed code measures stale output.
- **`build-deploy.py` can ABORT while exiting code 0.** Read its output, never the exit code.
- **Verify the EDITOR, not just the frontend.** Both of the client-facing faults found on
  2026-08-27 were invisible to every frontend check and every gate.
- **An absence verdict is only as wide as its search. Screenshot before concluding anything is
  absent.** A narrow selector returned "no panel" on 2026-08-28 for a panel that was plainly there.
- **A green measurement is not fidelity (R-31-13).** The grid-dot field passed four gates while
  painting zero dots; later it passed every gate while painting at 1.3:1.
- **A brand accent — and often `primary` — is a GROUND, not an indicator.** Never quote a token's
  contrast as a fixed property: it is a per-client fact. `primary` measured 2.25:1 on this canary
  while three separate comments claimed "~7:1".
- **Never restore a trashed fixture** (2023, 2114 carry pre-migration authoring). Author fresh.
- **Visual-diff report before any commit touching a block** (STOP-67). ⚠ Note the gate **cannot see
  `src/blocks/extensions/` or `src/shared/effects/`** — it resolves scope by block directory, so it
  will decline a real visual change there. Write the report on merit, not because the gate asked.
- **Announce before `/sgs-update` or any shared-DB write.**
