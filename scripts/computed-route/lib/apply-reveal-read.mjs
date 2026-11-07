// The applier's read of draft elements that exist only in a reveal state (lib/skeleton-reveal.mjs): an accordion's answer, a
// later step of a form. A pair carries `reveal: { component, keys }` (lib/refresh-pairs.mjs); the draft is opened as every other
// read opens it (lib/pairs-page.mjs::openDraft) with the walker state `{ draft }` that puts the component in those keys through
// the draft's own logic (lib/intake-state.mjs::setDraftState), and the pair's element is read there. Pairs with one reveal share
// one page.
import { setDraftState } from './intake-state.mjs';
import { revealId } from './reveal-merge.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';

// The pairs that need a reveal state, grouped by it: [ { reveal, pairs } ].
export function revealGroups( pairs ) {
	const groups = new Map();
	for ( const p of pairs ) {
		if ( p.reveal ) {
			const id = revealId( p.reveal );
			groups.set( id, { reveal: p.reveal, pairs: [ ...( groups.get( id )?.pairs || [] ), p ] } );
		}
	}
	return [ ...groups.values() ];
}

// The walker state (lib/pairs-page.mjs::openDraft's `state`) that puts the draft in a reveal state. Throws when the component is
// not mounted, so a read never silently measures the opening state.
export const revealState = ( reveal ) => ( {
	draft: async ( h ) => {
		if ( ! await setDraftState( h.page, reveal ) ) {
			throw new Error( `${ reveal.component } is not mounted: cannot show ${ JSON.stringify( reveal.keys ) }` );
		}
		await settleAnimations( h.page, { floor: 500, cap: 3000 } );
	},
} );

// Reads every reveal group on the draft. open: lib/pairs-page.mjs::openDraft (or the prepared wrapper); readPage( page, pairs ):
// the facts of those pairs as the caller reads them ({ facts, animate }); ready( page ): whether the draft rendered. Returns
// { facts, animate } to merge into the opening state's read.
export async function readRevealGroups( { open, cfg, width, pairs, readPage, ready } ) {
	const out = { facts: {}, animate: [] };
	for ( const group of revealGroups( pairs ) ) {
		let done = false;
		for ( let attempt = 0; attempt < 3 && ! done; attempt++ ) {
			const page = await open( cfg, width, revealState( group.reveal ) );
			try {
				if ( await ready( page ) ) {
					const read = await readPage( page, group.pairs );
					Object.assign( out.facts, read.facts );
					out.animate.push( ...( read.animate || [] ) );
					done = true;
				}
			} finally {
				await page.close();
			}
		}
		if ( ! done ) {
			throw new Error( `the draft did not render in the state ${ JSON.stringify( group.reveal.keys ) } at ${ width }` );
		}
	}
	return out;
}
