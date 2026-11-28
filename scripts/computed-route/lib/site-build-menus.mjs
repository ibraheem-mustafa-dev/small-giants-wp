// The menus the page map asks for (Spec 48 FR-48-55 part 3), as ordered item lists the planner matches against a
// site's classic menus. A row's `menus` entry names its menu, its position and the label of its parent item:
//   - a mega-menu panel row is the menu item at its slot (Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item opens a
//     panel only for an item whose object is the panel post), labelled with its title less " mega menu"; a page row
//     on the same slot is that panel's Section page (Spec 36 FR-36-5, returned in `sections`) and adds no item of its
//     own;
//   - a parent label that names no item of the menu is a custom item linking "#" (a disclosure, never a link:
//     SGS_Nav_Menu_Source::is_destination_url), placed after the positioned top-level items in first-mention order;
//   - a link-less label the draft's nav draws (`menuLinks.labels`, lib/site-build-menu-links.mjs::menuLinksFor) is a custom
//     item linking "#" at its own position in a menu that already holds entries, with the draft's chip words as its
//     Description (`sgs/nav-bar-menu` draws a Description as the item's badge and a `disabledItemIds` item as plain text;
//     the skeleton writes that item's identifier as the site recorded it, lib/site-build-map.mjs::writeMenuMap `items`);
//   - a `product` row's entry (a row that makes no post) is a custom link item with the draft's own link text, to the
//     product's permalink plus the draft href's own query (lib/site-build-menu-links.mjs::menuLinksFor, `menuLinks`); an
//     entry whose product is not built on the site yet makes no item and is reported with the reason;
//   - every item is labelled with the draft's own words for its slot and carries the chip drawn beside them as its
//     Description (`menuLinks.slots`, lib/site-build-menu-links.mjs::slotsFor); a page entry whose draft link carries a
//     `#fragment` or a query is a custom link to that address;
//   - a linked draft item no row entry holds is a custom link at its own position when it is a second link to a row the
//     menu already holds (the page map gives a row one entry per menu) or an address no row holds (an external link); an
//     item with no address on the site is a note with the reason.
// Items come out in display order (each parent, then its children by position); `order` is the item's menu_order.
import { megaPanelLabel } from './page-map-names.mjs';
import { boundMenu, hasPost, menuSurfaceKind, rowKey, wpType } from './site-build-map.mjs';

const labelOf = ( row ) => ( 'sgs_mega_menu' === row.postType ? megaPanelLabel( row.title ) : row.title );

export function desiredMenus( rows, linkText = {}, surfaces = {}, menuLinks = { links: {}, pending: [], labels: [], slots: {} } ) {
	const problems = [];
	const notes = [];
	const menus = {};
	// Mega row key -> its section page's row key, from every menu that pairs them.
	const sections = {};
	// A row that makes no post (a `product` or `product_cat` row, FR-48-55 part 1) has no post for a menu item to open: its
	// entries are custom links where the product's address is known (`menuLinks`), else a note giving the reason.
	for ( const r of rows.filter( ( x ) => ! hasPost( x ) && ( x.menus || [] ).length ) ) {
		const waiting = menuLinks.pending.filter( ( p ) => p.rowKey === rowKey( r ) );
		if ( ! waiting.length && ! ( menuLinks.links[ rowKey( r ) ] || [] ).length ) {
			notes.push( `${ rowKey( r ) }: a ${ r.postType } row makes no post, so its ${ r.menus.map( ( m ) => m.menu ).join( ', ' ) } menu entr${ 1 === r.menus.length ? 'y adds' : 'ies add' } no item; link the menu item to a product or category in Appearance > Menus` );
		}
		waiting.forEach( ( p ) => notes.push( `${ p.rowKey }: the ${ p.menu } menu entry${ p.text ? ` "${ p.text }"` : '' } adds no item yet: ${ p.why }` ) );
	}
	const entries = [
		...rows.filter( hasPost ).flatMap( ( row ) => ( row.menus || [] ).map( ( m ) => ( { row, menu: m.menu, position: m.position, parentItem: m.parentItem || null } ) ) ),
		...rows.filter( ( r ) => ! hasPost( r ) ).flatMap( ( row ) => ( menuLinks.links[ rowKey( row ) ] || [] ).map( ( l ) => ( { row, menu: l.menu, position: l.position, parentItem: l.parentItem, link: l } ) ) ),
	];
	const names = [ ...new Set( entries.map( ( e ) => e.menu ) ) ];
	for ( const name of names ) {
		// The draft's link text for the surface this menu feeds; a header menu a drawer also binds (no drawer menu) falls back to the drawer's.
		const kind = menuSurfaceKind( name, surfaces );
		const texts = { ...( 'header' === kind && ! names.some( ( n ) => 'drawer' === menuSurfaceKind( n, surfaces ) ) ? linkText.drawer : {} ), ...( linkText[ kind ] || {} ) };
		const mine = entries.filter( ( e ) => e.menu === name );
		// The draft's own items of this menu (lib/site-build-menu-links.mjs::slotsFor): each one's words, chip and address.
		const drawn = menuLinks.slots?.[ name ] || [];
		const drawnAt = ( parentItem, position ) => drawn.find( ( d ) => d.parentItem === ( parentItem || null ) && d.position === position ) || null;
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
			// The draft's own words for the item at this slot, else the draft's link text for the slot's route (a mega slot takes
			// its section page's link), else the row's label. A page item whose draft link carries a fragment or a query
			// (`Help.dc.html#delivery`) is a custom link to that address, since an item opening the post cannot carry either.
			const own = drawnAt( group[ 0 ].parentItem, group[ 0 ].position );
			const text = own?.text || texts[ ( others[ 0 ] || megas[ 0 ] ).row.route ] || null;
			const pick = megas[ 0 ] || others[ 0 ];
			const toAddress = ! megas.length && ! pick.link && own?.url && own.rowKey === rowKey( pick.row ) && /[?#]/.test( own.url );
			chosen.push( Object.assign( pick, { text, badge: own?.badge || '' }, toAddress ? { link: { text, url: own.url } } : {} ) );
		}
		// A draft item no row entry holds is still the draft's item: a second link to a row the menu already holds (the page map
		// gives a row one entry per menu: `Help.dc.html#allergens` beside `Help.dc.html`), or an address no row holds (an external
		// or root-relative link). It is a custom link with the draft's words; one with no address on the site adds no item and is
		// noted with the reason.
		const asked = rows.flatMap( ( r ) => ( r.menus || [] ).filter( ( m ) => m.menu === name ).map( ( m ) => ( { ...m, key: rowKey( r ) } ) ) );
		const claimed = new Set( asked.map( ( m ) => `${ m.parentItem || '' }\u0000${ m.position }` ) );
		const held = new Set( asked.map( ( m ) => m.key ) );
		const parents = new Set( [ ...drawn, ...asked ].map( ( d ) => d.parentItem ).filter( Boolean ) );
		for ( const d of drawn.filter( ( x ) => ! claimed.has( `${ x.parentItem || '' }\u0000${ x.position }` ) ) ) {
			if ( d.url && ( null === d.rowKey || held.has( d.rowKey ) ) ) {
				chosen.push( { row: null, rowKey: d.rowKey, menu: name, position: d.position, parentItem: d.parentItem, text: d.text, badge: d.badge, link: { text: d.text, url: d.url } } );
			} else if ( ! d.url && ! parents.has( d.text ) ) {
				notes.push( `the ${ name } menu's draft item "${ d.text }" (position ${ d.position }${ d.parentItem ? ` under "${ d.parentItem }"` : '' }) adds no item: ${ d.why }` );
			}
		}
		// A chip the draft draws beside the item's words is its Description (`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` draw it
		// as the item's badge).
		const badge = ( e ) => ( e.badge ? { description: e.badge } : {} );
		const item = ( e ) => ( e.link ? {
			key: `link:${ e.row ? rowKey( e.row ) : e.rowKey || 'draft' }@${ e.parentItem || '' }#${ e.position }`,
			kind: 'link',
			rowKey: e.row ? rowKey( e.row ) : e.rowKey || null,
			label: e.link.text,
			title: e.link.text,
			url: e.link.url,
			...badge( e ),
			position: e.position,
			parentItem: e.parentItem,
		} : {
			key: `post:${ rowKey( e.row ) }@${ e.parentItem || '' }`,
			kind: 'post',
			rowKey: rowKey( e.row ),
			postType: wpType( e.row ),
			label: e.text || labelOf( e.row ),
			// The stored item title: a mega item carries its label, a post item shows the post's own title ('') unless the
			// draft's link text differs from it.
			title: 'sgs_mega_menu' === e.row.postType ? e.text || labelOf( e.row ) : e.text && e.text !== e.row.title ? e.text : '',
			...badge( e ),
			position: e.position,
			parentItem: e.parentItem,
		} );
		const labels = ( menuLinks.labels || [] ).filter( ( l ) => l.menu === name && ! l.parentItem ).map( ( l ) => ( {
			key: `label:${ l.text }@`,
			kind: 'label',
			label: l.text,
			title: l.text,
			description: l.badge || '',
			url: '#',
			position: l.position,
			parentItem: null,
		} ) );
		const top = [ ...chosen.filter( ( e ) => ! e.parentItem ).map( item ), ...labels ].sort( ( a, b ) => a.position - b.position );
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

// The link-less labels of the draft's menus (a nav item drawn as plain words, with an optional chip): [ { menu, position,
// parentItem, text, badge } ], from `menuItems`' items flagged `disabled` (lib/intake-pagemap-surfaces.mjs::plainLabel).
// Which menus take them is desiredMenus' business: a menu the page map names no entry for gets no label.
export function labelsOf( menuItems ) {
	const walk = ( items ) => items.flatMap( ( it ) => [ it, ...walk( it.children || [] ) ] );
	return ( menuItems || [] ).flatMap( ( m ) => walk( m.items ).filter( ( it ) => it.disabled && it.label )
		.map( ( it ) => ( { menu: m.menu, position: it.position, parentItem: it.parentItem || null, text: it.label, badge: it.badge || '' } ) ) );
}

// The menus one surface's own navigation groups made, by name in the draft's document order (the order `menuItems` lists
// them, lib/intake-pagemap.mjs::proposePageMap): a drawer's groups bind these by index (lib/site-build-map.mjs::boundMenu), so
// a second drawer's menus never join the first's and a labelled group keeps the place the draft gives it. `surfaceId` is the
// surfaces.json id the page map recorded on each menu (`surface`). A surface that owns none takes the drawer menus no surface
// claims; only when no drawer menu names a surface at all (a draft with no surfaces.json) does it take every drawer menu, so
// one drawer never binds another drawer's menus. null for a surface that is not a drawer or that has no menu of its own, so the
// header menu binds as before.
export function surfaceMenus( menuItems, kind, surfaceId = null ) {
	if ( 'drawer' !== kind ) {
		return null;
	}
	const ofKind = ( menuItems || [] ).filter( ( m ) => 'drawer' === m.region );
	const mine = surfaceId ? ofKind.filter( ( m ) => m.surface === surfaceId ) : [];
	const claimed = ofKind.some( ( m ) => m.surface );
	const names = [ ...new Set( ( mine.length ? mine : claimed ? ofKind.filter( ( m ) => ! m.surface ) : ofKind ).map( ( m ) => m.menu ) ) ];
	return names.length ? names : null;
}

// The surfaces.json id a layout row stands for (`draftId: 'surfaces.json S-02'`, lib/intake-pagemap.mjs), or null.
export const surfaceIdOf = ( row ) => /^surfaces\.json (\S+)$/.exec( row?.draftId ?? '' )?.[ 1 ] ?? null;

// The top-level labels of the menu a surface of `kind` binds (lib/site-build-map.mjs::boundMenu), for its `index`-th
// navigation group of the surface `surfaceId`: the items its nav block disables. Their `disabledItemIds` identifiers are each
// site's own (lib/site-build-map.mjs::itemIdentifier, carried from menu-map.json by lib/skeleton-carried.mjs::carriedIds `items`).
export function disabledLabels( menuItems, kind, index = 0, surfaceId = null ) {
	const own = surfaceMenus( menuItems, kind, surfaceId );
	const bound = boundMenu( kind, own || [ ...new Set( ( menuItems || [] ).map( ( m ) => m.menu ) ) ], index, own );
	return labelsOf( ( menuItems || [] ).filter( ( m ) => m.menu === bound ) ).filter( ( l ) => ! l.parentItem ).map( ( l ) => l.text );
}

// A URL's path and query with the origin dropped, for comparing an item's stored address with the wanted one across hosts.
export const addressOf = ( url ) => {
	try {
		const u = new URL( url, 'http://site.invalid' );
		return `${ u.pathname.replace( /\/+$/, '' ) }${ u.search }`;
	} catch {
		return String( url );
	}
};
