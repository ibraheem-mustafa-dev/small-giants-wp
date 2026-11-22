/**
 * The shop filter drawer's CSS, in Chromium, on tests/fixtures/shop-filters-drawer.html (the theme's real
 * woocommerce.css and the container block's real style.css).
 *
 * - A closed `dialog#sgs-shop-filters` takes no space whatever layout class the panel carries, at 375 and 1440; open, it
 *   is the full-height sheet at 375 and the in-flow sidebar at 1440; closing the sheet still plays its slide-out.
 *
 * Run from the repo root: node --test theme/sgs-theme/tests/shop-filters-drawer.test.mjs
 * Needs Playwright's Chromium (installed under scripts/computed-route).
 * SGS_WC_CSS=<file> tests another copy of woocommerce.css (a MUST FAIL run against the old file).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
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

/** A page at the given width on the fixture, with the stylesheet under test. */
async function open( width ) {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.goto( FIXTURE );
	if ( WC_CSS ) {
		await page.evaluate( async ( href ) => {
			const link = document.getElementById( 'sgs-woocommerce-css' );
			await new Promise( ( resolve ) => {
				link.onload = resolve;
				link.href = href;
			} );
		}, pathToFileURL( WC_CSS ).href );
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
