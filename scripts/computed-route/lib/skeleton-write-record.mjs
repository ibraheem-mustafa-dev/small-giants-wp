// The proposal's row book and the subtrees a block draws itself (the writer's step 2 of Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): every element the writer settles gets one row; an element inside a removed
// element is removed with it; an element a block draws is absorbed into that block's row; an element that renders only at
// some widths inside such a block becomes one block instance per variation (FR-48-50) or is listed as a width alternative.
// The factory takes the writer's shared context (`ctx`: m, facts, overrides, rows, rowOf, base, w); the functions it
// returns reach the other writer modules through `ctx.w` when they are called.
import { isSiteInfoValue } from './skeleton-rules.mjs';

export function makeRecorder( ctx ) {
	const { m, facts, overrides, rows, rowOf, base, w, widthAlternatives, variantsOf } = ctx;
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
			made = w.buildNode( k, parentBlock );
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
	return { record, removeSubtree, absorbSubtree, absorbWidthKids, takeVariants };
}
