// Twin containment: whether a hand pair's two elements hold the same words (scripts/computed-route/pairs.mjs).
// A pair is a mispair when a matched word inside one element has its twin outside the other element: the two finders
// land on different parts of the page. A size difference alone never counts, so a link wider on one side, or a button
// with a different padding, passes as long as every word it holds has its twin inside its partner.

// A word whose text occurs more than once on its side has no sure twin (the matcher may have chosen another
// occurrence), so it is not judged.
const countTexts = ( texts ) => texts.reduce( ( m, t ) => m.set( t, ( m.get( t ) || 0 ) + 1 ), new Map() );

// draftIn / liveIn: the word indices inside the pair's draft and live element. matches: [draft word, live word] index
// pairs from auto-compare.mjs::matchWords. dTexts / lTexts: each side's word texts, by word index.
// Returns { ok, checked, split, why }: checked is the number of sure matched words with at least one side inside its
// pair element; split lists each of those whose twin lies outside the other element as { word, inside: 'draft' | 'live' }.
export function judgePairScope( { draftIn, liveIn, matches, dTexts, lTexts } ) {
	const inD = new Set( draftIn );
	const inL = new Set( liveIn );
	const dCount = countTexts( dTexts );
	const lCount = countTexts( lTexts );
	const split = [];
	let checked = 0;
	for ( const [ d, l ] of matches ) {
		const a = inD.has( d );
		const b = inL.has( l );
		if ( ! ( a || b ) || dCount.get( dTexts[ d ] ) > 1 || lCount.get( lTexts[ l ] ) > 1 ) {
			continue;
		}
		checked++;
		a !== b && split.push( { word: dTexts[ d ], inside: a ? 'draft' : 'live' } );
	}
	const shown = split.slice( 0, 4 ).map( ( s ) => `"${ s.word }" (inside the ${ s.inside } element only)` ).join( ', ' );
	return { ok: ! split.length, checked, split, why: split.length ? `${ split.length } of ${ checked } matched words have their twin outside the other element: ${ shown }` : null };
}
