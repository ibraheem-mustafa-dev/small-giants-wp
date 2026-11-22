/**
 * TierSelectControl - a per-breakpoint select for one keyword layout setting (cross-axis alignment, justify content,
 * justify items, align content).
 *
 * A select edited through ResponsiveOverride on the editor's one device switcher: a blank device inherits the wider
 * screen, a customised device shows its dot, and the row resets per device. The value is the `{desktop, tablet, mobile}`
 * object the block declares as `type: object`. Pass the row's own `label`; `options` lists the choices (without the blank
 * entry), and `defaultLabel` names what a blank desktop means for that setting.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import ResponsiveOverride from './ResponsiveOverride';

/**
 * @param {Object}   props
 * @param {string}   [props.label]        Row label.
 * @param {string}   [props.help]         Help text.
 * @param {Object}   props.value          The `{desktop, tablet, mobile}` object.
 * @param {Function} props.onChange       Receives the new object.
 * @param {Array}    props.options        `{ label, value }` options (without the blank entry).
 * @param {string}   [props.defaultLabel] Label of the blank entry on desktop (default "Default").
 */
export default function TierSelectControl( {
	label = __( 'Align items', 'sgs-blocks' ),
	help,
	value,
	onChange,
	options,
	defaultLabel,
} ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ value }
			onChange={ onChange }
		>
			{ ( { tier, ownValue, setOwnValue } ) => (
				<SelectControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || '' }
					options={ [
						{
							label:
								'desktop' === tier
									? defaultLabel ||
									  __( 'Default', 'sgs-blocks' )
									: __(
											'Same as the wider screen',
											'sgs-blocks'
									  ),
							value: '',
						},
						...options,
					] }
					onChange={ ( val ) => setOwnValue( val ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</ResponsiveOverride>
	);
}
