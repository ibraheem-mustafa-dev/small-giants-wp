// The buy box of the product template (Spec 48 FR-48-60, FR-48-96): the run of skeleton nodes the draft's own buy box
// controls were built as (option pickers, labels, an add-to-basket button: a static imitation that sells nothing)
// becomes one working `sgs/buybox`, at the position of the first. Everything outside the run stays the draft's own blocks.
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
import { countBlocks } from './template-pieces.mjs';
import { keepsAddToCart } from './template-piece-buybox-flow.mjs';
import { dcOf, inventoryIndex, locatedKeys, locateParts, nodesWithin, recordSurface, refKey, underFixed } from './template-piece-draft.mjs';

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
	return { surface, index, run, notes, inRun };
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
	const missing = surface.parts.filter( ( p ) => 'missing' === p.home?.type && locatedKeys( index, p.locators, dcOf( surface.file ) ).some( inRun ) ).map( ( p ) => p.id );
	missing.length && notes.push( `${ key }: inside the buy box the draft draws what ${ piece.block } has no setting for (${ missing.join( ', ' ) }); each is a missing-features row of shop-parts.json` );
	const parent = nodes[ 0 ].parent;
	const removed = nodes.map( ( r ) => refKey( r.node ) );
	list.splice( first, nodes.length, box );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `${ parent ? refKey( parent ) || parent.name : 'the top' }, position ${ first }, in place of ${ removed.join( ', ' ) }` } ], notes };
}
