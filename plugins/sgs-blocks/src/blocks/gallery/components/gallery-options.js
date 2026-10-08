/**
 * Gallery inspector option lists: layout, aspect ratio, image size, easing and hover effect.
 */
import { __ } from '@wordpress/i18n';
import { MEDIA_SIZING_RATIO_OPTIONS } from '../../../components';

// -------------------------------------------------------------------------
// Static option arrays (defined outside component to avoid re-creation)
// -------------------------------------------------------------------------

export const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// seven-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set. render.php's char-filter sanitiser
// ($sgs_css_ratio) is untouched — it already accepts both spaced and
// unspaced values safely, so no PHP change is needed here. The dropped
// "Natural (no crop)" (value: '') option is no longer offered in the UI;
// any post already storing '' keeps rendering with no forced ratio exactly
// as before, since render.php's `if ( $aspect_ratio )` check is unchanged.
export const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;

export const IMAGE_SIZE_OPTIONS = [
	{ label: __( 'Thumbnail (150×150)', 'sgs-blocks' ), value: 'thumbnail' },
	{ label: __( 'Medium (300×300)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Medium large (768w)', 'sgs-blocks' ), value: 'medium_large' },
	{ label: __( 'Large (1024×1024)', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Full size', 'sgs-blocks' ), value: 'full' },
];

export const EASING_OPTIONS = [
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

export const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Zoom', 'sgs-blocks' ), value: 'zoom' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Overlay Slide', 'sgs-blocks' ), value: 'overlay-slide' },
];
