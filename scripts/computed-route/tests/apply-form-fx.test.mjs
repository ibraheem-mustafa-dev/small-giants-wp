// Form and tile reads that once moved nothing on the page: a line height held against the part's own font size, a font stack compared
// by its first family, the tick judged by where it sits, and a tile hover judged by the whole pose. Run: node --test tests/apply-form-fx.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { form } from '../lib/apply-family-form.mjs';
import { tiles } from '../lib/apply-family-tiles.mjs';
import { partItems } from '../lib/apply-probe-items.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { judge } from '../apply.mjs';
import { openDb } from '../lib/db.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const snapshot = loadSnapshot( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const calFor = ( block ) => loadCalibration( path.join( HERE, '..', 'cache' ), block, 'local-indus' );
const at = ( f ) => ( { 1440: f } );
const label = ( o ) => ( { color: 'rgb(0, 0, 0)', 'font-size': '19px', 'font-weight': '600', 'font-family': '"Source Sans 3", system-ui, sans-serif', 'letter-spacing': 'normal', 'text-transform': 'none', 'line-height': '29.45px', ...o } );
const probe = ( lab, consent = null ) => ( { probes: { fields: [ { field: {}, label: lab } ], steps: 1, focus: null, consent } } );
const ctx = ( o ) => ( { target: { ref: 'cr-ref-x-1', tpl: 'Root/9#0' }, block: 'sgs/form', saved: {}, recordsIndex: new Map(), calFor, db, snapshot, ...o } );
const itemFor = ( items, prop ) => items.find( ( i ) => i.prop === prop );

test( 'form: a label line height is held against the label\'s own font size, never the 16px root', () => {
	const items = form.decide( ctx( { draft: at( probe( label() ) ), live: at( probe( label( { 'line-height': '32.3px' } ) ) ) } ) );
	const item = itemFor( items, 'labelLineHeight' );
	assert.equal( item.status, 'op' );
	// 29.45px over a 19px label is 1.55; over the root it would be 1.841, which paints 34.98px on the 19px label.
	assert.equal( item.writes[ 0 ].value.desktop, 1.55 );
	// Negative control: a line height the live label already paints writes nothing.
	assert.equal( itemFor( form.decide( ctx( { draft: at( probe( label() ) ), live: at( probe( label() ) ) } ) ), 'labelLineHeight' ), undefined );
} );

test( 'form: the consent line height is held against the consent text\'s own font size', () => {
	const consent = ( lh ) => ( { 'font-size': '14px', 'font-weight': '400', 'font-family': 'x', 'line-height': lh, color: 'rgb(0, 0, 0)' } );
	const items = form.decide( ctx( { draft: at( probe( label(), consent( '21px' ) ) ), live: at( probe( label(), consent( '18.382px' ) ) ) } ) );
	assert.equal( itemFor( items, 'consentLineHeight' ).writes[ 0 ].value.desktop, 1.5 );
} );

test( 'partItems: a font stack whose first family is the live one is no difference; another first family is', () => {
	const c = ctx( {} );
	const mk = ( drafts, lives ) => partItems( { ctx: c, element: 'field-label', prop: 'font-family', drafts, lives } );
	const live = '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif';
	assert.deepEqual( mk( [ '"Source Sans 3", system-ui, sans-serif' ], [ live ] ), [] );
	// Several draft stacks sharing a first family are one value, not a conflict.
	assert.deepEqual( mk( [ '"Source Sans 3", system-ui, sans-serif', '"Source Sans 3", sans-serif' ], [ live ] ), [] );
	// Negative control: a different first family is still written.
	assert.equal( mk( [ 'Merriweather, serif' ], [ live ] ).length, 1 );
} );

const tick = ( position, display = 'block' ) => ( { position, display, top: 'auto', width: '14px', color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)' } );
const tile = ( pose ) => ( { 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(0, 0, 0)', 'border-top-width': '2px', 'box-shadow': 'none', color: 'rgb(0, 0, 0)', transform: 'none', translate: 'none', scale: 'none', rotate: 'none', pose } );
const read = ( check ) => ( { rest: { tile: tile( 'matrix(1, 0, 0, 1, 0, 0)' ), tplId: '49', dc: 'Page' }, hover: { tile: tile( 'matrix(1, 0, 0, 1, 0, 0)' ) }, selected: { tile: tile( 'matrix(1, 0, 0, 1, 0, 0)' ), check }, multi: false } );

test( 'tiles: the tick check reads where the tick sits, so an inline tick positioned relative still matches', () => {
	const d = read( { ...tick( 'static' ), placement: 'inline-start' } );
	const l = read( { ...tick( 'absolute', 'none' ), placement: null } );
	const item = tiles.decide( { ...ctx( {} ), block: 'sgs/form-field-tiles', all: { blocks: {} }, draft: at( { probes: d } ), live: at( { probes: l } ) } ).find( ( i ) => 'selectedCheckPosition' === i.prop );
	assert.deepEqual( item.checks[ 0 ], { width: 1440, prop: 'placement', want: 'inline-start', probe: [ 'selected', 'check' ] } );
	const facts = ( placement ) => ( { s: { 1440: { facts: { 'cr-ref-x-1': { probes: { selected: { check: { position: 'relative', placement } } } } } } } } );
	const op = { surface: 's', ref: 'cr-ref-x-1', checks: item.checks };
	assert.equal( judge( [ op ], facts( 'inline-start' ) )[ 0 ].ok, true );
	// Negative control: a corner badge is not the inline tick.
	assert.equal( judge( [ op ], facts( 'corner' ) )[ 0 ].ok, false );
} );

test( 'tiles: the hover check reads the composed pose, so a lift made through translate counts and a still tile does not', () => {
	const rec = { id: 'TR-111', status: 'active', group: 'hover', mechanism: 'css-transition', element: { dc: 'Page', template_tpl_id: '49' }, trigger: { type: 'hover' }, properties: [ { property: 'transform', from: null, to: 'translateY(-2px)', duration_ms: 200, easing: 'ease' } ], duration_ms: 200 };
	const lifted = { ...read( { ...tick( 'static' ), placement: 'inline-start' } ), hover: { tile: { ...tile( 'matrix(1, 0, 0, 1, 0, -2)' ), transform: 'matrix(1, 0, 0, 1, 0, -2)' } } };
	const still = read( { ...tick( 'static' ), placement: 'inline-start' } );
	const c = { ...ctx( {} ), block: 'sgs/form-field-tiles', all: { blocks: {} }, rawSnapshot: { settings: { custom: { distance: { xs: '2px' }, easing: { ease: 'ease' } } } }, recordsIndex: recordIndex( [ rec ], 'Root' ), draft: at( { probes: lifted } ), live: at( { probes: still } ) };
	const op = tiles.decide( c ).find( ( i ) => 'tile hover motion' === i.prop );
	assert.equal( op.status, 'op', op.why );
	assert.deepEqual( op.checks[ 0 ], { width: 1440, prop: 'pose', want: 'matrix(1, 0, 0, 1, 0, -2)', probe: [ 'hover', 'tile' ] } );
	// The framework paints the lift through `translate`, leaving `transform` at none: the pose still reads as the draft's.
	const after = { s: { 1440: { facts: { 'cr-ref-x-1': { probes: { hover: { tile: { transform: 'none', translate: '0px -2px', pose: 'matrix(1, 0, 0, 1, 0, -2)' } } } } } } } };
	assert.equal( judge( [ { surface: 's', ref: 'cr-ref-x-1', checks: op.checks } ], after )[ 0 ].ok, true );
	// Negative control: a tile that did not move reads the rest pose.
	after.s[ 1440 ].facts[ 'cr-ref-x-1' ].probes.hover.tile.pose = 'matrix(1, 0, 0, 1, 0, 0)';
	assert.equal( judge( [ { surface: 's', ref: 'cr-ref-x-1', checks: op.checks } ], after )[ 0 ].ok, false );
} );
