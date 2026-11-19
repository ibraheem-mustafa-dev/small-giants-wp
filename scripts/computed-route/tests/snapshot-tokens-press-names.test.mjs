// A pressed look goes to the preset the button wears, under whatever name the site's snapshot carries (Spec 32 FR-32-2):
// pressTokens keeps no list of names, and refuses only the two styles that are not presets (`link`, `custom`).
// MUST FAIL cases: each goes red if the rule it names is removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pressTokens } from '../lib/snapshot-tokens.mjs';

const look = { declared: { transform: 'scale(0.98)', 'box-shadow': 'none' } };

test( 'MUST FAIL: a preset named outside the starters takes the pressed look', () => {
	const { tokens, gaps } = pressTokens( look, 'gold-large' );
	assert.deepEqual( gaps, [] );
	assert.ok( Object.keys( tokens ).length > 0, 'the pressed transform and shadow are written' );
} );

test( 'a starter name and the site-wide default still take it (negative control)', () => {
	for ( const v of [ 'primary', 'secondary', 'outline', 'default' ] ) {
		assert.deepEqual( pressTokens( look, v ).gaps, [], v );
	}
	assert.deepEqual( pressTokens( look, 'gold-large' ).tokens, pressTokens( look, 'primary' ).tokens, 'the same look gives the same tokens under any name' );
} );

test( 'MUST FAIL: link and custom are not presets, so the press writes nothing and says why', () => {
	for ( const v of [ 'link', 'custom' ] ) {
		const r = pressTokens( look, v );
		assert.deepEqual( r.tokens, {}, v );
		assert.equal( r.gaps.length, 1, v );
	}
} );

test( 'a missing variant writes nothing and says why', () => {
	for ( const v of [ '', undefined, null ] ) {
		assert.deepEqual( pressTokens( look, v ).tokens, {} );
		assert.equal( pressTokens( look, v ).gaps.length, 1 );
	}
} );
