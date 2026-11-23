/**
 * SGS motion: the marquee's still "swap" mode under reduced motion (Spec 38A FR-38A-44).
 *
 * A strip whose `reducedMotionMode` is `swap` stays on one line under `prefers-reduced-motion: reduce`: it shows as many
 * whole items as fit the block's width, centred, and every `swapInterval` seconds replaces them with the next group, with
 * no movement of any kind. When every item fits, nothing swaps. An item that is not on show carries
 * `data-sgs-marquee-off`, which `assets/css/fx-marquee.css` makes visually hidden but leaves readable to assistive
 * technology, in its original order. Nothing here announces a swap.
 *
 * Pausing is the loop control's own (`registerLoop`): hover (a hover rate of 0), keyboard focus inside the block, a touch
 * per the strip's `touchPause`, the pause button when the strip stores one, and the strip being off screen. A hidden tab
 * also holds the group. Focus that reaches an item that is off show brings its group on show.
 *
 * @package
 */

/* eslint-disable import/no-unresolved -- a webpack external (script module `@sgs/loop-control`). */
import { registerLoop } from '@sgs/loop-control';
/* eslint-enable import/no-unresolved */

export const OFF_ATTR = 'data-sgs-marquee-off';
export const DEFAULT_SWAP_SECONDS = 4;
const MIN_SECONDS = 1;
const MAX_SECONDS = 60;

/**
 * The seconds a group stays on show, from the stored setting.
 *
 * @param {string|number|null} value The stored `swapInterval`.
 * @return {number} Seconds, 1 to 60; 4 when nothing usable is stored.
 */
export function swapSeconds( value ) {
	const seconds = parseFloat( value );
	return Number.isFinite( seconds ) &&
		seconds >= MIN_SECONDS &&
		seconds <= MAX_SECONDS
		? seconds
		: DEFAULT_SWAP_SECONDS;
}

/**
 * Split items into the groups that each fit one line, in order. A group holds at least one item, so an item wider than
 * the line still gets its turn.
 *
 * @param {number[]} widths Each item's width in px.
 * @param {number}   gap    The gap between two items in px.
 * @param {number}   view   The width available to one line in px.
 * @return {number[][]} Item indexes per group; one group when everything fits.
 */
export function groupItems( widths, gap, view ) {
	const groups = [];
	let current = [];
	let used = 0;
	widths.forEach( ( width, index ) => {
		const next = current.length > 0 ? used + gap + width : width;
		if ( current.length > 0 && next > view ) {
			groups.push( current );
			current = [ index ];
			used = width;
		} else {
			current.push( index );
			used = next;
		}
	} );
	if ( current.length > 0 ) {
		groups.push( current );
	}
	return groups;
}

/**
 * Run the swap on one strip.
 *
 * @param {Object}      options
 * @param {HTMLElement} options.root         The block root carrying the `marquee` token.
 * @param {HTMLElement} options.set          The marquee set whose children are the items.
 * @param {number}      options.seconds      Seconds per group.
 * @param {string}      options.touchPause   `off`, `tap` or `hold`, as the lane's touch pause.
 * @param {boolean}     options.pauseControl Show the pause button.
 * @return {{refresh: Function, destroy: Function}} Controller.
 */
export function createSwap( { root, set, seconds, touchPause, pauseControl } ) {
	let groups = [];
	let index = 0;
	let timer = null;
	let destroyed = false;

	const loop = registerLoop( set, {
		hoverRate: 0,
		touchPause,
		pauseControl,
		label: 'Pause swapping',
		observe: root,
	} );
	const items = () =>
		Array.from( set.children ).filter( ( el ) => ! el.hidden );

	function show( group ) {
		items().forEach( ( el, position ) => {
			el.toggleAttribute(
				OFF_ATTR,
				! groups[ group ]?.includes( position )
			);
		} );
	}

	function tick() {
		if (
			destroyed ||
			groups.length < 2 ||
			loop.isPaused() ||
			document.visibilityState === 'hidden'
		) {
			return;
		}
		index = ( index + 1 ) % groups.length;
		show( index );
	}

	/** Measure every item with all of them on show, regroup, and show the current group. */
	function refresh() {
		if ( destroyed ) {
			return;
		}
		const list = items();
		list.forEach( ( el ) => el.removeAttribute( OFF_ATTR ) );
		const rootStyle = window.getComputedStyle( root );
		const gap = parseFloat( window.getComputedStyle( set ).columnGap ) || 0;
		const view =
			root.clientWidth -
			( parseFloat( rootStyle.paddingLeft ) || 0 ) -
			( parseFloat( rootStyle.paddingRight ) || 0 );
		groups = groupItems(
			list.map( ( el ) => el.offsetWidth ),
			gap,
			view
		);
		// The strip keeps the height of its tallest item, so a group of shorter items never moves what is below.
		root.style.setProperty(
			'--sgs-marquee-swap-height',
			`${ Math.max( 0, ...list.map( ( el ) => el.offsetHeight ) ) }px`
		);
		index = Math.min( index, Math.max( 0, groups.length - 1 ) );
		if ( groups.length < 2 ) {
			index = 0;
			return;
		}
		show( index );
		if ( null === timer ) {
			timer = window.setInterval( tick, seconds * 1000 );
		}
	}

	// A group is never swapped away from the control a visitor has just tabbed to.
	function onFocusIn( event ) {
		const list = items();
		const position = list.findIndex( ( el ) =>
			el.contains( event.target )
		);
		const group = groups.findIndex( ( members ) =>
			members.includes( position )
		);
		if ( group >= 0 && group !== index ) {
			index = group;
			show( index );
		}
	}
	set.addEventListener( 'focusin', onFocusIn );

	return {
		refresh() {
			if ( groups.length < 2 && null !== timer ) {
				window.clearInterval( timer );
				timer = null;
			}
			refresh();
			if ( groups.length < 2 && null !== timer ) {
				window.clearInterval( timer );
				timer = null;
			}
		},
		destroy() {
			destroyed = true;
			if ( null !== timer ) {
				window.clearInterval( timer );
			}
			set.removeEventListener( 'focusin', onFocusIn );
			items().forEach( ( el ) => el.removeAttribute( OFF_ATTR ) );
			root.style.removeProperty( '--sgs-marquee-swap-height' );
			loop.destroy();
		},
	};
}
