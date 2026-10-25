// Motion reporting in Fill (Phase 3 loop 1, unit U2): a refused sgsMotion write names each refusal's text, a timing the
// state pass raises per property is not also raised as one generic row, a resting timing the written layer's paint and
// shadow timings give is covered, and a live transition list that is a superset of the draft's is settled where the extra
// properties never change in any state.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { writeNode } from '../lib/fill-motion.mjs';
import { loadMotionSchema, REPO } from '../lib/motion-schema.mjs';
import { timingDuplicates } from '../lib/fill-timing.mjs';
import { coveredByMotion } from '../lib/fill-held.mjs';
import { motionSettled, transitionListOutcomes } from '../lib/fill-motion-settle.mjs';

const schema = loadMotionSchema();
const FIXTURE = JSON.parse( fs.readFileSync( path.join( REPO, 'plugins', 'sgs-blocks', 'tests', 'fixtures', 'motion', 'refusal-after-slot.json' ), 'utf8' ) );

test( 'MUST FAIL: a refused sgsMotion write names each refusal\'s text, never [object Object]', () => {
	const out = { unmapped: [], writes: [] };
	const flat = [ { attributes: {} } ];
	writeNode( { index: 0, name: 'sgs/button', targets: [] }, FIXTURE.motion, [ 'e1', 'e2' ], { flat, ref: 'r0', schema, out, reads: null } );
	assert.equal( out.writes.length, 0 );
	assert.equal( out.unmapped.length, 1 );
	assert.equal( out.unmapped[ 0 ].reason, `sgsMotion refused: ${ FIXTURE.expect.refusals[ 0 ] }` );
	assert.doesNotMatch( out.unmapped[ 0 ].reason, /object Object/ );
	// Negative control: a document the schema accepts is written and nothing is refused.
	const fine = { unmapped: [], writes: [] };
	writeNode( { index: 0, name: 'sgs/button', targets: [] }, { v: 1, elements: { root: { effects: [ FIXTURE.motion.elements.root.effects[ 0 ] ] } } }, [ 'e1' ], { flat, ref: 'r0', schema, out: fine, reads: null } );
	assert.deepEqual( [ fine.unmapped.length, fine.writes.length ], [ 0, 1 ] );
} );

const row = ( property, reason, extra = {} ) => ( { node: 'r0', block: 'sgs/card', slot: '', property, state: null, value: '0.25s', reason, ...extra } );

test( 'MUST FAIL: a resting timing raised per property by the state pass drops the generic row for the same longhand', () => {
	const generic = row( 'transition-duration', 'no-setting: sgs/card has no setting for transition-duration; equivalence: ...' );
	const split = row( 'transition-duration', 'timing-no-home: sgs/card has no setting that holds the transition-duration of color on this element (the draft\'s 0.25s)', { value: '[{"properties":["color"],"value":"0.25s"}]' } );
	const other = row( 'transition-timing-function', 'no-setting: sgs/card has no setting for transition-timing-function' );
	const kept = timingDuplicates( [ generic, split, other ] );
	assert.deepEqual( kept.dropped, [ generic ] );
	assert.deepEqual( kept.unmapped, [ split, other ] );
	// Negative controls: another node, another element of the node, another state, or a non-timing property keeps its row.
	const rows = [ generic, row( 'transition-duration', 'timing-no-home: x', { node: 'r1' } ), row( 'transition-duration', 'timing-no-home: x', { slot: '.part' } ), row( 'transition-duration', 'timing-enter-differs: x', { state: 'hover' } ), row( 'color', 'timing-no-home: x' ) ];
	assert.deepEqual( timingDuplicates( rows ).dropped, [] );
	// A hover row beside a resting timing row is a different read, so it is kept too.
	assert.deepEqual( timingDuplicates( [ row( 'transition-duration', 'no-setting: x', { state: 'hover' } ), row( 'transition-duration', 'timing-no-home: x' ) ] ).dropped, [] );
} );

test( 'MUST FAIL: motionSettled raises one row per timing and does not settle the dropped generic row', () => {
	const generic = row( 'transition-duration', 'no-setting: sgs/card has no setting for transition-duration' );
	const split = row( 'transition-duration', 'timing-no-home: sgs/card has no setting that holds the transition-duration of color', { value: '[{"properties":["color"],"value":"0.25s"}]' } );
	const out = motionSettled( { unmapped: [ generic, split ], writes: [], nodes: [], flat: [], refOf: () => null, mdb: null, db: null, calFor: null, reads: null, rawSnapshot: {} } );
	assert.deepEqual( out.unmapped, [ split ] );
	assert.deepEqual( out.answered, [] );
} );

const layerWrite = ( values ) => ( { how: 'motion', attr: 'sgsMotion', after: { v: 1, elements: { root: { hover: { state: { values } } } } } } );
const TOKENS = { 'easing.spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'easing.ease': 'ease' };

test( 'MUST FAIL: the layer\'s paint and shadow timings cover a resting timing list, as the conservation check credits them', () => {
	const writes = [ layerWrite( { duration: 550, paintDuration: 400, easing: 'token:easing.spring', paintEasing: 'token:easing.ease' } ) ];
	const covered = coveredByMotion( { slot: '', property: 'transition-duration' }, { 1440: '0.55s, 0.4s' }, writes, TOKENS );
	assert.match( covered, /sgsMotion carries it/ );
	assert.match( coveredByMotion( { slot: '', property: 'transition-timing-function' }, { 1440: 'cubic-bezier(0.34, 1.56, 0.64, 1), ease' }, writes, TOKENS ), /sgsMotion carries it/ );
	const shadow = [ layerWrite( { duration: 350, shadowDuration: 200 } ) ];
	assert.match( coveredByMotion( { slot: '', property: 'transition-duration' }, { 1440: '0.35s, 0.2s, 0.2s' }, shadow, TOKENS ), /sgsMotion carries it/ );
	// Negative controls: a duration the layer does not give, a part's row and a layer with no timing stay raised.
	assert.equal( coveredByMotion( { slot: '', property: 'transition-duration' }, { 1440: '0.55s, 0.9s' }, writes, TOKENS ), null );
	assert.equal( coveredByMotion( { slot: '.sgs-card__title', property: 'transition-duration' }, { 1440: '0.55s' }, writes, TOKENS ), null );
	assert.equal( coveredByMotion( { slot: '', property: 'transition-duration' }, { 1440: '0.55s' }, [ layerWrite( {} ) ], TOKENS ), null );
	// The transform channels still credit a row through the layer's own values (the unchanged path).
	assert.match( coveredByMotion( { slot: '', property: 'transform' }, { 1440: 'matrix(1.1, 0, 0, 1.1, 0, 0)' }, [ layerWrite( { scale: 1.1 } ) ], TOKENS ), /sgsMotion carries it/ );
} );

const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
const flat = [ { ref: 'r0' } ];
const mdb = { targetsOf: () => [ { target: 'root', cssElement: 'root', kind: 'root' } ] };
const base = { 'sgs/button': { root: [] } };
const W = [ 768 ];
const reads = ( decl, looks ) => ( {
	declared: Object.fromEntries( W.map( ( w ) => [ w, { '0:': decl } ] ) ),
	widths: Object.fromEntries( W.map( ( w ) => [ w, { '0:': { styles: {} } } ] ) ),
	...( looks ? { states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { '0:': looks } } ] ) ) } : {} ),
} );
const hoverWrite = { node: 'r0', block: 'sgs/button', slot: '', attr: 'sgsMotion', how: 'motion', after: { v: 1, elements: { root: { hover: { state: { values: { scale: 1.1, duration: 350 } } } } } } };
const list = ( r ) => transitionListOutcomes( { nodes, flat, refOf: ( x ) => x.ref, reads: r, writes: [ hoverWrite ], mdb, db: null, calFor: () => null, base } );
const look = ( declared, extra = {} ) => ( { states: [ 'hover' ], declared, rendered: {}, ...extra } );
const DRAFT = { 'transition-property': 'transform, box-shadow' };

test( 'MUST FAIL: a live list that is a superset of the draft\'s settles where no state changes the extra properties', () => {
	const out = list( reads( DRAFT, [ look( { transform: 'scale(1.1)', 'box-shadow': '0 0 4px #000' } ) ] ) );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'transition-property' === u.property ), [] );
	const settled = out.settled.find( ( s ) => 'transition-property' === s.property );
	assert.equal( settled.reason, 'motion' );
	assert.match( settled.detail, /color, background-color, border-color/ );
	assert.match( settled.detail, /no state changes/ );
	// Negative controls: a state that changes one extra, a read that holds no state looks, and a state of another element's
	// layer (a pseudo-element look is not this element) behave as follows.
	const changes = list( reads( DRAFT, [ look( { transform: 'scale(1.1)', color: 'red' } ) ] ) );
	assert.match( changes.unmapped.find( ( u ) => 'transition-property' === u.property ).reason, /live also transitions color, background-color, border-color$/ );
	const unknown = list( reads( DRAFT, null ) );
	assert.equal( unknown.unmapped.filter( ( u ) => 'transition-property' === u.property ).length, 1 );
	const shorthand = list( reads( DRAFT, [ look( { background: 'red' } ) ] ) );
	assert.equal( shorthand.unmapped.filter( ( u ) => 'transition-property' === u.property ).length, 1 );
	const pseudo = list( reads( DRAFT, [ look( { color: 'red' }, { pseudo: '::after' } ) ] ) );
	assert.equal( pseudo.unmapped.filter( ( u ) => 'transition-property' === u.property ).length, 0 );
	// A list that lacks a draft property stays raised whatever the states do.
	const less = list( reads( { 'transition-property': 'transform, width' }, [ look( { transform: 'scale(1.1)' } ) ] ) );
	assert.equal( less.unmapped.filter( ( u ) => 'transition-property' === u.property ).length, 1 );
} );

test( 'a calibrated list that lacks a draft property stays raised though its extras never change', () => {
	const cal = { elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { 'transition-property': 'opacity, color' } ] ) ) } };
	const r = reads( { 'transition-property': 'opacity, transform' }, [ look( { opacity: '0.5' } ) ] );
	const out = transitionListOutcomes( { nodes, flat, refOf: ( x ) => x.ref, reads: r, writes: [], mdb, db: null, calFor: () => cal, base } );
	assert.equal( out.settled.length, 0 );
	assert.match( out.unmapped[ 0 ].reason, /the draft also transitions transform/ );
} );

test( 'MUST FAIL: an inherited extra property a state of an ancestor changes keeps the row, one only a descendant changes does not', () => {
	const tree = [ { index: 0, name: 'sgs/container', parent: null, targets: [ { id: '0:', slot: '' } ] }, { index: 1, name: 'sgs/button', parent: 0, targets: [ { id: '1:', slot: '' } ] } ];
	const both = [ { ref: 'r0' }, { ref: 'r1' } ];
	const at = ( ancestor, own ) => ( {
		declared: { 768: { '1:': DRAFT } },
		widths: { 768: { '1:': { styles: {} } } },
		states: { 768: { looks: { '0:': ancestor, '1:': own } } },
	} );
	const go = ( r ) => transitionListOutcomes( { nodes: tree, flat: both, refOf: ( x ) => x.ref, reads: r, writes: [ { ...hoverWrite, node: 'r1' } ], mdb, db: null, calFor: () => null, base } ).unmapped.filter( ( u ) => 'transition-property' === u.property && 'r1' === u.node );
	// The container's hover colours the text the button inherits: live also transitions color, which then changes.
	const inherited = go( at( [ look( { color: 'red' } ) ], [ look( { transform: 'scale(1.1)' } ) ] ) );
	assert.equal( inherited.length, 1 );
	assert.match( inherited[ 0 ].reason, /live also transitions color, background-color, border-color$/ );
	// An ancestor's background is not inherited, so it does not change the button's own background.
	assert.equal( go( at( [ look( { 'background-color': 'red' } ) ], [ look( { transform: 'scale(1.1)' } ) ] ) ).length, 0 );
	assert.equal( go( at( [], [ look( { transform: 'scale(1.1)' } ) ] ) ).length, 0 );
	// An ancestor further up counts too: the colour comes from the container two levels above.
	const deep = [ { index: 0, name: 'sgs/container', parent: null, targets: [ { id: '0:', slot: '' } ] }, { index: 1, name: 'sgs/container', parent: 0, targets: [ { id: '2:', slot: '' } ] }, { index: 2, name: 'sgs/button', parent: 1, targets: [ { id: '1:', slot: '' } ] } ];
	const far = transitionListOutcomes( { nodes: deep, flat: [ ...both, { ref: 'r2' } ], refOf: ( x ) => x.ref, reads: { declared: { 768: { '1:': DRAFT } }, widths: { 768: { '1:': { styles: {} } } }, states: { 768: { looks: { '0:': [ look( { color: 'red' } ) ] } } } }, writes: [ { ...hoverWrite, node: 'r2' } ], mdb, db: null, calFor: () => null, base } );
	assert.equal( far.unmapped.filter( ( u ) => 'transition-property' === u.property && 'r2' === u.node ).length, 1 );
} );
