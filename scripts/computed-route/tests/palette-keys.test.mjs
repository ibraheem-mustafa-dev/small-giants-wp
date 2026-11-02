// Spec 48 FR-48-31 (§11 FR-33-2): the palette proposal reproduces three answer keys. Each client's proposal is run on
// its committed draft tokens (sites/<client>/handoff/tokens) and the colour usage the real reader recorded
// (sites/<client>/build/intake/palette.json, written by `intake.mjs --palette-only`), and compared with its key
// (sites/<client>/build/intake/palette-key.json, built by tools/palette-keys.mjs from Bean's marks, the built site's
// snapshot or Bean's ruling). A slug names one value, so the comparison is per slug: the value the key gives it against
// the value the proposal gives it. Every slug where they differ is listed below as a named review class with what an
// agent checks; a difference not listed, or a listed one that no longer differs, fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { readTokens } from '../lib/tokens.mjs';
import { proposePalette, loadPaletteSlugs } from '../lib/intake-palette.mjs';
import { REPO, keyFile, derive } from '../tools/palette-keys.mjs';

// Each answer key and its source (tools/palette-keys.mjs).
const KEYS = { 'indus-foods': 'from-marks', 'eye-care-ward-end': 'ruled', 'mamas-munches-redesign': 'ruled' };

const VOCAB = loadPaletteSlugs();
const SLUGS = new Set( VOCAB.map( ( s ) => s.slug ) );

// slug → hex from token → slugs (framework slugs only; a custom or one-off token holds no framework slug).
export function slugValues( roles, hexOf ) {
	const out = {};
	for ( const [ token, slugs ] of Object.entries( roles ) ) {
		for ( const s of slugs.filter( ( x ) => SLUGS.has( x ) ) ) {
			( out[ s ] = out[ s ] || new Set() ).add( hexOf[ token ] );
		}
	}
	return Object.fromEntries( Object.entries( out ).map( ( [ s, set ] ) => [ s, [ ...set ].sort().join( ' ' ) ] ) );
}

export function compareClient( client ) {
	const tokens = readTokens( path.join( REPO, 'sites', client, 'handoff' ) );
	const recorded = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'intake', 'palette.json' ), 'utf8' ) );
	const key = JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) );
	const p = proposePalette( { tokens: tokens.tokens, usage: recorded.usage, slugs: VOCAB, problems: tokens.problems, folder: path.join( REPO, 'sites', client, 'handoff' ) } );
	// A token merged into another at ΔE ≤ 1 (FR-33-2) is that value: its slugs compare under the kept hex.
	const kept = Object.fromEntries( p.merges.map( ( m ) => [ m.from, m.to ] ) );
	const hexOf = Object.fromEntries( p.rows.map( ( r ) => [ r.token, kept[ r.hex ] ?? r.hex ] ) );
	const want = slugValues( key.roles, hexOf );
	const got = slugValues( Object.fromEntries( p.rows.map( ( r ) => [ r.token, r.roles ] ) ), hexOf );
	const slugs = [ ...new Set( [ ...Object.keys( want ), ...Object.keys( got ) ] ) ].sort();
	return { p, key, want, got, matched: slugs.filter( ( s ) => want[ s ] === got[ s ] ), differ: Object.fromEntries( slugs.filter( ( s ) => want[ s ] !== got[ s ] ).map( ( s ) => [ s, { key: want[ s ] ?? null, proposal: got[ s ] ?? null } ] ) ) };
}

// Every remaining difference: slug → { key, proposal, class, check }. Each is a choice of the key itself that no
// rendered or code fact reproduces: the key takes a value no draft token holds, names a token the draft never uses,
// or gives a slug a meaning another key contradicts. `check` says what decides it.
export const REVIEW = {
	'indus-foods': {},
	'eye-care-ward-end': {
		section: { key: '#FFFFFF', proposal: '#F3F0EB', class: 'ruled-override', check: 'Bean\'s ruling (2026-10-24): section is the band colour, and Eye Care keeps its white card ground as a recorded override mark (--white and --surface-card role:surface-alt,section); the proposer reads the band rule, the mark carries the override' },
	},
	'mamas-munches-redesign': {},
};

// Slugs the proposal takes from a token name alone (row basis `by: 'name'`): matched or not, each is a review class.
const HOVER = 'a hover or pressed shade the 1440 rest read never paints; the agent checks a hover rule in the draft uses this value';
export const NAME_ONLY = {
	'indus-foods': { 'primary-dark #075E80': HOVER },
	'eye-care-ward-end': {},
	'mamas-munches-redesign': {},
};

// The key's own slugs that are not in theme.json's palette: the proposer offers each token as a custom colour, and the
// slug name is the key's choice. slug → the token it names.
export const KEY_ONLY = {
	'indus-foods': { 'custom-brand-blue-light': [ '--brand-blue-light' ], 'custom-ink': [ '--ink', '--selection-fg' ], 'custom-tint-on-blue': [ '--tint-on-blue' ] },
	'eye-care-ward-end': { 'primary-hover': [ '--ink-hover' ], 'surface-stage': [ '--surface-alt' ], 'border-strong': [ '--border-strong' ], 'text-soft': [ '--text-strong' ],
		'text-subtle': [ '--text-muted' ], 'text-label': [ '--text-3' ], 'whatsapp-hover': [ '--wa-hover' ], 'whatsapp-soft': [ '--wa-soft' ], 'whatsapp-line': [ '--wa-border' ] },
	'mamas-munches-redesign': { 'custom-body-copy': [ '--mm-body', '--mm-text-body' ] },
};

for ( const client of Object.keys( KEYS ) ) {
	test( `FR-48-31 MUST FAIL: the ${ client } proposal equals its answer key, or each difference is a named review class`, () => {
		const c = compareClient( client );
		const listed = REVIEW[ client ];
		const seen = Object.fromEntries( Object.entries( c.differ ).map( ( [ s, d ] ) => [ s, `${ d.key } -> ${ d.proposal }` ] ) );
		assert.deepEqual( Object.keys( seen ).sort(), Object.keys( listed ).sort(), `${ client }: differences ${ JSON.stringify( seen ) }; matched ${ c.matched.join( ' ' ) }` );
		for ( const [ s, r ] of Object.entries( listed ) ) {
			assert.equal( `${ r.key } -> ${ r.proposal }`, seen[ s ], `${ client } ${ s }: the listed difference changed` );
			assert.ok( r.class && r.check, `${ client } ${ s }: a review class names its class and what an agent checks` );
		}
	} );
}

for ( const client of Object.keys( KEYS ) ) {
	test( `FR-48-31 MUST FAIL: every ${ client } slug decided by a token name alone is a listed review class`, () => {
		const { p } = compareClient( client );
		const named = p.rows.flatMap( ( r ) => ( r.basis || [] ).filter( ( b ) => 'name' === b.by ).map( ( b ) => `${ b.role } ${ r.hex }` ) );
		assert.deepEqual( [ ...new Set( named ) ].sort(), Object.keys( NAME_ONLY[ client ] ).sort() );
		assert.ok( p.rows.filter( ( r ) => 'name' === r.by && ! r.role.startsWith( 'custom-' ) ).every( ( r ) => r.confidence < 0.85 && /the name alone decides this/.test( r.why ) ), 'a name-only row says so, at lower confidence' );
	} );
}

for ( const client of Object.keys( KEYS ) ) {
	test( `FR-48-31: the ${ client } key's slugs outside theme.json are listed, and the proposal offers each of their tokens as a custom colour`, () => {
		const key = JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) );
		const outside = {};
		for ( const [ token, slugs ] of Object.entries( key.roles ) ) {
			slugs.filter( ( s ) => ! SLUGS.has( s ) ).forEach( ( s ) => ( outside[ s ] = [ ...( outside[ s ] || [] ), token ] ) );
		}
		assert.deepEqual( outside, KEY_ONLY[ client ] );
		const { p } = compareClient( client );
		for ( const token of Object.values( outside ).flat() ) {
			const row = p.rows.find( ( r ) => r.token === token );
			assert.ok( ! row.used || row.roles.every( ( s ) => s.startsWith( 'custom-' ) || SLUGS.has( s ) ), `${ client } ${ token }` );
		}
	} );
}

test( 'the derived answer keys match their sources (no hand edit)', () => {
	for ( const client of Object.keys( KEYS ).filter( ( c ) => 'ruled' !== KEYS[ c ] ) ) {
		assert.deepEqual( JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) ).roles, derive( client, KEYS[ client ] ), client );
	}
} );
