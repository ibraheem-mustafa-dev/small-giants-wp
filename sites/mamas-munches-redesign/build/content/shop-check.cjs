// Basket, checkout and account, recorded without paying: adds the Taster Trio with its default choices, opens the
// basket and the checkout, then /my-account/ signed out, at 375 and 1440, saving a full-page screenshot and a text
// summary of each. Never fills or submits the checkout.
//   NODE_PATH=<repo>/scripts/computed-route/node_modules node shop-check.cjs <base-url> <out-dir>
//   e.g. node shop-check.cjs https://mamasmunches.com E:/sgs-tmp/mamas-answers/before
const { chromium } = require( 'playwright' );
const fs = require( 'fs' );
const path = require( 'path' );

( async () => {
	const base = ( process.argv[ 2 ] || 'https://mamasmunches.com' ).replace( /\/$/, '' );
	const out = process.argv[ 3 ] || 'E:/sgs-tmp/mamas-answers/before';
	fs.mkdirSync( out, { recursive: true } );
	const browser = await chromium.launch( { channel: 'chrome' } );
	const summary = {};
	for ( const width of [ 375, 1440 ] ) {
		const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
		const page = await ctx.newPage();
		const shot = async ( name ) => {
			await page.waitForTimeout( 1500 );
			await page.screenshot( { path: path.join( out, `${ name }-${ width }.png` ), fullPage: true } );
			summary[ `${ name }-${ width }` ] = await page.evaluate( () => ( {
				url: location.pathname,
				h1: document.querySelector( 'h1' )?.textContent.trim() || '',
				lines: [ ...document.querySelectorAll( '.wc-block-cart-items__row, .wc-block-components-order-summary-item' ) ].map( ( r ) => r.textContent.replace( /\s+/g, ' ' ).trim() ),
				totals: [ ...document.querySelectorAll( '.wc-block-components-totals-item' ) ].map( ( r ) => r.textContent.replace( /\s+/g, ' ' ).trim() ),
				forms: [ ...document.querySelectorAll( 'form' ) ].map( ( f ) => f.className || f.id ).filter( Boolean ),
			} ) );
		};
		await page.goto( `${ base }/product/taster-trio/`, { waitUntil: 'load', timeout: 60000 } );
		const add = page.locator( '.buybox__add-to-cart' ).first();
		await add.scrollIntoViewIfNeeded();
		const added = page.waitForResponse( ( r ) => /cart\/add-item/.test( r.url() ), { timeout: 20000 } ).catch( () => null );
		await add.click();
		const res = await added;
		summary[ `add-${ width }` ] = res ? res.status() : 'no add-item response';
		await shot( 'product' );
		await page.goto( `${ base }/cart/`, { waitUntil: 'load', timeout: 60000 } );
		await shot( 'basket' );
		await page.goto( `${ base }/checkout/`, { waitUntil: 'load', timeout: 60000 } );
		await shot( 'checkout' );
		await ctx.clearCookies();
		await page.goto( `${ base }/my-account/`, { waitUntil: 'load', timeout: 60000 } );
		await shot( 'account' );
		await ctx.close();
	}
	await browser.close();
	fs.writeFileSync( path.join( out, 'summary.json' ), JSON.stringify( summary, null, 2 ) );
	console.log( JSON.stringify( summary, null, 1 ).slice( 0, 3000 ) );
} )();
