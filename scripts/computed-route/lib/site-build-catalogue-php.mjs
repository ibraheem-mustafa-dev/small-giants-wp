// The PHP the catalogue step of the site build runs through `wp eval-file -` (lib/site-build-catalogue.mjs, Spec 48
// FR-48-92): one read of what the site holds for each catalogue product, and one write that creates or completes them.
// Every value reaches the PHP as base64 JSON, so no shell quoting touches it. The WooCommerce calls follow the client
// seed that preceded this step (find a product by SKU, find-or-create a global attribute and register its taxonomy in
// this process, find-or-create terms by name, variations keyed by their attribute values, sync the parent, publish last
// so the product preflight gate sees the variations and image). A product left with no image gets the photo-to-come
// image (the catalogue image keyed PHOTO_TO_COME) and `_sgs_photo_to_come`, which goes once it shows another image.
import { facetApplyPhp, facetStatePhp } from './site-build-catalogue-facets.mjs';

// Each attribute's `variesBy` goes on its terms as `_sgs_variesby_value` when they have none; a held product (no
// variesBy axis, the step's `hold`) is never published.
// The photo-to-come image's key among the catalogue images (lib/site-build-catalogue.mjs::catalogueImages).
export const PHOTO_TO_COME = 'photo-to-come';

const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );

// The PHP helpers both runs share.
const HELPERS = `
$sgs_is_fixture = function ( $id ) {
	return '' !== (string) get_post_meta( $id, '_sgs_cr_fixture', true ) || '' !== (string) get_post_meta( $id, '_sgs_fixture', true ) || 0 === strpos( (string) get_post_meta( $id, '_sku', true ), 'sgs-fixture-' );
};
$sgs_find = function ( $p ) {
	$id = (int) wc_get_product_id_by_sku( $p['sku'] );
	if ( $id ) { return array( $id, 'sku' ); }
	$by_meta = get_posts( array( 'post_type' => 'product', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_sgs_draft_product', 'meta_value' => $p['draftId'], 'suppress_filters' => true ) );
	if ( $by_meta ) { return array( (int) $by_meta[0], 'draft id' ); }
	$by_slug = get_page_by_path( $p['slug'], OBJECT, 'product' );
	return $by_slug ? array( (int) $by_slug->ID, 'slug' ) : array( 0, '' );
};
$sgs_attachment = function ( $img ) {
	global $wpdb;
	if ( ! empty( $img['url'] ) ) {
		$id = $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_sgs_draft_image_source' AND meta_value = %s LIMIT 1", $img['url'] ) );
		if ( ! $id && ! empty( $img['stem'] ) ) {
			$stem = $wpdb->esc_like( $img['stem'] ) . '.%';
			$id = $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND ( meta_value LIKE %s OR meta_value LIKE %s ) ORDER BY post_id ASC LIMIT 1", $stem, '%/' . $stem ) );
		}
		return $id ? (int) $id : 0;
	}
	$id = $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_sgs_draft_asset' AND meta_value = %s LIMIT 1", $img['sha'] ) );
	if ( $id ) { return (int) $id; }
	$like = '%/' . $wpdb->esc_like( $img['name'] );
	$id = $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND ( meta_value = %s OR meta_value LIKE %s ) ORDER BY post_id ASC LIMIT 1", $img['name'], $like ) );
	return $id ? (int) $id : 0;
};
$sgs_variesby = function ( $value ) {
	return class_exists( '\\SGS\\Blocks\\Configurator_Meta' ) ? \\SGS\\Blocks\\Configurator_Meta::sanitize_variesby( $value ) : (string) $value;
};
`;

// The read: per product { draftId, id, how, fixture, type, status, sku, price, image, gallery, categories, brand, rrp,
// draftMeta, photoToCome (the `_sgs_photo_to_come` marker), attributes (pa_ slugs), variesBy (per attribute taxonomy,
// the `_sgs_variesby_value` of each of the product's terms, '' for none, as the preflight reads it), variations (SKUs),
// permalink, facets (per facet slug, its term names) }, every image's attachment id, whether the product card shows the
// photo-to-come attachment as a photo (includes/product-card-no-photo.php::sgs_product_card_has_real_image; null when the
// site lacks it or the attachment), every facet's attribute (lib/site-build-catalogue-facets.mjs) and the site's
// WooCommerce facts (active, product base, the brand taxonomy, active plugins). `catalogue` gives the facets.
export function catalogueStatePhp( products, images, catalogue = {} ) {
	return `$in = json_decode( base64_decode( '${ b64( products ) }' ), true );
$imgs = json_decode( base64_decode( '${ b64( images ) }' ), true );
if ( ! class_exists( 'WooCommerce' ) ) { echo wp_json_encode( array( 'woocommerce' => false ) ); return; }
${ HELPERS }
${ facetStatePhp( catalogue ) }
$out = array();
foreach ( $in as $p ) {
	list( $id, $how ) = $sgs_find( $p );
	$row = array( 'draftId' => $p['draftId'], 'id' => $id, 'how' => $how );
	if ( $id ) {
		$wc = wc_get_product( $id );
		$attrs = array();
		$vb = array();
		foreach ( $wc ? $wc->get_attributes() : array() as $tax => $a ) {
			$attrs[] = (string) $tax;
			if ( taxonomy_exists( $tax ) ) {
				$vb[ $tax ] = array();
				foreach ( wc_get_product_terms( $id, $tax, array( 'fields' => 'ids' ) ) as $tid ) { $vb[ $tax ][] = $sgs_variesby( get_term_meta( $tid, '_sgs_variesby_value', true ) ); }
			}
		}
		$vars = array();
		foreach ( $wc ? $wc->get_children() : array() as $vid ) { $vars[] = (string) get_post_meta( $vid, '_sku', true ); }
		$cats = wp_get_object_terms( $id, 'product_cat', array( 'fields' => 'names' ) );
		$brand = taxonomy_exists( 'product_brand' ) ? wp_get_object_terms( $id, 'product_brand', array( 'fields' => 'names' ) ) : array();
		$row += array( 'fixture' => $sgs_is_fixture( $id ), 'type' => $wc ? $wc->get_type() : get_post_type( $id ), 'status' => get_post_status( $id ), 'sku' => (string) get_post_meta( $id, '_sku', true ),
			'price' => $wc ? (string) $wc->get_regular_price() : '', 'image' => (int) get_post_thumbnail_id( $id ), 'gallery' => $wc ? count( $wc->get_gallery_image_ids() ) : 0,
			'categories' => is_wp_error( $cats ) ? array() : $cats, 'brand' => is_wp_error( $brand ) ? array() : $brand, 'rrp' => (string) get_post_meta( $id, '_sgs_rrp', true ),
			'draftMeta' => (string) get_post_meta( $id, '_sgs_draft_product', true ), 'photoToCome' => '' !== (string) get_post_meta( $id, '_sgs_photo_to_come', true ), 'attributes' => $attrs, 'variesBy' => (object) $vb, 'variations' => $vars, 'permalink' => (string) get_permalink( $id ) );
		$row['facets'] = $sgs_product_facets( $id );
	}
	$out[] = $row;
}
$found = array();
foreach ( $imgs as $key => $img ) { $found[ $key ] = $sgs_attachment( $img ); }
$ptc = (int) ( $found['${ PHOTO_TO_COME }'] ?? 0 );
$shows = $ptc && function_exists( 'sgs_product_card_has_real_image' ) ? sgs_product_card_has_real_image( (string) wp_get_attachment_url( $ptc ) ) : null;
$permalinks = (array) get_option( 'woocommerce_permalinks', array() );
echo wp_json_encode( array( 'woocommerce' => true, 'products' => $out, 'images' => $found, 'facets' => (object) $facets, 'productBase' => trim( (string) ( $permalinks['product_base'] ?? '' ), '/' ), 'brandTaxonomy' => taxonomy_exists( 'product_brand' ), 'photoToComeShows' => $shows, 'plugins' => array_values( (array) get_option( 'active_plugins', array() ) ) ) );`;
}

// The write: `steps` is the plan's actions with each product's catalogue record; `uploads` maps an image key to
// { name, sha, data (base64) } for a draft asset to upload, or { url } to fetch; `catalogue` gives the facets, made
// before the products and given to each. Prints { done: [ … ], issues: [ … ] }.
export function catalogueApplyPhp( steps, images, uploads, productBase, catalogue = {} ) {
	return `$steps = json_decode( base64_decode( '${ b64( steps ) }' ), true );
$imgs = json_decode( base64_decode( '${ b64( images ) }' ), true );
$uploads = json_decode( base64_decode( '${ b64( uploads ) }' ), true );
$base = json_decode( base64_decode( '${ b64( productBase ) }' ), true );
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
${ HELPERS }
$done = array();
$issues = array();
if ( $base ) {
	$perm = (array) get_option( 'woocommerce_permalinks', array() );
	if ( trim( (string) ( $perm['product_base'] ?? '' ), '/' ) !== $base ) {
		$perm['product_base'] = '/' . $base;
		// Saved only: the product post type registered at init with the old base, so a flush in this request would
		// rebuild the old rules. The step flushes in a fresh request (productBaseFlushPhp) and verifies a product's address.
		update_option( 'woocommerce_permalinks', $perm );
		$done[] = 'product base /' . $base;
	}
}
$image_id = function ( $key ) use ( $imgs, $uploads, $sgs_attachment, &$done, &$issues ) {
	if ( ! isset( $imgs[ $key ] ) ) { return 0; }
	$have = $sgs_attachment( $imgs[ $key ] );
	if ( $have ) { return $have; }
	$u = $uploads[ $key ] ?? null;
	if ( ! $u ) { return 0; }
	if ( ! empty( $u['url'] ) ) {
		// media_sideload_image() refuses an address without an image file extension (a stock photo's), so the file is
		// downloaded, its type read from its bytes, and named from its stock name or address with that type's extension.
		$tmp = download_url( $u['url'] );
		if ( is_wp_error( $tmp ) ) { $issues[] = 'image ' . $u['url'] . ': ' . $tmp->get_error_message(); return 0; }
		$mime = wp_get_image_mime( $tmp );
		$ext = $mime ? wp_get_default_extension_for_mime_type( $mime ) : '';
		if ( ! $ext ) { wp_delete_file( $tmp ); $issues[] = 'image ' . $u['url'] . ': not an image file'; return 0; }
		$stem = ! empty( $u['stem'] ) ? $u['stem'] : pathinfo( (string) wp_parse_url( $u['url'], PHP_URL_PATH ), PATHINFO_FILENAME );
		$id = media_handle_sideload( array( 'name' => sanitize_file_name( ( '' !== $stem ? $stem : 'draft-image' ) . '.' . $ext ), 'tmp_name' => $tmp ), 0 );
		if ( is_wp_error( $id ) ) { wp_delete_file( $tmp ); $issues[] = 'image ' . $u['url'] . ': ' . $id->get_error_message(); return 0; }
		update_post_meta( $id, '_sgs_draft_image_source', $u['url'] );
		$done[] = 'image fetched ' . $u['url'];
		return (int) $id;
	}
	$bits = wp_upload_bits( sanitize_file_name( $u['name'] ), null, base64_decode( $u['data'] ) );
	if ( ! empty( $bits['error'] ) ) { $issues[] = 'image ' . $u['name'] . ': ' . $bits['error']; return 0; }
	$type = wp_check_filetype( $bits['file'] );
	$id = wp_insert_attachment( array( 'post_mime_type' => $type['type'], 'post_title' => sanitize_text_field( pathinfo( $u['name'], PATHINFO_FILENAME ) ), 'post_status' => 'inherit' ), $bits['file'] );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $bits['file'] ) );
	update_post_meta( $id, '_sgs_draft_asset', $u['sha'] );
	$done[] = 'image uploaded ' . $u['name'];
	return (int) $id;
};
$attribute = function ( $label, $slug ) {
	$tax = wc_attribute_taxonomy_name( $slug );
	if ( ! wc_attribute_taxonomy_id_by_name( $tax ) ) {
		$made = wc_create_attribute( array( 'name' => $label, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false ) );
		if ( is_wp_error( $made ) ) { return ''; }
	}
	delete_transient( 'wc_attribute_taxonomies' );
	if ( ! taxonomy_exists( $tax ) ) {
		register_taxonomy( $tax, array( 'product' ), array( 'labels' => array( 'name' => $label ), 'hierarchical' => false, 'show_ui' => false, 'query_var' => true, 'rewrite' => false ) );
	}
	return $tax;
};
$term = function ( $name, $tax ) {
	$t = get_term_by( 'name', $name, $tax );
	if ( $t ) { return $t; }
	$r = wp_insert_term( $name, $tax );
	return is_wp_error( $r ) ? null : get_term( $r['term_id'], $tax );
};
${ facetApplyPhp( catalogue ) }
foreach ( $steps as $s ) {
	$p = $s['product'];
	list( $id ) = $sgs_find( $p );
	if ( $id && $sgs_is_fixture( $id ) ) { $issues[] = $p['draftId'] . ': matches fixture product ' . $id . ', left'; continue; }
	$ours = ! $id || (string) get_post_meta( $id, '_sku', true ) === $p['sku'];
	$wc = $id ? wc_get_product( $id ) : ( 'variable' === $p['type'] ? new WC_Product_Variable() : new WC_Product_Simple() );
	if ( ! $id ) {
		$wc->set_name( $p['name'] );
		$wc->set_slug( $p['slug'] );
		$wc->set_status( 'draft' );
		$wc->set_catalog_visibility( 'visible' );
		$wc->set_sku( $p['sku'] );
		if ( null !== $p['shortDescription'] ) { $wc->set_short_description( $p['shortDescription'] ); }
	}
	if ( '' === (string) $wc->get_regular_price() && 'simple' === $p['type'] ) { $wc->set_regular_price( (string) $p['price'] ); }
	$taxes = array();
	if ( ! $wc->get_attributes() && $p['attributes'] && $wc->is_type( $p['type'] ) ) {
		$list = array();
		$defaults = array();
		foreach ( $p['attributes'] as $a ) {
			$tax = $attribute( $a['label'], $a['slug'] );
			if ( ! $tax ) { $issues[] = $p['draftId'] . ': attribute ' . $a['slug'] . ' not created'; continue; }
			$ids = array();
			foreach ( $a['options'] as $o ) {
				$t = $term( $o['term'], $tax );
				if ( ! $t ) { continue; }
				$ids[] = (int) $t->term_id;
				if ( $o['swatch'] ) { update_term_meta( $t->term_id, '_sgs_swatch_color', sanitize_hex_color( $o['swatch'] ) ); }
				if ( $a['default'] === $o['term'] ) { $defaults[ $tax ] = $t->slug; }
			}
			$attr = new WC_Product_Attribute();
			$attr->set_id( wc_attribute_taxonomy_id_by_name( $tax ) );
			$attr->set_name( $tax );
			$attr->set_options( $ids );
			$attr->set_visible( true );
			$attr->set_variation( true );
			$list[ $tax ] = $attr;
			$taxes[ $a['slug'] ] = $tax;
		}
		$wc->set_attributes( $list );
		$wc->set_default_attributes( $defaults );
	}
	$id = $wc->save();
	if ( ! $ours ) {
		$done[] = $p['draftId'] . ': adopted product ' . $id . ' (its name, price and choices left as they are)';
	}
	update_post_meta( $id, '_sgs_draft_product', $p['draftId'] );
	if ( null !== $p['rrp'] && '' === (string) get_post_meta( $id, '_sgs_rrp', true ) ) { update_post_meta( $id, '_sgs_rrp', $p['rrp'] ); }
	if ( $p['categories'] && ! wp_get_object_terms( $id, 'product_cat', array( 'fields' => 'ids', 'exclude' => array( (int) get_option( 'default_product_cat' ) ) ) ) ) { wp_set_object_terms( $id, $p['categories'], 'product_cat' ); }
	if ( $p['brand'] && taxonomy_exists( 'product_brand' ) && ! wp_get_object_terms( $id, 'product_brand', array( 'fields' => 'ids' ) ) ) { wp_set_object_terms( $id, array( $p['brand'] ), 'product_brand' ); }
	foreach ( $p['attributes'] as $a ) {
		if ( $a['packSize'] && isset( $taxes[ $a['slug'] ] ) ) { update_post_meta( $id, '_sgs_pack_size_axis', $taxes[ $a['slug'] ] ); }
	}
	// Each attribute's Google variesBy axis on its terms that have none (a value already set is never replaced), so the
	// product preflight's no_variesby check passes when the product publishes.
	foreach ( $p['attributes'] as $a ) {
		$tax = wc_attribute_taxonomy_name( $a['slug'] );
		if ( empty( $a['variesBy'] ) || ! taxonomy_exists( $tax ) ) { continue; }
		foreach ( wc_get_product_terms( $id, $tax, array( 'fields' => 'ids' ) ) as $tid ) {
			if ( '' === $sgs_variesby( get_term_meta( $tid, '_sgs_variesby_value', true ) ) ) {
				update_term_meta( $tid, '_sgs_variesby_value', $sgs_variesby( $a['variesBy'] ) );
				$done[] = $p['draftId'] . ': variesBy ' . $a['variesBy'] . ' on ' . $tax . ' term ' . $tid;
			}
		}
	}
	// An image the product has stays, unless it is the photo-to-come image and the draft gives one; a product that would
	// be left with none gets the photo-to-come image.
	$ptc = function () use ( $imgs, $sgs_attachment ) { return isset( $imgs['${ PHOTO_TO_COME }'] ) ? $sgs_attachment( $imgs['${ PHOTO_TO_COME }'] ) : 0; };
	$thumb = (int) get_post_thumbnail_id( $id );
	if ( ! $thumb || ( '${ PHOTO_TO_COME }' !== $s['image'] && $thumb === $ptc() ) ) {
		$att = $s['image'] ? $image_id( $s['image'] ) : 0;
		if ( ! $att && ! $thumb ) { $att = $image_id( '${ PHOTO_TO_COME }' ); }
		$att && set_post_thumbnail( $id, $att );
	}
	$thumb = (int) get_post_thumbnail_id( $id );
	if ( $thumb && $thumb === $ptc() ) {
		update_post_meta( $id, '_sgs_photo_to_come', '1' );
	} else {
		delete_post_meta( $id, '_sgs_photo_to_come' );
	}
	$wc = wc_get_product( $id );
	if ( $s['gallery'] && ! $wc->get_gallery_image_ids() ) {
		$ids = array_values( array_filter( array_map( $image_id, $s['gallery'] ) ) );
		if ( $ids ) { $wc->set_gallery_image_ids( $ids ); $wc->save(); }
	}
	if ( ( $ours || ! $wc->get_children() ) && 'variable' === $p['type'] && $wc->is_type( 'variable' ) ) {
		$have = array();
		foreach ( $wc->get_children() as $vid ) { $have[ (string) get_post_meta( $vid, '_sku', true ) ] = $vid; }
		foreach ( $p['variations'] as $v ) {
			if ( isset( $have[ $v['sku'] ] ) ) { continue; }
			$va = new WC_Product_Variation();
			$va->set_parent_id( $id );
			$va->set_sku( $v['sku'] );
			$va->set_regular_price( (string) $v['price'] );
			$set = array();
			foreach ( $v['options'] as $slug => $name ) {
				$tax = wc_attribute_taxonomy_name( $slug );
				$t = get_term_by( 'name', $name, $tax );
				if ( $t ) { $set[ $tax ] = $t->slug; }
			}
			$va->set_attributes( $set );
			$va->set_status( 'publish' );
			$vid = $va->save();
			foreach ( $p['attributes'] as $a ) {
				if ( ! $a['packSize'] || ! isset( $v['options'][ $a['slug'] ] ) ) { continue; }
				foreach ( $a['options'] as $o ) {
					if ( $o['term'] !== $v['options'][ $a['slug'] ] ) { continue; }
					update_post_meta( $vid, '_sgs_unit_divisor', (int) $o['value'] );
					if ( $o['badge'] ) { update_post_meta( $vid, '_sgs_discount_label', $o['badge'] ); }
				}
			}
		}
		WC_Product_Variable::sync( $id );
	}
	$sgs_assign_facets( $id, $p, $ours );
	if ( ! empty( $s['hold'] ) ) {
		$done[] = $p['draftId'] . ': product ' . $id . ' kept a draft (no choice is a Google variesBy axis)';
		continue;
	}
	if ( 'publish' !== get_post_status( $id ) ) {
		wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
	}
	if ( 'publish' !== get_post_status( $id ) ) {
		$issues[] = $p['draftId'] . ': not published (product preflight) ' . wp_json_encode( get_post_meta( $id, '_sgs_preflight_issues', true ) );
	}
	$done[] = $p['draftId'] . ': product ' . $id;
}
echo wp_json_encode( array( 'done' => $done, 'issues' => $issues ) );`;
}

// The flush and its proof, run in a request of its own after the write saved `woocommerce_permalinks` (the product post
// type then registers with the new base). `draftIds` are the catalogue's draft ids; the first published product found by
// `_sgs_draft_product` is the probe. Prints { base, rules (stored rewrite rules starting with the base), permalink, http
// (the status of a GET to it, null when the site cannot call itself), error }.
export function productBaseFlushPhp( base, draftIds ) {
	return `$base = json_decode( base64_decode( '${ b64( base ) }' ), true );
$draft_ids = json_decode( base64_decode( '${ b64( draftIds ) }' ), true );
flush_rewrite_rules( false );
$rules = 0;
foreach ( array_keys( (array) get_option( 'rewrite_rules', array() ) ) as $re ) {
	if ( 0 === strpos( (string) $re, $base . '/' ) ) { $rules++; }
}
$permalink = '';
foreach ( $draft_ids as $draft_id ) {
	$ids = get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_sgs_draft_product', 'meta_value' => $draft_id, 'suppress_filters' => true ) );
	if ( $ids ) { $permalink = (string) get_permalink( (int) $ids[0] ); break; }
}
$http = null;
$error = '';
if ( '' !== $permalink ) {
	$reply = wp_remote_get( $permalink, array( 'timeout' => 30, 'sslverify' => false, 'redirection' => 5 ) );
	if ( is_wp_error( $reply ) ) { $error = $reply->get_error_message(); } else { $http = (int) wp_remote_retrieve_response_code( $reply ); }
}
echo wp_json_encode( array( 'base' => $base, 'rules' => $rules, 'permalink' => $permalink, 'http' => $http, 'error' => $error ) );`;
}
