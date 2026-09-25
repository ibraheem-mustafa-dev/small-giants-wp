import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { TypographyControls } from '../../components';

const PICKER_STYLE_OPTIONS = [
	{ value: '', label: __( "Picker's own default", 'sgs-blocks' ) },
	{ value: 'outlined', label: __( 'Outlined', 'sgs-blocks' ) },
	{ value: 'filled', label: __( 'Filled', 'sgs-blocks' ) },
	{ value: 'ghost', label: __( 'Ghost', 'sgs-blocks' ) },
	{ value: 'tile', label: __( 'Tile', 'sgs-blocks' ) },
];

const ADD_TO_CART_STYLE_OPTIONS = [
	{ value: '', label: __( "Today's look", 'sgs-blocks' ) },
	{ value: 'primary', label: __( 'Primary', 'sgs-blocks' ) },
	{ value: 'secondary', label: __( 'Secondary', 'sgs-blocks' ) },
	{ value: 'outline', label: __( 'Outline', 'sgs-blocks' ) },
];

/**
 * Styles-tab (InspectorControls group="styles") extra panels for
 * sgs/buybox, Eye Care Wave C — picker pill-style forwarding (mirrors
 * sgs/option-picker's own pillStyle/showSelectedTick Styles-tab placement),
 * price typography, and the add-to-cart button's style preset. Split out for
 * the same file-budget reason as inspector-extra-2.js.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} PanelBody sections for the "styles" InspectorControls group.
 */
export function BuyboxExtraStylesPanels( { attributes, setAttributes } ) {
	const {
		pickerSwatchStyle,
		pickerStyle,
		pickerShowSelectedTick,
		addToCartStyle,
		addToCartShowPrice,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Picker styling', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Swatch axes (e.g. Colour)', 'sgs-blocks' ) }
					value={ pickerSwatchStyle || '' }
					options={ PICKER_STYLE_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { pickerSwatchStyle: val } )
					}
					help={ __(
						"Pill style for an axis whose terms carry a colour or image swatch. Picker's own default leaves that picker's own style.",
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<SelectControl
					label={ __( 'Other axes (e.g. Size)', 'sgs-blocks' ) }
					value={ pickerStyle || '' }
					options={ PICKER_STYLE_OPTIONS }
					onChange={ ( val ) => setAttributes( { pickerStyle: val } ) }
					help={ __(
						'Pill style for every axis with no colour/image swatch.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __(
						'Show a tick on the selected option',
						'sgs-blocks'
					) }
					checked={ pickerShowSelectedTick !== false }
					onChange={ ( val ) =>
						setAttributes( { pickerShowSelectedTick: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Price typography', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					targets={ [
						{
							key: 'price',
							label: __( 'Price', 'sgs-blocks' ),
							prefix: 'price',
							showFontFamily: true,
							showStyle: false,
							showLineHeight: false,
						},
					] }
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Add to cart button', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Button style', 'sgs-blocks' ) }
					value={ addToCartStyle || '' }
					options={ ADD_TO_CART_STYLE_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { addToCartStyle: val } )
					}
					help={ __(
						"Today's look keeps the buybox's own accent-colour button.",
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __( 'Show the price on the button', 'sgs-blocks' ) }
					checked={ !! addToCartShowPrice }
					onChange={ ( val ) =>
						setAttributes( { addToCartShowPrice: val } )
					}
					help={ __(
						'Adds the current price at the right end of the button, label on the left.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</>
	);
}
