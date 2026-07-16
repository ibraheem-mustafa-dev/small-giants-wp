#!/usr/bin/env python3
r"""Repoint dangling `Spec 15` CITATIONS at the specs that actually own them.

WHY
---
`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` was DELETED (commit 202922c1).
Nothing repointed its inbound references, so ~290 citations across ~110 files name a spec
that does not exist. A dangling ref sends the next session hunting; a WRONG ref sends them
somewhere confidently wrong. So the mapping is derived from Spec 15's OWN recovered
headings, not guessed.

MAPPING (evidence, via `git show 202922c1^:.claude/specs/15-DETERMINISTIC-*.md`)
--------------------------------------------------------------------------------
Recovered headings prove Spec 15 WAS the converter spec:
    ## 3. Convention Layer   ### 3.1 SGS-BEM canonical class name format
                             ### 3.3 Canonical attribute decomposition template
    ## 5. Mapping Layer   ## 6. /sgs-update Unified Pipeline
    ## 7. Converter Pipeline   ## 8. Upstream Conditions   ## 9. QA Gates Summary

=> its direct successor is Spec 31 (31-UNIVERSAL-CLONING-PIPELINE.md), which CLAUDE.md
names the "Canonical cloning-pipeline spec". Spec 31 is therefore the DEFAULT, with two
exceptions verified against the target specs themselves:
  * SEC 3 / 3.1 / 8 / 8.1  (SGS-BEM class format; drafts must conform) -> Spec 00 SEC 3 / 3.1
      verified: 00-naming-conventions.md:52 "## 3. BEM CSS classes", :65 "### 3.1 BEM
      element -> block recognition (canonical signal)".
  * SEC 6  (/sgs-update unified pipeline) -> Spec 19 (19-SGS-CLI-COMMANDS.md owns the CLI).

NOT DONE, deliberately: inventing a target SECTION number. "Spec 15 SEC 3.3" becomes
"Spec 31", never "Spec 31 SEC 13.5" — I have not verified where decomposition landed. A
true-but-coarse pointer beats a precise lie.

TWO EXCLUSIONS THAT MATTER (both learned the hard way, 2026-07-15)
-----------------------------------------------------------------
1. THIS FILE. It lives under the scanned root and contains the literal it rewrites, so an
   unguarded run CORRUPTS ITS OWN RULES (they became no-op identity pairs) and its own
   docstring. Guarded by resolved-path compare below.
2. META-DOCS. handoff.md / decisions.md / next-session-prompt.md and the D338 register
   DISCUSS the abrogation ("Spec 15 is ABROGATED"). Rewriting those produces the sentence
   "Spec 31 is ABROGATED" — catastrophically false, since Spec 31 is the live cloning
   spec. Those files' mentions are the SUBJECT, not citations. Excluded by name.

SCOPE — deliberately `.claude/`, `plugins/sgs-blocks/scripts/`, `theme/`, `CLAUDE.md`.
A /qc pass (2026-07-15) correctly falsified an over-broad claim that "0 live Spec 15
citations remain outside archives/memory". They do remain, in two places, and BOTH are
deliberately out of scope — they are historical record, not live pointers:

  * `reports/2026-05-21-*.md` (12 files) — dated audit SNAPSHOTS. Rewriting a snapshot
    falsifies what the audit actually said on the day. Same logic as `archive/`.
  * `tools/recogniser-v2/` (2 files) — the legacy extract.py subprocess, documented as
    "permanently retired" in BOTH `cloning-pipeline-flow.md:81` and
    `cloning-pipeline-stages.md:289`. Dead code; its citations mislead nobody.

If either is ever revived, add its root above — do not widen the roots speculatively.
Archives (`specs/archive/`, `plans/archive/`, `memory/`) keep their original citations
for the same reason.

GAP TO KNOW (found by the same /qc): these RULES match the PHRASE "Spec 15" only, NOT a
FILENAME reference. `.claude/goals.md` cited the deleted spec as
`specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` and the sweep sailed past it (fixed by
hand). If a future spec is abrogated, match its FILENAME too, not just its number.

`02-SGS-BLOCKS-REFERENCE.md` is AUTO-GENERATED — its generator
(`scripts/generate-block-reference.py`) is in scope, so the fix survives `/sgs-update`.

Usage:  python plugins/sgs-blocks/scripts/fix-spec15-refs.py [--apply]   (default: dry run)
"""

import pathlib
import re
import sys

SELF = pathlib.Path(__file__).resolve()
REPO = SELF.parents[3]

SKIP_PARTS = {'archive', 'memory', '__pycache__', 'node_modules', '.git', 'build'}

# Files where "Spec 15" is the SUBJECT (the abrogation itself), not a citation.
SKIP_NAMES = {
    'handoff.md',
    'decisions.md',
    'next-session-prompt.md',
    '2026-07-15-header-footer-hardcoding-register.md',
}

# A filename allow-list was NOT ENOUGH and it shipped a live corruption: this script
# rewrote `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`'s sentence
#   'NOT "Spec 15" — Spec 15 is abrogated'   ->   'NOT "Spec 31" — Spec 31 is abrogated'
# and that reached a commit. Spec 31 is the LIVE canonical cloning spec, so the doc then
# told the next session the live spec was dead. The filename list only covered the meta
# docs; ANY doc may discuss the abrogation.
#
# The real predicate is SUBJECT-vs-CITATION, not which file it lives in. A line that
# TALKS ABOUT Spec 15 being dead must never be rewritten — rewriting it inverts its
# meaning. Skip the LINE, not the file, so genuine citations elsewhere in the same file
# are still fixed.
SUBJECT_MARKERS = (
    'abrogat',        # "Spec 15 is abrogated" / "abrogation"
    'does not exist',
    'deleted',
    'retired',
    'superseded',
    'NOT "Spec 15"',
    'no longer',
)


def is_subject_line(line: str) -> bool:
    """True when the line DISCUSSES Spec 15's abrogation rather than citing it."""
    if 'pec 15' not in line:
        return False
    low = line.lower()
    return any(m.lower() in low for m in SUBJECT_MARKERS)

SEC = '§'  # section sign, kept out of the literals below so this file is self-safe

RULES = [
    (re.compile(r'Spec 15 ' + SEC + r'8\.1'), 'Spec 00 ' + SEC + '3.1'),
    (re.compile(r'Spec 15 ' + SEC + r'8\b'), 'Spec 00 ' + SEC + '3'),
    (re.compile(r'Spec 15 ' + SEC + r'3\.1'), 'Spec 00 ' + SEC + '3.1'),
    (re.compile(r'Spec 15 ' + SEC + r'6\b'), 'Spec 19'),
    # every other cited section belongs to the converter itself -> Spec 31
    (re.compile(r'Spec 15 ' + SEC + r'[0-9]+(?:\.[0-9]+)*'), 'Spec 31'),
    (re.compile(r'Spec 15\b'), 'Spec 31'),
    (re.compile(r'spec 15\b'), 'Spec 31'),
]


def skip(path: pathlib.Path) -> bool:
    if path.resolve() == SELF:
        return True
    if path.name in SKIP_NAMES:
        return True
    return any(part in SKIP_PARTS for part in path.parts)


def main() -> int:
    apply = '--apply' in sys.argv
    targets = []
    for root in ('.claude', 'plugins/sgs-blocks/scripts', 'theme'):
        base = REPO / root
        if base.exists():
            targets += [p for p in base.rglob('*')
                        if p.is_file() and p.suffix in ('.md', '.py', '.js', '.php', '.json')
                        and not skip(p)]
    claude_md = REPO / 'CLAUDE.md'
    if claude_md.exists():
        targets.append(claude_md)

    total = touched = 0
    for p in targets:
        try:
            src = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError, OSError):
            continue
        if 'pec 15' not in src:
            continue
        # Rewrite line-by-line so a SUBJECT line (one that says Spec 15 is abrogated) is
        # left alone while genuine citations in the same file are still fixed. Rewriting
        # a subject line INVERTS its meaning — that is how this script published
        # "Spec 31 is abrogated" about the LIVE cloning spec.
        out_lines, n = [], 0
        for line in src.splitlines(keepends=True):
            if is_subject_line(line):
                out_lines.append(line)
                continue
            for pat, rep in RULES:
                line, k = pat.subn(rep, line)
                n += k
            out_lines.append(line)
        out = ''.join(out_lines)
        if n:
            total += n
            touched += 1
            print(f'  {p.relative_to(REPO).as_posix()}  ({n})')
            if apply:
                p.write_text(out, encoding='utf-8', newline='')

    print(f'\n{"APPLIED" if apply else "DRY RUN"}: {total} citation(s) across {touched} file(s).')
    if not apply:
        print('Re-run with --apply to write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
