# Golden colour — continuation

**Written 2026-09-03.** Supersedes `2026-09-03-golden-colour-staged-rollout.md`, deleted in the
same commit. Invoke `/autopilot` first.

## ⛔ Do the grounding pass before you write a single dispatch prompt

This is the whole reason this prompt exists. The parallel `37-media-no-handroll` session spent
**roughly 75% of an Opus context window on verification**, and the cost came from a dozen agents
each re-deriving the same three facts on their own block. Full account:
`.claude/reports/2026-09-03-media-atom-migration-lessons.md`.

Answer these three questions **once, across the whole finding set**, before briefing anyone:

1. **Does a control already exist under another name?**
   `grep -l "Colour\|colour" src/blocks/<flagged>/edit.js`
   Blocks with a hit get *bridge-onto-existing* briefs. Blocks without get *build-new* briefs.
   Two batches, decided up front.

2. **Is the flagged CSS actually live?**
   One grep for the selector. `info-box`'s flagged rule targeted a class nothing renders — that
   cost a full agent cycle to discover mid-flight.

3. **Do several findings share one function?**
   `grep -rn "<helper>" src/blocks/*/render.php`. Seven `backgroundOverlay*` findings were **one**
   function in `class-sgs-container-wrapper.php`, not seven problems. Check before you scope.

Then write **one brief per distinct pattern**, never one template reused N times. A generic brief
works only because every agent independently re-derives which situation it is in — and you pay for
that N times.

Budget: 15–20 minutes. It saves several times that.

⚠ Query the DB for the backlog's real shape, not the detector's text output:
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE css_property='color'"`

## Where this stands — verified 2026-09-03 at `6ea70a161`

`node scripts/colour-codemod/survey.js` from `plugins/sgs-blocks/`:

| Verdict | Rows |
|---|---|
| `no-gradient-capable-paint-path-found` | **85** |
| `CONFORMANT` | 78 |
| `paints-via-colour-valued-custom-property` | **35** |
| `AUTOFIXABLE:wire-state-emitter` | 24 |
| `AUTOFIXABLE:helper-at-existing-selector` | 16 |
| `no-css_property` | 8 |
| `unresolvable-attr` | 6 |
| **Total** | **252 rows / 65 blocks** |

Rule 31 sits at **250** (below-min-states 132, missing-gradient 118), ratchet locked at 250 with
zero slack. `grant.js` still does not exist — confirmed by search today.

**Shipped so far:** 16 blocks gained a gradient-capable text paint path; rule 31 fell 276 → 250
across a detector fix and the rollout.

## What remains, in the order worth doing it

1. **The 40 AUTOFIXABLE rows.** The largest closable group. Run `fix.js --fix` as a **dry run
   first** — its verdict disagrees with the survey's, and that disagreement has already cost one
   planned phase. See "Two tools, one question" below.
2. **The 85 no-paint-path rows.** Same four-change pattern as the 16 already done.
3. **The 35 custom-property rows.** These fail in `style.css`, which nothing has touched yet. No
   phase owns that file. Scope it before starting.
4. **132 below-min-states.** Needs a hover sibling per row — a *separate* dimension from gradient,
   with different storage. Do not fold the two together.

## The proven pattern — four changes per attribute

Exemplar: commit `305f9170c`. Read `src/blocks/counter/` as it stands **now**.

| File | Change |
|---|---|
| `block.json` | add `{attr}Gradient` (string, `""`); add `"css:background-image": "{attr}Gradient"` to the **owning** element's `attrMap` |
| `render.php` | `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `edit.js` | `gradientCapable: true`, plus `gradientValue`/`onGradientChange`; preview via `resolveTextColourPreviewStyle( flat, gradient, colourVar )` |
| `reports/visual-diff/` | one per block — **repo ROOT**, not the plugin directory |

⚠ **Do not read commit `778879732` for this pattern.** Its gradient shared one attribute and its
preview helper took two arguments; both have changed. Following it produces a broken call. Two
sessions have now hit this.

⚠ Call `sgs_text_colour_gradient_fallback_rule()` **unconditionally**. It self-no-ops on a flat
colour, so no caller can get the condition wrong. Omit it and a gradient reaches the browser as a
bare `color:` holding a gradient string, which the browser drops in silence.

## Four things that will bite you

**Two tools, one question, two answers.** `survey.js` reports 40 AUTOFIXABLE; `fix.js` refuses far
more than you expect. The survey models fewer constraints than the fixer enforces. Never plan work
off the survey's autofixable count — run `fix.js --fix` as a dry run and believe that instead.

**A moved verdict does not prove the old writer is gone.** The survey confirms a gradient path now
*exists*. It cannot see a superseded flat writer still emitting a competing `color:`. **Read the
diff's minus lines.** Two writers on one element is the defect this programme exists to remove.

**Removing a writer can leave dead guards.** Stripping the text colour from
`wp_style_engine_get_styles()` left `$X_color_args` provably always-empty in four blocks, and
`check-render-undefined-vars` failed the build. Prune by proof — zero remaining writes — never by
heuristic.

**Per-agent green is not evidence.** Run `npm run gate:fast` centrally, once, after the batches
land. It caught two real defects that every agent's own verification passed. Run `/qc-council` the
same way: once over the whole landed diff, never per block.

## Owed, and named rather than buried

**Nine visual-diff reports still say `verdict: PARTIAL`.** They cover the hover guard and the
colour blocks, and none was fabricated to PASS. The canary has since been deployed by the parallel
session, so the block is gone: **run the owed probe.**

Measure computed style on the painted element, before and after, with a negative control that must
show nothing. Drive a real hover and assert a resolved `background-image: linear-gradient(…)` — the
two things the mandate is about are the two a resting-style probe cannot see.
⛔ Never grep page HTML. Block CSS lifts to `uploads/sgs-css/<hash>.css`.

Also open: **no contrast guard exists anywhere in the colour components.** A client can pick a pale
gradient on white and get unreadable text with no warning, against the framework's own WCAG 2.1 AA
baseline. Out of scope here; it deserves its own session.

## Standing rules

- One batch, one **path-scoped commit**. Enumerate filenames; never use a glob. Re-check the branch
  in the same command — a hook enforces this.
- **Quote no count from this prompt into a commit message.** Paste the tool's own output.
- Rule 31 cannot see `render.php`, and cannot see `SgsBorderControl`'s 44 mounts either. A flat
  number does not mean nothing happened.
- A `block.json` change trips the visual-diff gate. Write a real report; never fabricate `PASS`.
- **D752 is the mandate:** hover and gradient everywhere. When machinery fights it, change the
  machinery.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/dispatching-parallel-agents` | After the grounding pass, one block set per agent |
| `/qc-council` | Once, over the whole landed diff |
| `/verify-loop` | Two attestations per load-bearing claim |
| `/handoff` | Session close |
