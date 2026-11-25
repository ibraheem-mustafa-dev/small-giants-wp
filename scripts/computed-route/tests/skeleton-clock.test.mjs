// Content the clock decides (Spec 48 FR-48-6, the `openStatus` and `timeText` standing rules, lib/skeleton-clock.mjs): an
// element whose printed value the draft's code computes from the clock is read from that code, never from the words a read
// happened to show. The open or closed line of a draft that compares the clock with the opening hours its code holds is
// sgs/business-info's open-status display whatever its words; text its code picks by the hour is the text block's time-based
// text option with one hour range per branch. Each case reads a committed client draft (Indus's footer status, Mama's hero
// greeting) or a small draft written for the test, with a MUST FAIL case and negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { draftLogicOf } from '../lib/skeleton-narrowing.mjs';
import { clockOfPath, timeTextRanges } from '../lib/skeleton-clock.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const INDUS = { client: 'indus-foods', component: 'Indus Foods Website v2' };
const MAMA = { client: 'mamas-munches-redesign', component: 'Home' };

const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const sourcesOf = ( repo, { client, component } ) => ( { files: { [ `${ component }.dc.html` ]: hashOf( path.join( repo, 'sites', client, 'handoff', `${ component }.dc.html` ) ) } } );
const logicOf = ( repo, who ) => draftLogicOf( { folder: path.join( repo, 'sites', who.client, 'handoff' ), record: { sources: sourcesOf( repo, who ) }, component: who.component } );

// A temp repo holding the client's draft `Root.dc.html` whose logic is `logic`.
function draftRepo( logic ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'clock-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n` );
	return repo;
}
const FIXTURE = { client: 'fixture-client', component: 'Root' };
const LOGIC = ( vals ) => `class Component {
	info() {
		const h = new Date().getHours();
		if ( h < 12 ) {
			return { brand: 'Acme', part: 'am' };
		}
		return { brand: 'Acme', part: 'pm' };
	}
	renderVals() {
		const hr = new Date().getHours();
		const fixed = new Date( 2026, 0, 1 ).getHours();
		return { ${ vals } };
	}
}`;
const VALS = LOGIC( `year: new Date().getFullYear(), fixedGreet: fixed < 12 ? 'morning' : 'evening', hello: 'good morning', zoned: new Date( new Date().toLocaleString( 'en-GB', { timeZone: 'Asia/Karachi' } ) ).getHours() < 12 ? 'subah' : 'shaam', midnight: hr >= 21 ? 'late' : hr < 5 ? 'night' : 'day', inclusive: hr > 20 ? 'late' : hr <= 4 ? 'night' : 'day', flipped: 12 > hr ? 'am' : 'pm', tick: Date.now(), info: this.info()` );

// el( n, parent n, tag, words, { depth, display, hole (the element's text hole), template words } ) in the inventory's shape and
// its fact-record entry, for the component `who.component`.
const box = ( n ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: n * 20, w: 120, h: 20 } ] ) );
test( 'the clock reading of a committed draft: Indus\'s status pill and line compare the clock with the opening hours its code holds; Mama\'s greeting is five hour ranges', () => {
	const indus = logicOf( REPO, INDUS );
	assert.deepEqual( clockOfPath( indus, 'hoursNow.label' ), { openStatus: true, ranges: null, zone: 'Europe/London' } );
	assert.equal( clockOfPath( indus, 'hoursNow.sub' )?.openStatus, true );
	assert.equal( clockOfPath( indus, 'footPhone' ), null, 'an icon value reads no clock' );
	assert.deepEqual( clockOfPath( logicOf( REPO, MAMA ), 'greeting' ), { openStatus: false, zone: '', ranges: [
		{ start: 0, end: 5, text: 'up for a night feed? we see you, mama' },
		{ start: 5, end: 12, text: 'good morning, mama' },
		{ start: 12, end: 17, text: 'good afternoon, mama' },
		{ start: 17, end: 21, text: 'good evening, mama' },
		{ start: 21, end: 24, text: 'up late feeding? we see you, mama' },
	] } );
} );

test( 'a clock read that is no greeting and no open status: a year stamp, a fixed date and a static greeting take neither reading (negative controls)', () => {
	const repo = draftRepo( VALS );
	const d = logicOf( repo, FIXTURE );
	assert.deepEqual( clockOfPath( d, 'year' ), { openStatus: false, ranges: null, zone: '' }, 'time-dependent, but no hour ranges' );
	assert.equal( clockOfPath( d, 'fixedGreet' ), null, 'new Date( args ) is a fixed date, not the clock' );
	assert.equal( clockOfPath( d, 'hello' ), null );
	assert.deepEqual( clockOfPath( d, 'zoned' ), { openStatus: false, zone: 'Asia/Karachi', ranges: [ { start: 0, end: 12, text: 'subah' }, { start: 12, end: 24, text: 'shaam' } ] } );
	assert.deepEqual( clockOfPath( d, 'midnight' ).ranges, [ { start: 0, end: 5, text: 'night' }, { start: 5, end: 21, text: 'day' }, { start: 21, end: 24, text: 'late' } ] );
	assert.deepEqual( clockOfPath( d, 'inclusive' ).ranges, [ { start: 0, end: 5, text: 'night' }, { start: 5, end: 21, text: 'day' }, { start: 21, end: 24, text: 'late' } ], 'hour > 20 and hour <= 4 cut where hour >= 21 and hour < 5 do' );
	assert.deepEqual( clockOfPath( d, 'flipped' ).ranges, [ { start: 0, end: 12, text: 'am' }, { start: 12, end: 24, text: 'pm' } ], 'the number written first' );
	assert.deepEqual( clockOfPath( d, 'tick' ), { openStatus: false, ranges: null, zone: '' }, 'Date.now() reads the clock' );
	assert.deepEqual( clockOfPath( d, 'info.part' ), { openStatus: false, ranges: null, zone: '' }, 'a method reading the clock picks between its returns' );
	assert.equal( clockOfPath( d, 'info.brand' ), null, 'every return of the clock-reading method gives the same value' );
} );
