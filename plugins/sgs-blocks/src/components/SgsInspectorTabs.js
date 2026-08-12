/**
 * SGS's own Content / Style / Advanced inspector tab bar (D4,
 * `.claude/plans/go-track-1b-playful-hamster.md`, corrected via /qc-council
 * 2026-08-12).
 *
 * Only for a block where `isTabBarEligible( name )` is true (no native
 * colour/border/typography/spacing/shadow support declared) — otherwise
 * WordPress's own native Settings/Styles tab strip would render ALONGSIDE
 * this one, since core's tab strip can't be suppressed from a block's own
 * code (verified against the live WP 7.0.4 bundle, not just trunk).
 *
 * Renders exactly ONE `<InspectorControls>` fill (default group) containing
 * a 3-tab `TabPanel` — the public, documented `@wordpress/components` API,
 * not the private `unlock( componentsPrivateApis ).Tabs` core uses
 * internally for its own sidebar (that API is explicitly marked "will break
 * in the next version of WordPress").
 *
 * `SGS_STYLE_TAB_SLOT`/`SGS_ADVANCED_TAB_SLOT` are the Fill targets the 7
 * shared universal extensions (animation/fx/hover-effects/image-controls/
 * parallax/custom-css/block-defaults) route into for an eligible block,
 * instead of native `group="styles"`/`InspectorAdvancedControls` — see
 * `./inspectorTabRouting.js`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { TabPanel, Slot } from '@wordpress/components';
import { cog, styles, tool } from '@wordpress/icons';
import './SgsInspectorTabs.css';

export const SGS_STYLE_TAB_SLOT = 'sgs-inspector-tabs-style';
export const SGS_ADVANCED_TAB_SLOT = 'sgs-inspector-tabs-advanced';
// A SECOND, dedicated Advanced-tab slot that always renders LAST — Custom
// CSS (custom-css.js) targets this one specifically so it reliably sits at
// the bottom of the Advanced tab regardless of extension-file registration
// order, rather than racing Save as Default / Visibility conditions for
// Fill-mount order in the shared SGS_ADVANCED_TAB_SLOT.
export const SGS_ADVANCED_TAB_BOTTOM_SLOT = 'sgs-inspector-tabs-advanced-bottom';

const TABS = [
	{
		name: 'content',
		title: __( 'Content', 'sgs-blocks' ),
		icon: cog,
		className: 'sgs-inspector-tabs__tab-content',
	},
	{
		name: 'style',
		title: __( 'Style', 'sgs-blocks' ),
		icon: styles,
		className: 'sgs-inspector-tabs__tab-style',
	},
	{
		name: 'advanced',
		title: __( 'Advanced', 'sgs-blocks' ),
		icon: tool,
		className: 'sgs-inspector-tabs__tab-advanced',
	},
];

/**
 * @param {Object}      props
 * @param {import('react').ReactNode} props.content  Content-tab panels (this block's own).
 * @param {import('react').ReactNode} props.style    Style-tab panels (this block's own, appearance).
 * @param {import('react').ReactNode} props.advanced Advanced-tab panels (this block's own, if any).
 */
export default function SgsInspectorTabs( { content, style, advanced } ) {
	return (
		<InspectorControls>
			<TabPanel className="sgs-inspector-tabs" tabs={ TABS }>
				{ ( tab ) => {
					if ( 'content' === tab.name ) {
						return content || null;
					}
					if ( 'style' === tab.name ) {
						return (
							<>
								{ style || null }
								<Slot name={ SGS_STYLE_TAB_SLOT } bubblesVirtually />
							</>
						);
					}
					return (
						<>
							{ advanced || null }
							<Slot name={ SGS_ADVANCED_TAB_SLOT } bubblesVirtually />
							{ /* Native WordPress "advanced" group — HTML anchor / CSS
							     class, auto-populated by core supports.anchor/
							     customClassName. Pulled in here so it sits inside the
							     tab instead of leaking out as a separate collapsed
							     panel underneath the whole tab strip. */ }
							<InspectorControls.Slot group="advanced" bubblesVirtually />
							<Slot name={ SGS_ADVANCED_TAB_BOTTOM_SLOT } bubblesVirtually />
						</>
					);
				} }
			</TabPanel>
		</InspectorControls>
	);
}
