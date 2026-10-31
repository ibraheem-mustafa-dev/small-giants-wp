// The shop's filter rail (Spec 48 FR-48-61): on the shop template's surface, the draft's filter rail placed as the
// framework's working filter, WooCommerce's product filters inside the theme's `#sgs-shop-filters` aside, the shape the
// framework's archive-product.html composes and the theme's filter drawer builds its groups from (each
// `.sgs-shop-filters__group-heading` and the blocks after it become a `.sgs-shop-filters__group`,
// assets/js/sgs-shop-filters-accordion.js). Found by structure, from the catalogue's facets (FR-48-92), never by a client's
// words or name:
//   - a facet's group label is the draft's own text of the filter group drawing its state key (lib/catalogue-facets.mjs),
//     so each placeable facet (one the catalogue step makes a global attribute: not a variation axis, not an on-off switch,
//     which the theme's boolean toggle draws) is found as the shown element outside the product listing whose own words are
//     its label; a label shown more than once, or nowhere, places no group for that facet;
//   - the rail is the branch beside the product listing holding every found label: the child, holding them all, of the
//     lowest element holding them and the listing (the shop's commerce region, lib/skeleton-commerce-region.mjs, or on any
//     other page the product collection a loop places, lib/skeleton-loop-blocks.mjs); a rail holds filter controls only,
//     so a branch holding the page's h1, or a picture outside the child holding every label, narrows to that child (a gift
//     finder in a page's hero, narrowing the product listing below it);
//   - a facet's group is its label's highest ancestor below the rail holding no other facet's label, and a group drawn as a
//     caption alone takes the row of controls beside it after it as its body (a label above its chips); the groups' parent
//     holds the draft's other groups, each placed when the catalogue says what it filters: a price range (its text shows a
//     currency amount), brands (it names two or more of the catalogue's brands) or categories (two or more of its
//     categories); any other group (an on-off switch row, a group the catalogue holds nothing for) is listed in the notes;
//   - each group is a heading (the label, read at the draft's label element so Fill takes its look) followed by its filter,
//     in the draft's order; a group the draft shows open starts open (the heading's open class), a facet with swatches
//     takes the swatch look, and a group showing checkboxes is a checkbox list, else chips.
// A facet's filter names its attribute by slug (`facet`); the site's attribute id is a carried id (lib/skeleton-carried.mjs).
// Pure: the inventory model, the commerce region and the catalogue's filter data in, the rail out.

const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const MEDIA = new Set( [ 'img', 'picture', 'video', 'canvas', 'iframe' ] );
// An attribute as the draft writes it, through the one element-facts reader (`read`, lib/element-facts.mjs).
const attr = ( read, e, name ) => String( read.attr( e, name ) ?? '' );

// The facets the rail places: those the catalogue step writes as filter attributes, not a variation axis and not an
// on-off switch.
export const placeableFacets = ( facets ) => ( facets || [] ).filter( ( f ) => ! f.axis && 'boolean' !== f.kind );

// o: { m (lib/skeleton-model.mjs), region (the shop's commerce region: { key }), filters ({ facets, brands, categories }),
// rule (rules.filterRail), money (rules.commerceRegion.money) }. Returns { key, attributes, inner, groups, notes, reason }, or
// { note } when the labels sit apart, or null when the surface has no rail to place.
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
	let rail = 1 === branches.size ? m.byKey[ [ ...branches ][ 0 ] ] : null;
	// A rail holds filter controls only, never the page's own heading or a picture: a branch holding the page's h1, or a
	// picture beside the child that holds every label (a hero whose finder narrows the product listing below it), narrows to
	// that child.
	const holds = ( a, test ) => m.els.some( ( e ) => shown( e ) && e !== a && under( e, a ) && test( e ) );
	for ( let next = rail; next; ) {
		const holder = m.els.find( ( c ) => c.parentKey === next.key && shown( c ) && found.every( ( x ) => x.label === c || under( x.label, c ) ) );
		next = holder && ! found.some( ( x ) => x.label === holder ) && ( holds( next, ( e ) => 'h1' === e.tag ) || holds( next, ( e ) => MEDIA.has( e.tag ) && ! under( e, holder ) ) ) ? holder : null;
		next && ( rail = next );
	}
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
	// A label drawn on its own, its controls the next element beside it (a caption above a row of chips), is one group with
	// that row: the row is the group's body and is never a group of its own.
	const controls = ( e ) => m.els.some( ( c ) => shown( c ) && ( c === e || under( c, e ) ) && ( [ 'button', 'input', 'select' ].includes( c.tag ) || !! m.read.handler( c ) ) );
	const bodyOf = new Map();
	const kids = parent ? m.els.filter( ( e ) => e.parentKey === parent.key && shown( e ) ) : m.els.filter( ( e ) => found.some( ( x ) => x.group === e ) );
	kids.forEach( ( g, i ) => squash( m.words( g ) ) && ! controls( g ) && kids[ i + 1 ] && controls( kids[ i + 1 ] ) && ! found.some( ( x ) => x.group === kids[ i + 1 ] ) && bodyOf.set( g, kids[ i + 1 ] ) );
	const bodies = new Set( bodyOf.values() );
	for ( const g of kids.filter( ( e ) => ! bodies.has( e ) ) ) {
		const hit = found.find( ( x ) => x.group === g );
		if ( hit ) {
			groups.push( { kind: 'facet', group: g, label: hit.label, facet: hit.facet, ...( bodyOf.has( g ) ? { body: bodyOf.get( g ) } : {} ) } );
			continue;
		}
		// Another group of the rail: its label is its first shown element (in the draft's order) with words of its own.
		const label = m.els.find( ( e ) => shown( e ) && squash( m.words( e ) ) && ( e === g || under( e, g ) ) );
		const text = `${ g.allText ?? '' } ${ bodyOf.get( g )?.allText ?? '' }`;
		const kind = amount.test( text ) ? 'price' : named( text, filters.brands ) ? 'brand' : named( text, filters.categories ) ? 'category' : null;
		kind ? groups.push( { kind, group: g, label, ...( bodyOf.has( g ) ? { body: bodyOf.get( g ) } : {} ) } ) : notes.push( `the rail's group ${ g.key }${ label ? ` "${ squash( m.words( label ) ) }"` : '' } filters nothing the catalogue holds, so it is not placed` );
	}
	// A group is open when it shows anything beside the child holding its label.
	const open = ( x ) => !! x.body || m.els.some( ( c ) => c.parentKey === x.group.key && shown( c ) && ! ( c === x.label || under( x.label, c ) ) );
	const checkboxes = ( x ) => m.els.some( ( c ) => shown( c ) && [ x.group, x.body ].some( ( g ) => g && under( c, g ) ) && 'input' === c.tag && 'checkbox' === attr( m.read, c, 'type' ).toLowerCase() );
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
	return { key: rail.key, attributes: { ...rule.attributes }, inner, groups: groups.map( ( x ) => ( { kind: x.kind, key: x.group.key, label: x.label.key, ...( x.facet ? { facet: x.facet.slug } : {} ) } ) ), notes, reason: `${ rule.reason } (${ groups.length } group(s): ${ said.join( ', ' ) })` };
}
