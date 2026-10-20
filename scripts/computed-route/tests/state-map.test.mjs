// Proves Spec 48 FR-48-13 (the generated state map): every sc-if of an Indus-draft surface is mapped to a way of reaching
// it or listed as a gap row, a planted sc-if with no state is listed, and a walker-state group state-map-reasons.json
// names is refused by Solve. The fixture is a small copy of the Indus intake record's sc-if census and surface records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stateMap, diffReasons, namesState, vocabStateFor } from '../lib/state-map.mjs';
import { writableGroups } from '../lib/solve-rows.mjs';
import { writeRound } from '../solve.mjs';
import { openDb } from '../lib/db.mjs';

const H = 'Indus Foods Website v2';
const T = 'TradeApplication';
const sc = ( id ) => ( { kind: 'sc-if', draftId: id, component: id.slice( 0, id.lastIndexOf( ':' ) ) } );
const st = ( name, state_keys, ids ) => ( { name, state_keys, sc_if_tpl_ids: ids } );
const intake = () => ( {
	census: [ `${ H }:12`, `${ H }:49`, `${ H }:51`, `${ H }:63`, `${ H }:66`, `${ H }:107`, `${ H }:256`, `${ T }:80`, `${ T }:83` ].map( sc ),
	inventory: { surfaces: {
		records: [
			{ id: 'S-33', kind: 'panel', dc: H, states: [ st( 'unforceable', {}, [ '63', '66' ] ) ] },
			{ id: 'S-34', kind: 'drawer', dc: H, states: [ st( 'mobileOpen=true', { mobileOpen: true }, [ '107' ] ) ] },
			{ id: 'S-41', kind: 'form-step', dc: T, states: [ st( 'step=1', { step: 1 }, [ '80', '83' ] ), st( 'step=0', { step: 0 }, [ '80', '83' ] ) ] },
		],
		counts: {
			toggling_sc_ifs: { covered_by: { [ `${ H }:63` ]: 'S-33', [ `${ H }:66` ]: 'S-33', [ `${ H }:107` ]: 'S-34', [ `${ T }:80` ]: 'S-41', [ `${ T }:83` ]: 'S-41' } },
			other_sc_ifs: {
				route: { covered_by: { [ `${ H }:51` ]: 'S-01' } }, breakpoint: { covered_by: { [ `${ H }:12` ]: 'S-01' } },
				'prop-variant': { covered_by: { [ `${ H }:256` ]: 'S-01' } }, 'content-variant': { covered_by: { [ `${ H }:49` ]: 'S-01' } },
			},
		},
	} },
} );
const vocab = [ { state: 'open' }, { state: 'current' }, { state: 'scrolled' } ];
const surfaces = { header: { states: { closed: null, 'mobile-open': 'open', scrolled: 'scrolled' } } };
const build = ( over = {} ) => stateMap( { surfaces, surface: 'header', intake: intake(), vocab, ...over } );
const row = ( map, id ) => map.scIf.find( ( r ) => r.id === id );

test( 'MUST FAIL: every sc-if of the surface is reached or listed as a gap row naming it', () => {
	const map = build();
	assert.equal( map.scIf.length, 9, 'one row per sc-if in the census' );
	assert.deepEqual( map.gaps.map( ( g ) => g.id ), [ `${ H }:63`, `${ H }:66` ], 'the state keys no value forces are the gaps, each naming its condition' );
	assert.match( row( map, `${ H }:63` ).reason, /no type-safe value forces/ );
	const drawer = row( map, `${ H }:107` );
	assert.deepEqual( [ drawer.reach, drawer.walkerState, drawer.settingState ], [ 'walker', 'mobile-open', 'open' ], 'a walker state naming the draft state reaches it' );
	const step = row( map, `${ T }:80` );
	assert.deepEqual( [ step.reach, step.keys, step.settingState ], [ 'set-state', { step: 1 }, null ], 'no walker state names it: the logic state is set directly' );
	assert.deepEqual( [ 'route', 'width', 'props', 'content' ], [ `${ H }:51`, `${ H }:12`, `${ H }:256`, `${ H }:49` ].map( ( id ) => row( map, id ).reach ) );
	assert.deepEqual( map.walkerStates.find( ( w ) => 'mobile-open' === w.walkerState ), { walkerState: 'mobile-open', settingState: 'open', names: [ 'mobileOpen=true' ] } );
} );

test( 'MUST FAIL: a planted sc-if with no state is listed as a gap, not dropped', () => {
	const i = intake();
	i.census.push( sc( `${ H }:999` ) );
	const map = build( { intake: i } );
	const planted = row( map, `${ H }:999` );
	assert.equal( planted.reach, 'gap' );
	assert.equal( planted.record, null );
	assert.ok( map.gaps.includes( planted ) );
	assert.equal( map.scIf.length, 10 );
} );

test( 'a scoped map keeps only the records named, and a surface with no states map is an error', () => {
	assert.equal( build( { records: [ 'S-34' ] } ).scIf.some( ( r ) => 'S-41' === r.record ), false );
	assert.throws( () => stateMap( { surfaces: { header: {} }, surface: 'header', intake: intake() } ), /no "states" map/ );
} );

test( 'namesState and vocabStateFor read key words, never a bare boolean false', () => {
	assert.equal( namesState( 'mobile-open', st( 'a', { mobileOpen: true }, [] ) ), true );
	assert.equal( namesState( 'mobile-open', st( 'a', { mobileOpen: false }, [] ) ), false );
	assert.equal( namesState( 'step-1', st( 'a', { step: 1 }, [] ) ), true );
	assert.equal( namesState( 'step-2', st( 'a', { step: 1 }, [] ) ), false );
	assert.equal( namesState( 'anything', st( 'a', {}, [] ) ), false );
	assert.equal( vocabStateFor( st( 'a', { mobileOpen: true }, [] ), vocab ), 'open' );
} );

test( 'diffReasons lists gap rows the reasons lack and conflict entries whose group the map no longer has', () => {
	const map = build();
	const entry = ( over ) => ( { surface: 'header', key: 'cr-ref-h-1||style|color', walkerStates: [ 'closed', 'scrolled' ], mappedTo: [ 'closed->rest', 'scrolled->scrolled' ], ...over } );
	const clean = diffReasons( map, { stateless: [ `${ H }:63`, { surface: 'header', id: `${ H }:66` } ], stateConflicts: { entries: [ entry() ] } } );
	assert.deepEqual( clean, { missing: [], stale: [] } );
	const open = diffReasons( map, { stateless: [], stateConflicts: { entries: [ entry( { walkerStates: [ 'closed', 'gone' ], mappedTo: [ 'closed->open' ] } ), entry( { surface: 'other', walkerStates: [ 'gone' ] } ) ] } } );
	assert.deepEqual( open.missing.map( ( m ) => m.id ), [ `${ H }:63`, `${ H }:66` ] );
	assert.equal( open.stale.length, 1, 'only this surface\'s entries are judged' );
	assert.deepEqual( open.stale[ 0 ].why, [ 'gone is no longer a walker state of the surface', 'closed maps to rest, not open' ] );
} );

// The Solve guard.
const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const calFor = () => ( { elements: { '': {} }, settings: { fontSize: { slot: '', property: 'font-size' } } } );
const tree = () => [ { name: 'sgs/heading', attributes: { className: 'cr-ref-h-1', content: 'Hi' } } ];
const run = ( state, rows ) => ( { state, width: 1440, pairs: { head: { draft: { styles: { 'font-size': '15px' } }, diffs: rows } } } );
const report = () => ( { runs: [ run( 'opening', [] ), run( 'scrolled', [ { kind: 'style', key: 'font-size', draft: '15px', live: '18px', ref: 'cr-ref-h-1', path: '' } ] ) ] } );
const rest = { opening: null, scrolled: null };
const named = [ { surface: 'home', key: 'cr-ref-h-1||style|font-size', pair: 'head', reason: 'two walker states map to rest' } ];

test( 'MUST FAIL: a group state-map-reasons.json names is refused by Solve, and the same group writes when unnamed', () => {
	const open = writeRound( report(), tree(), { db, snapshot, round: 1, log: [], stateMap: rest, calFor } );
	assert.equal( open.writes.length, 1, 'positive control: nothing names the group, so it is written' );
	const t = tree();
	const refused = writeRound( report(), t, { db, snapshot, round: 1, log: [], stateMap: rest, calFor, refused: named } );
	assert.equal( refused.writes.length, 0 );
	assert.equal( t[ 0 ].attributes.fontSize, undefined );
	const gap = Object.values( refused.gaps )[ 0 ];
	assert.equal( gap.gap, 'state-conflict' );
	assert.match( gap.detail, /state-map-reasons\.json names font-size/ );
	const out = writableGroups( report(), rest, named );
	assert.deepEqual( [ out.groups.length, out.stateConflict.length ], [ 0, 1 ] );
} );

test( 'the guard matches the hover state apart from the style, and another property or node is untouched', () => {
	assert.equal( writableGroups( report(), rest, [ { ...named[ 0 ], key: 'cr-ref-h-1||hover|font-size' } ] ).groups.length, 1, 'a hover entry does not name the style group' );
	assert.equal( writableGroups( report(), rest, [ { ...named[ 0 ], key: 'cr-ref-h-2||style|font-size' } ] ).groups.length, 1 );
	assert.equal( writableGroups( report(), rest, [ { ...named[ 0 ], key: 'cr-ref-h-1||style|color' } ] ).groups.length, 1 );
} );
