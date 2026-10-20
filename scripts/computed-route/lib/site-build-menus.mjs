// The menus the page map asks for (Spec 48 FR-48-55 part 3), as ordered item lists the planner matches against a
// site's classic menus. A row's `menus` entry names its menu, its position and the label of its parent item:
//   - a mega-menu panel row is the menu item at its slot (Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item opens a
//     panel only for an item whose object is the panel post), labelled with its title less " mega menu"; a page row
//     on the same slot is that panel's section page and adds no item of its own;
//   - a parent label that names no item of the menu is a custom item linking "#" (a disclosure, never a link:
//     SGS_Nav_Menu_Source::is_destination_url), placed after the positioned top-level items in first-mention order.
// Items come out in display order (each parent, then its children by position); `order` is the item's menu_order.
import { megaPanelLabel } from './page-map-names.mjs';
import { rowKey } from './site-build-map.mjs';

const labelOf = ( row ) => ( 'sgs_mega_menu' === row.postType ? megaPanelLabel( row.title ) : row.title );

export function desiredMenus( rows ) {
	const problems = [];
	const notes = [];
	const menus = {};
	const entries = rows.flatMap( ( row ) => ( row.menus || [] ).map( ( m ) => ( { row, menu: m.menu, position: m.position, parentItem: m.parentItem || null } ) ) );
	for ( const name of [ ...new Set( entries.map( ( e ) => e.menu ) ) ] ) {
		const mine = entries.filter( ( e ) => e.menu === name );
		const slots = new Map();
		for ( const e of mine ) {
			const slot = `${ e.parentItem || '' }\u0000${ e.position }`;
			slots.set( slot, [ ...( slots.get( slot ) || [] ), e ] );
		}
		const chosen = [];
		for ( const group of slots.values() ) {
			const megas = group.filter( ( e ) => 'sgs_mega_menu' === e.row.postType );
			const others = group.filter( ( e ) => 'sgs_mega_menu' !== e.row.postType );
			const where = `${ name } menu, position ${ group[ 0 ].position }${ group[ 0 ].parentItem ? ` under "${ group[ 0 ].parentItem }"` : '' }`;
			if ( megas.length > 1 || ( ! megas.length && others.length > 1 ) ) {
				problems.push( `${ group.map( ( e ) => rowKey( e.row ) ).join( ' and ' ) } share the ${ where }` );
				continue;
			}
			others.filter( () => megas.length ).forEach( ( e ) => notes.push( `${ rowKey( e.row ) }: the ${ where } is the "${ labelOf( megas[ 0 ].row ) }" mega item's; the page adds no item of its own` ) );
			chosen.push( megas[ 0 ] || others[ 0 ] );
		}
		const item = ( e ) => ( {
			key: `post:${ rowKey( e.row ) }@${ e.parentItem || '' }`,
			kind: 'post',
			rowKey: rowKey( e.row ),
			postType: e.row.postType,
			label: labelOf( e.row ),
			// The stored item title: a mega item carries its label, a post item shows the post's own title ('').
			title: 'sgs_mega_menu' === e.row.postType ? labelOf( e.row ) : '',
			position: e.position,
			parentItem: e.parentItem,
		} );
		const top = chosen.filter( ( e ) => ! e.parentItem ).sort( ( a, b ) => a.position - b.position ).map( item );
		for ( const label of [ ...new Set( chosen.filter( ( e ) => e.parentItem ).map( ( e ) => e.parentItem ) ) ] ) {
			if ( ! top.some( ( t ) => t.label === label ) ) {
				top.push( { key: `custom:${ label }`, kind: 'custom', label, title: label, position: null, parentItem: null } );
			}
		}
		const list = [];
		for ( const t of top ) {
			list.push( { ...t, parentKey: null, order: list.length + 1 } );
			chosen.filter( ( e ) => e.parentItem === t.label ).sort( ( a, b ) => a.position - b.position )
				.forEach( ( e ) => list.push( { ...item( e ), parentKey: t.key, order: list.length + 1 } ) );
		}
		menus[ name ] = list;
	}
	return { menus, problems, notes };
}

// The registered theme location a menu is assigned to: the location named like the menu, and for the header menu the
// theme's primary navigation (the location SGS_Nav_Menu_Source::blocks_from_theme_location prefers); else none.
export function menuLocation( name, registered ) {
	if ( registered.includes( name ) ) {
		return name;
	}
	return 'header' === name ? [ 'primary', 'main' ].find( ( l ) => registered.includes( l ) ) || null : null;
}
