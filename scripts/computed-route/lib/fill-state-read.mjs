// The draft's state looks (Spec 48 FR-48-81, the states wave): what each target's code declares while a state holds,
// beside FR-48-8's resting read (lib/fill-declared.mjs). A state is anything the framework's state vocabulary names
// (the framework DB's `states` table, seeded from plugins/sgs-blocks/scripts/data/states.json): a pseudo-class, an ARIA
// or native attribute, a state class or a data attribute. For every style rule of the draft whose selector carries one,
// and which matches the target once its state tokens are taken out, the reader enters the state on the element that
// carries it (the host, the target or an ancestor: `.card:hover .title`, `.burger[aria-expanded="true"] .bar`), reads
// the target's declared values and their render, and restores the page. Code first, the render confirms (R-47-4).

import { declaredValues, settleAnimations } from '../../parity/lib/devtools.mjs';
import { applyToken, renderedOf } from './fill-state-apply.mjs';
import { readableRows, stateCombos } from './fill-state-combos.mjs';
import { codeLooks } from './fill-state-code.mjs';
import { pseudoDeclared, pseudoRenderedOf } from './fill-state-pseudo.mjs';
import { reasonOf } from './fill-state-reason.mjs';
import { readScriptLooks } from './fill-state-script.mjs';

const HOST_ATTR = 'data-sgs-state-host';

// What changes between two declared reads: { prop: value } for each property the state declares differently.
export function declaredDiff( rest, state ) {
	return Object.fromEntries( Object.entries( state || {} ).filter( ( [ p, v ] ) => ( rest || {} )[ p ] !== v ) );
}

// Every state look of every target at the page's current width: { [targetId]: [{ states, family, selector, tokens,
// declared, rendered, read }] } for each combination whose declared values differ from rest, and `unreached`: the
// combinations the page cannot enter whose rules declare nothing to read; a look the draft's script sets on pointer or
// focus has `read: 'script'` (lib/fill-state-script.mjs). A state the browser never exposes (:visited)
// or whose host was not found is read from its stylesheet rules (lib/fill-state-code.mjs, `read: 'code'`, rendered
// null: the render cannot confirm it); an entered state has `read: 'entered'`. page/cdp: the open
// draft page and its DevTools session (lib/fill-read.mjs::readDraft); jobs: lib/fill-read.mjs::jobsFor; rows: the
// state vocabulary; rest: the resting declared read at this width ({ [targetId]: { prop: value } }).
export async function readStates( { page, cdp, jobs, rows, rest, resolveSrc, log = () => {} } ) {
	const vocab = readableRows( rows );
	const combos = await page.evaluate( stateCombos, [ jobs, vocab, resolveSrc, HOST_ATTR ] );
	const byI = new Map( vocab.map( ( r ) => [ r.i, r ] ) );
	const out = { looks: {}, unreached: [] };
	const pseudoRests = new Map();
	try {
		for ( const job of jobs ) {
			const blocked = [];
			for ( const combo of combos[ job.id ] || [] ) {
				if ( combo.unreadable ) {
					out.unreached.push( { id: job.id, selector: combo.selector, why: combo.unreadable } );
					continue;
				}
				const tokens = combo.tokens.map( ( t ) => ( { ...t, row: byI.get( t.i ) } ) );
				if ( tokens.some( ( t ) => 'unreachable' === t.row.reach || null === t.host ) ) {
					if ( combo.pseudo ) {
						out.unreached.push( { id: job.id, selector: combo.selector, why: `${ reasonOf( tokens ) }; a state look of a pseudo-element is entered, never read from code` } );
						continue;
					}
					blocked.push( { combo, tokens } );
					continue;
				}
				const look = await readOne( page, cdp, job, tokens, resolveSrc, combo.pseudo ).catch( ( e ) => {
					log( `state read failed for ${ job.id } (${ combo.selector }): ${ e.message }` );
					return null;
				} );
				// A pseudo-element's look differs from the pseudo-element's own resting values, not the element's.
				const restKey = `${ job.id }|${ combo.pseudo }`;
				if ( combo.pseudo && ! pseudoRests.has( restKey ) ) {
					pseudoRests.set( restKey, ( await readOne( page, cdp, job, [], resolveSrc, combo.pseudo ).catch( ( e ) => log( `pseudo-element resting read failed for ${ job.id } (${ combo.pseudo }): ${ e.message }` ) ) )?.declared ?? null );
				}
				if ( combo.pseudo && ! pseudoRests.get( restKey ) ) { // every declared property would read as a change without the resting values
					log( `state look ${ combo.selector } of ${ job.id } skipped: the ${ combo.pseudo } resting values could not be read` );
					continue;
				}
				const restOf = combo.pseudo ? pseudoRests.get( restKey ) : rest?.[ job.id ];
				const declared = declaredDiff( restOf, look?.declared );
				if ( look && Object.keys( declared ).length ) {
					const states = [ ...new Set( tokens.map( ( t ) => t.row.state ) ) ];
					out.looks[ job.id ] ??= [];
					out.looks[ job.id ].push( { states, family: tokens[ 0 ].row.family, selector: combo.selector, tokens: tokens.map( ( t ) => t.text ), declared, rendered: look.rendered, read: 'entered', ...( combo.pseudo ? { pseudo: combo.pseudo } : {} ) } );
				}
			}
			const code = codeLooks( { id: job.id, blocked, rest: rest?.[ job.id ], reasonOf } );
			if ( code.looks.length ) {
				( out.looks[ job.id ] ??= [] ).push( ...code.looks );
			}
			out.unreached.push( ...code.unreached );
		}
		// The looks the draft's script sets on pointer or focus (lib/fill-state-script.mjs), beside the stylesheet's.
		Object.entries( await readScriptLooks( { page, cdp, jobs, resolveSrc, log } ) ).forEach( ( [ id, list ] ) => ( out.looks[ id ] ??= [] ).push( ...list ) );
	} finally {
		await page.evaluate( ( a ) => document.querySelectorAll( `[${ a }]` ).forEach( ( e ) => e.removeAttribute( a ) ), HOST_ATTR );
	}
	return out;
}

// One combination: enter every token's state on its host, read the target, leave in reverse order.
async function readOne( page, cdp, job, tokens, resolveSrc, pseudoName = null ) {
	const hostSel = ( t ) => `[${ HOST_ATTR }="${ t.host }"]`;
	const pseudo = tokens.filter( ( t ) => 'force-pseudo' === t.row.reach );
	const others = tokens.filter( ( t ) => 'force-pseudo' !== t.row.reach );
	const saved = [];
	try {
		for ( const t of others ) {
			saved.push( [ t, await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, true, null ] ) ] );
		}
		const read = async () => {
			const declared = pseudoName ? await pseudoDeclared( cdp, job.finder, resolveSrc, pseudoName, pseudo.length > 0 ) : await declaredValues( cdp, job.finder, resolveSrc, null, { keepDocument: pseudo.length > 0 } );
			const rendered = declared ? await page.evaluate( pseudoName ? pseudoRenderedOf : renderedOf, [ job.finder, resolveSrc, Object.keys( declared ), pseudoName ] ) : null;
			return { declared, rendered };
		};
		if ( ! pseudo.length ) {
			await settleAnimations( page, { floor: 30, cap: 3000 } );
			return await read();
		}
		// Every host's own pseudo-classes are forced at once (`.card:hover .title:focus` forces :hover on the card and
		// :focus on the title), then cleared.
		const byHost = new Map();
		pseudo.forEach( ( t ) => byHost.set( t.host, [ ...( byHost.get( t.host ) || [] ), t.text.slice( 1 ) ] ) );
		const { root } = await cdp.send( 'DOM.getDocument', { depth: 0 } );
		const nodes = [];
		for ( const [ host, states ] of byHost ) {
			const { nodeId } = await cdp.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: `[${ HOST_ATTR }="${ host }"]` } );
			if ( nodeId ) {
				nodes.push( nodeId );
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states } );
			}
		}
		try {
			await settleAnimations( page, { floor: 30, cap: 3000 } );
			return await read();
		} finally {
			for ( const nodeId of nodes ) {
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
			}
			await settleAnimations( page, { floor: 0, cap: 3000 } );
		}
	} finally {
		for ( const [ t, s ] of saved.reverse() ) {
			if ( s ) {
				await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, false, s ] );
			}
		}
	}
}
