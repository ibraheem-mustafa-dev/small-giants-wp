// The three underline looks through Fill's whole passes (Spec 48 FR-48-81), on sgs/button: the resting pass writes a plain underline
// (`always`) and the animated sweep (`sweep`), the state pass writes an underline that appears on hover (`hover`). The settings'
// readings are the shape the site look writes (tests/enum-readings.test.mjs reads a real record); the draft reads are the shape
// Fill's readDraft returns.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { recordOwner } from '../lib/fill-resolve-element.mjs';
import { choiceConflict } from '../lib/fill-choice-state.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const db = openDb();
const BASE = JSON.parse( fs.readFileSync( new URL( './fixtures/fill-carried-width/calibration.json', import.meta.url ), 'utf8' ) );
const WIDTHS = [ 375, 768, 1440 ];
const LINE = 'linear-gradient(currentcolor, currentcolor)';
const every = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) );
const line = ( v ) => ( { 'text-decoration-line': every( v ) } );
const setting = ( extra = {} ) => ( { slot: '', slots: [ '' ], property: 'text-decoration', state: null, forms: [], reachedAt: WIDTHS, effects: [], tiers: [ [] ], ...extra } );
const CAL = { ...BASE, settings: { ...BASE.settings,
	textDecoration: setting(),
	linkUnderline: setting( {
		enumReads: { none: line( 'none' ), always: line( 'underline' ), hover: line( 'none' ), sweep: line( 'none' ) },
		enumStateReads: { hover: { always: line( 'underline' ), hover: line( 'underline' ), none: line( 'none' ), sweep: line( 'none' ) } },
	} ) } };
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const snap = ( styles, pseudo = {} ) => ( { styles, pseudo, rect: { x: 0, y: 0, w: 120, h: 40 }, inFlow: true, words: '', href: '/x', tag: 'a' } );
const hoverLook = ( declared ) => [ { states: [ 'hover' ], declared, rendered: declared, read: 'entered' } ];

function restPass( styles, looks = {}, { pseudo = {}, seed = null, cal = CAL } = {} ) {
	const skeleton = [ { name: 'sgs/button', attributes: {}, draftRef: '.lnk', draftSlots: {} } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'home' );
	seed?.( tree );
	const root = nodes[ 0 ].targets.find( ( t ) => '' === t.slot );
	const full = { ...BASE.elements[ '' ][ 1440 ], ...styles };
	const reads = {
		widths: Object.fromEntries( [ ...WIDTHS, 1024, 1920 ].map( ( w ) => [ w, { [ root.id ]: snap( full, pseudo ) } ] ) ),
		declared: {},
		sweep: {},
		origin: 'http://127.0.0.1:1',
		states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { [ root.id ]: looks[ w ] || [] } } ] ) ),
	};
	const out = fillTree( { tree, nodes, reads, db, snapshot, rawSnapshot: {}, calFor: () => cal, fixtures: recordFixtures(), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { attrs: tree[ 0 ].attributes, out };
}

const SWEEP_REST = { 'text-decoration-line': 'none', 'background-image': LINE, 'background-size': '0% 2px', 'transition-property': 'background-size', 'transition-duration': '0.3s' };
const growing = Object.fromEntries( WIDTHS.map( ( w ) => [ w, hoverLook( { 'background-size': '100% 2px' } ) ] ) );

test( 'a button link underlined at rest is written linkUnderline "always", the plain underline, from the readings of its setting', () => {
	const { attrs, out } = restPass( { 'text-decoration-line': 'underline' } );
	assert.equal( attrs.linkUnderline, 'always', JSON.stringify( out.unmapped.filter( ( u ) => /decoration/.test( u.property ) ) ) );
	assert.equal( attrs.textDecoration, undefined );
} );

test( 'MUST FAIL WITHOUT THE SWEEP RULE: a button link whose gradient line grows on hover under a transition is written linkUnderline "sweep", and its gradient is left to the setting', () => {
	const { attrs, out } = restPass( SWEEP_REST, growing );
	assert.equal( attrs.linkUnderline, 'sweep', JSON.stringify( out.unmapped.filter( ( u ) => /decoration|background/.test( u.property ) ) ) );
	assert.ok( out.writes.some( ( w ) => 'linkUnderline' === w.attr && 'underline-sweep' === w.how ) );
	assert.ok( ! out.writes.some( ( w ) => 'background-image' === w.prop ), 'the sweep\'s gradient is not written on its own' );
	assert.ok( ( out.settled || [] ).some( ( s ) => 'held-by-setting' === s.reason && 'background-image' === s.property ) );
} );

test( 'NEGATIVE CONTROL: the same button without the hover growth is no sweep', () => {
	assert.notEqual( restPass( SWEEP_REST ).attrs.linkUnderline, 'sweep' );
} );

const statePass = ( rest, hover, { attributes = {}, restStyles = {}, declared = null } = {} ) => {
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0', ...attributes }, innerBlocks: [] } ];
	const reads = {
		states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { t: hoverLook( declared ?? { 'text-decoration-line': hover } ) } } ] ) ),
		widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { t: { tag: 'a', href: '/x', styles: { 'text-decoration-line': rest, ...restStyles } } } ] ) ),
	};
	return fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: 't', slot: '' } ] } ], reads, calFor: () => CAL, db, snapshot } );
};

test( 'MUST FAIL WITHOUT THE STATE CHOICE: a button link plain at rest and underlined on hover is written linkUnderline "hover" by the state pass', () => {
	const r = statePass( 'none', 'underline' );
	assert.deepEqual( r.writes.filter( ( w ) => 'linkUnderline' === w.attr ).map( ( w ) => [ w.after, w.state, w.how ] ), [ [ 'hover', 'hover', 'fill-state' ] ] );
	assert.ok( ! r.unmapped.some( ( u ) => 'text-decoration-line' === u.property && 'hover' === u.state ) );
} );

test( 'NEGATIVE CONTROL: a link underlined at rest and plain on hover has no setting, so nothing is written for it', () => {
	const r = statePass( 'underline', 'none' );
	assert.ok( ! r.writes.some( ( w ) => 'linkUnderline' === w.attr ), JSON.stringify( r.writes.map( ( w ) => [ w.attr, w.after ] ) ) );
} );

// ---- review fixes: owner check, layers and hover looks of a sweep, conflicts of the state choice

test( 'MUST FAIL WITHOUT THE OWNER CHECK: a sweep does not replace what another element of the block already wrote to the setting', () => {
	const seed = ( tree ) => {
		tree[ 0 ].attributes.linkUnderline = 'always';
		recordOwner( { flat: [ tree[ 0 ] ] }, { index: 0 }, { slot: ' .elsewhere' }, 'text-decoration-line', 'linkUnderline', true );
	};
	const seeded = restPass( SWEEP_REST, growing, { seed } );
	assert.equal( seeded.attrs.linkUnderline, 'always', 'the earlier writer keeps the setting' );
	assert.ok( seeded.out.unmapped.some( ( u ) => /conflict: linkUnderline/.test( u.reason ) ), JSON.stringify( seeded.out.unmapped.filter( ( u ) => /linkUnderline/.test( u.reason ) ) ) );
	assert.equal( restPass( SWEEP_REST, growing ).attrs.linkUnderline, 'sweep', 'with no earlier writer it is written' );
} );

const CAL_LAYER = { ...CAL, elements: { ...CAL.elements, '::after': CAL.elements[ '' ] } };
const LAYER_REST = { 'text-decoration-line': 'none', 'transition-property': 'width', 'transition-duration': '0.2s' };
const layerLooks = Object.fromEntries( WIDTHS.map( ( w ) => [ w, [ { states: [ 'hover' ], declared: { width: '80px' }, rendered: { width: '80px' }, read: 'entered', pseudo: '::after' } ] ] ) );
const layerPaint = { content: '""', width: '0px', 'background-color': 'rgb(1, 2, 3)' };

test( 'MUST FAIL WITHOUT THE LAYER RULE: the line a sweep grows on a painted ::after is settled, never written to another setting', () => {
	const { out } = restPass( LAYER_REST, layerLooks, { pseudo: { '::after': layerPaint }, cal: CAL_LAYER } );
	assert.ok( ( out.settled || [] ).some( ( s ) => 'held-by-setting' === s.reason && /::after/.test( s.slot ) && 'background-color' === s.property ), 'the colour of the layer is held by the sweep setting' );
	assert.ok( ! out.writes.some( ( w ) => /::after/.test( w.slot ) ), JSON.stringify( out.writes.filter( ( w ) => /::after/.test( w.slot ) ) ) );
	const plain = restPass( { ...LAYER_REST, 'transition-property': 'color' }, layerLooks, { pseudo: { '::after': layerPaint }, cal: CAL_LAYER } );
	assert.ok( ! ( plain.out.settled || [] ).some( ( s ) => 'held-by-setting' === s.reason ), 'NEGATIVE CONTROL: with no growth under a transition it is no sweep' );
} );

test( 'MUST FAIL WITHOUT THE STATE LOOKS RULE: the hover look of the property a sweep grows is held by the setting, not raised as a gap', () => {
	const r = statePass( 'none', 'none', { declared: { 'background-size': '100% 2px' }, restStyles: SWEEP_REST, attributes: { linkUnderline: 'sweep' } } );
	assert.ok( r.ledger.some( ( l ) => 'background-size' === l.property && 'judged-equal' === l.kind && /^held-by-setting/.test( l.reason ) ), JSON.stringify( r.ledger ) );
	assert.ok( ! r.unmapped.some( ( u ) => 'background-size' === u.property ), 'no gap row for it' );
	const none = statePass( 'none', 'none', { declared: { 'background-size': '100% 2px' }, restStyles: { ...SWEEP_REST, 'transition-property': 'color' } } );
	assert.ok( ! none.ledger.some( ( l ) => /^held-by-setting/.test( l.reason ) ), 'NEGATIVE CONTROL: not a sweep, so not held' );
} );

test( 'MUST FAIL WITHOUT THE CONFLICT CHECK: the state choice refines the value of the rest pass but never replaces another look', () => {
	const written = ( r ) => r.writes.filter( ( w ) => 'linkUnderline' === w.attr ).map( ( w ) => w.after );
	assert.deepEqual( written( statePass( 'none', 'underline', { attributes: { linkUnderline: 'none' } } ) ), [ 'hover' ], 'none is the value of the rest pass for a plain link: refined' );
	const clash = statePass( 'none', 'underline', { attributes: { linkUnderline: 'always' } } );
	assert.deepEqual( written( clash ), [], 'always paints an underline at rest, so it is another look' );
	assert.ok( clash.unmapped.some( ( u ) => /conflict: linkUnderline already holds "always"/.test( u.reason ) ), JSON.stringify( clash.unmapped.map( ( u ) => u.reason ) ) );
} );

test( 'the conflict rule also names a value an earlier state look or another element wrote', () => {
	const setting = CAL.settings.linkUnderline;
	const base = { setting, attr: 'linkUnderline', prop: 'text-decoration-line', rest: every( 'none' ), value: 'hover', slot: '' };
	assert.match( choiceConflict( { ...base, taken: 'always' } ), /another state look/ );
	assert.match( choiceConflict( { ...base, owner: { from: ' .elsewhere', value: 'sweep' } } ), /was written "sweep"/ );
	assert.equal( choiceConflict( { ...base, owner: { from: ' .elsewhere', value: 'hover' }, taken: 'hover', current: 'hover' } ), null, 'the same value is no conflict' );
	assert.equal( choiceConflict( base ), null );
} );

test( 'MUST FAIL WITHOUT THE KEPT-WRITE RULE: a sweep whose write the owner check refused holds no look (nothing was written for the setting to hold)', () => {
	const seed = ( tree ) => {
		tree[ 0 ].attributes.linkUnderline = 'always';
		recordOwner( { flat: [ tree[ 0 ] ] }, { index: 0 }, { slot: ' .elsewhere' }, 'text-decoration-line', 'linkUnderline', true );
	};
	const refused = restPass( LAYER_REST, layerLooks, { pseudo: { '::after': layerPaint }, cal: CAL_LAYER, seed } );
	assert.ok( ! ( refused.out.settled || [] ).some( ( s ) => 'held-by-setting' === s.reason ), 'no layer look is settled as held' );
	const bg = restPass( SWEEP_REST, growing, { seed } );
	assert.ok( ! ( bg.out.settled || [] ).some( ( s ) => 'held-by-setting' === s.reason ), 'nor the resting gradient' );
	const state = statePass( 'none', 'none', { declared: { 'background-size': '100% 2px' }, restStyles: SWEEP_REST, attributes: { linkUnderline: 'always' } } );
	assert.ok( ! state.ledger.some( ( l ) => /^held-by-setting/.test( l.reason ) ), 'nor the hover look: the node does not hold the sweep' );
	const held = statePass( 'none', 'none', { declared: { 'background-size': '100% 2px' }, restStyles: SWEEP_REST, attributes: { linkUnderline: 'sweep' } } );
	assert.ok( held.ledger.some( ( l ) => /^held-by-setting/.test( l.reason ) ), 'NEGATIVE CONTROL: where the node holds the sweep the hover look is held' );
} );
