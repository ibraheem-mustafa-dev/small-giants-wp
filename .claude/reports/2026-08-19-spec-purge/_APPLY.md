# Phase 3 — APPLY contract

Phase 1 produced a register of every proposed edit. Bean approved. You now APPLY your own
register's rows to your own spec files. This is the editing phase.

## The one hard rule

**You are the ONLY writer for your assigned spec files.** Other agents are editing other specs
concurrently. Never open, edit, stage, checkout, stash, or otherwise touch a spec that is not on
your list. Never stage with a broad `-A`/`--all` pathspec. Never run a cleanup, reset, or "tidy"
step. If a command would touch a file outside your list, do not run it.

## What to apply

Work from your register file (named in your dispatch). For each row:

- **CUT rules (C1-C6)** — make the deletion exactly as the row's `AFTER` states. If `AFTER` is
  `DELETE`, remove the text. If `AFTER` carries replacement text, use it verbatim.
- **CONDENSE rules (K1-K6)** — replace the `BEFORE` span with the row's `AFTER` text, verbatim.
- **EXCLUDE** — do nothing. These are logged so the verification gate can tell "deliberately
  kept" from "missed". Touching one is a defect.
- **ESCALATE** — see below.

**Apply only what your register contains.** If you spot something new mid-apply that clearly
should have been registered, do NOT fix it silently — finish your approved rows, then report it
in your summary. A discovery is a Phase-4 item, not a licence to freelance.

## ESCALATE rows

All six escalations were resolved against the code by the dispatcher. The resolutions, with
evidence, are in `ESCALATIONS-RESOLVED.md` in this directory. If your dispatch says you own one,
**read that file's section for your site and apply the "Apply:" instruction in it.** Do not
re-derive the verdict; the evidence is already gathered and recorded.

## Editing discipline

- Preserve surrounding structure — heading levels, table pipes, list markers, blockquote `>`
  prefixes. A CONDENSE inside a table cell must stay a valid table cell.
- Preserve line endings. Do not reformat, re-wrap, or re-indent anything you are not changing.
  A diff whose line count changes by roughly the file's line count means the line endings were
  rewritten — that is a defect, not a cleanup.
- Do not renumber sections, FRs, or list items. If a row's edit would leave a dangling
  cross-reference (e.g. text elsewhere cites "must-fix #5"), keep the citation resolvable and
  say so in your summary.
- Never delete a whole FR, requirement, or numbered section unless a register row explicitly
  says so.

## When done

1. Re-read each file you edited around each edit site and confirm the result reads as clean
   present-tense prose — no orphaned "but", no half-sentence, no empty table row, no heading
   with nothing under it.
2. Run `git status --porcelain .claude/specs/` and confirm ONLY your assigned files appear.
3. Do NOT create any commit. The dispatcher handles that, one per spec.

Report: files edited, rows applied per rule, rows skipped and why, anything you discovered but
did not act on, and confirmation that the status check shows only your files.
