// The site build's plan (Spec 48 FR-48-55): the page map compared with a site's state (lib/site-build-state.mjs),
// as the actions that would make the site match, in four phases run in order: `posts` (every content row, parents
// first, mega-menu panels before the menus that point at them, then each panel's section page), `menus` (part 3), `layout` (the header, drawer and
// footer posts, whose trees bind their menus), and `site` (parts 4, 5 and 7). Pure: no site access.
// A value that names something not built yet is a ref ({ ref: 'post:<row key>' | 'menu:<name>' | 'item:<menu>:<key>' })
// the executor resolves. The run only ever changes what it made: a stored id must name a post carrying that row's key
// (`_sgs_site_build_row`), a menu it reuses must carry its own mark, and an item no row asks for is reported, never
// deleted. A row without an id adopts the one post carrying its key (a page map an intake rerun reset, FR-48-17), else
// is created; an unmarked post already holding its type and slug (another author's) stops the run, so it is never
// duplicated or renamed `<slug>-2`, and a stored id naming a same-slug post that has no row key and no tree hash (one a
// run saved before marking it) is marked and rebuilt. A rebuild never overwrites content a person changed since the build saved it.
import { LAYOUT_TYPES, SHOP_TYPES, boundMenu, builtTemplate, hasPost, orderRows, pageTreeFor, parentRow, rowKey, templateTreeFor, treeHash, wpType } from './site-build-map.mjs';
import { desiredMenus, menuLocation } from './site-build-menus.mjs';
import { readSurfaces } from './site-build-labels.mjs';
import { CONTENT_META, MENU_META, ROW_META, TEMPLATE_OPTION, isWooDefaultContent } from './site-build-state.mjs';

export const PERMALINKS = '/%postname%/';
export const PHASES = [ 'posts', 'menus', 'layout', 'site' ];
const CREATES = [ 'create', 'menu', 'item-add' ];

const shown = ( v ) => ( v && 'object' === typeof v && v.ref ? `(new ${ v.ref })` : String( v ) );

// The WooCommerce page options (part 6) and the page-map row each takes: a row's template (cart, checkout), its type
// (shop) or WooCommerce's own page name (my-account, account) says which. Each entry is [ option, role, candidate rows ].
function wooRoles( rows ) {
	const pagesOf = ( test ) => rows.filter( ( r ) => hasPost( r ) && test( r ) );
	return [
		[ 'woocommerce_shop_page_id', 'shop', pagesOf( ( r ) => 'shop' === r.postType ) ],
		[ 'woocommerce_cart_page_id', 'cart', pagesOf( ( r ) => 'page' === r.postType && 'cart' === r.template ) ],
		[ 'woocommerce_checkout_page_id', 'checkout', pagesOf( ( r ) => 'page' === r.postType && 'checkout' === r.template ) ],
		[ 'woocommerce_myaccount_page_id', 'my account', pagesOf( ( r ) => 'page' === r.postType && [ 'my-account', 'account' ].includes( r.slug ) ) ],
	];
}

export function planBuild( { rows, state, repo, client, frontRoute = 'home', linkText = {} } ) {
	const problems = [];
	const notes = [];
	const actions = [];
	const options = [];
	const shopClient = rows.some( ( r ) => SHOP_TYPES.includes( r.postType ) );
	const woo = shopClient ? wooRoles( rows ) : [];
	let ordered = [];
	try {
		ordered = orderRows( rows );
	} catch ( e ) {
		problems.push( e.message );
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
		problems.push( `${ list.map( rowKey ).join( ' and ' ) } both make a ${ wpType( list[ 0 ] ) } with slug "${ list[ 0 ].slug }"; WordPress would rename the second, so give one a different slug` );
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
				problems.push( `${ key }: its stored id ${ row.id } ${ p && p.type !== wpType( row ) ? `is a ${ p.type }, not a ${ wpType( row ) }` : 'no longer exists on the site' }; restore the post or clear the row's id` );
			} else if ( ! p.rowKey && ! p.treeHash && p.slug === row.slug ) {
				// The post this row's slug names, saved by a run that stopped before it marked the post (it has no tree hash either): marked and rebuilt.
				actions.push( { phase: 'posts', type: 'adopt', key, id: row.id, mark: true, say: `${ key }: post ${ row.id } was saved by a run that stopped before marking it; mark it with this row's key and rebuild it` } );
			} else if ( p.rowKey !== key ) {
				problems.push( `${ key }: its stored id ${ row.id } is a post the site build did not make for this row (${ p.rowKey ? `it carries ${ p.rowKey }` : 'it carries no row key' }); correct the id, or mark the post with "wp post meta update ${ row.id } ${ ROW_META } ${ key }"` );
			}
			ids[ key ] = row.id;
			continue;
		}
		const marked = state.marked[ key ] || [];
		if ( marked.length > 1 ) {
			problems.push( `${ key }: posts ${ marked.join( ', ' ) } all carry this row's key; delete the extras` );
		} else if ( 1 === marked.length ) {
			ids[ key ] = marked[ 0 ];
			actions.push( { phase: 'posts', type: 'adopt', key, id: marked[ 0 ], say: `${ key }: the page map's id is empty; adopt post ${ marked[ 0 ] }, which carries this row's key` } );
		} else {
			const held = ( state.holders?.[ key ] || [] ).filter( ( id ) => ! marked.includes( id ) );
			// WooCommerce's own default page for this role (the one its page option names, nobody's authorship) is taken over.
			const wooOption = woo.find( ( [ , , list ] ) => list[ 0 ] === row )?.[ 0 ];
			if ( 1 === held.length && wooOption && String( state.options[ wooOption ] ) === String( held[ 0 ] ) ) {
				if ( isWooDefaultContent( state.posts[ String( held[ 0 ] ) ]?.content, state.wooDefaults || [] ) ) {
					ids[ key ] = held[ 0 ];
					actions.push( { phase: 'posts', type: 'adopt', key, id: held[ 0 ], mark: true, say: `${ key }: take over post ${ held[ 0 ] }, WooCommerce's own page named by ${ wooOption }, and mark it with this row's key` } );
				} else {
					problems.push( `${ key }: post ${ held[ 0 ] } is the page WooCommerce names in ${ wooOption }, but its content is no longer WooCommerce's default content, so taking it over would rebuild someone's edit; restore its default content, or mark it with "wp post meta update ${ held[ 0 ] } ${ ROW_META } ${ key }" to let the site build rebuild it` );
				}
			} else if ( held.length ) {
				problems.push( `${ key }: post ${ held.join( ', ' ) } already holds this ${ wpType( row ) } slug and carries no site-build row key; if an interrupted run made it, mark it with "wp post meta update ${ held[ 0 ] } ${ ROW_META } ${ key }", otherwise rename or delete it` );
			}
			ids[ key ] ??= null;
		}
	}
	const wanted = desiredMenus( rows, linkText, readSurfaces( repo, client ) );
	problems.push( ...wanted.problems );
	notes.push( ...wanted.notes );
	if ( problems.length ) {
		return { actions: [], problems, notes, options };
	}
	const idOf = ( key ) => ( ids[ key ] ? ids[ key ] : { ref: `post:${ key }` } );
	const menuOf = ( name ) => state.menus.find( ( m ) => m.slug === name ) || null;
	Object.keys( wanted.menus ).filter( ( n ) => menuOf( n ) && menuOf( n ).owner !== n ).forEach( ( n ) => problems.push( `menu "${ n }" (${ menuOf( n ).id }) exists but the site build did not make it; rename it, or mark it with "wp term meta update ${ menuOf( n ).id } ${ MENU_META } ${ n }"` ) );
	if ( problems.length ) {
		return { actions: [], problems, notes, options };
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
			problems.push( `${ key }: its parent "${ row.parent }" is no ${ row.postType } row of the page map` );
			continue;
		}
		// A shop row's `template` is the template its tree builds (below), not a page template its page takes.
		if ( 'shop' !== row.postType && row.template && ! ( state.templates?.[ row.postType ] || [] ).includes( row.template ) ) {
			problems.push( `${ key }: template "${ row.template }" is not one the theme registers for a ${ row.postType }` );
			continue;
		}
		const { tree, source } = pageTreeFor( repo, client, row, menuIds );
		const hash = treeHash( tree );
		const binds = LAYOUT_TYPES[ row.postType ] && boundMenu( LAYOUT_TYPES[ row.postType ], Object.keys( menuIds ) );
		const unbound = 'placeholder' === source && [ 'header', 'drawer' ].includes( LAYOUT_TYPES[ row.postType ] ) && wanted.menus[ binds ] && ! menuIds[ binds ];
		const fields = { post_parent: parent ? idOf( rowKey( parent ) ) : 0, page_template: 'shop' === row.postType ? '' : row.template || '' };
		if ( ! ids[ key ] ) {
			const after = Object.fromEntries( Object.entries( fields ).filter( ( [ , v ] ) => v ) );
			actions.push( { phase, type: 'create', key, postType: wpType( row ), title: row.title, slug: row.slug, tree, hash, fields: after, say: `${ key }: create "${ row.title }" from the ${ source } tree${ unbound ? ' (its menu is bound once the menus exist)' : '' }${ Object.keys( after ).length ? `, then set ${ Object.entries( after ).map( ( [ k, v ] ) => `${ k }=${ shown( v ) }` ).join( ', ' ) }` : '' }` } );
			continue;
		}
		const p = state.posts[ String( ids[ key ] ) ];
		if ( p.treeHash !== hash ) {
			if ( p.builtContentHash && p.contentHash !== p.builtContentHash ) {
				problems.push( `${ key }: post ${ p.id } was edited after the site build saved it, so a rebuild from the changed tree would overwrite the edit; copy the edit into the tree, or let the rebuild win with "wp post meta delete ${ p.id } ${ CONTENT_META }"` );
			} else {
				actions.push( { phase, type: 'build', key, id: p.id, tree, hash, say: `${ key }: rebuild post ${ p.id } from the ${ source } tree (it was built from another tree)` } );
			}
		}
		// Status, title, slug and parent are set once, at creation: a post someone has since drafted, renamed, moved or made
		// private stays as they left it, and a difference is reported. A parent made in this run is set when it exists.
		const want = { post_title: row.title, post_name: row.slug, ...fields };
		const have = { post_title: p.title, post_name: p.slug, post_parent: p.parent, page_template: p.template };
		const differs = Object.entries( want ).filter( ( [ k, v ] ) => String( v?.ref ? '' : v ) !== String( have[ k ] ) || v?.ref );
		const ownedByPerson = ( [ k, v ] ) => ! v?.ref && [ 'post_title', 'post_name', 'post_parent' ].includes( k );
		const diff = Object.fromEntries( differs.filter( ( e ) => ! ownedByPerson( e ) ) );
		const drift = differs.filter( ownedByPerson );
		if ( drift.length ) {
			notes.push( `${ key }: post ${ p.id } differs from the page map (${ drift.map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } (map ${ JSON.stringify( v ) })` ).join( '; ' ) }); the site build leaves a person's change` );
		}
		if ( Object.keys( diff ).length ) {
			actions.push( { phase, type: 'update', key, id: p.id, fields: diff, say: `${ key }: post ${ p.id }: ${ Object.entries( diff ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } -> ${ shown( v ) }` ).join( '; ' ) }` } );
		}
	}

	// Site-owned template copies (FR-48-56): a shop row's tree builds the template it names, once per template, rebuilt only
	// when its tree changed. A template two rows name is built from the row with a stage 3 tree, else the first.
	const builders = new Map();
	for ( const row of rows.filter( builtTemplate ) ) {
		builders.set( builtTemplate( row ), [ ...( builders.get( builtTemplate( row ) ) || [] ), { row, ...templateTreeFor( repo, client, row ) } ] );
	}
	let hashes = { ...( state.templateHashes || {} ) };
	for ( const [ slug, list ] of builders ) {
		const pick = list.find( ( c ) => 'placeholder' !== c.source );
		if ( ! pick ) {
			notes.push( `${ rowKey( list[ 0 ].row ) }: names the ${ slug } template but has no tree (sites/<client>/build/trees/<postType>/<slug>.json), so the site keeps the theme's own default ${ slug } template` );
			continue;
		}
		list.filter( ( c ) => c !== pick ).forEach( ( c ) => notes.push( `${ rowKey( c.row ) }: names the ${ slug } template, which ${ rowKey( pick.row ) } builds; this row adds nothing to it` ) );
		const hash = treeHash( pick.tree );
		const saved = ( state.customTemplates || [] ).includes( slug );
		// A recorded hash with no saved copy is a build that stopped before it saved: built again.
		if ( hashes[ slug ] === hash && saved ) {
			continue;
		}
		if ( ! hashes[ slug ] && ( state.customTemplates || [] ).includes( slug ) ) {
			problems.push( `${ rowKey( pick.row ) }: the site already holds its own saved copy of the ${ slug } template that the site build did not make; clear it in Site Editor > Templates ("Clear customisations") so the site build can take it over` );
			continue;
		}
		if ( hashes[ slug ] && saved && state.templateSaved?.[ slug ] && state.templateContent?.[ slug ] !== state.templateSaved[ slug ] ) {
			problems.push( `${ rowKey( pick.row ) }: the site's ${ slug } template was edited after the site build saved it, so a rebuild from the changed tree would overwrite the edit; copy the edit into the tree, or clear it in Site Editor > Templates ("Clear customisations") to let the site build rebuild it` );
			continue;
		}
		options.push( { name: `${ TEMPLATE_OPTION }[${ slug }]`, before: hashes[ slug ] ? hashes[ slug ].slice( 0, 12 ) : '(none)', after: hash.slice( 0, 12 ) } );
		const verb = hashes[ slug ] ? 'rebuild' : 'build';
		const previous = hashes;
		hashes = { ...hashes, [ slug ]: hash };
		actions.push( { phase: 'posts', type: 'template', key: rowKey( pick.row ), template: slug, tree: pick.tree, hash, hashes, previous, say: `${ rowKey( pick.row ) }: ${ verb } the site's own ${ slug } template from the ${ pick.source } tree` } );
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
			const same = ( e ) => ( 'post' === it.kind ? objectId && e.objectId === objectId && e.object === it.postType : 'custom' === e.type && e.title === it.title );
			const exact = existing.findIndex( ( e ) => same( e ) && e.parent === ( 'number' === typeof parentId ? parentId : -1 ) );
			const at = exact >= 0 ? exact : existing.findIndex( same );
			const where = `menu "${ name }" item "${ it.label }"`;
			if ( at < 0 ) {
				actions.push( { phase: 'menus', type: 'item-add', menu: menuRef, key: `item:${ name }:${ it.key }`, kind: it.kind, object: 'post' === it.kind ? idOf( it.rowKey ) : null, title: it.title, position: it.order, parent: parentId, say: `${ where }: add at position ${ it.order }${ it.parentKey ? ` under "${ list.find( ( x ) => x.key === it.parentKey ).label }"` : '' }` } );
				continue;
			}
			const e = existing.splice( at, 1 )[ 0 ];
			matched[ it.key ] = e.id;
			const titleOff = it.title ? e.title !== it.title : '' !== e.title;
			if ( titleOff && ! it.title ) {
				notes.push( `${ where }: item ${ e.id } carries the custom title "${ e.title }"; clear it in Appearance > Menus to show the post's own title` );
			}
			const moved = 'number' !== typeof parentId || e.parent !== parentId;
			if ( e.order !== it.order || moved || ( titleOff && it.title ) ) {
				const what = [ e.order !== it.order ? `position ${ e.order } -> ${ it.order }` : '', moved ? `parent ${ e.parent } -> ${ shown( parentId ) }` : '', titleOff && it.title ? `title "${ e.title }" -> "${ it.title }"` : '' ].filter( Boolean ).join( '; ' );
				actions.push( { phase: 'menus', type: 'item-update', id: e.id, title: titleOff && it.title ? it.title : null, position: it.order, parent: parentId, say: `${ where }: item ${ e.id }: ${ what }` } );
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
				problems.push( `${ list.map( rowKey ).join( ' and ' ) } could both be the ${ role } page; ${ name } takes one page, so keep one row for that role` );
				continue;
			}
			const was = String( state.options[ name ] ?? '' );
			option( name, idOf( rowKey( list[ 0 ] ) ) );
			if ( was && '0' !== was && String( ids[ rowKey( list[ 0 ] ) ] ) !== was ) {
				notes.push( `post ${ was }, which ${ name } named, is left in place (WooCommerce's earlier ${ role } page); unpublish or delete it if it is no longer wanted` );
			}
		}
	}
	if ( state.options.permalink_structure !== PERMALINKS ) {
		options.push( { name: 'permalink_structure', before: state.options.permalink_structure, after: PERMALINKS } );
		actions.push( { phase: 'site', type: 'permalinks', value: PERMALINKS, say: `permalinks ${ JSON.stringify( state.options.permalink_structure ) } -> ${ PERMALINKS }` } );
	}
	// Only an empty pointer or one naming a post the site build made is ever overwritten. A page map holds one layout row
	// of each kind (Spec 48 FR-48-30); two rows of one kind stop the run naming them, since nothing can tell which one
	// is the site's.
	for ( const [ type, area ] of Object.entries( LAYOUT_TYPES ) ) {
		const mine = rows.filter( ( r ) => r.postType === type );
		if ( ! mine.length ) {
			continue;
		}
		if ( mine.length > 1 ) {
			problems.push( `${ mine.length } ${ area } rows (${ mine.map( rowKey ).join( ', ' ) }); a page map holds one site-wide ${ area }, so the proposal that made the others is wrong (re-run the page map, or remove the rows that belong to a page or a block)` );
			continue;
		}
		const row = mine[ 0 ];
		const current = state.pointers[ area ] || 0;
		const built = ids[ rowKey( row ) ];
		if ( built && current === built ) {
			continue;
		}
		if ( current && ! state.pointerKeys?.[ area ] ) {
			notes.push( `active ${ area } is post ${ current }, a post not made by the site build, so it is left; to point it at ${ rowKey( row ) } set it yourself once the post exists, if that is wanted` );
			continue;
		}
		const id = idOf( rowKey( row ) );
		options.push( { name: `sgs_active_${ area }_cpt_id`, before: String( current ), after: shown( id ) } );
		actions.push( { phase: 'site', type: 'pointer', area, id, say: `active ${ area }: ${ current || 'none' } -> ${ shown( id ) }` } );
	}
	return problems.length ? { actions: [], problems, notes, options: [] } : { actions, problems, notes, options };
}

// The plan's counts: posts, menus and items it creates; everything else it changes (an adoption only fills the map).
export const tally = ( actions ) => ( {
	creates: actions.filter( ( a ) => CREATES.includes( a.type ) ).length,
	changes: actions.filter( ( a ) => ! CREATES.includes( a.type ) && 'adopt' !== a.type ).length,
	adopts: actions.filter( ( a ) => 'adopt' === a.type ).length,
} );
