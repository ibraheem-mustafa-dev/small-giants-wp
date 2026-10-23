// Every state of draft-live-walk.mjs starts from the page's rest (GAP-CHECKLIST.md section 30). The page at rest is read
// once, just before the first state's action (after the load, the config's `open` and the load entrances), as a rest
// signature: the scroll, any scroll lock (html and body overflow, body and html position), the open dialogs, modals,
// popovers and disclosures, the elements made inert or hidden from assistive technology at page level, the focused
// element, and every layer in the viewport whatever its size (fixed, or transformed and absolute or sticky; a 300px drawer with no
// ARIA at 1440), never an svg's drawing groups or an in-flow element taking a transform.
// Layers are named by tag, id and first class, each name once, so a carousel's slide giving way to the next is no change. Before every later state the signature is read again: a page still at rest runs
// the state where it is (a wizard step chosen inside a modal the config's `open` opened is at rest), a page that is not
// (a drawer, a scroll, a lock the previous state left) is loaded afresh and the config's `open` runs again, and a page
// still not at rest after that is refused with its reason, never measured. A state marked `from: 'previous'` runs on the
// previous state's page as it is (a step that needs the panel the step before opened); `from: 'rest'` loads afresh
// whatever the signature says.
// A state whose action finds nothing to trigger on either side (every click, tap or hover it tried found no target: a
// typo in a click target, the Menu button at desktop widths) is one open `(state)` row `nothing-to-trigger`, not one row
// per property; a state that only means something at some widths says so with `widths` on the state, and is not run at
// the others.
import fs from 'fs';
import path from 'path';
import { settleAnimations } from './devtools.mjs';

// In-page: the rest signature of the page as it stands.
export function restSignature() {
	const shows = ( e ) => {
		const cs = getComputedStyle( e );
		const r = e.getBoundingClientRect();
		return 'hidden' !== cs.visibility && 0 !== Number( cs.opacity ) && r.width > 0 && r.height > 0;
	};
	const shown = ( sel ) => [ ...document.querySelectorAll( sel ) ].filter( shows ).length;
	const inView = ( e ) => {
		const r = e.getBoundingClientRect();
		return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
	};
	const name = ( e ) => {
		const cls = ( e.getAttribute( 'class' ) || '' ).trim().split( /\s+/ )[ 0 ];
		return `${ e.localName }${ e.id ? '#' + e.id : '' }${ cls ? '.' + cls : '' }`;
	};
	const names = ( list ) => [ ...new Set( list.map( name ) ) ].sort().join( ' ' );
	const layers = names( [ ...document.querySelectorAll( 'body *' ) ].filter( ( e ) => {
		const cs = getComputedStyle( e );
		// A layer sits above the flow: fixed, or moved by a transform while taken out of the flow (absolute or sticky).
		// An in-flow element taking a transform (a logo's animated svg paths, a lifted card) is content, not a layer.
		const layer = 'fixed' === cs.position || ( 'none' !== cs.transform && /^(absolute|sticky)$/.test( cs.position ) );
		return layer && shows( e ) && inView( e );
	} ) );
	// Page-level aria-hidden: on a child of body, or on an element that is or holds a landmark (an icon's own is not).
	const LANDMARK = 'main, header, footer, nav, aside, [role="main"], [role="banner"], [role="contentinfo"], [role="navigation"]';
	const hidden = names( [ ...document.querySelectorAll( '[aria-hidden="true"]' ) ].filter( ( e ) => e.parentElement === document.body || e.matches( LANDMARK ) || e.querySelector( LANDMARK ) ) );
	const focused = document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement ? name( document.activeElement ) : '';
	const html = getComputedStyle( document.documentElement );
	const body = getComputedStyle( document.body );
	return {
		scroll: `${ Math.round( scrollX ) },${ Math.round( scrollY ) }`,
		lock: `${ html.overflowY } ${ body.overflowY } ${ body.position } ${ html.position }`,
		dialogs: shown( 'dialog[open]' ),
		modals: shown( '[aria-modal="true"], [role="dialog"]' ),
		popovers: shown( ':popover-open' ),
		disclosures: document.querySelectorAll( 'details[open], [aria-expanded="true"]' ).length,
		inert: names( [ ...document.querySelectorAll( '[inert]' ) ] ),
		hidden,
		focus: focused,
		layers,
	};
}

const LABELS = { scroll: 'scroll', lock: 'scroll lock (html, body overflow-y; body, html position)', dialogs: 'open dialogs', modals: 'shown modals', popovers: 'open popovers', disclosures: 'open disclosures (details, aria-expanded)', inert: 'inert elements', hidden: 'page-level aria-hidden', focus: 'focused element', layers: 'fixed or transformed layers in the viewport' };

// What differs between the signature at rest and now: one line per field, empty when the page is at rest.
export function restDiff( rest, now ) {
	if ( ! rest || ! now ) {
		return [ 'no rest signature to compare' ];
	}
	const shown = ( v ) => ( '' === v ? 'none' : v );
	return Object.keys( LABELS ).filter( ( k ) => String( rest[ k ] ) !== String( now[ k ] ) ).map( ( k ) => `${ LABELS[ k ] }: ${ shown( rest[ k ] ) } at rest, ${ shown( now[ k ] ) } now` );
}

// The rest signature once the page's animations finish (after `floor` ms: a script that starts one late), read until two
// reads in a row agree (at most eight tries 150ms apart; the last read when none do): a page still finishing a change
// (a disclosure a script opens just after the floor) is read as it ends up.
export async function readRest( page, floor = 300 ) {
	await settleAnimations( page, { floor } );
	let last = await page.evaluate( restSignature );
	for ( let i = 0; i < 8; i++ ) {
		await page.waitForTimeout( 150 );
		const now = await page.evaluate( restSignature );
		if ( ! restDiff( last, now ).length ) {
			return now;
		}
		last = now;
	}
	return last;
}

// Brings the page to rest before a state after the first. reload() loads the page afresh and runs the config's `open`.
// Returns { how: 'previous' | 'at rest' | 'reloaded', refused?: reason, rest?: the signature a fresh load reached at rest,
// which the caller keeps as the page's rest from then on }.
export async function toRest( page, state, rest, reload ) {
	if ( 'previous' === state.from ) {
		return { how: 'previous' };
	}
	if ( 'rest' !== state.from && ! restDiff( rest, await readRest( page ) ).length ) {
		return { how: 'at rest' };
	}
	await reload();
	const now = await readRest( page );
	const left = restDiff( rest, now );
	return left.length ? { how: 'reloaded', refused: `not at rest after a fresh load: ${ left.join( '; ' ) }` } : { how: 'reloaded', rest: now };
}

// The targets a state's action tried and found nothing at, when it found nothing at all: null when the action triggered
// something, navigated, or tried nothing (a wait or a scroll is no trigger).
export function untriggered( log ) {
	const tries = ( log || [] ).filter( ( e ) => 'goto' === e.type || 'hit' in e );
	if ( ! tries.length || tries.some( ( e ) => 'goto' === e.type || e.hit ) ) {
		return null;
	}
	return tries.map( ( e ) => e.target ).join( ', ' );
}

// A run that is not compared pair by pair: a side refused (one open `(state)` row, `not-at-rest`), or neither side found
// anything to trigger (one open `(state)` row, `nothing-to-trigger`, naming what each side tried; `run.untriggered` holds
// the same, and `unread` the sides that skipped their reads for it). Returns true when the run is settled here.
// One side alone finding nothing is compared as usual (the drive check reports the miss) and noted in `run.untriggered`.
export function unmeasuredRun( run, d, l ) {
	if ( d.refused || l.refused ) {
		run.refused = { draft: d.refused || null, live: l.refused || null };
		run.pairs[ '(state)' ] = { diffs: [ { kind: 'state', key: 'not-at-rest', draft: d.refused || 'at rest', live: l.refused || 'at rest', accepted: null } ] };
		return true;
	}
	if ( d.untriggered || l.untriggered ) {
		const unread = [ d.unread && 'draft', l.unread && 'live' ].filter( Boolean );
		run.untriggered = { draft: d.untriggered || null, live: l.untriggered || null, ...( unread.length ? { unread } : {} ) };
	}
	if ( d.untriggered && l.untriggered ) {
		run.pairs[ '(state)' ] = { diffs: [ { kind: 'state', key: 'nothing-to-trigger', draft: `tried ${ d.untriggered }, found nothing`, live: `tried ${ l.untriggered }, found nothing`, accepted: null } ] };
		return true;
	}
	return false;
}

// The report's lines for the runs that found nothing to trigger or were refused, appended to report.md.
export function stateLines( runs ) {
	const lines = runs.flatMap( ( r ) => {
		if ( r.refused ) {
			return [ `- ${ r.state } @ ${ r.width }: refused, not measured (${ [ r.refused.draft && `draft ${ r.refused.draft }`, r.refused.live && `live ${ r.refused.live }` ].filter( Boolean ).join( '; ' ) })` ];
		}
		if ( r.untriggered ) {
			const both = r.untriggered.draft && r.untriggered.live;
			return [ `- ${ r.state } @ ${ r.width }: ${ both ? 'nothing to trigger on either side, not measured' : `nothing to trigger on the ${ r.untriggered.draft ? 'draft' : 'live' } side only, measured` } (${ [ r.untriggered.draft && `draft tried ${ r.untriggered.draft }`, r.untriggered.live && `live tried ${ r.untriggered.live }` ].filter( Boolean ).join( '; ' ) })` ];
		}
		return [];
	} );
	return lines.length ? [ '', '## States not measured or one-sided', '', ...lines, '' ] : [];
}

export function appendStateLines( outDir, runs ) {
	const lines = stateLines( runs );
	if ( lines.length ) {
		fs.appendFileSync( path.join( outDir, 'report.md' ), lines.join( '\n' ) );
	}
}
