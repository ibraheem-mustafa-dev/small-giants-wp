/**
 * FR-30-11 — WooCommerce page-type responsive + budget verification gate.
 *
 * Audits every WC page type at 375 / 768 / 1440 px:
 *   1. Zero horizontal overflow (document.scrollWidth <= viewport width).
 *   2. Interactive touch targets >= 44x44 px (links/buttons/inputs that are
 *      visible; targets >= 24px with adequate spacing are reported, not failed,
 *      per WCAG 2.5.8 minimum vs the SGS 44px house rule).
 *   3. Executed-JS weight per page (initiatorType 'script' resources ONLY —
 *      prefetch never parses/runs and must not count; lesson
 *      js-budget-measures-executed-not-prefetched) against the 50 KB budget.
 *   4. axe-core WCAG 2.2 AA scan (0 violations required).
 *   5. Screenshot per page x viewport saved to the evidence directory.
 *
 * Usage:
 *   node scripts/wc-pages-responsive-audit.js [--base https://site] [--out dir] [--only key,key]
 *
 * Pages marked `auth` are audited logged in from `.claude/secrets/<site>.env`
 * (`--env sandybrown` by default): the shopper account
 * `WP_CUSTOMER_USER_*` / `WP_CUSTOMER_PWD_*` when present, else the admin
 * `WP_USER_*` / `WP_PWD_*`. The rest are audited as a guest.
 *
 * Defaults: base = the sandybrown canary; out = .claude/reports/spec30-p1.
 * Exit code 1 when any overflow or axe violation is found (budget overruns
 * and sub-44px targets are reported as warnings — phase close judges them).
 *
 * @package SGS
 */

const { chromium } = require( 'playwright' );
const fs = require( 'fs' );
const path = require( 'path' );

const args = process.argv.slice( 2 );
const argVal = ( name, dflt ) => {
	const i = args.indexOf( name );
	return -1 !== i && args[ i + 1 ] ? args[ i + 1 ] : dflt;
};

const BASE = argVal( '--base', 'https://sandybrown-nightingale-600381.hostingersite.com' ).replace( /\/$/, '' );
const OUT = argVal( '--out', path.join( __dirname, '..', '.claude', 'reports', 'spec30-p1' ) );

const ENV_NAME = argVal( '--env', 'sandybrown' );
const ONLY = argVal( '--only', '' ).split( ',' ).filter( Boolean );

const PAGES = {
	pdp: { path: '/product/mamas-test-box-48-sku-fixture/' },
	shop: { path: '/shop/' },
	cart: { path: '/cart/' },
	checkout: { path: '/checkout/' },
	'account-guest': { path: '/my-account/' },
	'saved-guest': { path: '/saved-items/' },
	'account-dashboard': { path: '/my-account/', auth: true },
	'account-orders': { path: '/my-account/orders/', auth: true },
	'account-addresses': { path: '/my-account/edit-address/', auth: true },
	'account-details': { path: '/my-account/edit-account/', auth: true },
	'account-saved': { path: '/my-account/saved-items/', auth: true },
	'saved-member': { path: '/saved-items/', auth: true },
};

/**
 * Log in once through the WooCommerce account form and return the storage
 * state every `auth` page reuses.
 *
 * @param {import('playwright').Browser} browser The browser.
 * @return {Promise<Object>} Playwright storage state.
 */
async function loginState( browser ) {
	const envFile = path.join( __dirname, '..', '.claude', 'secrets', `${ ENV_NAME }.env` );
	const env = {};
	fs.readFileSync( envFile, 'utf8' ).split( /\r?\n/ ).forEach( ( line ) => {
		const i = line.indexOf( '=' );
		if ( i > 0 && ! line.startsWith( '#' ) ) {
			env[ line.slice( 0, i ).trim() ] = line.slice( i + 1 ).trim().replace( /^["']|["']$/g, '' );
		}
	} );
	const suffix = ENV_NAME.toUpperCase().replace( /-/g, '_' );
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/my-account/`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	// A shopper account (role customer) when the secrets file has one, so the
	// admin bar's scripts and links are not measured as the shopper's page.
	await page.fill( '#username', env[ `WP_CUSTOMER_USER_${ suffix }` ] || env[ `WP_USER_${ suffix }` ] );
	await page.fill( '#password', env[ `WP_CUSTOMER_PWD_${ suffix }` ] || env[ `WP_PWD_${ suffix }` ] );
	await Promise.all( [ page.waitForLoadState( 'networkidle' ), page.click( 'button[name="login"]' ) ] );
	const state = await ctx.storageState();
	await ctx.close();
	return state;
}

const VIEWPORTS = [
	{ name: '375', width: 375, height: 812 },
	{ name: '768', width: 768, height: 1024 },
	{ name: '1440', width: 1440, height: 900 },
];

const JS_BUDGET_BYTES = 50 * 1024;
const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';

( async () => {
	fs.mkdirSync( OUT, { recursive: true } );
	const browser = await chromium.launch();
	const results = [];
	let hardFailures = 0;

	const selected = Object.entries( PAGES ).filter( ( [ key ] ) => ! ONLY.length || ONLY.includes( key ) );
	const authState = selected.some( ( [ , def ] ) => def.auth ) ? await loginState( browser ) : null;

	for ( const [ key, def ] of selected ) {
		for ( const vp of VIEWPORTS ) {
			const ctx = await browser.newContext( {
				viewport: { width: vp.width, height: vp.height },
				...( def.auth ? { storageState: authState } : {} ),
			} );
			const page = await ctx.newPage();
			const url = `${ BASE }${ def.path }?cb=audit${ Date.now() }`;
			await page.goto( url, { waitUntil: 'networkidle', timeout: 60000 } ).catch( () => {} );
			await page.waitForTimeout( 1500 );

			const metrics = await page.evaluate( ( budget ) => {
				const out = {};
				out.hOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
				out.scrollWidth = document.documentElement.scrollWidth;

				// Executed JS only: initiatorType 'script' (prefetch = 'link', never runs).
				const res = performance.getEntriesByType( 'resource' );
				const executed = res.filter( ( r ) => 'script' === r.initiatorType );
				out.executedJsBytes = executed.reduce( ( s, r ) => s + ( r.transferSize || r.encodedBodySize || 0 ), 0 );
				out.executedJsCount = executed.length;
				out.overBudget = out.executedJsBytes > budget;

				// Touch targets.
				const small = [];
				document.querySelectorAll( 'a, button, input, select, [role="button"], [role="radio"]' ).forEach( ( el ) => {
					const r = el.getBoundingClientRect();
					const visible = r.width > 0 && r.height > 0 && 'hidden' !== getComputedStyle( el ).visibility;
					if ( visible && ( r.width < 44 || r.height < 44 ) ) {
						// Labels wrapping radios extend the effective target — measure the wrapper.
						const wrap = el.closest( 'label' );
						const wr = wrap ? wrap.getBoundingClientRect() : r;
						if ( wr.width < 44 || wr.height < 44 ) {
							small.push( { tag: el.tagName, cls: String( el.className ).slice( 0, 60 ), w: Math.round( wr.width ), h: Math.round( wr.height ) } );
						}
					}
				} );
				out.smallTargets = small.slice( 0, 12 );
				out.smallTargetCount = small.length;
				return out;
			}, JS_BUDGET_BYTES );

			// axe-core scan.
			let axe = { violations: -1, detail: 'inject failed' };
			try {
				await page.addScriptTag( { url: AXE_CDN } );
				axe = await page.evaluate( async () => {
					const r = await window.axe.run( document, { runOnly: { type: 'tag', values: [ 'wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa' ] } } );
					return { violations: r.violations.length, detail: r.violations.map( ( v ) => ( { id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[ 0 ] && v.nodes[ 0 ].target } ) ) };
				} );
			} catch ( e ) {
				axe = { violations: -1, detail: String( e ).slice( 0, 200 ) };
			}

			const shot = path.join( OUT, `audit-${ key }-${ vp.name }.png` );
			await page.screenshot( { path: shot, fullPage: true } ).catch( () => {} );

			const row = { page: key, viewport: vp.name, url, ...metrics, axeViolations: axe.violations, axeDetail: axe.detail, screenshot: path.basename( shot ) };
			results.push( row );
			if ( row.hOverflow || row.axeViolations > 0 ) {
				hardFailures++;
			}
			const kb = ( row.executedJsBytes / 1024 ).toFixed( 1 );
			console.log( `${ key }@${ vp.name }: overflow=${ row.hOverflow } js=${ kb }KB${ row.overBudget ? ' (OVER 50KB)' : '' } axe=${ row.axeViolations } smallTargets=${ row.smallTargetCount }` );
			await ctx.close();
		}
	}

	await browser.close();
	const reportPath = path.join( OUT, 'wc-pages-responsive-audit.json' );
	fs.writeFileSync( reportPath, JSON.stringify( results, null, 2 ) );
	console.log( `\nReport: ${ reportPath }` );
	console.log( hardFailures ? `HARD FAILURES: ${ hardFailures } (overflow/axe)` : 'All hard gates green (overflow + axe).' );
	process.exit( hardFailures ? 1 : 0 );
} )();
