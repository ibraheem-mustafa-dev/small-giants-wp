/**
 * Nav drawer "Top row" panel (Spec 36 FR-36-6): the chrome row that carries the
 * × close, an optional per-device logo and one optional free slot. The render
 * side is `includes/nav-drawer-chrome.php` + `nav-drawer-chrome-css.php`; the
 * slot's own controls are `ChromeSlotControls.js`. The top row's colours are
 * rows in the drawer's Styles-tab colour panel (`chrome-colour-rows.js`).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { MediaElementPanel, ResponsiveBoxControl, ResponsiveLengthControl, SvgPartsControls } from '../../components';
import { hasLogoFile } from '../../utils/logo-source';
import metadata from './block.json';
import ChromeLogoBoxControls from './ChromeLogoBoxControls';
import { TierShow } from './chrome-tier-controls';
import ChromeSlotControls from './ChromeSlotControls';
import CloseBoxControls from './CloseBoxControls';
import ChromeRowBorderControls from './ChromeRowBorderControls';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

const LOGO_SLOT = metadata.supports.sgs.mediaElements.find( ( e ) => 'chromeLogo' === e.prefix );

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The panel.
 */
export default function ChromePanel( { name, attributes, setAttributes, clientId } ) {
	const {
		chromeRowHeight,
		chromeRowGap,
		chromeRowPadding,
		chromeLogoLink,
		chromeLogoWidth,
		chromeLogoShow,
		chromeSticky,
		drawerScrollbarGutter,
	} = attributes;

	return (
		<>
		<MediaElementPanel
			attributes={ attributes }
			setAttributes={ setAttributes }
			blockName="sgs/nav-drawer"
			blockSlug="sgs/nav-drawer"
			prefix="chromeLogo"
			atoms={ LOGO_SLOT.atoms }
			kinds={ LOGO_SLOT.kinds }
			context={ LOGO_SLOT.context }
		/>
		<PanelBody title={ __( 'Top row (close, logo, slot)', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'The band at the top of the drawer. It always holds the close button; a logo and one heading, label, text or button are optional. It is part of the drawer, not a block, so it cannot be deleted by accident.',
					'sgs-blocks'
				) }
			</p>

			{ hasLogoFile( attributes.chromeLogoSource ) && (
				<>
					<ToggleControl
						label={ __( 'Logo links to the home page', 'sgs-blocks' ) }
						checked={ false !== chromeLogoLink }
						onChange={ ( value ) => setAttributes( { chromeLogoLink: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Print an SVG logo inline', 'sgs-blocks' ) }
						help={ __( 'Prints the desktop SVG logo itself instead of an image, so its parts can animate. It replaces the per-device images.', 'sgs-blocks' ) }
						checked={ !! attributes.chromeLogoInlineSvg }
						onChange={ ( value ) => setAttributes( { chromeLogoInlineSvg: value } ) }
						__nextHasNoMarginBottom
					/>
					{ !! attributes.chromeLogoInlineSvg && (
						<SvgPartsControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							names={ {
								parts: 'chromeLogoSvgParts',
								trigger: 'chromeLogoSvgPartsTrigger',
								cooldown: 'chromeLogoSvgPartsHoverCooldown',
							} }
							label={ __( 'Drawer logo part animation', 'sgs-blocks' ) }
							defaultTrigger="every-visible"
						/>
					) }
					<ResponsiveLengthControl
						label={ __( 'Logo width', 'sgs-blocks' ) }
						value={ chromeLogoWidth }
						onChange={ ( obj ) => setAttributes( { chromeLogoWidth: obj } ) }
					/>
					<TierShow
						label={ __( 'Show the logo', 'sgs-blocks' ) }
						value={ chromeLogoShow }
						onChange={ ( obj ) => setAttributes( { chromeLogoShow: obj } ) }
					/>
					<ChromeLogoBoxControls attributes={ attributes } setAttributes={ setAttributes } />
				</>
			) }

			<ChromeSlotControls attributes={ attributes } setAttributes={ setAttributes } clientId={ clientId } />

			<ResponsiveLengthControl
				label={ __( 'Top row height', 'sgs-blocks' ) }
				value={ chromeRowHeight }
				onChange={ ( obj ) => setAttributes( { chromeRowHeight: obj } ) }
			/>
			<ResponsiveLengthControl
				label={ __( 'Space between items', 'sgs-blocks' ) }
				value={ chromeRowGap }
				onChange={ ( obj ) => setAttributes( { chromeRowGap: obj } ) }
			/>
			<ResponsiveBoxControl
				label={ __( 'Top row padding', 'sgs-blocks' ) }
				presets
				defaults={ spacingDefaultsFor( name, 'chromeRowPadding' ) }
				values={ {
					base: chromeRowPadding?.desktop ?? {},
					tablet: chromeRowPadding?.tablet ?? {},
					mobile: chromeRowPadding?.mobile ?? {},
				} }
				onChange={ ( tier, next ) => {
					const key = 'base' === tier ? 'desktop' : tier;
					setAttributes( { chromeRowPadding: { ...( chromeRowPadding || {} ), [ key ]: next } } );
				} }
			/>

			<ToggleControl
				label={ __( 'Keep the top row in place while the menu scrolls', 'sgs-blocks' ) }
				help={ __( 'Only the drawer content scrolls; the top row and the drawer background stay still.', 'sgs-blocks' ) }
				checked={ !! chromeSticky }
				onChange={ ( value ) => setAttributes( { chromeSticky: value } ) }
				__nextHasNoMarginBottom
			/>

			<ToggleControl
				label={ __( 'Reserve space for the scrollbar', 'sgs-blocks' ) }
				help={ __( 'On: the menu keeps its width when a section opens and the drawer first scrolls. Off: the scrollbar takes width only while it shows. Has no effect where scrollbars overlay the content.', 'sgs-blocks' ) }
				checked={ false !== drawerScrollbarGutter }
				onChange={ ( value ) => setAttributes( { drawerScrollbarGutter: value } ) }
				__nextHasNoMarginBottom
			/>

			<ChromeRowBorderControls attributes={ attributes } setAttributes={ setAttributes } />

			<CloseBoxControls attributes={ attributes } setAttributes={ setAttributes } />
		</PanelBody>
		</>
	);
}
