# Next session — border-control rollout (items 1-4), then a doc sweep

Invoke `/autopilot` before anything else.

This replaces `2026-08-29-clone-track-selector-lifts-and-doc-sweep.md`, which is done. Every
item it carried closed this session (D875/D876/D878) except Task 0's actual 45-block rollout,
which is what this prompt carries.

**Read D875, D876, and D878 in `.claude/decisions.md` before starting.** They carry the full
mechanism for everything this prompt summarises — do not ask for them to be restated.

---

## What closed on 2026-08-28, so you do not re-open it

| Item | Outcome |
|---|---|
| D873's three product-card lift bugs (border-on-CTA, dropped gradient, tag typography) | ALL CLOSED — full converter-level fixes, not just DB corrections. D875. |
| Framework-wide unreachable-gradient defect (found while closing D873) | 85 rows fixed across every block family, full test suite 724/724. D875. |
| Converter dispatch-order bug (CONTENT/GRID NULL-fallback leaking child-scoped attrs) | Fixed `acc9e7060`. D875. |
| Editor crash investigated on `sgs/product-card` | Traced to a pre-existing WP-core race (`useBlockProps()`'s native block-visibility check racing the canvas iframe), correlated with `<ServerSideRender>` bound-mode cards under heavy concurrent load. NOT a regression from this track's work. Do not re-investigate as new. |
| `SgsBorderControl` component | Built, proven on 2 blocks (`product-card`, `quote`), live-verified both. |
| `button` naming normalisation (`colourBorder*` → `borderColour*`) | Done, `89997c91f`, live-verified. |
| Deterministic Shape-A codemod | Built and proven (`migrate-border-control.js`, 14/14 self-test), dry-run confirms 6 fixable + 2 correctly refused. |
| Product-card hover | Confirmed working live by Bean — closed, no action. |
| 5 stack-conversion candidates | Closed — 0 need converting (4 dead patterns, 1 already correct). |
| Visual-diff sign-off for D830-D834's touched blocks | Paid for `product-card`/`button`/`quote` (`reports/visual-diff/*-2026-08-28.md`). |

⛔ **D851 still does not reproduce** (carried forward from the prior prompt — unrelated to this track, but the hazard stands: don't cite page 2884 as evidence of anything).

---

## Task 1 — Apply the 6 confident Shape-A codemod fixes

`plugins/sgs-blocks/scripts/migrate-border-control.js --fix` (dry run first, read the diff),
then `--fix --apply` for: **button, container, option-picker, process-steps, text, timeline**.

**Before applying:** re-run `--self-test` yourself and confirm 14/14 still passes — don't trust
that it still does just because it did last session. Concurrent tracks share this DB/tree.

**After applying, live-verify each of the 6** — not a sample, all six, since each has a genuinely
different prior UI shape per the codemod's own classification. For each: insert a fresh instance
in the editor, set Width/Style/Colour via the new composite, confirm via the block-editor data
store (`wp.data.select('core/block-editor').getBlocks()`) that the right attributes are written
— not just a DOM screenshot, which can miss a wiring bug (this exact miss happened with `quote`
last session: a DOM check alone would have shown "no border" and wrongly flagged a defect, when
the real cause was an incomplete test that never set `borderStyle`). Then check the frontend.
Write a `reports/visual-diff/<block>-2026-08-29.md` for each, following the shape of
`reports/visual-diff/quote-2026-08-28.md` (the most complete example — it documents a negative
case too).

**Delete each throwaway test page after verification**, matching the pattern this session used
(`wp post delete <id> --force`).

**Commit in batches, not one giant diff**, per R-31-5 — e.g. 2-3 blocks per commit, each with its
own visual-diff report in the same commit.

## Task 2 — Get Bean's call on 2 refused blocks

The codemod correctly refuses these — do not force either:

- **`heading`** — border colour+style is mounted TWICE (once embedded, once via a standalone
  `DesignTokenPicker`). Show Bean both mount points; ask which to keep before writing any code.
- **`icon-list`** — its colour row is a conditional-spread array element
  (`showBorderColourRow && {...}`), a genuinely different AST shape from every other block. Once
  Bean confirms the intended UI shape, this likely needs a hand-written swap, not a codemod
  extension (a one-off different shape is not worth a third codemod branch for one block — apply
  THE-MIGRATION-METHOD's Step 5 test here before deciding).

## Task 3 — Shape B: find or build a reference example for the 38 native-full blocks

**No codemod exists for this, and none can be derived from `product-card`/`quote`** — neither
touched `render.php`, since both were already block-private before Task 0. D876 has the full
finding. This is NOT a continuation of last session's codemod work; it is new ground.

Read `.claude/THE-MIGRATION-METHOD.md` Step 3 (settle the shape on ONE instance before censusing)
— this IS that situation. Pick one NATIVE_FULL block (query
`plugins/sgs-blocks/scripts/survey-border-control-migration.py --survey --json` for the current
list — re-verify the count, don't trust last session's "38" without checking, since concurrent
tracks may have changed a block's classification), and by hand:

1. Add block-private border attributes to its `block.json` (`borderWidth` as a box-family object,
   `borderStyle` as the 3-option enum matching `BorderStyleControl`'s vocabulary, `borderColour`/
   `borderColourGradient`/`borderColourHover`/`borderColourHoverGradient` as strings).
2. Remove `supports.border` (the native declaration).
3. Add `<SgsBorderControl>` to `edit.js`.
4. Write the `render.php` CSS-emission logic — follow Spec 32's no-inline-styling contract (a
   scoped `<style>` block) and reuse the shared helper other block-private blocks already call
   (check `includes/helpers-tokens.php` for `sgs_border_gradient_css()` or equivalent — read
   `product-card/render.php`'s border section as the reference PATTERN even though its attrs
   didn't change this session, since its render-side plumbing already does what a Shape-B block
   needs).
5. **Check theme patterns/templates for authored native border attrs on this block BEFORE
   removing `supports.border`** — the D683 failure (retiring native colour broke 7 header
   patterns silently, because `check-dead-pattern-attrs.py` only checks whether `supports.color`
   is declared, not its sub-flags). Grep `theme/sgs-theme/{patterns,templates,parts}` for this
   block's slug plus `borderWidth`/`borderColor`/`borderStyle`/`borderRadius` in its authored
   attrs first.
6. Deploy, live-verify (editor + frontend, computed styles), write the visual-diff report.

**Design-gate this with Bean before building** (Rule 7 — this changes a native block's data
model and touches the shared render pattern other blocks will copy). Once ONE block is proven,
that becomes the reference for building the actual Shape-B codemod — the same process last
session used for Shape A, just with Shape B's own reference example instead of borrowing Shape
A's.

## Task 4 — Triage the 7 ANOMALY blocks

`filter-search`, `label`, `mega-aside`, `mega-panel`, `product-search`, `social-icons`,
`whatsapp-cta` — each has partial border support (re-verify via the survey script's `--json`
output, don't trust last session's classification blind). Each needs its own look — read what
border-shaped attrs it actually declares, decide with Bean whether it should gain the full
composite or stay as-is, before touching any code. No batch treatment; these are one-by-one by
design (the survey script's own docstring says so).

---

## Task 5 — Close the session with a doc sweep

Everything above touches docs that already drifted once tonight (D875/D876 needed a genuine
40KB decisions.md sweep and a LEDGER byte-cap trim to pass `handoff-preflight.py` last session —
expect the same pressure this time).

**Read before editing:** `.claude/CLAUDE.md` for the doc-op rules.

| Doc | What to check |
|---|---|
| `.claude/LEDGER.md` | Replace this track's section, fold in — never delete another track's lines. Byte cap 24,576 — if over, TRIM your own section (point to D-numbers for detail, don't restate), never another track's. |
| `.claude/decisions.md` | New entries for whatever ships. Verify the D-ceiling with the anchored grep (`grep -oE '^## D[0-9]+' .claude/decisions.md \| grep -oE '[0-9]+' \| sort -n \| tail -1`) — re-run it fresh, other tracks commit to this file constantly. |
| `reports/visual-diff/` | Every block this session's commits touched owes a report — see Task 1/3's own instructions above. |
| `plugins/sgs-blocks/CLAUDE.md` | Update the block-status rows for whichever blocks got migrated. |
| `.claude/hooks/doc-size-baseline.json` | If `handoff-preflight.py --check` fails on `decisions-size`, run `.claude/scripts/sweep-decisions.py` for real (not just `--dry-run`) — it's citation-verified and git-reversible — then record the post-sweep size here per its own `how_to_update` note. Do NOT hand-archive entries yourself. |

**Two mechanisms worth knowing before you hit them (both earned last session, both real):**
1. This repo has TWO independent commit-gate layers that print near-identical output but need
   DIFFERENT bypasses: the session-scoped Claude Code hook (`[gates-ok:<reason>]` in the commit
   message) and git's own native `.githooks/pre-commit` (`--no-verify` only, no token). A commit
   can clear one and still be blocked by the other — check which is actually failing (the exact
   wording differs) before assuming a token was ignored.
2. If a dispatched agent's report describes a PLAN rather than reporting completed work (unusually
   short duration, future-tense phrasing), verify a real artefact exists (`git log`, `git status`,
   re-run its claimed self-test) before trusting it — and check `ListAgents` for an unexpected
   still-running child before re-dispatching a retry on the same task.

Finish with `/handoff`, then `python .claude/hooks/handoff-preflight.py --check`.

---

## Standing hazards — carried forward, never subtract (D101)

1. `main` is shared with several other live sessions. Commit with explicit paths
   (`git commit -- <paths>`), never a bare commit after `git add`, and never a glob pathspec.
2. Never write `post_content` to a page Bean has open in the editor.
3. Verify subagent and tooling claims — including this prompt's own citations — against ground
   truth before acting.
4. A local edit to a theme pattern changes nothing live. Deploy before verifying.
5. `wp post update` without `--user=1` silently strips CSS from block attributes (KSES, no user
   context). Applies to any tool writing post_content.
6. A deploy can report `[ABORTED]` while its payload landed — check the server, not the exit code.
7. Git Bash can show a stale view of files on Windows. Confirm through PowerShell before
   concluding work was lost.
8. The visual-diff gate strips comments before grepping. Naming an attribute in a comment does
   not satisfy it.
9. Never hand-escape JSON into block markup. Use a serialiser and assert the result parses.
10. Two agents editing one block both need `npm run build` before either's change is verified.
11. A dispatched agent's "completed" status is not proof its work is real — verify an artefact
    (commit, file, self-test output) before trusting a report, especially a fast one.
12. Two agents dispatched on the same file path collide. Check `ListAgents` before re-dispatching
    a retry after an odd first attempt.

---

## Tools

| For | Use |
|---|---|
| Shape-A rollout | `plugins/sgs-blocks/scripts/migrate-border-control.js` |
| Shape-B build | `/brainstorming` for the design-gate conversation, then `THE-MIGRATION-METHOD.md`'s process, `/qc-council` before commit |
| Visual-diff sha for an already-committed change | `visual-report-sha.py`'s algorithm applied to `git diff-tree --no-commit-id --name-only -r <commit>` + `git show <commit>:<path>` per file — same digest shape, since the script itself only works on currently-staged bytes |
| Live verification | `mcp__plugin_superpowers-chrome_chrome__use_browser` if Playwright/Chrome DevTools MCP are locked by concurrent sessions (own dedicated Chrome profile, doesn't contend) |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the one path |
| Session close | `/handoff`, then `handoff-preflight.py --check` |
