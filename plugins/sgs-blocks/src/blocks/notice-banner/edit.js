import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import {
	IconPicker,
	IconPreview,
	ResponsiveBoxControl,
	SgsColourPanel,
	SgsLengthControl,
	fillRow,
	textRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { colourVar } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

// Box-object interface contract — length units for the kept-scalar maxWidth
// attr (base only, matches the pre-existing attribute set). contentWidth was
// removed (it only ever set a second `width:` on this same root — dead promise
// of an inner band this block never rendered).
const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
];

const DISPLAY_MODE_OPTIONS = [
	{ label: __( 'Inline', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Announcement bar', 'sgs-blocks' ), value: 'announcement' },
];

const STICKY_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

const DISMISS_BEHAVIOUR_OPTIONS = [
	{
		label: __( 'Session (resets when tab closes)', 'sgs-blocks' ),
		value: 'session',
	},
	{
		label: __( 'Permanent (remembered in browser)', 'sgs-blocks' ),
		value: 'permanent',
	},
];

const VARIANT_OPTIONS = [
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Error', 'sgs-blocks' ), value: 'error' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

// The ideal default icon for each variant (Lucide). Shown unless the operator
// picks an override. Must stay in sync with the same map in render.php.
const VARIANT_DEFAULT_ICON = {
	info: 'info',
	success: 'circle-check',
	warning: 'triangle-alert',
	error: 'circle-x',
	accent: 'sparkles',
};

/**
 * Resolve the icon to display: an explicit override, else the variant default.
 *
 * @param {Object} attrs Block attributes.
 * @return {{source:string,name:string}} Resolved icon.
 */
function resolveIcon( attrs ) {
	if ( attrs.iconSource && attrs.iconName ) {
		return { source: attrs.iconSource, name: attrs.iconName };
	}
	return {
		source: 'lucide',
		name: VARIANT_DEFAULT_ICON[ attrs.variant ] || 'info',
	};
}

/**
 * Default InnerBlocks template.
 *
 * Seeds an sgs/text body for the notice message. The slot stays OPEN (no
 * allowedBlocks lock) so an operator — or the cloning converter routing a
 * draft heading node INTO the banner rather than emitting it as a sibling —
 * can add an sgs/heading, a list, or a secondary note as additional children.
 */
const NOTICE_BANNER_TEMPLATE = [
	[
		'sgs/text',
		{ text: __( 'Write your notice message here.', 'sgs-blocks' ), tag: 'p' },
	],
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder (base tier only;
// tablet/mobile preview is via PHP `@media`, matches sgs/quote's pattern).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// Editor canvas preview only (desktop styles; responsive via PHP). No-inline
// contract note: the SAVED/RENDERED frontend output is dynamic (render.php)
// and carries zero inline declarations — this inline style exists only for
// the live editor preview, same exception documented in sgs/quote's edit.js.
function buildWrapperStyle( attributes ) {
	const { style, maxWidth } = attributes;
	const wrapperStyle = {};

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}
	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		variant,
		showIcon,
		iconSource,
		iconColour,
		iconColourHover,
		iconColourGradient,
		displayMode,
		stickyPosition,
		dismissible,
		dismissBehaviour,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		maxWidth,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	const isAnnouncement = 'announcement' === displayMode;

	const className = [
		'sgs-notice-banner',
		`sgs-notice-banner--${ variant }`,
		isAnnouncement ? 'sgs-notice-banner--announcement' : '',
		isAnnouncement ? `sgs-notice-banner--sticky-${ stickyPosition }` : '',
	]
		.filter( Boolean )
		.join( ' ' );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the notice-banner's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const noticeBannerContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	const blockProps = useBlockProps( {
		className,
		style: isAnnouncement ? undefined : buildWrapperStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps( {}, {
		template: NOTICE_BANNER_TEMPLATE,
	} );
	const resolved = resolveIcon( attributes );
	const usingDefault = ! ( iconSource && attributes.iconName );

	return (
		<>
			{ /* D618/D609 — grouped, SGS-owned colour panel, rendered FIRST so it
			   sits at the top of the inspector (Styles tab). Replaces the
			   inline "Icon colour" DesignTokenPicker that used to sit inside
			   the "Icon" ToolsPanelItem below. "Text colour" + "Background
			   colour" are now BLOCK-PRIVATE attributes (native
			   `supports.color` is fully false — WP no longer renders its own
			   colour panel or writes to core's `style.color.*` storage)
			   built via the shared five-variant colour helpers (`fillRow`/
			   `textRow`) — render.php reads the same attrs through the
			   matching PHP-side emitters (`sgs_fill_decls`/`sgs_text_decls`).
			   Both rows support a base + hover state and a gradient sibling.
			   iconColour stays single-state — no hover counterpart. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'iconColour',
						label: __( 'Icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) => setAttributes( { iconColour: val ?? '' } ),
								linked: true,
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) => setAttributes( { iconColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Banner settings" title with no
				   initialOpen, so the client saw the same words twice for
				   no collapse benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Banner settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								displayMode: 'inline',
								stickyPosition: 'top',
								dismissible: false,
								dismissBehaviour: 'session',
								variant: 'info',
								showIcon: true,
								iconSource: '',
								iconName: '',
								iconColour: '',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Display mode', 'sgs-blocks' ) }
							hasValue={ () => displayMode !== 'inline' }
							onDeselect={ () => setAttributes( { displayMode: 'inline' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Display mode', 'sgs-blocks' ) }
								help={ __(
									'Inline sits within the page flow. Announcement bar is fixed to the top or bottom of the viewport.',
									'sgs-blocks'
								) }
								value={ displayMode }
								options={ DISPLAY_MODE_OPTIONS }
								onChange={ ( val ) => setAttributes( { displayMode: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						{ isAnnouncement && (
							<>
								<ToolsPanelItem
									label={ __( 'Position', 'sgs-blocks' ) }
									hasValue={ () => stickyPosition !== 'top' }
									onDeselect={ () => setAttributes( { stickyPosition: 'top' } ) }
								>
									<SelectControl
										label={ __( 'Position', 'sgs-blocks' ) }
										value={ stickyPosition }
										options={ STICKY_POSITION_OPTIONS }
										onChange={ ( val ) => setAttributes( { stickyPosition: val } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Dismissible', 'sgs-blocks' ) }
									hasValue={ () => dismissible !== false }
									onDeselect={ () => setAttributes( { dismissible: false } ) }
								>
									<ToggleControl
										label={ __( 'Dismissible', 'sgs-blocks' ) }
										help={ __(
											'Shows a close button so visitors can hide the bar.',
											'sgs-blocks'
										) }
										checked={ !! dismissible }
										onChange={ ( val ) => setAttributes( { dismissible: val } ) }
										__nextHasNoMarginBottom
									/>
								</ToolsPanelItem>
								{ dismissible && (
									<ToolsPanelItem
										label={ __( 'Dismiss behaviour', 'sgs-blocks' ) }
										hasValue={ () => dismissBehaviour !== 'session' }
										onDeselect={ () => setAttributes( { dismissBehaviour: 'session' } ) }
									>
										<SelectControl
											label={ __( 'Dismiss behaviour', 'sgs-blocks' ) }
											help={ __(
												'How long the bar stays hidden after the visitor closes it.',
												'sgs-blocks'
											) }
											value={ dismissBehaviour }
											options={ DISMISS_BEHAVIOUR_OPTIONS }
											onChange={ ( val ) =>
												setAttributes( { dismissBehaviour: val } )
											}
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</ToolsPanelItem>
								) }
								<Notice status="info" isDismissible={ false }>
									{ __(
										'Announcement bar is fixed-position on the live site. In the editor it renders inline so you can still edit the content.',
										'sgs-blocks'
									) }
								</Notice>
							</>
						) }
						<ToolsPanelItem
							label={ __( 'Variant', 'sgs-blocks' ) }
							hasValue={ () => variant !== 'info' }
							onDeselect={ () => setAttributes( { variant: 'info' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Variant', 'sgs-blocks' ) }
								help={ __(
									'Sets the colour and a fitting default icon.',
									'sgs-blocks'
								) }
								value={ variant }
								options={ VARIANT_OPTIONS }
								onChange={ ( val ) => setAttributes( { variant: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show icon', 'sgs-blocks' ) }
							hasValue={ () => showIcon !== true }
							onDeselect={ () => setAttributes( { showIcon: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show icon', 'sgs-blocks' ) }
								checked={ !! showIcon }
								onChange={ ( val ) => setAttributes( { showIcon: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ showIcon && (
							<ToolsPanelItem
								label={ __( 'Icon', 'sgs-blocks' ) }
								hasValue={ () =>
									!! iconSource || !! attributes.iconName || !! iconColour
								}
								onDeselect={ () =>
									setAttributes( { iconSource: '', iconName: '', iconColour: '' } )
								}
							>
								<IconPicker
									label={ __( 'Icon (overrides the variant default)', 'sgs-blocks' ) }
									value={ resolved }
									onChange={ ( { source, name } ) =>
										setAttributes( { iconSource: source, iconName: name } )
									}
								/>
								{ ! usingDefault && (
									<ToggleControl
										label={ __( "Use the variant's default icon", 'sgs-blocks' ) }
										checked={ false }
										onChange={ () =>
											setAttributes( { iconSource: '', iconName: '' } )
										}
										help={ __(
											'Reset to the icon that matches the chosen variant.',
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
									/>
								) }
								{ /* Icon colour moved to the top-level SgsColourPanel (D618/D621). */ }
							</ToolsPanelItem>
						) }
					</ToolsPanel>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* NO-INLINE + NO-WRAPPER (2026-07-10): content-KIND, box+width only —
				     dropped SGS_Container_Wrapper (D294) in favour of block-private
				     scoped output (matches sgs/quote). Padding/margin route to the
				     WP-native style.spacing.* object (base) + custom Tablet/Mobile
				     box-object tiers; only shown in inline mode — announcement mode
				     is always full-width + fixed. */ }
				{ ! isAnnouncement && (
					<PanelBody title={ __( 'Wrapper', 'sgs-blocks' ) } initialOpen={ false }>
						<SgsLengthControl
							presets={ false }
							label={ __( 'Outer max-width', 'sgs-blocks' ) }
							value={ maxWidth || '' }
							units={ LENGTH_UNITS }
							onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
							help={ __( 'Exact CSS length, e.g. 800px. Leave blank for no cap.', 'sgs-blocks' ) }
						/>
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
				) }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ noticeBannerContrastAgainst }
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* FR-22-6: the notice text is now an InnerBlocks child (sgs/text).
			     The wrapper div carries the variant class + role="note".
			     In announcement mode we use role="banner" (a landmark, one per page);
			     the editor renders it inline — fixed-position only on the frontend. */ }
			<div { ...blockProps } role={ isAnnouncement ? 'banner' : 'note' }>
				{ showIcon && (
					<span
						className="sgs-notice-banner__icon"
						aria-hidden="true"
						style={ iconColour ? { color: colourVar( iconColour ) } : undefined }
					>
						<IconPreview source={ resolved.source } name={ resolved.name } size={ 20 } gradient={ iconColourGradient } />
					</span>
				) }
				<div { ...innerBlocksProps } />
				{ isAnnouncement && dismissible && (
					<button
						className="sgs-notice-banner__close"
						aria-label={ __( 'Dismiss announcement', 'sgs-blocks' ) }
						type="button"
					>
						{ /* × character — decorative; the aria-label carries the accessible name. */ }
						<span aria-hidden="true">{ '×' }</span>
					</button>
				) }
			</div>
		</>
	);
}
