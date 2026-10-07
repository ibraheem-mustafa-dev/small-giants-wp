import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { TypographyControls } from '../../components';
import { UnitControl } from '../../components/primitives';

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
 * sgs/buybox, picker pill-style forwarding (mirrors
 * sgs/option-picker's own pillStyle/showSelectedTick Styles-tab placement),
 * the block's typography panel, and the add-to-cart button's style preset. Split out for
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
		pickerShowSelectedValue,
		addToCartStyle,
		addToCartShowPrice,
		addToCartMinHeight,
		addToCartShowIcon,
		addToCartHoverLift,
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
					checked={ true === pickerShowSelectedTick }
					onChange={ ( val ) =>
						setAttributes( { pickerShowSelectedTick: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Picker labels', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				{ /* The picker label's and chosen value's type settings live in the
				     Typography panel below. Font size/letter-spacing/case/colour
				     forward to sgs/option-picker's OWN labelFontSize/
				     labelLetterSpacing/labelTextTransform/labelColour when the toggle
				     is off (option-picker renders its usual visible legend). When it
				     is on, this block replaces that legend with its own label+value
				     row and applies the SAME settings to its own label text, and the
				     chosen value takes its own size and line height - see render.php's
				     "picker-label typography" comment. */ }
				<ToggleControl
					label={ __(
						'Show the chosen value beside the label',
						'sgs-blocks'
					) }
					checked={ !! pickerShowSelectedValue }
					onChange={ ( val ) =>
						setAttributes( { pickerShowSelectedValue: val } )
					}
					help={ __(
						'E.g. "COLOUR" on the left, "Ivory" on the right, in the muted text colour — updates live as the shopper picks a different option.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Typography', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				{ /* One switcher for every typography-holding element of the block. The
				     ladder saving text is sized absolutely by style.css and the picker
				     value exists only on the own-render path, so each keeps its own
				     prefix. The add-to-cart price sits inside the button and follows
				     the button's settings by inheritance. */ }
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
							showLineHeight: true,
						},
						{
							key: 'addToCart',
							label: __( 'Button label and price', 'sgs-blocks' ),
							prefix: 'addToCart',
							showFontFamily: false,
							showStyle: false,
							showLineHeight: false,
							showLetterSpacing: true,
							showTransform: true,
						},
						{
							key: 'pickerLabel',
							label: __( 'Picker label', 'sgs-blocks' ),
							prefix: 'pickerLabel',
							showFontFamily: false,
							showWeight: false,
							showStyle: false,
							showLineHeight: false,
							showLetterSpacing: true,
							showTransform: true,
						},
						{
							key: 'pickerValue',
							label: __( 'Chosen value', 'sgs-blocks' ),
							prefix: 'pickerValue',
							showFontFamily: false,
							showWeight: false,
							showStyle: false,
							showLineHeight: true,
							showLetterSpacing: false,
							showTransform: false,
						},
						{
							key: 'valueLadder',
							label: __( 'Value ladder', 'sgs-blocks' ),
							prefix: 'valueLadder',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'valueLadderSaving',
							label: __( 'Value ladder saving', 'sgs-blocks' ),
							prefix: 'valueLadderSaving',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'stock',
							label: __( 'Stock line', 'sgs-blocks' ),
							prefix: 'stock',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'savingBadge',
							label: __( 'Gallery saving badge', 'sgs-blocks' ),
							prefix: 'savingBadge',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'guidedMeter',
							label: __( 'Guided progress meter', 'sgs-blocks' ),
							prefix: 'guidedMeter',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'guidedGroupTitle',
							label: __( 'Guided group title', 'sgs-blocks' ),
							prefix: 'guidedGroupTitle',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'notifyHeading',
							label: __( 'Notify heading', 'sgs-blocks' ),
							prefix: 'notifyHeading',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'notifyLabel',
							label: __( 'Notify labels', 'sgs-blocks' ),
							prefix: 'notifyLabel',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'notifyInput',
							label: __( 'Notify email input', 'sgs-blocks' ),
							prefix: 'notifyInput',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'notifySubmit',
							label: __( 'Notify button', 'sgs-blocks' ),
							prefix: 'notifySubmit',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
						},
						{
							key: 'notifyStatus',
							label: __( 'Notify status message', 'sgs-blocks' ),
							prefix: 'notifyStatus',
							fontSizePresets: true,
							showFontFamily: true,
							showDecoration: true,
							showTransform: true,
							showLetterSpacing: true,
							showTextAlign: true,
							showTextWrap: true,
							showTextColumns: true,
							showWritingMode: true,
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
				<ToggleControl
					label={ __( 'Show the cart icon', 'sgs-blocks' ) }
					checked={ addToCartShowIcon !== false }
					onChange={ ( val ) =>
						setAttributes( { addToCartShowIcon: val } )
					}
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Lift on hover', 'sgs-blocks' ) }
					checked={ !! addToCartHoverLift }
					onChange={ ( val ) =>
						setAttributes( { addToCartHoverLift: val } )
					}
					help={ __(
						'Moves the button up 2px on hover, matching the timing of a beside-it CTA button.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				<UnitControl
					label={ __( 'Minimum height', 'sgs-blocks' ) }
					value={ addToCartMinHeight || '' }
					onChange={ ( val ) =>
						setAttributes( { addToCartMinHeight: val ?? '' } )
					}
					help={ __(
						"Empty = today's 48px.",
						'sgs-blocks'
					) }
					__unstableInputWidth="100%"
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}
