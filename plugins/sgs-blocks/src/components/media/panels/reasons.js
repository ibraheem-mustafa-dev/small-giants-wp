/**
 * The disclosure rules' reason lines, translated for the editor (Spec 49 §9.3).
 *
 * The atoms' rules carry plain English so plain Node can load them; this table holds each line as a literal `__()`
 * call so the string extractor sees it, keyed by the English text a rule returns.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { REASONS } from './disclosure-context.js';

const TRANSLATED = {
	[ REASONS.noCrop ]: () => __( 'To choose which part of the photo shows, first give it a shape: pick an Aspect ratio or a Height.', 'sgs-blocks' ),
	[ REASONS.focalFill ]: () => __( 'A stretched photo has no part to choose.', 'sgs-blocks' ),
	[ REASONS.autoplayLock ]: () =>
		__( 'Locked on while Autoplay is on: a browser refuses to autoplay an unmuted video, and iOS needs "plays inline" or the video takes over the screen.', 'sgs-blocks' ),
	[ REASONS.overlayPaint ]: () => __( 'Overlay strength and blend only apply once an overlay colour or gradient is set.', 'sgs-blocks' ),
	[ REASONS.svgSpeed ]: () => __( 'Animation speed only applies once an animation is chosen.', 'sgs-blocks' ),
	[ REASONS.corners ]: () => __( 'Corners are not used while a shape is chosen.', 'sgs-blocks' ),
	[ REASONS.borders ]: () => __( 'Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border.', 'sgs-blocks' ),
	[ REASONS.shadowFollowsShape ]: () => __( 'Shadows follow the shape', 'sgs-blocks' ),
	[ REASONS.pinnedParallax ]: () => __( 'Pinned cannot hold while the background has parallax.', 'sgs-blocks' ),
	[ REASONS.pinnedTransform ]: () => __( 'Pinned cannot hold with a moving entrance or hover on this block.', 'sgs-blocks' ),
};

/**
 * @param {string|null|undefined} text A reason a rule returned.
 * @return {string|undefined} The translated line, the text itself when it has no translation, or undefined for none.
 */
export function translateReason( text ) {
	if ( ! text ) {
		return undefined;
	}
	return TRANSLATED[ text ] ? TRANSLATED[ text ]() : text;
}
