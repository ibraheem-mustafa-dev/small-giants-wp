/**
 * probe-drawer-row.mjs — print the live drawer's CTA row layout for diagnosis.
 *
 * Opens a page, taps the burger, and prints computed layout for the drawer's
 * first sgs/button and every ancestor up to the drawer, plus the email/call
 * icons and the social-icons row. Read-only: it changes nothing on the site.
 * Measure only while the copy's header is the ACTIVE header (see the gate3c
 * guardrail), e.g. inside the walker's set-active/restore block.
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/nav-qa/gate3c/probe-drawer-row.mjs <url> [width]
 */
import { chromium } from '../../../node_modules/playwright/index.mjs';

const url = process.argv[ 2 ];
const width = Number( process.argv[ 3 ] || 768 );
if ( ! url ) {
	console.error( 'Usage: node probe-drawer-row.mjs <url> [width]' );
	process.exit( 1 );
}

const browser = await chromium.launch();
try {
	const page = await ( await browser.newContext( { viewport: { width, height: 900 } } ) ).newPage();
	await page.goto( url + ( url.includes( '?' ) ? '&' : '?' ) + 'cb=' + Date.now(), { waitUntil: 'networkidle' } );
	const burger = page.locator( '.sgs-nav-bar-menu__burger:visible' ).first();
	await burger.click();
	await page.waitForTimeout( 1200 );
	const out = await page.evaluate( () => {
		const pick = ( el ) => {
			const cs = getComputedStyle( el );
			const r = el.getBoundingClientRect();
			return {
				tag: el.tagName.toLowerCase(),
				cls: ( el.className && el.className.baseVal === undefined ? el.className : '' ).toString().slice( 0, 140 ),
				box: [ Math.round( r.x ), Math.round( r.y ), Math.round( r.width ), Math.round( r.height ) ],
				display: cs.display,
				flex: cs.flex,
				flexDirection: cs.flexDirection,
				flexWrap: cs.flexWrap,
				justifyContent: cs.justifyContent,
				gridTemplateColumns: cs.gridTemplateColumns,
				width: cs.width,
				maxWidth: cs.maxWidth,
				minWidth: cs.minWidth,
			};
		};
		const drawer = [ ...document.querySelectorAll( '.sgs-nav-drawer' ) ].find( ( d ) => d.getBoundingClientRect().width > 0 );
		if ( ! drawer ) {
			return { error: 'no visible drawer' };
		}
		const btn = drawer.querySelector( '.sgs-button' );
		const chain = [];
		for ( let el = btn; el && el !== drawer.parentElement; el = el.parentElement ) {
			chain.push( pick( el ) );
		}
		const rowParent = btn && btn.parentElement;
		const siblings = rowParent ? [ ...rowParent.children ].map( pick ) : [];
		const icons = [ ...drawer.querySelectorAll( '.wp-block-sgs-icon, .sgs-icon' ) ].slice( 0, 4 ).map( ( el ) => ( {
			...pick( el ),
			svg: el.querySelector( 'svg' ) ? pick( el.querySelector( 'svg' ) ).box : null,
		} ) );
		const social = drawer.querySelector( '.sgs-social-icons' );
		const styles = [ ...document.querySelectorAll( 'style' ) ]
			.map( ( s ) => s.textContent )
			.filter( ( t ) => /sgs-child-sizing|flex:1 1 0%/.test( t ) )
			.map( ( t ) => t.slice( 0, 400 ) );
		return { buttonToDrawer: chain, rowChildren: siblings, icons, social: social ? pick( social ) : null, childSizingStyles: styles };
	} );
	console.log( JSON.stringify( out, null, 1 ) );
} finally {
	await browser.close();
}
