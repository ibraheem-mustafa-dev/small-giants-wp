// FR-48-12 item 2: a row whose draft side is blank is classed by the draft's sc-if branches. A branch the walk did not
// reach is an unwalked state (MUST FAIL: a planted unwalked branch is reported as one, not as a gap or an unmeasured
// side); an element whose branch is off where it was measured is absent; a row its branches do not explain is left to
// the rest of triage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { triage } from '../lib/triage.mjs';
import { branchIndex, branchVerdict, classifyBlankDraft, draftIdOfKey, instanceOf, walkedStates } from '../lib/draft-branches.mjs';
import { loadDraftBranches, rootComponentOf } from '../lib/draft-branches-io.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ORIGIN = { 'cr-ref-s-1': { tpl: 'Root/20#0', slots: { '.sgs-x__inner:nth-of-type(1)': 'Root/21#0' } }, 'cr-ref-s-2': { tpl: 'Root/30#0' }, 'cr-ref-s-3': { tpl: 'Root/40#0' } };
const ELEMENTS = {
	'Site/20': { template: { membership: { scIf: [ { key: 'Site/19', value: '{{ menuOpen }}' } ] } } },
	'Site/21': { template: { membership: { scIf: [ { key: 'Site/19' }, { key: 'Site/22' } ] } } },
	'Site/30': { template: { membership: { scIf: [] } } },
	'Site/40': { template: { membership: { scIf: [ { key: 'Site/39' } ] } } },
};
const mapOf = ( rows ) => ( { scIf: rows } );
const OPEN = { id: 'Site:19', reach: 'walker', state: 'open', walkerState: 'menu-open', settingState: 'open' };
const draftOf = ( rows = [ OPEN ] ) => branchIndex( { origin: ORIGIN, elements: ELEMENTS, map: mapOf( rows ), rootComponent: 'Site' } );

const row = ( over = {} ) => ( { kind: 'style', key: 'color', draft: null, live: 'rgb(0, 0, 0)', ref: 'cr-ref-s-1', path: '', owners: [], pair: 'p', state: 'rest', width: 375, accepted: null, ...over } );
const walkOf = ( rows ) => {
	const runs = {};
	for ( const r of rows ) {
		const run = ( runs[ `${ r.state }@${ r.width }` ] ||= { state: r.state, width: r.width, pairs: {} } );
		( run.pairs[ r.pair ] ||= { draft: { styles: {} }, live: { trace: { ref: r.ref } }, diffs: [] } ).diffs.push( r );
	}
	return { runs: Object.values( runs ) };
};
const ctxOf = ( over = {} ) => ( { stateMap: { rest: null }, nodeFor: () => ( { name: 'sgs/container', attributes: {} } ), ancestorsOf: () => [], attrRows: () => [], roster: [], supportsFor: () => ( {} ), calFor: () => null, readSource: () => null, ...over } );
const triageOne = ( r, ctx ) => triage( { classes: { hardcode: [], missing: [], unresolved: [ r ], derived: [], other: [] }, gaps: {}, writes: [] }, walkOf( [ r ] ), 's', ctx ).verdicts[ 0 ];

test( 'MUST FAIL: a blank draft side under an sc-if branch the walk did not reach is an unwalked state, named', () => {
	const v = triageOne( row(), ctxOf( { draftBranches: { draftOf: draftOf() } } ) );
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'unwalked-state' );
	const e = v.evidence.find( ( x ) => 'unwalked-state' === x.check );
	assert.deepEqual( e.states, [ 'open' ] );
	assert.equal( e.element, 'Site/20' );
	assert.equal( e.branches[ 0 ].walkerState, 'menu-open' );
	// The negative control: with the rule removed the same row is an unmeasured side, as before.
	assert.equal( triageOne( row(), ctxOf() ).decidedBy, 'unmeasured-side' );
} );

test( 'MUST FAIL: an element whose branch shows only in another walked state is absent where it was measured', () => {
	const rows = [ row(), row( { state: 'menu-open', width: 768 } ) ];
	const ctx = { draftOf: draftOf(), walked: new Set( [ 'rest', 'menu-open' ] ) };
	assert.equal( classifyBlankDraft( { rows: [ rows[ 0 ] ] }, ctx ).decidedBy, 'absent' );
	// Measured in the state that shows the branch, the branch is on, so it explains nothing.
	assert.equal( classifyBlankDraft( { rows: [ rows[ 1 ] ] }, ctx ), null );
	assert.equal( classifyBlankDraft( { rows }, ctx ), null );
	const v = triageOne( row( { ref: 'cr-ref-s-3' } ), ctxOf( { draftBranches: { draftOf: draftOf( [ { id: 'Site:39', reach: 'width' } ] ) } } ) );
	assert.equal( v.decidedBy, 'absent' );
	assert.match( v.evidence.find( ( x ) => 'absent' === x.check ).branches[ 0 ].why, /reached by width/ );
} );

test( 'unwalked wins over absent, set-state and gap rows are unwalked, an sc-if outside the map is off', () => {
	const walked = new Set( [ 'rest' ] );
	const both = classifyBlankDraft( { rows: [ row( { path: '.sgs-x__inner' } ) ] }, { draftOf: draftOf( [ { id: 'Site:19', reach: 'width' }, { id: 'Site:22', reach: 'set-state', state: 'expanded', keys: { expanded: true } } ] ), walked } );
	assert.equal( both.decidedBy, 'unwalked-state' );
	assert.deepEqual( both.evidence.states, [ 'expanded' ] );
	assert.equal( branchVerdict( { id: 'a', map: { reach: 'gap', reason: 'no draft state' } }, 'rest', walked ).verdict, 'unwalked' );
	assert.equal( branchVerdict( { id: 'a', map: { reach: 'gap', reason: 'no draft state' } }, 'rest', walked ).why, 'no draft state' );
	assert.match( branchVerdict( { id: 'a', map: { reach: 'set-state', keys: { k: 1 } } }, 'rest', walked ).why, /\{"k":1\}/ );
	assert.equal( branchVerdict( { id: 'a', map: null }, 'rest', walked ).verdict, 'off' );
	assert.equal( branchVerdict( { id: 'a', map: { reach: 'rest' } }, 'other', walked ), null );
	assert.equal( branchVerdict( { id: 'a', map: { reach: 'walker', walkerState: 'rest' } }, 'rest', walked ), null );
	for ( const reach of [ 'route', 'props', 'content', 'width' ] ) {
		assert.equal( branchVerdict( { id: 'a', map: { reach } }, 'rest', walked ).verdict, 'off', reach );
	}
} );

test( 'a row the branches cannot explain is left undecided: a drawn draft side, no identity, no sc-if, a branch that is on', () => {
	const walked = new Set( [ 'rest' ] );
	assert.equal( classifyBlankDraft( { rows: [ row( { draft: 'rgb(1, 1, 1)' } ) ] }, { draftOf: draftOf(), walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [ row(), row( { draft: 'x', width: 768 } ) ] }, { draftOf: draftOf(), walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [ row( { ref: 'cr-ref-none' } ) ] }, { draftOf: draftOf(), walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [ row( { ref: 'cr-ref-s-2' } ) ] }, { draftOf: draftOf(), walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [ row() ] }, { draftOf: draftOf( [ { ...OPEN, walkerState: 'rest' } ] ), walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [ row() ] }, { draftOf: null, walked } ), null );
	assert.equal( classifyBlankDraft( { rows: [] }, { draftOf: draftOf(), walked } ), null );
} );

test( 'the join: a slot path picks the slot element, positions are loose, and the root host takes the entry component', () => {
	assert.equal( instanceOf( { ref: 'cr-ref-s-1', path: '.sgs-x__inner' }, ORIGIN ), 'Root/21#0' );
	assert.equal( instanceOf( { ref: 'cr-ref-s-1', path: '.sgs-x__inner:nth-of-type(1)' }, ORIGIN ), 'Root/21#0' );
	assert.equal( instanceOf( { ref: 'cr-ref-s-1', path: '.sgs-x__other' }, ORIGIN ), 'Root/20#0' );
	assert.equal( instanceOf( { ref: 'cr-ref-none', path: '' }, ORIGIN ), null );
	const d = draftOf()( { ref: 'cr-ref-s-1', path: '.sgs-x__inner' } );
	assert.equal( d.element, 'Site/21' );
	assert.deepEqual( d.scIf.map( ( s ) => [ s.id, s.map?.reach ?? null ] ), [ [ 'Site:19', 'walker' ], [ 'Site:22', null ] ] );
	// A join that fails carries its reason and no branch list, so it can never read as "in no sc-if".
	const none = draftOf()( { ref: 'cr-ref-none' } );
	assert.match( none.reason, /no draft identity/ );
	assert.equal( none.scIf, undefined );
	const unrecorded = branchIndex( { origin: { r: { tpl: 'Root/99#0' } }, elements: ELEMENTS, map: mapOf( [] ), rootComponent: 'Site' } )( { ref: 'r' } );
	assert.match( unrecorded.reason, /no element Site\/99/ );
	assert.equal( unrecorded.scIf, undefined );
	// An origin entry with slots but no element of its own is malformed: no slot is trusted from it.
	assert.equal( instanceOf( { ref: 'r', path: '.a' }, { r: { slots: { '.a': 'Root/21#0' } } } ), null );
	assert.equal( draftIdOfKey( 'A/B Site/12' ), 'A/B Site:12' );
	assert.deepEqual( [ ...walkedStates( { runs: [ { state: 'a' }, { state: 'b' }, { state: 'a' } ] } ) ], [ 'a', 'b' ] );
	assert.equal( walkedStates( null ).size, 0 );
} );

test( 'the loader names what it could not join, and a surface it cannot join records why on its blank rows', () => {
	const tmp = fs.mkdtempSync( path.join( HERE, '..', '..', '..', '.claude', 'scratch', 'draft-branches-' ) );
	try {
		const surfaces = { s: { states: { rest: null }, draft: 'index.html' } };
		assert.match( loadDraftBranches( { client: 'c', surface: 's', buildDir: tmp, surfaces } ).reason, /no s\.origin\.json/ );
		fs.writeFileSync( path.join( tmp, 's.origin.json' ), JSON.stringify( ORIGIN ) );
		assert.match( loadDraftBranches( { client: 'c', surface: 's', buildDir: tmp, surfaces } ).reason, /no intake/ );
		fs.mkdirSync( path.join( tmp, 'intake' ) );
		const intake = { census: [], inventory: { surfaces: { records: [] }, animations: { drafts: [ { file: 'other.html', dc: 'Other' }, { file: 'index.html', dc: 'Site' } ] } } };
		fs.writeFileSync( path.join( tmp, 'intake', 'intake.json' ), JSON.stringify( intake ) );
		assert.match( loadDraftBranches( { client: 'c', surface: 's', buildDir: tmp, surfaces, loadFactsFn: () => { throw new Error( 'facts refused' ); }, vocabFn: () => [] } ).reason, /facts refused/ );
		const ok = loadDraftBranches( { client: 'c', surface: 's', buildDir: tmp, surfaces, loadFactsFn: () => ( { elements: ELEMENTS } ), vocabFn: () => [] } );
		assert.equal( ok.draftOf( { ref: 'cr-ref-s-1', path: '' } ).element, 'Site/20' );
		assert.equal( rootComponentOf( intake, 'index.html' ), 'Site' );
		assert.equal( rootComponentOf( intake ), 'Other' );
		assert.equal( rootComponentOf( {} ), null );
		fs.writeFileSync( path.join( tmp, 'intake', 'intake.json' ), JSON.stringify( { ...intake, inventory: { surfaces: { records: [] } } } ) );
		assert.match( loadDraftBranches( { client: 'c', surface: 's', buildDir: tmp, surfaces, loadFactsFn: () => ( { elements: ELEMENTS } ), vocabFn: () => [] } ).reason, /no entry draft component/ );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
	const v = triageOne( row(), ctxOf( { draftBranches: { reason: 'no s.origin.json' } } ) );
	assert.equal( v.decidedBy, 'unmeasured-side' );
	assert.deepEqual( v.evidence.find( ( x ) => 'draft-branches' === x.check ), { check: 'draft-branches', unjoined: 'no s.origin.json' } );
	const drawn = triageOne( row( { draft: 'rgb(1, 1, 1)', live: null } ), ctxOf( { draftBranches: { reason: 'r' } } ) );
	assert.equal( drawn.decidedBy, 'no-live-element' );
	assert.equal( drawn.evidence.some( ( x ) => 'draft-branches' === x.check ), false );
} );
