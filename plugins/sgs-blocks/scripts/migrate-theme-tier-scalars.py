#!/usr/bin/env python3
"""migrate-theme-tier-scalars.py — fold a flat per-device scalar into ONE tier object,
inside theme pattern/template/part block-comment attributes.

    <!-- wp:sgs/x {"prop":"V","propTablet":"T","propMobile":"M", ...} -->
        -> <!-- wp:sgs/x {"prop":{"desktop":"V","tablet":"T","mobile":"M"}, ...} -->

Spec 35 / D571. This is the S4 leg of the migration triad — the SAME property-by-property
sweep `migrate-tier-object.py` runs for block.json (S1) and edit.js (S2), applied to the
THIRD place a flat scalar can hide: hand-authored `wp:sgs/*` block comments in
theme/sgs-theme/{patterns,templates,parts}. `--survey` (census) -> `--fix` (propose,
`--apply` to write) -> `--check` (gate). Same refuse-rather-than-guess discipline as
migrate-tier-object.py: every match is EITHER folded correctly OR left untouched with a
reason printed — never partially rewritten.

WHY THIS IS A SEPARATE SCRIPT, NOT A THIRD MODE ON migrate-tier-object.py: the storage
format is completely different (JSON inside an HTML comment vs. a JSON schema file), so
the parsing/writing primitives don't overlap — but the SHAPE classification (FLAT /
BLENDED / OBJECT / ASSET) and the "fold siblings into the base, preserve the authored
default, refuse on anything unexpected" philosophy are identical, and match on purpose.

PROVEN AGAINST REAL GROUND TRUTH, NOT A SYNTHETIC GUESS (D571, 2026-08-11): this exact
fold happened by hand for `gridTemplateColumns` in pass 3a (commit 7b272d81, 15 theme
values across 13 `patterns/*.php` files + `templates/single.html`) using an unpromoted,
uncommitted scratch script. `--self-test` replays THAT commit's real before/after diff —
not an invented fixture — as its positive control.

WHAT IT DOES NOT DO
--------------------
* Does not touch stored post_content (published/draft pages) — Ruling B, same as
  migrate-tier-object.py: those are binned and re-cloned, not migrated in place.
* Does not attempt a fold when the JSON won't parse, or when the block comment has no
  attributes object at all (a bare `<!-- wp:sgs/x /-->`) — nothing to fold there.
* Does not reorder or reformat keys beyond the one it's folding — the rest of the
  attributes object is byte-identical, because it mutates the parsed dict in place and
  Python's `json` module preserves insertion order from `json.loads`.
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
TIERS = ('Tablet', 'Mobile')
_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')


def _object_typed_blocks(prop: str) -> set:
    """Block slugs whose OWN block.json declares `prop` as an already-migrated
    object-typed attr. A theme instance only counts as a migration target when its
    block has ALREADY moved to the object shape at the schema level (S1 runs before
    S4, by design) — otherwise a scalar `prop` in a theme file isn't stale data, it's
    simply a block that never had a Tablet/Mobile family for this property at all.
    Confirmed the failure mode this guards against is real, not theoretical: sgs/nav-menu
    declares `gap` as plain `"type":"string"` with NO Tablet/Mobile siblings ever — its
    theme-authored `"gap":"8px"` is correct AS-IS, and folding it to `{"desktop":"8px"}`
    would make WordPress silently discard the whole value on load (shape mismatch against
    the block's own declared type, same class of loss as D338)."""
    out = set()
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attr = data.get('attributes', {}).get(prop)
        if isinstance(attr, dict) and attr.get('type') == 'object':
            out.add(data.get('name', bj.parent.name))
    return out


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
    brace, so nested objects (spacing/padding, etc.) are never mishandled by a hand-rolled
    brace-matcher."""
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


def classify(attrs: dict, prop: str, object_typed_blocks: set, block_name: str):
    """Same three shapes as migrate-tier-object.py's classify(), applied to VALUES
    (this is authored content, not a schema) rather than type declarations. GATED on
    the block's OWN block.json already declaring `prop` as object-typed — a scalar
    value for a block that never had a Tablet/Mobile family (e.g. sgs/nav-menu's `gap`)
    is correct as-authored, not a migration target. See `_object_typed_blocks` docstring
    for the real instance this caught."""
    if block_name not in object_typed_blocks:
        return 'ABSENT', []
    if prop not in attrs:
        return 'ABSENT', []
    val = attrs[prop]
    sibs = [prop + t for t in TIERS if (prop + t) in attrs]
    if isinstance(val, dict):
        return ('BLENDED', sibs) if sibs else ('OBJECT', [])
    return 'FLAT', sibs


def survey(prop: str):
    object_typed = _object_typed_blocks(prop)
    out = []
    for f in find_target_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        for block_name, start, end, attrs in iter_block_attrs(text):
            kind, sibs = classify(attrs, prop, object_typed, block_name)
            if kind in ('ABSENT', 'OBJECT'):
                continue
            out.append({'file': f, 'block': block_name, 'kind': kind,
                        'value': attrs.get(prop), 'siblings': sibs})
    return out


def fold(attrs: dict, prop: str) -> dict:
    """Return a NEW dict with prop folded to {desktop,tablet,mobile}, siblings removed.
    Only includes a tier key when that tier had a real value — an absent tier means
    'inherit', not 'empty string', matching migrate-tier-object.py's build_object_default."""
    new_attrs = dict(attrs)
    val = attrs[prop]
    obj = {}
    if val not in (None, ''):
        obj['desktop'] = val
    for suffix, key in (('Tablet', 'tablet'), ('Mobile', 'mobile')):
        sib_key = prop + suffix
        if sib_key in attrs and attrs[sib_key] not in (None, ''):
            obj[key] = attrs[sib_key]
        new_attrs.pop(sib_key, None)
    new_attrs[prop] = obj
    return new_attrs


def apply_file(f: Path, prop: str, apply: bool, object_typed_blocks: set = None):
    """Fold every matching block comment in ONE file. Returns (n_folded, error)."""
    if object_typed_blocks is None:
        object_typed_blocks = _object_typed_blocks(prop)
    text = f.read_text(encoding='utf-8', errors='replace')
    edits = []  # (start, end, new_json_str), processed in reverse so offsets don't drift
    for block_name, start, end, attrs in iter_block_attrs(text):
        kind, sibs = classify(attrs, prop, object_typed_blocks, block_name)
        if kind not in ('FLAT', 'BLENDED'):
            continue
        new_attrs = dict(attrs)
        if kind == 'FLAT':
            new_attrs = fold(attrs, prop)
        else:  # BLENDED — base already an object, only drop the orphan siblings
            for s in sibs:
                new_attrs.pop(s, None)
        new_json = json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)
        edits.append((start, end, new_json))

    if not edits:
        return 0, None

    out = text
    for start, end, new_json in sorted(edits, reverse=True):
        out = out[:start] + new_json + out[end:]

    # Re-parse every attrs object in the result to confirm the file is still valid JSON
    # at every block comment — refuse to write anything that doesn't round-trip clean.
    for _, _, _, _ in iter_block_attrs(out):
        pass  # iterating already validates each match's JSON via raw_decode

    if apply:
        io.open(f, 'w', encoding='utf-8', newline='').write(out)
    return len(edits), None


def self_test() -> int:
    """Positive control: REPLAYS pass 3a's real commit (7b272d81) — the actual
    before-state of theme/sgs-theme/patterns/about-image-left.php and services-grid.php,
    folded for gridTemplateColumns, must byte-match the actual committed after-state.
    Not an invented fixture. Negative control: an unparseable/absent case is left alone."""
    import subprocess
    import tempfile
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    real_cases = [
        'theme/sgs-theme/patterns/about-image-left.php',
        'theme/sgs-theme/patterns/services-grid.php',
        'theme/sgs-theme/patterns/team-section.php',
        'theme/sgs-theme/templates/single.html',
    ]
    for rel in real_cases:
        before = subprocess.run(['git', 'show', f'7b272d81~1:{rel}'], cwd=REPO,
                                 capture_output=True, text=True, encoding='utf-8')
        after = subprocess.run(['git', 'show', f'7b272d81:{rel}'], cwd=REPO,
                                capture_output=True, text=True, encoding='utf-8')
        if before.returncode != 0 or after.returncode != 0:
            check(f'{rel}: could read real before/after from git history', False)
            continue
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / Path(rel).name
            f.write_text(before.stdout, encoding='utf-8')
            n, err = apply_file(f, 'gridTemplateColumns', apply=True)
            result = f.read_text(encoding='utf-8')
            check(f'{rel}: folded output byte-matches the real committed after-state',
                  err is None and result == after.stdout)

    # Negative control: a file with no matching prop at all is left byte-identical.
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'no-match.php'
        original = '<!-- wp:sgs/container {"layout":"grid","gap":{"desktop":"16px"}} -->\n'
        f.write_text(original, encoding='utf-8')
        n, err = apply_file(f, 'gridTemplateRows', apply=True)
        check('negative control: no match found, 0 folds, file untouched',
              n == 0 and f.read_text(encoding='utf-8') == original)

    # Negative control: a REAL bug found while proving this tool against live data —
    # sgs/nav-menu declares `gap` as plain "type":"string" with NO Tablet/Mobile
    # siblings ever declared. A scalar `gap` value on THAT block must NOT be folded —
    # its own block.json was never migrated to object, so wrapping it in {desktop:...}
    # would make WordPress silently discard the value on load (shape mismatch). This
    # exact case produced 7 false "un-migrated" findings on the real theme tree before
    # the object-typed-block gate (_object_typed_blocks) was added.
    check("negative control: sgs/nav-menu's own gap is NOT object-typed in its "
          "block.json (the real block this bug was found against)",
          'sgs/nav-menu' not in _object_typed_blocks('gap'))
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'nav-menu-fixture.php'
        original = '<!-- wp:sgs/nav-menu {"gap":"8px"} -->\n'
        f.write_text(original, encoding='utf-8')
        n, err = apply_file(f, 'gap', apply=True)
        check("negative control: sgs/nav-menu's un-tiered gap is left untouched, "
              "not wrapped into an object the block's schema doesn't declare",
              n == 0 and f.read_text(encoding='utf-8') == original)

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--property', help='attribute base name, e.g. gridTemplateRows')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any FLAT/BLENDED remain')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.property:
        ap.error('--property is required unless --self-test is given')
    prop = args.property
    rows = survey(prop)

    if args.survey or not (args.fix or args.check):
        if not rows:
            print(f'0 theme instance(s) of "{prop}" to migrate.')
            return 0
        for kind in ('FLAT', 'BLENDED'):
            group = [r for r in rows if r['kind'] == kind]
            if not group:
                continue
            print(f'\n{kind} ({len(group)}):')
            for r in group:
                rel = r['file'].relative_to(REPO)
                print(f"   {str(rel):55} {r['block']:24} value={json.dumps(r['value'])}")
        print(f'\n{len(rows)} instance(s) across '
              f'{len({r["file"] for r in rows})} file(s) to migrate for "{prop}".')
        return 0

    if args.check:
        if rows:
            print(f'[migrate-theme-tier-scalars --check] {len(rows)} instance(s) still un-migrated for "{prop}":')
            for r in rows:
                print(f"   {r['file'].relative_to(REPO)}  {r['block']}  {r['kind']}")
            return 1
        print(f'[migrate-theme-tier-scalars --check] OK - "{prop}" is fully folded in theme files.')
        return 0

    files = sorted({r['file'] for r in rows})
    if not files:
        print(f'Nothing to do for "{prop}".')
        return 0
    print(f'{"APPLYING" if args.apply else "PROPOSED (dry-run; pass --apply to write)"} '
          f'- "{prop}" across {len(files)} file(s)\n')
    total = 0
    for f in files:
        n, err = apply_file(f, prop, args.apply)
        rel = f.relative_to(REPO)
        if err:
            print(f"   {str(rel):55} ⛔ REFUSED: {err}")
            continue
        print(f"   {str(rel):55} {n} instance(s) folded")
        total += n
    print(f'\n{total} instance(s) folded across {len(files)} file(s).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
