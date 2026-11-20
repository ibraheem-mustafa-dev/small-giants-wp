// Fill's live opener (lib/fill-open.mjs::openOwner): a surface opens through the control that names the id of the root or
// one of its ancestors in aria-controls, in data-sgs-modal-open, or as a `#<id>` link (an sgs/modal frame's anchor).
// Restores eb0f28a5d's opener rule, lost in the 2026-11-02 rewind: knowing only aria-controls, the walk never clicked the
// lens flow's buy-box button or a size-guide link, so both roots stayed hidden ('root element is missing', 2026-11-01).
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
	// A control marked `inside` sits in the outermost element of the chain (the frame's own close).
	controls.forEach( ( c ) => c.inside && ( c.parentElement = els.at( -1 ) ) );
	// The page's controls that one of the selector's parts names (an attribute present, or an in-page link).
	const hit = ( c, s ) => ( 'a[href^="#"]' === s ? String( c.getAttribute( 'href' ) ?? '' ).startsWith( '#' ) : /^\[[\w-]+\]$/.test( s ) && null !== c.getAttribute( s.slice( 1, -1 ) ) );
	globalThis.document = { documentElement: docEl, querySelector: () => els[ 0 ], querySelectorAll: ( q ) => controls.filter( ( c ) => q.split( ',' ).some( ( s ) => hit( c, s.trim() ) ) ) };
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
	assert.equal( run( [ {}, { id: 'frame-1' } ], [ control( { 'aria-controls': 'frame-10 menu' } ) ] ).clicked, false, 'an aria-controls list naming a longer id' );
	const own = { ...control( { href: '#frame-1' } ), inside: true };
	assert.equal( run( [ {}, { id: 'frame-1' } ], [ own ] ).clicked, false, 'a link inside the frame is not its opener' );
	assert.equal( own.clicked, undefined );
	const open = run( [ {}, { id: 'frame-1', openDialog: true } ], [ control( { href: '#frame-1' } ) ] );
	assert.deepEqual( open, { clicked: false, id: 'frame-1', why: '#frame-1 is open already' } );
} );
