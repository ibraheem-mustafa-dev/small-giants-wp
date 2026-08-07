/**
 * Editor for sgs/before-after.
 *
 * Fully dynamic block: save() returns null, all output comes from
 * render.php. The canvas shows a live <ServerSideRender> preview so the
 * frame/labels/divider position reflect real render.php output — never a
 * hand-built editor-only approximation (ssr-fixes-hand-built-preview-drift).
 *
 * Spec 38 §9 editor canvas story for Draggable effects: STATIC (the
 * server-rendered CSS-only split at `startPosition`), with a Notice reading
 * "Drag interactions are live-site only" — view.js is a frontend-only
 * viewScriptModule and never runs in wp-admin, so there is nothing to fake
 * here; the static preview IS the truth.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	Button,
	TextControl,
	TextareaControl,
	ToggleControl,
	RangeControl,
	SelectControl,
	Notice,
	Spinner,
	__experimentalUnitControl as UnitControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import BooleanResponsiveControl from './BooleanResponsiveControl';

const HEIGHT_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'vh', label: 'vh' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: '%', label: '%' },
];

const WIDTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

/**
 * One before/after image picker row.
 *
 * @param {Object}   root0
 * @param {string}   root0.label
 * @param {string}   root0.url
 * @param {string}   root0.alt
 * @param {Function} root0.onSelect
 * @param {Function} root0.onAltChange
 * @param {Function} root0.onClear
 * @param {boolean}  [root0.showAlt] Render the alt-text field. Defaults to true.
 *                                   Passed false by the art-direction tier
 *                                   pickers: alt is NOT tiered (a different crop
 *                                   of the same subject describes the same
 *                                   thing), and rendering the field without an
 *                                   `alt`/`onAltChange` pair would put an
 *                                   uncontrolled, untypeable input on screen.
 */
function ImagePickerRow( {
	label,
	url,
	alt,
	onSelect,
	onAltChange,
	onClear,
	showAlt = true,
} ) {
	return (
		<div style={ { marginBottom: '16px' } }>
			<p style={ { marginBottom: '4px', fontWeight: 500 } }>{ label }</p>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ onSelect }
					allowedTypes={ [ 'image' ] }
					value={ url }
					render={ ( { open } ) => (
						<Button
							variant={ url ? 'secondary' : 'primary' }
							onClick={ open }
							style={ { marginBottom: '8px' } }
						>
							{ url
								? __( 'Replace image', 'sgs-blocks' )
								: __( 'Select image', 'sgs-blocks' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ url && (
				<>
					<img
						src={ url }
						alt=""
						style={ {
							display: 'block',
							width: '100%',
							maxHeight: '120px',
							objectFit: 'cover',
							borderRadius: '4px',
							marginBottom: '8px',
						} }
					/>
					{ showAlt && (
						<TextControl
							label={ __( 'Alt text', 'sgs-blocks' ) }
							help={ __(
								'Required — describes this image for screen-reader and no-JS visitors, who see both images without any comparison interaction.',
								'sgs-blocks'
							) }
							value={ alt }
							onChange={ onAltChange }
							__nextHasNoMarginBottom
						/>
					) }
					<Button
						variant="tertiary"
						isDestructive
						onClick={ onClear }
						style={ { marginTop: '4px' } }
					>
						{ __( 'Remove', 'sgs-blocks' ) }
					</Button>
				</>
			) }
		</div>
	);
}

/**
 * One before/after MEDIA slot — mirrors sgs/media's mediaType fork
 * (image/video/svg) applied to a single comparison side. `side` is 'before'
 * or 'after'; every attribute name below is that prefix + the shared suffix
 * (beforeMediaType/afterMediaType, beforeVideoUrl/afterVideoUrl, etc.) —
 * exactly the pattern render.php's media-render.php resolver reads.
 *
 * @param {Object}   root0
 * @param {string}   root0.side          'before' | 'after'.
 * @param {string}   root0.label         Panel-row label, e.g. "Before".
 * @param {Object}   root0.attributes    Full block attributes.
 * @param {Function} root0.setAttributes
 */
function MediaSlotPicker( { side, label, attributes, setAttributes } ) {
	const mediaTypeKey = `${ side }MediaType`;
	const mediaType = attributes[ mediaTypeKey ] || 'image';

	const imageUrlKey = `${ side }ImageUrl`;
	const imageAltKey = `${ side }ImageAlt`;
	const imageIdKey = `${ side }ImageId`;

	const videoUrlKey = `${ side }VideoUrl`;
	const videoAltKey = `${ side }VideoAlt`;
	const videoIdKey = `${ side }VideoId`;

	const svgContentKey = `${ side }SvgContent`;

	return (
		<div style={ { marginBottom: '20px' } }>
			<SelectControl
				label={ label }
				value={ mediaType }
				options={ [
					{ value: 'image', label: __( 'Image', 'sgs-blocks' ) },
					{ value: 'video', label: __( 'Video', 'sgs-blocks' ) },
					{ value: 'svg', label: __( 'SVG', 'sgs-blocks' ) },
				] }
				onChange={ ( val ) =>
					setAttributes( { [ mediaTypeKey ]: val } )
				}
				__nextHasNoMarginBottom
			/>

			{ 'image' === mediaType && (
				<ImagePickerRow
					label={ __( 'Image', 'sgs-blocks' ) }
					url={ attributes[ imageUrlKey ] }
					alt={ attributes[ imageAltKey ] }
					onSelect={ ( media ) =>
						setAttributes( {
							[ imageIdKey ]: media.id,
							[ imageUrlKey ]: media.url,
							[ imageAltKey ]:
								attributes[ imageAltKey ] || media.alt || '',
						} )
					}
					onAltChange={ ( val ) =>
						setAttributes( { [ imageAltKey ]: val } )
					}
					onClear={ () =>
						setAttributes( {
							[ imageIdKey ]: null,
							[ imageUrlKey ]: '',
							[ imageAltKey ]: '',
						} )
					}
				/>
			) }

			{ /* Art direction (2026-08-07) — the IMAGE pair, completing the half
			     this block was missing (its video playback tiers landed earlier).
			     Same device-switched shape as sgs/media and sgs/hero. Gated on a
			     desktop image existing: a per-device override for an image that is
			     not there would be a dead control. Alt text is deliberately not
			     tiered — a different crop of the same subject describes the same
			     thing. */ }
			{ 'image' === mediaType && attributes[ imageUrlKey ] && (
				<ResponsiveControl
					label={ __( 'Image for this screen size', 'sgs-blocks' ) }
				>
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
						const tier = 'tablet' === bp ? 'Tablet' : 'Mobile';
						const tierIdKey = `${ side }ImageId${ tier }`;
						const tierUrlKey = `${ side }ImageUrl${ tier }`;
						return (
							<ImagePickerRow
								label={ __(
									'Optional — leave empty to reuse the desktop image here',
									'sgs-blocks'
								) }
								url={ attributes[ tierUrlKey ] }
								showAlt={ false }
								onSelect={ ( media ) =>
									setAttributes( {
										[ tierIdKey ]: media.id,
										[ tierUrlKey ]: media.url,
									} )
								}
								onClear={ () =>
									setAttributes( {
										[ tierIdKey ]: null,
										[ tierUrlKey ]: '',
									} )
								}
							/>
						);
					} }
				</ResponsiveControl>
			) }

			{ 'video' === mediaType && (
				<div style={ { marginTop: '8px' } }>
					<Notice status="info" isDismissible={ false }>
						{ __(
							'WP media-library upload or a direct MP4/WebM URL only. YouTube/Vimeo embeds are not supported here — they cannot be kept frame-synced with the other side of the comparison.',
							'sgs-blocks'
						) }
					</Notice>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									[ videoIdKey ]: media.id,
									[ videoUrlKey ]: media.url,
								} )
							}
							allowedTypes={ [ 'video' ] }
							value={ attributes[ videoIdKey ] }
							render={ ( { open } ) => (
								<Button
									variant={
										attributes[ videoUrlKey ]
											? 'secondary'
											: 'primary'
									}
									onClick={ open }
									style={ { margin: '8px 0' } }
								>
									{ attributes[ videoUrlKey ]
										? __( 'Replace video', 'sgs-blocks' )
										: __(
												'Select video from library',
												'sgs-blocks'
										  ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					<TextControl
						label={ __(
							'Or paste a direct video URL',
							'sgs-blocks'
						) }
						value={ attributes[ videoUrlKey ] || '' }
						onChange={ ( val ) =>
							setAttributes( {
								[ videoUrlKey ]: val,
								[ videoIdKey ]: null,
							} )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Alt / description', 'sgs-blocks' ) }
						help={ __(
							'Read by screen readers in place of visual playback.',
							'sgs-blocks'
						) }
						value={ attributes[ videoAltKey ] || '' }
						onChange={ ( val ) =>
							setAttributes( { [ videoAltKey ]: val } )
						}
						__nextHasNoMarginBottom
					/>
				</div>
			) }

			{ 'svg' === mediaType && (
				<TextareaControl
					label={ __( 'SVG markup', 'sgs-blocks' ) }
					help={ __(
						'Pasted markup is sanitised on render — scripts and event handlers are stripped.',
						'sgs-blocks'
					) }
					value={ attributes[ svgContentKey ] || '' }
					onChange={ ( val ) =>
						setAttributes( { [ svgContentKey ]: val } )
					}
					rows={ 6 }
					__nextHasNoMarginBottom
				/>
			) }
		</div>
	);
}

/**
 * Whether a comparison slot has enough configured to render — mirrors
 * media-render.php's `has_content` check per media type, so the editor
 * placeholder/preview toggle never disagrees with what render.php will
 * actually output.
 *
 * @param {Object} attributes Full block attributes.
 * @param {string} side       'before' | 'after'.
 * @return {boolean} True when the slot has content.
 */
function slotHasContent( attributes, side ) {
	const mediaType = attributes[ `${ side }MediaType` ] || 'image';
	if ( 'video' === mediaType ) {
		return !! attributes[ `${ side }VideoUrl` ];
	}
	if ( 'svg' === mediaType ) {
		return !! ( attributes[ `${ side }SvgContent` ] || '' ).trim();
	}
	return !! attributes[ `${ side }ImageUrl` ];
}

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();

	const {
		showLabels,
		beforeLabel,
		afterLabel,
		labelColour,
		labelBackgroundColour,
		orientation,
		reverseDirection,
		startPosition,
		fxDraggable,
		dividerColour,
		dividerWidth,
		handleColour,
		handleIconColour,
		heightUnit,
		boxShadow,
		style,
		borderRadiusTablet,
		borderRadiusMobile,
	} = attributes;

	const hasBothImages =
		slotHasContent( attributes, 'before' ) &&
		slotHasContent( attributes, 'after' );

	return (
		<>
			<InspectorControls group="settings">
				<PanelBody title={ __( 'Media', 'sgs-blocks' ) } initialOpen>
					<MediaSlotPicker
						side="before"
						label={ __( 'Before', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<MediaSlotPicker
						side="after"
						label={ __( 'After', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					{ ( 'video' === attributes.beforeMediaType ||
						'video' === attributes.afterMediaType ) && (
						<BooleanResponsiveControl
							label={ __( 'Autoplay videos', 'sgs-blocks' ) }
							help={ __(
								'Both videos start playing together on load. Always suppressed when the visitor has reduced motion enabled — the play/pause control stays available either way.',
								'sgs-blocks'
							) }
							attrBase="videoAutoplay"
							attrTablet="videoAutoplayTablet"
							attrMobile="videoAutoplayMobile"
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Divider', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ [
							{
								value: 'horizontal',
								label: __(
									'Horizontal (left/right)',
									'sgs-blocks'
								),
							},
							{
								value: 'vertical',
								label: __(
									'Vertical (top/bottom)',
									'sgs-blocks'
								),
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { orientation: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Reverse direction', 'sgs-blocks' ) }
						help={
							'vertical' === orientation
								? __(
										'Off: after revealed from the top (default). On: after revealed from the bottom.',
										'sgs-blocks'
								  )
								: __(
										'Off: after revealed from the left (default). On: after revealed from the right — the more common slider convention.',
										'sgs-blocks'
								  )
						}
						checked={ !! reverseDirection }
						onChange={ ( val ) =>
							setAttributes( { reverseDirection: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Default split position', 'sgs-blocks' ) }
						help={ __(
							'Where the divider sits before a visitor drags it — also the ENTIRE comparison a no-JS visitor sees.',
							'sgs-blocks'
						) }
						value={ startPosition }
						onChange={ ( val ) =>
							setAttributes( { startPosition: val ?? 50 } )
						}
						min={ 0 }
						max={ 100 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Free drag on image', 'sgs-blocks' ) }
						help={ __(
							'Adds pointer drag anywhere on the image (GSAP Draggable), layered on top of the always-available keyboard/touch slider. Turning this off still leaves the divider fully operable via the slider handle and arrow keys.',
							'sgs-blocks'
						) }
						checked={ !! fxDraggable }
						onChange={ ( val ) =>
							setAttributes( { fxDraggable: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Divider colour', 'sgs-blocks' ) }
						value={ dividerColour }
						onChange={ ( val ) =>
							setAttributes( { dividerColour: val } )
						}
					/>
					<RangeControl
						label={ __( 'Divider thickness (px)', 'sgs-blocks' ) }
						value={ dividerWidth }
						onChange={ ( val ) =>
							setAttributes( { dividerWidth: val ?? 3 } )
						}
						min={ 1 }
						max={ 12 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Handle colour', 'sgs-blocks' ) }
						value={ handleColour }
						onChange={ ( val ) =>
							setAttributes( { handleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Handle icon colour', 'sgs-blocks' ) }
						value={ handleIconColour }
						onChange={ ( val ) =>
							setAttributes( { handleIconColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Labels', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show labels', 'sgs-blocks' ) }
						checked={ !! showLabels }
						onChange={ ( val ) =>
							setAttributes( { showLabels: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showLabels && (
						<>
							<TextControl
								label={ __( 'Before label', 'sgs-blocks' ) }
								value={ beforeLabel }
								onChange={ ( val ) =>
									setAttributes( { beforeLabel: val } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'After label', 'sgs-blocks' ) }
								value={ afterLabel }
								onChange={ ( val ) =>
									setAttributes( { afterLabel: val } )
								}
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __(
									'Label text colour',
									'sgs-blocks'
								) }
								value={ labelColour }
								onChange={ ( val ) =>
									setAttributes( { labelColour: val } )
								}
							/>
							<DesignTokenPicker
								label={ __(
									'Label background colour',
									'sgs-blocks'
								) }
								value={ labelBackgroundColour }
								onChange={ ( val ) =>
									setAttributes( {
										labelBackgroundColour: val,
									} )
								}
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="label"
								showLetterSpacing={ false }
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Frame size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveControl label={ __( 'Height', 'sgs-blocks' ) }>
						{ ( bp ) => {
							const key = {
								desktop: 'height',
								tablet: 'heightTablet',
								mobile: 'heightMobile',
							}[ bp ];
							const val = attributes[ key ];
							return (
								<UnitControl
									value={
										null === val || undefined === val
											? ''
											: `${ val }${ heightUnit }`
									}
									onChange={ ( v ) => {
										if ( ! v ) {
											setAttributes( { [ key ]: null } );
											return;
										}
										const parsed = Number.parseFloat( v );
										const unitMatch = /[a-z%]+$/i.exec(
											String( v )
										);
										setAttributes( {
											[ key ]: Number.isFinite( parsed )
												? parsed
												: null,
											...( 'desktop' === bp && unitMatch
												? { heightUnit: unitMatch[ 0 ] }
												: {} ),
										} );
									} }
									units={ HEIGHT_UNITS }
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
					<ResponsiveControl
						label={ __( 'Max width', 'sgs-blocks' ) }
					>
						{ ( bp ) => {
							const key = {
								desktop: 'maxWidth',
								tablet: 'maxWidthTablet',
								mobile: 'maxWidthMobile',
							}[ bp ];
							return (
								<UnitControl
									value={ attributes[ key ] || '' }
									onChange={ ( v ) =>
										setAttributes( { [ key ]: v || null } )
									}
									units={ WIDTH_UNITS }
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Frame styling', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							boxShadow: '',
							style: {
								...style,
								border: { ...style?.border, radius: {} },
							},
							borderRadiusTablet: {},
							borderRadiusMobile: {},
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => !! boxShadow }
						onDeselect={ () => setAttributes( { boxShadow: '' } ) }
						isShownByDefault
					>
						<TextControl
							label={ __( 'Box shadow', 'sgs-blocks' ) }
							help={ __(
								'CSS box-shadow value, e.g. "0 4px 12px rgba(0,0,0,0.15)".',
								'sgs-blocks'
							) }
							value={ boxShadow }
							onChange={ ( val ) =>
								setAttributes( { boxShadow: val } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
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
						isShownByDefault
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
				</ToolsPanel>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! hasBothImages ? (
					<div className="wp-block-sgs-before-after-editor__placeholder">
						<p>
							{ __(
								'Add media for Before and After (image, video, or SVG) to preview the comparison slider.',
								'sgs-blocks'
							) }
						</p>
					</div>
				) : (
					<>
						<Notice
							status="info"
							isDismissible={ false }
							className="wp-block-sgs-before-after-editor__notice"
						>
							{ __(
								'Drag interactions are live-site only — this preview shows the default split position.',
								'sgs-blocks'
							) }
						</Notice>
						<ServerSideRender
							block="sgs/before-after"
							attributes={ attributes }
							LoadingResponsePlaceholder={ () => (
								<div
									style={ {
										padding: '2rem',
										textAlign: 'center',
									} }
								>
									<Spinner />
								</div>
							) }
							ErrorResponsePlaceholder={ ( { response } ) => (
								<Notice status="error" isDismissible={ false }>
									{ response?.errorMsg ||
										__(
											'Preview failed to load.',
											'sgs-blocks'
										) }
								</Notice>
							) }
						/>
					</>
				) }
			</div>
		</>
	);
}
