/**
 * Per-device rows and option lists for the drawer menu's "Row extras" panel
 * (RowExtrasPanel.js): an enum as a toggle group and a length, each a
 * `{desktop,tablet,mobile}` tier object through ResponsiveOverride.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ResponsiveOverride, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

export const ORNAMENT_OPTIONS = [
	{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
	{ value: 'index', label: __( 'Number', 'sgs-blocks' ) },
	{ value: 'icon', label: __( 'Icon', 'sgs-blocks' ) },
];

export const REVEAL_OPTIONS = [
	{ value: 'none', label: __( 'Hidden', 'sgs-blocks' ) },
	{ value: 'always', label: __( 'Always', 'sgs-blocks' ) },
	{ value: 'hover', label: __( 'On hover', 'sgs-blocks' ) },
];

export const ORNAMENT_REVEAL_MODE_OPTIONS = [
	{ value: 'static', label: __( 'Always shown', 'sgs-blocks' ) },
	{ value: 'hover-draw', label: __( 'Draw in on hover', 'sgs-blocks' ) },
];

export const tierObject = ( value ) => ( value && typeof value === 'object' ? value : {} );

/**
 * A per-device enum as a toggle group under the global device toggle.
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Control label.
 * @param {string}   root0.help     Help text.
 * @param {Object}   root0.value    The tier object.
 * @param {Array}    root0.options  `{value,label}` options.
 * @param {Function} root0.onChange Receives the next tier object.
 */
export function TierToggle( { label, help, value, options, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ tierObject( value ) } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, setOwnValue } ) => (
				<ToggleGroupControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || effectiveValue || options[ 0 ].value }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ options.map( ( option ) => (
						<ToggleGroupControlOption key={ option.value } value={ option.value } label={ option.label } />
					) ) }
				</ToggleGroupControl>
			) }
		</ResponsiveOverride>
	);
}

/**
 * A per-device length under the global device toggle.
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Control label.
 * @param {string}   root0.help     Help text.
 * @param {Object}   root0.value    The tier object.
 * @param {Function} root0.onChange Receives the next tier object.
 */
export function TierLength( { label, help, value, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ tierObject( value ) } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || '' }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
					presets={ false }
				/>
			) }
		</ResponsiveOverride>
	);
}
