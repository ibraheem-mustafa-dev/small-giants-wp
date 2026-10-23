// What a site holds that the site build compares with the page map (Spec 48 FR-48-55), read in one `wp eval-file`:
// the posts the rows' ids name (a mega panel's with its section page), every post carrying a row key, the posts already holding an unbuilt row's type and
// slug, the classic menus with each one's site-build mark and each item's stored title, the theme's menu locations and
// page templates per post type, the front-page, posts-page and permalink options, and the three
// active-layout pointers (read only; they are written through `wp sgs <area> set-active`).
import { hasPost, rowKey, wpType } from './site-build-map.mjs';

export const ROW_META = '_sgs_site_build_row';
export const TREE_META = '_sgs_site_build_tree';
// A mega panel's Section page (Sgs_Mega_Menu_CPT::META_SECTION_PAGE): the page id every item opening it links to.
export const SECTION_META = '_sgs_mega_section_page';
// The term meta a menu the site build made carries (its page-map menu name); a same-slug menu without it is not reused.
export const MENU_META = '_sgs_site_build_menu';
// The option holding the hash of the tree each site-owned template copy was built from (template slug -> hash): the
// next run rebuilds a copy only when its tree changed, and a saved copy not recorded here is another author's.
export const TEMPLATE_OPTION = 'sgs_site_build_templates';
// The WooCommerce page options part 6 sets, and the page-map role each one takes.
export const WOO_OPTIONS = [ 'woocommerce_shop_page_id', 'woocommerce_cart_page_id', 'woocommerce_checkout_page_id', 'woocommerce_myaccount_page_id' ];

// The rows' facts go in as base64 JSON, so no slug or title can break out of the PHP string.
export function statePhp( rows ) {
	const input = {
		ids: rows.filter( hasPost ).map( ( r ) => r.id ).filter( ( id ) => Number.isInteger( id ) ),
		types: [ ...new Set( rows.filter( hasPost ).map( wpType ) ) ],
		keys: rows.filter( hasPost ).map( rowKey ),
		unbuilt: rows.filter( ( r ) => hasPost( r ) && ! Number.isInteger( r.id ) ).map( ( r ) => ( { key: rowKey( r ), type: wpType( r ), slug: r.slug } ) ),
	};
	return `
$in = json_decode( base64_decode( '${ Buffer.from( JSON.stringify( input ) ).toString( 'base64' ) }' ), true );
$ids = $in['ids'];
$types = $in['types'];
$keys = $in['keys'];
$post = function ( $id ) {
	$p = get_post( (int) $id );
	if ( ! $p ) {
		return null;
	}
	return array(
		'id' => (int) $p->ID, 'type' => $p->post_type, 'slug' => $p->post_name, 'title' => $p->post_title,
		'status' => $p->post_status, 'parent' => (int) $p->post_parent, 'template' => (string) get_page_template_slug( $p ),
		'rowKey' => (string) get_post_meta( $p->ID, '${ ROW_META }', true ), 'treeHash' => (string) get_post_meta( $p->ID, '${ TREE_META }', true ),
		'sectionPage' => (int) get_post_meta( $p->ID, '${ SECTION_META }', true ),
	);
};
$out = array( 'posts' => array(), 'marked' => array(), 'menus' => array() );
$marked = get_posts( array( 'post_type' => $types, 'post_status' => array( 'publish', 'draft', 'pending', 'private', 'future' ), 'numberposts' => -1, 'meta_key' => '${ ROW_META }', 'fields' => 'ids' ) );
$held_ids = array();
foreach ( $in['unbuilt'] as $u ) {
	$held_ids = array_merge( $held_ids, get_posts( array( 'post_type' => $u['type'], 'name' => $u['slug'], 'post_status' => array( 'publish', 'draft', 'pending', 'private', 'future' ), 'numberposts' => -1, 'fields' => 'ids' ) ) );
}
foreach ( array_unique( array_merge( $ids, $marked, $held_ids ) ) as $id ) {
	$out['posts'][ (string) $id ] = $post( $id );
}
foreach ( $marked as $id ) {
	$k = (string) get_post_meta( $id, '${ ROW_META }', true );
	if ( in_array( $k, $keys, true ) ) {
		$out['marked'][ $k ][] = (int) $id;
	}
}
$out['holders'] = array();
foreach ( $in['unbuilt'] as $u ) {
	$held = get_posts( array( 'post_type' => $u['type'], 'name' => $u['slug'], 'post_status' => array( 'publish', 'draft', 'pending', 'private', 'future' ), 'numberposts' => -1, 'fields' => 'ids' ) );
	if ( $held ) {
		$out['holders'][ $u['key'] ] = array_map( 'intval', $held );
	}
}
foreach ( wp_get_nav_menus() as $m ) {
	$items = array();
	foreach ( (array) wp_get_nav_menu_items( $m->term_id, array( 'post_status' => 'any' ) ) as $it ) {
		$items[] = array(
			'id' => (int) $it->ID, 'title' => (string) get_post_field( 'post_title', $it->ID ), 'object' => (string) $it->object,
			'objectId' => (int) $it->object_id, 'type' => (string) $it->type, 'parent' => (int) $it->menu_item_parent,
			'order' => (int) $it->menu_order, 'url' => (string) get_post_meta( $it->ID, '_menu_item_url', true ), 'invalid' => ! empty( $it->_invalid ),
		);
	}
	$out['menus'][] = array( 'id' => (int) $m->term_id, 'slug' => $m->slug, 'name' => $m->name, 'owner' => (string) get_term_meta( $m->term_id, '${ MENU_META }', true ), 'items' => $items );
}
$out['locations'] = (object) get_nav_menu_locations();
$out['registeredLocations'] = array_keys( get_registered_nav_menus() );
$out['templates'] = array();
foreach ( $types as $t ) {
	$out['templates'][ $t ] = array_values( array_unique( array_merge( array_keys( wp_get_theme()->get_page_templates( null, $t ) ), wp_list_pluck( get_block_templates( array( 'post_type' => $t ), 'wp_template' ), 'slug' ) ) ) );
}
$out['options'] = array();
foreach ( array( 'show_on_front', 'page_on_front', 'page_for_posts', 'permalink_structure', ${ WOO_OPTIONS.map( ( o ) => `'${ o }'` ).join( ', ' ) } ) as $o ) {
	$out['options'][ $o ] = (string) get_option( $o );
}
$out['templateHashes'] = (object) (array) get_option( '${ TEMPLATE_OPTION }', array() );
$out['customTemplates'] = array();
foreach ( get_block_templates( array(), 'wp_template' ) as $t ) {
	if ( 'custom' === $t->source ) {
		$out['customTemplates'][] = $t->slug;
	}
}
$out['pointers'] = array();
foreach ( array( 'header', 'footer', 'drawer' ) as $a ) {
	$out['pointers'][ $a ] = (int) get_option( 'sgs_active_' . $a . '_cpt_id', 0 );
}
echo wp_json_encode( $out );
`;
}

// The state, from a runner that executes PHP on the site (lib/calibration-refs.mjs::wpEvalRunner).
export function readState( runPhp, rows ) {
	const text = String( runPhp( statePhp( rows ) ) );
	const start = text.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the site state read printed no JSON: ${ text.slice( 0, 300 ) }` );
	}
	return JSON.parse( text.slice( start ) );
}
