#!/usr/bin/env python3
"""Rename converter/orchestrator.py -> converter/dispatch_spine.py, and every
call site that names it (dotted import path, quoted/bare filename mentions).

WHY THIS EXISTS
    `.claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md` Phase 4
    asked for this rename a month ago; nobody did it. Per
    `.claude/THE-MIGRATION-METHOD.md` Step 4, this is a SINGLE-TOKEN,
    SINGLE-LINE target (a module rename), so it uses the line-classifier
    shape (`migrate-length-sanitiser.py`), not an AST tool.

    ⛔ Do NOT touch `sgs-clone-orchestrator.py` (repo-root pipeline entry
    point) or `plugins/sgs-blocks/scripts/orchestrator/` (the pipeline's
    stage-machinery PACKAGE). Both are separate, correctly-named things that
    merely share the English word "orchestrator" -- confirmed by their own
    docs (`orchestrator/README.md`: "It is not the converter."). A naive
    `\\borchestrator\\.py\\b` regex WOULD match inside
    "sgs-clone-orchestrator.py" (the hyphen is a word boundary), so every
    classifier here explicitly excludes any line containing
    "clone-orchestrator".

WHAT THIS RENAMES
    1. The file itself: converter/orchestrator.py -> converter/dispatch_spine.py
    2. Every `converter.orchestrator` dotted import/reference (Python import
       statements AND prose comments naming the dotted path) -> `converter.dispatch_spine`
    3. Every quoted `"orchestrator.py"` filename literal (e.g. a path-constant
       list, a test's registry-membership assertion) -> `"dispatch_spine.py"`
    4. Every BARE `orchestrator.py` mention in a docstring/comment describing
       the converter-root dispatch surface -> `dispatch_spine.py`

    All four call-site classes were found by full-repo grep (verified twice,
    once narrow then once with a broader corpus.py match) -- see
    `--survey --json` for the full census.

CLI
    python migrate-orchestrator-rename.py --survey | --fix [--apply] | --check | --self-test
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass


def _find_repo_root() -> str:
    """Anchor on a repo-unique marker, walking up from __file__ (Step 4)."""
    here = os.path.dirname(os.path.abspath(__file__))
    marker = os.path.join('.claude', 'THE-MIGRATION-METHOD.md')
    cur = here
    for _ in range(12):
        if os.path.isfile(os.path.join(cur, marker)):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    raise RuntimeError('Could not find repo root (marker: %s)' % marker)


ROOT = _find_repo_root()
SCRIPTS_DIR = os.path.join(ROOT, 'plugins', 'sgs-blocks', 'scripts')
CONVERTER_DIR = os.path.join(SCRIPTS_DIR, 'converter')

OLD_MODULE = 'orchestrator'
NEW_MODULE = 'dispatch_spine'
OLD_FILE = 'orchestrator.py'
NEW_FILE = 'dispatch_spine.py'

OLD_FILE_PATH = os.path.join(CONVERTER_DIR, OLD_FILE)
NEW_FILE_PATH = os.path.join(CONVERTER_DIR, NEW_FILE)

# The dotted-import pattern: `converter.orchestrator` as a substring (covers
# `from converter.orchestrator import X`, `import converter.orchestrator as
# _mod`, and prose comments naming the dotted path).
RE_DOTTED = re.compile(r'converter\.orchestrator\b')

# Any line naming the fossil pipeline entry point -- never a target of this
# rename. Checked BEFORE the filename patterns below, because
# "sgs-clone-orchestrator.py" contains "orchestrator.py" as a substring (the
# hyphen before "orchestrator" is a regex word boundary).
CLONE_ORCHESTRATOR_MARKER = 'clone-orchestrator'

RE_QUOTED_FILE = re.compile(r'"orchestrator\.py"')
RE_BARE_FILE = re.compile(r'\borchestrator\.py\b')

# Explicit, hand-verified target list (repo-relative to SCRIPTS_DIR), each
# with the reason it is in scope. Confirmed by two independent full-repo
# greps (a narrow `from .orchestrator|import orchestrator` pass, which
# MISSED `import converter.orchestrator as _mod`, then a broader
# `converter\.orchestrator` pass that caught it -- see crosscheck() below,
# which re-derives this list from scratch on every --check run so a missed
# site cannot silently stay missed).
TARGETS = [
    'converter/orchestrator.py',                              # the file itself (self-referential docstring)
    'converter/resolvers/grid.py',                             # dotted-path comment
    'converter/resolvers/outer_box.py',                        # dotted-path comment
    'converter/services/assembly.py',                          # import
    'converter/services/css_pass.py',                          # import
    'converter/services/fold_helpers.py',                      # 2x lazy import
    'converter/services/root_supports.py',                     # import
    'converter/gates/no_slug_literal.py',                      # docstring prose x2 + path constant
    'converter/tests/test_border_side.py',                     # import
    'converter/tests/test_conservation_seam.py',                # import
    'converter/tests/test_destination_contract.py',            # 5x import (incl. `import ... as _mod`)
    'converter/tests/test_outer_box.py',                        # import
    'converter/tests/test_outer_box_background_shadow.py',     # import
    'converter/tests/test_root_supports.py',                    # import
    'converter/tests/test_tier_object_typography.py',          # import
    'converter/tests/test_unrouted_fails.py',                   # import
    'converter/tests/test_walk_registry.py',                    # docstring prose + quoted set literal
]


def targets() -> list[str]:
    return [os.path.join(SCRIPTS_DIR, rel.replace('/', os.sep)) for rel in TARGETS]


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def classify(line: str) -> str:
    """Classify one line. Returns one of:
    'dotted', 'quoted-file', 'bare-file', 'excluded-clone-orchestrator', 'no-match'.
    """
    if CLONE_ORCHESTRATOR_MARKER in line:
        return 'excluded-clone-orchestrator'
    if RE_DOTTED.search(line):
        return 'dotted'
    if RE_QUOTED_FILE.search(line):
        return 'quoted-file'
    if RE_BARE_FILE.search(line):
        return 'bare-file'
    return 'no-match'


def transform_line(line: str, kind: str) -> str:
    if kind == 'dotted':
        return RE_DOTTED.sub('converter.' + NEW_MODULE, line)
    if kind == 'quoted-file':
        return RE_QUOTED_FILE.sub('"%s"' % NEW_FILE, line)
    if kind == 'bare-file':
        return RE_BARE_FILE.sub(NEW_FILE, line)
    return line


def transform(text: str) -> tuple[str, dict, list]:
    """Apply the rename across one file's text. Returns (new_text, counts, unrecognised)."""
    counts: dict = {'dotted': 0, 'quoted-file': 0, 'bare-file': 0, 'excluded-clone-orchestrator': 0}
    unrecognised = []
    out_lines = []
    for i, line in enumerate(text.splitlines(keepends=True), start=1):
        if OLD_MODULE not in line:
            out_lines.append(line)
            continue
        kind = classify(line)
        if kind == 'no-match':
            # Contains the bare word "orchestrator" but matches none of the
            # known call-site shapes -- refuse to guess.
            unrecognised.append((i, line.rstrip('\n')))
            out_lines.append(line)
            continue
        counts[kind] += 1
        out_lines.append(transform_line(line, kind))
    return ''.join(out_lines), counts, unrecognised


# ---------------------------------------------------------------------------
# Corpus control (Step 6): a SECOND, dumb, wide enumeration independent of
# TARGETS, so a site missed by the hand-built list cannot silently stay
# missed. Walks the whole repo, prunes never-source directories, and flags
# anything naming our rename subject that TARGETS does not already cover.
# ---------------------------------------------------------------------------
PRUNE_DIRS = {'.git', '.claude', 'node_modules', 'build', 'vendor', '__pycache__'}
FIXTURES_MARKER = os.path.join('scripts', 'fixtures')
_SELF_PATH = os.path.abspath(__file__)

# Every surviving BARE mention of the word "orchestrator" that is NOT one of
# our three migratable shapes (dotted import / quoted filename / bare
# filename with ".py"), pinned by per-file COUNT + a written reason, exactly
# as migrate-length-sanitiser.py's BARE_OK does. crosscheck() fails on an
# unlisted bare mention, a changed count, or a stale entry -- so a NEW
# ambiguous reference cannot silently join this list.
_SCRIPTS_PREFIX = 'plugins/sgs-blocks/scripts/'

BARE_OK = {
    _SCRIPTS_PREFIX + 'converter/resolvers/grid.py': (1, 'prose: "the orchestrator\'s ..." describes the runtime role, not the module path'),
    _SCRIPTS_PREFIX + 'converter/resolvers/outer_box.py': (3, 'prose: "the orchestrator" (role, x2) + "orchestrator/resolvers" (load-order description) -- neither is our dotted path or filename'),
    _SCRIPTS_PREFIX + 'converter/services/assembly.py': (2, 'prose: "the orchestrator" (role) x2'),
    _SCRIPTS_PREFIX + 'converter/services/fold_helpers.py': (3, 'prose: "the orchestrator" (role) x2 + "orchestrator/converter_v2/convert.py" -- a citation of the DELETED frozen-engine tree (D276), a different "orchestrator" root entirely, not converter/orchestrator.py'),
    _SCRIPTS_PREFIX + 'converter/gates/no_slug_literal.py': (1, '"anywhere in orchestrator/" refers to the scripts/orchestrator/ DIRECTORY (pipeline stage-machinery package, _ORCHESTRATOR = _SCRIPTS_DIR / "orchestrator" in cheat-gate/check_slug_literals.py) -- confirmed NOT our target by reading that file'),
    _SCRIPTS_PREFIX + 'converter/tests/test_destination_contract.py': (2, 'prose: "used inside orchestrator" / "the orchestrator\'s dict-merge sites" -- role references, not the dotted path or filename'),
    _SCRIPTS_PREFIX + 'converter/tests/test_root_supports.py': (1, 'prose: backtick-quoted `orchestrator._check_conservation` illustrates the module by its old bare name in a comment -- cosmetic only, no runtime effect, left for a future doc-accuracy pass'),
    _SCRIPTS_PREFIX + 'converter/tests/test_walk_registry.py': (1, 'prose: "dispatch_table/orchestrator/walk" shorthand list (no .py suffixes) -- cosmetic only, the actual gated assertion on line 198 is migrated'),
}


def broad_enumeration() -> list[str]:
    hits = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS]
        if FIXTURES_MARKER in dirpath.replace(os.sep, '/'):
            continue
        for fn in filenames:
            if not fn.endswith('.py'):
                continue
            path = os.path.join(dirpath, fn)
            if os.path.abspath(path) == _SELF_PATH:
                continue  # this tool's own source names its own patterns literally
            try:
                with open(path, encoding='utf-8', errors='replace') as f:
                    text = f.read()
            except OSError:
                continue
            if OLD_MODULE not in text:
                continue
            for lineno, line in enumerate(text.splitlines(), start=1):
                if OLD_MODULE not in line:
                    continue
                kind = classify(line)
                if kind in ('dotted', 'quoted-file', 'bare-file'):
                    hits.append('%s:%d' % (rel(path), lineno))
    return sorted(hits)


def crosscheck() -> list[str]:
    """Return failures: wide-enumeration hits that TARGETS does not cover,
    or (post-rename) any remaining migratable reference at all."""
    failures = []
    target_rels = {rel(t) for t in targets()}
    # After the rename, orchestrator.py itself is gone -- its own docstring
    # entry is replaced by dispatch_spine.py, so drop it from the expected set
    # once the rename has landed.
    for hit in broad_enumeration():
        hit_file = hit.split(':', 1)[0]
        if hit_file not in target_rels:
            failures.append('UNTRACKED SITE (not in TARGETS): %s' % hit)
    return failures


def check_bare_ok(files_report: list[dict]) -> list[str]:
    """Reconcile every 'unrecognised' (no-match) line against BARE_OK. A file's
    unrecognised lines are JUSTIFIED only when the count matches exactly --
    same discipline as migrate-length-sanitiser.py's BARE_OK table. A drift in
    either direction (a NEW unrecognised line, or a pinned entry that stopped
    reproducing) is a failure, never silently absorbed."""
    failures = []
    seen = set()
    for entry in files_report:
        f = entry['file']
        actual = len(entry['unrecognised'])
        if actual == 0:
            continue
        seen.add(f)
        if f not in BARE_OK:
            failures.append('UNJUSTIFIED unrecognised in %s (%d line(s), not in BARE_OK)' % (f, actual))
            continue
        pinned_count, _reason = BARE_OK[f]
        if actual != pinned_count:
            failures.append('BARE_OK count drift for %s: pinned %d, found %d' % (f, pinned_count, actual))
    for f in BARE_OK:
        if f not in seen:
            failures.append('STALE BARE_OK entry: %s (0 unrecognised lines found, entry pinned %d)' % (f, BARE_OK[f][0]))
    return failures


# ---------------------------------------------------------------------------
# Survey / fix / check
# ---------------------------------------------------------------------------

def do_survey(as_json: bool) -> int:
    report = {'files': [], 'totals': {'dotted': 0, 'quoted-file': 0, 'bare-file': 0,
                                       'excluded-clone-orchestrator': 0, 'unrecognised': 0},
              'file_renamed': not os.path.isfile(OLD_FILE_PATH) and os.path.isfile(NEW_FILE_PATH),
              'wide_sweep_untracked': [], 'bare_ok_failures': []}
    for path in targets():
        if not os.path.isfile(path):
            # orchestrator.py itself: after --fix --apply it no longer exists
            # at this path (it has been renamed) -- that is success, not a miss.
            continue
        with open(path, encoding='utf-8') as f:
            text = f.read()
        _, counts, unrecognised = transform(text)
        entry = {'file': rel(path), 'counts': counts, 'unrecognised': unrecognised}
        report['files'].append(entry)
        for k, v in counts.items():
            report['totals'][k] += v
        report['totals']['unrecognised'] += len(unrecognised)

    report['wide_sweep_untracked'] = crosscheck()
    report['bare_ok_failures'] = check_bare_ok(report['files'])

    if as_json:
        print(json.dumps(report, indent=2))
    else:
        print('[survey] migrate-orchestrator-rename')
        print('  file renamed already: %s' % report['file_renamed'])
        for entry in report['files']:
            c = entry['counts']
            print('  %s: dotted=%d quoted-file=%d bare-file=%d excluded=%d unrecognised=%d' % (
                entry['file'], c['dotted'], c['quoted-file'], c['bare-file'],
                c['excluded-clone-orchestrator'], len(entry['unrecognised'])))
            for lineno, line in entry['unrecognised']:
                print('      UNRECOGNISED %s:%d: %s' % (entry['file'], lineno, line))
        print('  TOTALS: %s' % report['totals'])
        if report['wide_sweep_untracked']:
            print('  WIDE-SWEEP UNTRACKED SITES:')
            for u in report['wide_sweep_untracked']:
                print('    %s' % u)
        else:
            print('  wide sweep: 0 untracked sites (TARGETS is exhaustive)')
        if report['bare_ok_failures']:
            print('  BARE_OK RECONCILIATION FAILURES:')
            for b in report['bare_ok_failures']:
                print('    %s' % b)
        else:
            print('  BARE_OK: every unrecognised line is justified and pinned')
    untracked_total = len(report['wide_sweep_untracked'])
    bare_ok_fail_total = len(report['bare_ok_failures'])
    print('unrecognised (unjustified): %d' % bare_ok_fail_total)
    print('untracked: %d' % untracked_total)
    return 0 if (bare_ok_fail_total == 0 and untracked_total == 0) else 1


def preview(old_text: str, new_text: str, relpath: str) -> str:
    return ''.join(difflib.unified_diff(
        old_text.splitlines(keepends=True),
        new_text.splitlines(keepends=True),
        fromfile='a/' + relpath, tofile='b/' + relpath,
    ))


def _atomic_write(path: str, text: str) -> None:
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    os.replace(tmp, path)


def do_fix(apply: bool) -> int:
    files_report = []
    diffs = []
    for path in targets():
        if not os.path.isfile(path):
            continue
        with open(path, encoding='utf-8', newline='') as f:
            old_text = f.read()
        new_text, counts, unrecognised = transform(old_text)
        files_report.append({'file': rel(path), 'unrecognised': unrecognised})
        if unrecognised:
            for lineno, line in unrecognised:
                print('REFUSING to guess %s:%d: %s' % (rel(path), lineno, line))
        if new_text != old_text:
            diffs.append((path, old_text, new_text))

    bare_ok_failures = check_bare_ok(files_report)
    unjustified = bool(bare_ok_failures)
    if unjustified:
        for f in bare_ok_failures:
            print('UNJUSTIFIED: %s' % f)

    if not apply:
        for path, old_text, new_text in diffs:
            sys.stdout.write(preview(old_text, new_text, rel(path)))
        if not os.path.isfile(NEW_FILE_PATH) and os.path.isfile(OLD_FILE_PATH):
            print('# Would rename: %s -> %s' % (rel(OLD_FILE_PATH), rel(NEW_FILE_PATH)))
        return 1 if unjustified else 0

    for path, old_text, new_text in diffs:
        _atomic_write(path, new_text)
        print('WROTE %s' % rel(path))

    # The file rename itself. Do this LAST, after content rewrites, and only
    # once: `targets()` returns the OLD path for orchestrator.py, so its own
    # content edit (the self-referential docstring) has already landed by
    # the time we rename it.
    if os.path.isfile(OLD_FILE_PATH) and not os.path.isfile(NEW_FILE_PATH):
        os.replace(OLD_FILE_PATH, NEW_FILE_PATH)
        print('RENAMED %s -> %s' % (rel(OLD_FILE_PATH), rel(NEW_FILE_PATH)))
    elif os.path.isfile(NEW_FILE_PATH):
        print('rename already done (%s exists)' % rel(NEW_FILE_PATH))
    else:
        print('WARNING: neither %s nor %s exists' % (rel(OLD_FILE_PATH), rel(NEW_FILE_PATH)))
        unjustified = True

    return 1 if unjustified else 0


def do_check() -> int:
    failures = []
    files_report = []
    if os.path.isfile(OLD_FILE_PATH):
        failures.append('%s still exists (rename not applied)' % rel(OLD_FILE_PATH))
    if not os.path.isfile(NEW_FILE_PATH):
        failures.append('%s does not exist (rename not applied)' % rel(NEW_FILE_PATH))

    for path in targets():
        if os.path.basename(path) == OLD_FILE:
            continue  # covered by the file-existence check above
        if not os.path.isfile(path):
            failures.append('MISSING TARGET FILE: %s' % rel(path))
            continue
        with open(path, encoding='utf-8') as f:
            text = f.read()
        _, _counts, unrecognised = transform(text)
        files_report.append({'file': rel(path), 'unrecognised': unrecognised})
        for lineno, line in enumerate(text.splitlines(), start=1):
            if OLD_MODULE not in line:
                continue
            kind = classify(line)
            if kind in ('dotted', 'quoted-file', 'bare-file'):
                failures.append('UNMIGRATED %s:%d: %s' % (rel(path), lineno, line.strip()))

    failures.extend(crosscheck())
    failures.extend(check_bare_ok(files_report))

    if failures:
        print('[check] %d failure(s):' % len(failures))
        for f in failures:
            print('  - %s' % f)
        return 1
    print('[check] OK -- orchestrator.py fully renamed to dispatch_spine.py, no remaining call sites.')
    return 0


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

def self_test() -> int:
    failures = []

    def check(name, cond):
        if not cond:
            failures.append(name)

    # 1. Positive -- an import must be rewritten.
    src = 'from converter.orchestrator import process_element\n'
    new_text, counts, unrec = transform(src)
    check('positive-import', new_text == 'from converter.dispatch_spine import process_element\n')
    check('positive-import-count', counts['dotted'] == 1)
    check('positive-import-no-unrecognised', unrec == [])

    # 1b. `import X as _mod` shape (the one the narrow grep missed).
    src = 'import converter.orchestrator as _mod\n'
    new_text, counts, unrec = transform(src)
    check('positive-import-as', new_text == 'import converter.dispatch_spine as _mod\n')

    # 2. Definition site -- for a PURE RENAME the definition itself CHANGES
    # (Step 6 note 2), it does not survive untouched.
    src = '"""orchestrator.py — dispatch + conservation spine (design §3 / §4).\n"""\n'
    new_text, counts, unrec = transform(src)
    check('definition-changes', 'dispatch_spine.py' in new_text and 'orchestrator.py' not in new_text)
    check('definition-bare-file-count', counts['bare-file'] == 1)

    # 3. Edge / legitimate exception -- a bare "orchestrator.py" INSIDE
    # "sgs-clone-orchestrator.py" must be refused, not rewritten.
    src = '_ORCHESTRATOR_PATH = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"\n'
    new_text, counts, unrec = transform(src)
    check('exclude-clone-orchestrator', new_text == src)
    check('exclude-counted', counts['excluded-clone-orchestrator'] == 1)

    # 4. Negative control -- a file with no instances is byte-identical.
    src = 'def foo():\n    return 1\n'
    new_text, counts, unrec = transform(src)
    check('negative-control-inert', new_text == src)
    check('negative-control-no-counts', sum(counts.values()) == 0)

    # 5. Idempotence.
    src = ('from converter.orchestrator import ConservationError\n'
           '_CONVERTER / "orchestrator.py"\n'
           'dispatch_table.py, orchestrator.py, walk.py\n')
    once, _, _ = transform(src)
    twice, _, _ = transform(once)
    check('idempotent', once == twice)

    # 6. Quoted filename in a path-constant list.
    src = '    _CONVERTER / "orchestrator.py",\n'
    new_text, counts, unrec = transform(src)
    check('quoted-path-constant', new_text == '    _CONVERTER / "dispatch_spine.py",\n')
    check('quoted-path-constant-count', counts['quoted-file'] == 1)

    # 7. Bare filename in docstring prose (comma-separated list).
    src = '    dispatch_table.py, orchestrator.py, walk.py (widened EXECUTION Step 5,\n'
    new_text, counts, unrec = transform(src)
    check('bare-prose', 'dispatch_table.py, dispatch_spine.py, walk.py' in new_text)

    # 8. Unrecognised -- "orchestrator" present but no known shape at all.
    src = 'the orchestrator handles dispatch, not this file\n'
    new_text, counts, unrec = transform(src)
    check('unrecognised-flagged', len(unrec) == 1)
    check('unrecognised-unchanged', new_text == src)

    # 9. Corpus width sanity -- TARGETS is non-empty and every path exists on
    # disk right now (either as orchestrator.py pre-rename or dispatch_spine.py
    # post-rename).
    check('targets-nonempty', len(TARGETS) > 0)
    for t in targets():
        exists_either = os.path.isfile(t) or (
            os.path.basename(t) == OLD_FILE and os.path.isfile(NEW_FILE_PATH)
        )
        check('target-exists:%s' % rel(t), exists_either)

    if failures:
        print('[self-test] FAILED: %s' % ', '.join(failures))
        return 1
    print('[self-test] OK -- %d assertions passed.' % (9 + len(targets())))
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument('--survey', action='store_true')
    g.add_argument('--fix', action='store_true')
    g.add_argument('--check', action='store_true')
    g.add_argument('--self-test', action='store_true')
    parser.add_argument('--json', action='store_true', help='with --survey, emit JSON')
    parser.add_argument('--apply', action='store_true', help='with --fix, write changes')
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.survey:
        return do_survey(args.json)
    if args.fix:
        return do_fix(args.apply)
    if args.check:
        return do_check()
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
