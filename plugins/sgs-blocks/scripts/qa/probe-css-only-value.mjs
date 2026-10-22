#!/usr/bin/env node
/**
 * Live probe: a stored CSS value that is not one length (the canary homepage's trust-bar gap "16px 12px") shows as
 * "Set as CSS: ..." in the length control, with the value box empty and the slider disabled. Read-only: nothing is saved.
 *
 *   node scripts/qa/probe-css-only-value.mjs [--site sandybrown] [--page 2742] [--out <dir>]
 *
 * @package SGS\Blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import { startSession, openEditor, selectBlock } from './lib-length-control-live.mjs';
import { makeReporter } from '../motion-qa/probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback );
const OUT = path.resolve( opt( '--out', '../../.claude/reports/2026-10-22-length-control' ) );
fs.mkdirSync( OUT, { recursive: true } );
const R = makeReporter();
const { browser, page, site } = await startSession( opt( '--site', 'sandybrown' ) );
try {
	await openEditor( page, site, opt( '--page', '2742' ) );
	await selectBlock( page, 'sgs/trust-bar' );
	const sidebar = page.locator( '.interface-complementary-area' ).first();
	let found = null;
	for ( const tab of [ 'Settings', 'Styles' ] ) {
		await sidebar.getByRole( 'tab', { name: tab } ).click();
		await page.waitForTimeout( 300 );
		for ( let i = 0; i < 14; i++ ) {
			const closed = sidebar.locator( 'button.components-panel__body-toggle[aria-expanded="false"]' );
			if ( ! ( await closed.count() ) || /Visibility|Advanced|Entrance|Effects|Hover/.test( await closed.first().innerText() ) ) break;
			await closed.first().click();
			await page.waitForTimeout( 200 );
		}
		const notice = sidebar.locator( '.sgs-length-control', { hasText: 'Set as CSS' } ).first();
		if ( await notice.count() ) {
			found = notice;
			break;
		}
	}
	R.verdict( Boolean( found ), 'css-only-value-is-named', { expected: 'Set as CSS: 16px 12px' } );
	if ( found ) {
		await found.scrollIntoViewIfNeeded();
		R.verdict( ( await found.innerText() ).includes( '16px 12px' ), 'notice-carries-the-stored-value', {} );
		R.verdict( await found.locator( 'input[type="range"]' ).first().isDisabled(), 'slider-is-disabled', {} );
		await found.screenshot( { path: path.join( OUT, 'css-only-value-trust-bar-gap.png' ) } ).catch( () => sidebar.screenshot( { path: path.join( OUT, 'css-only-value-trust-bar-gap.png' ) } ) );
	}
} finally {
	await browser.close();
}
process.exit( R.exitCode() );
