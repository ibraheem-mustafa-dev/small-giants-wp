// Spec 48 FR-48-8 (the env() part), lib/fill-safe-area.mjs: a declaration that asks the device safe-area inset renders only its
// fixed part where the draft has no viewport-fit=cover; the confirm record names that, and the rendered value is the one written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAreaSides, fixedPart, safeAreaRead } from '../lib/fill-safe-area.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';

const FOOT = 'calc(16px + env(safe-area-inset-bottom))';

test( 'MUST FAIL: the sides a declaration asks the inset for are read, and a declaration without one is not a safe-area read', () => {
	assert.deepEqual( safeAreaSides( FOOT ), [ 'bottom' ] );
	assert.deepEqual( safeAreaSides( 'max(12px, env(safe-area-inset-left, 0px)) env(safe-area-inset-right)' ), [ 'left', 'right' ] );
	assert.equal( safeAreaRead( 'calc(16px + 2vw)', '20px' ), null );
	assert.equal( safeAreaRead( null, '16px' ), null );
} );

test( 'MUST FAIL: the fixed part of a sum or a maximum is the value with the inset taken as 0', () => {
	assert.equal( fixedPart( FOOT ), 16 );
	assert.equal( fixedPart( 'max(12px, env(safe-area-inset-top))' ), 12 );
	assert.equal( fixedPart( 'env(safe-area-inset-top)' ), 0 );
	assert.equal( fixedPart( 'calc(1rem + env(safe-area-inset-bottom))' ), null );
} );

test( 'MUST FAIL: the drawer foot renders 16px with no inset, and the read says so; a render that shows an inset is named', () => {
	const none = safeAreaRead( FOOT, '16px' );
	assert.equal( none.noInset, true );
	assert.match( none.note, /renders 0 in the draft \(no viewport-fit=cover\), so the rendered 16px is written/ );
	const inset = safeAreaRead( FOOT, '50px' );
	assert.equal( inset.noInset, false );
	assert.match( inset.note, /draft renders 50px where its fixed part is 16px/ );
} );

test( 'MUST FAIL: the confirm record of the written padding carries the safe-area read, at each width, from the declared and rendered values', () => {
	const nodes = [ { targets: [ { slot: '', id: '0:', finder: { tpl: 'Page/5#0' } } ] } ];
	const reads = { widths: { 375: { '0:': { styles: { 'padding-bottom': '16px', 'font-size': '16px' } } } }, declared: { 375: { '0:': { 'padding-bottom': FOOT } } } };
	const writes = [ { node: 'cr-ref-f-1', index: 0, block: 'sgs/nav-drawer', slot: '', prop: 'padding-bottom', attr: 'footPadding', after: { mobile: '16px' } } ];
	const [ rec ] = confirmRecords( { writes, nodes, reads, rootComponent: 'Page' } );
	assert.equal( rec.safeArea.noInset, true );
	assert.deepEqual( rec.safeArea.sides, [ 'bottom' ] );
	assert.equal( rec.renderedDraft, '16px' );
	assert.equal( rec.verdict, 'confirmed' );
	const plain = confirmRecords( { writes, nodes, reads: { ...reads, declared: { 375: { '0:': { 'padding-bottom': '16px' } } } }, rootComponent: 'Page' } )[ 0 ];
	assert.equal( plain.safeArea, undefined );
} );
