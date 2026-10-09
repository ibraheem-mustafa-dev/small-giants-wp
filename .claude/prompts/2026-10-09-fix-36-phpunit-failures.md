Invoke /autopilot before doing anything else.

# Fix the 36 failing PHPUnit tests on main (SGS blocks)

## Context
On `main` (at or after `bf9e9d426`, 2026-10-09) `cd plugins/sgs-blocks && vendor/bin/phpunit` has 36 failures, all
missing CSS declarations, in two test classes:

| Test | Data sets failing | What is missing |
|---|---|---|
| `tests/php/BorderElementParityTest.php::test_border_css_declaration_sets_are_unchanged` | post-grid 10, countdown-timer 9, table-of-contents 9, cart[pill] 7 | Whole selectors GONE from the printed CSS, e.g. post-grid `a_baseline`: `.sgs-post-grid__readmore` and `.sgs-post-grid__title a` with `color:var(--wp--preset--color--primary,currentColor)` |
| `tests/php/GoogleReviewsAttrsTest.php::test_each_attribute_group_emits_its_scoped_css` | `header` (1) | `.sgs-google-reviews__aggregate` lacks `border-bottom-color:#E8EAED` |

Proven so far: none of these block folders has uncommitted edits in the shared tree, and the icon-list commit
`58ccb5621` (which surfaced the count) touches none of them. Not proven: the cause. One shared mechanism is likely,
because every failure is a colour or border declaration that stopped printing across five unrelated blocks. Candidates
to test, not conclusions: the `sgs/cta-section` removal (`1b560c4b5`), `273d2367e` (social-icons rebuild), today's
colour, border or link-helper changes, or a minifier/CSS-registry change. Read `git log --since=2026-10-07 -- plugins/sgs-blocks/includes`
and the failing blocks' render.php history first.

## Task
1. Reproduce: run the two classes (`vendor/bin/phpunit --filter 'BorderElementParityTest|GoogleReviewsAttrsTest'`) and
   record the 36 failures per block and data set.
2. Find the commit that introduced them, by evidence. Read the diffs of the candidate commits first. If you need to
   bisect, never switch branches or check out old commits in the shared tree (other sessions have uncommitted work
   there): make a detached worktree (`git worktree add --detach C:\wt\phpunit-bisect <commit>`), copy (not junction)
   `plugins/sgs-blocks/vendor` into it, run the filter there, and remove the worktree when done (leave it before removing).
3. Decide, with proof, which it is:
   - a **regression** (the declarations should still print): fix the code at its root, for every block the mechanism
     reaches, and check the live output on the canary for one affected block; or
   - an **intended change** (the test's frozen snapshot is out of date): show the commit or spec that intended it, check
     the rendered result is still correct, then update the snapshot through the test's own regeneration path, never by
     hand-editing expected values.
   Mixed cases are possible: decide per block family.
4. The rest of the suite must stay green: run the full `vendor/bin/phpunit`, `node scripts/audit-inline-styling.js --check`
   and `python scripts/run-gates.py --tier fast` from `plugins/sgs-blocks`.
5. If the fix is a regression fix in code, deploy with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`
   (message peers first with ListAgents/SendMessage) and verify one affected block live at 375/768/1440.

## Skills (invoke at the point of use)
| Skill | When |
|---|---|
| `/autopilot` | First action |
| `/systematic-debugging` | Before proposing any cause; the iron law is prove the cause before the fix |
| `/sgs-wp-engine` | Before touching any block, helper or CSS-emission code (colour emission and block authoring rules load from `.claude/rules/` by path) |
| `/sgs-db` | If you need which blocks share an attribute or helper (`block_attributes`, `css_property`, `css_element`) |
| `/wp-block-development` | Only for core block-API questions |
| `/qc-council` | If the cause is unproven after step 2, or the fix touches a shared helper used by many blocks |
| `/wp-sgs-deploy` | Ceremony for the deploy in step 5 |
| `/handoff` | Close the session |

## Tools
| Tool | Use |
|---|---|
| Bash / PowerShell | phpunit, git, gates; `npm run build` from PowerShell only (the nvm shim is broken in Git Bash) |
| Grep / Glob | Find every caller of a changed helper before fixing (fix the pattern everywhere) |
| Playwright (or the repo's live-probe scripts) | Live computed-style check on the canary after a deploy |
| ListAgents / SendMessage | Message peers before a deploy or anything that touches shared state |

## Research approach
1. `git log --since=2026-10-07 --stat -- plugins/sgs-blocks/includes plugins/sgs-blocks/src/blocks/{post-grid,countdown-timer,table-of-contents,cart,google-reviews}`.
2. Read each failing block's CSS emission path (render.php to the helper that prints the scoped CSS) and find the shared
   function. A missing selector usually means the helper now skips it: find the condition.
3. Read the test's snapshot source to learn how its expected sets are produced and regenerated.
4. Compare the same block's printed CSS before and after the suspect commit in the detached worktree.

## Rules that bind this work
- Commit straight to `main` with explicit pathspecs: `git branch --show-current && git commit -m "..." -- <paths>`; never
  `git add -A`, never stash. Push only through the guard: `[ -z "$(git log origin/main..main --format='%h' | grep -v -e <your hashes>)" ] && git push`.
- No inline `style="…"` from any block (Spec 32). Never `--no-verify`; a gate bypass needs `[gates-ok:<reason>]` and must
  be genuinely pre-existing.
- Code comments describe current behaviour; history goes in the commit message. UK English.

## Done when
`vendor/bin/phpunit` shows 0 failures; the cause is named with the commit and the code path; any snapshot update cites the
commit or spec that intended it; gates green; if code changed, the canary shows the affected block's colour or border
again. Delete this prompt file when you start (it is single-use).
