// Track W context reads (Spec 48 section 3.6 item 24): direction, column-count and column-width are in the calibration
// read list, and the key every calibration cache file carries is derived from that list, so they re-measure every site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, INHERITED, OWN_INHERITED, READ_KEY } from '../lib/calibrate-props.mjs';
import { measurements } from '../lib/ledger.mjs';

const keyOf = ( props ) => createHash( 'md5' ).update( JSON.stringify( [ props, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, INHERITED, OWN_INHERITED ] ) ).digest( 'hex' ).slice( 0, 12 );

test( 'MUST FAIL: calibration reads the three context properties and its read key follows the list', () => {
	for ( const p of [ 'direction', 'column-count', 'column-width' ] ) {
		assert.ok( READ_PROPS.includes( p ), p );
	}
	assert.equal( READ_KEY, keyOf( READ_PROPS ) );
	assert.notEqual( READ_KEY, keyOf( READ_PROPS.filter( ( p ) => 'direction' !== p ) ), 'dropping a context read changes the key (control)' );
} );

test( 'MUST FAIL: the divergence ledger records no measurement for a context property, and still does for a compared one', () => {
	const styles = ( v ) => ( { direction: v, 'column-count': 'auto', 'column-width': 'auto', color: v } );
	const report = { runs: [ { state: 'default', width: 375, pairs: { a: { draft: { styles: styles( 'ltr' ) }, live: { styles: styles( 'rtl' ), trace: { ref: 'r', block: 'sgs/x', path: 'p' } } } } } ] };
	assert.deepEqual( measurements( report ).map( ( m ) => m.property ), [ 'color' ] );
} );
