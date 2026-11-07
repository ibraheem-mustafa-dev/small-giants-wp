// C4 recorder: performs one trigger on a page and records what motion starts within a second.
// The in-page sampler arms on the trigger's own event (click, pointer enter or scroll), so time zero is the
// event, and snapshots the animations already running so only those the trigger starts are counted.
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );

export const WINDOW_MS = 1000;

// Runs in the page. Installs the sampler on `sel`'s element ('document' for scroll) for `evt`; false when absent.
export function armSampler( [ sel, evt, windowMs ] ) {
	const el = 'document' === sel ? document : document.querySelector( sel );
	if ( ! el ) {
		return false;
	}
	const skip = new Set( [ 'offset', 'easing', 'composite', 'computedOffset' ] );
	const describe = ( t ) => ( t.id ? '#' + t.id : '' ) + ( String( t.className?.baseVal ?? t.className ?? '' ).trim().split( /\s+/ ).filter( ( c ) => c && ! /^(wp-|has-|is-)/.test( c ) ).slice( 0, 2 ).map( ( c ) => '.' + c ).join( '' ) || t.tagName.toLowerCase() );
	const hiddenWhy = ( t ) => {
		if ( ! t.isConnected ) {
			return 'detached';
		}
		const det = t.closest( 'details:not([open])' );
		if ( det && ! ( t.closest( 'summary' ) && t.closest( 'summary' ).parentElement === det ) ) {
			return 'closed-details';
		}
		if ( t.checkVisibility && ! t.checkVisibility( { visibilityProperty: true } ) ) {
			return 'display-none-or-visibility';
		}
		const r = t.getBoundingClientRect();
		if ( 0 === r.width || 0 === r.height ) {
			return 'zero-size';
		}
		if ( r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth ) {
			return 'off-screen';
		}
		return null;
	};
	window.__c4 = { anims: [], longest: 0, long: 0, done: false, frames: [] };
	const uids = new WeakMap();
	const uid = ( t ) => {
		if ( ! uids.has( t ) ) {
			uids.set( t, uids.size + 1 );
		}
		return uids.get( t );
	};
	const rec = window.__c4;
	let lt = null;
	try {
		lt = new PerformanceObserver( ( l ) => l.getEntries().forEach( ( e ) => {
			rec.long = Math.max( rec.long, e.duration );
		} ) );
		lt.observe( { type: 'longtask', buffered: false } );
	} catch ( e ) { /* longtask unsupported: rAF gaps are still measured */ }
	const handler = () => {
		el.removeEventListener( evt, handler, true );
		const t0 = performance.now();
		const before = new Set( document.getAnimations() );
		const seen = new Map();
		let last = t0;
		const frame = ( now ) => {
			rec.longest = Math.max( rec.longest, now - last );
			last = now;
			for ( const a of document.getAnimations() ) {
				const e = a.effect;
				if ( before.has( a ) || seen.has( a ) || ! e || ! e.target ) {
					continue;
				}
				const kf = e.getKeyframes ? e.getKeyframes() : [];
				const tm = e.getTiming();
				const props = [ ...new Set( kf.flatMap( ( k ) => Object.keys( k ) ).filter( ( k ) => ! skip.has( k ) ) ) ].sort();
				const rec1 = {
					t: Math.round( now - t0 ), uid: uid( e.target ), loop: Infinity === tm.iterations, kind: a.constructor.name, target: describe( e.target ), delay: tm.delay, duration: tm.duration,
					easing: kf[ 0 ]?.easing && 'linear' !== kf[ 0 ].easing ? kf[ 0 ].easing : tm.easing, props, hidden: hiddenWhy( e.target ),
					name: a.animationName || a.transitionProperty || a.id || '',
				};
				seen.set( a, rec1 );
				rec.anims.push( rec1 );
			}
			if ( rec.frames.length < 60 ) {
				const shown = [ ...seen.entries() ].filter( ( [ , r ] ) => ! r.hidden ).slice( 0, 3 );
				rec.frames.push( [ Math.round( now - t0 ), ...shown.map( ( [ a ] ) => {
					const cs = getComputedStyle( a.effect.target );
					return ( +cs.opacity ).toFixed( 2 ) + ' ' + cs.transform.slice( 0, 40 );
				} ) ] );
			}
			if ( now - t0 < windowMs ) {
				requestAnimationFrame( frame );
			} else {
				// Hidden only when still hidden at the end of the window: a panel that is opening (visibility or
				// grid rows still transitioning at the first frame) is not hidden.
				seen.forEach( ( r, a ) => {
					if ( r.hidden ) {
						r.hidden = hiddenWhy( a.effect.target ) ? r.hidden : null;
					}
				} );
				rec.done = true;
				lt && lt.disconnect();
			}
		};
		requestAnimationFrame( frame );
	};
	el.addEventListener( evt, handler, true );
	return true;
}

const unmeasured = ( trigger, reason ) => ( { trigger, status: 'unmeasured', reason, anims: [], longest: 0 } );

async function finish( page, trigger ) {
	await page.waitForFunction( () => window.__c4 && window.__c4.done, null, { timeout: 4000 } ).catch( () => {} );
	const r = await page.evaluate( () => window.__c4 );
	if ( ! r || ! r.done ) {
		return unmeasured( trigger, 'the trigger fired no event on the armed element' );
	}
	return { trigger, status: 'ok', anims: r.anims, longest: Math.round( Math.max( r.longest, r.long ) ), frames: r.frames };
}

// One self-contained in-page finder (page.evaluate serialises it without closures): marks the element for
// `kind` ('open' | 'accordion' | 'nav' | 'arrow') and index n, and returns a selector for it.
export function findTarget( [ kind, n ] ) {
	document.querySelectorAll( '[data-c4-target]' ).forEach( ( e ) => e.removeAttribute( 'data-c4-target' ) );
	const vis = ( e ) => {
		const r = e.getBoundingClientRect();
		return r.width > 0 && r.height > 0 && 'hidden' !== getComputedStyle( e ).visibility;
	};
	const lab = ( e ) => e.getAttribute( 'aria-label' ) || '';
	let el = null;
	if ( 'open' === kind ) {
		el = [ ...document.querySelectorAll( 'button' ) ].find( ( e ) => /open menu/i.test( lab( e ) ) && vis( e ) );
	} else if ( 'accordion' === kind ) {
		el = [ ...document.querySelectorAll( 'summary, button[aria-expanded]' ) ]
			.filter( ( e ) => vis( e ) && ! /menu|search|cart/i.test( lab( e ) ) && ( e.matches( 'summary' ) || 'false' === e.getAttribute( 'aria-expanded' ) ) )[ n ];
	} else if ( 'nav' === kind ) {
		const top = [ ...document.querySelectorAll( 'header a, header button, nav a, nav button' ) ].filter( ( e ) => vis( e ) && e.getBoundingClientRect().top < 160 );
		const names = [ ...new Set( top.map( ( e ) => e.textContent.trim() ).filter( ( t ) => /^(about|sectors|brands|trade)/i.test( t ) ) ) ];
		el = names[ n ] ? top.find( ( e ) => e.textContent.trim() === names[ n ] ) : null;
	} else if ( 'arrow' === kind ) {
		el = [ ...document.querySelectorAll( 'button, [role=button]' ) ].find( ( e ) => vis( e ) && /(next|forward)/i.test( lab( e ) ) && ! /menu|page/i.test( lab( e ) ) );
	}
	if ( ! el ) {
		return null;
	}
	el.setAttribute( 'data-c4-target', '1' );
	return '[data-c4-target="1"]';
}

export async function recordDrawerOpen( page ) {
	const sel = await page.evaluate( findTarget, [ 'open', 0 ] );
	if ( ! sel ) {
		return unmeasured( 'drawer-open', 'no visible open-menu button at this width' );
	}
	await page.evaluate( armSampler, [ sel, 'click', WINDOW_MS ] );
	await page.click( sel );
	return finish( page, 'drawer-open' );
}

// Opens the drawer, lets its entrance settle, then opens accordion row n (0-based).
export async function recordAccordion( page, n ) {
	const trigger = 'drawer-accordion-' + ( n + 1 );
	const open = await page.evaluate( findTarget, [ 'open', 0 ] );
	if ( ! open ) {
		return unmeasured( trigger, 'no visible open-menu button at this width' );
	}
	await page.click( open );
	await page.waitForTimeout( 2200 );
	const sel = await page.evaluate( findTarget, [ 'accordion', n ] );
	if ( ! sel ) {
		return unmeasured( trigger, 'accordion row ' + ( n + 1 ) + ' not found in the open drawer' );
	}
	await page.evaluate( armSampler, [ sel, 'click', WINDOW_MS ] );
	await page.click( sel );
	return finish( page, trigger );
}

export async function recordMega( page, n ) {
	const trigger = 'mega-' + ( n + 1 );
	const sel = await page.evaluate( findTarget, [ 'nav', n ] );
	if ( ! sel ) {
		return unmeasured( trigger, 'no desktop nav item ' + ( n + 1 ) + ' at this width' );
	}
	await page.mouse.move( 5, 400 );
	await page.waitForTimeout( 300 );
	await page.evaluate( armSampler, [ sel, 'pointerenter', WINDOW_MS ] );
	const box = await page.locator( sel ).boundingBox();
	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2, { steps: 8 } );
	const r = await finish( page, trigger );
	r.label = ( await page.locator( sel ).first().innerText().catch( () => '' ) ).trim();
	return r;
}

export async function recordArrow( page ) {
	const sel = await page.evaluate( findTarget, [ 'arrow', 0 ] );
	if ( ! sel ) {
		return unmeasured( 'slider-arrow', 'no visible next-arrow on the page' );
	}
	await page.locator( sel ).scrollIntoViewIfNeeded();
	await page.waitForTimeout( 1200 );
	await page.evaluate( armSampler, [ sel, 'click', WINDOW_MS ] );
	await page.click( sel );
	return finish( page, 'slider-arrow' );
}

// Scrolls down 0.8 viewport at a time; each step is one trigger "scroll-N" recording the animations it starts.
export async function recordScrollSteps( page, maxSteps = 8 ) {
	const out = [];
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 1500 );
	for ( let i = 1; i <= maxSteps; i++ ) {
		const room = await page.evaluate( () => document.documentElement.scrollHeight - innerHeight - scrollY );
		if ( room < 40 ) {
			break;
		}
		await page.evaluate( armSampler, [ 'document', 'scroll', WINDOW_MS ] );
		await page.evaluate( () => window.scrollBy( 0, Math.round( innerHeight * 0.8 ) ) );
		out.push( await finish( page, 'scroll-' + i ) );
	}
	return out;
}
