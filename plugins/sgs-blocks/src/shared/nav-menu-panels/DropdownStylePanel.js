import { __ } from '@wordpress/i18n';
import {
	SgsLengthControl,
	ResponsiveBoxControl,
	SgsBorderControl,
	ShadowControl,
	shadowAttrKeys,
} from '../../components';
import { SelectControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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
 * ⚑ ADDED 2026-09-17 (P-NAV-MENU-BORDER-CENSUS-DELEGATED follow-up): a second
 * `SgsBorderControl` mount for the SUBLINK's own border shape
 * (`submenuLinkBorderWidth`/`submenuLinkBorderStyle`, BOTH-classified) — a
 * genuinely distinct element from the panel's own border above it
 * (`.sgs-nav-bar-menu__sublink` vs `.sgs-nav-bar-menu__submenu`, block.json's
 * `sublink` vs `submenu-panel` element manifest entries). render.php
 * (`includes/nav-menu-submenu-link-css.php::sgs_nav_shared_submenu_link_css()`)
 * already emitted this CSS; there was no editor control anywhere to reach it
 * — a genuine control gap, not a dead attribute (verified live: zero matches
 * for either attr name in any edit.js/panel file before this change). Colour
 * (`submenuLinkBorderColour`/`Hover`) stays a row in each block's own Colour
 * panel, matching the split above — `showColour={ false }` here too.
 *
 * @param {Object}   root0                          Props.
 * @param {boolean}  root0.showSizingControls       True on `sgs/nav-bar-menu`, false on
 *                                                  `sgs/nav-drawer-menu` (see docblock above).
 * @param {string}   [root0.submenuAnimation]       `submenuAnimation` — bar only.
 * @param {string}   [root0.submenuTopOffset]       `submenuTopOffset` — bar only.
 * @param {string}   [root0.submenuMinWidth]        `submenuMinWidth` — bar only.
 * @param {Object}   root0.submenuPadding           `submenuPadding` — responsive tier object, BOTH.
 * @param {Object}   root0.submenuBorderWidth       `submenuBorderWidth`, BOTH.
 * @param {string}   root0.submenuBorderStyle       `submenuBorderStyle`, BOTH.
 * @param {Object}   [root0.submenuBorderRadius]    `submenuBorderRadius` — bar only.
 * @param {Object}   root0.submenuLinkBorderWidth   `submenuLinkBorderWidth`, BOTH.
 * @param {string}   root0.submenuLinkBorderStyle   `submenuLinkBorderStyle`, BOTH.
 * @param {string}   [root0.submenuShadow]          `submenuShadow` — bar only. Named explicitly,
 *                                                  not read off `attributes`, so the attribute
 *                                                  name appears in `edit.js` where
 *                                                  inspector-scan rule 21's corpus can see it.
 * @param {string}   [root0.submenuShadowColour]    `submenuShadowColour` — bar only.
 * @param {Object}   [root0.attributes]             Full attributes — `ShadowControl` reads and
 *                                                  writes its own key pair (bar only).
 * @param {Function} root0.setAttributes            The block's attribute setter.
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
	submenuLinkBorderWidth,
	submenuLinkBorderStyle,
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
					submenuLinkBorderWidth: {},
					submenuLinkBorderStyle: '',
				} )
			}
		>
			{ showSizingControls && (
				<ToolsPanelItem
					hasValue={ () => !! submenuAnimation && 'none' !== submenuAnimation }
					label={ __( 'Open and close animation', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { submenuAnimation: 'none' } ) }
				>
					<SelectControl
						label={ __( 'Open and close animation', 'sgs-blocks' ) }
						help={ __(
							'Applies to every dropdown and mega panel. Timing and item stagger are in the Panel motion panel.',
							'sgs-blocks'
						) }
						value={ submenuAnimation || 'none' }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Fade', 'sgs-blocks' ), value: 'fade' },
							{ label: __( 'Fade and lift', 'sgs-blocks' ), value: 'fade-lift' },
							{ label: __( 'Slide down', 'sgs-blocks' ), value: 'slide-down' },
							{ label: __( 'Grow downwards', 'sgs-blocks' ), value: 'grow' },
						] }
						onChange={ ( val ) =>
							setAttributes( { submenuAnimation: val || 'none' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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

			<ToolsPanelItem
				hasValue={ () =>
					Object.keys( submenuLinkBorderWidth || {} ).length > 0 ||
					!! submenuLinkBorderStyle
				}
				label={ __( 'Link border', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( {
						submenuLinkBorderWidth: {},
						submenuLinkBorderStyle: '',
					} )
				}
			>
				<SgsBorderControl
					label={ __( 'Link border', 'sgs-blocks' ) }
					showColour={ false }
					widthValues={ submenuLinkBorderWidth || {} }
					onWidthChange={ ( next ) =>
						setAttributes( { submenuLinkBorderWidth: next || {} } )
					}
					styleValue={ submenuLinkBorderStyle }
					onStyleChange={ ( next ) =>
						setAttributes( { submenuLinkBorderStyle: next || '' } )
					}
				/>
				<p className="components-base-control__help">
					{ __(
						'The colour of this border — resting and on hover — is in the Colour panel above, so you can match it against the link’s text and background.',
						'sgs-blocks'
					) }
				</p>
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
