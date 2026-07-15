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

Archives (`specs/archive/`, `plans/archive/`, `memory/`) are a historical record and keep
their original citations.

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
        out, n = src, 0
        for pat, rep in RULES:
            out, k = pat.subn(rep, out)
            n += k
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
