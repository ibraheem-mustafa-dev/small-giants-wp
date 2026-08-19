/**
 * Responsive breakpoint switcher for block sidebar controls.
 *
 * Wraps any control and passes the current breakpoint (desktop/tablet/mobile)
 * to the child render function so attributes can be stored per-breakpoint.
 *
 * ── ONE global switcher (Spec 35 Phase 1.2, 2026-08-10) ───────────────────
 * This component NO LONGER RENDERS A SWITCHER. It reads the current tier from
 * `core/editor` `getDeviceType()` and passes it to its child; the tier is
 * chosen once, in the global toggle docked at the bottom of the inspector
 * (`src/blocks/extensions/responsive-device-toggle.js`).
 *
 * Why: this component has 73 call sites across 32 files, and the strip it used
 * to render appeared roughly 192 times on screen — 192 copies of the same three
 * buttons, every one reading and writing the SAME piece of state. Deleting the
 * strip from this one file removed all of them.
 *
 * ⛔ Do NOT re-add a per-control switcher here or in any consumer. That is the
 * whole point of the change, and `inspector-scan` rule 25 exists to catch it.
 *
 * ⛔ The old local-state fallback is GONE and must not be reinstated on the
 * strength of the comment that used to justify it. That comment claimed
 * `core/editor` is unavailable in the site editor; measured on WP 7.0.2 it
 * answers in BOTH editors, so the fallback branch was unreachable. The widgets
 * screen is the only unprobed surface — re-adding a fallback for it needs its
 * own evidence, not this docblock's say-so.
 *
 * ⚠ CORRECTED 2026-08-19 — this used to say the accessible `DeviceTabs`
 * component (FR-37-29) "still exists and is still used by `ResponsiveOverride`
 * and `ResponsiveTriStateControl`; it is simply no longer used here." That was
 * true only through Phase 1.2. Phase 1.3 (2026-08-10) removed the per-control
 * `<DeviceTabs>` strip from those two consumers as well — see
 * `ResponsiveTriStateControl.js`'s own docblock ("`DeviceTabs` now has zero
 * callers anywhere") and its "Removed with the switcher (Phase 1.3)" comment,
 * and `ResponsiveOverride.js`'s matching removal note. `DeviceTabs.js` itself
 * still exists as a file but currently has **zero JSX mounts** anywhere in
 * this plugin (verified via `grep -rl '<DeviceTabs\b'`, 2026-08-19 — every
 * remaining hit is a comment documenting the removal, not a mount). The
 * single global device toggle at
 * `src/blocks/extensions/responsive-device-toggle.js` supersedes it.
 *
 * Usage:
 *   <ResponsiveControl label="Columns">
 *     { ( breakpoint ) => <RangeControl ... __next40pxDefaultSize /> }
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
 *       { ( breakpoint ) => <UnitControl value={ drawerGap[ breakpoint ] ?? '' } … __next40pxDefaultSize /> }
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
import { useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

// ⛔ Five imports and the BREAKPOINTS table were removed with the switcher
// (Phase 1.2): `useState` + `useDispatch` (the deleted local-state fallback and
// its writer), `DeviceTabs`, and the `desktop`/`tablet`/`mobile` icons that only
// the BREAKPOINTS table used. All were verified unreferenced elsewhere in this
// file before deletion, and BREAKPOINTS was never exported. `Button` and
// `sprintf` STAY — they are used by the inherit-reset control further down.
//
// `lint:js` is NOT in the prebuild chain, so an unused import here would not
// fail any gate. It was checked by hand.

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
	// The device tier now comes from ONE place: the global toggle docked at the
	// bottom of the inspector (src/blocks/extensions/responsive-device-toggle.js).
	// This component only READS the tier and passes it to its child.
	//
	// ⛔ The old local-state fallback here was DEAD CODE and is deleted. The
	// comment justifying it claimed `core/editor` is absent in the site editor;
	// that was measured FALSE on WP 7.0.2 (getDeviceType answers in BOTH the post
	// editor and the site editor), so `usingNative` was always true and
	// `localKey` was never read. Do not reinstate a fallback on the strength of
	// that comment — the widgets screen is the only unprobed surface, and
	// re-adding one there needs its own evidence.
	const nativeDevice = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		return ed && typeof ed.getDeviceType === 'function'
			? ed.getDeviceType()
			: null;
	}, [] );

	const breakpoint = DEVICE_TO_KEY[ nativeDevice ] || 'desktop';

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
				{ /* ⛔ The per-control <DeviceTabs> strip was DELETED here (Spec 35
				     Phase 1.2). This one line rendered ~192 identical three-button
				     strips across 73 call sites in 32 files, every one of them
				     reading and writing the SAME core/editor state. The tier is now
				     chosen once, in the global toggle docked at the bottom of the
				     inspector. Do not re-add a switcher here: `inspector-scan` rule
				     25 exists to catch exactly that. */ }
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
