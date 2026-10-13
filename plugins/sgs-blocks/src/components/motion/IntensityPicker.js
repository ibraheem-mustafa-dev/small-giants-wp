/**
 * IntensityPicker: Subtle, Standard or Bold for a layer whose preset has three intensity rows (Spec 38A FR-38A-6,
 * §5.4). Picking one re-stamps the layer from that row: the row's values replace the layer's, except the value paths
 * the client customised after the first stamp, which stay. The stamped values are stored in full, never a reference to
 * the row, so editing a preset later leaves the block unchanged.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import presetFile from './generated-motion-presets.json';
import ChoiceAtom from './ChoiceAtom';
import { sameValue } from './atom-utils';

export const INTENSITIES = Object.freeze( [ 'subtle', 'standard', 'bold' ] );

const INTENSITY_LABELS = Object.freeze( {
	subtle: __( 'Subtle', 'sgs-blocks' ),
	standard: __( 'Standard', 'sgs-blocks' ),
	bold: __( 'Bold', 'sgs-blocks' ),
} );

const isPlainObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

/**
 * The three intensity rows of a preset family.
 *
 * @param {string} family The preset family (`hover-lift`, `split-reveal`, `scrub` ...).
 * @return {Object|null} `{ subtle, standard, bold }` rows, or null when the family has no complete set.
 */
export function intensityRowsFor( family ) {
	const rows = {};
	presetFile.presets.forEach( ( preset ) => {
		if (
			preset.kind === 'intensity' &&
			preset.family === family &&
			INTENSITIES.includes( preset.intensity )
		) {
			rows[ preset.intensity ] = preset;
		}
	} );
	return INTENSITIES.every( ( name ) => rows[ name ] ) ? rows : null;
}

/**
 * Merge a row's values over a layer's values. Objects merge key by key; arrays and scalars are replaced. A path in
 * `kept` (dot-separated, relative to `values`, with an optional leading `values.`) keeps the layer's own value.
 *
 * @param {Object}   current Layer values.
 * @param {Object}   stamped The intensity row's values.
 * @param {string[]} kept    The layer's `customised` paths.
 * @param {string}   prefix  Path so far (internal).
 * @return {Object} The merged values.
 */
export function restampValues( current, stamped, kept = [], prefix = '' ) {
	const keptPaths = kept.map( ( path ) => path.replace( /^values\./, '' ) );
	const result = { ...( current || {} ) };
	Object.entries( stamped || {} ).forEach( ( [ key, next ] ) => {
		const path = prefix ? `${ prefix }.${ key }` : key;
		if ( keptPaths.includes( path ) ) {
			return;
		}
		result[ key ] =
			isPlainObject( next ) && isPlainObject( result[ key ] )
				? restampValues( result[ key ], next, kept, path )
				: next;
	} );
	return result;
}

/**
 * The layer after choosing an intensity.
 *
 * @param {string}   family  The preset family.
 * @param {string}   next    The chosen intensity.
 * @param {Object}   current The layer's values.
 * @param {string[]} kept    The layer's `customised` paths.
 * @return {{intensity: string, values: Object}|null} The new intensity and values, or null for an unknown intensity.
 */
export function restampLayer( family, next, current, kept = [] ) {
	const row = intensityRowsFor( family )?.[ next ];
	return row
		? {
				intensity: next,
				values: restampValues( current, row.values, kept ),
		  }
		: null;
}

/**
 * @param {Object}   props
 * @param {string}   props.family       The layer's preset family.
 * @param {string}   [props.label]      Field label.
 * @param {string}   [props.value]      The layer's current intensity.
 * @param {Object}   [props.values]     The layer's current values.
 * @param {string[]} [props.customised] The layer's `customised` paths, which a re-stamp keeps.
 * @param {Function} props.onChange     Receives `{ intensity, values }` for the layer.
 * @param {string}   [props.help]       Hint text.
 * @return {Element|null} The control, or null when the family has no intensity rows.
 */
export default function IntensityPicker( {
	family,
	label = __( 'Intensity', 'sgs-blocks' ),
	value,
	values,
	customised = [],
	onChange,
	help,
} ) {
	if ( ! intensityRowsFor( family ) ) {
		return null;
	}
	return (
		<ChoiceAtom
			label={ label }
			help={ help }
			options={ INTENSITIES.map( ( name ) => ( {
				value: name,
				label: INTENSITY_LABELS[ name ],
			} ) ) }
			value={ value }
			onChange={ ( next ) => {
				const layer = next
					? restampLayer( family, next, values, customised )
					: null;
				if ( layer && ! ( layer.intensity === value && sameValue( layer.values, values ) ) ) {
					onChange( layer );
				}
			} }
		/>
	);
}
