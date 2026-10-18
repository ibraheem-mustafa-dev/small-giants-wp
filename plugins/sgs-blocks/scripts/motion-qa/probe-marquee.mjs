/**
 * Spec 38A FR-38A-44: live acceptance of the shared marquee on a deployed site.
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red; a control that does not fails the run):
 *   marquee-one-runtime  `git grep` finds one marquee runtime under plugins/sgs-blocks/src (offline)
 *   marquee-range        at this width each marquee runs or stays a static row as its stored range says
 *   marquee-rate         the painted speed in px/s (translate distance of the set over time, from its on-screen
 *                        position) against the stored speed: 45, 60, 40 and 70 px/s strips and a 50 px/s pause-control bar (all within 2%)
 *   marquee-hover        a mouse over the block runs the 45px/s strip at 0.15x (within 5%) and holds the others still
 *   marquee-touch        tap: a touch tap holds the row still and a second tap lets it run
 *   marquee-fade         the 45px/s strip paints a mask on its lane (never on the block root) that fades its ends over 5%
 *   marquee-pause-default a marquee that does not store pauseControl has no pause button
 *   marquee-pause        the one pause-control bar has a pause button; pressing it holds the row still, pressing again lets it run
 *   marquee-pause-visible the button sits inside the block's visible box and focusing it does not scroll the row (a
 *                        click would scroll a clipped button into view, so the press alone cannot show this)
 *   marquee-pause-corner the button sits in the block root's bottom-right corner (bottom and right edges within 2px)
 *   marquee-touch-real   real touch input (Chromium with hasTouch and isMobile, 390x844, Input.dispatchTouchEvent): in tap
 *                        mode one tap pauses and a second resumes (UNANSWERED outside Chromium)
 *   marquee-pause-unmasked the button computes mask-image none and no ancestor of it carries a mask
 *   marquee-reduced      under prefers-reduced-motion: reduce nothing is cloned or moves
 *
 * NEGATIVE CONTROLS
 *   - one-runtime: the same search must find the runtime file itself (a search that finds nothing is not proof).
 *   - range: the control trust bar (no marquee) must never run.
 *   - rate: every strip's reading is judged against a speed 25% off its stored one, and a row whose copies have `translate: none !important` forced
 *     must fail the rate check.
 *   - hover: the rate before the pointer arrives must not pass as the hover rate.
 *   - touch / pause: the held-still judge on the running row must fail.
 *   - pause-corner: the same button planted at the root's vertical middle must be rejected.
 *   - touch-real: each reading is also judged against the opposite expectation (paused judged as running, resumed judged as
 *     held still) and must be rejected.
 *   - pause-unmasked: the same ancestor walk started from a child of the lane must find the lane's mask.
 *   - fade: the control trust bar must have no mask, and a fade width planted as 12 (applied by a breakpoint
 *     crossing, which makes the runtime re-read its settings) must fail the check.
 *   - rate: the row run at 1.05x its playback rate must fail the 2% judge.
 *   - touch: the tap is a synthetic touch PointerEvent (Firefox's touch emulation is not dependable).
 *   - reduced: the same judge on the no-preference page must fail.
 *
 * FIXTURE: tests/fixtures/motion/pages/marquee.json, built with scripts/wp-build-page.js. Blocks are found by marker class.
 *
 * Usage:
 *   node scripts/motion-qa/probe-marquee.mjs [--page <id>] [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-marquee.mjs --self-test   (offline: the judges)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { execFileSync } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, REPO } from './probe-motion-model-lib.mjs';
import { launchOptions, passChallenge } from './probe-loop-lib.mjs';

/** The canary page built from marquee.json. */
export const MARQUEE_PAGE = 5305;

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TOLERANCE = 0.02;
const HOVER_TOLERANCE = 0.05;
const SAMPLE_MS = 1500;

/** The drafts' marquees: what each fixture block must measure. `below` is the widest viewport it runs at. */
export const DRAFTS = {
	'.m515-speed': { speed: 45, hoverRate: 0.15, fade: 5, below: Infinity },
	'.m515-tap': { speed: 60, hoverRate: 0, touch: 'tap', below: 1023 },
	'.m515-brands': { speed: 40, hoverRate: 0, below: Infinity },
	'.m515-ticker': { speed: 70, hoverRate: 0, below: 767 },
	'.m515-pause': { speed: 50, hoverRate: 0, touch: 'tap', fade: 6, pause: true, below: Infinity },
	'.m515-pause-brands': { speed: 50, hoverRate: 0, fade: 6, pause: true, below: Infinity },
};
const CONTROL = '.m515-control';
/** A trust bar with a title and a marquee at every width, edge fade 8%: the title must stay outside the moving strip. */
const TITLED = '.m515-titled';
const TITLED_FADE = 8;
/** A trust bar whose badges carry a scroll entrance and which also runs a marquee: no badge or copy may stay hidden. */
const ENTRANCE = '.m515-entrance';

// ---- Pure judges -----------------------------------------------------------------------------------------------

/**
 * The speed in px/s from timed positions of a leftward row, ignoring the frames where the loop wrapped back.
 *
 * @param {{t: number, x: number}[]} points Timestamps (ms) and the set's left edge (px).
 * @return {number} px/s, 0 when the row did not move.
 */
export function velocity( points ) {
	let dx = 0;
	let dt = 0;
	for ( let i = 1; i < points.length; i++ ) {
		const step = points[ i - 1 ].x - points[ i ].x;
		const time = points[ i ].t - points[ i - 1 ].t;
		if ( step < 0 || time <= 0 ) continue;
		dx += step;
		dt += time;
	}
	return dt > 0 ? ( dx / dt ) * 1000 : 0;
}

/** True when a reading's px/s matches the stored speed within 2%. */
/** A brand strip tile holds the logo with no padding, no border and no fill, and `contain` scales the whole logo until its longer side meets the tile. */
export function judgeBrandTile( t ) {
	if ( ! t || ! ( t.tileW > 0 ) || ! ( t.natW > 0 ) ) return false;
	const flat = '0px' === t.padding && 0 === t.border && 'rgba(0, 0, 0, 0)' === t.background;
	const boxFills = Math.abs( t.imgW - t.tileW ) <= 1 && Math.abs( t.imgH - t.tileH ) <= 1;
	const scale = Math.min( t.imgW / t.natW, t.imgH / t.natH );
	const longer = t.natW >= t.natH ? t.natW * scale : t.natH * scale;
	const longSide = t.natW >= t.natH ? t.imgW : t.imgH;
	return flat && boxFills && 'contain' === t.fit && Math.abs( longer - longSide ) <= 1;
}

export function judgeRate( draft, reading ) {
	if ( ! reading || ! ( reading.speed > 0 ) || ! ( draft.speed > 0 ) ) return false;
	return Math.abs( reading.speed - draft.speed ) <= draft.speed * TOLERANCE;
}

/** True when no element from the button up to the document root carries a mask (`chain` lists the masked ones). */
export const judgeUnmasked = ( chain ) => Array.isArray( chain ) && 0 === chain.length;

/**
 * True when the pause button sits in the block root's bottom-right corner: its bottom edge within `tol` px of the root's
 * bottom and its right edge within `tol` px of the root's right.
 *
 * @param {{left: number, top: number, right: number, bottom: number}} button The button's rect.
 * @param {{left: number, top: number, right: number, bottom: number}} root The block root's rect.
 * @param {number} tol Allowed gap in px.
 */
export function judgeCornerButton( button, root, tol = 2 ) {
	if ( ! button || ! root ) return false;
	return Math.abs( root.bottom - button.bottom ) <= tol && Math.abs( root.right - button.right ) <= tol;
}

/** True when the hovered speed is the draft's hover rate times the free speed. */
export function judgeHover( draft, free, hovered ) {
	if ( ! ( free > 0 ) ) return false;
	if ( 0 === draft.hoverRate ) return hovered < 0.5;
	return near( hovered / free, draft.hoverRate, draft.hoverRate * HOVER_TOLERANCE );
}

/** True when a row is held still. */
export const judgeStill = ( speed ) => Number.isFinite( speed ) && speed < 0.5;

/**
 * True when a computed mask fades both ends over the given percentage: a gradient whose first and last stops are
 * transparent and whose first opaque stop sits at exactly that percentage.
 */
export function judgeFade( mask, percent ) {
	if ( typeof mask !== 'string' || ! /gradient/.test( mask ) ) return false;
	const transparent = ( mask.match( /transparent|rgba\(0, 0, 0, 0\)/g ) || [] ).length;
	const stop = /(?:#000|rgb\(0, 0, 0\))\s+(-?\d*\.?\d+)%/.exec( mask );
	return transparent >= 2 && Boolean( stop ) && Math.abs( parseFloat( stop[ 1 ] ) - percent ) < 0.01;
}

/** The area (px squared) two [left, top, right, bottom] boxes share. */
export function overlap( a, b ) {
	const w = Math.min( a[ 2 ], b[ 2 ] ) - Math.max( a[ 0 ], b[ 0 ] );
	const h = Math.min( a[ 3 ], b[ 3 ] ) - Math.max( a[ 1 ], b[ 1 ] );
	return w > 0 && h > 0 ? w * h : 0;
}

/**
 * True when no badge is painted over the title: in every sample the lane is a box of its own (not the block root) that
 * does not contain the title, and each badge's visible box (its box cut to the lane when the lane clips) shares no
 * area with the title box. `clips` false makes the judge read the badges' unclipped boxes.
 *
 * @param {{laneIsRoot: boolean, laneHoldsTitle: boolean, clips: boolean, lane: number[]|null, title: number[], badges: number[][]}[]} samples
 */
export function judgeTitle( samples ) {
	if ( ! samples.length ) return false;
	return samples.every( ( s ) => s.lane && ! s.laneIsRoot && ! s.laneHoldsTitle && s.badges.length > 0 && s.badges.every( ( b ) => {
		const cut = s.clips ? [ Math.max( b[ 0 ], s.lane[ 0 ] ), Math.max( b[ 1 ], s.lane[ 1 ] ), Math.min( b[ 2 ], s.lane[ 2 ] ), Math.min( b[ 3 ], s.lane[ 3 ] ) ] : b;
		return overlap( s.title, cut ) < 1;
	} ) );
}

/**
 * True when a titled bar's running layout is a title column plus a strip that fills the rest of the root: above the
 * mobile tier the title is vertically centred on the lane (within 2px) and the lane's right edge reaches the root's
 * content edge (within 2px of the root's right edge less its padding); at the mobile tier the title sits above the lane.
 *
 * @param {{root: number[], rootPad: number, lane: number[]|null, title: number[]}} s One sample.
 * @param {number} width The viewport width.
 */
export function judgeTitleLayout( s, width ) {
	if ( ! s || ! s.lane ) return false;
	if ( width <= 767 ) return s.title[ 3 ] <= s.lane[ 1 ] + 1;
	const centred = Math.abs( ( s.title[ 1 ] + s.title[ 3 ] ) / 2 - ( s.lane[ 1 ] + s.lane[ 3 ] ) / 2 ) <= 2;
	const fills = Math.abs( s.lane[ 2 ] - ( s.root[ 2 ] - s.rootPad ) ) <= 2;
	return centred && fills;
}

/** True when a marquee with per-item entrances shows every badge: it runs, has copies, and no badge is hidden. */
export function judgeEntrances( r ) {
	return Boolean( r ) && r.on && r.clones > 0 && r.total > 0 && r.pending > 0 && 0 === r.hidden;
}

/** Whether a marquee should run at a viewport width. */
export const shouldRun = ( draft, width ) => width <= draft.below;

// ---- Page helpers ----------------------------------------------------------------------------------------------

async function open( ctx, opts = {}, init = null ) {
	const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	if ( init ) await page.addInitScript( init );
	await page.goto( ctx.url, { waitUntil: 'load' } ).catch( () => page.goto( ctx.url, { waitUntil: 'load' } ) );
	await passChallenge( page );
	await page.waitForTimeout( 2000 );
	return { page, close: () => context.close() };
}

/** Bring a block into view (loops pause off screen) and let the scroll settle. */
async function bringIntoView( page, sel ) {
	await page.evaluate( ( s ) => {
		const el = document.querySelector( s );
		const top = el.getBoundingClientRect().top + window.scrollY - 120;
		window.scrollTo( { top: Math.max( 0, top ), behavior: 'instant' } );
	}, sel );
	await page.waitForTimeout( 900 );
	// A late image or a relayout rebuilds the loop; wait until the pitch reads the same twice, 300ms apart.
	const pitch = () => page.evaluate( ( s ) => {
		const root = document.querySelector( s );
		const set = root && root.querySelector( '[data-sgs-marquee-set]' );
		const clone = root && root.querySelector( '[data-sgs-marquee-clone]' );
		return set && clone ? Math.round( clone.getBoundingClientRect().left - set.getBoundingClientRect().left ) : 0;
	}, sel );
	let last = await pitch();
	for ( let i = 0; i < 10; i++ ) {
		await page.waitForTimeout( 300 );
		const now = await pitch();
		if ( now === last ) break;
		last = now;
	}
}

/** The block's run state, its pitch, and the set's left edge sampled every frame for `ms`. */
const MEASURE = ( [ sel, ms ] ) => new Promise( ( resolve ) => {
	const root = document.querySelector( sel );
	const set = root && root.querySelector( '[data-sgs-marquee-set]' );
	const clone = root && root.querySelector( '[data-sgs-marquee-clone]' );
	const base = {
		on: Boolean( root && 'on' === root.getAttribute( 'data-sgs-marquee' ) ),
		clones: root ? root.querySelectorAll( '[data-sgs-marquee-clone]' ).length : 0,
		pitch: set && clone ? clone.getBoundingClientRect().left - set.getBoundingClientRect().left : 0,
		// The edge fade is a mask on the lane (the set's parent), never on the block root.
		mask: ( () => {
			const el = set ? set.parentElement : root;
			return el ? ( getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage || '' ) : '';
		} )(),
	};
	if ( ! set ) {
		resolve( { ...base, points: [] } );
		return;
	}
	const points = [];
	const t0 = performance.now();
	let done = false;
	const finish = () => {
		if ( ! done ) {
			done = true;
			resolve( { ...base, points } );
		}
	};
	// A throttled frame loop must not hang the probe: the timer ends the sample whatever the frames did.
	setTimeout( finish, ms + 1000 );
	const step = ( now ) => {
		points.push( { t: now, x: set.getBoundingClientRect().left } );
		if ( now - t0 < ms ) requestAnimationFrame( step );
		else finish();
	};
	requestAnimationFrame( step );
} );

async function measure( page, sel, ms = SAMPLE_MS ) {
	const r = await page.evaluate( MEASURE, [ sel, ms ] );
	return { on: r.on, clones: r.clones, pitch: r.pitch, mask: r.mask, speed: velocity( r.points ), frames: r.points.length };
}

/** The titled bar's title, lane and badge boxes, sampled `n` times `gap` ms apart while the strip moves. */
const TITLED_MEASURE = ( [ sel, n, gap ] ) => new Promise( ( resolve ) => {
	const samples = [];
	const box = ( el ) => {
		const r = el.getBoundingClientRect();
		return [ r.left, r.top, r.right, r.bottom ];
	};
	const mask = ( el ) => ( el ? ( getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage || '' ) : '' );
	const take = () => {
		const root = document.querySelector( sel );
		const title = root.querySelector( '.sgs-trust-bar__title' );
		const lane = root.querySelector( '[data-sgs-marquee-lane="on"]' );
		samples.push( {
			on: 'on' === root.getAttribute( 'data-sgs-marquee' ),
			laneIsRoot: lane === root,
			laneHoldsTitle: Boolean( lane && title && lane.contains( title ) ),
			clips: Boolean( lane ) && /hidden|clip/.test( getComputedStyle( lane ).overflowX ),
			lane: lane ? box( lane ) : null,
			title: title ? box( title ) : [ 0, 0, 0, 0 ],
			badges: Array.from( root.querySelectorAll( '.sgs-trust-bar__badge' ) ).map( box ),
			root: box( root ),
			rootPad: parseFloat( getComputedStyle( root ).paddingRight ) || 0,
			rootMask: mask( root ),
			laneMask: mask( lane ),
		} );
		if ( samples.length < n ) setTimeout( take, gap );
		else resolve( samples );
	};
	take();
} );

/** The entrance bar's badges: the copies, how many wait for an entrance, and how many are painted hidden. */
const ENTRANCE_MEASURE = ( [ sel, unreveal ] ) => {
	const root = document.querySelector( sel );
	if ( unreveal ) {
		root.querySelectorAll( '[data-sgs-marquee-clone] [data-sgs-in]' ).forEach( ( el ) => el.removeAttribute( 'data-sgs-in' ) );
	}
	const badges = Array.from( root.querySelectorAll( '.sgs-trust-bar__badge' ) );
	return {
		on: 'on' === root.getAttribute( 'data-sgs-marquee' ),
		clones: root.querySelectorAll( '[data-sgs-marquee-clone]' ).length,
		total: badges.length,
		pending: badges.filter( ( el ) => /scroll/.test( el.getAttribute( 'data-sgs-me' ) || '' ) ).length,
		hidden: badges.filter( ( el ) => parseFloat( getComputedStyle( el ).opacity ) < 0.99 ).length,
	};
};

const titledReading = ( page ) => page.evaluate( TITLED_MEASURE, [ TITLED, 6, 350 ] );

const pauseButton = ( page, sel ) => page.locator( `${ sel } .sgs-motion-pause, ${ sel } + .sgs-motion-pause` ).first();

// ---- Checks ----------------------------------------------------------------------------------------------------

function runtimeCheck( rep ) {
	const grep = ( pattern ) => {
		try {
			return execFileSync( 'git', [ 'grep', '-l', pattern, '--', 'plugins/sgs-blocks/src' ], { cwd: REPO, encoding: 'utf8' } ).split( '\n' ).filter( ( f ) => f && ! /\.test\.js$|__tests__/.test( f ) );
		} catch {
			return [];
		}
	};
	const runtimes = grep( "querySelector( SET )\\|createMarquee\\|marquee.*\\.animate(" ).filter( ( f ) => f.endsWith( '.js' ) );
	rep.check( 'marquee-one-runtime', { selector: 'plugins/sgs-blocks/src', property: 'files that run a marquee', measured: runtimes, expected: [ 'plugins/sgs-blocks/src/shared/effects/fx-marquee.js' ], pass: 1 === runtimes.length && runtimes[ 0 ].endsWith( 'src/shared/effects/fx-marquee.js' ) } );
	rep.control( 'marquee-one-runtime', { selector: 'plugins/sgs-blocks/src', property: 'the same search finds the runtime', measured: runtimes.length, expected: 'at least one', red: runtimes.length > 0 } );
}

async function liveChecks( ctx ) {
	const { rep, width } = ctx;
	const live = await open( ctx );
	const { page } = live;
	for ( const [ sel, draft ] of Object.entries( DRAFTS ) ) {
		await bringIntoView( page, sel );
		const r = await measure( page, sel );
		const run = shouldRun( draft, width );
		rep.check( 'marquee-range', { selector: sel, property: 'data-sgs-marquee="on", copies and movement', measured: { on: r.on, clones: r.clones, speed: r.speed }, expected: run ? 'running' : 'a static row', pass: run ? r.on && r.clones > 0 && r.speed > 0.5 : ! r.on && 0 === r.clones && judgeStill( r.speed ) } );
		if ( ! run ) continue;

		rep.check( 'marquee-rate', { selector: sel, property: 'translate distance over time, px/s', measured: { speed: r.speed, pitch: r.pitch, frames: r.frames }, expected: `${ draft.speed }px/s within 2%`, pass: judgeRate( draft, r ) } );
		rep.control( 'marquee-rate', { selector: sel, property: 'the same reading judged against a speed 25% higher', measured: r.speed, expected: 'rejected', red: ! judgeRate( { speed: draft.speed * 1.25 }, r ) } );
		if ( draft.fade ) {
			rep.check( 'marquee-fade', { selector: sel, property: 'computed mask-image', measured: r.mask, expected: `transparent at both ends over ${ draft.fade }%`, pass: judgeFade( r.mask, draft.fade ) } );
		}

		const box = await page.locator( sel ).boundingBox();
		await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
		await page.waitForTimeout( 300 );
		const hovered = await measure( page, sel, 1000 );
		await page.mouse.move( 2, 2 );
		await page.waitForTimeout( 300 );
		rep.check( 'marquee-hover', { selector: sel, property: 'speed with a mouse over the block / free speed', measured: { free: r.speed, hovered: hovered.speed, ratio: hovered.speed / r.speed }, expected: draft.hoverRate ? `${ draft.hoverRate }x` : 'held still', pass: judgeHover( draft, r.speed, hovered.speed ) } );
		rep.control( 'marquee-hover', { selector: sel, property: 'the free speed judged as the hovered speed', measured: r.speed, expected: 'rejected', red: ! judgeHover( draft, r.speed, r.speed ) } );

		const press = ( type ) => page.evaluate( ( [ s, kind ] ) => {
			const el = document.querySelector( s );
			el.dispatchEvent( new PointerEvent( kind, { bubbles: true, pointerType: 'touch', isPrimary: true } ) );
		}, [ sel, type ] );
		if ( 'tap' === draft.touch ) {
			await press( 'pointerdown' );
			await page.waitForTimeout( 200 );
			const held = await measure( page, sel, 1000 );
			await press( 'pointerdown' );
			await page.waitForTimeout( 200 );
			const again = await measure( page, sel, 1000 );
			rep.check( 'marquee-touch', { selector: sel, property: 'speed after one touch tap, then after a second', measured: { held: held.speed, again: again.speed }, expected: 'still, then running', pass: judgeStill( held.speed ) && again.speed > 0.5 } );
			rep.control( 'marquee-touch', { selector: sel, property: 'the held-still judge on the running row', measured: again.speed, expected: 'rejected', red: ! judgeStill( again.speed ) } );
		}

		const button = pauseButton( page, sel );
		const present = ( await button.count() ) > 0;
		if ( ! draft.pause ) {
			rep.check( 'marquee-pause-default', { selector: sel, property: 'pause buttons on a marquee that does not store pauseControl', measured: await button.count(), expected: 0, pass: ! present } );
			continue;
		}
		let pressed = null;
		let resumed = null;
		// A click scrolls a clipped button into view, so the button's place is read first: inside the block's visible
		// box, and keyboard focus on it must not scroll the row.
		const place = present ? await page.evaluate( ( s ) => {
			const root = document.querySelector( s );
			const btn = root.querySelector( '.sgs-motion-pause' ) || root.nextElementSibling;
			const r = root.getBoundingClientRect();
			const b = btn.getBoundingClientRect();
			const inside = b.width > 0 && b.left >= r.left - 0.5 && b.right <= r.right + 0.5 && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5;
			const outsideRoot = ! root.contains( btn );
			btn.focus();
			const scrolled = root.scrollLeft !== 0 || root.scrollTop !== 0;
			btn.blur();
			return { inside: inside || outsideRoot, scrolled, box: [ Math.round( b.left ), Math.round( b.top ), Math.round( b.width ) ], root: [ Math.round( r.left ), Math.round( r.width ) ] };
		}, sel ) : null;
		rep.check( 'marquee-pause-visible', { selector: sel, property: 'the pause button sits inside the visible box, and focus does not scroll the row', measured: place, expected: 'inside, not scrolled', pass: Boolean( place ) && place.inside && ! place.scrolled } );
		if ( present ) {
			const rects = await page.evaluate( ( s ) => {
				const root = document.querySelector( s );
				const btn = root.querySelector( '.sgs-motion-pause' ) || root.nextElementSibling;
				const pick = ( el ) => {
					const r = el.getBoundingClientRect();
					return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
				};
				return { button: pick( btn ), root: pick( root ) };
			}, sel );
			const roundRect = ( r ) => Object.fromEntries( Object.entries( r ).map( ( [ k, v ] ) => [ k, Math.round( v * 10 ) / 10 ] ) );
			rep.check( 'marquee-pause-corner', { selector: sel, property: 'the pause button against the block root: bottom and right edges', measured: { button: roundRect( rects.button ), root: roundRect( rects.root ) }, expected: 'bottom-right corner, both edges within 2px', pass: judgeCornerButton( rects.button, rects.root ) } );
			const bh = rects.button.bottom - rects.button.top;
			const rh = rects.root.bottom - rects.root.top;
			const midTop = rects.root.top + ( rh - bh ) / 2;
			const planted = { ...rects.button, top: midTop, bottom: midTop + bh };
			rep.control( 'marquee-pause-corner', { selector: sel, property: 'the same button planted at the vertical middle of the root', measured: roundRect( planted ), expected: 'rejected', red: ! judgeCornerButton( planted, rects.root ) } );
		}
		if ( present ) {
			await button.click();
			await page.mouse.move( 2, 2 );
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.waitForTimeout( 200 );
			pressed = await measure( page, sel, 1000 );
			await button.click();
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.mouse.move( 2, 2 );
			await page.waitForTimeout( 200 );
			resumed = await measure( page, sel, 1000 );
		}
		const chain = ( fromLane ) => page.evaluate( ( [ s, lane ] ) => {
			const root = document.querySelector( s );
			let el = lane ? root.querySelector( '[data-sgs-marquee-set]' ) : root.querySelector( '.sgs-motion-pause' );
			const masked = [];
			while ( el ) {
				const m = getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage || 'none';
				if ( 'none' !== m ) masked.push( el.className || el.tagName );
				el = el.parentElement;
			}
			return masked;
		}, [ sel, fromLane ] );
		if ( present ) {
			const own = await chain( false );
			rep.check( 'marquee-pause-unmasked', { selector: sel, property: 'mask-image on the pause button and every ancestor', measured: own, expected: 'none anywhere', pass: judgeUnmasked( own ) } );
			const lane = await chain( true );
			rep.control( 'marquee-pause-unmasked', { selector: sel, property: 'the same walk started from a child of the lane', measured: lane, expected: 'rejected (the lane carries the fade mask)', red: ! judgeUnmasked( lane ) } );
		}
		rep.check( 'marquee-pause', { selector: sel, property: 'the pause button: press, then press again', measured: { present, pressed: pressed && pressed.speed, resumed: resumed && resumed.speed }, expected: 'present, still, then running', pass: present && judgeStill( pressed.speed ) && resumed.speed > 0.5 } );
	}

	for ( const sel of [ '.m515-speed', '.m515-brands' ] ) {
		await bringIntoView( page, sel );
		const tile = await page.evaluate( ( root ) => {
			const item = document.querySelector( `${ root } .sgs-brand-strip__item` );
			const img = item && item.querySelector( 'img' );
			if ( ! img ) return null;
			const i = item.getBoundingClientRect();
			const m = img.getBoundingClientRect();
			const cs = getComputedStyle( item );
			return { tileW: i.width, tileH: i.height, imgW: m.width, imgH: m.height, natW: img.naturalWidth, natH: img.naturalHeight, padding: cs.paddingTop, border: parseFloat( cs.borderTopWidth ), background: cs.backgroundColor, fit: getComputedStyle( img ).objectFit };
		}, sel );
		rep.check( 'brand-tile-fills', { selector: sel, property: 'a logo tile: padding, border, fill, and the logo box against the tile', measured: tile, expected: 'padding 0, border 0, transparent, the logo box is the tile, contain fills the longer side', pass: tile ? judgeBrandTile( tile ) : null, why: tile ? '' : 'no logo in the strip' } );
		rep.control( 'brand-tile-fills', { selector: sel, property: 'the same judge with 10px padding planted', measured: tile && { ...tile, padding: '10px' }, expected: 'rejected', red: !! tile && ! judgeBrandTile( { ...tile, padding: '10px' } ) } );
	}

	await bringIntoView( page, CONTROL );
	const c = await measure( page, CONTROL );
	rep.control( 'marquee-range', { selector: CONTROL, property: 'the trust bar with no marquee runs', measured: { on: c.on, clones: c.clones, speed: c.speed }, expected: 'never runs', red: ! c.on && 0 === c.clones } );
	rep.control( 'marquee-fade', { selector: CONTROL, property: 'the fade judge on the control bar', measured: c.mask, expected: 'rejected', red: ! judgeFade( c.mask, 5 ) } );

	// A titled bar: the title is not in the lane, no badge is painted over it, and the edge fade belongs to the lane.
	await bringIntoView( page, TITLED );
	const tr = await titledReading( page );
	const last = tr[ tr.length - 1 ];
	rep.check( 'marquee-title', { selector: TITLED, property: 'badge boxes (cut to the lane) against the title box over six samples', measured: { on: last.on, clips: last.clips, laneIsRoot: last.laneIsRoot, laneHoldsTitle: last.laneHoldsTitle, title: last.title.map( Math.round ), lane: last.lane && last.lane.map( Math.round ) }, expected: 'a clipping lane of its own; no badge area under the title', pass: last.on && judgeTitle( tr ) } );
	rep.check( 'marquee-title-layout', { selector: TITLED, property: 'title centred on the strip and the strip filling the rest of the root (stacked at the mobile tier)', measured: { root: last.root.map( Math.round ), lane: last.lane && last.lane.map( Math.round ), title: last.title.map( Math.round ) }, expected: width > 767 ? 'title centre = lane centre; lane reaches the root edge' : 'title above the strip', pass: judgeTitleLayout( last, width ) } );
	rep.control( 'marquee-title-layout', { selector: TITLED, property: 'the layout judge on a strip one column wide (the old four-column grid)', measured: last.lane && Math.round( last.lane[ 2 ] ), expected: 'rejected', red: width > 767 ? ! judgeTitleLayout( { ...last, lane: [ last.lane[ 0 ], last.lane[ 1 ], last.lane[ 0 ] + 314, last.lane[ 3 ] ] }, width ) : ! judgeTitleLayout( { ...last, title: [ last.title[ 0 ], last.lane[ 1 ], last.title[ 2 ], last.lane[ 1 ] + 20 ] }, width ) } );
	rep.check( 'marquee-title-fade', { selector: TITLED, property: 'mask-image on the block root and on the lane', measured: { root: last.rootMask, lane: last.laneMask }, expected: `no mask on the root; transparent at both ends of the lane over ${ TITLED_FADE }%`, pass: ! /gradient/.test( last.rootMask ) && judgeFade( last.laneMask, TITLED_FADE ) } );
	// Stacked below 768px the title sits above the strip, so no badge can travel under it and the overlap controls do not apply.
	if ( width > 767 ) rep.control( 'marquee-title', { selector: TITLED, property: 'the same judge on the unclipped badge boxes', measured: { overlapPx2: Math.round( Math.max( ...tr.flatMap( ( s ) => s.badges.map( ( b ) => overlap( s.title, b ) ) ) ) ) }, expected: 'rejected (the strip does travel under the title)', red: ! judgeTitle( tr.map( ( s ) => ( { ...s, clips: false } ) ) ) } );
	rep.control( 'marquee-title-fade', { selector: TITLED, property: 'the fade judge on the block root', measured: last.rootMask, expected: 'rejected', red: ! judgeFade( last.rootMask, TITLED_FADE ) } );
	await bringIntoView( page, ENTRANCE );
	await page.waitForTimeout( 800 );
	const en = await page.evaluate( ENTRANCE_MEASURE, [ ENTRANCE, false ] );
	rep.check( 'marquee-entrance', { selector: ENTRANCE, property: 'badges (originals and copies) painted hidden while each carries a scroll entrance', measured: en, expected: 'running, copies present, entrances stored, none hidden', pass: judgeEntrances( en ) } );
	const planted = await page.evaluate( ENTRANCE_MEASURE, [ ENTRANCE, true ] );
	rep.control( 'marquee-entrance', { selector: ENTRANCE, property: 'the copies planted back into their unrevealed state (read back)', measured: planted, expected: 'rejected (the copies are hidden)', red: planted.hidden > 0 && ! judgeEntrances( planted ) } );
	await live.close();

	const unclipped = await open( ctx );
	await unclipped.page.addStyleTag( { content: '.sgs-trust-bar__lane{overflow:visible !important}' } );
	await bringIntoView( unclipped.page, TITLED );
	const ur = await titledReading( unclipped.page );
	await unclipped.close();
	// Stacked below 768px the title sits above the strip, so no badge can travel under it and the overlap controls do not apply.
	if ( width > 767 ) rep.control( 'marquee-title', { selector: TITLED, property: 'the lane planted with overflow: visible (read back from the computed style)', measured: { clips: ur[ ur.length - 1 ].clips }, expected: 'the check fails', red: false === ur[ ur.length - 1 ].clips && ! judgeTitle( ur ) } );

	const forced = await open( ctx );
	await forced.page.addStyleTag( { content: '[data-sgs-marquee-lane="on"] > *{translate:none !important}' } );
	await bringIntoView( forced.page, '.m515-speed' );
	const f = await measure( forced.page, '.m515-speed' );
	await forced.close();
	rep.control( 'marquee-rate', { selector: '.m515-speed', property: 'copies forced to translate: none (author !important)', measured: f.speed, expected: 'the check fails', red: ! judgeRate( DRAFTS[ '.m515-speed' ], f ) } );

	// Resolution: the same row run 5% fast must fail the 2% judge, so a pass is not the judge's slack.
	const nudged = await open( ctx );
	await bringIntoView( nudged.page, '.m515-speed' );
	await nudged.page.evaluate( () => document.querySelectorAll( '.m515-speed [data-sgs-marquee-set], .m515-speed [data-sgs-marquee-clone]' ).forEach( ( el ) => el.getAnimations().forEach( ( a ) => a.updatePlaybackRate( 1.05 ) ) ) );
	await nudged.page.waitForTimeout( 300 );
	const n = await measure( nudged.page, '.m515-speed' );
	await nudged.close();
	rep.control( 'marquee-rate', { selector: '.m515-speed', property: 'the row run at 1.05x its playback rate', measured: n.speed, expected: 'the check fails', red: n.speed > 0.5 && ! judgeRate( DRAFTS[ '.m515-speed' ], n ) } );

	// The stored fade width equals the runtime default, so plant another width: the fade check must fail. The runtime
	// re-reads its settings on a breakpoint change (its media-query listeners force a relayout), so the planted rule is
	// added after load and the viewport crosses a breakpoint and comes back.
	const wider = await open( ctx );
	await wider.page.addStyleTag( { content: '.m515-speed{--sgs-marquee-edge-fade-width:12 !important}' } );
	const across = ctx.width > 1023 ? 1000 : ctx.width > 767 ? 1100 : 800;
	await wider.page.setViewportSize( { width: across, height: HEIGHT } );
	await wider.page.waitForTimeout( 600 );
	await wider.page.setViewportSize( { width: ctx.width, height: HEIGHT } );
	await wider.page.waitForTimeout( 800 );
	await bringIntoView( wider.page, '.m515-speed' );
	const w = await measure( wider.page, '.m515-speed', 300 );
	await wider.close();
	rep.control( 'marquee-fade', { selector: '.m515-speed', property: 'the fade width planted as 12, applied by a breakpoint crossing', measured: w.mask, expected: 'the check fails', red: /gradient/.test( w.mask ) && ! judgeFade( w.mask, DRAFTS[ '.m515-speed' ].fade ) } );
}

async function reducedChecks( ctx ) {
	const { rep } = ctx;
	const sels = Object.keys( DRAFTS );
	const all = async ( page ) => {
		const out = [];
		for ( const sel of sels ) {
			await bringIntoView( page, sel );
			out.push( await measure( page, sel, 800 ) );
		}
		return out;
	};
	const still = ( rows ) => rows.every( ( r ) => ! r.on && 0 === r.clones && judgeStill( r.speed ) );
	const reduced = await open( ctx, { reducedMotion: 'reduce' } );
	const emulated = await reduced.page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	const rows = await all( reduced.page );
	await reduced.close();
	rep.check( 'marquee-reduced', { selector: sels.join( ', ' ), property: 'run state, copies and movement under reduced motion', measured: { emulated, rows: rows.map( ( r ) => [ r.on, r.clones, r.speed ] ) }, expected: 'emulation on, nothing cloned or moving', pass: emulated && still( rows ) } );
	const normal = await open( ctx );
	const moving = await all( normal.page );
	await normal.close();
	rep.control( 'marquee-reduced', { selector: sels.join( ', ' ), property: 'the same judge with no preference', measured: moving.map( ( r ) => r.on ), expected: 'rejected (at least one row runs)', red: ! still( moving ) } );
}

/**
 * Real touch input: a Chromium context with touch and a phone viewport, driven through the DevTools protocol so the browser
 * runs its own touch handling (emulated mouse events after a tap, long-press handling) which synthetic PointerEvents skip.
 */
async function realTouchChecks( ctx ) {
	const { rep, engine } = ctx;
	const id = 'marquee-touch-real';
	// Real touch needs a Chromium DevTools session; other engines have no equivalent, so they report nothing here (an
	// UNANSWERED row would fail the deploy's probe run for a check that cannot apply).
	if ( 'chromium' !== engine ) {
		return;
	}
	const live = await open( ctx, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } } );
	try {
		const { page } = live;
		let cdp;
		try {
			cdp = await page.context().newCDPSession( page );
		} catch ( e ) {
			rep.check( id, { pass: null, why: `no DevTools session: ${ e && e.message ? e.message : e }` } );
			return;
		}
		const touches = await page.evaluate( () => navigator.maxTouchPoints );
		if ( ! ( touches > 0 ) ) {
			rep.check( id, { pass: null, why: 'the context reports no touch points' } );
			return;
		}
		const send = ( type, x, y ) => cdp.send( 'Input.dispatchTouchEvent', { type, touchPoints: 'touchStart' === type || 'touchMove' === type ? [ { x, y, id: 0 } ] : [] } );
		const centre = async ( sel ) => {
			await bringIntoView( page, sel );
			const box = await page.locator( sel ).boundingBox();
			return { x: box.x + box.width / 4, y: box.y + box.height / 2 };
		};
		const running = ( speed ) => speed > 0.5;

		// Tap mode: one tap pauses, a second resumes.
		if ( shouldRun( DRAFTS[ '.m515-tap' ], 390 ) ) {
			const at = await centre( '.m515-tap' );
			const tap = async () => {
				await send( 'touchStart', at.x, at.y );
				await page.waitForTimeout( 60 );
				await send( 'touchEnd' );
				await page.waitForTimeout( 250 );
			};
			await tap();
			const paused = await measure( page, '.m515-tap', 1000 );
			await tap();
			const again = await measure( page, '.m515-tap', 1000 );
			rep.check( id, { selector: '.m515-tap', property: 'speed after one real tap, then after a second', measured: { paused: paused.speed, again: again.speed }, expected: 'still, then running', pass: judgeStill( paused.speed ) && running( again.speed ) } );
			rep.control( id, { selector: '.m515-tap', property: 'the paused reading judged as a running row, and the resumed reading judged as held still', measured: { paused: paused.speed, again: again.speed }, expected: 'both rejected', red: ! running( paused.speed ) && ! judgeStill( again.speed ) } );
		}
	} finally {
		await live.close();
	}
}

// ---- Entry -----------------------------------------------------------------------------------------------------

function selfTest() {
	const failures = [];
	const need = ( name, ok ) => { if ( ! ok ) failures.push( name ); };
	const line = ( v ) => Array.from( { length: 31 }, ( _, i ) => ( { t: i * 50, x: 500 - v * i * 0.05 } ) );
	need( 'velocity', near( velocity( line( 45 ) ), 45, 1e-9 ) );
	const wrapped = line( 45 ).map( ( p, i ) => ( i > 15 ? { ...p, x: p.x + 300 } : p ) );
	need( 'velocity skips the wrap', near( velocity( wrapped ), 45, 0.5 ) );
	const tileOk = { tileW: 150, tileH: 150, imgW: 150, imgH: 150, natW: 1920, natH: 1080, padding: '0px', border: 0, background: 'rgba(0, 0, 0, 0)', fit: 'contain' };
	need( 'brand tile passes', judgeBrandTile( tileOk ) );
	need( 'brand tile rejects padding, a border, a fill, and a shrunk logo box', ! judgeBrandTile( { ...tileOk, padding: '10px' } ) && ! judgeBrandTile( { ...tileOk, border: 2 } ) && ! judgeBrandTile( { ...tileOk, background: 'rgb(255, 255, 255)' } ) && ! judgeBrandTile( { ...tileOk, imgW: 130, imgH: 130 } ) );
	need( 'still', judgeStill( velocity( line( 0 ) ) ) && ! judgeStill( 45 ) );
	need( 'rate speed', judgeRate( { speed: 45 }, { speed: 45.5, pitch: 1 } ) && ! judgeRate( { speed: 45 }, { speed: 47, pitch: 1 } ) );
	need( 'rate rejects still', ! judgeRate( { speed: 60 }, { speed: 0, pitch: 0 } ) );
	need( 'rate rejects a loop-time draft', ! judgeRate( { loopSeconds: 24 }, { speed: 50, pitch: 1200 } ) );
	need( 'unmasked', judgeUnmasked( [] ) && ! judgeUnmasked( [ 'sgs-brand-strip__track' ] ) && ! judgeUnmasked( null ) );
	const rootBox = { left: 0, top: 0, right: 1000, bottom: 120 };
	const corner = { left: 950, top: 80, right: 998.5, bottom: 119 };
	need( 'corner button passes', judgeCornerButton( corner, rootBox ) );
	need( 'corner button rejects the vertical middle', ! judgeCornerButton( { ...corner, top: 40.5, bottom: 79.5 }, rootBox ) );
	need( 'corner button rejects the wrong side and a missing rect', ! judgeCornerButton( { ...corner, left: 0, right: 48.5 }, rootBox ) && ! judgeCornerButton( null, rootBox ) );
	need( 'hover slow', judgeHover( { hoverRate: 0.15 }, 45, 6.75 ) && ! judgeHover( { hoverRate: 0.15 }, 45, 45 ) );
	need( 'hover stop', judgeHover( { hoverRate: 0 }, 45, 0 ) && ! judgeHover( { hoverRate: 0 }, 45, 40 ) );
	need( 'fade', judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 5%, rgb(0, 0, 0) calc(95%), transparent 100%)', 5 ) && ! judgeFade( 'none', 5 ) );
	need( 'fade is numeric', ! judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 15%, rgb(0, 0, 0) 85%, transparent 100%)', 5 ) && ! judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 12%, rgb(0, 0, 0) 88%, transparent 100%)', 5 ) );
	need( 'range', shouldRun( DRAFTS[ '.m515-tap' ], 768 ) && ! shouldRun( DRAFTS[ '.m515-tap' ], 1440 ) && ! shouldRun( DRAFTS[ '.m515-ticker' ], 768 ) );
	const sample = ( over ) => ( { laneIsRoot: false, laneHoldsTitle: false, clips: true, lane: [ 200, 0, 1000, 80 ], title: [ 0, 0, 180, 40 ], badges: [ [ 100, 0, 260, 60 ], [ 300, 0, 460, 60 ] ], ...over } );
	need( 'overlap', 0 === overlap( [ 0, 0, 10, 10 ], [ 10, 0, 20, 10 ] ) && 25 === overlap( [ 0, 0, 10, 10 ], [ 5, 5, 20, 20 ] ) );
	need( 'title clipped passes', judgeTitle( [ sample() ] ) );
	need( 'title unclipped fails', ! judgeTitle( [ sample( { clips: false } ) ] ) );
	need( 'title lane is the root fails', ! judgeTitle( [ sample( { laneIsRoot: true } ) ] ) && ! judgeTitle( [ sample( { laneHoldsTitle: true } ) ] ) );
	need( 'title no lane or samples fails', ! judgeTitle( [ sample( { lane: null } ) ] ) && ! judgeTitle( [] ) );
	const ok = { on: true, clones: 2, total: 18, pending: 18, hidden: 0 };
	const lay = { root: [ 0, 0, 1000, 80 ], rootPad: 0, lane: [ 200, 10, 1000, 50 ], title: [ 0, 20, 180, 40 ] };
	need( 'title layout fills and centres', judgeTitleLayout( lay, 1440 ) );
	need( 'title layout rejects a narrow strip', ! judgeTitleLayout( { ...lay, lane: [ 200, 10, 514, 50 ] }, 1440 ) );
	need( 'title layout rejects a top-aligned title', ! judgeTitleLayout( { ...lay, title: [ 0, 0, 180, 22 ] }, 1440 ) );
	need( 'title layout stacks on mobile', judgeTitleLayout( { ...lay, title: [ 0, 0, 180, 20 ], lane: [ 0, 30, 375, 70 ] }, 375 ) && ! judgeTitleLayout( lay, 375 ) );
	need( 'entrances visible', judgeEntrances( ok ) );
	need( 'entrances hidden fails', ! judgeEntrances( { ...ok, hidden: 6 } ) );
	need( 'entrances not running fails', ! judgeEntrances( { ...ok, on: false } ) && ! judgeEntrances( { ...ok, clones: 0 } ) );
	need( 'entrances vacuous without a stored entrance fails', ! judgeEntrances( { ...ok, pending: 0 } ) );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const args = parseArgs( process.argv );
	const pageId = Number( args.pages[ 0 ] ?? MARQUEE_PAGE );
	const top = new Reporter( {} );
	if ( ! pageId ) {
		top.check( 'marquee-fixture', { pass: null, why: 'fixture page not created: build tests/fixtures/motion/pages/marquee.json, then set MARQUEE_PAGE in this file (or pass --page <id>)' } );
		process.exit( top.summary() );
	}
	runtimeCheck( top );
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ pageId }&cb=m515`;
	const all = [ ...top.rows ];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, width, url, rep, engine };
			const probe = await open( ctx );
			const missing = await probe.page.evaluate( ( sels ) => sels.filter( ( s ) => ! document.querySelector( s ) ), [ ...Object.keys( DRAFTS ), CONTROL, TITLED, ENTRANCE ] );
			await probe.close();
			if ( missing.length ) {
				rep.check( 'marquee-fixture', { selector: url, measured: missing, expected: 'every marker present', pass: null, why: `markers missing from page ${ pageId }: ${ missing.join( ', ' ) }` } );
			} else {
				// Real touch uses its own 390px phone context, so it runs once per engine.
				for ( const run of [ liveChecks, reducedChecks, ...( width === args.widths[ 0 ] ? [ realTouchChecks ] : [] ) ] ) {
					try {
						await run( ctx );
					} catch ( e ) {
						rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
				}
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
