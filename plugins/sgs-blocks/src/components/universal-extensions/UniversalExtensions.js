/**
 * UniversalExtensions — convenience wrapper that renders all 5 SGS universal
 * inspector panels in one import.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  IMPORTANT — when to use this component                                 │
 * │                                                                         │
 * │  The 5 universal extensions are ALREADY wired globally via WordPress    │
 * │  block editor filters (addFilter 'editor.BlockEdit') registered in      │
 * │  src/blocks/extensions/. Every sgs/* block AND every core block that    │
 * │  supports className already receives these panels automatically.        │
 * │                                                                         │
 * │  Import <UniversalExtensions> only when you need the panels at a        │
 * │  SPECIFIC position inside your block's inspector rather than appended   │
 * │  at the end by the global extension. Adding it without care will        │
 * │  produce DUPLICATE panels.                                              │
 * │                                                                         │
 * │  If you just want to verify the controls exist, open ANY SGS block in   │
 * │  the block editor — the panels are already there.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Skip guidance (for blocks where a panel doesn't apply):
 * - Animation:           tab, accordion-item, form-step, form-review,
 *                        form-field-* (child/inner blocks — never scroll targets)
 * - HoverEffects:        blocks with supports.className === false (none currently)
 * - DeviceVisibility:    blocks with supports.className === false (none currently)
 * - CustomCss:           blocks with supports.className === false (none currently)
 * - ConditionalVisibility: blocks with supports.className === false (none currently)
 * - All extensions:      sgs/header, sgs/footer template parts — animation and
 *                        hover on structural layout blocks is not meaningful
 *
 * @package SGS\Blocks
 */
import DeviceVisibilityPanel from './DeviceVisibilityPanel';
import HoverEffectsPanel from './HoverEffectsPanel';
import AnimationPanel from './AnimationPanel';
import CustomCssPanel from './CustomCssPanel';
import ConditionalVisibilityPanel from './ConditionalVisibilityPanel';

export {
	DeviceVisibilityPanel,
	HoverEffectsPanel,
	AnimationPanel,
	CustomCssPanel,
	ConditionalVisibilityPanel,
};

/**
 * UniversalExtensions component.
 *
 * Renders all 5 universal extension panels. Import individual panels above
 * if you only need a subset.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @param {boolean}  [props.skipAnimation=false]   Omit Animation panel (use for inner/child blocks).
 * @param {boolean}  [props.skipHover=false]        Omit Hover Effects panel.
 * @param {boolean}  [props.skipVisibility=false]   Omit Device Visibility panel.
 * @param {boolean}  [props.skipCustomCss=false]    Omit Custom CSS panel.
 * @param {boolean}  [props.skipConditions=false]   Omit Conditional Visibility panel.
 * @return {JSX.Element|null} All applicable Inspector panels.
 */
export default function UniversalExtensions( {
	attributes,
	setAttributes,
	skipAnimation = false,
	skipHover = false,
	skipVisibility = false,
	skipCustomCss = false,
	skipConditions = false,
} ) {
	return (
		<>
			{ ! skipVisibility && (
				<DeviceVisibilityPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
			{ ! skipHover && (
				<HoverEffectsPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
			{ ! skipAnimation && (
				<AnimationPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
			{ ! skipCustomCss && (
				<CustomCssPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
			{ ! skipConditions && (
				<ConditionalVisibilityPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
		</>
	);
}
