/**
 * Read an attribute that was saved as one length (a string) or as a per-device `{desktop, tablet, mobile}` object.
 *
 * A saved string is the desktop value, so a block saved before the setting went per-device keeps showing and
 * rendering exactly what it did.
 *
 * @param {string|Object|undefined} value The stored attribute value.
 * @return {Object} A tier object; `{}` when nothing is set.
 */
export function tierValue( value ) {
	if ( value && 'object' === typeof value ) {
		return value;
	}
	const text = 'string' === typeof value ? value.trim() : '';
	return '' === text ? {} : { desktop: text };
}
