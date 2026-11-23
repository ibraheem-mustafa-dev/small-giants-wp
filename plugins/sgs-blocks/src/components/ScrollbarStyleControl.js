/**
 * The inspector control for a scrolling area's scrollbar (Spec 02 FR-2-35): default, thin or hidden.
 *
 * The one control every block uses for its scrollbar setting; the live page prints the choice through
 * includes/helpers-scrollbar.php and a canvas drawn in JavaScript through src/utils/scrollbar-style.js.
 * Unset, the control shows the area's starting value (what the area renders with the setting untouched).
 * When the area's scrollbar is hidden and the block draws nothing else to move it (no arrows, dots or drag),
 * a warning says so: some pointer users can then reach the hidden content only by keyboard or touch.
 */
import { __ } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';

import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

import { scrollbarStyle } from '../utils/scrollbar-style';

/**
 * @param {Object}   props
 * @param {string}   [props.label]       The control's label (names the area on a block with several).
 * @param {string}   [props.value]       The stored setting (undefined when unset).
 * @param {string}   props.start         The area's starting value.
 * @param {Function} props.onChange      Receives the chosen value.
 * @param {boolean}  [props.hasOtherWay] True when the block draws arrows, dots or drag for this area.
 * @param {string}   [props.help]        Optional help text.
 * @return {Element} The control.
 */
export default function ScrollbarStyleControl( {
	label = __( 'Scrollbar', 'sgs-blocks' ),
	value,
	start,
	onChange,
	hasOtherWay = false,
	help,
} ) {
	const choice = scrollbarStyle( value, start );
	return (
		<>
			<ToggleGroupControl
				label={ label }
				help={ help }
				value={ choice }
				onChange={ onChange }
				isBlock
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			>
				<ToggleGroupControlOption
					value="default"
					label={ __( 'Default', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="thin"
					label={ __( 'Thin', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="hidden"
					label={ __( 'Hidden', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>
			{ 'hidden' === choice && ! hasOtherWay && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The scrollbar is hidden and nothing else on this block moves this area (no arrows, dots or drag). Visitors using a mouse may not see that more is out of view, or reach it. Show arrows or dots, or keep a scrollbar.',
						'sgs-blocks'
					) }
				</Notice>
			) }
		</>
	);
}
