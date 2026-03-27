/**
 * Navigation Panel — font sizes, weights, dividers, indent for Panel 4.
 *
 * Extracted from edit.js to keep it under 500 lines.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl, RangeControl } from '@wordpress/components';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Extra Small', 'sgs-blocks' ), value: 'x-small' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Extra Large', 'sgs-blocks' ), value: 'x-large' },
];

const FONT_SIZE_WITH_DEFAULT_OPTIONS = [
	{ label: __( 'Default (same as desktop)', 'sgs-blocks' ), value: '' },
	...FONT_SIZE_OPTIONS,
];

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-Bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes   Full block attributes object.
 * @param {Function} props.setAttributes Block setAttributes.
 */
export default function NavigationPanel( { attributes, setAttributes } ) {
	const {
		linkFontSize,
		linkFontSizeMobile,
		linkFontWeight,
		sublinkFontSize,
		sublinkFontSizeMobile,
		showDividers,
		submenuIndent,
	} = attributes;

	return (
		<>
			<SelectControl
				label={ __( 'Link Font Size', 'sgs-blocks' ) }
				value={ linkFontSize }
				options={ FONT_SIZE_OPTIONS }
				onChange={ ( value ) => setAttributes( { linkFontSize: value } ) }
			/>
			<SelectControl
				label={ __( 'Link Font Size (Mobile Override)', 'sgs-blocks' ) }
				help={ __( 'Overrides link font size below 768px. Leave as Default to match desktop.', 'sgs-blocks' ) }
				value={ linkFontSizeMobile }
				options={ FONT_SIZE_WITH_DEFAULT_OPTIONS }
				onChange={ ( value ) => setAttributes( { linkFontSizeMobile: value } ) }
			/>
			<SelectControl
				label={ __( 'Link Font Weight', 'sgs-blocks' ) }
				value={ linkFontWeight }
				options={ FONT_WEIGHT_OPTIONS }
				onChange={ ( value ) => setAttributes( { linkFontWeight: value } ) }
			/>
			<SelectControl
				label={ __( 'Sub-link Font Size', 'sgs-blocks' ) }
				value={ sublinkFontSize }
				options={ FONT_SIZE_OPTIONS }
				onChange={ ( value ) => setAttributes( { sublinkFontSize: value } ) }
			/>
			<SelectControl
				label={ __( 'Sub-link Font Size (Mobile Override)', 'sgs-blocks' ) }
				help={ __( 'Leave as Default to match desktop.', 'sgs-blocks' ) }
				value={ sublinkFontSizeMobile }
				options={ FONT_SIZE_WITH_DEFAULT_OPTIONS }
				onChange={ ( value ) => setAttributes( { sublinkFontSizeMobile: value } ) }
			/>
			<ToggleControl
				label={ __( 'Show Dividers Between Links', 'sgs-blocks' ) }
				checked={ showDividers }
				onChange={ ( value ) => setAttributes( { showDividers: value } ) }
			/>
			<RangeControl
				label={ __( 'Sub-menu Indent (px)', 'sgs-blocks' ) }
				help={ __( 'Left padding for sub-menu items.', 'sgs-blocks' ) }
				value={ submenuIndent }
				min={ 0 }
				max={ 48 }
				step={ 4 }
				onChange={ ( value ) => setAttributes( { submenuIndent: value } ) }
			/>
		</>
	);
}
