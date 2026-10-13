/**
 * Nav drawer top-row free slot controls (Spec 36 FR-36-6): ONE optional
 * heading, label, text or button beside the logo. The button type is styled
 * by the shared built-in button emitter (`sgs_button_element_style_css()`,
 * prefix `chromeButton`); every type shares the `chromeSlot` typography. The
 * slot's colours are rows in the drawer's Styles-tab colour panel
 * (`chrome-colour-rows.js`).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';
import {
	SgsBorderControl,
	SgsBoxControl,
	TypographyControls,
	LinkPopoverField,
} from '../../components';
import { LINK_SOURCES_ALL } from '../../shared/link-source-options';
import { TierShow } from './chrome-tier-controls';
import ChromeRatingControls from './ChromeRatingControls';
import ChromeIconsSlotNotice from './ChromeIconsSlotNotice';

const TYPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Heading', 'sgs-blocks' ), value: 'heading' },
	{ label: __( 'Label', 'sgs-blocks' ), value: 'label' },
	{ label: __( 'Text', 'sgs-blocks' ), value: 'text' },
	{ label: __( 'Button', 'sgs-blocks' ), value: 'button' },
	{ label: __( 'Icons (Social Icons group)', 'sgs-blocks' ), value: 'icons' },
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
 * @param {string}   props.clientId      The drawer block's client id.
 * @return {Element} The controls.
 */
export default function ChromeSlotControls( { attributes, setAttributes, clientId } ) {
	const {
		chromeSlotType,
		chromeSlotText,
		chromeSlotHeadingLevel,
		chromeSlotUrl,
		chromeSlotUrlSource,
		chromeSlotNewTab,
		chromeSlotPlacement,
		chromeSlotShow,
		chromeButtonBorderWidth,
		chromeButtonBorderStyle,
		chromeButtonBorderRadius,
		chromeButtonPadding,
	} = attributes;
	const type = chromeSlotType || '';
	const isButton = 'button' === type;
	const isIcons = 'icons' === type;

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
			{ isIcons && <ChromeIconsSlotNotice clientId={ clientId } /> }
			{ '' !== type && (
				<>
					{ ! isIcons && <TextControl
						label={ isButton ? __( 'Button label', 'sgs-blocks' ) : __( 'Words', 'sgs-blocks' ) }
						value={ chromeSlotText || '' }
						onChange={ ( value ) => setAttributes( { chromeSlotText: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/> }
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
							<LinkPopoverField
								label={ __( 'Button link', 'sgs-blocks' ) }
								help={ __( 'A button with no link is not shown.', 'sgs-blocks' ) }
								value={ {
									url: chromeSlotUrl || '',
									linkTarget: chromeSlotNewTab ? '_blank' : '_self',
									linkSource: chromeSlotUrlSource || '',
								} }
								linkSources={ LINK_SOURCES_ALL }
								targetMode="boolean"
								onChange={ ( next ) => {
									const patch = {};
									if ( undefined !== next.url ) {
										patch.chromeSlotUrl = next.url;
									}
									if ( undefined !== next.linkSource ) {
										patch.chromeSlotUrlSource = next.linkSource;
									}
									if ( undefined !== next.linkTarget ) {
										patch.chromeSlotNewTab = '_blank' === next.linkTarget;
									}
									setAttributes( patch );
								} }
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
					{ ! isIcons && <TypographyControls
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
					/> }
					{ isButton && (
						<>
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
								presets
								onChange={ ( next ) => setAttributes( { chromeButtonPadding: next } ) }
							/>
						</>
					) }
				</>
			) }
			<ChromeRatingControls attributes={ attributes } setAttributes={ setAttributes } />
		</>
	);
}
