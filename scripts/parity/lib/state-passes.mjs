// The per-state passes of draft-live-walk.mjs that move the page: scroll-in reveals, the reveal sweep
// before a full-page shot, hover end states and keyboard focus rings.
import { HOVER_PROPS, collectRunning, centreOf, hoverStyles, PAINT_SRC } from './collect.mjs';
import { hoverChrome } from './chrome-walk.mjs';
import { focusPass } from './focus.mjs';

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

// Hover end states of the `hover: true` pairs. A phone has no hover (Bean 2026-09-28), so phones skip it.
export async function hoverPass( page, pairs, side, snap, { state, h, RESOLVE, full, phone } ) {
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
