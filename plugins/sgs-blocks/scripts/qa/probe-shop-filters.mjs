/**
 * Live probe for the shop filter panel (theme/sgs-theme/assets/js/sgs-shop-filters.js
 * and woocommerce.css section 8). Checks what a shopper sees, on any site:
 *
 *   - the panel script runs without a page error and turns the panel into a <dialog>;
 *   - the filter groups fill the panel's width at phone and desktop widths, whatever
 *     the length of the labels (WooCommerce's shrink-to-fit `inline-flex`);
 *   - with the sheet open on a phone, the page behind it does not scroll and its
 *     scrollbar is hidden, and both come back when the sheet closes;
 *   - the sheet's scroll region reaches the sheet's right edge, so its scrollbar sits
 *     where the page's was, and that scrollbar is styled exactly like the page's.
 *
 * Usage:
 *   node scripts/qa/probe-shop-filters.mjs --url https://<host>/shop/ [--url ...]
 * Exits 1 when any check fails, printing each check with its measured values.
 */
import { chromium } from 'playwright';

const urls = [];
for ( let i = 2; i < process.argv.length; i++ ) {
	if ( process.argv[ i ] === '--url' && process.argv[ i + 1 ] ) {
		urls.push( process.argv[ ++i ] );
	}
}
if ( ! urls.length ) {
	console.error( 'Usage: node scripts/qa/probe-shop-filters.mjs --url <shop url> [--url ...]' );
	process.exit( 2 );
}

const PHONE = { width: 440, height: 900 };
const DESKTOP = { width: 1440, height: 900 };
const TOLERANCE_PX = 2;

/** Widths of the panel's scroll content box and of each filter group. */
function readFill() {
	const dialog = document.getElementById( 'sgs-shop-filters' );
	if ( ! dialog ) {
		return null;
	}
	const scroller = dialog.querySelector( '.sgs-shop-filters__scroll' );
	const style = scroller && getComputedStyle( scroller );
	const contentWidth = scroller
		? scroller.clientWidth - parseFloat( style.paddingLeft ) - parseFloat( style.paddingRight )
		: 0;
	const groups = [ ...dialog.querySelectorAll( '.sgs-shop-filters__group, .wc-block-product-filters__overlay' ) ]
		.filter( ( el ) => el.getBoundingClientRect().width > 0 )
		.map( ( el ) => Math.round( el.getBoundingClientRect().width ) );
	return { tag: dialog.tagName, contentWidth: Math.round( contentWidth ), groups };
}

function check( results, name, pass, detail ) {
	results.push( { name, pass: !! pass, detail } );
}

async function probe( browser, url ) {
	const results = [];
	const page = await browser.newPage();
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	const fresh = url + ( url.includes( '?' ) ? '&' : '?' ) + 'probe=' + Date.now();

	// Desktop: the static sidebar.
	await page.setViewportSize( DESKTOP );
	await page.goto( fresh, { waitUntil: 'networkidle', timeout: 60000 } );
	const desktop = await page.evaluate( readFill );
	check( results, 'desktop: panel present and converted to a dialog', desktop && desktop.tag === 'DIALOG', desktop );
	if ( desktop ) {
		const narrow = desktop.groups.filter( ( w ) => w < desktop.contentWidth - TOLERANCE_PX );
		check( results, 'desktop: filter groups fill the panel width', ! narrow.length, desktop );
	}

	// Phone: the modal bottom sheet.
	await page.setViewportSize( PHONE );
	await page.goto( fresh, { waitUntil: 'networkidle', timeout: 60000 } );
	const pageScrollbarColour = await page.evaluate( () => getComputedStyle( document.documentElement ).scrollbarColor );
	await page.evaluate( () => window.scrollTo( 0, 300 ) );
	await page.waitForTimeout( 300 );
	await page.click( '.sgs-shop-filters__toggle' );
	await page.waitForTimeout( 700 );

	const sheet = await page.evaluate( () => {
		const dialog = document.getElementById( 'sgs-shop-filters' );
		const scroller = dialog.querySelector( '.sgs-shop-filters__scroll' );
		const header = dialog.querySelector( '.sgs-shop-filters__header' );
		const box = dialog.getBoundingClientRect();
		const scrollBox = scroller.getBoundingClientRect();
		const headerBox = header ? header.getBoundingClientRect() : box;
		return {
			modal: dialog.matches( ':modal' ),
			rootOverflowY: getComputedStyle( document.documentElement ).overflowY,
			scrollerRightGap: Math.round( box.right - scrollBox.right ),
			scrollbarColour: getComputedStyle( scroller ).scrollbarColor,
			scrollbarWidth: getComputedStyle( scroller ).scrollbarWidth,
			headerPoint: { x: Math.round( headerBox.left + headerBox.width / 2 ), y: Math.round( headerBox.top + headerBox.height / 2 ) },
		};
	} );
	const phone = await page.evaluate( readFill );
	check( results, 'phone: sheet opens as a modal dialog', sheet.modal, sheet );
	const narrowPhone = phone.groups.filter( ( w ) => w < phone.contentWidth - TOLERANCE_PX );
	check( results, 'phone: filter groups fill the sheet width', ! narrowPhone.length, phone );
	check( results, 'phone: page scrollbar hidden while the sheet is open', sheet.rootOverflowY === 'hidden', { rootOverflowY: sheet.rootOverflowY } );
	check( results, "phone: the sheet's scroll region reaches the sheet's right edge", sheet.scrollerRightGap <= TOLERANCE_PX, { scrollerRightGap: sheet.scrollerRightGap } );
	check(
		results,
		"phone: the sheet's scrollbar is styled like the page's",
		sheet.scrollbarColour === pageScrollbarColour && sheet.scrollbarWidth === 'auto',
		{ sheet: sheet.scrollbarColour, page: pageScrollbarColour, width: sheet.scrollbarWidth }
	);

	// Wheel over the sheet's header, which is outside its own scroll region, so an
	// unlocked page would take the scroll.
	const before = await page.evaluate( () => window.scrollY );
	await page.mouse.move( sheet.headerPoint.x, sheet.headerPoint.y );
	await page.mouse.wheel( 0, 400 );
	await page.waitForTimeout( 1200 );
	const moved = ( await page.evaluate( () => window.scrollY ) ) - before;
	check( results, 'phone: the page behind the open sheet does not scroll', moved === 0, { scrolledBy: moved } );

	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 600 );
	const afterClose = await page.evaluate( () => getComputedStyle( document.documentElement ).overflowY );
	check( results, 'phone: page scrolling returns when the sheet closes', afterClose !== 'hidden', { rootOverflowY: afterClose } );

	check( results, 'no page errors', ! errors.length, errors );
	await page.close();
	return results;
}

const browser = await chromium.launch();
let failed = 0;
for ( const url of urls ) {
	console.log( `\n${ url }` );
	for ( const r of await probe( browser, url ) ) {
		if ( ! r.pass ) {
			failed++;
		}
		console.log( `  ${ r.pass ? 'PASS' : 'FAIL' }  ${ r.name }${ r.pass ? '' : '  ' + JSON.stringify( r.detail ) }` );
	}
}
await browser.close();
console.log( failed ? `\n[shop-filters] FAIL: ${ failed } check(s) failed` : '\n[shop-filters] PASS' );
process.exit( failed ? 1 : 0 );
