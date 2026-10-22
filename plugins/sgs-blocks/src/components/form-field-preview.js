/**
 * Shared editor-canvas preview bits for the SGS form field blocks (Spec 04 FR-4-4, 4-5, 4-8).
 *
 * The front end prints these from includes/forms/field-render-helpers.php (field_open(), field_default_value(),
 * field_counter()); the helpers here make the editor canvas show the same label class, default value and
 * counter, so a setting changed in the inspector is visible without a preview round trip.
 *
 * @package SGS\Blocks
 */

/**
 * The modifier classes a field's label settings add to its wrapper.
 *
 * @param {Object} attributes Block attributes (floatingLabel, floatingLabelPosition).
 * @return {string[]} Class names (empty for the default floating label above the box).
 */
export function fieldLabelClasses( attributes ) {
	if ( false === attributes.floatingLabel ) {
		return [ 'sgs-form-field--static-label' ];
	}
	if ( 'inside' === attributes.floatingLabelPosition ) {
		return [ 'sgs-form-field--label-inside' ];
	}
	return [];
}

/**
 * A text-like field's default value as shown in the canvas.
 *
 * @param {Object} attributes Block attributes (defaultValue).
 * @return {string} The value, or '' when none is set.
 */
export function fieldDefaultValue( attributes ) {
	return 'string' === typeof attributes.defaultValue ? attributes.defaultValue : '';
}

/**
 * The live counter under a textarea, as the front end prints it: "N / max", shown only when a maximum
 * length is set and the counter is on.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes (maxLength, showCounter, defaultValue).
 * @return {JSX.Element|null} The counter span, or null.
 */
export function FieldCounterPreview( { attributes } ) {
	const max = Math.max( 0, Math.min( parseInt( attributes.maxLength, 10 ) || 0, 100000 ) );
	if ( max < 1 || false === attributes.showCounter ) {
		return null;
	}
	const start = Math.min( fieldDefaultValue( attributes ).length, max );
	return <span className="sgs-form-field__counter">{ `${ start } / ${ max }` }</span>;
}
