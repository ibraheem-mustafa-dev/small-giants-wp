// Header and overlay-scroll checks on a live site after the 2026-11-11 perf changes.
//   node header-checks.mjs <base-url>
// 1. On load, the on-demand chunks (cart-panel.js, drawer-menu-effects.js) are NOT fetched; @sgs/nav-store is fetched once.
// 2. The bag opens by mouse (1440), keyboard (1440) and touch (375) and its panel renders (items or the empty message).
// 3. The menu drawer opens by mouse, keyboard and touch where a burger shows, and its menu marks the current page.
// 4. Overlay thumbs at 1440: hovering a scroller that overflows shows its thumb, dragging the thumb scrolls it
//    (shop filter panel, nav drawer body, cart drawer items).
const { chromium } = await import( new URL( '../../../scripts/computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );

const BASE = process.argv[ 2 ].replace( /\/$/, '' );
const results = [];
const ok = ( name, pass, detail = '' ) => {
	results.push( { name, pass } );
	console.log( `${ pass === null ? 'N/A ' : pass ? 'PASS' : 'FAIL' }  ${ name }${ detail ? '  ' + detail : '' }` );
};
const br = await chromium.launch();

async function open( width, touch = false, height = 900 ) {
	const ctx = await br.newContext( { viewport: { width, height }, hasTouch: touch, isMobile: touch } );
	const page = await ctx.newPage();
	const errors = [];
	const scripts = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message.slice( 0, 140 ) ) );
	page.on( 'request', ( r ) => {
		if ( /\.js(\?|$)/.test( r.url() ) ) {
			scripts.push( r.url().replace( /\?.*/, '' ).replace( /^.*wp-content\//, '' ) );
		}
	} );
	return { ctx, page, errors, scripts };
}
const settle = ( page, ms = 1500 ) => page.waitForLoadState( 'networkidle', { timeout: 20000 } ).catch( () => {} ).then( () => page.waitForTimeout( ms ) );

async function bagState( page ) {
	return page.evaluate( () => {
		const panel = [ ...document.querySelectorAll( '[data-sgs-cart-panel]' ) ].find( ( p ) => p.checkVisibility?.() );
		if ( ! panel ) {
			return { visible: false };
		}
		const items = panel.querySelector( '[data-sgs-cart-items]' );
		return { visible: true, text: ( items?.innerText || '' ).trim().slice( 0, 60 ), loading: !! panel.querySelector( '[aria-busy="true"]' ) };
	} );
}

// ---- 1 + 2 + 3 at 1440, mouse and keyboard
for ( const mode of [ 'mouse', 'keyboard' ] ) {
	const { ctx, page, errors, scripts } = await open( 1440 );
	await page.goto( BASE + '/', { waitUntil: 'load', timeout: 90000 } );
	await settle( page );
	if ( 'mouse' === mode ) {
		ok( 'load: cart-panel chunk not fetched', ! scripts.some( ( s ) => s.endsWith( 'cart-panel.js' ) ) );
		ok( 'load: drawer-menu-effects chunk not fetched', ! scripts.some( ( s ) => s.endsWith( 'drawer-menu-effects.js' ) ) );
		ok( 'load: nav-store fetched once', 1 === scripts.filter( ( s ) => s.endsWith( 'shared/nav-store.js' ) ).length, String( scripts.filter( ( s ) => s.endsWith( 'nav-store.js' ) ).length ) );
	}
	const trigger = page.locator( '[data-sgs-cart-trigger]' ).first();
	if ( ! ( await trigger.count() ) ) {
		ok( `bag (${ mode })`, null, 'no cart trigger' );
	} else {
		if ( 'mouse' === mode ) {
			await trigger.click();
		} else {
			await trigger.focus();
			await page.keyboard.press( 'Enter' );
		}
		await page.waitForTimeout( 2500 );
		const s = await bagState( page );
		ok( `bag opens and renders (${ mode }, 1440)`, s.visible && ! s.loading && s.text.length > 0, JSON.stringify( s ) );
		ok( `cart-panel chunk loaded after interaction (${ mode })`, scripts.some( ( s2 ) => s2.endsWith( 'cart-panel.js' ) ) );
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 800 );
	}
	ok( `no page errors (${ mode }, 1440)`, 0 === errors.length, errors.join( ' | ' ) );
	await ctx.close();
}

// ---- 2 + 3 at 375 by touch, and the menu drawer by touch and keyboard
for ( const mode of [ 'touch', 'keyboard' ] ) {
	const { ctx, page, errors, scripts } = await open( 375, 'touch' === mode );
	await page.goto( BASE + '/', { waitUntil: 'load', timeout: 90000 } );
	await settle( page );
	const burger = page.locator( 'button[aria-controls]' ).filter( { has: page.locator( '*' ) } );
	const id = await page.evaluate( () => {
		const b = [ ...document.querySelectorAll( 'button[aria-controls]' ) ].find( ( x ) => x.checkVisibility?.() && document.getElementById( x.getAttribute( 'aria-controls' ) )?.matches( 'dialog' ) );
		if ( b ) {
			b.setAttribute( 'data-test-burger', '1' );
		}
		return b ? b.getAttribute( 'aria-controls' ) : null;
	} );
	if ( ! id ) {
		ok( `menu drawer (${ mode }, 375)`, null, 'no visible burger' );
	} else {
		const b = page.locator( '[data-test-burger]' );
		if ( 'touch' === mode ) {
			await b.tap();
		} else {
			await b.focus();
			await page.keyboard.press( 'Enter' );
		}
		await page.waitForTimeout( 2000 );
		const st = await page.evaluate( ( did ) => {
			const d = document.getElementById( did );
			return { open: !! d?.open, current: !! d?.querySelector( '[aria-current="page"]' ), focusInside: d?.contains( document.activeElement ) };
		}, id );
		ok( `menu drawer opens (${ mode }, 375)`, st.open, JSON.stringify( st ) );
		ok( `drawer menu marks the current page (${ mode })`, st.current );
		ok( `drawer-menu-effects chunk loaded after interaction (${ mode })`, scripts.some( ( s ) => s.endsWith( 'drawer-menu-effects.js' ) ) );
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 800 );
		ok( `menu drawer closes on Escape (${ mode })`, ! ( await page.evaluate( ( did ) => document.getElementById( did )?.open, id ) ) );
	}
	const trigger = page.locator( '[data-sgs-cart-trigger]' ).first();
	if ( await trigger.count() ) {
		if ( 'touch' === mode ) {
			await trigger.tap();
		} else {
			await trigger.focus();
			await page.keyboard.press( 'Enter' );
		}
		await page.waitForTimeout( 2500 );
		const s = await bagState( page );
		ok( `bag opens and renders (${ mode }, 375)`, s.visible && ! s.loading && s.text.length > 0, JSON.stringify( s ) );
	}
	ok( `no page errors (${ mode }, 375)`, 0 === errors.length, errors.join( ' | ' ) );
	await ctx.close();
}

// ---- 4 overlay thumbs at 1440
async function thumbCheck( page, label, selector ) {
	// Cap every matching scroller's height in this test browser only, so a short panel still has to scroll: this
	// exercises the real mount, hover and drag code whatever the content length.
	await page.addStyleTag( { content: `${ selector }{max-height:140px!important;overflow-y:auto!important}` } );
	await page.waitForTimeout( 600 );
	const info = await page.evaluate( ( sel ) => {
		const el = [ ...document.querySelectorAll( sel ) ].find( ( e ) => e.checkVisibility?.() && e.scrollHeight > e.clientHeight + 1 );
		if ( ! el ) {
			return null;
		}
		el.setAttribute( 'data-test-scroller', '1' );
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, mounted: el.classList.contains( 'sgs-overlay-scroll' ), thumb: !! el.querySelector( ':scope > .sgs-overlay-scroll__thumb' ) };
	}, selector );
	if ( ! info ) {
		ok( `thumb: ${ label }`, null, 'no visible overflowing scroller' );
		return;
	}
	ok( `thumb mounted: ${ label }`, info.mounted && info.thumb );
	await page.mouse.move( info.x, info.y );
	await page.mouse.move( info.x + 5, info.y + 5 );
	await page.waitForTimeout( 300 );
	const t = await page.evaluate( () => {
		const el = document.querySelector( '[data-test-scroller]' );
		const th = el.querySelector( ':scope > .sgs-overlay-scroll__thumb' );
		const r = th.getBoundingClientRect();
		return { visible: th.classList.contains( 'is-visible' ), x: r.left + r.width / 2, y: r.top + Math.min( r.height / 2, 10 ), top: el.scrollTop };
	} );
	ok( `thumb shows on hover: ${ label }`, t.visible );
	await page.mouse.move( t.x, t.y );
	await page.mouse.down();
	await page.mouse.move( t.x, t.y + 60, { steps: 6 } );
	await page.mouse.up();
	await page.waitForTimeout( 300 );
	const after = await page.evaluate( () => document.querySelector( '[data-test-scroller]' ).scrollTop );
	ok( `thumb drag scrolls: ${ label }`, after > t.top, `${ t.top } -> ${ after }` );
	await page.evaluate( () => document.querySelector( '[data-test-scroller]' )?.removeAttribute( 'data-test-scroller' ) );
}
{
	const { ctx, page, errors } = await open( 1440, false, 420 );
	await page.goto( BASE + '/shop/', { waitUntil: 'load', timeout: 90000 } );
	await settle( page );
	await thumbCheck( page, 'shop filter panel', '.sgs-shop-filters__scroll, .wc-block-product-filter-checkbox-list__items, [data-sgs-overlay-scroll]' );
	// Put the simple product in the bag (twice over, as separate adds) so the drawer has rows, then test its items.
	await page.goto( BASE + '/product/qa-simple-toast-fixture/', { waitUntil: 'load', timeout: 90000 } );
	await settle( page );
	for ( let i = 0; i < 2; i++ ) {
		await page.locator( '.single_add_to_cart_button, button[name="add-to-cart"], form.cart button[type="submit"]' ).first().click().catch( () => {} );
		await settle( page, 1500 );
	}
	const trigger = page.locator( '[data-sgs-cart-trigger]' ).first();
	if ( await trigger.count() ) {
		await trigger.click();
		await page.waitForTimeout( 2500 );
		await thumbCheck( page, 'cart drawer items', '.sgs-cart__panel-items' );
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 800 );
	}
	const burger = await page.evaluate( () => {
		const b = [ ...document.querySelectorAll( 'button[aria-controls]' ) ].find( ( x ) => x.checkVisibility?.() && document.getElementById( x.getAttribute( 'aria-controls' ) )?.matches( 'dialog' ) );
		b?.setAttribute( 'data-test-burger', '1' );
		return !! b;
	} );
	if ( burger ) {
		await page.locator( '[data-test-burger]' ).click();
		await page.waitForTimeout( 2000 );
		await thumbCheck( page, 'nav drawer', '.wp-block-sgs-nav-drawer, .sgs-nav-drawer__body' );
	} else {
		// No burger at 1440: the drawer is tested at the widest width that shows one, still with a mouse.
		for ( const w of [ 1280, 1024, 900, 768 ] ) {
			await page.setViewportSize( { width: w, height: 420 } );
			await page.waitForTimeout( 600 );
			const found = await page.evaluate( () => {
				const b = [ ...document.querySelectorAll( 'button[aria-controls]' ) ].find( ( x ) => x.checkVisibility?.() && document.getElementById( x.getAttribute( 'aria-controls' ) )?.matches( 'dialog' ) );
				b?.setAttribute( 'data-test-burger', '1' );
				return !! b;
			} );
			if ( found ) {
				await page.locator( '[data-test-burger]' ).click();
				await page.waitForTimeout( 2000 );
				await thumbCheck( page, `nav drawer (burger first shows at ${ w })`, '.wp-block-sgs-nav-drawer, .sgs-nav-drawer__body' );
				break;
			}
		}
	}
	ok( 'no page errors (thumbs, 1440)', 0 === errors.length, errors.join( ' | ' ) );
	await ctx.close();
}
await br.close();
const fails = results.filter( ( r ) => false === r.pass ).length;
console.log( `\n${ results.length } checks, ${ fails } failed, ${ results.filter( ( r ) => null === r.pass ).length } not applicable` );
process.exit( fails ? 1 : 0 );
