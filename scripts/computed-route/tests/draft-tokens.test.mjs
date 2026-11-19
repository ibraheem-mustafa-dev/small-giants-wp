// A declared value written with a draft token (`var(--radius-pill)`, Spec 48A FR-48A-17) is read as the token's value by
// every reader of declared styles, through one function (scripts/parity/lib/css-vars.mjs::resolveVars) and two lookups:
// the draft's own token files and :root rules (lib/draft-tokens.mjs) and the custom properties the browser computed for
// an element (parity/lib/devtools.mjs::withTokens). Fixture: tests/fixtures/draft-tokens/sites/tokens-client/handoff.
// Mutations: tests/fixtures/draft-tokens/mutations.json. The browser test opens local HTML only, never a site.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveVars, hasVar } from '../../parity/lib/css-vars.mjs';
import { draftTokens, draftTokenLookup } from '../lib/draft-tokens.mjs';
import { declared } from '../lib/skeleton-rules.mjs';
import { staticLists } from '../lib/read-template.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, 'fixtures', 'draft-tokens' );
const FOLDER = path.join( ROOT, 'sites', 'tokens-client', 'handoff' );
const lookup = draftTokenLookup( FOLDER );

test( 'MUST FAIL: resolveVars follows an alias chain, a fallback and a token inside a longer value', () => {
	assert.equal( resolveVars( 'var(--radius-pill)', lookup ), '999px' );
	assert.equal( resolveVars( 'var(--pad-y) 14px', lookup ), '6px 14px' );
	assert.equal( resolveVars( 'var(--missing, var(--pad-y))', lookup ), '6px' );
	assert.equal( resolveVars( 'calc(var(--pad-y) * 2)', lookup ), 'calc(6px * 2)' );
} );

test( 'negative control: a missing token with no fallback and a cycle stay unresolved; a value with no var() is returned as written', () => {
	assert.equal( resolveVars( 'var(--missing)', lookup ), null );
	assert.equal( resolveVars( 'var(--a)', ( n ) => ( { '--a': 'var(--b)', '--b': 'var(--a)' } )[ n ] ), null );
	assert.equal( resolveVars( '2px solid red', lookup ), '2px solid red' );
	assert.equal( hasVar( 'my-var(--x)' ), false, 'a function whose name ends in var is no var()' );
} );

test( 'MUST FAIL: the draft lookup reads the token files and the drafts\' :root rules, a :root declaration outside any at-rule winning', () => {
	const t = draftTokens( FOLDER );
	assert.equal( t[ '--gap' ], '12px', 'the media-query redefinition does not replace the :root value' );
	assert.equal( t[ '--track-label' ], '.14em', 'a :root rule inside a draft\'s <style> is read' );
	assert.equal( t[ '--local' ], '1px', 'a name declared only outside :root takes its first declaration' );
} );

test( 'MUST FAIL: the standing rules\' declared style reads a token as its value; without a lookup it stays as written', () => {
	const e = { attrs: { style: 'border-radius:var(--radius-pill);padding:var(--pad-y) 14px;color:var(--nope)' } };
	assert.deepEqual( declared( e, lookup ), { 'border-radius': '999px', padding: '6px 14px', color: 'var(--nope)' } );
	assert.deepEqual( declared( e ), { 'border-radius': 'var(--radius-pill)', padding: 'var(--pad-y) 14px', color: 'var(--nope)' } );
} );

test( 'MUST FAIL: the template reader expands a shorthand written with a token, so its longhands are known', () => {
	const recs = [ { styleText: { style: 'border:var(--line);margin:0' } } ];
	assert.deepEqual( staticLists( recs, lookup ).lists[ 0 ], [ [ 'border', '2px solid #3A2A22' ], [ 'margin', '0' ] ] );
	assert.deepEqual( staticLists( recs ).lists[ 0 ], [ [ 'border', 'var(--line)' ], [ 'margin', '0' ] ] );
} );

// The label rule (lib/skeleton-rules.mjs, rules.label): a short run of words drawn as a pill is a label block.
const db = openDb();
const factsFor = ( client ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: path.resolve( HERE, '../../..' ) } );
	return { ...f, repo: ROOT, client };
};
const inventory = ( style ) => ( { checks: {}, source: 'fixture', root: 'section', generated: 'fixture', elements: [ [ 'section', null, 0, '' ], [ 'span', 'Root/1#0', 1, 'Oats (gluten)' ] ].map( ( [ tag, parentKey, depth, words ], i ) => ( {
	key: `Root/${ i + 1 }#0`, parentKey, depth, tag, template: 'Root', tpl: i + 1, attrs: 'span' === tag ? { style } : {}, words, allText: words || 'Oats (gluten)', membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }>${ words }</${ tag }>`,
	box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: 0, w: 'span' === tag ? 120 : 600, h: 30 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {},
} ) ) } );
const pill = ( style, client = 'tokens-client' ) => proposeSkeleton( { inventory: inventory( style ), facts: factsFor( client ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db } ).proposal.rows.find( ( r ) => 'span' === r.tag );

test( 'MUST FAIL: a pill whose radius is a draft token is a label block, as the same pill written with literals is', () => {
	assert.equal( pill( 'border-radius:var(--radius-pill);padding:var(--pad-y) 14px' ).block, 'sgs/label' );
	assert.equal( pill( 'border-radius:999px;padding:6px 14px' ).block, 'sgs/label', 'the literal pill (old shape) is unchanged' );
} );

test( 'negative control: a token the draft does not declare stays unread, so no pill is assumed', () => {
	assert.notEqual( pill( 'border-radius:var(--radius-pill);padding:6px 14px', 'no-such-client' ).block, 'sgs/label' );
} );

// The DevTools read of a draft (Fill's declared values, FR-48-8).
let browser;
before( async () => {
	const { chromium } = await import( 'playwright' );
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );
const RESOLVE = resolveFinder.toString();
const read = async ( html, tokens, written = null ) => {
	const page = await browser.newPage();
	await page.setContent( html );
	const cdp = await openDevtools( page );
	const out = await declaredValues( cdp, '#x', RESOLVE, null, { tokens, written } );
	await page.close();
	return out;
};
const TOKENS = '<style>:root{--line:2px solid #3A2A22;--big:999px;--r:var(--big);--pad:6px}</style>';

test( 'MUST FAIL: a draft read takes a shorthand written with a token as its longhands, and a token longhand as its value', async () => {
	const d = await read( `${ TOKENS }<div id="x" style="border:var(--line);border-radius:var(--r);padding:var(--pad) 14px;color:var(--nope, red)">x</div>`, true );
	assert.equal( d[ 'border-top-width' ], '2px' );
	assert.equal( d[ 'border-left-color' ], 'rgb(58, 42, 34)' );
	assert.equal( d[ 'border-top-left-radius' ], '999px' );
	assert.deepEqual( [ d[ 'padding-top' ], d[ 'padding-right' ] ], [ '6px', '14px' ] );
	assert.equal( d.color, 'red' );
} );

test( 'negative control: a read without tokens (a built page) and a draft with literals are as before', async () => {
	const raw = await read( `${ TOKENS }<div id="x" style="border:var(--line);color:var(--nope, red)">x</div>`, false );
	assert.equal( raw[ 'border-top-width' ], undefined );
	assert.equal( raw.color, 'var(--nope, red)' );
	const html = '<div id="x" style="border:2px solid #3A2A22;padding:6px 14px">x</div>';
	assert.deepEqual( await read( html, true ), await read( html, false ) );
} );

test( 'MUST FAIL: a draft read hands the token reference writer each declaration as written', async () => {
	const written = {};
	await read( `${ TOKENS }<div id="x" style="border-radius:var(--r);padding:6px">x</div>`, true, written );
	assert.deepEqual( written, { 'border-top-left-radius': 'var(--r)', 'border-top-right-radius': 'var(--r)', 'border-bottom-right-radius': 'var(--r)', 'border-bottom-left-radius': 'var(--r)', 'border-radius': 'var(--r)' } );
} );
