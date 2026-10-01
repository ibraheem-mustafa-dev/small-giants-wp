/**
 * SgsSeparatorControl — the one control for the lines drawn between a list's items.
 *
 * Edits the `separators` object (see `src/utils/separators.js` for the shape). Both
 * directions are LINKED by default, like `SgsBoxControl`'s sides: one thickness,
 * colour and style drives "between rows" and "between columns", and the unlink
 * toggle splits them. Linked is editor-only state, derived on mount from whether
 * the two axes already match. A block whose items run one way offers just that
 * axis (`axes`), so there is nothing to link.
 *
 * Per axis: a per-device thickness and one colour swatch whose popover holds the
 * Normal / Hover tabs (Hover only when `hover` is on) and the line-style picker.
 * `edges` adds the choice of drawing the outer lines, `sweep` the hover sweep.
 * Render side: `includes/helpers-separators.php` and its CSS files.
 *
 * @package SGS\Blocks
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Flex, FlexItem, SelectControl } from '@wordpress/components';
import { link as linkIcon, linkOff as linkOffIcon } from '@wordpress/icons';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';
import SeparatorAxisRow from './SeparatorAxisRow';
import SweepAngleControl from './SweepAngleControl';
import { SEPARATOR_AXES, axesMatch, patchSeparatorAxis, separatorAxis } from '../utils/separators';

const AXIS_TITLE = {
	row: __( 'Between rows', 'sgs-blocks' ),
	column: __( 'Between columns', 'sgs-blocks' ),
};

const EDGE_OPTIONS = [
	{ label: __( 'Between items only', 'sgs-blocks' ), value: 'between' },
	{ label: __( 'Between items and at both ends', 'sgs-blocks' ), value: 'all' },
	{ label: __( 'Between items and after the last', 'sgs-blocks' ), value: 'end' },
];

/**
 * @param {Object}   props
 * @param {string}   [props.label]   Heading above the control.
 * @param {Object}   props.value     The stored `separators` object.
 * @param {Function} props.onChange  Receives the whole next object.
 * @param {string[]} [props.axes]    The axes this list offers. Default both.
 * @param {boolean}  [props.edges]   Offer the outer-lines choice.
 * @param {boolean}  [props.hover]   Offer a hover colour (and the treatment).
 * @param {boolean}  [props.sweep]   Offer the sweep treatment (needs `hover`).
 * @return {JSX.Element} The control.
 */
export default function SgsSeparatorControl( {
	label = __( 'Separators', 'sgs-blocks' ),
	value,
	onChange,
	axes = SEPARATOR_AXES,
	edges = false,
	hover = false,
	sweep = false,
} ) {
	const stored = value && typeof value === 'object' ? value : {};
	const both = axes.length > 1;
	const [ linked, setLinked ] = useState(
		() => both && axesMatch( separatorAxis( stored, axes[ 0 ] ), separatorAxis( stored, axes[ 1 ] ) )
	);

	const toggleLinked = () => {
		if ( ! linked ) {
			// Re-linking collapses to the first axis, as SgsBoxControl does.
			onChange( patchSeparatorAxis( stored, axes, axes[ 0 ], {}, true ) );
		}
		setLinked( ! linked );
	};
	const shown = linked && both ? [ axes[ 0 ] ] : axes;
	const treatment = stored.hoverTreatment || 'swap';
	const treatments = [
		{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
		{ value: 'swap', label: __( 'Swap', 'sgs-blocks' ) },
		...( sweep ? [ { value: 'sweep', label: __( 'Sweep', 'sgs-blocks' ) } ] : [] ),
	];
	const linkLabel = linked ? __( 'Unlink rows and columns', 'sgs-blocks' ) : __( 'Link rows and columns', 'sgs-blocks' );

	return (
		<div className="sgs-separator-control">
			<Flex align="center" justify="space-between">
				<FlexItem>
					<strong>{ label }</strong>
				</FlexItem>
				{ both && (
					<FlexItem>
						<Button
							icon={ linked ? linkIcon : linkOffIcon }
							label={ linkLabel }
							aria-label={ linkLabel }
							aria-pressed={ linked }
							isPressed={ linked }
							onClick={ toggleLinked }
						/>
					</FlexItem>
				) }
			</Flex>
			{ shown.map( ( axis ) => (
				<SeparatorAxisRow
					key={ axis }
					title={ linked && both ? __( 'Between rows and columns', 'sgs-blocks' ) : AXIS_TITLE[ axis ] }
					axis={ separatorAxis( stored, axis ) }
					hover={ hover }
					onPatch={ ( patch ) => onChange( patchSeparatorAxis( stored, axes, axis, patch, linked && both ) ) }
				/>
			) ) }
			{ edges && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Outer lines', 'sgs-blocks' ) }
					value={ stored.edges || 'between' }
					options={ EDGE_OPTIONS }
					onChange={ ( next ) => onChange( { ...stored, edges: next } ) }
				/>
			) }
			{ hover && (
				<ToggleGroupControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					isBlock
					label={ __( 'Line on hover', 'sgs-blocks' ) }
					value={ treatment }
					onChange={ ( next ) => onChange( { ...stored, hoverTreatment: next || 'swap' } ) }
				>
					{ treatments.map( ( option ) => (
						<ToggleGroupControlOption key={ option.value } value={ option.value } label={ option.label } />
					) ) }
				</ToggleGroupControl>
			) }
			{ hover && sweep && 'sweep' === treatment && (
				<SweepAngleControl
					angle={ stored.sweepAngle }
					fallback={ 1 === axes.length && 'row' === axes[ 0 ] ? 90 : 180 }
					onAngleChange={ ( next ) => onChange( { ...stored, sweepAngle: next } ) }
				/>
			) }
		</div>
	);
}
