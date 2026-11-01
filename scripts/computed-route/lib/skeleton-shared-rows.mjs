// A row intake collapsed across surfaces (Spec 48 FR-48-17): one template element shown on several surfaces is kept once,
// under the first surface's `skeletons[<surface>].rows`, and names the other surfaces in `alsoIn: [ { surface, keys } ]`.
// Bean's outcome for that row (his recorded decision, or the finaliser pick the row carries) was meant for every copy, so
// when a surface is proposed, the outcome of each row naming it in `alsoIn` applies to the key `alsoIn` gives it here, by key
// and never by words: the collapse already decided the copies are one slot, so a decision carried here has no signature to go
// stale on. A decision saved directly on the surface's own row is not touched here; the caller lets it win.

import { servedKey } from './key-space.mjs';

// The pick a finalised row carries, in the shape lib/skeleton-classify.mjs::overrideFor reads; null for a row nobody picked.
function pickOf( r ) {
	if ( 'agent' !== r.finalisedBy ) {
		return null;
	}
	const base = { confidence: r.confidence ?? 0.8, reason: r.reason || '' };
	if ( 'remove' === r.action ) {
		return { remove: true, ...base };
	}
	return r.block ? { block: r.block, ...( r.attributes ? { attributes: r.attributes } : {} ), ...base } : null;
}

// The rows of the other surfaces that name `surface` in `alsoIn`, each with the keys `alsoIn` gives it here:
// [ { from, row, keys } ] in intake's order.
const rowsNaming = ( skeletons, surface ) => Object.entries( skeletons || {} ).filter( ( [ name ] ) => name !== surface ).flatMap( ( [ from, s ] ) => ( s.rows || [] ).flatMap( ( row ) => ( row.alsoIn || [] ).filter( ( a ) => a?.surface === surface ).map( ( a ) => ( { from, row, keys: a.keys || [] } ) ) ) );

// What the other surfaces' reviewed rows decide for `surface`'s keys: { decisions: { <key>: decision }, picks: { <key>: pick } },
// keyed in the served space when `rootComponent` is given (the proposal's inventory is served: lib/key-space.mjs::servedKey).
// skeletons: intake.json `skeletons`; decisions: the client's decisions.json (`surfaces: { <intake surface>: { <key>: ... } }`).
// A row's recorded decision wins over its pick; the first row to name a key wins.
export function sharedOverrides( { skeletons, surface, decisions = {}, rootComponent = null } ) {
	const out = { decisions: {}, picks: {} };
	for ( const { from, row, keys } of rowsNaming( skeletons, surface ) ) {
		const decided = decisions.surfaces?.[ from ]?.[ row.key ];
		const [ bucket, value ] = decided ? [ out.decisions, { ...decided, signature: undefined } ] : [ out.picks, pickOf( row ) ];
		for ( const key of value ? keys.map( ( k ) => servedKey( k, rootComponent ) ) : [] ) {
			if ( ! ( key in out.decisions ) && ! ( key in out.picks ) ) {
				bucket[ key ] = { ...value };
				delete bucket[ key ].signature;
			}
		}
	}
	return out;
}
