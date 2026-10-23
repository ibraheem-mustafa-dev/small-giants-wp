// Proves FR-48-65's class mapping (lib/gap-classes.mjs): every triage class and reason maps exactly as the FR lists it, an
// unknown one throws, and the instrument gates (G0, G3, G4) turn an F or W row into its I-class.
import test from 'node:test';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { mapTriage, mapResolverGap, classify, instrumentFinding, staleCheck, gapClassOf, withDiscovery, GAP_CLASSES, UNASSESSED } from '../lib/gap-classes.mjs';
import { TRIAGE_CLASSES } from '../lib/triage.mjs';

const W_WALKER = [ 'mispaired', 'same-element', 'unmeasured-side', 'no-live-element', 'consequence', 'unmapped-state', 'content' ];
const cls = ( c, r ) => mapTriage( { class: c, decidedBy: r } );

test( 'FR-48-65: every reason the FR lists maps to its class', () => {
	for ( const r of W_WALKER ) {
		assert.equal( cls( 'W', r ).class, 'W-walker', r );
	}
	for ( const r of [ 'resolver-shape', 'resolver-ambiguous', 'resolver-blocked', 'canvas-settable' ] ) {
		assert.equal( cls( 'W', r ).class, 'W-route', r );
	}
	assert.deepEqual( [ cls( 'F', 'no-setting' ), cls( 'F', 'hardcode' ) ].map( ( v ) => [ v.class, v.candidate ] ), [ [ 'F-setting', true ], [ 'F-hardcode', true ] ] );
	assert.equal( cls( 'T', 'resolver-writes' ).class, 'W-route' );
	assert.equal( cls( 'U', 'box-unexplained' ).class, 'W-walker' );
	assert.equal( cls( 'L', 'ledger-consequence' ).class, 'CLIENT' );
	assert.equal( cls( 'W', 'resolver-shape' ).candidate, false );
	assert.equal( TRIAGE_CLASSES.length, 5, 'triage gained a class: map it' );
} );

test( 'MUST FAIL: an unknown triage class or reason throws and never defaults to a class', () => {
	assert.throws( () => cls( 'W', 'brand-new-reason' ), /not in FR-48-65's mapping/ );
	assert.throws( () => cls( 'X', 'mispaired' ), /not in FR-48-65's mapping/ );
	assert.throws( () => cls( 'F', 'resolver-writes' ), /not in FR-48-65's mapping/ );
	assert.throws( () => cls( 'T', 'box-unexplained' ), /not in FR-48-65's mapping/ );
	assert.throws( () => cls( 'W', 'resolver-' ), /not in FR-48-65's mapping/ );
	assert.throws( () => mapTriage( { class: 'W' } ), /no reason/ );
	assert.throws( () => mapTriage( null ), /no reason/ );
	assert.throws( () => gapClassOf( 'F' ), /not one of FR-48-65/ );
} );

test( 'negative control: a measuring artefact and a route gap stay different, as do a calibration gap and a fitted setting', () => {
	assert.notEqual( cls( 'W', 'mispaired' ).class, cls( 'W', 'resolver-shape' ).class );
	assert.equal( cls( 'W', 'uncalibrated-fit' ).class, 'I-calibration' );
	assert.equal( cls( 'W', 'attribute' ).class, 'W-route' );
	assert.equal( mapResolverGap( 'uncalibrated' ).class, 'I-calibration' );
	assert.equal( mapResolverGap( 'no-setting' ).class, 'F-setting' );
	assert.equal( mapResolverGap( 'shape' ).class, 'W-route' );
} );

test( 'every class name the census data carries is one of FR-48-65 or held', () => {
	const file = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-classes.json' );
	const rules = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	for ( const r of [ ...rules.unmapped, ...rules.held ] ) {
		assert.ok( r.frClass, `${ r.class } has no frClass` );
		'held' === r.frClass || gapClassOf( r.frClass );
	}
	assert.equal( rules.unmapped.find( ( r ) => 'no-setting' === r.class ).candidate, true );
	assert.ok( GAP_CLASSES.includes( 'I-unrouted' ) );
} );

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' ), ( 'content', 'content-bearing' );` );
	return d;
};
const add = ( d, ...r ) => d.prepare( 'INSERT INTO block_attributes VALUES ( ?, ?, ?, ?, ?, ? )' ).run( ...r );
const slice = { block: 'sgs/container', ancestors: [], property: 'max-width', state: null };
const F = { class: 'F-setting', candidate: true };

test( 'MUST FAIL: a NULL-routed fitting setting classes an F candidate as I-unrouted, naming the attribute', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidth', null, null, 'spacing-token', 'sgs' );
	const f = instrumentFinding( { db: d, ...slice, cache: {} } );
	const c = classify( F, f );
	assert.deepEqual( [ c.class, c.via, c.attribute, c.candidate ], [ 'I-unrouted', 'G3', 'maxWidth', false ] );
	assert.match( c.evidence.line, /maxWidth/ );
	assert.match( c.evidence.command, /block_attributes/ );
} );

test( 'MUST FAIL: the finding names the setting G3 itself judged, never another row a per-setting re-run fails the same way', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidthHover', 'max-width', 'hover', 'spacing-token', 'sgs' );
	add( d, 'sgs/container', 'maxWidth', null, null, 'spacing-token', 'sgs' );
	const f = instrumentFinding( { db: d, ...slice, cache: {} } );
	assert.equal( f.db.class, 'I-unrouted' );
	assert.match( f.db.evidence.line, /^sgs\/container maxWidth / );
	assert.equal( f.attribute, 'maxWidth' );
	const e = db();
	add( e, 'sgs/container', 'maxWidth', 'max-width', null, 'spacing-token', 'sgs' );
	add( e, 'sgs/container', 'contentWidth', 'max-width', null, 'spacing-token', 'sgs' );
	assert.equal( instrumentFinding( { db: e, ...slice, cache: { dead: [ 'contentWidth' ] } } ).attribute, 'contentWidth' );
} );

test( 'MUST FAIL: an enum setting calibration discovered is never I-unrouted; an undiscovered one still is', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidth', null, null, 'spacing-token', 'sgs' );
	const seen = instrumentFinding( { db: d, ...slice, cache: {}, isDiscovered: ( r ) => 'maxWidth' === r.attr_name } );
	assert.equal( seen.db.pass, true );
	assert.equal( classify( F, seen ).class, 'F-setting' );
	const other = instrumentFinding( { db: d, ...slice, cache: {}, isDiscovered: ( r ) => 'layout' === r.attr_name } );
	assert.equal( classify( F, other ).class, 'I-unrouted' );
	// the discovery filter never hides a routed row
	const d2 = db();
	add( d2, 'sgs/container', 'maxWidth', 'max-width', null, 'spacing-token', 'sgs' );
	assert.equal( withDiscovery( d2, () => true ).prepare( 'SELECT block_slug, attr_name, css_property FROM block_attributes' ).all().length, 1 );
} );

test( 'MUST FAIL: a routed fitting setting with a content role classes as I-mistag, a dead one as I-calibration', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidth', 'max-width', null, 'content', 'sgs' );
	assert.equal( classify( F, instrumentFinding( { db: d, ...slice, cache: {} } ) ).class, 'I-mistag' );
	const e = db();
	add( e, 'sgs/container', 'maxWidth', 'max-width', null, 'spacing-token', 'sgs' );
	const dead = classify( { class: 'W-route', candidate: false }, instrumentFinding( { db: e, ...slice, cache: { dead: [ 'maxWidth' ] } } ) );
	assert.deepEqual( [ dead.class, dead.via, dead.attribute ], [ 'I-calibration', 'G4', 'maxWidth' ] );
	const absent = classify( F, instrumentFinding( { db: e, ...slice, cache: null } ) );
	assert.equal( absent.class, 'I-calibration' );
} );

test( 'negative control: a calibrated, routed, well-tagged setting leaves the base class; a measuring artefact and a client row stand', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidth', 'max-width', null, 'spacing-token', 'sgs' );
	const f = instrumentFinding( { db: d, ...slice, cache: { dead: [ 'other' ] } } );
	assert.equal( classify( F, f ).class, 'F-setting' );
	assert.equal( classify( F, f ).candidate, true );
	const u = db();
	add( u, 'sgs/container', 'maxWidth', null, null, 'spacing-token', 'sgs' );
	const bad = instrumentFinding( { db: u, ...slice, cache: null } );
	assert.equal( classify( { class: 'W-walker', candidate: false }, bad ).class, 'W-walker' );
	assert.equal( classify( { class: 'CLIENT', candidate: false }, bad ).class, 'CLIENT' );
	assert.equal( classify( { class: UNASSESSED, candidate: false }, bad ).class, 'I-unrouted' );
	assert.equal( classify( { class: UNASSESSED, candidate: false }, null ).class, UNASSESSED );
} );

test( 'MUST FAIL: a stale block classes every row, a measuring artefact included, as I-stale; fresh and stale differ', () => {
	const fresh = { dbRefreshedAt: '2026-10-22T10:00:00Z', blockCommittedAt: '2026-10-21T10:00:00Z', blockChanges: [] };
	const d = db();
	assert.equal( staleCheck( fresh ).pass, true );
	const old = staleCheck( { ...fresh, dbRefreshedAt: '2026-10-20T00:00:00Z' } );
	const dirty = staleCheck( { ...fresh, blockChanges: [ ' M a.php' ] } );
	assert.deepEqual( [ old.pass, old.class, dirty.pass, staleCheck( null ).pass, staleCheck( { ...fresh, blockChanges: null } ).pass ], [ false, 'I-stale', false, false, false ] );
	const staleFinding = instrumentFinding( { db: d, ...slice, cache: {}, stale: old } );
	assert.equal( classify( { class: 'W-walker', candidate: false }, staleFinding ).class, 'I-stale' );
	assert.equal( classify( F, instrumentFinding( { db: d, ...slice, cache: {}, stale: staleCheck( fresh ) } ) ).class, 'F-setting' );
} );

test( 'MUST FAIL: an overriddenBy verdict stands only while the rendered box agrees; an unmeasured box fails it', () => {
	const d = db();
	add( d, 'sgs/container', 'maxWidth', 'max-width', null, 'spacing-token', 'sgs' );
	const cache = { settings: { maxWidth: { overriddenBy: 'sgs/other' } } };
	const unmeasured = classify( F, instrumentFinding( { db: d, ...slice, cache } ) );
	assert.deepEqual( [ unmeasured.class, unmeasured.attribute ], [ 'I-calibration', 'maxWidth' ] );
	assert.equal( classify( F, instrumentFinding( { db: d, ...slice, cache, boxAgrees: false } ) ).class, 'I-calibration' );
	assert.equal( classify( F, instrumentFinding( { db: d, ...slice, cache, boxAgrees: true } ) ).class, 'F-setting' );
} );
