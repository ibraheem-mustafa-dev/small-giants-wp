// The browser's own focus ring (Spec 48 FR-48-81): an element the draft gives no focus outline shows the browser's ring,
// which no declared read carries, so Fill writes it as the site ring's tokens; a ring the draft declares replaces it, and a
// draft that clears the outline and declares no focus look is reported, never written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ringLook, applyTokenLooks, createPatch, conflictRow, BROWSER_RING } from '../lib/fill-state-tokens.mjs';

const from = ( node ) => ( { node, block: 'sgs/button', slot: '', index: 0 } );
// stateDrafts' shape: `${ state }|${ pseudo }|${ prop }` → { state, prop, pseudo, perWidth }.
const draftsOf = ( looks ) => new Map( Object.entries( looks ).flatMap( ( [ state, decl ] ) => Object.entries( decl ).map( ( [ prop, v ] ) => [ `${ state }||${ prop }`, { state, prop, pseudo: '', perWidth: { 1440: v } } ] ) ) );
const restOf = ( declared ) => ( { declared: { 1440: { t: declared }, 768: { t: declared }, 375: { t: declared } } } );
const ringFor = ( snap, { drafts = new Map(), rest = {}, focus } = {} ) => ringLook( { drafts, reads: restOf( rest ), id: 't', snap, focus } );
const apply = ( sink, node, looks ) => applyTokenLooks( { looks, sink, from: from( node ), target: { tag: 'a' }, variant: null, owned: false } );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a link the draft gives no focus look takes the browser ring as the site ring', () => {
	const ring = ringFor( { tag: 'a', href: 'tel:1' } );
	assert.deepEqual( ring.looks.focus, { ...BROWSER_RING, 'outline-offset': '1px', 'box-shadow': 'none' } );
	const sink = createPatch();
	const unmapped = apply( sink, 'n1', ring.looks );
	const focus = sink.patch.settings.custom.focus;
	assert.equal( focus.width, '1px' );
	assert.equal( focus.ring, '#101010' );
	assert.equal( focus.ringOnDark, '#101010', 'the browser ring is the same on a dark ground' );
	assert.equal( focus.offset, '1px', 'a link is offset 1px' );
	assert.equal( focus.bloom, '0', 'the browser ring has no glow' );
	assert.ok( sink.entries.every( ( e ) => true === e.browser ), 'every key is a browser value' );
	assert.ok( unmapped.some( ( u ) => /^outline-style:auto/.test( u.reason ) && /browser's own focus ring/.test( u.reason ) ), 'the auto style focus.css cannot paint is named' );
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a button keeps the browser ring at no offset; a control or a plain element takes none', () => {
	assert.equal( ringFor( { tag: 'button' } ).looks.focus[ 'outline-offset' ], '0px' );
	assert.equal( ringFor( { tag: 'a' } ).looks.focus[ 'outline-offset' ], '0px', 'a link with no href is not an any-link' );
	assert.equal( ringFor( { tag: 'div', role: 'button' } ).looks.focus[ 'outline-width' ], '1px' );
	assert.equal( ringFor( { tag: 'div' } ), null );
	assert.equal( ringFor( { tag: 'input' } ), null );
	assert.equal( ringFor( { tag: 'input', role: 'button' } ), null, 'a form control paints its own focus look whatever its role' );
	assert.equal( ringFor( {} ), null, 'an element the read did not identify takes nothing' );
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a draft focus outline is the draft\'s own look, never the browser\'s', () => {
	for ( const prop of [ 'outline-color', 'outline-width', 'outline-style', 'outline-offset' ] ) {
		assert.equal( ringFor( { tag: 'a', href: '#' }, { drafts: draftsOf( { focus: { [ prop ]: '2px' } } ) } ), null, prop );
	}
	assert.equal( ringFor( { tag: 'a', href: '#' }, { drafts: draftsOf( { 'focus-visible': { 'outline-color': 'red' } } ) } ), null );
	assert.ok( ringFor( { tag: 'a', href: '#' }, { drafts: draftsOf( { hover: { 'outline-color': 'red' } } ) } ).looks, 'a hover outline is not a focus outline' );
	const pseudo = new Map( [ [ 'focus|::after|outline-color', { state: 'focus', prop: 'outline-color', pseudo: '::after', perWidth: { 1440: 'red' } } ] ] );
	assert.ok( ringFor( { tag: 'a', href: '#' }, { drafts: pseudo } ).looks, 'a pseudo-element outline does not cover the element' );
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a draft focus glow keeps its own keys under the browser outline', () => {
	const glow = '0px 0px 8px 2px rgb(0, 0, 255)';
	const ring = ringFor( { tag: 'button' }, { drafts: draftsOf( { focus: { 'box-shadow': glow } } ), focus: { 'box-shadow': glow } } );
	assert.equal( ring.looks.focus[ 'box-shadow' ], glow );
	assert.ok( ! ring.looks.focusBrowser.includes( 'box-shadow' ) );
	const sink = createPatch();
	apply( sink, 'n1', ring.looks );
	const byPath = Object.fromEntries( sink.entries.map( ( e ) => [ e.path.split( '.' ).pop(), e ] ) );
	assert.equal( byPath.near.value, '#0000ff' );
	assert.ok( ! byPath.near.browser && ! byPath.bloom.browser && ! byPath.source.browser, 'the glow is the draft\'s' );
	assert.ok( byPath.width.browser && byPath.ring.browser );
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a draft ring declared on one target replaces the browser ring of another, whichever comes first', () => {
	const declared = { 'outline-style': 'solid', 'outline-width': '3px', 'outline-color': 'rgb(255, 0, 128)', 'outline-offset': '2px', 'box-shadow': 'none' };
	for ( const order of [ [ 'browser', 'draft' ], [ 'draft', 'browser' ] ] ) {
		const sink = createPatch();
		for ( const which of order ) {
			apply( sink, which, 'browser' === which ? ringFor( { tag: 'a', href: '#' } ).looks : { focus: declared } );
		}
		const focus = sink.patch.settings.custom.focus;
		assert.equal( focus.width, '3px', order.join( ' then ' ) );
		assert.equal( focus.ring, '#ff0080' );
		assert.equal( focus.offset, '2px' );
		const ringEntry = sink.entries.find( ( e ) => 'settings.custom.focus.ring' === e.path );
		assert.equal( ringEntry.node, 'draft' );
		assert.ok( ! ringEntry.browser );
		const conflict = sink.conflicts.find( ( c ) => 'settings.custom.focus.width' === c.path );
		assert.equal( conflict.dropped, '1px', 'the browser value is the dropped one' );
		assert.equal( conflict.kept, '3px' );
		assert.equal( conflictRow( conflict ).node, 'browser' );
		assert.match( conflictRow( conflict ).reason, /replaces the browser ring's "1px"/ );
	}
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: two browser rings at different offsets keep the first and report the second', () => {
	const sink = createPatch();
	apply( sink, 'link', ringFor( { tag: 'a', href: '#' } ).looks );
	apply( sink, 'button', ringFor( { tag: 'button' } ).looks );
	assert.equal( sink.patch.settings.custom.focus.offset, '1px' );
	const row = conflictRow( sink.conflicts.find( ( c ) => 'settings.custom.focus.offset' === c.path ) );
	assert.equal( row.node, 'button' );
	assert.match( row.reason, /the first value is kept/ );
} );

test( 'MUST FAIL WITHOUT THE BROWSER RING: a draft that clears the outline and declares no focus look is reported, never written', () => {
	for ( const rest of [ { 'outline-style': 'none' }, { 'outline-width': '0px' }, { outline: 'none' }, { outline: '0' }, { 'outline-style': 'hidden' } ] ) {
		const ring = ringFor( { tag: 'a', href: '#' }, { rest } );
		assert.equal( ring.looks, undefined, JSON.stringify( rest ) );
		assert.match( ring.gap.reason, /^focus-invisible/ );
		assert.equal( ring.gap.state, 'focus' );
	}
	assert.equal( ringFor( { tag: 'a', href: '#' }, { rest: { 'outline-style': 'none' }, drafts: draftsOf( { focus: { 'box-shadow': '0 0 0 2px red' } } ) } ), null, 'a focus shadow is a visible indicator' );
	assert.ok( ringFor( { tag: 'a', href: '#' }, { rest: { 'outline-style': 'solid', 'outline-width': '2px' } } ).looks, 'a resting outline does not clear the ring' );
} );
