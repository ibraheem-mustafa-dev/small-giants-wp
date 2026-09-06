#!/usr/bin/env node
/**
 * probe-media-object-fit-video-svg.mjs — closes owed-debt item 4
 * (.claude/prompts/2026-09-01-media-owed-debts.md): video and SVG object-fit
 * were reasoned from the census and the deleted style.css selector, never
 * measured on a rendered element.
 *
 * Reads page 3145 (extended by extend-page-3145-video-svg.py) and asserts:
 *   1. The <video> resolves object-fit: cover with no objectFit attr set
 *      (the deleted `:where(.sgs-media__img){object-fit:cover}` rule only
 *      ever covered `__img` — a video previously fell through to the browser
 *      default `fill`; this proves the atom layer's default now covers it).
 *   2. The <video> has non-zero painted geometry — asserting a computed style
 *      on a zero-area box proves nothing (STOP-A-COMPUTED-STYLE-CHECK-CANNOT
 *      -SEE-A-ZERO-AREA-ELEMENT).
 *   3. The SVG element does NOT carry the atom's marker class
 *      (`sgs-media-el`) and its computed object-fit is the CSS-initial value
 *      (`fill`), never `cover` — confirming the atom genuinely never touches
 *      it, not merely that no override was set.
 *
 * Usage: node scripts/probes/probe-media-object-fit-video-svg.mjs <page-url>
 */

import { chromium } from 'playwright';

const URL = process.argv[ 2 ] || 'https://sandybrown-nightingale-600381.hostingersite.com/?page_id=3145';

const browser = await chromium.launch();
const page = await browser.newContext( { viewport: { width: 1280, height: 900 } } ).then( ( c ) => c.newPage() );

console.log( `\nmedia object-fit (video/SVG) -> ${ URL }\n` );

try {
	await page.goto( `${ URL }&cb=${ Date.now() }`, { waitUntil: 'load' } );
} catch ( err ) {
	console.log( `  [FAIL] navigation failed: ${ err.message }` );
	await browser.close();
	process.exit( 1 );
}

const result = await page.evaluate( () => {
	const video = document.querySelector( '.sgs-media__video' );
	const svg = document.querySelector( '.sgs-media__svg' );
	const read = ( el ) => {
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		const cs = window.getComputedStyle( el );
		return {
			tag: el.tagName,
			classes: el.className,
			objectFit: cs.objectFit,
			width: r.width,
			height: r.height,
			hasAtomMarker: el.classList.contains( 'sgs-media-el' ),
		};
	};
	return { video: read( video ), svg: read( svg ) };
} );

const results = [];
const check = ( name, pass, detail ) => {
	results.push( pass );
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
};

if ( ! result.video ) {
	console.log( '  [FAIL] no .sgs-media__video element found on the page — broken probe or fixture not extended yet.' );
}
if ( ! result.svg ) {
	console.log( '  [FAIL] no .sgs-media__svg element found on the page — broken probe or fixture not extended yet.' );
}
if ( ! result.video || ! result.svg ) {
	await browser.close();
	process.exit( 1 );
}

check(
	'video has non-zero painted geometry (a zero-area box would make the next check meaningless)',
	result.video.width > 0 && result.video.height > 0,
	`${ result.video.width }x${ result.video.height }`
);
check(
	'video with unset objectFit resolves computed object-fit: cover (was browser default "fill" before the atom layer)',
	result.video.objectFit === 'cover',
	`computed object-fit = "${ result.video.objectFit }"`
);
check(
	'SVG has non-zero painted geometry',
	result.svg.width > 0 && result.svg.height > 0,
	`${ result.svg.width }x${ result.svg.height }`
);
check(
	'SVG does NOT carry the atom marker class sgs-media-el',
	! result.svg.hasAtomMarker,
	`classes="${ result.svg.classes }"`
);
check(
	'SVG computed object-fit is the CSS-initial value "fill", never "cover" (the atom never touches it)',
	result.svg.objectFit === 'fill',
	`computed object-fit = "${ result.svg.objectFit }"`
);

await browser.close();
const failed = results.filter( ( r ) => ! r ).length;
console.log( `\nVERDICT: ${ failed ? 'FAIL' : 'PASS' } — ${ results.length - failed }/${ results.length } assertions held\n` );
process.exit( failed ? 1 : 0 );
