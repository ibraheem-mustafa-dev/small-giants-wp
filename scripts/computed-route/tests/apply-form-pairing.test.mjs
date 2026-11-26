// The trade application form's pairing, read from the form's origin (`form-trade-application.origin.json`, the draft element each saved
// block was written from: lib/apply-targets.mjs::pairsReport), and the form states written from the form's draft component.
// Run: node --test tests/apply-form-pairing.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { invalidShake } from '../lib/apply-family-statemotion.mjs';
import { pairsReport } from '../lib/apply-targets.mjs';
import { openDb } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SITE = path.join( HERE, '..', '..', '..', 'sites', 'indus-foods' );
const read = ( ...p ) => JSON.parse( fs.readFileSync( path.join( SITE, ...p ), 'utf8' ) );
const origin = read( 'build', 'form-trade-application.origin.json' );
const refs = Object.keys( origin );
const num = ( ref ) => Number( ref.split( '-' ).pop() );
const rootRef = refs.find( ( r ) => /\/6#0$/.test( origin[ r ].tpl ) );
const tileRef = refs.find( ( r ) => /\/47#0$/.test( origin[ r ].tpl ) );
// The origin still names refs 51 to 78: blocks of the form the post holds, each with the element it was saved from.
const lateRefs = refs.filter( ( r ) => num( r ) >= 51 );
const gone = 'cr-ref-form-trade-application-999';

test( 'the origin is the form\'s pairing: every block it names is a pair on its own draft element, the tile fields (47) and the form root (6) included', () => {
	const { pairs, stale, disagree } = pairsReport( {}, origin, null );
	assert.deepEqual( pairs.map( ( p ) => p.ref ), refs );
	assert.ok( pairs.every( ( p ) => p.tpl === origin[ p.ref ].tpl ), 'each pair is the origin\'s element' );
	assert.deepEqual( [ stale, disagree ], [ [], [] ] );
	assert.ok( rootRef && tileRef && lateRefs.length >= 20, 'the real origin holds the root, the tile fields and refs 51 to 78' );
	assert.equal( pairs.find( ( p ) => p.ref === tileRef ).tpl, 'Root>TradeApplication@466#0/47#0' );
	assert.equal( pairs.find( ( p ) => p.ref === rootRef ).tpl, 'Root>TradeApplication@466#0/6#0' );
} );

test( 'a refreshed pairs file replaces an old pair: a ref the post no longer has is dropped and listed as stale, never reported as a pair without a block', () => {
	const cfg = { pairs: [ { live: `.${ gone }`, draft: { tpl: 'Root>TradeApplication@466#0/9#0' } } ] };
	const refreshed = { pairs: { [ rootRef ]: { tpl: origin[ rootRef ].tpl } }, unpaired: {} };
	const { pairs, stale } = pairsReport( cfg, origin, refreshed );
	assert.deepEqual( stale, [ gone ] );
	assert.ok( ! pairs.some( ( p ) => p.ref === gone ), 'the stale ref is not a pair' );
	assert.equal( pairs.length, refs.length, 'every origin ref is still a pair' );
} );

test( 'negative control: without a refreshed file the old pair stays', () => {
	const cfg = { pairs: [ { live: `.${ gone }`, draft: { tpl: 'Root>TradeApplication@466#0/9#0' } } ] };
	const { pairs, stale } = pairsReport( cfg, origin, null );
	assert.ok( pairs.some( ( p ) => p.ref === gone ) );
	assert.deepEqual( stale, [] );
} );

test( 'a refreshed file that does not name the later refs (51 to 78) never drops them: the origin holds them', () => {
	const refreshed = { pairs: { [ rootRef ]: { tpl: origin[ rootRef ].tpl } }, unpaired: {} };
	const { pairs, stale } = pairsReport( {}, origin, refreshed );
	assert.deepEqual( stale, [] );
	assert.ok( lateRefs.every( ( r ) => pairs.some( ( p ) => p.ref === r && p.tpl === origin[ r ].tpl ) ), 'every late ref stays a pair on its origin element' );
} );

test( 'a refreshed pair that names another element than the origin never moves the tile fields: the origin\'s element stays and the disagreement is listed', () => {
	const refreshed = { pairs: { [ tileRef ]: { tpl: 'Root>TradeApplication@466#0/23#0' } }, unpaired: {} };
	const { pairs, disagree } = pairsReport( {}, origin, refreshed );
	assert.equal( pairs.find( ( p ) => p.ref === tileRef ).tpl, origin[ tileRef ].tpl );
	assert.deepEqual( disagree, [ { ref: tileRef, source: 'refresh', was: 'Root>TradeApplication@466#0/23#0', origin: origin[ tileRef ].tpl } ] );
} );

test( 'the invalid-step shake is written on the form root from A-33 for the trade form, and A-35 for the enquiry form', () => {
	const records = read( 'handoff', 'animations.json' ).records;
	const db = openDb();
	const rawSnapshot = read( 'theme-snapshot.json' );
	const run = ( tpl ) => invalidShake( { target: { ref: 'cr-ref-x-0', tpl }, block: 'sgs/form', saved: {}, recordsIndex: new Map(), records, db, rawSnapshot } );
	// The form roots are the origin files' own root rows.
	const rootTpl = ( file ) => Object.values( read( 'build', file ) ).map( ( r ) => r.tpl ).find( ( t ) => /\/6#0$/.test( t ) );
	const trade = run( rootTpl( 'form-trade-application.origin.json' ) );
	assert.equal( trade[ 0 ].status, 'op' );
	assert.equal( trade[ 0 ].record, 'A-33' );
	assert.equal( trade[ 0 ].writes[ 0 ].value.elements.root.entrance.base.state, 'invalid' );
	assert.equal( run( rootTpl( 'form-enquiry.origin.json' ) )[ 0 ].record, 'A-35' );
	// Negative control: a form the draft has no validation record for gets nothing.
	assert.deepEqual( run( 'Root>CareersForm@1#0/6#0' ), [] );
} );
