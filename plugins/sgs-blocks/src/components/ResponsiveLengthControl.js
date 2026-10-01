/**
 * ResponsiveLengthControl — one per-device CSS length under the global device toggle.
 *
 * Wraps SgsLengthControl in ResponsiveOverride. `value` is a `{desktop,tablet,mobile}`
 * tier object; a blank tablet or mobile tier inherits the tier above and shows that
 * inherited length as the placeholder. ResponsiveOverride carries the visible label,
 * so the length field's own label is visually hidden.
 *
 * Usage:
 *   <ResponsiveLengthControl
 *     label={ __( 'Item gap', 'sgs-blocks' ) }
 *     value={ attributes.gap }
 *     onChange={ ( obj ) => setAttributes( { gap: obj } ) }
 *   />
 *
 * @package SGS\Blocks
 */

import ResponsiveOverride from './ResponsiveOverride';
import SgsLengthControl from './SgsLengthControl';

/**
 * @param {Object}   props               Props.
 * @param {string}   props.label         Visible label (also the field's accessible name).
 * @param {string}   [props.help]        Help text under the field.
 * @param {Object}   props.value         Tier object `{desktop,tablet,mobile}`; a non-object reads as empty.
 * @param {Function} props.onChange      Receives the whole next tier object.
 * @param {string}   [props.placeholder] Placeholder shown on a tier that does not inherit.
 * @param {boolean}  [props.presets]     Offer the spacing-preset picker. Default false.
 * @param {Array}    [props.units]       UnitControl unit list; SgsLengthControl's default when omitted.
 * @return {Element} The control.
 */
export default function ResponsiveLengthControl( {
	label,
	help,
	value,
	onChange,
	placeholder = '',
	presets = false,
	units,
} ) {
	const tiers = value && typeof value === 'object' ? value : {};
	return (
		<ResponsiveOverride label={ label } value={ tiers } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					label={ label }
					hideLabelFromVision
					help={ help }
					units={ units }
					value={ ownValue || '' }
					placeholder={ inherited ? effectiveValue : placeholder }
					onChange={ ( next ) => setOwnValue( next || undefined ) }
					presets={ presets }
				/>
			) }
		</ResponsiveOverride>
	);
}
