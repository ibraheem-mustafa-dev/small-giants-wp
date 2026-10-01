/**
 * The per-device show/hide switch shared by the drawer's top-row controls
 * (ChromePanel, ChromeSlotControls), a `{desktop,tablet,mobile}` tier object
 * through ResponsiveOverride.
 *
 * @package SGS\Blocks
 */

import { ToggleControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../components';

/**
 * A per-device show/hide switch.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.label    Label.
 * @param {Object}   props.value    Tier object of booleans.
 * @param {Function} props.onChange Setter for the whole tier object.
 * @return {Element} The control.
 */
export function TierShow( { label, value, onChange } ) {
	return (
		<ResponsiveOverride value={ value || {} } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, setOwnValue } ) => (
				<ToggleControl
					label={ label }
					checked={ false !== ( ownValue ?? effectiveValue ?? true ) }
					onChange={ ( next ) => setOwnValue( next ) }
					__nextHasNoMarginBottom
				/>
			) }
		</ResponsiveOverride>
	);
}
