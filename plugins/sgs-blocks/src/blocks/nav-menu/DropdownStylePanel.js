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
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Submenu — Container" (Spec 41 §9.9).
 *
 * ⚠ RENAMED from "Dropdown (only affects items with sub-items)" now that
 * "Submenu — Items" (§9.8) exists as its sibling. Same `ToolsPanel`, same idiom —
 * every row a `ToolsPanelItem` with `hasValue` / `onDeselect`.
 *
 * ⛔ SINGLE-STATE THROUGHOUT, and it is ONE reasoning for all of it (FR-41-9). The
 * panel's visibility is a binary open/closed disclosure: once it is open the pointer
 * is always over an interactive CHILD, never over a hoverable moment on the panel
 * itself. So background, border and shadow all take Normal only. The hoverable
 * surface inside the panel is the LINK, which carries the full three-state family.
 * ⛔ Do not give the panel's border-colour row a Hover or Current state.
 *
 * Background and border COLOUR are rows in the shared Colour panel (§9.6 /
 * FR-41-33), which is why `SgsBorderControl` is mounted `showColour={ false }` here.
 * Shadow COLOUR deliberately stays with `ShadowControl` — the border exception was
 * taken on a comparison argument, and a floating panel's shadow colour has nothing to
 * compare against in that row set.
 *
 * @param {Object}   root0                       Props.
 * @param {string}   root0.submenuAnimation      `submenuAnimation`.
 * @param {string}   root0.submenuTopOffset      `submenuTopOffset`.
 * @param {string}   root0.submenuMinWidth       `submenuMinWidth`.
 * @param {Object}   root0.submenuPadding        `submenuPadding` — responsive tier object.
 * @param {Object}   root0.submenuBorderWidth    `submenuBorderWidth`.
 * @param {string}   root0.submenuBorderStyle    `submenuBorderStyle`.
 * @param {Object}   root0.submenuBorderRadius   `submenuBorderRadius`.
 * @param {string}   root0.submenuShadow         `submenuShadow` — named explicitly, not
 *                                               read off `attributes`, so the attribute
 *                                               name appears in `edit.js` where
 *                                               inspector-scan rule 21's corpus can see
 *                                               it. `ShadowControl` composes its keys via
 *                                               `shadowAttrKeys()`, which no static
 *                                               reader can resolve through a prop object.
 * @param {string}   root0.submenuShadowColour   `submenuShadowColour` — same reason.
 * @param {Object}   root0.attributes            Full attributes — `ShadowControl` reads
 *                                               and writes its own key pair.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function DropdownStylePanel( {
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
					submenuAnimation: 'none',
					submenuTopOffset: '',
					submenuMinWidth: '',
					submenuPadding: {},
					submenuBorderWidth: {},
					submenuBorderStyle: '',
					submenuBorderRadius: {},
				} )
			}
		>
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
					Object.keys( submenuBorderRadius || {} ).length > 0
				}
				label={ __( 'Border', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( {
						submenuBorderWidth: {},
						submenuBorderStyle: '',
						submenuBorderRadius: {},
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
					radiusValues={ submenuBorderRadius || {} }
					onRadiusChange={ ( next ) =>
						setAttributes( { submenuBorderRadius: next || {} } )
					}
				/>
			</ToolsPanelItem>

			{ /* ⛔ `shadowAttrKeys( 'submenuShadow' )` with NO options returns exactly
			   `{ base, colour }` — the documented single-state form. The PHP twin
			   `sgs_shadow_attr_map( 'submenuShadow' )` takes the same no-options call,
			   and BOTH sides must carry the same opt-in or JS binds a key the block
			   never declares and the editor silently discards every write to it
			   (D338). ⛔ Shadow is gradient-exempt by mechanism: `box-shadow` takes a
			   colour, and a gradient there is invalid CSS the browser drops. */ }
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
		</ToolsPanel>
	);
}
