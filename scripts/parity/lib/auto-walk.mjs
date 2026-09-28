// Walker glue for the automatic check (GAP-CHECKLIST.md section 12): the scrolled state every page
// gets, the in-page collection (rooted at an open modal when there is one), the pixel check for a
// control cut off at a clipping edge, and the comparison.
import fs from 'fs';
import { collectAuto } from './auto-collect.mjs';
import { compareAuto } from './auto-compare.mjs';

// The header, footer and floating chat belong to the nav track, not a page's parity.
export const AUTO_EXCLUDE = [ 'header', 'footer', '[role=banner]', '[role=contentinfo]', '.sgs-site-header', '.sgs-site-footer', '.sgs-whatsapp-cta--floating' ];

// A state after the opening one, scrolled a screen and a half: what appears only after scrolling
// (a floating button, a sticky bar) and the content below the first screen.
export function withAutoScroll( cfg ) {
	if ( false === cfg.autoScroll || ! cfg.states?.length || cfg.states.some( ( s ) => 'auto-scrolled' === s.name ) ) {
		return;
	}
	const scroll = async ( h ) => {
		await h.page.evaluate( () => window.scrollTo( { top: Math.round( innerHeight * 1.5 ), behavior: 'instant' } ) );
		await h.wait( 1200 );
	};
	cfg.states.splice( 1, 0, { name: 'auto-scrolled', autoScrolled: true, draft: scroll, live: scroll } );
}

// Collects the page's words and controls (or cfg.auto.root's), marking those inside an open modal: the
// comparison narrows to the modal only when both sides have one (a live dialog drawer against a draft
// drawer drawn in the page compares the whole page on both).
export function collectAutoOn( page, side, cfg ) {
	const opts = cfg.auto || {};
	const exclude = [ ...AUTO_EXCLUDE, ...( opts.exclude?.[ side ] || [] ) ];
	return page.evaluate( ( [ fn, rootSel, ex ] ) => {
		// eslint-disable-next-line no-new-func
		const collect = new Function( `return (${ fn });` )();
		const shown = ( e ) => e.getClientRects().length && 'hidden' !== getComputedStyle( e ).visibility;
		const root = rootSel ? [ ...document.querySelectorAll( rootSel ) ].find( shown ) : null;
		const modal = [ ...document.querySelectorAll( 'dialog[open], [aria-modal="true"], [role="dialog"]' ) ].find( shown );
		return collect( [ { root, modal }, ex, 4000 ] );
	}, [ collectAuto.toString(), opts.root?.[ side ] || null, exclude ] );
}

// Marks each control flush with a clipping edge (left or right) as cut when the screenshot shows ink
// in the last pixel column inside that edge over the control's rows: a range handle's thumb, which is
// no element, clipped by a drawer's scroll area. c.cut is '' (whole), 'right' or 'left'.
export async function markClipped( ctx, shotPath, auto, fullPage ) {
	const checks = [];
	auto.controls.forEach( ( c, i ) => {
		c.cut = '';
		const top = c.clip && Math.max( c.client.t, c.clip.t, fullPage ? -Infinity : 0 );
		const bot = c.clip && Math.min( c.client.b, c.clip.b, fullPage ? Infinity : auto.vh );
		if ( ! c.clip || bot - top < 2 ) {
			return;
		}
		if ( c.client.r >= c.clip.r - 3 ) {
			checks.push( { i, side: 'right', x: c.clip.r, top, bot, bg: c.clip.bg } );
		}
		if ( c.client.l <= c.clip.l + 3 ) {
			checks.push( { i, side: 'left', x: c.clip.l, top, bot, bg: c.clip.bg } );
		}
	} );
	if ( ! checks.length ) {
		return;
	}
	const page = await ctx.newPage();
	const uri = 'data:image/png;base64,' + fs.readFileSync( shotPath ).toString( 'base64' );
	const cut = await page.evaluate( async ( [ src, list, dpr, ox, oy ] ) => {
		const img = new Image();
		img.src = src;
		await img.decode();
		const cv = document.createElement( 'canvas' );
		cv.width = img.width;
		cv.height = img.height;
		const g = cv.getContext( '2d', { willReadFrequently: true } );
		g.drawImage( img, 0, 0 );
		const rgb = ( s ) => ( s.match( /[\d.]+/g ) || [] ).map( Number );
		return list.map( ( c ) => {
			const col = 'right' === c.side ? Math.floor( ( c.x + ox ) * dpr ) - 1 : Math.ceil( ( c.x + ox ) * dpr );
			const y0 = Math.ceil( ( c.top + oy ) * dpr );
			const y1 = Math.floor( ( c.bot + oy ) * dpr );
			if ( col < 0 || col >= cv.width || y1 <= y0 ) {
				return false;
			}
			const px = g.getImageData( col, y0, 1, Math.min( y1, cv.height ) - y0 ).data;
			// The container's own ground; a transparent one is read from the pixel above the control.
			let bg = rgb( c.bg );
			if ( bg.length < 3 || 0 === bg[ 3 ] ) {
				bg = [ ...g.getImageData( col, Math.max( 0, y0 - 3 * dpr ), 1, 1 ).data ];
			}
			let ink = 0;
			for ( let p = 0; p < px.length; p += 4 ) {
				if ( [ 0, 1, 2 ].some( ( k ) => Math.abs( px[ p + k ] - bg[ k ] ) > 48 ) ) {
					ink++;
				}
			}
			return ink >= 2 * dpr;
		} );
	}, [ uri, checks, auto.dpr, fullPage ? auto.scrollX : 0, fullPage ? auto.scrollY : 0 ] );
	await page.close();
	checks.forEach( ( c, k ) => {
		if ( cut[ k ] ) {
			auto.controls[ c.i ].cut = c.side;
		}
	} );
}

// The automatic differences of one state at one width, as a pseudo-pair "(auto)".
export function autoPair( d, l, tol ) {
	return { words: { draft: d?.words.length ?? 0, live: l?.words.length ?? 0 }, diffs: compareAuto( d, l, tol ) };
}
