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
import { partSlots } from './skeleton-part-slots.mjs';
import { recordFor, openersFor, recordView, surfaceContext } from './skeleton-record.mjs';
import { makeRecorder } from './skeleton-write-record.mjs';
import { makeUnits } from './skeleton-write-units.mjs';
import { makeContent } from './skeleton-write-content.mjs';
import { makeSlotRows } from './skeleton-write-slots.mjs';

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
// client's fact record, lib/fact-record.mjs: loaded from `facts.client` when omitted, none when the client has no record) }.
export function proposeSkeleton( { inventory, facts, surface, surfaceKind = null, surfaceName = null, built = null, motion = new Set(), clientDecisions = {}, carried = null, picks = {}, calKeys = () => [], calSettings = () => ( {} ), states = [], thresholds = [], db = null, factRecord: given = undefined, openers = undefined, rootComponent = null } ) {
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
	const cls = makeClassifier( { m, facts, overrides, surface: { slug: surface, kind: surfaceKind, name: surfaceName }, motion, view, scope, blockOfKey: ( k ) => rowOf[ k ]?.block ?? null } );
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
		m, facts, cls, R, view, overrides, base, finder, rootOf, inventory, carried, surfaceKind, calSettings, rows, rowOf, w,
		widthAlternatives: [], variantsOf: new Map(), carryProblems: [], slotProblems: [], nodeOfKey: {}, partPending: [], hosts: [], stripRoots: [],
	};
	const { widthAlternatives, carryProblems, slotProblems, nodeOfKey, partPending, hosts } = ctx;
	Object.assign( w, makeRecorder( ctx ) );
	Object.assign( w, makeUnits( ctx ) );
	Object.assign( w, makeContent( ctx ) );
	Object.assign( w, makeSlotRows( ctx ) );
	const { record, removeSubtree, absorbSubtree, absorbWidthKids, takeVariants, unitsOf, buildBrand, buildIcons, buildList, contentAttrs, carriedAttrs, buildHeaderRows, buildFooterRows, hostSlot } = w;
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
		Object.assign( a, carry, null != collapse?.value ? { [ collapseAttr ]: collapse.value } : {}, top.attributes || {}, carry );
		const clash = Object.keys( carry ).filter( ( k ) => undefined !== top.attributes?.[ k ] && String( top.attributes[ k ] ) !== String( carry[ k ] ) );
		r.handover && handover.push( r.handover );
		const node = base( e, block, a );
		nodeOfKey[ e.key ] = node;
		handover.length && ( node.handover = handover );
		const clashSaid = clash.map( ( k ) => `the client decision sets ${ k } ${ top.attributes[ k ] }, which is not applied; the build carries ${ carry[ k ] } (${ said[ k ] })` );
		const row = record( e, r, { attributes: a, ...( Object.keys( carry ).length ? { carried: said } : {} ), ...( missing.length ? { carriedMissing: missing } : {} ), ...( clash.length ? { stale: [ r.stale, ...clashSaid ].filter( Boolean ).join( '; ' ) } : {} ) } );
		const slots = {};
		m.kids( e ).filter( ( k ) => m.isPart( k ) && 'svg' === k.tag && k.visible[ 1440 ] ).forEach( ( k ) => {
			const key = calKeys( block ).filter( ( c ) => new RegExp( `(^|> )svg$` ).test( c ) ).sort( ( x, y ) => x.length - y.length )[ 0 ];
			key && ( slots[ key ] = finder( k ) );
		} );
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
			absorbSubtree( e, { block, key: e.key, wordBound: top.wordBound }, drawn, r.rule || 'drawsChildren', node, parentBlock );
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
		return node;
	}

	// The children of an element: its units, with each width-only child (an sc-if on a width) built as its own node beside the
	// sibling it follows in the document, so Fill's width gate can hide each branch on the other's widths.
	function buildChildren( e, parentBlock, list = undefined, withWide = ! list ) {
		const units = unitsOf( e, list );
		const build = ( u ) => ( 'brand' === u.type ? buildBrand( u.els ) : 'icons' === u.type ? buildIcons( u.els, u.parent ) : 'list' === u.type ? buildList( u.els ) : buildNode( u.els[ 0 ], parentBlock ) );
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
	const skeleton = [].concat( rootNode || [] );
	// Each absorbed part element is its block node's draftSlots entry at the part's calibrated slot, with its children at
	// the part's sub-part slots (lib/skeleton-part-slots.mjs).
	partPending.forEach( ( p ) => {
		const node = nodeOfKey[ p.into ];
		if ( ! node || ! db ) {
			return;
		}
		const made = partSlots( { db, block: node.name, cal: { settings: calSettings( node.name ) }, part: p.part, opener: p.e, m, finder } );
		if ( Object.keys( made.slots ).length ) {
			node.draftSlots = { ...node.draftSlots, ...made.slots };
			rowOf[ p.into ].slots = { ...rowOf[ p.into ].slots, ...made.slots };
		}
		made.notes.length && ( rowOf[ p.into ].slotNotes = [ ...( rowOf[ p.into ].slotNotes || [] ), ...made.notes ] );
	} );
	// A surface the client already built as a post: that post's block tree is the skeleton, so every row is settled by it.
	rows.forEach( ( x ) => {
		const top = rootOf( m.byKey[ x.key ] );
		top !== m.root && ( x.strip = top.key );
	} );
	built && R.clientBuiltSurface && rows.forEach( ( x ) => Object.assign( x, { rule: 'clientBuiltSurface', builtPost: built, low: false }, 'unresolved' === x.action ? { action: null } : {} ) );
	const problems = [ ...skeletonProblems( skeleton ), ...carryProblems, ...slotProblems, ...( db ? lintSkeleton( skeleton, db ) : [] ) ];
	const proposal = {
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName, surfaceParts: scope?.surfaceParts ?? [], stripRoots: ctx.stripRoots, recordDisagreements: view.disagreements, recordUntranslated: view.untranslated,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W, ...( built ? { builtPost: built } : {} ),
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => [ 'remove', 'absorbed', 'unwrap' ].includes( r.action ) ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length, byRule: rows.reduce( ( o, r ) => ( r.rule ? { ...o, [ r.rule ]: ( o[ r.rule ] || 0 ) + 1 } : o ), {} ) },
		widthAlternatives, problems, rows,
	};
	return { skeleton, proposal, problems };
}
