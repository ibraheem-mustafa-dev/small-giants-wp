# Plan — the two residual defects in the margin-reset rule

**Created:** 2026-08-26. **Requested by Bean**, after `039c19e39` fixed the editor arm and
explicitly deferred these two as unproven.

**File under change (both tasks):** `theme/sgs-theme/assets/css/core-blocks-critical.css`,
the "REMOVE INTER-SECTION GAPS" block (~line 138 onward).

⚠ Both tasks edit the SAME rule block. They MUST run sequentially, never in parallel.

## Background — what is already proven, do not re-derive

`039c19e39` root-caused a real defect: the rule's EDITOR arm
`body .is-root-container > .wp-block` is a catch-all carrying `margin-block: 0 !important`,
which out-ranked the inline style `edit.js` writes for an operator's margin. Measured live,
before and after:

|                   | operator set 80px | operator set nothing |
|-------------------|-------------------|----------------------|
| with `!important` | 0px               | 0px                  |
| without           | 80px              | 0px                  |

That fix shipped. `.is-root-container` exists ONLY in the editor canvas, so the frontend was
never affected by it.

The rule's stated purpose (its own comment): WordPress adds `margin-block` to children of
`is-layout-flow` containers, creating white gaps between full-width sections with different
background colours.

## Global Constraints — binding on both tasks

1. **`/systematic-debugging` Iron Law applies.** No fix without a root cause PROVEN against
   ground truth. `"not cause A"` is exculpatory for A, never inculpatory for B.
2. **Measure on the live canary, both surfaces.** A claim about rendering is not established by
   reading CSS. Frontend AND editor canvas must each be measured, before and after.
3. **Every fix needs a two-directional control.** Show the defect case is fixed AND that the
   rule's original purpose still holds. A one-sided measurement is a false pass — the
   `039c19e39` table above is the shape to copy.
4. ⛔ **Never re-add `!important` to the editor arm.** That is the bug just fixed.
5. **Theme CSS cache-busts off the `Version:` header in `theme/sgs-theme/style.css`.** Any CSS
   change REQUIRES bumping it or the fix reaches no browser. Currently 1.5.76.
6. **UK English** in comments.
7. If the evidence says a defect is NOT real, say so and change nothing. A refuted hypothesis
   honestly reported is a successful task.

## Task 1 — the four FRONTEND arms and their `!important`

**Suspected defect:** the four frontend arms
(`.entry-content > .alignfull`, `.wp-site-blocks > .wp-block-group`, `… > .wp-block-cover`,
`… > .wp-block-sgs-hero`) still carry `margin-block-start/end: 0 !important`. By the same
mechanism proven for the editor arm, an operator's explicit margin on a top-level
group / cover / hero / alignfull block would be silently overridden ON THE FRONTEND.

**This is UNPROVEN. Prove or refute it first.**

Done when ONE of:
- (a) Proven real, and fixed the same way the editor arm was — with a live before/after table
  showing an explicit margin now applies AND that a block with no margin set still has its
  white gap suppressed; or
- (b) Proven NOT real, with the measurement that refutes it, and NO code change.

Note the asymmetry that matters: on the frontend, WordPress's own layout CSS is a `:where()`
rule at specificity (0,0,0). Establish empirically whether `!important` is load-bearing here,
rather than assuming it behaves as the editor arm did.

## Task 2 — editor/frontend blockGap divergence

**Suspected defect:** the editor arm zeroes `margin-block` for EVERY top-level block, but the
frontend arms name only three block types. So a block NOT in those three — `sgs/container` is
the measured example — gets WordPress's blockGap on the frontend but 0 in the canvas. Measured
2026-08-26: an `sgs/container` with no margin set showed `margin-top: 24px` on the frontend and
`0px` in the editor. The canvas therefore renders tighter than the live page.

**Done when** the canvas and the frontend agree for a block with no explicit margin, with both
measured, AND the rule's original purpose (no white bands between full-bleed sections) is shown
still to hold. If the correct answer is to narrow the editor arm to mirror the frontend arms,
that is a legitimate outcome — but it must be measured, not assumed.

⚠ Do not regress `039c19e39`: an operator's EXPLICIT margin must still apply in the canvas.
That is a third control for this task.

---

# OUTCOME — BOTH TASKS COMPLETE 2026-08-27

**Task 1** — `c0f422a87`. Defect proven real, then fixed. The headline was not the `!important`
itself but that **the same reset existed in THREE files**, each shadowing the next
(`core-blocks-critical.css`, `functions.php`'s `enqueue_global_layout_fixes()`, and
`core-blocks.css`). That is why the `!important` looked load-bearing: removing one copy changed
nothing visible. Now one source, no `!important`, verified live on all four arms in both
directions. A review caught a silently dropped selector (`.entry-content > .wp-block-sgs-hero`),
since restored.

**Task 2** — `9b3f4d97c`. The editor arm was a catch-all while the frontend arms named specific
block types, so the canvas rendered tighter than the live page. Narrowed to the same four
families. `sgs/container` with no margin now reads 24px on both surfaces, was 0px in the canvas.

⚠ **Task 2's control 3 was vacuous** and is recorded as such: the no-regression probe used a
block type the narrowed rule no longer matches, so the pass was structurally guaranteed. The risk
is nil by construction, but the claim is not evidence.

⚠ **The editor arm is a UNION, not a mirror.** `.is-root-container` is the canvas root in BOTH
editors and maps to a different frontend root in each. CSS cannot tell them apart. The residual is
documented in the CSS itself.

## ⭐ WHAT NEITHER TASK FIXED — open for Bean

`sgs/container` appears in NO arm list, on either surface. Adjacent containers with different
background colours therefore show a **24px white band on the live page** — the exact symptom this
rule exists to prevent, on the dominant section block. Pre-existing; neither task was scoped to it.

Task 2 makes those bands visible in the canvas too. That is correct — the editor now tells the
truth — but it will read as a regression to the eye.

**The decision, which is not mechanical:** should the reset key on BLOCK TYPE at all, or on
whether a section is actually full-bleed? `sgs/hero` is in the list because it is always
full-bleed; `sgs/container` is a general layout block that is sometimes a section and sometimes
not. Adding it to both lists would restore flush sections AND keep the surfaces in agreement, but
would remove gaps everywhere containers are used.
