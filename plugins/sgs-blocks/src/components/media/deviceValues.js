/**
 * Per-device value helpers shared by the Spec 49 media fields.
 *
 * A per-device setting is a `{desktop,tablet,mobile}` object; a blank tier inherits the next wider one. These helpers
 * read and write that shape for one device, name the tier an inherited value really comes from, and build the
 * "Mobile: using Tablet" text every field shows.
 *
 * @package
 */
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { asTierObject, makeResponsive } from '../../utils/responsive.js';

export const DEVICES = [ 'desktop', 'tablet', 'mobile' ];

/** Each device's wider neighbours, nearest first. */
const WIDER = { desktop: [], tablet: [ 'desktop' ], mobile: [ 'tablet', 'desktop' ] };

const DEVICE_FROM_EDITOR = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };

/**
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @return {string} The device's display name.
 */
export function deviceName( device ) {
	if ( 'tablet' === device ) {
		return __( 'Tablet', 'sgs-blocks' );
	}
	if ( 'mobile' === device ) {
		return __( 'Mobile', 'sgs-blocks' );
	}
	return __( 'Desktop', 'sgs-blocks' );
}

/**
 * The editor's active device, from the one global toggle.
 *
 * @return {string} 'desktop' | 'tablet' | 'mobile'.
 */
export function useActiveDevice() {
	return useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		const type =
			editor && 'function' === typeof editor.getDeviceType ? editor.getDeviceType() : null;
		return DEVICE_FROM_EDITOR[ type ] || 'desktop';
	}, [] );
}

/**
 * @param {*} value A stored tier value.
 * @return {boolean} True when the tier holds nothing of its own.
 */
export function isUnset( value ) {
	return undefined === value || null === value || '' === value || 'inherit' === value;
}

/**
 * The value a device shows and which tier holds it.
 *
 * @param {*}        stored  The stored attribute (tier object, plain value or empty).
 * @param {string}   device  'desktop' | 'tablet' | 'mobile'.
 * @param {Function} [isSet] Says whether a tier's value counts as set; defaults to "not blank".
 * @return {{value: *, from: (string|null), own: boolean}} `from` is the holding tier, null when none holds one.
 */
export function resolveTierSource( stored, device, isSet = ( v ) => ! isUnset( v ) ) {
	const tiers = asTierObject( stored );
	for ( const tier of [ device, ...( WIDER[ device ] || [] ) ] ) {
		if ( isSet( tiers[ tier ] ) ) {
			return { value: tiers[ tier ], from: tier, own: tier === device };
		}
	}
	return { value: undefined, from: null, own: false };
}

/**
 * The tier object after writing one device; a blank value removes that device and touches no other.
 *
 * @param {*}      stored The stored attribute.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @param {*}      value  The new value, or blank to clear.
 * @return {Object} A tier object in canonical key order.
 */
export function writeDevice( stored, device, value ) {
	const next = { ...asTierObject( stored ) };
	if ( isUnset( value ) ) {
		delete next[ device ];
	} else {
		next[ device ] = value;
	}
	return makeResponsive( next );
}

/**
 * "Mobile: using Tablet" (or "Mobile: default" when no wider device holds a value).
 *
 * @param {string}  device The active device.
 * @param {?string} from   The tier holding the inherited value, or null.
 * @param {string}  [noun] What is inherited, for "Mobile: using Desktop's video".
 * @return {string} The line to show.
 */
export function describeInheritance( device, from, noun = '' ) {
	if ( ! from ) {
		/* translators: %s: device name. */
		return sprintf( __( '%s: default', 'sgs-blocks' ), deviceName( device ) );
	}
	if ( noun ) {
		/* translators: 1: device name, 2: the wider device, 3: what is inherited (photo, video). */
		return sprintf( __( "%1$s: using %2$s's %3$s", 'sgs-blocks' ), deviceName( device ), deviceName( from ), noun );
	}
	/* translators: 1: device name, 2: the wider device it uses. */
	return sprintf( __( '%1$s: using %2$s', 'sgs-blocks' ), deviceName( device ), deviceName( from ) );
}

/**
 * The Reset button's text: names the tier the field falls back to.
 *
 * @param {string}  device The active device.
 * @param {?string} from   The tier the field falls back to once cleared, or null for the default.
 * @return {string} The label.
 */
export function resetLabel( device, from ) {
	if ( 'desktop' === device || ! from ) {
		return __( 'Reset to default', 'sgs-blocks' );
	}
	/* translators: %s: the wider device the field returns to. */
	return sprintf( __( 'Reset to %s', 'sgs-blocks' ), deviceName( from ) );
}

/**
 * @param {string} device The active device.
 * @return {string} The panel Reset item's text: "Reset Mobile in this panel" off desktop.
 */
export function panelResetLabel( device ) {
	if ( 'desktop' === device ) {
		return __( 'Reset this panel', 'sgs-blocks' );
	}
	/* translators: %s: device name. */
	return sprintf( __( 'Reset %s in this panel', 'sgs-blocks' ), deviceName( device ) );
}
