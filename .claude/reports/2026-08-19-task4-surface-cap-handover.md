# Task 4 (surface-cap composite resolution) — DONE, and three of its assumptions were wrong

```
doc_type: report
created: 2026-08-19
for:     the header session (feat/header-completeness)
from:    the C1–C4 hover/colour session (branch feat/hover-helper)
commit:  6c3ec1b0  fix(surface-cap): expand panel composites via the row visitor
status:  ⛔ DO NOT RE-DO THIS TASK. It is shipped. Read this instead.
```

## Why it was done here rather than left for you

It stopped being your task and became a blocker on mine: `check-simple-surface-cap.js`
is one of two scripts that had to change before the colour-conformance work could
measure anything honestly. It is shipped, advisory, self-tested. **Your Task 4 is
closed — the remaining action for you is §4 below, re-reading the rulings.**

You were right that this needed doing, and you were right about the *method*. You
were wrong about the *fix*, the *direction* and the *blast radius* — all three
measured, all three below.

---

## 1. ⛔ Your prescribed fix was wrong and would have made things worse

Task 4 says: *"parse it, and count its `isShownByDefault` items."*

Measured 2026-08-19:

| Component | `<ToolsPanelItem>` | `isShownByDefault` | `<PanelBody>` |
|---|---|---|---|
| `SgsColourPanel` | **0** | **0** | 1 |
| `ResponsiveBoxControls` | **0** | **0** | 1 |

Both render a `<PanelBody>` of **plain controls** — they do not use
`ToolsPanelItem` at all. Counting `isShownByDefault` would score a **visible
colour panel as contributing nothing**, and would have done so for every
composite built that way.

**What shipped instead:** the script's own existing row visitor
(`makeRowVisitor`) runs over the resolved component's body. It already reconciles
all three shapes — a `ToolsPanelItem` with its disclosure flag, a collapsed
`PanelBody`, and bare controls — which is exactly the distinction a per-primitive
count throws away.

> **The transferable rule: detect a control by what it DOES, not by which
> primitive renders it.**

This matters well beyond Task 4. The session defining goldens for the other 12
Part O control types is being warned about the same thing, because those types
share no primitive.

## 2. ⚠ Your predicted direction was backwards

Task 4's baseline table says `RowScrollBehaviourControls` is *"under by 2"*.

It is **over by one**. Its three toggles sit inside
`<PanelBody initialOpen={ false }>` titled "Row behaviour (Advanced)", and this
script's own rule counts a closed accordion as progressive disclosure. Through
the visitor it contributes **ZERO** default-visible rows, not three.

Both directions are now pinned by self-test fixtures so this cannot regress.

## 3. Two reverts you would otherwise have repeated

**Expand panels, not control primitives.** Expanding *every* resolvable
capitalised component surfaced `ResponsiveOverride`'s per-tier reset `<Button>`
(`ResponsiveOverride.js:148`) as **five separate "rows"** on `sgs/site-header-row`.
Reverted.

**Do not compensate with a global exclusion.** Adding `Button` to
`NON_CONTROL_NAMES` to kill those false rows then collapsed `sgs/site-footer` to
**ZERO** default-visible controls — a detector claiming a block with a live
inspector has no controls at all. Reverted.

The discriminator that works is what the component **contains**
(`PanelBody`/`ToolsPanel`/`ToolsPanelItem` → expand; none → it is a single
control, count one). A component that cannot be resolved or parsed falls back to
the previous count-as-one, exactly as your task specified.

**One deliberate deviation from your brief.** You asked for resolution "via the
file's own import statements". It resolves through the shared
`inspector-scan/core/components.js` `resolveComponentFiles()` instead, so this
script and the inspector rules cannot disagree about where a component lives. That
resolver also fixes a façade bug your approach would have inherited: since the
2026-08-17 panel split, `ContainerWrapperControls.js` re-exports six panels whose
vocabulary has moved out of it, and a naive resolve lands on the façade.

---

## 4. ⭐ The figures you asked to see — this is the part that needs you

Predicted before the first run, reconciled after, per your own instruction.

| Block | Before | After | Δ |
|---|---|---|---|
| `sgs/site-header` | 5 | **4** | −1 |
| `sgs/site-footer` | 3 | **2** | −1 |
| `sgs/site-header-row` | 6 | **8** | +2 |
| `sgs/site-footer-row` | 7 | **8** | +1 |

Still `3/4 OVER` the ≤3 default. **It moves in both directions**, so neither may
be assumed — your task predicted `site-header-row` at "really ~7"; it is 8, and
for a different reason than the one given.

⚠ **`sgs/site-header` and `sgs/site-footer` both moved.** Your Task 4 flagged this
risk and it was real. Any human ruling made against their previous numbers —
including Bean's 2026-08-13 F2 ruling that kept exactly two rows visible on
`site-header` — should be re-read against these. That is a decision, not a
cleanup, and it is yours to take back to Bean.

Note `site-header` is now **4**, not 5, which narrows the FR-37-27 overage to one
row rather than two. The open question "which three move behind disclosure"
may now be "which one".

## 5. Constraints you set, honoured

- **Still advisory.** Exits 0 without `--strict`. Widening what it measures did
  not turn it into a gate — verified: `node scripts/check-simple-surface-cap.js
  --check` → exit 0.
- **Both-direction fixtures.** `Panel-composite expands
  (ResponsiveBoxControls renders 4 default rows)` expects **4** — the figure your
  prescribed `isShownByDefault` fix would have scored **0**, so that fixture pins
  the trap itself. `Collapsed panel-composite contributes ZERO
  (RowScrollBehaviourControls)` pins the other direction. Both resolve against the
  REAL `src/` tree, not a stub, so they exercise the framework the client gets.
- **Stale header rewritten, not annotated.** The `KNOWN LIMITATION` block at
  `:97-113` described the limitation as open and prescribed the wrong fix. It now
  states current behaviour. A grep landing on the old text would have sent the
  next reader to the `isShownByDefault` dead end.

## 6. One trap worth carrying into your remaining tasks

The first version of this fix contained a literal **backspace byte** (`0x08`)
where the regex needed `\b`. It matched nothing, so expansion silently never
fired and **every figure stayed at baseline** — a change that looks like a
correctly-implemented no-op. The identical byte had already killed a different
detector earlier the same session.

`cat -A` the bytes; do not trust the source you think you wrote. A detector that
has stopped detecting returns results indistinguishable from a clean tree.
