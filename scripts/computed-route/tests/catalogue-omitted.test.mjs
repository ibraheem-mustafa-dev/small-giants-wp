// Spec 48 FR-48-92, Bean's ruling 2026-11-21: a choice the product page offers that the draft's basket line forgets to
// send (lib/catalogue-omitted.mjs) is a variation axis of every product whose record holds its options, and the omission
// is a draft defect. The export (tests/fixtures/catalogue/omitted/Store.dc.html) keeps tones as a list of keys on each
// record that the page decorates into named swatches (`tones: keys.map(...)`), finishes as the record's own list of
// named objects, and has a view picker over a fixed list and a shot picker over images. Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { catalogueProblems } from '../lib/intake-catalogue-run.mjs';
import { catalogueDefects, validateDraftDefects } from '../lib/draft-defects.mjs';
import { draftDefectsFile } from '../lib/draft-defects-file.mjs';

const ROWS = [ { route: 'shop', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'product', slug: 'product', postType: 'product', collection: 'live' } ];
const read = ( edit ) => readCatalogue( { repo: repoWith( 'omitted', edit ), client: 'demo', rows: ROWS } ).catalogue;
const edited = ( from, to ) => ( dir ) => {
	const f = path.join( dir, 'Store.dc.html' );
	const text = fs.readFileSync( f, 'utf8' );
	assert.ok( text.includes( from ), `fixture holds ${ from }` );
	fs.writeFileSync( f, text.replace( from, to ) );
};
const byId = ( cat, id ) => cat.products.find( ( p ) => p.draftId === id );
const attr = ( cat, id, key ) => byId( cat, id ).attributes.find( ( a ) => a.key === key );
const omissions = ( cat ) => cat.gaps.filter( ( g ) => 'draft-omission' === g.kind );

test( 'MUST FAIL: a key the product page\'s picker writes over the product\'s own list, which the basket line never reads, is an axis with the list\'s names and swatches', () => {
	const cat = read();
	const tone = attr( cat, '1', 'curTone' );
	assert.deepEqual( [ tone.label, tone.slug, tone.packSize, tone.variesBy, tone.default ], [ 'Shade', 'shade', false, null, 'Ink' ] );
	assert.deepEqual( tone.options.map( ( o ) => [ o.value, o.term, o.swatch, o.price ] ), [ [ 'Ink', 'Ink', '#101820', null ], [ 'Sand', 'Sand', '#d8c3a5', null ], [ 'Moss', 'Moss', '#4a5d23', null ] ] );
	assert.deepEqual( byId( cat, '1' ).attributes.map( ( a ) => a.key ), [ 'curSize', 'curTone', 'curFinish' ], 'the line\'s own choice first, the inferred ones after' );
	assert.equal( byId( cat, '1' ).variations.length, 3 * 3 * 2 );
	assert.deepEqual( byId( cat, '1' ).variations[ 0 ].options, { size: 'S', shade: 'Ink', finish: 'Matt' } );
	// Each product gets the options its own record holds; a record with one option has no axis.
	assert.deepEqual( attr( cat, '3', 'curTone' ).options.map( ( o ) => o.term ), [ 'Rust', 'Ink' ] );
	assert.equal( attr( cat, '2', 'curTone' ), undefined );
	assert.deepEqual( byId( cat, '2' ).attributes.map( ( a ) => a.key ), [ 'curSize' ] );
	assert.deepEqual( catalogueProblems( cat ), [] );
} );

test( 'MUST FAIL: the record\'s own list of named objects is an axis too, its name the option and its hex the swatch', () => {
	const cat = read();
	assert.deepEqual( attr( cat, '1', 'curFinish' ).options.map( ( o ) => [ o.term, o.swatch ] ), [ [ 'Matt', '#222222' ], [ 'Gloss', '#eeeeee' ] ] );
	assert.deepEqual( attr( cat, '3', 'curFinish' ).options.map( ( o ) => [ o.term, o.swatch ] ), [ [ 'Waxed', '#554433' ], [ 'Plain', '#999999' ] ] );
	assert.equal( attr( cat, '2', 'curFinish' ), undefined );
} );

test( 'MUST FAIL: each omitted key is one gap row and one draft-defect entry saying the basket line leaves it out', () => {
	const cat = read();
	const rows = omissions( cat );
	assert.deepEqual( rows.map( ( g ) => [ g.draftId, g.defect.id ] ), [ [ '*', 'defect:Store:basket-line:curTone' ], [ '*', 'defect:Store:basket-line:curFinish' ] ] );
	assert.match( rows[ 0 ].detail, /Shade picker writes state key "curTone" over each product's own list "tones".*basket line does not read it.*on 2 products/ );
	assert.match( rows[ 0 ].defect.renders, /basket line \(in Store\.dc\.html\) never reads "curTone"/ );
	const defects = catalogueDefects( cat, { date: '2026-11-21' } );
	assert.deepEqual( defects.map( ( d ) => [ d.id, d.draftId, d.construct, d.test, d.owner, d.widths, d.listedOn, d.sentOn ] ), [
		[ 'defect:Store:basket-line:curTone', 'Store:basket-line:curTone', 'basket line', 'omitted-choice', 'Claude Design', [], '2026-11-21', null ],
		[ 'defect:Store:basket-line:curFinish', 'Store:basket-line:curFinish', 'basket line', 'omitted-choice', 'Claude Design', [], '2026-11-21', null ],
	] );
	assert.deepEqual( validateDraftDefects( defects ), [] );
	assert.deepEqual( catalogueDefects( { gaps: [ { draftId: '*', kind: 'facet', detail: 'x' } ] } ), [] );
	assert.deepEqual( catalogueDefects( { gaps: [ { draftId: '*', kind: 'facet', detail: 'x', defect: { id: 'defect:x', construct: 'c', declares: 'd', renders: 'r' } } ] } ), [], 'only a draft-omission row is a defect entry' );
} );

test( 'MUST FAIL: the draft-defects file lists the omission with the draft\'s other defects, keeping the dates of an earlier entry', () => {
	const repo = repoWith( 'omitted' );
	const build = path.join( repo, 'sites', 'demo', 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { takenOn: '2026-11-21', draftDefects: [] } ) );
	fs.writeFileSync( path.join( build, 'catalogue.json' ), JSON.stringify( readCatalogue( { repo, client: 'demo', rows: ROWS } ).catalogue ) );
	const first = draftDefectsFile( { client: 'demo', repo, date: '2026-11-20' } );
	assert.deepEqual( first.defects.map( ( d ) => d.id ), [ 'defect:Store:basket-line:curTone', 'defect:Store:basket-line:curFinish' ] );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'qa', 'draft-defects.json' ), JSON.stringify( { ...first, defects: first.defects.map( ( d ) => ( { ...d, sentOn: '2026-11-20' } ) ) } ) );
	const again = draftDefectsFile( { client: 'demo', repo, date: '2026-11-21' } );
	assert.deepEqual( again.defects.map( ( d ) => [ d.listedOn, d.sentOn ] ), [ [ '2026-11-20', '2026-11-20' ], [ '2026-11-20', '2026-11-20' ] ] );
} );

test( 'a picker over a list that is not on the product record stays out: another object\'s list of the same field name, and a fixed list', () => {
	const other = read( edited( '(cur.tones || []).map((t, i)', '(C.PALETTE.tones || []).map((t, i)' ) );
	assert.equal( attr( other, '1', 'curTone' ), undefined );
	assert.deepEqual( omissions( other ).map( ( g ) => g.defect.id ), [ 'defect:Store:basket-line:curFinish' ] );
	const fixed = read( edited( '(cur.tones || []).map((t, i) => ({ name: t.name,', 'Object.keys(C.TONES).map((t, i) => ({ name: C.TONES[t][0],' ) );
	assert.equal( attr( fixed, '1', 'curTone' ), undefined );
	assert.deepEqual( omissions( fixed ).map( ( g ) => g.defect.id ), [ 'defect:Store:basket-line:curFinish' ] );
	// A list the page decorates but builds from nothing the record holds (a fixed list under the record's field name).
	const flat = read( edited( 'tones: keys.map((k, i) =>', "tones: ['ink', 'sand'].map((k, i) =>" ) );
	assert.equal( attr( flat, '1', 'curTone' ), undefined );
	assert.deepEqual( omissions( flat ).map( ( g ) => g.defect.id ), [ 'defect:Store:basket-line:curFinish' ] );
	// A list whose names collapse to one option offers no choice.
	const twin = read( edited( "{ id: 2, name: 'Fold Beanie', price: 20, tones: ['moss'],", "{ id: 2, name: 'Fold Beanie', price: 20, tones: ['moss'], finishes: [{ name: 'Matt', hex: '#111111' }, { name: 'Matt', hex: '#222222' }]," ) );
	assert.equal( attr( twin, '2', 'curFinish' ), undefined );
} );

test( 'a view picker over a fixed list and a shot picker over a record\'s images (no name) are no axis and no defect', () => {
	const cat = read();
	for ( const p of cat.products ) {
		assert.ok( ! p.attributes.some( ( a ) => [ 'curView', 'curShot' ].includes( a.key ) ), `${ p.draftId } has no view or shot axis` );
	}
	assert.ok( ! omissions( cat ).some( ( g ) => /curView|curShot/.test( g.detail ) ) );
	// Naming the shots makes them a list of named choices: the rule is the name, not the field.
	const named = read( edited( 'shots: [\'front.jpg\', \'side.jpg\'] },\n    { id: 2', 'shots: [{ name: \'Front\' }, { name: \'Side\' }] },\n    { id: 2' ) );
	assert.deepEqual( attr( named, '1', 'curShot' )?.options.map( ( o ) => o.term ), [ 'Front', 'Side' ] );
} );

test( 'a key the basket line reads keeps the line\'s own path: no omission row, no second axis', () => {
	const cat = read( edited( 'const item = { pid: p.id, size: this.state.curSize };', 'const item = { pid: p.id, size: this.state.curSize, tone: this.state.curTone };' ) );
	assert.deepEqual( omissions( cat ).map( ( g ) => g.defect.id ), [ 'defect:Store:basket-line:curFinish' ] );
	assert.equal( byId( cat, '1' ).attributes.filter( ( a ) => 'curTone' === a.key ).length, 1 );
	// The line path names the choice by its list's binding and reads its options from the setter's own lists, so neither
	// the record's own names (Ink, Sand, Moss) nor the heading (Shade) comes from the omitted-choice rule.
	assert.equal( attr( cat, '1', 'curTone' ).label, 'Tone tile' );
	assert.ok( ! attr( cat, '1', 'curTone' ).options.some( ( o ) => [ 'Ink', 'Sand', 'Moss' ].includes( o.term ) ) );
} );

test( 'a draft with no basket line has nothing to omit from; the label falls back to the list\'s binding when no heading precedes it', () => {
	const none = read( edited( 'const item = { pid: p.id, size: this.state.curSize };', 'const item = { size: this.state.curSize };' ) );
	assert.equal( omissions( none ).length, 0 );
	const bare = read( edited( '<div><span>Shade</span><span>{{ cur.toneName }}</span></div>\n  <sc-for list="{{ toneTiles }}"', '<sc-for list="{{ toneTiles }}"' ) );
	assert.equal( attr( bare, '1', 'curTone' ).label, 'Tone tile' );
	// A heading another axis already uses is that axis, never a second one of the same slug.
	const same = read( edited( '<span>Shade</span>', '<span>Size</span>' ) );
	assert.deepEqual( byId( same, '1' ).attributes.map( ( a ) => a.key ), [ 'curSize', 'curFinish' ] );
	assert.deepEqual( omissions( same ).map( ( g ) => g.defect.id ), [ 'defect:Store:basket-line:curFinish' ] );
} );

test( 'the axis default is the option the first state value picks (an index into the list)', () => {
	const cat = read( edited( 'curTone: 0, curFinish: 0', 'curTone: 1, curFinish: 0' ) );
	assert.equal( attr( cat, '1', 'curTone' ).default, 'Sand' );
	assert.equal( attr( cat, '1', 'curFinish' ).default, 'Matt' );
} );
