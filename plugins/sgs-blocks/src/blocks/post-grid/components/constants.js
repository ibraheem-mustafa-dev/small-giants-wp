/**
 * Post Grid — static option lists for the inspector panels.
 */
import { __ } from '@wordpress/i18n';
import { MEDIA_SIZING_RATIO_OPTIONS } from '../../../components';

export const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'List', 'sgs-blocks' ), value: 'list' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
];

export const CARD_STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
];

export const PAGINATION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Standard (page numbers)', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Load More button', 'sgs-blocks' ), value: 'load-more' },
	{ label: __( 'Infinite scroll', 'sgs-blocks' ), value: 'infinite' },
];

export const ORDER_BY_OPTIONS = [
	{ label: __( 'Date', 'sgs-blocks' ), value: 'date' },
	{ label: __( 'Title', 'sgs-blocks' ), value: 'title' },
	{ label: __( 'Last modified', 'sgs-blocks' ), value: 'modified' },
	{ label: __( 'Random', 'sgs-blocks' ), value: 'rand' },
	{ label: __( 'Comment count', 'sgs-blocks' ), value: 'comment_count' },
];

export const ORDER_OPTIONS = [
	{ label: __( 'Descending (newest first)', 'sgs-blocks' ), value: 'desc' },
	{ label: __( 'Ascending (oldest first)', 'sgs-blocks' ), value: 'asc' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// seven-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set (which included a "Default" empty-string
// option and unspaced ratios not shared with any other block). render.php
// now whitelists against this exact six-value set, falling back to this
// block's own existing default ('16/10') for anything outside it — so an
// existing ''/`16/10`/`3/2` stored value keeps rendering exactly as before
// rather than breaking.
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

export const FILTER_TAXONOMY_OPTIONS = [
	{ label: __( 'Category', 'sgs-blocks' ), value: 'category' },
	{ label: __( 'Tag', 'sgs-blocks' ), value: 'post_tag' },
];
