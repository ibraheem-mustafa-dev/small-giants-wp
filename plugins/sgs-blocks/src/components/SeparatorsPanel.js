/**
 * SeparatorsPanel: the one Inspector surface for the lines between a block's items.
 *
 * What the block offers (axes, outer lines, hover colour, sweep) is read from its own
 * block.json `supports.sgs.separators.<attribute>`, the same entry
 * `includes/helpers-separators.php::sgs_separators_caps` reads on the server, so the
 * panel and the render cannot disagree. A block that declares nothing gets no panel.
 *
 * Two shapes:
 *   - panel (default): a `PanelBody` titled "Separators" around the control;
 *   - `bare`: the control alone, for a block that places it inside a larger panel.
 *
 * `lined` adds the wrapper-routed composites' gate: the control shows only while the
 * layout (`layout` prop, else `attributes.layout`) is grid, flex or stack, the layouts
 * that have items side by side or stacked to separate. `axes` narrows the declared axes
 * for a block whose own state limits what it can draw (a one-row marquee).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { useBlockEditContext } from '@wordpress/block-editor';
import SgsSeparatorControl from './SgsSeparatorControl';
import { separatorCaps } from '../utils/separators';

const LINED_LAYOUTS = [ 'grid', 'flex', 'stack' ];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes       Block attributes.
 * @param {Function} props.setAttributes    Block setAttributes function.
 * @param {string}   [props.name]           Block name. Default: the block being edited.
 * @param {string}   [props.attribute]      The attribute holding the setting. Default 'separators'.
 * @param {boolean}  [props.bare]           Render the control with no panel of its own.
 * @param {string}   [props.label]          Heading above the control (bare mode, or when the panel title does not say it).
 * @param {string}   [props.title]          Panel title. Default "Separators".
 * @param {string[]} [props.axes]           Narrow the declared axes to these.
 * @param {boolean}  [props.lined]          Show only for a grid, flex or stack layout.
 * @param {string}   [props.layout]         The resolved layout, when the block keeps it outside `attributes.layout`.
 * @param {boolean}  [props.initialOpen]    Whether the panel starts open. Default false.
 * @return {JSX.Element|null} The panel or control, or null when the block draws no lines here.
 */
export default function SeparatorsPanel( {
	attributes,
	setAttributes,
	name: givenName,
	attribute = 'separators',
	bare = false,
	label,
	title,
	axes,
	lined = false,
	layout,
	initialOpen = false,
} ) {
	const context = useBlockEditContext();
	const caps = separatorCaps( givenName || context?.name, attribute );
	if ( ! caps || ! caps.axes.length ) {
		return null;
	}
	if ( lined && ! LINED_LAYOUTS.includes( layout ?? attributes.layout ) ) {
		return null;
	}
	const offered = axes
		? caps.axes.filter( ( axis ) => axes.includes( axis ) )
		: caps.axes;
	if ( ! offered.length ) {
		return null;
	}

	const control = (
		<SgsSeparatorControl
			label={ label }
			value={ attributes[ attribute ] }
			onChange={ ( next ) => setAttributes( { [ attribute ]: next } ) }
			axes={ offered }
			edges={ caps.edges }
			hover={ caps.hover }
			sweep={ caps.sweep }
		/>
	);
	if ( bare ) {
		return control;
	}
	return (
		<PanelBody
			title={ title || __( 'Separators', 'sgs-blocks' ) }
			initialOpen={ initialOpen }
		>
			{ control }
		</PanelBody>
	);
}
