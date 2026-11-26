/**
 * Trust bar canvas: does the bar's whole set fit on one row at the previewed device width?
 *
 * The front end runs an `overflow` ticker only while one un-duplicated set is wider than its lane
 * (`src/shared/effects/fx-marquee.js::layout`: the set is measured in the one-row running layout, and a set that
 * fits leaves the block's own authored layout). The canvas never runs that script, so it applies the same rule here:
 * it paints the paused one-row layout, measures the set against the lane, and drops back to the authored layout when
 * the set fits. It measures again whenever the bar's width, its device preview or its content changes.
 *
 * @package SGS\Blocks
 */

import { useEffect, useLayoutEffect, useState } from '@wordpress/element';

/**
 * The runtime's fit test: the set plus the one gap that separates two copies must fit the lane.
 *
 * @param {number} setWidth  Width of one un-duplicated set in the one-row layout.
 * @param {number} gap       The gap between two copies.
 * @param {number} laneWidth Width of the lane that clips the set.
 * @return {boolean} True when nothing needs to scroll.
 */
export function setFitsLane( setWidth, gap, laneWidth ) {
	return setWidth > 0 && setWidth + gap <= laneWidth;
}

/**
 * @param {boolean}                  enabled   True for an `overflow`-range ticker (the only range that depends on fit).
 * @param {{current: ?HTMLElement}}  rootRef   The block root's ref.
 * @param {string}                   signature Changes whenever the bar's content or look can change the set's width.
 * @return {boolean} True while the canvas should paint the running (one-row, clipped) layout.
 */
export default function useOverflowRuns( enabled, rootRef, signature ) {
	const [ phase, setPhase ] = useState( 'measure' );
	const [ width, setWidth ] = useState( 0 );

	useEffect( () => {
		const root = rootRef.current;
		if (
			! enabled ||
			! root ||
			'function' !== typeof window.ResizeObserver
		) {
			return undefined;
		}
		const observer = new window.ResizeObserver( () =>
			setWidth( Math.round( root.getBoundingClientRect().width ) )
		);
		observer.observe( root );
		return () => observer.disconnect();
	}, [ enabled, rootRef ] );

	// A change that can alter the set's width measures again, from the running layout the runtime measures in.
	useLayoutEffect( () => {
		if ( enabled ) {
			setPhase( 'measure' );
		}
	}, [ enabled, signature, width ] );

	useLayoutEffect( () => {
		if ( ! enabled || 'measure' !== phase ) {
			return;
		}
		const root = rootRef.current;
		const track = root?.querySelector( '.sgs-trust-bar__track' );
		const lane = root?.querySelector( '.sgs-trust-bar__lane' );
		if ( ! track || ! lane ) {
			return;
		}
		const gap =
			parseFloat( window.getComputedStyle( track ).columnGap ) || 0;
		const fits = setFitsLane(
			track.getBoundingClientRect().width,
			gap,
			lane.getBoundingClientRect().width
		);
		setPhase( fits ? 'static' : 'run' );
	}, [ enabled, phase, rootRef ] );

	return ! enabled || 'static' !== phase;
}
