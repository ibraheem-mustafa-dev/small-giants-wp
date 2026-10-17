/**
 * The `--local` fixture's regression block for defects the first live run proved (reports/2026-10-17-focus-system/after).
 * Each block builds its markup from the REAL stylesheet rules (read from the repository, never copied), so a regression in
 * the block's own CSS fails here:
 *
 *   inherit   an `sgs-focus--inset` parent holding a focusable child that carries no inset class: the child must compute
 *             the default outline offset and the normal bloom, not the parent's inset ring (override properties do not inherit).
 *   scroller  `.sgs-shop-filters__scroll` (woocommerce.css) with controls flush to its inline edges: the generic clip test
 *             flags a clipped ring, so the container must leave room for it.
 *   photocard a title-link card (the stretched overlay, a photo link and a positioned media box, the shape of sgs/product-card)
 *             whose ring pixels along the photo's edge must be the ring colour, not the photo.
 *   fade      a link whose resting or hover opacity is below 1 (sgs/responsive-logo): its outline must not be blended.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import * as sass from 'sass';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..', '..', '..' );
const read = ( ...parts ) => fs.readFileSync( path.join( REPO, ...parts ), 'utf8' );

/** Number of focusable stops this block adds to the fixture (one per control below). */
export const DEFECT_STOPS = 5;

/** Top-level rules of a stylesheet whose selector matches `re`, as one CSS string. At-rules are skipped. */
export function rulesMatching( cssText, re ) {
	const out = [];
	postcss.parse( cssText ).each( ( node ) => {
		if ( 'rule' === node.type && re.test( node.selector ) ) out.push( node.toString() );
	} );
	return out.join( '\n' );
}

/** The real block CSS the markup below depends on. */
function realCss() {
	const woo = read( 'theme', 'sgs-theme', 'assets', 'css', 'woocommerce.css' );
	const ext = read( 'plugins', 'sgs-blocks', 'assets', 'css', 'extensions.css' );
	const card = read( 'plugins', 'sgs-blocks', 'src', 'blocks', 'product-card', 'style.css' );
	const logo = sass.compile( path.join( REPO, 'plugins', 'sgs-blocks', 'src', 'blocks', 'responsive-logo', 'style.scss' ) ).css;
	return [
		rulesMatching( woo, /sgs-shop-filters__scroll/ ),
		rulesMatching( ext, /sgs-has-block-link|sgs-block-link-overlay/ ),
		rulesMatching( card, /product-card__img-link|sgs-block-link-overlay/ ),
		rulesMatching( logo, /sgs-responsive-logo__link/ ),
	].join( '\n' );
}

/** Fixture markup and style for the defect blocks. */
export function defectsHtml() {
	return {
		css: `
.dg{padding:28px 24px;background:#ffffff;color:#0b1020;display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.inh{padding:16px;border-radius:8px;background:#eef1f5}
.sc{width:240px;box-sizing:border-box;padding-block:8px}
.sc .scw{display:block;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #888;border-radius:4px;font:inherit}
.pc{position:relative;overflow:hidden;border-radius:8px;width:240px;background:#eef1f5}
.pc .product-card__media{position:relative;overflow:hidden}
.pc .photo{display:block;height:120px;background:#8a4b2a}
.pc .pcbody{position:relative;padding:10px}
.pc .pcbody a{color:inherit}
.fade{background:#101828;padding:12px}
.fade .sgs-responsive-logo__link{display:inline-block;color:#ffffff;--sgs-logo-hover-opacity:0.85}
.fade .mark{display:block;width:90px;height:30px;background:#ffffff}
${ realCss() }`,
		html: `
<section class="dg sgs-on-light" data-ground="defects">
	<div class="inh sgs-focus--inset"><button type="button" id="inherit-child" class="b b-fill">Child of an inset parent</button></div>
	<div class="sgs-shop-filters__scroll"><div class="sc"><input type="text" class="scw" aria-label="Flush field" value="Flush field"></div></div>
	<div class="sgs-shop-filters__scroll"><div class="sc"><button type="button" class="scw b b-out">Flush button</button></div></div>
	<article class="pc product-card sgs-focus-card sgs-focus--inset sgs-has-block-link" id="photocard">
		<div class="product-card__media"><a class="product-card__img-link" href="#photo" tabindex="-1" aria-hidden="true"><span class="photo"></span></a></div>
		<div class="pcbody"><a id="photo-lender" class="sgs-focus-source" href="#photo">Photo card title link</a></div>
		<a class="sgs-block-link-overlay" href="#photo" tabindex="-1" aria-hidden="true"></a>
	</article>
	<div class="fade"><a class="sgs-responsive-logo__link" id="fade-link" href="#logo"><span class="mark"></span></a></div>
</section>`,
	};
}

async function readPixel( scratch, png, x, y ) {
	return scratch.evaluate( async ( [ b64, px, py ] ) => {
		const img = new Image();
		img.src = `data:image/png;base64,${ b64 }`;
		await img.decode();
		const canvas = document.createElement( 'canvas' );
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
		ctx.drawImage( img, 0, 0 );
		return Array.from( ctx.getImageData( px, py, 1, 1 ).data ).slice( 0, 3 );
	}, [ png.toString( 'base64' ), x, y ] );
}

const lum = ( [ r, g, b ] ) => {
	const f = ( v ) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4; };
	return 0.2126 * f( r ) + 0.7152 * f( g ) + 0.0722 * f( b );
};
const contrast = ( a, b ) => ( Math.max( lum( a ), lum( b ) ) + 0.05 ) / ( Math.min( lum( a ), lum( b ) ) + 0.05 );
/** Last measured signature-on-dark core contrast, for the probe's report. */
export const signatureDark = { contrast: null };

const parseRgb = ( s ) => ( s.match( /[\d.]+/g ) || [] ).slice( 0, 3 ).map( Number );
const near = ( a, b, tol ) => a.length === 3 && b.length === 3 && a.every( ( v, i ) => Math.abs( v - b[ i ] ) <= tol );

/** Focus an element the way a keyboard user does (a key press first, so :focus-visible matches in every engine). */
async function keyboardFocus( page, id ) {
	await page.keyboard.press( 'Shift' );
	await page.evaluate( ( i ) => { const el = document.getElementById( i ); el.blur(); el.focus(); }, id );
	await page.waitForTimeout( 150 );
}

/**
 * The inherited-override, photo-edge and faded-outline checks. Runs on a fresh fixture page. Returns a list of problems.
 */
export async function checkDefects( page, scratch, mode ) {
	const problems = [];

	await keyboardFocus( page, 'inherit-child' );
	const child = await page.evaluate( () => {
		const cs = getComputedStyle( document.getElementById( 'inherit-child' ) );
		return { offset: cs.outlineOffset, width: cs.outlineWidth, shadow: cs.boxShadow };
	} );
	if ( child.offset !== child.width ) problems.push( `inherit: a child of an inset parent computes outline-offset ${ child.offset }, want the default ${ child.width }` );
	if ( /inset/.test( child.shadow ) ) problems.push( `inherit: a child of an inset parent paints the parent's inset halo (${ child.shadow })` );

	await page.keyboard.press( 'Shift' );
	const sig = await page.evaluate( () => {
		const el = document.querySelector( 'section[data-ground="dark"] .sgs-focus--signature' );
		el.focus();
		return { ring: getComputedStyle( el ).outlineColor, ground: getComputedStyle( el.closest( 'section' ) ).backgroundColor };
	} );
	signatureDark.contrast = contrast( parseRgb( sig.ring ), parseRgb( sig.ground ) );
	if ( ! mode.forcedColors && signatureDark.contrast < 3 ) problems.push( `signature on dark: the core ${ sig.ring } scores ${ signatureDark.contrast.toFixed( 2 ) } against the ground ${ sig.ground }, want at least 3` );

	await keyboardFocus( page, 'fade-link' );
	const fade = await page.evaluate( () => {
		const link = document.getElementById( 'fade-link' );
		const cs = getComputedStyle( link );
		return { opacity: cs.opacity, style: cs.outlineStyle, child: getComputedStyle( link.firstElementChild ).opacity };
	} );
	if ( 'none' !== fade.style && '1' !== fade.opacity ) problems.push( `fade: the focused link has opacity ${ fade.opacity }, which blends its outline into the ground` );
	if ( Math.abs( Number( fade.child ) - 0.85 ) > 0.02 ) problems.push( `fade: the logo image has opacity ${ fade.child } on focus, want the block's hover opacity 0.85` );

	if ( mode.forcedColors ) return problems;

	await keyboardFocus( page, 'photo-lender' );
	const card = await page.evaluate( () => {
		const c = document.getElementById( 'photocard' );
		const r = c.getBoundingClientRect();
		const photo = c.querySelector( '.photo' ).getBoundingClientRect();
		return { x: Math.floor( r.left ), y: Math.floor( r.top ), w: Math.ceil( r.width ), photoY: Math.round( photo.top + photo.height / 2 ), ring: getComputedStyle( c ).outlineColor };
	} );
	const png = await page.screenshot( { clip: { x: card.x, y: card.photoY, width: 8, height: 2 }, animations: 'disabled', caret: 'hide' } );
	const ring = parseRgb( card.ring );
	// The card's left edge can sit on a fraction, so the second pixel column is the one wholly inside the 2px band.
	const edge = await readPixel( scratch, png, 1, 0 );
	if ( ! near( edge, ring, 12 ) ) problems.push( `photocard: the ring pixel along the photo edge is rgb(${ edge.join( ', ' ) }), want the ring colour rgb(${ ring.join( ', ' ) }); the photo link paints over the card's ring` );
	return problems;
}
