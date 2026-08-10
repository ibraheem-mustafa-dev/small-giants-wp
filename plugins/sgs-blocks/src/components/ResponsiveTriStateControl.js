/**
 * ResponsiveTriStateControl — the DP1 tri-state on/off control (Spec 35 T1.2).
 *
 * Built against the APPROVED cascade contract (D400,
 * `.claude/plans/2026-07-28-resolveTier-cascade-design-gate.md`) and the UI spec
 * (`.claude/plans/2026-07-18-P2-builder-ux-design-gate.md` §4.1).
 *
 * Stored shape: `{ desktop:'on'|'off', tablet:'inherit'|'on'|'off',
 * mobile:'inherit'|'on'|'off' }`. Desktop never legitimately stores 'inherit' —
 * the shared `resolveTier()` (`../utils/responsive`) coerces a missing/invalid
 * desktop value to `defaultValue` (§6b guard); this component keeps desktop
 * concrete at the point of write too, so the stored attribute never needs that
 * coercion in practice.
 *
 * UX (§4.1):
 *  - The everyday surface is a SINGLE `ToggleControl` that reads/writes the
 *    DESKTOP tier only — flipping it never touches an existing tablet/phone
 *    override (the ambiguity the design gate calls out explicitly).
 *  - A "Customise per device →" link reveals the full tri-state device
 *    switcher (tablet/mobile add an `Inherit` option, default).
 *  - A persistent, non-colour "Customised for Tablet, Phone" trace line shows
 *    whenever any lower tier holds an explicit value, so an override is never
 *    invisible from the simple surface.
 *  - The `Inherit` option's label resolves inline — "Inherit (following All
 *    devices: On)" — via the shared `resolveTier()` resolver, never a
 *    second cascade implementation.
 *
 * ⚑ CORRECTED 2026-08-10 (Spec 35 Phase 1.3). This used to read "Tier switching
 * reuses the shared `DeviceTabs` component (the same shell
 * `ResponsiveControl`/`ResponsiveOverride` use)". It no longer does: this
 * component renders NO tier switcher at all. The tier is chosen once, in the
 * global toggle docked at the bottom of the inspector
 * (`src/blocks/extensions/responsive-device-toggle.js`), and read here via
 * `core/editor`'s `getDeviceType`. `DeviceTabs` now has zero callers anywhere.
 *
 * A11y: the tri-state segment is a `ToggleGroupControl` (native `radiogroup`,
 * arrow-key operable); the customised-tiers indicator is TEXT, never colour
 * alone (WCAG 1.4.1); a visually-hidden `aria-live="polite"` region announces
 * the active tier on switch; every interactive target is >=44x44px.
 *
 * Usage:
 *   <ResponsiveTriStateControl
 *       label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
 *       help={ __( 'Pins the header to the top as the visitor scrolls.', 'sgs-blocks' ) }
 *       value={ headerSticky }
 *       onChange={ ( next ) => setAttributes( { headerSticky: next } ) }
 *       defaultValue="off"
 *   />
 */
import { useState, useRef } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	ToggleControl,
	Button,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { resolveTier } from '../utils/responsive';

// ⛔ Removed with the switcher (Phase 1.3): the `DeviceTabs` import and
// `VisuallyHidden` — the latter only wrapped the tier announcement, which is now
// the global toggle's job (keeping it would announce every tier change once PER
// RENDERED INSTANCE of this control). TIER_META stays: TIER_LABEL_BY_KEY derives
// from it and is still used six times.

// WP's native device-type names → this component's tier keys.
const DEVICE_TO_KEY = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };

const TIER_META = [
	{ key: 'desktop', icon: desktop, label: __( 'All devices', 'sgs-blocks' ) },
	{ key: 'tablet', icon: tablet, label: __( 'Tablet', 'sgs-blocks' ) },
	{ key: 'mobile', icon: mobile, label: __( 'Phone', 'sgs-blocks' ) },
];

const TIER_LABEL_BY_KEY = TIER_META.reduce( ( acc, t ) => {
	acc[ t.key ] = t.label;
	return acc;
}, {} );

const isExplicit = ( v ) => v === 'on' || v === 'off';
const onOffLabel = ( v ) =>
	v === 'on' ? __( 'On', 'sgs-blocks' ) : __( 'Off', 'sgs-blocks' );

export default function ResponsiveTriStateControl( {
	label,
	help,
	value,
	onChange,
	defaultValue = 'off',
} ) {
	const [ expanded, setExpanded ] = useState( false );

	// The tier comes from the ONE global toggle (Spec 35 Phase 1.3), not from
	// private state. `expanded` STAYS local — it is a disclosure, not a tier, and
	// whether this control's per-device panel is open is genuinely per-control.
	const activeTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function'
				? ed.getDeviceType()
				: null;
		return DEVICE_TO_KEY[ device ] || 'desktop';
	}, [] );

	const resolvedHintRef = useRef( null );

	const obj = value && typeof value === 'object' ? value : {};
	const desktopExplicit = obj.desktop === 'on' ? 'on' : 'off';
	const safeLabel = label || __( 'Setting', 'sgs-blocks' );

	const customisedTiers = [ 'tablet', 'mobile' ].filter( ( t ) =>
		isExplicit( obj[ t ] )
	);
	const hasCustomisation = customisedTiers.length > 0;

	const writeTier = ( tierKey, tierValue ) => {
		onChange( { ...obj, [ tierKey ]: tierValue } );
	};

	// The simple toggle drives DESKTOP only — it must never overwrite an
	// existing tablet/phone override (§4.1: "explicit flip behaviour").
	const handleSimpleToggle = ( checked ) => {
		writeTier( 'desktop', checked ? 'on' : 'off' );
	};

	let activeOwn = desktopExplicit;
	if ( activeTier !== 'desktop' ) {
		activeOwn = isExplicit( obj[ activeTier ] )
			? obj[ activeTier ]
			: 'inherit';
	}

	const parentTier = activeTier === 'mobile' ? 'tablet' : 'desktop';
	const parentResolved = resolveTier( obj, parentTier, defaultValue );
	const activeResolved = resolveTier( obj, activeTier, defaultValue );

	const options =
		activeTier === 'desktop'
			? [
					{ value: 'off', label: __( 'Off', 'sgs-blocks' ) },
					{ value: 'on', label: __( 'On', 'sgs-blocks' ) },
			  ]
			: [
					{
						value: 'inherit',
						label: sprintf(
							/* translators: 1: parent tier name, 2: resolved On/Off state. */
							__(
								'Inherit (following %1$s: %2$s)',
								'sgs-blocks'
							),
							TIER_LABEL_BY_KEY[ parentTier ],
							onOffLabel( parentResolved.value )
						),
					},
					{ value: 'off', label: __( 'Off', 'sgs-blocks' ) },
					{ value: 'on', label: __( 'On', 'sgs-blocks' ) },
			  ];

	const onTierChange = ( nextVal ) => {
		if ( ! nextVal ) {
			return;
		}
		writeTier( activeTier, nextVal );
	};

	const resetActiveTier = () => {
		writeTier( activeTier, 'inherit' );
		if ( resolvedHintRef.current ) {
			resolvedHintRef.current.focus();
		}
	};

	return (
		<div className="sgs-tri-state-control">
			<ToggleControl
				__nextHasNoMarginBottom
				label={ label }
				help={ help }
				checked={ desktopExplicit === 'on' }
				onChange={ handleSimpleToggle }
			/>

			{ hasCustomisation && (
				<p className="sgs-tri-state-control__customised-note">
					{ sprintf(
						/* translators: %s: comma-separated list of device tiers with an explicit override. */
						__( 'Customised for %s.', 'sgs-blocks' ),
						customisedTiers
							.map( ( t ) => TIER_LABEL_BY_KEY[ t ] )
							.join( ', ' )
					) }
				</p>
			) }

			<Button
				variant="link"
				onClick={ () => setExpanded( ( v ) => ! v ) }
				aria-expanded={ expanded }
				style={ { minHeight: '44px' } }
			>
				{ expanded
					? __( 'Hide per-device settings', 'sgs-blocks' )
					: __( 'Customise per device →', 'sgs-blocks' ) }
			</Button>

			{ expanded && (
				<div className="sgs-tri-state-control__panel">
					{ /* ⛔ Per-control <DeviceTabs> deleted (Spec 35 Phase 1.3) — the
					     tier is chosen once, globally. As in ResponsiveOverride, the
					     tabs' "(customised)" per-tier hint goes with them; the
					     "Customise per device" summary below still names which tiers
					     carry an override, so that information is not lost here.

					     ⛔ The aria-live announcement is deleted too, DELIBERATELY:
					     the global toggle already announces "Now editing the tablet
					     view." on every change. Keeping this would announce the same
					     event twice — and once per rendered instance of this control
					     on the page, which is worse the more of them there are. */ }

					<ToggleGroupControl
						__nextHasNoMarginBottom
						isBlock
						label={ sprintf(
							/* translators: 1: control label, 2: device tier name. */
							__( '%1$s — %2$s', 'sgs-blocks' ),
							safeLabel,
							TIER_LABEL_BY_KEY[ activeTier ]
						) }
						hideLabelFromVision
						value={ activeOwn }
						onChange={ onTierChange }
					>
						{ options.map( ( opt ) => (
							<ToggleGroupControlOption
								key={ opt.value }
								value={ opt.value }
								label={ opt.label }
							/>
						) ) }
					</ToggleGroupControl>

					{ activeTier !== 'desktop' && activeOwn === 'inherit' && (
						<p
							ref={ resolvedHintRef }
							tabIndex={ -1 }
							className="sgs-tri-state-control__resolved-hint"
						>
							{ sprintf(
								/* translators: 1: parent tier name, 2: resolved On/Off state. */
								__(
									'Uses the %1$s setting: %2$s.',
									'sgs-blocks'
								),
								TIER_LABEL_BY_KEY[ parentTier ],
								onOffLabel( activeResolved.value )
							) }
						</p>
					) }

					{ activeTier !== 'desktop' && activeOwn !== 'inherit' && (
						<Button
							variant="tertiary"
							size="small"
							onClick={ resetActiveTier }
							aria-label={ sprintf(
								/* translators: %s: device tier name. */
								__(
									'Reset %s to inherited value',
									'sgs-blocks'
								),
								TIER_LABEL_BY_KEY[ activeTier ]
							) }
							style={ { minHeight: '44px', marginTop: '4px' } }
						>
							{ __( 'Reset to inherited', 'sgs-blocks' ) }
						</Button>
					) }
				</div>
			) }
		</div>
	);
}
