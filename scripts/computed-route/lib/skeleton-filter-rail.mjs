// The shop's filter rail (Spec 48 FR-48-61): on the shop template's surface, the draft's filter rail placed as the
// framework's working filter, WooCommerce's product filters inside the theme's `#sgs-shop-filters` aside, the shape the
// framework's archive-product.html composes and the theme's filter drawer builds its groups from (each
// `.sgs-shop-filters__group-heading` and the blocks after it become a `.sgs-shop-filters__group`,
// assets/js/sgs-shop-filters-accordion.js). Found by structure, from the catalogue's facets (FR-48-92), never by a client's
// words or name:
//   - a facet's group label is the draft's own text of the filter group drawing its state key (lib/catalogue-facets.mjs),
//     so each placeable facet (one the catalogue step makes or finds as a global attribute, a variation axis included, the
//     attribute WooCommerce's filter reads by; not an on-off switch, which the theme's boolean toggle draws) is found as the
//     shown element outside the product listing whose own words are its label; a label shown more than once, or nowhere, places no group for that facet;
//   - the rail is the branch beside the product listing holding every found label: the child, holding them all, of the
//     lowest element holding them and the listing (the shop's commerce region, lib/skeleton-commerce-region.mjs);
//   - a facet's group is its label's highest ancestor below the rail holding no other facet's label; the groups' parent
//     holds the draft's other groups, each placed when the catalogue says what it filters: a price range (its text shows a
//     currency amount), brands (it names two or more of the catalogue's brands) or categories (two or more of its
//     categories); any other group (an on-off switch row, a group the catalogue holds nothing for) is listed in the notes;
//   - each group is a heading (the label, read at the draft's label element so Fill takes its look) followed by its filter,
//     in the draft's order; a group the draft shows open starts open (the heading's open class), a facet with swatches
//     takes the swatch look, and a group showing checkboxes is a checkbox list, else chips.
// A facet's filter names its attribute by slug (`facet`); the site's attribute id is a carried id (lib/skeleton-carried.mjs),
// recorded by the catalogue step for each written facet and for each variation axis a facet names (a product's colour
// picker and the shop's Colour filter are one attribute, `pa_colour`).
// The draft's rail element stands for the whole placed filter: the node built from it keeps the rail's own look (its draftRef),
// each group's heading reads its label, and every other element of the rail's subtree (the filters' chips, boxes and swatches,
// the phone drawer's own look) is drawn by WooCommerce's blocks, so its paint is read at no node. `railRun` names the rail's
// element as the run the placed filter replaced, the way a template piece does (lib/template-pieces-context.mjs::piecesPaint),
// so that paint is the filter's missing features and not a paint conservation problem.
// Pure: the inventory model, the commerce region and the catalogue's filter data in, the rail out.

const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const attr = ( e, name ) => String( e.attrs?.[ name ] ?? new RegExp( `^<[^>]*\\s${ name }="([^"]*)"`, 'i' ).exec( e.snippet || '' )?.[ 1 ] ?? '' );

// The facets the rail places: every facet that is a global attribute on the site, those the catalogue step writes as
// filter attributes and the variation axes a facet names (an axis is a global attribute too, so WooCommerce's attribute
// filter reads it); an on-off switch is the theme's toggle, never placed.
export const placeableFacets = ( facets ) => ( facets || [] ).filter( ( f ) => 'boolean' !== f.kind );

// The draft's own button that opens and closes the rail's drawer: the theme's filter drawer builds its own trigger
// (archive-product.html's `.sgs-shop-filters__toggle`), so a second one built from the draft would show two. It is the shown
// button or link outside the rail whose click handler is also the handler of an element inside the rail (the drawer's close
// control and its "show results" button run the same handler that opens it), found by the handler, never by its words.
// `inventory`: the served inventory (its `revealed` elements hold the rail's drawer view); `railKey`: the placed rail's element.
// Returns { key } for the one such button, { notes } when several are (none is taken), or null.
const CLICK = [ 'sc-camel-on-click', 'onClick' ];
const handlerOf = ( e ) => CLICK.map( ( name ) => String( attr( e, name ) ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim() ).find( Boolean ) ?? '';
export function railToggle( { inventory, railKey } ) {
	const all = [ ...( inventory?.elements || [] ), ...( inventory?.revealed || [] ) ];
	const byKey = new Map();
	all.forEach( ( e ) => byKey.has( e.key ) || byKey.set( e.key, e ) );
	const chain = ( k ) => {
		const out = [];
		for ( let x = k; byKey.has( x ) && ! out.includes( x ); x = byKey.get( x ).parentKey ) {
			out.push( x );
		}
		return out;
	};
	if ( ! byKey.has( railKey ) ) {
		return null;
	}
	const inside = ( e ) => chain( e.key ).includes( railKey );
	const handlers = new Set( all.filter( ( e ) => e.key !== railKey && inside( e ) ).map( handlerOf ).filter( Boolean ) );
	const hits = ( inventory.elements || [] ).filter( ( e ) => [ 'button', 'a' ].includes( e.tag ) && shown( e ) && ! inside( e ) && handlers.has( handlerOf( e ) ) );
	if ( hits.length > 1 ) {
		return { notes: [ `the rail's drawer has ${ hits.length } buttons outside it running the handler its own controls run (${ hits.map( ( e ) => e.key ).join( ', ' ) }), so none is taken for the filter button` ] };
	}
	return hits.length ? { key: hits[ 0 ].key } : null;
}

// What the placed rail does to the tree and the proposal (see the header). The draft's filter button (railToggle) is left out of the
// skeleton, since the theme's own trigger stays: its row becomes a removal naming the rail's rule and its node leaves the tree. The
// rail's draft element and the button's are the filter's run (railRun). Returns { skeleton, proposal: { rows, counts, filterRail }, run }
// with the inputs unchanged; the same tree, an empty proposal part and a null run when the proposal placed no rail or no button.
export function railPass( { inventory, proposal, skeleton } ) {
	const key = proposal?.filterRail?.key;
	const toggle = key ? railToggle( { inventory, railKey: key } ) : null;
	const walk = ( list ) => ( list || [] ).flatMap( ( n ) => [ n, ...walk( n.innerBlocks ) ] );
	const node = toggle?.key ? walk( skeleton ).find( ( n ) => toggle.key === n.draftRef?.tpl ) : null;
	const drop = ( list ) => ( list || [] ).filter( ( n ) => n !== node ).map( ( n ) => ( n.innerBlocks?.length ? { ...n, innerBlocks: drop( n.innerBlocks ) } : n ) );
	const notes = [ ...( toggle?.notes || [] ), ...( node ? [ `the draft's filter button ${ toggle.key } is the theme's drawer trigger (archive-product.html), which the placed rail keeps, so no second button is built; its look is a missing feature of the filter` ] : [] ) ];
	const rows = ( proposal?.rows || [] ).map( ( r ) => ( node && r.key === toggle.key ? { ...r, action: 'remove', rule: 'filterRail', reason: notes.at( -1 ) } : r ) );
	const out = node ? { rows, counts: { ...proposal.counts, skeletonNodes: proposal.counts.skeletonNodes - 1, expandedNodes: proposal.counts.expandedNodes - 1, removed: proposal.counts.removed + 1 }, filterRail: { ...proposal.filterRail, toggle: toggle.key, notes: [ ...( proposal.filterRail.notes || [] ), ...notes ] } } : {};
	return { skeleton: node ? drop( skeleton ) : skeleton, proposal: out, run: railRun( { proposal, skeleton, extra: node ? [ toggle.key ] : [] } ) };
}

// The placed filter's run (see the header): { id: 'filter-rail', block, at, run: [ the rail's draft element, then `extra` ] } for a
// proposal that placed a rail (`proposal.filterRail.key`) whose node the skeleton holds, else null. `skeleton`: the tree after the rules.
export function railRun( { proposal, skeleton, extra = [] } ) {
	const key = proposal?.filterRail?.key;
	const walk = ( list ) => ( list || [] ).flatMap( ( n ) => [ n, ...walk( n.innerBlocks ) ] );
	const node = key ? walk( skeleton ).find( ( n ) => key === n.draftRef?.tpl ) : null;
	return node ? { id: 'filter-rail', block: node.name, at: key, run: [ key, ...extra ] } : null;
}

// o: { m (lib/skeleton-model.mjs), region (the shop's commerce region: { key }), filters ({ facets, brands, categories }),
// rule (rules.filterRail), money (rules.commerceRegion.money) }. Returns { key, attributes, ownAlternativeBelow, inner, groups, notes,
// reason }, or { note } when the labels sit apart, or null when the surface has no rail to place. `ownAlternativeBelow` is
// rules.filterRail's marker ({ setting, scope }: the theme option below whose width the theme's drawer replaces the rail),
// carried onto the rail's skeleton node as a node field (lib/skeleton-propose.mjs), never a block attribute.
export function filterRail( { m, region, filters, rule, money } ) {
	const listing = region?.key ? m.byKey[ region.key ] : null;
	const facets = placeableFacets( filters?.facets );
	if ( ! listing || ! rule || ! facets.length ) {
		return null;
	}
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	const under = ( e, a ) => ancestors( e ).includes( a );
	const outside = m.els.filter( ( e ) => shown( e ) && ! under( e, listing ) );
	const notes = [];
	const found = [];
	for ( const f of facets ) {
		const hits = outside.filter( ( e ) => squash( m.words( e ) ) === squash( f.label ) );
		if ( 1 === hits.length ) {
			found.push( { facet: f, label: hits[ 0 ] } );
		} else if ( hits.length ) {
			notes.push( `the facet "${ f.label }" is labelled ${ hits.length } times (${ hits.map( ( e ) => e.key ).join( ', ' ) }), so it places no group` );
		}
	}
	if ( ! found.length ) {
		return null;
	}
	// The lowest element holding every label and the listing; the rail is its child holding the labels.
	const first = ancestors( found[ 0 ].label );
	const top = first.find( ( a ) => under( listing, a ) && found.every( ( x ) => under( x.label, a ) ) );
	const branches = new Set( found.map( ( x ) => ancestors( x.label ).find( ( a ) => a.parentKey === top?.key )?.key ) );
	const rail = 1 === branches.size ? m.byKey[ [ ...branches ][ 0 ] ] : null;
	if ( ! rail ) {
		return { note: `the facet labels (${ found.map( ( x ) => x.label.key ).join( ', ' ) }) sit in ${ branches.size } branches beside the product listing, so no filter rail is placed` };
	}
	// A facet's group: its label's highest ancestor below the rail holding no other facet's label.
	const groupOf = ( label ) => {
		const others = found.map( ( x ) => x.label ).filter( ( l ) => l !== label );
		return ancestors( label ).filter( ( a ) => a !== rail && under( a, rail ) && ! others.some( ( l ) => under( l, a ) ) ).at( -1 );
	};
	found.forEach( ( x ) => ( x.group = groupOf( x.label ) ) );
	const parents = new Set( found.map( ( x ) => x.group.parentKey ) );
	const parent = 1 === parents.size ? m.byKey[ [ ...parents ][ 0 ] ] : null;
	const amount = new RegExp( money );
	const named = ( text, list ) => ( list || [] ).filter( ( n ) => n && text.includes( n ) ).length >= 2;
	const groups = [];
	for ( const g of parent ? m.els.filter( ( e ) => e.parentKey === parent.key && shown( e ) ) : m.els.filter( ( e ) => found.some( ( x ) => x.group === e ) ) ) {
		const hit = found.find( ( x ) => x.group === g );
		if ( hit ) {
			groups.push( { kind: 'facet', group: g, label: hit.label, facet: hit.facet } );
			continue;
		}
		// Another group of the rail: its label is its first shown element (in the draft's order) with words of its own.
		const label = m.els.find( ( e ) => shown( e ) && squash( m.words( e ) ) && ( e === g || under( e, g ) ) );
		const text = String( g.allText ?? '' );
		const kind = amount.test( text ) ? 'price' : named( text, filters.brands ) ? 'brand' : named( text, filters.categories ) ? 'category' : null;
		kind ? groups.push( { kind, group: g, label } ) : notes.push( `the rail's group ${ g.key }${ label ? ` "${ squash( m.words( label ) ) }"` : '' } filters nothing the catalogue holds, so it is not placed` );
	}
	// A group is open when it shows anything beside the child holding its label.
	const open = ( x ) => m.els.some( ( c ) => c.parentKey === x.group.key && shown( c ) && ! ( c === x.label || under( x.label, c ) ) );
	const checkboxes = ( x ) => m.els.some( ( c ) => shown( c ) && under( c, x.group ) && 'input' === c.tag && 'checkbox' === attr( c, 'type' ).toLowerCase() );
	const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ) } );
	const heading = ( x, swatches ) => ( {
		name: rule.heading.block,
		attributes: { ...rule.heading.attributes, content: squash( m.words( x.label ) ), className: [ rule.heading.className, open( x ) && rule.heading.openClass, swatches && rule.heading.swatchClass ].filter( Boolean ).join( ' ' ) },
		innerBlocks: [],
		draftKey: x.label.key,
	} );
	const filterOf = ( x ) => {
		if ( 'facet' !== x.kind ) {
			return copy( rule.groups[ x.kind ] );
		}
		const style = rule.displayStyles[ checkboxes( x ) ? 'checkbox' : 'choice' ];
		return { ...copy( rule.groups.facet ), attributes: { ...rule.groups.facet.attributes, displayStyle: style }, innerBlocks: [ { name: style, attributes: {}, innerBlocks: [] } ], facet: x.facet.slug };
	};
	const inner = [ { ...copy( rule.filters ), innerBlocks: [ ...copy( rule.filters ).innerBlocks, ...groups.flatMap( ( x ) => [ heading( x, x.facet?.terms?.some( ( t ) => t.swatch ) ), filterOf( x ) ] ) ] } ];
	const said = groups.map( ( x ) => ( x.facet ? `${ x.facet.label } (attribute ${ x.facet.slug })` : `${ squash( m.words( x.label ) ) } (${ x.kind })` ) );
	return { key: rail.key, attributes: { ...rule.attributes }, ...( rule.ownAlternativeBelow ? { ownAlternativeBelow: { ...rule.ownAlternativeBelow } } : {} ), inner, groups: groups.map( ( x ) => ( { kind: x.kind, key: x.group.key, label: x.label.key, ...( x.facet ? { facet: x.facet.slug } : {} ) } ) ), notes, reason: `${ rule.reason } (${ groups.length } group(s): ${ said.join( ', ' ) })` };
}
