// Skeleton writer step 2a (Spec 48 §3.4): which block each draft element becomes, as scored candidates with their evidence.
// Evidence comes from the framework database (tag map, composition, capabilities, attribute enums), the brand registry, the
// Site Info placeholder map and the standing decisions data; a candidate's confidence is
// min(1, top) * top / (top + second), where a score is the sum of its evidence weights. A client decision or a finaliser
// pick overrides the scoring (Bean's recorded choice is the top evidence).
import { brandOwnsAddress } from './brand-registry.mjs';
import { specHit } from './skeleton-facts.mjs';
import { makeRules } from './skeleton-rules.mjs';
import { makeIdentity } from './skeleton-identity.mjs';
import { draftLogicOf } from './skeleton-narrowing.mjs';
import path from 'path';

export const W = { tag: 0.5, composition: 0.35, capability: 0.25, structure: 0.4, siteInfo: 0.3, pattern: 0.5, decision: 1, logo: 0.5, rule: 1 };

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

// SGS bans core blocks: every core candidate, whatever proposed it (the tag map, a precedent tree, a decision, a
// finaliser pick), becomes its SGS replacement (replacedBy: lib/skeleton-facts.mjs, from blocks.replaces) with the
// rewrite as evidence, or is dropped and listed in `rejectedCore` when none exists, unless the decisions data names it
// as an exception (`rules.coreExceptions`, each with its reason). Candidates naming one block merge.
export function sgsOnly( result, replacedBy = {}, exceptions = [] ) {
	if ( ! result?.candidates?.some( ( c ) => c.block?.startsWith( 'core/' ) ) ) {
		return result;
	}
	const C = {};
	const rejectedCore = [];
	for ( const c of result.candidates ) {
		const kept = exceptions.find( ( x ) => x.block === c.block );
		const core = c.block.startsWith( 'core/' ) && ! kept;
		const block = core ? replacedBy[ c.block ] : c.block;
		if ( ! block ) {
			rejectedCore.push( c.block );
			continue;
		}
		const { score, share, evidence, ...rest } = c;
		const into = ( C[ block ] ||= { ...rest, block, evidence: [] } );
		into.evidence.push( ...evidence, ...( core ? [ { kind: 'db', w: 0, text: `blocks.replaces: ${ c.block } -> ${ block } (SGS bans core blocks)` } ] : [] ), ...( kept ? [ { kind: 'decision', w: 0, text: `rules.coreExceptions: ${ c.block } is kept (${ kept.reason })` } ] : [] ) );
	}
	return { ...result, ...finish( C ), ...( rejectedCore.length ? { rejectedCore } : {} ) };
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

export function makeClassifier( { m, facts, overrides, surface = {}, blockOfKey = () => null, motion = new Set(), view = undefined, scope = null, formLinkOf = () => null, siteLink = undefined } ) {
	const { composition, capsOf, tagMap, decisions } = facts;
	const minLinks = decisions.structural?.linkList?.minLinks ?? 2;
	const textBlock = tagMap.p?.core_block_slug || null;
	const sectionRoots = Object.values( composition ).filter( ( r ) => 'section-root' === r.composition_role );

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

	const rules = makeRules( { m, facts, surface, motion, view, scope, hooks: { siteInfoKinds, isColumnLabel, blockOfKey, formLinkOf, siteLink, topBlock: ( k ) => classify( k, null ).candidates[ 0 ]?.block } } );
	// A rule verdict in the classifier's result shape (lib/skeleton-rules.mjs).
	const fromRule = ( r ) => {
		const base = { rule: r.rule, source: `rule ${ r.rule }`, reason: r.reason, confidence: 1, ...( r.handover ? { handover: r.handover } : {} ), ...( r.inner ? { inner: r.inner, item: r.item } : {} ), ...( r.kind ? { kind: r.kind } : {} ), ...( r.opens ? { opens: r.opens } : {} ), ...( r.missingFeature ? { missingFeature: r.missingFeature } : {} ), ...( r.siteOptions ? { siteOptions: r.siteOptions } : {} ), ...( r.widthDependent ? { widthDependent: r.widthDependent, confidence: decisions.rules?.widthDependent?.confidence ?? 0.5 } : {} ) };
		if ( r.action ) {
			return { ...base, action: r.action, ...( r.into ? { into: r.into } : {} ), candidates: [] };
		}
		const C = {};
		add( C, r.block, 'rule', W.rule, `rule ${ r.rule }: ${ r.reason }`, { attributes: r.attributes, ...( r.wordBound ? { wordBound: r.wordBound } : {} ) } );
		return { ...finish( C ), ...base, absorb: !! r.absorb };
	};

	// A rule that names a block keeps winning, unless the framework DB's own scoring of the element (the same classifier with
	// the rules set aside) strongly prefers another block (Bean, D1, 2026-10-29): its top SGS block differs from the rule's,
	// it is a specific block (a generic wrapper shell, the fallback for any element with children, is no preference), its
	// confidence reaches rules.ruleConflict.minConfidence, and the rule's block holds no more than
	// rules.ruleConflict.maxRuleShare of the DB's candidates. Such a row stays the rule's block but is low confidence, with
	// both reasons and both candidates, so the finaliser and the review decide it instead of the rule being final.
	const ruleAgainstDb = ( e, parentBlock, ctx, out ) => {
		const D = decisions.rules?.ruleConflict;
		const ruleBlock = out.candidates?.[ 0 ]?.block;
		if ( ! D || ! ruleBlock ) {
			return out;
		}
		const db = sgsOnly( classify( e, parentBlock, { ...ctx, noRule: true } ), facts.replacedBy, decisions.rules?.coreExceptions || [] );
		const top = db.candidates?.[ 0 ];
		const ruleShare = db.candidates.find( ( c ) => c.block === ruleBlock )?.share ?? 0;
		if ( ! top || top.block === ruleBlock || facts.wrapperShells.includes( top.block ) || db.confidence < D.minConfidence || ruleShare > D.maxRuleShare ) {
			return out;
		}
		const dbReason = `the framework DB prefers ${ top.block } (confidence ${ db.confidence }: ${ top.evidence.map( ( x ) => x.text ).join( '; ' ) })`;
		return {
			...out, confidence: D.confidence, conflict: { rule: out.rule, ruleBlock, dbBlock: top.block, dbConfidence: db.confidence, why: D.reason },
			reason: `${ out.reason }; ${ dbReason }; ${ D.reason }`,
			candidates: [ { ...out.candidates[ 0 ], share: 0.5 }, { ...top, share: 0.5 } ],
		};
	};

	// The candidates for one element. ctx: { parentBlock, typedBrand (the element is part of a typed brand name), noRule (the
	// standing rules set aside: the DB's own scoring) }.
	function classify( e, parentBlock = null, ctx = {} ) {
		const C = {};
		const words = m.words( e );
		const over = overrides( e, words );
		const verdict = ! ctx.typedBrand && ! ctx.noRule && 'client decision' !== over?.source ? rules.ruleFor( e, parentBlock ) : null;
		if ( verdict ) {
			return ruleAgainstDb( e, parentBlock, ctx, fromRule( verdict ) );
		}
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
			// What a root accepts must fit the root's own children: a content block accepted as a row fits a child that holds
			// blocks; any other accepted block fits a child whose tag maps to it.
			const fits = ( accepted ) => bk.some( ( c ) => ( 'content-block' === composition[ accepted ]?.composition_role && m.blockKids( c ).length ) || tagMap[ c.tag ]?.core_block_slug === accepted );
			rootRule.forEach( ( r ) => {
				add( C, r.block_slug, 'capability', W.capability * 2, `block_capabilities: ${ r.block_slug } lists "${ e.tag }" (the draft root tag)` );
				add( C, r.block_slug, 'db', W.composition, `block_composition: ${ r.block_slug } is a section-root accepting ${ r.accepts ? JSON.stringify( r.accepts ) : 'any block' }` );
				add( C, r.block_slug, 'structure', 0.15, 'the root of the surface' );
				// A null list is a declared "accepts any block" (edit.js sets no allowedBlocks): it fits whatever the root holds.
				const fit = r.accepts ? r.accepts.filter( fits ) : [];
				fit.length && add( C, r.block_slug, 'structure', W.structure, `the root's children fit what it accepts (${ fit.join( ', ' ) })` );
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

	// Identification by elimination (lib/skeleton-identity.mjs) over what the scoring and the rules settled, in the authority
	// order: a client decision, a finaliser pick and a standing decision stand; a structural rule (rules.identity.structural:
	// the header and footer slots, the form link, the commerce region, owned parts) stands; another rule is checked against the
	// element's facts; the scoring's pick is matched.
	const logicOf = ( component ) => ( view && facts.repo && facts.client ? draftLogicOf( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component } ) : null );
	const identity = makeIdentity( { m, facts, surface, logicOf, carousels: surface.loops?.carousels || new Set(), owned: rules.owned || new Set() } );
	const structural = new Set( decisions.rules?.identity?.structural || [] );
	let widened = null;
	// A loop's block placed on its holder stands over its own parts beside it (R2): climbing from the holder, every block
	// sibling met is a part when it shows a fact the block shows (its platform, a role or state few blocks share) and nothing
	// the block cannot show; the block moves to the highest element whose other children were all its parts, and the parts and
	// the wrappers on the way are drawn by it (absorbed) or, for a block holding its items, unwrapped into it.
	const widening = () => {
		if ( widened ) {
			return widened;
		}
		widened = { at: new Map(), inner: new Map() };
		const decided = ( e ) => 'client decision' === overrides( e, m.words( e ) )?.source;
		for ( const x of identity ? rules.loopRegions || [] : [] ) {
			const anchor = m.byKey[ x.key ];
			if ( ! anchor || ! x.block || decided( anchor ) ) {
				continue;
			}
			// A sibling is the block's part when it shows a fact the block shows (its platform, a role or state few blocks share,
			// a named part: stars, a score, a count, an arrow, a dot) and nothing the block cannot show; it is a whole part when
			// every block child it holds is one too, or holds no words of its own (a glyph, a separator).
			const shows = ( s ) => ! identity.ruledOut( x.block, s ) && [ ...identity.region( s ).values() ].some( ( f ) => ( 'platform' === f.fact || 'shows-part' === f.fact || identity.naming( f ) ) && 'yes' === identity.table.state( x.block, f.fact, f.value ) );
			const quiet = ( k ) => ! m.words( k ).trim() && ! m.blockKids( k ).some( ( c ) => m.words( c ).trim() );
			const memo = new Map();
			const whole = ( s ) => memo.get( s.key ) ?? memo.set( s.key, shows( s ) && m.blockKids( s ).every( ( k ) => whole( k ) || quiet( k ) ) ).get( s.key );
			// The whole parts within a sibling: itself, else the whole parts among its children, never inside a unit of its own (a
			// control or card link, a loop's item, what a structure owns: a product card keeps its star rating and price).
			const unit = ( s ) => [ 'a', 'button' ].includes( s.tag ) || !! m.read.handler( s ) || ( rules.owned || new Set() ).has( s.key ) || ( s.membership || [] ).some( ( x ) => 'sc-for' === x.kind );
			const partsIn = ( s ) => ( whole( s ) ? [ s ] : unit( s ) ? [] : m.blockKids( s ).flatMap( partsIn ) );
			let top = null;
			let clean = true;
			let parts = [];
			const route = [];
			for ( let at = anchor, p = m.byKey[ anchor.parentKey ]; p && p !== m.root; at = p, p = m.byKey[ p.parentKey ] ) {
				const sibs = m.blockKids( p ).filter( ( k ) => k !== at );
				clean && route.push( at );
				if ( ! sibs.length ) {
					continue;
				}
				const found = sibs.flatMap( partsIn );
				if ( ! found.length ) {
					break;
				}
				// The block moves up only while every sibling is wholly its part; parts found beside other content are drawn by it
				// where they stand (absorbed into it), and the walk stops at the first level holding no part.
				if ( clean && sibs.every( whole ) ) {
					top = p;
				} else {
					clean = false;
				}
				parts = [ ...parts, ...found ];
			}
			if ( ! parts.length || ( top && ( decided( top ) || widened.at.has( top.key ) ) ) ) {
				continue;
			}
			const verdict = rules.ruleFor( anchor, null );
			if ( ! verdict?.block ) {
				continue;
			}
			const host = top ?? anchor;
			const within = ( k ) => top && [ ...( function* up( e ) {
				for ( let q = e; q; q = m.byKey[ q.parentKey ] ) {
					yield q;
				}
			} )( k ) ].includes( top );
			const shown = parts.flatMap( ( s ) => [ ...identity.region( s ).values() ].filter( ( f ) => 'yes' === identity.table.state( x.block, f.fact, f.value ) && ( 'platform' === f.fact || 'shows-part' === f.fact || identity.naming( f ) ) ).map( ( f ) => `${ f.fact } ${ f.value }` ) ).sort( ( a, b ) => Number( b.startsWith( 'shows-part' ) ) - Number( a.startsWith( 'shows-part' ) ) );
			const why = `${ decisions.rules.identity.regionReason }: ${ x.block } placed on ${ anchor.key } draws its own parts beside it (${ [ ...new Set( shown ) ].slice( 0, 10 ).join( ', ' ) }; at ${ parts.map( ( k ) => k.key ).slice( 0, 6 ).join( ', ' ) })`;
			top && widened.at.set( top.key, { ...fromRule( { ...verdict, reason: `${ verdict.reason }; ${ why }` } ), identityRegion: { anchor: anchor.key, parts: parts.map( ( s ) => s.key ) } } );
			const absorbed = { action: 'absorbed', rule: 'identity', into: host.key, source: 'identity matcher', reason: `${ why }: drawn by ${ x.block }`, confidence: 1, candidates: [] };
			if ( top && ! verdict.absorb ) {
				route.filter( ( k ) => k !== top ).forEach( ( k ) => widened.inner.set( k.key, { action: 'unwrap', rule: 'identity', source: 'identity matcher', reason: `${ why }: unwrapped into ${ top.key }`, confidence: 1, candidates: [] } ) );
			}
			// A part inside the moved block's own subtree is drawn by it already when the block absorbs; any other part is absorbed.
			parts.filter( ( k ) => ! ( verdict.absorb && within( k ) ) ).forEach( ( k ) => widened.inner.set( k.key, absorbed ) );
		}
		return widened;
	};
	const settle = ( e, r, ctx = {} ) => {
		if ( ! identity || ctx.typedBrand || ctx.noRule || [ 'client decision', 'finaliser pick' ].includes( r.source ) || /^standing decision/.test( r.source || '' ) ) {
			return r;
		}
		const w = widening();
		const moved = w.at.get( e.key ) ?? w.inner.get( e.key );
		if ( moved ) {
			return sgsOnly( moved, facts.replacedBy, facts.decisions.rules?.coreExceptions || [] );
		}
		if ( structural.has( r.rule ) || r.action ) {
			return r;
		}
		return r.rule ? identity.check( e, r ) : identity.match( e, r ) || r;
	};
	return { classify: ( e, parentBlock = null, ctx = {} ) => settle( e, sgsOnly( classify( e, parentBlock, ctx ), facts.replacedBy, facts.decisions.rules?.coreExceptions || [] ), ctx ), identity, accordionRuns: rules.accordionRuns || new Map(), brandFor, siteInfoKinds, isColumnLabel, briefOnly, timedPopup: rules.timedPopup, drawsChildren: rules.drawsChildren, modalParts: rules.modalParts, iconRun: rules.iconRun, siteInfoBrand: rules.siteInfoBrand, commerceRegion: rules.commerceRegion, filterRail: rules.filterRail, filterDrawer: rules.filterDrawer, choiceFlow: rules.choiceFlow };
}
