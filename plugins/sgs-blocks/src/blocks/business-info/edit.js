/**
 * Business Info Block — Editor Component
 *
 * Uses ServerSideRender to display a live preview of what the render.php
 * will produce. Inspector controls choose which type of information to
 * display and configure link / icon behaviour.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl, Notice } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { ResponsiveBoxControl, SgsColourPanel, DesignTokenPicker, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, SgsBorderControl } from '../../components';

/** Labels for the type selector drop-down. */
const TYPE_OPTIONS = [
	{ label: __( 'Phone Number', 'sgs-blocks' ),     value: 'phone'       },
	{ label: __( 'Email Address', 'sgs-blocks' ),    value: 'email'       },
	{ label: __( 'Postal Address', 'sgs-blocks' ),   value: 'address'     },
	{ label: __( 'Opening Hours', 'sgs-blocks' ),    value: 'hours'       },
	{ label: __( 'Social Media Links', 'sgs-blocks' ), value: 'socials'   },
	{ label: __( 'Copyright Notice', 'sgs-blocks' ), value: 'copyright'   },
	{ label: __( 'Tagline / Description', 'sgs-blocks' ), value: 'description' },
	{ label: __( 'Google Maps Embed', 'sgs-blocks' ), value: 'map'        },
	{ label: __( 'Website Credit / Attribution', 'sgs-blocks' ), value: 'attribution' },
];

/** Types that support the showIcon toggle. */
const ICON_TYPES = new Set( [ 'phone', 'email', 'address' ] );

export default function Edit( { attributes, setAttributes } ) {
	const {
		displayType,
		showIcon,
		labelCollapse,
		iconColour,
		iconColourGradient,
		iconColourHover,
		iconColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		labelColour,
		labelColourGradient,
		attributionHoverColour,
		attributionHoverColourFallback,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-business-info-wrap sgs-business-info-wrap--${ displayType }`,
	} );

	return (
		<>
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. `supports.color` sub-flags are now
			   false so WordPress generates no native colour UI to overlap
			   with this panel. Text colour + Icon colour each carry a real
			   normal/hover pair (added 2026-09-05 — the framework's 2-state
			   standard, sgs_text_states_css()/mirroring sgs/button's icon
			   states.hover shape, is now used rather than a single-state row). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) => setAttributes( { iconColour: val ?? '' } ),
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) => setAttributes( { iconColourHover: val ?? '' } ),
								gradientValue: iconColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Display Type', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'What to display', 'sgs-blocks' ) }
						value={ displayType }
						options={ TYPE_OPTIONS }
						onChange={ ( val ) => setAttributes( { displayType: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Notice
						isDismissible={ false }
						status="info"
						style={ { marginTop: '12px' } }
					>
						{ __( 'Edit this site’s business data at Appearance → SGS Site Info.', 'sgs-blocks' ) }
					</Notice>
				</PanelBody>

				{ ICON_TYPES.has( displayType ) && (
					<PanelBody title={ __( 'Display Options', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Show icon', 'sgs-blocks' ) }
							checked={ showIcon }
							onChange={ ( val ) => setAttributes( { showIcon: val } ) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Collapse label to icon', 'sgs-blocks' ) }
							help={ __(
								'Hide the text and show just the icon from the chosen breakpoint down (keeps a working call/email link and an accessible name). Requires the icon to be on.',
								'sgs-blocks'
							) }
							value={ labelCollapse || 'none' }
							options={ [
								{ label: __( 'Never — always show label', 'sgs-blocks' ), value: 'none' },
								{ label: __( 'On mobile (below 768px)', 'sgs-blocks' ), value: 'mobile' },
								{ label: __( 'On tablet & mobile (below 1024px)', 'sgs-blocks' ), value: 'tablet' },
								{ label: __( 'Always — icon only', 'sgs-blocks' ), value: 'all' },
							] }
							onChange={ ( val ) =>
								setAttributes( { labelCollapse: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: labelColour,
									onChange: ( val ) => setAttributes( { labelColour: val ?? '' } ),
									gradientValue: labelColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { labelColourGradient: val ?? '' } ),
								},
							] }
						/>
					</PanelBody>
				) }

				{ /* 2026-09-05: replaces the old "Link Options" panel, which was
				   gated on phone/email but controlled the ATTRIBUTION
				   credit-sweep colour (`.sgs-business-attribution
				   .sgs-business-info__link`, style.css:99-134) — a control
				   that visibly did nothing on a phone/email instance, while
				   the display type that actually needed it (attribution) had
				   no exposed control at all. `linkPhone`/`linkEmail` toggles
				   are gone entirely — phone/email now always render as links
				   (see block.json's `link` element note + render.php). */ }
				{ 'attribution' === displayType && (
					<PanelBody title={ __( 'Hover Colour', 'sgs-blocks' ) } initialOpen={ false }>
						<DesignTokenPicker
							label={ __( 'Hover colour', 'sgs-blocks' ) }
							help={ __(
								'The colour the website-credit link sweeps to on hover. Defaults to the SGS brand colour when unset.',
								'sgs-blocks'
							) }
							states={ [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: attributionHoverColour,
									onChange: ( val ) => setAttributes( { attributionHoverColour: val ?? '' } ),
								},
							] }
						/>
						<DesignTokenPicker
							label={ __( 'Hover colour (older browsers)', 'sgs-blocks' ) }
							help={ __(
								'Fallback for browsers with no text-clip support — a plain colour swap instead of the sweep.',
								'sgs-blocks'
							) }
							states={ [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: attributionHoverColourFallback,
									onChange: ( val ) => setAttributes( { attributionHoverColourFallback: val ?? '' } ),
								},
							] }
						/>
					</PanelBody>
				) }

				{ /* ── Spacing panel ── padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read directly by this
				   block's render.php. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
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
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ), value: borderColour,
							  onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							  gradientValue: borderColourGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) },
							{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ), value: borderColourHover,
							  onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
							  gradientValue: borderColourHoverGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ) },
						] }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* Typography — replaces the old WP-native supports.typography
				   (fontSize/fontFamily only) with the shared TypographyControls
				   component + sgs_typography_css_rule() render.php helper
				   (D971/D972 full-replacement track). Root prefix "" — this
				   block's typography was already applied to the whole wrapper
				   div ($root_sel in render.php), not a specific child element,
				   so the scope is unchanged, only the mechanism moves.
				   showFontFamily preserves the pre-migration native
				   fontFamily:true capability. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showFontFamily
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/business-info"
					attributes={ attributes }
				/>
			</div>
		</>
	);
}
