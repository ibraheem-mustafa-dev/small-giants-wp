<?php
/**
 * Fold a stored flat `gap` on sgs/nav-bar-menu and sgs/nav-drawer-menu into
 * its tier object (Wave 3C U-3, 2026-09-25): "gap":"28px" -> "gap":{"desktop":"28px"}.
 *
 * WHY: `gap` became `{"type":"object"}` on both blocks. WordPress validates a
 * stored attribute against its schema before render and substitutes the
 * default for a mismatch, so an un-migrated flat string silently renders the
 * default 8px. Run this on every site BEFORE it takes the deploy that carries
 * the type change.
 *
 * Only these two blocks and only `gap` are touched. Each matching block
 * comment's attributes are decoded, `gap` is wrapped, and the comment is
 * re-encoded with WordPress's own serialize_block_attributes(), so no other
 * key is reformatted. Revisions are skipped.
 *
 * Usage (on the server, from the WordPress root):
 *   wp eval-file migrate-nav-gap-tier.php          dry run: lists what would change
 *   wp eval-file migrate-nav-gap-tier.php apply    writes the changes
 *   wp eval-file migrate-nav-gap-tier.php check    exit 1 while any flat gap remains
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_mode = isset( $args[0] ) ? (string) $args[0] : 'dry';

/**
 * Rewrite every flat gap in one post's content.
 *
 * @param string $content Post content.
 * @param int    $count   Folds made (by reference).
 * @return string Content with every flat gap folded.
 */
function sgs_migrate_nav_gap_content( string $content, int &$count ): string {
	return (string) preg_replace_callback(
		'/<!-- wp:(sgs\/nav-(?:bar|drawer)-menu) (\{.*?\}) (\/)?-->/',
		static function ( array $m ) use ( &$count ): string {
			$attrs = json_decode( $m[2], true );
			if ( ! is_array( $attrs ) || ! isset( $attrs['gap'] ) || ! is_string( $attrs['gap'] ) ) {
				return $m[0];
			}
			$attrs['gap'] = '' === $attrs['gap'] ? array() : array( 'desktop' => $attrs['gap'] );
			++$count;
			return '<!-- wp:' . $m[1] . ' ' . serialize_block_attributes( $attrs ) . ' ' . ( isset( $m[3] ) && '/' === $m[3] ? '/' : '' ) . '-->';
		},
		$content
	);
}

global $wpdb;
$sgs_ids = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT ID FROM {$wpdb->posts} WHERE post_type <> %s AND post_content REGEXP %s",
		'revision',
		'wp:sgs/nav-(bar|drawer)-menu [^>]*"gap":"'
	)
);

$sgs_total = 0;
foreach ( $sgs_ids as $sgs_id ) {
	$sgs_post  = get_post( (int) $sgs_id );
	$sgs_count = 0;
	$sgs_new   = sgs_migrate_nav_gap_content( (string) $sgs_post->post_content, $sgs_count );
	if ( 0 === $sgs_count ) {
		continue;
	}
	$sgs_total += $sgs_count;
	WP_CLI::log( sprintf( '%s post %d (%s, "%s"): %d flat gap(s)', 'apply' === $sgs_mode ? 'Folded' : 'Would fold', $sgs_post->ID, $sgs_post->post_type, $sgs_post->post_title, $sgs_count ) );
	if ( 'apply' === $sgs_mode ) {
		// wp_slash: wp_update_post strips one level of backslashes, which would
		// corrupt escaped characters inside block JSON.
		wp_update_post(
			wp_slash(
				array(
					'ID'           => $sgs_post->ID,
					'post_content' => $sgs_new,
				)
			)
		);
	}
}

if ( 'check' === $sgs_mode && $sgs_total > 0 ) {
	WP_CLI::error( sprintf( '%d flat gap(s) remain.', $sgs_total ) );
}
WP_CLI::success( sprintf( '%d flat gap(s) %s.', $sgs_total, 'apply' === $sgs_mode ? 'folded' : 'found' ) );
