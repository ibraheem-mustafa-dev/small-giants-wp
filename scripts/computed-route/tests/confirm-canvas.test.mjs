// Grouping the canvas-settable claims into the unit the claim is actually made in
// (confirm-canvas.mjs::familiesFrom). 168 rows collapse to 63 families of (cited block, cited setting, row
// property); row is the wrong axis, and so is surface, because a family spans surfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { familiesFrom } from '../confirm-canvas.mjs';

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
