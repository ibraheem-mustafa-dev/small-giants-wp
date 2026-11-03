/**
 * TextAlignTierControl - the per-breakpoint text alignment row (FW-F).
 *
 * One icon-button row that edits the active device through ResponsiveOverride: a blank device inherits the wider
 * screen, a customised device shows its dot, and the row resets per device. The value is the `{desktop, tablet, mobile}`
 * object the block declares as `type: object`; the shared TypographyControls panel and every block with its own
 * alignment row use this one component.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { alignLeft, alignCenter, alignRight, alignJustify } from '@wordpress/icons';
import { ToggleGroupControl, ToggleGroupControlOptionIcon } from './primitives';
import ResponsiveOverride from './ResponsiveOverride';

export const SGS_TEXT_ALIGN_OPTIONS = [
	{ label: __( 'Align text left', 'sgs-blocks' ), value: 'left', icon: alignLeft },
	{ label: __( 'Align text center', 'sgs-blocks' ), value: 'center', icon: alignCenter },
	{ label: __( 'Align text right', 'sgs-blocks' ), value: 'right', icon: alignRight },
	{ label: __( 'Justify text', 'sgs-blocks' ), value: 'justify', icon: alignJustify },
];

/**
 * @param {Object}   props
 * @param {string}   [props.label]    Row label.
 * @param {Object}   props.value      The `{desktop, tablet, mobile}` object.
 * @param {Function} props.onChange   Receives the new object.
 * @param {Array}    [props.options]  Icon options (defaults to left, centre, right, justify).
 */
export default function TextAlignTierControl( {
	label = __( 'Text alignment', 'sgs-blocks' ),
	value,
	onChange,
	options = SGS_TEXT_ALIGN_OPTIONS,
} ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, setOwnValue } ) => (
				<ToggleGroupControl
					isDeselectable
					hideLabelFromVision
					label={ label }
					value={ ownValue || undefined }
					onChange={ ( val ) => setOwnValue( val === ( ownValue || undefined ) ? '' : val ?? '' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ options.map( ( option ) => (
						<ToggleGroupControlOptionIcon
							key={ option.value }
							value={ option.value }
							icon={ option.icon }
							label={ option.label }
						/>
					) ) }
				</ToggleGroupControl>
			) }
		</ResponsiveOverride>
	);
}
