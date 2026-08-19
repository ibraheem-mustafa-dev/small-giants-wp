# Control-detection: what your golden scripts must get right

```
doc_type: report
created:  2026-08-19
for:      the session defining goldens for the remaining Part O control types
          and building their auditing/migrating scripts (modelled on LinkPopover)
from:     the C1–C4 hover/colour session (branch feat/hover-helper)
commits:  002a5fcb  shared component resolver
          bcd19863 + fea5163c  rule 27 widened + its fixtures
          6c3ec1b0  surface-cap composite expansion
```

You are encoding **12 more control types**. Every one of them will be found by a
detector, and this session spent a day proving that the *finding* half is where
these scripts break — not the schema half. Three concrete traps, all measured,
all with code you can call instead of rewriting.

⭐ **Read §1 before you model anything on LinkPopover.** Your example is itself
inside the blind spot.

---

## 1. Your model example is in the blind spot

`LinkPopoverControl.js` lives in `src/components/` — a **shared** file — and
`SgsLinkControl` has **0** direct `edit.js` mounts; it is reached through the
barrel. A script scoped to per-block `edit.js` is therefore blind to its own
model's definition site and would read `SgsLinkControl` as unused.

That is not hypothetical. `27-superseded-link-control` — the LinkPopover
enforcement — had exactly that scope and **declared the gap in its own header**:

> *"A component reached indirectly via a block's own local `components/`
> subfolder is invisible — this rule reads each block's own `edit.js`."*

It was running as `mode: gate` at `openBacklog: 0`.

> ⚠ **A gate at zero with a blind spot is worse than a noisy advisory.** Rule
> 31's blindness reads as a 409-item backlog. Rule 27's read as *finished*.

Fixed in `bcd19863`. Predicted 0 new findings before running (`git grep -ln
"<SgsLinkControl" -- src/` returns zero files tree-wide), measured 0 — so the
gate could not red. The value is forward: the next LINK field added to a shared
panel is caught rather than passing invisibly.

---

## 2. The three layers — only one is shared

| Layer | Answers | Where | Owner |
|---|---|---|---|
| **1. Contract** | *what shape* must a control have? | `scripts/consistency/golden-controls.json` | **you** |
| **2. Corpus + attribution** | *which files* hold controls, *which blocks* own each finding | `scripts/inspector-scan/core/components.js` | **shared** |
| **3. Enforcer** | reads (1) over (2) | one file per rule | per-rule |

Rule 31 has a correct layer 1 and a broken layer 2 — hence its `openBacklog: 409`
is a **floor, not a total**. Your goldens are layer 1 and land on top of this
unchanged.

### What to call

```js
const { resolveComponentFiles } = require( '../core/components' );
const compFiles = resolveComponentFiles( extraDirs /* optional */ );
// Map<componentName, absoluteFilePath>
```

- **Corpus:** `src/components/`, every `src/blocks/*/components/`, and
  `src/blocks/extensions/`.
- **Keying:** every name a file exports, plus its filename.
- **Collision rule — load-bearing:** a file that **DECLARES** a name beats one
  that only **RE-EXPORTS** it, regardless of `readdir` order.
- **`extraDirs`** adds `ctx`-derived dirs so `--self-test` fixtures resolve.
  Under self-test `ctx.blocksDir` is a temp copy; without this a fixture
  resolves against an empty map and its `mustFlag` passes *for the wrong reason*.

**Why the collision rule exists.** The 2026-08-17 panel split left
`ContainerWrapperControls.js` a 268-line façade re-exporting six panels. It sorts
alphabetically ahead of them, so under first-wins it claimed `LayoutPanel`,
`WidthPanel`, `WrapperColourPanel` and the rest — while their attribute
vocabulary had moved out. Measured, façade vs `LayoutPanel.js`: `gapTablet` 0 vs
2, `flexDirection` 0 vs 2, `gridTemplateRows` 0 vs 6, `justifyItems` 0 vs 3.
Rule 21 was reporting **50 false positives** as a result.

⛔ **Do not widen `discover()`.** That is the *other* function in the same file —
"what does this file render?", keyed by filename, consumed by rules 01 and 18
with committed backlogs of 58 and 13. Widening it restages both. `resolveComponentFiles()`
is deliberately separate and opt-in.

---

## 3. ⭐ Detect a control by what it DOES, not which primitive renders it

**This is the one that will cost you most, because it fires once per control type.**

`check-simple-surface-cap.js` prescribed, in its own header: *"resolve the mount
to its source file and count its `isShownByDefault` items."* Measured:

| Component | `<ToolsPanelItem>` | `isShownByDefault` | `<PanelBody>` |
|---|---|---|---|
| `SgsColourPanel` | **0** | **0** | 1 |
| `ResponsiveBoxControls` | **0** | **0** | 1 |

Both render a `PanelBody` of plain controls. That prescription scores **a visible
colour panel as contributing nothing**. Fixed in `6c3ec1b0` by running the
existing *row visitor* — which already reconciles ToolsPanelItem disclosure,
collapsed `PanelBody` and bare controls — over the resolved body.

Your 12 types do **not** share a primitive: link, enum, length/unit, 4-value box,
media, boolean, icon, shadow all render differently. A detector keyed on one
primitive is wrong once per type, and each failure is a **false absence**, which
reads exactly like a clean result.

### Two sub-traps that cost me two reverts

**Expand panels, not control primitives.** Expanding *every* resolvable component
surfaced `ResponsiveOverride`'s per-tier reset `<Button>` as five separate "rows"
on one block. Excluding `<Button>` globally to compensate then collapsed
`sgs/site-footer` to **zero** default-visible controls — a detector claiming a
block with a live inspector has none. The discriminator is what the component
*contains* (`PanelBody`/`ToolsPanel`/`ToolsPanelItem`), not its name.

**Neither direction may be assumed.** `RowScrollBehaviourControls` was reported
as "renders THREE `isShownByDefault` toggles, so the mount is UNDER by 2". Those
three sit inside `<PanelBody initialOpen={false}>`, which counts as progressive
disclosure — through the visitor it contributes **zero**, so the mount was OVER
by one. Right diagnosis, backwards arithmetic. Measured before → after:
`site-header` 5→4, `site-footer` 3→2, `site-header-row` 6→8, `site-footer-row`
7→8.

---

## 4. Working rules these cost us

1. **Predict the count before the first live run, by a method independent of the
   script's own code, then reconcile.** Stated before touching anything: rules 01
   and 18 must not move; rule 21 should land in 130–220. Measured 58, 13, 200.
2. **A `mustFlag` fixture is not optional, and it will earn its place.** Rule 27's
   widening shipped a literal **backspace byte** (`0x08`) where the regex needed
   `\b`. It matched nothing. The rule was **silently dead — passing while
   detecting nothing**, indistinguishable from a clean tree. Only the fixture
   caught it. ⚠ The identical byte recurred hours later in the surface-cap fix,
   where it made expansion silently never fire and every figure stay at baseline.
   **Twice in one session. Check the bytes (`cat -A`), not the source you think
   you wrote.**
3. **Pair every positive control with a negative one.** `shared-mount-flags`
   (component mounts the control → must flag) beside `shared-mount-comment-only`
   (component only *names* it in a docblock → must not). Without the second, the
   first can pass by matching prose.
4. **Read `strippedText()`, never raw text.** A docblock mentioning a component
   is not a mount.
5. **Attribute a shared-file finding to the component.** Say "fix it once in
   `<file>`" in the `fix` string, or you dispatch thirty agents at one file.
6. **A false positive is a detector bug, never baseline fodder.**
7. **State current truth; don't append corrections.** Rule 21's `advisoryReason`
   had four stacked `SUPERSEDED` layers, so a grep hit the oldest number first and
   stopped. Rewritten current-first; history lives in git. Please don't
   reintroduce the pattern in your own metadata.

---

## 5. What is already correct — don't "fix" it

`scripts/surveys/survey-inspector-surface.js` was checked for both traps and has
**neither**. It descends into composites, scans `src/components/` + subdirs +
block-local dirs, never uses `isShownByDefault`, and registers components by
**declaration only** (`FunctionDeclaration` / `VariableDeclarator`), so the façade
cannot claim a name. It was built at D543 precisely to replace the rejected
approach. Read its header before extending it.

⚠ My first pass *did* accuse it of the façade bug — because I replicated its
index with an `export { X }` rule the real builder does not have. Verify against
the real code, not a reimplementation of it.

---

## 6. Open on my side — coordinate before touching

- **Rule 31 does not yet consume `resolveComponentFiles()`.** It is next, and it
  will move its 409.
- **The four shared wrapper panels** (`BackgroundPanel`, `ShapeDividersPanel`,
  `GridItemDefaultsPanel`, `WrapperColourPanel`) need migrating to the golden
  colour shape — ~10 rows across four files makes ~30 blocks conformant.
  **These are single-merge-point files. If your scripts will touch them, say so —
  we must not both be in there.**
- **26 blocks let WP core render its own colour UI** (23 double-painting
  alongside ours, 3 core-only: `buybox`, `site-footer`, `site-header`). Untouched
  so far; sequencing is per Spec 35 Part O Cross-cutting A, not ad hoc.
- Six stacked-correction markers remain in `rules.json` (`roster-drift`, `01`,
  `03`, `30`).
