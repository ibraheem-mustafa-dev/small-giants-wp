// RC10 restore review (2026-11-26): the settings behaviours are recognised from the element they target, read from the fact
// record's template (lib/motion-behaviour-settings.mjs::templateOf). Every caller outside Fill passes that template: the
// apply stage's behaviour writes (lib/apply-motion-behaviours.mjs::behaviourWrites), its descendant rows
// (lib/apply-owned.mjs::descendantRows), its stray-effect reads (lib/apply-stray.mjs::draftEffectNames, ::foreignEffects) and
// the intake review's effect rows (lib/intake-review.mjs::reviewRows). Without the template each names what it cannot read.
// The records and template are a real client's saved intake records (tests/fixtures/behaviour-shape/draft-records.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { behaviourWrites, NO_TEMPLATE } from '../lib/apply-motion-behaviours.mjs';
import { descendantRows } from '../lib/apply-owned.mjs';
import { draftEffectNames, foreignEffects } from '../lib/apply-stray.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { reviewRows, renderReview, missingFacts, NO_FACTS_NOTICE } from '../lib/intake-review.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'behaviour-shape', 'draft-records.json' ), 'utf8' ) );
const TEMPLATE = FIX.template;
const RECORDS = FIX.records;
const byId = ( id ) => RECORDS.find( ( r ) => r.id === id );
const DC = RECORDS[ 0 ].element.dc;
const INDEX = recordIndex( RECORDS, DC );
const TIMELINE = [ 'scrollEffect', 'orientation', 'mobileLayout', 'panelCounter', 'panelCounterFormat', 'dateActiveColour', 'dateActiveTextStrokeColour', 'panelProximityFocus', 'panelEdgeOpacity', 'panelFocusOpacity', 'panelEdgeScale', 'panelFocusScale' ];
const DB = openDb( fixtureDb( { blocks: [ { slug: 'sgs/timeline', title: 'Timeline', category: 'sgs', type: 'dynamic' } ], block_attributes: TIMELINE.map( ( a ) => ( { block_slug: 'sgs/timeline', attr_name: a, attr_type: 'string', role: 'layout' } ) ) } ) );
const writes = ( ids, template ) => behaviourWrites( { recs: ids.map( byId ), allRecords: RECORDS, block: 'sgs/timeline', part: 'root', doc: { v: 1, elements: {} }, saved: {}, mdb: null, schema: null, ctx: {}, db: DB, template } );

test( 'MUST FAIL: the apply stage writes the pinned timeline\'s settings from the fact record\'s template (J-05 track, J-09 year, J-11 counter)', () => {
	const out = writes( [ 'J-05', 'J-09', 'J-11' ], TEMPLATE );
	const attrs = out.settings.map( ( s ) => s.attr );
	assert.ok( [ 'scrollEffect', 'dateActiveColour', 'panelCounter', 'panelCounterFormat' ].every( ( a ) => attrs.includes( a ) ), JSON.stringify( out.settings ) );
	assert.deepEqual( out.ids.sort(), [ 'J-05', 'J-09', 'J-11' ] );
	assert.ok( ! out.items.some( ( i ) => NO_TEMPLATE === i.why ) );
} );

test( 'negative control: with no fact record template the apply stage names it in a row, never skips the records silently', () => {
	const out = writes( [ 'J-05', 'J-09', 'J-11' ], null );
	assert.deepEqual( out.settings, [] );
	assert.equal( out.items.filter( ( i ) => NO_TEMPLATE === i.why ).length, 1 );
	assert.deepEqual( writes( [], null ).items, [], 'no records, nothing to name' );
} );

const tplOf = ( id ) => Number( [ byId( id ).element.template_tpl_id ].flat()[ 0 ] );

test( 'MUST FAIL: a descendant\'s pinned-timeline write is a row of the block that reaches it, read with the template', () => {
	const target = { ref: 'r1', tpl: 'Root/1#0', owns: [], reach: [ tplOf( 'J-05' ), tplOf( 'J-11' ) ] };
	const rows = ( template ) => descendantRows( { target, block: 'sgs/container', recordsIndex: INDEX, surface: { pairs: [] }, allRecords: RECORDS, template } ).map( ( r ) => r.prop ).sort();
	assert.deepEqual( rows( TEMPLATE ), [ 'J-05', 'J-11' ] );
	assert.deepEqual( rows( null ), [], 'without the template the shape cannot be read (the motion family names that through behaviourWrites)' );
} );

test( 'MUST FAIL: the stray-effect reads find the pin\'s progress bar (J-06) only with the template', () => {
	assert.ok( draftEffectNames( RECORDS, TEMPLATE ).has( 'scroll-progress' ) );
	assert.ok( ! draftEffectNames( RECORDS, null ).has( 'scroll-progress' ), 'a scaleX(p) write is a progress bar only when the pin is read' );
	const target = { ref: 'r1', tpl: 'Root/1#0', owns: [], reach: [ tplOf( 'J-06' ) ] };
	const surface = { pairs: [ { ref: 'r2', tpl: `Root/${ tplOf( 'J-06' ) }#0`, owns: [] } ] };
	assert.ok( foreignEffects( { target, surface, recordsIndex: INDEX, records: RECORDS, facts: null, template: TEMPLATE } ).held.has( 'scroll-progress' ) );
	assert.ok( ! foreignEffects( { target, surface, recordsIndex: INDEX, records: RECORDS, facts: null, template: null } ).held.has( 'scroll-progress' ) );
} );

const intake = { inventory: { animations: { records: RECORDS } } };

test( 'MUST FAIL: the review lists the pinned timeline\'s effect rows when it is read with the template', () => {
	const ids = reviewRows( intake, { template: TEMPLATE } ).filter( ( r ) => 'effect' === r.rowType ).map( ( r ) => r.rowId );
	assert.ok( [ 'effect:J-05', 'effect:J-09', 'effect:J-11', 'effect:A-02', 'effect:J-31' ].every( ( id ) => ids.includes( id ) ), ids.join( ', ' ) );
} );

test( 'negative control: a review read without the template prints a warning naming the missing fact record (not a row, so it still applies); no records, no warning', () => {
	const rows = reviewRows( intake );
	assert.ok( ! rows.some( ( r ) => 'effect:J-05' === r.rowId ) );
	assert.ok( ! rows.some( ( r ) => 'notice' === r.rowType ), 'facts.json is gitignored: a checkout without it must still apply its review' );
	assert.ok( missingFacts( intake, null ) );
	assert.ok( renderReview( { ...intake, client: 'x', takenOn: 'd' } ).includes( NO_FACTS_NOTICE ) );
	assert.ok( ! renderReview( { ...intake, client: 'x', takenOn: 'd' }, { template: TEMPLATE } ).includes( NO_FACTS_NOTICE ) );
	assert.ok( ! missingFacts( { inventory: { animations: { records: [] } } }, null ) );
} );
