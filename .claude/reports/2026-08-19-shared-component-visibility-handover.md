# Shared-component visibility — handover to the golden-controls session

```
doc_type: report
created: 2026-08-19
for:     the parallel session building goldens for the remaining Part O control
         types + its auditing/migrating scripts, modelled on LinkPopover
from:    the C1–C4 hover/colour session (branch feat/hover-helper)
commits: 002a5fcb (the shared resolver) · bcd19863 (rule 27 consuming it)
```

## Why you are being handed this

Your scripts and mine both have to answer the same question — *"which blocks does
this control finding belong to?"* — and if we each answer it our own way the repo
ends up with two import graphs that can disagree with no way to arbitrate. This
is that layer, already built, tested and shipped. **Consume it; do not build a
second one.**

⭐ **The thing to read first, because it affects your model example directly:**
`LinkPopoverControl.js` lives in `src/components/` — a *shared* file — and
`SgsLinkControl` has **0** direct `edit.js` mounts (it is reached through the
barrel). A script modelled on LinkPopover using the per-block `edit.js` scope
would be blind to its own model's definition site and would read `SgsLinkControl`
as unused.

---

## 1. The three layers — only one of them is shared

Your goldens and my rules are different layers of the same stack. Knowing which
is which prevents both of us duplicating the other's half.

| Layer | Answers | Lives in | Owner |
|---|---|---|---|
| **1. Contract** | *what shape* must a control have? | `scripts/consistency/golden-controls.json` | **you** — extending it to the other 12 Part O types |
| **2. Corpus + attribution** | *which files* hold controls, and *which blocks* own each finding? | `scripts/inspector-scan/core/components.js` | **shared — this handover** |
| **3. Enforcer** | reads (1), applies it over (2) | one file per rule under `rules/` | per-rule |

Rule 31 (`31-golden-colour-control`) has a correct layer 1 and a broken layer 2:
it reads `path.join( ctx.blocksDir, block.tail, 'edit.js' )` and stops. That is
why its `openBacklog: 409` is a **floor, not a total** — it has never opened the
shared wrapper panels that ~30 blocks mount.

---

## 2. What to call

```js
const { resolveComponentFiles } = require( '../core/components' );

// Map<componentName, absoluteFilePath>
const compFiles = resolveComponentFiles( extraDirs /* optional */ );
```

**Corpus:** `src/components/`, every `src/blocks/*/components/`, and
`src/blocks/extensions/`.

**Keying:** every name a file *exports*, plus its filename.

**Collision rule — this is the load-bearing part.** A file that **DECLARES** a
name beats one that merely **RE-EXPORTS** it, regardless of `readdir` order.
Without that, `ContainerWrapperControls.js` (a 268-line façade since the
2026-08-17 split, sorting alphabetically ahead of the real panels) claims
`LayoutPanel`, `WidthPanel`, `WrapperColourPanel`, `ShapeDividersPanel` and
`GridItemDefaultsPanel` while their attribute vocabulary lives elsewhere.
Measured, façade vs `LayoutPanel.js`: `gapTablet` 0 vs 2, `flexDirection` 0 vs 2,
`gridTemplateRows` 0 vs 6, `justifyItems` 0 vs 3. That mis-resolution was
producing **50 false positives** in rule 21.

**`extraDirs`** lets a rule add `ctx`-derived directories so `--self-test`
fixtures are reachable. Under self-test `ctx.blocksDir` is a temp copy, so
without it a fixture resolves against an empty map and its `mustFlag` control
passes *for the wrong reason*. See `rules/27-superseded-link-control.js` for the
pattern.

### ⛔ Do not widen `discover()`

`discover()` is the *other* function in the same file. It answers "what does this
file render?" (`wrapsPanel` / `wrapsImage`), is keyed by filename, and is
consumed by rules 01 and 18, which carry committed backlogs of 58 and 13.
Widening its corpus silently restages both populations. Rule 21's header had
already rejected doing that, and it was right. `resolveComponentFiles()` is a
separate, opt-in map precisely so nothing else moves.

---

## 3. Two worked examples, both shipped

**Rule 21 — advisory (`002a5fcb`).** Its private resolver was promoted into
`core/components.js` so the tree has one mechanism rather than two. Findings
250 → 200; the 50 that cleared were false positives, not a backlog reduction.

**Rule 27 — a gate (`bcd19863`).** This is the one closest to your work. It is
the LinkPopover enforcement, `mode: gate`, `openBacklog: 0`, and it read only
each block's own `edit.js` — a blind spot it *declared in its own header*.

> ⚠ **A gate at zero with a blind spot is more dangerous than a noisy advisory.**
> Rule 31's blindness reads as a big backlog. Rule 27's read as *finished*.

Widening it was safe because the population was predicted first: `git grep -ln
"<SgsLinkControl" -- src/` returns zero files tree-wide, shared components
included. Predicted 0, measured 0. The value is entirely forward — the next LINK
field added to a shared panel is caught instead of passing invisibly.

---

## 4. Rules earned here — apply them to your scripts

1. **Predict the count before the first live run, by a method independent of the
   script's own code, then reconcile.** Before widening anything I stated: rules
   01 and 18 must not move, rule 21 should drop into 130–220. Measured: 58, 13,
   200. A number that moves unpredicted is indistinguishable from a bug.
2. **A `mustFlag` fixture is not optional, and it will earn its place.** The
   first version of rule 27's widening shipped a literal **backspace byte**
   (`0x08`) where the regex needed `\b`. It matched nothing. The rule was
   **silently dead — passing while detecting nothing**, which looks exactly like
   a clean tree. Only the `mustFlag` fixture caught it.
3. **Pair every positive control with a negative one.** `shared-mount-flags`
   (component mounts the control → must flag) sits beside
   `shared-mount-comment-only` (component only *names* it in a docblock → must
   not). Without the second, the first could pass by matching prose.
4. **Read `strippedText()`, never raw text.** A docblock mentioning a component
   is not a mount. This repo has hit that trap repeatedly.
5. **Attribute a shared-file finding to the component, not thirty times to
   thirty blocks.** Say "fix it once in `<file>`" in the `fix` string, or you
   dispatch thirty agents at one file.
6. **A false positive is a detector bug, never baseline fodder.**
7. **State current truth; don't append corrections.** Rule 21's `advisoryReason`
   had four stacked `SUPERSEDED` layers, so a grep hit the oldest number first
   and stopped. It is rewritten current-first; superseded counts live in git.
   Please don't reintroduce the pattern in your own metadata.

---

## 5. What is still open on my side

- Rule 31 does **not** yet consume `resolveComponentFiles()`. It is next, and it
  will move its 409 — that number is a floor.
- The four shared wrapper panels (`BackgroundPanel`, `ShapeDividersPanel`,
  `GridItemDefaultsPanel`, `WrapperColourPanel`) still need migrating to the
  golden colour shape. Roughly ten rows across four files makes ~30 blocks
  conformant. **If your scripts are going to touch those four files, say so —
  they are single-merge-point files and we should not both be in them.**
- Six stacked-correction markers remain across rules `roster-drift`, `01`, `03`
  and `30`.
