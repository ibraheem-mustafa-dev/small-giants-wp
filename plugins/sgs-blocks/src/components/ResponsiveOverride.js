/**
 * ResponsiveOverride: SGS-owned per-device override control (Spec 37 FR-37-16; display per Spec 49 §9.2).
 *
 * Stores each property as the `{desktop,tablet,mobile}` object model where a blank tier INHERITS the tier above
 * (desktop is always concrete). Render-prop: it manages the active tier and the inherited-value display; the caller
 * renders the input for the active tier. The tier is the editor's one global device toggle.
 *
 * Display (Spec 49 §9.2):
 *  - an inherited tier says "Mobile: using Tablet" (the tier that really holds the value) or "Mobile: default", with a
 *    link icon, never colour alone (WCAG 1.4.1); the render prop passes `placeholder` (the inherited value) and
 *    `sourceTier` so the caller's field can show it as a grey placeholder;
 *  - a dot marks Tablet and Mobile when they hold their own value; each dot is a shape with an accessible name;
 *  - Reset is a keyboard-reachable button of at least 44px that names the tier the field falls back to ("Reset to
 *    Tablet", "Reset to Desktop"); on Desktop, "Reset to default" shows when `desktopReset` is set;
 *  - `global` marks a setting that applies to all devices: off Desktop it says "Applies to all devices" and the
 *    value is the plain stored value, not a tier object;
 *  - the device name is part of each accessible label.
 *
 * Props: `label`, `value`, `onChange`, `children`; optional `inheritedNoun` ("video" gives "Mobile: using Desktop's
 * video"), `desktopReset` and `global`.
 *
 * Usage:
 *   <ResponsiveOverride
 *     label={ __( 'Gap between elements', 'sgs-blocks' ) }
 *     value={ attributes.gap }                 // {desktop,tablet,mobile} | undefined
 *     onChange={ ( obj ) => setAttributes( { gap: obj } ) }
 *   >
 *     { ( { ownValue, effectiveValue, inherited, placeholder, setOwnValue } ) => (
 *       <SgsLengthControl
 *         value={ ownValue }
 *         placeholder={ placeholder }
 *         onChange={ setOwnValue }
 *       />
 *     ) }
 *   </ResponsiveOverride>
 */
import { link as linkIcon } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { makeResponsive, resolveResponsiveTier } from '../utils/responsive';
import { inheritedBox } from '../utils/inherited-box';
import { InheritedBoxContext } from './InheritedBoxContext';
import { ControlLabelContext } from './ControlLabelContext';
import { deviceName, describeInheritance, resetLabel, resolveTierSource, useActiveDevice } from './media/deviceValues.js';
import './ResponsiveOverride.css';

// Every side and corner key a box control can show; the box inside this override reads the ones it has.
const BOX_KEYS = [
	'top',
	'right',
	'bottom',
	'left',
	'topLeft',
	'topRight',
	'bottomRight',
	'bottomLeft',
];

const OWN_TIERS = [ 'tablet', 'mobile' ];

const isOwn = ( value ) => value !== undefined && value !== null && value !== '';

export default function ResponsiveOverride( {
	label,
	value,
	onChange,
	children,
	inheritedNoun = '',
	desktopReset = false,
	global = false,
} ) {
	const active = useActiveDevice();

	if ( global ) {
		return (
			<div className="sgs-responsive-override sgs-responsive-override--global">
				<div className="sgs-responsive-override__header">
					{ label && <span className="sgs-responsive-override__label">{ label }</span> }
				</div>
				<div className="sgs-responsive-override__field">
					<ControlLabelContext.Provider value={ label || '' }>
						{ children( {
							tier: 'desktop',
							ownValue: value,
							effectiveValue: value,
							inherited: false,
							placeholder: '',
							sourceTier: null,
							setOwnValue: onChange,
							resetTier: () => onChange( '' ),
						} ) }
					</ControlLabelContext.Provider>
				</div>
				{ 'desktop' !== active && (
					<p className="sgs-responsive-override__global-note">
						{ __( 'Applies to all devices', 'sgs-blocks' ) }
					</p>
				) }
			</div>
		);
	}

	const obj = value && typeof value === 'object' ? value : {};
	const resolved = resolveResponsiveTier( obj, active );
	// desktop is always its own value; tablet/mobile inherit when they have none.
	const ownRaw = obj?.[ active ];
	const hasOwn = isOwn( ownRaw );
	const inherited = active !== 'desktop' && ! hasOwn;
	// The tier that holds the value this device shows, and the one it falls back to once its own is cleared.
	const source = resolveTierSource( obj, active ).from;
	const without = { ...obj };
	delete without[ active ];
	const fallbackTier = 'desktop' === active ? null : resolveTierSource( without, active ).from;

	const writeTier = ( tierKey, tierValue ) => {
		const next = { ...obj };
		if ( ! isOwn( tierValue ) ) {
			delete next[ tierKey ];
		} else {
			next[ tierKey ] = tierValue;
		}
		onChange( makeResponsive( next ) );
	};

	const setOwnValue = ( v ) => writeTier( active, v );
	const resetTier = () => writeTier( active, '' );
	const showReset = hasOwn && ( 'desktop' !== active || desktopReset );
	const visibleReset = resetLabel( active, fallbackTier );

	return (
		<div className="sgs-responsive-override">
			<div className="sgs-responsive-override__header">
				{ label && <span className="sgs-responsive-override__label">{ label }</span> }
				<span className="sgs-responsive-override__dots">
					{ OWN_TIERS.filter( ( tier ) => isOwn( obj?.[ tier ] ) ).map( ( tier ) => (
						<span
							key={ tier }
							role="img"
							className={ `sgs-responsive-override__dot sgs-responsive-override__dot--${ tier }` }
							aria-label={
								label
									? sprintf(
											/* translators: 1: device name, 2: the setting's label. */
											__( '%1$s has its own value for %2$s', 'sgs-blocks' ),
											deviceName( tier ),
											label
									  )
									: sprintf(
											/* translators: %s: device name. */
											__( '%s has its own value', 'sgs-blocks' ),
											deviceName( tier )
									  )
							}
						/>
					) ) }
				</span>
			</div>

			<div className={ `sgs-responsive-override__field${ inherited ? ' is-inherited' : '' }` }>
				<ControlLabelContext.Provider value={ label || '' }>
					<InheritedBoxContext.Provider
						value={ inheritedBox( obj, active, BOX_KEYS ) }
					>
						{ children( {
							tier: active,
							ownValue: hasOwn ? ownRaw : '',
							effectiveValue: resolved.value,
							inherited,
							placeholder: inherited ? resolved.value : '',
							sourceTier: inherited ? source : null,
							setOwnValue,
							resetTier,
						} ) }
					</InheritedBoxContext.Provider>
				</ControlLabelContext.Provider>
			</div>

			{ inherited && (
				<div className="sgs-responsive-override__inherited">
					{ /* Non-colour cue: an explicit icon + text, never colour alone (WCAG 1.4.1). */ }
					<span aria-hidden="true" className="sgs-responsive-override__inherited-icon">
						{ linkIcon }
					</span>
					<span className="sgs-responsive-override__inherited-text">
						{ describeInheritance( active, source, inheritedNoun ) }
					</span>
				</div>
			) }

			{ showReset && (
				<Button
					variant="tertiary"
					size="small"
					className="sgs-responsive-override__reset"
					onClick={ resetTier }
					aria-label={
						label
							? `${ visibleReset } (${ deviceName( active ) } ${ label })`
							: `${ visibleReset } (${ deviceName( active ) })`
					}
				>
					{ visibleReset }
				</Button>
			) }
		</div>
	);
}
