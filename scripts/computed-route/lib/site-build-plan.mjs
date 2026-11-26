// The site build's plan (Spec 48 FR-48-55): the page map compared with a site's state (lib/site-build-state.mjs),
// as the actions that would make the site match, in four phases run in order: `posts` (every content row, parents
// first, mega-menu panels before the menus that point at them, then each panel's section page), `menus` (part 3), `layout` (the header, drawer and
// footer posts, whose trees bind their menus), and `site` (parts 4 to 7; part 6 also switches WooCommerce's coming-soon mode off). Pure: no site access.
// A value that names something not built yet is a ref ({ ref: 'post:<row key>' | 'menu:<name>' | 'item:<menu>:<key>' })
// the executor resolves. The run only ever changes what it made: a stored id must name a post carrying that row's key
// (`_sgs_site_build_row`), a menu it reuses must carry its own mark, and an item no row asks for is reported, never
// deleted. A row without an id adopts the one post carrying its key (a page map an intake rerun reset, FR-48-17), else
// is created; an unmarked post already holding its type and slug (another author's) stops the run, so it is never
// duplicated or renamed `<slug>-2`, and a stored id naming a same-slug post that has no row key and no tree hash (one a
// run saved before marking it) is marked and rebuilt. A rebuild never overwrites content a person changed since the build saved it.
import fs from 'fs';
import path from 'path';
import { LAYOUT_TYPES, SHOP_TYPES, boundMenu, drawerMenuNames, hasPost, isAccountRow, orderRows, pageTreeFor, parentRow, rowKey, treeFor, treeHash, wpType } from './site-build-map.mjs';
import { commonChain, copyFile, copySource, copyTree, pageTemplateOf, readShell, rowsOf, servedTemplates, splitShell } from './template-copies.mjs';
import { addressOf, desiredMenus, menuLocation, surfaceIdOf, surfaceMenus } from './site-build-menus.mjs';
import { draftLinksFor } from './draft-link.mjs';
import { readSurfaces } from './site-build-labels.mjs';
import { comingSoonAction, COMING_SOON_OPTION } from './site-build-store-visible.mjs';
import { withFlowProduct } from './site-build-flow-product.mjs';
import { ownParts } from './template-frame.mjs';
import { COMMERCE_ROLES } from './skeleton-commerce-region.mjs';
import { commerceRefusal, commerceRoles, rowCommerceRole } from './skeleton-commerce-refusal.mjs';
import { CONTENT_META, FIELDS_META, MENU_META, ROW_META, TEMPLATE_OPTION, WOO_ROLE, isWooDefaultContent } from './site-build-state.mjs';

export const PERMALINKS = '/%postname%/';
export const PHASES = [ 'posts', 'menus', 'layout', 'site' ];
const CREATES = [ 'create', 'menu', 'item-add' ];
// The post fields a person may change after the site build set them (FIELDS_META).
const OWN_FIELDS = [ 'post_title', 'post_name', 'post_parent' ];

const shown = ( v ) => ( v && 'object' === typeof v && v.ref ? `(new ${ v.ref })` : String( v ) );

// WooCommerce's role for a page-map row whose page WooCommerce renders itself ('cart', 'checkout', 'my account'), else null:
// its template (cart, checkout) or WooCommerce's own page name (my-account, account) says which.
export function wooContentRole( row ) {
	if ( 'page' !== row?.postType ) {
		return null;
	}
	if ( [ 'cart', 'checkout' ].includes( row.template ) ) {
		return row.template;
	}
	return isAccountRow( row ) ? 'my account' : null;
}

// Whether a WooCommerce page's content is WooCommerce's own block, kept and never rebuilt from a tree: the cart and
// checkout pages. The account page is an ordinary page whose tree holds WooCommerce's account piece (`sgs/account`).
export function keepsWooContent( row ) {
	return [ 'cart', 'checkout' ].includes( wooContentRole( row ) );
}

// Whether the draft draws no page for WooCommerce's `slug` template (cart, checkout), from the client's surfaces.json
// (`surfaces`): the template's own surface is marked unplayed (lib/manifest-build.mjs::buildManifest), or, with no surface of
// its own, every row naming the template has a page surface marked noDraft. Such a template is never built as a copy:
// WooCommerce's own template stands (FR-48-87; a draft whose basket is only a drawer, gap G-1). A template whose own surface
// is played is drawn, whatever its rows' entries say.
export function undrawnWooTemplate( slug, rows, surfaces ) {
	if ( ! keepsWooContent( { postType: 'page', template: slug } ) ) {
		return false;
	}
	const entries = Object.entries( surfaces || {} );
	const own = entries.filter( ( [ , e ] ) => e?.target?.template === slug );
	if ( own.length ) {
		return own.every( ( [ , e ] ) => e?.copy?.unplayed );
	}
	const pageEntry = ( r ) => entries.find( ( [ k, e ] ) => ( Number.isInteger( r.id ) && e?.target?.postId === r.id ) || k === r.slug )?.[ 1 ];
	const mine = rowsOf( rows, slug );
	return mine.length > 0 && mine.every( ( r ) => pageEntry( r )?.noDraft );
}

// Whether a surface is one of WooCommerce's own cart or checkout PAGES, which the site run never Fills, builds or walks: the
// surface's target is not a template and its row keeps WooCommerce's content. The cloned layout of those pages is the
// template-cart / template-checkout surfaces (target.template), which are walked. site-run.mjs and the manifest builder
// (lib/manifest-build.mjs) both decide through this one function. `target` is the entry's target ({ postId } or { template }).
export function isUnwalkedWooPage( target, row ) {
	return ! target?.template && keepsWooContent( row );
}

// Whether a surface is a content-only post surface (`contentOnly`): the site run skips it unless `--with-content` is passed
// (site-run.mjs::surfaceReach), so its walker files exist only after such a run. site-run.mjs and the walker check
// (lib/walker-check.mjs) both decide through this one function.
export function isContentOnlySurface( entry ) {
	return !! entry?.contentOnly;
}

// The WooCommerce page options (part 6) and the page-map row each takes: the shop row by its type, the others by
// wooContentRole. Each entry is [ option, role, candidate rows ].
function wooRoles( rows ) {
	const pagesOf = ( test ) => rows.filter( ( r ) => hasPost( r ) && test( r ) );
	return [
		[ 'woocommerce_shop_page_id', 'shop', pagesOf( ( r ) => 'shop' === r.postType ) ],
		[ 'woocommerce_cart_page_id', 'cart', pagesOf( ( r ) => 'cart' === wooContentRole( r ) ) ],
		[ 'woocommerce_checkout_page_id', 'checkout', pagesOf( ( r ) => 'checkout' === wooContentRole( r ) ) ],
		[ 'woocommerce_myaccount_page_id', 'my account', pagesOf( ( r ) => 'my account' === wooContentRole( r ) ) ],
	];
}

export function planBuild( { rows, state, repo, client, frontRoute = 'home', linkText = {}, menuLinks, flowProducts = {}, provisionalIds = false, menuItems = draftLinksFor( { repo, client } )?.menuItems } ) {
	const problems = [];
	// Each problem sorted by the step it stops: `map` (a row's post or the rows' order, which every step reads), `menus`,
	// `posts` (a post, layout surface or template copy) and `site` (the site options and active pointers).
	const problemsByStep = { map: [], menus: [], posts: [], site: [] };
	const stop = ( step, say ) => {
		problems.push( say );
		problemsByStep[ step ].push( say );
	};
	const notes = [];
	const actions = [];
	const options = [];
	// A header, footer or drawer row whose stored id names no post on the site (a scratch copy's strip deletes the layout posts and
	// keeps the page map) is built again: layout posts are made from the row's tree and hold no person's content, so the run
	// does not stop on them as it does on a page (FR-48-55).
	// Ids a mirror and its test site only presume to share (`provisionalIds`: lib/site-build-map.mjs::idsProvisional) can fail
	// for any row after the database copy: a row whose stored id names no post of its type, or a post another row made or nobody
	// marked, drops the id and finds its post by row key and slug below, as a row with no id does, with a note.
	rows = rows.map( ( row ) => {
		const p = Number.isInteger( row.id ) ? state.posts[ String( row.id ) ] : null;
		if ( ! hasPost( row ) || ! Number.isInteger( row.id ) ) {
			return row;
		}
		const gone = ! p || p.type !== wpType( row ) || 'trash' === p.status;
		// Only a post that carries another row's key is surely another row's; one with no key may be this row's post that someone renamed,
		// so its id stays and the checks below adopt it or stop with the command that marks it.
		const stranger = ! gone && !! p.rowKey && p.rowKey !== rowKey( row );
		if ( LAYOUT_TYPES[ row.postType ] ? ! gone && ! ( provisionalIds && stranger ) : ! ( provisionalIds && ( gone || stranger ) ) ) {
			return row;
		}
		notes.push( `${ rowKey( row ) }: its stored id ${ row.id } ${ gone ? `names no ${ wpType( row ) } on the site` : `is another post's (${ p.rowKey ? `it carries ${ p.rowKey }` : 'it carries no row key' })` }, so ${ LAYOUT_TYPES[ row.postType ] ? 'the layout is built again' : 'the row is matched by its row key and slug instead' }` );
		return { ...row, id: null };
	} );
	const shopClient = rows.some( ( r ) => SHOP_TYPES.includes( r.postType ) );
	const woo = shopClient ? wooRoles( rows ) : [];
	let ordered = [];
	try {
		ordered = orderRows( rows );
	} catch ( e ) {
		stop( 'map', e.message );
	}
	// Two rows that make one WordPress type and slug under one parent claim one slug (a `shop` row is a page).
	const claims = {};
	for ( const row of rows.filter( hasPost ) ) {
		const parent = parentRow( rows, row );
		( claims[ `${ wpType( row ) }
${ row.slug }
${ parent ? rowKey( parent ) : '' }` ] ??= [] ).push( row );
	}
	for ( const list of Object.values( claims ).filter( ( l ) => l.length > 1 ) ) {
		stop( 'map', `${ list.map( rowKey ).join( ' and ' ) } both make a ${ wpType( list[ 0 ] ) } with slug "${ list[ 0 ].slug }"; WordPress would rename the second, so give one a different slug` );
	}
	const ids = {};
	for ( const row of ordered ) {
		const key = rowKey( row );
		if ( ! hasPost( row ) ) {
			ids[ key ] = null;
			continue;
		}
		if ( Number.isInteger( row.id ) ) {
			const p = state.posts[ String( row.id ) ];
			if ( ! p || p.type !== wpType( row ) || 'trash' === p.status ) {
				stop( 'map', `${ key }: its stored id ${ row.id } ${ p && p.type !== wpType( row ) ? `is a ${ p.type }, not a ${ wpType( row ) }` : 'no longer exists on the site' }; restore the post or clear the row's id` );
			} else if ( ! p.rowKey && ! p.treeHash && p.slug === row.slug ) {
				// The post this row's slug names, saved by a run that stopped before it marked the post (it has no tree hash either): marked and rebuilt.
				actions.push( { phase: 'posts', type: 'adopt', key, id: row.id, mark: true, say: `${ key }: post ${ row.id } was saved by a run that stopped before marking it; mark it with this row's key and rebuild it` } );
			} else if ( p.rowKey !== key ) {
				stop( 'map', `${ key }: its stored id ${ row.id } is a post the site build did not make for this row (${ p.rowKey ? `it carries ${ p.rowKey }` : 'it carries no row key' }); correct the id, or mark the post with "wp post meta update ${ row.id } ${ ROW_META } ${ key }"` );
			}
			ids[ key ] = row.id;
			continue;
		}
		const marked = state.marked[ key ] || [];
		if ( marked.length > 1 ) {
			stop( 'map', `${ key }: posts ${ marked.join( ', ' ) } all carry this row's key; delete the extras` );
		} else if ( 1 === marked.length ) {
			ids[ key ] = marked[ 0 ];
			actions.push( { phase: 'posts', type: 'adopt', key, id: marked[ 0 ], say: `${ key }: the page map's id is empty; adopt post ${ marked[ 0 ] }, which carries this row's key` } );
		} else {
			const held = ( state.holders?.[ key ] || [] ).filter( ( id ) => ! marked.includes( id ) );
			// WooCommerce's own default page for this role (the one its page option names, nobody's authorship) is taken over.
			const wooOption = woo.find( ( [ , , list ] ) => list[ 0 ] === row )?.[ 0 ];
			if ( 1 === held.length && wooOption && String( state.options[ wooOption ] ) === String( held[ 0 ] ) ) {
				if ( isWooDefaultContent( state.posts[ String( held[ 0 ] ) ]?.content, state.wooDefaults?.[ WOO_ROLE[ wooOption ] ] ?? null ) ) {
					ids[ key ] = held[ 0 ];
					actions.push( { phase: 'posts', type: 'adopt', key, id: held[ 0 ], mark: true, say: `${ key }: take over post ${ held[ 0 ] }, WooCommerce's own page named by ${ wooOption }, and mark it with this row's key` } );
				} else {
					stop( 'map', `${ key }: post ${ held[ 0 ] } is the page WooCommerce names in ${ wooOption }, but its content is no longer WooCommerce's default content, so taking it over would rebuild someone's edit; restore its default content, or mark it with "wp post meta update ${ held[ 0 ] } ${ ROW_META } ${ key }" to let the site build rebuild it` );
				}
			} else if ( held.length ) {
				stop( 'map', `${ key }: post ${ held.join( ', ' ) } already holds this ${ wpType( row ) } slug and carries no site-build row key; if an interrupted run made it, mark it with "wp post meta update ${ held[ 0 ] } ${ ROW_META } ${ key }", otherwise rename or delete it` );
			}
			ids[ key ] ??= null;
		}
	}
	const wanted = desiredMenus( rows, linkText, readSurfaces( repo, client ), menuLinks );
	wanted.problems.forEach( ( say ) => stop( 'menus', say ) );
	notes.push( ...wanted.notes );
	if ( problems.length ) {
		return { actions: [], problems, problemsByStep, notes, options };
	}
	const idOf = ( key ) => ( ids[ key ] ? ids[ key ] : { ref: `post:${ key }` } );
	const menuOf = ( name ) => state.menus.find( ( m ) => m.slug === name ) || null;
	Object.keys( wanted.menus ).filter( ( n ) => menuOf( n ) && menuOf( n ).owner !== n ).forEach( ( n ) => stop( 'menus', `menu "${ n }" (${ menuOf( n ).id }) exists but the site build did not make it; rename it, or mark it with "wp term meta update ${ menuOf( n ).id } ${ MENU_META } ${ n }"` ) );
	if ( problems.length ) {
		return { actions: [], problems, problemsByStep, notes, options };
	}
	const menuIds = Object.fromEntries( Object.keys( wanted.menus ).map( ( n ) => [ n, menuOf( n )?.id || 0 ] ) );

	// Posts and layout surfaces (parts 1 and 2).
	for ( const row of ordered ) {
		const key = rowKey( row );
		if ( ! hasPost( row ) ) {
			continue;
		}
		const phase = LAYOUT_TYPES[ row.postType ] ? 'layout' : 'posts';
		const parent = parentRow( rows, row );
		if ( row.parent && ! parent ) {
			stop( 'posts', `${ key }: its parent "${ row.parent }" is no ${ row.postType } row of the page map` );
			continue;
		}
		// A shop row's `template` is the template its tree builds (below), not a page template its page takes; a template
		// the hierarchy reaches (page, front-page, home, single, page-<slug>) is never a page template either.
		const pageTemplate = 'shop' === row.postType ? '' : pageTemplateOf( row );
		if ( pageTemplate && ! ( state.templates?.[ row.postType ] || [] ).includes( pageTemplate ) ) {
			stop( 'posts', `${ key }: template "${ row.template }" is not one the theme registers for a ${ row.postType }` );
			continue;
		}
		// A choice flow's tree holds the catalogue product it adds (lib/site-build-flow-product.mjs).
		// A drawer row's placeholder binds the menus its own navigation groups made, in the draft's order (surfaceMenus).
		const own = 'drawer' === LAYOUT_TYPES[ row.postType ] ? surfaceMenus( menuItems, 'drawer', surfaceIdOf( row ) ) : null;
		const { tree: built, source } = pageTreeFor( repo, client, row, menuIds, own );
		// The account page's tree holds WooCommerce's account piece, never a static imitation of its forms (FR-48-87).
		const noRegion = 'placeholder' !== source && commerceRefusal( { role: rowCommerceRole( row ), tree: built, roles: commerceRoles(), what: key } );
		if ( noRegion ) {
			stop( 'posts', `${ key }: ${ noRegion }` );
			continue;
		}
		const tree = withFlowProduct( built, row, flowProducts );
		const hash = treeHash( tree );
		// The menus the row's placeholder binds: a header its own, a drawer one block per menu it owns (placeholderTree), or the
		// header menu when it owns none (boundMenu). It waits for the menus when any of them is wanted and not made yet.
		const layoutKind = LAYOUT_TYPES[ row.postType ];
		const drawerOwn = 'drawer' === layoutKind ? own || drawerMenuNames( Object.keys( menuIds ) ) : [];
		const binds = layoutKind ? ( 'drawer' === layoutKind ? ( drawerOwn.length ? drawerOwn : [ boundMenu( 'drawer', Object.keys( menuIds ) ) ] ) : [ boundMenu( layoutKind, Object.keys( menuIds ) ) ] ) : [];
		const unbound = 'placeholder' === source && [ 'header', 'drawer' ].includes( LAYOUT_TYPES[ row.postType ] ) && binds.some( ( name ) => wanted.menus[ name ] && ! menuIds[ name ] );
		// The shop page takes no page template field at all: under a block theme WooCommerce reports `archive-product` as
		// its page template on every read whatever is stored (ProductCatalogTemplate::handle_get_post_metadata), so a
		// planned '' would be rewritten on every pass and never settle.
		const fields = { post_parent: parent ? idOf( rowKey( parent ) ) : 0, ...( 'shop' === row.postType ? {} : { page_template: pageTemplate } ) };
		if ( ! ids[ key ] ) {
			const after = Object.fromEntries( Object.entries( fields ).filter( ( [ , v ] ) => v ) );
			actions.push( { phase, type: 'create', key, postType: wpType( row ), title: row.title, slug: row.slug, tree, hash, fields: after, say: `${ key }: create "${ row.title }" from the ${ source } tree${ unbound ? ' (its menu is bound once the menus exist)' : '' }${ Object.keys( after ).length ? `, then set ${ Object.entries( after ).map( ( [ k, v ] ) => `${ k }=${ shown( v ) }` ).join( ', ' ) }` : '' }` } );
			continue;
		}
		const p = state.posts[ String( ids[ key ] ) ];
		// WooCommerce's own cart and checkout pages keep WooCommerce's content (its Cart and Checkout blocks): that content
		// takes orders, so the clone styles it and never rebuilds it from a tree. The account page's tree holds `sgs/account`. The shop page's content is not shown (the shop template is), so it is built as any page.
		const wooContent = keepsWooContent( row ) && woo.some( ( [ option, , list ] ) => 'woocommerce_shop_page_id' !== option && list[ 0 ] === row );
		if ( p.treeHash !== hash && ! wooContent ) {
			if ( p.builtContentHash && p.contentHash !== p.builtContentHash ) {
				stop( 'posts', `${ key }: post ${ p.id } was edited after the site build saved it, so a rebuild from the changed tree would overwrite the edit; copy the edit into the tree, or let the rebuild win with "wp post meta delete ${ p.id } ${ CONTENT_META }"` );
			} else {
				actions.push( { phase, type: 'build', key, id: p.id, tree, hash, say: `${ key }: rebuild post ${ p.id } from the ${ source } tree (it was built from another tree)` } );
			}
		}
		// Title, slug and parent follow the page map on every run (FR-48-55), except where a person changed them: a value that
		// differs from what WordPress held when the site build last saved the post (FIELDS_META) is a person's rename or move, which
		// stays and is reported. A post with no record (built before the record existed, so nothing says who set its title, slug or
		// parent) keeps all three and the difference is reported, as every post did before the record: a slug reverted to the map's
		// would break the public address. The record also holds what the site build asked for (`asked`): a field WordPress saved
		// differently (a slug made unique, a filtered title) whose request is unchanged is settled, not planned again every run. A parent
		// change on a built, published page changes its public address with no redirect, so it is reported and never applied unless the
		// site build itself nested the page (a recorded parent above 0 still in place); a new page takes the map's parent when it is
		// created. A parent made in this run is set when it exists.
		const want = { post_title: row.title, post_name: row.slug, ...fields };
		const have = { post_title: p.title, post_name: p.slug, post_parent: p.parent, page_template: p.template };
		const differs = Object.entries( want ).filter( ( [ k, v ] ) => String( v?.ref ? '' : v ) !== String( have[ k ] ) || v?.ref );
		const recorded = p.builtFields && 'object' === typeof p.builtFields ? p.builtFields : null;
		const asked = recorded?.asked && 'object' === typeof recorded.asked ? recorded.asked : {};
		const ownedByPerson = ( [ k, v ] ) => ! v?.ref && OWN_FIELDS.includes( k ) && ( null === recorded || ( k in recorded && String( recorded[ k ] ) !== String( have[ k ] ) ) );
		const settled = ( [ k, v ] ) => ! v?.ref && OWN_FIELDS.includes( k ) && k in asked && String( asked[ k ] ) === String( v );
		const nestedByBuild = null !== recorded && Number( recorded.post_parent ) > 0 && String( recorded.post_parent ) === String( have.post_parent );
		const heldBack = ( [ k ] ) => 'post_parent' === k && 'publish' === p.status && ! nestedByBuild;
		const drift = differs.filter( ownedByPerson );
		const held = differs.filter( ( e ) => ! ownedByPerson( e ) && ! settled( e ) && heldBack( e ) );
		const diff = Object.fromEntries( differs.filter( ( e ) => ! ownedByPerson( e ) && ! settled( e ) && ! heldBack( e ) ) );
		if ( drift.length ) {
			notes.push( `${ key }: post ${ p.id } differs from the page map (${ drift.map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } (map ${ JSON.stringify( v ) })` ).join( '; ' ) }); the site build leaves a person's change${ null === recorded ? `; this post has no record of what the site build set, so to let the page map win run "wp post meta update ${ p.id } ${ FIELDS_META } '{}'"` : '' }` );
		}
		if ( held.length ) {
			notes.push( `${ key }: post ${ p.id } is published, so its parent ${ JSON.stringify( have.post_parent ) } stays and is not moved to the page map's ${ shown( held[ 0 ][ 1 ] ) }: that would change its public address with no redirect; move it in the editor and add a redirect if you want it nested` );
		}
		if ( Object.keys( diff ).length ) {
			const own = Object.entries( diff ).filter( ( [ k ] ) => OWN_FIELDS.includes( k ) );
			actions.push( { phase, type: 'update', key, id: p.id, fields: diff, record: null === recorded ? null : { ...Object.fromEntries( OWN_FIELDS.map( ( k ) => [ k, k in recorded ? recorded[ k ] : have[ k ] ] ) ), asked: { ...asked, ...Object.fromEntries( own ) } }, say: `${ key }: post ${ p.id }: ${ Object.entries( diff ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } -> ${ shown( v ) }` ).join( '; ' ) }` } );
		}
	}

	// Site-owned template copies (FR-48-56): one per template the site serves, built once and rebuilt only when its tree
	// changed. Its tree is the copy the site run made from the draft (sites/<client>/build/trees/template/<slug>.json); else
	// the frame around a shop row's stage 3 tree; else the shell of the stage 3 trees of every row it serves (the first
	// post for `single`); else, for a template no row names, the site's own `page` copy's recorded shell around the
	// theme's own content. A served template with none of these keeps the theme's file and is listed in `uncopied`.
	const buildDir = path.join( repo, 'sites', client, 'build' );
	const rel = ( f ) => path.relative( repo, f ).split( path.sep ).join( '/' );
	const builders = new Map();
	const uncopied = [];
	// The templates a manifest surface builds (the site run's copies). A copy file under trees/template/ with no surface
	// here is a stale tree and is never read, so a template the manifest stopped building is not recreated.
	const surfaces = readSurfaces( repo, client );
	// A WooCommerce template the draft does not draw is no surface's copy, even while surfaces.json still lists its unplayed
	// entry, so a copy the clone saved earlier is removed below and WooCommerce's own template stands.
	const surfaced = new Set( Object.values( surfaces ).map( ( e ) => e?.target?.template ).filter( ( slug ) => slug && ! undrawnWooTemplate( slug, rows, surfaces ) ) );
	for ( const slug of servedTemplates( rows ) ) {
		if ( undrawnWooTemplate( slug, rows, surfaces ) ) {
			notes.push( `template:${ slug }: no draft surface plays the ${ slug } template, so WooCommerce's own template stands and the site build makes no copy of it (FR-48-87)` );
			continue;
		}
		const how = copySource( rows, slug );
		const mine = rowsOf( rows, slug );
		const sources = 'single' === slug ? mine.filter( ( r ) => 'post' === r.postType ).slice( 0, 1 ) : mine;
		const trees = sources.map( ( row ) => ( { row, ...treeFor( repo, client, row, {} ) } ) ).filter( ( t ) => 'placeholder' !== t.source );
		const owner = mine[ 0 ] || null;
		let pick = null;
		if ( surfaced.has( slug ) && fs.existsSync( copyFile( buildDir, slug ) ) ) {
			pick = { row: owner, tree: JSON.parse( fs.readFileSync( copyFile( buildDir, slug ), 'utf8' ) ), source: rel( copyFile( buildDir, slug ) ) };
		} else if ( 'whole' === how && trees.length ) {
			pick = { row: trees[ 0 ].row, tree: copyTree( { slug, whole: trees[ 0 ].tree } ), source: trees[ 0 ].source };
			mine.filter( ( r ) => r !== pick.row ).forEach( ( r ) => notes.push( `${ rowKey( r ) }: names the ${ slug } template, which ${ rowKey( pick.row ) } builds; this row adds nothing to it` ) );
		} else if ( 'shell' === how && trees.length && trees.length === sources.length ) {
			pick = { row: owner, tree: copyTree( { slug, chain: commonChain( trees.map( ( t ) => splitShell( t.tree ).chain ) ) } ), source: `shell of ${ trees.map( ( t ) => t.source ).join( ', ' ) }` };
		} else if ( 'page' === how && readShell( buildDir, 'page' ) ) {
			pick = { row: null, tree: copyTree( { slug, chain: readShell( buildDir, 'page' ).chain } ), source: `the page copy's shell (${ rel( copyFile( buildDir, 'page' ) ) })` };
		}
		if ( pick ) {
			builders.set( slug, pick );
		} else if ( ! ( state.templateHashes || {} )[ slug ] && ( state.customTemplates || [] ).includes( slug ) ) {
			uncopied.push( { slug, why: 'the site holds a copy that neither the site build nor the site run made (Site Editor > Templates); the site run replaces it with the draft\'s copy' } );
		} else if ( ! ( state.templateHashes || {} )[ slug ] ) {
			const from = owner ? rowKey( owner ) : 'page' === how ? "the site's own page copy" : null;
			uncopied.push( { slug, why: from ? `no tree yet (sites/<client>/build/trees/template/${ slug }.json): the site run builds it from ${ from }` : 'no draft surface plays it and no page-map row names it' } );
		}
	}
	let hashes = { ...( state.templateHashes || {} ) };
	for ( const [ slug, pick ] of builders ) {
		// A shop, cart or checkout copy holds WooCommerce's piece, never a static imitation of it (FR-48-87).
		const noRegion = commerceRefusal( { role: COMMERCE_ROLES[ slug ], tree: pick.tree, roles: commerceRoles(), what: `the ${ slug } template (${ pick.source })` } );
		if ( noRegion ) {
			stop( 'posts', `${ pick.row ? rowKey( pick.row ) : `template:${ slug }` }: ${ noRegion }` );
			continue;
		}
		// The site's own parts the copy prints (lib/template-frame.mjs::ownParts) are built with it, and a changed part rebuilds it.
		const parts = ownParts( buildDir, pick.tree );
		const hash = treeHash( parts.length ? [ pick.tree, parts ] : pick.tree );
		const saved = ( state.customTemplates || [] ).includes( slug );
		// A recorded hash with no saved copy is a build that stopped before it saved: built again.
		if ( hashes[ slug ] === hash && saved ) {
			continue;
		}
		if ( ! hashes[ slug ] && ( state.customTemplates || [] ).includes( slug ) ) {
			stop( 'posts', `${ pick.row ? rowKey( pick.row ) : 'template' }: the site already holds its own saved copy of the ${ slug } template that the site build did not make; clear it in Site Editor > Templates ("Clear customisations") so the site build can take it over` );
			continue;
		}
		if ( hashes[ slug ] && saved && state.templateSaved?.[ slug ] && state.templateContent?.[ slug ] !== state.templateSaved[ slug ] ) {
			stop( 'posts', `${ pick.row ? rowKey( pick.row ) : 'template' }: the site's ${ slug } template was edited after the site build saved it, so a rebuild from the changed tree would overwrite the edit; copy the edit into the tree, or clear it in Site Editor > Templates ("Clear customisations") to let the site build rebuild it` );
			continue;
		}
		options.push( { name: `${ TEMPLATE_OPTION }[${ slug }]`, before: hashes[ slug ] ? hashes[ slug ].slice( 0, 12 ) : '(none)', after: hash.slice( 0, 12 ) } );
		const verb = hashes[ slug ] ? 'rebuild' : 'build';
		const previous = hashes;
		hashes = { ...hashes, [ slug ]: hash };
		actions.push( { phase: 'posts', type: 'template', key: pick.row ? rowKey( pick.row ) : `template:${ slug }`, template: slug, tree: pick.tree, parts, hash, hashes, previous, say: `${ pick.row ? `${ rowKey( pick.row ) }: ` : '' }${ verb } the site's own ${ slug } template from ${ pick.source }` } );
	}

	// A saved template the clone wrote (its slug is recorded in `sgs_site_build_templates`, which the site build and the site
	// run both write after each template they save) that no manifest surface and no site-build copy builds now goes back to the
	// theme or plugin file (FR-48-55 step 8): the saved wp_template post is deleted and its recorded hash dropped. A saved
	// template the clone did not write (WooCommerce's or a person's) is noted and kept. Template parts and posts are never touched.
	for ( const slug of ( state.customTemplates || [] ).filter( ( t ) => ! builders.has( t ) && ! surfaced.has( t ) ) ) {
		if ( ! Object.hasOwn( hashes, slug ) ) {
			notes.push( `template:${ slug }: kept: not written by the clone` );
			continue;
		}
		const { [ slug ]: dropped, ...kept } = hashes;
		const id = ( state.templateIds || {} )[ slug ];
		actions.push( { phase: 'posts', type: 'template-remove', key: `template:${ slug }`, template: slug, id, hashes: kept, previous: hashes, say: `template:${ slug }: remove the saved copy${ id ? ` (wp_template ${ id })` : '' }; the clone wrote it and no manifest surface builds it now, so the theme or plugin file stands` } );
		hashes = kept;
		options.push( { name: `${ TEMPLATE_OPTION }[${ slug }]`, before: dropped.slice( 0, 12 ), after: '(removed)' } );
	}

	// Section pages (Spec 36 FR-36-5): each mega panel links its menu items to the page on its menu slot.
	for ( const [ mega, page ] of Object.entries( wanted.sections ) ) {
		const panel = ids[ mega ] ? state.posts[ String( ids[ mega ] ) ] : null;
		const pagePost = ids[ page ] ? state.posts[ String( ids[ page ] ) ] : null;
		if ( pagePost && 'publish' !== pagePost.status ) {
			notes.push( `${ mega }: its section page ${ page } is ${ pagePost.status }; the items opening it stay toggles until the page is published` );
		}
		if ( ! panel || ! ids[ page ] || panel.sectionPage !== ids[ page ] ) {
			actions.push( { phase: 'posts', type: 'section', key: mega, id: idOf( mega ), page: idOf( page ), say: `${ mega }: section page ${ panel?.sectionPage || 'none' } -> ${ shown( idOf( page ) ) } (${ page })` } );
		}
	}

	// Menus (part 3): an item is matched by (menu, object id), a custom parent by its title; under the parent the map
	// gives first, else wherever it now sits (then moved back), so a hand-moved item is never added twice.
	for ( const [ name, list ] of Object.entries( wanted.menus ) ) {
		const menu = menuOf( name );
		const menuRef = menu ? menu.id : { ref: `menu:${ name }` };
		if ( ! menu ) {
			actions.push( { phase: 'menus', type: 'menu', name, say: `menu "${ name }": create` } );
		}
		const existing = [ ...( menu?.items || [] ) ];
		const matched = {};
		for ( const it of list ) {
			const parentId = it.parentKey ? matched[ it.parentKey ] || { ref: `item:${ name }:${ it.parentKey }` } : 0;
			const objectId = 'post' === it.kind ? ids[ it.rowKey ] : null;
			const same = ( e ) => ( 'post' === it.kind ? objectId && e.objectId === objectId && e.object === it.postType : 'link' === it.kind ? 'custom' === e.type && addressOf( e.url ) === addressOf( it.url ) : 'custom' === e.type && e.title === it.title );
			const exact = existing.findIndex( ( e ) => same( e ) && e.parent === ( 'number' === typeof parentId ? parentId : -1 ) );
			const at = exact >= 0 ? exact : existing.findIndex( same );
			const where = `menu "${ name }" item "${ it.label }"`;
			if ( at < 0 ) {
				actions.push( { phase: 'menus', type: 'item-add', menu: menuRef, key: `item:${ name }:${ it.key }`, kind: it.kind, object: 'post' === it.kind ? idOf( it.rowKey ) : null, title: it.title, ...( 'link' === it.kind ? { url: it.url } : {} ), ...( 'label' === it.kind ? { description: it.description } : {} ), position: it.order, parent: parentId, say: `${ where }: add${ 'link' === it.kind ? ` a link to ${ it.url }` : 'label' === it.kind ? ` a label${ it.description ? ` with the badge "${ it.description }"` : '' }` : '' } at position ${ it.order }${ it.parentKey ? ` under "${ list.find( ( x ) => x.key === it.parentKey ).label }"` : '' }` } );
				continue;
			}
			const e = existing.splice( at, 1 )[ 0 ];
			matched[ it.key ] = e.id;
			// WordPress stores an item title equal to its object's own title as empty and shows the object's title
			// (wp_update_nav_menu_item; `shown` is the title wp_setup_nav_menu_item resolves), so that is no difference.
			const titleOff = it.title ? e.title !== it.title && ( e.title || ( e.shown ?? '' ) !== it.title ) : '' !== e.title;
			if ( titleOff && ! it.title ) {
				notes.push( `${ where }: item ${ e.id } carries the custom title "${ e.title }"; clear it in Appearance > Menus to show the post's own title` );
			}
			const moved = 'number' !== typeof parentId || e.parent !== parentId;
			const urlOff = 'link' === it.kind && e.url !== it.url;
			// A label's chip words are the item's Description (post_content).
			const descOff = 'label' === it.kind && ( e.description ?? '' ) !== it.description;
			if ( e.order !== it.order || moved || ( titleOff && it.title ) || urlOff || descOff ) {
				const what = [ e.order !== it.order ? `position ${ e.order } -> ${ it.order }` : '', moved ? `parent ${ e.parent } -> ${ shown( parentId ) }` : '', titleOff && it.title ? `title "${ e.title }" -> "${ it.title }"` : '', urlOff ? `link ${ e.url } -> ${ it.url }` : '', descOff ? `badge "${ e.description ?? '' }" -> "${ it.description }"` : '' ].filter( Boolean ).join( '; ' );
				actions.push( { phase: 'menus', type: 'item-update', id: e.id, title: titleOff && it.title ? it.title : null, ...( urlOff ? { url: it.url } : {} ), ...( descOff ? { description: it.description } : {} ), position: it.order, parent: parentId, say: `${ where }: item ${ e.id }: ${ what }` } );
			}
		}
		existing.forEach( ( e ) => notes.push( `menu "${ name }" item ${ e.id } "${ e.title || `${ e.object } ${ e.objectId }` }" is not one any page-map row asks for; it is left in place` ) );
		const loc = menuLocation( name, state.registeredLocations || [] );
		if ( ! loc ) {
			notes.push( `menu "${ name }" has no theme location; its surface binds it by ref` );
		} else if ( ! menu || Number( state.locations[ loc ] || 0 ) !== menu.id ) {
			options.push( { name: `nav_menu_locations[${ loc }]`, before: String( state.locations[ loc ] || '(none)' ), after: menu ? String( menu.id ) : `(new menu "${ name }")` } );
			actions.push( { phase: 'menus', type: 'location', menu: menuRef, location: loc, say: `assign menu "${ name }" to the "${ loc }" location` } );
		}
	}

	// Front and posts page (part 4), permalinks (part 5), active pointers (part 7).
	const option = ( name, value ) => {
		const before = String( state.options[ name ] ?? '' );
		if ( value?.ref || before !== String( value ) ) {
			options.push( { name, before, after: shown( value ) } );
			actions.push( { phase: 'site', type: 'option', name, value, say: `option ${ name }: ${ JSON.stringify( before ) } -> ${ shown( value ) }` } );
		}
	};
	const front = rows.find( ( r ) => 'page' === r.postType && r.route === frontRoute ) || rows.find( ( r ) => 'page' === r.postType && r.slug === frontRoute );
	// The posts page: the one page other than the front page whose items are live (FR-48-30: they come from WordPress);
	// with two such pages the map does not say which, so the option is left and the candidates are named.
	const blogs = rows.filter( ( r ) => 'page' === r.postType && 'live' === r.collection && r !== front );
	if ( blogs.length > 1 ) {
		notes.push( `${ blogs.map( rowKey ).join( ' and ' ) } all list live items; page_for_posts is left as it is (set it in Settings > Reading)` );
	}
	if ( front ) {
		option( 'show_on_front', 'page' );
		option( 'page_on_front', idOf( rowKey( front ) ) );
	} else {
		notes.push( `no page row has route or slug "${ frontRoute }"; the front page is left as it is` );
	}
	if ( 1 === blogs.length ) {
		option( 'page_for_posts', idOf( rowKey( blogs[ 0 ] ) ) );
	}
	// WooCommerce pages (part 6, shop clients only); only a post this build made or took over is ever named.
	if ( shopClient ) {
		for ( const [ name, role, list ] of woo ) {
			if ( ! list.length ) {
				notes.push( `no page row is the ${ role } page; ${ name } is left as it is` );
				continue;
			}
			if ( list.length > 1 ) {
				stop( 'site', `${ list.map( rowKey ).join( ' and ' ) } could both be the ${ role } page; ${ name } takes one page, so keep one row for that role` );
				continue;
			}
			const was = String( state.options[ name ] ?? '' );
			option( name, idOf( rowKey( list[ 0 ] ) ) );
			if ( was && '0' !== was && String( ids[ rowKey( list[ 0 ] ) ] ) !== was ) {
				notes.push( `post ${ was }, which ${ name } named, is left in place (WooCommerce's earlier ${ role } page); unpublish or delete it if it is no longer wanted` );
			}
		}
		// WooCommerce's coming-soon mode serves visitors a holding page in place of the site; switched off when on.
		const visible = comingSoonAction( state.options[ COMING_SOON_OPTION ] );
		if ( visible ) {
			options.push( { name: COMING_SOON_OPTION, before: String( state.options[ COMING_SOON_OPTION ] ), after: visible.value } );
			actions.push( visible );
		}
	}
	if ( state.options.permalink_structure !== PERMALINKS ) {
		options.push( { name: 'permalink_structure', before: state.options.permalink_structure, after: PERMALINKS } );
		actions.push( { phase: 'site', type: 'permalinks', value: PERMALINKS, say: `permalinks ${ JSON.stringify( state.options.permalink_structure ) } -> ${ PERMALINKS }` } );
	}
	// Each active-layout pointer goes to its page-map row's post, whichever post it names now: the clone owns every
	// site-wide setting it builds (Spec 48 FR-48-55), and the plan line shows the old value so the change can be undone.
	// A page map holds one layout row of each kind (Spec 48 FR-48-30); two rows of one kind stop the run naming them,
	// since nothing can tell which one is the site's.
	for ( const [ type, area ] of Object.entries( LAYOUT_TYPES ) ) {
		const mine = rows.filter( ( r ) => r.postType === type );
		if ( ! mine.length ) {
			continue;
		}
		if ( mine.length > 1 ) {
			stop( 'site', `${ mine.length } ${ area } rows (${ mine.map( rowKey ).join( ', ' ) }); a page map holds one site-wide ${ area }, so the proposal that made the others is wrong (re-run the page map, or remove the rows that belong to a page or a block)` );
			continue;
		}
		const row = mine[ 0 ];
		const current = state.pointers[ area ] || 0;
		const built = ids[ rowKey( row ) ];
		if ( built && current === built ) {
			continue;
		}
		const id = idOf( rowKey( row ) );
		options.push( { name: `sgs_active_${ area }_cpt_id`, before: String( current ), after: shown( id ) } );
		actions.push( { phase: 'site', type: 'pointer', area, id, say: `active ${ area }: ${ current || 'none' } -> ${ shown( id ) }` } );
	}
	// With a problem the whole build runs nothing; `planned` keeps the actions and options planned around it, for a run of
	// one step whose own problems are none (lib/site-build-menus-step.mjs::runMenus).
	return problems.length ? { actions: [], problems, problemsByStep, notes, options: [], uncopied, planned: { actions, options } } : { actions, problems, problemsByStep, notes, options, uncopied };
}

// The plan's counts: posts, menus and items it creates; everything else it changes (a saved template it removes is a
// change; an adoption only fills the map).
export const tally = ( actions ) => ( {
	creates: actions.filter( ( a ) => CREATES.includes( a.type ) ).length,
	changes: actions.filter( ( a ) => ! CREATES.includes( a.type ) && 'adopt' !== a.type ).length,
	adopts: actions.filter( ( a ) => 'adopt' === a.type ).length,
} );
