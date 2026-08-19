import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// Mirrors the shape of ~176 rows measured live 2026-08-19 (golden-controls.
// json controls.colour.states.measuredGap2026_08_19.singleState). This row
// carries a gradient path so ONLY the state-count check fires here, proving
// the two checks are independent.
export default function Edit( { attributes, setAttributes } ) {
	const { textColour, textColourGradient } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: 'Text colour',
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}
