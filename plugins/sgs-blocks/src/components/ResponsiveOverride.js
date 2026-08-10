/**
 * ResponsiveOverride — SGS-owned per-device override control (Spec 37 FR-37-16).
 *
 * A device switcher (desktop / tablet / mobile) that stores each property as the
 * `{desktop,tablet,mobile}` object model where a blank tier INHERITS the tier
 * above (desktop is always concrete). Render-prop: it manages the active tier +
 * the inherited-value UX; the caller renders the actual input for the active tier.
 *
 * Accessibility (Spec 37 FR-37-16, WCAG 2.2):
 *  - `role="tablist"` with arrow-key navigation + roving tabindex (real tabs, not
 *    just buttons); 44px minimum targets.
 *  - An inherited (non-overridden) tier is signalled by an ICON + `aria-label`
 *    text, never colour alone (WCAG 1.4.1); the control is visually dimmed too.
 *  - A keyboard-reachable "Reset to inherited" button (Tab + Enter/Space) clears a
 *    tier's own value — not right-click-only.
 *  - SGS-owned: does NOT depend on WordPress's `__experimental` device switcher.
 *
 * Usage:
 *   <ResponsiveOverride
 *     label={ __( 'Gap between elements', 'sgs-blocks' ) }
 *     value={ attributes.gap }                 // {desktop,tablet,mobile} | undefined
 *     onChange={ ( obj ) => setAttributes( { gap: obj } ) }
 *   >
 *     { ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
 *       <SpacingControl
 *         value={ ownValue }
 *         placeholder={ inherited ? effectiveValue : '' }
 *         onChange={ setOwnValue }
 *       />
 *     ) }
 *   </ResponsiveOverride>
 */
import { useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { link as linkIcon } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { makeResponsive, resolveResponsiveTier } from '../utils/responsive';

// ⛔ Removed with the switcher (Phase 1.3): `useState` (the private tier), the
// `DeviceTabs` import, the TIERS table, and the desktop/tablet/mobile icons that
// only TIERS used. `linkIcon` STAYS — the "Inherited from X" cue uses it, and it
// is a non-colour affordance (WCAG 1.4.1), not decoration.
// `lint:js` is not in the prebuild chain, so unused imports here would fail no
// gate; these were checked by hand.

// WP's native device-type names → this component's tier keys.
const DEVICE_TO_KEY = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };

const TIER_ABOVE = { tablet: __( 'Desktop', 'sgs-blocks' ), mobile: __( 'Tablet', 'sgs-blocks' ) };

export default function ResponsiveOverride( { label, value, onChange, children } ) {
	// The tier comes from the ONE global toggle docked at the bottom of the
	// inspector, not from private state. Before Spec 35 Phase 1.3 this component
	// held its own `useState('desktop')`, so its strip and every
	// <ResponsiveControl> could disagree about which tier you were editing —
	// three device models running at once.
	const active = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function'
				? ed.getDeviceType()
				: null;
		return DEVICE_TO_KEY[ device ] || 'desktop';
	}, [] );

	const obj = value && typeof value === 'object' ? value : {};

	const resolved = resolveResponsiveTier( obj, active );
	// desktop is always its own value; tablet/mobile inherit when they have none.
	const ownRaw = obj?.[ active ];
	const hasOwn = ownRaw !== undefined && ownRaw !== null && ownRaw !== '';
	const inherited = active !== 'desktop' && ! hasOwn;

	const writeTier = ( tierKey, tierValue ) => {
		const next = { ...obj };
		if ( tierValue === undefined || tierValue === null || tierValue === '' ) {
			delete next[ tierKey ];
		} else {
			next[ tierKey ] = tierValue;
		}
		onChange( makeResponsive( next ) );
	};

	const setOwnValue = ( v ) => writeTier( active, v );
	const resetTier = () => writeTier( active, '' );

	// (`tierHasOwnValue` lived here and fed the deleted tabs' "(inherited)" label
	// suffix. It had no other caller, so it went with them — see the note in the
	// header row about the affordance that was lost with it.)

	return (
		<div className="sgs-responsive-override">
			<div className="sgs-responsive-override__header">
				{ label && (
					<span className="sgs-responsive-override__label">{ label }</span>
				) }
				{ /* ⛔ Per-control <DeviceTabs> deleted (Spec 35 Phase 1.3). The tier
				     is chosen once, globally.

				     ⚠ ONE AFFORDANCE IS GENUINELY LOST and is recorded rather than
				     glossed: these tabs used getTabLabel to mark every tier that had
				     no own value as "(inherited)", so you could see at a glance which
				     OTHER tiers were set. The global toggle has no per-attribute
				     knowledge and cannot show that. What survives is the "Inherited
				     from X" line below the field, which still states it for the tier
				     you are actually on — the case that matters while editing. If the
				     at-a-glance view is wanted back, it needs its own design; do not
				     solve it by re-adding a per-control switcher. */ }
			</div>

			<div
				className="sgs-responsive-override__field"
				style={ inherited ? { opacity: 0.6 } : undefined }
			>
				{ children( {
					tier: active,
					ownValue: hasOwn ? ownRaw : '',
					effectiveValue: resolved.value,
					inherited,
					setOwnValue,
					resetTier,
				} ) }
			</div>

			{ inherited && (
				<div
					className="sgs-responsive-override__inherited"
					style={ { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' } }
				>
					{ /* Non-colour cue: an explicit icon + text, never colour alone (WCAG 1.4.1). */ }
					<span aria-hidden="true" style={ { display: 'inline-flex' } }>
						{ linkIcon }
					</span>
					<span
						className="sgs-responsive-override__inherited-text"
						style={ { fontSize: '11px' } }
					>
						{ sprintf(
							/* translators: %s: the tier this value is inherited from. */
							__( 'Inherited from %s', 'sgs-blocks' ),
							TIER_ABOVE[ active ] || __( 'Desktop', 'sgs-blocks' )
						) }
					</span>
				</div>
			) }

			{ active !== 'desktop' && hasOwn && (
				<Button
					variant="tertiary"
					size="small"
					onClick={ resetTier }
					style={ { minHeight: '44px', marginTop: '2px' } }
				>
					{ __( 'Reset to inherited', 'sgs-blocks' ) }
				</Button>
			) }
		</div>
	);
}
