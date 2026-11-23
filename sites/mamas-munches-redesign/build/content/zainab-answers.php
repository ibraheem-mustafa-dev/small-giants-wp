<?php
/**
 * Mama's Munches: Zainab's answers of 2026-11-23 and the small content items, as one WP-CLI eval-file.
 *
 *   wp --user=Claude eval-file zainab-answers.php            dry run: prints every change, writes nothing
 *   wp --user=Claude eval-file zainab-answers.php rehearse   makes every change inside a database transaction, checks it, rolls back
 *   wp --user=Claude eval-file zainab-answers.php write      makes the changes
 *   add `after-deploy` to also bind the shop heading to the category name and set the one-pick summary
 *   (needs the plugin build carrying sgs/archive and summaryTextOne; before it, both settings are inert)
 *
 * What it changes, each printed with its before and after:
 *   1. Mango (pa_flavour) leaves products 257, 282, 283, 284: their attribute options and term links (the term stays).
 *   2. Chocolate melt (pa_chip) leaves the same four products: its variations are deleted (ids, titles, codes and prices
 *      are printed first; recreate them with s4/zainab/b2.php) and the term leaves the products' options; the term stays.
 *   3. The nuts sentence takes Zainab's wording wherever the allergen information sits (Home, Contact, Help, Checkout,
 *      the product template): exact sentences inside block attribute strings, never a string replace on post_content.
 *   4. Slim SEO's default social image becomes the Home hero photo.
 *   5. (after-deploy) the archive-product template's "The shop" heading binds to sgs/archive title; the product
 *      template's buy box reads "All 20 Vanilla" for one flavour and "Your 20: 7 Vanilla · 7 Banana · 6 Coconut" for more.
 * It also prints, read-only, every place that mentions honey, a hygiene rating, wheat, Mango or Chocolate melt.
 * It refuses to run without unfiltered_html: saving a post without it strips every sgsCustomCss in that post.
 */

$sgs_za_mode         = in_array( 'write', $args, true ) ? 'write' : ( in_array( 'rehearse', $args, true ) ? 'rehearse' : 'dry' );
$sgs_za_after_deploy = in_array( 'after-deploy', $args, true );
$sgs_za_write        = 'dry' !== $sgs_za_mode;
if ( ! current_user_can( 'unfiltered_html' ) ) {
	WP_CLI::error( 'Run as an administrator (--user=Claude): without unfiltered_html, saving strips every sgsCustomCss in the post.' );
}
WP_CLI::log( strtoupper( $sgs_za_mode ) . ( $sgs_za_after_deploy ? ' (with after-deploy steps)' : '' ) );
global $wpdb;
// A rehearsal wrapper that holds its own transaction defines SGS_ZA_OUTER_TX (a second START TRANSACTION would commit it).
$sgs_za_own_tx = 'rehearse' === $sgs_za_mode && ! defined( 'SGS_ZA_OUTER_TX' );
if ( $sgs_za_own_tx ) {
	$wpdb->query( 'START TRANSACTION' );
}

$sgs_za_products = array( 257, 282, 283, 284 );

// ── Read-only scan ─────────────────────────────────────────────────────────────
$sgs_za_scan_re = '/honey|hygiene|food standards|\bFSA\b|wheat|mango|chocolate melt/i';
$sgs_za_scan    = static function ( array $blocks, string $where ) use ( &$sgs_za_scan, $sgs_za_scan_re ): void {
	foreach ( $blocks as $b ) {
		$rec = static function ( $v, string $k ) use ( &$rec, $where, $b, $sgs_za_scan_re ): void {
			if ( is_array( $v ) ) {
				foreach ( $v as $kk => $vv ) {
					$rec( $vv, $k . '.' . $kk );
				}
			} elseif ( is_string( $v ) && ! in_array( $k, array( '.sgsCustomCss', '.sgsCustomCssNote', '.className' ), true ) && preg_match( $sgs_za_scan_re, $v ) ) {
				WP_CLI::log( "  scan $where {$b['blockName']} @$k: " . mb_substr( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $v ) ), 0, 220 ) );
			}
		};
		$rec( $b['attrs'], '' );
		$sgs_za_scan( $b['innerBlocks'], $where );
	}
};
WP_CLI::log( '== Read-only scan: honey, hygiene rating, wheat, Mango, Chocolate melt' );
foreach ( get_posts( array( 'post_type' => array( 'page', 'wp_template', 'wp_template_part', 'sgs_header', 'sgs_footer', 'sgs_drawer', 'wp_block', 'product' ), 'post_status' => array( 'publish', 'private' ), 'numberposts' => -1 ) ) as $p ) {
	$sgs_za_scan( parse_blocks( $p->post_content ), "{$p->ID}({$p->post_type}:{$p->post_name})" );
	foreach ( array( 'excerpt' => $p->post_excerpt, 'slim_seo' => (string) ( get_post_meta( $p->ID, 'slim_seo', true )['description'] ?? '' ) ) as $k => $v ) {
		if ( preg_match( $sgs_za_scan_re, (string) $v ) ) {
			WP_CLI::log( "  scan {$p->ID} $k: " . mb_substr( wp_strip_all_tags( (string) $v ), 0, 220 ) );
		}
	}
}

// ── 1 and 2: Mango and Chocolate melt leave the four products ───────────────────
$sgs_za_remove_option = static function ( int $pid, string $tax, int $term_id ) use ( $sgs_za_write ): void {
	$p     = wc_get_product( $pid );
	$attrs = $p->get_attributes();
	if ( ! isset( $attrs[ $tax ] ) ) {
		WP_CLI::log( "  product $pid has no $tax" );
		return;
	}
	$before = $attrs[ $tax ]->get_options();
	$after  = array_values( array_diff( $before, array( $term_id ) ) );
	WP_CLI::log( "  product $pid $tax options: " . implode( ',', $before ) . ' -> ' . implode( ',', $after ) );
	if ( $before === $after || ! $sgs_za_write ) {
		return;
	}
	$attrs[ $tax ]->set_options( $after );
	$p->set_attributes( $attrs );
	$p->save();
	wp_set_object_terms( $pid, $after, $tax );
};

$sgs_za_mango = get_term_by( 'slug', 'mango', 'pa_flavour' );
$sgs_za_melt  = get_term_by( 'slug', 'chocolate-melt', 'pa_chip' );
WP_CLI::log( '== 1. Mango: ' . ( $sgs_za_mango ? "term {$sgs_za_mango->term_id}" : 'no term (nothing to do)' ) );
WP_CLI::log( '== 2. Chocolate melt: ' . ( $sgs_za_melt ? "term {$sgs_za_melt->term_id}" : 'no term (nothing to do)' ) );
foreach ( $sgs_za_products as $pid ) {
	$p = wc_get_product( $pid );
	if ( ! $p ) {
		WP_CLI::error( "No product $pid" );
	}
	$flags = get_post_meta( $pid, '_sgs_attribute_flags', true );
	$flags = is_string( $flags ) ? json_decode( $flags, true ) : $flags;
	if ( $sgs_za_mango && 'mango' === ( $flags['pa_flavour']['startWith'] ?? '' ) ) {
		WP_CLI::error( "Product $pid starts its flavour picks on Mango: change Start with first" );
	}
	if ( $sgs_za_melt && 'chocolate-melt' === ( $p->get_default_attributes()['pa_chip'] ?? '' ) ) {
		WP_CLI::error( "Product $pid defaults to Chocolate melt: change its default first" );
	}
	WP_CLI::log( "-- product $pid {$p->get_name()} (status " . get_post_status( $pid ) . ', ' . count( $p->get_children() ) . ' variations)' );
	if ( $sgs_za_mango ) {
		$sgs_za_remove_option( $pid, 'pa_flavour', (int) $sgs_za_mango->term_id );
	}
	if ( $sgs_za_melt ) {
		$kids = get_posts( array( 'post_type' => 'product_variation', 'post_parent' => $pid, 'numberposts' => -1, 'post_status' => array( 'publish', 'private' ), 'orderby' => 'ID', 'order' => 'ASC' ) );
		foreach ( $kids as $k ) {
			if ( 'chocolate-melt' !== get_post_meta( $k->ID, 'attribute_pa_chip', true ) ) {
				continue;
			}
			WP_CLI::log( sprintf( '  delete variation %d "%s" sku=%s price=%s status=%s', $k->ID, $k->post_title, get_post_meta( $k->ID, '_sku', true ), get_post_meta( $k->ID, '_regular_price', true ), $k->post_status ) );
			if ( $sgs_za_write ) {
				wc_get_product( $k->ID )->delete( true );
			}
		}
		$sgs_za_remove_option( $pid, 'pa_chip', (int) $sgs_za_melt->term_id );
	}
	if ( $sgs_za_write ) {
		WC_Product_Variable::sync( $pid );
		wc_delete_product_transients( $pid );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", $wpdb->esc_like( '_transient_sgs_manifest_v10_' . $pid . '_' ) . '%', $wpdb->esc_like( '_transient_timeout_sgs_manifest_v10_' . $pid . '_' ) . '%' ) );
		clean_post_cache( $pid );
		$check = \SGS\Blocks\Product_Preflight::evaluate( $pid );
		$codes = wp_list_pluck( $check['issues'], 'code' );
		WP_CLI::log( "  after: status " . get_post_status( $pid ) . ', ' . count( wc_get_product( $pid )->get_children() ) . ' variations, preflight ' . ( $check['ready'] ? 'ready' : 'ISSUES ' . implode( ',', $codes ) ) );
		$manifest = \SGS\Blocks\Product_Manifest::build( $pid );
		$bytes    = strlen( (string) wp_json_encode( $manifest ) );
		WP_CLI::log( "  builder data: full manifest $bytes bytes (the preflight above measures the trimmed copy against the limit), limit " . sgs_configurator_context_cap_bytes( $pid ) . ' bytes, chip terms ' . implode( ',', wp_get_object_terms( $pid, 'pa_chip', array( 'fields' => 'slugs' ) ) ) . ', flavours ' . implode( ',', wp_get_object_terms( $pid, 'pa_flavour', array( 'fields' => 'slugs' ) ) ) );
		if ( 'publish' !== get_post_status( $pid ) || ! $check['ready'] ) {
			WP_CLI::warning( "product $pid is not ready after the change: read the preflight issues above" );
		}
	}
}

// ── 3 (and 5): block attribute edits by exact text ──────────────────────────────
$sgs_za_nuts_new = 'Made in a kitchen that also handles tree nuts. Everything is cleaned down, and cookies for anyone with an allergy are made separately: Zainab is very careful with allergies, so tell her about yours when you order.';
$sgs_za_text     = array(
	154 => array( 'Made in a kitchen that also handles tree nuts.' => $sgs_za_nuts_new ),
	148 => array( 'Made in a kitchen that also handles tree nuts.' => $sgs_za_nuts_new ),
	202 => array( 'Made in a kitchen that also handles tree nuts.' => $sgs_za_nuts_new ),
	152 => array(
		'Made in a kitchen that also handles tree nuts, so not suitable for anyone with a tree nut allergy.' => 'Made in a kitchen that also handles tree nuts. Everything is cleaned down, and cookies for anyone with an allergy are made separately: Zainab is very careful with allergies. We cannot promise any cookie is free from nuts, so tell her about any allergy when you order.',
		'Made in a kitchen that also handles tree nuts.' => $sgs_za_nuts_new,
	),
	102 => array( 'Made in a kitchen that handles tree nuts.' => 'Made in a kitchen that handles tree nuts; cookies for anyone with an allergy are made separately.' ),
);
$sgs_za_names = static function ( array $blocks, array &$n ) use ( &$sgs_za_names ): void {
	foreach ( $blocks as $b ) {
		$n[] = $b['blockName'];
		$sgs_za_names( $b['innerBlocks'], $n );
	}
};
// Replaces each mapped sentence inside string attributes (never className or Custom CSS); counts each replacement.
$sgs_za_replace = static function ( array &$blocks, array $map, array &$used ) use ( &$sgs_za_replace ): void {
	foreach ( $blocks as &$b ) {
		$rec = static function ( &$v, string $k ) use ( &$rec, $map, &$used ): void {
			if ( is_array( $v ) ) {
				foreach ( $v as $kk => &$vv ) {
					$rec( $vv, (string) $kk );
				}
				return;
			}
			if ( ! is_string( $v ) || in_array( $k, array( 'className', 'sgsCustomCss', 'sgsCustomCssNote' ), true ) ) {
				return;
			}
			// A string already holding any new wording is left alone (so a second run changes nothing), and each string
			// takes one replacement at most: the longer sentence is listed first and its new text begins with the shorter.
			foreach ( $map as $new ) {
				if ( false !== strpos( $v, $new ) ) {
					return;
				}
			}
			foreach ( $map as $old => $new ) {
				if ( false !== strpos( $v, $old ) ) {
					$v            = str_replace( $old, $new, $v );
					$used[ $old ] = ( $used[ $old ] ?? 0 ) + 1;
					return;
				}
			}
		};
		$rec( $b['attrs'], '' );
		$sgs_za_replace( $b['innerBlocks'], $map, $used );
	}
};
// Writes a post's blocks back; a template whose page-template check refuses wp_update_post is written as b3.php did.
$sgs_za_save = static function ( int $pid, array $blocks, string $label ) use ( $sgs_za_write, $sgs_za_names, $wpdb ): void {
	$post = get_post( $pid );
	$new  = serialize_blocks( $blocks );
	$n0   = array();
	$n1   = array();
	$sgs_za_names( parse_blocks( $post->post_content ), $n0 );
	$sgs_za_names( parse_blocks( $new ), $n1 );
	if ( $n0 !== $n1 ) {
		WP_CLI::error( "$label: the block list changed on re-serialising; nothing written" );
	}
	if ( ! $sgs_za_write ) {
		return;
	}
	$r = wp_update_post( array( 'ID' => $pid, 'post_content' => wp_slash( $new ) ), true );
	if ( is_wp_error( $r ) ) {
		if ( 'invalid_page_template' !== $r->get_error_code() ) {
			WP_CLI::error( "$label: " . $r->get_error_message() );
		}
		$wpdb->update( $wpdb->posts, array( 'post_content' => $new, 'post_modified' => current_time( 'mysql' ), 'post_modified_gmt' => current_time( 'mysql', 1 ) ), array( 'ID' => $pid ) );
		clean_post_cache( $pid );
	}
	$cc_before = substr_count( $post->post_content, '"sgsCustomCss"' );
	$cc_after  = substr_count( get_post( $pid )->post_content, '"sgsCustomCss"' );
	WP_CLI::log( "  $label written; blocks with Custom CSS $cc_before -> $cc_after" );
	if ( $cc_before !== $cc_after ) {
		WP_CLI::error( "$label lost Custom CSS on save: restore it from the backup" );
	}
};
WP_CLI::log( '== 3. The nuts sentence' );
foreach ( $sgs_za_text as $pid => $map ) {
	$post = get_post( $pid );
	if ( ! $post ) {
		WP_CLI::warning( "no post $pid" );
		continue;
	}
	$blocks = parse_blocks( $post->post_content );
	$used   = array();
	$sgs_za_replace( $blocks, $map, $used );
	foreach ( $map as $old => $new ) {
		WP_CLI::log( sprintf( '  %d %s: %d x "%s"', $pid, $post->post_name, $used[ $old ] ?? 0, mb_substr( $old, 0, 70 ) ) );
	}
	if ( array() === $used ) {
		WP_CLI::warning( "$pid: no nuts sentence found (already changed, or worded differently: read the scan)" );
		continue;
	}
	$sgs_za_save( $pid, $blocks, "post $pid" );
}

// ── 4. Slim SEO default social image: the Home hero photo ───────────────────────
WP_CLI::log( '== 4. Default social image' );
$sgs_za_hero = 0;
$sgs_za_find = static function ( array $blocks, bool $in_hero ) use ( &$sgs_za_find, &$sgs_za_hero ): void {
	foreach ( $blocks as $b ) {
		$here = $in_hero || 'sgs/hero' === $b['blockName'];
		$url  = (string) ( $b['attrs']['source']['desktop']['url'] ?? '' );
		if ( $here && ! $sgs_za_hero && 'sgs/media' === $b['blockName'] && false !== stripos( $url, 'hero-mug' ) ) {
			$sgs_za_hero = (int) ( $b['attrs']['source']['desktop']['id'] ?? 0 );
		}
		$sgs_za_find( $b['innerBlocks'], $here );
	}
};
$sgs_za_find( parse_blocks( (string) get_post( (int) get_option( 'page_on_front' ) )->post_content ), false );
$sgs_za_seo = get_option( 'slim_seo', array() );
if ( ! $sgs_za_hero || ! is_array( $sgs_za_seo ) ) {
	WP_CLI::warning( 'Home hero photo (an sgs/media inside sgs/hero whose file holds "hero-mug") not found, or Slim SEO has no settings: social image unchanged' );
} else {
	$src = wp_get_attachment_image_src( $sgs_za_hero, 'full' );
	WP_CLI::log( sprintf( '  hero photo %d %s (%dx%d)', $sgs_za_hero, $src[0], $src[1], $src[2] ) );
	WP_CLI::log( '  default_facebook_image: ' . ( $sgs_za_seo['default_facebook_image'] ?? '(unset)' ) . ' -> ' . $src[0] );
	WP_CLI::log( '  default_twitter_image: ' . ( $sgs_za_seo['default_twitter_image'] ?? '(unset)' ) . ' -> ' . $src[0] );
	if ( $sgs_za_write ) {
		$sgs_za_seo['default_facebook_image'] = $src[0];
		$sgs_za_seo['default_twitter_image']  = $src[0];
		update_option( 'slim_seo', $sgs_za_seo );
	}
}

// ── 5. After the plugin deploy: the category heading and the one-pick summary ────
if ( $sgs_za_after_deploy ) {
	WP_CLI::log( '== 5. Category heading binding and one-pick summary' );
	$sgs_za_set = static function ( array &$blocks, callable $match, callable $change, int &$hits ) use ( &$sgs_za_set ): void {
		foreach ( $blocks as &$b ) {
			if ( $match( $b ) ) {
				$change( $b );
				++$hits;
			}
			$sgs_za_set( $b['innerBlocks'], $match, $change, $hits );
		}
	};
	$jobs = array(
		'archive-product' => array(
			static fn( array $b ): bool => 'sgs/heading' === $b['blockName'] && 'The shop' === trim( wp_strip_all_tags( (string) ( $b['attrs']['content'] ?? '' ) ) ),
			static function ( array &$b ): void {
				WP_CLI::log( '  heading "The shop": metadata ' . wp_json_encode( $b['attrs']['metadata'] ?? null ) . ' -> bindings.content = sgs/archive title' );
				$b['attrs']['metadata']                        = is_array( $b['attrs']['metadata'] ?? null ) ? $b['attrs']['metadata'] : array();
				$b['attrs']['metadata']['bindings']['content'] = array( 'source' => 'sgs/archive', 'args' => array( 'key' => 'title' ) );
			},
		),
		'single-product'  => array(
			static fn( array $b ): bool => 'sgs/buybox' === $b['blockName'],
			static function ( array &$b ): void {
				WP_CLI::log( '  buy box summaryText ' . wp_json_encode( $b['attrs']['summaryText'] ?? null, JSON_UNESCAPED_UNICODE ) . ' -> "Your {pack}: {split}", summaryTextOne ' . wp_json_encode( $b['attrs']['summaryTextOne'] ?? null ) . ' -> "{split}"' );
				$b['attrs']['summaryText']    = 'Your {pack}: {split}';
				$b['attrs']['summaryTextOne'] = '{split}';
			},
		),
	);
	foreach ( $jobs as $slug => $job ) {
		$tpl = get_posts( array( 'post_type' => 'wp_template', 'name' => $slug, 'post_status' => 'publish', 'numberposts' => 1 ) )[0] ?? null;
		if ( ! $tpl ) {
			WP_CLI::warning( "no saved $slug template" );
			continue;
		}
		$blocks = parse_blocks( $tpl->post_content );
		$hits   = 0;
		$sgs_za_set( $blocks, $job[0], $job[1], $hits );
		if ( 1 !== $hits ) {
			WP_CLI::warning( "$slug ({$tpl->ID}): $hits matching blocks, expected 1; unchanged" );
			continue;
		}
		$sgs_za_save( (int) $tpl->ID, $blocks, "template $slug ({$tpl->ID})" );
	}
}

if ( 'rehearse' === $sgs_za_mode ) {
	if ( $sgs_za_own_tx ) {
		$wpdb->query( 'ROLLBACK' );
	}
	wp_cache_flush();
	WP_CLI::success( 'rehearsal: every change above was made and rolled back' );
} elseif ( 'write' === $sgs_za_mode ) {
	wp_cache_flush();
	WP_CLI::success( 'written' );
} else {
	WP_CLI::success( 'dry run: nothing written' );
}
