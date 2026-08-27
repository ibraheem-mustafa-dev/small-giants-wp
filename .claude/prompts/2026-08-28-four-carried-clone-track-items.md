# Next session — four carried items from the Mama's Clone Track

Invoke `/autopilot` before anything else.

The twelve-template review closed 2026-08-28 (D854). Four small items were carried, not fixed.
This prompt covers all four. Read the cited D-numbers for full context — do not ask for them
restated here.

## Task 1 — Page 2884's product-card line-heights render as the default, not the authored value

**Read `.claude/decisions.md` D851 first.** `sgs/product-card.titleLineHeight` and
`.descLineHeight` are stored as strings (`"1.2"`, `"1.55"`) on page 2884. `block.json` declares
both `type: "number"`. WordPress silently drops a value that fails its schema type and falls
back to the block's default — so the authored line-heights are gone, with no error anywhere.

**Same bug class as D802 and D833** (also in decisions.md) — both were a converter step writing
a value whose type or enum membership didn't match block.json, with no `validate()` check before
the write. D833's fix landed in `services/assembly.py` step 3b; check there first for a sibling
typography-lift step that emits `titleLineHeight`/`descLineHeight` as strings instead of floats.

**First action:** confirm the bug still reproduces — `wp post get 2884 --field=post_content` on
the sandybrown canary, grep for `titleLineHeight`, confirm the stored value is quoted. Then find
the converter step that writes it (grep `services/` for `titleLineHeight` and
`descLineHeight` — D851 notes this wasn't yet traced to a specific resolver).

**Done when:** the converter emits a number, not a string, for both attributes, live-verified on
a fresh clone (not just re-read in code — this whole track's method is open the page and look).

## Task 2 — flexWrap migration: 127 stack-conversion candidates, still dry-run only

**Read D847.** `plugins/sgs-blocks/scripts/migrate-container-flexwrap-and-stack-candidates.py` is
built, self-tested (17 assertions, no network needed), and has never run `--apply`. It found 127
containers that are stack-conversion candidates (`layout: "stack"` instead of the current
value) — but every conversion is a visible layout change, so **Bean must review each candidate's
screenshot before any is applied**. This is not a bug to fix; it's a sign-off gate to run.

**First action:** run the script's dry-run report again to confirm the candidate count still
holds (`python plugins/sgs-blocks/scripts/migrate-container-flexwrap-and-stack-candidates.py`,
no `--apply`), then bring the report to Bean for per-candidate screenshot review before touching
`--apply`.

## Task 3 — The 375px readable-card floor: a design decision waiting on Bean, not a bug

**Read the two matching entries in decisions.md** (search "readable-card floor" — both frame it
identically). At 375px the shop archive renders product cards 1-up at 327px, while the related
PDP carousel renders cards 2-up at 155px each — both under the 167–195px width this project
treats as the floor for a genuinely readable card. The mechanism changed from a grid to a
carousel at some point, which is why the two surfaces now disagree.

**This needs Bean's call, not more investigation:** should the carousel switch to 1-up on mobile
to match the shop archive's card width, or is 2-up-and-narrow an accepted tradeoff for the
carousel's own reasons? Ask before building either direction.

## Task 4 — Switch on `sgs/button`'s font-family control

**Confirmed 2026-08-28, not yet fixed.** `sgs/button` already uses the shared
`<TypographyControls>` component (`edit.js:769-778`) — this is a canonical block, not a
hand-rolled one; don't rebuild anything. Its call passes `showSize`, `showWeight`, `showStyle`
and `showResponsive`, but never `showFontFamily` — a prop the component has supported since it
was built (`TypographyControls.js:255,273,533-538`). `render.php` already reads, sanitises
(`sgs_font_family_sanitise()`) and emits the `fontFamily` attribute into the button's CSS
(`render.php:204,397-398`) — so the render side is complete and has been waiting on the control
the whole time.

**Fix:** add `showFontFamily={ true }` to the existing `<TypographyControls>` call in
`plugins/sgs-blocks/src/blocks/button/edit.js`. One line.

**Done when:** the block editor's Typography panel on `sgs/button` shows a font-family picker
matching the other canonical blocks (`text`/`heading`/`label`/`quote`), and setting a value
changes the rendered button's `font-family` live.

## Standing hazards (carry forward)

- `main` is shared with other live sessions — commit with explicit paths
  (`git commit -- <paths>`), never a bare commit after `git add`.
- Never write `post_content` to a page Bean has open in the editor.
- Verify subagent/tooling claims — including this prompt's own citations — against ground truth
  before acting on them.
- **When a fix touches a theme pattern (`.php` files under `theme/sgs-theme/patterns/`), a local
  edit alone changes nothing live** — the site renders from the deployed copy on the server, not
  the git working tree. Deploy before verifying. Caught 2026-08-28 when a footer content fix was
  edited locally, committed, but not deployed, and the live page kept showing the old markup for
  two full verification passes before the gap was found.

## Tools

| For | Use |
|---|---|
| Task 1 root-cause + converter fix | Read `services/assembly.py`, `wp-sgs-developer` agent for the fix once traced |
| Task 1/2/3 live verification | Playwright MCP — open it and look, per this track's governing rule |
| Pre-commit validation on the converter fix | `/qc-council` |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the one path |
| Session close | `/handoff` |
