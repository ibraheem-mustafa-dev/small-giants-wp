// The menus the page map asks for (Spec 48 FR-48-55 part 3), as ordered item lists the planner matches against a
// site's classic menus. A row's `menus` entry names its menu, its position and the label of its parent item:
//   - a mega-menu panel row is the menu item at its slot (Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item opens a
//     panel only for an item whose object is the panel post), labelled with its title less " mega menu"; a page row
//     on the same slot is that panel's Section page (Spec 36 FR-36-5, returned in `sections`) and adds no item of its
//     own;
//   - a parent label that names no item of the menu is a custom item linking "#" (a disclosure, never a link:
//     SGS_Nav_Menu_Source::is_destination_url), placed after the positioned top-level items in first-mention order.
// Items come out in display order (each parent, then its children by position); `order` is the item's menu_order.
import { megaPanelLabel } from './page-map-names.mjs';
import { hasPost, menuSurfaceKind, rowKey, wpType } from './site-build-map.mjs';

const labelOf = ( row ) => ( 'sgs_mega_menu' === row.postType ? megaPanelLabel( row.title ) : row.title );

export function desiredMenus( rows, linkText = {}, surfaces = {} ) {
	const problems = [];
	const notes = [];
	const menus = {};
	// Mega row key -> its section page's row key, from every menu that pairs them.
	const sections = {};
	// A row that makes no post (a `product` or `product_cat` row, FR-48-55 part 1) has nothing for a menu item to open.
	rows.filter( ( r ) => ! hasPost( r ) && ( r.menus || [] ).length ).forEach( ( r ) => notes.push( `${ rowKey( r ) }: a ${ r.postType } row makes no post, so its ${ r.menus.map( ( m ) => m.menu ).join( ', ' ) } menu entr${ 1 === r.menus.length ? 'y adds' : 'ies add' } no item; link the menu item to a product or category in Appearance > Menus` ) );
	const entries = rows.filter( hasPost ).flatMap( ( row ) => ( row.menus || [] ).map( ( m ) => ( { row, menu: m.menu, position: m.position, parentItem: m.parentItem || null } ) ) );
	const names = [ ...new Set( entries.map( ( e ) => e.menu ) ) ];
	for ( const name of names ) {
		// The draft's link text for the surface this menu feeds; a header menu a drawer also binds (no drawer menu) falls back to the drawer's.
		const kind = menuSurfaceKind( name, surfaces );
		const texts = { ...( 'header' === kind && ! names.some( ( n ) => 'drawer' === menuSurfaceKind( n, surfaces ) ) ? linkText.drawer : {} ), ...( linkText[ kind ] || {} ) };
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
			if ( megas.length > 1 || others.length > 1 ) {
				problems.push( `${ group.map( ( e ) => rowKey( e.row ) ).join( ' and ' ) } share the ${ where }` );
				continue;
			}
			if ( megas.length && others.length ) {
				const mega = rowKey( megas[ 0 ].row );
				const page = rowKey( others[ 0 ].row );
				if ( sections[ mega ] && sections[ mega ] !== page ) {
					problems.push( `${ mega }: its menu slots pair it with both ${ sections[ mega ] } and ${ page }; one page can be its section page` );
					continue;
				}
				sections[ mega ] = page;
				notes.push( `${ page }: the ${ where } is the "${ labelOf( megas[ 0 ].row ) }" mega item's; the page is that panel's section page and adds no item of its own` );
			}
			// The draft's own link text for the slot's route (a mega slot takes its section page's link), else the row's label.
			const text = texts[ ( others[ 0 ] || megas[ 0 ] ).row.route ] || null;
			chosen.push( Object.assign( megas[ 0 ] || others[ 0 ], { text } ) );
		}
		const item = ( e ) => ( {
			key: `post:${ rowKey( e.row ) }@${ e.parentItem || '' }`,
			kind: 'post',
			rowKey: rowKey( e.row ),
			postType: wpType( e.row ),
			label: e.text || labelOf( e.row ),
			// The stored item title: a mega item carries its label, a post item shows the post's own title ('') unless the
			// draft's link text differs from it.
			title: 'sgs_mega_menu' === e.row.postType ? e.text || labelOf( e.row ) : e.text && e.text !== e.row.title ? e.text : '',
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
	return { menus, sections, problems, notes };
}

// The registered theme location a menu is assigned to: the location named like the menu, and for the header menu the
// theme's primary navigation (the location SGS_Nav_Menu_Source::blocks_from_theme_location prefers); else none.
export function menuLocation( name, registered ) {
	if ( registered.includes( name ) ) {
		return name;
	}
	return 'header' === name ? [ 'primary', 'main' ].find( ( l ) => registered.includes( l ) ) || null : null;
}
