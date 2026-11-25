/**
 * Which parts of a block an element switcher lists for one family of settings (typography, border, shadow), and how each
 * is marked. Pure: the component (`ElementSwitcher.js`) feeds it the block's `supports.sgs.elements`, its attributes and
 * the media kind shown on each device.
 *
 * A part is listed when (1) it has at least one setting in the family and (2) the block draws it now. A part that already
 * holds a stored value in the family stays listed when it is not drawn, marked "not shown here", so the value can be
 * found and cleared. Both facts come from the block's own declarations, with no database column:
 *
 * - Settings in the family: the part's `attrMap` (and its `states.*.attrMap`), whose keys are `css:<property>`.
 * - Drawn: the block's source mode (`supports.sgs.motionDelegate`: in a delegating mode only the wrapper parts print) and a
 *   part's `availableWhen` media kinds against the kind each device shows (`motion/kind-fit.js`). A part that is switched
 *   off by an attribute alone (a price turned off, no rating) declares nothing to read, so it counts as drawn.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { activeDelegation } from '../motion/delegation';
import { partAvailable } from '../motion/kind-fit';

/** The dot a switcher option carries when its part holds a value in the family (the motion Target row uses the same). */
export const HELD_MARK = '•';

/**
 * Each family is the CSS properties its settings write; a part's `attrMap` key `css:<property>` belongs to the family when
 * the property starts with one of these.
 */
export const FAMILIES = Object.freeze( {
	shadow: [ 'box-shadow' ],
	border: [ 'border-' ],
	typography: [
		'font-',
		'line-height',
		'letter-spacing',
		'text-transform',
		'text-decoration',
		'-webkit-text-stroke',
	],
} );

const CSS_PREFIX = 'css:';

/**
 * Every attribute a part keeps for one family, resting and per state.
 *
 * @param {Object|undefined} part   The part's `supports.sgs.elements` entry.
 * @param {string}           family `shadow`, `border` or `typography`.
 * @return {string[]} Attribute names.
 */
export function familyAttributes( part, family ) {
	const properties = FAMILIES[ family ];
	if ( ! properties || ! part || 'object' !== typeof part ) {
		return [];
	}
	const maps = [
		part.attrMap,
		...Object.values( part.states || {} ).map(
			( state ) => state?.attrMap
		),
	];
	const names = new Set();
	for ( const map of maps ) {
		for ( const [ key, attribute ] of Object.entries( map || {} ) ) {
			if (
				key.startsWith( CSS_PREFIX ) &&
				'string' === typeof attribute &&
				properties.some( ( property ) =>
					key.slice( CSS_PREFIX.length ).startsWith( property )
				)
			) {
				names.add( attribute );
			}
		}
	}
	return [ ...names ];
}

/**
 * Whether a stored value counts as set. An empty array is unset: a `{}` default reads back from WordPress as `[]`. A
 * tier or side object is set when any of its members is.
 *
 * @param {*} value A stored attribute value.
 * @return {boolean} True when the value is set.
 */
export function isSetValue( value ) {
	if ( undefined === value || null === value || '' === value ) {
		return false;
	}
	if ( Array.isArray( value ) ) {
		return value.length > 0;
	}
	if ( 'object' === typeof value ) {
		return Object.values( value ).some( isSetValue );
	}
	return true;
}

/**
 * Whether a part holds a stored value in the family: a value that is set and is not the attribute's own `block.json`
 * default (a unit or style the block ships with is not something the client chose).
 *
 * @param {Object|undefined} part       The part's declaration.
 * @param {string}           family     `shadow`, `border` or `typography`.
 * @param {Object}           attributes The block's attributes.
 * @param {Object}           [defaults] `{ <attribute>: default }` from the block type's attributes.
 * @return {boolean} True when any of the family's attributes for the part holds a chosen value.
 */
export function partHoldsValue( part, family, attributes, defaults = {} ) {
	return familyAttributes( part, family ).some(
		( name ) =>
			isSetValue( attributes?.[ name ] ) &&
			JSON.stringify( attributes[ name ] ) !==
				JSON.stringify( defaults[ name ] )
	);
}

/**
 * Whether the block draws a part now, from its declarations alone.
 *
 * @param {Object}        part               The part's declaration.
 * @param {Object}        context
 * @param {Object|null}   context.supportsSgs The block's `supports.sgs`.
 * @param {Object}        context.attributes  The block's attributes.
 * @param {Function|null} context.kindsOf     `( part ) => { desktop, tablet, mobile }|null`, the media kind on each device
 *                                            for a part that declares `availableWhen` (`motion/use-part-kinds.js`).
 * @return {boolean} False when the source mode or the media kind leaves the part out.
 */
export function partDrawn( part, { supportsSgs, attributes, kindsOf } ) {
	if (
		part?.isWrapper !== true &&
		activeDelegation( supportsSgs, attributes )
	) {
		return false;
	}
	const kinds = kindsOf ? kindsOf( part ) : null;
	return ! kinds || partAvailable( part, kinds );
}

/**
 * The options one family's switcher offers, in the block's declared order.
 *
 * @param {Object}        args
 * @param {Object|null}   args.elements    `supports.sgs.elements`.
 * @param {string}        args.family      `shadow`, `border` or `typography`.
 * @param {Object}        args.attributes  The block's attributes.
 * @param {Object|null}   [args.supportsSgs] The block's `supports.sgs` (source mode).
 * @param {Function|null} [args.kindsOf]   Media kind per device for a part (`partDrawn`).
 * @param {Object}        [args.defaults]  `{ <attribute>: default }`, so a block's own default is not a held value.
 * @return {{value: string, label: string, held: boolean, shown: boolean}[]} One entry per listed part: `held` when the part
 *                                         has a stored value in the family, `shown` when the block draws it now.
 */
export function switcherParts( {
	elements,
	family,
	attributes,
	supportsSgs = null,
	kindsOf = null,
	defaults = {},
} ) {
	return Object.entries( elements || {} )
		.map( ( [ key, part ], index ) => ( {
			key,
			part,
			order: Number.isFinite( part?.order ) ? part.order : index + 1,
		} ) )
		.filter( ( { part } ) => familyAttributes( part, family ).length > 0 )
		.sort( ( a, b ) => a.order - b.order )
		.map( ( { key, part } ) => ( {
			value: key,
			label: part.label || key.replace( /[-_]/g, ' ' ),
			held: partHoldsValue( part, family, attributes, defaults ),
			shown: partDrawn( part, { supportsSgs, attributes, kindsOf } ),
		} ) )
		.filter( ( option ) => option.shown || option.held );
}

/**
 * The switcher's option labels: a dot after a part that holds a value, and "not shown here" after a part the block does
 * not draw now.
 *
 * @param {{value: string, label: string, held: boolean, shown: boolean}[]} parts `switcherParts()`.
 * @return {{value: string, label: string}[]} The options a choice control takes.
 */
export function switcherOptions( parts ) {
	return parts.map( ( { value, label, held, shown } ) => {
		let text = shown
			? label
			: sprintf(
					/* translators: %s: the part's name. */
					__( '%s (not shown here)', 'sgs-blocks' ),
					label
			  );
		if ( held ) {
			text = `${ text } ${ HELD_MARK }`;
		}
		return { value, label: text };
	} );
}
