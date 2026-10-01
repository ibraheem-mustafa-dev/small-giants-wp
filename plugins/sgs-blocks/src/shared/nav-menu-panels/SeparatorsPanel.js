/**
 * SGS Nav Bar/Drawer Menu (shared) — a panel holding one `SgsSeparatorControl`: the
 * lines between a nav list's items. Mounted once for the top-level items
 * (`separators`) and once for the submenu rows (`submenuSeparators`) by each block's
 * edit.js, with the axes and extras that list offers.
 *
 * @package SGS\Blocks
 */
import { PanelBody } from '@wordpress/components';
import { SgsSeparatorControl } from '../../components';

/**
 * @param {Object}   props
 * @param {string}   props.title     Panel title.
 * @param {string}   props.label     Heading inside the control.
 * @param {Object}   props.value     The stored separators object.
 * @param {Function} props.onChange  Receives the whole next object.
 * @param {string[]} props.axes      The axes this list offers.
 * @param {boolean}  [props.edges]   Offer the outer-lines choice.
 * @param {boolean}  [props.sweep]   Offer the sweep hover treatment.
 * @return {JSX.Element} The panel.
 */
export default function SeparatorsPanel( { title, label, value, onChange, axes, edges = false, sweep = false } ) {
	return (
		<PanelBody title={ title } initialOpen={ false }>
			<SgsSeparatorControl
				label={ label }
				value={ value }
				onChange={ onChange }
				axes={ axes }
				edges={ edges }
				hover
				sweep={ sweep }
			/>
		</PanelBody>
	);
}
