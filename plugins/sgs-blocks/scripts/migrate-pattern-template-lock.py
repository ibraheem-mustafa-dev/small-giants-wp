#!/usr/bin/env python3
"""migrate-pattern-template-lock.py — add templateLock:"contentOnly" to the outermost
block of every client-facing theme pattern that's missing one.

Repair script for inspector-scan rule `20-pattern-template-lock`
(plugins/sgs-blocks/scripts/inspector-scan/rules/20-pattern-template-lock.js). That rule
already does the correct scoping (skip any pattern declaring a non-empty "Post Types:"
header — chrome/component-builder patterns, not general page content) and reports 23
findings as of 2026-09-02. This script folds the fix into the SAME outermost `wp:sgs/*`
block comment the rule flags, using json.JSONDecoder().raw_decode() to parse/merge the
attributes object — never string-splicing, which has previously corrupted stored block
attrs elsewhere in this repo (see migrate-theme-tier-scalars.py's own docstring for the
sibling incident this guards against).

--survey  -> census, matches the rule's own finding count
--fix     -> dry-run diff
--fix --apply -> write it
--check   -> gate (mirrors the rule; exits 1 on any finding)
--self-test   -> fixture-based positive/negative controls
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
PATTERNS_DIR = REPO / 'theme' / 'sgs-theme' / 'patterns'

_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')
_POST_TYPES_RE = re.compile(r'Post Types:\s*([^\r\n]*)')
_TEMPLATE_LOCK_RE = re.compile(r'"templateLock"\s*:\s*"[^"]+"')


def find_target_files():
    if not PATTERNS_DIR.exists():
        return
    for f in sorted(PATTERNS_DIR.glob('*.php')):
        yield f


def is_client_facing(text: str) -> bool:
    """Same rule as 20-pattern-template-lock.js: a non-empty "Post Types:" header
    means this is a chrome/component-builder pattern, excluded by its own declaration."""
    m = _POST_TYPES_RE.search(text)
    post_types = m.group(1).strip() if m else ''
    return not post_types


def first_block_attrs(text: str):
    """Return (block_name, json_start, json_end, attrs_dict) for the FIRST wp:sgs/*
    block comment carrying a JSON attributes object — the pattern's outermost wrapper,
    the same target the rule's own fix message names. None if no match."""
    for m in _COMMENT_RE.finditer(text):
        idx = m.end()
        if idx >= len(text) or text[idx] != '{':
            continue
        try:
            obj, end = json.JSONDecoder().raw_decode(text, idx)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        return m.group(1), idx, end, obj
    return None


def survey():
    out = []
    for f in find_target_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        if not is_client_facing(text):
            continue
        if _TEMPLATE_LOCK_RE.search(text):
            continue
        match = first_block_attrs(text)
        if match is None:
            out.append({'file': f, 'block': None, 'reason': 'no parseable outermost block comment'})
            continue
        block_name, _, _, _ = match
        out.append({'file': f, 'block': block_name, 'reason': None})
    return out


def apply_file(f: Path, apply: bool):
    """Add templateLock:"contentOnly" to the pattern's outermost block comment.
    Returns (changed: bool, error: str|None)."""
    text = f.read_text(encoding='utf-8', errors='replace')
    if not is_client_facing(text):
        return False, 'chrome/builder pattern (has Post Types: header) — not a target'
    if _TEMPLATE_LOCK_RE.search(text):
        return False, 'already has templateLock'

    match = first_block_attrs(text)
    if match is None:
        return False, 'no parseable outermost block comment with a JSON attrs object'
    _, start, end, attrs = match

    new_attrs = dict(attrs)
    new_attrs['templateLock'] = 'contentOnly'
    new_json = json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)
    out = text[:start] + new_json + text[end:]

    # Refuse to write anything that doesn't round-trip clean.
    reparsed = first_block_attrs(out)
    if reparsed is None or reparsed[3].get('templateLock') != 'contentOnly':
        return False, 'refused: fold did not round-trip cleanly'

    if apply:
        f.write_text(out, encoding='utf-8', newline='')
    return True, None


def cmd_survey():
    findings = survey()
    print(f'{len(findings)} pattern(s) missing templateLock:')
    for item in findings:
        note = f' ({item["reason"]})' if item['reason'] else f' [{item["block"]}]'
        print(f'  {item["file"].relative_to(REPO)}{note}')
    return 0


def cmd_fix(apply: bool):
    changed = 0
    refused = []
    for f in find_target_files():
        did, err = apply_file(f, apply)
        if did:
            changed += 1
            print(f'  {"FIXED" if apply else "WOULD FIX"}: {f.relative_to(REPO)}')
        elif err and 'already has' not in err and 'not a target' not in err:
            refused.append((f, err))
    for f, err in refused:
        print(f'  REFUSED: {f.relative_to(REPO)} — {err}')
    print(f'{changed} file(s) {"fixed" if apply else "would be fixed"}, {len(refused)} refused')
    return 1 if refused else 0


def cmd_check():
    findings = survey()
    if findings:
        print(f'[migrate-pattern-template-lock] {len(findings)} pattern(s) missing templateLock:')
        for item in findings:
            print(f'  {item["file"].relative_to(REPO)}')
        return 1
    print('[migrate-pattern-template-lock] Gate passed — 0 findings.')
    return 0


def self_test() -> int:
    import tempfile
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    # Positive control: a client-facing pattern with no templateLock gets one added,
    # and the rest of the attrs object survives byte-for-byte.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'about-fixture.php'
        original = (
            '<!-- wp:sgs/container {"tagName":"div","contentWidth":{"desktop":"1200px"},'
            '"padding":{"desktop":"40px"}} -->\n<div>content</div>\n<!-- /wp:sgs/container -->\n'
        )
        f.write_text(original, encoding='utf-8')
        did, err = apply_file(f, apply=True)
        result = f.read_text(encoding='utf-8')
        check('positive control: templateLock added, err is None', did and err is None)
        check('positive control: original attrs preserved',
              '"tagName":"div"' in result and '"contentWidth":{"desktop":"1200px"}' in result)
        check('positive control: templateLock:"contentOnly" present', '"templateLock":"contentOnly"' in result)

    # Negative control: a chrome/builder pattern (Post Types header set) is left untouched.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'header-fixture.php'
        original = (
            '<?php\n/**\n * Title: Header Default\n * Post Types: sgs_header\n */\n?>\n'
            '<!-- wp:sgs/container {"tagName":"header"} --><header></header><!-- /wp:sgs/container -->\n'
        )
        f.write_text(original, encoding='utf-8')
        did, err = apply_file(f, apply=True)
        result = f.read_text(encoding='utf-8')
        check('negative control: chrome pattern untouched', not did and result == original)

    # Negative control: a pattern that ALREADY has templateLock is left untouched.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'already-locked-fixture.php'
        original = '<!-- wp:sgs/container {"templateLock":"contentOnly"} --><div></div><!-- /wp:sgs/container -->\n'
        f.write_text(original, encoding='utf-8')
        did, err = apply_file(f, apply=True)
        result = f.read_text(encoding='utf-8')
        check('negative control: already-locked pattern untouched', not did and result == original)

    # Positive control against REAL current data: at least one live pattern flagged.
    live = survey()
    check('positive control: live tree has ≥1 real finding (rule 20 population is non-zero)',
          len(live) > 0)

    print(f'\n{len(failures)} failure(s)' if failures else '\nAll self-tests passed.')
    return 1 if failures else 0


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--survey', action='store_true')
    p.add_argument('--fix', action='store_true')
    p.add_argument('--apply', action='store_true')
    p.add_argument('--check', action='store_true')
    p.add_argument('--self-test', action='store_true')
    args = p.parse_args()

    if args.self_test:
        sys.exit(self_test())
    if args.check:
        sys.exit(cmd_check())
    if args.fix:
        sys.exit(cmd_fix(apply=args.apply))
    if args.survey:
        sys.exit(cmd_survey())
    p.print_help()
    sys.exit(1)


if __name__ == '__main__':
    main()
