/**
 * Post Grid — static option lists for the inspector panels.
 */
import { __ } from '@wordpress/i18n';

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

export const FILTER_TAXONOMY_OPTIONS = [
	{ label: __( 'Category', 'sgs-blocks' ), value: 'category' },
	{ label: __( 'Tag', 'sgs-blocks' ), value: 'post_tag' },
];
