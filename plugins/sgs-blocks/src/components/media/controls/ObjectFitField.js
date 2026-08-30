/**
 * ObjectFitField — shared `SelectControl` wrapper for the `object-fit` atom's
 * two vocabularies (element `object-fit` / backdrop `background-size`).
 *
 * ONE component for both scopes rather than two near-identical `SelectControl`
 * mounts, mirroring why `FocalPositionField` exists for `focal-point` — the
 * shape (label + enum + inherit option + disabled/hiddenReason) is identical
 * either side of the scope split, only the vocabulary and the label differ.
 *
 * Bare row only — mounts no `InspectorControls`/`PanelBody`. The caller (the
 * atom's own `control()`) decides which panel this row lands in.
 *
 * @package SGS\Blocks
 */
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props
 * @param {string}   [props.label]        Row label.
 * @param {string}   props.value          Current stored value ('' = inherit).
 * @param {Function} props.onChange       Receives the next raw value.
 * @param {string[]} props.vocabulary     Allowed values for this scope.
 * @param {string}   [props.prefix]       Surface prefix — unused by the field
 *                                        itself, accepted so every media
 *                                        control shares one prop shape
 *                                        (`{ value, onChange, prefix, disabled,
 *                                        hiddenReason }`) across atoms.
 * @param {boolean}  [props.disabled]     Disable without hiding the row.
 * @param {string}   [props.hiddenReason] Help text shown while disabled.
 */
export default function ObjectFitField( {
	label,
	value,
	onChange,
	vocabulary,
	prefix, // eslint-disable-line no-unused-vars -- shared prop shape, see docblock.
	disabled = false,
	hiddenReason = '',
} ) {
	return (
		<SelectControl
			label={ label }
			value={ value || '' }
			disabled={ disabled }
			help={ disabled ? hiddenReason : undefined }
			options={ [
				{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
				...( vocabulary || [] ).map( ( v ) => ( { label: v, value: v } ) ),
			] }
			onChange={ onChange }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
