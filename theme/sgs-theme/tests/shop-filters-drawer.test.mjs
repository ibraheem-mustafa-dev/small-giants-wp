/**
 * The shop filter drawer's CSS, in Chromium, on tests/fixtures/shop-filters-drawer.html (the theme's real
 * woocommerce.css and the container block's real style.css, plus the drawer CSS the theme prints after woocommerce.css
 * for a saved `sgs_shop_filter_drawer_breakpoint`, through tests/run-shop-filters-drawer-css-standalone.php --print).
 *
 * - F-28: a closed `dialog#sgs-shop-filters` takes no space whatever layout class the panel carries, at 375 and 1440;
 *   open, it is the full-height sheet at 375 and the in-flow sidebar at 1440; closing the sheet still plays its slide-out.
 * - F-68: the drawer rules follow the option: never saved, every element computes exactly what woocommerce.css alone gave
 *   before the rules moved out of it; at 1060 the drawer is in force from 1059 down and the sidebar from 1060 up.
 *
 * Run from the repo root: node --test theme/sgs-theme/tests/shop-filters-drawer.test.mjs
 * Needs Playwright's Chromium (installed under scripts/computed-route), php and git on the PATH.
 * SGS_WC_CSS=<file> tests another copy of woocommerce.css on its own, the way the theme loaded it before the drawer CSS
 * was printed from the option (a MUST FAIL run against the old file).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const THEME = path.resolve( HERE, '..' );
const REPO = path.resolve( THEME, '..', '..' );
const require = createRequire( path.join( REPO, 'scripts', 'computed-route', 'package.json' ) );
const { chromium } = require( 'playwright' );

const FIXTURE = pathToFileURL( path.join( HERE, 'fixtures', 'shop-filters-drawer.html' ) ).href;
const WC_CSS = process.env.SGS_WC_CSS ? path.resolve( process.env.SGS_WC_CSS ) : null;

// Every layout class the panel can carry: no class, sgs/container's markers and scope rules, WordPress's layout classes.
const LAYOUTS = [
	'',
	'sgs-container--stack',
	'sgs-container--grid',
	'sgs-container--flex',
	'sgs-container--has-min-height',
	'sgs-container-t1',
	'sgs-container-t2',
	'is-layout-flex',
	'is-layout-grid',
	'is-layout-constrained',
	'is-layout-flow',
];

let browser;
before( async () => {
	browser = await chromium.launch();
} );
after( async () => {
	await browser?.close();
} );

// woocommerce.css as it was before its breakpoint rules moved to shop-filters-drawer.css (the F-28 commit).
const BEFORE_MOVE = '5d4ac5ae0';

/** The drawer CSS the theme prints after woocommerce.css for a saved option value (undefined: never saved). */
function drawerCss( saved ) {
	const args = [ path.join( HERE, 'run-shop-filters-drawer-css-standalone.php' ), '--print' ];
	if ( saved !== undefined ) {
		args.push( String( saved ) );
	}
	return execFileSync( 'php', args, { encoding: 'utf8' } );
}

/**
 * A page at the given width on the fixture. By default the stylesheet is the theme's woocommerce.css followed by the
 * drawer CSS for `saved`; `css` replaces both with one stylesheet's text; SGS_WC_CSS replaces both with that file.
 */
async function open( width, { saved, css } = {} ) {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.goto( FIXTURE );
	if ( css !== undefined ) {
		await page.evaluate( ( text ) => {
			const link = document.getElementById( 'sgs-woocommerce-css' );
			const style = document.createElement( 'style' );
			style.textContent = text;
			link.replaceWith( style );
		}, css );
	} else if ( WC_CSS ) {
		await page.evaluate( async ( href ) => {
			const link = document.getElementById( 'sgs-woocommerce-css' );
			await new Promise( ( resolve ) => {
				link.onload = resolve;
				link.href = href;
			} );
		}, pathToFileURL( WC_CSS ).href );
	} else {
		// Printed right after the stylesheet, where wp_add_inline_style puts it.
		await page.evaluate( ( text ) => {
			const style = document.createElement( 'style' );
			style.textContent = text;
			document.getElementById( 'sgs-woocommerce-css' ).after( style );
		}, drawerCss( saved ) );
	}
	return page;
}

async function setLayout( page, cls ) {
	await page.evaluate( ( c ) => {
		const d = document.getElementById( 'sgs-shop-filters' );
		d.className = 'wp-block-sgs-container sgs-container sgs-shop-filters' + ( c ? ' ' + c : '' );
		if ( d.open ) {
			d.close();
		}
	}, cls );
	await page.waitForTimeout( 450 ); // Past any exit transition.
}

function panelBox( page ) {
	return page.evaluate( () => {
		const d = document.getElementById( 'sgs-shop-filters' );
		const r = d.getBoundingClientRect();
		const cs = getComputedStyle( d );
		const grid = document.querySelector( '.fixture-grid' ).getBoundingClientRect();
		return { display: cs.display, position: cs.position, height: r.height, gridTop: grid.top };
	} );
}

/** Where the product grid starts with no panel in the page at all. */
function gridTopWithoutPanel( page ) {
	return page.evaluate( () => {
		const d = document.getElementById( 'sgs-shop-filters' );
		const parent = d.parentNode;
		const next = d.nextSibling;
		d.remove();
		const top = document.querySelector( '.fixture-grid' ).getBoundingClientRect().top;
		parent.insertBefore( d, next );
		return top;
	} );
}

for ( const width of [ 375, 1440 ] ) {
	test( `F-28: a closed panel takes no space at ${ width } whatever its layout class (MUST FAIL on the old CSS)`, async () => {
		const page = await open( width );
		const failures = [];
		for ( const cls of LAYOUTS ) {
			await setLayout( page, cls );
			const box = await panelBox( page );
			const bare = await gridTopWithoutPanel( page );
			if ( box.display !== 'none' || box.height !== 0 || box.gridTop !== bare ) {
				failures.push( `${ cls || '(none)' }: display ${ box.display }, height ${ box.height }, grid top ${ box.gridTop } (without the panel ${ bare })` );
			}
		}
		await page.close();
		assert.deepEqual( failures, [] );
	} );
}

test( 'F-28 negative control: open, the panel is the full-height sheet at 375 and the in-flow sidebar at 1440', async () => {
	for ( const width of [ 375, 1440 ] ) {
		const page = await open( width );
		for ( const cls of LAYOUTS ) {
			await setLayout( page, cls );
			await page.evaluate( ( w ) => {
				const d = document.getElementById( 'sgs-shop-filters' );
				w < 782 ? d.showModal() : d.show();
			}, width );
			await page.waitForTimeout( 450 );
			const box = await panelBox( page );
			if ( width < 782 ) {
				assert.equal( box.position, 'fixed', `${ cls } at ${ width }` );
				assert.equal( box.height, 800, `${ cls } at ${ width }: the sheet fills the viewport` );
			} else {
				assert.notEqual( box.display, 'none', `${ cls } at ${ width }` );
				assert.ok( box.height > 1790, `${ cls } at ${ width }: the sidebar holds its filters (${ box.height })` );
			}
		}
		await page.close();
	}
} );

test( 'F-28: closing the sheet at 375 still slides it out before it leaves the page', async () => {
	for ( const cls of [ '', 'sgs-container--stack' ] ) {
		const page = await open( 375 );
		await setLayout( page, cls );
		await page.evaluate( () => document.getElementById( 'sgs-shop-filters' ).showModal() );
		await page.waitForTimeout( 500 );
		const states = await page.evaluate( async () => {
			const d = document.getElementById( 'sgs-shop-filters' );
			const read = () => {
				const cs = getComputedStyle( d );
				return { display: cs.display, translate: cs.translate, height: d.getBoundingClientRect().height };
			};
			const opened = read();
			d.close();
			await new Promise( ( r ) => setTimeout( r, 120 ) );
			const closing = read();
			await new Promise( ( r ) => setTimeout( r, 500 ) );
			return { opened, closing, closed: read() };
		} );
		await page.close();
		const y = ( t ) => parseFloat( String( t ).split( ' ' )[ 1 ] ?? '0' );
		assert.equal( y( states.opened.translate ), 0, `${ cls || '(none)' }: open sheet at rest` );
		assert.notEqual( states.closing.display, 'none', `${ cls || '(none)' }: still painted while it slides out` );
		assert.ok( y( states.closing.translate ) > 0, `${ cls || '(none)' }: sliding down (${ states.closing.translate })` );
		assert.equal( states.closed.display, 'none', `${ cls || '(none)' }: gone once the slide ends` );
		assert.equal( states.closed.height, 0, `${ cls || '(none)' }: no box once closed` );
	}
} );

// ── F-68: the drawer rules follow sgs_shop_filter_drawer_breakpoint ──

const BODIES = [
	'is-enhanced',
	'is-enhanced sgs-shop-toggle-outlined sgs-shop-filters-plain sgs-shop-no-sticky-trigger sgs-shop-drawer-caps',
	'',
];

/**
 * Every computed property of every drawer part, with the panel closed, open (the sheet below `breakpoint`, the sidebar
 * from it) and as the template's <aside> before the script runs, for each body class set.
 */
async function computedParts( page, breakpoint ) {
	const out = {};
	for ( const body of BODIES ) {
		for ( const state of [ 'closed', 'open', 'aside' ] ) {
			await page.evaluate( ( { body: b, state: st, breakpoint: bp } ) => {
				document.body.className = b;
				const swap = ( from, tag ) => {
					const el = document.createElement( tag );
					el.id = from.id;
					el.className = from.className;
					el.append( ...from.childNodes );
					from.replaceWith( el );
					return el;
				};
				let panel = document.getElementById( 'sgs-shop-filters' );
				if ( panel.tagName === 'ASIDE' ) {
					panel = swap( panel, 'dialog' );
				}
				if ( panel.open ) {
					panel.close();
				}
				if ( st === 'open' ) {
					window.innerWidth < bp ? panel.showModal() : panel.show();
				} else if ( st === 'aside' ) {
					swap( panel, 'aside' );
				}
			}, { body, state, breakpoint } );
			await page.waitForTimeout( 450 );
			out[ `${ body || '(no body class)' } / ${ state }` ] = await page.evaluate( () => {
				const read = ( el, pseudo ) => {
					const cs = getComputedStyle( el, pseudo );
					const o = {};
					for ( let i = 0; i < cs.length; i++ ) {
						o[ cs[ i ] ] = cs.getPropertyValue( cs[ i ] );
					}
					return o;
				};
				const panel = document.getElementById( 'sgs-shop-filters' );
				const toggle = document.querySelector( '.sgs-shop-filters__toggle' );
				return {
					layout: read( document.querySelector( '.sgs-shop-layout' ) ),
					panel: read( panel ),
					backdrop: read( panel, '::backdrop' ),
					toggle: read( toggle ),
					close: read( document.querySelector( '.sgs-shop-filters__close' ) ),
					scroll: read( document.querySelector( '.sgs-shop-filters__scroll' ) ),
					footer: read( document.querySelector( '.sgs-shop-filters__sheet-footer' ) ),
					sticky: read( document.querySelector( '.sgs-shop-filters__sticky-trigger' ) ),
					grid: read( document.querySelector( '.fixture-grid' ) ),
				};
			} );
		}
	}
	return out;
}

function differences( a, b ) {
	const diffs = [];
	for ( const key of Object.keys( a ) ) {
		for ( const part of Object.keys( a[ key ] ) ) {
			for ( const prop of Object.keys( a[ key ][ part ] ) ) {
				if ( a[ key ][ part ][ prop ] !== b[ key ]?.[ part ]?.[ prop ] ) {
					diffs.push( `${ key } ${ part } ${ prop }: ${ a[ key ][ part ][ prop ] } -> ${ b[ key ]?.[ part ]?.[ prop ] }` );
				}
			}
		}
	}
	return diffs;
}

test( 'F-68: option never saved, every drawer part computes what woocommerce.css alone gave before the move', { skip: Boolean( WC_CSS ) }, async () => {
	const before = execFileSync( 'git', [ 'show', `${ BEFORE_MOVE }:theme/sgs-theme/assets/css/woocommerce.css` ], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 24 } );
	assert.match( before, /@media \( max-width: 781\.98px \)/, 'the old file holds the rules this test compares' );
	for ( const width of [ 375, 781, 782, 1060, 1440 ] ) {
		const oldPage = await open( width, { css: before } );
		const newPage = await open( width );
		const a = await computedParts( oldPage, 782 );
		const b = await computedParts( newPage, 782 );
		await oldPage.close();
		await newPage.close();
		assert.ok( Object.keys( a ).length === 9 && Object.keys( a[ 'is-enhanced / open' ].panel ).length > 300, 'the snapshot reads every property' );
		assert.deepEqual( differences( a, b ), [], `at ${ width }` );
	}
} );

/** The presentation in force at a width: drawer (toggle shown, one column, floating trigger allowed) or sidebar. */
async function presentation( width, saved ) {
	const page = await open( width, { saved } );
	await setLayout( page, 'sgs-container--stack' );
	const closed = await page.evaluate( () => {
		const cs = ( s ) => getComputedStyle( document.querySelector( s ) );
		return {
			toggle: cs( '.sgs-shop-filters__toggle' ).display,
			layout: cs( '.sgs-shop-layout' ).display,
			sticky: cs( '.sgs-shop-filters__sticky-trigger' ).display,
		};
	} );
	await page.evaluate( ( bp ) => {
		const d = document.getElementById( 'sgs-shop-filters' );
		window.innerWidth < bp ? d.showModal() : d.show();
	}, saved ?? 782 );
	await page.waitForTimeout( 450 );
	const opened = await page.evaluate( () => {
		const d = document.getElementById( 'sgs-shop-filters' );
		const cs = getComputedStyle( d );
		return {
			position: cs.position,
			height: d.getBoundingClientRect().height,
			footer: getComputedStyle( d.querySelector( '.sgs-shop-filters__sheet-footer' ) ).display,
		};
	} );
	await page.close();
	const drawer = closed.toggle === 'inline-flex' && closed.layout === 'block' && closed.sticky !== 'none' &&
		opened.position === 'fixed' && opened.height === 800 && opened.footer === 'flex';
	const sidebar = closed.toggle === 'none' && closed.layout === 'grid' && closed.sticky === 'none' &&
		opened.position === 'sticky' && opened.footer === 'none';
	return { kind: drawer ? 'drawer' : ( sidebar ? 'sidebar' : 'mixed' ), closed, opened };
}

for ( const [ saved, cases ] of [
	[ undefined, [ [ 375, 'drawer' ], [ 781, 'drawer' ], [ 782, 'sidebar' ], [ 1440, 'sidebar' ] ] ],
	[ 1060, [ [ 375, 'drawer' ], [ 900, 'drawer' ], [ 1059, 'drawer' ], [ 1060, 'sidebar' ], [ 1080, 'sidebar' ], [ 1440, 'sidebar' ] ] ],
] ) {
	const label = saved === undefined ? 'never saved (782)' : `saved ${ saved } (MUST FAIL on the old CSS)`;
	test( `F-68: option ${ label }: the drawer below the breakpoint, the sidebar from it`, async () => {
		const wrong = [];
		for ( const [ width, want ] of cases ) {
			const got = await presentation( width, saved );
			if ( got.kind !== want ) {
				wrong.push( `${ width }: want ${ want }, got ${ got.kind } ${ JSON.stringify( got ) }` );
			}
		}
		assert.deepEqual( wrong, [] );
	} );
}
