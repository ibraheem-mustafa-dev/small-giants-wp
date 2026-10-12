// Spec 48 FR-48-31, lib/tokens.mjs: every custom property in an export's tokens/*.css is listed with its resolved
// value, its var() chain and its type, read with no render. Indus's three token files give 34, 27 and 13 tokens; a
// var() cycle and a missing reference are problems with a null value, never an empty one (R-48-3).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTokenCss, resolveTokens, readTokens, colourHex, tokenType } from '../lib/tokens.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const INDUS = path.resolve( HERE, '../../../sites/indus-foods/handoff' );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-palette', 'export' );
const byName = ( list ) => Object.fromEntries( list.map( ( t ) => [ t.name, t ] ) );

test( 'FR-48-31: every custom property in Indus tokens/*.css is listed, resolved, with no problems', () => {
	const r = readTokens( INDUS );
	assert.deepEqual( r.files, { 'tokens/colors.css': 34, 'tokens/spacing.css': 27, 'tokens/typography.css': 13 } );
	assert.equal( r.tokens.length, 74 );
	assert.deepEqual( r.problems, [] );
	for ( const t of r.tokens ) {
		assert.ok( t.resolved && ! /var\(/.test( t.resolved ), `${ t.name } resolved to ${ t.resolved }` );
		assert.equal( t.selector, ':root', `${ t.name } in ${ t.file } has selector ${ t.selector }` );
	}
} );

test( 'FR-48-31: Indus var() chains resolve to normalised hex', () => {
	const t = byName( readTokens( INDUS ).tokens );
	assert.equal( t[ '--text-heading' ].hex, '#2C3E50' );
	assert.deepEqual( t[ '--text-heading' ].chain, [ '--slate' ] );
	assert.equal( t[ '--text-link' ].hex, t[ '--brand-blue' ].hex );
	assert.equal( t[ '--text-link' ].hex, '#0A7EA8' );
	assert.equal( t[ '--selection-fg' ].hex, '#1E2A3C' );
	assert.equal( t[ '--surface-section-gold' ].hex, '#D8CA50' );
	assert.equal( t[ '--gradient-brand' ].type, 'gradient' );
	assert.equal( t[ '--gradient-brand' ].hex, undefined );
	assert.equal( t[ '--shadow-card' ].type, 'shadow' );
	assert.equal( t[ '--ease-spring' ].type, 'easing' );
	assert.equal( t[ '--font-body' ].type, 'font-family' );
	assert.equal( t[ '--fs-h1' ].type, 'font-size' );
	assert.equal( t[ '--fs-h1' ].resolved, 'clamp(36px,5vw,62px)' );
	assert.equal( t[ '--lh-body' ].type, 'number' );
	assert.equal( t[ '--gap-3' ].type, 'length' );
	assert.equal( t[ '--tracking-eyebrow' ].type, 'length' );
} );

test( 'MUST FAIL: a semicolon or brace inside an @import string does not end the statement early', () => {
	// Indus typography.css has "wght@500;600" inside its @import url(); a bare-string @import has no parentheses to
	// protect it, so without string handling the :root rule's selector swallows the rest of the URL.
	const t = parseTokenCss( '@import url("https://x.test/css?a=1;2;3");\n@import "https://y.test/b.css?c={1;d";\n:root{--a:1px}\n', 't.css' );
	assert.deepEqual( t.map( ( x ) => [ x.name, x.selector, x.line ] ), [ [ '--a', ':root', 3 ] ] );
} );

test( 'MUST FAIL: comments holding braces and semicolons are skipped, not parsed', () => {
	const t = parseTokenCss( '/* :root{--ghost:#000;} */\n:root{ --a:/* note; } */#fff; --b : 2px /* x */ ; }', 'c.css' );
	assert.deepEqual( t.map( ( x ) => [ x.name, x.value ] ), [ [ '--a', '#fff' ], [ '--b', '2px' ] ] );
} );

test( 'parser: nested parentheses, strings, multiple selectors, @media, element rules, @keyframes, !important, lines', () => {
	const css = [
		':root{--fluid:clamp(16px, calc(1rem + 2vw), 48px);--s:"a;b}c";--e:cubic-bezier(.2,.8,.2,1)}',
		'@media (min-width: 768px){ @supports (display:grid){ :root{ --gap:24px !important; } } }',
		'h1, h2 { color: red; --h-size: 40px; }',
		'@keyframes spin { from { --k: 0 } to { --k: 1 } }',
		'.card { --c: 1px; &:hover { --c-hover: 2px; } }',
	].join( '\n' );
	const t = byName( parseTokenCss( css, 'p.css' ) );
	assert.equal( t[ '--fluid' ].value, 'clamp(16px, calc(1rem + 2vw), 48px)' );
	assert.equal( t[ '--s' ].value, '"a;b}c"' );
	assert.equal( t[ '--e' ].value, 'cubic-bezier(.2,.8,.2,1)' );
	assert.equal( t[ '--gap' ].value, '24px' );
	assert.equal( t[ '--gap' ].media, '@media (min-width: 768px) and @supports (display:grid)' );
	assert.equal( t[ '--gap' ].line, 2 );
	assert.equal( t[ '--h-size' ].selector, 'h1, h2' );
	assert.equal( t[ '--k' ], undefined, '@keyframes declarations are not site tokens' );
	assert.equal( t[ '--c-hover' ].selector, '.card:hover' );
	assert.equal( t[ '--fluid' ].file, 'p.css' );
} );

test( 'MUST FAIL: a var() cycle and a missing reference are problems with a null value, never empty', () => {
	const { tokens, problems } = resolveTokens( parseTokenCss( ':root{--a:var(--b);--b:var(--a);--m:var(--nope);--ok:var(--m2, #fff)}', 'x.css' ) );
	const t = byName( tokens );
	assert.equal( t[ '--a' ].resolved, null );
	assert.equal( t[ '--b' ].resolved, null );
	assert.equal( t[ '--m' ].resolved, null );
	assert.equal( t[ '--a' ].type, 'unresolved' );
	const kinds = problems.map( ( p ) => `${ p.token }:${ p.kind }` ).sort();
	assert.deepEqual( kinds, [ '--a:cycle', '--b:cycle', '--m:missing' ] );
	assert.match( problems.find( ( p ) => '--a' === p.token ).error, /--a -> --b -> --a/ );
	assert.match( problems.find( ( p ) => '--m' === p.token ).error, /--nope is not declared/ );
	assert.equal( t[ '--ok' ].hex, '#FFFFFF', 'a missing reference with a fallback takes the fallback' );
	assert.equal( t[ '--ok' ].fallback, true );
} );

test( 'MUST FAIL: var() fallbacks are honoured, nested, and a cycle with a fallback takes it', () => {
	const { tokens, problems } = resolveTokens( parseTokenCss( ':root{--x:var(--no, var(--no2, rgb(0 0 255)));--c1:var(--c2);--c2:var(--c1, red)}', 'f.css' ) );
	const t = byName( tokens );
	assert.equal( t[ '--x' ].hex, '#0000FF' );
	assert.deepEqual( t[ '--x' ].chain, [ '--no', '--no2' ] );
	assert.equal( t[ '--c1' ].hex, '#FF0000' );
	assert.deepEqual( problems.map( ( p ) => p.token ), [] );
} );

test( 'resolution: a :root declaration outside at-rules is the referenced value; others are listed with their own', () => {
	const r = readTokens( FIXTURE );
	const page = r.tokens.filter( ( t ) => '--surface-page' === t.name );
	assert.deepEqual( page.map( ( t ) => [ t.hex, t.media ] ), [ [ '#FFFFFF', null ], [ '#111111', '@media (prefers-color-scheme: dark)' ] ] );
	const card = r.tokens.find( ( t ) => '--card-ground' === t.name );
	assert.equal( card.selector, '.card,.panel' );
	assert.equal( card.hex, '#F7F7F7' );
	assert.equal( r.tokens.find( ( t ) => '--gradient-hero' === t.name ).resolved, 'linear-gradient(90deg,#1F7A7A 0%,rgb(245 158 11) 100%)' );
	assert.equal( r.tokens.find( ( t ) => '--with-fallback' === t.name ).hex, '#ABCDEF' );
	assert.ok( ! r.tokens.some( ( t ) => '--not-a-token' === t.name ) );
	assert.deepEqual( r.problems.map( ( p ) => `${ p.token }:${ p.kind }` ).sort(), [ '--loop-a:cycle', '--loop-b:cycle', '--orphan:missing' ] );
} );

test( 'colourHex normalises hex, rgb(), hsl() and named colours, alpha-aware', () => {
	const cases = { '#abc': '#AABBCC', '#0a7ea8': '#0A7EA8', '#0A7EA880': '#0A7EA880', '#fff8': '#FFFFFF88', 'rgb(10, 126, 168)': '#0A7EA8',
		'rgba(255,255,255,.05)': '#FFFFFF0D', 'rgb(100% 0% 0% / 50%)': '#FF000080', 'hsl(0, 100%, 50%)': '#FF0000',
		'hsl(120deg 100% 25%)': '#008000', 'hsla(.5turn, 50%, 50%, 1)': '#40BFBF', RebeccaPurple: '#663399', white: '#FFFFFF',
		transparent: '#00000000', currentColor: null, 'var(--x)': null, 'linear-gradient(#fff,#000)': null, '#12345': null };
	for ( const [ v, want ] of Object.entries( cases ) ) {
		assert.equal( colourHex( v ), want, v );
	}
} );

test( 'tokenType distinguishes font-size by name and length by value', () => {
	assert.equal( tokenType( '--fs-body', '19px' ), 'font-size' );
	assert.equal( tokenType( '--gap-1', '19px' ), 'length' );
	assert.equal( tokenType( '--x', 'auto' ), 'other' );
	assert.equal( tokenType( '--x', null ), 'unresolved' );
} );

test( 'readTokens: a folder without tokens/ is a problem, not an empty success', () => {
	const r = readTokens( HERE );
	assert.deepEqual( r.tokens, [] );
	assert.equal( r.problems[ 0 ].kind, 'missing-folder' );
} );
