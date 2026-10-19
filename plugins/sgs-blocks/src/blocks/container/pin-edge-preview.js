/**
 * Editor-canvas twin of "Stop below the site header" (`pinBelowHeader`,
 * `pinGap`): the `top` a top-pinned sgs/container sticks at in the canvas,
 * matching includes/container-pin-edge-css.php::sgs_container_pin_below_header_offset.
 *
 * @package SGS\Blocks
 */

import { resolveTier, tierValueOf } from '../../utils/responsive';
import { gapVar } from '../../utils/tokens';

/** The gap when none is set: the shop filter's default spacing. */
const DEFAULT_GAP = 'var(--wp--preset--spacing--40, 1.5rem)';

const PRESET_REFERENCE = /^var:preset\|spacing\|([a-z0-9-]+)$/;

/**
 * The `top` of the pinned container at `tier`: the header height plus the gap
 * when "Stop below the site header" is on there and the pin is at the top,
 * otherwise 0.
 *
 * @param {Object} attributes Block attributes (`pinEdge`, `pinBelowHeader`, `pinGap`).
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @return {string|number} A CSS length, or 0.
 */
export function pinEdgeTopPreview( attributes, tier ) {
	const edge = resolveTier( attributes.pinEdge, tier, 'none' ).value;
	const below = resolveTier( attributes.pinBelowHeader, tier, 'off' ).value;
	if ( 'top' !== edge || 'on' !== below ) {
		return 0;
	}
	const stored = tierValueOf( attributes.pinGap, tier );
	const reference =
		'string' === typeof stored ? stored.match( PRESET_REFERENCE ) : null;
	const gap = reference ? gapVar( reference[ 1 ] ) : gapVar( stored );
	return `calc(var(--sgs-header-height, 0px) + ${ gap || DEFAULT_GAP })`;
}
