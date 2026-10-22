// The footer's three slotted rows (Spec 48 §3.4, rules.footerSlots): a footer block always holds exactly three row blocks,
// `top`, `columns` and `bottom` (plugins/sgs-blocks/src/blocks/site-footer/edit.js::TEMPLATE). The columns row is the
// footer's grid of link groups; an in-flow direct child of the footer root stacked wholly above it is the top row's content
// and one stacked wholly below it is the bottom row's; a floating element (declared or computed fixed or absolute: a chat
// button, a back-to-top control, a global modal surface) paints the same from any row, so it goes in the bottom row.
// Signals are universal: position, rendering, box geometry, and what an element holds (links, headings, lists). Never a
// surface name, a class, a client name or a pixel value. The pure part is `footerPlan`; the proposal part is
// `buildFooterRows`, which takes the writer's closure helpers so that skeleton-propose.mjs stays small.
import { OUT_OF_FLOW, insideStrips } from './skeleton-header-slots.mjs';

const isOut = ( p ) => OUT_OF_FLOW.has( String( p ?? '' ).trim() );
const widthsOf = ( el ) => Object.keys( el?.box || {} );
const drawnAt = ( el, w ) => !! el?.box?.[ w ] && el.box[ w ].w > 0 && el.box[ w ].h > 0 && false !== el.visible?.[ w ];
// The widest read width an element renders at (the desktop reading), or undefined.
const widest = ( el ) => widthsOf( el ).filter( ( w ) => drawnAt( el, w ) ).sort( ( a, b ) => b - a )[ 0 ];

// An element that is out of the flow: declared fixed or absolute, or computed so at a width it renders at.
export const isFloating = ( k, declared = () => null ) => isOut( declared( k ) ) || widthsOf( k ).some( ( w ) => drawnAt( k, w ) && isOut( k.position?.[ w ] ) );

// The elements of a list that sit side by side with another of the list at desktop: separate columns of one row (their
// horizontal extents do not overlap and their vertical extents do).
export function sideBySide( list ) {
	const at = list.map( ( k ) => ( { k, b: k.box?.[ widest( k ) ] } ) ).filter( ( x ) => x.b );
	const apart = ( a, b ) => a.x + a.w <= b.x + 1 || b.x + b.w <= a.x + 1;
	const overlapY = ( a, b ) => a.y < b.y + b.h && b.y < a.y + a.h;
	return at.filter( ( x ) => at.some( ( y ) => y !== x && apart( x.b, y.b ) && overlapY( x.b, y.b ) ) ).map( ( x ) => x.k );
}

// The footer root's children split into its three slots. `kids` are the root's block children in document order;
// `subtree( x )` is x and all its block descendants; `kidsOf( x )` its block children; `declared( x )` the declared
// position. Returns { mode, top, columns, bottom, floating } (each a list of elements in document order). A link group is an
// element holding a link and a heading, a list, or two links. A child whose in-flow children are stacked (so no grid
// itself) and which holds a grid below it (a width wrapper of the footer's bands) is read through to its children. The
// columns are, in order of preference: (grid) the in-flow child that is itself a grid, two or more link groups side by
// side, the one holding the most links when there are several (the others are strips); (band) with no such child, the link groups of
// the root's own children that sit side by side; (none) with neither, every in-flow child, all in the columns row: with no
// grid no signal says where the footer's body ends and a strip begins, so nothing is split off. A child stacked wholly above
// the columns at every width where both render is top, below is bottom; a child inline with them is part of them.
export function footerPlan( kids, { subtree, kidsOf, declared = () => null } ) {
	const href = ( d ) => 'a' === d.tag && '' !== String( d.attrs?.href ?? '' ) && '#' !== String( d.attrs?.href ?? '' );
	const linkGroup = ( k ) => {
		const all = subtree( k );
		const links = all.filter( href ).length;
		return links > 0 && ( links > 1 || all.some( ( d ) => /^(h[1-6]|ul|ol)$/.test( d.tag ) ) );
	};
	const isGrid = ( k ) => sideBySide( kidsOf( k ).filter( linkGroup ) ).length >= 2;
	// A child whose in-flow children are all stacked (so no grid itself) and which holds a grid below it is a wrapper
	// of the footer's stacked bands (a width wrapper): the plan reads through it to its children, so a band above or below
	// the grid inside it is a strip of its own.
	const through = ( k ) => {
		const inner = kidsOf( k ).filter( ( x ) => ! isFloating( x, declared ) );
		return inner.length >= 2 && ! sideBySide( inner ).length && subtree( k ).slice( 1 ).some( isGrid ) ? kidsOf( k ) : null;
	};
	const passed = [];
	const open = ( list ) => list.flatMap( ( k ) => {
		const inner = through( k );
		inner && passed.push( k );
		return inner ? open( inner ) : [ k ];
	} );
	const all = open( kids );
	const floating = all.filter( ( k ) => isFloating( k, declared ) );
	const flow = all.filter( ( k ) => ! floating.includes( k ) );
	// Of two or more grids, the one holding the most links is the columns; the others are strips above or below it.
	const linksIn = ( k ) => subtree( k ).filter( href ).length;
	const grids = flow.filter( isGrid );
	const band = grids.length ? [] : sideBySide( flow.filter( linkGroup ) );
	const mains = grids.length ? [ grids.reduce( ( a, b ) => ( linksIn( b ) > linksIn( a ) ? b : a ) ) ] : band.length >= 2 ? band : [];
	if ( ! mains.length ) {
		return { mode: 'none', top: [], columns: flow, bottom: [], floating, through: passed };
	}
	const split = insideStrips( flow, { holdsMain: ( k ) => mains.includes( k ), declared } );
	return { mode: grids.length ? 'grid' : 'band', top: [ ...split.top ].reverse(), columns: split.main, bottom: split.bottom, floating, through: passed };
}

// The proposal part. c: { R, m, inventory, contentAttrs, base, record, hosts, buildChildren, buildNode, slotProblems,
// setStripRoots, declared, unwrap }; unwrap( x ) records an element the plan read through as unwrapped (as the writer
// unwraps any wrapper, so a width wrapper still gives its host its width slot). Returns the three row nodes for the footer root `e`, or the ordinary children when the rule
// names no slot attribute (each element that would have had a row is a problem).
export function buildFooterRows( e, block, c ) {
	const F = c.R.footerSlots;
	const { m } = c;
	const subtree = ( x ) => [ x, ...m.blockKids( x ).flatMap( subtree ) ];
	const rowNode = ( slot, innerBlocks ) => ( { name: F.rowBlock, attributes: { [ F.slotAttribute ]: slot }, innerBlocks } );
	// The floating elements the inventory read beside the footer root: rendering, holding no other surface's root, their elements read.
	const byKey = new Map( c.inventory.elements.map( ( x ) => [ x.key, x ] ) );
	const beside = ( c.inventory.beside || [] ).filter( ( b ) => b.renders && ! b.holdsOtherRoot && ( isOut( b.position ) || isOut( c.declared( byKey.get( b.key ) ?? {} ) ) ) ).map( ( b ) => byKey.get( b.key ) ).filter( ( x ) => x?.strip );
	const plan = footerPlan( m.blockKids( e ), { subtree, kidsOf: m.blockKids, declared: c.declared } );
	if ( ! F.slotAttribute ) {
		[ ...plan.top, ...plan.columns, ...plan.bottom, ...plan.floating, ...beside ].forEach( ( x ) => c.slotProblems.push( `${ x.key }: an element of the footer has no row: rules.footerSlots names no slot attribute` ) );
		return c.buildChildren( e, block );
	}
	c.setStripRoots( beside.map( ( x ) => x.key ) );
	plan.through.forEach( ( x ) => c.unwrap( x ) );
	// One element is the row itself (its descendants are the row's children, its attributes the row's, floating elements
	// after them); several go inside a keyless row, one built node each (a built row block gives its children to the row).
	function slotRow( el, slot ) {
		const hit = { block: F.rowBlock, score: 1, share: 1, evidence: [ { text: `rule footerSlots: ${ F.reason }` } ] };
		const { a, handover } = c.contentAttrs( F.rowBlock, el, hit );
		a[ F.slotAttribute ] = slot;
		const node = c.base( el, F.rowBlock, a );
		handover.length && ( node.handover = handover );
		const row = c.record( el, { rule: 'footerSlots', source: 'rule footerSlots', reason: `the ${ slot } row of the footer`, confidence: 1, candidates: [ hit ] }, { attributes: a } );
		c.hosts.push( { block: F.rowBlock, node, row } );
		node.innerBlocks = c.buildChildren( el, F.rowBlock );
		c.hosts.pop();
		return node;
	}
	// With no grid the children are built as the footer's ordinary children: a wrapper the other rules unwrap still goes, and
	// when exactly one node is itself a row block it is the columns row (as the header's main bar is its middle row).
	// The root's width-only children (an sc-if on a width: an alternative of the sibling it follows) are built into the row
	// that sibling is in, so the width gate can hide each branch on the other's widths; one with no sibling before it
	// follows the first row that has content.
	const kidsInOrder = m.kids( e ).filter( ( k ) => ! m.isPart( k ) );
	const wides = m.widthKids( e );
	const rowHolding = ( k ) => [ 'top', 'columns', 'bottom' ].find( ( s ) => plan[ s ].some( ( x ) => subtree( k ).includes( x ) || subtree( x ).includes( k ) ) ) ?? ( plan.floating.some( ( x ) => subtree( k ).includes( x ) ) ? 'bottom' : null );
	const slotOfWide = ( w ) => {
		const before = kidsInOrder.slice( 0, kidsInOrder.indexOf( w ) ).reverse().find( ( k ) => ! wides.includes( k ) );
		return ( before && rowHolding( before ) ) || [ 'top', 'columns', 'bottom' ].find( ( s ) => plan[ s ].length ) || 'columns';
	};
	const rowOf = ( slot, els, floats = [] ) => {
		const parent = 'none' === plan.mode ? block : F.rowBlock;
		const floated = () => floats.flatMap( ( x ) => ( x.strip ? [ c.buildNode( x, F.rowBlock ) ] : c.buildChildren( e, parent, [ x ] ) ) ).filter( Boolean );
		const alternatives = () => wides.filter( ( w ) => slotOfWide( w ) === slot ).flatMap( ( w ) => c.buildNode( w, parent ) ).filter( Boolean );
		if ( 1 === els.length && 'none' !== plan.mode ) {
			const row = slotRow( els[ 0 ], slot );
			row.innerBlocks.push( ...alternatives(), ...floated() );
			return row;
		}
		const built = [ ...( els.length ? c.buildChildren( e, parent, els ) : [] ), ...alternatives(), ...floated() ].filter( Boolean );
		const rowsIn = built.filter( ( n ) => n.name === F.rowBlock );
		const row = 1 === rowsIn.length ? rowsIn[ 0 ] : rowNode( slot, [] );
		row.innerBlocks = built.flatMap( ( n ) => ( n.name === F.rowBlock ? n.innerBlocks : [ n ] ) );
		row.attributes[ F.slotAttribute ] = slot;
		return row;
	};
	const floats = [ ...plan.floating, ...beside ];
	return [
		plan.top.length ? rowOf( 'top', plan.top ) : rowNode( 'top', [] ),
		plan.columns.length ? rowOf( 'columns', plan.columns ) : rowNode( 'columns', [] ),
		plan.bottom.length || floats.length ? rowOf( 'bottom', plan.bottom, floats ) : rowNode( 'bottom', [] ),
	];
}
