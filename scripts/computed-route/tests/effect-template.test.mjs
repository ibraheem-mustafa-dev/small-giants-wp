// The committed cut of the fact record's template (lib/motion-behaviour-settings.mjs::effectTemplateOf,
// build/intake/effect-template.json): facts.json is gitignored, so the intake review reads this cut on a checkout without it
// (lib/intake-review.mjs::factTemplate) and must recognise every behaviour exactly as the full template does. The records
// and template are a real client's saved intake records (tests/fixtures/behaviour-shape/draft-records.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recogniseBehaviour, effectRows } from '../lib/motion-behaviours.mjs';
import { templateOf, effectTemplateOf, EFFECT_TEMPLATE } from '../lib/motion-behaviour-settings.mjs';
import { factTemplate } from '../lib/intake-review.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'behaviour-shape', 'draft-records.json' ), 'utf8' ) );
const RECORDS = FIX.records;
// The fixture's template as a fact record holds it, with the fields the recognisers never read added, as facts.json has them.
const FACTS = { elements: Object.fromEntries( Object.entries( FIX.template.elements ).map( ( [ k, t ] ) => [ k, { template: { ...t, membership: { scIf: [] }, events: [], srcLine: 1, holes: ( t.holes || [] ).map( ( h, i ) => ( { id: `h${ i }`, expr: 'x', ...h } ) ) } } ] ) ) };
const roundTrip = ( v ) => JSON.parse( JSON.stringify( v ) );
const recognised = ( template ) => RECORDS.map( ( r ) => JSON.stringify( ( ( b ) => b && { kind: b.kind, blocks: b.blocks ?? null, effects: b.effects ?? null, to: b.to ?? null } )( recogniseBehaviour( r, { records: RECORDS, template } ) ) ) );

test( 'MUST FAIL: the cut template recognises every behaviour as the full one does (the dot pulse, the pinned timeline, the accordion scroll, the close)', () => {
	const cut = roundTrip( effectTemplateOf( FACTS ) );
	assert.deepEqual( recognised( cut ), recognised( templateOf( FACTS ) ) );
	assert.deepEqual( effectRows( RECORDS, { template: cut } ), effectRows( RECORDS, { template: templateOf( FACTS ) } ) );
	assert.ok( recognised( cut ).some( ( b ) => b.includes( 'openStatusDotPulse' ) ) && recognised( cut ).some( ( b ) => b.includes( 'pinned-horizontal' ) ) );
} );

test( 'negative control: the cut drops what no recogniser reads, and no facts give no template', () => {
	const cut = effectTemplateOf( FACTS );
	const one = Object.values( cut.elements ).find( ( e ) => e.holes?.length );
	assert.deepEqual( Object.keys( one.holes[ 0 ] ), [ 'where' ] );
	assert.ok( Object.values( cut.elements ).every( ( e ) => ! ( 'membership' in e ) && ! ( 'events' in e ) && ! ( 'srcLine' in e ) ) );
	assert.ok( Object.values( cut.elements ).every( ( e ) => ! ( e.style?.static || [] ).some( ( [ , v ] ) => 'initial' === v ) ) );
	assert.equal( effectTemplateOf( null ), null );
} );

test( 'MUST FAIL: the review reads facts.json when it is there, the committed cut beside it when it is not, and nothing without either', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'effect-template-' ) );
	const facts = path.join( dir, 'facts.json' );
	assert.equal( factTemplate( facts ), null );
	fs.writeFileSync( path.join( dir, EFFECT_TEMPLATE ), JSON.stringify( effectTemplateOf( FACTS ) ) );
	assert.deepEqual( recognised( factTemplate( facts ) ), recognised( templateOf( FACTS ) ), 'a checkout without facts.json reads the cut' );
	fs.writeFileSync( facts, JSON.stringify( FACTS ) );
	assert.deepEqual( factTemplate( facts ), templateOf( FACTS ), 'facts.json wins when it is there' );
	fs.rmSync( dir, { recursive: true, force: true } );
} );
