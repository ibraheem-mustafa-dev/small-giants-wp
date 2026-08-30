# Media element — build the shared layer

Invoke `/autopilot` first.

**Your architecture is `.claude/plans/2026-08-30-media-element-architecture-v2.md`. Read it in full
before anything else. It carries every ruling, every council finding and the build order. This
prompt only starts you.**

---

## First action

`git status`. Five tracks share this checkout. Then read the architecture above, and
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` in full — Bean-locked, every session.

---

## Why this exists

Nine surfaces render media and none of them agree. They differ in control set, panel structure,
disclosure rules, naming, enum shape, and even in whether a media type is stored at all. Bean's
requirement:

> *"A unified set of controls that can be used for all of my library's media elements, plug and play
> style, not needing to be recoded into every instance — from the attributes to the control UI to
> the canvas rendering to the live page rendering."*

---

## What was already decided, and must not be re-opened

A seven-seat adversarial council reviewed the first architecture. No seat graded it above C+. The
rewrite absorbed every finding. **Do not re-litigate these:**

- **Four layers, mirroring proven patterns.** Naming mirrors the typography helper pair. Panels
  mirror `KIND_PANELS` (30 adopters). Dispatch mirrors `ContainerWrapperControls`. Styling mirrors
  `before-after`'s custom-property approach.
- **No codegen.** Attributes arrive by runtime injection through
  `addFilter('blocks.registerBlockType')`, exactly as the `sgs*` extensions already work. The one
  generator needed already exists and is already gated.
- **No `<picture>` swap.** It breaks the cloning pipeline's recognition contract, which reads BEM
  deliberately (`media/render.php:686` says so).
- **No Interactivity API rewrite.** Orthogonal to a controls goal.
- **Zero attribute renames in v1.** A rename is a stored-content migration, because WordPress
  silently discards an attribute a block no longer declares. Descriptors carry each surface's
  existing name via `storedAs`.
- **`responsive-logo` is excluded.** It is already good and forcing it onto the shared shape would
  be a downgrade.

---

## Build order — and the one rule that protects the design

Full detail sits in §15 of the architecture. The essentials:

**Waves 1 and 2 stay in the main thread.** The census is a synthesis; the helper contract is the
decision every later wave inherits. `/delegate` refuses these shapes for good reason — dispatching
them means four parallel agents building four wrong atoms.

**Wave 3 fans out.** The six v1 atoms are disjoint files once the contract is fixed.

⛔ **Wire `sgs/media` first, then `before-after`. Never in parallel.** The falsification test is that
wiring the second surface must require no edit outside `src/media/controls/`. Build them
concurrently and both agents can quietly patch the shared layer to suit themselves — leaving you two
wired surfaces and no evidence the abstraction generalises.

`before-after` is the right second surface precisely because it is hard: two independent media
elements on one block, video sync, its own scoped-selector machinery. Hero would pass easily and
teach nothing.

**Per surface after that: insert, verify, then gut — in one commit.** Never gut first. A surface must
always have either the old code or the new code, never neither.

---

## Start here

**Wave 1, in the main thread: the census.** Synthesise the five existing survey reports
(`.claude/reports/2026-08-30-media-M1..M5-*.md`) into a build manifest — per surface: `prefix`,
`context`, `insertion`, `mechanism`, the `storedAs` map, and escape-hatch flags. Re-measure only
what Bean's rulings changed.

⛔ **Do not re-run those surveys. They are done.** Output to
`reports/migrations/media-element-census.json`.

---

## Three things that will bite you

**Line numbers drift daily.** `timeline/edit.js`'s SVG injection site moved 994 → 987 → 1191 inside
one session, because three tracks edited that file. Re-derive every line number at execution. The
stable anchors are variable names.

**A grep returning 0 is a hypothesis.** The previous session's founding claim — that a shared helper
had zero callers — was false, and four council seats caught it. The search covered only direct
block-level calls and was reported as covering all calls. Pair every zero with a positive control.

**Three security items are compliance, not preference**, and ship regardless of scope: the editor
SVG sanitiser (a Contributor can currently store a script that runs in an admin's session), `<track>`
captions (zero in the framework; WCAG Level A), and `prefers-reduced-motion` on Ken Burns and
parallax.

---

## When you finish

Report what was built, what the second-surface test proved, and what you could not verify.
Then `/handoff`.
