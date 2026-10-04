// Block pairing for full coverage (plan .claude/plans/2026-10-04-spec47-full-coverage.md): every block of a surface
// is paired with its draft element through the walker's word matcher, never through a guessed locator. A block's
// words are every live word inside it (nested blocks included); its draft partner is the smallest draft element
// holding the draft twins of those words. A pairing is kept only when it passes PAIRING_LIMITS.

// A pairing is doubtful, and left out, when the partner holds under `coverage` of the block's matched words, when it
// holds a matched word whose live twin sits outside the block, or when its box at 1440 is outside `boxRatio` of the
// block's box on either axis. It is also left out when it holds no padding while the block does and their content
// boxes match (within `boxTolerance` px, the walker's box tolerance): the padding sits on a draft ancestor, and
// pairing the inner element would write that padding as 0 (About, 2026-10-04).
export const PAIRING_LIMITS = { coverage: 0.8, boxRatio: [ 0.5, 2 ], minWords: 1, boxTolerance: 2 };

// liveRefs[i]: the cr-ref classes around live word i, innermost first. Returns Map ref -> [live word indices].
export function wordsByBlock( liveRefs ) {
	const out = new Map();
	liveRefs.forEach( ( refs, i ) => ( refs || [] ).forEach( ( ref ) => {
		out.has( ref ) || out.set( ref, [] );
		out.get( ref ).push( i );
	} ) );
	return out;
}

// matches: [[draftIndex, liveIndex]] from matchWords. Returns Map ref -> { live: [i], draft: [j] } (the draft twins
// of the block's matched words).
export function twinsByBlock( matches, blocks ) {
	const twinOf = new Map( matches.map( ( [ d, l ] ) => [ l, d ] ) );
	const out = new Map();
	for ( const [ ref, live ] of blocks ) {
		out.set( ref, { live, draft: live.filter( ( i ) => twinOf.has( i ) ).map( ( i ) => twinOf.get( i ) ) } );
	}
	return out;
}

const near = ( a, b, tol ) => Math.abs( a.w - b.w ) <= tol && Math.abs( a.h - b.h ) <= tol;
const padded = ( b, tol ) => ! near( b, b.content, tol );

// A partner that holds no padding while the block does, with the same content box: the block's padding sits on a draft
// ancestor (About, 2026-10-04: the page container was paired with the draft element inside its padded <main>).
function paddingElsewhere( box, liveBox, tol ) {
	return !! ( box.content && liveBox?.content && ! padded( box, tol ) && padded( liveBox, tol ) && near( box.content, liveBox.content, tol ) );
}

// chain: the smallest draft element holding a block's twins, then its ancestors, nearest first (each { path, box,
// content, inside }); liveBox: the block's { w, h, content }. Returns the partner: the first element, unless its
// padding sits elsewhere, in which case the partner is the nearest ancestor that wraps it with padding of its own
// (its content box is the first element's box, through any unpadded wrappers of the same size). With no such ancestor
// the first element is returned and judgePairing leaves it out.
export function paddedPartner( chain, liveBox, limits = PAIRING_LIMITS ) {
	const tol = limits.boxTolerance;
	const [ first ] = chain;
	if ( ! first || ! paddingElsewhere( { ...first.box, content: first.content }, liveBox, tol ) ) {
		return first || null;
	}
	for ( const a of chain.slice( 1 ) ) {
		if ( ! a.content || ! near( a.content, first.box, tol ) ) {
			break;
		}
		if ( padded( { ...a.box, content: a.content }, tol ) ) {
			return a;
		}
	}
	return first;
}

// Judges one pairing. block: { ref, live: [i], draft: [j], liveBox: { w, h, content? } }; partner: { inside: [draft
// word indices inside it], box, content? }; liveRefsOfDraft: Map draftIndex -> refs around its live twin.
// Returns { ok, why }.
export function judgePairing( block, partner, liveRefsOfDraft, limits = PAIRING_LIMITS ) {
	if ( block.draft.length < limits.minWords ) {
		return { ok: false, why: 'no matched words' };
	}
	const coverage = block.draft.length / block.live.length;
	if ( coverage < limits.coverage ) {
		return { ok: false, why: `only ${ Math.round( coverage * 100 ) }% of its words matched the draft` };
	}
	const foreign = partner.inside.filter( ( j ) => liveRefsOfDraft.has( j ) && ! liveRefsOfDraft.get( j ).includes( block.ref ) );
	if ( foreign.length ) {
		return { ok: false, why: `the draft element also holds ${ foreign.length } word(s) that belong outside this block` };
	}
	const [ lo, hi ] = limits.boxRatio;
	for ( const k of [ 'w', 'h' ] ) {
		const r = partner.box[ k ] / Math.max( 1, block.liveBox[ k ] );
		if ( r < lo || r > hi ) {
			return { ok: false, why: `its ${ 'w' === k ? 'width' : 'height' } is ${ partner.box[ k ] }px on the draft against ${ block.liveBox[ k ] }px live` };
		}
	}
	if ( paddingElsewhere( { ...partner.box, content: partner.content }, block.liveBox, limits.boxTolerance ) ) {
		return { ok: false, why: 'it holds no padding where the block does: the padding sits on a draft ancestor with no padding of its own around it' };
	}
	return { ok: true, why: null };
}

// A block's twins split for the draft collector (lib/pairs-page.mjs::draftChains). words: the draft words ({ t, e });
// draftIdx: the block's twin indices. A word whose text occurs more than once on the draft is not trusted where the
// matcher put it (Contact's "Google" card label matched the map note's "Google"): it takes the occurrence nearest the
// block's sure words. Returns { sure: [element index], repeated: [[candidate element indices]] }.
export function twinPlan( draftIdx, words ) {
	const count = new Map();
	words.forEach( ( w ) => count.set( w.t, ( count.get( w.t ) || 0 ) + 1 ) );
	const sure = draftIdx.filter( ( j ) => 1 === count.get( words[ j ].t ) ).map( ( j ) => words[ j ].e );
	const texts = [ ...new Set( draftIdx.filter( ( j ) => count.get( words[ j ].t ) > 1 ).map( ( j ) => words[ j ].t ) ) ];
	return { sure, repeated: texts.map( ( t ) => words.filter( ( w ) => w.t === t ).map( ( w ) => w.e ) ) };
}

// The block a ref sits in: the next ref out from it around any of its words (refsOfWords: per live word, the refs
// around it, innermost first), or null.
export function parentRef( ref, refsOfWords ) {
	for ( const refs of refsOfWords ) {
		const i = refs.indexOf( ref );
		if ( i >= 0 ) {
			return refs[ i + 1 ] || null;
		}
	}
	return null;
}

// A regex source (flags 'iu') matching a text node that holds any of a block's words, as whole words.
export function wordMatch( texts ) {
	const esc = [ ...new Set( texts.filter( Boolean ) ) ].map( ( t ) => t.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) );
	return esc.length ? `(^|[^\\p{L}\\p{N}])(${ esc.join( '|' ) })($|[^\\p{L}\\p{N}])` : null;
}

// The partner for one block. chain: lib/pairs-page.mjs::draftChains's chain for it; block: { ref, live, draft, liveBox
// ({ w, h, content, run }) }. The element partner (paddedPartner, judged) is kept when it passes; otherwise, when the
// draft element has the block's text but not its box (an inline span against a block) or shares it with another
// block's words (a value beside its label, both in one element, the value as its own text), the pair compares the
// block's text run on both sides: its extent and its paint. Returns { partner (with textRun: { direct } for a run), verdict }.
export function choosePartner( chain, block, liveRefsOfDraft, limits = PAIRING_LIMITS ) {
	const partner = paddedPartner( chain, block.liveBox, limits );
	const verdict = judgePairing( block, partner, liveRefsOfDraft, limits );
	const first = chain[ 0 ];
	const foreign = /belong outside/.test( verdict.why || '' );
	if ( verdict.ok || ! first?.run || ! block.liveBox?.run || ! ( foreign || /width|height/.test( verdict.why ) ) || ( foreign && ! first.own ) ) {
		return { partner, verdict };
	}
	const run = { path: first.path, box: first.run, inside: block.draft, textRun: { direct: !! first.own } };
	const v = judgePairing( { ...block, liveBox: block.liveBox.run }, run, liveRefsOfDraft, limits );
	return v.ok ? { partner: run, verdict: v } : { partner, verdict };
}

// Hand pairs against kept generated pairs. hand: [{ name, draft: draft element path or null, liveRef: the nearest
// block ref at or above its live element, liveIsRoot }]; kept: [{ ref, draft }]. A hand pair measuring the very draft
// element a block was paired with must measure that block's root on live: one inside the block (an inner band)
// compares the draft's border, ground and padding against an element that paints none of them (About, 2026-10-04:
// the credential column's border and ground sat on the block root, the hand pair measured its inner band). Returns
// { retarget: Map name -> live finder, duplicate: Set of generated refs the hand pair now covers }.
export function reconcileHandPairs( hand, kept ) {
	const retarget = new Map();
	const duplicate = new Set();
	for ( const h of hand ) {
		const k = h.draft && kept.find( ( x ) => x.draft === h.draft && x.ref === h.liveRef );
		if ( ! k ) {
			continue;
		}
		h.liveIsRoot || retarget.set( h.name, `.${ k.ref }` );
		duplicate.add( k.ref );
	}
	return { retarget, duplicate };
}

// The generated walker config: the hand config plus one pair per kept block. The hand config keeps its states, draft
// navigation, exclusions and divergence ledger; refPrefix is restated so Solve accepts the file. retarget: hand pair
// name -> the live finder replacing its own (reconcileHandPairs).
export function configText( handFile, surface, pairs, retarget = new Map() ) {
	// A text-run pair (lib/pairs.mjs::choosePartner) measures the block's rendered text on both sides (paint.mjs::textRun).
	const finder = ( p, side ) => {
		const within = 'draft' === side ? p.draft : `.${ p.ref }`;
		return p.textRun ? { textRun: { within, direct: 'draft' === side && !! p.textRun.direct, match: p.textRun.match || null } } : within;
	};
	const lines = pairs.map( ( p ) => `\t{ name: ${ JSON.stringify( `gen-${ p.ref.replace( /^cr-ref-/, '' ) }` ) }, text: false, structure: false, draft: ${ JSON.stringify( finder( p, 'draft' ) ) }, live: ${ JSON.stringify( finder( p, 'live' ) ) } },` );
	const moved = JSON.stringify( Object.fromEntries( retarget ) );
	return [
		`// Generated by scripts/computed-route/pairs.mjs for the ${ surface } surface: the hand config plus one pair per block,`,
		'// each paired with its draft element through matched words. Regenerate rather than edit.',
		`import base from './${ handFile }';`,
		'',
		'const generated = [',
		...lines,
		'];',
		'',
		'// Hand pairs measuring a paired block\'s draft element on an element inside the block: moved to the block root.',
		`const moved = ${ moved };`,
		'',
		'export default { ...base, refPrefix: base.refPrefix, pairs: [ ...base.pairs.map( ( p ) => ( moved[ p.name ] ? { ...p, live: moved[ p.name ] } : p ) ), ...generated ] };',
		'',
	].join( '\n' );
}
