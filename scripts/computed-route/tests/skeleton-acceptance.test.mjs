// A saved client decision that only accepts the rules' own proposal is not an override (Spec 48 §3.4 step 4, FR-48-17):
// the rules run in full and keep their result (the commerce region's absorption), a rule that now proposes another label
// leaves the accepted block standing with `ruleWould`, and an override (a choice against the proposal) still wins. Rows a
// saved decision on an ancestor removed carry a source the reviewed gate reads as explained. Synthetic inventories in the
// reader's shape; tests marked MUST FAIL fail on the code before this change.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { reviewedVerdict } from '../lib/site-run-reviewed.mjs';
import * as classify from '../lib/skeleton-classify.mjs';
import { proposeFixture } from './fixtures/fixture-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const line = ( n, price ) => [ el( `Root/${ n }#${ price }`, 'Root/4#0', 'div', '', { depth: 3, loop: 9, all: `Zookies ${ price }` } ), el( `Root/${ n + 1 }#${ price }`, `Root/${ n }#${ price }`, 'div', `£${ price }.00`, { depth: 4, loop: 9 } ) ];
const CART = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Your basket' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/4#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	...line( 10, 5 ), ...line( 10, 8 ),
	el( 'Root/5#0', 'Root/3#0', 'aside', '', { depth: 2 } ),
	el( 'Root/6#0', 'Root/5#0', 'a', 'Checkout securely', { depth: 3, attrs: { href: 'Checkout.dc.html' }, keep: true } ),
	el( 'Root/7#0', 'Root/1#0', 'p', 'Baked fresh for you' ),
];
const REGION = 'Root/3#0';
const run = ( decisions = {} ) => proposeFixture( { inventory: inv( CART ), facts: facts(), surface: 'test', commerce: { role: 'cart', checkout: 'Checkout.dc.html' }, db, clientDecisions: { surfaces: { test: decisions } } } );
const decide = ( d ) => ( { [ REGION ]: { signature: 'div|', reason: 'Bean accepted it on 2026-11-01', ...d } } );
const row = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const absorbedByRule = ( r ) => r.proposal.rows.filter( ( x ) => 'absorbed' === x.action && 'commerceRegion' === x.rule ).map( ( x ) => x.key ).sort();
const shape = ( r ) => r.proposal.rows.map( ( x ) => [ x.key, x.action, x.block, x.rule ] );

test( 'overrideFor marks a decision whose label is its proposed label as an acceptance, and only that', () => {
	const f = facts();
	const get = ( d ) => classify.overrideFor( CART[ 2 ], { clientDecisions: { surfaces: { test: { [ REGION ]: { signature: 'div|', ...d } } } }, picks: {}, facts: f, surface: 'test', words: '' } );
	assert.equal( get( { block: 'core/post-content', proposed: 'core/post-content' } ).acceptance, true );
	assert.equal( classify.isOverride( get( { block: 'core/post-content', proposed: 'core/post-content' } ) ), false );
	assert.equal( classify.isOverride( get( { block: 'sgs/container', proposed: 'core/post-content' } ) ), true, 'a choice against the proposal is an override' );
	assert.equal( classify.isOverride( get( { block: 'sgs/container' } ) ), true, 'a decision saved without a baseline is an override' );
	assert.equal( classify.isOverride( get( { remove: true, proposed: 'remove' } ) ), false );
} );

test( 'MUST FAIL: an acceptance on the commerce region leaves the rule absorption of its children intact', () => {
	const none = run();
	const want = absorbedByRule( none );
	assert.ok( want.includes( 'Root/6#0' ), 'baseline: the rule absorbs the checkout link' );
	const accepted = run( decide( { block: 'core/post-content', proposed: 'core/post-content' } ) );
	assert.deepEqual( absorbedByRule( accepted ), want, 'every child the rule absorbed is still absorbed' );
	assert.equal( row( accepted, REGION ).block, 'core/post-content' );
	assert.equal( row( accepted, REGION ).ruleWould, undefined );
	assert.equal( row( accepted, REGION ).acceptedDecision, true, 'the row says an accepted proposal settled it' );
	assert.equal( none.proposal.rows.some( ( x ) => x.acceptedDecision ), false, 'negative control: no decision, no mark' );
	assert.deepEqual( shape( accepted ), shape( none ), 'the whole result equals a run with no decision' );
	assert.equal( JSON.stringify( accepted.skeleton ), JSON.stringify( none.skeleton ) );
} );

test( 'negative control: an acceptance the rules no longer match applies the accepted block and records ruleWould', () => {
	const r = run( decide( { block: 'sgs/container', proposed: 'sgs/container' } ) );
	assert.equal( row( r, REGION ).block, 'sgs/container', 'the accepted block stands' );
	assert.equal( row( r, REGION ).source, 'client decision' );
	assert.equal( row( r, REGION ).ruleWould.label, 'core/post-content', 'the rules now propose the commerce region' );
	assert.equal( row( r, REGION ).ruleWould.decision.label, 'sgs/container' );
} );

test( 'negative control: an override still wins over the rule', () => {
	const r = run( decide( { block: 'sgs/container', proposed: 'core/post-content' } ) );
	assert.equal( row( r, REGION ).block, 'sgs/container' );
	assert.equal( row( r, REGION ).source, 'client decision' );
	assert.equal( 'commerceRegion' === row( r, 'Root/6#0' ).rule && 'absorbed' === row( r, 'Root/6#0' ).action, false, 'the rule does not absorb under an override' );
	assert.equal( row( run( decide( { block: 'sgs/container' } ) ), REGION ).block, 'sgs/container', 'a decision without a baseline is an override' );
} );

test( 'MUST FAIL: descendants of a decided remove carry the decision source, so the reviewed gate explains them', () => {
	const reviewed = run().proposal.rows;
	const removed = run( decide( { remove: true, proposed: 'core/post-content' } ) );
	assert.equal( row( removed, REGION ).action, 'remove' );
	const kids = removed.proposal.rows.filter( ( x ) => x.key !== REGION && 'remove' === x.action );
	assert.ok( kids.length >= 3, 'the subtree is removed' );
	kids.forEach( ( k ) => assert.match( k.source, /^client decision \(inside Root\/3#0\)$/ ) );
	assert.doesNotThrow( () => reviewedVerdict( { surface: 'test', reviewed, proposed: removed.proposal.rows } ) );
	assert.equal( reviewed.some( ( x ) => /^client decision/.test( x.source || '' ) ), false, 'negative control: rows removed by a rule carry no saved source' );
} );

test( 'MUST FAIL: the reviewed gate explains a row whose rule result stands for an accepted proposal, and still refuses an unmarked change', () => {
	const none = run().proposal.rows;
	const reviewed = none.map( ( x ) => ( REGION === x.key ? { ...x, block: 'sgs/container' } : x ) );
	const accepted = run( decide( { block: 'core/post-content', proposed: 'core/post-content' } ) ).proposal.rows;
	assert.doesNotThrow( () => reviewedVerdict( { surface: 'test', reviewed, proposed: accepted } ) );
	assert.throws( () => reviewedVerdict( { surface: 'test', reviewed, proposed: none } ), /differ from the reviewed proposal/, 'negative control: the same change with no saved decision fails' );
} );
