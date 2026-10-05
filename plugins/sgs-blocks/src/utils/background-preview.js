import { resolveColourToken } from '../components/DesignTokenPicker';
import { sanitiseSvg } from './sanitise-svg';
import { surfaceBackdropPreview, wrapperToneClass } from './surface-preview';
import { motionEasingCss } from '../components/MotionEasingControl';


/**
 * Shared editor-canvas mirror of the container/composite background stack —
 * background image / video, overlay (colour or gradient, opacity, blend
 * mode), ken-burns, and parallax.
 *
 * Every block mounting the shared `BackgroundPanel`
 * (`src/blocks/container/components/ContainerWrapperControls.js`) shows the
 * same live preview the published page paints.
 *
 * Mirrors the PHP single source of truth exactly:
 *  - `sgs_background_paint_decl()` / `sgs_overlay_decls()` (helpers-tokens.php)
 *  - `SGS_Container_Wrapper::render()` (class-sgs-container-wrapper.php) — the
 *    shared frontend renderer every adopting block (container, hero,
 *    multi-button, physics-canvas, site-footer, site-header, trust-bar) goes
 *    through, per the composite wrapper rule (CLAUDE.md).
 *
 * The `bgSvg*` decorative-SVG layer is mirrored separately by
 * `svgBackgroundPreview()` below.
 *
 * ⛔ Keep this in step with the PHP path. If they disagree, the editor lies
 * about what the page will look like — which is the failure this mirror
 * exists to prevent.
 */

// The same allowlist `sgs_overlay_decls()` (helpers-tokens.php) enforces
// server-side — mirrored here rather than trusted as "any string is harmless
// in CSS", so the editor preview and the frontend refuse the identical
// out-of-enum set, not just a similar one.
/** A CSS gradient function (what `sgs_css_gradient_value()` accepts). */
const CSS_GRADIENT = /^(repeating-)?(linear|radial|conic)-gradient\(/i;
/** The same, as the whole value with no `; { } < >`, for CSS text written into a stylesheet. */
const CSS_GRADIENT_WHOLE = /^(repeating-)?(linear|radial|conic)-gradient\([^;{}<>]*\)$/i;

/**
 * Is this value a CSS gradient function?
 *
 * @param {*}       value               Stored attribute value.
 * @param {Object}  [options]
 * @param {boolean} [options.whole=false] Require the whole value to be one gradient that is
 *                                        safe to write into a stylesheet.
 * @return {boolean} True for a linear/radial/conic (or repeating) gradient.
 */
export function isCssGradient( value, { whole = false } = {} ) {
	return 'string' === typeof value && ( whole ? CSS_GRADIENT_WHOLE : CSS_GRADIENT ).test( value.trim() );
}

export const OVERLAY_BLEND_MODES = [
	'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
	'color-burn', 'soft-light', 'hard-light', 'difference', 'exclusion',
];

/**
 * Resolve a flat colour + its sibling gradient to a paintable BACKGROUND
 * preview — mirrors `sgs_background_paint_decl()` (helpers-tokens.php): a
 * valid gradient always wins over the flat colour. The gradient attribute
 * stores a complete, already-valid CSS gradient function (validated
 * server-side by `sgs_css_gradient_value()` on save/render), so the editor
 * preview can use it verbatim — only the FLAT colour can be a design-token
 * slug that needs `resolveColourToken()` against the live palette (D288).
 *
 * @param {string} colour   Flat colour attribute value (slug or CSS colour).
 * @param {string} gradient Sibling gradient attribute value.
 * @param {Array}  palette  Active theme colour palette.
 * @return {Object} A partial style object — {} when both inputs are empty.
 */
export function backgroundPaintPreview( colour, gradient, palette ) {
	if ( gradient ) {
		return { backgroundImage: gradient };
	}
	const resolved = resolveColourToken( colour, palette );
	return resolved ? { backgroundColor: resolved } : {};
}

/**
 * Shared editor-canvas mirror of a TEXT colour/gradient pair, for every block
 * carrying a `*Colour`/`*ColourGradient` text-paint pair.
 *
 * Mirrors `sgs_text_colour_decl()`: a gradient renders via `background-image`
 * + `background-clip:text` + `color:transparent` (the gradient-text
 * technique), a flat colour renders via `color`. The frontend emitter also
 * carries an `@supports not (background-clip:text)` fallback for older
 * browsers — deliberately NOT reproduced here: this is an EDITOR preview
 * rendering directly in a real evergreen browser (Chrome/Edge/Firefox
 * current, WP admin's supported matrix), not static CSS generated for
 * unknown public-site visitors, so the fallback has nothing to guard against
 * in this context.
 *
 * @param {string} colour   Flat colour attribute value (slug or CSS colour).
 * @param {string} gradient Sibling gradient attribute value.
 * @param {Array}  palette  Active theme colour palette.
 * @return {Object} A partial style object — {} when both inputs are empty.
 */
export function textPaintPreview( colour, gradient, palette ) {
	if ( gradient ) {
		return {
			backgroundImage: gradient,
			WebkitBackgroundClip: 'text',
			backgroundClip: 'text',
			color: 'transparent',
		};
	}
	const resolved = resolveColourToken( colour, palette );
	return resolved ? { color: resolved } : {};
}

/**
 * Shared editor-canvas mirror of a BORDER colour/gradient pair.
 *
 * A flat `borderColour` resolves directly to `border-color`. A gradient
 * border is APPROXIMATED via `border-image` — the real frontend renders a
 * gradient border as a masked `::before` ring (a technique a plain inline
 * style cannot reproduce), so this is deliberately an approximation that at
 * least shows a gradient is applied, not a pixel-faithful mirror. Only
 * applied when the value matches a real CSS gradient function, so a
 * non-gradient value (or an unset one) never emits a nonsense border-image.
 *
 * @param {string} colour   Flat border colour attribute value.
 * @param {string} gradient Sibling border gradient attribute value.
 * @param {Array}  palette  Active theme colour palette.
 * @return {Object} A partial style object — {} when both inputs are empty.
 */
export function borderPaintPreview( colour, gradient, palette ) {
	const style = {};
	if ( colour ) {
		const resolved = resolveColourToken( colour, palette );
		if ( resolved ) style.borderColor = resolved;
	}
	if ( isCssGradient( gradient ) ) {
		style.borderImage = `${ gradient } 1`;
	}
	return style;
}

/**
 * Resolve an OVERLAY layer (colour/gradient/opacity/blend-mode) to a
 * paintable canvas preview — mirrors `sgs_overlay_decls()` (helpers-tokens.php)
 * exactly, the single shared owner `class-sgs-container-wrapper.php` and
 * `sgs/hero`'s `.sgs-hero__overlay` both call server-side (D717/D718: "the
 * EXISTENCE test IS the shared helper's return value" — colour/gradient/
 * opacity/blend-mode are ONE decision, not layered ad hoc). Resting state
 * only (P2-4b scope) — hover and responsive opacity tiers are deferred.
 *
 * @param {string}        colour    `backgroundOverlayColour` attribute value.
 * @param {string}        gradient  `overlayGradient` attribute value.
 * @param {number|string} opacity   `backgroundOverlayOpacity`, 0-100. 100/empty/
 *                                   null emits no opacity override (CSS default).
 * @param {string}        blendMode `backgroundOverlayBlendMode` attribute value.
 * @param {Array}         palette   Active theme colour palette.
 * @return {{hasOverlay: boolean, vars: Object}} CSS custom properties for the
 *                   `::after` mirror in the shared editor stylesheet, plus a
 *                   `hasOverlay` flag — `{}` / `false` when there is nothing
 *                   to paint, mirroring the PHP helper's `''`.
 */
export function overlayPaintPreview( colour, gradient, opacity, blendMode, palette ) {
	const paint = backgroundPaintPreview( colour, gradient, palette );
	if ( ! paint.backgroundImage && ! paint.backgroundColor ) {
		return { hasOverlay: false, vars: {} };
	}
	const vars = {
		'--sgs-ed-overlay-image': paint.backgroundImage || 'none',
		'--sgs-ed-overlay-colour': paint.backgroundColor || 'transparent',
	};
	const numericOpacity = parseFloat( opacity );
	if ( '' !== opacity && null != opacity && ! Number.isNaN( numericOpacity ) ) {
		const pct = Math.max( 0, Math.min( 100, numericOpacity ) );
		if ( 100 !== pct ) {
			vars[ '--sgs-ed-overlay-opacity' ] = pct / 100;
		}
	}
	if ( blendMode && 'normal' !== blendMode && OVERLAY_BLEND_MODES.includes( blendMode ) ) {
		vars[ '--sgs-ed-overlay-blend' ] = blendMode;
	}
	return { hasOverlay: true, vars };
}

/**
 * The background image the wrapper's media layer shows at a device tier: its
 * `@media (max-width:1023px)` rule swaps in the tablet image and its
 * `(max-width:767px)` rule the mobile one, so mobile falls back to tablet, then
 * desktop ('' when the tier has no image of its own and desktop has none).
 *
 * @param {Object} desktop Desktop image object (`{url}`).
 * @param {Object} tablet  Tablet image object, or empty.
 * @param {Object} mobile  Mobile image object, or empty.
 * @param {string} tier    'desktop' | 'tablet' | 'mobile'.
 * @return {string} The image URL for the tier.
 */
export function tierBackgroundImageUrl( desktop, tablet, mobile, tier ) {
	if ( 'mobile' === tier && mobile?.url ) {
		return mobile.url;
	}
	if ( ( 'mobile' === tier || 'tablet' === tier ) && tablet?.url ) {
		return tablet.url;
	}
	return desktop?.url || '';
}

/**
 * Build the FULL editor-canvas background/overlay/ken-burns/parallax preview
 * for any block mounting the shared `BackgroundPanel` — a `style` object of
 * CSS custom properties to merge into the block's own `blockProps.style`,
 * plus a `className` string to merge into `blockProps.className` so the
 * matching `::before` (media) / `::after` (overlay) rules in the shared
 * editor stylesheet (`assets/css/extensions.css`) only attach to a block
 * instance that actually has something to paint.
 *
 * Video is NOT previewed inline (too complex for a static editor canvas) —
 * a themed placeholder colour stands in for it instead, matching
 * `sgs/container`'s original behaviour exactly.
 *
 * `sgs-container--parallax` is deliberately NOT renamed to an `sgs-ed-*`
 * marker: it is a REAL frontend class (`class-sgs-container-wrapper.php`
 * ~:1604), applied by the shared wrapper to every block that renders through
 * it — not container-specific despite the name — so the editor mirrors that
 * exact class rather than inventing a parallel one.
 *
 * @param {Object} attributes    Full block attributes object — pass the
 *                                 block's own `attributes` verbatim.
 * @param {Array}  colourPalette Active theme colour palette
 *                                 (`useSettings('color.palette')`).
 * @param {Array}  [gradientPresets] Active theme gradient presets
 *                                 (`useSettings('color.gradients')`). Optional,
 *                                 defaults to `[]` — with no list given, a
 *                                 PRESET gradient (`var(--wp--preset--gradient--slug)`
 *                                 or a bare slug) cannot be resolved to its
 *                                 stops, so `surfaceToneClass()` yields unknown
 *                                 (no class) for that case; a LITERAL gradient
 *                                 function string still resolves regardless.
 * @param {string} [tier]      Previewed device tier (`usePreviewTier()`). The
 *                                 tablet/mobile image replaces the desktop one on
 *                                 the same media layer, as the wrapper's
 *                                 `@media` overrides do. Defaults to desktop.
 * @return {{style: Object, hasBgMedia: boolean, hasOverlay: boolean, hasParallax: boolean, className: string}}
 */
export function backgroundPreview( attributes, colourPalette, gradientPresets = [], tier = 'desktop' ) {
	const {
		backgroundImage,
		backgroundImageTablet,
		backgroundImageMobile,
		bgVideo,
		bgLottie,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundAttachment,
		bgKenBurns = false,
		bgAnimationDuration = 20,
		bgParallax = false,
		bgHoverZoom = false,
		bgHoverZoomScale = 105,
		bgHoverZoomDuration = 600,
		bgHoverZoomEasing = 'ease',
		bgHoverZoomEasingCustom = '',
		backgroundOverlayColour,
		overlayGradient,
		backgroundOverlayOpacity,
		backgroundOverlayBlendMode,
		backgroundColourGradient,
		backgroundColour,
	} = attributes;

	const hasBgImage = !! backgroundImage?.url;
	const hasBgVideo = !! bgVideo?.url;
	const hasBgLottie = ! hasBgImage && ! hasBgVideo && !! bgLottie;
	const hasBgMedia = hasBgImage && ! hasBgVideo;
	// Background zoom on hover — mirrors includes/container-bg-hover-zoom.php (same clamps,
	// same easing resolution, off while Ken Burns or parallax moves the image).
	const bgZoom = bgHoverZoom && hasBgMedia && ! bgKenBurns && ! bgParallax;

	const overlayPreview = overlayPaintPreview(
		backgroundOverlayColour,
		overlayGradient,
		backgroundOverlayOpacity,
		backgroundOverlayBlendMode,
		colourPalette
	);

	const style = {
		// Media is handed to a ::before layer via custom properties rather than
		// painted on the element, MIRRORING the frontend (Phase 1, 2026-08-08).
		// The editor is the surface clients actually work in, so it has to agree.
		...( hasBgMedia && {
			'--sgs-ed-bg-image': `url(${ tierBackgroundImageUrl( backgroundImage, backgroundImageTablet, backgroundImageMobile, tier ) })`,
			'--sgs-ed-bg-size': backgroundSize || 'cover',
			'--sgs-ed-bg-position': backgroundPosition || 'center center',
			'--sgs-ed-bg-repeat': backgroundRepeat || 'no-repeat',
			'--sgs-ed-bg-attachment': backgroundAttachment === 'fixed' ? 'fixed' : 'scroll',
		} ),
		...( hasBgVideo && {
			// Show a teal placeholder in editor when video is set
			backgroundColor: 'var(--wp--preset--color--primary, #0F7E80)',
		} ),
		...( hasBgLottie && {
			// Same placeholder-only treatment as bgVideo (Tier H Lottie player,
			// D1151): the editor never mounts the real player, so a flat
			// placeholder is the only honest preview — bgLottieLoop has no
			// static-frame effect to show either way.
			backgroundColor: 'var(--wp--preset--color--primary, #0F7E80)',
		} ),
		...( bgKenBurns && hasBgImage && {
			'--sgs-ken-burns-duration': `${ bgAnimationDuration }s`,
		} ),
		...( bgZoom && {
			'--sgs-ed-bg-zoom': String( Math.max( 101, Math.min( 150, Number( bgHoverZoomScale ) || 105 ) ) / 100 ),
			'--sgs-ed-bg-zoom-duration': `${ Math.max( 0, Math.min( 3000, Math.round( Number( bgHoverZoomDuration ) || 0 ) ) ) }ms`,
			'--sgs-ed-bg-zoom-easing': motionEasingCss( bgHoverZoomEasing || 'ease', bgHoverZoomEasingCustom, 'ease' ),
		} ),
		// Overlay layer — a ::after mirror in the shared editor stylesheet, same
		// reasoning as the background-image ::before above: painting it on the
		// element itself would dim the client's real content, not just the
		// decorative layer.
		...overlayPreview.vars,
		// Surface ground (backdrop blur + saturate, U-1 commit 4e) — painted on
		// the block itself (not a pseudo-element mirror), matching how
		// `sgs/site-header`'s own `floatPreview` already applied it: `{}` when
		// neither attribute is set.
		...surfaceBackdropPreview( attributes ),
	};

	// The same surface-tone class the wrapper adds on the page.
	const toneClass = wrapperToneClass( attributes, colourPalette, gradientPresets );

	// Gate the ::before media layer / ::after overlay layer on marker classes
	// so the pseudo-elements exist ONLY on instances that actually have
	// something to paint — every other instance in the canvas is untouched
	// (mirrors the frontend, where the layer's box properties are only
	// emitted when there is media/overlay to paint).
	const className = [
		hasBgMedia ? 'sgs-ed-has-bg-media' : '',
		bgParallax ? 'sgs-container--parallax' : '',
		bgZoom ? 'sgs-ed-bg-hover-zoom' : '',
		overlayPreview.hasOverlay ? 'sgs-ed-has-overlay' : '',
		toneClass,
	]
		.filter( Boolean )
		.join( ' ' );

	return {
		style,
		hasBgMedia,
		hasOverlay: overlayPreview.hasOverlay,
		hasParallax: !! bgParallax,
		className,
	};
}

/* ==========================================================================
 * SVG background layer — editor-canvas mirror
 * ==========================================================================
 *
 * WHY THIS SHAPE (and not the `--sgs-ed-*` custom-property + `::before`
 * approach the image/video half above uses): the frontend's SVG layer is a
 * REAL ELEMENT, and every rule that paints it already ships in the block's
 * `style.css` — which `block.json`'s `style` field loads into the editor
 * canvas as well as the front end. So rendering the SAME element with the
 * SAME class names makes the EXISTING stylesheet do all the work: opacity,
 * foreground/background stacking, the four animation modes and all three
 * speeds, with ZERO new CSS and no second vocabulary to drift.
 * (`src/blocks/container/style.css:294-310` paints the layer;
 * `:349-392` the animations.)
 *
 * Mirrors `SGS_Container_Wrapper::render()` exactly:
 *  - classes            class-sgs-container-wrapper.php:1634-1641
 *  - layer markup       :2794-2798
 *  - position routing   :2801-2802
 *  - --sgs-svg-opacity  :2750  (scoped to `.{uid} .sgs-container__svg-bg`
 *                              server-side; set here on the block wrapper
 *                              instead, where it inherits to the same layer —
 *                              the editor has no per-instance uid stylesheet)
 *  - --sgs-svg-min-height :1403-1404
 *
 * ⛔ Keep the enum allowlists below in step with the PHP. They are the same
 * three the server validates against (:958-970); an out-of-enum value must
 * fall back to the SAME default on both sides or the canvas lies about what
 * the page will render.
 *
 * ⛔ The SVG is sanitised through the shared `sanitiseSvg()` before it is ever
 * handed to `dangerouslySetInnerHTML`. That helper's allowlist is GENERATED
 * from the server's own `sgs_svg_kses_allowed_tags()` and gate-checked, so the
 * two sides refuse the identical set rather than merely a similar one.
 */

const SVG_POSITIONS = [ 'background', 'foreground' ];
const SVG_ANIMATIONS = [ 'none', 'pulse', 'float', 'wave' ];
const SVG_SPEEDS = [ 'slow', 'medium', 'fast' ];

/**
 * Editor-canvas mirror of the wrapper's decorative SVG background layer.
 *
 * @param {Object} attributes Block attributes (reads the `bgSvg*` family).
 * @return {{hasSvg: boolean, className: string[], style: Object, markup: string, position: string}}
 *   `markup` is ALREADY SANITISED and safe for `dangerouslySetInnerHTML`.
 */
export function svgBackgroundPreview( attributes ) {
	const {
		bgSvgContent = '',
		bgSvgPosition = 'background',
		bgSvgAnimation = 'none',
		bgSvgAnimationSpeed = 'medium',
		bgSvgOpacity = 100,
		bgSvgMinHeight = '',
		bgSvgTextShadow = false,
	} = attributes || {};

	// `$has_bg_svg = ! empty( $bg_svg_content )` — the single gate the whole
	// server-side block sits behind (class-sgs-container-wrapper.php:975).
	const hasSvg = !! ( bgSvgContent && String( bgSvgContent ).trim() );
	if ( ! hasSvg ) {
		return { hasSvg: false, className: [], style: {}, markup: '', position: 'background' };
	}

	const position = SVG_POSITIONS.includes( bgSvgPosition ) ? bgSvgPosition : 'background';
	const animation = SVG_ANIMATIONS.includes( bgSvgAnimation ) ? bgSvgAnimation : 'none';
	const speed = SVG_SPEEDS.includes( bgSvgAnimationSpeed ) ? bgSvgAnimationSpeed : 'medium';

	// `absint()` server-side: negatives become their absolute value, non-numeric
	// becomes 0. Mirrored rather than clamped so an out-of-range value shows the
	// same thing in both places.
	const rawOpacity = Math.abs( parseInt( bgSvgOpacity, 10 ) );
	const opacity = Number.isNaN( rawOpacity ) ? 100 : rawOpacity;

	const className = [
		'sgs-container--has-bg-svg',
		`sgs-container--svg-${ position }`,
		`sgs-container--svg-anim-${ animation }`,
		`sgs-container--svg-speed-${ speed }`,
	];
	if ( bgSvgTextShadow ) {
		className.push( 'sgs-container--svg-text-shadow' );
	}

	const style = { '--sgs-svg-opacity': String( opacity / 100 ) };
	if ( bgSvgMinHeight ) {
		style[ '--sgs-svg-min-height' ] = bgSvgMinHeight;
		className.push( 'sgs-container--has-svg-min-height' );
	}

	return {
		hasSvg: true,
		className,
		style,
		markup: sanitiseSvg( String( bgSvgContent ) ),
		position,
	};
}
