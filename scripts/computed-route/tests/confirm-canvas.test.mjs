// Grouping the canvas-settable claims into the unit the claim is actually made in
// (confirm-canvas.mjs::familiesFrom). 168 rows collapse to 63 families of (cited block, cited setting, row
// property); row is the wrong axis, and so is surface, because a family spans surfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { familiesFrom } from '../confirm-canvas.mjs';
import { reachabilityVerified, reachesElement } from '../lib/triage.mjs';

const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cc-fam-' ) );
const write = ( surface, rows ) => fs.writeFileSync( path.join( dir, `${ surface }.json` ), JSON.stringify( { rows } ) );
const row = ( key, property, ev ) => ( { key, property, decidedBy: 'canvas-settable', evidence: [ { check: 'resolver', gap: 'no-setting' }, { check: 'canvas-settable', ...ev } ] } );

// Two surfaces, so a family that spans them must still be ONE family.
write( 'footer', [
	row( 'cr-ref-footer-6|.a|style|padding-top', 'padding-top', { ref: 'cr-ref-footer-2', block: 'sgs/container', setting: 'gridItemPadding', property: 'padding', via: 'declared', where: 'sibling' } ),
	row( 'cr-ref-footer-7|.b|style|padding-top', 'padding-top', { ref: 'cr-ref-footer-2', block: 'sgs/container', setting: 'gridItemPadding', property: 'padding', via: 'declared', where: 'sibling' } ),
	// Same block and property, DIFFERENT setting: a separate family.
	row( 'cr-ref-footer-8|.c|style|padding-top', 'padding-top', { ref: 'cr-ref-footer-2', block: 'sgs/container', setting: 'contentBandPadding', property: 'padding', via: 'declared', where: 'ancestor' } ),
	// A resolver-hop citation: no `where` key at all.
	row( 'cr-ref-footer-9|.d|style|width', 'width', { ref: 'cr-ref-footer-3', block: 'sgs/container', setting: 'contentWidth', property: 'width', via: 'declared' } ),
] );
write( 'shop', [
	row( 'cr-ref-shop-1|.a|style|padding-top', 'padding-top', { ref: 'cr-ref-shop-5', block: 'sgs/container', setting: 'gridItemPadding', property: 'padding', via: 'declared', where: 'sibling' } ),
] );
// A row that is NOT canvas-settable must never be grouped.
fs.writeFileSync( path.join( dir, 'about.json' ), JSON.stringify( { rows: [ { key: 'x|.y|style|color', property: 'color', decidedBy: 'no-setting', evidence: [ { check: 'resolver', gap: 'no-setting' } ] } ] } ) );

test( 'MUST FAIL: claims group by (cited block, cited setting, row property), across surfaces, and nothing else is grouped', () => {
	const fams = familiesFrom( dir );
	assert.equal( fams.length, 3, 'three distinct families' );
	const grid = fams.find( ( f ) => 'gridItemPadding' === f.setting );
	// Red on revert: grouping by row would give 3 here, and grouping by surface would split this family in two.
	assert.equal( grid.claims, 3, 'the same family on two surfaces stays one family with three claims' );
	assert.deepEqual( grid.surfaces, [ 'footer', 'shop' ], 'both surfaces are recorded' );
	assert.equal( grid.keys.length, 3 );
	assert.deepEqual( grid.citedRefs, [ 'cr-ref-footer-2', 'cr-ref-shop-5' ], 'the cited ref per surface is kept' );
	// Not over-grouping: a different setting on the same block and property is its own family.
	assert.ok( fams.find( ( f ) => 'contentBandPadding' === f.setting ), 'a different setting is a separate family' );
	assert.equal( fams.find( ( f ) => 'contentBandPadding' === f.setting ).claims, 1 );
	// A row that was not decided by canvas-settable is not a claim at all.
	assert.equal( fams.reduce( ( a, f ) => a + f.claims, 0 ), 5, 'only the five canvas-settable rows are counted' );
	// Families come back most-claims-first, so the biggest population is confirmed first.
	assert.deepEqual( fams.map( ( f ) => f.claims ), [ ...fams.map( ( f ) => f.claims ) ].sort( ( a, b ) => b - a ) );
} );

test( 'MUST FAIL: the two citation mechanisms stay distinguishable', () => {
	const fams = familiesFrom( dir );
	// A canvas-roster citation records where it came from; a resolver-hop citation has no `where` key and must
	// be labelled, not silently merged with the roster ones: a defect in one gate says nothing about the other.
	assert.deepEqual( fams.find( ( f ) => 'gridItemPadding' === f.setting ).where, [ 'sibling' ] );
	assert.deepEqual( fams.find( ( f ) => 'contentBandPadding' === f.setting ).where, [ 'ancestor' ] );
	assert.deepEqual( fams.find( ( f ) => 'contentWidth' === f.setting ).where, [ 'resolver-cite' ] );
} );

// --- The reachability gate says whether it actually tested the citation ---------------------------------
// lib/triage.mjs::reachesElement FAILS OPEN: when emissionOf cannot determine the cited setting's emission it
// returns true, so the citation is accepted untested and the row reads W (explained, not a framework gap).
// Measured 2026-10-06: emissionOf returned null for 17 of 17 citations a live read then refuted, so the gate was
// asserting reachability rather than testing it. R-47-12 requires the citation be tested before the row is
// called resolved, so the evidence must now say which citations were actually assessed.
const issueFor = ( key ) => ( { key, rows: [ { key, ref: 'r1', path: '.sgs-social-icons__item', owners: [] } ] } );

test( 'MUST FAIL: a citation the gate could not assess is marked unverified, and one it could is not', () => {
	const cite = { block: 'sgs/container', ref: 'c1', setting: 'gridItemPadding', property: 'padding' };
	// No emissionFor and no helpers: exactly what every real caller supplies, so emissionOf cannot resolve.
	assert.equal( reachabilityVerified( cite, issueFor( 'a|.x|style|padding-top' ), {} ), false,
		'with no emission channel the citation is NOT verified' );
	// Red on revert: returning true unconditionally fails this, because an unassessed claim would read assessed.
	// Not over-suppressing: a citation the named channel CAN resolve must come back verified, so this does not
	// mark every citation unverified and make the flag meaningless.
	const named = { emissionFor: () => [ '.sgs-container__inner > *' ] };
	assert.equal( reachabilityVerified( cite, issueFor( 'a|.x|style|padding-top' ), named ), true,
		'a citation with a named emission IS verified' );
	// And the gate itself still accepts a reachable one, so adding the flag changed no classification.
	assert.equal( reachesElement( cite, issueFor( 'a|.x|style|padding-top' ), {} ), true,
		'the fail-open branch is unchanged: no row is reclassified by this' );
} );

test( 'MUST FAIL: a named emission that cannot match the row is still refused', () => {
	const cite = { block: 'sgs/container', ref: 'c1', setting: 'gridItemPadding', property: 'padding' };
	// The emission targets the container's own inner wrapper; the row is a social-icons item three levels down.
	const ctx = { emissionFor: () => [ '.sgs-container__inner' ], nodeFor: () => ( { name: 'sgs/social-icons' } ) };
	assert.equal( reachesElement( cite, issueFor( 'a|.sgs-social-icons__item|style|padding-top' ), ctx ), false,
		'an emission naming no class of the row must NOT be credited as reaching it' );
} );

// --- Candidates mode: every block canvasSettable could cite, not only the one it cites now ------------------
// After a refutation canvasSettable cites the NEXT block declaring the property, unmeasured, so the gate fails open
// again. candidatesFrom asks canvasSettable with a recorder that answers false, so it walks every candidate.
import { candidatesFrom } from '../confirm-canvas.mjs';
import { canvasSettable } from '../lib/triage.mjs';

const ccDir = fs.mkdtempSync( path.join( os.tmpdir(), 'cc-cand-' ) );
fs.writeFileSync( path.join( ccDir, 'mega.json' ), JSON.stringify( { verdicts: [] } ) );
const ccRow = { ref: 'cr-ref-mega-1', path: '.sgs-heading', kind: 'style', key: 'padding-top', state: 'opening', live: '4px', draft: '8px', owners: [] };
const ccReport = { classes: { hardcode: [ ccRow ] } };
const ccCtx = ( measuredReach ) => ( {
	canvas: true, stateMap: { opening: null }, measuredReach,
	nodeFor: ( ref ) => ( { 'cr-ref-mega-1': { name: 'sgs/heading' }, 'cr-ref-mega-2': { name: 'sgs/a' }, 'cr-ref-mega-3': { name: 'sgs/b' } }[ ref ] || null ),
	canvasBlocks: () => [ { ref: 'cr-ref-mega-1', name: 'sgs/heading' }, { ref: 'cr-ref-mega-2', name: 'sgs/a' }, { ref: 'cr-ref-mega-3', name: 'sgs/b' } ],
	attrRows: ( b ) => ( { 'sgs/a': [ { attr_name: 'aPad', css_property: 'padding', css_state: null } ], 'sgs/b': [ { attr_name: 'bPad', css_property: 'padding', css_state: null } ] }[ b ] || [] ),
} );
const ccContext = ( reach ) => ( _surface, recorder ) => ( { report: ccReport, walkReport: { runs: [] }, ctx: ccCtx( reach || recorder ), close: () => {} } );

test( 'MUST FAIL: candidates mode yields EVERY declaring block, and the current-citation path yields only the first', () => {
	const fams = candidatesFrom( { triageDir: ccDir, manifest: { mega: { canvas: true } }, contextFor: ccContext() } );
	assert.deepEqual( fams.map( ( f ) => f.block ).sort(), [ 'sgs/a', 'sgs/b' ], 'both siblings declaring padding are candidates' );
	const b = fams.find( ( f ) => 'sgs/b' === f.block );
	assert.equal( b.property, 'padding-top' );
	assert.deepEqual( b.citedRefs, [ 'cr-ref-mega-3' ] );
	assert.deepEqual( b.where, [ 'sibling' ] );
	// Negative control: the old behaviour (nothing measured, every lookup undefined) cites sgs/a and stops, so sgs/b
	// is never measured. That is the gap the recorder closes.
	const issue = { key: 'k', rows: [ ccRow ] };
	assert.equal( canvasSettable( issue, ccCtx( () => undefined ) ).block, 'sgs/a' );
	// A refutation of sgs/a moves the citation to sgs/b: the family candidates mode measured in advance.
	assert.equal( canvasSettable( issue, ccCtx( ( blk ) => ( 'sgs/a' === blk ? false : undefined ) ) ).block, 'sgs/b' );
} );

test( 'MUST FAIL: a non-canvas surface contributes no candidates', () => {
	const fams = candidatesFrom( { triageDir: ccDir, manifest: { mega: { canvas: false } }, contextFor: ccContext() } );
	assert.equal( fams.length, 0 );
} );

test( 'MUST FAIL: a family is keyed and measured on the CSS property the row stands for, not the walker key', () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'cc-prop-' ) );
	fs.writeFileSync( path.join( d, 'header.json' ), JSON.stringify( { verdicts: [
		{ key: 'cr-ref-header-4||style|painted-ground', property: 'painted-ground', decidedBy: 'canvas-settable', evidence: [ { check: 'canvas-settable', ref: 'cr-ref-header-1', block: 'sgs/site-header', setting: 'bg', property: 'background-color', where: 'ancestor' } ] },
	] } ) );
	// Red on revert: the raw walker key would make measuredReachFrom's background-color lookup miss, and the live
	// read would ask the stylesheet for a property named painted-ground.
	assert.equal( familiesFrom( d )[ 0 ].property, 'background-color' );
} );
