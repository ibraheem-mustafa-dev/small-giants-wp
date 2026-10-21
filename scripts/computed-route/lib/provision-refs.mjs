// What provision-calibration-refs.mjs creates on a test site so every calibration-fixture role resolves there
// (lib/calibration-refs.mjs::ROLES), and the plan for one site from what it already holds. Pure: the site is read and
// written through PHP the caller runs (`wp eval-file -`), so the planner is tested on a fake site state.
//
// The calibration menu gives the menu blocks what a real primary menu gives them: seven top-level items, one with a
// two-item submenu and one opening a mega panel, a plain custom link fourth (the `menuItem` role, which the fixtures
// split after, disable and feature), and last a link to the target's own calibration page, so on that page the menu
// renders a current-page item (aria-current) and the *Current settings have an element to paint. That item carries the description "SOON": the menu blocks render a menu item's
// Description as its badge copy (includes/nav-menu-markup.php::sgs_nav_shared_badge_html), so the itemBadge* settings
// have an element to paint only when it is set. WordPress stores the description in the item's post_content.
// The drawer is a minimal sgs/nav-drawer post: a stacked nav of two buttons and a
// two-link icon list.
export const MENU_NAME = 'CR calibration';
export const MENU_ITEMS = [
	{ key: 'shop', title: 'Shop', url: '/shop/' },
	{ key: 'shopOne', title: 'Child one', url: '/shop/one/', parent: 'shop' },
	{ key: 'shopTwo', title: 'Child two', url: '/shop/two/', parent: 'shop' },
	{ key: 'panel', title: 'Panel', post: 'panel' },
	{ key: 'about', title: 'About', url: '/about/' },
	{ key: 'featured', title: 'Featured', url: '#', description: 'SOON' },
	{ key: 'help', title: 'Help', url: '/help/' },
	{ key: 'contact', title: 'Contact', url: '/contact/' },
	{ key: 'current', title: 'Calibration page', page: true },
];
export const MENU_ITEM_ROLE_KEY = 'featured';
// The item linked to the target's calibration page (calibration-targets.json `postId`).
export const CURRENT_ITEM_KEY = 'current';
export const POSTS = {
	panel: {
		type: 'sgs_mega_menu',
		slug: 'cr-calibration-panel',
		title: 'CR calibration panel',
		content: '<!-- wp:sgs/mega-panel -->\n<!-- wp:sgs/heading {"content":"Calibration panel","level":"h3"} /-->\n\n<!-- wp:sgs/text {"text":"A line of panel text."} /-->\n<!-- /wp:sgs/mega-panel -->',
	},
	drawer: {
		type: 'sgs_drawer',
		slug: 'cr-calibration-drawer',
		title: 'CR calibration drawer',
		content: [
			'<!-- wp:sgs/nav-drawer {"drawerAlign":"stretch"} -->',
			'<!-- wp:sgs/container {"layout":"stack","tagName":"nav","ariaLabel":"Shop"} -->',
			'<!-- wp:sgs/button {"label":"First link","url":"/shop/"} /-->',
			'',
			'<!-- wp:sgs/button {"label":"Second link","url":"/about/"} /-->',
			'<!-- /wp:sgs/container -->',
			'',
			'<!-- wp:sgs/container {"layout":"stack","tagName":"div"} -->',
			'<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"","text":"Help","url":"/help/"},{"iconSource":"lucide","iconName":"","text":"Contact","url":"/contact/"}],"markerType":"none"} /-->',
			'<!-- /wp:sgs/container -->',
			'<!-- /wp:sgs/nav-drawer -->',
		].join( '\n' ),
	},
};
// Media roles and the attachment title each is found or imported under.
export const MEDIA = { image: 'CR calibration image', logo: 'CR calibration logo' };
export const PRODUCT_TITLE = 'CR calibration product';

const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );

// Read-only PHP describing what the site holds: { woocommerce, menu, items: [ { id, title, parent, object, objectId } ],
// posts: { key: id|null }, media: { role: { id, url }|null }, product: id|null }.
export function statePhp() {
	return `$spec = json_decode( base64_decode( '${ b64( { menu: MENU_NAME, posts: Object.fromEntries( Object.entries( POSTS ).map( ( [ k, p ] ) => [ k, [ p.type, p.slug ] ] ) ), media: MEDIA, product: PRODUCT_TITLE } ) }' ), true );
$s = array( 'woocommerce' => class_exists( 'WooCommerce' ), 'menu' => null, 'items' => array(), 'posts' => array(), 'media' => array(), 'product' => null );
$m = wp_get_nav_menu_object( $spec['menu'] );
if ( $m ) {
	$s['menu'] = (int) $m->term_id;
	foreach ( wp_get_nav_menu_items( $m->term_id, array( 'post_status' => 'any' ) ) ?: array() as $i ) {
		$s['items'][] = array( 'id' => (int) $i->ID, 'description' => (string) get_post_field( 'post_content', $i->ID ), 'title' => $i->title, 'parent' => (int) $i->menu_item_parent, 'object' => $i->object, 'objectId' => (int) $i->object_id );
	}
}
foreach ( $spec['posts'] as $k => $p ) {
	$f = get_page_by_path( $p[1], OBJECT, $p[0] );
	$s['posts'][ $k ] = $f ? (int) $f->ID : null;
}
foreach ( $spec['media'] as $k => $title ) {
	$q = get_posts( array( 'post_type' => 'attachment', 'title' => $title, 'post_status' => 'inherit', 'numberposts' => 1 ) );
	$s['media'][ $k ] = $q ? array( 'id' => (int) $q[0]->ID, 'url' => wp_get_attachment_url( $q[0]->ID ) ) : null;
}
$q = get_posts( array( 'post_type' => 'product', 'title' => $spec['product'], 'post_status' => 'publish', 'numberposts' => 1 ) );
$s['product'] = $q ? (int) $q[0]->ID : null;
echo wp_json_encode( $s );`;
}

// The menu item already on the site for one spec item (same title under the same parent), or null.
function findItem( state, item, itemIds ) {
	const parent = item.parent ? itemIds[ item.parent ] ?? -1 : 0;
	return state.items.find( ( i ) => i.title === item.title && i.parent === parent ) || null;
}

// The plan for one site. state: statePhp's result. refs: the target's current refs (a role whose object the existence
// check proved is kept, `kept`). files: { image, logo } local files to import (absent: an image is not imported and a
// logo reuses the image). page: the target's calibration page id (required: the current-page item links to it). Returns { actions: [ text ], refs: { role: id | { id, url } | 'new' | 'same-as-image' },
// unsupplied: [ { role, why } ], known: ids for applyPhp }.
export function planProvision( state, { refs = {}, kept = {}, files = {}, page = null } = {} ) {
	if ( ! page ) {
		throw new Error( 'planProvision needs the target\'s calibration page id (calibration-targets.json postId) for the current-page item' );
	}
	const actions = [];
	const unsupplied = [];
	const out = {};
	const known = { menu: state.menu, items: {}, posts: { ...state.posts }, media: {}, product: state.product, page };
	if ( ! state.menu ) {
		actions.push( `create menu "${ MENU_NAME }"` );
	}
	for ( const item of MENU_ITEMS ) {
		const have = state.menu ? findItem( state, item, known.items ) : null;
		if ( have ) {
			known.items[ item.key ] = have.id;
			if ( undefined !== item.description && ( have.description ?? '' ) !== item.description ) {
				actions.push( `set description of menu item "${ item.title }" to "${ item.description }"` );
			}
			if ( item.page && have.objectId !== page ) {
				actions.push( `relink menu item "${ item.title }" to post ${ page } (the calibration page)` );
			}
		} else if ( item.page ) {
			actions.push( `add menu item "${ item.title }" linking to post ${ page } (the calibration page)` );
		} else {
			actions.push( `add menu item "${ item.title }"${ item.parent ? ` under "${ MENU_ITEMS.find( ( i ) => i.key === item.parent ).title }"` : '' }${ item.post ? ` opening ${ POSTS[ item.post ].type } "${ POSTS[ item.post ].slug }"` : ` (${ item.url })` }${ item.description ? ` with description "${ item.description }"` : '' }` );
		}
	}
	for ( const [ key, p ] of Object.entries( POSTS ) ) {
		state.posts[ key ] || actions.push( `create ${ p.type } "${ p.slug }" (${ p.title })` );
	}
	out.menu = state.menu || 'new';
	out.menuItem = known.items[ MENU_ITEM_ROLE_KEY ] || 'new';
	out.drawer = state.posts.drawer || 'new';
	// Media: a role the target already supplies with an existing object is kept; else a found or imported attachment.
	for ( const role of Object.keys( MEDIA ) ) {
		if ( refs[ role ] && true === kept[ role ] ) {
			out[ role ] = refs[ role ];
			known.media[ role ] = refs[ role ];
		} else if ( state.media[ role ] ) {
			out[ role ] = 'image' === role ? state.media[ role ] : state.media[ role ].id;
			known.media[ role ] = state.media[ role ];
		} else if ( files[ role ] ) {
			actions.push( `import ${ files[ role ] } as "${ MEDIA[ role ] }"` );
			out[ role ] = 'new';
		} else if ( 'logo' === role && out.image ) {
			out.logo = 'same-as-image';
			actions.push( 'logo reuses the image attachment (no --logo file given)' );
		} else {
			unsupplied.push( { role, why: `no attachment titled "${ MEDIA[ role ] }" and no --${ role } file given` } );
		}
	}
	if ( refs.product && true === kept.product ) {
		out.product = refs.product;
	} else if ( state.product ) {
		out.product = state.product;
	} else if ( state.woocommerce ) {
		actions.push( `create product "${ PRODUCT_TITLE }"` );
		out.product = 'new';
	} else {
		unsupplied.push( { role: 'product', why: 'WooCommerce is not active on the site' } );
	}
	return { actions, refs: out, unsupplied, known };
}

// PHP that finds or creates every object of the plan and prints { menu, items: { key: id }, posts: { key: id },
// media: { role: { id, url } }, product } (or { error }). It finds before it creates, so a second run creates nothing.
// media: { role: { name, mime, data (base64) } } for the files to import.
export function applyPhp( { known, media = {}, product = false } ) {
	return `$a = json_decode( base64_decode( '${ b64( { known, items: MENU_ITEMS, posts: POSTS, menuName: MENU_NAME, mediaTitles: MEDIA, media, product, productTitle: PRODUCT_TITLE } ) }' ), true );
$ids = $a['known'];
$fail = function ( $why ) { echo wp_json_encode( array( 'error' => $why ) ); exit; };
foreach ( $a['posts'] as $k => $p ) {
	if ( ! empty( $ids['posts'][ $k ] ) ) { continue; }
	$f = get_page_by_path( $p['slug'], OBJECT, $p['type'] );
	$id = $f ? $f->ID : wp_insert_post( wp_slash( array( 'post_type' => $p['type'], 'post_status' => 'publish', 'post_title' => $p['title'], 'post_name' => $p['slug'], 'post_content' => $p['content'] ) ), true );
	if ( is_wp_error( $id ) ) { $fail( "{$p['type']} {$p['slug']}: " . $id->get_error_message() ); }
	$ids['posts'][ $k ] = (int) $id;
}
if ( empty( $ids['menu'] ) ) {
	$m = wp_get_nav_menu_object( $a['menuName'] );
	$id = $m ? $m->term_id : wp_create_nav_menu( $a['menuName'] );
	if ( is_wp_error( $id ) ) { $fail( 'menu: ' . $id->get_error_message() ); }
	$ids['menu'] = (int) $id;
}
$have = wp_get_nav_menu_items( $ids['menu'], array( 'post_status' => 'any' ) ) ?: array();
if ( ! get_post( $ids['page'] ) || 'trash' === get_post_status( $ids['page'] ) ) { $fail( "calibration page {$ids['page']} does not exist or is in the trash" ); }
$page_args = array( 'menu-item-type' => 'post_type', 'menu-item-object' => get_post_type( $ids['page'] ), 'menu-item-object-id' => $ids['page'] );
$pos = 0;
foreach ( $a['items'] as $it ) {
	$pos++;
	$k = $it['key'];
	if ( ! empty( $ids['items'][ $k ] ) ) { continue; }
	$parent = empty( $it['parent'] ) ? 0 : (int) $ids['items'][ $it['parent'] ];
	foreach ( $have as $h ) {
		if ( $h->title === $it['title'] && (int) $h->menu_item_parent === $parent ) { $ids['items'][ $k ] = (int) $h->ID; continue 2; }
	}
	$args = array( 'menu-item-title' => $it['title'], 'menu-item-description' => $it['description'] ?? '', 'menu-item-status' => 'publish', 'menu-item-parent-id' => $parent, 'menu-item-position' => $pos );
	if ( ! empty( $it['page'] ) ) {
		$args += $page_args;
	} elseif ( ! empty( $it['post'] ) ) {
		$args += array( 'menu-item-type' => 'post_type', 'menu-item-object' => $a['posts'][ $it['post'] ]['type'], 'menu-item-object-id' => $ids['posts'][ $it['post'] ] );
	} else {
		$args += array( 'menu-item-type' => 'custom', 'menu-item-url' => $it['url'] );
	}
	$id = wp_update_nav_menu_item( $ids['menu'], 0, $args );
	if ( is_wp_error( $id ) ) { $fail( "menu item {$it['title']}: " . $id->get_error_message() ); }
	$ids['items'][ $k ] = (int) $id;
}
// An existing current-page item linked to another post is relinked in place.
foreach ( $a['items'] as $it ) {
	if ( empty( $it['page'] ) || empty( $ids['items'][ $it['key'] ] ) ) { continue; }
	if ( (int) get_post_meta( $ids['items'][ $it['key'] ], '_menu_item_object_id', true ) === (int) $ids['page'] ) { continue; }
	$r = wp_update_nav_menu_item( $ids['menu'], $ids['items'][ $it['key'] ], array( 'menu-item-title' => $it['title'], 'menu-item-status' => 'publish', 'menu-item-parent-id' => 0, 'menu-item-position' => count( $a['items'] ) ) + $page_args );
	if ( is_wp_error( $r ) ) { $fail( "menu item {$it['title']} relink: " . $r->get_error_message() ); }
}
// An item that already existed gets its description set (WordPress keeps it in post_content).
foreach ( $a['items'] as $it ) {
	if ( ! isset( $it['description'] ) || empty( $ids['items'][ $it['key'] ] ) ) { continue; }
	if ( get_post_field( 'post_content', $ids['items'][ $it['key'] ] ) === $it['description'] ) { continue; }
	$r = wp_update_post( wp_slash( array( 'ID' => $ids['items'][ $it['key'] ], 'post_content' => $it['description'] ) ), true );
	if ( is_wp_error( $r ) ) { $fail( "menu item {$it['title']} description: " . $r->get_error_message() ); }
}
require_once ABSPATH . 'wp-admin/includes/image.php';
foreach ( $a['media'] as $role => $m ) {
	if ( ! empty( $ids['media'][ $role ] ) ) { continue; }
	$q = get_posts( array( 'post_type' => 'attachment', 'title' => $a['mediaTitles'][ $role ], 'post_status' => 'inherit', 'numberposts' => 1 ) );
	if ( $q ) { $ids['media'][ $role ] = array( 'id' => (int) $q[0]->ID, 'url' => wp_get_attachment_url( $q[0]->ID ) ); continue; }
	$bits = wp_upload_bits( $m['name'], null, base64_decode( $m['data'] ) );
	if ( ! empty( $bits['error'] ) ) { $fail( "upload {$m['name']}: {$bits['error']}" ); }
	$att = wp_insert_attachment( array( 'post_mime_type' => $m['mime'], 'post_title' => $a['mediaTitles'][ $role ], 'post_status' => 'inherit' ), $bits['file'], 0, true );
	if ( is_wp_error( $att ) ) { $fail( "attachment {$m['name']}: " . $att->get_error_message() ); }
	wp_update_attachment_metadata( $att, wp_generate_attachment_metadata( $att, $bits['file'] ) );
	$ids['media'][ $role ] = array( 'id' => (int) $att, 'url' => wp_get_attachment_url( $att ) );
}
if ( $a['product'] && empty( $ids['product'] ) && class_exists( 'WC_Product_Simple' ) ) {
	$q = get_posts( array( 'post_type' => 'product', 'title' => $a['productTitle'], 'post_status' => 'publish', 'numberposts' => 1 ) );
	if ( $q ) {
		$ids['product'] = (int) $q[0]->ID;
	} else {
		$p = new WC_Product_Simple();
		$p->set_name( $a['productTitle'] );
		$p->set_regular_price( '10' );
		$p->set_status( 'publish' );
		$ids['product'] = (int) $p->save();
	}
}
echo wp_json_encode( $ids );`;
}

// The target's refs from the plan and the apply result: every 'new' filled from what the site printed.
export function refsFromResult( plan, result ) {
	const out = {};
	for ( const [ role, v ] of Object.entries( plan.refs ) ) {
		if ( 'new' !== v && 'same-as-image' !== v ) {
			out[ role ] = v;
		}
	}
	out.menu = result.menu;
	out.menuItem = result.items?.[ MENU_ITEM_ROLE_KEY ];
	out.drawer = result.posts?.drawer;
	if ( 'new' === plan.refs.image ) {
		out.image = result.media?.image;
	}
	if ( 'new' === plan.refs.logo ) {
		out.logo = result.media?.logo?.id;
	} else if ( 'same-as-image' === plan.refs.logo ) {
		out.logo = out.image?.id;
	}
	if ( 'new' === plan.refs.product ) {
		result.product ? ( out.product = result.product ) : delete out.product;
	}
	return Object.fromEntries( Object.entries( out ).filter( ( [ , v ] ) => undefined !== v && null !== v ) );
}
