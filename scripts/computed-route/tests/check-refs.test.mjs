// check-refs (Spec 47 §3.4): the verdict logic, offline. A draft link must name exactly one draft element: a finder that
// resolves to nothing is missing; a selector matching several elements, or two targets resolving to one element, is
// ambiguous; a slot outside its node is outside. A tpl finder is unique by construction, so its raw count is only information.
import test from 'node:test';
import assert from 'node:assert/strict';
import { refStatus, skeletonTargets } from '../check-refs.mjs';

const e = ( id, o = {} ) => ( { id, kind: 'tpl', found: true, element: Number( id.split( ':' )[ 0 ] ), rawCount: 1, inside: null, ...o } );
const status = ( list ) => refStatus( list ).map( ( r ) => r.status );

test( 'MUST FAIL: a missing finder, an ambiguous selector, a shared element and an outside slot are each refused; a clean set passes', () => {
	assert.deepEqual( status( [ e( '0:' ), e( '1:' ), e( '2:' ) ] ), [ 'ok', 'ok', 'ok' ] );
	assert.deepEqual( status( [ e( '0:', { found: false, element: null } ) ] ), [ 'missing' ] );
	assert.deepEqual( status( [ e( '0:', { kind: 'selector', rawCount: 3 } ) ] ), [ 'ambiguous' ] );
	assert.deepEqual( status( [ e( '0:', { element: 7 } ), e( '1:', { element: 7 } ) ] ), [ 'ambiguous', 'ambiguous' ], 'two nodes copying one element' );
	assert.deepEqual( status( [ e( '0:' ), e( '0:svg', { element: 5, inside: false } ) ] ), [ 'ok', 'outside' ] );
	assert.match( refStatus( [ e( '0:', { kind: 'selector', rawCount: 2 } ) ] )[ 0 ].reason, /matches 2 elements/ );
} );

test( 'a tpl finder is unique even when the bare data-dc-tpl number matches several elements; a selector matching one is fine', () => {
	assert.deepEqual( status( [ e( '0:', { rawCount: 9 } ), e( '1:', { kind: 'selector', rawCount: 1 } ) ] ), [ 'ok', 'ok' ] );
} );

test( 'skeletonTargets lists every draftRef and draftSlots finder, and the icons a Site Info row generates', () => {
	const t = skeletonTargets( [
		{ name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
			{ name: 'sgs/icon', draftRef: { tpl: 'Root/2#0' }, draftSlots: { svg: { tpl: 'Root/3#0' } } },
			{ name: 'sgs/social-icons', draftRef: '.row', siteInfoRow: [ 'instagram', 'x' ], childRefs: { instagram: 'a.ig', x: 'a.x' } },
			{ name: 'sgs/text' },
		] },
	] );
	// Each generated icon also names its glyph inside its draft link (fill-skeleton.mjs::ROW_GLYPH_SLOT).
	const glyph = '.sgs-icon__shape > .sgs-icon__svg';
	assert.deepEqual( t.map( ( x ) => [ x.id, x.kind ] ), [ [ '0:', 'tpl' ], [ '1:', 'tpl' ], [ '1:svg', 'tpl' ], [ '2:', 'selector' ], [ '3:', 'selector' ], [ `3:${ glyph }`, 'selector' ], [ '4:', 'selector' ], [ `4:${ glyph }`, 'selector' ] ] );
	assert.equal( t[ 2 ].parentId, '1:' );
	assert.equal( t[ 3 ].finder, '.row' );
	assert.equal( t[ 4 ].finder, '.row a.ig' );
} );
