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
import { MEDIA_ATTR_TYPES, MEDIA_TIERED_BASES, mediaAttrName, mediaStoredAttrName } from '../../MediaElementControls.js';
import { ADOPTED_SETTINGS } from '../emit/adopted-settings.js';
import { ADOPTED_COMPOSITES, COMPOSITES } from './panel-model.js';
import { DEVICES, clearPatch, isSet, ownAt, readAt, tierPatch } from './disclosure-context.js';

const DEVICE_NAMES = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

const ADOPTED_RESPONSIVE = new Set(
	Object.values( ADOPTED_SETTINGS )
		.flat()
		.filter( ( s ) => s.responsive )
		.map( ( s ) => s.base )
);

/**
 * How one base is stored. An adopted base keeps its §8 name and, when responsive, one `{desktop,tablet,mobile}` object;
 * a legacy base follows what it stores today.
 *
 * @param {string}  base    Base name.
 * @param {boolean} adopted Adopted slot.
 * @return {{responsive: boolean, mode: string}} Storage facts.
 */
const storage = ( base, adopted ) =>
	adopted
		? { responsive: ADOPTED_RESPONSIVE.has( base ), mode: 'object' }
		: { responsive: MEDIA_TIERED_BASES.includes( base ), mode: modeFor( base ) };

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
	const adopted = !! row.setting.adopted;
	const key = adopted ? mediaAttrName( prefix, base ) : mediaStoredAttrName( blockSlug, prefix, base );
	const { responsive, mode } = storage( base, adopted );

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
		const adopted = !! row.setting.adopted;
		const members = ( adopted ? ADOPTED_COMPOSITES : COMPOSITES )[ row.setting.base ] || [];
		[ row.setting.base, ...members ].forEach( ( base ) => {
			const key = adopted ? mediaAttrName( prefix, base ) : mediaStoredAttrName( blockSlug, prefix, base );
			const { responsive, mode } = storage( base, adopted );
			if ( responsive ) {
				Object.assign( patch, clearPatch( attrs, key, devices, mode ) );
			} else if ( 'desktop' === device ) {
				patch[ key ] = undefined;
			}
		} );
	} );
	return patch;
}
