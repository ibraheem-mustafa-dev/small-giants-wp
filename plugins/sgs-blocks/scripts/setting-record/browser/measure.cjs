// Opens each job's page in a real Chromium, puts the script-built part on screen the way a visitor does, and reads the
// computed value of every probed property at every width. Run by prove_script_parts.py; writes the results as JSON.
//
//   node measure.cjs <jobs.json> <results.json> <tabs> <session-dir>
//   node measure.cjs sessions <site-url> <session-dir> <simple-id> <variable-id> <variation-id>   (makes the two basket sessions)
//
// A job: {id, url, kind: a block short name (prove_script_parts.py::BLOCKS), session: 'progress'|'complete' (cart only), widths: [1440, 768, 375], probes: [{id, part, props: [...], state: null|'hover'|'focus', pseudo: null|'::before'}]}
// The browser comes from NODE_PATH (an existing Playwright install); nothing is linked or installed here.
const fs = require( 'fs' );
const { chromium } = require( 'playwright' );

const [ , , jobsFile, outFile, tabsArg, sessionDir ] = process.argv;
const jobs = [ 'sessions', 'login' ].includes( jobsFile ) ? [] : JSON.parse( fs.readFileSync( jobsFile, 'utf8' ) );
const tabs = Math.max( 1, parseInt( tabsArg || '4', 10 ) );
// A page holds one block (and its fixture's parents) inside <main>, so the theme's own header and footer are never read.
const SCOPE = { cart: 'main .sgs-cart', form: 'main .sgs-form', 'nav-bar-menu': 'main .sgs-nav-bar-menu', 'gift-order': 'main .sgs-gift-order' };
const WISHLIST_IDS = ( process.env.SR_WISHLIST_IDS || '5993,5994' ).split( ',' ).map( Number );
const scopeOf = ( kind ) => SCOPE[ kind ] || 'main';

// Wait for animations and transitions to finish (a flyout sliding in, a bar filling), up to a limit; a looping one never ends.
async function settle( page, ms = 3000 ) {
	await page.evaluate( ( limit ) => new Promise( ( resolve ) => {
		const start = performance.now();
		const tick = () => {
			const running = document.getAnimations().filter( ( a ) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity );
			if ( ! running.length || performance.now() - start > limit ) { resolve(); return; }
			requestAnimationFrame( tick );
		};
		tick();
	} ), ms );
}

// The cart's panel is a button-opened flyout: click the trigger until the item rows are drawn by panel-render.js.
async function putCartOnScreen( page ) {
	const widget = page.locator( SCOPE.cart ).first();
	await widget.waitFor( { state: 'attached', timeout: 15000 } );
	const rows = page.locator( `${ SCOPE.cart } .sgs-cart__item` );
	const closed = await widget.locator( '[data-sgs-cart-panel]' ).first().evaluate( ( e ) => e.hidden );
	if ( closed || ! ( await rows.count() ) ) {
		await widget.locator( '[data-sgs-cart-trigger]' ).first().click( { timeout: 10000 } );
		await rows.first().waitFor( { state: 'attached', timeout: 15000 } );
	}
	await page.locator( `${ SCOPE.cart } .sgs-cart__free-delivery` ).first().waitFor( { state: 'attached', timeout: 5000 } ).catch( () => {} );
	await settle( page );
}

// The multi-step form: fill the first step's inputs, press Next until a review card is drawn by review-cards.js.
async function putFormOnScreen( page ) {
	await page.locator( SCOPE.form ).first().waitFor( { state: 'attached', timeout: 15000 } );
	for ( let step = 0; step < 4; step++ ) {
		if ( await page.locator( `${ SCOPE.form } .sgs-form-review__term` ).count() ) { break; }
		const visible = page.locator( `${ SCOPE.form } .sgs-form-step:not(.sgs-form-step--hidden)` ).first();
		const inputs = visible.locator( 'input[type=text]:not([tabindex="-1"]), input[type=email], input[type=tel], textarea' );
		const n = await inputs.count();
		for ( let i = 0; i < n; i++ ) {
			const el = inputs.nth( i );
			const type = ( await el.getAttribute( 'type' ) ) || 'text';
			await el.fill( 'email' === type ? 'visitor@example.com' : 'Sample answer ' + ( i + 1 ) );
		}
		const next = page.locator( `${ SCOPE.form } [data-wp-on--click="actions.nextStep"]` ).first();
		await next.click( { timeout: 5000 } );
		await page.waitForTimeout( 400 );
	}
	await page.locator( `${ SCOPE.form } .sgs-form-review__term` ).first().waitFor( { state: 'attached', timeout: 8000 } );
	await settle( page );
}

// The menu's submenu: the visitor points at (or clicks) the first item that opens a panel, and mega-disclosure.js sizes the
// hover bridge under it (--sgs-mm-bridge-h). Below the collapse point the bar is folded into the burger and no item is on
// screen: nothing is opened there, so the bridge is read closed on both pages alike.
async function putNavOnScreen( page, within = '' ) {
	await page.locator( SCOPE[ 'nav-bar-menu' ] ).first().waitFor( { state: 'attached', timeout: 15000 } );
	const sel = `${ SCOPE[ 'nav-bar-menu' ] } .sgs-nav-bar-menu__bar ${ within ? '.' + within + ' ' : '' }[data-sgs-mega-trigger]`;
	const trigger = page.locator( sel ).first();
	if ( ! ( await trigger.count() ) || ! ( await trigger.isVisible() ) ) { await settle( page, 800 ); return; }
	if ( 'true' !== ( await trigger.getAttribute( 'aria-expanded' ) ) ) {
		await trigger.hover( { timeout: 5000 } ).catch( () => {} );
		await page.waitForTimeout( 400 );
		if ( 'true' !== ( await trigger.getAttribute( 'aria-expanded' ) ) ) { await trigger.click( { timeout: 5000 } ).catch( () => {} ); }
	}
	// a panel that never opens (a changed setting stops it, a slow script) is read closed, not a failed visit
	await page.waitForFunction( ( s ) => { const t = document.querySelector( s ); return t && 'true' === t.getAttribute( 'aria-expanded' ); }, sel, { timeout: 5000 } ).catch( () => {} );
	await settle( page, 1500 );
	await page.waitForTimeout( 300 );
}

// A block whose script builds its parts when the page loads: wait for the page to be quiet, then read.
async function putLoadedOnScreen( page ) {
	await page.locator( 'main' ).first().waitFor( { state: 'attached', timeout: 15000 } );
	await page.waitForTimeout( 1200 );
	await settle( page );
}

// The drawer menu's effects (the drill-down Back button among them) load on the first key press, touch or pointer press on the
// page (src/blocks/nav-drawer-menu/view.js::whenFirstNeeded): a visitor pressing a key starts them, then the Back button exists.
async function putDrawerMenuOnScreen( page ) {
	await putLoadedOnScreen( page );
	if ( ! ( await page.locator( 'main .sgs-nav-drawer-menu__drill-back-btn' ).count() ) ) {
		await page.keyboard.press( 'Shift' );
		await page.locator( 'main .sgs-nav-drawer-menu__drill-back-btn' ).first().waitFor( { state: 'attached', timeout: 6000 } ).catch( () => {} );
	}
	await settle( page );
}

// The gift note fields exist once the shopper ticks "This is a gift" (src/commerce-blocks/gift/component.js, fields.js): tick it in the
// basket's own block, and wait for the name input.
async function putGiftOnScreen( page ) {
	await page.locator( 'main .sgs-gift-order__checkbox' ).first().waitFor( { state: 'attached', timeout: 20000 } );
	if ( ! ( await page.locator( 'main .sgs-gift-order__input' ).count() ) ) {
		await page.locator( 'main .sgs-gift-order__checkbox' ).first().check( { timeout: 10000, force: true } );
		await page.locator( 'main .sgs-gift-order__input' ).first().waitFor( { state: 'attached', timeout: 10000 } ).catch( () => {} );
	}
	await settle( page );
}

// The table is the list of blocks this file can put on screen: a job for any other block throws (runJob), it is never read
// with another block's steps.
const PUT = { cart: putCartOnScreen, form: putFormOnScreen, 'nav-bar-menu': putNavOnScreen };
PUT[ 'gift-order' ] = putGiftOnScreen;
PUT[ 'nav-drawer-menu' ] = putDrawerMenuOnScreen;
for ( const kind of [ 'audio', 'business-info', 'choice-flow', 'gallery', 'google-reviews', 'media', 'nav-drawer', 'post-grid', 'tabs', 'testimonial-slider', 'testimonial', 'timeline', 'wishlist-panel' ] ) { PUT[ kind ] = putLoadedOnScreen; }

// The elements a record part names. A part is a class; a class a render folds an instance id into (`sgs-<block>-1a2b3c4d-work`
// is written `sgs-<block>-work` in a record) is found by its folded name too, so those elements are marked and read by the mark.
// `ROOT` is the block's own wrapper.
async function partSelector( page, kind, part, within ) {
	const scope = scopeOf( kind );
	if ( within ) { return `${ scope } ${ within } .${ part }`; }
	if ( 'ROOT' === part ) { return `${ scope } .wp-block-sgs-${ kind }`; }
	const head = `sgs-${ kind }-`;
	if ( ! part.startsWith( head ) || /[_ ]/.test( part ) ) { return `${ scope } .${ part }`; }
	await page.evaluate( ( { scope: sc, part: pt, head: hd } ) => {
		document.querySelectorAll( '[data-sr-part]' ).forEach( ( e ) => e.removeAttribute( 'data-sr-part' ) );
		const re = new RegExp( '^' + hd + '[0-9a-f]{8}-' + pt.slice( hd.length ) + '$' );
		document.querySelectorAll( `${ sc }, ${ sc } *` ).forEach( ( e ) => {
			if ( e.classList.contains( pt ) || Array.from( e.classList ).some( ( c ) => re.test( c ) ) ) { e.setAttribute( 'data-sr-part', pt ); }
		} );
	}, { scope, part, head } );
	return '[data-sr-part]';
}

// Reads one probe: every element carrying the part class inside the block, the property values, optionally under a forced state.
async function readProbe( page, cdp, kind, probe ) {
	if ( probe.scan ) {
		// Every element of the block (and its ::before / ::after where they draw), for the re-filing check: which other part moves?
		return page.evaluate( ( { scope, props } ) => {
			const root = document.querySelector( scope );
			const els = root ? [ root, ...root.querySelectorAll( '*' ) ].filter( ( e ) => ! [ 'SCRIPT', 'STYLE' ].includes( e.tagName ) ) : [];
			const out = [];
			els.forEach( ( e ) => {
				const cls = ( typeof e.className === 'string' ? e.className : '' ).trim() || e.tagName.toLowerCase();
				[ null, '::before', '::after' ].forEach( ( ps ) => {
					const cs = getComputedStyle( e, ps );
					if ( ps && 'none' === cs.getPropertyValue( 'content' ) ) { return; }
					const v = {};
					props.forEach( ( p ) => { v[ p ] = cs.getPropertyValue( p ); } );
					out.push( { c: cls + ( ps || '' ), v } );
				} );
			} );
			return { n: out.length, shown: out.length > 0, els: out };
		}, { scope: scopeOf( kind ), props: probe.props } );
	}
	// a submenu entry held `open` is read with the panel of the probed item itself open (its own trigger), not the first one
	if ( 'nav-bar-menu' === kind && 'open' === probe.state ) { await putNavOnScreen( page, probe.part ); }
	// a completed step: the visitor taps an answer (advanceMode tap), and the stepper marks the first item complete (flow-progress.js)
	if ( 'choice-flow' === kind && probe.within && probe.within.includes( 'is-complete' ) && ! ( await page.locator( `${ scopeOf( kind ) } .sgs-choice-flow__stepper-item.is-complete` ).count() ) ) {
		await page.locator( `${ scopeOf( kind ) } .sgs-choice-flow-question__option-button` ).first().click( { timeout: 5000 } ).catch( () => {} );
		await page.waitForTimeout( 600 );
		await settle( page, 1500 );
	}
	// The control bar shows itself whenever the video is not playing (`.sgs-video:not(.is-playing) .sgs-video__bar`), which hides what hover
	// and focus add to it: the bar is read while the video plays. The page's own 'play' handler (media/view.js::enhance) puts the player in
	// that state; the file the fixture names cannot be fetched, so the event is the one thing played.
	if ( 'media' === kind && 'sgs-video__bar' === probe.part ) {
		await page.evaluate( () => document.querySelectorAll( 'main video' ).forEach( ( v ) => v.dispatchEvent( new Event( 'play' ) ) ) );
		await settle( page, 1500 );
	}
	const selector = await partSelector( page, kind, probe.part, probe.within );
	let nodeIds = [];
	let ancestorIds = [];
	// hover, active and focus are forced; any other state (a submenu `open`) is the one the page was put in (putNavOnScreen)
	const forced = 'hover' === probe.state ? [ 'hover' ] : ( 'active' === probe.state ? [ 'active' ] : ( 'focus' === probe.state ? [ 'focus', 'focus-visible' ] : [] ) );
	if ( forced.length ) {
		const { root } = await cdp.send( 'DOM.getDocument', { depth: -1 } );
		( { nodeIds } = await cdp.send( 'DOM.querySelectorAll', { nodeId: root.nodeId, selector } ) );
		for ( const nodeId of nodeIds ) { await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced } ); }
		// A visitor's pointer or focus also puts every ancestor in the state (:hover on the whole chain, :focus-within on each parent), and
		// a rule may be written on the parent (`.sgs-video:focus-within .sgs-video__bar`): the ancestors are forced to match.
		await page.evaluate( ( sel ) => {
			document.querySelectorAll( '[data-sr-anc]' ).forEach( ( e ) => e.removeAttribute( 'data-sr-anc' ) );
			document.querySelectorAll( sel ).forEach( ( e ) => { for ( let a = e.parentElement; a; a = a.parentElement ) { a.setAttribute( 'data-sr-anc', '1' ); } } );
		}, selector );
		const ancestorState = 'hover' === probe.state ? [ 'hover' ] : ( 'focus' === probe.state ? [ 'focus-within' ] : [] );
		if ( ancestorState.length ) {
			( { nodeIds: ancestorIds } = await cdp.send( 'DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-sr-anc]' } ) );
			for ( const nodeId of ancestorIds ) { await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ancestorState } ); }
		}
		// a transition on the property starts when the state is forced: read the value it ends on, not the first frame
		await settle( page, 1500 );
	}
	const out = await page.evaluate( ( { selector: sel, props, pseudo } ) => {
		const els = Array.from( document.querySelectorAll( sel ) );
		return {
			n: els.length,
			shown: els.some( ( e ) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle( e ).display !== 'none'; } ),
			els: els.map( ( e ) => { const cs = getComputedStyle( e, pseudo || null ); const o = {}; props.forEach( ( p ) => { o[ p ] = cs.getPropertyValue( p ); } ); return o; } ),
		};
	}, { selector, props: probe.props, pseudo: probe.pseudo } );
	for ( const nodeId of [ ...nodeIds, ...ancestorIds ] ) { await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } ).catch( () => {} ); }
	return out;
}

async function runJob( browser, job ) {
	const stored = [ 'cart', 'gift-order' ].includes( job.kind ) ? `${ sessionDir }/cart-${ job.session || 'progress' }.json` : ( 'wishlist-panel' === job.kind && 'member' === job.session ? `${ sessionDir }/wishlist-member.json` : null );
	// the timeline's effect canvases are built by scripts that skip a phone (data-sgs-fx-disable-mobile): its page loads wide, then narrows
	const ctx = await browser.newContext( { viewport: { width: 'timeline' === job.kind ? Math.max( 1440, job.widths[ 0 ] ) : job.widths[ 0 ], height: 900 }, ...( stored ? { storageState: stored } : {} ) } );
	// A guest's saved items live in localStorage (src/shared/wishlist-store/local-state.js): two products, the first saved at a higher price
	// than it costs now (shared/wishlist-store/prices.js holds the saved prices), so the price-drop line draws.
	if ( 'wishlist-panel' === job.kind && 'member' !== job.session ) {
		await ctx.addInitScript( ( ids ) => {
			window.localStorage.setItem( 'sgs-wishlist', JSON.stringify( ids ) );
			window.localStorage.setItem( 'sgs-wishlist-prices', JSON.stringify( { [ ids[ 0 ] ]: { p: 3000, c: 'GBP' } } ) );
		}, WISHLIST_IDS );
	}
	const res = { id: job.id, ok: false, error: null, widths: {} };
	try {
		const page = await ctx.newPage();
		await page.goto( job.url, { waitUntil: 'load', timeout: 45000 } );
		await page.waitForTimeout( 500 );
		const cdp = await ctx.newCDPSession( page );
		await cdp.send( 'DOM.enable' );
		await cdp.send( 'CSS.enable' );
		await PUT[ job.kind ]( page );
		for ( const width of job.widths ) {
			await page.setViewportSize( { width, height: 900 } );
			await page.waitForTimeout( 350 );
			// A resize can close the flyout; open it again before reading.
			if ( 'form' === job.kind ) { await settle( page, 1500 ); } else { await PUT[ job.kind ]( page ); }
			const probes = {};
			for ( const probe of job.probes ) { probes[ probe.id ] = await readProbe( page, cdp, job.kind, probe ); }
			res.widths[ width ] = probes;
		}
		res.ok = true;
	} catch ( error ) {
		res.error = String( error && error.message ? error.message : error ).slice( 0, 400 );
	}
	await ctx.close();
	return res;
}

// Two baskets, saved as browser sessions: 'progress' (a branded simple product and a variable product, under the free-delivery
// threshold, so the bar shows how much is left) and 'complete' (a second simple product on top, over it, so the bar shows the
// unlocked state). Each is a shopper's own basket made through WooCommerce's add-to-cart link.
async function makeSessions( site, dir, simple, variable, variation ) {
	const browser = await chromium.launch();
	for ( const name of [ 'progress', 'complete' ] ) {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await page.goto( `${ site }/?add-to-cart=${ simple }` );
		await page.goto( `${ site }/?add-to-cart=${ variable }&variation_id=${ variation }&attribute_size=M` );
		if ( 'complete' === name ) { await page.goto( `${ site }/?add-to-cart=${ simple }` ); }
		await ctx.storageState( { path: `${ dir }/cart-${ name }.json` } );
		await ctx.close();
	}
	await browser.close();
}

// The signed-in shopper (the scratch site's own account): a browser session saved after the login form.
async function makeLogin( site, dir, user, pass ) {
	const browser = await chromium.launch();
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.goto( `${ site }/wp-login.php`, { waitUntil: 'load' } );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForNavigation( { waitUntil: 'load' } ), page.click( '#wp-submit' ) ] );
	await ctx.storageState( { path: `${ dir }/wishlist-member.json` } );
	await browser.close();
}

( async () => {
	if ( 'login' === jobsFile ) {
		const [ , , , site, dir, user, pass ] = process.argv;
		await makeLogin( site, dir, user, pass );
		return;
	}
	if ( 'sessions' === jobsFile ) {
		const [ , , , site, dir, simple, variable, variation ] = process.argv;
		await makeSessions( site, dir, simple, variable, variation );
		return;
	}
	const browser = await chromium.launch();
	const results = [];
	let next = 0;
	const t0 = Date.now();
	const worker = async () => {
		while ( next < jobs.length ) {
			const job = jobs[ next++ ];
			results.push( await runJob( browser, job ) );
		}
	};
	await Promise.all( Array.from( { length: tabs }, worker ) );
	await browser.close();
	fs.writeFileSync( outFile, JSON.stringify( { seconds: ( Date.now() - t0 ) / 1000, tabs, results } ) );
} )();
