/**
 * The Background panel's motion line (Spec 49 §9.6): what moves the background, as one sentence.
 *
 * Pure. "Background motion: Parallax, gentle", "Background motion: Parallax, gentle and Ken Burns", or with more than
 * two effects the first two then "+N". With none: "Background motion: none". The panel never edits motion; its button
 * opens the Effects panel on the Background target.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';

import defs from '../../motion/motion-defs.js';

const EFFECTS = defs[ 'x-sgs-effects' ];
const INTENSITY_WORDS = { subtle: 'gentle', standard: 'medium', bold: 'bold' };

/** The motion target of a background by the kind it shows (§10.1: the part matching the resolved kind). */
export const BACKGROUND_TARGETS = { image: 'background', video: 'background-video', embed: 'background-video', svg: 'svg-bg' };

/**
 * The part a background's motion is set on for a kind.
 *
 * @param {string} kind `image`, `video`, `embed` or `svg`.
 * @return {string} The part key.
 */
export function backgroundTarget( kind ) {
	return BACKGROUND_TARGETS[ kind ] || BACKGROUND_TARGETS.image;
}

/**
 * One layer's words: its effect, then its intensity when it has one.
 *
 * @param {Object} layer An Effects layer.
 * @return {string} For example "Parallax, gentle".
 */
export function layerWords( layer ) {
	const label = EFFECTS[ layer?.effect ]?.label || layer?.effect || '';
	const word = INTENSITY_WORDS[ layer?.intensity ];
	return word ? `${ label }, ${ word }` : label;
}

/**
 * The effects layers stored on a target.
 *
 * @param {Object|undefined} motion The block's motion value.
 * @param {string}           target The part key.
 * @return {Object[]} The layers.
 */
export function effectLayers( motion, target ) {
	const stored = motion?.elements?.[ target ]?.effects;
	return Array.isArray( stored ) ? stored.filter( ( layer ) => layer && layer.effect ) : [];
}

/**
 * The line's text.
 *
 * @param {Object[]} layers The target's effects layers.
 * @return {string} The sentence.
 */
export function motionLineText( layers ) {
	if ( ! layers.length ) {
		return __( 'Background motion: none', 'sgs-blocks' );
	}
	const shown = layers.slice( 0, 2 ).map( layerWords ).join( ` ${ __( 'and', 'sgs-blocks' ) } ` );
	const extra = layers.length - 2;
	return sprintf(
		/* translators: 1: the first two effects, for example "Parallax, gentle and Ken Burns"; 2: how many more, appended as "+2" when there are any. */
		__( 'Background motion: %1$s%2$s', 'sgs-blocks' ),
		shown,
		extra > 0 ? ` +${ extra }` : ''
	);
}

/**
 * The button's label.
 *
 * @param {Object[]} layers The target's effects layers.
 * @return {string} Change, or Choose motion.
 */
export function motionLineButton( layers ) {
	return layers.length ? __( 'Change', 'sgs-blocks' ) : __( 'Choose motion', 'sgs-blocks' );
}
