/**
 * Shared editor-canvas mirror of the surface-ground backdrop filter
 * (`surfaceBlur` / `surfaceSaturate`) — U-1 commit 4e.
 *
 * Extracted from `sgs/site-header`'s `float-preview.js::floatPreview`, the
 * ONLY block that had built this mirror before this fan-out reached the
 * other 7 `<BackgroundPanel>` blocks. Built EXACTLY the way `floatPreview`
 * built it (saturate first, then blur — matches the order
 * `includes/helpers-surface-ground.php::sgs_surface_backdrop_decls()` emits
 * server-side), so a block's canvas preview agrees with what the published
 * page renders.
 *
 * ⛔ Keep in step with `sgs_surface_backdrop_decls()`. If they disagree, the
 * editor lies about what the page will look like — the exact failure a
 * canvas preview exists to prevent.
 *
 * @package SGS\Blocks
 */

/**
 * @param {Object} attributes Block attributes (reads `surfaceBlur` / `surfaceSaturate`).
 * @return {{backdropFilter?: string, WebkitBackdropFilter?: string}} A partial
 *   style object — `{}` when neither attribute is set.
 */
import { surfaceToneClass } from './surface-tone';

/**
 * The `sgs-on-dark` / `sgs-on-light` class a wrapper block's canvas carries: the same top-down
 * layers `SGS_Container_Wrapper` judges on the page (overlay colour or gradient at the overlay's
 * own opacity, the background image, which is never sampled, then the background gradient, then
 * the flat colour), through the same rule (`surfaceToneClass`).
 *
 * @param {Object} attributes      Block attributes (only the background ones are read).
 * @param {Array}  palette         Theme colour palette.
 * @param {Array}  [gradients=[]]  Theme gradient presets; without them a preset gradient is unknown.
 * @return {string} 'sgs-on-dark', 'sgs-on-light' or ''.
 */
export function wrapperToneClass( attributes, palette, gradients = [] ) {
	const {
		backgroundOverlayColour,
		overlayGradient,
		backgroundOverlayOpacity,
		backgroundImage,
		backgroundColourGradient,
		backgroundColour,
		surfaceTone,
	} = attributes || {};
	// "Surface tone" set to Light or Dark overrides the judgement, exactly as
	// SGS_Container_Wrapper does on the frontend.
	if ( 'dark' === surfaceTone ) {
		return 'sgs-on-dark';
	}
	if ( 'light' === surfaceTone ) {
		return 'sgs-on-light';
	}
	const opacityDesktop =
		backgroundOverlayOpacity && 'object' === typeof backgroundOverlayOpacity
			? backgroundOverlayOpacity.desktop
			: backgroundOverlayOpacity;
	const parsed = parseFloat( opacityDesktop );
	const overlayOpacity = Number.isNaN( parsed ) ? 1 : Math.max( 0, Math.min( 1, parsed / 100 ) );
	const layers = [];
	if ( overlayGradient ) {
		layers.push( { gradient: overlayGradient, opacity: overlayOpacity } );
	} else if ( backgroundOverlayColour ) {
		layers.push( { colour: backgroundOverlayColour, opacity: overlayOpacity } );
	}
	if ( backgroundImage?.url ) {
		layers.push( { image: true } );
	}
	if ( backgroundColourGradient ) {
		layers.push( { gradient: backgroundColourGradient, opacity: 1 } );
	}
	if ( backgroundColour ) {
		layers.push( { colour: backgroundColour, opacity: 1 } );
	}
	return surfaceToneClass( layers, palette, gradients );
}

export function surfaceBackdropPreview( attributes ) {
	const { surfaceBlur, surfaceSaturate } = attributes || {};
	const filterParts = [];
	if ( typeof surfaceSaturate === 'number' ) {
		filterParts.push( `saturate(${ surfaceSaturate }%)` );
	}
	if ( surfaceBlur ) {
		filterParts.push( `blur(${ surfaceBlur })` );
	}
	if ( ! filterParts.length ) {
		return {};
	}
	return {
		backdropFilter: filterParts.join( ' ' ),
		WebkitBackdropFilter: filterParts.join( ' ' ),
	};
}
