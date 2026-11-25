<?php
/**
 * WP-CLI sweep: the built-in button migration's rename and reshape of saved content.
 *
 * The buy box's Add to Cart, the product card's CTAs and the account's sign-in and register buttons moved onto the built-in button kit
 * with their settings renamed to the kit's names (scripts/data/builtin-button-renames.json). Saved content still carries the old names,
 * which the blocks no longer read, so this moves every saved delimiter of the named blocks across: a rename (`addToCartBackgroundColour`
 * to `addToCartColourBackground`) and a reshape (`addToCartMinHeight` from "64px" to {"desktop": "64px"}). There is no `deprecated.js` and
 * no fallback in render code (FP-14); this sweep is the one road from the old names to the new.
 *
 * What it touches: the `post_content` of every row in the posts table except revisions and auto drafts (pages, posts,
 * `wp_template`, `wp_template_part`, `wp_block` and the plugin's own post types such as modals and flows), nested blocks included. Only a block
 * comment's JSON attributes change, and only in a delimiter that holds an old name or shape; every other byte of a post stays as it was.
 * Posts are written with a direct `$wpdb->update()` and a cache clean, so no kses or content filter touches any other block. Each written
 * post is read back and its block tree compared with the tree the old content gives after the same rewrite: a mismatch restores the old
 * content and reports the post.
 *
 * Dry run by default: prints each post that would change with its attribute counts, then the totals. `apply` writes. It is idempotent: a second
 * run finds nothing to change.
 *
 * Run (the plugin's own `--user=1` keeps capability checks honest, `apply` is a positional word because eval-file passes those to the file):
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/sweep-builtin-button-attrs.php --user=1            # dry run
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/sweep-builtin-button-attrs.php apply --user=1      # write
 *   ... blocks=sgs/buybox,sgs/account                                                                   # only these blocks (default: sgs/buybox, sgs/product-card, sgs/account, sgs/choice-flow)
 *   ... map=account-empty-button-renames.json                                                           # another rename map in scripts/data/ (default: builtin-button-renames.json); its blocks are the default blocks
 *   ... json                                                                                            # the counts as one JSON line
 * Back the database up first on a site that matters (`wp db export`); the sweep never writes without `apply`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) ) {
	exit;
}

require_once dirname( __DIR__ ) . '/scripts/lib/builtin-button-sweep.php';

/**
 * Every block in a parsed tree, nested ones included, in document order.
 *
 * @param array $blocks parse_blocks() output.
 * @return array<int, array{name: string, attrs: array}>
 */
function sgs_sweep_flatten_blocks( array $blocks ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		if ( ! empty( $block['blockName'] ) ) {
			$out[] = array(
				'name'  => (string) $block['blockName'],
				'attrs' => is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array(),
			);
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			$out = array_merge( $out, sgs_sweep_flatten_blocks( $block['innerBlocks'] ) );
		}
	}
	return $out;
}

/**
 * Prove a written post: it parses, it holds the same blocks in the same order, and each block's attributes are exactly what the rewrite gives
 * for the old content (the named blocks' attributes moved, every other block untouched).
 *
 * @param string   $before The content before the sweep.
 * @param string   $after  The content as read back from the database.
 * @param string[] $blocks The named blocks.
 * @param array    $map    The rename map.
 * @return string '' when it checks out, else what differs.
 */
function sgs_sweep_prove( string $before, string $after, array $blocks, array $map ): string {
	$old = sgs_sweep_flatten_blocks( parse_blocks( $before ) );
	$new = sgs_sweep_flatten_blocks( parse_blocks( $after ) );
	if ( count( $old ) !== count( $new ) ) {
		return 'block count ' . count( $old ) . ' became ' . count( $new );
	}
	foreach ( $old as $i => $block ) {
		if ( $block['name'] !== $new[ $i ]['name'] ) {
			return 'block ' . $i . ' ' . $block['name'] . ' became ' . $new[ $i ]['name'];
		}
		$expect = in_array( $block['name'], $blocks, true ) ? sgs_builtin_button_sweep_attrs( $block['name'], $block['attrs'], $map ) : $block['attrs'];
		if ( ! sgs_builtin_button_sweep_same_attrs( $expect, $new[ $i ]['attrs'] ) ) {
			return 'block ' . $i . ' ' . $block['name'] . ' attributes differ from the rewrite';
		}
	}
	// Outside the delimiters nothing may move: strip every comment's attribute JSON and compare what is left.
	$strip = static function ( string $c ): string {
		return (string) preg_replace( '#<!--(\s+)wp:([a-z0-9/-]+)(\s+)\{(?:(?!-->).)*?\}(\s+)(/?)-->#s', '<!--$1wp:$2$4$5-->', $c );
	};
	return $strip( $before ) === $strip( $after ) ? '' : 'content outside the block delimiters changed';
}

/**
 * Run the sweep.
 *
 * @param string[] $words The positional words of `wp eval-file`: `apply`, `json`, `blocks=sgs/buybox,sgs/account`.
 * @return void
 */
function sgs_builtin_button_sweep_run( array $words ): void {
	global $wpdb;

	$apply     = in_array( 'apply', $words, true ) || '1' === getenv( 'SGS_SWEEP_APPLY' );
	$json_only = in_array( 'json', $words, true );
	$blocks    = array( 'sgs/buybox', 'sgs/product-card', 'sgs/account', 'sgs/choice-flow' );
	$map_file  = '';
	foreach ( $words as $word ) {
		if ( 0 === strpos( (string) $word, 'map=' ) ) {
			$map_file = dirname( __DIR__ ) . '/scripts/data/' . basename( substr( (string) $word, 4 ) );
		}
	}
	$map = sgs_builtin_button_sweep_map( $map_file );
	if ( '' !== $map_file ) {
		$blocks = array_keys( $map );
	}
	foreach ( $words as $word ) {
		if ( 0 === strpos( (string) $word, 'blocks=' ) ) {
			$blocks = array_values( array_filter( array_map( 'trim', explode( ',', substr( (string) $word, 7 ) ) ) ) );
		}
	}

	$like = array();
	foreach ( $blocks as $b ) {
		$like[] = $wpdb->prepare( 'post_content LIKE %s', '%' . $wpdb->esc_like( 'wp:' . $b ) . '%' );
	}
	$rows = $wpdb->get_results( 'SELECT ID, post_type, post_status, post_name, post_content FROM ' . $wpdb->posts . " WHERE post_type NOT IN ('revision','auto-draft') AND ( " . implode( ' OR ', $like ) . ' ) ORDER BY ID' ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- the LIKE clauses are prepared above.

	$totals  = array(
		'posts_scanned' => count( $rows ),
		'posts_changed' => 0,
		'blocks'        => array(),
		'attrs'         => array(),
		'written'       => 0,
		'failed'        => 0,
	);
	$by_type = array();
	foreach ( $rows as $row ) {
		$result = sgs_builtin_button_sweep_content( (string) $row->post_content, $blocks, $map );
		if ( array() === $result['changed'] ) {
			continue;
		}
		++$totals['posts_changed'];
		$by_type[ $row->post_type ] = ( $by_type[ $row->post_type ] ?? 0 ) + 1;
		foreach ( $result['changed'] as $b => $n ) {
			$totals['blocks'][ $b ] = ( $totals['blocks'][ $b ] ?? 0 ) + $n;
		}
		foreach ( $result['attrs'] as $k => $n ) {
			$totals['attrs'][ $k ] = ( $totals['attrs'][ $k ] ?? 0 ) + $n;
		}
		$status = '';
		if ( $apply ) {
			// Prove the new content before it is written, then write, read back and prove it again; a failure puts the old content back.
			$proof = sgs_sweep_prove( (string) $row->post_content, $result['content'], $blocks, $map );
			if ( '' !== $proof ) {
				++$totals['failed'];
				$status = 'NOT WRITTEN (' . $proof . ')';
			} else {
				$wpdb->update( $wpdb->posts, array( 'post_content' => $result['content'] ), array( 'ID' => (int) $row->ID ) );
				clean_post_cache( (int) $row->ID );
				$read  = (string) $wpdb->get_var( $wpdb->prepare( 'SELECT post_content FROM ' . $wpdb->posts . ' WHERE ID = %d', $row->ID ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- the table name is core's.
				$proof = $read === $result['content'] ? sgs_sweep_prove( (string) $row->post_content, $read, $blocks, $map ) : 'read back differs from what was written';
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
			$parts = array();
			foreach ( $result['changed'] as $b => $n ) {
				$parts[] = $b . ' x' . $n;
			}
			WP_CLI::log( sprintf( '#%d %s/%s %s: %s%s', $row->ID, $row->post_type, $row->post_status, $row->post_name, implode( ', ', $parts ), '' !== $status ? ' [' . $status . ']' : '' ) );
		}
	}

	ksort( $totals['blocks'] );
	ksort( $totals['attrs'] );
	ksort( $by_type );
	$totals['by_post_type'] = $by_type;
	$totals['mode']         = $apply ? 'apply' : 'dry run';
	if ( $json_only ) {
		WP_CLI::log( (string) wp_json_encode( $totals ) );
	} else {
		WP_CLI::log( '' );
		WP_CLI::log( sprintf( '%s: %d post(s) hold the named blocks, %d would change%s.', $totals['mode'], $totals['posts_scanned'], $totals['posts_changed'], $apply ? ', ' . $totals['written'] . ' written, ' . $totals['failed'] . ' failed' : '' ) );
		foreach ( $by_type as $type => $n ) {
			WP_CLI::log( '  post type ' . $type . ': ' . $n );
		}
		foreach ( $totals['blocks'] as $b => $n ) {
			WP_CLI::log( '  block ' . $b . ': ' . $n . ' delimiter(s)' );
		}
		foreach ( $totals['attrs'] as $k => $n ) {
			WP_CLI::log( '  attribute ' . $k . ': ' . $n );
		}
	}
	if ( $totals['failed'] > 0 ) {
		WP_CLI::error( $totals['failed'] . ' post(s) failed their proof; see above.' );
	}
}

sgs_builtin_button_sweep_run( isset( $args ) ? (array) $args : array() ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- `$args` is the variable `wp eval-file` provides.
