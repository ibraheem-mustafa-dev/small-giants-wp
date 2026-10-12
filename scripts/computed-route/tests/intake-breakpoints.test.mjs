// Spec 48 FR-48-27 (two breakpoint width bases), lib/intake-breakpoints.mjs: the window basis and the root basis are
// read from the code that writes the width; every threshold carries its operator and basis, a reversed comparison
// normalised; a draft whose basis cannot be read, and a threshold that is not a static number, are gap rows (R-48-3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readBreakpoints } from '../lib/intake-breakpoints.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-routing', name );
const SITES = path.resolve( HERE, '../../../sites' );
const one = ( name, draft ) => readBreakpoints( { folder: FIX( name ) } ).find( ( d ) => d.draft === draft );
const brief = ( d ) => d.thresholds.map( ( t ) => `${ t.operator } ${ t.value } ${ t.basis }` );

test( 'MUST FAIL: window basis from state.w = window.innerWidth; a reversed comparison is normalised', () => {
	const d = one( 'hash', 'Site.dc.html' );
	assert.equal( d.basis, 'window' );
	assert.ok( d.evidence.some( ( e ) => e.includes( 'window.innerWidth → window' ) ) );
	assert.deepEqual( brief( d ), [ '< 768 window', '< 1024 window', '>= 1260 window' ], '1024 > w reads as w < 1024' );
	assert.equal( d.thresholds[ 1 ].expression, '1024 > w' );
	assert.match( d.thresholds[ 0 ].location, /^Site\.dc\.html:\d+$/ );
	assert.deepEqual( d.gaps, [] );
} );

test( 'window basis from a local width variable (const w = window.innerWidth) with no state key', () => {
	const d = one( 'files', 'Home.dc.html' );
	assert.equal( d.basis, 'window' );
	assert.deepEqual( brief( d ), [ '< 768 window', '< 1024 window' ] );
} );

test( 'MUST FAIL: root basis from the root ref ResizeObserver contentRect, ahead of the window fallbacks', () => {
	const d = one( 'state-page', 'Shop.dc.html' );
	assert.equal( d.basis, 'root' );
	assert.ok( d.evidence[ 0 ].includes( 'cr.width → root' ), d.evidence[ 0 ] );
	assert.deepEqual( brief( d ), [ '< 768 root', '>= 1280 root', '< 620 root' ], 'aliases S.w and effW, and 620 > effW reversed' );
	assert.deepEqual( d.gaps, [] );
} );

test( 'MUST FAIL: an unreadable basis and a non-static threshold are gap rows', () => {
	const d = one( 'bp-unreadable', 'Panel.dc.html' );
	assert.equal( d.basis, null );
	assert.ok( d.gaps.some( ( g ) => g.error.includes( 'state.w is written from a width read whose basis cannot be determined' ) ) );
	assert.ok( d.gaps.some( ( g ) => g.error.includes( 'compares window.innerWidth with limit, not a static number' ) ) );
	assert.ok( d.gaps.some( ( g ) => d.draft === g.draftId && g.error.includes( 'basis cannot be determined' ) ) );
	assert.ok( d.gaps.every( ( g ) => g.construct && g.draftId && g.error ) );
} );

test( 'a draft that reads no width has basis null and no gap', () => {
	const d = one( 'files', 'About.dc.html' );
	assert.deepEqual( [ d.basis, d.thresholds, d.gaps ], [ null, [], [] ] );
} );

const real = ( slug ) => path.join( SITES, slug, 'handoff' );
test( 'real exports: bases and thresholds', { skip: ! fs.existsSync( real( 'indus-foods' ) ) && 'no client exports in this checkout' }, () => {
	const a = readBreakpoints( { folder: real( 'indus-foods' ) } );
	const main = a.find( ( d ) => d.draft.startsWith( 'Indus' ) );
	assert.equal( main.basis, 'window' );
	assert.deepEqual( brief( main ), [ '< 768 window', '< 1024 window', '< 1200 window', '>= 1260 window' ] );
	for ( const form of [ 'TradeApplication.dc.html', 'EnquiryForm.dc.html' ] ) {
		const f = a.find( ( d ) => d.draft === form );
		assert.equal( f.basis, 'window' );
		assert.deepEqual( [ ...new Set( f.thresholds.map( ( t ) => t.value ) ) ].sort(), [ 1024, 768 ].sort() );
	}
	const b = readBreakpoints( { folder: real( 'mamas-munches-redesign' ) } );
	assert.ok( b.filter( ( d ) => d.thresholds.length ).every( ( d ) => 'window' === d.basis ) );
	const c = readBreakpoints( { folder: real( 'eye-care-ward-end' ) } ).find( ( d ) => d.thresholds.length );
	assert.equal( c.basis, 'root' );
	assert.ok( [ 768, 1024, 1060, 1280 ].every( ( v ) => c.thresholds.some( ( t ) => t.value === v ) ) );
	assert.ok( [ ...a, ...b ].every( ( d ) => ! d.gaps.length ) );
} );
