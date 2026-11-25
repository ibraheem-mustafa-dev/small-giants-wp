<?php
/**
 * WP-CLI sweep: the basket trigger's shared settings (one radius, size, padding and background for the icon button and the text pill).
 *
 * The cart block used to keep two settings for each of three properties of its one trigger element (the pill's `pillPadding`,
 * `pillMinHeight`, `pillBorderRadius` and `pillBgColour*`, and the icon button's `iconTriggerSize`, `iconTriggerRadius` and `iconBg*`).
 * The block now reads `triggerPadding`, `triggerSize` (`{desktop:{width,height},…}`), `triggerBorderRadius` and `triggerBgColour*`,
 * and nothing reads the old names (no `deprecated.js`, no fallback in render code: FP-14), so this moves every saved `sgs/cart`
 * delimiter across. The rewrite rules and what it reports are in `scripts/lib/cart-trigger-sweep.php`.
 *
 * What it touches: the `post_content` of every row in the posts table except revisions and auto drafts (pages, posts, `wp_template`,
 * `wp_template_part`, `wp_block` and the plugin's own post types), nested blocks included. Only a `sgs/cart` comment's JSON attributes
 * change, and only in a delimiter that holds an old name; every other byte of a post stays as it was. Posts are written with a direct
 * `$wpdb->update()` and a cache clean, so no kses or content filter touches any other block. Each written post is read back and its
 * block tree compared with the tree the old content gives after the same rewrite: a mismatch restores the old content and reports the post.
 *
 * Dry run by default: prints each post that would change, the values that cannot be kept (a radius or background the two styles
 * carried differently, one value per block remains), then the totals. `apply` writes. It is idempotent: a second run finds nothing.
 *
 * Run (`apply` is a positional word because eval-file passes those to the file):
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/sweep-cart-trigger-attrs.php --user=1          # dry run
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/sweep-cart-trigger-attrs.php apply --user=1    # write
 *   ... json                                                                                         # the counts as one JSON line
 * Back the database up first on a site that matters (`wp db export`); the sweep never writes without `apply`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) ) {
	exit;
}

require_once __DIR__ . '/lib/cart-trigger-sweep.php';

/**
 * Every sgs/cart block's attributes in a parsed tree, nested ones included, in document order; every other block is kept as its name.
 *
 * @param array $blocks parse_blocks() output.
 * @return array<int, array{name: string, attrs: array}>
 */
function sgs_cart_trigger_sweep_flatten( array $blocks ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		if ( ! empty( $block['blockName'] ) ) {
			$out[] = array(
				'name'  => (string) $block['blockName'],
				'attrs' => is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array(),
			);
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			$out = array_merge( $out, sgs_cart_trigger_sweep_flatten( $block['innerBlocks'] ) );
		}
	}
	return $out;
}

/**
 * Prove a written post: it parses, holds the same blocks in the same order, each sgs/cart's attributes are exactly the rewrite of the
 * old ones, every other block is untouched, and nothing outside the delimiters moved.
 *
 * @param string $before The content before the sweep.
 * @param string $after  The content as read back from the database.
 * @return string '' when it checks out, else what differs.
 */
function sgs_cart_trigger_sweep_prove( string $before, string $after ): string {
	$old = sgs_cart_trigger_sweep_flatten( parse_blocks( $before ) );
	$new = sgs_cart_trigger_sweep_flatten( parse_blocks( $after ) );
	if ( count( $old ) !== count( $new ) ) {
		return 'block count ' . count( $old ) . ' became ' . count( $new );
	}
	foreach ( $old as $i => $block ) {
		if ( $block['name'] !== $new[ $i ]['name'] ) {
			return 'block ' . $i . ' ' . $block['name'] . ' became ' . $new[ $i ]['name'];
		}
		$expect = 'sgs/cart' === $block['name'] ? sgs_cart_trigger_sweep_attrs( $block['attrs'] )['attrs'] : $block['attrs'];
		// Compare through JSON so key order and number types do not matter.
		$expect_json = wp_json_encode( $expect );
		$actual_json = wp_json_encode( $new[ $i ]['attrs'] );
		if ( json_decode( (string) $expect_json, true ) != json_decode( (string) $actual_json, true ) ) { // phpcs:ignore Universal.Operators.StrictComparisons.LooseNotEqual -- an associative array compared regardless of key order.
			return 'block ' . $i . ' ' . $block['name'] . ' attributes differ from the rewrite';
		}
	}
	$strip = static function ( string $c ): string {
		return (string) preg_replace( '#<!--(\s+)wp:([a-z0-9/-]+)(\s+)\{(?:(?!-->).)*?\}(\s+)(/?)-->#s', '<!--$1wp:$2$4$5-->', $c );
	};
	return $strip( $before ) === $strip( $after ) ? '' : 'content outside the block delimiters changed';
}

/**
 * Run the sweep.
 *
 * @param string[] $words The positional words of `wp eval-file`: `apply`, `json`.
 * @return void
 */
function sgs_cart_trigger_sweep_run( array $words ): void {
	global $wpdb;

	$apply     = in_array( 'apply', $words, true ) || '1' === getenv( 'SGS_SWEEP_APPLY' );
	$json_only = in_array( 'json', $words, true );

	$rows = $wpdb->get_results( 'SELECT ID, post_type, post_status, post_name, post_content FROM ' . $wpdb->posts . " WHERE post_type NOT IN ('revision','auto-draft') AND post_content LIKE '%wp:sgs/cart%' ORDER BY ID" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- a literal clause and core's table name.

	$totals  = array(
		'posts_scanned' => count( $rows ),
		'posts_changed' => 0,
		'blocks'        => 0,
		'keys'          => array(),
		'conflicts'     => array(),
		'written'       => 0,
		'failed'        => 0,
	);
	$by_type = array();
	foreach ( $rows as $row ) {
		$result = sgs_cart_trigger_sweep_content( (string) $row->post_content );
		if ( 0 === $result['changed'] ) {
			continue;
		}
		++$totals['posts_changed'];
		$totals['blocks']      += $result['changed'];
		$by_type[ $row->post_type ] = ( $by_type[ $row->post_type ] ?? 0 ) + 1;
		foreach ( $result['keys'] as $k => $n ) {
			$totals['keys'][ $k ] = ( $totals['keys'][ $k ] ?? 0 ) + $n;
		}
		foreach ( $result['conflicts'] as $line ) {
			$totals['conflicts'][] = '#' . $row->ID . ' ' . $row->post_name . ' ' . $line;
		}
		$status = '';
		if ( $apply ) {
			// Prove the new content before it is written, then write, read back and prove it again; a failure puts the old content back.
			$proof = sgs_cart_trigger_sweep_prove( (string) $row->post_content, $result['content'] );
			if ( '' !== $proof ) {
				++$totals['failed'];
				$status = 'NOT WRITTEN (' . $proof . ')';
			} else {
				$wpdb->update( $wpdb->posts, array( 'post_content' => $result['content'] ), array( 'ID' => (int) $row->ID ) );
				clean_post_cache( (int) $row->ID );
				$read  = (string) $wpdb->get_var( $wpdb->prepare( 'SELECT post_content FROM ' . $wpdb->posts . ' WHERE ID = %d', $row->ID ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- the table name is core's.
				$proof = $read === $result['content'] ? sgs_cart_trigger_sweep_prove( (string) $row->post_content, $read ) : 'read back differs from what was written';
				if ( '' === $proof ) {
					++$totals['written'];
					$status = 'written, read back and proved';
				} else {
					++$totals['failed'];
					$wpdb->update( $wpdb->posts, array( 'post_content' => (string) $row->post_content ), array( 'ID' => (int) $row->ID ) );
					clean_post_cache( (int) $row->ID );
					$status = 'RESTORED (' . $proof . ')';
				}
			}
		}
		if ( ! $json_only ) {
			WP_CLI::log( sprintf( '#%d %s/%s %s: sgs/cart x%d%s', $row->ID, $row->post_type, $row->post_status, $row->post_name, $result['changed'], '' !== $status ? ' [' . $status . ']' : '' ) );
		}
	}

	ksort( $totals['keys'] );
	ksort( $by_type );
	$totals['by_post_type'] = $by_type;
	$totals['mode']         = $apply ? 'apply' : 'dry run';
	if ( $json_only ) {
		WP_CLI::log( (string) wp_json_encode( $totals ) );
	} else {
		WP_CLI::log( '' );
		WP_CLI::log( sprintf( '%s: %d post(s) hold a basket, %d would change%s.', $totals['mode'], $totals['posts_scanned'], $totals['posts_changed'], $apply ? ', ' . $totals['written'] . ' written, ' . $totals['failed'] . ' failed' : '' ) );
		foreach ( $by_type as $type => $n ) {
			WP_CLI::log( '  post type ' . $type . ': ' . $n );
		}
		WP_CLI::log( '  sgs/cart blocks rewritten: ' . $totals['blocks'] );
		foreach ( $totals['keys'] as $k => $n ) {
			WP_CLI::log( '  old setting ' . $k . ': ' . $n );
		}
		foreach ( $totals['conflicts'] as $line ) {
			WP_CLI::log( '  NOT KEPT ' . $line );
		}
	}
	if ( $totals['failed'] > 0 ) {
		WP_CLI::error( $totals['failed'] . ' post(s) failed their proof; see above.' );
	}
}

sgs_cart_trigger_sweep_run( isset( $args ) ? (array) $args : array() ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- `$args` is the variable `wp eval-file` provides.
