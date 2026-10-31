// Fill writes the reference of the draft token an element uses (Spec 32 FR-32-29, Spec 48 FR-48-41): traced from the element's
// own var(), never matched by value. MUST FAIL without the trace; each negative control is a look-alike that stays literal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { traceToken, traceRefs, applyRefs, tokenWrites } from '../lib/fill-token-ref.mjs';

const map = new Map( [
	[ '--s-4', '16px' ], [ '--s-card', '24px' ], [ '--s-gutter', '16px' ], [ '--pad-card', 'var(--s-gutter)' ],
	[ '--mm-h1-m', '32px' ], [ '--mm-h1-t', '40px' ], [ '--mm-h1-d', '48px' ],
	[ '--brand', '#c8102e' ], [ '--shade-a', '#c8102e' ],
] );
const raw = { settings: {
	spacing: { spacingSizes: [ { slug: '30', size: '16px' }, { slug: '40', size: '16px' }, { slug: '50', size: '24px' } ] },
	typography: { fontSizes: [ { slug: 'small', size: '2rem' }, { slug: 'large', size: '40px' }, { slug: 'hero', size: '48px' } ] },
	custom: { defaultTokens: [ 'mm-h1-d', 's-card' ], presetTokens: { spacing: { 30: 's-4', 40: 's-gutter' }, fontSizes: { small: 'mm-h1-m', large: 'mm-h1-t' } } },
	color: { palette: [ { slug: 'brand', color: '#c8102e' }, { slug: 'shade-a', color: '#c8102e' } ] },
} };
const run = ( prop, draft, declared, writes, side = null, snapshot = raw ) => {
	const traced = traceRefs( { prop, draft, declaredAt: declared, map, raw: snapshot } );
	return { traced, writes: applyRefs( { writes, prop, side, traced } ) };
};

test( 'MUST FAIL: two tokens share one value and the element uses the second: the second is written', () => {
	const r = run( 'padding-top', { 1440: '16px' }, { 1440: 'var(--s-gutter)' }, [ { attr: 'padding', value: { desktop: { top: '16px' } }, merge: 'deep' } ], 'top' );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: { top: 'var(--wp--preset--spacing--40)' } } );
	assert.equal( r.traced.rows[ 0 ].token, '--s-gutter' );
} );

test( 'MUST FAIL: a per-width set writes each width\'s token into its tier', () => {
	const declared = { 375: 'var(--mm-h1-m)', 768: 'var(--mm-h1-t)', 1440: 'var(--mm-h1-d)' };
	const r = run( 'font-size', { 375: '32px', 768: '40px', 1440: '48px' }, declared, [ { attr: 'fontSize', value: { desktop: '48px', tablet: '40px', mobile: '32px' }, merge: 'deep' } ] );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: '48px', tablet: 'var(--wp--preset--font-size--large)', mobile: 'var(--wp--preset--font-size--small)' } );
} );

test( 'a tier the resolver left to the tier above takes its own token when the token differs', () => {
	const declared = { 768: 'var(--s-4)', 1440: 'var(--s-gutter)' };
	const r = run( 'padding-top', { 768: '16px', 1440: '16px' }, declared, [ { attr: 'padding', value: { desktop: { top: '16px' } }, merge: 'deep' } ], 'top' );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: { top: 'var(--wp--preset--spacing--40)' }, tablet: { top: 'var(--wp--preset--spacing--30)' } } );
} );

test( 'MUST FAIL: an alias token resolves to its literal token', () => {
	assert.deepEqual( traceToken( 'var(--pad-card)', map ), { token: '--s-gutter' } );
	const r = run( 'padding-left', { 1440: '16px' }, { 1440: 'var(--pad-card)' }, [ { attr: 'padding', value: { desktop: { left: '16px' } }, merge: 'deep' } ], 'left' );
	assert.equal( r.writes[ 0 ].value.desktop.left, 'var(--wp--preset--spacing--40)' );
} );

test( 'negative control: a literal draft value stays literal although a token holds the same value', () => {
	const r = run( 'padding-top', { 1440: '16px' }, { 1440: '16px' }, [ { attr: 'padding', value: { desktop: { top: '16px' } }, merge: 'deep' } ], 'top' );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: { top: '16px' } } );
	assert.equal( r.traced.rows[ 0 ].status, 'literal' );
} );

test( 'negative control: a token the snapshot does not carry stays literal, with its row', () => {
	const r = run( 'padding-top', { 1440: '16px' }, { 1440: 'var(--s-gutter)' }, [ { attr: 'padding', value: { desktop: { top: '16px' } }, merge: 'deep' } ], 'top', { settings: { spacing: { spacingSizes: [ { slug: '30', size: '16px' } ] }, custom: { presetTokens: { spacing: { 30: 's-4', 40: 's-gutter' } } } } } );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: { top: '16px' } } );
	assert.match( r.traced.rows[ 0 ].reason, /no spacing entry 40/ );
} );

test( 'negative control: a snapshot value that is not the computed value keeps the literal and records the mismatch', () => {
	const r = run( 'font-size', { 375: '30px' }, { 375: 'var(--mm-h1-m)' }, [ { attr: 'fontSize', value: { mobile: '30px' }, merge: 'deep' } ] );
	assert.deepEqual( r.writes[ 0 ].value, { mobile: '30px' } );
	assert.match( r.traced.rows[ 0 ].reason, /not the draft's 30px/ );
} );

test( 'MUST FAIL: a default token leaves the literal only where the default renders differently, with a default row', () => {
	const r = run( 'font-size', { 1440: '48px' }, { 1440: 'var(--mm-h1-d)' }, [ { attr: 'fontSize', value: { desktop: '48px' }, merge: 'deep' } ] );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: '48px' } );
	assert.equal( r.traced.rows[ 0 ].status, 'default' );
} );

test( 'colour: the write names the shade token the element uses when two share a hex', () => {
	const r = run( 'background-color', { 1440: 'rgb(200, 16, 46)' }, { 1440: 'var(--shade-a)' }, [ { attr: 'backgroundColour', value: 'brand', merge: 'replace' } ] );
	assert.equal( r.writes[ 0 ].value, 'shade-a' );
} );

test( 'a number-valued setting is never given a reference, and a compound declaration is not traced', () => {
	const r = run( 'font-size', { 375: '32px' }, { 375: 'var(--mm-h1-m)' }, [ { attr: 'fontSize', value: { mobile: 32 }, merge: 'deep' } ] );
	assert.deepEqual( r.writes[ 0 ].value, { mobile: 32 } );
	assert.equal( traceToken( 'calc(var(--s-4) * 2)', map ), null );
} );

test( 'tokenWrites reads the declared value off the run state and keeps the trace rows', () => {
	const st = { rawSnapshot: raw, draftTokens: map, out: {}, reads: { declared: { 1440: { t: { 'padding-top': 'var(--s-gutter)' } } } } };
	const out = tokenWrites( st, { id: 't', slot: '' }, 'padding-top', { 1440: '16px' }, [ { attr: 'padding', value: { desktop: { top: '16px' } }, merge: 'deep' } ] );
	assert.equal( out[ 0 ].value.desktop.top, 'var(--wp--preset--spacing--40)' );
	assert.equal( st.out.tokenRefs[ 0 ].status, 'ref' );
	const none = tokenWrites( { ...st, draftTokens: new Map() }, { id: 't', slot: '' }, 'padding-top', { 1440: '16px' }, [ { attr: 'padding', value: { desktop: { top: '16px' } } } ] );
	assert.equal( none[ 0 ].value.desktop.top, '16px', 'no draft tokens: the resolver\'s write stands' );
} );
