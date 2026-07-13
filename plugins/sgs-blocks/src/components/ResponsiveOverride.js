/**
 * ResponsiveOverride — SGS-owned per-device override control (FR-S9-6).
 *
 * A device switcher (desktop / tablet / mobile) that stores each property as the
 * `{desktop,tablet,mobile}` object model where a blank tier INHERITS the tier
 * above (desktop is always concrete). Render-prop: it manages the active tier +
 * the inherited-value UX; the caller renders the actual input for the active tier.
 *
 * Accessibility (FR-S9-6, WCAG 2.2):
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
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { desktop, tablet, mobile, link as linkIcon } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { makeResponsive, resolveResponsiveTier } from '../utils/responsive';

const TIERS = [
	{ key: 'desktop', icon: desktop, label: __( 'Desktop', 'sgs-blocks' ) },
	{ key: 'tablet', icon: tablet, label: __( 'Tablet', 'sgs-blocks' ) },
	{ key: 'mobile', icon: mobile, label: __( 'Mobile', 'sgs-blocks' ) },
];

const TIER_ABOVE = { tablet: __( 'Desktop', 'sgs-blocks' ), mobile: __( 'Tablet', 'sgs-blocks' ) };

export default function ResponsiveOverride( { label, value, onChange, children } ) {
	const [ active, setActive ] = useState( 'desktop' );
	const obj = value && typeof value === 'object' ? value : {};

	const activeIndex = TIERS.findIndex( ( t ) => t.key === active );
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

	// Arrow-key roving tabindex across the tier tabs.
	const onTabKeyDown = ( e ) => {
		let nextIndex = null;
		if ( e.key === 'ArrowRight' || e.key === 'ArrowDown' ) {
			nextIndex = ( activeIndex + 1 ) % TIERS.length;
		} else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) {
			nextIndex = ( activeIndex - 1 + TIERS.length ) % TIERS.length;
		} else if ( e.key === 'Home' ) {
			nextIndex = 0;
		} else if ( e.key === 'End' ) {
			nextIndex = TIERS.length - 1;
		}
		if ( nextIndex !== null ) {
			e.preventDefault();
			setActive( TIERS[ nextIndex ].key );
		}
	};

	return (
		<div className="sgs-responsive-override">
			<div className="sgs-responsive-override__header">
				{ label && (
					<span className="sgs-responsive-override__label">{ label }</span>
				) }
				<div
					className="sgs-responsive-override__tabs"
					role="tablist"
					aria-label={ sprintf(
						/* translators: %s: control label. */
						__( '%s — device', 'sgs-blocks' ),
						label || __( 'Responsive', 'sgs-blocks' )
					) }
					style={ { display: 'flex', gap: '2px' } }
				>
					{ TIERS.map( ( t ) => {
						const isActive = t.key === active;
						const tierHasOwn =
							t.key === 'desktop' ||
							( obj?.[ t.key ] !== undefined && obj?.[ t.key ] !== null && obj?.[ t.key ] !== '' );
						return (
							<Button
								key={ t.key }
								role="tab"
								icon={ t.icon }
								isPressed={ isActive }
								aria-selected={ isActive }
								tabIndex={ isActive ? 0 : -1 }
								onKeyDown={ onTabKeyDown }
								onClick={ () => setActive( t.key ) }
								label={
									tierHasOwn
										? t.label
										: sprintf(
												/* translators: %s: device name. */
												__( '%s (inherited)', 'sgs-blocks' ),
												t.label
										  )
								}
								showTooltip
								style={ { minWidth: '44px', minHeight: '44px' } }
							/>
						);
					} ) }
				</div>
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
