import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { ResponsiveControl, ResponsiveOverride } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import DecorativeImagePanelLayout from '../../components/media/DecorativeImagePanelLayout';
import { elementCustomProperties, requiresBox } from '../../components/media/canvasStyle';

const OVERFLOW_OPTIONS = [
	{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

const PATH_DRAW_EASING_OPTIONS = [
	{ label: __( 'Ease out (recommended)', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		decorMedia,
		imageId,
		imageUrl,
		imageAlt,
		imageDecorative,
		positionX,
		positionY,
		width,
		maxWidthPercent,
		rotation,
		opacity,
		zIndex,
		flipX,
		parallaxStrength,
		fadeOnScroll,
		overflow,
		hideOnTablet,
		hideOnMobile,
		pathDrawOnScroll,
		pathDrawDurationMs,
		pathDrawTriggerOffset,
		pathDrawEasing,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-decorative-image-editor',
	} );

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

	// positionX/positionY/rotation are TIER OBJECTS (Spec 35 pass) — the
	// editor preview always shows the DESKTOP tier, same as the frontend's
	// unprefixed CSS rule before any @media override applies.
	const positionXDesktop = positionX?.desktop ?? 50;
	const positionYDesktop = positionY?.desktop ?? 50;
	const rotationDesktop = rotation?.desktop ?? 0;
	const widthDesktop = width?.desktop ?? 200;

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

	// Build preview styles for editor.
	const previewStyles = {
		position: 'absolute',
		left: `${ positionXDesktop }%`,
		top: `${ positionYDesktop }%`,
		width: `${ widthDesktop }px`,
		maxWidth: `${ maxWidthPercent }%`,
		opacity: opacity / 100,
		zIndex,
		overflow,
		pointerEvents: 'none',
		transform: [
			'translate(-50%, -50%)',
			rotationDesktop !== 0 && `rotate(${ rotationDesktop }deg)`,
			flipX && 'scaleX(-1)',
		]
			.filter( Boolean )
			.join( ' ' ),
	};

	return (
		<>
			<InspectorControls>
				{ /* Accessibility (Spec 35 item 18) — this block is decorative-by-design
				     (absolute-positioned floating graphic, no InnerBlocks) so the toggle
				     defaults ON/decorative, matching what render.php has always done
				     unconditionally. The rare operator who wants this image to carry a
				     real accessible name can switch it off and set alt text — mirrors
				     sgs/media's imageDecorative control. */ }
				{ effectiveMedia && 'image' === effectiveMedia.type && (
					<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Decorative image', 'sgs-blocks' ) }
							help={ __(
								'On (recommended): hidden from screen readers, since this image adds no information of its own. Turn off only if this image genuinely needs a text description.',
								'sgs-blocks'
							) }
							checked={ imageDecorative ?? true }
							onChange={ ( val ) => setAttributes( { imageDecorative: val } ) }
							__nextHasNoMarginBottom
						/>
						{ ! ( imageDecorative ?? true ) && (
							<TextControl
								label={ __( 'Alt text', 'sgs-blocks' ) }
								value={ imageAlt || '' }
								onChange={ ( val ) => setAttributes( { imageAlt: val } ) }
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
							label={ __( 'Image for this screen size', 'sgs-blocks' ) }
						>
							{ ( bp ) => {
								if ( 'desktop' === bp ) {
									return (
										<p style={ { margin: 0, fontStyle: 'italic' } }>
											{ __(
												'The image chosen for this block is used on desktop. Switch to tablet or mobile to set a different crop.',
												'sgs-blocks'
											) }
										</p>
									);
								}
								const idKey =
									'tablet' === bp ? 'imageIdTablet' : 'imageIdMobile';
								const urlKey =
									'tablet' === bp ? 'imageUrlTablet' : 'imageUrlMobile';
								const tierValue = attributes[ urlKey ]
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
										value={ tierValue }
										allowedTypes={ [ 'image' ] }
										onChange={ ( media ) =>
											setAttributes( {
												[ idKey ]: media ? media.id : undefined,
												[ urlKey ]: media ? media.url : '',
											} )
										}
										onRemove={ () =>
											setAttributes( {
												[ idKey ]: undefined,
												[ urlKey ]: '',
											} )
										}
										label={ __( 'Set image', 'sgs-blocks' ) }
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
						mediaType={ 'video' === effectiveMedia.type ? 'video' : 'image' }
						previewUrl={ 'video' === effectiveMedia.type ? '' : effectiveMedia.url }
					/>
				) }

				{ /* The old bare desktop-only "Position" panel (Position X / Y) was
				     deleted here — it duplicated the tier-aware ResponsiveOverride
				     controls in the "Responsive Overrides" panel below, which cover
				     desktop/tablet/mobile for the same positionX/positionY object
				     attrs. Two controls writing the same attr under the pre-migration
				     flat-scalar shape were merely redundant; under the new tier-object
				     shape they would actively conflict (one control expects a plain
				     number, the other an {desktop,tablet,mobile} object). */ }
				<PanelBody
					title={ __( 'Size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Width (px)', 'sgs-blocks' ) }
						value={ width }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						min={ 50 }
						max={ 800 }
						step={ 10 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Max Width (% of parent)', 'sgs-blocks' ) }
						value={ maxWidthPercent }
						onChange={ ( val ) => setAttributes( { maxWidthPercent: val } ) }
						min={ 0 }
						max={ 50 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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
						onChange={ ( val ) => setAttributes( { opacity: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Z-Index', 'sgs-blocks' ) }
						help={ __( 'Stacking order (above background, below content)', 'sgs-blocks' ) }
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
					<RangeControl
						label={ __( 'Parallax Strength', 'sgs-blocks' ) }
						help={ __( '0 = disabled, 100 = strong scroll effect', 'sgs-blocks' ) }
						value={ parallaxStrength }
						onChange={ ( val ) => setAttributes( { parallaxStrength: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Fade on scroll', 'sgs-blocks' ) }
						help={ __( 'Opacity fades to 0 as image scrolls past the top of the viewport. Disabled when "Reduce motion" is on.', 'sgs-blocks' ) }
						checked={ fadeOnScroll }
						onChange={ ( val ) => setAttributes( { fadeOnScroll: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Overflow', 'sgs-blocks' ) }
						help={ __( 'Whether image can extend beyond parent boundaries', 'sgs-blocks' ) }
						value={ overflow }
						options={ OVERFLOW_OPTIONS }
						onChange={ ( val ) => setAttributes( { overflow: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'SVG Path Draw', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Draw SVG paths on scroll', 'sgs-blocks' ) }
						help={ __( 'When the image scrolls into view, SVG strokes animate in. Only affects SVG files with visible strokes.', 'sgs-blocks' ) }
						checked={ pathDrawOnScroll }
						onChange={ ( val ) => setAttributes( { pathDrawOnScroll: val } ) }
					/>
					{ pathDrawOnScroll && (
						<>
							<RangeControl
								label={ __( 'Draw duration (ms)', 'sgs-blocks' ) }
								help={ __( 'How long the stroke animation takes.', 'sgs-blocks' ) }
								value={ pathDrawDurationMs }
								onChange={ ( val ) => setAttributes( { pathDrawDurationMs: val } ) }
								min={ 300 }
								max={ 4000 }
								step={ 100 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __( 'Trigger offset (%)', 'sgs-blocks' ) }
								help={ __( 'How much of the image must be visible before drawing starts. 20 = 20% visible.', 'sgs-blocks' ) }
								value={ pathDrawTriggerOffset }
								onChange={ ( val ) => setAttributes( { pathDrawTriggerOffset: val } ) }
								min={ 0 }
								max={ 80 }
								step={ 5 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Draw easing', 'sgs-blocks' ) }
								value={ pathDrawEasing }
								options={ PATH_DRAW_EASING_OPTIONS }
								onChange={ ( val ) => setAttributes( { pathDrawEasing: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
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
								width: { desktop: 200 },
								rotation: { desktop: 0 },
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hide on tablet', 'sgs-blocks' ) }
							hasValue={ () => hideOnTablet !== false }
							onDeselect={ () => setAttributes( { hideOnTablet: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Hide on tablet', 'sgs-blocks' ) }
								checked={ hideOnTablet }
								onChange={ ( val ) => setAttributes( { hideOnTablet: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Hide on mobile', 'sgs-blocks' ) }
							hasValue={ () => hideOnMobile !== false }
							onDeselect={ () => setAttributes( { hideOnMobile: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Hide on mobile', 'sgs-blocks' ) }
								checked={ hideOnMobile }
								onChange={ ( val ) => setAttributes( { hideOnMobile: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Position X (%)', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( positionX ) !== JSON.stringify( { desktop: 50 } )
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
								onChange={ ( obj ) => setAttributes( { positionX: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<RangeControl
										help={ inherited ? __( 'Leave empty to use desktop value', 'sgs-blocks' ) : undefined }
										value={ ownValue || effectiveValue || 50 }
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
								JSON.stringify( positionY ) !== JSON.stringify( { desktop: 50 } )
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
								onChange={ ( obj ) => setAttributes( { positionY: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<RangeControl
										help={ inherited ? __( 'Leave empty to use desktop value', 'sgs-blocks' ) : undefined }
										value={ ownValue || effectiveValue || 50 }
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
							label={ __( 'Width (px)', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( width ) !== JSON.stringify( { desktop: 200 } )
							}
							onDeselect={ () =>
								setAttributes( { width: { desktop: 200 } } )
							}
						>
							{ /* `width` is a TIER OBJECT — same shape as `positionX`/
							     `positionY`/`rotation` above. */ }
							<ResponsiveOverride
								label={ __( 'Width (px)', 'sgs-blocks' ) }
								value={ width }
								onChange={ ( obj ) => setAttributes( { width: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<RangeControl
										help={ inherited ? __( 'Leave empty to use desktop value', 'sgs-blocks' ) : undefined }
										value={ ownValue ?? effectiveValue ?? 200 }
										onChange={ ( v ) => setOwnValue( v ) }
										min={ 50 }
										max={ 800 }
										step={ 10 }
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
								JSON.stringify( rotation ) !== JSON.stringify( { desktop: 0 } )
							}
							onDeselect={ () =>
								setAttributes( { rotation: { desktop: 0 } } )
							}
						>
							{ /* `rotation` is a TIER OBJECT — same shape as `positionX`/
							     `positionY` above. */ }
							<ResponsiveOverride
								label={ __( 'Rotation (degrees)', 'sgs-blocks' ) }
								value={ rotation }
								onChange={ ( obj ) => setAttributes( { rotation: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<RangeControl
										help={ inherited ? __( 'Leave empty to use desktop value', 'sgs-blocks' ) : undefined }
										value={ ownValue || effectiveValue || 0 }
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
				{ ! effectiveMedia ? (
					<div className="sgs-decorative-image-editor__placeholder">
						<MediaPicker
							value={ null }
							onChange={ onSelectMedia }
							onRemove={ onRemoveMedia }
							label={ __( 'Select Decorative Media', 'sgs-blocks' ) }
							instructionsImage={ __(
								'Decorative images or videos float absolutely over sections with optional parallax effects.',
								'sgs-blocks'
							) }
						/>
					</div>
				) : (
					<div className="sgs-decorative-image-editor__preview-wrapper">
						<div
							className={ [
								'sgs-decorative-image-editor__preview-container',
								mediaWantsBox ? 'sgs-media-box' : '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							style={ { position: 'relative', minHeight: '400px', ...mediaBoxStyle } }
						>
							{ effectiveMedia.type === 'video' ? (
								<video
									src={ effectiveMedia.url }
									autoPlay
									muted
									loop
									playsInline
									className="sgs-decorative-image-editor__preview sgs-media-el"
									style={ { ...previewStyles, ...mediaElementStyle } }
								/>
							) : (
								<img
									src={ effectiveMedia.url }
									alt={
										effectiveMedia.alt ||
										__( 'Decorative image preview', 'sgs-blocks' )
									}
									className="sgs-decorative-image-editor__preview sgs-media-el"
									style={ { ...previewStyles, ...mediaElementStyle } }
								/>
							) }
						</div>
						<div className="sgs-decorative-image-editor__actions">
							<MediaPicker
								value={ effectiveMedia }
								onChange={ onSelectMedia }
								onRemove={ onRemoveMedia }
								label={ __( 'Replace Media', 'sgs-blocks' ) }
								instructionsImage={ __(
									'Choose an image or video for this decorative slot.',
									'sgs-blocks'
								) }
							/>
						</div>
					</div>
				) }
			</div>
		</>
	);
}
