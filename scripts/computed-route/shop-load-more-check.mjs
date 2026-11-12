#!/usr/bin/env node
/**
 * Live proof for the shop "Load more" mode (FR-30-3b, plan .claude/plans/archive/2026-11-02-shop-load-more.md Batch 2).
 *
 *   node scripts/computed-route/shop-load-more-check.mjs --target eye-care-test --case <name|all> [--headed] [--no-mods]
 *
 * Cases: first-mobile first-desktop click last back filter nojs a11y perf all.
 * Sets sgs_shop_pagination_mode=load_more, sgs_shop_batch_size=4, sgs_shop_desktop_first_load=8 over ssh, and restores
 * the originals in one finally block (LiteSpeed purged after each change). Each failed case prints the measured value
 * and the process exits 1.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname( fileURLToPath( import.meta.url ) );
const root = resolve( here, '..', '..' );
const { chromium } = await import( 'file:///C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/node_modules/playwright/index.mjs' );

const args = process.argv.slice( 2 );
const flag = ( name ) => args.includes( '--' + name );
const opt = ( name, fallback ) => {
	const i = args.indexOf( '--' + name );
	return i >= 0 ? args[ i + 1 ] : fallback;
};

const TARGETS = {
	'eye-care-test': {
		env: '.claude/secrets/eye-care-test.env',
		urlKey: 'WP_URL_EYECARETEST',
		path: '~/domains/darkcyan-grouse-898606.hostingersite.com/public_html',
	},
};
const target = TARGETS[ opt( 'target', 'eye-care-test' ) ];
if ( ! target ) {
	console.error( 'Unknown --target. Known: ' + Object.keys( TARGETS ).join( ', ' ) );
	process.exit(2);
}
const env = Object.fromEntries(
	readFileSync( resolve( root, target.env ), 'utf8' )
		.split( /\r?\n/ )
		.filter( ( l ) => l.includes( '=' ) && ! l.startsWith( '#' ) )
		.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ) ] )
);
const BASE = ( env[ target.urlKey ] || '' ).replace( /\/$/, '' );
if ( ! BASE ) {
	console.error( target.urlKey + ' missing from ' + target.env );
	process.exit(2);
}
const SHOP = BASE + '/shop/';
const BATCH = 4;
const MODS = { sgs_shop_pagination_mode: 'load_more', sgs_shop_batch_size: String( BATCH ), sgs_shop_desktop_first_load: '8' };

const ITEM = '.wp-block-woocommerce-product-collection li.wc-block-product';
const BUTTON = '.sgs-shop-load-more__button';
const COUNT = '.sgs-shop-load-more__count';
const ANNOUNCER = '.sgs-shop-load-more__announcer';

function ssh( command ) {
	const r = spawnSync( 'ssh', [ 'hd', 'cd ' + target.path + ' && ' + command ], { encoding: 'utf8' } );
	return { code: r.status, out: ( r.stdout || '' ).trim(), err: ( r.stderr || '' ).trim() };
}
const purge = () => ssh( 'wp litespeed-purge all' );

function fail( caseName, message ) {
	const e = new Error( message );
	e.caseName = caseName;
	throw e;
}
function expect( caseName, label, actual, expected ) {
	const ok = typeof expected === 'function' ? expected( actual ) : actual === expected;
	if ( ! ok ) {
		fail( caseName, label + ': measured ' + JSON.stringify( actual ) + ', expected ' + ( typeof expected === 'function' ? 'to satisfy ' + expected.toString() : JSON.stringify( expected ) ) );
	}
}

const cards = ( page ) => page.locator( ITEM ).count();
const batchesIn = ( url ) => parseInt( new URL( url ).searchParams.get( 'sgs_batches' ) || '1', 10 );
const histLen = ( page ) => page.evaluate( () => history.length );
async function waitCards( page, n, name ) {
	try {
		await page.waitForFunction( ( [ sel, want ] ) => document.querySelectorAll( sel ).length === want, [ ITEM, n ], { timeout: 20000 } );
	} catch ( e ) {
		fail( name, 'card count: measured ' + ( await cards( page ) ) + ', expected ' + n );
	}
}
async function open( browser, viewport, url, extra = {} ) {
	const context = await browser.newContext( { viewport, ...extra } );
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'networkidle' } );
	return { context, page };
}
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1440, height: 900 };

let TOTAL = 0;

const cases = {
	async 'first-mobile'( browser ) {
		const n = 'first-mobile';
		const { context, page } = await open( browser, MOBILE, SHOP );
		await waitCards( page, BATCH, n );
		expect( n, 'button text', ( await page.locator( BUTTON ).innerText() ).trim(), 'Load more' );
		expect( n, 'count text', ( await page.locator( COUNT ).innerText() ).trim(), `Showing ${ BATCH } of ${ TOTAL } products` );
		const visible = await page.locator( '.page-numbers' ).evaluateAll( ( els ) => els.filter( ( e ) => e.offsetParent !== null ).length );
		expect( n, 'visible .page-numbers', visible, 0 );
		await context.close();
	},
	async 'first-desktop'( browser ) {
		const n = 'first-desktop';
		const { context, page } = await open( browser, DESKTOP, SHOP );
		const before = await histLen( page );
		await waitCards( page, 8, n );
		expect( n, 'url sgs_batches', batchesIn( page.url() ), 2 );
		expect( n, 'history.length change', ( await histLen( page ) ) - before, 0 );
		await context.close();
	},
	async click( browser ) {
		const n = 'click';
		const { context, page } = await open( browser, MOBILE, SHOP );
		await waitCards( page, BATCH, n );
		const before = await histLen( page );
		for ( const [ k, loaded ] of [ [ 2, 8 ], [ 3, 12 ] ] ) {
			await page.locator( BUTTON ).click();
			await waitCards( page, loaded, n );
			expect( n, 'url sgs_batches', batchesIn( page.url() ), k );
			expect( n, 'history.length change', ( await histLen( page ) ) - before, 0 );
			const focused = await page.evaluate( ( sel ) => {
				const items = [ ...document.querySelectorAll( sel ) ];
				const a = document.activeElement;
				return items.findIndex( ( li ) => li.contains( a ) );
			}, ITEM );
			expect( n, 'focused card index', focused, loaded - BATCH );
			expect( n, 'live region', ( await page.locator( ANNOUNCER ).innerText() ).trim(), `${ BATCH } more products loaded. Showing ${ loaded } of ${ TOTAL } products.` );
		}
		// A loaded card must be hydrated: its wishlist toggle flips aria-pressed.
		const toggle = page.locator( ITEM ).nth( 9 ).locator( '[data-wp-on--click$="actions.toggle"]' ).first();
		if ( await toggle.count() ) {
			const was = await toggle.getAttribute( 'aria-pressed' );
			await toggle.click();
			await page.waitForFunction( ( [ el, prev ] ) => el.getAttribute( 'aria-pressed' ) !== prev, [ await toggle.elementHandle(), was ], { timeout: 8000 } )
				.catch( () => fail( n, 'loaded card toggle: aria-pressed stayed ' + was + ' (card not hydrated)' ) );
		} else {
			fail( n, 'no hydration control found on loaded card 10 (selector [data-wp-on--click$="actions.toggle"])' );
		}
		const add = page.locator( ITEM ).nth( 9 ).locator( '.add_to_cart_button, button[name="add-to-cart"]' ).first();
		if ( await add.count() ) {
			const badge = page.locator( '.wc-block-mini-cart__badge' ).first();
			const read = async () => parseInt( ( await badge.innerText().catch( () => '0' ) ).replace( /\D/g, '' ) || '0', 10 );
			const c0 = await read();
			await add.click();
			await page.waitForTimeout( 2500 );
			expect( n, 'cart count after add-to-basket', await read(), ( v ) => v > c0 );
		}
		await context.close();
	},
	async last( browser ) {
		const n = 'last';
		const { context, page } = await open( browser, MOBILE, SHOP );
		let loaded = BATCH;
		while ( loaded < TOTAL ) {
			await page.locator( BUTTON ).click();
			loaded = Math.min( TOTAL, loaded + BATCH );
			await waitCards( page, loaded, n );
		}
		expect( n, 'buttons left', await page.locator( BUTTON ).count(), 0 );
		expect( n, 'count text', ( await page.locator( COUNT ).innerText() ).trim(), `Showing ${ TOTAL } of ${ TOTAL } products` );
		expect( n, 'live region', ( await page.locator( ANNOUNCER ).innerText() ).trim(), `All ${ TOTAL } products shown.` );
		await context.close();
	},
	async back( browser ) {
		const n = 'back';
		const { context, page } = await open( browser, DESKTOP, SHOP + '?sgs_batches=3' );
		await waitCards( page, 12, n );
		const card = page.locator( ITEM ).nth( 9 );
		await card.scrollIntoViewIfNeeded();
		const id = ( await card.getAttribute( 'class' ) ).match( /post-(\d+)/ )[ 1 ];
		await card.locator( 'a[href]' ).first().click();
		await page.waitForURL( ( u ) => ! u.pathname.startsWith( '/shop' ), { timeout: 20000 } );
		await page.goBack( { waitUntil: 'load' } );
		await waitCards( page, 12, n );
		expect( n, 'url sgs_batches', batchesIn( page.url() ), 3 );
		await page.waitForTimeout( 800 );
		const delta = await page.evaluate( ( sel ) => {
			const r = document.querySelector( sel ).getBoundingClientRect();
			return Math.round( ( r.top + r.height / 2 ) - window.innerHeight / 2 );
		}, ITEM + '.post-' + id );
		expect( n, 'clicked card centre offset from viewport middle (px)', delta, ( v ) => Math.abs( v ) <= 100 );
		await context.close();
	},
	async filter( browser ) {
		const n = 'filter';
		const { context, page } = await open( browser, DESKTOP, SHOP + '?sgs_batches=3' );
		await waitCards( page, 12, n );
		await page.getByRole( 'checkbox', { name: /ray-?ban/i } ).first().check();
		await page.waitForFunction( () => /brands=/.test( location.search ), null, { timeout: 20000 } );
		await page.waitForTimeout( 2500 );
		expect( n, 'sgs_batches after filter', batchesIn( page.url() ), 1 );
		const filteredTotal = await page.evaluate( ( sel ) => {
			const t = document.querySelector( sel );
			const m = t ? t.textContent.match( /\d+/g ) : null;
			return m ? parseInt( m[ m.length - 1 ], 10 ) : -1;
		}, '.wp-block-woocommerce-product-results-count' );
		expect( n, 'cards after filter', await cards( page ), Math.min( BATCH, filteredTotal ) );
		const chip = page.locator( '.sgs-shop-chosen__pill:visible, .wc-block-product-filter-removable-chips__item button:visible' ).first();
		await chip.click();
		await page.waitForFunction( () => ! /brands=/.test( location.search ), null, { timeout: 20000 } );
		await page.waitForTimeout( 1500 );
		expect( n, 'cards after chip removal', await cards( page ), ( v ) => v >= BATCH );
		await page.goto( SHOP + '?sgs_batches=3', { waitUntil: 'networkidle' } );
		await waitCards( page, 12, n );
		const sort = page.locator( 'select[name="orderby"], select.wc-block-product-sort-select__select, select.orderby' ).first();
		await sort.selectOption( { index: 1 } );
		await page.waitForFunction( () => /orderby=/.test( location.search ), null, { timeout: 20000 } );
		await page.waitForTimeout( 2500 );
		expect( n, 'sgs_batches after sort', batchesIn( page.url() ), 1 );
		expect( n, 'cards after sort', await cards( page ), BATCH );
		await context.close();
	},
	async nojs( browser ) {
		const n = 'nojs';
		const { context, page } = await open( browser, MOBILE, SHOP, { javaScriptEnabled: false } );
		expect( n, 'cards', await cards( page ), BATCH );
		const firstIds = await page.locator( ITEM ).evaluateAll( ( els ) => els.map( ( e ) => e.className.match( /post-(\d+)/ )[ 1 ] ) );
		const next = page.locator( '.wp-block-query-pagination-next' );
		expect( n, 'Next link present', await next.count(), 1 );
		await next.click();
		await page.waitForLoadState( 'load' );
		const secondIds = await page.locator( ITEM ).evaluateAll( ( els ) => els.map( ( e ) => e.className.match( /post-(\d+)/ )[ 1 ] ) );
		expect( n, 'page 2 cards', secondIds.length, BATCH );
		expect( n, 'page 2 repeats page 1 cards', secondIds.filter( ( id ) => firstIds.includes( id ) ).length, 0 );
		await context.close();
	},
	async a11y( browser ) {
		const n = 'a11y';
		const { context, page } = await open( browser, MOBILE, SHOP );
		await waitCards( page, BATCH, n );
		const height = await page.locator( BUTTON ).evaluate( ( el ) => el.getBoundingClientRect().height );
		expect( n, 'button height at 375px', height, ( v ) => v >= 44 );
		await page.locator( BUTTON ).focus();
		expect( n, 'button reachable by focus', await page.evaluate( () => document.activeElement.className ), ( v ) => String( v ).includes( 'sgs-shop-load-more__button' ) );
		await page.keyboard.press( 'Enter' );
		await waitCards( page, 8, n );
		// After the router swap the focus sits on a card; Tab back to the new button for Space.
		await page.locator( BUTTON ).focus();
		await page.keyboard.press( 'Space' );
		await waitCards( page, 12, n );
		await page.addScriptTag( { path: resolve( root, 'plugins/sgs-blocks/node_modules/axe-core/axe.min.js' ) } );
		const result = await page.evaluate( async () => ( await window.axe.run( document, { runOnly: [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa' ] } ) ).violations.map( ( v ) => v.id + ' x' + v.nodes.length ) );
		expect( n, 'axe violations with 12 loaded', result, ( v ) => v.length === 0 );
		await context.close();
	},
	async perf( browser ) {
		const n = 'perf';
		const context = await browser.newContext( { viewport: DESKTOP } );
		const page = await context.newPage();
		await page.addInitScript( () => {
			window.__cls = 0;
			new PerformanceObserver( ( list ) => {
				for ( const e of list.getEntries() ) {
					if ( ! e.hadRecentInput ) {
						window.__cls += e.value;
					}
				}
			} ).observe( { type: 'layout-shift', buffered: true } );
		} );
		const sizes = { js: 0, css: 0, lmJs: 0, lmCss: 0 };
		page.on( 'response', async ( res ) => {
			const url = res.url();
			const type = res.request().resourceType();
			if ( ! [ 'script', 'stylesheet' ].includes( type ) ) {
				return;
			}
			const len = parseInt( ( await res.allHeaders() )[ 'content-length' ] || '0', 10 ) || ( await res.body().catch( () => Buffer.alloc( 0 ) ) ).length;
			sizes[ type === 'script' ? 'js' : 'css' ] += len;
			if ( /sgs-shop-load-more\.js|sgs-load-more-core\.js/.test( url ) ) {
				sizes.lmJs += len;
			}
			if ( /shop-load-more\.css/.test( url ) ) {
				sizes.lmCss += len;
			}
		} );
		await page.goto( SHOP, { waitUntil: 'networkidle' } );
		await waitCards( page, 8, n );
		await page.waitForTimeout( 1500 );
		const cls = await page.evaluate( () => window.__cls );
		console.log( `perf: js ${ sizes.js } B, css ${ sizes.css } B (transferred or decoded), load-more js ${ sizes.lmJs } B, load-more css ${ sizes.lmCss } B, CLS ${ cls.toFixed( 4 ) }` );
		// The feature's own weight is the gate here; the whole shop page's JS and CSS budgets (< 50 KB / < 100 KB)
		// are measured above and owned by the shop page's performance row, not by this mode.
		expect( n, 'load-more JS bytes', sizes.lmJs, ( v ) => v < 6 * 1024 );
		expect( n, 'load-more CSS bytes', sizes.lmCss, ( v ) => v < 3 * 1024 );
		expect( n, 'CLS across the top-up', cls, ( v ) => v <= 0.05 );
		await context.close();
	},
};

const wanted = opt( 'case', 'all' );
const names = 'all' === wanted ? Object.keys( cases ) : [ wanted ];
if ( names.some( ( c ) => ! cases[ c ] ) ) {
	console.error( 'Unknown case. Known: ' + Object.keys( cases ).join( ', ' ) + ', all' );
	process.exit(2);
}

const original = {};
let failures = 0;
let browser;
try {
	if ( ! flag( 'no-mods' ) ) {
		for ( const key of Object.keys( MODS ) ) {
			const r = ssh( `wp theme mod get ${ key } --format=json` );
			let value = null;
			try {
				const rows = JSON.parse( r.out );
				const row = Array.isArray( rows ) ? rows.find( ( x ) => x.key === key ) : null;
				value = row && '' !== String( row.value ) ? String( row.value ) : null;
			} catch ( e ) {
				value = null;
			}
			original[ key ] = value;
		}
		for ( const [ key, value ] of Object.entries( MODS ) ) {
			const r = ssh( `wp theme mod set ${ key } ${ value }` );
			if ( r.code !== 0 ) {
				throw new Error( 'could not set ' + key + ': ' + r.err );
			}
		}
		purge();
	}
	const count = ssh( 'wp post list --post_type=product --post_status=publish --format=count' );
	TOTAL = parseInt( count.out, 10 );
	if ( ! TOTAL ) {
		throw new Error( 'could not count published products over ssh: ' + count.err );
	}
	browser = await chromium.launch( { headless: ! flag( 'headed' ) } );
	for ( const name of names ) {
		try {
			await cases[ name ]( browser );
			console.log( 'PASS ' + name );
		} catch ( e ) {
			failures++;
			console.error( 'FAIL ' + name + ': ' + e.message );
		}
	}
} catch ( e ) {
	failures++;
	console.error( 'ERROR ' + e.message );
} finally {
	if ( browser ) {
		await browser.close();
	}
	if ( ! flag( 'no-mods' ) ) {
		for ( const key of Object.keys( MODS ) ) {
			if ( ! ( key in original ) ) {
				continue;
			}
			if ( null === original[ key ] ) {
				ssh( `wp theme mod remove ${ key }` );
			} else {
				const v = original[ key ].replace( /^"|"$/g, '' );
				ssh( `wp theme mod set ${ key } '${ v.replace( /'/g, "'\\''" ) }'` );
			}
		}
		purge();
		console.log( 'restored theme mods: ' + JSON.stringify( original ) );
	}
}
process.exit( failures ? 1 : 0 );
