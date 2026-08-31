#!/usr/bin/env node
/**
 * probe-noJS-autoplay.mjs — closes owed-debt item 3
 * (.claude/prompts/2026-09-01-media-owed-debts.md): the video-behaviour atom
 * coupling (VideoAutoplay -> [VideoMuted, VideoPlaysInline]) was verified at
 * the PHP level (media-2026-08-30.md) but never checked in a real browser
 * with JavaScript disabled — and JS-enabled would pass regardless, because
 * view.js's applyTierPlayback() (view.js:148-152) forcibly sets
 * `video.muted = true` whenever autoplay resolves true, silently repairing
 * broken server markup on hydration. This probe uses `javaScriptEnabled:
 * false` (not merely "no interaction") so that repair can never run.
 *
 * Two cases on one fixture page (built by build-noJS-autoplay-fixture.py):
 *   A — autoplay on, muted off  -> must render `autoplay muted playsinline`.
 *   B — negative control        -> must render NO autoplay and NOT muted.
 * If B is also muted, the coupling over-applied and A alone would not have
 * shown it.
 *
 * Run at both desktop and tablet viewport widths — render.php's own comment
 * says the desktop-tier value is what actually reaches the HTML attribute
 * with JS disabled (tablet/mobile overrides are data-* read by view.js only),
 * so this also PROVES that claim rather than assuming it: a no-JS visitor on
 * a tablet-width viewport must see the identical, correctly-coupled desktop
 * markup, not a broken tier-specific one.
 *
 * Usage: node scripts/probes/probe-noJS-autoplay.mjs <page-url>
 */

import { chromium } from 'playwright';

const URL = process.argv[ 2 ];
if ( ! URL ) {
	console.log( 'usage: probe-noJS-autoplay.mjs <page-url>' );
	process.exit( 2 );
}

const VIEWPORTS = [
	{ name: 'desktop', width: 1280, height: 900 },
	{ name: 'tablet', width: 768, height: 1024 },
];

const browser = await chromium.launch();
const results = [];
const check = ( name, pass, detail ) => {
	results.push( pass );
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
};

for ( const vp of VIEWPORTS ) {
	console.log( `\n--- ${ vp.name } (${ vp.width }x${ vp.height }), JavaScript DISABLED ---` );
	const page = await browser
		.newContext( { viewport: { width: vp.width, height: vp.height }, javaScriptEnabled: false } )
		.then( ( c ) => c.newPage() );

	try {
		await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'load' } );
	} catch ( err ) {
		console.log( `  [FAIL] navigation failed: ${ err.message }` );
		results.push( false );
		continue;
	}

	const videos = await page.evaluate( () =>
		[ ...document.querySelectorAll( '.sgs-media__video' ) ].map( ( v ) => ( {
			caption: v.closest( 'figure' )?.querySelector( 'figcaption' )?.textContent || '',
			hasAutoplay: v.hasAttribute( 'autoplay' ),
			hasMuted: v.hasAttribute( 'muted' ),
			hasPlaysinline: v.hasAttribute( 'playsinline' ),
		} ) )
	);

	if ( 2 !== videos.length ) {
		console.log( `  [FAIL] expected 2 .sgs-media__video elements, found ${ videos.length } — broken probe or fixture.` );
		results.push( false );
		continue;
	}

	const a = videos.find( ( v ) => v.caption.includes( 'case A' ) );
	const b = videos.find( ( v ) => v.caption.includes( 'case B' ) );

	if ( ! a || ! b ) {
		console.log( `  [FAIL] could not match both cases by caption — captions seen: ${ videos.map( ( v ) => v.caption ).join( ' | ' ) }` );
		results.push( false );
		continue;
	}

	check(
		'case A (autoplay-on, muted-off): server markup carries autoplay muted playsinline',
		a.hasAutoplay && a.hasMuted && a.hasPlaysinline,
		`autoplay=${ a.hasAutoplay } muted=${ a.hasMuted } playsinline=${ a.hasPlaysinline }`
	);
	check(
		'case B (negative control): NO autoplay attribute, video NOT muted',
		! b.hasAutoplay && ! b.hasMuted,
		`autoplay=${ b.hasAutoplay } muted=${ b.hasMuted } playsinline=${ b.hasPlaysinline }`
	);

	await page.context().close();
}

await browser.close();
const failed = results.filter( ( r ) => ! r ).length;
console.log( `\nVERDICT: ${ failed ? 'FAIL' : 'PASS' } — ${ results.length - failed }/${ results.length } assertions held\n` );
process.exit( failed ? 1 : 0 );
