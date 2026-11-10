/**
 * Media emitter core: the rule builder and the per-device readers the atoms' `emit()` functions share. PHP twin:
 * `includes/media/media-values.php`. An emitter returns finished rules for one slot: selectors, one `@media` per narrower
 * device, properties sorted. The editor collects them through `mediaPreview()`; the page through `sgs_collect_css`.
 *
 * A slot is `{ prefix, kinds, context, wrapper }`; `wrapper` is true when a figure or link is printed around the media.
 *
 * @package SGS\Blocks
 */

import { MEDIA_MOBILE, MEDIA_TABLET } from '../../../utils/breakpoints.js';
import { resolveTier } from '../../../utils/responsive.js';

/** The devices, widest first. */
export const DEVICES = [ 'desktop', 'tablet', 'mobile' ];

const DEVICE_MEDIA = {
	tablet: MEDIA_TABLET,
	mobile: MEDIA_MOBILE,
};

/**
 * The stored attribute name of a base: `{prefix}{Base}`, first letter lower-cased when the prefix is empty.
 *
 * @param {Object} slot Slot.
 * @param {string} base Base name.
 * @return {string} Attribute name.
 */
export function mediaKey( slot, base ) {
	const prefix = slot?.prefix ?? '';
	return '' === prefix ? base.charAt( 0 ).toLowerCase() + base.slice( 1 ) : prefix + base;
}

/**
 * @param {*} value Stored value.
 * @return {boolean} Whether it is a responsive object.
 */
export function isTiered( value ) {
	return null !== value && 'object' === typeof value && ! Array.isArray( value ) && DEVICES.some( ( d ) => d in value );
}

const isEmpty = ( v ) =>
	null === v || undefined === v || '' === v || ( 'object' === typeof v && 0 === Object.keys( v ).length );

/**
 * A base's stored value as a responsive object; a plain value is the desktop value.
 *
 * @param {Object} attrs Attributes.
 * @param {Object} slot  Slot.
 * @param {string} base  Base name.
 * @return {Object} Tier object.
 */
export function tiers( attrs, slot, base ) {
	const raw = attrs?.[ mediaKey( slot, base ) ];
	if ( isEmpty( raw ) ) {
		return {};
	}
	return isTiered( raw ) ? raw : { desktop: raw };
}

/**
 * @param {Object} attrs  Attributes.
 * @param {Object} slot   Slot.
 * @param {string} base   Base name.
 * @param {string} device Device.
 * @return {*} The value the device sets itself, or null when it inherits.
 */
export function own( attrs, slot, base, device ) {
	const value = tiers( attrs, slot, base )[ device ];
	return null === value || undefined === value || '' === value || 'inherit' === value ? null : value;
}

/**
 * @param {Object} attrs  Attributes.
 * @param {Object} slot   Slot.
 * @param {string} base   Base name.
 * @param {string} device Device.
 * @return {*} The value in force at the device (its own, else the nearest wider one's); null when nothing is set.
 */
export function resolved( attrs, slot, base, device ) {
	const t = tiers( attrs, slot, base );
	if ( 0 === Object.keys( t ).length ) {
		return null;
	}
	return resolveTier( t, device, null ).value;
}

/**
 * @param {Object} attrs Attributes.
 * @param {Object} slot  Slot.
 * @param {string} base  Base name.
 * @return {*} A plain (not per-device) value.
 */
export function scalar( attrs, slot, base ) {
	const raw = attrs?.[ mediaKey( slot, base ) ];
	return isTiered( raw ) ? raw.desktop ?? null : raw ?? null;
}

/**
 * @param {number} n Number.
 * @return {string} At most two decimals, no trailing zeros.
 */
export function num( n ) {
	return String( Math.round( n * 100 ) / 100 );
}

/**
 * The selectors of each paint node (C3, §7.4).
 *
 * @param {Object}  slot   Slot.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @param {boolean} mask   Whether a mask layer is printed.
 * @return {{layout:string,surface:string,media:string,mask:string,overlay:string}} Selectors.
 */
export function nodes( slot, uid, helper, mask = false ) {
	const root = `.${ uid }`;
	const wrapped = !! slot?.wrapper;
	let surface = root;
	if ( helper && wrapped ) {
		surface = `${ root } .sgs-media-box`;
	} else if ( ! helper && wrapped ) {
		surface = `${ root } .sgs-media-el`;
	}
	const maskSel = `${ root } .sgs-media-box__mask`;
	return {
		layout: root,
		surface,
		media: helper || wrapped ? `${ root } .sgs-media-el` : root,
		mask: maskSel,
		overlay: `${ mask ? maskSel : surface }::after`,
	};
}

/**
 * Add one declaration to a rule set: selector, device, property.
 *
 * @param {Object} rules    Rule set (mutated).
 * @param {string} selector Selector.
 * @param {string} device   Device.
 * @param {string} prop     Property.
 * @param {string} value    Value.
 */
export function add( rules, selector, device, prop, value ) {
	rules[ selector ] ??= {};
	rules[ selector ][ device ] ??= {};
	rules[ selector ][ device ][ prop ] = value;
}

// A key starting with `@` is a nested at-rule: its value is printed as it is.
const body = ( decls ) =>
	Object.keys( decls )
		.sort()
		.map( ( p ) => ( '@' === p[ 0 ] ? decls[ p ] : `${ p }:${ decls[ p ] };` ) )
		.join( '' );

/**
 * Print a rule set: per selector, desktop plain and the narrower devices in their media queries, properties sorted; then
 * the hover rules, each inside `(hover:hover)` with a 200ms transition that reduced motion removes.
 *
 * @param {Object} rules Selector, device, property, value.
 * @param {Array}  hover List of `[ hoverSelector, transitionSelector, { property: value } ]`.
 * @return {string} CSS.
 */
export function rulesCss( rules, hover = [] ) {
	let css = '';
	for ( const selector of Object.keys( rules ) ) {
		for ( const device of DEVICES ) {
			const decls = rules[ selector ][ device ];
			if ( ! decls || 0 === Object.keys( decls ).length ) {
				continue;
			}
			const rule = `${ selector }{${ body( decls ) }}`;
			css += 'desktop' === device ? rule : `${ DEVICE_MEDIA[ device ] }{${ rule }}`;
		}
	}
	for ( const [ hoverSel, baseSel, decls ] of hover ) {
		if ( 0 === Object.keys( decls ).length ) {
			continue;
		}
		css += `@media(hover:hover){${ hoverSel }{${ body( decls ) }}}`;
		css += `@media(hover:hover) and (prefers-reduced-motion:no-preference){${ baseSel }{transition:${ Object.keys( decls ).sort().join( ' 200ms,' ) } 200ms;}}`;
	}
	return css;
}

/**
 * Add a `plain` setting: the property once per device that sets its own value, nothing else.
 *
 * @param {Object}   rules              Rule set (mutated).
 * @param {Object}   attrs              Attributes.
 * @param {Object}   slot               Slot.
 * @param {string}   base               Base name.
 * @param {string}   selector           Target selector.
 * @param {string}   prop               CSS property.
 * @param {Function} format             Maps the raw value to the printed value, '' to print nothing.
 * @param {string}   skipDefaultDesktop A desktop value equal to this printed value is not printed.
 */
export function emitPlain( rules, attrs, slot, base, selector, prop, format, skipDefaultDesktop = '' ) {
	for ( const device of DEVICES ) {
		const value = own( attrs, slot, base, device );
		if ( null === value ) {
			continue;
		}
		const printed = format( value );
		if ( '' === printed || ( 'desktop' === device && '' !== skipDefaultDesktop && printed === skipDefaultDesktop ) ) {
			continue;
		}
		add( rules, selector, device, prop, printed );
	}
}
