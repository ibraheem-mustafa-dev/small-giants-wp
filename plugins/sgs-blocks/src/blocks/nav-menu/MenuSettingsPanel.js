import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { PanelBody, SelectControl } from '@wordpress/components';
import { SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { BURGER_SCOPE_PX, burgerScopeOf } from './utils';

/**
 * SGS Nav Menu (sgs/nav-menu) — Settings tab panels: Menu, Burger Menu.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget — further split out of an intermediate
 * SettingsPanels.js (which itself landed at 264 lines, over budget) into this
 * file + the sibling DropdownSettingsPanel.js. No behaviour change — verbatim
 * JSX from edit.js's `<InspectorControls>` (default group) block.
 * `showCustomCollapse` is local UI-only state (was a useState in edit.js),
 * scoped here since only the Burger Menu panel reads it.
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.menuRef       The block's `ref` attribute (menu id).
 *                                       Named `menuRef`, NOT `ref` — `ref` is a
 *                                       reserved JSX prop name and would be
 *                                       intercepted by React rather than reaching
 *                                       this component as a normal prop.
 * @param {Array}    root0.menuOptions   From useNavMenuSource().
 * @param {boolean}  root0.isResolving   From useNavMenuSource().
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {number}   root0.collapsePoint The block's `collapsePoint` attribute.
 */
export default function MenuSettingsPanel( {
	menuRef,
	menuOptions,
	isResolving,
	setAttributes,
	collapsePoint,
} ) {
	// Burger Menu 'Custom' reveal — UI-only state (the stored value is collapsePoint).
	const [ showCustomCollapse, setShowCustomCollapse ] = useState( false );

	return (
		<>
			<PanelBody title={ __( 'Menu', 'sgs-blocks' ) }>
				<SelectControl
					label={ __( 'Menu', 'sgs-blocks' ) }
					value={ menuRef || 0 }
					options={ menuOptions }
					onChange={ ( val ) =>
						setAttributes( { ref: Number( val ) || 0 } )
					}
					disabled={ isResolving }
					help={ __(
						'Auto follows the header navigation block / the site’s primary menu. Choose a specific menu to render an independent one. Manage menus in Appearance → Menus.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody title={ __( 'Burger Menu', 'sgs-blocks' ) }>
				<ToggleGroupControl
					label={ __( 'Show the burger on', 'sgs-blocks' ) }
					help={ __(
						'Choose how far up the burger reaches. Always turns this into a burger-only menu on every device — increasingly common on large sites. Below the chosen size the links collapse into the burger; above it they show as a bar.',
						'sgs-blocks'
					) }
					value={ burgerScopeOf( collapsePoint ) }
					isBlock
					__nextHasNoMarginBottom
					onChange={ ( value ) => {
						if ( value === 'custom' ) {
							setAttributes( { collapsePoint: collapsePoint || 768 } );
							setShowCustomCollapse( true );
							return;
						}
						setShowCustomCollapse( false );
						setAttributes( {
							collapsePoint: BURGER_SCOPE_PX[ value ],
						} );
					} }
					__next40pxDefaultSize
				>
					<ToggleGroupControlOption
						value="always"
						label={ __( 'Always', 'sgs-blocks' ) }
					/>
					<ToggleGroupControlOption
						value="tablet"
						label={ __( 'Tablet', 'sgs-blocks' ) }
					/>
					<ToggleGroupControlOption
						value="mobile"
						label={ __( 'Mobile', 'sgs-blocks' ) }
					/>
					<ToggleGroupControlOption
						value="custom"
						label={ __( 'Custom', 'sgs-blocks' ) }
					/>
				</ToggleGroupControl>

				{ ( showCustomCollapse ||
					burgerScopeOf( collapsePoint ) === 'custom' ) && (
					<SgsLengthControl
						label={ __( 'Switch to burger below', 'sgs-blocks' ) }
						value={ `${ collapsePoint }px` }
						units={ [ { value: 'px', label: 'px', default: 768 } ] }
						onChange={ ( val ) => {
							const n = parseInt( val, 10 );
							if ( ! Number.isNaN( n ) && n > 0 ) {
								setAttributes( { collapsePoint: n } );
							}
						} }
						presets={ false }
					/>
				) }

			</PanelBody>
		</>
	);
}
