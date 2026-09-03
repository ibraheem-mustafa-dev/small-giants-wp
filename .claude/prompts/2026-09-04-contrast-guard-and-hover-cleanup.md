# Next session — contrast guard, then the hover-guard's 24 real findings

**Written 2026-09-04.** Supersedes `2026-09-04-background-layer-and-contrast.md`, deleted in
the same commit. Invoke `/autopilot` first.

## What closed since the superseded prompt was written

**8 of D936's 9-row background-collision batch are DONE and live-verified** on the sandybrown
canary via the real deployed PHP (not just the local harness). Read `.claude/decisions.md` D937,
D938, D940, D942, D943, D945 (top of file) for the full recipe, what each row needed, and the live
verification results. The hover-guard scanner's function-body blind spot is also fixed (D943) — it
now genuinely scans every block's `render.php`, not just `includes/`.

⛔ **The 9th row, `nav-menu.burgerColour`, is NOT fixed — do not assume it is.** D945 corrects an
earlier overclaim of "9 of 9" in this same batch, caught by this handoff's own `/qc` check. It's a
miscategorisation, not a same-recipe fix: the "text" is an inline SVG icon coloured via
`currentColor`, and `background-clip:text` (this whole batch's mechanism) does nothing to an SVG
path fill. It needs `sgs_svg_stroke_gradient()` (the mechanism `sgs/icon` already has for exactly
this) plus a new colour-gradient attribute on the burger icon that doesn't exist yet — a different,
unbuilt feature. Tracked in `parking.md` (`P-COLOUR-NAV-MENU-BURGER-GRADIENT`), not this track's
job to build unless it becomes the priority.

Everything else from that track is closed. Do not re-open or re-verify the 8 — they're done, with
live evidence.

## First action

Invoke `/autopilot`, then read the Mandatory Reading below. First BUILD action is deciding the
gradient contrast-measurement method (worst-stop vs both-stops vs sampled) — a five-minute design
call, not a research project — then wiring the WARN notice into `GradientCapableColourControl.js`.

## Mandatory READING

1. `.claude/decisions.md` D943 (top of file) — what shipped tonight, and why the hover-guard
   check is advisory (not blocking) until the 24 findings below are triaged.
2. `plugins/sgs-blocks/CLAUDE.md` § "Touch-safe HOVER helpers" — the two guard layers and the
   three guard functions.

## Task 1 — contrast guard (Bean-ruled: WARN, NEVER BLOCK)

⛔ **Still binding, unchanged from before: WARN only. Must never prevent an operator from
saving.** Matches the existing project rule that operator accessibility failures are notices,
not gates.

No contrast guard exists anywhere in the colour components today. Don't build from scratch —
`sgs/site-header`'s `edit.js` (~lines 525-727) already has two live WCAG contrast notices for
FLAT colours, using `<Notice status="warning" isDismissible={false} className="sgs-contrast-notice">`
mounted in `InspectorControls`. Copy that shape.

Reusable pieces (found this session, not yet used for gradients):
- PHP: `sgs_wcag_relative_luminance()` / `sgs_wcag_text_colour_for_bg()` in
  `includes/helpers-colour-wcag.php` — flat-hex only.
- JS: `calculateRelativeLuminance()` / `calculateContrastRatio()` / `meetsWCAG_AA()` —
  **duplicated** identically in `site-header/edit.js` and `site-footer/edit.js`. Extract to
  a shared module (`src/utils/wcag-contrast.js`) as part of this task — both existing call
  sites switch to importing it, so this is a reuse fix, not just new scaffolding.
- Gradient stops: `getGradientAstWithDefault()` in `src/components/gradient-picker/utils.js`
  already parses a stored gradient string into `{ colorStops: [{ color, length }] }`.

**Design call to make and record, not leave open:** a gradient has no single contrast value.
Recommend **worst-stop** (run every stop through the shared contrast function against the
background, warn on the lowest ratio) — cheapest to compute, consistent with how the flat-colour
check already works per-colour. Make the call, write it down, move on.

**Wire it into `GradientCapableColourControl.js`** (the single shared component every
gradient-capable block already uses) — one integration point, not per-block.

## Task 2 — the hover-guard's 24 real findings (tiered, per the original plan — still correct)

The detector now works (D943). It found **24 render.php files with a genuinely unguarded
`:hover`** — a real, previously-invisible defect class, not scanner noise (spot-checked
`sgs/button/render.php:434`'s `transform:scale()` hover rule by hand). The check is wired
**advisory** into `postbuild` right now specifically so this doesn't block deploys while it's
triaged — do not just silence or delete the advisory wrapper without actually closing the
findings first.

Run `node scripts/hover-guard/check.js` (from `plugins/sgs-blocks/`) to see the current list.
Triage by tier, same plan as before — **do not batch-fix blind**:

| Tier | Why | Fix shape |
|---|---|---|
| 1 — motion (most visible) | `transform:scale`/similar stays visually stuck on tap | Wrap with `sgs_hover_state_rules()` instead of hand-concatenating `:hover,:focus-x{...}` |
| 2 — the silent bypass | Calls `sgs_border_gradient_css()` but bakes `:hover` into the selector with `$hover_paint=null`, so the helper's own guard never fires | Pass the paint through `$hover_paint` properly |
| 3 — shadow-only | Same sticky-state class, lower visual severity | Same as Tier 1 |
| 4 — colour-only (most files) | Sticky colour, smaller UX hit but still wrong | Same as Tier 1 — `sgs/post-grid`'s already-fixed pattern is the reference template |

Once ALL 24 are closed, remove the `postbuild` advisory wrapper in `package.json` (search for
"D943" in that file) and return `node scripts/hover-guard/check.js` to a hard gate — that's the
point of making it advisory now, not the end state.

## Standing rules (carried forward, still binding)

- `CLAUDE.md`'s 7 rules. `THE-MIGRATION-METHOD.md`: more than 3 blocks means build the detector
  first — already true for Task 2 (the detector is built; this is the fix phase).
- Path-scoped commits only; re-check the branch in the same command. **A second session has
  been concurrently active on this tree across the last two sessions** — re-verify file
  ownership and re-check the D-ceiling (`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE
  '[0-9]+' | sort -n | tail -1`) immediately before writing any new decisions.md entry; a
  collision happened twice tonight (D939/D941 already taken by the other session) and was
  caught only by re-checking.
- Before treating anything as a "design decision" needing your own judgement call, check whether
  another block already solved the identical shape first — the D942 4-question example
  (nav-menu.itemColour/form/modal) resolved cleanly this way after being wrongly filed as open
  design questions. `nav-menu.burgerColour` was the 4th question in that same review, but it
  resolved to "this needs a different feature entirely, not a design call" — read D942 before
  assuming its outcome matches the other three.
- Deploys need a clean `npm run build` — if it fails on something that looks unrelated to your
  change, check `git log` for what landed earlier the same day before assuming you broke it.
  Twice tonight the real cause was pre-existing debt from earlier same-day work, not the change
  being deployed.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/sgs-wp-engine` | Block/theme work |
| `/systematic-debugging` | Before any fix whose cause is not proven |
| `/subagent-driven-development` or `/dispatching-parallel-agents` | The 24-file batch, once triaged by tier — tiers are independent enough to parallelise |
| `/handoff` | Session close |

## Tool bindings

| Tool | Use for |
|---|---|
| `node scripts/qa/assert-css-effect.js` | Verifying any block's emitted CSS from a real render.php run, no deploy needed |
| `node scripts/hover-guard/check.js` | Current state of the 24 findings; re-run after each tier's fix |
| `wp eval` on the sandybrown canary (SSH, `.claude/secrets/sandybrown.env`) | Live verification via a block's real registered `render_callback` when the QA harness can't render the block |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` | The one sanctioned deploy path |
