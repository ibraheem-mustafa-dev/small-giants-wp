// A hover rule naming several elements is read on each of them (lib/calibrate-read.mjs::markNthMatchInPage, ::mergeHoverRead,
// used by readUnderTrigger): calibration hovered only the first element the setting's selector names, so sgs/nav-bar-menu's
// itemColourHover was recorded at the first item's link (a submenu root) and every plain link was listed as a miss; Fill then
// wrote the wrapper's navColourHover, which the link's own hover rule beats, and the clone's links showed no hover change
// (the Eye Care header, 2026-11-21; second opinion calibrate/scanner2 RESULT.md). In a local headless Chromium, no site.
// MUST FAIL before the fix (neither export exists). Negative controls: the root and elements outside the hovered one keep
// the first reading. Mutation list: tests/calibrate-hover-matches.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as read from '../lib/calibrate-read.mjs';
import { READ_PROPS, PSEUDO_PROPS, TEXT_PSEUDO_PROPS } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const HTML = `<style>a { color: rgb(20, 20, 20); } a:hover { color: rgb(111, 97, 82); } a:hover::after { content: ''; background-color: rgb(1, 2, 3); }</style>
<nav class="cr-ref-cal-0"><ul><li><div><a class="sgs-x__link" href="#">One</a></div></li><li><a class="sgs-x__link" href="#">Two</a></li><li><a class="sgs-x__link" href="#">Three</a></li></ul></nav>`;

test( 'MUST FAIL: every link a hover rule names is hovered in turn, and the merged reading holds each link\'s hover colour', async () => {
	assert.equal( typeof read.markNthMatchInPage, 'function', 'MUST FAIL: no per-match marker' );
	assert.equal( typeof read.mergeHoverRead, 'function', 'MUST FAIL: no merge' );
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const readNow = async () => ( await page.evaluate( read.readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] ) )[ 0 ];
		const first = await page.evaluate( read.markNthMatchInPage, [ 'cr-ref-cal-', 0, '.sgs-x__link', 0, elementPath.toString() ] );
		assert.equal( first.count, 3 );
		await page.locator( '[data-cr-target]' ).hover( { force: true } );
		let merged = await readNow();
		const keys = [ first.key ];
		for ( let k = 1; k < first.count; k++ ) {
			const m = await page.evaluate( read.markNthMatchInPage, [ 'cr-ref-cal-', 0, '.sgs-x__link', k, elementPath.toString() ] );
			assert.equal( m.visible, true );
			await page.mouse.move( 0, 0 );
			await page.locator( '[data-cr-target]' ).hover( { force: true } );
			merged = read.mergeHoverRead( merged, await readNow(), m.key );
			keys.push( m.key );
		}
		assert.equal( new Set( keys ).size, 3, 'each match has its own read key' );
		for ( const key of keys ) {
			assert.ok( key in merged, `${ key } is a key of the read` );
			assert.equal( merged[ key ].color, 'rgb(111, 97, 82)', `${ key } holds its hover colour` );
			assert.equal( merged[ `${ key }::after` ]?.[ 'background-color' ], 'rgb(1, 2, 3)', `${ key }'s hover layer is merged` );
		}
		assert.equal( await page.evaluate( () => document.querySelectorAll( '[data-cr-target]' ).length ), 1, 'one element is marked at a time' );
		assert.equal( await page.evaluate( read.markNthMatchInPage, [ 'cr-ref-cal-', 0, '.sgs-x__link', 3, elementPath.toString() ] ), null, 'past the last match: nothing' );
	} finally {
		await browser.close();
	}
} );

test( 'negative controls: the merge takes only the hovered element and what it holds; the root is never merged', () => {
	const base = { '': { color: 'a' }, 'ul > li:nth-of-type(2) > a': { color: 'rest' }, 'ul > li:nth-of-type(2)': { color: 'rest' }, 'ul > li:nth-of-type(3) > a': { color: 'rest' }, 'ul > li:nth-of-type(2) > abbr': { color: 'rest' } };
	const other = { '': { color: 'b' }, 'ul > li:nth-of-type(2) > a': { color: 'hover' }, 'ul > li:nth-of-type(2) > a > span': { color: 'hover' }, 'ul > li:nth-of-type(2)': { color: 'hover' }, 'ul > li:nth-of-type(3) > a': { color: 'other' }, 'ul > li:nth-of-type(2) > abbr': { color: 'other' } };
	const out = read.mergeHoverRead( base, other, 'ul > li:nth-of-type(2) > a' );
	assert.equal( out[ 'ul > li:nth-of-type(2) > a' ].color, 'hover' );
	assert.equal( out[ 'ul > li:nth-of-type(2) > a > span' ].color, 'hover' );
	assert.equal( out[ 'ul > li:nth-of-type(2)' ].color, 'rest', 'the hovered element\'s parent keeps the first reading' );
	assert.equal( out[ 'ul > li:nth-of-type(3) > a' ].color, 'rest' );
	assert.equal( out[ 'ul > li:nth-of-type(2) > abbr' ].color, 'rest', 'a sibling whose path starts with the same letters is not inside it' );
	assert.equal( out[ '' ].color, 'a' );
	assert.equal( read.mergeHoverRead( base, other, '' ), base, 'an empty key (the root) merges nothing' );
	assert.equal( read.HOVER_MATCHES_MAX, 8 );
} );
