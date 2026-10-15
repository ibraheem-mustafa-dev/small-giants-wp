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
 *     where the page's was, and that scrollbar is styled exactly like the page's;
 *   - the price slider's handles are centred on its bar, in Chromium and Firefox
 *     (read from the painted pixels: a range thumb has no box the DOM can measure);
 *   - choosing a filter and removing it again leaves the panel built exactly as it
 *     was (WooCommerce re-renders the panel on each choice and the groups, counts
 *     and segmented rows are rebuilt; none may be lost or doubled).
 *
 * Usage:
 *   node scripts/qa/probe-shop-filters.mjs --url https://<host>/shop/ [--url ...]
 * Exits 1 when any check fails, printing each check with its measured values.
 */
import { chromium, firefox } from 'playwright';

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

/**
 * The panel's built structure: each group with its heading text and the classes
 * of its direct children, plus anything loose between the groups.
 */
function readStructure() {
	const dialog = document.getElementById( 'sgs-shop-filters' );
	const content = dialog.querySelector( 'details.sgs-shop-filters__group' )?.parentElement;
	if ( ! content ) {
		return '';
	}
	return Array.from( content.children ).map( ( el ) => {
		if ( el.matches( 'details.sgs-shop-filters__group' ) ) {
			const heading = el.querySelector( '.sgs-shop-filters__group-heading' );
			const parts = Array.from( el.children ).map( ( c ) => c.className.split( ' ' )[ 0 ] || c.tagName.toLowerCase() );
			return `[${ heading ? heading.textContent.trim() : '?' }: ${ parts.join( ',' ) }]`;
		}
		return el.className.split( ' ' )[ 0 ] || el.tagName.toLowerCase();
	} ).join( ' ' );
}

/** Chooses the first option of the first group that offers one, as a shopper would. */
async function chooseFirstFilter( page ) {
	const target = await page.evaluateHandle( () => {
		const dialog = document.getElementById( 'sgs-shop-filters' );
		for ( const group of dialog.querySelectorAll( 'details.sgs-shop-filters__group' ) ) {
			group.open = true;
			const option = group.querySelector( '.sgs-shop-filters__segment[aria-pressed="false"], .wc-block-product-filter-checkbox-list__label, .wc-block-product-filter-chips__item' );
			if ( option && option.getBoundingClientRect().width > 0 ) {
				return option;
			}
		}
		return null;
	} );
	const label = await target.evaluate( ( el ) => el && el.textContent.trim() );
	if ( label ) {
		await target.click();
	}
	return label;
}

/**
 * Vertical centres of the left slider handle and of the bar, in CSS px, read from
 * screenshots: a pixel counts as painted when it differs from the panel colour in
 * the crop's top-left corner.
 */
async function readSliderCentres( page ) {
	const found = await page.evaluate( () => {
		const range = document.querySelector( '#sgs-shop-filters .wc-block-product-filter-price-slider__range' );
		if ( ! range ) {
			return false;
		}
		range.closest( 'details' )?.setAttribute( 'open', '' );
		// Instant: the theme's smooth scrolling would move the slider after it is measured.
		range.scrollIntoView( { block: 'center', behavior: 'instant' } );
		return true;
	} );
	if ( ! found ) {
		return null;
	}
	await page.waitForTimeout( 600 );
	const box = await page.evaluate( () => {
		const r = document.querySelector( '#sgs-shop-filters .wc-block-product-filter-price-slider__range' ).getBoundingClientRect();
		return { x: r.left, y: r.top, width: r.width, height: r.height };
	} );
	const pad = 24;
	const handleClip = { x: Math.max( 0, box.x - 8 ), y: box.y - pad, width: Math.min( 60, box.width ), height: box.height + pad * 2 };
	const barClip = { x: Math.round( box.x + box.width / 2 ), y: box.y - pad, width: 1, height: box.height + pad * 2 };
	const handlePng = ( await page.screenshot( { clip: handleClip } ) ).toString( 'base64' );
	const barPng = ( await page.screenshot( { clip: barClip } ) ).toString( 'base64' );
	// The bar column's background is read from the handle crop: a 1px column has no clear corner.
	return page.evaluate( async ( [ handleB64, barB64, offset ] ) => {
		const load = ( b64 ) => new Promise( ( resolve ) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement( 'canvas' );
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext( '2d' );
				ctx.drawImage( img, 0, 0 );
				resolve( { w: img.width, h: img.height, data: ctx.getImageData( 0, 0, img.width, img.height ).data } );
			};
			img.src = 'data:image/png;base64,' + b64;
		} );
		const handle = await load( handleB64 );
		const bar = await load( barB64 );
		const at = ( im, x, y ) => Array.from( im.data.slice( ( y * im.w + x ) * 4, ( y * im.w + x ) * 4 + 3 ) );
		const bg = at( handle, 0, 0 );
		const painted = ( p ) => Math.abs( p[ 0 ] - bg[ 0 ] ) + Math.abs( p[ 1 ] - bg[ 1 ] ) + Math.abs( p[ 2 ] - bg[ 2 ] ) > 60;
		// The unbroken painted run in column x that passes through row y.
		const run = ( im, x, y ) => {
			if ( ! painted( at( im, x, y ) ) ) {
				return null;
			}
			let first = y;
			let last = y;
			while ( first > 0 && painted( at( im, x, first - 1 ) ) ) {
				first--;
			}
			while ( last < im.h - 1 && painted( at( im, x, last + 1 ) ) ) {
				last++;
			}
			return { centre: ( first + last + 1 ) / 2, size: last - first + 1 };
		};
		// The bar's own box starts at row `offset` of each crop.
		const barRow = offset + 1;
		const barRun = run( bar, 0, barRow );
		// The handle's centre column is the one with the tallest run through the bar.
		let tallest = null;
		for ( let x = 0; x < handle.w; x++ ) {
			const r = run( handle, x, barRow );
			if ( r && ( ! tallest || r.size > tallest.size ) ) {
				tallest = r;
			}
		}
		return {
			handleCentre: tallest && tallest.centre - offset,
			handleSize: tallest && tallest.size,
			barCentre: barRun && barRun.centre - offset,
			barSize: barRun && barRun.size,
			background: bg.join( ',' ),
		};
	}, [ handlePng, barPng, pad ] );
}

function check( results, name, pass, detail ) {
	results.push( { name, pass: !! pass, detail } );
}

async function probe( browser, url, browserName ) {
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

	const centres = await readSliderCentres( page );
	if ( centres ) {
		const measured = null !== centres.handleCentre && null !== centres.barCentre;
		check( results, 'desktop: price slider handles centred on the bar', measured && Math.abs( centres.handleCentre - centres.barCentre ) <= 1, centres );
	}
	// Firefox runs the slider check only; the rest is engine-independent DOM and script.
	if ( 'chromium' !== browserName ) {
		await page.close();
		return results;
	}

	// Choose a filter, then remove it: WooCommerce re-renders the panel each time.
	await page.goto( fresh, { waitUntil: 'networkidle', timeout: 60000 } );
	const built = await page.evaluate( readStructure );
	const chosen = await chooseFirstFilter( page );
	await page.waitForTimeout( 3000 );
	await page.evaluate( () => document.querySelector( '#sgs-shop-filters .wc-block-product-filter-removable-chips__item button' )?.click() );
	await page.waitForTimeout( 3000 );
	const rebuilt = await page.evaluate( readStructure );
	check( results, 'desktop: choosing then removing a filter leaves the panel built as it was', chosen && built === rebuilt, { chosen, before: built, after: rebuilt } );

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

let failed = 0;
for ( const [ browserName, engine ] of [ [ 'chromium', chromium ], [ 'firefox', firefox ] ] ) {
	const browser = await engine.launch();
	for ( const url of urls ) {
		console.log( `\n${ url } (${ browserName })` );
		for ( const r of await probe( browser, url, browserName ) ) {
			if ( ! r.pass ) {
				failed++;
			}
			console.log( `  ${ r.pass ? 'PASS' : 'FAIL' }  ${ r.name }${ r.pass ? '' : '  ' + JSON.stringify( r.detail ) }` );
		}
	}
	await browser.close();
}
console.log( failed ? `\n[shop-filters] FAIL: ${ failed } check(s) failed` : '\n[shop-filters] PASS' );
process.exit( failed ? 1 : 0 );
