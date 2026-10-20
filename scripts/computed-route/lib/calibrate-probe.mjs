// Calibration's probe trigger (Spec 48 FR-48-81): how to enter a setting state that has no dedicated trigger (disabled,
// closed and the rest the classifier tags from the state vocabulary). The vocabulary's mechanisms for that state (the
// framework DB's `states` rows: an attribute set, a class added, a pseudo-class forced) are tried in turn on the marked
// target, then on each ancestor up to the instance root, and the first one that changes the setting's property is
// kept. Measured, never parsed: a selector a block builds in PHP from variables is found the same way as one in its
// stylesheet. Every mechanism is undone before the next is tried.

import { stateRows } from './state-vocab.mjs';

export const PROBE_REACHES = [ 'set-attribute', 'toggle-class', 'force-pseudo' ];
const HOST = 'data-cr-probe-host';

// The vocabulary rows a probe tries for a state, in vocabulary order. A prefix token (`[data-state`, `is-effect-`)
// names no single value to apply, so it is left out.
export function probeMechanisms( state, rows = stateRows() ) {
	return rows.filter( ( r ) => r.state === state && PROBE_REACHES.includes( r.reach ) && 'media' !== r.kind && ! ( r.token.startsWith( '[' ) && ! r.token.endsWith( ']' ) ) && ! r.token.endsWith( '-' ) );
}

// In-page: marks the host `up` levels above the target (never past the instance root) and applies one attribute or
// class mechanism to it. Returns what to undo, { pseudo } for a pseudo-class the node side forces, or null when there
// is no host that high.
export function applyInPage( [ rootSel, up, m, hostAttr ] ) {
	const root = document.querySelector( rootSel );
	let host = document.querySelector( '[data-cr-target]' );
	for ( let i = 0; host && i < up; i++ ) {
		host = host === root || ! host.parentElement ? null : host.parentElement;
	}
	if ( ! host ) {
		return null;
	}
	host.setAttribute( hostAttr, '1' );
	if ( 'pseudo-class' === m.kind ) {
		return { pseudo: m.token.slice( 1 ) };
	}
	if ( m.token.startsWith( '[' ) ) {
		const a = /^\[\s*([\w-]+)(?:\s*([~|^$*]?=)\s*["']?([^"'\]]*)["']?)?/.exec( m.token );
		const before = host.getAttribute( a[ 1 ] );
		let value = '';
		if ( undefined !== a[ 3 ] ) {
			value = '~=' === a[ 2 ] && before ? `${ before } ${ a[ 3 ] }` : a[ 3 ];
		} else if ( 'aria-current' === a[ 1 ] ) {
			value = 'page';
		}
		host.setAttribute( a[ 1 ], value );
		return { attr: a[ 1 ], before };
	}
	// A BEM modifier joins each of the host's own BEM classes; a plain state class is added as it is.
	const classes = m.token.startsWith( '--' ) ? [ ...host.classList ].filter( ( c ) => /^sgs-[a-z0-9-]+(?:__[a-z0-9-]+)?$/.test( c ) ).map( ( c ) => `${ c }${ m.token }` ) : [ m.token ];
	const added = classes.filter( ( c ) => ! host.classList.contains( c ) );
	host.classList.add( ...added );
	return { added };
}

// In-page: undoes applyInPage on the marked host and clears the mark.
export function undoInPage( [ hostAttr, undo ] ) {
	const host = document.querySelector( `[${ hostAttr }]` );
	if ( host && undo?.attr ) {
		if ( null === undo.before ) {
			host.removeAttribute( undo.attr );
		} else {
			host.setAttribute( undo.attr, undo.before );
		}
	}
	if ( host && undo?.added ) {
		host.classList.remove( ...undo.added );
	}
	host?.removeAttribute( hostAttr );
}

// Whether a read under a mechanism changes any of `props` on any element from the resting read.
export function changed( rest, read, props ) {
	return Object.entries( read || {} ).some( ( [ el, vals ] ) => props.some( ( p ) => undefined !== vals?.[ p ] && vals[ p ] !== rest?.[ el ]?.[ p ] ) );
}

// Probes one state instance. read(): the instance's read now (lib/calibrate-read.mjs::readInstancesInPage for it);
// rootSel: its root; props: the setting's CSS properties; mechanisms: probeMechanisms(state); cdp: a DevTools session
// for forced pseudo-classes. The target must already carry data-cr-target. Returns { read, how } or { read: null, why }.
export async function probeState( { page, cdp, read, rootSel, props, mechanisms, maxUp = 4 } ) {
	const rest = await read();
	if ( ! rest ) {
		return { read: null, why: 'no instance' };
	}
	// CSS.forcePseudoState needs both agents enabled on this session.
	if ( mechanisms.some( ( m ) => 'pseudo-class' === m.kind ) ) {
		await cdp.send( 'DOM.enable' );
		await cdp.send( 'CSS.enable' );
	}
	for ( const m of mechanisms ) {
		for ( let up = 0; up <= maxUp; up++ ) {
			const undo = await page.evaluate( applyInPage, [ rootSel, up, m, HOST ] );
			if ( ! undo ) {
				break;
			}
			let nodeId = null;
			try {
				if ( undo.pseudo ) {
					const { root } = await cdp.send( 'DOM.getDocument', { depth: 0 } );
					( { nodeId } = await cdp.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: `[${ HOST }]` } ) );
					await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [ undo.pseudo ] } );
				}
				await page.waitForTimeout( 150 );
				const now = await read();
				if ( changed( rest, now, props ) ) {
					return { read: now, how: `${ m.token } on ${ 0 === up ? 'the target' : `its ancestor ${ up } up` }` };
				}
			} finally {
				if ( nodeId ) {
					await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
				}
				await page.evaluate( undoInPage, [ HOST, undo ] );
			}
		}
	}
	return { read: null, why: `no state mechanism the vocabulary names for this state changes ${ props.join( ', ' ) }` };
}
