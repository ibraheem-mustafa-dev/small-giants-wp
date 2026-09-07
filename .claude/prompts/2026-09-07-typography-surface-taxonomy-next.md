---
doc_type: prompt
title: Typography — surface-type taxonomy + helper extension (supersedes the task3-close prompt)
created: 2026-09-07
governs: plugins/sgs-blocks/src/components/TypographyControls.js, plugins/sgs-blocks/includes/helpers-typography.php
retention: delete once consumed
---

# Typography — surface-type taxonomy + helper extension

Invoke `/autopilot` first. Check `ListAgents` and `git status` before touching anything — this
tree runs many concurrent sessions on `main`.

**This file REPLACES `2026-09-06-typography-task3-close-plus-converter-bug.md`, deleted
2026-09-07.** That prompt was written hours before the shared component was rebuilt and
described the pre-rebuild world. Do not resurrect it from git history to "check what was
planned" — its plan is void, and the parts of it that were still true are carried forward below.

## First action

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --only 45-typography-full-replacement`
— under a minute, no dependencies. Confirms the 6-block native-typography holdout list is still
6 before you plan anything.

## Ground truth (verified 2026-09-07 by running the commands, not by reading a doc)

**The shared helper already exists and was already rebuilt.** Commit `bf2c903ba` (2026-09-06)
was not two block panels — it rebuilt the shared component itself:

```
src/components/TypographyControls.js   +1033
includes/helpers-typography.php           +92
src/components/primitives/index.js        +30
src/blocks/{heading,text}/*            (the two blocks migrated onto it)
```

It wraps WordPress core's real widgets (`FontSizePicker`, `LineHeightControl`,
`FontFamilyControl`, `FontAppearanceControl`, `TextDecorationControl`, `TextTransformControl`,
`WritingModeControl`) and deleted every hand-built lookalike. Its own header comment (lines
1-120) is the fullest written record of why — read it before editing.

**Context-variance already has a mechanism: 15 opt-in `show*` props.**
`showSize` `showWeight` `showStyle` `showLineHeight` `showLetterSpacing` `showTransform`
`showDecoration` `showTextAlign` `showFontFamily` `showWritingMode` `showTextColumns`
`showTextIndent` `showTextWrap` `showHover` `showResponsive`

**Adoption numbers, measured:**

| Measure | Count |
|---|---|
| Blocks total | 83 |
| Blocks importing `TypographyControls` | 39 |
| Blocks still declaring native `supports.typography` | **6** — `card-grid`, `collapsible-text`, `counter`, `icon-list`, `quote`, `testimonial` |
| Blocks passing `showTextColumns` / `showTextIndent` | 1 each (`sgs/text`) |
| Blocks passing `showWritingMode` | 2 (`heading`, `text`) |

⚠ **Counting trap, hit once already:** `grep '"typography"' block.json` over-counts by matching
`selectors.typography`, which is NOT a violation. Parse the JSON and check `supports.typography`
specifically. The raw grep says 14; the truth is 6.

**heading vs text differ by exactly two props** — `text` passes `showTextColumns` and
`showTextIndent`; `heading` passes nothing `text` doesn't. Text is a strict superset. That is the
whole observed difference between the two, and it is the seed of the taxonomy below.

**D972/D973 are accurate and still hold.** D972's 4-bucket census across 84 blocks is real and
should be reused, not redone. D973's "6 remaining" is confirmed live today.

## The direction — Bean-settled 2026-09-07, not open for re-litigation

**ONE helper with block/context-based variance.** Not multiple variant helpers. The `show*` prop
surface is the delivery mechanism and it already exists.

Evidence supporting it: D973 asked "does this divergence need a variant helper?" five ways
across three blocks and **every divergence collapsed into a shared-helper fix** — none survived
to needing a variant. The single documented block-specific exception left standing is `label`'s
curated weight set for eyebrow/kicker text.

**Two capabilities are genuinely missing**, both of which fit the existing `show*` pattern:

1. **Element switcher.** Absent from the two current blocks only because heading and text each
   paint ONE text surface — there was nothing to switch between. Blocks with multiple font
   surfaces (root / price / description …) need it. It belongs **inside the shared helper**,
   with show/hide driven by how many layers/elements the text controls paint. Not a separate
   wrapper component.

2. **Two-state link colour.** `sgs/text` needs it because a link can be applied to a *selection*
   inside body copy (WordPress's `core/link` RichText format), so linked and unlinked text
   coexist in one element. Every other case is a whole-element state — always a link, never a
   link, or a boolean that flips all the content at once — and those never coexist, so they
   don't qualify. **The qualifier to implement and test: does the block render a RichText field
   whose allowed formats permit `core/link`?** Confirm that mechanism against the code before
   building on it.

## Task 1 — the surface-type taxonomy (DESIGN GATE — Bean decides, do not infer)

⛔ **Rule 7 applies: this is a shared-mechanism decision affecting every text surface in the
framework. Get Bean's approval on the taxonomy BEFORE building anything against it.**

The question is **not** "which of the 39 adopters should opt into the new controls". It is
**"what control set is appropriate to each text surface/element type?"**

A heading needs size, weight, style, line-height, letter-spacing, transform, alignment — and has
no business with columns or indent. Body copy needs those two. A price probably needs size,
weight and family only. A description, an eyebrow/kicker, a badge, a caption each differ again.

**Deliverable:** an enumerated list of the distinct text surface types across the library, and
the `show*` set each should expose.

**Why Bean decides it, not an agent:** current usage is exactly what's undefined — 37 of the 39
adopters have never had their control set deliberately chosen. Inferring the taxonomy from
current usage would launder an accident into a standard. Bring him a proposed taxonomy with
reasoning and let him rule.

## Task 2 — element switcher in the shared helper

Gated on surface count. Hidden at one surface, shown above one. When shown, switching element
changes **which controls are visible**, per Task 1's taxonomy — not merely which attributes are
written. Blocked on Task 1.

## Task 3 — two-state link colour

Build the control and the qualifier from the `core/link` RichText-format condition above. Verify
the format-allowlist mechanism in code first; the qualifier must be testable, not a hand-kept
list of block names.

## Task 4 — apply the taxonomy across the 39 adopters

Blocked on Task 1. `.claude/THE-MIGRATION-METHOD.md` applies — more than 3 blocks by the same
mechanical pattern means build the detector first. A rule-45-style advisory rule that flags a
surface whose `show*` set doesn't match its declared surface type is the shape to aim for.

## Task 5 — the 6 native-typography holdouts

`card-grid`, `collapsible-text`, `counter`, `icon-list`, `quote`, `testimonial`. Carried forward
from the deleted prompt, but **re-scoped by evidence gathered 2026-09-07** — the old prompt
treated all four non-false-alarm blocks as identical "double-writer conflicts". They are not:

| Block | Actual state |
|---|---|
| `card-grid` | **REAL live double-writer.** Native (`wp_style_engine_get_styles`, render.php ~198-206) and `sgs_typography_css_rule()` (~745) both write the same properties to the IDENTICAL selector at equal specificity (0,2,0). Emission order decides the winner. |
| `testimonial` | Not a conflict. Native applies to the block ROOT only; children override by cascade. A policy violation under D971, not a rendering bug. |
| `icon-list` | Not a conflict. Native targets `.sgs-icon-list__text`; the shared calls target `.sgs-icon-list__item` and `.sgs-icon-list__heading`. Different elements. Native is the sole mechanism for the text span — a migration gap. |
| `collapsible-text` | Not a conflict, and structurally can't be for font-size (`fontSize: false` in block.json). Native's only live output is `textAlign`, which the shared component doesn't own. |
| `counter`, `quote` | Known false alarms (D972) — each mechanism governs a genuinely different element. |

Fixing `card-grid` is one job; the other three are policy cleanup. **Which direction the fix
takes depends on Task 1** — do not fix them before the taxonomy is settled, or they'll need
re-doing.

## Task 6 — the still-pending canary deploy

**D973's own closing line: "Deploy still pending — neither PR has been deployed to the
sandybrown canary yet."** PRs #40/#41 (23 blocks migrated onto the shared mechanism) have never
been live-verified. D973 names this as its own next-session first item and it never happened.

Live spot-check when it goes: 3 sampled Task-1 blocks plus `heading`/`label`/`text`'s font-size
presets, decimal sizes, and the decoration dropdown. R-31-13 — script measurement never closes
alone.

## Task 7 — two doc corrections this work has earned

1. **`plugins/sgs-blocks/CLAUDE.md:814`** is stale and actively misleading. It still specifies
   the hand-rolled control shapes `bf2c903ba` deleted — *"font size = `<ResponsiveControl>`
   wrapping a `<UnitControl>` … weight + style = SelectControl dropdowns"*. Every agent is told
   to read that file. Fix it to describe the rebuilt component.
2. **`bf2c903ba` has no D-number.** It appears exactly once anywhere under `.claude/` — as
   backstory to an unrelated crash in D978-D981. A rebuild of a shared component adopted by 39
   blocks deserves its own decision entry. Also fix `decisions.md:435`, whose pointer to
   `2026-09-06-typography-full-replacement-next-session.md` is a **dead link** (that file was
   deleted in the `fd0b64d2b` prune).

## Already done — do not redo

- **Converter padding-shape bug: FIXED.** `python -m pytest
  plugins/sgs-blocks/scripts/converter/tests/test_outer_box.py -q` → 12/12, verified on HEAD
  2026-09-07. This was half of the deleted prompt; it is closed and does not travel further.
- **Table-of-contents underline (`93dacf0d4`)** — real specificity collision, fixed 2026-09-05.
- **Four panel-UX fixes dispatched 2026-09-07** — `sgs/text` colour moved into `SgsColourPanel`;
  letter-case reset button; orientation/alignment re-split 1/3 : 2/3; line-indent + columns onto
  one row. Verify they landed before assuming; if any didn't, they are NOW work, not next-session
  work.

## Guardrails (carried forward — do not skip)

- **Read the relevant CLAUDE.md/spec section before building any general mechanism.** D970 is the
  incident: a shared colour mechanism was shipped without reading an already-documented rule and
  reverted the same night. A documented rule binds whether it's a day old or a year old.
- **Colour lives as ONE ROW inside the shared `SgsColourPanel`**, rendered first (D609/D618/D622).
  Never a bespoke per-element colour mount.
- **D983 (2026-09-07): no PRs, no stashes, integrate after every task.** Commit directly to
  `main`, path-scoped.
- **NEVER `git stash` on this shared tree. NEVER `git checkout --` a file.** Both have destroyed
  peer sessions' uncommitted work here.
- **Path-scope every commit** — the pre-commit gate refuses a bare `git commit`. No globs; a
  `*/render.php` glob once swept another session's half-done edit onto `main`.
- **Re-check `git branch --show-current` in the same command as the commit.**
- **Never fabricate a live-verification PASS against a stale target.** If the canary doesn't
  carry the code, say so and deploy first.
- **Never write a parking.md entry without asking Bean first — every time, no exceptions.**
- **A surviving code reference is not proof a bug is live.** This prompt's own Task 5 table
  exists because that assumption was wrong on 3 of 4 blocks.
- **Spec 32:** no SGS block renders an inline `style=` property declaration.
- **No version bumps, no deprecations** — pre-production (Bean D293).

## Tools

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --only 45-typography-full-replacement` | Native-typography holdout list |
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Full finding census, filterable by `kind` |
| `npm run check:dead-controls` | Net-new dead-control regressions |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | DB ground truth before any "missing X" claim |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The ONE deploy path (Task 6) |

## Skills and agents

| Route to | When |
|---|---|
| `/autopilot` | Always, first |
| `wp-sgs-developer` | All SGS block work |
| `/brainstorming` | Task 1's taxonomy — design before build |
| `/systematic-debugging` | Any regression — root cause before fix |
| `/dispatching-parallel-agents` | Task 4's batch, once the taxonomy is settled |
| `/sgs-db` + `/wp-blocks` | Schema ground truth |

## Hand back, don't improvise, if:

- Task 1's taxonomy needs a judgement Bean hasn't made — that's the design gate, not a blocker to
  work around.
- The `core/link` qualifier turns out not to be cleanly detectable — that changes Task 3's shape
  and is worth a conversation, not a hand-kept block list.
- Any count above has moved a lot — re-verify before assuming drift means something broke.
