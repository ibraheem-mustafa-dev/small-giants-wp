---
doc_type: plan
date: 2026-08-21
status: PARTIAL — all files reviewed; 31 trimmed files BLOCKED on a shared pre-commit gate
---

# Cleanup track — comment-narrative trim

## Status 2026-08-22 — every candidate file has now been REVIEWED

| | Files | Lines cut |
|---|---|---|
| Batch 1 (2026-08-21) | 21 | ~370 |
| Batch 2 (`ec8166e9`) | 23 | 131 |
| Batch 3 (pending commit) | 31 | 92 |
| **Reviewed, nothing to cut** | ~16 | — |

**No file remains unreviewed.** Roughly 593 lines of change-narrative removed across ~91 files.

⛔ **Batch 3's 31 files are verified but UNCOMMITTED**, blocked by `.githooks/pre-commit`, which
runs `db-consistency/run.py --check` unconditionally for any staged path under
`plugins/sgs-blocks/` and has **no bypass token**. The 4 violations are the colour-golden track's
— handed over in `.claude/reports/2026-08-22-handover-to-colour-golden-track.md`. The moment that
gate is green, stage the 31 files by exact filename and commit; they need no rework.

⚠ **Do NOT re-run `--survey` and conclude there is work left.** `nav-menu` (349) and `hero` (338)
still rank top because the detector counts CANDIDATES, and most candidates are legitimate keeps —
the realised removal rate is 11-14%. Both were trimmed in batch 1. Judge remaining work by the
table above, not by the survey's ranking.

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

## One small item owed here

~~1. `card-grid/render.php` duplicated `$hover_bg_gradient` assignment.~~ **✅ NO LONGER OWED —
verified 2026-08-22.** It was fixed by `a9ea9b8f` *"refactor(card-grid): hover colour via the
shared helper, two emit sites into one"*. At HEAD there is exactly one assignment
(`card-grid/render.php:65`). The claim above was true when written and stale a day later — the
same confident-wrongness this track exists to remove. **Do not dispatch it.**

2. `generated-fx-qualifying-blocks.php` is dead at runtime — re-proven 2026-08-22: zero
   `require`/`include` anywhere in PHP, and `sgs_get_fx_qualifying_blocks()` (its line 37) has zero
   callers, the only grep hit being its own declaration. Spec 38 recommends deletion. ⛔ But it
   REGENERATES on every build, so deleting the file alone achieves nothing; the generator must stop
   emitting it.

   ⚠ **Real paths — every path this entry originally gave was wrong:**
   - dead artefact: `plugins/sgs-blocks/includes/generated-fx-qualifying-blocks.php`
   - generator to change: `plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py` (emit
     described at its lines 292–301)
   - live sibling, **keep**: `plugins/sgs-blocks/src/blocks/extensions/generated-fx-qualifying-blocks.json`
   - its importer: `plugins/sgs-blocks/src/blocks/extensions/fx.js:49`

   ⛔ **Not a file delete — a 3-file change touching a build gate.**
   `scripts/db-consistency/check_fx_qualifying_blocks_stale.py` names the PHP file as a "PHP
   consumer" at its line 17. Read that script before editing the generator and update its header in
   the same commit.
