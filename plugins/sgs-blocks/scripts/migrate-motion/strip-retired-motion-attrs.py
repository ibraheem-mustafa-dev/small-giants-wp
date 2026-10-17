#!/usr/bin/env python3
"""Strip retired motion attributes from a site's stored block content (Spec 38A M6.6).

The sweep (`wp sgs motion-migrate`) moves every old motion setting it can into `sgsMotion` and REPORTS, then leaves in
place, a value it cannot map (an `effectHover` of `none`, a drawer slide the model cannot mirror, ...). Once a removal
group deletes those attributes' declarations, the leftovers are undeclared: WordPress discards them on the next editor
save, and the deploy's stored-content audit (`audit-post-content-blocks.py`, run by `build-deploy.py`) refuses the
deploy. This tool removes exactly those leftovers, so the deploy can go ahead.

An attribute is stripped only when BOTH hold for the block it sits on:
  * the LOCAL block.json schemas (the code about to be deployed) do not declare it, judged by the audit's own
    `is_legit` (so support-injected and extension attributes count as declared), and
  * the motion catalogue (`migrate_motion.lookup`) names it as an old motion attribute of that block, or it is a
    renamed one (`migrate_motion.RENAMES`).
Anything else the audit flags is left for its own migration.

  python strip-retired-motion-attrs.py --target sandybrown                 # dry run: prints the plan
  python strip-retired-motion-attrs.py --target sandybrown --apply         # backs up, strips, verifies, saves
  python strip-retired-motion-attrs.py --target sandybrown --rollback <remote backup path>

`--apply` writes each changed post's content to `<site>/sgs-motion-backups/strip-retired-<time>.json` (outside the web
root) before any change, then for each post parses the blocks, removes the planned attributes, serialises, and saves
only when the result re-parses to the original tree minus exactly those attributes (otherwise the post is skipped and
reported). Exit codes: 0 done (or nothing to do), 1 a post failed verification or the rollback failed, 2 usage or
connection error.
"""
from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import shlex
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(HERE))

import deploy_common  # noqa: E402
import migrate_motion  # noqa: E402


def load_audit():
    spec = importlib.util.spec_from_file_location('audit_post_content_blocks', SCRIPTS / 'audit-post-content-blocks.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ssh(target: str, remote: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    use_alias = deploy_common.ssh_has_alias(deploy_common.SSH_ALIAS)
    return subprocess.run(deploy_common.ssh_base_cmd(use_alias) + [remote], input=stdin, capture_output=True, text=True,
                          encoding='utf-8', errors='replace', timeout=600)


def wp_root(target: str) -> str:
    return deploy_common.TARGETS[target]['wp_content'].rsplit('/wp-content', 1)[0]


def fetch_posts(target: str) -> list[dict]:
    skip = '|'.join(deploy_common.NON_BLOCK_POST_TYPES)
    remote = (f"cd {shlex.quote(wp_root(target))} && "
              f"types=$(wp post-type list --field=name | grep -Ev '^({skip})$' | paste -sd,) && "
              "wp post list --post_type=\"$types\" --post_status=any --fields=ID,post_type,post_content --format=json")
    out = ssh(target, remote)
    if out.returncode != 0:
        raise RuntimeError(f'post fetch failed (exit {out.returncode}): {out.stderr.strip()[:300]}')
    return json.loads(out.stdout[out.stdout.index('['):])


def plan(posts: list[dict]) -> dict[str, dict[str, list[str]]]:
    """{post id: {block name: [attribute, ...]}} for every retired motion attribute found."""
    audit = load_audit()
    schemas = audit.load_schemas()
    result: dict[str, dict[str, list[str]]] = {}
    for post in posts:
        for slug, attrs, _closing, _line, error in audit.harvest_blocks(post.get('post_content') or ''):
            schema = schemas.get(slug)
            if error or schema is None:
                continue
            for key in attrs:
                if audit.is_legit(key, schema['attrs']):
                    continue
                if migrate_motion.lookup(slug, key)[1] == 'found' or key in migrate_motion.RENAMES:
                    names = result.setdefault(str(post['ID']), {}).setdefault(slug, [])
                    if key not in names:
                        names.append(key)
    return result


PHP_APPLY = r"""
$plan   = json_decode( base64_decode( '%PLAN%' ), true );
$dir    = dirname( untrailingslashit( ABSPATH ) ) . '/sgs-motion-backups';
wp_mkdir_p( $dir );
$backup = array();
foreach ( array_keys( $plan ) as $id ) {
	$backup[ $id ] = get_post_field( 'post_content', (int) $id, 'raw' );
}
$file = $dir . '/strip-retired-' . gmdate( 'Ymd-His' ) . '.json';
if ( false === file_put_contents( $file, wp_json_encode( $backup ) ) ) {
	WP_CLI::error( 'could not write the backup ' . $file );
}
WP_CLI::log( 'Backup: ' . $file );
$strip = static function ( array $blocks, array $by_block ) use ( &$strip ) {
	foreach ( $blocks as $i => $block ) {
		$names = $by_block[ $block['blockName'] ?? '' ] ?? array();
		foreach ( $names as $name ) {
			unset( $blocks[ $i ]['attrs'][ $name ] );
		}
		if ( ! empty( $blocks[ $i ]['innerBlocks'] ) ) {
			$blocks[ $i ]['innerBlocks'] = $strip( $blocks[ $i ]['innerBlocks'], $by_block );
		}
	}
	return $blocks;
};
$failed = 0;
foreach ( $plan as $id => $by_block ) {
	$old      = $backup[ $id ];
	$expected = $strip( parse_blocks( $old ), $by_block );
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
	WP_CLI::log( "post $id: stripped " . implode( ', ', array_map( static fn( $b, $n ) => $b . ' ' . implode( '/', $n ), array_keys( $by_block ), $by_block ) ) );
}
if ( $failed ) {
	WP_CLI::error( "$failed post(s) not written" );
}
WP_CLI::success( count( $plan ) . ' post(s) written. Roll back with --rollback=' . $file );
"""

PHP_ROLLBACK = r"""
$file = base64_decode( '%FILE%' );
$data = json_decode( (string) file_get_contents( $file ), true );
if ( ! is_array( $data ) ) {
	WP_CLI::error( 'unreadable backup ' . $file );
}
foreach ( $data as $id => $content ) {
	$saved = wp_update_post( array( 'ID' => (int) $id, 'post_content' => wp_slash( $content ) ), true );
	if ( is_wp_error( $saved ) ) {
		WP_CLI::error( "post $id: " . $saved->get_error_message() );
	}
}
WP_CLI::success( count( $data ) . ' post(s) restored.' );
"""


def run_php(target: str, php: str) -> int:
    remote = (f"cd {shlex.quote(wp_root(target))} && wp eval-file - --user=Claude && "
              "(wp litespeed-purge all >/dev/null 2>&1 || true)")
    out = ssh(target, remote, stdin='<?php\n' + php)
    sys.stdout.write(out.stdout)
    sys.stderr.write(out.stderr)
    return 0 if out.returncode == 0 else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('--target', required=True, choices=sorted(deploy_common.TARGETS))
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--rollback')
    args = ap.parse_args()
    if args.rollback:
        return run_php(args.target, PHP_ROLLBACK.replace('%FILE%', base64.b64encode(args.rollback.encode()).decode()))
    try:
        posts = fetch_posts(args.target)
    except (RuntimeError, ValueError, subprocess.SubprocessError, OSError) as e:
        print(f'[strip-retired] {e}', file=sys.stderr)
        return 2
    todo = plan(posts)
    types = {str(p['ID']): p.get('post_type') for p in posts}
    count = sum(len(n) for blocks in todo.values() for n in blocks.values())
    print(f'[strip-retired] {args.target}: {len(posts)} post(s) scanned, {len(todo)} to change, {count} block/attribute pair(s)')
    for pid, blocks in sorted(todo.items(), key=lambda kv: int(kv[0])):
        print(f'  {pid} ({types.get(pid)}): ' + '; '.join(f'{b} {", ".join(n)}' for b, n in blocks.items()))
    if not todo or not args.apply:
        return 0
    payload = base64.b64encode(json.dumps(todo).encode()).decode()
    return run_php(args.target, PHP_APPLY.replace('%PLAN%', payload))


if __name__ == '__main__':
    sys.exit(main())
