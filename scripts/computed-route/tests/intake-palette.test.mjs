// Spec 48 FR-48-31 (§11 FR-33-2, R-47-7), lib/intake-palette.mjs: the palette role proposal. Every used colour token
// gets a proposed role; the planted unused token is listed as unused and not proposed; a colour outside the tokens
// stays a one-off hex; near-identical tokens merge at CIEDE2000 ΔE ≤ 1 with alpha as its own axis; a slug theme.json
// lacks is proposed as its stand-in with the wanted slug recorded. Each named role rule has its own test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { readTokens } from '../lib/tokens.mjs';
import { proposePalette, loadPaletteSlugs, ciede2000, hexDistance, dedupeColours, summariseUsage, sectionTextFor, ruleFromUsage,
	brandFamilies, ruleLinkHover, ruleLink, ruleHeading, ruleReserved, ruleOnGround, ruleSection, ruleFooter, ruleBorder, ruleStatus,
	ruleWhatsapp, ruleTextMuted, ruleTextInverse, ruleText, ruleSurface, ruleBrand } from '../lib/intake-palette.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const DIR = path.join( HERE, 'fixtures', 'intake-palette' );
const USAGE = JSON.parse( fs.readFileSync( path.join( DIR, 'usage.json' ), 'utf8' ) );
const SLUGS = [ 'primary', 'primary-dark', 'accent', 'accent-light', 'success', 'error', 'whatsapp', 'surface', 'surface-alt', 'text',
	'text-muted', 'text-inverse', 'border', 'border-light', 'footer-bg', 'heading', 'link', 'link-hover', 'section', 'section-text' ]
	.map( ( slug ) => ( { slug, name: slug } ) );
const read = readTokens( path.join( DIR, 'export' ) );
const run = ( slugs = SLUGS, usage = USAGE ) => proposePalette( { tokens: read.tokens, usage, slugs, problems: read.problems } );
const rowOf = ( p, name ) => p.rows.find( ( r ) => r.token === name );
const w = ( name, extra = {} ) => ( { words: name.split( '-' ), ...extra } );

test( 'FR-48-31 MUST FAIL: every used colour token gets a proposed role', () => {
	const p = run();
	const used = p.rows.filter( ( r ) => r.used );
	assert.ok( used.length >= 12 );
	for ( const r of used ) {
		assert.ok( r.role, `${ r.token } is used but has no role` );
		assert.ok( r.why, `${ r.token } has no reason` );
		assert.match( r.rowId, /^palette:--/ );
	}
	const roles = Object.fromEntries( used.map( ( r ) => [ r.token, r.role ] ) );
	assert.deepEqual( roles, {
		'--brand-teal': 'primary', '--brand-teal-hover': 'primary-dark', '--brand-orange': 'accent', '--ink': 'heading', '--near-ink': 'heading',
		'--grey-body': 'text', '--surface-page': 'surface', '--surface-card': 'surface-alt', '--text-heading': 'heading', '--text-body': 'text',
		'--text-link': 'link', '--text-link-hover': 'link-hover', '--surface-section-teal': 'section', '--text-on-teal': 'section-text',
		'--card-ground': 'surface-alt',
	} );
	assert.equal( rowOf( p, '--ink' ).why, 'same value as --text-heading' );
} );

test( 'FR-48-31 MUST FAIL: the planted unused token is listed as unused and not proposed', () => {
	const p = run();
	assert.deepEqual( p.unused, [ '--planted-unused', '--with-fallback' ] );
	const r = rowOf( p, '--planted-unused' );
	assert.equal( r.used, false );
	assert.equal( r.role, null );
	assert.equal( r.confidence, 0 );
} );

test( 'R-47-7 MUST FAIL: a colour outside the tokens stays a one-off hex, alpha-aware', () => {
	const p = run();
	assert.deepEqual( p.oneOff.map( ( o ) => o.hex ).sort(), [ '#123456', '#1F7A7A80' ] );
	assert.deepEqual( p.oneOff.find( ( o ) => '#123456' === o.hex ).uses, [ { property: 'color', count: 1, draftIds: [ 'span1' ] } ] );
	assert.ok( ! p.rows.some( ( r ) => '#123456' === r.hex ) );
	assert.deepEqual( p.problems.filter( ( x ) => 'usage-colour' === x.kind ).map( ( x ) => x.draftId ), [ 'x1' ] );
} );

test( 'a near-miss one-off is annotated with its nearest token within ΔE 2, and stays hex', () => {
	const p = run( SLUGS, [ ...USAGE, { hex: '#1F7B7A', property: 'color', draftId: 'z', count: 1 } ] );
	const o = p.oneOff.find( ( x ) => '#1F7B7A' === x.hex );
	assert.equal( o.nearest.token, '--brand-teal' );
	assert.ok( o.nearest.deltaE > 0 && o.nearest.deltaE <= 2 );
} );

test( 'FR-33-2 MUST FAIL: near-identical tokens merge at CIEDE2000 ΔE ≤ 1 and the merge is recorded', () => {
	const p = run();
	assert.deepEqual( p.merges.map( ( m ) => [ m.kept, m.merged, m.from, m.to ] ), [ [ '--ink', '--near-ink', '#1B212D', '#1A202C' ] ] );
	assert.ok( p.merges[ 0 ].deltaE <= 1 );
	// The merged token's exact hex counts as use of the group, so it is not a one-off.
	assert.ok( ! p.oneOff.some( ( o ) => '#1B212D' === o.hex ) );
	assert.equal( rowOf( p, '--ink' ).uses.find( ( u ) => 'color' === u.property ).count, 9 );
} );

test( 'MUST FAIL: alpha is its own axis: an opaque and a translucent value never merge', () => {
	assert.equal( hexDistance( '#1F7A7A', '#1F7A7A80' ), Infinity );
	const { merges, groups } = dedupeColours( [ { name: '--a', hex: '#1F7A7A' }, { name: '--b', hex: '#1F7A7A80' } ] );
	assert.deepEqual( merges, [] );
	assert.equal( groups.length, 2 );
} );

test( 'CIEDE2000 matches Sharma, Wu and Dalal test pairs', () => {
	assert.equal( Math.round( ciede2000( { L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 } ) * 1e4 ) / 1e4, 2.0425 );
	assert.equal( Math.round( ciede2000( { L: 50, a: -1, b: 2 }, { L: 50, a: 0, b: 0 } ) * 1e4 ) / 1e4, 2.3669 );
	assert.equal( Math.round( ciede2000( { L: 50, a: 2.5, b: 0 }, { L: 73, a: 25, b: -18 } ) * 1e4 ) / 1e4, 27.1492 );
} );

test( 'MUST FAIL: a slug theme.json lacks is proposed as its stand-in, with the wanted slug recorded', () => {
	const p = run( SLUGS.filter( ( s ) => ! [ 'heading', 'link', 'link-hover', 'section', 'section-text' ].includes( s.slug ) ) );
	const h = rowOf( p, '--text-heading' );
	assert.equal( h.wantedSlug, 'heading' );
	assert.match( h.notes, /heading is not in theme\.json's palette yet; proposing text/ );
	assert.equal( rowOf( p, '--text-link-hover' ).wantedSlug, 'link-hover' );
	assert.equal( rowOf( p, '--surface-section-teal' ).wantedSlug, 'section' );
	assert.ok( p.rows.every( ( r ) => ! r.role || r.role.startsWith( 'custom-' ) || p.vocabulary.includes( r.role ) ) );
} );

test( 'collisions: one value per slug; the loser takes the second choice or stays custom', () => {
	const p = run();
	assert.equal( rowOf( p, '--surface-card' ).role, 'surface-alt' );
	const slugToHex = new Map();
	for ( const r of p.rows.filter( ( x ) => x.role && ! x.role.startsWith( 'custom-' ) ) ) {
		const first = slugToHex.get( r.role );
		assert.ok( ! first || first.hex === r.hex || first.sharedWith.includes( r.token ), `${ r.role } holds two values` );
		slugToHex.set( r.role, first || r );
	}
} );

test( 'non-colour tokens are returned for later stages but get no palette row', () => {
	const p = run();
	assert.ok( p.tokens.some( ( t ) => '--space-fluid' === t.name ) );
	assert.ok( ! p.rows.some( ( r ) => [ '--gradient-hero', '--gap-1', '--font-body', '--loop-a' ].includes( r.token ) ) );
	assert.deepEqual( p.problems.filter( ( x ) => x.kind !== 'usage-colour' ).map( ( x ) => x.token ).sort(), [ '--loop-a', '--loop-b', '--orphan' ] );
} );

test( 'the section ground text colour pairs from usage on the same draft elements', () => {
	assert.deepEqual( sectionTextFor( new Set( [ '#1F7A7A' ] ), proposeUsage() ), { hex: '#F1F5F9', count: 3 } );
	// With no token named for it, the paired token takes section-text.
	const tokens = [ { name: '--brand-teal', type: 'colour', hex: '#1F7A7A' }, { name: '--section-teal', type: 'colour', hex: '#1F7A7A' },
		{ name: '--pale', type: 'colour', hex: '#F1F5F9' } ];
	const p = proposePalette( { tokens, usage: USAGE.slice( 0, 4 ), slugs: SLUGS } );
	assert.equal( rowOf( p, '--pale' ).role, 'section-text' );
	assert.equal( p.sectionText.token, '--pale' );
} );
function proposeUsage() {
	return USAGE.slice( 0, 4 ).map( ( u ) => ( { ...u, hex: u.hex.startsWith( 'rgb' ) ? '#1F7A7A' : u.hex.toUpperCase() } ) );
}

test( 'loadPaletteSlugs reads theme.json settings.color.palette (slug and name), and an injected path', () => {
	const live = loadPaletteSlugs();
	assert.ok( live.length > 0 && live.every( ( s ) => s.slug && s.name ) );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-palette-' ) );
	fs.writeFileSync( path.join( dir, 'theme.json' ), JSON.stringify( { settings: { color: { palette: [ { slug: 'primary', name: 'Primary', color: '#000' } ] } } } ) );
	assert.deepEqual( loadPaletteSlugs( path.join( dir, 'theme.json' ) ), [ { slug: 'primary', name: 'Primary' } ] );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'name rules: each proposes its role and ignores other names', () => {
	assert.equal( ruleLinkHover( w( 'text-link-hover' ) ).role, 'link-hover' );
	assert.equal( ruleLinkHover( w( 'text-link' ) ), null );
	assert.equal( ruleLink( w( 'text-link' ) ).role, 'link' );
	assert.equal( ruleLink( w( 'text-body' ) ), null );
	assert.equal( ruleHeading( w( 'text-heading' ) ).role, 'heading' );
	assert.equal( ruleHeading( w( 'text-body' ) ), null );
	assert.equal( ruleReserved( w( 'surface-header' ) ).role, null );
	assert.equal( ruleReserved( w( 'social-linkedin' ) ).role, null );
	assert.equal( ruleReserved( w( 'surface-white' ) ), null );
	assert.equal( ruleOnGround( w( 'tint-on-blue', { sectionWords: [ 'blue' ] } ) ).role, 'section-text' );
	assert.equal( ruleOnGround( w( 'section-text' ) ).role, 'section-text' );
	assert.equal( ruleOnGround( w( 'tint-on-blue', { sectionWords: [ 'gold' ] } ) ), null );
	assert.equal( ruleOnGround( w( 'surface-section-blue' ) ), null );
	assert.equal( ruleSection( w( 'surface-section-blue' ) ).role, 'section' );
	assert.equal( ruleSection( w( 'surface-white' ) ), null );
	assert.equal( ruleFooter( w( 'footer-bg' ) ).role, 'footer-bg' );
	assert.equal( ruleBorder( w( 'border-subtle', { hex: '#D4DBE5' } ) ).role, 'border' );
	assert.equal( ruleBorder( w( 'border-light', { hex: '#E5E7EB' } ) ).role, 'border-light' );
	assert.equal( ruleBorder( w( 'border-accent', { hex: '#D8CA50' } ) ).role, null, 'a saturated border is not the divider' );
	assert.equal( ruleStatus( w( 'success' ) ).role, 'success' );
	assert.equal( ruleStatus( w( 'danger-light' ) ).role, 'error-light' );
	assert.equal( ruleStatus( w( 'green' ) ), null );
	assert.equal( ruleWhatsapp( w( 'whatsapp-green' ) ).role, 'whatsapp' );
	assert.equal( ruleTextMuted( w( 'grey-muted' ) ).role, 'text-muted' );
	assert.equal( ruleTextMuted( w( 'brand-muted' ) ), null );
	assert.equal( ruleTextInverse( w( 'text-inverse' ) ).role, 'text-inverse' );
	assert.equal( ruleText( w( 'grey-body' ) ).role, 'text' );
	assert.equal( ruleText( w( 'surface-text' ) ), null );
	assert.equal( ruleSurface( w( 'surface-cool' ) ).role, 'surface' );
	assert.equal( ruleSurface( w( 'brand-blue' ) ), null );
	assert.equal( ruleBrand( w( 'brand-blue', { family: { role: 'primary', why: 'x' } } ) ).role, 'primary' );
	assert.equal( ruleBrand( w( 'brand-blue-hover', { family: { role: 'primary', why: 'x' } } ) ).role, 'primary-dark' );
	assert.equal( ruleBrand( w( 'brand-gold-light', { family: { role: 'accent', why: 'x' } } ) ).role, 'accent-light' );
	assert.equal( ruleBrand( w( 'brand-gold-mid', { family: { role: 'accent', why: 'x' } } ) ).role, null );
	assert.equal( ruleBrand( w( 'brand-blue' ) ), null );
} );

test( 'brand families: an explicit role word wins, then the most used base colour', () => {
	const g = ( n ) => ( { summary: { total: n } } );
	const groupOf = new Map( [ [ '--brand-blue', g( 60 ) ], [ '--brand-blue-hover', g( 3 ) ], [ '--brand-gold', g( 48 ) ], [ '--brand-gold-light', g( 40 ) ] ] );
	const colours = [ ...groupOf.keys() ].map( ( name ) => ( { name } ) );
	const f = brandFamilies( colours, groupOf );
	assert.equal( f.get( '--brand-blue' ).role, 'primary', 'base use 60 beats 48 even though gold shades sum higher' );
	assert.equal( f.get( '--brand-gold-light' ).role, 'accent' );
	const named = brandFamilies( [ { name: '--brand-blue' }, { name: '--accent' } ], new Map( [ [ '--brand-blue', g( 1 ) ], [ '--accent', g( 0 ) ] ] ) );
	assert.equal( named.get( '--accent' ).role, 'accent' );
	assert.equal( named.get( '--brand-blue' ).role, 'primary' );
} );

test( 'usage rules: heading, link, base surface, border, dark text and a high-chroma ground', () => {
	const s = ( rows ) => summariseUsage( rows.map( ( [ property, tag, count ] ) => ( { hex: '#X', property, tag, count, draftId: 'd' } ) ), new Set( [ '#X' ] ) );
	assert.equal( ruleFromUsage( s( [ [ 'color', 'h2', 5 ], [ 'color', 'p', 1 ] ] ), '#2C3E50' ).role, 'heading' );
	assert.equal( ruleFromUsage( s( [ [ 'color', 'a', 5 ] ] ), '#0A7EA8' ).role, 'link' );
	assert.equal( ruleFromUsage( s( [ [ 'background-color', 'body', 1 ] ] ), '#FFFFFF' ).role, 'surface' );
	assert.equal( ruleFromUsage( s( [ [ 'border-top-color', 'div', 4 ] ] ), '#D4DBE5' ).role, 'border' );
	assert.equal( ruleFromUsage( s( [ [ 'color', 'p', 4 ] ] ), '#333333' ).role, 'text' );
	assert.equal( ruleFromUsage( s( [ [ 'background-color', 'button', 4 ] ] ), '#E4572E' ).role, 'primary' );
	assert.equal( ruleFromUsage( s( [] ), '#333333' ), null );
} );
