// Header/footer mode glue for draft-live-walk.mjs: samples motion after each action, collects each
// pair's painted ground, text inset and (for `inventory: true` roots) inventory, reads what a hover
// visibly does, and compares all of it. GAP-CHECKLIST.md section 11.
import { paintedExtras, inventory, timelineSample, hoverDetail } from './chrome.mjs';
import { compareExtras, compareInventory, compareTimeline, hoverEffects, compareHover } from './chrome-compare.mjs';

const SAMPLES = [ 30, 120, 250, 450 ];

// Motion of the timeline roots (pairs with `timeline: true` or `inventory: true`) right after an
// action. Returns the samples and the time spent, so the action's settle wait can be shortened.
export async function sampleTimeline( page, pairs, side, RESOLVE ) {
	const roots = pairs.filter( ( p ) => p.timeline || p.inventory );
	if ( ! roots.length ) {
		return { samples: [], spent: 0 };
	}
	const finders = Object.fromEntries( roots.map( ( p ) => [ p.name, p[ side ] ] ) );
	const samples = [];
	let last = 0;
	for ( const t of SAMPLES ) {
		await page.waitForTimeout( t - last );
		last = t;
		// A tap that navigates destroys the page mid-sample: the sample reads as nothing there.
		const data = await page.evaluate( timelineSample, [ finders, RESOLVE ] ).catch( () => Object.fromEntries( roots.map( ( p ) => [ p.name, null ] ) ) );
		samples.push( { t, data } );
	}
	return { samples, spent: last };
}

export async function collectChrome( page, side, pairs, snap, RESOLVE, timeline ) {
	for ( const p of pairs ) {
		if ( snap[ p.name ].missing ) {
			continue;
		}
		snap[ p.name ].extras = await page.evaluate( paintedExtras, [ p[ side ], RESOLVE ] );
		if ( p.inventory ) {
			snap[ p.name ].inventory = await page.evaluate( inventory, [ p[ side ], RESOLVE ] );
		}
		if ( p.timeline || p.inventory ) {
			snap[ p.name ].timeline = timeline;
		}
	}
}

// Hovers one pair the header-mode way: the rest state, the text 60 and 200ms in (a scramble), and
// the end state, reduced to the effects a visitor sees. `reach` re-runs the state's action when
// the pair is gone (a previous hover closed the panel it lives in); a pair still unreachable is
// reported, never skipped. `hoverAt: [fx, fy]` points at that fraction of the box instead of its
// centre (a label that follows the pointer only moves off-centre).
export async function hoverChrome( page, p, side, RESOLVE, centreOf, reach, wait, box ) {
	let at = await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
	if ( ! at && reach ) {
		await reach();
		at = await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
	}
	if ( ! at ) {
		return { unreached: true };
	}
	const rest = await page.evaluate( hoverDetail, [ p[ side ], RESOLVE ] );
	if ( p.hoverAt && box ) {
		at = { x: at.x + box.w * ( p.hoverAt[ 0 ] - 0.5 ), y: at.y + box.h * ( p.hoverAt[ 1 ] - 0.5 ) };
	}
	await page.mouse.move( at.x, at.y );
	const mids = [];
	for ( const ms of [ 60, 140 ] ) {
		await page.waitForTimeout( ms );
		mids.push( await page.evaluate( hoverDetail, [ p[ side ], RESOLVE ] ) );
	}
	await page.waitForTimeout( Math.max( 0, wait - 200 ) );
	const end = await page.evaluate( hoverDetail, [ p[ side ], RESOLVE ] );
	return { at, fx: [ ...hoverEffects( rest, end, mids ) ] };
}

// Header-mode differences for one pair. The painted ground replaces the raw background-color,
// which misreads a ground painted by a ::before or a child.
export function compareChrome( p, d, l, tol, diffs ) {
	const kept = diffs.filter( ( x ) => ! ( [ 'style', 'hover' ].includes( x.kind ) && 'background-color' === x.key ) );
	if ( d.missing || l.missing ) {
		return kept;
	}
	const out = [ ...kept, ...compareExtras( d.extras, l.extras, tol, false !== p.text ), ...compareInventory( d.inventory, l.inventory, p.inventoryIgnore ) ];
	if ( d.timeline && l.timeline ) {
		out.push( ...compareTimeline( p.name, d.timeline, l.timeline ) );
	}
	if ( p.hover ) {
		if ( d.hoverChrome?.unreached !== l.hoverChrome?.unreached ) {
			out.push( { kind: 'hover', key: 'reached', draft: d.hoverChrome?.unreached ? 'unreached' : 'hovered', live: l.hoverChrome?.unreached ? 'unreached' : 'hovered' } );
		} else if ( d.hoverChrome?.unreached ) {
			out.push( { kind: 'hover', key: 'reached', draft: 'unreached', live: 'unreached' } );
		}
		out.push( ...compareHover( d.hoverChrome?.fx, l.hoverChrome?.fx ) );
	}
	return out;
}
