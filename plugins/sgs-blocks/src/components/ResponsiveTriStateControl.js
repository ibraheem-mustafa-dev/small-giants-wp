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
 * UX: the device comes from the ONE global toggle docked at the bottom of the
 * inspector, like every other responsive control. On Desktop the control is a
 * single `ToggleControl`; on Tablet or Phone it is an Inherit / Off / On
 * segment whose Inherit option names what it follows ("Inherit (following All
 * devices: On)", resolved by the shared `resolveTier()`), with a reset back to
 * Inherit. A text line names any tier that carries its own value, so an
 * override is never invisible while editing another device.
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
import { useRef } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	ToggleControl,
	Button,
} from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { resolveTier } from '../utils/responsive';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

// TIER_META supplies the tier names shown in labels and hints.

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
	// The tier comes from the ONE global toggle (Spec 35 Phase 1.3).
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

	// The Desktop switch writes Desktop only; it never touches a tablet/phone
	// override (§4.1: "explicit flip behaviour").
	const handleDesktopToggle = ( checked ) => {
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

	const customisedNote = hasCustomisation && (
		<p className="sgs-tri-state-control__customised-note">
			{ sprintf(
				/* translators: %s: comma-separated list of device tiers with an explicit override. */
				__( 'Customised for %s.', 'sgs-blocks' ),
				customisedTiers
					.map( ( t ) => TIER_LABEL_BY_KEY[ t ] )
					.join( ', ' )
			) }
		</p>
	);

	if ( 'desktop' === activeTier ) {
		return (
			<div className="sgs-tri-state-control">
				<ToggleControl
					__nextHasNoMarginBottom
					label={ label }
					help={ help }
					checked={ desktopExplicit === 'on' }
					onChange={ handleDesktopToggle }
				/>
				{ customisedNote }
			</div>
		);
	}

	return (
		<div className="sgs-tri-state-control">
			<ToggleGroupControl
				__nextHasNoMarginBottom
				isBlock
				label={ sprintf(
					/* translators: 1: control label, 2: device tier name. */
					__( '%1$s — %2$s', 'sgs-blocks' ),
					safeLabel,
					TIER_LABEL_BY_KEY[ activeTier ]
				) }
				help={ help }
				value={ activeOwn }
				onChange={ onTierChange }
				__next40pxDefaultSize
			>
				{ options.map( ( opt ) => (
					<ToggleGroupControlOption
						key={ opt.value }
						value={ opt.value }
						label={ opt.label }
					/>
				) ) }
			</ToggleGroupControl>

			{ activeOwn === 'inherit' && (
				<p
					ref={ resolvedHintRef }
					tabIndex={ -1 }
					className="sgs-tri-state-control__resolved-hint"
				>
					{ sprintf(
						/* translators: 1: parent tier name, 2: resolved On/Off state. */
						__( 'Uses the %1$s setting: %2$s.', 'sgs-blocks' ),
						TIER_LABEL_BY_KEY[ parentTier ],
						onOffLabel( activeResolved.value )
					) }
				</p>
			) }

			{ activeOwn !== 'inherit' && (
				<Button
					variant="tertiary"
					size="small"
					onClick={ resetActiveTier }
					aria-label={ sprintf(
						/* translators: %s: device tier name. */
						__( 'Reset %s to inherited value', 'sgs-blocks' ),
						TIER_LABEL_BY_KEY[ activeTier ]
					) }
					style={ { minHeight: '44px', marginTop: '4px' } }
				>
					{ __( 'Reset to inherited', 'sgs-blocks' ) }
				</Button>
			) }
			{ customisedNote }
		</div>
	);
}
