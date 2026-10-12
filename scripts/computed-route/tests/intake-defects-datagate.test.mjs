// Spec 48 FR-48-34, lib/intake-defects-datagate.mjs::dataGatedWhy on the fixture export
// tests/fixtures/intake-defects-datagate/ (census static and runtime pass, then FR-48-34 test 2 at 1440):
//   - sc-if Home:5 `{{ b.isTimeline }}` inside the blocks loop: no block of either page in the draft's own data has type
//     timeline, so it, the transition and style-hover on Home:6 inside it, and the reveal's scale-in (reached only
//     through `[data-draw-y]`, whose one element sits inside Home:5) are dead code, kind data-gated; with the rule off
//     the scale-in is a draft defect and the template rows are gap rows.
//   - sc-if Home:8 `{{ b.isBanner }}`: true for the about page's banner block, a page this run never opens, so it stays
//     a gap row, never dead code.
//   - sc-if Home:10 `{{ b.isOpen }}`: reads state a click handler writes, so never data-gated (the run reaches it).
// The static controls change the fixture's own logic: a block of type timeline, or a write after creation that can make
// one, and the gate no longer holds; a census without stamped parent links proves nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus, applyRuntime } from '../lib/intake-census.mjs';
import { runtimeCensus } from '../lib/intake-census-runtime.mjs';
import { unreachedDefects } from '../lib/intake-defects.mjs';
import { dataGatedWhy } from '../lib/intake-defects-static.mjs';
import { buildModel, codeTarget } from '../lib/intake-census-map.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-defects-datagate' );
const ENTRY = 'Home.dc.html';
const S = {
	timeline: 'sc-if@Home:5', transition: 'transition@Home:6/style::transition', hover: 'style-hover@Home:6/hover',
	banner: 'sc-if@Home:8', open: 'sc-if@Home:10', reveal: 'waapi@Home:js:59:8',
};
const GATED = [ S.timeline, S.transition, S.hover, S.reveal ];
const fx = {};

test.before( async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	fx.harPath = path.join( os.tmpdir(), 'sgs-intake-defects-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( fx.harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath: fx.harPath } );
	}
	const st = await staticCensus( { folder: FOLDER, entry: ENTRY, harPath: fx.harPath } );
	const rt = await runtimeCensus( { folder: FOLDER, entry: ENTRY, harPath: fx.harPath, census: st } );
	fx.census = { rows: applyRuntime( st.rows, rt ), sources: st.sources };
	const base = { folder: FOLDER, entry: ENTRY, harPath: fx.harPath, census: fx.census, widths: [ 1440 ] };
	fx.res = await unreachedDefects( base );
	fx.off = await unreachedDefects( { ...base, force: { dataGate: false } } );
} );

const notDefect = ( res, id ) => res.notDefects.find( ( r ) => r.censusId === id );
const gapOn = ( res, id ) => res.gaps.some( ( g ) => g.draftId === fx.census.rows.find( ( r ) => r.id === id ).draftId );
// dataGatedWhy for a row of `census` (the fixture's, or one with its logic changed), its code target built as the
// draft-defect plan builds it.
const verdict = ( id, census = fx.census ) => {
	const row = census.rows.find( ( r ) => r.id === id );
	const rows = new Map();
	census.rows.forEach( ( r ) => rows.set( r.component, [ ...( rows.get( r.component ) || [] ), r ] ) );
	const target = row.draftId.includes( ':js:' ) ? codeTarget( row, buildModel( census.sources ), rows ) : null;
	return dataGatedWhy( census, { row, target: target && ! target.gap ? target : null } );
};
// The fixture census with each [from, to] replaced once in Home's logic (same line count, so code IDs still point at
// the same constructs).
const withLogic = ( ...edits ) => ( {
	rows: fx.census.rows,
	sources: fx.census.sources.map( ( s ) => ( 'Home' === s.component ? { ...s, logic: edits.reduce( ( t, [ a, b ] ) => {
		assert.ok( t.includes( a ), a );
		return t.replace( a, b );
	}, s.logic ) } : s ) ),
} );

test( 'the census marks the gated constructs unreached, and its stamped elements carry their parent', () => {
	const un = fx.census.rows.filter( ( r ) => true === r.unreached ).map( ( r ) => r.id );
	GATED.forEach( ( id ) => assert.ok( un.includes( id ), id ) );
	const els = fx.census.sources.find( ( s ) => 'Home' === s.component ).stamped.elements;
	assert.equal( els.find( ( e ) => '6' === e.n ).parent, '5' );
	assert.equal( els.find( ( e ) => '5' === e.n ).parent, els.find( ( e ) => 'section' === e.tag ).n );
} );

test( 'MUST FAIL (FR-48-34): an sc-if false for every item of the draft\'s own data is dead code, with what sits inside it and code reached only through its elements', () => {
	GATED.forEach( ( id ) => assert.deepEqual( [ notDefect( fx.res, id )?.why, notDefect( fx.res, id )?.deadKind ], [ 'dead-code', 'data-gated' ], id ) );
	assert.equal( notDefect( fx.res, S.timeline ).note, 'sc-if Home:5: b.isTimeline is false for all 4 items of blocks in the draft\'s own data' );
	assert.equal( notDefect( fx.res, S.hover ).note, 'style-hover Home:6 sits inside sc-if Home:5, whose b.isTimeline is false for all 4 items of blocks in the draft\'s own data' );
	assert.match( notDefect( fx.res, S.reveal ).note, /^waapi Home:js:59:8 is reached only through elements matching \[data-draw-y\]: \[data-draw-y\] matches only elements inside sc-if Home:5,/ );
	assert.deepEqual( fx.res.rows, [], 'no draft defect is left' );
	assert.deepEqual( fx.off.rows.map( ( r ) => r.censusId ), [ S.reveal ], 'with the rule off the scale-in is a draft defect' );
	[ S.timeline, S.transition, S.hover ].forEach( ( id ) => assert.ok( ! notDefect( fx.off, id ) && gapOn( fx.off, id ), `${ id } is a gap row with the rule off` ) );
} );

test( 'negative control: an sc-if true for an item of a page the run never opens stays a gap row', () => {
	assert.equal( verdict( S.banner ), null );
	assert.ok( ! notDefect( fx.res, S.banner ) && gapOn( fx.res, S.banner ) );
} );

test( 'negative control: an sc-if on state a click handler writes is never data-gated', () => {
	assert.equal( verdict( S.open ), null );
	assert.equal( notDefect( fx.res, S.open )?.why, 'reached-when-forced' );
} );

test( 'negative control: one item with the type in the draft\'s own data and the gate does not hold', () => {
	const c = withLogic( [ 'type: \'banner\', title', 'type: \'timeline\', title' ] );
	GATED.forEach( ( id ) => assert.equal( verdict( id, c ), null, id ) );
	GATED.forEach( ( id ) => assert.ok( verdict( id ), `${ id } is data-gated on the unchanged logic` ) );
} );

test( 'MUST FAIL: a write after creation that can give an item the type defeats the gate (an object literal holds more than it declares)', () => {
	const c = withLogic(
		[ 'const cta = ( o ) => Object.assign( { type: \'cta\', title: \'Get in touch\' }, o || {} );', 'const cta = ( o ) => { const c = { type: \'cta\', title: \'Get in touch\' }; if ( o && o.kind ) c.type = o.kind; return c; };' ],
		[ 'cta( { title: \'Order now\' } )', 'cta( { title: \'Order now\', kind: \'timeline\' } )' ] );
	GATED.forEach( ( id ) => assert.equal( verdict( id, c ), null, id ) );
} );

test( 'a census without stamped parent links proves nothing', () => {
	const c = { rows: fx.census.rows, sources: fx.census.sources.map( ( s ) => ( { ...s, stamped: { ...s.stamped, elements: s.stamped.elements.map( ( { parent, ...e } ) => e ) } } ) ) };
	GATED.forEach( ( id ) => assert.equal( verdict( id, c ), null, id ) );
} );
