// Skeleton writer step 2 (Spec 48 §3.4): the inventory (lib/skeleton-inventory.mjs) to a Fill skeleton and a proposal.
// Blocks come from lib/skeleton-classify.mjs (database evidence and the standing decisions); this file shapes them into
// nodes: units of siblings that are ONE block (a stacked run of text links is one list; a typed brand name is the logo),
// each node's content attributes, its exact draft link (a tpl finder, R-47-4) and the proposal row the review shows.
// A skeleton holds no style value (R-47-10): only content, identity and structure settings.
import { skeletonProblems, expandSiteInfoRows } from './fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';
import { brandOwnsAddress } from './brand-registry.mjs';
import { inventoryModel } from './skeleton-model.mjs';
import { makeClassifier, overrideFor, finish, W } from './skeleton-classify.mjs';
import { isMarker, isSiteInfoValue } from './skeleton-rules.mjs';
import { specHit } from './skeleton-facts.mjs';
import { besideStrips, insideStrips, slotPlan } from './skeleton-header-slots.mjs';
import { buildFooterRows as footerRowsOf } from './skeleton-footer-slots.mjs';
import { childSlots, collapsePoint } from './skeleton-child-slots.mjs';
import { partSlots } from './skeleton-part-slots.mjs';
import { recordFor, openersFor, recordView, surfaceContext } from './skeleton-record.mjs';

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
	const { composition, capsOf, enumOf } = facts;
	const minLinks = facts.decisions.structural?.linkList?.minLinks ?? 2;
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
	const record = ( e, r, extra = {} ) => {
		const top = r.candidates?.[ 0 ];
		const row = {
			order: rows.length, key: e.key, tag: e.tag, depth: e.depth, words: m.words( e ), block: top?.block ?? null, action: r.action || null, reason: r.reason || null, source: r.source || null,
			confidence: r.confidence, low: r.confidence < 0.7, stale: r.stale || null, rule: r.rule || null, ...( r.into ? { into: r.into } : {} ), ...( r.handover ? { handover: r.handover } : {} ),
			candidates: ( r.candidates || [] ).slice( 0, 5 ).map( ( c ) => ( { block: c.block, score: c.score, share: c.share, evidence: c.evidence.map( ( ev ) => ev.text ) } ) ),
			parts: m.kids( e ).filter( m.isPart ).map( ( k ) => k.key ), screenshots: e.screenshots, snippet: e.snippet, attributes: {}, ...extra,
		};
		rows.push( row );
		rowOf[ e.key ] = row;
		return row;
	};
	const removeSubtree = ( e, why ) => m.kids( e ).filter( ( k ) => ! m.isPart( k ) ).forEach( ( k ) => {
		record( k, { action: 'remove', reason: why, confidence: 1, candidates: [] } );
		removeSubtree( k, why );
	} );
	// The children of an element whose block draws them itself: each is a row absorbed into it, never a block.
	// A child carrying its own client decision is still absorbed (its block draws it), but the row says the decision no
	// longer applies, so the review shows it instead of dropping it.
	const absorbSubtree = ( e, top, why, rule, node = null, parentBlock = null ) => {
		m.blockKids( e ).forEach( ( k ) => {
			const own = overrides( k, m.words( k ) );
			const stale = 'client decision' === own?.source ? `the client decision for ${ k.key } (${ own.block || 'remove' }) no longer applies: ${ top.block } draws this element` : null;
			record( k, { action: 'absorbed', reason: `drawn by ${ top.block }: ${ why }`, confidence: 1, candidates: [], rule, into: top.key, stale } );
			absorbSubtree( k, top, why, rule, node, parentBlock );
		} );
		absorbWidthKids( e, top, rule, node, parentBlock );
	};
	// An element that renders only at some widths inside a block that draws its own content (a label "Call" shown below 768
	// beside the number shown above it) is a width variation no single setting holds: it becomes one block instance per
	// variation (FR-48-50). A variation with words is the block's own node again with those words in its text setting; any
	// other content (an icon, a different child count) is built as the sibling block it is. Fill's width gate hides each
	// instance on the other's widths. An element no instance can be made of is listed in the proposal's widthAlternatives
	// and as a handover entry on the block's node, so the review shows it and it reaches Bean.
	const widthAlternatives = [];
	const variantsOf = new Map();
	const takeVariants = ( node ) => {
		const list = variantsOf.get( node ) || [];
		variantsOf.delete( node );
		return list;
	};
	function widthVariant( k, top, node, parentBlock ) {
		const textAttr = node && m.words( k ) ? facts.firstAttrByRole( top.block, 'text-content' ) : null;
		let made = null;
		if ( textAttr && node.attributes?.[ textAttr ] ) {
			// An attribute the block's verdict set because its words are a Site Info value (the label reading the phone
			// number) is kept only when the variation's own words are that value too.
			const own = { ...node.attributes, [ textAttr ]: m.words( k ) };
			Object.entries( top.wordBound || {} ).filter( ( [ , kind ] ) => ! isSiteInfoValue( m.words( k ), kind ) ).forEach( ( [ attr ] ) => delete own[ attr ] );
			made = base( k, top.block, own );
			// Only the words vary: the variant is the same drawn element (the pill's link, its icon, its look), so Fill
			// measures it where it measures the default; `variantKey` names the words element, whose widths gate it.
			Object.assign( made, { draftRef: node.draftRef, draftFingerprint: node.draftFingerprint, variantKey: k.key }, node.draftSlots ? { draftSlots: node.draftSlots } : {} );
			record( k, { rule: 'widthVariant', source: 'rule widthVariant', reason: `${ k.key } renders only at ${ m.shownAt( k ).join( ' and ' ) }px: its words are one more ${ top.block } beside ${ top.key }, each hidden on the other's widths`, confidence: 1, candidates: [ { block: top.block, score: 1, share: 1, evidence: [] } ] }, { attributes: made.attributes } );
		} else if ( node && parentBlock ) {
			made = buildNode( k, parentBlock );
		}
		const list = [].concat( made || [] ).filter( Boolean );
		if ( ! list.length ) {
			return false;
		}
		list[ 0 ].widthShown = m.shownAt( k );
		node.widthVariants = [ ...( node.widthVariants || [] ), { key: k.key, shown: m.shownAt( k ) } ];
		variantsOf.set( node, [ ...( variantsOf.get( node ) || [] ), ...list ] );
		return true;
	}
	function absorbWidthKids( e, top, rule, node, parentBlock = null ) {
		m.widthKids( e ).forEach( ( k ) => {
			if ( widthVariant( k, top, node, parentBlock ) ) {
				return;
			}
			const at = m.shownAt( k ).join( ' and ' );
			const what = m.words( k ) ? `a label shown only at ${ at }px inside a block with one label: no setting holds a per-width label` : `an element shown only at ${ at }px inside a block that draws its own content: no setting holds a per-width alternative`;
			record( k, { action: 'absorbed', reason: `drawn by ${ top.block }: ${ what }`, confidence: 1, candidates: [], rule, into: top.key } );
			widthAlternatives.push( { key: k.key, into: top.key, block: top.block, widths: m.shownAt( k ), words: m.words( k ), reason: what } );
			node && ( node.handover ||= [] ).push( { owner: 'behaviour', kind: m.words( k ) ? 'text' : 'presence', detail: `${ k.key }${ m.words( k ) ? ` "${ m.words( k ) }"` : '' }: ${ what }` } );
			absorbSubtree( k, top, what, rule, node, parentBlock );
		} );
	}
	const finder = ( e ) => m.tplFinder( e );
	// The block nodes by their element key, and the absorbed part elements waiting for their block's node.
	const nodeOfKey = {};
	const partPending = [];
	// The top of the tree an element sits in: the surface root, or the root of a header strip read beside it (parentKey null).
	const rootOf = ( e ) => {
		let t = e;
		while ( m.byKey[ t.parentKey ] ) {
			t = m.byKey[ t.parentKey ];
		}
		return t;
	};
	const base = ( e, name, attributes ) => ( { name, attributes, draftRef: finder( e ), draftFingerprint: m.fingerprint( e ), innerBlocks: [] } );
	const attrExists = ( slug, name ) => !! facts.attr( slug, name );
	const layoutOf = ( slug, e ) => {
		const opts = attrExists( slug, 'layout' ) ? enumOf( slug, 'layout' ) || [] : [];
		const want = 'flex' === e.display && 'column' === e.flexDirection && opts.includes( 'stack' ) ? 'stack' : e.display;
		return opts.includes( want ) ? { layout: want } : {};
	};

	// ---- units: which siblings are one block ----
	const removedBy = ( e ) => cls.briefOnly( e ) || overrides( e, m.words( e ) )?.remove;
	const typedBrandRun = ( list, i ) => {
		if ( ! facts.siteName ) {
			return null;
		}
		for ( let len = 1; len <= 3 && i + len <= list.length; len++ ) {
			const run = list.slice( i, i + len );
			if ( run.every( ( k ) => m.words( k ) && 'img' !== k.tag && ! m.blockKids( k ).length ) && run.map( m.words ).join( ' ' ).toLowerCase() === facts.siteName.toLowerCase() ) {
				return run;
			}
		}
		return null;
	};
	// A list item link: words of its own, or one piece of text beside bare decorations only (a marker dot, a glyph), which
	// the list block draws as its marker. One such link alone is a pill button; two or more stacked are a list.
	const listLink = ( e ) => m.isTextLink( e ) || ( 'a' === e.tag && !! String( e.allText ?? '' ).trim() && m.blockKids( e ).every( ( k ) => ! m.blockKids( k ).length ) && m.blockKids( e ).filter( ( k ) => m.words( k ) ).length <= 1 ) || markerRow( e );
	// A bullet row that is not a link: a marker (rules.dotMarker) beside one piece of text and nothing else.
	const markerRow = ( e ) => {
		const kids = m.blockKids( e );
		const marker = ( k ) => isMarker( k, m, R.dotMarker, view );
		return 'a' !== e.tag && ! m.words( e ) && kids.some( marker ) && 1 === kids.filter( ( k ) => ! marker( k ) ).length && kids.every( ( k ) => marker( k ) || ( m.words( k ) && ! m.blockKids( k ).length ) );
	};
	// A run of list links: stacked one above the next, or every child of a grid (a list laid out in columns).
	const linkRun = ( list, i, parent = null ) => {
		const span = [];
		for ( let j = i; j < list.length && ( listLink( list[ j ] ) || removedBy( list[ j ] ) ); j++ ) {
			span.push( list[ j ] );
		}
		while ( span.length && removedBy( span[ span.length - 1 ] ) ) {
			span.pop();
		}
		const links = span.filter( ( k ) => ! removedBy( k ) );
		const gridList = 'grid' === parent?.display && span.length === list.length;
		return links.length >= minLinks && ( m.stacked( links ) || gridList ) && ! removedBy( span[ 0 ] ) ? span : [];
	};
	const unitsOf = ( e, list = m.blockKids( e ) ) => {
		const out = [];
		for ( let i = 0; i < list.length; ) {
			const brand = typedBrandRun( list, i );
			const icons = brand ? [] : cls.iconRun( list, i, e );
			const run = brand || icons.length ? [] : linkRun( list, i, e );
			if ( brand ) {
				out.push( { type: 'brand', els: brand } );
				i += brand.length;
			} else if ( icons.length ) {
				out.push( { type: 'icons', els: icons, parent: e } );
				i += icons.length;
			} else if ( run.length ) {
				out.push( { type: 'list', els: run } );
				i += run.length;
			} else {
				out.push( { type: 'single', els: [ list[ i ] ] } );
				i++;
			}
		}
		return out;
	};

	// ---- blocks ----
	const logoHandover = { owner: 'site-info', kind: 'presence', detail: 'the logo image: a logo block\'s image setting paints a measured size, so a skeleton cannot hold it; choose the site logo in the editor' };
	function buildBrand( els ) {
		const [ first, ...rest ] = els;
		const r = cls.classify( first, null, { typedBrand: true } );
		const node = base( first, r.candidates[ 0 ].block, {} );
		node.handover = [ logoHandover ];
		record( first, r, { unit: 'brand', note: `typed brand name "${ els.map( m.words ).join( ' ' ) }" is the logo block` } );
		rest.forEach( ( e ) => record( e, { action: 'absorbed', reason: `part of the typed brand name; the logo block carries it`, confidence: r.confidence, candidates: [] }, { into: first.key } ) );
		return node;
	}

	// A run of icon-only Site Info links in a drawer's top row (rule drawerIconRun): one social icons group on the first link,
	// the others absorbed into it. Fill generates the group's icons from the Site Info row; the icons are resolved inside the
	// links' parent in the root's own template, and the group is the drawer's `icons` top-row slot (chromeSlotType icons).
	function buildIcons( els, parent ) {
		const D = R.drawerIconRun;
		const [ first, ...rest ] = els;
		const slugs = els.map( ( l ) => cls.siteInfoBrand( l ).slug );
		const node = base( first, D.block, {} );
		node.siteInfoRow = slugs;
		const root = rootOf( parent );
		if ( parent.template === root.template && els.every( ( l ) => l.template === root.template ) ) {
			const sel = ( x ) => `[data-dc-tpl="${ x.tpl }"]`;
			node.draftRef = `${ root.tag }${ sel( root ) } ${ sel( parent ) }`;
			node.childRefs = Object.fromEntries( els.map( ( l, i ) => [ slugs[ i ], sel( l ) ] ) );
		}
		const targets = [ ...new Set( els.map( ( l ) => l.attrs?.target ).filter( Boolean ) ) ];
		1 === targets.length && ( node.childAttributes = { linkTarget: targets[ 0 ] } );
		node.handover = [ { owner: 'site-info', kind: 'presence', detail: D.handover } ];
		const why = { rule: 'drawerIconRun', source: 'rule drawerIconRun', reason: D.reason, confidence: 1 };
		const hit = { block: D.block, score: 1, share: 1, evidence: [ { text: `rule drawerIconRun: ${ D.reason }` } ] };
		record( first, { ...why, candidates: [ hit ] }, { unit: 'icons', slot: D.slot, rowNote: `icons generated by Fill from siteInfoRow ${ JSON.stringify( slugs ) }; ${ D.slot.attribute } ${ D.slot.value } on ${ D.slot.block }` } );
		rest.forEach( ( l ) => record( l, { ...why, action: 'absorbed', into: first.key, reason: `part of the drawer's top-row icon group: ${ D.block } draws it from Site Info`, candidates: [] } ) );
		return node;
	}

	const kindOfLink = ( l ) => {
		const kinds = [ ...cls.siteInfoKinds( l ) ].filter( ( [ k ] ) => facts.listItem.kinds.includes( k ) ).sort( ( a, b ) => b[ 1 ].w - a[ 1 ].w );
		return kinds[ 0 ]?.[ 0 ] || null;
	};
	function buildList( els ) {
		const slug = facts.listSlug;
		const li = facts.listItem;
		const handover = [];
		const items = els.filter( ( l ) => ! removedBy( l ) ).map( ( l ) => {
			const kind = kindOfLink( l );
			const href = l.attrs?.href || '';
			const real = href && '#' !== href;
			if ( kind ) {
				const owner = facts.brands.find( ( b ) => b.slug === kind );
				return { [ li.text ]: '', [ li.siteInfoSource ]: kind, ...( real && li.siteInfoLink && ! ( owner && brandOwnsAddress( owner, href ) ) ? { [ li.siteInfoLink ]: true } : {} ) };
			}
			if ( ! real && 'a' === l.tag ) {
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link "${ m.words( l ) }" is "#": its destination is not in the draft, url left empty` } );
			}
			return { [ li.text ]: m.words( l ) || String( l.allText ?? '' ).replace( /\s+/g, ' ' ).trim(), ...( real ? { [ li.url ]: href } : {} ) };
		} );
		const C = {};
		const ev = ( b, kind, w, text ) => ( C[ b ] ||= { block: b, evidence: [] } ).evidence.push( { kind, w, text } );
		ev( slug, 'db', W.tag, `html_tag_to_core_block: ul -> ${ slug }: the database block for a list` );
		capsOf( slug ).includes( 'list' ) && ev( slug, 'capability', W.capability, `block_capabilities: ${ slug } lists "list"` );
		ev( slug, 'structure', W.structure, `${ items.length } bare text links, one above the next` );
		const own = facts.tagMap.a?.core_block_slug;
		own && ev( own, 'db', W.tag, `html_tag_to_core_block: a -> ${ own } (each link on its own)` );
		const r = finish( C );
		const node = base( els.find( ( l ) => ! removedBy( l ) ), slug, { ...( ( enumOf( slug, 'markerType' ) || [] ).includes( 'none' ) ? { markerType: 'none' } : {} ), items } );
		handover.length && ( node.handover = handover );
		els.forEach( ( l, i ) => {
			if ( removedBy( l ) ) {
				const o = overrides( l, m.words( l ) );
				const b = cls.briefOnly( l );
				return record( l, { action: 'remove', reason: b ? `brief-only line (${ b.id }): ${ b.reason }` : o.reason || o.source, source: b ? `decisions ${ b.id }` : o.source, confidence: 0.9, candidates: [] } );
			}
			const at = items[ els.filter( ( x, j ) => j < i && ! removedBy( x ) ).length ];
			const row = record( l, i === els.findIndex( ( x ) => ! removedBy( x ) ) ? r : { ...r, candidates: r.candidates.slice( 0, 1 ) }, { unit: 'list', item: at, ...( at[ li.siteInfoSource ] ? { siteInfoKind: at[ li.siteInfoSource ] } : {} ) } );
			absorbSubtree( l, { block: slug, key: l.key }, 'the list item\'s marker', 'drawsChildren' );
			return row;
		} );
		return node;
	}

	// The content settings of one element's block. Returns { a (attributes), handover }.
	function contentAttrs( block, e, top ) {
		const a = {};
		const handover = [];
		const t = m.words( e );
		if ( facts.wrapperShells.includes( block ) ) {
			a.tagName = ( enumOf( block, 'tagName' ) || [] ).includes( e.tag ) ? e.tag : 'div';
			return { a: { ...a, ...layoutOf( block, e ) }, handover };
		}
		if ( 'section-root' === composition[ block ]?.composition_role || ( composition[ block ]?.wraps_block && m.blockKids( e ).length ) ) {
			return { a: layoutOf( block, e ), handover };
		}
		if ( top.siteInfoKind && facts.displayTypes.includes( top.siteInfoKind ) && enumOf( block, 'displayType' ) ) {
			a.displayType = top.siteInfoKind;
			if ( 'copyright' === top.siteInfoKind && attrExists( block, 'copyrightPrefix' ) ) {
				a.copyrightPrefix = /^\s*copyright\b/i.test( t ) ? 'Copyright' : '';
			}
			handover.push( { owner: 'site-info', kind: 'text', detail: `Site Info "${ top.siteInfoKind }" must read: ${ m.textWithBreaks( e ) }` } );
			return { a, handover };
		}
		if ( top.brand ) {
			Object.assign( a, { iconSource: 'brand', brandName: top.brand.slug, metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: top.brand.siteInfoKey } } } } } );
			e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
			return { a, handover };
		}
		if ( facts.logoBlocks.includes( block ) ) {
			handover.push( logoHandover );
			return { a, handover };
		}
		const textAttr = facts.firstAttrByRole( block, 'text-content' );
		const linkAttr = facts.firstAttrByRole( block, 'link-href' );
		textAttr && t && ( a[ textAttr ] = m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : t );
		top.linkSource && ( a.linkSource = top.linkSource );
		const href = e.attrs?.href;
		if ( linkAttr && href ) {
			if ( '#' === href ) {
				const onClick = /sc-camel-on-click="\{\{\s*([^}\s]+)\s*\}\}"/.exec( e.snippet || '' )?.[ 1 ];
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link is "#"${ onClick ? ` and navigates by script ${ onClick }` : '' }: destination not in the draft, url left empty` } );
			} else if ( ! top.linkSource ) {
				a[ linkAttr ] = href;
			}
			e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
		}
		return { a: { ...a, ...Object.fromEntries( Object.entries( top.attributes || {} ) ) }, handover };
	}

	// The ids the build holds for this element's block: a logo block's `logoId` (the attachment of the file the element
	// draws) and a menu block's `ref` (the menu site-build made for this surface). { attrs, said: { attr: where from } }.
	const carryProblems = [];
	function carriedAttrs( block, e ) {
		const out = { attrs: {}, said: {}, missing: [] };
		if ( ! carried ) {
			return out;
		}
		if ( facts.logoBlocks.includes( block ) && attrExists( block, 'logoId' ) ) {
			const hit = carried.logo( e, view );
			hit?.id && Object.assign( out.attrs, { logoId: hit.id } ) && ( out.said.logoId = `media-map.json: ${ hit.asset }` );
			hit?.reason && out.missing.push( `${ e.key }: no logoId is carried: ${ hit.reason }` );
		}
		if ( 'nav' === e.tag && attrExists( block, 'ref' ) && surfaceKind ) {
			const id = carried.menu( surfaceKind );
			id && Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ surfaceKind } menu` );
		}
		return out;
	}

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

	// ---- rules.headerSlots: the header's three rows (lib/skeleton-header-slots.mjs) ----
	const slotProblems = [];
	let stripRoots = [];
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
		node.innerBlocks = buildChildren( el, H.rowBlock );
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
		const inside = insideStrips( m.blockKids( e ), { holdsMain, declared: declaredPosition } );		const beside = besideStrips( inventory, { declared: declaredPosition, sameParent } );
		const plan = slotPlan( { beside, inside } );
		if ( ! H.slotAttribute ) {
			[ [ 'top', plan.top ], [ 'bottom', plan.bottom ], ...plan.extras.map( ( x ) => [ x.side, x.el ] ) ].filter( ( [ , x ] ) => x ).forEach( ( [ side, x ] ) => slotProblems.push( `${ x.key }: a strip ${ 'top' === side ? 'above' : 'below' } the header's main bar has no row: rules.headerSlots names no slot attribute` ) );
			return buildChildren( e, block );
		}
		// Only a strip beside the header that got a row is absorbed: an extra strip keeps its own surface.
		const besideKeys = new Set( [ ...beside.before, ...beside.after ].map( ( x ) => x.key ) );
		stripRoots = [ plan.top, plan.bottom ].filter( ( x ) => x && besideKeys.has( x.key ) ).map( ( x ) => x.key );
		const top = plan.top && buildSlotRow( plan.top, 'top' );
		plan.extras.forEach( leaveStrip );
		const nodes = buildChildren( e, block, inside.main, true );
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
	const buildFooterRows = ( e, block ) => footerRowsOf( e, block, { R, m, inventory, contentAttrs, base, record, hosts, buildChildren, buildNode, slotProblems, declared: declaredPosition, setStripRoots: ( keys ) => ( stripRoots = keys ), unwrap: ( x ) => unwrapThrough( x, block ) } );

	// The built blocks whose children are being built, innermost last.
	const hosts = [];
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
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName, surfaceParts: scope?.surfaceParts ?? [], stripRoots, recordDisagreements: view.disagreements, recordUntranslated: view.untranslated,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W, ...( built ? { builtPost: built } : {} ),
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => [ 'remove', 'absorbed', 'unwrap' ].includes( r.action ) ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length, byRule: rows.reduce( ( o, r ) => ( r.rule ? { ...o, [ r.rule ]: ( o[ r.rule ] || 0 ) + 1 } : o ), {} ) },
		widthAlternatives, problems, rows,
	};
	return { skeleton, proposal, problems };
}
