---
doc_type: plan
date: 2026-08-21
status: OPEN — not blocked, pick up any time
---

# Cleanup track — comment-narrative trim, ~70 files remaining

**Not blocked and not parked.** Straightforward work anyone can pick up in any session. The 20
densest files are done (~370 lines removed); ~70 files still carry change-narrative comments,
averaging ~9 lines each.

## Why this exists

Comments here should explain what the code DOES. This project never deprecates, and git plus
`decisions.md` already hold the history, so prior-state narrative in a source file earns nothing
and costs reading. Bean's framing, 2026-08-21: *"they explain changes instead of explaining
functionality… we're not deprecating the files so there's no need to know what it used to be."*

## Run the detector first — never pick a target by eye

    python plugins/sgs-blocks/scripts/extract-comment-narrative.py --survey --top 40
    python plugins/sgs-blocks/scripts/extract-comment-narrative.py --extract --only <slug>

`--survey` ranks by narrative DENSITY, not file size — `nav-menu/render.php` is 1,758 lines but
half documentation, a worse target than a dense 560-line file. `--extract` prints candidate
blocks with exact line ranges, so an agent reads ~200 lines instead of opening a 1,700-line file.

## The rule

| Cut | Keep |
|---|---|
| prior-state narrative ("previously emitted", "the old approach", "was wrongly X") | every sentence describing CURRENT behaviour |
| session chatter ("corrected 2026-08-13", "Task 1b", "this session") | the bare D-number / FR anchor as provenance |
| autopsies of retired attributes | WCAG, security and performance rationale |
| restatements of a diff git already holds | rationale justifying a magic number still in the code |

⛔ **KEEP EVERY PROHIBITION** and its reason — `do NOT`, `never`, `must not`, `⛔`. If the reason
is historical, keep the prohibition AND the reason; drop only the surrounding narrative.

⚠ **The split is SENTENCE-level inside a comment block, not block-level.** Measured on a pilot:
**73% of removable lines carry no detectable marker at all** — they are continuation lines of a
paragraph whose first line had one. This is why the job cannot be scripted, and why haiku is the
wrong model for it: a wrong cut silently deletes knowledge and is irreversible.

## Non-negotiables

- **Comment lines only.** Not one executable line, not even whitespace.
- **Preserve LF.** A pilot agent flipped two files to CRLF and it had to be undone. Verify with
  `file <path>` after editing.
- **`php -l` every file.**
- **Compare phpcs against HEAD per file.** Removing comments can make consecutive assignments
  contiguous and trip an alignment sniff. ⛔ Fix it by reinstating a BLANK LINE — the comment was
  acting as a group separator — never by realigning assignments, and never with `phpcbf`, which
  aligns the whole file and turns a comment-only change into a 68/84-line executable diff.
- **Commit by EXACT filenames.** A `src/blocks/*/render.php` glob satisfies the path-scoped-commit
  hook while behaving exactly like `git add -A`; it broke `main` for five minutes on 2026-08-21.
- **Verify per file:** `git diff -- <f> | grep -E '^[+-]' | grep -v '^[+-][+-]'` — every line must
  be a comment. `check-markup-neutral.py <slug>` should report NEUTRAL.

## The real prize is not the lines

**Three of the first twenty files contained comments stating the OPPOSITE of their own code** —
`nav-menu` claimed submenus and mega panels were unbuilt while rendering both, and named a
wrapper mechanism it stopped using at D539; `responsive-logo` claimed an inline declaration that
D345 had moved into scoped CSS. Report contradictions with evidence; do NOT fix facts
unilaterally, and never prove one by a grep that finds nothing — that failure is itself recorded
in `nav-menu`'s own comments.

## Two small items owed here

1. `card-grid/render.php` has a duplicated `$hover_bg_gradient` assignment (pre-existing at HEAD,
   dead — the second overwrites the first with the same value). One-line delete, executable.
2. `generated-fx-qualifying-blocks.php` is dead at runtime — nothing `require`s it, its function
   has zero callers, and Spec 38 recommends deletion. ⛔ But it REGENERATES on every build, so
   deleting the file alone achieves nothing; the generator must stop emitting it. Its sibling
   `generated-fx-qualifying-blocks.json` IS live (imported by `extensions/fx.js:49`) and stays.
