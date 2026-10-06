#!/usr/bin/env node
/**
 * Verify the one shared "Added to bag" toast on a live site.
 *
 * Every check prints PASS/FAIL with the reading that produced it, so a FAIL
 * names the measured value rather than just the expectation. Run AFTER a
 * deploy of plugins/sgs-blocks.
 *
 * Usage (from plugins/sgs-blocks):
 *   node scripts/verify-toast.mjs <site-origin> [--shop /shop/] [--product 3990]
 *
 * Example:
 *   node scripts/verify-toast.mjs https://sandybrown-nightingale-600381.hostingersite.com
 *
 * Requires: playwright (already a devDependency of this plugin).
 */

import { chromium } from 'playwright';

const ORIGIN = ( process.argv[ 2 ] || '' ).replace( /\/$/, '' );
if ( ! ORIGIN ) {
	console.error( 'Usage: node scripts/verify-toast.mjs <site-origin>' );
	process.exit( 2 );
}

const argOf = ( flag, fallback ) => {
	const i = process.argv.indexOf( flag );
	return i > -1 && process.argv[ i + 1 ] ? process.argv[ i + 1 ] : fallback;
};

const SHOP_PATH = argOf( '--shop', '/shop/' );
const PRODUCT_ID = argOf( '--product', '3990' );
const WIDTHS = [ 375, 768, 1440 ];

const TOAST = '.sgs-toast';
const MSG = '.sgs-toast__message';
const ACTION = '.sgs-toast__action';
const CLOSE = '.sgs-toast__close';
const ADD_BTN = '.product-card__add-to-cart, .sgs-buybox button[type="submit"]';

let failures = 0;

/**
 * Record one check.
 *
 * @param {boolean} ok      Whether the check passed.
 * @param {string}  label   What was checked.
 * @param {string}  reading The measured value behind the verdict.
 */
function check( ok, label, reading ) {
	if ( ! ok ) {
		failures += 1;
	}
	console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ label }\n          reading: ${ reading }` );
}

/** @param {number} ms Milliseconds. @return {Promise<void>} Resolves after ms. */
const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

/**
 * Click the first add-to-bag control on the page and wait for the request to
 * settle.
 *
 * @param {import('playwright').Page} page Playwright page.
 * @return {Promise<boolean>} True when a control was found and clicked.
 */
async function addOnce( page ) {
	const btn = page.locator( ADD_BTN ).first();
	if ( ! ( await btn.count() ) ) {
		return false;
	}
	await btn.scrollIntoViewIfNeeded();
	await btn.click( { force: true } );
	await page.waitForResponse(
		( r ) => r.url().includes( '/sgs/v1/cart/add-item' ),
		{ timeout: 15000 }
	).catch( () => {} );
	await wait( 400 );
	return true;
}

/**
 * Run the whole suite at one viewport width.
 *
 * @param {import('playwright').Browser} browser Browser instance.
 * @param {number}                       width   Viewport width in px.
 */
async function runAt( browser, width ) {
	console.log( `\n=== ${ width }px ===` );
	const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
	const page = await ctx.newPage();
	const consoleErrors = [];
	page.on( 'console', ( m ) => m.type() === 'error' && consoleErrors.push( m.text() ) );

	// ── Announcement counter. Installed BEFORE any add, so it sees every
	// live-region mutation. This is the NEGATIVE CONTROL for double-announce:
	// it counts every element that is (or sits inside) an aria-live/role=status
	// region whose text changes during one add. One add must produce exactly
	// one such region, mutated once — plus the cart badge, which is counted
	// separately because its canonical purpose (the quantity) is different.
	await page.addInitScript( () => {
		window.__sgsAnnouncements = [];
		const isLive = ( el ) => {
			for ( let n = el; n && n.nodeType === 1; n = n.parentElement ) {
				const r = n.getAttribute( 'role' );
				if ( n.hasAttribute( 'aria-live' ) || 'status' === r || 'alert' === r ) {
					return n;
				}
			}
			return null;
		};
		new MutationObserver( ( records ) => {
			for ( const rec of records ) {
				const target =
					rec.target.nodeType === 1 ? rec.target : rec.target.parentElement;
				if ( ! target ) {
					continue;
				}
				const region = isLive( target );
				if ( ! region ) {
					continue;
				}
				window.__sgsAnnouncements.push( {
					selector:
						region.className ||
						region.getAttribute( 'data-sgs-cart-count' ) !== null
							? String( region.className || 'cart-badge' )
							: region.tagName,
					text: ( region.textContent || '' ).trim(),
					isCartBadge: null !== region.closest( '[data-sgs-cart-count]' ) ||
						null !== region.querySelector?.( '[data-sgs-cart-count]' ) ||
						region.hasAttribute( 'data-sgs-cart-count' ),
				} );
			}
		} ).observe( document.documentElement, {
			subtree: true,
			childList: true,
			characterData: true,
		} );
	} );

	await page.goto( `${ ORIGIN }${ SHOP_PATH }`, { waitUntil: 'domcontentloaded' } );
	await page.waitForTimeout( 1500 );

	// 0. The region is server-rendered and present before any interaction.
	//    RED: count 0 — Sgs_Toast::request() never fired, or the footer hook
	//    did not run, so the Interactivity directives would never hydrate.
	const present = await page.locator( TOAST ).count();
	check( present === 1, 'exactly one server-rendered toast region in the DOM', `count=${ present }` );

	// 1. role="status" on the MESSAGE, not the wrapper.
	//    RED: msgRole !== 'status' (nothing announces) or wrapRole === 'status'
	//    (the "View bag" link and close button get read on every announcement).
	const roles = await page.evaluate(
		( [ t, m ] ) => ( {
			wrap: document.querySelector( t )?.getAttribute( 'role' ) ?? null,
			msg: document.querySelector( m )?.getAttribute( 'role' ) ?? null,
			live: document.querySelector( m )?.getAttribute( 'aria-live' ) ?? null,
		} ),
		[ TOAST, MSG ]
	);
	check(
		'status' === roles.msg && 'polite' === roles.live && null === roles.wrap,
		'role="status" + aria-live="polite" on the message only',
		JSON.stringify( roles )
	);

	// 2. The wrapper is never removed from the accessibility tree while idle.
	//    RED: display none, visibility hidden, or the hidden attribute — any
	//    of the three silences the live region permanently.
	const idle = await page.evaluate( ( t ) => {
		const el = document.querySelector( t );
		const cs = getComputedStyle( el );
		return {
			display: cs.display,
			visibility: cs.visibility,
			opacity: cs.opacity,
			hidden: el.hasAttribute( 'hidden' ),
		};
	}, TOAST );
	check(
		'none' !== idle.display && 'hidden' !== idle.visibility && ! idle.hidden && '0' === idle.opacity,
		'idle toast hides by opacity only (stays in the a11y tree)',
		JSON.stringify( idle )
	);

	// 3. Idle controls are not tabbable.
	//    RED: hidden=false on either control while the toast is invisible —
	//    a keyboard user tabs into an invisible surface.
	const idleControls = await page.evaluate(
		( [ a, c ] ) => ( {
			action: document.querySelector( a )?.hasAttribute( 'hidden' ),
			close: document.querySelector( c )?.hasAttribute( 'hidden' ),
		} ),
		[ ACTION, CLOSE ]
	);
	check(
		true === idleControls.action && true === idleControls.close,
		'idle toast controls carry [hidden] (out of the tab order)',
		JSON.stringify( idleControls )
	);

	const countBefore = await page.evaluate(
		() => document.querySelector( '[data-sgs-cart-count]' )?.textContent?.trim() ?? null
	);

	// ── One add ────────────────────────────────────────────────────────────
	const clicked = await addOnce( page );
	check( clicked, 'an add-to-bag control exists on the shop page', `clicked=${ clicked }` );

	if ( clicked ) {
		// 4. Exactly ONE visible toast, showing a success message.
		//    RED: visible=0 (nothing shown) or >1 (a second toast region was
		//    created — the stack/queue failure this build rules out).
		const after = await page.evaluate(
			( [ t, m ] ) => {
				const all = Array.from( document.querySelectorAll( t ) );
				return {
					total: all.length,
					visible: all.filter( ( e ) => e.classList.contains( 'sgs-toast--visible' ) ).length,
					success: all.filter( ( e ) => e.classList.contains( 'sgs-toast--success' ) ).length,
					text: document.querySelector( m )?.textContent?.trim() ?? '',
				};
			},
			[ TOAST, MSG ]
		);
		check(
			1 === after.total && 1 === after.visible && 1 === after.success && /added/i.test( after.text ),
			'one add => exactly ONE visible success toast',
			JSON.stringify( after )
		);

		// 5. The bag drawer must NOT auto-open (Bean's decision A).
		//    RED: a .wc-block-mini-cart drawer/dialog is open, or body carries
		//    WC's drawer-open scroll lock.
		const drawer = await page.evaluate( () => {
			const d = document.querySelector(
				'.wc-block-mini-cart__drawer, .wc-block-components-drawer, dialog.wc-block-mini-cart__drawer'
			);
			return {
				found: !! d,
				open: !! d && ( d.hasAttribute( 'open' ) || getComputedStyle( d ).display !== 'none' ),
				bodyLocked: document.body.classList.contains( 'modal-open' ) ||
					document.body.classList.contains( 'wc-block-components-drawer--is-open' ),
			};
		} );
		check( ! drawer.open && ! drawer.bodyLocked, 'the bag drawer did NOT auto-open', JSON.stringify( drawer ) );

		// 6. NEGATIVE CONTROL — one add announces once, not twice.
		//    RED: more than one DISTINCT non-badge live region mutated, or the
		//    same region's text mutated more than once with different content.
		//    That is the regression the removed inline strips used to cause.
		const ann = await page.evaluate( () => window.__sgsAnnouncements );
		const nonBadge = ann.filter( ( a ) => ! a.isCartBadge && a.text );
		const distinct = [ ...new Set( nonBadge.map( ( a ) => a.text ) ) ];
		check(
			distinct.length === 1,
			'NEGATIVE CONTROL: one add produces ONE distinct announcement',
			`distinct=${ JSON.stringify( distinct ) } badgeMutations=${ ann.filter( ( a ) => a.isCartBadge ).length }`
		);

		// 7. The cart count still updates — proves wc-blocks_added_to_cart
		//    survived the drawer-click removal.
		//    RED: countAfter === countBefore (badge never refreshed) or null
		//    (no sgs/cart block on the page — rerun with a header that has one).
		const countAfter = await page.evaluate(
			() => document.querySelector( '[data-sgs-cart-count]' )?.textContent?.trim() ?? null
		);
		check(
			null !== countAfter && countAfter !== countBefore,
			'cart count updated (wc-blocks_added_to_cart still dispatched)',
			`before=${ countBefore } after=${ countAfter }`
		);

		// 8. Close button geometry + visible focus ring.
		//    RED: width or height under 44, or an outlineWidth of 0px/none
		//    while focused.
		const closeBox = await page.evaluate( ( c ) => {
			const el = document.querySelector( c );
			const r = el.getBoundingClientRect();
			el.focus();
			const cs = getComputedStyle( el );
			return {
				w: Math.round( r.width ),
				h: Math.round( r.height ),
				outlineWidth: cs.outlineWidth,
				outlineStyle: cs.outlineStyle,
				focused: document.activeElement === el,
			};
		}, CLOSE );
		check(
			closeBox.w >= 44 && closeBox.h >= 44,
			'close button is at least 44x44px',
			JSON.stringify( { w: closeBox.w, h: closeBox.h } )
		);
		check(
			closeBox.focused &&
				'none' !== closeBox.outlineStyle &&
				parseFloat( closeBox.outlineWidth ) >= 2,
			'close button has a visible focus ring of 2px or more',
			JSON.stringify( {
				outlineStyle: closeBox.outlineStyle,
				outlineWidth: closeBox.outlineWidth,
			} )
		);

		// 9. "View bag" is present, visible and points at the bag.
		//    RED: hidden=true, or an href that is not the cart URL.
		const action = await page.evaluate( ( a ) => {
			const el = document.querySelector( a );
			const r = el.getBoundingClientRect();
			return {
				hidden: el.hasAttribute( 'hidden' ),
				href: el.getAttribute( 'href' ),
				text: el.textContent.trim(),
				w: Math.round( r.width ),
				h: Math.round( r.height ),
			};
		}, ACTION );
		check(
			! action.hidden && /cart|bag|basket/i.test( action.href || '' ) && action.h >= 44,
			'"View bag" action is visible, 44px tall and links to the bag',
			JSON.stringify( action )
		);

		// 10. FOCUS pauses the auto-close. Focus the close button, wait past
		//     5s, and the toast must still be visible.
		//     RED: sgs-toast--visible gone after 6.5s while focus is inside.
		await page.locator( CLOSE ).focus();
		await wait( 6500 );
		const stillVisibleOnFocus = await page.evaluate(
			( t ) => document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( stillVisibleOnFocus, 'FOCUS pauses the 5s auto-close', `visibleAfter6.5s=${ stillVisibleOnFocus }` );

		// 11. Releasing focus resumes the timer and it closes.
		//     RED: still visible 6.5s after focus left.
		await page.evaluate( () => document.activeElement.blur() );
		await wait( 6500 );
		const closedAfterBlur = await page.evaluate(
			( t ) => ! document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( closedAfterBlur, 'auto-close resumes once focus leaves', `closed=${ closedAfterBlur }` );

		// 12. HOVER pauses the auto-close.
		//     RED: closed while the pointer sat on it.
		await addOnce( page );
		await page.locator( TOAST ).hover();
		await wait( 6500 );
		const stillVisibleOnHover = await page.evaluate(
			( t ) => document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( stillVisibleOnHover, 'HOVER pauses the 5s auto-close', `visibleAfter6.5s=${ stillVisibleOnHover }` );

		// 13. Un-hovering resumes it and it closes at ~5s, not later.
		//     RED: still visible after 6.5s off-hover.
		await page.mouse.move( 2, 2 );
		await wait( 6500 );
		const closedAfterUnhover = await page.evaluate(
			( t ) => ! document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( closedAfterUnhover, 'auto-close resumes once the pointer leaves', `closed=${ closedAfterUnhover }` );

		// 14. Plain auto-close at 5s, untouched.
		//     RED: still visible at 6s (never closes) or already gone at 3s
		//     (closing far too early).
		await addOnce( page );
		await wait( 3000 );
		const at3s = await page.evaluate(
			( t ) => document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		await wait( 3000 );
		const at6s = await page.evaluate(
			( t ) => document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( at3s && ! at6s, 'auto-closes between 3s and 6s (5s target)', `visibleAt3s=${ at3s } visibleAt6s=${ at6s }` );

		// 15. Rapid repeat adds: still ONE region, with a repeat count.
		//     RED: more than one .sgs-toast node, or a message with no (×N)
		//     after three identical adds.
		await addOnce( page );
		await addOnce( page );
		await addOnce( page );
		const rapid = await page.evaluate(
			( [ t, m ] ) => ( {
				nodes: document.querySelectorAll( t ).length,
				visible: document.querySelectorAll( `${ t }.sgs-toast--visible` ).length,
				text: document.querySelector( m )?.textContent?.trim() ?? '',
			} ),
			[ TOAST, MSG ]
		);
		check(
			1 === rapid.nodes && 1 === rapid.visible && /×\s*\d/.test( rapid.text ),
			'rapid repeat adds coalesce into ONE toast with a repeat count',
			JSON.stringify( rapid )
		);

		// 16. Clicking close dismisses it and empties the live region.
		//     RED: still visible, or stale text left behind the invisible
		//     wrapper (a screen reader navigating by element still finds it).
		await page.locator( CLOSE ).click();
		await wait( 300 );
		const afterClose = await page.evaluate(
			( [ t, m ] ) => ( {
				visible: document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
				text: document.querySelector( m ).textContent.trim(),
			} ),
			[ TOAST, MSG ]
		);
		check(
			! afterClose.visible && '' === afterClose.text,
			'close empties the toast and its live region',
			JSON.stringify( afterClose )
		);
	}

	// 17. ERROR toast persists until closed. Forced by failing the proxy call.
	//     RED: the error toast disappears on its own within 8s, or it never
	//     appears, or it still offers "View bag" (the item is not in the bag).
	const errCtx = await browser.newContext( { viewport: { width, height: 900 } } );
	const errPage = await errCtx.newPage();
	await errPage.route( '**/sgs/v1/cart/add-item', ( route ) =>
		route.fulfill( {
			status: 500,
			contentType: 'application/json',
			body: JSON.stringify( { message: 'Forced failure for verification.' } ),
		} )
	);
	await errPage.goto( `${ ORIGIN }${ SHOP_PATH }`, { waitUntil: 'domcontentloaded' } );
	await errPage.waitForTimeout( 1500 );
	const errClicked = await addOnce( errPage );
	if ( errClicked ) {
		await wait( 500 );
		const errShown = await errPage.evaluate(
			( [ t, m, a ] ) => ( {
				visible: document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
				error: document.querySelector( t ).classList.contains( 'sgs-toast--error' ),
				text: document.querySelector( m ).textContent.trim(),
				actionHidden: document.querySelector( a ).hasAttribute( 'hidden' ),
			} ),
			[ TOAST, MSG, ACTION ]
		);
		check(
			errShown.visible && errShown.error && errShown.text.length > 0,
			'a failed add shows an ERROR-coloured toast',
			JSON.stringify( errShown )
		);
		check(
			errShown.actionHidden,
			'an error toast hides "View bag" (the item is not in the bag)',
			`actionHidden=${ errShown.actionHidden }`
		);
		await wait( 8000 );
		const errStill = await errPage.evaluate(
			( t ) => document.querySelector( t ).classList.contains( 'sgs-toast--visible' ),
			TOAST
		);
		check( errStill, 'the error toast STAYS past 8s (until closed)', `visibleAfter8s=${ errStill }` );
	} else {
		check( false, 'error path: an add-to-bag control was found', 'clicked=false' );
	}
	await errCtx.close();

	// 18. Reduced motion honoured.
	//     RED: a non-"none"/non-"all 0s" transition or a non-"none" transform
	//     on the toast under prefers-reduced-motion, or the --animated class
	//     still applied (the store's JS half did not take effect).
	const rmCtx = await browser.newContext( {
		viewport: { width, height: 900 },
		reducedMotion: 'reduce',
	} );
	const rmPage = await rmCtx.newPage();
	await rmPage.goto( `${ ORIGIN }${ SHOP_PATH }`, { waitUntil: 'domcontentloaded' } );
	await rmPage.waitForTimeout( 1500 );
	if ( await addOnce( rmPage ) ) {
		const rm = await rmPage.evaluate( ( t ) => {
			const el = document.querySelector( t );
			const cs = getComputedStyle( el );
			return {
				animatedClass: el.classList.contains( 'sgs-toast--animated' ),
				visible: el.classList.contains( 'sgs-toast--visible' ),
				transitionDuration: cs.transitionDuration,
				transform: cs.transform,
			};
		}, TOAST );
		check(
			! rm.animatedClass &&
				rm.visible &&
				( 'none' === rm.transform || 'matrix(1, 0, 0, 1, 0, 0)' === rm.transform ) &&
				/^0s(,\s*0s)*$/.test( rm.transitionDuration ),
			'reduced motion: no transition, no transform, toast still shows',
			JSON.stringify( rm )
		);
	} else {
		check( false, 'reduced-motion path: an add-to-bag control was found', 'clicked=false' );
	}
	await rmCtx.close();

	// 19. No console errors anywhere in the run.
	//     RED: any entry — most likely an Interactivity hydration failure on
	//     the footer region.
	check( 0 === consoleErrors.length, 'zero console errors', JSON.stringify( consoleErrors.slice( 0, 3 ) ) );

	await ctx.close();
}

/** Entry point. */
async function main() {
	const browser = await chromium.launch();
	for ( const w of WIDTHS ) {
		await runAt( browser, w );
	}
	await browser.close();

	// PDP sanity: the buybox add must route to the SAME one region, and the
	// removed red inline notice must be gone from the markup entirely.
	const browser2 = await chromium.launch();
	const page = await ( await browser2.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
	await page.goto( `${ ORIGIN }/?p=${ PRODUCT_ID }`, { waitUntil: 'domcontentloaded' } );
	await page.waitForTimeout( 1500 );
	console.log( `\n=== PDP (product ${ PRODUCT_ID }) ===` );
	const retired = await page.evaluate( () => ( {
		buyboxRegion: document.querySelectorAll( '.buybox__cart-status-region' ).length,
		cardStrip: document.querySelectorAll( '.product-card__cart-status' ).length,
		toast: document.querySelectorAll( '.sgs-toast' ).length,
	} ) );
	// RED: buyboxRegion or cardStrip above 0 — a retired inline notice is
	// still being rendered; or toast !== 1 — the PDP never asked for one.
	check(
		0 === retired.buyboxRegion && 0 === retired.cardStrip && 1 === retired.toast,
		'PDP: retired inline notices gone, exactly one toast region',
		JSON.stringify( retired )
	);
	await browser2.close();

	console.log( `\n${ failures ? `FAIL — ${ failures } check(s) red` : 'PASS — all checks green' }` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
