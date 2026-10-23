// Proves FR-48-64: each gate G0 to G7 stops a planted row at exactly that gate with its failure class, the browser-version
// check of G0, fail-closed inputs, a measurement that is not a measurement (R-48-4), and the passing chain.
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { g0Freshness, g1PairAndPaint, g2Intent, g3Db, g4Calibration, g5Emission, g6Probe, g7Recheck, runChain, GATES } from '../lib/gate-chain.mjs';
import { finalWalk } from '../gate-chain.mjs';

const fresh = () => ( {
	dbRefreshedAt: '2026-10-22T10:00:00Z', blockCommittedAt: '2026-10-21T10:00:00Z',
	cache: { slotKey: 'abc', playwrightVersion: '1.58.2', browserVersion: '145.0.1' }, deployHash: 'abc',
	installed: { playwrightVersion: '1.58.2', browserVersion: '145.0.1' },
	manifest: { schema_version: '1.0', files: { 'a.dc.html': 'h1', 'support.js': 'h2' } },
	intake: { schema_version: '1.0', files: { 'a.dc.html': 'h1', 'support.js': 'h2' } }, schemaVersion: '1.0', blockChanges: [],
} );
const row = ( over = {} ) => ( { ref: 'cr-ref-f-1', path: '', pair: 'head', kind: 'style', key: 'padding-top', state: 'rest', width: 1440, draft: '24px', live: '16px', ...over } );

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' ), ( 'content', 'content-bearing' );` );
	return d;
};
const add = ( d, ...r ) => d.prepare( 'INSERT INTO block_attributes VALUES ( ?, ?, ?, ?, ?, ? )' ).run( ...r );

// ---- G0
test( 'MUST FAIL G0: a DB refreshed before the block\'s last commit is I-stale', () => {
	const i = fresh();
	i.dbRefreshedAt = '2026-10-20T00:00:00Z';
	const r = g0Freshness( i );
	assert.deepEqual( [ r.pass, r.class ], [ false, 'I-stale' ] );
	assert.equal( g0Freshness( fresh() ).pass, true );
} );

test( 'MUST FAIL G0: a cache measured on another deploy is I-stale', () => {
	const i = fresh();
	i.deployHash = 'zzz';
	assert.equal( g0Freshness( i ).class, 'I-stale' );
} );

test( 'MUST FAIL G0: a browser or Playwright version that differs from the installed one is I-stale, and an unrecorded version fails too', () => {
	let i = fresh();
	i.installed.browserVersion = '146.0.0';
	assert.match( g0Freshness( i ).evidence.line, /browserVersion 145\.0\.1.*146\.0\.0/ );
	i = fresh();
	i.installed.playwrightVersion = '1.59.0';
	assert.equal( g0Freshness( i ).class, 'I-stale' );
	i = fresh();
	delete i.cache.browserVersion;
	assert.equal( g0Freshness( i ).pass, false );
	i = fresh();
	i.installed = {};
	assert.equal( g0Freshness( i ).pass, false );
	// a version recorded nowhere is not a match
	i = fresh();
	delete i.cache.browserVersion;
	i.installed = { playwrightVersion: '1.58.2' };
	assert.match( g0Freshness( i ).evidence.line, /not recorded/ );
} );

test( 'MUST FAIL G0: intake hashes that differ from MANIFEST, a wrong schema_version, and unreadable inputs are I-stale', () => {
	let i = fresh();
	i.intake.files[ 'support.js' ] = 'other';
	assert.match( g0Freshness( i ).evidence.line, /support\.js/ );
	i = fresh();
	i.manifest.schema_version = '2.0';
	assert.equal( g0Freshness( i ).class, 'I-stale' );
	i = fresh();
	i.dbRefreshedAt = 'not a date';
	assert.equal( g0Freshness( i ).pass, false );
	assert.equal( g0Freshness( null ).class, 'I-stale' );
} );

// ---- G1
const g1 = ( over = {}, r = row() ) => ( { row: r, pairing: { by: 'identity' }, paint: { inert: false, paints: true }, stateListed: true, ...over } );
test( 'MUST FAIL G1: a word pairing, a mispaired block, an unread side, an inert element, no paint and an unlisted state are W-walker', () => {
	assert.equal( g1PairAndPaint( g1() ).pass, true );
	for ( const bad of [ g1( { pairing: { by: 'words' } } ), g1( {}, row( { mispaired: 'two pairings' } ) ), g1( {}, row( { live: null } ) ), g1( { paint: { inert: true, paints: true } } ), g1( { paint: { inert: false, paints: false } } ), g1( { stateListed: false } ), g1( {}, row( { ref: null } ) ), {} ] ) {
		const r = g1PairAndPaint( bad );
		assert.deepEqual( [ r.pass, r.class ], [ false, 'W-walker' ] );
	}
} );

// ---- G2
test( 'MUST FAIL G2: ledgered is CLIENT; a declared value the render contradicts is render-wins, or draft-defect when FR-48-34 passes', () => {
	const i = { property: 'padding-top', declared: '24px', renderedDraft: '24px', fr34Passes: false, ledgered: false };
	assert.equal( g2Intent( i ).pass, true );
	assert.equal( g2Intent( { ...i, ledgered: true } ).class, 'CLIENT' );
	assert.equal( g2Intent( { ...i, declared: '8px' } ).class, 'render-wins' );
	assert.equal( g2Intent( { ...i, declared: '8px', fr34Passes: true } ).class, 'draft-defect' );
	assert.equal( g2Intent( { ...i, declared: null } ).pass, true );
	assert.equal( g2Intent( { ...i, renderedDraft: null } ).class, 'W-walker' );
	assert.equal( g2Intent( { property: 'padding-top' } ).pass, false );
	// a declared value the browser serialises in another shape cannot be compared: W-walker, never a pass
	const shadow = g2Intent( { property: 'box-shadow', declared: '0 1px 2px #000', renderedDraft: 'rgb(0, 0, 0) 0px 1px 2px 0px', fr34Passes: false, ledgered: false } );
	assert.deepEqual( [ shadow.pass, shadow.class ], [ false, 'W-walker' ] );
} );

// ---- G3
test( 'MUST FAIL G3: a NULL css_property row that fits is I-unrouted', () => {
	const d = db();
	add( d, 'sgs/card', 'paddingTop', null, null, 'spacing-token', 'sgs' );
	const r = g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } );
	assert.deepEqual( [ r.pass, r.class ], [ false, 'I-unrouted' ] );
} );

test( 'MUST FAIL G3: a routed row whose role is classed content-bearing is I-mistag', () => {
	const d = db();
	add( d, 'sgs/card', 'cardSpace', 'padding-top', null, 'content', 'sgs' );
	const r = g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } );
	assert.deepEqual( [ r.pass, r.class ], [ false, 'I-mistag' ] );
} );

test( 'MUST FAIL G3: a routed, correctly roled row on an ancestor passes and is listed; nothing fitting passes with an empty list; an unreadable DB is I-stale', () => {
	const d = db();
	add( d, 'sgs/parent', 'space', 'padding-top', null, 'spacing-token', 'sgs-ext' );
	const r = g3Db( { db: d, block: 'sgs/card', ancestors: [ 'sgs/parent' ], property: 'padding-top', state: null } );
	assert.deepEqual( [ r.pass, r.settings ], [ true, [ { block: 'sgs/parent', attr: 'space' } ] ] );
	assert.deepEqual( g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } ).settings, [] );
	// a hover-state row is not a rest route, and is not a silent pass with no settings either
	add( d, 'sgs/card', 'hoverSpace', 'padding-top', 'hover', 'spacing-token', 'sgs' );
	const other = g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } );
	assert.deepEqual( [ other.pass, other.class ], [ false, 'I-unrouted' ] );
	assert.equal( g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: 'hover' } ).pass, true, 'the hover request finds its own row' );
	assert.equal( g3Db( { db: new DatabaseSync( ':memory:' ), block: 'sgs/card', property: 'padding-top' } ).class, 'I-stale' );
	assert.equal( g3Db( {} ).class, 'I-stale' );
} );

// ---- G4
test( 'MUST FAIL G4: a candidate setting that is dead, markerless, untested in the state or rejected is I-calibration', () => {
	const settings = [ { block: 'sgs/card', attr: 'space' } ];
	assert.equal( g4Calibration( { cache: {}, settings } ).pass, true );
	for ( const cache of [ { dead: [ 'space' ] }, { noMarker: [ 'space' ] }, { untestedStates: [ 'space:hover' ] }, { rejected: [ { key: 'space-2' } ] } ] ) {
		const r = g4Calibration( { cache, settings, state: 'hover' } );
		assert.deepEqual( [ r.pass, r.class ], [ false, 'I-calibration' ] );
	}
	assert.equal( g4Calibration( { settings } ).class, 'I-calibration' );
	assert.equal( g4Calibration( { cache: {}, settings: [] } ).pass, true );
} );

test( 'MUST FAIL G4: an overriddenBy verdict stands only while the rendered box agrees', () => {
	const settings = [ { block: 'sgs/card', attr: 'space' } ];
	const cache = { settings: { space: { overriddenBy: { attr: 'other' } } } };
	assert.equal( g4Calibration( { cache, settings, boxAgrees: false } ).class, 'I-calibration' );
	assert.equal( g4Calibration( { cache, settings } ).class, 'I-calibration' );
	assert.equal( g4Calibration( { cache, settings, boxAgrees: true } ).pass, true );
} );

// ---- G5
test( 'MUST FAIL G5: a candidate whose measured emission reaches the element is W-route; one that does not reach passes', async () => {
	const settings = [ { block: 'sgs/card', attr: 'space' } ];
	const m = ( reaches ) => async () => ( { method: 'measured', emitted: 'padding-top: 24px', reaches, evidence: 'computed 24px' } );
	assert.deepEqual( ( ( r ) => [ r.pass, r.class ] )( await g5Emission( { settings, measure: m( true ) } ) ), [ false, 'W-route' ] );
	assert.equal( ( await g5Emission( { settings, measure: m( false ) } ) ).pass, true );
	assert.equal( ( await g5Emission( { settings: [] } ) ).pass, true );
} );

test( 'MUST FAIL G5: a string search is not a measurement, an unmeasurable result and a thrown measurement fail closed (R-48-4)', async () => {
	const settings = [ { block: 'sgs/card', attr: 'space' } ];
	assert.equal( ( await g5Emission( { settings, measure: async () => ( { method: 'grep', reaches: false } ) } ) ).class, 'W-route' );
	assert.equal( ( await g5Emission( { settings, measure: async () => ( { method: 'measured' } ) } ) ).pass, false );
	assert.equal( ( await g5Emission( { settings, measure: async () => { throw new Error( 'page closed' ); } } ) ).pass, false );
	assert.match( ( await g5Emission( { settings } ) ).evidence.line, /no emission measurement was supplied/ );
} );

// ---- G6
test( 'MUST FAIL G6: each probe kind proves its gap with its own result and names its F-class; anything else is W-route', async () => {
	const run = ( kind, result ) => g6Probe( { kind, probe: async () => result } );
	assert.equal( ( await run( 'missing-setting', { changed: false } ) ).framework, 'F-setting' );
	assert.equal( ( await run( 'hardcode', { rule: '.sgs-x { padding: 0 !important }' } ) ).framework, 'F-hardcode' );
	assert.equal( ( await run( 'missing-block', { matches: [] } ) ).framework, 'F-block' );
	assert.equal( ( await run( 'behaviour', { flowFails: true, attributeMatches: [] } ) ).framework, 'F-behaviour' );
	for ( const [ kind, result ] of [ [ 'missing-setting', { changed: true } ], [ 'missing-setting', {} ], [ 'hardcode', { rule: '' } ], [ 'missing-block', { matches: [ 'sgs/x' ] } ], [ 'behaviour', { flowFails: true, attributeMatches: [ 'a' ] } ], [ 'behaviour', { flowFails: false, attributeMatches: [] } ] ] ) {
		const r = await run( kind, result );
		assert.deepEqual( [ r.pass, r.class ], [ false, 'W-route' ], kind );
	}
	assert.equal( ( await g6Probe( { kind: 'hardcode' } ) ).pass, false );
	assert.equal( ( await g6Probe( { kind: 'nope', probe: async () => ( {} ) } ) ).pass, false );
} );

// ---- G7
test( 'MUST FAIL G7: a row a fresh walk no longer shows is dropped as closed; no answer fails closed', async () => {
	assert.equal( ( await g7Recheck( { recheck: async () => ( { stillOpen: true } ) } ) ).pass, true );
	const gone = await g7Recheck( { recheck: async () => ( { stillOpen: false } ) } );
	assert.deepEqual( [ gone.pass, gone.class ], [ false, 'closed' ] );
	assert.equal( ( await g7Recheck( { recheck: async () => ( {} ) } ) ).class, 'I-stale' );
	assert.equal( ( await g7Recheck( {} ) ).class, 'I-stale' );
} );

// ---- the runner
function ctxOf( over = {} ) {
	const d = db();
	const inputs = {
		G0: () => fresh(),
		G1: ( r ) => g1( {}, r ),
		G2: () => ( { property: 'padding-top', declared: '24px', renderedDraft: '24px', fr34Passes: false, ledgered: false } ),
		G3: () => ( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } ),
		G4: () => ( { cache: {}, settings: [] } ),
		G5: () => ( { settings: [] } ),
		G6: () => ( { kind: 'missing-setting', probe: async () => ( { changed: false, evidence: 'trial: no setting moved padding-top' } ) } ),
		G7: () => ( { recheck: async () => ( { stillOpen: true } ) } ),
		...over,
	};
	return { inputs };
}

test( 'MUST FAIL: a row passing every gate is a framework-gap candidate with its F-class and eight passing gates', async () => {
	const r = await runChain( row(), ctxOf() );
	assert.deepEqual( [ r.gate, r.class, r.candidate ], [ null, 'F-setting', true ] );
	assert.deepEqual( r.gates.map( ( g ) => g.status ), GATES.map( () => 'pass' ) );
} );

test( 'MUST FAIL: a planted row stops at exactly the gate it fails, with that gate\'s class, and later gates are not reached', async () => {
	const planted = {
		G0: [ () => ( { ...fresh(), installed: { playwrightVersion: '1.58.2', browserVersion: '9' } } ), 'I-stale' ],
		G1: [ ( r ) => g1( { pairing: { by: 'words' } }, r ), 'W-walker' ],
		G2: [ () => ( { property: 'padding-top', declared: '8px', renderedDraft: '24px', fr34Passes: false, ledgered: false } ), 'render-wins' ],
		G3: [ () => { const d = db(); add( d, 'sgs/card', 'paddingTop', null, null, 'spacing-token', 'sgs' ); return { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null }; }, 'I-unrouted' ],
		G4: [ () => ( { cache: { dead: [ 'space' ] }, settings: [ { attr: 'space' } ] } ), 'I-calibration' ],
		G5: [ () => ( { settings: [ { attr: 'space' } ], measure: async () => ( { method: 'measured', reaches: true } ) } ), 'W-route' ],
		G6: [ () => ( { kind: 'missing-setting', probe: async () => ( { changed: true } ) } ), 'W-route' ],
		G7: [ () => ( { recheck: async () => ( { stillOpen: false } ) } ), 'closed' ],
	};
	for ( const [ gate, [ input, cls ] ] of Object.entries( planted ) ) {
		const r = await runChain( row(), ctxOf( { [ gate ]: input } ) );
		assert.deepEqual( [ r.gate, r.class, r.candidate ], [ gate, cls, false ], gate );
		const at = GATES.indexOf( gate );
		assert.deepEqual( r.gates.map( ( g ) => g.status ), GATES.map( ( _, n ) => ( n < at ? 'pass' : n === at ? 'fail' : 'not-reached' ) ), gate );
		assert.equal( r.setting?.attr ?? null, { G3: 'paddingTop', G4: 'space' }[ gate ] ?? null, `${ gate } names the setting it judged` );
	}
} );

test( 'MUST FAIL: the runner never fails open: a gate with no input builder, an undefined input or a throwing builder stops there', async () => {
	const none = ctxOf();
	delete none.inputs.G3;
	assert.deepEqual( ( ( r ) => [ r.gate, r.class ] )( await runChain( row(), none ) ), [ 'G3', 'I-stale' ] );
	assert.equal( ( await runChain( row(), ctxOf( { G0: () => undefined } ) ) ).gate, 'G0' );
	const thrown = await runChain( row(), ctxOf( { G5: () => { throw new Error( 'block unknown' ); } } ) );
	assert.deepEqual( [ thrown.gate, thrown.class ], [ 'G5', 'W-route' ] );
	assert.deepEqual( ( ( r ) => [ r.gate, r.class ] )( await runChain( row(), {} ) ), [ 'G0', 'I-stale' ] );
} );

test( 'MUST FAIL: the CLI reads the highest round of the walks beside a report', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'gate-chain-' ) );
	for ( const n of [ 1, 2, 10 ] ) {
		fs.mkdirSync( path.join( dir, `round-${ n }` ) );
		fs.writeFileSync( path.join( dir, `round-${ n }`, 'report.json' ), JSON.stringify( { round: n } ) );
	}
	assert.equal( finalWalk( dir ).round, 10 );
	assert.equal( finalWalk( fs.mkdtempSync( path.join( os.tmpdir(), 'gate-chain-' ) ) ), null );
} );

test( 'MUST FAIL G3: a routed fitting setting on the row\'s state passes before any NULL-routed name fit is considered; with nothing routed the NULL fit is I-unrouted and named', () => {
	const d = db();
	add( d, 'sgs/site-header', 'labelColour', null, null, 'spacing-token', 'sgs' );
	add( d, 'sgs/site-header', 'textColour', 'color', null, 'spacing-token', 'sgs' );
	const r = g3Db( { db: d, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } );
	assert.deepEqual( [ r.pass, r.settings ], [ true, [ { block: 'sgs/site-header', attr: 'textColour' } ] ] );
	const n = db();
	add( n, 'sgs/site-header', 'labelColour', null, null, 'spacing-token', 'sgs' );
	const u = g3Db( { db: n, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } );
	assert.deepEqual( [ u.pass, u.class, u.setting ], [ false, 'I-unrouted', { block: 'sgs/site-header', attr: 'labelColour' } ] );
} );

test( 'MUST FAIL G3: a NULL-routed name spelling another property that ends in the row\'s (from the DB\'s routed css_property values or the CSS property list) never fits it; a name carrying a state the DB routes is read on that state', () => {
	const d = db();
	add( d, 'sgs/other', 'cardDividerColour', 'card-divider-color', null, 'spacing-token', 'sgs' );
	add( d, 'sgs/site-header', 'dividerColour', null, null, 'spacing-token', 'sgs' );
	add( d, 'sgs/site-header', 'shadowColourHover', null, null, 'spacing-token', 'sgs' );
	add( d, 'sgs/site-header', 'shapeDividerTopColour', null, null, 'spacing-token', 'sgs' );
	const r = g3Db( { db: d, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } );
	assert.deepEqual( [ r.pass, r.settings ], [ true, [] ] );
	// negative control: without the routed card-divider-color row, nothing names a property ending in "divider color", so the name fits
	const c = db();
	add( c, 'sgs/site-header', 'dividerColour', null, null, 'spacing-token', 'sgs' );
	assert.deepEqual( ( ( x ) => [ x.class, x.setting?.attr ] )( g3Db( { db: c, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } ) ), [ 'I-unrouted', 'dividerColour' ] );
	const h = db();
	add( h, 'sgs/other', 'linkColourHover', 'color', 'hover', 'spacing-token', 'sgs' );
	add( h, 'sgs/site-header', 'textColourHover', null, null, 'spacing-token', 'sgs' );
	const rest = g3Db( { db: h, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } );
	assert.equal( rest.class, 'I-unrouted' );
	assert.match( rest.evidence.line, /textColourHover .* on state hover \(read from its name\), not on the resting state/ );
	const hover = g3Db( { db: h, block: 'sgs/site-header', ancestors: [], property: 'color', state: 'hover' } );
	assert.match( hover.evidence.line, /textColourHover .*fits color but carries no css_property/ );
	// negative control: a DB that routes no hover state reads the name on the resting state
	const plain = db();
	add( plain, 'sgs/site-header', 'textColourHover', null, null, 'spacing-token', 'sgs' );
	assert.match( g3Db( { db: plain, block: 'sgs/site-header', ancestors: [], property: 'color', state: null } ).evidence.line, /fits color but carries no css_property/ );
} );

test( 'MUST FAIL G3 and G4: the failing gate names the setting it judged', () => {
	const d = db();
	add( d, 'sgs/card', 'cardSpace', 'padding-top', null, 'content', 'sgs' );
	assert.deepEqual( g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } ).setting, { block: 'sgs/card', attr: 'cardSpace' } );
	const e = db();
	add( e, 'sgs/card', 'paddingTopHover', 'padding-top', 'hover', 'spacing-token', 'sgs' );
	assert.deepEqual( g3Db( { db: e, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } ).setting, { block: 'sgs/card', attr: 'paddingTopHover' } );
	const g4 = g4Calibration( { cache: { dead: [ 'b' ] }, settings: [ { block: 'sgs/card', attr: 'a' }, { block: 'sgs/card', attr: 'b' } ], state: null, boxAgrees: true } );
	assert.deepEqual( [ g4.class, g4.setting ], [ 'I-calibration', { block: 'sgs/card', attr: 'b' } ] );
} );

test( 'MUST FAIL G3: a NULL css_property row that fits on another state is not an unrouted-on-this-state pass either: both lists take the same state rule', () => {
	const d = db();
	add( d, 'sgs/card', 'paddingTop', null, 'hover', 'spacing-token', 'sgs' );
	const rest = g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } );
	assert.deepEqual( [ rest.pass, rest.class ], [ false, 'I-unrouted' ], 'never a pass with no settings' );
	const hover = g3Db( { db: d, block: 'sgs/card', ancestors: [], property: 'padding-top', state: 'hover' } );
	assert.equal( hover.class, 'I-unrouted' );
} );

test( 'MUST FAIL G0: uncommitted edits to the block are I-stale, and an unread change list fails closed', () => {
	const i = fresh();
	i.blockChanges = [ ' M plugins/sgs-blocks/src/blocks/card/render.php' ];
	const r = g0Freshness( i );
	assert.deepEqual( [ r.pass, r.class ], [ false, 'I-stale' ] );
	assert.match( r.evidence.line, /uncommitted changes/ );
	delete i.blockChanges;
	assert.equal( g0Freshness( i ).class, 'I-stale' );
	assert.equal( g0Freshness( fresh() ).pass, true );
} );

test( 'MUST FAIL G0: the expected MANIFEST schema version is read from the handoff schema, not written in the command', async () => {
	const { manifestSchemaVersion } = await import( '../lib/handoff.mjs' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'schema-' ) );
	fs.writeFileSync( path.join( dir, 'manifest.schema.json' ), JSON.stringify( { properties: { schema_version: { const: '7.3' } } } ) );
	assert.equal( manifestSchemaVersion( dir ), '7.3' );
	fs.writeFileSync( path.join( dir, 'manifest.schema.json' ), '{}' );
	assert.throws( () => manifestSchemaVersion( dir ), /names no schema_version const/ );
	fs.rmSync( dir, { recursive: true } );
	assert.match( manifestSchemaVersion(), /^\d+\.\d+$/ );
	assert.ok( ! /schemaVersion: '/.test( fs.readFileSync( new URL( '../gate-chain.mjs', import.meta.url ), 'utf8' ) ), 'no literal version in the command' );
} );
