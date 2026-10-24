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
const KEYS = { 'indus-foods': 'from-marks', 'eye-care-ward-end': 'from-snapshot', 'mamas-munches-redesign': 'ruled' };

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
	const p = proposePalette( { tokens: tokens.tokens, usage: recorded.usage, slugs: VOCAB, problems: tokens.problems } );
	const hexOf = Object.fromEntries( p.rows.map( ( r ) => [ r.token, r.hex ] ) );
	const want = slugValues( key.roles, hexOf );
	const got = slugValues( Object.fromEntries( p.rows.map( ( r ) => [ r.token, r.roles ] ) ), hexOf );
	const slugs = [ ...new Set( [ ...Object.keys( want ), ...Object.keys( got ) ] ) ].sort();
	return { p, key, want, got, matched: slugs.filter( ( s ) => want[ s ] === got[ s ] ), differ: Object.fromEntries( slugs.filter( ( s ) => want[ s ] !== got[ s ] ).map( ( s ) => [ s, { key: want[ s ] ?? null, proposal: got[ s ] ?? null } ] ) ) };
}

// Every remaining difference: slug → { class, check } (the review class and what an agent checks).
const UNUSED = { class: 'unused-token-named', check: 'no element paints this token at rest, so no rendered fact gives it a slug; the agent checks whether it paints in a state the 1440 rest read misses (hover, open, error) before taking the key\'s slug' };
const ABBREVIATED = { class: 'name-only-abbreviated', check: 'only the token name links this value to the slug and the name is an abbreviation no name rule reads; the agent checks the draft\'s own comment for the token and takes the slug by mark' };
const ACCENT = { class: 'channel-colour-vs-accent', check: 'the draft paints the WhatsApp green on more link grounds than the taupe, and no rendered fact tells a messaging channel\'s colour from the brand accent; the agent checks which strong ground is the brand accent (tokens/colors.css calls the taupe the only accent)' };
const DIVIDER = { class: 'divider-strength', check: 'the draft paints #D8D2C8 on more lines (swatch rings, small tags) than the #E6E1DA hairline; the agent checks which line colour is the page divider and whether the stronger line is its own custom slug' };
export const REVIEW = {
	'indus-foods': {
		'primary-text': { key: '#E3EFF4', proposal: '#FFFFFF', class: 'pair-vs-tint', check: 'white is the most used text on the primary (blue) ground; the key takes --tint-on-blue, the pale tint the draft uses for secondary lines on that ground; the agent compares the two on the blue sections and confirms which reads as the primary text' },
		'text-inverse': { key: null, proposal: '#FFFFFF', class: 'key-at-framework-default', check: 'no draft token holds the key\'s text-inverse (the framework default stays); usage reads white as the text on the dark footer ground; the agent confirms white or keeps the default' },
		'text-muted': { key: '#68727C', proposal: null, ...UNUSED },
	},
	'eye-care-ward-end': {
		accent: { key: '#9C8B78', proposal: '#25D366', ...ACCENT },
		'accent-text': { key: '#6F6152', proposal: '#0B2B17', class: 'accent-text-meaning', check: 'the key follows Spec 32 §12.2 (the accent hue\'s own text colour on light grounds, --acc-ink); the proposer reads the text on the accent fill, which follows the accent class above; the agent checks which meaning the client\'s build uses' },
		'accent-light': { key: '#EFEAE2', proposal: null, ...ABBREVIATED },
		whatsapp: { key: '#25D366', proposal: null, ...ABBREVIATED },
		border: { key: '#E6E1DA', proposal: '#D8D2C8', ...DIVIDER },
		'border-light': { key: null, proposal: '#E6E1DA', ...DIVIDER },
		section: { key: '#FFFFFF', proposal: '#F3F0EB', class: 'section-reuses-raised-ground', check: 'the key gives section the raised (card) ground; usage reads the next most painted ground (the image wells); the agent checks which ground the full-width bands use' },
		success: { key: '#1B7F43', proposal: null, ...UNUSED },
		'text-muted': { key: '#5E584F', proposal: '#6F6152', class: 'muted-vs-kicker-ink', check: 'the most used lighter text is #6F6152 (kicker text, the key\'s accent-text); the key takes --text-2 (body copy on paper); the agent checks which grey the running body copy uses' },
	},
	'mamas-munches-redesign': {},
};

// Slugs the proposal takes from a token name alone (row basis `by: 'name'`): matched or not, each is a review class.
const HOVER = 'a hover or pressed shade the 1440 rest read never paints; the agent checks a hover rule in the draft uses this value';
export const NAME_ONLY = {
	'indus-foods': {
		'primary-dark #075E80': HOVER, 'link-hover #075E80': HOVER,
		'accent-light #E7D768': 'a light shade of the accent family painted on one element; the agent checks it is the light tint of the accent',
		'text #4A5563': 'the body colour (#000000) belongs to no token, so the page text is read from the name --grey-body over the most used text count (#2C3E50, the heading colour); the agent checks the running paragraph colour',
		'whatsapp #25D366': 'a messaging channel colour; no rendered fact names a channel',
	},
	'eye-care-ward-end': {},
	'mamas-munches-redesign': { 'link-hover #3A2A22': HOVER },
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

test( 'the derived answer keys match their sources (no hand edit)', () => {
	for ( const client of Object.keys( KEYS ).filter( ( c ) => 'ruled' !== KEYS[ c ] ) ) {
		assert.deepEqual( JSON.parse( fs.readFileSync( keyFile( client ), 'utf8' ) ).roles, derive( client, KEYS[ client ] ), client );
	}
} );
