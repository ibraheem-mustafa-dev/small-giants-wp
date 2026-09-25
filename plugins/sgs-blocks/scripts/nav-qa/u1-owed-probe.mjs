/**
 * U-1 + U-2 owed live checks (Wave 3C), run against `qa-u1-owed-fixture.php`.
 *
 *   node plugins/sgs-blocks/scripts/nav-qa/u1-owed-probe.mjs <url> [--expect on|off]
 *
 * At 1440 (headless):
 *   1. Edge fade: the header's computed mask-image, and the painted alpha of its black fill at the
 *      top and bottom of the band (read from a screenshot over a white page, so a lighter pixel
 *      means a more transparent fill). Forced colours: mask-image must be none.
 *   2. Submenu opacity: a dropdown sublink's opacity at rest and while hovered.
 *   3. Card lift: a `cards` mega group's translateY and its box's top shift while hovered.
 *   4. U-2 forced colours with a scrim open: the dropdown's scrim and panel stay painted, the
 *      panel keeps a visible boundary, and the sublinks read a system colour.
 *
 * `--expect on` asserts the fixture's exit-cells values; `--expect off` asserts the controls case
 * (no mask, opacity 1 at rest, no lift). `--no-fade` skips the fade assertions (the fixture's
 * no-fade case). Exits 1 on any failed assertion.
 */
import { chromium } from 'playwright';

const url = process.argv[ 2 ];
const expectIdx = process.argv.indexOf( '--expect' );
const expect = expectIdx > -1 ? process.argv[ expectIdx + 1 ] : 'on';
const noFade = process.argv.includes( '--no-fade' );
if ( ! url ) {
	console.error( 'usage: u1-owed-probe.mjs <url> [--expect on|off]' );
	process.exit( 2 );
}

let failed = 0;
const check = ( cond, label ) => {
	console.log( `${ cond ? 'PASS' : 'FAIL' }  ${ label }` );
	if ( ! cond ) {
		failed++;
	}
};

const browser = await chromium.launch( { headless: true } );
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }nocache=${ Date.now() }`, { waitUntil: 'networkidle' } );
// A white page behind the header, so painted fill alpha reads as darkness.
await page.addStyleTag( { content: 'html,body{background:#fff !important}' } );

// ── 1. Edge fade ────────────────────────────────────────────────────────────
const header = page.locator( 'header.sgs-site-header' ).first();
const mask = await header.evaluate( ( el ) => getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage );
const box = await header.boundingBox();
console.log( `header box ${ Math.round( box.width ) }x${ Math.round( box.height ) } at y ${ Math.round( box.y ) }; mask-image: ${ mask }` );

// Sample a thin strip at the left edge (padding only, no content) near the top and the bottom.
const sample = async ( y ) => {
	const shot = await page.screenshot( { clip: { x: box.x + 2, y, width: 1, height: 1 } } );
	return page.evaluate( async ( b64 ) => {
		const img = new Image();
		img.src = `data:image/png;base64,${ b64 }`;
		await img.decode();
		const c = document.createElement( 'canvas' );
		c.width = 1;
		c.height = 1;
		const ctx = c.getContext( '2d' );
		ctx.drawImage( img, 0, 0 );
		return Array.from( ctx.getImageData( 0, 0, 1, 1 ).data.slice( 0, 3 ) );
	}, shot.toString( 'base64' ) );
};
const topPx = await sample( box.y + 2 );
const botPx = await sample( box.y + box.height - 2 );
console.log( `pixel near top ${ topPx.join( ',' ) }; near bottom ${ botPx.join( ',' ) } (255 = no fill painted)` );

if ( noFade ) {
	console.log( 'edge fade: skipped (--no-fade)' );
} else if ( 'on' === expect ) {
	check( /linear-gradient\(to top/.test( mask ) || /linear-gradient\(0deg/.test( mask ), 'edge fade: mask-image is a bottom-edge fade' );
	check( botPx[ 0 ] - topPx[ 0 ] > 60, 'edge fade: the bottom of the band paints lighter (more transparent) than the top' );
} else {
	check( 'none' === mask, 'control: no mask-image' );
	check( Math.abs( botPx[ 0 ] - topPx[ 0 ] ) < 10, 'control: top and bottom paint the same fill' );
}

await page.emulateMedia( { forcedColors: 'active' } );
const fcMask = await header.evaluate( ( el ) => getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage );
check( 'none' === fcMask, `forced colours: mask-image is none (read ${ fcMask })` );
await page.emulateMedia( { forcedColors: 'none' } );

// ── 2. Submenu opacity ──────────────────────────────────────────────────────
const noTransitions = await page.addStyleTag( { content: '*,*::before,*::after{transition:none !important;animation-duration:0s !important}' } );
const parentItem = page.locator( '.sgs-site-header .sgs-nav-bar-menu__item:has(.sgs-nav-bar-menu__submenu)' ).first();
await parentItem.hover();
const sublink = parentItem.locator( '.sgs-nav-bar-menu__sublink' ).first();
await sublink.waitFor( { state: 'visible', timeout: 5000 } );
await page.mouse.move( 5, 5 );
await parentItem.hover();
const restOpacity = await sublink.evaluate( ( el ) => getComputedStyle( el ).opacity );
await sublink.hover();
const hoverOpacity = await sublink.evaluate( ( el ) => getComputedStyle( el ).opacity );
console.log( `sublink opacity rest ${ restOpacity }, hovered ${ hoverOpacity }` );
if ( 'on' === expect ) {
	check( '0.6' === restOpacity, 'submenu opacity: rest 0.6 (fantasy)' );
	check( '1' === hoverOpacity, 'submenu opacity: hovered 1' );
} else {
	check( '1' === restOpacity && '1' === hoverOpacity, 'control: sublink opacity 1 at rest and hovered' );
}

// ── 4. U-2 forced colours with the dropdown's scrim open (the dropdown is still open) ──
await page.emulateMedia( { forcedColors: 'active' } );
const fc = await page.evaluate( () => {
	const scrim = document.querySelector( '.sgs-site-header .sgs-scrim, .sgs-scrim' );
	const panel = document.querySelector( '.sgs-site-header .sgs-nav-bar-menu__submenu' );
	const link = panel && panel.querySelector( '.sgs-nav-bar-menu__sublink' );
	const s = scrim ? getComputedStyle( scrim ) : null;
	const p = panel ? getComputedStyle( panel ) : null;
	return {
		scrim: s ? { display: s.display, opacity: s.opacity, bg: s.backgroundColor, visible: s.visibility } : null,
		panel: p ? { bg: p.backgroundColor, border: `${ p.borderTopWidth } ${ p.borderTopStyle } ${ p.borderTopColor }`, outline: p.outlineStyle } : null,
		link: link ? getComputedStyle( link ).color : null,
	};
} );
console.log( `forced colours: ${ JSON.stringify( fc ) }` );
check( !! fc.panel && '0px' !== fc.panel.border.split( ' ' )[ 0 ] && 'none' !== fc.panel.border.split( ' ' )[ 1 ], 'forced colours: the open dropdown keeps a visible border' );
check( !! fc.link, 'forced colours: the dropdown links are present' );
await page.screenshot( { path: `u1-owed-forced-colours-${ expect }.png` } );
await page.emulateMedia( { forcedColors: 'none' } );

// ── 3. Card lift ────────────────────────────────────────────────────────────
await page.mouse.move( 5, 5 );
const megaItem = page.locator( '.sgs-site-header .sgs-nav-bar-menu__item:has(.wp-block-sgs-mega-panel)' ).first();
await megaItem.hover();
const group = megaItem.locator( '.wp-block-sgs-mega-panel[data-mega-style="cards"] .sgs-mega-group' ).first();
await group.waitFor( { state: 'visible', timeout: 5000 } );
const restTop = ( await group.boundingBox() ).y;
await group.hover();
const lift = await group.evaluate( ( el ) => getComputedStyle( el ).transform );
const hoverTop = ( await group.boundingBox() ).y;
console.log( `card transform hovered ${ lift }; top ${ restTop.toFixed( 2 ) } -> ${ hoverTop.toFixed( 2 ) }` );
if ( 'on' === expect ) {
	check( /matrix\(1, 0, 0, 1, 0, -6\)/.test( lift ), 'card lift: translateY(-6px) (indus-foods)' );
	check( Math.abs( restTop - hoverTop - 6 ) < 0.5, 'card lift: the box rises 6px' );
} else {
	check( 'none' === lift && Math.abs( restTop - hoverTop ) < 0.5, 'control: no lift' );
}

await noTransitions.evaluate( ( el ) => el.remove() );
await browser.close();
console.log( `\n${ failed ? 'FAILED' : 'ALL PASS' } (${ failed } failed)` );
process.exit( failed ? 1 : 0 );
