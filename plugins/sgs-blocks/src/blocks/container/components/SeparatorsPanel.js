/**
 * SeparatorsPanel: the lines between a wrapper-routed composite's items.
 *
 * A composite opts in to sgs/container's Separators setting (Spec 31 §13.6): the
 * `separators` attribute is read by SGS_Container_Wrapper
 * (includes/helpers-container-separators.php), which draws the lines between the
 * items of a grid or flex layout. The panel shows only where that can draw: the block
 * declares `separators` and its `layout` is grid, flex or stack.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsSeparatorControl } from '../../../components';

const LINED_LAYOUTS = [ 'grid', 'flex', 'stack' ];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes function.
 * @param {string}   [props.layout]      The resolved layout when the block keeps it outside `attributes.layout`.
 * @return {JSX.Element|null} The panel, or null when no line can draw.
 */
export function SeparatorsPanel( { attributes, setAttributes, layout } ) {
	const resolved = layout ?? attributes.layout;
	if ( undefined === attributes.separators || ! LINED_LAYOUTS.includes( resolved ) ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Separators', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsSeparatorControl
				value={ attributes.separators }
				onChange={ ( next ) => setAttributes( { separators: next } ) }
			/>
		</PanelBody>
	);
}
