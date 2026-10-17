Generate a session handoff: bring every relevant doc up to current truth, clear out what's finished, commit, push, then paste the next session's prompt.

## Audience

The next session starts cold with no conversation history. Everything written here must let it resume immediately: full file paths, no "as discussed", every term a fresh session won't know re-grounded in one plain-English phrase. Don't duplicate what CLAUDE.md already says, and don't write vague notes ("consider improving X").

## The model

One home per job:

- **Rules** live in CLAUDE.md files and path-scoped rules. Change them only if the session changed a convention.
- **What must be built** lives in specs. **How, in what order, and what's deferred** lives in plans.
- **Current status** lives in the project's `LEDGER.md`: short status notes per front, no orchestration, never appended.
- **The next session's instructions** are the prompt pasted at the end of this handoff. They are not written into LEDGER or a file.
- **Why** something was decided is stated in the doc it changes and in the commit message.
- **History** is git. Docs state current truth only: replace stale text with the replacement, never add "retired/superseded" notes, leave no hanging references.

Every item carried forward (a blocker, guardrail, next step or deferred item) names the task it serves, and is deleted when that task is done.

## Where it runs

`$ARGUMENTS` picks the mode:

- **(empty): split, the default.** The local session does Step 1, sends Steps 2 to 9 to a cloud session, and stops. Steps 2 to 9 are the expensive part (finding, reading and reconciling docs) and need only GitHub, so they run on Bean's separate cloud credits while the local session is free.
- **`local`:** run every step here. Use it when the session changed no code and at most one doc, when `claude --cloud` is unavailable, or when Bean wants the next-session prompt in this terminal straight away.
- **`land <branch>`:** finish a cloud handoff (see "Landing a cloud handoff" at the end).
- **`cloud <brief-path>`:** you are the cloud session. Read the brief, treat it as Step 1, run Steps 2 to 9 and the Output, then the cloud part of Step 10.

### Split mode, local part

1. Run Step 1 below.
2. Commit and push the session's own work to `main` (Step 10 rules: explicit pathspec, `git branch --show-current` in the same command), so the cloud session starts from it.
3. Write the Step 1 result to `.claude/prompts/<YYYY-MM-DD>-handoff-brief.md`: the tasks and their intended outcomes, this session's commit hashes, the findings (including ones where no file changed), branch and HEAD, build and test results, what is deployed where and whether it matches `main`, and any uncommitted files with the reason. Write it for a reader with no access to this conversation. Commit and push it.
4. Start the cloud session from Bash: `claude --cloud "/handoff cloud .claude/prompts/<file>"`. If slash commands do not run in the cloud session, send instead: "Read .claude/commands/handoff.md and follow it in `cloud` mode with brief .claude/prompts/<file>." Note the session id it prints.
5. Tell Bean in two lines: the cloud session id, that its close-out and next-session prompt will appear in that session in the Claude app, and that `/handoff land <branch>` merges its result.

### Split mode, cloud part

You have GitHub only: no SSH, no framework DB, no `.claude/secrets/`, no `node_modules`, nothing from `~/.claude`, and no way to message the local session. So:

- Take Step 1 from the brief; do not re-derive it. Where the brief says what is deployed, trust it; you cannot check a live site.
- Run Steps 2 to 9 as written. Step 8's independent check runs here as a subagent.
- The preflight's memory check passes vacuously here (there is no `MEMORY.md` in the cloud); the landing step re-runs it locally.
- Step 10, cloud part: commit by explicit pathspec to this session's own branch, delete the brief file in the same commit (prompt files are single-use), and push. Do not push to `main`; the landing step does that.
- End with the Output as specified, with one extra first line: `Land with: /handoff land <this session's branch>`. It appears in this cloud session, where Bean reads it.

## Step 1: Establish what the session did and where things stand

Gather these first, because every later step depends on them:
- **Tasks**: each task worked on, and the outcome it was meant to achieve.
- **Commits**: on a shared worktree `git log --since` mixes in other sessions, so take this session's hashes from the conversation, then `git show --stat` each one.
- **Findings**: anything verified, disproved or discovered, even where no file changed (e.g. "the spec's claim X is wrong", "task Y was already done").
- **State**:
  - branch and HEAD hash
  - build status and test results (run the project's test or fast-gate command if unsure)
  - deploy status (what is live where, and whether it matches `main`)
  - any of this session's files left uncommitted, and why

## Step 2: Find every relevant doc, not just the touched ones

A doc can need updating without being opened this session. Examples: a plan's task gets completed as a side effect of other work, or a detailed plan is worked from without reading the spec behind it. Build the candidate list from all five sources:

1. **Changed**: every doc the session's commits touched.
2. **Governing**: for every `LEDGER.md` front the session worked on, its plan and spec. For every plan in the list, the spec(s) it implements.
3. **Referencing**: grep the live `plans/` and `specs/` (not `archive/`) for what the session changed: file paths, block slugs, function/class names, script names, spec and FR IDs. Any hit is a candidate. This is what catches indirectly completed tasks.
4. **Open tasks**: in every active plan hit by 2 or 3, each unchecked task whose scope overlaps what shipped.
5. **Standing docs**, included only if the session changed what they describe (a new script, gate, table, file layout, deploy step or convention):
   - `architecture.md` and `dev-setup.md`
   - the specs roster (`specs/README.md`)
   - CLAUDE.md files, including a plugin's own

## Step 3: Reconcile each candidate

For each candidate, read the relevant section, not the whole file, and fix:
- **Progress, both directions**: shipped steps and FRs marked done; nothing unbuilt marked done; steps discovered mid-session added. When every step of a plan is done, move it to `plans/archive/` and repoint its links.
- **Doc vs implementation**: where the code now differs from what the spec or plan says, correct the doc (or, if the code is wrong, record it as deferred work in Step 5).
- **Numbers**: any count, version or "X of Y" the session affected, checked against the live source (DB or code). Prefer deleting a cached count to updating it.
- **Stale text**: replace it with current truth and fix every reference to it.

**Small changes** (marking steps done, correcting a claim, adding a discovered step): make them directly. **Large changes** (a new direction, changed scope, an abandoned phase): make no edit. Put them in front of Bean in the output and let him decide.

Record a verdict per candidate: **updated** (one line on what) or **checked, no change**. This list goes in the output, so a missed doc is visible.

## Step 4: Outcome check

For each task from Step 1, state one:
- **Outcome achieved**: the measurable goal was hit. For spec'd work the outcome is the spec's full scope for that surface, not the increment that shipped.
- **Code shipped, outcome not yet hit**: name the gap (current state vs target). It goes into the plan and the next-session prompt.
- **Outcome revised**: name the new outcome and why.

Never count "code shipped" as "done", and never label spec'd work "out of scope": name the spec stage or plan phase that owns it.

## Step 5: Record deferred work in its plan

Anything started but unfinished, identified but unstarted, or found wrong in Step 3 goes into the plan or spec section it belongs to. Write residual scope only, with enough detail to resume cold.

## Step 6: Clear out what's finished

Carrying forward is only safe if clearing out is just as strict. In this session's front of `LEDGER.md`, and in the plans touched in Steps 3 and 5, delete every:
- blocker that is resolved,
- guardrail or warning whose task is done,
- next step or deferred item that shipped or turned out wrong,
- note that only records history (git holds that).

Anything still true stays. Anything whose task you can't name also goes: an item with no task behind it is how stale docs build up.

**Used prompt files:** delete (`git rm`) any file in `.claude/prompts/` that this session was started from or has now fulfilled. Prompt files are single-use.

## Step 7: Update LEDGER.md (status only)

Re-read `LEDGER.md` and `git diff` it immediately before writing, because parallel sessions edit it too. Edit only this session's front(s) and never touch another front.

A front holds brief status notes only:
- the actual state in plain English, with branch/hash, build, deploy
- open blockers, each naming the task it blocks
- a pointer to the governing plan (and the section to resume from)

No orchestration, no next-session prompt, no task lists: those live in the plan and in the pasted prompt.

## Step 8: Independent check

Skip this step only if the session changed no code and at most one doc. Otherwise dispatch one subagent (never self-review in the main thread), routed with `/delegate` (`--task-shape qc_review --original-model inline`, which returns a cold Sonnet at medium effort), with the three `/delegate` brief lines and:
- the Step 1 summary and commit hashes,
- the Step 2 candidate list with verdicts,
- `git diff` of every doc changed in Steps 3 to 7.

Its brief:
1. Grep the live plans and specs for anything this session's changes affect that is missing from the candidate list.
2. For each updated doc, confirm progress marks, claims and numbers match the commits.
3. Confirm the clear-out: no finished item survives in this front or the touched plans, and every surviving item names its task.
4. Confirm the used prompt files are gone.

It should report findings only. Fix each finding, then re-run the check once if the fixes were substantive.

## Step 9: Preflight

If the project has a handoff preflight (small-giants-wp: `python .claude/hooks/handoff-preflight.py --check`), run it. Treat a failure as blocking: fix it and re-run.

## Step 10: Commit, push, land on main

Per `~/.claude/rules/git-hygiene.md`:
1. Commit straight to `main`, checking `git branch --show-current` in the same command.
2. Use an explicit pathspec: never `git add -A`, never a glob, never a stash. Commit the session's work, the doc updates and the prompt-file deletions together.
3. **If the session ended up on a branch:**
   - squash-merge it into `main` and push `main`
   - delete the branch locally and on the remote

   The handoff always ends with `main` carrying the session's work.
4. Integrate with `origin/main` and push. No PRs.

## Landing a cloud handoff

Run in the local session as `/handoff land <branch>` once the cloud session has finished.

1. `git fetch origin <branch> main`, then read its commits (`git log --oneline origin/main..origin/<branch>`) and the diff stat, and confirm it touches only docs, plans, specs, LEDGER and prompt files.
2. Merge it into `main` with the Step 10 rules: squash-merge, explicit check of `git branch --show-current` in the same command. If `LEDGER.md` conflicts because another session changed it meanwhile, keep the other session's fronts and take the cloud branch's version of this session's front only.
3. Run the preflight locally (`python .claude/hooks/handoff-preflight.py --check`), which also checks the memory index the cloud could not see. Fix any failure and commit the fix.
4. Push `main`, then delete the branch locally and on the remote.
5. Tell Bean in one line: landed at `<hash>`, preflight result.

## Output

First, a short close-out:
- **Docs:** the Step 2 candidate list with each verdict (updated: what / checked: no change).
- **For Bean to decide:** any large change from Step 3, or "none". Each one self-contained: what it is and why it matters in plain English, the options with their benefits and drawbacks, and your recommendation with why. Bean has not read the session.
- **Outcomes:** one line per task from Step 4.
- **Cleared:** what Step 6 deleted, and the prompt files removed.
- **Independent check:** findings and fixes, or "skipped: docs-only session".
- **Preflight result, branch, commit hash, pushed.**

Then, as the very last thing in the response, **the next-session prompt** in one fenced block, ready to paste into a fresh session. If the session produced more than one independent track, paste one block per track, each labelled.

Each prompt contains:
1. **First line:** `Invoke /autopilot before doing anything else.`
2. **Context:** where the work stands, in plain English, re-grounding any term a fresh session won't know.
3. **Read first:** the plan section and/or spec section, by full path.
4. **Tasks, in order.** For each one:
   - the task and the measurable outcome that means it's done (for spec'd work, the spec's full scope for that surface)
   - how to run it: inline, or delegated (subagent, model via `/delegate`, dispatch pattern, and the context a cold subagent won't have)
   - the skills, agents and MCP tools to use
   - what it depends on and what can run in parallel
   - the verification or QC step after it
   - the smallest plausible time estimate
5. **Guardrails:** commands to run and things that must not break for these tasks. Don't repeat CLAUDE.md.

The prompt is written only in the conversation, never to a file, unless Bean asks for one.
