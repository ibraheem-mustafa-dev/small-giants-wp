// Register D3 / ruling S6: `unassessed` is FR-48-65's class for a walker row with no Fill row, and only after its measuring
// artefacts are moved out to W-walker: a box row (a consequence of the layout rows around it, or box-unexplained), a motion
// technique difference, and a box width or height that repeats a width or height row (dropped). A row with no Fill row is
// never explained by a failed write: G3 and G4 do not read it, G0's freshness still does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { surfaceRows, refParents } from '../lib/census-mechanism.mjs';
import { classifyRows, classCounts, baseClass } from '../lib/census-gap-class.mjs';
import { mapUnassessedArtefact, UNASSESSED, UNASSESSED_ARTEFACTS } from '../lib/gap-classes.mjs';
import { boxDuplicates, walkerArtefacts, isTechniqueRow } from '../lib/census-unassessed.mjs';

const lookup = ( slug ) => ( slug ? { slug, parent_block: null } : null );
const diff = ( ref, kind, key, draft, live, extra = {} ) => ( { kind, key, draft, live, ref, path: '', block: 'sgs-box', ...extra } );
const report = ( diffs, widths = [ 1440 ] ) => ( { runs: widths.map( ( width ) => ( { state: 'rest', width, pairs: { p: { diffs } } } ) ) } );
const node = ( n, inner = [] ) => ( { name: 'sgs/container', attributes: { className: `cr-ref-s-${ n }` }, innerBlocks: inner } );
const census = ( diffs, tree = [], widths = [ 1440 ] ) => surfaceRows( { client: 'c', surface: 's', report: report( diffs, widths ), run: { unmapped: [], held: [], writes: [], confirm: [], tree }, lookup } );
const classOf = ( rows, kind, key, ref = 'cr-ref-s-1' ) => {
	const r = rows.find( ( x ) => x.kind === kind && x.key === key && x.element.startsWith( ref ) );
	return r && [ r.walkerArtefact ?? null, baseClass( r ).class ];
};

test( 'MUST FAIL: a box row beside a layout row of its own element is a W-walker consequence, one nothing explains is box-unexplained', () => {
	const { rows } = census( [ diff( 'cr-ref-s-1', 'box', 'h', 120, 80 ), diff( 'cr-ref-s-1', 'style', 'padding-top', '24px', '0px' ), diff( 'cr-ref-s-2', 'box', 'h', 50, 40 ) ] );
	assert.deepEqual( classOf( rows, 'box', 'h' ), [ 'consequence', 'W-walker' ] );
	assert.equal( rows.find( ( r ) => 'h' === r.key && r.element.startsWith( 'cr-ref-s-1' ) ).walkerBy, 'cr-ref-s-1 style:padding-top' );
	assert.deepEqual( classOf( rows, 'box', 'h', 'cr-ref-s-2' ), [ 'box-unexplained', 'W-walker' ] );
	assert.deepEqual( classOf( rows, 'style', 'padding-top' ), [ null, UNASSESSED ], 'the layout row itself stays unassessed' );
} );

test( 'MUST FAIL: a box row follows a layout row of an ancestor (its position) or a descendant (its size), not of a sibling', () => {
	const tree = [ node( 1, [ node( 2 ), node( 3 ) ] ) ];
	const up = census( [ diff( 'cr-ref-s-2', 'box', 'y', 10, 40 ), diff( 'cr-ref-s-1', 'style', 'gap', '8px', '0px' ) ], tree ).rows;
	assert.equal( classOf( up, 'box', 'y', 'cr-ref-s-2' )[ 0 ], 'consequence' );
	const down = census( [ diff( 'cr-ref-s-1', 'box', 'h', 100, 60 ), diff( 'cr-ref-s-2', 'style', 'padding-top', '8px', '0px' ) ], tree ).rows;
	assert.equal( classOf( down, 'box', 'h', 'cr-ref-s-1' )[ 0 ], 'consequence' );
	const side = census( [ diff( 'cr-ref-s-2', 'box', 'h', 100, 60 ), diff( 'cr-ref-s-3', 'style', 'padding-top', '8px', '0px' ) ], tree ).rows;
	assert.equal( classOf( side, 'box', 'h', 'cr-ref-s-2' )[ 0 ], 'box-unexplained', 'control: a sibling explains nothing' );
	const apart = surfaceRows( { client: 'c', surface: 's', lookup, run: { unmapped: [], held: [], writes: [], confirm: [], tree: [] }, report: { runs: [
		{ state: 'rest', width: 375, pairs: { p: { diffs: [ diff( 'cr-ref-s-1', 'box', 'h', 120, 80 ) ] } } }, { state: 'rest', width: 1440, pairs: { p: { diffs: [ diff( 'cr-ref-s-1', 'style', 'padding-top', '24px', '0px' ) ] } } } ] } } ).rows;
	assert.equal( classOf( apart, 'box', 'h' )[ 0 ], 'box-unexplained', 'control: a layout row at another width explains nothing' );
	assert.deepEqual( [ ...refParents( tree ) ], [ [ 'cr-ref-s-2', 'cr-ref-s-1' ], [ 'cr-ref-s-3', 'cr-ref-s-1' ] ] );
} );

test( 'MUST FAIL: a box width that repeats the same element\'s width row is dropped and counted; a box width the width row does not match stays', () => {
	const same = census( [ diff( 'cr-ref-s-1', 'box', 'w', 497, 474 ), diff( 'cr-ref-s-1', 'style', 'width', '496.562px', '473.703px' ) ] );
	assert.deepEqual( same.rows.map( ( r ) => `${ r.kind }:${ r.key }` ), [ 'style:width' ] );
	assert.equal( same.dropped, 1 );
	const other = census( [ diff( 'cr-ref-s-1', 'box', 'w', 497, 400 ), diff( 'cr-ref-s-1', 'style', 'width', '496.562px', '473.703px' ) ] );
	assert.deepEqual( other.rows.map( ( r ) => `${ r.kind }:${ r.key }` ).sort(), [ 'box:w', 'style:width' ] );
	const none = census( [ diff( 'cr-ref-s-1', 'box', 'w', 497, 474 ), diff( 'cr-ref-s-2', 'style', 'width', '496.562px', '473.703px' ) ] );
	assert.equal( none.rows.length, 2, 'control: another element\'s width row repeats nothing' );
	const height = census( [ diff( 'cr-ref-s-1', 'box', 'h', 120, 80 ), diff( 'cr-ref-s-1', 'style', 'height', '120px', '80px' ) ] );
	assert.deepEqual( height.rows.map( ( r ) => r.key ), [ 'height' ] );
	const draftApart = census( [ diff( 'cr-ref-s-1', 'box', 'w', 497, 474 ), diff( 'cr-ref-s-1', 'style', 'width', '300px', '473.703px' ) ] );
	assert.equal( draftApart.rows.length, 2, 'control: a width row with another draft value repeats nothing' );
	assert.equal( boxDuplicates( same.rows ).size, 0, 'the kept rows hold no more twins' );
} );

test( 'MUST FAIL: a transition, animation or keyframes difference with no Fill row is a W-walker technique; a painted motion result stays unassessed', () => {
	const { rows } = census( [
		diff( 'cr-ref-s-1', 'motion', 'transition', 'none', 'color 0.3s' ), diff( 'cr-ref-s-1', 'motion', 'animation', '0.6s ease', '0s' ), diff( 'cr-ref-s-1', 'motion', 'keyframes', '0%{opacity:0}', 'none' ),
		diff( 'cr-ref-s-1', 'style', 'transition-duration', '0s', '0.25s' ), diff( 'cr-ref-s-1', 'style', 'transition-timing-function', 'ease', 'linear' ), diff( 'cr-ref-s-1', 'motion', 'running-after-action', '1', '0' ),
	] );
	assert.deepEqual( rows.map( ( r ) => r.walkerArtefact ?? null ), [ 'technique', 'technique', 'technique', 'technique', 'technique', null ] );
	assert.deepEqual( rows.map( ( r ) => baseClass( r ).class ), [ 'W-walker', 'W-walker', 'W-walker', 'W-walker', 'W-walker', UNASSESSED ] );
	assert.equal( isTechniqueRow( { kind: 'style', key: 'transform' } ), false );
} );

test( 'negative control: a row a Fill row covers keeps the Fill row\'s class, and a plain style row stays unassessed', () => {
	const { rows } = census( [ diff( 'cr-ref-s-1', 'style', 'color', 'red', 'blue' ), diff( 'cr-ref-s-1', 'box', 'h', 100, 60 ) ] );
	const covered = rows.map( ( r ) => ( 'h' === r.key ? { ...r, fillClass: 'W-route', side: 'both' } : r ) );
	const found = walkerArtefacts( covered );
	assert.equal( found.size, 0 );
	assert.deepEqual( covered.map( ( r ) => baseClass( { ...r, walkerArtefact: undefined } ).class ), [ UNASSESSED, 'W-route' ] );
} );

test( 'MUST FAIL: the artefact reasons are the listed three; any other throws', () => {
	assert.deepEqual( UNASSESSED_ARTEFACTS, [ 'consequence', 'box-unexplained', 'technique' ] );
	assert.deepEqual( mapUnassessedArtefact( 'technique' ), { class: 'W-walker', candidate: false, owner: 'Spec 48 §3.6', reason: 'technique' } );
	assert.throws( () => mapUnassessedArtefact( 'mispaired' ), /not a walker artefact of an unassessed row/ );
} );

const gateDb = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		CREATE TABLE blocks ( slug TEXT, parent_block TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' );
		INSERT INTO blocks VALUES ( 'sgs/container', NULL );
		INSERT INTO block_attributes VALUES ( 'sgs/container', 'maxWidth', NULL, NULL, 'spacing-token', 'sgs' );` );
	return d;
};
const fresh = () => ( { pass: true, class: null, evidence: 'fresh' } );
const gated = ( rows, freshness = fresh ) => classifyRows( rows, { db: gateDb(), calFor: () => ( {} ), freshness } );
const cr = ( over = {} ) => ( { client: 'c', surface: 's', element: 'cr-ref-s-1', slug: 'sgs/container', kind: 'style', key: 'max-width', state: 'default', fillClass: null, fillCandidate: false, side: 'walker-only', reason: 'no-fill-row', ...over } );

test( 'MUST FAIL: a row with no Fill row on a NULL-routed fitting setting stays unassessed; a row Fill wrote or judged is still gated', () => {
	const out = gated( [ cr(), cr( { reason: 'fill-wrote' } ), cr( { fillClass: 'F-setting', fillCandidate: true, reason: 'no-setting', side: 'both' } ) ] );
	assert.deepEqual( out.map( ( r ) => r.gapClass ), [ UNASSESSED, 'I-unrouted', 'I-unrouted' ] );
	assert.equal( out[ 0 ].gapAttribute, null );
	assert.equal( out[ 1 ].gapAttribute, 'maxWidth' );
	// What G3 found is kept beside the class: an observed I-class setting nobody tried to write, never counted in the classes.
	assert.deepEqual( [ out[ 0 ].gapObserved?.class, out[ 0 ].gapObserved?.attribute, out[ 1 ].gapObserved ], [ 'I-unrouted', 'maxWidth', null ] );
	const counts = classCounts( out.slice( 0, 1 ) );
	assert.deepEqual( [ counts.counts, counts.instrument.length, counts.observed.map( ( o ) => [ o.class, o.block, o.attribute, o.rows ] ) ], [ { [ UNASSESSED ]: 1 }, 0, [ [ 'I-unrouted', 'sgs/container', 'maxWidth', 1 ] ] ] );
	assert.equal( classCounts( [ ...out.slice( 0, 1 ), ...gated( [ cr( { element: 'cr-ref-s-2' } ) ] ) ] ).observed[ 0 ].rows, 2, 'one setting seen on two rows is one observed entry' );
} );

test( 'negative control: G0 still reads a row with no Fill row, so a stale block is I-stale whatever the row is', () => {
	const stale = () => ( { pass: false, class: 'I-stale', evidence: { command: 'git log', line: 'old' } } );
	assert.equal( gated( [ cr() ], stale )[ 0 ].gapClass, 'I-stale' );
	assert.equal( gated( [ cr( { walkerArtefact: 'technique' } ) ], stale )[ 0 ].gapClass, 'I-stale' );
	assert.equal( gated( [ cr( { walkerArtefact: 'technique' } ) ] )[ 0 ].gapClass, 'W-walker' );
	assert.equal( gated( [ cr( { walkerArtefact: 'technique' } ) ] )[ 0 ].gapReason, 'technique' );
} );
