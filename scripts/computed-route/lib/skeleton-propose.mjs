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
import { makeClassifier, overrideFor, W } from './skeleton-classify.mjs';
import { collapsePoint, childSlots } from './skeleton-child-slots.mjs';
import { partSlots, placePart } from './skeleton-part-slots.mjs';
import { pairSkeletonParts } from './skeleton-part-pairing.mjs';
import { sharedElementProblems } from './skeleton-one-node.mjs';
import { holeField } from './fill-list-items.mjs';
import { templateKeyOf } from './fact-key.mjs';
import { recordFor, openersFor, recordView, surfaceContext } from './skeleton-record.mjs';
import { formStepNodes, formStepContext } from './skeleton-form-steps.mjs';
import { formHostNodes } from './skeleton-form-host.mjs';
import { hiddenFieldNodes, hiddenFieldContext } from './skeleton-hidden-fields.mjs';
import { fieldInputSlot } from './skeleton-form-slots.mjs';
import { linkedFormOf } from './skeleton-form-link.mjs';
import { surfaceRole } from './skeleton-surface-role.mjs';
import { flowNodes, settleFlowRows, canvasSiblings } from './skeleton-choice-flow-tree.mjs';
import { detectReferences } from './references.mjs';
import { makeRecorder } from './skeleton-write-record.mjs';
import { makeUnits } from './skeleton-write-units.mjs';
import { makeContent } from './skeleton-write-content.mjs';
import { noRegionProblem } from './skeleton-commerce-refusal.mjs';
import { modalFrame, modalTargets } from './skeleton-opener.mjs';
import { modalFrameNode } from './skeleton-modal-frame.mjs';
import { makeSlotRows } from './skeleton-write-slots.mjs';
import { siteLinkResolver } from './draft-link.mjs';
import { elementFacts } from './element-facts.mjs';

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

// o: { inventory, facts, surface, surfaceKind, surfaceName, motion (template keys whose own animation loops a translate), clientDecisions, picks ({ key: decision }), calKeys (slug ->
// calibration element keys), calSettings (slug -> the calibration's settings with their slots), calPaint (slug -> the calibration's default paint: element path to
// its computed style per width, in document order), calText (slug -> the part each content setting shows), states (the surface's handoff
// record states: name, how_to_reach, sc_if_tpl_ids), thresholds (the width thresholds the draft's code uses), db, openers (surface id to its surfaces.json opened_by words, read from the handoff folder when omitted), factRecord (the
// client's fact record, lib/fact-record.mjs: loaded from `facts.client` when omitted, none when the client has no record),
// formLinks (lib/skeleton-form-link.mjs::formLinksOf: the saved forms a page may link), refs (lib/references.mjs::detectReferences),
// draftLinks (lib/draft-link.mjs::draftLinksFor: the client's page map and routing that turn a draft link into a site address;
// null resolves every draft route to no address), pageMap (the page-map rows: which surface is a choice flow or a block-owned
// part, lib/skeleton-surface-role.mjs), surfaceId (the surface's surfaces.json id; the record's matching surface when omitted) and saleOf
// (component -> lib/flow-product.mjs::flowSale's answer for a choice flow drawn by that component; null sells nothing) }.
export function proposeSkeleton( { inventory, facts, surface, surfaceKind = null, surfaceName = null, commerce = null, filters = null, motion = new Set(), clientDecisions = {}, carried = null, picks = {}, calKeys = () => [], calSettings = () => ( {} ), calPaint = () => ( {} ), calText = () => ( {} ), states = [], thresholds = [], db = null, factRecord: given = undefined, openers = undefined, rootComponent = null, formLinks = [], refs = detectReferences(), draftLinks = null, pageMap = [], surfaceId = null, loops = null, scriptOf = () => null, saleOf = null } ) {
	// The fact record's reading of the template (lib/skeleton-record.mjs), and the surface it places this proposal in: its
	// parent, kind and opener from `surfaces.json`, and the records whose parent is this surface (`surfaceParts`). Every
	// skeleton rule reads an element's facts through the one reader over this view (lib/element-facts.mjs), `m.read`.
	const factRecord = undefined === given ? recordFor( facts ) : given;
	const view = recordView( factRecord, { openers: openers ?? ( factRecord ? openersFor( facts ) : {} ), rootComponent } );
	const m = inventoryModel( inventory, elementFacts( view ) );
	const { composition } = facts;
	const overrides = ( e, words ) => overrideFor( e, { clientDecisions, picks, facts, surface, words } );
	const rowOf = {};
	const scope = factRecord ? surfaceContext( view, { kind: surfaceKind, name: surfaceName, id: surfaceId } ) : null;
	m.els.forEach( ( e ) => view.checkParent( e, m.byKey[ e.parentKey ] ) );
	const formLinkOf = linkedFormOf( { view, scope, links: formLinks, refs, els: m.els, m, rule: facts.decisions.rules?.formLink } );
	// A draft link's destination as a site address (lib/draft-link.mjs), for every writer of a link setting.
	const siteLink = siteLinkResolver( draftLinks, rootComponent, m.read );
	// The page map's role for the surface: a choice flow, or a part another row's block draws (lib/skeleton-surface-role.mjs).
	const role = surfaceRole( { pageMap, id: surfaceId ?? scope?.id ?? null, kind: surfaceKind, m, view, postType: facts.decisions.rules?.choiceFlow?.postType } );
	const cls = makeClassifier( { m, facts, overrides, surface: { slug: surface, filters, kind: surfaceKind, name: surfaceName, commerce, role, pageMap, loops, formLinks, saleOf }, motion, view, scope, formLinkOf, siteLink, blockOfKey: ( k ) => rowOf[ k ]?.block ?? null } );
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
		m, facts, cls, R, view, overrides, base, finder, rootOf, inventory, carried, surfaceKind, calSettings, rows, rowOf, w, siteLink,
		widthAlternatives: [], variantsOf: new Map(), railIds: null, carryProblems: [], slotProblems: [], openedModals: new Map(), nodeOfKey: {}, partPending: [], hosts: [], stripRoots: [], unitItems: new Map(),
	};
	const { widthAlternatives, carryProblems, slotProblems, nodeOfKey, partPending, hosts } = ctx;
	Object.assign( w, makeRecorder( ctx ) );
	Object.assign( w, makeUnits( ctx ) );
	Object.assign( w, makeContent( ctx ) );
	Object.assign( w, makeSlotRows( ctx ) );
	const { record, removeSubtree, absorbSubtree, absorbWidthKids, takeVariants, unitsOf, buildBrand, buildIcons, buildList, contentAttrs, carriedAttrs, buildHeaderRows, buildFooterRows, hostSlot, ownWordsNode } = w;
	Object.assign( w, { buildNode, buildChildren } );

	function buildNode( e, parentBlock ) {
		// A bare wrapper whose children are exactly one list: the list block is that wrapper (unless the client decided it).
		const units = m.words( e ) || 'client decision' === overrides( e, '' )?.source ? [] : unitsOf( e );
		if ( R.listWrapper && 1 === units.length && 'list' === units[ 0 ].type && units[ 0 ].els.length === m.blockKids( e ).length ) {
			record( e, { action: 'unwrap', rule: 'listWrapper', source: 'rule listWrapper', reason: R.listWrapper.reason, confidence: 1, candidates: [] } );
			return [ buildList( units[ 0 ].els ) ];
		}
		const r = cls.classify( e, parentBlock );
		if ( 'remove' === r.action ) {
			record( e, r );
			removeSubtree( e, `inside a removed element (${ e.key })` );
			return null;
		}
		if ( 'unwrap' === r.action ) {
			record( e, r );
			hostSlot( e, r );
			return buildChildren( e, parentBlock );
		}
		if ( 'absorbed' === r.action ) {
			record( e, r );
			absorbSubtree( e, { block: 'the element before it', key: r.into }, r.reason, r.rule );
			// An absorbed element that is one of the absorbing block's own parts (the drawer's opener, the navigation's burger)
			// becomes the node's slot for that part once the block's node exists.
			R[ r.rule ]?.part && partPending.push( { e, into: r.into, part: R[ r.rule ].part, rule: r.rule } );
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
		// A block that draws its children still takes the element's own link (lib/skeleton-write-content.mjs::linkAttrs).
		const own = r.rule && ( drawn || top.attributes?.displayType );
		const { a, handover } = own ? ( drawn && ! top.attributes?.displayType ? w.linkAttrs( block, e, top ) : { a: {}, handover: [] } ) : contentAttrs( block, e, top );
		// A navigation block's collapse point is the width the draft shows its navigation at.
		const collapseAttr = 'nav' === e.tag ? R.navigation?.collapseAttribute?.[ block ] : null;
		const collapse = collapseAttr ? collapsePoint( { e, states, thresholds } ) : null;
		// An id the build holds (lib/skeleton-carried.mjs) wins over a decision's own value for the setting; a differing
		// decision value is never applied and the row's stale note reports it. A carry the build could not make is reported.
		const { attrs: carry, said, missing } = carriedAttrs( block, e );
		carryProblems.push( ...missing );
		Object.assign( a, carry, null != collapse?.value ? { [ collapseAttr ]: collapse.value } : {}, top.attributes || {}, carry );
		const clash = Object.keys( carry ).filter( ( k ) => undefined !== top.attributes?.[ k ] && String( top.attributes[ k ] ) !== String( carry[ k ] ) );
		r.handover && handover.push( r.handover );
		const node = base( e, block, a );
		'modalOpener' === r.rule && ctx.openedModals.set( r.opens.row.slug, r.opens );
		// A linked form reads nothing from the draft: the saved form's own surface holds its look (Spec 48 §2). Nor does a
		// commerce region's WooCommerce piece, which draws the region from WooCommerce; the product card inside the shop's
		// collection is read at the draft's first card, whose look it takes.
		const loopProducts = 'loopBlocks' === r.rule && 'products' === r.kind;
		const drawsItself = 'formLink' === r.rule || 'commerceRegion' === r.rule || 'categoryChips' === r.rule || loopProducts;
		if ( drawsItself ) {
			delete node.draftRef;
			delete node.draftFingerprint;
		}
		if ( ( 'commerceRegion' === r.rule || loopProducts || 'accordionItem' === r.rule ) && r.inner ) {
			const item = r.item ? m.byKey[ r.item ] : null;
			const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ), ...( false === n.reads ? { reads: false } : {} ), ...( n.itemKey ? { itemKey: n.itemKey } : {} ) } );
			// An SGS block in the region reads the draft's item (the shop's product card its first card, the product page's
			// heading its title; a block naming its own `itemKey`, the product page's description, that element) unless its rule
			// entry says `reads: false` (a block that draws itself from WooCommerce).
			const read = ( { reads, itemKey, ...n } ) => {
				const own = itemKey ? m.byKey[ itemKey ] : item;
				return 'sgs/' === n.name.slice( 0, 4 ) && own && false !== reads ? { ...n, draftRef: finder( own ), draftFingerprint: m.fingerprint( own ) } : n;
			};
			const mark = ( n ) => read( { ...n, innerBlocks: n.innerBlocks.map( mark ) } );
			node.innerBlocks = r.inner.map( copy ).map( mark );
		}
		// The category chips are WooCommerce's category filter (rules.categoryChips): its blocks are the rule's, read from nothing.
		if ( 'categoryChips' === r.rule && r.inner ) {
			const copy = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( copy ) } );
			node.innerBlocks = r.inner.map( copy );
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
		const clashSaid = clash.map( ( k ) => `the client decision sets ${ k } ${ top.attributes[ k ] }, which is not applied; the build carries ${ carry[ k ] } (${ said[ k ] })` );
		const row = record( e, r, { attributes: a, ...( Object.keys( carry ).length ? { carried: said } : {} ), ...( missing.length ? { carriedMissing: missing } : {} ), ...( clash.length ? { stale: [ r.stale, ...clashSaid ].filter( Boolean ).join( '; ' ) } : {} ) } );
		const slots = {};
		m.kids( e ).filter( ( k ) => m.isPart( k ) && 'svg' === k.tag && k.visible[ 1440 ] ).forEach( ( k ) => {
			const key = calKeys( block ).filter( ( c ) => new RegExp( `(^|> )svg$` ).test( c ) ).sort( ( x, y ) => x.length - y.length )[ 0 ];
			key && ( slots[ key ] = finder( k ) );
		} );
		// A form field's draft control is the field's input part (lib/skeleton-form-slots.mjs).
		const inputSlot = 'formControl' === r.rule && r.absorb ? fieldInputSlot( { db, rules: R.formControl, block, calSettings, calKeys } ) : null;
		inputSlot && ( slots[ inputSlot ] = finder( e ) );
		if ( Object.keys( slots ).length ) {
			node.draftSlots = slots;
			row.slots = slots;
		}
		if ( drawn ) {
			// The calibrated child slots of a block that draws its children (a nav's resting and current item link).
			const cfg = ( R.drawsChildren?.blocks || [] ).find( ( d ) => d.block === block )?.childSlots;
			const cs = childSlots( { cfg, items: m.blockKids( e ), m, finder, settings: cfg ? calSettings( block ) : {}, states } );
			Object.keys( cs.slots ).length && ( node.draftSlots = { ...node.draftSlots, ...cs.slots }, row.slots = { ...row.slots, ...cs.slots } );
			const notes = [ ...cs.notes, ...( collapse?.note ? [ collapse.note ] : [] ) ];
			notes.length && ( row.slotNotes = notes );
			absorbSubtree( e, { block, key: e.key, wordBound: top.wordBound, drawsItself }, drawn, r.rule || 'drawsChildren', node, parentBlock );
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
		hosts.push( { block, node, row } );
		node.innerBlocks = e !== m.root ? buildChildren( e, block ) : R.headerSlots && block === R.headerSlots.block ? buildHeaderRows( e, block ) : R.footerSlots && block === R.footerSlots.block ? buildFooterRows( e, block ) : buildChildren( e, block );
		hosts.pop();
		// The container's own words stand beside its children as a text child (lib/skeleton-write-content.mjs::ownWordsNode).
		const loose = ownWordsNode( e, block );
		loose && ( loose.leading ? node.innerBlocks.unshift( loose.node ) : node.innerBlocks.push( loose.node ) );
		loose && ( row.rowNote = [ row.rowNote, `its own words "${ Object.values( loose.node.attributes )[ 0 ] }" are the ${ loose.node.name } child ${ loose.leading ? 'before' : 'after' } its children` ].filter( Boolean ).join( '; ' ) );
		return node;
	}

	// The children of an element: its units, with each width-only child (an sc-if on a width) built as its own node beside the
	// sibling it follows in the document, so Fill's width gate can hide each branch on the other's widths.
	function buildChildren( e, parentBlock, list = undefined, withWide = ! list ) {
		const units = unitsOf( e, list );
		const build = ( u ) => ( 'brand' === u.type ? buildBrand( u.els, u.logo ) : 'icons' === u.type ? buildIcons( u.els, u.parent ) : 'list' === u.type ? buildList( u.els ) : buildNode( u.els[ 0 ], parentBlock ) );
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
	const skeleton = flowNode ? [ ...flowSides.before, ...[].concat( rootNode || [] ), ...flowSides.after ] : formStepNodes( hiddenFieldNodes( formHostNodes( [].concat( rootNode || [] ), { factRecord } ), hiddenFieldContext( { factRecord, m, view, nodeOfKey, rowOf, rules: R, attr: facts.attr, scriptOf } ) ), { factRecord, surfaceKind, component: 'form' === surfaceKind ? view.recordOf( scope?.id )?.dc ?? null : null, ...formStepContext( { m, view, nodeOfKey, rowOf, rows, rules: R, attr: facts.attr } ) } );
	// Each absorbed part element is its block node's draftSlots entry at the part's calibrated slot, with its children at
	// the part's sub-part slots; the block node stays where its own element stands, and the wrapper the part leaves empty is
	// dropped (lib/skeleton-part-slots.mjs).
	partPending.forEach( ( p ) => {
		const node = nodeOfKey[ p.into ];
		if ( ! node ) {
			return;
		}
		// A control with words of its own ("Close", not a bare glyph) gives the block's label setting for the part its rule names.
		const labelSetting = R[ p.rule ]?.labelSetting;
		const words = labelSetting ? m.words( p.e ).trim() : '';
		labelSetting && /\p{L}/u.test( words ) && facts.attr( node.name, labelSetting ) && ( node.attributes = { ...node.attributes, [ labelSetting ]: words } );
		// A logo the block draws from its own setting (rules.drawerLogo) gives that setting the attachment the build carries for the logo.
		const idSetting = R[ p.rule ]?.idSetting;
		const logoId = idSetting && facts.attr( node.name, idSetting ) ? carriedAttrs( facts.logoBlocks[ 0 ], p.e ).attrs.logoId : null;
		logoId && ( node.attributes = { ...node.attributes, [ idSetting ]: logoId } );
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
	// A modal surface's frame look (lib/skeleton-modal-frame.mjs): the `sgs/modal` frame node reads the draft's backdrop, panel and close at
	// the block's calibrated parts; Fill lifts it out of the post's tree and the site build merges it onto the page's frame by anchor.
	const frameParts = R.modalFrame ? cls.modalParts() : null;
	const frameOf = frameParts ? modalTargets( { pageMap, surfaces: view.surfaces } ).find( ( t ) => t.surface.id === scope?.id ) : null;
	if ( frameParts ) {
		const made = modalFrameNode( { db, block: R.modalFrame.block, cal: { settings: calSettings( R.modalFrame.block ) }, parts: frameParts, names: R.modalFrame.names, anchor: frameOf?.anchor ?? null, m, finder } );
		skeleton.push( made.node );
		const notes = [ ...made.notes, ...( frameOf ? [] : [ `the ${ surface } modal has no sgs_modal row in the page map, so its frame carries no anchor and no page can take its look` ] ) ];
		notes.length && rowOf[ m.root.key ] && ( rowOf[ m.root.key ].slotNotes = [ ...( rowOf[ m.root.key ].slotNotes || [] ), ...notes ] );
	}
	// Every part a block draws itself, paired with the draft element standing there (lib/skeleton-part-pairing.mjs); a slot an
	// earlier pass gave (a form field's input, the burger) stands.
	// The text fields a draft element prints: the fact record's text holes on its template (`{{ r.name }}` prints `name`).
	const fieldsOf = ( e ) => {
		const t = factRecord?.elements?.[ templateKeyOf( e.key, rootComponent ) ]?.template;
		return ( t?.holes || [] ).map( ( h ) => holeField( h, t.realTag || t.tag ) ).filter( ( f ) => f?.text ).map( ( f ) => f.name );
	};
	const partPairing = db ? pairSkeletonParts( { db, tree: skeleton, m, finder, rowOf, calSettings, calPaint, calText, fieldsOf, unitItems: ctx.unitItems, mediaSpec: R.mediaElement } ) : null;
	rows.forEach( ( x ) => {
		const top = rootOf( m.byKey[ x.key ] );
		top !== m.root && ( x.strip = top.key );
	} );
	// Each modal a control of this surface opens is framed once on the page that holds the control (lib/skeleton-opener.mjs); a
	// header, footer, drawer or other part has no page to stand a frame on, and the proposal says so.
	const openerNotes = [];
	for ( const target of ctx.openedModals.values() ) {
		if ( surfaceKind && 'page' !== surfaceKind ) {
			openerNotes.push( `the ${ target.row.slug } modal is opened from this ${ surfaceKind } surface, which stands on no page: a page that holds the modal frame is needed` );
			continue;
		}
		const frame = modalFrame( { target, carried } );
		skeleton.push( frame.node );
		frame.missing && carryProblems.push( frame.missing );
	}
	const problems = [ ...skeletonProblems( skeleton ), ...sharedElementProblems( skeleton ), ...carryProblems, ...slotProblems, ...( db ? lintSkeleton( skeleton, db ) : [] ), ...[ noRegionProblem( { surface, commerce, region: cls.commerceRegion } ) ].filter( Boolean ) ];
	// A draft sort option WooCommerce's sorting cannot express is a missing feature on its own row (lib/intake-missing.mjs).
	for ( const x of cls.commerceRegion?.toolbar?.missing || [] ) {
		rowOf[ x.key ] && ( rowOf[ x.key ].missingFeature = { line: x.line, why: x.why } );
	}
	// What a choice flow's product-option step cannot draw is a missing feature on its question's row (the flow root's when the
	// question never rendered).
	for ( const x of flowNode ? cls.choiceFlow.missing : [] ) {
		const row = rows.find( ( r ) => view.entry( m.byKey[ r.key ] )?.template.key === x.key ) ?? rowOf[ m.root.key ];
		row && ( row.missingFeature = { line: x.line, why: x.why } );
	}
	// What the filter drawer's overlay settings cannot carry is a missing feature on the drawer's root row.
	for ( const x of cls.filterDrawer?.missing || [] ) {
		Object.assign( rowOf[ x.key ] ?? {}, { missingFeature: { line: x.line, why: x.why } } );
	}
	// A popup that opens on a timer or on exit intent is a missing feature on the surface's root row (rules.timedPopup).
	const timed = cls.timedPopup();
	timed && rowOf[ m.root.key ] && ( rowOf[ m.root.key ].missingFeature = timed );
	// The Floating UI site options the draft's fixed back-to-top control and reading progress bar set (rules.backToTop.floating, rules.readingProgress): one map for the surface, applied by the site build.
	const siteOptions = Object.assign( {}, ...rows.map( ( r ) => r.siteOptions ) );
	const proposal = {
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName, surfaceParts: scope?.surfaceParts ?? [], stripRoots: ctx.stripRoots, recordDisagreements: view.disagreements, recordUntranslated: view.untranslated,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W,
		...( Object.keys( siteOptions ).length ? { siteOptions } : {} ),
		...( role ? { surfaceRole: { role: role.role, row: role.row.slug, ...( role.part ? { part: role.part.label } : {} ) } } : {} ),
		...( flowNode ? { choiceFlow: { steps: cls.choiceFlow.steps.length, questions: cls.choiceFlow.steps.filter( ( s ) => s.question ).length, results: cls.choiceFlow.steps.filter( ( s ) => s.result ).length, notes: cls.choiceFlow.notes } } : {} ),
		...( cls.commerceRegion ? { commerceRegion: cls.commerceRegion.note ? { note: cls.commerceRegion.note } : { key: cls.commerceRegion.key, role: cls.commerceRegion.role, block: cls.commerceRegion.block, ...( cls.commerceRegion.toolbar ? { toolbar: { sort: cls.commerceRegion.toolbar.sort, count: cls.commerceRegion.toolbar.count, absorbed: cls.commerceRegion.toolbar.absorb, missing: cls.commerceRegion.toolbar.missing } } : {} ) } } : {} ),
		...( cls.filterDrawer ? { filterDrawer: { key: cls.filterDrawer.key, block: cls.filterDrawer.block, attributes: cls.filterDrawer.attributes, facets: cls.filterDrawer.facets, notes: cls.filterDrawer.notes } } : {} ),
		...( cls.filterRail ? { filterRail: cls.filterRail.note ? { note: cls.filterRail.note } : { key: cls.filterRail.key, groups: cls.filterRail.groups, notes: cls.filterRail.notes, attributeIds: ctx.railIds || {} } } : {} ),
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => [ 'remove', 'absorbed', 'unwrap' ].includes( r.action ) ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length, byRule: rows.reduce( ( o, r ) => ( r.rule ? { ...o, [ r.rule ]: ( o[ r.rule ] || 0 ) + 1 } : o ), {} ) },
		...( ctx.openedModals.size ? { openedModals: [ ...ctx.openedModals.values() ].map( ( t ) => ( { slug: t.row.slug, anchor: t.anchor, surface: t.surface.id } ) ), openerNotes } : {} ),
		...( partPairing ? { partPairing } : {} ),
		widthAlternatives, problems, rows,
	};
	return { skeleton, proposal, problems };
}
