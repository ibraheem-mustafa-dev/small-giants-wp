// The site build's plan (Spec 48 FR-48-55): the page map compared with a site's state (lib/site-build-state.mjs),
// as the actions that would make the site match, in four phases run in order: `posts` (every content row, parents
// first, mega-menu panels before the menus that point at them), `menus` (part 3), `layout` (the header, drawer and
// footer posts, whose trees bind their menus), and `site` (parts 4, 5 and 7). Pure: no site access.
// A value that names something not built yet is a ref ({ ref: 'post:<row key>' | 'menu:<name>' | 'item:<menu>:<key>' })
// the executor resolves. A row without an id adopts the one post carrying its row key (a page map an intake rerun
// reset, FR-48-17), else is created; a stored id the site no longer holds stops the run.
import { LAYOUT_TYPES, SHOP_TYPES, orderRows, parentRow, rowKey, treeFor, treeHash } from './site-build-map.mjs';
import { desiredMenus, menuLocation } from './site-build-menus.mjs';

export const PERMALINKS = '/%postname%/';
export const PHASES = [ 'posts', 'menus', 'layout', 'site' ];
const CREATES = [ 'create', 'menu', 'item-add' ];

const shown = ( v ) => ( v && 'object' === typeof v && v.ref ? `(new ${ v.ref })` : String( v ) );

export function planBuild( { rows, state, repo, client, frontRoute = 'home' } ) {
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
			ids[ key ] = null;
		}
	}
	const wanted = desiredMenus( rows );
	problems.push( ...wanted.problems );
	notes.push( ...wanted.notes );
	if ( problems.length ) {
		return { actions: [], problems, notes, options };
	}
	const idOf = ( key ) => ( ids[ key ] ? ids[ key ] : { ref: `post:${ key }` } );
	const menuOf = ( name ) => state.menus.find( ( m ) => m.slug === name ) || null;
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
		if ( row.template && ! ( state.templates || [] ).includes( row.template ) ) {
			problems.push( `${ key }: template "${ row.template }" is not one the theme registers` );
			continue;
		}
		const { tree, source } = treeFor( repo, client, row, menuIds );
		const hash = treeHash( tree );
		const unbound = 'placeholder' === source && [ 'header', 'drawer' ].includes( LAYOUT_TYPES[ row.postType ] ) && wanted.menus[ LAYOUT_TYPES[ row.postType ] ] && ! menuIds[ LAYOUT_TYPES[ row.postType ] ];
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
		const want = { post_title: row.title, post_name: row.slug, post_status: 'publish', ...fields };
		const have = { post_title: p.title, post_name: p.slug, post_status: p.status, post_parent: p.parent, page_template: p.template };
		const diff = Object.fromEntries( Object.entries( want ).filter( ( [ k, v ] ) => String( v?.ref ? '' : v ) !== String( have[ k ] ) || v?.ref ) );
		if ( Object.keys( diff ).length || p.rowKey !== key ) {
			actions.push( { phase, type: 'update', key, id: p.id, fields: diff, mark: p.rowKey !== key, say: `${ key }: post ${ p.id }: ${ [ ...Object.entries( diff ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( have[ k ] ) } -> ${ shown( v ) }` ), ...( p.rowKey !== key ? [ 'record its row key' ] : [] ) ].join( '; ' ) }` } );
		}
	}

	// Menus (part 3): matched by (menu, object id) for post items and by title for custom parents.
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
			const at = existing.findIndex( ( e ) => ( 'post' === it.kind
				? objectId && e.objectId === objectId && e.object === it.postType
				: 'custom' === e.type && e.title === it.title ) && e.parent === ( 'number' === typeof parentId ? parentId : -1 ) );
			const where = `menu "${ name }" item "${ it.label }"`;
			if ( at < 0 ) {
				actions.push( { phase: 'menus', type: 'item-add', menu: menuRef, key: `item:${ name }:${ it.key }`, kind: it.kind, object: 'post' === it.kind ? idOf( it.rowKey ) : null, title: it.title, position: it.order, parent: parentId, say: `${ where }: add at position ${ it.order }${ it.parentKey ? ` under "${ list.find( ( x ) => x.key === it.parentKey ).label }"` : '' }` } );
				continue;
			}
			const e = existing.splice( at, 1 )[ 0 ];
			matched[ it.key ] = e.id;
			const titleOff = it.title ? e.title !== it.title : '' !== e.title;
			if ( e.order !== it.order || titleOff ) {
				if ( titleOff && ! it.title ) {
					notes.push( `${ where }: item ${ e.id } carries the custom title "${ e.title }"; clear it in Appearance > Menus to show the post's own title` );
				}
				if ( e.order !== it.order || it.title ) {
					actions.push( { phase: 'menus', type: 'item-update', id: e.id, title: titleOff && it.title ? it.title : null, position: it.order, parent: parentId, say: `${ where }: item ${ e.id }: ${ e.order !== it.order ? `position ${ e.order } -> ${ it.order }` : '' }${ titleOff && it.title ? ` title "${ e.title }" -> "${ it.title }"` : '' }` } );
				}
			}
		}
		existing.forEach( ( e ) => actions.push( { phase: 'menus', type: 'item-delete', id: e.id, say: `menu "${ name }": delete item ${ e.id } "${ e.title || `${ e.object } ${ e.objectId }` }", which no page-map row asks for` } ) );
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
	const blogs = rows.filter( ( r ) => 'page' === r.postType && 'live' === r.collection );
	if ( blogs.length > 1 ) {
		problems.push( `${ blogs.map( rowKey ).join( ' and ' ) } are all post listings; one page can be the posts page` );
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
