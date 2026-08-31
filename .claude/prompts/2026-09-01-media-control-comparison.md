# Media element — build the control comparison table for Bean to choose from

**Invoke `/autopilot` before anything else.**

Your entire job this session is to produce ONE artefact: a table that lets Bean pick, per
control, which existing implementation should become the shared helper. **You are not
building, wiring, refactoring or synthesising anything.** Produce the table, hand it over,
stop.

The previous session went wrong by trying to decide "best of breed" itself, and by widening
the population to blocks that have nothing to do with this work. Do not repeat either.

---

## The six blocks. Nothing else.

`sgs/media` · `sgs/before-after` · `sgs/hero` · `sgs/container` · `sgs/decorative-image` ·
`sgs/product-card`

⛔ **A BACKGROUND IS NOT A MEDIA ELEMENT.** A block with a background image/video/SVG/overlay
gets it from the shared `BackgroundPanel` — a container concern, already standardised. Nine
blocks mount that panel (container, cta-section, hero, multi-button, nav-drawer,
physics-canvas, site-footer, site-header, trust-bar). **None of them joins this work on that
basis**, and `site-header`/`site-footer` have nothing to do with it at all.

`sgs/container` is in scope because it OWNS that background mechanism (hence the atoms'
`backdrop` scope).

Not in scope, and not to be re-litigated: `responsive-logo`, `info-box`, `image-sequence`
(reasons in `reports/migrations/media-element-census.json` under `excluded`).
`trust-bar` and `brand-strip` have real nested media but are LIMITED follow-on work — not
this session.

---

## Read first

| # | File | Why |
|---|---|---|
| 1 | `.claude/plans/2026-08-30-media-element-architecture-v2.md` §5 + the SCOPE section | the ten atoms, and what the six are in scope FOR |
| 2 | `src/components/media/atoms/registry.js` | each atom's bases — the controls you are tabulating |
| 3 | `src/components/media/atoms/*.control.js` | what the atom control offers TODAY |
| 4 | `src/components/media/controls/` | which shared helper files already exist |

⛔ Do NOT read Spec 31 (cloning pipeline). Wrong track, costs an hour.

---

## The deliverable

For **every control in all ten atoms**, one row per control, listing the equivalent control
or attribute in each of the six blocks.

Ten atoms and their bases are in `registry.js` — read them there, do not retype from memory.
There are 59 bases; some have no control (`intrinsic` is `clientEditable: false`), and some
map to one control covering several bases. **Go by CONTROL, not by base** — if one control
writes three attributes, that is one row.

### Row shape

```
ATOM: object-fit
CONTROL: Fill style
  atom today   ObjectFitField.js — SelectControl, enum cover|contain|fill|none|scale-down,
               no tiers, label "Object fit"
  media        MediaSizingPanel "Fill style" — SelectControl, same 5, help "How the picture
               fills the box.", inert-state styling when sizing mode blocks it
  hero         edit.js IMAGE_FIT_OPTIONS — SelectControl, cover|contain|fill|custom
               (`custom` is a SIZING MODE, not a fit value — render.php gates fit off for it)
  container    backgroundSize — cover|contain|auto (BACKDROP vocabulary, narrower)
  before-after via supports.sgs.imageControls (sgsObjectFit), block-level, both slots
  decorative-image   — none —
  product-card via supports.sgs.imageControls
```

For each cell record, with `file:line`: the control primitive, the exact option set
verbatim, the label and help text verbatim, whether it supports per-device tiers (and via
which wrapper), whether it supports hover/other states, and its disclosure rule.

⛔ **Quote real code at real line numbers.** Do not paraphrase an option set. A component's
NAME does not tell you what it does — open it.
⛔ Where a block has NO equivalent, write "— none —". Absence is data.
⛔ Where a control arrives via an EXTENSION rather than a declared attribute, say so — the
DB cannot see those, which is how `before-after`'s object-fit was missed before.

### Useful, not authoritative

`python scripts/surveys/census-media-control-instances.py --json` lists which of the six
declares which attribute, per base. It is a POPULATION aid: it tells you where to look. Its
control column is a heuristic that lists every primitive in a file, so **it does not tell you
which control writes which attribute** — you read that yourself.

---

## Then stop

Write the table to `.claude/reports/2026-09-01-media-control-comparison.md` and hand it to
Bean. **Do not choose. Do not build.** Bean reviews it manually and tells you, per control,
which implementation to model on — or that none is adequate.

## Only after Bean has chosen

For each control he picked, report two things:

1. **Is it already a shared helper in EXACTLY the chosen form?** The helper files live in
   `src/components/media/controls/` (seven exist today). Existing ≠ matching: a helper whose
   option set, labels or tier support differ from the chosen shape needs rebuilding.
2. **So which needs: nothing / rebuilding / building fresh?**

⛔ Every unique control ends up as its OWN helper file in `src/components/media/controls/`.
Three atom controls currently inline their JSX instead — `meaning` (CheckboxControl +
TextControl), `source` (TextareaControl), and `video-behaviour`'s six playback toggles have
no helper file at all. Those need extracting regardless of what Bean picks.

---

## Standing constraints

- **Commit by exact path.** A hook rejects a pathspec-less commit. Two others take a literal
  token IN THE COMMAND: `[repeat-ok:<reason>]`, `[batch-ok:<reason>]`.
- Never `git checkout --` a file to undo an edit — it reverts to the last commit and takes
  unrelated uncommitted work with it.
- ⛔ Zero attribute renames — WP silently discards an attribute a block no longer declares.
- ⛔ No inline `style=""` (Spec 32). No deprecations, no version bumps (pre-production).
- **A grep returning 0 is a hypothesis.** This track's recurring failure is grepping a
  block's own file when a SHARED helper is the reader. `BackgroundPanel` and
  `ContainerWrapperControls` live under `src/blocks/container/components/`, NOT
  `src/components/`.
- **Every number you write must come from a command you just ran.** State the command beside
  it or omit the number.

## First action (< 5 min)

Open `src/components/media/atoms/registry.js` and list the ten atom ids with their `bases`
arrays. That list IS the row set for the table — deriving it first stops you tabulating from
memory.
