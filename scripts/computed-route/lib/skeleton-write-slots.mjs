// The header's three rows, the footer's three rows and the host slot of an unwrapped element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `buildHeaderRows` places the strips beside and inside the header in its top,
// middle and bottom row (rules.headerSlots, lib/skeleton-header-slots.mjs), `buildFooterRows` builds the footer's rows
// (rules.footerSlots, lib/skeleton-footer-slots.mjs) and `hostSlot` records a wrapper's draft element as the slot of the
// setting its rule names.
// The factory takes the writer's shared context (`ctx`) after the row book and the content settings are in `ctx.w`.
import { specHit } from './skeleton-facts.mjs';
import { besideStrips, insideStrips, slotPlan } from './skeleton-header-slots.mjs';
import { buildFooterRows as footerRowsOf } from './skeleton-footer-slots.mjs';

export function makeSlotRows( ctx ) {
	const { m, facts, cls, R, view, inventory, calSettings, finder, base, hosts, slotProblems, w } = ctx;
	const { record, removeSubtree, contentAttrs } = w;
	const declaredPosition = ( x ) => view.declared( x ).position ?? null;
	const subtree = ( x ) => [ x, ...m.blockKids( x ).flatMap( subtree ) ];
	// Whether an element holds the surface's navigation or its logo or home link (the main bar's signals).
	const holdsMain = ( x ) => subtree( x ).some( ( d ) => {
		const href = String( d.attrs?.href ?? '' );
		return 'nav' === d.tag || d.tag.endsWith( '-logo' ) || facts.logoBlocks.includes( cls.classify( d, null ).candidates?.[ 0 ]?.block ) || ( 'a' === d.tag && '' !== href && '#' !== href && !! specHit( R.homeLink, href ) );
	} );
	const emptyRow = ( slot ) => ( { name: R.headerSlots.rowBlock, attributes: { [ R.headerSlots.slotAttribute ]: slot }, innerBlocks: [] } );
	// A strip's element is the row of its slot: its descendants are proposed inside it as the row's own children.
	function buildSlotRow( el, slot ) {
		const H = R.headerSlots;
		const hit = { block: H.rowBlock, score: 1, share: 1, evidence: [ { text: `rule headerSlots: ${ H.reason }` } ] };
		const { a, handover } = contentAttrs( H.rowBlock, el, hit );
		a[ H.slotAttribute ] = slot;
		const node = base( el, H.rowBlock, a );
		handover.length && ( node.handover = handover );
		const row = record( el, { rule: 'headerSlots', source: 'rule headerSlots', reason: `a strip ${ 'top' === slot ? 'above' : 'below' } the header's main bar is its ${ slot } row`, confidence: 1, candidates: [ hit ] }, { attributes: a } );
		hosts.push( { block: H.rowBlock, node, row } );
		node.innerBlocks = w.buildChildren( el, H.rowBlock );
		hosts.pop();
		return node;
	}
	// A strip with no row to take: a header holds exactly three rows, so the second strip on a side is listed, never built.
	function leaveStrip( x ) {
		const why = `${ x.el.key }: a second strip ${ 'top' === x.side ? 'above' : 'below' } the header's main bar; the ${ x.side } row is ${ x.taken } and a header holds exactly three rows, so this strip is not proposed`;
		slotProblems.push( why );
		record( x.el, { action: 'unresolved', reason: why, confidence: 0, candidates: [] } );
		removeSubtree( x.el, `inside a strip that has no row (${ x.el.key })` );
	}
	function buildHeaderRows( e, block ) {
		const H = R.headerSlots;
		const sameParent = ( x ) => {
			const a = view.parentsOf( x );
			const b = view.parentsOf( e );
			return ! a || ! b || a.realParent === b.realParent;
		};
		const inside = insideStrips( m.blockKids( e ), { holdsMain, declared: declaredPosition } );
		const beside = besideStrips( inventory, { declared: declaredPosition, sameParent } );
		const plan = slotPlan( { beside, inside } );
		if ( ! H.slotAttribute ) {
			[ [ 'top', plan.top ], [ 'bottom', plan.bottom ], ...plan.extras.map( ( x ) => [ x.side, x.el ] ) ].filter( ( [ , x ] ) => x ).forEach( ( [ side, x ] ) => slotProblems.push( `${ x.key }: a strip ${ 'top' === side ? 'above' : 'below' } the header's main bar has no row: rules.headerSlots names no slot attribute` ) );
			return w.buildChildren( e, block );
		}
		// Only a strip beside the header that got a row is absorbed: an extra strip keeps its own surface.
		const besideKeys = new Set( [ ...beside.before, ...beside.after ].map( ( x ) => x.key ) );
		ctx.stripRoots = [ plan.top, plan.bottom ].filter( ( x ) => x && besideKeys.has( x.key ) ).map( ( x ) => x.key );
		const top = plan.top && buildSlotRow( plan.top, 'top' );
		plan.extras.forEach( leaveStrip );
		const nodes = w.buildChildren( e, block, inside.main, true );
		const bottom = plan.bottom && buildSlotRow( plan.bottom, 'bottom' );
		const rowsIn = nodes.filter( ( n ) => n.name === H.rowBlock );
		// A main bar that is itself a row block is the middle row and keeps its attributes and draft element; any node beside
		// it goes inside it. Otherwise the middle row is a new keyless row: a row block cannot nest, so those inside it give
		// their children to it and their own attributes have no row to live on.
		const middle = 1 === rowsIn.length ? rowsIn[ 0 ] : { name: H.rowBlock, attributes: {}, innerBlocks: [] };
		middle.innerBlocks = nodes.flatMap( ( n ) => ( n.name === H.rowBlock ? n.innerBlocks : [ n ] ) );
		middle.attributes[ H.slotAttribute ] = 'middle';
		return [ top || emptyRow( 'top' ), middle, bottom || emptyRow( 'bottom' ) ];
	}

	// ---- rules.footerSlots: the footer's three rows (lib/skeleton-footer-slots.mjs) ----
	// A wrapper the footer plan read through: the writer's own unwrap (with its host slot) when a rule unwraps it, else unwrapped by footerSlots.
	function unwrapThrough( x, block ) {
		const r = cls.classify( x, block );
		if ( 'unwrap' === r.action ) {
			record( x, r );
			hostSlot( x, r );
			return;
		}
		record( x, { action: 'unwrap', rule: 'footerSlots', source: 'rule footerSlots', reason: "a wrapper of the footer's stacked bands: its bands are the footer's rows", confidence: 1, candidates: [] } );
	}
	const buildFooterRows = ( e, block ) => footerRowsOf( e, block, { R, m, inventory, contentAttrs, base, record, hosts, buildChildren: w.buildChildren, buildNode: w.buildNode, slotProblems, declared: declaredPosition, setStripRoots: ( keys ) => ( ctx.stripRoots = keys ), unwrap: ( x ) => unwrapThrough( x, block ) } );

	// An element a rule unwraps whose rule names a hostSetting (widthWrapper: the block sets its own width) is the draft
	// element of that setting's calibrated slot on the block it unwraps into, so Fill reads its width, layout and gaps
	// there. The outermost such wrapper wins; a block whose setting paints its root gains no slot.
	function hostSlot( e, r ) {
		const setting = R[ r.rule ]?.hostSetting;
		const host = hosts.at( -1 );
		const slot = setting && host ? calSettings( host.block )?.[ setting ]?.slot : null;
		if ( ! slot || host.node.draftSlots?.[ slot ] ) {
			return;
		}
		host.node.draftSlots = { ...host.node.draftSlots, [ slot ]: finder( e ) };
		host.row.slots = { ...host.row.slots, [ slot ]: finder( e ) };
	}
	return { buildHeaderRows, buildFooterRows, hostSlot };
}
