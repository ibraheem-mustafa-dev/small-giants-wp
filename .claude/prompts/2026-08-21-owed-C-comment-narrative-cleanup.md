# Session prompt C — comment-narrative cleanup, ~70 files

Paste this whole file into a fresh session.

---

Invoke `/autopilot` before doing anything else.

**Plan label:** `[PLAN: sonnet]` — the design is settled, this is execution.
**USP:** the codebase's comments narrate CHANGES instead of explaining FUNCTION. Since nothing is
ever deprecated here, "what it used to be" earns nothing that git does not already hold. The 20
densest files are done. **The real prize is not the lines: three of those first twenty contained
comments asserting the OPPOSITE of their own code.**

## Read first (cold entry)

1. `.claude/plans/2026-08-21-comment-narrative-cleanup-track.md` — the full rules. **Read it; this
   prompt is the execution wrapper, that file is the contract.**
2. `plugins/sgs-blocks/scripts/extract-comment-narrative.py` — the detector. Never pick a target
   by eye.
3. `.claude/LEDGER.md` — check which tracks are live before touching any file.

## The rule in one line

Comments explain what the code DOES, never what it used to do. Keep current behaviour, D/FR
anchors, WCAG and security rationale, magic-number justifications, and **every prohibition**.

**⛔ The split is SENTENCE-level inside a comment block.** Measured on a pilot: **73% of removable
lines carry no marker at all** — they are continuation lines of a paragraph whose first line had
one. This is why the job cannot be scripted and why haiku is the wrong model: a wrong cut deletes
knowledge silently and irreversibly.

---

## PHASE 0 — pick the batches, inline — `[SESSION-START]`

**Model:** inline · **Time:** 10 min · **Exec:** SEQUENTIAL · **Deps:** none

Run the detector and decide the batches. That is the whole phase — no design is needed, it was
settled on 2026-08-21.

```
cd plugins/sgs-blocks
PYTHONIOENCODING=utf-8 python scripts/extract-comment-narrative.py --survey --top 40
```

**Decide:** take the top ~20 by candidate lines, split into 3–4 disjoint batches of 5–7 files,
balanced by candidate-line count rather than file count. Check `git status` and `git log
--oneline -5` first and exclude anything another track is holding.

**Outcome:** 3–4 named batches, no file in two batches.
**Test — Happy:** every batch file appears exactly once across all batches.
**Edge:** a file already at zero candidates is dropped, not dispatched.
**Fail:** if another track is mid-commit, wait or pick different blocks. Never share a file.
**Integration:** the batches become the agent dispatches verbatim.

---

## PHASE 1 — dispatch the batches — `[SESSION-START]`

**Model:** sonnet, one agent per batch, **PARALLEL** (disjoint files make this safe)
**Time:** 45 min · **Deps:** Phase 0
**Files:** per batch, named explicitly

Give every agent this brief, changing only the file list:

> Trim CHANGE-NARRATIVE from comments in these files: `<list>`.
> Start by running `python scripts/extract-comment-narrative.py --extract --only <slug>` for each —
> it prints candidate blocks with exact line ranges, so read ~200 lines of candidates rather than
> opening a 1,700-line file.
> CUT prior-state narrative ("previously emitted", "the old approach", "was wrongly X"), session
> chatter ("corrected 2026-08-13", "Task 1b", "this session"), autopsies of retired attributes,
> and restatements of a diff git already holds.
> KEEP every sentence describing current behaviour, the bare D-number / FR anchor, WCAG, security
> and performance rationale, and any rationale justifying a magic number still in the code.
> ⛔ KEEP EVERY PROHIBITION and its reason — do NOT, never, must not, ⛔. If the reason is
> historical, keep the prohibition AND the reason; drop only the surrounding narrative.
> The split is SENTENCE-level inside a block — never delete a whole block wholesale.
> ⚠ ALSO REPORT any comment that CONTRADICTS the code, with evidence. Do NOT fix facts yourself.
> Proving a fact needs the code, not a grep that finds nothing.
> CLASSIFY every prohibition: GATE-BACKED (the prose names a real executable check — compress to a
> pointer), UNENFORCED (nothing checks it — keep verbatim and report; a STOP-catalogue reference
> is prose, not a gate), or STALE (report, never delete).
> HARD CONSTRAINTS: comment lines only, not one executable line, not even whitespace · preserve LF
> and verify with `file <path>` · no git add / commit / stash, no build, no deploy · `php -l` each
> file · self-verify with `git diff -- <f> | grep -E '^[+-]' | grep -v '^[+-][+-]'` — every line
> must be a comment · if removing comments makes assignments contiguous and phpcs wants them
> realigned, do NOT fix it, REPORT it.

**On-fail:** revert that batch's files only; batches are disjoint so the others stand.
**Cold-entry:** the batch list plus the cleanup-track plan doc
**Test — Happy:** every agent reports zero non-comment lines changed.
**Edge:** a file with only block-specific prose is correctly left untouched — that is a keep case,
not a miss. **Fail:** any CRLF flip, any executable line — revert that file.
**Integration:** all files still `php -l` clean.

## QA Gate 1 — verify before committing anything

**Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Phase 1
**Check, per file:**
```
git diff -- <f> | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*(//|\*|/\*|\*/|#)'
file <f> | grep -c CRLF
php -l <f>
python plugins/sgs-blocks/scripts/check-markup-neutral.py <slug>
```
**Pass:** first returns nothing, second returns 0, third is clean, fourth says NEUTRAL.
**Also:** compare phpcs to HEAD per file. If a file gained an alignment warning, reinstate a BLANK
LINE where the comment used to sit — the comment was acting as a group separator. **Never realign
assignments and never run `phpcbf`** (it aligns the whole file and turns a comment-only change
into a large executable diff).
**Fail:** revert that file and re-dispatch it alone.

## PHASE 2 — build, commit, push — `[HANDOFF]`

**Model:** inline · **Time:** 20 min · **Deps:** QA Gate 1
**Action:** `npm run build` (the full ~55-gate chain), then commit **by exact filenames**.
⛔ A `src/blocks/*/render.php` glob satisfies the path-scoped-commit hook and behaves exactly like
`git add -A` — it broke `main` for five minutes on 2026-08-21. Enumerate every path.
Comment-only batches pass `check-markup-neutral.py` unaided and need no visual-gate bypass.
**On-fail:** if the build fails, revert / rebuild / re-apply / rebuild before blaming your change.
A transient failure was misattributed on 2026-08-21 because that four-step test was not run.
**Test — Happy:** build exits 0, commit lands, push succeeds.
**Edge:** if `check-dead-controls` findings shift, that is expected — it counts raw text
occurrences INCLUDING comments. Re-baseline ONCE after the whole batch, never mid-batch.
**Fail:** any non-comment line in the final diff — stop and revert.
**Integration:** `git log --oneline -1` plus a clean `git status`.

## PHASE 3 — the two small owed items (optional, only if time) — `[HANDOFF]`

**Model:** sonnet · **Time:** 30 min · **Deps:** Phase 2 pushed
These are executable changes and must NOT ride in a comment-only commit.
1. ~~`card-grid/render.php` duplicated `$hover_bg_gradient` assignment.~~ **NO LONGER OWED —
   verified 2026-08-22.** Fixed by `a9ea9b8f`; one assignment remains at `render.php:65`. Do not
   dispatch it. See the track doc for the corrected entry.
2. `generated-fx-qualifying-blocks.php` is dead at runtime — nothing requires it, its function has
   zero callers, Spec 38 recommends deletion. ⛔ It REGENERATES on every build, so deleting the
   file alone achieves nothing; the generator must stop emitting it. Its sibling
   `generated-fx-qualifying-blocks.json` IS live (imported by `extensions/fx.js:49`) and stays.
**Test:** build green; the PHP file does not reappear after a full build.

---

## Key Judgement Calls

- **Batch size** — recommend 5–7 files per agent. Cost of wrong choice: an agent that runs long
  and returns a diff too large to review carefully.
- **Parallel vs sequential** — recommend PARALLEL, since batches are disjoint by construction and
  no agent commits. Cost of wrong choice: none, provided Phase 0's disjointness check was done.
- **What to do with a contradiction** — report, never fix unilaterally. Cost of wrong choice: an
  agent "corrects" a comment to match code it misread, and the doc gets worse while looking better.

## Pre-emptive decisions, so nothing pauses mid-execution

- **"This file has almost nothing to cut."** Fine. Report it and move on. Conservative is correct;
  the pilot removed only 14% of candidate lines and that was the right call.
- **"Is this sentence history or function?"** If it might be function, KEEP it. Deleting knowledge
  is far worse than leaving a redundant line.
- **"A comment names a gate — should I keep the whole paragraph?"** No. Compress it to a pointer
  naming the gate. The gate is the defence; the prose is a copy that can rot.
- **"Should anything here go to parking?"** No. Bean's rule: parking is for BLOCKED or POSTPONED
  work only, and never without asking him first.
