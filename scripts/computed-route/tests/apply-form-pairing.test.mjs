// The trade application form's pairing and the form states written from it. Run: node --test tests/apply-form-pairing.test.mjs
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
const refreshed = read( 'build', 'form-trade-application.pairs.json' );
const num = ( ref ) => Number( ref.split( '-' ).pop() );

test( 'the refreshed pairs replace the origin leftovers: a ref the post no longer has is dropped, never reported as a pair without a block', () => {
	const { pairs, stale } = pairsReport( {}, origin, refreshed );
	const refs = pairs.map( ( p ) => p.ref );
	assert.equal( refs.length, Object.keys( refreshed.pairs ).length );
	assert.ok( refs.every( ( r ) => r in refreshed.pairs ), 'every pair is one the refresh names' );
	// The origin file still names refs 51 to 78 (an earlier build of the form); none of them is a pair now.
	const old = Object.keys( origin ).filter( ( r ) => num( r ) >= 51 );
	assert.ok( old.length >= 20 );
	assert.ok( old.every( ( r ) => ! refs.includes( r ) && stale.includes( r ) ), 'the stale origin refs are dropped and listed as stale' );
	// The tile fields (draft element 47) and the form root (6) are paired.
	assert.ok( pairs.some( ( p ) => /\/47#0$/.test( p.tpl ) ) && pairs.some( ( p ) => /\/6#0$/.test( p.tpl ) ) );
} );

test( 'negative control: without a refreshed file the origin refs stay pairs', () => {
	const { pairs } = pairsReport( {}, origin, null );
	assert.ok( pairs.some( ( p ) => num( p.ref ) >= 51 ) );
} );

test( 'the invalid-step shake is written on the form root from A-33 for the trade form, and A-35 for the enquiry form', () => {
	const records = read( 'handoff', 'animations.json' ).records;
	const db = openDb();
	const rawSnapshot = read( 'theme-snapshot.json' );
	const run = ( tpl ) => invalidShake( { target: { ref: 'cr-ref-x-0', tpl }, block: 'sgs/form', saved: {}, recordsIndex: new Map(), records, db, rawSnapshot } );
	const trade = run( 'Root>TradeApplication@466#0/6#0' );
	assert.equal( trade[ 0 ].status, 'op' );
	assert.equal( trade[ 0 ].record, 'A-33' );
	assert.equal( trade[ 0 ].writes[ 0 ].value.elements.root.entrance.base.state, 'invalid' );
	assert.equal( run( 'Root>EnquiryForm@468#0/6#0' )[ 0 ].record, 'A-35' );
	// Negative control: a form the draft has no validation record for gets nothing.
	assert.deepEqual( run( 'Root>CareersForm@1#0/6#0' ), [] );
} );
