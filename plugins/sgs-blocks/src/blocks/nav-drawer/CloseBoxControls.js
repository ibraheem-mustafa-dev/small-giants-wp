/**
 * Nav drawer close-button box controls, in the "Top row" panel: the box's
 * border (closeBorderWidth / closeBorderStyle / closeBorderColour through the
 * shared SgsBorderControl) and the glyph size per device (closeIconSize). The
 * rest of the close family (style, placement, size, radius, label, icon,
 * colour) stays where it was in edit.js. Render side:
 * `includes/nav-drawer-chrome-css.php`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import { SgsBorderControl, ResponsiveBoxControl } from '../../components';
import { TierLength } from './chrome-tier-controls';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function CloseBoxControls( { attributes, setAttributes } ) {
	const { closeBorderWidth, closeBorderStyle, closeBorderColour, closeIconSize, closePadding, closeHoverOpacity } = attributes;

	return (
		<>
			<SgsBorderControl
				label={ __( 'Close button border', 'sgs-blocks' ) }
				widthValues={ closeBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { closeBorderWidth: next } ) }
				styleValue={ closeBorderStyle }
				onStyleChange={ ( value ) => setAttributes( { closeBorderStyle: value } ) }
				colourLabel={ __( 'Close button border colour', 'sgs-blocks' ) }
				colourValue={ closeBorderColour }
				onColourChange={ ( value ) => setAttributes( { closeBorderColour: value ?? '' } ) }
				colourLinked
			/>
			<TierLength
				label={ __( 'Close icon size', 'sgs-blocks' ) }
				value={ closeIconSize }
				onChange={ ( obj ) => setAttributes( { closeIconSize: obj } ) }
			/>
			<ResponsiveBoxControl
				label={ __( 'Close button padding', 'sgs-blocks' ) }
				values={ {
					base: closePadding?.desktop ?? {},
					tablet: closePadding?.tablet ?? {},
					mobile: closePadding?.mobile ?? {},
				} }
				onChange={ ( tier, next ) => {
					const key = 'base' === tier ? 'desktop' : tier;
					setAttributes( { closePadding: { ...( closePadding || {} ), [ key ]: next } } );
				} }
			/>
			<RangeControl
				label={ __( 'Close button hover opacity', 'sgs-blocks' ) }
				help={ __( '1 switches the hover fade off.', 'sgs-blocks' ) }
				value={ closeHoverOpacity ?? 0.75 }
				onChange={ ( value ) => setAttributes( { closeHoverOpacity: value ?? 0.75 } ) }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				resetFallbackValue={ 0.75 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
