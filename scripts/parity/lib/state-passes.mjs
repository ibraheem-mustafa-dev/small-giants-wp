// The per-state passes of draft-live-walk.mjs that move the page: scroll-in reveals, the reveal sweep
// before a full-page shot, hover end states and keyboard focus rings.
import { HOVER_PROPS, ACTIVE_PROPS, FOCUS_PROPS, collectRunning, centreOf, hoverStyles } from './collect.mjs';
import { PAINT_SRC } from './paint.mjs';
import { hoverChrome } from './chrome-walk.mjs';
import { forcedHover, forcedPseudo } from './devtools.mjs';
import { focusPass } from './focus.mjs';
import { INTERACTIVE_CAP } from './auto-compare.mjs';

export const SCROLL_PROPS = [ 'opacity', 'transform', 'translate', 'scale', 'filter' ];

// Scroll-in pairs: the animations started ~60ms after each is scrolled to, and its pose once settled
// (`scrollWait`, default 1500ms). The pre-scroll pose is read by the caller before anything scrolls.
export async function scrollInPass( page, scrollIns, side, snap, RESOLVE ) {
	for ( const p of scrollIns ) {
		await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
		await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
		await page.waitForTimeout( 60 );
		snap[ p.name ].scroll.running = await page.evaluate( collectRunning, [ p[ side ], RESOLVE ] );
		await page.waitForTimeout( p.scrollWait ?? 1500 );
		snap[ p.name ].scroll.post = await page.evaluate( hoverStyles, [ p[ side ], SCROLL_PROPS, RESOLVE, PAINT_SRC ] );
	}
}

// Scrolls the page top to bottom a screen at a time, so every scroll reveal fires on both sides before
// a full-page shot (a draft that reveals by script otherwise shows blank sections), then returns to `y`.
export async function revealSweep( page, y ) {
	const [ vh, total ] = await page.evaluate( () => [ innerHeight, document.documentElement.scrollHeight ] );
	for ( let top = 0; top < total; top += Math.round( vh * 0.8 ) ) {
		await page.evaluate( ( t ) => window.scrollTo( { top: t, behavior: 'instant' } ), top );
		await page.waitForTimeout( 250 );
	}
	await page.evaluate( ( t ) => window.scrollTo( { top: t, behavior: 'instant' } ), y );
	await page.waitForTimeout( 1200 );
}

// Hover end states of the `hover: true` pairs, under a real pointer. With a DevTools session (ref-traced walks) every
// other pair's hover end state is read too, with :hover forced on it and its ancestors (devtools.mjs::forcedHover).
// A phone has no hover (Bean 2026-09-28), so phones skip it.
export async function hoverPass( page, pairs, side, snap, { state, h, RESOLVE, full, phone, cdp = null } ) {
	for ( const p of cdp && ! phone ? pairs.filter( ( q ) => ! q.hover && ! snap[ q.name ].missing ) : [] ) {
		snap[ p.name ].hover = await forcedHover( cdp, page, p[ side ], RESOLVE, () => page.evaluate( hoverStyles, [ p[ side ], p.hoverProps || HOVER_PROPS, RESOLVE, PAINT_SRC ] ) );
	}
	for ( const p of pairs.filter( ( q ) => q.hover && ! phone ) ) {
		if ( snap[ p.name ].missing ) {
			continue;
		}
		if ( full ) {
			// Re-runs the state's action when an earlier hover closed what this pair lives in.
			const reach = state[ side ] ? async () => {
				h.log = [];
				await state[ side ]( h );
			} : null;
			snap[ p.name ].hoverChrome = await hoverChrome( page, p, side, RESOLVE, centreOf, reach, p.hoverWait ?? 800, snap[ p.name ].box );
			if ( snap[ p.name ].hoverChrome.unreached ) {
				continue;
			}
		} else {
			const at = await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
			if ( ! at ) {
				continue;
			}
			await page.mouse.move( at.x, at.y );
			await page.waitForTimeout( p.hoverWait ?? 800 );
		}
		snap[ p.name ].hover = await page.evaluate( hoverStyles, [ p[ side ], p.hoverProps || HOVER_PROPS, RESOLVE, PAINT_SRC ] );
		await page.mouse.move( 1, 1 );
		await page.waitForTimeout( 400 );
	}
}

// Keyboard focus rings of the `hover: true` pairs (and `focus: true` ones), at the same widths as hover:
// a phone has no Tab key. `focus: false` opts a pair out.
export async function focusPasses( page, pairs, side, snap, RESOLVE, phone ) {
	for ( const p of pairs.filter( ( q ) => ( q.focus ?? q.hover ) && ! phone ) ) {
		if ( ! snap[ p.name ].missing ) {
			snap[ p.name ].focus = await focusPass( page, p, side, RESOLVE );
		}
	}
}

// Pressed (:active) end states, read with :active forced on the element and its ancestors (devtools.mjs::forcedPseudo), after
// the transitions finish (GAP-CHECKLIST.md section 23). `all` (a ref-traced walk, which already holds a DevTools session)
// reads every pair that does not opt out with `active: false`; otherwise only pairs flagged `active: true`. A text run or a
// group measures no one element, so it has no pressed state. Unlike hover and focus, a phone is read: a touch presses.
export async function activePass( page, pairs, side, snap, RESOLVE, cdp, { all = false } = {} ) {
	if ( ! cdp ) {
		return;
	}
	for ( const p of pairs.filter( ( q ) => ( all ? false !== q.active : true === q.active ) && ! snap[ q.name ].missing && ! q[ side ]?.textRun && ! q[ side ]?.group ) ) {
		const props = p.activeProps || ACTIVE_PROPS;
		snap[ p.name ].active = await forcedPseudo( cdp, page, p[ side ], RESOLVE, [ 'active' ], () => page.evaluate( hoverStyles, [ p[ side ], props, RESOLVE, PAINT_SRC ] ) );
	}
}

// Focus and press feedback of the automatic check's interactive elements (auto-collect.mjs's `interactives`, window.__crInter),
// the first INTERACTIVE_CAP (60) of a state: each is read at rest, with focus and focus-visible forced (not on a phone, which
// has no Tab key) and with :active forced, onto auto.interactives[i].rest / .focus / .active. Compared by
// auto-compare.mjs::compareInteractive.
export async function readInteractives( page, cdp, auto, RESOLVE, { phone = false } = {} ) {
	if ( ! cdp || ! auto?.interactives?.length ) {
		return;
	}
	const rest = [ ...new Set( [ ...FOCUS_PROPS, ...ACTIVE_PROPS ] ) ];
	for ( const [ i, c ] of auto.interactives.slice( 0, INTERACTIVE_CAP ).entries() ) {
		const finder = { js: `() => window.__crInter[${ i }]` };
		const read = ( props ) => () => page.evaluate( hoverStyles, [ finder, props, RESOLVE, PAINT_SRC ] ).catch( () => null );
		c.rest = await read( rest )();
		if ( ! c.rest ) {
			continue;
		}
		if ( ! phone ) {
			c.focus = await forcedPseudo( cdp, page, finder, RESOLVE, [ 'focus', 'focus-visible' ], read( FOCUS_PROPS ) ).catch( () => null );
		}
		c.active = await forcedPseudo( cdp, page, finder, RESOLVE, [ 'active' ], read( ACTIVE_PROPS ) ).catch( () => null );
	}
}

// Line counts (GAP-CHECKLIST.md section 25) of the pairs flagged `lines: true` and any flagged `timeline: true`: the number of
// line boxes of each pair's text (paint.mjs::lineRows) at 30, 120, 250 and 450ms after the state's action (run from
// draft-live-walk.mjs's onAction beside the motion timeline). Returns { samples: [{ t, data: { name: count|null } }], spent }.
export const LINE_SAMPLES = [ 30, 120, 250, 450 ];
const countLines = ( [ finders, resolveSrc, paintSrc ] ) => {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const { lineRows } = new Function( `${ paintSrc }; return { lineRows };` )();
	return Object.fromEntries( Object.entries( finders ).map( ( [ name, f ] ) => {
		const el = resolve( f );
		return [ name, el ? lineRows( el ) : null ];
	} ) );
};
const lineRoots = ( pairs ) => pairs.filter( ( p ) => ! p.draft?.group && ! p.live?.group && ( p.lines || p.timeline ) );
export async function sampleLines( page, pairs, side, RESOLVE ) {
	const roots = lineRoots( pairs );
	if ( ! roots.length ) {
		return { samples: [], spent: 0 };
	}
	const finders = Object.fromEntries( roots.map( ( p ) => [ p.name, p[ side ] ] ) );
	const samples = [];
	let last = 0;
	for ( const t of LINE_SAMPLES ) {
		await page.waitForTimeout( t - last );
		last = t;
		// A tap that navigates destroys the page mid-sample: the sample reads as nothing there.
		const data = await page.evaluate( countLines, [ finders, RESOLVE, PAINT_SRC ] ).catch( () => Object.fromEntries( roots.map( ( p ) => [ p.name, null ] ) ) );
		samples.push( { t, data } );
	}
	return { samples, spent: last };
}

// Each flagged pair's settled count, then the snapshot's `lines`: { at: { <ms>: count }, settled: count }.
export async function settledLines( page, pairs, side, RESOLVE, snap, samples ) {
	const roots = lineRoots( pairs ).filter( ( p ) => snap[ p.name ] && ! snap[ p.name ].missing );
	if ( ! roots.length ) {
		return;
	}
	const finders = Object.fromEntries( roots.map( ( p ) => [ p.name, p[ side ] ] ) );
	const settled = await page.evaluate( countLines, [ finders, RESOLVE, PAINT_SRC ] ).catch( () => ( {} ) );
	for ( const p of roots ) {
		snap[ p.name ].lines = { at: Object.fromEntries( ( samples || [] ).map( ( s ) => [ s.t, s.data?.[ p.name ] ?? null ] ) ), settled: settled[ p.name ] ?? null };
	}
}
