/**
 * DeviceTabs — shared accessible device-tier switcher (FR-37-29).
 *
 * ⚠ CORRECTED 2026-08-19 — this file currently has **ZERO JSX mounts**
 * anywhere in the plugin (verified via `grep -rl '<DeviceTabs\b'` across
 * `src/blocks/` and `src/components/`, 2026-08-19 — every remaining hit is a
 * comment documenting its removal, not a live mount). The two consumers this
 * docblock used to describe (`ResponsiveControl`, `ResponsiveOverride`) both
 * removed their per-control `<DeviceTabs>` strip — Phase 1.2 (2026-08-10) for
 * `ResponsiveControl`, Phase 1.3 (2026-08-10) for `ResponsiveOverride` and
 * `ResponsiveTriStateControl`. What supersedes it: the single global device
 * toggle docked at the bottom of the inspector,
 * `src/blocks/extensions/responsive-device-toggle.js`, which every
 * responsive control now reads via `core/editor`'s `getDeviceType()` instead
 * of rendering its own switcher. This file is kept as source but is
 * currently dead code — do not cite the description below as describing a
 * live mount without re-verifying first.
 *
 * Presentational only: owns the `role="tablist"` / `role="tab"` structure,
 * `aria-selected`, roving tabindex, arrow-key + Home/End keyboard navigation,
 * and >=44x44px targets. It owns NO state — the active tier and the change
 * handler are both controlled by the caller, so a consumer mounting it would
 * keep its own state model on top of this shared shell.
 *
 * Accessibility (FR-37-29 / WCAG 2.2):
 *  - Real `tablist`/`tab` roles (not a plain `ButtonGroup`), so the switcher
 *    is announced and operable as tabs, not a row of unrelated buttons.
 *  - Roving tabindex: only the active tab is in the Tab order; arrow keys
 *    (or Up/Down) move focus + selection between tabs; Home/End jump to the
 *    first/last tab — the standard tablist keyboard contract.
 *  - Every target measures >=44x44px (SGS keeps 44px though WCAG 2.2 only
 *    requires 24px).
 *
 * Usage:
 *   <DeviceTabs
 *     tiers={ [ { key: 'desktop', icon: desktop, label: __( 'Desktop', 'sgs-blocks' ) }, ... ] }
 *     active={ activeKey }
 *     onChange={ ( key ) => setActive( key ) }
 *     ariaLabel={ __( 'Device', 'sgs-blocks' ) }
 *   />
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function DeviceTabs( {
	tiers,
	active,
	onChange,
	ariaLabel,
	getTabLabel,
	className,
} ) {
	const activeIndex = tiers.findIndex( ( t ) => t.key === active );

	// Arrow-key + Home/End roving tabindex across the tier tabs.
	const onTabKeyDown = ( e ) => {
		let nextIndex = null;
		if ( e.key === 'ArrowRight' || e.key === 'ArrowDown' ) {
			nextIndex = ( activeIndex + 1 ) % tiers.length;
		} else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) {
			nextIndex = ( activeIndex - 1 + tiers.length ) % tiers.length;
		} else if ( e.key === 'Home' ) {
			nextIndex = 0;
		} else if ( e.key === 'End' ) {
			nextIndex = tiers.length - 1;
		}
		if ( nextIndex !== null ) {
			e.preventDefault();
			onChange( tiers[ nextIndex ].key );
		}
	};

	return (
		<div
			className={ className || 'sgs-device-tabs' }
			role="tablist"
			aria-label={ ariaLabel || __( 'Device', 'sgs-blocks' ) }
			style={ { display: 'flex', gap: '2px' } }
		>
			{ tiers.map( ( t ) => {
				const isActive = t.key === active;
				return (
					<Button
						key={ t.key }
						role="tab"
						icon={ t.icon }
						isPressed={ isActive }
						aria-selected={ isActive }
						tabIndex={ isActive ? 0 : -1 }
						onKeyDown={ onTabKeyDown }
						onClick={ () => onChange( t.key ) }
						label={ getTabLabel ? getTabLabel( t, isActive ) : t.label }
						showTooltip
						style={ { minWidth: '44px', minHeight: '44px' } }
					/>
				);
			} ) }
		</div>
	);
}
