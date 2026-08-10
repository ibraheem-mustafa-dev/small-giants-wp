#!/usr/bin/env bash
# census-tier-siblings.sh
#
# Re-runnable census of per-device tier-sibling attribute instances
# (e.g. "gapTablet":, "paddingMobile":) across four post-content surfaces:
# wp_block, wp_global_styles, autosaves, and revisions.
#
# WHY: the trio-to-object migration (gap/gapTablet/gapMobile -> object attr)
# deletes old-shape canary PAGES but does not reach wp_block reusable blocks,
# wp_global_styles, autosaves, or revisions. This script gives each later
# migration pass a one-command count instead of a manual SQL session.
#
# ⛔ Read-only. Never issues UPDATE/DELETE against the remote site.
#
# Usage:
#   ./census-tier-siblings.sh
#   SGS_SSH_TARGET=user@host SGS_SSH_PORT=1234 SGS_SITE_PATH=path/to/webroot ./census-tier-siblings.sh
#
# Env vars (all optional, default to the sandybrown canary per dev-setup.md):
#   SGS_SSH_KEY     - path to SSH private key (default: ~/.ssh/id_ed25519)
#   SGS_SSH_TARGET  - user@host (default: u945238940@141.136.39.73)
#   SGS_SSH_PORT    - SSH port (default: 65002)
#   SGS_SITE_PATH   - remote path to the WordPress webroot containing wp-cli.yml
#                     / wp-load.php, relative to the SSH login's home dir
#                     (default: domains/sandybrown-nightingale-600381.hostingersite.com/public_html)
#
# Exit codes:
#   0 - census completed AND the positive control confirmed the pipeline works
#   1 - positive control returned 0 (pipeline broken - do not trust any zero above it)
#   2 - SSH/wp-cli transport failure (could not run the remote census at all)

set -euo pipefail

SSH_KEY="${SGS_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_TARGET="${SGS_SSH_TARGET:-u945238940@141.136.39.73}"
SSH_PORT="${SGS_SSH_PORT:-65002}"
SITE_PATH="${SGS_SITE_PATH:-domains/sandybrown-nightingale-600381.hostingersite.com/public_html}"

REMOTE_PHP_PATH="/tmp/census-tier-siblings-$$.php"

# The PHP payload runs remotely via `wp eval-file`. It queries wp_posts directly
# (read-only SELECTs only) and does the regex counting in PHP rather than MySQL
# REGEXP, so we get proper per-attribute-name capture groups.
PHP_PAYLOAD=$(cat <<'PHP_EOF'
<?php
global $wpdb;

// Matches a JSON object key inside a block-comment attribute blob whose name
// ends in Tablet or Mobile, e.g. "gapTablet": , "paddingMobile":
$pattern = '/"([A-Za-z0-9_]+(?:Tablet|Mobile))"\s*:/';

function sgs_census_surface( $wpdb, $label, $where, $pattern ) {
	$sql  = "SELECT post_content FROM {$wpdb->posts} WHERE $where";
	$rows = $wpdb->get_results( $sql );

	$post_count      = is_array( $rows ) ? count( $rows ) : 0;
	$total_instances = 0;
	$attr_counts     = array();

	if ( is_array( $rows ) ) {
		foreach ( $rows as $row ) {
			if ( preg_match_all( $pattern, (string) $row->post_content, $m ) ) {
				foreach ( $m[1] as $attr ) {
					$total_instances++;
					if ( ! isset( $attr_counts[ $attr ] ) ) {
						$attr_counts[ $attr ] = 0;
					}
					$attr_counts[ $attr ]++;
				}
			}
		}
	}

	echo "=== SURFACE: $label ===\n";
	echo "where_clause: $where\n";
	echo "posts_scanned: $post_count\n";
	echo "total_instances: $total_instances\n";
	arsort( $attr_counts );
	foreach ( $attr_counts as $attr => $count ) {
		echo "  $attr: $count\n";
	}
	echo "\n";

	return $total_instances;
}

$surfaces = array(
	'wp_block'         => "post_type='wp_block'",
	'wp_global_styles' => "post_type='wp_global_styles'",
	'autosave'         => "post_name LIKE '%-autosave-%'",
	'revision'         => "post_type='revision'",
);

$results = array();
foreach ( $surfaces as $label => $where ) {
	$results[ $label ] = sgs_census_surface( $wpdb, $label, $where, $pattern );
}

// POSITIVE CONTROL: post_type='page' AND post_status='publish' is a surface
// verified non-zero for tier-sibling attributes at build time of this script
// (28 matching pages on the sandybrown canary, 2026-08-10). If this returns 0,
// the query/regex pipeline itself is broken and every zero above is worthless -
// fail loudly rather than report a clean-looking zero.
$control_where = "post_type='page' AND post_status='publish'";
$control       = sgs_census_surface( $wpdb, 'POSITIVE_CONTROL(page/publish)', $control_where, $pattern );

echo "=== SUMMARY ===\n";
foreach ( $results as $label => $count ) {
	echo "$label: $count\n";
}
echo "positive_control(page/publish): $control\n";

if ( 0 === $control ) {
	fwrite( STDERR, "POSITIVE CONTROL FAILED: page/publish surface returned 0 tier-sibling instances.\n" );
	fwrite( STDERR, "The query/regex pipeline is broken - do NOT trust the zeros reported above.\n" );
	exit( 1 );
}

exit( 0 );
PHP_EOF
)

PHP_B64=$(printf '%s' "$PHP_PAYLOAD" | base64 | tr -d '\n')

set +e
ssh -i "$SSH_KEY" -p "$SSH_PORT" "$SSH_TARGET" \
	"cd '$SITE_PATH' && echo '$PHP_B64' | base64 -d > '$REMOTE_PHP_PATH' && wp eval-file '$REMOTE_PHP_PATH'; RC=\$?; rm -f '$REMOTE_PHP_PATH'; exit \$RC"
RC=$?
set -e

if [ "$RC" -ge 128 ] || [ "$RC" -eq 255 ]; then
	echo "TRANSPORT FAILURE: ssh/wp-cli did not complete (exit $RC). Check SGS_SSH_TARGET/SGS_SSH_PORT/SGS_SITE_PATH." >&2
	exit 2
fi

exit "$RC"
