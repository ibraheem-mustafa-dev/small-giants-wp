/**
 * Nav drawer top-row free slot controls (Spec 36 FR-36-6): ONE optional
 * heading, label, text or button beside the logo. The button type is styled
 * by the shared built-in button emitter (`sgs_button_element_style_css()`,
 * prefix `chromeButton`); every type shares the `chromeSlot` typography.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	SgsBorderControl,
	SgsBoxControl,
	TypographyControls,
} from '../../components';
import { TierShow } from './chrome-tier-controls';

const TYPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Heading', 'sgs-blocks' ), value: 'heading' },
	{ label: __( 'Label', 'sgs-blocks' ), value: 'label' },
	{ label: __( 'Text', 'sgs-blocks' ), value: 'text' },
	{ label: __( 'Button', 'sgs-blocks' ), value: 'button' },
	{ label: __( 'Google rating', 'sgs-blocks' ), value: 'google-rating' },
];

const LEVEL_OPTIONS = [ 'h2', 'h3', 'h4', 'p' ].map( ( level ) => ( {
	label: 'p' === level ? __( 'Paragraph', 'sgs-blocks' ) : level.toUpperCase(),
	value: level,
} ) );

const PLACEMENT_OPTIONS = [
	{ label: __( 'After the logo', 'sgs-blocks' ), value: 'after-logo' },
	{ label: __( 'Centre of the row', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'At the end, beside the close button', 'sgs-blocks' ), value: 'end' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function ChromeSlotControls( { attributes, setAttributes } ) {
	const {
		chromeSlotType,
		chromeSlotText,
		chromeSlotHeadingLevel,
		chromeSlotUrl,
		chromeSlotNewTab,
		chromeSlotPlacement,
		chromeSlotShow,
		chromeSlotBadgeShowCount,
		chromeButtonBorderWidth,
		chromeButtonBorderStyle,
		chromeButtonBorderRadius,
		chromeButtonPadding,
	} = attributes;
	const type = chromeSlotType || '';
	const isButton = 'button' === type;
	const isRating = 'google-rating' === type;

	return (
		<>
			<SelectControl
				label={ __( 'Extra item in the top row', 'sgs-blocks' ) }
				value={ type }
				options={ TYPE_OPTIONS }
				onChange={ ( value ) => setAttributes( { chromeSlotType: value } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ '' !== type && (
				<>
					{ ! isRating && (
						<TextControl
							label={ isButton ? __( 'Button label', 'sgs-blocks' ) : __( 'Words', 'sgs-blocks' ) }
							value={ chromeSlotText || '' }
							onChange={ ( value ) => setAttributes( { chromeSlotText: value } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ isRating && (
						<ToggleControl
							label={ __( 'Show the number of reviews', 'sgs-blocks' ) }
							help={ __( 'The rating, review count and link come from Site Info (Settings > Site Info), or live Google data when connected.', 'sgs-blocks' ) }
							checked={ !! chromeSlotBadgeShowCount }
							onChange={ ( value ) => setAttributes( { chromeSlotBadgeShowCount: value } ) }
							__nextHasNoMarginBottom
						/>
					) }
					{ 'heading' === type && (
						<SelectControl
							label={ __( 'Heading level', 'sgs-blocks' ) }
							value={ chromeSlotHeadingLevel || 'h2' }
							options={ LEVEL_OPTIONS }
							onChange={ ( value ) => setAttributes( { chromeSlotHeadingLevel: value } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ isButton && (
						<>
							<TextControl
								label={ __( 'Button link', 'sgs-blocks' ) }
								help={ __( 'A button with no link is not shown.', 'sgs-blocks' ) }
								type="url"
								value={ chromeSlotUrl || '' }
								onChange={ ( value ) => setAttributes( { chromeSlotUrl: value } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<ToggleControl
								label={ __( 'Open in a new tab', 'sgs-blocks' ) }
								checked={ !! chromeSlotNewTab }
								onChange={ ( value ) => setAttributes( { chromeSlotNewTab: value } ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
					<SelectControl
						label={ __( 'Position in the row', 'sgs-blocks' ) }
						value={ chromeSlotPlacement || 'after-logo' }
						options={ PLACEMENT_OPTIONS }
						onChange={ ( value ) => setAttributes( { chromeSlotPlacement: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TierShow
						label={ __( 'Show the extra item', 'sgs-blocks' ) }
						value={ chromeSlotShow }
						onChange={ ( obj ) => setAttributes( { chromeSlotShow: obj } ) }
					/>
					{ ! isRating && (
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							targets={ [
								{
									key: 'chromeSlot',
									label: __( 'Extra item text', 'sgs-blocks' ),
									prefix: 'chromeSlot',
									showFontFamily: true,
									showTransform: true,
									showLetterSpacing: true,
								},
							] }
						/>
					) }
					{ isButton ? (
						<>
							<SgsColourPanel
								rows={ [
									fillRow( {
										key: 'chromeButtonFill',
										label: __( 'Button background', 'sgs-blocks' ),
										attrs: {
											base: 'chromeButtonColourBackground',
											hover: 'chromeButtonColourBackgroundHover',
											gradient: 'chromeButtonColourBackgroundGradient',
										},
										attributes,
										setAttributes,
									} ),
									textRow( {
										key: 'chromeButtonText',
										label: __( 'Button text', 'sgs-blocks' ),
										attrs: {
											base: 'chromeButtonColourText',
											hover: 'chromeButtonColourTextHover',
										},
										attributes,
										setAttributes,
									} ),
								] }
							/>
							<SgsBorderControl
								label={ __( 'Button border', 'sgs-blocks' ) }
								widthValues={ chromeButtonBorderWidth ?? {} }
								onWidthChange={ ( next ) => setAttributes( { chromeButtonBorderWidth: next } ) }
								styleValue={ chromeButtonBorderStyle }
								onStyleChange={ ( value ) => setAttributes( { chromeButtonBorderStyle: value } ) }
								colourLabel={ __( 'Button border colour', 'sgs-blocks' ) }
								colourStates={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: attributes.chromeButtonColourBorder,
										onChange: ( value ) => setAttributes( { chromeButtonColourBorder: value ?? '' } ),
									},
									{
										key: 'hover',
										label: __( 'Hover', 'sgs-blocks' ),
										value: attributes.chromeButtonColourBorderHover,
										onChange: ( value ) => setAttributes( { chromeButtonColourBorderHover: value ?? '' } ),
									},
								] }
								radiusValues={ { base: chromeButtonBorderRadius ?? {} } }
								showRadiusResponsive={ false }
								onRadiusChange={ ( _tier, next ) => setAttributes( { chromeButtonBorderRadius: next } ) }
							/>
							<SgsBoxControl
								label={ __( 'Button padding', 'sgs-blocks' ) }
								values={ chromeButtonPadding ?? {} }
								onChange={ ( next ) => setAttributes( { chromeButtonPadding: next } ) }
							/>
						</>
					) : (
						<SgsColourPanel
							rows={ [
								textRow( {
									key: 'chromeSlotColour',
									label: __( 'Extra item colour', 'sgs-blocks' ),
									attrs: isRating
										? { base: 'chromeSlotColour' }
										: { base: 'chromeSlotColour', gradient: 'chromeSlotColourGradient' },
									attributes,
									setAttributes,
								} ),
							] }
						/>
					) }
				</>
			) }
		</>
	);
}
