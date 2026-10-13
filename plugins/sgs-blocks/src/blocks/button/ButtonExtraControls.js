/**
 * sgs/button inspector controls for the Site Info label and the circle behind the icon.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl, ToggleControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../components';
import { ToolsPanelItem } from '../../components/primitives';
import { SITE_INFO_LABEL_SOURCES } from './site-info-label';

/**
 * The "Show the Site Info value as the label" switch; renders only for a Site Info link source.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element|null} The switch, or null for any other link source.
 */
export function SiteInfoLabelToggle( { attributes, setAttributes } ) {
	if ( ! SITE_INFO_LABEL_SOURCES.includes( attributes.linkSource ) ) {
		return null;
	}
	return (
		<ToggleControl
			label={ __( 'Show the Site Info value as the label', 'sgs-blocks' ) }
			help={ __( 'Prints the live phone number, email address or WhatsApp number from Appearance > SGS Site Info. The label below shows while that field is empty.', 'sgs-blocks' ) }
			checked={ !! attributes.labelFromSiteInfo }
			onChange={ ( next ) => setAttributes( { labelFromSiteInfo: next } ) }
			__nextHasNoMarginBottom
		/>
	);
}

/**
 * The circle-diameter item for the Icon appearance panel (the circle's fill is a colour row).
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The tools-panel item.
 */
export function IconShapeSizeItem( { attributes, setAttributes } ) {
	const { iconShapeSize } = attributes;
	return (
		<ToolsPanelItem
			label={ __( 'Icon circle size', 'sgs-blocks' ) }
			hasValue={ () => !! iconShapeSize?.desktop }
			onDeselect={ () => setAttributes( { iconShapeSize: {} } ) }
		>
			<ResponsiveOverride
				label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
				value={ iconShapeSize }
				onChange={ ( obj ) => setAttributes( { iconShapeSize: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<RangeControl
						label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
						hideLabelFromVision
						help={ __( 'The diameter of the filled circle behind the icon. Shows once an icon circle colour is set; empty = 1.8 times the icon size.', 'sgs-blocks' ) }
						value={ ownValue || ( inherited ? effectiveValue : 0 ) || 0 }
						onChange={ ( val ) => setOwnValue( val || '' ) }
						min={ 0 }
						max={ 200 }
						step={ 1 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
		</ToolsPanelItem>
	);
}
