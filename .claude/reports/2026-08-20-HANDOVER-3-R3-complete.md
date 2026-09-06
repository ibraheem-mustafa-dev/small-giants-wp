---
doc_type: handover
project: small-giants-wp
created: 2026-08-20
from: shop-archive / R-3 track
to: colour-golden track (the parallel session)
supersedes: nothing — THIRD handover, additive to handovers 1 and 2
subject: R-3 is complete; two gates you rely on changed behaviour
---

# Handover 3 — R-3 complete, and two gates now behave differently

Short. Read handovers 1 and 2 first. **Everything here is on `origin/main`, `npm run build` GREEN.**
Commit `a7026181`.

---

## 1. Two gates changed BEHAVIOUR — this affects your runs

**`check-editor-render-parity` CHECK B is now BLOCKING.** It measured 0 net-new right after R3-a's
widening, so it starts green — any future invalid-CSS-keyword passthrough now **fails your build**,
it does not warn.

**CHECK A stays advisory, and the number matters to you: 176 net-new.** That is what R3-a's widening
exposed. Those findings are newly VISIBLE, not newly broken — the gate simply could not see
shared-component controls before. If you triage them as part of your colour work, CHECK A can be
flipped too; that is the stated condition in the code.

⚠ **The report label used to lie.** It printed "advisory, does not fail the build" regardless of the
flag, so a flip would have left the output stating the opposite of reality. It now derives from the
flag. If you flip anything in this file, the label follows automatically.

**Two more gates are now in `prebuild`:** `check-inert-controls.py` and `check-undeclared-attrs.py`.
Both exit 0 today. A colour attribute with a control nothing renders, or destructured-but-undeclared,
will now **fail the build** rather than pass silently.

## 2. A detector fix you may hit: `show<Prop>={ false }` suppression

`check-inert-controls.py` used to report "this attribute has a control (edit.js/shared)" for a
control the block had explicitly switched OFF — e.g. `sgs/feature-grid` passes
`showLayout={ false }` to `ContainerWrapperControls` because it owns a bespoke selector. That was a
false positive unfixable from the block's side, and it was the last thing blocking this gate from
being wired.

It now resolves suppression **from source**: for each `show<Prop>={ false }`, it finds the matching
`show<Prop> &&` guarded regions in the shared panel files and collects the attributes written inside.
Add a new suppression prop to a shared panel and it is picked up with no edit to the gate.

⚠ **The first implementation OVER-MATCHED, and a negative control caught it, not reasoning.** A flat
window from the guard swallowed `LayoutPanel.js`'s `gap` control at `:136`, which sits AFTER both
guards close and is perfectly reachable — suppressing it would have blinded the gate to a real inert
`gap` control. The region is now bounded at the `) }` closing the guard at its own indent level, and
the test asserts `layout`+`columns` ARE suppressed while `gap` is NOT. **If you add a suppression
prop, add the matching negative control.**

## 3. Your rule 31 backlog is untouched — deliberately

Adding a resting shadow colour to `sgs/post-grid` pushed rule `31-golden-colour-control` 409 → 410.
**I did not raise your backlog.** I declared the gradient exemption the gate itself names for this
case:

> CSS `box-shadow` takes a COLOUR, not a gradient. `box-shadow: 0 2px 4px linear-gradient(...)` is
> not valid CSS and no browser accepts it, so there is no mechanism a gradient could travel through.

Declared at `block.json` → `supports.sgs.colourExemptions.shadow`. Back to **409**.

⚠ Worth knowing for your own gradient-mechanism work (your priority 2): `colourExemptions` is the
sanctioned route for a row with no valid gradient form, and the gate refuses boilerplate reasons.
Shadow colour is the clean example.

## 4. New registry rows you will see

`setting-registry.json` gained three rows — `css:box-shadow-color`, `css:outline-width`,
`css:outline-offset` — because `check-cluster-coverage.py` (a BLOCKING gate that only runs in the
full build, not standalone) requires every cluster member to have one. If you add a cluster member,
add its registry row in the same commit or the build fails.

`css:box-shadow-color`'s row records the control shape you will care about: a `DesignTokenPicker`
row inside `SgsColourPanel`, states as tabs in the popover, **not** a lone field on the shadow
builder — per Spec 35 PART O §1 field 9b.

## 5. Bundle budget: `fx-flip.js` baseline raised

381 → 789 bytes (+408 absolute). The 20% budget is a percentage guard and the module is small enough
that real added behaviour trips it. Every byte is the opus review's required remediations. Recorded
honestly in the baseline that **the effect still does not animate** — it is real code growth, not a
working feature. Mentioned only so the raise does not look unexplained if you read that file.

## 6. Unchanged and still yours

- **Rule 31 → the wider resolver** (handover 1 §1) — untouched.
- **Gradient mechanism-awareness** — untouched.
- **`sgs/hero` + `sgs/info-box` resting border gradient** (handover 2 §1) — still handed to you.
  Close them by BUILDING the resting control, never via `noBaseByDesign`.
