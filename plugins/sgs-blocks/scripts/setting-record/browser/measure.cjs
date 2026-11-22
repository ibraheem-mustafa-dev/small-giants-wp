// Opens each job's page in a real Chromium, puts the script-built part on screen the way a visitor does, and reads the
// computed value of every probed property at every width. Run by prove_script_parts.py; writes the results as JSON.
//
//   node measure.cjs <jobs.json> <results.json> <tabs> <session-dir>
//   node measure.cjs sessions <site-url> <session-dir> <simple-id> <variable-id> <variation-id>   (makes the two basket sessions)
//
// A job: {id, url, kind: 'cart'|'form', session: 'progress'|'complete' (cart only), widths: [1440, 768, 375], probes: [{id, part, props: [...], state: null|'hover'|'focus', pseudo: null|'::before'}]}
// The browser comes from NODE_PATH (an existing Playwright install); nothing is linked or installed here.
const fs = require( 'fs' );
const { chromium } = require( 'playwright' );

const [ , , jobsFile, outFile, tabsArg, sessionDir ] = process.argv;
const jobs = 'sessions' === jobsFile ? [] : JSON.parse( fs.readFileSync( jobsFile, 'utf8' ) );
const tabs = Math.max( 1, parseInt( tabsArg || '4', 10 ) );
const SCOPE = { cart: 'main .sgs-cart', form: 'main .sgs-form' };

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
		}, { scope: SCOPE[ kind ], props: probe.props } );
	}
	const selector = `${ SCOPE[ kind ] } .${ probe.part }`;
	let nodeIds = [];
	const forced = probe.state ? ( 'hover' === probe.state ? [ 'hover' ] : [ 'focus', 'focus-visible' ] ) : [];
	if ( forced.length ) {
		const { root } = await cdp.send( 'DOM.getDocument', { depth: -1 } );
		( { nodeIds } = await cdp.send( 'DOM.querySelectorAll', { nodeId: root.nodeId, selector } ) );
		for ( const nodeId of nodeIds ) { await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced } ); }
	}
	const out = await page.evaluate( ( { selector: sel, props, pseudo } ) => {
		const els = Array.from( document.querySelectorAll( sel ) );
		return {
			n: els.length,
			shown: els.some( ( e ) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle( e ).display !== 'none'; } ),
			els: els.map( ( e ) => { const cs = getComputedStyle( e, pseudo || null ); const o = {}; props.forEach( ( p ) => { o[ p ] = cs.getPropertyValue( p ); } ); return o; } ),
		};
	}, { selector, props: probe.props, pseudo: probe.pseudo } );
	for ( const nodeId of nodeIds ) { await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } ); }
	return out;
}

async function runJob( browser, job ) {
	const ctx = await browser.newContext( { viewport: { width: job.widths[ 0 ], height: 900 }, ...( 'cart' === job.kind ? { storageState: `${ sessionDir }/cart-${ job.session || 'progress' }.json` } : {} ) } );
	const res = { id: job.id, ok: false, error: null, widths: {} };
	try {
		const page = await ctx.newPage();
		await page.goto( job.url, { waitUntil: 'load', timeout: 45000 } );
		await page.waitForTimeout( 500 );
		const cdp = await ctx.newCDPSession( page );
		await cdp.send( 'DOM.enable' );
		await cdp.send( 'CSS.enable' );
		await ( 'cart' === job.kind ? putCartOnScreen( page ) : putFormOnScreen( page ) );
		for ( const width of job.widths ) {
			await page.setViewportSize( { width, height: 900 } );
			await page.waitForTimeout( 350 );
			// A resize can close the flyout; open it again before reading.
			if ( 'cart' === job.kind ) { await putCartOnScreen( page ); } else { await settle( page, 1500 ); }
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

( async () => {
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
