// The page baseline's letter-spacing: an em value scales with the element's own font size, a rem value does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBaseline } from '../lib/fill-page.mjs';

const raw = ( letterSpacing ) => ( { settings: {}, styles: { typography: { letterSpacing } } } );

test( 'a rem letter-spacing is not scaled by the element font size', () => {
	assert.equal( pageBaseline( raw( '0.1rem' ), 'p' ).value( 'letter-spacing', 1440, 32 ), '0.1rem' );
} );

test( 'an em letter-spacing is scaled by the element font size', () => {
	assert.equal( pageBaseline( raw( '0.1em' ), 'p' ).value( 'letter-spacing', 1440, 32 ), '3.2px' );
} );
