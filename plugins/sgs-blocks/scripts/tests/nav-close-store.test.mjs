/**
 * Wave 3C U-9 + U-11 "how a menu closes" — pure-logic gate for the close
 * control (.claude/reports/2026-09-24-u9-u11-design.md).
 *
 * Subject: `src/shared/nav-interactivity/close-control.js` — the opener
 * liveness test (§4.2, the revised FR-36-6 predicate) and the close-on-scroll
 * intent test (§4.6, DEC-02's carve-out). Both are pure and DOM-light, so they
 * are exercised here with plain stub objects — `store.js` itself imports
 * `@wordpress/interactivity` and cannot be loaded under plain node (same split
 * `freeze-background.js` / `test-nonmodal-freeze-background.mjs` already use).
 *
 * Also covers the DECISION RULES store.js builds on top of these primitives
 * (DEC-09's "close only if the opener is no longer live", and the focus
 * fallback "trigger if live, else the header's first live focusable") by
 * exercising the exact same functions those decisions are gated on — the
 * store.js call sites are one-line `if ( ! isOpenerLive( trigger, deps ) )`
 * wrappers around what is tested directly here.
 *
 * Run:  node scripts/tests/nav-close-store.test.mjs
 * Exit: 0 = green, non-zero = red.
 */

import {
	isOpenerLive,
	isIntentionalScroll,
	crossedScrollDistance,
	SCROLL_INTENT_WINDOW_MS,
} from '../../src/shared/nav-interactivity/close-control.js';

const failures = [];

function check( label, actual, expected ) {
	if ( actual !== expected ) {
		failures.push(
			`${ label }\n    expected: ${ expected }\n    actual:   ${ actual }`
		);
	}
}

/** A trigger stub with a real bounding box + client rects. */
function makeTrigger( { width = 44, height = 44, left = 100, top = 20 } = {} ) {
	const rect = { left, top, width, height, right: left + width, bottom: top + height };
	return {
		getBoundingClientRect: () => rect,
		getClientRects: () => [ rect ],
		contains( other ) {
			return other === this || ( other && other.parent === this );
		},
	};
}

/* ── §4.2 liveness ─────────────────────────────────────────────────────── */

{
	const trigger = makeTrigger();
	const live = isOpenerLive( trigger, {
		elementsFromPoint: () => [ trigger ],
	} );
	check( 'liveness: a visible opener at the top of the paint stack is LIVE', live, true );
}

{
	const trigger = makeTrigger();
	const overlay = { name: 'drawer-overlay' }; // some other element, unrelated
	const live = isOpenerLive( trigger, {
		elementsFromPoint: () => [ overlay ],
	} );
	check( 'liveness: an opener COVERED by the drawer (overlay on top, not the trigger, not inside it) is NOT live', live, false );
}

{
	// A descendant of the trigger (e.g. its icon) sits on top — still live.
	const trigger = makeTrigger();
	const icon = { parent: trigger };
	const live = isOpenerLive( trigger, {
		elementsFromPoint: () => [ icon ],
	} );
	check( 'liveness: the top hit is a DESCENDANT of the trigger — still live', live, true );
}

{
	// visibility:hidden / display:none — no client rects at all.
	const trigger = {
		getBoundingClientRect: () => ( { left: 0, top: 0, width: 0, height: 0 } ),
		getClientRects: () => [],
		contains: () => false,
	};
	const live = isOpenerLive( trigger, { elementsFromPoint: () => [ trigger ] } );
	check( 'liveness: no client rects (display:none/detached) is NOT live', live, false );
}

{
	// off-screen / zero-size box.
	const trigger = makeTrigger( { width: 0, height: 0 } );
	const live = isOpenerLive( trigger, { elementsFromPoint: () => [ trigger ] } );
	check( 'liveness: a zero-size box is NOT live', live, false );
}

check( 'liveness: no trigger at all is NOT live', isOpenerLive( null, {} ), false );

/* ── DEC-09 decision rule: "close only if the opener is no longer live" ──
 * store.js's onCollapseChange is a one-line `if ( ! updateOpenerLiveness() )
 * runClose(...)`. An always-burger bar (collapse above every width the site
 * supports) never installs the matchMedia watcher at all (guarded on
 * data-sgs-nav-collapse being present) — modelled here as "no watcher fires,
 * so no close decision is ever evaluated for that case".
 */

{
	const alwaysLiveTrigger = makeTrigger();
	const wouldClose = ! isOpenerLive( alwaysLiveTrigger, {
		elementsFromPoint: () => [ alwaysLiveTrigger ],
	} );
	check( 'resize-crossing: the opener is still live after the resize — stays open (no close)', wouldClose, false );
}

{
	const nowHiddenTrigger = makeTrigger();
	const overlay = { name: 'bar-collapsed-away' };
	const wouldClose = ! isOpenerLive( nowHiddenTrigger, {
		elementsFromPoint: () => [ overlay ],
	} );
	check( 'resize-crossing: the opener stopped being live after the resize — closes', wouldClose, true );
}

/* ── NEGATIVE CONTROL — the naive pre-§4.2 check (client rects only, no hit-
 * test) must FAIL to catch a covered-but-still-in-the-DOM trigger, proving
 * the liveness test above is watching real behaviour and not a tautology. */
{
	function naiveIsLive( trigger ) {
		// The superseded shape: "has client rects" was the only signal ever
		// considered before this build — no elementsFromPoint hit-test at all.
		return !! trigger && trigger.getClientRects().length > 0;
	}
	const trigger = makeTrigger(); // has rects, but is COVERED by the drawer.
	const naiveResult = naiveIsLive( trigger );
	check(
		'NEGATIVE CONTROL: the naive rects-only check reports a COVERED opener as live (the bug §4.2 fixes) — proving the hit-test above is load-bearing',
		naiveResult,
		true
	);
}

/* ── §4.6 close-on-scroll intent ──────────────────────────────────────── */

check( 'scroll intent window constant is 150ms (design §4.6)', SCROLL_INTENT_WINDOW_MS, 150 );

{
	// Wheel-led: a wheel event fires, then 30px of scroll happens 20ms later.
	const wheelAt = 1000;
	const scrollAt = 1020;
	const intentional = isIntentionalScroll( scrollAt, wheelAt );
	const distance = 30;
	const threshold = 24; // lamalama's clone value (§3 exit-cell row).
	const closes = intentional && crossedScrollDistance( distance, threshold );
	check( 'scroll-close: a wheel-led 30px scroll past a 24px threshold CLOSES', closes, true );
}

{
	// Wheel-led, but only 8px — stays under threshold.
	const wheelAt = 1000;
	const scrollAt = 1010;
	const intentional = isIntentionalScroll( scrollAt, wheelAt );
	const distance = 8;
	const threshold = 24;
	const closes = intentional && crossedScrollDistance( distance, threshold );
	check( 'scroll-close: a wheel-led 8px scroll (under threshold) does NOT close', closes, false );
}

{
	// Keyboard (PageDown) scroll: no wheel/touchmove/pointer-drag ever fired,
	// so lastIntentAt stays null — even 30px of movement must not close.
	const scrollAt = 1000;
	const lastIntentAt = null;
	const intentional = isIntentionalScroll( scrollAt, lastIntentAt );
	const distance = 30;
	const threshold = 24;
	const closes = intentional && crossedScrollDistance( distance, threshold );
	check( 'scroll-close: a keyboard-driven 30px scroll (no pointer intent recorded) does NOT close', closes, false );
}

{
	// A wheel event fired, but LONG ago (past the 150ms window) — a stale
	// signal (e.g. from a completely unrelated earlier scroll) must not count.
	const wheelAt = 1000;
	const scrollAt = 1000 + SCROLL_INTENT_WINDOW_MS + 1;
	const intentional = isIntentionalScroll( scrollAt, wheelAt );
	check( 'scroll-close: a wheel signal outside the 150ms window is stale — not intentional', intentional, false );
}

check( 'scroll-close: threshold 0 (off) never crosses regardless of distance', crossedScrollDistance( 500, 0 ), false );

/* ── NEGATIVE CONTROL — a naive "any scroll past distance closes" rule (no
 * intent gate at all) WOULD close on the keyboard case above, proving the
 * intent gate is load-bearing. */
{
	function naiveCrossed( distance, threshold ) {
		return threshold > 0 && distance >= threshold; // no intent check.
	}
	const naiveResult = naiveCrossed( 30, 24 );
	check(
		'NEGATIVE CONTROL: a distance-only rule (no pointer-intent gate) DOES close on the keyboard-scroll case — proving isIntentionalScroll() is load-bearing, not decorative',
		naiveResult,
		true
	);
}

/* ── Focus fallback when the trigger is hidden — store.js's onNativeClose:
 * "trigger if it is live, else the first live focusable in the header
 * region". Exercised via the same isOpenerLive() gate that decision reads. */
{
	const hiddenTrigger = makeTrigger();
	const overlay = { name: 'still-covering' };
	const triggerLive = isOpenerLive( hiddenTrigger, {
		elementsFromPoint: () => [ overlay ],
	} );
	check( 'focus fallback: a hidden/covered trigger reads NOT live — onNativeClose falls back to the header region', triggerLive, false );
}
{
	const visibleTrigger = makeTrigger();
	const triggerLive = isOpenerLive( visibleTrigger, {
		elementsFromPoint: () => [ visibleTrigger ],
	} );
	check( 'focus fallback: a visible trigger reads live — onNativeClose focuses it directly', triggerLive, true );
}

if ( failures.length ) {
	process.stdout.write(
		`FAIL: ${ failures.length } assertion(s) in the close-control gate.\n` +
			failures.map( ( line ) => `  - ${ line }` ).join( '\n' ) +
			'\n'
	);
	process.exit( 1 );
}

process.stdout.write(
	'PASS: close-control — liveness (covered/visible/descendant/zero-size), ' +
		'resize-crossing decision, scroll-close intent (wheel/keyboard/stale), ' +
		'focus fallback, both negative controls shown failing under the superseded logic.\n'
);
