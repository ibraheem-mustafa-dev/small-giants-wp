// The wave review of the motion lane (Spec 48 FR-48-77, FR-48-78; plan 2026-10-21-handoff-readers "The closing standard"):
// the recognisers read the formula shapes of intake's re-derived inventory (`intake.json` `inventory.animations.records`,
// where a value can sit only in `formula` or `source.code`), no record of a surface ends silent, a close is a close only by
// its own wording, a control is validated on its own, a "Same as" chain resolves whole, the settings a behaviour writes are
// checked against the framework DB's attributes, and the page's reading progress reaches site build. The records in
// fixtures/review-motion/records.json are real intake records with their names made generic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites, sameTriggerResolved } from '../lib/fill-motion.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { applyControls, declaredAttr } from '../lib/fill-behaviour.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [], 'sgs/brand-strip': [], 'sgs/nav-bar-menu': [], 'sgs/site-header': [] } ) ) );
const SNAPSHOT = { settings: { custom: {} } };
const RECORDS = JSON.parse( fs.readFileSync( new URL( './fixtures/review-motion/records.json', import.meta.url ), 'utf8' ) );
const R = ( id ) => RECORDS.find( ( r ) => r.id === id );

const rec = ( id, over ) => ( { id, name: id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: '' }, trigger: { type: 'mount', detail: '' }, properties: [], duration_ms: 600, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const node = ( index, name, tpl ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } );
const hostTemplate = ( ...hooks ) => ( { elements: Object.fromEntries( hooks.map( ( [ tpl, hook ] ) => [ `Site/${ tpl }`, { attrs: { [ hook ]: '' } } ] ) ) } );
const run = ( nodes, records, over = {} ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: SNAPSHOT, ...over } );
	return { flat, out, doc: out.writes.find( ( w ) => 'sgsMotion' === w.attr )?.after ?? null };
};
const reasons = ( out ) => out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` );
const layerOf = ( doc, panel, effect ) => ( 'hover.effects' === panel ? doc.elements.root.hover.effects : doc.elements.root.effects ).find( ( l ) => l.effect === effect );
// Whether a record id ended as a write, an UNMAPPED row, a note naming it, or a handover row.
const ended = ( out, id ) => out.unmapped.some( ( u ) => String( u.value ).split( ',' ).includes( id ) ) || out.notes.some( ( n ) => n.text.startsWith( `${ id }:` ) ) || out.writes.some( ( w ) => String( w.prop ).split( /[\s,]+/ ).includes( id ) ) || out.handover.some( ( h ) => h.evidence.record === id );

test( 'MUST FAIL: a button magnet written as (clientX - r.left) / r.width - 0.5 times a size is the normalised magnet, and its transition and leave-reset writes are held by it', () => {
	const magnet = recogniseBehaviour( R( 'J-50' ) );
	assert.equal( magnet.kind, 'effect' );
	assert.deepEqual( [ magnet.effects[ 0 ].effect, magnet.effects[ 0 ].values.pullModel, magnet.effects[ 0 ].values.maxPullX, magnet.effects[ 0 ].values.maxPullY, magnet.effects[ 0 ].values.engage ], [ 'magnet', 'normalised', 10, 8, 'over' ] );
	assert.equal( recogniseBehaviour( R( 'J-49' ) ).kind, 'covered', 'the transition the handler sets on the translate' );
	assert.equal( recogniseBehaviour( R( 'J-67' ) ).kind, 'covered', 'the handler that clears the written transform on leave' );
	const leaveElsewhere = { ...R( 'J-67' ), properties: [ { property: 'transform', from: null, to: 'scale(2)' } ] };
	assert.equal( recogniseBehaviour( leaveElsewhere ), null, 'a leave handler that writes a real value is not a reset' );
	const { out, doc } = run( [ node( 0, 'sgs/container', '9' ) ], [ R( 'J-50' ), R( 'J-49' ) ], { template: hostTemplate( [ '9', 'data-mag' ] ), hasAttr: () => true } );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( layerOf( doc, 'hover.effects', 'magnet' ).values, { engage: 'over', pullModel: 'normalised', maxPullX: 10, maxPullY: 8 } );
	assert.ok( ended( out, 'J-49' ), 'the companion write is noted, not silent' );
} );

test( 'MUST FAIL: a nav label shift written as (clientX - (r.left + r.width / 2)) * 0.14 is the distance magnet on x, and the nav block takes it as its item magnet setting', () => {
	const m = recogniseBehaviour( R( 'J-66' ) );
	assert.deepEqual( [ m.effects[ 0 ].values.pullModel, m.effects[ 0 ].values.axis, m.effects[ 0 ].values.factor, m.alt.settings.map( ( s ) => s.attr ) ], [ 'distance', 'x', 0.14, [ 'itemMagnetEnabled', 'itemMagnetStrength' ] ] );
	const { out, flat } = run( [ node( 0, 'sgs/nav-bar-menu', '48' ) ], [ R( 'J-66' ), R( 'J-67' ) ], { hasAttr: () => true } );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( [ flat[ 0 ].attributes.itemMagnetEnabled, flat[ 0 ].attributes.itemMagnetStrength ], [ true, 0.14 ] );
	assert.ok( ended( out, 'J-67' ) );
} );

test( 'MUST FAIL: every inventory record whose element is on the surface ends as a write, an UNMAPPED row or a note, never silent (a custom element\'s own script included)', () => {
	// The logo records act inside a script file of their own; the nearest template element they name is the node's target.
	const logo = RECORDS.filter( ( r ) => /^(?:L-|J-21)/.test( r.id ) );
	const { out } = run( [ node( 0, 'sgs/container', '7' ) ], logo );
	for ( const r of logo ) {
		assert.ok( ended( out, r.id ), `${ r.id } ended silent` );
	}
	assert.match( out.unmapped.find( ( u ) => 'J-214' === u.value ).reason, /script mark-logo\.js of an element on this surface/ );
	assert.equal( out.unmapped.find( ( u ) => 'L-01' === u.value ).node, 'r0', 'the row carries the node' );
	// A record whose element is not on the surface raises nothing.
	const elsewhere = run( [ node( 0, 'sgs/container', '99' ) ], logo );
	assert.deepEqual( elsewhere.out.unmapped, [] );
} );

test( 'MUST FAIL: a close is named by whole words of the record\'s own function or name, not by `closest(` in a trigger, and never on an entrance trigger', () => {
	const entrance = rec( 'C-1', { name: 'Web Animation in openMobile on e.target.closest(\'[data-x]\')', mechanism: 'waapi', fill: 'forwards', trigger: { type: 'press', detail: 'handler uses e.target.closest(\'[data-x]\')' }, source: { function: 'openMobile' }, properties: [ { property: 'opacity', from: 0, to: 1 } ] } );
	assert.equal( recogniseBehaviour( entrance ), null, 'closest( is not a close' );
	const close = { ...entrance, id: 'C-2', source: { function: 'closeMobile' }, properties: [ { property: 'opacity', from: 1, to: 0 } ] };
	assert.equal( recogniseBehaviour( close ).kind, 'close' );
	assert.equal( recogniseBehaviour( { ...close, source: { function: 'onDismissPanel' } } ).kind, 'close', 'camel-case words count' );
	assert.equal( recogniseBehaviour( { ...close, source: { function: 'enclosure' } } ), null, 'a word that merely contains close' );
	assert.equal( recogniseBehaviour( { ...close, trigger: { type: 'mount', detail: '' } } ), null, 'an entrance trigger is not an exit' );
} );

test( 'MUST FAIL: a control whose merged values the schema refuses is reported on the controlled record\'s node and leaves the layer as it was; a control with no layer takes the node of the controlled record\'s row', () => {
	const marquee = rec( 'M-1', { element: { dc: 'Site', template_tpl_id: '40', selector: 'ref setTrackEl' }, trigger: { type: 'mount', detail: '' }, duration_ms: 'dist / 0.045', easing: 'linear', iterations: 'infinite',
		properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-{dist}px)', formula: 'dist = children[n].offsetLeft' } ] } );
	const { doc } = run( [ node( 0, 'sgs/brand-strip', '40' ) ], [ marquee ], { loops: { '0:': { 1440: { loops: [ { css: false, frames: [ { transform: 'translateX(0px)' }, { transform: 'translateX(-1800px)' } ], duration: 40000, direction: 'normal', easing: 'linear' } ], box: { width: 1800, height: 80 } } } } } );
	const layer = structuredClone( doc.elements.root.effects[ 0 ] );
	const where = { node: 'n7', block: 'sgs/container', slot: '' };
	const out = { unmapped: [], notes: [] };
	const written = new Map( [ [ 'M-1', { at: 'root', layer, list: 'effects', where } ] ] );
	const before = JSON.stringify( layer.values );
	applyControls( { controls: [ { r: { id: 'M-2' }, b: { of: 'M-1', effect: 'marquee', values: { hoverRate: 'fast' } }, where: { node: null, block: '', slot: '' } } ], written, out, schema } );
	assert.equal( out.unmapped.length, 1 );
	assert.deepEqual( [ out.unmapped[ 0 ].node, out.unmapped[ 0 ].value ], [ 'n7', 'M-2' ] );
	assert.match( out.unmapped[ 0 ].reason, /is refused/ );
	assert.equal( JSON.stringify( layer.values ), before, 'the layer keeps its values' );
	applyControls( { controls: [ { r: { id: 'M-3' }, b: { of: 'M-1', effect: 'marquee', values: { hoverRate: 0.5 } }, where: { node: null, block: '', slot: '' } } ], written, out, schema } );
	assert.equal( layer.values.hoverRate, 0.5 );
	const held = { unmapped: [ { node: 'n9', block: 'sgs/x', slot: 's', value: 'Q-1' } ], notes: [] };
	applyControls( { controls: [ { r: { id: 'Q-2' }, b: { of: 'Q-1', effect: 'marquee', values: {} }, where: { node: null, block: '', slot: '' } } ], written: new Map(), out: held, schema } );
	assert.equal( held.unmapped[ 1 ].node, 'n9', 'the controlled record\'s own row names the node' );
} );

test( 'MUST FAIL: a "Same as" chain resolves to its end and a null or empty field of the dependent record never overrides the referenced trigger', () => {
	const a1 = rec( 'A-1', { trigger: { type: 'state', detail: 'mobileOpen false -> true', state_keys: [ 'mobileOpen' ] } } );
	const a2 = rec( 'A-2', { trigger: { type: null, detail: 'Same as A-1', state_keys: [] } } );
	const a3 = rec( 'A-3', { trigger: { type: 'press', detail: 'Same as A-2', state_keys: null } } );
	const [ , r2, r3 ] = sameTriggerResolved( [ a1, a2, a3 ] );
	assert.deepEqual( [ r2.trigger.type, r2.trigger.state_keys ], [ 'state', [ 'mobileOpen' ] ], 'null and empty fields state nothing' );
	assert.deepEqual( [ r3.trigger.type, r3.trigger.state_keys ], [ 'press', [ 'mobileOpen' ] ], 'two hops reach the state keys' );
	assert.match( r3.trigger.detail, /^mobileOpen false -> true \(Same as A-1\) \(Same as A-2\)$/ );
	const loopA = rec( 'L-1', { trigger: { type: 'x', detail: 'Same as L-2' } } );
	const loopB = rec( 'L-2', { trigger: { type: 'y', detail: 'Same as L-1' } } );
	assert.equal( sameTriggerResolved( [ loopA, loopB ] ).length, 2, 'a cycle stops' );
} );

test( 'MUST FAIL: an empty draft CSS list is no CSS given, and the same classification context is used where a skipped record is named', () => {
	const peek = rec( 'K-1', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '20', selector: '[data-look]' }, trigger: { type: 'pointer-move', detail: 'document pointermove, closest(\'[data-look]\')' },
		properties: [ { property: '--mx / --my', from: null, to: 'pointer position', formula: 'clientX - rect.left, clientY - rect.top' } ] } );
	assert.equal( recogniseBehaviour( peek, { css: [] } ).effects[ 0 ].effect, 'cursor-field', 'a draft served from a URL has no CSS to check' );
	assert.equal( recogniseBehaviour( peek, { css: [ 'body { margin: 0 }' ] } ), null, 'CSS with no consumer is not a reveal' );
	const noMotion = run( [ node( 0, 'sgs/missing', '20' ) ], [ peek ], { draftCss: [ 'body { margin: 0 }' ] } );
	assert.match( reasons( noMotion.out ).join( '\n' ), /has no motion support; the record is also skipped/ );
	const served = run( [ node( 0, 'sgs/missing', '20' ) ], [ peek ], { draftCss: [] } );
	assert.doesNotMatch( reasons( served.out ).join( '\n' ), /also skipped/ );
} );

test( 'MUST FAIL: every settings write is checked against the framework DB\'s attributes: an attribute the DB does not hold is refused by name, one it holds is written', () => {
	const scrolled = rec( 'H-1', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '5', selector: 'header', description: 'the site header' }, trigger: { type: 'scroll-position', detail: 'window scroll' }, source: { code: 'if (scrollY > 40) h.style.boxShadow = ...' },
		properties: [ { property: 'box-shadow', from: 'none', to: '0 4px 12px rgba(0,0,0,0.15)' } ] } );
	const row = ( attr ) => ( { block_slug: 'sgs/site-header', attr_name: attr, attr_type: 'string' } );
	const base = { blocks: [ { slug: 'sgs/site-header', title: 'Header', category: 'sgs', type: 'dynamic' } ] };
	const partial = openDb( fixtureDb( { ...base, block_attributes: [ row( 'scrolledOffset' ), row( 'shadowScrolled' ) ] } ) );
	assert.equal( declaredAttr( 'sgs/site-header', 'shadowScrolled', partial ), true );
	assert.equal( declaredAttr( 'sgs/site-header', 'shadowScrolledColour', partial ), false );
	const refused = run( [ node( 0, 'sgs/site-header', '5' ) ], [ scrolled ], { db: partial } );
	assert.match( reasons( refused.out ).join( '\n' ), /H-1: sgs\/site-header declares no shadowScrolledColour setting/ );
	assert.deepEqual( refused.out.writes, [] );
	const full = openDb( fixtureDb( { ...base, block_attributes: [ row( 'scrolledOffset' ), row( 'shadowScrolled' ), row( 'shadowScrolledColour' ) ] } ) );
	const written = run( [ node( 0, 'sgs/site-header', '5' ) ], [ scrolled ], { db: full } );
	assert.deepEqual( reasons( written.out ), [] );
	assert.deepEqual( written.out.writes.map( ( w ) => w.attr ), [ 'scrolledOffset', 'shadowScrolled', 'shadowScrolledColour' ] );
} );

test( 'MUST FAIL: the page\'s reading progress bar, which the skeleton removes, reaches site build as a handover row naming the Floating UI setting and the record; one a target holds is a written effect', () => {
	const bar = rec( 'B-1', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '21', selector: 'ref setBarEl' }, trigger: { type: 'scroll-position', detail: 'window scroll' },
		properties: [ { property: 'transform', from: 'scaleX(0)', to: 'scaleX(1)', formula: 'scaleX(min(1, scrollY / (scrollHeight - innerHeight)))' } ] } );
	const off = run( [ node( 0, 'sgs/container', '10' ) ], [ bar ] );
	assert.equal( off.out.handover.length, 1 );
	assert.deepEqual( [ off.out.handover[ 0 ].owner, off.out.handover[ 0 ].kind, off.out.handover[ 0 ].evidence.record ], [ 'behaviour', 'behaviour', 'B-1' ] );
	assert.match( off.out.handover[ 0 ].reason, /sgs_floating_ui_reading_progress_enabled/ );
	const on = run( [ node( 0, 'sgs/container', '21' ) ], [ bar ] );
	assert.deepEqual( on.out.handover, [] );
	assert.equal( layerOf( on.doc, 'effects', 'scroll-progress' ).values.source, 'page' );
} );
