import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	MediaPlaceholder,
	MediaUpload,
	MediaUploadCheck,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ButtonGroup,
	Button,
	TextControl,
	SelectControl,
	TextareaControl,
	ToggleControl,
	RangeControl,
	Notice,
} from '@wordpress/components';
import {
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveBorderRadiusControl,
	LinkPopoverField,
	SgsColourPanel,
	ShadowControl,
	SgsLengthControl,
	MediaSizingPanel,
} from '../../components';
import BooleanResponsiveControl from './BooleanResponsiveControl';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * Allowed CSS length units for the media styling controls. Mirrors the
 * server-side sgs_media_validate_unit() allowlist so the editor cannot emit a
 * unit render.php would reject.
 */
/**
 * The video playback booleans, each as a breakpoint map plus its desktop default.
 *
 * Shape is deliberate: `{ desktop, tablet, mobile }` is the canonical responsive
 * idiom in this codebase (see any `<ResponsiveControl>` call site), and
 * `check-control-ux.js` recognises a variant appearing as the VALUE of a
 * `tablet:`/`mobile:` key as a compliant family. Listing the tier attrs any other
 * way — e.g. spelled out one per line in a resetAll — reads to that gate as an
 * unwrapped direct control, which is exactly what it flagged.
 *
 * Single source of truth for the panel's reset, so adding a seventh boolean
 * cannot be silently forgotten by `resetAll`.
 */
const PLAYBACK_TIERS = [
	{
		map: { desktop: 'videoAutoplay', tablet: 'videoAutoplayTablet', mobile: 'videoAutoplayMobile' },
		desktopDefault: false,
	},
	{
		map: { desktop: 'videoLoop', tablet: 'videoLoopTablet', mobile: 'videoLoopMobile' },
		desktopDefault: false,
	},
	{
		map: { desktop: 'videoMuted', tablet: 'videoMutedTablet', mobile: 'videoMutedMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoControls', tablet: 'videoControlsTablet', mobile: 'videoControlsMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoPlaysInline', tablet: 'videoPlaysInlineTablet', mobile: 'videoPlaysInlineMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoLazyLoad', tablet: 'videoLazyLoadTablet', mobile: 'videoLazyLoadMobile' },
		desktopDefault: true,
	},
];

/**
 * `RUnitControl` (a responsive UnitControl trio storing a unit-embedded CSS
 * length string per flat `attr`/`attrTablet`/`attrMobile` sibling) and its
 * `resetResponsiveLength()` reset-object helper were deleted here (Spec 35
 * pass) once `maxWidth`, `maxHeight` AND `height` — the only three consumers
 * — all migrated to the {desktop,tablet,mobile} TIER OBJECT shape and moved
 * onto `<ResponsiveOverride>` instead. Nothing else in this file used either
 * helper.
 */

/**
 * SGS Media block editor component.
 *
 * Renders a media-type toggle (Image | Video) at the top of the inspector.
 * Image tab: existing image controls (MediaPlaceholder / MediaUpload).
 * Video tab: video URL, source toggle, poster, playback options.
 *
 * Frontend rendering is handled 100% by render.php; this component provides
 * editor preview + inspector controls only.
 * @param root0
 * @param root0.attributes
 * @param root0.setAttributes
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		// Shared.
		mediaType,
		style,
		borderRadiusTablet,
		borderRadiusMobile,
		// Image.
		imageId,
		imageUrl,
		imageAlt,
		imageIsDecorative,
		// Video.
		videoUrl,
		videoSource,
		thumbnail,
		thumbnailId,
		videoAutoplay,
		videoLoop,
		videoMuted,
		videoControls,
		videoPlaysInline,
		videoLazyLoad,
		// SVG.
		svgContent,
		svgAnimation,
		svgAnimationSpeed,
	} = attributes;

	const blockProps = useBlockProps();

	// -------------------------------------------------------------------------
	// Helpers.
	// -------------------------------------------------------------------------
	const isImage = 'image' === mediaType || ! mediaType;
	const isVideo = 'video' === mediaType;
	const isSvg = 'svg' === mediaType;

	// Media size & crop (C19, 2026-08-27) — `mediaSizing` has no block.json
	// `default` (see block.json's `_comment_mediaSizing`), so an absent value
	// is DERIVED here — ratio set -> ratio; else height set -> height; else
	// auto — the SAME derivation `media/render.php` performs at render time,
	// so old/existing content (none exists live for this attribute — see the
	// dispatch return) renders identically with zero edit required.
	const nativeAspectRatio = attributes.style?.dimensions?.aspectRatio || '';
	const heightHasValue = !! (
		attributes.height && Object.values( attributes.height ).some( ( v ) => v !== undefined && v !== null && v !== '' )
	);
	const resolvedMediaSizing =
		attributes.mediaSizing || ( nativeAspectRatio ? 'ratio' : heightHasValue ? 'height' : 'auto' );

	const onSelectImage = ( media ) => {
		setAttributes( {
			imageId: media.id || null,
			imageUrl: media.url || '',
			imageAlt: media.alt || '',
			imageWidth: media.width || null,
			imageHeight: media.height || null,
		} );
	};

	const onSelectVideo = ( media ) => {
		setAttributes( {
			videoId: media.id || null,
			videoUrl: media.url || '',
			videoMimeType: media.mime || '',
			videoSource: 'internal',
		} );
	};

	const onSelectPoster = ( media ) => {
		setAttributes( {
			thumbnailId: media.id || null,
			thumbnail: media.url || '',
		} );
	};

	// -------------------------------------------------------------------------
	// Inspector controls.
	// -------------------------------------------------------------------------
	const inspectorControls = (
		<>
			{ /* GROUND-TRUTH: block.json attributes.captionColour (no default,
			   type string) + render.php:118 ($caption_colour, styled onto the
			   caption element) — confirmed 2026-08-15 against the live source
			   before wiring this row. Single-state colour (no hover pair
			   exists for the caption), `linked: true` per D619.
			   boxShadowColour row (D621/D622) added 2026-08-16 — colour lives
			   here, shape stays with ShadowControl in the Media Styling
			   ToolsPanel below, per the shared colour-architecture. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.captionColour,
								onChange: ( val ) => setAttributes( { captionColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'boxShadow',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.boxShadowColour,
								onChange: ( val ) => setAttributes( { boxShadowColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.boxShadowColourHover,
								onChange: ( val ) => setAttributes( { boxShadowColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
			{ /* Media type toggle */ }
			<PanelBody
				title={ __( 'Media Type', 'sgs-blocks' ) }
				initialOpen={ true }
			>
				<ButtonGroup
					aria-label={ __( 'Select media type', 'sgs-blocks' ) }
				>
					<Button
						variant={ isImage ? 'primary' : 'secondary' }
						onClick={ () =>
							setAttributes( { mediaType: 'image' } )
						}
					>
						{ __( 'Image', 'sgs-blocks' ) }
					</Button>
					<Button
						variant={ isVideo ? 'primary' : 'secondary' }
						onClick={ () =>
							setAttributes( { mediaType: 'video' } )
						}
					>
						{ __( 'Video', 'sgs-blocks' ) }
					</Button>
					<Button
						variant={ isSvg ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'svg' } ) }
					>
						{ __( 'SVG / Animation', 'sgs-blocks' ) }
					</Button>
				</ButtonGroup>
			</PanelBody>

			{ /* Image controls */ }
			{ isImage && imageUrl && (
				<PanelBody
					title={ __( 'Image', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ onSelectImage }
							allowedTypes={ [ 'image' ] }
							value={ imageId }
							render={ ( { open } ) => (
								<Button variant="secondary" onClick={ open }>
									{ __( 'Replace Image', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					<Button
						variant="link"
						isDestructive
						onClick={ () =>
							setAttributes( {
								imageId: undefined,
								imageUrl: '',
								imageAlt: '',
							} )
						}
						style={ { marginTop: '8px', display: 'block' } }
					>
						{ __( 'Remove Image', 'sgs-blocks' ) }
					</Button>
					{ /* Art direction (2026-08-07). Same device-switched shape as
					     sgs/hero's split image, so a client meets ONE interaction for
					     "a different crop on narrow screens" wherever images appear.
					     Desktop is the image chosen above; tablet/mobile are optional
					     overrides that fall back to it when left empty. */ }
					<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
						{ ( bp ) => {
							if ( 'desktop' === bp ) {
								return (
									<p style={ { margin: 0, fontStyle: 'italic' } }>
										{ __(
											'The image above is used on desktop. Switch to tablet or mobile to set a different crop.',
											'sgs-blocks'
										) }
									</p>
								);
							}
							const idKey = 'tablet' === bp ? 'imageIdTablet' : 'imageIdMobile';
							const urlKey = 'tablet' === bp ? 'imageUrlTablet' : 'imageUrlMobile';
							return (
								<>
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ ( media ) =>
												setAttributes( {
													[ idKey ]: media.id || null,
													[ urlKey ]: media.url || '',
												} )
											}
											allowedTypes={ [ 'image' ] }
											value={ attributes[ idKey ] }
											render={ ( { open } ) => (
												<Button variant="secondary" onClick={ open }>
													{ attributes[ urlKey ]
														? __( 'Replace image', 'sgs-blocks' )
														: __( 'Set image', 'sgs-blocks' ) }
												</Button>
											) }
										/>
									</MediaUploadCheck>
									{ attributes[ urlKey ] && (
										<Button
											variant="link"
											isDestructive
											onClick={ () =>
												setAttributes( {
													[ idKey ]: null,
													[ urlKey ]: '',
												} )
											}
											style={ { marginTop: '8px', display: 'block' } }
										>
											{ __( 'Use the main image here', 'sgs-blocks' ) }
										</Button>
									) }
								</>
							);
						} }
					</ResponsiveControl>
					{ /* WCAG 2.1 AA 1.1.1 (Non-text Content): decorative toggle is the
					     structural fix for "leave alt blank" — it makes the choice
					     explicit and emits both alt="" AND aria-hidden="true", rather
					     than relying on the operator remembering to leave a field
					     empty (which screen readers can't distinguish from a missing
					     description). Informational control, not a gate (a11y-validation-informational rule). */ }
					<ToggleControl
						label={ __(
							'Decorative image (hide from screen readers)',
							'sgs-blocks'
						) }
						help={ __(
							'Turn on for purely decorative images that add no information — e.g. background flourishes. Screen readers will skip it entirely.',
							'sgs-blocks'
						) }
						checked={ !! imageIsDecorative }
						onChange={ ( value ) =>
							setAttributes( { imageIsDecorative: value } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __(
							'Alt text (alternative text)',
							'sgs-blocks'
						) }
						help={
							imageIsDecorative
								? __(
										'Disabled — this image is marked decorative and is hidden from screen readers.',
										'sgs-blocks'
								  )
								: __(
										'Describe the image for screen readers and search engines. Leave empty only if the image is purely decorative.',
										'sgs-blocks'
								  )
						}
						value={ imageIsDecorative ? '' : imageAlt || '' }
						onChange={ ( value ) =>
							setAttributes( { imageAlt: value } )
						}
						disabled={ imageIsDecorative }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			) }

			{ /* Media styling — writes the block's NATIVE styling attributes
			     (single source of truth the cloning converter also writes).
			     ToolsPanel (dense-panel-candidate, Spec 35 wave-B T-item-2):
			     9 independent optional settings — objectFit / maxWidth / alignment
			     are the highest-frequency per-instance tweaks so they stay
			     isShownByDefault; the rest are one click away via "+". */ }
			{ ( isImage || isVideo ) && (
				<ToolsPanel
					label={ __( 'Media Styling', 'sgs-blocks' ) }
					resetAll={ () => {
						setAttributes( {
							objectFit: 'cover',
							objectPosition: 'center center',
							mediaSizing: 'auto',
							// maxWidth + maxHeight + height are TIER OBJECTS —
							// reset to an empty object, NOT resetResponsiveLength()'s
							// `null` + flat siblings. A null on an object-typed attr
							// coerces to the declared default, and the siblings no
							// longer exist so WP discards them silently (D338/D563).
							maxWidth: {},
							maxHeight: {},
							height: {},
							style: {
								...style,
								dimensions: { ...style?.dimensions, aspectRatio: undefined },
								border: { ...style?.border, radius: {} },
							},
							borderRadiusTablet: {},
							borderRadiusMobile: {},
							alignment: 'left',
							opacity: 1,
							boxShadow: '',
							boxShadowColour: '',
						} );
					} }
				>
					{ /*
					  `maxWidth` is a TIER OBJECT (Spec 35 pass 2) — ONE attr holding
					  {desktop,tablet,mobile}, so it uses ResponsiveOverride. `maxHeight`
					  and `height` below are on the same shape as of this pass.
					*/ }
					<ToolsPanelItem
						label={ __( 'Max width', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.maxWidth &&
								Object.values( attributes.maxWidth ).some(
									( v ) => v !== undefined && v !== null && v !== ''
								)
							)
						}
						onDeselect={ () => setAttributes( { maxWidth: {} } ) }
						isShownByDefault
					>
						<ResponsiveOverride
							label={ __( 'Max width', 'sgs-blocks' ) }
							value={ attributes.maxWidth }
							onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<SgsLengthControl
									presets={ false }
									value={ ownValue || '' }
									placeholder={ inherited ? effectiveValue || '' : '' }
									onChange={ ( v ) => setOwnValue( v || '' ) }
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					{ /*
					  `maxHeight` is a TIER OBJECT (Spec 35 pass 2/3c) — ONE attr
					  holding {desktop,tablet,mobile}, so it uses
					  <ResponsiveOverride> rather than the flat-sibling
					  <RUnitControl> its "Height (fill)" neighbour used to use.
					*/ }
					<ToolsPanelItem
						label={ __( 'Max height', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.maxHeight &&
								Object.values( attributes.maxHeight ).some(
									( v ) => v !== undefined && v !== null && v !== ''
								)
							)
						}
						onDeselect={ () => setAttributes( { maxHeight: {} } ) }
					>
						<ResponsiveOverride
							label={ __( 'Max height', 'sgs-blocks' ) }
							value={ attributes.maxHeight }
							onChange={ ( obj ) => setAttributes( { maxHeight: obj } ) }
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<SgsLengthControl
									presets={ false }
									value={ ownValue || '' }
									placeholder={ inherited ? effectiveValue || '' : '' }
									onChange={ ( v ) => setOwnValue( v || '' ) }
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					{ /*
					  Media size & crop (C19, 2026-08-27) — the mode picker below
					  REPLACES the old standalone "Height (fill)" + "Object fit" +
					  "Object position" ToolsPanelItems (removed above/below this
					  point) with the shared MediaSizingPanel: `height` (unchanged
					  attribute shape/name — a TIER OBJECT, no rename) and the
					  NATIVE `style.dimensions.aspectRatio` (block.json
					  `supports.dimensions.aspectRatio`) become mutually exclusive
					  modes of ONE `mediaSizing` picker instead of two controls
					  that could both be set at once. `mediaSizing` derives from
					  existing data when absent (see `resolvedMediaSizing` above) —
					  no stored content needs migrating.

					  `imageInset` is deliberately OMITTED here — sgs/media has no
					  padding/inset attribute today (a gap, not a bug in this
					  panel); the component supports the row only when a future
					  adopter passes insetValue/onInsetChange.
					*/ }
					<MediaSizingPanel
						mode={ resolvedMediaSizing }
						onModeChange={ ( next ) => setAttributes( { mediaSizing: next } ) }
						heightValue={ attributes.height }
						onHeightChange={ ( obj ) => setAttributes( { height: obj } ) }
						ratioValue={ nativeAspectRatio }
						onRatioChange={ ( value ) =>
							setAttributes( {
								style: {
									...style,
									dimensions: { ...style?.dimensions, aspectRatio: value || undefined },
								},
							} )
						}
						objectFit={ attributes.objectFit || 'cover' }
						onObjectFitChange={ ( value ) => setAttributes( { objectFit: value } ) }
						focalPoint={ attributes.objectPosition || 'center center' }
						onFocalPointChange={ ( value ) => setAttributes( { objectPosition: value } ) }
						focalPreviewUrl={ isImage ? imageUrl : '' }
					/>

					<ToolsPanelItem
						label={ __( 'Border radius', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( style?.border?.radius ?? {} ).length >
								0 ||
							Object.keys( borderRadiusTablet ?? {} ).length >
								0 ||
							Object.keys( borderRadiusMobile ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( {
								style: {
									...style,
									border: { ...style?.border, radius: {} },
								},
								borderRadiusTablet: {},
								borderRadiusMobile: {},
							} )
						}
					>
						<ResponsiveBorderRadiusControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							values={ {
								base: style?.border?.radius ?? {},
								tablet: borderRadiusTablet ?? {},
								mobile: borderRadiusMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( {
										style: {
											...style,
											border: {
												...style?.border,
												radius: next,
											},
										},
									} );
								} else {
									setAttributes( {
										[ `borderRadius${
											'tablet' === tier
												? 'Tablet'
												: 'Mobile'
										}` ]: next,
									} );
								}
							} }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Alignment', 'sgs-blocks' ) }
						hasValue={ () =>
							( attributes.alignment || 'left' ) !== 'left'
						}
						onDeselect={ () =>
							setAttributes( { alignment: 'left' } )
						}
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Alignment', 'sgs-blocks' ) }
							value={ attributes.alignment || 'left' }
							options={ [
								{
									label: __( 'Left', 'sgs-blocks' ),
									value: 'left',
								},
								{
									label: __( 'Centre', 'sgs-blocks' ),
									value: 'center',
								},
								{
									label: __( 'Right', 'sgs-blocks' ),
									value: 'right',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { alignment: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Opacity', 'sgs-blocks' ) }
						hasValue={ () => 1 !== ( attributes.opacity ?? 1 ) }
						onDeselect={ () => setAttributes( { opacity: 1 } ) }
					>
						<RangeControl
							label={ __( 'Opacity', 'sgs-blocks' ) }
							value={ attributes.opacity ?? 1 }
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							onChange={ ( value ) =>
								setAttributes( { opacity: value ?? 1 } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Box shadow', 'sgs-blocks' ) }
						hasValue={ () => !! attributes.boxShadow }
						onDeselect={ () =>
							setAttributes( { boxShadow: '', boxShadowColour: '' } )
						}
					>
						<ShadowControl
							label={ __( 'Box shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'boxShadow',
								colour: 'boxShadowColour',
								hoverColour: 'boxShadowColourHover',
							} }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			) }

			{ /* Caption & link — caption applies to image + video; link is image-only. */ }
			{ ( isImage || isVideo ) && (
				<PanelBody
					title={ __( 'Caption & Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Caption', 'sgs-blocks' ) }
						value={ attributes.caption || '' }
						onChange={ ( value ) =>
							setAttributes( { caption: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Caption tag', 'sgs-blocks' ) }
						value={ attributes.captionTag || 'figcaption' }
						options={ [
							{
								label: __(
									'Figure caption (figcaption)',
									'sgs-blocks'
								),
								value: 'figcaption',
							},
							{ label: __( 'Div', 'sgs-blocks' ), value: 'div' },
						] }
						onChange={ ( value ) =>
							setAttributes( { captionTag: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isImage && (
						/* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
						   Bean-approved popover 2026-08-13) — replaces the old
						   `SgsLinkControl` inline mount. `linkOpensNewTab` is a
						   plain boolean (not a `linkTarget` enum), so it's mapped
						   to/from the shared component's `linkTarget` field here
						   at the edge, matching `targetMode="boolean"`. */
						<LinkPopoverField
							label={ __( 'Link', 'sgs-blocks' ) }
							help={ __(
								'Search your site or paste a URL to wrap the image in a link. Leave empty for no link.',
								'sgs-blocks'
							) }
							value={ {
								url: attributes.linkUrl || '',
								linkTarget: attributes.linkOpensNewTab ? '_blank' : '_self',
								rel: attributes.linkRel || '',
							} }
							targetMode="boolean"
							onChange={ ( next ) => {
								const patch = {};
								if ( undefined !== next.url ) patch.linkUrl = next.url;
								if ( undefined !== next.linkTarget ) {
									patch.linkOpensNewTab = '_blank' === next.linkTarget;
								}
								if ( undefined !== next.rel ) patch.linkRel = next.rel;
								setAttributes( patch );
							} }
						/>
					) }
				</PanelBody>
			) }

			{ /* SVG controls */ }
			{ isSvg && (
				<PanelBody
					title={ __( 'SVG / Animation', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<p className="components-base-control__help">
						{ __(
							'Paste SVG markup to render it as a foreground content element. Animations use pure CSS — no JavaScript required.',
							'sgs-blocks'
						) }
					</p>
					<TextareaControl
						label={ __( 'SVG code', 'sgs-blocks' ) }
						value={ svgContent || '' }
						onChange={ ( value ) =>
							setAttributes( { svgContent: value } )
						}
						help={ __(
							'Paste your <svg>…</svg> markup here.',
							'sgs-blocks'
						) }
						rows={ 8 }
					/>
					{ /* Art direction for SVG (Spec 35 Part D5). Same device-switched
					     shape as the image tiers above and the video/thumbnail tiers
					     below, so a client meets ONE interaction for "something different
					     on narrow screens" wherever media appears. Gated on the base SVG
					     existing — a per-device override for media that is not there is a
					     dead control. Desktop is the markup pasted above; tablet/mobile
					     are optional overrides that fall back UP when left empty. */ }
					{ svgContent && (
						<ResponsiveControl
							label={ __(
								'SVG for this screen size',
								'sgs-blocks'
							) }
						>
							{ ( bp ) => {
								if ( 'desktop' === bp ) {
									return (
										<p
											style={ {
												margin: 0,
												fontStyle: 'italic',
											} }
										>
											{ __(
												'The SVG above is used on desktop. Switch to tablet or mobile to set different markup.',
												'sgs-blocks'
											) }
										</p>
									);
								}
								const svgKey =
									'tablet' === bp
										? 'svgContentTablet'
										: 'svgContentMobile';
								return (
									<>
										<TextareaControl
											label={ __(
												'SVG code',
												'sgs-blocks'
											) }
											value={ attributes[ svgKey ] || '' }
											onChange={ ( value ) =>
												setAttributes( {
													[ svgKey ]: value,
												} )
											}
											help={ __(
												'Leave empty to use the SVG from the next widest screen size.',
												'sgs-blocks'
											) }
											rows={ 8 }
										/>
										{ attributes[ svgKey ] && (
											<Button
												variant="link"
												isDestructive
												onClick={ () =>
													setAttributes( {
														[ svgKey ]: '',
													} )
												}
												style={ { display: 'block' } }
											>
												{ __(
													'Use the main SVG here',
													'sgs-blocks'
												) }
											</Button>
										) }
									</>
								);
							} }
						</ResponsiveControl>
					) }
					<SelectControl
						label={ __( 'Animation', 'sgs-blocks' ) }
						value={ svgAnimation || 'none' }
						options={ [
							{
								label: __( 'None', 'sgs-blocks' ),
								value: 'none',
							},
							{
								label: __( 'Pulse', 'sgs-blocks' ),
								value: 'pulse',
							},
							{
								label: __( 'Float', 'sgs-blocks' ),
								value: 'float',
							},
							{
								label: __( 'Wave', 'sgs-blocks' ),
								value: 'wave',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { svgAnimation: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ svgAnimation && 'none' !== svgAnimation && (
						<SelectControl
							label={ __( 'Animation speed', 'sgs-blocks' ) }
							value={ svgAnimationSpeed || 'medium' }
							options={ [
								{
									label: __( 'Slow', 'sgs-blocks' ),
									value: 'slow',
								},
								{
									label: __( 'Medium', 'sgs-blocks' ),
									value: 'medium',
								},
								{
									label: __( 'Fast', 'sgs-blocks' ),
									value: 'fast',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { svgAnimationSpeed: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
			) }

			{ /* Video controls — SKIP-WITH-REASON (Spec 35 wave-B T-item-2 dense-panel
			     audit): this outer "Video" panel is a source-picker WORKFLOW, not a
			     flat list of independent optional settings — videoSource gates which
			     control shows next (URL field vs media-library button), so ToolsPanel's
			     "add/remove independent settings" model doesn't fit. Same reason for
			     the nested "Poster Image" panel below (an image-picker item editor,
			     like the main Image panel above it). Only the nested "Playback
			     Options" panel (a genuine flat list of 6 independent toggles) converts
			     to ToolsPanel — see below. */ }
			{ isVideo && (
				<PanelBody
					title={ __( 'Video', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Video Source', 'sgs-blocks' ) }
						value={ videoSource || 'external' }
						options={ [
							{
								label: __(
									'External URL (YouTube, Vimeo, MP4)',
									'sgs-blocks'
								),
								value: 'external',
							},
							{
								label: __(
									'WordPress Media Library',
									'sgs-blocks'
								),
								value: 'internal',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { videoSource: value } )
						}
						__next40pxDefaultSize
					/>

					{ 'external' === ( videoSource || 'external' ) && (
						<TextControl
							label={ __( 'Video URL', 'sgs-blocks' ) }
							help={ __(
								'YouTube, Vimeo, or direct MP4/WebM URL. Watch URLs are converted to embed URLs automatically.',
								'sgs-blocks'
							) }
							value={ videoUrl || '' }
							onChange={ ( value ) =>
								setAttributes( { videoUrl: value } )
							}
							__next40pxDefaultSize
						/>
					) }

					{ 'internal' === videoSource && (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectVideo }
								allowedTypes={ [ 'video' ] }
								value={ attributes.videoId }
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
									>
										{ attributes.videoId
											? __(
													'Replace Video',
													'sgs-blocks'
											  )
											: __(
													'Select Video',
													'sgs-blocks'
											  ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					) }

					{ /* Video art direction (2026-08-07, Bean-decided). Unlike the
					     image tiers, this is swapped at runtime by view.js — three
					     videos cannot all be rendered and hidden, because each one
					     would start downloading. Gated on a desktop video existing:
					     an override for a video that is not there is a dead control. */ }
					{ ( videoUrl || attributes.videoId ) && (
						<ResponsiveControl
							label={ __(
								'Video for this screen size',
								'sgs-blocks'
							) }
						>
							{ ( bp ) => {
								if ( 'desktop' === bp ) {
									return (
										<p
											style={ {
												margin: 0,
												fontStyle: 'italic',
											} }
										>
											{ __(
												'The video above is used on desktop. Switch to tablet or mobile to use a different clip there. Note: someone who resizes across a breakpoint mid-watch will have the player restart.',
												'sgs-blocks'
											) }
										</p>
									);
								}
								const tier =
									'tablet' === bp ? 'Tablet' : 'Mobile';
								const urlKey = `videoUrl${ tier }`;
								const idKey = `videoId${ tier }`;
								return 'internal' === videoSource ? (
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ ( media ) =>
												setAttributes( {
													[ idKey ]: media.id || null,
													[ urlKey ]: media.url || '',
												} )
											}
											allowedTypes={ [ 'video' ] }
											value={ attributes[ idKey ] }
											render={ ( { open } ) => (
												<Button
													variant="secondary"
													onClick={ open }
												>
													{ attributes[ idKey ]
														? __(
																'Replace video',
																'sgs-blocks'
														  )
														: __(
																'Set video',
																'sgs-blocks'
														  ) }
												</Button>
											) }
										/>
									</MediaUploadCheck>
								) : (
									<TextControl
										label={ __(
											'Video URL for this screen size',
											'sgs-blocks'
										) }
										help={ __(
											'Optional. Leave empty to reuse the desktop video here. YouTube, Vimeo, or a direct MP4/WebM URL.',
											'sgs-blocks'
										) }
										value={ attributes[ urlKey ] || '' }
										onChange={ ( value ) =>
											setAttributes( {
												[ urlKey ]: value,
											} )
										}
										__next40pxDefaultSize
									/>
								);
							} }
						</ResponsiveControl>
					) }

					{ /* Thumbnail image */ }
					<PanelBody
						title={ __( 'Thumbnail', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<p className="components-base-control__help">
							{ __(
								'Shown before the video plays. Recommended for external embeds.',
								'sgs-blocks'
							) }
						</p>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectPoster }
								allowedTypes={ [ 'image' ] }
								value={ thumbnailId }
								render={ ( { open } ) => (
									<>
										{ thumbnail && (
											<img
												src={ thumbnail }
												alt={ __(
													'Video thumbnail',
													'sgs-blocks'
												) }
												style={ {
													maxWidth: '100%',
													marginBottom: '8px',
													display: 'block',
												} }
											/>
										) }
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ thumbnail
												? __(
														'Replace Thumbnail',
														'sgs-blocks'
												  )
												: __(
														'Select Thumbnail',
														'sgs-blocks'
												  ) }
										</Button>
										{ thumbnail && (
											<Button
												variant="link"
												isDestructive
												onClick={ () =>
													setAttributes( {
														thumbnailId: undefined,
														thumbnail: '',
													} )
												}
												style={ { marginLeft: '8px' } }
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										) }
									</>
								) }
							/>
						</MediaUploadCheck>
						{ /* Poster art direction (2026-08-07). Independent of the
						     video source — a tier may override only the still frame
						     and keep the desktop clip. Gated on a desktop poster
						     existing, so it is never a control over nothing. */ }
						{ thumbnail && (
							<ResponsiveControl
								label={ __(
									'Thumbnail for this screen size',
									'sgs-blocks'
								) }
							>
								{ ( bp ) => {
									if ( 'desktop' === bp ) {
										return (
											<p
												style={ {
													margin: 0,
													fontStyle: 'italic',
												} }
											>
												{ __(
													'The thumbnail above is used on desktop. Switch to tablet or mobile to set a different crop.',
													'sgs-blocks'
												) }
											</p>
										);
									}
									const tier =
										'tablet' === bp ? 'Tablet' : 'Mobile';
									const urlKey = `thumbnail${ tier }`;
									const idKey = `thumbnailId${ tier }`;
									return (
										<MediaUploadCheck>
											<MediaUpload
												onSelect={ ( media ) =>
													setAttributes( {
														[ idKey ]:
															media.id || null,
														[ urlKey ]:
															media.url || '',
													} )
												}
												allowedTypes={ [ 'image' ] }
												value={ attributes[ idKey ] }
												render={ ( { open } ) => (
													<>
														{ attributes[
															urlKey
														] && (
															<img
																src={
																	attributes[
																		urlKey
																	]
																}
																alt=""
																style={ {
																	maxWidth:
																		'100%',
																	marginBottom:
																		'8px',
																	display:
																		'block',
																} }
															/>
														) }
														<Button
															variant="secondary"
															onClick={ open }
														>
															{ attributes[
																urlKey
															]
																? __(
																		'Replace thumbnail',
																		'sgs-blocks'
																  )
																: __(
																		'Set thumbnail',
																		'sgs-blocks'
																  ) }
														</Button>
														{ attributes[
															urlKey
														] && (
															<Button
																variant="link"
																isDestructive
																onClick={ () =>
																	setAttributes(
																		{
																			[ idKey ]:
																				null,
																			[ urlKey ]:
																				'',
																		}
																	)
																}
																style={ {
																	marginLeft:
																		'8px',
																} }
															>
																{ __(
																	'Use the desktop thumbnail here',
																	'sgs-blocks'
																) }
															</Button>
														) }
													</>
												) }
											/>
										</MediaUploadCheck>
									);
								} }
							</ResponsiveControl>
						) }
					</PanelBody>

					{ /* Playback options — ToolsPanel (dense-panel-candidate, Spec 35
					     wave-B T-item-2): 6 independent booleans, all with a clear
					     block.json default. Autoplay/Muted/Show-Controls stay
					     isShownByDefault — the background-video pattern (autoplay +
					     muted together) and controls-visibility are the settings
					     operators touch most; Loop/Plays-Inline/Lazy-Load are
					     usually left at their sensible defaults. */ }
					<ToolsPanel
						label={ __( 'Playback Options', 'sgs-blocks' ) }
						resetAll={ () => {
							// Driven off PLAYBACK_TIER_MAP rather than a hand-listed
							// wall of 18 keys, so a new playback boolean cannot be
							// added to the panel and silently forgotten by reset.
							// The map is also the canonical breakpoint-map idiom
							// ({ desktop, tablet, mobile }) that check-control-ux.js
							// recognises as a compliant responsive family — a
							// hand-listed reset reads to that gate as 12 unwrapped
							// direct controls, which is what it flagged before.
							const reset = {};
							PLAYBACK_TIERS.forEach( ( { map, desktopDefault } ) => {
								reset[ map.desktop ] = desktopDefault;
								reset[ map.tablet ] = null;
								reset[ map.mobile ] = null;
							} );
							setAttributes( reset );
						} }
					>
						{ /* Each item is a single BooleanResponsiveControl (Desktop
						     toggle + Tablet/Mobile Inherit/On/Off) rather than 3
						     loose ToggleControls per setting — 6 rows in the panel,
						     not 18, per the design brief's inspector-usability
						     requirement. "It's easy to mute something on a PC... but
						     on mobile people often want mute by default" is exactly
						     the per-device product decision these tiers exist for. */ }
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () =>
								!! videoAutoplay ||
								null !==
									( attributes.videoAutoplayTablet ??
										null ) ||
								null !==
									( attributes.videoAutoplayMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoAutoplay: false,
									videoAutoplayTablet: null,
									videoAutoplayMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								help={ __(
									'Autoplay requires Muted to be enabled on most browsers — turning Autoplay on for a tier automatically mutes that tier too.',
									'sgs-blocks'
								) }
								attrBase="videoAutoplay"
								attrTablet="videoAutoplayTablet"
								attrMobile="videoAutoplayMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () =>
								!! videoLoop ||
								null !==
									( attributes.videoLoopTablet ?? null ) ||
								null !== ( attributes.videoLoopMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoLoop: false,
									videoLoopTablet: null,
									videoLoopMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								attrBase="videoLoop"
								attrTablet="videoLoopTablet"
								attrMobile="videoLoopMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Muted', 'sgs-blocks' ) }
							hasValue={ () =>
								videoMuted === false ||
								null !==
									( attributes.videoMutedTablet ?? null ) ||
								null !== ( attributes.videoMutedMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoMuted: true,
									videoMutedTablet: null,
									videoMutedMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Muted', 'sgs-blocks' ) }
								help={ __(
									'It’s easy to unmute on a PC — but on mobile, visitors often expect audio off by default, like social-media video. Set it per device here.',
									'sgs-blocks'
								) }
								attrBase="videoMuted"
								attrTablet="videoMutedTablet"
								attrMobile="videoMutedMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Show Controls', 'sgs-blocks' ) }
							hasValue={ () =>
								videoControls === false ||
								null !==
									( attributes.videoControlsTablet ??
										null ) ||
								null !==
									( attributes.videoControlsMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoControls: true,
									videoControlsTablet: null,
									videoControlsMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Show Controls', 'sgs-blocks' ) }
								attrBase="videoControls"
								attrTablet="videoControlsTablet"
								attrMobile="videoControlsMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Plays Inline (iOS)', 'sgs-blocks' ) }
							hasValue={ () =>
								videoPlaysInline === false ||
								null !==
									( attributes.videoPlaysInlineTablet ??
										null ) ||
								null !==
									( attributes.videoPlaysInlineMobile ??
										null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoPlaysInline: true,
									videoPlaysInlineTablet: null,
									videoPlaysInlineMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __(
									'Plays Inline (iOS)',
									'sgs-blocks'
								) }
								help={ __(
									'Prevents iOS from opening the video in full screen automatically.',
									'sgs-blocks'
								) }
								attrBase="videoPlaysInline"
								attrTablet="videoPlaysInlineTablet"
								attrMobile="videoPlaysInlineMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Lazy Load', 'sgs-blocks' ) }
							hasValue={ () =>
								videoLazyLoad === false ||
								null !==
									( attributes.videoLazyLoadTablet ??
										null ) ||
								null !==
									( attributes.videoLazyLoadMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoLazyLoad: true,
									videoLazyLoadTablet: null,
									videoLazyLoadMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __( 'Lazy Load', 'sgs-blocks' ) }
								help={ __(
									'Load video only when scrolled into view.',
									'sgs-blocks'
								) }
								attrBase="videoLazyLoad"
								attrTablet="videoLazyLoadTablet"
								attrMobile="videoLazyLoadMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
			) }
			</InspectorControls>
		</>
	);

	// -------------------------------------------------------------------------
	// Canvas — image mode.
	// -------------------------------------------------------------------------
	if ( isImage ) {
		if ( ! imageUrl ) {
			return (
				<div { ...blockProps }>
					{ inspectorControls }
					<MediaUploadCheck>
						<MediaPlaceholder
							accept="image/*"
							allowedTypes={ [ 'image' ] }
							onSelect={ onSelectImage }
							labels={ {
								title: __( 'SGS Media — Image', 'sgs-blocks' ),
								instructions: __(
									'Upload or select an image.',
									'sgs-blocks'
								),
							} }
						/>
					</MediaUploadCheck>
				</div>
			);
		}

		return (
			<figure { ...blockProps }>
				{ inspectorControls }
				<img
					src={ imageUrl }
					alt={ imageIsDecorative ? '' : imageAlt }
					aria-hidden={ imageIsDecorative ? 'true' : undefined }
					className="sgs-media__img"
				/>
			</figure>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — SVG mode.
	// -------------------------------------------------------------------------
	if ( isSvg ) {
		if ( ! svgContent ) {
			return (
				<div { ...blockProps }>
					{ inspectorControls }
					<div className="components-placeholder">
						<div className="components-placeholder__label">
							{ __(
								'SGS Media — SVG / Animation',
								'sgs-blocks'
							) }
						</div>
						<div className="components-placeholder__instructions">
							{ __(
								'Paste your SVG markup in the block settings panel.',
								'sgs-blocks'
							) }
						</div>
					</div>
				</div>
			);
		}

		// Editor preview: render SVG inline via dangerouslySetInnerHTML.
		// This is editor-only — the frontend uses the PHP-sanitised path (render.php).
		const svgClass = [
			'sgs-media__svg',
			svgAnimation && 'none' !== svgAnimation
				? `sgs-media__svg--${ svgAnimation } sgs-media__svg--speed-${
						svgAnimationSpeed || 'medium'
				  }`
				: '',
		]
			.filter( Boolean )
			.join( ' ' );

		return (
			<figure { ...blockProps }>
				{ inspectorControls }
				{ /* eslint-disable-next-line react/no-danger */ }
				<div
					className={ svgClass }
					aria-hidden="true"
					dangerouslySetInnerHTML={ { __html: svgContent } }
				/>
			</figure>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — video mode.
	// -------------------------------------------------------------------------
	const hasVideo = videoUrl || attributes.videoId;

	if ( ! hasVideo ) {
		return (
			<div { ...blockProps }>
				{ inspectorControls }
				{ 'internal' === videoSource ? (
					<MediaUploadCheck>
						<MediaPlaceholder
							accept="video/*"
							allowedTypes={ [ 'video' ] }
							onSelect={ onSelectVideo }
							labels={ {
								title: __( 'SGS Media — Video', 'sgs-blocks' ),
								instructions: __(
									'Upload or select a video from the media library.',
									'sgs-blocks'
								),
							} }
						/>
					</MediaUploadCheck>
				) : (
					<div className="components-placeholder">
						<div className="components-placeholder__label">
							{ __( 'SGS Media — Video', 'sgs-blocks' ) }
						</div>
						<div className="components-placeholder__instructions">
							{ __(
								'Enter a YouTube, Vimeo, or direct MP4 URL in the block settings.',
								'sgs-blocks'
							) }
						</div>
					</div>
				) }
			</div>
		);
	}

	// Video preview in editor — simplified; render.php drives the frontend.
	return (
		<figure { ...blockProps }>
			{ inspectorControls }
			{ videoUrl && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Video URL set. Frontend render handled by server. Preview not available in editor.',
						'sgs-blocks'
					) }
					<br />
					<code>{ videoUrl }</code>
				</Notice>
			) }
			{ ! videoUrl && attributes.videoId && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Internal video selected (WP Media Library). Frontend render handled by server.',
						'sgs-blocks'
					) }
				</Notice>
			) }
		</figure>
	);
}
