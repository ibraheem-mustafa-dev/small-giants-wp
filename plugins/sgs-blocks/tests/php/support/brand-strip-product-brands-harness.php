<?php
/**
 * Child process for BrandStripProductBrandsVisibilityTest.
 *
 * Runs the REAL src/blocks/brand-strip/product-brands-source.php against a small in-memory model of WordPress's
 * term and product queries, so the model's global function stand-ins stay out of the PHPUnit process. The model
 * follows core's rules for what the source calls: `get_terms()` with `hide_empty` counts every PUBLISHED product
 * carrying a term (WordPress's plain term count, blind to catalogue visibility), honours `number` (0 = all),
 * `orderby` name / count / a named meta clause, and `order`; `get_posts()` honours post type, status, `fields`
 * ids and a `tax_query` of `IN` / `NOT IN` clauses by `term_id` or `slug`, and refuses any clause shape it does
 * not model; `wp_get_object_terms()` returns the term ids the given products carry.
 *
 * Usage: php brand-strip-product-brands-harness.php <source-file> <scenario.json>
 * Scenario: { brands: [{id, name, order?}], products: [{id, status, hidden: [visibility slugs], brands: [ids]}],
 *             options: {name: value}, attributes: {block attributes} }
 *             renders?: n (default 1; the source runs n times in this one process), flush_after?: [render numbers, 1-based]
 *             (after each named render the scenario fires the hooks the visible-brands cache is cleared by: `save_post_product`),
 *             change_after?: { render number: products } (the products as they stand after that render),
 *             options_after?: { render number: options } (the site options as they stand after that render)
 * Transients are an in-memory store for the process; `add_action` records each hook, and the harness fires a recorded hook.
 * Output (JSON): { keys: [the entries' _key in order, last render], all_keys: [per render], product_queries: n (all renders),
 *                  term_queries: [get_terms args], hooks: [hook names added] }
 *
 * @package SGS\Blocks\Tests
 */

define( 'ABSPATH', __DIR__ . '/' );

$sgs_h_source   = $argv[1] ?? '';
$sgs_h_scenario = json_decode( (string) file_get_contents( $argv[2] ?? '' ), true );
if ( ! is_file( $sgs_h_source ) || ! is_array( $sgs_h_scenario ) ) {
	fwrite( STDERR, "usage: harness <source-file> <scenario.json>\n" );
	exit( 2 );
}
$GLOBALS['sgs_h'] = array(
	'brands'          => $sgs_h_scenario['brands'] ?? array(),
	'products'        => $sgs_h_scenario['products'] ?? array(),
	'options'         => $sgs_h_scenario['options'] ?? array(),
	'product_queries' => 0,
	'term_queries'    => array(),
);

class WP_Error {}

$GLOBALS['sgs_h']['transients'] = array();
$GLOBALS['sgs_h']['hooks']      = array();
if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}
function get_transient( $name ) {
	return array_key_exists( $name, $GLOBALS['sgs_h']['transients'] ) ? $GLOBALS['sgs_h']['transients'][ $name ] : false;
}
function set_transient( $name, $value, $expiry = 0 ) {
	$GLOBALS['sgs_h']['transients'][ $name ] = $value;
	return true;
}
function delete_transient( $name ) {
	unset( $GLOBALS['sgs_h']['transients'][ $name ] );
	return true;
}
function add_action( $hook, $callback, $priority = 10, $args = 1 ) {
	$GLOBALS['sgs_h']['hooks'][ $hook ][] = $callback;
	return true;
}
function get_post_type( $id ) {
	return 'product';
}
/**
 * Fire a recorded hook as WordPress would.
 *
 * @param string $hook Hook name.
 * @param mixed  ...$args Hook arguments.
 */
function sgs_h_fire( $hook, ...$args ) {
	foreach ( $GLOBALS['sgs_h']['hooks'][ $hook ] ?? array() as $cb ) {
		$cb( ...$args );
	}
}

function is_wp_error( $thing ) {
	return $thing instanceof WP_Error;
}
function absint( $n ) {
	return abs( (int) $n );
}
function sanitize_key( $k ) {
	return strtolower( preg_replace( '/[^a-zA-Z0-9_\-]/', '', (string) $k ) );
}
function taxonomy_exists( $t ) {
	return in_array( $t, array( 'product_brand', 'product_visibility' ), true );
}
function get_option( $name, $fallback = false ) {
	return $GLOBALS['sgs_h']['options'][ $name ] ?? $fallback;
}
function get_term_link( $term ) {
	return 'https://example.test/brand/' . $term->term_id . '/';
}
function sgs_brand_logo_media( $term_id ) {
	return null;
}
function wp_list_pluck( array $items, $field ) {
	return array_map( static fn( $o ) => $o->$field, $items );
}

/**
 * Published products carrying a brand: WordPress's plain term count.
 *
 * @param int $brand_id Brand term id.
 * @return int
 */
function sgs_h_plain_count( int $brand_id ): int {
	$n = 0;
	foreach ( $GLOBALS['sgs_h']['products'] as $p ) {
		if ( 'publish' === $p['status'] && in_array( $brand_id, $p['brands'], true ) ) {
			++$n;
		}
	}
	return $n;
}

function get_terms( $args ) {
	$GLOBALS['sgs_h']['term_queries'][] = $args;
	if ( 'product_brand' !== ( $args['taxonomy'] ?? '' ) ) {
		throw new RuntimeException( 'unmodelled taxonomy' );
	}
	$rows = array();
	foreach ( $GLOBALS['sgs_h']['brands'] as $b ) {
		$count = sgs_h_plain_count( $b['id'] );
		if ( ! empty( $args['hide_empty'] ) && 0 === $count ) {
			continue;
		}
		$rows[] = (object) array(
			'term_id' => $b['id'],
			'name'    => $b['name'],
			'count'   => $count,
			'order'   => $b['order'] ?? null,
		);
	}
	$orderby = $args['orderby'] ?? 'name';
	$desc    = 'DESC' === strtoupper( $args['order'] ?? 'ASC' );
	if ( 'brand_order' === $orderby ) {
		if ( empty( $args['meta_query']['brand_order'] ) || empty( $args['meta_query']['no_order'] ) ) {
			throw new RuntimeException( 'the named meta clause is missing' );
		}
		// A missing value sorts first in MySQL; ties by term id.
		$key = static fn( $r ) => null === $r->order ? -INF : (float) $r->order;
		usort( $rows, static fn( $a, $b ) => 0 !== ( $key( $a ) <=> $key( $b ) ) ? $key( $a ) <=> $key( $b ) : $a->term_id <=> $b->term_id );
	} elseif ( 'count' === $orderby ) {
		usort( $rows, static fn( $a, $b ) => $a->count !== $b->count ? $a->count <=> $b->count : $a->term_id <=> $b->term_id );
	} elseif ( 'name' === $orderby ) {
		usort( $rows, static fn( $a, $b ) => strcasecmp( $a->name, $b->name ) );
	} else {
		throw new RuntimeException( 'unmodelled orderby' );
	}
	if ( $desc ) {
		$rows = array_reverse( $rows );
	}
	$number = (int) ( $args['number'] ?? 0 );
	return $number > 0 ? array_slice( $rows, 0, $number ) : $rows;
}

function get_posts( $args ) {
	++$GLOBALS['sgs_h']['product_queries'];
	if ( 'product' !== ( $args['post_type'] ?? '' ) || 'ids' !== ( $args['fields'] ?? '' ) ) {
		throw new RuntimeException( 'unmodelled product query' );
	}
	$clauses = $args['tax_query'] ?? array();
	$ids     = array();
	foreach ( $GLOBALS['sgs_h']['products'] as $p ) {
		if ( ( $args['post_status'] ?? 'publish' ) !== $p['status'] ) {
			continue;
		}
		$ok = true;
		foreach ( $clauses as $k => $c ) {
			if ( 'relation' === $k ) {
				if ( 'AND' !== $c ) {
					throw new RuntimeException( 'unmodelled relation' );
				}
				continue;
			}
			$terms = (array) $c['terms'];
			if ( 'product_brand' === $c['taxonomy'] && 'term_id' === $c['field'] ) {
				$has = (bool) array_intersect( $p['brands'], array_map( 'intval', $terms ) );
			} elseif ( 'product_visibility' === $c['taxonomy'] && 'slug' === $c['field'] ) {
				$has = (bool) array_intersect( $p['hidden'], $terms );
			} else {
				throw new RuntimeException( 'unmodelled tax clause' );
			}
			if ( 'IN' === $c['operator'] ) {
				$ok = $ok && $has;
			} elseif ( 'NOT IN' === $c['operator'] ) {
				$ok = $ok && ! $has;
			} else {
				throw new RuntimeException( 'unmodelled operator' );
			}
		}
		if ( $ok ) {
			$ids[] = $p['id'];
		}
	}
	return $ids;
}

function wp_get_object_terms( $object_ids, $taxonomy, $args = array() ) {
	if ( 'product_brand' !== $taxonomy || 'ids' !== ( $args['fields'] ?? '' ) ) {
		throw new RuntimeException( 'unmodelled object terms query' );
	}
	$out = array();
	foreach ( $GLOBALS['sgs_h']['products'] as $p ) {
		if ( in_array( $p['id'], (array) $object_ids, true ) ) {
			$out = array_merge( $out, $p['brands'] );
		}
	}
	return array_values( array_unique( $out ) );
}

require $sgs_h_source;

$sgs_h_all = array();
for ( $sgs_h_i = 1; $sgs_h_i <= (int) ( $sgs_h_scenario['renders'] ?? 1 ); $sgs_h_i++ ) {
	$sgs_h_all[] = array_column( sgs_brand_strip_get_product_brand_logos( $sgs_h_scenario['attributes'] ?? array() ), '_key' );
	if ( isset( $sgs_h_scenario['change_after'][ (string) $sgs_h_i ] ) ) {
		$GLOBALS['sgs_h']['products'] = $sgs_h_scenario['change_after'][ (string) $sgs_h_i ];
	}
	if ( isset( $sgs_h_scenario['options_after'][ (string) $sgs_h_i ] ) ) {
		$GLOBALS['sgs_h']['options'] = $sgs_h_scenario['options_after'][ (string) $sgs_h_i ];
	}
	if ( in_array( $sgs_h_i, $sgs_h_scenario['flush_after'] ?? array(), true ) ) {
		sgs_h_fire( 'save_post_product', 10 );
	}
}
echo json_encode(
	array(
		'keys'            => end( $sgs_h_all ),
		'all_keys'        => $sgs_h_all,
		'product_queries' => $GLOBALS['sgs_h']['product_queries'],
		'term_queries'    => $GLOBALS['sgs_h']['term_queries'],
		'hooks'           => array_keys( $GLOBALS['sgs_h']['hooks'] ),
	)
);
