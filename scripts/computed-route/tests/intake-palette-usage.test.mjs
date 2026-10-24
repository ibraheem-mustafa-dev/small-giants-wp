// Spec 48 FR-48-31 (§11 FR-33-2), lib/intake-palette-usage.mjs through lib/intake-palette.mjs::proposePalette: the
// palette roles read from rendered usage. Each signal has its MUST FAIL test on a small draft whose token names point
// the wrong way, so only the usage fact gives the expected slug: the page ground and text (the body), ground and text
// use counts, the text colour on each ground, the footer's (inherited) ground, one value filling several roles, and a
// name hint that fills only a slug usage leaves free and says so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposePalette, loadPaletteSlugs } from '../lib/intake-palette.mjs';
import { groundUsage } from '../lib/intake-palette-grounds.mjs';
import { paletteUsage } from '../lib/intake-run-collapse.mjs';

const SLUGS = loadPaletteSlugs();
const tok = ( list ) => list.map( ( [ name, hex ] ) => ( { name, type: 'colour', hex } ) );
const use = ( hex, property, tag, count = 1, extra = {} ) => ( { hex, property, draftId: `d:${ tag }`, count, tag, ...extra } );
const rolesOf = ( p, token ) => p.rows.find( ( r ) => r.token === token ).roles;
const holder = ( p, slug ) => [ ...new Set( p.rows.filter( ( r ) => r.roles.includes( slug ) ).map( ( r ) => r.hex ) ) ];

// A draft whose names mislead: "--surface-card" is the page ground, "--surface-page" a card, "--ink" the body text.
const TOKENS = tok( [ [ '--surface-page', '#FFFFFF' ], [ '--surface-card', '#FBF3DC' ], [ '--ink', '#3A2A22' ], [ '--grey-body', '#4E3C31' ],
	[ '--brand-blue', '#F9CF6E' ], [ '--brand-red', '#EE8088' ], [ '--paper', '#FFFAF0' ], [ '--line', '#EADBC0' ], [ '--muted', '#5E4A3D' ], [ '--plum', '#A8404F' ] ] );
const USAGE = [
	use( '#FBF3DC', 'background-color', 'body', 3 ), use( '#3A2A22', 'color', 'body', 3, { ground: '#FBF3DC' } ),
	use( '#FBF3DC', 'footer-ground', 'footer', 3, { inherited: true } ),
	use( '#FFFFFF', 'background-color', 'div', 30 ), use( '#FFFAF0', 'background-color', 'div', 10 ),
	use( '#F9CF6E', 'background-color', 'button', 12 ), use( '#EE8088', 'background-color', 'button', 5 ), use( '#3A2A22', 'background-color', 'div', 4 ),
	use( '#3A2A22', 'color', 'h2', 9, { ground: '#FBF3DC', text: true } ), use( '#3A2A22', 'color', 'p', 40, { ground: '#FBF3DC', text: true } ),
	use( '#4E3C31', 'color', 'p', 30, { ground: '#FFFFFF' } ), use( '#5E4A3D', 'color', 'span', 8, { ground: '#FBF3DC', text: true } ),
	use( '#3A2A22', 'color', 'span', 7, { ground: '#F9CF6E', text: true } ), use( '#4E3C31', 'color', 'span', 6, { ground: '#EE8088', text: true } ),
	use( '#3A2A22', 'color', 'span', 5, { ground: '#FFFFFF', text: true } ), use( '#FFFAF0', 'color', 'span', 4, { ground: '#3A2A22' } ),
	use( '#3A2A22', 'color', 'a', 20, { ground: '#FBF3DC' } ), use( '#A8404F', 'color', 'a', 5, { ground: '#FBF3DC' } ), use( '#FFFAF0', 'color', 'a', 30, { ground: '#3A2A22' } ),
	use( '#3A2A22', 'border-top-color', 'div', 50 ), use( '#EADBC0', 'border-bottom-color', 'div', 9 ), use( '#5E4A3D', 'border-bottom-color', 'a', 60 ),
];
const run = ( usage = USAGE, tokens = TOKENS ) => proposePalette( { tokens, usage, slugs: SLUGS } );

test( 'MUST FAIL signal 1: the body rule: the page ground is surface and the body colour is text, whatever the names say', () => {
	const p = run();
	assert.deepEqual( holder( p, 'surface' ), [ '#FBF3DC' ] );
	assert.deepEqual( holder( p, 'text' ), [ '#3A2A22' ] );
	assert.ok( ! rolesOf( p, '--surface-page' ).includes( 'surface' ), 'the token named surface-page paints cards, not the page' );
	assert.equal( p.rows.find( ( r ) => '--surface-card' === r.token ).by, 'usage' );
	// The probe's rows carry the body tag: the page ground and page text of each surface.
	const rows = groundUsage( { page: { ground: 'rgb(251, 243, 220)', text: 'rgb(58, 42, 34)' }, footers: [ { path: 'footer', ground: 'rgb(251, 243, 220)', own: false } ] }, 'Home' );
	assert.deepEqual( rows, [
		{ hex: '#FBF3DC', property: 'background-color', draftId: 'Home:page', count: 1, tag: 'body' },
		{ hex: '#3A2A22', property: 'color', draftId: 'Home:page', count: 1, tag: 'body', ground: '#FBF3DC' },
		{ hex: '#FBF3DC', property: 'footer-ground', draftId: 'Home:footer', count: 1, tag: 'footer', inherited: true },
	] );
} );

test( 'MUST FAIL signal 2: ground and text use counts: button grounds give primary and accent, the next grounds surface-alt and section, text counts give text-muted', () => {
	const p = run();
	assert.deepEqual( holder( p, 'primary' ), [ '#F9CF6E' ] );
	assert.deepEqual( holder( p, 'accent' ), [ '#EE8088' ] );
	assert.deepEqual( holder( p, 'surface-alt' ), [ '#FFFFFF' ] );
	assert.deepEqual( holder( p, 'section' ), [ '#FFFAF0' ] );
	assert.deepEqual( holder( p, 'text-muted' ), [ '#5E4A3D' ], 'the most used text after text and heading, lighter than text (a link underline is no text)' );
	assert.deepEqual( holder( p, 'border' ), [ '#3A2A22' ] );
	assert.deepEqual( holder( p, 'border-light' ), [ '#EADBC0' ], 'a link underline (60 on a) is not a divider' );
	assert.deepEqual( holder( p, 'link' ), [ '#A8404F' ], 'links on a strong ground and links in the page text are not the link colour' );
	assert.deepEqual( holder( p, 'heading' ), [ '#3A2A22' ] );
} );

test( 'MUST FAIL signal 3: text-on-ground pairs give primary-text, accent-text, section-text and text-inverse', () => {
	const p = run();
	assert.deepEqual( holder( p, 'primary-text' ), [ '#3A2A22' ] );
	assert.deepEqual( holder( p, 'accent-text' ), [ '#4E3C31' ], 'each ground pairs with its own text' );
	assert.deepEqual( holder( p, 'text-inverse' ), [ '#FFFAF0' ], 'the text on the dark ground' );
	const usage = [ ...USAGE, use( '#4E3C31', 'color', 'p', 50, { ground: '#FFFAF0', text: true } ) ];
	assert.deepEqual( holder( run( usage ), 'section-text' ), [ '#4E3C31' ] );
} );

test( 'MUST FAIL: each usage rule reads its own fact, so a louder colour elsewhere does not move it', () => {
	const deep = [ ...TOKENS, { name: '--deep', type: 'colour', hex: '#1A1410' } ];
	const at = ( extra, slug, tokens = TOKENS ) => holder( run( [ ...USAGE, ...extra ], tokens ), slug );
	assert.deepEqual( at( [ use( '#FFFAF0', 'color', 'h2', 40, { ground: '#F9CF6E' } ) ], 'heading' ), [ '#3A2A22' ], 'a heading on a strong ground is not the heading colour' );
	assert.deepEqual( at( [ use( '#1A1410', 'border-top-color', 'div', 20 ) ], 'border-light', deep ), [ '#EADBC0' ], 'border-light is lighter than the border' );
	assert.deepEqual( at( [ use( '#EE8088', 'background-color', 'div', 40 ) ], 'primary' ), [ '#F9CF6E' ], 'button grounds outrank other grounds' );
	assert.deepEqual( at( [ use( '#A8404F', 'background-color', 'div', 50 ) ], 'surface-alt' ), [ '#FFFFFF' ], 'a strong ground is not the raised ground' );
	assert.deepEqual( at( [ use( '#FFFAF0', 'color', 'span', 30, { ground: '#F9CF6E' } ) ], 'primary-text' ), [ '#3A2A22' ], 'a colour unreadable on the ground is not its text' );
	assert.deepEqual( at( [ use( '#1A1410', 'color', 'p', 20, { ground: '#FBF3DC', text: true } ) ], 'text-muted', deep ), [ '#5E4A3D' ], 'text-muted is lighter than the text' );
} );

test( 'MUST FAIL signal 4: the footer ground, inherited from the page, gives footer-bg', () => {
	const p = run();
	assert.deepEqual( holder( p, 'footer-bg' ), [ '#FBF3DC' ] );
	assert.deepEqual( rolesOf( p, '--surface-card' ).slice().sort(), [ 'footer-bg', 'surface' ] );
} );

test( 'MUST FAIL signal 5: one value fills several roles, and every token of that value carries them', () => {
	const p = run();
	assert.deepEqual( rolesOf( p, '--ink' ).slice().sort(), [ 'border', 'heading', 'primary-text', 'text' ] );
	const twin = run( USAGE, [ ...TOKENS, { name: '--text-heading', type: 'colour', hex: '#3A2A22' } ] );
	assert.deepEqual( rolesOf( twin, '--text-heading' ).slice().sort(), rolesOf( twin, '--ink' ).slice().sort() );
	assert.equal( rolesOf( twin, '--text-heading' )[ 0 ], 'heading', 'the shown role is the one the token is named for' );
} );

test( 'MUST FAIL: a name hint fills only a slug usage leaves free, says it rests on the name, and never displaces a usage fact', () => {
	const tokens = [ ...TOKENS, ...tok( [ [ '--link-hover', '#2B1F19' ], [ '--surface', '#F2F5F7' ] ] ) ];
	const p = run( [ ...USAGE, use( '#2B1F19', 'color', 'span', 1 ), use( '#F2F5F7', 'background-color', 'div', 1 ) ], tokens );
	const hover = p.rows.find( ( r ) => '--link-hover' === r.token );
	assert.deepEqual( hover.roles, [ 'link-hover' ] );
	assert.equal( hover.by, 'name' );
	assert.ok( hover.confidence < 0.85 && /the name alone decides this/.test( hover.why ) );
	const named = p.rows.find( ( r ) => '--surface' === r.token );
	assert.ok( ! named.roles.includes( 'surface' ) && ! named.roles.includes( 'surface-alt' ), 'surface and surface-alt are read from usage on other values' );
	assert.match( named.why, /is read from usage on/ );
	// Where usage has no direct fact (the body colour is no token's), the name takes the weak count's slug.
	const noBody = USAGE.filter( ( u ) => ! ( 'color' === u.property && 'body' === u.tag ) );
	const q = run( noBody );
	assert.deepEqual( holder( q, 'text' ), [ '#4E3C31' ], '--grey-body names body text' );
	assert.equal( q.rows.find( ( r ) => '--grey-body' === r.token ).by, 'name' );
	const unnamed = TOKENS.map( ( t ) => ( '--grey-body' === t.name ? { ...t, name: '--tone-2' } : t ) );
	assert.deepEqual( holder( run( noBody, unnamed ), 'text' ), [ '#3A2A22' ], 'with no name, the most used text on the page ground' );
} );

test( 'MUST FAIL: a divider or muted text colour no token declares wins its job, so no token takes it', () => {
	const usage = [ ...USAGE, use( '#DCE3E9', 'border-top-color', 'div', 500 ), use( '#6F8193', 'color', 'p', 500, { ground: '#FBF3DC', text: true } ) ];
	const p = run( usage );
	assert.deepEqual( holder( p, 'border' ), [] );
	assert.deepEqual( holder( p, 'text-muted' ), [] );
	assert.match( p.rows.find( ( r ) => '--muted' === r.token ).why, /paints the text-muted job most in #6F8193, a colour no token declares/ );
} );

test( 'paletteUsage gives each text colour its ground and marks text-holding elements', () => {
	const rec = { surface: 'Home', draftId: 'Home/3#0', path: '#dc-root > div:nth-child(1) > p:nth-child(2)', computed: { color: 'rgb(58, 42, 34)', 'background-color': 'rgba(0, 0, 0, 0)' } };
	const key = 'Home\u0000#dc-root > div:nth-child(1) > p:nth-child(2)';
	assert.deepEqual( paletteUsage( [ rec ], new Map( [ [ key, 'rgb(249, 207, 110)' ] ] ), new Set( [ key ] ) ),
		[ { hex: '#3A2A22', property: 'color', draftId: 'Home:3', count: 1, tag: 'p', ground: '#F9CF6E', text: true } ] );
	assert.deepEqual( paletteUsage( [ rec ] ), [ { hex: '#3A2A22', property: 'color', draftId: 'Home:3', count: 1, tag: 'p' } ] );
} );
