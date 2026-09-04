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
import { __, sprintf } from '@wordpress/i18n';
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
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	SgsColourPanel,
	DesignTokenPicker,
	ShadowControl,
	TypographyControls,
	ResponsiveControl,
	ResponsiveOverride,
	shadowAttrKeys,
	SgsLengthControl,
	SgsBorderControl,
	resolveColourToken,
	MediaElementPanel,
} from '../../components';
import { BooleanResponsiveControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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
 * @param {boolean}  [root0.disabled] Disable the alt-text field. Passed true
 *                                    by MediaSlotPicker when this slot is
 *                                    marked decorative — render.php blanks the
 *                                    alt at render time either way, so the
 *                                    field is disabled rather than hidden to
 *                                    show the operator why it's inert.
 */
function ImagePickerRow( {
	label,
	url,
	alt,
	onSelect,
	onAltChange,
	onClear,
	showAlt = true,
	disabled = false,
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
							help={
								disabled
									? __(
											'Disabled — this image is marked decorative, so it renders with no alt text and is hidden from screen readers.',
											'sgs-blocks'
									  )
									: __(
											'Required — describes this image for screen-reader and no-JS visitors, who see both images without any comparison interaction.',
											'sgs-blocks'
									  )
							}
							value={ alt }
							onChange={ onAltChange }
							disabled={ disabled }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
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
	const imageDecorativeKey = `${ side }ImageDecorative`;
	const isImageDecorative = !! attributes[ imageDecorativeKey ];

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
				__next40pxDefaultSize
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
					disabled={ isImageDecorative }
				/>
			) }

			{ 'image' === mediaType && (
				<ToggleControl
					label={ sprintf(
						/* translators: %s: slot label, e.g. "Before" or "After". */
						__( '%s image is decorative', 'sgs-blocks' ),
						label
					) }
					checked={ isImageDecorative }
					onChange={ ( val ) =>
						setAttributes( { [ imageDecorativeKey ]: val } )
					}
					help={ __(
						'Turn on when this picture is decoration rather than information — screen readers will skip it instead of reading the image description.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
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
						__next40pxDefaultSize
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
						__next40pxDefaultSize
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
 * ServerSideRender serialises its `attributes` prop into REST query args via
 * `@wordpress/url`'s `addQueryArgs`, which turns a JS `null` into an EMPTY
 * STRING in the URL (there is no way to put a real `null` in a query
 * string). The `/wp/v2/block-renderer` endpoint then validates that empty
 * string against THIS block's own attribute schema — and for
 * `videoAutoplayTablet`/`videoAutoplayMobile` (typed `["boolean","null"]`,
 * default `null`, the framework's "inherit the tier above" convention) an
 * empty string matches neither branch. The whole preview request 400s with
 * `rest_invalid_param`, and ServerSideRender surfaces that as the canvas
 * error notice "Preview failed to load." — confirmed live: the REST call
 * returns `{"code":"rest_invalid_param","data":{"params":{"attributes":
 * "[videoAutoplayTablet] is not of type boolean,null."}}}`.
 *
 * Fix: omit any attribute whose value is `null` before handing attributes
 * to ServerSideRender. An omitted query param is never validated against
 * the schema at all, and render.php already reads every attribute through
 * an `?? null`/`?? default` fallback (see `$video_autoplay_tablet_raw`
 * above) — so the effective value render.php sees is identical whether the
 * key is present-as-null or simply absent. This is a transport-layer fix,
 * not a behaviour change.
 *
 * @param {Object} attrs Full block attributes.
 * @return {Object} The same attributes with any `null`-valued key removed.
 */
function omitNullAttributes( attrs ) {
	const out = {};
	for ( const key in attrs ) {
		if ( null !== attrs[ key ] ) {
			out[ key ] = attrs[ key ];
		}
	}
	return out;
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
		handleColourGradient,
		handleIconColour,
		heightUnit,
		boxShadow,
		boxShadowColour,
	} = attributes;

	const hasBothImages =
		slotHasContent( attributes, 'before' ) &&
		slotHasContent( attributes, 'after' );

	return (
		<>
			{ /* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour
			   panel, rendered FIRST. Replaces the scattered DesignTokenPicker
			   rows previously inline inside the Divider/Labels panels below.
			   No hover siblings exist for these attrs. boxShadow's colour
			   row (D621/D622) lives here too — the shape stays with
			   ShadowControl in the Frame styling ToolsPanel below, colour is
			   externally managed per the shared colour-architecture. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'labelText',
						label: __( 'Label text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: labelColour,
								onChange: ( val ) => setAttributes( { labelColour: val } ),
							},
						],
					},
					{
						key: 'labelBackground',
						label: __( 'Label background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: labelBackgroundColour,
								onChange: ( val ) => setAttributes( { labelBackgroundColour: val } ),
							},
						],
					},
					{
						key: 'boxShadow',
						label: __( 'Frame shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: boxShadowColour,
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
			<InspectorControls group="settings">
				<PanelBody title={ __( 'Media', 'sgs-blocks' ) } initialOpen>
					<MediaSlotPicker
						side="before"
						label={ __( 'Before', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					{ /* Wave 5b — independently-scoped fit/focal-point per slot
					     (the falsifying case the shared atom layer's `prefix`
					     support exists for: two media elements on one block,
					     each with its own object-fit/object-position rather
					     than the old shared sgsObjectFit/sgsObjectPosition
					     pair that set both slots identically). */ }
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="before"
						blockSlug="sgs/before-after"
						insertion="element"
						atoms={ [ 'object-fit', 'focal-point' ] }
						mediaType={ attributes.beforeMediaType || 'image' }
						scope="element"
					/>
					<MediaSlotPicker
						side="after"
						label={ __( 'After', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="after"
						blockSlug="sgs/before-after"
						insertion="element"
						atoms={ [ 'object-fit', 'focal-point' ] }
						mediaType={ attributes.afterMediaType || 'image' }
						scope="element"
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
						__next40pxDefaultSize
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
						__next40pxDefaultSize
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
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: dividerColour,
								onChange: ( val ) => setAttributes( { dividerColour: val } ),
							},
						] }
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
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Handle', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Handle colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: handleColour,
								onChange: ( val ) => setAttributes( { handleColour: val } ),
								gradientValue: handleColourGradient,
								onGradientChange: ( val ) => setAttributes( { handleColourGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Handle icon colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: handleIconColour,
								onChange: ( val ) => setAttributes( { handleIconColour: val } ),
							},
						] }
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
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'After label', 'sgs-blocks' ) }
								value={ afterLabel }
								onChange={ ( val ) =>
									setAttributes( { afterLabel: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
					{ /*
						  `height` is now a TIER OBJECT (Spec 35 pass) — ONE attr
						  holding {desktop,tablet,mobile}, same shape as `maxWidth`
						  below. `heightTablet`/`heightMobile` are no longer
						  declared by block.json. Each tier still stores a plain
						  NUMBER (not a unit-suffixed string) sharing the single
						  `heightUnit` attr — that per-tier-number/shared-unit
						  encoding is unchanged from before this migration, only
						  the storage location (one object vs three flat attrs)
						  moved.
					*/ }
					<ResponsiveOverride
						label={ __( 'Height', 'sgs-blocks' ) }
						value={ attributes.height }
						onChange={ ( obj ) => setAttributes( { height: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, inherited, setOwnValue } ) => {
							const val = inherited ? effectiveValue : ownValue;
							return (
								<SgsLengthControl
									presets={ false }
									value={
										null === val || undefined === val || '' === val
											? ''
											: `${ val }${ heightUnit }`
									}
									placeholder={ inherited && '' !== effectiveValue ? `${ effectiveValue }${ heightUnit }` : '' }
									onChange={ ( v ) => {
										if ( ! v ) {
											setOwnValue( '' );
											return;
										}
										const parsed = Number.parseFloat( v );
										const unitMatch = /[a-z%]+$/i.exec(
											String( v )
										);
										setOwnValue( Number.isFinite( parsed ) ? parsed : '' );
										if ( 'desktop' === tier && unitMatch ) {
											setAttributes( { heightUnit: unitMatch[ 0 ] } );
										}
									} }
									units={ HEIGHT_UNITS }
								/>
							);
						} }
					</ResponsiveOverride>
					{ /*
					  `maxWidth` is a TIER OBJECT (Spec 35 pass 2) — ONE attr holding
					  {desktop,tablet,mobile}. It must use ResponsiveOverride, which
					  reads and writes the object; ResponsiveControl writes one flat
					  attr per tier and `maxWidthTablet`/`maxWidthMobile` are no
					  longer declared, so WordPress would silently discard them
					  (D338) while the desktop branch wrote a string into an
					  object-typed attr and destroyed the setting (D563).
					*/ }
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
								units={ WIDTH_UNITS }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
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

			{ /*
			  Border radius previously had TWO controls writing different storage:
			  this panel wrote WP-native style.border.radius (undeclared in
			  block.json, silently discarded by WordPress — check-undeclared-attrs
			  finding), while the "Border" panel's SgsBorderControl above (D876/D881
			  standard) already writes the real private borderRadius/Tablet/Mobile
			  attrs render.php actually reads. Removed the duplicate rather than
			  redirecting it to the same attrs a second control already owns.
			*/ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Frame styling', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( { boxShadow: '', boxShadowColour: '' } )
					}
				>
					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => !! boxShadow }
						onDeselect={ () =>
							setAttributes( { boxShadow: '', boxShadowColour: '' } )
						}
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ shadowAttrKeys( 'boxShadow', { hoverColour: true } ) }
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
							attributes={ omitNullAttributes( attributes ) }
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
