/**
 * Responsive breakpoint switcher for block sidebar controls.
 *
 * Wraps any control and passes the current breakpoint (desktop/tablet/mobile)
 * to the child render function so attributes can be stored per-breakpoint.
 *
 * ── Synced to WordPress's NATIVE device preview (2026-07-18) ──────────────
 * The switcher READS and DRIVES WordPress's own editor device-preview type
 * (`core/editor` `getDeviceType()` / `setDeviceType()` — the Desktop/Tablet/
 * Mobile toggle that resizes the canvas). Previously each control kept a
 * PRIVATE `useState`, so switching a control to "tablet" changed which attr
 * you edited but NOT the canvas — no visual feedback, and every control had
 * its own out-of-sync switcher. Now:
 *   - clicking a device button switches the real canvas preview, so a tablet/
 *     mobile value is immediately visible;
 *   - every responsive control across the block (and the WP top-bar toggle)
 *     stays in lockstep on one source of truth;
 *   - fully compatible with WP core's own responsive preview.
 * Falls back to local state where `core/editor` isn't available (e.g. a
 * site-editor / widget context without the post-editor store).
 *
 * ── Accessible device switcher (FR-37-29, 2026-07-23) ─────────────────────
 * The switcher UI is the shared `DeviceTabs` component — a real
 * `role="tablist"`/`role="tab"` structure with roving tabindex, arrow/Home/End
 * keyboard navigation and >=44x44px targets, replacing the previous plain
 * `ButtonGroup` of small (~24-32px) Tab-key-only buttons. `DeviceTabs` is
 * presentational only; this component still owns which tier is active (either
 * WP's native device preview or the local-state fallback above) and passes
 * that state straight through.
 *
 * Usage:
 *   <ResponsiveControl label="Columns">
 *     { ( breakpoint ) => <RangeControl ... /> }
 *   </ResponsiveControl>
 *
 * ── Optional inherit-indicator + reset (Spec 35 T1.2, P2 §4.2) ────────────
 * Four new props are all OPTIONAL and back-compatible — a caller that omits
 * them (every consumer as of this build) gets byte-identical output; the
 * `children` render-prop signature is UNCHANGED (still called with just
 * `breakpoint`), so no existing caller needs to change:
 *
 *   <ResponsiveControl
 *       label={ __( 'Inner spacing', 'sgs-blocks' ) }
 *       value={ drawerGap }                     // {desktop, tablet:null|val, mobile:null|val}
 *       isInherited={ ( tier ) => drawerGap[ tier ] == null }
 *       resolvedValue={ ( tier ) => resolveTier( drawerGap, tier, '' ).value }
 *       onReset={ ( tier ) => onChange( { ...drawerGap, [ tier ]: null } ) }
 *   >
 *       { ( breakpoint ) => <UnitControl value={ drawerGap[ breakpoint ] ?? '' } … /> }
 *   </ResponsiveControl>
 *
 * When supplied, `isInherited`/`resolvedValue` drive a visible ghost-text hint
 * ("Inheriting from Desktop: 28px", WCAG 1.4.1/4.1.2 — never a bare
 * `placeholder` attribute) rendered after `children`, and `onReset` renders a
 * >=44px "Reset to inherited value" button on a non-desktop tier that carries
 * an explicit value. Putting the resolved value INSIDE the input's own
 * placeholder is the caller's job (it already has the same `value`/
 * `resolveTier` in closure, as the usage example shows) — this component only
 * owns the auxiliary hint + reset UI, exactly as it already owns nothing about
 * the input itself.
 */
import { useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import DeviceTabs from './DeviceTabs';

const BREAKPOINTS = [
	{
		key: 'desktop',
		device: 'Desktop',
		icon: desktop,
		label: __( 'Desktop', 'sgs-blocks' ),
	},
	{
		key: 'tablet',
		device: 'Tablet',
		icon: tablet,
		label: __( 'Tablet', 'sgs-blocks' ),
	},
	{
		key: 'mobile',
		device: 'Mobile',
		icon: mobile,
		label: __( 'Mobile', 'sgs-blocks' ),
	},
];

// WP's native device-type names → our breakpoint keys.
const DEVICE_TO_KEY = {
	Desktop: 'desktop',
	Tablet: 'tablet',
	Mobile: 'mobile',
};

export default function ResponsiveControl( {
	children,
	label,
	value,
	isInherited,
	resolvedValue,
	onReset,
} ) {
	// WP-native device preview (the canvas-resizing top-bar toggle). null when
	// the post-editor store isn't present (site editor / widgets context).
	const nativeDevice = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		return ed && typeof ed.getDeviceType === 'function'
			? ed.getDeviceType()
			: null;
	}, [] );
	const { setDeviceType } = useDispatch( 'core/editor' ) || {};

	// Local fallback only used when the native store is unavailable.
	const [ localKey, setLocalKey ] = useState( 'desktop' );

	const usingNative = !! nativeDevice && typeof setDeviceType === 'function';
	const breakpoint = usingNative
		? DEVICE_TO_KEY[ nativeDevice ] || 'desktop'
		: localKey;

	const pick = ( key ) => {
		if ( usingNative ) {
			const bp = BREAKPOINTS.find( ( b ) => b.key === key );
			setDeviceType( bp.device );
		} else {
			setLocalKey( key );
		}
	};

	// Optional inherit-indicator + reset (P2 §4.2, Spec 35 T1.2). Every prop
	// here is optional; a caller that doesn't pass them (all current callers)
	// gets `hasInheritAPI === false` and none of this renders — byte-identical
	// to the pre-extension output.
	const hasInheritAPI = typeof isInherited === 'function';
	const tierIsInherited =
		hasInheritAPI && breakpoint !== 'desktop' && isInherited( breakpoint );
	const tierResolved =
		hasInheritAPI && typeof resolvedValue === 'function'
			? resolvedValue( breakpoint )
			: undefined;
	const canReset =
		hasInheritAPI &&
		typeof onReset === 'function' &&
		breakpoint !== 'desktop' &&
		! tierIsInherited &&
		value !== undefined;

	return (
		<div className="sgs-responsive-control">
			<div className="sgs-responsive-control__header">
				{ label && (
					<span className="sgs-responsive-control__label">
						{ label }
					</span>
				) }
				<DeviceTabs
					className="sgs-responsive-control__buttons"
					tiers={ BREAKPOINTS }
					active={ breakpoint }
					onChange={ pick }
					ariaLabel={ sprintf(
						/* translators: %s: control label. */
						__( '%s — device', 'sgs-blocks' ),
						label || __( 'Responsive', 'sgs-blocks' )
					) }
				/>
			</div>
			{ children( breakpoint ) }
			{ tierIsInherited && (
				<p className="sgs-responsive-control__inherited-hint">
					{ sprintf(
						/* translators: 1: source device tier, 2: the resolved value. */
						__( 'Inheriting from %1$s: %2$s', 'sgs-blocks' ),
						__( 'Desktop', 'sgs-blocks' ),
						tierResolved ?? ''
					) }
				</p>
			) }
			{ canReset && (
				<Button
					variant="tertiary"
					size="small"
					onClick={ () => onReset( breakpoint ) }
					aria-label={ sprintf(
						/* translators: %s: control label. */
						__( 'Reset %s to inherited value', 'sgs-blocks' ),
						label || __( 'Responsive', 'sgs-blocks' )
					) }
					style={ { minHeight: '44px', marginTop: '4px' } }
				>
					{ __( 'Reset to inherited value', 'sgs-blocks' ) }
				</Button>
			) }
		</div>
	);
}
