#!/usr/bin/env python3
"""Move stored easing names to the CSS-keyword vocabulary (Bean, 2026-10-18).

A name that looks like a CSS easing keyword means exactly that keyword. The shared easing enum used to call the house
curve `ease-out` and the browser keyword `ease-out-css`; it now has `ease-out` (the keyword) and `emphasised` (the house
curve). Content saved before the change stores the old names, and a value outside a block.json enum is coerced to the
attribute's default on render, so every stored value must be rewritten once:

    ease-out-css  ->  ease-out      (the keyword keeps its look)
    ease-out      ->  emphasised    (the house curve keeps its look)

TARGET SHAPE (settled by Bean's ruling): the nav vocabulary in `includes/helpers-motion-easing.php::sgs_motion_easing_values`.

  python sweep-easing-vocabulary.py --survey [--json]            code census: which block.json attributes carry the vocabulary
  python sweep-easing-vocabulary.py --survey --target <site>     adds the read-only count of stored values per attribute
  python sweep-easing-vocabulary.py --apply --target <site>      backs up each post to .claude/backups/2026-10-18-s7/<site>/<id>.txt,
                                                                 rewrites it over SSH (wp-cli, wp_slash) and verifies the re-parsed tree
  python sweep-easing-vocabulary.py --fix                        prints the rewrite plan for the code (nothing to rewrite: the code is already moved)
  python sweep-easing-vocabulary.py --check                      exit 1 if the removed name survives in code, a nav enum lacks `emphasised`,
                                                                 or a stored-content attribute is not declared in block.json
  python sweep-easing-vocabulary.py --self-test

The two renames overlap (`ease-out` is both an old and a new name), so the rewrite is NOT safe to repeat on content that has
already been swept. A post with an `<id>.easing-swept` marker beside its backup is skipped as "already swept".
"""
from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import re
import shlex
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent.parent
REPO = PLUGIN.parent.parent
BACKUPS = REPO / '.claude' / 'backups' / '2026-10-18-s7'
sys.path.insert(0, str(HERE.parent))

OLD_TO_NEW = {'ease-out-css': 'ease-out', 'ease-out': 'emphasised'}
REMOVED = 'ease-out-css'
NAV_MARK = 'quart-out'  # an enum holding this is a nav-vocabulary enum

# Free-text attributes that store a nav-vocabulary name without declaring the enum.
FREE_STRING = {
    'sgs/cart': ['panelSlideEasing'],
    'sgs/nav-bar-menu': ['scrimFadeEasing'],
    'sgs/site-header-row': ['rowShrinkEasing'],
    'sgs/site-footer-row': ['rowShrinkEasing'],
}

# Code places allowed to keep the removed name: they read historical stored values and say so.
CODE_EXEMPT = (
    'includes/motion/migrate/',
    'tests/php/run-motion-map-nav-drawer-standalone.php',
    'tests/php/run-u5-motion-standalone.php',
    'tests/js/motion-atoms-values-state.test.js',
)

COMMENT_RE = re.compile(r'<!--\s+wp:([a-z0-9-]+/[a-z0-9-]+)\s+(\{.*?\})\s*(/?)-->', re.DOTALL)


def nav_attrs(blocks_dir: Path) -> dict[str, list[str]]:
    """{block name: [attribute, ...]} read from block.json: enum attributes in the nav vocabulary plus FREE_STRING."""
    found: dict[str, list[str]] = {}
    for path in sorted(blocks_dir.glob('*/block.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        name = data.get('name', '')
        for key, node in (data.get('attributes') or {}).items():
            enum = node.get('enum') if isinstance(node, dict) else None
            if isinstance(enum, list) and NAV_MARK in enum:
                found.setdefault(name, []).append(key)
    for name, keys in FREE_STRING.items():
        for key in keys:
            if key not in found.get(name, []):
                found.setdefault(name, []).append(key)
    return found


def rewrite_content(content: str, attr_map: dict[str, list[str]]) -> tuple[str, list[tuple[str, str, str, str]]]:
    """Rewrite old easing names inside the block comments of one post.

    Returns (new content, [(block, attribute, old, new)]). Only the quoted value after a declared attribute name inside the
    comment JSON of the block that owns it is touched; everything else is byte-identical.
    """
    changes: list[tuple[str, str, str, str]] = []

    def fix_comment(match: re.Match) -> str:
        block, body = match.group(1), match.group(2)
        keys = attr_map.get(block)
        if not keys:
            return match.group(0)
        for key in keys:
            pattern = re.compile(r'("' + re.escape(key) + r'"\s*:\s*")(' + '|'.join(map(re.escape, OLD_TO_NEW)) + r')(")')

            def swap(m: re.Match, key=key) -> str:
                changes.append((block, key, m.group(2), OLD_TO_NEW[m.group(2)]))
                return m.group(1) + OLD_TO_NEW[m.group(2)] + m.group(3)

            body = pattern.sub(swap, body)
        return match.group(0)[: match.start(2) - match.start(0)] + body + match.group(0)[match.end(2) - match.start(0):]

    return COMMENT_RE.sub(fix_comment, content), changes


def census(posts: list[dict], attr_map: dict[str, list[str]]) -> dict[str, dict]:
    """{post id: {'type': ..., 'changes': [...]}} for every post that stores an old name."""
    out: dict[str, dict] = {}
    for post in posts:
        _new, changes = rewrite_content(post.get('post_content') or '', attr_map)
        if changes:
            out[str(post['ID'])] = {'type': post.get('post_type'), 'changes': changes}
    return out


def stored_values(posts: list[dict], attr_map: dict[str, list[str]]) -> dict[str, int]:
    """Every stored value of a declared attribute, old or new (the survey's positive control: zero here means nothing is read)."""
    tally: dict[str, int] = {}
    for post in posts:
        for match in COMMENT_RE.finditer(post.get('post_content') or ''):
            for key in attr_map.get(match.group(1), []):
                for value in re.findall(r'"' + re.escape(key) + r'"\s*:\s*"([^"]*)"', match.group(2)):
                    label = f'{match.group(1)}.{key} = {value!r}'
                    tally[label] = tally.get(label, 0) + 1
    return tally


def load_strip():
    spec = importlib.util.spec_from_file_location('strip_retired', HERE / 'strip-retired-motion-attrs.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PHP_APPLY = r"""
$plan   = json_decode( base64_decode( '%PLAN%' ), true );
$map    = json_decode( base64_decode( '%MAP%' ), true );
$olds   = array( 'ease-out-css' => 'ease-out', 'ease-out' => 'emphasised' );
$swap   = static function ( array $blocks ) use ( &$swap, $map, $olds ) {
	foreach ( $blocks as $i => $block ) {
		foreach ( $map[ $block['blockName'] ?? '' ] ?? array() as $key ) {
			$v = $blocks[ $i ]['attrs'][ $key ] ?? null;
			if ( is_string( $v ) && isset( $olds[ $v ] ) ) {
				$blocks[ $i ]['attrs'][ $key ] = $olds[ $v ];
			}
		}
		if ( ! empty( $blocks[ $i ]['innerBlocks'] ) ) {
			$blocks[ $i ]['innerBlocks'] = $swap( $blocks[ $i ]['innerBlocks'] );
		}
	}
	return $blocks;
};
$failed = 0;
foreach ( $plan as $id => $row ) {
	$now = get_post_field( 'post_content', (int) $id, 'raw' );
	if ( md5( $now ) !== $row['old_md5'] ) {
		WP_CLI::warning( "post $id: changed since the survey; skipped" );
		++$failed;
		continue;
	}
	$expected = $swap( parse_blocks( $now ) );
	if ( wp_json_encode( parse_blocks( $row['new'] ) ) !== wp_json_encode( $expected ) ) {
		WP_CLI::warning( "post $id: the rewrite does not re-parse to the planned tree; skipped" );
		++$failed;
		continue;
	}
	$saved = wp_update_post( array( 'ID' => (int) $id, 'post_content' => wp_slash( $row['new'] ) ), true );
	if ( is_wp_error( $saved ) ) {
		WP_CLI::warning( "post $id: " . $saved->get_error_message() );
		++$failed;
		continue;
	}
	WP_CLI::log( "post $id: rewritten" );
}
if ( $failed ) {
	WP_CLI::error( "$failed post(s) not written" );
}
WP_CLI::success( count( $plan ) . ' post(s) written.' );
"""


def survey(target: str | None, as_json: bool) -> int:
    attr_map = nav_attrs(PLUGIN / 'src' / 'blocks')
    report: dict = {'attributes': attr_map, 'sites': {}}
    targets = [target] if target else []
    if targets:
        strip = load_strip()
        for site in targets:
            posts = strip.fetch_posts(site)
            todo = census(posts, attr_map)
            tally: dict[str, int] = {}
            for entry in todo.values():
                for block, key, old, new in entry['changes']:
                    label = f'{block}.{key}: {old} -> {new}'
                    tally[label] = tally.get(label, 0) + 1
            swept = sorted(p.name.split('.')[0] for p in (BACKUPS / site).glob('*.easing-swept')) if (BACKUPS / site).exists() else []
            report['sites'][site] = {
                'posts_scanned': len(posts),
                'posts_to_change': len(todo),
                'values': tally,
                'all_stored_values': stored_values(posts, attr_map),
                'posts': {pid: {'type': e['type'], 'values': [f'{b}.{k}={o}' for b, k, o, _ in e['changes']]} for pid, e in todo.items()},
                'already_swept_backups': swept,
            }
    if as_json:
        print(json.dumps(report, indent=2))
        return 0
    print('[sweep-easing] nav-vocabulary attributes declared in block.json (plus free-text ones):')
    for block, keys in sorted(attr_map.items()):
        print(f'  {block}: {", ".join(keys)}')
    for site, data in report['sites'].items():
        print(f'[sweep-easing] {site}: {data["posts_scanned"]} post(s) scanned, {data["posts_to_change"]} to change')
        for label, n in sorted(data['values'].items()):
            print(f'    {n:4d}  {label}')
        print(f'    all stored values of these attributes: {json.dumps(data["all_stored_values"])}')
        for pid, entry in sorted(data['posts'].items(), key=lambda kv: int(kv[0])):
            print(f'    post {pid} ({entry["type"]}): {", ".join(entry["values"])}')
        if data['already_swept_backups']:
            print(f'    already swept (backup present): {", ".join(data["already_swept_backups"])}')
    return 0


def apply(target: str) -> int:
    attr_map = nav_attrs(PLUGIN / 'src' / 'blocks')
    strip = load_strip()
    posts = strip.fetch_posts(target)
    folder = BACKUPS / target
    plan: dict[str, dict] = {}
    skipped: list[str] = []
    for post in posts:
        content = post.get('post_content') or ''
        new, changes = rewrite_content(content, attr_map)
        if not changes:
            continue
        pid = str(post['ID'])
        if (folder / f'{pid}.easing-swept').exists():
            skipped.append(pid)
            continue
        plan[pid] = {'old': content, 'new': new}
    print(f'[sweep-easing] {target}: {len(plan)} post(s) to rewrite, {len(skipped)} already swept (backup present): {", ".join(skipped)}')
    if not plan:
        return 0
    folder.mkdir(parents=True, exist_ok=True)
    import hashlib
    for pid, row in plan.items():
        # The backup is written before anything changes and is the "already swept" record.
        (folder / f'{pid}.txt').write_text(row['old'], encoding='utf-8', newline='')
        (folder / f'{pid}.easing-swept').write_text('written before the rewrite; its presence stops a second sweep of this post', encoding='utf-8')
        row['old_md5'] = hashlib.md5(row['old'].encode('utf-8')).hexdigest()
    payload = {pid: {'old_md5': r['old_md5'], 'new': r['new']} for pid, r in plan.items()}
    php = (PHP_APPLY
           .replace('%PLAN%', base64.b64encode(json.dumps(payload).encode()).decode())
           .replace('%MAP%', base64.b64encode(json.dumps(attr_map).encode()).decode()))
    return strip.run_php(target, php)


def code_hits() -> list[str]:
    """Every place in code that still names the removed value, outside the allowed historical readers."""
    hits: list[str] = []
    for root in ('src', 'includes', 'tests', 'scripts'):
        for path in (PLUGIN / root).rglob('*'):
            rel = path.relative_to(PLUGIN).as_posix()
            if (not path.is_file() or path.suffix not in ('.php', '.js', '.json', '.scss', '.css')
                    or rel.startswith(CODE_EXEMPT) or 'node_modules' in rel or '/build/' in rel
                    or rel.endswith('generated-motion-defs.json')):
                continue
            for number, line in enumerate(path.read_text(encoding='utf-8', errors='replace').splitlines(), 1):
                if REMOVED in line:
                    hits.append(f'{rel}:{number}')
    return hits


def check(blocks_dir: Path | None = None) -> list[str]:
    problems = [f'removed name `{REMOVED}` still in {h}' for h in code_hits() if not h.startswith('scripts/migrate-motion/sweep-easing-vocabulary.py')
                and not h.startswith('scripts/gates.json')]
    blocks_dir = blocks_dir or PLUGIN / 'src' / 'blocks'
    for path in sorted(blocks_dir.glob('*/block.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        for key, node in (data.get('attributes') or {}).items():
            enum = node.get('enum') if isinstance(node, dict) else None
            if isinstance(enum, list) and NAV_MARK in enum and 'emphasised' not in enum:
                problems.append(f'{path.parent.name}.{key}: a nav enum without `emphasised`')
    declared = nav_attrs(blocks_dir)
    for block, keys in FREE_STRING.items():
        slug = block.split('/', 1)[1]
        path = blocks_dir / slug / 'block.json'
        if not path.exists():
            continue
        attrs = json.loads(path.read_text(encoding='utf-8')).get('attributes') or {}
        for key in keys:
            if key not in attrs:
                problems.append(f'{block}.{key} is listed for the sweep but not declared in block.json')
    return problems


def self_test() -> int:
    failures: list[str] = []
    attr_map = {'sgs/nav-bar-menu': ['itemMotionEasing', 'scrimFadeEasing'], 'sgs/cart': ['panelSlideEasing']}
    old = ('<!-- wp:sgs/nav-bar-menu {"itemMotionEasing":"ease-out-css","scrimFadeEasing":"ease-out","other":"ease-out"} -->\n'
           '<!-- wp:sgs/cart {"panelSlideEasing":"ease-out"} /-->\n'
           '<!-- wp:sgs/button {"itemMotionEasing":"ease-out"} /-->\n'
           '<!-- wp:sgs/nav-bar-menu {"itemMotionEasing":"ease"} /-->')
    new, changes = rewrite_content(old, attr_map)
    if len(changes) != 3:
        failures.append(f'planted old values: expected 3 changes, got {changes}')
    expect = old.replace('"itemMotionEasing":"ease-out-css"', '"itemMotionEasing":"ease-out"').replace(
        '"scrimFadeEasing":"ease-out"', '"scrimFadeEasing":"emphasised"').replace('"panelSlideEasing":"ease-out"', '"panelSlideEasing":"emphasised"')
    if new != expect:
        failures.append('rewrite produced unexpected text:\n' + new)
    if '"other":"ease-out"' not in new or '<!-- wp:sgs/button {"itemMotionEasing":"ease-out"} /-->' not in new:
        failures.append('an undeclared key or an unrelated block was touched (negative control)')
    # The second pass is NOT a fixed point (ease-out is both an old and a new name): the guard is the backup record.
    again, again_changes = rewrite_content(new, attr_map)
    if not again_changes:
        failures.append('expected the overlapping rename to be detected as repeatable (the apply guard depends on it)')
    # Guarded idempotence: a post with a swept marker is skipped, so a repeated apply plans nothing.
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder / '7.easing-swept').write_text('x', encoding='utf-8')
        planned = [pid for pid in ('7',) if not (folder / f'{pid}.easing-swept').exists()]
        if planned:
            failures.append('a swept post would be rewritten again')
    # --check negative control: a temp block.json with a nav enum lacking `emphasised` must fail.
    with tempfile.TemporaryDirectory() as tmp:
        bad = Path(tmp) / 'demo'
        bad.mkdir()
        (bad / 'block.json').write_text(json.dumps({'name': 'sgs/demo', 'attributes': {'x': {'type': 'string', 'enum': ['ease', 'quart-out']}}}), encoding='utf-8')
        if not any('without `emphasised`' in p for p in check(Path(tmp))):
            failures.append('--check did not flag a nav enum without `emphasised`')
    for message in failures:
        print('[self-test] FAIL', message)
    print('[self-test]', 'FAILED' if failures else 'ok')
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--target', help='a deploy target (sandybrown, indus-test, eye-care-test, mamas-test)')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.check:
        problems = check()
        for p in problems:
            print('[sweep-easing]', p)
        print('[sweep-easing] check:', 'FAIL' if problems else 'ok')
        return 1 if problems else 0
    if args.apply:
        if not args.target:
            print('--apply needs --target', file=sys.stderr)
            return 2
        return apply(args.target)
    if args.fix:
        print('[sweep-easing] code is already on the new vocabulary; stored content is rewritten with --apply --target <site>')
        return 0
    if args.survey:
        try:
            return survey(args.target, args.json)
        except (RuntimeError, ValueError, OSError) as e:
            print(f'[sweep-easing] {e}', file=sys.stderr)
            return 2
    ap.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
