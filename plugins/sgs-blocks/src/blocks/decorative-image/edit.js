import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import {
	ResponsiveControl,
	ResponsiveOverride,
	SgsLengthControl,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import DecorativeImagePanelLayout from '../../components/media/DecorativeImagePanelLayout';
import {
	elementCustomProperties,
	requiresBox,
} from '../../components/media/canvasStyle';
import { usePreviewTier } from '../../utils';
import LayerImagePanel from './LayerImagePanel';
import LayerBoxPanels from './LayerBoxPanels';
import LayerEdgePanel from './LayerEdgePanel';
import { layerPreviewStyle, layerBoxPreview } from './layer-preview';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: 'vw', label: 'vw' },
];

const OVERFLOW_OPTIONS = [
	{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		decorMedia,
		imageId,
		imageUrl,
		imageAlt,
		imageDecorative,
		positionX,
		positionY,
		positionTop,
		positionRight,
		positionBottom,
		positionLeft,
		width,
		maxWidth,
		rotation,
		opacity,
		zIndex,
		flipX,
		fadeOnScroll,
		overflow,
		hideOnTablet,
		hideOnMobile,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-decorative-image-editor',
	} );
	const blockCount = useSelect(
		( select ) => select( 'core/block-editor' ).getBlockCount( clientId ),
		[ clientId ]
	);
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-decorative-image__content' },
		{
			renderAppender: blockCount
				? undefined
				: InnerBlocks.ButtonBlockAppender,
		}
	);

	// Hydrate from new decorMedia first; fall back to legacy imageUrl for
	// posts that have not yet round-tripped through the editor migration.
	const effectiveMedia =
		decorMedia ||
		( imageUrl
			? {
					url: imageUrl,
					type: 'image',
					id: imageId || 0,
					alt: imageAlt || '',
					mime: 'image/jpeg',
			  }
			: null );

	const onSelectMedia = ( media ) => {
		setAttributes( {
			decorMedia: media,
			// Mirror to legacy attrs so existing render path / older code keeps working.
			imageId: media && media.type === 'image' ? media.id : undefined,
			imageUrl: media && media.type === 'image' ? media.url : '',
			imageAlt: media && media.type === 'image' ? media.alt || '' : '',
		} );
	};

	const onRemoveMedia = () => {
		setAttributes( {
			decorMedia: null,
			imageId: undefined,
			imageUrl: '',
			imageAlt: '',
		} );
	};

	// positionX/positionY/rotation/width are TIER OBJECTS (Spec 35 pass); the
	// preview shows the tier the editor is previewing, a narrower tier inheriting
	// from the wider one as the frontend's @media overrides do.
	const previewTier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );

	// -------------------------------------------------------------------------
	// Media-atom canvas mirror (Wave 6, 2026-09-02) — object-fit/focal-point/
	// overlay. This block renders its OWN React canvas markup below (never
	// <ServerSideRender>), so nothing paints the atoms' custom-property VALUES
	// onto the preview node unless this file sets them itself — same gap
	// `sgs/media/edit.js` closed for its own canvas (see that file's own
	// comment for the confirmed-live root cause). Inline custom-property
	// VALUES here are not a Spec 32 violation: they override a var() the
	// shared, globally-enqueued media-element.css already declares, not a
	// real CSS property (canvasStyle.js's own module docblock).
	const mediaAtomIds = [ 'object-fit', 'focal-point', 'overlay' ];
	// object-fit/focal-point are ELEMENT-scope atoms; render.php cannot wire
	// them onto the <video> path (sgs_render_media(), a shared helper, has no
	// class parameter to carry the sgs-media-el marker — a documented, narrow
	// gap on the frontend). Excluding them from the editor's video preview
	// too keeps the canvas honest with what actually ships — the alternative
	// (crop working in the editor, not on the published page) is exactly the
	// canvas/frontend divergence this project's editor-canvas-parity work
	// exists to prevent. overlay (box-scope) is unaffected either way.
	const isVideoPreview = 'video' === effectiveMedia?.type;
	const mediaElementStyle = elementCustomProperties( {
		attributes,
		blockSlug: 'sgs/decorative-image',
		atoms: isVideoPreview ? [ 'overlay' ] : mediaAtomIds,
	} );
	// `overlay` is a box-scope atom (paints via ::after) — a replaced <img>/
	// <video> generates no pseudo-element to attach it to, so its custom
	// properties are set on the PREVIEW WRAPPER (already a real <div>, unlike
	// the frontend's naked <img> root) rather than on the media node itself.
	const mediaBoxStyle = elementCustomProperties( {
		attributes,
		blockSlug: 'sgs/decorative-image',
		atoms: mediaAtomIds.filter( ( id ) => 'overlay' === id ),
	} );
	const mediaWantsBox = requiresBox( {
		attributes,
		blockSlug: 'sgs/decorative-image',
		atoms: mediaAtomIds,
	} );

	// The positioned layer: the canvas twin of the root rule render.php emits.
	const layerStyle = layerPreviewStyle(
		{
			positionX,
			positionY,
			positionTop,
			positionRight,
			positionBottom,
			positionLeft,
			width,
			maxWidth,
			rotation,
			opacity,
			zIndex,
			flipX,
			overflow,
		},
		previewTier
	);
	// The layer's own box (border, fill, shadow, height), painted on the same element as the position.
	const boxStyle = layerBoxPreview(
		attributes,
		previewTier,
		colourPalette,
		! effectiveMedia && 0 === blockCount
	);
	// Fit the content is the width box's one preset; it sizes the layer to what it holds.
	const widthPresets = [
		{ label: __( 'Fit the content', 'sgs-blocks' ), value: 'max-content' },
	];

	return (
		<>
			<LayerBoxPanels
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<LayerEdgePanel
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<InspectorControls>
				<LayerImagePanel
					media={ effectiveMedia }
					onSelect={ onSelectMedia }
					onRemove={ onRemoveMedia }
				/>

				{ /* Accessibility (Spec 35 item 18) — the toggle governs the <img> only,
				     defaulting ON/decorative. Text and blocks inside the layer are always
				     read out. Mirrors sgs/media's imageDecorative control. */ }
				{ effectiveMedia && 'image' === effectiveMedia.type && (
					<PanelBody
						title={ __( 'Accessibility', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Decorative image', 'sgs-blocks' ) }
							help={ __(
								'Turn off only when the image carries meaning, then write alt text. Text and blocks inside the layer are always read out.',
								'sgs-blocks'
							) }
							checked={ imageDecorative ?? true }
							onChange={ ( val ) =>
								setAttributes( { imageDecorative: val } )
							}
							__nextHasNoMarginBottom
						/>
						{ ! ( imageDecorative ?? true ) && (
							<TextControl
								label={ __( 'Alt text', 'sgs-blocks' ) }
								value={ imageAlt || '' }
								onChange={ ( val ) =>
									setAttributes( { imageAlt: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</PanelBody>
				) }

				{ /* Art direction (2026-08-07). Same device-switched shape as sgs/media
				     and sgs/hero, so a client meets ONE interaction for "a different crop
				     on narrow screens" wherever images appear. Rendered ONLY for image
				     media: the render.php video branch returns before the tier siblings
				     are built, so showing this for a video would be a dead control.
				     This is the block's ONLY Settings-tab panel (content/media selection
				     is behaviour, not appearance), so it is left open by default — it is
				     the sole panel in this tab and there is nothing else to compete with. */ }
				{ effectiveMedia && 'image' === effectiveMedia.type && (
					<PanelBody title={ __( 'Art direction', 'sgs-blocks' ) }>
						<ResponsiveControl
							label={ __(
								'Image for this screen size',
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
												'The image chosen for this block is used on desktop. Switch to tablet or mobile to set a different crop.',
												'sgs-blocks'
											) }
										</p>
									);
								}
								const idKey =
									'tablet' === bp
										? 'imageIdTablet'
										: 'imageIdMobile';
								const urlKey =
									'tablet' === bp
										? 'imageUrlTablet'
										: 'imageUrlMobile';
								const tierUrlValue = attributes[ urlKey ]
									? {
											url: attributes[ urlKey ],
											type: 'image',
											id: attributes[ idKey ] || 0,
											alt: '',
											mime: 'image/jpeg',
									  }
									: null;
								return (
									<MediaPicker
										value={ tierUrlValue }
										allowedTypes={ [ 'image' ] }
										onChange={ ( media ) =>
											setAttributes( {
												[ idKey ]: media
													? media.id
													: undefined,
												[ urlKey ]: media
													? media.url
													: '',
											} )
										}
										onRemove={ () =>
											setAttributes( {
												[ idKey ]: undefined,
												[ urlKey ]: '',
											} )
										}
										label={ __(
											'Set image',
											'sgs-blocks'
										) }
										instructionsImage={ __(
											'Optional. Leave empty to reuse the desktop image at this width.',
											'sgs-blocks'
										) }
									/>
								);
							} }
						</ResponsiveControl>
					</PanelBody>
				) }
			</InspectorControls>

			<InspectorControls group="styles">
				{ /* Wave 6 (2026-09-02) — object-fit/focal-point/overlay, the atom
				     layer's first adoption on this block. Gated on media existing
				     (each atom's own `types` list already excludes irrelevant rows;
				     mounting unconditionally with no media selected would open onto
				     blank space — the same empty-inspector-container rule
				     MediaPanelLayout.js's own "Playback" section follows). */ }
				{ effectiveMedia && (
					<DecorativeImagePanelLayout
						attributes={ attributes }
						setAttributes={ setAttributes }
						mediaType={
							'video' === effectiveMedia.type ? 'video' : 'image'
						}
						previewUrl={
							'video' === effectiveMedia.type
								? ''
								: effectiveMedia.url
						}
					/>
				) }

				{ /* Width and max width are per-device lengths in this panel; Position
				     X / Y and Rotation are per-device in "Responsive Overrides" below.
				     Each attribute has one writer. */ }
				<PanelBody
					title={ __( 'Size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						onChange={ ( obj ) => setAttributes( { width: obj } ) }
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								tokenPresets={ widthPresets }
								label={ __( 'Width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ LENGTH_UNITS }
								help={ __(
									'Fit the content suits a label or a badge; a length suits a photo or a ring.',
									'sgs-blocks'
								) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ maxWidth }
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
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ LENGTH_UNITS }
								help={ __(
									'The widest the layer gets on this device, in any unit. Leave empty for no limit.',
									'sgs-blocks'
								) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody
					title={ __( 'Transform', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Bare desktop-only Rotation control deleted — duplicated the
					     tier-aware ResponsiveOverride control in "Responsive
					     Overrides" below, which now owns the object-typed `rotation`
					     attr (see the Position-panel removal note above for why). */ }
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ flipX }
						onChange={ ( val ) => setAttributes( { flipX: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Opacity (%)', 'sgs-blocks' ) }
						value={ opacity }
						onChange={ ( val ) =>
							setAttributes( { opacity: val } )
						}
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Z-Index', 'sgs-blocks' ) }
						help={ __(
							'Stacking order (above background, below content)',
							'sgs-blocks'
						) }
						value={ zIndex }
						onChange={ ( val ) => setAttributes( { zIndex: val } ) }
						min={ -1 }
						max={ 10 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Fade on scroll', 'sgs-blocks' ) }
						help={ __(
							'Opacity fades to 0 as image scrolls past the top of the viewport. Disabled when "Reduce motion" is on.',
							'sgs-blocks'
						) }
						checked={ fadeOnScroll }
						onChange={ ( val ) =>
							setAttributes( { fadeOnScroll: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Overflow', 'sgs-blocks' ) }
						help={ __(
							'Whether image can extend beyond parent boundaries',
							'sgs-blocks'
						) }
						value={ overflow }
						options={ OVERFLOW_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { overflow: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Responsive Overrides', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Responsive overrides', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								hideOnTablet: false,
								hideOnMobile: false,
								positionX: { desktop: 50 },
								positionY: { desktop: 50 },
								rotation: { desktop: 0 },
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hide on tablet', 'sgs-blocks' ) }
							hasValue={ () => hideOnTablet !== false }
							onDeselect={ () =>
								setAttributes( { hideOnTablet: false } )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Hide on tablet', 'sgs-blocks' ) }
								checked={ hideOnTablet }
								onChange={ ( val ) =>
									setAttributes( { hideOnTablet: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Hide on mobile', 'sgs-blocks' ) }
							hasValue={ () => hideOnMobile !== false }
							onDeselect={ () =>
								setAttributes( { hideOnMobile: false } )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Hide on mobile', 'sgs-blocks' ) }
								checked={ hideOnMobile }
								onChange={ ( val ) =>
									setAttributes( { hideOnMobile: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Position X (%)', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( positionX ) !==
								JSON.stringify( { desktop: 50 } )
							}
							onDeselect={ () =>
								setAttributes( { positionX: { desktop: 50 } } )
							}
							isShownByDefault
						>
							{ /* `positionX` is a TIER OBJECT (Spec 35 pass) — ONE attr
							     holding {desktop,tablet,mobile}, so it uses
							     ResponsiveOverride. `positionXTablet`/`positionXMobile`
							     are no longer declared by block.json. */ }
							<ResponsiveOverride
								label={ __( 'Position X (%)', 'sgs-blocks' ) }
								value={ positionX }
								onChange={ ( obj ) =>
									setAttributes( { positionX: obj } )
								}
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<RangeControl
										help={
											inherited
												? __(
														'Leave empty to use desktop value',
														'sgs-blocks'
												  )
												: undefined
										}
										value={
											ownValue || effectiveValue || 50
										}
										onChange={ ( v ) => setOwnValue( v ) }
										min={ 0 }
										max={ 100 }
										step={ 1 }
										allowReset={ inherited }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Position Y (%)', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( positionY ) !==
								JSON.stringify( { desktop: 50 } )
							}
							onDeselect={ () =>
								setAttributes( { positionY: { desktop: 50 } } )
							}
						>
							{ /* `positionY` is a TIER OBJECT — same shape as `positionX`
							     above. */ }
							<ResponsiveOverride
								label={ __( 'Position Y (%)', 'sgs-blocks' ) }
								value={ positionY }
								onChange={ ( obj ) =>
									setAttributes( { positionY: obj } )
								}
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<RangeControl
										help={
											inherited
												? __(
														'Leave empty to use desktop value',
														'sgs-blocks'
												  )
												: undefined
										}
										value={
											ownValue || effectiveValue || 50
										}
										onChange={ ( v ) => setOwnValue( v ) }
										min={ 0 }
										max={ 100 }
										step={ 1 }
										allowReset={ inherited }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Rotation (degrees)', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( rotation ) !==
								JSON.stringify( { desktop: 0 } )
							}
							onDeselect={ () =>
								setAttributes( { rotation: { desktop: 0 } } )
							}
						>
							{ /* `rotation` is a TIER OBJECT — same shape as `positionX`/
							     `positionY` above. */ }
							<ResponsiveOverride
								label={ __(
									'Rotation (degrees)',
									'sgs-blocks'
								) }
								value={ rotation }
								onChange={ ( obj ) =>
									setAttributes( { rotation: obj } )
								}
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<RangeControl
										help={
											inherited
												? __(
														'Leave empty to use desktop value',
														'sgs-blocks'
												  )
												: undefined
										}
										value={
											ownValue || effectiveValue || 0
										}
										onChange={ ( v ) => setOwnValue( v ) }
										min={ -180 }
										max={ 180 }
										step={ 5 }
										allowReset={ inherited }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! effectiveMedia && 0 === blockCount && (
					<div className="sgs-decorative-image-editor__placeholder">
						<MediaPicker
							value={ null }
							onChange={ onSelectMedia }
							onRemove={ onRemoveMedia }
							label={ __( 'Choose image', 'sgs-blocks' ) }
							instructionsImage={ __(
								'Or add blocks to float text, a label or a badge.',
								'sgs-blocks'
							) }
						/>
					</div>
				) }
				<div className="sgs-decorative-image-editor__preview-wrapper">
					<div
						className="sgs-decorative-image-editor__preview-container"
						style={ { position: 'relative', minHeight: '400px' } }
					>
						<div
							className={ [
								'sgs-decorative-image-editor__layer',
								'sgs-decorative-image--layer',
								effectiveMedia
									? 'sgs-decorative-image--over-image'
									: '',
								mediaWantsBox ? 'sgs-media-box' : '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							style={ {
								...layerStyle,
								...boxStyle,
								...mediaBoxStyle,
							} }
						>
							{ effectiveMedia &&
								'video' === effectiveMedia.type && (
									<video
										src={ effectiveMedia.url }
										autoPlay
										muted
										loop
										playsInline
										className="sgs-decorative-image__media sgs-media-el"
										style={ mediaElementStyle }
									/>
								) }
							{ effectiveMedia &&
								'video' !== effectiveMedia.type && (
									<img
										src={ effectiveMedia.url }
										alt={
											effectiveMedia.alt ||
											__(
												'Decorative image preview',
												'sgs-blocks'
											)
										}
										className="sgs-decorative-image__media sgs-media-el"
										style={ mediaElementStyle }
									/>
								) }
							<div { ...innerBlocksProps } />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
