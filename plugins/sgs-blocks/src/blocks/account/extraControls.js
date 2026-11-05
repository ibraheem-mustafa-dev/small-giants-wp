/**
 * sgs/account — small control builders shared by the Round 9 panels (wording, page headers, orders, addresses,
 * account details, sign-in button). Each one writes a single attribute; an empty value clears it so the block keeps
 * WooCommerce's look.
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import {
	BOX_UNITS,
	ResponsiveOverride,
	SgsBoxControl,
	normaliseResponsiveBox,
} from '../../components';

/**
 * @param {Object}   p
 * @param {string}   p.name          Attribute name.
 * @param {string}   p.label         Control label.
 * @param {string}   [p.help]        Help text.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A text field.
 */
export function TextField( { name, label, help, attributes, setAttributes } ) {
	return (
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			value={ attributes[ name ] ?? '' }
			onChange={ ( value ) => setAttributes( { [ name ]: value || undefined } ) }
		/>
	);
}

/**
 * @param {Object}   p
 * @param {string}   p.name          Attribute name.
 * @param {string}   p.label         Control label.
 * @param {string}   [p.help]        Help text.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A switch.
 */
export function Toggle( { name, label, help, attributes, setAttributes } ) {
	return (
		<ToggleControl
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			checked={ !! attributes[ name ] }
			onChange={ ( value ) => setAttributes( { [ name ]: value || undefined } ) }
		/>
	);
}

/**
 * @param {Object}   p
 * @param {string}   p.name          Attribute name.
 * @param {string}   p.label         Control label.
 * @param {Array}    p.options       Select options; the first value is '' (unset).
 * @param {string}   [p.help]        Help text.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A select.
 */
export function Choice( { name, label, options, help, attributes, setAttributes } ) {
	return (
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			value={ attributes[ name ] ?? '' }
			options={ options }
			onChange={ ( value ) => setAttributes( { [ name ]: value || undefined } ) }
		/>
	);
}

/**
 * A per-device padding box.
 *
 * @param {Object}   p
 * @param {string}   p.name          Tier-object attribute name.
 * @param {string}   p.label         Control label.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A responsive box.
 */
export function TierBox( { name, label, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			value={ attributes[ name ] }
			onChange={ ( obj ) => setAttributes( { [ name ]: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
					units={ BOX_UNITS }
					presets
					defaults={ spacingDefaultsFor( 'sgs/account', name ) }
					onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

export const TYPE_TARGET = {
	fontSizePresets: true,
	showFontFamily: true,
	showDecoration: true,
	showTransform: true,
	showLetterSpacing: true,
};

export const BORDER_STYLES = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
];
