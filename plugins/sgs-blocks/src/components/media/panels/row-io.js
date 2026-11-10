/**
 * Reading and writing one panel row's stored value at the active device, and
 * clearing a panel (Spec 49 §9.1, §9.2).
 *
 * Pure. Storage follows what each base already uses: tiered object bases keep a
 * `{desktop,tablet,mobile}` object, other responsive bases keep a flat key with
 * `Tablet` / `Mobile` siblings, and the rest are one value for every device.
 *
 * @package SGS\Blocks
 */
import { MEDIA_ATTR_TYPES, MEDIA_TIERED_BASES, mediaStoredAttrName } from '../../MediaElementControls.js';
import { COMPOSITES } from './panel-model.js';
import { DEVICES, clearPatch, isSet, ownAt, readAt, tierPatch } from './disclosure-context.js';

const DEVICE_NAMES = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

/** @param {string} base Base name. @return {string} 'object' or 'flat'. */
const modeFor = ( base ) =>
	'object' === MEDIA_ATTR_TYPES[ base ] && 'BorderRadius' !== base ? 'object' : 'flat';

/**
 * @param {Object}   row           A model row.
 * @param {Object}   attrs         Block attributes.
 * @param {Function} setAttributes Block `setAttributes`.
 * @param {string}   device        Active device.
 * @param {string}   prefix        Surface prefix.
 * @param {string}   blockSlug     Block slug.
 * @return {Object} `{ key, responsive, own, resolved, write, inheritedFrom }`.
 */
export function rowIO( row, attrs, setAttributes, device, prefix, blockSlug ) {
	const base = row.setting.base;
	const key = mediaStoredAttrName( blockSlug, prefix, base );
	const responsive = MEDIA_TIERED_BASES.includes( base );
	const mode = modeFor( base );

	let inheritedFrom = '';
	if ( responsive && 'desktop' !== device && ! isSet( ownAt( attrs, key, device ) ) ) {
		const wider = DEVICES.slice( 0, DEVICES.indexOf( device ) ).reverse();
		inheritedFrom = wider.find( ( d ) => isSet( ownAt( attrs, key, d ) ) ) || '';
	}

	return {
		key,
		responsive,
		own: responsive ? ownAt( attrs, key, device ) : attrs[ key ],
		resolved: responsive ? readAt( attrs, key, device ) : attrs[ key ],
		inheritedFrom,
		write: ( value ) =>
			setAttributes(
				responsive
					? tierPatch( attrs, key, device, value, mode )
					: { [ key ]: '' === value ? undefined : value }
			),
	};
}

/**
 * What to say under a row off Desktop: where an inherited value comes from, or
 * that a setting applies to every device.
 *
 * @param {Object} io     `rowIO()` result.
 * @param {string} device Active device.
 * @return {{kind:string,device:string,from:string}|null} Note data, or null.
 */
export function deviceNote( io, device ) {
	if ( 'desktop' === device ) {
		return null;
	}
	if ( ! io.responsive ) {
		return { kind: 'all', device: DEVICE_NAMES[ device ], from: '' };
	}
	if ( isSet( io.own ) ) {
		return null;
	}
	return { kind: 'inherited', device: DEVICE_NAMES[ device ], from: io.inheritedFrom ? DEVICE_NAMES[ io.inheritedFrom ] : '' };
}

/**
 * One `setAttributes` patch that clears every row of a panel: all devices on
 * Desktop, only the active device elsewhere (a setting that is the same on
 * every device is left alone off Desktop). One call is one undo step.
 *
 * @param {Object[]} rows      The panel's rows.
 * @param {Object}   attrs     Block attributes.
 * @param {string}   device    Active device.
 * @param {string}   prefix    Surface prefix.
 * @param {string}   blockSlug Block slug.
 * @return {Object} Patch.
 */
export function resetPatch( rows, attrs, device, prefix, blockSlug ) {
	const patch = {};
	const devices = 'desktop' === device ? DEVICES : [ device ];
	rows.forEach( ( row ) => {
		[ row.setting.base, ...( COMPOSITES[ row.setting.base ] || [] ) ].forEach( ( base ) => {
			const key = mediaStoredAttrName( blockSlug, prefix, base );
			if ( MEDIA_TIERED_BASES.includes( base ) ) {
				Object.assign( patch, clearPatch( attrs, key, devices, modeFor( base ) ) );
			} else if ( 'desktop' === device ) {
				patch[ key ] = undefined;
			}
		} );
	} );
	return patch;
}
