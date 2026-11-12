/**
 * A logo slot's stored Source (`{desktop,tablet,mobile}` of `{kind,id,url,...}`) read the way the front end shows it:
 * a device with no file of its own shows the next wider device's.
 *
 * @package
 */

const WIDER = { desktop: [ 'desktop' ], tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] };

/**
 * @param {Object} source Stored Source object.
 * @param {string} tier   'desktop' | 'tablet' | 'mobile'.
 * @return {Object|null} The device's file entry, or null when neither it nor a wider device has one.
 */
export function logoEntryFor( source, tier ) {
	for ( const device of WIDER[ tier ] || WIDER.desktop ) {
		const entry = source && 'object' === typeof source ? source[ device ] : null;
		if ( entry && ( entry.url || entry.id ) ) {
			return entry;
		}
	}
	return null;
}

/**
 * @param {Object} source Stored Source object.
 * @param {string} tier   'desktop' | 'tablet' | 'mobile'.
 * @return {string} The address of the file the device shows, or ''.
 */
export function logoUrlFor( source, tier ) {
	return logoEntryFor( source, tier )?.url || '';
}

/**
 * @param {Object} source Stored Source object.
 * @return {boolean} Whether any device has a file.
 */
export function hasLogoFile( source ) {
	return [ 'desktop', 'tablet', 'mobile' ].some( ( tier ) => !! logoEntryFor( source, tier ) );
}
