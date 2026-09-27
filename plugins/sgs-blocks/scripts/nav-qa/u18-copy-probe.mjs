/**
 * U-18 copy-parity probe (Wave 3C Gate 3C item 4): measures a composed header copy while it is the
 * ACTIVE header, and screenshots it closed and open at 375, 768 and 1440.
 *
 *   node plugins/sgs-blocks/scripts/nav-qa/u18-copy-probe.mjs <url> --copy lamalama|indus --out <dir>
 *
 * 375 runs in a mobile-emulated context (touch, no classic scrollbar): a desktop window's 15px
 * scrollbar narrows the page and made lamalama's 343px pill read 328px.
 *
 * lamalama, every width: the pill (first `header.sgs-site-header`), the burger's box and its 44px
 * tap area (elementFromPoint at the four corners of a 44x44 box centred on the burger must land on
 * the burger), then the burger is clicked and the open drawer's box is read beside the pill's
 * closed box (same top, left and width = the pill grows in place), with the header's grown state
 * and its painted background.
 * lamalama also reads the burger's three bars closed and open (16 long, 3px gaps, one line open
 * with 5px travel), the two drawer CTAs' widths, and the corner "GET IN TOUCH" card: pinned
 * 160x326 at top 16 / right 16 at 1440 and absent (no box, or 0x0) at 375 and 768.
 * indus, 1440: every mega trigger is clicked in turn and its panel's box read (the wrap and its
 * widest child) plus its aside (`.sgs-mega-aside`), which must sit beside the links, not below;
 * 768 and 375: the burger and the open drawer, as above.
 *
 * A check whose element is missing FAILS; it never silently skips.
 *
 * Writes <out>/<copy>-measure.json and <copy>-<width>-closed.png / -open.png. Exits 1 when an
 * expected value (EXPECT below, from .claude/reports/reference-requirements/<copy>.json) is missed
 * by more than 2px.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[ 2 ];
const arg = ( name ) => {
	const i = process.argv.indexOf( name );
	return i > -1 ? process.argv[ i + 1 ] : null;
};
const copy = arg( '--copy' );
const out = arg( '--out' );
if ( ! url || ! [ 'lamalama', 'indus' ].includes( copy ) || ! out ) {
	console.error( 'usage: u18-copy-probe.mjs <url> --copy lamalama|indus --out <dir>' );
	process.exit( 2 );
}
mkdirSync( out, { recursive: true } );

// Reference values (px). lamalama.json: trigger_close rect, drawer archetype open/closed rects.
// indus-foods.json: widths_measured_at_1440 and each panel's panelRect.x.
const EXPECT = {
	lamalama: {
		// bars: lamalama.json trigger-close `barSize` 16x2 and its raw html (gap-y 3/16rem, open translate 0.3125rem).
		// ctas: drawer `secondary_blocks.ctas`. card: header-shell `secondary_blocks.contactCardTopRight`.
		375: { pill: { x: 16, y: 16, w: 343, h: 50 }, burger: { w: 30, h: 36 }, open: { x: 16, y: 16, w: 343, h: 436 }, bars: { w: 16, gap: 3, travel: 5 }, ctas: 156.5, card: null },
		768: { pill: { w: 438, h: 50 }, burger: { w: 30, h: 36 }, open: { w: 438, h: 436 }, bars: { w: 16, gap: 3, travel: 5 }, ctas: 204, card: null },
		1440: { pill: { w: 438, h: 50 }, burger: { w: 30, h: 36 }, open: { w: 438, h: 436 }, bars: { w: 16, gap: 3, travel: 5 }, ctas: 204, card: { top: 16, right: 16, w: 160, h: 326 } },
	},
	indus: {
		1440: {
			panels: {
				// aside: indus-foods.json dropdown rows 11/14 `zone_model.rail` (w 300 at x 729, beside the 318px links).
				About: { x: 410, w: 620, aside: { x: 729, w: 300 } },
				Sectors: { x: 180, w: 1080 },
				Brands: { x: 180, w: 1080 },
				Trade: { x: 410, w: 620, aside: { x: 729, w: 300 } },
				More: { x: 570, w: 300 },
			},
		},
	},
};

let failed = 0;
const near = ( got, want, label ) => {
	if ( undefined === want ) {
		return;
	}
	const ok = Math.abs( got - want ) <= 2;
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ label }: ${ Math.round( got * 10 ) / 10 } (reference ${ want })` );
	if ( ! ok ) {
		failed++;
	}
};
const box = ( r ) => ( { x: r.x, y: r.y, w: r.width, h: r.height } );

const WIDTHS = [
	{ width: 375, ctx: { ...devices[ 'iPhone 13' ], viewport: { width: 375, height: 812 } } },
	{ width: 768, ctx: { viewport: { width: 768, height: 1024 } } },
	{ width: 1440, ctx: { viewport: { width: 1440, height: 900 } } },
];

const browser = await chromium.launch( { headless: true } );
const results = {};

async function measureDrawer( page, width, header ) {
	const burger = header.locator( '.sgs-nav-bar-menu__burger' ).first();
	const res = {};
	if ( ! ( await burger.isVisible() ) ) {
		return res;
	}
	res.pill = box( await header.boundingBox() );
	res.burger = box( await burger.boundingBox() );
	// The tap area: a 44x44 box centred on the burger; every corner (1px in) must hit the burger.
	const cx = res.burger.x + res.burger.w / 2;
	const cy = res.burger.y + res.burger.h / 2;
	res.tapCorners = await page.evaluate(
		( [ x, y ] ) =>
			[ [ -21, -21 ], [ 21, -21 ], [ -21, 21 ], [ 21, 21 ] ].map( ( [ dx, dy ] ) => {
				const el = document.elementFromPoint( x + dx, y + dy );
				return !! ( el && el.closest( '.sgs-nav-bar-menu__burger' ) );
			} ),
		[ cx, cy ]
	);
	const readBars = () =>
		burger.evaluate( ( el ) =>
			[ ...el.querySelectorAll( '.sgs-nav-bar-menu__burger-bar' ) ].map( ( b ) => {
				const r = b.getBoundingClientRect();
				return { x: r.x, y: r.y, w: r.width, h: r.height };
			} )
		);
	res.barsClosed = await readBars();
	res.card = await page.evaluate( () => {
		const a = [ ...document.querySelectorAll( 'a' ) ].find(
			( el ) => /get in touch/i.test( el.textContent ) && ! el.closest( 'header, dialog' )
		);
		if ( ! a ) {
			return null;
		}
		// The card is the fixed-position box that holds the link (or the link itself).
		let el = a;
		while ( el && el !== document.body && 'fixed' !== getComputedStyle( el ).position ) {
			el = el.parentElement;
		}
		const box = el && el !== document.body ? el : a;
		const r = box.getBoundingClientRect();
		return { top: r.top, right: innerWidth - r.right, w: r.width, h: r.height, fixed: box !== a || 'fixed' === getComputedStyle( a ).position };
	} );
	await page.screenshot( { path: join( out, `${ copy }-${ width }-closed.png` ) } );
	await burger.click();
	await page.waitForTimeout( 900 );
	res.barsOpen = await readBars();
	const drawer = page.locator( 'dialog.wp-block-sgs-nav-drawer[open]' ).first();
	if ( await drawer.count() ) {
		res.open = box( await drawer.boundingBox() );
		res.grown = await header.evaluate( ( el ) => el.hasAttribute( 'data-sgs-drawer-grown' ) );
		res.headerBackground = await header.evaluate( ( el ) => getComputedStyle( el ).backgroundColor + ' ' + getComputedStyle( el ).backgroundImage );
		res.drawerBackground = await drawer.evaluate( ( el ) => getComputedStyle( el ).backgroundColor );
		res.drawerRadius = await drawer.evaluate( ( el ) => getComputedStyle( el ).borderTopLeftRadius );
		res.ctas = await drawer.evaluate( ( el ) =>
			[ ...el.querySelectorAll( 'a, button' ) ]
				.filter( ( b ) => /schedule a call|start a project/i.test( b.textContent ) )
				.map( ( b ) => ( { text: b.textContent.trim(), w: b.getBoundingClientRect().width } ) )
		);
		res.burgerStillOnTop = await page.evaluate(
			( [ x, y ] ) => !! document.elementFromPoint( x, y )?.closest( '.sgs-nav-bar-menu__burger' ),
			[ cx, cy ]
		);
	}
	await page.screenshot( { path: join( out, `${ copy }-${ width }-open.png` ) } );
	return res;
}

async function measurePanels( page, header ) {
	const panels = {};
	const triggers = header.locator( '.sgs-nav-bar-menu__mega-trigger' );
	const n = await triggers.count();
	for ( let i = 0; i < n; i++ ) {
		const t = triggers.nth( i );
		if ( ! ( await t.isVisible() ) ) {
			continue;
		}
		const name = ( await t.innerText() ).trim().split( '\n' )[ 0 ];
		await t.click();
		await page.waitForTimeout( 700 );
		const wrap = t.locator( 'xpath=following-sibling::*[@data-sgs-mega-panel][1]' );
		if ( await wrap.count() ) {
			const w = box( await wrap.boundingBox() );
			const child = await wrap.evaluate( ( el ) => {
				let widest = null;
				for ( const c of el.children ) {
					if ( [ 'STYLE', 'SCRIPT', 'TEMPLATE' ].includes( c.tagName ) ) {
						continue;
					}
					const r = c.getBoundingClientRect();
					if ( ! widest || r.width > widest.w ) {
						widest = { x: r.x, y: r.y, w: r.width, h: r.height };
					}
				}
				return widest;
			} );
			const aside = await wrap.evaluate( ( el ) => {
				const a = el.querySelector( '.sgs-mega-aside' );
				if ( ! a ) {
					return null;
				}
				const r = a.getBoundingClientRect();
				return { x: r.x, y: r.y, w: r.width, h: r.height };
			} );
			panels[ name ] = { wrap: w, panel: child, aside };
			await page.screenshot( { path: join( out, `${ copy }-1440-panel-${ name.toLowerCase().replace( /\W+/g, '-' ) }.png` ) } );
		}
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 400 );
	}
	return panels;
}

for ( const { width, ctx } of WIDTHS ) {
	const context = await browser.newContext( ctx );
	const page = await context.newPage();
	await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }nocache=${ Date.now() }`, { waitUntil: 'networkidle' } );
	await page.waitForTimeout( 800 );
	const header = page.locator( 'header.sgs-site-header' ).first();
	const res = { width };
	if ( 'indus' === copy && 1440 === width ) {
		res.pill = box( await header.boundingBox() );
		await page.screenshot( { path: join( out, `${ copy }-${ width }-closed.png` ) } );
		res.panels = await measurePanels( page, header );
	} else {
		Object.assign( res, await measureDrawer( page, width, header ) );
	}
	results[ width ] = res;

	const want = EXPECT[ copy ][ width ] || {};
	if ( want.pill && res.pill ) {
		for ( const k of [ 'x', 'y', 'w', 'h' ] ) {
			near( res.pill[ k ], want.pill[ k ], `${ width } pill ${ k }` );
		}
	}
	if ( want.burger && res.burger ) {
		near( res.burger.w, want.burger.w, `${ width } burger width` );
		near( res.burger.h, want.burger.h, `${ width } burger height` );
	}
	if ( res.tapCorners ) {
		const ok = res.tapCorners.every( Boolean );
		console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ width } 44x44 tap area: ${ res.tapCorners.join( ',' ) }` );
		failed += ok ? 0 : 1;
	}
	if ( want.open && res.open ) {
		for ( const k of [ 'x', 'y', 'w', 'h' ] ) {
			near( res.open[ k ], want.open[ k ], `${ width } open card ${ k }` );
		}
		near( res.open.y, res.pill.y, `${ width } card top = closed pill top` );
		near( res.open.x, res.pill.x, `${ width } card left = closed pill left` );
		near( res.open.w, res.pill.w, `${ width } card width = closed pill width` );
		console.log( `${ res.grown && res.burgerStillOnTop ? 'PASS' : 'FAIL' }  ${ width } header grown ${ res.grown }, burger on top ${ res.burgerStillOnTop }` );
		failed += res.grown && res.burgerStillOnTop ? 0 : 1;
	}
	if ( want.bars && 'lamalama' === copy ) {
		const c = res.barsClosed || [];
		const o = res.barsOpen || [];
		if ( 3 !== c.length || 3 !== o.length ) {
			console.log( `FAIL  ${ width } burger bars: found ${ c.length } closed / ${ o.length } open, expected 3` );
			failed++;
		} else {
			c.forEach( ( b, i ) => near( b.w, want.bars.w, `${ width } bar ${ i + 1 } length` ) );
			near( c[ 1 ].y - ( c[ 0 ].y + c[ 0 ].h ), want.bars.gap, `${ width } gap bar 1-2` );
			near( c[ 2 ].y - ( c[ 1 ].y + c[ 1 ].h ), want.bars.gap, `${ width } gap bar 2-3` );
			near( o[ 0 ].y - c[ 0 ].y, want.bars.travel, `${ width } open travel bar 1` );
			near( c[ 2 ].y - o[ 2 ].y, want.bars.travel, `${ width } open travel bar 3` );
			near( Math.max( ...o.map( ( b ) => b.y ) ) - Math.min( ...o.map( ( b ) => b.y ) ), 0, `${ width } open bars on one line (spread)` );
		}
	}
	if ( undefined !== want.ctas ) {
		const ctas = res.ctas || [];
		if ( 2 !== ctas.length ) {
			console.log( `FAIL  ${ width } drawer CTAs: found ${ ctas.length }, expected 2` );
			failed++;
		} else {
			ctas.forEach( ( b ) => near( b.w, want.ctas, `${ width } CTA "${ b.text }" width` ) );
		}
	}
	if ( undefined !== want.card ) {
		const got = res.card;
		const visible = got && got.w > 0 && got.h > 0;
		if ( null === want.card ) {
			console.log( `${ visible ? 'FAIL' : 'PASS' }  ${ width } corner card absent: ${ visible ? `${ got.w }x${ got.h }` : 'yes' }` );
			failed += visible ? 1 : 0;
		} else if ( ! visible ) {
			console.log( `FAIL  ${ width } corner card: not found` );
			failed++;
		} else {
			console.log( `${ got.fixed ? 'PASS' : 'FAIL' }  ${ width } corner card fixed to the viewport: ${ got.fixed }` );
			failed += got.fixed ? 0 : 1;
			for ( const k of [ 'top', 'right', 'w', 'h' ] ) {
				near( got[ k ], want.card[ k ], `${ width } corner card ${ k }` );
			}
		}
	}
	if ( want.panels && res.panels ) {
		for ( const [ name, ref ] of Object.entries( want.panels ) ) {
			const got = res.panels[ name ];
			if ( ! got || ! got.panel ) {
				console.log( `FAIL  ${ width } panel ${ name }: not found` );
				failed++;
				continue;
			}
			near( got.panel.x, ref.x, `${ width } ${ name } panel x` );
			near( got.panel.w, ref.w, `${ width } ${ name } panel width` );
			if ( ref.aside ) {
				if ( ! got.aside ) {
					console.log( `FAIL  ${ width } ${ name } aside: not found` );
					failed++;
					continue;
				}
				near( got.aside.x, ref.aside.x, `${ width } ${ name } aside x (beside the links)` );
				near( got.aside.w, ref.aside.w, `${ width } ${ name } aside width` );
				// Stacked would put the aside under ~300px of links; beside keeps its top within the panel's first 40px.
				const beside = got.aside.y - got.panel.y <= 40;
				console.log( `${ beside ? 'PASS' : 'FAIL' }  ${ width } ${ name } aside beside the links, not below (top offset ${ Math.round( got.aside.y - got.panel.y ) }px)` );
				failed += beside ? 0 : 1;
			}
		}
	}
	await context.close();
}

await browser.close();
writeFileSync( join( out, `${ copy }-measure.json` ), JSON.stringify( results, null, '\t' ) );
console.log( failed ? `\n${ failed } check(s) FAILED` : '\nALL CHECKS PASS' );
process.exit( failed ? 1 : 0 );
