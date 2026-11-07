// A hover whose effect spans several elements writes each element's hover. Run: node --test tests/apply-hover-span.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCalibration } from '../lib/cache.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { hoverDeclarations, spanItems } from '../lib/apply-hover-span.mjs';
import { openDb } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const handoff = JSON.parse( fs.readFileSync( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'handoff', 'animations.json' ), 'utf8' ) );
const snapshot = loadSnapshot( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const main = handoff.drafts?.[ 0 ]?.dc;
const db = openDb();
const calFor = ( block ) => loadCalibration( path.join( HERE, '..', 'cache' ), block, 'local-indus' );
// The footer's Back to top: the button (726) with its ring (727) inside it, as the real records give them.
const button = { ref: 'cr-ref-footer-45', key: 'cr-ref-footer-45', tpl: 'Root/726#0' };
const ring = { ref: 'cr-ref-footer-46', key: 'cr-ref-footer-46', tpl: 'Root/727#0' };
const blocks = { [ button.ref ]: { block: 'sgs/button', attrs: {} }, [ ring.ref ]: { block: 'sgs/icon', attrs: {} } };
const ctx = ( records ) => ( { target: button, block: 'sgs/button', saved: {}, surface: { pairs: [ button, ring ] }, recordsIndex: recordIndex( records, main ), db, calFor, snapshot, rawSnapshot: null, all: { blocks } } );
const wanted = handoff.records.filter( ( r ) => [ 'TR-105', 'TR-106' ].includes( r.id ) );

test( 'the style-hover text of a record is read as declarations', () => {
	const d = hoverDeclarations( wanted.find( ( r ) => 'TR-105' === r.id ) );
	assert.equal( d.color, '#D8CA50' );
	assert.equal( d[ '--tb' ], '#D8CA50' );
	assert.equal( d[ '--tbg' ], 'rgba(216,202,80,.12)' );
} );

test( 'back to top: the text colour, the ring border and the ring tint are each written on their own block', () => {
	const items = spanItems( ctx( wanted ) );
	const byAttr = Object.fromEntries( items.filter( ( i ) => i.writes ).flatMap( ( i ) => i.writes.map( ( w ) => [ w.attr, { value: w.value, ref: i.ref ?? button.ref } ] ) ) );
	assert.equal( byAttr.colourTextHover?.ref, button.ref, JSON.stringify( items ) );
	assert.equal( byAttr.borderColourHover?.ref, ring.ref );
	assert.equal( byAttr.backgroundColourHover?.ref, ring.ref );
} );

test( 'negative control: a hover with no child driven by it, or a text colour already stored, writes nothing for them', () => {
	assert.deepEqual( spanItems( ctx( wanted.filter( ( r ) => 'TR-105' === r.id ) ) ).filter( ( i ) => i.ref ), [] );
	const held = { ...ctx( wanted ), saved: { colourTextHover: '#D8CA50' } };
	assert.ok( ! spanItems( held ).some( ( i ) => i.writes?.some( ( w ) => 'colourTextHover' === w.attr ) ) );
} );
