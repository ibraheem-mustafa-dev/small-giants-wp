#!/usr/bin/env node
/**
 * Live probe: SgsGapControl on sgs/container Gap. In the real inspector it unlinks the gap, types a row gap and a
 * column gap, and checks (1) the stored attribute is the "row column" shorthand, (2) the editor canvas paints both
 * gaps, and (3) the published page paints them at 375, 768 and 1440. Then it relinks and checks the stored value
 * collapses to one length and both gaps match. Writes to the scratch page (default 5677), never a fixture.
 *
 *   node scripts/qa/probe-gap-control.mjs [--site sandybrown] [--page 5677] [--out <dir>] [--no-save]
 *
 * @package SGS\Blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import { startSession, openEditor, selectBlock, revealControl } from './lib-length-control-live.mjs';
import { makeReporter } from '../motion-qa/probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback );
const OUT = path.resolve( opt( '--out', '../../.claude/reports/2026-10-22-length-control' ) );
const PAGE_ID = opt( '--page', '5677' );
const SAVE = ! argv.includes( '--no-save' );
fs.mkdirSync( OUT, { recursive: true } );
const R = makeReporter();
const rows = [];

const { browser, page, site } = await startSession( opt( '--site', 'sandybrown' ) );
try {
	const frame = await openEditor( page, site, PAGE_ID );
	// The flex container the length-control probe built (it holds two paragraphs).
	const clientId = await selectBlock( page, 'sgs/container', 0 );
	const sidebar = page.locator( '.interface-complementary-area, .editor-sidebar' ).first();

	const stored = () =>
		page.evaluate(
			( id ) => window.wp.data.select( 'core/block-editor' ).getBlockAttributes( id ).gap,
			clientId
		);
	const canvasGaps = () =>
		frame.evaluate( ( id ) => {
			const el = document.querySelector( `[data-block="${ id }"]` );
			const hit = [ el, ...el.querySelectorAll( '*' ) ].find( ( e ) => 'normal' !== getComputedStyle( e ).columnGap );
			const cs = getComputedStyle( hit || el );
			return { row: cs.rowGap, column: cs.columnGap };
		}, clientId );

	// Start from one value: an earlier run leaves the saved pair, which opens the control unlinked.
	await page.evaluate( ( id ) => {
		const gap = window.wp.data.select( 'core/block-editor' ).getBlockAttributes( id ).gap || {};
		window.wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes( id, { gap: { ...gap, desktop: '64vw' } } );
	}, clientId );
	await page.waitForTimeout( 500 );
	await revealControl( page, 'Gap' );
	const group = sidebar.locator( '.sgs-gap-control' ).first();
	await group.scrollIntoViewIfNeeded();
	R.verdict( ( await group.count() ) > 0, 'gap-control-is-mounted', {} );
	await group.screenshot( { path: path.join( OUT, 'gap-control-linked.png' ) } );

	// Unlink: two rows appear without writing a value.
	const before = await stored();
	await group.getByRole( 'button', { name: 'Set row and column gaps separately' } ).click();
	await page.waitForTimeout( 400 );
	const unlinked = sidebar.locator( '.sgs-gap-control' ).first();
	R.verdict( JSON.stringify( before ) === JSON.stringify( await stored() ), 'unlinking-writes-nothing', { before } );
	const rowBox = unlinked.getByRole( 'spinbutton', { name: 'Row gap' } ).first();
	const colBox = unlinked.getByRole( 'spinbutton', { name: 'Column gap' } ).first();
	R.verdict( ( await rowBox.count() ) > 0 && ( await colBox.count() ) > 0, 'row-and-column-rows-are-named', {} );

	const typeInto = async ( box, text ) => {
		await box.click();
		await box.fill( text );
		await box.press( 'Tab' );
		await page.waitForTimeout( 500 );
	};
	await typeInto( rowBox, '40' );
	await typeInto( colBox, '8' );
	const pair = await stored();
	const desktop = pair?.desktop ?? pair;
	R.verdict( /^\s*40vw\s+8vw\s*$/.test( String( desktop ) ), 'stores-the-row-column-shorthand', { stored: pair } );
	const canvas = await canvasGaps();
	R.verdict( parseFloat( canvas.row ) > 0 && Math.abs( parseFloat( canvas.row ) / parseFloat( canvas.column ) - 5 ) < 0.01, 'canvas-paints-row-five-times-column', canvas );
	await sidebar.locator( '.sgs-gap-control' ).first().screenshot( { path: path.join( OUT, 'gap-control-unlinked.png' ) } );
	rows.push( { step: 'unlinked 40 / 8', stored: desktop, canvas } );

	if ( SAVE ) {
		await page.getByRole( 'button', { name: 'Save', exact: true } ).click();
		await page.waitForTimeout( 6000 );
		const live = await page.context().newPage();
		for ( const width of [ 375, 768, 1440 ] ) {
			await live.setViewportSize( { width, height: 900 } );
			await live.goto( `${ site.url }/?page_id=${ PAGE_ID }&qa=${ Date.now() }`, { waitUntil: 'networkidle' } );
			const gaps = await live.evaluate( () => {
				const el = document.querySelector( '.wp-block-sgs-container.sgs-container--flex' );
				if ( ! el ) return null;
				const hit = [ el, ...el.querySelectorAll( '*' ) ].find( ( e ) => 'normal' !== getComputedStyle( e ).columnGap );
				const cs = getComputedStyle( hit || el );
				return { row: cs.rowGap, column: cs.columnGap };
			} );
			// The block already held a vw gap, so the unit stays vw; tablet and mobile keep their own stored tiers.
			const expected = { 375: [ '12px', '12px' ], 768: [ '18px', '18px' ], 1440: [ `${ 1440 * 0.4 }px`, `${ +( 1440 * 0.08 ).toFixed( 2 ) }px` ] }[ width ];
			R.verdict( gaps && expected[ 0 ] === gaps.row && expected[ 1 ] === gaps.column, `live-${ width }-paints-both-gaps`, { gaps, expected } );
			rows.push( { step: `live ${ width }`, ...( gaps || {} ) } );
		}
		await live.close();
	}

	// Relink: the pair collapses to its row value and both gaps match.
	await sidebar.locator( '.sgs-gap-control' ).first().getByRole( 'button', { name: 'Link row and column gaps' } ).click();
	await page.waitForTimeout( 500 );
	const linked = await stored();
	const linkedDesktop = linked?.desktop ?? linked;
	R.verdict( '40vw' === String( linkedDesktop ).trim(), 'relinking-collapses-to-the-row-value', { stored: linked } );
	const after = await canvasGaps();
	R.verdict( after.row === after.column && parseFloat( after.row ) > 0, 'canvas-paints-one-gap-after-relink', after );
	rows.push( { step: 'relinked', stored: linkedDesktop, canvas: after } );
	await sidebar.locator( '.sgs-gap-control' ).first().screenshot( { path: path.join( OUT, 'gap-control-relinked.png' ) } );
} finally {
	fs.writeFileSync( path.join( OUT, 'gap-control-results.json' ), JSON.stringify( rows, null, 2 ) );
	await browser.close();
}
process.exit( R.exitCode() );
