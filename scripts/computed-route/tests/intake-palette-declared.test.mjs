// Spec 48 FR-48-31 (Bean 2026-10-24: the handoff files are the primary source), lib/intake-palette-declared.mjs: the
// palette roles the draft's author declares in tokens/colors.css (var() aliases and the comments beside each token) and
// its README, read from the three real exports; they decide the proposal ahead of painted usage, and every place usage
// disagrees is listed for the reader to answer for. data/palette-role-words.json names only theme.json slugs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTokens } from '../lib/tokens.mjs';
import { declarations, declaredRoles, namespaceOf, ROLE_WORDS } from '../lib/intake-palette-declared.mjs';
import { proposePalette, loadPaletteSlugs } from '../lib/intake-palette.mjs';
import { REPO } from '../lib/intake-run.mjs';

const SLUGS = loadPaletteSlugs().map( ( s ) => s.slug );
const declaredOf = ( client ) => {
	const folder = path.join( REPO, 'sites', client, 'handoff' );
	const r = declaredRoles( declarations( { tokens: readTokens( folder ).tokens, folder, slugs: SLUGS } ) );
	return { roles: Object.fromEntries( [ ...r.roles ].map( ( [ s, d ] ) => [ s, d.hex ] ) ), conflicts: r.conflicts, list: r };
};

test( 'MUST FAIL: the optician export\'s aliases, comments and README declare its roles', () => {
	const { roles, conflicts } = declaredOf( 'eye-care-ward-end' );
	assert.deepEqual( roles, {
		text: '#141414', primary: '#141414', surface: '#FAF8F5', 'primary-text': '#FAF8F5', 'surface-alt': '#FFFFFF', border: '#E6E1DA',
		accent: '#9C8B78', 'link-hover': '#6F6152', success: '#1B7F43',
	} );
	assert.deepEqual( conflicts, [] );
} );

test( 'MUST FAIL: the wholesale food export\'s aliases declare its roles, including a token nothing paints at rest', () => {
	const { roles, conflicts } = declaredOf( 'indus-foods' );
	assert.deepEqual( roles, { heading: '#2C3E50', text: '#4A5563', 'text-muted': '#68727C', link: '#0A7EA8', 'link-hover': '#075E80' } );
	assert.deepEqual( conflicts, [], 'README prose about cards and panels names no role' );
} );

test( 'MUST FAIL: the bakery export\'s namespaced aliases and comments declare its roles; an exact slug name outranks a vocabulary word', () => {
	const { roles } = declaredOf( 'mamas-munches-redesign' );
	assert.deepEqual( roles, {
		text: '#3A2A22', 'link-hover': '#3A2A22', border: '#3A2A22', link: '#A8404F', 'text-muted': '#5E4A3D', surface: '#FBF3DC', 'surface-alt': '#FFFAF0',
		primary: '#F9CF6E', accent: '#EE8088',
	}, '--mm-text (the slug text) beats --mm-text-body (a vocabulary word for text)' );
	assert.equal( namespaceOf( [ '--mm-a', '--mm-b', '--mm-c', '--mm-d', '--other' ] ), 'mm' );
	assert.equal( namespaceOf( [ '--a-x', '--b-x', '--c-x' ] ), null );
} );

test( 'MUST FAIL: a declaration decides over painted usage, the disagreement is listed, and a declared token nothing paints still takes its slug', () => {
	const tokens = [ { name: '--ink', type: 'colour', hex: '#111111', chain: [] }, { name: '--grey', type: 'colour', hex: '#555555', chain: [] },
		{ name: '--text', type: 'colour', hex: '#555555', chain: [ '--grey' ] }, { name: '--quiet', type: 'colour', hex: '#888888', chain: [] },
		{ name: '--text-muted', type: 'colour', hex: '#888888', chain: [ '--quiet' ] }, { name: '--paper', type: 'colour', hex: '#FFFFFF', chain: [] } ];
	const usage = [ { hex: '#FFFFFF', property: 'background-color', draftId: 'p', count: 1, tag: 'body' }, { hex: '#111111', property: 'color', draftId: 'p', count: 1, tag: 'body' },
		{ hex: '#555555', property: 'color', draftId: 'd', count: 3, tag: 'p' } ];
	const p = proposePalette( { tokens, usage, slugs: loadPaletteSlugs() } );
	const holder = ( slug ) => [ ...new Set( p.rows.filter( ( r ) => r.roles.includes( slug ) ).map( ( r ) => r.hex ) ) ];
	assert.deepEqual( holder( 'text' ), [ '#555555' ], '--text: var(--grey) decides; the body colour #111111 disagrees' );
	assert.deepEqual( p.disagreements.map( ( d ) => [ d.slug, d.declared.hex, d.painted.hex ] ), [ [ 'text', '#555555', '#111111' ], [ 'text-muted', '#888888', '#555555' ] ] );
	assert.equal( p.rows.find( ( r ) => '--grey' === r.token ).by, 'declared' );
	assert.deepEqual( holder( 'text-muted' ), [ '#888888' ], 'declared though nothing paints it' );
} );

test( 'two declarations of one strength naming different colours cancel; a stronger one wins', () => {
	const d = ( slug, hex, strength ) => ( { slug, hex, token: `--${ hex }`, strength } );
	const r = declaredRoles( [ d( 'border', '#111111', 1 ), d( 'border', '#222222', 1 ), d( 'surface', '#FFFFFF', 1 ), d( 'surface', '#FAFAFA', 2 ) ] );
	assert.deepEqual( [ ...r.roles.keys() ], [ 'surface' ] );
	assert.equal( r.roles.get( 'surface' ).hex, '#FAFAFA' );
	assert.deepEqual( r.conflicts, [ { slug: 'border', hexes: [ '#111111', '#222222' ] } ] );
} );

test( 'a comment states a use only near the start of a clause; a README phrase needs the hex right after it', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'declared-' ) );
	try {
		fs.mkdirSync( path.join( dir, 'tokens' ) );
		fs.writeFileSync( path.join( dir, 'tokens', 'colors.css' ), ':root{\n  --a: #111111; /* cards, inputs */\n  --b: #222222; /* dashed dividers in cards */\n  --c: #333333; /* logo blue: primary CTA fill */\n}\n' );
		fs.writeFileSync( path.join( dir, 'README.md' ), '- One accent, taupe: `#444444`.\n- The panel cards use dark blue `#333333` here.\n- 2px outline, fill #111111.\n' );
		fs.appendFileSync( path.join( dir, 'tokens', 'colors.css' ), ':root{ --d: #444444; }\n' );
		const tokens = readTokens( dir ).tokens;
		const got = declarations( { tokens, folder: dir, slugs: SLUGS } ).map( ( x ) => [ x.slug, x.hex, x.source ] );
		assert.deepEqual( got, [ [ 'surface-alt', '#111111', 'comment' ], [ 'primary', '#333333', 'comment' ], [ 'accent', '#444444', 'readme' ] ] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'the role vocabulary names only theme.json slugs', () => {
	const slugs = new Set( SLUGS );
	for ( const [ k, v ] of [ ...Object.entries( ROLE_WORDS.aliasNames ), ...Object.entries( ROLE_WORDS.commentPhrases ) ] ) {
		assert.ok( slugs.has( v ), `${ k } -> ${ v } is not a theme.json slug` );
	}
} );
