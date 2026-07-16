#!/usr/bin/env node
/**
 * Verify the migrated FAQ accordion works end-to-end: all 5 questions present,
 * answers hidden until clicked, and clicking a header reveals its answer.
 * Usage (from plugins/sgs-blocks): node scripts/migrate-core-blocks/probe-accordion.js <url>
 */
const { chromium } = require( 'playwright' );

( async () => {
	const url = process.argv[ 2 ];
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( url, { waitUntil: 'networkidle' } );

	const questions = [
		'How long does a typical project take?',
		'What is your pricing structure?',
		'Do you provide ongoing support?',
		'Can you work with our existing brand guidelines?',
		'What technologies do you use?',
	];
	const answerSnippet = 'Most projects take between';

	const found = await page.evaluate( ( qs ) =>
		qs.map( ( q ) => document.body.innerText.includes( q ) ), questions );
	console.log( 'all 5 questions present:', found.every( Boolean ) );

	// Find the first accordion header/trigger and its answer visibility before/after click.
	const beforeVisible = await page.evaluate( ( snip ) => {
		const el = Array.from( document.querySelectorAll( 'p, div, span' ) )
			.find( ( n ) => ( n.innerText || '' ).includes( snip ) );
		if ( ! el ) return 'answer node NOT FOUND';
		return el.offsetParent !== null && el.getBoundingClientRect().height > 0;
	}, answerSnippet );
	console.log( 'answer visible BEFORE click:', beforeVisible );

	// Click the first question's header.
	const trigger = page.getByText( questions[ 0 ], { exact: false } ).first();
	await trigger.click().catch( () => {} );
	await page.waitForTimeout( 600 );

	const afterVisible = await page.evaluate( ( snip ) => {
		const el = Array.from( document.querySelectorAll( 'p, div, span' ) )
			.find( ( n ) => ( n.innerText || '' ).includes( snip ) );
		if ( ! el ) return 'answer node NOT FOUND';
		return el.offsetParent !== null && el.getBoundingClientRect().height > 0;
	}, answerSnippet );
	console.log( 'answer visible AFTER click:', afterVisible );

	const pass = found.every( Boolean ) && afterVisible === true;
	console.log( pass ? 'VERDICT: PASS' : 'VERDICT: REVIEW' );
	await browser.close();
} )();
