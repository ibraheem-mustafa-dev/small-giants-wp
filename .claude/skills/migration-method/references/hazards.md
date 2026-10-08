# Known hazards, each earned

Loaded from SKILL.md. Read before writing any codemod that writes files.

- **Never `open(path,'w')`: write atomically.** All three models truncate on open
  (`migrate-length-sanitiser.py`, `migrate-render-closures.py`, `migrate-tier-object.py`).
  This is the one place you must improve on them: **a truncated file passes `--check` GREEN**,
  because the scan skips files not containing the old symbol and an empty file does not
  contain it.
- **Scope the glob off `__file__`, never the repo root.** A repo-root `**/render.php` sweep hits more
  files in `.claude/worktrees/` (another live track's) and gate fixtures than real ones. Exclude
  `.claude/worktrees/`, `node_modules/`, `build/`, `vendor/`, `scripts/**/fixtures/`.
- **Read AND write with `newline=''`, never `errors='ignore'`.** Without `newline=''` on the
  read, Python translates CRLF to `\n`; writing back rewrites every line ending and your
  3-line change becomes an unreviewable whole-file diff. The tell: changed-line count equals
  file length. `migrate-length-sanitiser.py` is correct; `migrate-render-closures.py` is the bug.
- **A JSON round-trip silently reformats the whole file.** Same tell (changed-line count ≈ file
  length), different cause: `json.load` then `json.dump(indent=2)` on a TAB-indented file
  (`package.json`) rewrites every line. Insert into the TEXT, or match the file's existing indent.
- **Aligned assignment breaks literal find-and-replace.** `$sgs_css_keyword  = static
  function` with two spaces: a literal replace skips it silently.
- **`} else {` is brace-neutral.** Depth-counting sails past it to the wrong closing brace.
  Detect the close structurally, and refuse rather than guess.
- **A function call can precede the require that DEFINES it: valid syntax, fatal at runtime (D976).** `php -l` cannot catch it. When a codemod inserts a call to a shared helper, require the defining file inline at the insertion point, or verify by LINE NUMBER that the existing require precedes it; copy `check_load_order()` from `check-render-tier-object-spacing.py`.
- **A comment naming a function or attribute reads as a real reference to a naive regex.**
  **Strip `/* */` and `//` comments (preserving newlines, so line numbers stay correct) BEFORE any
  line-based or regex-based detector**, in a permanent guard's scan as well as a codemod's `classify()`.
- **A per-line quote check cannot see a multi-line string.** A PHP heredoc/nowdoc body or a
  JS template literal spanning lines classifies as `call` and gets silently rewritten. Strip
  those bodies before classifying, or refuse any file containing one.
- **Do not copy `migrate-tier-object.py`'s hand-rolled `self_test`** (about 29% of the file).
  Use the fixture pattern from `migrate-length-sanitiser.py`.
- **Where a genuine judgement call remains, the detector still ships.** Its census becomes
  the dispatch manifest: one batched pass over a classified list, never a discovery walk.
- **Never run `phpcbf`** to fix alignment. It reformats whole files and turns a scoped change
  into an unreviewable diff. Realign by hand, or leave a blank line.
- **A census that OVER-promises costs a whole task; one that under-counts costs a
  re-measure.** Bias every classifier conservative.
- **Derive every figure by enumeration and re-run the command; never copy a number from this
  document.** A census count written in prose is a copy that rots.
