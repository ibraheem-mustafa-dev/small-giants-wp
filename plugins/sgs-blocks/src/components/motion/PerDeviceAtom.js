/**
 * PerDeviceAtom: the per-device wrapper for one field. It sits under the global device toggle (no per-control
 * switcher) and adapts `ResponsiveOverride`'s `{ desktop, tablet, mobile }` model to the motion storage: the Desktop
 * value lives in the layer's `values`, the Tablet and Mobile overrides in `devices.tablet` and `devices.mobile`.
 * Setting Mobile writes only `devices.mobile`; Reset clears that one override (and an emptied `tablet` or `mobile`
 * object is removed). A blank tier shows "Inherited from Tablet" (or Desktop). The wrapped atom is a render prop and
 * every value is checked against the field type before it is written.
 *
 * Writes always spread the existing objects, so the other tiers and the other fields are never lost.
 *
 * @package
 */

import ResponsiveOverride from '../ResponsiveOverride';
import { validateField } from './field-types';

const TABLET = 'tablet';
const MOBILE = 'mobile';

/**
 * The `{ desktop, tablet, mobile }` view of one field.
 *
 * @param {Object|undefined} values  The layer's values.
 * @param {Object|undefined} devices The layer's `{ tablet, mobile }` overrides.
 * @param {string}           key     The field key.
 * @return {Object} The tiers that hold a value.
 */
export function splitTiers( values, devices, key ) {
	const tiers = {};
	if ( values && values[ key ] !== undefined ) {
		tiers.desktop = values[ key ];
	}
	[ TABLET, MOBILE ].forEach( ( tier ) => {
		const own = devices?.[ tier ]?.[ key ];
		if ( own !== undefined ) {
			tiers[ tier ] = own;
		}
	} );
	return tiers;
}

/**
 * Write the tiers of one field back into the layer's values and devices, leaving everything else as it was.
 *
 * @param {Object|undefined} values  The layer's values.
 * @param {Object|undefined} devices The layer's `{ tablet, mobile }` overrides.
 * @param {string}           key     The field key.
 * @param {Object}           tiers   The `{ desktop, tablet, mobile }` view; a missing tier is cleared.
 * @return {{values: Object, devices: Object}} New objects; `devices` holds only the tiers that still have a field.
 */
export function mergeTiers( values, devices, key, tiers ) {
	const nextValues = { ...( values || {} ) };
	if ( tiers.desktop === undefined ) {
		delete nextValues[ key ];
	} else {
		nextValues[ key ] = tiers.desktop;
	}
	const nextDevices = { ...( devices || {} ) };
	[ TABLET, MOBILE ].forEach( ( tier ) => {
		const own = { ...( nextDevices[ tier ] || {} ) };
		if ( tiers[ tier ] === undefined ) {
			delete own[ key ];
		} else {
			own[ key ] = tiers[ tier ];
		}
		if ( Object.keys( own ).length ) {
			nextDevices[ tier ] = own;
		} else {
			delete nextDevices[ tier ];
		}
	} );
	return { values: nextValues, devices: nextDevices };
}

/**
 * @param {Object}      props
 * @param {string}      props.label       Field label shown above the field.
 * @param {string}      props.fieldKey    The field's key in the layer's values.
 * @param {string}      props.type        The field's type, so every written value is checked.
 * @param {Object|null} [props.fieldNode] The field's schema node.
 * @param {Object}      props.values      The layer's values.
 * @param {Object}      [props.devices]   The layer's `{ tablet, mobile }` overrides.
 * @param {Function}    props.onChange    Receives `{ values, devices }`.
 * @param {Function}    props.children    Render prop: `( { value, onChange, tier, inherited, effectiveValue } ) => Element`,
 *                                        where `value` is the active tier's own value (undefined when blank).
 * @return {Element} The wrapped field.
 */
export default function PerDeviceAtom( {
	label,
	fieldKey,
	type,
	fieldNode = null,
	values,
	devices,
	onChange,
	children,
} ) {
	const tiers = splitTiers( values, devices, fieldKey );
	return (
		<ResponsiveOverride
			label={ label }
			value={ tiers }
			onChange={ ( next ) =>
				onChange( mergeTiers( values, devices, fieldKey, next ) )
			}
		>
			{ ( { tier, ownValue, effectiveValue, inherited, setOwnValue } ) =>
				children( {
					tier,
					inherited,
					value: ownValue === '' ? undefined : ownValue,
					effectiveValue:
						effectiveValue === '' ? undefined : effectiveValue,
					onChange: ( next ) => {
						if (
							next !== undefined &&
							! validateField( type, next, fieldNode ).ok
						) {
							return;
						}
						setOwnValue( next === undefined ? '' : next );
					},
				} )
			}
		</ResponsiveOverride>
	);
}
