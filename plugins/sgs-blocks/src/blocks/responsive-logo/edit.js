import { __ } from '@wordpress/i18n';
import ServerSideRender from '../../components/ServerSideRender';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import {
	ResponsiveOverride,
	SgsLengthControl,
	BOX_UNITS,
	normaliseResponsiveBox,
	SgsBoxControl,
	SgsBorderControl,
	SgsColourPanel,
	SsrPreviewGuard,
	SvgPartsControls,
	MediaElementPanel,
} from '../../components';
import metadata from './block.json';

const SLOTS = metadata.supports.sgs.mediaElements;
const LOGO_SLOT = SLOTS.find( ( e ) => 'logo' === e.prefix );
const DARK_SLOT = SLOTS.find( ( e ) => 'logoDark' === e.prefix );

// Units offered on the max-width/max-height UnitControls (mirrors the shared
// TypographyControls unit-set pattern — px is the common case for a logo cap;
// % lets an operator cap relative to the header row).
const MAX_BOX_UNITS = [
	{ value: 'px', label: 'px', default: 240 },
	{ value: '%', label: '%', default: 100 },
	{ value: 'em', label: 'em', default: 20 },
	{ value: 'rem', label: 'rem', default: 20 },
];

/**
 * The site-level logo PHP resolved for this editor session (Site Info `logo`,
 * else the WordPress site logo), published by
 * `Sgs_Site_Info_Binding::publish_editor_data()` on `window.sgsBlocksData`.
 *
 * @return {{ id: number, url: string, source: string }} `source` is '' when no
 *                                                        site-level logo exists.
 */
function getSiteLogo() {
	const data =
		typeof window !== 'undefined' && window.sgsBlocksData
			? window.sgsBlocksData.siteLogo
			: null;
	return data && data.url ? data : { id: 0, url: '', source: '' };
}

/**
 * Help text naming the logo this block shows while it has none of its own.
 *
 * @param {string} source 'site-info', 'wordpress' or ''.
 * @return {string} The hint, or '' when there is no site-level logo.
 */
function siteLogoHint( source ) {
	if ( 'site-info' === source ) {
		return __(
			'Showing the logo from Site Info. Upload one here to override it for this block.',
			'sgs-blocks'
		);
	}
	if ( 'wordpress' === source ) {
		return __(
			'Showing your WordPress site logo. Upload one here, or set a logo in Site Info, to override it.',
			'sgs-blocks'
		);
	}
	return '';
}

/**
 * Shown in the canvas when render.php resolves no logo at any tier.
 */
function EmptyLogoPlaceholder() {
	return (
		<div className="sgs-responsive-logo-editor__empty">
			<span className="dashicons dashicons-format-image" />
			<p>
				{ __(
					'Select a logo in the sidebar, or set one in Site Info, to get started.',
					'sgs-blocks'
				) }
			</p>
		</div>
	);
}

/**
 * Edit component for sgs/responsive-logo.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		logoSwitchMode,
		logoSwitchCustomPx,
		width,
		shrinkWidth,
		linkToHome,
		inlineSvg,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
	} = attributes;

	// The picker persists BOTH the attachment ID and its URL, to the declared
	// `logoId*` / `logoUrl*` attribute pairs — the shape every other SGS image
	// block uses (sgs/media imageId + imageUrl).
	//
	// Persisting the URL is also what makes the a11y half work: `image-alt` pairs
	// an alt attr to a sibling image attr via `alt_companion_attr`, and
	// walk.py only captures alt when that companion is
	// `attr_type='string'`. Three bare attachment IDs could never satisfy it.
	// The wrapper carries `--logo-width` exactly as the front-end root does:
	// site-header-row/style.css floors `.wp-block-sgs-responsive-logo` with
	// `min-width: min(100%, var(--logo-width, 7.5rem), 7.5rem)`. In the canvas the
	// scoped `--logo-width` rule lands on the server-rendered inner root, not on this
	// wrapper, so without the property here the floor resolves to 7.5rem (120px)
	// and a 48px logo's box is 120px wide.
	const blockProps = useBlockProps( {
		className: 'sgs-responsive-logo-editor',
		style:
			width !== undefined && width !== null && width !== ''
				? { '--logo-width': `${ Math.abs( parseInt( width, 10 ) || 0 ) }px` }
				: undefined,
	} );

	// Chain tier 1 is the block's own desktop image; when it is empty the
	// frontend falls through to the site-level logo (Site Info, then WordPress).
	const hasOwnLogo = !! ( attributes.logoSource?.desktop?.id || attributes.logoSource?.desktop?.url );
	const siteLogo = getSiteLogo();
	const siteLogoNote = hasOwnLogo ? '' : siteLogoHint( siteLogo.source );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const responsiveLogoContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			<InspectorControls>
				{ /* ── Panel 1: the logo switch, the logo per device, and the logo for dark backgrounds ── */ }
				<PanelBody
					title={ __( 'Logo switch', 'sgs-blocks' ) }
					initialOpen
				>
					<p className="sgs-responsive-logo-editor__panel-hint">
						{ __(
							'Without a logo of its own, this block shows your site logo. Switch the editor to Tablet or Mobile to give a device its own file; a device without one shows the desktop logo.',
							'sgs-blocks'
						) }
					</p>
					{ siteLogoNote && (
						<p className="sgs-responsive-logo-editor__panel-hint">
							{ siteLogoNote }
						</p>
					) }
					<SelectControl
						label={ __( 'Switch to compact logo', 'sgs-blocks' ) }
						value={ logoSwitchMode || 'mobile' }
						options={ [
							{
								label: __( 'On mobile (≤767px)', 'sgs-blocks' ),
								value: 'mobile',
							},
							{
								label: __(
									'On tablet & below (≤1023px)',
									'sgs-blocks'
								),
								value: 'tablet',
							},
							{
								label: __( 'Custom breakpoint', 'sgs-blocks' ),
								value: 'custom',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { logoSwitchMode: val } )
						}
						help={ __(
							'When the compact (tablet/mobile) logo replaces the desktop logo: on mobile, on tablet and below, or at a breakpoint you choose. Only applies once a tablet or mobile logo is set.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					{ 'custom' === logoSwitchMode && (
						<RangeControl
							label={ __( 'Custom breakpoint (px)', 'sgs-blocks' ) }
							help={ __(
								'Below this width the compact logo shows.',
								'sgs-blocks'
							) }
							value={ logoSwitchCustomPx ?? 1024 }
							onChange={ ( val ) =>
								setAttributes( { logoSwitchCustomPx: val } )
							}
							min={ 320 }
							max={ 2000 }
							step={ 1 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					blockName="sgs/responsive-logo"
					blockSlug="sgs/responsive-logo"
					prefix="logo"
					atoms={ LOGO_SLOT.atoms }
					kinds={ LOGO_SLOT.kinds }
					context={ LOGO_SLOT.context }
				/>

				{ /* ── Logo for dark backgrounds (U-13 §4.5). ── */ }
				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					blockName="sgs/responsive-logo"
					blockSlug="sgs/responsive-logo"
					prefix="logoDark"
					atoms={ DARK_SLOT.atoms }
					kinds={ DARK_SLOT.kinds }
					context={ DARK_SLOT.context }
				/>

				{ /* ── Panel 3: Sizing + behaviour ── */ }
				<PanelBody
					title={ __( 'Sizing + behaviour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Width (px)', 'sgs-blocks' ) }
						help={ __(
							'Fills the containing column/element until set. Mobile/tablet scale proportionally.',
							'sgs-blocks'
						) }
						value={ width ?? 240 }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						min={ 40 }
						max={ 600 }
						step={ 10 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<ResponsiveOverride
						label={ __( 'Size when header shrinks', 'sgs-blocks' ) }
						value={ shrinkWidth }
						onChange={ ( obj ) =>
							setAttributes( { shrinkWidth: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								label={ __(
									'Size when header shrinks',
									'sgs-blocks'
								) }
								hideLabelFromVision
								help={ __(
									'Only takes effect inside an SGS header or header row that has its own "shrink on scroll" setting turned on — the logo keeps its natural proportions (only width is set, height follows automatically). Leave unset to keep the logo the same size when the header shrinks.',
									'sgs-blocks'
								) }
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								units={ MAX_BOX_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>

					<ToggleControl
						label={ __( 'Print SVG inline', 'sgs-blocks' ) }
						help={ __(
							'For an SVG logo: prints the file itself into the page instead of an image, so its own animation plays and custom CSS can style its parts. Other image types are unaffected.',
							'sgs-blocks'
						) }
						checked={ !! inlineSvg }
						onChange={ ( val ) =>
							setAttributes( { inlineSvg: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ !! inlineSvg && (
						<SvgPartsControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							names={ {
								parts: 'svgParts',
								trigger: 'svgPartsTrigger',
								cooldown: 'svgPartsHoverCooldown',
							} }
							label={ __( 'Logo part animation', 'sgs-blocks' ) }
						/>
					) }
					<ToggleControl
						label={ __( 'Link to homepage', 'sgs-blocks' ) }
						help={ __(
							'Wraps the logo in an <a> tag pointing to the site home URL.',
							'sgs-blocks'
						) }
						checked={ linkToHome }
						onChange={ ( val ) =>
							setAttributes( { linkToHome: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* ── Panel 3b: Maximum size per device ── */ }
				<PanelBody
					title={ __( 'Maximum size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p className="sgs-responsive-logo-editor__panel-hint">
						{ __(
							'Cap the logo box. Leave it blank for no maximum.',
							'sgs-blocks'
						) }
					</p>
					<ResponsiveOverride
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ attributes.maxWidth }
						onChange={ ( obj ) =>
							setAttributes( { maxWidth: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Max width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								units={ MAX_BOX_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						label={ __( 'Max height', 'sgs-blocks' ) }
						value={ attributes.maxHeight }
						onChange={ ( obj ) =>
							setAttributes( { maxHeight: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Max height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								units={ MAX_BOX_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Panel 4: Spacing ── */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) =>
							setAttributes( { padding: obj } )
						}
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Background colour (SgsColourPanel is the
				   ONLY sanctioned colour control): gives the
				   logo's own background tile independent control whether it sits in
				   the site header or inside sgs/nav-drawer. ── */ }
				<SgsColourPanel
					rows={ [
						{
							key: 'background',
							label: __( 'Background colour', 'sgs-blocks' ),
							states: [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: backgroundColour,
									onChange: ( val ) =>
										setAttributes( {
											backgroundColour: val ?? '',
										} ),
									gradientValue: backgroundColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( {
											backgroundColourGradient: val ?? '',
										} ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: backgroundColourHover,
									onChange: ( val ) =>
										setAttributes( {
											backgroundColourHover: val ?? '',
										} ),
									gradientValue:
										backgroundColourHoverGradient,
									onGradientChange: ( val ) =>
										setAttributes( {
											backgroundColourHoverGradient:
												val ?? '',
										} ),
								},
							],
							// Colour treatment sits with the colour controls: it turns the logo
							// IMAGE white (always, or only on a dark ground), where the row
							// above paints the tile behind it.
							after: (
								<SelectControl
									label={ __(
										'Logo image colour',
										'sgs-blocks'
									) }
									help={ __(
										'Turn the logo image pure white, always or only where it sits on a dark background.',
										'sgs-blocks'
									) }
									value={ attributes.colourTreatment || '' }
									options={ [
										{
											value: '',
											label: __(
												'As uploaded',
												'sgs-blocks'
											),
										},
										{
											value: 'white',
											label: __(
												'Force white',
												'sgs-blocks'
											),
										},
										{
											value: 'auto',
											label: __(
												'Automatic (white on dark backgrounds)',
												'sgs-blocks'
											),
										},
									] }
									onChange={ ( val ) =>
										setAttributes( {
											colourTreatment: val || '',
										} )
									}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
							),
						},
					] }
				/>

				{ /* ── Panel 5: Border ── */ }
				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { borderWidth: next } )
						}
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { borderStyle: val } )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( val ) =>
									setAttributes( {
										borderColour: val ?? '',
									} ),
								gradientValue: borderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										borderColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) =>
									setAttributes( {
										borderColourHover: val ?? '',
									} ),
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										borderColourHoverGradient: val ?? '',
									} ),
							},
						] }
						contrastAgainst={ responsiveLogoContrastAgainst }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								borderRadius: {
									...attributes.borderRadius,
									[ key ]: next,
								},
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor canvas preview ──────────────────────────────────────
			   Rendered via ServerSideRender (render.php) so the canvas NEVER
			   drifts from the frontend — the site-level fallback
			   logo (Site Info, then the WordPress site logo), the functional
			   alt default, and the per-tier max-box all render
			   exactly as they will on the live site (a hand-built preview
			   drifts from the frontend).
			   Tradeoff: motion layers do not run inside the static SSR preview.
			   Always rendered server-side: render.php decides which chain tier
			   wins, and when none resolves it returns nothing, which the
			   empty-response placeholder below turns into the empty prompt. ── */ }
			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender
						block="sgs/responsive-logo"
						attributes={ attributes }
						EmptyResponsePlaceholder={ EmptyLogoPlaceholder }
					/>
				</SsrPreviewGuard>
			</div>
		</>
	);
}
