/**
 * Drop-in replacements for `<InspectorControls group="styles">` and
 * `<InspectorAdvancedControls>` used by the 7 shared universal extensions
 * (animation/fx/hover-effects/image-controls/parallax/custom-css/
 * block-defaults). Routes each extension's panel to the right destination
 * per block, WITHOUT the extension file itself needing to know which:
 *
 * - `isTabBarEligible( name )` true  → the SGS tab bar's own Style/Advanced
 *   `Slot` (via `SgsInspectorTabs`, `./blocks/decorative-image/edit.js` etc).
 * - `isTabBarEligible( name )` false → today's native `group="styles"` /
 *   `InspectorAdvancedControls`, completely unchanged.
 *
 * D4, `.claude/plans/go-track-1b-playful-hamster.md`, corrected via
 * /qc-council 2026-08-12.
 *
 * @package SGS\Blocks
 */
import { InspectorControls, InspectorAdvancedControls } from '@wordpress/block-editor';
import { Fill } from '@wordpress/components';
import { isTabBarEligible } from './hide-extensions';
import {
	SGS_STYLE_TAB_SLOT,
	SGS_ADVANCED_TAB_SLOT,
	SGS_ADVANCED_TAB_BOTTOM_SLOT,
} from '../../components/SgsInspectorTabs';

/**
 * @param {Object} props
 * @param {string} props.name     Block name, e.g. 'sgs/decorative-image'.
 * @param {import('react').ReactNode} props.children
 */
export function SgsStyleTabDestination( { name, children } ) {
	if ( isTabBarEligible( name ) ) {
		return <Fill name={ SGS_STYLE_TAB_SLOT }>{ children }</Fill>;
	}
	return <InspectorControls group="styles">{ children }</InspectorControls>;
}

/**
 * @param {Object} props
 * @param {string} props.name     Block name, e.g. 'sgs/decorative-image'.
 * @param {import('react').ReactNode} props.children
 */
export function SgsAdvancedTabDestination( { name, children } ) {
	if ( isTabBarEligible( name ) ) {
		return <Fill name={ SGS_ADVANCED_TAB_SLOT }>{ children }</Fill>;
	}
	return <InspectorAdvancedControls>{ children }</InspectorAdvancedControls>;
}

/**
 * Same as {@link SgsAdvancedTabDestination}, but for content that must
 * render at the very BOTTOM of the Advanced tab (e.g. Custom CSS), rather
 * than racing other extensions for Fill-mount order in the shared slot.
 *
 * @param {Object} props
 * @param {string} props.name     Block name, e.g. 'sgs/decorative-image'.
 * @param {import('react').ReactNode} props.children
 */
export function SgsAdvancedTabBottomDestination( { name, children } ) {
	if ( isTabBarEligible( name ) ) {
		return <Fill name={ SGS_ADVANCED_TAB_BOTTOM_SLOT }>{ children }</Fill>;
	}
	return <InspectorAdvancedControls>{ children }</InspectorAdvancedControls>;
}
