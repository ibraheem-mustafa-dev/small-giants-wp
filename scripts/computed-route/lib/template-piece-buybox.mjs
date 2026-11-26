// The buy box of the product template (Spec 48 FR-48-60, FR-48-96): the run of skeleton nodes the draft's own buy box
// controls were built as (option pickers, labels, an add-to-basket button: a static imitation that sells nothing)
// becomes one working `sgs/buybox`, at the position of the first. Where the draft draws the product's gallery beside an
// information column holding those controls and the page's h1, the buy box then takes that column and draws the two-column
// layout itself (takeColumn): the column's other blocks become its inner blocks, the grid its draftRef. Everything else stays
// the draft's own blocks.
//
// Which elements are the buy box comes from the shop parts record (sites/<client>/build/shop-parts.json, surface
// `piece.find.surface`): every part whose home is a setting of `piece.block` is located on draft elements; their lowest
// common element in the inventory holds them, and the run is that element's children from the first holding a located
// element to the last (the choices and the add button, with whatever the draft draws between them), or the element
// itself when it holds nothing else, climbing through wrappers that hold only it. Elements under a fixed-position
// ancestor are left out: a fixed bar repeating the add button is the buy box's sticky bar setting, not its place.
//
// Refused, placing nothing (the route never guesses): no record surface, a record read from another draft file, a part
// whose located elements do not show its sample (the record and the inventory number the draft differently), no
// located element, a run holding the page's h1 or an element a part homed elsewhere is located on (two regions in one),
// and a run whose skeleton nodes do not sit side by side in one list.
//
// A flow some buyers skip (Spec 43 FR-43-25): when the run holds a control that adds to the basket and a separate control
// that opens the flow the product page opens, the node carries `keepAddToCartWithFlow: true` and the block keeps its Add to
// Cart beside the flow's opener (lib/template-piece-buybox-flow.mjs::keepsAddToCart decides, from the draft's code), and with
// `openerBeforeAddToCart: true` where the draft draws the opener first.
// What Fill needs from the node: its block name (lib/fill-shop-parts.mjs::shopPartWrites writes each part's draft value
// onto every `sgs/buybox` node; lib/fill-shop-targets.mjs::shopPartTargets adds the located elements as measuring
// targets of its calibrated part slots) and, for those targets to be read at all, a `draftRef` that resolves to a shown
// element (lib/fill-resolve.mjs refuses a node whose root finder resolves nothing). The node gets the run's element as
// its draftRef when the run is one element; a run of several elements has no one element that is the buy box's
// wrapper, so the node has no draftRef and Fill reads no look for it, which the notes say.
// What the paint conservation check needs: the node's `draftPieceParts` names each located part's draft elements (read by the
// part-look reader through data/part-locators.json), and the placed row's `run` and `missingParts` let the check after the
// pass list the run's other paint as the block's missing features (lib/template-pieces-context.mjs::piecesPaint).
import { countBlocks } from './template-pieces.mjs';
import { keepsAddToCart } from './template-piece-buybox-flow.mjs';
import { dcOf, draftLogic, inventoryIndex, locatedKeys, locateParts, nodesWithin, recordSurface, refKey, treeNodes, underFixed } from './template-piece-draft.mjs';
import { SERVED_ROOT } from './key-space.mjs';
import { instalmentsNote } from './template-piece-buybox-instalments.mjs';
import { blockSchema } from './resolve.mjs';
import { BOX_TOL } from './css-equivalence/tolerance.mjs';

// Homes that put a part outside the buy box block (the template part's title, the accordion on its own surface).
const ELSEWHERE = [ 'part', 'elsewhere' ];

// The run of draft elements holding the located elements (see the header), or null when they share no element.
export function runOf( index, located ) {
	const chains = located.map( ( k ) => index.chain( k ) );
	const common = chains[ 0 ].find( ( k ) => chains.every( ( c ) => c.includes( k ) ) );
	if ( ! common ) {
		return null;
	}
	let run = [ common ];
	const kids = index.children( common );
	const hit = kids.map( ( k, i ) => ( located.some( ( l ) => index.within( l, k ) ) ? i : -1 ) ).filter( ( i ) => i >= 0 );
	if ( ! located.includes( common ) && hit.length > 1 && hit.at( -1 ) - hit[ 0 ] + 1 < kids.length ) {
		run = kids.slice( hit[ 0 ], hit.at( -1 ) + 1 );
	}
	while ( 1 === run.length ) {
		const up = index.byKey.get( run[ 0 ] )?.parentKey;
		if ( ! index.byKey.has( up ) || 1 !== index.children( up ).length ) {
			break;
		}
		run = [ up ];
	}
	return run;
}

// The buy box's run in the inventory (see the header): { surface, index, run, notes, inRun } or { why }. `kind` is the
// record surface, `block` the block whose settings the run's parts are homed on.
export function locateRun( ctx, kind, block ) {
	const refuse = ( why ) => ( { why } );
	const surface = recordSurface( ctx.shopParts, kind );
	if ( ! surface ) {
		return refuse( `the shop parts record (build/shop-parts.json) has no ${ kind } surface; run shop-parts.mjs <client> --write` );
	}
	if ( ctx.draftFile && dcOf( surface.file ) !== dcOf( ctx.draftFile ) ) {
		return refuse( `the record's ${ kind } is read from ${ surface.file }, not from this surface's draft ${ ctx.draftFile }` );
	}
	if ( ! ctx.inventory?.elements?.length ) {
		return refuse( 'the surface has no inventory to find the buy box in' );
	}
	const index = inventoryIndex( ctx.inventory );
	const own = surface.parts.filter( ( p ) => 'setting' === p.home?.type && p.home.block === block );
	const { keys, disagree } = locateParts( index, surface, own );
	if ( disagree.length ) {
		return refuse( `the shop parts record and the surface inventory disagree on ${ disagree.join( ', ' ) }: the elements those locators land on do not show the record's sample, so the two were read from different versions of the draft (rerun shop-parts.mjs <client> --write and the surface's inventory from the same draft)` );
	}
	const all = keys.flatMap( ( k ) => k.keys );
	const located = all.filter( ( k ) => ! underFixed( index, k ) );
	const notes = all.length > located.length ? [ `${ ctx.key }: ${ all.length - located.length } located element(s) sit in a fixed bar (${ all.filter( ( k ) => ! located.includes( k ) ).join( ', ' ) }): the bar is the buy box's sticky bar setting, not its place` ] : [];
	if ( ! located.length ) {
		return refuse( `no part of the record homed on ${ block } is located on an element this inventory shows` );
	}
	const run = runOf( index, located );
	if ( ! run ) {
		return refuse( `its located elements (${ located.join( ', ' ) }) share no element in the inventory` );
	}
	const inRun = ( k ) => run.some( ( r ) => index.within( k, r ) );
	const h1 = index.elements.filter( ( e ) => 'h1' === e.tag && inRun( e.key ) ).map( ( e ) => e.key );
	const homedElsewhere = surface.parts.filter( ( p ) => ELSEWHERE.includes( p.home?.type ) ).filter( ( p ) => locatedKeys( index, p.locators, dcOf( surface.file ) ).some( inRun ) ).map( ( p ) => p.id );
	if ( h1.length || homedElsewhere.length ) {
		return refuse( `the elements holding its controls (${ run.join( ', ' ) }) also hold ${ [ ...h1.map( ( k ) => `the page's h1 ${ k }` ), ...homedElsewhere.map( ( id ) => `part ${ id }, homed outside the buy box` ) ].join( ' and ' ) }, so two regions would become one` );
	}
	return { surface, index, run, notes, inRun, parts: keys.map( ( k ) => ( { id: k.part.id, keys: k.keys.filter( ( x ) => located.includes( x ) ) } ) ).filter( ( k ) => k.keys.length ) };
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const refuse = ( why ) => ( { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: ${ why }` ] } );
	if ( countBlocks( tree, piece.block ) ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the tree already holds ${ piece.block }` ] };
	}
	const found = locateRun( ctx, piece.find?.surface, piece.block );
	if ( found.why ) {
		return refuse( found.why );
	}
	const { surface, index, run, notes, inRun } = found;
	const nodes = nodesWithin( tree, index, run );
	if ( ! nodes.length ) {
		return refuse( `no skeleton node is built from its elements (${ run.join( ', ' ) })` );
	}
	const list = nodes[ 0 ].list;
	const at = nodes.map( ( r ) => r.list.indexOf( r.node ) );
	if ( nodes.some( ( r ) => r.list !== list ) ) {
		return refuse( `its ${ nodes.length } skeleton nodes sit in ${ new Set( nodes.map( ( r ) => r.list ) ).size } different places (${ nodes.map( ( r ) => refKey( r.node ) ).join( ', ' ) })` );
	}
	const first = Math.min( ...at );
	const between = list.slice( first, Math.max( ...at ) + 1 ).filter( ( n ) => ! nodes.some( ( r ) => r.node === n ) );
	if ( between.length ) {
		return refuse( `skeleton nodes built from elements outside it stand between its nodes (${ between.map( ( n ) => refKey( n ) || n.name ).join( ', ' ) })` );
	}
	const box = { name: piece.block, attributes: {}, innerBlocks: [] };
	// The draft elements the block takes over as its located parts (the part-look reader reads each one's look straight from the
	// draft, data/part-locators.json), so the paint conservation check counts them as read; an element no part locates is not named.
	found.parts.length && ( box.draftPieceParts = Object.fromEntries( found.parts.map( ( p ) => [ p.id, p.keys.map( ( k ) => ( { tpl: k } ) ) ] ) ) );
	if ( 1 === run.length ) {
		box.draftRef = { tpl: run[ 0 ] };
	} else {
		notes.push( `${ key }: the buy box is drawn as ${ run.length } elements side by side (${ run.join( ', ' ) }), so ${ piece.block } has no draftRef and Fill reads no look for it or its located parts` );
	}
	// A flow some buyers skip: the draft's buy box draws its own add-to-basket control beside a separate control that opens the
	// product page's flow, so the block keeps its Add to Cart and shows the flow's opener beside it (Spec 43 FR-43-25).
	const keep = keepsAddToCart( ctx, found );
	if ( ! keep.keep && ! keep.silent ) {
		// A draft with no flow at all stays silent; every other decline says why, so a missing record or a second flow is not mistaken for a rule.
		notes.push( `${ key }: ${ piece.block } does not keep Add to Cart beside a flow opener: ${ keep.why }` );
	}
	if ( keep.keep ) {
		box.attributes.keepAddToCartWithFlow = true;
		notes.push( `${ key }: the buy box keeps its own add-to-basket control (${ keep.adds.join( ', ' ) }) beside the control that opens the flow "${ keep.flow }" (${ keep.openers.join( ', ' ) }), so ${ piece.block } is set to keep Add to Cart with the flow's opener (keepAddToCartWithFlow)` );
		if ( keep.openerFirst ) {
			box.attributes.openerBeforeAddToCart = true;
			notes.push( `${ key }: the draft draws the flow's opener before its add-to-basket control, so ${ piece.block } puts the opener first (openerBeforeAddToCart)` );
		}
	}
	const missingParts = Object.fromEntries( surface.parts.filter( ( p ) => 'missing' === p.home?.type ).map( ( p ) => [ p.id, locatedKeys( index, p.locators, dcOf( surface.file ) ).filter( inRun ) ] ).filter( ( [ , keys ] ) => keys.length ) );
	const missing = Object.keys( missingParts );
	missing.length && notes.push( `${ key }: inside the buy box the draft draws what ${ piece.block } has no setting for (${ missing.join( ', ' ) }); each is a missing-features row of shop-parts.json` );
	const parent = nodes[ 0 ].parent;
	const removed = nodes.map( ( r ) => refKey( r.node ) );
	list.splice( first, nodes.length, box );
	const row = { id: piece.id, block: piece.block, at: `${ parent ? refKey( parent ) || parent.name : 'the top' }, position ${ first }, in place of ${ removed.join( ', ' ) }`, run, missingParts };
	// The buy box owns the product's information column and draws the two-column layout itself (takeColumn).
	const builtIn = surface.parts.filter( ( p ) => 'built-in' === p.home?.type && p.home.block === piece.block ).flatMap( ( p ) => locatedKeys( index, p.locators, dcOf( surface.file ) ) );
	const took = takeColumn( { tree, index, run, box, builtIn } );
	if ( took.why ) {
		notes.push( `${ key }: ${ piece.block } stays inside the draft's information column: ${ took.why }` );
	} else {
		const multi = notes.findIndex( ( x ) => x.includes( 'has no draftRef and Fill reads no look' ) );
		multi >= 0 && notes.splice( multi, 1 );
		row.at = `${ took.grid }, in place of the grid holding the gallery ${ took.side } and the information column ${ took.column } (the column's ${ took.before } block(s) before the controls and ${ took.after } after them are the buy box's inner blocks; the controls were ${ removed.join( ', ' ) })`;
		row.own = took.own;
		took.drawn.length && ( row.run = [ ...run, ...took.drawn ] );
		notes.push( ...took.notes.map( ( x ) => `${ key }: ${ x }` ) );
	}
	// The instalments line the draft draws in the buy box (Bean's D-8), written where the block holds the settings.
	const inst = instalmentsNote( { L: draftLogic( ctx.draftSource ), found, priceFields: ctx.productFields?.price || [], attrExists: ctx.attrExists || ( ( a ) => Object.hasOwn( blockSchema( piece.block ) || {}, a ) ) } );
	Object.assign( box.attributes, inst.attrs );
	notes.push( ...inst.notes.map( ( x ) => `${ key }: ${ x }` ) );
	// `run` and `missingParts` (each missing-features part of the record to the elements of the run it is located on) let the
	// paint check after the pass (lib/template-pieces-context.mjs::piecesPaint) list the run's unread paint as missing features;
	// `own` (the information column, dropped without its contents) has only its own paint listed.
	return { tree, placed: [ row ], notes };
}

// The widths the inventory reads, each with the buy box's device (the per-device keys of `galleryColumnGap`).
const DEVICE = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const round2 = ( x ) => Math.round( x * 100 ) / 100;

// The space between two elements drawn side by side at a width, `a` left of `b` on one row (their tops within a pixel), or
// null when they are not side by side there.
export function sideGap( a, b, w ) {
	const A = a?.box?.[ w ];
	const B = b?.box?.[ w ];
	if ( ! A || ! B || ! a.visible?.[ w ] || ! b.visible?.[ w ] || Math.abs( A.y - B.y ) > 1 || A.x + A.w > B.x + BOX_TOL ) {
		return null;
	}
	return round2( B.x - ( A.x + A.w ) );
}

// The two-column settings of the buy box from the draft's gallery (`side`) and information column (`column`) elements:
// { attrs, notes } or { why }. `galleryColumnRatio` is the gallery's width over the column's at 1440; `galleryColumnGap` the
// space between them at each width they sit side by side (one length when those widths agree, else one per device);
// `stackBelow` `mobile` when they sit side by side from the tablet width up, `tablet` when only at the desktop width.
export function columnSettings( side, column ) {
	const widths = Object.keys( DEVICE ).map( Number ).filter( ( w ) => null !== sideGap( side, column, w ) );
	if ( ! widths.includes( 1440 ) ) {
		return { why: `the draft does not draw the gallery ${ side.key } beside the column ${ column.key } at 1440` };
	}
	const notes = widths.includes( 375 ) ? [ `the draft keeps the gallery ${ side.key } beside the column ${ column.key } at 375, where sgs/buybox stacks them (stackBelow has no phone value)` ] : [];
	const gaps = Object.fromEntries( widths.filter( ( w ) => 375 !== w ).map( ( w ) => [ DEVICE[ w ], `${ sideGap( side, column, w ) }px` ] ) );
	return {
		attrs: {
			galleryColumnRatio: round2( side.box[ 1440 ].w / column.box[ 1440 ].w ),
			galleryColumnGap: 1 === new Set( Object.values( gaps ) ).size ? gaps.desktop : gaps,
			stackBelow: widths.includes( 768 ) ? 'mobile' : 'tablet',
		},
		notes,
	};
}

// The two-column layout a grid element draws: the child holding the page's one shown h1 is the information column, the other
// shown child the gallery's side, and columnSettings reads them. { attrs, notes, side, column, sideBySide, ratios } or { why }. Fill writes the
// ratio and the gap this gives on a buy box read at the grid (lib/fill-buybox-columns.mjs).
export function columnLayout( index, grid ) {
	const shown = ( k ) => Object.values( index.byKey.get( k )?.visible || {} ).some( Boolean );
	const h1 = index.elements.filter( ( e ) => 'h1' === e.tag && SERVED_ROOT === e.template && shown( e.key ) );
	const kids = index.children( grid ).filter( shown );
	const column = 1 === h1.length ? kids.find( ( k ) => index.within( h1[ 0 ].key, k ) ) : null;
	const sides = kids.filter( ( k ) => k !== column );
	if ( ! column || 1 !== sides.length ) {
		return { why: `the grid ${ grid } does not hold the page's h1 in one child beside one other (${ kids.length } shown children)` };
	}
	const [ a, b ] = [ index.byKey.get( sides[ 0 ] ), index.byKey.get( column ) ];
	const got = columnSettings( a, b );
	// The widths the columns sit side by side at, and the gallery's share of the column at each of them above the phone.
	const sideBySide = Object.keys( DEVICE ).map( Number ).filter( ( w ) => null !== sideGap( a, b, w ) );
	const ratios = Object.fromEntries( sideBySide.filter( ( w ) => 375 !== w ).map( ( w ) => [ w, a.box[ w ].w / b.box[ w ].w ] ) );
	return got.why ? got : { ...got, side: sides[ 0 ], column, sideBySide, ratios };
}

// The buy box takes the product's information column (F-50). `sgs/buybox` draws the product's gallery beside its own controls,
// so the draft's grid holding the gallery and the information column becomes the buy box, and the column's other blocks
// become its inner blocks: those drawn before the controls (the title, the rating, the description) render above the price
// (`extrasBeforeCount`), the rest (the assurances) below the add-to-cart form.
// - The column: the lowest element holding both the controls' run and the page's one shown h1.
// - The grid: the column's parent, climbing through wrappers that hold only it; it holds one other shown element, the
//   gallery's side, drawn left of the column at 1440 (columnSettings writes the ratio, gap and stacking from their boxes).
// - The gallery side's nodes stay, just before the buy box, for the gallery piece (lib/template-piece-product-field.mjs::placeGallery).
// - The grid is the buy box's draftRef, so Fill reads the two-column wrapper's look at the block's root; the column (and a
//   wrapper holding only it) is dropped without its contents, listed in `own`.
// - A block of the column holding an element the buy box draws itself (`builtIn`: the located elements of a part the record homes
//   as built-in on the block, such as the price) is dropped, not moved: its elements are listed in `drawn` (the row's run).
// Returns { grid, side, column, before, after, own, drawn, notes } after changing `tree`, or { why } with the tree unchanged.
export function takeColumn( { tree, index, run, box, builtIn = [] } ) {
	const shown = ( k ) => Object.values( index.byKey.get( k )?.visible || {} ).some( Boolean );
	const h1 = index.elements.filter( ( e ) => 'h1' === e.tag && SERVED_ROOT === e.template && shown( e.key ) );
	if ( 1 !== h1.length ) {
		return { why: `the page has ${ h1.length } shown h1, so the product's information column is not known` };
	}
	const column = index.chain( run[ 0 ] ).find( ( k ) => index.within( h1[ 0 ].key, k ) && run.every( ( r ) => index.within( r, k ) ) );
	if ( ! column ) {
		return { why: `no element holds both the controls (${ run.join( ', ' ) }) and the page's h1 ${ h1[ 0 ].key }` };
	}
	let inGrid = column;
	let grid = index.byKey.get( column ).parentKey;
	while ( index.byKey.has( grid ) && 1 === index.children( grid ).length ) {
		inGrid = grid;
		grid = index.byKey.get( grid ).parentKey;
	}
	const sides = index.children( grid ).filter( ( k ) => k !== inGrid && shown( k ) );
	if ( ! index.byKey.has( grid ) || 1 !== sides.length ) {
		return { why: `the column ${ column } has ${ index.byKey.has( grid ) ? `${ sides.length } shown neighbours in ${ grid }` : 'no parent the inventory holds' }, not one gallery beside it` };
	}
	const settings = columnSettings( index.byKey.get( sides[ 0 ] ), index.byKey.get( inGrid ) );
	if ( settings.why ) {
		return { why: settings.why };
	}
	const all = treeNodes( tree );
	const boxAt = all.find( ( r ) => r.node === box );
	const gridAt = all.find( ( r ) => refKey( r.node ) === grid );
	const inside = nodesWithin( tree, index, [ grid ] );
	// The span of the tree the buy box replaces: the grid's own node, or the grid's outermost nodes in the buy box's list.
	if ( gridAt ? ! treeNodes( [ gridAt.node ] ).some( ( r ) => r.node === box ) : inside.some( ( r ) => r.list !== boxAt.list ) ) {
		return { why: `the grid ${ grid }'s nodes and the buy box do not sit in one place` };
	}
	const firstRun = Math.min( ...run.map( ( k ) => index.order( k ) ) );
	// The column's own content is every element under it that neither holds nor sits in the run: the children of the column and
	// of each wrapper between the column and the controls (`wrappers`, whose own paint is dropped with the column's), so a note
	// drawn beside the controls inside such a wrapper is kept, never lost with the wrapper.
	const holdsRun = ( k ) => run.some( ( r ) => index.within( r, k ) );
	const inRun = ( k ) => run.some( ( r ) => index.within( k, r ) );
	const wrappers = index.elements.map( ( e ) => e.key ).filter( ( k ) => k !== column && index.within( k, column ) && holdsRun( k ) && ! inRun( k ) );
	const kids = [ column, ...wrappers ].flatMap( ( k ) => index.children( k ) ).filter( ( k ) => ! holdsRun( k ) && ! inRun( k ) );
	const all2 = nodesWithin( tree, index, kids ).filter( ( r ) => r.node !== box );
	const drawnBy = ( r ) => builtIn.some( ( k ) => index.within( k, refKey( r.node ) ) );
	const dropped = all2.filter( drawnBy );
	const own = all2.filter( ( r ) => ! drawnBy( r ) );
	const before = own.filter( ( r ) => index.order( refKey( r.node ) ) < firstRun ).map( ( r ) => r.node );
	const after = own.filter( ( r ) => index.order( refKey( r.node ) ) > firstRun ).map( ( r ) => r.node );
	const galleryAt = nodesWithin( tree, index, [ sides[ 0 ] ] );
	// Conservation: every node the replaced span holds is kept (moved into the buy box, left for the gallery piece), dropped as what
	// the buy box draws itself, or built from an element taken away without its contents (the grid, the column, a wrapper); any
	// other would vanish, so the takeover is refused with its name.
	const keptNodes = new Set( [ ...own, ...dropped, ...galleryAt ].flatMap( ( r ) => treeNodes( [ r.node ] ).map( ( x ) => x.node ) ) );
	const takenAway = new Set( [ grid, column, inGrid, ...wrappers ] );
	const spanNodes = ( gridAt ? treeNodes( [ gridAt.node ] ) : inside.flatMap( ( r ) => treeNodes( [ r.node ] ) ) ).map( ( x ) => x.node );
	const lost = spanNodes.filter( ( n ) => n !== box && ! keptNodes.has( n ) && ! takenAway.has( refKey( n ) ) );
	if ( lost.length ) {
		return { why: `taking the column would drop ${ lost.map( ( n ) => refKey( n ) || n.name ).join( ', ' ) }, which the buy box neither keeps nor draws` };
	}
	// A mark holds the span's place while the nodes leave theirs; the gallery's nodes and the buy box then take it.
	const list = gridAt ? gridAt.list : boxAt.list;
	const mark = {};
	list.splice( list.indexOf( gridAt ? gridAt.node : list.find( ( n ) => n === box || inside.some( ( r ) => r.node === n ) ) ), 1, mark );
	for ( const r of [ ...own, ...dropped, ...galleryAt, ...inside, boxAt ] ) {
		r.list.includes( r.node ) && r.list.splice( r.list.indexOf( r.node ), 1 );
	}
	list.splice( list.indexOf( mark ), 1, ...galleryAt.map( ( r ) => r.node ), box );
	box.innerBlocks = [ ...before, ...after ];
	box.draftRef = { tpl: grid };
	// The ratio and the gap are style values: Fill reads them at the grid, the buy box's draftRef (the skeleton carries none).
	Object.assign( box.attributes, { stackBelow: settings.attrs.stackBelow }, before.length ? { extrasBeforeCount: before.length } : {} );
	return {
		grid,
		side: sides[ 0 ],
		column,
		before: before.length,
		after: after.length,
		own: [ ...new Set( [ column, inGrid, ...wrappers ] ) ],
		drawn: dropped.map( ( r ) => refKey( r.node ) ),
		notes: [ ...settings.notes, ...( dropped.length ? [ `the column's ${ dropped.map( ( r ) => refKey( r.node ) ).join( ', ' ) } hold${ 1 === dropped.length ? 's' : '' } what ${ box.name } draws itself (${ builtIn.filter( ( k ) => dropped.some( ( r ) => index.within( k, refKey( r.node ) ) ) ).join( ', ' ) }), so ${ 1 === dropped.length ? 'it is' : 'they are' } dropped, not kept beside it` ] : [] ), `${ box.name } draws the gallery beside its controls: galleryColumnRatio ${ settings.attrs.galleryColumnRatio }, galleryColumnGap ${ JSON.stringify( settings.attrs.galleryColumnGap ) }, stackBelow ${ settings.attrs.stackBelow }${ before.length ? `, extrasBeforeCount ${ before.length }` : '' }, read from the grid ${ grid }` ],
	};
}
