// Spec 48 FR-48-78's done-when: a planted draft using the motion writer's capabilities raises no seen-but-unsupported
// row (FR-48-34), and with the writer's coverage entry removed the same draft raises the row again. The draft is read
// through the real usage read (lib/intake-usage.mjs::draftUsage) and judged against the real coverage map
// (data/clone-coverage.json) by intake's missing-features rule (lib/intake-missing.mjs::coverageMissing); the same
// draft's marquee and SVG pulse then go through the writer, so "covered" means written, not only listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage } from '../lib/clone-coverage.mjs';
import { marqueeTag, smilLoop, chooseEffect } from '../lib/motion-loops.mjs';
import { writeEffect, loadEffectOffers } from '../lib/motion-effects.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const MARQUEE = { tag: 'marquee', attrs: [ [ 'scrollamount', '3' ], [ 'scrolldelay', '60' ], [ 'direction', 'right' ], [ 'behavior', 'scroll' ] ] };
const ANIMATE = { tag: 'animate', svg: 'animate', attrs: [ [ 'attributeName', 'opacity' ], [ 'values', '1;0.4;1' ], [ 'dur', '2s' ], [ 'repeatCount', 'indefinite' ] ] };
const DRAFT = [ { component: 'Promo', stamped: { elements: [
	{ n: '1', tag: 'section', attrs: [] },
	{ n: '2', ...MARQUEE },
	{ n: '3', tag: 'svg', svg: 'svg', attrs: [ [ 'viewBox', '0 0 10 10' ] ] },
	{ n: '4', tag: 'circle', svg: 'circle', attrs: [ [ 'r', '4' ] ] },
	{ n: '5', ...ANIMATE },
] } } ];
// The motion writer's capabilities this draft uses.
const WAVE = [ 'html:marquee', 'html-attr:marquee.scrollamount', 'html-attr:marquee.scrolldelay', 'html-attr:marquee.direction', 'html-attr:marquee.behavior', 'svg:animate' ];
const rowsFor = ( coverage ) => coverageMissing( { census: { rows: [] }, coverage, usage: draftUsage( { sources: DRAFT, known: KNOWN } ).usage } );

test( 'the planted draft uses each of the wave capabilities it is meant to', () => {
	const usage = draftUsage( { sources: DRAFT, known: KNOWN } ).usage;
	for ( const id of WAVE ) {
		assert.ok( usage.has( id ), `${ id } is read from the draft` );
	}
} );

test( 'MUST FAIL: the draft raises no seen-but-unsupported row for a capability the writer covers, and raises it again with the writer\'s entry removed', () => {
	const coverage = loadCoverage();
	const raised = new Set( rowsFor( coverage ).map( ( r ) => r.construct ) );
	for ( const id of WAVE ) {
		assert.ok( coverage.entries[ id ]?.write, `${ id } has a write reference` );
		assert.ok( ! raised.has( id ), `${ id } raises no row while the writer covers it` );
		const removed = { ...coverage, entries: { ...coverage.entries, [ id ]: { recognise: null, write: null, check: null, wave: 'motion writer (4.0)' } } };
		const row = rowsFor( removed ).find( ( r ) => r.construct === id );
		assert.ok( row, `${ id } raises its row again with the writer removed` );
		assert.match( row.why, /no clone path yet \(has nothing; wave motion writer \(4\.0\)\)/ );
	}
} );

test( 'the same draft\'s marquee and SVG pulse are written as validated effect layers', () => {
	const schema = loadMotionSchema();
	const fx = ( effect, panels ) => ( { effect, tier: 'vanilla', plugin_set: 'none', reduced_motion: 'off', editor_story: 'static', triggers: 'load,visible', owned_properties: JSON.stringify( { channels: 'svg-loop' === effect ? [ 'rotate', 'scale', 'opacity' ] : [], properties: [], slots: [] } ), panels: JSON.stringify( panels ) } );
	const mdb = motionDb( openDb( fixtureDb( { fx_effects: [ fx( 'marquee', [ 'effects' ] ), fx( 'svg-loop', [ 'effects' ] ) ], motion_fields: [
		...[ 'speed', 'direction' ].map( ( f ) => ( { def_name: 'MarqueeValues', field: f, panel: 'effects', layer: 'effects', effect: 'marquee', field_path: `elements.<target>.effects[effect=marquee].values.${ f }`, field_type: 'speed' === f ? 'ratio' : 'choice', state: 'active', per_device: 'speed' === f ? 1 : 0 } ) ),
		...[ 'motion', 'duration', 'amplitude' ].map( ( f ) => ( { def_name: 'SvgLoopValues', field: f, panel: 'effects', layer: 'effects', effect: 'svg-loop', field_path: `elements.<target>.effects[effect=svg-loop].values.${ f }`, field_type: 'motion' === f ? 'choice' : 'duration' === f ? 'duration' : 'ratio', state: 'active', per_device: 'motion' === f ? 0 : 1 } ) ),
	] } ) ) );
	const offers = loadEffectOffers();
	const attrs = Object.fromEntries( MARQUEE.attrs );
	const marquee = writeEffect( { block: 'sgs/brand-strip', target: 'root', effect: 'marquee', trigger: 'load', values: marqueeTag( attrs ) }, { mdb, schema, offers } );
	assert.deepEqual( marquee.layer.values, { speed: 50, direction: 'right' } );
	const pulse = chooseEffect( smilLoop( { tag: 'animate', ...Object.fromEntries( ANIMATE.attrs ) } ), {}, { mdb } );
	assert.deepEqual( pulse.values, { motion: 'pulse', duration: 2000, amplitude: 1.2 } );
	const svg = writeEffect( { block: 'sgs/container', target: 'root', effect: pulse.effect, trigger: pulse.trigger, values: pulse.values }, { mdb, schema, offers } );
	for ( const [ block, w ] of [ [ 'sgs/brand-strip', marquee ], [ 'sgs/container', svg ] ] ) {
		assert.equal( validateMotionWrite( { v: 1, elements: { [ w.target ]: { effects: [ w.layer ] } } }, schema ).valid, true, block );
	}
} );
