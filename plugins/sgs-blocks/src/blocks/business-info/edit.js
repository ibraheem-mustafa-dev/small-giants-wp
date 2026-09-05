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
import { ResponsiveBoxControl, SgsColourPanel, DesignTokenPicker, TypographyControls } from '../../components';

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
];

/** Types that support the showIcon toggle. */
const ICON_TYPES = new Set( [ 'phone', 'email', 'address' ] );

/** Types that expose link toggles. */
const LINK_PHONE_TYPES = new Set( [ 'phone' ] );
const LINK_EMAIL_TYPES = new Set( [ 'email' ] );

export default function Edit( { attributes, setAttributes } ) {
	const {
		displayType,
		showIcon,
		labelCollapse,
		linkPhone,
		linkEmail,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		iconColour,
		iconColourGradient,
		textColour,
		textColourGradient,
		labelColour,
		labelColourGradient,
		linkHoverBackgroundImage,
		linkHoverTextColour,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-business-info-wrap sgs-business-info-wrap--${ displayType }`,
	} );

	return (
		<>
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. `linkHoverBackgroundImage` /
			   `linkHoverTextColour` (split 2026-08-16, D643 — see block.json's
			   `link` element note) have no "normal" sibling attribute in this
			   block's schema (style.css's own #e7d768 credit-sweep colour is
			   the implicit normal state), so each renders as a single-state
			   row rather than a normal/hover pair. `supports.color` sub-flags
			   are now false so WordPress generates no native colour UI to
			   overlap with this panel. */ }
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

				{ ( LINK_PHONE_TYPES.has( displayType ) || LINK_EMAIL_TYPES.has( displayType ) ) && (
					<PanelBody title={ __( 'Link Options', 'sgs-blocks' ) } initialOpen={ false }>
						{ LINK_PHONE_TYPES.has( displayType ) && (
							<ToggleControl
								label={ __( 'Make phone number clickable', 'sgs-blocks' ) }
								checked={ linkPhone }
								onChange={ ( val ) => setAttributes( { linkPhone: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ LINK_EMAIL_TYPES.has( displayType ) && (
							<ToggleControl
								label={ __( 'Make email address clickable', 'sgs-blocks' ) }
								checked={ linkEmail }
								onChange={ ( val ) => setAttributes( { linkEmail: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
						<DesignTokenPicker
							label={ __( 'Link hover colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: linkHoverBackgroundImage,
									onChange: ( val ) => setAttributes( { linkHoverBackgroundImage: val ?? '' } ),
								},
							] }
						/>
						<DesignTokenPicker
							label={ __( 'Link hover colour (older browsers)', 'sgs-blocks' ) }
							states={ [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: linkHoverTextColour,
									onChange: ( val ) => setAttributes( { linkHoverTextColour: val ?? '' } ),
								},
							] }
						/>
					</PanelBody>
				) }

				{ /* ── Spacing panel ── Box-object interface contract §B: padding/margin
				   base routes to WP-native style.spacing.* (skip-serialised in block.json
				   so it serialises scoped, not inline — mirrors sgs/heading); tiers are the
				   paddingTablet/paddingMobile + marginTablet/marginMobile object attrs. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
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
