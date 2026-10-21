// The site build's plan (Spec 48 FR-48-55): the page map compared with a site's state (lib/site-build-state.mjs),
// as the actions that would make the site match, in four phases run in order: `posts` (every content row, parents
// first, mega-menu panels before the menus that point at them, then each panel's section page), `menus` (part 3), `layout` (the header, drawer and
// footer posts, whose trees bind their menus), and `site` (parts 4, 5 and 7). Pure: no site access.
// A value that names something not built yet is a ref ({ ref: 'post:<row key>' | 'menu:<name>' | 'item:<menu>:<key>' })
// the executor resolves. The run only ever changes what it made: a stored id must name a post carrying that row's key
// (`_sgs_site_build_row`), a menu it reuses must carry its own mark, and an item no row asks for is reported, never
// deleted. A row without an id adopts the one post carrying its key (a page map an intake rerun reset, FR-48-17), else
// is created; an unmarked post already holding its type and slug (another author's, or one an interrupted run saved
// before marking it) stops the run, so it is never duplicated or renamed `<slug>-2`.
import { LAYOUT_TYPES, SHOP_TYPES, boundMenu, orderRows, parentRow, rowKey, treeFor, treeHash } from './site-build-map.mjs';
import { desiredMenus, menuLocation } from './site-build-menus.mjs';
import { MENU_META, ROW_META } from './site-build-state.mjs';

export const PERMALINKS = '/%postname%/';
export const PHASES = [ 'posts', 'menus', 'layout', 'site' ];
const CREATES = [ 'create', 'menu', 'item-add' ];

const shown = ( v ) => ( v && 'object' === typeof v && v.ref ? `(new ${ v.ref })` : String( v ) );

export function planBuild( { rows, state, repo, client, frontRoute = 'home', linkText = {} } ) {
	const problems = [];
	const notes = [];
	const actions = [];
	const options = [];
	rows.filter( ( r ) => SHOP_TYPES.includes( r.postType ) ).forEach( ( r ) => problems.push( `${ rowKey( r ) }: a ${ r.postType } row is a shop client's (FR-48-55 parts 1 and 6), which this script does not build yet` ) );
	let ordered = [];
	try {
		ordered = orderRows( rows );
	} catch ( e ) {
		problems.push( e.message );
	}
	const ids = {};
	for ( const row of ordered ) {
		const key = rowKey( row );
		if ( Number.isInteger( row.id ) ) {
			const p = state.posts[ String( row.id ) ];
			if ( ! p || p.type !== row.postType || 'trash' === p.status ) {
				problems.push( `${ key }: its stored id ${ row.id } ${ p && p.type !== row.postType ? `is a ${ p.type }, not a ${ row.postType }` : 'no longer exists on the site' }; restore the post or clear the row's id` );
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
			if ( held.length ) {
				problems.push( `${ key }: post ${ held.join( ', ' ) } already holds this ${ row.postType } slug and carries no site-build row key; if an interrupted run made it, mark it with "wp post meta update ${ held[ 0 ] } ${ ROW_META } ${ key }", otherwise rename or delete it` );
			}
			ids[ key ] = null;
		}
	}
	const wanted = desiredMenus( rows, linkText );
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
		const phase = LAYOUT_TYPES[ row.postType ] ? 'layout' : 'posts';
		const parent = parentRow( rows, row );
		if ( row.parent && ! parent ) {
			problems.push( `${ key }: its parent "${ row.parent }" is no ${ row.postType } row of the page map` );
			continue;
		}
		if ( row.template && ! ( state.templates?.[ row.postType ] || [] ).includes( row.template ) ) {
			problems.push( `${ key }: template "${ row.template }" is not one the theme registers for a ${ row.postType }` );
			continue;
		}
		const { tree, source } = treeFor( repo, client, row, menuIds );
		const hash = treeHash( tree );
		const binds = LAYOUT_TYPES[ row.postType ] && boundMenu( LAYOUT_TYPES[ row.postType ], Object.keys( menuIds ) );
		const unbound = 'placeholder' === source && [ 'header', 'drawer' ].includes( LAYOUT_TYPES[ row.postType ] ) && wanted.menus[ binds ] && ! menuIds[ binds ];
		const fields = { post_parent: parent ? idOf( rowKey( parent ) ) : 0, page_template: row.template || '' };
		if ( ! ids[ key ] ) {
			const after = Object.fromEntries( Object.entries( fields ).filter( ( [ , v ] ) => v ) );
			actions.push( { phase, type: 'create', key, postType: row.postType, title: row.title, slug: row.slug, tree, hash, fields: after, say: `${ key }: create "${ row.title }" from the ${ source } tree${ unbound ? ' (its menu is bound once the menus exist)' : '' }${ Object.keys( after ).length ? `, then set ${ Object.entries( after ).map( ( [ k, v ] ) => `${ k }=${ shown( v ) }` ).join( ', ' ) }` : '' }` } );
			continue;
		}
		const p = state.posts[ String( ids[ key ] ) ];
		if ( p.treeHash !== hash ) {
			actions.push( { phase, type: 'build', key, id: p.id, tree, hash, say: `${ key }: rebuild post ${ p.id } from the ${ source } tree (it was built from another tree)` } );
		}
		// Status is set once, at creation: a post someone has since drafted or made private stays as they left it.
		const want = { post_title: row.title, post_name: row.slug, ...fields };
		const have = { post_title: p.title, post_name: p.slug, post_parent: p.parent, page_template: p.template };
		const diff = Object.fromEntries( Object.entries( want ).filter( ( [ k, v ] ) => String( v?.ref ? '' : v ) !== String( have[ k ] ) || v?.ref ) );
		if ( Object.keys( diff ).length ) {
			actions.push( { phase, type: 'update', key, id: p.id, fields: diff, say: `${ key }: post ${ p.id }: ${ Object.entries( diff ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } -> ${ shown( v ) }` ).join( '; ' ) }` } );
		}
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
	const front = rows.find( ( r ) => 'page' === r.postType && r.route === frontRoute );
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
		notes.push( `no page row has route "${ frontRoute }"; the front page is left as it is` );
	}
	if ( 1 === blogs.length ) {
		option( 'page_for_posts', idOf( rowKey( blogs[ 0 ] ) ) );
	}
	if ( state.options.permalink_structure !== PERMALINKS ) {
		options.push( { name: 'permalink_structure', before: state.options.permalink_structure, after: PERMALINKS } );
		actions.push( { phase: 'site', type: 'permalinks', value: PERMALINKS, say: `permalinks ${ JSON.stringify( state.options.permalink_structure ) } -> ${ PERMALINKS }` } );
	}
	for ( const [ type, area ] of Object.entries( LAYOUT_TYPES ) ) {
		const mine = rows.filter( ( r ) => r.postType === type );
		if ( mine.length > 1 ) {
			problems.push( `${ mine.map( rowKey ).join( ' and ' ) }: one ${ area } can be active` );
		} else if ( mine.length && ( ! ids[ rowKey( mine[ 0 ] ) ] || state.pointers[ area ] !== ids[ rowKey( mine[ 0 ] ) ] ) ) {
			const id = idOf( rowKey( mine[ 0 ] ) );
			options.push( { name: `sgs_active_${ area }_cpt_id`, before: String( state.pointers[ area ] || 0 ), after: shown( id ) } );
			actions.push( { phase: 'site', type: 'pointer', area, id, say: `active ${ area }: ${ state.pointers[ area ] || 'none' } -> ${ shown( id ) }` } );
		}
	}
	return problems.length ? { actions: [], problems, notes, options: [] } : { actions, problems, notes, options };
}

// The plan's counts: posts, menus and items it creates; everything else it changes (an adoption only fills the map).
export const tally = ( actions ) => ( {
	creates: actions.filter( ( a ) => CREATES.includes( a.type ) ).length,
	changes: actions.filter( ( a ) => ! CREATES.includes( a.type ) && 'adopt' !== a.type ).length,
	adopts: actions.filter( ( a ) => 'adopt' === a.type ).length,
} );
