// Fill's live opener (lib/fill-open.mjs::openOwner): a surface opens through the control that names the id of the root or
// one of its ancestors in aria-controls, in data-sgs-modal-open, or as a `#<id>` link (an sgs/modal frame's anchor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openOwner } from '../lib/fill-open.mjs';

// Runs openOwner on a minimal DOM stand-in: `chain` is the element and its ancestors, `controls` the page's controls.
function run( chain, controls, root = '.r' ) {
	const docEl = {};
	const els = chain.map( ( e ) => ( { ...e } ) );
	els.forEach( ( e, i ) => {
		e.parentElement = els[ i + 1 ] || docEl;
		e.contains = ( b ) => {
			for ( let p = b; p; p = p.parentElement ) {
				if ( p === e ) {
					return true;
				}
			}
			return false;
		};
		e.querySelector = ( q ) => ( e.openDialog && 'dialog[open]' === q ? {} : null );
	} );
	globalThis.document = { documentElement: docEl, querySelector: () => els[ 0 ], querySelectorAll: () => controls };
	return openOwner( root );
}
const control = ( attrs, shown = true ) => ( { getAttribute: ( k ) => attrs[ k ] ?? null, getClientRects: () => ( shown ? [ 1 ] : [] ), click() { this.clicked = true; } } );

test( 'MUST FAIL WITHOUT MODAL CONTROLS: a data-sgs-modal-open button and a #anchor link open the sgs/modal frame holding the root', () => {
	for ( const attrs of [ { 'data-sgs-modal-open': 'frame-1' }, { href: '#frame-1' }, { 'aria-controls': 'a frame-1' } ] ) {
		const c = control( attrs );
		const r = run( [ {}, { id: 'frame-1' } ], [ c ] );
		assert.deepEqual( r, { clicked: true, id: 'frame-1', why: null } );
		assert.equal( c.clicked, true );
	}
} );

test( 'openOwner: a control naming another id does not open it; a frame whose dialog is open is left as it is', () => {
	const other = control( { 'data-sgs-modal-open': 'elsewhere', href: '#nope' } );
	assert.equal( run( [ {}, { id: 'frame-1' } ], [ other ] ).clicked, false );
	assert.match( run( [ {}, { id: 'frame-1' } ], [ other ] ).why, /nothing on the page controls/ );
	const open = run( [ {}, { id: 'frame-1', openDialog: true } ], [ control( { href: '#frame-1' } ) ] );
	assert.deepEqual( open, { clicked: false, id: 'frame-1', why: '#frame-1 is open already' } );
} );
