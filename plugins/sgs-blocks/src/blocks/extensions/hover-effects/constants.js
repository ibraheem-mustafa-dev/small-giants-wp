/**
 * Hover Effects extension — shared option lists.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ./index.js). Pure data, no behaviour.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

export const SCALE_PRESET_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle (1.02)', 'sgs-blocks' ), value: '1.02' },
	{ label: __( 'Medium (1.05)', 'sgs-blocks' ), value: '1.05' },
	{ label: __( 'Strong (1.1)', 'sgs-blocks' ), value: '1.1' },
];

/**
 * Duration options sourced from theme.json settings.custom.duration tokens.
 * CSS custom property: var(--wp--custom--duration--{slug})
 */
export const DURATION_OPTIONS = [
	{ label: __( 'Instant (60ms)', 'sgs-blocks' ), value: 'instant' },
	{ label: __( 'Fast (150ms)', 'sgs-blocks' ), value: 'fast' },
	{ label: __( 'Medium (300ms)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Slow (500ms)', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Extra slow (800ms)', 'sgs-blocks' ), value: 'extra-slow' },
];

/**
 * Easing options sourced from theme.json settings.custom.easing tokens.
 * CSS custom property: var(--wp--custom--easing--{slug})
 */
export const EASING_OPTIONS = [
	{ label: __( 'Default (Material)', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Spring', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
	{ label: __( 'Custom curve…', 'sgs-blocks' ), value: 'custom' },
];
