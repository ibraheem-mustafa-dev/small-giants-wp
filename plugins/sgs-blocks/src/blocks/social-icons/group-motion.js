/**
 * sgs/social-icons row: the group hover, motion and shadow defaults every icon follows (render.php prints them as
 * --sgs-si-* custom properties that icon/style.css reads after an icon's own value). This file holds the inspector panels
 * and the canvas twin of that part of render.php.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ROW_MOTION_NAMES, iconMotionStyle, iconShadowStyle } from '../icon/icon-motion';
import { BrandHoverControl, HoverMotionFields, IconShadowPanel, ROW_SHADOW_KEYS } from '../icon/motion-panels';
import { isCssGradient } from '../../utils/background-preview';

/**
 * The row's group hover, motion and shadow custom properties on the canvas. Twin of the matching part of render.php.
 *
 * @param {Object} attributes Row attributes.
 * @param {Object} hoverMap   `settings.custom.shadowHover`, for a shadow preset's automatic lift.
 * @return {Object} React style fragment.
 */
export function rowMotionCanvasStyle( attributes, hoverMap = {} ) {
	const style = {};
	const scale = attributes.childIconScaleHover;
	if ( 'number' === typeof scale && scale >= 1 ) {
		style[ '--sgs-si-hover-scale' ] = Math.min( 1.5, scale );
	}
	// A flat group background with no gradient of its own replaces a brand's gradient ground on every icon.
	if ( attributes.childIconBackground && ! isCssGradient( attributes.childIconBackgroundGradient ) ) {
		style[ '--sgs-si-bg-gradient' ] = 'none';
	}
	return {
		...style,
		...iconMotionStyle( attributes, ROW_MOTION_NAMES, '--sgs-si' ),
		...iconShadowStyle(
			{
				shadow: attributes.childIconBoxShadow,
				colour: attributes.childIconBoxShadowColour,
				hover: attributes.childIconBoxShadowHover,
				hoverColour: attributes.childIconBoxShadowColourHover,
				lift: attributes.childIconShadowLiftOnHover,
			},
			'--sgs-si',
			{ hoverMap }
		),
	};
}

/**
 * The Icon hover and Icon shadow panels of the row inspector.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Row attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element} The panels.
 */
export default function RowMotionPanels( { attributes, setAttributes } ) {
	const scale = attributes.childIconScaleHover;
	return (
		<>
			<PanelBody title={ __( 'Icon hover', 'sgs-blocks' ) } initialOpen={ false }>
				<RangeControl
					label={ __( 'Grow on hover', 'sgs-blocks' ) }
					help={ __( '1 = no growth. 0 = each icon keeps its own (1.1 unless it says otherwise).', 'sgs-blocks' ) }
					value={ scale ?? 0 }
					onChange={ ( value ) => setAttributes( { childIconScaleHover: value ?? 0 } ) }
					min={ 0 }
					max={ 1.5 }
					step={ 0.05 }
					allowReset
					resetFallbackValue={ 0 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<HoverMotionFields attributes={ attributes } setAttributes={ setAttributes } names={ ROW_MOTION_NAMES } />
				<BrandHoverControl value={ attributes.childIconBrandHover } onChange={ ( value ) => setAttributes( { childIconBrandHover: value } ) } />
			</PanelBody>
			<IconShadowPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				names={ ROW_MOTION_NAMES }
				shadowKeys={ ROW_SHADOW_KEYS }
				help={ __( 'For every icon without a shadow of its own. The outline shapes draw no box, so they take none.', 'sgs-blocks' ) }
			/>
		</>
	);
}
