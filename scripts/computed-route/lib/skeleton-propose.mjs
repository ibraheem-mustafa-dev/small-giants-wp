// Skeleton writer step 2 (Spec 48 §3.4): the inventory (lib/skeleton-inventory.mjs) to a Fill skeleton and a proposal.
// Blocks come from lib/skeleton-classify.mjs (database evidence and the standing decisions); this file shapes them into
// nodes: units of siblings that are ONE block (a stacked run of text links is one list; a typed brand name is the logo),
// each node's content attributes, its exact draft link (a tpl finder, R-47-4) and the proposal row the review shows.
// A skeleton holds no style value (R-47-10): only content, identity and structure settings.
// The writer's closures live in the modules it shares one context (`ctx`) with: the row book and the subtrees a block draws
// (lib/skeleton-write-record.mjs), the units and their nodes (lib/skeleton-write-units.mjs), one element's settings
// (lib/skeleton-write-content.mjs) and the header and footer rows (lib/skeleton-write-slots.mjs); this file builds the
// tree from them and assembles the proposal.
import { skeletonProblems, expandSiteInfoRows } from './fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';
import { inventoryModel } from './skeleton-model.mjs';
import { listArrangement } from './skeleton-arrangement.mjs';
import { makeClassifier, overrideFor, W } from './skeleton-classify.mjs';
import { collapsePoint, childSlots, unitSlots, slideSlots } from './skeleton-child-slots.mjs';
import { itemFieldSlots } from './skeleton-item-field-slots.mjs';
import { currentSlide } from './skeleton-current-slide.mjs';
import { wrapperLinkSlot } from './skeleton-wrapper-link-slot.mjs';
import { mediaSelfSlot, partSlots, placePart, codeItemSlots, drawnSvgParts, itemSlots, chipSlots } from './skeleton-part-slots.mjs';
import { recordFor, openersFor, recordView, surfaceContext } from './skeleton-record.mjs';
import { formStepNodes, formStepContext } from './skeleton-form-steps.mjs';
import { scIfFields } from './form-scif-fields.mjs';
import { megaOpenerMenus } from './skeleton-mega-opener.mjs';
import { splitMenuOf, splitSlots } from './skeleton-split-menu.mjs';
import { surfaceFrames, openerTargets, frameSettings, surfaceRow, surfaceOpenerControls, openerListItems } from './skeleton-openers.mjs';
import { handoffOf } from './draft-tokens.mjs';
import { formHostNodes } from './skeleton-form-host.mjs';
import { fieldInputSlot } from './skeleton-form-slots.mjs';
import { linkedFormOf } from './skeleton-form-link.mjs';
import { surfaceRole } from './skeleton-surface-role.mjs';
import { flowNodes, settleFlowRows, canvasSiblings } from './skeleton-choice-flow-tree.mjs';
import { detectReferences } from './references.mjs';
import { makeRecorder } from './skeleton-write-record.mjs';
import { makeUnits } from './skeleton-write-units.mjs';
import { makeContent, skeletonSettings } from './skeleton-write-content.mjs';
import { makeSlotRows } from './skeleton-write-slots.mjs';
import { siteLinkResolver } from './draft-link.mjs';
import { noRegionProblem } from './skeleton-commerce-refusal.mjs';
import { doubleClaims } from './skeleton-double-claims.mjs';
import { DISSOLVED_LOOKS } from './skeleton-rules.mjs';
import { conservationRows, nodesByRef, paintProblems, unreadList, STRICT_DEFAULT } from './skeleton-paint-conservation.mjs';
import { absorbedSlots } from './skeleton-conserve-slots.mjs';
import { listUnclaimed } from './skeleton-widgets.mjs';
import { pairAbsorbed, pairingNotes, unpairedRecords, isSummaryRow, drawsSummaryPart } from './skeleton-part-pairing.mjs';
import { switchesFor, switchAttributes } from './skeleton-part-switch.mjs';
import { hostParts } from './skeleton-part-reads.mjs';
import { copylessKey } from './fact-key.mjs';

// A carried or decided value as text: an id as itself, a Source object as its JSON.
const shown = ( v ) => ( v && 'object' === typeof v ? JSON.stringify( v ) : String( v ) );

export const COVERAGE_WRITES = [
	'construct:dc-import',
	'construct:sc-for',
	'construct:template-element',
	'html:a',
	'html:abbr',
	'html:address',
	'html:article',
	'html:aside',
	'html:b',
	'html:bdi',
	'html:bdo',
	'html:blockquote',
	'html:br',
	'html:cite',
	'html:code',
	'html:custom-element',
	'html:data',
	'html:dd',
	'html:del',
	'html:dfn',
	'html:div',
	'html:dl',
	'html:dt',
	'html:em',
	'html:footer',
	'html:h1',
	'html:h2',
	'html:h3',
	'html:h4',
	'html:h5',
	'html:h6',
	'html:header',
	'html:hgroup',
	'html:hr',
	'html:i',
	'html:ins',
	'html:kbd',
	'html:li',
	'html:main',
	'html:mark',
	'html:nav',
	'html:ol',
	'html:p',
	'html:param',
	'html:pre',
	'html:q',
	'html:rbc',
	'html:rp',
	'html:rt',
	'html:ruby',
	'html:s',
	'html:samp',
	'html:section',
	'html:small',
	'html:span',
	'html:strong',
	'html:sub',
	'html:sup',
	'html:time',
	'html:u',
	'html:ul',
	'html:var',
	'html:wbr',
];

const count = ( list ) => list.reduce( ( a, n ) => a + 1 + count( n.innerBlocks || [] ), 0 );

// o: { inventory, facts, surface, surfaceKind, surfaceName, built (the client's own built post for this surface, from
// sites/<client>/build/skeleton/built-surfaces.json), motion (template keys whose own animation loops a translate), clientDecisions, picks ({ key: decision }), calKeys (slug ->
// calibration element keys), calSettings (slug -> the calibration's settings with their slots), states (the surface's handoff
// record states: name, how_to_reach, sc_if_tpl_ids), thresholds (the width thresholds the draft's code uses), db, openers (surface id to its surfaces.json opened_by words, read from the handoff folder when omitted), factRecord (the
// client's fact record, lib/fact-record.mjs: loaded from `facts.client` when omitted, none when the client has no record),
// formLinks (lib/skeleton-form-link.mjs::formLinksOf: the saved forms a page may link), refs (lib/references.mjs::detectReferences),
// draftLinks (lib/draft-link.mjs::draftLinksFor: the client's page map and routing that turn a draft link into a site address;
// null resolves every draft route to no address), pageMap (the page-map rows: which surface is a choice flow or a block-owned
// part, lib/skeleton-surface-role.mjs), surfaceId (the surface's surfaces.json id; the record's matching surface when omitted) and
// surfaceRoute (its surfaces.json route: the page whose page-map row may hold it as a part) }.
export function proposeSkeleton( { inventory, facts, surface, surfaceKind = null, surfaceName = null, commerce = null, products = null, built = null, motion = new Set(), clientDecisions = {}, carried = null, picks = {}, calKeys = () => [], calTags = () => ( {} ), calSettings = () => ( {} ), calParts = () => null, states = [], thresholds = [], db = null, factRecord: given = undefined, openers = undefined, rootComponent = null, formLinks = [], refs = detectReferences(), draftLinks = null, pageMap = [], surfaceId = null, surfaceRoute = null, strictPaint = STRICT_DEFAULT } ) {
	const m = inventoryModel( inventory );
	const { composition } = facts;
	const overrides = ( e, words ) => overrideFor( e, { clientDecisions, picks, facts, surface, words } );
	const rowOf = {};
	// The fact record's reading of the template (lib/skeleton-record.mjs), and the surface it places this proposal in: its
	// parent, kind and opener from `surfaces.json`, and the records whose parent is this surface (`surfaceParts`).
	const factRecord = undefined === given ? recordFor( facts ) : given;
	const view = recordView( factRecord, { openers: openers ?? ( factRecord ? openersFor( facts ) : {} ), rootComponent } );
	const scope = factRecord ? surfaceContext( view, { kind: surfaceKind, name: surfaceName } ) : null;
	m.els.forEach( ( e ) => view.checkParent( e, m.byKey[ e.parentKey ] ) );
	const formLinkOf = linkedFormOf( { view, scope, links: formLinks, refs, els: m.els, rule: facts.decisions.rules?.formLink, m } );
	// A draft link's destination as a site address (lib/draft-link.mjs), for every writer of a link setting.
	const siteLink = siteLinkResolver( draftLinks );
	// The page map's role for the surface: a choice flow, a part another row's block draws, or a part another row holds
	// (lib/skeleton-surface-role.mjs).
	const role = surfaceRole( { pageMap, id: surfaceId ?? scope?.id ?? null, kind: surfaceKind, name: surfaceName, route: surfaceRoute, m, view, postType: facts.decisions.rules?.choiceFlow?.postType } );
	const cls = makeClassifier( { m, facts, overrides, surface: { slug: surface, kind: surfaceKind, name: surfaceName, commerce, products, role, pageMap, formLinks, megaOpeners: megaOpenerMenus( draftLinks?.menuItems ), splitMenu: splitMenuOf( draftLinks?.menuItems ) }, motion, view, scope, formLinkOf, siteLink, blockOfKey: ( k ) => rowOf[ k ]?.block ?? null, unwrapReads: ( e, r, at ) => w.unwrapReads( e, r, at ), absorbInto: ( e, looks ) => w.absorbInto( e, looks ), overlayInto: ( e ) => w.overlayInto( e ) } );
	const R = facts.decisions.rules || {};
	const rows = [];
	const finder = ( e ) => m.tplFinder( e );
	// The top of the tree an element sits in: the surface root, or the root of a header strip read beside it (parentKey null).
	const rootOf = ( e ) => {
		let t = e;
		while ( m.byKey[ t.parentKey ] ) {
			t = m.byKey[ t.parentKey ];
		}
		return t;
	};
	const base = ( e, name, attributes ) => ( { name, attributes, draftRef: finder( e ), draftFingerprint: m.fingerprint( e ), innerBlocks: [] } );
	// The writer's shared context: the facts it reads, the books it fills (rows, width variants, carry and strip problems, the
	// block nodes by element key, the part elements waiting for their node, the built blocks whose children are being built
	// innermost last) and `w`, which holds the writer's functions once each module has made them.
	const w = {};
	const ctx = {
		m, facts, cls, R, view, overrides, base, finder, rootOf, inventory, carried, draftLinks, surfaceKind, surfaceId: surfaceId ?? scope?.id ?? null, calSettings, calParts, db, rows, rowOf, w, siteLink,
		widthAlternatives: [], variantsOf: new Map(), railIds: null, carryProblems: [], slotProblems: [], wordProblems: [], nodeOfKey: {}, partPending: [], framePending: [], hosts: [], stripRoots: [],
	};
	const { widthAlternatives, carryProblems, slotProblems, wordProblems, nodeOfKey, partPending, framePending, hosts } = ctx;
	Object.assign( w, makeRecorder( ctx ) );
	Object.assign( w, makeUnits( ctx ) );
	Object.assign( w, makeContent( ctx ) );
	Object.assign( w, makeSlotRows( ctx ) );
	const { record, removeSubtree, absorbSubtree, absorbWidthKids, takeVariants, unitsOf, buildBrand, buildIcons, buildList, contentAttrs, carriedAttrs, wrappedBody, timeTextAttrs, buildHeaderRows, buildFooterRows, hostSlot, bandWrapper } = w;
	Object.assign( w, { buildNode, buildChildren } );

	function buildNode( e, parentBlock ) {
		// A bare wrapper whose children are exactly one list: the list block is that wrapper (unless the client decided it, or
		// a rule makes the wrapper one block that takes its children in, such as a drawer's navigation).
		const r = cls.classify( e, parentBlock );
		const units = m.words( e ) || 'client decision' === overrides( e, '' )?.source || ( r.rule && r.absorb ) ? [] : unitsOf( e );
		if ( R.listWrapper && 1 === units.length && 'list' === units[ 0 ].type && units[ 0 ].els.length + ( units[ 0 ].heading ? 1 : 0 ) === m.blockKids( e ).length ) {
			record( e, { action: 'unwrap', rule: 'listWrapper', source: 'rule listWrapper', reason: R.listWrapper.reason, confidence: 1, candidates: [] } );
			return [ buildList( units[ 0 ].els, e, units[ 0 ].rows, units[ 0 ].heading ) ];
		}
		if ( 'remove' === r.action ) {
			record( e, r );
			removeSubtree( e, `inside a removed element (${ e.key })` );
			return null;
		}
		if ( 'unwrap' === r.action ) {
			const row = record( e, r );
			hostSlot( e, r );
			r.overlay || bandWrapper( e );
			const built = buildChildren( e, parentBlock );
			const link = wrapperLinkSlot( { rule: R[ r.rule ], e, built, calSettings, finder, expected: [].concat( r.conserve || [] ).filter( ( x ) => 'link-slot' === x?.kind ) } );
			link.notes.length && row && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...link.notes ] );
			return built;
		}
		if ( 'absorbed' === r.action ) {
			record( e, r );
			absorbSubtree( e, { block: 'the element before it', key: r.into }, r.reason, r.rule );
			// An absorbed element that is one of the absorbing block's own parts (the drawer's opener, the navigation's burger)
			// becomes the node's slot for that part once the block's node exists.
			R[ r.rule ]?.part && partPending.push( { e, into: r.into, part: R[ r.rule ].part } );
			return null;
		}
		const top = r.candidates[ 0 ];
		if ( ! top ) {
			record( e, { ...r, action: 'unresolved', reason: 'no block fits this element: decide it with skeleton.mjs decide', confidence: 0 } );
			return null;
		}
		const block = top.block;
		// A rule's attributes are the block's settings; a block that draws its children takes no words from them.
		const drawn = m.blockKids( e ).length ? ( r.absorb ? `rule ${ r.rule }` : cls.drawsChildren( block ) ) : null;
		// A rule that sets a display type (a business detail) carries the block's settings itself: no generic text attribute. A
		// verdict whose words are the element's own beside a child the block draws (a label's leading dot: `wordsOwn`) keeps them.
		// A verdict that is the element's own words drawn by the block (`drawsWords`: a lone label that is a trust bar's item) takes no generic text setting and builds no body block for them.
		const own = r.rule && ! r.wordsOwn && ( drawn || r.drawsWords || top.attributes?.displayType );
		const { a, handover, formats = [] } = own ? { a: {}, handover: [] } : contentAttrs( block, e, top );
		// A navigation block's collapse point is the width the draft shows its navigation at.
		const collapseAttr = 'nav' === e.tag ? R.navigation?.collapseAttribute?.[ block ] : null;
		const collapse = collapseAttr ? collapsePoint( { e, states, thresholds } ) : null;
		// An id the build holds (lib/skeleton-carried.mjs) wins over a decision's own value for the setting; a differing
		// decision value is never applied and the row's stale note reports it. A carry the build could not make is reported.
		const { attrs: carry, said, missing } = carriedAttrs( block, e, top );
		carryProblems.push( ...missing );
		// How the draft lays out the units the block draws (a timeline's entries in one row): the block's own setting, under the decision's.
		const arranged = listArrangement( { rule: R.listArrangement, block, items: m.blockKids( e ), box: m.box } );
		Object.assign( a, arranged, carry, null != collapse?.value ? { [ collapseAttr ]: collapse.value } : {}, top.attributes || {}, carry );
		const clash = Object.keys( carry ).filter( ( k ) => undefined !== top.attributes?.[ k ] && shown( top.attributes[ k ] ) !== shown( carry[ k ] ) );
		r.handovers ? handover.push( ...r.handovers ) : r.handover && handover.push( r.handover );
		const node = base( e, block, a );
		// A half of a menu drawn in two halves reads its outer element and bar at its own element (lib/skeleton-split-menu.mjs):
		// the far side's half, which has none, at the group holding its links (as its slots only, below).
		const splitAt = r.split ? m.byKey[ r.split.readAt ] : null;
		splitAt && splitAt !== e && Object.assign( node, { draftRef: finder( splitAt ), draftFingerprint: m.fingerprint( splitAt ) } );
		// A linked form reads nothing from the draft: the saved form's own surface holds its look (Spec 48 §2). Nor does a
		// commerce region's WooCommerce piece, which draws the region from WooCommerce; the product card inside the shop's
		// collection is read at the draft's first card, whose look it takes.
		if ( 'formLink' === r.rule || 'commerceRegion' === r.rule ) {
			delete node.draftRef;
			delete node.draftFingerprint;
		}
		// A row of chips that is the shop's category filter (rules.optionSetFilter.categoryFilter) draws that filter's own inner block.
		// The wrapper holds nothing to paint: the taxonomy filter inside it reads the chip row's look.
		if ( 'optionSetFilter' === r.rule && r.inner ) {
			const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ) } );
			node.innerBlocks = r.inner.map( copy );
			Object.assign( node.innerBlocks[ 0 ], { draftRef: finder( e ), draftFingerprint: m.fingerprint( e ) } );
			delete node.draftRef;
			delete node.draftFingerprint;
		}
		if ( 'commerceRegion' === r.rule && r.inner ) {
			const item = r.card ? m.byKey[ r.card ] : r.item ? m.byKey[ r.item ] : null;
			const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ) } );
			// The card stands for every product the loop lists (`itemTemplate`): Fill never takes one product's variant for it.
			const read = ( n ) => ( 'sgs/' === n.name.slice( 0, 4 ) && item ? { ...n, draftRef: finder( item ), draftFingerprint: m.fingerprint( item ), ...( r.item ? { itemTemplate: true } : {} ) } : n );
			const mark = ( n ) => read( { ...n, innerBlocks: n.innerBlocks.map( mark ) } );
			node.innerBlocks = r.inner.map( copy ).map( mark );
		}
		// The filter rail's groups (lib/skeleton-filter-rail.mjs): a heading reads the draft's group label (`draftKey`), and a
		// facet's filter names the site's attribute id for its slug, a carried id (lib/skeleton-carried.mjs).
		if ( 'filterRail' === r.rule && r.inner ) {
			const ids = {};
			const make = ( n ) => {
				const { draftKey, facet, ...rest } = n;
				const out = { ...rest, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( make ) };
				const at = draftKey ? m.byKey[ draftKey ] : null;
				at && Object.assign( out, { draftRef: finder( at ), draftFingerprint: m.fingerprint( at ) } );
				const hit = facet && carried?.attribute ? carried.attribute( facet ) : null;
				hit?.id && ( out.attributes.attributeId = hit.id ) && ( ids[ facet ] = hit.id );
				hit?.reason && carryProblems.push( `${ e.key }: the filter for facet ${ facet } carries no attributeId: ${ hit.reason }` );
				return out;
			};
			node.innerBlocks = r.inner.map( make );
			ctx.railIds = ids;
		}
		nodeOfKey[ e.key ] = node;
		handover.length && ( node.handover = handover );
		const clashSaid = clash.map( ( k ) => `the client decision sets ${ k } ${ shown( top.attributes[ k ] ) }, which is not applied; the build carries ${ shown( carry[ k ] ) } (${ said[ k ] })` );
		const row = record( e, r, { attributes: a, ...( Object.keys( carry ).length ? { carried: said } : {} ), ...( missing.length ? { carriedMissing: missing } : {} ), ...( clash.length ? { stale: [ r.stale, ...clashSaid ].filter( Boolean ).join( '; ' ) } : {} ) } );
		const slots = {};
		// Each half's bar at its own element, and the far side's items at its first link.
		const halves = splitAt && R.splitMenu?.slots ? splitSlots( { at: splitAt, link: splitAt !== e ? e : null, finder, settings: R.splitMenu.slots, calibrated: calSettings( block ) } ) : null;
		halves && Object.assign( slots, halves.slots );
		// The far half's outer element is the group the group's own container reads too, so the half reads its parts only
		// (lib/fill-skeleton.mjs: draftSlotsOnly): its bar gap and items, never the group's root.
		splitAt && splitAt !== e && Object.keys( halves?.slots || {} ).length && ( delete node.draftRef, delete node.draftFingerprint, node.draftSlotsOnly = true );
		halves?.notes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...halves.notes ] );
		drawnSvgParts( m.kids( e ), ( k ) => m.isPart( k ) ).forEach( ( k ) => {
			const key = calKeys( block ).filter( ( c ) => new RegExp( `(^|> )svg$` ).test( c ) ).sort( ( x, y ) => x.length - y.length )[ 0 ];
			key && ( slots[ key ] = finder( k ) );
		} );
		// A draft element that is itself the media the block draws at one inner element of the same tag (an <img> the block wraps
		// in its own root, link and picture) is that element's slot too, so the image's own settings read it (lib/skeleton-part-slots.mjs::mediaSelfSlot).
		const mediaSlot = mediaSelfSlot( { tag: e.tag, tags: calTags( block ) } );
		mediaSlot && ! slots[ mediaSlot ] && ( slots[ mediaSlot ] = finder( e ) );
		// A form field's draft control is the field's input part (lib/skeleton-form-slots.mjs).
		const inputSlot = 'formControl' === r.rule && r.absorb ? fieldInputSlot( { db, rules: R.formControl, block, calSettings, calKeys } ) : null;
		inputSlot && ( slots[ inputSlot ] = finder( e ) );
		// A block whose children are the draft's repeated units keeps their parts' look as its own settings: a closed and an
		// open unit's row, header, icon and answer are read at the calibrated children's paths (lib/skeleton-child-slots.mjs::unitSlots).
		const unitCfg = r.units ? R[ r.rule ]?.childSlots : null;
		const us = unitCfg ? unitSlots( { cfg: unitCfg, units: r.units.units, open: r.units.open, m, finder, settings: calSettings( block ), revealed: inventory.revealed || [], attrs: calParts( block )?.pathAttrs ?? null } ) : null;
		us && Object.assign( slots, us.slots );
		us?.notes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...us.notes ] );
		// An option picker's chips (rules.optionSet.chipSlots): the pill settings are read at the draft's chips.
		const chipRead = r.chips && R.optionSet?.chipSlots && db ? chipSlots( { db, block, part: R.optionSet.chipSlots.part, chips: r.chips.map( ( k ) => m.byKey[ k ] ).filter( Boolean ), finder, calibrated: calSettings( block ) } ) : null;
		chipRead && Object.assign( slots, chipRead.slots );
		chipRead?.notes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...chipRead.notes ] );
		// Items the draft's code builds (no stamped element): the first item's element, at its child-index path from the
		// draft element, is where the items' look is read (lib/skeleton-part-slots.mjs::codeItemSlots).
		// A block whose items are the draft element's repeated children reads the item look at its first item
		// (`rules.<rule>.itemSlots`, lib/skeleton-part-slots.mjs::itemSlots).
		const codeSlots = r.codeItem ? codeItemSlots( { at: r.codeItem, settings: R[ r.rule ]?.items?.slots, calibrated: calSettings( block ) } ) : r.firstItem && m.byKey[ r.firstItem ] && R[ r.rule ]?.itemSlots ? itemSlots( { finder: finder( m.byKey[ r.firstItem ] ), settings: R[ r.rule ].itemSlots, calibrated: calSettings( block ) } ) : null;
		codeSlots && Object.assign( slots, codeSlots.slots );
		// A block that styles one part of each entry (a timeline's year ring) reads that part at the draft element printing the
		// entry's field in the loop's first copy (`rules.itemFieldSlots`, lib/skeleton-item-field-slots.mjs).
		const fieldRead = itemFieldSlots( { rule: R.itemFieldSlots, db, block, rootKey: e.key, inventory, factRecord, rootComponent, calibrated: calSettings( block ), finder, byKey: m.byKey } );
		Object.assign( slots, fieldRead.slots );
		fieldRead.notes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...fieldRead.notes ] );
		// A rule whose block is the draft control itself and draws that control as one of its own parts (`rules.<rule>.selfPart`:
		// the cart a header's basket button is, whose trigger the button is) reads the control at that part's slot.
		const self = R[ r.rule ]?.selfPart && db && ! r.action ? partSlots( { db, block, cal: { settings: calSettings( block ) }, part: R[ r.rule ].selfPart, opener: e, m, finder, named: r.triggerParts ? Object.entries( R[ r.rule ].selfPartRoles || {} ).map( ( [ role, part ] ) => ( { part, element: m.byKey[ [].concat( r.triggerParts[ role ] ?? [] )[ 0 ] ] ?? null } ) ) : [] } ) : null;
		self && Object.assign( slots, self.slots );
		// The wrapper framing a hero's picture is read at the split-media part's slot once the part's own element has been placed (below).
		// The trust bar's separator glyph is the draft element of the block's separator part (rules.headerStripBar.separator).
		r.separator && R[ r.rule ]?.separator?.part && m.byKey[ r.separator ] && ( row.separator = r.separator, partPending.push( { e: m.byKey[ r.separator ], into: e.key, part: R[ r.rule ].separator.part } ) );
		r.mediaFrame && R.heroInner?.part && framePending.push( { node, row, block, frame: m.byKey[ r.mediaFrame ], part: R.heroInner.part } );
		const codeNotes = [ ...( codeSlots?.notes || [] ), ...( self?.notes || [] ), ...( r.glyphNote ? [ r.glyphNote ] : [] ) ];
		codeNotes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...codeNotes ] );
		if ( Object.keys( slots ).length ) {
			node.draftSlots = slots;
			row.slots = slots;
		}
		// A setting the rule chose from the draft's structure (a word-only item style): no styling answer of Fill changes it.
		r.decided && ( node.decided = r.decided );
		// A block whose own alternative takes over below a site option's width (the shop's filter rail becomes the theme's drawer
		// below sgs_shop_filter_drawer_breakpoint): a node field, never a block attribute. The width gate (lib/fill-width-gate.mjs)
		// writes no hide flag on it, and the site build writes the draft's breakpoint (`value`) to the option.
		r.ownAlternativeBelow && ( node.ownAlternativeBelow = { ...r.ownAlternativeBelow } );
		// The open unit's paths are read in the state the fixture's current child renders at rest (lib/fill-skeleton.mjs::skeletonNodes).
		const slotStates = Object.fromEntries( Object.entries( us?.states || {} ).filter( ( [ p ] ) => node.draftSlots?.[ p ] ) );
		Object.keys( slotStates ).length && ( node.draftSlotStates = slotStates );
		// An open unit only a state shows is read with the draft in that state (lib/fill-read.mjs::readRevealed).
		const slotReveals = Object.fromEntries( Object.entries( us?.reveals || {} ).filter( ( [ p ] ) => node.draftSlots?.[ p ] ) );
		Object.keys( slotReveals ).length && ( node.draftSlotReveals = slotReveals );
		if ( drawn ) {
			// The calibrated child slots of a block that draws its children (a nav's resting and current item link).
			const cfg = ( R.drawsChildren?.blocks || [] ).find( ( d ) => d.block === block )?.childSlots;
			const cs = childSlots( { cfg, items: m.blockKids( e ), m, finder, settings: cfg ? calSettings( block ) : {}, states } );
			Object.keys( cs.slots ).length && ( node.draftSlots = { ...node.draftSlots, ...cs.slots }, row.slots = { ...row.slots, ...cs.slots } );
			const notes = [ ...cs.notes, ...( collapse?.note ? [ collapse.note ] : [] ) ];
			notes.length && ( row.slotNotes = notes );
			absorbSubtree( e, { block, key: e.key, wordBound: top.wordBound }, drawn, r.rule || 'drawsChildren', node, parentBlock );
			// A phrasing child the rich text holds in the format its style draws (a struck-through price) is read by that format.
			formats.forEach( ( f ) => rowOf[ f.key ] && ! rowOf[ f.key ].conserve && ( rowOf[ f.key ].conserve = [ { kind: 'format', node: e.key, format: f.format, looks: [ 'text-decoration' ] } ] ) );
			// A slider draws its slides as its one child block, one per slide: each child reads its card's look at its own
			// draft slide, and Fill writes each child's words from the loop (lib/fill-list-content.mjs::listDecisions).
			const slideBlock = r.slides ? composition[ block ]?.accepts?.[ 0 ] : null;
			slideBlock && ( node.innerBlocks = r.slides.map( ( s ) => {
				const slide = base( s, slideBlock, {} );
				// Each slide's parts are read at the elements that print the loop's fields (rules.slider.slideSlots).
				const parts = slideSlots( { cfg: R.slider?.slideSlots, fields: r.slideFields, slide: s, m, entry: ( x ) => view.entry( x ), finder, settings: calSettings( slideBlock ) } );
				Object.keys( parts.slots ).length && ( slide.draftSlots = parts.slots );
				return slide;
			} ) );
			return [ node, ...takeVariants( node ) ];
		}
		if ( ! m.blockKids( e ).length && m.widthKids( e ).length && 'leaf' === composition[ block ]?.composition_role ) {
			absorbWidthKids( e, { block, key: e.key, wordBound: top.wordBound }, 'drawsChildren', node, parentBlock );
			return [ node, ...takeVariants( node ) ];
		}
		const kids = m.blockKids( e );
		const rowBlock = facts.rowBlocks.find( ( x ) => x.slug === block );
		const kidTops = rowBlock ? kids.map( ( k ) => ( { k, r: cls.classify( k, block ) } ) ) : [];
		const root = rootOf( e );
		// A Site Info row (Fill generates its icons, fill-skeleton.mjs::expandSiteInfoRows): needs selector draftRefs inside the root's own template.
		if ( rowBlock && kidTops.length && kidTops.every( ( x ) => x.r.candidates[ 0 ]?.brand ) && e.template === root.template ) {
			const sel = ( x ) => `[data-dc-tpl="${ x.tpl }"]`;
			node.draftRef = `${ root.tag }${ sel( root ) } ${ sel( e ) }`;
			node.siteInfoRow = kidTops.map( ( x ) => x.r.candidates[ 0 ].brand.slug );
			node.childRefs = Object.fromEntries( kidTops.map( ( x ) => [ x.r.candidates[ 0 ].brand.slug, sel( x.k ) ] ) );
			const targets = [ ...new Set( kids.map( ( k ) => k.attrs?.target ).filter( Boolean ) ) ];
			1 === targets.length && ( node.childAttributes = { linkTarget: targets[ 0 ] } );
			row.rowNote = `icons generated by Fill from siteInfoRow ${ JSON.stringify( node.siteInfoRow ) }`;
			kidTops.forEach( ( x ) => {
				// Fill generates each icon from the row's Site Info list, so the draft's own link is absorbed into the row.
				const kr = record( x.k, { ...x.r, action: 'absorbed', rule: 'drawsChildren', into: e.key, reason: `drawn by ${ block }: Fill generates its icons from the Site Info row` }, { attributes: contentAttrs( x.r.candidates[ 0 ].block, x.k, x.r.candidates[ 0 ] ).a, generatedBy: e.key } );
				kr.parts = m.kids( x.k ).filter( m.isPart ).map( ( p ) => p.key );
			} );
			return node;
		}
		hosts.push( { block, node, row, e } );
		node.innerBlocks = e !== m.root ? buildChildren( e, block ) : R.headerSlots && block === R.headerSlots.block ? buildHeaderRows( e, block ) : R.footerSlots && block === R.footerSlots.block ? buildFooterRows( e, block ) : buildChildren( e, block );
		// The element's own words in a block that holds its body as inner blocks (rules.wrappedWords): one body child holding them,
		// read at the same draft element (a review's text inside sgs/quote, which would otherwise print its placeholder body).
		if ( ! node.innerBlocks.length && ! r.split && ! r.drawsWords && wrappedBody( block, e ) ) {
			const W = R.wrappedWords;
			const text = skeletonSettings( facts, W.block ).text;
			text && ( node.innerBlocks = [ base( e, W.block, { [ text ]: m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : m.words( e ) } ) ] );
			text && ( row.rowNote = [ row.rowNote, `the words are its body: one ${ W.block } inside it` ].filter( Boolean ).join( '; ' ) );
		}
		// A plain wrapper (a wrapper-shell block) has no setting for words, so an element's own words beside its block children, or
		// alone, would print nowhere. They become one text child (rules.wrappedWords' block) with no draft element of its own (the
		// wrapper reads the element's look), set before the first child when the draft's source opens with the words and after the
		// last child otherwise. Where no text block can hold them, the proposal names the element in its problems.
		if ( facts.wrapperShells.includes( block ) && m.words( e ) ) {
			const text = R.wrappedWords?.block ? skeletonSettings( facts, R.wrappedWords.block ).text : null;
			if ( text ) {
				const child = { name: R.wrappedWords.block, attributes: { [ text ]: m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : m.words( e ), ...timeTextAttrs( R.wrappedWords.block, e ) }, innerBlocks: [] };
				/^<[^>]*>\s*[^<\s]/.test( e.snippet || '' ) ? node.innerBlocks.unshift( child ) : node.innerBlocks.push( child );
				row.rowNote = [ row.rowNote, `its own words are one ${ R.wrappedWords.block } inside it` ].filter( Boolean ).join( '; ' );
			} else {
				wordProblems.push( `${ e.key }: ${ block } carries the words "${ m.words( e ) }" of its own and the skeleton has no text block to hold them: they would print nowhere` );
			}
		}
		// A slider whose draft shows one item at a time (a client decision, so no `slides`) gets one slide node standing for
		// every item: the visible card is the slide's wrapper, its parts read at the elements printing the item's fields.
		const lone = ! r.slides && ! node.innerBlocks.length && ( R.slider?.blocks || [] ).some( ( b ) => b.block === block ) ? composition[ block ]?.accepts?.[ 0 ] : null;
		const cur = lone ? currentSlide( { facts, factRecord, inventory, rootKey: e.key, rootComponent, slideBlock: lone, entry: ( x ) => view.entry( x ) } ) : null;
		if ( cur ) {
			const card = m.byKey[ cur.card.key ];
			const slide = base( card, lone, {} );
			slide.itemTemplate = true;
			const parts = slideSlots( { cfg: R.slider?.slideSlots, fields: cur.slideFields, slide: card, m, entry: ( x ) => view.entry( x ), finder, settings: calSettings( lone ) } );
			parts.slots && Object.keys( parts.slots ).length > 0 && Object.assign( slide, { draftSlots: parts.slots } );
			node.innerBlocks = [ slide ];
			row.slotNotes = [ ...( row.slotNotes || [] ), ...parts.notes, `the draft shows one item at a time: ${ card.key } is the slide's wrapper and stands for every item` ];
		}
		hosts.pop();
		// An accordion item the draft shows closed at rest holds the panel content read from the draft's data (rule accordion).
		r.closedInner && ! node.innerBlocks.length && ( node.innerBlocks = r.closedInner );
		return node;
	}

	// The children of an element: its units, with each width-only child (an sc-if on a width) built as its own node beside the
	// sibling it follows in the document, so Fill's width gate can hide each branch on the other's widths.
	function buildChildren( e, parentBlock, list = undefined, withWide = ! list ) {
		const units = unitsOf( e, list );
		const build = ( u ) => ( 'accordion' === u.type ? w.buildAccordion( u.els ) : 'brand' === u.type ? buildBrand( u.els ) : 'icons' === u.type ? buildIcons( u.els, u.parent ) : 'list' === u.type ? buildList( u.els, null, u.rows, u.heading ) : buildNode( u.els[ 0 ], parentBlock ) );
		const wide = withWide ? m.widthKids( e ) : [];
		if ( ! wide.length ) {
			return units.flatMap( build ).filter( Boolean );
		}
		const after = units.map( () => [] );
		const first = [];
		let at = -1;
		m.kids( e ).filter( ( k ) => ! m.isPart( k ) ).forEach( ( k ) => {
			if ( wide.includes( k ) ) {
				( at < 0 ? first : after[ at ] ).push( k );
			} else {
				at = units.findIndex( ( u ) => u.els.includes( k ) );
			}
		} );
		const own = ( k ) => buildNode( k, parentBlock );
		return [ ...first.flatMap( own ), ...units.flatMap( ( u, i ) => [ ...[].concat( build( u ) ), ...after[ i ].flatMap( own ) ] ) ].filter( Boolean );
	}

	const rootNode = buildNode( m.root, null );
	// A choice flow's steps are composed from the record and its absorbed rows settled (lib/skeleton-choice-flow-tree.mjs); the
	// form passes never run on it (its panels' fields belong to its steps, not to an sgs/form).
	const flowNode = cls.choiceFlow && nodeOfKey[ m.root.key ]?.name === R.choiceFlow?.block ? nodeOfKey[ m.root.key ] : null;
	const flowSides = { before: [], after: [] };
	if ( flowNode ) {
		// Each step, question, result and field reads its rendered draft element, and the flow's own pieces are its slots
		// (lib/skeleton-choice-flow-refs.mjs).
		const made = flowNodes( { model: cls.choiceFlow, R: R.choiceFlow, m, view, finder, calSettings, inputSlot: ( block ) => fieldInputSlot( { db, rules: R.formControl, block, calSettings, calKeys } ) } );
		flowNode.innerBlocks = made.nodes;
		if ( Object.keys( made.slots ).length ) {
			flowNode.draftSlots = { ...flowNode.draftSlots, ...made.slots };
			rowOf[ m.root.key ] && ( rowOf[ m.root.key ].slots = { ...rowOf[ m.root.key ].slots, ...made.slots } );
		}
		made.notes.length && rowOf[ m.root.key ] && ( rowOf[ m.root.key ].slotNotes = [ ...( rowOf[ m.root.key ].slotNotes || [] ), ...made.notes ] );
		// The words the flow holds no setting for are the flow post's own blocks beside it, built by the ordinary rules.
		Object.assign( flowSides, canvasSiblings( { model: cls.choiceFlow, m, view, rows, rowOf, build: ( e ) => buildNode( e, null ) } ) );
		settleFlowRows( { model: cls.choiceFlow, R: R.choiceFlow, rows, root: m.root, block: flowNode.name, m, view } );
		// A width-only element the flow draws as one of its pieces (the summary's note where the summary collapses) is no lost alternative.
		const drawn = new Set( rows.filter( ( x ) => x.into === m.root.key && /^drawn by /.test( x.reason || '' ) && ! /per-width/.test( x.reason ) ).map( ( x ) => x.key ) );
		flowNode.handover = ( flowNode.handover || [] ).filter( ( h ) => ! drawn.has( String( h.detail ).split( ':' )[ 0 ] ) );
		! flowNode.handover.length && delete flowNode.handover;
		cls.choiceFlow.handovers.length && ( flowNode.handover = [ ...( flowNode.handover || [] ), ...cls.choiceFlow.handovers ] );
		const rootRow = rowOf[ m.root.key ];
		rootRow && cls.choiceFlow.notes.length && ( rootRow.slotNotes = [ ...( rootRow.slotNotes || [] ), ...cls.choiceFlow.notes ] );
	}
	const skeleton = flowNode ? [ ...flowSides.before, ...[].concat( rootNode || [] ), ...flowSides.after ] : formStepNodes( formHostNodes( [].concat( rootNode || [] ), { factRecord } ), { factRecord, surfaceKind, component: 'form' === surfaceKind ? view.recordOf( scope?.id )?.dc ?? null : null, ...formStepContext( { m, view, nodeOfKey, rowOf, rows, rules: R, attr: facts.attr } ) } );
	// A form's fields shown only while another field holds one value wait on it, and those the page never rendered are built
	// from the draft's template (lib/form-scif-fields.mjs); the form root's row names them.
	const scIf = 'form' === surfaceKind ? scIfFields( skeleton, { factRecord, surfaceId: scope?.id, folder: handoffOf( facts ), rules: R, has: ( b, a ) => !! facts.attr?.( b, a ) } ) : null;
	scIf?.notes.length && rowOf[ m.root.key ] && ( rowOf[ m.root.key ].slotNotes = [ ...( rowOf[ m.root.key ].slotNotes || [] ), ...scIf.notes ] );
	// The frame of each modal or flow the page map lists this surface's row as opening, placed once, a list item opening one
	// linked to its anchor, and a modal row's post kept to its dialog's inner content (lib/skeleton-openers.mjs).
	if ( R.surfaceOpener ) {
		const keyOfNode = new Map( Object.entries( nodeOfKey ).map( ( [ k, n ] ) => [ n, k ] ) );
		const id = surfaceId ?? scope?.id ?? null;
		const targets = openerTargets( { pageMap, folder: handoffOf( facts ) } );
		openerListItems( skeleton, surfaceOpenerControls( { factRecord, surfaceId: id, targets, folder: handoffOf( facts ) } ), facts.listItem );
		const framed = surfaceFrames( { tree: skeleton, targets, row: surfaceRow( { pageMap, surfaceId: id, surface, folder: handoffOf( facts ) } ), pageMap, R, factRecord, folder: handoffOf( facts ), settings: frameSettings( db, R.surfaceOpener.frame.block ), has: ( b, a ) => !! facts.attr?.( b, a ), keyOf: ( n ) => ( keyOfNode.has( n ) && m.byKey[ keyOfNode.get( n ) ] ? view.entry( m.byKey[ keyOfNode.get( n ) ] )?.template?.key ?? null : null ) } );
		framed.notes.length && rowOf[ m.root.key ] && ( rowOf[ m.root.key ].slotNotes = [ ...( rowOf[ m.root.key ].slotNotes || [] ), ...framed.notes ] );
	}
	// Each absorbed part element is its block node's draftSlots entry at the part's calibrated slot, with its children at
	// the part's sub-part slots; the block node stays where its own element stands, and the wrapper the part leaves empty is
	// dropped (lib/skeleton-part-slots.mjs).
	partPending.forEach( ( p ) => {
		const node = nodeOfKey[ p.into ];
		if ( ! node ) {
			return;
		}
		const place = placePart( { e: p.e, node, tree: skeleton, nodeOfKey, m } );
		place?.dropped && Object.assign( rowOf[ place.dropped ], { action: 'remove', reason: place.note } );
		place?.note && ( rowOf[ p.into ].slotNotes = [ ...( rowOf[ p.into ].slotNotes || [] ), place.note ] );
		if ( ! db ) {
			return;
		}
		const made = partSlots( { db, block: node.name, cal: { settings: calSettings( node.name ) }, part: p.part, opener: p.e, m, finder } );
		if ( Object.keys( made.slots ).length ) {
			node.draftSlots = { ...node.draftSlots, ...made.slots };
			rowOf[ p.into ].slots = { ...rowOf[ p.into ].slots, ...made.slots };
		}
		made.notes.length && ( rowOf[ p.into ].slotNotes = [ ...( rowOf[ p.into ].slotNotes || [] ), ...made.notes ] );
	} );
	// The frame of a hero's picture (rules.heroInner.frame) is the draft element of the split-media part's slot, in place of the
	// picture the part's own pass gave it: the frame carries the look (border, corners, shadow, ratio), the picture inside it is the media.
	framePending.forEach( ( f ) => {
		const made = db && f.frame ? partSlots( { db, block: f.block, cal: { settings: calSettings( f.block ) }, part: f.part, opener: f.frame, m, finder } ) : null;
		if ( ! made ) {
			return;
		}
		Object.keys( made.slots ).length && ( f.node.draftSlots = { ...f.node.draftSlots, ...made.slots }, f.row.slots = { ...f.row.slots, ...made.slots } );
		made.notes.length && ( f.row.slotNotes = [ ...( f.row.slotNotes || [] ), ...made.notes ] );
	} );
	// The surface's widgets (lib/skeleton-widgets.mjs): each tabs block holds one tab per control in the controls' order (the
	// draft renders only the chosen panel, so the others are empty tabs with a handover); a slider no listed block takes keeps
	// its proposal and its track's row is a missing-features row; every widget problem is a proposal problem.
	const widgets = cls.widgets?.() ?? null;
	for ( const t of widgets?.tabs ?? [] ) {
		const node = nodeOfKey[ t.host.key ];
		const shown = nodeOfKey[ t.panel.key ];
		const S = R.tabs.settings || {};
		const tab = facts.composition[ R.tabs.block ]?.accepts?.[ 0 ];
		if ( ! node || ! shown ) {
			continue;
		}
		node.innerBlocks = t.tabs.map( ( x, i ) => ( i === t.shown ? shown : { name: tab, attributes: S.label ? { [ S.label ]: x.label } : {}, innerBlocks: [], handover: [ { owner: 'content-page', kind: 'presence', detail: `tab "${ x.label }": the draft shows its panel only when it is chosen, so its content is not in the read page: add it in the tab` } ] } ) );
	}
	for ( const sl of widgets?.sliders ?? [] ) {
		sl.missing && rowOf[ sl.track.key ] && ( rowOf[ sl.track.key ].missingFeature = sl.missing );
	}
	// A surface the client already built as a post: that post's block tree is the skeleton, so every row is settled by it.
	rows.forEach( ( x ) => {
		const top = rootOf( m.byKey[ x.key ] );
		top !== m.root && ( x.strip = top.key );
	} );
	built && R.clientBuiltSurface && rows.forEach( ( x ) => Object.assign( x, { rule: 'clientBuiltSurface', builtPost: built, low: false }, 'unresolved' === x.action ? { action: null } : {} ) );
	// Paint conservation (lib/skeleton-paint-conservation.mjs): every painted draft element is read by a node or its row records
	// where its look goes. A rule's dropped rows take the rule's record (DISSOLVED_LOOKS), a removal that hands its look over takes
	// a handover, and each host's absorbed painted elements are read at the host's calibrated part slots where a slot lands on
	// them, or recorded no-part where no part of the host's calibration paints their looks (lib/skeleton-conserve-slots.mjs).
	// What is left is a proposal problem.
	rows.forEach( ( x ) => {
		const D = DISSOLVED_LOOKS[ x.rule ];
		if ( x.conserve ) {
			return;
		}
		if ( D ) {
			x.conserve = [ { ...D, rule: x.rule, ...( 'site-decision' === D.kind ? { source: built ? [ 'rule', x.rule, 'built post', built ].join( ' ' ) : [ 'rule', x.rule ].join( ' ' ) } : {} ) } ];
		} else if ( 'remove' === x.action && x.handover?.detail ) {
			x.conserve = [ { kind: 'handover', delivers: x.handover.detail } ];
		}
	} );
	const calibration = ( block ) => calSettings( block ) ?? null;
	const unread = conservationRows( { inventory, proposal: { rows }, skeleton, view, calibration } ).rows.filter( ( x ) => 'host-unread' === x.class && x.host );
	const refNodes = nodesByRef( skeleton );
	const pairProblems = [];
	for ( const hostKey of new Set( unread.map( ( x ) => x.host ) ) ) {
		const node = refNodes.get( hostKey );
		const host = m.byKey[ hostKey ];
		if ( ! node || ! host ) {
			continue;
		}
		const absorbed = unread.filter( ( x ) => x.host === hostKey ).map( ( x ) => ( { element: m.byKey[ x.key ], looks: Object.keys( x.looks ) } ) ).filter( ( a ) => a.element );
		const kidsOf = ( x ) => m.kids( x ).filter( ( k ) => ! m.isPart( k ) );
		const made = absorbedSlots( { host, node, absorbed, kids: kidsOf, finder, settings: calSettings( node.name ), tags: calTags( node.name ), block: node.name, checked: `the setting record of ${ node.name }`, leading: !! rowOf[ hostKey ]?.wordsOwn } );
		// Where no slot walk lands, the general pairing (lib/skeleton-part-pairing.mjs) decides which measured part each left
		// element is, and reads it at that part's slots; an element with several fitting parts is a problem naming them.
		const left = new Set( made.unmatched.map( ( u ) => u.key ) );
		const pairing = left.size ? pairAbsorbed( { host, absorbed: absorbed.filter( ( a ) => left.has( a.element.key ) ), kids: kidsOf, isNode: ( x ) => refNodes.has( x.key ), calibration: calParts( node.name ), finder, taken: { ...node.draftSlots, ...made.slots }, switches: switchesFor( node.name ) } ) : null;
		const slots = { ...made.slots, ...pairing?.slots };
		// A part switch a pairing used (a circle round each trailing icon is the caret's box) is a setting the node holds.
		const switched = switchAttributes( pairing );
		if ( Object.keys( switched ).length ) {
			Object.assign( node.attributes ||= {}, switched );
			rowOf[ hostKey ] && Object.assign( rowOf[ hostKey ].attributes ||= {}, switched );
		}
		if ( Object.keys( slots ).length ) {
			node.draftSlots = { ...node.draftSlots, ...slots };
			rowOf[ hostKey ] && ( rowOf[ hostKey ].slots = { ...rowOf[ hostKey ].slots, ...slots } );
		}
		made.records.forEach( ( rec, key ) => rowOf[ key ] && ( rowOf[ key ].conserve = [ rec ] ) );
		// A refused pairing is the element's record, so the conservation check lists it apart and the ledger reads why.
		unpairedRecords( pairing, node.name ).forEach( ( rec, key ) => rowOf[ key ] && ! rowOf[ key ].conserve && ( rowOf[ key ].conserve = [ rec ] ) );
		// An element that paints what an element read at the same slot paints is read there too: its row says so.
		( pairing?.siblings || [] ).forEach( ( sb ) => rowOf[ sb.key ] && ! rowOf[ sb.key ].conserve && ( rowOf[ sb.key ].conserve = [ { kind: 'absorbed', node: hostKey, slot: sb.slot, settings: sb.settings, looks: sb.looks, sameAs: sb.readBy } ] ) );
		const said = pairingNotes( pairing, node.name );
		const unmatched = made.unmatched.filter( ( u ) => ! said.paired.has( u.key ) );
		const notes = [ ...unmatched.filter( ( u ) => ! said.notes.has( u.key ) ).map( ( u ) => [ u.key, 'paints', u.looks.join( '/' ), 'which parts of', node.name, 'paint (', u.parts.join( ' | ' ), '), and no calibrated slot lands on it' ].join( ' ' ) ), ...said.notes.values() ];
		notes.length && rowOf[ hostKey ] && ( rowOf[ hostKey ].slotNotes = [ ...( rowOf[ hostKey ].slotNotes || [] ), ...notes ] );
		pairProblems.push( ...said.problems );
	}
	// The absorbed elements that paint no box (an icon that only sets a colour, a chrome row that only lays its children out) are
	// not in the conservation list above, so their part's settings were never read. Each one is paired with the measured part it
	// is, whatever that part's settings paint, and read at the part's slots; one several parts fit is said on the host's row.
	const partsOf = hostParts( { rows: new Map( rows.map( ( r ) => [ r.key, r ] ) ), isNode: ( k ) => refNodes.has( k ) } );
	for ( const [ hostKey, keys ] of partsOf ) {
		const node = refNodes.get( hostKey );
		const host = m.byKey[ hostKey ];
		const held = new Set( Object.values( node?.draftSlots || {} ).map( ( f ) => JSON.stringify( f ) ) );
		// One element stands for its copies (a menu's links, a list's items): the representative's slots are the loop's, and a
		// copy a slot already names leaves the whole loop read.
		const copies = new Map();
		for ( const e of db && node && host ? [ ...keys ].map( ( k ) => m.byKey[ k ] ).filter( ( x ) => x && ! refNodes.has( x.key ) ) : [] ) {
			copies.get( copylessKey( e.key ) )?.push( e ) ?? copies.set( copylessKey( e.key ), [ e ] );
		}
		const kidsOf = ( x ) => m.kids( x ).filter( ( k ) => 'svg' === k.tag || ! m.isPart( k ) );
		const cal = calParts( node.name );
		const extras = [ ...copies.values() ].filter( ( list ) => ! list.some( ( e ) => held.has( JSON.stringify( finder( e ) ) ) ) ).map( ( list ) => ( { element: list[ 0 ], looks: null } ) );
		// A row that is a toggle (words and a caret) is also the block's disclosure summary row: it is read at that part's slots
		// after the ordinary pairing has given it the item's link, since the summary row's own settings (the gap between its label
		// and its caret) are calibrated there only.
		const toggles = drawsSummaryPart( cal ) ? [ ...copies.values() ].filter( ( list ) => list.some( ( e ) => isSummaryRow( e, kidsOf ) ) ).map( ( list ) => ( { element: list[ 0 ], looks: null } ) ) : [];
		if ( ! extras.length && ! toggles.length ) {
			continue;
		}
		const pair = ( list, taken, summaryRows = false ) => list.length ? pairAbsorbed( { host, absorbed: list, kids: kidsOf, isNode: ( x ) => refNodes.has( x.key ), calibration: cal, finder, taken, summaryRows } ) : { slots: {}, ambiguous: [] };
		const first = pair( extras, node.draftSlots || {} );
		const second = pair( toggles, { ...node.draftSlots, ...first.slots }, true );
		const pairing = { slots: { ...first.slots, ...second.slots }, ambiguous: first.ambiguous };
		if ( Object.keys( pairing.slots ).length ) {
			node.draftSlots = { ...node.draftSlots, ...pairing.slots };
			rowOf[ hostKey ] && ( rowOf[ hostKey ].slots = { ...rowOf[ hostKey ].slots, ...pairing.slots } );
		}
		const said = pairingNotes( { ambiguous: pairing.ambiguous.filter( ( a ) => a.candidates.length > 1 ) }, node.name ).notes;
		said.size && rowOf[ hostKey ] && ( rowOf[ hostKey ].slotNotes = [ ...( rowOf[ hostKey ].slotNotes || [] ), ...said.values() ] );
	}
	const unclaimedLines = listUnclaimed( { unclaimed: widgets?.unclaimed ?? [], rows, byKey: m.byKey, drawsDisclosure: ( key ) => { const node = refNodes.get( key ); return !! node && drawsSummaryPart( calParts( node.name ) ); } } );
	// A problem both checks find (skeletonProblems and lintSkeleton each check a node's handover) is listed once.
	const problems = [ ...new Set( [ ...skeletonProblems( skeleton ), ...unclaimedLines, ...doubleClaims( skeleton, { sanctioned: ( host, child ) => !! R.wrappedWords?.block && child.name === R.wrappedWords.block && !! composition[ host.name ]?.wraps_block } ), ...carryProblems, ...slotProblems, ...wordProblems, ...( widgets?.problems ?? [] ), ...pairProblems, ...( db ? lintSkeleton( skeleton, db ) : [] ), ...[ noRegionProblem( { surface, commerce, region: cls.commerceRegion } ) ].filter( Boolean ), ...paintProblems( { inventory, proposal: { rows }, skeleton, view, calibration, strict: strictPaint } ) ] ) ];
	// The painted elements a record lists and no block reads (RECORDED-UNREAD): looks the clone does not show, named for the run's report.
	const paintUnread = unreadList( { inventory, proposal: { rows }, skeleton, view, calibration } );
	const proposal = {
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName, surfaceParts: scope?.surfaceParts ?? [], stripRoots: ctx.stripRoots, recordDisagreements: view.disagreements, recordUntranslated: view.untranslated,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W, ...( built ? { builtPost: built } : {} ),
		...( role ? { surfaceRole: { role: role.role, row: role.row.slug, ...( role.part ? { part: role.part.label } : {} ) } } : {} ),
		...( flowNode ? { choiceFlow: { steps: cls.choiceFlow.steps.length, questions: cls.choiceFlow.steps.filter( ( s ) => s.question ).length, results: cls.choiceFlow.steps.filter( ( s ) => s.result ).length, notes: cls.choiceFlow.notes } } : {} ),
		...( cls.commerceRegion ? { commerceRegion: cls.commerceRegion.note ? { note: cls.commerceRegion.note } : { key: cls.commerceRegion.key, role: cls.commerceRegion.role, block: cls.commerceRegion.block } } : {} ),
		...( cls.filterRail ? { filterRail: cls.filterRail.note ? { note: cls.filterRail.note } : { key: cls.filterRail.key, groups: cls.filterRail.groups, notes: cls.filterRail.notes, attributeIds: ctx.railIds || {} } } : {} ),
		...( cls.productTiles?.tiles.size || cls.productTiles?.notes.length ? { productTiles: { tiles: Object.fromEntries( [ ...cls.productTiles.tiles ].map( ( [ k, p ] ) => [ k, p.draftId ] ) ), notes: cls.productTiles.notes } } : {} ),
		...( cls.pictureTileGrids?.grids.size || cls.pictureTileGrids?.notes.length ? { pictureTileGrids: { grids: Object.fromEntries( [ ...cls.pictureTileGrids.grids ].map( ( [ k, x ] ) => [ k, x.tiles.length ] ) ), notes: cls.pictureTileGrids.notes } } : {} ),
		...( cls.reviewPlatforms?.regions.size || cls.reviewPlatforms?.notes.length ? { reviewPlatforms: { regions: Object.fromEntries( [ ...cls.reviewPlatforms.regions ].map( ( [ k, x ] ) => [ k, x.platform ] ) ), notes: cls.reviewPlatforms.notes } } : {} ),
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => [ 'remove', 'absorbed', 'unwrap' ].includes( r.action ) ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length, byRule: rows.reduce( ( o, r ) => ( r.rule ? { ...o, [ r.rule ]: ( o[ r.rule ] || 0 ) + 1 } : o ), {} ) },
		widthAlternatives, problems, paintUnread, rows,
	};
	return { skeleton, proposal, problems };
}
