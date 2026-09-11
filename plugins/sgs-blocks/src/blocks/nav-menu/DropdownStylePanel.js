import { __ } from '@wordpress/i18n';
import { SgsLengthControl, ResponsiveBoxControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Dropdown (only affects items with
 * sub-items)" ToolsPanel (minimum width, corner radius, inner spacing).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX.
 * Background + link colour live in the top-level SgsColourPanel (D618/D609),
 * unchanged and untouched by this split.
 *
 * @param {Object}   root0                 Props.
 * @param {string}   root0.submenuMinWidth The block's `submenuMinWidth` attribute.
 * @param {string}   root0.submenuRadius   The block's `submenuRadius` attribute.
 * @param {Object}   root0.submenuPadding  The block's `submenuPadding` attribute.
 * @param {Function} root0.setAttributes   The block's attribute setter.
 */
export default function DropdownStylePanel( {
	submenuMinWidth,
	submenuRadius,
	submenuPadding,
	setAttributes,
} ) {
	return (
		<ToolsPanel
			label={ __(
				'Dropdown (only affects items with sub-items)',
				'sgs-blocks'
			) }
			resetAll={ () =>
				setAttributes( {
					submenuMinWidth: '',
					submenuRadius: '',
					submenuPadding: {},
				} )
			}
		>
			{ /* Background + Link colour moved to the top-level
			   SgsColourPanel (D618/D609) — always shown there (a
			   dropdown is optional per menu item, but the controls
			   themselves are not gated on one existing, matching this
			   ToolsPanel's own prior behaviour). */ }
			<ToolsPanelItem
				hasValue={ () => !! submenuMinWidth }
				label={ __( 'Minimum width', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( { submenuMinWidth: '' } )
				}
			>
				<SgsLengthControl
					label={ __( 'Minimum width', 'sgs-blocks' ) }
					value={ submenuMinWidth }
					onChange={ ( val ) =>
						setAttributes( { submenuMinWidth: val || '' } )
					}
					help={ __(
						'Stops a dropdown shrinking to the width of its shortest link.',
						'sgs-blocks'
					) }
					presets={ false }
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				hasValue={ () => !! submenuRadius }
				label={ __( 'Corner radius', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( { submenuRadius: '' } )
				}
			>
				<SgsLengthControl
					label={ __( 'Corner radius', 'sgs-blocks' ) }
					value={ submenuRadius }
					onChange={ ( val ) =>
						setAttributes( { submenuRadius: val || '' } )
					}
					presets={ false }
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				hasValue={ () =>
					Object.keys( submenuPadding?.desktop || {} )
						.length > 0 ||
					Object.keys( submenuPadding?.tablet || {} )
						.length > 0 ||
					Object.keys( submenuPadding?.mobile || {} )
						.length > 0
				}
				label={ __( 'Inner spacing', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( { submenuPadding: {} } )
				}
			>
				{ /* Migrated 2026-08-19 to a responsive tier object,
				   matching nav-drawer's drawerPadding shape. */ }
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
							submenuPadding: {
								...submenuPadding,
								[ key ]: next,
							},
						} );
					} }
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
