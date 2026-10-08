import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useSettings,
	MediaPlaceholder,
	MediaUploadCheck,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	SgsColourPanel,
	textRow,
	MediaPanelLayout,
	mediaElementScopeClass,
	mediaElementCustomProperties,
} from '../../components';
import { MEDIA_ATOM_IDS } from '../../components/media/atoms/registry.js';
import { fillsBox } from '../../components/media/canvasStyle.js';
import { usePreviewTier, typographyPreviewStyle, textPaintPreview, resolveTier } from '../../utils';
import TypographyPanel from './components/TypographyPanel';
import MediaStylingPanel from './components/MediaStylingPanel';
import VideoPanel from './components/VideoPanel';
import SvgCanvas from './components/SvgCanvas';
import LottieCanvas from './components/LottieCanvas';
import VideoCanvas from './components/VideoCanvas';

/**
 * Allowed CSS length units for the media styling controls. Mirrors the
 * server-side sgs_media_validate_unit() allowlist so the editor cannot emit a
 * unit render.php would reject.
 */
/**
 * Playback options (autoplay/loop/muted/controls/plays-inline/lazy-load) are
 * now owned entirely by the `video-behaviour` atom (Wave 5b, 2026-09-01),
 * mounted via `MediaPanelLayout`'s "Playback" section — the hand-rolled
 * `PLAYBACK_TIERS` reset map + "Playback Options" `ToolsPanel` this file used
 * to own here are gone; the atom's own control renders each of the same 6
 * bases through the shared tiered `BooleanResponsiveControl`.
 */

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
export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		// Shared.
		mediaType,
		// Image.
		imageUrl,
		imageAlt,
		imageDecorative,
		// Video.
		videoUrl,
		videoSource,
		// SVG.
		svgContent,
		svgAnimation,
		svgAnimationSpeed,
		// Lottie (U-17, design §3.1).
		lottieId,
		thumbnail,
	} = attributes;

	const previewTier = usePreviewTier();
	// Placement the front end emits on the scope selector: the alignment margins (render.php
	// step 6) and the flex/grid item order. The margins sit on the picture itself in image and
	// SVG mode, because the canvas figure fills its row and only the picture is narrower; the
	// caption stays full width beneath it. Other modes keep them on the wrapper.
	const orderAtTier = resolveTier( attributes.order, previewTier ).value;
	const alignMargins =
		'center' === attributes.alignment
			? { marginInlineStart: 'auto', marginInlineEnd: 'auto' }
			: 'end' === attributes.alignment
				? { marginInlineStart: 'auto' }
				: {};
	const alignsPicture = 'svg' === attributes.mediaType || 'image' === attributes.mediaType || ! attributes.mediaType;
	const placementStyle = {
		...( alignsPicture ? {} : alignMargins ),
		...( '' !== orderAtTier && null != orderAtTier ? { order: parseInt( orderAtTier, 10 ) } : {} ),
	};
	const blockProps = useBlockProps( { style: placementStyle } );
	// The caption element (image and video only), styled like render.php's
	// scoped caption rules.
	const captionText = String( attributes.caption || '' );
	const CaptionTag = 'div' === attributes.captionTag ? 'div' : 'figcaption';
	const captionStyle = {
		...typographyPreviewStyle( attributes, 'caption', previewTier ),
		...textPaintPreview( attributes.captionColour, attributes.captionColourGradient ),
	};

	// -------------------------------------------------------------------------
	// Helpers.
	// -------------------------------------------------------------------------
	const isImage = 'image' === mediaType || ! mediaType;
	const isVideo = 'video' === mediaType;
	const isSvg = 'svg' === mediaType;
	const isLottie = 'lottie' === mediaType;

	// -------------------------------------------------------------------------
	// Media-atom canvas mirror (Wave 5-7 gap, closed 2026-09-01).
	//
	// render.php applies the `.sgs-media-el` marker + this element's own
	// scope class + every atom's custom-property VALUES so the shared
	// `assets/css/media-element.css` stylesheet paints object-fit/opacity/
	// shadow/etc on the FRONTEND. Nothing on the editor side ever did the
	// same, so the canvas <img>/<svg> never visibly reacted to those
	// inspector controls even though the underlying attribute was written
	// correctly — confirmed live via Playwright before this fix (`opacity`/
	// `object-fit` computed styles stayed at their CSS defaults regardless
	// of the panel value). `sgs/media` is unprefixed and uses every atom
	// (MediaPanelLayout.js mounts all 16 unprefixed), so the full
	// MEDIA_ATOM_IDS set applies here.
	const mediaScopeClass = mediaElementScopeClass( clientId, '' );
	// The theme's hover map (settings.custom.shadowHover, design H1) — read here (a React
	// component) and threaded into the shadow atom's automatic lift, which cannot call
	// useSettings() itself (canvasStyle.js's atoms must stay plain-Node importable).
	const [ shadowHoverSettings ] = useSettings( 'custom' );
	const mediaElementStyle = mediaElementCustomProperties( {
		attributes,
		blockSlug: 'sgs/media',
		atoms: MEDIA_ATOM_IDS,
		extra: { hoverMap: shadowHoverSettings?.shadowHover },
	} );
	// The box marker is a no-op until the `overlay` atom has a colour/gradient
	// set (media-element.css's own docblock: "no custom properties set means
	// the pseudo-element paints fully transparent") — unlike render.php's
	// naked-mode branch, the editor canvas always wraps in a <figure>, so
	// there is no wrapper-avoidance case to gate here.
	const mediaBoxStyle = mediaElementCustomProperties( {
		attributes,
		blockSlug: 'sgs/media',
		atoms: MEDIA_ATOM_IDS.filter( ( id ) => 'overlay' === id ),
	} );
	const mediaElementClassName = [ 'sgs-media__img', 'sgs-media-el', mediaScopeClass ]
		.filter( Boolean )
		.join( ' ' );
	// Box shape "Fill": the frame is sized by the layout, the picture covers it
	// (same modifier render.php adds via SGS_Media_Element::fills_box()).
	const mediaFills = fillsBox( { attributes, blockSlug: 'sgs/media', atoms: MEDIA_ATOM_IDS } );
	const mediaBoxClassName = [ 'sgs-media-box', mediaFills ? 'sgs-media-box--fill' : '', mediaScopeClass ].filter( Boolean ).join( ' ' );

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


	// -------------------------------------------------------------------------
	// Inspector controls.
	// -------------------------------------------------------------------------
	const inspectorControls = (
		<>
			{ /* GROUND-TRUTH: block.json attributes.captionColour (no default,
			   type string) + render.php:404-424 ($caption_colour, styled onto
			   the caption element) — confirmed 2026-08-15 against the live
			   source before wiring this row. captionColourHover/
			   captionColourHoverGradient added 2026-09-07 (colour-conformance
			   batch) via textRow() — no background paint exists on
			   .sgs-media__caption at any state, so this is a plain text-
			   gradient row, no precondition swap needed.
			   boxShadowColour row (D621/D622) added 2026-08-16 — colour lives
			   here, shape stays with ShadowControl in the Media Styling
			   ToolsPanel below, per the shared colour-architecture. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						attrs: {
							base: 'captionColour',
							hover: 'captionColourHover',
							gradient: 'captionColourGradient',
							hoverGradient: 'captionColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls group="styles">
				{ /* Media type switch + per-type source/meaning/svg-presentation +
				     Image Styling (object-fit/focal-point/motion) + Box & Border
				     (box-shape) + Playback (video-behaviour) + Overlay — the full
				     Wave 5b atom layer (MediaPanelLayout.js). Replaces the old
				     hand-rolled media-type ButtonGroup, the Image panel's
				     Replace/Remove + art-direction + decorative/alt controls, the
				     SVG content/animation controls, the Video source/URL/poster
				     workflow, the old Media Styling ToolsPanel's sizing/border
				     rows, and the old Playback Options ToolsPanel — all now owned
				     by the atom layer. This block's Media Styling ToolsPanel
				     (further below) keeps only Alignment/Opacity/Box shadow, none
				     of which any atom owns.
				     Moved from the default (Settings) group to Styles 2026-09-07:
				     object-fit/box/border/overlay/shadow here are pure styling —
				     mounted first, adjacent to "Caption typography" below, so the
				     block's styling panels stay together on the Styles tab. Media
				     Type/Source/Playback ride along in this one component mount
				     (MediaPanelLayout.js is not owned by this task and cannot be
				     split without touching it — flagged in the session report). */ }
				<MediaPanelLayout
					group="styles"
					attributes={ attributes }
					setAttributes={ setAttributes }
					mediaType={ mediaType || 'image' }
					blockSlug="sgs/media"
					previewUrl={ isImage ? imageUrl : '' }
				/>
				<TypographyPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>
			<InspectorControls>
				{ /* SETTINGS half of the atom layer (2026-09-07): media type,
				     source/alt, video playback, caption + link target. These are
				     what the media IS and how it behaves; the appearance half
				     (Image Styling / Box & Border / Overlay) mounts on the Styles
				     tab above with `group="styles"`.
				     Split because mounting the whole component into one tab put
				     "choose your image" — the client's commonest action — on the
				     wrong tab. Mounted FIRST so source selection is the first
				     thing in Settings. */ }
				<MediaPanelLayout
					group="settings"
					attributes={ attributes }
					setAttributes={ setAttributes }
					mediaType={ mediaType || 'image' }
					blockSlug="sgs/media"
					previewUrl={ isImage ? imageUrl : '' }
				/>

			{ /* Media styling — writes the block's NATIVE styling attributes
			     (single source of truth the cloning converter also writes).
			     ToolsPanel (dense-panel-candidate, Spec 35 wave-B T-item-2):
			     9 independent optional settings — objectFit / maxWidth / alignment
			     are the highest-frequency per-instance tweaks so they stay
			     isShownByDefault; the rest are one click away via "+". */ }
			{ ( isImage || isVideo ) && (
				<MediaStylingPanel attributes={ attributes } setAttributes={ setAttributes } />
			) }

			{ /* Caption & link are now owned entirely by the `caption`/`link`
			     atoms, mounted via MediaPanelLayout's own "Caption & Link"
			     PanelBody (mounted above) — this old hand-rolled panel is
			     fully superseded (Wave 5c, 2026-09-01). */ }

			{ /* SVG content + animation/speed/position/opacity/text-shadow/
			     min-height are now owned by the `source` and
			     `svg-presentation` atoms in MediaPanelLayout (mounted above)
			     — this old hand-rolled SVG panel is fully superseded. */ }

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
				<VideoPanel attributes={ attributes } setAttributes={ setAttributes } videoUrl={ videoUrl } />
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
			<figure
				{ ...blockProps }
				className={ [ blockProps.className, mediaBoxClassName ].filter( Boolean ).join( ' ' ) }
				style={ { ...blockProps.style, ...mediaBoxStyle } }
			>
				{ inspectorControls }
				<img
					src={ imageUrl }
					width={ attributes.imageWidth || undefined }
					height={ attributes.imageHeight || undefined }
					alt={ imageDecorative ? '' : imageAlt }
					aria-hidden={ imageDecorative ? 'true' : undefined }
					className={ mediaElementClassName }
					style={ { ...mediaElementStyle, ...alignMargins } }
				/>
				{ captionText && (
					<CaptionTag className="sgs-media__caption" style={ captionStyle }>
						{ captionText }
					</CaptionTag>
				) }
			</figure>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — SVG mode.
	// -------------------------------------------------------------------------
	if ( isSvg ) {
		return (
			<SvgCanvas
				blockProps={ blockProps }
				inspectorControls={ inspectorControls }
				svgContent={ svgContent }
				svgAnimation={ svgAnimation }
				svgAnimationSpeed={ svgAnimationSpeed }
				mediaBoxClassName={ mediaBoxClassName }
				mediaBoxStyle={ mediaBoxStyle }
				mediaScopeClass={ mediaScopeClass }
				mediaElementStyle={ mediaElementStyle }
				alignMargins={ alignMargins }
			/>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — Lottie mode (U-17, design §3.1). The editor never plays the
	// animation (design §3.3 — `editor_story: no-preview`); it shows the
	// poster with a "Lottie" badge, matching how the video path is a
	// non-playing preview in this same canvas.
	// -------------------------------------------------------------------------
	if ( isLottie ) {
		return <LottieCanvas blockProps={ blockProps } inspectorControls={ inspectorControls } lottieId={ lottieId } thumbnail={ thumbnail } />;
	}

	// -------------------------------------------------------------------------
	// Canvas — video mode.
	// -------------------------------------------------------------------------
	return (
		<VideoCanvas
			blockProps={ blockProps }
			inspectorControls={ inspectorControls }
			attributes={ attributes }
			videoUrl={ videoUrl }
			videoSource={ videoSource }
			previewTier={ previewTier }
			onSelectVideo={ onSelectVideo }
		/>
	);
}
