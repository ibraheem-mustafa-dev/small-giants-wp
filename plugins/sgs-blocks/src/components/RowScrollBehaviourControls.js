/**
 * RowScrollBehaviourControls — per-row transparent / hide-on-scroll toggles
 * (Phase 1, header-footer-per-row-identity design gate).
 *
 * Shared between sgs/site-header-row and sgs/site-footer-row so both blocks
 * expose IDENTICAL controls for `rowTransparent` / `rowHideOnScroll` — no
 * per-block divergence. Each is a `{desktop,tablet,mobile}` boolean object
 * (device-tier shape, must-fix 7): a tier left unset INHERITS the tier above
 * (mobile ← tablet ← desktop); an explicit `false` means "off here".
 *
 * Lives in an ADVANCED ToolsPanel — these are secondary/advanced controls,
 * kept out of the block's Simple/primary settings surface (FR-37-27).
 *
 * No inline `style=""` is written by this component — it only calls
 * setAttributes on the two object attrs; render.php resolves the effective
 * per-tier value and emits data-attrs/classes (Spec 32 no-inline contract).
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import ResponsiveOverride from './ResponsiveOverride';

export default function RowScrollBehaviourControls( {
	attributes,
	setAttributes,
} ) {
	const { rowTransparent, rowHideOnScroll } = attributes;

	return (
		<PanelBody
			title={ __( 'Row behaviour (Advanced)', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToolsPanel
				label={ __( 'Row scroll behaviour', 'sgs-blocks' ) }
				resetAll={ () =>
					setAttributes( {
						rowTransparent: {},
						rowHideOnScroll: {},
					} )
				}
			>
				<ToolsPanelItem
					label={ __(
						'Transparent until scrolled',
						'sgs-blocks'
					) }
					hasValue={ () =>
						!! rowTransparent &&
						Object.keys( rowTransparent ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { rowTransparent: {} } )
					}
					isShownByDefault
				>
					<ResponsiveOverride
						label={ __(
							'Transparent until scrolled',
							'sgs-blocks'
						) }
						value={ rowTransparent }
						onChange={ ( obj ) =>
							setAttributes( { rowTransparent: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<ToggleControl
								label={ __(
									'Transparent until scrolled',
									'sgs-blocks'
								) }
								checked={ !! ( inherited ? effectiveValue : ownValue ) }
								onChange={ ( value ) => setOwnValue( value ) }
								help={ __(
									'This row starts see-through, then becomes solid once the visitor scrolls. Independent of any other row.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Hide on scroll', 'sgs-blocks' ) }
					hasValue={ () =>
						!! rowHideOnScroll &&
						Object.keys( rowHideOnScroll ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { rowHideOnScroll: {} } )
					}
					isShownByDefault
				>
					<ResponsiveOverride
						label={ __( 'Hide on scroll', 'sgs-blocks' ) }
						value={ rowHideOnScroll }
						onChange={ ( obj ) =>
							setAttributes( { rowHideOnScroll: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<ToggleControl
								label={ __( 'Hide on scroll', 'sgs-blocks' ) }
								checked={ !! ( inherited ? effectiveValue : ownValue ) }
								onChange={ ( value ) => setOwnValue( value ) }
								help={ __(
									'This row slides off the top once the visitor scrolls down, and slides back in on scroll up. Independent of any other row.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}
