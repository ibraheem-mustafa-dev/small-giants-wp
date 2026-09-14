import { __ } from '@wordpress/i18n';
import {
	SgsLengthControl,
	ResponsiveBoxControl,
	SgsBorderControl,
	ShadowControl,
	shadowAttrKeys,
} from '../../components';
import {
	ToolsPanel,
	ToolsPanelItem,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) —
 * Styles tab: "Submenu — Container" (Spec 41 §9.9).
 *
 * Merged from nav-menu/DropdownStylePanel.js (the bar's full version) and the
 * drawer's own heavily-trimmed copy (D1059 split + D1060 ruling 6,
 * 2026-09-14 reconciliation) — the two versions genuinely diverge, per the
 * split plan's own Step 3: the bar's floating dropdown needs sizing/shadow
 * controls the drawer's inline accordion row has no use for.
 *
 * `showSizingControls` (bar `true`, drawer `false`) gates every control the
 * drawer's own block.json does NOT declare an attribute for — confirmed by
 * reading `nav-drawer-menu/block.json` directly (no `submenuAnimation`,
 * `submenuTopOffset`, `submenuMinWidth`, `submenuBorderRadius`,
 * `submenuShadow`, `submenuShadowColour` entries). Rendering these
 * unconditionally would write to attributes the drawer's manifest doesn't
 * declare — a dead control (D338), which `check-dead-controls.js` bans:
 *   - "Open animation" (`submenuAnimation`) — BAR-only. The drawer's
 *     accordion is native `<details>`; opening is a display toggle, not an
 *     animated disclosure.
 *   - "Distance below the bar" (`submenuTopOffset`) — BAR-only; meaningless
 *     for a row that flows inline rather than floating.
 *   - "Minimum width" (`submenuMinWidth`) — DROPPED on the drawer by D1060
 *     ruling 6. The drawer's nested row is exactly as wide as the drawer
 *     panel; a minimum width has nothing to protect against.
 *   - "Box shadow" (`submenuShadow`/`submenuShadowColour`) — DROPPED on the
 *     drawer by D1060 ruling 6. A shadow on an inline accordion row (not a
 *     floating panel) has no surface to cast onto.
 *   - The Border control's `radiusValues`/`onRadiusChange`
 *     (`submenuBorderRadius`) — DROPPED on the drawer by D1060 ruling 6.
 * What stays visible on BOTH, unconditionally: "Inner spacing"
 * (`submenuPadding` — BOTH-classified; the bar's own block.json default is
 * `0`, the drawer's is a non-zero bottom-heavy shape, per each block's own
 * block.json) and the Border control's width + style (`submenuBorderWidth`/
 * `submenuBorderStyle`, BOTH-classified).
 *
 * ⛔ SINGLE-STATE THROUGHOUT, and it is ONE reasoning for all of it (FR-41-9).
 * The panel's visibility is a binary open/closed disclosure: once it is open
 * the pointer is always over an interactive CHILD, never over a hoverable
 * moment on the panel itself. So background, border and shadow all take
 * Normal only. The hoverable surface inside the panel is the LINK, which
 * carries the full three-state family.
 * ⛔ Do not give the panel's border-colour row a Hover or Current state.
 *
 * Background and border COLOUR are rows in the shared Colour panel (§9.6 /
 * FR-41-33), which is why `SgsBorderControl` is mounted `showColour={ false }`
 * here. Shadow COLOUR deliberately stays with `ShadowControl`.
 *
 * @param {Object}   root0                       Props.
 * @param {boolean}  root0.showSizingControls    True on `sgs/nav-bar-menu`, false on
 *                                               `sgs/nav-drawer-menu` (see docblock above).
 * @param {string}   [root0.submenuAnimation]    `submenuAnimation` — bar only.
 * @param {string}   [root0.submenuTopOffset]    `submenuTopOffset` — bar only.
 * @param {string}   [root0.submenuMinWidth]     `submenuMinWidth` — bar only.
 * @param {Object}   root0.submenuPadding        `submenuPadding` — responsive tier object, BOTH.
 * @param {Object}   root0.submenuBorderWidth    `submenuBorderWidth`, BOTH.
 * @param {string}   root0.submenuBorderStyle    `submenuBorderStyle`, BOTH.
 * @param {Object}   [root0.submenuBorderRadius] `submenuBorderRadius` — bar only.
 * @param {string}   [root0.submenuShadow]       `submenuShadow` — bar only. Named explicitly,
 *                                               not read off `attributes`, so the attribute
 *                                               name appears in `edit.js` where
 *                                               inspector-scan rule 21's corpus can see it.
 * @param {string}   [root0.submenuShadowColour] `submenuShadowColour` — bar only.
 * @param {Object}   [root0.attributes]          Full attributes — `ShadowControl` reads and
 *                                               writes its own key pair (bar only).
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function DropdownStylePanel( {
	showSizingControls,
	submenuAnimation,
	submenuTopOffset,
	submenuMinWidth,
	submenuPadding,
	submenuBorderWidth,
	submenuBorderStyle,
	submenuBorderRadius,
	submenuShadow,
	submenuShadowColour,
	attributes,
	setAttributes,
} ) {
	return (
		<ToolsPanel
			label={ __( 'Submenu — Container', 'sgs-blocks' ) }
			resetAll={ () =>
				setAttributes( {
					...( showSizingControls
						? {
								submenuAnimation: 'none',
								submenuTopOffset: '',
								submenuMinWidth: '',
								submenuBorderRadius: {},
						  }
						: {} ),
					submenuPadding: {},
					submenuBorderWidth: {},
					submenuBorderStyle: '',
				} )
			}
		>
			{ showSizingControls && (
				<ToolsPanelItem
					hasValue={ () => !! submenuAnimation && 'none' !== submenuAnimation }
					label={ __( 'Open animation', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { submenuAnimation: 'none' } ) }
				>
					<ToggleGroupControl
						label={ __( 'Open animation', 'sgs-blocks' ) }
						value={ submenuAnimation || 'none' }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						onChange={ ( val ) =>
							setAttributes( { submenuAnimation: val || 'none' } )
						}
					>
						<ToggleGroupControlOption
							value="none"
							label={ __( 'None', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="fade"
							label={ __( 'Fade', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="slide"
							label={ __( 'Slide', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
				</ToolsPanelItem>
			) }

			{ showSizingControls && (
				<ToolsPanelItem
					hasValue={ () => !! submenuTopOffset }
					label={ __( 'Distance below the bar', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { submenuTopOffset: '' } ) }
				>
					<SgsLengthControl
						label={ __( 'Distance below the bar', 'sgs-blocks' ) }
						value={ submenuTopOffset }
						onChange={ ( val ) => setAttributes( { submenuTopOffset: val || '' } ) }
						help={ __(
							'The gap between the menu bar and the dropdown. A larger gap looks airier, but the pointer has further to travel — the dropdown bridges the gap so it does not close on the way down.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
				</ToolsPanelItem>
			) }

			{ showSizingControls && (
				<ToolsPanelItem
					hasValue={ () => !! submenuMinWidth }
					label={ __( 'Minimum width', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { submenuMinWidth: '' } ) }
				>
					<SgsLengthControl
						label={ __( 'Minimum width', 'sgs-blocks' ) }
						value={ submenuMinWidth }
						onChange={ ( val ) => setAttributes( { submenuMinWidth: val || '' } ) }
						help={ __(
							'Stops a dropdown shrinking to the width of its shortest link.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
				</ToolsPanelItem>
			) }

			<ToolsPanelItem
				hasValue={ () =>
					Object.keys( submenuPadding?.desktop || {} ).length > 0 ||
					Object.keys( submenuPadding?.tablet || {} ).length > 0 ||
					Object.keys( submenuPadding?.mobile || {} ).length > 0
				}
				label={ __( 'Inner spacing', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { submenuPadding: {} } ) }
			>
				{ /* Migrated 2026-08-19 to a responsive tier object, matching
				   nav-drawer's drawerPadding shape. */ }
				<ResponsiveBoxControl
					label={ __( 'Inner spacing', 'sgs-blocks' ) }
					presets
					values={ {
						base: submenuPadding?.desktop ?? {},
						tablet: submenuPadding?.tablet ?? {},
						mobile: submenuPadding?.mobile ?? {},
					} }
					onChange={ ( tier, next ) => {
						const key = tier === 'base' ? 'desktop' : tier;
						setAttributes( {
							submenuPadding: { ...submenuPadding, [ key ]: next },
						} );
					} }
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () =>
					Object.keys( submenuBorderWidth || {} ).length > 0 ||
					!! submenuBorderStyle ||
					( showSizingControls &&
						Object.keys( submenuBorderRadius || {} ).length > 0 )
				}
				label={ __( 'Border', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( {
						submenuBorderWidth: {},
						submenuBorderStyle: '',
						...( showSizingControls ? { submenuBorderRadius: {} } : {} ),
					} )
				}
			>
				<SgsBorderControl
					label={ __( 'Border', 'sgs-blocks' ) }
					showColour={ false }
					widthValues={ submenuBorderWidth || {} }
					onWidthChange={ ( next ) =>
						setAttributes( { submenuBorderWidth: next || {} } )
					}
					styleValue={ submenuBorderStyle }
					onStyleChange={ ( next ) =>
						setAttributes( { submenuBorderStyle: next || '' } )
					}
					{ ...( showSizingControls
						? {
								radiusValues: submenuBorderRadius || {},
								onRadiusChange: ( next ) =>
									setAttributes( { submenuBorderRadius: next || {} } ),
						  }
						: {} ) }
				/>
			</ToolsPanelItem>

			{ /* ⛔ `shadowAttrKeys( 'submenuShadow' )` with NO options returns exactly
			   `{ base, colour }` — the documented single-state form. The PHP twin
			   `sgs_shadow_attr_map( 'submenuShadow' )` takes the same no-options call,
			   and BOTH sides must carry the same opt-in or JS binds a key the block
			   never declares and the editor silently discards every write to it
			   (D338). ⛔ Shadow is gradient-exempt by mechanism: `box-shadow` takes a
			   colour, and a gradient there is invalid CSS the browser drops. */ }
			{ showSizingControls && (
				<ToolsPanelItem
					hasValue={ () => !! submenuShadow || !! submenuShadowColour }
					label={ __( 'Box shadow', 'sgs-blocks' ) }
					onDeselect={ () =>
						setAttributes( { submenuShadow: '', submenuShadowColour: '' } )
					}
				>
					<ShadowControl
						label={ __( 'Box shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'submenuShadow' ) }
					/>
				</ToolsPanelItem>
			) }
		</ToolsPanel>
	);
}
