/**
 * ContainerWrapperControls
 *
 * Reusable InspectorControls component that exposes the canonical sgs/container
 * wrapper attributes as editor panels, scoped by `kind`.
 *
 * WS-4 (composite-mirror): drop this into any composite block's edit.js so its
 * wrapper controls stay in sync with sgs/container without duplicating logic.
 *
 * KIND GATING
 * -----------
 *  section  — full surface: outer maxWidth (literal), contentWidth (token or
 *             literal), gap (responsive), layout (grid/flex), background
 *             (image/video/overlay/svg/animation), shape dividers, min-height,
 *             grid-item defaults, shadow. Breakout (alignwide/alignfull) via
 *             WP-native align toolbar — no custom control needed.
 *  layout   — grid/flex + width (maxWidth/contentWidth) + gap only.
 *  content  — width (maxWidth/contentWidth) + padding/spacing only.
 *
 * IMPORT LINE (adjust relative depth as needed)
 * ---------------------------------------------
 *  import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
 *
 * USAGE
 * -----
 *  <ContainerWrapperControls
 *    attributes={ attributes }
 *    setAttributes={ setAttributes }
 *    kind="section"           // 'section' | 'layout' | 'content'  (default: 'section')
 *  />
 *
 * The component renders inside any existing <>…</> fragment alongside the
 * block's own markup — it does NOT wrap children.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	ToggleControl,
	TextareaControl,
	TextControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalUnitControl as UnitControl,
	TabPanel,
} from '@wordpress/components';
import {
	ResponsiveControl,
	SpacingControl,
	DesignTokenPicker,
} from '../../../components';

// ---------------------------------------------------------------------------
// Shared option arrays — kept identical to container/edit.js
// ---------------------------------------------------------------------------

const BG_SIZE_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
];

const BG_POSITION_OPTIONS = [
	{ label: __( 'Centre centre', 'sgs-blocks' ), value: 'center center' },
	{ label: __( 'Top centre', 'sgs-blocks' ), value: 'top center' },
	{ label: __( 'Bottom centre', 'sgs-blocks' ), value: 'bottom center' },
	{ label: __( 'Centre left', 'sgs-blocks' ), value: 'center left' },
	{ label: __( 'Centre right', 'sgs-blocks' ), value: 'center right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top right' },
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom right' },
];

const BG_REPEAT_OPTIONS = [
	{ label: __( 'No repeat', 'sgs-blocks' ), value: 'no-repeat' },
	{ label: __( 'Repeat', 'sgs-blocks' ), value: 'repeat' },
	{ label: __( 'Repeat X', 'sgs-blocks' ), value: 'repeat-x' },
	{ label: __( 'Repeat Y', 'sgs-blocks' ), value: 'repeat-y' },
];

const BG_ATTACHMENT_OPTIONS = [
	{ label: __( 'Scroll', 'sgs-blocks' ), value: 'scroll' },
	{ label: __( 'Fixed (parallax)', 'sgs-blocks' ), value: 'fixed' },
];

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
	{ label: __( 'Wave (Smooth)', 'sgs-blocks' ), value: 'wave-smooth' },
	{ label: __( 'Triangle', 'sgs-blocks' ), value: 'triangle' },
	{ label: __( 'Triangle (Asymmetric)', 'sgs-blocks' ), value: 'triangle-asymmetric' },
	{ label: __( 'Curve', 'sgs-blocks' ), value: 'curve' },
	{ label: __( 'Curve (Asymmetric)', 'sgs-blocks' ), value: 'curve-asymmetric' },
	{ label: __( 'Zigzag', 'sgs-blocks' ), value: 'zigzag' },
	{ label: __( 'Cloud', 'sgs-blocks' ), value: 'cloud' },
	{ label: __( 'Slant', 'sgs-blocks' ), value: 'slant' },
	{ label: __( 'Slant (Gentle)', 'sgs-blocks' ), value: 'slant-gentle' },
	{ label: __( 'Mountains', 'sgs-blocks' ), value: 'mountains' },
	{ label: __( 'Drops', 'sgs-blocks' ), value: 'drops' },
	{ label: __( 'Tilt', 'sgs-blocks' ), value: 'tilt' },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

const LAYOUT_OPTIONS = [
	{ label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
	{ label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const JUSTIFY_ITEMS_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const ALIGN_CONTENT_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
	{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
];

export const MIN_HEIGHT_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: '' },
	{ label: '50vh', value: '50vh' },
	{ label: '75vh', value: '75vh' },
	{ label: '100vh', value: '100vh' },
	{ label: '200px', value: '200px' },
	{ label: '400px', value: '400px' },
	{ label: '600px', value: '600px' },
];

export const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: 'Small', value: 'sm' },
	{ label: 'Medium', value: 'md' },
	{ label: 'Large', value: 'lg' },
	{ label: 'Glow', value: 'glow' },
];

// ---------------------------------------------------------------------------
// Sub-panels (named functions for reuse across kinds)
// ---------------------------------------------------------------------------

/**
 * Units list for UnitControl inputs (maxWidth / contentWidth custom literal).
 */
const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
	{ value: 'vw', label: 'vw' },
];

/**
 * Content-band token options (v0.5 model).
 *   normal → var(--wp--style--global--content-size) (~1200px on this theme)
 *   wide   → var(--wp--style--global--wide-size) (~1400px on this theme)
 *   full   → no inner cap (default)
 *   custom → reveals a UnitControl for a literal value
 */
const CONTENT_WIDTH_PRESET_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Full (no cap)', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Custom…', 'sgs-blocks' ), value: 'custom' },
];

/**
 * Returns true when the given contentWidth value is a named token rather than
 * a literal CSS length.
 *
 * @param {string} v The contentWidth attribute value.
 * @returns {boolean}
 */
function isToken( v ) {
	return [ 'normal', 'wide', 'full' ].includes( v );
}

/**
 * Derive the preset selector value from a raw contentWidth attribute value.
 * Returns 'normal' | 'wide' | 'full' when value is a token, or 'custom'
 * when value is a literal CSS length (contains at least one digit).
 *
 * @param {string} v
 * @returns {string}
 */
function contentWidthPreset( v ) {
	if ( isToken( v ) ) {
		return v;
	}
	// A non-token non-empty value is a literal (e.g. "800px") → custom.
	if ( v && /\d/.test( v ) ) {
		return 'custom';
	}
	// Empty / unrecognised → treat as full (no band cap).
	return 'full';
}

/**
 * Width + contentWidth controls (v0.5 model — widthMode retired).
 *
 * OUTER layer: maxWidth UnitControl (literal CSS length or empty → full-width).
 *   Responsive: maxWidthTablet / maxWidthMobile via ResponsiveControl.
 *
 * CONTENT BAND: ToggleGroupControl with tokens normal / wide / full / custom.
 *   Default is 'full' (no band cap — content fills outer maxWidth).
 *   When custom is selected a UnitControl for the literal value is revealed.
 *   Responsive: contentWidthTablet / contentWidthMobile (same pattern).
 *
 * Breakout (alignwide / alignfull) is handled by WP-native supports.align
 * toolbar — NO custom control is rendered here.
 *
 * Used by all three kinds.
 */
export function WidthPanel( { attributes, setAttributes } ) {
	const {
		maxWidth = '',
		maxWidthTablet = '',
		maxWidthMobile = '',
		contentWidth = 'full',
		contentWidthTablet = '',
		contentWidthMobile = '',
	} = attributes;

	const cwPreset = contentWidthPreset( contentWidth );
	const cwLiteral = ! isToken( contentWidth ) && /\d/.test( contentWidth ) ? contentWidth : '';

	const cwTabletPreset = contentWidthPreset( contentWidthTablet );
	const cwTabletLiteral = ! isToken( contentWidthTablet ) && /\d/.test( contentWidthTablet ) ? contentWidthTablet : '';

	const cwMobilePreset = contentWidthPreset( contentWidthMobile );
	const cwMobileLiteral = ! isToken( contentWidthMobile ) && /\d/.test( contentWidthMobile ) ? contentWidthMobile : '';

	return (
		<>
			{ /* ---- OUTER max-width ---- */ }
			<UnitControl
				label={ __( 'Outer max-width', 'sgs-blocks' ) }
				value={ maxWidth || '' }
				units={ LENGTH_UNITS }
				onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
				help={ __( 'Exact CSS length applied as max-width on the outer block (e.g. 800px). Leave blank for no cap. Breakout (wide / full) is set via the block toolbar.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<ResponsiveControl label={ __( 'Outer max-width by viewport', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								{ __( 'Desktop max-width is set above.', 'sgs-blocks' ) }
							</p>
						);
					}
					const attrMap = {
						tablet: 'maxWidthTablet',
						mobile: 'maxWidthMobile',
					};
					return (
						<UnitControl
							value={ attributes[ attrMap[ breakpoint ] ] || '' }
							units={ LENGTH_UNITS }
							onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val ?? '' } ) }
							help={ __( 'Override outer max-width at this viewport. Leave blank to inherit desktop.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					);
				} }
			</ResponsiveControl>

			<hr style={ { margin: '16px 0' } } />

			{ /* ---- CONTENT BAND width ---- */ }
			<ToggleGroupControl
				label={ __( 'Content band width', 'sgs-blocks' ) }
				value={ cwPreset }
				onChange={ ( val ) => {
					if ( val === 'custom' ) {
						// Keep existing literal if already set, otherwise seed empty so UnitControl appears.
						setAttributes( { contentWidth: cwLiteral || '' } );
					} else {
						setAttributes( { contentWidth: val } );
					}
				} }
				isBlock
				__nextHasNoMarginBottom
			>
				{ CONTENT_WIDTH_PRESET_OPTIONS.map( ( opt ) => (
					<ToggleGroupControlOption
						key={ opt.value }
						value={ opt.value }
						label={ opt.label }
					/>
				) ) }
			</ToggleGroupControl>
			<p className="components-base-control__help">
				{ __( 'Caps the inner content band. Normal ≈ 1200px (content-size), Wide ≈ 1400px (wide-size), Full = no cap (default).', 'sgs-blocks' ) }
			</p>
			{ cwPreset === 'custom' && (
				<UnitControl
					label={ __( 'Custom content band width', 'sgs-blocks' ) }
					value={ cwLiteral }
					units={ LENGTH_UNITS }
					onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
					help={ __( 'Exact CSS length, e.g. 900px or 60rem.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			) }

			<ResponsiveControl label={ __( 'Content band width by viewport', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								{ __( 'Desktop content band width is set above.', 'sgs-blocks' ) }
							</p>
						);
					}
					const attrMap = {
						tablet: { preset: cwTabletPreset, literal: cwTabletLiteral, attr: 'contentWidthTablet' },
						mobile: { preset: cwMobilePreset, literal: cwMobileLiteral, attr: 'contentWidthMobile' },
					};
					const { preset, literal, attr } = attrMap[ breakpoint ];
					return (
						<>
							<ToggleGroupControl
								value={ preset }
								onChange={ ( val ) => {
									if ( val === 'custom' ) {
										setAttributes( { [ attr ]: literal || '' } );
									} else {
										setAttributes( { [ attr ]: val } );
									}
								} }
								isBlock
								__nextHasNoMarginBottom
							>
								{ CONTENT_WIDTH_PRESET_OPTIONS.map( ( opt ) => (
									<ToggleGroupControlOption
										key={ opt.value }
										value={ opt.value }
										label={ opt.label }
									/>
								) ) }
							</ToggleGroupControl>
							{ preset === 'custom' && (
								<UnitControl
									value={ literal }
									units={ LENGTH_UNITS }
									onChange={ ( val ) => setAttributes( { [ attr ]: val ?? '' } ) }
									help={ __( 'Exact CSS length for this viewport.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
							) }
						</>
					);
				} }
			</ResponsiveControl>
		</>
	);
}

/**
 * Gap (responsive) + layout type + columns (grid) + vertical alignment.
 * Used by section and layout kinds.
 */
export function LayoutPanel( { attributes, setAttributes } ) {
	const {
		layout = 'stack',
		verticalAlign = 'start',
		columns = 2,
		justifyItems = 'stretch',
		alignContent = 'stretch',
		gridTemplateColumns = '',
		gridTemplateColumnsTablet = '',
		gridTemplateColumnsMobile = '',
		gridTemplateRows = '',
		gridTemplateRowsTablet = '',
		gridTemplateRowsMobile = '',
		gridAutoRows = '',
	} = attributes;

	return (
		<>
			<SelectControl
				label={ __( 'Layout type', 'sgs-blocks' ) }
				value={ layout }
				options={ LAYOUT_OPTIONS }
				onChange={ ( val ) => setAttributes( { layout: val } ) }
				__nextHasNoMarginBottom
			/>

			{ layout === 'grid' && (
				<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
					{ ( breakpoint ) => {
						const attrMap = {
							desktop: 'columns',
							tablet: 'columnsTablet',
							mobile: 'columnsMobile',
						};
						const attr = attrMap[ breakpoint ];
						return (
							<RangeControl
								value={ attributes[ attr ] ?? ( breakpoint === 'desktop' ? 2 : ( breakpoint === 'tablet' ? 2 : 1 ) ) }
								onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
								min={ 1 }
								max={ breakpoint === 'mobile' ? 3 : 6 }
								__nextHasNoMarginBottom
							/>
						);
					} }
				</ResponsiveControl>
			) }

			<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					const attrMap = {
						desktop: 'gap',
						tablet: 'gapTablet',
						mobile: 'gapMobile',
					};
					const attr = attrMap[ breakpoint ];
					return (
						<SpacingControl
							freeInput
							value={ attributes[ attr ] || '' }
							onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
						/>
					);
				} }
			</ResponsiveControl>

			{ ( layout === 'flex' || layout === 'grid' ) && (
				<SelectControl
					label={ __( 'Vertical alignment', 'sgs-blocks' ) }
					value={ verticalAlign }
					options={ ALIGN_OPTIONS }
					onChange={ ( val ) => setAttributes( { verticalAlign: val } ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ layout === 'flex' && (
				<>
					<SelectControl
						label={ __( 'Flex direction', 'sgs-blocks' ) }
						value={ attributes.flexDirection || '' }
						options={ [
							{ label: __( '— default (row) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
							{ label: __( 'Row reverse', 'sgs-blocks' ), value: 'row-reverse' },
							{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
							{ label: __( 'Column reverse', 'sgs-blocks' ), value: 'column-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexDirection: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Flex wrap', 'sgs-blocks' ) }
						value={ attributes.flexWrap || '' }
						options={ [
							{ label: __( '— default (wrap) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
							{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
							{ label: __( 'Wrap reverse', 'sgs-blocks' ), value: 'wrap-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Justify content', 'sgs-blocks' ) }
						value={ attributes.justifyContent || '' }
						options={ [
							{ label: __( '— default —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
							{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
							{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
							{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
							{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
							{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
						] }
						onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			{ layout === 'grid' && (
				<>
					<hr style={ { margin: '16px 0' } } />
					<p
						className="components-base-control__label"
						style={ { fontWeight: 600, marginBottom: '8px' } }
					>
						{ __( 'Advanced grid layout', 'sgs-blocks' ) }
					</p>

					<ResponsiveControl label={ __( 'Custom column template', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'gridTemplateColumns',
								tablet: 'gridTemplateColumnsTablet',
								mobile: 'gridTemplateColumnsMobile',
							};
							const attr = attrMap[ breakpoint ];
							return (
								<TextControl
									value={ attributes[ attr ] || '' }
									onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
									help={
										breakpoint === 'desktop'
											? __(
												"CSS grid-template-columns e.g. '5fr 3fr' or 'repeat(3,minmax(0,1fr))'. Leave empty to use the column count above.",
												'sgs-blocks'
											)
											: __(
												"CSS grid-template-columns for this breakpoint. Leave empty to inherit the desktop template above — or the column count, if no desktop template is set.",
												'sgs-blocks'
											)
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					<ResponsiveControl label={ __( 'Row template', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'gridTemplateRows',
								tablet: 'gridTemplateRowsTablet',
								mobile: 'gridTemplateRowsMobile',
							};
							const attr = attrMap[ breakpoint ];
							return (
								<TextControl
									value={ attributes[ attr ] || '' }
									onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
									help={ __(
										"CSS grid-template-rows e.g. 'auto 1fr'. Leave empty for browser default.",
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					<TextControl
						label={ __( 'Auto rows', 'sgs-blocks' ) }
						value={ gridAutoRows }
						onChange={ ( val ) => setAttributes( { gridAutoRows: val } ) }
						help={ __(
							"Sets grid-auto-rows e.g. '1fr' for equal-height rows or 'minmax(100px,auto)'.",
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'Justify items', 'sgs-blocks' ) }
						value={ justifyItems }
						options={ JUSTIFY_ITEMS_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyItems: val } ) }
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'Align content', 'sgs-blocks' ) }
						value={ alignContent }
						options={ ALIGN_CONTENT_OPTIONS }
						onChange={ ( val ) => setAttributes( { alignContent: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</>
	);
}

/**
 * Background panel (image/video/overlay/svg/animation tabs).
 * Section kind only.
 */
export function BackgroundPanel( { attributes, setAttributes } ) {
	const {
		backgroundImage,
		backgroundImageTablet,
		backgroundImageMobile,
		backgroundSize = 'cover',
		backgroundPosition = 'center center',
		backgroundRepeat = 'no-repeat',
		backgroundAttachment = 'scroll',
		backgroundOverlayColour,
		backgroundOverlayOpacity = 50,
		overlayGradient = false,
		overlayGradientAngle = 180,
		overlayGradientFrom = '',
		overlayGradientTo = '',
		bgVideo,
		bgVideoMobile,
		bgParallax = false,
		bgKenBurns = false,
		bgAnimationDuration = 20,
		bgSvgContent = '',
		bgSvgPosition = 'background',
		bgSvgAnimation = 'none',
		bgSvgAnimationSpeed = 'medium',
		bgSvgOpacity = 100,
		bgSvgTextShadow = false,
	} = attributes;

	const hasBgImage = !! backgroundImage?.url;

	return (
		<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
			<TabPanel
				tabs={ [
					{ name: 'image', title: __( 'Image', 'sgs-blocks' ) },
					{ name: 'video', title: __( 'Video', 'sgs-blocks' ) },
					{ name: 'animation', title: __( 'Animation', 'sgs-blocks' ) },
					{ name: 'overlay', title: __( 'Overlay', 'sgs-blocks' ) },
					{ name: 'svg', title: __( 'SVG', 'sgs-blocks' ) },
				] }
			>
				{ ( tab ) => {
					// ---- Image tab ----
					if ( tab.name === 'image' ) {
						return (
							<>
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Desktop image', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( { backgroundImage: { id: media.id, url: media.url, alt: media.alt } } )
										}
										allowedTypes={ [ 'image' ] }
										value={ backgroundImage?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ backgroundImage?.url ? (
													<>
														<img src={ backgroundImage.url } alt="" style={ { maxWidth: '100%', marginBottom: '8px' } } />
														<Button variant="secondary" onClick={ () => setAttributes( { backgroundImage: undefined } ) } isDestructive>
															{ __( 'Remove image', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select image', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px', marginTop: '8px' } }>
									{ __( 'Tablet image (optional)', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( { backgroundImageTablet: { id: media.id, url: media.url, alt: media.alt } } )
										}
										allowedTypes={ [ 'image' ] }
										value={ backgroundImageTablet?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ backgroundImageTablet?.url ? (
													<Button variant="secondary" onClick={ () => setAttributes( { backgroundImageTablet: undefined } ) } isDestructive>
														{ __( 'Remove tablet image', 'sgs-blocks' ) }
													</Button>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select tablet image', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px', marginTop: '8px' } }>
									{ __( 'Mobile image (optional)', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( { backgroundImageMobile: { id: media.id, url: media.url, alt: media.alt } } )
										}
										allowedTypes={ [ 'image' ] }
										value={ backgroundImageMobile?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ backgroundImageMobile?.url ? (
													<Button variant="secondary" onClick={ () => setAttributes( { backgroundImageMobile: undefined } ) } isDestructive>
														{ __( 'Remove mobile image', 'sgs-blocks' ) }
													</Button>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select mobile image', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								{ hasBgImage && (
									<>
										<SelectControl
											label={ __( 'Size', 'sgs-blocks' ) }
											value={ backgroundSize }
											options={ BG_SIZE_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundSize: val } ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ backgroundPosition }
											options={ BG_POSITION_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundPosition: val } ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Repeat', 'sgs-blocks' ) }
											value={ backgroundRepeat }
											options={ BG_REPEAT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundRepeat: val } ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Attachment', 'sgs-blocks' ) }
											value={ backgroundAttachment }
											options={ BG_ATTACHMENT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundAttachment: val } ) }
											__nextHasNoMarginBottom
										/>
									</>
								) }
							</>
						);
					}

					// ---- Video tab ----
					if ( tab.name === 'video' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Video replaces the background image. Add an image as fallback for browsers that block autoplay.', 'sgs-blocks' ) }
								</p>
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Desktop video', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) => setAttributes( { bgVideo: { id: media.id, url: media.url } } ) }
										allowedTypes={ [ 'video' ] }
										value={ bgVideo?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ bgVideo?.url ? (
													<>
														<p style={ { fontSize: '12px', marginBottom: '4px' } }>{ bgVideo.url.split( '/' ).pop() }</p>
														<Button variant="secondary" onClick={ () => setAttributes( { bgVideo: undefined } ) } isDestructive>
															{ __( 'Remove video', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select video', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px', marginTop: '8px' } }>
									{ __( 'Mobile video (optional)', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) => setAttributes( { bgVideoMobile: { id: media.id, url: media.url } } ) }
										allowedTypes={ [ 'video' ] }
										value={ bgVideoMobile?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ bgVideoMobile?.url ? (
													<Button variant="secondary" onClick={ () => setAttributes( { bgVideoMobile: undefined } ) } isDestructive>
														{ __( 'Remove mobile video', 'sgs-blocks' ) }
													</Button>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select mobile video', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>
							</>
						);
					}

					// ---- Animation tab ----
					if ( tab.name === 'animation' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Requires a background image. Ken-burns and parallax are mutually exclusive — ken-burns takes priority.', 'sgs-blocks' ) }
								</p>
								<ToggleControl
									label={ __( 'Ken-burns zoom', 'sgs-blocks' ) }
									help={ __( 'Slow zoom animation on the background image.', 'sgs-blocks' ) }
									checked={ bgKenBurns }
									onChange={ ( val ) =>
										setAttributes( { bgKenBurns: val, bgParallax: val ? false : bgParallax } )
									}
									__nextHasNoMarginBottom
								/>
								<ToggleControl
									label={ __( 'Parallax scroll', 'sgs-blocks' ) }
									help={ __( 'Fixed background-attachment parallax effect. Disabled on touch devices.', 'sgs-blocks' ) }
									checked={ bgParallax }
									onChange={ ( val ) =>
										setAttributes( { bgParallax: val, bgKenBurns: val ? false : bgKenBurns } )
									}
									__nextHasNoMarginBottom
								/>
								{ bgKenBurns && (
									<RangeControl
										label={ __( 'Animation duration (seconds)', 'sgs-blocks' ) }
										value={ bgAnimationDuration }
										onChange={ ( val ) => setAttributes( { bgAnimationDuration: val } ) }
										min={ 5 }
										max={ 60 }
										step={ 1 }
										__nextHasNoMarginBottom
									/>
								) }
							</>
						);
					}

					// ---- Overlay tab ----
					if ( tab.name === 'overlay' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Overlay sits on top of the background image or video.', 'sgs-blocks' ) }
								</p>
								<ToggleControl
									label={ __( 'Gradient overlay', 'sgs-blocks' ) }
									checked={ overlayGradient }
									onChange={ ( val ) => setAttributes( { overlayGradient: val } ) }
									__nextHasNoMarginBottom
								/>
								{ overlayGradient ? (
									<>
										<RangeControl
											label={ __( 'Angle (degrees)', 'sgs-blocks' ) }
											value={ overlayGradientAngle }
											onChange={ ( val ) => setAttributes( { overlayGradientAngle: val } ) }
											min={ 0 }
											max={ 360 }
											__nextHasNoMarginBottom
										/>
										<DesignTokenPicker
											label={ __( 'Gradient from', 'sgs-blocks' ) }
											value={ overlayGradientFrom }
											onChange={ ( val ) => setAttributes( { overlayGradientFrom: val } ) }
										/>
										<DesignTokenPicker
											label={ __( 'Gradient to (leave empty for transparent)', 'sgs-blocks' ) }
											value={ overlayGradientTo }
											onChange={ ( val ) => setAttributes( { overlayGradientTo: val } ) }
										/>
									</>
								) : (
									<DesignTokenPicker
										label={ __( 'Overlay colour', 'sgs-blocks' ) }
										value={ backgroundOverlayColour }
										onChange={ ( val ) => setAttributes( { backgroundOverlayColour: val } ) }
									/>
								) }
								<RangeControl
									label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
									value={ backgroundOverlayOpacity }
									onChange={ ( val ) => setAttributes( { backgroundOverlayOpacity: val } ) }
									min={ 0 }
									max={ 100 }
									__nextHasNoMarginBottom
								/>
							</>
						);
					}

					// ---- SVG tab ----
					if ( tab.name === 'svg' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Paste SVG markup to render it as an animated background or foreground layer. Animations use pure CSS — no JavaScript required.', 'sgs-blocks' ) }
								</p>
								<TextareaControl
									label={ __( 'SVG code', 'sgs-blocks' ) }
									value={ bgSvgContent }
									onChange={ ( val ) => setAttributes( { bgSvgContent: val } ) }
									help={ __( 'Paste your <svg>…</svg> markup here.', 'sgs-blocks' ) }
									rows={ 8 }
								/>
								{ bgSvgContent && (
									<>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ bgSvgPosition }
											options={ [
												{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
												{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgPosition: val } ) }
											__nextHasNoMarginBottom
										/>
										<RangeControl
											label={ __( 'Opacity (%)', 'sgs-blocks' ) }
											value={ bgSvgOpacity }
											onChange={ ( val ) => setAttributes( { bgSvgOpacity: val } ) }
											min={ 0 }
											max={ 100 }
											step={ 5 }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Animation', 'sgs-blocks' ) }
											value={ bgSvgAnimation }
											options={ [
												{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
												{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
												{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
												{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgAnimation: val } ) }
											__nextHasNoMarginBottom
										/>
										{ bgSvgAnimation !== 'none' && (
											<SelectControl
												label={ __( 'Animation speed', 'sgs-blocks' ) }
												value={ bgSvgAnimationSpeed }
												options={ [
													{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
													{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
													{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
												] }
												onChange={ ( val ) => setAttributes( { bgSvgAnimationSpeed: val } ) }
												__nextHasNoMarginBottom
											/>
										) }
										<ToggleControl
											label={ __( 'Text shadow', 'sgs-blocks' ) }
											help={ __( 'Adds a subtle shadow to inner text for readability over busy SVG layers.', 'sgs-blocks' ) }
											checked={ bgSvgTextShadow }
											onChange={ ( val ) => setAttributes( { bgSvgTextShadow: val } ) }
											__nextHasNoMarginBottom
										/>
									</>
								) }
							</>
						);
					}

					return null;
				} }
			</TabPanel>
		</PanelBody>
	);
}

/**
 * Shape dividers panel (top + bottom).
 * Section kind only.
 */
export function ShapeDividersPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Shape Dividers', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Top Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerTop || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerTop: val } ) }
				__nextHasNoMarginBottom
			/>
			{ attributes.shapeDividerTop && (
				<>
					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTopColour }
						onChange={ ( val ) => setAttributes( { shapeDividerTopColour: val } ) }
					/>
					<RangeControl
						label={ __( 'Height (px)', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTopHeight }
						onChange={ ( val ) => setAttributes( { shapeDividerTopHeight: val } ) }
						min={ 20 }
						max={ 300 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerTopFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerTopInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			<hr style={ { margin: '16px 0' } } />

			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Bottom Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerBottom || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerBottom: val } ) }
				__nextHasNoMarginBottom
			/>
			{ attributes.shapeDividerBottom && (
				<>
					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottomColour }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomColour: val } ) }
					/>
					<RangeControl
						label={ __( 'Height (px)', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottomHeight }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomHeight: val } ) }
						min={ 20 }
						max={ 300 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * Grid item defaults panel.
 * Section kind only (grid layout).
 */
export function GridItemDefaultsPanel( { attributes, setAttributes } ) {
	const {
		layout = 'stack',
		gridItemPadding = '',
		gridItemBackground = '',
		gridItemBorderRadius = '',
		gridItemBorder = '',
		gridItemShadow = '',
		gridItemTextColour = '',
	} = attributes;

	if ( layout !== 'grid' ) {
		return null;
	}

	return (
		<PanelBody title={ __( 'Grid item defaults', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'Values set here become CSS custom properties (--sgs-gi-*) inherited by direct child containers in the grid. Per-child overrides still win via specificity.',
					'sgs-blocks'
				) }
			</p>
			<SpacingControl
				freeInput
				label={ __( 'Padding', 'sgs-blocks' ) }
				value={ gridItemPadding }
				onChange={ ( val ) => setAttributes( { gridItemPadding: val } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Background colour', 'sgs-blocks' ) }
				value={ gridItemBackground }
				onChange={ ( val ) => setAttributes( { gridItemBackground: val } ) }
			/>
			<TextControl
				label={ __( 'Border radius', 'sgs-blocks' ) }
				value={ gridItemBorderRadius }
				onChange={ ( val ) => setAttributes( { gridItemBorderRadius: val } ) }
				help={ __( "CSS border-radius e.g. '8px' or '50%'.", 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Border', 'sgs-blocks' ) }
				value={ gridItemBorder }
				onChange={ ( val ) => setAttributes( { gridItemBorder: val } ) }
				help={ __( "CSS border shorthand e.g. '1px solid #ccc'.", 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Shadow', 'sgs-blocks' ) }
				value={ gridItemShadow }
				options={ SHADOW_OPTIONS }
				onChange={ ( val ) => setAttributes( { gridItemShadow: val } ) }
				__nextHasNoMarginBottom
			/>
			<DesignTokenPicker
				label={ __( 'Text colour', 'sgs-blocks' ) }
				value={ gridItemTextColour }
				onChange={ ( val ) => setAttributes( { gridItemTextColour: val } ) }
			/>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// Responsive spacing panel — exported for use in container/edit.js too.
// ---------------------------------------------------------------------------

/**
 * ResponsiveSpacingPanel
 *
 * Exposes tablet and mobile overrides for padding (4 sides) and margin
 * (4 sides) via a ResponsiveControl device-icon switcher.
 *
 * BASE (desktop) padding/margin are set by WP-native `supports.spacing`
 * (the Dimensions panel). The desktop tier of each switcher therefore
 * renders a short help note only — never duplicate desktop controls.
 *
 * Applies to ALL three wrapper kinds (section / layout / content):
 * class-sgs-container-wrapper.php processes these attrs on every kind.
 *
 * Attr → control mapping:
 *   paddingTopTablet    → Padding › Tablet › Top
 *   paddingRightTablet  → Padding › Tablet › Right
 *   paddingBottomTablet → Padding › Tablet › Bottom
 *   paddingLeftTablet   → Padding › Tablet › Left
 *   paddingTopMobile    → Padding › Mobile › Top
 *   paddingRightMobile  → Padding › Mobile › Right
 *   paddingBottomMobile → Padding › Mobile › Bottom
 *   paddingLeftMobile   → Padding › Mobile › Left
 *   marginTopTablet     → Margin › Tablet › Top
 *   marginRightTablet   → Margin › Tablet › Right
 *   marginBottomTablet  → Margin › Tablet › Bottom
 *   marginLeftTablet    → Margin › Tablet › Left
 *   marginTopMobile     → Margin › Mobile › Top
 *   marginRightMobile   → Margin › Mobile › Right
 *   marginBottomMobile  → Margin › Mobile › Bottom
 *   marginLeftMobile    → Margin › Mobile › Left
 */
export function ResponsiveSpacingPanel( { attributes, setAttributes } ) {
	const PADDING_SIDES = [
		{ label: __( 'Top', 'sgs-blocks' ), tablet: 'paddingTopTablet', mobile: 'paddingTopMobile' },
		{ label: __( 'Right', 'sgs-blocks' ), tablet: 'paddingRightTablet', mobile: 'paddingRightMobile' },
		{ label: __( 'Bottom', 'sgs-blocks' ), tablet: 'paddingBottomTablet', mobile: 'paddingBottomMobile' },
		{ label: __( 'Left', 'sgs-blocks' ), tablet: 'paddingLeftTablet', mobile: 'paddingLeftMobile' },
	];

	const MARGIN_SIDES = [
		{ label: __( 'Top', 'sgs-blocks' ), tablet: 'marginTopTablet', mobile: 'marginTopMobile' },
		{ label: __( 'Right', 'sgs-blocks' ), tablet: 'marginRightTablet', mobile: 'marginRightMobile' },
		{ label: __( 'Bottom', 'sgs-blocks' ), tablet: 'marginBottomTablet', mobile: 'marginBottomMobile' },
		{ label: __( 'Left', 'sgs-blocks' ), tablet: 'marginLeftTablet', mobile: 'marginLeftMobile' },
	];

	return (
		<PanelBody title={ __( 'Responsive spacing', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __( 'Override padding and margin at tablet and mobile breakpoints. Desktop values are set in the Dimensions panel above.', 'sgs-blocks' ) }
			</p>

			<ResponsiveControl label={ __( 'Padding', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								{ __( 'Desktop padding & margin are set in the Dimensions panel above.', 'sgs-blocks' ) }
							</p>
						);
					}
					return (
						<>
							{ PADDING_SIDES.map( ( side ) => (
								<SpacingControl
									key={ side[ breakpoint ] }
									freeInput
									label={ side.label }
									value={ attributes[ side[ breakpoint ] ] || '' }
									onChange={ ( val ) => setAttributes( { [ side[ breakpoint ] ]: val } ) }
								/>
							) ) }
						</>
					);
				} }
			</ResponsiveControl>

			<ResponsiveControl label={ __( 'Margin', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								{ __( 'Desktop padding & margin are set in the Dimensions panel above.', 'sgs-blocks' ) }
							</p>
						);
					}
					return (
						<>
							{ MARGIN_SIDES.map( ( side ) => (
								<SpacingControl
									key={ side[ breakpoint ] }
									freeInput
									label={ side.label }
									value={ attributes[ side[ breakpoint ] ] || '' }
									onChange={ ( val ) => setAttributes( { [ side[ breakpoint ] ]: val } ) }
								/>
							) ) }
						</>
					);
				} }
			</ResponsiveControl>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// Content band panel — exported for use in container/edit.js too.
// ---------------------------------------------------------------------------

/**
 * ContentBandPanel
 *
 * Controls for the Layer-2 content band (__inner wrapper) — background colour,
 * base padding (4 sides, desktop), and responsive padding overrides (tablet /
 * mobile). Band width (contentWidth / contentWidthTablet / contentWidthMobile)
 * is owned by WidthPanel — not duplicated here.
 *
 * Gating: section + layout kinds only — these are the only kinds whose PHP
 * render path can emit the __inner wrapper. The 'content' kind uses WP-native
 * padding controls directly; it has no __inner layer.
 *
 * Attr → control mapping:
 *   contentBandBackground         → Background colour (DesignTokenPicker)
 *   contentBandPaddingTop         → Padding › Desktop › Top
 *   contentBandPaddingRight       → Padding › Desktop › Right
 *   contentBandPaddingBottom      → Padding › Desktop › Bottom
 *   contentBandPaddingLeft        → Padding › Desktop › Left
 *   contentBandPaddingTopTablet   → Padding › Tablet › Top
 *   contentBandPaddingRightTablet → Padding › Tablet › Right
 *   ...etc.
 *   (contentWidthTablet / Mobile → owned by WidthPanel, not rendered here)
 */
export function ContentBandPanel( { attributes, setAttributes } ) {
	const BAND_PADDING_SIDES = [
		{ label: __( 'Top', 'sgs-blocks' ), desktop: 'contentBandPaddingTop', tablet: 'contentBandPaddingTopTablet', mobile: 'contentBandPaddingTopMobile' },
		{ label: __( 'Right', 'sgs-blocks' ), desktop: 'contentBandPaddingRight', tablet: 'contentBandPaddingRightTablet', mobile: 'contentBandPaddingRightMobile' },
		{ label: __( 'Bottom', 'sgs-blocks' ), desktop: 'contentBandPaddingBottom', tablet: 'contentBandPaddingBottomTablet', mobile: 'contentBandPaddingBottomMobile' },
		{ label: __( 'Left', 'sgs-blocks' ), desktop: 'contentBandPaddingLeft', tablet: 'contentBandPaddingLeftTablet', mobile: 'contentBandPaddingLeftMobile' },
	];

	return (
		<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __( 'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
			</p>

			<DesignTokenPicker
				label={ __( 'Band background colour', 'sgs-blocks' ) }
				value={ attributes.contentBandBackground || '' }
				onChange={ ( val ) => setAttributes( { contentBandBackground: val } ) }
			/>

			<ResponsiveControl label={ __( 'Band padding', 'sgs-blocks' ) }>
				{ ( breakpoint ) => (
					<>
						{ BAND_PADDING_SIDES.map( ( side ) => (
							<SpacingControl
								key={ side[ breakpoint ] }
								freeInput
								label={ side.label }
								value={ attributes[ side[ breakpoint ] ] || '' }
								onChange={ ( val ) => setAttributes( { [ side[ breakpoint ] ]: val } ) }
							/>
						) ) }
					</>
				) }
			</ResponsiveControl>

		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// Per-area panel (Grid areas — decision 5)
// ---------------------------------------------------------------------------

/**
 * GridAreaPanel
 *
 * Renders per-area styling controls for one named grid area declared in
 * `supports.sgs.gridAreas`. Generic — derives all attr names from `areaName`
 * at runtime; zero block-specific code here.
 *
 * Attr naming convention (matches hero's existing contentPadding* family):
 *   <areaName>PaddingTop / Right / Bottom / Left
 *   <areaName>PaddingTopTablet / RightTablet / BottomTablet / LeftTablet
 *   <areaName>PaddingTopMobile / RightMobile / BottomMobile / LeftMobile
 *   <areaName>PaddingUnit
 *   <areaName>Background
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @param {string}   props.areaName      e.g. 'content' | 'media'.
 * @param {string}   props.label         Human-readable area label for panel title.
 */
export function GridAreaPanel( { attributes, setAttributes, areaName, label } ) {
	// Capitalise first letter of areaName for the compound key (e.g. 'content' → 'Content').
	const cap = areaName.charAt( 0 ).toUpperCase() + areaName.slice( 1 );

	const SIDES = [
		{ label: __( 'Top', 'sgs-blocks' ), desktop: `${ areaName }PaddingTop`, tablet: `${ areaName }PaddingTopTablet`, mobile: `${ areaName }PaddingTopMobile` },
		{ label: __( 'Right', 'sgs-blocks' ), desktop: `${ areaName }PaddingRight`, tablet: `${ areaName }PaddingRightTablet`, mobile: `${ areaName }PaddingRightMobile` },
		{ label: __( 'Bottom', 'sgs-blocks' ), desktop: `${ areaName }PaddingBottom`, tablet: `${ areaName }PaddingBottomTablet`, mobile: `${ areaName }PaddingBottomMobile` },
		{ label: __( 'Left', 'sgs-blocks' ), desktop: `${ areaName }PaddingLeft`, tablet: `${ areaName }PaddingLeftTablet`, mobile: `${ areaName }PaddingLeftMobile` },
	];

	const unitAttr = `${ areaName }PaddingUnit`;
	const bgAttr = `${ areaName }Background`;
	const currentUnit = attributes[ unitAttr ] || 'px';

	// The area padding attrs are NUMBERS with one shared <area>PaddingUnit
	// companion (the hero family shape). The SpacingControl shows the combined
	// '24px' string; on change the number goes to the side attr and the unit
	// to the shared companion (same composition pattern as TypographyControls).
	const parseAreaValue = ( raw ) => {
		const str = String( raw ?? '' ).trim();
		if ( '' === str ) {
			return { num: null, unit: currentUnit };
		}
		const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
		if ( ! match ) {
			return { num: null, unit: currentUnit };
		}
		return {
			num: parseFloat( match[ 1 ] ),
			unit: match[ 2 ] || currentUnit,
		};
	};

	return (
		<PanelBody title={ label || sprintf( __( '%s area', 'sgs-blocks' ), cap ) } initialOpen={ false }>
			<DesignTokenPicker
				label={ __( 'Background colour', 'sgs-blocks' ) }
				value={ attributes[ bgAttr ] || '' }
				onChange={ ( val ) => setAttributes( { [ bgAttr ]: val } ) }
			/>

			<ResponsiveControl label={ __( 'Padding', 'sgs-blocks' ) }>
				{ ( breakpoint ) => (
					<>
						{ SIDES.map( ( side ) => (
							<SpacingControl
								key={ side[ breakpoint ] }
								freeInput
								label={ side.label }
								value={ attributes[ side[ breakpoint ] ] != null ? String( attributes[ side[ breakpoint ] ] ) + currentUnit : '' }
								onChange={ ( val ) => {
									const { num, unit } = parseAreaValue( val );
									setAttributes( {
										[ side[ breakpoint ] ]: num,
										[ unitAttr ]: unit,
									} );
								} }
							/>
						) ) }
					</>
				) }
			</ResponsiveControl>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// KIND → CONTROLS map
// ---------------------------------------------------------------------------
//
// Defines which sub-panels render for each kind value.
// Entries are render functions that receive ({ attributes, setAttributes, gridAreas }).
//
const KIND_PANELS = {
	section: [
		// 1. Section (outer) — layout type, columns, gap, width, min-height, contentWidth.
		( props ) => (
			<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
				<SelectControl
					label={ __( 'Min height', 'sgs-blocks' ) }
					value={ props.attributes.minHeight || '' }
					options={ MIN_HEIGHT_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { minHeight: val } ) }
					help={ __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Min height (tablet)', 'sgs-blocks' ) }
					value={ props.attributes.minHeightTablet || '' }
					options={ MIN_HEIGHT_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { minHeightTablet: val } ) }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Min height (mobile)', 'sgs-blocks' ) }
					value={ props.attributes.minHeightMobile || '' }
					options={ MIN_HEIGHT_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { minHeightMobile: val } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		),
		// 2. Inner band (content band).
		( props ) => <ContentBandPanel { ...props } />,
		// 3. Responsive spacing (outer padding / margin overrides).
		( props ) => <ResponsiveSpacingPanel { ...props } />,
		// 4. Layout.
		( props ) => (
			<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
				<LayoutPanel { ...props } />
			</PanelBody>
		),
		// 5. Grid items — uniform defaults then one per-area panel per declared area.
		( props ) => (
			<>
				<GridItemDefaultsPanel { ...props } />
				{ Array.isArray( props.gridAreas ) && props.gridAreas.map( ( area ) => (
					<GridAreaPanel
						key={ area }
						attributes={ props.attributes }
						setAttributes={ props.setAttributes }
						areaName={ area }
						label={ `${ area.charAt( 0 ).toUpperCase() + area.slice( 1 ) } ${ __( 'area', 'sgs-blocks' ) }` }
					/>
				) ) }
			</>
		),
		// 6. Background.
		( props ) => <BackgroundPanel { ...props } />,
		// 7. Shadow.
		( props ) => (
			<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Shadow', 'sgs-blocks' ) }
					value={ props.attributes.shadow || '' }
					options={ SHADOW_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { shadow: val } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		),
		// 8. Shape dividers.
		( props ) => <ShapeDividersPanel { ...props } />,
	],

	layout: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<LayoutPanel { ...props } />
				<hr style={ { margin: '16px 0' } } />
				<WidthPanel { ...props } />
			</PanelBody>
		),
		( props ) => <ResponsiveSpacingPanel { ...props } />,
		( props ) => <ContentBandPanel { ...props } />,
	],

	content: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
			</PanelBody>
		),
		( props ) => <ResponsiveSpacingPanel { ...props } />,
		// Note: base (desktop) padding/margin are handled by WP-native supports.spacing
		// (Dimensions panel). ResponsiveSpacingPanel only adds tablet/mobile overrides.
	],
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * ContainerWrapperControls
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes function.
 * @param {string}   [props.kind]        'section' | 'layout' | 'content'. Default 'section'.
 * @param {string[]} [props.gridAreas]   Area names from supports.sgs.gridAreas (e.g. ['content','media']).
 *                                       When provided, the section kind renders one GridAreaPanel per entry
 *                                       under the Grid items section. Consumers that pass no areas get
 *                                       behaviour-identical output to before this prop existed.
 */
export default function ContainerWrapperControls( { attributes, setAttributes, kind = 'section', gridAreas } ) {
	// Guard: fall back gracefully for unknown kind values.
	const panels = KIND_PANELS[ kind ] ?? KIND_PANELS.section;

	return (
		<InspectorControls>
			{ panels.map( ( renderPanel, index ) => (
				// Key the list child on a Fragment rather than passing `key`
				// into the panel render function (which ignores it, leaving the
				// array children unkeyed → React duplicate-key warnings).
				// eslint-disable-next-line react/no-array-index-key
				<Fragment key={ index }>
					{ renderPanel( { attributes, setAttributes, gridAreas } ) }
				</Fragment>
			) ) }
		</InspectorControls>
	);
}
