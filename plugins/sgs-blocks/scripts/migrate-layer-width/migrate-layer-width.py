#!/usr/bin/env python3
"""Move the Floating layer's stored width to the length shape on a site (Spec 02 FR-2-6).

`sgs/decorative-image` now holds `width` and `maxWidth` as per-device lengths through the shared length control;
`widthUnit` and `maxWidthPercent` are gone. Stored layers still carrying them make the deploy's stored-content audit
(`audit-post-content-blocks.py`, run by `build-deploy.py`) refuse the deploy, and a width held as a bare number reads as
a spacing preset where it matches one (40 would print var(--wp--preset--spacing--40)). Run this on every site before
deploying the change. The rule for each layer is `transform.php::sgs_migrate_layer_width_attrs` (tested by
tests/php/LayerWidthMigrationTest.php); this script finds the posts and runs it there.

  python migrate-layer-width.py --target sandybrown                 # dry run: prints the plan
  python migrate-layer-width.py --target sandybrown --apply         # backs up, rewrites, verifies, saves
  python migrate-layer-width.py --target sandybrown --rollback <remote backup path>

`--apply` writes each planned post's content to `<site>/sgs-motion-backups/layer-width-<time>.json` (outside the web
root) before any change, then rewrites every `sgs/decorative-image` block of the post and saves only when the result
re-parses to the planned tree (otherwise the post is skipped and reported). Exit codes: 0 done (or nothing to do),
1 a post failed verification or the rollback failed, 2 usage or connection error. The local mirrors take the change
from their test site at their next refresh.
"""
from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / 'migrate-motion'))

import deploy_common  # noqa: E402

BLOCK = 'sgs/decorative-image'


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


STRIP = load('strip_retired_motion_attrs', SCRIPTS / 'migrate-motion' / 'strip-retired-motion-attrs.py')
AUDIT = load('audit_post_content_blocks', SCRIPTS / 'audit-post-content-blocks.py')


def is_number(value) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        try:
            float(value)
            return True
        except ValueError:
            return False
    return False


def needed(attrs: dict) -> bool:
    """The Python twin of transform.php::sgs_migrate_layer_width_needed."""
    if 'widthUnit' in attrs or 'maxWidthPercent' in attrs:
        return True
    width = attrs.get('width')
    return isinstance(width, dict) and any(is_number(v) for v in width.values())


def plan(posts: list[dict]) -> dict[str, int]:
    """{post id: number of layers to rewrite}."""
    out: dict[str, int] = {}
    for post in posts:
        for slug, attrs, _closing, _line, error in AUDIT.harvest_blocks(post.get('post_content') or ''):
            if not error and slug == BLOCK and needed(attrs):
                out[str(post['ID'])] = out.get(str(post['ID']), 0) + 1
    return out


PHP_APPLY = r"""
$ids    = json_decode( base64_decode( '%PLAN%' ), true );
$dir    = dirname( untrailingslashit( ABSPATH ) ) . '/sgs-motion-backups';
wp_mkdir_p( $dir );
$backup = array();
foreach ( $ids as $id ) {
	$backup[ $id ] = get_post_field( 'post_content', (int) $id, 'raw' );
}
$file = $dir . '/layer-width-' . gmdate( 'Ymd-His' ) . '.json';
if ( false === file_put_contents( $file, wp_json_encode( $backup ) ) ) {
	WP_CLI::error( 'could not write the backup ' . $file );
}
WP_CLI::log( 'Backup: ' . $file );
$move = static function ( array $blocks ) use ( &$move ) {
	foreach ( $blocks as $i => $block ) {
		if ( 'sgs/decorative-image' === ( $block['blockName'] ?? '' ) ) {
			$blocks[ $i ]['attrs'] = sgs_migrate_layer_width_attrs( $block['attrs'] ?? array() );
		}
		if ( ! empty( $blocks[ $i ]['innerBlocks'] ) ) {
			$blocks[ $i ]['innerBlocks'] = $move( $blocks[ $i ]['innerBlocks'] );
		}
	}
	return $blocks;
};
$failed = 0;
foreach ( $ids as $id ) {
	$expected = $move( parse_blocks( $backup[ $id ] ) );
	$new      = serialize_blocks( $expected );
	if ( wp_json_encode( parse_blocks( $new ) ) !== wp_json_encode( $expected ) ) {
		WP_CLI::warning( "post $id: the rewritten content does not re-parse to the planned tree; skipped" );
		++$failed;
		continue;
	}
	$saved = wp_update_post( array( 'ID' => (int) $id, 'post_content' => wp_slash( $new ) ), true );
	if ( is_wp_error( $saved ) ) {
		WP_CLI::warning( "post $id: " . $saved->get_error_message() );
		++$failed;
		continue;
	}
	WP_CLI::log( "post $id: layer width moved to lengths" );
}
if ( $failed ) {
	WP_CLI::error( "$failed post(s) not written" );
}
WP_CLI::success( count( $ids ) . ' post(s) written. Roll back with --rollback=' . $file );
"""


def transform_php() -> str:
    """transform.php without its opening tag, to prepend to the WP-CLI script."""
    return (HERE / 'transform.php').read_text(encoding='utf-8').replace('<?php', '', 1)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('--target', required=True, choices=sorted(deploy_common.TARGETS))
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--rollback')
    args = ap.parse_args()
    if args.rollback:
        return STRIP.run_php(args.target, STRIP.PHP_ROLLBACK.replace('%FILE%', base64.b64encode(args.rollback.encode()).decode()))
    try:
        posts = STRIP.fetch_posts(args.target)
    except (RuntimeError, ValueError, subprocess.SubprocessError, OSError) as e:
        print(f'[layer-width] {e}', file=sys.stderr)
        return 2
    todo = plan(posts)
    types = {str(p['ID']): p.get('post_type') for p in posts}
    print(f'[layer-width] {args.target}: {len(posts)} post(s) scanned, {len(todo)} to change, {sum(todo.values())} layer(s)')
    for pid, n in sorted(todo.items(), key=lambda kv: int(kv[0])):
        print(f'  {pid} ({types.get(pid)}): {n} layer(s)')
    if not todo or not args.apply:
        return 0
    payload = base64.b64encode(json.dumps(sorted(todo, key=int)).encode()).decode()
    return STRIP.run_php(args.target, transform_php() + PHP_APPLY.replace('%PLAN%', payload))


if __name__ == '__main__':
    sys.exit(main())
