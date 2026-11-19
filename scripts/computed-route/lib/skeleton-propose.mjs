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
import { mediaSelfSlot, partSlots, placePart, codeItemSlots, drawnSvgParts, itemSlots, chipSlots } from './skeleton-part-slots.mjs';
import { recordFor, openersFor, recordView, surfaceContext } from './skeleton-record.mjs';
import { formStepNodes, formStepContext } from './skeleton-form-steps.mjs';
import { scIfFields } from './form-scif-fields.mjs';
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
// part, lib/skeleton-surface-role.mjs) and surfaceId (the surface's surfaces.json id; the record's matching surface when omitted) }.
export function proposeSkeleton( { inventory, facts, surface, surfaceKind = null, surfaceName = null, commerce = null, built = null, motion = new Set(), clientDecisions = {}, carried = null, picks = {}, calKeys = () => [], calTags = () => ( {} ), calSettings = () => ( {} ), states = [], thresholds = [], db = null, factRecord: given = undefined, openers = undefined, rootComponent = null, formLinks = [], refs = detectReferences(), draftLinks = null, pageMap = [], surfaceId = null } ) {
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
	const formLinkOf = linkedFormOf( { view, scope, links: formLinks, refs, els: m.els, rule: facts.decisions.rules?.formLink } );
	// A draft link's destination as a site address (lib/draft-link.mjs), for every writer of a link setting.
	const siteLink = siteLinkResolver( draftLinks );
	// The page map's role for the surface: a choice flow, or a part another row's block draws (lib/skeleton-surface-role.mjs).
	const role = surfaceRole( { pageMap, id: surfaceId ?? scope?.id ?? null, kind: surfaceKind, m, view, postType: facts.decisions.rules?.choiceFlow?.postType } );
	const cls = makeClassifier( { m, facts, overrides, surface: { slug: surface, kind: surfaceKind, name: surfaceName, commerce, role, pageMap }, motion, view, scope, formLinkOf, siteLink, blockOfKey: ( k ) => rowOf[ k ]?.block ?? null } );
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
		m, facts, cls, R, view, overrides, base, finder, rootOf, inventory, carried, surfaceKind, calSettings, db, rows, rowOf, w, siteLink,
		widthAlternatives: [], variantsOf: new Map(), railIds: null, carryProblems: [], slotProblems: [], wordProblems: [], nodeOfKey: {}, partPending: [], framePending: [], hosts: [], stripRoots: [],
	};
	const { widthAlternatives, carryProblems, slotProblems, wordProblems, nodeOfKey, partPending, framePending, hosts } = ctx;
	Object.assign( w, makeRecorder( ctx ) );
	Object.assign( w, makeUnits( ctx ) );
	Object.assign( w, makeContent( ctx ) );
	Object.assign( w, makeSlotRows( ctx ) );
	const { record, removeSubtree, absorbSubtree, absorbWidthKids, takeVariants, unitsOf, buildBrand, buildIcons, buildList, contentAttrs, carriedAttrs, wrappedBody, buildHeaderRows, buildFooterRows, hostSlot, bandWrapper } = w;
	Object.assign( w, { buildNode, buildChildren } );

	function buildNode( e, parentBlock ) {
		// A bare wrapper whose children are exactly one list: the list block is that wrapper (unless the client decided it, or
		// a rule makes the wrapper one block that takes its children in, such as a drawer's navigation).
		const r = cls.classify( e, parentBlock );
		const units = m.words( e ) || 'client decision' === overrides( e, '' )?.source || ( r.rule && r.absorb ) ? [] : unitsOf( e );
		if ( R.listWrapper && 1 === units.length && 'list' === units[ 0 ].type && units[ 0 ].els.length === m.blockKids( e ).length ) {
			record( e, { action: 'unwrap', rule: 'listWrapper', source: 'rule listWrapper', reason: R.listWrapper.reason, confidence: 1, candidates: [] } );
			return [ buildList( units[ 0 ].els, e ) ];
		}
		if ( 'remove' === r.action ) {
			record( e, r );
			removeSubtree( e, `inside a removed element (${ e.key })` );
			return null;
		}
		if ( 'unwrap' === r.action ) {
			record( e, r );
			hostSlot( e, r );
			bandWrapper( e );
			return buildChildren( e, parentBlock );
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
		// A rule that sets a display type (a business detail) carries the block's settings itself: no generic text attribute.
		const own = r.rule && ( drawn || top.attributes?.displayType );
		const { a, handover } = own ? { a: {}, handover: [] } : contentAttrs( block, e, top );
		// A navigation block's collapse point is the width the draft shows its navigation at.
		const collapseAttr = 'nav' === e.tag ? R.navigation?.collapseAttribute?.[ block ] : null;
		const collapse = collapseAttr ? collapsePoint( { e, states, thresholds } ) : null;
		// An id the build holds (lib/skeleton-carried.mjs) wins over a decision's own value for the setting; a differing
		// decision value is never applied and the row's stale note reports it. A carry the build could not make is reported.
		const { attrs: carry, said, missing } = carriedAttrs( block, e );
		carryProblems.push( ...missing );
		// How the draft lays out the units the block draws (a timeline's entries in one row): the block's own setting, under the decision's.
		const arranged = listArrangement( { rule: R.listArrangement, block, items: m.blockKids( e ), box: m.box } );
		Object.assign( a, arranged, carry, null != collapse?.value ? { [ collapseAttr ]: collapse.value } : {}, top.attributes || {}, carry );
		const clash = Object.keys( carry ).filter( ( k ) => undefined !== top.attributes?.[ k ] && shown( top.attributes[ k ] ) !== shown( carry[ k ] ) );
		r.handovers ? handover.push( ...r.handovers ) : r.handover && handover.push( r.handover );
		const node = base( e, block, a );
		// A linked form reads nothing from the draft: the saved form's own surface holds its look (Spec 48 §2). Nor does a
		// commerce region's WooCommerce piece, which draws the region from WooCommerce; the product card inside the shop's
		// collection is read at the draft's first card, whose look it takes.
		if ( 'formLink' === r.rule || 'commerceRegion' === r.rule ) {
			delete node.draftRef;
			delete node.draftFingerprint;
		}
		if ( 'commerceRegion' === r.rule && r.inner ) {
			const item = r.item ? m.byKey[ r.item ] : null;
			const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ) } );
			const read = ( n ) => ( 'sgs/' === n.name.slice( 0, 4 ) && item ? { ...n, draftRef: finder( item ), draftFingerprint: m.fingerprint( item ) } : n );
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
		const us = unitCfg ? unitSlots( { cfg: unitCfg, units: r.units.units, open: r.units.open, m, finder, settings: calSettings( block ) } ) : null;
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
		// A rule whose block is the draft control itself and draws that control as one of its own parts (`rules.<rule>.selfPart`:
		// the cart a header's basket button is, whose trigger the button is) reads the control at that part's slot.
		const self = R[ r.rule ]?.selfPart && db && ! r.action ? partSlots( { db, block, cal: { settings: calSettings( block ) }, part: R[ r.rule ].selfPart, opener: e, m, finder } ) : null;
		self && Object.assign( slots, self.slots );
		// The wrapper framing a hero's picture is read at the split-media part's slot once the part's own element has been placed (below).
		r.mediaFrame && R.heroInner?.part && framePending.push( { node, row, block, frame: m.byKey[ r.mediaFrame ], part: R.heroInner.part } );
		const codeNotes = [ ...( codeSlots?.notes || [] ), ...( self?.notes || [] ), ...( r.glyphNote ? [ r.glyphNote ] : [] ) ];
		codeNotes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...codeNotes ] );
		if ( Object.keys( slots ).length ) {
			node.draftSlots = slots;
			row.slots = slots;
		}
		// A setting the rule chose from the draft's structure (a word-only item style): no styling answer of Fill changes it.
		r.decided && ( node.decided = r.decided );
		// The open unit's paths are read in the state the fixture's current child renders at rest (lib/fill-skeleton.mjs::skeletonNodes).
		const slotStates = Object.fromEntries( Object.entries( us?.states || {} ).filter( ( [ p ] ) => node.draftSlots?.[ p ] ) );
		Object.keys( slotStates ).length && ( node.draftSlotStates = slotStates );
		if ( drawn ) {
			// The calibrated child slots of a block that draws its children (a nav's resting and current item link).
			const cfg = ( R.drawsChildren?.blocks || [] ).find( ( d ) => d.block === block )?.childSlots;
			const cs = childSlots( { cfg, items: m.blockKids( e ), m, finder, settings: cfg ? calSettings( block ) : {}, states } );
			Object.keys( cs.slots ).length && ( node.draftSlots = { ...node.draftSlots, ...cs.slots }, row.slots = { ...row.slots, ...cs.slots } );
			const notes = [ ...cs.notes, ...( collapse?.note ? [ collapse.note ] : [] ) ];
			notes.length && ( row.slotNotes = notes );
			absorbSubtree( e, { block, key: e.key, wordBound: top.wordBound }, drawn, r.rule || 'drawsChildren', node, parentBlock );
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
		if ( ! node.innerBlocks.length && wrappedBody( block, e ) ) {
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
				const child = { name: R.wrappedWords.block, attributes: { [ text ]: m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : m.words( e ) }, innerBlocks: [] };
				/^<[^>]*>\s*[^<\s]/.test( e.snippet || '' ) ? node.innerBlocks.unshift( child ) : node.innerBlocks.push( child );
				row.rowNote = [ row.rowNote, `its own words are one ${ R.wrappedWords.block } inside it` ].filter( Boolean ).join( '; ' );
			} else {
				wordProblems.push( `${ e.key }: ${ block } carries the words "${ m.words( e ) }" of its own and the skeleton has no text block to hold them: they would print nowhere` );
			}
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
		const build = ( u ) => ( 'accordion' === u.type ? w.buildAccordion( u.els ) : 'brand' === u.type ? buildBrand( u.els ) : 'icons' === u.type ? buildIcons( u.els, u.parent ) : 'list' === u.type ? buildList( u.els ) : buildNode( u.els[ 0 ], parentBlock ) );
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
	// the part's sub-part slots, and the block node stands in the part's wrapper beside the wrapper's other content, or
	// the wrapper the part leaves empty is dropped (lib/skeleton-part-slots.mjs).
	partPending.forEach( ( p ) => {
		const node = nodeOfKey[ p.into ];
		if ( ! node ) {
			return;
		}
		const place = placePart( { e: p.e, node, tree: skeleton, nodeOfKey, m } );
		place?.placed && ( rowOf[ p.into ].placedIn = place.placed );
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
	const problems = [ ...skeletonProblems( skeleton ), ...carryProblems, ...slotProblems, ...wordProblems, ...( widgets?.problems ?? [] ), ...( db ? lintSkeleton( skeleton, db ) : [] ) ];
	const proposal = {
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName, surfaceParts: scope?.surfaceParts ?? [], stripRoots: ctx.stripRoots, recordDisagreements: view.disagreements, recordUntranslated: view.untranslated,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W, ...( built ? { builtPost: built } : {} ),
		...( role ? { surfaceRole: { role: role.role, row: role.row.slug, ...( role.part ? { part: role.part.label } : {} ) } } : {} ),
		...( flowNode ? { choiceFlow: { steps: cls.choiceFlow.steps.length, questions: cls.choiceFlow.steps.filter( ( s ) => s.question ).length, results: cls.choiceFlow.steps.filter( ( s ) => s.result ).length, notes: cls.choiceFlow.notes } } : {} ),
		...( cls.commerceRegion ? { commerceRegion: cls.commerceRegion.note ? { note: cls.commerceRegion.note } : { key: cls.commerceRegion.key, role: cls.commerceRegion.role, block: cls.commerceRegion.block } } : {} ),
		...( cls.filterRail ? { filterRail: cls.filterRail.note ? { note: cls.filterRail.note } : { key: cls.filterRail.key, groups: cls.filterRail.groups, notes: cls.filterRail.notes, attributeIds: ctx.railIds || {} } } : {} ),
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => [ 'remove', 'absorbed', 'unwrap' ].includes( r.action ) ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length, byRule: rows.reduce( ( o, r ) => ( r.rule ? { ...o, [ r.rule ]: ( o[ r.rule ] || 0 ) + 1 } : o ), {} ) },
		widthAlternatives, problems, rows,
	};
	return { skeleton, proposal, problems };
}
