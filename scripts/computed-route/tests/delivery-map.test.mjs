// A delivery plan's tracking file: a client's delivery map names an owner for every coverage id its intake
// review names, every active animation record and every surface state, and agrees with the coverage map. Each case
// below fails on a map that skips, invents, repeats or mis-marks a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { expectedKeys, planUnits, duplicateKeys, mapProblems, PRIOR, treeFacts, animationEvidence, walkerEffectRows } from '../lib/delivery-map.mjs';

const PLAN = '| Unit | What |\n|---|---|\n| U9 Forms | x |\n| U13a Track | x |\n';

function site() {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'dmap-' ) );
	const s = path.join( root, 'sites', 'client-a' );
	fs.mkdirSync( path.join( s, 'build', 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( s, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( s, 'build', 'intake', 'review.md' ), '| a | `missing:coverage:html:form` |\n| b | `missing:coverage:html:img` |\n| c | `missing:coverage:html:form` |\n' );
	fs.writeFileSync( path.join( s, 'handoff', 'animations.json' ), JSON.stringify( { records: [ { id: 'A-01', status: 'active' }, { id: 'A-02', status: 'dead-code' } ] } ) );
	fs.writeFileSync( path.join( s, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-01', states: [ { name: 'open' }, { name: 'closed' } ] } ] } ) );
	return root;
}

const coverage = { entries: { 'html:form': { recognise: null, write: null, check: null, wave: 'w' }, 'html:img': { recognise: 'a', write: 'b', check: 'c' } } };
const units = planUnits( PLAN );
const good = { plan: 'p.md', keys: { 'coverage:html:form': 'U9', 'coverage:html:img': { done: PRIOR, unit: 'U9' }, 'animation:A-01': 'U13a', 'state:S-01:closed': 'U9', 'state:S-01:open': { accepted: 'the draft opens it by touch only', unit: 'U13a' } } };
const run = ( map, raw = JSON.stringify( map, null, '\t' ) ) => mapProblems( { raw, expected: expectedKeys( 'client-a', root ), units, coverage, hasCommit: ( h ) => 'abc1234' === h, evidenceFor: () => ( { ok: true, why: 'test' } ) } );
const root = site();

test( 'expected keys: each coverage id once, active records only, every surface state', () => {
	assert.deepEqual( expectedKeys( 'client-a', root ), [ 'animation:A-01', 'coverage:html:form', 'coverage:html:img', 'state:S-01:closed', 'state:S-01:open' ] );
	assert.deepEqual( [ ...units ].sort(), [ 'U13a', 'U9' ] );
} );

test( 'positive control: a map naming every key with a plan unit, a prior done and an accepted reason passes', () => {
	assert.deepEqual( run( good ), [] );
	assert.deepEqual( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'abc1234', unit: 'U13a' } } } ), [] );
} );

test( 'MUST FAIL: a missing key, an invented key and a dead-code record each fail', () => {
	const keys = { ...good.keys };
	delete keys[ 'state:S-01:closed' ];
	assert.match( run( { ...good, keys } ).join( '\n' ), /state:S-01:closed: missing/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:video': 'U9' } } ).join( '\n' ), /coverage:html:video: not a coverage id/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-02': 'U9' } } ).join( '\n' ), /animation:A-02: not/ );
} );

test( 'MUST FAIL: a key listed twice fails though JSON.parse keeps one', () => {
	const raw = JSON.stringify( good, null, '\t' ).replace( '"animation:A-01": "U13a"', '"animation:A-01": "U13a",\n\t\t"animation:A-01": "U9"' );
	assert.deepEqual( duplicateKeys( raw ), [ 'animation:A-01' ] );
	assert.match( run( null, raw ).join( '\n' ), /animation:A-01: listed more than once/ );
} );

test( 'MUST FAIL: a unit the plan does not hold, a done commit that does not exist and an empty accepted reason fail', () => {
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': 'U99' } } ).join( '\n' ), /unit "U99" is not in the plan/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'fffffff', unit: 'U13a' } } } ).join( '\n' ), /done commit fffffff does not exist/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'state:S-01:open': { accepted: ' ', unit: 'U13a' } } } ).join( '\n' ), /needs its reason/ );
} );

test( 'MUST FAIL: a coverage key whose mark disagrees with the coverage map fails', () => {
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:img': 'U9' } } ).join( '\n' ), /coverage:html:img: the coverage map has it covered/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:form': { done: 'abc1234', unit: 'U9' } } } ).join( '\n' ), /coverage:html:form: marked done but the coverage map still has it as a gap/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: PRIOR, unit: 'U13a' } } } ).join( '\n' ), /"prior" is only for a coverage id already covered/ );
} );

test( 'MUST FAIL: an accepted coverage key still a gap, a value both done and accepted, and a non-string done fail', () => {
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:form': { accepted: 'a difference', unit: 'U9' } } } ).join( '\n' ), /coverage:html:form: accepted but the coverage map still has it as a gap/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'abc1234', accepted: 'x', unit: 'U13a' } } } ).join( '\n' ), /never both/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: true, unit: 'U13a' } } } ).join( '\n' ), /done names a commit hash/ );
} );

test( 'duplicate scan: names inside values, escaped quotes and keys outside the keys object never count', () => {
	const raw = '{ "keys": "x", "plan": "p", "keys2": 1, "keys": { "a": { "unit": "U9", "done": "prior" }, "b": { "accepted": "says \\"a\\": twice", "unit": "U9" }, "c": "U9" } }';
	assert.deepEqual( duplicateKeys( raw ), [] );
	assert.deepEqual( duplicateKeys( raw.replace( '"c": "U9"', '"c": "U9", "b": "U9"' ) ), [ 'b' ] );
} );

test( 'plan units come from the work table only; repeated state names get their own keys', () => {
	assert.deepEqual( [ ...planUnits( '| Unit | What |\n|---|---|\n| U2 a | x |\n\n| Session | Units |\n|---|---|\n| U99 b | x |\n' ) ], [ 'U2' ] );
	const s = path.join( root, 'sites', 'client-b', 'handoff' );
	fs.mkdirSync( s, { recursive: true } );
	fs.writeFileSync( path.join( s, 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-09', states: [ { name: 'open' }, { name: 'open' } ] } ] } ) );
	assert.deepEqual( expectedKeys( 'client-b', root ), [ 'state:S-09:open', 'state:S-09:open #2' ] );
} );

test( 'MUST FAIL: a number, boolean or array value is refused, never a crash', () => {
	for ( const v of [ 7, true, [ 'U9' ] ] ) {
		assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': v } } ).join( '\n' ), /a value is a unit id/ );
	}
} );

// A record whose script appends a sheen span to a pointer-tracked host, and the one that pulls the host toward the pointer.
const SHEEN = { id: 'A-18', status: 'active', mechanism: 'waapi', trigger: { type: 'pointer-move', detail: 'first pointer move onto a new [data-mag] element' }, element: { selector: 'span appended to the [data-mag] element by shine()' }, source: { code: 'sp.animate(kf, { duration: dur })' }, properties: [ { property: 'transform', from: 'translateX(-120%) skewX(-18deg)', to: 'translateX(260%) skewX(-18deg)' } ], duration_ms: 750, easing: 'ease', iterations: 1 };
const button = ( layers ) => [ { name: 'sgs/button', attributes: { sgsMotion: { v: 1, elements: { root: { hover: { state: { values: { scale: 1.05 } }, effects: layers } } } } }, innerBlocks: [] } ];
const layer = ( effect ) => ( { id: `${ effect }-1`, effect, trigger: 'hover', values: {} } );

test( 'MUST FAIL: a done animation key whose element lacks its effect layer fails; with the layer it passes', () => {
	const lacking = treeFacts( [ button( [ layer( 'magnet' ) ] ) ] );
	const e = animationEvidence( SHEEN, lacking );
	assert.equal( e.ok, false );
	assert.match( e.why, /no sheen effect layer/ );
	const holding = treeFacts( [ button( [ layer( 'magnet' ), layer( 'sheen' ) ] ) ] );
	assert.equal( animationEvidence( SHEEN, holding ).ok, true );
	const keyed = ( facts ) => ( k ) => animationEvidence( SHEEN, facts, [] );
	const done = { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'abc1234', unit: 'U13a' } } };
	const raw = JSON.stringify( done );
	const args = { raw, expected: expectedKeys( 'client-a', root ), units, coverage, hasCommit: ( h ) => 'abc1234' === h };
	assert.match( mapProblems( { ...args, evidenceFor: keyed( lacking ) } ).join( '; ' ), /animation:A-01: marked done but no sheen effect layer/ );
	assert.deepEqual( mapProblems( { ...args, evidenceFor: keyed( holding ) } ), [] );
	assert.match( mapProblems( args ).join( '; ' ), /animation:A-01: marked done but no evidence reader was supplied/ );
} );

test( 'a walker effect row with its live side read evidences a record the trees do not hold; an unread row does not', () => {
	const none = treeFacts( [] );
	const report = { runs: [ { pairs: { head: { diffs: [ { kind: 'effect', effect: 'sheen', animation: 'A-18', live: { played: true } }, { kind: 'style', key: 'color' } ] } } } ] };
	assert.equal( walkerEffectRows( report ).length, 1 );
	assert.equal( animationEvidence( SHEEN, none, walkerEffectRows( report ) ).ok, true );
	const unread = { runs: [ { pairs: { head: { diffs: [ { kind: 'effect', effect: 'sheen', animation: 'A-18', live: null } ] } } } ] };
	assert.equal( animationEvidence( SHEEN, none, walkerEffectRows( unread ) ).ok, false );
	const other = { runs: [ { pairs: { head: { diffs: [ { kind: 'effect', effect: 'sheen', animation: 'A-99', live: { played: true } } ] } } } ] };
	assert.equal( animationEvidence( SHEEN, none, walkerEffectRows( other ) ).ok, false );
} );

test( 'evidence by key kind: a reduced-motion rule is native, an entrance needs an entrance layer, an unmapped record needs a walker row', () => {
	const rm = { id: 'RM-01', status: 'active', mechanism: 'css-media', trigger: { type: 'state' }, properties: [] };
	assert.match( animationEvidence( rm, treeFacts( [] ) ).why, /natively/ );
	const entrance = { id: 'A-21', status: 'active', mechanism: 'waapi', trigger: { type: 'load' }, element: { selector: 'main h1' }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 500, iterations: 1 };
	assert.match( animationEvidence( entrance, treeFacts( [] ) ).why, /no entrance layer/ );
	const withEntrance = [ { name: 'sgs/hero', attributes: { sgsMotion: { v: 1, elements: { root: { entrance: { base: { trigger: 'load' } } } } } }, innerBlocks: [] } ];
	assert.equal( animationEvidence( entrance, treeFacts( [ withEntrance ] ) ).ok, true );
	const loop = { id: 'A-40', status: 'active', mechanism: 'waapi', trigger: { type: 'loop' }, iterations: 'infinite', element: { selector: '[data-ring]' }, properties: [ { property: 'translate', from: '0', to: '4px' } ] };
	const unnamed = animationEvidence( loop, treeFacts( [ withEntrance ] ) );
	assert.equal( unnamed.ok, false );
	assert.match( unnamed.why, /endless loop or an unnamed effect/ );
	const withRow = animationEvidence( loop, treeFacts( [] ), [ { kind: 'effect', effect: 'drift', animation: 'A-40', live: { running: true } } ] );
	assert.equal( withRow.ok, true );
	const hover = { id: 'A-30', status: 'active', mechanism: 'css-transition', trigger: { type: 'hover' }, element: { selector: '.card' }, properties: [ { property: 'transform', from: 'none', to: 'translateY(-4px)' } ], duration_ms: 200, iterations: 1 };
	const noState = [ { name: 'sgs/button', attributes: { sgsMotion: { v: 1, elements: { root: { hover: { effects: [] } } } } }, innerBlocks: [] } ];
	assert.match( animationEvidence( hover, treeFacts( [ noState ] ) ).why, /no hover-state layer/ );
	assert.equal( animationEvidence( hover, treeFacts( [ button( [] ) ] ) ).ok, true );
} );
