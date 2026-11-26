// The header's three rows, the footer's three rows and the host slot of an unwrapped element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `buildHeaderRows` places the strips beside and inside the header in its top,
// middle and bottom row (rules.headerSlots, lib/skeleton-header-slots.mjs), `buildFooterRows` builds the footer's rows
// (rules.footerSlots, lib/skeleton-footer-slots.mjs), `hostSlot` records a wrapper's draft element as the slot of the
// setting its rule names or of the part its parent absorbs it at, and `absorbInto` finds that part.
// The factory takes the writer's shared context (`ctx`) after the row book and the content settings are in `ctx.w`.
import { specHit } from './skeleton-facts.mjs';
import { bandSetting } from './fill-band.mjs';
import { absorbSlot, onlyContent } from './skeleton-absorb-wrapper.mjs';
import { overlayOf } from './skeleton-overlay-layer.mjs';
import { linkSlotLooks } from './skeleton-wrapper-link-slot.mjs';
import { styleOf } from './skeleton-paint-conservation.mjs';
import { renderedWidths } from './element-facts.mjs';
import { besideStrips, insideStrips, mergeWidthAlternatives, slotPlan } from './skeleton-header-slots.mjs';
import { buildFooterRows as footerRowsOf, sideBySide } from './skeleton-footer-slots.mjs';

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
		// it goes inside it. A main bar drawn as width alternatives (every node a row block, each shown at other widths) is
		// the widest alternative's row, holding every alternative's children in an order each alternative's own holds
		// (lib/skeleton-header-slots.mjs::mergeWidthAlternatives). Otherwise the middle row is a new keyless row: a row block
		// cannot nest, so those inside it give their children to it and their own attributes have no row to live on.
		const elOf = ( n ) => m.byKey[ n.draftRef?.tpl ] ?? null;
		const within = ( d, el ) => {
			for ( let p = d; p; p = m.byKey[ p.parentKey ] ) {
				if ( p === el ) {
					return true;
				}
			}
			return false;
		};
		const own = ( n ) => [ elOf( n ), ...( n.innerBlocks || [] ).flatMap( own ) ].filter( Boolean );
		// A node holding an absorbed part (the burger) also stands for the block the part belongs to, which the part placement
		// places at it afterwards (lib/skeleton-part-slots.mjs::placePart); that block is listed right after the node, so it keeps
		// its place in each width's order when the placement drops the node.
		const hosted = ( n ) => ( ctx.partPending || [] ).filter( ( p ) => own( n ).some( ( d ) => within( p.e, d ) ) ).map( ( p ) => m.byKey[ p.into ] ).filter( Boolean );
		const drawn = ( n ) => [ ...own( n ), ...hosted( n ) ];
		const pool = rowsIn.flatMap( ( r ) => r.innerBlocks );
		const hostOf = ( n ) => pool.find( ( o ) => o !== n && hosted( o ).includes( elOf( n ) ) ) ?? null;
		const alt = rowsIn.length === nodes.length ? mergeWidthAlternatives( rowsIn, { elOf, kidsOf: m.blockKids, shownAt: m.shownAt, hostOf, holds: ( n, el ) => drawn( n ).some( ( d ) => within( d, el ) ) } ) : null;
		const middle = alt ? alt.row : 1 === rowsIn.length ? rowsIn[ 0 ] : { name: H.rowBlock, attributes: {}, innerBlocks: [] };
		middle.innerBlocks = alt ? alt.innerBlocks : nodes.flatMap( ( n ) => ( n.name === H.rowBlock ? n.innerBlocks : [ n ] ) );
		middle.attributes[ H.slotAttribute ] = 'middle';
		// A grid row merged from width alternatives lays out, at each bar's widths, that bar's children: its column count per
		// device is the count of the bar shown there whose block children all sit side by side (structural, rules.headerSlots.columnsSetting).
		if ( alt && H.columnsSetting && 'grid' === middle.attributes.layout ) {
			const tierOf = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
			const cols = {};
			for ( const row of [ alt.row, ...alt.others ] ) {
				const el = elOf( row );
				const kids = el ? m.blockKids( el ) : [];
				if ( kids.length >= 2 && sideBySide( kids ).length === kids.length ) {
					m.shownAt( el ).forEach( ( w ) => ( cols[ tierOf[ w ] ] = kids.length ) );
				}
			}
			Object.keys( cols ).length && ( middle.attributes[ H.columnsSetting ] = cols );
		}
		// The row keeps the widest bar as its draft element; Fill reads each other bar's own layout at the widths that bar is
		// drawn at (lib/fill-read.mjs::alternateJobs), so the row's per-device layout settings follow the bar drawn there.
		const keys = ( alt?.others || [] ).filter( ( o ) => o.draftRef?.tpl ).map( ( o ) => ( { key: o.draftRef.tpl, shown: m.shownAt( elOf( o ) ) } ) );
		keys.length && ( middle.widthAlternatives = keys );
		alt?.others.forEach( ( o ) => ( middle.handover ||= [] ).push( { owner: 'behaviour', kind: 'behaviour', detail: `${ o.draftRef?.tpl }: the main bar's alternative shown at ${ m.shownAt( elOf( o ) ).join( ' and ' ) }px gives its children to the middle row; its own layout settings have no row to live on (the row reads ${ middle.draftRef?.tpl })` } ) );
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

	// An element a rule unwraps whose rule names a hostSetting (widthWrapper: the block sets its own width), or whose verdict
	// names one (heroInner: the hero's content column), is the draft element of that setting's calibrated slot on the block it
	// unwraps into, so Fill reads its width, layout and gaps there. The outermost such wrapper wins; a block whose setting
	// paints its root gains no slot.
	// A wrapper its parent absorbs (`absorbedBy`, lib/skeleton-rules.mjs::ruleFor) is the draft element of the part it names, and
	// the node lists that part in `draftAbsorbed`: the wrapper sits inside the node's own element in the draft, so Fill sums the
	// two paddings per side at that part (lib/fill-absorbed.mjs::sumAbsorbedPadding).
	function hostSlot( e, r ) {
		const setting = r.hostSetting ?? R[ r.rule ]?.hostSetting;
		const host = hosts.at( -1 );
		// A setting the wrapper's style stands for that the host decides (a mega panel's width cap and padding, per device; the verdict names the host in `hostLays`): the
		// host node's `decided`, which Fill writes (lib/fill-resolve.mjs::fillContent).
		// The verdict names the block it decides for (`hostLays`): the innermost host when that is it, else the node built for that
		// element; a verdict naming a block that was never built is reported, never merged into another block's settings.
		r.decidedNote && slotProblems.push( `${ e.key }: ${ r.decidedNote }` );
		if ( r.decided ) {
			const target = r.hostLays && host?.e?.key !== r.hostLays ? ctx.nodeOfKey[ r.hostLays ] : host?.node;
			target ? ( target.decided = { ...target.decided, ...structuredClone( r.decided ) } ) : slotProblems.push( `${ e.key }: its decided settings belong to ${ r.hostLays ?? 'the block that hosts it' }, which has no block in the proposal` );
		}
		// A layer the host takes in as its overlay (`overlay`, lib/skeleton-overlay-layer.mjs): every layer joins the host's
		// draftOverlay in drawing order, and the last one drawn (the top of the stack) is the overlay slot's draft element.
		if ( r.overlay ) {
			if ( host?.e?.key === r.overlay.node ) {
				const o = host.node.draftOverlay ?? { slot: r.overlay.slot, setting: r.overlay.setting, property: r.overlay.property, layers: [] };
				host.node.draftOverlay = { ...o, layers: [ ...o.layers, finder( e ) ] };
				host.node.draftSlots = { ...host.node.draftSlots, [ r.overlay.slot ]: finder( e ) };
				host.row.slots = { ...host.row.slots, [ r.overlay.slot ]: finder( e ) };
			}
			return;
		}
		const slot = r.absorbedBy && host?.e?.key === r.absorbedBy.node ? r.absorbedBy.slot : setting && host ? calSettings( host.block )?.[ setting ]?.slot : null;
		if ( ! slot || host.node.draftSlots?.[ slot ] ) {
			return;
		}
		host.node.draftSlots = { ...host.node.draftSlots, [ slot ]: finder( e ) };
		host.row.slots = { ...host.row.slots, [ slot ]: finder( e ) };
		r.absorbedBy && ( host.node.draftAbsorbed = [ ...( host.node.draftAbsorbed || [] ), slot ] );
	}
	// The part of the block being built that absorbs a wrapper whose looks no reader takes (lib/skeleton-absorb-wrapper.mjs):
	// { node, block, slot, settings } when the wrapper is a direct child of the block's own draft element and its only content,
	// and the block's calibration paints every look at one part no draft element holds yet; null otherwise.
	function absorbInto( e, looks ) {
		const host = hosts.at( -1 );
		if ( ! host?.e || ! host.node.draftRef || ! onlyContent( m, host.e, e ) ) {
			return null;
		}
		const at = absorbSlot( { looks, settings: calSettings( host.block ) } );
		return at && ! host.node.draftSlots?.[ at.slot ] ? { node: host.e.key, block: host.block, ...at } : null;
	}
	// The host's overlay a decoration layer is (lib/skeleton-overlay-layer.mjs::overlayOf): { node, slot, setting, property,
	// others, widthVaries } when the layer is a direct child of the block being built's own draft element and one of the layers
	// overlayOf absorbs there, null otherwise. The layers beside it are the host element's children the rules make decoration
	// layers (classified with this hook off, so the question is not asked again while it is being answered); each host
	// element is judged once.
	// A layer's style is read as the draft renders it inline (a value its script binds included: a bound transform is still a
	// transform), never only as the template declares it.
	const inlineStyle = ( k ) => Object.fromEntries( String( k.attrs?.style || '' ).split( ';' ).map( ( p ) => [ p.slice( 0, p.indexOf( ':' ) ).trim().toLowerCase(), p.slice( p.indexOf( ':' ) + 1 ).trim() ] ).filter( ( [ n, v ] ) => n && v ) );
	const overlays = new Map();
	let judging = false;
	function overlayInto( e ) {
		const host = hosts.at( -1 );
		if ( judging || ! host?.e || ! host.node.draftRef || e.parentKey !== host.e.key ) {
			return null;
		}
		if ( ! overlays.has( host.e.key ) ) {
			judging = true;
			try {
				const candidates = m.kids( host.e ).filter( ( k ) => 'decorationLayer' === cls.classify( k, host.block ).rule );
				const roleOf = ( attr ) => ctx.db?.prepare( 'SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( host.block, attr )?.role ?? null;
				overlays.set( host.e.key, overlayOf( { host: host.e, candidates, m, declaredOf: inlineStyle, settings: calSettings( host.block ) || {}, roleOf, R: R.overlayLayer } ) );
			} finally {
				judging = false;
			}
		}
		const o = overlays.get( host.e.key );
		return o.layers?.includes( e.key ) ? { node: host.e.key, slot: o.slot, setting: o.setting, property: o.property, others: o.others, widthVaries: o.widthVaries } : null;
	}
	// An element a rule unwraps that is a direct child of the block's own draft element and holds the block's children: the
	// block does not draw it, so Fill reads it as evidence of the content band's width (draftBandWrappers,
	// lib/fill-band.mjs) for a block that has a calibrated band.
	function bandWrapper( e ) {
		const host = hosts.at( -1 );
		if ( ! host?.e || e.parentKey !== host.e.key || ! host.node.draftRef || ! bandSetting( ctx.db, host.block, { settings: calSettings( host.block ) } ) ) {
			return;
		}
		host.node.draftBandWrappers = [ ...( host.node.draftBandWrappers || [] ), finder( e ) ];
	}
	// What the destination of an unwrap reads of the wrapper's look (the skeleton rules' paint conservation,
	// lib/skeleton-rules.mjs::ruleFor): { all } when the wrapper becomes its host's draft element at the free calibrated slot of the
	// verdict's host setting (hostSlot) or is the frame a part slot of the host reads (rules.heroInner.frame), { band } when a
	// band finder reads its width cap (bandWrapper), { sizing: { node, slot, looks } } when the wrapper holds one block that
	// draws the wrapper as a part of its own and the rule reads it at that part's calibrated slot (linkSizing).
	// `parentBlock` is the block the wrapper's children are built under, `declared` the wrapper's declared style.
	function unwrapReads( e, r, { parentBlock = null, declared = {} } = {} ) {
		const host = hosts.at( -1 );
		const setting = r.hostSetting ?? R[ r.rule ]?.hostSetting;
		const slot = setting && host ? calSettings( host.block )?.[ setting ]?.slot : null;
		const framed = ctx.framePending.some( ( f ) => f.frame === e );
		const band = !! host?.e && e.parentKey === host.e.key && !! host.node.draftRef && !! bandSetting( ctx.db, host.block, { settings: calSettings( host.block ) } );
		return { all: framed || ( !! slot && ! host.node.draftSlots?.[ slot ] ), band, sizing: linkSizing( e, r, parentBlock, declared ) };
	}
	// The part of the one block a dissolved wrapper holds that reads the wrapper (rules.<rule>.linkSlots,
	// lib/skeleton-wrapper-link-slot.mjs: a link round one logo is the logo's link part): { node: the block's element key, slot,
	// looks: the looks the part reads (linkSlotLooks) }, or null. The block is classified as the build classifies it (under
	// `parentBlock`), and a lone child the build dissolves too (a bare span round the logo) hands on its own lone child, since
	// the logo's node is then built straight under the link. wrapperLinkSlot checks the prediction once the children are built.
	function linkSizing( e, r, parentBlock, declared ) {
		const entries = R[ r.rule ]?.linkSlots || [];
		let kids = entries.length ? m.blockKids( e ) : [];
		for ( let depth = 0; 1 === kids.length && depth < 4 && 'unwrap' === cls.classify( kids[ 0 ], parentBlock ).action; depth++ ) {
			kids = m.blockKids( kids[ 0 ] );
		}
		const top = 1 === kids.length ? cls.classify( kids[ 0 ], parentBlock ) : null;
		const s =top && ! top.action ? entries.find( ( x ) => top.candidates?.[ 0 ]?.block === x.block ) : null;
		const settings = s ? calSettings( s.block ) || {} : {};
		const calibrated = s ? settings[ s.setting ] : null;
		if ( ! calibrated || ! [ calibrated.slot, ...( calibrated.slots || [] ) ].includes( s.slot ) ) {
			return null;
		}
		const looks = linkSlotLooks( { slot: s.slot, settings, paint: ctx.calParts?.( s.block )?.elements ?? null, declared: { ...styleOf( e.attrs?.style ), ...declared }, widths: renderedWidths( e ) } );
		return { node: kids[ 0 ].key, slot: s.slot, looks };
	}
	return { buildHeaderRows, buildFooterRows, hostSlot, bandWrapper, unwrapReads, absorbInto, overlayInto };
}
