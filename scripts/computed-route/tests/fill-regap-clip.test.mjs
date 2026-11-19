// A pass that asks the resolver again (lib/fill-regap.mjs::reresolve: the width ladder, the size pass) hands it the element's
// background-clip, as the main pass does, so the resolver can tell a gradient painted behind the box from one clipped to the text
// (lib/resolve-side-effects.mjs::backgroundBehindBox). Without it a link's background-size underline was written to a text
// gradient setting, which clips the background to the letters and clears the text colour, and the credit link vanished.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { reresolve } from '../lib/fill-regap.mjs';

const db = openDb();
const GRADIENT = 'linear-gradient(rgb(216, 202, 80), rgb(216, 202, 80))';
const textGradient = { slot: '', slots: [ '' ], property: 'background-image', forms: [], reachedAt: [ 375, 768, 1440 ], effects: [ '|color', '|background-clip' ], state: null };
const run = ( clip ) => reresolve( {
	rec: { name: 'sgs/business-info' }, node: { attributes: {} }, target: { id: 't' }, slot: '', prop: 'background-image', draft: { 1440: GRADIENT },
	ctx: { db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => ( { settings: { textColourGradient: textGradient } } ),
		reads: { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { t: { styles: undefined === clip ? {} : { 'background-clip': clip } } } ] ) ) } },
} );

test( 'MUST FAIL: a draft clipped to its box is never given a text gradient', () => {
	const r = run( 'border-box' );
	assert.equal( r.writes, undefined, JSON.stringify( r ) );
} );

test( 'negative controls: a text clip, and an unread clip, keep the text gradient', () => {
	assert.deepEqual( run( 'text' ).writes?.map( ( w ) => w.attr ), [ 'textColourGradient' ] );
	assert.deepEqual( run( undefined ).writes?.map( ( w ) => w.attr ), [ 'textColourGradient' ] );
} );
