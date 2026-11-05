/**
 * sgs/icon canvas: the signed-in dot preview. The editor user is always signed in, so the canvas draws the dot (same
 * `.sgs-icon__dot` class as the page) whenever the setting is on, with the colour, size, position and ring the
 * settings give; editor.css shows it without `body.logged-in`.
 */
import { colourVar, resolveTier } from '../../utils';
import { iconLengthValue } from './icon-state';

/**
 * @param {Object}   attributes  Block attributes.
 * @param {string}   tier        Previewed device.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {Object|null} Inline style for the dot, or null when the setting is off.
 */
export function canvasDotStyle( attributes, tier, presetSlugs ) {
	if ( ! attributes.showSignedInDot ) {
		return null;
	}
	const style = {};
	const size = iconLengthValue( resolveTier( attributes.signedInDotSize, tier ).value, 64, presetSlugs );
	if ( size ) {
		style.inlineSize = size;
		style.blockSize = size;
	}
	const top = iconLengthValue( resolveTier( attributes.signedInDotTop, tier ).value, 128, presetSlugs );
	if ( top ) {
		style.insetBlockStart = top;
	}
	const end = iconLengthValue( resolveTier( attributes.signedInDotRight, tier ).value, 128, presetSlugs );
	if ( end ) {
		style.marginInlineEnd = end;
	}
	const colour = colourVar( attributes.signedInDotColour );
	if ( colour ) {
		style.background = colour;
	}
	const ring = colourVar( attributes.signedInDotRingColour );
	if ( ring ) {
		style.boxSizing = 'content-box';
		style.border = `${ iconLengthValue( attributes.signedInDotRingWidth, 16, presetSlugs ) || '2px' } solid ${ ring }`;
	}
	return style;
}
