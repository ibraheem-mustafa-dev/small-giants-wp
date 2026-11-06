// Proves FR-48-93: an incremental calibration measures only what changed, and anything it cannot prove falls back to a
// full measurement of the block. Every MUST FAIL case is a way a stale row could otherwise pass silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import { preconditionsFor } from '../lib/calibrate-instances.mjs';
import { MAX_CHAIN, CANARY_MIN, CANARY_MAX, CANARY_INSTANCES, attrOfKey, settingOf, fixtureKeyOf, codeIndex, fingerprints, canaryFor, fullBecause, planIncremental, paintMoved, canaryDiffers, mergeSlotMap, measureWithFallback } from '../lib/calibrate-incremental.mjs';

const row = ( name, o = {} ) => ( { attr_name: name, css_property: 'color', css_element: 'title', ...o } );
const style = ( name, o = {} ) => ( { key: `${ name }-hex-v0`, row: row( name ), attrs: { [ name ]: '#123456' }, marker: { expect: null }, variant: 0, ...o } );
const DEFAULT = { key: 'default-v0', attrs: {}, variant: 0, isDefault: true };
const reading = ( property = 'color' ) => ( { property, state: null, slots: [ '.a' ], reaches: [ '.a' ], reachedAt: [ 375, 768, 1440 ], forms: [], variants: [ 0 ] } );

const planOf = ( names ) => [ DEFAULT, ...names.map( ( n ) => style( n ) ) ];
const prevFor = ( names, extra = {} ) => {
	const instances = planOf( names );
	return {
		block: 'sgs/x', site: 'local-a', slotKey: 'old', readKey: 'r1', fixtureKey: 'f1',
		fingerprints: fingerprints( instances ),
		settings: Object.fromEntries( names.map( ( n ) => [ n, reading() ] ) ),
		discovered: {}, dead: [], oneWidth: [], noMarker: [], untestedStates: [], rejected: [],
		...extra,
	};
};
const CURRENT = { fixtureKey: 'f1', snapshotKey: 'snap', readKey: 'r1', site: 'local-a' };
const PAINT = { readKey: 'r1', slotKey: 'old', paintKey: 'old-snap', elements: { '': { 375: { color: 'red' } } } };

test( 'an instance belongs to the setting it measures, and a default to none', () => {
	assert.equal( settingOf( style( 'a' ) ), 'a' );
	assert.equal( settingOf( { discover: { attr: 'mode' } } ), 'mode' );
	assert.equal( settingOf( { content: { attr: 'label' } } ), 'label' );
	assert.equal( settingOf( DEFAULT ), null );
} );

test( 'a fingerprint follows the row, the marker and the lines of code naming the setting, and nothing else', () => {
	const base = fingerprints( [ style( 'a' ) ], codeIndex( [ 'echo $attributes["a"];\necho $other;' ] ) );
	assert.equal( fingerprints( [ style( 'a' ) ], codeIndex( [ 'echo $attributes["a"];\necho $changed;' ] ) ).a, base.a, 'a line not naming the setting leaves it alone' );
	assert.notEqual( fingerprints( [ style( 'a' ) ], codeIndex( [ 'print $attributes["a"];' ] ) ).a, base.a, 'a changed line naming it changes it' );
	assert.notEqual( fingerprints( [ style( 'a', { row: row( 'a', { css_element: 'label' } ) } ) ], codeIndex( [ 'echo $attributes["a"];\necho $other;' ] ) ).a, base.a, 'a moved element changes it' );
	assert.notEqual( fingerprints( [ style( 'a', { attrs: { a: '#654321' } } ) ], codeIndex( [ 'echo $attributes["a"];\necho $other;' ] ) ).a, base.a, 'a changed marker changes it' );
} );

test( 'negative control: every full-run condition clear, an incremental run may start', () => {
	assert.equal( fullBecause( { prev: prevFor( [ 'a' ] ), prevPaint: PAINT, ...CURRENT } ), null );
} );

for ( const [ name, change, expected ] of [
	[ '--recalibrate always measures in full', { recalibrate: true }, /--recalibrate/ ],
	[ 'no slot map', { prev: null }, /no slot map/ ],
	[ 'a map from before fingerprints', { prev: prevFor( [ 'a' ], { fingerprints: undefined } ) }, /no fingerprints/ ],
	[ 'a changed read list', { readKey: 'r2' }, /read list/ ],
	[ 'a map from another site', { prev: prevFor( [ 'a' ], { site: 'local-b' } ) }, /local-b/ ],
	[ 'a changed fixture', { fixtureKey: 'f2' }, /fixture/ ],
	[ 'the chain cap', { prev: prevFor( [ 'a' ], { incremental: { chain: MAX_CHAIN } } ) }, /incremental runs in a row/ ],
	[ 'no default paint here', { prevPaint: null }, /no default paint/ ],
	[ 'a paint read under another list', { prevPaint: { ...PAINT, readKey: 'r0' } }, /read list/ ],
	[ 'a changed snapshot', { snapshotKey: 'snap2' }, /snapshot/ ],
	[ 'a paint from another build than the map', { prevPaint: { ...PAINT, slotKey: 'older' } }, /another build/ ],
	[ 'a browser upgrade, which would stamp unmeasured rows as read by it', { versions: { browserVersion: '150' } }, /browserVersion changed/ ],
] ) {
	test( `MUST FAIL: ${ name } forces a full measurement`, () => {
		assert.match( fullBecause( { prev: prevFor( [ 'a' ] ), prevPaint: PAINT, ...CURRENT, ...change } ), expected );
	} );
}

test( 'the chain runs up to the cap: one run short of it stays incremental', () => {
	assert.equal( fullBecause( { prev: prevFor( [ 'a' ], { incremental: { chain: MAX_CHAIN - 1 } } ), prevPaint: PAINT, ...CURRENT } ), null );
} );

test( 'a new setting is measured with the defaults; the rest stays out but for the canary', () => {
	const names = Array.from( { length: 200 }, ( _, i ) => `s${ i }` );
	const all = planOf( [ ...names, 'fresh' ] );
	const plan = planIncremental( prevFor( names ), all, fingerprints( all ), 'new' );
	assert.deepEqual( plan.measure, [ 'fresh' ] );
	assert.equal( plan.canary.length, 10, '5% of 200' );
	assert.ok( plan.instances.includes( DEFAULT ), 'every default stays' );
	assert.equal( plan.instances.length, 1 + 1 + 10 );
} );

test( 'MUST FAIL: a discovery or content setting that read nothing is measured again, like a dead one', () => {
	const discover = { key: 'mode-discover-a-v0', discover: { attr: 'mode', value: 'a' }, attrs: {} };
	const text = { key: 'content-text-label', content: { attr: 'label', kind: 'text' }, attrs: {} };
	const all = [ DEFAULT, discover, text ];
	const prev = prevFor( [], { fingerprints: fingerprints( all ), discovered: { mode: {} } } );
	assert.deepEqual( planIncremental( prev, all, fingerprints( all ), 'new' ).measure.sort(), [ 'label', 'mode' ] );
} );

test( 'MUST FAIL: a canary can be drawn from a discovery or content row, not only a style row', () => {
	const text = { key: 'content-text-label', content: { attr: 'label', kind: 'text' }, attrs: {} };
	const all = [ DEFAULT, text ];
	const prev = prevFor( [], { fingerprints: fingerprints( all ), text: { label: { path: '.a' } } } );
	assert.deepEqual( planIncremental( prev, all, fingerprints( all ), 'new' ).canary, [ 'label' ] );
} );

test( 'MUST FAIL: a setting whose fingerprint changed is measured again, not only a new one', () => {
	const all = [ DEFAULT, style( 'same' ), style( 'moved', { row: row( 'moved', { css_element: 'label' } ) } ) ];
	assert.deepEqual( planIncremental( prevFor( [ 'same', 'moved' ] ), all, fingerprints( all ), 'new' ).measure, [ 'moved' ] );
} );

test( 'MUST FAIL: a setting that read dead, untested or rejected is measured again though nothing about it changed', () => {
	const names = [ 'alive', 'deadOne', 'untestedOne', 'rejectedOne' ];
	const all = planOf( names );
	const prev = prevFor( names, { dead: [ 'deadOne' ], untestedStates: [ 'untestedOne:hover (hidden)' ], rejected: [ { key: 'rejectedOne-hex-v0', message: 'x' } ] } );
	const plan = planIncremental( prev, all, fingerprints( all ), 'new' );
	assert.deepEqual( plan.measure.sort(), [ 'deadOne', 'rejectedOne', 'untestedOne' ] );
} );

test( 'a measured setting brings its baseline, and an unneeded baseline stays out', () => {
	const base = { key: 'base-x', isBase: true, baseKey: 'kept', attrs: {} };
	const other = { key: 'base-y', isBase: true, baseKey: 'unused', attrs: {} };
	const fresh = style( 'fresh', { baseKey: 'kept' } );
	const all = [ DEFAULT, base, other, fresh ];
	const plan = planIncremental( prevFor( [] ), all, fingerprints( all ), 'new' );
	assert.ok( plan.instances.includes( base ) );
	assert.ok( ! plan.instances.includes( other ) );
} );

test( 'a paint state stays in every incremental plan', () => {
	const state = { key: 'paint-held', attrs: {}, paintState: { name: 'held' } };
	const all = [ DEFAULT, state ];
	assert.ok( planIncremental( prevFor( [] ), all, fingerprints( all ), 'new' ).instances.includes( state ) );
} );

test( 'MUST FAIL: an old row whose setting is declared but no longer planned is named, so it cannot stay in the map unmeasured', () => {
	const all = planOf( [ 'a' ] );
	assert.deepEqual( planIncremental( prevFor( [ 'a', 'gone' ] ), all, fingerprints( all ), 'new', new Set( [ 'a', 'gone' ] ) ).unplanned, [ 'gone' ] );
} );

test( 'MUST FAIL: a declared content or discovery row no longer planned is named too', () => {
	const all = planOf( [ 'a' ] );
	const prev = prevFor( [ 'a' ], { text: { badge: {} }, discovered: { mode: {} }, presence: { 'flag=1': {} } } );
	assert.deepEqual( planIncremental( prev, all, fingerprints( all ), 'new', new Set( [ 'a', 'badge', 'mode', 'flag' ] ) ).unplanned.sort(), [ 'badge', 'flag', 'mode' ] );
} );

test( 'a removed attribute is not unplanned: it leaves the map on an incremental run, with no full measurement', () => {
	const all = planOf( [ 'a' ] );
	assert.deepEqual( planIncremental( prevFor( [ 'a', 'removed' ] ), all, fingerprints( all ), 'new', new Set( [ 'a' ] ) ).unplanned, [] );
} );

test( 'the canary keeps its bounds, moves with the build and never exceeds its instances', () => {
	const names = Array.from( { length: 1000 }, ( _, i ) => `s${ i }` );
	const owned = Object.fromEntries( names.map( ( n ) => [ n, [ {} ] ] ) );
	assert.equal( canaryFor( names, owned, 'a' ).length, CANARY_MAX );
	assert.equal( canaryFor( names.slice( 0, 20 ), owned, 'a' ).length, CANARY_MIN );
	assert.notDeepEqual( canaryFor( names, owned, 'a' ), canaryFor( names, owned, 'b' ) );
	const heavy = Object.fromEntries( names.map( ( n ) => [ n, Array( 19 ).fill( {} ) ] ) );
	assert.ok( canaryFor( names, heavy, 'a' ).length * 19 <= CANARY_INSTANCES );
} );

test( 'MUST FAIL: settings each heavier than the budget still give one canary, so a run never proves itself on none', () => {
	const names = [ 'big', 'bigger' ];
	const owned = { big: Array( CANARY_INSTANCES + 1 ).fill( {} ), bigger: Array( CANARY_INSTANCES + 9 ).fill( {} ) };
	assert.deepEqual( canaryFor( names, owned, 'a' ), [ 'big' ] );
} );

test( 'an instance key names its setting, and a setting called content is not a content instance', () => {
	assert.equal( attrOfKey( 'textAlign-tiers-value-2-v0' ), 'textAlign' );
	assert.equal( attrOfKey( 'content-text-label' ), 'label' );
	assert.equal( attrOfKey( 'content-hex-v0' ), 'content' );
} );

test( 'MUST FAIL: any moved default paint is found, a value, a new element or a lost one', () => {
	const before = { '': { 375: { color: 'red', gap: '1px' } } };
	assert.equal( paintMoved( before, structuredClone( before ) ), null, 'negative control: an identical paint moved nothing' );
	assert.match( paintMoved( before, { '': { 375: { color: 'blue', gap: '1px' } } } ), /color/ );
	assert.match( paintMoved( before, { '': { 375: { color: 'red' } } } ), /gap/ );
	assert.match( paintMoved( before, { ...before, '.new': { 375: {} } } ), /is new/ );
	assert.match( paintMoved( { ...before, '.old': { 375: {} } }, before ), /is gone/ );
	assert.match( paintMoved( before, { '': { 375: before[ '' ][ 375 ], 768: { color: 'red' } } } ), /at 768/ );
} );

test( 'MUST FAIL: a canary that moved element, lost a width, or went dead is found', () => {
	const prev = { settings: { a: reading() } };
	const next = ( a ) => ( { settings: { a } } );
	assert.equal( canaryDiffers( prev, next( { ...reading(), reachedAt: [ 1440, 768, 375 ] } ), [ 'a' ] ), null, 'negative control: the same reading in another order' );
	assert.match( canaryDiffers( prev, next( { ...reading(), slots: [ '.b' ] } ), [ 'a' ] ), /canary a/ );
	assert.match( canaryDiffers( prev, next( { ...reading(), reachedAt: [ 375 ] } ), [ 'a' ] ), /canary a/ );
	assert.match( canaryDiffers( prev, { settings: {} }, [ 'a' ] ), /canary a/ );
	assert.match( canaryDiffers( prev, next( { ...reading(), look: { '.a': { color: { 375: 'red' } } } } ), [ 'a' ] ), /canary a/, 'a moved state look counts' );
	assert.match( canaryDiffers( { discovered: { a: { gap: 1 } } }, { discovered: { a: { gap: 2 } } }, [ 'a' ] ), /canary a/, 'a discovery row counts' );
	assert.match( canaryDiffers( { presence: { 'a=1': { shows: [ '.x' ] } } }, { presence: {} }, [ 'a' ] ), /canary a/, 'a presence row counts' );
} );

// The whole loop, with a fake measurement counting what it was asked to read.
async function loop( { why = null, verify = () => null } ) {
	const all = [ 'whole block' ];
	const plan = { instances: [ 'few' ] };
	const asked = [];
	const run = await measureWithFallback( { why, all, plan, measure: async ( list ) => {
		asked.push( list );
		return { list };
	}, verify } );
	return { run, asked, all, plan };
}

test( 'an unchanged block stays incremental and measures only its plan', async () => {
	const { run, asked, plan } = await loop( {} );
	assert.equal( run.mode, 'incremental' );
	assert.deepEqual( asked, [ plan.instances ] );
} );

test( 'MUST FAIL: a changed default paint makes the run measure the whole block and say why', async () => {
	const before = { '': { 375: { color: 'red' } } };
	const { run, asked, all } = await loop( { verify: () => paintMoved( before, { '': { 375: { color: 'blue' } } } ) } );
	assert.equal( run.mode, 'full' );
	assert.match( run.why, /color .* moved from red to blue/ );
	assert.deepEqual( asked.at( -1 ), all, 'the kept reading is the full one, never the partial one' );
	assert.deepEqual( run.reading.list, all );
} );

test( 'MUST FAIL: a canary difference makes the run measure the whole block', async () => {
	const { run, asked, all } = await loop( { verify: () => canaryDiffers( { settings: { a: reading() } }, { settings: {} }, [ 'a' ] ) } );
	assert.equal( run.mode, 'full' );
	assert.deepEqual( asked.at( -1 ), all );
} );

test( 'a run sent straight to full never reads the incremental plan', async () => {
	const { run, asked, all } = await loop( { why: 'no slot map' } );
	assert.equal( run.why, 'no slot map' );
	assert.deepEqual( asked, [ all ] );
} );

const NEXT = { block: 'sgs/x', slotKey: 'new', settings: { fresh: reading() }, discovered: {}, dead: [], oneWidth: [], rejected: [], untestedStates: [] };

test( 'MUST FAIL: a removed attribute leaves every part of the map', () => {
	const prev = prevFor( [ 'keep', 'removed' ], {
		dead: [ 'removedDead' ],
		discovered: { removedMode: {} },
		oneWidth: [ { key: 'removed-hex-v0' } ],
		rejected: [ { key: 'removed-hex-v0' }, { key: 'content-text-removed' } ],
		untestedStates: [ 'removed:hover (hidden)' ],
		text: { removed: {} },
		presence: { 'removed=a': {}, 'keep=a': {} },
	} );
	const merged = mergeSlotMap( prev, NEXT, [ 'fresh' ], new Set( [ 'keep', 'fresh' ] ) );
	assert.deepEqual( Object.keys( merged.settings ).sort(), [ 'fresh', 'keep' ] );
	assert.deepEqual( merged.dead, [] );
	assert.deepEqual( merged.discovered, {} );
	assert.deepEqual( merged.oneWidth, [] );
	assert.deepEqual( merged.rejected, [] );
	assert.deepEqual( merged.untestedStates, [] );
	assert.equal( merged.text, undefined );
	assert.deepEqual( Object.keys( merged.presence ), [ 'keep=a' ] );
} );

test( 'negative control: an unmeasured declared row is kept as it was, and the new keys win', () => {
	const prev = prevFor( [ 'keep' ], { slotKey: 'old' } );
	const merged = mergeSlotMap( prev, NEXT, [ 'fresh' ], new Set( [ 'keep', 'fresh' ] ) );
	assert.deepEqual( merged.settings.keep, prev.settings.keep );
	assert.equal( merged.slotKey, 'new' );
} );

test( 'a setting that went dead replaces its old live row, so the loss guard sees it', () => {
	const merged = mergeSlotMap( prevFor( [ 'a' ] ), { ...NEXT, settings: {}, dead: [ 'a' ] }, [ 'a' ], new Set( [ 'a' ] ) );
	assert.equal( merged.settings.a, undefined );
	assert.deepEqual( merged.dead, [ 'a' ] );
} );

test( 'a fixture hash follows the fixture', () => {
	assert.equal( fixtureKeyOf( { a: 1 } ), fixtureKeyOf( { a: 1 } ) );
	assert.notEqual( fixtureKeyOf( { a: 1 } ), fixtureKeyOf( { a: 2 } ) );
} );

const familySchema = { stepCounter: { type: 'boolean', default: false }, stepCounterColour: { type: 'string', default: '' }, otherColour: { type: 'string', default: '' } };
const familyCtx = { familyPreconditions: { stepCounter: { stepCounter: true } } };

test( 'MUST FAIL: a fixture family turns on the attribute gating every setting named after it', () => {
	assert.deepEqual( preconditionsFor( { attr_name: 'stepCounterColour', css_property: 'color' }, familySchema, {}, familyCtx ), { stepCounter: true } );
} );

test( 'negative control: a setting outside the family is left alone, and a gate is never its own precondition', () => {
	assert.deepEqual( preconditionsFor( { attr_name: 'otherColour', css_property: 'color' }, familySchema, {}, familyCtx ), {} );
	assert.deepEqual( preconditionsFor( { attr_name: 'stepCounter', css_property: '' }, familySchema, {}, familyCtx ), {} );
} );
