---
doc_type: prompt
title: Typography track — deploy + live verify, then two doc fixes (Tasks 6-7)
created: 2026-09-07
governs: plugins/sgs-blocks (all blocks touched by the typography surface-taxonomy work)
retention: delete once consumed
---

# Typography track — deploy + live verify, then two doc fixes

Invoke `/autopilot` first. Check `ListAgents` and `git status` before touching anything — this
tree runs many concurrent sessions on `main`.

**This file REPLACES `2026-09-07-typography-surface-taxonomy-next.md`, deleted 2026-09-07.**
That prompt's Tasks 1-5 are ALL DONE (see "Already done" below) — do not resurrect it from git
history to "check what was planned"; its open items are fully carried forward here.

## First action

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --only 45-typography-full-replacement`
— under a minute, no dependencies. Confirms the native-typography holdout count before you plan
anything (expect 4: `counter`, `quote`, `testimonial`, and one more — the two false alarms from
D972 plus whatever `testimonial`'s root-level native declaration still needs; verify live rather
than trusting this number).

## Already done — do not redo (verified via commits + a full green build, 2026-09-07)

- **Task 1 (taxonomy) — SETTLED, not "designed".** Bean rejected the curated-taxonomy premise
  entirely after walking through the reasoning live: almost every proposed exclusion turned out
  to be technically unjustified once examined (a price field's letter-case DOES apply once
  currency text/suffixes are considered; line-height affects box height even on a single line).
  **Settled rule: every text surface gets the full `TypographyControls` set by default, no
  curation.** This is not open for re-litigation — if a future session proposes curating a
  block's control set down, that is a NEW decision requiring a NEW design gate, not a
  continuation of this one.
- **Task 2 (element switcher) — did not need building.** It already existed
  (`TypographyTargetSwitcher` in `src/components/TypographyControls.js`, via the `targets` prop).
  `card-grid` already used it. The real work was migrating other multi-surface blocks onto it.
- **Task 3 (two-state link colour) — SHIPPED.** `sgs_link_colour_css()`
  (`includes/helpers-typography.php`) + a `css:color-link` manifest member + a
  `SgsColourPanel`/`DesignTokenPicker` row, live on 7 blocks: `collapsible-text`, `heading`,
  `product-card` (description), `quote` (attribution), `testimonial` (quote), `text`, `timeline`
  (per-entry description). Commit `0e2f58cc2`.
- **Task 4 (apply the full set across all adopters) — SHIPPED**, in three passes:
  - Mechanical pass (29 blocks, one repeated boolean-flip shape): commit `8b67f5651`, via a new
    codemod `scripts/migrate-typography-full-controls.js` (survey/fix/check/self-test).
  - Hard cases (8 blocks needing real judgement — target-switcher conversions, render-side
    rewiring, new-coverage extension): commit `96bc9e734`.
  - **Critical regression found + fixed the same session**: turning the controls on exposed 513
    attributes across 84 blocks that were never declared in `block.json`, so WordPress silently
    discarded whatever a client set. Root-caused and fixed with a new detector,
    `scripts/audit-typography-attr-declarations.js`. Commit `f7cb3ba36`. **If you find a block
    with a `TypographyControls` control that doesn't seem to do anything, run this script's
    `--check` mode FIRST before assuming a new bug — it may have shipped after this prompt was
    written and be a real gap this detector doesn't yet cover** (it only checks the 15 known
    `show*` suffixes; a future addition to the shared component needs a matching addition here).
- **Task 5 (native-typography holdouts) — 3 of 6 closed.** `card-grid` (the real live bug —
  native's selector always won by one extra CSS class, silently overriding the block's own font
  panel), `collapsible-text` (a live duplicate the shared component's own rollout created),
  `icon-list` (native governed a different element than the shared calls; fixed by adding a
  third `targets` entry, then removing native). `testimonial` also had native removed as part of
  the Task 4 hard-case work. **Remaining holdouts: `counter` and `quote`** — D972 already
  classified both as false alarms (each mechanism governs a genuinely different element); verify
  that classification still holds before touching either, don't assume it's stale.
- **A correction to the old prompt's Task 7, so you don't redo dead work:**
  `plugins/sgs-blocks/CLAUDE.md:814` was checked directly against the current
  `TypographyControls.js` and found to still be ACCURATE, not stale — the old prompt's claim was
  wrong. Do not touch that line.

## Task 6 — the still-pending canary deploy (carried forward, now larger in scope)

**Nothing from this entire typography track has been deployed to the sandybrown canary yet.**
Every commit above (`0e2f58cc2`, `8b67f5651`, `96bc9e734`, `f7cb3ba36`, plus `704bb4713` and a
handful of small fixes from concurrent sessions touching the same blocks) shipped with the
project's visual-diff pre-commit gate deliberately bypassed — disclosed each time
(`reports/visual-diff/manual-skips.log`), because this session had no live WP environment to
capture a before/after against. That is the deploy this task closes out.

1. **Deploy:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`
   — the ONE path (see root `CLAUDE.md` for why hand-rolled tar/scp is banned, D336).
2. **Live-verify, per R-31-13 (script measurement never closes alone — Bean's eye + Playwright
   DOM both required):**
   - The 7 link-colour blocks (Task 3 list above) — set a link colour + hover on each, confirm
     it paints only the linked text, not the surrounding copy.
   - `heading`/`label`/`text`'s font-size presets, decimal sizes, and the decoration dropdown
     (carried from the original prompt — still unverified).
   - At least 3 of the newly-full-control blocks from the mechanical pass — pick ones with a
     real visual property (letter-spacing, text-transform, writing-mode) and confirm the control
     actually changes the rendered page, not just the editor canvas.
   - `card-grid`'s title font-weight/style/line-height — confirm they now WORK (previously
     silently overridden by the native control that's now removed).
   - `icon-list`'s three typography targets (heading/item/text) — confirm each is independently
     controllable and none silently does nothing.
3. **If ANY control silently does nothing live:** do not assume it is a new bug before checking
   `scripts/audit-typography-attr-declarations.js --check` first — this is the exact failure
   class this session spent most of its length on, and the detector exists specifically to catch
   it before a live check is even needed.

## Task 7 — one remaining doc fix

Only one item survives from the old prompt's Task 7 (the other was checked and found not to be
stale — see "Already done" above):

- **`bf2c903ba` (the 2026-09-06 `TypographyControls` rebuild, +1033 lines) has no D-number.** It
  appears exactly once anywhere under `.claude/` — as backstory inside an unrelated crash
  writeup (D978-D981). Give it its own decision entry. In the same pass, fix
  `decisions.md`'s existing dead pointer to `2026-09-06-typography-full-replacement-next-session.md`
  (deleted in the `fd0b64d2b` prune) — point it at this track's commits instead
  (`0e2f58cc2`, `8b67f5651`, `96bc9e734`, `f7cb3ba36`), or remove the pointer if the surrounding
  paragraph reads fine without it.

## Guardrails (carried forward — do not skip)

- **D983 (2026-09-07): no PRs, no stashes, integrate after every task.** Commit directly to
  `main`, path-scoped.
- **NEVER `git stash` on this shared tree. NEVER `git checkout --` a file.** Both have destroyed
  peer sessions' uncommitted work here.
- **Path-scope every commit** — the pre-commit gate refuses a bare `git commit`. No globs.
- **Re-check `git branch --show-current` in the same command as the commit.**
- **Never fabricate a live-verification PASS against a stale target.** If the canary doesn't
  carry the code, say so and deploy first — this is the whole point of Task 6.
- **Never write a parking.md entry without asking Bean first — every time, no exceptions.**
- **Spec 32:** no SGS block renders an inline `style=` property declaration.
- **No version bumps, no deprecations** — pre-production (Bean D293).
- **A subagent must never commit on its own.** If dispatching parallel agents for the live-check
  work, their brief must say explicitly: report findings back, do not `git commit` yourself —
  this session already caught one subagent doing exactly that (harmless in content, but a real
  process risk on a tree this many sessions share).

## Tools

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --only 45-typography-full-replacement` | Native-typography holdout count |
| `node plugins/sgs-blocks/scripts/migrate-typography-full-controls.js --check` | Confirms every in-scope block still carries the full control set |
| `node plugins/sgs-blocks/scripts/audit-typography-attr-declarations.js --check` | Confirms every `show*`-enabled attribute is declared in block.json — run this BEFORE assuming a "silently does nothing" report is a new bug |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The ONE deploy path (Task 6) |
| Playwright MCP | Live DOM verification, Task 6 |

## Skills and agents

| Route to | When |
|---|---|
| `/autopilot` | Always, first |
| `wp-sgs-developer` | All SGS block work |
| `/visual-qa` | Task 6's live verification pass |
| `/dispatching-parallel-agents` | Splitting Task 6's per-block checks across independent blocks |
| `/capture-lesson` | If Task 6 finds a live bug this session's build gates should have caught but didn't |

## Hand back, don't improvise, if:

- Task 6 finds a control that silently does nothing live AND the attribute-declaration detector
  says it's fine — that is a genuinely new gap this session's fixes did not anticipate, worth a
  conversation about the detector's own coverage before patching around it.
- Counter or quote's native-typography classification (D972 false alarm) does not hold up on a
  fresh read — that changes Task 5's remaining scope and is worth flagging, not silently fixing.
