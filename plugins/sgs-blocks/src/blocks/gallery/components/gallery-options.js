/**
 * Gallery inspector option lists: layout, easing and hover effect.
 */
import { __ } from '@wordpress/i18n';
import { CSS_EASING_OPTIONS as EASING_OPTIONS } from '../../../components/motion/easing-master-list';
export { EASING_OPTIONS };

// -------------------------------------------------------------------------
// Static option arrays (defined outside component to avoid re-creation)
// -------------------------------------------------------------------------

export const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Swipe row (no arrows)', 'sgs-blocks' ), value: 'scroll' },
	{ label: __( 'Carousel (arrows and dots)', 'sgs-blocks' ), value: 'carousel' },
];

