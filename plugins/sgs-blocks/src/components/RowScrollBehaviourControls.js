/**
 * RowScrollBehaviourControls — per-row transparent / hide-on-scroll toggles
 * (Phase 1, header-footer-per-row-identity design gate).
 *
 * Shared between sgs/site-header-row and sgs/site-footer-row so both blocks
 * expose IDENTICAL controls for `rowTransparent` / `rowHideOnScroll` /
 * `rowShrink` — no per-block divergence. Each is a `{desktop,tablet,mobile}`
 * TRI-STATE STRING object — `'on'` / `'off'` / `'inherit'` (device-tier shape,
 * must-fix 7): a tier left `'inherit'`/unset INHERITS the tier above
 * (mobile ← tablet ← desktop); desktop always resolves concrete.
 *
 * Reshaped from an earlier boolean-object shape to this string enum (Spec 35
 * T1.4 fold-in, D400+, 2026-07-28) so header-level and row-level behaviours
 * share ONE cascade + ONE vocabulary — `sgs_resolve_on_tiers()` /
 * `resolveOnTiers()` now take the SAME `onMarker='on'`/`defaultValue='off'`
 * pair everywhere instead of a boolean pair for rows and a string pair for
 * the header. Rendered via the same `ResponsiveTriStateControl` the header
 * uses (`sgs/site-header/edit.js`) rather than a bespoke boolean toggle.
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
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import ResponsiveTriStateControl from './ResponsiveTriStateControl';
import { resolveTier, resolveOnTiers } from '../utils/responsive';
import { ToolsPanel, ToolsPanelItem } from './primitives';

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
	return (
		'sgs-row-el-' +
		String( clientId )
			.replace( /[^a-zA-Z0-9]/g, '' )
			.slice( 0, 8 )
	);
}

export default function RowScrollBehaviourControls( {
	attributes,
	setAttributes,
	clientId,
	previewShrunk = false,
	setPreviewShrunk,
} ) {
	const {
		rowTransparent,
		rowHideOnScroll,
		rowShrink,
		rowShrinkHideTarget,
		padding,
	} = attributes;

	// Is this row inside a header that is PINNED to the top of the screen?
	// Scroll-linked effects (shrink / hide-on-scroll) only make sense on a
	// header the visitor can still see once they have scrolled — on a header
	// that scrolls away with the page, the effect fires just as the row leaves
	// the screen and its only lasting result is nudging the page content.
	// `null` = there is no sgs/site-header ancestor at all (a FOOTER row), so
	// the question does not apply and no warning is shown.
	// MUST be declared BEFORE the derived flags below that read it — a `const`
	// referenced above its declaration is a temporal-dead-zone crash that takes
	// the whole block editor down ("Cannot access 'x' before initialization").
	//
	// headerSticky reshaped to a tri-state {desktop,tablet,mobile} object at
	// Spec 35 T1.4 (2026-07-28) — `!! headerSticky` would now ALWAYS be true
	// (its default `{}` is a truthy object), so this reads the DESKTOP tier's
	// resolved on/off state via the canonical resolveTier() cascade instead.
	// This is an editor-only advisory (never a gate), evaluated at the
	// DESKTOP tier as a simplification consistent with how contrastSafe's
	// auto-upgrade reads sticky's/transparent's desktop tier server-side.
	const headerIsSticky = useSelect(
		( select ) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				select( blockEditorStore );
			const parents = getBlockParentsByBlockName(
				clientId,
				'sgs/site-header'
			);
			if ( ! parents?.length ) {
				return null;
			}
			const headerSticky = getBlockAttributes(
				parents[ parents.length - 1 ]
			)?.headerSticky;
			return resolveTier( headerSticky, 'desktop', 'off' ).value === 'on';
		},
		[ clientId ]
	);

	// Shrink reduces this row's OWN vertical padding by half, so a row with no
	// padding has nothing to reclaim and visibly does nothing. That is correct
	// behaviour (it must never grow), but silent — so say so rather than leave
	// the operator wondering. Deliberately NOT hidden or disabled: a control
	// that vanishes because a different, unrelated setting is empty is
	// undiscoverable, and the project's standing rule is to degrade to MORE
	// information, never less.
	// Tri-state string shape ('on'/'off'/'inherit') — a plain truthiness scan
	// over Object.values() would wrongly read an explicit 'off' as "on" (a
	// non-empty string is truthy). Use the canonical on-tiers resolver.
	const shrinkIsOn = resolveOnTiers( rowShrink, 'on', 'off' ).length > 0;
	const hideOnScrollIsOn =
		resolveOnTiers( rowHideOnScroll, 'on', 'off' ).length > 0;
	// Only warn when we KNOW the ancestor header is not pinned (false), never
	// when there is no header ancestor to ask about (null → footer row).
	const scrollEffectWastedOnUnpinnedHeader =
		false === headerIsSticky && ( shrinkIsOn || hideOnScrollIsOn );
	const hasVerticalPadding =
		!! padding &&
		typeof padding === 'object' &&
		Object.values( padding ).some(
			( tier ) =>
				!! tier &&
				typeof tier === 'object' &&
				( !! tier.top || !! tier.bottom )
		);

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
					label: getBlockType( child.name )?.title || child.name,
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
			{ scrollEffectWastedOnUnpinnedHeader && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'This header isn’t pinned to the top of the screen, so it scrolls away with the page. Scroll effects on this row will barely be seen, and shrinking will nudge the page content as it happens. Turn on “Sticky header” to make them worthwhile.',
						'sgs-blocks'
					) }
				</Notice>
			) }
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
					label={ __( 'Row background transparent', 'sgs-blocks' ) }
					hasValue={ () =>
						!! rowTransparent &&
						Object.keys( rowTransparent ).length > 0
					}
					onDeselect={ () => setAttributes( { rowTransparent: {} } ) }
					isShownByDefault
				>
					<ResponsiveTriStateControl
						label={ __(
							'Row background transparent',
							'sgs-blocks'
						) }
						help={ __(
							'This row’s own background turns see-through, then solid once the visitor scrolls. It changes this row’s background colour only — the header itself stays put. Independent of every other row.',
							'sgs-blocks'
						) }
						value={ rowTransparent }
						onChange={ ( value ) =>
							setAttributes( { rowTransparent: value } )
						}
						defaultValue="off"
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Collapse this row on scroll', 'sgs-blocks' ) }
					hasValue={ () =>
						!! rowHideOnScroll &&
						Object.keys( rowHideOnScroll ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { rowHideOnScroll: {} } )
					}
					isShownByDefault
				>
					<ResponsiveTriStateControl
						label={ __( 'Collapse this row on scroll', 'sgs-blocks' ) }
						help={ __(
							'This row slides away once the visitor scrolls down, and slides back in on scroll up. While the header is pinned the row collapses to nothing, closing the gap it leaves. Independent of every other row.',
							'sgs-blocks'
						) }
						value={ rowHideOnScroll }
						onChange={ ( value ) =>
							setAttributes( { rowHideOnScroll: value } )
						}
						defaultValue="off"
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Reduce this row’s padding on scroll', 'sgs-blocks' ) }
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
					<ResponsiveTriStateControl
						label={ __( 'Reduce this row’s padding on scroll', 'sgs-blocks' ) }
						help={ __(
							'Reduces the empty space above and below this row once the visitor scrolls, freeing up screen height. Independent of every other row.',
							'sgs-blocks'
						) }
						value={ rowShrink }
						onChange={ ( value ) =>
							setAttributes( { rowShrink: value } )
						}
						defaultValue="off"
					/>

					{ shrinkIsOn &&
						hasVerticalPadding &&
						!! setPreviewShrunk && (
							<ToggleControl
								label={ __(
									'Show me the shrunk size',
									'sgs-blocks'
								) }
								checked={ previewShrunk }
								onChange={ setPreviewShrunk }
								help={ __(
									'Previews this row at its scrolled size right here in the editor, so you don’t have to publish and scroll to see it. Affects this preview only — it changes nothing on your live site.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }

					{ shrinkIsOn && ! hasVerticalPadding && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This needs some empty space around the row (padding) to reduce. Right now this row has none, so switching it on won’t visibly do anything yet.',
								'sgs-blocks'
							) }
						</Notice>
					) }

					<SelectControl
						label={ __(
							'Also hide an element when shrunk',
							'sgs-blocks'
						) }
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
						__next40pxDefaultSize
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
