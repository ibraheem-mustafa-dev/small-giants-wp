/**
 * "Advanced field settings" inspector panel shared by the SGS form field blocks (Spec 04 FR-4-3 to FR-4-8).
 *
 * Each field block asks only for the settings it supports through `features`, so one component serves
 * text, email, phone, number, textarea, select, radio, checkbox and consent. Rendered by
 * includes/forms/field-render-helpers.php (field_feature_attrs(), field_value_param_attr(),
 * field_message_attrs(), field_select_default(), field_counter()).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';

/** HTML autofill tokens people actually use on a site form, with a plain label each. */
export const AUTOCOMPLETE_TOKENS = [
	{ label: __( 'Browser default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Off (never autofill)', 'sgs-blocks' ), value: 'off' },
	{ label: __( 'Full name', 'sgs-blocks' ), value: 'name' },
	{ label: __( 'First name', 'sgs-blocks' ), value: 'given-name' },
	{ label: __( 'Last name', 'sgs-blocks' ), value: 'family-name' },
	{ label: __( 'Email', 'sgs-blocks' ), value: 'email' },
	{ label: __( 'Phone', 'sgs-blocks' ), value: 'tel' },
	{ label: __( 'Organisation', 'sgs-blocks' ), value: 'organization' },
	{ label: __( 'Job title', 'sgs-blocks' ), value: 'organization-title' },
	{ label: __( 'Address line 1', 'sgs-blocks' ), value: 'address-line1' },
	{ label: __( 'Address line 2', 'sgs-blocks' ), value: 'address-line2' },
	{ label: __( 'Town or city', 'sgs-blocks' ), value: 'address-level2' },
	{ label: __( 'County or region', 'sgs-blocks' ), value: 'address-level1' },
	{ label: __( 'Postcode', 'sgs-blocks' ), value: 'postal-code' },
	{ label: __( 'Country', 'sgs-blocks' ), value: 'country-name' },
	{ label: __( 'Website', 'sgs-blocks' ), value: 'url' },
	{ label: __( 'One-time code', 'sgs-blocks' ), value: 'one-time-code' },
];

const CUSTOM = '__custom';

/** The inputmode values field_inputmodes() accepts. */
export const INPUTMODE_OPTIONS = [
	{ label: __( 'Browser default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Text', 'sgs-blocks' ), value: 'text' },
	{ label: __( 'Numbers only', 'sgs-blocks' ), value: 'numeric' },
	{ label: __( 'Decimal numbers', 'sgs-blocks' ), value: 'decimal' },
	{ label: __( 'Phone keypad', 'sgs-blocks' ), value: 'tel' },
	{ label: __( 'Email keyboard', 'sgs-blocks' ), value: 'email' },
	{ label: __( 'Web address keyboard', 'sgs-blocks' ), value: 'url' },
	{ label: __( 'Search keyboard', 'sgs-blocks' ), value: 'search' },
	{ label: __( 'No on-screen keyboard', 'sgs-blocks' ), value: 'none' },
];

/**
 * Autocomplete picker: the standard tokens plus a custom value.
 *
 * @param {Object}   props
 * @param {string}   props.value    Stored autocomplete value.
 * @param {Function} props.onChange Receives the new value.
 * @return {JSX.Element} The control.
 */
function AutocompleteControl( { value, onChange } ) {
	const known = AUTOCOMPLETE_TOKENS.some( ( token ) => token.value === value );
	const [ custom, setCustom ] = useState( '' !== value && ! known );
	const selected = custom ? CUSTOM : value;

	return (
		<>
			<SelectControl
				label={ __( 'Autofill hint', 'sgs-blocks' ) }
				value={ selected }
				options={ [
					...AUTOCOMPLETE_TOKENS,
					{ label: __( 'Custom value…', 'sgs-blocks' ), value: CUSTOM },
				] }
				onChange={ ( next ) => {
					if ( CUSTOM === next ) {
						setCustom( true );
						return;
					}
					setCustom( false );
					onChange( next );
				} }
				help={ __( 'Tells the browser what to offer to fill in (the HTML autocomplete attribute).', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ custom && (
				<TextControl
					label={ __( 'Custom autofill value', 'sgs-blocks' ) }
					value={ known ? '' : value }
					onChange={ ( next ) => onChange( next.toLowerCase().replace( /[^a-z0-9 -]/g, '' ) ) }
					help={ __( 'Lower-case letters, digits and hyphens, e.g. "section-billing postal-code".', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes     Block attributes.
 * @param {Function} props.setAttributes  Block attribute setter.
 * @param {string[]} props.features       Settings to offer: floatingLabel, autocomplete, inputmode, defaultValue,
 *                                        defaultSelect, defaultChecked, valueFromParam, maxLength, counter,
 *                                        msgRequired, msgInvalid, msgTooLong.
 * @param {string[]} props.optionValues   A select's option values (for defaultSelect).
 * @return {JSX.Element} The panel.
 */
export default function FormFieldAdvancedPanel( { attributes, setAttributes, features, optionValues = [] } ) {
	const has = ( name ) => features.includes( name );
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );

	return (
		<PanelBody title={ __( 'Advanced field settings', 'sgs-blocks' ) } initialOpen={ false }>
			{ has( 'floatingLabel' ) && (
				<ToggleControl
					label={ __( 'Floating label', 'sgs-blocks' ) }
					checked={ false !== attributes.floatingLabel }
					onChange={ set( 'floatingLabel' ) }
					help={ __( 'On: the label sits inside the box and lifts above it on focus or once filled. Off: the label stays above the box.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			) }
			{ has( 'autocomplete' ) && (
				<AutocompleteControl value={ attributes.autocomplete || '' } onChange={ set( 'autocomplete' ) } />
			) }
			{ has( 'inputmode' ) && (
				<SelectControl
					label={ __( 'Mobile keyboard', 'sgs-blocks' ) }
					value={ attributes.inputmode || '' }
					options={ INPUTMODE_OPTIONS }
					onChange={ set( 'inputmode' ) }
					help={ __( 'Which on-screen keyboard phones open (the HTML inputmode attribute).', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'defaultValue' ) && (
				<TextControl
					label={ __( 'Default value', 'sgs-blocks' ) }
					value={ attributes.defaultValue || '' }
					onChange={ set( 'defaultValue' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'defaultSelect' ) && (
				<SelectControl
					label={ __( 'Default option', 'sgs-blocks' ) }
					value={ optionValues.includes( attributes.defaultValue ) ? attributes.defaultValue : '' }
					options={ [
						{ label: __( 'None (show the placeholder)', 'sgs-blocks' ), value: '' },
						...optionValues
							.filter( ( value ) => '' !== value )
							.map( ( value ) => ( { label: value, value } ) ),
					] }
					onChange={ set( 'defaultValue' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'defaultChecked' ) && (
				<ToggleControl
					label={ __( 'Ticked by default', 'sgs-blocks' ) }
					checked={ !! attributes.defaultChecked }
					onChange={ set( 'defaultChecked' ) }
					__nextHasNoMarginBottom
				/>
			) }
			{ has( 'valueFromParam' ) && (
				<TextControl
					label={ __( 'Fill from link parameter', 'sgs-blocks' ) }
					value={ attributes.valueFromParam || '' }
					onChange={ ( value ) => setAttributes( { valueFromParam: value.replace( /[^A-Za-z0-9_-]/g, '' ) } ) }
					help={ __( 'A link such as /apply/?role=Driver fills this field with "Driver" when the parameter name is "role". A select or radio group takes it only if it matches one of its own options.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'maxLength' ) && (
				<NumberControl
					label={ __( 'Maximum characters (0 = no limit)', 'sgs-blocks' ) }
					value={ attributes.maxLength || 0 }
					min={ 0 }
					max={ 100000 }
					onChange={ ( value ) => setAttributes( { maxLength: Math.max( 0, parseInt( value, 10 ) || 0 ) } ) }
					__next40pxDefaultSize
				/>
			) }
			{ has( 'counter' ) && (
				<ToggleControl
					label={ __( 'Show character counter', 'sgs-blocks' ) }
					checked={ false !== attributes.showCounter }
					onChange={ set( 'showCounter' ) }
					help={ __( 'Shows "0 / 800" under the box when a maximum is set.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			) }
			{ has( 'msgRequired' ) && (
				<TextControl
					label={ __( 'Message when left empty', 'sgs-blocks' ) }
					value={ attributes.msgRequired || '' }
					onChange={ set( 'msgRequired' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'msgInvalid' ) && (
				<TextControl
					label={ __( 'Message when the format is wrong', 'sgs-blocks' ) }
					value={ attributes.msgInvalid || '' }
					onChange={ set( 'msgInvalid' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ has( 'msgTooLong' ) && (
				<TextControl
					label={ __( 'Message when too long', 'sgs-blocks' ) }
					value={ attributes.msgTooLong || '' }
					onChange={ set( 'msgTooLong' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
