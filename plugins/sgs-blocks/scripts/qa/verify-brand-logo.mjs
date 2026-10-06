/**
 * S9 verification — brand logos instead of typed brand names.
 *
 * Run AFTER deploying. Checks the three surfaces the shared brand lookup
 * (includes/helpers-brand-logo.php) feeds, at 1440, 768 and 375.
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/qa/verify-brand-logo.mjs
 *   node plugins/sgs-blocks/scripts/qa/verify-brand-logo.mjs --base https://example.com
 *
 * Needs a page on the canary that renders an sgs/product-card for product
 * 3990 (the positive fixture) and one for product 1125 (the negative
 * control). Pass --cards-url <url> to point at it; the script reports SKIP,
 * never a false PASS, when it cannot find a card.
 *
 * Every check names the reading that turns it RED.
 */

import { chromium } from 'playwright';

const arg = ( name, fallback ) => {
	const i = process.argv.indexOf( `--${ name }` );
	return i > -1 && process.argv[ i + 1 ] ? process.argv[ i + 1 ] : fallback;
};

const BASE = arg(
	'base',
	'https://sandybrown-nightingale-600381.hostingersite.com'
);
const CARDS_URL = arg( 'cards-url', `${ BASE }/` );
const WIDTHS = [ 1440, 768, 375 ];

// The canary fixtures, verified present 2026-10-06 (see "Re-seeding" below).
const POSITIVE = { productId: 3990, brand: 'QA Logo Brand', termId: 133 };
const NEGATIVE = { productId: 1125, brand: 'QA No Logo Brand', termId: 134 };

const results = [];
const record = ( status, name, detail ) => {
	results.push( { status, name, detail } );
	const tag = { PASS: 'PASS', FAIL: 'FAIL', SKIP: 'SKIP' }[ status ];
	console.log( `[${ tag }] ${ name }\n        ${ detail }` );
};

/**
 * CHECK 1 + 2 + 3 — the product card.
 *
 * RED when:
 *  1. the positive card shows TEXT where a logo belongs — no
 *     `img.sgs-product-card__brand-logo` inside `.sgs-product-card__brand`.
 *  2. that logo's accessible name is empty, or is anything other than the
 *     brand name. Attachment 4609's own alt text IS empty on the canary, so
 *     an empty `alt` here means the code regressed to reading the attachment
 *     alt instead of the brand term name.
 *  3. the NEGATIVE control (a brand with no `thumbnail_id`) renders an
 *     `<img>`, or renders nothing. It must render its brand name as text.
 */
async function checkCards( page, width ) {
	await page.setViewportSize( { width, height: 900 } );
	await page.goto( CARDS_URL, { waitUntil: 'domcontentloaded' } );
	await page.waitForTimeout( 800 );

	const brands = await page.evaluate( () => {
		return Array.from(
			document.querySelectorAll( '.sgs-product-card__brand' )
		).map( ( el ) => {
			const img = el.querySelector(
				'img.sgs-product-card__brand-logo'
			);
			const card = el.closest( '.wp-block-sgs-product-card' );
			return {
				hasImg: !! img,
				alt: img ? img.getAttribute( 'alt' ) : null,
				imgSrc: img ? img.currentSrc || img.src : null,
				naturalWidth: img ? img.naturalWidth : 0,
				renderedHeight: img
					? Math.round( img.getBoundingClientRect().height )
					: 0,
				text: el.textContent.trim(),
				cardHtml: card ? card.outerHTML.slice( 0, 400 ) : '',
			};
		} );
	} );

	if ( brands.length === 0 ) {
		record(
			'SKIP',
			`@${ width } cards — no brand overlay found`,
			`No .sgs-product-card__brand on ${ CARDS_URL }. Point --cards-url at a page with an sgs/product-card for products ${ POSITIVE.productId } and ${ NEGATIVE.productId } with "Show brand overlay" ON. This is a SKIP, not a pass.`
		);
		return;
	}

	const logos = brands.filter( ( b ) => b.hasImg );
	const texts = brands.filter( ( b ) => ! b.hasImg );

	// CHECK 1 — a logo renders at all.
	if ( logos.length > 0 ) {
		record(
			'PASS',
			`@${ width } CHECK 1 card logo renders`,
			`${ logos.length } of ${ brands.length } brand overlays are <img>. src=${ logos[ 0 ].imgSrc }`
		);
	} else {
		record(
			'FAIL',
			`@${ width } CHECK 1 card logo renders`,
			`RED: ${ brands.length } brand overlays, none an <img>. Texts seen: ${ JSON.stringify(
				texts.map( ( t ) => t.text )
			) }. Either no card on this page has a brand with a logo, or sgs_product_card_brand_markup() fell through to the name path.`
		);
	}

	// CHECK 2 — the accessible name is the BRAND NAME and is not empty.
	for ( const logo of logos ) {
		const alt = ( logo.alt || '' ).trim();
		if ( alt === '' ) {
			record(
				'FAIL',
				`@${ width } CHECK 2 logo accessible name`,
				`RED: alt is EMPTY on ${ logo.imgSrc }. The brand logo attachment on the canary (4609) has no alt text of its own, so an empty alt here proves the code read the ATTACHMENT alt instead of the brand term name. Expected the brand name, e.g. "${ POSITIVE.brand }".`
			);
		} else if ( alt === POSITIVE.brand || alt === NEGATIVE.brand ) {
			record(
				'PASS',
				`@${ width } CHECK 2 logo accessible name`,
				`alt="${ alt }" — the brand term name, not the (empty) attachment alt.`
			);
		} else {
			record(
				'PASS',
				`@${ width } CHECK 2 logo accessible name (non-fixture brand)`,
				`alt="${ alt }" — non-empty. RED would be an empty alt, or the attachment filename.`
			);
		}

		// The logo must actually be visible, not a 0-height or broken image.
		if ( logo.naturalWidth === 0 ) {
			record(
				'FAIL',
				`@${ width } CHECK 2b logo image loads`,
				`RED: naturalWidth is 0 for ${ logo.imgSrc } — broken image URL.`
			);
		} else if ( logo.renderedHeight < 8 ) {
			record(
				'FAIL',
				`@${ width } CHECK 2b logo is visible`,
				`RED: rendered height is ${ logo.renderedHeight }px (<8). The CSS height on .sgs-product-card__brand-logo is not applying.`
			);
		} else {
			record(
				'PASS',
				`@${ width } CHECK 2b logo is visible`,
				`naturalWidth=${ logo.naturalWidth }, rendered height=${ logo.renderedHeight }px.`
			);
		}
	}

	// CHECK 3 — the NEGATIVE CONTROL: a brand with no logo prints its name.
	const negative = brands.find(
		( b ) => ! b.hasImg && b.text === NEGATIVE.brand
	);
	if ( negative ) {
		record(
			'PASS',
			`@${ width } CHECK 3 negative control (no-logo brand)`,
			`"${ NEGATIVE.brand }" (term ${ NEGATIVE.termId }, no thumbnail_id) printed as TEXT with no <img>. This is the name-fallback path actually executing.`
		);
	} else {
		const anyNegative = brands.find( ( b ) => b.text === NEGATIVE.brand );
		record(
			anyNegative ? 'FAIL' : 'SKIP',
			`@${ width } CHECK 3 negative control (no-logo brand)`,
			anyNegative
				? `RED: "${ NEGATIVE.brand }" rendered an <img> despite the term having no thumbnail_id — the fallback is broken, or a logo leaked from another brand.`
				: `No card for the no-logo brand on this page, so the fallback path is UNTESTED here — a vacuous result, not a pass. Add a card for product ${ NEGATIVE.productId }.`
		);
	}
}

/**
 * CHECK 4 — the Store API payload behind the bag drawer.
 *
 * RED when `brand`, `brandLogo`, `lineSummary` or `hasLenses` is missing from
 * `items[].extensions.sgs` — a missing pair is the signature of a SECOND
 * `sgs` registration having silently replaced the first.
 */
async function checkStoreApi( page ) {
	const payload = await page.evaluate( async ( base ) => {
		try {
			const res = await fetch( `${ base }/wp-json/wc/store/v1/cart`, {
				headers: { Accept: 'application/json' },
				credentials: 'include',
			} );
			return { ok: res.ok, status: res.status, body: await res.json() };
		} catch ( e ) {
			return { ok: false, status: 0, error: String( e ) };
		}
	}, BASE );

	if ( ! payload.ok ) {
		record(
			'SKIP',
			'CHECK 4 Store API cart extensions',
			`Could not read /wp-json/wc/store/v1/cart (status ${ payload.status }). SKIP, not a pass.`
		);
		return;
	}

	const items = payload.body?.items || [];
	if ( items.length === 0 ) {
		record(
			'SKIP',
			'CHECK 4 Store API cart extensions',
			`The cart is empty, so no line to inspect. Add product ${ POSITIVE.productId } to the bag and re-run. SKIP, not a pass.`
		);
		return;
	}

	const sgs = items[ 0 ].extensions?.sgs;
	const required = [ 'brand', 'brandLogo', 'lineSummary', 'hasLenses' ];
	const missing = required.filter( ( k ) => ! ( k in ( sgs || {} ) ) );

	if ( missing.length ) {
		record(
			'FAIL',
			'CHECK 4 Store API carries all four sgs fields',
			`RED: missing ${ JSON.stringify(
				missing
			) } from items[0].extensions.sgs. A missing field set means a second ExtendSchema registration on the "sgs" namespace replaced the first. Got keys: ${ JSON.stringify(
				Object.keys( sgs || {} )
			) }`
		);
	} else {
		record(
			'PASS',
			'CHECK 4 Store API carries all four sgs fields',
			`brand=${ JSON.stringify(
				sgs.brand
			) }, brandLogo.url=${ JSON.stringify(
				sgs.brandLogo?.url
			) }, lineSummary=${ JSON.stringify(
				sgs.lineSummary
			) }, hasLenses=${ JSON.stringify( sgs.hasLenses ) }`
		);
	}
}

/**
 * CHECK 5 — the bag drawer line renders the logo.
 *
 * RED when the drawer line for a logo-carrying brand shows
 * `.sgs-cart__item-brand` as text with no
 * `img.sgs-cart__item-brand-logo`, or when that img's alt is empty.
 */
async function checkBagDrawer( page, width ) {
	await page.setViewportSize( { width, height: 900 } );
	await page.goto( `${ BASE }/?add-to-cart=${ POSITIVE.productId }`, {
		waitUntil: 'domcontentloaded',
	} );
	await page.waitForTimeout( 1200 );

	const opened = await page.evaluate( () => {
		const trigger = document.querySelector(
			'.sgs-cart__toggle, [data-wp-on--click*="toggle"], .sgs-cart__trigger'
		);
		if ( trigger ) {
			trigger.click();
			return true;
		}
		return false;
	} );
	await page.waitForTimeout( 1500 );

	const line = await page.evaluate( () => {
		const el = document.querySelector( '.sgs-cart__item-brand' );
		if ( ! el ) {
			return null;
		}
		const img = el.querySelector( 'img.sgs-cart__item-brand-logo' );
		return {
			hasImg: !! img,
			alt: img ? img.getAttribute( 'alt' ) : null,
			naturalWidth: img ? img.naturalWidth : 0,
			text: el.textContent.trim(),
		};
	} );

	if ( ! line ) {
		record(
			'SKIP',
			`@${ width } CHECK 5 bag drawer brand logo`,
			`No .sgs-cart__item-brand in the drawer (drawer opened: ${ opened }). The bag may not be on this page, or the line has no brand. SKIP, not a pass.`
		);
		return;
	}

	if ( line.hasImg && ( line.alt || '' ).trim() !== '' ) {
		record(
			'PASS',
			`@${ width } CHECK 5 bag drawer brand logo`,
			`Drawer line shows <img class="sgs-cart__item-brand-logo"> alt="${ line.alt }", naturalWidth=${ line.naturalWidth }.`
		);
	} else if ( line.hasImg ) {
		record(
			'FAIL',
			`@${ width } CHECK 5 bag drawer brand logo`,
			`RED: the drawer logo's alt is EMPTY. It must be the brand name.`
		);
	} else {
		record(
			'FAIL',
			`@${ width } CHECK 5 bag drawer brand logo`,
			`RED: the drawer line shows brand TEXT "${ line.text }" with no <img>. Expected a logo for ${ POSITIVE.brand }. Check items[].extensions.sgs.brandLogo.url is non-empty (CHECK 4).`
		);
	}
}

/**
 * CHECK 6 — the DOCUMENTED CEILING, so a logo here is NOT expected.
 *
 * WooCommerce's cart page and checkout run line-item values through their
 * `ProductDetails` component, which sanitises to
 * `a, b, em, i, strong, br, abbr, span` — an `<img>` is silently stripped.
 * This check PASSES when the cart page shows the brand NAME, and reports RED
 * only if the brand is missing entirely (which would be a real regression).
 * A logo appearing here is a surprise to investigate, not a success.
 */
async function checkCartPageCeiling( page ) {
	await page.setViewportSize( { width: 1440, height: 1000 } );
	await page.goto( `${ BASE }/cart/`, { waitUntil: 'domcontentloaded' } );
	await page.waitForTimeout( 2000 );

	const found = await page.evaluate( ( brandName ) => {
		const body = document.body.innerText || '';
		const imgs = Array.from(
			document.querySelectorAll( '.wc-block-cart img, .cart_item img' )
		).map( ( i ) => i.className );
		return {
			nameVisible: body.includes( brandName ),
			brandLogoImgs: imgs.filter( ( c ) => c.includes( 'brand' ) ),
			hasCart:
				!! document.querySelector( '.wc-block-cart' ) ||
				!! document.querySelector( '.cart_item' ),
		};
	}, POSITIVE.brand );

	if ( ! found.hasCart ) {
		record(
			'SKIP',
			'CHECK 6 cart page shows the NAME (documented ceiling)',
			'No cart line items on /cart/ — add something to the bag first. SKIP, not a pass.'
		);
		return;
	}

	if ( found.nameVisible ) {
		record(
			'PASS',
			'CHECK 6 cart page shows the NAME (documented ceiling)',
			`"${ POSITIVE.brand }" is present as text. A brand LOGO here is NOT expected and never will be: WooCommerce's ProductDetails sanitiser strips <img>. Brand-classed imgs found: ${ JSON.stringify(
				found.brandLogoImgs
			) } (expected []).`
		);
	} else {
		record(
			'FAIL',
			'CHECK 6 cart page shows the NAME (documented ceiling)',
			`RED: the brand name "${ POSITIVE.brand }" is absent from the cart page entirely. The name path regressed — the ceiling means no LOGO, it does not mean no brand.`
		);
	}
}

const main = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	try {
		for ( const width of WIDTHS ) {
			await checkCards( page, width );
		}
		await checkStoreApi( page );
		for ( const width of WIDTHS ) {
			await checkBagDrawer( page, width );
		}
		await checkCartPageCeiling( page );
	} finally {
		await browser.close();
	}

	const fails = results.filter( ( r ) => r.status === 'FAIL' ).length;
	const skips = results.filter( ( r ) => r.status === 'SKIP' ).length;
	const passes = results.filter( ( r ) => r.status === 'PASS' ).length;

	console.log(
		`\n${ passes } passed, ${ fails } failed, ${ skips } skipped (a SKIP is an UNTESTED check, never a pass).`
	);
	process.exit( fails > 0 ? 1 : 0 );
};

main().catch( ( e ) => {
	console.error( e );
	process.exit( 2 );
} );
