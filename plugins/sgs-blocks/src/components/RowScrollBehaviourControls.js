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
	Button,
	Notice,
	PanelBody,
	SelectControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import ResponsiveOverride from './ResponsiveOverride';

/**
 * Derive a stable, DOM-safe anchor id for a child that has none yet.
 *
 * The shrink-hide reference is the child's own `anchor` attribute — it survives
 * copy/paste, unlike the editor's internal clientId (must-fix 3). We only mint
 * one when the operator actually picks that child, so nothing else changes.
 *
 * @param {string} clientId The child's clientId (used purely as entropy, never stored).
 * @return {string} An anchor id.
 */
function mintAnchor( clientId ) {
	return 'sgs-row-el-' + String( clientId ).replace( /[^a-zA-Z0-9]/g, '' ).slice( 0, 8 );
}

export default function RowScrollBehaviourControls( {
	attributes,
	setAttributes,
	clientId,
} ) {
	const { rowTransparent, rowHideOnScroll, rowShrink, rowShrinkHideTarget } =
		attributes;

	const { updateBlockAttributes } = useDispatch( blockEditorStore );

	// Candidate children for "hide on shrink". Essential header furniture —
	// logo, primary navigation, cart — is EXCLUDED via the declarative
	// `supports.sgs.headerEssential` flag read straight off the block type
	// (must-fix 4: no hardcoded block-name list here; protecting a new critical
	// block later is a one-line block.json change). A server-side backstop in
	// render.php re-checks the same flag.
	const hideCandidates = useSelect(
		( select ) => {
			const children =
				select( blockEditorStore ).getBlock( clientId )?.innerBlocks ||
				[];
			const { getBlockType } = select( blocksStore );
			return children
				.filter( ( child ) => {
					const supports = getBlockType( child.name )?.supports;
					// Essential furniture is never offered (must-fix 4)...
					if ( supports?.sgs?.headerEssential ) {
						return false;
					}
					// ...and neither is a block that cannot HOLD the
					// reference. The stable id is the child's own `anchor`
					// attribute, and WordPress silently discards an attribute
					// the block type doesn't declare — so a child without
					// `supports.anchor` would appear to be configured, then
					// lose the id on save and hide nothing, with no error.
					// 11 of the plugin's blocks lack anchor support today
					// (sgs/product-search among them, a promoted header
					// element), so this is a live case, not a hypothetical.
					return !! supports?.anchor;
				} )
				.map( ( child ) => ( {
					clientId: child.clientId,
					anchor: child.attributes?.anchor || '',
					label:
						getBlockType( child.name )?.title ||
						child.name,
				} ) );
		},
		[ clientId ]
	);

	// The stored target may point at a child that has since been deleted. That
	// is not an error (must-fix 3) — the picker simply shows "nothing chosen"
	// and render.php hides nothing.
	const selectedCandidate = hideCandidates.find(
		( c ) => c.anchor && c.anchor === rowShrinkHideTarget
	);

	const onPickHideTarget = ( value ) => {
		if ( ! value ) {
			setAttributes( { rowShrinkHideTarget: '' } );
			return;
		}
		const candidate = hideCandidates.find( ( c ) => c.clientId === value );
		if ( ! candidate ) {
			return;
		}
		const anchor = candidate.anchor || mintAnchor( candidate.clientId );
		if ( ! candidate.anchor ) {
			updateBlockAttributes( candidate.clientId, { anchor } );
		}
		setAttributes( { rowShrinkHideTarget: anchor } );
	};

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
						rowShrink: {},
						rowShrinkHideTarget: '',
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

				<ToolsPanelItem
					label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
					hasValue={ () =>
						( !! rowShrink &&
							Object.keys( rowShrink ).length > 0 ) ||
						!! rowShrinkHideTarget
					}
					onDeselect={ () =>
						setAttributes( {
							rowShrink: {},
							rowShrinkHideTarget: '',
						} )
					}
					isShownByDefault
				>
					<ResponsiveOverride
						label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
						value={ rowShrink }
						onChange={ ( obj ) =>
							setAttributes( { rowShrink: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<ToggleControl
								label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
								checked={ !! ( inherited ? effectiveValue : ownValue ) }
								onChange={ ( value ) => setOwnValue( value ) }
								help={ __(
									'This row becomes shorter once the visitor scrolls, freeing up screen space. Independent of any other row.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>

					<SelectControl
						label={ __( 'Also hide an element when shrunk', 'sgs-blocks' ) }
						value={ selectedCandidate?.clientId || '' }
						options={ [
							{
								label: __( '— nothing —', 'sgs-blocks' ),
								value: '',
							},
							...hideCandidates.map( ( candidate ) => ( {
								label: candidate.label,
								value: candidate.clientId,
							} ) ),
						] }
						onChange={ onPickHideTarget }
						help={ __(
							'Pick one element in this row to disappear while the row is shrunk. The logo, main navigation and cart are never offered — a visitor always needs those.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ !! rowShrinkHideTarget && ! selectedCandidate && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'The element this row was hiding is no longer here — it was probably deleted or moved. Nothing is hidden on shrink. Pick another element, or reset.',
								'sgs-blocks'
							) }
						</Notice>
					) }
					<Button
						variant="secondary"
						size="small"
						onClick={ () =>
							setAttributes( { rowShrinkHideTarget: '' } )
						}
					>
						{ __( 'Reset shrink target', 'sgs-blocks' ) }
					</Button>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}
