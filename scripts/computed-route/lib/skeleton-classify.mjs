// Skeleton writer step 2a (Spec 47 §3.4): which block each draft element becomes, as scored candidates with their evidence.
// Evidence comes from the framework database (tag map, composition, capabilities, attribute enums), the brand registry, the
// Site Info placeholder map and the standing decisions data; a candidate's confidence is
// min(1, top) * top / (top + second), where a score is the sum of its evidence weights. A client decision or a finaliser
// pick overrides the scoring (Bean's recorded choice is the top evidence).
import { brandOwnsAddress } from './brand-registry.mjs';
import { specHit } from './skeleton-facts.mjs';

export const W = { tag: 0.5, composition: 0.35, capability: 0.25, structure: 0.4, siteInfo: 0.3, pattern: 0.5, decision: 1, logo: 0.5 };

const add = ( C, block, kind, w, text, extra = {} ) => {
	const c = ( C[ block ] ||= { block, evidence: [] } );
	c.evidence.push( { kind, w, text } );
	Object.assign( c, extra );
	return c;
};

// Candidates ranked, with a share each and the overall confidence.
export function finish( C ) {
	const list = Object.values( C ).map( ( c ) => ( { ...c, score: +c.evidence.reduce( ( a, ev ) => a + ev.w, 0 ).toFixed( 3 ) } ) ).filter( ( c ) => c.score > 0 ).sort( ( a, b ) => b.score - a.score );
	const [ top, second ] = list;
	const total = list.reduce( ( a, x ) => a + x.score, 0 );
	list.forEach( ( c ) => {
		c.share = +( c.score / total ).toFixed( 3 );
	} );
	return { candidates: list, confidence: top ? +( Math.min( 1, top.score ) * ( top.score / ( top.score + ( second?.score || 0 ) ) ) ).toFixed( 2 ) : 0 };
}

// The decision (if any) that settles an element: a client decision for its key (kept only while the element still has the
// words and tag it had when decided), a finaliser pick, or a standing element decision from the data file.
export function overrideFor( e, { clientDecisions = {}, picks = {}, facts, surface, words } ) {
	const sig = `${ e.tag }|${ words }`;
	const own = clientDecisions.surfaces?.[ surface ]?.[ e.key ];
	if ( own ) {
		return own.signature && own.signature !== sig ? { stale: `decision for ${ e.key } was made for "${ own.signature }" and the element is now "${ sig }"` } : { ...own, source: 'client decision' };
	}
	if ( picks[ e.key ] ) {
		return { ...picks[ e.key ], source: 'finaliser pick' };
	}
	const hit = ( facts.decisions.elements || [] ).find( ( d ) => ( ! d.match.tag || d.match.tag === e.tag ) && ( ! d.match.wordsPattern || new RegExp( d.match.wordsPattern, 'i' ).test( words ) ) && ( ! d.match.classPattern || new RegExp( d.match.classPattern, 'i' ).test( e.attrs?.class || '' ) ) );
	return hit ? { block: hit.block || null, remove: 'remove' === hit.action, attributes: hit.attributes, reason: hit.reason, source: `standing decision ${ hit.id }` } : null;
}

export function makeClassifier( { m, facts, overrides } ) {
	const { composition, capsOf, tagMap, decisions } = facts;
	const minLinks = decisions.structural?.linkList?.minLinks ?? 2;
	const textBlock = tagMap.p?.core_block_slug || null;
	const sectionRoots = Object.values( composition ).filter( ( r ) => 'section-root' === r.composition_role && r.accepts );

	// Brand-registry hits for an element: which brand's address it links to, which placeholder it is bound to, its label.
	const brandFor = ( e ) => {
		const href = e.attrs?.href || '';
		const label = `${ e.attrs?.[ 'aria-label' ] || '' } ${ e.attrs?.title || '' }`.toLowerCase();
		return facts.brands.map( ( b ) => {
			const why = [];
			if ( brandOwnsAddress( b, href ) ) {
				why.push( `brand-registry: ${ b.slug } owns ${ href }` );
			}
			m.placeholders( e ).forEach( ( ph ) => facts.mapEntry( ph )?.key === b.siteInfoKey && why.push( `site-info-placeholder-map: ${ ph } -> ${ b.siteInfoKey }` ) );
			const lbl = b.label.toLowerCase().replace( /\s*\(.*\)$/, '' );
			if ( new RegExp( `\\b${ lbl.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\b` ).test( label ) ) {
				why.push( `brand-registry label "${ b.label }" in aria-label/title` );
			}
			return why.length ? { brand: b, why } : null;
		} ).filter( Boolean ).sort( ( a, b ) => b.why.length - a.why.length );
	};

	// The Site Info kinds an element stands for, each with the evidence: a placeholder the map binds, a contact scheme the
	// brand registry owns (tel:, mailto:), or a pattern from the decisions data.
	const siteInfoKinds = ( e ) => {
		const out = new Map();
		const put = ( kind, w, text ) => facts.displayTypes.includes( kind ) && ! out.has( kind ) && out.set( kind, { w, text } );
		m.placeholders( e ).forEach( ( ph ) => {
			const key = facts.mapEntry( ph )?.key;
			key && put( key, W.siteInfo, `site-info-placeholder-map: ${ ph } -> ${ key }` );
		} );
		facts.brands.filter( ( b ) => brandOwnsAddress( b, e.attrs?.href || '' ) ).forEach( ( b ) => put( b.slug, W.pattern, `brand-registry: ${ b.slug } owns ${ e.attrs.href }` ) );
		for ( const [ kind, spec ] of Object.entries( decisions.siteInfoPatterns || {} ) ) {
			specHit( spec, m.words( e ) ) && put( kind, W.pattern, `decisions: ${ kind } pattern (${ spec.reason })` );
		}
		specHit( decisions.addressLinkPatterns, e.attrs?.href || '' ) && put( 'address', W.pattern, `decisions: link to a maps host (${ e.attrs.href })` );
		return out;
	};

	const briefOnly = ( e ) => ( decisions.briefOnlyLines || [] ).find( ( d ) => specHit( d, m.words( e ) ) ) || null;
	const isColumnLabel = ( e ) => {
		const sibs = m.blockKids( m.byKey[ e.parentKey ] || { key: null } );
		return !! m.words( e ) && 'a' !== e.tag && ! m.blockKids( e ).length && sibs[ 0 ] === e && sibs.slice( 1 ).filter( m.isTextLink ).length >= minLinks;
	};

	// The candidates for one element. ctx: { parentBlock, typedBrand (the element is part of a typed brand name) }.
	function classify( e, parentBlock = null, ctx = {} ) {
		const C = {};
		const words = m.words( e );
		const over = overrides( e, words );
		if ( over?.remove ) {
			return { action: 'remove', reason: over.reason || over.source, source: over.source, candidates: [], confidence: 1 };
		}
		if ( over?.block ) {
			add( C, over.block, 'decision', W.decision, `${ over.source }${ over.reason ? `: ${ over.reason }` : '' }`, { attributes: over.attributes } );
			const r = finish( C );
			return { ...r, confidence: over.confidence ?? 1, source: over.source };
		}
		const stale = over?.stale || null;
		const brief = briefOnly( e );
		if ( brief ) {
			return { action: 'remove', reason: `brief-only line (${ brief.id }): ${ brief.reason }`, source: `decisions ${ brief.id }`, candidates: [], confidence: 0.9, stale };
		}
		const bk = m.blockKids( e );
		const rootRule = 0 === e.depth ? sectionRoots.filter( ( r ) => capsOf( r.block_slug ).includes( e.tag ) ) : [];
		if ( rootRule.length ) {
			rootRule.forEach( ( r ) => {
				add( C, r.block_slug, 'capability', W.capability * 2, `block_capabilities: ${ r.block_slug } lists "${ e.tag }" (the draft root tag)` );
				add( C, r.block_slug, 'db', W.composition, `block_composition: ${ r.block_slug } is a section-root accepting ${ JSON.stringify( r.accepts ) }` );
				add( C, r.block_slug, 'structure', 0.15, 'the root of the surface' );
			} );
			return { ...finish( C ), stale };
		}
		const pc = parentBlock && composition[ parentBlock ];
		if ( bk.length && 'section-root' === pc?.composition_role && pc.accepts ) {
			pc.accepts.filter( ( b ) => 'content-block' === composition[ b ]?.composition_role ).forEach( ( b ) => {
				add( C, b, 'db', W.composition, `block_composition: ${ parentBlock } (section-root) accepts ${ JSON.stringify( pc.accepts ) }; ${ b } is a content-block` );
				add( C, b, 'capability', W.capability, `${ parentBlock } accepts ${ b } as ${ 1 === pc.accepts.length ? 'its only child' : 'a child' }` );
				add( C, b, 'structure', W.structure, `element holds ${ bk.length } block children` );
			} );
			if ( Object.keys( C ).length ) {
				return { ...finish( C ), stale };
			}
		}
		if ( 'img' === e.tag ) {
			const nameText = `${ e.attrs?.srcBasename || '' } ${ e.attrs?.alt || '' } ${ e.attrs?.class || '' }`;
			const named = !! specHit( decisions.logoImage, nameText );
			const altIsName = !! facts.siteName && facts.siteName.toLowerCase() === ( e.attrs?.alt || '' ).trim().toLowerCase();
			facts.logoBlocks.forEach( ( b ) => {
				add( C, b, 'db', W.logo * 0.7, `block_capabilities: ${ b } lists "logo"; block_composition: leaf` );
				named && add( C, b, 'pattern', W.pattern, `logo image: ${ e.attrs?.srcBasename || '' } / alt "${ e.attrs?.alt || '' }" (${ decisions.logoImage.reason })` );
				altIsName && add( C, b, 'pattern', W.siteInfo, `the image's alt text is the site name "${ facts.siteName }"` );
			} );
			tagMap.img && add( C, tagMap.img.core_block_slug, 'db', W.tag * ( named || altIsName ? 0.5 : 1 ), `html_tag_to_core_block: img -> ${ tagMap.img.core_block_slug } ("${ tagMap.img.note }")${ named || altIsName ? ', halved: the image is named as a logo' : '' }` );
			return { ...finish( C ), stale };
		}
		if ( ctx.typedBrand ) {
			facts.logoBlocks.forEach( ( b ) => {
				add( C, b, 'db', W.logo, `block_capabilities: ${ b } lists "logo"; block_composition: leaf` );
				add( C, b, 'pattern', W.pattern, `typed brand name: the words equal the site name "${ facts.siteName }"` );
			} );
			textBlock && add( C, textBlock, 'db', W.tag * 0.5, `html_tag_to_core_block: p -> ${ textBlock }, halved: the words are a brand name` );
			return { ...finish( C ), stale };
		}
		if ( bk.length ) {
			const childTops = bk.map( ( k ) => classify( k, null ).candidates[ 0 ]?.block );
			const same = bk.length > 1 && childTops.every( ( b ) => b && b === childTops[ 0 ] ) ? childTops[ 0 ] : null;
			for ( const row of facts.rowBlocks.filter( ( r ) => same && r.child === same ) ) {
				add( C, row.slug, 'db', W.composition, `block_composition: ${ row.slug } is a content-block accepting exactly ["${ same }"]; all ${ bk.length } children propose ${ same }` );
				add( C, row.slug, 'structure', W.structure, `a row of ${ bk.length } ${ same }` );
				const brandHits = bk.flatMap( ( k ) => brandFor( k ).slice( 0, 1 ).map( ( h ) => h.brand.slug ) ).filter( ( s ) => capsOf( row.slug ).includes( s ) );
				brandHits.length && add( C, row.slug, 'capability', W.capability, `block_capabilities: ${ row.slug } lists ${ brandHits.join( ', ' ) }` );
			}
			for ( const w of facts.wrapperShells ) {
				add( C, w, 'db', W.composition, `block_composition: ${ w } is a wrapper-shell; element has ${ bk.length } block children` );
				! Object.keys( C ).some( ( b ) => b !== w ) && add( C, w, 'structure', W.structure, 'no row block fits: a generic wrapper' );
				! facts.rowBlocks.some( ( r ) => same && r.child === same ) && capsOf( w ).includes( e.display ) && add( C, w, 'capability', W.capability, `block_capabilities: ${ w } lists "${ e.display }" (draft display)` );
			}
			return { ...finish( C ), stale };
		}
		if ( m.isIconLink( e ) ) {
			const hit = brandFor( e )[ 0 ];
			facts.blocksWithCap( 'svg' ).filter( ( b ) => capsOf( b ).includes( 'icon' ) && 'leaf' === composition[ b ]?.composition_role ).forEach( ( b ) => {
				add( C, b, 'capability', W.capability * 2, `block_capabilities: ${ b } lists svg and icon; the element is a link holding only an svg` );
				hit && ( facts.enumOf( b, 'iconSource' ) || [] ).includes( 'brand' ) && add( C, b, 'siteInfo', W.siteInfo * Math.min( 1, hit.why.length / 2 ) + 0.1, hit.why.join( '; ' ), { brand: hit.brand } );
			} );
			return { ...finish( C ), stale };
		}
		// A text element: Site Info content, then the tag's own block, then the column label, then a generic text block.
		const kinds = siteInfoKinds( e );
		const own = tagMap[ e.tag ]?.core_block_slug;
		for ( const [ kind, ev ] of kinds ) {
			for ( const b of facts.blocksWithDisplayType( kind ) ) {
				add( C, b, 'db', W.capability, `block_attributes: ${ b }.displayType enum has "${ kind }"`, { siteInfoKind: kind } );
				add( C, b, 'siteInfo', ev.w, ev.text );
				capsOf( b ).includes( kind ) && add( C, b, 'capability', W.capability, `block_capabilities: ${ b } lists "${ kind }"` );
			}
			if ( own && ( facts.enumOf( own, 'linkSource' ) || [] ).includes( kind ) ) {
				add( C, own, 'db', W.tag * 0.5, `html_tag_to_core_block: ${ e.tag } -> ${ own }, halved: Site Info content`, { siteInfoKind: kind, linkSource: kind } );
				add( C, own, 'db', W.capability, `block_attributes: ${ own }.linkSource enum has "${ kind }"` );
			}
		}
		if ( own && ! C[ own ] ) {
			add( C, own, 'db', W.tag, `html_tag_to_core_block: ${ e.tag } -> ${ own } ("${ tagMap[ e.tag ].note }")` );
			'leaf' === composition[ own ]?.composition_role && add( C, own, 'db', W.capability, `block_composition: ${ own } is a leaf; the element holds words and no block children` );
		}
		if ( isColumnLabel( e ) && decisions.structural?.columnLabel?.block ) {
			const cl = decisions.structural.columnLabel;
			add( C, cl.block, 'decision', W.decision, `decisions: column label (${ cl.reason })` );
		}
		if ( words && textBlock && ! own ) {
			add( C, textBlock, 'db', W.tag * 0.5, `html_tag_to_core_block: p -> ${ textBlock }: the generic block for words in a ${ e.tag }` );
		}
		return { ...finish( C ), stale };
	}

	return { classify, brandFor, siteInfoKinds, isColumnLabel, briefOnly };
}
