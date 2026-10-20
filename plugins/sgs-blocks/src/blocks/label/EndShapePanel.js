/**
 * The label's Shape panel: a shape for each end, how deep the cut reaches, and the
 * border (the shared border panel). With an end shape the cut removes the border along it.
 *
 * The menu names are what a client sees; the stored values are shape-divider library
 * keys (includes/helpers-end-shape.php::sgs_end_shape_allowed).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { SgsBorderControl } from '../../components';

export const END_SHAPE_OPTIONS = [
	{ label: __( 'Straight', 'sgs-blocks' ), value: '' },
	{ label: __( 'V notch', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Point', 'sgs-blocks' ), value: 'triangle' },
	{ label: __( 'Slant', 'sgs-blocks' ), value: 'slant' },
	{ label: __( 'Round', 'sgs-blocks' ), value: 'curve' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave-smooth' },
	{ label: __( 'Zigzag', 'sgs-blocks' ), value: 'zigzag' },
];

const END_HELP = __(
	'Cuts this end of the label into a shape. Whatever is behind the label shows through the cut. Add padding on this side so the text clears it.',
	'sgs-blocks'
);

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setter.
 * @return {JSX.Element} The panel.
 */
export default function EndShapePanel( { attributes, setAttributes } ) {
	const {
		endShapeLeft,
		endShapeRight,
		endDepth,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;
	const labelContrastAgainst =
		backgroundColour && ! backgroundColourGradient ? backgroundColour : '';
	const shaped = !! endShapeLeft || !! endShapeRight;

	return (
		<PanelBody title={ __( 'Shape', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Left end', 'sgs-blocks' ) }
				help={ END_HELP }
				value={ endShapeLeft || '' }
				options={ END_SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { endShapeLeft: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Right end', 'sgs-blocks' ) }
				help={ END_HELP }
				value={ endShapeRight || '' }
				options={ END_SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { endShapeRight: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ shaped && (
				<RangeControl
					label={ __( 'End depth', 'sgs-blocks' ) }
					help={ __(
						"How far the cut reaches into the label, as a percentage of the label's height.",
						'sgs-blocks'
					) }
					value={ endDepth ?? 45 }
					min={ 10 }
					max={ 150 }
					onChange={ ( val ) => setAttributes( { endDepth: val ?? 45 } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<SgsBorderControl
				label={ __( 'Border', 'sgs-blocks' ) }
				widthValues={ borderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
				styleValue={ borderStyle }
				onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourValue={ borderColour }
				onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
				colourGradientValue={ borderColourGradient }
				onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
				colourLinked={ true }
				contrastAgainst={ labelContrastAgainst }
			/>
			<p className="components-base-control__help">
				{ __(
					'With an end shape, the cut removes the border along it.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
