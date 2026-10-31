// Spec 48 FR-48-31 (§11 FR-33-2) and Spec 32 FR-32-28: the palette proposal and the committed role map reproduce three answer keys. Each client's proposal is run on
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
import { brandOfToken } from '../lib/brand-registry.mjs';
import { reviewRows } from '../lib/intake-review.mjs';

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

for ( const client of Object.keys( KEYS ) ) {
	test( `FR-32-28 MUST FAIL: the ${ client } proposal names every brand role no token proposes (the snapshot's review roles), and the intake review lists each as a notice row`, () => {
		const { p } = compareClient( client );
		assert.deepEqual( p.roleGaps, REVIEW_ROLES[ client ] );
		const rows = reviewRows( { palette: p } ).filter( ( r ) => 'notice' === r.rowType && r.rowId.startsWith( 'notice:palette-role:' ) );
		assert.deepEqual( rows.map( ( r ) => r.rowId ), REVIEW_ROLES[ client ].map( ( r ) => `notice:palette-role:${ r }` ) );
		assert.ok( rows.every( ( r ) => /no palette token proposes it/.test( r.note ) && 'noted' === r.proposed ) );
	} );
}

test( 'FR-32-28 negative control: a status role no token proposes is no review row, and a role a token proposes is none either', () => {
	const { p } = compareClient( 'indus-foods' );
	assert.ok( ! p.roleGaps.some( ( r ) => /^(?:success|error|info)(?:-light)?$/.test( r ) ), 'status roles keep the framework value' );
	assert.ok( ! p.roleGaps.includes( 'primary' ) );
	assert.equal( reviewRows( { palette: { rows: [], roleGaps: [] } } ).filter( ( r ) => r.rowId.startsWith( 'notice:palette-role:' ) ).length, 0 );
} );

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
		'text-subtle': [ '--text-muted' ], 'text-label': [ '--text-3' ] },
	'mamas-munches-redesign': { 'custom-body-copy': [ '--mm-body', '--mm-text-body' ] },
};

// ---- FR-32-28: the committed snapshot's palette is the draft's own shades and its role map reproduces the answer key ----
// A client's palette holds one entry per literal colour token of its draft (slug the exact token name, a `-shade` suffix when
// the name is also a framework role slug the role map points elsewhere); aliases, gradients, brand-named tokens and the
// framework's own entries are not in it; `settings.custom.colourRoles` points each framework role at a shade (a status role
// with no shade at its framework hex). A brand role the draft has no shade for is a review row: absent from both, listed here.
const FRAMEWORK = JSON.parse( fs.readFileSync( path.join( REPO, 'theme', 'sgs-theme', 'theme.json' ), 'utf8' ) ).settings.color.palette;
const ROLES = FRAMEWORK.map( ( e ) => e.slug );
export const REVIEW_ROLES = {
	'indus-foods': [ 'border', 'border-light' ],
	'eye-care-ward-end': [ 'primary-dark', 'border-light' ],
	'mamas-munches-redesign': [ 'primary-dark', 'accent-light' ],
};

export function snapshotOf( client ) {
	const snap = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'theme-snapshot.json' ), 'utf8' ) );
	const palette = Object.fromEntries( snap.settings.color.palette.map( ( e ) => [ e.slug, e.color ] ) );
	const pointers = snap.settings.custom.colourRoles || {};
	// A role resolves as the palette entry of its name, else through its colourRoles pointer (a shade slug or a raw hex).
	const resolve = ( role ) => palette[ role ] ?? ( palette[ pointers[ role ] ] ?? ( /^#/.test( pointers[ role ] || '' ) ? pointers[ role ] : null ) );
	return { snap, palette, pointers, resolve, gradients: ( snap.settings.color.gradients || [] ).map( ( g ) => g.slug ) };
}

// The draft's tokens split the way FR-32-28 states: literal colours, aliases, gradients, brand-named.
export function draftTokens( client ) {
	const t = readTokens( path.join( REPO, 'sites', client, 'handoff' ) ).tokens;
	const brand = ( x ) => !! brandOfToken( x.name );
	return {
		shades: t.filter( ( x ) => 'colour' === x.type && x.hex && 0 === x.chain.length && ! brand( x ) ),
		aliases: t.filter( ( x ) => 'colour' === x.type && x.chain.length > 0 ),
		gradients: t.filter( ( x ) => 'gradient' === x.type && ! brand( x ) ),
		brands: t.filter( ( x ) => [ 'colour', 'gradient' ].includes( x.type ) && brand( x ) ),
		hexOf: Object.fromEntries( t.filter( ( x ) => x.hex ).map( ( x ) => [ x.name, x.hex.toUpperCase() ] ) ),
	};
}

for ( const client of Object.keys( KEYS ) ) {
	test( `FR-32-28 MUST FAIL: the ${ client } palette is exactly the draft's own shades, with no alias, gradient, brand colour or framework entry`, () => {
		const { palette, gradients } = snapshotOf( client );
		const d = draftTokens( client );
		const slug = ( n ) => n.replace( /^--/, '' );
		// A shade named like a framework role the map points elsewhere carries a `-shade` suffix.
		const want = d.shades.map( ( x ) => slug( x.name ) ).sort();
		const got = Object.keys( palette ).map( ( s ) => s.replace( /-shade$/, '' ) ).sort();
		assert.deepEqual( got, want, `${ client }: palette slugs against the draft's literal colour tokens` );
		assert.deepEqual( [ ...gradients ].sort(), d.gradients.map( ( x ) => slug( x.name ) ).sort() );
		for ( const a of d.aliases ) {
			assert.ok( ! ( slug( a.name ) in palette ), `${ client } alias ${ a.name } is no entry` );
		}
		for ( const b of d.brands ) {
			assert.ok( ! ( slug( b.name ) in palette ) && ! gradients.includes( slug( b.name ) ), `${ client } brand token ${ b.name } is no entry` );
		}
		const tokenHexes = new Set( Object.values( d.hexOf ) );
		for ( const c of Object.values( palette ) ) {
			assert.ok( tokenHexes.has( c.toUpperCase().slice( 0, 7 ) ), `${ client }: ${ c } is a token's colour, never a one-off or a framework default` );
		}
	} );
	test( `FR-32-28 MUST FAIL: the ${ client } role map reproduces its answer key, and the roles with no shade are the listed review rows`, () => {
		const { resolve, pointers, palette } = snapshotOf( client );
		const key = JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) );
		const { hexOf } = draftTokens( client );
		const expected = {};
		for ( const [ token, roles ] of Object.entries( key.roles ) ) {
			roles.filter( ( r ) => ROLES.includes( r ) ).forEach( ( r ) => ( expected[ r ] = expected[ r ] || new Set() ).add( hexOf[ token ] ) );
		}
		const differ = Object.entries( expected ).filter( ( [ r, hexes ] ) => ! hexes.has( ( resolve( r ) || '' ).toUpperCase() ) ).map( ( [ r, h ] ) => `${ r }: key ${ [ ...h ].join( ' ' ) }, snapshot ${ resolve( r ) }` );
		assert.deepEqual( differ, [], `${ client }: role map differs from the answer key` );
		const unresolved = ROLES.filter( ( r ) => null === resolve( r ) );
		assert.deepEqual( unresolved, REVIEW_ROLES[ client ], `${ client }: roles with no shade (the intake review rows)` );
		for ( const r of unresolved ) {
			assert.ok( ! ( r in pointers ) && ! ( r in palette ), `${ client } ${ r }: a brand role with no shade is never written` );
		}
		for ( const [ r, v ] of Object.entries( pointers ) ) {
			assert.ok( v in palette || ( /^#[0-9A-Fa-f]{6}$/.test( v ) && /^(?:success|error|info)(?:-light)?$/.test( r ) ), `${ client } colourRoles.${ r } -> ${ v }` );
		}
	} );
}

test( 'FR-32-28 MUST FAIL: an alias token names its role through the chain, and a draft token sharing a role slug keeps its own colour as a -shade entry', () => {
	const eye = snapshotOf( 'eye-care-ward-end' );
	assert.equal( eye.pointers[ 'surface-alt' ], 'white', '--surface-card: var(--white) is the draft\'s own white, not the --surface-alt shade' );
	assert.equal( eye.palette[ 'surface-alt-shade' ], '#F3F0EB' );
	assert.equal( eye.pointers[ 'accent-text' ], 'acc-ink', 'the accent\'s text is its --acc-ink shade' );
	const mm = snapshotOf( 'mamas-munches-redesign' );
	assert.equal( mm.pointers.primary, 'mm-yellow', '--mm-cta: var(--mm-yellow)' );
	assert.equal( mm.pointers.link, 'mm-pink-dark' );
	assert.equal( snapshotOf( 'indus-foods' ).pointers.heading, 'slate', '--text-heading: var(--slate)' );
} );

test( 'FR-32-28 negative control: a role the palette answers under its own name needs no pointer, and a one-off shade stays out of the palette', () => {
	const eye = snapshotOf( 'eye-care-ward-end' );
	assert.ok( 'success' in eye.palette && ! ( 'success' in eye.pointers ), '--success is a shade and the success role' );
	assert.ok( ! Object.values( eye.palette ).includes( '#1A73E8' ), 'the Google reviews panel colours are one-offs: no palette entry' );
} );

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

// A key from marks is checked against review.md while its palette rows carry Bean's marks. A fresh intake renders the
// review again with rows unmarked until Bean reviews it; the key then stands as the answer it was built from, and the
// check says which rows wait for a mark.
test( 'the derived answer keys match their sources (no hand edit)', ( t ) => {
	const waiting = [];
	for ( const client of Object.keys( KEYS ).filter( ( c ) => 'ruled' !== KEYS[ c ] ) ) {
		let derived;
		try {
			derived = derive( client, KEYS[ client ] );
		} catch ( e ) {
			if ( 'from-marks' === KEYS[ client ] && /has no mark/.test( e.message ) ) {
				waiting.push( e.message );
				continue;
			}
			throw e;
		}
		assert.deepEqual( JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) ).roles, derived, client );
	}
	waiting.length && t.diagnostic( `not compared, the review's palette rows wait for Bean's marks: ${ waiting.join( '; ' ) }` );
} );

// Spec 48 FR-48-31: WhatsApp is a brand colour like Facebook's, so a token named for it holds no palette slot.
test( 'MUST FAIL: Eye Care\'s --wa and every --wa-* token, and Indus\'s --whatsapp-green, get no slot and each row names WhatsApp', () => {
	for ( const [ client, names ] of [ [ 'eye-care-ward-end', [ '--wa', '--wa-hover', '--wa-ink', '--wa-ink-deep', '--wa-soft', '--wa-border' ] ], [ 'indus-foods', [ '--whatsapp-green' ] ] ] ) {
		const { p } = compareClient( client );
		for ( const name of names ) {
			const row = p.rows.find( ( r ) => name === r.token );
			assert.ok( row, `${ client } ${ name }` );
			assert.deepEqual( [ row.role, row.roles, row.brand ], [ null, [], 'whatsapp' ], `${ client } ${ name }: ${ row.why }` );
		}
	}
} );

test( 'negative control: a token no brand names keeps the slug a rendered fact gives it', () => {
	const { p } = compareClient( 'eye-care-ward-end' );
	assert.ok( p.rows.find( ( r ) => '--acc' === r.token ).roles.includes( 'accent' ) );
} );
