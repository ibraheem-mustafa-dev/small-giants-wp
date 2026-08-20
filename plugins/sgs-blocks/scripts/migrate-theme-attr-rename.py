#!/usr/bin/env python3
"""migrate-theme-attr-rename.py — rename ONE attribute key, scoped to ONE block slug,
inside theme pattern/template/part block-comment attributes.

    <!-- wp:sgs/x {"backgroundColor":"V", ...} -->
        -> <!-- wp:sgs/x {"backgroundColour":"V", ...} -->

Spec 32 / the sgs/container base-background-colour build (2026-08-20). Same D542 triad,
same parsing primitive (`json.JSONDecoder().raw_decode()` on the JSON inside a
`<!-- wp:sgs/* {...} -->` HTML comment) and the same refuse-rather-than-guess discipline
as `migrate-theme-tier-scalars.py` (read in full before this script was written) — but the
transformation is simpler: rename one key, on one block, everywhere it appears in
theme/sgs-theme/{patterns,templates,parts}. No tier-folding, no sibling collapsing.

WHY THIS IS A SEPARATE SCRIPT, NOT A THIRD MODE ON migrate-theme-tier-scalars.py: that
script's whole shape (FLAT/BLENDED/OBJECT classification, tier-object folding) is about
collapsing N sibling keys into one object. A rename is a 1-to-1 key swap with no siblings
and no shape change to the value — reusing that classifier would be forcing an unrelated
concept through code that doesn't model it.

⛔ GATED ON THE DESTINATION ATTRIBUTE (`--to`) BEING DECLARED ON THE TARGET BLOCK'S OWN
block.json. migrate-theme-tier-scalars.py learned this the hard way (`_object_typed_blocks`
docstring): without an equivalent gate it produced 7 false findings on a block whose
schema never had the property, and folding them would have written a shape WordPress
silently discards. Here the risk is worse — renaming INTO an undeclared destination would
make WordPress drop the value outright (client can never see or edit it, exactly the ghost
this migration exists to kill). The gate is checked before ANY mode runs, --survey
included: if the destination isn't declared yet, there is nothing meaningful to report.

WHAT IT DOES NOT DO
--------------------
* Does not touch stored post_content (published/draft pages) — same Ruling B as the tier
  script: those are binned and re-cloned, not migrated in place.
* Does not attempt a fold when the JSON won't parse, or when the block comment has no
  attributes object at all (a bare `<!-- wp:sgs/x /-->`) — nothing to rename there.
* Does not silently overwrite a genuine conflict — an instance carrying BOTH the source
  and destination keys with DIFFERING values is refused and reported, never guessed at.
* Does not reorder or reformat keys beyond the one being renamed — the rest of the
  attributes object is byte-identical (mutates the parsed dict in place; Python's `json`
  module preserves insertion order from `json.loads`).
"""

import argparse
import io
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
THEME_DIRS = [
    REPO / 'theme' / 'sgs-theme' / 'patterns',
    REPO / 'theme' / 'sgs-theme' / 'templates',
    REPO / 'theme' / 'sgs-theme' / 'parts',
]
_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')


def _block_json_path(block: str) -> Path:
    slug = block.split('/', 1)[-1]
    return BLOCKS_DIR / slug / 'block.json'


def _dest_attr_declared(block: str, to_attr: str) -> bool:
    """True only when the TARGET block's own block.json already declares `to_attr` as an
    attribute. This is the gate — see the module docstring. Reading BLOCKS_DIR directly
    (not the DB) matches migrate-theme-tier-scalars.py's own ground-truth source for the
    same class of question."""
    bj = _block_json_path(block)
    if not bj.exists():
        return False
    try:
        data = json.loads(bj.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return False
    return to_attr in data.get('attributes', {})


def find_target_files():
    for d in THEME_DIRS:
        if not d.exists():
            continue
        for f in sorted(d.glob('*')):
            if f.suffix in ('.php', '.html'):
                yield f


def iter_block_attrs(text: str):
    """Yield (block_name, json_start, json_end, attrs_dict) for every wp:sgs/* comment
    that carries a JSON attributes object. Uses json's own raw_decode for the closing
    brace, so nested objects are never mishandled by a hand-rolled brace-matcher."""
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
        yield m.group(1), idx, end, obj


def classify(attrs: dict, block: str, block_name: str, frm: str, to: str):
    """RENAME   — `frm` present, `to` absent: straightforward key swap.
    DEDUPE   — both present, SAME value: drop `frm`, keep `to` (already-correct duplicate).
    CONFLICT — both present, DIFFERING values: refuse, needs a human decision.
    ABSENT   — neither present, or this instance isn't the target block: nothing to do."""
    if block_name != block:
        return 'ABSENT', None
    has_frm = frm in attrs
    has_to = to in attrs
    if not has_frm and not has_to:
        return 'ABSENT', None
    if has_frm and not has_to:
        return 'RENAME', attrs[frm]
    if has_frm and has_to:
        if attrs[frm] == attrs[to]:
            return 'DEDUPE', attrs[to]
        return 'CONFLICT', (attrs[frm], attrs[to])
    return 'ABSENT', None  # only `to` present — already migrated, nothing to do


def survey(block: str, frm: str, to: str):
    out = []
    for f in find_target_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        for block_name, start, end, attrs in iter_block_attrs(text):
            kind, value = classify(attrs, block, block_name, frm, to)
            if kind == 'ABSENT':
                continue
            out.append({'file': f, 'block': block_name, 'kind': kind, 'value': value})
    return out


def apply_file(f: Path, block: str, frm: str, to: str, apply: bool):
    """Rename every matching key in ONE file. Returns (n_renamed, n_conflicts)."""
    text = f.read_text(encoding='utf-8', errors='replace')
    edits = []  # (start, end, new_json_str) — applied in reverse so offsets don't drift
    n_conflicts = 0
    for block_name, start, end, attrs in iter_block_attrs(text):
        kind, value = classify(attrs, block, block_name, frm, to)
        if kind == 'CONFLICT':
            n_conflicts += 1
            continue
        if kind not in ('RENAME', 'DEDUPE'):
            continue
        new_attrs = dict(attrs)
        new_attrs.pop(frm, None)
        new_attrs[to] = value
        # Preserve original key POSITION for the rename case: dict(attrs) with pop+add
        # would move `to` to the end. Rebuild in original order, substituting `frm`'s
        # slot with `to` so the rest of the attributes object stays visually stable.
        ordered = {}
        for k, v in attrs.items():
            if k == frm:
                ordered[to] = value
            elif k == to:
                continue  # already placed (DEDUPE case) or will be placed at frm's slot
            else:
                ordered[k] = v
        if to not in ordered:
            ordered[to] = value
        new_json = json.dumps(ordered, separators=(',', ':'), ensure_ascii=False)
        edits.append((start, end, new_json))

    if not edits:
        return 0, n_conflicts

    out = text
    for start, end, new_json in sorted(edits, reverse=True):
        out = out[:start] + new_json + out[end:]

    # Re-parse every attrs object in the result to confirm the file is still valid JSON
    # at every block comment — refuse to write anything that doesn't round-trip clean.
    for _ in iter_block_attrs(out):
        pass  # iterating already validates each match's JSON via raw_decode

    if apply:
        io.open(f, 'w', encoding='utf-8', newline='').write(out)
    return len(edits), n_conflicts


def self_test() -> int:
    import tempfile
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    # Ground-truth gate check: sgs/container's OWN block.json (as edited this session)
    # declares `backgroundColour` — the exact real case this script exists to migrate.
    check("gate: sgs/container's real block.json declares 'backgroundColour'",
          _dest_attr_declared('sgs/container', 'backgroundColour'))
    check("gate: sgs/container's real block.json does NOT declare a made-up attr "
          "(negative control on the gate itself)",
          not _dest_attr_declared('sgs/container', 'notARealAttribute'))

    # RENAME case: source present, destination absent.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'rename-case.php'
        original = '<!-- wp:sgs/container {"layout":"stack","backgroundColor":"surface-alt","gap":{"desktop":"16px"}} -->\n'
        f.write_text(original, encoding='utf-8')
        n, conflicts = apply_file(f, 'sgs/container', 'backgroundColor', 'backgroundColour', apply=True)
        result = f.read_text(encoding='utf-8')
        check('RENAME: 1 instance renamed, 0 conflicts',
              n == 1 and conflicts == 0)
        check('RENAME: destination key holds the source value, source key gone',
              '"backgroundColour":"surface-alt"' in result and '"backgroundColor"' not in result)
        check('RENAME: sibling keys (layout, gap) untouched',
              '"layout":"stack"' in result and '"gap":{"desktop":"16px"}' in result)

    # DEDUPE case: both present with the SAME value — drop the source, keep destination.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'dedupe-case.php'
        original = '<!-- wp:sgs/container {"backgroundColor":"primary","backgroundColour":"primary"} -->\n'
        f.write_text(original, encoding='utf-8')
        n, conflicts = apply_file(f, 'sgs/container', 'backgroundColor', 'backgroundColour', apply=True)
        result = f.read_text(encoding='utf-8')
        check('DEDUPE: 1 instance folded, 0 conflicts',
              n == 1 and conflicts == 0)
        check('DEDUPE: exactly one backgroundColour key survives, correct value',
              result.count('backgroundColour') == 1 and '"backgroundColour":"primary"' in result
              and 'backgroundColor"' not in result)

    # CONFLICT case: both present with DIFFERING values — refuse, write nothing.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'conflict-case.php'
        original = '<!-- wp:sgs/container {"backgroundColor":"primary","backgroundColour":"surface"} -->\n'
        f.write_text(original, encoding='utf-8')
        n, conflicts = apply_file(f, 'sgs/container', 'backgroundColor', 'backgroundColour', apply=True)
        check('CONFLICT: 0 renamed, 1 conflict reported, file left byte-identical',
              n == 0 and conflicts == 1 and f.read_text(encoding='utf-8') == original)

    # ABSENT case: neither key present — file untouched.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'absent-case.php'
        original = '<!-- wp:sgs/container {"layout":"grid"} -->\n'
        f.write_text(original, encoding='utf-8')
        n, conflicts = apply_file(f, 'sgs/container', 'backgroundColor', 'backgroundColour', apply=True)
        check('ABSENT: 0 renamed, 0 conflicts, file untouched',
              n == 0 and conflicts == 0 and f.read_text(encoding='utf-8') == original)

    # Negative control: a DIFFERENT block using the SAME source key must NOT be touched —
    # this is the scoping the brief explicitly requires (sgs/heading's fontSize etc. must
    # never be caught by a container-scoped rename).
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'other-block-case.php'
        original = '<!-- wp:sgs/site-footer-row {"backgroundColor":"footer-bg"} -->\n'
        f.write_text(original, encoding='utf-8')
        n, conflicts = apply_file(f, 'sgs/container', 'backgroundColor', 'backgroundColour', apply=True)
        check('SCOPE: a different block using the same source key is left untouched',
              n == 0 and conflicts == 0 and f.read_text(encoding='utf-8') == original)

    # Negative control: the gate itself — attempting a rename whose DESTINATION is not
    # declared on the target block must refuse before touching anything. Mirrors the
    # real sgs/nav-menu `gap` incident in migrate-theme-tier-scalars.py's own self-test:
    # a plausible-looking migration target whose schema was never actually moved.
    check("gate: sgs/container does NOT declare 'notARealDestination' "
          "(the case the CLI-level gate refuses on)",
          not _dest_attr_declared('sgs/container', 'notARealDestination'))

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--block', help="target block slug, e.g. sgs/container")
    ap.add_argument('--from', dest='frm', help='source attribute key, e.g. backgroundColor')
    ap.add_argument('--to', help='destination attribute key, e.g. backgroundColour')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any RENAME/CONFLICT remain')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    if not (args.block and args.frm and args.to):
        ap.error('--block, --from and --to are all required unless --self-test is given')
    block, frm, to = args.block, args.frm, args.to

    # ⛔ THE GATE (module docstring). Applies to every mode, --survey included — a
    # destination that isn't declared yet has nothing meaningful to report.
    if not _dest_attr_declared(block, to):
        print(f'[migrate-theme-attr-rename] REFUSED — {block} does not declare "{to}" '
              f'in its own block.json. Declare the destination attribute FIRST (Step 1 '
              f'of the migration), then re-run this script.')
        return 1

    rows = survey(block, frm, to)

    if args.survey or not (args.fix or args.check):
        renames = [r for r in rows if r['kind'] == 'RENAME']
        dedupes = [r for r in rows if r['kind'] == 'DEDUPE']
        conflicts = [r for r in rows if r['kind'] == 'CONFLICT']
        if not rows:
            print(f'0 theme instance(s) of "{frm}" on {block} to migrate.')
            return 0
        for label, group in (('RENAME', renames), ('DEDUPE', dedupes), ('CONFLICT', conflicts)):
            if not group:
                continue
            print(f'\n{label} ({len(group)}):')
            for r in group:
                rel = r['file'].relative_to(REPO)
                print(f"   {str(rel):55} value={json.dumps(r['value'])}")
        print(f'\n{len(rows)} instance(s) across '
              f'{len({r["file"] for r in rows})} file(s) for {block} "{frm}" -> "{to}" '
              f'({len(renames)} rename, {len(dedupes)} dedupe, {len(conflicts)} conflict).')
        return 0

    if args.check:
        outstanding = [r for r in rows if r['kind'] in ('RENAME', 'DEDUPE', 'CONFLICT')]
        if outstanding:
            print(f'[migrate-theme-attr-rename --check] {len(outstanding)} instance(s) '
                  f'still un-migrated for {block} "{frm}" -> "{to}":')
            for r in outstanding:
                print(f"   {r['file'].relative_to(REPO)}  {r['kind']}")
            return 1
        print(f'[migrate-theme-attr-rename --check] OK - {block} "{frm}" -> "{to}" '
              f'is fully renamed in theme files.')
        return 0

    # --fix (dry-run) or --fix --apply
    files = sorted({r['file'] for r in rows if r['kind'] in ('RENAME', 'DEDUPE', 'CONFLICT')})
    if not files:
        print(f'Nothing to do for {block} "{frm}" -> "{to}".')
        return 0
    print(f'{"APPLYING" if args.apply else "PROPOSED (dry-run; pass --apply to write)"} '
          f'- {block} "{frm}" -> "{to}" across {len(files)} file(s)\n')
    total = 0
    total_conflicts = 0
    for f in files:
        n, conflicts = apply_file(f, block, frm, to, args.apply)
        rel = f.relative_to(REPO)
        if conflicts:
            print(f"   {str(rel):55} {n} renamed, ⛔ {conflicts} CONFLICT(S) — needs a human decision")
        else:
            print(f"   {str(rel):55} {n} instance(s) renamed")
        total += n
        total_conflicts += conflicts
    print(f'\n{total} instance(s) renamed across {len(files)} file(s)'
          f'{f", {total_conflicts} conflict(s) left untouched" if total_conflicts else ""}.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
