/**
 * The browser side of probe-focus-system.mjs: press Tab, read what the focused element paints, take an unfocused and a
 * focused screenshot of its box grown by 8px, and pair the pixels (ring, inner band, neighbour 1px outside the ring).
 * Used by both `--local` (the generated fixture) and `--site` (a live page).
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import {
	GROW, MIN_USABLE_POINTS, RADIUS_EXEMPT_SELECTOR, contrast, firstShadowLayer, hasSolidHairline, judgeContrast, pixelOf, samplePlan, shadowShape, snapRect,
} from './focus-probe-lib.mjs';

/** The longest a stop waits for two consecutive screenshots of its box to be pixel-identical, after the settle time. */
const SETTLE_CAP_MS = 3000;
const RECT_CAP_MS = SETTLE_CAP_MS;

/**
 * Runs in the page: the focused element and what it paints. Keeps the element on window.__fp so the blur / refocus steps
 * address the same node without touching the DOM. Returns null when focus has left the document, { seen: true } when
 * this element was already measured (a focus cycle), else the reading.
 */
function readFocused( radiusExemptSelector ) {
	const el = document.activeElement;
	if ( ! el || el === document.body || el === document.documentElement ) return null;
	window.__fpSeen = window.__fpSeen || new WeakSet();
	if ( window.__fpSeen.has( el ) ) return { seen: true, iframe: el.tagName === 'IFRAME' };
	window.__fpSeen.add( el );

	// The element that paints a focus source's ring is the proxy focus.css names: the next element sibling carrying
	// `sgs-focus-proxy`, else the first `sgs-focus-proxy` inside the nearest `sgs-focus-scope`, else the nearest
	// `sgs-focus-card`. A source with none of them paints nothing: it is measured on itself and reported as `no-proxy`.
	let target = el;
	const isSource = el.classList.contains( 'sgs-focus-source' );
	let proxyKind = null;
	if ( isSource ) {
		const next = el.nextElementSibling;
		const scope = el.closest( '.sgs-focus-scope' );
		const card = el.closest( '.sgs-focus-card' );
		if ( next && next.classList.contains( 'sgs-focus-proxy' ) ) { target = next; proxyKind = 'adjacent'; }
		else if ( scope && scope.querySelector( '.sgs-focus-proxy' ) ) { target = scope.querySelector( '.sgs-focus-proxy' ); proxyKind = 'scoped'; }
		else if ( card ) { target = card; proxyKind = 'card'; }
	}
	const cardEl = target !== el && target.classList.contains( 'sgs-focus-card' ) ? target : null;
	window.__fp = { el, target };

	// A range that paints its own ring is measured on its thumb. A range that is a focus source (the before-after slider)
	// is measured on its proxy like any other source, because the input itself is hidden.
	const isRange = el instanceof HTMLInputElement && el.type === 'range' && target === el;
	// The thumb rules that match this input, in source order (media and supports blocks honoured).
	const thumbRules = () => {
		const out = [];
		const visit = ( rules ) => {
			for ( const rule of rules ) {
				if ( rule.selectorText === undefined && rule.cssRules && rule.media && ! window.matchMedia( rule.media.mediaText ).matches ) continue;
				if ( rule.selectorText === undefined && rule.cssRules && rule.conditionText !== undefined && rule.media === undefined && ! CSS.supports( rule.conditionText ) ) continue;
				if ( rule.selectorText === undefined && rule.cssRules ) { visit( rule.cssRules ); continue; }
				if ( ! rule.selectorText || ! /::-(webkit-slider|moz-range)-thumb/.test( rule.selectorText ) ) continue;
				const base = rule.selectorText.split( ',' ).map( ( x ) => x.trim().replace( /::-(webkit-slider|moz-range)-thumb$/, '' ) );
				if ( base.some( ( sel ) => { try { return el.matches( sel ); } catch ( e ) { return false; } } ) ) out.push( rule );
			}
		};
		for ( const sheet of document.styleSheets ) {
			try { visit( sheet.cssRules ); } catch ( e ) { /* cross-origin sheet */ }
		}
		return out;
	};
	// Resolves a thumb rule's declarations (var() included) on a throwaway span beside the input.
	const resolveOnSpan = ( decls ) => {
		const span = document.createElement( 'span' );
		span.style.display = 'block';
		el.parentNode.appendChild( span );
		for ( const [ k, v ] of decls ) if ( v ) span.style.setProperty( k, v );
		const cs = getComputedStyle( span );
		const got = {
			width: Number.parseFloat( cs.width ) || 0, height: Number.parseFloat( cs.height ) || 0,
			outline: { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset, colour: cs.outlineColor },
			boxShadow: cs.boxShadow,
		};
		span.remove();
		return got;
	};
	let pseudo = null;
	let thumb = null;
	if ( isRange ) {
		for ( const name of [ '::-webkit-slider-thumb', '::-moz-range-thumb' ] ) {
			try {
				const cs = getComputedStyle( el, name );
				if ( cs && cs.outlineStyle !== undefined && ( cs.width !== 'auto' || ! pseudo ) ) {
					if ( ! pseudo || cs.outlineStyle !== 'none' ) pseudo = name;
				}
			} catch ( e ) { /* the engine does not know this pseudo-element */ }
		}
		const tcs = pseudo ? getComputedStyle( el, pseudo ) : null;
		const own = getComputedStyle( el );
		// WebKit answers a thumb query with the input's own size, and Chromium with no size at all; only a size that differs
		// from the input's is the thumb's. Otherwise the last matching thumb rule that sets a width gives the size (its
		// border box, so a pressable box wider than the painted disc is measured as the box the outline wraps), else 16px.
		const sized = tcs && tcs.width !== own.width && Number.parseFloat( tcs.width ) > 0;
		const sizeRule = sized ? null : thumbRules().filter( ( rule ) => rule.style.getPropertyValue( 'width' ) ).pop();
		const ruled = sizeRule ? resolveOnSpan( [ [ 'box-sizing', sizeRule.style.getPropertyValue( 'box-sizing' ) ], [ 'width', sizeRule.style.getPropertyValue( 'width' ) ], [ 'height', sizeRule.style.getPropertyValue( 'height' ) ] ] ) : null;
		const tw = sized ? Number.parseFloat( tcs.width ) : ( ruled && ruled.width > 0 ? ruled.width : 16 );
		const th = sized && Number.parseFloat( tcs.height ) > 0 ? Number.parseFloat( tcs.height ) : ( ruled && ruled.height > 0 ? ruled.height : tw );
		const r = el.getBoundingClientRect();
		const min = Number.parseFloat( el.min || 0 );
		const max = Number.parseFloat( el.max || 100 );
		const ratio = max > min ? ( Number.parseFloat( el.value ) - min ) / ( max - min ) : 0;
		// Every engine snaps the thumb to whole device pixels, so the estimate does too: a fractional rect puts the 45-degree
		// corner samples on the antialiased edge of the ring instead of its core.
		thumb = { x: Math.round( r.left + ratio * ( r.width - tw ) ), y: Math.round( r.top + r.height / 2 - th / 2 ), width: tw, height: th };
	}

	const read = ( node, pe ) => {
		const cs = getComputedStyle( node, pe || null );
		const corners = [ 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius' ].map( ( k ) => cs[ k ] );
		const radius = corners.every( ( c ) => c === corners[ 0 ] ) ? corners[ 0 ] : corners.join( ' ' );
		return {
			outline: { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset, colour: cs.outlineColor },
			boxShadow: cs.boxShadow,
			radius,
			maxRadius: Math.max( ...corners.map( ( c ) => Number.parseFloat( c ) || 0 ) ),
		};
	};

	// Chromium reports no computed outline for a range thumb pseudo-element, so read the winning thumb rule from the
	// stylesheets (the last matching one) and resolve its var() values on a throwaway span next to the input.
	const thumbFromRules = () => {
		const found = thumbRules().filter( ( rule ) => rule.style.getPropertyValue( 'outline' ) ).pop();
		const got = resolveOnSpan( found ? [ 'outline', 'outline-offset', 'box-shadow' ].map( ( k ) => [ k, found.style.getPropertyValue( k ) ] ) : [] );
		return { outline: got.outline, boxShadow: got.boxShadow, radius: '', maxRadius: Math.min( thumb.width, thumb.height ) / 2 };
	};
	const state = isRange ? thumbFromRules() : read( target, null );
	const r = isRange ? thumb : ( () => { const b = target.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; } )();

	// Clip test: any ancestor that clips (overflow, paint containment, clip-path) whose padding box does not contain the outline box.
	const ow = Number.parseFloat( state.outline.width ) || 0;
	const oo = Number.parseFloat( state.outline.offset ) || 0;
	const ext = state.outline.style === 'none' ? 0 : Math.max( 0, ow + oo );
	const box = { l: r.x - ext, t: r.y - ext, r: r.x + r.width + ext, b: r.y + r.height + ext };
	let clipped = false;
	let by = '';
	for ( let a = target.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement ) {
		const cs = getComputedStyle( a );
		const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || /paint|content|strict/.test( cs.contain ) || cs.clipPath !== 'none';
		if ( ! clips ) continue;
		const ar = a.getBoundingClientRect();
		const pl = ar.left + a.clientLeft;
		const pt = ar.top + a.clientTop;
		const pr = pl + a.clientWidth;
		const pb = pt + a.clientHeight;
		const ox = cs.overflowX === 'visible' && ! /paint|content|strict/.test( cs.contain ) && cs.clipPath === 'none';
		const oy = cs.overflowY === 'visible' && ! /paint|content|strict/.test( cs.contain ) && cs.clipPath === 'none';
		const outX = ! ox && ( box.l < pl - 0.5 || box.r > pr + 0.5 );
		const outY = ! oy && ( box.t < pt - 0.5 || box.b > pb + 0.5 );
		if ( outX || outY ) {
			clipped = true;
			by = a.tagName.toLowerCase() + ( a.className && typeof a.className === 'string' ? '.' + a.className.trim().split( /\s+/ )[ 0 ] : '' );
			break;
		}
	}

	const vw = document.documentElement.clientWidth;
	const vh = window.innerHeight;
	const cx = Math.min( Math.max( r.x + r.width / 2, 0 ), vw - 1 );
	const cy = Math.min( Math.max( r.y + r.height / 2, 0 ), vh - 1 );
	const hit = document.elementFromPoint( cx, cy );
	const obscured = ! hit || ! ( hit === target || target.contains( hit ) || hit.contains( target ) || hit === el || el.contains( hit ) );

	const cls = ( node ) => ( typeof node.className === 'string' ? node.className.trim().split( /\s+/ ) : [] );
	const text = ( el.getAttribute( 'aria-label' ) || el.textContent || el.getAttribute( 'name' ) || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 36 );
	let forced = null;
	if ( window.matchMedia( '(forced-colors: active)' ).matches ) {
		const probe = document.createElement( 'span' );
		probe.style.outlineColor = 'Highlight';
		document.documentElement.appendChild( probe );
		const highlight = getComputedStyle( probe ).outlineColor;
		probe.remove();
		forced = { highlight, ok: state.outline.style !== 'none' && ow > 0 && state.outline.colour === highlight };
	}
	const sig = target.classList.contains( 'sgs-focus--signature' );
	// A card proxy: the ring must belong to the card, and the source link inside it must paint none of its own.
	const drawsRing = ( node ) => {
		const cs = getComputedStyle( node );
		return cs.outlineStyle !== 'none' && ( Number.parseFloat( cs.outlineWidth ) || 0 ) > 0;
	};
	const card = cardEl ? { cardRing: drawsRing( cardEl ), linkRing: drawsRing( el ) } : null;
	// The --sgs-focus-* tokens on the focused element, each resolved to a computed colour on a throwaway span. A G2 ground
	// (duotone, photo or video container) or a signature stop paints its core in the ink, every other stop in the ring.
	const own = getComputedStyle( target );
	const resolveToken = ( name ) => {
		const raw = own.getPropertyValue( name ).trim();
		if ( ! raw ) return null;
		const span = document.createElement( 'span' );
		span.style.color = raw;
		if ( ! span.style.color ) return null;
		document.documentElement.appendChild( span );
		const colour = getComputedStyle( span ).color;
		span.remove();
		return colour;
	};
	const tokens = {
		defined: own.getPropertyValue( '--sgs-focus-ring' ).trim() !== '',
		ring: resolveToken( '--sgs-focus-ring' ),
		ink: resolveToken( '--sgs-focus-ink' ),
		inner: resolveToken( '--sgs-focus-inner' ),
		expect: ( () => {
			// The core follows the NEAREST ground class: the light inner token on a dark ground, else the ink token (focus.css).
			const nearest = target.closest( '.sgs-on-dark, .sgs-on-light' );
			const onDark = !! nearest && nearest.classList.contains( 'sgs-on-dark' );
			if ( sig ) return onDark ? 'inner' : 'ink';
			const g2 = target.closest( '.sgs-focus--duotone, .sgs-container--has-bg-image, .sgs-container--has-bg-video' );
			if ( ! g2 ) return 'ring';
			return onDark ? 'inner' : 'ink';
		} )(),
		// A fixture stop may name the colour its section's own tokens must give the ring (data-focus-expect-ring).
		expectRing: target.dataset.focusExpectRing || null,
	};
	return {
		tokens,
		seen: false,
		label: `${ el.tagName.toLowerCase() }.${ cls( el ).slice( 0, 2 ).join( '.' ) } "${ text }"`,
		rect: r,
		viewport: { w: vw, h: vh },
		focusVisible: el.matches( ':focus-visible' ),
		proxied: target !== el,
		measuredOn: target !== el ? 'proxy' : 'element',
		proxyKind,
		noProxy: isSource && target === el,
		radiusExempt: el.matches( radiusExemptSelector ) ? 'visually hidden at rest (.screen-reader-text, .skip-link)' : null,
		range: isRange,
		kinds: {
			inset: target.classList.contains( 'sgs-focus--inset' ),
			signature: sig,
			source: el.classList.contains( 'sgs-focus-source' ),
			assertRing: target.dataset.focusAssert === 'ring',
		},
		card,
		signatureAnimation: sig ? getComputedStyle( target, '::before' ).animationName : null,
		clip: { clipped, by },
		obscured,
		forced,
		focus: state,
		pseudo,
	};
}

/** Runs in the page: the resting (blurred) style of the stashed target, the same properties. */
function readResting( pseudo ) {
	const { target, el } = window.__fp;
	const isRange = el instanceof HTMLInputElement && el.type === 'range' && target === el;
	if ( isRange ) return ''; // the thumb's radius is not readable in every engine; the system sets none
	const cs = getComputedStyle( target );
	const corners = [ 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius' ].map( ( k ) => cs[ k ] );
	return corners.every( ( c ) => c === corners[ 0 ] ) ? corners[ 0 ] : corners.join( ' ' );
}

/** Decode a PNG buffer in a scratch page and read the pixels at the given [x, y] list (null when outside the image). */
async function readPixels( scratch, buffer, points ) {
	return scratch.evaluate( async ( [ b64, pts ] ) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + b64;
		await img.decode();
		const canvas = document.createElement( 'canvas' );
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
		ctx.drawImage( img, 0, 0 );
		const data = ctx.getImageData( 0, 0, img.width, img.height ).data;
		return pts.map( ( [ x, y ] ) => ( x < 0 || y < 0 || x >= img.width || y >= img.height ? null : [ data[ ( y * img.width + x ) * 4 ], data[ ( y * img.width + x ) * 4 + 1 ], data[ ( y * img.width + x ) * 4 + 2 ] ] ) );
	}, [ buffer.toString( 'base64' ), points ] );
}

/** The screenshot clip (integer, inside the viewport) for a rect grown by 8px, or null when nothing is visible. */
function clipFor( rect, viewport ) {
	const x = Math.max( 0, Math.floor( rect.x ) - GROW );
	const y = Math.max( 0, Math.floor( rect.y ) - GROW );
	const right = Math.min( viewport.w, Math.ceil( rect.x + rect.width ) + GROW );
	const bottom = Math.min( viewport.h, Math.ceil( rect.y + rect.height ) + GROW );
	if ( right - x < 2 || bottom - y < 2 ) return null;
	return { x, y, width: right - x, height: bottom - y };
}

/**
 * Runs in the page: for each sample point, whether the topmost element there is the focused target, one of its ancestors
 * (the page ground) or one of its descendants. A point where another element sits on top is a neighbour's box (its fill
 * would be read as the ground, or it would paint over the ring) and is not usable. Returns, per point, null when usable
 * or { blocked, neighbour } naming the element in the way; a point outside the viewport is `off-screen`.
 */
function hitTestPoints( points ) {
	const { target, el } = window.__fp;
	const vw = document.documentElement.clientWidth;
	const vh = window.innerHeight;
	const describe = ( n ) => `${ n.tagName.toLowerCase() }${ typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split( /\s+/ )[ 0 ] : '' }`;
	const focusable = 'a[href], button, input, select, textarea, summary, [tabindex]';
	// A focus source measured on its proxy is visually hidden and paints nothing (the before-after range lies over the
	// whole stage, handle included), so the hit test looks through it to what paints at the point.
	const seeThrough = el !== target ? el : null;
	return points.map( ( [ x, y ] ) => {
		if ( x < 0 || y < 0 || x >= vw || y >= vh ) return { blocked: 'off-screen', neighbour: false };
		const top = document.elementsFromPoint( x, y ).find( ( n ) => n !== seeThrough );
		if ( ! top || top === target || top.contains( target ) || target.contains( top ) ) return null;
		return { blocked: describe( top ), neighbour: top.matches( focusable ) || Boolean( top.closest( focusable ) ) };
	} );
}

/**
 * Pair the focused and unfocused pixels for one stop and judge them. The sample plan is filtered to the points whose
 * ring and neighbour pixel both lie on the target's own ground (hitTestPoints); fewer than MIN_USABLE_POINTS usable
 * samples make the stop `unmeasurable`, neither a pass nor a fail. Returns { min, points, planned, usable, neighbours }
 * plus `unmeasurable` (the reason) when too few points were usable; `neighbours` names the focusable elements that sat
 * over sample points (a neighbour overpaint).
 */
async function measurePixels( page, scratch, focusedPng, restingPng, clip, reading ) {
	const hairline = firstShadowLayer( reading.focus.boxShadow );
	const solid = hasSolidHairline( hairline ) ? hairline : null;
	const w = Number.parseFloat( reading.focus.outline.width ) || 0;
	const o = Number.parseFloat( reading.focus.outline.offset ) || 0;
	const full = samplePlan( snapRect( reading.rect ), reading.focus.maxRadius, { width: w, offset: o }, solid );
	const hits = await page.evaluate( hitTestPoints, full.map( ( p ) => [ p.x, p.y ] ) );
	const blockedGroups = new Map();
	// A `ring-alt` candidate under another element is dropped on its own; it never blocks its sample.
	full.forEach( ( p, i ) => {
		if ( p.kind !== 'ring-alt' && hits[ i ] && ! blockedGroups.has( p.group ) ) blockedGroups.set( p.group, hits[ i ] );
	} );
	const planned = new Set( full.map( ( p ) => p.group ) ).size;
	const plan = full.filter( ( p, i ) => ! blockedGroups.has( p.group ) && ! ( p.kind === 'ring-alt' && hits[ i ] ) );
	const usable = planned - blockedGroups.size;
	const neighbours = [ ...new Set( [ ...blockedGroups.values() ].filter( ( h ) => h.neighbour ).map( ( h ) => h.blocked ) ) ];
	const base = { planned, usable, neighbours };
	if ( usable < MIN_USABLE_POINTS ) {
		const why = [ ...new Set( [ ...blockedGroups.values() ].map( ( h ) => h.blocked ) ) ].slice( 0, 3 ).join( ', ' );
		return { min: null, points: 0, ...base, unmeasurable: `${ usable } of ${ planned } sample points usable (under ${ MIN_USABLE_POINTS })${ why ? `, the others sit under ${ why }` : '' }` };
	}
	const toImage = ( p ) => [ pixelOf( p.x ) - clip.x, pixelOf( p.y ) - clip.y ];
	const focused = await readPixels( scratch, focusedPng, plan.map( toImage ) );
	const resting = await readPixels( scratch, restingPng, plan.map( toImage ) );
	// The plan lists ring, bg[, inner][, ring-alt...] per sample; group consecutive entries by sample. A corner's ring
	// colour is the in-band candidate strongest against the neighbour (its core, not its antialiased fringe).
	const readings = [];
	let current = null;
	plan.forEach( ( p, i ) => {
		if ( p.kind === 'ring' ) {
			current = { ring: focused[ i ], bg: null, inner: null };
			readings.push( current );
		} else if ( p.kind === 'bg' && current ) {
			current.bg = resting[ i ];
		} else if ( p.kind === 'inner' && current ) {
			current.inner = focused[ i ];
		} else if ( p.kind === 'ring-alt' && current && current.bg && focused[ i ] ) {
			if ( ! current.ring || contrast( focused[ i ], current.bg ) > contrast( current.ring, current.bg ) ) current.ring = focused[ i ];
		}
	} );
	return { ...judgeContrast( readings ), ...base };
}

/**
 * A screenshot of `clip` once the frame has settled: wait `settle` ms, then re-shoot every 100 ms until two consecutive
 * shots are pixel-identical (at most SETTLE_CAP_MS more). Returns { png, settled }.
 */
async function settledShot( page, clip, settle ) {
	await page.waitForTimeout( settle );
	let prev = await page.screenshot( { clip, animations: 'disabled', caret: 'hide' } );
	const deadline = Date.now() + SETTLE_CAP_MS;
	while ( Date.now() < deadline ) {
		await page.waitForTimeout( 100 );
		const cur = await page.screenshot( { clip, animations: 'disabled', caret: 'hide' } );
		if ( cur.equals( prev ) ) return { png: cur, settled: true };
		prev = cur;
	}
	return { png: prev, settled: false };
}

/** Runs in the page: the rects of the focused element and of whatever may paint its ring, as one comparable string. */
function rectKey() {
	const el = document.activeElement;
	if ( ! el || el === document.body ) return '';
	const nodes = [ el, el.nextElementSibling, el.closest( '.sgs-focus-scope' ), el.closest( '.sgs-focus-card' ) ].filter( Boolean );
	return nodes.map( ( n ) => {
		const r = n.getBoundingClientRect();
		return [ r.x, r.y, r.width, r.height ].map( ( v ) => v.toFixed( 2 ) ).join( ',' );
	} ).join( '|' );
}

/**
 * Wait until the focused element's box has stopped moving (a media preview or drawer link that grows on focus): poll
 * every 100 ms until two consecutive reads are identical, at most RECT_CAP_MS (3 s). Runs after the --settle wait, so the
 * element has had at least that long; the same settle mechanism the screenshots use (settledShot) follows.
 */
async function waitStableRect( page ) {
	let prev = await page.evaluate( rectKey );
	const deadline = Date.now() + RECT_CAP_MS;
	while ( Date.now() < deadline ) {
		await page.waitForTimeout( 100 );
		const cur = await page.evaluate( rectKey );
		if ( cur === prev ) return true;
		prev = cur;
	}
	return false;
}

/** Runs in the page: focus the next tabbable element in DOM order after the active one (WebKit skips links on Tab). */
function focusNextTabbable() {
	const list = [ ...document.querySelectorAll( 'a[href], button, input, select, textarea, summary, [tabindex]' ) ].filter( ( n ) => {
		const r = n.getBoundingClientRect();
		const hidden = getComputedStyle( n ).visibility === 'hidden' || n.disabled || n.getAttribute( 'tabindex' ) === '-1' || n.type === 'hidden';
		return ! hidden && ( r.width > 0 || r.height > 0 || n.classList.contains( 'sgs-focus-source' ) );
	} );
	const at = list.indexOf( document.activeElement );
	const next = list[ at + 1 ];
	if ( next ) next.focus();
	else if ( document.activeElement ) document.activeElement.blur();
}

/** One step of sequential navigation: Tab, or the programmatic walk with a keyboard press first so :focus-visible matches. */
async function pressTab( page, mode ) {
	if ( mode === 'programmatic' ) {
		await page.keyboard.press( 'Shift' );
		await page.evaluate( focusNextTabbable );
		return;
	}
	await page.keyboard.press( 'Tab' );
}

/**
 * Tab through the current page. `opts`: { maxStops, settle, forcedColors, shotsDir, shotPrefix, scratch }. Returns
 * { stops, ended, capHit }. `capHit` is true when `maxStops` was reached and one more Tab still lands on an unmeasured
 * element, i.e. the page has focusable elements the cap cut off. `opts.tabKey` is 'programmatic' in WebKit, which does not
 * Tab to links. Each stop has the fields judgeStop and summarise read.
 */
export async function tabThrough( page, opts ) {
	const stops = [];
	let ended = 'max stops';
	let guard = 0;
	await page.evaluate( () => { window.__fpSeen = new WeakSet(); if ( document.activeElement && document.activeElement.blur ) document.activeElement.blur(); window.scrollTo( 0, 0 ); } );
	while ( stops.length < opts.maxStops && guard++ < opts.maxStops * 2 ) {
		await pressTab( page, opts.tabKey );
		await page.waitForTimeout( opts.settle );
		await waitStableRect( page );
		const reading = await page.evaluate( readFocused, RADIUS_EXEMPT_SELECTOR );
		if ( reading === null ) {
			ended = 'focus left the document';
			break;
		}
		if ( reading.seen ) {
			if ( reading.iframe ) continue;
			ended = 'focus cycle';
			break;
		}
		const clip = clipFor( reading.rect, reading.viewport );
		let focusedPng = null;
		let restingPng = null;
		let settled = true;
		if ( clip ) {
			const onFocus = await settledShot( page, clip, 0 );
			focusedPng = onFocus.png;
			await page.evaluate( () => window.__fp.el.blur() );
			const atRest = await settledShot( page, clip, opts.settle );
			restingPng = atRest.png;
			settled = onFocus.settled && atRest.settled;
		} else {
			await page.evaluate( () => window.__fp.el.blur() );
			await page.waitForTimeout( opts.settle );
		}
		const radiusRest = await page.evaluate( readResting, reading.pseudo );
		await page.evaluate( () => window.__fp.el.focus( { preventScroll: true } ) );
		await page.waitForTimeout( 60 );

		let contrastResult = { min: null, points: 0 };
		if ( clip && ! opts.forcedColors ) {
			contrastResult = await measurePixels( page, opts.scratch, focusedPng, restingPng, clip, reading );
		}
		if ( opts.shotsDir && focusedPng ) {
			fs.mkdirSync( opts.shotsDir, { recursive: true } );
			fs.writeFileSync( path.join( opts.shotsDir, `${ opts.shotPrefix }-${ String( stops.length + 1 ).padStart( 2, '0' ) }.png` ), focusedPng );
		}
		const f = reading.focus;
		stops.push( {
			label: reading.label,
			rect: reading.rect,
			outline: f.outline,
			noOutline: f.outline.style === 'none' || ( Number.parseFloat( f.outline.width ) || 0 ) === 0,
			boxShadow: f.boxShadow,
			shadowShape: shadowShape( f.boxShadow ),
			radius: f.radius,
			radiusRest,
			kinds: reading.kinds,
			card: reading.card,
			proxied: reading.proxied,
			measuredOn: reading.measuredOn,
			proxyKind: reading.proxyKind,
			noProxy: reading.noProxy,
			radiusExempt: reading.radiusExempt,
			settled,
			range: reading.range,
			focusVisible: reading.focusVisible,
			clip: reading.clip,
			obscured: reading.obscured,
			forced: reading.forced,
			signatureAnimation: reading.signatureAnimation,
			tokens: reading.tokens,
			contrast: contrastResult,
		} );
	}
	let capHit = false;
	if ( ended === 'max stops' ) {
		await pressTab( page, opts.tabKey );
		await page.waitForTimeout( opts.settle );
		const more = await page.evaluate( readFocused, RADIUS_EXEMPT_SELECTOR );
		capHit = more !== null && ! more.seen;
		if ( ! capHit ) ended = more === null ? 'focus left the document' : 'focus cycle';
	}
	return { stops, ended, capHit };
}
