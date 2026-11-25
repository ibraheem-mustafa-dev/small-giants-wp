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
const snap = ( styles ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w: 120, h: 40 }, inFlow: true, words: '', href: '/x', tag: 'a' } );
const hoverLook = ( declared ) => [ { states: [ 'hover' ], declared, rendered: declared, read: 'entered' } ];

function restPass( styles, looks = {} ) {
	const skeleton = [ { name: 'sgs/button', attributes: {}, draftRef: '.lnk', draftSlots: {} } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'home' );
	const root = nodes[ 0 ].targets.find( ( t ) => '' === t.slot );
	const full = { ...BASE.elements[ '' ][ 1440 ], ...styles };
	const reads = {
		widths: Object.fromEntries( [ ...WIDTHS, 1024, 1920 ].map( ( w ) => [ w, { [ root.id ]: snap( full ) } ] ) ),
		declared: {},
		sweep: {},
		origin: 'http://127.0.0.1:1',
		states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { [ root.id ]: looks[ w ] || [] } } ] ) ),
	};
	const out = fillTree( { tree, nodes, reads, db, snapshot, rawSnapshot: {}, calFor: () => CAL, fixtures: recordFixtures(), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
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

const statePass = ( rest, hover ) => {
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const reads = {
		states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { t: hoverLook( { 'text-decoration-line': hover } ) } } ] ) ),
		widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { t: { tag: 'a', href: '/x', styles: { 'text-decoration-line': rest } } } ] ) ),
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
