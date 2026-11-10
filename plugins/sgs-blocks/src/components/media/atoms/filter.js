/**
 * `filter` atom: the colour treatment (Natural, Black and white with a strength, White), logic half. PHP twin:
 * `includes/media/atoms/filter.php`. It prints one `filter` on the media element and replaces `sgsColourTreatment`.
 *
 * @package SGS\Blocks
 */

import { DEVICES, add, nodes, resolved, rulesCss } from '../emit/core.js';
import { mediaFilter } from '../emit/values.js';

function filterAt( attrs, slot, device ) {
	return mediaFilter( resolved( attrs, slot, 'Colour', device ), resolved( attrs, slot, 'Greyscale', device ) );
}

/**
 * C3 emitter: the media element's `filter`, printed where it changes from the wider device; `none` cancels.
 *
 * @param {Object}  slot   Slot.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS.
 */
export function emit( slot, attrs, uid, helper ) {
	const n = nodes( slot, uid, helper );
	const rules = {};
	let prev = '';
	for ( const device of DEVICES ) {
		const now = filterAt( attrs, slot, device );
		if ( now !== prev ) {
			add( rules, n.media, device, 'filter', '' === now ? 'none' : now );
		}
		prev = now;
	}
	return rulesCss( rules );
}

/**
 * The atom contract's custom-property declarations: none, this atom prints real properties through emit().
 *
 * @return {string[]} Always empty.
 */
export function css() {
	return [];
}

/**
 * @param {*} value Candidate treatment.
 * @return {string} `natural`, `greyscale` or `white`; `natural` for anything else.
 */
export function validate( value ) {
	return 'greyscale' === value || 'white' === value ? value : 'natural';
}

/**
 * C4 rule: the strength shows only while the treatment is Black and white.
 *
 * @param {Object} attrs  Attributes.
 * @param {string} device Device.
 * @param {string} prefix Slot prefix.
 * @return {Object} By base: `{ state, hiddenReason }`.
 */
export function disclosure( attrs = {}, device = 'desktop', prefix = '' ) {
	const colour = resolved( attrs, { prefix }, 'Colour', device );
	return {
		Colour: { state: 'shown', hiddenReason: null },
		Greyscale:
			'greyscale' === colour
				? { state: 'shown', hiddenReason: null }
				: { state: 'omitted', hiddenReason: 'Strength applies to Black and white only.' },
	};
}
