/**
 * Nav drawer "Top row" panel (Spec 36 FR-36-6): the chrome row that carries the
 * × close, an optional per-device logo and one optional free slot. The render
 * side is `includes/nav-drawer-chrome.php` + `nav-drawer-chrome-css.php`; the
 * slot's own controls are `ChromeSlotControls.js`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { BaseControl, Button, PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveLengthControl, SgsColourPanel, fillRow } from '../../components';
import { TierShow } from './chrome-tier-controls';
import ChromeSlotControls from './ChromeSlotControls';
import CloseBoxControls from './CloseBoxControls';

/** The three logo tiers: attribute suffix and label. */
const LOGO_TIERS = [
	{ suffix: '', label: __( 'Logo (desktop)', 'sgs-blocks' ) },
	{ suffix: 'Tablet', label: __( 'Tablet logo (optional, else desktop)', 'sgs-blocks' ) },
	{ suffix: 'Mobile', label: __( 'Mobile logo (optional, else tablet)', 'sgs-blocks' ) },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The panel.
 */
export default function ChromePanel( { attributes, setAttributes } ) {
	const {
		chromeRowHeight,
		chromeRowGap,
		chromeRowPadding,
		chromeLogoAlt,
		chromeLogoLink,
		chromeLogoWidth,
		chromeLogoShow,
	} = attributes;

	return (
		<PanelBody title={ __( 'Top row (close, logo, slot)', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'The band at the top of the drawer. It always holds the close button; a logo and one heading, label, text or button are optional. It is part of the drawer, not a block, so it cannot be deleted by accident.',
					'sgs-blocks'
				) }
			</p>

			{ LOGO_TIERS.map( ( { suffix, label } ) => {
				const idKey = `chromeLogoId${ suffix }`;
				const urlKey = `chromeLogoUrl${ suffix }`;
				const url = attributes[ urlKey ];
				return (
					<BaseControl key={ idKey } label={ label } __nextHasNoMarginBottom>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( { [ idKey ]: media?.id, [ urlKey ]: media?.url || '' } )
								}
								allowedTypes={ [ 'image' ] }
								value={ attributes[ idKey ] }
								render={ ( { open } ) => (
									<div className="sgs-nav-drawer__logo-picker">
										{ url && (
											<img
												className="sgs-nav-drawer__logo-picker-thumb"
												src={ url }
												alt=""
											/>
										) }
										<Button variant="secondary" onClick={ open } __next40pxDefaultSize>
											{ url ? __( 'Replace', 'sgs-blocks' ) : __( 'Choose image', 'sgs-blocks' ) }
										</Button>
										{ url && (
											<Button
												variant="tertiary"
												isDestructive
												onClick={ () => setAttributes( { [ idKey ]: undefined, [ urlKey ]: '' } ) }
												__next40pxDefaultSize
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</BaseControl>
				);
			} ) }

			{ !! ( attributes.chromeLogoUrl || attributes.chromeLogoUrlTablet || attributes.chromeLogoUrlMobile ) && (
				<>
					<TextControl
						label={ __( 'Logo alt text', 'sgs-blocks' ) }
						help={ __( 'Leave empty to use the image’s own alt text.', 'sgs-blocks' ) }
						value={ chromeLogoAlt || '' }
						onChange={ ( value ) => setAttributes( { chromeLogoAlt: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Logo links to the home page', 'sgs-blocks' ) }
						checked={ false !== chromeLogoLink }
						onChange={ ( value ) => setAttributes( { chromeLogoLink: value } ) }
						__nextHasNoMarginBottom
					/>
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
				</>
			) }

			<ChromeSlotControls attributes={ attributes } setAttributes={ setAttributes } />

			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'chromeRowBg',
						label: __( 'Top row background', 'sgs-blocks' ),
						attrs: { base: 'chromeRowBg', gradient: 'chromeRowBgGradient' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
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

			<CloseBoxControls attributes={ attributes } setAttributes={ setAttributes } />
		</PanelBody>
	);
}
