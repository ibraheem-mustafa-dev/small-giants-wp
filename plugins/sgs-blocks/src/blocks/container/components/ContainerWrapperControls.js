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
 *  section  — full surface: width, contentWidth, gap (responsive), layout
 *             (grid/flex), background (image/video/overlay/svg/animation),
 *             shape dividers, min-height, grid-item defaults, shadow.
 *  layout   — grid/flex + width (widthMode/customWidth/contentWidth) + gap only.
 *  content  — width (widthMode/customWidth/contentWidth) + padding/spacing only.
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

import { __ } from '@wordpress/i18n';
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

const WIDTH_OPTIONS = [
	{ label: __( 'Content', 'sgs-blocks' ), value: 'content' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Full', 'sgs-blocks' ), value: 'full' },
];

const WIDTH_MODE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Wide (alignwide)', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Full (alignfull)', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Custom', 'sgs-blocks' ), value: 'custom' },
];

const WIDTH_MODE_INHERIT_OPTIONS = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	...WIDTH_MODE_OPTIONS,
];

const CUSTOM_WIDTH_UNIT_OPTIONS = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
	{ label: '%', value: '%' },
	{ label: 'vw', value: 'vw' },
];

const CUSTOM_WIDTH_UNIT_VALUES = CUSTOM_WIDTH_UNIT_OPTIONS.map( ( o ) => o.value );

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
 * Width + contentWidth controls.
 * Used by all three kinds.
 */
export function WidthPanel( { attributes, setAttributes } ) {
	const {
		maxWidth = '',
		widthMode = 'default',
		widthModeMobile = '',
		widthModeTablet = '',
		widthModeDesktop = '',
		customWidth = 0,
		customWidthUnit = 'px',
		contentWidth = '',
	} = attributes;

	const safeCustomUnit = CUSTOM_WIDTH_UNIT_VALUES.includes( customWidthUnit )
		? customWidthUnit
		: 'px';

	const anyCustom =
		widthMode === 'custom' ||
		widthModeMobile === 'custom' ||
		widthModeTablet === 'custom' ||
		widthModeDesktop === 'custom';

	return (
		<>
			<ToggleGroupControl
				label={ __( 'Max width', 'sgs-blocks' ) }
				value={ maxWidth }
				onChange={ ( val ) => setAttributes( { maxWidth: val } ) }
				isBlock
				__nextHasNoMarginBottom
			>
				{ WIDTH_OPTIONS.map( ( opt ) => (
					<ToggleGroupControlOption
						key={ opt.value }
						value={ opt.value }
						label={ opt.label }
					/>
				) ) }
			</ToggleGroupControl>

			<ToggleGroupControl
				label={ __( 'Width mode', 'sgs-blocks' ) }
				value={ widthMode }
				onChange={ ( val ) => setAttributes( { widthMode: val } ) }
				isBlock
				__nextHasNoMarginBottom
			>
				{ WIDTH_MODE_OPTIONS.map( ( opt ) => (
					<ToggleGroupControlOption
						key={ opt.value }
						value={ opt.value }
						label={ opt.label }
					/>
				) ) }
			</ToggleGroupControl>
			<p className="components-base-control__help">
				{ __( 'Composes with WP-native alignment. Per-viewport overrides below.', 'sgs-blocks' ) }
			</p>

			<ResponsiveControl label={ __( 'Width mode by viewport', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					const attrMap = {
						desktop: 'widthModeDesktop',
						tablet: 'widthModeTablet',
						mobile: 'widthModeMobile',
					};
					const attr = attrMap[ breakpoint ];
					return (
						<SelectControl
							value={ attributes[ attr ] || '' }
							options={ WIDTH_MODE_INHERIT_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
							__nextHasNoMarginBottom
						/>
					);
				} }
			</ResponsiveControl>

			{ anyCustom && (
				<>
					<RangeControl
						label={ __( 'Custom width', 'sgs-blocks' ) }
						value={ customWidth }
						onChange={ ( val ) => setAttributes( { customWidth: val || 0 } ) }
						min={ 0 }
						max={ 2000 }
						step={ 10 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Unit', 'sgs-blocks' ) }
						value={ safeCustomUnit }
						options={ CUSTOM_WIDTH_UNIT_OPTIONS }
						onChange={ ( val ) => setAttributes( { customWidthUnit: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			<TextControl
				label={ __( 'Content width', 'sgs-blocks' ) }
				value={ contentWidth }
				onChange={ ( val ) => setAttributes( { contentWidth: val } ) }
				help={ __(
					'Caps inner content to this max-width and centres it while the background stays full-width. Leave blank for no cap.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
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
									help={ __(
										"CSS grid-template-columns e.g. '5fr 3fr' or 'repeat(3,minmax(0,1fr))'. Leave empty to use the column count above.",
										'sgs-blocks'
									) }
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
 * mobile). Also exposes tablet and mobile overrides for the band's max-width
 * (contentWidthTablet / contentWidthMobile); desktop content width is already
 * in the Width panel so only a help note is shown at the desktop tier.
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
 *   contentWidthTablet            → Band width › Tablet
 *   contentWidthMobile            → Band width › Mobile
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

			<ResponsiveControl label={ __( 'Band width', 'sgs-blocks' ) }>
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								{ __( 'Desktop band width is set via Content width in the Width panel above.', 'sgs-blocks' ) }
							</p>
						);
					}
					const attrMap = {
						tablet: 'contentWidthTablet',
						mobile: 'contentWidthMobile',
					};
					return (
						<SpacingControl
							freeInput
							label={ __( 'Max width', 'sgs-blocks' ) }
							value={ attributes[ attrMap[ breakpoint ] ] || '' }
							onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
						/>
					);
				} }
			</ResponsiveControl>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// KIND → CONTROLS map
// ---------------------------------------------------------------------------
//
// Defines which sub-panels render for each kind value.
// Entries are render functions that receive ({ attributes, setAttributes }).
//
const KIND_PANELS = {
	section: [
		// Main layout panel (layout type, columns, gap, width, min-height, contentWidth)
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<LayoutPanel { ...props } />
				<hr style={ { margin: '16px 0' } } />
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
		( props ) => <ResponsiveSpacingPanel { ...props } />,
		( props ) => <ContentBandPanel { ...props } />,
		( props ) => <GridItemDefaultsPanel { ...props } />,
		( props ) => <BackgroundPanel { ...props } />,
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
 */
export default function ContainerWrapperControls( { attributes, setAttributes, kind = 'section' } ) {
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
					{ renderPanel( { attributes, setAttributes } ) }
				</Fragment>
			) ) }
		</InspectorControls>
	);
}
