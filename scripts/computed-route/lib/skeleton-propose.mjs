// Skeleton writer step 2 (Spec 47 §3.4): the inventory (lib/skeleton-inventory.mjs) to a Fill skeleton and a proposal.
// Blocks come from lib/skeleton-classify.mjs (database evidence and the standing decisions); this file shapes them into
// nodes: units of siblings that are ONE block (a stacked run of text links is one list; a typed brand name is the logo),
// each node's content attributes, its exact draft link (a tpl finder, R-47-4) and the proposal row the review shows.
// A skeleton holds no style value (R-47-10): only content, identity and structure settings.
import { skeletonProblems, expandSiteInfoRows } from './fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';
import { brandOwnsAddress } from './brand-registry.mjs';
import { inventoryModel } from './skeleton-model.mjs';
import { makeClassifier, overrideFor, finish, W } from './skeleton-classify.mjs';

const count = ( list ) => list.reduce( ( a, n ) => a + 1 + count( n.innerBlocks || [] ), 0 );

// o: { inventory, facts, surface, clientDecisions, picks ({ key: decision }), calKeys (slug -> calibration element keys), db }.
export function proposeSkeleton( { inventory, facts, surface, clientDecisions = {}, picks = {}, calKeys = () => [], db = null } ) {
	const m = inventoryModel( inventory );
	const { composition, capsOf, enumOf } = facts;
	const minLinks = facts.decisions.structural?.linkList?.minLinks ?? 2;
	const overrides = ( e, words ) => overrideFor( e, { clientDecisions, picks, facts, surface, words } );
	const cls = makeClassifier( { m, facts, overrides } );
	const rows = [];
	const rowOf = {};
	const record = ( e, r, extra = {} ) => {
		const top = r.candidates?.[ 0 ];
		const row = {
			order: rows.length, key: e.key, tag: e.tag, depth: e.depth, words: m.words( e ), block: top?.block ?? null, action: r.action || null, reason: r.reason || null, source: r.source || null,
			confidence: r.confidence, low: r.confidence < 0.7, stale: r.stale || null,
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
	const finder = ( e ) => m.tplFinder( e );
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
	const linkRun = ( list, i ) => {
		const span = [];
		for ( let j = i; j < list.length && ( m.isTextLink( list[ j ] ) || removedBy( list[ j ] ) ); j++ ) {
			span.push( list[ j ] );
		}
		while ( span.length && removedBy( span[ span.length - 1 ] ) ) {
			span.pop();
		}
		const links = span.filter( ( k ) => ! removedBy( k ) );
		return links.length >= minLinks && m.stacked( links ) && ! removedBy( span[ 0 ] ) ? span : [];
	};
	const unitsOf = ( e ) => {
		const list = m.blockKids( e );
		const out = [];
		for ( let i = 0; i < list.length; ) {
			const brand = typedBrandRun( list, i );
			const run = brand ? [] : linkRun( list, i );
			if ( brand ) {
				out.push( { type: 'brand', els: brand } );
				i += brand.length;
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
			if ( ! real ) {
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link "${ m.words( l ) }" is "#": its destination is not in the draft, url left empty` } );
			}
			return { [ li.text ]: m.words( l ), ...( real ? { [ li.url ]: href } : {} ) };
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
			return record( l, i === els.findIndex( ( x ) => ! removedBy( x ) ) ? r : { ...r, candidates: r.candidates.slice( 0, 1 ) }, { unit: 'list', item: at, ...( at[ li.siteInfoSource ] ? { siteInfoKind: at[ li.siteInfoSource ] } : {} ) } );
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

	function buildNode( e, parentBlock ) {
		const r = cls.classify( e, parentBlock );
		if ( 'remove' === r.action ) {
			record( e, r );
			removeSubtree( e, `inside a removed element (${ e.key })` );
			return null;
		}
		const top = r.candidates[ 0 ];
		if ( ! top ) {
			record( e, { ...r, action: 'unresolved', reason: 'no block fits this element: decide it with skeleton.mjs decide', confidence: 0 } );
			return null;
		}
		const block = top.block;
		const { a, handover } = contentAttrs( block, e, top );
		const node = base( e, block, a );
		handover.length && ( node.handover = handover );
		const row = record( e, r, { attributes: a } );
		const slots = {};
		m.kids( e ).filter( ( k ) => m.isPart( k ) && 'svg' === k.tag && k.visible[ 1440 ] ).forEach( ( k ) => {
			const key = calKeys( block ).filter( ( c ) => new RegExp( `(^|> )svg$` ).test( c ) ).sort( ( x, y ) => x.length - y.length )[ 0 ];
			key && ( slots[ key ] = finder( k ) );
		} );
		if ( Object.keys( slots ).length ) {
			node.draftSlots = slots;
			row.slots = slots;
		}
		const kids = m.blockKids( e );
		const rowBlock = facts.rowBlocks.find( ( x ) => x.slug === block );
		const kidTops = rowBlock ? kids.map( ( k ) => ( { k, r: cls.classify( k, block ) } ) ) : [];
		const root = m.root;
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
				const kr = record( x.k, x.r, { attributes: contentAttrs( x.r.candidates[ 0 ].block, x.k, x.r.candidates[ 0 ] ).a, generatedBy: e.key } );
				kr.parts = m.kids( x.k ).filter( m.isPart ).map( ( p ) => p.key );
			} );
			return node;
		}
		node.innerBlocks = buildChildren( e, block );
		return node;
	}

	function buildChildren( e, parentBlock ) {
		return unitsOf( e ).map( ( u ) => ( 'brand' === u.type ? buildBrand( u.els ) : 'list' === u.type ? buildList( u.els ) : buildNode( u.els[ 0 ], parentBlock ) ) ).filter( Boolean );
	}

	const rootNode = buildNode( m.root, null );
	const skeleton = rootNode ? [ rootNode ] : [];
	const problems = [ ...skeletonProblems( skeleton ), ...( db ? lintSkeleton( skeleton, db ) : [] ) ];
	const proposal = {
		generated: new Date().toISOString(), inventory: inventory.generated, source: inventory.source, surface, siteName: facts.siteName,
		confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); a score is the sum of the evidence weights', weights: W,
		counts: { inventoryElements: m.els.length, parts: m.els.filter( m.isPart ).length, rows: rows.length, skeletonNodes: count( skeleton ), expandedNodes: count( expandSiteInfoRows( skeleton ) ), low: rows.filter( ( r ) => r.low && ! r.action ).length, removed: rows.filter( ( r ) => 'remove' === r.action || 'absorbed' === r.action ).length, unresolved: rows.filter( ( r ) => 'unresolved' === r.action ).length },
		problems, rows,
	};
	return { skeleton, proposal, problems };
}
