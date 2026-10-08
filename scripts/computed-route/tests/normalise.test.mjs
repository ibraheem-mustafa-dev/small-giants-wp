// Proves R-47-7: tokens before literals, exact then nearest within tolerance, every snap logged with its distance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLength, toPx, pxTo, parseColour, deltaE, snapColour, snapLength, snapFontFamily } from '../lib/normalise.mjs';

const snapshot = {
	palette: [ { slug: 'text', colour: parseColour( '#141414' ) }, { slug: 'text-label', colour: parseColour( '#8A8278' ) }, { slug: 'primary', colour: parseColour( '#141414' ) } ],
	spacing: [ { slug: '30', px: 16 }, { slug: '40', px: 24 } ],
};

test( 'parses and converts lengths', () => {
	assert.deepEqual( parseLength( '12.5px' ), { n: 12.5, unit: 'px' } );
	assert.equal( toPx( '1.5em', 14 ), 21 );
	assert.equal( pxTo( 2.3, 'em', 11.5 ), 0.2 );
} );

test( 'snaps an exact colour to its slug and prefers the slug the node holds on a tie', () => {
	const log = [];
	assert.equal( snapColour( 'rgb(20, 20, 20)', snapshot, { log } ).value, 'text' );
	assert.equal( snapColour( 'rgb(20, 20, 20)', snapshot, { log, prefer: 'primary' } ).value, 'primary' );
	assert.equal( log[ 0 ].kind, 'exact' );
} );

test( 'snaps a near colour within ΔE 2 and logs the distance', () => {
	const log = [];
	const s = snapColour( 'rgb(139, 130, 120)', snapshot, { log } );
	assert.equal( s.value, 'text-label' );
	assert.ok( log[ 0 ].distance > 0 && log[ 0 ].distance <= 2 );
} );

test( 'MUST FAIL TO SNAP: a colour just beyond ΔE 2 (2.72 from text-label) stays a flagged literal', () => {
	const log = [];
	const s = snapColour( 'rgb(145, 137, 127)', snapshot, { log } );
	assert.ok( deltaE( parseColour( '#91897F' ), parseColour( '#8A8278' ) ) > 2 );
	assert.equal( s.form, 'hex' );
	assert.equal( s.value, '#91897F' );
	assert.equal( log[ 0 ].kind, 'literal' );
} );

test( 'snaps lengths to spacing tokens within 0.5px, else null', () => {
	assert.equal( snapLength( 16.4, snapshot.spacing ).slug, '30' );
	assert.equal( snapLength( 18, snapshot.spacing ), null );
} );

test( 'MUST FAIL (Contact footnote, 2026-10-08): a measured font stack snaps to the font-family preset whose first family matches', () => {
	const snapshot = { fontFamilies: [ { slug: 'body', family: 'outfit' }, { slug: 'heading', family: 'playfair display' }, { slug: 'outfit', family: 'outfit' } ] };
	const log = [];
	assert.equal( snapFontFamily( 'Outfit, sans-serif', snapshot, { log } ), 'body', 'the first preset in theme order wins a tie' );
	assert.equal( snapFontFamily( '"Playfair Display", serif', snapshot, { log } ), 'heading', 'quotes and case are ignored' );
	assert.equal( snapFontFamily( 'Outfit, sans-serif', snapshot, { log, prefer: 'outfit' } ), 'outfit', 'the slug the node already holds wins a tie' );
	assert.equal( snapFontFamily( 'Georgia, serif', snapshot, { log } ), null, 'a family the theme does not define stays a literal' );
	assert.equal( log.at( -1 ).kind, 'literal' );
} );
