/**
 * `layout` atom: Alignment and Order on the layout box, logic half. PHP twin: `includes/media/atoms/layout.php`.
 *
 * @package SGS\Blocks
 */

import { DEVICES, add, nodes, own, rulesCss } from '../emit/core.js';
import { isNumeric } from '../emit/values.js';

const SIDES = {
	start: [ '0', 'auto' ],
	center: [ 'auto', 'auto' ],
	end: [ 'auto', '0' ],
};

/**
 * C3 emitter: `margin-inline-start` and `margin-inline-end` for Alignment, `order` for Order, once per device that sets its own.
 *
 * @param {Object}  slot   Slot.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS.
 */
export function emit( slot, attrs, uid, helper ) {
	const { layout } = nodes( slot, uid, helper );
	const rules = {};
	for ( const device of DEVICES ) {
		const align = own( attrs, slot, 'Alignment', device );
		if ( 'string' === typeof align && Object.prototype.hasOwnProperty.call( SIDES, align ) ) {
			add( rules, layout, device, 'margin-inline-start', SIDES[ align ][ 0 ] );
			add( rules, layout, device, 'margin-inline-end', SIDES[ align ][ 1 ] );
		}
		const order = own( attrs, slot, 'Order', device );
		if ( isNumeric( order ) ) {
			add( rules, layout, device, 'order', String( Math.max( -20, Math.min( 20, Math.trunc( Number( order ) ) ) ) ) );
		}
	}
	return rulesCss( rules );
}

/**
 * @param {*} value Candidate Order.
 * @return {number} An integer from -20 to 20; 0 for anything else.
 */
export function validate( value ) {
	return isNumeric( value ) ? Math.max( -20, Math.min( 20, Math.trunc( Number( value ) ) ) ) : 0;
}

/**
 * C4 rule: both settings always show.
 *
 * @return {Object} By base: `{ state, hiddenReason }`.
 */
export function disclosure() {
	const shown = { state: 'shown', hiddenReason: null };
	return { Alignment: shown, Order: shown };
}
