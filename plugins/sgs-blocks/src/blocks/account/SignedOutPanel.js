/**
 * sgs/account — "Signed-out card" inspector panels (FR-30-25).
 *
 * The card's words and links, then its chrome: border and corner radius per
 * device, shadow, padding per device, width and gap. The background fill is a
 * colour row in edit.js (SgsColourPanel). Every attribute is absent until set,
 * so an untouched block keeps its uid class.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import {
	BOX_UNITS,
	LinkPopoverField,
	ResponsiveControl,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	FlexWrapControl,
	SgsLengthControl,
	ShadowControl,
	normaliseResponsiveBox,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { patchTier } from '../../utils';
import { LINK_SOURCES_PAGES } from '../../shared/link-source-options';
import SgsFreeTextField from '../../components/SgsFreeTextField';

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Words, links and view choice.
 */
export function SignedOutContentPanel( { attributes, setAttributes } ) {
	const isCard = 'card' === attributes.signedOutView;

	return (
		<PanelBody title={ __( 'Signed-out card', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'What a signed-out visitor sees', 'sgs-blocks' ) }
				value={ isCard ? 'card' : 'form' }
				onChange={ ( value ) =>
					setAttributes( { signedOutView: 'card' === value ? 'card' : undefined } )
				}
			>
				<ToggleGroupControlOption value="form" label={ __( 'Log-in form', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="card" label={ __( 'Card', 'sgs-blocks' ) } />
			</ToggleGroupControl>
			{ isCard && (
				<>
					<SgsFreeTextField
						type="rich"
						label={ __( 'Card heading', 'sgs-blocks' ) }
						value={ attributes.signedOutHeading }
						onChange={ ( value ) => setAttributes( { signedOutHeading: value } ) }
					/>
					<SgsFreeTextField
						type="rich"
						label={ __( 'Card text', 'sgs-blocks' ) }
						value={ attributes.signedOutCopy }
						onChange={ ( value ) => setAttributes( { signedOutCopy: value } ) }
					/>
					<SgsFreeTextField
						label={ __( 'Sign-in button label', 'sgs-blocks' ) }
						value={ attributes.signedOutSignInLabel }
						onChange={ ( value ) => setAttributes( { signedOutSignInLabel: value } ) }
					/>
					<LinkPopoverField
						label={ __( 'Sign-in button link', 'sgs-blocks' ) }
						help={ __( 'Leave empty to open this page with the log-in form.', 'sgs-blocks' ) }
						value={ { url: attributes.signedOutSignInUrl, linkSource: attributes.signedOutSignInUrlSource || '' } }
						linkSources={ LINK_SOURCES_PAGES }
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) {
								patch.signedOutSignInUrl = next.url;
							}
							if ( undefined !== next.linkSource ) {
								patch.signedOutSignInUrlSource = next.linkSource;
							}
							setAttributes( patch );
						} }
					/>
					<SgsFreeTextField
						label={ __( 'Create-account button label', 'sgs-blocks' ) }
						value={ attributes.signedOutRegisterLabel }
						onChange={ ( value ) => setAttributes( { signedOutRegisterLabel: value } ) }
					/>
					<LinkPopoverField
						label={ __( 'Create-account button link', 'sgs-blocks' ) }
						help={ __(
							'Leave empty to open this page with the register form. The button is hidden while WooCommerce registration is off.',
							'sgs-blocks'
						) }
						value={ { url: attributes.signedOutRegisterUrl, linkSource: attributes.signedOutRegisterUrlSource || '' } }
						linkSources={ LINK_SOURCES_PAGES }
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) {
								patch.signedOutRegisterUrl = next.url;
							}
							if ( undefined !== next.linkSource ) {
								patch.signedOutRegisterUrlSource = next.linkSource;
							}
							setAttributes( patch );
						} }
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element|null} Card chrome controls (the signed-out card, and the card holding the sign-in tabs).
 */
export function SignedOutCardPanel( { attributes, setAttributes } ) {
	if ( 'card' !== attributes.signedOutView && 'tabs' !== attributes.authLayout ) {
		return null;
	}
	const radius = attributes.signedOutCardCorners;

	return (
		<>
			<PanelBody title={ __( 'Sign-in card style', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsBorderControl
					widthValues={ attributes.signedOutCardBorderWidth ?? {} }
					onWidthChange={ ( next ) => setAttributes( { signedOutCardBorderWidth: next } ) }
					styleValue={ attributes.signedOutCardBorderStyle }
					onStyleChange={ ( val ) => setAttributes( { signedOutCardBorderStyle: val ?? '' } ) }
					colourLabel={ __( 'Card border colour', 'sgs-blocks' ) }
					colourValue={ attributes.signedOutCardBorderColour }
					onColourChange={ ( val ) => setAttributes( { signedOutCardBorderColour: val ?? '' } ) }
					radiusValues={ {
						base: radius?.desktop ?? {},
						tablet: radius?.tablet ?? {},
						mobile: radius?.mobile ?? {},
					} }
					onRadiusChange={ ( tier, next ) => {
						const key = 'base' === tier ? 'desktop' : tier;
						setAttributes( { signedOutCardCorners: { ...radius, [ key ]: next } } );
					} }
				/>
				<ShadowControl
					label={ __( 'Card shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'signedOutCardShadow', colour: 'signedOutCardShadowColour' } }
				/>
			</PanelBody>
			<PanelBody title={ __( 'Sign-in card spacing', 'sgs-blocks' ) } initialOpen={ false }>
				<ResponsiveOverride
					value={ attributes.signedOutCardInnerSpacing }
					onChange={ ( obj ) => setAttributes( { signedOutCardInnerSpacing: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Card padding', 'sgs-blocks' ) }
							values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						/>
					) }
				</ResponsiveOverride>
				{ 'card' === attributes.signedOutView && (
					<FlexWrapControl
						label={ __( 'Wrap card buttons', 'sgs-blocks' ) }
						value={ attributes.signedOutActionsFlexWrap }
						onChange={ ( value ) => setAttributes( { signedOutActionsFlexWrap: value || undefined } ) }
					/>
				) }
				<ResponsiveControl label={ __( 'Card max width', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<SgsLengthControl
							label={ __( 'Card max width', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ attributes.signedOutCardMaxWidth?.[ breakpoint ] ?? '' }
							onChange={ ( value ) =>
								patchTier( attributes, setAttributes, 'signedOutCardMaxWidth', breakpoint, value )
							}
						/>
					) }
				</ResponsiveControl>
				<ResponsiveControl label={ __( 'Gap between card items', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<SgsLengthControl
							presets
							label={ __( 'Gap between card items', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ attributes.signedOutItemGap?.[ breakpoint ] ?? '' }
							onChange={ ( value ) =>
								patchTier( attributes, setAttributes, 'signedOutItemGap', breakpoint, value )
							}
						/>
					) }
				</ResponsiveControl>
			</PanelBody>
			<PanelBody title={ __( 'Sign-in card buttons', 'sgs-blocks' ) } initialOpen={ false }>
				<ResponsiveControl label={ __( 'Button height', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<SgsLengthControl
							label={ __( 'Button height', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ attributes.signedOutButtonMinHeight?.[ breakpoint ] ?? '' }
							onChange={ ( value ) =>
								patchTier( attributes, setAttributes, 'signedOutButtonMinHeight', breakpoint, value )
							}
						/>
					) }
				</ResponsiveControl>
				<ResponsiveControl label={ __( 'Gap between buttons', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<SgsLengthControl
							presets
							label={ __( 'Gap between buttons', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ attributes.signedOutButtonGap?.[ breakpoint ] ?? '' }
							onChange={ ( value ) =>
								patchTier( attributes, setAttributes, 'signedOutButtonGap', breakpoint, value )
							}
						/>
					) }
				</ResponsiveControl>
				<ShadowControl
					label={ __( 'Button shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: 'signedOutButtonShadow',
						colour: 'signedOutButtonShadowColour',
						hover: 'signedOutButtonShadowHover',
						hoverColour: 'signedOutButtonShadowColourHover',
					} }
				/>
			</PanelBody>
		</>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element|null} Sign-in tab controls (authLayout "tabs" only).
 */
export function AuthTabsPanel( { attributes, setAttributes } ) {
	if ( 'tabs' !== attributes.authLayout ) {
		return null;
	}
	const tierLength = ( attr, label, presets = false ) => (
		<ResponsiveControl label={ label }>
			{ ( breakpoint ) => (
				<SgsLengthControl
					presets={ presets }
					label={ label }
					hideLabelFromVision
					value={ attributes[ attr ]?.[ breakpoint ] ?? '' }
					onChange={ ( value ) => patchTier( attributes, setAttributes, attr, breakpoint, value ) }
				/>
			) }
		</ResponsiveControl>
	);

	return (
		<>
			<PanelBody title={ __( 'Sign-in tabs', 'sgs-blocks' ) } initialOpen={ false }>
				{ tierLength( 'authTabMinHeight', __( 'Tab height', 'sgs-blocks' ) ) }
				<ShadowControl
					label={ __( 'Open tab shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'authTabShadow', colour: 'authTabShadowColour' } }
				/>
			</PanelBody>
			<PanelBody title={ __( 'Sign-in tab spacing', 'sgs-blocks' ) } initialOpen={ false }>
				{ tierLength( 'authTabGap', __( 'Gap between tabs', 'sgs-blocks' ), true ) }
				{ tierLength( 'authTabsSpaceBelow', __( 'Space below the tabs', 'sgs-blocks' ), true ) }
			</PanelBody>
		</>
	);
}
