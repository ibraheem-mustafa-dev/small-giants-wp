// Card grid inspector option lists and card style presets.
import { __ } from '@wordpress/i18n';
import { MEDIA_SIZING_RATIO_OPTIONS } from '../../../components';

export const VARIANT_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
];

// Image overlay (wave B round 2) — same option list/order as the shared
// `MediaOverlayControls.js` BLEND_MODE_OPTIONS (sgs/media's overlay atom),
// hand-mirrored here rather than imported: that component is JSX+opacity+
// blend-mode all in one, and Spec 35's colours-only-in-SgsColourPanel rule
// means this block's own overlay colour/gradient live in SgsColourPanel
// instead, so only the option list is shared, not the component.
export const OVERLAY_BLEND_MODE_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Multiply', 'sgs-blocks' ), value: 'multiply' },
	{ label: __( 'Screen', 'sgs-blocks' ), value: 'screen' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Darken', 'sgs-blocks' ), value: 'darken' },
	{ label: __( 'Lighten', 'sgs-blocks' ), value: 'lighten' },
	{ label: __( 'Colour dodge', 'sgs-blocks' ), value: 'color-dodge' },
	{ label: __( 'Colour burn', 'sgs-blocks' ), value: 'color-burn' },
	{ label: __( 'Soft light', 'sgs-blocks' ), value: 'soft-light' },
	{ label: __( 'Hard light', 'sgs-blocks' ), value: 'hard-light' },
	{ label: __( 'Difference', 'sgs-blocks' ), value: 'difference' },
	{ label: __( 'Exclusion', 'sgs-blocks' ), value: 'exclusion' },
];

// D649 — no JSON `enum` reliance in the UI list order matters less than the
// allow-list itself matching render.php's exactly (mirrors sgs/icon-list).
export const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// seven-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set (which included a non-CSS "auto" value and
// unspaced ratios not shared with any other block). render.php now
// whitelists against this exact six-value set, falling back to this
// block's own existing default ('16/10') for anything outside it — so an
// existing '16/10'/'auto'/'3/2' stored value keeps rendering exactly as
// before rather than breaking.
export const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;

export const HOVER_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Zoom', 'sgs-blocks' ), value: 'zoom' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Overlay Slide', 'sgs-blocks' ), value: 'overlay-slide' },
];

export const EASING_OPTIONS = [
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

export const PRODUCT_COLLECTION_OPTIONS = [
	{ label: __( 'Latest', 'sgs-blocks' ), value: 'latest' },
	{ label: __( 'Best selling', 'sgs-blocks' ), value: 'best-selling' },
	{ label: __( 'Highest price', 'sgs-blocks' ), value: 'price-high' },
	{ label: __( 'Lowest price', 'sgs-blocks' ), value: 'price-low' },
	{ label: __( 'Top rated', 'sgs-blocks' ), value: 'top-rated' },
];

// Card style presets — a CONVENIENCE picker, not stored state. Selecting one
// writes straight into the same 5 attrs the manual controls below read/write
// (cardBackground/cardBorderColour/cardBorderWidth/cardRadius/cardShadow), so
// there is only ever ONE CSS rule per property (no competing
// register_block_style() variation any more — retired 2026-08-11, it always
// lost the specificity fight against these attrs' own scoped rule). Values
// mirror the 4 card-grid inserter variations in
// includes/variations/sgs-card-grid-variations.php — keep both in sync.
export const CARD_STYLE_PRESETS = {
	default: {
		cardBackground: '',
		cardBorderColour: '',
		cardBorderWidth: {},
		cardRadius: '',
		cardShadow: '',
		cardShadowColour: '',
	},
	elevated: {
		cardBackground: 'surface',
		cardBorderColour: '',
		cardBorderWidth: {},
		cardRadius: '8px',
		// Bare preset slug — self-contained (colour baked in by theme.json), so
		// cardShadowColour stays empty; sgs_shadow_value_composed() ignores it
		// for a preset slug.
		cardShadow: 'soft',
		cardShadowColour: '',
	},
	boxed: {
		cardBackground: 'surface',
		cardBorderColour: 'border',
		cardBorderWidth: { top: '1px', right: '1px', bottom: '1px', left: '1px' },
		cardRadius: '8px',
		// Zero-size shape (D621/D622 colour split) — explicitly resets any
		// inherited shadow to none; colour is moot at zero offset/blur/spread.
		cardShadow: '0px 0px 0px 0px',
		cardShadowColour: '',
	},
	borderless: {
		cardBackground: 'transparent',
		cardBorderColour: '',
		cardBorderWidth: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
		cardRadius: '0px',
		cardShadow: '0px 0px 0px 0px',
		cardShadowColour: '',
	},
};

export const CARD_STYLE_PRESET_OPTIONS = [
	{ label: __( 'Choose a preset…', 'sgs-blocks' ), value: '' },
	{ label: __( 'Default', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Boxed', 'sgs-blocks' ), value: 'boxed' },
	{ label: __( 'Borderless', 'sgs-blocks' ), value: 'borderless' },
];
