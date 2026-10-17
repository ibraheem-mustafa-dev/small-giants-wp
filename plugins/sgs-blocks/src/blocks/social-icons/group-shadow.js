/**
 * sgs/social-icons row: the group shadow and brand-hover defaults every icon follows (render.php prints them as
 * --sgs-si-* custom properties that icon/style.css reads after an icon's own value). This file holds the inspector
 * panels and the canvas twin of that part of render.php.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { iconShadowStyle } from '../icon/icon-shadow';
import { BrandHoverControl, IconShadowPanel, ROW_SHADOW_KEYS } from '../icon/shadow-panels';
import { isCssGradient } from '../../utils/background-preview';

// The row's shadow-lift attribute name, written out here so the inspector scan sees this block's controls (it does not
// follow one block's import of another's file).
export const ROW_SHADOW_NAMES = { lift: 'childIconShadowLiftOnHover' };

/**
 * The row's group shadow custom properties on the canvas. Twin of the matching part of render.php.
 *
 * @param {Object} attributes Row attributes.
 * @param {Object} hoverMap   `settings.custom.shadowHover`, for a shadow preset's automatic lift.
 * @return {Object} React style fragment.
 */
export function rowShadowCanvasStyle( attributes, hoverMap = {} ) {
	const style = {};
	// A flat group background with no gradient of its own replaces a brand's gradient ground on every icon.
	if ( attributes.childIconBackground && ! isCssGradient( attributes.childIconBackgroundGradient ) ) {
		style[ '--sgs-si-bg-gradient' ] = 'none';
	}
	return {
		...style,
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
 * The Icon hover colours and Icon shadow panels of the row inspector.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Row attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element} The panels.
 */
export default function RowShadowPanels( { attributes, setAttributes } ) {
	return (
		<>
			<PanelBody title={ __( 'Icon hover', 'sgs-blocks' ) } initialOpen={ false }>
				<BrandHoverControl value={ attributes.childIconBrandHover } onChange={ ( value ) => setAttributes( { childIconBrandHover: value } ) } />
			</PanelBody>
			<IconShadowPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				names={ ROW_SHADOW_NAMES }
				shadowKeys={ ROW_SHADOW_KEYS }
				help={ __( 'For every icon without a shadow of its own. The outline shapes draw no box, so they take none.', 'sgs-blocks' ) }
			/>
		</>
	);
}
